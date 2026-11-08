# The pack format (`pack.json`)

Every order becomes one `pack.json`. Agents write it; `scripts/render-pack.mjs` turns it into the files the teacher gets.
Nothing else is hand-edited. Change the pack, then render again.

```jsonc
{
  "format": 1,
  "id": "pp-2026-11-05-g6-math",            // order id
  "order": {                                 // copied from the teacher's order (order.json)
    "teacher": "Ms. Rivera (made-up sample)",
    "grade": "6", "subject": "math", "topic": "Ratios and rates",
    "items": ["worksheet", "quiz"],
    "requests": "Use pets in the stories. Level 3 should need two steps.",
    "sources": ["source-ratios.pdf"],         // file names only; files are never kept after delivery
    "styleExamples": ["my-old-quiz.docx"],
    // From the order page (site/order.js). Only what the teacher typed; a missing field means "use the default"
    // in feasibility.json `defaults` (the page told her so). Limits are in feasibility.json `limits`.
    "itemRequests": { "quiz": "Level 3 needs two steps" },   // the free-text box under each item
    "quantities": { "worksheet": 3, "quiz": 1 },
    "itemSpecs": {
      "quiz": { "questions": 12, "types": { "mc": 8, "short": 3, "open": 1 }, "choices": 4, "versions": 2 },
      "versions": { "file": "my-unit-test.docx", "versions": 3 },   // which uploaded file is the test
      "worksheet": { "format": "interactive", "grading": "print" },   // items with interactive: true in menu.json:
                                                                      // format printable | interactive; grading auto | print
      "notes": { "pages": 3 }, "slides": { "slides": 15 },          // studyguide too: pages
      "project": { "days": 5, "grouping": "groups", "turnIn": "a poster and a one-page reflection" },  // alone | groups | either
      "unitfull": { "days": 10, "lessons": 4, "quizzes": 2, "tests": 1, "bellringers": 10 }
    },
    // The live "that's too much" check, measured on the teacher's device. Never blocks Send.
    "feasibility": {
      "pagesEstimated": 1.2,                    // about how many pages of source (null when unknown)
      "method": "text-words+pdf-pages+asked",   // text-words | html-words | pdf-pages | docx-words | pptx-words | asked | standards (older orders)
      "files": [{ "name": "notes.txt", "pages": 1.2, "method": "text-words" }],
      "askedPages": null,                       // her answer to "About how many pages is your source?"
      "standards": null,                        // always null from the order page since Nov 7, 2026 (no checkbox): the onboarding
                                                // agent detects a standards-only source and counts the standards itself
                                                // (its onboarding.json); older orders may carry a number here: still valid
      "asked": 75,                              // questions asked across items × quantity (A/B versions don't double)
      "low": 7, "high": 12,                     // pages × questionsPerPage (or standards × questionsPerStandard)
      "tooMuch": true, "warned": true,          // over the high end now / the warning was shown at some point
      "choice": "bestJudgment"                  // null | lowered | addMaterial | bestJudgment
    }
  },
  "style": {                                 // what the agents learned from the teacher's examples
    "notes": ["Numbered questions, bold directions, a box for the name and date", "Short sentences"],
    "font": "Lexend", "accent": "#2b6cb0"
  },
  "documents": [                             // one per item ordered
    {
      "item": "quiz", "title": "Ratios Quiz",
      "directions": "Show your work. Circle your final answer.",
      "versions": ["A", "B"],                // omitted when the item has no versions
      "sections": [
        {
          "heading": "Part 1: Ratio language",
          "questions": [
            {
              "id": "q1", "level": 1, "skill": "ratio language",
              "type": "mc",                    // mc | short | numeric | open | match | tf
              "prompt": { "A": "…", "B": "…" },   // a string when both versions share it
              "choices": { "A": ["…", "…", "…", "…"], "B": ["…"] },
              "answer": { "A": 2, "B": 0 },     // index for mc, value/text for others
              "accept": ["…"],                  // other right forms (short/numeric)
              "why": "…",                       // teacher-copy explanation
              "figure": null                    // optional inline SVG string (no answer labels)
            }
          ]
        }
      ],
      "slides": null,                          // for slides: [{title, bullets[], notes, figure}]
      "rubric": null                           // for rubric: {criteria:[{name, levels:[...]}]}
    }
  ],
  "checks": {                                // filled in by the checkers, never by the maker
    "blind": [ { "round": 1, "agent": "🙈 Blind tester (math)", "matched": 23, "of": 24,
                 "findings": [ { "where": "quiz A q7", "kind": "FIX", "what": "…", "fixed": "…" } ] } ],
    "wilco": [ { "round": 1, "chance": 0.25, "worst": [["longest", 0.31]], "pass": true } ],
    "solver": [ { "round": 1, "checked": 24, "disagree": 0 } ],
    "facts": [ { "round": 1, "claims": 31, "flagged": 1, "notes": "…" } ]
  },
  "log": [                                   // the reporter's log: every step, in order
    { "at": "14:02", "who": "📝 Maker", "what": "Wrote quiz A and B (24 questions)", "minutes": 11, "tokens": 182000, "cost": 1.42 }
  ],
  "audit": { "notes": ["…"], "briefChanges": ["agents/blind-math.md v3: …"] }
}
```

