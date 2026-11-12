#!/usr/bin/env node
/* 🤖 Wilco's no-passage bots (agents/wilco.md; added by the ELA audit, docs/audits/AUDIT-2026-11-07-ela.md).
   Can a student who never reads the passage get a reading question right from the rest of the quiz? The g7-ela samples:
   fresh probes got 8–10 of 10 right without the passages while checks/test-wise.mjs passed every round, because its bots
   read one question at a time. These bots read what a no-passage student holds: one version's stems and choices, all
   of them, never the passage. They automate the mechanical part of the no-passage probe (agents/blind-ela.md, mode 1);
   they never replace the fresh probe session, which also catches world knowledge and "the key sounds like a teacher".

     node checks/no-passage.mjs <pack.json> [more packs] [--items] [--verbose] [--write [--round N]]
     node checks/no-passage.mjs --self-test

   Reading documents only: a `readingquiz`, a document with `passages`, a section or question citing a `passage`, or an
   older pack with passages typed as question-less "[1] …" sections. Other documents are skipped (exit 0).

   Bots (each scored on every mc row of a version; a bot that can't tell the choices apart is at chance on that row):
     pairMatch  Part A / Part B: the reader lines up Part B's quotes with Part A's choices by shared words and picks the
                pair that matches best (g7-ela2: "the reader matches quotes to choices one-to-one").
     echo       the choice whose words come back most in the version's other items (one item answering another; a
                later stem stating an earlier key; the quiz's quotes retelling the story).
     quoteEcho  a choice holding a three-word run printed in another item of the version (a quote reused as a stem or
                a choice elsewhere).
     readingVote  the three above, voting.
   FAIL rule: Wilco's (checks/test-wise.mjs): any bot more than 10 points above chance in a group of at least 8 mc
   rows (each version; each document with both versions; all reading documents). Exit 1 on any fail.
   numberOnly (short answers; added Nov 12, 2026, g7-ela3 round 1): a reading short answer that asks for a paragraph
     number as its evidence without asking for the words themselves (quote, copy, "the words", "the sentence", "name
     exactly", "exact detail") fails.
     A paragraph number is guessable (1 in 7 on a 7-paragraph passage): g7-ela3's fresh probes earned full credit on
     A q5 and B q5 with general knowledge and a guessed number, and the scripts didn't see it. Fix the question: ask for
     the quoted words too.
   --items prints each row with the bots that pick its key (what the maker changes: wrong choices, never keys). */
import { pathToFileURL } from 'node:url';
import { content, words, pSet, fired } from './test-wise-cues.mjs';
import { loadPack, rows, versionsOf, kindOf, nextRound, writeWilco, argsOf } from './pack-lib.mjs';
import { OVER, MIN_SETS } from './test-wise.mjs';

const BOTS = ['pairMatch', 'echo', 'quoteEcho', 'readingVote'];
const all = (o) => o.map((_, i) => i);
const argmax = (v) => { const m = Math.max(...v); return m <= 0 ? all(v) : v.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0); };
// strip "[6]" / "(paragraph 6)" citations: the number bots in test-wise.mjs already read those
const plain = (s) => String(s ?? '').replace(/\[\d+\]|\((?:paragraph|para\.?|¶)\s*\d+\)/gi, ' ');
const bag = (s) => new Set([...content(plain(s))].filter((w) => w.length > 3));
const shingles = (s) => { const w = words(plain(s)), out = new Set(); for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' ')); return out; };
const isPartA = (r) => /^\s*part\s*a\b/i.test(String(r.prompt ?? ''));
const isPartB = (r) => /^\s*part\s*b\b/i.test(String(r.prompt ?? ''));

export function isReadingDoc(doc) {
  if (['readingquiz'].includes(kindOf(doc)) || doc.item === 'readingquiz') return true;
  if (['reviewapp', 'practicegame'].includes(kindOf(doc))) return false;   // memorize passages are not reading items
  if (doc.passages && (Array.isArray(doc.passages) ? doc.passages.length : Object.keys(doc.passages).length)) return true;
  for (const s of doc.sections || []) {
    if (s.passage) return true;
    if (!(s.questions || []).length && /^\s*\[\d+\]/.test(String(s.directions ?? ''))) return true;   // older packs
    if ((s.questions || []).some((q) => q.passage)) return true;
  }
  return false;
}

