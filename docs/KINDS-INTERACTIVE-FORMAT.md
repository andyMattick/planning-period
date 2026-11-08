# The interactive format: any question document as a page students answer on a device

**Owner, Nov 8, 2026:** "When I select something I want to make, I want to have the option of creating an interactive
[page] OR pdf/word etc. If interactive, I want the option to grade it automatically when I'm done OR print out the
results for someone else to grade later."

This is a **format**, not a new menu item: a worksheet, homework, quiz, test, reading quiz, study guide or "versions"
order can be made printable (PDF and Word, as always) or interactive. The interactive worksheet and review app items
(docs/KINDS-APPS.md) are separate products that check answers as students go; this format is the same questions as the
paper copy, answered on a device and handed in.

Code: `scripts/render/interactive-format.mjs` (the build, called by `scripts/render-pack.mjs`) and
`scripts/render/interactive-format/` (`page.js` the student page, `page.css`, `forms.js` the answer forms). It reuses
the apps' engine (`scripts/render/apps/engine.js`: storage that never throws, SHA-256 with a built-in fallback, the
forgiving number reader) and the apps' salted hashes. `forms.js` is ported from the unmerged lesson engine on the
`istd-build` branch (percent forms, `round` and `tol`, words with plurals and units), trimmed to the answer forms.
Checks: `checks/interactive-format.mjs`. Fixtures: `samples/_cap-interactive/auto` and `…/print` (the g8-science quiz).

## On the order page

Every menu item with `"interactive": true` (`menu.json`) shows, under step 4's details for that item:

- **Format:** Printable (PDF and Word, student and teacher copies) or Interactive (a page students open and answer on any
  device, one offline file, no accounts; plus the teacher copy with the key).
- **Grading** (Interactive only): "Grade automatically when the student finishes" (the default) or "Print the results to
  grade later".