## Optional fields the renderer reads

All optional; a pack without them renders the same as before.

| Field | What |
|---|---|
| `date` | The order date shown on the audit report (else `order.date`, else the date in `id`, else today) |
| `order.extras` | Extras from `menu.json` |
| `style.layout` | Exact layout choices, when the notes aren't enough: `nameBox` (bool), `boldDirections` (bool), `fields` (`["Name","Date","Period"]`), `numbering` (`"1."` or `"1)"`), `choiceStyle` (`"A."`, `"A)"`, `"(A)"`), `fontSize` (pt), `workLines` (work lines under a numeric question). Without it the renderer reads the notes: "box" + "name" gives a name box, "show work" gives 3 work lines |
| `style.font` | Used first; PDFs fall back to Liberation Sans / Arial / DejaVu Sans (or a serif stack for a serif font). Word files name the teacher's font |
| `style.accent` | Darkened until it reads as text on white and prints well in grayscale; color is never the only signal |
| `sections[].directions` | Directions for one part |
| question `space` | Number of blank work lines on the student copy, for any type, multiple choice included (defaults: open 6, numeric `workLines`, a level 3 `mc` question in a math pack 3, others 0) |
| question `unit` | A unit printed after the answer blank on the student copy (`Answer: ____ boxes`) and after the key on the teacher copy (`13 boxes`, not doubled when the key already says it). May be `{ "A": …, "B": … }` |
| question `left` | For `type: "match"`: the numbered items; `choices` are the lettered matches and `answer` is one choice index per item, e.g. `[1, 0, 2]` |
| question `why`, `figure`, `choices`, `answer`, `prompt` | Any of these may be `{ "A": …, "B": … }` |
| `rubric.levelNames` | Column headings, e.g. `["4 Strong", "3 Solid", "2 Getting there", "1 Not yet"]` (default `4, 3, 2, 1`); `criteria[].points`; `rubric.title`, `rubric.note` |
| `doc.notes` | Speaker notes for a deck's title slide |
| `checks.*[].agent` | Which agent ran the check (defaults: 🙈 Blind tester, 🧮 Solver, 🤖 Wilco, 🔎 Fact checker) |
| `checks.*[].findings` | Any check may list findings, not just the blind tester. Each finding may add `before` and `after` (the text before and after the fix) and, for `KEEP`, `reason` |
| `checks.wilco[].line` | The most a bot may score to pass (default chance + 0.10); `bots` = how many bots ran |
| `checks.wilco[].check` | `"keys"` (shown as passed or not with `rows`, `errors`, `warnings`, `problems`; no chance or line) or `"test-wise"` (the bots, with `chance` and `worst`) |
| `checks.wilco[].worst[]` | `[name, score]`, or `[name, score, {"judged": false}]` for a bot with too few questions of its kind to judge. Without the flag the renderer asks `checks/test-wise.mjs` about the current pack. A bot that isn't judged is drawn greyed, "not judged (too few questions)", and never as over the line |
| finding `sameAs` | `{ "check": "blind", "round": 2, "where": "Quiz A q8" }`: this finding is the same real problem as that earlier one (found again in a later round). It is counted once everywhere and shown under the earlier finding as "found again in round N". If the earlier one has no `fixed`, this one's `fixed` counts for it. `check` and `where` default to this finding's own |
| `rounds` | The order's number of rounds, when it should be stated outright. Otherwise the audit report uses the highest `round` across the blind, fact and solver checks; Wilco reruns after every change, so its runs are counted on their own ("N Wilco runs") and never set the rounds |
| finding `forTeacher` | `true` leaves a finding for the teacher to decide even when it has text in `fixed` |
| finding `judgment` | On a JUDGMENT: `{ "issue": "one line", "options": ["Keep it as it is", "Reword it so …"], "recommend": 1, "why": "one line", "by": "reporter" }`. **Option 0 is always "keep it as it is"**; any other pick asks for a change. The checker that raised it writes `issue` and `options` (and may recommend); the reporter adds `recommend` and `why` when they are missing and sets `by: "reporter"` (agents/reporter.md). The teacher report shows the options with our pick and why; REVIEW.html and My orders show them as one-tap choices with our pick chosen. A pick other than 0 goes out with Request changes (a "Your decisions" comment plus `judgments` in `comments-<id>.json`) and blocks Approve; the approval records her picks in `judgments`. Without it (older packs) the checker's own words are shown and she writes her choice in the comments |
| question `points` | Points for How to grade; without them the teacher copy suggests mc/tf 1, number and short 2, written 4 (marked `*`) |
| question `credit` | How to grade, by hand: `{ "full": "…", "partial": "…", "notes": ["…"] }` (each may be per version). Without it: full credit is the key, partial credit a plain default by type, and the notes are the rubric sentences checkers left on KEEP findings about that question ("the rubric should accept coffee or smoothie") |
| question `lesson` (or `source`) | The lesson or source section a question covers, shown on the audit report's coverage page next to its skill |
| log row `waiting` | Minutes spent waiting for the teacher (her follow-up answer), shown as "Waiting for your answer" next to agent minutes. Without it, "15 minutes waiting" in a row's `what` is read |
| `order.tokenTotal` | Tokens charged for the order, shown in the teacher report. Without it the renderer reads `tokenTotal` from `order.json` or `in/order.json` next to `pack.json` |
| `originalReview` | For a `versions` order: findings about the teacher's own uploaded test, shown on the audit report's "What we found in your original" page and not counted with the pack's findings. `{ "file": "my-test.docx", "summary": "…", "findings": [{ "where", "kind": "FIX" \| "KEEP" \| "JUDGMENT", "what", "before", "suggestion", "inVersions" }], "notes": ["…"] }` (`inVersions`: what the A/B versions do instead) |
| `format`, `grading` (document) | `"interactive"` with `"auto"` or `"print"`: the document is made as one offline HTML page per version for students, plus the teacher copy; `"printable"` or missing: as before. Question fields `tol`, `round`, `hint`, `miss`, `points` are read by the page. Guided notes: a line with several `______` blanks names them in order with `;` in `answer` and every `accept`. Review game: sections are categories; a card is worth `points`, else `level`. docs/KINDS-INTERACTIVE-FORMAT.md |
| `math`, `mathText`, `figure: {graph}`, `$…$` LaTeX in any text | Math typesetting, graphs as data and the SymPy math check: docs/KINDS-MATH.md |

