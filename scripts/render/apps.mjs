// Review apps and interactive worksheets (menu items `reviewapp` and `interactive`; docs/KINDS-APPS.md).
//
// Each one becomes ONE self-contained, offline HTML file: no network requests (a Content-Security-Policy forbids
// them), no trackers, no outside fonts, and it works opened from a file (file://) or from any static host.
// Answers are never in the student file: each accepted form is stored as a salted SHA-256 hash of its normalized form,
// and the `why` shown after a right answer is locked (XOR with a SHA-256 keystream) with that answer. The engine and
// the idea come from the owner's Pet World note sheets (scripts/notes/ there); nothing Pet World specific is used.
//
// Preview: PDFs only (the content, the teacher solutions, and a page of screenshots of the app), watermarked like
// every preview PDF. Final (after approval): the same PDFs plus the HTML files and HOW-TO-SHARE-THE-APPS.txt.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { esc, vv, cleanSvg, questionsOf, kindOf, layoutOf, workLinesFor, tfValue, letter, answerText, keyText } from './util.mjs';
import { baseCss } from './html.mjs';

const HERE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'apps');
const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');
export const APP_KINDS = new Set(['interactive', 'reviewapp']);
export const isAppDoc = (doc) => APP_KINDS.has(kindOf(doc));
export const APP_TYPES = ['mc', 'tf', 'numeric', 'short', 'open'];
export const REVIEW_MODES = ['flashcards', 'memorize', 'practice', 'match'];
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest();

/* ---------- the engine, run in Node so the build reads answers exactly as the page does ---------- */
export function loadEngine(settings = {}) {
  const ctx = { window: { PPA_DATA: settings }, TextEncoder, TextDecoder, atob, btoa, console, Uint8Array, Uint32Array, Promise, JSON, Math, String, Number, Date, Array, Object, RegExp };
  vm.createContext(ctx);
  vm.runInContext(read('engine.js'), ctx);
  return ctx.window.PPA;
}

// Number words and unit marks ("13 °C", "twelve") are read in math and science, never in English or history,
// where a word answer must stay a word. A document may set app.numberWords / app.unitMarks to true or false.
function readerSettings(pack, doc) {
  const numeric = ['math', 'science'].includes(pack.order?.subject);
  const a = doc.app || {};
  return { numberWords: a.numberWords ?? numeric, unitMarks: a.unitMarks ?? numeric };
}
export const saltOf = (pack, base) => sha(`PPA1|${pack.id || 'pack'}|${base}`).toString('hex').slice(0, 16);
export const storageKeyOf = (pack, base) => `pp-app:${pack.id || 'pack'}:${base}:v1`;

function lock(salt, id, canon, obj) {
  const pt = Buffer.from('PPA:' + JSON.stringify(obj), 'utf8');
  const key = `PPA1x|${salt}|${id}|${canon}`;
  const out = Buffer.alloc(pt.length);
  for (let i = 0; i * 32 < pt.length; i++) { const ks = sha(key + '#' + i); for (let j = 0; j < 32 && i * 32 + j < pt.length; j++) out[i * 32 + j] = pt[i * 32 + j] ^ ks[j]; }
  return out.toString('base64');
}
const hashOf = (salt, id, canon) => sha(`PPA1|${salt}|${id}|${canon}`).toString('hex');

// The right forms of one question, as the teacher wrote them: the answer first, then `accept`.
export function rightForms(q) {
  const type = q.type || 'short';
  if (type === 'mc') return [Number(vv(q.answer))];
  if (type === 'tf') return [tfValue(vv(q.answer))];
  if (type === 'open') return [];
  return [vv(q.answer), ...(vv(q.accept) || [])].filter((a) => a !== undefined && a !== null && String(a).trim() !== '');
}

/* One question → what the page holds: the text it shows, the hashes of its right forms (each with its locked `why`),
   and the hashes of predictable wrong answers with their messages (`miss`). Problems are collected, never thrown. */
