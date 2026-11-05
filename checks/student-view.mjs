#!/usr/bin/env node
/* The student copy as text, with no key, for a blind tester (agents/blind-*.md; Pet World's keyless test view,
   scripts/blind-export.mjs). It prints every question of every document and version with its id, level and choices
   labeled A–F, and never the answer, accept list, why or checks. A picture is shown as "[picture: N characters of SVG
   text: …]" with its text labels, so the tester knows what the student sees.

     node checks/student-view.mjs <pack.json> [--out view.md] [--only "Ratios Quiz B q3,Ratios Quiz A q7"]

   Then the tester writes one JSON line per item ({"where", "answer", "confidence" 1-5, "flags", "note"}) and scores it
   with checks/score-blind.mjs. Keep the view outside the order folder's pack (it is a working copy: delete it after). */
import { writeFileSync } from 'node:fs';
import { loadPack, rows, argsOf } from './pack-lib.mjs';

const { opt, files } = argsOf(process.argv);
if (!files.length) { console.error('usage: node checks/student-view.mjs <pack.json> [--out view.md] [--only "where,where"]'); process.exit(2); }
const pack = loadPack(files[0]);
const only = opt('only') ? new Set(opt('only').split(',').map((s) => s.trim())) : null;
const L = 'ABCDEF';
const figText = (svg) => { const t = [...String(svg).matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()).filter(Boolean); return `[picture${t.length ? `; its labels: ${t.join(' · ')}` : ''}]`; };
const out = [`# Student copy (no key): ${pack.order?.subject || ''} ${pack.order?.grade ? 'grade ' + pack.order.grade : ''}, ${pack.order?.topic || ''}`, '',
  'Answer every item as a strong student and a careful teacher would. One JSON line per item: {"where": "<the item\'s where>", "answer": <letter, number or text>, "confidence": 1-5, "flags": [two-right, none-right, giveaway, missing-given, ambiguous-wording, factually-wrong, too-easy, unrealistic, grammar-typo, off-source], "note": "…"}', ''];
let doc = null;
for (const r of rows(pack)) {
  if (only && !only.has(r.where)) continue;
  const head = `${r.docTitle}${r.ver ? ' — version ' + r.ver : ''}`;
  if (head !== doc) { doc = head; out.push(`## ${head}`, '', r.doc.directions ? `*${r.doc.directions}*` : '', ''); }
  out.push(`**${r.where}** (level ${r.level}, ${r.type})`, '', String(r.prompt ?? ''));
  if (r.figure) out.push('', figText(r.figure));
  if (Array.isArray(r.choices)) out.push('', ...r.choices.map((c, i) => `- ${L[i]}. ${c}`));
  if (r.type === 'tf') out.push('', '- True / False');
  out.push('');
}
const text = out.join('\n');
if (opt('out')) { writeFileSync(opt('out'), text); console.log(`wrote ${opt('out')}`); } else console.log(text);
