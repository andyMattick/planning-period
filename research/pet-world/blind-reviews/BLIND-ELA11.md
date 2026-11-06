# Blind review: English Unit 11, Reading Library (`comprehension`)

Blind solver and test-wise checker, Nov 1, 2026. Fresh agent; I did not write this unit. I read only
`/tmp/ela11-blind/views/comprehension.md` (from `node scripts/blind-export.mjs --courses comprehension --out /tmp/ela11-blind`;
0 leaks, 0 problems), answered all 120 scored items, and only then opened `keys/comprehension.json`.
I did not edit the bank. The owner wasn't asked; decisions are mine and written below.

## Summary

| | Count |
|---|---|
| Scored items solved | 120 (101 MC, 4 sort, 1 order, 2 select-all, 3 two-part, 1 tap) |
| Agreed with key | **120 / 120** (all MC letters, every sort group, order D B A C, select-all, both parts of each two-part, tap 1 + 6) |
| Low/medium-confidence answers | 3 (58, 81, 90): all matched the key |
| FIX | 8 |
| KEEP | 9 |
| JUDGMENT | 4 |
| Written items (not scored) | 6 (5 short answers + unit paragraph): all answerable from the prompt; paragraph passage is ~70 words |

No key is wrong. No two-right item survived scoring, and no facts are wrong. The 1863 Civil War, 1849 Gold Rush,
1943 WWII metal and gas drives, 1912 "practically unsinkable", 1925 Nome serum run (Togo, Balto) and the 1890s
plume trade before the bird-protection laws are all right. Every passage is under 80 words (the longest is about 70).

## Findings

### FIX

| # | Id | Prompt starts | Problem | Exact fix |
|---|---|---|---|---|
| 92 | `textStructure:51at5h` (T, L3) | "An article explains what is making the town’s bees disappear…" | **Prompt gives the answer away.** The key, "What Is Making Our Bees Disappear?", copies the prompt word for word (bot: shortest+overlap). | Reword the prompt so it doesn't echo the key: "An article explains why the number of bees in town keeps dropping, and what is causing it. Which heading fits it best?" Also give one wrong choice the word "Bees" up front, e.g. "Bees and Wasps: How Are They Different?" (already there). |
| 114 | `readContext:1nu9noj` (T, L2) | "A diary from 1849 says, “Papa has gone to California to look for gold.”…" | **Prompt gives the answer away.** "California" + "gold" → "the California Gold Rush" with no history needed (bot: longest+overlap). | Change the quote to "Papa has gone west to make his fortune." Then only the date (1849) and "west" point to the Gold Rush. |
| 58 | `inferEvidence:1qahqgk` (P, L3) | "Duchess is a gray tabby with green eyes. She climbs the stairs one slow step…" | The key is the **longest** choice and the only one with two clues (bot: longest+specific+overlap). C ("climbs the stairs one slow step at a time") is also fair evidence of age, so a careful reader hesitates. | Make the key one clue, and make C point away from age: change the passage to "Her whiskers have turned white, and her eyes are cloudy" → key "Her whiskers have turned white." and C "She climbs the stairs fast to beat the dog." Or keep the key and lengthen D: "Duchess is a gray tabby with bright green eyes and a striped tail." |
| 93 | `textStructure:oh4fxy` (T, L3) | "A caption under a photo of a puffin says…" | The key is the only choice that says "photo" (bot: longest+specific+overlap). | Put "photo" in one wrong choice too: B "the main idea of the article the photo is in". |
| 46 | `mainIdeaSummary:1ckpk6n` (T, L1) | "A summary should be ___." | Wrong choice B "your feelings on it" doesn't fit the blank grammatically, so it can be crossed out without reading. | B → "full of your own feelings". |
| 20 | `readStrategies:hm77uk` (T, L3) | "Which choice matches each strategy with the right moment?" | **Too easy for L3**, and it repeats #14 (same concept, also L3). A, B and C are absurd (preview *after*, summarize *before*), so D wins by common sense. | Make the wrong choices near-misses: "preview before, summarize during, reread after"; "reread before, preview during, summarize after"; "preview before, reread after, summarize during". |
| 37 | `mainIdeaSummary:suxl7g` (P, L3) | "Which sentence should be cut from a summary of the 1925 sled dog relay…" | **Too easy for L3**: the only "I think" choice is the cut (the 6th item in the unit where the opinion is the answer; see J2). | Make it an off-topic *fact*, not an opinion: C → "Balto later got a statue in New York’s Central Park." (true, 1925). Then she has to judge importance, not spot "I think". |
| 68 | `inferEvidence:45pncc` (T, L3) | "Jamal read the shelter’s list of dogs for an hour…" | Odd one out: the key is the only choice that names the cat (Smoke) (bot: oddOne). | C → "He wants a dog that will chase Smoke; he glances at Smoke’s photo." |

### KEEP