The order stores `itemSpecs.<item>.format` (`"printable"` or `"interactive"`) and `.grading` (`"auto"` or `"print"`);
each line in `lines` carries a `format` text, shown in the summary and the token total ("interactive, graded
automatically · same price as printable"). **Same tokens:** see docs/PRICING.md, "Interactive format". Slides, rubrics,
games, guided notes and unit packs stay printable. The onboarding agent (v10, step 5b) says it in "what we will make"
and warns in two cases: an auto-graded order that is mostly short or written answers, and auto grading on a test.

## In the pack

```jsonc
{ "item": "quiz", "title": "Chemical Reactions Quiz", "versions": ["A", "B"],
  "format": "interactive",          // missing or "printable": the usual PDF and Word copies
  "grading": "auto",                // "auto" | "print" (required when interactive)
  "sections": [ … the usual questions … ] }
```

- Kinds: `worksheet`, `homework`, `quiz`, `test`, `readingquiz`, `studyguide` (a `versions` order's documents are quiz or
  test). Types: `mc`, `tf`, `numeric`, `short`, `open`, `match`. Every question needs an `id` that never changes (it
  keys the student's saved answers).
- Optional question fields read only by the page: `tol: {"within": 0.1, "places": 1}` (any value within 0.1, typed to
  1 decimal place; at most 401 accepted values), `round: 2` (or `[2, 3]`: the key rounded to those places is right too;
  a repeating decimal accepts 2 and 3 places by default), `hint` and `miss` (`[{answer, why}]`) for the results page,
  `points` (the answer sheet's "Points: __ / n", default 1).
- Passages, figures (inline SVG, cleaned), `$…$` math (KaTeX, rendered at build time with its fonts inlined) and a
  document's `rubric` show on the page as they print.
- `checks/keys.mjs` validates `format`, `grading`, kind and types; every other check (test-wise, cross-item,
  no-passage, math, the blind tester's `student-view.mjs`) reads the questions as it always has.

## What the renderer makes

| Preview (`out-preview/`) | Final (`out/`) |
|---|---|
| `<doc>-interactive[-A].html` per version, with a visible "PREVIEW — not approved for use" mark and banner | the same pages, no mark |
| `<doc>-teacher[-A].pdf` (the key, with a box "About the interactive page") | the same, plus `<doc>-teacher[-A].docx` |
| `REVIEW.html` lists the pages with their SHA-256 next to the PDFs | `HOW-TO-SHARE-THE-INTERACTIVE-PAGES.txt`; `README.txt` explains each page |

No student PDF or Word is made for an interactive document (the owner's "OR"). **Approval covers the pages:** the
review's `documents` list holds every preview PDF and page with its SHA-256; `render-pack.mjs --final` refuses when a
preview page changed after the teacher saw it, like a PDF (`reviewedFile` in `render-pack.mjs`). Online, `orders.mjs
preview` uploads the pages (as `text/plain`), and My orders shows each one with **Try it here** (a sandboxed frame:
its scripts run, but it can't reach the site, its storage or the network) and **Download**; Approve hashes them like the
PDFs.

## The student page

One HTML file: CSS, scripts, data, math fonts and figures inline. A Content-Security-Policy in the page forbids every
request (`default-src 'none'`, `connect-src 'none'`, `form-action 'none'`); no CDN, trackers or outside fonts. It works
opened from a download (`file://`), any static host, or pasted into a Claude artifact. English unless the pack sets
`lang`.

1. A name box (required to finish) and the date; the directions; every passage, section and question in the pack's
   order. Multiple choice as radio buttons (in the pack's order, so the letters match the teacher copy), true/false,
   a text box for numbers and short answers (with the unit), a larger box for written answers, a menu per item for
   matching.
2. Answers save in this browser as they are typed (`localStorage` key `pp-int:<order id>:<file>:v1`; a line says when;
   with storage blocked a warning says to finish in one go). A reload picks up where she left off.
3. **Finish** (a second press finishes with blanks; the first says which are blank).
   - **grading "auto":** the score of the objective items (multiple choice, true/false, numbers, matching; a match is
     a point split over its pairs), each question marked ✓ Right, ✗ Not right, ◐ Partly right or ✎ Needs your teacher
     (short and written answers: never scored here), her answer, the explanation for each right answer, and for a wrong
     one the pack's `miss` message or `hint` if it has one. **Print my results.**
   - **grading "print":** no score, no right or wrong. An answer sheet: name, date, assignment and version, every
     question with her answer, "Points: __ / 1" and "Grader notes" under each, a total line and "Graded by". **Print**,
     **Save as PDF** (the browser's print, with a tip to pick Save as PDF), **Change my answers**.
4. **Start over for a new student** (two taps) clears the device for the next student.

Accessibility: native controls with labels, every question a labelled group, results announced, focus moved to the
results, AA contrast in light and dark (follows the device), 44 px targets, no sideways scroll from 320 px, print CSS
(buttons hidden; the results or the sheet print on their own; Name and Date on the sheet).

## How the keys are protected, and the limits

- **"print":** the file holds **no key and no hash at all**; the answer checker isn't even included. The teacher copy is
  the key.
- **"auto":** each accepted form is normalized (a choice `opt:2`, `tf:true`, a number as an exact reduced fraction
  `n:17/1`, a percent also as its fraction, the `tol`/`round` values) and stored as
  `SHA-256("PPA1|<salt>|<question id>|<form>")`, the salt made from the order id and the file name. The explanation is
  XOR-locked with a SHA-256 keystream of the right form, so it opens only for a right answer. No answer, accepted form
  or explanation is in the file as text. The page normalizes what she typed the same way and compares hashes (Web
  Crypto, or the built-in SHA-256 on a `file://` page that has none).
- **The limit, said plainly in the teacher copy, README and share notes:** this stops casual peeking (view source, the
  browser's tools), not a determined student with programming skills. A multiple-choice question has only 2–6 hashes to
  try, true/false 2, and a small whole-number answer can be found by trying numbers; she could also reopen a fresh copy
  and try again. It is a practice and low-stakes safeguard, not test security: for a graded test, use "print the
  results" or paper.

## Checks (`checks/interactive-format.mjs`)

Fast, in `npm run check` (every sample with an interactive document, the fixtures in both modes, and `--self-test`,
whose 14 broken copies must fail):

- the pack fields (format, grading, kind, types, `tol`), every typed key readable as a number, no `miss` that is a
  right answer;
- **self-contained:** no outside URL in src/href/action/url(), no srcset, fetch, XMLHttpRequest, WebSocket, EventSource,
  sendBeacon, import(), link, iframe, object/embed, base, form action, window.open or navigation, and the CSP is there;
- **print:** no 64-hex string, no salt, no acc/pairs/miss/x/hint, no checker code, no explanation or hidden key text;
- **auto:** no explanation or accepted form in the file as text unless the student can already see it; every objective
  item's hashes verify against the pack's key through the page's own reader run in Node (every accepted form right with
  its explanation unlocked, every other choice and a far-off number wrong, each matching pair);
- rendered pages next to the pack (`out-preview/`, `out/`) get the same checks and must equal a fresh build.

Browser (`--browser`, and `npm run test:interactive`; Chromium from Playwright): opened from a file with every outside
request blocked and counted: no page error, no outside request, no sideways scroll at 375 px; a reload keeps the name
and answers; auto: every item right (numbers typed in another equivalent form, e.g. `17` for `17.0`) → 100%, every item
wrong on a fresh device → 0%; print: the sheet with her name and every answer and no score, buttons hidden in print; at
1280 px with storage blocked the warning shows and Finish still works. `test:interactive` also renders the fixtures'
preview and final (the approval covers the pages; a changed page is refused) and runs every question type
(samples/_fixture made interactive). `npm run test:orders` covers the order page's choices and the online review.

## The interactive standard (docs/INTERACTIVE-STANDARD.md): what applies to a format page

The standard was written for interactive lessons and notes. A format page is a worksheet, quiz or test on screen, so:

| Rule | Here |
|---|---|
| L1–L8 (lesson design), N1–N3, T1–T3, A1–A4 | Not applicable: no lesson, notes page or teacher question. A lesson is its own product |
| Q1 hint, wrong-answer message, explanation after right | auto: the explanation after a right answer; `miss` and `hint` on the results page when the pack has them (optional: a quiz checks, it doesn't coach mid-way). print: none, by design |
| Q2 shuffled at display | Kept in the pack's order so the letters match the teacher copy and a printed sheet; Wilco's position bots already check the order (Q2a–d). Q2e: saved answers keep the original option numbers |
| Q3 length cues | Wilco's test-wise bots, as for paper |
| Q4 equivalent typed forms | auto: fractions, decimals, leading dots, percents, mixed numbers, number words (math and science), units, `round` and `tol`; checked in the browser |
| Q5 model answers teacher-only | Model answers, `look` and keys are only in the teacher copy (checked) |
| N4 print layout | Buttons hidden; name and date on the sheet and the results |
| S1–S3 saving | Autosave, autoload, a "Saved on this device at…" line; fixed storage keys and ids; loading merges over defaults. No backup file or save code yet |
| C1–C3 teacher copy | The teacher copy is the PDF and Word key, generated by script from the same pack |
| K1 QA gate | `checks/interactive-format.mjs` (fast and `--browser`) |
| D1 build line | "Build <pack hash> · <order id> · version" at the foot of every page |
| T4 pacing, not tamper-proof | Said plainly (keys section above) |

## Not done yet

- Ordering questions (the pack format has no ordering type yet).
- No backup file or save code, and no teacher view of a class's results (each result lives on one device; the student
  prints it or saves it as a PDF).
- The Word teacher copy has no "About the interactive page" box (the PDF and README.txt do).