### Passages (reading items)

A reading passage is its own field, not a section (g7-ela had to fake passages as question-less sections):

```jsonc
"passages": [ { "id": "p1", "title": "The Spare Key", "kind": "fiction",          // fiction | nonfiction | poem | drama
                "paragraphs": ["…", "…"],                                         // printed numbered 1, 2, 3…
                "source": "original" } ],                                         // or { "citation": "…" } (fence: CLAUDE.md rule 2)
"sections": [ { "heading": "Questions 1–5", "passage": "p1", "questions": [ { "id": "q1", "passage": "p1", … } ] } ]
```

- `documents[].passages` (may be `{ "A": […], "B": […] }` when versions read different passages; `paragraphs` may be
  per version too). A section or a question cites one with `passage` (an id or a list of ids).
- The renderer prints each passage, numbered, just before the first section or question that cites it (one nothing
  cites prints at the top), in student and teacher copies, PDF and Word. The title and byline ("Fiction · Written for
  this quiz") stay with the first paragraph, and paragraphs are never split across pages.
- `checks/student-view.mjs` prints them the same way; `--no-passages` leaves them out (the ELA no-passage probe,
  `docs/RUNBOOK.md` step 4a). `checks/keys.mjs` checks ids and references; passages are never questions to the bots.
- Older packs that put passages in sections render as before. A review app's memorize passages (`text`, no
  `paragraphs`) are a different thing: docs/KINDS-APPS.md.

