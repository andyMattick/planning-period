# Build log: 📝 worksheet batch 1 (6th grade Market, Clock, Rink, Potion)

The lead's log of math batch 1 (`docs/builder/WORKSHEETS-PLAN.md`, `WORKSHEETS-LEAD-RECIPE.md`): 🍎 Market Stall
(`g6-market`, 4 sheets), 🕰️ Clock Tower (`g6-clock`, 3), ⛸️ Ice Rink (`g6-rink`, 6) and 🧪 Potion Lab (`g6-potion`, 6),
Nov 4, 2026. Times are UTC. Child cost is each session's `usage.cost_usd` from `get_session`.

**Cost counter (the lead's, shared with the coordinating session, so a ceiling):** start $519.00 · first merge $526.68 ·
end $532.42 (at most $13.42 for the lead).

| Time | Who | What | Cost |
|---|---|---|---|
| 12:15 | 🧭 Lead | Read the recipe, WORKSHEETS, the checklist, the pilot log and audit, the Bakery content. Unit ids `g6-<shop>`. One maker brief (the recipe's 7 steps and the six writing rules) with a note per unit: no ± key and a `%` fix (Market), superscript exponents (Clock), keep ± and the engine's number line (Rink), `kinds: true` for typed and chosen expressions (Potion) | — |
| 12:19 | 🧭 Lead | Started four makers at once, one branch each (`claude/ws-b1-<shop>`) | — |
| 12:29 | 📝 Market maker | Done (4c7f675): 4 sheets, 60 items, Gus the goat; a patch so "36%" reads as 36; pictures (double number line, 10×10 grid, percent bar) | $3.52 |
| 12:29 | 📝 Clock maker | Done (d816633): 3 sheets, 43 items, Hoot the owl; superscript exponents; step-ladder pictures | $3.62 |
| 12:32 | 📝 Rink maker | Done (f2c156d): 6 sheets, 88 items, Frost the reindeer; the engine's number line (vertical for the thermometer); comparing typed as numbers, not choices | $4.09 |
| 12:32 | 📝 Potion maker | Done (b44ff93): 6 sheets, 86 items, Fizz the frog; `kinds: true`, typed expressions (term order and ·, *, × accepted) and factored forms as choices only (typed answers drop parentheses) | $5.46 |
| 12:34–12:38 | 🧭 Lead | Started four fresh blind solvers (student view only). Merged Market, then Clock, Rink, Potion, wiring each: `G7_NOTES` entry and a verify guard (link + every sheet). After each: verify, typecheck, build, all notes units rebuilt with `git status` clean for the others. Browser runs in the background | — |
| 12:36 | 🙈 Market blind | Done: 60 items, 59 matched first (one own slip), keys right. FIX 3: the number-choice key always the smallest; s2 p5 "percent shaded" with two readings; "hundred" refused. JUDGMENT 4 | $1.00 |
| 12:36 | 🙈 Clock blind | Done: 43/43 matched. FIX 1: s1 p5 Level 3 had one step. JUDGMENT 4 (s3 c1 key the only option with numbers) | $0.95 |
| 12:40 | 🙈 Rink blind | Done: 88/88 matched. FIX 4: "one fourth" refused; s3 p6 second step not needed; s3 c1 key the odd shape; s5 c1 plural gives it away. JUDGMENT 6 | $1.16 |
| 12:40 | 🙈 Potion blind | Done: 86/86 matched. FIX 4: **overlap pattern** (the key shares the most with the other two in 65% of sets, chance 33%: each wrong expression was one change from the key); s2 c2 reuses Example 2's numbers; s2 c1 "4s" printed three times on the page; s4 p5 "sum" could be typed as 3+5. No length pattern in any unit | $1.28 |
| 12:38 (browser) | 🧭 Lead | `browser-notes.mjs` Build 1: Market 234 checks, Clock 186, Rink 330, 0 failed. Screenshot showed the engine's fixed "all 5 sheets" text on a 4-sheet unit | — |
| 12:41–12:45 | 🧭 Lead | Four fresh round-2 sessions on FIX items plus adopted judgments (Market s3 p4 message, s4 levels, s4 k3 numbers, 1%/5% benchmark idea; Clock s3 c1; Rink s6 p3; Potion s4 c1, "use symbols" line) and per-unit `enginePatches` for the sheet count and "About 35 minutes" | — |
| 12:43 | 📝 Market round 2 | Done (6c8f44b), Build 2 | $1.02 |
| 12:44 | 📝 Clock round 2 | Done (8842068), Build 2: s1 p5 now (2/5)² + 1/5 | $0.88 |
| 12:49 | 📝 Rink round 2 | Done (44dd0f1), Build 2: a parse patch so "one fourth"/"a quarter" read as 1/4; s3 p6 key −13; s6 p3 new setting | $1.44 |
| 12:50 | 📝 Potion round 2 | Done (f328735), Build 2: overlap 65% → 36% (own bigram script; `test-wise-cues.mjs` has no such cue); shortest 42%, under the gate | $2.06 |
| 12:52 | 🧭 Lead | Merged the four round 2s; rebuilt every notes unit (others unchanged); both key scripts pass on all four; verify, typecheck, build pass. Recheck of the changed items by the key scripts and by hand (clock 9/25, market 30 and 34%, 3 and 0.6). Browser runs on Build 2 | — |
| 13:07 | 🧭 Lead | `browser-notes.mjs` on Build 2 (both widths and the §9 checks, including a Build 1 save reopening in Build 2): Market 236 checks, Clock 188, Rink 332, Potion 356, **0 failed**. Looked at the 375 px screenshots: no sideways scroll; pictures fit. The Rink thermometer keeps the Dive Shop's sea-blue shading below 0 and a stray "0" at the right end of the zero line (owner's call) | — |

**Children:** makers $16.69, blind solvers $4.39, round 2 $5.40: **$26.48** (Market $5.54, Clock $5.45, Rink $6.69,
Potion $8.80; about $1.39 a sheet). With the lead's ceiling: about $40, or about $10 a unit.

## What the lead learned (for the next batch)

- **The choice gate misses an overlap pattern.** Potion's expression choices were each one edit from the key, so the
  key was the "centre" option 65% of the time; the gate (shortest, longest, middle length, odd one out, middle value)
  passed it. Add a bigram-overlap cue to `scripts/notes/choice-gate.mjs` (and a smallest/largest value cue: Market's
  number keys were all the smallest) before the next math batch.
- **Fixed engine texts.** "all 5 sheets", "All 5 sheets together", "the 5 sheets" and "About 40 minutes a sheet" are
  wrong for any unit without 5 sheets; only `kinds` units relabel the count. Each batch 1 unit patches them. The
  already-built 7th grade Balloon Port and Hive (4 sheets each) still say "5 sheets" (owner to OK an engine fix and a
  rebuild).
- **Cost:** children alone were about $6.6 a unit, over the recipe's $4.3 a unit for everything; the makers alone were
  $3.5–5.5. Parallel makers and blind solvers kept wall time to about 40 minutes.

# Build log: 📝 worksheet batch 2 (6th grade Houses, Harbor, Post Office, Show)

Math batch 2: 🏡 Pet Houses (`g6-houses`, 3 sheets, 45 items), ⚓ Pet Harbor (`g6-harbor`, 3, 44), 📮 Pet Post Office
(`g6-post`, 4, 61) and 🏆 Pet Show (`g6-show`, 6, 84), Nov 4, 2026. Times are UTC. Child cost is each session's
`total_cost_usd`. `checked` is left out of all four (the owner approves).

**Cost counter (the lead's, shared with the coordinating session, so a ceiling):** start $547.41 · first merge $551.61 ·
end $560.42 (at most $13.01 for the lead).

| Time | Who | What | Cost |
|---|---|---|---|
| 14:11 | 🧭 Lead | Read the recipe, WORKSHEETS, the checklist, batch 1's log, blind reports and content. One maker brief: the recipe's steps, the six writing rules and batch 1's lessons (number keys not always smallest/largest, no converge, no giveaway words, word forms of numbers, real Level 3 step, right sheet count and minutes), plus pictures next to questions (`q.pic` patch; 375 px, black-and-white print, never the asked value), a unit-reading patch (cm², in^3, ft2, cubic) and Wilco's notes bots as a required check. Per unit: Harbor keeps ±, one typed number per answer (ordered pairs only as choices) | — |
| 14:14–14:16 | 🧭 Lead | Started four makers at once, one branch each (`claude/ws-b2-<shop>`) | — |
| 14:29 | 📝 Harbor maker | Done (368f763): Gully the seagull, −6..6 plane with lettered points; quadrant forms (II, two, second) read as numbers | $4.48 |
| 14:30 | 📝 Houses maker | Done (17eaac4): Bea the beaver; shapes not to scale, dashed heights, slanted-side distractors, hatching for print | $5.36 |
| 14:31 | 📝 Post maker | Done (2718b96): Pip the pelican; boxes, ½-inch cubes, five nets with lettered faces. Changed the seed to 20261129 (20261123 put 4 of 8 keys at A: posA 50%) | $5.00 |
| 14:33 | 📝 Show maker | Done (b9e72ab): Pip the poodle; dot plots, histograms, frequency tables, box plots drawn to scale; 6th grade quartiles (median left out) | $5.21 |
| 14:38–14:47 | 🧭 Lead | Four fresh blind solvers started. Merged Houses, Harbor, Post, Show in order, wiring each (`G7_NOTES` entry, verify guard for the link and every sheet); after each: verify, typecheck, build, every notes unit rebuilt with `git status` clean for the others. `browser-notes.mjs` Build 1: Houses 186 checks, Harbor 186, Post 234, Show 328, **0 failed** | — |
| 14:41 | 🙈 Houses blind | 45/45 matched. FIX 2: Roof Lines p5 Level 3 was one step; Rooms c1 key the only choice that multiplies. JUDGMENT 3 (Roof Lines c1 height the only dashed line; ½ symbol refused) | $1.31 |
| 14:41 | 🙈 Harbor blind | 44/44 matched. FIX 3: Shipyard c1 wrong pairs used none of the question's numbers; Shipyard p3 reused Example 1's corners; "all around" refused. JUDGMENT 6 | $1.11 |
| 14:42 | 🙈 Post blind | 61/61 matched. FIX 2: Wrapping Desk k1 printed its own answer; "one hundred and twenty" unread. JUDGMENT 11 (h = … form, "triangular" only in the key, converge on 4.c1, hints giving answers) | $1.80 |
| 14:42 | 🙈 Show blind | 83/84 matched (one own slip). FIX 5: Sign-In Desk c1 a second statistical question; Judges' Table c1 "exactly" giveaway; Ribbon Ranges c1 two quartile methods; Ribbon Ranges p6 not exact from a box plot; Best in Show p5 dot plot too fine at 375 px. JUDGMENT 7 | $1.55 |
| 14:46–14:58 | 📝 Round 2 (same makers) | FIX items plus adopted judgments, Build 2 each: Houses (551afc6) new two-step sail problem, all-multiplying Rooms c1, no dashed cue, ½ and "and" number words; Harbor (a90f082) new wrong pairs and corners, varied coordinates; Post (fde48e7) "and" number words, same-form choices; Show (394fae8) five fixes, a percent help message, 0–22 dot plot | Houses $2.05, Harbor $1.33, Post $1.15, Show $1.15 |
| 15:03 | 🙈 Recheck (fresh) | The 25 changed items: all matched, no FIX. JUDGMENT: Harbor Shipyard c1 (1, −3) a weak wrong choice; Post Box Folding c2 "distance around one face for each side" can also give 64 | $1.58 |
| 15:13 | 🧭 Lead | Post Build 3: that choice now says "for each of the 6 faces" (6 × 16 = 96). A fresh solver rechecked it: matched, KEEP | $0.45 |
| 15:21 | 🧭 Lead | `browser-notes.mjs` on Build 2 (Post on Build 3) at both widths and `--s9` with a Build 1 save: Houses 188 + 20, Harbor 188 + 20, Post 236 + 20, Show 330 + 20 checks, **0 failed**. Looked at the 375 px pictures: no sideways scroll, labels about 12 px, nothing gives an answer away | — |

**Wilco's notes bots (final):** all four ok and none on the debt list. Houses 6 sets: longest, overlap, vote 39% (chance
33%). Harbor 6 sets: middle, general 42%, notVote 39% (learnedXU 50%, advisory). Post 8 sets: longest 42%, posLast 38%.
Show 12 sets: notVote, general 40%. No unit has 3+ number sets, so the number bots don't count yet.

**Children:** makers $20.05, blind solvers $5.77, round 2 $5.68, rechecks $2.03: **$33.53** (Houses $8.72, Harbor
$6.92, Post $8.40, Show $7.91, shared recheck $1.58; about $2.10 a sheet). With the lead's ceiling: about $46.5, or
about $11.6 a unit, a little over the $10 guide.

## What the lead learned (batch 2)

- **Few sets, thin margins.** Houses and Harbor have only 6 choice sets, so one set moves a bot 17 points; every
  round-2 change had to be rechecked against converge (two makers refused the lead's suggested wrong choices because
  they made the key the centre). Suggested wrong choices in a brief should be "e.g.", not orders.
- **Number words and units recur.** All four units patched `parseNum` (², ³, cm2, number words); the "hundred and"
  bug hit every unit until round 2. A shared, tested engine reader (owner's OK) would save each unit the patch. **Done Nov 4, 2026** (owner approved): `numWords` in the engine, tested by `scripts/notes/test-number-reader.mjs`.
- **A word blank that contains a number word** ("less than zero") becomes a number under those patches; makers kept
  such words out of blank answers.
- **Pictures next to questions** worked through `q.pic` patches; no picture gave an answer away in either solve.

# Build log: 📝 worksheet batch 3 (6th grade Pet Fair)

Math batch 3: 🎡 Pet Fair (`g6-fair`, Unit 7, equations and inequalities, 6 sheets, 85 items), missed in batches 1 and 2,
Nov 4, 2026. One unit, so one maker, one blind solver and two fresh rechecks, all cloud sessions on their own branches.
Times are UTC. Child cost is each session's `total_cost_usd`. `checked` is left out (the owner approves).

**Cost counter (the lead's, shared with the coordinating session, so a ceiling):** start $567.86 · after the maker and
the Build 1 merge (19:30 reading) $588.45 · end $591.04 (at most $23.18 for the lead).

| Time | Who | What | Cost |
|---|---|---|---|
| 18:31 | 🧭 Lead | Read the recipe, WORKSHEETS, batch 1–2 log, FAIR.md. Maker brief: the recipe's steps, the six writing rules, batch 1–2 lessons (converge first: inequality and equation choices one change from the key), `kinds: true` like the Potion Lab (equations and inequalities as choices, typed answers are numbers), no ± key, pictures next to questions through `q.pic` patches (numBox, probChoiceHTML, choiceHTML), 6-sheet and minutes patches. Wired `G7_NOTES` and the verify guard | — |
| 18:47 | 📝 Fair maker | Done (a443afb): Taffy the tiger, Gumdrop the koala's mix-ups; tape diagrams, hangers (x squares, 1 circles), number lines (white open, black filled circles), tables, first-quadrant graphs; 26 choice sets, 9 number sets | $5.55 |
| 18:50 | 🧭 Lead | Merged Build 1; every notes unit rebuilt with `git status` clean for the others; verify, typecheck, build pass. `browser-notes.mjs`: 366 checks, 0 failed. Looked at every picture at 375 px | — |
| 18:55 | 🙈 Fair blind | 85/85 matched. FIX 5: S1 p3 two wrong choices the same equation (4x + 3x and 7x); S2 p3 "both sides" only in the key; S3 c2 wrong mix-ups false on a reread; S5 p6 key the only point with r first; S6 p1 key the only `t =`. JUDGMENT 7 + "x = 7" read as no answer. Bots passed every FIX: content cues they can't see | $1.68 |
| 19:10 | 📝 Round 2 (same maker) | Build 2 (04db158): all FIX and judgments; four-choice sets for S5 p6 and S6 p1; "Type just the number" lines; S6 p6 new numbers | $1.22 |
| 19:20 | 🙈 Recheck (fresh) | 17 changed items, 17 matched, no FIX. JUDGMENT 3 (S3 c1 key the longest, S4 p3 "filled circle" refused, S4 c2 key the centre) | $0.96 |
| 19:27 | 🧭 Lead | Build 3: S3 c1 wrong stories as long as the key; S4 p3 takes "filled circle"/"closed circle". S4 c2 left (mix-ups need exactly 3 choices; owner's call) | — |
| 19:30 | 🙈 Recheck 2 (fresh) | The 2 changed items: matched, KEEP | $0.68 |
| 19:37 | 🧭 Lead | `browser-notes.mjs` on Build 3 at both widths and `--s9` with a Build 1 save: 368 + 20 checks, **0 failed**; Build 2 was the same (368 + 20). The 375 px pictures fit with no sideways scroll, labels about 12–17 px, nothing labels the asked value. All 14 notes units rebuilt, others unchanged; verify, typecheck, build pass | — |

**Wilco's notes bots (final):** g6-fair ok, not on the debt list. 26 choice sets (9 number sets), chance 32%: worst
notVote 36%, posLast 35%, overlap 35%, notLongest 34%; converge 26%; number bots at chance (30%); learnedXU 38% (advisory).

**Children:** maker $6.77 (round 2 included), blind solver $1.68, rechecks $1.64: **$10.09** for 6 sheets (about $1.68 a
sheet). With the lead's ceiling: at most about $33 for the unit (the counter is shared, so the real figure is lower).

## What the lead learned (batch 3)

- **The bots passed all five FIX items.** Equal wrong choices (4x + 3x and 7x), a wording only in the key ("both" vs
  "each"), the only choice starting `t =`, the only point with r first: these are content cues; the blind solve is still
  needed on top of Wilco's bots.
- **Mix-up questions must have exactly 3 choices**, so a 2×2 inequality set (≤, <, ≥, >) can only be a Your-turn choice
  problem. Write the mix-up sentences so "or" and the direction word sit in two choices from the start.
- **Algebra units:** `kinds: true` with equations and inequalities as choices and numbers typed worked; "x = 7" typed is
  read as no answer (no try lost), so every typed item that asks for a variable's value says "Type just the number".
# Build log: 📝 worksheet batch E1 (English Units 6–8)

English batch E1: 🦸 Superhero Factory (`ela6-punct`, course `punctuation`, 13 sheets, 171 items), ⏸️ Pause Library
(`ela7-colon`, `colons`, 9 sheets, 119 items) and 🧩 Sentence Library (`ela8-sent`, `sentences`, 10 sheets, 138 items),
one sheet per lesson, Nov 4, 2026. Times are UTC; child cost is each session's `cost_usd`. `checked` is left out of all
three (the owner approves). Each unit sets `texts` (number-word reader off, "About 30 minutes a sheet"); sheets are the
pilot's shape and no longer (blind estimates 26–34 minutes).

**Cost counter (the lead's, shared with the coordinating session and a parallel lead, so a ceiling):** start $570.87 ·
end $597.25 (at most $26.38 for the lead). The first-merge reading was missed.

| Time | Who | What | Cost |
|---|---|---|---|
| 18:20 | 🧭 Lead | Read the recipe, WORKSHEETS, the pilot report and audit, the batch log, the Link Library content. Ran Wilco's bots on `ela5-link`: it fails converge (41% vs 29%), so the brief warned against its "key with one mark changed" choice sets. One brief: the six writing rules, `texts`, no `checked`, typed sentences for punctuation (curly and straight quotes, no typed dashes or italics) | — |
| 18:35 | 🧭 Lead | Three makers at once (`claude/ws-e1-punct`, `-colon`, `-sent`). Wired `libNotesHTML` (`punctuation`, `colons`, `sentences`) and a verify guard (link, `texts`, every sheet) | — |
| 18:49–18:55 | 📝 Makers | Done: Sent (fb2f930, Clause the crocodile's library), Colon (c59f68f), Punct (e6ae001, Sprocket the raccoon; every Spot the mix-up has 4 options because 26 three-option sets would not place without a position pattern). All three bots ok at Build 1 | Punct $7.09, Colon $6.03, Sent $4.68 |
| 18:57–19:02 | 🙈 Blind (fresh, one per unit) | Punct 171/171 matched, FIX 10 (mostly twin wrong choices: two that give the same correction), JUDGMENT 10. Colon 118/119, FIX 8 (`three` refused, `semi-colon` refused, two thin Level 3s, giveaways), JUDGMENT 9. Sent 135/138 (`one`/`two` refused), FIX 8 (minutes added to 41, wrong facts in steps, near-copy choices), JUDGMENT 4. No wrong key | $2.18, $1.91, $2.22 |
| 19:05 | 🧭 Lead | **Build bug:** `build-notes.mjs` and `check-notes-keys.mjs` loaded the engine without the unit, so number words were on and a blank answered "one"/"two"/"three" was stored as a number; English pages (number words off) refused it. Fixed both (and `check-ela5-link-keys.mjs`) to pass the unit's `texts`/`numberWords`. It also hit the approved Link Library (Lesson 4 "one", Lesson 7 "two"): rebuilt as Build 6; no other unit's pages changed. The browser run on Build 1 caught the same bug (punct L9, colon L9) | — |
| 19:07–19:13 | 📝 Round 2 (same makers) | Every FIX plus adopted judgments, Build 2; each maker also checked all its sets for twin wrong choices (punct found 7 more) | $1.02, $1.31, $0.83 |
| 19:36 | 🙈 Recheck (fresh) | 61 changed items: all matched; number words and new forms accepted. FIX 2 (colon L4 c1 comma choice defensible as right; colon L5 c1 twin) | $1.82 |
| 19:45 | 🧭 Lead | Colon Build 3: new wrong choices for both. A second fresh recheck: both KEEP, one why-message improved | $0.53 |
| 20:15 | 🧭 Lead | `browser-notes.mjs` (both widths and the §9 checks): Punct 744 checks, Colon 526, Sent 584, **0 failed**. Looked at 375 px: no sideways scroll, choices wrap cleanly | — |

**Wilco's notes bots (final, after the last rebuild):** all three ok, none on the debt list. Punct 61 sets (chance 27%):
notVote, middle 31%, oddOne 30%. Colon 45 sets (chance 31%): learnedCV 34%. Sent 46 sets (chance 31%): middle 36%
(learnedXU 43%, advisory). Converge stayed at or below chance in all three (15%, 28%, 25% at Build 1).

**Children:** makers $20.96, blind solvers $6.31, rechecks $2.35: **$29.62** (Punct $10.29, Colon $9.25, Sent $7.73,
plus shared rechecks; about $0.93 a sheet). With the lead's ceiling: about $56, or about $18.7 a unit (32 sheets).

## What the lead learned (batch E1)

- **Twin wrong choices are the English pattern.** The bots passed every Build 1, but two wrong choices that give the same
  correction in different words made many mix-up sets 2-choice in effect. The brief should name it; the blind solve
  caught it.
- **English and number words.** Any build-side canon must load the engine with the unit's settings; fixed in the build
  and the generic key check.
- **Minutes:** check the `minutes` total (one maker kept the pilot's 41).
- **Big units place slowly:** 26 three-option sets would not place without a position pattern; four options did.

# Build log: 📝 worksheet batch B1 (Biology Unit 3, the first Biology unit)

Biology batch B1: 🌺 Greenhouse (`bio3-energy`, course `bio3`, photosynthesis and cellular respiration), 3 sheets, 42 items,
one sheet per Khan lesson (photo3, food3, and Khan's fitness-goal activity, activity3), Nov 4, 2026. The first unit of
its subject, so it ran alone. Times are UTC; child cost is each session's `cost_usd`. `checked` is left out (the owner
approves). The unit sets `texts` (number words off; numbers are typed in digits, and the sheets say so).

**Cost counter (the lead's, shared with the coordinating session and the parallel History lead, so a ceiling):** start
$607.84 · first merge $614.61 · end: see the hand-off.

| Time | Who | What | Cost |
|---|---|---|---|
| 22:55 | 🧭 Lead | Read the recipe, WORKSHEETS, the plan, the batch log (E1), SCIENCE-UNIT3, the bio3 banks, videos and term cards. Decided one sheet per Khan lesson, with a third sheet for Khan's activity (an article, no video: it re-lists the Cellular respiration video as optional and links the article). Wrote the unit, `VIDEOS` (copied exactly from `KHAN_VIDEOS.bio3`) and the videos-first `enginePatches` (Watch for first with ▶ links, watch-for count, `pic` on examples, problems and choices), tested them on a throwaway unit. `build-notes.mjs` refused any outside link, so it now allows `www.khanacademy.org` (tap-only; no request) | — |
| 23:02 | 🧭 Lead | Wired `libNotesHTML` (`bio3:'bio3-energy'` and `LESSON_NOTES`: a lesson's practice cards open that lesson's sheet; the activity, which has no practice, gets its link in the lesson block) and a verify guard (link, `texts`, every sheet, every `KHAN_VIDEOS` link of the lesson on its sheet, no Khan link that isn't in `KHAN_VIDEOS`/`KHAN_LINKS`) | — |
| 23:06–23:16 | 📝 Maker | Build 1 (06431ed): 3 sheets, 42 items, pictures (van Helmont's willow, the two processes as a cycle, a breaths bar chart). Bots ok after the maker cut converge 40% → 13% on 6 sets | (see round 2) |
| 23:17 | 🧭 Lead | `browser-notes.mjs` Build 1: 204 checks, 0 failed. Looked at the 375 px pictures and Watch for blocks | — |
| 23:20 | 🙈 Blind (fresh) | 42/42 matched; no wrong key, **no fact problem** (both equations balanced; chloroplasts only for plants and algae; mitochondria "mostly"; breathing ≠ respiration; energy released, not made; van Helmont's numbers). FIX 5: three accepted forms (`chemical energy`, `heat energy`, `both day and night`), 2.p5 three twin "the matter vanished" wrong choices, 3.c2 key the only "His breathing…" choice. JUDGMENT 6 | $1.30 |
| 23:22 | 📝 Round 2 (same maker) | Build 2 (7aef475): all FIX plus adopted judgments (1.c1 twin, sheet 3 re-watch optional, a watch-for line the video surely covers, `carbon-dioxide`) | $3.46 (maker total) |
| 23:25 | 🙈 Recheck (fresh) | The 9 changed items: all matched, 8 KEEP, no FIX. JUDGMENT: 3.c2 still flagged by item-level cues (unit-level bots pass) | $0.72 |
| 23:35 | 🧭 Lead | Build 2: `browser-notes.mjs` with a Build 1 save (`--old 06431ed`): 206 checks at 375 and 1280, **0 failed**. Other notes units rebuilt unchanged. verify, typecheck, build pass | — |

**Wilco's notes bots (final, Build 2):** bio3-energy ok, not on the debt list. 15 choice sets (1 number set), chance 25%:
posLast 33%, notVote 30%, longest and posA 27%, oddOne 26%; converge 13%; learnedXU 13% (advisory). `npm run fairness:notes`:
13 of 18 pass, the 5 failures all on the debt list (unchanged).

**Children:** maker $3.46 (round 2 included), blind solver $1.30, recheck $0.72: **$5.48** for 3 sheets (about $1.83 a sheet).

## What the lead learned (batch B1, for the rest of Biology and for History)

- **Videos first needs three things the engine doesn't have yet:** the Watch for block above Try it, the lesson's ▶ links,
  and a watch-for count other than 3. `bio3-energy`'s `enginePatches` (the `HELPERS` block and the splice) are written to
  move into `engine/notes.js` as they are; until then each History/Biology unit copies them. Also copy the `texts` that
  turn "Try it first … No rules yet" into a post-video guess.
- **Outside links:** the build refused every `http` link; it now allows `www.khanacademy.org` only, and verify checks each
  sheet's Khan links against `KHAN_VIDEOS`/`KHAN_LINKS`, so no video id can be invented.
- **Sheet = Khan lesson, not practice.** Biology's practices are Understand/Apply pairs; `LESSON_NOTES` maps both to the
  lesson's sheet. A lesson with no video (Khan's activity) still gets a sheet: an optional re-watch of the nearest video
  plus the article link.
- **Few choice sets.** Three sheets give only 15 sets, so one set moves a bot about 7 points; the maker had to rewrite 6
  sets for converge. Bio Units 4 and 5 have 3 lessons each too: expect the same.
- **Typed science words need many forms:** singular/plural (stoma/stomata, mitochondrion/mitochondria), `CO2`/`CO₂`/
  `carbon dioxide`, a word plus "energy" (`chemical energy`, `heat energy`), and word-order variants of phrases
  (`both day and night`). The blind solve found three missing forms; list them from the start.
- **Twin wrong choices are the Biology pattern too** (three "the matter vanished" choices): the bots pass them; the blind
  solve catches them.
- **Owner's calls left open:** 3.c2 (item-level cues; a strict 2×2 would fix it), 1.p2 "stomata" is named only in the
  key and hint (it is in the bank), the try-it answers (green, day and night) appear in later key ideas, 2.c2's key is close
  to the mix-up box's wording, and the sheet 3 minutes (about 30 once the re-watch is optional).
