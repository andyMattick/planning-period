# World requests: from a form to a quote to a built world

Owner, Nov 5, 2026: "I know what we built in pet world and I'd like to build a form that lets me build that out for
other people." The form is `site/world.html` (+ `site/world.js`), the **World** tab on phones and **Build a world** in
the top links. It collects what we need to quote and build a custom learning world, like Pet World, for someone else's
student or class. **There are no prices on the form**: every world is quoted.

## What a world is (what we are quoting)

What Pet World has today, unit by unit (Pet World `docs/builder/AGENTS.md`, `CLAUDE.md`):
- a **town** where each unit is a building (a "shop"), with **pets** (the owner: "keep the pets") and rewards (coins,
  stickers, a sticker book);
- per unit: **practice stations** (3–6) with skills at **3 levels**, worked **step by step** with **mix-up detection**;
  **note sheets** per station; **videos** picked and checked per lesson; **quizzes**; a **unit test** with a
  **review first** and a **grown-up's PIN** before the review and the test; a reserved test pool; **one game** per unit,
  also in the **Arcade**;
- across the world: a **teacher or parent dashboard** (skills, mix-ups, practice time, tests), grown-up controls (PIN
  before tests, video first, a daily plan, music, breaks), and a printable pack.

## What the request contains

Send makes `world-request-<date>-<id>.zip` on the device (nothing is uploaded), the same way the order page makes an
order zip. The family emails it to `orderEmail` in `brand.config.json`.

```
world-request-2026-11-05-1c753c.zip
  world-request.json
  standards/<subject>/<file>      every standards or curriculum file, per subject (25 MB in all)
```

`world-request.json` (format 1, `kind: "world-request"`):

