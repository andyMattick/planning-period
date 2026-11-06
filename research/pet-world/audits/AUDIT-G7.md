# 🔎 Token audit: 7th grade Units 1 and 2

By the 🔎 auditor, Nov 1, 2026. It only recommends. Sources: both logs and reports, `REPORTER.md`, the agent
write-ups, `docs/MATH-CHECK.md` and the 48 commits on this branch.

**Read the numbers with care.** Unit 1's dollars are estimates (reported tokens plus guessed re-reads). Unit 2's
checkers are exact. Where the same role ran in both, the exact Unit 2 cost is about 2 times the Unit 1 estimate
(solver $5.33 vs $1.20; fresh eyes $5.71 vs $2.63), so Unit 1 was likely dearer than shown. Most tokens are cache
reads ($0.20 per million): an agent re-sends its whole conversation on every tool call. **The cost driver is
conversation length times number of calls.**

## 1. Where the tokens went

| Role | Unit 1 (5 stations, estimated) | Unit 2 (4 stations) |
|---|---|---|
| Lead / unit lead | ~$8.27 (guess, not measured) | $9.57 (612k reported, 221 calls; ~33.8M billed est.) |
| 🏗️ Builder | $5.47 (5 rounds) | inside the unit lead |
| 📝 Worksheet maker | $3.75 (2 runs; the 1st was thrown away) | inside the unit lead |
| 🧾 Reporter | $2.81 | $3.53 exact (4.3M) |
| 🎮 Game designer | $2.64 | inside the unit lead |
| 👀 Fresh eyes | $2.63 | $5.71 exact (15.9M) |
| 🧮 Solver | $1.20 (4 rounds) | $5.33 exact (12.2M, 4 rounds) |
| 🎬 Videographer | $1.36 | inside the unit lead |
| 🙈 Blind solver | $0.96 | $2.29 exact (3.8M) |
| **Total** | **~$29.10** (60M billed + lead guess) | **$26.43** (~70M; plus 12 min of the lead) |

**Biggest 3 sinks.**
- Unit 1: lead (28%), builder (19%), worksheet maker (13%) = 60%.
- Unit 2: unit lead (36%), fresh eyes (22%), solver (20%) = 78%.

**Why they were big.**
- **One long conversation doing many jobs.** Unit 2's unit lead made 221 calls in one conversation; what it read
  first (about 130,000 characters, ~33k tokens, plus Dive Shop code) rode along on every later call.
- **Resuming instead of starting fresh.** The Unit 2 solver's first run cost $2.71. Its next 3 rounds were small
  oracle updates, but they cost $2.62 more (8.1M tokens), because each call re-sent a context of about 150k tokens.
- **Fresh eyes did a script's job by hand**: a 4,500-per-skill equal-value scan inside a long, screenshot-heavy
  conversation (15.7M cache reads).
- **Work thrown away**: Unit 1's first note sheets (1,130 lines, about $1.30) were deleted because the owner's
  checklist came after the brief.

## 2. What each check caught vs what it cost

| Check | Real problems caught, U1 / U2 | Approx. cost per unit | Verdict |
|---|---|---|---|
| verify, typecheck, build | 0 / 0 | ~0 (script) | **Keep**: insurance for protected files |
| Fairness bot (builder runs it) | 0 / 0 | ~0 (script) | **Keep**: insurance; owner rule |
| Screenshot look at every picture (lead U1; builder self-review U2) | Arrow gave the answer away, plus 2 wording giveaways / 2 bugs (backwards higher/lower, a sign slip) | small | **Keep** |
| 🧮 Solver: independent oracle, every step | Crash + 5 judgment calls / 1 real key bug (35 wrong keys) + 13 judgment calls applied | $1.20 / $5.33 | **Keep; trim the resumes** |
| 🙈 Blind solve of the unit test | 2 FIX (50/50 sign guesses) / 4 FIX (every story answer negative, unclear prompt, two-way choices) | $0.96 / $2.29 | **Keep** |
| Blind solver's extra repeat scan (6,000 problems) | – / 0 | part of $2.29 | **Merge** into check-math |
| 👀 Fresh eyes (6 personas, screens) | **Two right answers** that the oracle passed + 8 fixes / **equal-value choices** (one live since U1), help bot sending 7th graders to 4th grade, 6 fixes | $2.63 / $5.71 | **Keep; trim** its hand scans |
| Note-sheet key scripts and browser checks | 0 / 0 (pass) | inside the role | **Keep**: cheap scripts |
| Game self-test and play-test | – / 0 repeats; play-test found a crash and an overlap | inside the role | **Keep** |
| Lead reading each commit | 1 commit with someone else's half-done work / 0 | small | **Keep** (own branches made it rarer) |

