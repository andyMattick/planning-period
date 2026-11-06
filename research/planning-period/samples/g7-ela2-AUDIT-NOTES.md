# Audit notes: sample g7-ela2 (pp-2026-11-05-g7-ela2)

For the auditor and the owner. Written by the order lead. This is a remake of the g7-ela reading sample under the new
rules (owner, Nov 5, 2026): passage-first design, the no-passage probe as a round 1 gate, Part B choices that are all
real quotes, and the `readingquiz` price (150 tokens = $15.00) with the cost stop at 2× ($30). Made-up teacher
Mr. Haverford, grade 7: `readingquiz` + `rubric` (165 tokens on the order), two original passages (a one-scene story,
an article on sea otters and kelp), 10 mc a version with 4 Part A/Part B pairs, 1 RACE constructed response, A/B, his
style from 2 made-up training examples. Stopped at the preview (no approval.json). The old `samples/g7-ela` stays as
the record.

**Result in one line: the gate failed in all three rounds, so the blind tester and the fact checker never ran, and the
order stopped at round 3 at $26.21 (1.75× the $15 budget).** The pack in this folder is the round 3 draft, with every
open FIX listed first in its audit report.

## Before the order: the passage field (auditor's recommendation 2)

`documents[].passages: [{id, title, kind, paragraphs, source}]`, cited by a section or a question with `passage`.
The renderer prints each passage with numbered paragraphs just before the first item that cites it (student and
teacher copies, PDF and Word); the title and byline stay with the first paragraph and no paragraph splits across a
page. `checks/student-view.mjs` prints passages, and `--no-passages` makes the probe view. `checks/keys.mjs` checks
ids and references (and `npm run check` proves it catches a missing passage). The audit report's blind table now has a
"Right without the passages" column from `passageFree`. Old packs (passages as sections) render as before. Commits
861148f and aee24be. The preview here shows it works: both passages readable, numbered 1–13 and 1–7, no orphan titles.

## How the team was run

Every role was a fresh `claude -p` session in its own folder holding only its brief's files (and a copy of `checks/`
for the maker and probes). Each session's minutes, tokens and dollars come from its own JSON record (exact). Probe
sessions answered first and got the key only afterwards (a resumed second call). The lead ran Wilco's scripts and the
render. The lead's own session is not measured.

| Round | Step | Wall (UTC) | Minutes | Cost (exact) |
|---|---|---|---|---|
| 0 | 🧭 Onboarding (2 questions, no warnings, 165 tokens confirmed) | 17:24–17:25 | 1.3 | $0.49 |
| 0 | 🎨 Style notes | 17:25–17:26 | 0.5 | $0.23 |
| 1 | 📝 Maker, cut off by the lead's 10-minute runner limit (nothing saved) | 17:26–17:36 | 10.0 | $0.43 |
| 1 | 📝 Maker, same session resumed: plan, passages, 22 rows, rubric, 4 internal drafts | 17:37–18:06 | 29.2 | $6.89 |
| 1 | 🙈 No-passage probes A and B (answer, then score and entry) | 18:07–18:08 | 2.0 | $1.31 |
| 2 | 📝 Maker, fresh: full redesign (new passages, every item) | 18:08–18:56 | 47.2 | $12.21 |
| 2 | 🙈 No-passage probes A and B (answer, then score and entry) | 18:56–18:58 | 2.0 | $1.34 |
| 3 | 📝 Maker, fresh, FIX list only, hard limit $5.50 | 18:58–19:06 | 8.3 | $2.42 |
| 3 | 🙈 No-passage probes A and B (answer; the lead scored and assembled the entries) | 19:07 | 1.2 | $0.54 |
| 3 | 🧾 Reporter (cheaper tier, short hand-off) | 19:09–19:10 | 1.5 | $0.35 |
| | **Total** | 17:20–19:14 | **103.2** | **$26.21** |

Not run: 🙈 the blind tester with the passages and 🔎 the fact checker (the runbook starts them only on a draft that
passed the gate). 🤖 Wilco (scripts) ran each round.

## The gate, per version and round (10 mc each; chance 2.5; 5 or more fails)

| Round | Version A right (sure, conf. 4–5) | Version B right (sure) | Gate | Maker's own self-read |
|---|---|---|---|---|
| 1 (first draft) | **10** (9) | **9** (10) | fail | "about 9 of 10" each (it said it failed) |
| 2 (redesign) | **8** (5) | **5** (3) | fail | 4 and 4–5 |
| 3 (FIX round) | **9** (4) | **5** (2) | fail | "about 6" and "about 4" |

Wilco passed every round: worst test-wise strategy 33% (round 1), 29% (round 2), 32% (round 3), chance 25%, line 35%;
`keys` passed every round. Once more the bots passed a reading quiz a non-reader beats.

## Did the new rules work?

- **The gate worked as a gate.** It stopped three failing drafts before any $1–3 checker ran on them, for $0.27 a
  probe, and it measured each version separately, which showed B getting better (9 → 5) while A did not (10 → 8 → 9).
