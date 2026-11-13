# How this project uses the shared team

`.team/` holds unedited copies of the shared team's files (briefs, Wilco's cue code, the lessons log). The team repo
is `theATeam`; its `PROCESS.md`, `IMPROVEMENT.md` and `STREAMLINE.md` are the full method.

## Keeping the copies fresh
- Take the team's newest files (run from the team repo): `node scripts/sync-check.mjs --project <this repo> --write`.
- Is anything behind or edited: `node scripts/sync-check.mjs --project <this repo>`. The weekly run does this.
- `npm run check` here fails when a copy no longer has the hash in `.team/manifest.json`. Never edit a copy: make the
  change in the team repo. Then run every check on the samples; new failures are fixed, or listed where a
  known-failing list exists, and a check is never loosened (CLAUDE.md rule 5).

## What each stage of the team's process is called here
| Team stage | Here |
|---|---|
| 1. Rule first | A new kind gets its `docs/KINDS-*.md` and its check in `checks/` before a sample |
| 2. Measure the source | `agents/onboarding.md`, `feasibility.json` |
| 3. Blueprint | `onboarding.json` (`whatWeWillMake`), the skills map and the coverage page |
| 4. Write | `agents/maker.md`; versions by `scripts/versions.mjs` |
| 5. Scripts | `npm run check`; on a pack: `checks/keys.mjs`, `test-wise.mjs`, `no-passage.mjs`, `cross-item.mjs`, `math.mjs` |
| 6. Readers | `agents/blind-<subject>.md` on `checks/student-view.mjs`'s view; `agents/facts.md`; `agents/solver-math.md` |
| 7. One fix round | `docs/RUNBOOK.md`; the recheck rules there still apply to what goes to a teacher |
| 8. A person agrees | The watermarked preview and `approval.json` |
| 9. Learn | `agents/auditor.md` through `scripts/auditor-gate.mjs`; `docs/WEEKLY-TEST.md` |

- **Keys** live in `pack.json` (`answer`, `accept`); the student copy is `node checks/student-view.mjs pack.json`.
- **Cost log:** `pack.json` `log`, in dollars, and `records/`.
- **Paths that wait for the owner:** as in CLAUDE.md ("Auto-merge when green").

## This project's own briefs
The briefs in `agents/` stay the working briefs for orders: they are longer than the team's and know the pack
format. The team's briefs in `.team/agents/` hold what is common to every project. When the auditor changes a brief
here for a cause that isn't about packs, the same lesson goes to the team repo's `LESSONS.md` and its brief.

## Not taken yet
- The 🎯 difficulty judge as its own reader (here it is a step in the blind tester's brief).
- The team's four checks still to build: coverage of every source idea, repeats in a test, quotations, practice and
  test overlap.
- `inPassage` is in the cue file and not played: multiple choice on passages was retired Nov 11, 2026.
