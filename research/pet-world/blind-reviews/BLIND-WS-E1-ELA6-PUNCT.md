# 🙈 Blind solve: 🦸 Superhero Factory note sheets (ela6-punct, Build 1)

Fresh solver. Before every answer was written down I opened only the student view: `scripts/notes/ela6-punct-content.mjs`, the built
`public/notes/ela6-punct/station-N.html` pages and the engine (`scripts/notes/engine/notes.js`). No key file, teacher copy, review
packet or key-check output was opened before then.

Each answer was hashed as `PWN1|ela6-punct|s<n>:<item>|<canonical>` with the engine's own canon functions (engine loaded in `node:vm`:
`textCanon` for words and blanks, with `parseNum` tried first for blanks; `'opt:' + sentCanon(x).slice(2)` for choice problems;
`optCanon` for c1–c2; `sentCanon`, then the `near` list with `looseCanon`, for sentences) and compared with the page's stored right
hashes. Then I ran:

- `node scripts/notes/check-notes-keys.mjs ela6-punct`: ✅ 171 items, 218 right hashes all from accepted forms, no miss is a right answer, 61 choice sets with no equal text.
- `node scripts/notes/notes-test-wise.mjs --units ela6-punct` (and `--items`): ✅ 61 choice sets, chance 27%. Top cues: learnedCV 32%, oddOne 31%, middle 30%. Nothing more than 10 points over chance.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|
| 1 End marks | 13 | 13 | 2 | 0 | 27–31 |
| 2 Meet the comma | 13 | 13 | 1 | 1 | 27–31 |
| 3 Lists | 13 | 13 | 0 | 1 | 26–30 |
| 4 Letters, dates, places | 14 | 14 | 1 | 0 | 29–33 |
| 5 Introductions | 13 | 13 | 1 | 2 | 27–31 |
| 6 Dialogue | 14 | 14 | 1 | 0 | 29–33 |
| 7 Appositives | 13 | 13 | 1 | 2 | 27–31 |
| 8 Meet the apostrophe | 13 | 13 | 1 | 0 | 26–30 |
| 9 Contractions | 13 | 13 | 1 | 0 | 26–30 |
| 10 Plurals | 13 | 13 | 0 | 2 | 26–30 |
| 11 Possessive | 13 | 13 | 1 | 0 | 26–30 |
| 12 Plural possessives | 13 | 13 | 0 | 0 | 27–31 |
| 13 Its / it's | 13 | 13 | 0 | 2 | 27–31 |
| **All** | **171** | **171 (100%)** | **10** | **10 (+1 unit-wide)** | all inside 25–35 (page says 31) |

No key is wrong. No item has two right answers among its choices. Every FIX below is to wrong choices or step text, never to a key.

## Unit-wide

- **Typed forms (probed, about 70):** curly or straight apostrophes and quotes are accepted everywhere (`hero’s` / `hero's`,
  `“The cape is ready,”` / `"The cape is ready,"`). Capitals don't matter in word items (`when the lights flickered` ok). Spaces
  squeeze. A sentence with no end mark, a lowercase start or no space after `?` gets the "Your words are right…" nudge
  (`near`). Good extra accepts: `exclamation mark`, `exclamation`, `full stop`, `imperative`, `a command`, `yet/nor/for`
  (S2 k2-1), `two` and `2` (S3), `inside` / `in front of` (S6 k2-1), `takes the place of` (S6 k3-1), `former astronaut`,
  `comet’s tail` with or without `the`, `-es`, `last` (S12 k4-1), `June 9, 2027` with or without the period, `Tampa, Florida.`.
  Refused, and right to refuse: `!` for the name of a mark, `,` for "comma", `Tampa, FL`, `80s` / `eighties`, `1980’s` (has a
  why message), no-serial-comma lists (has a why message), `belongs` in “The boots ___ to Pax”.
  There are no ellipses or dashes in any typed answer, so `...` / `…` and `--` / `—` never come up.
- **A trailing comma is handled two ways.** Word answers keep a comma in `textCanon`, so `When the lights flickered,` is
  accepted (S5 p4 stores it) but `Luckily,` (S5 p1) and `a robot with gold wheels,` (S7 t1) are refused with no message. See
  S5 and S7.
