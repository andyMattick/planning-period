# 🔁 Recheck, round 2: 📝 worksheet pilot (g6-bakery, ela5-link)

Fresh checker (did not make or fix these sheets), Nov 2, 2026. Scope: only the items changed between `3b5d6d2` and
`07d8ff3` in `scripts/notes/g6-bakery-content.mjs` and `scripts/notes/ela5-link-content.mjs`, plus the round-1 findings
that were fixed in the keys only (accepted words and miss messages).

## 1. Blind recheck (student view only)

Method: same as `BLIND-WS-PILOT.md`. I solved each changed item from the content and the built page first. Then I hashed my
answer as `PWN1|<unit>|s<n>:<item>|<canonical>`, using the engine's own canon functions loaded in `node:vm`, and looked it
up in the page's `acc`, `miss` and `near` hashes. No keys file, teacher copy or review packet was open during this step.
**Every changed item matched on my first answer.**

### 🥐 Bakery (g6-bakery)

| Item | My answer | Round-1 finding | Result |
|---|---|---|---|
| s1 c1 | 7.40 + 2.36 with the points in a line | `VALUE_TIE_OK`: two set-ups had the same sum | **Fixed.** Sums are now 9.76 / 310 / 31, so there's no value tie. Lengths 37 / 34 / 41: the key is the middle one. |
| s2 c2 | She multiplied by 2, not divided. | Matched Example 1 (3/4 ÷ 3) | **Fixed.** 2/5 ÷ 2 isn't in the examples or Your turn. The wrong choices are really wrong: 2 ÷ 2/5 = 5, and 5/2 ÷ 2 = 5/4. ⚠️ The key is still strictly the shortest (33 vs 36 / 42), as in round 1, when it was KEEP. The Bakery unit is 2 strict and 1 tied out of 10, which is about chance, so **KEEP**. |
| s2 k3-1 | reciprocal | JUDGMENT: accept "inverse" | **Fixed.** "inverse" is accepted, and reciprocal and flip still are. |
| s4 c1 | 5.4 | JUDGMENT: key was the middle value | **Fixed** (5.4 / 54 / 540). **New problem (JUDGMENT, leaning FIX):** the key's note is now "5.4 (5 and 4 tenths)" with a digit, while the other two spell the number out ("fifty-four", "five hundred forty"). That makes it the odd one out in format. The likely reason: "five and four tenths" (26) would have made the key the longest (24 is the next). Fix: spell out every note and shorten one wrong note, or use digits in all three. Also, the key is now the smallest value, and the "too few places" distractor (0.54) is gone. That's fine for one item, but every wrong choice is now "too many places". |

### 🔗 Link Library (ela5-link)

