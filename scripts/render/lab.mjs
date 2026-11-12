// Science labs (docs/KINDS-LABS.md). A lab document is an ordinary document (its pre-lab and analysis questions are
// sections, so keys, checks and the blind tester work as for any other) plus a `lab` field. This module turns the lab
// field into neutral blocks that the PDF (html.mjs) and Word (docx.mjs) renderers both draw, decides where they go
// among the sections, and builds the simulation page.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vv } from './util.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const isLab = (doc) => !!(doc && doc.lab && typeof doc.lab === 'object');

// Pre-lab sections (section.part === "prelab") print before the bench (safety, materials, procedure, data); every
// other section (analysis, CER) prints after it.
export function labOrder(doc) {
  const secs = doc.sections || [];
  const pre = [], rest = [];
  secs.forEach((s, i) => (s.part === 'prelab' ? pre : rest).push(i));
  return { order: [...pre, ...rest], benchBefore: rest.length ? rest[0] : null };
}

const INQUIRY = {
  structured: 'Structured inquiry: the question and the procedure are given; you collect and explain the evidence.',
  guided: 'Guided inquiry: the question is given; you plan part of the procedure.',
  open: 'Open inquiry: you choose the question and plan the procedure.',
};
export const groupsOf = (L) => {
  const size = Number(L.groups?.size) || 0, cls = Number(L.groups?.classSize) || 0;
  return size > 0 && cls > 0 ? Math.ceil(cls / size) : null;
};
const amountText = (m) => (m.amount != null ? `${m.amount}${m.unit ? ` ${m.unit}` : ''}` : '');
function classTotal(m, L) {
  const n = Number(m.amount), groups = groupsOf(L), cls = Number(L.groups?.classSize) || 0;
  if (!Number.isFinite(n)) return '';
  const k = m.per === 'student' ? cls : m.per === 'class' ? 1 : groups;
  if (!k) return '';
  const t = Math.round(n * k * 100) / 100;
  return `${t}${m.unit ? ` ${m.unit}` : ''}`;
}
// a data row's numbers with each column's decimal places (dataTable.columns[].digits), so 63.0 doesn't print as 63
const dataRows = (rows, D) => rows.map((r) => r.map((x, i) => {
  const d = D.columns?.[i]?.digits;
  return x == null ? '' : typeof x === 'number' && Number.isInteger(d) ? x.toFixed(d) : String(x);
}));
const timingLine = (L) => (L.timing || []).map((t) => `${t.phase} ${t.minutes} min`).join(' · ');
export const timingTotal = (L) => (L.timing || []).reduce((s, t) => s + (Number(t.minutes) || 0), 0);

