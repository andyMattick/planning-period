# Review apps and interactive worksheets (`reviewapp`, `interactive`)

Two menu items that end up as **one offline HTML file each**: no network requests (a Content-Security-Policy in the
page forbids them), no trackers, no outside fonts, no accounts. The file works opened straight from a download
(`file://`), from Google Drive after downloading, or from any static host. Progress is saved only in the browser on the
student's device (`localStorage`, every read and write in try/catch; a banner says so when the browser blocks it).

Code: `scripts/render/apps.mjs` (build, print pages, screenshots, the renderer hook) and `scripts/render/apps/`
(`engine.js` shared by both apps and run in Node by the build, `interactive.js`, `reviewapp.js`, `app.css`).
Checks: `checks/apps.mjs`. Capability fixture: `samples/_cap-apps/` (a test, not a gallery sample).

The engine is adapted from the owner's Pet World note sheets (`scripts/notes/engine/notes.js` there): the forgiving
number reader (exact fractions, number words, units, `−`), salted SHA-256 hashes of normalized answers, the built-in
SHA-256 for browsers without `crypto.subtle`, the `why` locked with the right answer, the wait after a miss, and
"write what you're thinking" before the hint. Nothing Pet World specific (pets, coins, Khan, PINs) is used.

## In the pack

Both are ordinary documents in `pack.json` (`item` or `kind`). They have **no versions**. Questions use the usual
question fields (`id`, `type`, `prompt`, `choices`, `answer`, `accept`, `why`, `level`, `skill`, `unit`, `figure`), so
`checks/keys.mjs` and `checks/test-wise.mjs` read them like any other document. Types: `mc`, `tf`, `numeric`, `short`,
`open` (interactive only). `match` is not used in apps (the review app has its own match mode).

Extra question fields:

| Field | What |
|---|---|
| `hint` | **Required** on every auto-checked interactive item; optional in review-app practice. Shown after two misses, once the student has written what she's thinking (5+ words). Not secret |
| `miss` | `[{ "answer": …, "why": "…" }]`: predictable wrong answers and what to say (for `mc`, `answer` is the choice index). Stored as hashes; the build fails if one is also a right answer |
| `work` | `true` / `false`: a "Show your work" box. Default: the printed copy's work lines (`space`, or numeric questions when the style says "show work") |
| `minWords` | `open` only: words that count as written (default 10) |
| `look` | `open` only: what a strong answer has, for the solutions page (never in the student file) |

### `interactive`

```jsonc
{ "item": "interactive", "title": "Weather Data Practice", "directions": "…",
  "sections": [ { "heading": "Level 1: …", "questions": [ … ] } ] }
```

The page: a name box, a progress bar ("3 of 10 checked right · 1 of 1 written"), every question with Check, the miss
flow (✗ and a 3 s, 6 s, then 10 s wait; after two misses a "write what you're thinking" box, then the hint; "check the
sign" when a number is right but for its sign), the `why` after a right answer, Print (print styles keep the typed
answers), Start over (two taps), light/dark (follows the device; "Theme" switches it). A saved right answer is checked
again when the page opens: if the pack changed it, the question reopens ("This question changed").

Files: `<doc>-printable.pdf` (the printed copy), `<doc>-solutions.pdf` (every answer, the forms the app accepts, `why`,
hint, wrong-answer messages, model answer and look-fors), `<doc>-screens.pdf` (screenshots), and in the final also
`<doc>.html` (the student file) and `<doc>-solutions.html`.

### `reviewapp`

```jsonc
{ "item": "reviewapp", "title": "Weather Words Review",
  "app": { "modes": ["flashcards", "memorize", "practice", "match"] },      // which modes, in this order (default: all)
  "cards": [ { "id": "c1", "front": "humidity", "back": "The amount of water vapor in the air" } ],
  "passages": [ { "id": "m1", "title": "…", "source": "Author, work (year), public domain", "text": "lines\nseparated\n\nby newlines" } ],
  "pairs": [ { "id": "p1", "term": "…", "def": "…" } ],               // optional: default = cards with backs ≤ 90 characters
  "sections": [ { "heading": "Practice", "questions": [ … ] } ] }      // the Practice mode's questions
```

- **Flashcards:** 10 cards a round, lowest box first; tap to flip; "Know it" moves the card up a box (1–5), "Not yet"
  sends it back to box 1 and brings it back three cards later in the same round. Known = box 3 or more.