| Item | My answer | Round-1 finding | Result |
|---|---|---|---|
| s1 p3 | often | JUDGMENT: "gently" was the only -ly word | **Fixed.** "often" has no -ly and can't take an object. Lengths 7 / 5 / 5 / 5. |
| s1 p5 | after | JUDGMENT: miss message for "after recess" | **Fixed.** "after recess" now gets "Right link! Type just the one word…". |
| s1 c1 | He picked the noun, not the link before it. | FIX: key shortest; one wrong choice wasn't a mix-up | **Fixed.** 43 vs 35 / 44. All three choices are now real mix-ups. |
| s1 c2 | Everyone but Remy read the book. | FIX: key shortest | **Fixed.** 32 vs 25 / 36. "but" is a conjunction in both wrong choices. |
| s2 k1-1 | object | JUDGMENT: miss message for "noun" | **Fixed.** "noun" gets "Close: it is a noun…". |
| s2 c1 | After a preposition, I should be me. | FIX: key shortest | **Fixed.** 36 vs 34 / 44. |
| s3 p6 | Juno left without her umbrella. | FIX: key strictly shortest | **Improved, now tied shortest** (31 and 31, vs 33 and 33). A shortest-picker gets it half the time. **JUDGMENT**: OK on its own; the unit rate is below chance (see below). |
| s3 c1 | He used since with an amount of time. | FIX: key shortest | **Fixed.** 37 vs 32 / 48. |
| s3 c2 | The book is on the top shelf. | FIX: key shortest | **Fixed.** 29 vs 31 / 28. Only "on" fits. "onto" after "is" is wrong, and "among the shelf" is wrong. |
| s5 p4 | The kids stayed inside all day. | FIX: key shortest and the only one ending at "inside" | **Fixed** (31 vs 33 / 28 / 28). **New problem (JUDGMENT):** "all day" is a noun phrase right after "inside", but the hint says "An adverb has no object after it" and step 2 says "Three have a noun after inside." Counted literally, all four sentences have a noun after inside. The key is still the only right answer ("all day" tells how long; it isn't an object), but a careful kid following the sheet's own test may stall. Suggest a hint and step that say "…a noun that inside links (inside *what*?)", or an ending that isn't a noun ("stayed inside until noon" has the same problem; "stayed inside and read" doesn't). |
| s5 c1 | Over has no object here. | FIX: key shortest | **Fixed.** 24 vs 22 / 28. |
| s5 c2 | It has a noun or pronoun object. | JUDGMENT: absolute word "every time" | **Fixed.** 32 vs 28 / 34. No absolute words. |
| s6 k3-1 | thinking | JUDGMENT: accept "unsure" | **Fixed.** "unsure", "deciding", "pondering" and "considering" are accepted. "confused" gets a "Close!" miss message. |
| s6 p5 | The library opens at noon. | FIX: prompt didn't ask for the end mark | **Fixed.** The prompt says "with its capital letter and end mark". Without the period it isn't accepted, which now matches the prompt. A lowercase start gets "A sentence starts with a capital letter." |
| s6 c1 | Happy is part of the sentence, not set apart. | FIX: a wrong choice contradicted the stem | **Fixed.** "Happy needs an exclamation point to count." is a real mix-up. 45 vs 49 / 42. |
| s6 c2 | Oh well | JUDGMENT: the only feeling | **Fixed.** "felt sad" is a feeling-like distractor and "out of" is a two-word preposition. Lengths 7 vs 6 / 8. |
| s7 t1 | , | FIX: accept "comma" | **Fixed.** ",", "comma" and "a comma" are accepted. |
| s7 k2-1 | capital | JUDGMENT: "big" | Unchanged: "big" isn't accepted, "uppercase" is. Was JUDGMENT, still fine. |
| s7 p5 | Oh, I see the map now. | JUDGMENT: context gave away "mild" | **Fixed.** "She just nods and smiles a little" has to be read and judged. "Oh! I see…" gets a miss message that explains why. "finds the map at last" alone could suggest relief, but the nod and smile settle it. |
| s7 c1 | The word “we” needs a capital W. | FIX: key shortest, read like a grammar slip | **Fixed.** 32 vs 31 / 35. |
| s7 c2 | Oh, the shop is closed now. | FIX: key shortest | **Fixed.** 27 vs 23 / 29. "Oh! The shop is closed." is punctuated right, but it shows a strong feeling, so the stem's "mild" rules it out. That's one right answer. |
| s8 p3 | is | FIX: "have" failed the grammar | **Fixed.** "have been" fits the blank grammatically and is wrong only on agreement. It has a miss message. The key is the shortest of the one-word choices (left alone in round 1). "have been" is now the only two-word choice, but it's a wrong choice, so that's harmless. |
| s8 p4 | before dinner | JUDGMENT: two readings | **Fixed.** The new order ("on the porch we finished the puzzle before dinner") has one reading. "on the porch" gets "On the porch tells where." |
| s8 c1 | The verb should match books, not cart. | FIX: key shortest; a wrong choice contradicted the stem | **Fixed.** 38 vs 39 / 27. "She should use was, not is." is a real (wrong) fix and doesn't agree with the stem. |

No changed item has two right answers, two equal choices, a wrong choice that agrees with its stem, or a wrong choice
that fails the blank's grammar.

### Unit-wide shortest-key count (ela5-link, all choice items)

I found each item's key by hashing every option against the page (one right option per item, all 38 items).

| | Round 1 | Round 2 |
|---|---|---|
| Spot-the-mix-up choices (16) where the key is the strict shortest | 9 (+1 tied) | **0 (0 tied)** |
| All 38 choice items where the key is the strict shortest | — | 4 (s4 p1 "is", s6 p2 "Ugh", s8 p2 "in", s8 p3 "is", all one-word, left alone in round 1) |
| All 38 choice items where the key is tied for shortest | — | 7 (s1 p1, s1 p3, s3 p1, s3 p6, s6 p6, s7 p4, s8 p6) |
| What a "pick the shortest" strategy scores (ties split) | about 60% on mix-ups | **7.0 / 38 = 18%**, against 28% by chance |

**The shortest-key FIX is closed.** A shortest-picker now scores below chance.

## 2. Key tables

