# Token audit: 6th grade English Unit 12 (🎭 Storybook Library) and a budget for Units 13–15

By the 🔎 auditor, Nov 2, 2026, after the Unit 12 report. **It only recommends**: no code, content or other docs
changed, no agents started. The owner decides what to adopt. Sources: `ELA-UNIT12-LOG.md`, `ELA-UNIT12-REPORT.md`,
the makers' and checkers' notes (`WRITER-`, `WRITER2-`, `BUILDER-`, `BUILDER2-`, `BLIND-`, `BLIND2-`, `EYES-ELA12.md`),
`git log --stat` from `04584a9` to `4fbdebd`, the briefs' sizes and call budgets as the unit lead gave them, and
`AUDIT-ELA11.md` for every comparison. Dollars are the sessions' **reported** figures (API prices, not a bill) unless
marked "table" or "guess". The unit lead's usage is the coordinating session's counter, read before and after.

## The headline

- Child sessions cost **$12.55** (Unit 11: $13.97), 10% less, with a new screen and 16 long passages added.
- The unit lead cost about **$12.82**: as much as all seven children together. **All in, $25.37**, and the lead is
  **half of it (51%)**. The report guessed $3.59 for the lead; the real figure is 3.6 times that. Unit 11's guessed
  $9.24 was probably low too, so the two all-in totals can't be compared exactly.
- Most of what the Unit 11 audit promised arrived (builder, round 2, reporter). The misses were a recheck that tripled
  and a lead whose cost nobody was watching. Both are fixable for free.

## 1. Where the tokens went

