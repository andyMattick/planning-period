#!/usr/bin/env node
/* Checks for review apps and interactive worksheets (docs/KINDS-APPS.md).

     node checks/apps.mjs <pack.json> [more packs] [--no-browser] [--shots <dir>]

   Content (exit 1 on any problem):
     - the document builds: known question types, one version, every typed answer has accepted forms that read
       (numbers as numbers), every auto-checked worksheet item has a hint, a wrong answer listed in `miss` is never a
       right one, every mode the pack asks for has content, no duplicate cards, card backs, match words or passages
     - the hashes in the page are exactly the hashes of the accepted forms (no more, no fewer), the page's own engine
       (run in Node) marks every accepted form right and unlocks the teacher's `why`, and its built-in SHA-256 agrees
       with Node's
     - no plain-text key in the student file: no answer/accept/why/model fields, no `why` or model answer text, and no
       accepted form that the student can't already see somewhere on the page
   Browser (skipped with a message when Playwright or its Chromium isn't here): each page opens from a file with every
   outside request blocked, makes no outside request and no page error, has no sideways scroll at 375 px; one right
   and one wrong answer (and the miss flow: wait, write first, hint), then a reload keeps the progress; with storage
   blocked a banner shows and checking still works.
   --shots <dir> saves screenshots at 375 and 1280 px, light and dark. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadPack, kindOf, docName, argsOf } from './pack-lib.mjs';
import { isAppDoc, appHtml, loadEngine, rightForms, saltOf } from '../scripts/render/apps.mjs';
import { slug, vv } from '../scripts/render/util.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// the file name base the renderer gives a document (scripts/render-pack.mjs)
export function basesOf(pack) {
  const used = new Set(), out = new Map();
  for (const doc of pack.documents) {
    let base = slug(doc.title || doc.item);
    for (let i = 2; used.has(base); i++) base = `${slug(doc.title || doc.item)}-${i}`;
    used.add(base); out.set(doc, base);
  }
  return out;
}
const questions = (doc) => (doc.sections || []).flatMap((s) => s.questions || []);
const VISIBLE = ['prompt', 'hint', 'choices', 'unit', 'figure', 'title', 'sub', 'notice', 'directions', 'heading', 'cards', 'passages', 'pairs'];

export async function checkContent(pack) {
  const errors = [], built = [], bases = basesOf(pack);
  for (const doc of pack.documents.filter(isAppDoc)) {
    const name = docName(doc, pack.documents.indexOf(doc)), base = bases.get(doc);
    const { html, data, problems } = appHtml(pack, doc, base, brand);
    problems.forEach((p) => errors.push(p));
    built.push({ doc, base, html, data, name });
    const P = loadEngine({ salt: data.salt, numberWords: data.numberWords, unitMarks: data.unitMarks });
    for (const t of ['', 'abc', 'PPA1|x'.repeat(40)]) if (P.hex(P.sha256Sync(new TextEncoder().encode(t))) !== sha(t)) errors.push(`${name}: the page's built-in SHA-256 is wrong for ${JSON.stringify(t)}`);
    if (data.salt !== saltOf(pack, base)) errors.push(`${name}: the salt is not this pack's`);
    const items = data.kind === 'interactive' ? data.sections.flatMap((s) => s.items) : data.practice;
    const byId = new Map(items.map((it) => [it.id, it]));
    const visible = [];
    const walk = (o, keep) => { if (typeof o === 'string') { if (keep) visible.push(o); return; } if (Array.isArray(o)) return o.forEach((x) => walk(x, keep)); if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, keep || VISIBLE.includes(k) || k === 'miss'); };
    walk(data, false);
    // the strings the page holds that the student never sees (ids, the storage key, the kind), minus the hashes and locks
    const hiddenStrings = [];
    const collect = (o, k) => { if (['acc', 'miss', 'salt'].includes(k) || VISIBLE.includes(k)) return; if (typeof o === 'string') hiddenStrings.push(o.toLowerCase()); else if (Array.isArray(o)) o.forEach((x) => collect(x)); else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) collect(v, kk); };
    collect(data);
    const seen = visible.join('\n').toLowerCase(), page = html.toLowerCase();
    if (/"(answer|accept|why|model|look)"\s*:/.test(html)) errors.push(`${name}: the student file has an answer, accept, why, model or look field`);
    for (const q of questions(doc)) {
      const where = `${name} ${q.id}`, type = q.type || 'short';
      const why = String(vv(q.why) ?? '').trim();
      if (why.length >= 8 && page.includes(why.toLowerCase())) errors.push(`${where}: the “why” is readable in the student file`);
      if (type === 'open') { const m = String(vv(q.answer) ?? '').trim(); if (m.length >= 8 && page.includes(m.toLowerCase())) errors.push(`${where}: the model answer is readable in the student file`); continue; }
      const it = byId.get(String(q.id));
      if (!it) continue;
      const forms = rightForms(q);
      if (!forms.length) { errors.push(`${where}: a typed answer with no accepted forms`); continue; }
      // the hashes are exactly the accepted forms'
      const want = new Set(forms.map((f) => P.keyCanon(f, type)).filter(Boolean).map((c) => sha(`PPA1|${data.salt}|${it.id}|${c}`)));
      const have = new Set((it.acc || []).map((a) => a.h));
      if (want.size !== have.size || [...want].some((h) => !have.has(h))) errors.push(`${where}: the page's answer hashes don't match its accepted forms (${have.size} in the page, ${want.size} expected)`);
      for (const h of Object.keys(it.miss || {})) if (have.has(h)) errors.push(`${where}: a wrong-answer message is stored under a right answer's hash`);
      // the page's own engine marks every accepted form right and unlocks the why
      for (const f of forms) {
        const raw = type === 'mc' ? Number(f) : type === 'tf' ? f : String(f);
        const r = await P.judge(it, raw);
        if (r.res !== 'ok') errors.push(`${where}: the page marks the accepted form “${f}” ${r.res}`);
        else if (why && (!r.ex || r.ex.why !== why)) errors.push(`${where}: the “why” doesn't unlock with “${f}”`);
      }
      // no accepted form readable: not in the page's hidden data, and not anywhere the student can't already see it
      if (['numeric', 'short'].includes(type)) for (const f of forms) {
        const s = String(f).trim().toLowerCase();
        if (!s) continue;
        const tok = new RegExp(`(^|[^a-z0-9./-])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9/])`);
        if (hiddenStrings.some((h) => tok.test(h))) errors.push(`${where}: the accepted form “${f}” is in the page's data`);
        if (/[a-z]/.test(s) && s.length >= 3 && page.includes(s) && !seen.includes(s)) errors.push(`${where}: the accepted form “${f}” is readable in the student file`);
      }
    }
  }
  return { errors, built };
}

/* ---------- the browser smoke test ---------- */
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch {}
  try { const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(); return createRequire(path.join(g, 'noop.js'))('playwright'); } catch { return null; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function smokeInteractive(b, file, doc, data, note, fail) {
  const { openOffline } = await import('../scripts/render/apps.mjs');
  const items = data.sections.flatMap((s) => s.items);
  const typed = items.filter((it) => ['numeric', 'short'].includes(it.type));
  const qs = new Map(questions(doc).map((q) => [String(q.id), q]));
  if (typed.length < 2) { note('fewer than 2 typed questions: right/wrong smoke on choices only'); }
  const o = await openOffline(b, file, { width: 375 });
  const { page } = o;
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > 376) fail(`sideways scroll at 375 px (page is ${wide} px wide)`);
  // right answer on the first typed item
  const R = typed[0] || items.find((it) => it.type === 'mc'), W = typed[1] || items.filter((it) => it.type === 'mc')[1];
  const rq = qs.get(R.id), wq = qs.get(W.id);
  const answerItem = async (it, val) => {
    if (it.type === 'mc' || it.type === 'tf') await page.click(`#q-${it.id} input[value="${val}"]`, { force: true });
    else await page.fill(`#a-${it.id}`, String(val));
    await page.click(`[data-check="${it.id}"]`);
  };
  await answerItem(R, R.type === 'mc' ? Number(vv(rq.answer)) : rightForms(rq)[0]);
  await page.waitForSelector(`[data-fb="${R.id}"] .fb.ok`, { timeout: 5000 }).catch(() => fail(`a right answer to ${R.id} was not marked right`));
  const whyShown = await page.textContent(`[data-fb="${R.id}"]`).catch(() => '');
  if (vv(rq.why) && !whyShown.includes(String(vv(rq.why)).slice(0, 20))) fail(`the “why” of ${R.id} didn't show after the right answer`);
  // wrong answer, the wait, the second miss, write first, the hint
  const wrong = W.type === 'mc' ? (Number(vv(wq.answer)) + 1) % W.choices.length : W.type === 'numeric' ? '987654' : 'zzzz wrong';
  await answerItem(W, wrong);
  await page.waitForSelector(`[data-fb="${W.id}"] .fb.bad`, { timeout: 5000 }).catch(() => fail(`a wrong answer to ${W.id} was not marked wrong`));
  const btn = await page.textContent(`[data-check="${W.id}"]`);
  if (!/Wait/.test(btn)) fail(`no wait after a miss on ${W.id} (the button says “${btn}”)`);
  await sleep(3300);
  if (W.type === 'mc' || W.type === 'tf') await page.click(`[data-check="${W.id}"]`); else await answerItem(W, W.type === 'numeric' ? '987655' : 'zzzz again');
  await page.waitForSelector(`[data-think-box="${W.id}"]:not([hidden])`, { timeout: 5000 }).catch(() => fail(`after two misses on ${W.id} the “write what you're thinking” box didn't open`));
  if (!(await page.isDisabled(`[data-hint="${W.id}"]`))) fail(`the hint opened before the student wrote anything (${W.id})`);
  await page.fill(`[data-think="${W.id}"]`, 'I think I need to subtract the two numbers');
  await page.click(`[data-hint="${W.id}"]`);
  const fb = await page.textContent(`[data-fb="${W.id}"]`);
  if (W.hint && !fb.includes(W.hint.slice(0, 15))) fail(`the hint for ${W.id} didn't show after writing`);
  // reload: the progress is kept
  await sleep(600);
  await page.reload(); await page.waitForSelector('#ptext');
  await page.waitForSelector(`[data-fb="${R.id}"] .fb.ok`, { timeout: 5000 }).catch(() => fail('after a reload the right answer was not kept'));
  const p = await page.textContent('#ptext');
  if (!/^1 of /.test(p)) fail(`after a reload the progress says “${p}”`);
  if (o.outside.length) fail(`outside requests: ${o.outside.join(', ')}`);
  if (o.errors.length) fail(`page errors: ${o.errors.join(' | ')}`);
  await o.context.close();
  // storage blocked: a banner, and checking still works
  const ctx2 = await b.newContext({ viewport: { width: 375, height: 800 } });
  await ctx2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const p2 = await ctx2.newPage();
  await p2.goto('file://' + file); await p2.waitForSelector('#ptext');
  if (!(await p2.isVisible('#blocked'))) fail('with storage blocked, no banner');
  await p2.fill(`#a-${R.id}`, String(rightForms(rq)[0])).catch(() => {});
  if (R.type !== 'mc') { await p2.click(`[data-check="${R.id}"]`); await p2.waitForSelector(`[data-fb="${R.id}"] .fb.ok`, { timeout: 5000 }).catch(() => fail('with storage blocked, checking stopped working')); }
  await ctx2.close();
}

