# Blind review: Balloon Port (7th grade Unit 2), Nov 1, 2026

Solved on commit `9d361bf` of `claude/g7-unit2-builder` (before the round-3 change `33fffb5`: varied "what it means" wrong sizes, "m down in" pictures, "Which one has the same value?"). Some findings below (JUDGMENT 1 and 2, FIX 4 in part) may already be addressed there.

Solver: a fresh agent that did not build this content. Before solving, it read only CLAUDE.md, CONTENT-RULES.md, docs/BLIND-REVIEW.md, docs/builder/AGENTS.md, docs/GRADE7.md (the Unit 2 spec) and the keyless test view. It did not read `BALLOON_GEN`, `scripts/math-oracles/balloon.js` or `SOLVER-G7-BALLOON.md`. It opened the key only after every item was solved.

## How it was run

- **Build:** `npx vite build --outDir /tmp/blind/site`, opened with `?mathcheck` in headless Chromium (`chromium_headless_shell-1243`).
- **Export:** `/tmp/blindtools/export.mjs`, with `Math.random` seeded. For each of the 8 skills, at levels 1, 2 and 3, it drew 12 problems: **288 items**.
  - Each item holds the story, the picture's text and SVG labels, and the test steps (`answerStepsFor` + `testPrompt`) with the choices' text.
  - It holds no answer, `ok`, ctx, hint or mis.
  - The keyless set is `/tmp/blind/test.json`; the key is `/tmp/blind/key.json`.
- **Solve:** by hand, with exact fractions, one skill at a time. The answers are in `/tmp/blind/mine/*.txt`.
  - I read the words, not only the printed expression. For example, "sinks 7 m each minute … 9 minutes ago" is (−9) × (−7) = +63, so "63 m higher".
  - I checked each story against its picture.
- **Score:** `/tmp/blindtools/score.js`. Typed answers are compared by value, fractions as [whole, top, bottom], and choices by their text.
- **Extra scan:** `/tmp/blindtools/exportbig.mjs` + `dup.js`. This drew 250 per skill per level (6,000 problems) to check:
  - repeated choices (by text and by value, so −0.5 and −1/2 count as the same)
  - two-way last steps
  - the sign spread of the answers
  - where the key sits among the choices

## Counts

| | Items |
|---|---|
| Solved blind | 288 (36 per skill, 96 per level) |
| Agreed with the key (every step) | **288** |
| KEEP (I was wrong) | 0 |
| FIX | 4 |
| JUDGMENT | 6 |

- **No wrong keys and no unsolvable items.** Every printed expression matched its story, and every number-line picture matched its story.
- **Owner's hard rule (two choices the same, or two right answers):** none in the 288 items, and none in the 6,000-problem scan, by text or by value.

## FIX

1. **mulDivWord: every answer is negative.** It was 36 of 36 here and 100% at every level in the 6,000 scan.
   - The stories are always "came down", "owe the port" or "colder".
   - At L2 and L3, the key of the meaning step is always "it comes down … every minute".
   - So a student who always types a negative and picks "comes down" never decides a sign, and the sign is the point of 7.NR.1.7 and 7.NR.1.8.
   - **Suggested fix:** add positive stories so that about half the answers are positive. For example: "rose 42 m in 3 minutes", "the port pays 4 friends back $52", "the air gets 6.5 °C warmer for every km a balloon comes down". Mix the meaning keys between "goes up" and "comes down".
2. **mulDivApply L3: the first step's prompt is unclear, and the sign never changes.** Examples: items 276–287.
   - The first test step asks "How far from 0 is the answer? Type its size, with no sign." It doesn't say that it wants the **change each minute** (8 1/2), not the change in 9 minutes (76 1/2).
   - In 5 of the 12 draws (276, 278, 279, 284, 287), both `frac` steps have exactly the same words.
   - The rate is always negative, and so is the final change ("came down" in 100% of the scan). So every sign choice in this L3 type is the negative one.
   - **Suggested fix:**
     - Give the rate step its own `testPrompt`, for example "How far from 0 is its change each minute?"
     - Add "went up 21 1/4 m in 2 1/2 minutes" stories.
