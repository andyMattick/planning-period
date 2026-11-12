#!/usr/bin/env node
/* 🤖 The lab check (docs/KINDS-LABS.md): what a science lab must have before any agent spends a token reading it, and
   whether its simulation can run. It costs nothing, so it runs every time (CLAUDE.md, "One pass, one fix").

     node checks/labs.mjs <pack.json> [more packs]
     node checks/labs.mjs --self-test

   A document is a lab when it has a `lab` field (item "lab"). Errors (exit 1):
   - structure: a phenomenon or driving question, objectives, an inquiry level; timing phases that fit the class period
     (minutes × days); pre-lab sections (part "prelab", at least 2 questions) printed before the analysis; a CER
     question (cer: true); a data table whose columns have names (and units for numbers);
   - materials: each with an item, an amount and who it's for (per group, student or class), consumable or durable;
   - safety: a hazardous material (materials[].hazard, or safety.hazards) is named in safety.hazards with a precaution,
     the PPE is listed, a procedure step that uses it carries a safety callout, and disposal says where it goes;
   - the teacher guide: setup minutes, expected data, at least 2 troubleshooting tips; differentiation (support and
     extension); a makeup plan for absent students; guided and open inquiry have design prompts;
   - the simulation: 1 to 4 inputs (min < max, step > 0, value in range), outputs whose formulas parse with the
     simulation's own calculator (scripts/render/sims/expr.mjs) and read only inputs and earlier outputs, finite and
     inside their stated min/max across a grid of every input's range; a graph of an input against a shown output;
     noise 0–0.5; and `limits`: what the model leaves out, which the page shows (a model is never sold as the real thing). */
import { pathToFileURL } from 'node:url';
import { loadPack, argsOf } from './pack-lib.mjs';
import { parseExpr, namesIn, evalExpr } from '../scripts/render/sims/expr.mjs';

export const isLabDoc = (d) => !!(d && d.lab && typeof d.lab === 'object');
const txt = (x) => (x == null ? '' : typeof x === 'object' ? Object.values(x).join(' ') : String(x));
const words = (s) => txt(s).toLowerCase().replace(/[^a-z0-9%.° ]+/g, ' ');
// the first two meaningful words of a material ("Hydrogen peroxide, 3%" → "hydrogen peroxide"), to find it in a step
const keyOf = (name) => words(name).split(' ').filter((w) => w.length > 2 && !/^(the|and|for|per|cup|cups)$/.test(w)).slice(0, 2).join(' ');

export function labProblems(doc) {
  const L = doc.lab, P = [];
  const need = (ok, msg) => { if (!ok) P.push(msg); };
  need(txt(L.phenomenon).trim() || txt(L.drivingQuestion).trim(), 'no phenomenon or driving question');
  need((L.objectives || []).length >= 1, 'no objectives');
  need(['structured', 'guided', 'open'].includes(L.inquiry), `inquiry must be structured, guided or open (it is ${L.inquiry})`);
  const minutes = Number(L.period?.minutes) || 0, days = Number(L.period?.days) || 1;
  need(minutes > 0, 'no class period (period.minutes)');
  const phases = L.timing || [];
  need(phases.length >= 2 && phases.every((t) => t.phase && Number(t.minutes) > 0), 'timing: at least 2 phases, each with minutes');
  const total = phases.reduce((s, t) => s + (Number(t.minutes) || 0), 0);
  if (minutes) need(total <= minutes * days, `timing: ${total} minutes of phases in ${minutes * days} minutes of class`);
  // questions: pre-lab first, then analysis with a CER
  const secs = doc.sections || [];
  const pre = secs.filter((s) => s.part === 'prelab'), firstRest = secs.findIndex((s) => s.part !== 'prelab'), lastPre = secs.map((s) => s.part).lastIndexOf('prelab');
  need(pre.reduce((n, s) => n + (s.questions || []).length, 0) >= 2, 'fewer than 2 pre-lab questions (sections with part "prelab")');
  need(lastPre < 0 || firstRest < 0 || lastPre < firstRest, 'pre-lab sections must come before the analysis sections (question numbers follow the pack order)');
  need(secs.some((s) => s.part !== 'prelab' && (s.questions || []).some((q) => q.cer === true)), 'no CER question (a question with cer: true in an analysis section)');
  const D = L.dataTable;
  need(D && (D.columns || []).length >= 2 && D.columns.every((c) => c.name), 'no data table with at least 2 named columns');
  // materials
  const mats = L.materials || [];
  need(mats.length >= 2, 'fewer than 2 materials');
  mats.forEach((m, i) => {
    const n = m.item || `material ${i + 1}`;
    need(m.item && m.amount != null && m.amount !== '', `${n}: needs an item and an amount`);
    need(['group', 'student', 'class'].includes(m.per), `${n}: per must be group, student or class`);
    need(['consumable', 'durable'].includes(m.kind), `${n}: kind must be consumable or durable`);
  });
  // safety
  const S = L.safety || {}, hz = S.hazards || [];
  const hazardous = [...mats.filter((m) => m.hazard).map((m) => m.item), ...hz.map((h) => h.material)];
  if (hazardous.length) {
    need((S.ppe || []).length >= 1, 'hazards but no PPE (safety.ppe)');
    need((S.disposal || []).length >= 1, 'hazards but no disposal (safety.disposal)');
  }
  const steps = L.procedure || [];
  need(steps.length >= 3 || (L.design || []).length >= 2, 'fewer than 3 procedure steps (and no design prompts)');
  for (const name of new Set(hazardous)) {
    const k = keyOf(name);
    const h = hz.find((x) => keyOf(x.material) === k);
    need(h && txt(h.precaution).trim(), `${name}: hazardous, but no precaution in safety.hazards`);
    const using = steps.filter((s) => words(s.text).includes(k) || words(s.safety).includes(k));
    if (using.length) need(using.some((s) => txt(s.safety).trim()), `${name}: the steps that use it have no safety callout (procedure[].safety)`);
    else need(steps.some((s) => txt(s.safety).trim()), `${name}: no procedure step carries a safety callout`);
  }
  // teacher guide, differentiation, makeup, inquiry
  const T = L.teacher || {};
  need(Number(T.setupMinutes) > 0, 'teacher guide: no setup minutes');
  need((T.expectedData || []).length >= 1, 'teacher guide: no expected data');
  need((T.troubleshooting || []).length >= 2, 'teacher guide: fewer than 2 troubleshooting tips');
  need((L.differentiation?.support || []).length >= 1 && (L.differentiation?.extension || []).length >= 1, 'differentiation: needs support and extension');
  need(L.makeup && txt(L.makeup.plan).trim(), 'no makeup plan for absent students (makeup.plan)');
  if (L.inquiry === 'guided' || L.inquiry === 'open') need((L.design || []).length >= 2, `${L.inquiry} inquiry: at least 2 design prompts (lab.design)`);
  if (L.simulation) P.push(...simProblems(L.simulation).map((p) => `simulation: ${p}`));
  return P;
}

