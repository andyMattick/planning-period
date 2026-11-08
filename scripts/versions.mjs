#!/usr/bin/env node
/* Script-made number versions (docs/KINDS-MATH.md §4; docs/RUNBOOK.md, "The fast path"). For a "same questions,
   different numbers" order, the maker writes version A only, with every number as a named parameter, and this script
   makes versions B, C… with new numbers: it recomputes every key, accept form, distractor, picture and `math.check`
   from the item's formulas, refuses numbers that break a constraint or make two choices (or a distractor and the key)
   the same, and runs checks/math.mjs (SymPy) on every key it made.

     node scripts/versions.mjs <pack.json> [--versions B,C] [--seed <text>] [--values <json>] [--out <file>]
                               [--verify] [--no-math] [--write] [--json <report.json>]

   --versions  the versions to make (default: every version in the document's `versions` other than A)
   --seed      any text (default: the pack's id): the same seed and the same A always give the same B, C…
   --values    fixed numbers for a version, e.g. '{"B": {"n": 250, "q3.b": 1.8}}' (a document parameter by its name, an
               item's by "<item id>.<name>"); a fixed value that breaks a constraint is refused, never redrawn
   --verify    make the versions in memory and compare them with the ones in the pack (exit 1 on any difference):
               proves B, C… still come from A's formulas (the final whole-version check)
   --write     add {check: "versions", …} to pack.checks.wilco
   Writes the pack in place (or --out) only when every version passes. Exit 0 ok (or nothing to make), 1 refused, 2 usage.

   The spec (written by the maker; agents/maker.md, "Number versions by script"):
     document.gen = { params, derived, constraints }                    shared by its items (a table several items use)
     question.gen = { params, derived, constraints, distinct, fields }
       params:      { "n": {"int": [150, 260], "step": 10, "A": 200}, "r": {"num": [0.55, 0.85], "places": 2, "A": 0.74},
                      "ctx": {"pick": ["walk", "bike"], "A": "walk"} }   every parameter says its version A value
       derived:     { "total": "a + b + c + d", "pct": "a / total * 100" }      (mathjs, in order)
       constraints: [ "a + b == rowA", "abs(r) < 0.9", "pct != 50" ]           (all must be true)
       distinct:    [ "{{pct|1}}", "{{a / rowA * 100|1}}" ]   texts that must all differ (the key and each distractor
                    formula, as printed): a version where two print the same is refused
       fields:      templates for prompt, figure, choices, answer, accept, why, math (the `math.check` object) and any
                    other per-version field; {{expr}} prints a number (up to 10 significant digits, no trailing zeros),
                    {{expr|1}} rounds to 1 place, {{expr|f2}} keeps 2 places (2.50), {{expr|u}} prints a minus as −,
                    {{expr|,}} adds thousands commas; "{{=expr}}" as a whole string gives the value itself (a number in
                    a graph spec). An mc item's choices are in A's order; its key is A's `answer`.
   Rules it enforces: the formulas reproduce version A exactly (so what the checkers read in A is what makes B, C…); every
   constraint holds; no two choices the same in text or value; the `distinct` texts differ; each version's prompt and
   picture differ from every other version's; a `math.check` uses the numbers (it differs from A's); each version puts
   an mc key under a different letter from the earlier versions where it can, spreading the letters. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { create, all } from 'mathjs';
import { loadPack, perVersion, pick, norm, valueOf, sameValue, nextRound } from '../checks/pack-lib.mjs';
import { checkMath } from '../checks/math.mjs';
import { plainMath } from './render/math.mjs';
import { checkPack } from '../checks/interactive-format.mjs';

/* ---------- a safe mathjs (no import, no parse/evaluate from inside a template) ---------- */
const math = create(all, { number: 'number' });
const arr = (x) => (x && typeof x.toArray === 'function' ? x.toArray() : x).map(Number);
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const corr = (X, Y) => {
  const xs = arr(X), ys = arr(Y), mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxy / Math.sqrt(sxx * syy);
};
const slope = (X, Y) => { const xs = arr(X), ys = arr(Y), mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; }); return sxy / sxx; };
const intercept = (X, Y) => mean(arr(Y)) - slope(X, Y) * mean(arr(X));
math.import({ corr, slope, intercept }, { override: true });
const limitedEvaluate = math.evaluate;   // kept before the names below are blocked inside templates (mathjs security docs)
const blocked = () => { throw new Error('not allowed in a template'); };
math.import({ import: blocked, createUnit: blocked, evaluate: blocked, parse: blocked, simplify: blocked, derivative: blocked, resolve: blocked, compile: blocked, reviver: blocked }, { override: true });
const evalIn = (expr, scope) => {
  const v = limitedEvaluate(String(expr), { ...scope });
  return v && typeof v.toArray === 'function' ? v.toArray() : v;
};

