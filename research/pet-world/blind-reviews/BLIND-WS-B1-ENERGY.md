# 🙈 Blind solve: 🌺 Greenhouse note sheets (bio3-energy, Build 1)

Fresh solver; I did not write this unit. Before I had written down every answer, I opened only the student view: `scripts/notes/bio3-energy-content.mjs`
(including its `enginePatches`), the built `public/notes/bio3-energy/station-1..3.html` pages and the engine
(`scripts/notes/engine/notes.js`). I opened no key file, teacher copy, review packet or key-check output before then. After that I
opened `src/shared/questionBanks.js` (`KHAN_VIDEOS.bio3`, `KHAN_LINKS.bio3`) for the video check, and then `scripts/notes/bio3-energy-keys.mjs`
to explain the mismatches.

Each answer was hashed as `PWN1|bio3-energy|s<n>:<item>|<canonical>`. I used the engine's own canon functions (the patched engine loaded in
`node:vm` with the unit's `texts`, the same way `check-notes-keys.mjs` loads it): `textCanon` for word items, `canonOf` for blanks and
numbers, `'opt:' + sentCanon(x).slice(2)` for choice problems, and `optCanon` for c1–c2. I compared the hashes with the page's stored right
and miss hashes and probed about 60 typed variants. Then I ran:

- `node scripts/notes/check-notes-keys.mjs bio3-energy`: ✅ 42 items. All 96 stored right hashes come from accepted forms, no miss is also a right answer, number forms agree, and the 15 choice sets have no equal values.
- `node scripts/notes/notes-test-wise.mjs --units bio3-energy` (and `--items`): ✅ exit 0. 15 choice sets, chance 25%. The highest cues were posLast 33%, notVote 30%, and longest, middle and vote at 27%. Nothing is more than 10 points over chance. Inside the one number set, `smallest` and `quotient` pick 3.p5. That is expected for a "how many times" item, and the bot counts it as advisory.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|
| 1 Photosynthesis in organisms | 14 | 14 | 1 | 2 | 27–32 |
| 2 Food and energy in organisms | 14 | 14 | 3 | 1 | 30–35 |
| 3 Activity: measuring cellular respiration | 14 | 14 | 1 | 2 | 32–38 |
| **All** | **42** | **42 (100%)** | **5** | **5 (+1 unit-wide)** | the page says 30 |

No key is wrong, and no choice set has two right answers. Each FIX below changes wrong choices or adds accepted forms that a student would
type. None of them changes a right answer.

## Unit-wide

- **🎬 Videos:** these are exact. Sheet 1 lists `Photosynthesis in organisms` and sheet 2 lists `Food and energy in organisms` and `Cellular respiration`, each with the title and URL
  exactly as `KHAN_VIDEOS.bio3.photo3` / `.food3`. Sheet 3 has `activity3: []` and no video of its own, so it re-lists `Cellular respiration` with a `videoLead` saying so,
  and its 📄 article link is exactly `KHAN_LINKS.bio3.activity3`. I checked the built pages too. The watch-for items are plausible for those videos. The one exception is noted under sheet 3.
- **Science accuracy:** everything I checked is right.
  - The photosynthesis equation (6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂) and the respiration equation (C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + energy) are both balanced, and the carbon count in Example 1 is right.
  - Chloroplasts are named for plants and algae, and the sheet says bacteria photosynthesize with no such parts. Chlorophyll takes in red and blue light and bounces back green.
  - It says respiration happens "mostly" in mitochondria (fair, because glycolysis runs in the cytoplasm), in plant and animal cells, day and night.
  - Breathing and cellular respiration are kept separate: in Example 1's "say" line, problem 2.p1, the mix-up box and 2.s1.
  - Energy is "released" or "freed", never "made", in idea 2.k4, the mix-ups and 1.c2. Matter is rearranged, never destroyed, in 1.Ex1, 2.k5 and 2.p5.
  - The van Helmont numbers are historically right: a 5 lb willow grew to about 169 lb in 200 lb of dry soil that lost about 2 oz.
  - Extra CO₂ giving more growth (1.p5, worded "most likely") is right.
  - The seed sprouting on stored food by respiration (2.p3), and heat as the lost energy (2.p4), are right.
  - The 15-second × 4 pulse method, the resting rates (72 bpm, 14 breaths/min) and "the heart starts slowing within a minute" are realistic.
