# Blind review: English Unit 12, Storybook Library (`literature`)

Blind solver and test-wise checker, Nov 2, 2026. Fresh agent; I did not write this unit. Started on `e99dc80`. I read only
`/tmp/ela12-blind/views/literature.md` (from `node scripts/blind-export.mjs --courses literature --out /tmp/ela12-blind`;
0 leaks, 0 problems), answered all 120 scored items (stories and poems read in full), and only then opened
`keys/literature.json`. I did not edit the bank or any code. The owner wasn't asked; the decisions are mine and written below.

## Summary

| | Count |
|---|---|
| Scored items solved | 120 (110 MC, 3 sort, 1 order, 2 select-all, 3 two-part, 1 tap) |
| Agreed with key | **120 / 120** (every MC letter, every sort group, order D C B A, both select-alls, both parts of 47, 71, 120, tap 4 + 6) |
| Low/medium-confidence answers | 1 at 3 (56), 7 at 4 (2, 17, 40, 51, 74, 99, 100): all matched the key |
| FIX | 7 |
| KEEP | 9 |
| JUDGMENT | 5 |
| Written items (not scored) | 6 (5 short answers + unit paragraph): all answerable from the prompt; the paragraph story is about 85 words |

No key is wrong. One factual slip in a quoted public-domain poem (F1). One practice item gives away a test-only item (F2).
Rossetti's "Who Has Seen the Wind?" (Sing-Song, 1872) is printed exactly, both stanzas. Stevenson's "My Shadow" (A Child's
Garden of Verses, 1885) is exact except one word (F1). Both are public domain. Aesop (about 600 BCE; he is dated to about
620–564 BCE) for "The Ant and the Grasshopper" and "The North Wind and the Sun" is right. The Persephone retelling follows the
common version (six seeds, six months; some versions say four) and is labeled a Greek myth. Genre definitions (fable, myth,
drama, free verse, historical fiction) are right.

## Findings

### FIX

| # | Id | Prompt starts | Problem | Exact fix |
|---|---|---|---|---|
| F1 | passage `myShadow` (`src/shared/questionBanks.js:4855`), items 97–101 | "My Shadow", stanza 3, line 4 | **Quoted line isn't exact.** Stevenson's 1885 text reads "I'd think shame to stick to **nursie** as that shadow sticks to me!" The bank has "nurse". | Change `stick to nurse as` → `stick to nursie as`. (If "nursie" seems too odd for her, keep it and let item 100's key carry the meaning; don't modernize a quoted poem.) |
| F2 | 110 `poemsGenres:1eui42x` (P, L3) | "Why might a poet break a line in the middle of a sentence, like “and the first light / spills”?" | **Practice gives away a test-only item.** The example is the exact line break from the test-only poem "Harbor at Dawn", and item 115 (`poemsGenres:1awjp5t`, T, L3) asks the same question about the same word ("To make the reader pause and picture…"). A kid who did 110 in practice has seen 115's answer. | Use a different example in 110: “like “the old dog / sighs””. Or swap 110 to a different line-break purpose (white space, a one-word line for surprise). |
| F3 | 56 `themeEvidence:1oqe5zy` (P, L3) | "Which is a summary of “Mila’s Tunnel,” not a theme?" | **Two defensible answers.** A, "This story is mostly about two friends, a rock and a tunnel", is also "not a theme". It is a topic statement, and some kids will call it a (weak) summary. D is the better summary, but A is not wrong under the stem's wording. | Make A a theme so the item is 3 themes + 1 summary like #66: A → "Even the best worker sometimes needs a partner." |
| F4 | 69 `themeEvidence:apjvn6` (T, L3) and 61 `themeEvidence:645bee` (P, L3) | "Sam teased Kip…" / "Leo always shared his lunch…" "Which theme fits, and which detail…" | **Same item twice (practice and test), and the key is easy to spot.** Both are "theme; detail" pairs, both keys start "Kindness…", both are D in the view, and in both the three wrong themes ("Hiking is risky", "Woods are risky", "Speed matters most") are plainly not life messages. Practicing 61 trains a kid to pick the "Kindness" choice on 69. | Rewrite 69's wrong choices so at least two are real themes paired with the wrong detail: B → "Kindness answers unkindness; Sam teases Kip at every race."; C → "Pride comes before a fall; Sam twists his ankle." Keep D. That makes the second step (the right detail) matter. |
| F5 | 47 `characterPov:1u1sp79` (P, L3, two-part, `typedQuestions.js:959`) | "Jada saw a younger boy drop his lunch tray…" | **No real second step for L3.** The passage spells out the kind acts, Part A's wrong choices (shy, bossy) have no support, and Part B's wrong choices are details about the boy and the crowd, not Jada. | Make Part A's wrong choices near-misses: "brave, but only when a teacher is watching" and "kind, but she wants others to notice". Make one Part B wrong choice about Jada: "Jada set down her own tray." (true but doesn't show the trait as well). Or relabel it L2. |
| F6 | 109 `poemsGenres:10evm0z` (P, L3) | "A story is set in 1863 during the Civil War. Its characters are made up, but the war and its battles are real." | **Too easy for L3.** The prompt recites the definition of historical fiction. | Remove the definition and make the near-miss real: "A story follows a made-up drummer boy at the Battle of Gettysburg in 1863. Which genre is it?" with C → "a biography" (in place of "realistic fiction") so she must decide made-up person + real event. Or relabel L1. |
| F7 | 29 `characterPov:4g6fsy` (P, L3) and 42 `characterPov:60e7bd` (T, L3) | "Which of these can the narrator… NOT know for sure?" / "If Ruby told it in first person, which detail could she NOT tell?" | **Same concept, same key shape.** In both, the key is the only choice about another character's private thoughts (the judge, Mr. Heron). 42 (test) is solved by the rule practiced in 29. Also 48 (P) tests the same rule. | In 42, make the key Max's private thought and add a wrong choice about what Max *does*: key A → "Max is thinking about his grandfather, not the trophy."; D → "Max runs his paw along the old paddle." (she can see that, so she can tell it). Then she has to tell another character's seen actions from his hidden thoughts, not just spot the one far-away character. |

