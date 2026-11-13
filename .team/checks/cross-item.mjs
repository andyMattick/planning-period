/* 🤖 Wilco's cross-item check, the shared core. Does one item's key show up in another item of the same test?
   From Planning Period (checks/cross-item.mjs, adopted there Nov 7, 2026 after fresh no-passage probes got 7, 8 and 9
   of 10 right and 12 of the 14 right answers in the last round came from another item). The logic is unchanged; only
   the reading of a project's own file format stays in the project.

   crossItemHits(lists, { minKeyed = 4 })
     lists   one list for each test a student holds at once (a document version, a unit test, a worksheet). Each item:
               { where, prompt, choices?: string[], keys: string[] }
             `where` names the item in reports. `keys` is the text that must not leak: for multiple choice the right
             choice; for a written answer the lines quoted in the model answer (quoted()). An item with no keys is
             still read as a place a key could be printed.
     returns { checked, hits: [{ where, other, how, what }] }

   For every key, against every other item of the same list:
     keyPhrase  a run of 3 words of the key, at least 2 of them content words, printed in the other item's prompt or
                choices;
     keyWords   at least 2 of the key's distinctive words, and at least 60% of them, printed in the other item.
                Distinctive: content words longer than 3 letters that are not in the item's own prompt and not common to
                the list (in 3 or more items, or in a quarter or more of them: a passage's names and topic).
   Every hit is a FIX: change the other item (its prompt or wrong choices) or this item's wrong choices, never the key.
   Lists with fewer than minKeyed keyed items are skipped. It reads words, not meaning: a reader still has to look. */
import { words, content } from './test-wise-cues.mjs';

// "[6]" and "(paragraph 6)" citations come off: the number bots read those
export const plain = (s) => String(s ?? '').replace(/\[\d+\]|\((?:paragraph|para\.?|¶)\s*\d+\)/gi, ' ');
export const SKIPW = new Set(['part', 'paragraph', 'quotation', 'passage', 'story', 'article', 'author', 'best', 'support', 'supports', 'answer', 'question', 'which', 'most', 'likely']);
export const cw = (s) => new Set([...content(plain(s))].filter((w) => w.length > 3 && !SKIPW.has(w)));
export const isContent = (w) => w.length > 3 && content(w).size > 0 && !SKIPW.has(w);
export const quoted = (s) => [...String(s ?? '').matchAll(/["“]([^"”]{12,})["”]/g)].map((m) => m[1]);

export function crossItemHits(lists, { minKeyed = 4 } = {}) {
  const hits = []; let checked = 0;
  for (const list of lists) {
    const keyed = list.filter((r) => (r.keys || []).length);
    if (keyed.length < minKeyed) continue;
    const texts = list.map((r) => ({ r, body: [String(r.prompt ?? ''), ...(Array.isArray(r.choices) ? r.choices.map(String) : [])].join(' \n ') }));
    const df = new Map();
    for (const t of texts) for (const w of cw(t.body)) df.set(w, (df.get(w) || 0) + 1);
    const common = (w) => (df.get(w) || 0) >= Math.max(3, Math.ceil(texts.length / 4));
    for (const r of keyed) {
      checked++;
      const own = cw(r.prompt);
      for (const key of r.keys) {
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
  return { checked, hits };
}
