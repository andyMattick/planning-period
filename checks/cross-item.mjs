#!/usr/bin/env node
/* 🤖 Wilco's cross-item check (agents/wilco.md; docs/audits/AUDIT-2026-11-07-ela-try-c.md, proposal 2, adopted by the
   owner on Nov 7, 2026). Does one item's key show up in another item of the same version? g7-ela2 "try c": the fresh
   no-passage probes got 7, 8 and 9 of 10 right, and 12 of the 14 right answers in the last round came from another
   item ("q10 C shows the shoots kept vanishing, so q9 D"). checks/no-passage.mjs scores bots on that; this check names
   every pair of items so the maker can fix them before a paid probe.

     node checks/cross-item.mjs <pack.json> [more packs] [--verbose] [--write [--round N]]
     node checks/cross-item.mjs --self-test

   For every question with a key (mc: the right choice; short and open answers: the passage lines quoted in the model
   answer), in every document and version:
     keyPhrase  a run of 3 words of the key, at least 2 of them content words, printed in another item's stem or
                choices (the same version);
     keyWords   at least 2 of the key's distinctive words, and at least 60% of them, printed in one other item's stem or
                choices. Distinctive: content words longer than 3 letters that are not in the item's own stem and not
                common to the version (in 3 or more items, or in a quarter or more of them: the passage's names and topic).
   Each hit is a FIX for the maker: change the other item (its stem or wrong choices) or this item's wrong choices, never
   the key. FAIL on any hit. Documents with fewer than 4 keyed items in a version are skipped. */
import { pathToFileURL } from 'node:url';
import { crossItemHits, quoted } from '../.team/checks/cross-item.mjs';
import { loadPack, rows, nextRound, writeWilco, argsOf, norm, valueOf, sameValue, pick } from './pack-lib.mjs';

/* Shared data sets (owner, Nov 8, 2026; docs/PACK-FORMAT.md, "Shared data sets"): in a group of questions on one data set,
   no question's key may be printed as another question's choice (the same text, or the same number), and a number key
   of 3 or more characters may not be printed in another question's stem: a student could read one answer off another.
   Every group is checked, however small the document (the general check above needs 4 keyed items). */
const keyOf = (r) => (r.type === 'mc' && Array.isArray(r.choices) && Number.isInteger(r.answer) ? String(r.choices[r.answer] ?? '') : ['numeric', 'short'].includes(r.type) && r.answer != null ? String(r.answer) : null);
export function stimulusHits(pack) {
  const hits = [], groups = new Map();
  for (const r of rows(pack)) {
    const sid = pick(r.q.stimulus, r.ver);
    if (sid == null || sid === '') continue;
    const k = `${r.d}|${r.ver}|${sid}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const list of groups.values()) for (const r of list) {
    const key = keyOf(r); if (!key || !norm(key)) continue;
    const val = (x) => valueOf(String(x ?? '').replace(/\s*%\s*$/, '').replace(/^\$/, ''));   // 44.4% and 44.4 are the same number here
    const kv = val(key);
    for (const o of list) {
      if (o === r) continue;
      (Array.isArray(o.choices) ? o.choices : []).forEach((c, i) => {
        if (norm(c) === norm(key) || (kv && sameValue(kv, val(c)))) hits.push({ where: r.where, other: o.where, how: 'stimulus', what: `its key "${key}" is choice ${'ABCDEF'[i]} of ${o.id} (same data set)` });
      });
      if (kv && norm(key).length >= 3 && ` ${norm(o.prompt)} `.match(new RegExp(`[^0-9.]${norm(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^0-9]`))) hits.push({ where: r.where, other: o.where, how: 'stimulus', what: `its key "${key}" is printed in ${o.id}'s question (same data set)` });
    }
  }
  return hits;
}

function keyText(r) {
  if (r.type === 'mc' && Array.isArray(r.choices) && Number.isInteger(r.answer)) return [String(r.choices[r.answer] ?? '')];
  if (r.type === 'short' || r.type === 'open') return quoted(r.answer);
  return [];
}

/* The general check is the shared team's (.team/checks/cross-item.mjs, moved there unchanged Nov 13, 2026): this
   function turns a pack into the plain items it reads, one list for each document version. */
