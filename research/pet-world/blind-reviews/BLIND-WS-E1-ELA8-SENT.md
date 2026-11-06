# 🙈 Blind solve: 🧩 Sentence Library note sheets (ela8-sent, Build 1)

**Blind rule followed.** I'm a fresh solver and didn't build these sheets. Before writing down every answer I opened only the student view:
`scripts/notes/ela8-sent-content.mjs`, the built `public/notes/ela8-sent/station-N.html` and the engine. I did not open the keys file,
the teacher copies, the review packet or any key-check output until then.

**What was run, in this order:**
1. I solved all 138 auto-checked items on paper (try it first, key-idea blanks, Your turn 1–6, Spot the mix-up c1–c2).
2. I hashed each answer as `PWN1|ela8-sent|s<n>:<item>|<canonical>`. The canon functions came out of `engine/notes.js`, with the
   page's own settings (number words off and unit marks off, because the unit has `texts`). Each hash was compared with the
   page's stored `acc` / `miss` / `near` hashes. I also probed about 60 typed variants this way. The three refusals I found
   were confirmed in Chromium by typing into the real page (Enter, fresh context).
3. `node scripts/notes/check-notes-keys.mjs ela8-sent` ✅ (138 items, 231 right hashes, no miss is right, 46 choice sets with
   no equal values). `node scripts/notes/notes-test-wise.mjs --units ela8-sent` (and `--items`) ✅ (46 sets, chance 31%, no
   strategy more than 10 points over).
4. Only after that did I open `ela8-sent-keys.mjs`, to explain the mismatches.

**Results.**
- 135 of 138 matched on my first answer.
- The 3 that didn't match are right answers the page refuses: “one” and “two” typed as words.
- No key is wrong and no choice set has two right answers.
- Every typed-sentence key, and every other right form I'd expect, is accepted.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|
| 1 Sentence jobs | 14 | 14 | 1 | 0 | 30–32 |
| 2 Simple and compound | 14 | 13 | 1 | 1 | 30–33 |
| 3 Rearranging | 14 | 14 | 1 | 0 | 31–34 |
| 4 Complex and compound-complex | 14 | 12 | 3 | 1 | 30–33 |
| 5 Subject and predicate | 14 | 14 | 0 | 0 | 29–31 |
| 6 Objects | 14 | 14 | 1 | 0 | 30–32 |
| 7 Phrases and clauses | 13 | 13 | 0 | 1 | 27–30 |
| 8 Dependent and independent | 14 | 14 | 1 | 0 | 30–32 |
| 9 Placement | 13 | 13 | 0 | 1 | 31–34 |
| 10 Relative clauses | 14 | 14 | 0 | 0 | 30–33 |
| **All** | **138** | **135 (98%)** | **8 (+1 unit-wide)** | **4 (+1 unit-wide)** | all inside 25–35 |

## Unit-wide

- **FIX (unit-wide): the minutes number.** `minutes` in the keys adds up to **41**, so every sheet says “⏱️ About 41 minutes
  plus the video”. The hub and the `texts` swap say “About 30 minutes a sheet”, and the owner's cap is 35. My count of the
  required work is 27–34 a sheet, so the content fits and only the table is wrong. Example trim that sums to 34: ideas 4,
  examples 3, problems 12, mixups 4 (tryit 2, shorts 6, gq 3 unchanged).
- **FIX root cause for the 3 refusals (S2 k2-1, S4 k3-1, S4 k4-1): number words.**
  - `build-notes.mjs` loads the engine with `window.PWN = {}`. Without a unit, `WORD_NUMS` is on, so the key “one” is stored
    as `1/1`.
  - The page has `texts`, so `WORD_NUMS` is off there. “one” canonicalises to the text `one`, which matches nothing.
  - So the main answer listed first in the keys is marked wrong, while “1” passes. The miss “two” on S2 k2-1 never shows its
    message, because it is stored as `2/1`.
  - Two ways to fix it:
    - Quick: set `numberWords: true` in `unit`. Blanks still try the text form, and word or sentence items don't parse numbers.
    - Root: run the build's canon with the unit's own settings (`window.PWN = { unit }`) and let `check-notes-keys.mjs` hash
      under the page's settings. That would have caught this. Other English note units with number words in blank keys may
      have the same problem; I didn't check them.
  - Either way, the two “Type a number” items (S2 t1, S7 p5) would then also take “two”. Right now they take only “2”.
- **Typed forms probed.**
  - Accepted:
    - Capitals in words: “Interrogative.”, “You.”, “(you)”.
    - Hyphen forms: “compound complex”, “compound–complex”, “compoundcomplex”; “semi-colon”.
    - Articles kept: “the lamp”, “a pencil”, “her neighbors”, “neighbours”, “The tall boy beside Tilda” or “tall boy …”.
    - Synonyms: “emotion”, “purpose”, “function”, “effect”, “auxiliary”, “who” for whom, “that” for which, “dangling”, “me” for I.
    - Numbers and spacing: “1.”, “(1)”, “2 pairs”, “2 clauses”; double spaces in sentences.
    - Both relative-clause orders (S10 p5); both placements (S9 p5).
  - Refused with the “check the capitals and punctuation” message (fine): a sentence with no end mark, a lowercase start, a space
    before “?”, an extra comma.
  - Refused with a why message (by design): a comma in a compound verb (S3 p4), a capital after a semicolon or a comma (S3 p3,
    S3 p6, S8 p5), no comma after an opening clause (S4 p4, S8 p5, S9 p6), “The old map”, “a squeaky cart”, “placed”.
  - Refused quietly (minor, KEEP): “orders” (S1 t1 asks for one of three given words), the misspelling “interogative”,
    “compound complex sentence”, “a comma” (S10 k4-1), “mis-placed”.
  - No typed key needs an apostrophe, a dash or an ellipsis, so curly vs straight and “...” vs “…” never come up.
