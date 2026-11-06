# 🙈 Blind solve: 🏆 Pet Show note sheets (g6-show, Build 1)

Fresh solver, student view only (`scripts/notes/g6-show-content.mjs` and the built `public/notes/g6-show/station-N.html`).
Pictures were read off the rendered pages at 375 px (Playwright screenshots of every `.fig`). No key file, teacher copy,
review packet or key-check script was opened before every answer was written down. Each answer was hashed as
`PWN1|g6-show|s<n>:<item>|<canonical>` with the engine's own canon functions (engine in `node:vm`, with the unit's
`enginePatches`) and compared with the page's `acc` hashes. Then `check-notes-keys.mjs g6-show` ✅ (84 items, 124 right
hashes), `check-g6-show-keys.mjs` ✅ (choice sets clean) and `notes-test-wise.mjs --units g6-show` ✅ (1 of 1 unit passes).

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|
| 1 Sign-In Desk | 14 | 14 | 1 | 1 | 28–32 |
| 2 Judges’ Table | 14 | 14 | 1 | 0 | 28–32 |
| 3 Score Cards | 14 | 14 | 0 | 0 | 30–34 |
| 4 Tie Breakers | 14 | 13 | 0 | 2 | 28–32 |
| 5 Ribbon Ranges | 14 | 14 | 2 | 0 | 30–35 |
| 6 Best in Show | 14 | 14 | 1 | 2 | 30–34 |
| **All** | **84** | **83 (99%)** | **5** | **5 (+2 unit-wide)** | all inside 25–35 |

The one miss was mine (S4 c2: I misread 5 × 8 as 48; the key, “divided by 5”, is right and the 40 distractor is a fair
trap). No math key is wrong, no item is unsolvable, no two choices are equal. KEEP: the other 74 items.

## Unit-wide

- **Typed forms (probed):** word numbers accepted everywhere tried (“four”, “twenty-eight”, “forty-five”, “twenty five”);
  means as 23.5 / 23 1/2 / 47/2 / “twenty-three and a half” / “twenty three point five” / “23 and a half” all accepted;
  4.8 / 4 4/5 / 24/5 / “four point eight”; 0.5 / .5 / 1/2 / “one half” / “a half”; units (“23.5 pounds”, “25 lbs”,
  “45 pets”, “about 45”, “30 %”, “30 percent”, “thirty percent”) accepted. Refused: “half” alone (S3 p6), “eight tenths”
  (S6 p6), Unicode “23½” (KEEP, low priority).
- **JUDGMENT – percent boxes (S1 p5, S2 p6):** 0.3, 3/10, 6/20, .35, 7/20 get a plain “not right”, no message. The box
  shows “%”, so they are wrong as typed, but a miss message (“write it as a percent: out of 100”) for the fraction/decimal
  forms would help.
- **JUDGMENT – blanks a kid might type:** S1 k1-1 “will vary” / “varies” refused (“answers that will vary” reads fine);
  S5 k1-1 “rectangle” refused for “box”; S2 k4-1 “weight” refused (the hint’s own example is weights). Consider accepting.
- **Length/choice cues (bot, 12 sets, chance 33%):** longest 25%, shortest 42% (+8.7), general 42% (+8.7), middle 33%,
  positions 33/33/33, converge 31%. **Passes**; shortest and general are the closest to the 10-point line. Number sets
  (S3 c1, S5 c1): key smallest once, middle once.
- **Pictures:** every problem picture is drawn to scale, black on white with gray bars, readable at 375 px with no
  horizontal scroll (scrollWidth 375 on all 6 pages), and no problem `picAlt` gives the asked value (example alts list
  counts, which is fine). Hint steps are hidden behind the hint button; S3 p4, S6 p5 and S6 p6 steps state the totals and
  means, so a hint opener skips the reading (design, as in batch 1).
- **Pages:** all 6 say “About 33 minutes plus the video” and the hub/save text says 6 sheets. My count of required work
  is 28–35 per sheet, inside 25–35.
- **Matches the stations:** 1 statistical questions/frequency tables/dot plots, 2 center + histograms, 3 mean/median,
  4 missing values and changes, 5 IQR/box plots/MAD, 6 shape/clusters/outliers.

## Per sheet

**Sheet 1**
- **FIX c1** distractor “How many hours did the show’s judges spend judging on Saturday?” asks about a group (several
  judges), so per-judge answers vary and a careful kid can call it statistical too: two defensible answers. Make it
  clearly one-answer, e.g. “How many hours long was the show on Saturday?”.
