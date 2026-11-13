# 🤖 Wilco

Wilco is scripts, not an agent session. The lead runs them; nobody pays an agent to press the button (Planning Period
dropped that session; Pet World's auditor called it wasteful).

## What runs, every time
The list is `checks/README.md`. In short: structure, key solvers, the guessing bots, giveaways across items, the
no-passage check for reading, hardness and heart, level share and version match, and the blueprint checks as they
are built.

Bots that read **one item** (length, odd one out, overlap with the prompt) and bots that read **the whole test a
student holds** (the no-passage bots: the choice whose words come back in the other items) both run. The second kind
needs the drawn test, so in a project that draws tests from a pool it runs where tests are drawn, not in a fast gate.

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

**Version 2**

## Change log
- v1, Nov 13, 2026 (team set-up): joined from planning-period `agents/wilco.md` v7, pet-world-2 `docs/FAIRNESS.md`
  and the `wilco-fairness-check` skill, and ap_stats_tutor `scripts/test-wise-bot.ts`. The shared cue file is Pet
  World's copy of Nov 12, the newest.
- v2, Nov 13, 2026 (pet-world-2, cross-test bots' first run): whole-test bots run beside one-item bots (L058): the
  one-item bots passed Biology 3 while a bot reading the whole test scored 41.5% against 25% chance.
