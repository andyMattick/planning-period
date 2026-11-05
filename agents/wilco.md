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
3. Apps: `node checks/apps.mjs pack.json` (content, hashed answers and the browser test). Puzzles:
   `node checks/puzzles.mjs pack.json` (grids and exactly one solution). Both must exit 0; a fail is fixed in the pack
   (forms, hints, choices, clues), never by weakening the check.
4. On a fail: `node checks/test-wise.mjs pack.json --items` and send the maker the item lines it prints (L/M/S, the key's
   letter, the bots that pick it). **Wrong choices change, never keys.** Never edit a check or a threshold to pass.
   `--items` **always exits 0**: only the plain run's exit code is a pass (g8-science).
5. Rerun after each maker round until all exit 0. Stop after round 3 and tell the owner. A rerun inside one maker
   round keeps that round's number (`--round N`) and says why in `note` (g7-ela: three runs in round 2).

## Output (`pack.json`)
`--write` adds your rounds to `checks.wilco` (`{"check": "keys" | "test-wise", "round", "pass", …, "worst"}`). Tell the
reporter each run's result and the worst strategy before and after (the audit report shows them).

## Known limits (say them in the report when they apply)
- The bots read text, not pictures: a picture-only choice is at chance for them.
- They pass content cues: twin wrong choices, a key that's the only one in the source's words. The blind tester
  catches those (Pet World's Pet Fair batch: the bots passed all five of the blind solve's FIX items).
- Small documents are noisy: one question moves an 8-question quiz 12 points. **Too few to judge:** when a document
  has too few mc or number questions for a bot (g4-math: 8 mc, 2 all-number), the bot is "not judged", not "passed";
  say so in the report.
- **Reading without the passage:** the bots passed a quiz three fresh testers answered 20 of 20 without the passages
  (g7-ela). Passage-dependence is the ELA round 1 gate's job (`agents/blind-ela.md`, mode 1), not yours.
- **"(paragraph N)" citations** in evidence choices are read as numbers by the number bots (smallest, largest, middle):
  a real but weak cue. The maker spreads the keys' paragraphs; the check stays as it is (g7-ela). Wrong choices
  rewritten to fix a no-passage giveaway tend to set off converge, then learnedCV, then middle: rerun all, every time.
- **Math length bots read the LaTeX source** (`\dfrac{8}{3}` is "longer" than `4`), not what a student sees. The maker
  makes some wrong choices fractions when the key is one. Reading the rendered text (`plainMath`) instead is the
  owner's call (docs/KINDS-MATH.md); never a reason to skip a fail.
- `keys` rows have no chance and no line: report them as passed or not, never as a percentage.

---
**Version 2** (Nov 5, 2026)

## Change log
- v1, Nov 5, 2026: first brief, from Pet World's `docs/FAIRNESS.md` (the rule, the cues, converge counted on printed
  work, learnedXU advisory and not run here) and `WORKSHEETS-LEAD-RECIPE.md` ("Wilco's notes bots, required").
- v2, Nov 5, 2026 (first audit, docs/audits/AUDIT-2026-11-05.md): the lead runs the scripts, no session (g11-history
  $0.75); `checks/apps.mjs` and `checks/puzzles.mjs` (docs/KINDS-APPS.md, KINDS-GAMES.md); `--items` always exits 0
  (g8-science); reruns keep the round (g7-ela); new known limits: too few to judge (g4-math), passage-dependence is the
  ELA gate's (g7-ela), paragraph citations as numbers (g7-ela), LaTeX source length (docs/KINDS-MATH.md), keys rows
  have no chance (g4-math, g7-ela).