I updated both tables from my step-1 answers.

- `scripts/notes/check-g6-bakery-keys.mjs`:
  - s2 c2 and s4 c1 updated, and "inverse" added for s2 k3-1.
  - **`VALUE_TIE_OK` is now `{}`.** The station 1 c1 exception is gone, so any value tie fails.
- `scripts/notes/check-ela5-link-keys.mjs`:
  - s1 p3 / c1 / c2, s3 c2, s5 p4, s7 c1 / c2 and s8 c1 updated.
  - "unsure" added for s6 k3-1, and "comma" for s7 t1.
  - The REVIEWED note for 1:p3 now says "often".

| Script | Result |
|---|---|
| `node scripts/notes/check-g6-bakery-keys.mjs` | ✅ exit 0. 74 items, 124 stored right hashes, no value ties (no ⚖️ line). |
| `node scripts/notes/check-ela5-link-keys.mjs` | ✅ exit 0. 105 items, 142 stored right hashes, 0 options flagged. Info lines list lenient forms beyond mine (pondering, considering, a comma, …). All KEEP. |

## 3. Browser

`npm ci`, then `npm run dev` on :5173. I didn't run `npx playwright install chromium`: this container's Chromium is
pre-installed at `/opt/pw-browsers/chromium`, and the script uses it.

### `node scripts/notes/browser-ws-pilot.mjs` (all sheets of each unit, both widths)

| Unit | 375 px | 1280 px |
|---|---|---|
| g6-bakery | 131 checks, 0 failed | 134 checks, 0 failed |
| ela5-link | 213 checks, 0 failed | 216 checks, 0 failed |

### Checklist §9: new `scripts/notes/browser-ws-pilot-s9.mjs` (Bakery station 4, Link Library lesson 7)

| Check | g6-bakery s4 | ela5-link s7 |
|---|---|---|
| Save code: answer, copy the code, clear storage, load the code, answer is back | ✅ ("Restored 1 sheet. Nothing on this device was erased.") | ✅ |
| Backup file: download, clear storage, restore the file, answer is back | ✅ | ✅ |
| localStorage throws: banner shows, answers still checked, no page errors | ✅ | ✅ |
| Inside `<iframe sandbox="allow-scripts" srcdoc=…>`: renders, checks an answer, shows the blocked banner, no errors | ✅ | ✅ |
| Build 1 save (from `e5039d9`'s page, same origin) loads in Build 2, and the unchanged item is still right | ✅ (c2) | ✅ (p4) |
| **Changed item reopens with "This question changed"** | ❌ | ❌ |
| Re-answer the changed item in Build 2 | not reached (buttons locked; failed twice) | not reached |

**FIX (engine, not content).** A Build 1 save of a changed item stays "✓ Right!" in Build 2, with every button locked.

- **What happens:** none of the new options shows as picked, and she can't answer the item again.
- **Cause:** the Build 1 engine already stores the explanation (`xp`) with a right answer. I checked the saved state: s7 c1 holds `xp: "Hooray! We can stay late…"`. `restore()` in `scripts/notes/engine/notes.js` (around lines 518–525) re-judges a saved answer only when `!st.xp`, so the "This question changed in a newer build" path never runs for these saves.
- **Who it affects:** any student who answered a changed item right in Build 1. In this round that's Bakery s1 c1, s2 c2 and s4 c1, and Link Library s1 c1/c2/p3, s2 c1, s3 c1/c2/p6, s5 c1/c2/p4, s6 c1/c2/p5, s7 c1/c2/p5, s8 c1/p3/p4.
- **Suggested fix (engine owner):** re-judge every saved `ok` answer when the page's `build` differs from the save's build, not only when `xp` is missing. Saves have no build number today (`v: 2` is the save format), so the save would need one; keep the old judge-if-no-xp path as well.
- I changed nothing in the engine.

## Summary

- **Still FIX:** the engine's Build 1 → 2 changed-item reopen (above).
- **New JUDGMENT:**
  - g6-bakery s4 c1: the key's note is the only one written with digits (leaning FIX).
  - ela5-link s5 p4: "all day" is a noun after inside, which clashes with the sheet's "no noun after" test.
  - ela5-link s3 p6: the key is now tied for shortest.
- **All 15 round-1 ELA FIX items are fixed.** The 3 Bakery JUDGMENT items and 8 of the 9 ELA JUDGMENT items are fixed too. s7 k2 ("big") is unchanged and stays a fine JUDGMENT.