3. **Most L3 problems end on a two-way sign choice**, for example "−18 2/3 / 18 2/3".
   - The Unit 2 spec (docs/GRADE7.md) says: "No step that ends a hard problem is a two-way sign choice."
   - Counts in the 6,000 scan (out of 250 per level):

     | Skill | Ends on a two-way sign choice |
     |---|---|
     | mulGroups L3 | 220 |
     | mulRat L3 | 229 |
     | mulProps L3 | 162 |
     | divForms L3 | 145 |
     | mulDivApply L3 | 138 |
     | divInt L3 | 78 |
     | mulFamily L3 | 81 |
     | mulRat L2 | 131 |
     | divForms L1 | 125 |

   - This is better than the Dive Shop's FIX 1, because the size is typed first. A guess still gets the sign right half the time, and the sign is the main idea of 7.NR.1.6 and 7.NR.1.7.
   - Some of the same skills already do it the stronger way, with the signed answer typed using the ± button: mulGroups #32, mulRat #66, mulProps #242 and #243.
   - **Suggested fix:** make the last step a typed signed answer (`frac` with ±), or a four-way meaning choice.
4. **mulFamily L3: the meaning step is sometimes only two choices.**
   - Examples: item 169 ("$58 more / $58 less"), 172, 175, 178 and 179. In the scan, 81 of the 250 L3 problems end this way.
   - That choice only repeats the sign she just typed.
   - In item 171, the sign choice (−12 1/2 / 12 1/2) and a two-way meaning choice ask the same thing twice.
   - The other L3 problems have four choices with a size distractor (for example 7 1/2 vs 6 1/2), and that is the stronger form.
   - **Suggested fix:** always use 4 meaning choices.

## JUDGMENT

1. **divForms never tests −(p/q) = (−p)/q = p/(−q).**
   - The L1 story says "Which fraction is equal to −(3/4)? Then write −(3/4) as a decimal." The test view keeps only the decimal step, so the story asks a question the test doesn't ask (items 108, 110, 111, 113, 115, 117–119).
   - Quizzes and tests use L2 and L3, where every item is "write p ÷ q as a decimal" or "as a mixed number".
   - So the equivalent-forms idea, which is the heart of 7.NR.1.7, is never on a quiz or test. Consider a four-way "which is equal to −(3/4)?" step at L2 and L3, with choices like (−3)/4, 3/(−4), (−3)/(−4) and −(4/3).
2. **Pictures print the sign in mulDivWord L3 and mulDivApply L3.** Example: "🎈 −1 1/2 m in 3/4 min".
   - It is a given, not the answer. The story already says "sank", so a student can tell the sign anyway.
   - It does hand over the sign that the next step asks for, and the last builder commit ("no sign in pictures") suggests this was meant to go.
   - Reading 1: keep it, because it's a given. Reading 2: show "1 1/2 m down in 3/4 min".
3. **divInt L2 "Which one has no answer?"** (items 89, 92). The key is always the "÷ 0" expression, which is quick to spot, and it sits under B 43% of the time in the scan (33 of 77; 25% would be even). Shuffle the key's letter.
4. **mulProps: "Regroup to make it easier"**, but the test asks only for the product. The property itself (7.NR.1.9) is never checked, the same as Dive's addProps. Consider a choice step: "Which grouping makes it easiest?"
5. **mulRat L2 → L3 is a small step.**
   - L2 already has mixed × fraction, for example 1/6 × (−1 2/3) and (−1/2) × (−1 1/3).
   - Much of L3 is a mixed number × a unit fraction, for example (−2 1/2) × (−1/2) and 1 1/4 × (−1/9).
   - mulGroups L3 #29, "−(1/5 × 2)", is easier than its L2 decimals.
