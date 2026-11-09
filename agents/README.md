# The agent team

Each brief here is what one agent reads before it starts. The method comes from the owner's other project, Pet World
(its `docs/builder/AGENTS.md`, `docs/BLIND-REVIEW.md`, `docs/FAIRNESS.md`, `CONTENT-RULES.md` and the worksheet batch
log): **the builder never checks its own work**, every check is a fresh agent or a script, fix wrong choices and never
keys, and log everything. How to run an order by hand: `docs/RUNBOOK.md`.

## The order of work

| Step | Who | Reads | Writes (in `pack.json`) |
|---|---|---|---|
| 0 | 🧾 Reporter | the order | `log` (first row), and keeps logging every step below |
| 1 | 🧭 Onboarding (fresh) | `order.json`, the sources, the training files, `menu.json`, `feasibility.json` | `onboarding.json` and `FOLLOW-UP.md` in the order folder (not `pack.json`); the teacher's reply is saved as `followup-answer.md` |
| 2 | 📝 Maker (a dollar cap per session: `docs/RUNBOOK.md` step 4) | `onboarding.json` and `followup-answer.md` first, then the style notes, the sources, the order | `style`, `documents` |
| 2a | 🤖 `checks/no-passage.mjs` and `checks/cross-item.mjs`, then 🙈 No-passage probe (ELA reading items only; one fresh session per version that has seen nothing of the quiz; the lead scores it) | one version's questions, no passages, no key | `checks.wilco` (`no-passage`), `checks.blind` (`passageFree`, `gate`). **The gate, every round and once more on whole versions before the preview:** multiple choice right more than chance + 15 points (40% with 4 choices) or a short answer earning over half its credit without the passage fails the version; the maker fixes the questions, never the key, before any other checker runs (a kept nonfiction passage gets the fact checker in round 1 anyway) |
| 3 | 🤖 Wilco (scripts the lead runs; no agent session) | `pack.json` | `checks.wilco` (`checks/keys.mjs`, `checks/test-wise.mjs`, with `--write`; `checks/apps.mjs`, `checks/puzzles.mjs` for apps and puzzles) |
| 3 | 🙈 Blind tester for the subject (fresh) | the student copy only (ELA: no passages, then the passages), then the key | an entry file the lead merges into `checks.blind` (round 1) |
| 3 | 🧮 Solver (math: `checks/math.mjs` first) or 🔎 Fact checker (science, social studies; ELA with nonfiction claims; puzzle clues with `because`; quiz-show clues; card backs) | the student copy only, then the key and sources | an entry file for `checks.solver` or `checks.facts` |
| 4 | 📝 Maker, round 2 (a new short session) | the FIX list only (suggested fixes are directions) | `documents` (FIX items only) |
| 5 | 🙈 Recheck (a fresh blind tester, not the round 1 one), 🔎 a fresh fact checker or 🧮 solver on the changed text and every suggested wording (with a whole-pack sweep for any false claim), the ELA probe on changed reading items, and 🤖 Wilco again | the changed items, then the key | `checks.blind` / `facts` / `solver` (round 2), `fixed` on each confirmed finding, `sameAs` on a repeat; `checks.wilco` |
| 6 | 🧾 Reporter | the log and the checks | `log` totals, `audit.notes` |
| 7 | Preview to the teacher | the watermarked preview and `REVIEW.html` | the teacher's comments or approval |
| 7a | If changes are asked: steps 4–6 again on them, then a new preview | `comments/<order>.md` | as above |
| 8 | Final render and delivery, **only with `approval.json`** | — | — |
| 9 | 🔎 Auditor | the findings, the log, `comments/<order>.md` | `agents/*.md` (version bump and change log), `audit.briefChanges`, a report in `docs/audits/` |

Steps marked 3 run at the same time, so each checker writes its entry to a file and the lead merges them (only Wilco's
`--write` touches `pack.json` directly). Steps 4–5 repeat until no FIX is left (stop after round 3 and tell the owner).
**Cost stop:** when an order's logged cost passes 2× its token budget (tokens × $0.10), the lead tells the owner before
any more rounds (g7-ela reached 4×).
Puzzles: the maker's content, then `scripts/make-puzzles.mjs --write` and `checks/puzzles.mjs`, then the blind tester
(crossword from the clues alone; each logic puzzle solved without the key) and the fact checker (clues with
`because`, quiz-show clues). Apps: checked like a worksheet (the printable copy) plus `checks/apps.mjs`'s browser test.
These are the team's steps; `docs/RUNBOOK.md` numbers the owner's steps (receive, onboarding, style notes, …) its own way.

Outside the order, once a month:

| Who | Procedure | Job |
|---|---|---|
| 🛡️ Dominyk | `docs/security/README.md` | The owner's security reviewer: Supabase rules and grants, the runner and its secrets, Vercel and the site, dependencies, rule 1. Fixes worst first, each with a check in `scripts/security-check.mjs`; reports in `docs/security/` |

## Who never checks whose work

- The **onboarding agent** makes nothing and checks nothing: it measures the source, warns and asks. The maker
  follows its `whatWeWillMake` as the teacher answered it.

- The **maker** never checks the pack and never writes `checks`. It runs the checks in its own folder while writing
  (no `--write`; the plain `test-wise.mjs` exit code, since `--items` always exits 0); only Wilco's run counts.
- The **blind tester** never sees the key or the maker's notes before it has answered every item, and never edits
  `documents`. The **recheck** is a different fresh agent from the round 1 blind tester and from the maker.
- The **solver** and the **fact checker** work each answer out before reading the maker's `answer` and `why`.
- **Wilco's bots** are scripts; nobody edits a check to pass a pack (CLAUDE.md rule 5).
- The **reporter** records; it judges nothing and changes no question.
- The **auditor** changes briefs, never a pack's questions, and never weakens a check.
- **Nobody** releases final files without the teacher's `approval.json` (CLAUDE.md rule 7).

## The briefs

`onboarding.md` · `maker.md` · `blind-math.md` · `blind-ela.md` · `blind-science.md` · `blind-social.md` · `solver-math.md` · `facts.md` ·
`wilco.md` · `reporter.md` · `auditor.md`. Each ends with a `**Version N**` line and a change log; only the auditor
bumps them, and `npm run check` fails if one is missing.

Changed Nov 5, 2026 by the first audit (`docs/audits/AUDIT-2026-11-05.md`): the ELA round 1 no-passage gate (owner),
checkers' entry files merged by the lead, Wilco run by the lead, a fact or solver recheck on changed text every round,
the cost stop, and who runs when for puzzles and apps. Changed Nov 7, 2026 by the ELA audit
(`docs/audits/AUDIT-2026-11-07-ela.md`, owner option 1): the no-passage bots and the probe's line, the final probe before
the preview, the round 1 passage fact check, the maker's dollar cap. The auditor's reports: `docs/audits/README.md`.