### KEEP

| # | Prompt starts | Flag | Why keep |
|---|---|---|---|
| 81 | "which image shows a gentle wind, and which shows a strong one?" | mirror pair (C vs D) | A test-wise kid narrows to C/D, but choosing between them *is* the reading: trembling leaves vs bowing trees. A and B are absurd; fine for practice. |
| 84 | "What is the difference between mood and tone?" | mirror pair (B vs C) | Same: knowing which way round is the whole skill. L1. |
| 78 | "felt as warm as a kitchen" | B and C both start "The mill and a kitchen" | The second half (cook vs feel safe) is the point. |
| 51 | "best evidence for its theme" (Ant) | A (snow, hunger) is also evidence | A shows the result, C states the preparing. C is the stronger, standard answer; A is a fair near-miss. |
| 40 | "why does Max take down his grandfather’s old paddle?" | inference, not stated | "He wasn't thinking about the trophy at all" rules out D; A is the only reading left. |
| 99 | "Who is the speaker of “My Shadow”?" | B "a grown poet looking back" | The poem's speaker is plainly a child ("proper children", "nurse"/"nursie"). Good near-miss for L2. |
| 2, 17 | climax items | medium confidence | Wick flaring and the crack + "Stop!" are the turning points; the other choices are clearly rising or falling action. |
| 33, 34, 74, 100 | bot single-cue (oddOne / longest) | | Each wrong choice is a plausible misreading of the passage; you can't pick the key without reading. |
| 118 | "I am the old oak by the road" | D "the poet, not the oak, as a girl" reads oddly | Clunky but not unfair; consider "the poet, who once climbed the oak" in a later pass. |

### JUDGMENT