### Shared data sets (owner, Nov 8, 2026)

Several questions can share one data set, the way AP exams do: a table and/or a graph with a short intro, written once.

```jsonc
"stimuli": [ { "id": "s1", "title": "Survey: how students get to school",
               "intro": "A school asked 100 students …",                       // $…$ math allowed
               "table": { "columns": ["Grade", "Bus", "Car", "Walk"], "rows": [["Grade 9", 18, 22, 10], …], "caption": "…" },
               "figure": { "graph": { "kind": "segmentedBar", … } } } ],      // a graph as data (docs/KINDS-MATH.md) or SVG
"sections": [ { "questions": [ { "id": "q1", "stimulus": "s1", … }, { "id": "q2", "stimulus": "s1", … } ] } ]
```

- `documents[].stimuli` (the list, or any field, may be `{ "A": …, "B": … }`; a `gen` spec on a data set makes its numbers
  per version, docs/KINDS-MATH.md §4). A question cites one with `stimulus` (an id; may be per version).
- **Print** (PDF and Word, student and teacher copies): the data set prints **once**, in a box just before its group's
  first question, with "Use this for questions 1–3". **Interactive page:** it shows **with each of its questions** (the
  data is in the page once). The keyless student view prints it once before the group.
- `checks/keys.mjs`: ids unique and found, a table has rows, each data set has a table, graph or intro, its questions are
  next to each other, and **at most about 4 a group** (5 is a warning, more an error). `checks/cross-item.mjs`: in a
  group, no question's key is another question's choice (same text or number) or a 3+ character number in its stem.
  `checks/math.mjs` checks the data set's graph like a question's.

### Multi-part long answers (owner, Nov 8, 2026)

