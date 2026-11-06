# The Pet World builder team

Owner, Nov 1, 2026: Pet World is also a **builder**. Someone brings the standards they want to follow, and a team of
agents builds the units. 7th grade math (Georgia, GADOE 2021) is the first trial (`docs/GRADE7.md`). This file says who
is on the team, what each one gets as input, and what it hands back, so any unit in any subject can be run the same way.

Every agent follows `CLAUDE.md` and `CONTENT-RULES.md`. **The builder never checks its own work**: checking is always a
fresh agent that didn't write the content.

## Who does what, in order

| Step | Agent | Input | Output | New? |
|---|---|---|---|---|
| 1 | 🗺️ **Standards mapper** (lead) | The standards document | The unit map (about equal units) and each unit's stations, skills, levels and mix-ups (`docs/GRADE7.md`) | new |
| 2 | 🏗️ **Unit builder** | One unit's spec | Registry entries, generators (math) or question banks (other subjects), Think it through sets, rewards, docs | existing role |
| 2 | 🎬 **Videographer** | The unit's stations or lessons | 1 to 4 kid-friendly videos per station, best first, in `KID_VIDEOS`, with evidence for each pick (`docs/KID-VIDEOS.md` rules) | new |
| 2 | 📝 **Worksheet maker** | The unit's stations and videos | Interactive note sheets per station, built with Andy's full-build checklist (`docs/builder/WORKSHEET-CHECKLIST.md`, `docs/builder/WORKSHEETS.md`) | new |
| 3 | 🎮 **Game designer** | The finished shop | One original game per unit, at one station and in the Arcade (`docs/ARCADE-GAMES.md`) | new |
| 3 | 🧮 **Solver** (math) | The generators, not the builder's notes | An independent solver in `scripts/math-oracles/`; `npm run check-math` | existing |
| 3 | 🙈 **Blind solver** | The keyless test view | Answers without the key; FIX / KEEP / JUDGMENT list | existing (`pet-world-assessment-check`) |
| 3 | 🤖 **Wilco** (test-wise bots) | The unit | Every bot under the limits; math fairness bot clean (`wilco-fairness-check`) | existing |
| 4 | 👀 **Fresh eyes** (Ralph, Tina, Pam, Sam, Lena, Quinn) | The running app | Findings plus fixes (`pet-world-fresh-eyes-review`, `docs/LOOKS-REVIEW.md`) | existing |
| any | 🗃️ **Feature keeper** | Any idea the owner mentions | An entry in `docs/FUTURE-FEATURES.md` (what, why, what's already there, open questions, size); moves it to `docs/ROADMAP.md` when picked | new |
| end | 🔎 **Auditor** | The reporter's log and report, the agents' briefs and results | Recommendations to keep quality while using fewer tokens (`docs/builder/AUDIT-<unit>.md`); changes nothing | new |
| any | 📣 **Margo, the marketer** | The product, the logs, the owner's goal | Monetization options with prices backed by real costs, campaign plans and video scripts that star the agent team, all within the ad rules (`docs/builder/MARKETER.md`); changes no code | new |
| all | 🧾 **Reporter** | Everything above | The build log: steps, time, tokens and cost (`docs/builder/G7-UNIT1-LOG.md`) | new |

Steps marked 2 run at the same time; they touch different files. Step 3 starts when the builder is done.

**When the lead can't start sub-agents** (Unit 2, Nov 1, 2026: the 🧭 unit lead's session had no Agent tool). The unit
lead did the making roles itself, one after another (mapper, builder, videographer, worksheet maker, game designer), and
started every **checking** role as a **fresh cloud session** (`create_session` on the run's branch, with
`outcome_branch` set to its own branch, e.g. `claude/g7-unit2-solver`). A checker may only add its own files (an oracle,
a findings doc) or, for fresh eyes, small fixes, and pushes them to its own branch; the lead reads the findings, fixes as
the builder, and takes the checker's files with `git checkout origin/<branch> -- <files>`. So the builder still never
checks its own work. A cloud session's usage (input, output, cache read, cache write, and cost) shows in `get_session`,
so those rows have exact token counts.

## 🗺️ Standards mapper

- Reads the whole standards document.
- Splits it into the number of units asked for, about equal by the number and weight of expectations.
- For each unit: stations (3 to 6), skills (1 to 3 per station), what L1, L2 and L3 look like, and the likely mix-ups.
- Keeps the standard codes next to every skill, so a teacher can see the match.
- Never copies the standards' wording into student text.

