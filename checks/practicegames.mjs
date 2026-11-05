#!/usr/bin/env node
/* Checks for practice games (docs/KINDS-PRACTICEGAMES.md).

     node checks/practicegames.mjs <pack.json> [more packs] [--no-browser] [--shots <dir>] [--self-test]

   Content (exit 1 on any problem), for every `practicegame` document:
     - the game builds: a known template, question types the template can play, one version, enough questions, a known
       theme preset with readable colors (every text pair 4.5:1 or better), math that typesets
     - every choice question has its right answer among its choices (an index into 2–6 choices); true/false is true or
       false; every typed answer and accepted form reads the way the page reads it (numbers as numbers)
     - every fix-it item has exactly one [[mistake]] span, at least 3 right parts to tap besides it, and a fix that is
       not the mistake itself; its fix choices hold the fix once and never repeat
     - checked again here, on its own, against the built page's data: each question's answer is the pack's key, and the
       page's own reader (scripts/render/practicegames/reader.js) marks every accepted form right
     - the file is self-contained: a Content-Security-Policy that blocks the network, and no outside URL in any src,
       href, url() or @import
   Browser (Playwright; skipped with a message when it isn't installed), for each game at 375 px:
     - opened from a file with every other request blocked: no outside request, no page error or console error
     - a full game: right and wrong answers (and, on the shooter and the grid, one answer by keyboard), the results
       screen lists the misses with the right answer, no sideways scroll at 375 px on the start, play and results screens
     - "Practice my misses" plays only the misses and, all right, clears them; a reload keeps the best score
     - with storage blocked, a notice shows and the game still plays
   --shots <dir> saves start, play and results screenshots at 375 and 1280 px, light and dark.
   --self-test breaks copies of samples/_cap-practicegame's packs one way at a time and checks each is caught. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadPack, docName, argsOf } from './pack-lib.mjs';
import { isPracticeGameDoc, gameHtml, loadReader, openOffline, playThrough, fixitParts } from '../scripts/render/practicegames.mjs';
import { slug, vv, tfValue } from '../scripts/render/util.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));

// the file name base the renderer gives a document (scripts/render-pack.mjs)
function basesOf(pack) {
  const used = new Set(), out = new Map();
  for (const doc of pack.documents) {
    let base = slug(doc.title || doc.item);
    for (let i = 2; used.has(base); i++) base = `${slug(doc.title || doc.item)}-${i}`;
    used.add(base); out.set(doc, base);
  }
  return out;
}

/* ---------- content ---------- */
export function checkContent(pack) {
  const problems = [], built = [];
  const R = loadReader();
  const bases = basesOf(pack);
  pack.documents.forEach((doc, d) => {
    if (!isPracticeGameDoc(doc)) return;
    const name = docName(doc, d), base = bases.get(doc);
    const { html, data, problems: buildProblems } = gameHtml(pack, doc, base, brand);
    problems.push(...buildProblems);
    if (!data) return;
    built.push({ doc, base, html, data });
    // the page holds what the pack says, checked on its own
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    for (const q of (doc.sections || []).flatMap((s) => s.questions || [])) {
      const where = `${name} ${q.id}`, g = byId.get(String(q.id));
      if (!g) continue;   // already a build problem
      const answer = vv(q.answer), accept = vv(q.accept) || [];
      if (q.type === 'mc') {
        const ch = vv(q.choices) || [];
        if (!(Number.isInteger(answer) && ch[answer] != null)) problems.push(`${where}: the right answer isn't among the choices`);
        if (g.answer !== answer || g.choices.length !== ch.length) problems.push(`${where}: the game's key is not the pack's key`);
      } else if (q.type === 'tf') {
        if (![true, false, 'true', 'false', 'True', 'False'].includes(answer)) problems.push(`${where}: a true/false answer must be true or false`);
        if (g.answer !== (tfValue(answer) ? 0 : 1)) problems.push(`${where}: the game's key is not the pack's key`);
      } else if (q.type === 'numeric') {
        for (const f of [answer, ...accept]) { const v = R.parseNum(String(f).replace(/\$/g, ''), data.unitMarks); if (!v || !g.typed.nums.some((n) => n[0] === v[0] && n[1] === v[1])) problems.push(`${where}: the game doesn't accept “${f}”`); }
      } else if (q.type === 'short') {
        for (const f of [answer, ...accept]) if (!g.typed.texts.includes(R.normText(f))) problems.push(`${where}: the game doesn't accept “${f}”`);
      } else if (q.type === 'fixit') {
        const p = fixitParts(vv(q.prompt));
        if (p.error) continue;   // already a build problem
        const errs = g.pieces.filter((x) => x.e).length;
        if (!errs) problems.push(`${where}: no piece of the paper is the mistake`);
        if (g.choices) {
          if (!(Number.isInteger(answer) && answer >= 0 && answer < g.choices.length)) problems.push(`${where}: the fix isn't among the fix choices`);
          const norm = (vv(q.choices) || []).map(R.normFix);
          if (norm.filter((c) => c === norm[answer]).length > 1) problems.push(`${where}: the fix appears twice among the choices`);
          if (norm.includes(R.normFix(p.err))) problems.push(`${where}: a fix choice is the mistake itself`);
        } else {
          for (const f of [answer, ...accept]) if (!g.typed.texts.includes(R.normFix(f))) problems.push(`${where}: the game doesn't accept the fix “${f}”`);
          if ([answer, ...accept].some((f) => R.normFix(f) === R.normFix(p.err))) problems.push(`${where}: an accepted fix is the mistake itself`);
        }
      }
    }
    // self-contained: no network
    if (!/http-equiv="Content-Security-Policy" content="default-src 'none';[^"]*connect-src 'none'/.test(html)) problems.push(`${name}: the page has no Content-Security-Policy blocking the network`);
    const outside = [...html.matchAll(/(?:\s(?:src|href)\s*=\s*["']?\s*|url\(\s*["']?|@import\s+["']?)(https?:|\/\/)/gi)];
    if (outside.length) problems.push(`${name}: ${outside.length} outside URL(s) in the page`);
  });
  return { problems, built };
}

