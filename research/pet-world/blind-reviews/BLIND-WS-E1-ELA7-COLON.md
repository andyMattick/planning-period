# 🙈 Blind solve: ⏸️ Pause Library note sheets (ela7-colon, Build 1)

Fresh solver, student view only: `scripts/notes/ela7-colon-content.mjs`, the built `public/notes/ela7-colon/station-N.html`,
and the engine (`scripts/notes/engine/notes.js`) for its canon functions. I did not open the key file, the teacher copies,
the review packet or any key-check output until every answer was written down. Then I hashed each answer as
`PWN1|ela7-colon|s<n>:<item>|<canonical>` with the engine's canon (blanks: number `p/q` or squeezed lowercase; typed words:
`textCanon`; typed sentences: `s:` + `sentCanon`; Your-turn choices: `opt:` + `sentCanon`; Spot the mix-up: `opt:` +
`textCanon`) and compared it with each page's stored `acc` hashes. I read `window.PWN` from each page with `node:vm`.

After that I ran:
- `check-notes-keys.mjs ela7-colon`: ✅ 119 items, 198 right hashes, no miss is a right answer, 45 choice sets with no equal values.
- `notes-test-wise.mjs --units ela7-colon`: ✅ 45 choice sets, chance 31%. The best strategy was learnedCV at 35%
  (learnedXU was 38%, advisory). Longest 30%, shortest 30%, middle 33%, odd one out 19%, converge 28%, and positions
  A/B/C/last 31/33/29/29%. **No strategy was more than 10 points above chance.**
- `--items` was used for the per-item cue tags quoted below.

**Result:** 118 of 119 auto-checked items matched on my first answer. The one miss is a refused typed form, not a wrong key:
`three` on L9 k1-1. No key is factually wrong. No right answer or typed-sentence answer can be read in a student page.
I grepped every typed key; the only hits are words the prompt itself uses, like “holds”.

## Totals

| Lesson | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|
| 1 Introduction to colons | 14 | 14 | 1 | 1 | 28–32 |
| 2 Introduction to semicolons | 13 | 13 | 1 | 2 | 29–33 |
| 3 Using semicolons and commas | 13 | 13 | 1 | 0 | 28–32 |
| 4 Using semicolons and colons | 13 | 13 | 1 | 1 | 28–32 |
| 5 Italics, underlines, and quotation marks | 13 | 13 | 1 | 2 | 27–31 |
| 6 Introduction to parentheses | 14 | 14 | 0 | 0 | 28–32 |
| 7 Introduction to dashes | 13 | 13 | 1 | 1 | 27–31 |
| 8 Dashes and hyphens | 13 | 13 | 0 | 0 | 28–32 |
| 9 Introduction to ellipses | 13 | 12 | 1 | 2 | 29–33 |
| **All** | **119** | **118 (99%)** | **7 (+1 unit-wide, U2)** | **9 (+1 unit-wide, U3)** | all inside 25–35 |

The pages say “About 30 minutes a sheet”. The key file's own count is 30, and I agree with it. The three typed sentences
on lessons 2, 6 and 9 take the longest.

## Unit-wide

**Typed forms probed.** Capitals were forgiven everywhere. Missing end marks on typed sentences got a “near” or a specific
why-wrong message (“Good colon! Now end the sentence with a period.”).

Accepted:
- `:` / `colon` / `a colon`
- `;` / `semi colon`
- `,` / `comma`
- `quotes` / `quotation mark`
- `italic`
- `show` (TV) and `forward` (L4)
- `W.H.O.`
- `two` and `2` (L7 p2)
- `yet` (L3 p3)
- L9 p4 with `...` or `…`, with or without quotation marks, with spaces or with none
- curly or straight apostrophe in `Tempo’s` (L2 p5)

Refused:
- `three` (L9 k1-1)
- `semi-colon` / `semi-colons`
- `em-dash` (while `em dash` and `emdash` pass)
- `forcefully` / `powerfully` (L7 k3-1)
- `italicized`
- `quote marks` / `quotations`
- `clause` / `independent clause` (L1 k1-1)
- `. . .` (spaced periods, L9 p4)
- `colons` (L1 t1)

**Length, position and converge.** The numbers are in the header. Length is balanced: L/M/S = 7/30/8 across the 45 sets.
Converge was tagged on 13 sets but wins only 28% overall, which is below chance.

