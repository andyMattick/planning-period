# 🙈 Blind solve: 📝 Pet Houses note sheets, Build 1 (g6-houses)

Fresh solver, student view only (`scripts/notes/g6-houses-content.mjs` and the built `public/notes/g6-houses/station-N.html`).
Every answer was written to a scratch file first, then hashed as `PWN1|g6-houses|s<n>:<item>|<canonical>` with the
engine's own canon functions (the patched engine taken from the built page, run in `node:vm`, judged the way `judge()`
does: number canon for every box, plus the word canon for key-idea blanks, `opt:` canon for choices) and compared with
the page's `acc` hashes. The keys file, key check, teacher copies and review packet were opened only after that.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | KEEP | JUDGMENT | Required minutes (page / my estimate) |
|---|---|---|---|---|---|---|
| 1 Floor Plans | 15 | 15 | 0 | 14 | 1 | 33 / about 28 |
| 2 Roof Lines | 15 | 15 | 1 | 11 | 3 | 33 / about 30 |
| 3 Rooms | 15 | 15 | 1 | 13 | 1 | 33 / about 35 |
| **All** | **45** | **45 (100%)** | **2** | **38** | **5** | all inside 25–35 |

No math key is wrong. No item has zero right answers. No two choices are equal.
`node scripts/notes/check-notes-keys.mjs g6-houses` ✅ (45 items, 62 stored right hashes, 6 choice sets clean).
`node scripts/notes/check-g6-houses-keys.mjs` ✅ (45 items solved independently).
`node scripts/notes/notes-test-wise.mjs --units g6-houses --verbose` ✅ (every strategy within 10 points of the 33% chance,
except the one-set number cues on S3 c1: see the FIX there).

## Unit-wide

- **Pages say the right thing:** every page says 3 sheets (“All 3 sheets”, “the 3 sheets”) and “About 35 minutes a sheet”;
  each sheet's required minutes add to 33. No leftover “5 sheets” or “40 minutes”.
- **Length pattern: none.** Over 6 choice sets (3 options each): key longest 2/6 (S2 c2 by two letters, S3 c1), middle
  2/6 (S1 c1, S3 c2), shortest 1/6 (S1 c2), all equal 1/6 (S2 c1). Shown key positions B A · C A · B C: no runs.
- **Pictures:** solid sides, dashed heights with a square-corner mark, dotted carried-on base lines, hatched second pieces,
  and every length written as text, so they read in black-and-white print. The SVGs are 340 wide with 14 px text, so they
  fit a 375 px phone at about full size. No picture labels an asked value, and no `picAlt` states an answer (S2 c1's
  picture is a special case, see there). I could read every length I needed; the L-shape labels in S3 Example 1, p1 and
  p4 match the edges they sit on.
- **Forms probed** (accepted unless noted): “36 m²”, “36 sq m”, “36 square meters”, “36m2”, “36 m^2”, “60 in²”,
  “50 ft2”, “62 m²”, “52 sq ft”; number words “thirty-six”, “sixty”, “seven feet”, “twelve”, “twenty-three”,
  “fifty-two”, “sixty-two”; for 22.5: 22 1/2, 45/2, 22.50, “twenty-two and a half”, “22 and a half”; blanks “Right”,
  “square”, “90” (k3), “one half”, “a half”, “1/2” (S2 k1), “beyond” (k4), “multiply”, “times 2”, “2x” (k5), “take away”,
  “minus”, “remove” (S3 k3), “triangle”, “right triangles” (S3 k5). Refused, fine: “a rectangle”, “the height”,
  “the base”, “right angle”, “outside of” (the sentence already has the word), “rectangles”, “overlapping”, “doubles”
  (grammar). “touch” for S3 k1 gets a helpful miss message. Refused, see JUDGMENT: “22½” and “½”, “one-half”.
- **Matches the game:** the sheets follow the Pet Houses stations (parallelograms, triangles, composite shapes) and the
  usual mix-ups (slanted side as height, forgetting or adding the ½, not doubling when working backward, adding the
  missing piece, counting a piece twice).

## Sheet 1 · Floor Plans

- No FIX. Level 3 p5 (height from bed A, then bed B's area) and p6 (parallelogram area, then the rectangle's length) both
  have a real second step. Worked-example numbers (10/7/6, 54/6) are not reused in Your turn.
