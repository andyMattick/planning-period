# 🙈 Blind solve: ⚓ Pet Harbor note sheets (g6-harbor, Build 1)

Fresh solver, student view only (`scripts/notes/g6-harbor-content.mjs` and the built `public/notes/g6-harbor/station-N.html`).
No key file, teacher copy, review packet or key-check script was opened before every answer was written down. Each answer
was hashed as `PWN1|g6-harbor|s<n>:<item>|<canonical>` with the engine's own canon functions (engine in `node:vm`, with the
unit's `enginePatches`) and compared with the page's `acc` hashes. Then `check-notes-keys.mjs g6-harbor` ✅ (44 items, 59
right hashes), `check-g6-harbor-keys.mjs` ✅ (44 solved independently, choice sets clean) and
`notes-test-wise.mjs --units g6-harbor` ✅ (6 choice sets, no strategy more than 10 points over chance 33%).

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|
| 1 Lighthouse | 15 | 15 | 0 | 1 | 28–32 |
| 2 Docks | 14 | 14 | 0 | 3 | 27–31 |
| 3 Shipyard | 15 | 15 | 3 | 1 | 29–33 |
| **All** | **44** | **44 (100%)** | **3** | **5 (+1 unit-wide)** | all inside 25–35 |

No math key is wrong, no item is unsolvable, no two choices are equal. KEEP: the other items.

## Unit-wide

- **Typed forms (probed):** −5 / -5 / “negative 5” / “negative five” / “-5 units” accepted; quadrants “II”, “ii”, “Quadrant II”,
  “Quadrant 2”, “quadrant two”, “two”, “second”, “2nd” all read as 2 (same for III/third/3rd and IV/fourth/4th); word
  numbers “nine”, “fourteen”, “twenty-two”, “twenty two”, “fifty-two”, “ninety meters”; “10 1/2”, “10.50”, “21/2”,
  “ten and a half”; units “15 square units”, “15 units²”, “15 units^2”, “15 sq. units”, “15u2”, “$52”, “52 dollars”,
  “90 m” all accepted. “5” for the try-it (−5) is refused, as it should be.
- **Number-word patch vs word blanks:** the six word blanks (origin, y, x, vertical, subtract, negative, vertices, around)
  all still match; the blank judge always tries the text form too, and none of the key words parse as a number
  (“negative” alone parses to nothing). “y-axis” / “y axis” are accepted for the axis blanks. No word blank is broken.
- **Length / position (6 choice sets, 3 options):** longest 33%, shortest 42%, middle 25%, odd one out 17%, converge 17%,
  each shown position 33%. **No pattern.** But the bots measure shape, not content: see S2 c1 and S3 c1 below, where the
  key is the only choice that moves the right coordinate / uses the question's numbers.
- **Pictures:** every plane has every gridline and every axis number, points have a dot and a bold letter with a white
  halo, so S1 p1 (A at x = −4) and S2 p2 (F, G 8 apart) are readable at 375 px and in black-and-white print (gridlines
  #A3A3A3, the light-blue fill prints as pale grey). No `picAlt` gives an asked value (S1 p1 alt names only the letters;
  S2 p2 alt says “same horizontal line below the x-axis”, which is the setup, not the answer).
- **Sheet count and minutes:** every page says “3 sheets” and “About 35 minutes a sheet”; my count of required work is
  27–33, inside 25–35.
- **JUDGMENT (unit-wide): the pair x = −4 … 2 and −6 … 3 is reused a lot.** −4 to 2 shows up in S2 Example 1, S3 Example 1,
  S3 p3 and S3 c2; −6 to 3 in S2 c2, S2 p5 and S3 p6. Fresh pairs would make each item stand on its own.

## Per sheet

**Sheet 1 (Lighthouse)**
- KEEP: L3 p5 (two reflections) and p6 (reflect, then move) each have a real second step.
- JUDGMENT k4-1 / k5-1: “the y” and longer phrasings are refused; fine for a one-letter blank.

