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
      "notes": { "pages": 3 }, "slides": { "slides": 15 },          // studyguide too: pages
      "project": { "days": 5, "grouping": "groups", "turnIn": "a poster and a one-page reflection" },  // alone | groups | either
      "unitfull": { "days": 10, "lessons": 4, "quizzes": 2, "tests": 1, "bellringers": 10 }
    },
    // The live "that's too much" check, measured on the teacher's device. Never blocks Send.
    "feasibility": {
      "pagesEstimated": 1.2,                    // about how many pages of source (null when unknown)
      "method": "text-words+pdf-pages+asked",   // text-words | pdf-pages | docx-words | pptx-words | asked | standards
      "files": [{ "name": "notes.txt", "pages": 1.2, "method": "text-words" }],
      "askedPages": null,                       // her answer to "About how many pages is your source?"
      "standards": null,                        // "My source is only standards": how many (questionsPerStandard)
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
| `order.extras` | Extras from `menu.json` (`"tpt"` here or in `order.items` adds `SELL-IT-ON-TPT.pdf`) |
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
| `originalReview` | For a `versions` order: findings about the teacher's own uploaded test, shown on the audit report's "What we found in your original" page and not counted with the pack's findings. `{ "file": "my-test.docx", "summary": "…", "findings": [{ "where", "kind": "FIX" \| "KEEP" \| "JUDGMENT", "what", "before", "suggestion", "inVersions" }], "notes": ["…"] }` (`inVersions`: what the A/B versions do instead) |

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

- PDFs only: student and teacher copies (A/B), handouts, cards and rubrics, and `AUDIT-REPORT.pdf` ("Preview: not
  approved yet"). Every page has a diagonal "PREVIEW — not approved for use" mark and a header line with the order id.
- `REVIEW.html`: an offline page (no network, nothing to install) with the sign-off checklist (I checked the answers;
  the level fits my students; the wording and content are right for my class; nothing needs a change), a comments box
  per document, and two buttons:
  - **Request changes** saves `comments-<order id>.json`: `{orderId, name, date, packHash, checklist, comments:[{title, comment}]}`.
  - **I agree — release my files** (only when every box is ticked and a name is typed) saves `approval-<order id>.json`:
    `{orderId, name, date (ISO), statement (the exact agreement text), packHash, documents:[{file, title, sha256}]}`,
    one entry per preview PDF with the SHA-256 of the file they saw.
- No Word, PowerPoint, `project.json`, README or TPT guide: nothing editable leaves before sign-off.

**2. Final** → `<folder>/out/` and `<folder>/out.zip`

Save the teacher's approval file as `<folder>/approval.json`. The final is made only when its `orderId` is the pack's
`id`, its `statement` is the review page's text, its `packHash` matches the current `pack.json` (SHA-256 of the
parsed pack, so any content change counts), and every PDF in `out-preview/` is listed with a matching SHA-256.
Otherwise the renderer refuses with the reason and makes nothing (`exit 1`); change the pack → new preview → new approval.
The final has no watermark and has every file below; `README.txt` and the audit report say "Approved by <name> on <date>".

## What `render-pack.mjs` makes (one zip per order)

| File | What |
|---|---|
| `<doc>-student[-A|-B].pdf` and `.docx` | Student copies, in the teacher's style |
| `<doc>-teacher[-A|-B].pdf` and `.docx` | Teacher copies: the key in bold, `why` under each answer |
| `<doc>.pptx` | Slides, review games and bell ringers (title slide, one slide per entry, speaker notes; a review game or bell ringer puts the answer in the notes) |
| `<doc>-handout.pdf` | Slides: a printable handout with room for notes |
| `<doc>-cards.pdf`, `<doc>-teacher.pdf` | Review games: printable question cards (no answers) and the key |
| `<doc>.pdf` and `.docx` | A document that is only a rubric: the rubric table |
| `AUDIT-REPORT.pdf` | The reporter's report: what each agent did, every round, every catch and fix, time and cost |
| `project.json` | The pack itself, so the teacher can upload it again to change, reprint or make new versions |
| `README.txt` | What's inside, the AI notice, "check before students see it", and the delete notice |
| `SELL-IT-ON-TPT.pdf` | Only if `order.items` or `order.extras` has `"tpt"` |

`<doc>` is the document title in lowercase with dashes (`Ratios Quiz` → `ratios-quiz`). Every PDF is Letter size with
page numbers and a footer: the brand short name and "Made with AI · check before use". A sample:
`samples/_fixture/pack.json` (`npm run render samples/_fixture`).

The brand name and notices come from `brand.config.json` only.
