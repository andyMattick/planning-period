# Audit notes: sample g7-ela2 (pp-2026-11-05-g7-ela2), the option-1 remake

For the auditor and the owner. Written by the order lead. The owner's decision of Nov 7, 2026: remake this reading
sample under option 1 (`agents/maker.md` v4, `blind-ela.md` v3, `wilco.md` v3, `onboarding.md` v6; budget about $8–17,
hard stop $17). Same order and made-up teacher (Mr. Haverford, grade 7: `readingquiz` + `rubric`, 165 tokens, A/B);
new passages. The earlier run of this order (sea otters and kelp, 4 pairs) is in git history: $26.21, probes A 10, 8, 9
and B 9, 5, 5 of 10, three failed gates. Stopped at the preview (no approval.json).

**Result in one line: it passes `checks/no-passage.mjs` (off the debt list, now empty), the blind solve confirmed every
key (20 of 20) and all six article fact FIX from rounds 1–3 are fixed, but the fresh no-passage probe still fails both
versions after the owner's extra round 4 (A 3 of 7, the line exactly; B 5 of 7). Cost $13.88 in all (0.84× the $16.50
budget, 0.93× the quiz's $15), under the $17 stop. Open FIX go to the teacher with the preview, listed first.**

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
| 4 | 📝 Maker, FIX round under maker v5, cap $2.75 | 4.5 | $1.43 |
| 4 | 🙈 Probes A, B (whole versions) | 0.6 + 0.6 | $0.35 |
| 4 | 🔎 Fact recheck | 1.1 | $0.42 |
| 4 | 🙈 Blind solve, both versions (no passages, then passages, then the key) | 3.3 | $1.14 |
| 4 | 🧾 Reporter (whole story rewritten) | 1.0 | $0.37 |
| | **Total, the whole remake** | **45.9** | **$13.88** |

Two starts were stopped by the lead in their first minute (a 10-minute runner limit set by mistake; web tools passed in
a form that would be denied); their cost has no record ("not measured").

## The gate (8 mc a version; chance 2; 4 or more right fails)
| Round | A right (sure) | B right (sure) | Short answers over half | no-passage.mjs worst |
|---|---|---|---|---|
| 1 | **8** (6) | **7** (7) | A q5, B q5 (full credit) | quoteEcho 34% |
| 2 | **6** (4) | **8** (4) | none | echo 28% |
| 3 | **5** (3) | **7** (3) | none | pairMatch 25% |
| final | **6** (1) | **6** (3) | none | 25% |
| 4 (7 mc; 3 fails) | **3** (0) | **5** (0) | B q10 (its line printed as q9 D) | echo 26% |

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

## Round 4 (owner approved, Nov 7, 2026)
The owner adopted the audit's brief changes (`maker.md` v5, `onboarding.md` v7, `blind-ela.md` v4), approved one more
FIX round and the blind solve even with the gate open, and retired `samples/g7-ela` to `archive/samples/g7-ela`.
- **Maker** (fresh, $1.43 of $2.75): the two word-in-context items became short answers that cite (so 7 mc + 3 short a
  version, not the 8 + 2 ordered), new rivals in A q1, A q3, B q2 and both fence pairs, the B q6 and A q10 keys corrected
  to what [2] says (a correctness fix), the story trimmed to 374 words.
- **Probes** (fresh, cue tags): A 3 of 7, none sure (cues: item 4, type 3, topic 3); B 5 of 7, none sure (item 7, type 2,
  topic 2). Both still over the line; B q10 earns full credit because q9 prints its line. Topic knowledge is a minority
  cue now; cross-item cues are the main one.
- **Fact recheck:** the 3 "same weather" FIX are fixed; 2 new: A q10's key adds "only the number of dingoes differs"
  (wider than [2]); B q6's choice B ("far less rain") may be true of real places. 1 JUDGMENT (A q7: kangaroos or sheep).
- **Blind solve** (fresh, keyless, both versions): **20 of 20 right, every key confirmed, every quote exact.** 11 FIX
  (B q6, B q8/q9 guessable; B q7 still an everyday word, its "floods" detail in B q6 C; B q4's key proves less than its
  Part A; both unmatched quotes in the story pairs are contradicted only by silence; B q3 a level easier than A q3; A q1's
  "really" echoes the story; A q6 recall; B q1 answerable from A q4 D side by side; 7 mc is below the 8-mc floor),
  2 JUDGMENT (A q8/q9: the article leans; the A q9 key shows "hard", not "neutral"), 7 KEEP. L3 4 of 11 a version.
- No round 5: the owner approved one. Everything open is listed first in the audit report and in this note.