## 🎬 Videographer

- 1 to 4 videos per station, best first. Real people teaching (no computer voices), 3 to 12 minutes, accurate, on the
  exact skill, right for the age. A song is welcome as the last, fun choice.
- **Never invents an id.** It checks each one (oEmbed when YouTube is reachable; otherwise a search result or page that
  shows the exact link with its title and channel) and writes down where it saw it.
- Official channels only; watch for re-uploads.
- Hands back the `KID_VIDEOS` entries plus a short report: why each pick, gaps, and anything a grown-up should watch first.

## 📝 Worksheet maker

- One sheet per station: what to watch for, key ideas with blanks, worked examples with pictures, "your turn" problems
  that get harder, mix-up alerts, her own notes and top 3, print and save.
- From the AP Stats design: a miss is marked, she waits a moment, and after 2 misses she writes what she's thinking
  before a hint. No network calls, no trackers, a nickname instead of a name, saved only on the device.
- Every answer in a sheet is checked by hand twice, then by a fresh agent with the rest of the unit.

## 🧾 Reporter

- Starts with the run, not after it.
- Logs each step: who, what, start time, minutes, and tokens (each agent reports its own use).
- At the end: total time (wall clock and agent time), total tokens, an estimated cost, what was slow, what failed and
  had to be redone, and what to change before the next unit.

## 📣 Margo, the marketer (owner, Nov 4, 2026)

- Knows how to make money from a project like Pet World: who buys, what they pay for, how much, and how to reach them.
- Turns the team's real work into campaigns: "send your standards, get your own world", with the agents as the cast.
- Backs every price and claim with the logs (time and cost per unit) and real comparables; marks guesses as guesses.
- Never uses Abi in an ad; uses the demo class. Discloses AI. No fake reviews or numbers. Full brief: `docs/builder/MARKETER.md`.
- Writes plans and scripts only (`docs/marketing/`); product changes go to the 🗃️ feature keeper.

## 🗃️ Feature keeper

- Whenever the owner mentions something for later ("we also need…", "someday…"), it goes in `docs/FUTURE-FEATURES.md`
  right away, in the owner's words, with what already exists in the code, open questions and a rough size.
