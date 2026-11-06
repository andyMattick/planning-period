# 🙈 Blind solve: 📝 worksheet pilot (Bakery g6-bakery, ELA Link ela5-link)

Fresh solver, student view only (`scripts/notes/g6-bakery-content.mjs`, `scripts/notes/ela5-link-content.mjs`, and the
built `public/notes/<unit>/station-N.html`). No key file, teacher copy, review packet or key-check script was opened.
Each answer was written first, then hashed as `PWN1|<unit>|s<n>:<item>|<canonical>` with the engine's own canon
functions (engine loaded in `node:vm`, the same way `build-notes.mjs` does it) and compared with the page's `acc` hashes.
Alternate words a 12-year-old might type were also probed, so "accepted / not accepted" below comes from the hashes.

## Totals

| Unit | Sheets | Auto-checked items solved | Matched the hashes on the first answer |
|---|---|---|---|
| Bakery (g6-bakery) | 5 | 74 | 74 |
| ELA Link (ela5-link) | 8 | 105 | 105 |
| **All** | **13** | **179** | **179 (100%)** |

No item has zero right answers. No math key is wrong. No two choices are equal in text or value.
The one real pattern is in ELA: **the key is the shortest choice far too often** (see "Unit-wide" below).

## Unit-wide findings

### FIX: ELA key is the shortest choice (test-wise "shortest" strategy wins)
Across the 16 ELA Spot the mix-up items, the key is the strictly shortest choice in 9 (s1 c1, s1 c2, s2 c1, s3 c1,
s3 c2, s5 c1, s7 c1, s7 c2, s8 c1) and tied shortest in 1 more (s6 c2). That is about 60% against a 33% chance, which
breaks the "more than about 10 points above chance" rule. Among the 4-option Your turn sentence choices, s3 p6 and
s5 p4 also have the strictly shortest key. Fix by lengthening the key or shortening one wrong choice per item (keep
the wrong choices, change lengths only), then rerun `scripts/test-wise-bot.mjs` / `check-fairness.mjs`.
One-word choices (s4 p1 "is", s8 p2 "in", s8 p3 "is", s6 p2 "Ugh") are naturally short; leave those.

### KEEP: Bakery choice lengths
Bakery key length is spread out (shortest in 3 of 10, about chance). The key-to-value order in s4 c1 (0.54, 5.4, 54:
key in the middle) is the classic "middle value" pattern; it's one item, so it's a judgment, listed below.

### Time
Each Bakery sheet: try-it, 5–7 blanks, 2 worked examples, 6 problems (L3 two-step), 2 mix-ups, 2 written answers,
plus videos: about 40 minutes. ELA sheets are lighter (4–5 blanks, short sentences): about 25–35 minutes each;
s7 (typing whole punctuated sentences) and s8 (mixed) are closest to 40.

## Bakery (g6-bakery)

### Station 1 The Scale: 14 items, 14 matched
My answers: t1 2.25 · k1 points · k2 zero · k3 carry · k4 10 · k5 6.55 · p1 6.8 · p2 6.3 · p3 16.45 · p4 2.73 ·
p5 28.45 · p6 1.85 · c1 7.40 + 2.36 with the points in a line · c2 took 1 from 6 instead of borrowing.
- KEEP all. Blanks accept point/points/dots, zero/0, carry/regroup/carry over. L3 (p5, p6) are real two-step problems.

### Station 2 Sharing Pans: 15 items, 15 matched
t1 6 · k1 1/3 · k2 1 · k3 reciprocal, 5/2 · k4 1/8 · k5 12 · p1 1/3 · p2 10 · p3 2/15 · p4 8 · p5 3/4 · p6 16 · c1 2 ÷ 1/6 · c2 multiplied by 3.
- JUDGMENT k3-1: "inverse" is not accepted ("flip" is). A student who has heard "multiplicative inverse" may type it. Suggest accepting "inverse" with the explanation naming "reciprocal".
- JUDGMENT c2: uses 3/4 ÷ 3, the same problem worked in Example 1 (answer 1/4 shown up front), so the mix-up is spotted by matching the example, not by thinking. Suggest new numbers (e.g. Pip says 2/5 ÷ 2 = 4/5).
- KEEP c2 length: key is the shortest of 3 (33 vs 36, 39), one item, no unit-wide pattern.

