# 🙈 Recheck: 🐫 Silk Road Museum note sheets (hist5-webs, Build 2)

A fresh recheck (not the builder and not the first blind solver) of only the items Build 2 changed after
docs/builder/BLIND-WS-H1-WEBS.md. It was done blind, from the student view only: `scripts/notes/hist5-webs-content.mjs`,
`window.PWN` from `public/notes/hist5-webs/station-N.html` (read with node:vm) and the canon functions in
`scripts/notes/engine/notes.js`. The keys file, the teacher copies and the review doc were not opened.

## Summary

- **31 changed items.** 26 are auto-checked and 5 are text only (Lesson 1 Example 2, the Lesson 4 watch-for 4, and the
  Lesson 5 intro, Example 1 and mix-up 3).
- **26 of 26 auto-checked items matched.** Each blind answer was hashed as `PWN1|hist5-webs|s<n>:<item>|<canonical>` with
  the engine's canon (blanks: number canon or `textCanon`; word items: `textCanon`; `p` choices: `opt:` + `sentCanon`;
  `c` choices: `optCanon`; number items: `p/q`), and each hash was found in that item's stored `acc` hashes.
- **All 16 fair forms the first report asked for are now accepted:** spread out, the missionaries, the continuity,
  scribes, Abbasid (Lesson 3 and Lesson 6), Pope Urban II, the Dao, Chang-an, civil service examinations, calif,
  pass it on, middle-men, free, protected, notes and banknotes.
- **The reworded hints no longer print an answer.** Dao, hajj, bills, 800 and "one in three" are gone. The Lesson 5 hint
  still names Xi’an, but Xi’an is a miss with a why message ("That’s its name today…"), not an accepted answer.
- **Facts checked:** Charlemagne was crowned on Christmas Day 800, 324 years after 476. The Black Death (1347–1351) killed
  between a third and half of Europe’s people. Pope Urban II called the First Crusade in 1095, and "urban" means "of the
  city". Kyiv was the center of Kyivan Rus’. The Sui reunited China and the Tang ruled from Chang’an, with Luoyang as their
  second capital. Tang exams chose "more and more" officials. Confucius lived about 551–479 BCE, more than 1,000 years
  before the Tang (618–907). Zhu Xi and Neo-Confucianism belong to the Song. The Abbasids founded Baghdad in 762, and the
  Umayyads ruled from Damascus. The Sogdians came from around Samarkand. Mansa Musa made his hajj in 1324 and came home in
  1325, and Timbuktu lies near the Niger. All of these are right.
- `node scripts/notes/check-notes-keys.mjs hist5-webs`: ✅ 108 items; 239 stored right hashes all come from accepted forms;
  no miss is a right answer; number forms agree; 49 choice sets have no equal values.
- `node scripts/notes/notes-test-wise.mjs --units hist5-webs`: 1 of 1 note unit passes (exit 0). The highest counted cue
  is notVote at 37% against 30% chance. learnedXU is also 37%, but it is advisory and not counted.

**Result: 0 FIX, 3 JUDGMENT (all minor).**

## Changed items

