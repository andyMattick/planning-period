# Audit: g7-ela2 try d (no pairs, cross-item check), proposals only

No brief was edited in this run. Everything below is a proposal for the owner.

## 1. Result and cost
- **Gate: FAIL, both versions, after 3 rounds.** The final no-passage probes got A 4 of 8 and B 7 of 8. A version fails at 4 or more.
- The keyless blind solve matched 16 of 16 mc keys. It still listed 8 FIX: A q4, A q8 and B q8 can be guessed; A q9 and B q9 are labelled level 3 but take one step; B q3 has two right answers; B q6 has its years out of order; B q5's action is printed in B q2 choice C. The fact recheck found 3 more FIX in round 3, and nobody rechecked them.
- **Cost: $12.63 with this audit** ($4.10 + $3.27 + $4.47 in sessions, $0.27 for the reporter, $0.52 for this audit; the lead added the audit's own cost). That is 77% of the $16.50 budget and 84% of the $15 stop. A fourth round would have cost about $3.36 (maker $2.27, two probes $0.62, fact recheck $0.47) and pushed the total to about $15.47, over the stop. Stopping was right.

## 2. What the adopted changes fixed, and what they did not
Cue tags on right answers, by round (try c had 10 mc per version, try d has 8):

| | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| Try c, A / B (of 10) | 7 / 9 | 8 / 6 | 9 / 5 |
| Try d, A / B (of 8) | 5 / 6 + 1 guess | 4 / 5 | 4 / 7 |
| Item cues, try c | 11 | 8 | 12 |
| Item cues, try d | 5 | 3 | 5 |

- **Fixed:** dropping the pairs roughly halved the item cues. A dropped to the line and stayed there (5, 4, 4) instead of climbing. With the rule that the passage must rule out each wrong choice, the round 1 and 2 fact FIXes were closed.
- **Not fixed:** the cross-item script found 0 hits every round while the probes found 3 to 5 item cues. The leaks between items are in meaning, not in shared words. B went 7, 5, 7: the whole-version fix lists did not stop new cues showing up. "Type" cues came back in B in round 3 (2 of them), because the story is the same shy-pet story as try c. Maker rule 1 (the story's turn must not be the type default) cannot help when the passage is reused.

## 3. Why the gate still fails
- **B (7 of 8, none confident):** the probe's tags were item 3, type 2, topic 1 and sounds 1. Pure guessing almost never reaches 7 of 8 (chance about 0.04%), so B leaks for real. Where it leaks:
  - B q3 has two right answers.
  - B q4's key is the story's default ("she comes out while he is away"). The maker flagged it as at risk and could not find a wrong choice the passage rules out.
  - B q8 can be guessed.
  - The other item cues sit in the B q2/B q5 link and the B q7/B q8/B q9 run on the article.
- **A (4 of 8, none confident):** tags item 2, sounds 1, topic 1. A q4's key "test" is the word used in [1]. A q8 can be guessed.
- **The probe named no items in round 2 A, round 3 A or round 3 B.** It lists only answers given at confidence 4. So the maker went into round 3 with nothing named for A.
- **Is 4 of 8 the right line?** With 4 choices, a blind guesser gets 2 of 8 on average and reaches 4 or more about **11%** of the time. If the guesser can drop one weak choice per item, that rises to about **26%**. So one probe run cannot tell a clean version at 3 from an unlucky one at 4. A's "4 with none confident" fits chance plus about one cue. The line itself is not proposed for change.

## 4. Proposals for the owner (ranked)
1. **Name every item the probe got right, with its cue tag, whatever its confidence** (`agents/blind-ela.md`). Cause: three failing probes gave the maker no named items to fix.
2. **When a passage is reused and the probe tags a "type" cue, rewrite the story's turn, not only the items** (`agents/maker.md` reading rule 1, `docs/RUNBOOK.md`). Cause: B's type cues came back with the same shy-pet story as try c.
3. **Run the keyless blind solve after round 1 instead of round 3** (`docs/RUNBOOK.md`). Cause: its 8 FIX (two right answers, guessable keys, wrong levels) arrived when there was no round left to fix them. The total cost stays the same.
4. **At the final round, run the probe twice per version and fail if either run is at the line or over it** (`agents/blind-ela.md`, `docs/RUNBOOK.md`). Cause: at 8 items, chance alone hits 4 or more 11 to 26% of the time, so one run is a noisy reading. This is stricter, not looser, and costs about $0.62.
5. **Before probing, the maker answers each item the way a reader who knows only the story type would, and replaces any key that matches** (`agents/maker.md`). Cause: the maker's self-read guessed 3 and 3, but the probes got 4 and 7.
6. **Recheck the final round's fact FIXes before a sample is shown** (`docs/RUNBOOK.md`). Cause: 3 fact FIXes from round 3 were never rechecked.

## 5. Cheaper without losing quality
- **Move the blind solve to round 1** (proposal 3). Expected saving: one FIX round on later orders, about $2.3 to $3.4, if its findings get fixed early. Quality risk: none, since it still runs. A final probe and a fact recheck would catch any slip later.
- **Lower the maker FIX cap from $2.75 to $2.40.** Rounds used $2.11 and $2.27. This saves nothing directly, but it stops a runaway round sooner. Risk: a large fix list could get cut off. The hand-off's check line would show this.
- **Do not drop the mid-round fact recheck ($0.55).** In round 2 it found 4 FIX that nothing else caught.
- **Drop the maker's self-read, or replace it with proposal 5.** It costs little, but it was wrong by 4 items on B, so a lead should not lean on it.
