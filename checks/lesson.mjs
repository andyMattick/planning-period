#!/usr/bin/env node
/* Checks for interactive lessons (docs/KINDS-LESSONS.md, the standard: docs/INTERACTIVE-STANDARD.md).

     node checks/lesson.mjs <pack.json> [more packs] [--no-browser | --only-saves] [--shots <dir>] [--folder <order folder>]

   Content (exit 1 on any problem): the lesson builds to the standard (every build rule in scripts/render/lesson.mjs:
   L1–L3, L5–L7, Q1–Q3b, Q5, T1, A1–A3, D1, S2 against <folder>/ids.lock.json, read-only here), and then, with the
   page's own code run in Node:
     - every accepted form is marked right and unlocks its explanation; every listed wrong answer is marked wrong
       with its message; the equivalent forms of Q4 (fraction, decimal, percent, plural, capitals) read the same
     - the built-in SHA-256 agrees with Node's; the teacher question opens with its code (AES-GCM and the fallback
       stream) and with no other code
     - the order students see (Q2) is recomputed from the seed and has no run, cycle or overused slot
     - no teacher-only text (explanations, models, look-fors, FRQ guide, CED codes, the question and its code) and no
       plain answer is in the student file; the teacher copy is the student file plus the teacher block (C1)
   Browser (K1; skipped with a message when Playwright isn't here), at 375 and 1280 px, from a file with every outside
   request blocked: plays the whole lesson as a student (wrong picks, waits, the one-sentence prompt, hints, every
   mechanic, equivalent forms), checks the rule card stays locked until the labs are done (L7), optional pages never
   block (L2), no sideways scroll on any page, reload keeps everything (T3 wrong picks too), the teacher-question code
   box (T2), My notes (N1: no hints or model answers, the stuck list, own notes), print layout (N4), backup file and
   save code round trips (S1), blocked storage, no crypto.subtle, a sandboxed srcdoc frame (D2), saves from earlier
   builds (S5, <folder>/saves/), and the teacher copy (C2 F2, never a letter key; C3 display-only, Reset lesson). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadPack } from './pack-lib.mjs';
import { buildLesson, isLessonDoc, openQuestion, codeNorm, orderProblems, displaySlots, openOffline, checkOldSaves, savesFor, TEACHER_MARK } from '../scripts/render/lesson.mjs';
import { slug } from '../scripts/render/util.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); } catch { /* global */ }
  try { const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(); return createRequire(path.join(g, 'noop.js'))('playwright'); } catch { return null; }
}

