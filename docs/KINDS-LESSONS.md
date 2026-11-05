# Interactive lessons (`lesson`)

One menu item, `lesson`: a lesson students do on a device, built to the owner's interactive assignment standard
(`docs/INTERACTIVE-STANDARD.md`, rules L1–D3). Each lesson document becomes **one offline HTML file** (no network: a
Content-Security-Policy forbids it; no accounts, trackers or outside fonts), a **teacher copy** made from that file, and
one private **teacher board** per pack.

Code: `scripts/render/lesson.mjs` (the build and every build-time rule, the teacher copy, the board, the content PDF,
screenshots, the old-save check, the renderer hook) and `scripts/render/lesson/` (`forms.js`: answer forms, the seeded
order and a small expression reader, run by the page and by the build; `lesson.js`: the page; `lesson.css`). The page
also inlines `scripts/render/apps/engine.js`, the engine adapted from the owner's Pet World note sheets (the forgiving
number reader, salted SHA-256 hashes, the built-in SHA-256, explanations locked with the right answer). The page itself
borrows the rest of the Pet World note-sheet engine (`scripts/notes/engine/notes.js` there): the wait after a miss,
"what were you thinking" after two misses, My notes, merging backups and save codes, the teacher copy's F2 and Reset.
Nothing Pet World specific (pets, coins, Khan, PINs) is used.

Check: `checks/lesson.mjs` (run by `npm run check` on every sample with a lesson, and on broken copies of
`samples/_cap-lesson`). Capability fixtures: `samples/_cap-lesson/` (grade 6 science, density) and
`samples/_cap-lesson-ap/` (AP Statistics, the sampling distribution of p̂, with a bell ringer).

## In the pack

```jsonc
{ "item": "lesson", "kind": "lesson", "title": "Density: Sink or Float",
  "lessonId": "density-1",                  // S2: set once, never changed (the storage key and the hashes use it)
  "build": { "n": 2, "note": "Added the optional density tower lab" },   // D1: the "Build N (what changed)" line
  "locking": false,                         // L8: true only when the teacher asked for locking in this order
  "ap": false,                              // A1: true adds the bell ringer rules
  "seed": 1234,                             // optional; Q2: the build searches from here (default: from the order and lesson id)
  "blanksInventory": [                      // L6: every blank on the teacher's source worksheet
    { "id": "i1", "source": "Density Notes, #1", "text": "Density is the amount of ______ in a given volume.", "answer": "mass" } ],
  "teacherQuestion": { "code": "FLOAT-42", "question": "…", "look": ["…"] },   // T1: stored only as ciphertext
  "teacherNotes": ["…"],                    // T4 and anything else for the teacher copy and the content PDF
  "pages": [ … ] }                          // in order: bell (AP) → hook → lab… → rule → check… ; My notes is added last
```

A page: `{ id, part, title, minutes, optional?, story?, intro?, figure?, widget?, sentences?, blanks?, keyIdeas?,
questions?, frq?, after? }`.

| `part` | What | Rules |
|---|---|---|
| `bell` | AP bell ringer (first, about 10 min): `questions` (3–5 `mc`) and `frq` | A1–A4; only with `ap: true` |
| `hook` | a story or contest (`story`), usually a `predict-then-reveal` | L1, L4 |
| `lab` | one mechanic (`widget`) and any questions about it; an off-the-board lab uses `hands-on` | L3, L5 |
| `rule` | the rule card: fill-in `sentences` with `blanks` and `keyIdeas`; opens after the required labs above it (`after`, default all of them) | L6, L7; never optional |
| `check` | check questions, a `find-the-mistake`; the page with the two 12-word short answers also gets the teacher-question box | Q1–Q5, T1, T2 |

`minutes` on every page; `optional: true` marks a page that never blocks finishing (and never blocks the rule card).
The build fails unless the required minutes (bell ringer included) are 35 to 45 (L2).

Questions use the usual fields (`id`, `type`, `prompt`, `choices`, `answer`, `accept`, `why`, `level`, `skill`,
`unit`, `figure`), so `checks/keys.mjs` and Wilco's `checks/test-wise.mjs` read a lesson's pages like sections. Types:
`mc`, `numeric`, `short`, `open`. Every auto-checked question needs `hint`, `why` (shown after a right answer) and `miss`
(for `mc`, one `{answer: index, why}` per wrong choice; for typed answers, predictable wrong answers, with `wrong` as the
fallback message) (Q1). Typed answers may set `round` (decimal places also accepted: `[2, 3]`; the default accepts 2
and 3 places for a value that doesn't end, like 1/3) and `tol` (`{places, within}`), and `calc` (an expression the
build evaluates and compares with the key: K1). `open` needs `answer` (the model) and `look` (look-fors), for the
teacher only (Q5); `minWords` (default 12). `inv` on a blank or a question names the inventory blank it covers (L6).

Blanks: `sentences: ["Density = mass ÷ {r-vol}"]` and `blanks: [{ id: "r-vol", answer, accept, hint, why, miss, inv,
type? }]` (`type: "numeric"` for a number blank).

