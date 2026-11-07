#!/usr/bin/env node
// The weekly test's deterministic part (docs/WEEKLY-TEST.md). No AI runs here.
//   node scripts/weekly-test.mjs [--out <dir>] [--seed N] [--quick] [--max-tokens 40]
//     1. the repo's own tests: npm run check, scripts/test-fetch-page.mjs, scripts/test-orders.mjs (--quick skips them);
//     2. imports every fixture in tests/weekly/sources/ the way the order page (site/feasibility.js) and the onboarding
//        agent (scripts/html-text.mjs) read it, and checks the text and counts against tests/weekly/sources/index.json;
//     3. reads every page in tests/weekly/links.json with the real fetchPage (scripts/fetch-page.mjs). Where this machine
//        has no direct internet, a link is "network blocked here" (no DNS, or the egress proxy refused CONNECT), which is
//        not a failure; a site's own answer (through the proxy when that's the only way out) is checked against `expect`;
//     4. picks 2 random orders (a menu item with its options, a compatible fixture, a made-up teacher) from a seed it
//        prints, never a pair the last run in tests/weekly/history.json used, and writes each as an order folder in the
//        docs/RUNBOOK.md layout (<out>/<order id>/in/order.json, sources/, training/), order.json filled as the order page does;
//     5. writes <out>/weekly-report.md and <out>/weekly-plan.json; exits 1 on any real failure.
//   node scripts/weekly-test.mjs --self-test            the fast part (2 and 4, offline, in a temporary folder): npm run check runs it
//   node scripts/weekly-test.mjs --publish <out> [--repo <dir>]
//     after the agent part: copies <out>/summary.md to docs/weekly/<date>.md, each order's audit report to
//     docs/weekly/<date>/AUDIT-<item>.pdf (and preview PDFs under 1 MB), updates docs/weekly/README.md (newest first)
//     and appends the run to tests/weekly/history.json. Refuses a summary that writes the product's name.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, dirname, basename, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { inflateSync, inflateRawSync } from 'node:zlib';
import { randomInt } from 'node:crypto';
import http from 'node:http';
import tls from 'node:tls';
import dns from 'node:dns';
import assert from 'node:assert/strict';
import '../site/feasibility.js';
import { htmlToText, wordCount } from './html-text.mjs';
import { fetchPage, PageError, USER_AGENT } from './fetch-page.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = join(ROOT, 'tests/weekly');
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const FEAS = globalThis.PPFeas;
const today = () => new Date().toISOString().slice(0, 10);

// ---------- arguments ----------
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const flag = (k) => argv.includes(k);

// ---------- a seeded random generator (mulberry32) ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickOf = (r, a) => a[Math.floor(r() * a.length)];
const intIn = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

// ---------- the product's name (never written in anything the weekly run commits) ----------
export function brandNameRe() {
  const b = readJSON(join(ROOT, 'brand.config.json'));
  const names = [...new Set([b.name, b.shortName].filter((n) => typeof n === 'string' && n.trim()))];
  return new RegExp(names.map((s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')).join('|'), 'i');
}

// ---------- 2. importing a source the way the order page and the onboarding agent do ----------
const TYPES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', html: 'text/html', htm: 'text/html', txt: 'text/plain', md: 'text/markdown' };
const extOf = (n) => (/\.([a-z0-9]+)$/i.exec(n) || [])[1]?.toLowerCase() || '';

function zipText(buf, re, para) {
  const bytes = new Uint8Array(buf);
  const entries = FEAS._test.zipEntries(bytes).filter((e) => re.test(e.name)).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return entries.map((e) => {
    const start = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
    const data = Buffer.from(bytes.subarray(start, start + e.size));
    const xml = (e.method === 8 ? inflateRawSync(data) : data).toString('utf8');
    return xml.replace(new RegExp(`</${para}>`, 'g'), '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  });
}
// The text layer of a PDF, roughly: every content stream (inflated when Flate), strings shown with Tj / TJ.
// Enough to tell a typed PDF from a scan; the agents read PDFs with their own tools.
function pdfText(buf) {
  const s = buf.toString('latin1'), out = [];
  let images = 0, fonts = 0;
  const re = /<<([\s\S]{0,600}?)>>\s*stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const dict = m[1], start = m.index + m[0].length, end = s.indexOf('endstream', start);
    if (end < 0) break;
    if (/\/Subtype\s*\/Image/.test(dict)) { images++; continue; }
    let data = buf.subarray(start, end);
    if (/\/FlateDecode/.test(dict)) { try { data = inflateSync(data); } catch { continue; } }
    const c = data.toString('latin1');
    for (const t of c.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:\\.|[^\]])*)\]\s*TJ/g)) {
      const raw = t[1] != null ? t[1] : (t[2].match(/\(((?:\\.|[^\\)])*)\)/g) || []).map((x) => x.slice(1, -1)).join('');
      out.push(raw.replace(/\\([()\\])/g, '$1'));
    }
  }
  fonts = (s.match(/\/Type\s*\/Font\b/g) || []).length;
  return { text: out.join('\n'), images, fonts };
}
const STANDARD_CODE = /^\s*(?:[A-Z]{1,4}[.-])?(?:\d{1,2}|K)[.-][A-Z]{1,4}(?:[.-][A-Z])?[.-]\d{1,2}[a-z]?\b/gm;
export const standardsIn = (t) => (String(t).match(STANDARD_CODE) || []).length;

