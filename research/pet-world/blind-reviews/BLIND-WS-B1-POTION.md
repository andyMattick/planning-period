# 🙈 Blind solve: 📝 Potion Lab note sheets, Build 1 (g6-potion)

Fresh solver, student view only (`scripts/notes/g6-potion-content.mjs` and the built `public/notes/g6-potion/station-N.html`).
No key file, teacher copy, review packet or key-check script was opened before every answer was written down.
Each answer was hashed as `PWN1|g6-potion|s<n>:<item>|<canonical>` with the engine's own canon functions (engine in
`node:vm`, `kinds` gate and `enginePatches` applied) and compared with the page's `acc` hashes. Forms a 12-year-old
might type were probed the same way. Afterwards `check-notes-keys.mjs g6-potion` and `check-g6-potion-keys.mjs` both pass.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (est.) |
|---|---|---|---|---|---|
| 1 Ingredients | 15 | 15 | 0 | 1 | 28–32 |
| 2 Test Tubes | 14 | 14 | 2 | 0 | 28–32 |
| 3 Recipe Cards | 14 | 14 | 0 | 1 | 26–30 |
| 4 Mixing Bowl | 15 | 15 | 1 | 2 | 28–32 |
| 5 Cauldron | 14 | 14 | 0 | 2 | 27–31 |
| 6 Potion Shelf | 14 | 14 | 0 | 0 | 26–30 |
| **All** | **86** | **86 (100%)** | **3 + 1 unit-wide** | **6 + 1 unit-wide** | all in 25–35 |

KEEP: the other 77 items (key right, fair choices, sensible accepted forms). No key is wrong; no item has zero right
answers; all sheets match `POTION_STATIONS` (titles, emoji, kid lines, skills) and the Khan unit 6 order.

## Unit-wide

- **Length:** no length pattern. 19 choice sets (12 c-items, 7 choice problems). Key is the unique shortest 5/19 (26%),
  unique longest 4/19 (21%), unique middle 2/19, the rest tied lengths; chance is 33%. Displayed position 7 / 7 / 5.
  Number-like choices: no middle-value pattern (s6 p4 key is the smallest coefficient, s5 c1 / s6 p6 mixed).
- **FIX (overlap pattern):** the key is the option that shares the most with the other two (character-bigram overlap)
  in 12.3 / 19 sets, **65% vs 33% chance**. The cause is the expression choices: each distractor is one change away from
  the key (s3 p2, p4, p5; s5 p5, c1; s6 p6 all give the key to an "overlap" bot), so the key is the "centre". Fix: make
  at least one distractor in each expression set differ from the key in two places, or share a part with the *other*
  distractor instead of the key (e.g. s5 c1: `7y + 2`, `14y + 2`; s6 p6: `7x + 1`). Rerun `test-wise-bot.mjs`.
- **Accepted forms (KEEP):** typed expressions accept term order (`4+3x`), `3x`, `3*x`, `3×x`, `3·x`, spaces, `9(k)`,
  `(9)(k)`, `k*9`. Refused, correctly: `x3+4`, `k9`, `m10`, unfinished `2x+2*7`, `x+x+x+x+x+x+12`, `b+b+…`
  (`2b+5b` gets a miss message, good). Number items accept units (`14 drops`, `19 coins`, `5y`, `1x`).
- **JUDGMENT (accepted forms):** `9 x k` (letter x as "times", s3 p1), `9 times k`, `n plus 4` are refused. Fine for an
  algebra sheet, but a hint line "use symbols, like 9k" would avoid a frustrating miss.

## Sheet 1, Ingredients

- JUDGMENT p5 (L3): 3x² + 2 at x = 4 is Example 2 (2x² + 5 at x = 3) with new numbers, and only one step past p4
  (x² − 6). The "second step" is order of operations, not a new step. Consider a story or a two-letter version.

## Sheet 2, Test Tubes

- FIX c2: Moss's mix-up uses x = 2/3, y = 3/4, the exact numbers of Example 2, which already works out 2/3 × 3/4.
  Use new fractions (e.g. 3/5 and 1/2 → Moss gets 4/7).
- FIX c1: a giveaway. The intro says "formulas, like 4s for the distance around a square", the watch list says "like 4s
  for the perimeter of a square", and idea k4 says "The perimeter of a square is 4s". The key `4s, four sides` is copied
  from the page. Ask for a different shape (equilateral triangle 3s, or a rectangle 2l + 2w) or drop the text from the intro.

## Sheet 3, Recipe Cards

- JUDGMENT p2 (L1 choice): "12 less than n" is Example 1 ("8 less than p") with new letters; fine for Level 1 but
  it is the same item as mix-up 1 too. Keep or swap to "n decreased by 12".

## Sheet 4, Mixing Bowl

- FIX p5: "What is the sum inside the parentheses?" A student can reasonably type `3 + 5` (the sum written out) or
  `15(3+5)`; both are refused with no miss message, only `8` is right. Either accept `3+5` / `5+3`, or ask "What does the
  sum inside the parentheses equal?" (or "Type the number the sum equals").
- JUDGMENT c1: the key `the least common multiple of 8 and 10` is the only option that uses the station's vocabulary
  with the item's numbers (odd one out, most specific, least overlap). Give the distractors the same shape, e.g.
  `the greatest common factor of 8 and 10`, `the sum of 8 and 10`.
- JUDGMENT c2: all three options echo mix-up headings (key ≈ "Stopping at a common factor that isn’t the greatest").
  Balanced, so not a giveaway, but the key's wording is the heading reworded.

## Sheet 5, Cauldron

- JUDGMENT p5: `3(6x + 15)` has the key's value; the stem says "with the greatest common factor", so the equal value is
  the point (the key check flags it the same way). KEEP the item, but it feeds the overlap pattern above.
- JUDGMENT c2: the key is the only option with a number (`the GCF 8`), and the hint ("Is 4 the greatest…?") points at
  it. Fine for notes; mention only if the bot flags "specific".

## Sheet 6, Potion Shelf

- No FIX. p6 and p4 are clean two-step / sign items; c2 is a good mix-up item (x = 1 check).
