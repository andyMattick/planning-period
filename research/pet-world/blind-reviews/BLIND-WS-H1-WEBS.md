# 🙈 Blind solve: 🐫 Silk Road Museum note sheets (hist5-webs, Build 1)

Fresh solver, student view only: `scripts/notes/hist5-webs-content.mjs`, the built `public/notes/hist5-webs/station-N.html`
(I read `window.PWN` from each page with `node:vm`), and the engine (`scripts/notes/engine/notes.js`) for its canon
functions. For facts I used my own knowledge and the History Unit 5 notes in `docs/HISTORY-UNIT5.md`. I did not open the key
file, the teacher copies, the review packet or any key-check output until every answer was written down.

Then I hashed each answer as `PWN1|hist5-webs|s<n>:<item>|<canonical>` with the engine's canon and compared it with each
page's stored `acc` hashes. The unit sets `texts` and `numberWords: false`, so number words stay off. The canons are:
- blanks: the number `p/q`, else `textCanon`
- try-it and typed words: `textCanon`
- Your-turn choices: `opt:` + `sentCanon`
- Spot the mix-up: `opt:` + `textCanon`
- years: the number `p/q`

After that I ran:
- `check-notes-keys.mjs hist5-webs`: ✅ 108 items. All 214 stored right hashes come from accepted forms, no miss is a right
  answer, number forms agree, and the 49 choice sets have no equal values.
- `notes-test-wise.mjs --units hist5-webs`: ✅ 49 choice sets, chance 30%.
  - The best counted strategy was notVote at 35%. learnedXU was also 35%, but it is advisory.
  - Longest 30%, shortest 29%, middle 30%, odd one out 21%, converge 27%, vote 21%.
  - Positions A/B/C/last were 29/33/29/31%.
  - **No strategy was more than 10 points above chance.**
- `--items` gave the per-item cue tags quoted below.

**Result: 108 of 108 auto-checked items matched on my first answer.** No key is wrong. The problems are:
- Typed forms that a teacher would accept are refused (listed below).
- Six hints print, or all but print, an accepted answer.
- One Level 3 item has no real second step.
- A few facts are oversimplified or slightly off: Charlemagne's schools, Tang exams, the Black Death toll, Timbuktu's
  river, and Confucius's date gap.

## Totals

| Lesson | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (my estimate) |
|---|---|---|---|---|---|
| 1 Collapse and restructuring (5.1) | 13 | 13 | 1 | 1 | 26–30 |
| 2 Why do empires collapse? (5.2) | 14 | 14 | 1 | 1 | 29–33 |
| 3 Assessing the Dark Ages (5.3) | 13 | 13 | 2 | 1 | 29–33 |
| 4 Systems restructure in Europe (5.4) | 14 | 14 | 1 | 1 | 31–35 |
| 5 Systems restructure in China (5.5) | 14 | 14 | 3 | 2 | 30–34 |
| 6 The Islamic world (5.6) | 14 | 14 | 0 | 1 | 30–34 |
| 7 The Silk Roads (5.7) | 13 | 13 | 2 | 1 | 28–32 |
| 8 Expanding the Silk Roads (5.8) | 13 | 13 | 3 | 1 | 29–33 |
| **All** | **108** | **108 (100%)** | **13** | **9** | all inside 25–35 |

The pages say "About 30 minutes a sheet, plus the video", and `PWN.minutes` adds up to 30 on every sheet. I agree with that,
not counting the videos. Lessons 4–6 run a little long because they have 5 blanks and longer sources (John Ball, the Li
story, al-Kindi). Lesson 1 is the shortest.

## Unit-wide

**Typed forms probed.** Capitals, end periods and curly or straight apostrophes were forgiven everywhere. Years were
accepted with `CE`, `AD`, `in`, `about` and `c.` (`476 CE`, `AD 1453`, `about 610`). Wrong years that a student might
type get specific why-wrong messages: `589` and `907` on L5 p2, and `1352` on L8 p2.

