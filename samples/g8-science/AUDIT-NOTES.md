# Audit notes: sample g8-science (for the auditor)

Order `pp-2026-11-05-g8-science`: made-up teacher Mr. Okafor, grade 8 science, chemical reactions and conservation of
mass. Items: guided notes (34 items), lesson slides (9 + title, speaker notes), quiz A/B (10 each). 115 tokens.
Written by the order lead (the coordinating session for this sample). No approval.json: the owner reviews the preview.

## How the team was run

Every role was a **fresh headless Claude Code session** (`claude -p`, model claude-opus-5-5; the reporter on
claude-sonnet-4-6), started in its own folder holding only the files its brief allows (brief, sources, training,
order, PACK-FORMAT/menu for the maker, `view.md` for checkers, `checks/` without fixtures). Each blind tester ran in
two phases of one session: answer from `view.md` with no `pack.json` in the folder, then the lead copied `pack.json`
in and resumed the same session to score. The lead merged each checker's JSON entry into `pack.checks`, ran Wilco
(scripts) with `--write`, and rendered the preview. Costs, tokens and minutes are exact from each session's own
result record (`total_cost_usd`, usage, wall clock). Resumed sessions report cost and API time cumulatively, so phase 2
cost = total minus phase 1.

Totals: 13 agent sessions/phases + reporter (2 passes), **$9.97**, 9.09 M tokens (almost all cache reads), about 34
agent minutes; wall clock 14:13–14:52 UTC. The lead's own time and tokens were not measured.

| Step | Cost | Minutes (wall) |
|---|---|---|
| Maker r1 | $2.02 | 6.1 |
| Blind r1 (2 phases) | $0.87 | 2.6 |
| Facts r1 | $0.93 | 2.6 |
| Maker r2 / r2 second pass / r3 | $0.92 / $0.55 / $0.49 | 2.6 / 1.3 / 1.3 |
| Blind recheck r2 / r3 | $0.83 / $0.51 | 2.1 / 1.4 |
| Facts recheck r2 / r3 | $0.79 / $0.37 | 1.6 / 0.9 |
| Reporter (Sonnet, 2 passes) | $1.69 | 10.9 |

## What each check found

- **🙈 Blind tester r1:** matched 44/44 scored (+10 open by hand). 6 FIX: notes n33 giveaway ("gets heavier" right
  before a more/less blank), quiz A q8 L3 that was really recall (and not parallel to B q8), L3 share 30% (asked ~40%),
  B q9 weight language, n2 accept list missing reversed order, n20 missing natural typed forms. 1 JUDGMENT (A q7 key
  is the only choice naming the gas), 2 KEEP.
- **🔎 Fact checker r1:** 280 claims; every equation balanced and every count right (it wrote the counts down). 6 FIX:
  A q6 key "17" vs data to 0.1 g; **three figures were false** (A q7 cup and slide 7 flasks showed bubbles and gas
  arrows *before* the reaction; B q7 bag drawn puffed before mixing) and the arrows pointed at the key; A q9 key "the
  balance lost its mass" (the teacher's banned idea); n2. 5 JUDGMENT for the teacher (heavier/weight wording from the
  source, sealed-bag buoyancy, steel-wool idealization, glow-stick cause, "molecule" for ionic compounds).
- **Lead (preview look):** quiz q4 choices wrapped mid-choice in the 4-column layout. Sent as FIX 12 to maker r2.
- **🤖 Wilco:** r1 pass (worst middle 32%, line 35%). **r2 FAIL: middle-length bot 36%** after maker r2's rewrites;
  maker second pass fixed wrong-choice lengths → r3 pass (longest 32%) → r4 pass (specific 32%).
