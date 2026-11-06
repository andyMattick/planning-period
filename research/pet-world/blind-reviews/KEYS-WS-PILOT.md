# ✅ Key check: 📝 worksheet pilot (g6-bakery, ela5-link)

Fresh checker (did not make these sheets), Nov 2, 2026. Scripts:

- `node scripts/notes/check-g6-bakery-keys.mjs`: 🥐 Bakery, 5 sheets
- `node scripts/notes/check-ela5-link-keys.mjs`: 🔗 Link Library, 8 lessons

Both take `--keys <file>` and `--pages <dir>` to check a copy. Each exits 1 on any problem.

## What the scripts check

1. **Each item solved on its own.** The checker worked out every item from the content wording, not from the keys.
   - Math: Try it first, blanks, Your turn and Spot the mix-up are recomputed with exact fractions in the script. Hand sums double-check the multi-step ones.
   - English: a table (`W`) holds the checker's own answer to every item: blank words, typed words, punctuated sentences, the right choice and the counted number. It was written from the content before the keys file was opened.
   - The key's main answer has to match the checker's answer. Every accepted form has to have the same value.
2. **Stored hashes.** The `window.PWN` data in `public/notes/<unit>/station-<n>.html` is parsed.
   - The hash of the solved answer must be stored as right. It is SHA-256 of `PWN1|<unit>|s<n>:<item>|<canonical>`, using the engine's own `canonOf`, `textCanon`, `optCanon` and `sentCanon` loaded with vm, with the same gate and patches as the build.
   - Every stored right hash must come from an accepted form in the keys, and every accepted form must be stored.
   - No stored miss hash may also be a right hash.
   - For typed sentences, the stored `near` hashes must come only from accepted sentences.
3. **Locked text.** The locked explanation (and a problem's final step) is unlocked with the solved answer and must not be empty.
4. **Wrong answers and choices.**
   - No wrong-answer message may equal a right answer. Number words count as numbers: `six` = 6.
   - Every choice item has exactly one option stored as right, and no two options share the same text.
   - Math options that are numbers or `a op b` must have different values (0.5 = 1/2).
   - Every wrong option has a why-wrong message.
5. **Defensible second options (English).** The script flags any wrong option that can be either a preposition or an adverb, in an item that asks about prepositions or adverbs. It also reads a `DEFENSIBLE` list, which makes the check fail.
6. **Every item** has a hint (content), an explanation (keys) and, for problems, a final step.

## Results

| Unit | Items checked | Stored right hashes | Result |
|---|---|---|---|
| g6-bakery | 74 (5 try-its, 27 blanks, 30 problems, 10 mix-up choices) | 122 | ✅ exit 0 |
| ela5-link | 105 (8 try-its, 33 blanks, 48 problems, 16 mix-up choices) | 135 | ✅ exit 0 |

**FIX: none.** Every key matches the checker's own answer. Every stored hash matches an accepted form, and the checker's answer is always among them.

**Fault test.** In temp copies outside the repo, each script exited 1:

| Unit | Change in the copy | What the script reported |
|---|---|---|
| g6 | key `3 p3` changed from `1 1/4` to `1 1/3` | value 4/3 ≠ 5/4, plus a stored or accepted hash mismatch |
| g6 | stored `4 p4` right hash corrupted | my answer's hash not stored |
| ela5 | key `4 p5` changed from `wags` to `wag` | key ≠ mine, and a miss equals a right answer |
| ela5 | stored `7 p5` hash corrupted | my sentence's hash not stored |

With the real files, both scripts exit 0.

## JUDGMENT and KEEP calls

### g6-bakery

- **1 c1 (JUDGMENT, kept).** “7.40 + 2.36 with the points in a line” and “7.4 + 2.36 with the last digits in a line” have the same sum. The item asks how to set the problem up, not for a value, and the text is different, so the script allows this one tie (`VALUE_TIE_OK`). Any other tie fails. The owner may want a wrong set-up with a different sum, such as “7.4 + 23.6 …”.
- Blanks also accept number words (`ten`, `one third`, `a hundred`). The checker reads them as the right numbers.

### ela5-link

- **7 p1 (KEEP).** “Wow! The fox is fast.” and “Wow! the fox is fast.” differ only by the capital T. A Your-turn choice compares capitals and marks, and the item is testing that capital, so they count as different. Under the looser Spot-the-mix-up rule they would be the same.
- **The dual-word scan flagged 3 options. All are KEEP.**
  - 1 p3 `through`: the item asks which word is NOT a preposition. Only “gently” can never be one.
  - 3 p1 `under` and `across`: the item asks which word tells WHEN. Neither of them tells a time.
- **I read every other choice item, and only one option holds up in each** (`DEFENSIBLE` is empty). Examples:
  - 5 p1 and 5 p6: over and inside, each with and without an object.
  - 2 p5: the only adjective phrase.
  - 4 p1 and 4 p4: verb agreement.
  - 3 p3: among for three, following the unit's own rule. The builder noted that “between” is common in speech.
- **Lenient forms the keys accept beyond mine (KEEP).** These are reasonable:
  - pronouns, except for, gold glasses, the window, amongst, movement or motion, towards, nearest or closer, the leaves, feelings or emotion, works or work (mine was “makes sense”, also accepted), wondering, relieved, uppercase, each or two, phrases.
  - “relieved” in “usually shows {}” and “gold glasses” for “type the noun” are loose but harmless.
- **Typed sentences.** 7 p3 and 8 p5 accept both “.” and “!” for the second sentence. I would accept both too.

This tool was created with the help of AI. Check important results.