export function playReading(pack) {
  const R = rows(pack).filter((r) => isReadingDoc(r.doc));
  const mc = R.filter((r) => r.type === 'mc' && Array.isArray(r.choices) && Number.isInteger(r.answer) && r.answer >= 0 && r.answer < r.choices.length)
    .map((r) => ({ ...r, opts: r.choices.map(String), prompt: String(r.prompt ?? '') }));
  // what one student holds: every row of the same document and version (prompts, choices; never passages)
  const byVer = new Map();
  for (const r of R) { const k = `${r.d}|${r.ver}`; if (!byVer.has(k)) byVer.set(k, []); byVer.get(k).push(r); }
  for (const list of byVer.values()) {
    // pair Part A with the Part B right after it
    const ordered = mc.filter((x) => list.some((r) => r.where === x.where));
    ordered.forEach((x, i) => { const y = ordered[i + 1]; if (isPartA(x) && y && isPartB(y)) { x.partner = y; y.partner = x; } });
    for (const x of ordered) {
      const others = list.filter((r) => r.where !== x.where && r.where !== x.partner?.where);
      const otherBag = new Set(), otherSh = new Set();
      for (const r of others) {
        const texts = [r.prompt, ...(Array.isArray(r.choices) ? r.choices : [])];
        for (const t of texts) { bag(t).forEach((w) => otherBag.add(w)); shingles(t).forEach((s) => otherSh.add(s)); }
      }
      x.picks = {};
      // pairMatch
      if (x.partner) {
        const [a, b] = isPartA(x) ? [x, x.partner] : [x.partner, x];
        const A = a.opts.map(bag), B = b.opts.map(bag);
        const M = A.map((s) => B.map((t) => [...s].filter((w) => t.has(w)).length));
        const max = Math.max(...M.flat());
        if (max > 0) {
          const rowsBest = all(A).filter((i) => Math.max(...M[i]) === max), colsBest = all(B).filter((j) => A.some((_, i) => M[i][j] === max));
          x.picks.pairMatch = x === a ? rowsBest : colsBest;
        } else x.picks.pairMatch = all(x.opts);
      } else x.picks.pairMatch = all(x.opts);
      // echo
      x.picks.echo = argmax(x.opts.map((o) => [...bag(o)].filter((w) => otherBag.has(w)).length));
      // quoteEcho
      const qe = x.opts.map((o, i) => ([...shingles(o)].some((s) => otherSh.has(s)) ? i : -1)).filter((i) => i >= 0);
      x.picks.quoteEcho = qe.length && qe.length < x.opts.length ? qe : all(x.opts);
      // vote
      const score = x.opts.map(() => 0); let any = false;
      for (const s of ['pairMatch', 'echo', 'quoteEcho']) { const k = x.picks[s]; if (!fired(k, x.opts)) continue; any = true; k.forEach((i) => { score[i] += 1 / k.length; }); }
      x.picks.readingVote = any ? argmax(score.map((v) => Math.round(v * 1e6))) : all(x.opts);
      x.p = Object.fromEntries(BOTS.map((s) => [s, pSet(x.picks[s], x.answer)]));
    }
  }
  const groups = [];
  const docs = [...new Set(mc.map((x) => x.d))];
  for (const d of docs) {
    const mine = mc.filter((x) => x.d === d), vers = versionsOf(pack.documents[d]), title = mine[0].docTitle;
    if (vers.length > 1) for (const v of vers) groups.push({ name: `${title} ${v}`, sets: mine.filter((x) => x.ver === v) });
    groups.push({ name: vers.length > 1 ? `${title} (all versions)` : title, sets: mine });
  }
  if (docs.length > 1) groups.push({ name: 'all reading documents', sets: mc });
  const numberOnly = numberOnlyRows(R);
  const mean = (list, f) => (list.length ? list.reduce((a, x) => a + f(x), 0) / list.length : 0);
  for (const g of groups) {
    g.n = g.sets.length; g.counted = g.n >= MIN_SETS; g.chance = mean(g.sets, (x) => 1 / x.opts.length);
    g.rows = BOTS.map((s) => {
      const score = mean(g.sets, (x) => x.p[s]);
      return { name: s, score, fail: g.counted && (score - g.chance) * 100 > OVER, keys: g.sets.filter((x) => x.p[s] >= 0.5).map((x) => x.where) };
    });
    g.fails = g.rows.filter((r) => r.fail);
  }
  const worst = groups.length ? [...groups.flatMap((g) => g.rows.map((r) => ({ ...r, over: r.score - g.chance, group: g.name })))].sort((a, b) => b.over - a.over)[0] : null;
  return { mc, groups, worst, numberOnly, pass: groups.every((g) => !g.fails.length) && !numberOnly.length };
}
// a short answer on a passage whose only asked-for evidence is a paragraph number (see numberOnly above)
const ASKS_NUMBER = /paragraph numbers?|which paragraph|give (?:a|the) paragraph|\[paragraph\]/i;
const ASKS_WORDS = /\bquot(?:e|ing)\b|\bcopy\b|\bthe words\b|\bthe sentence\b|\bthe phrase\b|\bname exactly\b|\bexact detail\b/i;
export function numberOnlyRows(R) {
  return R.filter((r) => r.type === 'short' && ASKS_NUMBER.test(String(r.prompt ?? '')) && !ASKS_WORDS.test(String(r.prompt ?? ''))).map((r) => r.where);
}
const pct = (v) => (100 * v).toFixed(0);