- Doesn't build anything. When the owner picks an entry, it moves to `docs/ROADMAP.md` "Next up".
- Keeps the "Carried over" list: things offered and not yet picked, so nothing is lost between sessions.
- The weekly review reads this list and reports anything that has become easier because of new work.
- **Ideas from the 💭 Dream Box** (docs/DREAM-BOX.md) come in through the copied request ("📋 Copy for the builder" on
  the progress report or the teacher's student page). Add each one in her words, marked "from the Dream Box" with its
  date; the owner decides. When one ships, tell the owner to set it to 🎉 so she gets her sticker.

## 🗞️ Weekly digest (owner, Nov 3, 2026)

"A new AI agent who tracks new things added from the week, sends that in the report and I have them redo the demo and
video."
- **Once a week** it runs `node scripts/builder/week-digest.mjs` (the last 7 days, or `--since <date>`), which writes
  `docs/weekly/WEEK-<date>.md`: new units (new or opened this week), new Arcade games, class word cartoons, nature cams,
  the What's new entries dated that week, every commit grouped by area, and the demos (the one-click demo, and whether this week has its new-features video).
- **It reads, then writes the report.** It adds a short plain summary at the top (the week in 5 lines for the owner) and
  checks that every new feature has a What's new entry; a feature without one goes on the report's to-do list.
- **🧭 Quick setup check** (owner, Nov 3, 2026): the report lists the teacher settings added that week and flags any class
  on/off switch missing from 🧭 Quick setup (`npm run verify` fails on those too). It also checks each new feature in the
  What's new list: if a teacher might need to turn it off and it has no setting, it goes on the to-do list for the owner.
- **The demos** (docs/DEMO.md): the 👀 one-click demo and its 🎬 Videos (the Supabase demo class was retired Nov 3, 2026).
  The one-click demo is "behind" when features landed after it last changed; the video row is "behind" when the week has
  What's new entries and no weekly new-features video. **Nothing is redone without the owner's go.** On the owner's go:
  the one-click demo's seed (`demoSeed()`) and sample class first; then **make that week's new-features video** with
  `node scripts/demo-videos.mjs --week <date>` (after `npm run build`). The owner looks at it, then its line is added to
  `public/videos/videos.json` (`weekly`, or `--add`). **Never remake the two main videos unless the owner asks.**
- **Never:** touch the real database, publish, add or replace a video without the owner's OK, or count a week's fixes as
  features.

## 🔎 Auditor (owner, Nov 1, 2026)

- **Only recommends.** It edits no code or content and starts no agents; the owner decides what to adopt.
- **Runs after the reporter**, reading the build log, the report, each agent's brief and result, the commits, and what
  each check caught. Its write-up hangs off the reporter's report (a "Token audit" link at the end).
- **Looks for:** work done twice; agents re-reading big files they didn't need; checks that never caught anything versus
  checks that caught real problems (keep those); rounds that a better first brief would have avoided; steps a smaller,
  cheaper model or a plain script could do; long agent conversations that should have been fresh, short ones; work the
  coordinating session had to step in on.
- **Every recommendation** says the expected token saving (a range, with the arithmetic), what quality risk it carries,
  and which check would catch it if quality slipped. Never "drop a check" without naming what replaces it.
- **Ranks them:** free wins first (better briefs, no duplicate reads), then trade-offs.

## How a run is organized (owner adopted every audit recommendation, Nov 1, 2026)

From `docs/builder/AUDIT-G7.md`; quality first, then fewer tokens. No check was dropped.
- **Every brief starts with `docs/builder/AGENT-STARTER.md`** (rules, never-again list, checklists) instead of every
  agent reading all the docs. Agents find their code with `node scripts/builder/shop-lines.mjs <shopId>`.
- **Pattern checks run before hand-off:** `check-math` checks, across many problems, that answer signs go both ways,
  the right choice moves around (position, larger or smaller), no two choices are equal in value, and the help bot
  routes each new skill. Written by a solver, never by the builder.
- **Fresh, short sessions for each recheck round** (builder or solver): give the new session the diff and the files it
  needs, not the whole history.
- **Making roles run as their own short sessions**, not all inside the unit lead's growing conversation.
- **Checkers start on a commit where the code and its answer checker agree**, and report back to the unit lead, who
  reads its child sessions itself.
- **Fresh eyes keeps all six reviewers and the screenshots;** its by-value and help-bot scans moved into the scripts.
- **The blind solve runs once per unit, about 250+ items;** its big repeat scan moved into the scripts.
- **Check only what's new** (owner, Nov 1, 2026): a unit's run checks only the new shop, plus an older shop only if
  that round changed its code (`check-math --shop <id>`, the fairness bot `--shop <id>`). Full-site runs (every shop, every
  unit, the full test-wise bot) belong to the weekly review. `verify`, `typecheck` and `build` still run every time.
- **The reporter and the videographer's search use the cheaper model tier;** the person clicking each video and the
  report's own sum checks catch slips.

## Unit 4 changes (owner picked audit follow-up recs 1, 3, 4, 5, 6, 7; Nov 1, 2026)

From `docs/builder/AUDIT-G7.md` "Unit 3 follow-up", about $10–14 a unit saved, no check dropped.
- **The builder is two short sessions** (rec 3): first the problem makers (`*_GEN`, pictures, mix-ups), then the shop
  setup (stations, registry, rewards, room, help bot, Think it through, Notes and game cards). Each stops at **about 40
  tool calls**, commits, and writes a hand-off note for the next session. The unit lead merges between them and runs
  verify, typecheck, build and `check-math --shop <id>`.
- **"Earlier answer gives it away" check** (rec 2) runs in `check-math` before hand-off: a value she typed in an earlier
  step may not sit only in the right choice of a later step (or in every choice but the right one), and a step's own
  answer may not be printed in its prompt or story. Written by a solver, proven by breaking it on purpose.
- **Sessions start from a branch name or the full 40-character commit id** (rec 1), never a short id. The unit lead
  checks each new session is running (no `last_init_error`) within a minute of starting it.
- **The worksheet maker splits its work** (rec 7): the note sheets and keys on the main model; then a fresh session on
  the cheaper model tier runs the browser checks and reports failures. The checks are scripts that fail loudly, and the
  final checks rerun the key script.
- **New shop only, from the first brief** (rec 5): the worksheet maker builds only its unit
  (`node scripts/notes/build-notes.mjs <unit>`) and never rebuilds older units' pages by hand; the blind solver and the
  fairness bot run with `--shop <id>`. Older units are covered by the weekly full-site run.
- **The game designer stops at about 40 tool calls** (rec 8); its thousands-of-rounds self-test (fails on any repeated
  choice) and the looks review's game pass still run.

## English library units, from Unit 12 (owner adopted audit R1–R6 and R8, Nov 1, 2026)

From `docs/builder/AUDIT-ELA11.md`, about $2–4 a unit saved, no check dropped.
- **The question writer lints while writing** (R1, R2): the six "Writing questions" rules in `AGENT-STARTER.md` and
  `node scripts/check-fairness.mjs --draft <file>`, which flags a key that repeats the prompt, is the longest, shortest,
  broadest or odd-one-out choice, and a choice in both parts of a two-part item. The blind solve still runs unchanged.
- **The builder copies the Unit 11 wiring** (R3, R9): its brief says "Do the same as `cbce0a1` and `ade0402` (wiring and
  `GEORGIA_ELA`) for course X; run `git show --stat` on them first", and it runs on the cheaper model tier. verify,
  typecheck, build and fresh eyes catch a copied slip.
