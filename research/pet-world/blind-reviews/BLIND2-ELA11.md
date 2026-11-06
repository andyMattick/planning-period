# Blind recheck, round 2: 6th grade English Unit 11 (`comprehension`)

Fresh checker. Answered from the keyless view only, then compared with the key.

| # | Item (starts with) | My answer | Conf. | Key | Flags | Verdict |
|---|---|---|---|---|---|---|
| 93 | Caption under a puffin photo | A | high | A | none | KEEP |
| 114 | Diary from 1849 | D | high | D | none | KEEP |
| 46 | A summary should be ___ | A | high | A | none | KEEP |
| 92 | Article on fewer bees: heading | C | high | C | none | KEEP |
| 48 | Sea otters two-part | A / B | high | A / B | none | KEEP |
| 50 | What is an inference? | D | high | D | key is among the longest (minor, not the single longest cue) | KEEP |
| 35 | Main idea: dog parks | D | med-high | D | key is the broadest choice but is right; B and A are partial, C is too broad and wrong | KEEP |
| 41 | Main idea: penguins | B | high | B | none | KEEP |
| 38 | Main idea: large parrots | B | high | B | C is too broad and wrong; D is a detail | KEEP |
| 20 | Matches each strategy with moment | D | high | D | none | KEEP |
| 14 | Order: before, during, after | D | high | D | A ("predict" last) is weaker but not right | KEEP |
| 37 | Cut from sled dog summary | C | high | C | none | KEEP |
| 22 | Why ask questions while reading | C | high | C | none | KEEP |
| 58 | "Duchess is a gray tabby…" | D | high | D | none | KEEP |
| 68 | "Jamal read the shelter’s list…" | D | high | D | none | KEEP |

No FIX, no JUDGMENT. 15 of 15 matched the key. No item had two right answers, none right, equal choices, a giveaway prompt, or an easy L3.

## Bots
- `node scripts/test-wise-bot.mjs --courses comprehension`: exit 0. "All units hold: no strategy is within 15 points of a pass mark or more than 10 points above chance." Best bot pass chance on one quiz is 4–7%; the unit test shows 72.2% for the best cell, still ok.
- `node scripts/check-fairness.mjs --courses comprehension`: `✓ comprehension: ok`, 1 of 1 unit passes.

Tool calls used: 9 (before this file's commit and push).
