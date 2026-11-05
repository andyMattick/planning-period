# Feasibility: what we can make well from what a teacher sends

`feasibility.json` holds the numbers. Two readers use it and must agree:
- **The order page** shows live warnings while the teacher fills in the order (too many questions for the pages they
  uploaded, a number outside the limits) and fills blank specs with the defaults.
- **The 🧭 onboarding agent** (`agents/onboarding.md`) reads the real files after Send, measures them properly
  (pages, kind of source, distinct ideas), checks every item against the same numbers and writes the follow-up.

The page can only count pages; the agent reads the material. When they differ, the agent's read-out wins and the
follow-up says why. **All numbers are pilot estimates** (owner, Nov 5, 2026), to recalibrate from real orders below.

## The numbers and why

| Key | Value | Why |
|---|---|---|
| `wordsPerPage` | 300 | a typed page of notes or a textbook page with pictures; a slide or a scanned page counts as one page |
| `questionsPerPage` | 6–10 | how many **distinct, fair** questions one page supports before they repeat each other. A page of notes holds about 3–6 ideas (a rule, a method, two worked examples, a few terms); each supports one or two questions at different levels. Past that, questions test the same idea twice or need facts the source doesn't have, which the blind tester flags and the fact checker has nothing to check against. Pet World's note sheets, each built on one lesson's video and key ideas, carry about 14–15 checked items (batch 1: 60 items on 4 Market sheets, 43 on 3 Clock sheets; `WORKSHEETS-BATCH-LOG.md`), and a lesson there is more than one page of source |
| A/B versions | not doubled | B tests the **same** ideas with new numbers, contexts or passages (`agents/maker.md` rule 4), so a 10-question quiz with A and B needs 10 questions' worth of material, not 20 |
| Several items | added together | a worksheet, a quiz and a test from one page all draw on the same 6–10; the test needs new questions, not new ideas, but a test of 25 still needs about 3 pages |
| `fromStandardsOnly.questionsPerStandard` | 4–8 | with standards only, the maker writes the teaching itself, so supply is set by the standards, not by pages. Fewer than from a page of notes at the top end because nothing anchors the wording; the fact checker and blind tester carry more of the weight, and the follow-up says so |
| `defaults` | per item | the most common mix for each item, used when the teacher leaves a spec blank; the onboarding agent lists each one it used under `assumptions` and adjusts for the grade and the teacher's training files |
| `limits` | `[min, max]` per spec | what one order of that item can be: below the minimum it isn't the item (a 3-question test), above the maximum the checks and the teacher's review get too long for the turnaround. `npm run check` requires every menu item to have defaults and limits, with min ≤ default ≤ max |
| `messages` | text | the wording the page and the agent share (`{asked}`, `{pages}`, `{low}`, `{high}`, `{default}`) |

Example: 75 questions from 1 page. Supply 6–10, so the follow-up says "about 6–10 good questions", and offers: add
material, lower the number, or let us use our judgment (we'd make 10). It never makes 75 thin questions.

## Recalibrate (after every 5 orders)

From `records/<order>.json` (kept after delivery) and the blind tester's findings:
1. For each order: source pages and kind (from `onboarding.json`'s counts, kept in the record), questions made, and
   how many the blind tester flagged as repeats, too easy or not supported by the source.
2. If orders near the top of the range (10 a page) show more than about 1 in 10 such flags, lower `high`; if orders at
   `high` come back clean and teachers asked for more, raise it by 1. Same for `questionsPerStandard`.
3. A default the teacher changes in more than half the follow-up answers is the wrong default: change it.
4. A follow-up question teachers answer "go" to every time isn't needed: the auditor moves it to an assumption.
5. Change `feasibility.json` and this file together, with a line in the auditor's notes; `npm run check` validates it.
