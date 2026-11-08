// The interactive format (owner, Nov 8, 2026; docs/KINDS-INTERACTIVE-FORMAT.md): a worksheet, homework, quiz, test,
// reading quiz or study guide made as ONE self-contained HTML page per version, which students answer on a device.
//
//   documents[].format  = "interactive"            (missing or "printable": the usual PDF and Word copies)
//   documents[].grading = "auto" | "print"
//
// auto:  Finish scores every objective item (mc, tf, numeric, match) in the page. Each accepted form is stored as
//        SHA-256("PPA1|<salt>|<question id>|<form>") (the apps' scheme, scripts/render/apps.mjs), and the `why` is locked
//        with the right form, so no key is readable in the file. Short and written answers go to the teacher.
// print: the file holds no keys and no hashes at all; Finish shows an answer sheet to print or save as a PDF, graded
//        later with the teacher copy.
// The teacher always gets the teacher copy (key) as a PDF (and Word in the final); there is no student PDF or Word.
// Preview: the HTML with a visible PREVIEW watermark, hashed into approval.json like the PDFs. Final: no watermark.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { esc, vv, cleanSvg, kindOf, questionsOf, tfValue, passagePlan, passageByline, fontStack, letter } from './util.mjs';
import { mathHtml, katexCss, plainMath } from './math.mjs';
import { saltOf, hashOf, lock } from './apps.mjs';
import { rubricTableHtml, PREVIEW_MARK } from './html.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');

export const FORMAT_KINDS = ['worksheet', 'homework', 'quiz', 'test', 'readingquiz', 'studyguide'];
export const FORMAT_TYPES = ['mc', 'tf', 'numeric', 'short', 'open', 'match'];
export const OBJECTIVE_TYPES = ['mc', 'tf', 'numeric', 'match'];
export const GRADINGS = ['auto', 'print'];
export const isInteractiveFormat = (doc) => !!doc && doc.format === 'interactive';
export const versionsOfDoc = (doc) => (Array.isArray(doc.versions) && doc.versions.length ? doc.versions : [null]);
export const pageFile = (base, ver) => `${base}-interactive${ver ? `-${ver}` : ''}.html`;
export const storageKey = (pack, file) => `pp-int:${pack.id || 'pack'}:${file.replace(/\.html$/, '')}:v1`;
export const CSP = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'";
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// Number words and unit marks are read in math and science only (as the apps do); a document may set app.* to change it.
function readerSettings(pack, doc) {
  const numeric = ['math', 'science'].includes(pack.order?.subject);
  const a = doc.app || {};
  return { numberWords: a.numberWords ?? numeric, unitMarks: a.unitMarks ?? numeric };
}

/* The page's own answer reader, run in Node, so the build stores exactly what the page will compute. */
export function loadForms(settings = {}) {
  const ctx = { window: { PPA_DATA: settings }, TextEncoder, TextDecoder, atob, btoa, console, Uint8Array, Uint32Array, Promise, JSON, Math, String, Number, Date, Array, Object, RegExp };
  vm.createContext(ctx);
  vm.runInContext(read('apps/engine.js'), ctx);
  vm.runInContext(read('interactive-format/forms.js'), ctx);
  return { P: ctx.window.PPA, F: ctx.window.PPI_FORMS };
}

// What a document must hold to be made interactive. Problems are strings; none means it can be rendered.
export function formatProblems(pack, doc) {
  const out = [], name = doc.title || kindOf(doc);
  if (doc.format == null || doc.format === 'printable') {
    if (doc.grading != null) out.push(`${name}: "grading" is only for format "interactive"`);
    return out;
  }
  if (doc.format !== 'interactive') return [`${name}: format must be "interactive" or "printable" (got ${JSON.stringify(doc.format)})`];
  if (!GRADINGS.includes(doc.grading)) out.push(`${name}: an interactive document needs grading "auto" or "print" (got ${JSON.stringify(doc.grading)})`);
  if (!FORMAT_KINDS.includes(kindOf(doc))) out.push(`${name}: a ${kindOf(doc)} can't be interactive (only ${FORMAT_KINDS.join(', ')})`);
  if (!questionsOf(doc).length) out.push(`${name}: an interactive document needs questions`);
  const seen = new Set();
  for (const { q } of questionsOf(doc)) {
    const where = `${name} ${q.id || '(no id)'}`;
    if (!q.id) out.push(`${where}: every question needs an id (it keys the saved answers)`);
    if (seen.has(q.id)) out.push(`${where}: id used twice`);
    seen.add(q.id);
    if (!FORMAT_TYPES.includes(q.type || 'short')) out.push(`${where}: type ${q.type} can't be interactive (use ${FORMAT_TYPES.join(', ')})`);
    if (q.tol != null && !(q.tol && q.tol.within > 0 && Number.isInteger(q.tol.places) && q.tol.places >= 0)) out.push(`${where}: tol must be {"within": a number above 0, "places": 0 or more}`);
  }
  return out;
}