function report(f, res, flags) {
  if (res.numberOnly.length) console.log(`✗ no-passage ${f}: ${res.numberOnly.length} short answer(s) ask for a paragraph number without the words (a guessed number earns the credit): ${res.numberOnly.join('; ')}`);
  if (!res.mc.length) { console.log(`${res.numberOnly.length ? '✗' : '✓'} no-passage ${f}: no reading mc rows to play`); return; }
  console.log(`${res.pass ? '✓' : '✗'} no-passage ${f}: ${res.mc.length} reading mc rows (all versions); worst ${res.worst.name} ${pct(res.worst.score)}% (${res.worst.group}, ${res.worst.over >= 0 ? '+' : ''}${pct(res.worst.over)} points over chance)`);
  for (const g of res.groups) {
    console.log(`  ${g.fails.length ? '✗' : g.counted ? '✓' : '·'} ${g.name}: ${g.n} mc, chance ${pct(g.chance)}%${g.counted ? '' : ` (under ${MIN_SETS}: not judged)`}${g.fails.length ? ` — FAIL: ${g.fails.map((r) => `${r.name} ${pct(r.score)}%`).join('; ')}` : ''}`);
    if (flags.has('--verbose') || g.fails.length) for (const r of g.rows) if (flags.has('--verbose') || r.fail) console.log(`      ${r.fail ? '✗' : ' '} ${r.name.padEnd(12)} ${pct(r.score).padStart(3)}% vs chance ${pct(g.chance)}%${r.fail ? ` — picks the key on ${r.keys.join(', ')}` : ''}`);
  }
}

