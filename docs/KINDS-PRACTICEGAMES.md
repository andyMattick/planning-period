# Practice games (`practicegame`)

**Practice games are not review apps.** A review app (`reviewapp`, docs/KINDS-APPS.md) is a study tool: flashcards,
memorize, practice questions and match, calm and self-paced. A practice game is **play**: the same kind of checked
questions inside a game with a goal, a clock or an opponent, a score and stars. Both are on the menu; a teacher can
order either or both from the same source.

A practice game is one offline HTML file built from the pack's questions on a **tested template** and dressed in the
order's **theme**. Three templates are built (answer shooter, grid battle, fix-it desk); the menu's other two names
(rush, detective case) are the next ones (see the survey). The owner's question was: "in the build games section, can
we make a template that would build the games we have in Pet World?" The survey below answers it game by game.

Code: `scripts/render/practicegames.mjs` (build, teacher sheet, screenshots, the renderer hook, the browser driver) and
`scripts/render/practicegames/` (`reader.js` shared by the build and the page, `core.js` and `shell.css` shared by every
template, and one `.js` + `.css` per template). Checks: `checks/practicegames.mjs`. Capability fixtures:
`samples/_cap-practicegame/` (three packs, tests, not gallery samples).

## The survey: Pet World's games, by how play uses questions