export async function importFile(path) {
  const name = basename(path), buf = readFileSync(path), ext = extOf(name);
  const file = new File([buf], name, { type: TYPES[ext] || '' });
  const est = await FEAS.estimate(file, readJSON(join(ROOT, 'feasibility.json')).wordsPerPage);   // the order page's own estimate
  let text = '', extra = {};
  if (ext === 'html' || ext === 'htm') {
    text = htmlToText(buf.toString('utf8'));   // what the onboarding agent and the maker read (RUNBOOK step 1)
    extra.pageWords = FEAS._test.words(FEAS._test.htmlText(buf.toString('utf8')));
  } else if (['txt', 'md', 'markdown', 'csv'].includes(ext)) text = buf.toString('utf8');
  else if (ext === 'docx') text = zipText(buf, /^word\/document\.xml$/, 'w:p').join('\n');
  else if (ext === 'pptx') { const slides = zipText(buf, /^ppt\/slides\/slide\d+\.xml$/, 'a:p'); text = slides.join('\n'); extra.slides = slides.length; }
  else if (ext === 'pdf') { const p = pdfText(buf); text = p.text; extra.images = p.images; extra.fonts = p.fonts; }
  const words = wordCount(text);
  return { name, bytes: buf.length, method: est.method, pages: est.pages, detail: est.detail, words, text, standards: standardsIn(text),
    readable: words >= 20, ...extra };
}

// The order page's live feasibility record (site/order.js feasRecord), for made-up specs and sources.
export function feasRecord({ subject, items, specs, files }) {
  const fz = readJSON(join(ROOT, 'feasibility.json'));
  const rateFor = (id) => {
    const mpp = fz.mathPracticePerPage;
    if (mpp && subject === 'math' && (mpp.appliesTo || []).includes(id)) return { low: mpp.low, high: mpp.high, math: true };
    return { low: fz.questionsPerPage.low, high: fz.questionsPerPage.high };
  };
  const rows = items.filter((id) => FEAS.COUNTS_QUESTIONS[id]).map((id) => {
    const r = rateFor(id), q = FEAS.questionsFor(id, specs[id], fz.defaults[id]);
    return { id, n: q, qty: 1, rlow: r.low, rhigh: r.high, math: !!r.math };
  }).filter((r) => r.n > 0);
  const asked = rows.reduce((s, r) => s + r.n * r.qty, 0);
  const useOf = (key) => rows.reduce((s, r) => s + (r.n * r.qty) / r[key], 0);
  const known = files.filter((f) => f.pages != null).reduce((s, f) => s + f.pages, 0);
  const unknown = files.some((f) => f.pages == null);
  const sup = (key) => {
    if (!asked) { const r0 = rateFor('quiz'); return Math.max(1, Math.round(known * (key === 'rlow' ? r0.low : r0.high))); }
    return Math.max(1, Math.round((asked * known) / useOf(key)));
  };
  const low = known ? sup('rlow') : null, high = known ? sup('rhigh') : null;
  return {
    pagesEstimated: known ? Math.round(known * 10) / 10 : null,
    method: [...new Set(files.map((f) => f.method).filter((m) => m && m !== 'unknown'))].join('+') || 'none',
    files: files.map((f) => ({ name: f.name, pages: f.pages != null ? Math.round(f.pages * 10) / 10 : null, method: f.method })),
    askedPages: null, standards: null, asked, low, high, mathPractice: rows.some((r) => r.math),
    tooMany: high != null && asked > high, warned: high != null && asked > high, choice: null, ...(unknown ? { incomplete: true } : {}),
  };
}

// Checks one fixture against its `expect` (tests/weekly/sources/index.json). Returns a list of problems.
export function checkImport(fx, got) {
  const e = fx.expect || {}, bad = [];
  if (e.method && got.method !== e.method) bad.push(`method ${got.method}, expected ${e.method}`);
  if (e.pages && !(got.pages != null && got.pages >= e.pages[0] - 1e-9 && got.pages <= e.pages[1] + 1e-9)) bad.push(`pages ${got.pages}, expected ${e.pages[0]}–${e.pages[1]}`);
  if (e.readable === true && !got.readable) bad.push(`only ${got.words} words of text`);
  if (e.readable === false) {
    if (got.readable) bad.push(`expected no text layer (a scan), found ${got.words} words`);
    if (!got.images) bad.push('expected page images');
  }
  if (e.slides && got.slides !== e.slides) bad.push(`${got.slides} slides, expected ${e.slides}`);
  for (const s of e.mustNotContain || []) if (got.text.includes(s)) bad.push(`text still holds "${s}"`);
  if (e.standards && got.standards < e.standards) bad.push(`${got.standards} standard codes found, expected ${e.standards}`);
  if (!e.standards && got.standards >= 3 && fx.kind !== 'standards') bad.push(`${got.standards} standard codes in a source that isn't standards`);
  if (got.pageWords != null && got.words) {   // the order page's count and the agents' reader agree within 25%
    const ratio = got.pageWords / got.words;
    if (ratio < 0.75 || ratio > 1.33) bad.push(`order page counts ${got.pageWords} words, the text reader ${got.words}`);
  }
  if (got.readable && /�/.test(got.text)) bad.push('text has replacement characters (a decoding problem)');
  if (e.tooMany) {
    const fr = feasRecord({ subject: fx.subject, items: [e.tooMany.item], specs: { [e.tooMany.item]: { questions: e.tooMany.questions } }, files: [got] });
    if (!fr.tooMany) bad.push(`${e.tooMany.questions} questions for a ${e.tooMany.item} didn't raise the too-many warning (supports ${fr.low}–${fr.high})`);
  }
  return bad;
}

