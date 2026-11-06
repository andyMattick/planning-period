# 🙈 Blind solve: 🎡 Pet Fair note sheets (g6-fair, Build 1)

Fresh solver, student view only (`scripts/notes/g6-fair-content.mjs` and the built `public/notes/g6-fair/station-N.html`,
pictures included). No key file, teacher copy, review packet or key-check script was opened before every answer was
written down. Each answer was judged by the built page's own `judge()` (the patched engine, run in headless Chromium against
the page's `acc` hashes, with the same `kind` the page passes: `blank`, `num`, `word`, `choice`), which hashes
`PWN1|g6-fair|s<n>:<item>|<canonical>`. Then:

- `node scripts/notes/check-notes-keys.mjs g6-fair` ✅ 85 items, 160 right hashes, 26 choice sets with no equal values
- `node scripts/notes/check-g6-fair-keys.mjs` ✅ 85 items solved independently, choice sets clean
- `node scripts/notes/notes-test-wise.mjs --units g6-fair --items` ✅ exit 0 (26 choice sets, chance 32%; highest cue
  notLongest 38%, oddOne 36%, specific 36%; advisory learnedXU 42%). Nothing over chance + 10.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | KEEP | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|---|
| 1 Ticket Booth | 15 | 15 | 1 | 12 | 2 | 30–34 |
| 2 Ring Toss | 14 | 14 | 1 | 13 | 0 | 28–32 |
| 3 Story Tent | 14 | 14 | 1 | 12 | 1 | 27–31 |
| 4 Ride Line | 14 | 14 | 0 | 12 | 2 | 25–29 |
| 5 Ferris Wheel | 14 | 14 | 1 | 12 | 1 | 27–31 |
| 6 Prize Counter | 14 | 14 | 1 | 12 | 1 | 27–31 |
| **All** | **85** | **85 (100%)** | **5** | **73** | **7 (+1 unit-wide)** | all inside 25–35 |

No key is wrong, no item is unsolvable, no two choices are equal in value. Every FIX below changes wrong choices or
wording only, never a key.

## FIX

- **S1 p3** (which equation matches the hanger: 3 x blocks + 4 ones = 13 ones). The two wrong choices `4x + 3x = 13` and
  `7x = 13` are **the same equation** (4x + 3x is 7x), so a student can throw both out without reading the hanger.
  Replace `7x = 13` with `4x + 3 = 13` (swapped the counts of blocks and ones), keeping `4x + 3x = 13`.
- **S2 p3** (one move that solves x − 4/5 = 1 1/5). The key says “to **both** sides”; the two wrong choices say
  “from **each** side” / “each side”. The wording alone marks the key. Use the same phrase in all three, e.g.
  `Subtract 4/5 from both sides.` and `Divide both sides by 4/5.`
- **S3 c2** (“a number divided by 6 is 3” written as 6 ÷ x = 3). Both wrong choices are false just by rereading the
  sentence: the words never say “times”, and the 3 is right there in the words. Replace them with mix-ups that sound
  possible, e.g. `Gumdrop swapped the 6 and the 3.` and `Gumdrop used division when the words mean subtract.`
  (or another real misreading), keeping the key.
- **S5 p6** (which point (r, m) is on m = 5r + 2). The wrong choices `(17, 3)` and `(21, 3)` both put 3 second, so the key
  `(3, 17)` is the only point with r first, and “r comes first” alone finds it. Use four choices so every point has a
  partner: `(3, 17)`, `(17, 3)`, `(3, 15)` (forgot the + 2), `(15, 3)`. (With three, any third point makes the key the
  “centre” of the others.)