- **Pictures:**
  - All three are readable at 375 px and in black and white.
  - The willow picture labels only the given measurements, not where the mass came from.
  - The cycle picture names no cell part and no kind of energy, so it leaves the answers to k3 (mitochondria) and k4 (releases) unlabeled. It does write "carbon dioxide + water", which is the content of the 2.p5 key. That is a worked example, so KEEP.
  - The bar chart shows 14 and 32. The difference it asks for is worked out in the example's own steps.
- **Typed forms (about 60 probed):**
  - Accepted, and well chosen: `CO2`, `co₂`, `co 2`, `carbondioxide`, `O2`, `H2O`, `sunlight`, `solar`, `light energy`, `chloroplast(s)`, `stoma/stomata/stomates/stomas`, `mitochondrion/mitochondria`, `frees`, `lets out`, `unlocks`, `lost` (2.k5, a second defensible word), `glucose`, `sugars`, `food`, `pumps`, `four`/`4` (3.k2), `thermal`, `warmth`, `48 grams`, `80 bpm`, and trailing periods.
  - Refused with a helpful message: `pores`, `created`, `made`, `sweat`, `energy`, `night`, `only at night`, `day`.
  - Number words (`six`, `two`, `eighteen`) are refused on number problems. That matches the unit's stated rule ("Type numbers in digits"), so KEEP.
  - The gaps are listed per sheet.
- **Try-it answers appear lower on the same page (JUDGMENT, unit-wide):** idea 1.k4 says "bounces green light back" (1.t1 = green), and idea 2.k3 says
  "day and night" (2.t1). The texts patch says "the key ideas below will check it", so this looks intended: the try-it is a warm-up guess.
  If you want it clean, move the green clause from idea 4 into Example 1's steps, below the try-it's reach.

## Sheet 1: Photosynthesis in organisms

My answers: t1 green; light, water, oxygen, chloroplasts, chemical; p1 carbon dioxide and water; p2 stomata; p3 stops (no light); p4 48; p5 Pot A (more CO₂ → more sugar); p6 18; c1 swapped gases; c2 atoms come from CO₂ and water. All matched.

- **FIX: k5-1 does not accept `chemical energy`.** k1-1 ("uses {} energy") accepts `light energy`, but k5-1 ("stored as {} energy") refuses
  `chemical energy` and shows no message. That is inconsistent, and a student who types the whole phrase is marked wrong. Add `chemical energy` to the accepted forms.
- **JUDGMENT: 1.p2 "stomata" is a word found only in the key.** Nothing on the sheet (ideas, examples, watch-for) names stomata. The hint gives "st-", and
  `pores` gets "Right idea! Type their science name." Reading 1: it is a Level 1 vocabulary item the video is likely to cover, so KEEP. Reading 2: a Level 1
  "find it" item should be findable on the sheet, so add "through tiny holes called stomata" to Example 1 or idea 2.
- **JUDGMENT: 1.c1 has twin wrong choices.** Two of the wrong choices share the frame "He has the gases right, but…". The key is the only choice that says the gases are wrong, and
  Jonah's sentence makes that obvious anyway. The bot flags middle, general and notVote but not oddOne, so it passes. Reading 1: the item is meant to be easy, so KEEP.
  Reading 2: reword one twin so that it also names a gas problem, for example "He has the sugar right, but the oxygen comes in through the roots."
- KEEP: 1.c2 is a 2×2 grid (energy or atoms × the source), so its paired openings are balanced. 1.p5 has a real second step (what CO₂ is for → which pot has more).
  1.p6 means reading 6 CO₂ per glucose from the recipe and then × 3, which is a light Level 3 but a real one. 1.p4 = 48 has the same value as 3.p4. They are on different sheets, so KEEP.
