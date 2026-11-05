# Audit notes: sample g7-ela (pp-2026-11-05-g7-ela)

For the auditor. Written by the order lead. Grade 7 ELA quiz with A/B versions (two original passages, 10 multiple-choice + 1 short response per version) and a C-E-E rubric, made-up teacher Ms. Okafor. Stopped at the preview, as the brief says (no approval.json).

## How the team was run

There was no in-session subagent tool, so every role ran as its own fresh cloud session (create_session), with its brief and allowed files pasted into the prompt. Results came back through the session transcripts (list_events). Each session reported its own exact cost and tokens, so the log's dollars are exact per agent. The lead's own session is a shared counter and is not counted. The lead relayed every hand-off, ran keys.mjs and test-wise.mjs, and merged each round's changes into pack.json with a small script that refuses key moves.

| Step | Session | Wall time | Cost (exact) |
|---|---|---|---|
| 📝 Maker r1 (+3 pre-check passes) | 1 | 14:15–14:31 | $3.06 |
| 🔎 Fact checker r1 | 2 | 14:33–14:35 | $0.27 |
| 🙈 Blind tester r1 (passage-free probe, then the solve) | 3 | 14:34–14:41 | $0.71 |
| 📝 Maker r2 (+1 Wilco pass) | 4 | 14:44–14:50 | $1.11 |
| 🙈 Blind recheck r2 (different fresh tester) | 5 | 14:54–14:58 | $0.48 |
| 📝 Maker r3 (+rubric, +2 Wilco passes) | 6 | 15:01–15:10 | $1.19 |
| 🙈 Blind recheck r3 (third fresh tester) | 7 | 15:13–15:16 | $0.48 |
| 🧾 Reporter (Sonnet 4.5) | 8 | 15:19–15:21 | $0.44 |
| **Total** | | 14:13–15:28 | **$7.74** (menu budget $5.50) |

## What each check found

- **🤖 Wilco** passed the maker's 4th draft in round 1 (worst posA 30%, chance 25%). Before that, draft 1 had oddOne 55%, then the paragraph-number cues: "(paragraph N)" at the end of evidence choices counts as each choice's number, so the smallest, largest and middleValue bots picked keys. That took 3 relays to tune out. Later rounds failed on converge 50% (r2), learnedCV 50% and middle 38% (r3). Every fail was fixed by changing wrong choices.
- **🙈 Blind testers (3 fresh agents).** The lead added a stage-1 **passage-free probe**: each tester first answered the questions without the passages, then got the passages. All three matched **20 of 20 keys without reading**, at confidence 4–5 on 17, 17 and then 15 items. The bots passed the same quiz. This is the order's main catch: the cue is in the content (only the key sounds like a teacher's answer, or the stem quotes the deciding detail), and Pet World's notes already warn that bots miss this. Other catches: Part B giving away Part A (A q2/q3, A q7/q8), twin wrong choices (B q8 in r1; B q7, B q10 and A q5 in r3), wrong choices that misstated the story (B q1), and a key that misstated the article (B q9). The round-2 fixes **created two-right-answer items** (A q4, B q9), which the r2 recheck caught and r3 fixed.
- **🔎 Fact checker** (ELA nonfiction): 47 claims, 3 FIX (B q9 key "sets" vs "drops", B q6 why overclaims, A q8 "far out in the Pacific"), all fixed. 2 JUDGMENT: the wire-hook study was mostly one captive crow; whether crows use cars on purpose is debated.
- **The lead, on the rendered preview:** the rubric printed "4 pts" on each of its 3 rows (reads as 12). Fixed in round 3 by dropping `points`. The rubric got no checker until round 3. Its blind reader then found the new note contradicts itself, which is left open.
- **Left for the teacher after round 3 (the runbook max):** 5 FIX (twins in B q7, B q10 and A q5; B q3 choice A adds "Then"; the rubric note) and 14 JUDGMENT, including passage-free 20/20 (five stems quote the deciding detail) and L3 not clearly harder than L2.

## What slowed the team

1. **No passage field in the pack format.** Passages had to go in as question-less sections, one per paragraph (`directions` renders as one plain paragraph). `checks/student-view.mjs` prints only `doc.directions`, so **the blind tester's view had no passages at all**. The lead wrote a helper to extract them. This is the biggest format gap for ELA.
2. **The maker can't run the checks in its own session** (no repo there). The lead relayed `--items` output 8 times across 3 maker sessions. Each relay cost about 3–5 minutes of wall time. Most of it was the maker guessing at bot internals (converge, learnedCV, middle) until the lead pasted the converge code.
3. **The bots fight each other on ELA evidence items.** Fixing passage-free giveaways (wrong choices that borrow the key's idea) set off converge. Fixing converge set off learnedCV. Fixing that set off middle. The paragraph-number cue makes `(paragraph N)` citations (the teacher's own style) a recurring trap.
4. **The `round` meaning is fuzzy.** Wilco ran 2 or 3 times inside one maker round, and the format has no sub-round, so the pack has two `round: 2` and two `round: 3` Wilco entries with `note`s.
5. **Self-reported minutes were wrong.** Maker r1 said "about 25 minutes" (16 wall); the fact checker said "~7" (1). The log uses session timestamps instead.

## What the briefs got wrong or missed (suggested changes)

- **blind-ela.md:** add the **passage-free probe** as step 0. Answer every item from questions and choices only, record matched-of and confidence, then read the passages. Report it as `passageFree`. It was the single most useful check in this order. Also add "an edit made two answers right" to the recheck's traps, and **read the rubric** (no brief assigns a rubric reader; `menu.json`'s rubric item assumes a blind read).
- **maker.md:** for reading items, the stem must not quote the deciding detail (A/B q4, q6 and q9 here). Each item needs at least one wrong choice that is a believable reading of the passage, not only literal or silly reasons. A rubric should not print per-row `points` when the score is holistic. For evidence choices citing "(paragraph N)", plan the key's paragraph spread per version (one lowest, one highest, two in the middle), or the number bots fire.
- **wilco.md (Known limits):** say that the number bots read "(paragraph N)" citations as values. This is a real but weak cue. Decide whether it should count, and never just weaken the check. Also note that wrong choices written to fix a passage-free giveaway tend to set off converge.
- **RUNBOOK step 3 / maker.md rule 6:** give the maker a way to run `checks/` itself (attach the scripts, or a clone of the repo). The relays were most of the wall time.
- **reporter.md:** say who corrects a reporter's factual slip. Here the lead fixed two lines (who caught the rubric points problem; the fixed count) and logged that. Also tell the reporter to take minutes from timestamps, not from agents' own estimates.
- **PACK-FORMAT / student-view:** add a `passage` (or `sections[].text` with paragraphs) field, printed by the renderer and by `student-view.mjs`.
- **Renderer (owner, not the briefs):** an open FIX finding shows the pill "Fixed" with "Not fixed" under it. Wilco's `keys` rows print as "Chance 0%, line 10%". Section headings can orphan at the foot of a page (the "SHORT RESPONSE" heading here).

## Cost against the menu

$7.74 exact (agents only) against a 55-token budget of $5.50, so about 1.4× over. This was the first ELA order with passages and the first rubric. Most of the extra was maker relays (the maker was $5.36 over 3 sessions) and the third round. The rubric item (15 tokens) had no separate checker until round 3, so its true cost is hidden inside the maker and r3 recheck rows.
