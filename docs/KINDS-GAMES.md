# Games and puzzles: `quizshow`, `crossword`, `wordsearch`, `logicpuzzle`

Four menu items (owner, Nov 5, 2026: "be able to make games, crossword puzzles, word searches, logic puzzles"). Each is
one document in `pack.json` whose `item` (or `kind`) names it. The game data sits in its own field, not in `sections`,
so `checks/keys.mjs` and `checks/test-wise.mjs` pass over it (keys.mjs says "no sections, slides or rubric" as a
warning) and `checks/puzzles.mjs` checks it instead. Renderer: `scripts/render/games.mjs`. Builders and solvers:
`scripts/games/`. A worked example of all four: `samples/_cap-games/pack.json` (a capability test, not a gallery sample).

**Never use the trademarked TV show's name** anywhere (titles, clues, notes, file names). It is a quiz-show game.
`checks/puzzles.mjs` fails a pack that uses it.

## The order of work for a puzzle

1. The maker writes the content: the board, the words and clues, the word list, the logic puzzles (clues with rules).
2. `node scripts/make-puzzles.mjs <order folder> --write` builds the crossword and word-search grids from the words and
   seed, and stores them in the pack with each logic puzzle's one solution and solve path. It stops (exit 1) when a
   logic puzzle has no solution or more than one. **Store the grids before the preview**, so the grid the teacher
   approves is the grid that is released (the pack hash changes if a grid changes).
3. `node checks/puzzles.mjs <order folder>/pack.json` checks the stored grids on its own (it doesn't trust the
   builders) and must exit 0. `npm run check` runs it on every sample and breaks copies of the games fixture to make
   sure it still catches a bad grid, a word placed twice, a non-unique puzzle and a clue/answer mismatch.
4. Fresh agents check what a script can't (below), then the preview, the teacher's sign-off and the final as usual.

## `quizshow`: the quiz-show review game

```jsonc
{ "item": "quizshow", "title": "Cells Quiz Show", "directions": "…", "teams": 4,          // 2–6 teams
  "board": {
    "values": [100, 200, 300, 400, 500],                                                   // default 100–500
    "categories": [ { "name": "Organelles", "clues": [
      { "value": 100, "clue": "This organelle holds the cell's DNA…", "answer": "The nucleus",
        "accept": ["nucleus"], "why": "…" } ] } ],                                         // one clue per value
    "final": { "category": "Inside the Cell", "clue": "…", "answer": "Cytoplasm" }      // optional
  } }
```

| Preview (PDF, watermarked) | Final |
|---|---|
| `<doc>-teacher.pdf`: the board, every clue with its answer (`accept`, `why`), the final round, how to play | the same, unwatermarked |
| `<doc>-score-sheet.pdf`: teams × categories with the values to circle, final wager, total; a tiles-played board | the same |
| | `<doc>.pptx`: title slide, a board slide whose tiles link to each clue slide; each clue links to its answer slide and back to the board; the answer is in the notes of both. A final-round button, wager slide, clue and answer. PowerPoint can't grey out used tiles (said in the notes) |
| | `<doc>.html`: the game in a browser, offline. One file, no network (a Content-Security-Policy blocks it). Click or Enter on a tile → the clue → Show answer (Space) → +/− points per team (keys 1–6, Shift for −) → Back to board (Esc); the tile greys out. Team names and scores are editable and kept in the browser; New game clears them. Final round with wagers. Works at phone width |

Checks (`checks/puzzles.mjs`): every category has exactly one clue at every value, with a clue and an answer; no clue
contains its own answer; no clue twice; no category twice; values go up.

## `crossword`

```jsonc
{ "item": "crossword", "title": "Cells Crossword", "directions": "…",
  "crossword": { "seed": 1, "size": 15, "wordBank": false,                        // wordBank prints the words (young grades)
    "words": [ { "answer": "cell membrane", "clue": "The thin, flexible layer around every cell…" } ],
    "layout": { … } } }                                                            // written by make-puzzles.mjs
```

The builder (`scripts/games/crossword.mjs`, deterministic with the seed) places the longest words first and tries
hundreds of layouts (longer while a word is still left out). Words only meet where they cross, and no two letters touch
side by side unless they are in the same word, so no stray words form. It keeps the layout that places the most words,
then has the most crossings, the smallest box and the most 180° symmetry ("symmetric if possible": a freeform grid is
rarely exactly symmetric; the teacher copy states the percent). Spaces and hyphens are dropped in the grid; the clue
shows the lengths, `(4, 8)`. A word that won't fit is listed in `layout.unplaced` with the reason and on the teacher
copy: change the seed or the size, or drop the word.

Files: `<doc>-student.pdf` (blank grid with numbers, Across and Down clues; preview and final),
`<doc>-teacher.pdf` (filled grid, answers in bold, the grid facts, any word left out), and in the final both as Word.

Checks: every entry reads right in the grid and stops there; its number is the one the grid gives its first square;
every run of 2 or more letters across or down is an entry (a stray run longer than 2 fails, a 2-letter one is flagged);
one connected grid; each word placed once (or reported as not placed); each entry's clue is the clue written for that
word; no clue gives away its answer.

## `wordsearch`