- **S6 p1** (tickets t for n games at 3 tickets each). The key `t = 3n` is the only choice that starts `t =`, and the
  question asks for “the tickets t”, so the form gives it away. Use four choices: `t = 3n`, `n = 3t`, `t = n + 3`,
  `n = t + 3` (the + 3 one is the sheet's own “adding instead of multiplying” mix-up).

## JUDGMENT

- **S1 p2** (equation for a tape of 3 x pieces under 24). Key `3x = 24` is the shortest and the only one without “+”;
  `24 + 3 = x` is not a mistake a student makes. Suggest `x + x = 24` (miscounted pieces) or `x ÷ 3 = 24` (read x as the
  whole) in place of `24 + 3 = x`.
- **S1 p6 (Level 3)** “Which of x = 4, 6 or 8 solves 3(x + 5) = 33?” is the same one-step test done three times, and the
  answer is one of three printed values. Add a decoy that a real mistake lands on, e.g. offer `x = 4, x = 6 or x = 11`
  (11 = 33 ÷ 3 with the + 5 forgotten), so the student must do the full test, not just eliminate.
- **S3 c1** (story for 5n = 40). The key is the only story that doesn't begin “Taffy has …”. Reword it to the same frame:
  `Taffy has 5 friends. Each wins n prizes, and they win 40 in all.`
- **S4 p3** (graph x ≤ 5: open or filled?) is idea k3-1 (“x ≤ 4 has a {} circle at 4”) with 4 changed to 5, a few lines
  above. Make it need a step, e.g. “A sign says ‘no more than 5 pets’. Taffy graphs it. Open or filled?”
- **S4 c2** (which sentence matches x ≤ 9). The key `x is 9 or less.` is the only one with “or”, and `x is more than 9.`
  is far off. Replace `x is more than 9.` with `x is 9 or more.` so the “or” is in two choices.
- **S5 p4** (equation through (1, 3), (2, 6), (3, 9), (4, 12)). `x = y + 2` fits no point at all. Replace with
  `y = x + 2`, which fits (1, 3) only: the sheet's own “checking only the first point” mix-up.
- **S6 p6 (Level 3)** reuses idea k5-1's setup word for word (stickers, bags of 8, b = s ÷ 8). Change the bag size, e.g.
  bags of 6 with 84 stickers (14 bags, give away 3 → 11), or keep it and change k5-1.

## Unit-wide

- **Typed forms (probed through `judge()`):** number words (“seven”, “twenty-five”, “seventeen and a half”, “three
  halves”), mixed numbers and fractions (17 1/2, 35/2, 9 1/2, 19/2, 1 1/2, 1½, 3 / 2), trailing zeros (25.0, 9.50, 17.50),
  units (“7 tickets”, “6 riders”, “11 years old”, “$4.50”, “4.50 dollars”) all accepted. ≥ / `>=` / “greater than or equal
  to” accepted for S4 k4-1. Word blanks accept sensible synonyms: open/empty/hollow/unfilled; filled/closed/solid/shaded/
  colored/full/“filled in”; greater/more/bigger/larger; subtract/subtracting/“take away”/minus; multiply/multiplying/
  times; check/test/verify; start/beginning/starting; x/X/x-axis/horizontal; same/“the same”/equivalent/equal;
  no/No/nope. Refused, and fine because the sentence already has the word or it doesn't fit: “the right”, “the start”,
  “equal to”, “checking”, “knows”, “multiply by”, “subtract 9”. Minor: “balanced” for S1 k1-1 and “x = 5” for S1 k4-1
  are refused; optional.
- **JUDGMENT (unit-wide): “x = 7” is read as no answer.** For typed number items, “x = 7”, “y = 42”, “r = 6” return
  `unread` (“Type a number, like …”); it costs no try, but it is a stumble on items that don't carry the NUM line
  (“Type just the number: for x = 10, type 10.”): **S1 p6** (“type the solution”, after choices written `x = 4, x = 6 …`),
  **S3 p2**, **S5 p2**, **S5 p3**, **S5 p5**, **S6 p5**. Add the NUM line to those, or add an engine patch that drops a
  leading `<letter> =` before `parseNum`.
- **Pictures:** tape diagrams show x pieces with a solid border, grey fill and italic x, number pieces with a dashed border,
  so they read in black and white. Hangers draw x as squares and ones as circles, at most 5 a row, with a key under the
  hanger; every count is countable at 375 px. Number lines label every integer 0–10; the open circle is white with a
  thick black ring and the filled one solid black, clear in print. Graphs have every gridline (#B8BEC6, light but
  visible in print) and labels every 2; the odd points in S5 p4 sit on gridlines and are readable. Tables bold the `?`.
  No picture or `picAlt` gives the asked value (alts describe the setup only).
- **Bots vs content:** the test-wise bot passes, but it measures shape. The FIX items above are content cues the bot
  can't see (equal wrong choices, “both” vs “each”, the only `t =`, the only r-first point).
- **Minutes:** every page says “About 35 minutes a sheet” and “6 sheets”; my count of the required work is 25–34 per sheet.
  S1 is the longest (two pictures to read per problem and a three-value test); S4 the shortest.

## KEEP (notable)

- S1 c1 (63 − 2 = 61: 6x read as 63) and S2 c1/c2, S5 c1, S6 c1: each wrong choice is a checkable different mistake.
- S2 p5, p6; S3 p5; S4 p5; S5 p5; S6 p5: real two-step Level 3s (solve, then use the answer).
- S6 p3: both wrong choices (`y = 2x + 4`, `y = x + 5`) fit the first row, so only checking more rows finds the key.
- S4 p2, p4, p6: four-way symmetric choice sets (circle × direction, sign × equal).

## Round 2 and rechecks (added by the lead)

- **Build 2** (the maker, round 2): all 5 FIX items and 7 judgments adopted (S1 p2, p3, p6; S2 p3; S3 c1, c2; S4 p3, c2;
  S5 p4, p6; S6 p1, p6), and the "Type just the number" line added to S3 p2, S5 p2, S5 p3, S5 p5 and S6 p5 (no number-reader
  patch). S6 p6 is a new question (84 balloons in bags of 6, 3 given away: 11). No other key changed.
- **Fresh recheck of the 17 changed items:** 17/17 matched on the first answer, no FIX. JUDGMENT 3: S3 c1 key the longest
  (63 against 44 characters); S4 p3 refused "filled circle" and "closed circle"; S4 c2 key the centre of the other two.
- **Build 3** (the lead): S3 c1's wrong stories are now as long as the key and in the same frame ("Taffy has 40 prizes. She
  gives 5 away, and then she has n left."); S4 p3 also takes "filled circle", "closed circle", "solid circle" and gives the
  mix-up message for "open circle". S4 c2 stays as it is (owner's call): a mix-up question must have exactly 3 choices, and
  every 3-choice set tried keeps "or" or "less" in the key alone; converge is 26% over the unit.
- **Second fresh recheck (Build 3, the 2 changed items):** both matched, both KEEP. Bots ok (worst notVote 36%, chance 32%).