/* One question, for one version: what the page shows, and (auto only) the hashes it checks against. */
function pageItem(pack, doc, q, n, ver, salt, R, problems, auto) {
  const type = q.type || 'short';
  const id = String(q.id);
  const where = `${doc.title} ${ver ? ver + ' ' : ''}${id}`;
  const it = { t: 'q', id, n, type, prompt: mathHtml(vv(q.prompt, ver) ?? '') };
  const fig = cleanSvg(vv(q.figure, ver)); if (fig) it.figure = fig;
  const unit = vv(q.unit, ver); if (unit && type !== 'open') { it.unit = mathHtml(unit); it.unitText = plainMath(unit); }
  if (type === 'mc') it.choices = (vv(q.choices, ver) || []).map((c) => mathHtml(c));
  if (type === 'match') {
    const ch = vv(q.choices, ver) || [];
    it.left = (vv(q.left, ver) || []).map((l) => mathHtml(l));
    it.choices = ch.map((c) => mathHtml(c));
    it.choicesText = ch.map((c) => plainMath(c));
  }
  if (q.points != null) it.points = Number(q.points) || 1;
  if (!auto || !OBJECTIVE_TYPES.includes(type)) return it;
  if (q.hint) it.hint = mathHtml(vv(q.hint, ver));
  const why = String(vv(q.why, ver) ?? '');
  const ans = vv(q.answer, ver);
  let canons = [];
  if (type === 'mc') {
    const i = Number(ans), n2 = it.choices.length;
    if (!Number.isInteger(i) || i < 0 || i >= n2) problems.push(`${where}: the answer ${JSON.stringify(ans)} is not one of the ${n2} choices`);
    canons = [`opt:${i}`];
  } else if (type === 'tf') canons = [`tf:${tfValue(ans) ? 'true' : 'false'}`];
  else if (type === 'numeric') {
    const forms = [ans, ...(vv(q.accept, ver) || [])].filter((a) => a != null && String(a).trim() !== '');
    for (const f of forms) {
      const cs = [...R.F.keyForms(f, 'numeric', { round: q.round, tol: q.tol })];
      if (!cs.length) problems.push(`${where}: the accepted form “${f}” doesn't read as a number`);
      for (const c of cs) if (!canons.includes(c)) canons.push(c);
    }
    if (canons.length > 401) problems.push(`${where}: ${canons.length} accepted values (tol is too wide for this many places; 401 at most)`);
  } else if (type === 'match') {
    const a = Array.isArray(ans) ? ans.map(Number) : [];
    if (a.length !== it.left.length || a.some((c) => !Number.isInteger(c) || c < 0 || c >= it.choices.length)) problems.push(`${where}: a matching answer needs one choice index per item`);
    it.pairs = a.map((c, i) => [hashOf(salt, `${id}.${i}`, `opt:${c}`)]);
    it.x = lock(salt, id, `match:${a.join(',')}`, { why });
    return it;
  }
  if (!canons.length) problems.push(`${where}: no accepted answer to check against`);
  it.acc = canons.map((c) => ({ h: hashOf(salt, id, c), x: lock(salt, id, c, { why }) }));
  it.miss = {};
  for (const m of q.miss || []) {
    const cs = type === 'mc' ? [`opt:${Number(m.answer)}`] : type === 'tf' ? [`tf:${tfValue(m.answer)}`] : [...R.F.keyForms(m.answer, type, {})];
    for (const c of cs) {
      if (canons.includes(c)) { problems.push(`${where}: the wrong answer “${m.answer}” is also a right answer`); continue; }
      it.miss[hashOf(salt, id, c)] = String(m.why || 'Look again.');
    }
  }
  return it;
}

