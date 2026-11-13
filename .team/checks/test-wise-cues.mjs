/* The team's shared copy of Wilco's cue code. Taken from Pet World (scripts/test-wise-cues.mjs, commit e22695d,
   Nov 12, 2026), which was the newest copy: it has inPassage and frameBreak, which the Planning Period copy of Nov 5
   lacked. The logic below is unchanged. Projects copy this file; they never edit their copy (scripts/sync-check.mjs).
   A new cue is added here, with a case in scripts/check.mjs, and reaches every project at the weekly sync. */
/* Test-wise cues, shared by scripts/test-wise-bot.mjs (the full bot) and scripts/check-fairness.mjs (the fast gate and the
   writer's --draft helper; docs/FAIRNESS.md). Pure functions: a choice list (and the stem) in, the choices a cue would
   pick out. Moved here unchanged from test-wise-bot.mjs on Oct 31, 2026, so both scripts judge items the same way. */
/* ---------- text features ---------- */
const STOP = new Set('a an the and or but so of to in on at by for with from as is are was were be been being it its this that these those he she they we you i his her their our your my me him them us what which who whom whose when where why how do does did has have had not no can could will would should may might must than then there here into onto about over under after before because if while also just very more most some any each one two three four five six seven eight nine ten all both only same other others such up out off'.split(' '));
const stem = w => w.replace(/(ing|ed|es|s|ly)$/, '');
const words = s => String(s).toLowerCase().replace(/[’']/g, "'").match(/[a-z0-9']+/g) || [];
const content = s => new Set(words(s).filter(w => !STOP.has(w) && w.length > 2).map(stem));
const ABS = /\b(always|never|all|none|only|every|everyone|everything|nothing|no one|nobody|cannot|can't|must|completely|entirely|impossible|any)\b/i;
const NEG = /\b(not|no|never|none|nothing|without|isn't|aren't|doesn't|don't|can't|cannot|won't|wasn't|weren't|didn't|neither|nor)\b|n't\b/i;
const FEATURES = {
  negative: s => NEG.test(s),
  fraction: s => /\d+\s*\/\s*\d+|%|\bpercent\b|\bhalf\b|\bquarter\b/i.test(s),
  question: s => /\?\s*["”’]?\s*$/.test(s),
  fullSentence: s => /^["“]?[A-Z]/.test(s) && /[.!?]["”’]?\s*$/.test(s) && words(s).length >= 4,
  number: s => /\d/.test(s),
  units: s => /\d\s*(%|cm|mm|km|m|kg|g|mg|ml|l|hours?|days?|years?|weeks?|minutes?|seconds?|degrees?|°)\b/i.test(s),
  hedge: s => /\b(usually|often|can|may|might|some|most|sometimes|likely|about|generally)\b/i.test(s),
  colonOrDash: s => /[:;—–]/.test(s),
  comma: s => /,/.test(s),
  quoted: s => /["“”]/.test(s),
  parenthesis: s => /[()]/.test(s),
  because: s => /\b(because|since|so that|which means)\b/i.test(s)
};
const ALL_ABOVE = /\b(all|both) of (the above|these|them|those)\b|^(both|all)\b|\ball three\b/i;

/* ---------- strategies: options + stem -> the set of choices it would pick from (indices) ---------- */
const all = opts => opts.map((_, i) => i);
const argmax = (opts, f) => { const v = opts.map(f), m = Math.max(...v); return v.map((x, i) => (x === m ? i : -1)).filter(i => i >= 0); };
const fired = (set, opts) => set.length > 0 && set.length < opts.length;
function stemGrammar(prompt, opts){
  const p = String(prompt).replace(/\s+/g, ' ').trim();
  const blank = /(\b\w+)\s*_{2,}/.exec(p) || /(\b\w+)\s*$/.exec(p.replace(/[.?:…]+$/, ''));
  const before = blank ? blank[1].toLowerCase() : '';
  const first = o => (words(o)[0] || '');
  if (before === 'an') { const k = opts.map((o, i) => (/^[aeiou]/i.test(first(o)) ? i : -1)).filter(i => i >= 0); if (fired(k, opts)) return k; }
  if (before === 'a') { const k = opts.map((o, i) => (!/^[aeiou]/i.test(first(o)) ? i : -1)).filter(i => i >= 0); if (fired(k, opts)) return k; }
  if (/^(are|were|these|those|two|three|several|many|both)$/.test(before)) { const k = opts.map((o, i) => (/s\b/.test(first(o)) || /^(\w+s)\b/.test(first(o)) ? i : -1)).filter(i => i >= 0); if (fired(k, opts)) return k; }
  if (/^(is|was|this|that|each|every|one)$/.test(before)) { const k = opts.map((o, i) => (!/^\w+s$/.test(first(o)) || /ss$/.test(first(o)) ? i : -1)).filter(i => i >= 0); if (fired(k, opts)) return k; }
  if (/\b\w+ed\b/.test(p) && opts.filter(o => /^\w+ed\b/i.test(o)).length === 1 && opts.length >= 3 && opts.every(o => words(o).length <= 4)) return opts.map((o, i) => (/^\w+ed\b/i.test(o) ? i : -1)).filter(i => i >= 0);
  return all(opts);
}
function oddOne(opts){
  if (opts.length < 3) return all(opts);
  const c = new Set();
  for (const f of Object.values(FEATURES)) {
    const has = opts.map(f), n = has.filter(Boolean).length;
    if (n === 1) c.add(has.indexOf(true));
    if (n === opts.length - 1) c.add(has.indexOf(false));
  }
  return c.size ? [...c] : all(opts);
}
const STRATS = {
  random: (o) => all(o),
  posA: (o) => [0],
  longest: (o) => argmax(o, s => String(s).length),
  specific: (o) => argmax(o, s => words(s).length + 2 * (String(s).match(/\d+(\.\d+)?/g) || []).length),
  overlap: (o, prompt) => { const pw = content(prompt), v = o.map(s => [...content(s)].filter(w => pw.has(w)).length); return Math.max(...v) === 0 ? all(o) : argmax(o, (_, i) => v[i]); },
  absolute: (o) => { const k = o.map((s, i) => (ABS.test(s) ? -1 : i)).filter(i => i >= 0); return k.length ? k : all(o); },
  grammar: (o, prompt) => stemGrammar(prompt, o),
  oddOne: (o) => oddOne(o),
  allAbove: (o) => { const k = o.map((s, i) => (ALL_ABOVE.test(s) ? i : -1)).filter(i => i >= 0); return k.length ? k : all(o); }
};
const CUES = ['longest', 'specific', 'overlap', 'absolute', 'grammar', 'oddOne', 'allAbove'];
STRATS.vote = (o, prompt) => {
  const score = o.map(() => 0); let any = false;
  for (const c of CUES) { const s = STRATS[c](o, prompt); if (!fired(s, o)) continue; any = true; s.forEach(i => { score[i] += 1 / s.length; }); }
  return any ? argmax(o, (_, i) => score[i]) : all(o);
};
/* anti-cues: a bank written to keep the key from being the longest gives the opposite cue away */
STRATS.shortest = (o) => argmax(o, s => -String(s).length);
/* the broadest choice: the least detailed one (fewest words and numbers); a main-idea or definition key written as the
   general statement over its details gives this away (Unit 11 blind solve, J1; audit R8, Nov 1, 2026) */
STRATS.general = (o) => argmax(o, s => -(words(s).length + 2 * (String(s).match(/\d+(\.\d+)?/g) || []).length));
STRATS.notLongest = (o) => { const L = STRATS.longest(o); const k = all(o).filter(i => !L.includes(i)); return k.length ? k : all(o); };
STRATS.middle = (o) => { const L = STRATS.longest(o), S = STRATS.shortest(o); const k = all(o).filter(i => !(L.length === 1 && L[0] === i) && !(S.length === 1 && S[0] === i)); return k.length ? k : all(o); };
/* convergence: the choice that shares the most with the other choices (character bigrams). Wrong choices each made one
   change from the key leave the key in the centre (Potion Lab note sheets, Build 1: 65% of sets, chance 33%; Nov 4, 2026).
   Not in CUES, so vote and the course bots are unchanged; the notes bots (scripts/notes/notes-test-wise.mjs) play it. */
const bigrams = s => { const t = String(s).toLowerCase().replace(/\s+/g, ' ').trim(), m = new Map(); for (let i = 0; i < t.length - 1; i++) { const b = t.slice(i, i + 2); m.set(b, (m.get(b) || 0) + 1); } return m; };
const dice = (a, b) => { let n = 0, A = 0, B = 0; for (const v of a.values()) A += v; for (const v of b.values()) B += v; for (const [k, v] of a) n += Math.min(v, b.get(k) || 0); return A + B ? 2 * n / (A + B) : 0; };
STRATS.converge = (o) => { const g = o.map(bigrams), sim = g.map((x, i) => g.reduce((a, y, j) => a + (i === j ? 0 : dice(x, y)), 0)); return argmax(o, (_, i) => Math.round(sim[i] * 1e6)); };
/* inPassage (blind solve, Nov 9, 2026: English 12 "Which line from 'The Broken Pot'…": the three wrong lines had been
   reworded, so the key was the only choice found word for word in the story): for a question shown with a passage, the
   choices that appear in the passage word for word (ignoring case, quote marks and punctuation; at least 3 words).
   Fires only when some choices are in the passage and some are not. Not in CUES, so vote and the learned bots are unchanged. */
const quoteNorm = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”"]/g, ' ').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const inPassage = (o, passage) => { if (!passage) return all(o); const P = ` ${quoteNorm(passage)} `; const k = o.map((s, i) => { const n = quoteNorm(s); return n.split(' ').length >= 3 && P.includes(` ${n} `) ? i : -1; }).filter(i => i >= 0); return fired(k, o) ? k : all(o); };
STRATS.inPassage = (o, prompt, id, passage) => inPassage(o, passage);
/* frameBreak (blind solves, Nov 10, 2026, worksheet batch E2: Style Library L1 p6, three choices said "in the words …" and
   the key didn't; Storybook Library L1 c2, both wrong choices opened "Nora wants to play piano, but" and the key said
   "quit"): the choice that lacks a run of 3 words that every other choice shares. A student drops the shared frame's odd
   one out without knowing the lesson. Fires only on sets of 3+ choices when some, not all, choices qualify. Not in CUES,
   so vote and the course bots are unchanged; the notes bots (scripts/notes/notes-test-wise.mjs) play it. */
const trigrams = s => { const w = words(s), t = new Set(); for (let i = 0; i + 2 < w.length; i++) t.add(w.slice(i, i + 3).join(' ')); return t; };
STRATS.frameBreak = (o) => { if (o.length < 3) return all(o); const t = o.map(trigrams); const k = all(o).filter(i => { const others = t.filter((_, j) => j !== i); return [...others[0]].some(g => others.every(x => x.has(g)) && !t[i].has(g)); }); return fired(k, o) ? k : all(o); };
STRATS.notVote = (o, prompt) => { const v = STRATS.vote(o, prompt); if (!fired(v, o)) return all(o); const k = all(o).filter(i => !v.includes(i)); return k.length ? k : all(o); };
/* learned bots: naive Bayes over choice features, trained on items they are NOT scored on */
function optFeatures(o, prompt){
  const len = o.map(s => String(s).length), mean = len.reduce((a, b) => a + b, 0) / o.length;
  const sets = { longest: STRATS.longest(o), shortest: STRATS.shortest(o), specific: STRATS.specific(o), overlap: STRATS.overlap(o, prompt), grammar: STRATS.grammar(o, prompt), odd: STRATS.oddOne(o), vote: STRATS.vote(o, prompt) };
  const pw = content(prompt);
  return o.map((s, i) => ({
    longest: sets.longest.length === 1 && sets.longest[0] === i, shortest: sets.shortest.length === 1 && sets.shortest[0] === i, aboveMean: len[i] > mean,
    specific: fired(sets.specific, o) && sets.specific.includes(i), overlap: fired(sets.overlap, o) && sets.overlap.includes(i), zeroOverlap: [...content(s)].every(w => !pw.has(w)),
    absolute: ABS.test(s), negative: NEG.test(s), hedge: FEATURES.hedge(s), number: FEATURES.number(s), sentence: FEATURES.fullSentence(s), because: FEATURES.because(s),
    grammarOK: fired(sets.grammar, o) && sets.grammar.includes(i), odd: fired(sets.odd, o) && sets.odd.includes(i), vote: fired(sets.vote, o) && sets.vote.includes(i), allAbove: ALL_ABOVE.test(s)
  }));
}
const nbNew = () => ({ c: {}, w: {}, nc: 0, nw: 0 });
function nbAdd(m, feats, answer){ feats.forEach((f, i) => { const r = i === answer, t = r ? m.c : m.w; r ? m.nc++ : m.nw++; for (const [k, v] of Object.entries(f)) { const key = `${k}=${v}`; t[key] = (t[key] || 0) + 1; } }); }
function nbMerge(ms){ const m = nbNew(); for (const x of ms) { m.nc += x.nc; m.nw += x.nw; for (const k in x.c) m.c[k] = (m.c[k] || 0) + x.c[k]; for (const k in x.w) m.w[k] = (m.w[k] || 0) + x.w[k]; } return m; }
function nbPick(m, feats){ if (!m || !m.nc) return feats.map((_, i) => i); const sc = feats.map(f => Object.entries(f).reduce((a, [k, v]) => { const key = `${k}=${v}`; return a + Math.log(((m.c[key] || 0) + 1) / (m.nc + 2)) - Math.log(((m.w[key] || 0) + 1) / (m.nw + 2)); }, 0)); const mx = Math.max(...sc); return sc.map((x, i) => (Math.abs(x - mx) < 1e-9 ? i : -1)).filter(i => i >= 0); }
const fold = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 2; };
const pSet = (set, answer) => (set.includes(answer) ? 1 / set.length : 0);
export { quoteNorm, inPassage, STOP, stem, words, content, ABS, NEG, FEATURES, ALL_ABOVE, all, argmax, fired, stemGrammar, oddOne, STRATS, CUES, optFeatures, nbNew, nbAdd, nbMerge, nbPick, fold, pSet };
