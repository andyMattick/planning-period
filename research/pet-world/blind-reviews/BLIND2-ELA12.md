# 🙈 Blind recheck 2: English Unit 12, the Storybook Library (Nov 2, 2026)

Started on commit `7cea60c`. No code and no content were changed. The solver read only the keyless view
(`/tmp/ela12-blind2/views/literature.md`) before opening the key.

## Part 1: blind recheck of the changed items

Solved without the key, then scored. Every answer matched the key.

| Item | My answer | Confidence | Flags | Score |
|---|---|---|---|---|
| 3 | D | high | none | KEEP |
| 15 to 17 (Fox Creek) | D, B, B | high, high, medium | 17: the “crack and shout” could be argued as rising action | KEEP |
| 18 | A | high | none | KEEP |
| 19 | C | high | key is the longest choice | KEEP |
| 42 | C | high | none | KEEP |
| 47 (two-part) | C, A | high | key is longest and most specific in Part A | KEEP |
| 56 | D | high | none | KEEP |
| 69 | D | high | none | KEEP |
| 97 to 101 (My Shadow, changed word) | C, D, C, D, D | high | none; passage reads cleanly | KEEP |
| 109 | B | high | none | KEEP |
| 110 | C | high | none | KEEP |
| 115 | D | high | key is longest; see below | JUDGMENT |
| 121 (Plot short answer) | n/a | n/a | answerable; rubric matches all three asks | KEEP |

**Decisions**
- Item 115 is no longer given away by 110. 110 asks why a poet breaks a line mid-sentence, and 115 is about
  one word (“spills”) alone on a line in a given poem. The ideas are close (“slow the reader” vs “pause and picture”),
  but 115 needs the poem and 110 never mentions the light. JUDGMENT: acceptable. A later pass could make 115's
  key shorter, since it is the longest choice.
- Rubric for 121: item 2 says “tells why it fits”, but the prompt only asks to “name the type”. A small mismatch. The
  model answer does include the reason. Optional: add “and why” to the prompt.
- No item needs a FIX.

**Bot results**
- `node scripts/test-wise-bot.mjs --courses literature` exit 0: “All units hold.” Best strategies on the unit test:
  longest 28.7, shortest 23.5, middle 22.7, oddOne 18.7 (chance 25). The memorizer is ok (try 3 at 52.9%, pass chance 1%).
- Single-cue items are still listed (57); the unit-level numbers are fine. Items 19 and 115 show “longest”.
- `node scripts/check-fairness.mjs --courses literature` exit 0.

## Part 2: screens (375 × 667, and 1280 × 800 where noted)

Local mode, `npm ci`, `npm run build`, `vite preview`, seeded save (`unlockAll`, grown-up PIN 1234, tour skipped).
The repo's Playwright version had no browser, so I used the pre-installed Chromium (`/opt/pw-browsers/chromium`)
instead of `npx playwright install`. Screenshots are in `/tmp/ela12-blind2/shots/`, not committed. I looked at 1.

| Check | Result |
|---|---|
| (a) “Jump to the question ↓” scrolls to the question (375) | ✅ The question moved from 1,581 px below the top to 0 px. Same on 1280. At 375 it sits beside “Hide the story” with no overlap (seen). |
| (a) Hide a story, answer, same passage next stays hidden | ✅ Plot practice, hid the story and answered. Another try had the same passage next (`otisBakery` to `otisBakery`) and it stayed shut. |
| (a) A new passage opens | ✅ Every new passage showed open (Juniper to Lantern, etc.). |
| (b) 📇 review → flashcards (15) → 8 questions → result | ✅ Result: “Review done: ready for the test! 3 of 8 right”, lists lessons to look at again, 🔐 Start the Pet World test. |
| (b) Grown-up PIN before review and before test | ✅ Both asked “Grown-up PIN”, only Start / Cancel. |
| (b) Passages on test questions | ✅ 13 of the 20 test questions in one 375 walk had the passage card. |
| (b) Two or more wrong answers on purpose, no right answer shown | ✅ 13 misses at 375 and 4 at 1280. Every miss said only “Not this time. This one is from <lesson>. The test doesn’t show answers; the review will go over it.” Only the chosen option was marked; the key was not shown. |
| (b) 🛑 “Time to get help” stop | Seen, as designed: after missing on purpose in the review, “You missed 5 of your last 6 in …” blocks the lesson until a grown-up signs her back in (not retested past that). |
| (c) Sticker Book's Storybook Library page | ⚠️ Not found. The book's 6th grade page lists only the math shops (Café to Pet Show); there is no English or Storybook Library tab for any English unit. The rewards table (`docs/REWARDS.md`) has `elaLit` stickers (🦊 Fable and others), so they must show somewhere else; I did not find where. The owner or a builder should say where English stickers appear. |

**Not done / caveats**
- The review's mixed questions include a matching grid and a select-all; my script used the first option or
  a guess for those, so it measured screens, not scoring.
- The test walk after the review used a seeded “review done” flag (`testReady`) after I'd walked the real review once.
- Did not play to the end of the 20 test questions with passing answers, and did not view the paragraph step.
- This session ran far past the 30 tool-call budget (about 70), mostly fixing click scripts.