Pet World (the owner's app) has 25 original arcade games (docs/ARCADE-GAMES.md there) plus 8 imported ones. Grouped
by what the game does with a question:

| Family | Pet World games | How a question drives play | Question shapes it needs | Fits | Template? |
|---|---|---|---|---|---|
| **Answer-target shooter** | ☄️ Shape Asteroids; the 🎈 Balloon Pop booth (Carnival); 🏴‍☠️ Corsair's Cove (solve to refill ammo) | Targets carry answers (or carry the problem); tap the right one before it lands | mc, true/false, typed number or word | any subject; best for facts, vocabulary, quick math | **Built: `shooter`** |
| **Grid battle / earn-a-move board** | ⚓ Harbor Battleship; Triad Arcade's Battleship; 🐧 Penguin Push and 🤿 Deep Dive Rescue (moves on a number line); 🎈 Canyon Balloon Rally; 🗺️ State Conquest | A right answer earns a move or a shot on a board; the board itself can be math (coordinates, a number line) | mc, typed, coordinates (name the point), a spot on a number line | any subject (letters grid); coordinates and integers (plane, number line) | **Built: `grid`** (letters and coordinate plane); a number-line board is a later mode |
| **Time rush (serve the orders)** | 🍳 Chef's Rush; 🛒 Supermarket Dash; 📮 Parcel Post; 🩺 Dr. Paws' Surgery (3 chained steps); 🧩 Sentence Snap (90-second sorting rush); 🌺 Greenhouse Keeper (a shift of jobs) | Tickets arrive on a timer; each is a question; a miss costs time or a heart | typed numbers, multi-step chains (step 2 uses step 1's answer), sort into bins | math (rates, ratios, decimals), ELA and science sorting | Yes, next ("rush" on the menu): needs a `sort` question shape and chained steps |
| **Deduction case** | 🔍 Potion Detective; 🗺️ The Great Treasure Chase | Each clue is a question whose answer is a piece of evidence; right answers rule suspects out; name the culprit | mc or typed, with suspects generated so exactly one matches every right answer and wrong answers point at innocents | math (numbers as evidence), history, geography, science facts | Yes, next ("detective case"): the suspect generator must prove one culprit (the logic solver in `scripts/games/logic.mjs` can) |
| **Fix-it desk** | 📚 Book Repair Desk; ✍️ Red Pen Desk; ⚖️ Rule Court; ⚡ Punctuation Power Lab; 🎙️ WPET Style Radio; ✂️ Cross It Out | A paper (sentence, solution, claim) has one mistake: find it, fix it (Rule Court adds "guilty or not" and "which rule") | sentence with one error span + the fix (picked or typed), "no mistake" papers, a rule to name | grammar, spelling, punctuation; math solution steps; science claims | **Built: `fixit`**; "no mistake" papers and naming the rule are later options |
| **Booths and awards** | 🎪 Carnival Midway; 🏆 Pet Show Awards; 🐝 Honeycomb Hunt | A set of short mini-games, each with its own twist (find the mean, then pick the closest pet; match equal forms, then type a third) | mc + typed, two steps per item | math mostly | Partly: a "booth" wrapper that strings other templates together; the twists are topic-specific |
| **Memory, match and cards** | Triad Arcade (memory, bingo, war); 🐾 Pet Hide-and-Seek (place on a picture); 🦋 Fly, Fly Butterfly (card campaign) | Pairs or calls; play is remembering or matching | term–definition pairs, bingo calls | vocabulary in any subject | Partly: the review app already has match; a class bingo is a printable, not an app |
| **Simulations and strategy** | ⚖️ Pax Oeconomica; 🧭 Terra Incognita; 🐄 Barn Breeder; 🦋 Life Cycle Lab; 💣 Mine Walker; 🖼️ Museum Caper; 🔨 Whack-a-Mole Stats Lab | The rules are the content (trade economies, voyages of 1604, genetics, a life cycle, minesweeper logic, statistics of a score) | none in the quiz sense: a model of the subject | one unit each | **No.** Each needs its own model and a fact check; they're custom builds, not templates |

What the three built templates took from Pet World, and what they left out:

- **shooter** ← Shape Asteroids: targets that drift toward the player, freezing nothing (the answers ride on the
  targets instead of a work panel), waves that get faster, the worked answer after a miss. Its canvas drawing was
  replaced with buttons, so math (KaTeX), screen readers and keyboards work.
- **grid** ← Harbor Battleship: the fleet placement, the computer's aim (finish off a hit ship, else a checkerboard),
  phone tabs that switch for each turn, the coordinate plane with "type the coordinates; the shot lands where you
  type" and its swapped-x-and-y message, the three stars.
- **fixit** ← Red Pen Desk, Book Repair Desk and Rule Court: tap the mistake, a gentle wrong tap that sends the paper back
  to the pile ("comes back two papers later"), a second wrong tap circles it, every paper ends fixed, stamps for no
  slips.

Left out everywhere: pets and Pet World characters, coins, tickets, the Arcade, Khan links and skills, PINs and
grown-up sign-offs, the day log, and every `postMessage` to the app. Names, emoji and colors come from the order's theme.

## In the pack

One document per game. Questions use the normal pack shape (`id`, `type`, `level`, `skill`, `prompt`, `choices`,
`answer`, `accept`, `why`, `unit`, `figure`), so `checks/keys.mjs` and Wilco's test-wise bots read them like any other
document. No versions.

```jsonc
{ "item": "practicegame", "title": "Fraction Star Patrol",
  "template": "shooter",                                  // shooter | grid | fixit
  "theme": { "preset": "space",                           // space | ocean | jungle | classroom (default by template)
             "title": "Fraction Star Patrol",             // the game's name on screen (default: the title)
             "story": "Comets are falling toward …",      // one or two lines on the start screen
             "accent": "#3d4fb8",                         // optional: darkened for light mode, lightened for dark
             "sprites": { "target": "🪐" },               // optional: replace any of the preset's emoji
             "names": { "target": "planet", "targets": "planets" } },   // optional: the words the game uses
  "settings": { … },                                      // optional, per template (below)
  "directions": "Fractions can be typed like 3/4 or 1 1/2.",
  "sections": [ { "heading": "…", "questions": [ … ] } ] }
```

| Template | Question types | Settings (all optional) | Least questions |
|---|---|---|---|
| `shooter` | `mc`, `tf`, `numeric`, `short` | `perWave` (5), `seconds` a target takes to land in wave 1 (16), `speedup` per wave (1.2) | 4 |
| `grid` | `mc`, `tf`, `numeric`, `short` | `mode` `"letters"` (A1–F6) or `"plane"` (points −R…R), `size` (letters, 5–8, default 6), `range` (plane, 3–6, default 4), `namePoints` (plane, default true), `ships` (lengths, default 3, 3, 2, 2) | 8 |
| `fixit` | `fixit` | — | 4 |

All templates: `settings.unitMarks` (read "12 cm" as 12; default on in math and science).

Sprites and names a theme can change: shooter `icon hero player target hit miss` / `player target targets`; grid
`icon hero hit miss enemy` / `enemy mine ships[]`; fixit `icon hero helpers[] stamp ok` / `helper paper desk helpers[]`
(helper names; the default list is made-up first names).

### `fixit` questions

```jsonc
{ "id": "f5", "type": "fixit", "level": 1, "skill": "subject-verb agreement",
  "prompt": "The list of chores [[are]] taped to the fridge.",   // exactly one [[mistake]]; "\n" starts a new line
  "choices": ["were", "is", "be"], "answer": 1,                  // pick the fix …
  "choiceWhy": ["“Were” is plural too …", "", "…"],              // optional: what a wrong fix says
  "why": "The subject is “list,” not “chores” …" }
{ "id": "f1", "type": "fixit", "prompt": "Marco and [[me]] built the volcano.", "answer": "I", "accept": ["…"], "why": "…" }   // … or type it
```

The paper is split into pieces at spaces; `$…$` math stays one piece (with the punctuation after it). The pieces that
overlap the `[[…]]` span are the mistake (tapping any of them finds it). The fix replaces the span. A typed fix is
compared exactly, apart from spaces and curly quotes, because capitals and marks are often the mistake; list other
right fixes in `accept`. A typed fix can't be math (give choices). For a math solution, put each step on its own line
and mark the wrong step (or the wrong part of it), with the fixed step as choices.

## How each game plays

Shared: a start screen (title, story, how to play, best score and stars on this device, Play, and "Practice my
misses" when some are saved), the game, and a results screen: stars, score, every question missed with the student's
answer, the right answer and why, then **Practice my misses** (only those, in a new order; answering one right clears
it), Play again and Start screen. Questions come in a new random order each game. Sound is off until the student turns
it on (short beeps made in the page, no files). Light or dark follows the device; the ☀️/🌙 button switches it. Progress
(plays, best score, best stars, the misses list) is saved in `localStorage` under `pp-game:<order id>:<doc file name>:v1`
(sound and theme: `pp-game-sound`, `pp-game-theme`), every read and write in try/catch; when the browser blocks it, a
notice says so and the game still plays.

- **shooter:** the question is above the play area; targets with the answers fall toward the player (one lane each, so
  they never overlap). Tap the right one, or press its number key. A typed question sends one big target and a box:
  type the answer and press Enter before it lands. One shot per question: a wrong shot or a landed target shows the
  answer and why (Next ▶). Quick right answers score more (100 + up to 50 for speed + a streak bonus). With reduced
  motion the targets stand still and the bar at the top shows the time. ⏸ Pause.
- **grid:** a right answer earns a shot (tap, or arrows and Enter on the grid); plane mode then asks for the point's
  coordinates and fires where the student typed, saying what went wrong (x and y swapped, a sign). A wrong answer
  shows the right answer and why, with no shot. The computer fires once a round. The game ends when the questions run
  out or a fleet is sunk; stars: more ship squares hit than the computer (or all sunk), 2 ships sunk, 80% right.
- **fixit:** described above; a paper counts as right only when it was fixed with no slip. Stars come from the share
  right (90% / 70% / 50%), as on the shooter.

**The answers are in the game file** (unlike the review apps, which store hashes): a game has to react the moment a
student taps. A student who opens the code can find them. The teacher sheet and the share notes say so: practice, never
a grade.

## Files

| Preview (watermarked PDFs) | Final (after the teacher agrees) |
|---|---|
| `<doc>-teacher.pdf`: the teacher sheet: the template and how it plays, the theme, the question count by type, what the results screen does, the device and saving notes, the answers-in-the-file note, the directions, and every question with its choices (the right one boxed), accepted typed forms, the fix-it mistake, fix and fixed sentence, and why | the same, unwatermarked |
| `<doc>-screens.pdf`: screenshots made from the preview's own game: phone start, playing (one wrong answer on purpose, so feedback shows) and results; computer start and playing. Math.random is seeded, so the final's screenshots match | the same |
| | `<doc>.html`: the game; `HOW-TO-SHARE-THE-GAMES.txt` once for all games |

The game file is self-contained: a Content-Security-Policy (`default-src 'none'`, inline styles and scripts, `data:`
images and fonts only, `connect-src 'none'`), KaTeX's CSS and fonts inlined only when a question has math, system fonts
otherwise. About 50 KB without math, about 600 KB with it (the math fonts).

## Checks

`node checks/practicegames.mjs <pack.json> [--no-browser] [--shots <dir>] [--self-test]`, run by `npm run check` on
every pack with a practice game (the three fixtures, and the grid fixture again as a coordinate-plane grid):

- content: a known template and types it can play, enough questions, a known preset with readable colors (every text
  pair 4.5:1 or better in light and dark), math that typesets; every choice question's right answer is among its
  choices, true/false is true or false, every typed answer and accepted form reads (numbers as numbers); every fix-it
  item has exactly one `[[mistake]]`, at least 3 right pieces besides it, a fix that isn't the mistake, and fix choices
  with no repeats; then, against the built page's data, each key is the pack's key and the page's own reader accepts
  every accepted form; no outside URL anywhere in the file
- browser (Playwright; skipped with a message when it isn't installed), at 375 px with every other request blocked: no
  outside request and no page or console error; one answer by keyboard (shooter: its number key; grid: arrows and
  Enter); a whole game with right and wrong answers to the results screen, which lists the misses with their right
  answers; no sideways scroll on the start, play and results screens; "Practice my misses" asks only the misses and,
  all right, clears them; a reload keeps the best score; with storage blocked, the notice shows and the game plays
- `--self-test` breaks copies of the fixtures 14 ways (an unknown template or preset, an answer out of range, a number
  that doesn't read, bad math, a fix-it item on the shooter, too few questions, a bad true/false, two or no `[[ ]]`,
  a fix that is the mistake, a fix choice that is the mistake or repeats, too little to tap) and fails if any passes

`checks/keys.mjs` accepts the `fixit` type (added to `TYPES` in `checks/pack-lib.mjs`); Wilco's test-wise bots play a
game's `mc` and `tf` questions like any other document's (they don't play fix choices). `checks/student-view.mjs`
prints a fix-it prompt with its `[[ ]]` marks; a blind tester must be told to ignore them (see the briefs).

## For the briefs (notes for the auditor; `agents/` was not edited)

- **Onboarding:** ask which template only if the order doesn't say and the source doesn't make it clear (grammar or
  editing → fixit; vocabulary or facts → shooter or grid; coordinates → grid in plane mode). Default 20 questions
  (10–60, `feasibility.json`). Say plainly: one device per game save, practice not grades, answers are in the file.
- **Maker:** write the questions like a quiz (levels, skills, `why` on every one), with fair choices from the start.
  Fix-it: exactly one mistake per paper, real mistakes students make, nothing else on the paper that a careful reader
  could call wrong; a typed fix needs every right form in `accept` (or use choices when there are many ways to fix it).
  Theme: pick a preset; the story is one or two plain sentences.
- **Blind tester:** solve the teacher-free view (`checks/student-view.mjs`, reading `[[…]]` as unmarked: find the
  mistake yourself, then compare). Report any fix-it paper with a second mistake, or with more than one fair fix not in
  `accept` or the choices.
- **Wilco:** `node checks/practicegames.mjs <pack>` with the keys and test-wise checks; fix the content, never the check.
- **Reporter:** log the browser check like Wilco's runs.
- Pricing (`docs/PRICING.md`, 70 tokens) is still a guess; record real build minutes from the first orders.

## Not done yet

- The **rush** and **detective case** templates named on the menu (survey above, with what each needs).
- Fix-it options from Pet World: papers with no mistake ("Looks good!"), naming the rule (Rule Court's charge), and a
  word-level "tap every …" step (Style Radio).
- A number-line board for the grid (Penguin Push, Deep Dive Rescue).
- Optional hashed answers (as in the review apps) for teachers who want them hidden; the timing makes it work, but it's
  not built.
- No read-aloud, and no teacher view of a student's saved progress (it lives only on her device).