- **Length / position (61 sets):** key longest 18%, shortest 28%, middle 30%, odd one out 31%, converge 15%; positions A 26%,
  B 26%, C 30%, last 25%. **No pattern.**
- **Two wrong choices that give the same fix (main finding).** In 7 of the 13 c1 "What is the mix-up?" sets, two wrong
  choices are the same correction with a different reason (S5, S6, S7, S8, S9, S11), or three of them share a frame the key
  doesn't (S1, S4). The text differs, so `check-notes-keys` passes, but CONTENT-RULES §2 says no two choices may be the same
  "in text or in value". A student who rules out one rules out its twin, so it's really a 3-choice item. The bots don't catch
  it because the twins are long (which keeps the key from being the longest).
- **Try-it answer on the same page (JUDGMENT, unit-wide):** S4 t1 (`June 9, 2027`) appears in the k3-1 and k5-1 hints. S12 t1
  (`heroes’`) appears in the mix-up "the three heroes’ capes". A try-it is a warm-up before the rules, so this may be fine.
  If you want it clean, change the date in the hints (e.g. "June 4, 2030") and the mix-up's noun (e.g. "the three pilot’s
  capes → pilots’").
- **No model answer or typed-sentence key is readable** in any student page (checked by searching each page for my answers).
  The hub and My notes pages render "13 sheets" and "About 30 minutes a sheet". The raw HTML still says "5 sheets" and "40
  minutes" before the script rewrites it, which doesn't matter in a browser.

## Per sheet (FIX and JUDGMENT only)

**Sheet 1 (End marks)**
- **FIX c1** (Tobias, “Can you fix my jet pack.”). Mine and the page's: “He asked something but ended with a period.” All 3 wrong
  choices end “…but forgot the comma.”, so the key is the only one without a comma. Change two of them to the key's form:
  “He made a statement but ended with a question mark.” and “He asked something but ended with an exclamation point.” Keep
  “He asked something but forgot the comma.” (Avoid “He gave an order but ended with a period”: some guides let a polite
  request like “Can you…” end with a period, so it could read as right.)
- **FIX p6 steps** (step text, not choices): step 1 says “Ask Marco… and **Tell me…** give orders”, but no choice says “Tell me”.
  It should say “Ask Marco… and Ask if… give orders.” A student who opens the steps will look for a choice that isn't there.

**Sheet 2 (Meet the comma)**
- **FIX p6 steps:** step 2 says “One sentence talks to **Ines**”, but no choice has Ines. The choice is “Yes Zip flew away.” Change
  it to “One sentence starts with the answer word Yes.”
- JUDGMENT p6 wrong choice “The lights went out and Zip flew away.” is two short complete sentences. Chicago and AP both let
  you leave out the comma when the parts are short, so some teachers will call this right too. The unit's rule says comma,
  so the key is fine. A safer wrong choice is a longer pair, e.g. “The lights in the lab went out and Zip flew away over the
  city.”

**Sheet 3 (Lists)**
- JUDGMENT k4-1 (“…are separated by {}: a fast, brave hero”). `commas` and `comma` are accepted, `a comma` is refused. “Separated
  by a comma” fits the sentence; accept it.

**Sheet 4 (Letters, dates, places)**
- **FIX c1** (“Your pal” with no mark). Mine and the page's: “The sign-off needs a comma after pal.” The 3 wrong choices all start
  “The greeting needs…”, so the key is the only “sign-off” choice. And “The greeting needs a period.” is close to “The
  greeting needs a period after pal.” Change two of them to the key's frame: “The sign-off needs a period after pal.” and
  “The sign-off needs a comma before Your.” Keep “The greeting needs a period after pal.”
- (KEEP k5-1 “month and a year with no {}”: `date` is refused. The hint, “what is missing from May 2027 that June 9, 2027 has?”,
  points clearly at `day`.)

**Sheet 5 (Introductions)**
- **FIX c1** (“As the sun set the heroes flew home.”). Mine and the page's: “A comma should follow set, where the intro ends.”
  “Commas should follow sun and set, around the intro.” and “Commas should follow sun, in the middle, and set.” are the same
  fix. Replace one with “A comma should follow As, where the intro starts.”
