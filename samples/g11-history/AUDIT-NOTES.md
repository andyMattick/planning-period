# Audit notes: sample g11-history (for the auditor)

Order `pp-2026-11-05-4c19e7`: made-up Ms. Castellanos, grade 11 U.S. History, Reconstruction 1865–1877. Items: study
guide (25 tokens) and unit test with A/B versions (70 tokens), 95 tokens total. Each role ran as a fresh headless
Claude Code session (`claude -p`, no shared context). Costs and minutes below are each session's own measured
`total_cost_usd` and `duration_ms`. The order lead's own work (this session) was not measured.

## What each check found

| Round | Agent (model) | Result | Minutes | Cost |
|---|---|---|---|---|
| 1 | 📝 Maker (Opus) | 10-question review sheet; 24-question test A and B (42% L3); keys and bots pass | 10.1 | $3.01 |
| 1 | 🙈 Blind tester, social studies (Opus) | 53/53 matched the key, **11 FIX**, 2 JUDGMENT | 3.6 | $1.17 |
| 1 | 🔎 Fact checker (Opus, web search) | 143 claims: 123 source, 11 reference, **1 off** (the same B q5 as the blind tester), 8 judgment, 2 KEEP | 4.3 | $1.61 |
| 1 | 🤖 Wilco (Sonnet, scripts) | keys 0 errors; worst bot posB 28% (chance 25%, line 35%) | 0.6 | $0.15 |
| 2 | 📝 Maker | fixed 11 items plus the lead's layout FIX | 3.0 | $1.20 |
| 2 | 🙈 Recheck (fresh) | 16/16; 10 of 11 confirmed; **3 new FIX** (A q21 traded a date cue for a word cue; p7 too easy; two Know-it-cold errors: "readmission (1865)", "killed April 14") | 2.6 | $0.96 |
| 2 | 🤖 Wilco | pass, posB 28% | 0.6 | $0.15 |
| 3 | 📝 Maker | fixed 4 | 0.6 | $0.36 |
| 3 | 🙈 Recheck 2 (fresh) | 2/2; all 4 confirmed; **1 new FIX**: A q21's new key says Hayes pulled "the last federal troops out of the South" (a myth) | 1.3 | $0.56 |
| 3 | 🤖 Wilco | pass, posB 28% | 0.5 | $0.15 |
| — | 🧾 Reporter (Sonnet) | log and audit notes | 2.6 | $0.53 |

Agent total: **$9.85, 29.8 measured minutes, about 10.1M tokens (mostly cache reads)**. Wall clock from the order to
the reporter: 14:14–14:43 UTC. The lead's reading and writing time is extra and not measured.

### Rounds 4–5 (extra rounds the owner asked for: "fix both of those, document the process")

