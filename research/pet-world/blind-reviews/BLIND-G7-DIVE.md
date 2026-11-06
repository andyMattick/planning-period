# Blind review: Dive Shop (7th grade Unit 1), Nov 1, 2026

Solver: a fresh agent that did not build this content. It read only the keyless test view. The key was opened after every item was solved.

## How it was run

- Built the game (`vite build` into `/tmp/blind-dive/site`) and opened it with `?mathcheck` in headless Chromium.
- Export (`/tmp/blind-dive/export.mjs`, seeded `Math.random`): for each of the 9 skills, at levels 1, 2 and 3, 12 problems each, **324 items**. Each item has the story, the picture's text, the SVG labels and point positions, and the test steps (`answerStepsFor` + `testPrompt`) with their choices. It has no answer, `ok`, ctx, hint or mis. The keyless set is `/tmp/blind-dive/test.json`; the key is `key.json`.
- Solve (`/tmp/blind-dive/solve.mjs`): my own exact-fraction calculator. It reads the story wording, so a pelican "dives 6.3 m" is solved as a subtraction, not from the printed expression. It also checks that the printed expression matches the story. Number-line points are read from the SVG tick labels. It does not use the generators or `scripts/math-oracles/dive.js`. Every story template was also read by eye. I was highly confident on all 324.
- Score (`/tmp/blind-dive/score.mjs`).

## Counts

| | Items |
|---|---|
| Solved blind | 324 (36 per skill, 108 per level) |
| Agreed with the key (every step) | **324** |
| KEEP (I was wrong) | 0 |
| FIX | 2 |
| JUDGMENT | 4 |

No wrong keys and no unsolvable items. Every story matched the expression it printed, and every number-line picture matched its story (start points, letters A–D).

## FIX

1. **subAsAdd L3, the one-box items with fractions** (7 of the 12 L3 draws). Example, item 169: "Write 3/5 − (−3 1/2) as an addition: 3/5 + ☐. What goes in the box?" Choices: **3 1/2** / −3 1/2. Others: 170 "2 1/2 − (−2 1/4)", 172 "−1/2 − 1 3/4" (**−1 3/4** / 1 3/4), 175, 176, 178, 179.
   - **Why:** the only test step is a 2-way sign choice, and both choices show the size. Guessing gets 50%. Also, "pick the choice that isn't the number written after the minus sign" is right on every one of these items, with no math at all.
   - It is also **easier than L1 and L2**, where she types the box with the ± button. L3 should be clearly harder.
   - **Suggested fix:** make it typed (a `frac` size plus a sign, like the other skills), or use the two-box form (`a − (−b) − c = a + ☐ + ☐`) with fractions.
2. **zeroPairs L3, "What number can you add to … to make zero?"** (4 of the 12 L3 draws). Example, item 27: "What number can you add to (−4 1/2) + 3/4 to make zero?" Choices: −3 3/4 / **3 3/4**. Item 28: "2 2/3 + (−1 3/4)", choices **−11/12** / 11/12.
   - **Why:** the only step is the sign choice, and both choices show the size. So the hardest part (adding two mixed numbers with unlike denominators) is done for her, and a coin flip gets 50%.
   - **Suggested fix:** ask the size first (a `frac` box), then the sign, like addRat L3 and subRat L3 already do.

Neither of these trips the fairness bot. Chance on a 2-way step is 50%, so the bot's "above chance" line is measured from there. They are still weak test items.

## JUDGMENT

1. **The expression is printed for her.** This happens in addOnLine L1–L2 ("The move is 5 m: −10 + 5"), the addRat L2 pelican ("(9.7 + (−6.3))"), and the zeroWord L2–L3 pictures ("🦀 2 1/2 + (−2 7/8) + 3 3/4").
   - So on those items she never has to turn the story into an addition, which is part of 7.NR.1.2 and 7.NR.1.3.
   - ratWord L3 does it right (the picture shows only the start). Consider dropping the printed expression on the test view at L2 and L3.
