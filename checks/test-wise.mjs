#!/usr/bin/env node
/* 🤖 Wilco's test-wise bots on a pack (agents/wilco.md). Can a student who doesn't know the content get the right
   choice by reading the choices? Ported from Pet World (scripts/notes/notes-test-wise.mjs and the course bot's rule in
   docs/BLIND-REVIEW.md, Nov 5, 2026), with the same cue code (the team's copy, .team/checks/test-wise-cues.mjs).

     node checks/test-wise.mjs <pack.json> [more packs] [--verbose] [--items] [--pass 70] [--write [--round N]] [--json out.json]

   It plays every multiple-choice question of every document, in both versions, as printed (a printed page is never
   reshuffled, so letters count):
     - choice cues (test-wise-cues.mjs): longest, specific, overlap, absolute, grammar, oddOne, allAbove, vote, shortest,
       middle, notLongest, general, notVote, converge (the choice that shares the most with the others; it counts on
       printed work, as on Pet World's note sheets), and frameBreak (the choice that lacks a run of 3 words every other
       choice shares; Pet World, Nov 10, 2026; played here since Nov 13, 2026, when the cue file became the team's)
     - position: posA, posB, posC, posD, posLast (always the same letter)
     - A/B: sameLetterAB, a student who copies a neighbour's letter from the other version (the key under the same letter
       in A and B for the same question)
     - trained: learnedCV, naive Bayes on the other half of the pack's questions (both versions of a question stay in
       the same half, so B never trains on A's twin)
     - memorizer: goes through the pack in order (each document, version A then B) as if every page came back graded,
       remembers every right and wrong choice, and uses them when a choice comes back (a retake, or a test that reuses a
       worksheet's choices)
     - number cues, on questions whose choices are all numbers: smallest, largest, middleValue, round; and the math
       bot's tricks: givenLargest, givenSmallest, last (a number from the question, copied as written), roundGiven, and
       sum, difference, product, quotient (not made when the question shows that operation)
     - true/false: alwaysTrue, alwaysFalse
   A strategy's score is its expected share right (ties split evenly). Chance is a random guesser's on the same questions.

   FAIL rule (Pet World's): any strategy more than 10 points above chance, in any group it is judged on, or (with
   --pass P) within 15 points of the pass mark. Groups: each document version, each document with both versions
   together, and the whole pack, when the group has at least 8 choice questions (fewer is noise: one question moves the
   score by more than 12 points; those questions still count in the pack). Number bots need 3 number questions in the
   group, true/false bots 6, sameLetterAB 6 pairs. Exit 1 on any fail.

   --write adds {check: "test-wise", round, chance, worst, groups, pass} to pack.checks.wilco. --items prints each
   question: the key's length rank (L/M/S), its letter and the bots that pick it, which is what the maker fixes. */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { STRATS, CUES, optFeatures, nbNew, nbAdd, nbPick, fold, pSet, fired, words } from './test-wise-cues.mjs';
import { loadPack, rows, valueOf, versionsOf, nextRound, writeWilco, argsOf } from './pack-lib.mjs';

export const OVER = 10, NEAR_PASS = 15, MIN_SETS = 8, MIN_NUMBER_SETS = 3, MIN_TF = 6, MIN_PAIRS = 6;
const CHOICE_STRATS = [...CUES, 'vote', 'shortest', 'middle', 'notLongest', 'general', 'notVote', 'converge', 'frameBreak'];
const POS = { posA: () => [0], posB: () => [1], posC: (o) => [Math.min(2, o.length - 1)], posD: (o) => [Math.min(3, o.length - 1)], posLast: (o) => [o.length - 1] };

