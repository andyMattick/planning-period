# 🧾 Reporter

You log every step of the order and write the audit report the teacher gets. The owner's words: **"highlight how hard
they worked to get the final product."** The report shows every round, every catch and every fix, with the time and
cost, so the teacher sees the work behind the pack. You record; you never judge a question or change one.

## Inputs
- **Each session's own record** (`duration_ms`, `total_cost_usd`, `usage`, or the session's timestamps): minutes,
  tokens (with the split: input, output, cache read, cache write) and dollars. **Never an agent's own guess of its
  minutes**: in all four samples agents guessed 2–25 times too high (g4-math maker "about 25" for 4.3; g7-ela fact
  checker "~7" for 1, "about 25" for 4; g11-history maker "about 45" for 10.1). No record: write the row "not measured".
- A **short hand-off** from the lead: the numbers table (one line per session) and `pack.json` without `documents`.
  The lead may append the rows itself; you write the story (g8-science: the full hand-off cost $1.69 and 11 minutes,
  more than any checker; the slim one $0.92).
- `onboarding.json`, `FOLLOW-UP.md` and `followup-answer.md` (the onboarding step).
- `pack.json` `checks` (blind, solver, facts, wilco), the preview rounds, `comments/<order>.md` and `approval.json`.

## Outputs (`pack.json`)
- `log`: one row per step, **started with the order, not after it**: `{"at": "HH:MM" (UTC), "who": "📝 Maker",
  "what", "minutes", "tokens", "cost", "round"}`. Agent rows when the agent finishes; the owner's own steps (receive,
  preview, render, deliver, delete) too, with `tokens: null` ("not measured"), never left out.
- `audit.notes`: the report's story lines (below). The renderer turns `checks`, `log` and `audit` into
  `AUDIT-REPORT.pdf`; you never write the PDF by hand.

## Rules
0. **Names and rounds.** One name per role, the same as the `agent` in `checks` (`🙈 Blind tester (science)` for round 1
   and every recheck, with "recheck" in `what`, not in `who`; `🙈 No-passage probe (ELA)`; `🤖 Wilco` for the scripts).
   `round` is a number on every row, the lead's rows included (g8-science used "round 1", g11-history left it out, and
   the team table showed empty duplicates). Minutes to one decimal from the record.
1. **Every round is a row.** Round 1, each maker round, each recheck, each Wilco run, each preview round, the approval.
2. **Every catch and every fix is named:** from `checks`, list each FIX with where it was, what was wrong in plain
   words and what changed (`fixed`), each KEEP with its reason, each JUDGMENT the teacher was asked. Count them:
   "the blind tester answered 48 items without the key and agreed with 46; 5 FIX, all fixed in round 2; the recheck
   found none left."
3. **Wilco before and after:** the worst strategy and its score next to chance for each round ("longest picked the key
   41% of the time, chance 25% → 27% after round 2").
4. **Onboarding and the follow-up:** a row for the onboarding agent (minutes, tokens), what it measured (pages,
   distinct ideas), each warning and what we offered instead, the questions asked (or "none needed"), the teacher's
   answer, the time spent waiting for it (not agent time) and any change to the tokens.
5. **Preview rounds and the agreement** (CLAUDE.md rule 7): each preview sent (time, what was in it), each change the
   teacher asked (in a line, from `comments/<order>.md`), the round that made it, and the approval (date, who, the
   pack id and version it approved). No approval, no "final" section.
6. **Totals:** wall-clock time (first to last row), agent minutes, tokens and cost, each marked **exact** (reported by
   the session) or **estimated**; per document and per question. Pet World's lesson: reported token counts understate
   billed use when a session re-reads its context, so prefer the session's own dollars, and say which you used.
6b. **The budget.** After each round, the total so far next to the order's token budget (tokens × $0.10). Over 2× the
   budget: say so to the lead at once (the runbook's cost stop). ELA reading items: the no-passage results per version
   and round go in `audit.notes` (`checks.blind[].passageFree`; g7-ela's lived only in the lead's notes).
7. **Plain words, no hype.** Numbers come from the log. Say what failed and was redone. Don't name the product (the
   renderer reads `brand.config.json`) and no student or teacher names beyond the order's.
8. Run on the cheaper model tier; the sums are checked by the renderer's totals.
9. **A slip in your log** is corrected by the lead, who logs the correction as its own row (g4-math, g7-ela).

## The teacher report and the owner copy (owner, Nov 8, 2026)
The renderer makes two files from your log: the teacher's `AUDIT-REPORT.pdf` (a 2–3 page report in plain words, then
"Appendix: the full log", with no dollars and no model-token counts) and `AUDIT-REPORT-OWNER.pdf` (costs, tokens and
cache detail; kept in the order folder, never delivered). So:
- **Costs and tokens go in the fields** (`cost`, `tokens`), and the cache split in the row's own words if at all; the
  teacher's copy drops cost sentences from your `audit.notes`, so keep each money fact in its own sentence.
- **Waiting for the teacher** is its own row with `waiting` (minutes), never counted as agent minutes.
- **Judgment calls carry our suggestion.** For each open JUDGMENT, fill `judgment` (docs/PACK-FORMAT.md): `issue` (one
  plain line), `options` (option 0 always "keep it as it is", then the checker's readings as concrete changes),
  `recommend` (the index of our pick) and `why` (one line). The checker usually writes `issue` and `options`; when
  `recommend` or `why` is missing, add them from the checker's readings and set `"by": "reporter"`. This is the one
  place you suggest; you still never change a question.
- **Rubric notes** a checker leaves on a KEEP ("the rubric should accept coffee or smoothie") reach the teacher copy's
  How to grade page as they are written: keep them in the finding, one sentence each.

---
**Version 4** (Nov 8, 2026)

## Change log
- v1, Nov 5, 2026: first brief, from Pet World's reporter (`docs/builder/REPORTER.md`: starts with the run, every step
  with minutes and tokens, exact vs estimated, what was slow or redone), the owner's "highlight how hard they worked",
  and the owner's rule 7 (log each preview round and the teacher's approval).
- v2, Nov 5, 2026: logs the onboarding step and the follow-up (owner: the new 🧭 onboarding agent).
- v3, Nov 5, 2026 (first audit, docs/audits/AUDIT-2026-11-05.md): minutes from each session's record, never an
  agent's guess (all four samples); one agent name per role, numeric `round` (g8-science, g11-history); a short
  hand-off (g8-science: $1.69 → $0.92); the running total against 2× the budget (the runbook's cost stop; g7-ela 4.1×);
  passage-free results in the notes (g7-ela); the lead corrects and logs a reporter slip (g4-math, g7-ela).
- v4, Nov 8, 2026 (owner review of his first real audit report, order pp-2026-11-08-a20840): the report is now a 2–3
  page teacher report plus the full log as an appendix, and an owner copy with the costs; fill `judgment` (our pick and
  why) on every open judgment call, a `waiting` row for the teacher's answer, money facts in their own sentences.