/* Everything one page holds. ctx: {brand, subjectLabel, preview, build}. */
export function pageData(pack, doc, ver, base, ctx = {}) {
  const problems = formatProblems(pack, doc);
  const auto = doc.grading === 'auto';
  const file = pageFile(base, ver);
  const salt = auto ? saltOf(pack, file) : null;
  const reader = readerSettings(pack, doc);
  const R = loadForms({ salt: salt || 'x', ...reader });
  const o = pack.order || {};
  const brand = ctx.brand || {};
  const data = {
    title: String(doc.title || ''), ver: ver || null, grading: auto ? 'auto' : 'print', preview: !!ctx.preview,
    sub: [o.grade && `Grade ${o.grade}`, ctx.subjectLabel || o.subject, o.topic].filter(Boolean).join(' · '),
    directions: doc.directions ? mathHtml(vv(doc.directions, ver)) : '',
    key: storageKey(pack, file),
    notice: `${brand.shortName || brand.name || ''} · Made with AI · check before use`.replace(/^ · /, ''),
    build: `Build ${(ctx.build || '').slice(0, 8)} · ${pack.id || ''}${ver ? ` · version ${ver}` : ''}`,
    blocks: [],
  };
  const plan = passagePlan(doc, ver);
  const passage = (p) => ({ t: 'passage', title: String(p.title || 'Passage'), byline: passageByline(p), paras: (vv(p.paragraphs, ver) || []).map((x) => mathHtml(x)) });
  plan.top.forEach((p) => data.blocks.push(passage(p)));
  let n = 0;
  (doc.sections || []).forEach((sec, si) => {
    (plan.before.get(si) || []).forEach((p) => data.blocks.push(passage(p)));
    if (sec.heading || sec.directions) data.blocks.push({ t: 'section', heading: String(sec.heading || ''), directions: sec.directions ? mathHtml(vv(sec.directions, ver)) : '' });
    for (const q of sec.questions || []) {
      (plan.beforeQ.get(q) || []).forEach((p) => data.blocks.push(passage(p)));
      n++;
      if (!FORMAT_TYPES.includes(q.type || 'short')) continue;
      data.blocks.push(pageItem(pack, doc, q, n, ver, salt, R, problems, auto));
    }
  });
  if (doc.rubric) data.rubric = rubricTableHtml(doc.rubric);
  const engine = { salt: salt || undefined, key: data.key, ...reader };
  return { data, engine, problems, auto };
}

const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));

/* The student page: one file, everything inline, no network. */
export function pageHtml(pack, doc, ver, base, ctx = {}) {
  const { data, engine, problems, auto } = pageData(pack, doc, ver, base, ctx);
  const body = JSON.stringify(data);
  const math = body.includes('class=\\"katex') ? `<style>${katexCss()}</style>` : '';
  const font = `:root{--font:${fontStack(pack.style?.font)}}`;
  const html = `<!doctype html>
<html lang="${esc(doc.lang || pack.lang || 'en')}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<meta name="pp-format" content="interactive; grading=${auto ? 'auto' : 'print'}">
<title>${esc(data.title)}${ver ? ` (version ${esc(ver)})` : ''}</title>
<style>${font}${read('interactive-format/page.css')}</style>${math}
</head><body>${ctx.preview ? `<div class="pv-mark" aria-hidden="true">${esc(PREVIEW_MARK)}</div>` : ''}<a class="skip" href="#main">Skip to the questions</a>
<main class="wrap" id="app"><noscript>This page needs JavaScript turned on. Ask your teacher for a paper copy.</noscript></main>
<script>window.PPA_DATA=${jsonForScript(engine)};window.PPI_DATA=${jsonForScript(data)};</script>
<script>${read('apps/engine.js')}</script>
${auto ? `<script>${read('interactive-format/forms.js')}</script>\n` : ''}<script>${read('interactive-format/page.js')}</script>
</body></html>
`;
  return { html, data, problems, auto };
}