A `short` or `open` question may have `parts: [{ "label": "a", "prompt": "…", "answer": "a strong answer",
"checklist": ["what earns full credit", "…"], "points": 2 }, …]` (2 to 6 parts; any field may be per version; the
question needs no `answer` of its own). Student copy: each part with its own work lines (4, or the question's `space`);
interactive page: each part its own box; the answer sheet gives each part "Part (a) points: __ / 2". Teacher copy: each
part's strong answer and its **full-credit checklist**; How to grade adds the parts' points (a part without points
counts 2, marked as our suggestion). Model answers and checklists never reach a student page (checked).

### Versions: a number, or one per student (owner, Nov 8, 2026)

The order sets `itemSpecs.<quiz|test>.versions`: a number (1 to 10: the document's `versions` has exactly that many
letters), or `"student"` with `itemSpecs.<item>.students` (2 to 150). **One per student is only for an interactive page
graded on paper** (`format: "interactive"`, `grading: "print"`): `checks/keys.mjs` fails it on a printable document,
and the order page offers it only with Interactive.

```jsonc
{ "item": "quiz", "format": "interactive", "grading": "print", "versions": ["A"],
  "gen": { … }, "stimuli": [ … ],                       // version A with a gen spec, as for script-made versions
  "pool": { "students": 30,                              // what the order asked; versions.mjs fills in the rest:
            "size": 30, "seed": "…", "codes": ["JZUAR", …],
            "versions": [ { "code": "JZUAR", "questions": { "q1": { "choices": […], "answer": 2, "why": "…" } },
                            "stimuli": { "s1": { "table": …, "figure": … } } }, … ] } }
```

- `node scripts/versions.mjs pack.json` makes the pool from A's formulas (the same refusals as B, C…; numbers may repeat
  between students but never equal A's), runs SymPy on **every** pool key, the estimate-r and segmented-bar checks on
  every version's graphs, and the data-set check on every version. `--verify` fails when the pool isn't what A makes now.
- **Student page:** one file, `<doc>-interactive.html`, holding every version's questions and **no key, why, accept,
  checklist or hash** (checked: `checks/interactive-format.mjs` fails a pool page with any of them or any version's key
  as text). The student types her name and presses "Get my questions"; `SHA-256("PPS1|<salt>|<name>")` picks her version,
  and its 5-letter code shows at the top and on her answer sheet.
- **Teacher:** the teacher copy is version A (the one the checkers read in full); `<doc>-all-versions-key.pdf` prints
  every version's key under its code; `<doc>-teacher-key.html` (final only, never with the students' pages) shows one
  version's key from its code or the student's name. A document with 2 or more letter versions gets the same two
  files, by letter, **only when the order bought the all-versions key** (`itemSpecs.<item>.keyPack: true`, or
  `keyPack: true` on the document; +5 tokens, docs/PRICING.md §2e); each version's teacher copy is always made.
- `pool.blindSample` (optional): the codes the blind tester solved (`checks/student-view.mjs --pool-sample 3`); the
  audit report says how many versions there are and which ones a fresh agent solved.

### How the audit report counts findings

One count, used in the front-page sentence, the catches tile and the findings pages:

| Count | Findings |
|---|---|
| needed a fix | every `FIX` |
| fixed | a `FIX` with `fixed` |
| not fixed yet | a `FIX` without `fixed` (left for the teacher) |
| kept on purpose | every `KEEP`, and a `JUDGMENT` the agents settled (it has `fixed`) |
| left for you to decide | a `JUDGMENT` without `fixed`, or any finding with `forTeacher: true` |

needed a fix + kept + left for you = all findings, after duplicates (`sameAs`) are folded into the finding they repeat.
The findings pages list them in this order: not fixed yet, left for you to decide, fixed, kept. Minutes print to 1 decimal, money to 2, percents whole; a step
with no `minutes` shows a dash and counts as "not timed".

### Document kinds

`kind` (or `item` when there is no `kind`) says what a document is. A whole unit pack, a `unitfull` order and a
`versions` order give each document its `kind`.

