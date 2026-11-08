# 🤖 Wilco (test-wise bots)

You ask one question: **can a student who doesn't know the content get the right choice by reading the choices?** You
run scripts; you don't judge content (the blind tester does). **The lead runs the scripts directly**; no model session
is needed (g11-history paid $0.15 a run, $0.75 an order, for a session that only ran them). Your bots come from Pet World (`scripts/test-wise-cues.mjs`
copied unchanged to `checks/test-wise-cues.mjs`, the notes bots, and the course bot's rule).

## Inputs
- `pack.json` after the maker (round 1) and after each maker round (round 2, 3).

## Steps
1. `node checks/keys.mjs pack.json --write` — the keys and versions are sound (valid index, no equal choices in text or
   value, accept lists hold no wrong choice, A and B test the same skills and levels, nothing repeated word for word
   across versions or from practice into the test, test about 40% L3). Any error: back to the maker.
2. `node checks/test-wise.mjs pack.json --write` — every cue on every mc question in both versions: length (longest,
   shortest, middle, notLongest), specific, general, overlap, absolute, grammar, oddOne, allAbove, vote, notVote,
   converge, position (posA–posD, posLast), sameLetterAB (the key under the same letter in A and B), learnedCV (a
   trained bot), the memorizer (every page handed back graded), number cues and tricks, and true/false balance.
   Judged per document version, per document and on the whole pack (groups of 8 or more questions).
   **FAIL: any strategy more than 10 points above chance** (Pet World's rule). Add `--pass <mark>` when the teacher
   gives a pass mark: then also within 15 points of it fails.
2a. Reading items (a `readingquiz`, or any document with passages): `node checks/no-passage.mjs pack.json --write`.
   Its bots never see the passage; they read one version's stems and choices together, as a non-reader holds them:
   pairMatch (Part B quotes lined up with Part A choices by shared words), echo (the choice whose words come back in
   the version's other items), quoteEcho (a three-word run printed in another item) and their vote. Same FAIL rule (more
   than 10 points above chance, groups of 8 or more). It runs before the fresh no-passage probe and never replaces it.
2b. Every pack, **before any paid probe**: `node checks/cross-item.mjs pack.json --write` names every item whose key (the
   right choice, or a line a short answer quotes) is printed in another item of the same version: a 3-word key phrase,
   or most of the key's distinctive words. **FAIL: any hit.** The maker changes the other item's stem or wrong choices,
   never the key (owner, Nov 7, 2026, docs/audits/AUDIT-2026-11-07-ela-try-c.md proposal 2: try c's probes got 12 of 14 right answers from
   other items).
3. Apps: `node checks/apps.mjs pack.json` (content, hashed answers and the browser test). Puzzles:
   `node checks/puzzles.mjs pack.json` (grids and exactly one solution). Both must exit 0; a fail is fixed in the pack
   (forms, hints, choices, clues), never by weakening the check.
4. On a fail: `node checks/test-wise.mjs pack.json --items` and send the maker the item lines it prints (L/M/S, the key's
   letter, the bots that pick it). **Wrong choices change, never keys.** Never edit a check or a threshold to pass.
   `--items` **always exits 0**: only the plain run's exit code is a pass (g8-science).
5. Rerun after each maker round until all exit 0. Stop after round 3 and tell the owner. A rerun inside one maker
   round keeps that round's number (`--round N`) and says why in `note` (g7-ela: three runs in round 2).

**Interactive documents** (`format: "interactive"`; docs/KINDS-INTERACTIVE-FORMAT.md): the steps above run on them
unchanged (keys, test-wise, cross-item, no-passage read every document). Also run
`node checks/interactive-format.mjs pack.json` (self-contained page, no answer data in a print page, no plain-text key
in an auto page, every hash verifies against the key) and, before the preview, `--browser` (all right → 100%, all
wrong → 0%, the answer sheet, 375 px). For guided notes it also checks every blank (each accepted form right, typed in
capitals too, a made-up word wrong; in the browser: Check my notes, fix and check again, the printed notes), and for a
review game the class code (it opens every card's answer, a wrong code doesn't; in the browser: played alone and as a
class). A fail is fixed in the pack (forms, `tol`, a key typed into a prompt), never by
loosening the check.

## Shared data sets and one version per student (owner, Nov 8, 2026)
- `checks/cross-item.mjs` also checks every data-set group, however small: no question's key may be another question's
  choice (same text or number) or a number printed in another question's stem.
- A pool (one version per student) is checked by script when it is made (`scripts/versions.mjs`); run the bots on
  version A as usual.

## Output (`pack.json`)
`--write` adds your rounds to `checks.wilco` (`{"check": "keys" | "test-wise", "round", "pass", …, "worst"}`). Tell the
reporter each run's result and the worst strategy before and after (the audit report shows them).

## Known limits (say them in the report when they apply)
- `checks/cross-item.mjs` reads words, not meaning: an item that gives another away in other words passes it (g7-ela2
  try c version A: 0 hits, while the fresh probe got 9 of 10). The fresh no-passage probe still decides.
- The bots read text, not pictures: a picture-only choice is at chance for them.
- They pass content cues: twin wrong choices, a key that's the only one in the source's words. The blind tester
  catches those (Pet World's Pet Fair batch: the bots passed all five of the blind solve's FIX items).
- Small documents are noisy: one question moves an 8-question quiz 12 points. **Too few to judge:** when a document
  has too few mc or number questions for a bot (g4-math: 8 mc, 2 all-number), the bot is "not judged", not "passed";
  say so in the report.
- **Reading without the passage:** `checks/test-wise.mjs` passed quizzes fresh testers answered 20 of 20 (g7-ela) and
  9 of 10 (g7-ela2 A) without the passages. `checks/no-passage.mjs` catches the cross-item part (it fails g7-ela B at
  40% and g7-ela2 B at 38%), but it missed g7-ela2 A, where the probe used general knowledge and "the key sounds
  right": the fresh probe (`agents/blind-ela.md`, mode 1) stays the gate. Both old samples are on
  `checks/no-passage-debt.json`, a known-failing list that can only shrink (`npm run check` fails if a pack on it passes
  or one off it fails); a new pack never joins it.
- **"(paragraph N)" citations** in evidence choices are read as numbers by the number bots (smallest, largest, middle):
  a real but weak cue. The maker spreads the keys' paragraphs; the check stays as it is (g7-ela). Wrong choices
  rewritten to fix a no-passage giveaway tend to set off converge, then learnedCV, then middle: rerun all, every time.
- **Math length bots read the LaTeX source** (`\dfrac{8}{3}` is "longer" than `4`), not what a student sees. The maker
  makes some wrong choices fractions when the key is one. Reading the rendered text (`plainMath`) instead is the
  owner's call (docs/KINDS-MATH.md); never a reason to skip a fail.
- `keys` rows have no chance and no line: report them as passed or not, never as a percentage.

---
**Version 7** (Nov 8, 2026)

## Change log
- v1, Nov 5, 2026: first brief, from Pet World's `docs/FAIRNESS.md` (the rule, the cues, converge counted on printed
  work, learnedXU advisory and not run here) and `WORKSHEETS-LEAD-RECIPE.md` ("Wilco's notes bots, required").
- v2, Nov 5, 2026 (first audit, docs/audits/AUDIT-2026-11-05.md): the lead runs the scripts, no session (g11-history
  $0.75); `checks/apps.mjs` and `checks/puzzles.mjs` (docs/KINDS-APPS.md, KINDS-GAMES.md); `--items` always exits 0
  (g8-science); reruns keep the round (g7-ela); new known limits: too few to judge (g4-math), passage-dependence is the
  ELA gate's (g7-ela), paragraph citations as numbers (g7-ela), LaTeX source length (docs/KINDS-MATH.md), keys rows
  have no chance (g4-math, g7-ela).
- v3, Nov 7, 2026 (ELA audit, docs/audits/AUDIT-2026-11-07-ela.md; owner option 1, Nov 6): `checks/no-passage.mjs`
  for reading items (pairMatch, echo, quoteEcho, vote; Wilco's 10-point rule; a self-test in `npm run check`), because
  the per-question bots passed both ELA samples a non-reader beat (g7-ela 20/20, g7-ela2 A 9/10); the two old samples on
  a shrink-only known-failing list until the remake.
- v4, Nov 7, 2026 (owner decision "D and 1-4", adopting docs/audits/AUDIT-2026-11-07-ela-try-c.md proposal 2): `checks/cross-item.mjs` on
  every pack before any paid probe (a key printed in another item of the version; self-test and a shrink-only known-
  failing list in `npm run check`: g11-history, g7-ela2, g8-science when it came in); its limit (words, not meaning).
- v5, Nov 8, 2026: interactive documents get every check above plus `checks/interactive-format.mjs` (and `--browser`).
- v6, Nov 8, 2026: interactive guided notes and review games: what `checks/interactive-format.mjs` checks on them (notes
  blanks, the class code) and the browser runs (check, fix and recheck; class mode).
- v7, Nov 8, 2026 (owner): data-set groups in `checks/cross-item.mjs`; pools checked by `scripts/versions.mjs`. Changed at the owner's request, not by the auditor.