- KEEP: `green light` (t1), `oxygen gas` (k3; "gas" is printed after the blank), and `chemical energy` aside, the blank forms are fine.

## Sheet 2: Food and energy in organisms

My answers: t1 day and night; matter, blood, mitochondria, releases, destroyed; p1 muscle cell breaks down sugar; p2 6; p3 stored food + respiration; p4 heat; p5 CO₂ and water left the body; p6 2; c1 energy stored in sugar; c2 plants also break sugar down. All matched.

- **FIX: 2.p5 has three wrong choices that all make the same mistake.** "turned into pure energy, so that matter no longer exists", "broke the atoms apart until
  none of them were left" and "became body heat… has no mass" all say that the matter vanished. Once a student knows that matter is conserved, the key is the only choice left. The bot
  flags `oddOne` and `converge` on this item. Replace one or two with a different wrong idea that keeps the matter, for example "It was stored as
  extra sugar in the hamster’s cells, waiting to be used." or "It all left as droppings, because the cells used none of it."
- **FIX: 2.p4 does not accept `heat energy`.** `thermal energy` is accepted, but `heat energy` is refused and shows no message. A student who has just read "Type one word" might still write
  it. Add `heat energy`.
- **FIX: 2.t1 does not accept `both day and night` or `in the day and night`.** The key has `day and night both` but not the more natural word order.
  Both of these get no message, which is confusing on a warm-up. Add `both day and night`, `in the day and night` and `day & night`.
- **JUDGMENT: 2.c2's key almost repeats the mix-up box.** The key "Plants make sugar, and their cells also break it down for energy" is close to word for word the
  "Plants skip respiration" mix-up on the same sheet ("Plants make sugar, and then their own cells break it down for energy"). Reading 1: spot-the-mix-up
  practises the mix-ups the sheet just taught, so KEEP. Reading 2: it can be answered by matching words, so reword the key's choice (for example "Plant cells need energy too, so they
  break down the sugar they made.").
- KEEP: 2.c1's key is the longest and most specific choice (the bot flags longest, specific, vote and converge on this item), but unit-wide those cues are at chance.
  2.p6 (12 ÷ 6) is a light Level 3 that mirrors 1.p6, so KEEP. In 2.k5, `lost` is accepted next to `destroyed` (two defensible answers, both accepted).
  `mass` for "matter" is refused with no message. KEEP, because mass is a property and not the stuff, but a "Right idea" message would help.

## Sheet 3: Activity, measuring cellular respiration

My answers: t1 up; beats, 4, same, sugar, carbon dioxide; p1 80; p2 speeds up and gets deeper; p3 count again the same way; p4 48; p5 2 times + more oxygen; p6 2; c1 multiply by 4 → 120; c2 tripled, needed more oxygen. All matched.

- **FIX: 3.c2's key is the only choice in a different form.** The key starts "His breathing tripled…" and all three wrong choices start "It…". The bot
  flags `overlap`, `oddOne` and `vote` on this item. Make the wrong choices start the same way as the key ("His breathing doubled, …", "His breathing tripled, which shows his lungs…"), or
  change all four to "It…" only if you want to edit the key text (that is a choice text, not the answer).
- **JUDGMENT: the minutes.** This sheet asks her to re-watch Cellular respiration, read Khan's article, and do the exercise twice (rest, jog or jump, count),
  as well as 14 items and 2 short answers. I estimate 32–38 minutes, which may be over the 30 on the page and above the 25–35 target. Reading 1: the exercise is the point of the lesson, so KEEP.
  Reading 2: make the re-watch optional ("if you need a reminder") to bring it back to about 30.
- **JUDGMENT: one watch-for item may not be in the video.** "Working muscles need more energy than resting ones" is the activity's idea, and it may not be said in the
  Cellular respiration video that the sheet sends her to. Reading 1: KEEP, because she will hear it implied. Reading 2: reword it as "Cells release energy the body uses to move."