- JUDGMENT · c1 and c2: each key is the sheet's own mix-up box (c1 = “Using the slanted side as the height”, c2 = the
  “Multiplying to find a missing side” box's right line, divide). Not copied word for word, so not a FIX; they check the
  idea but don't test much. c2's key is also the smallest number (8 vs 49, 392); the 392 m choice is easy to throw out on
  size alone. Optional: make a wrong choice closer, e.g. “56 ÷ 2 ÷ 7, so the base is 4 m” (halving like a triangle).

## Sheet 2 · Roof Lines

- **FIX · p5 (Level 3) `area 42, base 12 → height`:** the same move as Example 2 (worked on this sheet), key ideas k5–k6
  and the third mix-up, with new numbers: double, then divide. It is the triangle twin of Sheet 1's Level 2 p4, so it is
  not harder in a real way. Give it a second step like Sheet 1 p5, e.g. “Two triangle sails have the same height. Sail A
  has a base of 8 ft and an area of 28 square ft. Sail B has a base of 12 ft. What is the area of sail B?” (height 7,
  area 42). p6 is a fine Level 3.
- JUDGMENT · c1 (which segment is the height): the picture draws AD as the only dashed segment with the square mark,
  and the whole sheet teaches “the height is the dashed line”, so a student can answer by spotting the dashes without
  thinking about the base line. Options: draw AD solid (keep only the square-corner mark at D), or add a dashed distractor
  such as a dashed median from A to the middle of BC with no square mark.
- JUDGMENT · c2 (Pip's height 3): the key (“She left out the 2 ×”) restates the third mix-up (“Not doubling when working
  backward”) on the same sheet. Same note as Sheet 1.
- JUDGMENT · `½` typed as a glyph: “22½” (p4) reads as unread and “½” / “one-half” are refused in k1, while the sheet
  itself prints ½ in every formula. Small: consider reading ½ as 1/2 in the unit's number-word patch and adding
  “one-half” to k1.

## Sheet 3 · Rooms

- **FIX · c1 (which expression gives the area):** the key `9 × 6 − 2 × 2` is the only choice with multiplication; the two
  wrong choices (`9 + 6 − 2`, `9 + 6 + 2`) are sums of lengths that no student who knows area multiplies would pick, and
  they look alike, so the key is the odd one out. The number bots also see the key as the largest value (50 vs 13, 17).
  Keep the key; change the wrong choices to real area mistakes, e.g. `9 × 6 + 2 × 2` (adding the missing piece, = 58,
  the first mix-up) and `(9 − 2) × (6 − 2)` (shrinking both sides, = 35). Then the key is the middle value and every
  choice multiplies.
- JUDGMENT · c2 (Pip's 100): the key (“10 × 4 for the roof, with no ½”) is the third mix-up (“Forgetting the ½ on the
  roof”). Same note as Sheets 1 and 2; across the unit, 4 of the 6 Spot-the-mix-up keys are the sheet's own mix-up boxes.
- KEEP · p5 (Level 3 trapezoid) follows Example 2's method with new numbers (7/13/5 vs 6/10/4), but it has real extra
  steps (find the triangle bases from 13 − 7, two triangles, add), and the answer adds a decimal (7.5 each).
- KEEP · p6 (rectangle + nook − closet) is clear: one reading only.


## Recheck after round 2 (Build 2)

A fresh blind solver re-solved only the changed items, from the student view (content file, built pages, engine). Answers
were written down first, then judged by the built page's own `judge()` (run in headless Chromium against the page's `acc`
hashes). Keys opened only after. Key checks ✅ and `notes-test-wise.mjs --units g6-houses,g6-harbor,g6-post,g6-show`: 4 of 4 pass.

| Item | My answer | Matched first | Verdict |
|---|---|---|---|
| S1 c1 | She multiplied the base by the slanted side (11 × 6 = 66) | yes | KEEP: each wrong choice can be tested and gives 34 / 32, not 66 |
| S2 c1 | AD | yes | KEEP: AD, AB and BD are now all solid; the only cue left is the square-corner mark at D on the carried-on base line, which is the real idea. Still found the height easily. (The alt text says “A solid segment goes from A down to D, and D has a square-corner mark”: that is the picture, not a giveaway.) |
| S3 c1 | 9 × 6 − 2 × 2 | yes | KEEP: the earlier FIX is done. Every choice multiplies; values 54 (ignores the corner), 24 (takes off strips), 50 (key, the middle value). |
| S2 p5 | 42 (height 2 × 28 ÷ 8 = 7, then ½ × 12 × 7) | yes | KEEP: the earlier FIX is done; a real two-step Level 3. |
