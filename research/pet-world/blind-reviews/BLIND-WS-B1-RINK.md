# 🙈 Blind solve: ⛸️ Ice Rink note sheets (g6-rink, Build 1)

Fresh solver, student view only (`scripts/notes/g6-rink-content.mjs` and the built `public/notes/g6-rink/station-N.html`).
No key file, teacher copy, review packet or key-check script was opened before every answer was written down. Each answer
was hashed as `PWN1|g6-rink|s<n>:<item>|<canonical>` with the engine's own canon functions (engine in `node:vm`, with the
unit's `enginePatches`) and compared with the page's `acc` hashes. Then `check-notes-keys.mjs g6-rink` ✅ and
`check-g6-rink-keys.mjs` ✅ (88 items, 126 right hashes, choice sets clean).

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|
| 1 Thermometer | 15 | 15 | 0 | 1 | 28–32 |
| 2 Rink Lines | 14 | 14 | 1 | 2 | 30–34 |
| 3 Race Board | 14 | 14 | 2 | 0 | 27–31 |
| 4 Podium | 16 | 16 | 0 | 0 | 30–34 |
| 5 Ice Depth | 15 | 15 | 1 | 1 | 26–30 |
| 6 Weather Station | 14 | 14 | 0 | 1 | 28–32 |
| **All** | **88** | **88 (100%)** | **4** | **5 (+1 unit-wide)** | all inside 25–35 |

No math key is wrong, no item is unsolvable, no two choices are equal. KEEP: the other 78 items.

## Unit-wide

- **Typed forms (probed):** −3 / -3 / "negative 3" / "+5" / "-$25" / "-4°" / "−12 m" all accepted; −1/2, −0.5 and −.5 all
  accepted; −7/5 and −1 2/5 and −1.4 all accepted; "<" and "less than", ">" and "greater than"/"is greater than" all
  accepted; "zero" for 0 accepted. "the left"/"the right" are refused only where the sentence already says "to the {}"
  (KEEP); "lesser than", "one tenth" (after "one {}"), "the distance" (after "its {}") refused where they'd read wrong
  (KEEP). Unicode "−½" is unread (engine-wide, JUDGMENT, low priority).
- **Length pattern (12 choice sets, 3 options, chance 33%):** key longest 4/12 (33%), shortest 3/12 (25%), middle
  5/12 (42%, +8.7). **No length pattern** (none more than 10 points over chance). Odd one out: 2/12 (S3 c1, S1 c2).
  Only number-valued set (S2 c1): key is the greatest value, not the middle. Shown positions of the key: 1st 4, 2nd 3, 3rd 5.
- **“Type the greater/lesser number” (S3 p1–p5, S6 p1–p2):** reads clearly to a 12-year-old: the question names both
  numbers and says exactly what to type. Two costs (JUDGMENT): every one is a 50/50 guess, and no Your-turn item has her
  write an inequality herself, though station 3 includes the game skill `numIneq` (Writing numerical inequalities); she
  only does it in Key-idea blanks and c1.
- **Matches the game:** sheets 1–6 line up with `RINK_STATIONS` / the `rink` skills (st 1 meaning/opposites, 2 negative
  decimals and fractions, 3 compare + inequalities, 4 order, 5 absolute value, 6 compare absolute values and debt words).
- **Minutes:** every page says 33; my count of required work is about 26–34 per sheet, inside the owner's 25–35.

## Per sheet

**Sheet 1**
- JUDGMENT p5 (L3) `−(−(−6))`: same pattern as mix-up 3 `−(−(−2))`, whose tip (“an odd number of minus signs makes it
  negative”) answers it in one look; the second step is the same move again.

**Sheet 2**
- FIX k3-1 “each part is {} long” (= 1/4): “one fourth”, “1 fourth” and “a quarter” are refused; she'd reasonably type the
  words (0.25 and 1/4 are accepted). Accept the word forms or say “(type a fraction)”.
- JUDGMENT p4 (fifths, 7 marks left of 0): mix-up 2 does the same setup with 6 marks (−6/5 = −1 1/5), one mark away.
- JUDGMENT k3-1: typing −1/4 gets the “sign” message; fine for a length, but a kid on the left side may be confused.

**Sheet 3**
- FIX p6 (L3): the lake step isn't needed. The lake is “9 degrees warmer than Fargo”, so it can't be coldest; the answer
  (−6) comes from comparing −4 and −6 alone. Not a real second step (e.g. make the lake colder: “9 degrees colder than
  Fargo”, so −13 vs −6 vs −4 needs the computation).
- FIX c1: the key `−14 < −10` is the only single inequality; both wrong choices are 3-part chains with 0 (`−14 > −10 > 0`,
  `−10 < −14 < 0`), so the key is the odd one out and the shortest. Make the wrong choices the same shape (e.g.
  `−14 > −10`, `−10 < −14`).

**Sheet 4**
- No FIX or JUDGMENT. (p5/p6 steps name the first two in order, so a hint opener sees most of it; that's the design.)

**Sheet 5**
- FIX c1 “Which **numbers** have an absolute value of 6?”: the plural rules out “just the 6”, and the item repeats key
  idea 4 (“the two numbers with an absolute value of 4”) and mix-up 3 almost word for word. Use “Which number or numbers…”
  and a fresher wrong choice.
- JUDGMENT p5/p6 (L3): both are “find two absolute values, then add/subtract”; `−|x|` (Example 2, mix-up 2, short s2) is
  never practiced in Your turn on this sheet (it shows up in sheet 6 p5).

**Sheet 6**
- JUDGMENT p3 (diver −27, bird 19, “how many meters from sea level is the farther one”) is the try-it (seal −20, gull 15)
  again with new numbers.
