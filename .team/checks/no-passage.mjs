/* 🤖 Wilco's no-passage bots, the shared core. Can a student who never reads the passage get a reading question right
   from the rest of the test? From Planning Period (checks/no-passage.mjs, added there by its ELA audit of Nov 7, 2026:
   fresh probes got 8–10 of 10 right without the passages while the per-question bots passed every round, because those
   read one question at a time). These bots read what a no-passage student holds: one test's prompts and choices, all
   of them, never the passage. The logic is unchanged; reading a project's own file format stays in the project.

   They automate the mechanical part of the no-passage probe. They never replace the fresh reader, who also catches
   world knowledge and "the key sounds like a teacher".

   readingPicks(list)
     list    every item of one test a student holds at once, in order. Each item: { where, prompt, choices?: string[] }.
             A multiple-choice item to be played also has `opts` (its choices as strings) and an integer `answer`.
     effect  each played item gets `picks` (bot → the choices it picks), `p` (bot → its chance of the key) and, for a
             Part A / Part B pair, `partner`. Returns the played items.
   Bots (a bot that can't tell the choices apart is at chance on that item):
     pairMatch    Part A / Part B: lines up Part B's quotes with Part A's choices by shared words and picks the pair
                  that matches best.
     echo         the choice whose words come back most in the test's other items.
     quoteEcho    a choice holding a three-word run printed in another item.
     readingVote  the three above, voting.
   judge(sets, { over = 10, minSets = 8 })  → { n, counted, chance, rows: [{ name, score, fail, keys }], fails }
     Wilco's line: a bot fails a group of at least minSets played items when it scores more than `over` points above
     chance. Fewer items are not judged. The line is the owner's.
   numberOnly(items)  → the `where` of each short answer on a passage that asks for a paragraph number as its evidence
     without asking for the words (quote, copy, "the words", "the sentence", "name exactly", "exact detail"). A
     paragraph number is guessable (1 in 7 on a 7-paragraph passage). */
import { content, words, pSet, fired } from './test-wise-cues.mjs';

export const BOTS = ['pairMatch', 'echo', 'quoteEcho', 'readingVote'];
const all = (o) => o.map((_, i) => i);
const argmax = (v) => { const m = Math.max(...v); return m <= 0 ? all(v) : v.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0); };
const plain = (s) => String(s ?? '').replace(/\[\d+\]|\((?:paragraph|para\.?|¶)\s*\d+\)/gi, ' ');
const bag = (s) => new Set([...content(plain(s))].filter((w) => w.length > 3));
const shingles = (s) => { const w = words(plain(s)), out = new Set(); for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' ')); return out; };
export const isPartA = (r) => /^\s*part\s*a\b/i.test(String(r.prompt ?? ''));
export const isPartB = (r) => /^\s*part\s*b\b/i.test(String(r.prompt ?? ''));

export function readingPicks(list) {
  const ordered = list.filter((x) => Array.isArray(x.opts) && Number.isInteger(x.answer));
  ordered.forEach((x, i) => { const y = ordered[i + 1]; if (isPartA(x) && y && isPartB(y)) { x.partner = y; y.partner = x; } });
  for (const x of ordered) {
    const others = list.filter((r) => r.where !== x.where && r.where !== x.partner?.where);
    const otherBag = new Set(), otherSh = new Set();
    for (const r of others) {
      const texts = [r.prompt, ...(Array.isArray(r.choices) ? r.choices : [])];
      for (const t of texts) { bag(t).forEach((w) => otherBag.add(w)); shingles(t).forEach((s) => otherSh.add(s)); }
    }
    x.picks = {};
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
    x.picks.echo = argmax(x.opts.map((o) => [...bag(o)].filter((w) => otherBag.has(w)).length));
    const qe = x.opts.map((o, i) => ([...shingles(o)].some((s) => otherSh.has(s)) ? i : -1)).filter((i) => i >= 0);
    x.picks.quoteEcho = qe.length && qe.length < x.opts.length ? qe : all(x.opts);
    const score = x.opts.map(() => 0); let any = false;
    for (const s of ['pairMatch', 'echo', 'quoteEcho']) { const k = x.picks[s]; if (!fired(k, x.opts)) continue; any = true; k.forEach((i) => { score[i] += 1 / k.length; }); }
    x.picks.readingVote = any ? argmax(score.map((v) => Math.round(v * 1e6))) : all(x.opts);
    x.p = Object.fromEntries(BOTS.map((s) => [s, pSet(x.picks[s], x.answer)]));
  }
  return ordered;
}

const mean = (list, f) => (list.length ? list.reduce((a, x) => a + f(x), 0) / list.length : 0);
export function judge(sets, { over = 10, minSets = 8 } = {}) {
  const n = sets.length, counted = n >= minSets, chance = mean(sets, (x) => 1 / x.opts.length);
  const rows = BOTS.map((s) => {
    const score = mean(sets, (x) => x.p[s]);
    return { name: s, score, fail: counted && (score - chance) * 100 > over, keys: sets.filter((x) => x.p[s] >= 0.5).map((x) => x.where) };
  });
  return { n, counted, chance, rows, fails: rows.filter((r) => r.fail) };
}

const ASKS_NUMBER = /paragraph numbers?|which paragraph|give (?:a|the) paragraph|\[paragraph\]/i;
const ASKS_WORDS = /\bquot(?:e|ing)\b|\bcopy\b|\bthe words\b|\bthe sentence\b|\bthe phrase\b|\bname exactly\b|\bexact detail\b/i;
export function numberOnly(items) {
  return items.filter((r) => r.type === 'short' && ASKS_NUMBER.test(String(r.prompt ?? '')) && !ASKS_WORDS.test(String(r.prompt ?? ''))).map((r) => r.where);
}
