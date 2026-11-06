# 🧾 The reporter: the build report and the process video

The reporter (`docs/builder/AGENTS.md`) turns a unit's build log into a report (and, for Unit 1, a short video). Both are
made by scripts, so they can be rebuilt whenever the log grows. **Never edit the report or the video by hand; fix the
log, the unit's config or the script.**

## Rerun

```
node scripts/builder/make-report.mjs --unit g7-unit1     # Unit 1 (the default: the old command still works)
node scripts/builder/make-report.mjs --unit g7-unit2     # Unit 2 (no video: owner)
node scripts/builder/make-video.mjs                      # Unit 1's video only
```

| Script | Makes |
|---|---|
| `scripts/builder/report-data.mjs` | All the numbers (run alone to print them as JSON: `--unit <id>`, `--log <file>`). The other two import it. |
| `scripts/builder/units/<id>.mjs` | One unit's config: log and report paths, title and standards line, stations and skills, the `human` hours table, the agent role texts (`roles`), and the narrative the log can't give (checks table rows, what went wrong, what a person still has to do, what to change next, the paragraph, and for a later unit `compareWith` an earlier one). Narrative is written as functions that read the log's rows, so it follows the log. |
| `scripts/builder/make-report.mjs` | The report: `docs/builder/G7-UNIT1-REPORT.md`, `docs/builder/G7-UNIT2-REPORT.md` (the config's `out`) |
| `scripts/builder/make-video.mjs` | Unit 1 only: `docs/builder/media/g7-unit1-process.mp4` (1280×720, H.264, no sound, about 2 to 2½ minutes) and `docs/builder/media/g7-unit1-process-poster.png` (the totals slide) |

Options: `--unit <id>` (a config in `scripts/builder/units/`, default `g7-unit1`), `--log <file>` (another log, e.g. a
test copy), `--out <file>` (report only), `--keep` (video only: keep the frames in `/tmp/g7video/f`).

**Unit 1 stays reproducible.** `--unit g7-unit1` makes the same report as before the scripts were generalized, except the
"Made by … on <time>" line. Check after any change to the scripts:
`node scripts/builder/make-report.mjs --unit g7-unit1 --out /tmp/u1.md && diff docs/builder/G7-UNIT1-REPORT.md /tmp/u1.md`
(only line 3 may differ). The video takes about 3 minutes. It needs Playwright's Chromium (it falls back to
`/opt/pw-browsers/chromium`) and `/usr/bin/ffmpeg`. Screenshots are read from `/tmp/g7shots`, `/tmp/g7notes` and
`/tmp/g7game`; a missing one is skipped, so the video still builds. To check it, pull a few frames:
`ffmpeg -ss 45 -i docs/builder/media/g7-unit1-process.mp4 -frames:v 1 /tmp/f45.png`.

## What the log must look like

One Markdown table with exactly five columns, in this order:

```
| Time (UTC) | Who | What | Minutes | Tokens |
|---|---|---|---|---|
| 14:21 | 🏗️ Builder | Done: ... verify/typecheck/build pass ... | 29.6 | 371,335 (115 tool calls) |
| 14:27 | 🏗️ Builder (round 2) | ... | 4.8 | 9,754 more (381,089 total) |
| — | ... | ... | ... | ... |
```

- **Time:** `HH:MM` (UTC). Agent rows are logged when the agent **finishes**; lead rows when the lead **starts**. A row
  with `—` keeps the time of the row above it. Clock time is first `HH:MM` to last `HH:MM`.
- **Who:** an emoji, the agent's name, and optionally `(round N)`, `(new)` or `(fresh)`. Everything in brackets is
  dropped, so `🏗️ Builder (round 3)` counts toward `Builder`. Several agents in one cell, separated by commas, is an
  event only (counted for no one). `Lead` has no emoji.
- **The unit lead** (Unit 2 on): `🧭 Unit lead` is the coordinating agent; its rows have `—` tokens (not measured).
  A row that acts in a role, `🏗️ Builder (unit lead)`, `🏗️ Builder (unit lead, round 2)` or `🧭 Unit lead (as 🗺️ Mapper)`,
  is **the unit lead's own unmeasured work**: it counts toward `Unit lead`, and the team table shows it per role
  (`↳ 🏗️ Builder (unit lead)`), with plain `🧭 Unit lead` rows as `Coordination`. Role texts: `roles['Unit lead: Builder']`
  in the config (falls back to `roles.Builder`). `Lead` is then the coordinating session that started the run.
- **What:** plain words. A literal `|` must be written `\|`. Some numbers are read from these words (see below), so
  keep these phrases when they apply.
- **Minutes:** a number (`5`, `29.6`) or `—`. Agent time is the sum of every row.
- **Tokens:**
  - `140,320 (49 tool calls)`: one run's own total. Added to that agent.
  - `9,754 more (381,089 total)`: extra tokens for a resumed agent. Added; the running total is checked against the sum
    and the report shows ✓ or ✗.
  - `(in final total)`: counted in a later row. Adds nothing.
  - **Exact** (fresh cloud sessions report it): `4,072,381 (26 tool calls; cache read 3,888,448; cache write 145,212;
    input 55; output 38,666; $2.71 reported)`. The split and the dollars are used as they are, no estimate. A resumed
    session: `8,104,311 more (12,176,692 total; cache read …; cache write …; input …; output …; $5.33 total reported)`:
    when the split adds up to the running total it replaces the earlier split, and a `$X total reported` replaces the
    earlier dollars (a plain `$X reported` is added). The report checks that each exact agent's split adds up to its
    tokens (✓/✗) and also prices the split with `PRICES` for comparison; the reported dollars are the ones used.
  - `—`: not measured. An agent with no measured row (the lead, the feature keeper) is left out of the token and cost
    totals and shown as "not measured".

