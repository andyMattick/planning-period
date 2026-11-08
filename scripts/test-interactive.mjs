#!/usr/bin/env node
// The interactive format end to end (docs/KINDS-INTERACTIVE-FORMAT.md), on samples/_cap-interactive: the quiz (auto and
// print), guided notes and a review game (each also built in the other grading mode for the browser):
//   1. render the preview: the pages carry the PREVIEW mark, REVIEW.html lists them with their SHA-256 next to the PDFs
//   2. checks/interactive-format.mjs on the pack and the rendered pages, then the browser: every item right → 100%,
//      every item wrong → 0% (auto), the answer sheet with every answer and no score (print), no page errors, no outside
//      requests, no sideways scroll at 375 px, works with storage blocked; notes: check, fix and check again, the
//      completed and the printed notes; the review game: played alone, and as a class with the class code
//   3. sign-off: an approval made from REVIEW.html's own data → render --final makes the pages without the mark and
//      HOW-TO-SHARE-THE-INTERACTIVE-PAGES.txt; a changed preview page is refused
//   node scripts/test-interactive.mjs [--shots <folder>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkPack, checkBrowser, buildPages } from '../checks/interactive-format.mjs';
import { classCodesOf, modeOf } from './render/interactive-format.mjs';
import { STATEMENT } from './render/review.mjs';
import { PREVIEW_MARK } from './render/html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--shots');
const SHOTS = si > 0 ? path.resolve(process.argv[si + 1]) : null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-interactive-test-'));
let passed = 0;
const ok = (m) => { passed++; console.log(`✓ ${m}`); };
const render = (dir, mode) => spawnSync(process.execPath, [path.join(ROOT, 'scripts/render-pack.mjs'), dir, mode], { encoding: 'utf8', timeout: 300000 });