- **Passage-first design and real-quote Part B helped but did not pass.** Confidence fell every round (A: 9 → 5 → 4
  sure; B: 10 → 3 → 2), so the cues got weaker, but the right count stayed far above chance. The story items mostly
  held after the redesign; the **article pairs leaked in every round** (A q6/q7, A q9/q10, B q6/q7).
- **Where the leak lives now: the Part A/Part B pair itself.** With 4 pairs, a non-reader sees 16 real sentences of
  the passages. Even with one rival quote per Part A choice (round 2's design), the reader matches quotes to choices
  one-to-one and then picks the pair that sounds like the passage's point, or uses a cue word ("Yet … stayed bare",
  "for years" echoed in the stem). Real quotes cannot state a false reading as strongly as the key's quote states the
  key, unless the passage holds characters' mistaken thoughts or claims the text later overturns.
- **General knowledge.** The teacher's article topic (otters, urchins, kelp: a textbook keystone example) let probes
  answer cause-and-effect and author's-purpose items from what they already knew.
- **The maker's self-read is not a check.** Round 2's maker read 4 and 4–5; fresh probes got 8 and 5. The author
  cannot forget the passage. (The round 1 maker was honest that it failed, and handed off anyway: the brief says to
  redesign before handing off, but gives no stop.)
- **Cost.** $26.21 against $15 (1.75×), below the $30 stop but with no passing pack. Makers were $21.95 of it (84%):
  round 1 $7.32 (29 min, 4 internal drafts), the redesign $12.21 (47 min, 95 turns). PRICING.md §2b planned $3.0–3.5
  for the first maker and $2.6 for a redesign: the real figures are 2–5× that. The capped round 3 maker ($2.42 with a
  $5.50 limit) shows a cap works.

## What the briefs still miss (for the auditor; agents/ not edited)

1. **maker.md, Reading items:** say how many Part A/Part B pairs a 10-item quiz can carry before the quotes tell the
   story (this order suggests 2, not 4), and require that a pair's four quotes not be matchable one-to-one to the four
   Part A choices by topic words. Add the rival-thought device (a character's wrong belief, quoted) as the way to give
   a wrong reading a real quote. Say plainly: if your self-read is over 4 of 10, don't hand off.
2. **maker.md rule 4 / RUNBOOK 4:** replace the self-read with a real probe the maker can call before handing off (a
   fresh no-passage session costs $0.27), or have the lead run one between maker drafts.
3. **onboarding.md:** (a) don't recommend 4 pairs by default for a 10-item reading quiz (its recommendation became the
   order); (b) warn when a nonfiction topic is a well-known textbook example and offer a less familiar angle or a
   teacher-supplied text; (c) FOLLOW-UP.md was 217 words (limit about 200).
4. **blind-ela.md mode 1:** a probe's second session (score and write the entry) cost $0.39, more than the probe
   ($0.27). The lead can score with `score-blind.mjs` and assemble the entry from the probe's own notes (done in round
   3); let the brief say so.
5. **RUNBOOK:** maker sessions run 30–50 minutes; a runner limit under 60 minutes loses work (this order lost $0.43 to
   a 10-minute background limit). Give maker sessions a dollar cap (`--max-budget-usd`), e.g. half the remaining
   budget, so one session can't take the order past the stop.
6. **The gate blocks the fact checker too.** Three rounds left the article's claims unchecked (an otter eats about a
   quarter of its weight a day; "even a few otters can keep urchin numbers down"; the 1700s–1800s fur trade; urchins
   living for years on almost nothing). Consider running the fact checker once on a passage the maker means to keep,
   even before the gate passes.
7. **Levels:** in every probe L3 was matched as often as L2 or more (100% in rounds 2–3); the blind solve that would
   judge difficulty never ran.
8. **Tools (not briefs):** `checks/score-blind.mjs` lists the other version's items as "not answered" and prints open
   items' model answers; a `--version` filter and hiding model answers would make probe scoring cleaner.

## Open for the owner

- The gate is open in both versions (A 9 of 10, B 5 of 10 without the passages). 7 FIX are open (A q6, q7, q9, q10;
  B q3, q6, q7), the first pages of the audit report.
- The lead's look at the preview: A q8 ("raft") may have two right answers (A "a group of otters floating together"
  and the key D "a large group of similar things"): no checker has read it.
- The story's main character is named Marisol, the same name as the old g7-ela story (a coincidence: the maker never
  saw that sample). Rename if the samples should not share names.
- Title and file names: the teacher's title form ("READING CHECK: "…" AND "…"") makes a long title and cut-off file
  names (`reading-check-the-bench-by-the-library-and-what-ha-…`).
- Another round would be a redesign of the article pairs (about $3–12 for the maker, $0.54 for the gate) and then the
  first blind solve and fact check (about $2–4): it would pass the $30 stop. The owner decides.
