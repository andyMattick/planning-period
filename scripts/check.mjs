#!/usr/bin/env node
/* npm run check: run before every commit (CLAUDE.md).
     1. The product's name (name and shortName from brand.config.json) appears in no file git tracks or would add,
        except brand.config.json and, in CLAUDE.md and README.md, lines that call it a working name.
     2. menu.json is valid, and docs/PRICING.md explains every item's tokens.
     2b. feasibility.json: every menu item has defaults and limits; limits are [min, max] with min ≤ default ≤ max.
     3. Every agents/*.md brief (not README.md) has a version line and a change log (the auditor bumps them).
     4. The checks still bite: checks/fixtures/good.pack.json passes checks/keys.mjs and checks/test-wise.mjs, and
        broken copies of it (made here, in a temporary folder) fail them.
     5. Every samples/<name>/pack.json passes checks/keys.mjs and checks/test-wise.mjs.
     5a. Every sample with a math check passes checks/math.mjs (SymPy), and broken copies of samples/_cap-math fail it.
     5c. checks/puzzles.mjs catches broken copies of samples/_cap-games (a bad grid, a word twice, a non-unique puzzle…).
     5d. Reading samples pass checks/no-passage.mjs (no-passage bots), except a shrink-only known-failing list.
     5e. Every sample passes checks/cross-item.mjs (no key printed in another item), except a shrink-only known-failing list.
     5b. A sample with an out/ folder (final files) has an approval.json (no release without the teacher's agreement).
     6. If scripts/render-pack.mjs exists, it renders samples/_fixture (skipped with a message until both exist).
     9. Practice games: the packs in samples/_cap-practicegame pass keys, test-wise and checks/practicegames.mjs, and broken copies fail it.
     10. "Paste a link": scripts/test-fetch-page.mjs (the server's address guard, limits and text extraction).
     12. The interactive format: samples/_cap-interactive (quiz, guided notes, review game) passes keys, test-wise, cross-item and checks/interactive-format.mjs.
     11. The weekly test's offline self-test: scripts/weekly-test.mjs --self-test (fixtures import, the order picker).
   Exit 1 on any problem. */
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const ok = (m) => console.log(`✓ ${m}`), skip = (m) => console.log(`⏭️  ${m}`);
const fail = (m) => { problems.push(m); console.log(`✗ ${m}`); };
const readJSON = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