try {
  for (const g of ['auto', 'print', 'notes', 'reviewgame']) {
    const dir = path.join(TMP, g);
    fs.mkdirSync(dir);
    fs.copyFileSync(path.join(ROOT, `samples/_cap-interactive/${g}/pack.json`), path.join(dir, 'pack.json'));
    const pack = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json'), 'utf8'));
    const built = buildPages(pack), doc0 = pack.documents[0], base = built[0].base, mode = modeOf(doc0);
    const firstTeacher = `${base}-teacher${built[0].ver ? '-' + built[0].ver : ''}`;

    // 1. preview
    let r = render(dir, '--preview');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const prev = path.join(dir, 'out-preview');
    const pages = fs.readdirSync(prev).filter((f) => /-interactive(-[AB])?\.html$/.test(f)).sort();
    assert.deepEqual(pages, built.map((p) => p.file).sort());
    if (g === 'auto' || g === 'print') assert.deepEqual(pages, ['chemical-reactions-quiz-interactive-A.html', 'chemical-reactions-quiz-interactive-B.html']);
    assert.ok(!fs.readdirSync(prev).some((f) => /-student|\.pptx$|-cards\.pdf$/.test(f)), 'no student PDF or Word (and for a review game no slides or cards) for an interactive document');
    assert.ok(fs.existsSync(path.join(prev, `${firstTeacher}.pdf`)), 'the teacher copy is there');
    for (const f of pages) assert.ok(fs.readFileSync(path.join(prev, f), 'utf8').includes(`class="pv-mark" aria-hidden="true">${PREVIEW_MARK}`), `${f} has the preview mark`);
    const D = JSON.parse(fs.readFileSync(path.join(prev, 'REVIEW.html'), 'utf8').match(/var D = (\{.*\});/)[1]);
    for (const f of pages) assert.ok(D.documents.some((d) => d.file === f && /^[0-9a-f]{64}$/.test(d.sha256)), `REVIEW.html lists ${f} with its SHA-256`);
    ok(`${g}: the preview has the ${pages.length} page(s) (watermarked), the teacher copies and no student PDF; REVIEW.html lists the pages with their SHA-256`);

    // 2. checks and browser
    const res = await checkPack(pack, dir);
    assert.deepEqual(res.errors, [], res.errors.join('\n'));
    assert.equal(res.rendered, pages.length);
    ok(`${g}: checks/interactive-format.mjs passes on the pack and on the rendered preview pages`);
    // notes and the review game: the browser runs both grading modes (the quiz has its own auto and print folders)
    const both = mode !== 'doc' ? await checkPack(pack, null, { both: true }) : res;
    assert.deepEqual(both.errors, [], both.errors.join('\n'));
    const br = await checkBrowser(both.pages, pack, { shotsDir: SHOTS });
    if (br.skipped) console.log(`⏭️  ${br.skipped}`);
    else { assert.deepEqual(br.errors, [], br.errors.join('\n')); ok(`${g}: browser: ${br.notes.join('; ')}`); }

    // 3. sign-off and the final
    const approval = { orderId: D.orderId, name: 'Mr. Okafor (made-up)', date: new Date().toISOString(), statement: STATEMENT, packHash: D.packHash, documents: D.documents };
    assert.equal(approval.statement, D.statement);
    fs.writeFileSync(path.join(dir, 'approval.json'), JSON.stringify(approval));
    r = render(dir, '--final');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const out = path.join(dir, 'out');
    for (const f of pages) {
      const h = fs.readFileSync(path.join(out, f), 'utf8');
      assert.ok(!h.includes(PREVIEW_MARK), `${f} in the final has no preview mark`);
    }
    for (const f of ['HOW-TO-SHARE-THE-INTERACTIVE-PAGES.txt', `${firstTeacher}.docx`, 'README.txt']) assert.ok(fs.existsSync(path.join(out, f)), f);
    const readme = fs.readFileSync(path.join(out, 'README.txt'), 'utf8');
    assert.ok(readme.includes(`INTERACTIVE: ${doc0.title}`), 'the README explains the interactive page');
    // an auto-graded review game: the class code is on the teacher copy and in the README, never in the page
    for (const { code } of classCodesOf(pack, doc0, base)) {
      assert.ok(readme.includes(code), 'the README names the class code');
      const pdfText = spawnSync('pdftotext', [path.join(out, `${firstTeacher}.pdf`), '-'], { encoding: 'utf8' });   // skipped where pdftotext isn't installed
      if (!pdfText.error) assert.ok(pdfText.stdout.includes(code), 'the teacher copy names the class code');
      for (const f of pages) assert.ok(!fs.readFileSync(path.join(out, f), 'utf8').includes(code), `${f} does not hold the class code`);
    }
    const fin = await checkPack(pack, dir);
    assert.deepEqual(fin.errors, [], fin.errors.join('\n'));
    ok(`${g}: the approval covers the pages; --final makes them without the mark, plus the share notes and the Word teacher copies`);

    const pf = path.join(prev, pages[0]), keep = fs.readFileSync(pf);
    fs.writeFileSync(pf, Buffer.concat([keep, Buffer.from('<!-- changed -->')]));
    r = render(dir, '--final');
    assert.equal(r.status, 1, 'a changed preview page is refused');
    assert.match(r.stderr, new RegExp(`${pages[0]} changed after`));
    fs.writeFileSync(pf, keep);
    ok(`${g}: render --final refuses when a preview page changed after the teacher saw it`);
  }
  // every question type (mc, tf, numeric, short, open, match): the renderer's fixture made interactive, both modes
  {
    const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'samples/_fixture/pack.json'), 'utf8'));
    fx.documents.forEach((d) => { d.format = 'interactive'; d.grading = 'auto'; });
    const res = await checkPack(fx, null, { both: true });
    assert.deepEqual(res.errors, [], res.errors.join('\n'));
    const br = await checkBrowser(res.pages, fx, { shotsDir: SHOTS && path.join(SHOTS, 'every-type') });
    if (br.skipped) console.log(`⏭️  ${br.skipped}`);
    else { assert.deepEqual(br.errors, [], br.errors.join('\n')); ok(`every question type (samples/_fixture made interactive): ${br.notes.join('; ')}`); }
  }
  console.log(`\nAll ${passed} interactive-format tests pass.${SHOTS ? ` Screenshots: ${SHOTS}` : ''}`);
} catch (e) {
  console.error('\n✗ ' + (e.stack || e));
  process.exitCode = 1;
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