export async function importAll() {
  const idx = readJSON(join(W, 'sources/index.json')), rows = [];
  for (const fx of idx.fixtures) {
    const t0 = Date.now(), p = join(W, 'sources', fx.file);
    if (!existsSync(p)) { rows.push({ fx, problems: ['missing: run node tests/weekly/make-fixtures.mjs'], ms: 0 }); continue; }
    try {
      const got = await importFile(p);
      rows.push({ fx, got, problems: checkImport(fx, got), ms: Date.now() - t0 });
    } catch (e) { rows.push({ fx, problems: [`threw: ${e.message}`], ms: Date.now() - t0 }); }
  }
  for (const tr of idx.training) {
    const p = join(W, 'training', tr.file);
    const got = existsSync(p) ? await importFile(p) : null;
    rows.push({ fx: { file: 'training/' + tr.file, kind: 'style example' }, got, problems: got ? (got.readable ? [] : ['no text']) : ['missing'], ms: 0 });
  }
  return rows;
}

// ---------- 3. links ----------
let directNet;   // one probe: does this machine resolve public names at all?
async function directNetwork() {
  if (directNet !== undefined) return directNet;
  try { await Promise.race([dns.promises.lookup('example.com'), new Promise((_, j) => setTimeout(() => j(new Error('t')), 5000))]); directNet = true; } catch { directNet = false; }
  return directNet;
}
const proxyUrl = () => process.env.HTTPS_PROXY || process.env.https_proxy || '';
// CONNECT through the egress proxy: { connect: status } (a refusal: the network here, not the site), then over the tunnel
// one GET with the same user agent: the site's own status and type (redirects followed, at most 3).
function viaProxy(url, hops = 0) {
  return new Promise((done) => {
    const u = new URL(url), p = new URL(proxyUrl()), port = u.port || (u.protocol === 'https:' ? 443 : 80);
    const req = http.request({ host: p.hostname, port: p.port, method: 'CONNECT', path: `${u.hostname}:${port}`, timeout: 15000 });
    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); return done({ connect: res.statusCode }); }
      const extraCa = ['/root/.ccr/ca-bundle.crt', process.env.NODE_EXTRA_CA_CERTS].filter((f) => f && existsSync(f)).map((f) => readFileSync(f, 'utf8'));
      const s = u.protocol === 'https:' ? tls.connect({ socket, servername: u.hostname, ca: [...tls.rootCertificates, ...extraCa] }) : socket;
      let head = '';
      const finish = (r) => { s.destroy(); done(r); };
      s.setTimeout(15000, () => finish({ connect: 200, error: 'timeout' }));
      s.on('error', (e) => finish({ connect: 200, error: e.code || e.message }));
      s.on('data', (c) => {
        head += c.toString('latin1');
        const end = head.indexOf('\r\n\r\n');
        if (end < 0 && head.length < 65536) return;
        const lines = head.slice(0, end).split('\r\n'), status = Number((/^HTTP\/\S+\s+(\d+)/.exec(lines[0]) || [])[1]);
        const h = Object.fromEntries(lines.slice(1).map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]));
        s.destroy();
        if (status >= 300 && status < 400 && h.location && hops < 3) return viaProxy(new URL(h.location, u).href, hops + 1).then(done);
        done({ connect: 200, status, type: h['content-type'] || '' });
      });
      const send = () => s.write(`GET ${u.pathname + u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUser-Agent: ${USER_AGENT}\r\nAccept: text/html,application/xhtml+xml,text/plain;q=0.9\r\nAccept-Language: en\r\nConnection: close\r\n\r\n`);
      if (u.protocol === 'https:') s.on('secureConnect', send); else send();
    });
    req.on('timeout', () => { req.destroy(); done({ connect: 0, error: 'proxy timeout' }); });
    req.on('error', (e) => done({ connect: 0, error: e.code || e.message }));
    req.end();
  });
}
// A site's answer, in fetchPage's words (scripts/fetch-page.mjs).
function codeOfStatus(status, type) {
  if ([401, 402, 403, 407, 429, 451].includes(status)) return 'blocked';
  if (status === 404 || status === 410) return 'missing';
  if (status >= 400) return 'upstream';
  if (type && !/^(text\/html|application\/xhtml\+xml|text\/plain)\b/i.test(type)) return 'notPage';
  return 'ok';
}
const CODE = { denied: 'blocked', missing: 'missing', notPage: 'notPage', notText: 'notPage', upstream: 'upstream', empty: 'empty', tooBig: 'tooBig', redirects: 'redirects' };

export async function tryLink(link) {
  const want = [].concat(link.expect);
  const t0 = Date.now();
  let got, how = 'fetchPage', detail = '';
  try {
    const page = await fetchPage(link.url, { log: () => {}, timeoutMs: 15000 });
    got = 'ok'; detail = `${page.words} words, “${page.title.slice(0, 60)}”`;
    if (link.minWords && page.words < link.minWords) { got = 'empty'; detail += ` (expected at least ${link.minWords})`; }
  } catch (e) {
    const code = e instanceof PageError ? e.code : 'failed';
    if (CODE[code]) { got = CODE[code]; detail = e.message; }
    if (got === 'blocked' && proxyUrl()) {
      // a 403 can be the egress proxy, not the site: if the proxy refuses CONNECT to this host, it's the network here
      const p = await viaProxy(link.url);
      if (p.connect !== 200) return { link, result: 'blocked-here', detail: `network blocked here: refused (${code}), and the egress proxy refuses CONNECT to this host (${p.connect || p.error})`, ms: Date.now() - t0 };
    } else if (!got && ['dns', 'failed', 'timeout'].includes(code)) {
      // the network or the site? Ask the egress proxy if there is one; without one, check that this machine resolves names at all.
      if (proxyUrl()) {
        const p = await viaProxy(link.url);
        if (p.connect !== 200) return { link, result: 'blocked-here', detail: `network blocked here: fetchPage got "${code}"; the egress proxy refused CONNECT (${p.connect || p.error})`, ms: Date.now() - t0 };
        if (p.error) return { link, result: 'blocked-here', detail: `network blocked here: fetchPage got "${code}"; the proxy tunnel opened, then ${p.error}`, ms: Date.now() - t0 };
        how = 'proxy'; got = codeOfStatus(p.status, p.type); detail = `fetchPage got "${code}" (no direct route here); through the proxy the site answered ${p.status} ${p.type.split(';')[0]}`;
      } else if (!(await directNetwork())) return { link, result: 'blocked-here', detail: `network blocked here: fetchPage got "${code}", no proxy, and no direct DNS`, ms: Date.now() - t0 };
      else if (code === 'timeout') return { link, result: 'warn', detail: 'timed out (15 s): try again next week', ms: Date.now() - t0 };
      else { got = code; detail = e.message; }
    } else if (!got) { got = code; detail = e.message; }
  }
  // Through the proxy, a 4xx may be the proxy's own answer (it can stand in for a site), so a mismatch there is a warning.
  const result = want.includes(got) ? 'pass' : how === 'proxy' ? 'warn' : 'fail';
  return { link, how, got, result, detail: (detail || got) + (result === 'warn' ? ' (through the proxy: maybe the proxy\'s answer, not the site\'s)' : ''), ms: Date.now() - t0 };
}