- **Recheck r2 (fresh blind + fresh facts):** confirmed all 12 round 1 fact/blind FIXes. Blind found 4 new: A/B q8 still
  recall (both equations were the notes' practice lines), B q4 wrong choice matching no real error, n33 accept forms.
- **Recheck r3:** B q4 and n33 fixed. **A/B q8 still FIX** (new equations, but the stem does the first step and leaves a
  one-coefficient fix, the same shape as the practiced 2Mg + O₂ → 2MgO). Stopped after round 3 as the runbook says;
  it goes to the teacher in the preview with the tester's suggestion (AlCl₃ / FeCl₃, two coefficients). New JUDGMENT:
  B q4 easier than A q4 (no parentheses).
- Audit-report counts: 30 caught → 15 fixed, 14 kept (open q8 counted in r2 and r3, so it appears twice).

## What slowed the team or went wrong

1. **The maker's brief says run `test-wise.mjs --items` "until both exit 0", but `--items` always exits 0.** Maker r2
   reported "both exit 0" while the plain run failed (middle 36%); only Wilco's `--write` run caught it, costing an
   extra maker session ($0.55). The runbook step 3 has the same wording.
2. The round 2 maker's L3 rewrite of A q8 reused a practice-list equation; the blind tester caught it twice. The maker
   brief's "L3 a real second step" doesn't say "not an equation/example the source practices".
3. Figures: the maker drew "before" panels with the reaction already happening. No brief tells the maker to check that
   a before/after figure shows the before state truthfully; only the fact checker (reading raw SVG) caught it —
   `student-view.mjs` shows only a figure's text labels, so the blind tester could not see it in round 1.
4. Literal `**bold**` markdown in three prompts rendered as asterisks (renderer has no markdown). The lead fixed it in
   the pack after the preview look; no check caught it.
5. Quiz version A left "Part 3 · Explain it" alone at the foot of page 2 (no keep-with-next in the renderer); worked
   around through the pack (q6 `space: 2`).
6. Guided notes: a `short` item prints both the blank in the sentence and an "Answer:" line — redundant for fill-ins.
   There is no fill-in type.
7. Audit report: "Where the time went" printed float sums ("6.0999999 min") from one-decimal minutes; the lead rounded
   log minutes to whole minutes (noted in audit.notes). Log `who` names had to match each check entry's `agent` or the
   team table shows empty duplicate rows ("Blind tester (science), recheck", "Wilco (keys)").
8. Rechecks wrote `confirmed` lists (as the lead asked) rather than setting `fixed` on round 1 findings; the reporter
   then had to copy them over and missed the 6 fact findings on its first pass (lead sent it back: +$0.16).
9. The reporter on the cheaper tier still cost $1.53 on pass 1 (10 minutes) — more than any single checker. Most was
   re-reading a 28 KB hand-off and a large pack.json.
10. The blind tester brief wants ~40% L3 for tests; the r1 tester applied it to a quiz as a FIX. Reasonable here, but the
    brief only states it for tests.
11. Bash compound commands from inside fresh sessions were denied by permission rules a few times (the maker wrote a
    build script in its own scratchpad); sessions worked around it, at some token cost.

## Suggested brief changes

- `agents/maker.md` rule 6 and RUNBOOK step 3: "run `node checks/test-wise.mjs pack.json` (exit code) and `--items`
  (to see which bot picks each key; it always exits 0)".
- `agents/maker.md` rule 3: "an L3 item never uses an equation, example or number set the source practices"; rule 8:
  "a before/after figure shows the before state as it really is (no reaction yet)"; and "prompts are plain text: no
  markdown".
- `agents/blind-science.md`: say whether the ~40% L3 target applies to quizzes; in a recheck, "set `fixed` on the
  earlier finding" (as it says) and the lead should not ask for a separate `confirmed` list.
- `agents/facts.md`: keep the figure check explicit ("read every figure's SVG: does it show anything false or point to
  a key?") — it found the three false figures here.
- `agents/reporter.md`: log `who` must match the `agent` names used in `checks`; minutes as whole numbers or the
  renderer's sums show float noise.
- Renderer (not a brief): keep a section heading with its first question; a fill-in question type with no extra
  "Answer:" line; round minute sums; render or reject markdown.
- Cheaper: Wilco only needed to rerun the quiz; the reporter could get a shorter hand-off (numbers table plus the
  checks) instead of every agent's full reply.

## Round 4 (extra round, owner approved; written by the round 4 order lead)

Open item after round 3: quiz A q8 and B q8 too easy for level 3 (one coefficient). Same separation as rounds 1–3:
every role a fresh headless session in its own folder with only what its brief allows; the maker got a pack without
`checks`/`log`/`audit` and a two-item FIX list, and the lead copied only q8 back (diffed: nothing else changed).

| Step | Session | Minutes (wall) | Tokens | Cost |
|---|---|---|---|---|
| 📝 Maker r4 (Opus) | fresh | 2.6 | 1,326,327 | $1.00 |
| 🔎 Fact checker r4 (Opus) | fresh | 2.0 | 571,265 | $0.62 |
| 🙈 Blind tester r4 (Opus, 2 phases) | fresh | 1.3 + 0.7 | 248,491 + 297,421 | $0.40 + $0.18 |
| 🤖 Wilco (scripts) | — | 0 | — | — |
| 🧾 Reporter r4 (Sonnet, slim hand-off) | fresh | 7.7 | 345,797 | $0.92 |
| **Round 4 total** | | **14.3** | **2,789,301** | **$3.11** |

- **Before → after.** A q8: Na + Cl₂ → NaCl with 2NaCl given, one row left (key: 2 in front of Na) → Al + Cl₂ → AlCl₃
  with 2AlCl₃ given, two rows left (key B: 2Al and 3Cl₂; wrong: Cl₆ subscript trap, 3Cl₂ only, 6Cl₂). B q8: Cu + O₂ →
  CuO with 2CuO given (key: 2Cu) → Fe + Cl₂ → FeCl₃ with 2Fe given, two rows left (key D: 3Cl₂ and 2FeCl₃; wrong: 3Cl₂
  only, Fe₂Cl₂ subscript trap, swapped 3FeCl₃/2Cl₂).
- **Fact checker:** both equations real and balanced, every count right. **It caught an error in the round 3 tester's
  suggested wording**: the suggested subscript trap "Cl₂ to Cl₃" doesn't make the counts match (Cl 3 vs 6). The maker
  had already written Cl₆, so nothing in the pack changed; recorded as a FIX with `fixed` "nothing to change in the
  pack". New JUDGMENT: q8 is mc but sits under "Part 3 · Explain it / Write in complete sentences" (pre-existing).
- **Blind tester:** 2 of 2 matched, confidence 5, no flags; both round 3 FIXes confirmed fixed (now real L3, clearly
  harder than q4/q5, A and B parallel, B no easier). 2 JUDGMENT for the teacher (MC lets a student check options by
  counting; A's 4th wrong choice is "6Cl₂", B's is "swapped coefficients").
- **Wilco:** keys pass; test-wise pass, worst specific 32% → absolute/posC/posD 29% (chance 25%, line 35%).
- No new FIX in the pack, so **no round 5**.
- Preview look: the longer q8 choices left Part 3's heading alone at the foot of page 2 in A only; `space` is one value
  for both versions, so set q5 `space: 2` and q6 `space: 5` (was 2) so A and B break the same way (Part 3 opens page
  3). The **teacher copies** still end page 3 with the Part 3 heading alone (no keep-with-next past the directions line).

### Counting: duplicates (for the coordinator)

The round 2 and round 3 q8 FIXes (A and B) are one problem per item. Both now carry `fixed`; the round 3 ones also
carry `sameAs: {check: "blind", round: 2, where}` and their `fixed` text starts "Same problem as the round 2 finding".
**The renderer ignores `sameAs`**, so the front page now says **20 needed a fix: all 20 fixed · 17 kept · 14 left for
you** (before round 4: 15 fixed, 4 not fixed yet). Counted once each, the real numbers are **18 problems, all fixed**
(20 minus the two round 3 duplicates; the fact checker's FIX on the suggestion is counted as a real catch). The round 1
A q8 finding (recall, not parallel) is a different problem, fixed in round 2. I did not change the renderer.
Suggestion: `bucketOf`/`auditStats` skip findings with `sameAs` in the counts and show them under their original.

Also on the front page: "**5 rounds** of checks" comes from Wilco's run counter (`--write` numbers its runs 1–5, and
round 2 had two Wilco runs), not the order's 4 rounds. It said 4 for 3 order rounds before. Suggestion: count
rounds from blind/solver/facts only, or let Wilco take the order round.

### Brief suggestions from round 4 (for the auditor)

- `agents/blind-science.md`: a suggested fix ("e.g. …") must be counted and checked like any item; the round 3 tester's
  Cl₃ trap was wrong. Or the RUNBOOK: the fact checker always checks the previous round's suggested wording.
- `agents/maker.md`: when an item moves to a section with written-answer directions, check the section still fits the
  item type (q8 mc under "Write in complete sentences").
- A slim reporter hand-off (numbers table + pack without documents) cut the reporter from $1.53 to $0.92 but still
  took 7.7 minutes; most of it was copying 26 rows unchanged. The lead could append rows and let the reporter write only
  notes.

## Round 5: the cross-item giveaway (owner decision 2, Nov 7, 2026; written by the order lead)

`checks/cross-item.mjs` came in after this sample was finished and found **1 hit**: B q8's key ("Use 3Cl₂ on the left
and 2FeCl₃ on the right") shares "left" and "right" with B q10's stem ("4 molecules on the left and 2 on the right").
Each role a fresh `claude -p` session in its own folder; costs are each session's own record.

| Step | Who | Result | Cost |
|---|---|---|---|
| Maker (cap $1.50) | fresh maker, FIX list only | q10's stem in B, and in A to keep them parallel: "on the reactant side" / "on the product side"; no key or model answer changed; cross-item 1 → 0 | $0.45 |
| Blind recheck (keyless, then scored) | fresh blind tester, q8 and q10 in A and B | 4 of 4 matched, no giveaway left; FIX A q10 and B q10 too easy for L3: both equations are practised in the notes (unchanged text) | $0.88 |
| Fact recheck | fresh fact checker | 14 claims in the changed stems and model answers, 0 off | $0.26 |
| Wilco | scripts | keys, test-wise and cross-item pass (round 5) | — |
| **Total** | | under the $6 cap | **$1.59** |

**Open, listed first in `audit.notes`:** q10 (A and B) is too easy for L3 because its equation is one the notes practise
(`agents/maker.md` rule 3). It is older than this round; fixing it means a new equation and a new model answer, which is
more than the owner's "fix only the flagged items", so it is left for the owner.

No outputs are committed for this sample (only `pack.json`); the preview renders with the same page counts as before.
