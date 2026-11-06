# 🙈 Blind solve: 📝 Market Stall note sheets (g6-market, Build 1)

Fresh solver, student view only (`scripts/notes/g6-market-content.mjs` and the built `public/notes/g6-market/station-N.html`).
Every answer was written down first, then hashed as `PWN1|g6-market|s<n>:<item>|<canonical>` with the engine's own canon
functions (engine in `node:vm` with the unit's `enginePatches`) and compared with the page's `acc` hashes. Only then were
`check-notes-keys.mjs g6-market` and `check-g6-market-keys.mjs` run (both ✅) and the keys file opened.

## Totals

| Sheet | Auto-checked items | Matched on first answer | FIX | JUDGMENT | Minutes (required work) |
|---|---|---|---|---|---|
| 1 Price Tags | 15 | 14 (t1: my own slip, I wrote 12; the key 3 is right) | 0 | 0 | ~30 |
| 2 Percent Signs | 15 | 15 | 2 | 0 | ~25 |
| 3 Sale Signs | 15 | 15 | 0 | 2 | ~25 |
| 4 Discount Bin | 15 | 15 | 0 | 2 | ~30 |
| **All** | **60** | **59** | **2 + 1 unit-wide** | **4** | in the 25–35 target |

KEEP: the other 55 items. No key is wrong. No two choices have equal values. Every sheet matches its `MARKET_STATIONS`
station and docs/MARKET.md.

Forms probed and accepted: `36%`, `55 %`, `$4`, `4.00`, `8 pounds`, `$0.10`, `.10`, `0.1`, `1/10`, `1/2` and `$0.50` for 0.5,
`.63`, `63/100`, `four`, `Unit`, `count`/`amount` (s1 k2), `lower/smaller/cheaper/cheapest/least/less` (s1 k5), `the whole`/`total`,
`the part`. `10 cents` and `50 cents` get a helpful miss ("write it in dollars").

## Unit-wide

- Length (6 sets with different lengths; s2 c1 and s4 c1 are all one length): key shortest 2/6, longest 1/6 (+ s3 c1 tied
  longest), middle 2/6. Chance is 33%: **no length pattern.** Odd-one-out: none found.
- **FIX: number-choice value pattern.** All 3 number choice sets have the key as the *smallest* value (s1 c1 $2.50 vs $14,
  $40; s2 c1 15% vs 85%, 60%; s3 c1 0.15 × 60 = 9 vs 900, 400): 100% against 33% chance. Small sample, but "pick the
  smallest" wins every time. Give at least one set a smaller wrong value (for example 4 ÷ 10 = $0.40 in s1 c1, or 3% in s2 c1).

## Sheet 1 Price Tags
No FIX or JUDGMENT. (`unit rate` in "a {} rate" is refused, which is right: the blank is one word.)

## Sheet 2 Percent Signs
- **FIX p5** ("Two bars are each one whole… 7 parts are shaded in all. What percent is shaded?"): the key 175 is percent of
  *one* whole, but "what percent is shaded" reads as percent of the two bars, 7/8 = 87.5. `87.5` / `87.5%` are refused with
  no message. Ask "What percent of one whole is shaded?" (and add a miss for 87.5 explaining that each bar is 100%).
- **FIX k1-1** ("percent means out of {}"): `100`, `one hundred`, `a hundred` are accepted but plain `hundred` is refused.
  Add `hundred`.

## Sheet 3 Sale Signs
- **JUDGMENT p4** ("85% = ?/20. What number goes on top?"): `17/20` and `85/100` get a bare "no". The prompt does ask for the
  top only, so 17 is right; add a miss for 17/20 (0.85) saying "just the top number".
- **JUDGMENT coverage:** the game's benchmark skill also uses 5% and 1% (docs/MARKET.md); the sheet only shows 50%, 25%,
  10% and 20%. Fine for notes, but she meets 5% here first only on sheet 4.

## Sheet 4 Discount Bin
- **JUDGMENT levels:** p1 (Level 1, 70% of 120) takes two steps (10%, then × 7) while p3 and p4 (Level 2, 18/25 and
  42/300 → out of 100) take one. Level 3 (p5, p6) are real two-step find-the-whole problems: KEEP.
- **JUDGMENT k3** ("13 is what percent of 50? 13/50 = 26/100") works the exact numbers of sheet 2's short answer s2
  ("find what percent 13 out of 50 is"). If the sheets are done in order this is harmless; change one of them if not.