// ---------- 4. the random orders ----------
const TEACHERS = ['Ms. Harrow-Bates', 'Mr. Okwuosa', 'Mrs. Lindgren-Paz', 'Mr. Tavita', 'Ms. Quenneville', 'Mr. Desrosiers-Kahn', 'Mrs. Ito-Barrett', 'Ms. Ferreira-Long'];
const REQUESTS = {
  worksheet: ['Easiest first, please, with room to show work.', 'Use examples from everyday life.', 'Keep directions short.'],
  notes: ['Leave blanks for the key words only.', 'One page per big idea, please.'],
  quiz: ['Version B should be just as hard as A.', 'Mostly multiple choice, please.'],
  studyguide: ['Something they can study from the night before.', 'Put the vocabulary first.'],
  reviewgame: ['For the Friday before the test.', 'Teams of four.'],
  rubric: ['For a short poster or paragraph about this topic.', 'Four levels, student-friendly words.'],
  bellringer: ['One a day for two weeks.', 'Short enough for five minutes.'],
  homework: ['About fifteen minutes of work.', 'Nothing that needs a computer.'],
  versions: ['Keep the same point values.', 'Same difficulty, different numbers.'],
  quizshow: ['Keep it small: about 3 categories with 3 questions each.', 'For the last ten minutes of class.'],
  crossword: ['About 10 words.', 'Use the key vocabulary.'],
  wordsearch: ['About 10 words, not too hard to find.', 'Use the key vocabulary.'],
  logicpuzzle: ['One or two short puzzles.', 'Easy enough for the whole class.'],
};

// Every (item, fixture) pair the menu and the fixtures allow, at most maxTokens tokens (the per-order dollar cap at
// $0.10 a token: docs/WEEKLY-TEST.md).
export function eligiblePairs(menu, fixtures, maxTokens) {
  const pairs = [];
  for (const it of menu.items) {
    if (it.tokens > maxTokens) continue;
    for (const fx of fixtures) {
      if (!fx.pickable) continue;
      if ((it.id === 'versions') !== (fx.kind === 'oldtest')) continue;    // versions needs an old test, and an old test is only for versions
      if (it.id === 'readingquiz' && fx.subject !== 'ela') continue;
      if ((it.id === 'crossword' || it.id === 'wordsearch') && !fx.vocab) continue;
      pairs.push({ item: it.id, source: fx.file });
    }
  }
  return pairs;
}
const pairKey = (p) => `${p.item}|${p.source}`;
export function lastPairs(history) {
  const runs = (history && history.runs) || [];
  const last = runs[runs.length - 1];
  return new Set(last ? last.orders.map(pairKey) : []);
}

// The specs a teacher might type (site/feasibility.js SPECS), kept small for the weekly budget.
function specsFor(r, id, fz, fx) {
  const d = fz.defaults[id] || {}, l = fz.limits[id] || {}, spec = {};
  const fields = (FEAS.SPECS[id] || []).map((f) => f.key);
  if (fields.includes('questions') && l.questions) {
    const hi = Math.min(d.questions || l.questions[1], l.questions[0] + 8);
    spec.questions = intIn(r, Math.min(l.questions[0] + 1, hi), hi);
  }
  if (fields.includes('versions')) spec.versions = id === 'versions' ? 2 : (r() < 0.75 ? 2 : 1);
  if (fields.includes('file')) spec.file = fx.file;
  if (fields.includes('pages') && l.pages) spec.pages = intIn(r, l.pages[0], Math.min(2, l.pages[1]));
  return spec;
}

export function pickOrders({ seed, menu, fixtures, history, maxTokens = 40, n = 2, date = today() }) {
  const r = rng(seed), fz = readJSON(join(ROOT, 'feasibility.json'));
  const avoid = lastPairs(history);
  let pool = eligiblePairs(menu, fixtures, maxTokens).filter((p) => !avoid.has(pairKey(p)));
  const chosen = [];
  while (chosen.length < n && pool.length) {
    const subjects = new Set(chosen.map((c) => fixtures.find((f) => f.file === c.source).subject));
    const fresh = pool.filter((p) => !subjects.has(fixtures.find((f) => f.file === p.source).subject));   // vary the subject when we can
    const p = pickOf(r, fresh.length ? fresh : pool);
    chosen.push(p);
    pool = pool.filter((q) => q.item !== p.item && q.source !== p.source);
  }
  const idx = readJSON(join(W, 'sources/index.json'));
  return chosen.map((p, i) => {
    const fx = fixtures.find((f) => f.file === p.source), it = menu.items.find((x) => x.id === p.item);
    const teacher = pickOf(r, TEACHERS), hex = Math.floor(r() * 0xffffff).toString(16).padStart(6, '0');
    const style = pickOf(r, idx.training);
    const spec = specsFor(r, p.item, fz, fx);
    const req = pickOf(r, REQUESTS[p.item] || ['Please keep it short.']);
    return { id: `pp-${date}-wk${i + 1}${hex}`, item: p.item, label: it.label, tokens: it.tokens, fixture: fx, teacher, style: style.file, spec, req };
  });
}

