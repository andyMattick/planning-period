# 📝 Worksheet pilot report: the Bakery and the Link Library

Nov 2, 2026, 17:04–18:30 UTC (about 86 minutes of wall-clock time). This is step 1 of `docs/builder/WORKSHEETS-PLAN.md`:
two units, then a stop so the owner can look before the other 24. The step-by-step log is
`docs/builder/WORKSHEETS-PILOT-LOG.md`, and the token audit is `docs/builder/AUDIT-WORKSHEETS-PILOT.md`.

**Nothing has been approved by a grown-up yet.** Every sheet's footer says "A grown-up checked it: (not yet)". Both
units were built before the owner reviewed them (checklist §1), the same way as the 7th grade units. The review packets
below are what the owner reads to approve them.

## What was built

| Unit | Sheets | Where | Build |
|---|---|---|---|
| 🧁 Bakery (shop `bakery`, 6th grade Unit 2) | 5, one per station: The Scale, Sharing Pans, Boxing Treats, The Register, Bulk Orders | `public/notes/g6-bakery/` (hub `index.html`, `station-1…5.html`, `my-notes.html`) | 3 |
| 🔗 Link Library (`elaConj`, course `prepositions`, English Unit 5) | 8, one per lesson in `ENGLISH_UNIT5` order | `public/notes/ela5-link/` (`station-1…8.html`; the pages say "Lesson") | 3 |

- **Every checklist part on every sheet:** try it first, 3 watch-fors, key ideas with blanks, 2 worked examples,
  6 Your turn items L1→L3, a mix-up alert and 2 Spot the mix-up choices, 2 written answers and a grown-up question,
  My notes and Top 3, Print / Save / Copy, the AI disclaimer, and "A grown-up checked it: (not yet)".
- **Stories:** Biscuit the puppy baker (Bakery) and a library with linking words (Link Library).
- **The first non-math sheets: new engine item kinds.** These are in `scripts/notes/engine/notes.js` and
  `build-notes.mjs`, documented in `docs/builder/WORKSHEETS.md`. They are turned on only for a unit with `kinds: true`,
  so the 7th grade pages and the Bakery rebuild byte for byte the same.
  - `choice`: 3–4 options, with the full miss flow.
  - `word`: a typed word or phrase. Capitals and spaces don't matter.
  - `sentence`: a typed sentence. Capitals and punctuation count, so "Ouch! That hurts." is not "Ouch, that hurts."
    If the words are right but a capital or mark is wrong, she sees "check the capital letters and the punctuation marks".
- **Bakery engine changes:** these are per-unit build patches, and the engine file is unchanged. They are: no ± key, the
  Bakery's own level names, a picture in worked examples (fraction bars and lined-up decimals), and a 🧁 icon.
- **Both units (Build 3):** a saved right answer is checked again every time the page opens. If a question changed in a
  newer build, it reopens with "This question changed". (The recheck found this bug. See below.)
- **📝 Notes buttons in the game.**
  - Bakery station cards use `bakery` in `G7_NOTES`.
  - Each Link Library lesson card gets `libNotesHTML(courseId, skillId)`. Lesson n opens `station-<n>.html`.
  - There is a `verify` guard for the library link and one CSS line.
- **Checks you can rerun:**
  - `node scripts/notes/check-g6-bakery-keys.mjs` and `node scripts/notes/check-ela5-link-keys.mjs` (key checks)
  - `node scripts/notes/browser-ws-pilot.mjs` (browser)
  - `node scripts/notes/browser-ws-pilot-s9.mjs` (save code, backup, blocked storage, sandboxed iframe, old-build save)
- **Teacher copies:** `teacher-copies/g6-bakery/` and `teacher-copies/ela5-link/`. They are not served (F2 shows the
  answers).

## Every check and what it caught

| Check | Who | Caught | Cost |
|---|---|---|---|
| Build gates (`build-notes.mjs`) | the makers, on each build | Bakery: "5.4" and "54" hashed alike (the choice notes were added for this); the right option must not be the longest | (in the maker) |
| 🙈 Blind solve, round 1 | fresh session | 179 items, all 179 matched the hashes, so **no wrong key**. **15 FIX, all ELA.** (1) The key was the shortest choice in 9 of 16 mix-ups, about 60% when chance is 33%. (2) Two wrong choices agreed with the stem. (3) A wrong choice failed the grammar ("have"). (4) A prompt didn't ask for an end mark that the key needed. (5) "comma" was not accepted. **12 JUDGMENT.** Two of them were Bakery: a mix-up that reused Example 1's numbers (a giveaway), and a middle-value key | $1.40 |
| ✅ Key checker | fresh session | 74 + 105 items solved its own way, and 257 stored hashes checked. **No wrong key.** One equal-value pair: two Bakery set-ups that add to the same number. The lead made this a FIX | $1.86 |
| 🌐 Browser check (cheaper tier) | fresh session | 710 checks at 375 and 1280, 0 failed. All 13 📝 Notes links from the game open the right sheet. It caught nothing in the sheets | $1.12 |
| 📝 Round 2 fixes | fresh session | Fixed all 15 FIX items, 8 adopted ELA judgments and 4 Bakery items | $1.59 |
| ✅🙈🌐 Recheck (changed items only) | fresh session | All 30 changed items fixed and matched. The mix-up key is now never the shortest, and "pick the shortest" scores 18% when chance is 28%. **An engine bug:** an old save of a changed question stayed "✓ Right!", because the "This question changed" path never ran for saves that already had their explanation. 2 new judgments | $2.07 |
| Lead's step-in | lead | Fixed the bug with per-unit patches, plus the 2 judgments. Reran everything: key scripts exit 0; §9: 18/18; browser: 694/694; g7 pages unchanged | (lead) |