export function crossItem(pack) {
  const groups = new Map();
  for (const r of rows(pack)) { const k = `${r.d}|${r.ver}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push({ where: r.where, prompt: r.prompt, choices: r.choices, keys: keyText(r) }); }
  const { checked, hits } = crossItemHits([...groups.values()]);
  hits.push(...stimulusHits(pack));
  return { checked: checked || (hits.length ? 1 : rows(pack).filter((r) => r.q.stimulus != null).length), hits, pass: hits.length === 0 };
}

function report(f, res, flags) {
  if (!res.checked) { console.log(`✓ cross-item ${f}: no version with 4 or more keyed items, nothing to check`); return; }
  console.log(`${res.pass ? '✓' : '✗'} cross-item ${f}: ${res.checked} keyed items, ${res.hits.length} hit(s)`);
  const show = flags.has('--verbose') ? res.hits : res.hits.slice(0, 40);
  for (const h of show) console.log(`  ✗ ${h.where}: its key is printed in ${h.other.split(' ').slice(-2).join(' ')} (${h.how}: ${h.what})`);
  if (show.length < res.hits.length) console.log(`  … ${res.hits.length - show.length} more (--verbose)`);
}

/* ---------- self-test: a version whose items print each other's keys must fail; a clean one must pass ---------- */
function fixture(leaky) {
  const W = 'amber birch cobalt dune ember fjord garnet heron indigo juniper kestrel lagoon marble nectar orchid pewter quartz russet sable tundra umber velvet willow yarrow zephyr alder bramble cinder delta egret fennel glacier hazel iris jasper kelpie larch moss nutmeg ochre pine quill reed saffron thistle'.split(' ');
  let k = 0; const w = () => W[k++ % W.length] + (k > W.length ? 'x'.repeat(Math.floor(k / W.length)) : '');
  const phrase = () => `${w()} ${w()} ${w()}`;
  const qs = [];
  for (let n = 1; n <= 8; n++) qs.push({ id: `q${n}`, level: 2, skill: 'inference', type: 'mc', passage: 'p1',
    prompt: { A: `Question ${n}: what about ${phrase()}?`, B: `Question ${n}: what about ${phrase()}?` },
    choices: { A: [phrase(), phrase(), phrase(), phrase()], B: [phrase(), phrase(), phrase(), phrase()] }, answer: { A: n % 4, B: (n + 1) % 4 } });
  qs.push({ id: 'q9', level: 2, skill: 'cite', type: 'short', passage: 'p1', prompt: { A: `Quote a line about ${phrase()}.`, B: `Quote a line about ${phrase()}.` },
    answer: { A: `It says "${phrase()} ${phrase()}" [2]`, B: `It says "${phrase()} ${phrase()}" [3]` } });
  if (leaky) {
    qs[5].choices.A[(qs[5].answer.A + 1) % 4] = qs[1].choices.A[qs[1].answer.A];             // a wrong choice repeats another key
    qs[6].prompt.A += ` (${qs[2].choices.A[qs[2].answer.A].split(' ').slice(0, 2).join(' and ')} matter here.)`;   // a stem names a key's words
    const q = quoted(qs[8].answer.B)[0]; qs[3].choices.B[(qs[3].answer.B + 2) % 4] = `"${q}" [3]`;                  // a short answer's line printed as a choice
  }
  return { format: 1, id: 'self-test', order: { subject: 'ela' }, documents: [{ item: 'readingquiz', kind: 'readingquiz', title: 'Self-test', versions: ['A', 'B'], passages: [{ id: 'p1', title: 'T', kind: 'fiction', paragraphs: ['x'] }], sections: [{ heading: 'Q', passage: 'p1', questions: qs }] }] };
}
function selfTest() {
  let bad = 0;
  const clean = crossItem(fixture(false));
  if (clean.pass) console.log('✓ passes a version whose items never print each other\'s keys'); else { bad++; console.log(`✗ flagged a clean version: ${JSON.stringify(clean.hits[0])}`); }
  const leak = crossItem(fixture(true));
  const want = [['keyPhrase', 'A q2', 'A q6'], ['keyWords', 'A q3', 'A q7'], ['keyPhrase', 'B q9', 'B q4']];
  for (const [how, from, to] of want) {
    if (leak.hits.some((h) => h.how === how && h.where.endsWith(from) && h.other.endsWith(to))) console.log(`✓ catches ${how}: ${from}'s key in ${to}`);
    else { bad++; console.log(`✗ missed ${how}: ${from}'s key in ${to} (${JSON.stringify(leak.hits)})`); }
  }
  // a data-set group: q2's key printed as a choice of q3 (same data set) is caught; the clean group passes
  const grp = (leak) => ({ format: 1, id: 'st', order: { subject: 'math' }, documents: [{ item: 'quiz', title: 'Data', stimuli: [{ id: 's1', intro: 'x', table: { rows: [['a', 1]] } }], sections: [{ questions: [
    { id: 'q1', type: 'mc', stimulus: 's1', prompt: 'What percent of grade 9 walk?', choices: ['20%', '10%', '55.6%', '44%'], answer: 0 },
    { id: 'q2', type: 'numeric', stimulus: 's1', prompt: 'What percent of walkers are in grade 12?', answer: '44.4' },
    { id: 'q3', type: 'mc', stimulus: 's1', prompt: 'Which is closest?', choices: ['12%', leak ? '44.4%' : '30%', '61%', '8%'], answer: 0 }] }] }] });
  if (stimulusHits(grp(false)).length) { bad++; console.log('✗ flagged a clean data-set group'); } else console.log('✓ passes a data-set group whose items never show each other\'s keys');
  if (stimulusHits(grp(true)).some((h) => h.where.endsWith('q2') && h.other.endsWith('q3'))) console.log('✓ catches stimulus: q2\'s key as a choice of q3 in the same data set'); else { bad++; console.log('✗ missed q2\'s key as a choice of q3 (same data set)'); }
  return bad;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { flags, opt, files } = argsOf(process.argv);
  if (flags.has('--self-test')) process.exit(selfTest() ? 1 : 0);
  if (!files.length) { console.error('usage: node checks/cross-item.mjs <pack.json> [--verbose] [--write [--round N]] | --self-test'); process.exit(2); }
  let bad = 0;
  for (const f of files) {
    let pack;
    try { pack = loadPack(f); } catch (e) { console.error(`✗ ${e.message}`); bad++; continue; }
    const res = crossItem(pack);
    report(f, res, flags);
    if (!res.pass) bad++;
    if (flags.has('--write') && res.checked) {
      const round = opt('round') ? Number(opt('round')) : nextRound(pack, 'cross-item');
      writeWilco(f, pack, { check: 'cross-item', round, agent: '🤖 Wilco (cross-item check)', at: new Date().toISOString(), questions: res.checked, hits: res.hits, pass: res.pass });
      console.log(`  wrote checks.wilco round ${round} (cross-item) to ${f}`);
    }
  }
  if (bad) console.log('\nRule: no item\'s key (its phrase, or most of its distinctive words) printed in another item of the same version. Change the other item\'s stem or wrong choices, never a key; then the fresh no-passage probe runs.');
  process.exit(bad ? 1 : 0);
}
