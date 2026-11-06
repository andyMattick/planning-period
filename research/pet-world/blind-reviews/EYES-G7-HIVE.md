# 👀 Fresh-eyes review: 7th grade Unit 3, the Honey Hive (Nov 1, 2026)

Scope (same as the Balloon Port review): the 7th grade Math page (Honey Hive locked, then open with "Unlock every
station"), the Honey Hive floor with the 🎮 Unit game card, Today's video picker and the grown-up PIN, orders at all 4
stations at levels 1, 2 and 3 (123 steps, 48 orders, played through the real screens: typed into the real boxes, ± and
fraction boxes, clicked the real choice buttons), a station quiz (Hive Growth), Think it through (Comb Pattern), the Unit
Test card and the review → PIN path, the note sheets (hub, stations 1–4, My notes), 🐝 Honeycomb Hunt (all 3 levels from
the shop card, level 2 as the Arcade copy, the Arcade tile), Spanish, read-aloud and screen-reader text, and 10 help-bot
questions by hand. Local mode, `vite preview` build, Playwright Chromium at 375 × 667 and 1280 × 800. Screenshots are in
`/tmp/eyes/shots/` (not committed). No change to `HIVE_GEN`, any answer, any gate or any check.

## Scripts (run once, as asked)

- `npm run check-math -- --shop hive`: ❌ 2 skills, 9,600 problems.
  - `formConvert`: 152 wrong keys, 304 wrong step keys, all `__no_solver_for_step_Bar decimal__` / `Bar percent`
    (the L3 negative mixed numbers whose decimal repeats). This is the known oracle gap; the solver is fixing it.
  - `repeatDec` pattern check: **L1 "Bar (3 choices)" has the right choice in place 2 47% of the time (over 45%).**
    **FIX** (builder).
  - Warnings only: test prompts with a number she can't see elsewhere (`decType` 340, `repeatDec` 400, `ratReason` 388;
    e.g. "for 0.25̅7̅ type 57", "Round 49% to 50%"). These are worked hints in the prompt, not the answer.
  - 📊 Level 3 never ends on a 2-way choice; L2/L3 signs are about half negative. ✅
- `node scripts/check-help-bot.mjs`: 98/98 ✅ (0 7th grade misses) before and after my changes.
- `node scripts/check-hive-honeycomb.mjs`: ✅ 30,000 rounds, no repeated cell in text or value, one right cell, no trick
  beats chance by 10 points (L2 "middle length" is the highest at 33.8%).
- `node scripts/check-tour.mjs`: ✅

## The owner's hard rule: no two choices the same, no two right answers

- Every choice step I played (48 orders, the quiz, Think it through, the review, the note-sheet "Spot the mix-up"
  questions, 9 Honeycomb Hunt combs) had exactly one right choice and four different values. ✅
- Bar choices (0.1̅2̅ / 0.12̅ / 0.1̅) are different values on screen, but **a screen reader read them the same**, because it
  drops the combining bar: "0.1̅2̅" and "0.12̅" both sound like "0.12". Fixed (Lena, below).

## Ralph (first-time visitor)

- ✅ Math page: Dive Shop, Balloon Port (🔒 "Pass the Dive Shop Unit Test"), and the Honey Hive in a "🔒 Coming up: 1 more
  unit" fold with "🔒 Pass the Balloon Port Unit Test". With "Unlock every station" all three are open.
- ✅ Floor, top to bottom: Today's video → 🎮 Unit game (🐝 Honeycomb Hunt) → Unit Test → stations 1–4, each with 🎬 Lesson
  videos, Open for business, Station Quiz, Think it through and 📝 Notes. The Hunt is also on the Jar Shelf card. The
  game is visible from the first visit. ✅
- ✅ With "Unlock every station" the Unit Test card says "A grown-up opened the test." (the Balloon review's fix holds).
- **Fixed:** the video picker listed "Percent change · Math with Mr. J" twice, because the same video is on stations 3
  and 4 (`math:hive:3`, `math:hive:4`). A kid video now shows once, in the first section that has it, and a section
  left empty is skipped (`openVideoPicker`, `src/game/game.js`). This also fixes the Balloon Port's duplicate (left as
  JUDGMENT last review). The picker went from 11 buttons to 10, all different.
- **Left (JUDGMENT, again):** the Dive Shop tile shows "2/10" and two filled squares for a brand-new student.

## Tina (looks and declutter)

