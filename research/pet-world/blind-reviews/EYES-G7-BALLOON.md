# 👀 Fresh-eyes review: 7th grade Unit 2, the Balloon Port (Nov 1, 2026)

Scope: the 7th grade home and Math page (Balloon Port locked, then open with "Unlock every station"), the Balloon Port
floor, Today's video picker and the grown-up PIN, orders at all 4 stations at levels 1, 2 and 3 (about 130 steps,
played through the real screens), a station quiz (Flight Log), Think it through (Ballast Shed), the Unit Test card and
the review → PIN path, the note sheets (hub, stations 1–4, My notes), 🎈 Canyon Balloon Rally (played at all 3 levels,
from the shop card and the Arcade), and the Dive Shop's 🎮 Unit game card (Deep Dive Rescue).
Local mode, `vite preview` build, Playwright Chromium at 375 × 667 and 1280 × 800. Screenshots are in `/tmp/g7eyes2/`
(not committed). No change to `BALLOON_GEN`, any answer, any gate or any check.

## The owner's hard rule: no two choices the same, no two right answers

- **Orders (script, 4,500 problems a skill):** every choice step in the 8 Balloon Port skills has exactly 1 right
  choice and no two choices with the same text. ✅
- **Same value, different text (my own scan; check-math only compares text):**
  - "Which multiplication matches the story?" (`mulFamily`, every problem) and "Which multiplication shows it?"
    (`mulGroups` L1) always show 2 × (−5) and (−2) × 5 side by side, which have the same value. This is the GADOE
    "family of equations" on purpose: the question is which one *matches the story*, and only one does. **JUDGMENT**
    for the owner, since the rule says "text or value".
  - **`divForms` L1, "Which fraction is equal to −(9/2)?"** (752 of 4,500): the wrong choices (−9)/(−2) and 9/2 are
    equal. If one of them were right, both would be, so a test-wise student crosses out both and has 2 left. **FIX**
    (builder): pick a different second wrong choice, for example (−2)/9 and (−9)/(−2) but not 9/2. Practice only (tests
    start at L2).
  - Dive Shop (already built): `subRat` L2, "2.9 − (−7.7) is the same as…" shows 2.9 + (−7.7) and 2.9 − 7.7, which are
    equal and both wrong. Same cue. **FIX** (builder, Unit 1).
- **Rally:** `node scripts/check-balloon-rally.mjs` passes (36,000 hands, no repeated card in text or value, exactly one
  card reaches each gate). I played 3 levels by hand: no repeats.
- **Note sheets:** the 8 "Spot the mix-up" questions each have 3 different choices and 1 right answer. ✅
- **Think it through and the quiz** screens I opened had no repeated choices.

## Ralph (first-time visitor)

- ✅ Math page: the Balloon Port tile says "🔒 Pass the Dive Shop Unit Test". With "Unlock every station" it opens.
- ✅ The floor reads top to bottom: Today's video → 🎮 Unit game → Unit Test → stations 1–4, each with its lesson videos,
  Open for business, Station Quiz, Think it through and 📝 Notes. The rally is also on the Flight Log card.
- ✅ The Dive Shop's 🎮 Unit game card shows Deep Dive Rescue at the top of the floor from the first visit and opens the
  game (`/arcade/deep-dive-rescue/?from=dive`). The owner's "I should see it in the unit" is met in both shops.
- **Fixed:** with "Unlock every station" on, the Unit Test card said "Every station quiz is passed" when no quiz had
  been taken. It now says "A grown-up opened the test." unless every quiz really is passed (`src/game/game.js`, the unit
  test card; used by every shop).
- **Left (JUDGMENT):** the Dive Shop tile on the 7th grade Math page shows "2/10" and two filled squares for a brand-new
  student. Not Balloon Port code; worth a look.
- **Left (JUDGMENT):** the video picker's "More videos" list shows "Multiplying and dividing integers · Math with Mr. J"
  twice, because the same video is on stations 3 and 4 (`kidVideos.ts`, `math:balloon:3` and `math:balloon:4`).

## Tina (looks and declutter)