// The blocks for one place in the copy: 'top' (before the pre-lab questions), 'bench' (between pre-lab and analysis),
// 'end' (after the analysis) and 'teacher' (the teacher guide, teacher copy only).
export function labBlocks(doc, ver, where, teacher, base = '') {
  const L = doc.lab, B = [];
  const v = (x) => vv(x, ver);
  if (where === 'top') {
    if (L.phenomenon || L.drivingQuestion) B.push({ box: 'phenomenon', title: 'The phenomenon', lines: [v(L.phenomenon), L.drivingQuestion ? `**Driving question:** ${v(L.drivingQuestion)}` : null].filter(Boolean) });
    if ((L.objectives || []).length) { B.push({ h: 'By the end of this lab, you can' }); B.push({ list: L.objectives.map(v) }); }
    if ((L.standards || []).length) B.push({ p: `Standards: ${L.standards.join(', ')}`, small: true });
    const meta = [L.inquiry && INQUIRY[L.inquiry], timingLine(L) && `Today: ${timingLine(L)}.`].filter(Boolean);
    if (meta.length) B.push({ p: meta.join(' '), small: true });
    if ((L.background || []).length) { B.push({ h: 'Background' }); v(L.background).forEach((t) => B.push({ p: t })); }
    if ((L.vocabulary || []).length) B.push({ h: 'Words to know' }, { table: { columns: ['Word', 'Meaning'], rows: L.vocabulary.map((w) => [w.term, v(w.meaning)]) } });
  }
  if (where === 'bench') {
    const S = L.safety || {};
    const lines = [
      (S.ppe || []).length ? `**Wear:** ${S.ppe.join(', ')}.` : null,
      ...(S.hazards || []).map((h) => `**${h.material}:** ${h.hazard}. ${h.precaution}`),
      ...(S.rules || []),
    ].filter(Boolean);
    if (lines.length) B.push({ box: 'safety', title: '⚠ Safety first', lines });
    const groups = groupsOf(L);
    const mats = L.materials || [];
    if (mats.length) {
      B.push({ h: `Materials${L.groups?.size ? ` (per group of ${L.groups.size})` : ''}` });
      B.push({ table: { columns: ['Item', 'Amount', 'Kind'], rows: mats.filter((m) => m.per !== 'class').map((m) => [m.item, `${amountText(m)}${m.per === 'student' ? ' each student' : ''}`, m.kind === 'consumable' ? 'Used up' : 'Reusable']) } });
      const shared = mats.filter((m) => m.per === 'class');
      if (shared.length) B.push({ p: `Shared by the class: ${shared.map((m) => `${m.item}${amountText(m) ? ` (${amountText(m)})` : ''}`).join(', ')}.`, small: true });
      if (groups && !teacher) B.push({ p: `${groups} groups share the room: take turns at shared stations and bring things back.`, small: true });
    }
    if ((L.design || []).length && L.inquiry !== 'structured') {
      B.push({ h: 'Plan your procedure' }, { p: 'Answer these, then show your plan to your teacher before you start.' });
      L.design.forEach((d, i) => B.push({ p: `${i + 1}. ${v(d)}` }, { lines: 3 }));
      B.push({ p: 'Teacher sign-off: ________________   Time: ________', bold: true });
    }
    if ((L.procedure || []).length) { B.push({ h: L.inquiry === 'structured' || !(L.design || []).length ? 'Procedure' : 'Procedure (a starting plan: change it as your design needs)' }); B.push({ steps: L.procedure.map((s) => ({ text: v(s.text), safety: s.safety ? v(s.safety) : null, stop: s.stop ? v(typeof s.stop === 'string' ? s.stop : 'Stopping point: you can finish here and continue next class.') : null })) }); }
    const D = L.dataTable;
    if (D && (D.columns || []).length) {
      B.push({ h: D.title || 'Data' });
      const columns = D.columns.map((c) => `${c.name}${c.unit ? ` (${c.unit})` : ''}`);
      const rows = teacher && (L.teacher?.expectedData || []).length ? dataRows(L.teacher.expectedData, D) : (D.rows ? dataRows(D.rows, D) : Array.from({ length: D.blankRows || 5 }, () => columns.map(() => '')));
      B.push({ table: { columns, rows, tall: !teacher } });
      if (teacher && (L.teacher?.expectedData || []).length) B.push({ p: 'Teacher copy: sample results from a trial run (the student copy has empty rows).', small: true });
    }
    if ((S.disposal || []).length) B.push({ h: 'Cleanup' }, { list: S.disposal });
  }
  if (where === 'end') {
    const Dz = L.differentiation || {};
    if ((Dz.support || []).length && !teacher) B.push({ box: 'note', title: 'Need a start?', lines: Dz.support.map(v) });
    if ((Dz.extension || []).length) B.push({ h: 'If you finish early' }, { list: Dz.extension.map(v) });
  }
  if (where === 'teacher') {
    const T = L.teacher || {}, groups = groupsOf(L), total = timingTotal(L), period = (Number(L.period?.minutes) || 0) * (Number(L.period?.days) || 1);
    B.push({ pagebreak: true }, { h: 'Teacher guide' });
    if ((L.timing || []).length) B.push({ h: 'Pacing', sub: true }, { table: { columns: ['Phase', 'Minutes'], rows: [...L.timing.map((t) => [t.phase, String(t.minutes)]), [`Total (class time ${period || '?'} min${(L.period?.days || 1) > 1 ? ` over ${L.period.days} days` : ''})`, String(total)]] } });
    const setup = [L.groups?.classSize && `${L.groups.classSize} students in groups of ${L.groups.size}: ${groups} groups.`, L.groups?.stations && `Shared stations: ${L.groups.stations}.`, T.setupMinutes && `Setup before class: about ${T.setupMinutes} minutes.`].filter(Boolean);
    if (setup.length) B.push({ h: 'Setup', sub: true }, ...setup.map((p) => ({ p })));
    const mats = L.materials || [];
    if (mats.length) B.push({ h: 'Materials for the whole class', sub: true }, { table: { columns: ['Item', 'Per group', groups ? `For ${groups} groups` : 'For the class', 'Restock?'], rows: mats.map((m) => [m.item + (m.note ? ` (${m.note})` : ''), m.per === 'class' ? '—' : `${amountText(m)}${m.per === 'student' ? ' each student' : ''}`, m.per === 'class' ? amountText(m) : classTotal(m, L), m.kind === 'consumable' ? 'Consumable' : 'Durable']) } });
    if ((T.recipes || []).length) B.push({ h: 'Solutions and prep', sub: true }, { list: T.recipes });
    if ((T.substitutions || []).length) B.push({ h: 'Safer or cheaper substitutions', sub: true }, { list: T.substitutions });
    if ((T.expectedData || []).length && L.dataTable) B.push({ h: 'Expected results', sub: true }, { p: T.expectedNote || 'From a trial run; your class\'s numbers will vary.' });
    if ((T.troubleshooting || []).length) B.push({ h: 'Troubleshooting', sub: true }, { list: T.troubleshooting });
    const S = L.safety || {};
    if ((T.sds || []).length || (S.disposal || []).length) B.push({ h: 'Safety data and disposal', sub: true }, { list: [...(T.sds || []), ...(S.disposal || []).map((d) => `Disposal: ${d}`)] });
    const Dz = L.differentiation || {};
    if ((Dz.support || []).length || (Dz.extension || []).length) B.push({ h: 'Differentiation', sub: true }, { list: [...(Dz.support || []).map((x) => `Support: ${v(x)}`), ...(Dz.extension || []).map((x) => `Extension: ${v(x)}`)] });
    if (L.makeup) B.push({ h: 'Absent students', sub: true }, { p: v(L.makeup.plan || '') }, ...((L.makeup.data || []).length && L.dataTable ? [{ table: { columns: L.dataTable.columns.map((c) => `${c.name}${c.unit ? ` (${c.unit})` : ''}`), rows: dataRows(L.makeup.data, L.dataTable) } }] : []));
    if (L.simulation) B.push({ h: 'The simulation', sub: true }, { p: `"${L.simulation.title}" is its own page (${simFileName(base || 'this-lab')}): one offline file that runs in any browser, Chromebooks included, with no logins. Share it the way you share any file. ${L.simulation.use || ''}`.trim() }, ...(L.simulation.limits ? [{ p: `What the model leaves out: ${L.simulation.limits}`, small: true }] : []));
  }
  return B;
}
export const simFileName = (base) => `${base}-simulation.html`;