| Screen | 375 × 667 | 1280 × 800 | Sideways scroll |
|---|---|---|---|
| Math page (all open) | 969 px | — | none |
| Honey Hive floor | 3786 px (5.7 screens) | 1827 px (2.3) | none |
| Orders, L1–L3, all 4 stations (131 screenshots) | 667 px viewport | 1080 px | none |
| Note hub / stations 1–4 / My notes | 2591 / 7599–7959 / 3705 px | 1946 / 5773–6042 / 3159 px | none |
| Honeycomb Hunt | one screen | one screen | none |

- **Fixed (Honeycomb Hunt):** a comb cell with a repeating bar broke apart: "−3333.   3̅   %", "44.   4̅   %". The rule
  `.cell span{display:flex; width:100%; height:100%}` also stretched the bar's own span. It's now `.cell > span`, so a
  cell reads "433.3̅%" in one piece. The queen's big number got a little top padding so the bar over "0.3̅" sits inside
  the chip; on a 1× screen the bar was almost lost on the chip's edge, and "−0.3" next to the wrong cell "−33.3%" is
  exactly the mix-up the game tests (`public/arcade/honeycomb-hunt/index.html`, display only).
- **Left (JUDGMENT):** when the Hunt is open over the shop, Pet World's coin toast ("🐝 Every jar filled! ⭐⭐⭐ +6 🪙")
  sits on top of the game for a few seconds and can cover the "Fill the jar" button or the message.
- **Left (JUDGMENT):** the Hunt's "Done" button touches the "🐝 Honeycomb Hunt" title on a phone.
- **Left (JUDGMENT):** a station note sheet is 11–12 phone screens (same as the Dive Shop and Balloon Port sheets).

## Pam (homeschool parent)

- ✅ Today's video: 3 steps, the picture card plays in Pet World ("Watch to the end, then practice."), then ✍️ "Grown-up’s
  signature: I watched it" opens the PIN card ("Sign off today’s video … Your PIN says she watched all of it"). The first
  PIN asks a grown-up to make one. No skip button for her; the grown-up options are 🔐.
- ✅ "🔐 Start Unit Test" before the review says "Do the 📇 review first. Then a grown-up OKs the test." "📇 Review first
  (needed)" opens "Unit Test review: Honey Hive … A grown-up OKs every test review and every test", Cancel only; after
  the PIN the review orders start.
- ✅ The Hunt in the shop ends with "Each right step earns Pet World coins. The hunt doesn’t count toward Honey Hive
  orders or quizzes." In the Arcade it waits for practice time ("Practice first to unlock"), like every game.
- ✅ No "Khan" on the floor, orders, quiz, review, note sheets or the Hunt.

## Sam (progress safety)

- ✅ Nothing I changed touches saving, signing in, `mergeWork`, gates or scoring. Orders, the quiz and the review played
  with no page errors. The Hunt doesn't count toward orders, mastery, quizzes or unlocks.

## Lena (Spanish and accessibility)

- **Fixed (screen readers, shop):** a choice with a repeating bar now has a spoken label: "0.1̅6̅" → "1: 0. (16 repeating)",
  "0.16̅" → "0.1 (6 repeating)", "−466.6̅%" → "−466. (6 repeating)%"; in Spanish "se repite". Choices without a bar are
  unchanged (`barAria`, used by the order choice buttons, `src/game/game.js`). Checked in 6 bar steps at L1 and L3: every
  label is different.
- **Fixed (screen readers, Hunt):** the bar span had an `aria-label`, which screen readers skip on a plain span. The digits
  under the bar are now hidden from them and a visually hidden "3 repeating" is read instead.
- ✅ Read-aloud (🔊 Read it to me): no Honey Hive story contains a bar (checked 7,200 stories), "−1 23/90" reads "negative 1
  and 23 over 90", "7/25" reads "7 over 25", and % is read by the speech engine.
- **Left (FIX, builder; `src/shared/language.ts` is outside my files):** in Spanish, Market Day's step reads "¿Qué
  cantidad de kilograms go into candles?". The catch-all rule `/^How many (.+)\?$/ → ¿Qué cantidad de $1?` half-translates
  any "How many X <verb> …?" question. Narrow it (only when the rest has no English verb) or add Honey Hive step strings.
- **Left (JUDGMENT):** the shop's station names, prompts and stories stay English in Spanish mode, as in every shop.

## Quinn / Chip (settings, help bot, tour)