/* ---------- self-test: a quiz that leaks must fail, one that doesn't must pass ---------- */
function fixture(leaky) {
  const W = 'amber birch cobalt dune ember fjord garnet heron indigo juniper kestrel lagoon marble nectar orchid pewter quartz russet sable tundra umber velvet willow yarrow zephyr alder bramble cinder delta egret fennel glacier hazel iris jasper kelpie larch moss nutmeg ochre pine quill reed saffron thistle'.split(' ');
  let k = 0; const w = () => W[k++ % W.length] + (k > W.length ? Math.floor(k / W.length) : '');
  const phrase = () => `${w()} ${w()} ${w()}`;
  const qs = [];
  for (let n = 1; n <= 10; n++) {
    const pairA = n % 3 === 1 && n < 10, pairB = n % 3 === 2;
    const prompt = { A: `${pairA ? 'Part A: ' : pairB ? 'Part B: Which quotation BEST supports the answer to Part A?' : ''}${pairB ? '' : `Question ${n} about ${phrase()}?`}`, B: `${pairA ? 'Part A: ' : pairB ? 'Part B: Which quotation BEST supports the answer to Part A?' : ''}${pairB ? '' : `Question ${n} about ${phrase()}?`}` };
    const choices = { A: [phrase(), phrase(), phrase(), phrase()].map((c) => (pairB ? `"${c}." [${n}]` : c)), B: [phrase(), phrase(), phrase(), phrase()].map((c) => (pairB ? `"${c}." [${n}]` : c)) };
    const answer = { A: n % 4, B: (n + 1) % 4 };
    qs.push({ id: `q${n}`, level: n % 4 === 0 ? 3 : 2, skill: 'inference', type: 'mc', passage: 'p1', prompt, choices, answer });
  }
  if (leaky) for (const v of ['A', 'B']) {
    qs.forEach((q, i) => {
      const key = q.choices[v][q.answer[v]];
      if (/^Part B/.test(q.prompt[v])) {   // Part B's key quote shares its words with Part A's key
        const a = qs[i - 1], ak = a.choices[v][a.answer[v]].split(' ');
        q.choices[v][q.answer[v]] = `"${ak[0]} and ${ak[1]} ${ak[2]} again." [${i}]`;
      } else if (!/^Part A/.test(q.prompt[v])) {   // a later stem names this key
        const later = qs.find((x, j) => j > i && !/^Part B/.test(x.prompt[v]));
        if (later) later.prompt[v] += ` (Remember: ${key}.)`;
      }
    });
  }
  return { format: 1, id: 'self-test', order: { subject: 'ela' }, documents: [{ item: 'readingquiz', kind: 'readingquiz', title: 'Self-test', versions: ['A', 'B'], passages: [{ id: 'p1', title: 'T', kind: 'fiction', paragraphs: ['x'] }], sections: [{ heading: 'Q', passage: 'p1', questions: qs }] }] };
}
function selfTest() {
  let bad = 0;
  for (const [what, leaky, want] of [['a reading quiz with no cross-item cues', false, true], ['Part B quotes that echo Part A keys and stems that name earlier keys', true, false]]) {
    const res = playReading(fixture(leaky));
    if (res.pass === want) console.log(`✓ ${want ? 'passes' : 'catches'} ${what}`); else { bad++; console.log(`✗ did not ${want ? 'pass' : 'catch'} ${what}: worst ${res.worst?.name} ${pct(res.worst?.score ?? 0)}%`); }
  }
  { const p = fixture(false); p.documents[0].item = 'quiz'; p.documents[0].kind = 'quiz'; delete p.documents[0].passages; delete p.documents[0].sections[0].passage; p.documents[0].sections[0].questions.forEach((q) => delete q.passage);
    const res = playReading(p); if (!res.mc.length) console.log('✓ skips a quiz with no passage'); else { bad++; console.log('✗ played a quiz with no passage'); } }
  { // numberOnly: a paragraph number alone fails; the same question asking for the quoted words passes
    const sa = (prompt) => { const p = fixture(false); p.documents[0].sections[0].questions.push({ id: 'q11', level: 2, skill: 'cause', type: 'short', passage: 'p1', points: 2, prompt: { A: prompt, B: prompt }, answer: { A: 'x', B: 'x' }, accept: ['x'] }); return playReading(p); };
    const r1 = sa('Why did it take so long? Give the reason and the paragraph number that shows it.');
    if (!r1.pass && r1.numberOnly.length === 2) console.log('✓ catches a short answer whose evidence is only a paragraph number'); else { bad++; console.log('✗ missed a short answer whose evidence is only a paragraph number'); }
    const r2 = sa('Why did it take so long? Quote the words that show it and give the paragraph number.');
    if (r2.pass && !r2.numberOnly.length) console.log('✓ passes a short answer that asks for the quoted words too'); else { bad++; console.log('✗ failed a short answer that asks for the quoted words'); }
    const r3 = sa('What did she do earlier? Name exactly what she did and give that paragraph number.');
    if (r3.pass && !r3.numberOnly.length) console.log('✓ passes a short answer that asks for the exact detail, named'); else { bad++; console.log('✗ failed a short answer that asks for the exact detail'); } }
  return bad;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { flags, opt, files } = argsOf(process.argv);
  if (flags.has('--self-test')) process.exit(selfTest() ? 1 : 0);
  if (!files.length) { console.error('usage: node checks/no-passage.mjs <pack.json> [--items] [--verbose] [--write [--round N]] | --self-test'); process.exit(2); }
  let bad = 0;
  for (const f of files) {
    let pack;
    try { pack = loadPack(f); } catch (e) { console.error(`✗ ${e.message}`); bad++; continue; }
    const res = playReading(pack);
    if (flags.has('--items')) { console.log(`== ${f}`); for (const x of res.mc) { const hits = BOTS.filter((s) => fired(x.picks[s], x.opts) && x.p[s] >= 0.5); console.log(`${'ABCDEF'[x.answer]} ${x.where}${x.partner ? (isPartA(x) ? ' (Part A)' : ' (Part B)') : ''} ${hits.length ? `[${hits.join(',')}]` : ''}`); } continue; }
    report(f, res, flags);
    if (!res.pass) bad++;
    if (flags.has('--write') && res.mc.length) {
      const round = opt('round') ? Number(opt('round')) : nextRound(pack, 'no-passage');
      writeWilco(f, pack, { check: 'no-passage', round, agent: '🤖 Wilco (no-passage bots)', at: new Date().toISOString(), questions: res.mc.length, worst: [res.worst.name, +res.worst.score.toFixed(3)], groups: res.groups.map((g) => ({ group: g.name, n: g.n, chance: +g.chance.toFixed(3), counted: g.counted, fails: g.fails.map((r) => [r.name, +r.score.toFixed(3)]) })), pass: res.pass });
      console.log(`  wrote checks.wilco round ${round} (no-passage) to ${f}`);
    }
  }
  if (bad) console.log('\nRule: no bot more than 10 points above chance (Wilco\'s). These bots never see the passage: a key they find is found without reading. Fix wrong choices and stems, never keys; the fresh no-passage probe (agents/blind-ela.md, mode 1) still runs.');
  process.exit(bad ? 1 : 0);
}