### Station 3 Boxing Treats: 17 items, 17 matched
t1 3 · k1 flip · k2 7/5 · k3 improper, 5 · k4 1/12, 10 · k5 3, 2 · p1 6 · p2 4 · p3 5/4 · p4 7/2 · p5 5/2 · p6 14/3 · c1 5/6 ÷ 1/3 · c2 didn't flip 3/4.
- KEEP all. Mixed-number forms (1 1/4, 3 1/2, 2 1/2, 4 2/3) are accepted. p6 is a real second step.

### Station 4 The Register: 14 items, 14 matched
t1 4.5 · k1 points · k2 3 · k3 3.12 · k4 subtract · k5 0 · p1 0.56 · p2 7.05 · p3 1.62 · p4 42 · p5 204 · p6 25.5 · c1 5.4 · c2 left out the 0.
- JUDGMENT c1: choices 0.54 / 5.4 / 54 with the key the middle value. A guesser who always picks the middle number wins. Suggest a 4th or replacement distractor so the key isn't the middle (e.g. 0.54 / 5.4 / 54 / 540, or 5.4 / 54 / 540).
- KEEP p5 (8,568 ÷ 42 with the 0 in the quotient): good L3.

### Station 5 Bulk Orders: 14 items, 14 matched
t1 2.25 · k1 up · k2 zero · k3 4 · k4 100 · k5 1.75 · p1 2.1 · p2 3.75 · p3 7 · p4 15 · p5 6.5 · p6 0.75 · c1 32.4 ÷ 6 · c2 moved the points different amounts.
- KEEP c1 (key 8 characters vs 9 and 9: shortest by one, harmless) and c2 (tied shortest with one wrong choice).
- KEEP t1: the same 2.25 as Station 1's try-it; fine, different skill.

## ELA Link (ela5-link)

### Station 1 Meet the preposition: 14 items, 14 matched
t1 on · k1 pronoun · k2 when · k3 of · k4 except · k5 time · p1 near · p2 on · p3 gently · p4 in front of · p5 after · p6 3 · c1 picked the noun · c2 Everyone but Remy read.
- FIX c1: key shortest; and the wrong choice "Time words are never prepositions." isn't a mix-up Mo made (it's a rule statement), so it doesn't fit the stem. Suggest "He picked the verb, not the link." style wording for all three.
- FIX c2: key "Everyone but Remy read." is the shortest (23 vs 25, 29). Lengthen it ("Everyone but Remy read the book.").
- JUDGMENT p3 (L2): "gently" is the only -ly word, an odd one out a guesser spots without knowing prepositions. Suggest a non -ly wrong word that can't take an object (e.g. "quickly" → "often" or "very").
- JUDGMENT p5: "after recess" (the whole phrase) is not accepted; a student who types the phrase knows the answer. Suggest a "type just the one word" miss message for it.

### Station 2 Prepositional phrases: 14 items, 14 matched
t1 glasses · k1 object · k2 pronoun · k3 adjective · k4 adverb · k5 me · p1 window · p2 over the hill · p3 in the yellow boots · p4 book · p5 The boy by the door laughed. · p6 to Remy and me · c1 After a preposition, I should be me. · c2 under the tall lamp.
- FIX c1: key shortest (36 vs 41, 44).
- JUDGMENT k1: "noun" is not accepted for "ends with its {}"; "object" is the term taught, and the hint says "the ___ of the preposition". OK as is, but a "close: what do we call that noun?" miss message would help.

### Station 3 What prepositions tell: 13 items, 13 matched
t1 since · k1 for · k2 among · k3 direction · k4 how · p1 after · p2 behind · p3 among · p4 for · p5 toward · p6 Juno left without her umbrella. · c1 since with an amount of time · c2 The book is on the shelf.
- FIX c1: key shortest (37 vs 41, 48).
- FIX c2: key shortest (25 vs 27, 28). E.g. "The book is on the top shelf."
- FIX p6: key shortest of 4 (31 vs 32, 33, 34).
- KEEP: motion/movement/towards/amongst are accepted.

### Station 4 Agreement with prepositional phrases: 13 items, 13 matched
t1 is · k1 phrase · k2 subject · k3 next · k4 one · p1 is · p2 leaves · p3 of the drums · p4 are · p5 wags · p6 are · c1 matched the verb to grapes · c2 to the shed.
- KEEP all. next/closest/nearest/closer accepted. p5 and p6 are real second steps.