6. **The level steps are only a number-type change in some skills.**
   - mulDivApply L1 → L2 is the same "sinks then rises" template, with decimals.
   - divForms L2 → L3 has the same "as a decimal" items, for example 21 ÷ (−20) at L3 against 39 ÷ (−8) at L2.
   - L3 is harder only in its mixed-number half.

## Difficulty by level

- **L1:** integers. These are one-step products and quotients, the groups-of-counters choice, and the minutes-from-now choice.
- **L2:** decimals and simple fractions, past time (a negative × a negative), four factors, and a four-way "what does it mean" step.
- **L3:** mixed numbers and unlike denominators. It adds dividing fractions, nested quotients, rate-then-scale problems and size + sign steps.

How L3 compares with L2 in each skill:

| Skill | L3 clearly harder than L2? |
|---|---|
| mulGroups | Yes (mixed numbers; #29 is an easy outlier) |
| mulRat | Only a little (JUDGMENT 5) |
| divInt | Yes (fraction ÷ fraction, nested quotients) |
| divForms | Half (decimals same as L2; mixed-number half harder) |
| mulFamily | Yes (mixed and decimal rates; 3 steps) |
| mulDivWord | Yes (fraction ÷ fraction rates) |
| mulProps | Yes (four factors with mixed numbers that cancel) |
| mulDivApply | Yes (a two-step rate problem) |

**Share of L3 on the Unit Test:** checked by reading `assessLevel` in src/game/game.js, and nothing else.
- In a 7th grade unit test (`shift.mode === 'test'` and the shop's hood is `g7`), problems 3 and 5 of every 5 are level 3, and the rest are level 2. That is **exactly 40% L3** on a test whose length is a multiple of 5.
- Quizzes still use `max(2, lvlOf(sk))`.
- This fixes the Dive Shop's "not fixed" finding.

**Compared with a typical Georgia / Common Core 7th grade item:**
- The number types match the usual items, for example "(−2 1/3) × (−9) × 3/7 × 1 1/2" and "a balloon sinks 1 1/2 m each minute; where was it 5 minutes ago?".
- The "what does the answer mean" steps (mulFamily L2, mulDivWord L2) are in the state style.
- Weaker than state items: the equivalent-sign forms of a quotient (JUDGMENT 1) and the regrouping choice (JUDGMENT 4) are missing from the test.

## Fairness bot (`node scripts/check-math-fairness.mjs --shop balloon --n 300 --verbose`, 300 per skill at L2 and L3, 4,800 problems)

**Result: PASS (exit 0).** There were no giveaway and no variety (memorizer) flags.

Pass mark 80%. A strategy fails at 65% or more, or at more than 10 points above chance. Mean % passed:

| Assessment | Chance | Best strategy (score) | Others of note |
|---|---|---|---|
| Quiz 1 Ballast Shed | 0 | bestOp 4.9 | product 4.1, memo 1.2, bestTrick 1.0 |
| Quiz 2 Sharing Basket | 0 | bestTrick / bestOp 2.3 | repeat 1.9, memo 1.3 |
| Quiz 3 Flight Log | 0 | repeat 3.0 | memo 2.7, bestTrick / bestOp 2.5 |
| Quiz 4 Ticket Booth | 0 | memo 2.8 | bestTrick / bestOp 2.1, repeat 1.4 |
| Unit Test | 0 | bestOp 2.9 | memo 2.0, bestTrick 2.0, repeat 1.7 |

Every strategy is under 5% and far below 65%. Chance is 0 because nearly every problem has a typed step.

The bot has no "always type a negative and always pick the negative / 'comes down' choice" strategy. That strategy would be right on every sign step in mulDivWord and in mulDivApply L3 (FIX 1 and 2), but the typed sizes still keep the quiz totals low.

The scratch files are in `/tmp/blind/` (test.json, key.json, mine/, big-*.json, fair.txt, fair.json) and `/tmp/blindtools/`. No repo file was changed except this one.
