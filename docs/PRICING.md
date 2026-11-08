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
| `readingquiz` | 150 | $15.00 | $9–13 | **measured** (g7-ela sample, the only ELA order): section 2b below. A quiz on passages costs 2–3 times a plain quiz to make right: passage-first design, a no-passage gate on each version, longer blind reads (added Nov 5, 2026, owner decision 4). Since Nov 7, 2026: citing short answers + RACE by default, passage multiple choice "in testing" at the same price |
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

## 2a. Interactive format (owner, Nov 8, 2026): same tokens as printable

Items with `"interactive": true` (worksheet, homework, quiz, test, reading quiz, study guide, versions; guided notes
and the review game since Nov 8, 2026) can be made as an interactive page instead of PDF and Word (docs/KINDS-INTERACTIVE-FORMAT.md). **It costs the same tokens**, because
the agent work is the same:
- the maker writes the same questions; the extra fields are small (stable ids, which every pack already has, and for
  "grade automatically" the typed forms of number answers, which `accept` already holds for paper keys; `tol`, `hint`
  and `miss` are optional). Guess: under 5% more maker output, inside the menu's 1.3–1.7× cushion;
- the checkers read the same student view; the page's own checks are code (`checks/interactive-format.mjs`: under a
  second fast, about 8 seconds in the browser for an A/B quiz in both modes on the build machine) and no agent session;
- rendering is code too: the g8-science quiz's two pages and teacher copies render in about 1.5 seconds.
- guided notes and the review game (Nov 8, 2026): **same tokens** (`notes` 25, `reviewgame` 35). The maker already writes
  every blank's `accept` for the paper key; the only new rule is naming a line's blanks in order with `;`. The page's
  checks are code: the g8-science notes in about 0.6 s fast and 4 s in the browser (both modes), the review-game fixture
  0.5 s and 11 s (both modes, class mode included); the notes' preview renders in about 1.5 s. No order logs exist yet
  to say otherwise; recalibrate with the rest of the interactive format after the first five orders.
Measured nothing from a real order yet: recalibrate with section 3 after the first five interactive orders, and if the
onboarding or maker logs show more than about 10% extra (for example follow-up questions about grading), propose a
surcharge to the owner.

## 2b. English reading quizzes and tests (owner, Nov 5, 2026; set by the first audit)

The owner: English reading quizzes get their own, higher price, "since they cost more to do right". The numbers come
from the only ELA order so far, the g7-ela sample (a 10-question A/B quiz on two passages the maker wrote, plus a
rubric; 55 tokens = $5.50), every session's own `total_cost_usd` (`archive/samples/g7-ela/pack.json` `log`; retired Nov 7, 2026):

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

**Measured again (g7-ela2, Nov 5; ELA audit, docs/audits/AUDIT-2026-11-07-ela.md):** $26.21 against 165 tokens
($16.50 with the rubric), with no passing draft: the makers were $21.95 of it (uncapped first draft $7.32, redesign
$12.21). Two reading orders over budget is a price signal, but both failed for the design option 1 replaces, and maker
sessions are now capped ($5.50 / $4.10 / $2.75 for a reading quiz with a rubric, `docs/RUNBOOK.md` step 4), which
puts a reading quiz with a rubric at about $7.6–17.0 with no redesign (low: the logs' cheapest steps; high: both makers
at their caps and the heaviest recheck) and $4.64 more per redesign (its cap plus two probes). `readingquiz` stays 150 until two
option-1 orders are measured; if both pass $15, the auditor recommends about 180 (owner decides).

