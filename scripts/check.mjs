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
     5b. A sample with an out/ folder (final files) has an approval.json (no release without the teacher's agreement).
     6. If scripts/render-pack.mjs exists, it renders samples/_fixture (skipped with a message until both exist).
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
  const FORMATS = ['pdf', 'docx', 'pptx'];
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
for (const p of packs) for (const s of ['keys.mjs', 'test-wise.mjs']) {
  const r = run(s, join(ROOT, p));
  if (r.status === 0) ok(`${p} passes checks/${s}`); else fail(`${p} fails checks/${s}:\n${r.stdout}${r.stderr}`);
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
    if (errs.length) errs.forEach((e) => fail(`site/manifest.webmanifest: ${e}`));
    else ok(`site/manifest.webmanifest generated from brand.config.json (${m.icons.length} icons, service worker present)`);
  } catch (e) { fail(`site/manifest.webmanifest: ${e.message}`); }
}

console.log(problems.length ? `\nCHECK FAILED: ${problems.length} problem(s).` : '\nAll checks pass.');
process.exit(problems.length ? 1 : 0);