| Screen | 375 × 667 | 1280 × 800 | Sideways scroll |
|---|---|---|---|
| 7th grade home | 2016 px (3.0 screens) | — | none |
| Balloon Port floor, all open | 3744 px (5.6) | 1853 px (2.3) | none |
| Orders, L1–L3, all 4 stations | 1368–1900 px | — | none (every screenshot checked) |
| Note hub / station 1–4 / My notes | 2594 / 7312–8076 / 3732 px | 1923 / 5767–6082 / 3159 px | none |
| Rally (in the game) | 667 px | — | none |

- **Fixed:** in the Ballast Shed picture, the "🧺 ➜ out of the basket" / "into the basket ➜ 🧺" caption was dark brown on
  the dark green chalkboard and could hardly be read. It now uses the chalk color, and the group outlines are lighter
  (`src/styles/game.css`, `.bp-cap`, `.bp-group`).
- **Fixed:** in the rally at level 3, a mixed number on a card broke across two lines ("(−1/2) × (−10" / "1/2)"). Cards
  now join a whole number to its fraction with a non-breaking space, like the Dive Shop's ticket fix
  (`public/arcade/balloon-rally/index.html`, display only).
- **Fixed:** the rally's star pill was an empty blob until the first gate. It now shows ☆☆☆ and fills in (with an
  `aria-label`, "1 of 3 gates"). On a phone it drops to a second line under the sandbags.
- **Left (JUDGMENT):** in the rally, a gate close to the balloon (−3/4 next to 0) puts the two labels on top of each
  other.
- **Left (JUDGMENT):** a station note sheet is 11–12 phone screens long (same as the Dive Shop sheets; printable).
- The order plan chips ("1. Division → 2. Each minute → 3. Meaning") scroll sideways inside the board on a phone. That's
  the shared design (`.plan` has `overflow-x:auto`), not a bug.

## Pam (homeschool parent)

- ✅ Today's video: the card lists the 3 steps, and the grown-up options are 🔐 "no good video today, open practice" and
  🔐 "change these videos". There is no skip button for her. The first PIN asks the grown-up to make a 4-digit PIN.
- ✅ "🔐 Start Unit Test" before the review says "Do the 📇 review first. Then a grown-up OKs the test." "📇 Review first
  (needed)" opens the PIN card ("Unit Test review: Balloon Port … A grown-up OKs every test review and every test"), and
  after the PIN the review orders start. Gates unchanged.
- ✅ The rally inside the shop says "Right answers earn Pet World coins. The rally doesn’t count toward Balloon Port
  orders or quizzes." In the Arcade it waits for practice time like every other game.
- ✅ No "Khan" anywhere on the Balloon Port screens, quiz, review or note sheets.

## Sam (progress safety)

- ✅ Orders save as she goes (coins went 0 → 14 in one run). Nothing touched saving, signing in or `mergeWork`.
- ✅ The unit game never counts toward orders, mastery, quizzes or unlocks (shop text and `UNIT_GAME`).

## Lena (Spanish and accessibility)

- **Fixed (read-aloud):** `speakMath` read "−(9/2)" as "−(9 over 2)" and "−((−1.5) × 8)" with the sign skipped or
  read as "minus". It now says "the opposite of (9 over 2)". A lone sign after a word, as in "Putting groups in is +,
  taking groups out is −." or "minutes from now + and minutes ago −", now reads "positive" and "negative". Checked:
  "8 − (−30)" still reads "8 minus negative 30" and "3 + 4" is unchanged (`src/game/game.js`, spoken text only).