Checks that found nothing this time are scripts that cost almost nothing. They stay as insurance.

## 3. Recommendations, ranked

### Free wins (no check is dropped)

**A. Give the builder an "independence-safe pre-flight" before hand-off: new checks in check-math, written by the
solver.** Add three checks that work across many problems: answer signs about half each way, the right choice spread
across positions and above/below, and no two choices equal *in value* for expressions too (2.9 + (−7.7) vs 2.9 − 7.7).
Also add a help-bot routing test for each new skill name. Unit 2's fix rounds 3, 4 and 5 were exactly these, and each
caused a solver resume.
- Saving: about 2 solver resumes ($2.62 ÷ 3 ≈ $0.87 each → $1.70) plus a few minutes of the unit lead's long
  conversation (~20 calls × 150k ≈ 3M tokens, $0.60). **About 9–12M tokens, $2.00–3.00.**
- Risk: none; checks are added, and the solver writes them, so the builder never checks itself. Blind solver and
  fresh eyes still look.

**B. Fresh short sessions instead of resumes for rechecks.** When the builder changes wording, start a *new* solver
session: "here is the diff and balloon.js; teach the oracle the new wording; run check-math." It starts small
(about 40–60k tokens) instead of carrying 150k.
- Saving: 3 rounds × (150k − 50k) × about 25 calls ≈ 7.5M cache reads. Since the rounds cost $2.62 in total,
  **about 5–7M tokens, $1.50–2.00.** The same rule applies to builder rounds.
- Risk: less history. check-math catches a slip (every key and step matches or it fails), and the "break it on
  purpose" test proves it still bites.

**C. One short "agent starter" page instead of every agent reading everything.** One page of about 2k tokens: the
protected pieces, the "Never again" table, the owner's checklists, and "how to find your shop in game.js". CLAUDE.md
loads by itself and stays. Skip the rest unless the role needs it: the Unit 1 report (24k characters), KID-VIDEOS
(36k, videographer only), FAIRNESS (18k, blind solver only).
- Saving for the unit lead: (33k − 8k tokens) × ~200 later calls ≈ 5M cache reads ≈ $1.00. For 4 checker sessions
  it's about 10k × ~50 calls each ≈ 2M, $0.40. **About 6–8M tokens, $1.20–1.60.**
- Risk: a missed rule. verify, check-math and the fairness bot still enforce them.

**D. Read only the lines you need from game.js.** game.js is 1.85 MB (17,668 lines, roughly 460k tokens). Agents
find their shop by grepping and reading around. A small script that prints a shop's line ranges (its `*_GEN`, its
pictures, its registry rows) cuts the searching.
- Saving: about 20–40k tokens of searching per long session, re-sent on ~100 later calls = 2–4M per session.
  With 3 long sessions, **about 6–12M tokens, $1.20–2.40.**
- Risk: none. The checks stay the same.

**E. Keep putting the owner's checklists and "Never again" in the first brief** (done in Unit 2). It would have saved
Unit 1's thrown-away worksheet round ($1.30) and builder rounds 2–4 (giveaway, realism, sign-only endings).
- Saving vs Unit 1: **about 4–6M tokens, $1.30–2.00**, already won.

**F. Route each checker's report to the unit lead.** In Unit 2 the lead had to relay 4 reports. Also, the blind
solver and fresh eyes worked on round-2 code while round 3 was being made, so some findings were already fixed, and
fresh eyes reported a check-math failure that came only from the oracle being on another branch. Fix: in the child's
first prompt, say "send your result with send_message to session <unit lead id>". Also, start each checker on a commit
where the code and the oracle match.
- Saving: about $0.50–1.00 (the relays, plus duplicate findings), **about 2–3M tokens.**
- Risk: none.

### Trade-offs

**G. Trim fresh eyes to what only eyes can do.** Keep all 6 personas and the screenshots at 375 and 1280 wide. Move
the equal-value scan (4,500 per skill) and the help-bot routing test into scripts (see A).
- Saving: 25–35% of $5.71, so **about 4–5.5M tokens, $1.40–2.00.**
- Risk: losing the by-value catch. **Replacement: A's expression-value check**, proven by breaking it on purpose.
  Fresh eyes still checks every screen for repeats by eye.

