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
import { classCodesOf, modeOf, poolSalt } from './render/interactive-format.mjs';
import { checkBrowser as _cb, poolIndexOf, dataOf } from '../checks/interactive-format.mjs';
import { keyVersions } from './render/keys.mjs';
import { copyHtml } from './render/html.mjs';
import { questionsOf, keyText, hasPool, poolDocs, partsOf, flatVersion, layoutOf } from './render/util.mjs';
import { plainMath } from './render/math.mjs';
import { STATEMENT } from './render/review.mjs';
import { PREVIEW_MARK } from './render/html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--shots');
const SHOTS = si > 0 ? path.resolve(process.argv[si + 1]) : null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-interactive-test-'));
let passed = 0;
const ok = (m) => { passed++; console.log(`✓ ${m}`); };
const render = (dir, mode) => spawnSync(process.execPath, [path.join(ROOT, 'scripts/render-pack.mjs'), dir, mode], { encoding: 'utf8', timeout: 300000 });

// The teacher key page: type a version (a letter, a code, or a student's name for a pool) and its key shows.
async function keyPage(file, doc, pack, base) {
  const { chromium } = (await import('node:module')).createRequire(import.meta.url)('playwright');
  const exe = process.env.PP_CHROMIUM || '/opt/pw-browsers/chromium';
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox'] });
  try {
    const page = await (await b.newContext({ viewport: { width: 375, height: 800 } })).newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message)));
    await page.goto('file://' + file);
    const vs = keyVersions(doc);
    for (const v of [vs[0], vs[vs.length - 1]]) {
      await page.fill('#who', v.code.toLowerCase()); await page.click('#go');
      assert.equal(await page.getAttribute('#out', 'data-code'), v.code, `the key page shows version ${v.code} for its code`);
      const q = questionsOf(v.doc).find(({ q }) => ['numeric', 'mc'].includes(q.type))?.q;
      if (q) assert.ok((await page.textContent('#out')).includes(plainMath(keyText(q, v.ver)).replace(/^[A-F]\. /, '').slice(0, 20)), `version ${v.code}'s key for ${q.id} is on the key page`);
    }
    if (hasPool(doc)) {
      const name = 'Dana Fox (made-up)', want = doc.pool.codes[poolIndexOf(poolSalt(pack, doc, base), name, doc.pool.codes.length)];
      await page.fill('#who', name); await page.click('#go');
      assert.equal(await page.getAttribute('#out', 'data-code'), want, 'a student\'s name on the key page gives the version her page gives');
    }
    const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(sw <= w + 1, `the key page scrolls sideways at 375 px (${sw})`);
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
}

