#!/usr/bin/env node
/* The student copy as text, with no key, for a blind tester (agents/blind-*.md; Pet World's keyless test view,
   scripts/blind-export.mjs). It prints every question of every document and version with its id, level and choices
   labeled A–F, and never the answer, accept list, why or checks. A picture is shown as "[picture: N characters of SVG
   text: …]" with its text labels, so the tester knows what the student sees.

     node checks/student-view.mjs <pack.json> [--out view.md] [--only "Ratios Quiz B q3|Ratios Quiz A q7"] [--no-passages] [--pool-sample N]

   Shared data sets print once before their group (with "Use this for questions 3–5"); a multi-part answer lists its
   parts (a), (b)…; a document with one version per student prints a sample of its pool (--pool-sample, default 3).

   Reading passages (documents[].passages, docs/PACK-FORMAT.md) print with numbered paragraphs just before the first
   item that cites them, as on the student copy. --no-passages leaves them out: the ELA no-passage probe
   (agents/blind-ela.md mode 1, docs/RUNBOOK.md step 4a) and phase a of the blind solve.

   --only takes the items' where strings separated by "|" (titles may contain commas, e.g. "Reconstruction,
   1865–1877"); a list with no "|" is split on commas, as before. Any where that matches no item is an error (exit 1),
   so a filter never quietly gives an empty view.

   Then the tester writes one JSON line per item ({"where", "answer", "confidence" 1-5, "flags", "note"}) and scores it
   with checks/score-blind.mjs. Keep the view outside the order folder's pack (it is a working copy: delete it after). */
import { writeFileSync } from 'node:fs';
import { loadPack, rows, argsOf } from './pack-lib.mjs';
import { isGraphFigure, graphText } from '../scripts/render/graph.mjs';
import { passagePlan, passageByline, vv, stimulusPlan, groupLine, partsOf, poolDocs } from '../scripts/render/util.mjs';

const { opt, files, flags } = argsOf(process.argv);
const noPassages = flags.has('--no-passages');
if (!files.length) { console.error('usage: node checks/student-view.mjs <pack.json> [--out view.md] [--only "where|where"]'); process.exit(2); }
const pack = loadPack(files[0]);
/* --pool-sample N (one version per student, docs/PACK-FORMAT.md): the blind tester solves N of the pool's versions
   (default 3: the first, the middle and the last), each as its own document named by its version code. */
const sampleN = opt('pool-sample') ? Number(opt('pool-sample')) : 3;
pack.documents = pack.documents.flatMap((d) => {
  const pv = poolDocs(d);
  if (!pv.length) return [d];
  const pickAt = [...new Set(Array.from({ length: Math.min(sampleN, pv.length) }, (_, i) => Math.round((i * (pv.length - 1)) / Math.max(1, Math.min(sampleN, pv.length) - 1))))];
  return pickAt.map((i) => ({ ...pv[i].doc, title: `${d.title} ${pv[i].code}` }));
});
const onlyRaw = opt('only');
const only = onlyRaw ? new Set(onlyRaw.split(onlyRaw.includes('|') ? '|' : ',').map((s) => s.trim()).filter(Boolean)) : null;
const L = 'ABCDEF';
const figText = (svg) => { if (isGraphFigure(svg)) return `[graph: ${graphText(svg)}]`; const t = [...String(svg).matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()).filter(Boolean); return `[picture${t.length ? `; its labels: ${t.join(' · ')}` : ''}]`; };
const out = [`# Student copy (no key): ${pack.order?.subject || ''} ${pack.order?.grade ? 'grade ' + pack.order.grade : ''}, ${pack.order?.topic || ''}`, '',
  'Answer every item as a strong student and a careful teacher would. One JSON line per item: {"where": "<the item\'s where>", "answer": <letter, number or text>, "confidence": 1-5, "flags": [two-right, none-right, giveaway, missing-given, ambiguous-wording, factually-wrong, too-easy, unrealistic, grammar-typo, off-source], "note": "…"}', ''];
const passageText = (p, ver) => ['', `### ${p.title || 'Passage'}`, passageByline(p) ? `*${passageByline(p)}*` : '', '',
  ...(vv(p.paragraphs, ver) || []).flatMap((t, i) => [`[${i + 1}] ${t}`, '']), '---', ''];
// a shared data set: printed once, before the first item of its group
const tableText = (t) => (t && Array.isArray(t.rows) ? ['', ...(Array.isArray(t.columns) ? [`| ${t.columns.join(' | ')} |`, `|${t.columns.map(() => ' --- ').join('|')}|`] : []), ...t.rows.map((r) => `| ${(Array.isArray(r) ? r : [r]).join(' | ')} |`)] : []);
const stimText = (st, ns) => ['', `### Data set: ${st.title || st.id}`, `*${groupLine(ns)}*`, '', st.intro ? String(st.intro) : '', ...tableText(st.table), ...(st.figure ? ['', figText(st.figure)] : []), '', '---', ''];
let doc = null, plan = null, shown = null, splan = null;
for (const r of rows(pack)) {
  if (only && !only.has(r.where)) continue;
  const head = `${r.docTitle}${r.ver ? ' — version ' + r.ver : ''}`;
  if (head !== doc) {
    doc = head; out.push(`## ${head}`, '', r.doc.directions ? `*${vv(r.doc.directions, r.ver)}*` : '', '');
    plan = passagePlan(r.doc, r.ver); shown = new Set(); splan = stimulusPlan(r.doc, r.ver);
    if (noPassages && (plan.top.length || plan.before.size || plan.beforeQ.size)) out.push('*(The reading passages are left out of this view.)*', '');
  }
  if (!noPassages) {   // a passage prints before the first item shown that comes after the place it belongs
    const at = (si, n) => si < r.s || (si === r.s && n <= r.n);
    const due = [...plan.top, ...(r.doc.sections || []).flatMap((sec, si) => [...(at(si, -1) ? plan.before.get(si) || [] : []),
      ...(sec.questions || []).flatMap((q, n) => (at(si, n) ? plan.beforeQ.get(q) || [] : []))])];
    for (const p of due) if (!shown.has(p)) { shown.add(p); out.push(...passageText(p, r.ver)); }
  }
  if (splan.first.has(r.q)) { const st = splan.first.get(r.q); out.push(...stimText(st, splan.groups.get(st.id))); }
  else if (r.q.stimulus != null && only) { const st = splan.byId.get(String(vv(r.q.stimulus, r.ver))); if (st) out.push(...stimText(st, splan.groups.get(st.id))); }
  out.push(`**${r.where}** (level ${r.level}, ${r.type})`, '', String(r.prompt ?? ''));
  const parts = partsOf(r.q, r.ver);
  if (parts.length) out.push('', ...parts.map((p) => `(${p.label}) ${p.prompt}${p.points != null ? ` [${p.points} points]` : ''}`));
  if (r.figure) out.push('', figText(r.figure));
  if (Array.isArray(r.choices)) out.push('', ...r.choices.map((c, i) => `- ${L[i]}. ${c}`));
  if (r.type === 'tf') out.push('', '- True / False');
  out.push('');
}
if (only) {
  const found = new Set(rows(pack).map((r) => r.where));
  const missing = [...only].filter((w) => !found.has(w));
  if (missing.length) { console.error(`--only: no item matches ${missing.map((w) => JSON.stringify(w)).join(', ')} (separate items with "|")`); process.exit(1); }
}
const text = out.join('\n');
if (opt('out')) { writeFileSync(opt('out'), text); console.log(`wrote ${opt('out')}`); } else console.log(text);