/* ---------- browser ---------- */
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch {}
  try { const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(); return createRequire(path.join(g, 'noop.js'))('playwright'); } catch { return null; }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function smoke(browser, file, data, fail, shotsDir) {
  const T = data.template;
  const wide = async (page, what) => { const w = await page.evaluate(() => document.documentElement.scrollWidth); if (w > 376) fail(`sideways scroll at 375 px on the ${what} screen (${w} px)`); };
  // 1. a full game, normal motion
  const { context, page, outside, errors } = await openOffline(browser, file, { width: 375, height: 760 });
  await wide(page, 'start');
  await page.click('#pg-play');
  // one answer by keyboard first
  if (T === 'shooter') {
    await page.waitForSelector('#sh-q[data-qid]');
    const q = await page.evaluate(() => { const id = document.querySelector('#sh-q').getAttribute('data-qid'); return window.PG_DATA.questions.find((x) => x.id === id); });
    if (!q.typed) {
      const k = await page.evaluate((c) => document.querySelector(`.tg[data-c="${c}"] .k`).textContent, q.answer);
      await page.keyboard.press(k);
      await page.waitForFunction(() => document.querySelector('.fb.ok'), null, { timeout: 4000 }).catch(() => fail('a right answer by number key did not fire'));
    }
  } else if (T === 'grid') {
    const q = await page.evaluate(() => { const id = document.querySelector('[data-qid]').getAttribute('data-qid'); return window.PG_DATA.questions.find((x) => x.id === id); });
    if (q.typed) { await page.fill('#pg-in', q.typedShow); await page.press('#pg-in', 'Enter'); } else await page.click(`#gb-opts button[data-c="${q.answer}"]`);
    if (await page.evaluate(() => document.querySelector('#gb').getAttribute('data-phase')) !== 'aim') fail('a right answer did not earn a shot');
    else {
      await page.focus('#gb-enemy'); await page.keyboard.press('ArrowRight'); await wait(150); await page.keyboard.press('Enter'); await wait(150);
      const ph = await page.evaluate(() => document.querySelector('#gb').getAttribute('data-phase'));
      if (!['next', 'name'].includes(ph)) fail(`firing by keyboard did not work (phase ${ph})`);
    }
  }
  await wide(page, 'play');
  const played = await playThrough(page, (i) => i % 2 === 1);
  await page.waitForSelector('#pg-results', { timeout: 10000 }).catch(() => fail('the game never reached the results screen'));
  await wide(page, 'results');
  const missed = await page.$$eval('.missed li', (l) => l.length);
  const listed = await page.$$eval('.missed li', (l) => l.every((x) => /Right answer:/.test(x.textContent)));
  if (!missed) fail(`the results screen lists no misses after ${played.asked - played.rightCount} wrong answers`);
  if (!listed) fail('a listed miss has no right answer');
  // 2. practice my misses: all right clears them
  if (await page.$('#pg-replay')) {
    await page.click('#pg-replay');
    const n = await page.evaluate(() => window.PG_DATA.questions.length);
    const r = await playThrough(page, () => true);
    await page.waitForSelector('#pg-results', { timeout: 10000 }).catch(() => fail('the misses round never reached the results screen'));
    if (r.asked > missed || r.asked >= n) fail(`"Practice my misses" asked ${r.asked} questions for ${missed} misses`);
    if (!(await page.$('.fb.ok')) || (await page.$('#pg-replay'))) fail('answering every miss right did not clear the misses');
  } else fail('no "Practice my misses" button after misses');
  // 3. a reload keeps the progress
  await page.reload(); await page.waitForSelector('#pg-play');
  const startText = await page.textContent('#app');
  if (!/Best: \d+ points/.test(startText)) fail('a reload lost the best score');
  if (await page.$('#pg-misses')) fail('a reload still offers misses that were practiced right');
  if (outside.length) fail(`outside requests: ${outside.join(', ')}`);
  if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
  await context.close();
  // 4. storage blocked
  const blocked = await openOffline(browser, file, { width: 375, height: 760, storage: false, reducedMotion: 'reduce' });
  if (!(await blocked.page.$('.notice'))) fail('with storage blocked, no notice shows');
  await blocked.page.click('#pg-play');
  const one = await playThrough(blocked.page, () => true, { stopAfter: 1 });
  if (one.asked !== 1) fail('with storage blocked, the game does not play');
  if (blocked.errors.length) fail(`page errors with storage blocked: ${blocked.errors.join(' | ')}`);
  await blocked.context.close();
  // 5. screenshots
  if (shotsDir) {
    for (const theme of ['light', 'dark']) for (const [w, h] of [[375, 760], [1280, 800]]) {
      const s = await openOffline(browser, file, { width: w, height: h, theme, reducedMotion: 'reduce' });
      const tag = `${path.basename(file, '.html')}-${w}-${theme}`;
      await wait(150);
      await s.page.screenshot({ path: path.join(shotsDir, `${tag}-1-start.png`) });
      await s.page.click('#pg-play');
      await playThrough(s.page, (i) => i % 3 !== 1, { stopAfter: 2 });
      await wait(250);
      await s.page.screenshot({ path: path.join(shotsDir, `${tag}-2-play.png`) });
      await playThrough(s.page, (i) => i % 3 !== 1);
      await s.page.waitForSelector('#pg-results'); await wait(300);
      await s.page.screenshot({ path: path.join(shotsDir, `${tag}-3-results.png`), fullPage: w > 600 ? false : false });
      await s.context.close();
    }
  }
}

