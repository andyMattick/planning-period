#!/usr/bin/env node
/* 🤖 Wilco's key check (agents/wilco.md). Are the keys and the A/B versions sound before anyone plays the bots?

     node checks/keys.mjs <pack.json> [more packs] [--write [--round N]] [--json out.json]

   Errors (exit 1):
     - the pack's shape: format 1, a documents list, question ids unique in a document, a known type
     - mc: 2–6 choices, none empty, an answer index that points at one of them
     - no two choices the same, in text (case, spacing and end marks ignored) or in value (0.5 and 1/2; Pet World's
       "terrible mistake")
     - tf: a true/false answer; numeric: an answer that reads as a number, and every accept form has the same value
     - accept lists never hold a wrong choice (a typed answer that matches a wrong choice would be marked right)
     - quiz and test documents have versions (A and B), and every per-version field gives every version
     - A and B test the same skills at the same levels: the same (skill, level, type) list, item for item
     - no question repeated across versions word for word (same prompt, picture and choices or answer)
     - a test question never copies a practice question in the same pack word for word (Pet World's reserved test pool:
       a student who saw the worksheet key must not meet the same item on the test)
     - levels 1–3 and a skill on every scored question; a worksheet uses all three levels; a test holds about 40%
       level 3 (30–50% in each version)
   Warnings (shown, never fail): no `why` for the teacher copy, a prompt shared by A and B with the same key, a picture
   whose text contains the answer, a skill or level missing on an unscored document.

   --write adds {check: "keys", round, pass, errors, warnings, problems} to pack.checks.wilco (round = the next one for
   this check, or --round N). Only Wilco runs it with --write; the maker may run it without, while writing. */
