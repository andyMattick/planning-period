# Token audit: 6th grade English Unit 11 (🔍 Reading Library) and a budget for Units 12–15

By the 🔎 auditor, Nov 1, 2026, after the Unit 11 report. **It only recommends**: no code or content changed, no agents
started. The owner decides what to adopt. Sources: `ELA-UNIT11-LOG.md`, `ELA-UNIT11-REPORT.md`, the agents' write-ups
(`WRITER-`, `BUILDER-`, `BLIND-`, `EYES-`, `WRITER2-`, `BLIND2-ELA11.md`), `git log`, and for comparison `AUDIT-G7.md`
("Unit 3 follow-up") and `G7-UNIT3-REPORT.md`. Every dollar below is the sessions' **reported** figure unless it says
"table" (the report's price table) or "guess". Dollars are what the work would cost at API prices, not a bill.

## 1. Where the tokens went

Measured: 7 sessions, **27.09M tokens, $13.97**. Not measured: the unit lead (26 min) and the lead (15 min): the report
guesses about **$9.24** more ($5.71 to $13.00), so the whole run is about **$23.21**.

| Session | Min | Tokens | $ reported | Share of $13.97 | Cache-read share of its tokens | Tokens per call* | Output tokens (share of its table cost) |
|---|---|---|---|---|---|---|---|
| ✍️ Writer | 16 | 6.10M | 4.26 | **30.5%** | 97.1% | ~160k (38 calls) | 84,103 (45%) |
| 👀 Fresh eyes | 17 | 8.92M | 3.43 | **24.6%** | 98.7% | ~178k (50 calls) | 37,014 (24%) |
| 🏗️ Builder | 7 | 4.50M | 2.22 | 15.9% | 97.7% | ~107k (42 calls) | 25,940 (27%) |
| ✍️ Writer round 2 | 14 | 3.68M | 1.95 | 14.0% | 96.8% | calls not logged | 26,106 (31%) |
| 🙈 Blind solver + bot | 4 | 1.55M | 1.20 | 8.6% | 95.0% | ~103k (15 calls) | 14,292 (29%) |
| 🧾 Reporter (cheaper tier) | 2 | 1.52M | 0.55 | 3.9% | 94.4% | calls not logged | 10,840 (25%) |
| 🙈 Blind recheck (cheaper tier) | 2 | 0.82M | 0.36 | 2.6% | 92.0% | ~91k (9 calls) | 3,519 (13%) |
| **Total** | | **27.09M** | **13.97** | 100% | **97.3%** | | 201,814 |

*Tokens per call = session tokens ÷ the tool calls the session reported. It is a rough context size.

**By kind of work:** making (writer + builder + round 2) **$8.43 = 60%**; checking (blind, eyes, recheck) **$4.99 =
36%**; reporting $0.55 = 4%. If the guessed $9.24 for the leads is added, checking is about 21% of $23.21.

**The cache-read share is high but cheap.** At the table's prices (cache read $0.20, cache write $5, output $20 per
million) the 27.09M tokens come to $12.79:

| Kind | Tokens | Share of tokens | Table $ | Share of table $ |
|---|---|---|---|---|
| Cache read | 26,352,281 | 97.3% | $5.27 | 41% |
| Cache write | 695,929 | 2.6% | $3.48 | 27% |
| Output | 201,814 | 0.75% | $4.04 | 32% |

So **97% of the tokens are only 41% of the money.** The other 59% is two things a session pays once: loading its context
(cache write, about 60k to 175k tokens a session, $0.31 to $0.87) and writing (output). Two consequences:

- **A fresh session has a floor of about $0.3.** The 9-call recheck read about 91k per call and wrote 62k to cache:
  $0.31 of write plus $0.15 of reads at the table, $0.36 reported. Every extra session costs this before it does any
  work. The 7 sessions' cache writes alone were $3.48 at the table (27% of the table total).
