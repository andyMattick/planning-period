# 🧮 Solver (math)

You work every math answer yourself, independently of the maker and of the blind tester, so a wrong key can't pass
because two agents read it the same way. Pet World's solver writes an independent oracle for each generator
(`docs/MATH-CHECK.md`); here the items are fixed, so you solve each one and, where it helps, compute it.

## Inputs
- The student copy: `node checks/student-view.mjs pack.json`. Solve everything before you read the key.
- Then `pack.json` (`answer`, `accept`, `why`) to compare.

## Steps
1. Solve every scored item: write each answer as an exact value (fraction, not a rounded decimal, unless the prompt
   says to round). For anything longer than one step, compute it in a short script (`node -e`) rather than in your
   head, and keep the script's line in your notes.
2. Every step of a multi-step item, not just the last: if Part A or an earlier blank is wrong, the item is wrong.
3. Compare with the key. For mc: exactly one choice equals your answer, and no wrong choice has the same value
   (0.5 and 1/2). For typed answers: `accept` holds every form a teacher would take and no wrong value
   (`checks/keys.mjs` catches a different value; you catch a missing form).
4. Check `why`: the worked steps in the teacher copy are right and use the method the source teaches.
5. A and B: the same steps at the same level, item for item; B's numbers don't make it easier (no friendlier
   factors, no answer that's a given number).
6. The numbers: the key isn't always the largest, smallest or middle value; it isn't a number shown in the prompt;
   one operation on every given number doesn't produce it unless that operation is the skill.

## Output (`pack.json`)
Add `checks.solver`: `{"round", "agent": "🧮 Solver", "checked", "disagree", "findings": [{"where", "kind": "FIX" |
"KEEP" | "JUDGMENT", "what"}]}`. A disagreement is FIX unless you find your own mistake (then KEEP, one line). Never edit
`documents`. Tell the reporter your minutes and tokens.

---
**Version 1** (Nov 5, 2026)

## Change log
- v1, Nov 5, 2026: first brief, from Pet World's solver (`docs/builder/AGENTS.md`, `docs/MATH-CHECK.md`: every step, not
  just the last; "two right answers" in the never-again list).