**FIX (unit-wide, accepted forms) U1: `three` is refused on L9 k1-1** (“An ellipsis is {} dots in a row.”), and only `3` passes.
- The key lists both `three` and `3`.
- The build hashes blanks with number words switched on, so `three` becomes `3/1` and is stored only once.
- On the page, `WORD_NUMS` is off because the unit sets `texts` (`WORD_NUMS = … : !U.texts`). The page hashes `three` as the
  text `three`, which was never stored.
- `check-notes-keys` can't see this because it uses the build's canon.
- Fix: set `numberWords: true` in the unit, or have the build also store the `textCanon` hash for blank answers that are
  number words. It is worth checking other units that have `texts` and number-word blanks.

**FIX (unit-wide, accepted forms) U2: `semi-colon` is refused, but `semi colon` is accepted.**
- This affects L2 t1, L2 p2, L2 k4-1 (`semi-colons`), L3 k1-1, L4 p1 and L4 p5.
- `semi-colon` is a common spelling, and a 6th grader will type it.
- Accept `semi-colon` / `semi-colons` wherever `semicolon` is accepted.

**JUDGMENT U3: the word canon turns long dashes into hyphens** (`normText` maps `—` and `–` to `-`). So on the hyphen lesson,
`thirty—four` (L8 t1), `well—loved` (L8 p1) and `well–known` (L8 p6) are accepted. It is engine-wide and hard to type a
real dash on a keyboard, so I lean KEEP. But it is the exact mix-up L8 teaches.

**JUDGMENT U4: L5 refuses `italicized` (p1) and `quote marks` / `quotations` (p4, p6).** I'd accept all three. They name
the right style.

**JUDGMENT U5: L1 k1-1 refuses `clause` and `independent clause`.** Both are right, though the sheet never uses the word.
Accept `independent clause` at least.

## Lesson 1

- **FIX p6 (L3)**
  - Item: “Check the time first, then the mark after it.”
  - My answer and the page's: `At 9:30 Tempo had one job: dust the atlases.`
  - Problem: the key is the only choice with `9:30`. All three wrong choices have `9;30`, so step 1 alone picks the key, and
    the second colon never has to be checked. That makes it a Level 3 item with no real second step.
  - Change: give two wrong choices the right time and a bad second colon, e.g. `At 9:30 Tempo had: one job, dust the atlases.`
    and `At 9:30, Tempo had: one job, dust the atlases.` Keep `At 9;30 Tempo had one job: dust the atlases.` and update
    their why-wrong messages.
- JUDGMENT U5 (k1-1), above.

## Lesson 2

- **FIX c2 (giveaway)**
  - My answer and the page's: `Our pen pals live in Rome, Italy; Lima, Peru; and Oslo, Norway.`
  - Problem: this is the same sentence and the same three cities as Example 2 on the same sheet (“Tempo’s pen pals live in
    Rome, Italy; Lima, Peru; and Oslo, Norway.”). She can match it without thinking.
  - Change: use new places in all three choices, e.g. Paris, France / Cairo, Egypt / Quito, Ecuador. Don't reuse
    Austin / Reno / Mesa, which are in s2.
- **JUDGMENT p1**
  - My answer and the page's: `The owl hooted; the mice froze.`
  - Problem: all three wrong choices start “When the owl hooted”, so the key is the only one without “When” (odd one out).
  - Change: replace `When the owl hooted; the mice, froze.` with the comma splice `The owl hooted, the mice froze.`
- **JUDGMENT p3**
  - My answer and the page's: `The atlas is heavy. | It needs two hands.`
  - Problem: the key shares its first half with one wrong choice and its second half with the other (converge).
  - Change: replace one wrong choice with a pair that shares neither half, e.g. `Since the shelf is low. | Tempo can reach it.`
- U2 (`semi-colon`), above.

## Lesson 3

- **FIX p2**
  - Item: Tempo spots one comma splice.
  - My answer and the page's: `The clock struck six, the lamps dimmed.`
  - Problem: the three wrong choices are near-copies of each other (“As the clock struck six, the lamps/lights dimmed
    (slowly).”). They differ only by lamps/lights/slowly, and they aren't mix-ups. The key is the only sentence without “As”.
  - Change: keep `As the clock struck six, the lamps dimmed.` and replace the other two with correct joins that are not
    splices: `The clock struck six; the lamps dimmed.` and `The clock struck six, and the lamps dimmed.` Then she has to
    check the mark.