export function simProblems(sim) {
  const P = [];
  const need = (ok, msg) => { if (!ok) P.push(msg); };
  need(txt(sim.title).trim(), 'no title');
  need(txt(sim.limits).trim(), 'no limits: say what the model leaves out (the page shows it)');
  const ins = sim.inputs || [], outs = sim.outputs || [];
  need(ins.length >= 1 && ins.length <= 4, `1 to 4 inputs (it has ${ins.length})`);
  need(outs.length >= 1 && outs.length <= 6, `1 to 6 outputs (it has ${outs.length})`);
  const ids = new Set(), idOk = /^[A-Za-z_][A-Za-z0-9_]{0,15}$/;
  for (const x of ins) {
    need(idOk.test(x.id || '') && !ids.has(x.id), `input "${x.id}": needs a short unique id (letters, digits, _)`); ids.add(x.id);
    need(x.label, `input "${x.id}": no label`);
    need([x.min, x.max, x.step, x.value].every(Number.isFinite) && x.min < x.max && x.step > 0 && x.value >= x.min && x.value <= x.max, `input "${x.id}": needs min < max, step > 0 and a value in range`);
    if (Number.isFinite(x.min) && Number.isFinite(x.max) && x.step > 0) need((x.max - x.min) / x.step <= 1000, `input "${x.id}": more than 1000 steps`);
  }
  need(sim.noise == null || (Number(sim.noise) >= 0 && Number(sim.noise) <= 0.5), 'noise must be 0 to 0.5');
  const known = new Set(ins.map((x) => x.id)), trees = [];
  for (const o of outs) {
    need(idOk.test(o.id || '') && !ids.has(o.id), `output "${o.id}": needs a short unique id`); ids.add(o.id);
    need(o.label, `output "${o.id}": no label`);
    need(o.noise == null || (Number(o.noise) >= 0 && Number(o.noise) <= 0.5), `output "${o.id}": noise must be 0 to 0.5`);
    let t = null;
    try { t = parseExpr(o.expr); } catch (e) { P.push(`output "${o.id}": the formula can't be read (${e.message})`); }
    if (t) { const bad = [...namesIn(t)].filter((n) => !known.has(n)); need(!bad.length, `output "${o.id}": reads ${bad.join(', ')}, which is not an input or an earlier output`); }
    trees.push([o, t]); known.add(o.id);
  }
  const shown = outs.filter((o) => !o.hidden);
  need(shown.length >= 1, 'every output is hidden');
  need(sim.graph && ins.some((x) => x.id === sim.graph.x) && shown.some((o) => o.id === sim.graph.y), 'graph: x must be an input and y a shown output');
  // run the model over a grid of every input's range (5 points each, at most 625 runs), with no noise
  if (!P.length) {
    const grids = ins.map((x) => Array.from({ length: 5 }, (_, i) => x.min + ((x.max - x.min) * i) / 4));
    const combos = grids.reduce((acc, g) => acc.flatMap((a) => g.map((v) => [...a, v])), [[]]);
    const seen = new Set();
    for (const c of combos) {
      const vars = Object.fromEntries(ins.map((x, i) => [x.id, c[i]]));
      for (const [o, t] of trees) {
        const y = evalExpr(t, vars);
        const where = ins.map((x, i) => `${x.id}=${+c[i].toFixed(4)}`).join(', ');
        if (!Number.isFinite(y)) { if (!seen.has(o.id)) P.push(`output "${o.id}" is not a number at ${where}`); seen.add(o.id); break; }
        if ((o.min != null && y < o.min - 1e-9) || (o.max != null && y > o.max + 1e-9)) { if (!seen.has(o.id)) P.push(`output "${o.id}" is ${+y.toPrecision(4)} at ${where}, outside its stated ${o.min ?? '−∞'} to ${o.max ?? '∞'}`); seen.add(o.id); }
        vars[o.id] = y;
      }
    }
  }
  return P;
}