- **The writer is expensive because it writes**: 84k output tokens = $1.68 of its $3.74 table cost (45%). That is the
  content itself. Not waste.

**Which sessions ran long, and why**

- **Fresh eyes (17 min, 8.92M, $3.43):** 155 screenshots at 375 and 1280 wide stay in the conversation, so each of
  about 50 calls re-reads ~178k tokens, the biggest context of any session. The cost is the screenshots, not the number
  of findings.
- **Writer (16 min, $4.26):** ~110 multiple-choice items, 10 typed items, 5 short answers, an essay, 13 term cards and a
  review list in one session. It is the content, and it stayed at 38 calls (the cap is about 40).
- **Round 2 (14 min, $1.95):** 3.68M tokens for 26k output. It re-read the bank and two reports to change 16 prompts, and
  it paid its own context load again. Short in output, long in reading.
- **Nothing ran away.** Unit 3's first builder ran ~328k per call and 80 calls; here the largest context is 178k and
  the largest call count is 50. The 40-call cap and the starter page held.

**Cheaper tier.** The reporter ($0.55 reported, $0.88 table) and the recheck ($0.36 reported, $0.53 table) came to
62–68% of table; the other five sessions came to 111–124% of table. Same tokens, so the cheaper tier is about **55–60%
of the usual price** (0.65 ÷ 1.16). That is an estimate from two sessions.

## 2. What each check caught vs what it cost

Cost of the scripts is the writer's or lead's few calls (cents); sessions are exact.

| Check | Cost | What it caught | $ per finding | Earned its cost? |
|---|---|---|---|---|
| Fairness gate, test-wise bot, check-content, check-typed, verify, typecheck, build (writer and lead, 3 or more runs) | cents | While writing: one two-part item failed `middle` until fixed. After: nothing. **All passed while 8 FIX items were in the bank** | — | **Yes, but not enough alone.** They stop known patterns (about 4–7% to pass for the best bot), not giveaways in a prompt's wording |
| 🙈 Blind solve of the keyless view | $1.20 | 120 of 120 keys agree. **8 FIX** (2 prompts give the key away, 3 odd-one-out or longest keys, 1 grammar break, 2 L3 too easy), 4 JUDGMENT, 9 KEEP | **$0.10** per finding (12), $0.15 per FIX | **Best value.** The only check that found key giveaways |
| 👀 Fresh eyes (six reviewers, 155 screenshots) | $3.43 | 3 screen fixes (a Khan sentence on a no-Khan unit and review banner; a doubled period in "The answer is …" for every subject; a grown-up label on a kid tile) + 4 content items (1 also found blind) + 1 shared JUDGMENT (help stop mid-review) | **$0.49** per new finding (7 new) | **Yes this time, less next time** (see below) |
| ✍️ Round 2 (a fix, not a check) | $1.95 | Applied 8 FIX, 3 main-idea items, test item 22, the sea otter item; 5 ids changed | $0.12 per changed prompt (16) | Needed while the writer ships FIX items |
| 🙈 Blind recheck (cheaper tier, 16 changed prompts) | $0.36 | **Nothing.** 15 of 15 agree | — | Insurance. Cheapest session in the run, still at the ~$0.3 floor |
| 🧾 Reporter (cheaper tier) | $0.55 | Not a check | — | Mostly writes up what `make-report.mjs` already generates |

**Fresh eyes, in detail.** Its 3 screen fixes were in shared code (the "Khan Academy link" sentence on a no-Khan unit,
the doubled period, the tile label). They are fixed now and cannot recur in Units 12–15, so that part of the yield is
gone: expect 0–1 screen findings per later unit. Its content items were: the bee heading copied from the prompt (blind
also found it), a two-part Part B choice wrong only by an added opinion, the Duchess key longest, and a choice in both
parts. A script can find the first, third and fourth (copied text, longest key, a choice repeated across parts), so most
of the content yield can move to a free check. The one thing only real screens found, and a script cannot, is how a
**new kind of screen** looks at phone width.