Accepted (sample):
- `monks` (L1 k1-1)
- `kingdoms` / `states` / `rulers` (L1 k2-1)
- `expanded` (L1 k3-1)
- `continuities` (L1 p4)
- `Byzantion` (L2 k3-1)
- `Sofia` (L2 k4-1)
- `Empress Theodora` (L2 p4)
- `commerce` (L3 k1-1)
- `nuns` (L3 k2-1)
- `Muslim` (L3 k4-1)
- `the Book of Kells` (L3 p2)
- `Tyler` / `Wat Tiler` / `Walter Tyler` (L4 p3)
- `one third` / `one-third` / `1/3` / `third` (L4 k4-1)
- `Urban II` / `Urban 2` (L4 k5-1)
- `Taoism` / `Dao` / `Daoist` (L5 t1)
- `Changan` / `Chang an` / `Xi’an` (L5 k2-1)
- `examinations` / `tests` / `civil service exams` (L5 k3-1)
- `khalifa` (L6 k1-1)
- `Abbasids` (L6 k2-1)
- `astrolabes` (L6 k5-1)
- `middlemen` / `middle men` / `traders` / `merchants` (L7 k2-1)
- `oases` (L7 k3-1)
- `the Tang` / `Tang dynasty` (L7 p2)
- `secure` (L7 p4)
- `monsoon` / `the monsoons` (L8 t1)
- `hajj` / `haj` (L8 k2-1)
- `currency` (L8 k3-1)
- `Timbuctoo` / `Tombouctou` (L8 p4)

Refused fair forms (each is listed again under its lesson):
- L1 k3-1: `spread out`, `traveled`, `moved`
- L1 k1-1: `the missionaries`
- L1 p4: `the continuity`
- L3 k2-1: `scribes`
- L3 k4-1: `Abbasid`, `Arab`
- L4 k4-1: `33%` / `30%`
- L4 k5-1: `Pope Urban II` (the sentence already has “Pope”)
- L5 t1: `the Dao`
- L5 k2-1: `Chang-an`
- L5 k3-1: `civil service examinations`, `imperial exams`
- L6 k1-1: `calif`
- L7 t1: **`pass it on`**
- L7 k2-1: `middle-men`
- L7 p4: **`free`**, **`protected`**, `clear`
- L8 k3-1: `notes`, `banknotes`, `bill`
- L8 p2: `1325`

**Hints that print an accepted answer (one FIX pattern, counted under each lesson).** A hint shows after misses, but these
hand over the answer instead of a clue:
- L5 t1: hint “Its central idea is the Dao”. `Dao` is accepted.
- L5 k2-1: hint “Today the city is called Xi’an”. `Xi’an` is accepted.
- L8 k2-1: hint “it is also called the hajj”. `hajj` is accepted.
- L8 k3-1: hint “Bills instead of coins.” `bills` is accepted.
- L4 k4-1: hint “about one person in every three”. `one in three` is accepted.
- L3 k3-1: hint “A round number of hundreds, between 700 and 900” can only mean 800.

Fix each one by rewording the hint, or by refusing the printed form with a why message such as “That’s its name today.
What did the Tang call it?”

**Length, position and converge.** The numbers are in the header. Across the 49 sets the key is the longest about 1 in 3
times and the shortest about 1 in 3 times. That is a little high but balanced, and the length bots stay at chance.

**Written questions.** All 16 short answers (s1, s2 on each sheet) can be answered by a 6th grader from the sheet and its
videos. L1 s2 (“write a question that uses a frame”) is the hardest to start. Example 2 on L1 is a model for it.

## Lesson 1

- **FIX k1-1 / k3-1 / p4 (accepted forms)**
  - k3-1 (“faiths … {} to new lands”) refuses `spread out`, `traveled` and `moved`, though all three fit the sentence. Accept
    at least `spread out`. `traveled` and `moved` are fair too.
  - Also accept `the missionaries` (k1-1) and `the continuity` (p4). `the networks frame` is already accepted on p1, so
    “the” is forgiven there but not here.
- **JUDGMENT Example 2 (picking a frame)**
  - The example's question is “Who grew the tea, and how did it reach buyers far away?”
  - The example says this is only production and distribution. But “how did it reach buyers far away” is also a networks
    question, and p6 on this sheet says ships between far ports are networks.
  - Change: drop “far away” (“…and where was it sold?”), or say it uses production and distribution mainly.
- KEEP p5 (L3): the time-order step is real (220 → 476 → 589).
- KEEP c1 and c2: one defensible key each.

