# Audit, Nov 7, 2026: the option-1 remake of the grade 7 reading sample (g7-ela2)

For the owner. Written by a fresh 🔎 auditor (`agents/auditor.md` v3), who wrote none of the pack or briefs. Inputs:
`samples/g7-ela2` (`pack.json` checks and log, `order.json`, the lead's `AUDIT-NOTES.md`, the teacher's notes),
`onboarding.json`, `FOLLOW-UP.md` and the "go" answer, the lead's two FIX lists, the makers' three hand-offs, the eight
probe notes, `agents/*.md`, `docs/RUNBOOK.md` and the last audit (`AUDIT-2026-11-07-ela.md`). No teacher comments (a
made-up teacher; the sample stopped at the preview, so there is no `approval.json`). **The owner asked for proposals
only: no brief, check or pack was changed.** Every change below is a proposal for the owner.

## 1. Cost against the budget

| Order | Items (tokens) | Budget | Logged | × budget | × quiz ($15) | Owner's hard stop |
|---|---|---|---|---|---|---|
| g7-ela2 remake | readingquiz + rubric (165) | $16.50 | **$9.30** (rounds 1–3; no extra rounds) | 0.56 | 0.62 | $17: not reached |
| g7-ela2 before (for comparison) | same | $16.50 | $26.21 | 1.59 | 1.75 | — |

**A sum error:** the lead's table totals $9.01, but its rows add to **$9.30** ($9.19 in `pack.json`'s log, plus the
lead's $0.11 test call). The $0.29 gap is exactly the reporter's line. Not measured: the lead's own session and two
starts stopped in their first minute. The pack's log should be the record; fix the notes' total.

**Where the money went:** makers $6.20 (67%: first draft $2.24 of its $5.50 cap, redesign $2.49 of $4.10, FIX round
$1.47 of $2.75: no cap was hit); fact checks $1.13 (round 1 $0.68, recheck $0.45); eight probes $1.07 ($0.12–0.17 each,
half the old $0.27); onboarding $0.50; reporter $0.29; test call $0.11. 33 minutes of sessions.

**It is not finished.** No blind solve ran, the gate is open and 3 fact FIX are open. To finish: a round 4 (maker at
the FIX cap $2.75 + probes $0.25), the blind solve ($1.0–2.7) and a recheck of the three keys ($0.45): **about
$13.8–15.5 in all**, under the $17 stop and near the quiz's $15.

## 2. What each check caught that the others missed

- **The fresh probes** were the only check that failed the draft: A 8, 6, 5, 6 and B 7, 8, 7, 6 of 8 (fail at 4).
  Short answers held after round 1 (no answer over half credit): option 1's main win.
- **`checks/no-passage.mjs`** passed every round (worst 34% → 28% → 25%) and came off the debt list. It catches word
  overlap between items; the leaks left were meaning, not words (below), which only the probe sees. Working as designed.
- **The fact checker** caught 3 FIX in round 1 (cats overstated in [4]; the fence alone credited for few dingoes) and 3
  more in the round 3 sweep: B q6's key, A q7's `why` and A q10's key say the weather is the same on both sides, where
  [2] says scientists compare places with the same weather. No other check reads keys against the article.
- **Nothing checked the story's keys**, nor whether A q4's unmatched quote is contradicted by the story (the definition
  requires it): the blind solve only starts on a draft that passed the gate.

## 3. Each finding, sorted by cause

What the probes' right answers came from, final round (8 mc a version):

