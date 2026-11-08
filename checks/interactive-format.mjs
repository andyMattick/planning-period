#!/usr/bin/env node
/* Checks for documents made in the interactive format (docs/KINDS-INTERACTIVE-FORMAT.md): format "interactive",
   grading "auto" or "print". The questions themselves get the same checks as any printable document (checks/keys.mjs,
   test-wise.mjs, cross-item.mjs, no-passage.mjs read every document whatever its format); this adds what the HTML page
   itself must get right.

     node checks/interactive-format.mjs <pack.json> [more packs] [--browser] [--shots <dir>] [--both]
     node checks/interactive-format.mjs --self-test          broken copies of samples/_cap-interactive must fail

   Fast (always; exit 1 on any problem):
     - the pack fields: format, grading, kinds and question types the format can make (scripts/render/interactive-format.mjs)
     - self-contained: no outside URL in src/href/url()/srcset/action, no fetch, XMLHttpRequest, WebSocket,
       EventSource, sendBeacon, import(), <link>, <iframe>, <object>, <embed>, <base> or <form action>, and the
       Content-Security-Policy that forbids every request is in the page
     - grading "print": no answer data at all: no hashes (no 64-hex string), no salt, no acc/pairs/miss/x/hint fields,
       no explanation text and no key the student can't already see on the page
     - grading "auto": no plain-text key (no explanation text, no accepted form the student can't already see), and every
       objective item's hashes verify against the pack's key: the page's own reader (run in Node) marks every accepted
       form right and unlocks its explanation, and marks every other choice (and a far-off number) wrong
     - rendered pages next to the pack (<folder>/out-preview/ and <folder>/out/): the same checks on the files there, and
       they must match a fresh build of the pack (a page that is out of date fails)
   --browser (Playwright; skipped with a message when it isn't here): each page opened from a file with every outside
     request blocked: no page error, no outside request, no sideways scroll at 375 px; a reload keeps the answers;
     auto: every item answered right (numbers typed in another equivalent form where there is one) → 100%, and every
     item answered wrong on a fresh device → 0%; print: Finish shows the answer sheet with the name and every answer, and
     no score or right/wrong.
   --both renders each interactive document in both grading modes (the self-test and the fixtures use it).
   --shots <dir> saves screenshots (375 and 1280 px) of the answering page, the results and the answer sheet. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadPack, docName, argsOf } from './pack-lib.mjs';
import { basesOf } from './apps.mjs';
import { isInteractiveFormat, formatProblems, pageHtml, pageFile, versionsOfDoc, loadForms, OBJECTIVE_TYPES, scoredHere, splitBlanks, classCode } from '../scripts/render/interactive-format.mjs';
import { vv, tfValue, keyText, subjectLabelOf } from '../scripts/render/util.mjs';
import { plainMath } from '../scripts/render/math.mjs';
import { packHashOf } from '../scripts/render-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));
const menu = JSON.parse(fs.readFileSync(path.join(ROOT, 'menu.json'), 'utf8'));
const questions = (doc) => (doc.sections || []).flatMap((s) => s.questions || []);
const norm = (s) => String(s ?? '').toLowerCase().replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- reading a built page ---------- */
export function dataOf(html) {
  const m = html.match(/window\.PPA_DATA=(\{.*?\});window\.PPI_DATA=(\{.*?\});<\/script>/s);
  if (!m) return null;
  try { return { engine: JSON.parse(m[1]), data: JSON.parse(m[2]) }; } catch { return null; }
}
// What a student can see on the page anyway (prompts, choices, passages…): a key that is printed there gives nothing away.
function visibleText(data) {
  const out = [data.title, data.sub, data.directions];
  for (const b of data.blocks || []) {
    if (b.t === 'q') out.push(b.prompt, ...(b.parts || []), ...(b.choices || []), ...(b.left || []), b.unit, b.figure, b.hint, b.cat);
    if (b.t === 'passage') out.push(b.title, ...(b.paras || []));
    if (b.t === 'section') out.push(b.heading, b.directions);
  }
  return norm(out.filter(Boolean).join(' \n '));
}