**H. Use a smaller, cheaper model for mechanical roles:** the reporter (now just a config copy plus
`make-report --unit`), the videographer's search, and running the keyless export. Smaller models cost about a third
to a fifth as much per token (check current prices).
- Saving: reporter $3.53 → about $0.70; videographer about $1.36 → $0.40. **About $3.50–4.00 a unit** (the token
  count is about the same, but each token is cheaper).
- Risk: a wrong number or a wrong video id. The report's own ✓/✗ sum checks and this audit catch number slips. The
  person clicking each video, and verify's video-list check, catch bad ids.

**I. Keep the blind solve at once per unit and about 250+ items** (the all-negative pattern only showed across many).
Its 6,000-problem repeat scan can go once A is in; the fairness bot stays.
- Saving: about 10–20% of $2.29 = **$0.25–0.45.**

**J. Give the unit lead an Agent tool, or run its making roles as short sessions**, not all in one growing
conversation.
- Saving: about 25–40% of $9.57 = **$2.40–3.80 (about 8–13M tokens).**
- Risk: lost context at handoff; the starter page (C) and "Never again" go into every brief.

## 4. Unit 3 budget

**Assumption:** 4–5 stations like Unit 2, every check kept, A–G adopted, and H for the reporter.

| Role | Unit 2 | Unit 3 target |
|---|---|---|
| Unit lead (coordination + making) | $9.57 | $6.50–7.50 |
| Solver (1 run + 1 fresh recheck) | $5.33 | $3.00–3.50 |
| Fresh eyes | $5.71 | $3.70–4.30 |
| Blind solver | $2.29 | $2.00 |
| Reporter (smaller model) | $3.53 | $0.70–1.00 |
| **Total** | **$26.43** | **about $16–18** |

That is about 45–50M tokens instead of about 70M: **roughly 35% less, with the same checks and three new scripted
ones.** If J happens too (an Agent tool), aim for about $14–16.

## 5. What NOT to cut

- **👀 Fresh eyes**: two right answers the oracle passed (U1); equal-value choices every script missed, one live since
  U1, and the help bot sending 7th graders to 4th grade (U2). Trim (G), don't drop.
