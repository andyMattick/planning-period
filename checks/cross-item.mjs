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
import { words, content } from './test-wise-cues.mjs';
import { loadPack, rows, nextRound, writeWilco, argsOf } from './pack-lib.mjs';

const plain = (s) => String(s ?? '').replace(/\[\d+\]|\((?:paragraph|para\.?|¶)\s*\d+\)/gi, ' ');
const SKIPW = new Set(['part', 'paragraph', 'quotation', 'passage', 'story', 'article', 'author', 'best', 'support', 'supports', 'answer', 'question', 'which', 'most', 'likely']);
const cw = (s) => new Set([...content(plain(s))].filter((w) => w.length > 3 && !SKIPW.has(w)));
const isContent = (w) => w.length > 3 && content(w).size > 0 && !SKIPW.has(w);
const quoted = (s) => [...String(s ?? '').matchAll(/["“]([^"”]{12,})["”]/g)].map((m) => m[1]);

function keyText(r) {
  if (r.type === 'mc' && Array.isArray(r.choices) && Number.isInteger(r.answer)) return [String(r.choices[r.answer] ?? '')];
  if (r.type === 'short' || r.type === 'open') return quoted(r.answer);
  return [];
}

export function crossItem(pack) {
  const all = rows(pack);
  const groups = new Map();
  for (const r of all) { const k = `${r.d}|${r.ver}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const hits = []; let checked = 0;
  for (const list of groups.values()) {
    const keyed = list.filter((r) => keyText(r).length);
    if (keyed.length < 4) continue;
    const texts = list.map((r) => ({ r, stem: String(r.prompt ?? ''), body: [String(r.prompt ?? ''), ...(Array.isArray(r.choices) ? r.choices.map(String) : [])].join(' \n ') }));
    const df = new Map();
    for (const t of texts) for (const w of cw(t.body)) df.set(w, (df.get(w) || 0) + 1);
    const common = (w) => (df.get(w) || 0) >= Math.max(3, Math.ceil(texts.length / 4));
    for (const r of keyed) {
      checked++;
      const own = cw(r.prompt);
      for (const key of keyText(r)) {
        const kw = words(plain(key));
        const runs = [];
        for (let i = 0; i + 2 < kw.length; i++) { const run = kw.slice(i, i + 3); if (run.filter(isContent).length >= 2) runs.push(run.join(' ')); }
        const dist = [...cw(key)].filter((w) => !own.has(w) && !common(w));
        for (const t of texts) {
          if (t.r === r) continue;
          const flat = ` ${words(plain(t.body)).join(' ')} `;
          const run = runs.find((x) => flat.includes(` ${x} `));
          const bodyW = cw(t.body), shared = dist.filter((w) => bodyW.has(w));
          if (run) hits.push({ where: r.where, other: t.r.where, how: 'keyPhrase', what: `"${run}"` });
          else if (shared.length >= 2 && shared.length / dist.length >= 0.6) hits.push({ where: r.where, other: t.r.where, how: 'keyWords', what: shared.join(', ') });
        }
      }
    }
  }
  return { checked, hits, pass: hits.length === 0 };
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
