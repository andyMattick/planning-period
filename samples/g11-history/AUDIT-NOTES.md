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

Catches that only a content checker could make (the bots passed every round): a wrong choice that is true of a real
Black Code (South Carolina's 1865 apprenticeship law), an anachronism (1877 choices for an 1864 speech), date and word
cues that matched the document, and the "last federal troops" myth. All quotations (the 13th, 14th and 15th Amendments,
Lincoln's Second Inaugural, Douglass in May 1865) were confirmed word for word. Seven invented excerpts were all labeled.

**Left open for the teacher (the round cap was reached):**
- **Test A q21 (FIX, not fixed).** The key text is inaccurate. Suggested: "Hayes ending federal military protection of the last Republican state governments".
- **Review sheet length.** The request says two pages at most, but the sheet renders as 4 pages: 1.3 pages of Know-it-cold, 10 practice questions with one choice per line, and 6 lines for the written answer. Lowering the font size did not help. Meeting the request needs the practice set cut, which takes a maker round.
- **JUDGMENT items.**
  - A q5: the key uses the notes' exact words.
  - B q10: sharecropping framing.
  - p7: plays like L2.
  - The Electoral Commission dropped from the boxes.
  - The fact checker's precision notes on why lines and model answers: two 1866 Bureau bills, Tenure of Office as the House's *charge*, Wade-Davis "white male citizens", "first statewide school systems", "last three states", and Cruikshank's clauses.
- **Style miss nobody checks.** Her titles are in capitals ("UNIT 4 TEST: …", "REVIEW SHEET — Unit 6: …"). The maker wrote that in its own style notes, then titled the documents "Unit 5 Test: …".

## What slowed the team or went wrong
1. **The `--only` option of `checks/student-view.mjs` splits on commas**, and these titles contain one ("Reconstruction, 1865–1877"). The round 2 view came out empty, with no warning. The recheck agent rebuilt the full view and compared it with round 1 to find the changed items. In round 3 the lead sent the whole view plus a list of items.
2. **A checker's suggested wording became a false key.** In round 2 the recheck suggested "Hayes pulling the last federal troops out of the South", and the maker used it word for word. Recheck 2 caught it, but only in the last allowed round. So the cap left a known error in the preview.
3. **Agents guess their own minutes 2–6 times too high.** The maker said about 45 when it took 10; the blind tester said about 25 when it took 3.6. The real duration comes from the session.
4. **Checkers ran at the same time but the briefs tell each one to write `pack.checks`**, which risks lost writes. Blind and facts wrote entry files instead, and the lead merged them. Wilco's `--write` was the only direct writer.
5. **The facts brief has no second round.** The changed items' new facts (new wrong choices, the rewritten Know-it-cold text) were checked only by the blind rechecks.
6. **There is no study-guide content field.** The "what to know" text had to go in section `directions`. Each section prints as one bold paragraph, and the student view never shows it, so the blind tester round 1 never saw it.

## Suggested brief changes
- `maker.md`: never copy a checker's suggested wording into a key without checking it against the source. Keep the title style from the style notes. Plan for the page limit in an item request, and count about 0.2 pages per mc question with one choice per line.
- `blind-social.md` / `facts.md`: say that a suggested fix is a suggestion, and flag any suggestion that goes past the source. In `facts.md`, add a recheck step on changed items, including study guide text.
- `wilco.md` / runbook step 8: `--only` needs a separator that titles can't contain (`|` or `;`), and the script should fail when the view comes out empty. Also allow one extra key-text accuracy fix after round 3 when the only open FIX is a false key, with a fresh recheck.
- Runbook steps 4–6: parallel checkers write entry files, and the lead merges them.
- `reporter.md`: use the measured session duration, not the agent's own guess.
- `PACK-FORMAT.md`: add a study guide "know" block (bullets, not bold) that the student view also prints.
- `PRICING.md`: the study guide plus test came to $9.85 in agent cost against a 95-token ($9.50) budget, before the lead's time. Keep watching the `test` price.
