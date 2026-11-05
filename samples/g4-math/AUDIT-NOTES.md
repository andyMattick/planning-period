# Audit notes: sample g4-math (for the auditor)

Order: made-up homeschool co-op teacher (Mr. Lindqvist), grade 4 math, multi-step multiplication and division word
problems with remainders that must be interpreted. Worksheet (12 typed problems) + quiz A/B (10 each: 4 mc, 6 typed)
+ the TPT extra. 70 tokens ($7.00 budget). Measured agent cost $5.48 (exact, the sessions' own dollars), under budget.
The order lead's own session (this one: setup, merges, preview review) is not measured and not in the total.

## How the team was run

Every role was a fresh `claude -p` session in its own folder under the lead's scratchpad, holding only the files its
brief allows. The blind tester and solver ran in two phases in the same session: phase 1 had no `pack.json` in the
folder (so "don't open the key" was enforced, not trusted); phase 2 added the pack and checks. Cost, minutes and tokens
come from each session's JSON result (`total_cost_usd`, `duration_ms`, `usage`). Style notes, the round 3 recheck and
the reporter ran on the cheaper tier (Sonnet 4.5); maker, blind tester, solver and round 2 recheck on the main tier.

## What each check found

- **Maker's own check (not counted):** converge bot 53% vs 25% chance on the first draft; the maker changed wrong
  choices only. So the test-wise bots did real work, but before Wilco's counted run.
- **🙈 Blind round 1:** 32/32 matched. 6 FIX: q7 A and B had wrong choices with remainders bigger than the divisor
  (they multiply back to the dividend, and a test-wise student crosses them out); w11 didn't force the round-up
  reading (36 defensible); w4 clumsy wording; A q9's key "estimate" repeated the exact calculation; quiz Level 3
  share 30%. 2 JUDGMENT (q5 A rounds up while B drops; A q9 lacks B's multiply-everything distractor), 1 KEEP.
- **🧮 Solver round 1:** 32/32, 0 disagreements, every step computed with `node -e`. 2 JUDGMENT (q7 same as blind;
  B q10 friendlier first step 4 × 75 = 300), 2 KEEP.
- **🤖 Wilco:** passed every round, worst counted bots under the line. Honestly, the bots had little to bite on: only
  8 mc questions (4 per version), and only 2 all-number ones, so the number cues (largest, middle, round) were never
  judged. The remainder-too-big cue in q7 was a content cue the bots can't see; the blind tester and solver caught it.
- **Round 2 recheck** (different fresh agent): confirmed 5/5 fixes, found 1 new FIX (w11's key estimate had the same
  flaw as A q9). **Round 3** recheck (a third fresh agent): confirmed, nothing new. 3 rounds, the maximum.
- **Lead preview review:** every typed question showed two answer blanks (the maker wrote "Answer: ____ unit" into 24
  prompts and the renderer adds its own Answer line). Fixed in pack.json by a script (prompt text after "Answer:"
  removed; nothing else); keys and test-wise re-run without `--write`, both pass. Logged as a lead row.

## Lead decisions to review

- I reclassified the blind tester's "quiz Level 3 share 30%" FIX to KEEP (reason in the finding): the 40% rule is for
  tests. The auditor may disagree; the blind brief doesn't say the 40% target is tests only.
- The 3 JUDGMENTs were not sent to the maker (runbook step 7). Two of them (q5 A/B different remainder moves; B q10
  easier) arguably break existing rules ("A and B the same skill item for item", "B no easier"), so they might have
  been FIX. The checkers called them JUDGMENT because both versions are fair.
- I fixed the reporter's minutes split (it wrote "maker 6.8"; the real split is maker 5.0, solver 1.8) and added rows
  for the reporter and preview steps after it ran.

## What slowed the team or the briefs missed

1. **The maker brief doesn't say the renderer prints the answer line.** Suggest maker.md: "Don't write 'Answer: ___'
   in the prompt; the page adds it." Also the teacher's style ("blanks carry the unit") can't be shown: suggest a
   renderer field such as question `unit` that prints "Answer: ______ eggs".
2. **mc questions get no work space.** `space` only applies to typed questions, so L3 two-step mc (q9) and the bare
   division (q7) have no room to work. Suggest the renderer honour `space` for mc.
3. **Estimate checks in keys:** the maker twice wrote an "estimate" that reused the exact numbers. Suggest maker.md:
   "An estimate rounds the given numbers first; never estimate from the exact answer."
4. **Remainders:** suggest blind-math.md and maker.md: wrong division choices keep the remainder under the divisor
   (otherwise they're true but unfinished, and a test-wise student can cross them out).
5. **Maker's self-reported minutes were wrong** (it said about 25; its session measured 4.3). Reporter brief: prefer
   session-measured minutes over an agent's own estimate.
6. **The blind brief's "L3 must be clearly harder" can't be shown by a strong-student tester:** 100% at every level,
   mean confidence 5.0 / 4.8 / 4.8. Suggest asking for a per-item step count or a "typical 4th grader" estimate.
7. **Wilco on mostly-typed packs:** say in wilco.md (and the audit report) when a document has too few mc or number
   questions for a bot to be judged, rather than showing "passed".

## Renderer and report problems seen in the preview (not fixable through the pack)

- Wilco section: `keys` rounds render as "passed. Chance 0%, line 10%" (they have no chance); the uncounted
  "largest 50%" bar is drawn hatched "(over)" next to "passed". Suggest skipping keys rounds in the chart and marking
  uncounted strategies "not judged".
- "Where the time went" prints float sums ("2.9000000000000004 min" for 1.1 + 1.8). Round the sums.
- Front page overflows by one notice box onto an almost empty page 2.
- JUDGMENT findings count as "caught, not fixed", so the front page says "10 caught; 7 fixed". I added a `reason`
  ("left for the teacher") so the cards don't say "Not fixed"; the count still reads like a shortfall.
- The worksheet's last page holds one problem (w12). Acceptable; not changed.