/* ---------- content, in Node ---------- */
export async function contentProblems(pack, doc, b) {
  const out = [];
  const { data, teacher: T, P, F } = b;
  const nodeSha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  for (const s of ['', 'abc', 'x'.repeat(200), 'é漢字']) if (P.hex(P.sha256Sync(new TextEncoder().encode(s))) !== nodeSha(s)) out.push('the built-in SHA-256 disagrees with Node');
  const items = Object.fromEntries(data.pages.flatMap((p) => p.items.map((i) => [i.id, i])));
  const blanks = Object.fromEntries(data.pages.flatMap((p) => Object.entries(p.blanks || {})));
  const pq = Object.fromEntries(doc.pages.flatMap((p) => (p.questions || []).map((q) => [q.id, q])));
  const pb = Object.fromEntries(doc.pages.flatMap((p) => (p.blanks || []).map((x) => [x.id, x])));
  const forms = (q) => [q.answer, ...(q.accept || [])].map(String);
  const variants = (f) => {          // Q4: forms a student might type for the same answer
    const v = [f, f.toUpperCase(), ` ${f} `];
    const n = P.parseNum(f);
    if (n && /^-?\d*\.?\d+$/.test(f.trim())) { const x = n[0] / n[1]; v.push(`${n[0]}/${n[1]}`); if (Math.abs(x) < 10) v.push(`${+(x * 100).toFixed(6)}%`); if (f.startsWith('0.')) v.push(f.slice(1)); }
    if (!n && /^[a-z]{3,}$/i.test(f)) { if (!/ss$/.test(f)) v.push(f.endsWith('s') ? f.slice(0, -1) : f + 's'); v.push(`the ${f}`); }
    return v;
  };
  const tasks = [];
  for (const [id, it] of Object.entries(items)) {
    const q = pq[id];
    if (it.type === 'open') continue;
    if (it.type === 'mc') {
      tasks.push(F.judgeForms(id, it, ['opt:' + q.answer]).then((r) => { if (r.res !== 'ok' || r.ex?.why !== T.items[id].why) out.push(`${id}: the right choice isn't marked right with its why`); }));
      q.choices.forEach((_, i) => { if (i !== q.answer) tasks.push(F.judgeForms(id, it, ['opt:' + i]).then((r) => { if (r.res !== 'miss' || !r.msg) out.push(`${id}: wrong choice ${i + 1} has no message`); })); });
      continue;
    }
    for (const f of forms(q)) for (const v of variants(f)) tasks.push(F.judgeTyped(id, it, v, it.type).then((r) => { if (r.res !== 'ok' || r.ex?.why !== T.items[id].why) out.push(`${id}: “${v}” (a form of ${f}) isn't marked right`); }));
    for (const m of q.miss || []) tasks.push(F.judgeTyped(id, it, String(m.answer), it.type).then((r) => { if (r.res !== 'miss') out.push(`${id}: the wrong answer “${m.answer}” isn't caught with its message`); }));
  }
  for (const [id, bl] of Object.entries(blanks)) {
    const q = pb[id];
    for (const f of forms(q)) for (const v of variants(f)) tasks.push(F.judgeTyped(id, bl, v, bl.num ? 'numeric' : 'short').then((r) => { if (r.res !== 'ok') out.push(`blank ${id}: “${v}” isn't marked right`); }));
    for (const m of q.miss || []) tasks.push(F.judgeTyped(id, bl, String(m.answer), bl.num ? 'numeric' : 'short').then((r) => { if (r.res !== 'miss') out.push(`blank ${id}: the wrong answer “${m.answer}” isn't caught`); }));
  }
  for (const p of data.pages) {
    const W = p.widget; if (!W) continue;
    const t = T.widgets[W.id];
    if (W.mechanic === 'sort') for (const c of W.cards) for (const bin of W.bins) tasks.push(F.judgeForms(`${W.id}--${c.id}`, c, ['bin:' + bin.id]).then((r) => { if ((r.res === 'ok') !== (t[c.id] === bin.id)) out.push(`${W.id}: card ${c.id} in ${bin.id} is judged wrongly`); }));
    if (W.mechanic === 'build') for (const a of t.answer) tasks.push(F.judgeForms(W.id, W, ['seq:' + a.join('|')]).then((r) => { if (r.res !== 'ok') out.push(`${W.id}: the answer build isn't right`); }));
    if (W.mechanic === 'find-the-mistake') W.steps.forEach((_, i) => tasks.push(F.judgeForms(W.id, W, ['step:' + i]).then((r) => { if ((r.res === 'ok') !== (i === t.answer) || (i !== t.answer && r.res !== 'miss')) out.push(`${W.id}: step ${i + 1} is judged wrongly`); })));
    if (W.mechanic === 'slider-hunt') for (let v = W.slider.min; v <= W.slider.max + 1e-9; v += W.slider.step) { const x = Math.round(v * 1e6) / 1e6; tasks.push(F.judgeForms(W.id, W, [F.numForms(String(x))[0]]).then((r) => { if ((r.res === 'ok') !== (Math.abs(x - t.answer) <= (t.tol || 0) + 1e-9)) out.push(`${W.id}: the slider at ${x} is judged wrongly`); })); }
  }
  await Promise.all(tasks);
  // T1: the question opens with its code only
  if (data.tq) {
    try { if (openQuestion(data.tq, T.tq.code) !== T.tq.question) out.push('T1: the teacher question does not open with its code'); } catch (e) { out.push(`T1: the teacher question does not open with its code (${e.message})`); }
    try { openQuestion(data.tq, codeNorm(T.tq.code) + 'X'); out.push('T1: the teacher question opens with a wrong code'); } catch { /* right: it refuses */ }
  }
  // Q2: recompute what students see
  const keyOf = (id) => T.items[id].answer;
  const d = displaySlots(F, data, data.seed, keyOf);
  orderProblems(d.slots, d.sizes, { strictShare: false }).forEach((m) => out.push(m));
  return out;
}

