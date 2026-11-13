# 🤖 Wilco

Wilco is scripts, not an agent session. The lead runs them; nobody pays an agent to press the button (Planning Period
dropped that session; Pet World's auditor called it wasteful).

## What runs, every time
The list is `checks/README.md`. In short: structure, key solvers, the guessing bots, giveaways across items, the
no-passage check for reading, hardness and heart, level share and version match, and the blueprint checks as they
are built.

## The lines
- **Guessing bots:** a strategy fails a unit when it scores more than 10 points above chance, or within 15 points of
  the pass mark. Judge groups of 8 items or more; fewer is "too few to judge", not a pass.
- **Across items:** any hit fails.
- **No passage:** multiple choice above chance + 15 points without the passage fails the version; so does a short
  answer that earns over half its credit. Never averaged away across versions.
- **Level 3:** about 40% of a test (30–50%), at least 1 in 4 of a quiz.

## Rules
- Nobody edits a check to pass content, and nobody changes a line above. They are the owner's.
- A unit that already fails goes on the project's known-failing list. The list can only shrink, and a new unit never
  joins it.
- Scripts read words, not meaning. A pass here never replaces the round of readers.
- When a reader finds what the scripts missed, the auditor adds a pattern here with a self-test that fails without it.

**Version 1**

## Change log
- v1, Nov 13, 2026 (team set-up): joined from planning-period `agents/wilco.md` v7, pet-world-2 `docs/FAIRNESS.md`
  and the `wilco-fairness-check` skill, and ap_stats_tutor `scripts/test-wise-bot.ts`. The shared cue file is Pet
  World's copy of Nov 12, the newest.