async function smokeReview(b, file, doc, data, note, fail) {
  const { openOffline } = await import('../scripts/render/apps.mjs');
  const qs = new Map(questions(doc).map((q) => [String(vv(q.prompt)).trim(), q]));
  const o = await openOffline(b, file, { width: 375 });
  const { page } = o;
  const wide = async (what) => { const w = await page.evaluate(() => document.documentElement.scrollWidth); if (w > 376) fail(`sideways scroll at 375 px on ${what} (${w} px)`); };
  await wide('the menu');
  if (data.modes.includes('flashcards')) {
    await page.click('[data-go="flashcards"]'); await wide('flashcards');
    await page.click('#flipbtn'); await page.click('#knowit');
    await page.click('#flipbtn'); await page.click('#notyet');
    await page.click('[data-go="home"]');
  }
  if (data.modes.includes('practice')) {
    await page.click('[data-go="practice"]'); await wide('practice');
    for (const want of ['right', 'wrong']) {
      const prompt = (await page.textContent('.card p b')).trim();
      const q = qs.get(prompt);
      if (!q) { fail(`practice shows a question that isn't in the pack: “${prompt}”`); break; }
      const t = q.type || 'short', right = want === 'right';
      if (t === 'mc') await page.click(`[data-pick="${right ? Number(q.answer) : (Number(q.answer) + 1) % q.choices.length}"]`);
      else if (t === 'tf') await page.click(`[data-pick="${String(right ? q.answer === true || q.answer === 'true' : !(q.answer === true || q.answer === 'true'))}"]`);
      else { await page.fill('#pa', right ? String(rightForms(q)[0]) : t === 'numeric' ? '987654' : 'zzzz wrong'); await page.click('#pcheck'); }
      await page.waitForSelector(`#pfb .fb.${right ? 'ok' : 'bad'}`, { timeout: 5000 }).catch(() => fail(`practice: a ${want} answer to ${q.id} was not marked ${want}`));
      await page.waitForSelector('#pnext:not([disabled])', { timeout: 5000 });
      await page.click('#pnext');
    }
    await page.click('[data-go="home"]');
  }
  if (data.modes.includes('memorize')) {
    await page.click('[data-go="memorize"]');
    if (data.passages.length > 1) await page.click('[data-mem]');
    await wide('memorize'); await page.click('#memNext');
    const p = data.passages[0];
    await page.fill('#memType', p.text.replace(/[.,:;!?]/g, '').toUpperCase());   // punctuation and capitals don't count
    await page.click('#memCheck');
    await page.waitForSelector('#memOut .fb.ok', { timeout: 5000 }).catch(() => fail('memorize: the passage typed without punctuation and in capitals was not accepted'));
    await page.click('[data-go="home"]');
  }
  if (data.modes.includes('match')) {
    await page.click('[data-go="match"]'); await wide('match');
    const id = await page.getAttribute('[data-m="l"]', 'data-id');
    const other = await page.$$eval('[data-m="r"]', (bs, id) => bs.map((b) => b.dataset.id).find((x) => x !== id), id);
    await page.click(`[data-m="l"][data-id="${id}"]`); await page.click(`[data-m="r"][data-id="${other}"]`);
    if (!(await page.$('#mfb .fb.bad'))) fail('match: a wrong pair was not marked');
    await page.click(`[data-m="l"][data-id="${id}"]`); await page.click(`[data-m="r"][data-id="${id}"]`);
    if (!(await page.$(`[data-m="l"][data-id="${id}"][disabled]`))) fail('match: a right pair was not marked');
    await page.click('[data-go="home"]');
  }
  await page.reload(); await page.waitForSelector('.tiles');
  const home = await page.textContent('.tiles');
  if (data.modes.includes('practice') && !/[1-9]\d* of \d+ answered right/.test(home)) fail(`after a reload practice progress was lost (“${home.replace(/\s+/g, ' ').slice(0, 160)}”)`);
  if (data.modes.includes('memorize') && !/step 3 of 5/.test(home)) fail('after a reload the memorize step was lost');
  const saved = await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, data.key);
  if (data.modes.includes('flashcards') && !(saved && Object.values(saved.cards || {}).some((c) => c.box >= 1))) fail('after a reload the flashcard boxes were lost');
  if (o.outside.length) fail(`outside requests: ${o.outside.join(', ')}`);
  if (o.errors.length) fail(`page errors: ${o.errors.join(' | ')}`);
  await o.context.close();
  const ctx2 = await b.newContext({ viewport: { width: 375, height: 800 } });
  await ctx2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const p2 = await ctx2.newPage(); await p2.goto('file://' + file); await p2.waitForSelector('.tiles');
  if (!(await p2.isVisible('#blocked'))) fail('with storage blocked, no banner');
  await ctx2.close();
}