/* ---------- numbers (Pet World's notes bots, scripts/notes/notes-test-wise.mjs) ---------- */
const num = (v) => v[0] / v[1];
function numberOf(text) {
  const s = String(text).replace(/%/g, '');
  const v = valueOf(s); if (v) return num(v);
  const t = s.replace(/[−–]/g, '-').replace(/,(?=\d{3})/g, '').match(/-?\d+ \d+\/\d+|-?\d+\/\d+|-?\d*\.?\d+/g);
  if (!t || t.length !== 1) return null;
  const w = valueOf(t[0].replace(/^-/, '')); return w ? (t[0].startsWith('-') ? -num(w) : num(w)) : null;
}
const TOKEN = /(?<![\w.)])-?\d+ \d+\/\d+|(?<![\w.)])-?\d+\/\d+|(?<![\w.)])-?\d*\.?\d+/g;
const tokens = (s) => String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3})/g, '').match(TOKEN) || [];
const tokValue = (t) => { const w = valueOf(t.replace(/^-/, '')); return w ? (t.startsWith('-') ? -num(w) : num(w)) : null; };
const givens = (prompt) => [...new Set(tokens(prompt).map(tokValue).filter((x) => x !== null))];
const SHOWN = {
  sum: /[\w)]\s*\+\s*[\w($]|\bplus\b|\badd(s|ed|ing)?\b|\bsum\b/i,
  difference: /[\w)]\s*[-−]\s+[\w($]|[\w)]\s+[-−]\s*[\w($]|\bminus\b|\bsubtract|\bdifference\b/i,
  product: /[\w)]\s*[×·*]\s*[\w($]|\btimes\b|\bmultipl|\bproduct\b/i,
  quotient: /[\w)]\s*÷\s*[\w($]|\bdivid|\bquotient\b/i,
  round: /\bround|\bestimat|\bnearest\b|\babout\b/i,
};
const same = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const all = (o) => o.map((_, i) => i);
const matching = (vals, t) => { if (t === null || !Number.isFinite(t)) return all(vals); const k = vals.map((v, i) => (same(v, t) ? i : -1)).filter((i) => i >= 0); return k.length && k.length < vals.length ? k : all(vals); };
const argBest = (vals, f) => { const s = vals.map(f), m = Math.max(...s); return s.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0); };
function roundness(v) {
  if (!Number.isInteger(v)) { const d = (String(Math.abs(v)).split('.')[1] || '').length; return -Math.min(d || 3, 3); }
  if (v === 0) return 1;
  let z = 0; while (z < 3 && v % 10 ** (z + 1) === 0) z++;
  return 1 + z;
}
const leading = (x) => { if (!x) return null; const s = Math.sign(x), m = Math.abs(x), e = Math.floor(Math.log10(m)); return s * Math.round(m / 10 ** e) * 10 ** e; };
function asWritten(opts, prompt, v) {
  if (v === null) return all(opts);
  const seen = tokens(prompt).filter((t) => same(tokValue(t), v));
  const k = opts.map((o, i) => { const t = tokens(o); return t.length === 1 && seen.includes(t[0]) ? i : -1; }).filter((i) => i >= 0);
  return k.length && k.length < opts.length ? k : all(opts);
}
const smallestNonzero = (g) => { const nz = g.filter((x) => x !== 0); return nz.length ? nz.reduce((m, x) => (Math.abs(x) < Math.abs(m) ? x : m)) : null; };
const NUMBER_STRATS = {
  smallest: (vals) => argBest(vals, (v) => -v),
  largest: (vals) => argBest(vals, (v) => v),
  middleValue: (vals) => { const lo = Math.min(...vals), hi = Math.max(...vals); const k = vals.map((v, i) => (v !== lo && v !== hi ? i : -1)).filter((i) => i >= 0); return k.length ? k : all(vals); },
  round: (vals) => argBest(vals, roundness),
  givenLargest: (vals, g, p, o) => asWritten(o, p, g.length ? Math.max(...g) : null),
  givenSmallest: (vals, g, p, o) => asWritten(o, p, g.length ? Math.min(...g) : null),
  last: (vals, g, p, o) => asWritten(o, p, g.length ? g[g.length - 1] : null),
  roundGiven: (vals, g, p) => matching(vals, SHOWN.round.test(p) || !g.length ? null : leading(Math.max(...g))),
  sum: (vals, g, p) => matching(vals, SHOWN.sum.test(p) || g.length < 2 ? null : g.reduce((a, b) => a + b, 0)),
  difference: (vals, g, p) => matching(vals, SHOWN.difference.test(p) || g.length < 2 ? null : Math.max(...g) - Math.min(...g)),
  product: (vals, g, p) => matching(vals, SHOWN.product.test(p) || g.length < 2 || g.length > 4 ? null : g.reduce((a, b) => a * b, 1)),
  quotient: (vals, g, p) => { const s = smallestNonzero(g); return matching(vals, SHOWN.quotient.test(p) || g.length < 2 || s === null || s === Math.max(...g) ? null : Math.max(...g) / s); },
};

