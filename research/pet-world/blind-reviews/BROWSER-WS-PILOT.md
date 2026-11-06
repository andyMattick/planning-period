# Browser check: worksheet pilot (g6-bakery, ela5-link)

Nov 2, 2026. Script: `scripts/notes/browser-ws-pilot.mjs` (Playwright, Chromium, `npm run dev` on :5173). Run it as `node scripts/notes/browser-ws-pilot.mjs [--unit g6-bakery|ela5-link] [--vp 375|1280] [--only-game]`; the full run is slow (wrong answers wait several seconds), so run units and viewports in parallel. Right answers come from `scripts/notes/<unit>-keys.mjs`. No content, engine or `src/` file was changed.

**Result: 710 checks, 0 failed.**

## Sheets, hubs and My notes pages

Each cell: ✅ = every check of that kind passed at both 375×667 and 1280×800 (n = number of checks). A failure is listed under "Failures".

### g6-bakery

| Sheet | no sideways scroll | no page errors | no outside requests | footer "not yet" | AI disclaimer | hub links | blanks right/wrong | try-it right/wrong | Your turn right/wrong | choices right/wrong | reload restores | Print | Save as text | Copy text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| index | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | · | · | · | · | · | · | · | · |
| station-1 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-2 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-3 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-4 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-5 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| my-notes | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | · | · | · | · | · | · | · | · | · |

Teacher copy (`teacher-copies/g6-bakery/station-1.html`, F2): ✅ F2 toggles Show ANSWERS / Show BLANK, ✅ ANSWERS mode fills the blanks, ✅ no page errors

### ela5-link

| Sheet | no sideways scroll | no page errors | no outside requests | footer "not yet" | AI disclaimer | hub links | blanks right/wrong | try-it right/wrong | Your turn right/wrong | typed sentence | choices right/wrong | reload restores | Print | Save as text | Copy text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| index | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | · | · | · | · | · | · | · | · | · |
| station-1 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 2 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-2 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 2 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-3 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 2 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-4 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 2 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-5 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 2 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-6 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 2 | ✅ 4 | ✅ 8 | ✅ 2 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-7 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 4 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| station-8 | ✅ 2 | ✅ 4 | ✅ 2 | ✅ 2 | ✅ 2 | · | ✅ 4 | ✅ 4 | ✅ 8 | ✅ 4 | ✅ 12 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| my-notes | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 | · | · | · | · | · | · | · | · | · | · |

Teacher copy (`teacher-copies/ela5-link/station-1.html`, F2): ✅ F2 toggles Show ANSWERS / Show BLANK, ✅ ANSWERS mode fills the blanks, ✅ no page errors

· = not applicable on that page (hubs and My notes have no items). Typed-sentence check applies to ela5-link lessons 7 and 8 only (the only sheets with a typed-sentence Your-turn item); the miss tested drops the end mark and shows “Your words are right. Now check the capital letters and the punctuation marks.”, the exact sentence is marked right. Lessons 1–6 use typed words, choices and blanks.

## 📝 Notes buttons in the game (local mode, name screen, “Unlock every station” set in the saved state)

| Where | Card | href | Sheet that loads | Result |
|---|---|---|---|---|
| Bakery station 1 | ⚖️ 1. The Scale | `/notes/g6-bakery/station-1.html` | ⚖️ The Scale (n=1 of 5) | ✅ |
| Bakery station 2 | 🥧 2. Sharing Pans | `/notes/g6-bakery/station-2.html` | 🥧 Sharing Pans (n=2 of 5) | ✅ |
| Bakery station 3 | 📦 3. Boxing Treats | `/notes/g6-bakery/station-3.html` | 📦 Boxing Treats (n=3 of 5) | ✅ |
| Bakery station 4 | 🧾 4. The Register | `/notes/g6-bakery/station-4.html` | 🧾 The Register (n=4 of 5) | ✅ |
| Bakery station 5 | 🚚 5. Bulk Orders | `/notes/g6-bakery/station-5.html` | 🚚 Bulk Orders (n=5 of 5) | ✅ |
| Link Library lesson 1 | Meet the preposition | `/notes/ela5-link/station-1.html` | 🦉 Meet the preposition (n=1 of 8) | ✅ |
| Link Library lesson 2 | Prepositional phrases | `/notes/ela5-link/station-2.html` | 🧩 Prepositional phrases (n=2 of 8) | ✅ |
| Link Library lesson 3 | What prepositions tell | `/notes/ela5-link/station-3.html` | 🗺️ What prepositions tell (n=3 of 8) | ✅ |
| Link Library lesson 4 | Subject-verb agreement with prepositional phr | `/notes/ela5-link/station-4.html` | ✂️ Agreement with prepositional phrases (n=4 of 8) | ✅ |
| Link Library lesson 5 | ⭐ Challenge: Preposition or adverb? | `/notes/ela5-link/station-5.html` | ⭐ Preposition or adverb? (n=5 of 8) | ✅ |
| Link Library lesson 6 | Meet the interjection | `/notes/ela5-link/station-6.html` | 🎉 Meet the interjection (n=6 of 8) | ✅ |
| Link Library lesson 7 | Punctuating interjections | `/notes/ela5-link/station-7.html` | ❗ Punctuating interjections (n=7 of 8) | ✅ |
| Link Library lesson 8 | Prepositions and interjections: mixed practic | `/notes/ela5-link/station-8.html` | 🔗 Mixed practice (n=8 of 8) | ✅ |

- ✅ Bakery station cards: Bakery tile opens (unlocked in local mode) 

- ✅ Bakery station cards: 5 📝 Notes links found 5

- ✅ Link Library lesson cards: Link Library opens 

- ✅ Link Library lesson cards: 8 📝 Notes links (one per lesson) found 8

- ✅ game: no page errors 

Link Library lesson n is the nth skill of `ENGLISH_UNIT5` (the course order); card titles match the sheet titles (lesson 5 card “⭐ Challenge: Preposition or adverb?” → sheet “Preposition or adverb?”, lesson 8 “…mixed practice” → “Mixed practice”).

## Failures

None in the final run. (Earlier runs of the script failed on wait-timing and a sheet-title lookup in the script itself; those were script bugs, fixed before the final run, not sheet problems.)

## Not reached

- Nothing in the requested list was skipped. Limits to know: the 375 screenshots were looked at for one sheet per unit, one hub and one game page only (3–4 total); the game was checked at 1280 wide only; sheets 1–6 of ela5-link have no typed-sentence item, so that check ran on lessons 7 and 8.
- Not part of this task and not run: backup/save-code round trip, blocked-storage banner, sandboxed iframe, old-build save (WORKSHEET-CHECKLIST §9 beyond the items listed).