- JUDGMENT k5-1 (“12 pets … {} dots”): the answer is the number in the same sentence; it’s a free point.

**Sheet 2**
- **FIX c1** absolute-word giveaway: both wrong choices say “exactly” (“exactly 3 … scored 9 points each”, “exactly 15
  points”), the key doesn’t, and the key just restates the stem (“10–19: 8 pets”). Reword one distractor without
  “exactly”, e.g. “The highest score any pet got.” or “That the 8 pets in 10–19 scored about 15 on average.”
- KEEP p5 (0–32 line labeled every 2): 23 and 24 are readable by counting ticks.

**Sheet 3**
- No FIX or JUDGMENT. p5 (median from a frequency table) and p6 (difference of two means) are real two-step Level 3s.

**Sheet 4**
- JUDGMENT p6 (L3, 14 → 24, mean up by 10 ÷ 5): it is mix-up 3 (“the total went up 12, so the mean went up 12 ÷ 4”) and
  Example 2 (9 → 24) again; the five scores are never needed. A real second step would ask for the new mean, or the new
  mean and median.
- JUDGMENT k5-1 (“mean of 5 … keeps the mean at {}”): the answer is in the sentence; the hint then gives 20 ÷ 4.

**Sheet 5**
- **FIX c1** quartile method: for 2, 4, 5, 7, 8, 10, 13 the choice 4.5 is Q1 under the include-the-median method (Tukey
  hinges, some calculators), so the set has two defensible keys. Only the hidden hint says “leave the median out”. Put it
  in the stem (“…Which is Q1? Leave the median out of the halves, as in Example 1.”) or swap 4.5 for another wrong value
  (e.g. 5, the 3rd value).
- **FIX p6** “How many of the pets scored more than 5?”: a box plot can’t give an exact count (pets can score exactly 5,
  and Q1 is a cut, not a count), so 45 is only an estimate. Say “**About** how many…”, as p4 already does.

**Sheet 6**
- **FIX p5 picture** (0–30 line, ticks 9.7 px apart, dots r ≈ 4): at 375 px the seven low dots are tiny and touch, and
  the outlier 29 has to be found by counting 4 ticks past 25. The answer needs every exact value (mean with and without).
  Shorten the line (e.g. 0–20 with the outlier at 19 or 20) or label every 1 near the cluster; the dots get bigger with it.
- JUDGMENT c1: the key echoes the stem (“dots that **stretch out** to 9” → “a tail **stretches out** to the right”) and
  key idea 2. Change the stem wording (“a few dots go as high as 9”).
- JUDGMENT c2: the key repeats key idea S2 k4 and shares “exact” with the stem; both distractors (“shows the five-number
  summary”, “stacks one dot per dog”) are facts about other displays that a kid can drop on sight. Fresher wrong choices,
  e.g. “30 dogs is too few for a histogram to have a median.” / “The tallest bar is always the median.”


## Recheck after round 2 (Build 2)

A fresh blind solver re-solved only the changed items, from the student view (content file, built pages, engine). Answers
were written down first, then judged by the built page's own `judge()` (run in headless Chromium against the page's `acc`
hashes). Keys opened only after. Key checks ✅ and `notes-test-wise.mjs --units g6-houses,g6-harbor,g6-post,g6-show`: 4 of 4 pass.

| Item | My answer | Matched first | Verdict |
|---|---|---|---|
| S1 c1 | How many hours do the dogs at the show sleep each night? | yes | KEEP: lengths close (56/60/51), key in the middle |
| S2 c1 | How many of the pets scored 20 or more | yes | KEEP: “more than 15” and “which score” both need exact values |
| S5 c1 | 4 (lower half 2, 4, 5) | yes | KEEP: 3 and 5 are real slips; the middleValue bot hits it here but stays inside the rule over the unit |
| S6 c1 | Skewed right | yes | KEEP: “skewed left, because most dots sit on the left” is the classic mix-up |
| S6 c2 | A histogram groups the weights into intervals | yes | KEEP: key is the longest (75 vs 58, 54), but the unit's longest bot is 28% vs 33% |
| S5 p6 | 45 (5 is Q1, 75% of 60) | yes | KEEP: “About how many” fits; 5 sits between the 4 and 6 labels and the alt says a tick at every whole number |
| S6 p5 | 2 (mean 56 ÷ 8 = 7, without 21: 35 ÷ 7 = 5) | yes | KEEP: the 21 dot reads clearly between the 20 and 22 labels on the 0–22 line |