// The five features on the made-up stats sample: data set once in print, parts with their own boxes and checklists,
// and the one-per-student page holding no key of any version.
async function statsChecks(dir, out, pack, doc, base) {
  const student = fs.readFileSync(path.join(out, `${base}-interactive.html`), 'utf8');
  const noTags = student.replace(/\\u003c[^>]*>/g, ' ').replace(/<[^>]*>/g, ' ');
  // what students see anyway (every version's questions and data, tags removed): a number key that happens to be printed
  // there (a percent in another version's data table) gives nothing away; explanations and checklists never may be
  const seen = JSON.stringify(dataOf(student).data.pool.versions).replace(/\\u003c[^>]*>/g, ' ').replace(/<[^>]*>/g, ' ');
  let looked = 0;
  for (const { code, doc: d } of poolDocs(doc)) for (const { q } of questionsOf(d)) {
    for (const t of [q.why, ...partsOf(q).flatMap((p) => [p.answer, ...p.checklist])].filter((x) => x && String(x).length >= 4)) {
      looked++;
      assert.ok(!noTags.includes(String(t)), `${code} ${q.id}: the key text "${String(t).slice(0, 40)}" is in the student page`);
    }
    if (q.type === 'numeric' && String(q.answer).length >= 3) { looked++; assert.ok(!noTags.includes(String(q.answer)) || seen.includes(String(q.answer)), `${code} ${q.id}: the key ${q.answer} is in the student page`); }
  }
  for (const f of ['"answer"', '"why"', '"accept"', '"checklist"', '"math"']) assert.ok(!student.includes(f), `the student page holds ${f}`);
  ok(`stats: the one-per-student page holds 30 versions and none of their ${looked} key texts (answers, whys, part answers, checklists)`);
  // print (PDF and Word, student and teacher copies): the data set once, before its group; the parts with work lines and checklists
  const flat = { ...flatVersion(doc, 'A'), format: 'printable', grading: undefined };
  const ctx = { pack, brand: JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8')), style: pack.style || {}, layout: layoutOf(pack.style || {}), subjectLabel: 'Math' };
  for (const teacher of [false, true]) {
    const h = copyHtml(flat, null, ctx, teacher);
    assert.equal(h.split('A school asked').length - 1, 1, `the data set prints once in the ${teacher ? 'teacher' : 'student'} copy`);
    assert.equal(h.split('Use this for questions 1–3.').length - 1, 1, 'the group line prints once');
    assert.ok(h.indexOf('A school asked') < h.indexOf('What percent of the grade 9'), 'the data set prints before its first question');
    assert.equal((h.match(/class="part"/g) || []).length, 2, 'both parts print');
    if (teacher) assert.ok(h.includes('Full credit for (a):') && h.includes('Full credit for (b):'), 'the teacher copy has a full-credit checklist per part');
    else assert.ok(!/Full credit for|A strong answer/.test(h) && (h.match(/class="part"><p>.*?<div class="work">(<div class="wl"><\/div>)+/g) || []).length === 2, 'the student copy gives each part its own work lines and no key');
  }
  const pdfText = spawnSync('pdftotext', [path.join(out, `${base}-teacher.pdf`), '-'], { encoding: 'utf8' });
  if (!pdfText.error) assert.equal(pdfText.stdout.split('Use this for questions 1–3').length - 1, 1, 'the teacher PDF prints the data set once');
  const docx = spawnSync('unzip', ['-p', path.join(out, `${base}-teacher.docx`), 'word/document.xml'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (!docx.error) { assert.equal(docx.stdout.split('Use this for questions 1–3').length - 1, 1, 'the Word teacher copy prints the data set once'); assert.ok(/descr="[^"]*segmented bar graph/.test(docx.stdout), 'the Word graph has alt text'); }
  // the interactive page: the data set with each of its questions, a box per part, the graphs' data tables
  const { data } = dataOf(student);
  const v0 = data.pool.versions[0], q3 = v0.blocks.find((x) => x.id === 'q3');
  assert.equal(q3.sub.length, 2, 'the page has a box per part');
  assert.ok(v0.blocks.filter((x) => x.stim === 's1').length === 3 && v0.stimuli.s1.table.includes('<table'), 'the data set goes with each of its 3 questions');
  assert.ok(/<title>/.test(v0.stimuli.s1.figure) && /<desc>/.test(v0.stimuli.s1.figure) && /Data table/.test(v0.stimuli.s2.figure), 'graphs have a title, a description and a data table');
  ok('stats: the data set prints once (student and teacher copies, PDF and Word), parts have their own work lines and checklists, the page shows the data with each question and a box per part, graphs are accessible');
}

try {
  for (const g of ['auto', 'print', 'notes', 'reviewgame', 'stats']) {
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
    assert.ok(!fs.readdirSync(prev).some((f) => /-teacher-key\.html$/.test(f)), 'the teacher key page is never in the preview (final files only)');
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

    // every version's key (owner, Nov 8, 2026): a document with 2+ versions or one per student gets the all-versions key
    // (preview and final) and the teacher key page (final only), never listed with the students' pages
    if ((doc0.versions || []).length > 1 || doc0.pool) {
      assert.ok(fs.existsSync(path.join(prev, `${base}-all-versions-key.pdf`)) && fs.existsSync(path.join(out, `${base}-all-versions-key.pdf`)), 'the all-versions key is in the preview and the final');
      assert.ok(fs.existsSync(path.join(out, `${base}-teacher-key.html`)), 'the teacher key page is in the final');
      assert.ok(!fs.readFileSync(path.join(out, 'HOW-TO-SHARE-THE-INTERACTIVE-PAGES.txt'), 'utf8').includes('teacher-key'), 'the share notes never list the teacher key page');
      await keyPage(path.join(out, `${base}-teacher-key.html`), doc0, pack, base);
      ok(`${g}: every version's key: the all-versions key PDF and the teacher key page (a version gives its own key)`);
    }
    if (g === 'stats') await statsChecks(dir, out, pack, doc0, base);

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