- **🧮 The independent solver with STEP_ORACLES**: 35 wrong keys and a crash. It is the backbone of A and B.
- **🙈 The blind solve**: 50/50 sign guesses (U1) and all-negative answers (U2), which every per-problem check passed.
- **Screenshot looks at every picture.** These caught the arrow that gave the answer away.
- **The game self-test and play-test** (owner's "never two of the same choice"; a crash after the last gate).
- **verify, typecheck, build, and the fairness bots.** Nearly free insurance.

## Unit 3 follow-up

By the 🔎 auditor, Nov 1, 2026, after the Unit 3 report. It only recommends. Sources: `G7-UNIT3-LOG.md`,
`G7-UNIT3-REPORT.md` and the agents' write-ups (`*-G7-HIVE.md`). All Unit 3 dollars are exact, as the sessions
reported them; the unit lead's and lead's 49 minutes are not measured (the report guesses about $11.83 more).

### 1. Budget vs actual

Target **$16–18, 45–50M tokens**. Actual **$41.22, 91.5M tokens** (2.3–2.6× the dollars, 1.8–2.0× the tokens).
Average price: $41.22 ÷ 91.5M ≈ **$0.45 per million**; 97% are cache reads, so cost ≈ tool calls × context size.

| Why | Arithmetic |
|---|---|
| **The target was set on a low guess.** The section 4 line "unit lead (coordination + making) $6.50–7.50" came from Unit 2's $9.57, an estimate built on 612k *reported* tokens. Measured, the same making work cost $27.31 | $27.31 − $7.50 = **$19.81 of the $23.22–25.22 miss** |
| **First builder session ran long:** 26.2M tokens, $10.03, about 80 calls | 26.2M ÷ 80 ≈ **328k per call** (checkers ran 96–132k); screenshots and fairness runs piled up in one conversation |
| **Three builder rounds**, $17.69 together. Round 2 ($5.03) also fixed Units 1–2 patterns the new checks found (one-off); round 3 ($2.63) plus its recheck ($0.93) existed only for the ratReason L3 giveaway | $5.03 + $2.63 + $0.93 |
| **Fresh eyes not trimmed:** $6.06, 17.1M tokens, about 85 calls, 131+ screenshots | vs target $3.70–4.30: **+$1.76–2.36** |
| **Worksheet maker** $4.78 (8.1M, about 40 calls): 313 browser checks and a byte-for-byte rebuild of the Dive and Balloon pages | ≈ 203k per call |
| **Game designer** $4.26 (8.3M, about 55 calls): was hidden inside Unit 2's estimate | — |

### 2. Which recommendations worked

| Rec | Verdict | Arithmetic |
|---|---|---|
| A. Pattern checks in check-math | **Worked (quality)** | 157k tokens (≈ $0.07) found real patterns in 9 shipped skill checks plus a help-bot route; the Hive passed them first time. The old-unit fixes added to round 2 (part of $5.03): a one-off, not a recurring cost |
| B. Fresh diff-only rechecks | **Worked for size, not price** | $1.33 and $0.93 (≈ 96k and 100k per call) vs Unit 2 resumes at ≈ 150k per call, $0.87 each; but recheck 1 did more (taught bar steps, 322,800 problems). About even |
| C. Starter page / D. line finder | **Can't see it** | First-run checkers ≈ the same ($2.59 vs $2.71, $2.03 vs $2.29). The builder's 328k per call shows its own work, not docs, filled its context |
| E. Checklists in the first brief | **Worked** | Builder rounds 5 → 3; 288 of 288 blind items agreed |
| F. Report to unit lead, matching commit | **Half** | 0 relays (Unit 2: 4); but 3 sessions failed on a short sha (step-in 2) |
| G. Trim fresh eyes | **Not done** | $6.06 vs $3.70–4.30 |
| H. Cheaper tier | **Worked** | Reporter $3.53 → $0.97 (−$2.56); videographer $0.58 |
| I. Blind solve once, 288 items | **Worked** | $2.03, in target; found the 77% guess strategy |
| J. Making roles as short sessions | **Split, not short** | 6 sessions, but no cap; the first ran 80 calls |

### 3. What each check caught in Unit 3

| Check | Caught | Only catcher? |
|---|---|---|
| Pattern checks (A) | Sign, key-spread, equal-value patterns in Units 1–2; a help-bot short name | **Yes**: every earlier check had passed them |
| Builder self-review + fairness bot | −237.5% story, 1-digit crash, fractional bees, "12 ÷ 12"; 3 tells | First to see them (not independent) |
| Solver (oracle) | Close "Not reasonable" claims (≈ 3%, 0.4% at L1) | **Yes** |
| Blind solver | 77% guess strategy (chance 25%), exact step answer printed in the L3 story (11 of 12), 150% honey, "1 cells" | **Yes**: the full fairness bot passed the 77% |
| Game self-test | Biased shuffle (spot 1 at 37%), a "middle length" tell | **Yes** |
| Solver recheck 1 | 12% estimate window rejected 16% of fair roundings | **Yes** |
| Fresh eyes | **ratReason L3: typed estimate in exactly one choice, 1,000 of 1,000**; duplicate video; bar labels read the same aloud; Hunt cells breaking; half-Spanish step | **Yes, all** |
| Recheck 2, verify, typecheck, build, smoke | Nothing (broken-on-purpose test proved recheck 2 bites) | Insurance |

**Could a script catch the giveaway?** Yes. check-math already has every step's value (STEP_ORACLES). New check
("earlier answer tells"): for each sampled problem, take each typed step's value; in every later choice step, read
the numbers in each choice by value; fail the skill if, across 1,000 problems, an earlier value sits in the key and
in no wrong choice more than about 35% of the time (or in every choice but the key: the odd one out). Same pass for a
step's own key value printed in its prompt (the blind solver's 11-of-12 story). Round 3's fix (all four choices share
the estimate) passes it. Written by the solver, proven by breaking it on purpose.

### 4. Recommendations for Unit 4, ranked