**Which checks earned their cost:** the blind solve (clearly), the scripts (free), fresh eyes (once, for the shared
defects). **Which could be cheaper without losing what they catch:** fresh eyes (smaller scope after Unit 12), the
recheck (a script unless a key or fact changed), the reporter (the lead can run the generator), the builder (copy the
Unit 11 commit).

## 3. How this library unit compares with the 7th grade math units

| | Math Unit 1 | Math Unit 2 | Math Unit 3 | ELA Unit 11 |
|---|---|---|---|---|
| Stations / lessons · skills | 5 · 9 | 4 · 8 | 4 · 8 | 5 · 5 |
| Clock time | 1 h 38 | 1 h 17 | 2 h 38 | **1 h 8** |
| Cost (reported, measured) | ~$20.83 (est.) | $26.43 | $42.06 | **$13.97** |
| Per station or lesson | ~$4.2 | $6.6 | $10.5 | **$2.79** |
| Per skill | ~$2.3 | $3.3 | $5.3 | $2.79 |
| Tokens | n/a | n/a | 92.29M | **27.09M** |
| Price per million tokens | n/a | n/a | $0.46 | **$0.52** |
| Sessions · rounds of making | 9 · 5 | 4 · 5 | 14 · 3 | **7 · 2** (builder, writer; one fix round) |
| Checkers' findings | 2 FIX, 9 judgment | 5 FIX, 24 judgment | 4 FIX, 14 judgment | 8 FIX, 4 judgment |

What was different:

- **No generators, oracle, solver sessions, worksheets, videos or game.** Unit 3 had a solver and two solver rechecks, a
  worksheet maker ($4.78), a game designer ($4.26), a videographer, and builder rounds 2 and 3 ($7.66 together). None
  of those exist here. Unit 11 is 33% of Unit 3's dollars and 29% of its tokens.
- **A skeleton commit let the writer and builder run at once** (16 and 7 minutes, in parallel). That saved about 7
  minutes of clock time. It saved **no tokens**: both sessions still loaded their own context. The real saving was one
  fewer round of "builder waits for content".
- **Dearer per token than math** ($0.52 vs $0.46 per million): content is mostly output (29–32% of the dollars from 0.75%
  of the tokens) and the sessions are short, so the context-loading cost is spread over fewer reads.
- **The findings were wording, not arithmetic.** Math's blind solve found a 77% guess strategy and printed answers;
  here it found a key copied from the heading and the broadest/longest key. The same $1–2 check earned its cost in
  both. Fresh eyes found shared-code slips here (Khan, doubled period) and a hidden giveaway in math.
- **One step-in** by the coordinator (Unit 3 had three); no session failed on a short commit id (full ids were used).

## 4. Ranked recommendations

Savings are per unit, in dollars at reported rates, with the arithmetic. "Catch" is the check that would notice a slip.
Where two recommendations overlap, the overlap is removed in section 5.

### Free wins (no quality change)

**R1. A per-item "key tells" lint script, run by the writer while writing.** It flags (not fails): a key that repeats a
phrase or heading from its own prompt (the bee heading, "California… gold" → Gold Rush); a key that is the longest,
shortest or the one different-looking choice in that item (3 of the 8 FIX and the Duchess key); a choice that appears in
both parts of a two-part item. Of 11 content fixes (8 blind FIX + 3 fresh-eyes content), about 7 fit this script, so
~64%. Round 2's variable part is about half of $1.95 (the rest is its context load): 0.64 × 0.5 × $1.95 ≈ $0.62.
**Saving $0.4–0.8** a unit, plus a shorter FIX list for the blind solver.
*Risk:* a noisy script makes the writer ignore it. *Catch:* the blind solve still runs unchanged; the script only moves
its findings earlier.