export function checkPack(pack) {
  const out = [];
  (pack.documents || []).forEach((d, i) => { if (isLabDoc(d)) out.push({ doc: d.title || `document ${i + 1}`, problems: labProblems(d) }); });
  return out;
}

/* ---------- self-test: the capability sample passes; each broken copy is caught ---------- */
async function selfTest() {
  const { readFileSync } = await import('node:fs');
  const good = JSON.parse(readFileSync(new URL('../samples/_cap-labs/pack.json', import.meta.url), 'utf8'));
  const lab = () => { const p = structuredClone(good); return [p, p.documents[0].lab, p.documents[0]]; };
  let bad = 0;
  const base = checkPack(good)[0].problems;
  if (base.length) { bad++; console.log(`✗ the capability sample should pass: ${base.join('; ')}`); } else console.log('✓ passes samples/_cap-labs');
  const cases = [
    ['timing that runs past the class period', (L) => { L.timing[1].minutes = 40; }, /timing: \d+ minutes of phases in 50/],
    ['a hazardous material with no safety callout in its steps', (L) => { L.procedure.forEach((s) => { if (/peroxide/i.test(s.text)) delete s.safety; }); }, /Hydrogen peroxide.*no safety callout/],
    ['hazards with no PPE', (L) => { L.safety.ppe = []; }, /no PPE/],
    ['hazards with no disposal', (L) => { L.safety.disposal = []; }, /no disposal/],
    ['a material with no amount', (L) => { delete L.materials[0].amount; }, /needs an item and an amount/],
    ['no CER question', (L, d) => { d.sections[1].questions.forEach((q) => delete q.cer); }, /no CER question/],
    ['pre-lab after the analysis', (L, d) => { d.sections.reverse(); }, /pre-lab sections must come before/],
    ['guided inquiry with no design prompts', (L) => { L.inquiry = 'guided'; }, /guided inquiry: at least 2 design prompts/],
    ['no makeup plan', (L) => { delete L.makeup; }, /no makeup plan/],
    ['a teacher guide with no expected data', (L) => { L.teacher.expectedData = []; }, /no expected data/],
    ['a simulation formula that names something unknown', (L) => { L.simulation.outputs[1].expr = '8 / (a * K + 0.06)'; }, /reads K, which is not an input/],
    ['a simulation formula that is code', (L) => { L.simulation.outputs[1].expr = 'alert(1)'; }, /can't be read \(unknown function "alert"\)/],
    ['a simulation that divides by zero in range', (L) => { L.simulation.outputs[1].expr = '8 / (a * C / 3 - a * C / 3)'; }, /not a number at|outside its stated/],
    ['a simulation output outside its stated range', (L) => { L.simulation.outputs[1].max = 20; }, /outside its stated 0 to 20/],
    ['a simulation with no limits note', (L) => { delete L.simulation.limits; }, /no limits/],
    ['a graph of a hidden output', (L) => { L.simulation.graph.y = 'a'; }, /graph: x must be an input and y a shown output/],
  ];
  for (const [what, edit, want] of cases) {
    const [p, L, d] = lab(); edit(L, d);
    const probs = checkPack(p)[0].problems;
    if (probs.some((x) => want.test(x))) console.log(`✓ catches ${what}`); else { bad++; console.log(`✗ missed ${what}: ${probs.join('; ') || 'no problems'}`); }
  }
  return bad;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { flags, files } = argsOf(process.argv);
  if (flags.has('--self-test')) process.exit((await selfTest()) ? 1 : 0);
  if (!files.length) { console.error('usage: node checks/labs.mjs <pack.json> [more] | --self-test'); process.exit(2); }
  let bad = 0;
  for (const f of files) {
    let pack; try { pack = loadPack(f); } catch (e) { console.error(`✗ ${e.message}`); bad++; continue; }
    const res = checkPack(pack);
    if (!res.length) { console.log(`✓ labs ${f}: no labs`); continue; }
    for (const r of res) {
      if (r.problems.length) { bad++; console.log(`✗ labs ${f}: ${r.doc}: ${r.problems.length} problem(s)`); r.problems.forEach((p) => console.log(`    ✗ ${p}`)); }
      else console.log(`✓ labs ${f}: ${r.doc}: structure, safety, teacher guide${pack.documents.find((d) => d.title === r.doc)?.lab?.simulation ? ' and simulation' : ''} pass`);
    }
  }
  process.exit(bad ? 1 : 0);
}