2. **ratDist L2 says "Use |p − q|."** The picture also prints the setup, for example "🌡️ |7.1 − (−9.9)|". That gives away the "distance = absolute value of the difference" idea, which is the standard. It's fine for practice. On a test, consider showing only the story.
3. **ratDist L3 ladder items** (5 of 12), for example 241: "Coral is at −4.75 m. The ladder is 1.25 m above Coral. Where is the bottom of the ladder?"
   - This is one addition with quarter decimals, so it's easier than the L2 temperature items.
   - The other L3 type (three animals, fraction depths, pick the named pair) is properly harder.
4. **zeroPairs L2 is mostly the easiest type.** 9 of the 12 draws are "What number added to 56.1 makes zero?" That's easier than L1's 4-term integer sums and the bubble counting. L2 is "harder" only because the numbers are decimals.

## Difficulty by level

- **L1:** integers only, 1 step, 1–2 operations.
- **L2:** decimals (and some fractions), mostly 1 step.
- **L3:** mixed numbers with unlike denominators in every skill except subAsAdd's two-box items. Most L3 items are a size box plus a sign choice (2 steps), and addProps L3 and ratWord L3 have 4 numbers.

L3 is clearly harder than L2 in 7 of the 9 skills. The exceptions are subAsAdd (FIX 1) and zeroPairs (FIX 2), plus the ratDist ladder half of L3.

**Share of L3 on the Unit Test:** it is not fixed. The test uses level `max(2, lvlOf(sk))`, and `lvlOf` is 3 only after 10 or more correct answers in that skill (`S.kn`).
- A student who unlocks the test after about 6 correct per skill sees 0% L3.
- A student who has practiced a lot sees 100% L3.
- The bot assumes 50/50.

None of these numbers is the owner's 40% target. If 40% is wanted, the plan has to set it per item; today it isn't set.

**Compared with a typical Georgia / Common Core 7th grade item:**
- Number types and sizes match or beat what tests usually use. Examples: "−3 1/2 + 2 3/4", "the temperature was −4°F and rose 15°F", "distance between −2.5 and 4.75", 4-term regrouping.
- Typical state items also include 4-choice conceptual items that this unit doesn't have:
  - "Which expression is equivalent to 5 − (−3)?" with the choices 5 + 3, 5 − 3, −5 + 3, −5 − 3.
  - "Which situation has a sum of 0?"
  - "Point P is at −2 on the number line; where is P + (−3.5)?" with 4 points.
- This unit's conceptual checks are mostly 2-way sign choices, so they're easier than the state versions. addOnLine L2 (3–4 lettered points) is the closest to the state style.

## Fairness bot (`node scripts/check-math-fairness.mjs --shop dive`, full run, 120 per skill at L2 and L3, 2,160 problems)

**Result: PASS.** There were no giveaways and no variety (memorizer) flags.

Pass mark 80%. A strategy fails at 65% or more, or at more than 10 points above chance. Mean % passed:

| Assessment | Chance | Best strategy (score) | Others of note |
|---|---|---|---|
| Quiz 1 Bubble Pairs | 5.5 | memo 7.2 | bestTrick 6.7, quotient 6.4, repeat 6.4 |
| Quiz 2 Dive Line | 1.5 | memo 2.7 | repeat 2.2, last 2.0 |
| Quiz 3 Flip and Add | 5.8 | shortest/notLongest/notVote 8.3 | posA 7.5, bestTrick 7.3 |
| Quiz 4 Depth Gauge | 0 | memo 3.8 | repeat 2.9, bestTrick 2.5 |
| Quiz 5 Dive Log | 0 | memo 2.4 | round 2.1 |
| Unit Test | 2.9 | memo 4.6 | bestTrick 3.9, repeat 3.9, round 3.5 |

Every strategy is within about 4 points of chance and far below 65%.

The bot has no "pick the choice that isn't written in the story" strategy. That strategy would score 100% on the subAsAdd L3 one-box items (FIX 1), but those are only one problem-step in a quiz, so the quiz total stays low.

Scratch files are in `/tmp/blind-dive/` (export, test.json, key.json, mine.json, solve, score, fair.json). No repo source files were changed.