## Lesson 2

- **FIX p5 (L3)**
  - My answer and the page's: `officials taking bribes, and Huns raiding the frontier`
  - Problem: the key is the only choice with an internal cause at all, and both wrong choices are external + external
    sharing “Goths crossing the river”. Spotting the one internal cause picks the key, so step 2 (“one of each”) never has
    to be checked.
  - Change: replace `Goths crossing the river, and Persians attacking the east` with an internal + internal pair, e.g.
    `officials taking bribes, and generals fighting each other`. Then she has to check both halves.
- **JUDGMENT k1-1 / k2-1 (`inside` / `outside` accepted)**
  - The sentence says “they start inside the empire”, and the k2-1 hint says “from outside the empire”. `inside` and
    `outside` are accepted, so she can copy a word from the line.
  - The words being taught are internal and external.
  - Keep accepting them for the right idea, or refuse them with “Right idea. What’s the history word that starts with
    in-?”
- KEEP everything else:
  - p3 (Christian emperors is the only change from Augustus)
  - p6 (Procopius, *Secret History*, fairly adapted)
  - c1 and c2

## Lesson 3

- **FIX k3-1 (fact + hint)**
  - The sentence is “In the year {}, the pope crowned Charlemagne emperor, and he went on to set up schools.”
  - Problem 1: Charlemagne's school reforms came before 800. Alcuin joined his court in the 780s, the letter on study is
    from about 784–785, and the *Admonitio generalis* is from 789. So “went on to” puts them in the wrong order.
  - Change: “…crowned Charlemagne emperor. He also set up schools across his kingdom.”
  - Problem 2: the hint “A round number of hundreds, between 700 and 900” prints the answer. Use “Close to the year the
    800s began; a Christmas Day coronation” or just “The year a new century began, between 700 and 900” plus a different
    clue.
- **FIX k2-1 (accepted forms)**
  - Item: “{} in monasteries copied old books by hand.”
  - `scribes` is refused, though it is exactly right. `nuns` is accepted. Accept `scribes`.
- **JUDGMENT k4-1**
  - Item: “…learning thrived in Byzantium and the {} world.”
  - `Islamic` and `Muslim` pass, but `Abbasid` and `Arab` are refused. “The Arab world” is a common phrase.
  - Accept `Abbasid` at least, or refuse it with a why message.
- KEEP the rest:
  - p2: the Book of Kells. It was made about 800 by monks of the Irish Columban order (Iona/Kells) and is kept at Trinity
    College Dublin, as the steps say.
  - p4: Lindisfarne, 793.
  - p5: its key is tagged oddOne, but the step-1 marks decide it.
  - p6: honestly labeled as made up.

## Lesson 4