/* ---------- the fast checks on one page ---------- */
const OUTSIDE = [
  [/\b(?:src|href|action|poster|data|formaction)\s*=\s*["']?\s*(?!#|data:|javascript:void)(?:[a-z][a-z0-9+.-]*:|\/\/)/i, 'an outside link (src/href/action)'],
  [/url\(\s*["']?\s*(?!data:|#)(?:[a-z][a-z0-9+.-]*:|\/\/)/i, 'an outside url() in the CSS'],
  [/\bsrcset\s*=/i, 'a srcset'],
  [/\bfetch\s*\(/, 'fetch()'], [/XMLHttpRequest/, 'XMLHttpRequest'], [/\bWebSocket\b/, 'WebSocket'], [/\bEventSource\b/, 'EventSource'],
  [/sendBeacon/, 'navigator.sendBeacon'], [/\bimport\s*\(/, 'a dynamic import()'], [/<link\b/i, 'a <link> tag'], [/<iframe\b/i, 'an <iframe>'],
  [/<object\b|<embed\b/i, 'an <object> or <embed>'], [/<base\b/i, 'a <base> tag'], [/<form\b[^>]*\baction\s*=/i, 'a form action'],
  [/\bwindow\.open\s*\(/, 'window.open()'], [/\blocation\s*(?:\.href)?\s*=(?!=)/, 'a navigation (location =)'],
];
export function selfContained(html) {
  const errs = [];
  // namespace names inside SVG (xmlns="http://www.w3.org/2000/svg") are names, not requests
  const text = html.replace(/\sxmlns(?::\w+)?=(["'])[^"']*\1/g, '');
  for (const [re, what] of OUTSIDE) { const m = text.match(re); if (m) errs.push(`not self-contained: ${what} (“${m[0].slice(0, 60)}”)`); }
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  if (!csp) errs.push('no Content-Security-Policy meta tag');
  else for (const d of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'"]) if (!csp[1].includes(d)) errs.push(`the Content-Security-Policy lacks ${d}`);
  return errs;
}

// The key forms of one question, as text (for "no plain-text key").
function keyTexts(q, ver) {
  const type = q.type || 'short', a = vv(q.answer, ver), out = [];
  if (['numeric', 'short', 'open'].includes(type)) out.push(...[a, ...(vv(q.accept, ver) || [])].filter((x) => x != null && String(x).trim().length >= 1).map(String));
  return out;
}

const LIBS = ['apps/engine.js', 'interactive-format/forms.js', 'interactive-format/page.js', 'interactive-format/notes.js', 'interactive-format/game.js']
  .map((f) => fs.readFileSync(path.join(ROOT, 'scripts/render', f), 'utf8'));
function withoutLibraries(html) { let h = html; for (const lib of LIBS) h = h.split(`<script>${lib}</script>`).join('<script></script>'); return h; }

/* Every fast check on one built page. Returns problems (strings). */
export function checkPage(pack, doc, ver, html) {
  const errs = selfContained(html), where = `${doc.title}${ver ? ` ${ver}` : ''}`;
  const got = dataOf(html);
  if (!got) return [...errs, 'the page data could not be read'].map((e) => `${where}: ${e}`);
  const { engine, data } = got;
  const auto = doc.grading === 'auto';
  if (data.grading !== (auto ? 'auto' : 'print')) errs.push(`the page grades "${data.grading}" but the pack says "${doc.grading}"`);
  const visible = visibleText(data);
  // the page's fixed code (engine, forms, page, notes and game scripts) is the same in every page and holds no key, so a
  // key word that happens to be in it ("greater", "the same") is not counted; only a script byte-identical to its
  // repo file is left out, so a key hidden in a changed script is still found
  const lower = withoutLibraries(html).toLowerCase();
  // explanations are never in the file as text (auto: locked with the right answer; print: not there at all)
  for (const q of questions(doc)) {
    const why = String(vv(q.why, ver) ?? '').trim();
    if (why.length >= 12 && lower.includes(why.toLowerCase().slice(0, 60)) && !visible.includes(norm(why).slice(0, 60))) errs.push(`${q.id}: its explanation is in the file as text`);
    for (const k of keyTexts(q, ver)) {
      const kk = norm(k);
      if (kk.length < 3 || visible.includes(kk)) continue;           // short numbers and visible text give nothing away
      if (lower.includes(k.toLowerCase())) errs.push(`${q.id}: the key “${k}” is in the file as text`);
    }
    for (const f of ['look', 'model']) if (q[f] && lower.includes(norm([].concat(q[f]).join(' ')).slice(0, 40))) errs.push(`${q.id}: the teacher's ${f} notes are in the file`);
  }
  const items = data.blocks.filter((b) => b.t === 'q');
  if (!auto) {
    if (engine.salt) errs.push('print mode: the page has a salt');
    if (data.tc) errs.push('print mode: the page has a class-code check');
    if (/\b[0-9a-f]{64}\b/.test(html)) errs.push('print mode: the page holds a hash');
    for (const it of items) for (const f of ['acc', 'pairs', 'miss', 'x', 'hint', 'blanks', 'rv']) if (it[f] != null) errs.push(`print mode: ${it.id} holds answer data (${f})`);
    if (/function keyForms\(/.test(html)) errs.push('print mode: the page carries the answer checker');
    return errs.map((e) => `${where}: ${e}`);
  }
  // auto: the hashes verify against the pack's key, through the page's own reader
  const qs = new Map(questions(doc).map((q) => [String(q.id), q]));
  for (const it of items) {
    const q = qs.get(it.id);
    if (!q) { errs.push(`${it.id}: on the page but not in the pack`); continue; }
    if (!scoredHere(it)) { for (const f of ['acc', 'pairs', 'x', 'blanks']) if (it[f] != null) errs.push(`${it.id}: a ${it.type} question holds hashes (it goes to the teacher, never scored)`); continue; }
    if (!(it.acc || it.pairs)) errs.push(`${it.id}: no hashes to check against`);
    if (it.type === 'fill' && !(Array.isArray(it.blanks) && it.blanks.length === it.k)) errs.push(`${it.id}: a notes line without a set of hashes for each blank`);
  }
  return errs.map((e) => `${where}: ${e}`);
}

/* The page's own reader (engine + forms, in Node) judges the pack's right forms right and other answers wrong. */
export async function checkHashes(pack, doc, ver, html, file) {
  const errs = [], where = `${doc.title}${ver ? ` ${ver}` : ''}`;
  const got = dataOf(html); if (!got || doc.grading !== 'auto') return errs;
  const { engine, data } = got;
  const { P, F } = loadForms(engine);
  for (const t of ['', 'abc', 'PPA1|x'.repeat(40)]) if (P.hex(P.sha256Sync(new TextEncoder().encode(t))) !== crypto.createHash('sha256').update(t).digest('hex')) errs.push(`the page's built-in SHA-256 is wrong for ${JSON.stringify(t)}`);
  const qs = new Map(questions(doc).map((q) => [String(q.id), q]));
  const has = (list, h) => (list || []).some((a) => a === h || a.h === h);
  // a review game's class code: it opens every card's "Reveal answer" (answer and why), and nothing else does
  if (data.mode === 'game' && file) {
    const code = classCode(pack, file);
    if (data.tc !== await P.hashOf('_class', `code:${code}`)) errs.push('the class code on the teacher copy does not match the page');
    for (const it of data.blocks.filter((b) => b.t === 'q')) {
      const q = qs.get(it.id); if (!q) continue;
      const o = await P.unlock(it.id, `reveal:${code}`, it.rv || '');
      if (!o || o.answer !== plainMath(keyText(q, ver)) || o.why !== plainMath(String(vv(q.why, ver) ?? ''))) errs.push(`${it.id}: "Reveal answer" doesn't open the answer and why with the class code`);
      if (await P.unlock(it.id, 'reveal:ZZZZZZ', it.rv || '')) errs.push(`${it.id}: "Reveal answer" opens with a wrong code`);
    }
  }
  for (const it of data.blocks.filter((b) => b.t === 'q' && scoredHere(b))) {
    const q = qs.get(it.id); if (!q) continue;
    const ans = vv(q.answer, ver), why = String(vv(q.why, ver) ?? '');
    const unlockOk = async (canon, x) => { const o = await P.unlock(it.id, canon, x); if (!o || o.why !== why) errs.push(`${it.id}: the explanation doesn't unlock with the right answer`); };
    if (it.type === 'mc' || it.type === 'tf') {
      const opts = it.type === 'mc' ? it.choices.map((_, i) => i) : ['true', 'false'];
      const right = it.type === 'mc' ? Number(ans) : tfValue(ans) ? 'true' : 'false';
      for (const o of opts) {
        const canon = it.type === 'mc' ? `opt:${o}` : `tf:${o}`;
        const h = await P.hashOf(it.id, canon), hit = (it.acc || []).find((a) => a.h === h);
        if (o === right && !hit) errs.push(`${it.id}: the right answer (${it.type === 'mc' ? 'choice ' + 'ABCDEFGH'[o] : o}) doesn't match the page's hash`);
        if (o !== right && hit) errs.push(`${it.id}: a wrong answer (${it.type === 'mc' ? 'choice ' + 'ABCDEFGH'[o] : o}) is marked right`);
        if (o === right && hit) await unlockOk(canon, hit.x);
      }
    } else if (it.type === 'fill') {
      // every accepted form, typed blank by blank, is right and opens the why; a made-up word in each blank is not
      for (const f of [ans, ...(vv(q.accept, ver) || [])].filter((a) => a != null && String(a).trim() !== '')) {
        const parts = splitBlanks(f, it.k);
        const r = await F.judgeFill(it.id, it, parts, it.ftype);
        if (r.res !== 'ok' || r.marks.some((m) => !m)) errs.push(`${it.id}: the accepted form “${f}” is not marked right`);
        else if (r.own.some((m) => !m)) errs.push(`${it.id}: a blank of “${f}” is not marked right by its own hashes`);
        else if ((r.ex && r.ex.why) !== why) errs.push(`${it.id}: the explanation doesn't unlock with “${f}”`);
        const shouted = await F.judgeFill(it.id, it, parts.map((p) => `  ${String(p).toUpperCase()} `), it.ftype);
        if (it.ftype !== 'numeric' && shouted.res !== 'ok') errs.push(`${it.id}: “${f}” in capitals with extra spaces is not marked right`);
      }
      const wrong = await F.judgeFill(it.id, it, Array.from({ length: it.k }, () => 'zzqxv'), it.ftype);
      if (wrong.res === 'ok' || wrong.marks.some(Boolean)) errs.push(`${it.id}: a made-up word is marked right`);
    } else if (it.type === 'numeric' || it.words) {
      const t = it.type === 'numeric' ? 'numeric' : 'short';
      for (const f of [ans, ...(vv(q.accept, ver) || [])].filter((a) => a != null && String(a).trim() !== '')) {
        const r = await F.judgeTyped(it.id, it, String(f), t);
        if (r.res !== 'ok') errs.push(`${it.id}: the accepted form “${f}” is not marked right (${r.res})`);
        else if ((r.ex && r.ex.why) !== why) errs.push(`${it.id}: the explanation doesn't unlock with “${f}”`);
      }
      const v = Number(String(ans).replace(/[^0-9.\-]/g, ''));
      const far = t === 'short' ? 'zzqxv' : Number.isFinite(v) ? String(v * 7 + 1001) : '987654';
      if ((await F.judgeTyped(it.id, it, far, t)).res === 'ok') errs.push(`${it.id}: ${t === 'short' ? 'a made-up word' : `a far-off number (${far})`} is marked right`);
    } else if (it.type === 'match') {
      const a = (Array.isArray(ans) ? ans : []).map(Number);
      for (let i = 0; i < a.length; i++) for (let c = 0; c < it.choices.length; c++) {
        const ok = has(it.pairs[i], await P.hashOf(`${it.id}.${i}`, `opt:${c}`));
        if (c === a[i] && !ok) errs.push(`${it.id}: item ${i + 1}'s right match doesn't match the page's hash`);
        if (c !== a[i] && ok) errs.push(`${it.id}: item ${i + 1} marks a wrong match right`);
      }
      const o = await P.unlock(it.id, `match:${a.join(',')}`, it.x);
      if (!o || o.why !== why) errs.push(`${it.id}: the explanation doesn't unlock with every pair right`);
    }
  }
  return errs.map((e) => `${where}: ${e}`);
}

/* ---------- build and check a pack ---------- */
const withGrading = (doc, g) => (g === doc.grading ? doc : { ...doc, grading: g });
export function buildPages(pack, { both = false, preview = false } = {}) {
  const bases = basesOf(pack), out = [];
  const subjectLabel = subjectLabelOf(menu, pack.order);
  for (const doc0 of pack.documents.filter(isInteractiveFormat)) {
    for (const g of both ? ['auto', 'print'] : [doc0.grading]) {
      const doc = withGrading(doc0, g);
      for (const ver of versionsOfDoc(doc)) {
        const base = bases.get(doc0);
        const { html, problems } = pageHtml(pack, doc, ver, base, { brand, subjectLabel, preview, build: packHashOf(pack) });
        out.push({ doc, ver, base, file: pageFile(base, ver), html, problems, name: `${docName(doc, pack.documents.indexOf(doc0))}${ver ? ' ' + ver : ''} (${g})` });
      }
    }
  }
  return out;
}

export async function checkPack(pack, folder, opts = {}) {
  const errors = [];
  for (const doc of pack.documents) formatProblems(pack, doc).forEach((p) => errors.push(p));
  const pages = buildPages(pack, opts);
  for (const p of pages) {
    p.problems.forEach((e) => errors.push(e));
    checkPage(pack, p.doc, p.ver, p.html).forEach((e) => errors.push(e));
    (await checkHashes(pack, p.doc, p.ver, p.html, p.file)).forEach((e) => errors.push(e));
  }
  // rendered pages next to the pack: the same checks, and they must be what the pack builds now
  let rendered = 0;
  if (folder) for (const [dir, preview] of [['out-preview', true], ['out', false]]) {
    const d = path.join(folder, dir);
    if (!fs.existsSync(d)) continue;
    const fresh = buildPages(pack, { preview });
    for (const p of fresh) {
      const f = path.join(d, p.file);
      if (!fs.existsSync(f)) { errors.push(`${dir}/${p.file} is missing: render the pack again`); continue; }
      const html = fs.readFileSync(f, 'utf8');
      rendered++;
      checkPage(pack, p.doc, p.ver, html).forEach((e) => errors.push(`${dir}/${p.file}: ${e}`));
      (await checkHashes(pack, p.doc, p.ver, html, p.file)).forEach((e) => errors.push(`${dir}/${p.file}: ${e}`));
      if (html !== p.html) errors.push(`${dir}/${p.file} is not what the pack builds now (out of date or edited): render the pack again`);
    }
  }
  return { errors, pages, rendered };
}

/* ---------- the browser ---------- */
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch {}
  try { const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(); return createRequire(path.join(g, 'noop.js'))('playwright'); } catch { return null; }
}
// Equivalent ways to type a number (ported from the interactive-standard checker on the istd-check branch, Q4).
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
function reduce(p, q) { if (!q) return null; const g = gcd(p, q); if (q < 0) { p = -p; q = -q; } return { p: p / g, q: q / g }; }
function parseNumber(s) {
  s = String(s).replace(/[−–]/g, '-').replace(/,/g, '').trim();
  let m = s.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (m) { const q = +m[4], p = (+m[2] * q + +m[3]) * (m[1] ? -1 : 1); return reduce(p, q); }
  m = s.match(/^(-?\d+)\s*\/\s*(\d+)/); if (m) return reduce(+m[1], +m[2]);
  m = s.match(/^(-?)(\d*)\.(\d+)/); if (m) { const q = 10 ** m[3].length, p = (+(m[2] || 0) * q + +m[3]) * (m[1] ? -1 : 1); return reduce(p, q); }
  m = s.match(/^(-?\d+)(?![\d/])/); if (m) return reduce(+m[1], 1);
  return null;
}
export function equivalentForms(raw) {
  const v = parseNumber(raw); if (!v) return [];
  const val = v.p / v.q, forms = [];
  const terminating = (() => { let q = v.q; while (q % 2 === 0) q /= 2; while (q % 5 === 0) q /= 5; return q === 1; })();
  const dec = (x) => String(+x.toFixed(10));
  if (v.q !== 1) {
    if (terminating) { forms.push(dec(val)); if (Math.abs(val) < 1) forms.push(dec(val).replace(/^(-?)0\./, '$1.')); }
    else { forms.push(val.toFixed(2)); forms.push(val.toFixed(3)); }
    forms.push(`${v.p}/${v.q}`);
    if (Math.abs(v.p) > v.q) { const w = Math.trunc(v.p / v.q), r = Math.abs(v.p % v.q); forms.push(`${w} ${r}/${v.q}`); }
  } else { forms.push(String(v.p)); forms.push(`${v.p}.0`); }
  return [...new Set(forms)];
}

async function openPage(b, file, { width = 375, height = 800, scheme = 'light', blockStorage = false } = {}) {
  const context = await b.newContext({ viewport: { width, height }, colorScheme: scheme, serviceWorkers: 'block' });
  const outside = [], errors = [];
  await context.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:')) return r.continue(); outside.push(u); return r.abort(); });
  if (blockStorage) await context.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await context.addInitScript(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });   // count print calls, open no dialog
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + file);
  await page.waitForSelector('#app > *:not(noscript)');
  return { context, page, outside, errors };
}
async function noSideways(page) { const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); return sw <= w + 1 ? null : `scrolls sideways at ${w} px (${sw} wide)`; }

// Answer every question: right (from the pack's key) or wrong. Short and written answers get a sentence either way.
export async function answerAll(page, doc, ver, data, how, only = null) {
  const qs = new Map(questions(doc).map((q) => [String(q.id), q]));
  for (const it of data.blocks.filter((x) => x.t === 'q')) {
    if (only && !only(it)) continue;
    await answerOne(page, qs.get(it.id), it, ver, how);
  }
}
// One question (or notes line, or card): right or wrong.
export async function answerOne(page, q, it, ver, how) {
  {
    const a = vv(q.answer, ver), sel = `[data-q="${it.id}"]`;
    if (it.type === 'fill') {
      // right: the key, blank by blank, with a capital letter (case is forgiven); wrong: a made-up word in each blank
      const parts = splitBlanks(a, it.k);
      for (let i = 0; i < it.k; i++) await page.fill(`#a-${it.id}-${i}`, how === 'right' ? String(parts[i]).replace(/^./, (c) => c.toUpperCase()) : 'zzqxv');
    } else if (it.type === 'mc') {
      const n = it.choices.length, i = how === 'right' ? Number(a) : (Number(a) + 1) % n;
      await page.check(`${sel} input[value="${i}"]`);
    } else if (it.type === 'tf') {
      const t = tfValue(a); await page.check(`${sel} input[value="${(how === 'right') === t ? 'true' : 'false'}"]`);
    } else if (it.type === 'match') {
      const arr = (Array.isArray(a) ? a : []).map(Number);
      for (let i = 0; i < arr.length; i++) await page.selectOption(`#m-${it.id}-${i}`, String(how === 'right' ? arr[i] : (arr[i] + 1) % it.choices.length));
    } else if (it.type === 'numeric') {
      const forms = [a, ...(vv(q.accept, ver) || [])].map(String);
      const alt = equivalentForms(forms[0]).find((f) => f !== forms[0]);
      await page.fill(`#a-${it.id}`, how === 'right' ? (how === 'right' && alt ? alt : forms[0]) : '987654321');
    } else if (it.type === 'open') await page.fill(`#a-${it.id}`, 'I think the mass stays the same because the atoms are only rearranged in the reaction.');
    else await page.fill(`#a-${it.id}`, how === 'right' ? String(a) : 'not sure');
  }
}

export async function checkBrowser(pages, pack, { shotsDir } = {}) {
  const pw = loadPlaywright();
  if (!pw) return { skipped: 'Playwright is not installed: the browser check was skipped' };
  const exe = process.env.PP_CHROMIUM || '/opt/pw-browsers/chromium';
  let b;
  try { b = await pw.chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox'] }); }
  catch (e) { return { skipped: `Chromium could not start (${e.message.split('\n')[0]}): the browser check was skipped` }; }
  const errors = [], notes = [], shots = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-intf-'));
  const shot = async (page, name) => { if (!shotsDir) return; fs.mkdirSync(shotsDir, { recursive: true }); const f = path.join(shotsDir, name + '.png'); await page.screenshot({ path: f, fullPage: true }); shots.push(f); };
  try {
    for (const p of pages) {
      const fail = (m) => errors.push(`${p.name}: ${m}`);
      const file = path.join(tmp, `${p.doc.grading}-${p.file}`);
      fs.writeFileSync(file, p.html);
      const { data } = dataOf(p.html);
      const tag = `${p.base}${p.ver ? '-' + p.ver : ''}-${p.doc.grading}`;
      try {
        const X = { b, p, file, data, tag, fail, notes, shot, pack };
        if (data.mode === 'notes') { await browseNotes(X); continue; }
        if (data.mode === 'game') { await browseGame(X); continue; }
        // 1. right answers (phone)
        let o = await openPage(b, file);
        const sw = await noSideways(o.page); if (sw) fail('answering page ' + sw);
        await o.page.fill('#pp-name', 'Sam Test (made-up)');
        await answerAll(o.page, p.doc, p.ver, data, 'right');
        await o.page.reload(); await o.page.waitForSelector('#pp-name');
        if ((await o.page.inputValue('#pp-name')) !== 'Sam Test (made-up)') fail('a reload lost the name');
        const firstMc = data.blocks.find((x) => x.t === 'q' && x.type === 'mc');
        if (firstMc && !(await o.page.isChecked(`[data-q="${firstMc.id}"] input[value="${Number(vv(questions(p.doc).find((q) => q.id === firstMc.id).answer, p.ver))}"]`))) fail('a reload lost a picked answer');
        await shot(o.page, `${tag}-375-answering`);
        await o.page.click('#pp-finish');
        if (p.doc.grading === 'auto') {
          await o.page.waitForSelector('#pp-score');
          const pct = Number(await o.page.getAttribute('#pp-score', 'data-pct'));
          if (pct !== 100) fail(`every right answer scored ${pct}%, not 100% (${await o.page.textContent('.rlist')})`.slice(0, 600));
          const teacher = data.blocks.filter((x) => x.t === 'q' && !OBJECTIVE_TYPES.includes(x.type)).length;
          if ((await o.page.locator('[data-result="teacher"]').count()) !== teacher) fail('short and written answers are not all listed for the teacher');
          if ((await o.page.locator('.rwhy').count()) < 1 && data.blocks.some((x) => x.t === 'q' && OBJECTIVE_TYPES.includes(x.type))) fail('no explanation shows after a right answer');
          await shot(o.page, `${tag}-375-results-right`);
          notes.push(`${p.name}: all right → ${pct}%`);
        } else {
          await o.page.waitForSelector('#s-h');
          const txt = await o.page.textContent('.sheet');
          if (!txt.includes('Sam Test (made-up)')) fail('the answer sheet has no name');
          if (await o.page.$('#pp-score, [data-result], .rwhy')) fail('print mode shows a score or right/wrong');
          if ((await o.page.locator('.sq').count()) !== data.blocks.filter((x) => x.t === 'q').length) fail('the answer sheet does not list every question');
          if (/\(blank\)/.test(txt)) fail('an answered question shows as blank on the sheet');
          await shot(o.page, `${tag}-375-sheet`);
          await o.page.emulateMedia({ media: 'print' });
          if (await o.page.isVisible('#pp-print')) fail('the buttons show in print');
          await shot(o.page, `${tag}-375-sheet-print`);
          await o.page.emulateMedia({ media: 'screen' });
          notes.push(`${p.name}: answer sheet with ${await o.page.locator('.sq').count()} answers`);
        }
        const sw2 = await noSideways(o.page); if (sw2) fail('finished page ' + sw2);
        if (o.outside.length) fail(`asked for ${o.outside.length} outside file(s): ${o.outside.slice(0, 2).join(', ')}`);
        if (o.errors.length) fail(`page errors: ${o.errors.slice(0, 3).join(' | ')}`);
        await o.context.close();
        // 2. wrong answers on a fresh device (auto: 0%)
        if (p.doc.grading === 'auto') {
          o = await openPage(b, file);
          await o.page.fill('#pp-name', 'Kim Test (made-up)');
          await answerAll(o.page, p.doc, p.ver, data, 'wrong');
          await o.page.click('#pp-finish');
          await o.page.waitForSelector('#pp-score');
          const pct = Number(await o.page.getAttribute('#pp-score', 'data-pct'));
          if (pct !== 0) fail(`every wrong answer scored ${pct}%, not 0%`);
          notes.push(`${p.name}: all wrong → ${pct}%`);
          if (o.errors.length) fail(`page errors: ${o.errors.slice(0, 3).join(' | ')}`);
          await o.context.close();
        }
        // 3. a computer screen, and storage blocked still works
        o = await openPage(b, file, { width: 1280, height: 860, blockStorage: true });
        if (!(await o.page.textContent('#app')).includes('blocking saving')) fail('with storage blocked, no warning shows');
        await shot(o.page, `${tag}-1280-answering`);
        await o.page.fill('#pp-name', 'Lee Test (made-up)');
        await answerAll(o.page, p.doc, p.ver, data, 'right');
        await o.page.click('#pp-finish');
        await o.page.waitForSelector(p.doc.grading === 'auto' ? '#pp-score' : '#s-h');
        await shot(o.page, `${tag}-1280-${p.doc.grading === 'auto' ? 'results' : 'sheet'}`);
        if (p.doc.grading === 'print') { await o.page.emulateMedia({ media: 'print' }); await shot(o.page, `${tag}-1280-sheet-print`); await o.page.emulateMedia({ media: 'screen' }); }
        if (o.errors.length) fail(`page errors with storage blocked: ${o.errors.slice(0, 3).join(' | ')}`);
        await o.context.close();
      } catch (e) { fail(`browser: ${e.message.split('\n')[0]}`); }
    }
  } finally { await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
  return { errors, notes, shots };
}

/* ---------- guided notes in the browser ---------- */
async function browseNotes({ b, p, file, data, tag, fail, notes, shot }) {
  const auto = p.doc.grading === 'auto';
  const its = data.blocks.filter((x) => x.t === 'q');
  const fills = its.filter((x) => x.type === 'fill'), blanks = fills.reduce((n, x) => n + x.k, 0);
  const ends = (o, what) => { if (o.outside.length) fail(`${what}: asked for ${o.outside.length} outside file(s)`); if (o.errors.length) fail(`${what}: page errors: ${o.errors.slice(0, 3).join(' | ')}`); };
  // 1. every blank right (phone): saved over a reload, then checked (auto) or finished and printed (print)
  let o = await openPage(b, file);
  let sw = await noSideways(o.page); if (sw) fail('notes page ' + sw);
  if ((await o.page.locator('input.blank').count()) !== blanks) fail(`the notes show ${await o.page.locator('input.blank').count()} blank boxes, not ${blanks}`);
  await o.page.fill('#pp-name', 'Sam Test (made-up)');
  await answerAll(o.page, p.doc, p.ver, data, 'right');
  await o.page.reload(); await o.page.waitForSelector('#pp-name');
  if ((await o.page.inputValue('#pp-name')) !== 'Sam Test (made-up)') fail('a reload lost the name');
  if (fills[0] && !(await o.page.inputValue(`#a-${fills[0].id}-0`)).trim()) fail('a reload lost a filled blank');
  await shot(o.page, `${tag}-375-notes-filled-in`);
  if (auto) {
    await o.page.click('#pp-check');
    await o.page.waitForSelector('#f-h');
    const pct = Number(await o.page.getAttribute('#pp-score', 'data-pct'));
    if (pct !== 100) fail(`every blank right checked as ${pct}%, not 100%`);
    if (!(await o.page.isVisible('.okline'))) fail('all right, but the completed notes are not shown as complete');
    if ((await o.page.locator('.fline[data-result="right"]').count()) !== fills.length) fail('not every notes line shows as right in the completed notes');
    if ((await o.page.locator('.rwhy').count()) < 1) fail('no explanation shows in the completed notes');
    await shot(o.page, `${tag}-375-notes-completed`);
    notes.push(`${p.name}: all right → ${pct}%, completed notes shown`);
  } else {
    await o.page.click('#pp-finish');
    await o.page.waitForSelector('#f-h');
    const txt = await o.page.textContent('.sheet');
    if (!txt.includes('Sam Test (made-up)')) fail('the printed notes have no name');
    if (await o.page.$('#pp-score, .mk.ok, .mk.no, .rwhy, [data-result="right"], [data-result="wrong"]')) fail('print mode shows a score or right/wrong');
    if (/\bblank\b/.test(await o.page.textContent('.fbody'))) fail('a filled blank shows as blank in the printed notes');
    if ((await o.page.evaluate(() => window.__prints)) < 1) await o.page.waitForFunction(() => window.__prints >= 1, null, { timeout: 2000 }).catch(() => fail('Finish did not open the print window'));
    notes.push(`${p.name}: Finish shows ${await o.page.locator('.fline').count()} filled-in lines with the name and prints them`);
  }
  await o.page.emulateMedia({ media: 'print' });
  if (await o.page.isVisible('#pp-print')) fail('the buttons show in print');
  await shot(o.page, `${tag}-375-notes-print`);
  await o.page.emulateMedia({ media: 'screen' });
  sw = await noSideways(o.page); if (sw) fail('filled-in notes ' + sw);
  ends(o, 'right'); await o.context.close();
  // 2. auto: every blank wrong → 0% with a ✗ on each, then half fixed (a mix of ✓ and ✗), then all fixed → 100%
  if (auto) {
    o = await openPage(b, file);
    await o.page.fill('#pp-name', 'Kim Test (made-up)');
    await answerAll(o.page, p.doc, p.ver, data, 'wrong');
    await o.page.click('#pp-check');
    await o.page.waitForSelector('#pp-checkres #pp-score');
    const pct = Number(await o.page.getAttribute('#pp-score', 'data-pct'));
    if (pct !== 0) fail(`every blank wrong checked as ${pct}%, not 0%`);
    if ((await o.page.locator('.mk.no').count()) !== blanks) fail(`every blank wrong, but ${await o.page.locator('.mk.no').count()} of ${blanks} show ✗`);
    notes.push(`${p.name}: all wrong → ${pct}%`);
    const half = new Set(fills.slice(0, Math.ceil(fills.length / 2)).map((x) => x.id));
    await answerAll(o.page, p.doc, p.ver, data, 'right', (x) => half.has(x.id));
    if ((await o.page.locator(`#mk-${fills[0].id}-0.no`).count())) fail('a changed blank keeps its old ✗');
    await o.page.click('#pp-check');
    await o.page.waitForFunction(() => document.querySelectorAll('.mk.ok').length > 0);
    await o.page.locator(`#q-${[...half][0]}`).scrollIntoViewIfNeeded();
    await shot(o.page, `${tag}-375-notes-checked-some-wrong`);
    await answerAll(o.page, p.doc, p.ver, data, 'right');
    await o.page.click('#pp-check');
    await o.page.waitForSelector('#f-h');
    if (Number(await o.page.getAttribute('#pp-score', 'data-pct')) !== 100) fail('fixed and checked again, but not 100%');
    notes.push(`${p.name}: fixed and checked again → 100%`);
    // "Print my notes" from the notes: the filled-in notes and the print window
    await o.page.click('#pp-edit'); await o.page.waitForSelector('#pp-printnotes');
    await o.page.click('#pp-printnotes'); await o.page.waitForSelector('#f-h');
    await o.page.waitForFunction(() => window.__prints >= 1, null, { timeout: 2000 }).catch(() => fail('"Print my notes" did not open the print window'));
    ends(o, 'wrong'); await o.context.close();
  }
  // 3. a computer screen with storage blocked
  o = await openPage(b, file, { width: 1280, height: 860, blockStorage: true });
  if (!(await o.page.textContent('#app')).includes('blocking saving')) fail('with storage blocked, no warning shows');
  await o.page.fill('#pp-name', 'Lee Test (made-up)');
  await answerAll(o.page, p.doc, p.ver, data, 'right');
  await shot(o.page, `${tag}-1280-notes-filled-in`);
  await o.page.click(auto ? '#pp-check' : '#pp-finish');
  await o.page.waitForSelector('#f-h');
  if (auto && Number(await o.page.getAttribute('#pp-score', 'data-pct')) !== 100) fail('with storage blocked, every blank right is not 100%');
  await shot(o.page, `${tag}-1280-notes-${auto ? 'completed' : 'finished'}`);
  await o.page.emulateMedia({ media: 'print' }); await shot(o.page, `${tag}-1280-notes-print`); await o.page.emulateMedia({ media: 'screen' });
  ends(o, 'storage blocked'); await o.context.close();
}

/* ---------- the review game in the browser ---------- */
async function browseGame({ b, p, file, data, tag, fail, notes, shot, pack }) {
  const auto = p.doc.grading === 'auto';
  const qs = new Map(questions(p.doc).map((q) => [String(q.id), q]));
  const cards = data.blocks.filter((x) => x.t === 'q');
  const scored = cards.filter(scoredHere);
  const ends = (o, what) => { if (o.outside.length) fail(`${what}: asked for ${o.outside.length} outside file(s)`); if (o.errors.length) fail(`${what}: page errors: ${o.errors.slice(0, 3).join(' | ')}`); };
  const cardNo = (pg) => pg.evaluate(() => { const m = document.querySelector('.cnum'); return m ? Number(m.textContent.match(/Card (\d+)/)[1]) : 0; });
  // play every card; how: 'right' | 'wrong' (auto: a wrong card is tried twice). shots: the first card before and after Check
  async function play(pg, how, { reloadAt = -1, shots = '' } = {}) {
    await pg.click('#pp-start');
    for (let i = 0; i < cards.length; i++) {
      await pg.waitForSelector('.gcard');
      if (i === reloadAt) { await pg.reload(); await pg.waitForSelector('#pp-start'); if (!/card \d+/i.test(await pg.textContent('#pp-start'))) fail('a reload lost the game in progress'); await pg.click('#pp-start'); await pg.waitForSelector('.gcard'); }
      const n = await cardNo(pg); if (n !== i + 1) { fail(`expected card ${i + 1}, the page shows card ${n}`); return; }
      const it = cards[i], q = qs.get(it.id);
      await answerOne(pg, q, it, p.ver, how);
      if (shots && i === 0) await shot(pg, `${shots}-card`);
      if (auto) {
        await pg.click('#pp-check');
        await pg.waitForFunction(() => document.querySelector('#pp-next') || /Try once more/.test((document.getElementById('pp-fb') || {}).textContent || ''));
        if (!(await pg.$('#pp-next'))) { await pg.click('#pp-check'); await pg.waitForSelector('#pp-next'); }
        if (shots && i === 0) await shot(pg, `${shots}-card-checked`);
      }
      await pg.click('#pp-next');
      if (!auto && i === cards.length - 1 && !(await pg.$('#s-h'))) await pg.click('#pp-next').catch(() => {});
    }
  }
  // 1. every card right (phone), with a reload in the middle
  let o = await openPage(b, file);
  let sw = await noSideways(o.page); if (sw) fail('game start ' + sw);
  await o.page.fill('#pp-name', 'Sam Test (made-up)');
  await shot(o.page, `${tag}-375-game-start`);
  await play(o.page, 'right', { reloadAt: Math.min(2, cards.length - 1), shots: `${tag}-375-game` });
  sw = await noSideways(o.page); if (sw) fail('game ' + sw);
  if (auto) {
    await o.page.waitForSelector('#pp-score');
    const pct = Number(await o.page.getAttribute('#pp-score', 'data-pct'));
    if (pct !== 100) fail(`every card right scored ${pct}%, not 100% (${(await o.page.textContent('.rlist')).slice(0, 300)})`);
    if ((await o.page.locator('[data-result="teacher"]').count()) !== cards.length - scored.length) fail('longer written answers are not all listed for the teacher');
    if ((await o.page.locator('.rwhy').count()) < 1) fail('no explanation shows after a right answer');
    await shot(o.page, `${tag}-375-game-results`);
    notes.push(`${p.name}: all right → ${pct}%`);
  } else {
    await o.page.waitForSelector('#s-h');
    const txt = await o.page.textContent('.sheet');
    if (!txt.includes('Sam Test (made-up)')) fail('the answer sheet has no name');
    if (await o.page.$('#pp-score, [data-result], .rwhy')) fail('print mode shows a score or right/wrong');
    if ((await o.page.locator('.sq').count()) !== cards.length) fail('the answer sheet does not list every card');
    if (/\(blank\)/.test(txt)) fail('an answered card shows as blank on the sheet');
    await shot(o.page, `${tag}-375-game-sheet`);
    notes.push(`${p.name}: answer sheet with ${await o.page.locator('.sq').count()} cards`);
  }
  await o.page.emulateMedia({ media: 'print' });
  if (await o.page.isVisible('#pp-print')) fail('the buttons show in print');
  await shot(o.page, `${tag}-375-game-${auto ? 'results' : 'sheet'}-print`);
  await o.page.emulateMedia({ media: 'screen' });
  ends(o, 'right'); await o.context.close();
  // 2. auto: every card wrong twice → 0%
  if (auto) {
    o = await openPage(b, file);
    await o.page.fill('#pp-name', 'Kim Test (made-up)');
    await play(o.page, 'wrong');
    await o.page.waitForSelector('#pp-score');
    const pct = Number(await o.page.getAttribute('#pp-score', 'data-pct'));
    if (pct !== 0) fail(`every card wrong scored ${pct}%, not 0%`);
    notes.push(`${p.name}: all wrong → ${pct}%`);
    ends(o, 'wrong'); await o.context.close();
  }
  // 3. class mode on a projector (1280): teams, "Reveal answer" with the class code (auto only), points to a team
  o = await openPage(b, file, { width: 1280, height: 800 });
  await o.page.click('#pp-class'); await o.page.waitForSelector('#pp-teams');
  await o.page.selectOption('#pp-teams', '3');
  if (auto) {
    await o.page.fill('#pp-code', 'WRONG1'); await o.page.click('#pp-cstart');
    await o.page.waitForFunction(() => /doesn't match/.test(document.getElementById('pp-err').textContent));
    await o.page.fill('#pp-code', classCode(pack, p.file).toLowerCase());
  } else if (await o.page.$('#pp-code')) fail('print mode asks for a class code');
  await o.page.click('#pp-cstart'); await o.page.waitForSelector('#pp-board');
  if ((await o.page.locator('#pp-board li').count()) !== 3) fail('class mode does not show 3 teams');
  const first = qs.get(cards[0].id);
  if (auto) {
    await o.page.click('#pp-reveal');
    await o.page.waitForSelector('.canswer');
    if (!(await o.page.textContent('#pp-answer')).includes(plainMath(keyText(first, p.ver)))) fail('"Reveal answer" does not show the key');
  } else if (await o.page.$('#pp-reveal')) fail('print mode has a "Reveal answer" button');
  await o.page.click('[data-team="1"]');
  if (!(await o.page.textContent('#pp-board')).includes(String(cards[0].pts))) fail('the points did not go to the team');
  await shot(o.page, `${tag}-1280-game-class`);
  for (let i = 0; i < cards.length; i++) await o.page.click('#pp-cnext');
  await o.page.waitForSelector('#pp-winner');
  if (!/Team 2 wins/.test(await o.page.textContent('#pp-winner'))) fail('the final scores do not name the winning team');
  await shot(o.page, `${tag}-1280-game-class-final`);
  notes.push(`${p.name}: class mode with 3 teams${auto ? ', reveal with the class code (a wrong code refused)' : ', no reveal'}`);
  ends(o, 'class mode'); await o.context.close();
  // 4. a computer screen with storage blocked
  o = await openPage(b, file, { width: 1280, height: 860, blockStorage: true });
  if (!(await o.page.textContent('#app')).includes('blocking saving')) fail('with storage blocked, no warning shows');
  await o.page.fill('#pp-name', 'Lee Test (made-up)');
  await play(o.page, 'right');
  await o.page.waitForSelector(auto ? '#pp-score' : '#s-h');
  if (auto && Number(await o.page.getAttribute('#pp-score', 'data-pct')) !== 100) fail('with storage blocked, every card right is not 100%');
  await shot(o.page, `${tag}-1280-game-${auto ? 'results' : 'sheet'}`);
  ends(o, 'storage blocked'); await o.context.close();
}

/* ---------- self-test: broken copies must fail ---------- */
async function selfTest() {
  const CAP = path.join(ROOT, 'samples/_cap-interactive/auto/pack.json');
  const good = loadPack(CAP);
  const cases = [];
  const auto = () => structuredClone(good), doc = (p) => p.documents[0];
  const tamper = async (what, fn, mode = 'auto', base = good) => {
    const p = structuredClone(base); doc(p).grading = mode;
    const [pg] = buildPages(p);
    const html = fn(pg.html, p);
    const errs = [...checkPage(p, doc(p), pg.ver, html), ...(await checkHashes(p, doc(p), pg.ver, html, pg.file))];
    cases.push([what, errs]);
  };
  const setData = (h, d) => h.replace(/window\.PPI_DATA=\{.*?\};<\/script>/s, `window.PPI_DATA=${JSON.stringify(d.data)};</script>`);
  const NOTES = loadPack(path.join(ROOT, 'samples/_cap-interactive/notes/pack.json')), GAME = loadPack(path.join(ROOT, 'samples/_cap-interactive/reviewgame/pack.json'));
  const packCase = async (what, fn) => { const p = auto(); fn(p); const r = await checkPack(p, null); cases.push([what, r.errors]); };
  await tamper('a fetch() call', (h) => h.replace('</body>', '<script>fetch("https://example.com/x")</script></body>'));
  await tamper('an outside image', (h) => h.replace('</main>', '<img src="https://example.com/t.png"></main>'));
  await tamper('a form that posts somewhere', (h) => h.replace('</main>', '<form action="https://example.com/"></form></main>'));
  await tamper('no Content-Security-Policy', (h) => h.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ''));
  await tamper('an explanation in plain text', (h, p) => h.replace('</main>', `<p>${vv(questions(doc(p))[0].why, 'A')}</p></main>`));
  await tamper('a numeric key in plain text', (h, p) => h.replace('</main>', `<p>${vv(questions(doc(p)).find((q) => q.type === 'numeric').accept, 'A')[1]}</p></main>`));
  await tamper('a hash that does not match the key', (h) => { const d = dataOf(h); const it = d.data.blocks.find((b) => b.t === 'q' && b.type === 'mc'); it.acc[0].h = it.acc[0].h.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')); return h.replace(/window\.PPI_DATA=\{.*?\};<\/script>/s, `window.PPI_DATA=${JSON.stringify(d.data)};</script>`); });
  await tamper('a wrong choice marked right', (h, p) => { const d = dataOf(h); const it = d.data.blocks.find((b) => b.t === 'q' && b.type === 'mc'); const q = questions(doc(p)).find((x) => x.id === it.id); const wrong = (Number(vv(q.answer, 'A')) + 1) % it.choices.length; it.acc.push({ h: crypto.createHash('sha256').update(`PPA1|${d.engine.salt}|${it.id}|opt:${wrong}`).digest('hex'), x: '' }); return h.replace(/window\.PPI_DATA=\{.*?\};<\/script>/s, `window.PPI_DATA=${JSON.stringify(d.data)};</script>`); });
  await tamper('a hash in a print page', (h) => h.replace('</main>', `<p data-k="${'ab'.repeat(32)}"></p></main>`), 'print');
  await tamper('answer data in a print page', (h) => { const d = dataOf(h); d.data.blocks.find((b) => b.t === 'q').acc = [{ h: 'x' }]; return h.replace(/window\.PPI_DATA=\{.*?\};<\/script>/s, `window.PPI_DATA=${JSON.stringify(d.data)};</script>`); }, 'print');
  // guided notes and review games
  await tamper('a notes blank whose hashes do not match the key', (h) => { const d = dataOf(h); const it = d.data.blocks.find((b) => b.type === 'fill'); it.blanks[0] = it.blanks[0].map((x) => x.replace(/^./, (c) => (c === 'a' ? 'b' : 'a'))); return setData(h, d); }, 'auto', NOTES);
  await tamper('a notes line whose combination hash does not match', (h) => { const d = dataOf(h); const it = d.data.blocks.find((b) => b.type === 'fill' && b.k > 1); it.acc = it.acc.slice(1); return setData(h, d); }, 'auto', NOTES);
  await tamper('a notes key in plain text', (h, p) => h.replace('</main>', `<p>${vv(questions(doc(p)).find((q) => q.id === 'n8').answer)}</p></main>`), 'auto', NOTES);
  await tamper('blank hashes in a print page of notes', (h) => { const d = dataOf(h); d.data.blocks.find((b) => b.type === 'fill').blanks = [['x']]; return setData(h, d); }, 'print', NOTES);
  await tamper('a short-word card whose key is not hashed', (h) => { const d = dataOf(h); const it = d.data.blocks.find((b) => b.words); delete it.acc; return setData(h, d); }, 'auto', GAME);
  await tamper('a game card that reveals with the wrong lock', (h) => { const d = dataOf(h); const its = d.data.blocks.filter((b) => b.t === 'q'); its[0].rv = its[1].rv; return setData(h, d); }, 'auto', GAME);
  await tamper('a class-code check that does not match the teacher copy', (h) => { const d = dataOf(h); d.data.tc = d.data.tc.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')); return setData(h, d); }, 'auto', GAME);
  await tamper('a reveal lock in a print page of a game', (h) => { const d = dataOf(h); d.data.blocks.find((b) => b.t === 'q').rv = 'AAAA'; return setData(h, d); }, 'print', GAME);
  await packCase('a notes line whose accepted form names the wrong number of blanks', (p) => { Object.assign(p, structuredClone(NOTES)); questions(doc(p)).find((q) => q.id === 'n8').accept.push('products right left'); });
  await packCase('grading missing', (p) => { delete doc(p).grading; });
  await packCase('a kind that cannot be interactive (slides)', (p) => { doc(p).item = 'slides'; });
  await packCase('an unreadable numeric key', (p) => { const q = questions(doc(p)).find((x) => x.type === 'numeric'); q.answer = { A: 'seventeen-ish', B: 'lots' }; q.accept = { A: [], B: [] }; });
  await packCase('a wrong-answer message on a right answer', (p) => { const q = questions(doc(p)).find((x) => x.type === 'mc'); q.miss = [{ answer: vv(q.answer, 'A'), why: 'no' }]; });
  let bad = 0;
  for (const [what, errs] of cases) {
    if (errs.length) console.log(`✓ catches ${what}: ${errs[0].slice(0, 110)}`);
    else { bad++; console.log(`✗ did not catch ${what}`); }
  }
  // and the good fixtures pass
  for (const g of ['auto', 'print', 'notes', 'reviewgame']) {
    const f = path.join(ROOT, `samples/_cap-interactive/${g}/pack.json`);
    const r = await checkPack(loadPack(f), null, { both: true });
    if (r.errors.length) { bad++; console.log(`✗ samples/_cap-interactive/${g} fails: ${r.errors.slice(0, 3).join(' | ')}`); } else console.log(`✓ samples/_cap-interactive/${g} passes in both grading modes`);
  }
  // the renderer's fixture, every question type (mc, tf, numeric, short, open, match), in both modes
  const fx = loadPack(path.join(ROOT, 'samples/_fixture/pack.json'));
  fx.documents.forEach((d) => { d.format = 'interactive'; d.grading = 'auto'; });
  const r = await checkPack(fx, null, { both: true });
  if (r.errors.length) { bad++; console.log(`✗ samples/_fixture made interactive fails: ${r.errors.slice(0, 3).join(' | ')}`); } else console.log(`✓ samples/_fixture made interactive (mc, tf, numeric, short, open, match) passes in both grading modes`);
  console.log(bad ? `\n${bad} self-test case(s) failed` : `\nSelf-test: all ${cases.length} broken copies caught; the fixtures pass`);
  return bad ? 1 : 0;
}

/* ---------- command line ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { flags, opt, files } = argsOf(process.argv);
  if (flags.has('--self-test')) process.exit(await selfTest());
  const shotsDir = opt('shots');
  if (!files.length) { console.error('usage: node checks/interactive-format.mjs <pack.json> [...] [--browser] [--both] [--shots <dir>] | --self-test'); process.exit(2); }
  let bad = 0;
  for (const f of files.filter((x) => x !== shotsDir)) {
    const pack = loadPack(f);
    if (!pack.documents.some(isInteractiveFormat)) { console.log(`${f}: no interactive documents: nothing to check`); continue; }
    const r = await checkPack(pack, path.dirname(path.resolve(f)), { both: flags.has('--both') });
    if (r.errors.length) { bad++; console.log(`✗ ${f}: ${r.errors.length} problem(s)`); r.errors.forEach((e) => console.log(`   ${e}`)); }
    else console.log(`✓ ${f}: ${r.pages.length} interactive page(s) self-contained, no plain-text key, every hash verifies${r.rendered ? ` (and ${r.rendered} rendered page(s) up to date)` : ''}`);
    if (flags.has('--browser') || shotsDir) {
      const br = await checkBrowser(r.pages, pack, { shotsDir });
      if (br.skipped) console.log(`⏭️  ${br.skipped}`);
      else if (br.errors.length) { bad++; console.log(`✗ browser: ${br.errors.length} problem(s)`); br.errors.forEach((e) => console.log(`   ${e}`)); }
      else { console.log(`✓ browser: ${br.notes.join('; ')}; no page errors, no outside requests, no sideways scroll at 375 px, works with storage blocked`); if (br.shots.length) console.log(`  ${br.shots.length} screenshots in ${shotsDir}`); }
    }
  }
  process.exit(bad ? 1 : 0);
}
