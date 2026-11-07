# Audit notes: sample g7-ela2 (pp-2026-11-05-g7-ela2), the option-1 remake

For the auditor and the owner. Written by the order lead. The owner's decision of Nov 7, 2026: remake this reading
sample under option 1 (`agents/maker.md` v4, `blind-ela.md` v3, `wilco.md` v3, `onboarding.md` v6; budget about $8–17,
hard stop $17). Same order and made-up teacher (Mr. Haverford, grade 7: `readingquiz` + `rubric`, 165 tokens, A/B);
new passages. The earlier run of this order (sea otters and kelp, 4 pairs) is in git history: $26.21, probes A 10, 8, 9
and B 9, 5, 5 of 10, three failed gates. Stopped at the preview (no approval.json).

**Result in one line: it now passes `checks/no-passage.mjs` (worst bot 25%, chance 25%; it came off the debt list), cost
$9.30 for rounds 0–3 (0.56× the $16.50 budget, 0.62× the quiz's $15; $10.17 with the audit), but the fresh no-passage probe still fails both versions
after round 3 (final: A 6 of 8, B 6 of 8; 4 fails), so the blind solve never ran and 3 small fact FIX are open.**

## How the team was run
Every role was a fresh `claude -p` session in its own folder with only its brief's files; makers got `--max-budget-usd`
at the runbook's caps and a 60-minute runner. Probes ran in an empty folder outside the order with only Read and Write
(about $0.13 each, half the old $0.27). The lead ran Wilco's scripts, scored the probes (`score-blind.mjs` and the short
answers against `accept`/`why`), merged the entries and rendered. Minutes, tokens and dollars are each session's own
record (exact); the lead's session is not measured.

| Round | Step | Minutes | Cost |
|---|---|---|---|
| 0 | 🧭 Onboarding: 2 questions (topic, short answers), 190 words; "go" | 1.1 | $0.50 |
| 1 | 📝 Maker, cap $5.50: "Biscuit" (invented story) and "The Long Fence" (Australia's Dingo Fence) | 8.6 | $2.24 |
| 1 | 🙈 Probes A, B | 0.6 + 0.6 | $0.32 |
| 1 | 🔎 Fact check of the kept article (round 1 rule): 24 claims, 3 FIX, 2 JUDGMENT | 2.1 | $0.68 |
| 2 | 📝 Maker, redesign, cap $4.10 | 8.5 | $2.49 |
| 2 | 🙈 Probes A, B | 0.6 + 0.6 | $0.24 |
| 3 | 📝 Maker, FIX round, cap $2.75 | 4.9 | $1.47 |
| 3 | 🙈 Probes A, B (whole versions) | 0.6 + 0.6 | $0.26 |
| 3 | 🔎 Fact recheck (changed sentences, suggested wording, sweep) | 1.0 | $0.45 |
| 3 | 🙈 Final whole-version probes A, B | 0.7 + 0.6 | $0.25 |
| 3 | 🧾 Reporter (cheaper tier) | 0.9 | $0.29 |
| | Lead's runner test call | 0.1 | $0.11 |
| | **Total, rounds 0–3** (15:28–16:07 UTC) | **32.1** | **$9.30** |
| after | 🔎 Auditor (proposals only) | 2.7 | $0.87 |
| | **Total with the audit** | **34.8** | **$10.17** |

Two starts were stopped by the lead in their first minute (a 10-minute runner limit set by mistake; web tools passed in
a form that would be denied); their cost has no record ("not measured").

## The gate (8 mc a version; chance 2; 4 or more right fails)
| Round | A right (sure) | B right (sure) | Short answers over half | no-passage.mjs worst |
|---|---|---|---|---|
| 1 | **8** (6) | **7** (7) | A q5, B q5 (full credit) | quoteEcho 34% |
| 2 | **6** (4) | **8** (4) | none | echo 28% |
| 3 | **5** (3) | **7** (3) | none | pairMatch 25% |
| final | **6** (1) | **6** (3) | none | 25% |

What option 1 fixed: short answers that cite now hold (no probe earned over half after round 1); the pairs no longer
match quote to choice one-to-one (pairMatch at chance); confidence fell (A sure 6 → 1). What it did not: the probe still
gets 5–7 of 8 right, mostly at confidence 2–3, from (a) **general knowledge of the topic** (the probe knew the dingo-fence
studies, "dusky hopping mice", "make a living"), (b) **word meaning from everyday use** ("cropped", "slip through"), and
(c) **the story's stock arc** ("shy cat warms up"; "only this one sounds like a teacher"). The Dingo Fence is
unfamiliar to a U.S. 7th grader but not to the model that probes it: an invented setting would remove (a).

## Open for the owner
- The gate is open in both versions (above). Round 3 is the limit: a round 4 needs the owner (RUNBOOK, "When round 3
  ends with an open FIX"). It would be a maker round at $2.75 plus $0.25 of probes, then the first blind solve (~$1–2.7).
- 3 fact FIX (round 3 sweep): B q6's key, A q7's `why` and A q10's key say the weather is the same on both sides; [2]
  says scientists compare places with the same weather. A one-line wording fix each.
- No blind solve with the passages ran (the runbook starts it only on a draft that passed the gate), so keys are checked
  by the fact checker (article items) and `keys.mjs` only. Not checked by any agent: the story keys, and whether A q4's
  unmatched quote (a line the story doesn't contain) is contradicted by the story as the owner's definition requires.
- JUDGMENT for the teacher: his notes ask that every Part B choice be a real sentence; each Part B has one unmatched
  quote (owner's option 1). Onboarding did not raise this conflict. The fact checker's two calls: the fence began as a
  rabbit fence; [3]–[4] state a debated cascade as settled (the cats hedge in [4] answers part of it).
- The story is 395 words (the brief says about 250–350).
- `samples/g7-ela` stays on the debt list as the record of the old design; it comes off only if the owner retires it.
