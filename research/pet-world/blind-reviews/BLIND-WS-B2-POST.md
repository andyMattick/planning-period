# 🙈 Blind solve: 📝 Pet Post Office note sheets, Build 1 (g6-post)

Fresh solver, student view only (`scripts/notes/g6-post-content.mjs` and the built `public/notes/g6-post/station-N.html`).
Every answer was written to a scratch file first, then hashed as `PWN1|g6-post|s<n>:<item>|<canonical>` with the
engine's own canon functions (the patched engine as inlined in each page, run in `node:vm`, judged the way `judge()`
does: number canon for every box, plus the word canon for key-idea blanks, `opt:` canon for choices) and compared with
the page's `acc` hashes. The keys file, key check, teacher copies and review packet were opened only after that.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | KEEP | JUDGMENT | Required minutes (page / my estimate) |
|---|---|---|---|---|---|---|
| 1 Sorting Room | 18 | 18 | 0 | 15 | 3 | 34 / about 30 |
| 2 Packing Room | 15 | 15 | 0 | 12 | 3 | 34 / about 33 |
| 3 Box Folding | 14 | 14 | 0 | 11 | 3 | 34 / about 35 |
| 4 Wrapping Desk | 14 | 14 | 1 | 11 | 2 | 34 / about 35 |
| **All** | **61** | **61 (100%)** | **1 (+1 unit-wide)** | **49** | **11** | all inside 25–35 |

No math key is wrong. No item has zero right answers. No two choices are equal.
`node scripts/notes/check-notes-keys.mjs g6-post` ✅ (61 items, 74 stored right hashes, 8 choice sets clean).
`node scripts/notes/check-g6-post-keys.mjs` ✅ (61 items solved independently).
`node scripts/notes/notes-test-wise.mjs --units g6-post --verbose` ✅ (8 sets, chance 33%; highest strategy posB/posC/posLast
38%; the one number set, S1 c2, is middle value and round, a single set).

## Unit-wide

- **FIX · number words with “and” after hundred:** “one hundred and twenty” (S2 p4), “one hundred and thirty-two”
  (S3 p4), “one hundred and four” (S4 p2) come back *unread*: the `pwWords` patch flushes the number at every “and”, so
  it reads “100 20”. “one hundred twenty” and “a hundred twenty” work. Many kids say the “and”. Suggested patch: in
  `pwWords`, skip `and` when the word before is `hundred` and the next word is in `U` or `T`
  (`if (w === 'and' && t[i - 1] === 'hundred' && (U.hasOwnProperty(t[i + 1]) || T.hasOwnProperty(t[i + 1]))) continue;`),
  before the existing `and` rule, so “two and a half” still splits.
- **Forms probed** (accepted unless noted): six, twelve, fifteen, twenty-four, “twenty four”, sixty, seventy-six,
  six hundred, one hundred thirty-two; 24 cubes, 6 flat sides, 15 edges, 7 feet tall, 78 more, 4 sheets; 60 ft³,
  60 ft^3, 60ft3, 60 cubic feet, 60 cu ft, 84 in³, 84 cu in, 48 cm^3, 48cm3, 4 in², 4in2, 4 sq in, 54 in^2, 20 cm^2,
  104 sq ft, 600cm2; 1/8 as one eighth, an eighth, one-eighth, 0.125, .125, 1 / 8; 45/4 as 11 1/4, 11.25,
  “11 and 1/4”, “eleven and a quarter”, “eleven and one fourth”, “11.25 cubic feet”. Blanks: faces, edges, vertices,
  vertice, two, “2 bases”, “only one”, “1 base”, bases, Square, cube, tall, depth, h, bottom, nets, lid, sq,
  “2 times”. Missed with a kind message: corner (k1-3), 3.2 and 3 (S4 p6). Refused, fine: “a face”, “an edge”,
  “a net”, “the base”, “the top” (the sentence already has the article), vertexes, point, squared, cubed,
  “cubic units” (the sentence already says units), twice.
- **Pictures:** every figure is 313 px wide at 375 px, no side scroll on any sheet. Labels read at that size. All are
  black-and-white safe (letters on faces, dashed fold lines, dotted slant height). No picture or `picAlt` labels an
  asked length, area or volume. S3 c1’s net shows 4 triangles, which is the point of the question (KEEP).
- **Choice positions:** B A / C B / C A / B C (A 2, B 3, C 3), no runs.
- **Level 3:** every Level 3 item has a real second step (S1 p5/p6 work back to the base shape; S2 p5 count then ÷ 8,
  p6 base area then ÷; S3 p5/p6 work back from surface area; S4 p5 two surface areas and a difference, p6 surface area
  then round up sheets). KEEP.
- **Sheets and minutes:** every page says 4 sheets and “About 35 minutes a sheet, plus the video”; each sheet’s
  required parts add to 34. KEEP.

## Sheet 1 · Sorting Room

- JUDGMENT · k1-2 “is called an {}”: the article “an” tells her the word starts with a vowel (edge, not face or line).
  Suggest “The line where two flat sides meet is called the {} of the solid” or leave it (the hint already gives it).
- JUDGMENT · k4-1 and k5-1: the hints give the answer outright (“4 corners on the top and 4 on the bottom”; “Try a cube:
  6 + 8 − 12”, which also states k4’s 8), and Example 1’s check line shows “= 2”. Fine for notes, but the k5 hint could
  say “Try it on a cube, using the numbers in the idea above” so k4 is not handed over.