- ✅ × reads "times", ÷ "divided by", 3/4 "3 over 4", 1 1/3 "1 and 1 over 3".
- **Fixed (Spanish):** the 8 short step questions used most at the Balloon Port now have Spanish ("Is the product
  positive or negative?", "Now the sign. Which is the answer?", "Which multiplication matches the story?", "Which
  addition shows the change?", "How does the basket’s total change?", "What does your answer mean?", "How many of the
  numbers are negative?", "Which multiplication checks your answer?") (`src/shared/language.ts`).
- **Left (JUDGMENT):** stories and the longer prompts stay English, as in every shop.
- ✅ The ± button is labeled "Switch between positive and negative". Note-sheet inputs all have labels. The note sheets'
  "grown-up checked it" checkboxes are under 32 px (shared notes engine).

## Quinn / Chip (settings, help bot, tour)

- ✅ `check-tour` passes. `check-help-bot`: 80 of 80. "balloon port", "canyon balloon rally", "why is the balloon port
  locked" and "divide by zero" (7th grade) go to the right places.
- **Fixed:** the "📝 Math note sheets" answer named only the Dive Shop. It now names both 7th grade shops, in English
  and Spanish, and "balloon notes" finds it (`src/shared/helpBot.ts`, `src/shared/language.ts`).
- **Left (FIX, builder):** in 7th grade, "multiplying negative numbers" and "dividing negative numbers" go to the
  **4th grade Toy Shop** (Toy Crates / Sharing Shelves), and "negative times negative" goes to the Flight Log instead of
  the Ballast Shed. The Balloon Port's station and skill names never say "negative" ("Multiply signed numbers"). Add a
  key or a sample question in `scripts/check-help-bot.mjs`.
- **Left (JUDGMENT):** "where are my notes" (without "math") still goes to the Reading Log. "commutative property" goes
  to the Dive Log (addition), not the Ticket Booth (multiplication).

## Math and give-aways found during the walk (reported, not changed)

1. **FIX: `npm run check-math -- --shop balloon` fails at HEAD** for `mulGroups` (331 wrong keys) and `mulDivWord`
   (357): the solver returns `__picture_differs_from_story__`. Commit 9d361bf took the sign out of the pictures
   ("🎈 1.9 m down each minute", "🌡️ 6.5 °C colder each km"), and its message says the oracle still reads the old pictures.
   The keys themselves look right in every order I played. The solver needs to re-check before this unit ships.
2. **FIX (picture gives the sign away):** Flight Log `mulDivWord` L3 still shows "🎈 −1 1/2 m in 1/4 min" before the
   "Which division gives the change each minute?" step, whose wrong choice is the unsigned 1 1/2 ÷ 1/4 (`signWrong`).
   Every other Balloon Port picture now says "down" instead of a sign.
3. **JUDGMENT (overlap cue, practice only):** Ticket Booth `mulProps` L2/L3, "Which two multiply to 1 or −1?": the right
   pair's number often shows up in 3 of the 4 choices ("0.5 and −9 | 0.5 and 3 | 0.5 and −2 | −2 and −9"). A student can
   guess the repeated number is in the answer. Tests show only typed answers here.
4. Minor: the Ticket Booth average ticket says "+0.10" and the step says "0.1".
5. `divForms` L1 equal wrong choices: see the top section.

## Checks run

- `npm run verify` ✅ (with `PLAYWRIGHT_CHROMIUM` set, so the math fairness bot ran too)
- `npm run typecheck` ✅
- `npm run build` ✅
- `node scripts/check-balloon-rally.mjs` ✅
- `npx tsx scripts/check-help-bot.mjs`: 80 of 80 ✅
- `node scripts/check-tour.mjs` ✅
- `npm run check-math -- --shop balloon --n 300`: ❌ 2 skills (the stale solver, item 1 above; this was already
  failing before this review and is not caused by its changes).
- Not run: `npm run smoke` (nothing here touches signing in or saving).

## Screenshots (`/tmp/g7eyes2/`, not committed)

`02-home`, `03-math-units-locked`, `04-math-units-open-p/-d`, `05-shop-floor-p/-d`, `06-video-picker`, `07-pin`,
`09-order-bottom-viewport`, `11-…14-order-S<station>-L<level>-<n>` (all 4 stations, levels 1–3), `12-stuck-L3`,
`13-stuck-L3` (the L3 picture with the sign), `20-notes-*-p`, `21-notes-*-d`, `22-notes-s2-keyideas-crop`, `30-rally-start`,
`31-rally-L1/L2/L3-hand`, `32-rally-wrong`, `33-rally-L*-end`, `34-rally-from-shop`, `35-arcade`, `36-arcade-rally`,
`37-rally-L3-after-fix`, `40-quiz-start`, `41-quiz-q1…q5`, `45-think-s1`, `50-unit-test-before-review`,
`51-unit-review-pin`, `52-unit-review-open`, `60-shop-es`, `61-order-es-s1…s4`, `70-dive-floor`, `71-dive-game-open`.
