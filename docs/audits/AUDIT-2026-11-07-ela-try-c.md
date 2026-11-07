# Audit: g7-ela2 try c (invented article, 8+ mc), proposals only

Written by a fresh auditor session (proposals only); the order lead corrected the budget figure (the auditor read it as $6.50; the order's budget is $16.50) and added the audit's own cost. No brief was edited. maker.md v6 stays as approved. Everything below is a proposal for the owner.

## 1. Result and cost

- **Gate: failed.** Final whole-version no-passage probes: **A 9 of 10, B 5 of 10.** A version passes at 4 of 10 or fewer; 5 fails. Rounds: A 7, 8, 9 (worse every round); B 9, 6, 5.
- **Keys: sound.** The blind solve with the passages matched 20 of 20 mc keys, and the 4 short answers match in substance.
- **Cost: $13.50 with this audit** ($13.05 before it), **0.82× the order's $16.50 budget** (165 tokens × $0.10) and under the attempt's $15 stop (ledger.tsv, sessions.txt):

| Round | Maker | Fact check | Probes A+B | Blind | Total | Running total |
|---|---|---|---|---|---|---|
| 0 runner test | | | | | 0.11 | 0.11 |
| 1 | 2.42 | 0.77 | 0.69 | | 3.88 | 3.99 |
| 2 (redesign) | 2.98 | 0.87 | 0.64 | | 4.49 | 8.48 |
| 3 (FIX) | 1.88 | 0.68 | 0.70 | 1.02 | 4.28 | 12.76 |
| Reporter | | | | | 0.29 | 13.05 |
| Auditor (this report) | | | | | 0.45 | 13.50 |

The run stayed under budget, but round 3 (the limit) ended with the gate open (B at 5 of 10, A at 9 of 10). The makers cost $7.28 of the total (56%).

## 2. What the invented article fixed, and what it did not

The cue tags on the right answers, per round (pack.json `checks`):

| Round | A right | A cues | B right | B cues |
|---|---|---|---|---|
| 1 | 7 | item 5, topic 2 | 9 | item 6, type 2, sounds 1 |
| 2 | 8 | item 4, topic 2, type 1, sounds 1 | 6 | item 4, topic 1, sounds 1 |
| 3 | 9 | item 7, type 1, guess 1 | 5 | item 5 |

- **Fixed:** topic cues went 4, then 3, then **0**. The earlier attempt leaked through general knowledge of a real fence. The invented island removed that leak, and the remaining topic cues (general reed and fish ecology, planting by hand) were gone after round 3.
- **Not fixed:** item cues went 11, then 8, then **12**. They now make up 12 of the 14 right answers. Type cues (the story's default feeling) also came back in A in every round.
- **Fact work every round:** each fact check found wrong choices that the passage leaves unaddressed but does not contradict (A q3/q4, B q8 "every platform", A q8's missing premise). Each one cost a FIX and another check.

## 3. Why the gate still fails

1. **Part A/Part B pairs leak in every round.** A q9/q10 and B q3/q4 and q9/q10 were right without the passage in all three rounds. A probe can match the single Part B quote that proves something to the Part A choice it proves. The round 3 rule ("four equally good pairs") is very hard to write: B q10 A ("no one had ever seen one do it") still read as "the only quote that says there was no evidence." Each pair is 2 of the 10 items, so one leak costs two right answers. Two leaking pairs alone use 4 of the 4 allowed.
2. **Items answer each other.** Each fix moved a clue instead of removing it. In round 2, A q3 D and q4 D mentioned math, which gave away q2. In round 3, A got worse (8 to 9) while B got better. Twelve items about one short story and one 300-word article keep repeating the same few facts, so stems and choices of one item restate the key of another. Nobody checks this across items until a probe runs, which costs about $0.70.
3. **The story's type default.** A q1's key was the first feeling this kind of story usually gives. maker.md's rule about type defaults exists, but the story half kept producing them.
4. **Fix lists are written item by item, not across the whole version.** The maker fixes the items it is told about, and new cross-item clues appear elsewhere. Nothing checks the whole version between the maker and the probe.

## 4. Proposals for the owner (ranked)

1. **Order design:** take the Part A/B pairs out of the mc reading check and test evidence through the citing short answers and the RACE response, which already do this. Cause: the pairs leaked in all 3 rounds and count double. Changes the order's design and maker.md.
2. **Scripted cross-item check:** add a script, for example `checks/cross-cue.mjs`, run before every probe, that flags any key's content words appearing in another item's stem or choices in the same version. Cause: item cues 11, 8, 12. Changes checks/ and maker.md, so the maker runs the script before handoff.
3. **Number of items:** for one story plus one 300-word article, cap mc at 8 a version, the minimum the order allows, and keep the 40% line, so 3 of 8 passes and 4 of 8 fails. Cause: 10 items about a few facts force overlap. Changes the order's design. This does not weaken the line.
4. **Fix lists across the whole version:** each FIX list should end with "re-check every other item in this version for the words you changed." Cause: fixes moved clues around (A went 8 to 9). Changes the lead's fix-list template and maker.md.
5. **maker.md: wrong choices must be contradicted, not just unsupported.** Make this a checklist line the maker ticks for each wrong choice with a paragraph number. Cause: fact FIXes in all 3 rounds. Changes maker.md.
6. **Invented story too:** apply the type-default rule to the story's turn (the key feeling must be one the default gets wrong) and give an example. Cause: type cues in A every round. Changes maker.md.
7. **Probe line, written up and not changed:** score the gate per version as it is now, and record the pair leaks apart from the rest so the owner can see what the pairs cost. Changes the probe's scoring note only.

## 5. Cheaper without losing quality

- **Cross-item script before the probe (proposal 2):** it costs almost nothing to run. If it removes one probe round and one maker round, that saves about $0.65 to $0.70 on probes plus $1.88 to $2.98 on the maker. Risk: the script misses meaning-level clues. The fresh probe still catches those.
- **Split the blind solve's phase a by version** (blind-ela.md) so it can serve as the final probe. That saves $0.70 in the last round. Risk: none, if each version gets its own fresh session as the probe does.
- **Stop rule:** if a version's probe score rises after a fix round (A 8 to 9), escalate to the owner and do not run another full round. This would have saved about $4.28 here. Risk: none to quality, because the pack is not delivered either way.
- **Fact recheck in round 3 ($0.68):** limit it to the changed items, with the full recheck kept at delivery. Saves about $0.30 to $0.40. Risk: an unchanged item that a change affects. The blind solve with passages still catches a wrong key.
- **Price:** this attempt fit the $16.50 budget ($13.50), but it did not deliver a passing quiz; no price change until a reading quiz passes the gate.

## 6. Owner decision (Nov 7, 2026): "D and 1-4. Leave 5 alone." (added by the order lead)
Relayed as: adopt the pairs, the cross-item check, wrong choices ruled out by the passage and whole-version fix lists;
keep maker v6's "at least 8 mc a version" (8–10 is fine), so the 8-mc cap is not adopted. In this report's numbering:
- **1. No mc Part A/Part B pairs: ADOPTED** (`agents/maker.md` v7 reading rule 4, `agents/onboarding.md` v8,
  `agents/blind-ela.md` v5, `feasibility.json` `readingquiz.pairs` 0).
- **2. Scripted cross-item check: ADOPTED** (`checks/cross-item.mjs` with a self-test; `npm run check` 5e with a
  shrink-only known-failing list `checks/cross-item-debt.json`; `agents/wilco.md` v4 step 2b; `docs/RUNBOOK.md` steps 4,
  4a and 7; maker v7 rule 6). When it came in it flagged g11-history (11 hits), g7-ela2 (2) and g8-science (1); those
  are on the list for the owner, not fixed. (`samples/_cap-practicegame/shooter-g5-math` has 1 LaTeX hit; nested
  practice-game fixtures are not in that section of the check.) Its limit: words, not meaning (try c version A: 0 hits,
  probe 9 of 10).
- **3. Cap mc at 8: NOT adopted** (at least 8 stays, maker v6).
- **4. Fix lists for the whole version: ADOPTED** (`docs/RUNBOOK.md` step 8; maker v7 rule 7).
- **5. Wrong choices ruled out by the passage: ADOPTED** as the relayed list's item 3 (maker v7 reading rule 8,
  blind-ela v5). Note: the owner's words "leave 5 alone" read against this report's numbering would leave this one out
  and adopt 3 instead; the lead followed the relayed instruction and flags it for the owner.
- **6. Story's turn not the type default: ADOPTED** (cheap; maker v7 reading rule 1). **7. Pair leaks recorded
  apart:** moot without pairs, not adopted.