- JUDGMENT · k2-2 “A pyramid has {} base”: the singular “base” points to one. Low stakes; KEEP if the owner prefers.
- KEEP · c1 (the P on the corner): the dot sits on the back-right top corner, clearly a point; options all define their
  word, similar lengths. c2 (pentagonal pyramid 10): distractors 6 (faces) and 15 (prism edges) are real mix-ups.

## Sheet 2 · Packing Room

- JUDGMENT · k4-1 / k4-2 (1/8 and 8): the first blank’s hint (“(1 × 1 × 1) / (2 × 2 × 2)”) and the second’s (“How
  many eighths make 1 whole?”) each give the other’s answer, and Example 2 states “½ × ½ × ½ = 1/8 cubic inch” and the
  mix-up tip “8 half-inch cubes make 1 cubic inch”. A key copied from the page; acceptable for a key idea, owner’s call.
- JUDGMENT · c2 (24 × h = 288): the key is the only option not written as “h = …”, so the odd-one-out reader picks it
  (the bot’s oddOne is fine over 8 sets, so not a FIX). Suggest wrong choices in the key’s form: “288 × h = 24” and
  “24 + h = 288”.
- JUDGMENT · c1: both wrong choices are easy to rule out (the edges add to 5 in; the bottom layer is 16), so a kid who
  sees 4 × 4 × 2 = 32 needs no thought. Optional: a wrong choice that also makes 32, e.g. “He doubled the bottom layer
  instead of multiplying by the height.” (16 × 2 = 32, but that is the same count, so it is not wrong: avoid it). Leave
  as is unless the owner wants a harder c1.
- KEEP · p3 (45/4) takes every mixed, decimal and word form tried. p5 and p6 are real two-step Level 3.

## Sheet 3 · Box Folding

- JUDGMENT · c1 (net of 4 triangles): “triangular” is in the key only, “rectangular” in both wrong choices. Suggest
  “a triangular prism” in place of “a rectangular prism”, so each word shows up twice.
- JUDGMENT · k4-1: “areas” is refused (“Surface area is the total {} of all the faces”), while S1 takes faces/edges
  and S2 takes bases. Suggest accepting “areas”.
- JUDGMENT · Example 2 picture: the letter B sits on top of the dotted slant-height line in triangle B, and “6 in” sits on
  the fold line between A and D. Readable, but move B to one side of the dotted line. (The content comment says
  “nothing is drawn to scale”, yet the nets are drawn from their real lengths. Harmless, since every length she needs is
  labeled; reword the comment.)
- KEEP · p1–p6 pictures match their questions (5 × 4 face A in p2, the 3-4-5 triangles on the 4 cm face in p4).
  c2 is clean. Note: c2’s cube with 4-inch edges is the same cube as S4 p1 (SA 96); c2 never shows 96, so KEEP.

## Sheet 4 · Wrapping Desk

- **FIX · k1-1 (2):** the answer is printed in the same sentence: “its surface area is 2(lw) + 2(lh) + 2(wh). Each face
  area is counted {} times.” Suggest: “A box has 3 pairs of matching faces: top and bottom, front and back, the two ends.
  So in the surface area, each face area is counted {} times.” and let Example 1 show the expression.
- JUDGMENT · k2-1: “slanted” and “slanting” are refused for “the {} height”. Suggest accepting them (not “slant
  height”, which doubles “height”).
- JUDGMENT · c1: the key is the convergent option (shares the 2’s with one wrong choice and the × with the other). The
  bot’s converge is 25% over the unit, so not a FIX; to break it, make one wrong choice keep both features, e.g.
  “2(7 × 3) + 2(7 × 2)” (the ends left out) in place of “(7 × 3) + (7 × 2) + (3 × 2)”.
- KEEP · c2 (each triangle as a full 4 × 9 rectangle): the wrong choices are checkable against Ben’s sum. p6 rounds up
  to 4 sheets with kind messages for 3.2 and 3.


## Recheck after round 2 (Build 2)

A fresh blind solver re-solved only the changed items, from the student view (content file, built pages, engine). Answers
were written down first, then judged by the built page's own `judge()` (run in headless Chromium against the page's `acc`
hashes). Keys opened only after. Key checks ✅ and `notes-test-wise.mjs --units g6-houses,g6-harbor,g6-post,g6-show`: 4 of 4 pass.

| Item | My answer | Matched first | Verdict |
|---|---|---|---|
| S2 c2 | 24 × h = 288 | yes | KEEP |
| S3 c1 | a triangular pyramid (net of 4 triangles) | yes | KEEP: the hint (“any face that is not a triangle?”) helps but does not give it away |
| S3 c2 | She found the space inside instead of the faces (volume) | yes | JUDGMENT (small): choice C, “the distance around one face for each side”, can be read as 16 × 4 = 64, which also makes Mia's number. Most students will read “each side” as the 6 faces (96), so it is still one best answer, but “for each of the 6 faces” would close it. |
| S4 c1 | 2(7 × 3) + 2(7 × 2) + 2(3 × 2) | yes | KEEP: one pair missing and the sum/product mix are real mix-ups |
| S4 c2 | He counted each triangle as a full 4 × 9 rectangle | yes | KEEP: 16 + 4 × 36 = 160 checks; the others give 144 / 70 |
| S4 k1 | 2 | yes (“2”, “two”) | KEEP: “twice” is refused, but the sentence says “{} times”, so that is fine |
