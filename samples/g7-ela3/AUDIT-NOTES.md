# Audit notes: sample g7-ela3 (for the auditor)

Order: made-up teacher (Mr. Haverford, the same notes and style examples as g7-ela2), grade 7 ELA, inference and
citing text evidence. Reading quiz A/B (7 items a version: 6 short answers that cite, 1 RACE) on two original
passages, plus the RACE checklist. 165 tokens ($16.50 budget). Measured agent cost **$10.18** (0.62× the budget),
exact, from each session's own dollars; 28 agent minutes over 18 sessions. The order lead's own work (setup, scoring
the probes, merging, FIX lists) is not measured. The owner asked for it on Nov 12, 2026 ("fix #4": a public reading
sample after passage multiple choice was retired).

## How the team was run
Every role was a fresh `claude -p` session in its own folder with `--max-budget-usd` (maker $5.50 / $2.75 / $1.50,
probes $0.75, blind $1.20–1.50, facts $0.90–1.50, reporter $0.80). Probes held one version's questions only, never the
passages. The blind tester's phase b resumed its phase a session with the passages added and `pack.json` copied in
only after phase a. Each fact check had web search. The lead scored every probe against `accept`, `why` and `credit`.

## The gate, by version and run
| Round | A | B |
|---|---|---|
| 1 | FAIL (A q5: 2 of 2 from general knowledge + a guessed paragraph number) | FAIL (B q5, the same way) |
| 2 (final, two runs) | run 1 FAIL (A q6: the general argument), run 2 pass | pass, pass |
| 3 (A only, two runs) | pass, pass | (questions unchanged) |

## What the agents caught that the scripts did not
- **Paragraph numbers as evidence** (A q2, A q5, B q5): a 7-paragraph passage makes a guessed number right often.
  Now a script: `checks/no-passage.mjs` `numberOnly`, with a self-test (CLAUDE.md, "Get smarter").
- **RACE rounding:** Restate and Answer had no cap, so a no-passage answer could score 3 of 4. Capped at 2 of 4 with
  no real evidence. Still open for the teacher: one piece of evidence can round up to 4 (her "I round up").
- **A q6:** the one item whose full credit needed no words from the passage. Found only by the final two-run probe.
- **A/B parity:** B q2 and B q6 were easier than A's; rewritten.
- **Facts:** 24, 29 and 7 claims checked. One FIX: "about four times larger" (the 2025 extension's size is disputed).
  The article now ends on the reef slipping back since the 2000s and the 2025 extension, without a size.

## For the auditor
- `score-blind.mjs` compares short answers word for word, so it scored 0 of 12 on answers that matched the key in
  substance. The lead judged them by hand. A short-answer scorer, or a note in the brief, would save a lead's time.
- The round 2 maker's shell commands were refused (it chained them with `cd` and `;`), so it could not run the checks
  itself; the lead ran them. The round 3 task said "one command at a time", and that worked.
- The blind tester's phase a was given both versions at once (a lead slip): cross-version cues. The probes, which
  decide the gate, each held one version.