**What was worth it:** the blind solver found every content problem, and it was the cheapest check. The recheck found
the only real bug, which was in the engine. The key checker and the browser check found no errors, but they are the
proof that the keys and the screens are right, and they are scripts now, so they rerun for free.

## Cost and time

Measured: each child session's `usage.cost_usd` from `get_session`.

| Session | Minutes | Cost |
|---|---|---|
| 📝 Bakery maker | 10.5 | $3.16 |
| 📝 Link Library maker + engine | 17.5 | $5.21 |
| 🙈 Blind solver | 3.5 | $1.40 |
| ✅ Key checker | 5 | $1.86 |
| 🌐 Browser check (cheaper tier) | 18 | $1.12 |
| 📝 Round 2 | 4 | $1.59 |
| ✅🙈🌐 Recheck | 15 | $2.07 |
| **Child sessions, measured** | | **$16.41** |
| 🧭 Lead (its counter went from $285.75 to $299.26) | 86 wall | $13.51 (upper bound: the counter is shared with the coordinating session, which was working too; my own estimate is about $9–11) |
| **Pilot total** | about 86 | **about $26–30**, not counting the auditor |

**Per unit.** The makers are counted directly. The shared checkers are split by items (Bakery 41%, ELA 59%), and the
lead's cost is split evenly.

| Unit | Maker | Checks | Lead | Total | Per sheet |
|---|---|---|---|---|---|
| Bakery (5 sheets) | $3.16 | about $3.30 | about $5–6.75 | **about $11.5–13** | about $2.30–2.60 |
| Link Library (8 sheets) | $5.21 | about $4.75 | about $5–6.75 | **about $15–17** | about $1.90–2.10 |

The plan's $5–8 a unit is met by the child sessions alone ($6.46 Bakery, $9.96 ELA with the one-time engine work). The
lead's cost doubles it. The audit says how to cut it.

## The owner's review packet (what to open and what to look at)

Open these with `npm run dev`, phone width first. The answers are in the review packets:
`docs/builder/WORKSHEETS-G6-BAKERY-review.md` and `docs/builder/WORKSHEETS-ELA5-LINK-review.md`, with keys in bold.

1. **Link Library Lesson 7, Punctuating interjections** (`/notes/ela5-link/station-7.html`). This is the new typed
   sentence. Type "Ouch, that hurts." and then "Ouch! That hurts.". Is the strict capital and punctuation rule right
   for her?
2. **Link Library Lesson 5, Preposition or adverb?** (`station-5.html`). This is the hardest lesson to keep to one right
   answer. Problem 4 now asks "inside what?".
3. **Link Library Lesson 1** (`station-1.html`). Do the blanks accept the words she'd type?
4. **Bakery Station 2, Sharing Pans** (`/notes/g6-bakery/station-2.html`). Look at the fraction-bar picture in the
   worked example: is it clear, and does it give nothing away?
5. **Bakery Station 4, The Register** (`station-4.html`). Problem 5 is long division with a 0 in the quotient. The mix-up
   choices are 5.4 / 54 / 540.
6. **From the game:** the 📝 Notes button on a Bakery station card and on a Link Library lesson card.
7. **The judgment calls to OK or change:**
   - 7/2 is accepted for 3 1/2 (answers are compared by value; "leave it as an improper fraction" is taught in the
     mix-up alert instead).
   - Long division asks only for the quotient.
   - Link Library watch-fors follow the lesson texts, because `prepositions` has no `KHAN_VIDEOS` list.
   - ELA Lesson 7 still doesn't accept "big" for "capital".
   - ELA Lesson 3 problem 6's key is tied for shortest.

## Owner to-dos

1. **Review and approve** both units (the packet above). Then the footers change from "(not yet)" to the date.
2. **Length of the ELA lessons.** The blind solver estimates Lessons 1–6 at about 25–35 minutes, and the checklist asks
   for 35–45. Options: add a third mix-up choice or a third written answer (new ids at the end), or accept shorter
   grammar sheets. Not changed in the pilot.
3. **The engine bug in the 7th grade sheets.** An old save of a changed question shows "✓ Right!" in Dive, Balloon and
   Hive too. Their shipped pages haven't changed any items since Build 2, so nothing is wrong today. OK one small engine
   change (recheck every saved right answer on load) and a rebuild of the g7 pages, so that future builds are safe.
   Until then the fix is a per-unit patch.
4. **Before the other 24 units:** read the audit (`AUDIT-WORKSHEETS-PILOT.md`) and pick which recommendations to adopt.

## Decisions the lead made alone

- The unit ids are `g6-bakery` and `ela5-link`. Sheets keep the engine's `station-<n>.html` names, even for lessons.
- The two makers ran at the same time. The Bakery maker could change the engine only as per-unit patches, so the two
  never edited the same file.
- The Bakery's "two set-ups with the same sum" counts as a FIX (the owner's equal-value rule), not a kept tie.
- Kept as they are: ELA Lesson 7 p1 (two choices differ only by a capital, which is the skill itself) and Lesson 7 k2
  ("big" not accepted).
- The ELA lessons were not made longer (to-do 2).
- The lead fixed the engine bug and 2 judgments itself, with per-unit patches, instead of starting a third round. It was
  small: about 10 lines. The fresh checkers' scripts reran it. Two checker-script edits were mechanical: one changed
  option text, and the §9 script's build-number test (`b2 === 2` became `b2 >= 2`).
- The 7th grade engine bug was left for the owner (to-do 3) because the pilot checks only its two units.

## Token audit

See `docs/builder/AUDIT-WORKSHEETS-PILOT.md` (auditor, $0.62). With it, the child sessions came to $17.03 and the pilot to about $27–31.
