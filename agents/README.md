# The agent team

Each brief here is what one agent reads before it starts. The method comes from the owner's other project, Pet World
(its `docs/builder/AGENTS.md`, `docs/BLIND-REVIEW.md`, `docs/FAIRNESS.md`, `CONTENT-RULES.md` and the worksheet batch
log): **the builder never checks its own work**, every check is a fresh agent or a script, fix wrong choices and never
keys, and log everything. How to run an order by hand: `docs/RUNBOOK.md`.

## The order of work

| Step | Who | Reads | Writes (in `pack.json`) |
|---|---|---|---|
| 0 | 🧾 Reporter | the order | `log` (first row), and keeps logging every step below |
| 1 | 📝 Maker | the teacher's style notes, the sources, the order | `style`, `documents` |
| 2 | 🤖 Wilco | `pack.json` | `checks.wilco` (`checks/keys.mjs`, `checks/test-wise.mjs`, with `--write`) |
| 2 | 🙈 Blind tester for the subject (fresh) | the student copy only, then the key | `checks.blind` (round 1) |
| 2 | 🧮 Solver (math) or 🔎 Fact checker (science, social studies; ELA with nonfiction claims) | the student copy only, then the key and sources | `checks.solver` or `checks.facts` |
| 3 | 📝 Maker, round 2 (a new short session) | the FIX list only | `documents` (FIX items only) |
| 4 | 🙈 Recheck (a fresh blind tester, not the round 1 one) and 🤖 Wilco again | the changed items, then the key | `checks.blind` (round 2), `fixed` on each confirmed finding; `checks.wilco` |
| 5 | 🧾 Reporter | the log and the checks | `log` totals, `audit.notes` |
| 6 | Preview to the teacher | the watermarked preview and `REVIEW.html` | the teacher's comments or approval |
| 6a | If changes are asked: steps 3–5 again on them, then a new preview | `comments/<order>.md` | as above |
| 7 | Final render and delivery, **only with `approval.json`** | — | — |
| 8 | 🔎 Auditor | the findings, the log, `comments/<order>.md` | `agents/*.md` (version bump and change log), `audit.briefChanges` |

Steps marked 2 run at the same time. Steps 3–4 repeat until no FIX is left (stop after round 3 and tell the owner).

## Who never checks whose work

- The **maker** never checks the pack and never writes `checks`. It may run `checks/keys.mjs` and
  `checks/test-wise.mjs` while writing (no `--write`); only Wilco's run counts.
- The **blind tester** never sees the key or the maker's notes before it has answered every item, and never edits
  `documents`. The **recheck** is a different fresh agent from the round 1 blind tester and from the maker.
- The **solver** and the **fact checker** work each answer out before reading the maker's `answer` and `why`.
- **Wilco's bots** are scripts; nobody edits a check to pass a pack (CLAUDE.md rule 5).
- The **reporter** records; it judges nothing and changes no question.
- The **auditor** changes briefs, never a pack's questions, and never weakens a check.
- **Nobody** releases final files without the teacher's `approval.json` (CLAUDE.md rule 7).

## The briefs

`maker.md` · `blind-math.md` · `blind-ela.md` · `blind-science.md` · `blind-social.md` · `solver-math.md` · `facts.md` ·
`wilco.md` · `reporter.md` · `auditor.md`. Each ends with a `**Version N**` line and a change log; only the auditor
bumps them, and `npm run check` fails if one is missing.