### Station 5 Preposition or adverb?: 12 items, 12 matched
t1 no · k1 object · k2 adverb · k3 tent · p1 The cat leapt over the gate. · p2 preposition · p3 adverb · p4 The kids stayed inside. · p5 rope · p6 We went inside, then hid inside the closet. · c1 Over has no object here. · c2 It has a noun or pronoun object.
- FIX p4: key shortest (23 vs 27–29) and the only sentence that ends at "inside". The ending is the skill, but the length shouldn't also give it: e.g. "After the storm, the kids stayed inside."
- FIX c1: key shortest (24 vs 28, 32).
- JUDGMENT c2: the wrong choice "…every time." uses an absolute word, which test-wise students reject on sight. Suggest "It tells which way something went."
- JUDGMENT k3 (L1-easy): "the object of inside is {}" in "We waited inside the tent" is a one-noun read; fine for a key idea.

### Station 6 Meet the interjection: 13 items, 13 matched
t1 Yikes · k1 feeling · k2 works · k3 thinking · k4 relief · p1 Wow · p2 Ugh · p3 Ouch · p4 Aha, the code is under the mat. · p5 The library opens at noon. · p6 Boy, that test was long. · c1 Happy is part of the sentence · c2 Oh well.
- JUDGMENT k3: "thinking" and "wondering" are accepted; "unsure" and "confused" are not. Hmm often shows doubt; a 12-year-old may well type "unsure". Suggest accepting unsure/deciding/pondering, or a miss message that steers to thinking.
- FIX p5: "The library opens at noon" without the period is not accepted, but the prompt only asks for "the right capital letter". Either say "with its capital letter and end mark" (as s7 p2 does) or accept it without the period.
- FIX c1: the wrong choice "Happy shows a feeling, so Juno is right." contradicts the stem ("What is her mix-up?"). Replace with a real mix-up (e.g. "Happy is an interjection only at the end of a sentence.").
- JUDGMENT c2: "Oh well / next to / ran fast": the key is the only feeling, so it's an odd one out by design and very easy; consider a second feeling-like distractor that isn't an interjection ("so glad").
- JUDGMENT p6: key tied shortest with "The boy’s test was long." (24); harmless.

### Station 7 Punctuating interjections: 13 items, 13 matched
t1 , · k1 point · k2 capital · k3 comma · k4 both · p1 Wow! The fox is fast. · p2 Hmm, I need a longer book. · p3 Ouch! That paper cut stings. · p4 Well, the book is late. · p5 Oh, I see the map now. · p6 The answer, um, is on page nine. · c1 We needs a capital letter. · c2 Oh, the shop is closed.
- FIX t1: typing the word "comma" is not accepted; "Type the one mark" may be read as "name the mark". Accept "comma".
- FIX c1: key "We needs a capital letter." reads like a grammar mistake and is the shortest (26 vs 31, 35). Suggest "The word “we” needs a capital W."
- FIX c2: key shortest (23 vs 27, 29).
- JUDGMENT k2: "big" (as in big letter) is not accepted; "uppercase" is. Fine either way.
- JUDGMENT p5 (L3): "says this calmly, in a quiet voice" tells her it's mild, so the "decide strong or mild" step is given away. Suggest a context clue that needs reading ("Tansy shrugs and points at the map").

### Station 8 Mixed practice: 13 items, 13 matched
t1 onto · k1 feeling · k2 phrase · k3 adverb · k4 comma · p1 Yay · p2 in · p3 is · p4 before dinner · p5 Whoa! The jar of pickles is open. · p6 Oh, the cups on the tray are wet. · c1 The verb should agree with books. · c2 Aha, the key is under the mat.
- FIX p3: the wrong choice "have" doesn't fit the blank ("the box of new puzzles have here"), so it is out on grammar alone. Use "have been" (plural, fits). Don't use "was": it would be a second right answer.
- FIX c1: key shortest (33 vs 36, 39); and "Cart is the subject, so is is right." contradicts the "What is her mix-up?" stem. Rewrite as a real mix-up.
- JUDGMENT p4: "before dinner on the porch" is not accepted. "on the porch" most naturally tells where they finished, so the key is defensible; but "dinner on the porch" can be read as one noun phrase. Suggest reordering the sentence ("Phew, on the porch we finished the puzzle before dinner.") so only one reading exists.
- KEEP p5, p6: real two-job L3 items.

## FIX list (ids)
ela5-link s1 c1, s1 c2, s2 c1, s3 c1, s3 c2, s3 p6, s5 p4, s5 c1, s6 p5, s6 c1, s7 t1, s7 c1, s7 c2, s8 p3, s8 c1.
Bakery: none.

## JUDGMENT list (ids)
g6-bakery s2 k3-1, s2 c2, s4 c1; ela5-link s1 p3, s1 p5, s2 k1, s5 c2, s6 k3, s6 c2, s7 k2, s7 p5, s8 p4.
