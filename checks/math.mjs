#!/usr/bin/env node
/* 🧮 The solver's tool (agents/solver-math.md): check every math answer it can with SymPy, independently of the maker.
   Forms and examples: docs/KINDS-MATH.md.

     node checks/math.mjs <pack.json> [more packs] [--write [--round N]] [--strict] [--json out.json]

   A question opts in with `math: {check: {...}}` (per version: `math: {A: {check}, B: {check}}` or
   `math: {check: {A: …, B: …}}`). checks/math_check.py works out the right answer from the check alone (never from the
   key) and then judges what the pack says:
     - short / numeric: the key is right, and every `accept` form is right (a decimal is right when the exact answer
       rounds to it, and the report says so)
     - mc: the key is right, exactly one choice is right, and no wrong choice is equivalent to the key (0.5 and 1/2,
       2(x−2)(x+2) and 2x² − 8 when the question asks to factor)
   Also, for every question in the pack (opted in or not):
     - every `$…$` / `$$…$$` LaTeX string parses (KaTeX), in prompts, choices, keys, accept forms, why and directions
     - every graph figure's expressions evaluate, and no label printed on a graph gives the key away (`hide`)

   Errors (exit 1): a wrong key, a wrong accept form, two right choices, a key it can't read, a check it can't run,
   bad LaTeX, a graph that can't be drawn or that labels the key. Warnings: a wrong choice it can't read (it can't
   say that choice is wrong; --strict makes this an error).

   --write adds {check: "math", round, agent, checked, disagree, findings, pass} to pack.checks.solver (round = the next
   one for this check, or --round N). Only the solver step runs it with --write; the maker may run it without. */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPack, rows, pick, argsOf, savePack, versionsOf, docName } from './pack-lib.mjs';
import { mathErrors, plainMath } from '../scripts/render/math.mjs';
import { isGraphFigure, graphLabels, graphSvg, fn, cleanExpr } from '../scripts/render/graph.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const L = 'ABCDEF';

const checkOf = (q, ver) => {
  const m = pick(q.math, ver);
  if (!m || typeof m !== 'object') return null;
  const c = pick(m.check, ver);
  return c && typeof c === 'object' ? c : null;
};
const normKey = (s) => plainMath(String(s ?? '')).toLowerCase().replace(/[\s$]+/g, '').replace(/[−–]/g, '-');

function stripUnit(text, unit) {
  const t = String(text ?? '');
  if (!unit) return t;
  const u = String(unit).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return t.replace(new RegExp(`\\s*${u}\\s*$`, 'i'), '');
}

// Graph figures: they draw, their expressions evaluate, and no visible label is the key.
function graphProblems(fig, keyTexts) {
  const out = [];
  if (!isGraphFigure(fig)) return out;
  const g = fig.graph;
  try { graphSvg(g); } catch (e) { out.push(`the graph can't be drawn (${e.message})`); return out; }
  const exprs = [...(g.functions || []), ...(g.inequalities || []).filter((q) => q.expr), ...(g.areas || []), ...(g.tangents || []), ...(g.asymptotes || []).filter((a) => a.expr)].map((f) => f.expr);
  if (g.slopeField) exprs.push(g.slopeField.expr);
  for (const e of exprs) {
    try {
      const vars = g.slopeField && e === g.slopeField.expr ? ['x', 'y'] : ['x'];
      const f = fn(e, vars);
      const [x0, x1] = g.x || [-10, 10];
      let finite = 0;
      for (let i = 0; i <= 40; i++) if (Number.isFinite(f(x0 + ((x1 - x0) * i) / 40, 0.5))) finite++;
      if (!finite) out.push(`the graph's expression "${e}" gives no real value on the window`);
    } catch (err) { out.push(`the graph's expression "${e}" can't be read (${cleanExpr(e)}: ${err.message})`); }
  }
  const labels = graphLabels(fig).map(normKey);
  for (const k of keyTexts.map(normKey).filter(Boolean)) {
    const hit = labels.find((l) => l === k || (k.length >= 4 && l.includes(k)));
    if (hit) out.push(`the graph's label "${hit}" gives the key away (put its id in "hide")`);
  }
  return out;
}

function textsOf(r) {
  const t = [['prompt', r.prompt], ['answer', typeof r.answer === 'string' ? r.answer : null], ['why', r.why]];
  if (Array.isArray(r.choices)) r.choices.forEach((c, i) => t.push([`choice ${L[i]}`, c]));
  if (Array.isArray(r.accept)) r.accept.forEach((a) => t.push(['accept', a]));
  return t.filter(([, v]) => typeof v === 'string');
}