async function shots(b, file, kind, dir, base, doc) {
  const { openOffline } = await import('../scripts/render/apps.mjs');
  const made = [];
  for (const theme of ['light', 'dark']) for (const [w, h] of [[375, 812], [1280, 900]]) {
    const o = await openOffline(b, file, { width: w, height: h, theme });
    const f = path.join(dir, `${base}-${w}-${theme}.png`);
    await o.page.screenshot({ path: f, fullPage: w === 375 && kind === 'interactive' ? false : false }); made.push(f);
    if (w === 375) {
      if (kind === 'reviewapp') {
        for (const m of ['flashcards', 'memorize', 'practice', 'match']) {
          if (!(await o.page.$(`[data-go="${m}"]`))) continue;
          await o.page.click(`[data-go="${m}"]`);
          if (m === 'flashcards') await o.page.click('#flipbtn');
          if (m === 'memorize' && await o.page.$('[data-step="1"]:not([disabled])')) await o.page.click('[data-step="1"]');
          const g = path.join(dir, `${base}-${w}-${theme}-${m}.png`); await o.page.screenshot({ path: g }); made.push(g);
          await o.page.click('[data-go="home"]');
        }
      } else {
        // a right answer (with its why) and a wrong one (with the wait), as the student sees them
        const qs = questions(doc), mc = qs.find((q) => q.type === 'mc'), typed = qs.find((q) => ['numeric', 'short'].includes(q.type));
        if (mc) { await o.page.click(`#q-${mc.id} input[value="${Number(vv(mc.answer))}"]`, { force: true }); await o.page.click(`[data-check="${mc.id}"]`); await o.page.waitForSelector(`[data-fb="${mc.id}"] .fb.ok`); }
        if (typed) { await o.page.fill(`#a-${typed.id}`, typed.type === 'numeric' ? '5' : 'zzz'); await o.page.click(`[data-check="${typed.id}"]`); await o.page.waitForSelector(`[data-fb="${typed.id}"] .fb`); }
        if (mc) await o.page.evaluate((id) => { const e = document.getElementById('q-' + id); window.scrollTo(0, e.offsetTop - 130); }, mc.id);
        const fbShot = path.join(dir, `${base}-${w}-${theme}-feedback.png`); await o.page.screenshot({ path: fbShot }); made.push(fbShot);
        const g = path.join(dir, `${base}-${w}-${theme}-full.png`); await o.page.screenshot({ path: g, fullPage: true }); made.push(g);
      }
    }
    await o.context.close();
  }
  return made;
}

