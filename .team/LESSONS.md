# Lessons

One log for every project. A lesson is written once, here, and reaches the other projects at the weekly sync.

Each line: `id | date | project | what went wrong | what catches it now`. "reader only" means no script can catch it
yet. "to build" means the shared check in `checks/README.md` is not written yet. Ids never change and are never reused.

Seeded Nov 13, 2026 from the four projects' own reviews, audits and logs.

## Keys and answers
- L001 | Nov 2026 | Pet World | Generated math had wrong keys (35 in one unit) | an independent solver for every generator
- L002 | Nov 2026 | Pet World | Two choices equal in text or in value | structure check: no two choices equal
- L003 | Nov 2026 | Pet World | Two right answers the solver passed | a solver for every step, and fresh eyes
- L004 | Nov 2026 | Planning Period | Division choices with a remainder bigger than the divisor: "true but unfinished" | reader only (blind solver's traps)
- L005 | Nov 2026 | Planning Period | A reader's suggested wording was pasted in and made a false key | rule: a suggestion is a direction; fact sweep on new wording
- L006 | Nov 2026 | AP Statistics | A validator wrongly banned a whole topic (chi-square) | a re-solver beside the validator; rules name what is in the course
- L007 | Nov 2026 | AP Statistics | Source data was impossible (a joint chance larger than its part) | to build: sanity check on adapted data

## Giveaways a guesser can use
- L010 | Oct 2026 | Pet World, AP Statistics | The key was usually the longest choice (69% in one AP unit) | bots: longest; plan key lengths before writing
- L011 | Nov 2026 | Pet World | "Never the longest" made the key the middle length | bots: middle length; the 1-in-4 length plan
- L012 | Nov 2026 | Pet World | The key was the broadest choice | bots: general
- L013 | Nov 2026 | Pet World | The key was the only choice found word for word in the passage | bots: inPassage
- L014 | Nov 2026 | Pet World | The wrong choices shared an opening and the key didn't | bots: frameBreak
- L015 | Nov 2026 | Pet World, Planning Period | Choices overlapped so the key could be worked out | bots: converge
- L016 | Nov 2026 | AP Statistics | Keys had double spaces the wrong choices lacked (197) | structure check: no double spaces
- L017 | Nov 2026 | Pet World | Answers ended in a sign pattern a guesser could use (50/50) | math check: sign and spread patterns
- L018 | Nov 2026 | Pet World | Twin wrong choices that say the same thing, so 4 choices are really 3 | reader only
- L061 | Nov 2026 | Pet World | A fix round's new wrong choice was near a second right answer, and another twinned an old wrong choice; the reader's answer still matched the key | reader only: the blind solver says why each wrong choice is wrong
- L019 | Nov 2026 | Pet World | A picture's arrow gave the answer | fresh eyes look at every picture
- L058 | Nov 2026 | Pet World | Right answers kept the unit's words and wrong answers used outside words, so a bot reading the whole test found the key (Biology 3: 41.5% against 25% chance) while every one-item bot passed | whole-test bots: no-passage.mjs (echo) on every drawn test
- L059 | Nov 2026 | Pet World | Making every wrong choice longer to fix one cue made the key the shortest choice | every bot runs again after a fix; change one wrong choice an item

## Giveaways between items
- L020 | Nov 2026 | Planning Period | Items answered each other | cross-item check
- L021 | Nov 2026 | Pet World | An earlier answer told a later one (right 1,000 times in 1,000) | math check: earlier answer tells
- L022 | Nov 2026 | AP Statistics | One part of a long question gave away another; a hint did the student's work | reader only; hint must not repeat the model answer
- L023 | Nov 2026 | AP Statistics | Stand-alone questions pointed back at earlier steps (31 of 477) | spec rule and a pattern check
- L024 | Nov 2026 | Pet World | A student who memorised practice passed the test | reserved test-only pool
- L025 | Nov 2026 | Pet World | Practice items reappeared on the test | to build: practice and test overlap check
- L060 | Nov 2026 | Pet World | The cross-item check flagged 1,003 pairs on banks that reuse category answers on purpose ("compare and contrast" is one item's key and another's wrong choice) | to build: tell reused category choices from leaks before a bank-drawn project runs cross-item

## Reading and sources
- L030 | Nov 2026 | Planning Period | A reading quiz was answered 20 of 20 without the passages | the no-passage gate and probe
- L031 | Nov 2026 | Planning Period | Paired questions leaked in every round | pairs removed from the menu
- L032 | Nov 2026 | Planning Period | A passage topic could be answered from general knowledge | planner: unfamiliar topics
- L033 | Nov 2026 | Planning Period | A history myth in 4 places; 3 false science figures | fact and source checker (reader only)
- L034 | Nov 2026 | Pet World | A poem was misquoted | to build: quotations match the source
- L035 | Nov 2026 | AP Statistics | Graphs and data tables were described in words | figure and prose-data checks

## Difficulty
- L040 | Nov 2026 | Pet World, AP Statistics | Level 3 was level 2 with bigger numbers | hardness and heart checks; the difficulty judge
- L041 | Nov 2026 | Pet World | A quiz handed over a step the practice made her do | hardness check; a quiz is never easier than practice
- L042 | Nov 2026 | AP Statistics | A 100% blind solve hid that the bank was easier than the exam (4 gaps) | the benchmark compare
- L043 | Nov 2026 | Planning Period | A strong reader's accuracy can't show level 3 is harder (100% at every level) | the reader reports steps and "would a typical student get it"

## Process and cost
- L050 | Nov 2026 | Pet World | Cost follows session length (97.2% of tokens were re-reads) | caps of about 40 calls a session
- L051 | Nov 2026 | Planning Period | Makers spent $7.32 and $12.21 on one order | dollar caps for each maker session
- L052 | Nov 2026 | Pet World | A checklist given late caused a rebuild | every checklist in the first brief
- L053 | Nov 2026 | Planning Period | Agents' own time guesses were 2–25 times too high | minutes come from session records
- L054 | Nov 2026 | Planning Period | A self-read said 4 where the probe got 8 | never trust the maker's reading of its own work
- L055 | Nov 2026 | Pet World | An open review with the key in view flagged 19 of 77 clean items | readers get blind tasks
- L056 | Nov 2026 | Pet World | Scripts passed while 8 FIX items sat in the bank | one round of readers stays, whatever the scripts say
- L057 | Nov 2026 | Teacher Suite | The same call wrote the questions, the key and the review | the five rules: the maker never checks its own work