/* ---------- play ---------- */
const canon = (s) => words(s).join(' ');
const isTrue = (a) => a === true || a === 'true' || a === 'True';

export function playPack(pack, { pass = null } = {}) {
  const R = rows(pack);
  const mc = R.filter((r) => r.type === 'mc' && Array.isArray(r.choices) && Number.isInteger(r.answer) && r.answer >= 0 && r.answer < r.choices.length)
    .map((r) => ({ ...r, opts: r.choices.map(String), prompt: String(r.prompt ?? ''), foldKey: fold(`${r.docTitle} ${r.id}`) }));
  const tf = R.filter((r) => r.type === 'tf');
  // trained bot: each half learns from the other half
  const NB = [nbNew(), nbNew()];
  for (const x of mc) nbAdd(NB[x.foldKey], optFeatures(x.opts, x.prompt), x.answer);
  // memorizer: in pack order, every page handed back graded
  const right = new Set(), wrong = new Set();
  for (const x of mc) {
    const o = x.opts.map(canon), known = o.map((s, i) => (right.has(s) ? i : -1)).filter((i) => i >= 0);
    let p = known.length ? known : o.map((s, i) => (wrong.has(s) ? -1 : i)).filter((i) => i >= 0);
    if (!p.length) p = all(o);
    o.forEach((s, i) => (i === x.answer ? right : wrong).add(s));
    x.memo = pSet(p, x.answer);
  }
  for (const x of mc) {
    x.p = {};
    for (const s of CHOICE_STRATS) x.p[s] = pSet(STRATS[s](x.opts, x.prompt), x.answer);
    for (const [s, f] of Object.entries(POS)) x.p[s] = pSet(f(x.opts), x.answer);
    x.p.learnedCV = pSet(nbPick(NB[1 - x.foldKey], optFeatures(x.opts, x.prompt)), x.answer);
    x.p.memorizer = x.memo;
    x.vals = x.opts.map(numberOf);
    x.numeric = x.vals.every((v) => v !== null);
    if (x.numeric) { const g = givens(x.prompt); for (const [s, f] of Object.entries(NUMBER_STRATS)) x.p[s] = pSet(f(x.vals, g, x.prompt, x.opts), x.answer); }
  }
  // groups: each document version, each versioned document as a whole, the pack
  const groups = [];
  pack.documents.forEach((doc, d) => {
    const vers = versionsOf(doc), mine = mc.filter((x) => x.d === d), mineTf = tf.filter((x) => x.d === d), title = mine[0]?.docTitle || mineTf[0]?.docTitle || doc.title || `document ${d + 1}`;
    if (vers.length > 1) for (const v of vers) groups.push({ name: `${title} ${v}`, sets: mine.filter((x) => x.ver === v), tf: mineTf.filter((x) => x.ver === v) });
    const pairs = [];
    if (vers.length > 1) for (const a of mine.filter((x) => x.ver === vers[0])) for (const v of vers.slice(1)) { const b = mine.find((x) => x.ver === v && x.id === a.id); if (b) pairs.push([a, b]); }
    groups.push({ name: vers.length > 1 ? `${title} (all versions)` : title, sets: mine, tf: mineTf, pairs });
  });
  groups.push({ name: 'whole pack', sets: mc, tf, pairs: groups.flatMap((g) => g.pairs || []), pack: true });

  const mean = (list, f) => (list.length ? list.reduce((a, x) => a + f(x), 0) / list.length : 0);
  for (const g of groups) {
    g.n = g.sets.length;
    g.counted = g.n >= MIN_SETS;
    g.chance = mean(g.sets, (x) => 1 / x.opts.length);
    g.rows = [];
    const add = (name, group, n, chance, score, counted, keys = []) => g.rows.push({ name, group, n, chance, score, counted, keys });
    if (g.n) {
      for (const s of [...CHOICE_STRATS, ...Object.keys(POS), 'learnedCV', 'memorizer']) {
        const grp = POS[s] ? 'position' : s === 'learnedCV' ? 'trained' : s === 'memorizer' ? 'memory' : 'choice cue';
        add(s, grp, g.n, g.chance, mean(g.sets, (x) => x.p[s]), g.counted, g.sets.filter((x) => x.p[s] >= 0.5).map((x) => x.where));
      }
      const numeric = g.sets.filter((x) => x.numeric);
      if (numeric.length) {
        const nch = mean(numeric, (x) => 1 / x.opts.length);
        for (const s of Object.keys(NUMBER_STRATS)) add(s, ['smallest', 'largest', 'middleValue', 'round'].includes(s) ? 'number cue' : 'number trick', numeric.length, nch, mean(numeric, (x) => x.p[s]), g.counted && numeric.length >= MIN_NUMBER_SETS, numeric.filter((x) => x.p[s] >= 0.5).map((x) => x.where));
      }
    }
    if (g.tf.length) {
      add('alwaysTrue', 'true/false', g.tf.length, 0.5, mean(g.tf, (x) => (isTrue(x.answer) ? 1 : 0)), g.tf.length >= MIN_TF);
      add('alwaysFalse', 'true/false', g.tf.length, 0.5, mean(g.tf, (x) => (isTrue(x.answer) ? 0 : 1)), g.tf.length >= MIN_TF);
    }
    if (g.pairs && g.pairs.length) {
      add('sameLetterAB', 'A/B', g.pairs.length, mean(g.pairs, ([a, b]) => 1 / Math.max(a.opts.length, b.opts.length)), mean(g.pairs, ([a, b]) => (a.answer === b.answer ? 1 : 0)), g.pairs.length >= MIN_PAIRS, g.pairs.filter(([a, b]) => a.answer === b.answer).map(([a]) => a.id));
    }
    for (const r of g.rows) {
      const over = (r.score - r.chance) * 100 > OVER, near = pass !== null && r.score * 100 >= pass - NEAR_PASS;
      r.fail = r.counted && (over || near);
      r.why = over ? `${pct(r.score)}% vs chance ${pct(r.chance)}%` : near ? `${pct(r.score)}% is within ${NEAR_PASS} points of the ${pass}% pass mark` : '';
    }
    g.fails = g.rows.filter((r) => r.fail);
    g.letters = 'ABCDEF'.slice(0, Math.max(0, ...g.sets.map((x) => x.opts.length))).split('').map((L, i) => [L, g.sets.filter((x) => x.answer === i).length]);
  }
  const packGroup = groups[groups.length - 1];
  const worst = [...packGroup.rows].sort((a, b) => (b.score - b.chance) - (a.score - a.chance)).slice(0, 3).map((r) => [r.name, +r.score.toFixed(3)]);
  return { mc, tf, groups, chance: packGroup.chance, worst, pass: groups.every((g) => !g.fails.length) };
}
const pct = (v) => (100 * v).toFixed(0);