| # | Prompt starts | Flag | Why keep |
|---|---|---|---|
| 10 | "Zoe reads: “Ferrets sleep up to 18 hours…”" | longest+overlap | Seeing that her thought is a question *is* the skill. The other three pairs are each plausible-looking. |
| 12 | "Ben has read a paragraph about how honeybees dance twice…" | longest; "diagram" overlap | The diagram is the intended clue (use text features when rereading fails). D ("a third time, faster") is a good near-miss. |
| 66 | "Mia’s rabbit thumped its back foot…" Which is stated | overlap | On "stated, not inferred" items the key has to match the text. That is the skill being tested. |
| 81 | "The Pet World River flooded in April…" | med confidence (sequence?) | The flood → lakes, nests moved, sandbags sold out: one cause with several effects. No time-order signal words. Key C holds. |
| 90 | "Because the shelter’s roof leaked…" | med (D problem/solution?) | "Because… As a result" are textbook cause-and-effect signals. Moving the cats is an effect, not a planned solution. |
| 106 | Titanic "practically unsinkable" | prompt hint ("before… ended") | The time cue is the point of a context item. It still has to be read as a belief, not a fact (C, D are tempting). |
| 40 | "…does NOT belong in a summary of… a dog a bath" | B (brush first) could look cut-able | Brushing is a real step. Only the dog's name is unimportant. |
| 84, 100, 109, 39, 63 | various | longest/specific | Two-structure answers (84) are all similar length. 100/109/39/63 are knowledge items whose key is specific because the right fact is specific. Wrong choices are plausible for L1–L3 respectively. |
| 9 | "Night Shift" preview | "people who work night jobs" defensible from title alone | The prompt says the preview includes photos of a bat, owl and raccoon, which rules out C. |

### JUDGMENT

- **J1. Main-idea key is always the broadest choice** (25, 29, 35, 38, 41, 43, 44; 48A). A kid who always picks "the most
  general sentence" wins this lesson. The bot shows it backwards: `specific` scores 10% and `learnedCV` 2.2% on the
  Main idea quiz (chance 22.4). The key is almost never the specific one, so the *opposite* of those cues is strong.
  The bot doesn't play "least specific", so it can't catch this. Reading A: that's what a main idea is; keep it.
  Reading B: in 2–3 items, make one wrong choice too broad ("Animals have many interesting bodies.") so broadness alone
  isn't enough. **I lean B** and suggest the bot get a `leastSpecific` strategy.
- **J2. Cut-from-summary pattern.** The item to cut is always "the writer's ___" (28, 40, 47E) or an opinion (31, 37,
  45, 46B, 48 Part B C). Reading A: these are the two real rules. Reading B: add one where the cut is an on-topic
  but minor fact (my fix to 37 does this).
- **J3. Concept repeats.** 2 / 22 / 11 (reread when confused), 13 / 19 (update a prediction or prior idea), 14 / 20
  (before-during-after order), 28 / 40 (writer's detail). Each pair is reworded but tests the same thing. Acceptable in
  practice; in the test pool 20 and 22 duplicate practice items 14 and 2.
- **J4. Test-pool L3 share is 37.5%** (3 of 8 per lesson; 15 of 40). That's just under "about 40%". Across the whole bank
  it's 49/120 = 41%. A unit test of 4 per lesson can't hit 40% exactly anyway. Fine unless the owner wants 4 L3 in
  each 8-item pool.

## Difficulty by level

| Level | Items (scored) | Blind accuracy | High confidence | Too-easy flags |
|---|---|---|---|---|
| L1 | 30 | 30/30 | 30 | 0 (fine for L1) |
| L2 | 41 | 41/41 | 40 | 0 |
| L3 | 49 | 49/49 | 47 | 3 (14, 20, 37) |

- **L3 vs L2:** clearly harder in Inference (claim + evidence pairs, irony in 61, two-part 71), Context (Titanic, 1890s
  feathers, 1998 vs 2020 accounts, the two-part WWII item) and Main idea (summaries that mix right and wrong details, as in 33
  and 43). **Not clearly harder in Reading strategies:** 14 and 20 are elimination by common sense, and 11 and 13 are
  about the same as the L2 items. Fix 20 as above; consider near-miss choices for 14 too.
- **Share:** 41% L3 across the bank, 37.5% in the test-only pool (J4).
- **Versus a grade 6 state reading test (Georgia Milestones ELA):** **easier.** Milestones uses 400–900-word
  passages with paired text-dependent questions. Here every passage is 1–4 sentences, and many wrong answers are
  contradicted by the text outright. That fits the phone limit (≤ ~80 words), and the skills and question types (two-part
  EBSR, select-all, structure and feature ID, context) match the standards. The L3 items reach about Milestones'
  easier-to-middle items.

## Tool results

| Check | Result |
|---|---|
| `node scripts/check-fairness.mjs --courses comprehension` | ✓ comprehension: ok (exit 0) |
| `node scripts/test-wise-bot.mjs --courses comprehension` | **exit 0, "ok"**. Highest cue on the unit test: longest 30.7 vs chance 25 (pass 80%). Highest on a quiz: shortest 29.8 on Main idea (chance 22.4, pass 75%). Nothing within 15 points of a pass mark or >10 over chance. Best realistic bot passes a quiz 4–7% of attempts. Retakes: 0% same items. Key position balanced (13906/14016/13890/13967). |
| `node scripts/check-content.mjs` | ✅ Content rules met, exit 0; 8 warnings, **none for comprehension** (pools 8/8/8/8/8). |
| `node scripts/check-typed.mjs` | ✅ All newer-type questions valid; comprehension has 1 order, 3 sort, 5 short answer, 2 select all, 3 two-part, 1 tap. |

### The 55 single-cue items

I looked at each one in the view. Most are cue matches by chance: the key happens to be the longest or shortest, and
the other choices are just as plausible. You can't pick them without reading (for example 5, 7, 30, 31, 34, 38, 53, 56,
59, 76, 98, 103, 107, 108). **Actually guessable without reading or knowing the content:**
- **92** (key copies the prompt) and **114** ("California… gold" → Gold Rush): giveaways, FIX above.
- **93** (only choice with "photo") and **68** (only choice naming Smoke): odd one out, FIX above.
- **58** (the key is the longest and has two clues): FIX above.

Borderline but kept: 10, 12 and 66, where the overlap is the skill (KEEP above). 100, 63 and 39 are L1 common sense. Not
on the list, but guessable by a pattern: the "broadest choice" main-idea keys (J1).