- KEEP c2. The comma after “and” is a real mix-up. Optional: drop the extra “up” in `…the dust flew up.`

## Lesson 4

- **FIX p5 (L3)**
  - My answer and the page's: `semicolon`
  - Problem: “Type the mark for blank 2” can be answered from blank 2 alone, so it is a Level 3 item with no real second step.
  - Change: ask for both marks in order (e.g. “Type the two marks in order, like `, ;`”). Accept `: ;`, `:;`,
    `colon semicolon` and `colon, semicolon`.
- **JUDGMENT c1**
  - My answer and the page's: `The second part names the snack, so it needs a colon.`
  - Problem: both wrong choices begin “The second part is a full sentence”, so they pair up and the key is the odd one out.
  - Change: make one wrong choice share the key's first half, e.g. `The second part names the snack, so it needs a comma.`

## Lesson 5

- **FIX c2**
  - My answer and the page's: `a play called The Paper Moon`
  - Problem: both wrong choices are titled “The Paper Boat”, so the key is the only choice with a different title.
  - Change: give the play the same title, `a play called The Paper Boat`, or give all three different titles.
- **JUDGMENT p6 (L3)**
  - My answer and the page's: `quotation marks`
  - Problem: the prompt already says “favorite chapter”, so step 1 (decide what Turtle Bay is) isn't needed.
  - Change: drop “chapter” from the quote (e.g. “My favorite part of Turtle Bay is The Long Swim.”) and say in the stem
    that it is one chapter. Or ask how Turtle Bay should look once she is told The Long Swim is its chapter.
- JUDGMENT U4, above.

## Lesson 6

No FIX or JUDGMENT items. All 14 items matched. Typed sentences p4 and p5 give the right why-wrong messages for a period
in the wrong place.

## Lesson 7

- **FIX k3-1**
  - Item: “Dashes set off a detail more {} than commas or parentheses.” Hint: “With more force. Ends in -ly.”
  - My answer and the page's: `strongly`
  - Problem: `forcefully` is refused, though the hint describes it word for word. `powerfully` is refused too.
  - Change: accept both.
- **FIX t1 (accepted forms)**: `em-dash` is refused while `em dash` and `emdash` pass. Add `em-dash` / `an em-dash`.
- **JUDGMENT c2**
  - My answer and the page's: `To make the reader stop before a surprise`
  - Problem: both wrong choices are “to join…” (a hyphen's job) and nearly say the same thing, so they pair up.
  - Change: replace one with another mark's job, e.g. `To show that words were left out` (ellipsis).

(I count t1 and k3-1 as one FIX row for Lesson 7 in the table, since both are accepted-form changes.)

## Lesson 8

No FIX or JUDGMENT items beyond U3 (a long dash is accepted as a hyphen on t1, p1 and p6). The hyphen why-wrong messages
work: `thirty four` and `well loved` get “Close!” / “Keep the two words apart with a short hyphen.”

## Lesson 9

- **FIX k1-1**: `three` is refused. See U1.
- **JUDGMENT p1 and c2 (shape cue)**
  - My answers and the page's: p1 `“Maybe we could…” Pia said, and stopped.` and c2 `“I looked and saw… nothing,” Tempo said.`
  - Problem: in both, the key is the only choice that is speech with the tag after it and the dots touching the word. The
    wrong choices are always `X said, “… …”` with spaced dots. A student can learn “no space = pause” without reading.
  - Change: give one wrong choice in each the speech shape with snipped words, e.g. `“The desk … opens at nine,” Tempo said.`
- JUDGMENT p4: `. . .` (spaced periods) is refused. The prompt says “three periods”, so this is minor. Accept it if it's cheap.

## FIX list

1. U1 / L9 k1-1: `three` refused (build/page number-word canon mismatch)
2. U2: `semi-colon` refused (L2, L3, L4)
3. L1 p6: Level 3 key is the only choice with the right time
4. L2 c2: same sentence as Example 2
5. L3 p2: wrong choices are near-copies; key is the only one without “As”
6. L4 p5: Level 3 with no second step
7. L5 c2: key's title is the odd one out
8. L7 k3-1 / t1: accept `forcefully`, `powerfully`, `em-dash`
