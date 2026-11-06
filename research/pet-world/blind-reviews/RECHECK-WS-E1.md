# 🙈 Recheck: batch E1 note sheets, Build 2 (ela6-punct, ela7-colon, ela8-sent)

Fresh solver. I did not build these sheets and did not blind-solve Build 1.

## What was run

1. I listed every student-facing item that changed from Build 1 to Build 2. To do that I loaded both versions of each content file and compared them item by item:
   - ela6-punct: e6ae001 → aef4de6
   - ela7-colon: c59f68f → 962545c
   - ela8-sent: fb2f930 → 9a375c8

   Each changed item counts once, whether its question, choices, hint, steps or mix-up text changed. The content files on `claude/ws-e1` match Build 2.
2. I solved each changed item blind, with only the content files, the built pages and the engine open. Then I hashed my answer as `PWN1|<unit>|s<n>:<item>|<canon>`. The canon came from `engine/notes.js`, loaded in `node:vm` with `window.PWN` read from `public/notes/<unit>/station-N.html`. I compared each hash with the page's stored `acc` / `miss` / `near` hashes. I also probed about 60 typed variants this way.
3. Only after that did I run `check-notes-keys.mjs` on each unit (all ✅) and `notes-test-wise.mjs --units ela6-punct,ela7-colon,ela8-sent` (3 of 3 pass). Then I opened the keys to read the miss messages for the items flagged below.
   - ela6-punct: chance 27%, longest 17%, odd one out 30%, middle 31%, learnedCV 24%.
   - ela7-colon: chance 31%, best is learnedCV at 34%.
   - ela8-sent: chance 31%, best is middle at 36%. (learnedXU scored 43%, but it's advisory and not counted.)

**The number-word fix works on the built pages.** These all pass:

| Unit | Item | Accepts |
|---|---|---|
| ela7-colon | L9 k1-1 | `three`, `Three`, `3` |
| ela8-sent | L2 k2-1 | `one`, `1` |
| ela8-sent | L4 k3-1 | `one` |
| ela8-sent | L4 k4-1 | `two` |
| ela6-punct | L9 k1-1 | `two`, `2` |

Also:
- ela8 L2 k2-1 `two` now shows its miss message.
- ela7-colon accepts `semi-colon` (L2 t1, L3 k1-1) and `semi-colons` (L2 k4-1).

**The other new accepted forms pass too:**
- ela7-colon: `em-dash`, `forcefully` / `powerfully`, `italicized`, `independent clause`, and `. . .` (L9 p4).
- ela6-punct: `Luckily,`, `a robot with gold wheels,`, and both `It has been…` and `It’s been…` (L13 p6).

## Results

| Unit | Changed items | Auto-checked | Matched on first answer | FIX | JUDGMENT |
|---|---|---|---|---|---|
| ela6-punct | 23 (L1 p6/c1/c2, L2 p6/c1, L3 c1, L4 c1/k3/k5, L5 c1/c2, L6 c1, L7 c1/c2, L8 c1, L9 c1, L10 p1/c1/c2, L11 c1, L12 mix-up, L13 p2/c1) | 22 | 22 | 0 | 0 |
| ela7-colon | 19 (L1 p6/c1, L2 p1/p3/c2, L3 p2, L4 p2/p5/c1/c2, L5 p6/c1/c2, L6 c1, L7 c1/c2, L8 c1, L9 p1/c2) | 19 | 19 | 2 | 0 |
| ela8-sent | 19 (L1 p2, L2 p5/p6/c2, L3 p2/p4/p5/c2, L4 p1/p5, L6 p5/p6/c2, L8 p1/p5, L9 p1/p5/p6, L9 mix-up) | 18 | 18 | 0 | 0 |

No key is wrong. No changed item has two right answers among its choices, except ela7 L4 c1 below. Every Build 1 FIX I could check is gone:
- No more "Tell me" / "Ines" in steps that don't match the choices.
- The steps no longer give the answer (ela8 L2 p5, L3 p4, L6 p6, L8 p5, L9 p5, L9 p6).
- The Level 3 items now have a real second step (ela7 L1 p6, L4 p5, L5 p6).
- The try-it date and noun are gone from the ela6 L4 hints and the L12 mix-up.

Things I checked and kept (KEEP):
- ela6 L1 c1: choices B and C describe end marks Tobias didn't use, so they're easy to rule out. They're still fair.
- ela7 L4 p5: mixed forms like `: semicolon` and `1 colon 2 semicolon` are refused with no message. That's minor.
- ela7 L7 c1 and L8 c1: the two wrong choices share a frame ("short hyphen" / "long dash"), but each gives a different fix. The odd-one-out bot is below chance.
- ela8 L2 t1 and L7 p5 ("Type a number") still take only `2`, not `two`. Neither item changed, and the prompt asks for a number.

## FIX

**ela7-colon L4 c1, choice B** (Max: “Tempo loves one snack; crunchy lettuce.”)
- B now reads “The second part names the snack, so it needs a comma.” That makes B close to a second right answer. “Tempo loves one snack, crunchy lettuce.” is a normal end-of-sentence appositive comma, and many teachers and style guides accept it, the same way they accept “I have one friend, Sam.”
- The key's miss message (“a comma doesn’t point ahead”) is arguing a style preference, not a rule.
- Suggested change: replace B with “The second part names the snack, so the semicolon should move after lettuce.” Or use “…so it needs no mark at all.” Then update its miss message to match.

**ela7-colon L5 c1, choices B and C** (Ana typed a short story's title in italics)
- B is “…a whole work, so it gets underlined.” C is “…a short work, so it gets underlined.” Both give the same correction (underline), so a student who rules out one rules out the other. This is the same twin pattern Build 1 had. Build 2 changed C's reason but kept its fix.
- Suggested change: give C a different fix. For example: “A short story is a short work, so it needs no marks at all.” Or: “A short story is a long work, so the italics are right.” Then update its miss message to match.