/* ---------- browser ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEBUG = !!process.env.PP_DEBUG;
async function go(page, id) { if (DEBUG) console.error('  · page', id); await page.evaluate((x) => { location.hash = '#/' + x; }, id); await page.waitForSelector(`.page[data-page="${x(id)}"]`); }
const x = (s) => String(s).replace(/"/g, '\\"');
async function noSideScroll(page) { return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); }

// typed forms that test Q4 on the way through (equivalent forms of the key)
function altForm(q) {
  const a = String(q.answer);
  if (/^\d*\.\d+$/.test(a) && Number(a) < 1) return `${+(Number(a) * 100).toFixed(6)}%`;     // 0.92 -> 92%
  if (/^\d*\.\d+$/.test(a)) { const [w, f] = a.split('.'); const den = 10 ** f.length, num = Number(w) * den + Number(f); return `${num}/${den}`; }
  if (/^[a-z]{3,}$/.test(a)) return /ss$/.test(a) ? a.toUpperCase() : a.endsWith('s') ? a.slice(0, -1).toUpperCase() : a[0].toUpperCase() + a.slice(1) + 's';
  if (/^[a-z]+$/.test(a)) return a.toUpperCase();
  return a;
}

async function playLesson(page, doc, b, problems, tag, { shots } = {}) {
  const { data, teacher: T } = b;
  const req = data.pages.filter((p) => !p.optional && p.part !== 'notes');
  const rule = data.pages.find((p) => p.part === 'rule');
  const pq = Object.fromEntries(doc.pages.flatMap((p) => (p.questions || []).map((q) => [q.id, q])));
  const pb = Object.fromEntries(doc.pages.flatMap((p) => (p.blanks || []).map((q) => [q.id, q])));
  const fail = (m) => problems.push(`${tag}: ${m}`);
  let firstMcDone = false;
  // L7: the rule card is locked at the start
  if (rule) { await go(page, rule.id); if (!(await page.$('.locked-card'))) fail('L7: the rule card is open before the labs are done'); }
  for (const p of data.pages) {
    if (p.part === 'notes' || p.optional) continue;
    await go(page, p.id);
    if (!(await noSideScroll(page))) fail(`page ${p.id} scrolls sideways`);
    const mech = await page.getAttribute('.page', 'data-mechanic');
    if ((mech || null) !== (p.mechanic || null)) fail(`page ${p.id}: data-mechanic is ${mech}, expected ${p.mechanic}`);
    if (!(await page.textContent('#foot')).includes(`Build ${data.build.n} (`)) fail(`D1: page ${p.id} has no Build line`);
    if (!(await page.$(`details.mynote`))) fail(`N2: page ${p.id} has no own-notes box`);
    const W = p.widget;
    if (W) {
      const t = T.widgets[W.id], sel = (s) => page.click(s);
      if (W.mechanic === 'predict-then-reveal') { await sel(`[data-predict="${W.id}"][data-i="0"]`); await sel(`[data-reveal="${W.id}"]`); }
      if (W.mechanic === 'simulate') for (let i = 0; i < W.runs; i++) await sel(`[data-run="${W.id}"]`);
      if (W.mechanic === 'hands-on') await sel(`[data-simit="${W.id}"]`);
      if (W.mechanic === 'sort') {
        const wrongBin = W.bins.find((bn) => bn.id !== t[W.cards[0].id]).id;          // one wrong placement first
        for (const c of W.cards) await sel(`[data-sort="${W.id}"][data-c="${c.id}"][data-b="${c === W.cards[0] ? wrongBin : t[c.id]}"]`);
        await sel(`[data-check="w:${W.id}"]`); await page.waitForSelector(`.sortcard[data-card="${W.cards[0].id}"].miss`);
        if (!(await page.$(`[data-c="${W.cards[0].id}"][data-b="${wrongBin}"].nope`))) fail('T3: a wrong sort placement is not kept marked');
        await page.clock.fastForward(6000);
        await sel(`[data-sort="${W.id}"][data-c="${W.cards[0].id}"][data-b="${t[W.cards[0].id]}"]`);
        await sel(`[data-check="w:${W.id}"]`);
      }
      if (W.mechanic === 'build') { for (const tile of t.answer[0]) await sel(`[data-tile="${W.id}"][data-j="${W.tiles.indexOf(tile)}"]`); await sel(`[data-check="w:${W.id}"]`); }
      if (W.mechanic === 'find-the-mistake') {
        const wrongStep = t.answer === 0 ? 1 : 0;
        await sel(`[data-step="${W.id}"][data-i="${wrongStep}"]`); await sel(`[data-check="w:${W.id}"]`);
        await page.waitForSelector(`[data-step="${W.id}"][data-i="${wrongStep}"].nope`);
        await page.clock.fastForward(6000);
        await sel(`[data-step="${W.id}"][data-i="${t.answer}"]`); await sel(`[data-check="w:${W.id}"]`);
      }
      if (W.mechanic === 'slider-hunt') { await page.$eval(`[data-slide="${W.id}"]`, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(t.answer)); await sel(`[data-check="w:${W.id}"]`); }
      await page.waitForTimeout(150);
      const done = await page.$(`.widget[data-widget="${W.id}"] .fb.ok`) || ['simulate', 'predict-then-reveal', 'hands-on'].includes(W.mechanic);
      if (!done) fail(`${W.id} (${W.mechanic}) is not marked right after the right answer`);
    }
    if (p.blanks) {
      for (const [id] of Object.entries(p.blanks)) await page.fill(`[data-blank="${id}"]`, altForm(pb[id]));
      await page.click(`[data-checkblanks="${p.id}"]`); await page.waitForTimeout(200);
      for (const id of Object.keys(p.blanks)) if (!(await page.$(`#bl-${id}.good`))) fail(`blank ${id}: “${altForm(pb[id])}” (an equivalent form) isn't accepted`);
    }
    for (const it of p.items) {
      const q = pq[it.id];
      if (it.type === 'open') { await page.fill(`[data-open="${it.id}"]`, String(q.answer)); continue; }
      if (it.type === 'mc') {
        if (!firstMcDone) {                     // T3 on the first choice item: two misses, waits, a sentence, the hint
          firstMcDone = true;
          const wrong = q.choices.map((_, i) => i).filter((i) => i !== q.answer);
          await page.click(`[data-pick="${it.id}"][data-orig="${wrong[0]}"]`); await page.click(`[data-check="i:${it.id}"]`);
          await page.waitForSelector(`[data-pick="${it.id}"][data-orig="${wrong[0]}"].nope`);
          const w1 = await page.textContent(`[data-check="i:${it.id}"]`);
          if (!/Wait 5 s/.test(w1)) fail(`T3: the first miss doesn't start a 5 s wait (button says “${w1}”)`);
          if (!(await page.textContent(`#q-${it.id}`)).includes(q.miss.find((m) => m.answer === wrong[0]).why)) fail('Q1: the wrong-choice message is not shown');
          await page.clock.fastForward(6000);
          await page.click(`[data-pick="${it.id}"][data-orig="${wrong[1]}"]`); await page.click(`[data-check="i:${it.id}"]`);
          await page.waitForSelector(`[data-pick="${it.id}"][data-orig="${wrong[1]}"].nope`);
          const w2 = await page.textContent(`[data-check="i:${it.id}"]`);
          if (!/Wait 10 s/.test(w2)) fail(`T3: the second miss doesn't wait 10 s (“${w2}”)`);
          if (!(await page.$(`[data-think="i:${it.id}"]`))) fail('T3: no one-sentence prompt after two misses');
          await page.clock.fastForward(11000);
          if (!(await page.isDisabled(`[data-check="i:${it.id}"]`))) fail('T3: Check works before the sentence is written');
          await page.fill(`[data-think="i:${it.id}"]`, 'I thought heavy things always sink');
          await page.waitForTimeout(600);
          if (await page.isDisabled(`[data-check="i:${it.id}"]`)) fail('T3: Check stays off after the sentence');
          if (await page.isHidden(`[data-hintbox="i:${it.id}"]`)) fail('Q1: the hint does not show after the sentence');
          // reload: the wrong picks stay marked (T3)
          await page.reload(); await page.waitForSelector('.page');
          await go(page, p.id);
          if (!(await page.$(`[data-pick="${it.id}"][data-orig="${wrong[0]}"].nope`)) || !(await page.$(`[data-pick="${it.id}"][data-orig="${wrong[1]}"].nope`))) fail('T3: wrong picks are not marked after a reload');
        }
        await page.click(`[data-pick="${it.id}"][data-orig="${q.answer}"]`);
        await page.click(`[data-check="i:${it.id}"]`);
      } else {
        await page.fill(`[data-typed="${it.id}"]`, altForm(q));
        await page.click(`[data-check="i:${it.id}"]`);
      }
      await page.waitForTimeout(120);
      if (!(await page.$(`.q[data-id="${it.id}"].is-right`))) fail(`${it.id}: “${it.type === 'mc' ? 'the key' : altForm(q)}” isn't marked right`);
      else if (!(await page.textContent(`#q-${it.id}`)).includes(T.items[it.id].why)) fail(`Q1 ${it.id}: no explanation after the right answer`);
    }
    if (p.frq) await page.fill(`[data-frq="${p.frq.id}"]`, T.frq[p.frq.id].model);
    if (p.tq) {
      if (await page.isDisabled('#tqopen')) fail('T2: the code box is off after the two short answers');
      await page.fill('#tqcode', 'WRONG-CODE'); await page.click('#tqopen'); await page.waitForTimeout(400);
      if (await page.$('#tqa')) fail('T2: a wrong code opened the teacher question');
      await page.fill('#tqcode', T.tq.code.toLowerCase()); await page.click('#tqopen'); await page.waitForSelector('#tqa', { timeout: 8000 }).catch(() => fail('T2: the code does not open the question'));
      if (await page.$('#tqa')) {
        if (!(await page.textContent('#tq')).includes(T.tq.question)) fail('T2: the opened question is not the teacher question');
        if (await page.$('.navl li.on.done')) fail('T2: typing the code marked the page done');
        await page.fill('#tqa', 'The salt makes the water denser, so the egg floats now.');
      }
    }
    if (!(await page.$eval(`#note-${p.id}`, (d) => d.open))) await page.click(`#note-${p.id} summary`);
    await page.fill(`[data-note="${p.id}"]`, `My own note on ${p.id}`);
    await page.waitForTimeout(350);
    const done = await page.$(`.navl a[href="#/${p.id}"]`).then((a) => a && a.evaluate((el) => el.parentElement.classList.contains('done')));
    if (!done) fail(`page ${p.id} is not marked done after all its work`);
    if (shots && ['lab', 'check'].includes(p.part)) await page.screenshot({ path: path.join(shots, `${tag}-${p.id}.png`), fullPage: true });
  }
  if (rule) { await go(page, rule.id); if (await page.$('.locked-card')) fail('L7: the rule card is still locked after the labs'); }
  const prog = await page.textContent('#ptext');
  if (!prog.includes(`${req.length} of ${req.length}`)) fail(`L2: the lesson isn't finished without the optional pages (“${prog}”)`);
  // N1: My notes
  await go(page, 'notes');
  const notes = await page.textContent('.page');
  for (const it of Object.values(T.items)) if (it.type !== 'open' && it.why && !notes.includes(it.why)) fail(`N1: My notes lacks the explanation of “${it.prompt.slice(0, 40)}”`);
  for (const it of Object.values(T.items)) { if (it.hint && notes.includes(it.hint)) fail(`N1: My notes shows a hint (“${it.hint.slice(0, 40)}”)`); if (it.look) for (const l of it.look) if (notes.includes(l)) fail('N1: My notes shows a look-for'); }
  if (!notes.includes('I thought heavy things always sink')) fail('N2: Where I got stuck lacks the thinking sentence');
  if (!/Where I got stuck/.test(notes) || !/got it later/.test(notes)) fail('N2: Where I got stuck lacks the wrong tries');
  if (!notes.includes(T.tq.question)) fail('N1: My notes lacks the teacher question and its answer');
  if (!notes.includes('My own note on')) fail('N3: My notes lacks the own notes');
  if (!/\[[^\]]+\]/.test(notes)) fail('N1: My notes lacks the filled blanks');
  const last = await page.$$eval('.navl li', (l) => l.at(-1).textContent);
  if (!/My notes/.test(last)) fail('N1: My notes is not last in the navigation');
  if (shots) await page.screenshot({ path: path.join(shots, `${tag}-notes.png`), fullPage: true });
  // N4: print
  await page.emulateMedia({ media: 'print' });
  const pr = await page.evaluate(() => ({ side: getComputedStyle(document.querySelector('.side')).display, btn: getComputedStyle(document.querySelector('#print')).display, name: getComputedStyle(document.querySelector('.nameline')).display }));
  if (pr.side !== 'none' || pr.btn !== 'none' || pr.name === 'none') fail(`N4: print layout (sidebar ${pr.side}, buttons ${pr.btn}, Name/Date line ${pr.name})`);
  await page.emulateMedia({ media: 'screen' });
}

export async function browserChecks(browser, pack, doc, b, file, teacherFile, { shots, folder } = {}) {
  const problems = [];
  const { data, teacher: T } = b;
  const clockInit = async (ctx) => { const pg = await ctx.newPage(); return pg; };
  for (const width of [375, 1280]) {
    const tag = `${data.lessonId}@${width}`;
    const context = await browser.newContext({ viewport: { width, height: 860 }, acceptDownloads: true, serviceWorkers: 'block' });
    const outside = [];
    await context.route('**/*', (r) => { const u = r.request().url(); if (/^(file|data|blob):/.test(u)) return r.continue(); outside.push(u); return r.abort(); });
    const page = await clockInit(context);
    page.setDefaultTimeout(8000);
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install();
    await page.goto('file://' + file); await page.waitForSelector('.page');
    try { await playLesson(page, doc, b, problems, tag, { shots }); } catch (e) { problems.push(`${tag}: the play-through stopped: ${e.message.split('\n')[0]}`); }
    // reload keeps everything
    await page.reload(); await page.waitForSelector('.page');
    const prog = await page.textContent('#ptext');
    if (!/lesson finished/.test(prog)) problems.push(`${tag}: S1: after a reload the progress is “${prog}”`);
    if (!/Saved automatically at/.test(await page.textContent('#saved'))) problems.push(`${tag}: S1: no “Saved automatically at …” line`);
    if (width === 1280) {
      // S1: backup file round trip and save code round trip, into fresh browsers (merge, never clear)
      await go(page, 'notes');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkDown')]);
      const bfile = path.join(os.tmpdir(), `pp-lesson-backup-${process.pid}.json`); await dl.saveAs(bfile);
      await page.click('#codeShow'); await page.waitForFunction(() => /^PPL[01]\./.test(document.querySelector('#codeBox').value));
      const code = await page.inputValue('#codeBox');
      if (!code.startsWith('PPL1.')) problems.push(`${tag}: S1: the save code isn't compressed`);
      for (const [how, act] of [['backup file', async (pg) => { await pg.setInputFiles('#bkFile', bfile); }], ['save code', async (pg) => { await pg.fill('#codeBox', code); await pg.click('#codeLoad'); }]]) {
        const c2 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
        const p2 = await c2.newPage();
        await p2.goto('file://' + file + '#/notes'); await p2.waitForSelector('#bkFile', { state: 'attached' });
        await p2.fill('[data-extra]', 'A note made on the second device'); await p2.waitForTimeout(400);
        await act(p2); await p2.waitForFunction(() => /Restored/.test(document.querySelector('#bkmsg')?.textContent || ''), null, { timeout: 5000 }).catch(() => problems.push(`${tag}: S1: the ${how} didn't restore`));
        const pg2 = await p2.textContent('#ptext');
        if (!/lesson finished/.test(pg2)) problems.push(`${tag}: S1: after loading the ${how} the progress is “${pg2}”`);
        await p2.goto('file://' + file + '#/notes'); await p2.reload(); await p2.waitForSelector('[data-extra]');
        const ex = await p2.inputValue('[data-extra]');
        if (!ex.includes('second device')) problems.push(`${tag}: S3: loading the ${how} erased a note already on the device`);
        await c2.close();
      }
      fs.rmSync(bfile, { force: true });
    }
    if (outside.length) problems.push(`${tag}: outside requests: ${outside.slice(0, 3).join(', ')}`);
    if (errors.length) problems.push(`${tag}: page errors: ${errors.slice(0, 3).join('; ')}`);
    await context.close();
  }
  // blocked storage and no crypto.subtle: a banner, and checking (and the teacher question) still work
  {
    const c = await browser.newContext({ viewport: { width: 375, height: 800 } });
    await c.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
      try { Object.defineProperty(window.crypto, 'subtle', { get() { return undefined; } }); } catch (e) { /* */ }
    });
    const pg = await c.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto('file://' + file); await pg.waitForSelector('.page');
    if (await pg.isHidden('#blocked')) problems.push('blocked storage: no banner');
    const it = data.pages.flatMap((p) => p.items.map((i) => ({ i, p }))).find(({ i }) => i.type === 'mc');
    if (it) {
      await pg.evaluate((id) => { location.hash = '#/' + id; }, it.p.id); await pg.waitForSelector(`[data-pick="${it.i.id}"]`);
      for (const p of data.pages) if (p.part === 'lab' && p.id === it.p.id) break;
      await pg.click(`[data-pick="${it.i.id}"][data-orig="${T.items[it.i.id].answer}"]`); await pg.click(`[data-check="i:${it.i.id}"]`);
      await pg.waitForSelector(`.q[data-id="${it.i.id}"].is-right`, { timeout: 5000 }).catch(() => problems.push('blocked storage / no crypto.subtle: checking an answer does not work'));
    }
    const tqp = data.pages.find((p) => p.tq);
    if (tqp) {
      await pg.evaluate((id) => { location.hash = '#/' + id; }, tqp.id); await pg.waitForSelector('#tq');
      for (const q of tqp.items.filter((i) => i.type === 'open')) await pg.fill(`[data-open="${q.id}"]`, T.items[q.id].model);
      await pg.fill('#tqcode', T.tq.code); await pg.click('#tqopen');
      await pg.waitForSelector('#tqa', { timeout: 8000 }).catch(() => problems.push('T1: the teacher question does not open without crypto.subtle (the fallback)'));
    }
    if (errs.length) problems.push(`blocked storage: page errors: ${errs.join('; ')}`);
    await c.close();
  }
  // D2: inside a sandboxed srcdoc frame, href="#/…" links still move between pages
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const pg = await c.newPage();
    const html = fs.readFileSync(file, 'utf8');
    await pg.setContent(`<!doctype html><iframe id="f" sandbox="allow-scripts" style="width:1200px;height:800px" srcdoc="${html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`);
    const fr = await (await pg.waitForSelector('#f')).contentFrame();
    await fr.waitForSelector('.page');
    const target = data.pages[2].id;
    await fr.click(`.navl a[href="#/${target}"]`);
    await fr.waitForSelector(`.page[data-page="${target}"]`, { timeout: 3000 }).catch(() => problems.push('D2: a #/ link does not work inside a sandboxed frame'));
    await c.close();
  }
  // S5: saves from earlier builds
  if (folder) (await checkOldSaves(browser, file, data, savesFor(folder, data.lessonId))).forEach((m) => problems.push(m));
  // C2, C3: the teacher copy
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const pg = await c.newPage();
    await pg.goto('file://' + file); await pg.waitForSelector('.page');
    await pg.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, name: 'Sample student', items: {} })), data.key);
    await pg.goto('file://' + teacherFile); await pg.waitForSelector('#tbar');
    const chk = data.pages.find((p) => p.items.some((i) => i.type === 'mc'));
    await go(pg, chk.id);
    const mcItem = chk.items.find((i) => i.type === 'mc');
    const key = await pg.$(`[data-pick="${mcItem.id}"][data-orig="${T.items[mcItem.id].answer}"].key`);
    if (!/ANSWERS/.test(await pg.textContent('#tbar')) || !key) problems.push('C2: the teacher copy does not start on ANSWERS with the right option (by its original number) highlighted');
    await pg.keyboard.press('a'); await pg.keyboard.press('Shift+A');
    if (!/ANSWERS/.test(await pg.textContent('#tbar'))) problems.push('C2: a letter key switched the teacher copy');
    await pg.keyboard.press('F2');
    if (!/BLANK/.test(await pg.textContent('#tbar')) || await pg.$('.choice.key')) problems.push('C2: F2 does not switch to BLANK');
    await pg.keyboard.press('F2');
    if (!(await pg.isDisabled(`[data-pick="${mcItem.id}"]`))) problems.push('C3: the teacher copy is not display-only');
    await pg.click('#treset'); await pg.click('#treset');
    const left = await pg.evaluate((k) => localStorage.getItem(k), data.key);
    if (left !== null) problems.push('C3: Reset lesson (two clicks) did not erase the lesson on this device');
    await c.close();
  }
  return problems;
}