function appItem(q, n, salt, P, mini, problems, where) {
  const type = q.type || 'short';
  const id = String(q.id || `q${n}`);
  if (!APP_TYPES.includes(type)) { problems.push(`${where}: type ${type} can't be used in an app (use ${APP_TYPES.join(', ')})`); return null; }
  const item = { id, n, type, prompt: String(vv(q.prompt) ?? '') };
  if (q.level) item.level = vv(q.level);
  const fig = cleanSvg(vv(q.figure)); if (fig) item.figure = fig;
  if (vv(q.unit)) item.unit = String(vv(q.unit));
  if (type === 'mc') item.choices = (vv(q.choices) || []).map(String);
  if (type === 'open') { item.minWords = Number(q.minWords) || 10; return item; }
  if (q.hint) item.hint = String(vv(q.hint));
  if (mini && (q.work === true || (q.work !== false && workLinesFor(q, mini) > 0))) item.work = true;
  const why = String(vv(q.why) ?? '');
  const canons = [];
  for (const f of rightForms(q)) {
    const c = P.keyCanon(f, type);
    if (!c) { problems.push(`${where}: the accepted form “${f}” doesn't read as a number`); continue; }
    if (!canons.includes(c)) canons.push(c);
  }
  if (!canons.length) problems.push(`${where}: no accepted form to check against`);
  item.acc = canons.map((c) => ({ h: hashOf(salt, id, c), x: lock(salt, id, c, { why }) }));
  item.miss = {};
  for (const m of q.miss || []) {
    const c = P.keyCanon(m.answer, type);
    if (!c) { problems.push(`${where}: the wrong answer “${m.answer}” doesn't read as a number`); continue; }
    if (canons.includes(c)) { problems.push(`${where}: the wrong answer “${m.answer}” is also a right answer`); continue; }
    item.miss[hashOf(salt, id, c)] = String(m.why || 'Look again.');
  }
  return item;
}

/* The data one app page holds (window.PPA_DATA). Returns {data, problems}. */
export function appData(pack, doc, base, brand = {}) {
  const kind = kindOf(doc), problems = [], name = doc.title || kind;
  const salt = saltOf(pack, base), reader = readerSettings(pack, doc);
  const P = loadEngine({ salt, ...reader });
  const o = pack.order || {};
  const mini = { layout: layoutOf(pack.style || {}), pack };
  if (Array.isArray(doc.versions) && doc.versions.length > 1) problems.push(`${name}: an app has one version (drop "versions")`);
  const data = {
    kind, key: storageKeyOf(pack, base), salt, ...reader, title: String(doc.title || ''),
    sub: [o.grade && `Grade ${o.grade}`, o.topic, o.teacher].filter(Boolean).join(' · '),
    notice: `${brand.aiNotice || 'Made with AI.'} ${brand.shortName || brand.name || ''}`.trim(),
  };
  const seen = new Set();
  const items = (sec) => (sec.questions || []).map((q) => {
    const where = `${name} ${q.id || '(no id)'}`;
    if (seen.has(q.id)) problems.push(`${where}: id used twice`);
    seen.add(q.id);
    return q;
  });
  if (kind === 'interactive') {
    data.directions = doc.directions ? String(doc.directions) : '';
    let n = 0;
    data.sections = (doc.sections || []).map((sec) => ({
      heading: sec.heading || '', directions: sec.directions || '',
      items: items(sec).map((q) => appItem(q, ++n, salt, P, mini, problems, `${name} ${q.id}`)).filter(Boolean),
    }));
    if (!n) problems.push(`${name}: an interactive worksheet needs questions`);
    for (const it of data.sections.flatMap((s) => s.items)) if (it.type !== 'open' && !it.hint) problems.push(`${name} ${it.id}: no hint (the hint opens after two misses)`);
  } else {
    const modes = (doc.app?.modes || REVIEW_MODES).filter((m) => REVIEW_MODES.includes(m));
    const bad = (doc.app?.modes || []).filter((m) => !REVIEW_MODES.includes(m));
    if (bad.length) problems.push(`${name}: unknown mode(s) ${bad.join(', ')} (use ${REVIEW_MODES.join(', ')})`);
    data.cards = (doc.cards || []).map((c, i) => ({ id: String(c.id || `c${i + 1}`), front: String(c.front ?? ''), back: String(c.back ?? '') }));
    data.passages = (doc.passages || []).map((p, i) => ({ id: String(p.id || `m${i + 1}`), title: String(p.title || `Passage ${i + 1}`), source: String(p.source || ''), text: String(p.text || '').replace(/\r/g, '') }));
    let n = 0;
    data.practice = (doc.sections || []).flatMap((sec) => items(sec)).map((q) => appItem(q, ++n, salt, P, null, problems, `${name} ${q.id}`)).filter(Boolean);
    data.practice.filter((q) => q.type === 'open').forEach((q) => problems.push(`${name} ${q.id}: a written (open) question can't be practiced in a review app`));
    data.practice = data.practice.filter((q) => q.type !== 'open');
    const pairs = doc.pairs || data.cards.filter((c) => c.back.length <= 90).map((c) => ({ id: c.id, term: c.front, def: c.back }));
    data.pairs = pairs.map((p, i) => ({ id: String(p.id || `p${i + 1}`), term: String(p.term ?? ''), def: String(p.def ?? '') }));
    const has = { flashcards: data.cards.length, memorize: data.passages.length, practice: data.practice.length, match: data.pairs.length >= 3 };
    data.modes = modes.filter((m) => has[m]);
    for (const m of modes) if (!has[m]) problems.push(`${name}: mode ${m} has nothing to show (${m === 'match' ? 'needs 3 pairs or short cards' : m === 'memorize' ? 'needs passages' : m === 'practice' ? 'needs questions' : 'needs cards'})`);
    if (!data.modes.length) problems.push(`${name}: a review app needs at least one mode with content`);
    // no duplicate cards, pairs or passages (a repeated card wastes a turn and confuses the boxes)
    const dup = (list, key, what) => { const s = new Map(); for (const x of list) { const k = String(x[key]).toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim(); if (!k) problems.push(`${name}: a ${what} is empty`); else if (s.has(k)) problems.push(`${name}: two ${what}s are the same: “${x[key]}”`); s.set(k, 1); } };
    dup(data.cards, 'front', 'card front'); dup(data.cards, 'back', 'card back'); dup(data.cards, 'id', 'card id');
    dup(data.pairs, 'term', 'match word'); dup(data.pairs, 'def', 'match meaning');
    dup(data.passages, 'text', 'passage');
    for (const p of data.passages) { const w = p.text.split(/\s+/).filter(Boolean).length; if (w > 250) problems.push(`${name}: passage “${p.title}” has ${w} words (250 at most: split it)`); }
  }
  return { data, problems };
}

