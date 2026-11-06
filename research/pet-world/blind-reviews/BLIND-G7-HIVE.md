# Blind review: Honey Hive (7th grade Unit 3), Nov 1, 2026

Solved on commit `e450543` (branch `claude/g7-unit3-checkpoint`). The solver was a fresh agent that did not build this unit. It read only these files: CLAUDE.md, docs/builder/AGENT-STARTER.md, docs/BLIND-REVIEW.md, docs/builder/BLIND-G7-BALLOON.md, the Unit 3 spec (the end of docs/GRADE7.md), `answerStepsFor` / `testPrompt` and `assessLevel`. It did not read `HIVE_GEN`, `scripts/math-oracles/hive.js`, BUILDER-G7-HIVE.md or SOLVER-G7-HIVE.md. It opened the key only after it had solved every item.

## How it was run
- **Build:** `npx vite build --outDir /tmp/blind/site`, then opened with `?mathcheck` in headless Chromium (`chromium_headless_shell-1243`). `Math.random` was seeded (LCG, seed 20261101).
- **Export:** `/tmp/blindtools/export.mjs` drew 12 problems per skill per level, **288 items**. Each item holds the story, the picture's text, and the test steps (`answerStepsFor` + `testPrompt`) with the choice text and the ± and % marks. It holds no answer, `ok`, hint or mis.
  - Keyless view: `/tmp/blind/test.json`
  - Key: `/tmp/blind/key.json`
- **Solve:** by hand, with exact fractions, every step, reading the words. Answers are in `/tmp/blind/mine/*.txt`.
- **Score:** `/tmp/blindtools/score.js` compares typed answers by value (a fraction as [whole, top, bottom]) and choices by their text.

## Counts
| | Items |
|---|---|
| Solved blind | 288 (36 per skill, 96 per level) |
| Agreed with the key (every step) | **288** |
| KEEP (I was wrong) | 0 |
| FIX | 4 |
| JUDGMENT | 6 |

- No item had a wrong key, and none was unsolvable.
- Owner's hard rule: no item had two choices that are the same in text or in value, and none had two right answers. For example, 0.3̅0̅ and 0.30̅ in #123 are different values. So are 0.522̅7̅, 0.522727 and 0.527̅2̅ in #133.

## FIX
1. **ratReason L2/L3: the reasonableness choice gives itself away.**
   - When the claim is reasonable, it is always the exact product, so it matches one of the "should be about X" numbers. When it isn't reasonable, it matches none of them.
   - Half of the four choices contradict themselves. For example, in #264 (claim 24.396) the choices "Reasonable: … about 14" and "Not reasonable: … about 24" can't be right.
   - A guesser who picks "Reasonable: [the number that matches the claim]", or else guesses between the two "Not reasonable" choices, scored **77% on these 24 items (chance 25%)**. The math fairness bot has no strategy that tests this.
   - **Fix:**
     - Make some unreasonable claims close to the wrong estimate. For example, the claim 13.6 with "about 14" as a choice in #264's set.
     - Or ask two things separately: the estimate (typed, as L3 already does) and Reasonable / Not reasonable.