// The onboarding spot check (docs/WEEKLY-TEST.md, step 4): one of the sources that should make the onboarding agent warn
// (a scan it can't read, a reader far longer than the order needs, a note too small for the questions asked), on its
// own order. Only the onboarding agent runs on it (about $0.35): nothing is made.
export function pickSpotCheck({ seed, menu, fixtures, date = today() }) {
  const r = rng(seed + 7919), fz = readJSON(join(ROOT, 'feasibility.json'));
  const fx = pickOf(r, fixtures.filter((f) => f.expect && f.expect.onboarding));
  if (!fx) return null;
  const item = fx.expect.tooMany ? fx.expect.tooMany.item : 'quiz', it = menu.items.find((x) => x.id === item);
  const spec = fx.expect.tooMany ? { questions: fx.expect.tooMany.questions } : { questions: fz.defaults[item].questions, versions: 2 };
  const hex = Math.floor(r() * 0xffffff).toString(16).padStart(6, '0');
  return { id: `pp-${date}-spot${hex}`, item, label: it.label, tokens: it.tokens, fixture: fx, teacher: pickOf(r, TEACHERS), style: 'past-quiz-ten-questions.md', spec, req: 'Please use all of it.', expectOnboarding: fx.expect.onboarding };
}

// order.json as the order page writes it (site/order.js, the submit handler).
export function orderJson(o, menu, brand, files) {
  const fx = o.fixture, extras = menu.extras.filter((x) => x.id === 'styleSetup');
  const lines = [{ id: o.item, label: o.label, quantity: 1, tokensEach: o.tokens, tokens: o.tokens }]
    .concat(extras.map((x) => ({ id: x.id, label: x.label, quantity: 1, tokensEach: x.tokens || 0, tokens: x.tokens || 0, extra: true })));
  return {
    format: 1,
    id: o.id,
    createdAt: new Date().toISOString(),
    order: {
      teacher: `${o.teacher} (made-up, weekly test)`,
      grade: fx.grade,
      subject: fx.subject,
      topic: fx.topic,
      items: [o.item],
      extras: extras.map((x) => x.id),
      requests: 'Weekly test order: made-up teacher and material.',
      itemRequests: { [o.item]: o.req },
      quantities: { [o.item]: 1 },
      itemSpecs: Object.keys(o.spec).length ? { [o.item]: o.spec } : {},
      feasibility: feasRecord({ subject: fx.subject, items: [o.item], specs: { [o.item]: o.spec }, files }),
      sources: [fx.file],
      styleExamples: [o.style],
    },
    lines,
    tokenTotal: lines.reduce((s, l) => s + l.tokens, 0),
    replyTo: 'weekly-test@example.com',
    notices: { tokenNote: brand.tokenNote || '', aiNotice: brand.aiNotice || '', deleteNotice: brand.deleteNotice || '' },
  };
}

export async function writeOrders(orders, out) {
  const menu = readJSON(join(ROOT, 'menu.json')), brand = readJSON(join(ROOT, 'brand.config.json'));
  const written = [];
  for (const o of orders) {
    const dir = join(out, o.id, 'in');
    mkdirSync(join(dir, 'sources'), { recursive: true }); mkdirSync(join(dir, 'training'), { recursive: true });
    copyFileSync(join(W, 'sources', o.fixture.file), join(dir, 'sources', o.fixture.file));
    copyFileSync(join(W, 'training', o.style), join(dir, 'training', o.style));
    const got = await importFile(join(dir, 'sources', o.fixture.file));
    const oj = orderJson(o, menu, brand, [got]);
    writeFileSync(join(dir, 'order.json'), JSON.stringify(oj, null, 2) + '\n');
    written.push({ o, oj, dir: join(out, o.id) });
  }
  return written;
}
// The order folder must look like one the order page sends (RUNBOOK step 1: "check order.json against menu.json").
export function checkOrderFolder(dir, menu) {
  const oj = readJSON(join(dir, 'in/order.json')), bad = [], ids = menu.items.map((i) => i.id);
  for (const k of ['format', 'id', 'createdAt', 'order', 'lines', 'tokenTotal', 'replyTo', 'notices']) if (oj[k] === undefined) bad.push(`no ${k}`);
  const o = oj.order || {};
  if (!menu.grades.includes(o.grade)) bad.push(`grade ${o.grade} not in the menu`);
  if (!menu.subjects.some((s) => s.id === o.subject)) bad.push(`subject ${o.subject} not in the menu`);
  for (const id of o.items || []) if (!ids.includes(id)) bad.push(`item ${id} not in the menu`);
  if (oj.tokenTotal !== oj.lines.reduce((s, l) => s + l.tokens, 0)) bad.push('tokenTotal is not the sum of the lines');
  for (const l of oj.lines) { const it = [...menu.items, ...menu.extras].find((x) => x.id === l.id); if (!it || it.tokens !== l.tokensEach) bad.push(`line ${l.id}: tokens don't match the menu`); }
  for (const f of o.sources || []) if (!existsSync(join(dir, 'in/sources', f))) bad.push(`source ${f} missing`);
  for (const f of o.styleExamples || []) if (!existsSync(join(dir, 'in/training', f))) bad.push(`style example ${f} missing`);
  if (!/made-up/.test(o.teacher || '')) bad.push('teacher is not marked made-up');
  const fz = readJSON(join(ROOT, 'feasibility.json'));
  for (const [id, sp] of Object.entries(o.itemSpecs || {})) for (const [k, v] of Object.entries(sp)) {
    const lim = fz.limits[id] && fz.limits[id][k];
    if (lim && typeof v === 'number' && (v < lim[0] || v > lim[1])) bad.push(`${id}.${k} = ${v} outside ${lim}`);
  }
  return bad;
}