- **No reporter session** (R4): the unit lead copies `scripts/builder/units/ela-unit11.mjs`, edits the title and lessons
  and runs `node scripts/builder/make-report.mjs --unit ela-unitN`. The auditor still reads the log and the report.
- **The test-wise bot labels its oracle column a hindsight ceiling** (R5); it never fails a unit, so don't chase it.
- **Smaller fresh eyes for Units 13 and 14** (R6): three reviewers (a first-time kid, a parent and progress reviewer, a
  phone-width reviewer), about 25 calls, 375 wide for every lesson and 1280 for three screens. Unit 12 keeps all six
  (long passages are a new screen) and Unit 15 keeps all six (new writing screens). Any screen slip fresh eyes finds
  brings back all six for the next unit.
- **The bot plays "pick the broadest choice"** (R8, `general` in `scripts/test-wise-cues.mjs`), in the full bot and
  the fast fairness gate.
- **Kept as is:** the blind recheck after round 2 (R7 not adopted), and the writer, blind solver and fresh eyes on the
  main model tier (R9).

## From Unit 13 (owner adopted Unit 12 audit R1–R6 and a cheaper-tier lead trial, Nov 2, 2026)

From `docs/builder/AUDIT-ELA12.md`, about $4–8 a unit saved, no check dropped. Unit 13 waits until the owner says go.
- **The unit lead reads one page,** `docs/builder/LEAD-RECIPE.md` (R2): the run, the briefs, the decision rules.
- **No polling** (R1): check each child once at its usual finish time, then every 10 minutes at most.
- **The cost counter, read three times** (R3): at start, after the first merge, at the end, written in the log.
- **Stop rule for click scripts** (R4): fails twice → "not reached", move on.
- **One shared play-through script,** `scripts/play-unit.mjs` (R5), for the builder and every checker.
- **Fresh eyes: three reviewers for Units 13 and 14, plus a full look at any new screen** (R6); Unit 15 keeps six.
- **Unit 13's lead on the cheaper tier** (R8, a trial): the counter at the first merge and the auditor decide Unit 14.
- **Not adopted for now:** splitting the recheck (R7), a cheaper writer round 2 (R9), the practice-vs-test overlap
  script (R10).

## Never again (mistakes the owner found; every agent checks for these)

| Mistake | Found | Rule now |
|---|---|---|
| **Two identical choices** ("− (−7)" twice in a Deep Dive Rescue hand) | Owner playtest, Nov 1, 2026: "a terrible mistake" | No two choices the same in text or value, in questions, stations and games. Builders test thousands of rounds with a script that fails on any repeat; reviewers look for it on every screen (`docs/ARCADE-GAMES.md`, `CONTENT-RULES.md`). |
| **Two right answers** (Dive Log "Friendly pair") | Looks review, Nov 1, 2026 | The answer-key check tests every step, not just the last (`STEP_ORACLES`, `docs/MATH-CHECK.md`). |
| **The picture gives the answer away** (the dive-line arrow) | Lead's screenshot check, Nov 1, 2026 | A picture never shows what a step asks for until she has answered it. |
| **The unit's game is hidden until the last station** | Owner, Nov 1, 2026: "I should see it in the unit" | A unit's game is visible from the start of the unit. |
