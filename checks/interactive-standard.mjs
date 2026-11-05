#!/usr/bin/env node
/* The interactive assignment standard gate (docs/INTERACTIVE-STANDARD.md, rule K1).

     node checks/interactive-standard.mjs <pack-folder | student.html | folder of pages>
          [--teacher <teacher.html | folder>] [--blanks <inventory.json>] [--json <out.json>] [--rules L2,Q2a,...]
          [--dump <folder>] [--doc <title or slug>]

   Written by an independent checker from the standard and what a student sees. It never reads the engine's code or
   the build's internals: a pack folder is rendered with the renderer's command line (a preview, then a checker's
   agreement made from the preview's own REVIEW.html in a temporary copy, then the final), and the pages are then
   only opened, read and clicked like a student or teacher would.

   Inputs
     - a pack folder (with pack.json): every document of kind `interactive` (or any `interactive-*` kind) is one
       assignment: the student page is out/<doc>.html and the teacher copy out/<doc>-solutions.html. The pack is used
       only for answers to type (Q4) and to see whether choices were shuffled (Q2).
     - one HTML file: one lesson page (add --teacher for its teacher copy).
     - a folder of pages (a unit of note sheets): every *.html except index.html and *notes*.html is a lesson page;
       *notes*.html is the My notes page; index.html is the hub. --teacher <folder> holds teacher copies with the same
       file names.
     - --blanks: a source blank inventory, [{"text": "the sentence with ___ for the blank", "page": "station-1.html"?}]
       (L6). Without it L6 is CANNOT TEST.

   How it looks: every page is served from a made-up origin (http://pp-check.test/) into a sandboxed <iframe> (scripts,
   same origin, forms, downloads, modals) at 1280 px and 375 px. Every other request is aborted and counted. The page
   clock is controlled (Playwright's clock), so the waits after a miss are measured without really waiting. Storage
   blocked = the same iframe without allow-same-origin (every storage call throws). D2 uses a srcdoc frame, the way a
   viewer embeds a page.

   Numbers this gate uses (the standard says "about"; these are the exact lines, never loosened to make output pass):
     Q2a  no 3 items in a row with the right answer in the same display slot (items in page order, all choice items).
     Q2b  no cycle of length 2, 3 or 4 that repeats twice in a row (s[i..i+2p) with s[k] = s[k+p], the cycle not all
          one slot), e.g. A C A C or B D A B D A.
     Q2c  "much more than its share": for items with k options (k ≥ 3, grouped by k), a slot is overused when it holds
          the answer in more than floor(1.5 × n / k) + 1 of the n items.
     Q2d  "about half": two-option items put the answer first a times and second b times with |a − b| ≤ max(1, round(0.2 n)).
     Q3a  "about 30%": the right answer is the strictly longest (characters) in at most max(1, round(0.30 n)) of the n
          items with 3+ options, and the strictly shortest in at most that many.
     Q3c  a lone exact number: exactly one option is a bare number while the others are ranges or words, and it is
          the answer; a lone hedge: exactly one option has a hedge word (usually, often, sometimes, may, might, can,
          generally, likely, probably, tends) and it is the answer; "all/none of the above" in more than 1 item per
          lesson, or as the answer every time it appears (2+); one wrong-answer text reused in 3+ items.
     T3   the first wait is 4–6 s, the waits never shrink, grow at least once, and never pass 21 s (5 → … → 20 cap).
     L2   the required "about N min" parts of a lesson add up to 35–45.
     Q4   the key (from the pack, else the teacher copy's answers view) is retyped on a fresh device as: decimal, leading-dot
          decimal, fraction, percent (values strictly between −1 and 1), mixed number, 2–3 place rounding for repeating
          decimals, N.0 for whole numbers; a word key of 1–3 letters-only words as UPPER, Title and lower case and, for a
          one-word key that is not an -ed/-ing/-ly/-ful/-ous/-ive/-ic/-al/-ness word, its plural (or singular). Every
          form must be marked right.
     N1   the first lesson's right answers (typed or picked) and their explanations, and filled blanks, must appear on the
          My notes page; no hint text seen during the run, and no model answer from the teacher copy, may.
   Output: a table, rule by rule: PASS / FAIL (evidence) / CANNOT TEST (why) / REVIEW (what a reviewer looks at).
   Exit 1 on any FAIL. --rules limits the run to those rules (the others print as "not run"). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'http://pp-check.test';
const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups';
const SANDBOX_NO_STORAGE = 'allow-scripts allow-forms allow-modals allow-downloads';
const SENTENCE = 'I picked this one because I thought it matched the picture and the numbers in the problem.';

export const RULES = [
  ['L1', 'review', 'Lesson order: hook, labs, rule named, check questions, notes sheet'],
  ['L2', 'test', 'About 40 min required (35–45); optional parts marked and not blocking'],
  ['L3', 'test', '3+ mechanics, never the same twice in a row'],
  ['L4', 'review', 'Hook with a story or contest; closing checkpoint reframed'],
  ['L5', 'review', 'Off-the-board activities: materials, result box, "simulate it for me"'],
  ['L6', 'test', 'Every source blank appears as a fill-in'],
  ['L7', 'test', 'Rule cards unlock only after the required labs'],
  ['L8', 'test', 'No lesson locked by default'],
  ['Q1', 'test', 'Hint, per-wrong-choice message, explanation after right'],
  ['Q2', 'test', 'Shuffled at display time with a fixed seed'],
  ['Q2a', 'test', 'No run of 3 in a row'],
  ['Q2b', 'test', 'No repeating cycle of 2 to 4'],
  ['Q2c', 'test', 'No slot used much more than its share'],
  ['Q2d', 'test', 'Two-option items about half and half'],
  ['Q2e', 'test', 'Saved choices keep the original option numbers'],
  ['Q3a', 'test', 'Right answer strictly longest ≤ ~30%, strictly shortest ≤ ~30%'],
  ['Q3b', 'test', 'Never the only option with (or without) "because"'],
  ['Q3c', 'test', 'No lone exact number or hedge, no overused all/none of the above, no reused wrong pattern (silly distractors: review)'],
  ['Q4', 'test', 'Typed answers accept equivalent forms'],
  ['Q5', 'test', 'Model answers and look-fors never in the student file'],
  ['Q6', 'review', 'Plain student voice, no AI tells'],
  ['N1', 'test', 'My notes page last in nav: right answers, explanations, blanks; never hints or model answers'],
  ['N2', 'test', 'Collapsible own-notes box on every page; "Where I got stuck" records wrong tries'],
  ['N3', 'test', 'Students can add their own notes as they go'],
  ['N4', 'test', 'Print hides sidebar and buttons, shows a Name/Date line'],
  ['T1', 'test', 'Two short answers (12+ words), one teacher question stored only as ciphertext'],
  ['T2', 'test', 'Code box shows the teacher question, never marks it done'],
  ['T3', 'test', 'Wrong picks stay marked after reload; wait 5 s growing to 20 s; one sentence after two misses'],
  ['T4', 'review', 'A pacing tool, not tamper-proof (a statement, nothing to test)'],
  ['S1', 'test', 'Autosave, autoload, backup file, save code, "Saved automatically at"'],
  ['S2', 'review', 'Storage keys and ids fixed forever (needs two builds to compare)'],
  ['S3', 'test', 'Loaders merge over defaults, never clear'],
  ['S4', 'review', 'Notes keep their own copy of the text they were made from'],
  ['S5', 'review', 'Old saved work still shows after a change (needs two builds)'],
  ['SB', 'test', 'Blocked storage: the page still works and tells the student'],
  ['C1', 'test', 'Teacher copy generated from the student file'],
  ['C2', 'test', 'F2 toggles ANSWERS/BLANK (never a letter key), right option by its original number'],
  ['C3', 'test', 'Teacher copy display-only except Reset lesson'],
  ['K1', 'test', 'Student-style QA gate: both widths, sandboxed frame, no network, no errors'],
  ['K2', 'review', 'Independent reviewers: fidelity, difficulty, timing, voice, math, patterns'],
  ['K3', 'review', 'Content review packet when asked'],
  ['A1', 'review', 'AP: bell ringer per lesson (3–5 MC + 1 FRQ, ~10 min)'],
  ['A2', 'review', 'AP: options same length, near-miss, misconception-based'],
  ['A3', 'test', 'AP: FRQ scoring guide / model / typical wrong answers teacher-only'],
  ['A4', 'test', 'AP: CED codes in the teacher key only'],
  ['D1', 'test', '"Build N (what changed)" at the bottom of each page'],
  ['D2', 'test', '#/ links work inside an iframe'],
  ['D3', 'review', 'Hosting rules (nickname, AI notice): out of scope'],
];
const REVIEW_NOTES = {
  L1: 'Read each lesson top to bottom: a hook first, then labs where the student finds the pattern, then the rule named, then check questions, then the notes sheet. A rule stated before the labs fails.',
  L4: 'Is the hook a story or a contest? Is the closing checkpoint reworded each lesson rather than the same block?',
  L5: 'Where an off-the-board activity would teach better, is there one, with a materials list, a box for the result and a "simulate it for me" button?',
  Q6: 'Read every explanation, hint and wrong-answer message aloud: student voice, short sentences, no "moreover", no stacked triplets. Also Q3c\'s silly distractors.',
  T4: 'Nothing to test: the page says (or the teacher notes say) it is a pacing tool, not tamper-proof.',
  S2: 'Compare two builds: storage keys, lesson ids and question ids unchanged.',
  S4: 'Change a question\'s text in a rebuild; the student\'s saved note still shows the old text it was made from.',
  S5: 'Load a save from the previous build into the new one; everything still shows.',
  K2: 'Fresh agents: source fidelity, difficulty by level, timing, voice, math recomputed, answer patterns.',
  K3: 'If the teacher asked for one: a packet with every problem and answer, sample students, judgment calls, the MC audit.',
  A1: 'AP lessons only: a bell ringer per lesson, 3–5 MC plus one FRQ, College Board level, about 10 minutes.',
  A2: 'AP lessons only: options the same length, near misses built on real misconceptions.',
  D3: 'Hosting rules, left out of the standard on purpose.',
};

/* ---------------------------------------------------------------- arguments and inputs */
function argsOf(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) { const k = t.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; a[k] = v; }
    else a._.push(t);
  }
  return a;
}
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isInteractiveKind = (d) => /^interactive/.test(d.kind || d.item || '');

/* Render a pack folder with the renderer's own command line, in a temporary copy (never in the repo). */
function renderPack(folder) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-istd-'));
  const work = path.join(tmp, 'pack');
  fs.cpSync(folder, work, { recursive: true, filter: (s) => !/(^|\/)(out|out-preview)(\/|$)|\.zip$|approval\.json$/.test(path.relative(folder, s)) });
  const render = path.join(ROOT, 'scripts/render-pack.mjs');
  const run = (mode) => spawnSync(process.execPath, [render, work, mode], { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
  let r = run('--preview');
  if (r.status !== 0) throw new Error(`the preview did not render:\n${r.stdout}${r.stderr}`);
  const review = fs.readFileSync(path.join(work, 'out-preview/REVIEW.html'), 'utf8');
  const m = review.match(/var D = (\{.*?\});\s*\n/);
  if (!m) throw new Error('REVIEW.html has no review data to agree to');
  const D = JSON.parse(m[1]);
  // what "I agree" saves (docs/PACK-FORMAT.md), made by the checker in a temporary copy only
  fs.writeFileSync(path.join(work, 'approval.json'), JSON.stringify({ orderId: D.orderId, name: 'Interactive standard check (temporary copy)', date: new Date().toISOString(), statement: D.statement, packHash: D.packHash, documents: D.documents }));
  r = run('--final');
  if (r.status !== 0) throw new Error(`the final did not render:\n${r.stdout}${r.stderr}`);
  return { tmp, out: path.join(work, 'out') };
}

/* Each target: { id, lessons:[{name,file,teacher}], notes, hub, dir, pack doc } */
function targetsOf(input, a) {
  const abs = path.resolve(input);
  if (fs.statSync(abs).isDirectory() && fs.existsSync(path.join(abs, 'pack.json'))) {
    const pack = JSON.parse(fs.readFileSync(path.join(abs, 'pack.json'), 'utf8'));
    const docs = (pack.documents || []).filter(isInteractiveKind);
    if (!docs.length) return { targets: [], cleanup: null };
    const { tmp, out } = renderPack(abs);
    const targets = docs.filter((d) => !a.doc || a.doc === d.title || a.doc === slug(d.title)).map((d) => {
      const base = slug(d.title || d.item), file = path.join(out, `${base}.html`), teacher = path.join(out, `${base}-solutions.html`);
      return { id: base, title: d.title, doc: d, dir: out, lessons: [{ name: `${base}.html`, file, teacher: fs.existsSync(teacher) ? teacher : null }], notes: null, hub: null };
    });
    return { targets, cleanup: tmp };
  }
  if (fs.statSync(abs).isFile()) {
    const t = a.teacher && fs.existsSync(a.teacher) ? (fs.statSync(a.teacher).isDirectory() ? path.join(a.teacher, path.basename(abs)) : a.teacher) : null;
    return { targets: [{ id: path.basename(abs, '.html'), dir: path.dirname(abs), lessons: [{ name: path.basename(abs), file: abs, teacher: t && fs.existsSync(t) ? t : null }], notes: null, hub: null }], cleanup: null };
  }
  const files = fs.readdirSync(abs).filter((f) => f.endsWith('.html')).sort((x, y) => x.localeCompare(y, 'en', { numeric: true }));
  const notes = files.find((f) => /notes/i.test(f)) || null, hub = files.includes('index.html') ? 'index.html' : null;
  const tdir = a.teacher && fs.existsSync(a.teacher) && fs.statSync(a.teacher).isDirectory() ? a.teacher : null;
  const lessons = files.filter((f) => f !== notes && f !== hub).map((f) => ({ name: f, file: path.join(abs, f), teacher: tdir && fs.existsSync(path.join(tdir, f)) ? path.join(tdir, f) : null }));
  return { targets: [{ id: path.basename(abs), dir: abs, lessons, notes, hub, teacherDir: tdir }], cleanup: null };
}

/* ---------------------------------------------------------------- browser */
function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch {}
  try { const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(); return createRequire(path.join(g, 'noop.js'))('playwright'); } catch { return null; }
}

