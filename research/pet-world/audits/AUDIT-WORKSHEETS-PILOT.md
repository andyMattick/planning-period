# Token audit: 📝 worksheet pilot (Bakery and Link Library) and a budget for the other 24 units

By the 🔎 auditor, Nov 2, 2026. **It only recommends.** No code, content or other docs changed, no agents started.
Sources: `WORKSHEETS-PILOT-LOG.md`, `WORKSHEETS-PILOT-REPORT.md`, `WORKSHEETS-PLAN.md`, the "🔎 Auditor" rules in
`AGENTS.md`, the four checker docs (`BLIND-`, `KEYS-`, `BROWSER-`, `RECHECK-WS-PILOT.md`), and `git log --stat
4d8b0ab^..8289eb2`. I did not open the sheets or `game.js`. Dollars are the sessions' **reported** figures (API prices,
not a bill). Anything marked "guess" is my estimate, not a measurement.

## The headline

- Child sessions cost **$16.41**. The lead cost **$9–13.51** (the counter is shared, so $13.51 is the ceiling). All in:
  **about $26–30 for 2 units and 13 sheets**, or **$2.0–2.3 a sheet**, **$13–15 a unit**.
- The plan said **$5–8 a unit**. The children alone fit that ($6.46 Bakery, $9.96 Link). The lead roughly doubles it.
- **The lead is 35–45% of the cost.** Half of that is waiting, not working.
- Every real content problem came from one cheap check, the blind solve. The only real bug came from the recheck.
- At the pilot's rate the other 24 units cost **about $285–375**, more than the plan's $120–190. With the
  recommendations below: **about $215–265**.

## 1. Where the cost went

| Session | Tier | Min | Cost | Share of $16.41 |
|---|---|---|---|---|
| 📝 Bakery maker | main | 10.5 | $3.16 | 19% |
| 📝 Link Library maker + engine | main | 17.5 | $5.21 | 32% |
| 🙈 Blind solver | main | 3.5 | $1.40 | 9% |
| ✅ Key checker | main | 5 | $1.86 | 11% |
| 🌐 Browser check | cheaper | 18 | $1.12 | 7% |
| 📝 Round 2 | main | 4 | $1.59 | 10% |
| ✅🙈🌐 Recheck | main | 15 | $2.07 | 13% |
| **Children** | | | **$16.41** | 100% |
| 🧭 Lead (86 min wall clock) | main | 86 | **$9–13.51** | |
| **Pilot** | | | **$25.4–29.9** | |

**The lead's share:** $9 ÷ $25.4 = 35%; $13.51 ÷ $29.9 = 45%. Say **35–45%**.

**The lead, by minutes.** The log shows about **37 minutes of work** (read, brief, merge, decide, step in, report) and
**49 minutes of waiting** (children running, plus the 9-minute polling mistake). Its cost ran about $0.10–0.16 a minute
($9–13.5 ÷ 86), the same range as the Unit 12 audit ($0.122). So **waiting cost about 49 × $0.10–0.16 = $5–8**, more than
half of the lead's bill. The two big spends: the first six minutes of reading seven docs, and the 12-minute step-in at
18:20.