| Kind | What the renderer makes |
|---|---|
| `worksheet`, `homework`, `notes`, `studyguide`, `project`, `quiz`, `test` | Student and teacher copies, PDF and Word, per version |
| `versions` order | Its documents have `kind` `quiz` or `test` with `versions` (A/B or A/B/C): rendered as a quiz or test. Add `originalReview` for the teacher's original |
| `bellringer` | One short question a day, 10 to a set. Student copy: a PDF of day cards (Day 1 … Day 10, an answer line on each) and a Word copy; teacher copy: PDF and Word with the key, `why` and the skills map; `<doc>.pptx` with one slide per day and the answer in the notes |
| `slides` | `<doc>.pptx` and `<doc>-handout.pdf` |
| `reviewgame` | `<doc>.pptx`, `<doc>-cards.pdf`, `<doc>-teacher.pdf` |
| a document with only a `rubric` | `<doc>.pdf` and `<doc>.docx` |
| `quizshow`, `crossword`, `wordsearch`, `logicpuzzle` | Games and puzzles: see [`docs/KINDS-GAMES.md`](KINDS-GAMES.md) |
| `interactive`, `reviewapp` | One offline HTML app each (final only) plus content, solutions and screenshot PDFs: see [`docs/KINDS-APPS.md`](KINDS-APPS.md) |
| any of `worksheet`, `homework`, `quiz`, `test`, `readingquiz`, `studyguide`, `notes`, `reviewgame` with `format: "interactive"` | `<doc>-interactive[-A].html` per version (preview: watermarked; graded in the page or an answer sheet to print, by `grading`; guided notes: the notes with a box per `______` blank, "Check my notes" and the filled-in notes to print; a review game: one card at a time, alone or as a class on a projector) and the teacher copy (PDF; Word in the final; a review game graded in the page also prints its class code there); no student PDF or Word, and for a review game no slides or cards: see [`docs/KINDS-INTERACTIVE-FORMAT.md`](KINDS-INTERACTIVE-FORMAT.md) |
| `practicegame` | One offline HTML game each (final only: answer shooter, grid battle or fix-it desk, in the order's theme) plus a teacher sheet and screenshot PDFs: see [`docs/KINDS-PRACTICEGAMES.md`](KINDS-PRACTICEGAMES.md) |

`project.json` drops any key that looks secret or internal: keys starting with `_`, `secret` or `private`, and keys
like `apiKey`, `password`, `accessToken`, `auth`, `sessionId`, `payment`, `signedUrl`, `uploadUrl`.

## Preview, sign-off, final (owner rule, Nov 5, 2026)

The teacher must **agree to the content before the documents are released.** So the renderer has two modes:

```
node scripts/render-pack.mjs <folder>            # preview if <folder>/approval.json is missing, else final
node scripts/render-pack.mjs <folder> --preview  # always the preview
node scripts/render-pack.mjs <folder> --final    # only with a matching approval.json
```

**1. Preview** → `<folder>/out-preview/` and `<folder>/preview.zip`

- Interactive pages (`<doc>-interactive[-A].html`, with a visible PREVIEW mark and banner) and PDFs: student and teacher copies (A/B), handouts, cards and rubrics, and `AUDIT-REPORT.pdf` ("Preview: not
  approved yet"). Every page has a light "PREVIEW — not approved for use · order <id>" band in the top margin and
  "PREVIEW" in the footer; nothing is printed across the body (owner, Nov 8, 2026). The interactive pages keep their own
  PREVIEW banner and mark.
- `REVIEW.html`: an offline page (no network, nothing to install) with the sign-off checklist (I checked the answers;
  the level fits my students; the wording and content are right for my class; nothing needs a change), a comments box
  per document, and two buttons:
  - **Request changes** saves `comments-<order id>.json`: `{orderId, name, date, packHash, checklist, comments:[{title, comment}]}`.
  - **I agree — release my files** (only when every box is ticked and a name is typed) saves `approval-<order id>.json`:
    `{orderId, name, date (ISO), statement (the exact agreement text), packHash, documents:[{file, title, sha256}]}`,
    one entry per preview PDF and interactive page with the SHA-256 of the file they saw.
- No Word, PowerPoint, `project.json` or README: nothing editable leaves before sign-off.

**2. Final** → `<folder>/out/` and `<folder>/out.zip`

Save the teacher's approval file as `<folder>/approval.json`. The final is made only when its `orderId` is the pack's
`id`, its `statement` is the review page's text, its `packHash` matches the current `pack.json` (SHA-256 of the
parsed pack, so any content change counts), and every PDF and interactive page (`.html` other than `REVIEW.html`) in `out-preview/` is listed with a matching SHA-256.
Otherwise the renderer refuses with the reason and makes nothing (`exit 1`); change the pack → new preview → new approval.
The final has no watermark and has every file below; `README.txt` and the audit report say "Approved by <name> on <date>".

## The audit report: two copies (owner, Nov 8, 2026)

`render-pack.mjs` makes two audit reports from one pack (`scripts/render/audit.mjs`):

- **`out-preview/AUDIT-REPORT.pdf` / `out/AUDIT-REPORT.pdf`** (the teacher's). Pages 1–3, in plain words (easier,
  middle, harder; no check names, file names or bot names): what was made; who checked it and how (fresh agents,
  rounds, the blind tester's and solver's results, the key check, and one line on guessing: "the best guessing trick
  scored 35%, right at the 35% we allow"); what was caught and fixed (one line each, before → after; an open fix or a
  failed check is said plainly at the top); her decisions (each judgment call with its options, our pick and why);
  how to grade (points; the full table is in the teacher copy); time ("Agent work" and "Waiting for your answer" as two
  bars) and effort (tokens charged, agents, rounds, checks); the notices; then one page: each question's skill, level
  and type, the level mix, and for versions the key per version and what changes. Then **"Appendix: the full log"**:
  every step, every finding (kept ones one line each), every check round, the auditor's notes. Agent log lines and
  notes are cleaned of costs ("cap $2.33", token and cache detail) for this copy; dollars inside questions stay.
- **`AUDIT-REPORT-OWNER.pdf`** in the order folder itself (never in `out-preview/`, `out/` or a zip;
  `scripts/orders.mjs` also refuses to upload it): the same plus costs per step and per agent, model tokens, the
  budget and the agents' own words unedited. For the owner and the auditor only; never delivered.

`scripts/test-audit.mjs` (in `npm run check`) holds every sample to this: the teacher part at most 3 pages, no cost,
no word from its denylist, and the owner copy kept out of every delivery.

## What `render-pack.mjs` makes (one zip per order)

| File | What |
|---|---|
| `<doc>-student[-A|-B].pdf` and `.docx` | Student copies, in the teacher's style |
| `<doc>-all-versions-key.pdf`, `<doc>-teacher-key.html` | One per student (always), or 2+ versions with the all-versions key bought (`itemSpecs.<item>.keyPack`): every version's key to print, and (final only) the teacher's key page that finds one version's key by its letter, code or a student's name |
| `<doc>-teacher[-A|-B].pdf` and `.docx` | Teacher copies: the key in bold, `why` under each answer, the skills map, and for a quiz or test graded by hand (paper, or an interactive page printed for grading) a **How to grade** page: points, full and partial credit and what else to accept, per question |
| `<doc>.pptx` | Slides, review games and bell ringers (title slide, one slide per entry, speaker notes; a review game or bell ringer puts the answer in the notes) |
| `<doc>-handout.pdf` | Slides: a printable handout with room for notes |
| `<doc>-cards.pdf`, `<doc>-teacher.pdf` | Review games: printable question cards (no answers) and the key |
| `<doc>.pdf` and `.docx` | A document that is only a rubric: the rubric table |
| `AUDIT-REPORT.pdf` | The teacher's report (below): a 2–3 page report in plain words, then "Appendix: the full log". No dollars and no model-token counts anywhere |
| `project.json` | The pack itself, so the teacher can upload it again to change, reprint or make new versions |
| `README.txt` | What's inside, the AI notice, "check before students see it", and the delete notice |

`<doc>` is the document title in lowercase with dashes (`Ratios Quiz` → `ratios-quiz`). Every PDF is Letter size with
page numbers and a footer: the brand short name and "Made with AI · check before use". A sample:
`samples/_fixture/pack.json` (`npm run render samples/_fixture`).

The brand name and notices come from `brand.config.json` only.