2. **ratReason L3: the story prints step 3's answer.**
   - "Bao works out 52% of 39.9 kg and gets 20.748 kg" is followed by step 3, "What is 52% of 39.9 kg exactly?", whose key is 20.748. This happens in 8 of 12 items (276–279, 281, 284–286).
   - In 3 of the other 4 the claim has the right digits with the point moved (44.01 → 4.401, #280; 2.4531 → 24.531, #282; 81.64 → 8.164, #283).
   - So the exact step needs no work in 11 of 12. **Fix:** a reasonable claim should be close but not exact (for example 20.5), or drop the exact step.
3. **pctOf L2: impossible stories.** "🐨 Kiki’s hive made 9.9 kg of honey. 150% of it is set aside for the bees" (#160; also #161 at 175% and #167 at 125%). You can't set aside more honey than the hive made. **Fix:** use stories where more than 100% makes sense ("this year it made 150% of last year’s 9.9 kg"), as the jars-sold stories already do.
4. **partWhole: "1 cells are full of honey"** (#17). Use "1 cell is" when the count is 1.

## JUDGMENT
1. **formConvert L3 is not clearly harder than L2, and it is all positive (12 of 12).**
   - L2 already has 212.5% → 2 1/8 and −2.375 → 2 3/8.
   - L3 is the same task with one more decimal digit, for example 1.6875 → 1 11/16 and 179.2% → 1 99/125.
   - The spec's L3 example is a negative mixed number (−2 5/6). Consider adding negatives at L3 and a mixed number whose decimal repeats (−2 5/6 = −2.83̅).
2. **decType L2 ends on a two-way choice: ends / repeats** (#84–95, on 60% of the unit test).
   - The typed lowest-terms step before it keeps the item from being a free 50/50, and the bot passes (Quiz 2 best: bestTrick 12.5%, chance 6.3%).
   - The decision itself is still a coin flip. The never-again rule names this only for L3.
3. **decType L3: the fraction that ends is usually 1/2 or 1/4 in disguise.** Examples: 7/14 (#96, #102), 9/18 (#100), 3/12 (#98), 7/28 (#104). That is 5 of the 7 "only one ends" items, and 7/14 is in 4 of the 12 sets. A student could learn "pick the one that is a half or a quarter". Vary the ending fraction: 3/8, 9/20, 7/40 or 11/16 in disguise.
4. **ratReason L3 step 1 hands over the rounding:** "round the percent to 50% and the amount to 40 kg." L1 asks for the estimate with no such help, so L3 gives more support than L1. Reading 1: keep it, because it teaches the method. Reading 2: say only "Estimate first" at L3.
5. **pctChange L3: the signs lean positive.** Of the 6 overall two-step changes, 5 are increases; only #207 (−10%) is a decrease. In 5 of the 6 "original amount" items the stock grew, so the original is the smaller number. The sample is small, and check-math scans for sign balance, but the spec asks for about half each way.
6. **Low variety in L1** (L1 is not on quizzes or tests):
   - repeatDec L1 is 1/3 in 5 of 12 items and only ever thirds and ninths. #119 includes the odd choice "0.0̅".
   - pctOf L1 is 50% in 6 of 12.
   - ratReason L1 #257 (12% of 40.1) has "about 4" and "about 6" only 0.8 and 1.2 away from 4.8.

## Difficulty by level
| Skill | L3 clearly harder than L2? |
|---|---|
| partWhole | Yes: a fraction of a fraction ("25% of the 3/4 that are full"), or more than 100% as a mixed number |
| formConvert | Barely (JUDGMENT 1) |
| decType | Yes: simplify four fractions, then divide |
| repeatDec | Yes: blocks that start after the point, typed block, mixed numbers |
| pctOf | Partly: the 75% of 1 1/2 fraction items are harder; 35% of 100 (#179) and 85% of 60 are easy |
| pctChange | Yes: two-step change, and the original from the new amount |
| ratMulti | Yes: three forms, money, and a signed profit (5 gains, 7 losses) |
| ratReason | Not in effect: more steps, but step 3 is printed (FIX 2) |

**Share of L3 on the unit test:**
- `assessLevel` makes problems 3 and 5 of every 5 level 3 in a `g7` unit test. Hive is `hood:'g7'`, so its test holds **exactly 40% L3**, with the rest L2.
- Key positions in the sample are spread across A–D. ends/repeats is 6/6 at L2 and 4/8 at L1. Reasonable / Not reasonable is 13/11.

## Fairness bot
`PLAYWRIGHT_CHROMIUM=…chromium_headless_shell-1243… node scripts/check-math-fairness.mjs --shop hive` (full default run: 120 per skill at L2 and L3, 1,920 problems). **PASS, exit 0.**

| Assessment | Chance | Best strategy |
|---|---|---|
| Quiz 1 Jar Shelf | 0% | memo 1.9% |
| Quiz 2 Comb Pattern | 6.3% | bestTrick 12.5% |
| Quiz 3 Hive Growth | 0% | bestTrick 2.7% |
| Quiz 4 Market Day | 6.3% | repeat 6.7% |
| Unit Test | 3.1% | bestTrick 5.7% |

The bot doesn't play the self-consistency strategy from FIX 1, which scores 77% on that step. The typed steps keep the quiz totals low.

Scratch files: `/tmp/blind/` (test.json, key.json, mine/, fair.txt, fairv.txt) and `/tmp/blindtools/`. No repo file was changed except this one. Tool calls: about 25.