export async function checkBrowser(built, { shotsDir } = {}) {
  const pw = loadPlaywright();
  if (!pw) return { skipped: 'Playwright is not installed: the browser smoke test was skipped' };
  const exe = process.env.PP_CHROMIUM || '/opt/pw-browsers/chromium';
  let b;
  try { b = await pw.chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--no-first-run', '--disable-sync', '--disable-features=OptimizationHints,MediaRouter,Translate'] }); }
  catch (e) { return { skipped: `Chromium could not start (${e.message.split('\n')[0]}): the browser smoke test was skipped` }; }
  const errors = [], notes = [], shotFiles = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-apps-check-'));
  try {
    for (const x of built) {
      const file = path.join(tmp, `${x.base}.html`);
      fs.writeFileSync(file, x.html);
      const fail = (m) => errors.push(`${x.name}: ${m}`), note = (m) => notes.push(`${x.name}: ${m}`);
      try {
        if (x.data.kind === 'interactive') await smokeInteractive(b, file, x.doc, x.data, note, fail);
        else await smokeReview(b, file, x.doc, x.data, note, fail);
      } catch (e) { fail(`the smoke test stopped: ${e.message.split('\n')[0]}`); }
      if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); shotFiles.push(...(await shots(b, file, x.data.kind, shotsDir, x.base, x.doc))); }
    }
  } finally { await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
  return { errors, notes, shotFiles };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { flags, opt, files } = argsOf(process.argv);
  const shotsDir = opt('shots');
  const list = files.filter((f) => f !== shotsDir);
  if (!list.length) { console.error('usage: node checks/apps.mjs <pack.json> [--no-browser] [--shots <dir>]'); process.exit(2); }
  let bad = 0;
  for (const f of list) {
    let pack;
    try { pack = loadPack(f); } catch (e) { console.error(`✗ ${e.message}`); bad++; continue; }
    const n = pack.documents.filter(isAppDoc).length;
    if (!n) { console.log(`· apps ${f}: no review app or interactive worksheet`); continue; }
    const { errors, built } = await checkContent(pack);
    console.log(`${errors.length ? '✗' : '✓'} apps ${f}: ${n} app(s), content ${errors.length ? `${errors.length} problem(s)` : 'ok'} (hashes match the accepted forms, no plain-text key)`);
    errors.forEach((e) => console.log(`    ✗ ${e}`));
    if (errors.length) bad++;
    if (flags.has('--no-browser')) { console.log('    ⏭️  browser smoke test skipped (--no-browser)'); continue; }
    const r = await checkBrowser(built, { shotsDir });
    if (r.skipped) { console.log(`    ⏭️  ${r.skipped}`); continue; }
    console.log(`    ${r.errors.length ? '✗' : '✓'} browser: opened offline (outside requests blocked), right and wrong answers, reload keeps progress, storage-blocked banner${r.errors.length ? `: ${r.errors.length} problem(s)` : ''}`);
    r.errors.forEach((e) => console.log(`    ✗ ${e}`));
    r.notes.forEach((e) => console.log(`    · ${e}`));
    if (r.shotFiles.length) console.log(`    screenshots: ${r.shotFiles.length} in ${shotsDir}`);
    if (r.errors.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