## Try c (owner decision, Nov 7, 2026): an invented article and at least 8 mc a version
The owner chose both fixes: (a) replace "The Long Fence" with an informational article about an invented place, and
(b) `agents/maker.md` v6 (committed first): a word-in-context item moved to a short answer is replaced by another mc
item, so each version keeps at least 8 mc. Same order, same made-up teacher; hard stop $15. Records:
`samples/g7-ela2/attempts/try-c/` (the attempt's pack with its checks, log and audit; the three FIX lists the lead
sent; every probe's answers; the blind solve's answers; the watermarked preview PDFs and AUDIT-REPORT, without REVIEW.html, which prints the product name). Audit (proposals only):
`docs/audits/AUDIT-2026-11-07-ela-try-c.md`.

**Result in one line: the gate still fails after 3 rounds (final whole-version probes A 9 of 10, B 5 of 10; 5 of 10
fails), so the sample stays hidden and this pack (the option-1 remake above) stays the sample. Keys are sound: the
keyless blind solve with the passages matched 20 of 20. Cost $13.50 in all, under the $15 stop (0.82× the $16.50
budget).**

- **Story kept:** "Biscuit", trimmed 374 → 350 words; the open story FIX were folded in (the "really" echo, B q3's
  level, B q4's key and unmatched quotes contradicted, no short answer's line printed as a choice).
- **Article:** round 1 "Trouble in the East Valley" (Corvan Island; 316 words). Rewritten in round 2 as **"The Reeds of
  the North Lagoon"** (Vessa Island: drell birds, kib snails, tolla reeds; 322 words), built to break the familiar
  cascade (a storm, not hunting; salt blamed wrongly; hand planting first). Byline on the student copy: "Written for
  this quiz. Vessa Island, its people and its animals are invented." Three fact checks found no contradiction between
  paragraphs; their FIX were all key or `why` wording (widening, wrong choices only unsupported, not contradicted).
- **Counts:** 10 mc + 2 citing short answers + RACE a version; one Part A/B pair a passage; L3 4 of 13.

| Round | Step | Minutes | Cost |
|---|---|---|---|
| 0 | Lead's runner test call | 0.1 | $0.11 |
| 1 | 📝 Maker, cap $4.10 (a new article: redesign cap) | 10.1 | $2.42 |
| 1 | 🔎 Fact check (internal consistency) | 2.8 | $0.77 |
| 1 | 🙈 Probes A, B | 0.8 + 1.0 | $0.69 |
| 2 | 📝 Maker, redesign, cap $3.50 | 10.8 | $2.98 |
| 2 | 🔎 Fact check (rewritten article) | 2.9 | $0.87 |
| 2 | 🙈 Probes A, B | 0.9 + 0.7 | $0.64 |
| 3 | 📝 Maker, FIX round, cap $2.75 | 7.3 | $1.88 |
| 3 | 🙈 Probes A, B (whole versions after the last change: the final probe) | 0.9 + 0.9 | $0.70 |
| 3 | 🔎 Fact recheck | 1.8 | $0.68 |
| 3 | 🙈 Blind solve, both versions (keyless) | 3.7 | $1.02 |
| after | 🧾 Reporter (cheaper tier) | 1.4 | $0.29 |
| after | 🔎 Auditor (proposals only) | 1.3 | $0.45 |
| | **Total** | **47.8** | **$13.50** |

| Round | A right of 10 (sure) | A cues | B right of 10 (sure) | B cues | Short answers over half |
|---|---|---|---|---|---|
| 1 | **7** (6) | item 5, topic 2 | **9** (6) | item 6, type 2, sounds 1 | none |
| 2 | **8** (3) | item 4, topic 2, type 1, sounds 1 | **6** (2) | item 4, topic 1, sounds 1 | A q12 borderline (paragraph guessed) |
| 3, final | **9** (3) | item 7, type 1, guess 1 | **5** (2) | item 5 | none (blind solve: B q12 could be) |

What the invented article fixed: topic cues 4 → 3 → **0**. What it did not: **items answering each other** (11 → 8 →
12 of the right answers), above all the Part A/Part B pairs (right without the passage in every round) and article
items whose choices restate another item's cause chain.