- JUDGMENT p1 (“Type the introductory word”). `Luckily` is accepted, `Luckily,` is refused with no message. p4 on the same
  sheet accepts `When the lights flickered,`. Accept `luckily,` too.
- JUDGMENT c2: two wrong choices are nearly the same sentence (“Since then, Zip has climbed over.” and “Since then, Zip has
  climbed over every gate in town.”). Make one a different phrase, e.g. “After the long climb, Zip rested.”

**Sheet 6 (Dialogue)**
- **FIX c1** (“Let’s go Marco.”). Mine and the page's: “Marco is being spoken to, so a comma goes before Marco.” “A comma should go
  after the word Let’s.” and “Marco is the one speaking, so a comma should go after Let’s.” are the same fix. Replace the
  first with one in the key's own frame: “Marco is being spoken to, so a comma goes after Marco.”

**Sheet 7 (Appositives)**
- **FIX c1** (“The mayor, a big fan of heroes visited…”). Mine and the page's: “The appositive needs a comma after heroes too.”
  “The appositive should have no commas at all.” and “The appositive should have no commas, since the mayor is already named.”
  are the same fix. Replace the first with “The comma after mayor should move after heroes.”
- JUDGMENT t1: `a robot with gold wheels,` is refused (the prompt says “look between the two commas”, so copying the comma is
  likely). Accept it, as S5 p4 does.
- JUDGMENT c2: “Marco flew it, and Esme cheered.” and “Marco flew, and Esme cheered.” are twins. Replace one with “Marco flew
  the jet over the city.”

**Sheet 8 (Meet the apostrophe)**
- **FIX c1** (“Fresh cape’s sold here.”). Mine and the page's: “Capes is a plural, so it takes no apostrophe.” “The apostrophe
  should come after the s, since there are many capes.” and “Cape’s needs an apostrophe after the s too, like capes’.” both
  end at `capes’`. Replace the second with “Fresh needs an apostrophe too, since the capes are fresh.” or “Cape’s is right,
  because the capes are for sale.”

**Sheet 9 (Contractions)**
- **FIX c1** (“They’re late yesterday”). Mine and the page's: “They’re means they are, not they were.” “The apostrophe belongs
  after the e.” and “They’re means they were, so the apostrophe should go after the e.” are the same fix. Replace the first
  with “They’re is right, since it can mean they were.”

**Sheet 10 (Plurals)**
- JUDGMENT p1: “Six drone’s flew over us.” and “Six drone’s flew over the city.” are the same mistake with a different ending.
  Make one a different real mistake, e.g. “Six drones flew over the citys.”
- JUDGMENT c2: “The drone’s broke.” and “The drone’s broke down yesterday.” are twins. Replace one with “The drones camera’s
  broke.”

**Sheet 11 (Possessive)**
- **FIX c1** (“That idea is her’s.”). Mine and the page's: “Hers already shows owning, so it takes no apostrophe.” “The apostrophe
  should come after the s, because she owns it: hers’.” and “The apostrophe should come after the s: hers’.” are the same
  answer, `hers’`. Replace the second with “Her’s is right, because the idea belongs to her.”

**Sheet 12 (Plural possessives)**
- No FIX or JUDGMENT. KEEP c1: “peoples’” is a real word (nations), but the prompt says “the vote of many people”, so the key is
  the only right one.

**Sheet 13 (Its / it's)**
- JUDGMENT p6 (“Fix both mistakes… Its been a long day…”). “It has been a long day, and the robot needs its rest.” fixes both
  mistakes too, but it gets a plain red mark with no message. Accept it, or add a why message: “That works. Now use the
  short form with the patch: it’s.”
- JUDGMENT p2 hint: “It’s means it is or it has.” plus the choices `It is` / `It was` / `Its own` gives the answer away. Change
  the hint to “Which pair squeezes into it’s?”

FIX list: S1 c1, S1 p6 steps, S2 p6 steps, S4 c1, S5 c1, S6 c1, S7 c1, S8 c1, S9 c1, S11 c1.