class Browser {
  constructor(pw, dir, extraFiles = {}) { this.pw = pw; this.dir = dir; this.extra = extraFiles; this.blocked = []; }
  async start() {
    const exe = process.env.PP_CHROMIUM;
    this.b = await this.pw.chromium.launch({ executablePath: exe && fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--no-first-run', '--disable-sync'] });
  }
  async close() { await this.b.close(); }
  fileFor(name) { return this.extra[name] || path.join(this.dir, name); }
  /* a fresh device: new context, clock installed, every request outside our made-up origin aborted */
  async open(name, { width = 1280, sandbox = SANDBOX, srcdoc = false, print = false } = {}) {
    const ctx = await this.b.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
    await ctx.clock.install({ time: new Date('2026-11-05T15:00:00Z') });
    await ctx.addInitScript(() => { window.__istdErrors = []; window.addEventListener('error', (e) => window.__istdErrors.push(String(e.message || e))); window.addEventListener('unhandledrejection', (e) => window.__istdErrors.push('unhandled: ' + String(e.reason))); });
    const errors = [];
    await ctx.route('**/*', async (route) => {
      const u = new URL(route.request().url());
      if (u.origin === ORIGIN) {
        const f = decodeURIComponent(u.pathname.slice(1));
        if (f === '__host.html') {
          const q = u.searchParams, src = q.get('f');
          const body = q.get('srcdoc') ? `<!doctype html><meta charset="utf-8"><title>host</title><body style="margin:0"><iframe id="fr" sandbox="${q.get('sb')}" style="border:0;width:100%;height:100vh"></iframe><script>fetch(${JSON.stringify('/' + src)}).then(r=>r.text()).then(t=>{document.getElementById('fr').srcdoc=t;});</script>`
            : `<!doctype html><meta charset="utf-8"><title>host</title><body style="margin:0"><iframe id="fr" sandbox="${q.get('sb')}" src="/${encodeURIComponent(src)}" style="border:0;width:100%;height:100vh"></iframe>`;
          return route.fulfill({ status: 200, contentType: 'text/html', body });
        }
        const file = this.fileFor(f);
        if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ status: 200, contentType: f.endsWith('.html') ? 'text/html' : 'application/octet-stream', body: fs.readFileSync(file) });
        return route.fulfill({ status: 404, body: 'not found' });
      }
      if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return route.continue();
      this.blocked.push(u.href); return route.abort();
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    if (print) await page.emulateMedia({ media: 'print' });
    const h = new Harness(this, ctx, page, name, { sandbox, srcdoc, errors });
    await h.load();
    return h;
  }
}

/* in-page helpers (run inside the lesson frame) */
const PAGE_FNS = {
  discover: () => {
    const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
    const itemOf = (e) => { let c = e.parentElement; while (c && c !== document.body) { if ((c.id || /(^|\s)(q|prob|problem|question|item|card)(\s|$)/.test(c.className || '')) && c.querySelector('input,button')) return c; c = c.parentElement; } return e.parentElement; };
    const txt = (e) => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
    document.querySelectorAll('[data-istd-item],[data-istd-opt],[data-istd-check],[data-istd-in],[data-istd-blank]').forEach((e) => { for (const k of ['istdItem', 'istdOpt', 'istdCheck', 'istdIn', 'istdBlank']) delete e.dataset[k]; });
    const groups = [], seen = new Set();
    const add = (els, how) => { els = els.filter((e) => !seen.has(e)); if (els.length < 2) return; els.forEach((e) => seen.add(e)); groups.push({ els, how }); };
    const byKey = (sel, key) => { const m = new Map(); document.querySelectorAll(sel).forEach((e) => { const k = key(e); if (k == null) return; if (!m.has(k)) m.set(k, []); m.get(k).push(e); }); return m; };
    byKey('input[type=radio]', (e) => e.name || null).forEach((els) => add(els, 'radio'));
    byKey('[data-choice]', (e) => e.dataset.choice).forEach((els) => add(els, 'data-choice'));
    byKey('[role=radio]:not(input)', (e) => e.closest('[role=radiogroup]')).forEach((els) => add(els, 'role-radio'));
    byKey('button.opt, button.choice, button.option', (e) => e.parentElement).forEach((els) => add(els, 'option-buttons'));
    const items = [];
    const checkIn = (c) => [...c.querySelectorAll('button')].find((b) => b.dataset.check != null || /^\s*check\b/i.test(b.innerText || '')) || null;
    for (const g of groups) {
      const c = itemOf(g.els[0]); const i = items.length;
      c.dataset.istdItem = String(i);
      const opts = g.els.map((e, k) => {
        e.dataset.istdOpt = `${i}:${k}`;
        const lab = e.tagName === 'INPUT' ? (e.closest('label') || document.querySelector(`label[for="${e.id}"]`)) : e;
        let t = lab ? txt(lab) : (e.value || '');
        t = t.replace(/^[A-H][.)]\s*/, '');
        const orig = e.dataset.j ?? e.dataset.orig ?? e.dataset.index ?? e.dataset.i ?? (e.tagName === 'INPUT' ? e.value : null);
        return { text: t, orig: orig == null ? String(k) : String(orig) };
      });
      const ck = checkIn(c); if (ck) ck.dataset.istdCheck = String(i);
      const p = [...c.querySelectorAll('p, legend, .prompt, h3, h4')].map(txt).find((t) => t.length > 8 && !opts.some((o) => o.text === t)) || txt(c).slice(0, 160);
      const tf = opts.length === 2 && opts.every((o) => /^(true|false)$/i.test(o.text));
      items.push({ i, kind: tf ? 'tf' : 'mc', how: g.how, opts, prompt: p, id: c.id || c.dataset.id || '', hasCheck: !!ck, visible: vis(c) });
    }
    const isName = (e) => /name|nick/i.test(`${e.id} ${e.name} ${e.getAttribute('aria-label') || ''} ${e.placeholder}`);
    for (const inp of document.querySelectorAll('input[type=text], input:not([type]), input[type=number], input[type=search]')) {
      if (seen.has(inp) || isName(inp) || inp.readOnly || inp.disabled) continue;
      if (/notes|top\d|learned/i.test(`${inp.id} ${inp.getAttribute('aria-label') || ''} ${Object.keys(inp.dataset).join(' ')}`) && inp.dataset.blank == null) continue;
      if (/code/i.test(`${inp.id} ${inp.placeholder} ${inp.getAttribute('aria-label') || ''}`)) continue;
      const c = itemOf(inp), ck = checkIn(c);
      if (inp.dataset.blank != null || /(^|\s)(bl|blank)(\s|$)/.test(inp.className) || !ck) { inp.dataset.istdBlank = String(items.length); const ctx = txt(inp.parentElement); items.push({ i: items.length, kind: 'blank', prompt: ctx.slice(0, 200), id: inp.id || '', visible: vis(inp) }); continue; }
      const i = items.length; c.dataset.istdItem = String(i); inp.dataset.istdIn = String(i); ck.dataset.istdCheck = String(i);
      const p = [...c.querySelectorAll('p, legend, .prompt, label')].map(txt).find((t) => t.length > 8) || txt(c).slice(0, 160);
      items.push({ i, kind: 'typed', prompt: p, id: c.id || c.dataset.id || inp.id || '', inputId: inp.id || '', visible: vis(c) });
    }
    return items;
  },
  text: () => document.body.innerText,
  html: () => document.documentElement.outerHTML,
  itemText: (i) => { const c = document.querySelector(`[data-istd-item="${i}"]`); return c ? c.innerText : ''; },
  itemState: (i) => {
    const c = document.querySelector(`[data-istd-item="${i}"]`); if (!c) return null;
    const ck = document.querySelector(`[data-istd-check="${i}"]`) || [...c.querySelectorAll('button')].find((b) => b.dataset.check != null || /^\s*(check|wait)\b/i.test(b.innerText || ''));
    const opts = [...c.querySelectorAll('[data-istd-opt]')].map((o) => ({ cls: o.className + ' ' + ((o.closest('label') || o).className || ''), disabled: !!o.disabled, aria: o.getAttribute('aria-disabled') || o.getAttribute('aria-checked') || '', checked: !!o.checked }));
    return { text: c.innerText, opts, checkText: ck ? ck.innerText : '', checkDisabled: ck ? !!ck.disabled : null };
  },
};

class Harness {
  constructor(br, ctx, page, name, o) { Object.assign(this, { br, ctx, page, name }, o); }
  get url() { return `${ORIGIN}/__host.html?f=${encodeURIComponent(this.name)}&sb=${encodeURIComponent(this.sandbox)}${this.srcdoc ? '&srcdoc=1' : ''}`; }
  async load(name) {
    if (name) this.name = name;
    await this.page.goto(this.url, { waitUntil: 'load' });
    await this.page.waitForFunction(() => { const f = document.getElementById('fr'); return f && f.contentDocument !== undefined; });
    this.frame = null;
    for (let t = 0; t < 50 && !this.frame; t++) {
      this.frame = this.page.frames().find((f) => f !== this.page.mainFrame() && f.url() !== 'about:blank');
      if (!this.frame) await this.page.waitForTimeout(50);
    }
    if (!this.frame) this.frame = this.page.frames().find((f) => f !== this.page.mainFrame());
    await this.frame.waitForLoadState('load');
    await this.tick(300);
    this.items = await this.ev(PAGE_FNS.discover);
    return this;
  }
  async reload() { await this.tick(1500); return this.load(); }
  async ev(fn, arg) { return this.frame.evaluate(fn, arg); }
  async tick(ms) { await this.page.clock.runFor(ms); }
  async close() { await this.ctx.close(); }
  async pageErrors() { const inner = await this.ev(() => window.__istdErrors || []).catch(() => []); return [...this.errors, ...inner]; }
  async text() { return this.ev(PAGE_FNS.text); }
  async source() { return this.ev(PAGE_FNS.html); }
  async state(i) {
    let s = await this.ev(PAGE_FNS.itemState, i);
    if (!s) { await this.ev(PAGE_FNS.discover); s = await this.ev(PAGE_FNS.itemState, i); }   // the page re-drew itself: tag it again
    return s;
  }
  /* pick a choice (and press Check when the item has one); returns the outcome and the new text */
  async pick(i, k) {
    const before = await this.state(i);
    await this.ev(PAGE_FNS.discover);
    await this.ev(([i, k]) => { const e = document.querySelector(`[data-istd-opt="${i}:${k}"]`); if (e) e.click(); }, [i, k]);
    await this.tick(150);
    await this.ev(PAGE_FNS.discover);
    await this.ev((i) => { const b = document.querySelector(`[data-istd-check="${i}"]`); if (b && !b.disabled) b.click(); }, i);
    await this.tick(400);
    return this.outcome(i, before, k);
  }
  async type(i, value, { blank = false } = {}) {
    if (blank) {
      const sel = `[data-istd-blank="${i}"]`;
      const before = await this.ev((s) => { const e = document.querySelector(s); return e ? e.parentElement.innerText + '|' + e.className : ''; }, sel);
      await this.frame.fill(sel, value).catch(() => {});
      await this.frame.dispatchEvent(sel, 'change').catch(() => {});
      await this.ev((s) => { const e = document.querySelector(s); if (e) { e.dispatchEvent(new Event('blur')); e.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); } }, sel);
      await this.tick(400);
      const after = await this.ev((s) => { const e = document.querySelector(s); return e ? e.parentElement.innerText + '|' + e.className + '|' + (e.getAttribute('aria-invalid') || '') : ''; }, sel);
      const cls = after.split('|')[1] || '';
      return { result: /(^|\s)(ok|right|correct|good)(\s|$)/.test(cls) ? 'right' : /(^|\s)(bad|wrong|no|miss)(\s|$)/.test(cls) ? 'wrong' : classify(diffLines(before, after)), news: diffLines(before, after) };
    }
    const before = await this.state(i);
    await this.ev(PAGE_FNS.discover);
    await this.frame.fill(`[data-istd-in="${i}"]`, value);
    await this.ev(PAGE_FNS.discover);
    await this.tick(100);
    await this.ev((i) => { const b = document.querySelector(`[data-istd-check="${i}"]`); if (b && !b.disabled) b.click(); }, i);
    await this.tick(400);
    return this.outcome(i, before, null);
  }
  async outcome(i, before, k) {
    const after = await this.state(i);
    const news = diffLines(before.text, after.text);
    let result = 'none';
    if (k != null && after.opts[k]) {
      const c0 = before.opts[k].cls, c1 = after.opts[k].cls;
      if (c1 !== c0) { if (/(^|\s)(ok|right|correct|good|is-right)(\s|$)/.test(c1)) result = 'right'; else if (/(^|\s)(bad|wrong|miss|no|incorrect|is-wrong)(\s|$)/.test(c1)) result = 'wrong'; }
    }
    if (result === 'none') result = classify(news);
    // the same message twice gives no new line: a new wait starting on the Check button is a miss too
    if (result === 'none' && after.checkDisabled && /wait/i.test(after.checkText) && !(before.checkDisabled && /wait/i.test(before.checkText))) result = 'wrong';
    return { result, news, after };
  }
  /* after a miss: write the one sentence if a box asks for it, and open the hint if a button offers it */
  async afterMiss(i) {
    await this.ev(PAGE_FNS.discover);
    const r = await this.ev(([i, s]) => {
      const c = document.querySelector(`[data-istd-item="${i}"]`); if (!c) return {};
      const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const boxes = [...c.querySelectorAll('textarea')].filter((t) => vis(t) && !t.value && !/work|steps/i.test(Object.keys(t.dataset).join(' ') + t.id));
      const prompt = boxes.length ? (boxes[0].closest('div,section,p') || c).innerText : '';
      boxes.forEach((t) => { t.value = s; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); t.dispatchEvent(new Event('blur')); });
      return { wrote: boxes.length, prompt };
    }, [i, SENTENCE]);
    await this.tick(300);
    const before = await this.state(i);
    const clicked = await this.ev((i) => { const c = document.querySelector(`[data-istd-item="${i}"]`); const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length); const b = c && [...c.querySelectorAll('button')].find((b) => vis(b) && !b.disabled && /hint/i.test(b.innerText)); if (b) b.click(); return !!b; }, i);
    await this.tick(300);
    const after = await this.state(i);
    const hintNews = diffLines(before.text, after.text).filter((l) => !/^💡?\s*show (my )?hint$/i.test(l));
    let hint = clicked ? hintNews.join(' ') : '';
    if (!hint) hint = diffLines('', after.text).filter((l) => /💡|hint/i.test(l) && !/show (my )?hint/i.test(l)).join(' ');
    return { ...r, hint: hint.replace(/^💡\s*/, '').trim() };
  }
  async waitClear(ms = 26000) { await this.tick(ms); }
  async storage() { return this.ev(() => { try { const o = {}; for (let k = 0; k < localStorage.length; k++) { const key = localStorage.key(k); o[key] = localStorage.getItem(key); } return o; } catch (e) { return { __error: String(e) }; } }); }
  async setStorage(o, clear = true) { return this.ev(([o, clear]) => { if (clear) localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, [o, clear]); }
  async buttons(re) { return this.ev((src) => { const re = new RegExp(src, 'i'); const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length); return [...document.querySelectorAll('button, a, [role=button], summary')].filter((b) => vis(b) && re.test(b.innerText || b.getAttribute('aria-label') || '')).map((b) => (b.innerText || '').trim()); }, re.source); }
  async clickButton(re) { return this.ev((src) => { const re = new RegExp(src, 'i'); const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length); const b = [...document.querySelectorAll('button, a, [role=button], summary')].find((b) => vis(b) && re.test(b.innerText || b.getAttribute('aria-label') || '')); if (b) b.click(); return b ? (b.innerText || '').trim() : null; }, re.source); }
}