| Cue the probe named | A | B | Rounds it appeared |
|---|---|---|---|
| Everyday word meaning ("cropped", "living", "slip") | q7 | q7 | every round, both versions (6 hits, 4 of them at confidence 5) |
| Another item printed the idea (A q3 C "empty bowl" → q2; B q2 "math teacher") | q2 | q2 | A: r2, r3, final, after two FIX that named it |
| A pair answers itself (one Part B quote is the only one on the key's subject) | q8 | q8/q9 | A q8/q9 r1–r2; B q8/q9 r2, r3, final (the same [3] quote kept) |
| The story type's default ("a pet-sat cat misses its owner"; "sounds like a teacher") | q1 | — | r1 (arc), r3 q1 conf 4, final q1 |
| General knowledge of the topic (hopping mice, the cross-fence studies) | q6 | q6 | r1–final, one item a version at the end |

| Finding (evidence) | Cause: brief and line |
|---|---|
| Word-in-context items answered from the everyday sense, three words in a row | **maker.md** v4 has no word-in-context rule; **blind-ela.md** v3 traps only the opposite case (the key is the dictionary sense but the passage means another) |
| A FIX named a cue; the next round reworded around it and kept the idea (A q2/q3 "empty bowl"; B q8/q9's [3] quote) | **maker.md** rule 6 says fix once, but not that a named cue must leave the whole version |
| The Part B key was the only on-topic quote (B "Kangaroos graze on the same grass that sheep need" [3]) | **maker.md** rule 5 asks for an unmatched quote, not that all four quotes be equally about the stem's subject |
| The key was the genre's default reading | **maker.md** rule 1 asks for rival readings, but not that the default a non-reader would guess be a rival, never the key |
| Keys and `why` said more than the article (weather, 3 fact FIX) | **maker.md** has no "a key says no more than the passage" rule for its own paraphrases; the fact checker caught it |
| The story grew to 395 words (brief: about 250–350) through red herrings added in FIX rounds | **maker.md** rule 7 gives the range but no count in the hand-off; once, not serious: watch |
| Onboarding missed the teacher's own rule, "Every Part B choice must be a real sentence from the passage" (notes line 39), and wrote it into its plan note while option 1 requires an unmatched quote; the maker followed its brief without flagging the clash | **onboarding.md** v6: no step compares the teacher's own rules with our design; **maker.md**: no line on a plan that contradicts the brief |
| Story keys and the unmatched quote unchecked at the preview | **RUNBOOK** 4a: the blind solve waits for a passed gate, so a gate failing at round 3 leaves the keys unchecked. A check gap, for the owner |

## 4. The probe knows more than a 7th grader: brief, check, or both?

**Mostly a brief problem; a small, measurable check effect; the check stays as it is.**
- Topic knowledge decided **one item a version** in the final round (q6 in both). Take those away and A is still 5 of 8,
  B 5 of 8: both still fail. The fails come from word meaning, cross-item cues, pairs and the story's default reading.
- Everyday word meaning is **not** a model artefact: a 7th grader knows "slip through a fence" and "make a living".
  "Sounds like a teacher's answer" and a self-answering pair are what a test-wise student does. These are real leaks.
- The topic effect is real but narrow: no U.S. 7th grader knows the dusky hopping mouse. A Dingo Fence complied with
  maker rule 2 for students and still leaked to the model. Lowering the probe's knowledge (telling it to answer "as a
  7th grader") would make the gate weaker and unrepeatable: **not recommended.**
- **Propose:** the probe tags each answer's cue in its notes (topic knowledge, word meaning, another item, story type,
  sounds like the key); the lead logs the split. If, over two orders, topic knowledge alone decides a fail, that is the
  evidence for the owner to weigh a separate rule for it. Until then, the brief fix is item types: ask about this
  article's build and claims, never a cause-and-effect an informed adult already knows.

## 5. Proposed brief changes (none made)

| File | Version | Rule, in one sentence | Cause |
|---|---|---|---|
| `agents/maker.md` | 4 → 5 | Rule 2 sharpened: **a word-in-context item uses a word the passage uses in a less common sense, and all four choices are real senses that fit the sentence**; if no such word exists, ask it as a short answer | "cropped", "living", "slip": 6 probe hits in 4 rounds, both versions |
| `agents/maker.md` | (same) | Rule 6 sharpened: **a cue the FIX list names leaves the whole version** (every stem and choice); rewording it is not a fix | A q2/q3 "empty bowl" r2 → r3 → final; B q8/q9 [3] quote r2 → final |
| `agents/maker.md` | (same) | Rule 5 sharpened: **every Part B quote is as much about the stem's subject as the key**; the key is never the only quote that names it | B q8/q9 three rounds; A q8/q9 r1–r2 |
| `agents/maker.md` | (same) | Rule 1 sharpened: **write the reading a non-reader would guess from the story type; it is a backed rival, never the key** | A q1 r3 (conf 4), final; r1 "shy cat warms up" |
| `agents/maker.md` | (same) | Rule 7: **a key or `why` says no more than the passage** (no widening of a claim), and the hand-off gives each passage's word count every round | 3 fact FIX on "same weather"; story 395 words |
| `agents/maker.md` | (same) | A plan line (`onboarding.json`) that contradicts this brief is a JUDGMENT in the hand-off, never a silent pick | the plan's "every Part B choice is a real sentence" vs rule 5 |
| `agents/onboarding.md` | 6 → 7 | **Compare the teacher's own rules (notes, style examples, requests) with our design; a clash is a question with our recommendation, never a silent pick** (here: unmatched quote in Part B, or all real sentences with evidence moved to short answers) | teacher's notes line 39 vs option 1; written into the plan note instead |
| `agents/blind-ela.md` | 3 → 4 | The probe tags each answer's cue (section 4); two traps added: the key is the story type's default; a word-in-context key is the everyday sense | sections 3–4; the probe already names cues, so no cost |

No change proposed to `wilco.md` or `facts.md` (both did their jobs) or to any check or line.

## 6. Cheaper without losing quality

| Idea | Saving (from the log) | Quality risk | What catches a slip |
|---|---|---|---|
| **The section 5 maker rules** (free: briefs) | Three cues survived 2–3 rounds; one round fewer is $2.2 (FIX maker $1.47 + probes $0.26 + recheck $0.45); a round 4 avoided is $3.0 | none | the probe |
| **Probe the items before the passage is polished**: the probe never reads the passage, so the maker can hand the stems and choices to a probe ($0.12–0.17 a version) mid-draft | could turn a redesign ($2.49 + $0.24) into a FIX round ($1.47 + $0.26): about $1.0 | an extra session if the items pass anyway (+$0.3) | the full-version probes still run. Trade-off: owner |
| **Fact-check the article items' keys and `why` in round 1**, not only the passage | the 3 round-3 fact FIX cost a round 4 line or a recheck (~$0.45) | +$0.1–0.3 in round 1 | the round 3 sweep, as now |
| *Not recommended:* a weaker or "grade 7" probe | ~$0.05 a version | a weaker gate | — |

## 7. Price

One option-1 order measured: $9.30 so far (0.62× the quiz's $15), about $13.8–15.5 when finished (0.92–1.03×). Not two
orders, not over budget and not under half: **hold `readingquiz` at 150.** Re-measure on the next option-1 order with
the section 5 rules; if both finished orders pass $15, raise it to about 180 as the last audit said. No price changed.

## 8. What the owner must decide

1. **Round 4 for this sample** (about $3.0, then the blind solve $1.0–2.7 and the key recheck; total stays under $17).
2. **The teacher's "Part B must be real sentences"**: for a teacher who says this, (a) ask him (the onboarding change)
   with the unmatched quote recommended, or (b) honor it by default with **no pairs** (feasibility allows 0) and the
   evidence skill in short answers, which held from round 2 on. I lean to (a) with (b) as his choice.
3. **The blind solve on a gate-failed final draft** before the owner sees it (+$1.0–2.7), so no preview goes out with
   unchecked story keys. Adds cost; it is a check added, never one removed.
4. **The probe's topic knowledge** (section 4): keep the gate as is and log the cue split; revisit with two orders.
5. Approve or change the section 5 brief proposals; correct the notes' total ($9.30, not $9.01).

## 9. What to watch next

Word-in-context and pair items in the probe notes; whether a named cue survives a FIX round; the cue split (topic
knowledge against the rest); passage word counts; the finished cost of this order against $15.
