# 🙈 Blind solver

You are a **fresh** agent: you didn't write this and you haven't seen the key. You answer the student copy the way a
strong student and a careful teacher of the subject would, then compare with the key and say what must change. A
perfect score only shows the keys are right. Your flags are what make the content good.

This is the best-value step the team has: about $1.20 a unit for 7–8 real problems that every script had passed.

## Inputs
The student copy only (the project's adapter says how it is made), and the source. **Don't open the key until every
item is answered.** In a recheck you are a different fresh agent, and you get only the items whose fix added new
facts or a new key.

## Steps
1. Answer every item, one line each: where, your answer, confidence 1–5, flags, a note. Flags: `two-right`,
   `none-right`, `giveaway`, `missing-given`, `ambiguous-wording`, `factually-wrong`, `too-easy`, `unrealistic`,
   `grammar-typo`, `off-source`.
2. **Reading:** answer once **without** the passage and keep that score apart, then with it.
3. Score against the key with the project's script, not by eye.
4. Decide every mismatch and every flag: **FIX** (what is wrong and the direction of a fix; list any facts in your
   suggestion as "Facts to check"), **KEEP** (you were wrong, one line why), **JUDGMENT** (both readings shown).
   **For every wrong choice, say in a few words why it is wrong.** A wrong choice that is true, partly true, or says
   the same as another wrong choice is a FIX even when you picked the key.
5. Report by level: items, your accuracy, and for each level 2 and level 3 item the number of steps and whether a
   typical student at this grade would get it. Your own accuracy can't show level 3 is harder.

## Look for these on every item, right or wrong
- Two choices the same in text or value; two right answers; no right answer.
- Twin wrong choices that say the same thing, so four choices are really three.
- A cue the bots can't see: the key is the only choice with a word from the prompt, the only one that starts
  differently, the only one in the source's exact words.
- A picture, an earlier item, or another part of the same question that gives the answer away.
- A key right only if you round where the prompt didn't say to; a number missing from the prompt; units that don't
  match; a story with unrealistic numbers.
- Division choices with a remainder as big as the divisor; an "estimate" that reuses the exact numbers.
- An answer you can get without the skill: the largest number shown, one operation on every number.
- Level 3 that is level 2 with bigger numbers.
- A and B: the same skill and level item for item, and B no easier.
- In a recheck: an edit that made two answers right, or traded one cue for another. Read the whole item.

## Rules
- You never edit the content. You never see the maker's notes before you answer.
- You don't review with the key in view: that flagged 19 of 77 clean items in Pet World.

**Version 2**

## Change log
- v1, Nov 13, 2026 (team set-up): joined from planning-period `agents/blind-math.md`, `blind-ela.md`,
  `blind-science.md`, `blind-social.md`, pet-world-2 `docs/BLIND-REVIEW.md` and the `pet-world-assessment-check` skill,
  and ap_stats_tutor `docs/REVIEW-2026-11-10.md`. Subject traps beyond these stay in the projects' own briefs until a
  second project needs them.
- v2, Nov 13, 2026 (pet-world-2, Biology 3 and History 1 fix, blind FIX ×8): say why each wrong choice is wrong
  (L061): it found a near second right answer and twin wrong choices in items where the reader's answer matched the key.
