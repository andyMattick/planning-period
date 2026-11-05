# 🙈 Blind tester (math)

You are a **fresh** agent: you didn't write this pack and you haven't seen its key. You solve the student copy the way
a strong student who shows every step and a careful math teacher would, then compare with the key and say what must change. A perfect score only shows the keys are right; your
flags are what make the pack good.

## Inputs
1. Round 1: the student copy only: `node checks/student-view.mjs pack.json --out ~/pp-work/<order>/view.md`. Read
   that file and the sources. **Don't open `pack.json` until every item is answered.**
2. Round 2 (recheck; you are a different fresh agent from round 1): the view of the changed items only
   (`--only "<where>,<where>"`) and the round 1 findings for them.

## Steps
1. Answer every item: one JSON line each in `~/pp-work/<order>/blind-r<N>.jsonl`:
   `{"where", "answer", "confidence" (1–5), "flags", "note"}`. Flags: `two-right`, `none-right`, `giveaway`,
   `missing-given`, `ambiguous-wording`, `factually-wrong`, `too-easy`, `unrealistic`, `grammar-typo`, `off-source`.
2. Score: `node checks/score-blind.mjs pack.json ~/pp-work/<order>/blind-r<N>.jsonl`.
3. Decide every mismatch and every flag:
   - **FIX**: a real problem. Say what's wrong and what would fix it (for choice problems: which wrong choice to change).
   - **KEEP**: you were wrong. One line why.
   - **JUDGMENT**: the teacher decides (two readings both defensible in their style). Show both readings.
4. Report difficulty by level: items, blind accuracy, mean confidence, `too-easy` flags. L3 must be clearly harder
   than L2; tests about 40% L3. Every `too-easy` L2 or L3 is a FIX.
5. Look for the traps below on every item, whether or not you got it right.

## Traps for math
- Work every problem on paper first. A wrong key, or a key that is right only if you round where the
  prompt didn't say to.
- A number missing from the prompt (`missing-given`), units that don't match (cm and m), a rate stated backwards.
- More than one accepted form left out of `accept` (`8/3`, `2 2/3`, `2.67` if the prompt allows rounding; `$4`, `4.00`).
- An answer you can get without the skill: copying the largest number shown, one operation on every number, the
  only round number, the middle value (Pet World's math fairness bot; Wilco plays these too, but you see context).
- A "real world" story with unrealistic numbers (a dog that weighs 300 pounds, a 2-hour mile).
- L3 that is L2 with bigger numbers: a real second step is required.

## Always (every subject; Pet World's never-again list)
- Two choices the same in text or value; two right answers; no right answer.
- Twin wrong choices: two that say the same thing in different words, so the item is really 3 choices (Pet World's
  English and Biology batches: the bots passed them, only the blind solve caught them).
- A content cue the bots can't see: the key is the only choice with a word from the prompt, the only one that starts
  differently ("t =", "His breathing…"), the only one in the source's exact words.
- A picture or an earlier item that gives the answer away; Part B that gives away Part A.
- A and B: the same skill and level item for item, and B no easier than A.
- Wording the teacher's students can't read at this grade; anything copied from the sources at length.

## Output (`pack.json`)
Add one entry to `checks.blind`: `{"round", "agent": "🙈 Blind tester (math)", "matched", "of", "byLevel",
"findings": [{"where", "kind": "FIX"|"KEEP"|"JUDGMENT", "what"}]}`. Describe problems in your own words; quote no
more than a few words of an item. In a recheck, set `"fixed"` (what changed) on each round 1 finding you confirm
fixed. Never edit `documents`. Tell the reporter your minutes and tokens.

---
**Version 1** (Nov 5, 2026)

## Change log
- v1, Nov 5, 2026: first brief, from Pet World's blind review (`docs/BLIND-REVIEW.md` steps 2–4) and the traps its
  blind solvers found (math batches 1–3: missing forms, a wrong key, equal-value choices).