Round 3 ended with an open FIX (A q21's key, the "last federal troops" myth) and the review sheet at 4 pages against
a 2-page request. The owner, acting as the teacher, chose an extra round (the new runbook section "When round 3 ends
with an open FIX"). Same separation as before: each role a fresh `claude -p` session; numbers are each session's own
`total_cost_usd` and `duration_ms`.

| Round | Agent (model) | Result | Minutes | Cost |
|---|---|---|---|---|
| 4 | 📝 Maker (Opus) | A q21 key → "Hayes ending army protection for the last Republican governments"; review sheet 4 → 2 pages (8 boxes into 2, practice 10 → 7: p3, p5, p9 cut; "troops leave" box line fixed; Electoral Commission line added) | 2.8 | $1.01 |
| 4 | 🙈 Recheck 3 (fresh) | 6/6; both open items confirmed fixed; **2 new FIX** (p7 choice C partly true; p6 choice A ruled out by the stem); 2 JUDGMENT | 1.8 | $0.66 |
| 4 | 🔎 Fact checker (fresh) | 96 claims: 85 source, 6 reference, 4 off, 1 judgment; **5 FIX** (p7 C; p10 model's 1873 timing; **A q13 key "Troops left"** and **B q23 model**, the same troop myth, found by a whole-pack sweep; the box missing the deal's terms); 2 JUDGMENT | 4.2 | $1.40 |
| 4 | 🤖 Wilco (Sonnet) | pass; worst converge 27% | 0.6 | $0.15 |
| 5 | 📝 Maker | fixed all 6 | 2.1 | $0.79 |
| 5 | 🙈 Recheck 4 (fresh) | 4/4; all round 4 FIX confirmed; **2 new FIX, left open**: p7 still light for L3 (the stem quotes "No State shall"; a choice impossible on dates), B q13 easier than A q13 | 1.6 | $0.58 |
| 5 | 🔎 Fact checker (fresh, web) | 39 claims: 36 source, 2 reference, 0 off, 1 judgment ("railroad aid" vs "promised"); all 7 round 4 FIX confirmed | 2.9 | $0.94 |
| 5 | 🤖 Wilco | pass; worst longest 28% | 0.6 | $0.15 |
| — | 🧾 Reporter (Sonnet) | rounds 4–5 log and notes | 3.4 | $0.77 |

Extra rounds: **$6.43, 20.1 measured minutes** (16.7 minutes and $5.66 without the reporter), 14:47–15:20 UTC. Whole
order now: **$16.28, 49.9 agent minutes, 16.7M tokens**. The lead's time is again not measured. After round 5 the
pack has 2 open FIX (both difficulty, neither a false fact) and every fact check clean.

Catches that only a content checker could make (the bots passed every round): a wrong choice that is true of a real
Black Code (South Carolina's 1865 apprenticeship law), an anachronism (1877 choices for an 1864 speech), date and word
cues that matched the document, and the "last federal troops" myth. All quotations (the 13th, 14th and 15th Amendments,
Lincoln's Second Inaugural, Douglass in May 1865) were confirmed word for word. Seven invented excerpts were all labeled.

**Left open for the teacher after round 5 (the owner's limit):**
- **Review sheet p7 (FIX, not fixed):** still light for level 3: the stem quotes "No State shall", and wrong choice B
  (a Johnson pardon) is impossible on dates.
- **Test B q13 (FIX, not fixed):** easier than A q13 (recall of how the 1876 dispute was settled vs. why the
  Compromise ended Reconstruction); B's choice D is short and draws few.
- **Fixed in rounds 4–5:** A q21's key (the myth), the review sheet's length (2 pages, pdfinfo), and three more places
  with the same troop myth (the box line, A q13's key, B q23's model answer).
- **JUDGMENT items.**
  - A q5: the key uses the notes' exact words. B q10: sharecropping framing. B q21: the Compromise as a bargain
    (Woodward vs. Peskin).
  - Review sheet: p4 (the key is the only quoted word), p10 (two causes asked, three in the notes), the boxes'
    coverage gaps (Wade-Davis majority, Stanton, Klan targets, Slaughterhouse, about 1,500 officeholders), and
    "railroad aid" without "promised".
  - The round 1 fact checker's precision notes on why lines and model answers (two 1866 Bureau bills, Tenure of Office
    as the House's *charge*, Wade-Davis "white male citizens", "first statewide school systems", Cruikshank's clauses).
- **Style miss nobody checks.** Her titles are in capitals ("UNIT 4 TEST: …", "REVIEW SHEET — Unit 6: …"). The maker wrote that in its own style notes, then titled the documents "Unit 5 Test: …".

## What slowed the team or went wrong
1. **The `--only` option of `checks/student-view.mjs` split on commas**, and these titles contain one ("Reconstruction, 1865–1877"). The round 2 view came out empty, with no warning. The recheck agent rebuilt the full view and compared it with round 1 to find the changed items. In round 3 the lead sent the whole view plus a list of items. **Fixed in round 4** (a small change to that script only): items are separated by `|` (a list with no `|` still splits on commas), and a where that matches no item is an error (exit 1). `agents/blind-social.md` (and the other blind briefs) still show `--only "<where>,<where>"`: the auditor should change them to `|`.
2. **A checker's suggested wording became a false key.** In round 2 the recheck suggested "Hayes pulling the last federal troops out of the South", and the maker used it word for word. Recheck 2 caught it, but only in the last allowed round. So the cap left a known error in the preview.
3. **Agents guess their own minutes 2–6 times too high.** The maker said about 45 when it took 10; the blind tester said about 25 when it took 3.6. The real duration comes from the session.
4. **Checkers ran at the same time but the briefs tell each one to write `pack.checks`**, which risks lost writes. Blind and facts wrote entry files instead, and the lead merged them. Wilco's `--write` was the only direct writer.
5. **The facts brief has no second round.** The changed items' new facts (new wrong choices, the rewritten Know-it-cold text) were checked only by the blind rechecks.
6. **There is no study-guide content field.** The "what to know" text had to go in section `directions`. Each section prints as one bold paragraph, and the student view never shows it, so the blind tester round 1 never saw it.

7. **Round 3's KEEP hid the same myth.** The round 1 fact checker kept A q13's key "Troops left" as a shortening; the
   round 3 recheck caught the myth only in A q21, the item it was shown. Only round 4's fact checker, told to sweep the
   whole pack for the troop wording, found A q13 and B q23. A false claim found once should be searched for everywhere.
8. **The lead's runner passed extra tools with literal quote marks** in round 4, so WebSearch, WebFetch and pdfinfo were
   denied: the round 4 fact checker named print references by title instead of looking them up, and the checkers counted
   PDF pages from the file. Fixed for round 5 (the round 5 fact checker used the web). A runner should fail loudly when a
   tool it meant to allow is denied.
9. **The audit report lists "Left for you to decide" (15) before "Not fixed yet" (2)** (`scripts/render/audit.mjs`,
   `findingsSection` order). The new runbook rule wants open FIX items first; here they are first only in the notes'
   first line and the front-page sentence. A one-line renderer change (`['open', 'teacher', 'fixed', 'kept']`) would do it.
10. **"Where the time went" cuts long agent names on the left** ("…nd tester (social studies), recheck") now that there
    are five blind rows.
11. **Round 5 counts as a recheck of round 4, but its two FIX are old problems:** p7's level was a round 3 JUDGMENT,
    and B q13 never changed after round 2. A fresh recheck re-reads the twin and can find new things in unchanged
    text, so a round cap needs "new FIX in changed text" and "FIX in text nobody changed" counted apart.

## Suggested brief changes
- `maker.md`: never copy a checker's suggested wording into a key without checking it against the source. Keep the title style from the style notes. Plan for the page limit in an item request, and count about 0.2 pages per mc question with one choice per line.
- `blind-*.md` and `facts.md` (the owner's line, for the auditor to add): **"A suggested fix is a suggestion: write it as a direction, and flag any facts in it, because it will be checked."** (Round 4–5 checkers were told this in their prompts; they wrote directions and named the facts in them, e.g. "Facts to check: Johnson left office in March 1869".) In `facts.md`, add a recheck step on changed items, including study guide text, and a whole-pack search for any false claim found once (point 7).
- `wilco.md` / runbook step 8: `--only` now takes `|` and fails on a where that matches nothing (done in round 4, `checks/student-view.mjs`; runbook step 8 updated); the blind briefs still show commas. The extra round after round 3 is now a runbook section ("When round 3 ends with an open FIX"); the auditor should review why this order hit the limit (points 2, 7 and 11).
- Runbook steps 4–6: parallel checkers write entry files, and the lead merges them.
- `reporter.md`: use the measured session duration, not the agent's own guess.
- `PACK-FORMAT.md`: add a study guide "know" block (bullets, not bold) that the student view also prints.
- `PRICING.md`: the study guide plus test came to $9.85 in agent cost against a 95-token ($9.50) budget, before the lead's time. Keep watching the `test` price.

## Rounds 6–7: the cross-item giveaways (owner decision 2, Nov 7, 2026; written by the order lead)

`checks/cross-item.mjs` came in after this sample was finished and found **11 hits**: an item's key printed in another
item of the same version (A q1 in A q15, A q7 in A q11, A q13 and A q21 in each other, A q19 in A q12; B q8 in B q2, B q9
in B q12, B q11 in B q5, B q10 and B q20, B q19 in B q9). Same separation as before: each role a fresh `claude -p`
session in its own folder; costs are each session's own record.

| Step | Who | Result | Cost |
|---|---|---|---|
| Round 6 maker (cap $2.50) | fresh maker, FIX list only | changed 7 wrong choices (A q11, A q12, B q2, B q9, B q10, B q12, B q20), 2 stems (A q15: an invented 1866 court record in place of the amendment's text; B q5: "the apprenticeship rules Southern legislatures passed for freedpeople in 1865–66"); reworded 2 keys (below); cross-item 11 → 0 | $0.95 |
| Lead | | restored A q15's key to its old text: the reword wasn't needed (cross-item stays at 0) | not measured |
| Round 6 blind recheck (keyless, then scored) | fresh blind tester, 17 changed and partner items | 17 of 17 matched; FIX B q19 too easy for L3 (unchanged text); JUDGMENT A q13/A q21 and A q1/A q15; earlier B q12 and A q21 findings confirmed fixed | $1.39 |
| Round 6 fact recheck (web allowed) | fresh fact checker | 28 claims, 0 off; 2 JUDGMENT on A q15's new stem ("It" unclear; "laws like this were passed after the 13th" is not true of Mississippi's Nov. 1865 act) | $1.00 |
| Round 7 maker (cap $0.80) | fresh maker, A q15's stem only | "The record is dated 1866, after the 13th Amendment was ratified. How did the 13th Amendment itself leave room…" | $0.45 |
| Round 7 blind and fact rechecks | two fresh sessions | A q15: KEEP (the stem fix works), 2 of 2 matched; 7 claims, 0 off | $0.31 + $0.40 |
| Wilco | scripts | keys, test-wise and cross-item pass (round 7) | — |
| **Total** | | under the $6 cap | **$4.49** |

**One key's wording changed, with the same answer (for the owner).** A q13's key ("…the last Republican governments
fell") and A q21's key ("…army protection for the last Republican governments") printed each other's phrase, so no
stem or wrong-choice change could pass the check. The round 6 maker reworded A q21's key to "Hayes ending army
protection for Louisiana's Republican governor" (still D, the same event; the fact checker confirmed it: Packard's
government fell after the troops left the statehouse on April 24, 1877). The answer did not change; the words did. It
is flagged here and in `audit.notes` rather than passed off as a wrong-choice fix.

**Open, listed first in `audit.notes`:** B q19 too easy for L3 (a FIX on text nobody changed in this round); the shared
*idea* (not words) between A q13 and A q21, and between A q1 and A q15 (JUDGMENT: the cross-item check is satisfied, the
blind tester can still link them). Lesson for the auditor: the cross-item check catches shared words; a fresh blind
reader is what catches two items on the same event.

No outputs are committed for this sample (only `pack.json`); the preview renders (the same page counts as before).