**R2. Give the writer the blind solver's common findings up front.** Add 5 lines to the writer's brief or the starter
page: "never copy a heading or phrase from the prompt into the key", "keys longest or odd-one-out: change the others,
not the key", "a wrong choice must fit the blank's grammar", "L3 items need a real second step", "check for a choice in
both parts". Cost: ~300 tokens in a brief. **Saving: shared with R1, together $0.6–1.2** a unit (R1 is the script that
proves it; R2 prevents it). *Risk:* none. *Catch:* blind solve.

**R3. Brief the builder with the Unit 11 wiring commit.** Say: "Do the same as `cbce0a1` and `ade0402` (wiring and
`GEORGIA_ELA`) for course X; `git show --stat` first." The builder spent ~42 calls partly finding the pattern. Going
from ~42 to ~25 calls at ~107k per call: 17 calls × 107k × $0.20/M ≈ $0.36 of reads, and it writes less. Add the cheaper
tier for this mechanical copy ($2.22 × ~0.57 ≈ $1.27 if the same size). **Saving $0.6–1.2** a unit.
*Risk:* a copied pattern copies Unit 11's quirks. *Catch:* `npm run verify` (it already checks Georgia ELA courses have
no Khan entry), typecheck, build, and fresh eyes on real screens.

**R4. The lead runs the report generator; no reporter session for Units 13–15.** Copy `scripts/builder/units/ela-unit11.mjs`,
edit the title and lessons, run `node scripts/builder/make-report.mjs --unit ela-unitN`. Reporter $0.55 → lead's
two calls at ~200k context (≈ $0.08 to $0.2, unmeasured). **Saving $0.35–0.45.** *Risk:* the narrative sections ("what
a person still has to do") were written by a fresh reader; the lead wrote the log. *Catch:* this auditor reads the log
and report next, and the owner reads the report.

**R5. Label the bot's "oracle" column as a hindsight ceiling in its output.** The lead spent 2 minutes (21:30) checking
whether 72.2 on the unit test was a failure. It is not (each item's best cue chosen after seeing the key). 2 min × $0.23
a minute (the report's guess rate) ≈ **$0.46 of unmeasured lead time**, and it prevents a false alarm. *Risk:* none.
*Catch:* the bot's exit code is unchanged.

### Trade-offs

**R6. A smaller fresh-eyes scope for library units after Unit 12.** Screen defects in shared code are fixed, so 6
reviewers at 155 screenshots is more than a text-only unit needs. Proposal: three reviewers (a first-time kid, a
parent/progress reviewer, a phone-width reviewer), about 25 calls, 375 wide for every lesson and 1280 for three screens.
Calls halve and early calls are cheaper than late ones (context grows), so cost lands at roughly 40–60% of $3.43:
**$1.4–2.1**, a **saving of $1.4–2.0** for Units 13 and 14. Keep the full six for Unit 12 (long passages are a new
screen) and Unit 15 (new flows): for Unit 12 a four-reviewer version saves $0.5–1.0.
*Risk:* a screen slip is missed. *Catch:* the first units already fixed the shared slips; R1's lint takes over the
content half; the owner's play-through of one lesson on a phone (already in the report's to-do list); and any slip
fresh eyes does find reopens the full scope for the next unit.

**R7. Make the blind recheck conditional, or a script.** Replace the session when round 2 changed only wording of wrong
choices and no key, fact or passage: a script diffs the changed ids, confirms each key letter or answer is unchanged,
and reruns the lint (R1), the fairness gate and the bot. Run the cheaper-tier recheck (floor ~$0.3) only when a key, a
fact or a passage changed. **Saving $0 to $0.36; expect about $0.2.** *Risk:* a distractor rewritten into a second
right answer. *Catch:* the script checks the key text is unchanged and the lint catches a wrong choice that now repeats
or overlaps the key; fresh eyes (R6) reads those screens. Low priority: this was the cheapest check and found nothing,
but it is also proof that round 2 did not break anything.

**R8. Add a "least specific" (broadest choice) strategy to the test-wise bot** (the blind solver's J1: main-idea keys
were always the broadest choice, which no bot strategy played). **One-time cost about $1–2** (a builder-sized session on
`scripts/test-wise-bot.mjs`); no per-unit dollar saving, because the blind solver finds it anyway at the same price. It
moves a finding from a $1.20 session to a free script, so it pays back in quality, not tokens: it matters most for Unit
13 (claims, reasons) and Unit 14 (vocabulary definitions), where "broadest" or "most specific" is a real cue.
*Risk:* a false alarm on units where the broad answer is correct. *Catch:* the blind solve; the bot's rule stays "within
15 points of the pass mark or about 10 over chance fails". Recommended before Unit 13.

**R9. Cheaper tier for the builder's wiring copy (included in R3), nowhere else.** Do **not** move the writer, the blind
solver or fresh eyes to the cheaper tier: they are the reads that find giveaways and screen problems, and the
cheaper tier's saving (~40% of one session) is under $2 on any of them. Reporter and recheck already use it.

### Not recommended

- **Splitting the writer into two parallel halves.** Halves would load context twice (~$0.5 each) and cut reads by maybe
  25%, saving $0.2–0.5 and risking mismatched voice. It saves minutes, not money.
- **Resuming the first writer for round 2.** Fresh round 2: ~$0.45 cache write plus ~100k-token reads. Resumed: no write
  but ~160k-token reads. About even. Keep the fresh session (it also reads only the two reports, like a stranger).
- **Dropping the blind solve or the bot.** Nothing replaces either; they are the cheapest checks and found the 8 FIX.

## 5. Budget for English Units 12–15

Baseline: Unit 11's recipe, **$13.97 measured** (and $9.24 guessed for the leads, $23.21 whole). The tables apply
R1–R7 as above. Ranges are low (all savings land, smallest scale) to high (only the smallest savings, biggest scale).
**Measured sessions only**; the unit lead is added after.

| Unit | Writer | Builder | Blind | Eyes | Round 2 | Recheck | Report | Base | Savings (R1–R7) | **Measured** |
|---|---|---|---|---|---|---|---|---|---|---|
| **12** 📚 Storybook (`elaLit`): stories, poems, period literature | 5.5–7.2 | 3.7–5.2 | 1.4–1.9 | 3.4–3.9 | 2.3–2.9 | 0.4–0.5 | 0.55 | 17.2–22.2 | −2.1 to −4.2 | **$13–20** |
| **13** 📰 Reference (`elaInfo`): claims, sources, text design | 4.3–5.5 | 2.2–4.2 | 1.2–1.6 | 3.4 | 2.0–2.5 | 0.4 | 0.55 | 14.0–18.1 | −3.0 to −5.2 | **$9–15** |
| **14** 🔤 Word (`elaVocab`): roots, context clues, tools | 3.4–4.7 | 2.2–3.2 | 1.1–1.4 | 2.8–3.4 | 1.5–2.3 | 0.4 | 0.55 | 11.9–15.9 | −3.0 to −5.2 | **$7–13** |
| **15** ✍️ Writing (`elaWrite`): rubric-scored pieces | 5.1–6.4 | 5.2–10.2 | 1.6–2.7 | 3.4–4.5 | 2.0–3.0 | 0.4–0.9 | 0.55 | 18.2–28.3 | −1.6 to −3.2 | **$15–27** |
| **All four** | | | | | | | | | | **$44–75** |

Rough tokens at Unit 11's $0.52 per million: **85–145M** for all four. The unit lead's own work is not measured: at
the report's guessed $0.14–0.32 a minute and 26 minutes a unit (the lead's 15-minute gap map is a one-time job and
should not repeat), add about **$3.6–8.2** a unit, **$14–33** for the four. **All in: about $58–108.** For scale: four
Unit 11 repeats with nothing changed would be $56 measured, $93 all in; one math Unit 3 was $42.

How the ranges were built, by session, as a multiple of Unit 11's cost:

- **Unit 12 (×1.2–1.6 overall).** Stories and poems need passages well over the ~70 words Unit 11 held to; the lead noted
  "no long-passage pattern exists", so the builder session likely adds one ($1.5–3 on top of the $2.22 wiring), the
  writer outputs 2–3 times more text per passage (×1.3–1.7 = $5.5–7.2), and every long passage makes the blind solver
  and fresh eyes read more (×1.2–1.6 and a full-size eyes pass at $3.4–3.9 because the screens are new).
- **Unit 13 (×0.7–1.1).** Short claim and source passages; the writer is close to Unit 11 (×1.0–1.3). Credibility and
  "best evidence" items are more arguable than main idea, so expect more JUDGMENT calls and a round 2 of ×1.0–1.3.
  **Text design** (layout, headings, images serving a purpose) may need drawn pages: $0–2 more on the builder.
- **Unit 14 (×0.5–0.9).** No passages, short items, term cards, and the cheapest screens. But vocabulary keys are easy
  to tell by length or by sharing a root with the prompt, so expect a larger share of the blind solver's findings to be
  FIX (R1 and R8 matter most here). If the owner also wants word cartoons for new vocabulary (the
  `pet-world-word-cartoons` skill), that is its own session and not in this table.
- **Unit 15 (×1.1–2.0).** The most uncertain. The Writing Library's rubric-scored pieces need: a writing-process screen
  flow (plan, draft, revise, edit), saved drafts per student, a way for a grown-up to score against the rubric, a
  presentation and a partner-feedback step. If none of that exists in the game, the builder is one or two making
  sessions of new code ($3–8 on top of the wiring), not a copy of Unit 11. The blind solver can score few items (written
  work has no key), so its job shifts to a **separate rubric-and-model-answer review** by a fresh agent ($0.8–1.5, shown
  in the Blind column), the recheck covers new code ($0.4–0.9), and fresh eyes stay at full scope.

**What could push a unit above its range**

- A **game** in any unit (the owner has not asked): Unit 3's game designer was $4.26 and the rule is unit plus Arcade, so
  count $4–6 plus a test script.
- **Longer passages** than planned: cost scales with words read by the blind solver and eyes, and with output words by
  the writer. Doubling passage length in Unit 12 puts it near the top of $20.
- **A second builder round**, as math had: Unit 3's rounds 2 and 3 cost $7.66. Unit 15's new code is where this could
  happen. Cap: a builder round is a new session with the findings only.
- **Skipping R1–R3**: add back $1.6–3.2 a unit (the savings column).
- **Fresh eyes at full scope on every unit**: +$1.4–2.0 each for Units 13 and 14.
- **Shared-code surprises** (like the "Khan" sentence): fixed once, they repeat if a new unit type changes the screen.
- **Coordination:** the lead's unmeasured time. If a unit needs several step-ins, the lead's share can pass the 26
  minutes assumed.

## 6. Short list for the owner

1. **Adopt R1 + R2 + R3 + R4 + R5 now** (free). Together about $1.9–3.5 a unit measured, plus about $0.5 of lead time.
2. **Adopt R8 (the least-specific bot strategy) before Unit 13.** One-time, about $1–2.
3. **Adopt R6 for Units 13 and 14, not for 12 or 15.** About $1.4–2.0 each.
4. **Adopt R7 as a conditional**, not a removal.
5. Expect **$44–75 measured, about $58–108 all in, for Units 12–15**, with Unit 15 the one to watch.

*Open numbers I could not get:* the unit lead's and lead's tokens, the tool-call counts for the round-2 writer and the
reporter, and how many words Unit 11's passages used per lesson (the report says under 80, longest ~70). Ranges in section
5 carry that uncertainty.
