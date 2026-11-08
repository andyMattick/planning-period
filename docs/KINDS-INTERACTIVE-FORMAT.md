# The interactive format: any question document as a page students answer on a device

**Owner, Nov 8, 2026:** "When I select something I want to make, I want to have the option of creating an interactive
[page] OR pdf/word etc. If interactive, I want the option to grade it automatically when I'm done OR print out the
results for someone else to grade later."

**Owner, Nov 8, 2026 (later):** "I want it for guided notes and review." So guided notes (`notes`) and the review game
(`reviewgame`) can be interactive too: see "Guided notes" and "Review game" below.

This is a **format**, not a new menu item: a worksheet, homework, quiz, test, reading quiz, study guide, guided notes,
review game or "versions" order can be made printable (PDF and Word, as always) or interactive. The interactive worksheet and review app items
(docs/KINDS-APPS.md) are separate products that check answers as students go; this format is the same questions as the
paper copy, answered on a device and handed in.

Code: `scripts/render/interactive-format.mjs` (the build, called by `scripts/render-pack.mjs`) and
`scripts/render/interactive-format/` (`page.js` the student page, `page.css`, `forms.js` the answer forms; `notes.js`
and `game.js` the guided-notes and review-game screens, inlined only in those pages). It reuses
the apps' engine (`scripts/render/apps/engine.js`: storage that never throws, SHA-256 with a built-in fallback, the
forgiving number reader) and the apps' salted hashes. `forms.js` is ported from the unmerged lesson engine on the
`istd-build` branch (percent forms, `round` and `tol`, words with plurals and units), trimmed to the answer forms.
Checks: `checks/interactive-format.mjs`. Fixtures: `samples/_cap-interactive/auto` and `…/print` (the g8-science quiz),
`…/notes` (the g8-science guided notes) and `…/reviewgame` (a review game made from the g8-science quiz's questions, plus
four short made-up cards); the checks build each in both grading modes.

## On the order page

Every menu item with `"interactive": true` (`menu.json`) shows, under step 4's details for that item:

- **Format:** Printable (PDF and Word, student and teacher copies) or Interactive (a page students open and answer on any
  device, one offline file, no accounts; plus the teacher copy with the key).
- **Grading** (Interactive only): "Grade automatically when the student finishes" (the default) or "Print the results to
  grade later".

The order stores `itemSpecs.<item>.format` (`"printable"` or `"interactive"`) and `.grading` (`"auto"` or `"print"`);
each line in `lines` carries a `format` text, shown in the summary and the token total ("interactive, graded
automatically · same price as printable"). **Same tokens:** see docs/PRICING.md, "Interactive format". Guided notes
and the review game word the two choices for what students do ("fill in the blanks… print their notes"; "played on a
device… or as a class on a projector"; Checking: "Check the blanks automatically" or "Print the notes to check later")
and their summary lines say "blanks checked automatically", "notes printed to check later", "scored automatically" or
"answers printed to grade later". Slides, rubrics, quiz-show and puzzle games and unit packs stay printable. The onboarding agent (v10, step 5b) says it in "what we will make"
and warns in two cases: an auto-graded order that is mostly short or written answers, and auto grading on a test.

## In the pack

```jsonc
{ "item": "quiz", "title": "Chemical Reactions Quiz", "versions": ["A", "B"],
  "format": "interactive",          // missing or "printable": the usual PDF and Word copies
  "grading": "auto",                // "auto" | "print" (required when interactive)
  "sections": [ … the usual questions … ] }
```

- Kinds: `worksheet`, `homework`, `quiz`, `test`, `readingquiz`, `studyguide`, `notes`, `reviewgame` (a `versions`
  order's documents are quiz or test). Types: `mc`, `tf`, `numeric`, `short`, `open`, `match`. Every question needs an `id` that never changes (it
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

### Navigation, shared data, parts, graphs (owner, Nov 8, 2026)

- **Question navigation** (worksheets, quizzes, tests…; not notes or the review game): a bar under the name box with
  **Previous**, a numbered button per question and **Next**; it stays at the top while she scrolls (the numbers scroll
  sideways inside the bar on a phone, never the page). Each button is a real button (Tab, Enter), says "Question 3,
  answered" or "not answered yet" to a screen reader and shows ✓ and a filled border when answered (never colour
  alone); the question she is on is outlined (`aria-current`). A jump scrolls to the question and moves focus to it.
- **Finish with blanks:** the first press lists the unanswered questions as buttons that jump to each, and says "You can
  still print your answer sheet: press Finish again" ("finish" when graded in the page); the second press finishes.
- **Shared data sets** show in a box at the top of each question that uses them (docs/PACK-FORMAT.md).
- **Multi-part answers:** a box per part, labelled (a), (b)…; the answer sheet lists each part's answer with "Part (a)
  points: __ / n". Never scored by the page.
- **Graphs** drawn from data (a segmented bar graph, a scatter plot) have a `<title>` and `<desc>`, and a folded
  "Data table" under them with the numbers, for screen readers and anyone who wants them.

### One version per student (owner, Nov 8, 2026)

Only for a quiz or test made interactive and **printed for grading** (the page holds no keys). One page,
`<doc>-interactive.html`, holds every pool version's questions (docs/PACK-FORMAT.md, "Versions"). The student types her
name and presses **Get my questions**: her name picks her version (the same name gives the same version on any device),
its 5-letter **version code** shows at the top and on her answer sheet, and a reload keeps it. "Start over for a new
student" clears it. The teacher grades with the code: `<doc>-all-versions-key.pdf`, or `<doc>-teacher-key.html` (final
files only; for the teacher; type the code, or the name, to see that version's key; one offline file with the same
Content-Security-Policy). Not a hidden key behind a keystroke in the student page: there is no key in it at all.

Checks: `checks/interactive-format.mjs` fails a pool page holding any answer, why, accept, checklist, math check or hash,
or any version's key as text; `--browser` types three made-up names, checks each gets the version its name gives (worked
out in Node), answers it, and finds the code on the sheet. `scripts/test-interactive.mjs` greps the rendered student
page for every version's keys and opens the teacher key page: a code and a name each give the right version's key.