import { loadPack, rows, norm, signature, valueOf, sameValue, pick, perVersion, versionsOf, kindOf, docName,
  TYPES, TEST_KINDS, VERSIONED_KINDS, SCORED_KINDS, nextRound, writeWilco, argsOf } from './pack-lib.mjs';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function checkKeys(pack) {
  const errors = [], warnings = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  if (pack.format !== 1) err(`format is ${JSON.stringify(pack.format)}, expected 1`);
  if (!pack.documents.length) err('no documents');

  pack.documents.forEach((doc, d) => {
    const name = docName(doc, d), kind = kindOf(doc), vers = versionsOf(doc);
    const qs = (doc.sections || []).flatMap((s) => s.questions || []);
    if (!doc.sections || !Array.isArray(doc.sections)) { if (!doc.slides && !doc.rubric) warn(`${name}: no sections, slides or rubric`); }
    if (VERSIONED_KINDS.includes(kind) && (vers.length < 2 || vers[0] === null)) err(`${name}: a ${kind} needs versions ["A", "B"]`);
    if (new Set(vers).size !== vers.length) err(`${name}: a version is listed twice`);
    // reading passages (docs/PACK-FORMAT.md, "Passages"): not questions; ids unique, paragraphs given, every reference found
    const passages = (Array.isArray(doc.passages) ? doc.passages : []).filter((p) => p && p.paragraphs !== undefined);
    const pids = new Set();
    for (const p of passages) {
      const pid = String(p.id ?? '');
      if (!pid) err(`${name}: a passage has no id`);
      else if (pids.has(pid)) err(`${name}: passage id ${pid} is used twice`);
      pids.add(pid);
      for (const v of vers) { const ps = pick(p.paragraphs, v); if (!Array.isArray(ps) || !ps.length || ps.some((t) => typeof t !== 'string' || !t.trim())) err(`${name} passage ${pid}: paragraphs must be a list of non-empty strings${v ? ` (version ${v})` : ''}`); }
      if (!p.title) warn(`${name} passage ${pid}: no title`);
      if (p.kind && !['fiction', 'nonfiction', 'poem', 'drama'].includes(p.kind)) warn(`${name} passage ${pid}: kind ${JSON.stringify(p.kind)} is not fiction, nonfiction, poem or drama`);
    }
    const refsOf = (x) => vers.flatMap((v) => { const r = pick(x.passage, v); return Array.isArray(r) ? r : r ? [r] : []; }).map(String);
    for (const sec of doc.sections || []) for (const x of [sec, ...(sec.questions || [])]) for (const r of refsOf(x)) if (!pids.has(r)) err(`${name}${x.id ? ' ' + x.id : ''}: passage ${JSON.stringify(r)} is not in the document's passages`);
    const ids = new Set();
    for (const q of qs) {
      const id = q.id || '(no id)';
      if (!q.id) err(`${name}: a question has no id`);
      else if (ids.has(q.id)) err(`${name}: id ${q.id} is used twice`);
      ids.add(q.id);
      if (!TYPES.includes(q.type)) err(`${name} ${id}: type ${JSON.stringify(q.type)} is not one of ${TYPES.join(', ')}`);
      for (const f of ['prompt', 'choices', 'answer', 'accept', 'why', 'figure', 'level', 'skill']) {
        if (!perVersion(q[f])) continue;
        if (vers[0] === null) { err(`${name} ${id}: ${f} is given per version, but the document has no versions`); continue; }
        for (const v of vers) if (!(v in q[f])) err(`${name} ${id}: ${f} has no version ${v}`);
        for (const v of Object.keys(q[f])) if (!vers.includes(v)) err(`${name} ${id}: ${f} has version ${v}, which the document doesn't list`);
      }
    }
  });

  const all = rows(pack);
  for (const r of all) {
    const scored = SCORED_KINDS.includes(r.kind);
    if (!(Number.isInteger(r.level) && r.level >= 1 && r.level <= 3)) (scored ? err : warn)(`${r.where}: level ${JSON.stringify(r.level)} (use 1, 2 or 3)`);
    if (!r.skill || !String(r.skill).trim()) (scored ? err : warn)(`${r.where}: no skill`);
    if (r.prompt === undefined || !String(r.prompt).trim()) err(`${r.where}: no prompt`);
    if (r.why === undefined || !String(r.why).trim()) warn(`${r.where}: no "why" for the teacher copy`);
    const ch = r.choices;
    if (r.type === 'mc') {
      if (!Array.isArray(ch) || ch.length < 2 || ch.length > 6) { err(`${r.where}: mc needs 2–6 choices`); continue; }
      if (ch.some((c) => !String(c ?? '').trim())) err(`${r.where}: an empty choice`);
      if (!(Number.isInteger(r.answer) && r.answer >= 0 && r.answer < ch.length)) err(`${r.where}: answer ${JSON.stringify(r.answer)} is not an index into its ${ch.length} choices`);
      for (let a = 0; a < ch.length; a++) for (let b = a + 1; b < ch.length; b++) {
        if (norm(ch[a]) === norm(ch[b])) err(`${r.where}: two choices are the same: “${ch[a]}” and “${ch[b]}”`);
        else if (sameValue(valueOf(ch[a]), valueOf(ch[b]))) err(`${r.where}: two choices have the same value: “${ch[a]}” and “${ch[b]}”`);
      }
      if (r.figure && Number.isInteger(r.answer) && ch[r.answer] && String(r.figure).includes(`>${String(ch[r.answer]).trim()}<`)) warn(`${r.where}: the picture's text contains the key “${ch[r.answer]}”`);
    }
    if (r.type === 'tf' && ![true, false, 'true', 'false', 'True', 'False'].includes(r.answer)) err(`${r.where}: tf answer ${JSON.stringify(r.answer)} is not true or false`);
    if (['short', 'numeric', 'open', 'match'].includes(r.type) && (r.answer === undefined || r.answer === null || r.answer === '')) (r.type === 'open' ? warn : err)(`${r.where}: no answer${r.type === 'open' ? ' (a model answer for the teacher copy)' : ''}`);
    if (r.accept !== undefined && !Array.isArray(r.accept)) err(`${r.where}: accept must be a list`);
    const acc = Array.isArray(r.accept) ? r.accept : [];
    if (r.type === 'numeric') {
      const v = valueOf(r.answer);
      if (!v) err(`${r.where}: numeric answer ${JSON.stringify(r.answer)} doesn't read as a number`);
      for (const a of acc) { const w = valueOf(a); if (v && w && !sameValue(v, w)) err(`${r.where}: accept form “${a}” has a different value from the answer “${r.answer}”`); }
    }
    if (Array.isArray(ch)) {
      const keyIdx = Number.isInteger(r.answer) ? r.answer : ch.findIndex((c) => norm(c) === norm(r.answer));
      for (const a of acc) ch.forEach((c, i) => { if (i !== keyIdx && norm(c) === norm(a)) err(`${r.where}: accept holds “${a}”, which is a wrong choice`); });
    }
    for (const a of acc) if (!String(a ?? '').trim()) err(`${r.where}: an empty accept form`);
  }

  // per document: A/B, levels, repeats
  pack.documents.forEach((doc, d) => {
    const name = docName(doc, d), kind = kindOf(doc), vers = versionsOf(doc);
    const mine = all.filter((r) => r.d === d);
    const byVer = Object.fromEntries(vers.map((v) => [v, mine.filter((r) => r.ver === v)]));
    if (vers.length > 1) {
      const plan = (v) => byVer[v].map((r) => `${r.skill}|L${r.level}|${r.type}`);
      const [A, ...rest] = vers;
      for (const B of rest) {
        const pa = plan(A), pb = plan(B);
        pa.forEach((x, i) => { if (x !== pb[i]) err(`${name}: ${byVer[A][i].id} tests ${x.split('|').slice(0, 2).join(' ')} in ${A} but ${pb[i].split('|').slice(0, 2).join(' ')} in ${B}`); });
        const sa = [...pa].sort().join(), sb = [...pb].sort().join();
        if (sa !== sb) err(`${name}: versions ${A} and ${B} don't test the same skills and levels`);
        const sigB = new Map(byVer[B].map((r) => [signature(r), r]));
        for (const r of byVer[A]) {
          const twin = sigB.get(signature(r));
          if (twin) err(`${name}: ${r.id} (${A}) and ${twin.id} (${B}) are the same question word for word`);
          else {
            const p = byVer[B].find((x) => norm(x.prompt) === norm(r.prompt) && !x.figure && !r.figure);
            if (p) warn(`${name}: ${r.id} (${A}) and ${p.id} (${B}) share the prompt word for word (choices differ)`);
          }
        }
      }
    }
    for (const v of vers) {
      const list = byVer[v], tag = v ? ` ${v}` : '';
      if (!list.length) continue;
      const lv = (n) => list.filter((r) => r.level === n).length;
      if (kind === 'worksheet' && [1, 2, 3].some((n) => !lv(n))) err(`${name}${tag}: a worksheet gets harder through levels 1, 2 and 3 (has L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)})`);
      if (TEST_KINDS.includes(kind)) {
        const share = lv(3) / list.length;
        if (share < 0.3 || share > 0.5) err(`${name}${tag}: level 3 is ${(100 * share).toFixed(0)}% of the test (${lv(3)} of ${list.length}); about 40% (30–50%) is the rule`);
      }
    }
    if (TEST_KINDS.includes(kind)) {
      const practice = new Map(all.filter((r) => !TEST_KINDS.includes(r.kind)).map((r) => [signature(r), r]));
      for (const r of mine) { const p = practice.get(signature(r)); if (p) err(`${r.where}: copies ${p.where} word for word (a test question must be new)`); }
    }
  });
  return { errors, warnings };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { flags, opt, files } = argsOf(process.argv);
  if (!files.length) { console.error('usage: node checks/keys.mjs <pack.json> [--write [--round N]] [--json out.json]'); process.exit(2); }
  let bad = 0; const report = [];
  for (const f of files) {
    let pack;
    try { pack = loadPack(f); } catch (e) { console.error(`✗ ${e.message}`); bad++; continue; }
    const { errors, warnings } = checkKeys(pack);
    const n = rows(pack).length;
    console.log(`${errors.length ? '✗' : '✓'} keys ${f}: ${n} question rows, ${errors.length} error(s), ${warnings.length} warning(s)`);
    for (const e of errors) console.log(`    ✗ ${e}`);
    for (const w of warnings) console.log(`    · ${w}`);
    if (errors.length) bad++;
    report.push({ file: f, errors, warnings });
    if (flags.has('--write')) {
      const round = opt('round') ? Number(opt('round')) : nextRound(pack, 'keys');
      writeWilco(f, pack, { check: 'keys', round, agent: '🤖 Wilco (keys)', at: new Date().toISOString(), rows: n, errors: errors.length, warnings: warnings.length, problems: errors.slice(0, 30), pass: !errors.length });
      console.log(`    wrote checks.wilco round ${round} (keys) to ${f}`);
    }
  }
  if (opt('json')) writeFileSync(opt('json'), JSON.stringify(report, null, 1));
  process.exit(bad ? 1 : 0);
}