- **J1. Repeated story shape: “The Lantern Keeper” and “The Bridge Over Fox Creek”.** Both are animal keepers of a
  harbor/creek structure, a storm/rain problem, a race to fix it, and a last line vowing to be ready ("I'm keeping a dry
  wick up here" / "Every rain. No excuses."). 5 (P) and 19 (T) ask the same question with the same answer ("learned… won't
  forget"). Reading A: parallel stories make the test fair to what was practiced. Reading B: 19 is answered by memory of 5.
  **I lean B:** change Fox Creek's ending (e.g. Mabel teaches the ducklings to check the post) so 19 needs a fresh reading.
- **J2. "How does the setting cause the problem?" appears five times** (3, 8, 13, 16, 20). Each has one setting-linked
  choice and three that ignore the problem. Acceptable in a skill lesson; the L3 ones (3, 13, 20) aren't harder than the
  L2 one (16). Make one L3 choice a true setting detail that doesn't cause the problem.
- **J3. Theme definition items repeat** (57, 58, 60, 62, 67, 70, 72): "a full sentence about life" is the key five ways.
  Fine for L1 practice; 67 and 70 are both in the test pool, so the test spends 2 of 4 theme slots on the definition at most.
- **J4. Passage length on a phone.** Passages run about 170–260 words (Blue Ribbon and Mila's Tunnel the longest), and
  "My Shadow" has 16 long lines. That's well under Milestones length and reads cleanly, but it's 3–4 phone screens, and it is
  shown above every item that uses it. Reading A: right length for literature (a plot needs room). Reading B: collapse the
  passage after the first item of a set, with a "Show story" button. Owner's call.
- **J5. Test-pool L3 share is 37.5%** (3 of 8 per lesson, 15 of 40); the whole bank is 48/120 = 40%. Same as Unit 11, fine.

## Difficulty by level

| Level | Items (scored) | Practice / test | Blind accuracy | Mean confidence | Too-easy flags |
|---|---|---|---|---|---|
| L1 | 30 | 20 / 10 | 30/30 | 5.0 | 0 (fine for L1) |
| L2 | 42 | 27 / 15 | 42/42 | 4.95 (2, 17, 74, 99 at 4) | 0 |
| L3 | 48 | 33 / 15 | 48/48 | 4.92 (56 at 3; 40, 51, 100 at 4) | 3 (47, 109, and 69 via 61) |

- **L3 vs L2:** clearly harder in Characters and POV (change + cause, what a narrator can't know, why the POV makes a
  surprise), Figurative language (mood shift + cause, why an image, "silent as a held breath"), and the poem items
  (the shadow "asleep in bed" needing the sun-up reasoning + tone). **Not clearly harder** in Plot (the setting items, J2)
  and in 47, 109 (F5, F6).
- **Share:** 40% L3 across the bank, 37.5% in the test-only pool.
- **Versus Georgia Milestones grade 6 literature items: easier.** Milestones pairs 600–900-word literary passages with
  EBSR (two-part) items, where the wrong choices are often true details that support a weaker answer. Here passages are
  170–260 words, and most wrong choices are contradicted by the text outright. The skills match the GSE (RL.6.1–6.5:
  theme with evidence, plot, character change, POV, figurative language, mood/tone, line breaks and stanzas), and the
  best L3 items (27, 32, 41, 76, 101, 113) reach Milestones' easier-to-middle items. F4, F5 and F7 would move three L3
  items closer.

## Tool results

| Check | Result |
|---|---|
| `node scripts/blind-export.mjs --courses literature` | 126 items (120 scored, 6 written), 0 leaks, 0 problems |
| `node scripts/test-wise-bot.mjs --courses literature` | **exit 0, "ok"**. Highest cue on the unit test: longest 28.7 vs chance 25 (pass 80%). Highest on a quiz: middle 31.4 on Poems (chance 22.6, pass 75%). Nothing within 15 points of a pass mark or >10 over chance. Best realistic bot passes a quiz 4–9% of attempts. Memorizer 28.9 / 21.1 / 53% on tries 1–3 vs 80%. Retakes 0% same items. Key position balanced (13886/14131/13789/13983). Oracle 47–77 (hindsight ceiling, not a failure). |
| `node scripts/check-fairness.mjs --courses literature` | ✓ literature: ok (exit 0) |
| `node scripts/check-content.mjs` | ✅ Content rules met, exit 0; 8 warnings, **none for literature** (pools 8/8/8/8/8). |
| `node scripts/check-typed.mjs` | ✅ All newer-type questions valid (exit 0). |

### The 56 single-cue items

I looked at each one in the view. Almost all are cue matches by chance: the key happens to be the longest or shortest
(short genre or figure names like "a myth", "metaphor", "four"; long reasoned keys like 4, 27, 41), and the other choices
are just as plausible. You can't pick them without reading the passage. **Actually guessable without the skill:** 69 via
61 (F4), 42 via 29 (F7), 115 via 110 (F2), and 109 (F6). The rest stay.