| Field | What it holds |
|---|---|
| `request.who` | `audience` (homeschool, classroom, tutor, coop, school), `grades` (menu.json's list), `students`, `startDate` |
| `request.subjects[]` | `id` and `label` (menu.json's subjects; "other" carries the typed name), `source` (`upload` or `standardOrder`), `standardsName`, `units` (null = we suggest), `files` (zip paths) |
| `request.calendarWeeks` | weeks in their school year |
| `request.world` | `theme` (`pet-town` default, `ocean`, `space`, `city`, `fantasy`, `own` + `themeIdea`), `keepPets`, `mascot`, `buildings` (one per unit, `auto`), `studentLoves` |
| `request.unitFeatures` | 12 switches, all on by default: practice, hints (step-by-step + mix-ups), notes, videos, quizzes, unitTest (review first), signOff, game, arcade, rewards, dashboard, printable |
| `request.grownUpControls` | pinBeforeTests, videoFirst, dailyPlan, music, breaks |
| `request.notes`, `contact` | free text; name and email |
| `notices` | the rights line, the "sent to AI" line, `aiNotice` and `deleteNotice` from the config |

The form promises, in its own words: "A world is built by our agent team unit by unit. You approve each unit before
your student sees it. We'll send a quote and a timeline first."

## How the owner turns a request into a quote

1. **Count the units.** Sum `subjects[].units`; for a blank, the 🗺️ mapper's suggestion (Pet World: 7th grade math
   split into 10 units, `docs/GRADE7.md`; Georgia ELA Units 11–15). A school calendar of 36 weeks with 10 units is about
   3–4 weeks a unit, which is what Pet World's units are sized for.
2. **Price each unit from what the same work really cost** (Pet World `docs/builder/`, dollars at API prices; the
   owner runs on a plan, so these are usage, not bills):

   | Kind of unit | Measured | Source |
   |---|---|---|
   | Math unit, whole build (stations, 3 levels, mix-ups, videos, note sheets, game, solver, blind solve, fresh eyes, reporter) | $20.83 (Unit 1, 5 stations, estimate), $26.43 (Unit 2, 4 stations), $42.06 (Unit 3, 4 stations, exact); about $4.17–10.52 a station; the leads' time not counted | `G7-UNIT1-REPORT.md`, `G7-UNIT2-REPORT.md`, `G7-UNIT3-REPORT.md` ("The totals") |
   | English unit from standards (5 lessons, 110 checked questions with a 40-item test pool, short answers, term cards) | $14.61 (Unit 11) and $13.29 (Unit 12) for the child sessions; **$25.37 all in** for Unit 12 with the unit lead | `ELA-UNIT11-REPORT.md`, `ELA-UNIT12-REPORT.md`, `AUDIT-ELA12.md` |
   | Note sheets added to an existing unit | about $10 a unit (batch 1, 4 math units, children $26.48), about $11.6 (batch 2, children $33.53), about $18.7 (English batch E1, 32 sheets), at most about $33 for a unit run alone (Pet Fair) | `WORKSHEETS-BATCH-LOG.md` |
   | Pieces inside a unit build | videographer $0.58 (cheaper tier), game designer $2.64–4.26, worksheet maker $3.75 | the Unit 1 and Unit 3 reports |

   Working figures for a quote: **a math unit about $30–60** (Unit 3's $42 plus a lead share, Unit 1–2 lower);
   **an English, history or science unit about $20–30**; **turning a feature off** takes its line out (no game: about
   $3–4; no note sheets: about $4–10; no videos: under $1). A first unit in a new subject or format costs more (the
   worksheet pilot's first-of-a-kind sheets ran $4.6–5.5 against $1.75–2.9 for routine ones, `docs/PRICING.md` §1),
   so quote the first unit of each subject at the top of its range.
3. **Add the one-time world costs:** the 🗺️ mapper reading their standards and proposing the unit map (inside Unit 1's
   $20.83 run in Pet World, which also split the year), the 🧭 intake agent (below; guess $0.5–1.5), and the theme.
   **The pet town is the only theme that exists today**; ocean, space, city, fantasy or their own idea needs the
   theme switch first (Pet World `FUTURE-FEATURES.md` entry 26, item 2, size M). Quote another theme as its own line,
   or offer the pet town for the first units and the theme later.
4. **Add hosting and accounts** if they need them: Pet World's class code, roster, PIN cards and dashboard exist
   (entry 26, "Already works"), but making classes for other people needs entry 26's items 1–3 and the safety items
   (no plain-text PINs, a privacy note, deleting a class's data) before anyone is invited.
5. **Cover a round of changes** the way `docs/PRICING.md` §2 does: quote about **1.3–1.7 times** the typical cost, so a
   unit sent back once ("make level 3 harder") is covered. In tokens, 1 token = $0.10 of expected cost (so a $40 math
   unit is about 400 tokens before the cover, 520–680 with it).
6. **Write the quote as units × per-unit price + one-time costs**, with the unit map attached, and a **timeline**:
   a unit took 1 h 17 min to 2 h 38 min of clock time for the agents (the G7 reports), but each unit waits for the
   family's approval, so plan **about 1–2 units a week** while the owner runs the team by hand, units in the order of
   the school calendar, staying a few weeks ahead of the student.

Recalibrate after the first 3 worlds from their logs, the same way `docs/PRICING.md` does for packs.

## Build order

1. **Intake** (the 🧭 world intake agent, below): read the request and the standards, propose the unit map and the
   quote. The owner checks it and sends it.
2. **The family approves the map and the quote.** Nothing is built before that (Pet World entry 6, step 2).
3. **Unit 1**, then the rest in calendar order, each with Pet World's pipeline (`docs/builder/AGENTS.md`): mapper's
   spec → builder, videographer, worksheet maker → game designer, solver, blind solver, Wilco → fresh eyes → reporter
   and auditor. The builder never checks its own work.
4. **Each unit is approved before a student sees it** (the same rule as this site's preview: rule 7 in `CLAUDE.md`):
   the family sees the unit (its review list with the right answers in bold, videos, sheets, game) and agrees or asks
   for changes, which go back to the right agent.
5. **Publish** the unit in their town.

**Today a unit is code** added to Pet World's `src/game/game.js`, so worlds are built by hand inside Pet World.
**Units as data** (a unit package the game loads, so each world is its own data and not a fork of the code) is future
work: Pet World `FUTURE-FEATURES.md` entry 6 ("the big engineering change", size XL; the package format is the first
M-sized step). Until then, quote and take on a small number of worlds, and say so in the timeline.

## For the briefs

A **🧭 world intake agent** (to write as a brief when the first real request comes in; this repo's `agents/` is not
changed here). It runs first, like the order's onboarding agent:
- **Reads** `world-request.json` and every file in `standards/`. For "use your standard order", it uses the common order
  for the grade (for math, the Khan Academy course order that Pet World follows) and says which.
- **Maps standards to units** the way Pet World's 🗺️ mapper does: about equal units by the number and weight of the
  expectations, the units asked for (or a suggestion that fits `calendarWeeks`), 3–6 stations or lessons per unit, the
  standard codes beside every skill, never the standards' wording in student text.
- **Proposes** the unit list (title, building name in the chosen theme, stations, weeks), what each unit gets from
  `unitFeatures`, and the quote and timeline using the method above, with every number traced to a report.
- **Flags** what we can't do yet (a theme other than the pet town, accounts for a class) and anything the standards
  don't cover, in a short follow-up of at most 3 questions, like the order onboarding agent.
- **Changes nothing** and builds nothing; the owner reads it, adjusts and sends the quote.