### The mechanics (`widget.mechanic`, L3)

Each lab has one; the page exposes it as `data-mechanic` (and `pages[].mechanic` in `window.PPL_DATA`). The build fails
with fewer than 3 different mechanics in a lesson or the same one on two pages in a row.

| Mechanic | Data | Done when |
|---|---|---|
| `simulate` | `vars` (sliders: `id, label, min, max, step, value`), `outputs` (`label, expr, places`), `verdicts` (`when, text`; `out1`… are the outputs), `runs`, `button`, `repeat` (a "Run N at once" button). Expressions may use `rand()`, `randint(a, b)`, `uniform(a, b)`, `binom(n, p)`, `round`, `sqrt`, `min`, `max`, `abs`; a random output draws a dot plot | `runs` runs recorded |
| `predict-then-reveal` | `options`, `reveal` (text), `revealFigure` | revealed (any prediction counts) |
| `sort` | `bins` (`id, label`), `cards` (`id, text, bin, why, miss`), `hint`, `why` | every card in its bin |
| `build` | `tiles`, `slots`, `answer` (one sequence or a list of them), `miss` (`{answer: [...], why}`), `wrong`, `hint`, `why` | right |
| `find-the-mistake` | `steps`, `answer` (the wrong step's index), `miss` (`{"0": why it's fine, …}` for every other step), `hint`, `why` | right |
| `slider-hunt` | `slider` (`label, min, max, step, value, unit`), `readout` (`label, expr` in `x`, `places`), `answer`, `tol`, `wrong`, `hint`, `why` | right |
| `hands-on` (off the board, L5) | `materials`, `steps`, `fields` (`id, label, unit, sim`: the "Simulate it for me" value, an expression that may use earlier fields), `calc` (live results), `simNote` | every field has a number |

Checked mechanics (sort, build, find-the-mistake, slider hunt) are hashed like answers and follow the same miss flow.

## What students get

- **Navigation**: a sidebar (a "☰ Pages" button on phones) with every page, its minutes, "optional", ✓ when done and 🔒
  on a rule card that isn't open yet; My notes is last. Links are `href="#/<page id>"` with a document-level click
  handler (D2), so they work inside viewers and sandboxed frames. The theme follows the device ("◐" switches it).
- **Questions**: choices appear in the seeded order (Q2); Check; a miss marks the choice ✗ for good (even after a
  reload), shows why that choice is wrong, and starts a wait (5 s, 10 s, 15 s, then 20 s). After two misses she writes
  one sentence on what she was thinking before Check works again; then the hint opens (it can also be opened any time
  with 💡). A right answer shows the explanation. Typed answers take equivalent forms (Q4: `0.125`, `.125`, `1/8`,
  `12.5%`, "one eighth", plurals, capitals, `g/cm³` or "grams per cubic centimeter", `÷` or "divided by", and the
  item's rounding).
- **Teacher question** (T1, T2): after the two short answers, a code box. The right code shows the question (AES-GCM
  with crypto.subtle, a SHA-256 stream fallback without it); it never marks anything done: she still writes the answer.
- **My notes** (N1): right answers with their explanations, filled blanks, key ideas, predictions and results, short
  answers, the FRQ, the teacher question and her answer, her own notes, "Where I got stuck" (every wrong try, with what
  she was thinking and whether she got it later), and a "More notes" box. Never hints, model answers or look-fors.
  Every entry is built from the save's own copy of the text (S4). Print shows a Name/Date line and hides the sidebar and
  buttons (N4).
- **Own notes** (N2, N3): a collapsible box on every page and a "✎ Note" button in the top bar.
- **Saving** (S1, S3): autosave and autoload, "Saved automatically at …", a backup file, a save code (deflate when the
  browser can: `PPL1.`, else `PPL0.`), and restore from either. Loading merges (right answers win, longer writing
  wins, different notes are kept side by side) and never clears. When a saved right answer no longer checks (a new
  build changed it), it reopens with "This changed since you answered it". A blocked-storage banner when the browser
  won't save; checking still works.
- **Footer** on every page: "Build N (what changed)" (D1), the AI notice and "saved only on this device".

## Ids and storage (S2)

- Storage key: `pp-lesson:<order id>:<lessonId>:v1`, fixed forever (the theme: `pp-app-theme`).
- Ids (`lessonId`, pages, questions, blanks, widgets, sort cards, inventory blanks, FRQs): lowercase letters, digits
  and dashes, starting with a letter, unique in the lesson. Never reuse an id for something else, never rename one, never
  delete one; add new ones. Choices are saved by their **original** option number (Q2e), so reordering on screen never
  breaks a save; don't reorder a question's `choices` once students have it (add a new question instead).
- `<order folder>/ids.lock.json`: `{ "<lessonId>": { "storageKey", "ids": { "<id>": "<what>" } } }`. The renderer adds
  new ids; it fails (and so does `checks/lesson.mjs`) when an id in the lock is gone or changed what it is, or the
  storage key changed.

## Old saves (S5)

Keep a backup file from each delivered build in `<order folder>/saves/<lessonId>-build-<n>.json` (the student page's
"Download backup file"). Every render and `checks/lesson.mjs` load each one into a fresh browser and fail unless every
answer it had right still shows as right and its notes and short answers are on My notes. `npm run check` proves it
bites by changing a key under the fixture's Build 1 save.

## Teacher copy, board (C1–C3, T2, Q5, A3, A4)

- `<doc>-TEACHER-COPY.html` is made by `teacherCopyHtml()` from the student file: the same file with a teacher block
  added before the data and "TEACHER COPY" in the title (C1; `checks/lesson.mjs` checks that removing the block gives
  back the student file byte for byte). F2 switches Show ANSWERS / Show BLANK (no letter key does; C2). In ANSWERS the
  right option is highlighted by its original number, typed answers and blanks are filled, each widget shows its
  solution, and every item shows its answer, why, hint, model answer and look-fors, the FRQ guide, model and typical
  errors, CED codes, and the teacher question with its code. It never saves; everything is disabled except "Reset
  lesson" (two clicks: erases this lesson's saved work on that device) (C3).
- `TEACHER-BOARD.html`: one per pack, every lesson's code, question and look-fors, blurred until "Show" (to project).
- Model answers, look-fors, FRQ guides and CED codes are never in the student file; the build fails if any
  teacher-only text (or the question or its code) shows up there.

## AP (`ap: true`)

A `bell` page first: 3–5 `mc` (A1) whose choices are about the same length (the build fails above 1.5× between the
longest and shortest: A2) and an `frq` (`{ id, prompt, parts, guide, model, errors, ced }`, A3). `ced` codes on
questions and the FRQ appear only in the teacher copy and the content PDF, marked "not checked against the CED yet"
(A4). The bell ringer's minutes count toward L2's 35–45.

## Build rules (the renderer refuses, with the rule id)

L1 page order · L2 required minutes 35–45 · L3 3+ mechanics, none twice in a row · L4 a hook story · L5 materials, a
result entry, a simulate value per field · L6 every inventory blank covered (the coverage map is in the content PDF) ·
L7 the rule card opens after required labs above it · L8 no locking unless `locking: true` · Q1 hint, why, a message
per wrong choice · Q2 a seed (searched from the lesson's seed) for which the order students see has no run of 3, no
repeated cycle of 2–4 (also inside each option count), no slot over its share (rounded up), and two-option keys
first about half the time · Q3a the key strictly longest or strictly shortest in at most 30% of choice items · Q3b
never the only "because" choice or the only one without · Q3c warnings (hedges, a lone exact number, "all/none of the
above", reused wrong choices, tiny choices) · Q5 models and look-fors · T1 two 12-word short answers and a teacher
question with a 4+ character code · A1–A3 · D1 the build line · S2 the id lock · K1 `calc` recomputes keys · no
teacher-only text in the student file. Q4 is tested by `checks/lesson.mjs` (every accepted form, upper case, spaces,
fraction, percent and plural variants); Q6, L4's reframed checkpoint, K2 and K3 are for the reviewers.

## Files

Preview (watermarked): `<doc>-content.pdf` (the review packet: every page, answer, accepted form, hint, wrong-answer
message, model answer and look-fors, widget solutions, the teacher question and code, the multiple-choice audit with
the seed and the slots students see, Q3c warnings, the blanks inventory and its coverage, teacher notes) and
`<doc>-screens.pdf` (375 px, 1280 px and dark). Final adds `<doc>.html`, `<doc>-TEACHER-COPY.html` and
`TEACHER-BOARD.html`.

## The check (`checks/lesson.mjs`)

Content: the build's rules; every accepted form and its variants marked right with the why unlocked; every listed
wrong answer caught; sort, build, mistake and slider answers judged right and only right; the SHA-256 fallback; the
teacher question opens with its code only; the order students see recomputed; C1. Browser (K1), at 375 and 1280 px
with outside requests blocked: plays the whole lesson as a student (wrong picks, the waits, the sentence, the hint,
every mechanic, equivalent forms), the rule card locked then open (L7), finished without the optional page (L2), no
sideways scroll, reload (S1, T3), the code box (T2), My notes (N1, N2, N3), print (N4), backup file and save code into a
fresh browser that already has a note (S1, S3), blocked storage with no crypto.subtle, a sandboxed `srcdoc` frame (D2),
old saves (S5), and the teacher copy (C2, C3). `--shots <dir>` saves screenshots; `--no-browser` checks content only.

## Not done yet

- Read-aloud, and a teacher view of a student's progress (it lives only on her device; she prints My notes or sends a
  backup file).
- Q3c's "silly distractor" is only a length warning; reviewers judge silliness. Q6 (student voice) is a review rule.
- The order page has no spec fields for `lesson` yet (defaults: 1 lesson, about 12 checked questions;
  `feasibility.json`). Pricing (`docs/PRICING.md`) is a guess until the first orders.
- The agents' briefs (`agents/maker.md`, the blind testers, Wilco) don't mention lessons yet: the auditor adds them.