export async function checkBrowser(built, { shots } = {}) {
  const pw = loadPlaywright();
  if (!pw) return { skipped: 'Playwright is not installed: browser checks skipped', problems: [] };
  const exe = process.env.PP_CHROMIUM || '/opt/pw-browsers/chromium';
  let browser;
  try { browser = await pw.chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--no-first-run', '--disable-sync'] }); }
  catch (e) { return { skipped: `Chromium would not start (${e.message.split('\n')[0]}): browser checks skipped`, problems: [] }; }
  const problems = [], tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-pgcheck-'));
  try {
    for (const { doc, base, html, data } of built) {
      const file = path.join(tmp, `${base}.html`);
      fs.writeFileSync(file, html);
      if (shots) fs.mkdirSync(shots, { recursive: true });
      try { await smoke(browser, file, data, (m) => problems.push(`${doc.title}: ${m}`), shots); }
      catch (e) { problems.push(`${doc.title}: the browser test stopped: ${e.message.split('\n')[0]}`); }
    }
  } finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
  return { problems };
}

/* ---------- self-test: the checks still bite ---------- */
const CAP = path.join(ROOT, 'samples/_cap-practicegame');
export function selfTest() {
  const load = (d) => JSON.parse(fs.readFileSync(path.join(CAP, d, 'pack.json'), 'utf8'));
  const qs = (p) => p.documents[0].sections.flatMap((s) => s.questions);
  const q = (p, id) => qs(p).find((x) => x.id === id);
  const breaks = [
    ['shooter-g5-math', 'an unknown template', (p) => { p.documents[0].template = 'racer'; }],
    ['shooter-g5-math', 'a choice answer out of range', (p) => { q(p, 's1').answer = 4; }],
    ['shooter-g5-math', 'a typed number that does not read', (p) => { q(p, 's12').accept = ['three-ish']; }],
    ['shooter-g5-math', 'math that does not typeset', (p) => { q(p, 's1').prompt = 'Which fraction is equal to $\\frac{2}{3$?'; }],
    ['shooter-g5-math', 'a fix-it item on the shooter', (p) => { qs(p)[0].type = 'fixit'; }],
    ['grid-g8-science', 'an unknown theme preset', (p) => { p.documents[0].theme.preset = 'volcano'; }],
    ['grid-g8-science', 'too few questions for a battle', (p) => { p.documents[0].sections = [p.documents[0].sections[0]]; p.documents[0].sections[0].questions = p.documents[0].sections[0].questions.slice(0, 3); }],
    ['grid-g8-science', 'a true/false answer that is not true or false', (p) => { q(p, 't1').answer = 'maybe'; }],
    ['fixit-g6-ela', 'a paper with two mistakes marked', (p) => { q(p, 'f1').prompt = '[[Marco]] and [[me]] built the volcano for the science fair.'; }],
    ['fixit-g6-ela', 'a paper with no mistake marked', (p) => { q(p, 'f1').prompt = 'Marco and me built the volcano for the science fair.'; }],
    ['fixit-g6-ela', 'a fix that is the mistake', (p) => { q(p, 'f2').answer = 'it’s'; }],
    ['fixit-g6-ela', 'a fix choice that is the mistake', (p) => { q(p, 'f5').choices[0] = 'are'; }],
    ['fixit-g6-ela', 'a fix choice listed twice', (p) => { q(p, 'f6').choices[0] = 'has'; }],
    ['fixit-g6-ela', 'a paper with too little to tap', (p) => { q(p, 'f8').prompt = 'On [[friday]].'; }],
  ];
  let bad = 0;
  for (const [d, what, f] of breaks) {
    const p = load(d); f(p);
    const { problems } = checkContent(p);
    if (problems.length) console.log(`✓ catches ${what} (${problems[0].slice(0, 110)})`);
    else { bad++; console.log(`✗ did not catch ${what}`); }
  }
  return bad;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { flags, opt, files: all } = argsOf(process.argv);
  const files = all.filter((f) => f !== opt('shots'));
  if (flags.has('--self-test')) { process.exit(selfTest() ? 1 : 0); }
  if (!files.length) { console.error('usage: node checks/practicegames.mjs <pack.json> [--no-browser] [--shots <dir>] [--self-test]'); process.exit(2); }
  let bad = 0;
  for (const f of files) {
    let pack;
    try { pack = loadPack(f); } catch (e) { console.error(`✗ ${e.message}`); bad++; continue; }
    const { problems, built } = checkContent(pack);
    if (!pack.documents.some(isPracticeGameDoc)) { console.log(`✓ practice games ${f}: no practice games`); continue; }
    console.log(`${problems.length ? '✗' : '✓'} practice games ${f}: ${built.length} game(s), ${built.reduce((n, b) => n + b.data.questions.length, 0)} questions, content ${problems.length ? `${problems.length} problem(s)` : 'ok'}`);
    problems.forEach((p) => console.log(`    ✗ ${p}`));
    if (problems.length) { bad++; continue; }
    if (flags.has('--no-browser')) continue;
    const br = await checkBrowser(built, { shots: opt('shots') });
    if (br.skipped) { console.log(`  ⏭️  ${br.skipped}`); continue; }
    console.log(`  ${br.problems.length ? '✗' : '✓'} browser: ${built.map((b) => b.data.template).join(', ')} played offline at 375 px (right, wrong, keyboard, results, practice my misses, reload, storage blocked)${opt('shots') ? `; screenshots in ${opt('shots')}` : ''}`);
    br.problems.forEach((p) => console.log(`    ✗ ${p}`));
    if (br.problems.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