## Guided notes (`notes`)

The page is the notes, not a quiz: a name box and the date, the directions, then each section's heading and its word
bank (a section `directions` that starts "Word bank:" shows in a dashed box), and every line of the notes in order.

- **Blanks.** A `short` or `numeric` item whose prompt has runs of 3 or more underscores (`______`) is a line of the
  notes: the text with a typed box for each run (Enter moves to the next blank). Its `answer` and every `accept` entry
  name the blanks in order, separated by `;` (`,`, `/` and "and" also split): `"created; destroyed"`, and
  `"destroyed; created"` when either order is fine. Every other item (a stop-and-think `open`, a check question in
  `mc`, `tf`, `match` or `numeric`) shows as a question box with its figure, so tables and diagrams stay inline.
- **"auto": Check my notes.** Each blank is checked against its own salted hashes (`SHA-256("PPA1|<salt>|<id>.<i>|<form>")`),
  and the line against the hashes of every accepted combination (`fill:<form>|<form>`), so an "either order" pair stays
  paired: two words that each fit but don't go together are both marked ✗ with "not together like this". Forms are
  forgiving the same way as everywhere (`forms.js`: capitals, spaces, punctuation, plurals, a leading a/an/the, number
  words and digits in math and science). A blank shows ✓ or ✗; a right line shows its `why` (locked with the right
  combination); a changed line loses its marks until the next check. The score counts each blank and each scored
  question as a point ("12 of 34 blanks and checks right (35%)"); stop-and-think answers are "for your teacher". When
  every blank is right the page shows **the completed notes** ("Every blank is right"). **Print my notes** (any time)
  shows the filled-in notes (her answers underlined, ✓/✗, the explanations she unlocked) with her name and the date,
  and opens the print window.
- **"print": Finish.** No answer data in the file (no salt, hashes or checker). Finish (name required; a second press
  finishes with blanks) shows her filled-in notes with her name, the date, "Checked by" and "Score" lines, and opens
  the print window; **Save as PDF**, **Back to my notes**.
- Saved like every page (S1–S3); "Start over for a new student" clears it.

## Review game (`reviewgame`)

The printed review game is numbered question cards (with a level) and projector slides, so the page plays the same
cards one at a time; each section is a **category** (its `heading`), and a card is worth its `points`, else its
`level`, else 1. (The quiz-show board is its own item, `quizshow`, docs/KINDS-GAMES.md, and stays printable.)

- **Alone, "auto".** A start screen (name, the number of cards, the categories, the points to win), then one card at a
  time: category, points, "Card 3 of 16", the card's question and answer box, and **Check**. A right first try earns the
  card's points, a right second try half (a matching card: its share of pairs); a wrong first try says "Try once more"
  with the `miss` message or `hint` if there is one; after the second the card's points are lost and the page says the
  teacher can go over it. A right answer shows its `why`. Answers of a few words (every accepted form 4 words or fewer)
  are checked like notes blanks; longer `short` and `open` answers are saved for the teacher and not scored. The end is
  the results page (score in points and percent, every card with its result) with **Print my results**, **Play again**
  and **Start over for a new student**. A reload picks up at the same card.
- **Alone, "print".** No answers in the file: **Save and next** (and **Back**) through the cards, then an answer sheet
  (name, date, every card with its category, points, her answer, "Points: __ / n" and grader notes, a total line), to
  print or save as a PDF.
