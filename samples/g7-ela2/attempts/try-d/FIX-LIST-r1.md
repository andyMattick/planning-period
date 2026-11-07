# FIX list for try d (whole version): what try c left open

prior-pack.json is try c's final draft. Its fresh no-passage probes (one version each, no passages, no key) got
**A 9 of 10, B 5 of 10** right (a version fails at 5 of 10). Of the 14 right answers, **12 came from other items**
(cue "item"), 1 from the story type, 1 guess. The general-knowledge cue is gone (the invented island works).
The keyless blind solve with the passages confirmed every key (20 of 20).

## Whole-version changes (maker.md v7)
1. **Remove the Part A/Part B pairs** (q3/q4 story, q9/q10 article, both versions). They were right without the
   passage in every probe round. Keep the inference skills they tested as single mc items, and put the evidence skill
   in the short answers and the RACE. Each version: 8-10 mc + at least 2 citing short answers + RACE; at least 1 in 4 L3;
   item n has the same skill, level and type in A and B.
2. **Items answering each other** (the main leak): the article items each print a step of the same chain (snails eat
   shoots, drells eat snails, platforms, salt, planting by hand), so a non-reader rebuilds the article from the choices.
   No stem or choice may state or imply another item's key, in words OR in other words. Run node
   checks/cross-item.mjs (it catches words only), then read every pair of items in a version for meaning-level leaks.
   Try c cues: A q8, A q11 and B q8 were guessable from other items' choices (A q9's key + A q10's salt line; "every other
   A item is about snails eating shoots"; B q7 choice B taught the drell-snail mechanism); B q12's stem detail was
   printed in B q8's stem.
3. **Story type defaults**: A q1 (the kid's first feeling) and A q2 were the type's default in every round. The story's
   turn and first feelings are rivals, never keys.
4. **Every wrong choice is ruled out by a paragraph** (its why names it). Open in try c: A q3 choice D ("does not want
   to blame Dev in front of him") is not ruled out by [7]; B q10 D (drells "chased off with nets") only weakly
   contradicted; B q7 D ("farther from the open sea") could be inferred from "behind higher dunes".

## Item-level FIX still open (try c's last round)
- Fact: A q11 why: drop the clause "drells also feed at night [1]" (it argues for a wrong choice). B q11 why:
  "the only reeds left standing" widens [5] ("the last reed clumps").
- B q3 was one step and near literal, easier than A q3 at the same position: q n must match in level.
- B q12: "in use" is answerable from everyday sense; credit must hang on the passage line; no stem elsewhere prints
  its detail.
- A q12: "thinner" everyday sense; credit at most half for the meaning alone, the rest for the [4] line.
- A short answer's line or paragraph must never be named next to a quote elsewhere in the version.

## JUDGMENT (list in your hand-off, do not resolve silently)
- The teacher's request asked for Part A/Part B pairs and "every Part B choice a real sentence"; the owner replaced
  pairs with citing short answers (maker v7). List it for the teacher.

At the end: re-check every other item in each version for the words, ideas and quotes you changed, and rerun every check.
