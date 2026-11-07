# Pricing: what a token is and where the menu's numbers come from

**Pilot estimates.** Every number here comes from the owner's other project, Pet World, which runs the same team
method (maker, fresh blind tester, solver, Wilco's bots, round 2, fresh recheck, reporter, auditor). No order has run
here yet beyond the four made-up samples (measured Nov 5, 2026: `docs/audits/AUDIT-2026-11-05.md`; `readingquiz`
is priced from them). **Recalibrate after the first 5 real orders** from their logs (`records/<order>.json`; the reporter's `log`
has minutes, tokens and dollars per step), and again whenever the auditor changes how much work a step does.

Dollars are API prices for the main model tier (Pet World `docs/builder/REPORTER.md`, "Cost assumptions": input $4,
output $20, cache read $0.20, cache write about $5 per million tokens). The owner may run on a plan instead; the price
should still hold at API cost, so a change of plan doesn't break it.

## 1. What the same work cost in Pet World

| Run | Cost | Per sheet | Source |
|---|---|---|---|
| Worksheet pilot, 2 units, 13 sheets | $26–30 all in ($16.41 child sessions + $9–13.51 lead) | **$2.0–2.3** | `docs/builder/AUDIT-WORKSHEETS-PILOT.md`, "The headline" |
| Math worksheet batch 1, 4 units, 19 sheets | children $26.48; with the lead's ceiling about **$10 a unit** | $1.39 children, about $2.1 all in | `docs/builder/WORKSHEETS-BATCH-LOG.md`, batch 1 |
| Math worksheet batch 2, 4 units, 16 sheets | children $33.53; with the lead about $46.5, **about $11.6 a unit** | $2.10 children, about $2.9 all in | same, batch 2 |
| English batch E1, 3 units, 32 sheets | children $29.62; with the lead about $56, **about $18.7 a unit** | $0.93 children, about $1.75 all in | same, batch E1 |
| Biology B1 (first Biology unit, run alone), 3 sheets | children $5.48 (maker $3.46, blind $1.30, recheck $0.72); **about $13.8** with the lead's shared counter | $1.83 children, about $4.6 all in | same, batch B1 (counter $607.84 → $614.61 at the first merge, plus the hand-off) |
| Pet Fair (math batch 3, one unit run alone), 6 sheets | children $10.09; **at most about $33** with the lead (a shared counter, so a ceiling) | $1.68 children, up to $5.5 all in | same, batch 3 |
| English Unit 11 (whole unit build, for the split) | $13.97 measured: making 60%, checking 36%, reporting 4% (reporter $0.55, blind $1.20, cheaper-tier recheck $0.36) | — | `docs/builder/AUDIT-ELA11.md` |

What this says for one order here:
- **One checked sheet of about 12–15 questions costs about $1.75–2.9 all in** when the process is routine, and
  **$4.6–5.5** when it is the first of its kind (a new subject or format run alone, where the lead does extra work).
- **Checking is cheap and catches the real problems** (Pet World's pilot audit: every content problem came from the
  blind solve). It is about a third of the cost and is never cut to save money.
- **Fixed cost per order** (not per item): the 🧭 onboarding read-out and follow-up (measured: $0.33–0.34 and about a
  minute each on two test orders, `docs/FEASIBILITY.md`), reading the order and the style notes (first order: a style-notes agent,
  guess $0.5–1.5), the reporter (about $0.55 in Pet World), the auditor (guess $0.5–1), the owner's preview round.
  About **$1.5–3 an order**. The menu spreads it over the items (about $1 an item) instead of charging it separately.

## 2. The token

**1 token = $0.10 of expected agent cost at API prices.** The menu's counts are about **1.3–1.7 times the typical
cost** of the item, so one extra round (a second maker round and recheck, or a teacher's change request after the
preview) is covered. A first-of-its-kind order can cost more than its tokens in the pilot; the owner absorbs that while
the numbers are recalibrated. What a teacher pays for a token is separate (section 4).

| Item | Tokens | = cost budget | Estimated typical cost | How it was estimated |
|---|---|---|---|---|
| `worksheet` | 30 | $3.00 | $1.75–2.9 | one Pet World sheet all in (table above) |
| `notes` | 25 | $2.50 | $1.5–2.0 | Pet World's note sheets are guided notes: $0.93–2.10 children a sheet, fewer scored items than a worksheet |
| `quiz` | 40 | $4.00 | $2.5–3.0 | 8–12 questions × 2 versions ≈ 1.2–1.5 sheets of items, blind on both versions, two Wilco passes |
| `readingquiz` | 150 | $15.00 | $9–13 | **measured** (g7-ela sample, the only ELA order): section 2b below. A quiz on passages costs 2–3 times a plain quiz to make right: passage-first design, a no-passage gate on each version, longer blind reads (added Nov 5, 2026, owner decision 4) |
| `test` | 70 | $7.00 | $5–7 | 20–30 × 2 ≈ 3 sheets of items at $1.4–2.1, 40% L3 (longer items), a skills map, plus the order share. **Thin margin: watch it first** |
| `studyguide` | 25 | $2.50 | $1.5–2.0 | like notes, with a short practice set |
| `slides` | 50 | $5.00 | $2.5–4 (**guess**) | no slide deck was measured in Pet World; speaker notes are output-heavy, the checker reads every slide for facts |
| `reviewgame` | 35 | $3.50 | $2.5–3.0 | about 20–30 question cards, one version: like a quiz without B |
| `rubric` | 15 | $1.50 | $0.8–1.2 (**guess**) | short; a blind read for student-friendly wording, no key to solve |
| `project` | 60 | $6.00 | $3.5–5 (**guess**) | steps, checklist and rubric; a fact and safety check for labs |
| `unitpack` | 220 | $22.00 | $20–27 | Pet World note-sheet units cost $10–18.7 (sheets only); add a quiz, a review and an A/B test (about $7–9). **Priced at about cost** |
| `bellringer` | 20 | $2.00 | $1.2–1.8 | 10 short warm-ups, one version: about a sheet of items, blind and Wilco once (added Nov 5, 2026) |
| `homework` | 20 | $2.00 | $1.2–1.8 | a shorter worksheet: about two-thirds of `worksheet`'s items (added Nov 5, 2026) |
| `versions` | 30 | $3.00 | $1.8–2.5 | the teacher's test is the source, so the maker only rewrites; the checkers run on the original and on A and B (up to about 30 questions; longer tests cost more) (added Nov 5, 2026) |
| `unitfull` | 420 | $42.00 | $30–42 | à la carte for 4 lessons: 4 × `notes` 25 + 4 × `homework` 20 + 2 × `bellringer` 20 + 2 × `quiz` 40 + `project` 60 + `rubric` 15 + `studyguide` 25 + `test` 70 = 470, about 10% off; plus the standards map. A first-of-its-kind run cost Pet World $33–54 a unit (7th grade units), so **watch the first orders** (added Nov 5, 2026) |
| `quizshow` | 35 | $3.50 | $2.5–3.0 (**guess**) | like `reviewgame`: about 25 questions in categories, one version (added Nov 5, 2026) |
| `crossword` | 15 | $1.50 | $0.8–1.2 (**guess**) | 10–20 clues; a generator fills the grid, a blind tester solves it from the clues alone (added Nov 5, 2026) |
| `wordsearch` | 10 | $1.00 | $0.4–0.8 (**guess**) | the grid is made by code; the agent work is the word list and a spelling check (added Nov 5, 2026) |
| `logicpuzzle` | 20 | $2.00 | $1.2–1.8 (**guess**) | written by the maker, proved to have exactly one solution by a solver script, then solved blind (added Nov 5, 2026) |
| `reviewapp` | 60 | $6.00 | $3–5 (**guess**) | the content (cards, steps, practice) plus a tested offline app template; checked like a quiz and opened in a browser test (added Nov 5, 2026) |
| `interactive` | 45 | $4.50 | $2.5–3.5 (**guess**) | a worksheet's content plus accepted answer forms and hints, built on the Pet World note-sheet engine; browser-tested (added Nov 5, 2026) |
| `practicegame` | 70 | $7.00 | $3–6 (**guess**) | about 20 questions checked like a quiz, plus a tested game template skinned with the theme and a browser test; recalibrate after the first ones (added Nov 5, 2026) |
| `styleSetup` (extra) | 0 | — | about $0.5–1.5 for style setup, once | the first order's style notes, carried by the order |

**Owner decisions flagged by this table:**
1. **`unitpack` at 220 tokens has no margin.** À la carte, a 4-lesson pack is 4 × 25 + 4 × 30 + 40 + 25 + 70 = 355
   tokens. Pet World's own estimate for a unit is $20–27 here, so 220 covers the typical case only. Suggest **about
   300**, or say "up to 4 lessons" in its detail. Left unchanged in `menu.json` until the owner decides.
2. **`test` at 70 is the next thinnest.** Keep it, and check its first three real orders.
3. The `slides`, `rubric` and `project` numbers are guesses (no Pet World measurement): recalibrate them first.
4. **First measured runs (the four samples, Nov 5, 2026; `docs/audits/AUDIT-2026-11-05.md`):** rounds 1–3 cost $5.48
   (g4-math, 70 tokens), $7.74 (g7-ela, 55), $9.97 (g8-science, 115) and $9.85 (g11-history, 95): $33.04 against
   $34.50 of budgets. `test` came in over its share again (about $8 of g11-history's $9.85), so the audit recommends
   **about 90** after the first real tests confirm it; `quiz` on passages is now `readingquiz` (section 2b). Other
   items unchanged until five real orders (section 3).

## 2b. English reading quizzes and tests (owner, Nov 5, 2026; set by the first audit)

The owner: English reading quizzes get their own, higher price, "since they cost more to do right". The numbers come
from the only ELA order so far, the g7-ela sample (a 10-question A/B quiz on two passages the maker wrote, plus a
rubric; 55 tokens = $5.50), every session's own `total_cost_usd` (`samples/g7-ela/pack.json` `log`):

| Step (measured in g7-ela) | Cost |
|---|---|
| Maker, round 1 (two passages, 22 items, rubric, 3 relays for the bots) | $3.06 |
| Maker, a full redesign of the stems and choices (rounds 4, 5) | $2.58–2.61 |
| One no-passage probe, one version (fresh session) | $0.20–0.21 |
| Blind tester with the passages (two phases r1; three phases r4–r5) | $0.71; $2.64–2.72 |
| Fact checker on the article's claims (no web r1; with web r4–r5) | $0.27; $1.19–1.21 |
| Maker round on a FIX list; a recheck | $1.11–1.19; $0.48 |
| Reporter (cheaper tier) | $0.44–0.55 |
| **Rounds 1–3** (no gate; 20 of 20 answered without the passages, not caught until round 4) | **$7.74** (1.4× the budget) |
| **Rounds 1–5** (the owner's extra rounds to make the questions need the passage; still about 90% without it) | **$22.48** (4.1×) |

With the new rules (passage-first design; the no-passage probe as a round 1 gate; Part B choices that are all real
quotes; `agents/maker.md` v3, `agents/blind-ela.md` v2), a typical reading quiz is:
- round 1: maker with passage-first planning and its own no-passage self-read $3.0–3.5, the gate's two probes $0.42;
- one redesign when the gate fails (plan on it until the logs show otherwise): maker $2.6, probes again $0.42;
- the blind tester with the passages $1.0–2.7 and the fact checker $0.3–1.2;
- one FIX round: maker $1.1–1.2, recheck $0.5–2.7, probes on the changed items $0.2–0.4;
- reporter $0.5.

That is **about $9–13** (low $7.2 with no redesign, high about $15 with a heavy recheck). **`readingquiz` = 150
tokens ($15.00)**: about 1.2–1.7× the typical cost, the menu's usual cushion, and it covers one redesign plus one FIX
round. The plain `quiz` (40) stays for quizzes with no passage (math, science, history, grammar). The rubric is its own
item, as before (`rubric` 15).

**Reading test (a `test` built on passages):** no ELA test has run yet. Until one is measured, the 🧭 onboarding agent
adds the same reading surcharge as the quiz, **+110 tokens** (`readingquiz` 150 − `quiz` 40), to the test's 70:
**180 tokens** for a reading test with A/B versions. The surcharge pays for passage-first design, the round 1 gate on
both versions and the longer blind reads; a test's longer item list is already in `test`'s 70. A guess: recalibrate
from the first real reading test.

**Who applies it:** the order page shows `readingquiz` as its own item. When a teacher picks `quiz` or `test` for
English and the order builds the questions on passages (her passages, or passages written from her notes), the
onboarding agent moves the quiz to `readingquiz` (or adds the surcharge to the test), says so in the follow-up and asks
before charging more (`agents/onboarding.md` step 7). A grammar, vocabulary or writing quiz with no passage stays `quiz`.
The order page doesn't apply the surcharge itself yet (an owner change to `site/`).

## 3. How to recalibrate (after each 5 orders)

1. From `records/*.json`, add each order's `log[].cost` (exact rows as reported; estimated rows as the reporter
   marked them) and split it over the items by their share of questions.
2. For each item: tokens = typical cost ÷ $0.10 × 1.5, rounded to 5. Keep the change only if it moves more than 10%.
3. Update `menu.json` and this file together; `npm run check` fails if an item in the menu isn't explained here.
4. The auditor's savings (fewer rounds, cheaper tiers where a check covers a slip) lower the typical cost; pass them on
   only after they show in two orders' logs.

## 4. Subscription and token packs (PLACEHOLDER: the owner decides)

> **Not decided. Every number in this section is a placeholder for the owner.**

| Plan | Monthly tokens | Price | Per token | Example |
|---|---|---|---|---|
| Pay as you go | — | **$?** a token (placeholder: $0.20–0.25) | — | a worksheet at 30 tokens = $6.00–7.50 |
| Teacher monthly | **? tokens** (placeholder: 300) | **$?** (placeholder: $49) | about $0.16 | a unit pack plus a quiz a month |
| Department / homeschool co-op | **? tokens** (placeholder: 1,200) | **$?** (placeholder: $159) | about $0.13 | several teachers' packs |
| Extra token pack | **? tokens** (placeholder: 100) | **$?** (placeholder: $20) | $0.20 | top-up, doesn't expire (?) |

What the owner needs to decide: the price per token (it must cover the $0.10 cost budget, the owner's own time to run
and review an order in the pilot, card fees of about 3% + $0.30 a sale, failed or redone runs, and first-of-kind
orders), whether unused monthly tokens roll over, refunds when a pack can't pass its checks, and a minimum order to
cover the fixed per-order cost. Pet World's marketer's notes (`docs/marketing/MONETIZATION-2026-11-04.md`) guess
the owner's time at about 2 hours a unit; the pilot should time it.

## Owner direction (Nov 5, 2026)

"I think we will eventually make every test the same price, every worksheet the same price ... or just tell them how many
of each they can get in a monthly subscription." So the token numbers here are our internal cost budgets; what teachers
see can become flat prices per item kind, or a monthly plan that says "N tests, N worksheets, ..." a month. Decide after
the first real orders. Until then the onboarding agent recomputes tokens for what will actually be made, so a smaller
order costs less.