- ✅ `check-tour` passes; `check-help-bot` 98/98 before and after.
- 10 kid questions by hand (7th grade). Before my fix, 3 went wrong:
  - "how do i turn a fraction into a decimal" → 🧊 Shape Turner (a brain game; "turn" matched "Turner").
  - "how do i find 15% of something" → "Why is something locked?" (the bot dropped "%", and "something" matched the FAQ
    title).
  - "where is the bee game" → the Arcade, not Honeycomb Hunt.
- **Fixed** (`src/shared/helpBot.ts`): `%` now reads as "percent"; a few kid phrasings are station keys (Jar Shelf:
  "fraction into a decimal", "decimal to a percent"…; Comb Pattern: "bar over", "decimal that repeats"; Hive Growth:
  "percent of something", "find a percent") and game keys (Honeycomb Hunt: "bee game", "honeycomb", "queen bee"). 6th
  grade's Market Stall (stations 3, 4) and 4th grade's Pizza Parlor (station 5) got the same phrasings, so each grade
  stays in its own shop: checked in 4th, 6th and 7th grade. After: all 3 go to the right place; "bar over a repeating
  decimal" and "what does terminating mean" → Comb Pattern, "the hive grew then shrank…" → Hive Growth, "is my answer
  reasonable" → Market Day.
- **Left (FIX, builder):** add these as samples in `scripts/check-help-bot.mjs` (not my file), so they stay fixed.
- **Left (JUDGMENT):** in 7th grade, "percent of a number" goes to 6th grade's percent skill (`pctVisual`, a skill
  name match). "what is 1/3 as a percent" is only "maybe" (Honey Hive). A Spanish question ("como escribo un decimal
  periodico") gets no answer.

## Math and give-aways found during the walk (reported, not changed)

1. **FIX: Market Day `ratReason` L3, the "Is that reasonable?" step is given away.** Step 1 asks her to type the estimate
   ("What is 75% of 88?" → 66); step 2's four choices each end "should be about N" with a different N, and exactly one
   says "about 66". A sample of 1,000 L3 problems: 1,000 of 1,000 have the typed estimate in the right choice only. She
   can match the number without judging. L3 is 40% of the unit test. Possible fix: every choice uses the same estimate
   and they differ in the judgment and the reason ("Not reasonable: 19.6 is far below 66" / "Reasonable: 19.6 is close
   to 66" / "Not reasonable: 19.6 is more than 66" …), keeping four choices.
2. **FIX: `repeatDec` L1 key spread** (check-math, above).
3. **JUDGMENT (odd one out, practice only): `decType` L1** "Break 30 into primes. What does it have?" ("only 2s / only 5s
   / 2s and 5s, nothing else / a prime other than 2 and 5"): the odd choice, "a prime other than 2 and 5", is right 496
   of 1,000 times (chance is 25%). Tests start at L2, which types lowest terms first.
4. **JUDGMENT (wording): `ratMulti` L3** step names "First price" / "Second price" show as "✓ First price: 8" and
   "✓ Second price: 1", but they are jar counts, not prices. "Jars at $7.50" would read right. The oracle
   (`scripts/math-oracles/hive.js`, line 278) keys on these names, so rename both together.
5. **JUDGMENT:** `pctChange` L2 "To find the percent change, divide the change by…": "the original amount" is right every
   time. It's the idea being taught, but a guesser learns it after one problem.
6. Honeycomb Hunt L3 shows cells like "−33.3%" next to "−33.3̅%": different values (the "repeat that stops" mix-up, by
   design). Fine now that the bar shows clearly (Tina's fix).

## What I changed (all display, text or routing)

- `src/game/game.js`: `openVideoPicker` shows a shared kid video once and skips empty sections; new `barAria` gives bar
  choices a spoken label (English and Spanish).
- `src/shared/helpBot.ts`: `%` → "percent" in `normalize`; `STATION_KEYS` and `GAME_KEYS` (Honey Hive, Market Stall,
  Pizza Parlor, Honeycomb Hunt).
- `public/arcade/honeycomb-hunt/index.html`: `.cell > span`, `.rep` inline, `.sr` text for screen readers, padding on the
  queen's number.

## Checks run after the changes

- `npm run verify` ✅ (with `PLAYWRIGHT_CHROMIUM` set)
- `npm run typecheck` ✅
- `npm run build` ✅
- `node scripts/check-help-bot.mjs`: 98/98 ✅
- `node scripts/check-hive-honeycomb.mjs` ✅ (the game logic is unchanged)
- Not run: `npm run smoke` (nothing touches signing in or saving).

Tool calls: about 85.