Price used: $0.38 per million (builder's own rate, $10.03 ÷ 26.2M); $0.35 for fresh eyes.

**Free wins**

1. **Start sessions from a branch or the full 40-character sha,** and have the unit lead check each child is running
   within a minute. Saves step-in 2 (≈ 8 coordinator minutes × $0.24 ≈ **$1.50–2.50**, unmeasured). Risk: none.
   Catch: a failed start shows at once.
2. **"Earlier answer tells" in check-math (section 3), before hand-off.** Would have caught the giveaway in round 2,
   so no round 3 + recheck 2: **$0–3.56** ($2.63 + $0.93) when such a pattern appears; expect about $1.50–3.50.
   Risk: none, it adds a check. Catch: fresh eyes still look; blind solver too.
3. **Build in two short sessions: generators, then wiring** (stations, rewards, room, help bot). With context growing
   from ≈ 60k to ≈ 600k over 80 calls (avg 328k), one session ≈ 80 × 60k + 6.75k × 80²/2 ≈ 26M; two of 40 calls
   with a 100k start ≈ 2 × (4M + 5.4M) ≈ 19M. **Saving ≈ 7–11M tokens, $2.70–4.20.** Plus a cap in every making
   brief: "stop at about 40 tool calls, commit, write a hand-off note." Risk: wiring session misreads a generator.
   Catch: verify, typecheck, check-math `--shop`, and the solver's first run.
4. **Screenshots to disk, look at few.** Builder self-review: save all, view about 8 (one per station × 2 widths);
   the rest by a script that checks sizes/overflow. Saving is inside rec 3 (it is what grew the 328k). Risk: a bad
   screen unseen by the builder. Catch: fresh eyes sees every screen.
5. **Only the new shop** (owner's rule) everywhere from the first brief: worksheet maker skips rebuilding older units'
   pages by hand (a script runs the rebuild and `git status`), blind solver runs the fairness bot `--shop`.
   **Saving $0.70–1.50** (worksheet maker: ≈ 5–8 of 40 calls × 203k). Risk: a shared change breaks an old page.
   Catch: the weekly full-site run, and `git status` after the rebuild script.

**Trade-offs**

6. **Fresh eyes: smaller scope, same six reviewers.** By-value and help-bot scans are scripts now, and with rec 2 the
   1,000-problem sample becomes a script too. Cap at about 50 calls and 60 screenshots (every station at L1–L3, 375 and
   1280, the quiz, review → PIN, notes, game) instead of 85 / 131. ≈ 50 × 170k ≈ 8.5M vs 17.1M: **saving 7–9M,
   $2.40–3.00.** Risk: a looks bug on an unvisited screen; this is the check that alone caught 5 things. Catch: owner's
   phone play-through (already on "What a person still has to do"), rec 2, and the weekly fresh-eyes run. Don't go
   below one order per station per level.
7. **Worksheet maker: cheaper tier for the browser checks.** Split: the note sheets and keys on the main tier, then a
   fresh cheaper-tier session that runs the 313 checks and reports failures. If about half the tokens (≈ 4M) move to a
   tier one third to one fifth the price: **saving $1.00–1.50.** Risk: a missed failure in the report. Catch: the
   checks are scripts that exit non-zero; the key script reruns at final gates.
8. **Cap the game designer at about 40 calls** (55 now): ≈ 15 × 150k ≈ 2.3M, **$0.80–1.00.** Risk: less play-test.
   Catch: the thousands-of-rounds self-test that fails on any repeat, and fresh eyes' game pass.
9. **Log the unit lead's own usage** so the next audit isn't working from a guess. No saving; it makes the target real.

### 5. Unit 4 budget (4 stations, 8 skills, every check kept, recs 1–8)

| Role | Unit 3 | Unit 4 target |
|---|---|---|
| Builder, generators + wiring (rec 3) | $10.03 | $5.50–7.50 |
| Builder fix rounds (1 expected; 2nd as contingency) | $7.66 | $2.50–5.00 |
| Worksheet maker (recs 5, 7) | $4.78 | $2.50–3.50 |
| Game designer (rec 8) | $4.26 | $3.00–3.50 |
| Videographer (cheaper tier) | $0.58 | $0.50–0.70 |
| Solver: first run + one diff recheck | $4.85 | $3.10–3.90 |
| Blind solver | $2.03 | $1.80–2.10 |
| Fresh eyes (rec 6) | $6.06 | $3.50–4.00 |
| Reporter (cheaper tier) | $0.97 | $0.90–1.00 |
| **Measured total** | **$41.22** | **about $23–31** (≈ 51–69M tokens at $0.45/M) |

Plus the unit lead, unmeasured (rec 9). Unit 3's round 2 old-unit fixes won't recur, which is part of the drop. A
realistic aim is **about $27**, a third below Unit 3, not the $16–18 of section 4: that target ignored the making roles.