function itemsReport(res) {
  for (const x of res.mc) {
    const L = STRATS.longest(x.opts), S = STRATS.shortest(x.opts), rank = L.length === 1 && L[0] === x.answer ? 'L' : S.length === 1 && S[0] === x.answer ? 'S' : 'M';
    const hits = CHOICE_STRATS.filter((s) => { const k = STRATS[s](x.opts, x.prompt); return fired(k, x.opts) && pSet(k, x.answer) >= 0.5; });
    const nh = x.numeric ? Object.keys(NUMBER_STRATS).filter((s) => x.p[s] >= 0.5 && x.p[s] > 1 / x.opts.length) : [];
    console.log(`${rank} ${'ABCDEF'[x.answer]} ${x.where} ${[...hits, ...nh].length ? `[${[...hits, ...nh].join(',')}] ` : ''}| ${x.opts[x.answer]} || ${x.opts.filter((_, i) => i !== x.answer).join(' | ')}`);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { flags, opt, files } = argsOf(process.argv);
  if (!files.length) { console.error('usage: node checks/test-wise.mjs <pack.json> [--verbose] [--items] [--pass 70] [--write [--round N]] [--json out.json]'); process.exit(2); }
  const passMark = opt('pass') ? Number(opt('pass')) : null;
  let bad = 0; const out = [];
  for (const f of files) {
    let pack;
    try { pack = loadPack(f); } catch (e) { console.error(`✗ ${e.message}`); bad++; continue; }
    const res = playPack(pack, { pass: passMark });
    if (flags.has('--items')) { console.log(`== ${f}`); itemsReport(res); continue; }
    if (!res.mc.length && !res.tf.length) { console.log(`✓ test-wise ${f}: no choice questions, nothing to play`); continue; }
    console.log(`${res.pass ? '✓' : '✗'} test-wise ${f}: ${res.mc.length} choice questions${res.tf.length ? `, ${res.tf.length} true/false` : ''} (all versions), chance ${pct(res.chance)}%, worst ${res.worst.map(([n, s]) => `${n} ${pct(s)}%`).join(', ')}`);
    for (const g of res.groups) {
      if (!g.n && !g.tf.length) continue;
      console.log(`  ${g.fails.length ? '✗' : g.counted ? '✓' : '·'} ${g.name}: ${g.n} choice questions, chance ${pct(g.chance)}%, key letters ${g.letters.map(([L, n]) => `${L} ${n}`).join(' · ')}${g.counted ? '' : ` (under ${MIN_SETS}: counted in the whole pack only)`}${g.fails.length ? ` — FAIL: ${g.fails.map((r) => `${r.name} ${r.why}`).join('; ')}` : ''}`);
      if (flags.has('--verbose') || g.fails.length) for (const r of g.rows) {
        if (!flags.has('--verbose') && !r.fail) continue;
        console.log(`      ${r.fail ? '✗' : r.counted ? ' ' : '·'} ${r.group.padEnd(12)} ${r.name.padEnd(13)} ${pct(r.score).padStart(3)}% vs chance ${pct(r.chance)}% over ${r.n}${r.counted ? '' : ' (not counted here)'}${r.fail && r.keys.length ? ` — picks the key on ${r.keys.join(', ')}` : ''}`);
      }
    }
    if (!res.pass) bad++;
    out.push({ file: f, chance: res.chance, worst: res.worst, pass: res.pass, groups: res.groups.map((g) => ({ group: g.name, n: g.n, chance: +g.chance.toFixed(3), counted: g.counted, fails: g.fails.map((r) => [r.name, +r.score.toFixed(3)]) })) });
    if (flags.has('--write')) {
      const round = opt('round') ? Number(opt('round')) : nextRound(pack, 'test-wise');
      writeWilco(f, pack, { check: 'test-wise', round, agent: '🤖 Wilco (test-wise bots)', at: new Date().toISOString(), questions: res.mc.length, chance: +res.chance.toFixed(3), worst: res.worst, groups: out[out.length - 1].groups, pass: res.pass });
      console.log(`  wrote checks.wilco round ${round} (test-wise) to ${f}`);
    }
  }
  if (opt('json')) writeFileSync(opt('json'), JSON.stringify(out, null, 1));
  if (bad) console.log('\nRule: no strategy more than 10 points above chance (Pet World docs/FAIRNESS.md). Fix wrong choices, never keys: node checks/test-wise.mjs <pack> --items shows which bot picks each key.');
  process.exit(bad ? 1 : 0);
}