**Per unit and per sheet** (the report's split: checkers by items, lead evenly):

| Unit | Sheets | Children | Lead | Total | Per sheet |
|---|---|---|---|---|---|
| Bakery | 5 | $6.46 | $4.5–6.75 | **$11–13** | $2.3–2.6 |
| Link Library | 8 | $9.95 (includes the one-time engine work, guess $1–2) | $4.5–6.75 | **$14.5–16.7** | $1.8–2.1 |

Children per sheet: Bakery $1.29, Link $1.24 (about $1.05 once the engine work is taken out).

**By kind of work (children):** making $8.37 (51%: two makers) · checking $6.45 (39%: blind, keys, browser, recheck) ·
fixing $1.59 (10%: round 2). Reporting was done by the lead.

## 2. What each check caught, against its cost

| Check | Cost | Real problems caught | Verdict |
|---|---|---|---|
| Build gates (`build-notes.mjs`) | in the maker | A hash collision (5.4 / 54); a key that was the longest choice | **Keep.** Free. It did not look at the *shortest* key, and that was the biggest miss. |
| 🙈 Blind solve | $1.40 (3.5 min) | **All content problems.** 179 of 179 items matched. 15 FIX, 12 JUDGMENT. 12 of the 15 FIX were one pattern: the key is the shortest choice (9 of 16 mix-ups, about 60% against 33%). Also a giveaway (reused Example 1's numbers) and a middle-value key | **Keep, unchanged.** It is the cheapest and the best. About $0.008 an item. |
| ✅ Key checker | $1.86 (5 min) | **No wrong key.** One real catch: two Bakery set-ups with the same sum (s1 c1). The blind solver had said "no equal choices" and missed it | **Keep what it proves, not the session.** The value tie is exactly a script job. The hash-integrity checks are generic. |
| 🌐 Browser check | $1.12 (18 min) | **Nothing in the sheets.** 710 checks, 0 failed | **Keep as a script, not a session.** The script is the asset. Its job is to fail loudly, and it can be rerun free. |
| 📝 Round 2 | $1.59 (4 min) | Not a check. It fixed 15 FIX, 8 judgments and 4 Bakery items. It introduced 2 new problems (s4 c1 digits only in the key; s5 p4 "all day" clashes with the sheet's own test) | A fix session. It will be smaller if the first build is fairer. |
| ✅🙈🌐 Recheck | $2.07 (15 min) | **The only real bug.** Saves with a stored explanation never reopened as "This question changed". Also the 2 new problems above. It also wrote the §9 script that now tests this | **Keep the blind part.** The browser and §9 reruns are scripts now. |
| Lead's step-in | 12 min, about $1–2 (guess) | Fixed the restore bug with per-unit patches and 2 judgments. Reran everything | **Right call for a small fix.** It should be an engine fix so each unit does not need it. |

**If one check were dropped, what catches the same things?**

- *Key checker dropped:* the blind solver already solves from the student view and matches every item to the stored
  hash, which is an independent solve. A build gate catches value ties (exact fractions) and "a miss hash equals a right
  hash". The blind solver would be told to recompute math items with exact arithmetic. **Evidence for care:** the blind
  solver missed the tie, so the gate must come *first*.
- *Browser session dropped:* the same script run by the lead. It found nothing in the sheets, but a page error or
  sideways scroll is exactly what it checks. New picture types and the History/Biology video block are *not* covered,
  so the first unit of each of those gets a person-style look from fresh eyes.
- *Recheck dropped:* nothing catches a second-order fix error except a second blind pass on the changed items. Do not drop it.
- *Blind solve dropped:* nothing. The test-wise bot (`check-fairness --courses`) does not run on worksheets. Do not drop it.

## 3. Ranked recommendations

Arithmetic uses the per-unit costs in section 1. "Units" = the 24 still to do (15 text units: 7 English, 5 History,
3 Biology; 9 math).

### Free wins

**R1. A child tells the lead when it is done, and the lead stops polling branch shas.**
Put in every brief: "When finished, `send_message` the lead: `done <full sha>`." The lead then waits for that, or
checks `get_session` `status_bucket` once, never a branch sha. A session that finishes cleanly does not report back by
itself, so the brief must ask.
- *Saving:* the pilot lost 9 minutes × $0.10–0.16 = **$0.9–1.4** once. Over about 6 batches, if half repeat it:
  **$3–4, up to $8**. Say **$3–8 total**.
- *Quality risk:* none.
- *Catch:* the lead's log shows the gap between "done" and "merged". The wall clock is visible.

**R2. A shortest-key gate in the build, using the fairness bot's own rules.** The makers missed the pattern because
`check-fairness.mjs --draft` was not in their brief, and the build gate only rejected the *longest* key. Two parts:
1. Put the "Writing questions" rules and `--draft` in the maker's brief (`AGENT-STARTER.md` already has them).
2. Make `build-notes.mjs` run the same check on every choice set in the unit: write the choices into the draft format
   (a 30-line adapter) and fail the build if the key is the shortest, longest, middle-length or odd-one-out choice more
   than about 10 points over chance across the unit. For number choices, also fail if the key is the middle value.
   `--draft` itself works on item files, so it needs the adapter. The gate runs on every build, and the maker cannot skip it.
- *Saving:* in Link, 12 of 15 FIX were this pattern (80%). Round 2 for Link was about $1.1 and the ELA half of the
  recheck about $1.0, so 80% of round 2 and half the recheck: 0.8 × $1.1 + 0.5 × $1.0 ≈ **$1.0–1.5 a text unit**.
  15 text units: **$15–22**. One-time cost to build the gate: $0.6–1.2. **Net about $14–21.** Math units gain nothing from this.
- *Quality risk:* the gate may flag a small set unfairly. Use the unit as the sample, as the bot does, not a sheet.
- *Catch:* the blind solve (it found the pattern in the pilot) and the weekly full-site fairness run.

**R3. Fix the restore bug in the engine, behind a `kinds`-style flag, so a new unit never needs a patch.**
Make "recheck every saved right answer on load" the default in a marked block like `/*@kinds*/`. Today the old g7 pages
rebuild byte for byte, and they keep the old behavior until the owner OKs a rebuild (owner to-do 3). New units turn it on
by default. This removes the per-unit `enginePatches` the lead wrote at 18:20.
- *Saving:* small: the lead's step-in minutes and one line in each brief, **$1–3 total** (24 × $0.05–0.12). The reason
  to do it is quality: a forgotten patch means a corrected question keeps showing "✓ Right!".
- *Quality risk:* low. It changes only units that use it.
- *Catch:* the §9 script (`browser-ws-pilot-s9.mjs`, "old-build save"). It already proves it.

**R4. A shorter, cheaper lead per batch** (the biggest lever; see section 3a).
- Run the remaining units in **batches of 3–4**, one lead per batch, a fresh lead for the next batch.
- Give the lead a one-page `WORKSHEETS-LEAD-RECIPE` (the briefs, the check commands, the merge order), so it skips the
  seven-doc, six-minute read.
- *Saving:* lead cost per unit, with the arithmetic below, falls from $4.5–6.75 to **$2.7–4.3**. That is **$1.8–2.4 a
  unit, $43–58** for 24 units.
- *Quality risk:* four makers repeat any systematic mistake four times. **Mitigation:** run the *first* unit of each
  subject alone, adopt its fixes into the brief, then batch the rest. The merges touch shared files (`game.js`, `verify`,
  `WORKSHEETS.md`), so the lead alone wires those, as it did.
- *Catch:* verify, typecheck and build after each merge (they ran every time in the pilot), plus the blind solve.

### Trade-offs

**R5. Fold the key checker into the blind solve, and make a generic key-integrity script.**
The blind solver already writes its answer first and matches each to the page hash. The key checker's unique work is:
every stored right hash comes from an accepted form; no miss hash is also a right hash; accepted forms have the same
value; value ties. Write **one generic script** (`check-notes-keys.mjs <unit>`) for those, and have the blind session
run it after the solve. Value ties go in the build gate first (the blind solver missed one).
- *Saving:* key checker per unit: Bakery $0.76 (41% of $1.86), Link $1.10 (59%). History and Biology units are bigger
  sheets, so $0.7–1.4 a unit. Less $0.2–0.4 for the longer blind session = **$0.5–1.0 a unit, $12–24** for 24. One-time
  script: $1.5–3. **Net about $9–21.**
- *Quality risk:* the pilot's key checker wrote 350 lines per unit and "proved by breaking a key". The generic script
  must be proved the same way once. The loss is a second pair of eyes on math answers.
- *Catch:* the blind solve (exact arithmetic for math items), the value-tie gate, `check-math` for the generators.

**R6. The browser check and the §9 script become a lead-run script. No session.**
Generalize `browser-ws-pilot.mjs --unit <id>` (it names the two pilot units now) and run it in the background at 375 and
1280. One finish message, no polling.
- *Saving:* browser session $0.56 a unit. The recheck's browser and §9 reruns are about half of its $1.04 a unit, so
  $0.3–0.5. Total **$0.65–1.1 a unit**, less the lead reading the result ($0.1–0.2). **Net $0.5–0.9 a unit, $12–22** for
  24. One-time generalizing: about $1.
- *Quality risk:* a script cannot judge a picture, and it will not know the History/Biology video block. 
- *Catch:* fresh eyes on the first unit of each subject and at each new picture type, plus the weekly review.

**R7. (Optional) Round 2 on the cheaper tier.** The round is mechanical: apply a list of FIX items. It cost $1.59.
- *Saving:* about $0.4–0.8 a unit, **$5–12** after the recheck takes a little longer.
- *Quality risk:* **medium.** Round 2 on the main tier already introduced 2 new problems. A cheaper tier may add more.
- *Catch:* the recheck on changed items. Not in the budget below. Try it on one unit and look at the recheck count.

### Do not do

- Do not drop the blind solve or the recheck.
- Do not let a maker blind-solve its own sheets.
- Do not check only at 1280. The phone is the real screen.
- Do not run the whole site's checks per unit. The weekly run owns that.

### 3a. How the lead arithmetic works

The lead costs about $0.10–0.16 a minute. The pilot ran 86 minutes for 2 units. Take out the 9-minute polling mistake
(R1) and the six-minute read (R4): about 71 minutes for 2 units. Each *extra* unit in a batch adds about 15 minutes
(merge, decide, rebuild, log; guess from the 12 minutes of step-in and the merge rows). A batch of 4 is then
71 + 2 × 15 = 101 minutes × $0.10–0.16 = **$10.1–16.2**, or **$2.5–4.0 a unit**. I use **$2.7–4.3** to leave room for
a larger History batch. The pilot's way (pairs, no changes): $9–13.5 ÷ 2 = $4.5–6.75.

## 4. Budget for the remaining 24 units

Scope (from `WORKSHEETS-PLAN.md`, less the two pilot units): math 9 shops, **40 sheets**; English 7 units, **50 sheets**;
History 5 units, **45 sheets**; Biology 3 units, **16 sheets**. Total **151 sheets**.

Per-sheet children cost: pilot $1.05–1.3. History and Biology get +20% (guess: longer reading, more watch-fors, a video
block). The lead is $4.5–6.75 a unit without changes, $2.7–4.3 with R4.

| Subject | Units | Sheets | Per unit, as the pilot ran | Per unit, adopted | Total, as the pilot ran | Total, adopted |
|---|---|---|---|---|---|---|
| Math | 9 | 40 | $10–14 | **$7.3–10** | $90–123 | **$66–90** |
| English | 7 | 50 | $11.5–14.8 | **$8.0–9.4** | $80–104 | **$56–66** |
| History | 5 | 45 | $15.3–18.8 | **$11.8–13.4** | $77–94 | **$59–67** |
| Biology | 3 | 16 | $10.9–14 | **$7.4–8.6** | $33–42 | **$22–26** |
| **Subtotal** | **24** | **151** | | | **$280–363** | **$203–249** |
| One-time engine work (below) | | | | | $6–12 | $6–12 |
| One-time cost of R2, R3, R5, R6 | | | | | | $4–6 |
| **Total** | | | **about $12–15** | **about $9–11** | **about $286–375** | **about $213–267** |

**How "adopted" is built.** Saving per unit: R4 $1.8–2.4 + R5 $0.5–1.0 + R6 $0.5–0.9 = $2.8–4.3 for math. Text units add
R2 $1.0–1.5 → $3.8–5.8. R1 and R3 are inside the lead's minutes. I took 10% off for overlap: math $2.5–3.9, text
$3.4–5.2. Low is paired with low (a higher baseline has more to save). Example, English: $11.5 − $3.4 = $8.1 and
$14.8 − $5.2 = $9.6; I show $8.0–9.4. R7 is left out: $5–12 more if it works.

**The plan's $5–8 a unit** would be $120–192 for 24 units. The pilot says **$286–375 as run, about $213–267 adopted**.
Adopted is $9–11 a unit: lower than the pilot's $13–15, still above the plan. The owner can pick the number.

**What is not in the totals:**
- Making the Link-style ELA lessons longer. The blind solver rates lessons 1–6 at 25–35 minutes against a 35–45-minute
  checklist. A third mix-up or a third written answer adds about 8–15% to a sheet: **+$0.15–0.30 a sheet, +$8–15** for the
  50 English sheets, more for History and Biology. Owner decision.
- Fixing a unit's own problems found by the first blind solve in a subject. The first unit of each subject runs alone
  and may cost 20–40% more ($2–5).
- The owner's review time, and the later 🗃️ feature-keeper interview.

### Subjects that need new engine work

| Subject | What is new | One-time cost (guess) |
|---|---|---|
| **History (5 units) and Biology (3)** | The videos-first rule. Every sheet already has "1. 🎬 Watch for", but it is plain text. These subjects need the real list from `KHAN_VIDEOS` (each lesson has several videos, so the 3 watch-fors must match specific videos), a ▶ button or link back to each video in the game, and a note that the grown-up signature (`videoGateThen`) still happens in the game. `KHAN_VIDEOS` already has entries for `history4–9` and `bio3–5`, so no video research is needed. Needs a `videoFirst: true` flag in the same marked-block style as `kinds` | **$3–6**, then every unit uses it |
| History and Biology | A wiring helper like `libNotesHTML` for their lesson cards, plus a `verify` guard | $0.5–1 (lead) |
| History | Source passages and written answers with a strong answer that must stay hidden. The `sentence`/`word` kinds are new here, so the first unit needs a longer-passage look | included in the first unit's +20–40% |
| Biology | Diagrams (cell division, the genetic square, energy flow). The engine has no picture block for them, so each is a per-unit patch (as the Bakery's fraction bars were) | $1–3 a unit (guess) → included in the +20% |
| **Math, the other 9 shops** | Each shop's pictures come from game helpers the sheet engine does not use: number lines (Market, Rink), balance/hangers and inequalities (Potion, Fair), shapes (Houses), a coordinate plane (Harbor), 3D nets (Post), and dot/histogram/box plots (Show). Each is a per-unit build patch, as the Bakery's four were. The pictures must not give an answer away | **$0.5–1.5 a unit** (guess), in the math range above; Harbor, Post and Show are on the high side |
| English units 6–12 | `choice`, `word` and `sentence` are done. Possibly a quoted-passage block for Reading/Literature (`elaRead`, `elaLit`) | $0–2 |

Total one-time engine work in the table: **$6–12** (the History/Biology video block, wiring, and the first-unit look).

## 5. Order of work, for the owner

1. **Before the next unit (about $3–6 once):** R2 gate, R3 engine flag, R5 generic key script, R6 generalized browser
   script, the shorter lead recipe, and "send_message when done" in every brief. Ask the owner to OK the g7 rebuild, or
   leave g7 alone.
2. **One unit per subject, alone:** a math shop with a new picture type (Market), the next English unit, History
   `histWebs`, Biology `bioEnergy`. Look at each, fold fixes into the brief.
3. **Then batches of 3–4** in her order: math, English, History, Biology.
4. **Check the numbers after the first batch.** If a batch's lead costs more than about $4.3 a unit, or the blind solve
   finds the shortest-key pattern again, stop and fix the gate before the next batch.