/* ---------- numbers to text ---------- */
const roundTo = (x, n) => { const f = 10 ** n; return Math.round((Number(x.toPrecision(12)) + Math.sign(x) * Number.EPSILON) * f) / f; };
export function fmt(v, spec = '') {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean' || v == null || (typeof v === 'number' && !Number.isFinite(v))) throw new Error(`prints ${v}`);
  if (Array.isArray(v)) return v.map((x) => fmt(x, spec)).join(', ');
  const places = /(\d+)/.exec(spec), fixed = spec.includes('f'), minus = spec.includes('u'), commas = spec.includes(',');
  let x = Number(v), s;
  if (places) { x = roundTo(x, Number(places[1])); s = fixed ? x.toFixed(Number(places[1])) : String(x); }
  else s = String(Number(x.toPrecision(10)));
  if (/e/.test(s)) throw new Error(`prints ${s}: give it a rounding`);
  if (s.startsWith('-') && Number(s) === 0) s = s.slice(1);
  if (commas) s = s.replace(/^(-?)(\d+)/, (m, sg, d) => sg + d.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  if (minus) s = s.replace(/^-/, '−');
  return s;
}
const RAW = /^\{\{=([^{}]+)\}\}$/, PH = /\{\{([^{}|]+)(?:\|([^{}]*))?\}\}/g;
export function render(t, scope) {
  if (typeof t === 'string') {
    const raw = RAW.exec(t);
    if (raw) return evalIn(raw[1], scope);
    return t.replace(PH, (m, e, f) => fmt(evalIn(e, scope), (f || '').trim()));
  }
  if (Array.isArray(t)) return t.map((x) => render(x, scope));
  if (t && typeof t === 'object') return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, render(v, scope)]));
  return t;
}
const usesParams = (t) => JSON.stringify(t ?? '').includes('{{');