/* For the teacher copy and README: what the page does, and what the hashes can and can't do. */
export function teacherNoteLines(doc) {
  const auto = doc.grading === 'auto';
  return [
    `Students answer this on a device: one HTML file per version (${versionsOfDoc(doc).map((v) => '…-interactive' + (v ? '-' + v : '') + '.html').join(', ')}). It works offline in any browser, needs no accounts and sends nothing anywhere; answers are saved only in that browser, so a student can close it and come back.`,
    auto
      ? 'Graded automatically: when the student presses Finish, the page scores multiple choice, true/false, number and matching questions, shows which were right, and shows the explanation for each right answer. Short and written answers are listed as "needs your teacher" and are never scored by the page. The student can print the results.'
      : 'Printed for grading later: the page holds no answers at all. When the student presses Finish it shows an answer sheet (name, date, every question with the student\'s answer, room for points and notes) to print or save as a PDF. Grade it with this teacher copy.',
    ...(auto ? ['How the answers are protected: the file stores each right answer only as a salted SHA-256 code, never as text, and the explanations are locked with the right answer. This stops casual peeking (view source, the browser\'s tools). It is not test security: a student who knows programming can try every choice of a multiple-choice question against its code, and short number answers can be guessed the same way. Use it for practice and low-stakes checks; for a graded test, choose "print the results" or paper.'] : []),
    'On a shared device, "Start over for a new student" clears the saved answers (two taps).',
  ];
}

export function teacherNoteHtml(doc) {
  return `<div class="keep" style="border:1.5pt solid #000;border-radius:3pt;padding:6pt 9pt;margin:10pt 0">
  <b>About the interactive page (${doc.grading === 'auto' ? 'graded automatically' : 'results printed for grading later'})</b>
  ${teacherNoteLines(doc).map((l) => `<p style="margin:4pt 0;font-size:10pt">${esc(l)}</p>`).join('')}</div>`;
}

/* The renderer's hook: the HTML pages of one interactive document (the teacher copies are made by render-pack.mjs).
   io.html(file, html, what, title) writes a page in the preview and the final alike. */
export async function renderInteractivePages(doc, base, ctx, io) {
  const files = [];
  for (const ver of versionsOfDoc(doc)) {
    const file = pageFile(base, ver);
    const { html, problems } = pageHtml(ctx.pack, doc, ver, base, { brand: ctx.brand, subjectLabel: ctx.subjectLabel, preview: ctx.preview, build: ctx.packHash });
    if (problems.length) throw new Error(`${doc.title}: ${problems.join('; ')}`);
    const how = doc.grading === 'auto' ? 'graded automatically when the student finishes' : 'prints an answer sheet to grade later';
    await io.html(file, html, `${doc.title}: interactive page for students${ver ? `, version ${ver}` : ''} (one offline file; ${how})`, doc.title);
    files.push(file);
  }
  return files;
}

export const howToShareText = (brand, files) => [
  'HOW TO SHARE THE INTERACTIVE PAGES',
  '',
  'Each page is one HTML file. It works offline in any browser (phone, tablet, Chromebook, computer), needs no accounts',
  'and sends nothing anywhere. Answers are saved only in the browser on the student\'s own device.',
  '',
  ...files.map((f) => `  ${f}`),
  '',
  'Ways to share one: email it or post it as a file (students download it and open it in a browser); Google Drive or',
  'Classroom (students download it, since Drive\'s own preview shows the code); or any static web host. You can also',
  'paste the file\'s contents into a Claude artifact.',
  '',
  'Pages "graded automatically" keep each right answer only as a scrambled code (a hash). That stops casual peeking, not',
  'a student with programming tools, who could try every choice of a multiple-choice question: use them for practice and',
  'low-stakes checks. Pages that "print the results" hold no answers at all: grade the printed sheet with the teacher copy.',
  '',
  brand.aiNotice || '',
].join('\n') + '\n';

export { sha as sha256Hex, letter };