- **FIX k4-1 (fact, why message and hint)**
  - Item: “The Black Death of about 1347 to 1351 killed about {} of Europe’s people.”
  - Problem 1: the why message for `half` says “across Europe it was about one in three”. Many historians now estimate
    40–60% (Benedictow's ~50–60% is widely cited), and textbooks often say “a third to a half”. So the sheet tells her a
    defensible modern estimate is wrong.
  - Problem 2: the hint (“about one person in every three”) prints an accepted answer.
  - Change: write “killed between a third and {} of Europe’s people” with key `half`, or keep the blank and accept `half`
    and `a third`. Change the hint to “A fraction, more than a quarter.” Also accept `30%`, `33%` and `50%` if the
    fraction stays.
- **JUDGMENT watch-for 4 (“How did Russia begin?”: “the city at the center of the first Russian state”)**
  - The first state of the Rus’ is usually tied to Novgorod (Rurik, 862) and then Kyiv (Oleg, 882). Kyivan Rus’ is the
    shared ancestor of Ukraine, Belarus and Russia.
  - “First Russian state” follows the video's title, but it gives one modern country the claim.
  - Change: “the city that became the center of the Rus’ state (Kyivan Rus’)”.
- Minor accepted form: `Pope Urban II` on k5-1 is refused (the sentence already says “Pope”). It is cheap to accept.
- KEEP:
  - p1, p2 (1381), p3 (Wat Tyler; the hint is strong, but it's L2)
  - p4 (Ordinance and Statute of Labourers)
  - p5 (poll tax of 1380 → June 1381)
  - p6 (John Ball, “When Adam delved…”, fairly adapted)
  - c1 and c2
- The Example 1 king → lords → knights → serfs pyramid is the usual school simplification. Historians question the
  “feudal pyramid”, but it matches the Khan video, so KEEP.

## Lesson 5

- **FIX t1 (hint prints the answer)**
  - The hint “Its central idea is the Dao, ‘the way.’” prints `Dao`, which is accepted.
  - Change: “Its founder is said to be Laozi. Its symbol is the yin-yang.”
- **FIX k2-1 (hint prints an accepted answer; refused form)**
  - The hint names `Xi’an`, which is accepted, so she can copy it. `Chang-an` (a common spelling) is refused while
    `Chang an` and `Changan` pass.
  - Change: keep the hint, and refuse `Xi’an` with “That’s its name today. What did the Tang call it?” (Xi’an is a later
    name). Accept `Chang-an`.
- **FIX mix-up 3 (number)**
  - The mix-up says “Confucius lived about 1,000 years before the Tang (about 551–479 BCE).” But 479 BCE → 618 CE is about
    1,100 years, and from his birth it is about 1,170.
  - Change: “more than 1,000 years before the Tang”.
- **JUDGMENT k3-1, Example 1, the intro and the k3-1 hint (exams under the Tang)**
  - k3-1 says “Officials were chosen by {} on the Confucian classics.” Example 1 says “officials chosen by tests”.
  - Under the Tang, exams chose only a small share of officials. Most still came through family privilege and
    recommendation, and the exams became the main road only under the Song. CONTENT-RULES §4 names this exact
    simplification as a judgment call.
  - The intro's “tiny wooden booth” and the k3-1 hint (“sat in small booths for days”) describe the exam-cell compounds of
    Song to Qing times, not the Tang.
  - Suggest: “More and more officials were chosen by {}…”, and either drop the booth or say “a booth like the ones later
    students used”.
- **JUDGMENT k1-1 and k2-1 (smaller facts)**
  - k1-1 says “After more than 300 years of division”. 220 → 589 is about 370 years, but the Jin briefly reunited China
    (280 to about 316). “Nearly 400 years of division, with one short reunion” is safer, or “After a long split”.
  - k2-1: `Luoyang` is refused with no message. The Tang had two capitals, and Wu Zetian ruled from Luoyang. Add a why
    message (“Luoyang was the second capital. Which city was the main one?”).
- KEEP:
  - p1 (L1, the question shows “open”, fine for a find-it)
  - p2 (618)
  - p3: Charlemagne's empire overlaps, but “Western Europe” as a whole was many kingdoms.
  - p4
  - p5, a real 2×2 two-step
  - p6
  - c1 and c2

## Lesson 6

- **JUDGMENT k1-1 / k2-1 (spellings)**
  - `calif` is refused. It is a dictionary spelling, and `khalifa` passes.
  - `Abbassid` and `Abassid` are refused. They are misspellings, so refusing them is fine, but a “check the spelling: two
    b’s, one s” near-miss message would help.
  - I'd accept `calif`.
- KEEP all items:
  - Damascus
  - 610
  - Shia = Muhammad’s family (Ali)
  - Jerusalem, 1099
  - al-Kindi. It is a fair adaptation of his “we ought not to be ashamed of… acquiring [truth] wherever it comes from”.
  - p6: Baghdad 762 vs 1095. The “more trade with Europe” effect of the Crusades is the standard school claim. Some
    historians say Italian trade was growing anyway. Fine at this level.
  - The `algorithm` why message on k4-1 is accurate and a nice touch.
- KEEP Example 2 (1095 → 1099). Example 1 (faith, Arabic and shared rules held it together) is fair.

## Lesson 7

- **FIX t1 (accepted forms)**
  - `pass it on` is refused, while `pass it along`, `pass along`, `passed it along` and `pass` all pass. A 6th grader will
    type “pass it on”. Accept it.
- **FIX p4 (accepted forms)**
  - Item: “…kept the roads ___ from bandits.”
  - `free` (“free from bandits” is the most natural English) and `protected` are refused. `safe` and `secure` pass.
  - Accept `free`, `protected` and `clear`.
  - Also accept `middle-men` on k2-1 (`middle men` and `middlemen` pass).
- **JUDGMENT p6 (L3)**
  - My answer and the page's: `Germs, faiths and skills moved along with the goods.`
  - Tags: longest, specific, overlap, grammar, vote and converge.
  - Problem: the key repeats the categories from the hint and step 1 (“a disease, a faith, a skill”) as “germs, faiths and
    skills”. It is also the only choice that names three things.
  - Change: make one wrong choice name the same three kinds, e.g. `Germs, faiths and skills moved only between
    neighboring towns.`
- KEEP:
  - p5: the Sogdian “Ancient Letter” (Letter II, about 313, the fall of Luoyang) is fairly adapted.
  - c2: steppe horses carried east into China.
  - p1, p2 and p3.

## Lesson 8

- **FIX k2-1 (hint prints an accepted answer)**
  - The hint “For Muslims going to Mecca, it is also called the hajj” prints `hajj`, which is accepted.
  - Change: drop the last sentence, or refuse `hajj` with “Yes, that’s its Arabic name. What is the English word for a
    holy journey?”
- **FIX k3-1 (hint prints an accepted answer; refused forms)**
  - The hint “Bills instead of coins.” prints `bills`, which is accepted. `notes`, `banknotes` and `bill` are refused.
  - Change the hint to “What you pay with, printed instead of minted.” Accept `notes` and `banknotes`.
- **FIX p4 (fact)**
  - The item says Timbuktu is a city “on the Niger River”. It sits a few miles north of the river and is reached through
    its river port, Kabara. The steps also say it “sat where desert caravans met river boats”.
  - Change: “near the Niger River”.
- **JUDGMENT p2 (1325 refused)**
  - Mansa Musa left in 1324 and was in Cairo and Mecca in 1324. He came home in 1325, and some books date the hajj
    “1324–1325”. The hint says “a few years after 1320”, so 1324 is the intended key. I'd add a why message for `1325`
    (“He came home in 1325. When did he travel?”) rather than refuse it silently.
- KEEP:
  - p1
  - p3: Champa rice, two harvests.
  - p5: Ibn Battuta, 1352–53. It fairly adapts “they have a greater abhorrence of injustice… the traveller has no more
    reason… to fear brigands”.
  - p6: Song 960, Musa 1324, Zheng He’s African voyages 1417–1419 and 1421.
  - c1 and c2: Japanese writing used Chinese characters.
  - Example 2: gold lost value in Cairo (al-Umari), and the Catalan Atlas of 1375 shows Musa holding gold.

## Watch-for cards

Every video sheet's card lists exactly its lesson's titles from `khanVideos`, the same as KHAN_VIDEOS.history5:
- L1: 2
- L2: 2
- L4: 5
- L5: 1
- L6: 5
- L7: 2
- L8: 6

L3 has no video, and its card says “Read first” instead. Each watch-for names a video that is on its own card, and fits it:
- L1: overview, frames
- L2: Justinian and Theodora, the Roman/Byzantine comparison
- L4: feudal levels, revolts, Urban II/Jerusalem, Rus’ (see the JUDGMENT above)
- L5: Neo-Confucianism, Zhu Xi (Song)
- L6: Arabia c. 610, Crusades, Baghdad translation, the succession dispute
- L7: goods and relay trade, the rebuilding
- L8: Mali, Song prosperity, English wool, shoguns

Some videos have no watch-for: L4 “Overview of the Middle Ages”, and L8 “Silk and the Song Dynasty” and “Classical Japan
during the Heian Period”. That's fine, since the card asks for 2–4 things.

Note: L5's only video is about Neo-Confucianism and Zhu Xi (Song), while the sheet's blanks and problems are about the Sui
and the Tang. The watch-fors fit the video, and the rest of the sheet fits Khan's practice. A line in the intro linking
the two (“the Song, who came after the Tang”) would help.

## Fact check (every date, name and claim)

Checked and right:
- Han ends 220
- West's last emperor removed 476
- Sui reunites 589, Tang 618–907
- Grand Canal joins the rice south to the north
- Chang’an, “long peace”
- Byzantium as Constantinople's old name
- Hagia Sophia 537, “holy wisdom”
- Nika riot 532 and Theodora
- Constantinople falls to the Ottomans 1453, about 1,000 years after 476
- Byzantines called themselves Romans, were Christian, spoke Greek, kept Roman law
- Procopius's *Secret History*
- Petrarch, 1300s
- Charlemagne crowned 800
- Book of Kells at Trinity College Dublin
- Lindisfarne 793
- serfs bound to the land, manor, knights
- Black Death 1347–1351
- Ordinance/Statute of Labourers
- poll tax and the Peasants’ Revolt 1381; Wat Tyler; John Ball's couplet
- Urban II 1095 (urbanus = “of the city”)
- Crusades over about 200 years (1095–1291)
- Jerusalem 1099
- Muhammad's first revelation about 610
- Umayyads in Damascus
- Abbasids build Baghdad 762
- caliph = successor
- House of Wisdom
- al-Khwarizmi → algebra (book) and algorithm (name)
- astrolabe
- Shia = party of Ali
- al-Kindi's saying
- Bactrian camels
- Sogdians of Samarkand as middlemen
- Sogdian Ancient Letter about 313
- silk west; glass, gold and horses east
- plague by fleas on rats
- Tang guarding the routes in the 600s–700s
- Marco Polo in the 1270s, more than 1,000 years after the routes began
- dhows (lateen sails)
- monsoons
- Mansa Musa's hajj 1324 and the gold in Cairo
- Catalan Atlas
- Ibn Battuta in Mali 1352–53
- Song paper money and compass
- Champa rice
- Song 960–1279
- Zheng He for the Ming, early 1400s
- Japanese writing from Chinese characters
- shoguns over emperors
- Neo-Confucianism draws on Buddhism and Daoism
- Zhu Xi in the Song

Doubtful or oversimplified (each is above):
1. L3 k3-1: Charlemagne's schools did not come after 800 (FIX).
2. L4 k4-1: “about one in three”, with `half` called wrong (FIX).
3. L5 mix-up 3: “about 1,000 years” should be more than 1,000, about 1,100 (FIX).
4. L8 p4: Timbuktu is near the Niger, not on it (FIX).
5. L5: officials chosen by exams under the Tang, and exam booths in the Tang (JUDGMENT).
6. L5 k1-1: “more than 300 years of division” (JUDGMENT, minor).
7. L4 watch-for: “first Russian state” (JUDGMENT).
8. L1 Example 2: the frame is presented as having one answer (JUDGMENT).

## FIX list

1. L1 k3-1 / k1-1 / p4: accept `spread out` (and `traveled`, `moved`), `the missionaries`, `the continuity`
2. L2 p5: Level 3 with no real second step (the key is the only choice with an internal cause)
3. L3 k3-1: “went on to set up schools” is out of order, and the hint makes the answer 800
4. L3 k2-1: accept `scribes`
5. L4 k4-1: `half` gets a why-wrong though it is a defensible estimate; the hint prints “one in three”
6. L5 t1: the hint prints `Dao`
7. L5 k2-1: the hint prints `Xi’an` (accepted); accept `Chang-an`
8. L5 mix-up 3: Confucius was more than 1,000 years before the Tang (about 1,100)
9. L7 t1: accept `pass it on`
10. L7 p4: accept `free`, `protected`, `clear` (and `middle-men` on k2-1)
11. L8 k2-1: the hint prints `hajj`
12. L8 k3-1: the hint prints `bills`; accept `notes`, `banknotes`
13. L8 p4: Timbuktu is near, not on, the Niger River

## JUDGMENT list

1. L1 Example 2: the tea question also reads as networks
2. L2 k1-1 / k2-1: `inside` / `outside` are accepted, though the sentence and hint print them
3. L3 k4-1: accept `Abbasid` / `Arab`
4. L4 watch-for: “first Russian state” → “the Rus’ state (Kyivan Rus’)”
5. L5: Tang officials “chosen by exams”, and the exam booth is from later dynasties
6. L5 k1-1 / k2-1: “more than 300 years of division”; Luoyang needs a why message
7. L6 k1-1 / k2-1: accept `calif`; add a spelling near-miss for `Abbassid`
8. L7 p6: the key echoes step 1's three categories and is the only three-part choice
9. L8 p2: `1325` needs a why message
