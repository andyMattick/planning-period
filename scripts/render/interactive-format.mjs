// The interactive format (owner, Nov 8, 2026; docs/KINDS-INTERACTIVE-FORMAT.md): a worksheet, homework, quiz, test,
// reading quiz, study guide, guided notes or review game made as ONE self-contained HTML page per version, which
// students answer on a device. Guided notes (mode "notes") show the notes' text with a typed box for each blank and a
// "Check my notes"; a review game (mode "game") is played one card at a time, alone or as a class on a projector.
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
import { esc, vv, cleanSvg, kindOf, questionsOf, tfValue, passagePlan, passageByline, fontStack, letter, keyText, stimulusPlan, stimulusRef, groupLine, partsOf, hasPool, poolDocs } from './util.mjs';
import { graphTable } from './graph.mjs';
import { mathHtml, katexCss, plainMath } from './math.mjs';
import { saltOf, hashOf, lock } from './apps.mjs';
import { rubricTableHtml, PREVIEW_MARK, dataTableHtml } from './html.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');

export const FORMAT_KINDS = ['worksheet', 'homework', 'quiz', 'test', 'readingquiz', 'studyguide', 'notes', 'reviewgame'];
export const FORMAT_TYPES = ['mc', 'tf', 'numeric', 'short', 'open', 'match'];
export const OBJECTIVE_TYPES = ['mc', 'tf', 'numeric', 'match'];
export const GRADINGS = ['auto', 'print'];
export const isInteractiveFormat = (doc) => !!doc && doc.format === 'interactive';
// How the page plays: "notes" (guided notes: blanks in the text), "game" (a review game: one card at a time) or "doc".
export const modeOf = (doc) => ({ notes: 'notes', reviewgame: 'game' })[kindOf(doc)] || 'doc';
// A blank in guided notes: a run of 3 or more underscores in a short or number question's prompt.
export const BLANK_RE = /_{3,}/g;
export const blanksIn = (prompt) => (String(prompt ?? '').match(BLANK_RE) || []).length;
// Several blanks in one prompt: the key and each accepted form name them in order, separated by ; (or , / and).
export const splitBlanks = (s, k) => (k === 1 ? [String(s).trim()] : String(s).split(/\s*(?:;|,|\/|\band\b)\s*/i).map((x) => x.trim()).filter(Boolean));
// In guided notes and review games a short answer of a few words (every accepted form 4 words or fewer) is checked by
// the page, forgiving case, plurals and a leading a/an/the; a longer one goes to the teacher, as in the other kinds.
export const WORDS_MAX = 4;
export function wordChecked(q, ver, mode) {
  if (mode === 'doc' || (q.type || 'short') !== 'short') return false;
  const forms = [vv(q.answer, ver), ...(vv(q.accept, ver) || [])].filter((a) => a != null && String(a).trim() !== '');
  return forms.length > 0 && forms.every((f) => String(f).trim().split(/\s+/).length <= WORDS_MAX);
}
// Is this page item scored by the page (auto)? Multiple choice, true/false, numbers, matching, notes blanks, short words.
export const scoredHere = (it) => OBJECTIVE_TYPES.includes(it.type) || it.type === 'fill' || !!it.words;
// The class-mode code (review games graded in the page): printed only on the teacher copy; it unlocks "Reveal answer"
// on the projector. Made from the whole pack, so the page (which holds only its first 8 hex digits) can't rebuild it.
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function classCode(pack, file) {
  const h = crypto.createHash('sha256').update(`PPT1|${JSON.stringify(pack)}|${file}`, 'utf8').digest();
  return Array.from(h.subarray(0, 6), (b) => CODE_LETTERS[b % CODE_LETTERS.length]).join('');
}
// A document with one version per student (doc.pool) is one page holding every version (no keys), so it has no letter.
export const versionsOfDoc = (doc) => (hasPool(doc) ? [null] : Array.isArray(doc.versions) && doc.versions.length ? doc.versions : [null]);
// The salt the page and the teacher's key page use to turn a name into a version (not a secret: it only spreads names).
export const poolSalt = (pack, doc, base) => crypto.createHash('sha256').update(`PPS1|${pack.id || 'pack'}|${base}|${(doc.pool && doc.pool.seed) || ''}`, 'utf8').digest('hex').slice(0, 16);
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

/* A figure for the page: the cleaned SVG and, for a data plot (a segmented bar, a scatter plot), its data as a table for
   screen readers, folded under "Data table". */