- **Length / position / converge (46 choice sets).**

  | Cue | Score |
  |---|---|
  | Chance | 31% |
  | Longest | 29% |
  | Shortest | 29% |
  | Middle | 36% |
  | Odd one out | 16% |
  | Converge | 25% |
  | Position A / B / C / last | 28 / 35 / 30 / 30% |
  | Memorizer | 32% |
  | learnedCV | 29% |
  | learnedXU (advisory) | 41% |

  **No pattern.** The content cues below are ones the bots can't see.
- **Right answers in the student page:** no key, explanation or model is in the pages. But the **steps** of some typed-sentence
  items spell out the whole answer: S3 p4, S6 p6, S9 p5, S9 p6, and nearly S2 p5 and S8 p5. Steps show only after 4 misses, so
  this is **JUDGMENT (unit-wide)**. If you want steps to stop before the answer, end each one at the decision, e.g. S9 p6:
  “Who was climbing? Give that person a verb.” and drop “then a comma, then the rest”.
- **KEEP (with reason):**
  - Paired wrong choices in S1 c1 (two “asks”) and S9 c1 (two “was watching”). The builder chose this to beat the converge
    bot, and oddOne is 16%.
  - S6 p4: the key is the only option with no preposition, but that is the concept being taught.
  - S5 p5 (L3, inverted subject) has a thin second step, but turning the sentence round first is a real step for this age.

## Per sheet (FIX / JUDGMENT only)

**Lesson 1**
- **FIX p2 steps (wrong fact).** “One tells, one asks, one shows a feeling.” None of the three options shows a feeling: they
  are a command, a statement and a question. Change it to “One tells, one asks, one gives an order.” The key
  “Stack the blue pieces by the window.” is right.

**Lesson 2**
- **FIX k2-1** “A simple sentence has {} independent clause.” My answer: one. The page refuses it and accepts only “1”. See
  number words above.
- **JUDGMENT c2 and p6: the simple key is the only choice with no comma or semicolon.** Every wrong choice is a compound
  sentence with a mark, so “pick the one with no comma” wins both. To fix it, swap one wrong choice for a complex sentence with
  no comma (it isn't simple either):
  - c2: replace “The cat napped; the crocodile slept.” with “The cat napped while the crocodile slept by the fire.”
  - p6: replace “Omar cut the paper; Zara glued it to the board.” with “Omar cut the paper while Zara glued it to the board.”
  - Update the why messages.

**Lesson 3**
- **FIX c2: the two wrong choices are near-copies.** “The lid was stuck, so. Ravi …” and “The lid was stuck so. Ravi …”
  differ by one comma, so the key is the odd one out. Replace one of them with a real mix-up: the comma splice
  “The lid was stuck, Ravi asked for help.”

**Lesson 4**
- **FIX k3-1** (“one”) and **FIX k4-1** (“two”): the page refuses both and accepts only “1” and “2”. Same root cause as above.
- **FIX p1 steps give the answer.** “Which one starts with a word like because, when or until?” Only one option starts with
  until (the key). Change it to “… like because, when or if?”
- **JUDGMENT p5: the key is the only choice with two commas.** That is a quick cue for “compound-complex”. Replace
  “We went out after the rain stopped and found a frog.” with a complex sentence that has a list, such as
  “After the rain stopped, we went out, found a frog, and laughed.” It has one independent clause, so it is still wrong.

**Lesson 6**
- **FIX c2: the two wrong choices are near-copies,** and the hint names the cue. The wrong choices are “Ravi mailed his aunt a
  card.” and “… his aunt a birthday card.”, so the key is the only one with “to”, which the hint points at. Replace the
  “birthday card” choice with an indirect-object sentence that also contains “to”, such as “Ravi handed his aunt a card to
  open.”, and write its why message.

**Lesson 7**
- **JUDGMENT k1-1** “A clause has a subject and its {}.” “predicate” is refused and only “verb” is accepted. “A subject and its
  predicate” is also a true sentence, so I'd accept it, with the explanation saying the predicate's key word is the verb.

**Lesson 8**
- **FIX p1 steps (wrong fact).** “Three start with a word that makes them wait for more.” There are only 3 options and 2 of
  them start that way. Change it to “Two start with a word …”

**Lesson 9**
- **JUDGMENT mix-up 3** (read-only, not auto-checked). The wrong sentence is “Ravi saw a squirrel in the yard eating his
  sandwich.” The fix assumes Ravi was eating, but a squirrel eating Ravi's sandwich is a perfectly sensible reading, so the
  “mix-up” may not be one. Use a sentence where the silly reading is impossible:
  - Wrong: “Ravi saw a squirrel riding his bike to school.”
  - Right: “Riding his bike to school, Ravi saw a squirrel.”

**FIX list:**
- S1 p2 steps
- S2 k2-1 “one” refused
- S3 c2 near-copy wrong choices
- S4 k3-1 “one” refused
- S4 k4-1 “two” refused
- S4 p1 steps name the key word
- S6 c2 near-copy wrong choices and “to” cue
- S8 p1 steps
- Unit-wide: minutes total 41