| Lesson | Item | Blind answer | Matched | Verdict | Reason |
|---|---|---|---|---|---|
| 1 | k1-1 | missionaries | ✅ (also: the missionaries, missionary) | KEEP | The hint gives the stem "mission-" but not the word. |
| 1 | k3-1 | spread | ✅ (also: spread out, spreads) | KEEP | The jam hint points to the word without printing it. |
| 1 | p4 | continuity | ✅ (also: the continuity, continuities) | KEEP | "tradition" gets a fair "close" message. |
| 1 | Example 2 | (text) | n/a | KEEP | Asks who grew the tea and where it was sold, which is clearly the production and distribution frame. |
| 2 | k1-1 | internal | ✅ | KEEP | "inside" gets a why message that asks for the in- word. |
| 2 | k2-1 | external | ✅ | KEEP | "outside" gets the matching ex- message. |
| 2 | p5 | officials taking bribes, and Huns raiding the frontier | ✅ | KEEP | It now needs both steps. Each wrong pair is two of a kind, and each has a why message. |
| 3 | k2-1 | Monks | ✅ (also: scribes, nuns) | KEEP | |
| 3 | k3-1 | 800 | ✅ | KEEP | The hint (Christmas Day, "a little over 300 years after 476") no longer prints 800. |
| 3 | k4-1 | Islamic | ✅ (also: Muslim, Abbasid) | KEEP | "Arab" gets a fair why message. |
| 4 | k4-1 | half | ✅ (also: one half, 1/2, a half, one-half, 2/4) | KEEP | The blank now asks for the high estimate, which is accurate. |
| 4 | k5-1 | Urban II | ✅ (also: Urban, Pope Urban II, Urban the Second) | KEEP | The hint is accurate (urbanus means "of the city", and he was the second Urban). |
| 4 | watch-for 4 | (checkbox) | n/a | KEEP | Kyiv as the center of Kyivan Rus’ is accurate. |
| 5 | intro | (text) | n/a | KEEP | It now says the video is about the Song, after the Tang. |
| 5 | t1 | Daoism | ✅ (also: Taoism, the Dao, Dao, Tao, Daoist) | KEEP | The hint (Laozi, yin-yang) no longer prints "Dao". |
| 5 | k1-1 | Sui | ✅ | KEEP | |
| 5 | k2-1 | Chang’an | ✅ (also: Changan, Chang-an, Chang an) | KEEP | Xi’an, Xian and Luoyang each get a why message. |
| 5 | k3-1 | examinations | ✅ (also: exams, civil service examinations, tests) | JUDGMENT | See J2. |
| 5 | Example 1 | (text) | n/a | JUDGMENT | See J2. |
| 5 | mix-up 3 | (text) | n/a | KEEP | Confucius lived about 551–479 BCE, more than 1,000 years before the Tang. |
| 5 | c1 | China was rebuilt as one empire run by officials. | ✅ | KEEP | Both wrong choices get why messages. |
| 6 | k1-1 | caliph | ✅ (also: calif, khalifa, khalif) | KEEP | |
| 6 | k2-1 | Abbasid | ✅ (also: Abbasids) | KEEP | Abassid and Abbassid get a spelling message, and Umayyad gets a fair one. |
| 7 | t1 | pass it along | ✅ (also: pass it on, pass along) | KEEP | "all the way" gets a fair message. |
| 7 | k2-1 | middlemen | ✅ (also: middle-men, middle men, go-betweens, traders, merchants) | KEEP | |
| 7 | p4 | safe | ✅ (also: free, protected, secure, clear) | KEEP | |
| 7 | p6 | Germs, faiths and skills moved along with the goods. | ✅ | KEEP | Both wrong choices get accurate why messages. |
| 8 | k2-1 | hajj | ✅ (also: pilgrimage, haj) | KEEP | The hint no longer prints "hajj". |
| 8 | k3-1 | money | ✅ (also: notes, banknotes, bank notes, bills, currency) | KEEP | The hint no longer prints "bills". |
| 8 | p2 | 1324 | ✅ | KEEP | 1325 gets "He came home in 1325…", which is accurate. |
| 8 | p4 | Timbuktu | ✅ (also: Timbuctoo, Tombouctou) | JUDGMENT | See J1. |

## JUDGMENT

- **J1 (Lesson 8 p4): the steps nearly spell the answer.** The hint says "It starts with Tim-", and the second step says
  "Its name begins Tim- and ends -tu". The steps are offered only after 4 misses, so this is scaffolding, not an answer
  shown up front. Still, together they leave only "buk" to fill in. Optional fix: drop "and ends -tu" from the step.
- **J2 (Lesson 5 Example 1 and k3-1): the example prints a near-identical phrase.** Example 1 says "more officials chosen
  by tests", and the k3-1 blank is "More and more officials were chosen by {}", which accepts "tests". This is teaching
  text, not a hint, so it may be intended. Optional fix: reword the example (for example "officials who passed hard
  exams") so the blank is not a copy of it.
- **J3 (optional extra forms, all minor).** These fair forms are not accepted and get no message:
  - Lesson 3 k3-1: "800 CE" and "AD 800". The page says to type a year in numbers, so this is acceptable as is.
  - Lesson 5 k3-1: "civil service tests". "tests" and "civil service exams" are both accepted, so this one is inconsistent.
  - Lesson 4 k5-1: "Urban 2".
  - Lesson 3 k4-1: "Islamic world", which repeats the "world" already in the sentence, and the misspelling "Abassid".
    Lesson 6 already has a spelling message for "Abassid".
  - Lesson 3 k2-1: "the monks".
  - Lesson 8 p4: "Timbuctu".

  None of these blocks a student who reads the sentence.