export function checkMath(pack, { strict = false } = {}) {
  const errors = [], warnings = [], jobs = [], results = [];
  const all = rows(pack);
  // LaTeX in document-level text (directions, slides)
  pack.documents.forEach((doc, d) => {
    const name = docName(doc, d);
    for (const v of versionsOf(doc)) {
      for (const [where, text] of [['directions', pick(doc.directions, v)], ...(doc.sections || []).map((s, i) => [`part ${i + 1} directions`, pick(s.directions, v)])]) {
        if (typeof text === 'string') for (const e of mathErrors(text)) errors.push(`${name}${v ? ' ' + v : ''} ${where}: bad LaTeX ${e}`);
      }
    }
    (doc.slides || []).forEach((s, i) => [s.title, ...(s.bullets || [])].forEach((t) => { for (const e of mathErrors(t)) errors.push(`${name} slide ${i + 2}: bad LaTeX ${e}`); }));
  });
  for (const r of all) {
    for (const [field, text] of textsOf(r)) for (const e of mathErrors(text)) errors.push(`${r.where} ${field}: bad LaTeX ${e}`);
    const keyTexts = r.type === 'mc' ? (Array.isArray(r.choices) && Number.isInteger(r.answer) ? [r.choices[r.answer]] : []) : [stripUnit(r.answer, pick(r.q.unit, r.ver)), ...(Array.isArray(r.accept) ? r.accept : [])];
    for (const p of graphProblems(r.figure, keyTexts.filter((k) => typeof k === 'string' || typeof k === 'number').map(String))) errors.push(`${r.where}: ${p}`);
    const check = checkOf(r.q, r.ver);
    if (!check) continue;
    const unit = pick(r.q.unit, r.ver);
    jobs.push({
      where: r.where, check, qtype: r.type,
      key: r.type === 'mc' ? null : stripUnit(r.answer, unit),
      accept: (Array.isArray(r.accept) ? r.accept : []).map((a) => stripUnit(a, unit)),
      choices: r.type === 'mc' ? r.choices : null, answer: r.type === 'mc' ? r.answer : null,
    });
  }
  if (jobs.length) {
    const py = spawnSync('python3', ['-I', join(HERE, 'math_check.py')], { input: JSON.stringify(jobs), encoding: 'utf8', timeout: 600000, maxBuffer: 64 << 20 });
    if (py.status !== 0) errors.push(`checks/math_check.py failed (exit ${py.status}): ${(py.stderr || py.error?.message || '').trim().split('\n').slice(-3).join(' ')}`);
    else results.push(...JSON.parse(py.stdout));
  }
  const findings = [];
  for (const res of results) {
    const notes = res.notes || [];
    if (res.status === 'ok') {
      for (const n of notes) warnings.push(`${res.where}: ${n}`);
    } else if (res.status === 'wrong') {
      errors.push(`${res.where}: ${notes.join('; ')}`);
      findings.push({ where: res.where, kind: 'FIX', what: notes.join('; '), expected: res.expected });
    } else if (res.status === 'unread') {
      const keyUnread = notes.some((n) => /the key/.test(n)) || !(res.choices || []).length || (res.choices || []).some((c) => c.correct === null && jobs.find((j) => j.where === res.where)?.answer === c.i);
      if (keyUnread || strict) { errors.push(`${res.where}: ${notes.join('; ') || 'could not read the key'}`); findings.push({ where: res.where, kind: 'FIX', what: `the checker could not read it: ${notes.join('; ')}` }); }
      else for (const n of notes) warnings.push(`${res.where}: ${n} (it can't say that choice is wrong)`);
    } else {
      errors.push(`${res.where}: ${notes.join('; ')}`);
      findings.push({ where: res.where, kind: 'FIX', what: `the math check couldn't run: ${notes.join('; ')}` });
    }
  }
  const checked = results.filter((r) => r.status === 'ok' || r.status === 'wrong').length;
  return { errors, warnings, results, findings, checked, disagree: results.filter((r) => r.status === 'wrong').length, opted: jobs.length, rows: all.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { flags, opt, files } = argsOf(process.argv);
  if (!files.length) { console.error('usage: node checks/math.mjs <pack.json> [--write [--round N]] [--strict] [--json out.json]'); process.exit(2); }
  let bad = 0; const report = [];
  for (const f of files) {
    let pack;
    try { pack = loadPack(f); } catch (e) { console.error(`✗ ${e.message}`); bad++; continue; }
    const res = checkMath(pack, { strict: flags.has('--strict') });
    console.log(`${res.errors.length ? '✗' : '✓'} math ${f}: ${res.opted} of ${res.rows} question rows have a math check; ${res.checked} worked by SymPy, ${res.disagree} disagree with the key; ${res.errors.length} error(s), ${res.warnings.length} warning(s)`);
    for (const r of res.results) if (r.status === 'ok') console.log(`    ✓ ${r.where}: ${r.expected}`);
    for (const e of res.errors) console.log(`    ✗ ${e}`);
    for (const w of res.warnings) console.log(`    · ${w}`);
    if (res.errors.length) bad++;
    report.push({ file: f, ...res });
    if (flags.has('--write')) {
      pack.checks = pack.checks || {};
      const list = (pack.checks.solver = pack.checks.solver || []);
      const round = opt('round') ? Number(opt('round')) : 1 + list.filter((e) => e.check === 'math').reduce((m, e) => Math.max(m, Number(e.round) || 0), 0);
      list.push({ check: 'math', round, agent: '🧮 Solver (checks/math.mjs, SymPy)', at: new Date().toISOString(), checked: res.checked, disagree: res.disagree, pass: !res.errors.length, findings: res.findings, problems: res.errors.slice(0, 30) });
      savePack(f, pack);
      console.log(`    wrote checks.solver round ${round} (math) to ${f}`);
    }
  }
  if (opt('json')) writeFileSync(opt('json'), JSON.stringify(report, null, 1));
  process.exit(bad ? 1 : 0);
}
