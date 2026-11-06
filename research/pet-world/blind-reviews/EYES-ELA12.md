# 👀 Fresh-eyes review: English Unit 12, the 🎭 Storybook Library (Nov 2, 2026)

Scope: one unit only, building `elaLit`, course `literature` (Georgia ELA, no Khan), started on commit `e99dc80`.
Local mode (no `.env`), `vite preview` build, Playwright Chromium at 375 × 667 (light and dark) and 1280 × 800, a
seeded local save with `unlockAll:true` and a grown-up PIN. The walk answered from the question bank's key, with a
few misses on purpose. I played: the English tile, the unit page, practice in all 5 lessons at both sizes and in dark
mode, the Poems quiz, the ✍️ short answer and its 💡 PIN hint, and the 📇 review gate → flashcards → the 8 questions.
**About 90 screenshots** in `/tmp/ela12-eyes/shots/` (not committed); I looked at 4 of them. No question content was
changed. All six reviewers ran inline in this one session (not as separate agents), to stay in budget.

**Not reached (out of budget):** my script couldn't answer the review's select-all question (question 1 of 8 on the
last run), so it never reached the review result, the test PIN gate, the unit test screens or the Sticker Book page.
The test uses the same question screen (`renderEnglishQuestion` → `passageHTML`), and the miss text is
`testMissText` (code checked, not seen on screen). **Next pass: play the unit test and the Sticker Book's Storybook
Library page by hand.**

## What I fixed (smallest change, in place)

1. **Poem lines wrapped too much on a phone** (`src/styles/game.css`, after `.passage-line[data-n]::before`). At
   375 px the card is 321 px wide. With 16 px padding and a 3.3 em hanging indent, “My Shadow” broke almost every line
   in two. A `max-width:480px` rule makes the card padding 12 px and the indent shallower (1 em margin, 1.6 em
   padding, −1 em text-indent). Line numbers still sit in the left gutter. Desktop is unchanged.

`npm run verify` ✅ (the math fairness bot was skipped: wrong Chromium version), `npm run typecheck` ✅,
`npm run build` ✅.

## The passage card (what was asked)

| Check | 375 × 667 | 1280 × 800 |
|---|---|---|
| Size | 17 px text, line height 1.55, card 321 px | 17 px, text kept to 65ch in a 700 px card |
| Sideways scroll | none on any question (0 of 38) | none |
| Where the choices start (passage questions) | **1,680–1,910 px down: about 2.5–3 phone screens** | 960–1,110 px down: just over 1 screen |
| Dark mode | ✅ light text on the dark card, edge shows, source line readable | (not run) |
| Poems | ✅ one line per line, a gap between stanzas, numbers 5, 10, 15 in the gutter, wrapped lines hang | ✅ |
| Hide/Show | Hiding keeps it closed while she answers (the feedback doesn't redraw it). Every new question opens it again. | same |
| A question that needs a passage but shows none | none: the bank check found 0 of 110 prompts that name a passage title without `passage:`, and the game showed 0 | — |

## Ralph (first-time visitor)

- ✅ The tile says “🎭 Storybook Library · Unit 12: Reading literature”. That's kid-friendly, with no standards
  label.
- ✅ **No Khan wording** anywhere on the unit page (checked the page text at both sizes).
- ✅ No doubled punctuation on the unit page or in any practice feedback I saw (“The answer is …” lines included).
- JUDGMENT: on a phone the story comes first and the question comes 2½–3 screens later. That's how a reading test
  works, but a first-timer may not know a question is waiting below. One idea: a one-line note under the toggle, like
  “Read the story, then the question is below ↓”, or the question prompt shown above the card too. Not done: it
  changes the shared question layout.

## Tina (looks)

- Unit page: 7,093 px at 375 (about 10.6 phone screens) and 3,344 px at 1280 (about 4.2 screens). That's over the
  6-phone-screen limit, like every English unit page (five lesson texts plus hooks). This is the same shared JUDGMENT
  as Unit 11: fold a passed lesson's text.
- The floating ✋ “I have a question” and 🐾 buttons sit on top of the passage text in the middle of a phone screen
  (seen on “My Shadow” and “Juniper and the Ferry Rule”). They move as she scrolls, so nothing stays hidden, but on a
  long passage she reads around them the whole time. JUDGMENT (shared): make them smaller or see-through while a
  `.story-passage` is open.
- ✅ No two identical choices on any screen (checked on 38 practice, quiz and review questions).

## Pam (homeschool parent)

- ✅ 💡 hint on the short answer: “Show a hint? This shows what a strong answer has. Grown-up PIN”. Only **Show the
  hint · Cancel**.
- ✅ Review gate: “Pet World test review … A grown-up OKs every test review and every test.” Only **Start the
  review · Cancel**.
- ✅ The flashcards (15 cards) show no passage, which is right: they're terms, not reading questions.
- Not seen: the test gate (see “Not reached”).

## Sam (progress safety)

- ✅ Review misses teach: “Not quite. The answer is From creepy to cozy, once Finn meets the mouse family.”
- ✅ In code, unit-test misses go through `testMissText` with `hideKey` (no answer shown). I didn't see it on screen.
- Seen while testing: picking choice 1 every time set off “Time to get help” after 4 misses in Characters and point of
  view. The stop works as built.

## Lena (Spanish / accessibility)

- The passage toggle is a native `<details>/<summary>`, so it works with the keyboard and a screen reader for free.
  “Hide the story / Show the poem” has no Spanish entry in `src/shared/language.ts`. That's the same as the rest of
  the library units' English text.
- The line numbers come from CSS `content:attr(data-n)`. Most screen readers skip them, which is fine.

## Quinn (settings / help-bot / tour)

- ✅ The first-time tour can be skipped, and `unlockAll` opens the whole unit in local mode.
- Not run: `scripts/check-tour.mjs`, `check-help-bot.mjs` (out of budget; this unit added no setting).

## For the unit lead (question content, not changed by me)

1. **“My Shadow”, line 6:** on a phone the dash after “…the way he likes to grow” wraps onto its own line (check the
   characters before it). Use a no-break space (U+00A0) or no space before the dash.
2. **Short answer, Plot lesson** (“✍️ In a story, a flood washes out the only bridge…”): the prompt asks for three
   things in one sentence (how the setting makes the conflict, the conflict type, one way to solve it). Think about
   numbering them (1, 2, 3) so she can check she answered all three.

## Shared JUDGMENT calls (for the owner)

- Phone scroll from the passage to the choices (Ralph above).
- Floating help buttons over long passages (Tina above).
- Unit page length on phones (all English units).