**Short answer + RACE by default (owner, Nov 7, 2026; after four ELA tries failed the fresh no-passage probe):** a
`readingquiz` is now citing short answers plus a RACE response, and multiple choice on passages is an option marked "in
testing" (`menu.json`, `feasibility.json`, docs/FEASIBILITY.md). **The price stays 150 tokens**, and the logs don't
justify a change yet: no short-answer-only order has been measured. What changes in the work: the maker no longer
plans 8 multiple choice a version against the probe (try d's three rounds cost $4.10, $3.27 and $4.47 in sessions with it), but the
lead scores more short answers by hand, and the adopted try d changes add a second fresh final probe per version
(about $0.27 each, so about $0.54 an order) and a fact recheck of the last round's fixes (about $0.47–0.55). The
in-testing multiple choice costs the same 150 tokens: it is the old design, measured above. Recalibrate from the first two
short-answer orders (section 3); if both cost under $10, the auditor may propose a lower price (owner decides).

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

## 2c. Skipping the blind check (owner, Nov 8, 2026): same tokens for now, a discount proposed

The order page lets the teacher untick "Blind check by a fresh agent (recommended)" (docs/RUNBOOK.md step 5). What it
saves, measured on the first real online order (pp-2026-11-08-a20840, docs/audits/TIME-2026-11-08.md):
- **Dollars:** the blind tester's sessions were **$0.93 of $5.56** (round 1 $0.63, recheck $0.30): about **17%** of
  the order's cost, 13% of its $7.00 budget. With script-made versions the blind tester reads version A only, so on
  the fast path it is about $0.35 + $0.15, roughly 12% of an expected $4.1.
- **Minutes:** about **1** on the fast path (it runs beside the solver, so only the part it runs longer than the solver
  comes off the clock), and **about 5** when it would have found something: in this order both FIXes came from it, and
  the FIX round plus recheck took 4.4 minutes.

**The price stays the same** until the owner decides. **Proposal for the owner:** take about 10% off an item's tokens
when the blind check is skipped (rounded to 5: `test` 70 → 65, `quiz` 40 → 35, `worksheet` 30 → 25), which passes on
most of the measured saving and keeps the cushion for the FIX rounds it can no longer prevent. Decide after three orders
with it unticked show what they really cost (a skipped blind check can mean more change requests after the preview).

## 2d. The fast path (Nov 8, 2026): what it should cost

From the first real online order (pp-2026-11-08-a20840: a grade 12 statistics test, 16 items, 3 number-versions, 70
tokens = $7.00; docs/audits/TIME-2026-11-08.md): **$5.56** by hand. The same order on the fast path (docs/RUNBOOK.md),
step by step, from that order's session records:

| Step | Was | Expected | Why |
|---|---|---|---|
| Style notes; test calls | $0.09; $0.16 | $0.09; $0 | the runner makes no test calls |
| Maker, round 1 | $2.07 | $1.00–1.30 | version A plus `gen` specs, about half the output of three hand-made versions (77,574 output tokens) |
| Versions B, C | (in the maker) | $0 | `scripts/versions.mjs`, under a second |
| Blind tester, round 1 | $0.63 | $0.30–0.40 | version A's 16 rows instead of 48 |
| Solver, round 1 | $0.65 | $0.75–1.00 | a solver on A and **a second on every number in B and C**: a little more, the price of checking script-made numbers independently |
| Maker, FIX round | $0.70 | $0.45–0.70 | fixes A only; the script remakes B and C |
| Recheck: blind; solver | $0.30; $0.69 | $0.15–0.30; $0.45–0.70 | the changed rows only (blind: A only) |
| Reporter | $0.26 | $0.08–0.10 | the faster setting, writing only the story (the log rows come from the records) |
| **Total** | **$5.56** | **about $3.3–4.6** | **17–41% less, about $4.0 typical**; $0.6–1.7 less again with no FIX round |

Not counted above: the onboarding session (about $0.33, unchanged) and the runner's machine time (GitHub Actions: about
2 minutes of setup plus the run, roughly 15–20 minutes an order; inside the free minutes for a few dozen orders a month,
then about $0.01 a minute). **The menu doesn't change yet** (section 3, rule 4: a saving is passed on only after two
orders' logs show it). If the next two number-version tests come in under $4.5, the auditor may propose `test` at 60
(owner decides).

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