- **Memorize** (passages, verses, lists; 250 words at most each): 1 read it, 2 type it with only first letters
  showing, 3 fill in a third of the words, 4 two thirds, 5 type it from memory. Capitals and punctuation never count;
  typed passages are matched word by word in order (a skipped word doesn't sink the rest). 90% opens the next step.
- **Practice:** the questions shuffled; choices are tapped, numbers and words typed (checked against hashes, the
  same reader as the worksheet); a miss shows the hint and the question comes back three later, until every one is
  right once. The round's score is first-try right.
- **Match:** 5 pairs a round (the least-seen first): tap a word, then its meaning.

Files: `<doc>-content.pdf` (every card, passage, practice question with its key and why, and match pair) and
`<doc>-screens.pdf`; in the final also `<doc>.html`. The final adds one `HOW-TO-SHARE-THE-APPS.txt` for all apps.

## How answers are kept out of the student file

Each right form (the answer, then `accept`) is normalized: a number becomes an exact reduced fraction (`n:3/4` for
`0.75`, `15/20`, `three fourths`, `3/4 mm`), words become lowercase with spaces, end marks and a leading a/an/the
removed (`t:anemometer`), a choice becomes its index (`opt:2`), true/false `tf:true`. The page stores
`SHA-256("PPA1|<salt>|<question id>|<form>")`, where the salt comes from the order id and the document, and the `why`
XOR-locked with a keystream made from the right form. The page normalizes what the student typed the same way and
compares hashes. Number words and unit marks are read in math and science only (`app.numberWords` / `app.unitMarks`
on the document change it), so a word answer in English or history stays a word.

This stops casual peeking (view source, the browser's tools), not a determined adult: a choice question has only a
few hashes to try, and small numbers can be guessed. Apps are for practice, never for grades; the share notes say so.
Flashcard backs, passages and match meanings are study material and are in the file as text.

The local storage key is `pp-app:<order id>:<doc file name>:v1` (the theme choice: `pp-app-theme`), so two apps on one
device never mix.

## Preview and final

Preview (watermarked, before the teacher agrees): the PDFs above, including a page of screenshots of the app at 375 px
and 1280 px made from the preview's own HTML. No HTML app leaves before sign-off. Final (with a matching
`approval.json`): the same PDFs unwatermarked, the HTML files and the share notes, listed in `README.txt`.

## Checks

`node checks/apps.mjs <pack.json> [--no-browser] [--shots <dir>]`, run by `npm run check` on every sample with an app
(and on broken copies of the fixture, to prove it bites):

- content: types, one version, accepted forms that read (numbers as numbers), a hint on every auto-checked worksheet
  item, no `miss` that is a right answer, every chosen mode has content, no duplicate card fronts or backs, match words
  or meanings, or passages
- hashes: the page's hashes are exactly those of the accepted forms; the page's own engine (in Node) marks every
  accepted form right and unlocks its `why`; the built-in SHA-256 agrees with Node's
- no plain-text key: no answer/accept/why/model/look field, no `why` or model answer text, no accepted form the
  student couldn't already see on the page
- browser (Playwright; skipped with a message when it isn't installed): opened from a file with every other request
  blocked and counted, no page errors, no sideways scroll at 375 px; the worksheet: a right answer shows its `why`, a
  wrong one starts the wait, a second miss opens "write what you're thinking" and then the hint, a reload keeps the
  right answer and the progress; the review app: flashcards, practice right and wrong, memorize step 2 typed in capitals
  without punctuation, match right and wrong, a reload keeps the progress; with storage blocked a banner shows and
  checking still works

Wilco's bots (`checks/test-wise.mjs`) play the apps' multiple-choice questions like any other document's. The audit
report counts the apps' questions; cards, passages and pairs are not "questions" there.

## For the briefs (notes for the auditor; `agents/` was not edited)

- **Onboarding:** `reviewapp` defaults to 40 cards (10–200) and `interactive` to 15 questions (5–40)
  (`feasibility.json`). Ask which modes a review app needs only if the source doesn't make it clear (a poem or a verse
  means Memorize). A memorize passage over 250 words gets split into parts. Say plainly that apps save only on the
  student's device and are for practice, not grades.
- **Maker:** every interactive item needs a `hint` that teaches without giving the answer, and `accept` with the forms
  a student would really type (`"18 dogs"` is read anyway; add word forms like `"Mia"` for `"Mia's dog"`). Add `miss`
  entries for the 1–2 predictable wrong answers. Card backs short (under 90 characters) so they also work in Match.
  Memorize text must be quoted exactly from the source or a public-domain original, with `source`.
- **Blind tester:** solve the printable copy (`<doc>-printable.pdf` or `checks/student-view.mjs`); for a review app,
  also read every card and say any card whose back doesn't answer its front, or two cards that are really the same.
- **Fact checker:** check every card back and every memorize passage word for word against its source.
- **Wilco:** run `checks/apps.mjs` with the keys and test-wise checks; a fail is fixed in the pack (forms, hints,
  choices), never by weakening the check.
- **Reporter:** log the browser check like Wilco's runs. The audit counts questions only, so say the cards and passages
  in `audit.notes`.
- Pricing (`docs/PRICING.md`) is still a guess for both; record real build minutes from the first orders.

## Not done yet

- A shared math normalizer (other capability work) can replace `parseNum` in `engine.js`; both the build and the page
  must use the same file, which they already do for this one.
- No read-aloud, no backup/restore code, and no teacher view of a student's saved progress (it lives only on her
  device; she can print it).