- **As a class ("Play as a class").** For a projector: pick 2 to 6 teams; a scoreboard; the card in large print
  (choices listed, no answer boxes); give the card's points to a team (a second tap takes them back) or "No points";
  Next, Back; final scores with the winner and **Print the scores**. In an "auto" page **Reveal answer** shows the
  answer and why once the teacher types the **class code**, a 6-character code printed only on the teacher copy (and
  in the README). Each card's answer and why are locked with it (`lock(salt, id, "reveal:<code>")`) and the page
  holds only a salted hash of the code to say "that code doesn't match"; the code is made from the whole pack, so the
  page (which shows only the first 8 hex digits of the pack's hash) can't rebuild it, and it is kept in memory, never
  saved. A "print" page has no reveal: the teacher reads the answers from the teacher copy.
- An interactive review game is the page and the teacher copy (PDF, plus Word in the final): **no slides or printed
  cards** (the owner's "OR"; the class mode is the projector version).

## How the keys are protected, and the limits

- **"print":** the file holds **no key and no hash at all**; the answer checker isn't even included. The teacher copy is
  the key.
- **Notes and games, "auto":** the same scheme per blank and per card; the class code adds a second lock on each card's
  answer, so a student who doesn't have the teacher copy can't open it (short of trying every code: about a billion,
  which a programmer could do; the same limit as below).
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
whose 23 broken copies must fail):

- the pack fields (format, grading, kind, types, `tol`), every typed key readable as a number, no `miss` that is a
  right answer;
- **self-contained:** no outside URL in src/href/action/url(), no srcset, fetch, XMLHttpRequest, WebSocket, EventSource,
  sendBeacon, import(), link, iframe, object/embed, base, form action, window.open or navigation, and the CSP is there;
- **print:** no 64-hex string, no salt, no acc/pairs/miss/x/hint, no checker code, no explanation or hidden key text;
- **auto:** no explanation or accepted form in the file as text unless the student can already see it; every objective
  item's hashes verify against the pack's key through the page's own reader run in Node (every accepted form right with
  its explanation unlocked, every other choice and a far-off number wrong, each matching pair);
- guided notes: every blank has its hashes; every accepted form, blank by blank (and in capitals with extra spaces), is
  marked right by the line's combination hash and by each blank's own hashes and opens the why; a made-up word is
  wrong; an accepted form that doesn't name the line's blanks fails the build;
- review games: short-word cards verify like number answers (a made-up word is wrong); the class code from the pack
  matches the page's code check and opens every card's answer and why, and a wrong code opens none; a print page has
  no code check and no reveal locks;
- the scripts every page shares (engine, forms, page, notes, game) are left out of the plain-text search only when
  byte-identical to the repo's files (a key word such as "greater" in the code is not a leak);
- rendered pages next to the pack (`out-preview/`, `out/`) get the same checks and must equal a fresh build.

Browser (`--browser`, and `npm run test:interactive`; Chromium from Playwright): opened from a file with every outside
request blocked and counted: no page error, no outside request, no sideways scroll at 375 px; a reload keeps the name
and answers; auto: every item right (numbers typed in another equivalent form, e.g. `17` for `17.0`) → 100%, every item
wrong on a fresh device → 0%; print: the sheet with her name and every answer and no score, buttons hidden in print; at
1280 px with storage blocked the warning shows and Finish still works. Guided notes: every blank box is there; all
right → Check → the completed notes at 100%; all wrong → 0% with a ✗ on every blank; half fixed → a mix; all fixed →
100%; "Print my notes" and print-mode Finish open the print window (counted, no dialog) with the name and every line
and, in print mode, no score or marks. Review game: alone, every card right (with a reload in the middle) → 100%, every
card wrong twice → 0%, the answer sheet in print mode; class mode at 1280 px with 3 teams, a wrong class code refused,
Reveal answer showing the key (auto) or no reveal (print), points to a team and the winner named. `test:interactive` also renders the fixtures'
preview and final (the approval covers the pages; a changed page is refused) and runs every question type
(samples/_fixture made interactive), and the notes and review-game fixtures in both modes (the class code is on the
teacher copy and in the README, and in no page). `npm run test:orders` covers the order page's choices (guided notes
and the review game too) and the online review.

## The interactive standard (docs/INTERACTIVE-STANDARD.md): what applies to a format page

The standard was written for interactive lessons and notes. A format page is a worksheet, quiz or test on screen, so:

| Rule | Here |
|---|---|
| L1–L8 (lesson design), N1–N3, T1–T3, A1–A4 | Not applicable: no lesson, notes page or teacher question. A lesson is its own product. Guided notes: L6 (every blank of the notes is a fill-in) holds by construction; the filled-in notes are the printable notes page (N1's spirit), with no own-notes box (N2, N3) yet |
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
- Guided notes: no own-notes box or "where I got stuck" list (N2, N3); a blank's width doesn't follow the printed blank.
- Review game: no quiz-show board here (that is `quizshow`, printable); team names are "Team 1…6" (not editable); the
  class game and a student's game share the device's saved work for that page.
- No backup file or save code, and no teacher view of a class's results (each result lives on one device; the student
  prints it or saves it as a PDF).
- The Word teacher copy has no "About the interactive page" box (the PDF and README.txt do).