| Session | Tier | Min | Tokens | $ reported | Share of $12.55 | Cache write | Output tokens (share of table $) |
|---|---|---|---|---|---|---|---|
| ✍️ Writer | main | 19 | 5.96M | 4.73 | **37.7%** | 184,858 | 105,910 (51%) |
| 👀 Fresh eyes (6 reviewers inline) | main | 33 | 5.68M | 2.48 | 19.8% | 95,926 | 29,809 (27%) |
| 🙈 Blind recheck + screens | cheaper | 19 | 7.80M | 1.56 | 12.4% | 113,265 | 34,096 (24%) |
| ✍️ Writer round 2 | main | 9 | 2.19M | 1.45 | 11.6% | 76,589 | 20,761 (34%) |
| 🙈 Blind solver + bot | main | 4 | 1.22M | 1.22 | 9.7% | 89,336 | 14,324 (30%) |
| 🏗️ Builder | cheaper | 5 | 3.29M | 0.87 | 6.9% | 91,393 | 19,172 (26%) |
| 🏗️ Builder round 2 | cheaper | 2 | 0.52M | 0.24 | 1.9% | 38,493 | 3,966 (21%) |
| **Children, measured** | | | **26.64M** | **12.55** | 100% | 689,860 | 228,038 |
| 🧭 Unit lead (counter, **not** in the report's totals) | n/a | 105 clock | 20.5M | **~12.82** | | 1,565,177 | 56,229 |
| **All in** | | | **47.1M** | **~25.37** | | | |

**Unit lead, split by kind** (its counter, at the table's prices): cache write 1,565,177 × $5 = $7.83 (**61%**); cache
read 18,883,013 × $0.20 = $3.78 (29%); output 56,229 × $20 = $1.12 (9%); input $0.02. Sum $12.74 against the counter's
$12.82. **The expensive part is writing context to the cache, not reading it.** A write of about 150k–200k tokens costs
$0.75–1.00, so 1.57M of writes means the initial reading plus roughly eight rewrites of a big context (after idle gaps,
my reading; the counter can't tell which). Averaged over 105 minutes it ran **$0.122 a minute**; the report's guess used
$0.14 a minute but only 26 "active" minutes. **Waiting costs money here**, because every poll re-reads the whole
conversation. Caveat: the same session also handled owner requests that are not Unit 12 (commits at 16:09, 16:12, 16:48,
16:51: worksheet plan, zip decisions, tour entry), so the true Unit 12 lead cost is somewhat below $12.82. I can't say
how much.

**By kind of work** (reported dollars):

| | Unit 11 (children) | Unit 12 (children) | Unit 12 all in |
|---|---|---|---|
| Making (writer, builders, round 2) | $8.43 (60%) | **$7.29 (58%)** | 28.7% |
| Checking (blind, eyes, recheck) | $4.99 (36%) | **$5.26 (42%)** | 20.7% |
| Reporting | $0.55 (4%) | $0 | 0 |
| Unit lead | guess $9.24 | **$12.82** | **50.5%** |

**Tokens and rates.** 26.64M vs 27.09M (−1.7%); $0.471 per million vs $0.516. Output rose 13% (228k vs 202k), all of it
the writer (105.9k vs 84.1k, +26%): 16 passages, a second poem set and 40 test-only items cost more than Unit 11's
shorter passages. The cheaper tier ran at about **50%** of the main tier's price: builder $0.87 reported vs $1.48 table
(59%), recheck $1.56 vs $2.78 (56%); the four main-tier sessions ran 113–127% of table. 0.57 ÷ 1.15 ≈ 0.5, better than the
55–60% estimated last time.

**Per lesson** (5 lessons, one skill each; every lesson got 14 practice + 8 test-only items, 2 typed items, 1 short
answer and about 3 passages, so the first-pass cost is nearly even): children **$2.51** a lesson (Unit 11: $2.79); all in
**$5.07**. Round 2 fixes landed unevenly: Plot 3, Characters 2, Theme 2, Poems 3 (plus the quoted word that touched items
97–101), **Language 0**. Round 2's floor is its context load (76,589 cache write = $0.38); the rest, about $1.07 over 13
change rows, is about $0.08 a change. So fixing is cheap; a separate fix session is what costs.

**Prior forecast vs actual** (`AUDIT-ELA11.md` §5, measured children): forecast **$13–20**, actual **$12.55**, just under
the low end. By session: writer 4.73 (forecast 5.5–7.2), builder 1.11 with round 2 (3.7–5.2 base; with R3 about 2–3), blind
1.22 (1.4–1.9), eyes 2.48 (3.4–3.9), round 2 1.69 with the builder's (2.3–2.9), **recheck 1.56 (0.4–0.5)**, report 0
(0.55). The lead forecast was $3.6–8.2; actual **12.82**, above the top.

## 2. What each check caught vs what it cost

| Check | Cost | What it caught | $ per finding | Verdict |
|---|---|---|---|---|
| Scripts while writing (`--draft` lint, fairness gate, bot, check-content, check-typed) | cents | The trained bot flagged two patterns while balancing (absolute words, middle keys above the mean length), fixed before hand-off. **No longest, shortest or key-copies-prompt FIX reached the blind solver** | n/a | **Keep. It did its job** (Unit 11: 3 of 8 FIX were that class; Unit 12: 0 of 7) |
| 🙈 Blind solve (120 items, 16 passages read in full) | $1.22 | 120/120 agree. **7 FIX**: a misquoted word in a public-domain poem; 3 practice/test overlaps (F2, F4, F7); 1 two-defensible-answers; 2 L3 items with no second step. 5 JUDGMENT (two of them became edits) | $0.10 per finding (12), $0.17 per FIX | **Best value again.** Found things no script can: quotation accuracy, practice/test overlap, difficulty |
| 👀 Fresh eyes (six inline, ~90 screenshots) | $2.48 | **New-screen defects only**: poem lines wrapped on phones (fixed), choices 2.5–3 phone screens below the story (led to the jump button), a dash wrapping alone, a three-part short answer. Shared-screen checks were all clean (no Khan wording, no doubled period, no two equal choices, no passage question without its passage) | $0.50 per finding (5) | **Yes, because the screen was new.** Its shared-code yield is now zero, as the Unit 11 audit predicted |
| ✍️ Round 2 (writer) + 🏗️ builder 2 | $1.45 + $0.24 | Applied 7 FIX, J1, J2, 2 eyes items; the jump button | $0.08 per change row | Needed; $1.69 is cheap for what it fixed |
| 🙈 Blind recheck of changed items + screen play | $1.56 | Changed items: **15 of 15 agree, nothing**; 1 JUDGMENT (115 is the longest choice). Screens: review → PIN → test works with passages, 17 deliberate misses showed no answer, jump button and hidden-story memory work. **Could not find the Storybook Library page in the Sticker Book** | $1.56 for 1 JUDGMENT | **Split it.** The solve part is insurance at the ~$0.3–0.5 floor. The screen part cost about $1.1 more and ran 70 calls against 30 mostly fixing click scripts |
| Lead's merges: verify, typecheck, build, fairness gate, bot, check-content, check-typed | lead calls | Nothing broke at any merge | n/a | Keep (cheap) |

What the report's "went wrong" list shows: **every real defect was found by a fresh reader, none by a script**, and two
of the three classes (quotation, overlap) have no script yet.

## 3. Did the Unit 11 audit changes save what they promised?

Gross change by session, Unit 11 → Unit 12 (children): writer +0.47, eyes −0.95, builder (both rounds) −1.11, round 2
−0.50, blind +0.02, recheck **+1.20**, reporter −0.55 = **−$1.42** ($13.97 → $12.55).

| Rec | Promised per unit | Measured | Arithmetic | Verdict |
|---|---|---|---|---|
| R1 lint + R2 brief | $0.6–1.2 | **$0.2–0.5** | Round 2 $1.95 → $1.45 = −$0.50, but 10 items changed vs 16: $0.145 vs $0.122 per change, so it is a smaller round, not a cheaper one. Key-tell FIX 3 → 0, but total FIX 8 → 7 (new classes). Writer +$0.47 (more output) | Worked on what it targeted; saving real but half the promise |
| R3 builder copies, cheaper tier | $0.6–1.2 | **$1.11 net** | $2.22 → $0.87 + $0.24 round 2; 42 → 31 calls; 4.50M → 3.29M tokens (−27%), and it built the new passage card | **Beat the promise** |
| R4 no reporter | $0.35–0.45 | **~$0.2 net** | $0.55 saved; the lead's 3 minutes at its $0.122 a minute ≈ $0.37 | Worked, saving smaller than claimed |
| R5 oracle label | $0.46 of lead time | not visible | The log shows no detour about the oracle number | Plausible, unmeasurable |
| R6 smaller eyes | $1.4–2.0 (Units 13–14) | not applied | Unit 12 kept all six, as planned. Eyes still fell $0.95 on 90 shots vs 155, and shared screens found nothing, supporting R6 | Holds for Unit 13–14 |
| R7 conditional recheck | $0–0.36 | not applied | Changed keys and a passage, so a recheck was warranted. Its scope grew instead (+$1.20) | Adopt with the scope limit in §4 |
| R8 "broadest" strategy | quality | in place | `check-fairness.mjs` and `test-wise-cues.mjs` name it; best unit-test cue 28.7 vs 25 chance; no broadest-key finding | Works |

**Promised total −$2.1 to −4.2; delivered −$2.16 on the same items** (builder −1.11, round 2 −0.50, reporter −0.55),
the bottom of the range. The net −$1.42 is that, minus +$1.67 of new cost (writer +$0.47, recheck +$1.20), plus −$0.95 from
fewer screenshots. **The lead was not part of the Unit 11 audit's savings, and it is now the largest line.**

## 4. Ranked recommendations

Savings are per unit unless said, with the arithmetic. "Catch" is the check that notices a slip.

### Free wins

**R1. Cut the unit lead's polling.** The lead polled every few minutes for 105 minutes (about 30 polls, my estimate).
Each poll re-reads about 150k tokens (avg context ≈ 18.9M cache read ÷ ~125 calls) ≈ $0.03 plus its output. Brief each
child: "when done, send one `send_message` to session X with the branch and the commit", and have the lead do one
`ScheduleWakeup` at the child's typical finish (writer 19 min, builder 5, blind 4, eyes 33, recheck 19) instead of
polling. Avoid ~25 polls × $0.03–0.06 = **$0.7–1.5**. *Risk:* a stuck child is noticed later. *Catch:* the one fallback
wake and the failure event the lead already receives.

**R2. A one-page lead recipe, not the long reading list.** The lead started by reading `AGENTS`, `AGENT-STARTER`, the map,
`CONTENT-RULES`, `BLIND-REVIEW`, Unit 11's log, report and audit: about 40–50k tokens that then sit in every later call.
Replace the Unit 11 log/report/audit with a ~3k-token page (the seven briefs verbatim, commit ids `cbce0a1` and
`ade0402`, the call budgets, the decision rules for FIX and JUDGMENT, the three-point counter check). Carry cost of 40k
tokens over ~110 calls = 40k × 110 × $0.20/M = $0.88, plus its cache write $0.20 once and again at each rewrite (×1–8,
$0.2–1.8): **$1.0–2.5**. The briefs are not in the repo today, so each lead rewrites ~3,600 words (a few cents but
inconsistent). *Risk:* a stale page. *Catch:* `AGENTS.md` stays the authority; the auditor compares each run to it.

**R3. Read the counter three times and say so in the log:** at start, after the first merge, at the end; and keep owner
side requests out of the unit lead's session (or log the counter around them). It costs two calls and finally splits the
$7.83 cache write into "reading" and "rewrites". **No saving of its own; it makes R1, R2 and R6 provable.** No risk.

**R4. A stop rule for click scripts in every checker brief:** "if a click script fails twice, write 'not reached' and
stop." The recheck used about 70 calls against 30; ~40 extra calls × ~111k tokens × $0.20/M = $0.89 of reads, plus the
share of 34k output spent on scripts (~$0.3–0.4). Eyes also stuck on a select-all item. **Saves $0.5–1.0** (the recheck
alone). *Risk:* screens unplayed. *Catch:* R5's helper, and the owner's phone play-through already in the report.

**R5. A committed `scripts/play-unit.mjs` helper** (seeded save with `unlockAll`, a grown-up PIN, answers any question
type from the key, reaches the review gate, the unit test and the Sticker Book page). One cheaper-tier session, like the
Unit 12 builder: about **$0.9–1.3** once (0.87 reported + 25% for the harder job). It replaces the scripts every checker
rewrites: the recheck's ~40 extra calls (**$0.9–1.3**), eyes' stuck select-all calls (10–15 calls × 190k × $0.20/M ≈
$0.4–0.6) and the builder's blind spot (the card was checked only in a standalone page, so the phone-scroll problem
reached eyes; it would have cost the builder 3–4 calls ≈ $0.1). **Saves $1.3–2.0 a unit over Units 13–15 = $3.9–6.0 for a
one-time $1.1.** *Risk:* the helper drifts as the game changes. *Catch:* `npm run smoke` and `verify` run it nightly or at
merge; a broken helper fails loudly.

**R6. Keep R6 from the last audit, with the new-screen exception.** Units 13 and 14: three reviewers (first-time kid,
parent/progress, phone width), ~25 calls, plus a deep pass on **only the screens that are new** (a text-design layout in
Unit 13 if one exists). Unit 12's shared-screen checks (Khan wording, doubled period, equal choices, missing passage,
PIN gates) came back clean. Eyes were $2.48 on 90 shots; three reviewers ≈ 55–70%: $1.4–1.7, **saves $0.8–1.1**. Unit 15
keeps six reviewers. *Risk:* a new-screen slip. *Catch:* eyes on the new screen, the helper (R5), the owner's play-through.

### Trade-offs

**R7. Split the recheck.** The changed-item solve stays on the cheaper tier, scoped to **changed items and the passages they
sit on** (Unit 12's did exactly this and found nothing, at about $0.4–0.5 of the $1.56). The screen play moves to R5's
helper, run by the lead (two calls) or eyes. Saves **$0.8–1.1**. *Risk:* a distractor rewritten into a second right
answer. *Catch:* the solve itself, the lint, and the bot. Do not drop the solve: its job is to prove round 2 broke
nothing.

**R8. Cheaper tier for the unit lead on Units 13 and 14.** Lead $12.82; about 50% of the main tier's price; applying R1–R3
first leaves a lead near $8–11. At half price that is **$4–6, saving $4–6 each, $8–12 over both**. The lead's decisions
this run were mostly rule-following: all 7 FIX applied, J1 and J2 adopted as the blind solver leaned, J3 and J5 kept per
the rules. *Risk:* a wrong JUDGMENT call or a missed note. *Catch:* the blind recheck of changed items, the log the
owner reads, and this audit; return to the main tier for Unit 15 and after any run where the log shows a bad call. Try
it on Unit 13, and look at the counter at the first merge (R3) before committing Unit 14.

**R9. Cheaper tier for writer round 2.** Blind FIX reports already give the "exact fix"; round 2 was 13 mechanical rows
($1.45, of which $0.38 is context load). At half price: **saves $0.55–0.75**. *Risk:* a rewritten wrong choice becomes a
tell. *Catch:* `--draft` lint, fairness gate, bot, and the blind recheck of changed items (R7). Try it once and watch the
recheck's FIX count.

**R10. A practice-vs-test overlap script** (three of seven FIX: the same example line, the same key shape, the same rule).
Flag a test-only item whose prompt or key shares a distinctive phrase with a practice item. One-time ≈ $0.6–1.0 on the
cheaper tier; saves ~3 of 7 FIX from round 2: 3 × $0.08 = **$0.25 plus a lighter blind solve, about $0.1**. A quality
play, break-even about Unit 15. *Risk:* noise. *Catch:* the blind solve, unchanged.

### Do not do

- **Dropping the blind solve, fresh eyes or the changed-item recheck.** The solve found 7 FIX no script can; eyes found
  the new-screen defects; the recheck proves round 2. Each is the replacement for the other's blind spot.
- **Resuming the first writer for round 2.** The fresh round 2 cost $1.45 with a $0.38 context load; a resumed writer
  rereads a bigger context on every call. About even, and a fresh reader keeps the "two reports only" discipline.
- **Cutting the reserved test pool or the passages to save writer cost.** It is the owner's rule, and the writer's
  output ($2.12 of its $4.73) is the content.

**Savings roll-up (Unit 13/14, R1–R7, no tier change on the lead):** R1 0.7–1.5 + R2 1.0–2.5 + R4 0.5–1.0 + R5 1.3–2.0 +
R6 0.8–1.1 + R7 0.8–1.1 (R4, R5 and R7 overlap on the same recheck calls; I count the overlap once, about −$1.0) =
**$4.1–8.2 a unit**, of which about $2.2–5.0 is lead cost.

## 5. Budget for English Units 13–15

All in = measured children + the unit lead. Children's ranges start from Unit 12's measured figures scaled to each unit
and apply R1–R7. The lead column is Unit 12's $12.82 less R1, R2 and R3 ($1.7–4.0) and less owner side chat (unknown).

| Unit | Writer | Builder (+r2) | Blind | Eyes | Round 2 | Recheck | **Children** | Lead, main tier | **All in** |
|---|---|---|---|---|---|---|---|---|---|
| **13** 📰 Reference (`elaInfo`): claims, sources, text design | 3.5–4.8 | 0.6–1.5 | 1.1–1.5 | 1.2–1.8 | 1.0–1.5 | 0.4–0.7 | **$8–12** | 8–11 | **$16–23** |
| **14** 🔤 Word (`elaVocab`): roots, context clues, tools | 2.8–4.0 | 0.5–1.0 | 1.0–1.3 | 1.2–1.8 | 0.8–1.3 | 0.4–0.7 | **$7–10** | 8–11 | **$15–21** |
| **15** ✍️ Writing (`elaWrite`): rubric-scored pieces | 4.0–5.5 | 3.0–8.0 | 1.2–2.2 | 2.5–3.5 | 1.5–3.0 | 0.8–1.6 | **$14–24** | 10–15 | **$24–39** |
| **Units 13–15** | | | | | | | **$29–46** | **26–37** | **$55–83** |

With R8 on Units 13 and 14 (lead at half price, $4–6 each): all in **$12–18** and **$11–16**, and Units 13–15 **$47–73**.
Plus a one-time **~$1.1** for R5's helper, charged to Unit 13, and **~$0.6–1.0** if R10 is adopted.

**How the ranges were built**

- **Unit 13.** Writer: Unit 12's $4.73 with output scaled to shorter, informational passages (~0.75–1.0×) and the lint in
  place. Builder: Unit 12's $0.87 for the copy, more if a text-design layout is drawn; builder round 2 only if eyes find a
  screen defect. Eyes: three reviewers (R6). Round 2: 10 change rows ≈ $0.4 floor + $0.08 each. Blind: roughly Unit 12's
  with shorter passages. Claims and sources arguments are more arguable, so allow more JUDGMENT.
- **Unit 14.** No passages; short items and term cards. Vocabulary keys give themselves away by length or a shared root,
  so the blind solver's FIX share is the risk (the lint and the broadest-choice cue already cover it).
- **Unit 15.** The wide one: a writing-process screen flow, saved drafts and rubric scoring are new code if they do not
  exist. Builder is $3–8 (one or two making sessions, not the cheaper copy). The blind solver's job shifts to a rubric
  and model-answer review. Eyes stay at six reviewers and the recheck plays the new screens through R5's helper.
- **Lead.** Unit 12's $12.82 less R1 ($0.7–1.5), R2 ($1.0–2.5): $8.8–11.1, rounded to $8–11 for Units 13–14. Unit 15
  adds decisions and a longer wait for a larger builder: $10–15.

**What could push a unit above its range**

- **The lead's cost is the least certain line.** It rests on one measurement that includes unrelated owner requests and a
  guess about rewrites. If R3 shows its per-call context is larger than 150k, cache writes grow and R2 is worth more.
- A **game** in any unit (not asked): $4–6 plus a test script, and the Arcade copy.
- **Longer passages** than planned: writer output and the blind read scale with words; doubling them lands Unit 13
  near $14 in children.
- **A second builder round** (Unit 15 mostly): +$0.5–1.5.
- **A recheck that again has to play screens by hand** (no R5): +$1.1.
- Skipping R1–R7: add back $2.2–5.0 a unit of child cost (the lead part is separate).

## 6. Short list for the owner

1. **Adopt R1, R2, R3, R4 now** (free): lead polling, one-page recipe, a counter reading in the log, and a stop rule for
   click scripts. Together **$2.9–6.0** a unit, almost all lead and recheck cost.
2. **Build R5 (the play-unit helper) before Unit 13**, about $1.1 once; it saves $1.3–2.0 on each later unit and gets
   checkers to the unit test and the Sticker Book page.
3. **Try R8 (cheaper-tier lead) on Unit 13**, then decide for 14. Keep the main tier on Unit 15.
4. **Budget Units 13–15: children $29–46, lead $26–37, all in $55–83** ($47–73 with R8).

*Open numbers I could not get:* how the lead's $7.83 cache write splits between initial reading and rewrites; how much of
the $12.82 was owner side requests; the number of polls and the lead's tier; the tool-call counts for writer round 2 and
for Unit 11's lead; the brief texts (only their sizes). Section 5's lead line carries that uncertainty.