/* ---------------------------------------------------------------- text helpers */
function diffLines(a, b) {
  const count = new Map();
  for (const l of String(a || '').split('\n').map((s) => s.trim()).filter(Boolean)) count.set(l, (count.get(l) || 0) + 1);
  const out = [];
  for (const l of String(b || '').split('\n').map((s) => s.trim()).filter(Boolean)) { const n = count.get(l) || 0; if (n) count.set(l, n - 1); else out.push(l); }
  return out;
}
const WRONG_RE = /✗|✘|❌|\bnot yet\b|try again|not quite|isn['’]t right|\bincorrect\b|\bwrong\b|not right/i;
const RIGHT_RE = /✓|✔|✅|\bright!|\bcorrect[!.]|that['’]s right|\bnice\b|you got it|well done|great job|\byes[!,.]/i;
function classify(lines) { const t = lines.join(' '); if (WRONG_RE.test(t)) return 'wrong'; if (RIGHT_RE.test(t)) return 'right'; return 'none'; }
const GENERIC = /^(✗|✘|❌)?\s*(not yet|not quite|try again|wrong)[.!]?\s*|wait\s*\d+\s*s\b|wait a (few|moment)[^.]*\.|before you try again[^.]*\.|then read the problem again\.?|read the (problem|question) again\.?/gi;
const meaningful = (lines) => lines.join(' ').replace(GENERIC, ' ').replace(/^\W+/, '').replace(/\s+/g, ' ').trim();
const words = (s) => (String(s).match(/[\p{L}\p{N}'’]+/gu) || []).length;
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const HEDGE = /\b(usually|often|sometimes|may|might|can|generally|likely|probably|tends?)\b/i;
const ABOVE = /\b(all|none|both|neither) of the (above|these)\b/i;
const BARE_NUM = /^[−-]?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?\s*(%|[a-z°]{0,4})?$/i;
const RANGE = /\d\s*(–|-|to)\s*\d|between|more than|less than|at least|at most|about|over|under/i;
const L = (n) => String.fromCharCode(65 + n);

/* numbers: exact fractions */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
function parseNumber(s) {
  s = String(s).replace(/[−–]/g, '-').replace(/,/g, '').trim();
  let m = s.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (m) { const q = +m[4], p = (+m[2] * q + +m[3]) * (m[1] ? -1 : 1); return reduce(p, q); }
  m = s.match(/^(-?\d+)\s*\/\s*(\d+)/); if (m) return reduce(+m[1], +m[2]);
  m = s.match(/^(-?)(\d*)\.(\d+)/); if (m) { const q = 10 ** m[3].length, p = (+(m[2] || 0) * q + +m[3]) * (m[1] ? -1 : 1); return reduce(p, q); }
  m = s.match(/^(-?\d+)(?![\d/])/); if (m) return reduce(+m[1], 1);
  return null;
}
function reduce(p, q) { if (!q) return null; const g = gcd(p, q); if (q < 0) { p = -p; q = -q; } return { p: p / g, q: q / g }; }
function equivalentForms(raw) {
  const v = parseNumber(raw); if (!v) return null;
  const val = v.p / v.q, forms = [];
  const terminating = (() => { let q = v.q; while (q % 2 === 0) q /= 2; while (q % 5 === 0) q /= 5; return q === 1; })();
  const dec = (x) => String(+x.toFixed(10));
  if (v.q !== 1) {
    if (terminating) { forms.push(dec(val)); if (Math.abs(val) < 1) forms.push(dec(val).replace(/^(-?)0\./, '$1.')); }
    else { forms.push(val.toFixed(2)); forms.push(val.toFixed(3)); }
    forms.push(`${v.p}/${v.q}`);
    if (Math.abs(val) < 1) forms.push(`${dec(val * 100)}%`);
    if (Math.abs(v.p) > v.q) { const w = Math.trunc(v.p / v.q), r = Math.abs(v.p % v.q); forms.push(`${w} ${r}/${v.q}`); }
  } else { forms.push(String(v.p)); forms.push(`${v.p}.0`); }
  return [...new Set(forms)];
}
function wordForms(raw) {
  const t = String(raw).trim();
  if (!/^[A-Za-z][A-Za-z '’-]*$/.test(t) || words(t) > 3) return null;
  // a plural only where one makes sense: one word, not an adjective, adverb or verb form
  const plural = words(t) === 1 && !/(ed|ing|ly|ful|ous|ive|ic|al|ness)$/i.test(t) ? (/s$/i.test(t) ? t.replace(/s$/i, '') : `${t}s`) : null;
  return [...new Set([t.toUpperCase(), t[0].toUpperCase() + t.slice(1).toLowerCase(), t.toLowerCase(), plural].filter(Boolean))];
}

/* ---------------------------------------------------------------- results */
class Results {
  constructor(only) { this.r = new Map(); this.only = only; }
  want(id) { return !this.only || this.only.includes(id); }
  set(id, status, evidence, page) {
    if (!this.want(id)) return;
    const order = { FAIL: 3, 'CANNOT TEST': 2, PASS: 1, REVIEW: 0 };
    const cur = this.r.get(id) || { status: null, evidence: [] };
    if (!cur.status || order[status] > order[cur.status]) cur.status = status;
    if (evidence) cur.evidence.push(page ? `${page}: ${evidence}` : evidence);
    this.r.set(id, cur);
  }
  table() {
    const rows = [];
    for (const [id, kind, what] of RULES) {
      if (!this.want(id)) { rows.push({ id, status: 'not run', what, evidence: [] }); continue; }
      if (kind === 'review') { rows.push({ id, status: 'REVIEW', what, evidence: [REVIEW_NOTES[id] || what] }); continue; }
      const c = this.r.get(id);
      rows.push({ id, status: c ? c.status : 'CANNOT TEST', what, evidence: c ? c.evidence : ['no test reached this rule'] });
    }
    return rows;
  }
}

/* ---------------------------------------------------------------- the checks of one lesson page */
async function checkLesson(br, T, lesson, R, ctx) {
  const P = lesson.name;
  const pageNote = (id, st, ev) => R.set(id, st, ev, P);
  const src = fs.readFileSync(lesson.file, 'utf8');

  /* first look at 1280: what a student sees */
  const A = await br.open(P);
  const items = A.items, mc = items.filter((x) => x.kind === 'mc' || x.kind === 'tf'), typed = items.filter((x) => x.kind === 'typed'), blanks = items.filter((x) => x.kind === 'blank');
  const visibleText = await A.text();
  if (ctx.dump) fs.writeFileSync(path.join(ctx.dump, `${T.id}--${P}.txt`), visibleText);
  ctx.summary.push(`${P}: ${mc.filter((x) => x.kind === 'mc').length} choice, ${mc.filter((x) => x.kind === 'tf').length} two-option, ${typed.length} typed, ${blanks.length} fill-in items`);

  /* teacher copy: answers (F2 view) and teacher-only text */
  const teacher = lesson.teacher ? await readTeacher(br, T, lesson, items, visibleText) : null;

  /* pass 1: answer every choice item in display order, like a student who doesn't know */
  const info = new Map();
  for (const it of mc) {
    const rec = { it, tried: [], wrong: {}, right: null, explain: '', hint: '', thinkPrompt: '' };
    for (let k = 0; k < it.opts.length; k++) {
      let o = await A.pick(it.i, k);
      if (o.result === 'none') { await A.waitClear(); o = await A.pick(it.i, k); }
      rec.tried.push(k);
      if (o.result === 'right') { rec.right = k; rec.explain = meaningful(o.news.filter((l) => !RIGHT_RE.test(l) || words(l) > 3)).replace(RIGHT_RE, '').trim(); break; }
      if (o.result === 'wrong') {
        rec.wrong[k] = meaningful(o.news);
        if (rec.tried.length >= 1) { const m = await A.afterMiss(it.i); if (m.hint) rec.hint = m.hint; if (m.wrote && rec.tried.length >= 2 && !rec.thinkPrompt) rec.thinkPrompt = m.prompt; }
        await A.waitClear();
      }
    }
    info.set(it.i, rec);
  }
  /* typed items: a wrong try, the miss flow, then the right answer when we know it */
  const keyOf = (it) => (teacher && teacher.typed.get(it.id)) || (ctx.packAnswers && ctx.packAnswers[typed.indexOf(it)]);
  for (const it of typed) {
    const rec = { it, wrong: {}, right: null, explain: '', hint: '', thinkPrompt: '' };
    for (const w of ['999999', '888888']) { const o = await A.type(it.i, w); rec.wrong[w] = { result: o.result, msg: meaningful(o.news) }; const m = await A.afterMiss(it.i); if (m.hint) rec.hint = m.hint; if (m.wrote && !rec.thinkPrompt) rec.thinkPrompt = m.prompt; await A.waitClear(); }
    const key = keyOf(it);
    if (key != null) { const o = await A.type(it.i, String(key)); if (o.result === 'right') { rec.right = String(key); rec.explain = meaningful(o.news.filter((l) => words(l) > 3 || !RIGHT_RE.test(l))).replace(RIGHT_RE, '').trim(); } else rec.keyRejected = { key, result: o.result }; }
    info.set(it.i, rec);
  }
  /* fill-ins: the teacher copy's answers */
  const filled = [];
  for (const it of blanks) { const key = teacher && teacher.blanks.get(it.id); if (key == null || key === '') continue; const o = await A.type(it.i, String(key), { blank: true }); if (o.result !== 'wrong') filled.push(String(key)); }

  /* pass 2 (a fresh device): the choices pass 1 never tried, so every wrong choice gets its message */
  const B = await br.open(P);
  for (const it of mc) {
    const rec = info.get(it.i); if (rec.right == null) continue;
    const untried = it.opts.map((_, k) => k).filter((k) => !rec.tried.includes(k));
    let misses = 0;
    for (const k of untried) {
      let o = await B.pick(it.i, k); if (o.result === 'none') { await B.waitClear(); o = await B.pick(it.i, k); }
      if (o.result === 'wrong') { misses++; rec.wrong[k] = meaningful(o.news); const m = await B.afterMiss(it.i); if (m.hint && !rec.hint) rec.hint = m.hint; if (m.wrote && misses >= 2 && !rec.thinkPrompt) rec.thinkPrompt = m.prompt; await B.waitClear(); }
      else if (o.result === 'right') rec.conflict = `option ${L(k)} also marked right`;
    }
    // a two-option item can only be missed twice by picking the same wrong choice again
    for (let tries = 0; misses < 2 && tries < 2; tries++) {
      const k = it.opts.map((_, j) => j).find((j) => j !== rec.right); if (k == null) break;
      let o = await B.pick(it.i, k); if (o.result === 'none') { await B.waitClear(); o = await B.pick(it.i, k); }
      if (o.result !== 'wrong') break;
      misses++; const m = await B.afterMiss(it.i); if (m.hint && !rec.hint) rec.hint = m.hint; if (m.wrote && misses >= 2 && !rec.thinkPrompt) rec.thinkPrompt = m.prompt; await B.waitClear();
    }
    rec.b = { misses, untried };
  }

  /* ---- Q2 and Q3: positions and lengths, over what the student saw */
  const solved = mc.filter((it) => info.get(it.i).right != null);
  const unsolved = mc.filter((it) => info.get(it.i).right == null);
  if (unsolved.length) pageNote('K1', 'FAIL', `${unsolved.length} choice item(s) never marked any option right: ${unsolved.map((x) => x.id || x.prompt.slice(0, 40)).join('; ')}`);
  ctx.positions.push(...solved.map((it) => ({ page: P, it, pos: info.get(it.i).right, n: it.opts.length })));
  for (const it of solved) { const rec = info.get(it.i); if (rec.conflict) pageNote('K1', 'FAIL', `${it.id}: ${rec.conflict}`); }

  /* Q2: shuffled at display time with a fixed seed: same order on a second device and at 375 px */
  {
    const C = await br.open(P, { width: 375 });
    const again = C.items.filter((x) => x.kind === 'mc' || x.kind === 'tf');
    const same = again.length === mc.length && again.every((x, n) => x.opts.map((o) => o.text).join('|') === mc[n].opts.map((o) => o.text).join('|'));
    if (!same) pageNote('Q2', 'FAIL', 'the choices came out in a different order on a second device / at 375 px (no fixed seed)');
    let shuffledNote = '';
    if (ctx.packChoices) {
      const src = ctx.packChoices; let moved = 0, n = 0;
      mc.forEach((it, idx) => { const s = src[idx]; if (!s || s.length !== it.opts.length) return; n++; if (it.opts.map((o) => norm(o.text)).join('|') !== s.map(norm).join('|')) moved++; });
      if (n >= 3 && moved === 0) pageNote('Q2', 'FAIL', `display order equals the source order in all ${n} choice items: nothing is shuffled`);
      else shuffledNote = `${moved} of ${n} items shown in a different order than the source`;
    }
    const orig = mc.filter((it) => it.opts.some((o, k) => o.orig !== String(k))).length;
    if (same) pageNote('Q2', ctx.packChoices || orig ? 'PASS' : 'CANNOT TEST', `same order on two devices and both widths${shuffledNote ? '; ' + shuffledNote : ''}${!ctx.packChoices ? `; ${orig} of ${mc.length} items show options out of their original-number order` + (orig ? '' : ' (no source to compare with and no original numbers in the page)') : ''}`);
    /* 375: sideways scroll, a real tap on a choice */
    const sw = await C.ev(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (sw.sw > sw.cw + 1) pageNote('K1', 'FAIL', `sideways scroll at 375 px (${sw.sw} > ${sw.cw})`);
    const first = again.find((x) => x.visible);
    if (first) {
      const before = await C.state(first.i);
      const loc = C.frame.locator(`[data-istd-opt="${first.i}:0"]`);
      const tgt = first.how === 'radio' ? C.frame.locator(`[data-istd-opt="${first.i}:0"]`).locator('xpath=ancestor::label[1]') : loc;
      try { await tgt.click({ timeout: 4000 }); await C.tick(100); const ck = C.frame.locator(`[data-istd-check="${first.i}"]`); if (await ck.count()) await ck.click({ timeout: 4000 }); await C.tick(400); const o = await C.outcome(first.i, before, 0); if (o.result === 'none') pageNote('K1', 'FAIL', `at 375 px a real tap on ${first.id || 'the first choice item'} gave no right/wrong mark`); }
      catch (e) { pageNote('K1', 'FAIL', `at 375 px the first choice can't be tapped: ${String(e.message).split('\n')[0]}`); }
    }
    await C.close();
  }

  /* Q3 per item, per lesson */
  {
    const three = solved.filter((it) => it.opts.length >= 3);
    const maxShare = Math.max(1, Math.round(0.3 * three.length));
    let longest = [], shortest = [];
    for (const it of three) {
      const lens = it.opts.map((o) => o.text.length), r = info.get(it.i).right, mx = Math.max(...lens), mn = Math.min(...lens);
      if (lens[r] === mx && lens.filter((x) => x === mx).length === 1) longest.push(it.id || it.prompt.slice(0, 30));
      if (lens[r] === mn && lens.filter((x) => x === mn).length === 1) shortest.push(it.id || it.prompt.slice(0, 30));
    }
    ctx.lengths.push({ page: P, n: three.length, longest, shortest });
    const bec = [];
    for (const it of solved) {
      const r = info.get(it.i).right, has = it.opts.map((o) => /\bbecause\b/i.test(o.text)), n = has.filter(Boolean).length;
      if (n === 1 && has[r]) bec.push(`${it.id}: the answer is the only option with "because"`);
      if (n === it.opts.length - 1 && !has[r] && it.opts.length > 2) bec.push(`${it.id}: the answer is the only option without "because"`);
    }
    pageNote('Q3b', bec.length ? 'FAIL' : 'PASS', bec.length ? bec.join('; ') : `${solved.length} items: "because" gives nothing away`);
    const q3c = [];
    let above = 0, aboveKey = 0;
    for (const it of solved) {
      const r = info.get(it.i).right, t = it.opts.map((o) => o.text);
      const bare = t.map((x) => BARE_NUM.test(x.trim()) && !RANGE.test(x));
      if (bare.filter(Boolean).length === 1 && bare[r] && t.length >= 3 && t.filter((x, k) => !bare[k] && (RANGE.test(x) || /[a-z]{3}/i.test(x))).length === t.length - 1) q3c.push(`${it.id}: the answer is the lone exact number`);
      const hedge = t.map((x) => HEDGE.test(x));
      if (hedge.filter(Boolean).length === 1 && hedge[r] && t.length >= 3) q3c.push(`${it.id}: the answer is the lone hedge ("${t[r].match(HEDGE)[0]}")`);
      if (t.some((x) => ABOVE.test(x))) { above++; if (ABOVE.test(t[r])) aboveKey++; }
    }
    if (above > 1) q3c.push(`"all/none of the above" in ${above} items`);
    if (above >= 2 && aboveKey === above) q3c.push(`"all/none of the above" is the answer every time (${above})`);
    ctx.wrongTexts.push(...solved.flatMap((it) => it.opts.filter((_, k) => k !== info.get(it.i).right).map((o) => ({ page: P, id: it.id, t: norm(o.text) }))));
    pageNote('Q3c', q3c.length ? 'FAIL' : 'PASS', q3c.length ? q3c.join('; ') : `${solved.length} items: no lone number or hedge, all/none of the above in ${above}`);
  }

  /* ---- Q1 */
  {
    const bad = [], seenMsgs = new Map();
    for (const [, rec] of info) for (const m of Object.values(rec.wrong)) { const t = typeof m === 'string' ? m : m.msg; seenMsgs.set(t, (seenMsgs.get(t) || 0) + 1); }
    let checked = 0;
    for (const [, rec] of info) {
      const it = rec.it, id = it.id || it.prompt.slice(0, 30);
      checked++;
      const probs = [];
      if (!rec.hint) {
        const hidden = await A.ev((i) => { const c = document.querySelector(`[data-istd-item="${i}"]`); const h = c && c.querySelector('[class*=hint],[id*=hint]'); return h ? (h.textContent || '').trim() : ''; }, it.i);
        if (words(hidden) >= 3 && !/show (my )?hint/i.test(hidden)) rec.hint = `(in the page, not reached) ${hidden}`;
        else probs.push('no hint reached after two misses');
      }
      if (it.kind === 'mc' || it.kind === 'tf') {
        const wrongKs = it.opts.map((_, k) => k).filter((k) => k !== rec.right);
        const missing = wrongKs.filter((k) => !(k in rec.wrong));
        const generic = wrongKs.filter((k) => k in rec.wrong && (words(rec.wrong[k]) < 4 || (seenMsgs.get(rec.wrong[k]) > 1 && wrongKs.length > 1 && new Set(wrongKs.map((j) => rec.wrong[j])).size === 1)));
        if (missing.length) probs.push(`wrong choice(s) ${missing.map(L).join(', ')} never reached`);
        if (generic.length) probs.push(`wrong choice(s) ${generic.map(L).join(', ')} get no reason (“${(rec.wrong[generic[0]] || '(nothing)').slice(0, 60)}”)`);
        if (rec.right != null && words(rec.explain) < 5) probs.push('no explanation after the right answer');
      } else {
        const msg = Object.values(rec.wrong).map((w) => w.msg).find(Boolean);
        if (!Object.values(rec.wrong).some((w) => w.result === 'wrong')) probs.push('a wrong typed answer was not marked wrong');
        if (rec.right != null && words(rec.explain) < 5) probs.push('no explanation after the right answer');
        if (rec.right == null) probs.push(rec.keyRejected ? `the key "${rec.keyRejected.key}" from the teacher copy was not accepted (${rec.keyRejected.result})` : 'right answer unknown (no teacher copy or pack): explanation not checked');
        if (!msg) probs.push('no message after a wrong typed answer');
      }
      const hard = probs.filter((p) => !/unknown/.test(p));
      if (hard.length) bad.push(`${id}: ${hard.join('; ')}`);
      else if (probs.length) R.set('Q1', 'CANNOT TEST', `${id}: ${probs.join('; ')}`, P);
    }
    pageNote('Q1', bad.length ? 'FAIL' : 'PASS', bad.length ? bad.slice(0, 12).join(' | ') + (bad.length > 12 ? ` | …and ${bad.length - 12} more` : '') : `${checked} auto-checked items: hint, a reason for each wrong choice, an explanation after right`);
  }

  /* ---- Q4: equivalent forms, each typed on a fresh device */
  {
    const tests = [];
    for (const it of typed) {
      const key = keyOf(it); if (key == null) continue;
      const forms = equivalentForms(key) || wordForms(key); if (!forms) continue;
      tests.push({ it, key, forms: forms.filter((f) => f !== String(key)).slice(0, 5) });
    }
    if (!typed.length) pageNote('Q4', 'PASS', 'no typed items on this page (not applicable)');
    else if (!tests.length) pageNote('Q4', 'CANNOT TEST', 'no typed answer is known (no teacher copy answers, no pack) or none is a number or a short word');
    else {
      const rejected = []; let tried = 0;
      for (const t of tests.slice(0, 4)) for (const f of t.forms) {
        const D = await br.open(P); const it2 = D.items.find((x) => x.kind === 'typed' && x.id === t.it.id) || D.items[t.it.i];
        const o = await D.type(it2.i, f); tried++;
        if (o.result !== 'right') rejected.push(`${t.it.id} (key ${t.key}): "${f}" → ${o.result === 'wrong' ? 'marked wrong' : 'no mark'}`);
        await D.close();
      }
      pageNote('Q4', rejected.length ? 'FAIL' : 'PASS', rejected.length ? `${rejected.length} of ${tried} equivalent forms not accepted: ${rejected.join('; ')}` : `${tried} equivalent forms accepted (${tests.slice(0, 4).map((t) => `${t.key}: ${t.forms.join(', ')}`).join(' | ')})`);
    }
  }

  /* ---- Q5 / A3 / A4: nothing teacher-only in the student file */
  {
    const hits = [];
    const visible = visibleText;
    for (const [re, what] of [[/model (answer|response)\s*:/i, 'a "Model answer:" label'], [/look[- ]?fors?\s*:|\blook for\s*:/i, 'a "Look for:" label'], [/scoring guide|rubric points?\s*:/i, 'a scoring guide'], [/typical wrong answers?\s*:/i, 'typical wrong answers']]) {
      if (re.test(visible)) hits.push(`${what} in the visible text`);
      else if (re.test(src.replace(/<script[\s\S]*?<\/script>/gi, ' '))) hits.push(`${what} in the page's markup`);   // a label inside the engine's script is only a template, not content
    }
    let leaked = [];
    if (teacher) for (const s of teacher.teacherOnly) { const k = norm(s).slice(0, 60); if (k.length >= 18 && norm(src.replace(/<[^>]+>/g, ' ')).includes(k)) leaked.push(s.slice(0, 80)); }
    if (leaked.length) hits.push(`teacher-only text in the student file: “${leaked.slice(0, 3).join('” “')}”`);
    pageNote('Q5', hits.length ? 'FAIL' : teacher ? 'PASS' : 'PASS', hits.length ? hits.join('; ') : `no model answer, look-fors or scoring guide in the student file${teacher ? ` (${teacher.teacherOnly.length} teacher-only passages checked against it)` : ' (no teacher copy to cross-check: labels only)'}`);
    pageNote('A3', hits.length ? 'FAIL' : 'PASS', hits.length ? hits.join('; ') : 'no FRQ scoring guide, model response or typical wrong answers in the student file');
    const ced = (src.replace(/<style[\s\S]*?<\/style>/gi, '').match(/\b(?:[A-Z]{3}-\d+\.[A-Z](?:\.\d+)?|(?:EK|LO)\s+\d+\.[A-Z0-9.]+)\b/g) || []).filter((c) => !/^(UTF|ISO|SHA)/.test(c));
    pageNote('A4', ced.length ? 'FAIL' : 'PASS', ced.length ? `CED-style codes in the student file: ${[...new Set(ced)].slice(0, 5).join(', ')}` : 'no CED codes in the student file');
  }

  /* ---- T1, T2: short answers and the teacher question */
  {
    const t1 = await A.ev(() => {
      const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const skip = (t) => /think|why|work|steps|notes|hint|gq|teacher|code|paste/i.test(`${t.id} ${Object.keys(t.dataset).join(' ')}`);
      const shorts = [...document.querySelectorAll('textarea')].filter((t) => vis(t) && !skip(t)).map((t) => { let box = t.parentElement; while (box && box !== document.body && !(box.id || /(^|\s)(q|card|short|prob|item)(\s|$)/.test(box.className || ''))) box = box.parentElement; const s = (box || t.parentElement).innerText || ''; const m = s.match(/at least (\d+)(?: words)?|(\d+) words? or more|(\d+)\+ words/i); return m ? +(m[1] || m[2] || m[3]) : 0; });
      const qArea = [...document.querySelectorAll('h2,h3,h4,legend,label,p,summary')].find((e) => /teacher['’]?s? question|grown-up question|question from (your|the) (teacher|grown-up)/i.test(e.innerText || ''));
      const codeBox = [...document.querySelectorAll('input,textarea')].find((e) => /code/i.test(`${e.id} ${e.placeholder} ${e.getAttribute('aria-label') || ''} ${(e.labels && e.labels[0] && e.labels[0].innerText) || ''}`) && !/save|backup|restore|load/i.test(`${e.id} ${e.placeholder} ${e.getAttribute('aria-label') || ''}`));
      return { shorts: shorts.filter((n) => n >= 12).length, shortMins: shorts.filter((n) => n > 0), hasQ: !!qArea, qText: qArea ? qArea.innerText.trim() : '', code: codeBox ? (codeBox.id || codeBox.placeholder || 'code box') : '' };
    });
    const ev = [`${t1.shorts} written answers ask for 12+ words`];
    let st = t1.shorts >= 2 ? 'PASS' : 'FAIL';
    if (t1.shorts < 2) ev.push(`needs 2 (minimums seen: ${t1.shortMins.join(', ') || 'none'})`);
    if (!t1.hasQ) { st = 'FAIL'; ev.push('no teacher question on the page'); }
    else if (teacher && teacher.question) {
      const k = norm(teacher.question).slice(0, 50);
      if (norm(src).includes(k) || norm(visibleText).includes(k)) { st = 'FAIL'; ev.push(`the teacher question is in the student file as plain text (“${teacher.question.slice(0, 60)}”)`); }
      else ev.push('the teacher question (from the teacher copy) is not in the student file as plain text');
    } else { if (st === 'PASS') st = 'CANNOT TEST'; ev.push('no teacher copy with the question: the ciphertext part is not tested'); }
    pageNote('T1', st, ev.join('; '));
    if (!t1.hasQ) pageNote('T2', 'FAIL', 'no teacher question, so no code box');
    else if (!t1.code) pageNote('T2', 'FAIL', `the teacher-question part (“${t1.qText.slice(0, 50)}”) has no code box: the student can't unlock the question on her page`);
    else if (!teacher || !teacher.code) pageNote('T2', 'CANNOT TEST', `code box "${t1.code}" found, but no code in the teacher copy to type`);
    else {
      const E = await br.open(P);
      const progress0 = await E.text();
      await E.ev(([sel, code]) => { const e = [...document.querySelectorAll('input,textarea')].find((x) => (x.id || x.placeholder) === sel); if (e) { e.value = code; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } }, [t1.code, teacher.code]);
      await E.clickButton(/^(show|unlock|open|go|use code)/);
      await E.tick(500);
      const after = await E.text();
      const shown = norm(after).includes(norm(teacher.question).slice(0, 40));
      const done = diffLines(progress0, after).some((l) => /✓|done|complete/i.test(l) && !norm(teacher.question).includes(norm(l)));
      pageNote('T2', shown && !done ? 'PASS' : 'FAIL', `${shown ? 'the code shows the question' : 'the code did not show the question'}; ${done ? 'typing the code marked something done' : 'nothing marked done'}`);
      await E.close();
    }
  }

  /* ---- T3: wrong picks stay marked after reload; the wait grows; one sentence after two misses */
  {
    const ev = [], fails = [];
    // a wrong pick on an item left unsolved, then a reload
    const target = solved.find((it) => it.opts.length >= 3) || solved[0];
    if (target) {
      const F = await br.open(P);
      const wrongK = target.opts.map((_, k) => k).find((k) => k !== info.get(target.i).right);
      const o = await F.pick(target.i, wrongK);
      const s0 = await F.storage();
      await F.reload();
      const it2 = F.items.find((x) => x.id === target.id && x.kind === target.kind) || F.items[target.i];
      const st = await F.state(it2.i);
      const fresh = st.opts.find((_, k) => k !== wrongK && k !== info.get(target.i).right) || st.opts[info.get(target.i).right];
      const marked = st.opts[wrongK] && fresh && (st.opts[wrongK].cls !== fresh.cls || st.opts[wrongK].disabled !== fresh.disabled || st.opts[wrongK].aria !== fresh.aria);
      const listed = norm(st.text).includes(norm(target.opts[wrongK].text)) && /tried|stuck|not right|so far/i.test(st.text);
      if (o.result !== 'wrong') fails.push(`could not make a wrong pick on ${target.id}`);
      else if (marked || listed) ev.push(`a wrong pick on ${target.id} (${L(wrongK)}) is still marked after reload`);
      else fails.push(`a wrong pick on ${target.id} (${L(wrongK)}) is not marked after reload`);
      // Q2e: the saved data uses the option's original number
      const s1 = await F.storage();
      const origNo = target.opts[wrongK].orig, dispNo = String(wrongK);
      const saved = JSON.stringify(s1);
      const fresh2 = await br.open(P); const before2 = JSON.stringify(await fresh2.storage()); await fresh2.close();
      let q2e = '';
      if (st.opts[wrongK] && (marked || listed)) q2e = `the saved wrong pick comes back on the same option (“${target.opts[wrongK].text.slice(0, 40)}”) after reload`;
      if (!(marked || listed)) R.set('Q2e', 'FAIL', `the saved pick on ${target.id} did not come back after reload`, P);
      else if (origNo === dispNo && !ctx.packChoices) R.set('Q2e', 'PASS', `${q2e}; the page shows options in their original-number order here, so the number mapping can't be told apart`, P);
      else R.set('Q2e', 'PASS', `${q2e} (original number ${origNo}, shown as ${L(wrongK)}); storage ${saved.length > before2.length ? 'holds the pick' : 'unchanged?'}`, P);
      void s0;
      await F.close();
    } else { R.set('Q2e', 'CANNOT TEST', 'no choice item', P); }
    // the wait: a typed item (as many misses as we like), else a choice item
    const waitItems = [...new Set([typed[0], typed[typed.length - 1]])].filter(Boolean);
    for (const wt of waitItems) {
      const G = await br.open(P); const waits = [];
      const it = G.items.find((x) => x.kind === 'typed' && x.id === wt.id) || G.items[wt.i];
      // a miss, then every second try another wrong answer; the time until one is taken is that miss's wait
      let o = await G.type(it.i, '777770'), n = 1;
      if (o.result === 'wrong') {
        let t0 = await G.ev(() => Date.now()) - 500;
        await G.afterMiss(it.i);
        while (waits.length < 6) {
          let took = false;
          for (let t = 0; t < 180 && !took; t++) {
            await G.tick(250);
            const s = await G.state(it.i); if (s.checkDisabled || /wait/i.test(s.checkText)) continue;
            const v = String(777770 + n), before = await G.state(it.i);
            o = await G.type(it.i, v);
            const now = await G.ev(() => Date.now()) - 500;
            await G.tick(1100);
            const s2 = await G.state(it.i);
            // taken = a new wait starts, or the value shows up in the tries list (a message alone can be the lock talking)
            const taken = o.result === 'wrong' && (s2.checkDisabled || /wait/i.test(s2.checkText) || (s2.text.includes(v) && !before.text.includes(v)));
            if (process.env.ISTD_DEBUG) console.error("attempt", (now - t0) / 1000, o.result, s2.checkDisabled, s2.checkText, JSON.stringify(s2.text.slice(-160)));
            if (taken) { took = true; waits.push((now - t0) / 1000); t0 = now; n++; await G.afterMiss(it.i); }
          }
          if (!took) break;
        }
      }
      await G.close();
      const w = waits.map((x) => Math.round(x * 2) / 2);
      ev.push(`${wt.id}: waits after misses 1–${w.length}: ${w.join(', ')} s`);
      if (w.length < 2) fails.push(`${wt.id}: ` + 'could not measure the waits');
      else {
        if (!(w[0] >= 4 && w[0] <= 6)) fails.push(`${wt.id}: ` + `the first wait is ${w[0]} s, not 5 s`);
        if (w.some((x, k) => k && x < w[k - 1] - 1)) fails.push(`${wt.id}: ` + 'a wait got shorter');
        if (!w.some((x, k) => k && x > w[k - 1] + 1)) fails.push(`${wt.id}: ` + 'the wait never grows');
        if (Math.max(...w) > 21) fails.push(`${wt.id}: ` + `a wait of ${Math.max(...w)} s (cap is 20 s)`);
        if (w.length >= 5 && Math.max(...w) < 15) fails.push(`${wt.id}: ` + `after ${w.length} misses the wait is still ${w[w.length - 1]} s (it should grow toward 20 s)`);
      }
    }
    if (!waitItems.length) ev.push('no typed item: the wait growth was not measured');
    // one sentence after two misses
    const prompts = [...info.values()].map((r) => r.thinkPrompt).filter(Boolean);
    if (prompts.length) { const okp = prompts.filter((p) => /what (are|were) you thinking|what you['’]?(re| are| were) thinking|write (one|a) sentence|in a sentence/i.test(p)); if (okp.length) ev.push(`after two misses: “${okp[0].replace(/\s+/g, ' ').slice(0, 80)}”`); else fails.push(`the box after two misses doesn't ask for a sentence: “${prompts[0].slice(0, 60)}”`); }
    else fails.push('no "write what you were thinking" box appeared after two misses');
    pageNote('T3', fails.length ? 'FAIL' : 'PASS', [...fails, ...ev].join('; '));
  }

  /* ---- S1, S3, N2, N3 on the lesson page */
  {
    const H = await br.open(P);
    const notesBox = await H.ev(() => {
      const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const all = [...document.querySelectorAll('textarea')].filter((t) => /notes/i.test(`${t.id} ${Object.entries(t.dataset).join(' ')} ${t.getAttribute('aria-label') || ''} ${(t.labels && t.labels[0] && t.labels[0].innerText) || ''}`) || /my notes|own notes|notes/i.test(((t.closest('details,section') || {}).querySelector || (() => null)).call(t.closest('details,section') || document, 'summary,h2,h3') ?.innerText || ''));
      const t = all[0]; if (!t) return null;
      t.dataset.istdNotes = '1';
      const det = t.closest('details'); const toggler = document.querySelector(`[aria-controls="${(t.closest('[id]') || {}).id}"]`) || (t.closest('[id]') && [...document.querySelectorAll('[aria-expanded]')].find((b) => b.getAttribute('aria-controls') === t.closest('[id]').id));
      return { collapsible: !!det || !!toggler, visible: vis(t), how: det ? 'details' : toggler ? 'aria-expanded' : 'always open' };
    });
    if (!notesBox) R.set('N2', 'FAIL', 'no own-notes box on the page', P);
    else if (!notesBox.collapsible) R.set('N2', 'FAIL', `the own-notes box is ${notesBox.how}, not collapsible`, P);
    else R.set('N2', 'PASS', `own-notes box (${notesBox.how})`, P);
    const stuckHere = /where i got stuck/i.test(await H.text());
    // autosave: a note and an unchecked typed answer, no button pressed
    const NOTE = 'Remember: the pieces under the bar add up to the whole bar.';
    if (notesBox) { if (!notesBox.visible) await H.ev(() => { const t = document.querySelector('[data-istd-notes]'); const d = t.closest('details'); if (d) d.open = true; }); await H.frame.fill('[data-istd-notes]', NOTE).catch(() => {}); }
    const ty = H.items.find((x) => x.kind === 'typed');
    if (ty) await H.frame.fill(`[data-istd-in="${ty.i}"]`, '4242');
    await H.tick(3000);
    const savedLine = (await H.text()).match(/saved automatically at[^\n]*/i);
    await H.reload();
    const back = await H.ev((tyId) => { const t = document.querySelector('[data-istd-notes]') || [...document.querySelectorAll('textarea')].find((x) => /notes/i.test(x.id + Object.keys(x.dataset).join(' '))); const inp = tyId ? document.getElementById(tyId) : null; return { note: t ? t.value : null, typed: inp ? inp.value : null }; }, ty ? ty.inputId : null);
    const s1 = [], s1ok = [];
    if (notesBox) { if (back.note === NOTE) s1ok.push('a note typed and left comes back after reload'); else s1.push('a typed note did not come back after reload'); }
    if (ty && ty.inputId) { if (back.typed === '4242') s1ok.push('an unchecked typed answer comes back'); else s1.push('an unchecked typed answer did not come back after reload'); }
    if (savedLine) s1ok.push(`“${savedLine[0].trim().slice(0, 50)}”`); else s1.push('no "Saved automatically at…" line');
    R.set('N3', notesBox && back.note === NOTE ? 'PASS' : 'FAIL', notesBox ? (back.note === NOTE ? 'own notes typed as she goes are kept' : 'own notes are not kept after reload') : 'no own-notes box', P);
    // backup file and save code: on this page, else on the unit's notes page or hub (same device)
    const toolPages = [P, T.notes, T.hub].filter(Boolean);
    let backup = null, code = null;
    for (const tp of toolPages) {
      if (tp !== P) await H.load(tp);
      if (!backup) {
        const label = (await H.buttons(/backup|download.*(save|work)|save (a |my )?(backup|file)|export/))[0];
        if (label) {
          const dl = H.page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
          await H.clickButton(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
          await H.tick(500);
          const d = await dl; if (d) { const f = path.join(ctx.tmp, `backup-${Date.now()}.bak`); await d.saveAs(f); backup = { page: tp, label, file: f }; }
        }
      }
      if (!code) {
        const lab = (await H.buttons(/save code|get (a |my )?code|make (a )?code|copy (my )?code|show (my )?code/))[0];
        if (lab) {
          const before = await H.ev(() => [...document.querySelectorAll('textarea,input')].map((e) => e.value));
          await H.clickButton(new RegExp(lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); await H.tick(500);
          const after = await H.ev(() => [...document.querySelectorAll('textarea,input,code,pre,output')].map((e) => e.value || e.textContent || ''));
          const c = after.find((v, k) => v && v.length >= 16 && v !== before[k] && !/\s{2}/.test(v.slice(0, 20)));
          if (c) code = { page: tp, label: lab, code: c };
        }
      }
    }
    // restore both on a cleared device
    const restoreCheck = async (how) => {
      const I = await br.open(how.page);
      I.page.on('dialog', (d) => d.accept().catch(() => {}));
      await I.setStorage({});
      await I.reload();
      let ok = false;
      if (how.file) { const inp = await I.frame.$('input[type=file]'); if (inp) { await inp.setInputFiles(how.file); await I.tick(800); ok = true; } }
      else {
        ok = await I.ev((code) => { const t = [...document.querySelectorAll('textarea,input')].find((e) => /paste|code|restore|load/i.test(`${e.id} ${e.placeholder} ${e.getAttribute('aria-label') || ''}`) && !e.readOnly); if (!t) return false; t.value = code; t.dispatchEvent(new Event('input', { bubbles: true })); return true; }, how.code);
        if (ok) { if (!(await I.clickButton(/load (a |my )?(save )?code|restore (from )?(a |the )?code|use (this|the|my) code/))) await I.clickButton(/^\W*(load|restore|bring back)\b(?!.*file)/); await I.tick(800); }
      }
      await I.load(P);
      const v = await I.ev(() => { const t = [...document.querySelectorAll('textarea')].find((x) => /notes/i.test(x.id + Object.keys(x.dataset).join(' '))); return t ? t.value : null; });
      await I.close();
      return ok && v === NOTE;
    };
    if (backup) { if (await restoreCheck(backup)) s1ok.push(`backup file (“${backup.label}” on ${backup.page}) restores the work on a cleared device`); else s1.push(`backup file (“${backup.label}” on ${backup.page}) did not restore the note on a cleared device`); }
    else s1.push(`no backup-file button on ${toolPages.join(' or ')}`);
    if (code) { if (await restoreCheck(code)) s1ok.push(`save code (“${code.label}”) round-trips`); else s1.push(`the save code (“${code.label}” on ${code.page}) did not bring the note back`); }
    else s1.push(`no save-code button on ${toolPages.join(' or ')}`);
    R.set('S1', s1.length ? 'FAIL' : 'PASS', [...s1, ...s1ok].join('; '), P);
    await H.close();

    // S3: a save from a build with fewer questions: remove one answered item's record, add an unknown key
    const J = await br.open(P);
    const two = solved.slice(0, 2);
    for (const it of two) { const it2 = J.items.find((x) => x.id === it.id) || J.items[it.i]; await J.pick(it2.i, info.get(it.i).right); }
    if (notesBox) await J.frame.fill('[data-istd-notes]', NOTE).catch(() => {});
    await J.tick(2000);
    const store = await J.storage();
    const keyHit = Object.entries(store).find(([, v]) => two.length === 2 && two[1].id && v.includes(two[1].id.replace(/^(box|q|prob)-/, '')));
    if (!two.length || two.length < 2) R.set('S3', 'CANNOT TEST', 'needs two choice items answered', P);
    else if (store.__error) R.set('S3', 'CANNOT TEST', 'storage not readable', P);
    else if (!keyHit) R.set('S3', 'CANNOT TEST', 'could not find the saved record of an answered item in storage (not JSON, or ids not in it)', P);
    else {
      let o; try { o = JSON.parse(keyHit[1]); } catch { o = null; }
      if (!o) R.set('S3', 'CANNOT TEST', 'the save is not JSON', P);
      else {
        const qid = two[1].id.replace(/^(box|q|prob)-/, '');
        const strip = (x) => { if (x && typeof x === 'object') { for (const k of Object.keys(x)) { if (k === qid) delete x[k]; else strip(x[k]); } } return x; };
        const older = strip(structuredClone(o)); older.__fromOlderBuild = { keep: 'me' };
        await J.setStorage({ ...store, [keyHit[0]]: JSON.stringify(older) });
        await J.reload();
        const errs = await J.pageErrors();
        const f1 = J.items.find((x) => x.id === two[0].id), f2 = J.items.find((x) => x.id === two[1].id);
        const s1st = f1 && await J.state(f1.i), s2st = f2 && await J.state(f2.i);
        const firstKept = s1st && RIGHT_RE.test(s1st.text) || (s1st && s1st.opts.some((x) => /(^|\s)(ok|right|correct)(\s|$)/.test(x.cls)));
        const secondDefault = s2st && !(s2st.opts.some((x) => /(^|\s)(ok|right|correct)(\s|$)/.test(x.cls)));
        // make a change so the page saves, then see whether anything was cleared
        const ty2 = J.items.find((x) => x.kind === 'typed'); if (ty2) await J.frame.fill(`[data-istd-in="${ty2.i}"]`, '5'); if (notesBox) await J.frame.fill('[data-istd-notes]', NOTE + ' More.').catch(() => {});
        await J.tick(2500);
        const st2 = await J.storage(); let o2 = null; try { o2 = JSON.parse(st2[keyHit[0]] || 'null'); } catch {}
        const keptUnknown = o2 && o2.__fromOlderBuild && o2.__fromOlderBuild.keep === 'me';
        const problems = [];
        if (errs.length) problems.push(`page errors: ${errs[0]}`);
        if (!firstKept) problems.push(`the answer still in the save (${two[0].id}) was not shown`);
        if (!secondDefault) problems.push(`the item missing from the save (${two[1].id}) did not start from its default`);
        if (!keptUnknown) problems.push('a field the page doesn\'t know (from another build) was dropped on the next save');
        R.set('S3', problems.length ? 'FAIL' : 'PASS', problems.length ? problems.join('; ') : 'a save with one item fewer loads: the old answer shows, the new item starts fresh, and an unknown field survives the next save', P);
      }
    }
    await J.close();
    ctx.stuck.push({ page: P, here: stuckHere });
  }

  /* ---- SB: storage blocked */
  {
    const K = await br.open(P, { sandbox: SANDBOX_NO_STORAGE });
    const t = await K.text(); const errs = await K.pageErrors();
    const told = /block\w*\s+(saving|storage)|(sav|stor)\w*[^.\n]{0,60}(blocked|off|turned off|isn['’]t|not (be )?(saved|working|available)|can['’]?t|won['’]t)|private (mode|window)|won['’]t be saved|not saving/i.test(t);
    const it = K.items.find((x) => x.kind === 'mc' || x.kind === 'tf');
    let works = 'no choice item to try';
    if (it) { const o = await K.pick(it.i, 0); works = o.result === 'none' ? 'a choice gave no mark' : `a choice is still checked (${o.result})`; }
    const bad = errs.length || !told || /no mark/.test(works);
    R.set('SB', bad ? 'FAIL' : 'PASS', `${told ? 'the page says saving is off' : 'the page does not tell the student saving is off'}; ${works}${errs.length ? `; page error: ${errs[0]}` : ''}`, P);
    await K.close();
  }

  /* ---- N4: print */
  {
    const M = await br.open(P, { print: true });
    const pr = await M.ev(() => {
      const vis = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length); };
      const buttons = [...document.querySelectorAll('button, [role=button]')].filter(vis).map((b) => (b.innerText || '').trim()).filter(Boolean);
      const side = [...document.querySelectorAll('nav, aside, .sidebar, [role=navigation]')].filter(vis).length;
      return { buttons, side, text: document.body.innerText };
    });
    const nameDate = pr.text.split('\n').some((l) => /\bname\b.*\bdate\b/i.test(l)) || (/\bname\s*[:_]/i.test(pr.text) && /\bdate\s*[:_]/i.test(pr.text));
    const p = [];
    if (pr.buttons.length) p.push(`${pr.buttons.length} button(s) still print (${pr.buttons.slice(0, 4).join(', ')})`);
    if (pr.side) p.push('the sidebar still prints');
    if (!nameDate) p.push('no Name/Date line to fill in by hand');
    R.set('N4', p.length ? 'FAIL' : 'PASS', p.length ? p.join('; ') : 'print hides buttons and the sidebar and shows Name/Date', P);
    await M.close();
  }

  /* ---- D1, D2, L2, L3, L6, L7, L8 */
  {
    const tail = visibleText.trim().split('\n').slice(-15).join('\n');
    const b = tail.match(/build\s+\d+[^\n]*/i);
    if (!b) R.set('D1', 'FAIL', 'no "Build N" line at the bottom of the page', P);
    else if (!/build\s+\d+\s*[(:—–-]\s*\S|build\s+\d+\s*\(.+\)/i.test(b[0])) R.set('D1', 'FAIL', `“${b[0].trim()}” says no what-changed`, P);
    else R.set('D1', 'PASS', `“${b[0].trim().slice(0, 70)}”`, P);

    const hashLinks = await A.ev(() => [...document.querySelectorAll('a[href^="#/"]')].map((a) => a.getAttribute('href')));
    if (!hashLinks.length) R.set('D2', 'PASS', 'no #/ links (not applicable)', P);
    else {
      const S = await br.open(P, { srcdoc: true });
      const t0 = await S.text();
      await S.ev((h) => { const a = document.querySelector(`a[href="${h}"]`); if (a) a.click(); }, hashLinks[0]);
      await S.tick(500);
      const fr = S.page.frames().find((f) => f !== S.page.mainFrame());
      const stillHere = fr && (await fr.evaluate(() => document.title).catch(() => '')) !== 'host' && !(await fr.evaluate(() => !!document.getElementById('fr')).catch(() => true));
      const t1 = stillHere ? await fr.evaluate(() => document.body.innerText).catch(() => '') : '';
      R.set('D2', stillHere ? 'PASS' : 'FAIL', stillHere ? `“${hashLinks[0]}” works in a srcdoc frame${t1 === t0 ? ' (the view did not change)' : ''}` : `“${hashLinks[0]}” navigates the srcdoc frame away from the page`, P);
      await S.close();
    }

    const mins = await A.ev(() => [...document.querySelectorAll('h1,h2,h3,h4,summary,legend,.min')].map((h) => h.innerText.replace(/\s+/g, ' ')).filter((t) => /\b(about|~)\s*\d+\s*min/i.test(t)));
    const parts = mins.map((t) => ({ t, n: +t.match(/(?:about|~)\s*(\d+)\s*min/i)[1], opt: /optional|extra|bonus/i.test(t) }));
    const uniq = []; for (const x of parts) if (!uniq.some((u) => u.t === x.t)) uniq.push(x);
    const req = uniq.filter((x) => !x.opt).reduce((s, x) => s + x.n, 0);
    const total = visibleText.match(/about\s+(\d+)\s+minutes[^\n]*/i);
    if (!uniq.length) R.set('L2', 'FAIL', `no required-minute estimates on the page${total ? ` (only “${total[0].slice(0, 60)}”)` : ''}`, P);
    else R.set('L2', req >= 35 && req <= 45 ? 'PASS' : 'FAIL', `required parts add up to ${req} min (${uniq.filter((x) => !x.opt).length} parts), optional parts: ${uniq.filter((x) => x.opt).length}${total ? `; the page says “${total[0].trim().slice(0, 60)}”` : ''}${/plus the video/i.test(total ? total[0] : '') ? ' (the video has no minutes, so it is not counted)' : ''}; whether optional parts block finishing is not tested`, P);

    const mech = await A.ev(() => {
      const d = [...document.querySelectorAll('[data-mechanic]')].map((e) => e.dataset.mechanic);
      if (d.length) return { from: 'data-mechanic', list: d };
      const vocab = [[/simulat/i, 'simulate'], [/\bsort/i, 'sort'], [/\bbuild\b/i, 'build'], [/predict/i, 'predict-then-reveal'], [/find the (mistake|error)|spot the (mistake|mix-?up|error)/i, 'find-the-mistake'], [/slider/i, 'slider hunt']];
      const hs = [...document.querySelectorAll('h2,h3')].map((h) => h.innerText);
      const list = []; for (const h of hs) { const m = vocab.find(([re]) => re.test(h)); if (m) list.push(m[1]); }
      return { from: 'headings', list, headings: hs.length };
    });
    if (mech.from === 'data-mechanic') { const rep = mech.list.findIndex((m, k) => k && m === mech.list[k - 1]); const n = new Set(mech.list).size; R.set('L3', n >= 3 && rep < 0 ? 'PASS' : 'FAIL', `mechanics: ${mech.list.join(' → ')}${n < 3 ? ' (fewer than 3 kinds)' : ''}${rep >= 0 ? ` (${mech.list[rep]} twice in a row)` : ''}`, P); }
    else if (!mech.list.length) R.set('L3', 'CANNOT TEST', `the page names no mechanic (no data-mechanic, and none of simulate / sort / build / predict / find the mistake / slider in its ${mech.headings} headings)`, P);
    else { const n = new Set(mech.list).size; R.set('L3', n >= 3 ? 'PASS' : 'FAIL', `mechanics named in the headings: ${mech.list.join(' → ')}${n < 3 ? ` (${n} kind${n === 1 ? '' : 's'}; needs 3)` : ''}`, P); }

    if (ctx.blanks) {
      const mine = ctx.blanks.filter((b) => !b.page || b.page === P);
      const fills = await A.ev(() => [...document.querySelectorAll('input[type=text], input:not([type])')].map((i) => (i.parentElement.innerText || '').replace(/\s+/g, ' ')));
      const miss = mine.filter((b) => { const [before] = String(b.text).split(/_{2,}/); const k = norm(before).slice(-30); return !fills.some((f) => norm(f).includes(k)); });
      R.set('L6', miss.length ? 'FAIL' : 'PASS', miss.length ? `${miss.length} of ${mine.length} source blanks are not fill-ins: ${miss.slice(0, 4).map((b) => `“${b.text.slice(0, 50)}”`).join(', ')}` : `all ${mine.length} source blanks are fill-ins`, P);
    } else R.set('L6', 'CANNOT TEST', 'no source blank inventory given (--blanks)', P);

    const rules = await A.ev(() => {
      const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const cards = [...document.querySelectorAll('[data-rule], .rule, .rule-card, section, details, div.card')].filter((e) => /^\s*(\S+\s+)?(the )?rule\b|rule card/i.test((e.querySelector('h2,h3,summary') || {}).innerText || '') || e.dataset.rule != null);
      return cards.map((c) => ({ text: (c.innerText || '').slice(0, 80), locked: /🔒|locked|unlock/i.test(c.innerText || '') || !vis(c) || c.hasAttribute('hidden') }));
    });
    const labs = /\blab\b/i.test(visibleText);
    if (!rules.length) R.set('L7', 'FAIL', `no rule card on the page${labs ? '' : ' and no labs'} (the L1 structure is missing)`, P);
    else R.set('L7', rules.every((r) => r.locked) ? 'PASS' : 'FAIL', rules.every((r) => r.locked) ? `${rules.length} rule card(s) locked until the labs are done` : `rule card open before the labs: “${rules.find((r) => !r.locked).text.replace(/\s+/g, ' ')}”`, P);
    const locks = visibleText.split('\n').filter((l) => /🔒|\blocked\b/i.test(l));
    R.set('L8', locks.length ? 'FAIL' : 'PASS', locks.length ? `locked on a fresh device: ${locks.slice(0, 3).join(' | ')}` : 'nothing locked on a fresh device', P);
  }

  /* ---- K1: no outside requests, no page errors */
  const errs = await A.pageErrors();
  if (errs.length) pageNote('K1', 'FAIL', `page errors: ${errs.slice(0, 3).join(' | ')}`);
  await A.close(); await B.close();
  ctx.info.push({ page: P, info, filled, teacher });
}

/* ---------------------------------------------------------------- the teacher copy */
async function readTeacher(br, T, lesson, studentItems, studentText) {
  const name = `__teacher__${lesson.name}`;
  br.extra[name] = lesson.teacher;
  const X = await br.open(name);
  const t0 = await X.text();
  const store0 = JSON.stringify(await X.storage());
  const out = { typed: new Map(), blanks: new Map(), teacherOnly: [], question: '', code: '', c: {} };
  // letter keys never toggle
  const key = async (k) => { await X.frame.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => {}); await X.page.keyboard.press(k); };
  for (const k of ['a', 's', 'A', 'b', 'Shift+A']) await key(k);
  await X.tick(300);
  const tLetters = await X.text();
  await key('F2');
  await X.tick(400);
  const t1 = await X.text();
  const toggled = t1 !== t0;
  await key('F2');
  await X.tick(400);
  const t2 = await X.text();
  out.c.letters = tLetters === t0;
  out.c.f2 = toggled; out.c.f2back = norm(t2) === norm(t0);
  // the answers view
  if (toggled) { await key('F2'); await X.tick(400); }
  const view = toggled ? t1 : t0;
  const added = diffLines(t0, view);
  // teacher-only text for Q5: what follows a "Model answer" / "Look for" / scoring label in the answers view
  const src5 = toggled ? added : diffLines(studentText, view);
  out.teacherOnly = [];
  for (let n = 0, inLook = 0; n < src5.length; n++) {
    const l = src5[n];
    if (/^(model (answer|response)|sample answer|scoring guide|typical wrong)/i.test(l)) { const rest = l.replace(/^[^:]*:\s*/, ''); if (words(rest) >= 4) out.teacherOnly.push(rest); inLook = /typical|scoring/i.test(l) ? 6 : 0; continue; }
    if (/^look[- ]?fors?\b|^look for\s*:?$/i.test(l)) { inLook = 6; continue; }
    if (inLook > 0) { if (/:\s*$/.test(l) || /^(question|model)/i.test(l)) { inLook = 0; continue; } if (words(l) >= 3) out.teacherOnly.push(l); inLook--; }
  }
  const q = view.match(/(?:^|\n)\s*(?:teacher|grown-up)?\s*question\s*:\s*([^\n]+)/i);
  if (q) out.question = q[1].trim();
  const code = view.match(/\bcode\s*[:#]\s*([A-Z0-9][A-Z0-9-]{3,})/i);
  if (code) out.code = code[1];
  const vals = await X.ev(() => { const out = { typed: {}, blanks: {} }; for (const i of document.querySelectorAll('input[type=text], input:not([type])')) { if (!i.id || !i.value) continue; (i.dataset.blank != null || /(^|\s)(bl|blank)(\s|$)/.test(i.className) ? out.blanks : out.typed)[i.id] = i.value; } return out; });
  // the student's typed item id is the item container's id (box-p1) or the input's id: map both
  for (const it of studentItems.filter((x) => x.kind === 'typed')) { const v = vals.typed[it.inputId]; if (v) out.typed.set(it.id, v); }
  for (const it of studentItems.filter((x) => x.kind === 'blank')) { const v = vals.blanks[it.id]; if (v) out.blanks.set(it.id, v); }
  // C2: the right option, marked by its original number, in the answers view (the page may have re-drawn: tag it again)
  X.items = await X.ev(PAGE_FNS.discover);
  out.marked = await X.ev(() => [...document.querySelectorAll('[data-istd-opt]')].map((o) => { const el = o.tagName === 'INPUT' ? (o.closest('label') || o) : o; const s = getComputedStyle(el); return { opt: o.dataset.istdOpt, orig: o.dataset.j ?? o.dataset.orig ?? (o.tagName === 'INPUT' ? o.value : null), text: (el.innerText || '').replace(/\s+/g, ' ').trim().replace(/^[A-H][.)]\s*/, ''), cls: el.className, checked: !!o.checked, bold: +s.fontWeight >= 600 || /answer|key|correct|right|ok/.test(el.className) }; }));
  out.items = X.items;
  // C3: what is still interactive
  out.controls = await X.ev(() => { const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length); return [...document.querySelectorAll('button, input, textarea, select, [contenteditable=true]')].filter((e) => vis(e) && !e.disabled && !e.readOnly && !(e.type === 'hidden')).map((e) => (e.tagName === 'BUTTON' ? (e.innerText || '').trim() : `${e.tagName.toLowerCase()}${e.type ? '[' + e.type + ']' : ''}#${e.id || ''}`) || e.tagName.toLowerCase()); });
  out.storeChanged = JSON.stringify(await X.storage()) !== store0;
  out.text = view;
  await X.close();
  return out;
}

function teacherRules(R, P, lesson, data, studentItems) {
  if (!lesson.teacher) { for (const id of ['C1', 'C2', 'C3']) R.set(id, 'FAIL', 'no teacher copy for this page', P); return; }
  const t = data.teacher;
  if (!t) return;
  const sItems = studentItems.filter((x) => x.kind === 'mc' || x.kind === 'tf');
  const core = (x) => norm(x).replace(/^[a-z]?\d*[.)]\s*/, '').replace(/level \d.*$/, '').slice(0, 30);
  const missing = sItems.filter((it) => !norm(t.text).includes(core(it.prompt)));
  const sameOrder = sItems.filter((it) => { const ti = t.items.find((x) => x.opts && x.opts.map((o) => norm(o.text)).sort().join('|') === it.opts.map((o) => norm(o.text)).sort().join('|')); return ti && ti.opts.map((o) => norm(o.text)).join('|') === it.opts.map((o) => norm(o.text)).join('|'); }).length;
  R.set('C1', missing.length ? 'FAIL' : 'PASS', missing.length ? `${missing.length} student item(s) not in the teacher copy: ${missing.slice(0, 3).map((x) => x.prompt.slice(0, 40)).join('; ')}` : `every student item is in the teacher copy; ${t.items.some((x) => x.opts) ? `${sameOrder} of ${sItems.length} choice items in the same order` : 'the teacher copy has no choice controls (a static key)'} (that it is generated by script is for a reviewer)`, P);
  const c2 = [], c2ok = [];
  if (!t.c.f2) c2.push('F2 does not switch the teacher copy between answers and blank');
  else { c2ok.push('F2 switches'); if (!t.c.f2back) c2.push('a second F2 does not go back to blank'); }
  if (!t.c.letters) c2.push('a letter key changed the teacher copy');
  if (/show answers|show blank/i.test(t.text) || t.c.f2) c2ok.push('labelled'); else c2.push('no Show ANSWERS / Show BLANK label');
  // the right option: marked in the teacher copy, and the same one the student page marks right
  const info = data.info;
  let agree = 0, disagree = [], unmarked = 0;
  for (const it of sItems) {
    const rec = info.get(it.i); if (!rec || rec.right == null) continue;
    const ti = t.items.find((x) => x.opts && x.opts.map((o) => norm(o.text)).sort().join('|') === it.opts.map((o) => norm(o.text)).sort().join('|'));
    if (!ti) { unmarked++; continue; }
    const marks = t.marked.filter((m) => m.opt.startsWith(`${ti.i}:`) && m.bold);
    const others = t.marked.filter((m) => m.opt.startsWith(`${ti.i}:`) && !m.bold);
    if (marks.length !== 1 || !others.length) { unmarked++; continue; }
    const want = it.opts[rec.right];
    if (norm(marks[0].text) === norm(want.text) && (marks[0].orig == null || String(marks[0].orig) === String(want.orig))) agree++; else disagree.push(`${it.id}: teacher marks “${marks[0].text.slice(0, 30)}” (#${marks[0].orig}), the student page accepts “${want.text.slice(0, 30)}” (#${want.orig})`);
  }
  if (disagree.length) c2.push(`teacher copy and student page disagree: ${disagree.slice(0, 3).join('; ')}`);
  if (unmarked && !agree) c2.push(`the right option is not marked in ${unmarked} choice item(s)`);
  else if (agree) c2ok.push(`the right option is marked by its original number in ${agree} of ${sItems.length} choice items`);
  R.set('C2', c2.length ? 'FAIL' : 'PASS', [...c2, ...c2ok].join('; '), P);
  const extra = t.controls.filter((c) => !/^reset( lesson)?$/i.test(c) && !/show (answers|blank)/i.test(c));
  R.set('C3', extra.length ? 'FAIL' : 'PASS', extra.length ? `${extra.length} interactive control(s) besides Reset lesson: ${[...new Set(extra)].slice(0, 8).join(', ')}` : 'display-only except Reset lesson', P);
}

/* ---------------------------------------------------------------- N1: the My notes page */
async function notesRules(br, T, R, ctx) {
  const pages = ctx.info;
  if (!T.notes) {
    const inPage = pages.some((p) => false);
    void inPage;
    // a single page: is there a "My notes" view in its navigation?
    const A = await br.open(T.lessons[0].name);
    const nav = await A.ev(() => [...document.querySelectorAll('nav a, aside a, [role=navigation] a, a[href^="#/"], [data-nav], [role=tab]')].map((a) => (a.innerText || '').trim()).filter(Boolean));
    await A.close();
    if (!nav.length || !/my notes/i.test(nav[nav.length - 1])) { R.set('N1', 'FAIL', nav.length ? `the navigation ends with “${nav[nav.length - 1]}”, not My notes` : 'no navigation and no My notes page'); return; }
  }
  // order: the last navigation entry pointing at a lesson or the notes page is My notes
  const where = T.hub || T.lessons[0].name;
  const H = await br.open(where);
  const links = await H.ev(() => [...document.querySelectorAll('a[href], [data-nav], [role=tab]')].map((a) => ({ href: a.getAttribute('href') || '', text: (a.innerText || '').replace(/\s+/g, ' ').trim() })));
  await H.close();
  const lessonNames = new Set(T.lessons.map((l) => l.name));
  const navLinks = links.filter((l) => lessonNames.has(l.href.replace(/^\.\//, '').split('#')[0]) || (T.notes && l.href.replace(/^\.\//, '').split('#')[0] === T.notes) || /^#\//.test(l.href));
  const lastLesson = navLinks.map((l) => lessonNames.has(l.href.replace(/^\.\//, '').split('#')[0])).lastIndexOf(true);
  const notesIdx = navLinks.findIndex((l) => (T.notes && l.href.replace(/^\.\//, '').split('#')[0] === T.notes) || /my notes/i.test(l.text));
  const ev = [], fails = [];
  if (notesIdx < 0) fails.push(`no link to the My notes page on ${where}`);
  else if (notesIdx < lastLesson) fails.push(`on ${where}, My notes (“${navLinks[notesIdx].text.slice(0, 30)}”) comes before lesson “${navLinks[lastLesson].text.slice(0, 30)}”`);
  else ev.push(`My notes is the last navigation entry on ${where}`);
  // contents, on a device that did lesson 1's work
  const L1 = pages[0];
  if (L1) {
    const N = await br.open(T.lessons[0].name);
    const solvedHere = [];
    for (const [, rec] of L1.info) {
      if (rec.right == null) continue;
      const it = N.items.find((x) => x.id === rec.it.id && x.kind === rec.it.kind); if (!it) continue;
      if (rec.it.kind === 'typed') { const o = await N.type(it.i, rec.right); if (o.result === 'right') solvedHere.push({ ans: rec.right, explain: rec.explain }); }
      else { const o = await N.pick(it.i, rec.right); if (o.result === 'right') solvedHere.push({ ans: rec.it.opts[rec.right].text, explain: rec.explain }); }
      if (solvedHere.length >= 4) break;
    }
    const blanks = N.items.filter((x) => x.kind === 'blank'); const filled = [];
    for (const b of blanks.slice(0, 3)) { const v = L1.teacher && L1.teacher.blanks.get(b.id); if (v) { await N.type(b.i, v, { blank: true }); filled.push(v); } }
    await N.tick(2000);
    if (T.notes) await N.load(T.notes); else await N.ev(() => { const a = [...document.querySelectorAll('a, [data-nav], [role=tab]')].find((x) => /my notes/i.test(x.innerText || '')); if (a) a.click(); });
    await N.tick(800);
    const nt = norm(await N.text());
    const ansMissing = solvedHere.filter((s) => !nt.includes(norm(s.ans).slice(0, 40)));
    const exMissing = solvedHere.filter((s) => s.explain && !nt.includes(norm(s.explain).slice(0, 40)));
    const blankMissing = filled.filter((v) => !nt.includes(norm(v)));
    const hints = [...L1.info.values()].map((r) => r.hint).filter((h) => h && !/^\(in the page/.test(h)).filter((h) => nt.includes(norm(h).slice(0, 40)));
    const models = (L1.teacher ? L1.teacher.teacherOnly : []).filter((s) => /model|look for/i.test(s) && nt.includes(norm(s.replace(/^.*?:\s*/, '')).slice(0, 40)));
    if (!solvedHere.length) fails.push('could not answer anything to look for on the notes page');
    if (ansMissing.length) fails.push(`${ansMissing.length} of ${solvedHere.length} right answers missing from My notes (e.g. “${ansMissing[0].ans.slice(0, 40)}”)`);
    if (exMissing.length) fails.push(`${exMissing.length} explanations missing from My notes (e.g. “${exMissing[0].explain.slice(0, 50)}”)`);
    if (blankMissing.length) fails.push(`${blankMissing.length} of ${filled.length} filled blanks missing from My notes`);
    if (hints.length) fails.push(`a hint is on My notes: “${hints[0].slice(0, 50)}”`);
    if (models.length) fails.push('a model answer is on My notes');
    if (!ansMissing.length && solvedHere.length) ev.push(`My notes holds the ${solvedHere.length} right answers${exMissing.length ? '' : ' and their explanations'}${filled.length && !blankMissing.length ? ` and ${filled.length} filled blanks` : ''}`);
    // "where I got stuck" records a wrong try (N2)
    const st = await N.text();
    const stuckOn = /where i got stuck/i.test(st);
    await N.close();
    const W = await br.open(T.lessons[0].name);
    const it = W.items.find((x) => x.kind === 'typed');
    let recorded = null;
    if (it) { await W.type(it.i, '313131'); await W.tick(1500); if (T.notes) await W.load(T.notes); recorded = (await W.text()).includes('313131'); }
    else { const c = W.items.find((x) => x.kind === 'mc' && L1.info.get(x.i) && L1.info.get(x.i).right != null); if (c) { const k = c.opts.findIndex((_, j) => j !== L1.info.get(c.i).right); await W.pick(c.i, k); await W.tick(1500); if (T.notes) await W.load(T.notes); recorded = norm(await W.text()).includes(norm(c.opts[k].text).slice(0, 30)); } }
    await W.close();
    const stuckAny = stuckOn || ctx.stuck.some((s) => s.here);
    if (!stuckAny) R.set('N2', 'FAIL', 'no "Where I got stuck" list on the lesson or notes page');
    else if (recorded === false) R.set('N2', 'FAIL', '"Where I got stuck" did not record a wrong try');
    else R.set('N2', 'PASS', `"Where I got stuck" ${recorded ? 'records a wrong try' : 'is there'}`);
  }
  R.set('N1', fails.length ? 'FAIL' : 'PASS', [...fails, ...ev].join('; '));
  // N2 on the notes page and hub too: an own-notes box on every page
  for (const extra of [T.notes, T.hub].filter(Boolean)) {
    const E = await br.open(extra);
    const has = await E.ev(() => [...document.querySelectorAll('textarea')].some((t) => /notes/i.test(`${t.id} ${Object.entries(t.dataset).join(' ')} ${t.getAttribute('aria-label') || ''}`) && (t.closest('details') || document.querySelector('[aria-expanded]'))));
    if (!has) R.set('N2', 'FAIL', 'no collapsible own-notes box', extra);
    for (const [id] of [['D1']]) { const tail = (await E.text()).trim().split('\n').slice(-15).join('\n'); const b = tail.match(/build\s+\d+[^\n]*/i); if (!b) R.set(id, 'FAIL', 'no "Build N" line at the bottom', extra); else if (!/build\s+\d+\s*[(:—–-]\s*\S/i.test(b[0])) R.set(id, 'FAIL', `“${b[0].trim()}” says no what-changed`, extra); }
    const locks = (await E.text()).split('\n').filter((l) => /🔒|\blocked\b/i.test(l));
    if (locks.length) R.set('L8', 'FAIL', `locked on a fresh device: ${locks.slice(0, 3).join(' | ')}`, extra);
    await E.close();
  }
}

/* ---------------------------------------------------------------- the lesson-set rules (positions, lengths) */
function setRules(R, ctx) {
  const byPage = new Map();
  for (const x of ctx.positions) { if (!byPage.has(x.page)) byPage.set(x.page, []); byPage.get(x.page).push(x); }
  for (const [page, list] of byPage) {
    const seq = list.map((x) => x.pos), slots = seq.map(L).join('');
    // Q2a
    let run = null; for (let i = 2; i < seq.length; i++) if (seq[i] === seq[i - 1] && seq[i] === seq[i - 2]) { run = i; break; }
    R.set('Q2a', run == null ? 'PASS' : 'FAIL', run == null ? `answer slots ${slots}: no run of 3` : `answer slots ${slots}: ${L(seq[run])} three times in a row (items ${run - 1}–${run + 1})`, page);
    // Q2b
    let cyc = null;
    for (let p = 2; p <= 4 && !cyc; p++) for (let i = 0; i + 2 * p <= seq.length && !cyc; i++) { const blk = seq.slice(i, i + p); if (new Set(blk).size < 2) continue; if (blk.every((v, k) => v === seq[i + p + k])) cyc = `${blk.map(L).join('')} repeats at items ${i + 1}–${i + 2 * p}`; }
    R.set('Q2b', cyc ? 'FAIL' : 'PASS', cyc ? `answer slots ${slots}: ${cyc}` : `answer slots ${slots}: no repeating cycle of 2–4`, page);
    // Q2c, by number of options
    const byK = new Map(); for (const x of list.filter((x) => x.n >= 3)) { if (!byK.has(x.n)) byK.set(x.n, []); byK.get(x.n).push(x.pos); }
    const over = [], seen = [];
    for (const [k, ps] of byK) { const n = ps.length, max = Math.floor(1.5 * n / k) + 1; const counts = Array.from({ length: k }, (_, j) => ps.filter((p) => p === j).length); seen.push(`${k}-option items (${n}): ${counts.map((c, j) => `${L(j)} ${c}`).join(', ')}, limit ${max}`); counts.forEach((c, j) => { if (c > max) over.push(`${L(j)} holds ${c} of ${n} answers among ${k}-option items (limit ${max})`); }); }
    R.set('Q2c', over.length ? 'FAIL' : seen.length ? 'PASS' : 'PASS', over.length ? over.join('; ') : seen.length ? seen.join('; ') : 'no items with 3+ options (not applicable)', page);
    // Q2d
    const two = list.filter((x) => x.n === 2);
    if (!two.length) R.set('Q2d', 'PASS', 'no two-option items (not applicable)', page);
    else { const a = two.filter((x) => x.pos === 0).length, b = two.length - a, lim = Math.max(1, Math.round(0.2 * two.length)); R.set('Q2d', Math.abs(a - b) <= lim ? 'PASS' : 'FAIL', `two-option items: first ${a}, second ${b} (difference allowed: ${lim})`, page); }
  }
  if (!byPage.size) for (const id of ['Q2a', 'Q2b', 'Q2c', 'Q2d']) R.set(id, 'CANNOT TEST', 'no choice item was answered');
  for (const x of ctx.lengths) {
    const lim = Math.max(1, Math.round(0.3 * x.n));
    if (!x.n) { R.set('Q3a', 'PASS', 'no items with 3+ options (not applicable)', x.page); continue; }
    const p = [];
    if (x.longest.length > lim) p.push(`strictly longest in ${x.longest.length} of ${x.n} (limit ${lim}): ${x.longest.join(', ')}`);
    if (x.shortest.length > lim) p.push(`strictly shortest in ${x.shortest.length} of ${x.n} (limit ${lim}): ${x.shortest.join(', ')}`);
    R.set('Q3a', p.length ? 'FAIL' : 'PASS', p.length ? `the right answer is ${p.join('; ')}` : `right answer strictly longest in ${x.longest.length}, strictly shortest in ${x.shortest.length} of ${x.n} (limit ${lim} each)`, x.page);
  }
  // a wrong-answer text reused in 3+ items
  const m = new Map(); for (const w of ctx.wrongTexts) { if (w.t.length < 3) continue; if (!m.has(w.t)) m.set(w.t, new Set()); m.get(w.t).add(`${w.page}#${w.id}`); }
  const reused = [...m].filter(([t, s]) => s.size >= 3 && !/^(true|false)$/.test(t));
  if (reused.length) R.set('Q3c', 'FAIL', `a wrong answer reused in 3+ items: ${reused.slice(0, 3).map(([t, s]) => `“${t.slice(0, 30)}” ×${s.size}`).join(', ')}`);
}

/* ---------------------------------------------------------------- run */
export async function run(input, a = {}) {
  const only = a.rules ? String(a.rules).split(',').map((s) => s.trim()) : null;
  const pw = loadPlaywright();
  const { targets, cleanup } = targetsOf(input, a);
  const results = [];
  if (!pw) {
    for (const T of targets) { const R = new Results(only); for (const [id, kind] of RULES) if (kind === 'test') R.set(id, 'CANNOT TEST', 'Playwright is not installed: the gate needs a browser'); results.push({ T, R, summary: [] }); }
    return { results, cleanup };
  }
  const blanks = a.blanks ? JSON.parse(fs.readFileSync(a.blanks, 'utf8')) : null;
  for (const T of targets) {
    const R = new Results(only);
    const br = new Browser(pw, T.dir); await br.start();
    const ctx = { positions: [], lengths: [], wrongTexts: [], info: [], stuck: [], summary: [], blanks, dump: a.dump || null, tmp: fs.mkdtempSync(path.join(os.tmpdir(), 'pp-istd-run-')) };
    if (ctx.dump) fs.mkdirSync(ctx.dump, { recursive: true });
    if (T.doc) {
      const qs = (T.doc.sections || []).flatMap((s) => s.questions || []);
      ctx.packChoices = qs.filter((q) => q.type === 'mc' || q.type === 'tf').map((q) => q.type === 'tf' ? ['True', 'False'] : (Array.isArray(q.choices) ? q.choices : q.choices && q.choices.A) || []);
      ctx.packAnswers = qs.filter((q) => ['numeric', 'short'].includes(q.type)).map((q) => (typeof q.answer === 'object' && q.answer ? q.answer.A : q.answer));
    }
    try {
      for (const lesson of T.lessons) {
        try {
          await checkLesson(br, T, lesson, R, ctx);
          const data = ctx.info[ctx.info.length - 1];
          const A = await br.open(lesson.name); const items = A.items; await A.close();
          teacherRules(R, lesson.name, lesson, data, items);
        } catch (e) { R.set('K1', 'FAIL', `the gate could not finish this page: ${String(e.stack || e).split('\n').slice(0, 3).join(' ')}`, lesson.name); }
      }
      try { await notesRules(br, T, R, ctx); } catch (e) { R.set('N1', 'CANNOT TEST', `the notes check crashed: ${String(e.message || e).split('\n')[0]}`); }
      setRules(R, ctx);
      if (br.blocked.length) R.set('K1', 'FAIL', `${br.blocked.length} outside request(s) (blocked): ${[...new Set(br.blocked)].slice(0, 3).join(', ')}`);
      R.set('K1', 'PASS', `this gate: ${T.lessons.length} page(s) at 1280 and 375 px in a sandboxed frame, network blocked (${br.blocked.length} outside requests), reload, backup, blocked storage, print`);
    } finally { await br.close(); }
    results.push({ T, R, summary: ctx.summary });
  }
  return { results, cleanup };
}

function report(results) {
  const lines = [];
  for (const { T, R, summary } of results) {
    lines.push(`\n=== ${T.title || T.id} (${T.lessons.length} lesson page${T.lessons.length === 1 ? '' : 's'}${T.notes ? `, notes page ${T.notes}` : ''}${T.hub ? `, hub ${T.hub}` : ''})`);
    for (const s of summary) lines.push(`    ${s}`);
    for (const row of R.table()) {
      const ev = row.evidence.length > 4 ? [...row.evidence.slice(0, 4), `…and ${row.evidence.length - 4} more`] : row.evidence;
      lines.push(`${row.id.padEnd(4)} ${row.status.padEnd(11)} ${row.what}`);
      for (const e of ev) lines.push(`                 ${e}`);
    }
    const counts = {}; for (const r of R.table()) counts[r.status] = (counts[r.status] || 0) + 1;
    lines.push(`--- ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  }
  return lines.join('\n');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const a = argsOf(process.argv.slice(2));
  if (!a._[0]) { console.log('usage: node checks/interactive-standard.mjs <pack-folder | page.html | folder> [--teacher <file|folder>] [--blanks inv.json] [--json out.json] [--rules L2,Q2a] [--dump dir] [--doc title]'); process.exit(2); }
  const { results, cleanup } = await run(a._[0], a);
  console.log(report(results));
  const json = results.map(({ T, R, summary }) => ({ id: T.id, title: T.title || T.id, pages: T.lessons.map((l) => l.name), summary, rules: Object.fromEntries(R.table().map((r) => [r.id, { status: r.status, what: r.what, evidence: r.evidence }])) }));
  if (a.json) fs.writeFileSync(a.json, JSON.stringify({ input: a._[0], date: new Date().toISOString(), docs: json }, null, 2));
  if (cleanup) fs.rmSync(cleanup, { recursive: true, force: true });
  const failed = json.some((d) => Object.values(d.rules).some((r) => r.status === 'FAIL'));
  if (!results.length) console.log('No interactive documents here.');
  process.exit(failed ? 1 : 0);
}