const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));
const CSP = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";

/* The student page: one file, everything inline. */
export function appHtml(pack, doc, base, brand) {
  const { data, problems } = appData(pack, doc, base, brand);
  const ui = data.kind === 'interactive' ? read('interactive.js') : read('reviewapp.js');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<title>${esc(data.title)}</title>
<style>${read('app.css')}</style>
</head><body><main class="wrap" id="app"><noscript>This page needs JavaScript turned on.</noscript></main>
<script>window.PPA_DATA=${jsonForScript(data)};</script>
<script>${read('engine.js')}</script>
<script>${ui}</script>
</body></html>
`;
  return { html, data, problems };
}

/* ---------- print pages (PDF in the preview and the final; the solutions page is also HTML in the final) ---------- */
function printPage(title, css, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}
const EXTRA = `
  .item { border: 1pt solid #888; border-radius: 4pt; padding: 7pt 9pt; margin: 0 0 9pt; break-inside: avoid; }
  .item p { margin: 0 0 4pt; }
  .lbl { font-weight: 700; } .forms { font-size: 10pt; } .hint, .miss { font-size: 10pt; color: #222; }
  .cardt td:first-child { width: 36%; font-weight: 700; }
  .passage { white-space: pre-wrap; border-left: 3pt solid #000; padding: 4pt 10pt; font-size: 12.5pt; line-height: 1.55; }
  .shots { display: flex; gap: 12pt; align-items: flex-start; flex-wrap: wrap; }
  .shots figure { margin: 0 0 10pt; } .shots img { border: 1pt solid #999; display: block; }
  .shots figcaption { font-size: 9pt; margin-top: 3pt; }
  .screenwide img { width: 100%; }`;

function questionKeyHtml(q, n) {
  const type = q.type || 'short';
  const forms = rightForms(q);
  const shown = type === 'mc' || type === 'tf' ? answerText(q) : type === 'open' ? String(vv(q.answer) ?? '(a model answer was not given)') : keyText(q);
  const parts = [`<div class="item"><p><b>${n}.</b> ${esc(vv(q.prompt))}${q.level ? ` <span class="tag">Level ${esc(vv(q.level))}</span>` : ''}</p>`];
  if (cleanSvg(vv(q.figure))) parts.push(`<div class="fig">${cleanSvg(vv(q.figure))}</div>`);
  if (type === 'mc') parts.push(`<div class="choices c1">${(vv(q.choices) || []).map((c, i) => `<div class="ch${i === Number(vv(q.answer)) ? ' right' : ''}"><span class="l">${letter(i)}.</span><span>${esc(c)}</span></div>`).join('')}</div>`);
  parts.push(`<div class="key"><b>${type === 'open' ? 'A strong answer' : 'Answer'}:</b> ${esc(shown)}`);
  if (['numeric', 'short'].includes(type) && forms.length > 1) parts.push(`<div class="forms"><span class="lbl">Also accepted:</span> ${forms.slice(1).map((f) => esc(f)).join(' · ')}</div>`);
  if (type === 'numeric') parts.push(`<div class="forms">The app also accepts the same value written another way (a fraction, a decimal, a unit after the number, number words).</div>`);
  if (vv(q.why)) parts.push(`<div class="why"><span class="lbl">Why:</span> ${esc(vv(q.why))}</div>`);
  if (q.hint) parts.push(`<div class="hint"><span class="lbl">Hint (after two misses):</span> ${esc(vv(q.hint))}</div>`);
  for (const m of q.miss || []) parts.push(`<div class="miss"><span class="lbl">If a student answers ${esc(type === 'mc' ? letter(Number(m.answer)) : m.answer)}:</span> ${esc(m.why)}</div>`);
  if (type === 'open' && q.look) parts.push(`<div class="hint"><span class="lbl">Look for:</span> ${esc([].concat(q.look).join('; '))}</div>`);
  parts.push('</div></div>');
  return parts.join('');
}

/* Interactive worksheet: the teacher solutions page (every answer, every accepted form, why, the hint, the wrong-answer
   messages). The same HTML is the final's <doc>-solutions.html and, printed, <doc>-solutions.pdf. */
export function solutionsHtml(pack, doc, ctx) {
  const o = pack.order || {};
  let n = 0;
  const body = `<div class="tbanner">TEACHER SOLUTIONS · every answer, the forms the app accepts, and why</div>
  <h1>${esc(doc.title)}: solutions</h1>
  <p class="sub">${esc([o.grade && `Grade ${o.grade}`, ctx.subjectLabel, o.topic, o.teacher].filter(Boolean).join(' · '))}</p>
  <p class="small">Students see a short wait after a miss, write what they're thinking after two misses, and then see the hint.
  They see the “why” only after they get the answer right. Written answers are never checked by the app: read them on the student's device or their printout.</p>
  ${(doc.sections || []).map((sec) => `${sec.heading ? `<h2>${esc(sec.heading)}</h2>` : ''}${(sec.questions || []).map((q) => questionKeyHtml(q, ++n)).join('')}`).join('')}`;
  return printPage(`${doc.title}: solutions`, baseCss(ctx) + EXTRA, body);
}

/* Review app: everything in it, for the teacher to read before approving (the content PDF). */
export function reviewContentHtml(pack, doc, ctx) {
  const o = pack.order || {};
  const { data } = appData(pack, doc, 'content', ctx.brand);
  const modes = data.modes.map((m) => ({ flashcards: 'Flashcards', memorize: 'Memorize', practice: 'Practice', match: 'Vocabulary match' })[m]);
  let n = 0;
  const body = `<div class="tbanner">REVIEW APP CONTENT · every card, passage and question in the app, with the answers</div>
  <h1>${esc(doc.title)}</h1>
  <p class="sub">${esc([o.grade && `Grade ${o.grade}`, ctx.subjectLabel, o.topic, o.teacher].filter(Boolean).join(' · '))}</p>
  <p>Modes in the app: <b>${esc(modes.join(', '))}</b>.</p>
  ${data.cards.length ? `<h2>Flashcards (${data.cards.length})</h2><table class="cardt"><tr><th>Front</th><th>Back</th></tr>${data.cards.map((c) => `<tr><td>${esc(c.front)}</td><td>${esc(c.back)}</td></tr>`).join('')}</table>` : ''}
  ${data.passages.length ? `${data.passages.map((p, i) => `<div class="keep">${i ? '' : `<h2>Memorize</h2><p class="small">Five steps: read it; type it with only first letters showing; fill in a third, then two thirds, of the words; type it from memory. 90% of the words right opens the next step; punctuation and capitals don't count.</p>`}<h3>${esc(p.title)}</h3>${p.source ? `<p class="small">${esc(p.source)}</p>` : ''}<div class="passage">${esc(p.text)}</div></div>`).join('')}` : ''}
  ${data.practice.length ? `<h2>Practice (${data.practice.length} questions, shuffled each round; a missed one comes back)</h2>${(doc.sections || []).flatMap((s) => s.questions || []).filter((q) => q.type !== 'open').map((q) => questionKeyHtml(q, ++n)).join('')}` : ''}
  ${data.modes.includes('match') ? `<h2>Vocabulary match (${data.pairs.length} pairs, 5 a round)</h2><table class="cardt"><tr><th>Word</th><th>Meaning</th></tr>${data.pairs.map((p) => `<tr><td>${esc(p.term)}</td><td>${esc(p.def)}</td></tr>`).join('')}</table>` : ''}`;
  return printPage(doc.title, baseCss(ctx) + EXTRA, body);
}

/* ---------- screenshots of the app (preview page; also used by checks/apps.mjs) ---------- */
// Opens the file offline: every request that isn't the file itself is blocked and counted.
export async function openOffline(browser, file, { width = 375, height = 800, theme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme, serviceWorkers: 'block' });
  const outside = [];
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('file:') || u.startsWith('data:')) return route.continue();
    outside.push(u); return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + file);
  await page.waitForSelector('#app > *:not(noscript)');
  return { context, page, outside, errors };
}

export async function screenshots(browser, file, kind) {
  const shots = [];
  for (const [width, height, label] of [[375, 760, 'Phone (375 px)'], [1280, 800, 'Computer (1280 px)']]) {
    const { context, page } = await openOffline(browser, file, { width, height });
    shots.push({ label: `${label}: first screen`, width, png: await page.screenshot({ type: 'png' }) });
    if (width === 375) {
      if (kind === 'reviewapp') {
        const tile = await page.$('[data-go="flashcards"]') || await page.$('[data-go]');
        if (tile) { await tile.click(); shots.push({ label: 'Phone: flashcards', width, png: await page.screenshot({ type: 'png' }) }); }
        await page.click('[data-go="home"]').catch(() => {});
        if (await page.$('[data-go="practice"]')) { await page.click('[data-go="practice"]'); shots.push({ label: 'Phone: practice', width, png: await page.screenshot({ type: 'png' }) }); await page.click('[data-go="home"]'); }
        if (await page.$('[data-go="memorize"]')) { await page.click('[data-go="memorize"]'); shots.push({ label: 'Phone: memorize', width, png: await page.screenshot({ type: 'png' }) }); }
      } else {
        await page.evaluate(() => window.scrollTo(0, document.querySelector('.q') ? document.querySelector('.q').offsetTop - 120 : 0));
        shots.push({ label: 'Phone: first questions', width, png: await page.screenshot({ type: 'png' }) });
      }
    }
    await context.close();
  }
  return shots;
}

function shotsHtml(doc, ctx, shots, kind) {
  const phone = shots.filter((s) => s.width < 600), wide = shots.filter((s) => s.width >= 600);
  const img = (s, w) => `<figure><img src="data:image/png;base64,${s.png.toString('base64')}" style="width:${w}" alt="${esc(s.label)}"><figcaption>${esc(s.label)}</figcaption></figure>`;
  const body = `<h1>${esc(doc.title)}: what students see</h1>
  <p class="small">Screenshots of the ${kind === 'interactive' ? 'interactive worksheet' : 'review app'} as it opens on a phone and on a computer, made from this preview's content.
  The app itself comes with the final files, after you approve; it works offline, with no accounts, and saves only on the student's device.</p>
  <div class="shots">${phone.map((s) => img(s, '1.95in')).join('')}</div>
  <div class="screenwide pb">${wide.map((s) => img(s, '100%')).join('')}</div>`;
  return printPage(`${doc.title}: screens`, baseCss(ctx) + EXTRA, body);
}

export function shareText(brand, files) {
  return [
    'HOW TO SHARE THE APPS',
    '',
    'Each app is one HTML file. It works offline, needs no accounts and sends nothing anywhere: a student\'s progress',
    'is saved only in the browser on their own device (clearing the browser\'s data, or a private window, erases it).',
    '',
    ...files.map((f) => `  ${f}`),
    '',
    'Ways to share one:',
    '  - Email it, or post it as a file: students download it and open it in any browser (phone, tablet, Chromebook, computer).',
    '  - Google Drive or Classroom: upload the file. Students download it and open it in a browser; Drive\'s own preview',
    '    shows the code, not the app.',
    '  - Any static web host (your school site, GitHub Pages, Netlify, Google Sites "embed code"): upload the file as is.',
    '',
    'The answers are not readable in the student file: each one is stored as a scrambled code (a hash). This stops casual',
    'peeking, not a determined adult with programming tools, so use the apps for practice, not for grades.',
    'The teacher solutions page (…-solutions.html / .pdf) has every answer: don\'t share it with students.',
    '',
    `${brand.aiNotice || ''}`,
  ].join('\n') + '\n';
}

/* ---------- the renderer's hook: one app document ---------- */
// io: { pdf(file, html, label, what, title), write(file, buf, what), browser }
export async function renderAppDoc(doc, base, ctx, io) {
  const { pack, brand } = ctx;
  const kind = kindOf(doc);
  const { html, problems } = appHtml(pack, doc, base, brand);
  if (problems.length) throw new Error(`${doc.title}: ${problems.join('; ')}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-app-'));
  try {
    const file = path.join(tmp, `${base}.html`);
    fs.writeFileSync(file, html);
    const shots = await screenshots(io.browser, file, kind);
    if (kind === 'interactive') {
      const sol = solutionsHtml(pack, doc, ctx);
      const copy = await import('./html.mjs');
      await io.pdf(`${base}-printable.pdf`, copy.copyHtml(doc, null, ctx, false), `${doc.title} · Printable copy`, `${doc.title}: a printable copy of the interactive worksheet`, doc.title);
      await io.pdf(`${base}-solutions.pdf`, sol, `${doc.title} · Teacher solutions`, `${doc.title}: teacher solutions (every answer, accepted forms, why, hints)`, doc.title);
      await io.pdf(`${base}-screens.pdf`, shotsHtml(doc, ctx, shots, kind), `${doc.title} · Screens`, `${doc.title}: screenshots of the interactive worksheet`, doc.title);
      io.write(`${base}.html`, html, `${doc.title}: the interactive worksheet (one offline file for students)`);
      io.write(`${base}-solutions.html`, sol, `${doc.title}: teacher solutions page (keep it from students)`);
    } else {
      await io.pdf(`${base}-content.pdf`, reviewContentHtml(pack, doc, ctx), `${doc.title} · Content`, `${doc.title}: every card, passage and question in the review app, with answers`, doc.title);
      await io.pdf(`${base}-screens.pdf`, shotsHtml(doc, ctx, shots, kind), `${doc.title} · Screens`, `${doc.title}: screenshots of the review app`, doc.title);
      io.write(`${base}.html`, html, `${doc.title}: the review app (one offline file for students)`);
    }
    ctx.appFiles = [...(ctx.appFiles || []), `${base}.html`];
    const last = pack.documents.filter(isAppDoc).at(-1) === doc;
    if (last && !ctx.preview) io.write('HOW-TO-SHARE-THE-APPS.txt', shareText(brand, ctx.appFiles), 'How to share the apps (email, Google Drive or Classroom, any website)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