/* ---------- repeatable random numbers ---------- */
function rng(seedText) {
  let a = createHash('sha256').update(seedText).digest().readUInt32LE(0);
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function draw(spec, r, name) {
  if (spec.int) {
    const [lo, hi] = spec.int, step = spec.step || 1, n = Math.floor((hi - lo) / step);
    if (!(n >= 0) || !Number.isInteger(lo) || !Number.isInteger(step)) throw new Error(`${name}: int needs whole [lo, hi] and step`);
    return lo + step * Math.floor(r() * (n + 1));
  }
  if (spec.num) {
    const [lo, hi] = spec.num, p = spec.places ?? 2, f = 10 ** p;
    return Math.round((lo + r() * (hi - lo)) * f) / f;
  }
  if (spec.pick) return spec.pick[Math.floor(r() * spec.pick.length)];
  throw new Error(`${name}: a parameter needs int, num or pick`);
}
const inRange = (spec, v) => spec.int ? Number.isInteger(v) && v >= spec.int[0] && v <= spec.int[1] && (v - spec.int[0]) % (spec.step || 1) === 0
  : spec.num ? typeof v === 'number' && v >= spec.num[0] - 1e-9 && v <= spec.num[1] + 1e-9 : spec.pick ? spec.pick.some((p) => JSON.stringify(p) === JSON.stringify(v)) : false;

// fill a scope from params (drawn or fixed), derived, and check constraints; returns {scope} or {why}
function fill(block, base, r, fixed, prefix) {
  const scope = { ...base }, names = Object.keys(block.params || {});
  const allFixed = !!(fixed && r && names.length && names.every((k) => (prefix + k) in fixed));   // nothing left to redraw
  for (const [k, spec] of Object.entries(block.params || {})) {
    if (k in base) throw new Error(`${prefix}${k} is already a document parameter`);
    const key = prefix + k;
    if (fixed && key in fixed) {
      if (!inRange(spec, fixed[key])) return { why: `${key} = ${JSON.stringify(fixed[key])} is outside its range`, hard: true };
      scope[k] = fixed[key];
    } else scope[k] = r ? draw(spec, r, key) : spec.A;
  }
  for (const [k, e] of Object.entries(block.derived || {})) scope[k] = evalIn(e, scope);
  for (const c of block.constraints || []) {
    let ok;
    try { ok = evalIn(c, scope); } catch (e) { return { why: `constraint "${c}" can't be worked out (${e.message})`, hard: true }; }
    if (ok !== true) return { why: `constraint "${c}" fails`, hard: allFixed };
  }
  return { scope };
}

/* ---------- the stored A value of a field, and writing a version ---------- */
const MATH_A = (q, v) => { const m = pick(q.math, v); if (!m || typeof m !== 'object') return undefined; const c = pick(m.check, v); return c; };
const storedOf = (q, field, v) => (field === 'math' ? MATH_A(q, v) : pick(q[field], v));
function setField(q, field, v, value, vers) {
  if (field === 'math') {
    const old = q.math || {}; const checks = {};
    for (const x of vers) { const c = MATH_A(q, x); if (c !== undefined) checks[x] = c; }
    checks[v] = value;
    const { check, ...rest } = old; for (const k of Object.keys(rest)) if (/^[A-Z]$/.test(k)) delete rest[k];
    q.math = { ...rest, check: checks };
    return;
  }
  if (!perVersion(q[field])) { const shared = q[field]; q[field] = {}; for (const x of vers) if (shared !== undefined) q[field][x] = structuredClone(shared); }
  q[field][v] = value;
}

function itemRender(q, scope) {
  const out = {};
  for (const [f, t] of Object.entries(q.gen.fields || {})) out[f] = render(t, scope);
  return out;
}
function itemProblems(q, got, others, aGot) {
  const out = [];
  if (Array.isArray(got.choices)) {
    const c = got.choices.map((x) => norm(plainMath(String(x))));
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      if (c[i] === c[j]) out.push(`choices ${i + 1} and ${j + 1} are the same`);
      else { const a = valueOf(plainMath(String(got.choices[i]))), b = valueOf(plainMath(String(got.choices[j]))); if (sameValue(a, b)) out.push(`choices ${i + 1} and ${j + 1} have the same value`); }
    }
  }
  if (q.gen.distinct) {
    const seen = new Map();
    q.gen.distinct.forEach((t, i) => { const s = got.__distinct[i]; if (seen.has(s)) out.push(`distinct ${seen.get(s) + 1} and ${i + 1} both print ${s}`); else seen.set(s, i); });
  }
  const look = (g) => JSON.stringify([g.prompt ?? null, g.figure ?? null]);
  if (others.some((o) => look(o) === look(got))) out.push('the prompt and picture repeat another version (no new numbers)');
  if (got.math !== undefined && aGot && JSON.stringify(got.math) === JSON.stringify(aGot.math) && look(got) !== look(aGot)) out.push('the math check is the same as A\'s although the numbers changed (a number typed into the check)');
  return out;
}