/* ---------- main ---------- */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const a = process.argv.slice(2), flags = {}, opt = {}, files = [];
  for (let i = 0; i < a.length; i++) { if (a[i] === '--no-browser' || a[i] === '--only-saves') flags[a[i].slice(2)] = true; else if (a[i].startsWith('--')) opt[a[i].slice(2)] = a[++i]; else files.push(a[i]); }
  if (!files.length) { console.error('usage: node checks/lesson.mjs <pack.json> [--no-browser | --only-saves] [--shots <dir>] [--folder <dir>]'); process.exit(2); }
  const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));
  let bad = 0;
  const pw = flags['no-browser'] ? null : loadPlaywright();
  let browser = null;
  if (pw) { const exe = process.env.PP_CHROMIUM || '/opt/pw-browsers/chromium'; try { browser = await pw.chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox'] }); } catch (e) { browser = null; } }
  if (!flags['no-browser'] && !browser) console.log('⏭️  browser checks skipped: Playwright or its Chromium is not installed');
  for (const f of files) {
    const pack = loadPack(f);
    const folder = opt.folder || path.dirname(path.resolve(f));
    for (const doc of pack.documents.filter(isLessonDoc)) {
      const lockFile = path.join(folder, 'ids.lock.json');
      const b = buildLesson(pack, doc, brand, { lockFile: fs.existsSync(lockFile) ? lockFile : null, writeLock: false });
      const problems = [...b.problems];
      if (!problems.length) problems.push(...await contentProblems(pack, doc, b));
      if (!b.teacherHtml.includes(TEACHER_MARK) || b.teacherHtml.replace(/<script>window\.PPL_TEACHER=[^\n]*<\/script>\n/, '').replace('<title>TEACHER COPY · ', '<title>') !== b.html) problems.push('C1: the teacher copy is not the student file plus the teacher block');
      if (!problems.length && browser) {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-lesson-check-'));
        const base = slug(doc.title);
        const file = path.join(tmp, `${base}.html`), tfile = path.join(tmp, `${base}-TEACHER-COPY.html`);
        fs.writeFileSync(file, b.html); fs.writeFileSync(tfile, b.teacherHtml);
        if (opt.shots) fs.mkdirSync(opt.shots, { recursive: true });
        try {
          if (flags['only-saves']) (await checkOldSaves(browser, file, b.data, savesFor(folder, b.data.lessonId))).forEach((m) => problems.push(m));
          else problems.push(...await browserChecks(browser, pack, doc, b, file, tfile, { shots: opt.shots, folder }));
        }
        finally { fs.rmSync(tmp, { recursive: true, force: true }); }
      }
      for (const w of b.warnings) console.log(`  ⚠️  ${w}`);
      if (problems.length) { bad++; console.log(`✗ ${f} · ${doc.title}:\n  - ${problems.join('\n  - ')}`); }
      else console.log(`✓ ${f} · ${doc.title}: builds to the standard (${b.report.required} required min, mechanics ${b.report.mechanics.join(' → ')}, seed ${b.data.seed})${browser ? '; played through at 375 and 1280 px' : ''}`);
    }
  }
  if (browser) await browser.close();
  process.exit(bad ? 1 : 0);
}