export function figureBlock(raw) {
  const svg = cleanSvg(raw);
  if (!svg) return '';
  const t = graphTable(raw);
  return svg + (t ? `<details class="dtab"><summary>Data table${t.caption ? `: ${esc(t.caption)}` : ''}</summary>${dataTableHtml({ columns: t.head, rows: t.rows }, esc)}</details>` : '');
}

/* One question, for one version: what the page shows, and (auto only) the hashes it checks against. */
function pageItem(pack, doc, q, n, ver, salt, R, problems, { auto, mode, code }) {
  let type = q.type || 'short';
  const id = String(q.id);
  const where = `${doc.title} ${ver ? ver + ' ' : ''}${id}`;
  const raw = vv(q.prompt, ver) ?? '';
  const it = { t: 'q', id, n, type, prompt: mathHtml(raw) };
  // guided notes: a short or number question with blanks in its text is a line of the notes, one box per blank
  const k = mode === 'notes' && ['short', 'numeric'].includes(type) ? blanksIn(raw) : 0;
  if (k) { it.type = 'fill'; it.ftype = type; it.k = k; it.parts = String(raw).split(BLANK_RE).map((x) => mathHtml(x)); delete it.prompt; }
  if (wordChecked(q, ver, mode) && !k) it.words = true;
  const fig = figureBlock(vv(q.figure, ver)); if (fig) it.figure = fig;
  const sid = stimulusRef(q, ver); if (sid) it.stim = sid;
  // a multi-part long answer: a box per part (never scored here: it goes to the teacher)
  const sub = ['short', 'open'].includes(type) && mode === 'doc' ? partsOf(q, ver) : [];
  if (sub.length) { it.sub = sub.map((p) => ({ label: p.label, prompt: mathHtml(p.prompt), ...(p.points != null ? { points: p.points } : {}) })); if (q.points == null) it.points = sub.reduce((s2, p) => s2 + (p.points ?? 2), 0); }
  const unit = vv(q.unit, ver); if (unit && type !== 'open') { it.unit = mathHtml(unit); it.unitText = plainMath(unit); }
  if (type === 'mc') it.choices = (vv(q.choices, ver) || []).map((c) => mathHtml(c));
  if (type === 'match') {
    const ch = vv(q.choices, ver) || [];
    it.left = (vv(q.left, ver) || []).map((l) => mathHtml(l));
    it.choices = ch.map((c) => mathHtml(c));
    it.choicesText = ch.map((c) => plainMath(c));
  }
  if (q.points != null) it.points = Number(q.points) || 1;
  if (mode === 'game') it.pts = Number(q.points) || Number(q.level) || 1;   // a card is worth its points, else its level
  if (code) it.rv = lock(salt, id, `reveal:${code}`, { answer: plainMath(keyText(q, ver)), why: plainMath(String(vv(q.why, ver) ?? '')) });
  if (!auto || !scoredHere(it)) return it;
  if (q.hint) it.hint = mathHtml(vv(q.hint, ver));
  const why = String(vv(q.why, ver) ?? '');
  const ans = vv(q.answer, ver);
  let canons = [];
  if (type === 'mc') {
    const i = Number(ans), n2 = it.choices.length;
    if (!Number.isInteger(i) || i < 0 || i >= n2) problems.push(`${where}: the answer ${JSON.stringify(ans)} is not one of the ${n2} choices`);
    canons = [`opt:${i}`];
  } else if (type === 'tf') canons = [`tf:${tfValue(ans) ? 'true' : 'false'}`];
  else if (it.type === 'fill') {
    // each blank: its own hashes (to mark it ✓ or ✗); the whole line: hashes of every accepted combination, with the why
    const ft = type === 'numeric' ? 'numeric' : 'short', forms = [ans, ...(vv(q.accept, ver) || [])].filter((a) => a != null && String(a).trim() !== '');
    const per = Array.from({ length: k }, () => []);
    for (const f of forms) {
      const parts = splitBlanks(f, k);
      if (parts.length !== k) { problems.push(`${where}: the accepted form “${f}” doesn't name ${k} blanks in order (separate them with ;)`); continue; }
      let combos = [[]];
      parts.forEach((p, i) => {
        const cs = [...R.F.keyForms(p, ft, { round: q.round, tol: q.tol })];
        if (!cs.length) problems.push(`${where}: “${p}” (blank ${i + 1}) can't be read${ft === 'numeric' ? ' as a number' : ''}`);
        cs.forEach((c) => { if (!per[i].includes(c)) per[i].push(c); });
        combos = combos.flatMap((cmb) => cs.map((c) => [...cmb, c]));
      });
      for (const cmb of combos) { const t = 'fill:' + cmb.join('|'); if (!canons.includes(t)) canons.push(t); }
    }
    if (canons.length > 2000) problems.push(`${where}: ${canons.length} accepted combinations (2000 at most)`);
    it.blanks = per.map((cs, i) => cs.map((c) => hashOf(salt, `${id}.${i}`, c)));
  } else if (type === 'numeric' || it.words) {
    const forms = [ans, ...(vv(q.accept, ver) || [])].filter((a) => a != null && String(a).trim() !== '');
    for (const f of forms) {
      const cs = [...R.F.keyForms(f, type, { round: q.round, tol: q.tol })];
      if (!cs.length) problems.push(`${where}: the accepted form “${f}” doesn't read as ${type === 'numeric' ? 'a number' : 'words'}`);
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
    if (it.type === 'fill') continue;   // a notes blank has no wrong-answer messages (the word bank is the help)
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
  // one version per student: every pool version's questions, as a page graded on paper (no keys, no hashes)
  if (hasPool(doc)) {
    const problems = [];
    if (doc.grading !== 'print') problems.push(`${doc.title}: one version per student is made only as "print the results" (the page can't hold keys)`);
    const members = poolDocs(doc).map(({ code, doc: d }) => ({ code, r: pageData(pack, { ...d, grading: 'print' }, null, base, ctx) }));
    const first = members[0].r;
    members.forEach((m) => problems.push(...m.r.problems.map((x) => `${m.code}: ${x}`)));
    const data = { ...first.data, ver: null, blocks: [], stimuli: {}, build: `${first.data.build} · ${members.length} versions, one per student`,
      pool: { salt: poolSalt(pack, doc, base), codes: members.map((m) => m.code), versions: members.map((m) => ({ blocks: m.r.data.blocks, ...(m.r.data.stimuli ? { stimuli: m.r.data.stimuli } : {}) })) } };
    return { data, engine: first.engine, problems: [...new Set(problems)], auto: false };
  }
  const problems = formatProblems(pack, doc);
  const auto = doc.grading === 'auto';
  const file = pageFile(base, ver);
  const salt = auto ? saltOf(pack, file) : null;
  const reader = readerSettings(pack, doc);
  const R = loadForms({ salt: salt || 'x', ...reader });
  const o = pack.order || {};
  const brand = ctx.brand || {};
  const mode = modeOf(doc);
  const code = auto && mode === 'game' ? classCode(pack, file) : null;
  const data = {
    title: String(doc.title || ''), ver: ver || null, grading: auto ? 'auto' : 'print', preview: !!ctx.preview,
    sub: [o.grade && `Grade ${o.grade}`, ctx.subjectLabel || o.subject, o.topic].filter(Boolean).join(' · '),
    directions: doc.directions ? mathHtml(vv(doc.directions, ver)) : '',
    key: storageKey(pack, file),
    notice: `${brand.shortName || brand.name || ''} · Made with AI · check before use`.replace(/^ · /, ''),
    build: `Build ${(ctx.build || '').slice(0, 8)} · ${pack.id || ''}${ver ? ` · version ${ver}` : ''}`,
    blocks: [],
  };
  if (mode !== 'doc') data.mode = mode;
  if (code) data.tc = hashOf(salt, '_class', `code:${code}`);   // checks a typed class-mode code; the code itself is not here
  // shared data sets: held once in the data, shown with each question that cites one
  const splan = stimulusPlan(doc, ver);
  if (splan.groups.size) {
    data.stimuli = {};
    for (const [id, ns] of splan.groups) {
      const st = splan.byId.get(id);
      data.stimuli[id] = { title: st.title ? mathHtml(String(st.title)) : '', use: groupLine(ns), intro: st.intro ? mathHtml(String(st.intro)) : '',
        table: dataTableHtml(st.table, (x) => mathHtml(x)), figure: figureBlock(st.figure) };
    }
  }
  const plan = passagePlan(doc, ver);
  const passage = (p) => ({ t: 'passage', title: String(p.title || 'Passage'), byline: passageByline(p), paras: (vv(p.paragraphs, ver) || []).map((x) => mathHtml(x)) });
  plan.top.forEach((p) => data.blocks.push(passage(p)));
  let n = 0;
  (doc.sections || []).forEach((sec, si) => {
    const cat = String(sec.heading || '');   // a review game's category
    (plan.before.get(si) || []).forEach((p) => data.blocks.push(passage(p)));
    if (sec.heading || sec.directions) data.blocks.push({ t: 'section', heading: String(sec.heading || ''), directions: sec.directions ? mathHtml(vv(sec.directions, ver)) : '' });
    for (const q of sec.questions || []) {
      (plan.beforeQ.get(q) || []).forEach((p) => data.blocks.push(passage(p)));
      n++;
      if (!FORMAT_TYPES.includes(q.type || 'short')) continue;
      const it = pageItem(pack, doc, q, n, ver, salt, R, problems, { auto, mode, code });
      if (mode === 'game' && cat) it.cat = cat;
      data.blocks.push(it);
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
</head><body>${ctx.preview ? `<div class="pv-mark" aria-hidden="true">${esc(PREVIEW_MARK)}</div>` : ''}<a class="skip" href="#main">Skip to the ${data.mode === 'notes' ? 'notes' : data.mode === 'game' ? 'game' : 'questions'}</a>
<main class="wrap" id="app"><noscript>This page needs JavaScript turned on. Ask your teacher for a paper copy.</noscript></main>
<script>window.PPA_DATA=${jsonForScript(engine)};window.PPI_DATA=${jsonForScript(data)};</script>
<script>${read('apps/engine.js')}</script>
${auto ? `<script>${read('interactive-format/forms.js')}</script>\n` : ''}${data.mode ? `<script>${read(`interactive-format/${data.mode}.js`)}</script>\n` : ''}<script>${read('interactive-format/page.js')}</script>
</body></html>
`;
  return { html, data, problems, auto };
}

/* For the teacher copy and README: what the page does, and what the hashes can and can't do. codes: [{ver, code}], the
   class-mode codes of an auto-graded review game (classCodesOf). */
export function teacherNoteLines(doc, codes = []) {
  const auto = doc.grading === 'auto', mode = modeOf(doc);
  const files = `one HTML file per version (${versionsOfDoc(doc).map((v) => '…-interactive' + (v ? '-' + v : '') + '.html').join(', ')})`;
  const lines = [];
  if (mode === 'notes') {
    lines.push(`Students fill in these notes on a device: ${files}. Each blank is a box in the text of the notes. It works offline in any browser, needs no accounts and sends nothing anywhere; the notes are saved only in that browser, so a student can close it and come back.`);
    lines.push(auto
      ? '"Check my notes" marks each blank right or not (forgiving capital letters, spaces and plurals) so the student can fix it and check again; a right blank shows its explanation, and when every blank is right the page shows the completed notes. "Print my notes" prints her filled-in notes for her binder. Stop-and-think and other written answers are left for you.'
      : 'The page holds no answers at all. When the student presses Finish it shows her filled-in notes with her name and the date, ready to print or save as a PDF; check them with this teacher copy.');
  } else if (mode === 'game') {
    lines.push(`Students play this review game on a device, one card at a time: ${files}. It works offline in any browser, needs no accounts and sends nothing anywhere; progress is saved only in that browser.`);
    lines.push(auto
      ? 'Played alone: the page checks each card (multiple choice, true/false, numbers, matching and answers of a few words; capital letters and plurals are forgiven), gives the card\'s points for a right first try and half for a right second try, shows the explanation for a right answer, and ends with a results page the student can print. Longer written answers are left for you.'
      : 'Played alone: the page holds no answers. The student answers every card, then gets an answer sheet (name, date, every card with her answer and its points) to print or save as a PDF; grade it with this teacher copy.');
    lines.push(auto
      ? `Played as a class: "Play as a class" puts the cards on a projector with a scoreboard for 2 to 6 teams; you give each card's points to a team. "Reveal answer" shows the answer and why once you type the class code${codes.length ? ` (${codes.map((c) => `${c.ver ? `version ${c.ver}: ` : ''}${c.code}`).join(', ')})` : ''}, which is printed only here.`
      : 'Played as a class: "Play as a class" puts the cards on a projector with a scoreboard for 2 to 6 teams; read the answers from this teacher copy and give each card\'s points to a team.');
  } else if (hasPool(doc)) {
    const n = doc.pool.versions.length;
    lines.push(`One version per student: one HTML file (…-interactive.html) holds ${n} versions with the same questions and different numbers. A student types her name and presses "Get my questions"; her name picks her version, and its 5-letter version code shows at the top of her page and on her printed answer sheet. It works offline in any browser, needs no accounts and sends nothing anywhere.`);
    lines.push('The page holds no answers at all. When the student presses Finish it shows an answer sheet (name, date, version code, every answer, room for points) to print or save as a PDF. Grade it with the key for her code: the all-versions key (PDF) or your teacher key page (an HTML file in your final files: type her code or her name). Keep the key page to yourself; never share it with the student page.');
    lines.push(`This teacher copy is version A, the version the checkers read in full; every version's numbers and keys were made from it by script and each key was checked again.`);
  } else {
    lines.push(`Students answer this on a device: ${files}. It works offline in any browser, needs no accounts and sends nothing anywhere; answers are saved only in that browser, so a student can close it and come back.`);
    lines.push(auto
      ? 'Graded automatically: when the student presses Finish, the page scores multiple choice, true/false, number and matching questions, shows which were right, and shows the explanation for each right answer. Short and written answers are listed as "needs your teacher" and are never scored by the page. The student can print the results.'
      : 'Printed for grading later: the page holds no answers at all. When the student presses Finish it shows an answer sheet (name, date, every question with the student\'s answer, room for points and notes) to print or save as a PDF. Grade it with this teacher copy.');
  }
  if (auto) lines.push(`How the answers are protected: the file stores each right answer only as a salted SHA-256 code, never as text, and the explanations are locked with the right answer${mode === 'game' ? ' (and, for the projector, with the class code)' : ''}. This stops casual peeking (view source, the browser\'s tools). It is not test security: a student who knows programming can try every choice of a multiple-choice question against its code, and short answers can be guessed the same way. Use it for practice and low-stakes checks; for a graded test, choose "print the results" or paper.`);
  lines.push('On a shared device, "Start over for a new student" clears the saved answers (two taps).');
  return lines;
}

// The class-mode codes of one document (auto-graded review games only; empty otherwise).
export function classCodesOf(pack, doc, base) {
  if (doc.grading !== 'auto' || modeOf(doc) !== 'game') return [];
  return versionsOfDoc(doc).map((ver) => ({ ver, code: classCode(pack, pageFile(base, ver)) }));
}

export function teacherNoteHtml(doc, codes = []) {
  return `<div class="keep" style="border:1.5pt solid #000;border-radius:3pt;padding:6pt 9pt;margin:10pt 0">
  <b>About the interactive page (${doc.grading === 'auto' ? 'graded automatically' : 'results printed for grading later'})</b>
  ${teacherNoteLines(doc, codes).map((l) => `<p style="margin:4pt 0;font-size:10pt">${esc(l)}</p>`).join('')}${codes.length ? `
  <p style="margin:6pt 0 2pt;font-size:12pt"><b>Class code for "Reveal answer":</b> ${codes.map((c) => `${c.ver ? `version ${esc(c.ver)} ` : ''}<b style="font-family:monospace;letter-spacing:1pt">${esc(c.code)}</b>`).join(' · ')}</p>` : ''}</div>`;
}

/* The renderer's hook: the HTML pages of one interactive document (the teacher copies are made by render-pack.mjs).
   io.html(file, html, what, title) writes a page in the preview and the final alike. */
export async function renderInteractivePages(doc, base, ctx, io) {
  const files = [];
  for (const ver of versionsOfDoc(doc)) {
    const file = pageFile(base, ver);
    const { html, problems } = pageHtml(ctx.pack, doc, ver, base, { brand: ctx.brand, subjectLabel: ctx.subjectLabel, preview: ctx.preview, build: ctx.packHash });
    if (problems.length) throw new Error(`${doc.title}: ${problems.join('; ')}`);
    const mode = modeOf(doc), auto = doc.grading === 'auto';
    const how = mode === 'notes' ? (auto ? 'students fill in the blanks and check them; prints the filled-in notes' : 'students fill in the blanks; Finish prints the filled-in notes to check')
      : mode === 'game' ? (auto ? 'one card at a time, scored as they play, or as a class on a projector' : 'one card at a time, then an answer sheet to grade; or as a class on a projector')
        : auto ? 'graded automatically when the student finishes' : 'prints an answer sheet to grade later';
    const what = mode === 'notes' ? 'interactive guided notes' : mode === 'game' ? 'interactive review game' : 'interactive page';
    await io.html(file, html, `${doc.title}: ${what} for students${ver ? `, version ${ver}` : ''} (one offline file; ${how})`, doc.title);
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