**Phrases the report reads from the What column** (Unit 1's checks; Unit 2's config reads its own phrases from the
named rows, e.g. `N step mismatches`, `N of its M judgment calls`, `Applied N of the solver's`, `plays N hands`,
`N repeated cards`, `(N of M hands flagged)`, `N more problems scanned: N repeated`, `relayed N checker reports`,
`passed on N owner notes`, `N channels inferred`, `Gaps: …;`; a missing one shows as `?`) (if one is missing, that number shows as `?` and its check line is
left out): `N picks across`, `N new catalog ids`, `About N searches`, `N blocked fetches`, `N problem keys`,
`N skills with GADOE`, `(N stations`, `N mix-ups`, `N rewards`, `within N pts of chance`, `N Dive Shop problems`,
`N across all shops` / `N all-shop`, `N judgment calls`, `N browser checks`, `tester panel A–B min`,
`Solved N unit-test items`, `without the key: N agreed`, `N FIX`, `N JUDGMENT`, `best strategy A vs B chance`,
`N moves rechecked`, `N <shopName> problems` (the config's `shopName`), and the game's name as the first words of the
game designer's row, before a colon. **Findings** in the comparison are summed over checker rows (`checkers` in the
config, default solver, blind solver, fresh eyes): every `N FIX` (not `Round N FIX`) and every `N judgment calls` /
`N JUDGMENT`.

**Still-to-come steps** (game designer, blind solver, Wilco, fresh eyes) count as done when a row's Who names them and
has minutes. They count as started when any row mentions them.

The video has plain-word captions for the rows of this run (`CAPTIONS` in `make-video.mjs`, matched by a pattern on
the What column). A new row without a caption uses the first words of its What text, which works but reads less
well; add a caption line for a better slide. Screenshots per step are in `SHOT_FOR`.

## Cost assumptions

*Andy runs this on a Claude plan, so this is usage against the plan, not a bill; the dollar figures are what the same
work would cost at API prices. The real numbers are on the usage page.*

Prices (Anthropic first-party, per million tokens, the model in use): input $4, output $20, cache read $0.20, cache
write about $5. They live in `PRICES` in `report-data.mjs`.

**The token counts in the log are what the harness reported for each agent, not the billed total.** They very likely
understate it: every tool call re-sends the agent's growing context, mostly as cache reads. So the report and the video
label them "tokens reported per agent (not the billed total)" and lead with an estimate of billed tokens
(`BILLED` in `report-data.mjs`):

- For each run that reports its own total and tool calls (`140,320 (49 tool calls)`): re-reads = tool calls × an
  assumed average context per call of **half that run's reported tokens, capped at 150k**. `N more` rows add no re-reads.
- Re-reads are priced as cache reads ($0.20 per million). The reported tokens themselves are priced as input and output
  (95% at $4, 5% at $20, so $4.80 per million).

| Case | How |
|---|---|
| Low | The reported tokens alone at the "likely" mix below ($2.05 per million): the old headline, no re-reads |
| **Likely (headline)** | Re-reads at half the run's reported tokens per call (cap 150k) + reported tokens as input/output |
| High | Re-reads at the full reported tokens per call (same cap) + reported tokens as input/output |

The reported tokens priced on their own (no re-reads) are still shown, with these assumed mixes:

| Mix | Assumed | $ per million |
|---|---|---|
| Low | 85% cache reads, 10% input, 5% output | $1.57 |
| Likely | 75% cache reads, 10% cache writes, 10% input, 5% output | $2.05 |
| High | 95% input, 5% output, no caching | $4.80 |

Per station and per skill divide the billed "likely" cost by 5 stations and 9 skills. The video's COST counter is the
running billed "likely" estimate; its TOKENS counter is the running reported count.

**Exact vs estimated.** A unit can have both. Exact agents are priced at their reported dollars; estimated agents (one
reported count) use the billed estimate above. The report labels every number "exact" or "estimated"; the headline cost
is exact dollars plus the estimate. When there are no exact agents (Unit 1), the report is exactly as before.

**The lead** (the coordinating session), and in Unit 2 the unit lead, have no token count. The report shows a labeled
guess only, outside the totals: in Unit 1 their minutes times the measured agents' average reported tokens per minute,
and in billed terms their minutes times the billed cost per minute; with exact agents (Unit 2), their minutes times the
measured cost per minute, with the cheapest and the dearest measured agent per minute as the range. It is probably low
for a long-running unit lead (bigger context on every step than a short checker session); the report says so.

**The person comparison** (`human` in the unit's config) is an assumption, not a measurement: one teacher who codes,
working alone, at $50 an hour, with hours per piece listed in the report. Change the hours there if better numbers turn up.

## For the next unit

1. Copy the log format (`docs/builder/G7-UNIT2-LOG.md` is the newest).
2. Copy `scripts/builder/units/g7-unit2.mjs` to `units/<id>.mjs` and change `id`, `log`, `out`, `shopName`, `stations`,
   `skills`, `title`, `standards`, `human`, `roles`, `compareWith`, and the narrative functions. Keep every number read
   from a log row (`c.find(whoRe, whatRe)` and a regex), so a rerun follows the log; a missing phrase shows `?`.
3. `node scripts/builder/make-report.mjs --unit <id>`. Try a grown copy of the log with `--log` before the end.
4. Ask every agent (and the unit lead) to report its usage split by input, output, cache read and cache write, with the
   dollars; then the whole cost is one number instead of an estimate.

A video for another unit needs its own screenshot paths, `CAPTIONS` and `SHOT_FOR` in `make-video.mjs` (Unit 1 only today).