// The simulation page: one self-contained offline HTML file (no outside requests), from scripts/render/sims/.
export function simPageHtml(sim, { title, preview = false, brandName = '' } = {}) {
  const expr = readFileSync(join(HERE, 'sims', 'expr.mjs'), 'utf8').replace(/^export /gm, '');
  const js = readFileSync(join(HERE, 'sims', 'sim.js'), 'utf8');
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const data = JSON.stringify({ title: sim.title, inputs: sim.inputs, outputs: sim.outputs.map(({ id, label, unit, expr: x, digits, min, max, noise, hidden }) => ({ id, label, unit, expr: x, digits, min, max, noise, hidden: !!hidden })), noise: sim.noise, graph: sim.graph })
    .replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:">
<title>${e(sim.title)}</title>
<style>
  :root { --bg: #f6f4ef; --card: #fff; --ink: #1c2024; --muted: #545c64; --line: #d9d2c3; --accent: #23695a; --soft: #e2efea; --warn: #fff4d6; }
  @media (prefers-color-scheme: dark) { :root { --bg: #14171b; --card: #1c2026; --ink: #ebe8e2; --muted: #a9b1ba; --line: #353c45; --accent: #7fc6b0; --soft: #1d3530; --warn: #2e2713; } }
  * { box-sizing: border-box; } body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  main { max-width: 980px; margin: 0 auto; padding: 18px 16px 40px; display: grid; gap: 14px; }
  h1 { margin: 0; font-size: 1.6rem; line-height: 1.2; } p { margin: 0; } .muted { color: var(--muted); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; display: grid; gap: 10px; }
  .model { background: var(--warn); border-color: var(--line); font-size: .92rem; }
  .ctl label { font-weight: 700; display: block; } .pair { display: flex; gap: 10px; align-items: center; } .pair input[type=range] { flex: 1; accent-color: var(--accent); min-width: 0; }
  .num { width: 6.5em; font: inherit; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink); }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  button, select { font: inherit; border-radius: 10px; padding: 8px 14px; border: 1px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer; min-height: 44px; }
  button.primary { background: var(--accent); color: var(--card); border-color: var(--accent); font-weight: 700; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .grid2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 14px; } @media (max-width: 760px) { .grid2 { grid-template-columns: minmax(0, 1fr); } }
  .tablewrap { overflow-x: auto; } table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; } th, td { border: 1px solid var(--line); padding: 5px 8px; text-align: right; } th { background: var(--soft); } td.empty { text-align: left; color: var(--muted); }
  svg { width: 100%; height: auto; } .grid { stroke: var(--line); } .axis { stroke: var(--ink); stroke-width: 1.5; } .tick { fill: var(--muted); font-size: 12px; } .lab { fill: var(--ink); font-size: 13px; font-weight: 700; } .pt { fill: var(--accent); }
  .sr { position: absolute; left: -9999px; } textarea { width: 100%; min-height: 8em; font: 13px/1.4 ui-monospace, monospace; }
  .preview { background: #000; color: #fff; text-align: center; font-weight: 700; letter-spacing: .06em; padding: 6px; }
  @media print { .controls, .actions, .preview { display: none; } body { background: #fff; } .card { border: 0; } }
</style></head><body>
${preview ? '<div class="preview">PREVIEW · not approved for use</div>' : ''}
<main>
  <header class="card"><h1>${e(sim.title)}</h1>${sim.intro ? `<p>${e(sim.intro)}</p>` : ''}</header>
  ${sim.limits ? `<p class="card model"><b>This is a model, not the real thing.</b> ${e(sim.limits)}</p>` : ''}
  <div class="grid2">
    <section class="card controls" aria-labelledby="c-h"><h2 id="c-h" style="margin:0;font-size:1.1rem">Set up a trial</h2>
      <div id="inputs" style="display:grid;gap:12px"></div>
      <div class="row"><label for="repeat">Repeat</label><select id="repeat"><option value="1">1 trial</option><option value="3">3 trials</option><option value="5">5 trials</option></select>
      <button type="button" class="primary" id="run">Run trial</button></div>
      <p id="live" role="status" aria-live="polite" class="muted"></p>
    </section>
    <section class="card" aria-labelledby="g-h"><h2 id="g-h" style="margin:0;font-size:1.1rem">Graph</h2>
      <div class="row controls"><label for="gx">Across</label><select id="gx"></select><label for="gy">Up</label><select id="gy"></select></div>
      <svg id="graph" role="img"></svg>
    </section>
  </div>
  <section class="card" aria-labelledby="d-h"><div class="row" style="justify-content:space-between"><h2 id="d-h" style="margin:0;font-size:1.1rem">Data <span class="muted" id="count"></span></h2>
    <div class="row actions"><button type="button" id="undo">Delete last</button><button type="button" id="clear">Clear all</button><button type="button" id="copy">Copy data</button><button type="button" id="print">Print</button></div></div>
    <div class="tablewrap"><table><thead id="thead"></thead><tbody id="tbody"></tbody></table></div>
    <textarea id="csv" hidden aria-label="Your data as text"></textarea>
  </section>
  <p class="muted" style="font-size:.85rem">${e(title || '')}${brandName ? ` · ${e(brandName)}` : ''} · Made with AI · a model for learning, checked by separate agents</p>
</main>
<script>var SIM = ${data};
${expr}
${js}</script>
</body></html>`;
}
