#!/usr/bin/env node
// The interactive format end to end (docs/KINDS-INTERACTIVE-FORMAT.md), on samples/_cap-interactive (auto and print):
//   1. render the preview: the pages carry the PREVIEW mark, REVIEW.html lists them with their SHA-256 next to the PDFs
//   2. checks/interactive-format.mjs on the pack and the rendered pages, then the browser: every item right → 100%,
//      every item wrong → 0% (auto), the answer sheet with every answer and no score (print), no page errors, no outside
//      requests, no sideways scroll at 375 px, works with storage blocked
//   3. sign-off: an approval made from REVIEW.html's own data → render --final makes the pages without the mark and
//      HOW-TO-SHARE-THE-INTERACTIVE-PAGES.txt; a changed preview page is refused
//   node scripts/test-interactive.mjs [--shots <folder>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkPack, checkBrowser } from '../checks/interactive-format.mjs';
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
  for (const g of ['auto', 'print']) {
    const dir = path.join(TMP, g);
    fs.mkdirSync(dir);
    fs.copyFileSync(path.join(ROOT, `samples/_cap-interactive/${g}/pack.json`), path.join(dir, 'pack.json'));
    const pack = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json'), 'utf8'));

    // 1. preview
    let r = render(dir, '--preview');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const prev = path.join(dir, 'out-preview');
    const pages = fs.readdirSync(prev).filter((f) => /-interactive-[AB]\.html$/.test(f)).sort();
    assert.deepEqual(pages, ['chemical-reactions-quiz-interactive-A.html', 'chemical-reactions-quiz-interactive-B.html']);
    assert.ok(!fs.readdirSync(prev).some((f) => /-student/.test(f)), 'no student PDF or Word for an interactive document');
    assert.ok(fs.existsSync(path.join(prev, 'chemical-reactions-quiz-teacher-A.pdf')), 'the teacher copy is there');
    for (const f of pages) assert.ok(fs.readFileSync(path.join(prev, f), 'utf8').includes(`class="pv-mark" aria-hidden="true">${PREVIEW_MARK}`), `${f} has the preview mark`);
    const D = JSON.parse(fs.readFileSync(path.join(prev, 'REVIEW.html'), 'utf8').match(/var D = (\{.*\});/)[1]);
    for (const f of pages) assert.ok(D.documents.some((d) => d.file === f && /^[0-9a-f]{64}$/.test(d.sha256)), `REVIEW.html lists ${f} with its SHA-256`);
    ok(`${g}: the preview has the two pages (watermarked), the teacher copies and no student PDF; REVIEW.html lists the pages with their SHA-256`);

    // 2. checks and browser
    const res = await checkPack(pack, dir);
    assert.deepEqual(res.errors, [], res.errors.join('\n'));
    assert.equal(res.rendered, 2);
    ok(`${g}: checks/interactive-format.mjs passes on the pack and on the rendered preview pages`);
    const br = await checkBrowser(res.pages, pack, { shotsDir: SHOTS });
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
    for (const f of ['HOW-TO-SHARE-THE-INTERACTIVE-PAGES.txt', 'chemical-reactions-quiz-teacher-A.docx', 'README.txt']) assert.ok(fs.existsSync(path.join(out, f)), f);
    assert.match(fs.readFileSync(path.join(out, 'README.txt'), 'utf8'), /INTERACTIVE: Chemical Reactions Quiz/);
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
