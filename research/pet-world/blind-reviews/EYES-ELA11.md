# 👀 Fresh-eyes review: English Unit 11, the 🔍 Reading Library (Nov 1, 2026)

Scope: one unit only, building `elaRead`, course `comprehension` (Georgia ELA, no Khan). Local mode (no `.env`),
`vite preview` build, Playwright Chromium at 375 × 667 and 1280 × 800, a seeded local save with `unlockAll:true` and a
grown-up PIN. I played the real screens: the English town tile, the unit page (all 5 blocks), practice in all 5
lessons (9 runs), the Inference and evidence quiz at both sizes, the short answer and its 💡 hint, the 📇 review
(13 flashcards, then the 8 mixed questions), the review → PIN → unit test gate, the first 4 test questions at both
sizes (answered wrong on purpose), the Sticker Book's Reading Library page, and the teacher app's start page.
**155 screenshots** in `/tmp/claude-0/eyes/shots/` (not committed); I looked at about 8 of them. No question content
was changed.

## What I fixed (smallest change, in place)

1. **Khan wording on a no-Khan unit** (`src/game/game.js`, `renderEnglishUnit`). The unit page said “How it works:
   under each lesson, open the Khan Academy link…” although the unit has no Khan links. Georgia ELA courses
   (`GEORGIA_ELA`) now get the no-Khan sentence (“read each lesson and watch its video if it has one…”). The review
   banner's “checked your Khan test and” has the same guard. Units with Khan are unchanged.
2. **Doubled period in “The answer is …”** (`src/game/game.js`). Practice feedback read “The answer is The hamster was
   busy during the night..” because many Reading Library answers are full sentences. A small `endDot` helper adds the
   period only when the answer doesn't already end in one (all 4 “The answer is” lines: plain and visitor/tour roles).
   This helps every English, History and Biology unit with sentence answers. The unit test is unchanged (it never
   shows the answer).
3. **Town tile said “(Georgia ELA)”** (`src/shared/registry.ts`, `elaRead.unit`). That's a label for grown-ups, not
   kids; no other tile names its standards. The tile now says “Unit 11: Reading for meaning”. `GEORGIA_ELA` and the
   docs still say where the unit comes from.

`node scripts/verify.mjs` ✅ (the math fairness bot skipped: wrong Chromium version), `npm run typecheck` ✅,
`npm run build` ✅. I checked both fixes again on the rebuilt page.

## Ralph (first-time visitor)

- ✅ The tile shows under English (🔍, 2/10 stickers, the strip). The unit page reads top to bottom: hook → lesson
  → 🎬 YouTube search → Practice → Quiz, five times, then the Unit Test card (“📇 Review first, then a grown-up enters
  the PIN”).
- ✅ **No Khan anywhere** after fix 1: no Khan link, no “Also on Khan Academy”, no 🎓 card. No game card (none was
  asked for).
- JUDGMENT: “Sections marked ‘Learn’ with no practice are reading only” shows on every English unit; here every
  Learn has a practice, so the sentence is extra. Left as is (shared text).
- JUDGMENT (all subjects): the Sticker Book opens on math (Pet Café). The Reading Library page exists and is right,
  but from the book itself I found no subject switch to reach it. Not new to this unit.

## Tina (looks)

| Screen | 375 × 667 | 1280 × 800 | Sideways scroll |
|---|---|---|---|
| Unit page | 6,764 px (10 phone screens) | 3,248 px (4 screens) | none |
| Practice, quiz, review, test screens (all types) | fits, scrolls down | fits | none on any screen |
| Sticker Book, Reading Library | fits | fits | none |

- ✅ Passages wrap fine on a phone; no choice cut off (checked with `scrollWidth` on every choice). Sort rows, order
  pool, two-part and multi all fit at 375 px.
- ✅ At the bottom of the short answer, “Send to a grown-up” and “Skip for now” are not covered by the ✋ button
  (checked with `elementFromPoint` when scrolled down).
- JUDGMENT: the unit page is long on a phone (10 screens), like every English unit page: five full lesson texts plus
  hooks. Folding the lesson text after a lesson is passed would help all units; not done here (shared layout).

## Pam (homeschool parent)

- ✅ The hint on the short answer asks for the grown-up PIN (“This shows what a strong answer has”), with only Cancel.
  The model answer is not on the screen before the PIN.
- ✅ Short answer needs 40 words, and says a grown-up will read it.
- ✅ Review gate: “Pet World test review … A grown-up OKs every test review and every test.” Buttons: **Start the
  review · Cancel**. Test gate: **Start the test · Cancel**. No skip.

## Sam (progress safety)

- ✅ Unit test misses say “Not this time. This one is from ‘Inference and evidence’. The test doesn't show answers;
  the review will go over it.” No choice is marked right after a miss.
- ✅ The test is 20 questions, hardest first, “Get 16 of 20”.
- JUDGMENT (shared behaviour): the “Time to get help” stop (too many misses) can fire **in the middle of the 📇 test
  review**. After the grown-up signs her back in she lands on the unit page and the review isn't counted, so she
  starts it over (another PIN). That's safe, but a review is where misses are expected. Worth a look by the owner.
- Note: the flashcards have “Skip to the questions”, as in every unit. The 8 questions still have to be done.

## Lena (Spanish / accessibility)

- Library unit names aren't in `src/shared/language.ts` for any English unit, so “Reading Library” stays English in
  Español mode, the same as the other libraries. Not a new gap.
- ✅ Every choice has a ✕ cross-out with a spoken label (“Cross out: …”).

## Quinn (settings / help-bot / tour)

- ✅ “Unlock every station…” opens the whole unit in local mode; the town tour can be skipped.
- Teacher app: in local mode it shows “This build has no Supabase settings”, so I couldn't see the lesson list or
  report rows. Not checked: `scripts/preview-student-page.mjs` (out of budget).

## Never-again list (every screen I played)

- ✅ No two identical choices in any group (checked in code on every screen: practice, quiz, review, test).
- ✅ One right answer in each step I saw.
- ❌ One prompt gives the answer away (below).

## For the unit lead (question content, not changed by me)

1. **Prompt copied into the key (test pool, L3):** “An article explains what is making the town’s bees disappear.
   Which heading fits it best?” The key is “What Is Making Our Bees Disappear?”, the same words as the prompt.
   **Fix:** describe the article in other words, e.g. “An article tells why fewer and fewer bees visit the town’s
   gardens each year, and what might be causing it.”
2. **Two-part, sea otters (main idea):** Part B choice “Otters hold paws, which is cute to watch.” is made wrong only
   by the added opinion, so it's easy to rule out, and without the opinion it would also support Part A (a second
   right answer). **Fix:** use a detail that doesn't support “ways to stay put”, e.g. “Otters are often seen near
   kelp.” or a fact from outside the passage.
3. **Check with the test-wise bot (longest choice):** “Duchess is a gray tabby…”: the key “Her whiskers have turned
   white, and the vet says her eyes are cloudy.” is clearly the longest choice. Make one distractor the same length.
4. Two-part sea otters: “A group of resting otters is called a raft.” is a choice in both Part A and Part B. Fine,
   but a reader may think it's a trick; consider a different Part A distractor.