```jsonc
{ "item": "wordsearch", "title": "Cells Word Search", "directions": "…",
  "wordsearch": { "seed": 3, "size": 15, "directions": ["E", "S"],   // size and directions optional: by grade
    "words": ["cell", "nucleus", …], "layout": { … } } }
```

By grade (`order.grade`) unless `directions` is given: K–2 across and down, size 10; 3–5 adds diagonal down-right,
size 12; 6–8 adds diagonal up-right, backwards and up, size 15; 9–12 all eight, size 15 (never smaller than the longest
word). Filler letters are random, then changed until no listed word reads a second time and no word on the short
blocklist (`BLOCKLIST` in `scripts/games/wordsearch.mjs`) reads anywhere, in any of the eight directions. A listed word
that is part of a longer one (ORGAN in ORGANELLE) is counted once.

Files (PDF only, as the menu says): `<doc>-student.pdf` (the grid and the word list beside it, with tick boxes and the
directions used), `<doc>-teacher.pdf` (every word outlined, with its row, column and direction).

Checks: every listed word is in the grid exactly once in any direction (not just the allowed ones), runs only in the
grade's directions, matches its stored placement; no blocklisted word in the filler.

## `logicpuzzle`

```jsonc
{ "item": "logicpuzzle", "title": "Cells Logic Puzzles", "directions": "…",
  "puzzles": [
    { "type": "grid", "title": "Microscope Week", "story": "…",
      "categories": [ { "name": "Student", "items": ["Ava", "Ben", "Cruz", "Dee"] },
                      { "name": "Day", "items": ["Monday", "Tuesday", "Wednesday", "Thursday"], "ordered": true } ],
      "clues": [ { "text": "Cruz presented on Thursday.", "rule": { "same": ["Cruz", "Thursday"] } },
                 { "text": "Ava drew the organelle where photosynthesis happens.", "rule": { "same": ["Ava", "chloroplast"] },
                   "because": "chloroplasts are where photosynthesis happens" } ],
      "solution": [["Ava", "chloroplast", "Wednesday"], …], "path": ["Clue 1: …"] },        // written by make-puzzles.mjs
    { "type": "cages", "title": "Cell Count Cages", "size": 4,
      "cages": [ { "cells": ["A1", "B1"], "op": "+", "target": 4 }, { "cells": ["C3"], "op": "=", "target": 4 } ] }
  ] }
```

**Grid puzzles** (2–5 categories of 2–6 items; every item name different). Each clue has the `text` students read and
a `rule` the solver reads: `same [a, b]`, `not [a, b]`, `either [a, [b, c]]`, `pairs [[a, b], [x, y]]` (of a and b,
one is x and the other y), `different [a, b, c]`, `less [a, b]` with `cat` (a ordered category, in the order its items
are listed) and optional `by` (exact steps), `next [a, b]` with `cat`. The clue's text must name every item its rule
uses, unless the clue sets `because`: a clue that needs subject knowledge ("the organelle where photosynthesis
happens"), which ties the puzzle to the topic and goes to the fact checker.

**Cage puzzles** (KenKen-style, 3×3 to 7×7): each row and column holds 1…n once; each cage makes its target with
`+`, `-`, `×`, `÷` (`-` and `÷` cages have 2 squares) or is one square (`=`). Squares are `A1` (row letter, column
number); cages must cover the grid once and touch.

The solver (`scripts/games/logic.mjs`) tries every possible answer and counts them (stopping at 2): a puzzle passes only
with exactly one. It also writes a short solve path (grid: which clue gives which fact, using what is known so far;
cages: which numbers a cage allows, then the squares that are forced) and notes any clue that isn't needed.

Files: `<doc>-student.pdf` (story, clues, the classic grid with rotated headers and an answer table; or the cage grid
with row letters and column numbers), `<doc>-teacher.pdf` (● / × filled in, the solution, the solve path, "one answer,
proved", any clue that needs subject knowledge), and in the final both as Word (the logic grid is an editable table).

Checks: exactly one solution for each puzzle; the stored solution is that one; every clue names its items (or has
`because`); rule items exist; cages are valid.

## For the briefs

What the scripts prove and what still needs a **fresh agent** (the auditor adds these to the briefs; `agents/` is not
changed here):

- **Crossword:** a fresh blind tester solves the student copy **from the clues alone** (no word bank unless the order
  has one) and reports any clue that fits another word of the right length, any clue too hard for the grade, and any
  answer it couldn't get. The script only proves the grid; it can't tell a fair clue from a vague one.
- **Logic puzzles:** a fresh blind tester solves each puzzle from the student copy, without the key, and reports where it
  got stuck and how long it took. The solver proves exactly one answer from the **rules**; only a reader can confirm the
  clue **text** says what its rule says (the script checks only that the text names the items). Clues with `because`
  go to the fact checker.
- **Quiz show:** the fact checker checks every clue and answer (science and social studies), and a blind tester answers
  the board from the clues to find clues with more than one fair answer (add those to `accept` or rewrite the clue).
- **Word search:** a spelling check of the word list against the source; nothing to solve blind.
- Pricing, feasibility and the order page already list these items (`menu.json`, `feasibility.json`,
  `docs/PRICING.md`); real build costs replace the guesses there after the first real orders.