// ---------- 1. the repo's own tests ----------
function runStep(name, cmd, args, okWhen) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0' } });
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = r.status === 0 && (!okWhen || okWhen.test(out));
  const tail = out.trim().split('\n').filter((l) => /✗|Error|FAIL|fail/i.test(l)).slice(0, 5).join(' / ') || out.trim().split('\n').slice(-1)[0] || '';
  return { name, result: pass ? 'pass' : 'fail', detail: pass ? (out.trim().split('\n').slice(-1)[0] || 'ok').slice(0, 160) : `exit ${r.status}: ${tail.slice(0, 300)}`, ms: Date.now() - t0 };
}

// ---------- the report ----------
const secs = (ms) => (ms / 1000).toFixed(1) + ' s';
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const MARK = { pass: 'PASS', fail: 'FAIL', 'blocked-here': 'network blocked here', warn: 'warn', skip: 'skipped' };

async function run() {
  const date = arg('--date', today());
  const out = resolve(arg('--out', join(homedir(), 'pp-weekly', date)));
  if (!relative(ROOT, out).startsWith('..') && relative(ROOT, out) !== out) { console.error(`--out must be outside the repository (${out})`); process.exit(2); }
  const seed = argv.includes('--seed') ? Number(arg('--seed')) : randomInt(1, 2 ** 31 - 1);
  const maxTokens = Number(arg('--max-tokens', 40));
  mkdirSync(out, { recursive: true });
  const started = Date.now(), steps = [];
  console.log(`weekly test ${date}, seed ${seed}, out ${out}`);

  if (flag('--quick')) steps.push({ name: 'repo tests', result: 'skip', detail: '--quick', ms: 0 });
  else {
    for (const [name, cmd, args, re] of [['npm run check', 'npm', ['run', 'check'], /All checks pass/], ['scripts/test-fetch-page.mjs', 'node', ['scripts/test-fetch-page.mjs']], ['scripts/test-orders.mjs', 'node', ['scripts/test-orders.mjs']]]) {
      process.stdout.write(`… ${name}\n`);
      const s = runStep(name, cmd, args, re); steps.push(s); console.log(`  ${MARK[s.result]} (${secs(s.ms)})`);
    }
  }

  const imports = await importAll();
  for (const r of imports) console.log(`  import ${r.fx.file}: ${r.problems.length ? 'FAIL ' + r.problems.join('; ') : 'ok'}`);

  const links = readJSON(join(W, 'links.json')).links, linkRows = [];
  for (const l of links) { const r = await tryLink(l); linkRows.push(r); console.log(`  link ${l.url}: ${MARK[r.result]} ${r.detail}`); }

  const menu = readJSON(join(ROOT, 'menu.json')), idx = readJSON(join(W, 'sources/index.json'));
  const histPath = join(W, 'history.json'), history = existsSync(histPath) ? readJSON(histPath) : { runs: [] };
  const orders = pickOrders({ seed, menu, fixtures: idx.fixtures, history, maxTokens, date });
  const written = await writeOrders(orders, out);
  const orderRows = written.map((w) => ({ ...w, problems: checkOrderFolder(w.dir, menu) }));
  const spot = pickSpotCheck({ seed, menu, fixtures: idx.fixtures, date });
  const spotW = spot ? (await writeOrders([spot], join(out, 'spot-check')))[0] : null;
  if (spotW) orderRows.push({ ...spotW, spot: true, problems: checkOrderFolder(spotW.dir, menu) });
  if (orders.length < 2) orderRows.push({ problems: [`only ${orders.length} order(s) could be picked`] });

  const plan = {
    date, seed, maxTokens, capPerOrderUsd: 4, capPerRunUsd: 10,
    replay: `node scripts/weekly-test.mjs --seed ${seed} --out ${out}`,
    orders: written.map(({ o, oj, dir }) => ({
      id: o.id, folder: dir, item: o.item, label: o.label, source: o.fixture.file, grade: o.fixture.grade, subject: o.fixture.subject,
      checker: (menu.subjects.find((s) => s.id === o.fixture.subject) || {}).checker, tokens: oj.tokenTotal, budgetUsd: oj.tokenTotal * 0.1,
      teacher: oj.order.teacher, styleExample: o.style, specs: oj.order.itemSpecs[o.item] || {}, request: o.req,
    })),
    spotCheck: spotW ? { id: spot.id, folder: spotW.dir, item: spot.item, source: spot.fixture.file, specs: spot.spec, expectOnboarding: spot.expectOnboarding,
      pageSaid: { tooMany: spotW.oj.order.feasibility.tooMany, low: spotW.oj.order.feasibility.low, high: spotW.oj.order.feasibility.high } } : null,
  };
  writeFileSync(join(out, 'weekly-plan.json'), JSON.stringify(plan, null, 2) + '\n');

  const fails = steps.filter((s) => s.result === 'fail').length + imports.filter((r) => r.problems.length).length +
    linkRows.filter((r) => r.result === 'fail').length + orderRows.filter((r) => r.problems.length).length;
  const L = [];
  L.push(`# Weekly test: ${date}`, '', `**Result: ${fails ? `FAIL (${fails} problem${fails > 1 ? 's' : ''})` : 'PASS'}** (deterministic part; the agent part follows docs/WEEKLY-TEST.md)`, '',
    `Seed **${seed}** (replay: \`${plan.replay}\`). Total ${secs(Date.now() - started)}. Machine: direct internet ${(await directNetwork()) ? 'yes' : 'no'}${proxyUrl() ? ', an egress proxy' : ''}.`, '');
  L.push('## 1. Repo tests', '', '| Step | Result | Time | Detail |', '|---|---|---|---|');
  for (const s of steps) L.push(`| ${cell(s.name)} | ${MARK[s.result]} | ${secs(s.ms)} | ${cell(s.detail)} |`);
  L.push('', '## 2. Importing the fixtures (order page estimate, text reader)', '', '| File | Kind | Method | Pages | Words | Std codes | Result |', '|---|---|---|---|---|---|---|');
  for (const r of imports) {
    const g = r.got || {};
    L.push(`| ${cell(r.fx.file)} | ${r.fx.kind} | ${g.method || ''} | ${g.pages != null ? Math.round(g.pages * 10) / 10 : '?'} | ${g.words ?? ''} | ${g.standards ?? ''} | ${r.problems.length ? 'FAIL: ' + cell(r.problems.join('; ')) : 'PASS'} |`);
  }
  L.push('', '## 3. Links (the real fetchPage)', '', '| Address | Expected | Got | Result | Time | Detail |', '|---|---|---|---|---|---|');
  for (const r of linkRows) L.push(`| ${cell(r.link.url)} | ${[].concat(r.link.expect).join(' or ')} | ${r.got || ''} | ${MARK[r.result]} | ${secs(r.ms)} | ${cell(r.detail)} |`);
  L.push('', '"network blocked here" is this machine (no direct DNS, or the egress proxy refused the host), not the site: not a failure.', '');
  L.push('## 4. The two orders for the agent team, and the onboarding spot check', '', '| Order | Item | Source | Grade, subject | Specs | Tokens (budget) | Folder check |', '|---|---|---|---|---|---|---|');
  for (const r of orderRows) {
    if (!r.o) { L.push(`| — | — | — | — | — | — | FAIL: ${cell(r.problems.join('; '))} |`); continue; }
    if (r.spot) { L.push(`| ${r.o.id} (onboarding spot check: expect ${cell(r.o.expectOnboarding)}) | ${r.o.item} | ${cell(r.o.fixture.file)} | ${r.o.fixture.grade}, ${r.o.fixture.subject} | ${cell(JSON.stringify(r.o.spec))} | onboarding only (~$0.35) | ${r.problems.length ? 'FAIL: ' + cell(r.problems.join('; ')) : 'PASS'} |`); continue; }
    L.push(`| ${r.o.id} | ${r.o.item} | ${cell(r.o.fixture.file)} | ${r.o.fixture.grade}, ${r.o.fixture.subject} | ${cell(JSON.stringify(r.oj.order.itemSpecs[r.o.item] || {}))} | ${r.oj.tokenTotal} ($${(r.oj.tokenTotal * 0.1).toFixed(2)}) | ${r.problems.length ? 'FAIL: ' + cell(r.problems.join('; ')) : 'PASS'} |`);
  }
  L.push('', `Order folders: \`${out}/<order id>/in/\` (order.json, sources/, training/); the spot check's under \`${out}/spot-check/\`. Plan: \`${join(out, 'weekly-plan.json')}\`.`, '');
  writeFileSync(join(out, 'weekly-report.md'), L.join('\n') + '\n');
  console.log(`\n${fails ? 'FAIL' : 'PASS'}: ${fails} problem(s). Report: ${join(out, 'weekly-report.md')}`);
  process.exit(fails ? 1 : 0);
}