**Sheet 2 (Docks)**
- JUDGMENT c1 (rock 5 units left of (−1, 4)): both wrong choices `(−1, 9)` and `(−1, −1)` move up/down, so the key
  `(−6, 4)` is the only one that changes x; “left changes x” alone picks it, and the two wrong ones pair up (key = odd one
  out by content). Replace one with a wrong-direction choice, e.g. `(4, 4)` (moved right) or `(−6, −1)`.
- JUDGMENT c2 / p5: Kai's boats (−6, 2) and (3, 2) are 9 apart; p5 (ferry dock (−6, 4), fish market (3, 4)) is the same
  9 units then ×10. Change c2 to (−7, 2) and (4, 2) (“Kai says 3 units”), keeping the same three choices.
- JUDGMENT k5-1 “A distance is never {}” (= negative): “less than zero” and “below zero” are refused; accept them.

**Sheet 3 (Shipyard)**
- **FIX c1** (fourth corner of (−3, 4), (2, 4), (2, −1)): wrong choices `(3, 1)` and `(1, 3)` have no minus signs, use
  numbers not in the question, and are each other's swap, so the key `(−3, −1)` is the only choice built from the
  question's numbers. Use mix-up choices instead, e.g. `(−1, −3)` (order swapped) and `(3, −1)` (sign of x dropped).
- **FIX p3** (perimeter of (−4, 3), (2, 3), (2, −2), (−4, −2)): this is exactly the rectangle of Example 1
  (A(−4, −2), B(2, −2), C(2, 3), D(−4, 3)), whose steps already find the 6 and 5 sides. New corners, e.g. (−5, 4),
  (3, 4), (3, −2), (−5, −2) → 8 by 6, perimeter 28.
- **FIX k4-1** “Perimeter is the distance {} a shape” (= around): “all around” and “around the outside of” are refused
  though they read naturally in the sentence; accept them (and “round”).
- JUDGMENT p1 / k2-1 / c1: the same “find the fourth corner of a rectangle” task three times on one sheet, and p1's hint
  says the answer's rule outright. Consider making p1 a side-length or a corner below an axis.
- KEEP: p5 (length → width from area → count up) and p6 (perimeter → cost) are real two-step Level 3s; p4's picture
  shows no corner labels and the question gives the coordinates, so nothing is given away.


## Recheck after round 2 (Build 2)

A fresh blind solver re-solved only the changed items, from the student view (content file, built pages, engine). Answers
were written down first, then judged by the built page's own `judge()` (run in headless Chromium against the page's `acc`
hashes). Keys opened only after. Key checks ✅ and `notes-test-wise.mjs --units g6-houses,g6-harbor,g6-post,g6-show`: 4 of 4 pass.

| Item | My answer | Matched first | Verdict |
|---|---|---|---|
| S1 c2 | He changed the sign of y (x-axis rule) | yes | KEEP: the other two give (−6, −1) and (1, 6), not (6, −1) |
| S2 c1 | (−6, 4) | yes | KEEP: (4, 4) = moved right, (−1, −1) = moved down; both real mix-ups |
| S2 c2 | He subtracted, but the boats are on opposite sides (7 − 4 = 3) | yes | KEEP: key is the shortest (51 vs 64, 75 chars) but the unit's length bots stay at or under chance |
| S3 c1 | (−3, −1) | yes | JUDGMENT: (−1, −3) is a fair swap mistake, but (1, −3) is not a mistake a student would make. Optional: (2, −4) or (−3, 1) (sign slip). |
| S3 c2 | She added the four sides (7 + 4 + 7 + 4 = 22) | yes | KEEP: half (14) and 4 − 3 (area 4) are checkable mix-ups |
| S3 p1 | 7 | yes | KEEP |
| S3 p3 | 28 (8 by 6) | yes | KEEP: both sides cross an axis |