- KEEP:
  - 3.p5 is a 2×2 grid (2 or 15 times × uses or makes oxygen), so it is balanced. The `smallest` and `quotient` number cues land on the key, but that is the asked operation.
  - 3.p2 is a 2×2 grid (faster or slower × deeper or shallower).
  - 3.p3's key is the longest choice, but the item's only change is the clause "the same way". KEEP.
  - 3.p6 has two real steps (84 − 72, then ÷ 6).
  - 3.k5 refuses `carbon-dioxide` (hyphen) and `carbon dioxide gas` with no message. These are minor, so add them if convenient.
  - The safety line ("Do the exercise with a grown-up nearby") is present.

## Recheck of Build 2 (fresh rechecker)

Checked commit 7aef475 (Build 2) against 06431ed (Build 1), student-side changes only. I wrote my answers from the student pages and the content file before opening the keys, then
checked them against the stored hashes in `public/notes/bio3-energy/station-N.html` with the engine's own canon functions (node:vm, as `check-notes-keys.mjs` loads it).
`node scripts/notes/check-notes-keys.mjs bio3-energy`: ✅ 42 items, 103 right hashes, exit 0. `node scripts/notes/notes-test-wise.mjs --units bio3-energy --items`: exit 0.

| Item | My answer | Matched | Verdict | Note |
|---|---|---|---|---|
| 1.c1 | A (swapped the gases) | ✅ | KEEP | New D ("sugar right, but the oxygen gets in through the roots") keeps Jonah's oxygen-in error, so it is wrong. C and D both blame the roots, but for different things (where sugar is made, how a gas gets in), so not twins. Bot: middle/general/notVote only. |
| 1.k5-1 (forms) | chemical | ✅ | KEEP | `chemical`, `chemical energy`, `Chemical` accepted; `light` gets its miss message. |
| 2.p4 (forms) | heat | ✅ | KEEP | `heat`, `heat energy`, `Heat.`, `thermal`, `thermal energy`, `warmth` accepted; `sweat` gets a miss. |
| 2.p5 | A (CO₂ and water left the body) | ✅ | KEEP | No twins now: destroyed / still inside / droppings. D is partly true in life (some seed matter leaves as droppings), but its reason ("cells can't use seeds") is false and the stem asks for *much* of the matter, so A is the one defensible answer. Matter conserved in the key. No bot flags. |
| 2.t1 (forms) | in the day and at night | ✅ | KEEP | `both day and night`, `in the day and night`, `in the day and at night`, `day and night`, `both`, `all the time` accepted; `only at night` / `only in the day` get misses. Bare `at night` gets no message; it is a guess item, so minor. |
| 3.c2 | A (tripled, cells needed more oxygen) | ✅ | JUDGMENT | All four now start "His breathing…" as asked, but the item bot still flags `overlap`, `oddOne`, `vote`, `converge` on the key. The reasons are not a clean grid: A "cells needed more oxygen", B "muscles needed extra air" (same idea, other words), C "lungs were making oxygen", D "cells made more oxygen". The key is the one choice that shares a part with every other choice. Suggest a strict 2×2 with matched wording: tripled/doubled × "his cells needed more oxygen" / "his cells made more oxygen". Science is right in the key; C correctly treats lungs-making-oxygen (breathing ≠ respiration) as wrong. Unit-level bot still passes. |
| 3.k5-1 (forms) | carbon dioxide | ✅ | KEEP | `carbon dioxide`, `carbon-dioxide`, `carbon dioxide gas`, `CO2`, `CO₂`, `Carbon Dioxide` accepted; `oxygen` gets a miss. Build 1's minor note is closed. |
| Sheet 3 videoLead | — | — | KEEP | "Re-watch … if you need a reminder" makes the re-watch optional, as Build 1's Reading 2 suggested. |
| Sheet 3 watch-for 3 | — | — | KEEP | "Cells release energy the body uses to move and stay warm" is accurate (respiration releases energy; some leaves as heat) and fits the Cellular respiration video's topic. I did not check it against the video's transcript. |

**Summary:** 8 KEEP, 1 JUDGMENT (3.c2: test-wise flags remain after the Build 2 rewording). No FIX. All my blind answers matched the stored keys.