// ---------- --self-test: the offline parts, fast (npm run check) ----------
async function selfTest() {
  const t0 = Date.now();
  const imports = await importAll();
  const bad = imports.filter((r) => r.problems.length);
  assert.equal(bad.length, 0, bad.map((r) => `${r.fx.file}: ${r.problems.join('; ')}`).join('\n'));
  const idx = readJSON(join(W, 'sources/index.json')), menu = readJSON(join(ROOT, 'menu.json'));
  const kinds = new Set(idx.fixtures.map((f) => extOf(f.file)));
  for (const e of ['docx', 'pdf', 'pptx', 'txt', 'md', 'html']) assert.ok(kinds.has(e), `no .${e} fixture`);
  const empty = { runs: [] };
  const a = pickOrders({ seed: 1, menu, fixtures: idx.fixtures, history: empty, date: '2026-01-04' });
  const b = pickOrders({ seed: 1, menu, fixtures: idx.fixtures, history: empty, date: '2026-01-04' });
  assert.deepEqual(a.map((o) => [o.id, o.item, o.fixture.file]), b.map((o) => [o.id, o.item, o.fixture.file]), 'the same seed must give the same orders');
  assert.equal(a.length, 2);
  assert.notEqual(a[0].item, a[1].item); assert.notEqual(a[0].fixture.file, a[1].fixture.file);
  for (const o of a) assert.ok(menu.items.find((i) => i.id === o.item).tokens <= 40, `${o.item} is over the weekly cap`);
  // never last run's pairs: every seed for a while, against a history that used seed 1's
  const hist = { runs: [{ date: '2026-01-04', seed: 1, orders: a.map((o) => ({ item: o.item, source: o.fixture.file })) }] };
  for (let s = 1; s <= 200; s++) {
    const c = pickOrders({ seed: s, menu, fixtures: idx.fixtures, history: hist });
    for (const o of c) assert.ok(!hist.runs[0].orders.some((p) => p.item === o.item && p.source === o.fixture.file), `seed ${s} repeated last run's pair`);
    for (const o of c) assert.ok(eligiblePairs(menu, idx.fixtures, 40).some((p) => p.item === o.item && p.source === o.fixture.file), `seed ${s}: an ineligible pair`);
  }
  const tmp = mkdtempSync(join(tmpdir(), 'pp-weekly-self-'));
  try {
    const w = await writeOrders(a, tmp);
    for (const x of w) assert.deepEqual(checkOrderFolder(x.dir, menu), [], x.dir);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  const sp = pickSpotCheck({ seed: 1, menu, fixtures: idx.fixtures, date: '2026-01-04' });
  assert.ok(sp && sp.expectOnboarding, 'no onboarding spot check');
  for (let s = 1; s <= 30; s++) assert.ok(pickSpotCheck({ seed: s, menu, fixtures: idx.fixtures }).fixture.pickable === false);
  assert.ok(brandNameRe().test(readJSON(join(ROOT, 'brand.config.json')).name));
  const links = readJSON(join(W, 'links.json')).links;
  assert.ok(links.length >= 6 && links.length <= 10, 'links.json needs 6–10 links');
  for (const l of links) assert.ok(l.url && l.kind && l.expect, `link ${JSON.stringify(l)} needs url, kind and expect`);
  console.log(`weekly-test self-test: ${imports.length} fixtures import as expected, the picker is repeatable and skips last week's pairs, order folders valid (${secs(Date.now() - t0)})`);
}

// ---------- --publish: the weekly run's report into the repo (docs/WEEKLY-TEST.md, the last step) ----------
function publish() {
  const runDir = resolve(arg('--publish')), repo = resolve(arg('--repo', ROOT));
  const plan = readJSON(join(runDir, 'weekly-plan.json')), date = plan.date;
  const summaryPath = join(runDir, 'summary.md');
  if (!existsSync(summaryPath)) { console.error(`write ${summaryPath} first (the same summary as the reply to the owner)`); process.exit(1); }
  const summary = readFileSync(summaryPath, 'utf8'), nameRe = brandNameRe();
  const hits = summary.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => nameRe.test(l));
  if (hits.length) { console.error(`summary.md names the product on line(s) ${hits.map((h) => h[0]).join(', ')}: write "the product" instead`); process.exit(1); }
  const docs = join(repo, 'docs/weekly'), dayDir = join(docs, date), added = [];
  mkdirSync(dayDir, { recursive: true });
  writeFileSync(join(docs, `${date}.md`), summary); added.push(`docs/weekly/${date}.md`);
  for (const o of plan.orders) {
    const prev = join(o.folder, 'out-preview');
    if (!existsSync(prev)) { console.log(`  ${o.id}: no out-preview/ (the agent part didn't reach the preview): nothing to copy`); continue; }
    for (const f of readdirSync(prev).filter((x) => x.endsWith('.pdf'))) {
      const audit = f === 'AUDIT-REPORT.pdf', size = statSync(join(prev, f)).size;
      if (!audit && size > 1024 * 1024) { console.log(`  skipped ${f} (${(size / 1048576).toFixed(1)} MB, over 1 MB)`); continue; }
      const name = audit ? `AUDIT-${o.item}.pdf` : `${o.item}-${f}`;
      copyFileSync(join(prev, f), join(dayDir, name)); added.push(`docs/weekly/${date}/${name}`);
    }
  }
  // the index, newest first
  const idxPath = join(docs, 'README.md');
  const head = '# Weekly test reports\n\nOne report per Sunday-night run (docs/WEEKLY-TEST.md), newest first. Each links its audit reports in the dated folder.\n\n';
  const old = existsSync(idxPath) ? readFileSync(idxPath, 'utf8').split('\n').filter((l) => /^- \[\d{4}-\d{2}-\d{2}\]/.test(l) && !l.startsWith(`- [${date}]`)) : [];
  const result = (/\*\*Result:?\*\*:?\s*([^\n]+)|\*\*Result:\s*([^*\n]+)\*\*/.exec(summary) || []).slice(1).find(Boolean) || '';
  const items = plan.orders.map((o) => `${o.item} (${o.subject}, grade ${o.grade})`).join(', ');
  const line = `- [${date}](${date}.md): ${result.trim() || 'see report'}; ${items}; seed ${plan.seed}`;
  writeFileSync(idxPath, head + [line, ...old].sort().reverse().join('\n') + '\n'); added.push('docs/weekly/README.md');
  // history: what this run picked, so next week's picker avoids the same pairs
  const hp = join(repo, 'tests/weekly/history.json'), hist = existsSync(hp) ? readJSON(hp) : { runs: [] };
  hist.runs = hist.runs.filter((r) => r.date !== date);
  hist.runs.push({ date, seed: plan.seed, orders: plan.orders.map((o) => ({ item: o.item, source: o.source })), result: result.trim() || null });
  hist.runs.sort((x, y) => x.date.localeCompare(y.date));
  writeFileSync(hp, JSON.stringify(hist, null, 2) + '\n'); added.push('tests/weekly/history.json');
  console.log(`published ${date}. Commit only these paths:\n  git add ${['docs/weekly/' + date + '.md', 'docs/weekly/' + date + '/', 'docs/weekly/README.md', 'tests/weekly/history.json'].join(' ')}`);
  for (const a of added) console.log('  ' + a);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (flag('--self-test')) await selfTest().catch((e) => { console.error('✗ weekly-test self-test: ' + e.message); process.exit(1); });
  else if (argv.includes('--publish')) publish();
  else await run();
}
