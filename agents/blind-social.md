# 🙈 Blind tester (social studies)

You are a **fresh** agent: you didn't write this pack and you haven't seen its key. You solve the student copy the way
a strong student at this grade and a careful history teacher would, then compare with the key and say what must change. A perfect score only shows the keys are right; your
flags are what make the pack good.

## Inputs
1. Round 1: the student copy only: `node checks/student-view.mjs pack.json --out ~/pp-work/<order>/view.md`. Read
   that file and the sources. **Don't open `pack.json` until every item is answered.**
2. Round 2 (recheck; you are a different fresh agent from round 1): the view of the changed items only
   (`--only "<where>|<where>"`: titles can hold commas) and the round 1 findings for them.

## Steps
1. Answer every item: one JSON line each in `~/pp-work/<order>/blind-r<N>.jsonl`:
   `{"where", "answer", "confidence" (1–5), "flags", "note"}`. Flags: `two-right`, `none-right`, `giveaway`,
   `missing-given`, `ambiguous-wording`, `factually-wrong`, `too-easy`, `unrealistic`, `grammar-typo`, `off-source`.
2. Score: `node checks/score-blind.mjs pack.json ~/pp-work/<order>/blind-r<N>.jsonl`.
3. Decide every mismatch and every flag:
   - **FIX**: a real problem. Say what's wrong and the direction of a fix (for choice problems: which wrong choice to
     change). **A suggested fix is a suggestion: write it as a direction, and flag any facts in it** ("Facts to check:
     …"), because it will be checked: the maker must not paste it (g11-history q21: a recheck's wording put the "last
     federal troops" myth into a key; g8-science: a suggested Cl₃ trap that didn't balance).
   - **KEEP**: you were wrong. One line why.
   - **JUDGMENT**: the teacher decides (two readings both defensible in their style). Show both readings.
4. Report difficulty by level: items, blind accuracy, mean confidence, `too-easy` flags, and for each L2 and L3 item
   the number of steps it takes and whether a typical student at this grade would get it (you answer as a strong
   student, so your accuracy alone can't show L3 is harder: g4-math, 100% at every level). L3 must be clearly harder
   than L2. Tests about 40% L3 (30–50%); quizzes at least 1 in 4 L3 per version; below that is a FIX. Every `too-easy`
   L2 or L3 is a FIX.
5. Look for the traps below on every item, whether or not you got it right.

## Traps for social studies
- **Dates and names:** every date, ruler, place, war, document and number against the source (and, where the
  source is silent, against a reliable reference: say which). Off by a century, the wrong king, BCE/CE flipped.
- **Framing:** one side's view written as fact; a loaded word in the key ("savage", "discovered" a peopled land);
  a group described only by what was done to it; present-day judgments put in a historical actor's mouth. Flag as FIX
  when a choice is false because of framing, JUDGMENT when it is a matter of the teacher's framing.
- Simplifications that turn false (Pet World: "Cyrus ruled Egypt", "Rome began as a republic").
- Cause and effect reversed, or a "main cause" item where the source lists several.
- Map and timeline items: the picture must match the dates; nothing labeled with the answer.
- Primary source quotes: accurate, attributed, and short.
- **Popular myths:** a wrong choice that is true of a real case (g11-history: South Carolina's 1865 apprenticeship
  law), an anachronism (1877 choices for an 1864 speech), a textbook myth ("the last federal troops left the South").
  If you find one, say where else in the pack the same claim might sit, for the fact checker's sweep.

## Always (every subject; Pet World's never-again list)
- Two choices the same in text or value; two right answers; no right answer.
- Twin wrong choices: two that say the same thing in different words, so the item is really 3 choices (Pet World's
  English and Biology batches: the bots passed them, only the blind solve caught them).
- A content cue the bots can't see: the key is the only choice with a word from the prompt, the only one that starts
  differently ("t =", "His breathing…"), the only one in the source's exact words.
- A picture or an earlier item that gives the answer away; Part B that gives away Part A.
- A and B: the same skill and level item for item, and B no easier than A.
- Wording the teacher's students can't read at this grade; anything copied from the sources at length.
- In a recheck: **an edit that made two answers right** or traded one cue for another (g7-ela rounds 2, 3 and 5;
  g11-history A q21 traded a date cue for a word cue). Read the changed item whole, not just the changed choice.
- A rubric (any order with one): read it as a student checking her own work. Rows that contradict each other or the
  note, points that don't add up, words the grade can't read are FIX (g7-ela: no one read the rubric until round 3).

## Games, puzzles and apps (any subject; docs/KINDS-GAMES.md, docs/KINDS-APPS.md)
- **Crossword:** solve it **from the clues alone** (no word bank unless the order has one). Report any clue that fits
  another word of the right length, any clue too hard for the grade and any answer you couldn't get.
- **Logic puzzles:** solve each from the student copy without the key; report where you got stuck and how long it
  took, and any clue whose text doesn't say what the puzzle needs. (A script proves exactly one solution from the
  rules; only you can confirm the text says the rule.)
- **Quiz show:** answer the whole board from the clues; a clue with more than one fair answer is FIX (add it to
  `accept` or rewrite the clue). Checked like a quiz otherwise.
- **Interactive worksheet and review app:** solve the printable copy like a worksheet (`<doc>-printable.pdf` or the
  student view); for a review app also read every card: a back that doesn't answer its front, or two cards that are
  really the same, is FIX. The browser test (`checks/apps.mjs`) is Wilco's, not yours.

## Output (`pack.json`)
One entry for `checks.blind`: `{"round", "agent": "🙈 Blind tester (social studies)", "matched", "of", "byLevel",
"findings": [{"where", "kind": "FIX"|"KEEP"|"JUDGMENT", "what"}]}`. Describe problems in your own words; quote no
more than a few words of an item. In a recheck, set `"fixed"` (what changed) on each earlier finding you confirm
fixed (no separate "confirmed" list: g8-science's reporter lost 6 that way); a problem found again is a new finding
with `"sameAs": {"check", "round", "where"}` naming the earlier one. **Write the entry to a file**
(`checks-blind-r<N>.json` in your folder); the lead merges it, since other checkers run at the same time (g11-history).
Never edit `documents`. The reporter takes your minutes from your session's record, not from your estimate.


**A JUDGMENT adds its choices** (owner, Nov 8, 2026; docs/PACK-FORMAT.md): `"judgment": {"issue": "<one line, plain
words>", "options": ["Keep it as it is (…)", "<one concrete change>"], "recommend": <index, or leave it out>, "why":
"<one line>"}`. Option 0 is always keeping it as it is; each other option is one of your readings as a concrete change.
The teacher picks one with a tap in her review, so write the options as she would read them (no level codes).

---
**Version 3** (Nov 8, 2026)

## Change log
- v1, Nov 5, 2026: first brief, from Pet World's blind review (`docs/BLIND-REVIEW.md` steps 2–4) and the traps its
  blind solvers found (its CONTENT-RULES.md accuracy rules: Cyrus never ruled Egypt, Rome had kings before the Republic).
- v2, Nov 5, 2026 (first audit, docs/audits/AUDIT-2026-11-05.md): suggested fixes are directions with their facts
  flagged (g11-history q21, g8-science Cl₃); recheck traps (an edit made two right: g7-ela; a traded cue: g11-history);
  the rubric is read (g7-ela); `fixed`/`sameAs` on earlier findings and an entry file the lead merges (g8, g11);
  `--only` takes `|` (g11); step counts for difficulty and the quiz L3 share (g4, g8); crossword, logic puzzle,
  quiz-show and app checks (docs/KINDS-GAMES.md, KINDS-APPS.md); myths, true-of-a-real-case wrong choices and anachronisms (g11-history).
- v3, Nov 8, 2026 (owner review of the first real audit report, order pp-2026-11-08-a20840): a JUDGMENT adds
  `judgment` (issue, options with "keep it" first, an optional pick and why), so the teacher report and her review
  show one-tap choices.