/* 1. the name lives in one place */
let brand;
try { brand = readJSON('brand.config.json'); } catch (e) { fail(`brand.config.json: ${e.message}`); }
if (brand) {
  const names = [...new Set([brand.name, brand.shortName].filter((n) => typeof n === 'string' && n.trim()))];
  if (!names.length) fail('brand.config.json has no name');
  const esc = (s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(names.map(esc).join('|'), 'i');
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  let hits = 0;
  for (const f of files) {
    if (f === 'brand.config.json') continue;
    const p = join(ROOT, f);
    if (!existsSync(p) || statSync(p).size > 5e6) continue;
    const buf = readFileSync(p);
    if (buf.includes(0)) continue;   // binary
    buf.toString('utf8').split('\n').forEach((line, i) => {
      if (!re.test(line)) return;
      if (['CLAUDE.md', 'README.md'].includes(f) && /working name/i.test(line)) return;
      hits++; fail(`${f}:${i + 1} names the product (“${line.trim().slice(0, 80)}”); read it from brand.config.json instead`);
    });
  }
  if (!hits) ok(`the name is only in brand.config.json (${files.length} files read)`);
}

/* 2. the menu */
try {
  const menu = readJSON('menu.json'), errs = [];
  const FORMATS = ['pdf', 'docx', 'pptx', 'html'];   // html: review apps and interactive worksheets (offline, self-contained)
  if (!Array.isArray(menu.grades) || !menu.grades.length) errs.push('no grades');
  if (!Array.isArray(menu.subjects) || !menu.subjects.length) errs.push('no subjects');
  for (const s of menu.subjects || []) {
    if (!s.id || !s.label || !s.checker) errs.push(`subject ${JSON.stringify(s)} needs id, label and checker`);
    else if (s.checker !== 'general' && !existsSync(join(ROOT, 'agents', `blind-${s.checker}.md`))) errs.push(`subject ${s.id}: no agents/blind-${s.checker}.md`);
  }
  const ids = new Set();
  for (const it of [...(menu.items || []), ...(menu.extras || [])]) {
    if (!it.id || !it.label || !it.detail) errs.push(`item ${JSON.stringify(it.id)} needs id, label and detail`);
    if (ids.has(it.id)) errs.push(`item id ${it.id} is used twice`);
    ids.add(it.id);
    if (!Number.isInteger(it.tokens) || it.tokens < 0) errs.push(`${it.id}: tokens must be a whole number, 0 or more`);
  }
  for (const it of menu.items || []) {
    if (!Array.isArray(it.formats) || !it.formats.length || it.formats.some((f) => !FORMATS.includes(f))) errs.push(`${it.id}: formats must be some of ${FORMATS.join(', ')}`);
    if (typeof it.versions !== 'boolean') errs.push(`${it.id}: versions must be true or false`);
    // interactive: true = the order page offers Printable or Interactive for it (docs/KINDS-INTERACTIVE-FORMAT.md)
    if (it.interactive !== undefined && it.interactive !== true) errs.push(`${it.id}: interactive must be true or left out`);
    if (it.interactive && !['worksheet', 'homework', 'quiz', 'test', 'readingquiz', 'studyguide', 'versions', 'notes', 'reviewgame'].includes(it.id)) errs.push(`${it.id}: only items with questions to answer can be interactive`);
  }
  if (!(menu.items || []).length) errs.push('no items');
  const pricing = existsSync(join(ROOT, 'docs/PRICING.md')) ? readFileSync(join(ROOT, 'docs/PRICING.md'), 'utf8') : '';
  if (!pricing) errs.push('docs/PRICING.md is missing');
  else for (const it of menu.items || []) if (!pricing.includes(`\`${it.id}\``)) errs.push(`docs/PRICING.md doesn't explain \`${it.id}\``);
  if (errs.length) errs.forEach((e) => fail(`menu.json: ${e}`)); else ok(`menu.json: ${menu.items.length} items, ${(menu.extras || []).length} extras, every item priced in docs/PRICING.md`);
} catch (e) { fail(`menu.json: ${e.message}`); }

/* 2b. feasibility.json (docs/FEASIBILITY.md): shared by the order page and the onboarding agent */
try {
  const fz = readJSON('feasibility.json'), menu = readJSON('menu.json'), errs = [];
  const ids = (menu.items || []).map((i) => i.id);
  const qpp = fz.questionsPerPage || {};
  if (!(fz.wordsPerPage > 0)) errs.push('wordsPerPage must be more than 0');
  if (!(qpp.low > 0 && qpp.low <= qpp.high)) errs.push('questionsPerPage needs low > 0 and low ≤ high');
  const qps = fz.fromStandardsOnly && fz.fromStandardsOnly.questionsPerStandard;
  if (!(Array.isArray(qps) && qps.length === 2 && qps[0] > 0 && qps[0] <= qps[1])) errs.push('fromStandardsOnly.questionsPerStandard must be [min, max] with 0 < min ≤ max');
  for (const m of ['tooMany', 'noSource', 'defaultUsed']) if (!fz.messages || typeof fz.messages[m] !== 'string') errs.push(`messages.${m} is missing`);
  for (const id of ids) {
    const d = fz.defaults && fz.defaults[id], l = fz.limits && fz.limits[id];
    if (!d) errs.push(`${id}: no defaults`);
    if (!l) errs.push(`${id}: no limits`);
    if (!d || !l) continue;
    for (const [k, r] of Object.entries(l)) {
      if (!(Array.isArray(r) && r.length === 2 && r.every(Number.isFinite) && r[0] <= r[1])) { errs.push(`${id}.${k}: limits must be [min, max] with min ≤ max`); continue; }
      if (typeof d[k] === 'number' && !(r[0] <= d[k] && d[k] <= r[1])) errs.push(`${id}.${k}: default ${d[k]} is outside [${r[0]}, ${r[1]}]`);
    }
    for (const [k, v] of Object.entries(d)) if (typeof v === 'number' && !l[k] && !['choices'].includes(k)) errs.push(`${id}.${k}: a default (${v}) with no limits`);
  }
  for (const k of [...Object.keys(fz.defaults || {}), ...Object.keys(fz.limits || {})]) if (!ids.includes(k)) errs.push(`${k} is in feasibility.json but not in menu.json`);
  if (errs.length) errs.forEach((e) => fail(`feasibility.json: ${e}`)); else ok(`feasibility.json: defaults and limits for all ${ids.length} menu items, min ≤ default ≤ max`);
} catch (e) { fail(`feasibility.json: ${e.message}`); }

/* 3. the briefs */
const AGENTS = join(ROOT, 'agents');
if (existsSync(AGENTS)) {
  const briefs = readdirSync(AGENTS).filter((f) => f.endsWith('.md') && f !== 'README.md');
  let bad = 0;
  for (const f of briefs) {
    const t = readFileSync(join(AGENTS, f), 'utf8');
    if (!/^\*\*Version \d+\*\*/m.test(t)) { bad++; fail(`agents/${f}: no "**Version N**" line`); }
    if (!/^## Change log/m.test(t)) { bad++; fail(`agents/${f}: no "## Change log"`); }
  }
  if (!bad) ok(`agents/: ${briefs.length} briefs, each with a version and a change log`);
} else fail('agents/ is missing');

/* 4 and 5. the checks, and the samples */
const run = (script, file) => spawnSync(process.execPath, [join(ROOT, 'checks', script), file], { cwd: ROOT, encoding: 'utf8' });
const FIX = join(ROOT, 'checks/fixtures/good.pack.json');
if (existsSync(FIX)) {
  for (const s of ['keys.mjs', 'test-wise.mjs']) { const r = run(s, FIX); if (r.status === 0) ok(`checks/${s} passes the fair fixture`); else fail(`checks/${s} fails checks/fixtures/good.pack.json:\n${r.stdout}${r.stderr}`); }
  const tmp = mkdtempSync(join(tmpdir(), 'pp-check-'));
  const good = JSON.parse(readFileSync(FIX, 'utf8'));
  const quiz = () => { const p = structuredClone(good); return [p, p.documents.find((d) => d.item === 'quiz')]; };
  const breaks = [];
  { const [p, q] = quiz(); const x = q.sections[0].questions[0]; x.choices.A[1] = x.choices.A[0]; breaks.push(['keys.mjs', 'two choices the same', p]); }
  { const [p, q] = quiz(); const x = q.sections[0].questions[0]; x.choices.A[2] = '0.6'; breaks.push(['keys.mjs', 'two choices with the same value', p]); }
  { const [p, q] = quiz(); q.sections[0].questions[1].answer.B = 7; breaks.push(['keys.mjs', 'an answer index out of range', p]); }
  { const [p, q] = quiz(); const x = q.sections[0].questions[2]; x.accept = [x.choices.A[0]]; breaks.push(['keys.mjs', 'accept holding a wrong choice', p]); }
  { const [p, q] = quiz(); const x = q.sections[0].questions[3]; x.prompt.B = x.prompt.A; x.choices.B = [...x.choices.A].reverse(); x.answer.B = 3 - x.answer.A; breaks.push(['keys.mjs', 'B repeating A word for word', p]); }
  { const [p, q] = quiz(); q.sections[0].questions[4].level = { A: 2, B: 3 }; breaks.push(['keys.mjs', 'A and B at different levels', p]); }
  { const [p, q] = quiz(); delete q.versions; breaks.push(['keys.mjs', 'a quiz without versions', p]); }
  { const [p, q] = quiz(); q.sections[0].questions[0].passage = 'p9'; breaks.push(['keys.mjs', 'a question citing a passage that is not there', p]); }
  { const [p, q] = quiz(); q.format = 'interactive'; breaks.push(['keys.mjs', 'an interactive document with no grading', p]); }
  { const [p, q] = quiz(); q.grading = 'auto'; breaks.push(['keys.mjs', 'grading on a printable document', p]); }
  { const [p, q] = quiz(); q.item = 'test'; breaks.push(['keys.mjs', 'a test with too little or too much level 3', p]); q.sections[0].questions.forEach((x) => { x.level = 3; }); }
  { const [p, q] = quiz(); // every key moved to A and made the longest
    for (const x of q.sections[0].questions) for (const v of ['A', 'B']) { const c = x.choices[v], k = c.splice(x.answer[v], 1)[0]; c.unshift(`${k} (shown in the work)`); x.answer[v] = 0; }
    breaks.push(['test-wise.mjs', 'every key in A and the longest', p]); }
  { const [p, q] = quiz(); const ws = p.documents.find((d) => d.item === 'worksheet'); // the quiz's B copies A's choices: the memorizer remembers
    for (const x of q.sections[0].questions) { x.choices.B = [...x.choices.A]; x.answer.B = x.answer.A; }
    ws.sections[0].questions = ws.sections[0].questions.slice(0, 1); breaks.push(['test-wise.mjs', 'B reusing A\'s choices (memorizer and same letter)', p]); }
  breaks.forEach(([s, what, p], i) => {
    const f = join(tmp, `broken-${i}.json`); writeFileSync(f, JSON.stringify(p));
    const r = run(s, f);
    if (r.status === 1) ok(`checks/${s} catches ${what}`); else fail(`checks/${s} did not catch ${what} (exit ${r.status}):\n${r.stdout}${r.stderr}`);
  });
  rmSync(tmp, { recursive: true, force: true });
} else fail('checks/fixtures/good.pack.json is missing');

const SAMPLES = join(ROOT, 'samples');
const packs = existsSync(SAMPLES) ? readdirSync(SAMPLES).map((d) => join('samples', d, 'pack.json')).filter((p) => existsSync(join(ROOT, p))) : [];
if (!packs.length) skip('no samples/*/pack.json yet: nothing to check');
for (const p of packs) for (const s of ['keys.mjs', 'test-wise.mjs', 'puzzles.mjs']) {   // puzzles.mjs: games and puzzles (docs/KINDS-GAMES.md)
  const r = run(s, join(ROOT, p));
  if (r.status === 0) ok(`${p} passes checks/${s}`); else fail(`${p} fails checks/${s}:\n${r.stdout}${r.stderr}`);
}

/* 5d. reading items (docs/audits/AUDIT-2026-11-07-ela.md): checks/no-passage.mjs bites (--self-test), and every sample
   with reading questions passes it, except the ones in checks/no-passage-debt.json. That list can only shrink: a pack on
   it that now passes must come off, and nothing outside NO_PASSAGE_DEBT_MAX may ever be added. */
{
  const NP = join(ROOT, 'checks', 'no-passage.mjs'), DEBT = 'checks/no-passage-debt.json';
  const NO_PASSAGE_DEBT_MAX = [];   // empty since Nov 7, 2026: g7-ela2 remade under option 1, g7-ela retired to archive/samples
  const st = spawnSync(process.execPath, [NP, '--self-test'], { cwd: ROOT, encoding: 'utf8' });
  if (st.status === 0) ok(`checks/no-passage.mjs --self-test (${(st.stdout.match(/^✓/gm) || []).length} cases)`); else fail(`checks/no-passage.mjs --self-test failed:\n${st.stdout}${st.stderr}`);
  let debt = {};
  try { debt = Object.fromEntries(Object.entries(readJSON(DEBT)).filter(([k]) => !k.startsWith('_'))); } catch (e) { fail(`${DEBT}: ${e.message}`); }
  for (const k of Object.keys(debt)) if (!NO_PASSAGE_DEBT_MAX.includes(k)) fail(`${DEBT} lists ${k}: the list can only shrink (a new pack fixes its questions instead)`);
  for (const p of packs) {
    const r = spawnSync(process.execPath, [NP, join(ROOT, p)], { cwd: ROOT, encoding: 'utf8' });
    if (/no reading questions/.test(r.stdout)) continue;
    if (r.status === 0 && debt[p]) fail(`${p} now passes checks/no-passage.mjs: take it off ${DEBT}`);
    else if (r.status === 0) ok(`${p} passes checks/no-passage.mjs`);
    else if (debt[p]) skip(`${p} fails checks/no-passage.mjs, known (${DEBT}: needs the remake): ${(r.stdout.split('\n')[0] || '').replace(/^✗\s*/, '').slice(0, 140)}`);
    else fail(`${p} fails checks/no-passage.mjs:\n${r.stdout}${r.stderr}`);
  }
}

/* 5e. cross-item (docs/audits/AUDIT-2026-11-07-ela-try-c.md, proposal 2, adopted Nov 7, 2026): checks/cross-item.mjs
   bites (--self-test), and every sample passes it (no item's key printed in another item of the same version), except
   the ones in checks/cross-item-debt.json, listed for the owner when the check came in. That list can only shrink, as 5d. */
{
  const CI = join(ROOT, 'checks', 'cross-item.mjs'), DEBT = 'checks/cross-item-debt.json';
  const CROSS_ITEM_DEBT_MAX = ['samples/g7-ela2/pack.json'];   // g11-history and g8-science fixed Nov 7, 2026
  const st = spawnSync(process.execPath, [CI, '--self-test'], { cwd: ROOT, encoding: 'utf8' });
  if (st.status === 0) ok(`checks/cross-item.mjs --self-test (${(st.stdout.match(/^✓/gm) || []).length} cases)`); else fail(`checks/cross-item.mjs --self-test failed:\n${st.stdout}${st.stderr}`);
  let debt = {};
  try { debt = Object.fromEntries(Object.entries(readJSON(DEBT)).filter(([k]) => !k.startsWith('_'))); } catch (e) { fail(`${DEBT}: ${e.message}`); }
  for (const k of Object.keys(debt)) if (!CROSS_ITEM_DEBT_MAX.includes(k)) fail(`${DEBT} lists ${k}: the list can only shrink (a new pack fixes its questions instead)`);
  for (const p of packs) {
    const r = spawnSync(process.execPath, [CI, join(ROOT, p)], { cwd: ROOT, encoding: 'utf8' });
    if (/nothing to check/.test(r.stdout)) continue;
    if (r.status === 0 && debt[p]) fail(`${p} now passes checks/cross-item.mjs: take it off ${DEBT}`);
    else if (r.status === 0) ok(`${p} passes checks/cross-item.mjs`);
    else if (debt[p]) skip(`${p} fails checks/cross-item.mjs, known (${DEBT}): ${(r.stdout.split('\n')[0] || '').replace(/^✗\s*/, '').slice(0, 140)}`);
    else fail(`${p} fails checks/cross-item.mjs:\n${r.stdout}${r.stderr}`);
  }
}

/* 5a. math (docs/KINDS-MATH.md): every sample with a `math.check` passes checks/math.mjs (SymPy), and the check bites */
const hasMathCheck = (p) => JSON.stringify(JSON.parse(readFileSync(join(ROOT, p), 'utf8')).documents || []).includes('"math":{');
const mathPacks = packs.filter(hasMathCheck);
for (const p of mathPacks) {
  const r = run('math.mjs', join(ROOT, p));
  if (r.status === 0) ok(`${p} passes checks/math.mjs`); else fail(`${p} fails checks/math.mjs:\n${r.stdout}${r.stderr}`);
}
const CAP_MATH = join(ROOT, 'samples/_cap-math/pack.json');
if (existsSync(CAP_MATH)) {
  const tmp = mkdtempSync(join(tmpdir(), 'pp-math-'));
  const base = JSON.parse(readFileSync(CAP_MATH, 'utf8'));
  const q = (p, d, id) => p.documents[d].sections.flatMap((s) => s.questions).find((x) => x.id === id);
  const breaks = [];
  { const p = structuredClone(base); q(p, 0, 'q4').answer = '$x = 6$'; breaks.push(['a wrong key', p]); }
  { const p = structuredClone(base); q(p, 2, 'q3').choices.A[0] = '$x^3 \\cos x + 3x^2 \\sin x$'; breaks.push(['a wrong choice equal to the key', p]); }
  { const p = structuredClone(base); q(p, 0, 'q5').figure.graph.hide = []; breaks.push(['a graph label that gives the key away', p]); }
  { const p = structuredClone(base); q(p, 0, 'q4').accept.push('x = 6'); breaks.push(['a wrong accept form', p]); }
  { const p = structuredClone(base); q(p, 2, 'q7').answer.B = '$3x^4 + x^2 + \\frac{C}$'; breaks.push(['LaTeX that does not parse', p]); }
  breaks.forEach(([what, p], i) => {
    const f = join(tmp, `broken-math-${i}.json`); writeFileSync(f, JSON.stringify(p));
    const r = run('math.mjs', f);
    if (r.status === 1) ok(`checks/math.mjs catches ${what}`); else fail(`checks/math.mjs did not catch ${what} (exit ${r.status}):\n${r.stdout}${r.stderr}`);
  });
  rmSync(tmp, { recursive: true, force: true });
}

/* 5c. the puzzle checks still bite: break the games fixture one way at a time (checks/puzzles.mjs --self-test) */
const GAMES = join(ROOT, 'samples/_cap-games/pack.json');
if (existsSync(GAMES)) {
  const r = spawnSync(process.execPath, [join(ROOT, 'checks', 'puzzles.mjs'), GAMES, '--self-test'], { cwd: ROOT, encoding: 'utf8' });
  const n = (r.stdout.match(/✓ catches/g) || []).length;
  if (r.status === 0) ok(`checks/puzzles.mjs catches all ${n} broken copies of samples/_cap-games`); else fail(`checks/puzzles.mjs --self-test failed:\n${r.stdout}${r.stderr}`);
}

/* 5b. no release without the teacher's agreement (CLAUDE.md rule 7): a sample with rendered final files has an approval */
if (existsSync(SAMPLES)) for (const d of readdirSync(SAMPLES)) {
  const dir = join(SAMPLES, d);
  if (!statSync(dir).isDirectory() || !existsSync(join(dir, 'out'))) continue;
  if (existsSync(join(dir, 'approval.json'))) ok(`samples/${d}: out/ has a matching approval.json`);
  else fail(`samples/${d} has an out/ folder but no approval.json (no release without the teacher's agreement)`);
}

/* 6. the renderer */
const RENDER = join(ROOT, 'scripts/render-pack.mjs'), FIXTURE = join(ROOT, 'samples/_fixture');
if (!existsSync(RENDER)) skip('scripts/render-pack.mjs is not here yet: render check skipped');
else if (!existsSync(FIXTURE)) skip('samples/_fixture is not here yet: render check skipped');
else {
  // the renderer writes the preview to <folder>/out-preview (docs/PACK-FORMAT.md, "Preview, sign-off, final")
  const out = join(FIXTURE, 'out-preview');
  const r = spawnSync(process.execPath, [RENDER, FIXTURE, '--preview'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  const made = existsSync(out) ? readdirSync(out, { recursive: true }).length : 0;
  if (r.status === 0 && made) ok(`render-pack.mjs rendered samples/_fixture (${made} files)`);
  else fail(`render-pack.mjs could not render samples/_fixture (exit ${r.status}, ${made} files):\n${(r.stdout || '').slice(-2000)}${(r.stderr || '').slice(-2000)}`);
}

/* 7. the app: the manifest is generated from brand.config.json (never typed), and its icons and the service worker exist */
const BUILD_MANIFEST = join(ROOT, 'scripts', 'build-manifest.mjs');
if (!existsSync(BUILD_MANIFEST)) skip('scripts/build-manifest.mjs is not here yet: app check skipped');
else {
  try {
    const { writeManifest } = await import(BUILD_MANIFEST);
    const m = JSON.parse(writeManifest()), errs = [];
    if (brand && m.name !== brand.name) errs.push('name does not match brand.config.json');
    if (m.display !== 'standalone') errs.push('display is not standalone');
    for (const i of m.icons || []) if (!existsSync(join(ROOT, 'site', i.src))) errs.push(`icon ${i.src} is missing`);
    if (!(m.icons || []).some((i) => i.purpose === 'maskable')) errs.push('no maskable icon');
    if (!existsSync(join(ROOT, 'site', 'sw.js'))) errs.push('site/sw.js is missing');
    else {   // every page and script is in the offline shell (a new page needs a VERSION bump too)
      const sw = readFileSync(join(ROOT, 'site', 'sw.js'), 'utf8');
      for (const f of readdirSync(join(ROOT, 'site')).filter((f) => /\.(html|js|css)$/.test(f) && f !== 'sw.js')) if (!sw.includes(`'${f}'`)) errs.push(`site/${f} is not in sw.js SHELL_FILES`);
    }
    if (errs.length) errs.forEach((e) => fail(`site/manifest.webmanifest: ${e}`));
    else ok(`site/manifest.webmanifest generated from brand.config.json (${m.icons.length} icons, service worker present)`);
  } catch (e) { fail(`site/manifest.webmanifest: ${e.message}`); }
}

/* 8. review apps and interactive worksheets (docs/KINDS-APPS.md): content, hashes, no plain-text key, and a browser
   smoke test of each generated page (checks/apps.mjs skips the browser part with a message when Playwright isn't here) */
{
  const APPS = join(ROOT, 'checks', 'apps.mjs'), CAP = join(ROOT, 'samples/_cap-apps/pack.json');
  const appPacks = packs.filter((p) => { try { return readJSON(p).documents.some((d) => ['interactive', 'reviewapp'].includes(d.kind || d.item)); } catch { return false; } });
  for (const p of appPacks) {
    const r = spawnSync(process.execPath, [APPS, join(ROOT, p)], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
    const skipped = /skipped/.test(r.stdout || '');
    if (r.status === 0) (skipped ? skip : ok)(`${p} passes checks/apps.mjs${skipped ? ' (content only: ' + (r.stdout.match(/⏭️\s+(.*)/) || [, ''])[1] + ')' : ' (content and browser)'}`);
    else fail(`${p} fails checks/apps.mjs:\n${r.stdout}${r.stderr}`);
  }
  if (existsSync(CAP)) {   // the check bites: broken copies of the capability fixture fail it
    const tmp = mkdtempSync(join(tmpdir(), 'pp-apps-')), good = readJSON('samples/_cap-apps/pack.json');
    const ia = (p) => p.documents.find((d) => d.item === 'interactive'), ra = (p) => p.documents.find((d) => d.item === 'reviewapp');
    const breaks = [
      ['a duplicate flashcard', (p) => ra(p).cards.push({ ...ra(p).cards[0], id: 'dup' })],
      ['a typed answer with no accepted form', (p) => { const q = ia(p).sections[1].questions.find((x) => x.type === 'numeric'); q.answer = ''; delete q.accept; }],
      ['a worksheet item with no hint', (p) => { delete ia(p).sections[0].questions[0].hint; }],
      ['a wrong-answer message on a right answer', (p) => { const q = ia(p).sections[1].questions.find((x) => x.type === 'numeric'); q.miss = [{ answer: q.answer, why: 'no' }]; }],
      ['a mode with nothing in it', (p) => { ra(p).passages = []; }],
    ];
    breaks.forEach(([what, f], i) => {
      const p = structuredClone(good); f(p);
      const file = join(tmp, `apps-broken-${i}.json`); writeFileSync(file, JSON.stringify(p));
      const r = spawnSync(process.execPath, [APPS, file, '--no-browser'], { cwd: ROOT, encoding: 'utf8' });
      if (r.status === 1) ok(`checks/apps.mjs catches ${what}`); else fail(`checks/apps.mjs did not catch ${what} (exit ${r.status}):\n${r.stdout}${r.stderr}`);
    });
    rmSync(tmp, { recursive: true, force: true });
  }
}

/* 9. practice games (docs/KINDS-PRACTICEGAMES.md): each fixture under samples/_cap-practicegame/ passes the key and
   test-wise checks and checks/practicegames.mjs (content and a browser smoke test, plus a plane-grid variant), and
   broken copies of them fail it (--self-test) */
{
  const PG = join(ROOT, 'checks', 'practicegames.mjs'), CAPG = join(ROOT, 'samples/_cap-practicegame');
  const nested = existsSync(CAPG) ? readdirSync(CAPG).map((d) => join('samples/_cap-practicegame', d, 'pack.json')).filter((p) => existsSync(join(ROOT, p))) : [];
  const gamePacks = [...packs, ...nested].filter((p) => { try { return readJSON(p).documents.some((d) => (d.kind || d.item) === 'practicegame'); } catch { return false; } });
  for (const p of nested) for (const s of ['keys.mjs', 'test-wise.mjs']) { const r = run(s, join(ROOT, p)); if (r.status === 0) ok(`${p} passes checks/${s}`); else fail(`${p} fails checks/${s}:\n${r.stdout}${r.stderr}`); }
  const tmp = mkdtempSync(join(tmpdir(), 'pp-pg-'));
  const grid = nested.find((p) => p.includes('grid'));
  if (grid) { const p = readJSON(grid); p.documents[0].settings = { mode: 'plane', range: 4 }; const f = join(tmp, 'plane-grid.json'); writeFileSync(f, JSON.stringify(p)); gamePacks.push(f); }
  for (const p of gamePacks) {
    const r = spawnSync(process.execPath, [PG, p.startsWith('/') ? p : join(ROOT, p)], { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
    const skipped = /⏭️/.test(r.stdout || ''), label = p.startsWith('/') ? `${grid} as a coordinate-plane grid` : p;
    if (r.status === 0) (skipped ? skip : ok)(`${label} passes checks/practicegames.mjs${skipped ? ' (content only: Playwright not here)' : ' (content and browser)'}`);
    else fail(`${label} fails checks/practicegames.mjs:\n${r.stdout}${r.stderr}`);
  }
  rmSync(tmp, { recursive: true, force: true });
  if (nested.length) {
    const r = spawnSync(process.execPath, [PG, '--self-test'], { cwd: ROOT, encoding: 'utf8' });
    const n = (r.stdout.match(/✓ catches/g) || []).length;
    if (r.status === 0) ok(`checks/practicegames.mjs catches all ${n} broken copies of samples/_cap-practicegame`); else fail(`checks/practicegames.mjs --self-test failed:\n${r.stdout}${r.stderr}`);
  }
}

/* 12. The interactive format (docs/KINDS-INTERACTIVE-FORMAT.md): the fixtures in samples/_cap-interactive (the g8-science
   quiz, graded in the page and printed for grading) pass keys, test-wise and cross-item like any pack; every pack with an
   interactive document passes checks/interactive-format.mjs (self-contained, no key in a print page, no plain-text key
   in an auto page, every hash verifies, rendered pages up to date); and broken copies fail it (--self-test). The
   browser run (100% right, 0% wrong, the answer sheet, 375 px) is scripts/test-interactive.mjs (npm run test:interactive). */
{
  const IF = join(ROOT, 'checks', 'interactive-format.mjs'), CAPI = join(ROOT, 'samples/_cap-interactive');
  const nested = existsSync(CAPI) ? readdirSync(CAPI).map((d) => join('samples/_cap-interactive', d, 'pack.json')).filter((p) => existsSync(join(ROOT, p))) : [];
  for (const p of nested) for (const s of ['keys.mjs', 'test-wise.mjs', 'cross-item.mjs']) { const r = run(s, join(ROOT, p)); if (r.status === 0) ok(`${p} passes checks/${s}`); else fail(`${p} fails checks/${s}:\n${r.stdout}${r.stderr}`); }
  const withIf = [...packs, ...nested].filter((p) => { try { return readJSON(p).documents.some((d) => d.format === 'interactive'); } catch { return false; } });
  for (const p of withIf) {
    const r = spawnSync(process.execPath, [IF, join(ROOT, p), '--both'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    if (r.status === 0) ok(`${p} passes checks/interactive-format.mjs (both grading modes)`); else fail(`${p} fails checks/interactive-format.mjs:\n${r.stdout}${r.stderr}`);
  }
  const st = spawnSync(process.execPath, [IF, '--self-test'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const n = (st.stdout.match(/✓ catches/g) || []).length;
  if (st.status === 0) ok(`checks/interactive-format.mjs catches all ${n} broken copies, and samples/_fixture passes as interactive (every question type, both modes)`); else fail(`checks/interactive-format.mjs --self-test failed:\n${st.stdout}${st.stderr}`);
}

/* 12b. Subject "Other (say which)": the teacher's own words (order.subjectOther) print, never "Other (say which)"
   (the renderer's subject line on every copy, the audit report and the interactive page all read subjectLabelOf). */
{
  const { subjectLabelOf } = await import('../scripts/render/util.mjs');
  const menu = readJSON('menu.json');
  const errs = [];
  if (subjectLabelOf(menu, { subject: 'other', subjectOther: ' Statistics ' }) !== 'Statistics') errs.push('subject other + subjectOther does not give "Statistics"');
  if (subjectLabelOf(menu, { subject: 'math', subjectOther: 'Statistics' }) !== menu.subjects.find((s) => s.id === 'math').label) errs.push('subjectOther changed a non-other subject');
  if (subjectLabelOf(menu, { subject: 'other' }) !== menu.subjects.find((s) => s.id === 'other').label) errs.push('subject other with no subjectOther lost the menu label');
  const PRINT = join(ROOT, 'samples/_cap-interactive/print/pack.json');
  if (existsSync(PRINT)) {
    const { buildPages } = await import('../checks/interactive-format.mjs');
    const pack = JSON.parse(readFileSync(PRINT, 'utf8'));
    pack.order = { ...pack.order, subject: 'other', subjectOther: 'Statistics' };
    for (const pg of buildPages(pack)) {
      if (!pg.html.includes('Statistics')) errs.push(`${pg.name}: the page doesn't print "Statistics"`);
      if (/say which/i.test(pg.html)) errs.push(`${pg.name}: the page prints "say which"`);
    }
  }
  if (errs.length) fail(`subject "other": ${errs.join('; ')}`); else ok('subject "other" prints the teacher\'s own subject (subjectOther) on the copies and the interactive page');
}

/* 10. "Paste a link" (scripts/fetch-page.mjs): the address guard, redirects, size/time/type limits, the sign-in check and
   the text extraction, against a local test server (a few seconds, no outside network) */
{
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/test-fetch-page.mjs')], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  if (r.status === 0) ok(r.stdout.trim().split('\n').pop() + ' (scripts/test-fetch-page.mjs)'); else fail(`scripts/test-fetch-page.mjs failed:\n${r.stdout}${r.stderr}`);
}

/* 11. The weekly test (docs/WEEKLY-TEST.md): the fixtures import as expected and the order picker is repeatable, skips
   last week's pairs and writes valid order folders (scripts/weekly-test.mjs --self-test: offline, under a second) */
{
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/weekly-test.mjs'), '--self-test'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  if (r.status === 0) ok(r.stdout.trim().split('\n').pop()); else fail(`scripts/weekly-test.mjs --self-test failed:\n${r.stdout}${r.stderr}`);
}

console.log(problems.length ? `\nCHECK FAILED: ${problems.length} problem(s).` : '\nAll checks pass.');
process.exit(problems.length ? 1 : 0);
