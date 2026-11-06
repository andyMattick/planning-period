# 🙈 Blind solve: 📝 Clock Tower note sheets, Build 1 (g6-clock)

Fresh solver, student view only (`scripts/notes/g6-clock-content.mjs` and the built `public/notes/g6-clock/station-N.html`).
Every answer was written to a scratch file first, then hashed as `PWN1|g6-clock|s<n>:<item>|<canonical>` with the
engine's own canon functions (engine in `node:vm` with the unit's `enginePatches`, judged the way `judge()` does:
number canon for every box, plus the word canon for key-idea blanks, `opt:` canon for choices) and compared with the
page's `acc` hashes. The keys file, key check, teacher copies and review packet were opened only after that.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | KEEP | JUDGMENT | Required minutes (page / my estimate) |
|---|---|---|---|---|---|---|
| 1 Chimes | 14 | 14 | 1 | 12 | 1 | 33 / about 30 |
| 2 Gears | 15 | 15 | 0 | 15 | 0 | 33 / about 30 |
| 3 Clock Face | 14 | 14 | 0 | 11 | 3 | 33 / about 35 |
| **All** | **43** | **43 (100%)** | **1** | **38** | **4** | all inside 25–35 |

No math key is wrong. No item has zero right answers. No two choices are equal.
`node scripts/notes/check-notes-keys.mjs g6-clock` ✅ (43 items, 66 stored right hashes, 6 choice sets clean).
`node scripts/notes/check-g6-clock-keys.mjs` ✅ (43 items solved independently).

## Unit-wide

- **Length pattern: none.** Over the 6 choice sets (3 options each, chance 33%): key shortest 2/6 (S1 c1, S2 c1), longest
  2/6 (S1 c2, S3 c2), middle 2/6 (S2 c2, S3 c1). Odd one out 1/6 (S3 c1). No number-choice sets, so no middle-value count.
  Shown positions B A C A B C: no runs.
- **Forms probed** (accepted unless noted): 12/8, 6/4, 1 1/2, 1.5 for 3/2; 0.25, “1/4 hour” for 1/4; 10/8, 1 1/4, 1.25 for
  5/4; .36, 36/100, 9/25 for 0.36; 0.064 for 8/125; “four”, “one” in blanks; Base, Parentheses, parenthesis, “to the second
  power”, bigger / larger / more / Greater, values. Refused, all fine: “the base”, “the left”, “the value” (the sentence
  already has “the” before the blank), “square” for squared, “parenthese”, and number words (“five”, “one fourth”) in a
  number box (read as unread, not wrong).
- **Matches the game:** the three sheets follow `CLOCK_STATIONS` (Chimes `expMeaning/powWhole/powFrac`, Gears
  `orderNoExp/orderOps`, Clock Face `orderFracExp/compareExp`) and the mix-ups in docs/CLOCK.md (5³ → 15, base/exponent
  swap, zero exponent, 0.3² → 0.9, top-only powers, left-to-right, parentheses, exponent last). One difference: see S3 p4.

## Sheet 1 · Chimes

- **FIX · p5 (Level 3) `(2/5)³`:** one step only (a power of a fraction, the same move as k5 and p4 at Level 2, just
  bigger numbers). Level 3 needs a real second step, e.g. `(2/5)² + 1/5` or `(1/2)³ × 8 − 1` style.
- JUDGMENT · c2 (10⁰): the answer is stated just above in key idea k4 (“to the power 0 is {1}”) and again in the third
  mix-up, whose right text (“each step down divides by 7”) is the key option’s wording with 10. Fine as a check of the
  idea; it doesn’t test much.

## Sheet 2 · Gears

- No FIX, no JUDGMENT. All 6 Your turn and both choices clean; Level 3 p5 (nested grouping + exponent) and p6 (exponent,
  ×, two subtractions) have real extra steps.

## Sheet 3 · Clock Face

- JUDGMENT · p4 `12 × (1/2)³`: the hint says “Simplify at the end”, and the game requires simplest form, but the sheet
  accepts 12/8 (also 6/8 for k2, 10/8 for k5). Kind for notes; either say “simplest form is best” in the message for
  12/8, or leave it.
- JUDGMENT · c1 (3⁴ vs 4³): the key is the only option that shows computed values (“because 3⁴ = 81 and 4³ = 64”), so a
  test-wise kid picks the “specific” one without computing. Consider giving a wrong option numbers too (e.g. “4³,
  because 4³ = 64 is more than 3 × 4 = 12”).
- JUDGMENT · c2 ((4/5)² = 16/5): the key (“She squared the top but not the bottom”) restates the first mix-up on the same
  sheet (“Raising only the top to the power … The bottom is squared too”). Not copied word for word, so not a FIX.
