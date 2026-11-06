# 👀 Fresh-eyes review: 7th grade Unit 1, the Dive Shop (Nov 1, 2026)

Scope: the grade picker and 7th grade home, the Dive Shop floor, an order at every station at levels 1, 2 and 3,
Today's video picker, a station quiz, the review → PIN → unit test path (up to the PIN card), Deep Dive Rescue (Dive Log
and Arcade), the note sheets (hub, station 1, station 5, My notes), and the teacher's student page (Progress).
Local mode, `vite preview` build, Playwright Chromium at 375 × 667 and 1280 × 800. Screenshots are in `/tmp/g7eyes/`
(not committed). No commits; no change to `DIVE_GEN` or any answer.

## Ralph (first-time visitor)

- ✅ The name screen offers 🍋 4th / ☕ 6th / 🤿 7th grade. A 7th grader lands on the 7th grade classes with "⭐ Start here:
  practice math in the Dive Shop" at the top of Today's plan. The tour's 7th grade step points at Math. Getting from the
  town to an order takes three taps, plus the video step.
- ✅ Each station card says what it teaches, and a locked card names what opens it ("Pass 🧠 Think it through at Bubble
  Pairs").
- **Fixed:** the Math class tile said "1 units · 1 open". It now says "1 unit" (`src/game/game.js`, class tile).
- **Left for the owner:** the shop intro says "Pass each station quiz to open the next station", but the locked cards
  say Think it through opens the next one. This shared line is used by every shop, so I didn't change it.
- **Left for the owner:** the Station Quiz and Notes buttons both use 📝. You named the Notes button that way, so I left it.
- **Left for the owner:** in the Arcade, Deep Dive Rescue is listed after every 6th grade game. Nothing sorts the
  student's own grade first.

## Tina (looks and declutter)

| Screen | 375 × 667 | 1280 × 800 | Sideways scroll |
|---|---|---|---|
| 7th grade home | 2016 px (3.0 screens) | — | none |
| Dive Shop floor, first visit | 2858 px (4.3) | — | none |
| Dive Shop floor, all open | 4011 px (6.0, at the limit) | 2156 px (2.7) | none |
| Orders, L1–L3, all 5 stations | 1383–1829 px | — | none (all 15 checked) |
| Note hub / station 1 / My notes | 2734 / 8355 / 4421 px | 2066 / 6507 / 3723 px | none |

- **Fixed:** in the order ticket, a mixed number could break across two lines ("(−1" on one line, "1/2)" on the next, in
  the Dive Line at L3). The ticket now joins a whole number to its fraction with a non-breaking space
  (`ticketHTML`). This changes only how the text is shown, and it helps every shop that has mixed numbers.
- **Fixed:** the 📝 Notes button's label was left-aligned, while every other station button is centered
  (`src/styles/game.css`, `.station .station-notes`).
- Teacher student page (`node scripts/preview-student-page.mjs`): the made-up student had no Dive Shop data, so the
  preview never showed the new section. **Added** 4 Dive skills and a passed Bubble Pairs quiz to
  `scripts/preview/student-page.ts`, as LOOKS-REVIEW.md asks. The Dive Shop shows under 🤿 7th grade, with "Skill"
  instead of "Khan skill" and no Khan links. Progress tab height: 2875 → 3356 px on desktop (3.6 → 4.2 screens) and
  5137 → 6049 px on a phone (7.7 → 9.1). The page itself didn't change; the preview now has more data. The Progress tab
  was already over the limit before this unit. **Left for the owner:** start each unit's details fold closed on phones.
- **Left for the owner:** a station note sheet is 12.5 phone screens long. It's a printable worksheet, and its sections
  are numbered, so I didn't fold it.
- **Left for the owner:** in Deep Dive Rescue at 375 px, the title runs right up to the Done button.

## Pam (homeschool parent)

- ✅ Today's video: the card says what the grown-up must do ("pick a video, watch all of it, then get a grown-up's
  signature"). The grown-up steps are 🔐 "no good video today, open practice" and "change these videos". There's no
  skip button for the student. In local mode, the first PIN prompt asks the grown-up to make a 4-digit PIN.
- ✅ The Unit Test card: "📇 Review first (needed)" opens the PIN card ("Unit Test review: Dive Shop … A grown-up OKs
  every test review and every test"). "🔐 Start Unit Test" before the review says "Do the 📇 review first. Then a
  grown-up OKs the test." The gates are unchanged.
- ✅ The note sheets show what a grown-up does (the "Explain it" grown-up question and the "A grown-up checked it" line),
  use a nickname, and save only on the device.
- **Left for the owner:** a sheet's "🐾 Back to Pet World" link opens the game in the sheet's own tab. The game had
  already opened the sheet in a new tab, so she ends up with two game tabs.

## Sam (progress safety)

- ✅ `npm run smoke`: all 7 sign-in situations pass. `node scripts/check-five-days.mjs` passes.
- ✅ Picking 7th grade only sets `S.home` (on the name screen). Grade tabs change the view, not the save. A save with no
  `home` still becomes 6th grade (`validHood`). No 6th grade field is touched.
- ✅ Dive progress is saved and survives a reload. One served order took `kn.zeroPairs` from 0 to 1 and coins from 0 to
  15, and both were the same after a reload.

## Lena (Spanish and accessibility)

- **Fixed (read-aloud):** 🔊 "Read it to me" read the raw text, so −3 − (−5) could come out as "minus 3 minus minus 5".
  A new `speakMath()` (English only, spoken text only) changes what's read aloud:
  - a sign becomes "negative" and a spaced − becomes "minus"
  - `|x|` becomes "the absolute value of"
  - 2 1/4 becomes "2 and 1 over 4"
  - ☐ becomes "box"

  Example: "What is 8 minus (negative 30)?"
- **Fixed (Spanish):** the order questions "What is 8 − (−30)?" (numbers only, never a sentence), "Where does Pip end
  up?", "How far apart are they?" and "What is the balance now?" now have Spanish. So does the new help-bot entry
  (`src/shared/language.ts`).
- **Fixed (notes):** the save-code box had no label (it now has `aria-label="save code"`). The My notes "open sheet"
  links were 19 px tall and now have room to tap (`scripts/notes/engine/notes.js`, rebuilt with `build-notes.mjs
  g7-dive`).
- ✅ Every button on the floor and the order screens has a name. The tap targets under 36 px are the shared
  English/Español switch and the ✕ cross-out buttons. Both are used in every grade.
- **Left for the owner:** Spanish is partial in every shop (Open for business, Station Quiz, station names and most
  question text stay English). This unit follows the same pattern.
- **Left for the owner:** the dive line's screen-reader label gives only its range, not where the animals are. Adding the
  positions would give away "Which point is at…?" questions, so this needs a decision.

## Quinn / Chip (settings, help bot, tour)

- ✅ `check-tour` passes. The 7th grade tour step (`classes7`) points at Math and names the Dive Shop.
- ✅ The help bot sends "dive shop", "zero pairs", "rational numbers", "subtracting negative numbers" (in 7th grade) and
  "deep dive rescue" to the right places. Teacher settings pick up Deep Dive Rescue from `ARCADE_GAMES` (Quick setup
  and the Arcade game switches). The home-grade setting lists 7th grade.
- **Fixed:** "where are my notes" went to the Reading Log. It now finds a new "📝 Math note sheets" entry, and the grade
  entry knows "7th grade" and "seventh" (`src/shared/helpBot.ts`). Added 5 sample questions to
  `scripts/check-help-bot.mjs`: 80 of 80 pass.
- ✅ "Khan" appears nowhere on the 7th grade screens checked: floor, lesson videos, Think it through, quiz, unit test
  review, note sheets, and the teacher Progress section.
- **Left for the owner:** the help bot's "Why is something locked?" answer says a station opens after 6 orders. The Dive
  Shop opens stations with Think it through. That answer is shared by every shop.

## Math found during the walk (reported, not changed)

1. **Two right answers in Dive Log `addProps`, level 3, "Friendly pair".** At L3 the four numbers are a mixed-number
   pair *and* a decimal pair. The decimal pair is built so that it "make[s] a whole too", for example 4.7 + (−5.7) = −1.
   The question is "Which two make a whole number when you add them?", but only the fraction pair is keyed right. The
   wrong option `others[0] and others[1]` *is* the decimal pair. The problem seen was "4.7 + 1 1/3 + (−5.7) + 2 2/3":
   both "1 1/3 and 2 2/3" and "−5.7 and 4.7" add to a whole number. Possible fixes: ask "Which two **fractions**…" at
   L3, or pick a distractor that isn't the decimal pair. (`check-math` passed, because the key matches the solver.)
2. Dive Line `addRat` at **level 2** showed a mixed number (−3/8 + 2 1/4). The spec says mixed numbers are level 3.
   This is minor and could be on purpose.

## Checks run

- `npm run verify` ✅
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run check-math -- --shop dive --n 100`: 2,700 problems, every key matches. The prompt warnings for `subAsAdd`
  and `ratWord` were already there.
- `npm run smoke` ✅
- `check-five-days` ✅
- `check-tour` ✅
- `check-help-bot`: 80 of 80 ✅