/* ---------- one document ---------- */
function makeDoc(doc, d, targets, seed, fixedAll) {
  const errors = [], made = {}, items = [];
  for (const sec of doc.sections || []) for (const q of sec.questions || []) if (q.gen) items.push(q);
  if (!items.length) return { errors, made, items };
  const name = doc.title || `document ${d + 1}`;
  const vers = [...new Set(['A', ...(doc.versions || []), ...targets])];
  // 1. the formulas reproduce A
  const docA = fill(doc.gen || {}, {}, null, null, '');
  if (docA.why) { errors.push(`${name} A: ${docA.why}`); return { errors, made, items }; }
  const aRendered = new Map();
  for (const q of items) {
    if (!q.gen.fields || !Object.keys(q.gen.fields).length) { errors.push(`${name} ${q.id}: gen has no fields`); continue; }
    if (q.type === 'numeric' && !q.gen.fields.math) errors.push(`${name} ${q.id}: a numeric item needs a math template (fields.math) so SymPy checks every version's key`);
    if (q.gen.fields.math && !usesParams(q.gen.fields.math)) errors.push(`${name} ${q.id}: fields.math uses no parameter, so it can't follow the new numbers`);
    let got;
    try {
      const f = fill(q.gen, docA.scope, null, null, `${q.id}.`);
      if (f.why) { errors.push(`${name} ${q.id} A: ${f.why}`); continue; }
      got = itemRender(q, f.scope); got.__distinct = (q.gen.distinct || []).map((t) => render(t, f.scope));
    } catch (e) { errors.push(`${name} ${q.id} A: ${e.message}`); continue; }
    for (const [field, value] of Object.entries(got)) {
      if (field === '__distinct') continue;
      const stored = storedOf(q, field, 'A');
      if (JSON.stringify(value) !== JSON.stringify(stored)) errors.push(`${name} ${q.id} A ${field}: the formulas give ${JSON.stringify(value).slice(0, 160)}, but A says ${JSON.stringify(stored ?? null).slice(0, 160)}`);
    }
    if (q.type === 'mc' && !Number.isInteger(pick(q.answer, 'A'))) errors.push(`${name} ${q.id}: A's answer must be the key's index`);
    const p = itemProblems(q, got, [], null);
    for (const x of p) errors.push(`${name} ${q.id} A: ${x}`);
    aRendered.set(q, got);
  }
  if (errors.length) return { errors, made, items };

  // 2. each new version
  const keyPos = new Map(items.map((q) => [q, q.type === 'mc' ? [pick(q.answer, 'A')] : []]));
  const renders = new Map(items.map((q) => [q, [aRendered.get(q)]]));
  for (const v of targets) {
    const fixed = (fixedAll && fixedAll[v]) || null;
    const why = new Map();
    let done = null;
    for (let tryDoc = 0; tryDoc < 200 && !done; tryDoc++) {
      const r = rng(`${seed}|${d}|${v}|doc|${tryDoc}`);
      const dfill = fill(doc.gen || {}, {}, r, fixed, '');
      if (dfill.why) { why.set(dfill.why, (why.get(dfill.why) || 0) + 1); if (dfill.hard) break; continue; }
      const out = new Map(); let failed = false;
      for (const q of items) {
        let ok = null;
        for (let t = 0; t < 200 && !ok; t++) {
          const ri = rng(`${seed}|${d}|${v}|${q.id}|${tryDoc}|${t}`);
          let f;
          try { f = fill(q.gen, dfill.scope, ri, fixed, `${q.id}.`); } catch (e) { errors.push(`${name} ${q.id}: ${e.message}`); return { errors, made, items }; }
          if (f.why) { why.set(`${q.id}: ${f.why}`, (why.get(`${q.id}: ${f.why}`) || 0) + 1); if (f.hard) { failed = 'hard'; break; } continue; }
          let got;
          try { got = itemRender(q, f.scope); got.__distinct = (q.gen.distinct || []).map((x) => render(x, f.scope)); }
          catch (e) { why.set(`${q.id}: ${e.message}`, (why.get(`${q.id}: ${e.message}`) || 0) + 1); continue; }
          const p = itemProblems(q, got, renders.get(q), aRendered.get(q));
          if (p.length) { for (const x of p) why.set(`${q.id}: ${x}`, (why.get(`${q.id}: ${x}`) || 0) + 1); continue; }
          ok = got;
        }
        if (!ok) { failed = failed || true; break; }
        out.set(q, ok);
      }
      if (failed === 'hard') break;
      if (!failed) done = out;
    }
    if (!done) {
      const top = [...why.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} (${n}×)`).join('; ');
      errors.push(`${name} ${v}: refused, no numbers pass${fixed ? ' with the fixed values' : ''}: ${top || 'no reason recorded'}`);
      continue;
    }
    // 3. place each mc key: not under a letter an earlier version used, the least-used letter in this version
    const used = new Map(); const r = rng(`${seed}|${d}|${v}|letters`);
    for (const q of items) {
      const got = done.get(q);
      if (q.type === 'mc' && Array.isArray(got.choices)) {
        const k = pick(q.answer, 'A'), n = got.choices.length, earlier = keyPos.get(q);
        let opts = [...Array(n).keys()].filter((i) => !earlier.includes(i));
        if (!opts.length) opts = [...Array(n).keys()];
        const least = Math.min(...opts.map((i) => used.get(i) || 0));
        opts = opts.filter((i) => (used.get(i) || 0) === least);
        const pos = opts[Math.floor(r() * opts.length)];
        const wrong = got.choices.filter((_, i) => i !== k);
        for (let i = wrong.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [wrong[i], wrong[j]] = [wrong[j], wrong[i]]; }
        got.choices = [...wrong.slice(0, pos), got.choices[k], ...wrong.slice(pos)];
        got.answer = pos; used.set(pos, (used.get(pos) || 0) + 1); earlier.push(pos);
      }
      renders.get(q).push(got);
    }
    made[v] = done;
  }
  return { errors, made, items, vers };
}

export function makeVersions(pack, { targets = null, seed = null, fixed = null } = {}) {
  const errors = [], warnings = [], out = structuredClone(pack), summary = [];
  out.documents.forEach((doc, d) => {
    const want = targets || (doc.versions || []).filter((v) => v !== 'A');
    const hasGen = (doc.sections || []).some((s) => (s.questions || []).some((q) => q.gen));
    if (!hasGen) return;
    if (!want.length) { errors.push(`${doc.title || `document ${d + 1}`}: no versions to make (list them in versions, or --versions B,C)`); return; }
    const res = makeDoc(doc, d, want, seed || out.id || 'pack', fixed);
    errors.push(...res.errors);
    if (res.errors.length) return;
    doc.versions = res.vers;
    for (const q of res.items) {
      const aChoices = pick(q.choices, 'A');
      for (const v of want) {
        const got = res.made[v].get(q);
        for (const [field, value] of Object.entries(got)) if (field !== '__distinct') setField(q, field, v, value, res.vers);
        // per-version fields the formulas don't make (a unit, an empty accept list): copy A's
        for (const [k, val] of Object.entries(q)) if (!['gen', 'math'].includes(k) && !(k in got) && perVersion(val) && 'A' in val) val[v] = structuredClone(val.A);
        if (Array.isArray(got.choices) && Array.isArray(aChoices)) for (const c of got.choices) if (aChoices.some((a) => norm(a) === norm(c))) warnings.push(`${q.id} ${v}: the choice "${String(c).slice(0, 60)}" is word for word in A (the memorizer bot reads a graded A)`);
      }
    }
    summary.push({ document: doc.title || `document ${d + 1}`, versions: want, items: res.items.map((q) => q.id) });
  });
  return { pack: out, errors, warnings, summary };
}

/* ---------- the command line ---------- */
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const a = process.argv.slice(2);
  const opt = (n) => { const i = a.indexOf(`--${n}`); if (i < 0) return null; const v = a[i + 1]; a.splice(i, 2); return v; };
  const flag = (n) => { const i = a.indexOf(`--${n}`); if (i < 0) return false; a.splice(i, 1); return true; };
  const vOpt = opt('versions'), seed = opt('seed'), values = opt('values'), outFile = opt('out'), jsonOut = opt('json');
  const verify = flag('verify'), noMath = flag('no-math'), write = flag('write');
  const file = a[0];
  if (!file) { console.error('usage: node scripts/versions.mjs <pack.json> [--versions B,C] [--seed text] [--values json] [--out file] [--verify] [--no-math] [--write] [--json out]'); process.exit(2); }
  let pack, fixed = null;
  try { pack = loadPack(file); fixed = values ? JSON.parse(values) : null; } catch (e) { console.error(`versions: ${e.message}`); process.exit(2); }
  const t0 = Date.now();
  const targets = vOpt ? vOpt.split(',').map((s) => s.trim()).filter(Boolean) : null;
  // --verify remakes with the seed the pack was made with (a redraw adds #k to it; checks.wilco records it)
  const recorded = [...((pack.checks && pack.checks.wilco) || [])].reverse().find((e) => e.check === 'versions' && e.seed);
  const seed0 = seed || (verify && recorded ? recorded.seed : null);
  let res = makeVersions(pack, { targets, seed: seed0, fixed }), usedSeed = seed0 || pack.id || 'pack';
  // an interactive page holds no key as text (checks/interactive-format.mjs): new numbers whose key happens to be
  // printed elsewhere in the page's file (a style value, another item) are redrawn with the next seed, up to 8 times
  if (!res.errors.length && !verify && res.pack.documents.some((d) => d.format === 'interactive')) {
    const made = new Set(res.summary.flatMap((x) => x.versions));
    const leaks = async (p) => (await checkPack(p, null)).errors.filter((e) => /the key .* is in the file as text/.test(e) && [...made].some((v) => e.includes(` ${v}: `)));
    let k = 0, left = await leaks(res.pack);
    while (left.length && k < 8) { k++; usedSeed = `${seed || pack.id || 'pack'}#${k}`; res = makeVersions(pack, { targets, seed: usedSeed, fixed }); if (res.errors.length) break; left = await leaks(res.pack); }
    if (left.length) res.errors.push(...left.map((e) => `page: ${e} (8 redraws)`));
    else if (k) res.warnings.push(`redrew ${k} time${k === 1 ? '' : 's'} so no key is printed elsewhere in an interactive page's file (seed ${usedSeed})`);
  }
  const report = { errors: res.errors, warnings: res.warnings, summary: res.summary, math: null, verify: null };
  if (!res.errors.length && !res.summary.length) { console.log('versions: no item has a gen spec: nothing to make.'); process.exit(0); }
  if (verify && !res.errors.length) {
    const diffs = [];
    res.pack.documents.forEach((doc, d) => (doc.sections || []).forEach((s, si) => (s.questions || []).forEach((q, qi) => {
      if (!q.gen) return;
      const old = pack.documents[d].sections[si].questions[qi];
      for (const v of (doc.versions || []).filter((x) => x !== 'A')) for (const f of [...Object.keys(q.gen.fields || {}), 'answer']) {
        const g = storedOf(q, f, v), o = storedOf(old, f, v);
        if (JSON.stringify(g) !== JSON.stringify(o)) diffs.push(`${q.id} ${v} ${f}: the pack has ${JSON.stringify(o ?? null).slice(0, 100)}, A's formulas give ${JSON.stringify(g ?? null).slice(0, 100)}`);
      }
    })));
    report.verify = diffs;
    for (const x of diffs) res.errors.push(`verify: ${x}`);
  }
  if (!res.errors.length && !noMath) {
    const m = checkMath(res.pack);
    report.math = { checked: m.checked, opted: m.opted, disagree: m.disagree, errors: m.errors };
    for (const e of m.errors) res.errors.push(`math: ${e}`);
  }
  for (const w of res.warnings) console.log(`  ⚠ ${w}`);
  for (const e of res.errors) console.log(`  ✗ ${e}`);
  const ok = !res.errors.length;
  if (ok && !verify) {
    if (write) {
      const p = res.pack; p.checks = p.checks || {}; p.checks.wilco = p.checks.wilco || [];
      p.checks.wilco.push({ check: 'versions', round: nextRound(p, 'versions'), agent: '🤖 Wilco (scripts/versions.mjs)', pass: true,
        rows: res.summary.reduce((n, s) => n + s.items.length * s.versions.length, 0), problems: [], seed: usedSeed,
        made: res.summary.map((s) => `${s.document}: ${s.versions.join(', ')} (${s.items.length} items)`) });
    }
    writeFileSync(outFile || file, JSON.stringify(res.pack, null, 2) + '\n');
  }
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ ok, ...report }, null, 2) + '\n');
  const s = res.summary.map((x) => `${x.document}: ${x.versions.join(', ')} from A (${x.items.length} items)`).join('; ');
  console.log(ok ? `versions: ${verify ? 'verified' : 'made'} ${s}${report.math ? `; SymPy checked ${report.math.checked} keys, 0 disagree` : ''} (${((Date.now() - t0) / 1000).toFixed(1)} s)`
    : `versions: refused (${res.errors.length} problem${res.errors.length === 1 ? '' : 's'}); nothing written`);
  process.exit(ok ? 0 : 1);
}
