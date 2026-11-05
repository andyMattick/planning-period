#!/usr/bin/env node
/* Score a blind tester's answers against the pack's key (Pet World docs/BLIND-REVIEW.md step 3). The tester answered
   checks/student-view.mjs's view with one JSON line per item: {"where", "answer", "confidence", "flags", "note"}.

     node checks/score-blind.mjs <pack.json> <answers.jsonl>

   Prints matched / of, every mismatch and every flag (each needs a FIX / KEEP / JUDGMENT decision from the tester),
   items the tester skipped, and the blind accuracy, mean confidence and too-easy flags per level (is L3 clearly
   harder?). mc answers may be a letter or the choice text; numeric answers are compared by value; short answers against
   the answer and accept list (case and spacing ignored). Open answers are listed for the tester to judge by hand.
   It writes nothing: the tester records its round in checks.blind itself. */
import { readFileSync } from 'node:fs';
import { loadPack, rows, norm, valueOf, sameValue, argsOf } from './pack-lib.mjs';

const { files } = argsOf(process.argv);
if (files.length < 2) { console.error('usage: node checks/score-blind.mjs <pack.json> <answers.jsonl>'); process.exit(2); }
const pack = loadPack(files[0]);
const answers = new Map();
readFileSync(files[1], 'utf8').split('\n').filter((l) => l.trim()).forEach((l, i) => {
  try { const a = JSON.parse(l); answers.set(String(a.where).trim(), a); } catch { console.log(`· line ${i + 1} is not JSON: ${l.slice(0, 60)}`); }
});
const L = 'ABCDEF';
function matches(r, given) {
  if (given === undefined || given === null) return false;
  const g = String(given).trim();
  if (r.type === 'mc') { const idx = /^[A-F]$/i.test(g) ? L.indexOf(g.toUpperCase()) : r.choices.findIndex((c) => norm(c) === norm(g)); return idx === r.answer; }
  if (r.type === 'tf') return norm(g) === norm(r.answer);
  const forms = [r.answer, ...(Array.isArray(r.accept) ? r.accept : [])];
  if (r.type === 'numeric') { const v = valueOf(g.replace(/[^\d./ ,+−-]/g, '').trim()); return forms.some((f) => sameValue(valueOf(f), v)) || forms.some((f) => norm(f) === norm(g)); }
  return forms.some((f) => norm(f) === norm(g));
}
const all = rows(pack).filter((r) => r.type !== 'open');
const opens = rows(pack).filter((r) => r.type === 'open');
let matched = 0; const miss = [], flagged = [], skipped = [];
const lv = { 1: [], 2: [], 3: [] };
for (const r of all) {
  const a = answers.get(r.where);
  if (!a) { skipped.push(r.where); continue; }
  const m = matches(r, a.answer); if (m) matched++; else miss.push({ r, a });
  if (a.flags && a.flags.length) flagged.push({ r, a });
  (lv[r.level] || (lv[r.level] = [])).push({ m, c: Number(a.confidence) || 0, easy: (a.flags || []).includes('too-easy') });
}
const key = (r) => (r.type === 'mc' ? `${L[r.answer]}. ${r.choices[r.answer]}` : String(r.answer));
console.log(`Blind score: ${matched} of ${all.length - skipped.length} matched the key${skipped.length ? ` (${skipped.length} not answered)` : ''}.`);
for (const { r, a } of miss) console.log(`  ✗ ${r.where}: tester ${JSON.stringify(a.answer)}, key ${key(r)}${a.note ? ` — ${a.note}` : ''}`);
for (const { r, a } of flagged) console.log(`  ⚑ ${r.where}: ${a.flags.join(', ')}${a.note ? ` — ${a.note}` : ''}`);
for (const w of skipped) console.log(`  · not answered: ${w}`);
for (const r of opens) { const a = answers.get(r.where); console.log(`  ✎ ${r.where} (open): tester ${a ? JSON.stringify(a.answer) : 'no answer'}; model ${JSON.stringify(r.answer)} — judge by hand`); }
console.log('\nBy level (is L3 clearly harder?):');
for (const n of Object.keys(lv)) { const x = lv[n]; if (!x.length) continue; console.log(`  L${n}: ${x.length} items, ${(100 * x.filter((y) => y.m).length / x.length).toFixed(0)}% matched, mean confidence ${(x.reduce((s, y) => s + y.c, 0) / x.length).toFixed(1)}, ${x.filter((y) => y.easy).length} too-easy`); }
console.log('\nEvery ✗ and ⚑ gets FIX, KEEP (one-line reason) or JUDGMENT (both readings, for the teacher) in checks.blind.');
