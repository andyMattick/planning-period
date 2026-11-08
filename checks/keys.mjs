#!/usr/bin/env node
/* 🤖 Wilco's key check (agents/wilco.md). Are the keys and the A/B versions sound before anyone plays the bots?

     node checks/keys.mjs <pack.json> [more packs] [--write [--round N]] [--json out.json]

   Errors (exit 1):
     - the pack's shape: format 1, a documents list, question ids unique in a document, a known type
   - a document's `format` (printable or interactive) and, when interactive, `grading` (auto or print), kind and types
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
const INTERACTIVE_KINDS = ['worksheet', 'homework', 'quiz', 'test', 'readingquiz', 'studyguide', 'notes', 'reviewgame'];   // = scripts/render/interactive-format.mjs FORMAT_KINDS
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
    // versions are one setting on the order (owner, Nov 8, 2026): a number (1 to 10) or one per student (doc.pool)
    const asked = pack.order?.itemSpecs?.[doc.item]?.versions;
    const oneAsked = Number(asked) === 1 || asked === 'student';
    if (VERSIONED_KINDS.includes(kind) && !doc.pool && !oneAsked && (vers.length < 2 || vers[0] === null)) err(`${name}: a ${kind} needs versions ["A", "B"]`);
    if (Number(asked) >= 2 && Number(asked) <= 26 && vers[0] !== null && vers.length !== Number(asked)) err(`${name}: the order asked for ${asked} versions, the document has ${vers.length}`);
    if (vers.length > 10) err(`${name}: ${vers.length} versions (10 at most; for more, use one version per student)`);
    // one version per student (docs/PACK-FORMAT.md): an interactive page only, printed for grading (it holds no keys)
    if (doc.pool || asked === 'student') {
      if (doc.format !== 'interactive') err(`${name}: one version per student is only for an interactive page (format "interactive"); for paper, ask for a number of versions`);
      else if (doc.grading !== 'print') err(`${name}: one version per student is graded on paper ("grading": "print"): the page can't hold keys`);
      if (asked === 'student' && !doc.pool) err(`${name}: the order asked for one version per student, but the document has no pool`);
      if (doc.pool) {
        if (vers.length !== 1 || vers[0] !== 'A') err(`${name}: a pool document is written as version A only (versions ["A"])`);
        const size = Number(doc.pool.size || doc.pool.students);
        if (!(Number.isInteger(size) && size >= 2 && size <= 150)) err(`${name}: pool size ${JSON.stringify(size)} (2 to 150 students)`);
        const pv = Array.isArray(doc.pool.versions) ? doc.pool.versions : [];
        if (!pv.length) err(`${name}: the pool hasn't been made: run node scripts/versions.mjs on the pack`);
        else {
          if (pv.length !== size) err(`${name}: the pool has ${pv.length} versions, but ${size} were asked for`);
          const codes = pv.map((x) => x.code);
          if (codes.some((c) => !/^[A-Z]{5}$/.test(String(c)))) err(`${name}: every pool version needs a 5-letter code`);
          if (new Set(codes).size !== codes.length) err(`${name}: two pool versions share a code`);
          if (JSON.stringify(doc.pool.codes || []) !== JSON.stringify(codes)) err(`${name}: pool.codes doesn't list the versions' codes in order`);
        }
        if (asked === 'student' && pack.order?.itemSpecs?.[doc.item]?.students != null && Number(pack.order.itemSpecs[doc.item].students) !== size) err(`${name}: the order asked for ${pack.order.itemSpecs[doc.item].students} students, the pool has ${size}`);
      }
    }
    if (new Set(vers).size !== vers.length) err(`${name}: a version is listed twice`);
    // the format (docs/KINDS-INTERACTIVE-FORMAT.md): printable (the default) or an interactive page, graded in the page or printed
    if (doc.format != null && !['printable', 'interactive'].includes(doc.format)) err(`${name}: format must be "printable" or "interactive" (got ${JSON.stringify(doc.format)})`);
    if (doc.format === 'interactive') {
      if (!['auto', 'print'].includes(doc.grading)) err(`${name}: an interactive document needs grading "auto" or "print"`);
      if (!INTERACTIVE_KINDS.includes(kind)) err(`${name}: a ${kind} can't be interactive (only ${INTERACTIVE_KINDS.join(', ')})`);
      for (const q of qs) if (!['mc', 'tf', 'numeric', 'short', 'open', 'match'].includes(q.type || 'short')) err(`${name} ${q.id}: type ${q.type} can't be in an interactive page`);
    } else if (doc.grading != null) err(`${name}: "grading" is only for format "interactive"`);
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
    // shared data sets (docs/PACK-FORMAT.md, "Shared data sets"): ids, references, the group together and not too long
    const sids = new Map();
    for (const v of vers) for (const st of (Array.isArray(pick(doc.stimuli, v)) ? pick(doc.stimuli, v) : [])) {
      const sid = String(st?.id ?? '');
      if (!sid) { err(`${name}: a data set has no id`); continue; }
      if (sids.get(sid) === v) err(`${name}: data set id ${sid} is used twice`);
      sids.set(sid, v);
      const t = pick(st.table, v), fig = pick(st.figure ?? st.plot, v);
      if (!t && !fig && !pick(st.intro, v)) err(`${name} data set ${sid}: it needs a table, a graph or an intro`);
      if (t && !(Array.isArray(t.rows) && t.rows.length)) err(`${name} data set ${sid}: a table needs rows`);
    }
    for (const v of vers) {
      const order = qs.map((q) => { const r = pick(q.stimulus, v); return r == null || r === '' ? null : String(r); });
      for (const [i, r] of order.entries()) if (r && !sids.has(r)) err(`${name} ${qs[i].id}: data set ${JSON.stringify(r)} is not in the document's stimuli`);
      for (const sid of new Set(order.filter(Boolean))) {
        const at = order.map((r, i) => (r === sid ? i : -1)).filter((i) => i >= 0);
        if (at[at.length - 1] - at[0] + 1 !== at.length) err(`${name}${v ? ' ' + v : ''}: the questions on data set ${sid} are not next to each other (${at.map((i) => qs[i].id).join(', ')})`);
        if (at.length > 5) err(`${name}${v ? ' ' + v : ''}: ${at.length} questions on data set ${sid} (at most about 4: a long chain lets one answer lean on another)`);
        else if (at.length === 5) warn(`${name}${v ? ' ' + v : ''}: 5 questions on data set ${sid} (aim for at most 4)`);
      }
    }
    // multi-part long answers: each part has a prompt and a strong answer or a checklist
    for (const q of qs) {
      const parts = q.parts;
      if (parts == null) continue;
      if (!['short', 'open'].includes(q.type)) err(`${name} ${q.id}: parts are for short or written (open) answers`);
      for (const v of vers) {
        const ps = pick(parts, v);
        if (!Array.isArray(ps) || ps.length < 2 || ps.length > 6) { err(`${name} ${q.id}: parts needs 2 to 6 parts`); continue; }
        const labels = ps.map((p, i) => String(p.label ?? String.fromCharCode(97 + i)));
        if (new Set(labels).size !== labels.length) err(`${name} ${q.id}: two parts have the same label`);
        ps.forEach((p, i) => {
          if (!String(p.prompt ?? '').trim()) err(`${name} ${q.id} part ${labels[i]}: no prompt`);
          if (!String(p.answer ?? '').trim() && !(Array.isArray(p.checklist) && p.checklist.length)) err(`${name} ${q.id} part ${labels[i]}: no strong answer or full-credit checklist for the teacher copy`);
          if (p.points != null && !(Number(p.points) > 0)) err(`${name} ${q.id} part ${labels[i]}: points must be more than 0`);
        });
      }
    }
    const ids = new Set();
    for (const q of qs) {
      const id = q.id || '(no id)';
      if (!q.id) err(`${name}: a question has no id`);
      else if (ids.has(q.id)) err(`${name}: id ${q.id} is used twice`);
      ids.add(q.id);
      if (!TYPES.includes(q.type)) err(`${name} ${id}: type ${JSON.stringify(q.type)} is not one of ${TYPES.join(', ')}`);
      for (const f of ['prompt', 'choices', 'answer', 'accept', 'why', 'figure', 'level', 'skill', 'parts', 'stimulus']) {
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
    if (['short', 'numeric', 'open', 'match'].includes(r.type) && (r.answer === undefined || r.answer === null || r.answer === '') && !r.q.parts) (r.type === 'open' ? warn : err)(`${r.where}: no answer${r.type === 'open' ? ' (a model answer for the teacher copy)' : ''}`);
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