Open (listed first in the attempt's `audit.notes`): the gate (both versions); the blind solve's 7 FIX (A q9/q10 and B
q9/q10 answer themselves; A q8, A q11, B q8 guessable from other items; B q12 everyday sense and B q8's stem prints its
detail; B q3 easier than A q3); 2 minor fact FIX (A q11 and B q11 `why`); JUDGMENT for the teacher (A q3 choice D a
defensible reading; B q10 D weakly contradicted; B q7 D; his "real sentences only" for Part B vs one unmatched quote).
No round 4: the auditor's proposals go to the owner.

## Try d (owner decision "D and 1-4", Nov 7, 2026): no mc pairs, a cross-item check, the same passages
Before the attempt the lead adopted the try-c audit's proposals (section 6 of `docs/audits/AUDIT-2026-11-07-ela-try-c.md`):
`agents/maker.md` v7 (no multiple-choice Part A/Part B pairs; wrong choices ruled out by a paragraph; a FIX round
re-checks the whole version; the story's turn is never the type's default; at least 8 mc stays), `agents/onboarding.md`
v8, `agents/wilco.md` v4, `agents/blind-ela.md` v5, `feasibility.json` (pairs 0), `docs/RUNBOOK.md` steps 4, 4a, 7, 8,
and a new `checks/cross-item.mjs` (self-test; `npm run check` 5e; shrink-only known-failing list
`checks/cross-item-debt.json`: g11-history 11 hits, g7-ela2 2, g8-science 1, listed for the owner). Hard stop $15.
Records: `samples/g7-ela2/attempts/try-d/` (pack with checks, log and audit; FIX lists; probe and blind-solve answers;
watermarked preview PDFs and AUDIT-REPORT, without REVIEW.html, which prints the product name). Audit (proposals
only): `docs/audits/AUDIT-2026-11-07-ela-try-d.md`.

**Result in one line: the gate still fails after 3 rounds (final whole-version probes A 4 of 8, B 7 of 8; 4 of 8
fails), so the sample stays hidden and this pack stays the sample. Keys are sound (blind solve 16 of 16 mc). Cost
$12.63, under the $15 stop (0.77× the $16.50 budget).**

- **Passages:** the same "Biscuit" (350 words) and "The Reeds of the North Lagoon" (321 words; round 2 dropped "once"
  from [1], a fact JUDGMENT). **Counts:** 8 mc + 2 citing short answers + RACE a version, no pairs, L3 4 of 11.
- **Bots:** keys, test-wise, no-passage and cross-item exit 0 every round; cross-item had 0 hits every round while the
  probes found 2-3 item cues: the leaks are in meaning, not words.

| Round | Step | Minutes | Cost |
|---|---|---|---|
| 1 | 📝 Maker, cap $4.10 | 11.3 | $3.02 |
| 1 | 🔎 Fact check (internal) | 1.3 | $0.46 |
| 1 | 🙈 Probes A, B | 0.8 + 0.7 | $0.62 |
| 2 | 📝 Maker, FIX round, cap $2.75 | 8.3 | $2.11 |
| 2 | 🔎 Fact recheck | 1.6 | $0.55 |
| 2 | 🙈 Probes A, B | 0.7 + 0.8 | $0.61 |
| 3 | 📝 Maker, FIX round, cap $2.75 | 7.7 | $2.27 |
| 3 | 🙈 Probes A, B (whole versions after the last change: the final probe) | 0.7 + 0.7 | $0.62 |
| 3 | 🔎 Fact recheck | 1.1 | $0.47 |
| 3 | 🙈 Blind solve, both versions (keyless) | 3.2 | $1.11 |
| after | 🧾 Reporter (cheaper tier) | 1.1 | $0.27 |
| after | 🔎 Auditor (proposals only) | 1.5 | $0.52 |
| | **Total** | **41.5** | **$12.63** |

| Round | A right of 8 (sure) | A cues | B right of 8 (sure) | B cues | Short answers over half |
|---|---|---|---|---|---|
| 1 | **5** (3) | type 2, item 2, sounds 1 | **7** (1) | item 3, sounds 2, type 1, guess 1 | none |
| 2 | **4** (0) | sounds 2, item 1, topic 1 | **5** (1) | item 2, topic 2, sounds 1 | B q5 close (B q3 C printed its detail) |
| 3, final | **4** (0) | item 2, sounds 1, topic 1 | **7** (0) | item 3, type 2, topic 1, sounds 1 | none |

Compared with try c (A 7, 8, 9 and B 9, 6, 5 of 10; item cues 11, 8, 12), dropping the pairs about halved the item cues
(5, 3, 5) and confidence fell to none sure, but B did not settle. Open (listed first in the attempt's `audit.notes`):
the gate (both versions); the blind solve's 8 FIX (A q4, A q8, B q8 guessable; A q9 and B q9 one-step for L3; B q3
two right answers; B q6 years out of order; B q5's action in B q2 C); 3 round-3 fact FIX not rechecked (A q3 choice C
true by [1]; B q3 choice A arguably true; A q9 choices B, C unsupported). No round 4: it would pass the $15 stop.
