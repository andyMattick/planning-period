# Math in a pack: typesetting, graphs as data, and the math check

What a math pack can hold, from Pre-algebra to Calculus and Statistics (`menu.json` `mathCourses`), how the renderer
draws it, and how the 🧮 solver's tool checks it. The capability fixture is `samples/_cap-math/` (an Algebra 1
worksheet, an Algebra 2 / Precalculus quiz A/B, a Calculus quiz A/B and a short slide deck; a test, not a sample).

| Piece | Where |
|---|---|
| Typesetting (KaTeX, Word equations, slide images) | `scripts/render/math.mjs` |
| Graphs as data | `scripts/render/graph.mjs` (hooked in through `cleanSvg` in `scripts/render/util.mjs`) |
| The math check | `checks/math.mjs` + `checks/math_check.py` (SymPy), run by `npm run check` |

## 1. Math typesetting: `$…$` and `$$…$$`

Any text field may hold LaTeX: `prompt`, `choices`, `answer`, `accept`, `why`, `unit`, `directions` (document and
part), slide `bullets`. `$…$` is inline, `$$…$$` is a display line (centred on its own line).

```json
"prompt": "Find $\\displaystyle\\lim_{x \\to 2} \\dfrac{x^2 - 4}{x - 2}$.",
"choices": ["$\\dfrac{8}{3}$", "$4$", "$\\dfrac{16}{3}$", "$\\dfrac{4}{3}$"],
"why": "Let $$f(x) = \\begin{cases} x^2 & x < 1 \\\\ 3x - 2 & x \\ge 1 \\end{cases}$$ so $f(3) = 7$."
```

- **Prices stay prices.** Pandoc's rule: an opening `$` is not followed by a space, a closing `$` is not preceded by a
  space and not followed by a digit. "`$12 ÷ 3 = $4`" has no math. `\$` is always a dollar sign. A pack can turn
  typesetting off with `"mathText": false`. (Every existing sample renders exactly as before: none has a math span.)
- **Fractions a student must read: use `\dfrac`.** `\frac` inline is set small, as in a textbook line; on a worksheet
  `\dfrac` reads better. `\displaystyle` in front of `\lim`, `\int`, `\sum` puts the limits under and over.
- Supported: fractions, exponents and subscripts, `\sqrt{}` and `\sqrt[n]{}`, `\int`, `\lim`, `\sum`, `\prod`,
  matrices (`pmatrix`, `bmatrix`), piecewise (`cases`), `\le \ge \ne \pm \approx \infty \pi \theta`, `\text{cm}^2`
  for units, `\left( \right)`, `\overline{AB}`, `\angle`, `\triangle`, anything KaTeX reads.
- **PDF and HTML:** KaTeX renders in Node (`renderToString`); its CSS and woff2 fonts are inlined as data URIs only on
  pages that have math. No CDN, no network. A key and a right choice in the teacher copy are set in bold math too.
- **Word:** real Word equations (OMML), built from KaTeX's MathML with the `docx` package's Math classes (fractions,
  scripts, radicals, integrals and sums with limits, `lim` as a function with its limit, `sin x` as a function). They stay
  editable in Word's equation editor. The `docx` package has no matrix or equation-array class, so a **matrix, a
  `cases` piecewise or an accent** (`\overline`) is placed as a crisp PNG of the KaTeX rendering (3× scale) instead:
  it looks the same, and the teacher retypes it in Word if she wants to edit it. Why not MathML→OMML with Microsoft's
  XSLT: it needs Office's `MML2OMML.XSL` (not ours to ship) and an XSLT engine; building OMML from KaTeX's own
  MathML covers everything but tables with no new dependency.
- **PowerPoint:** plain text when the math can be written in Unicode without losing meaning (`x²`, `≤`, `π`,
  `(d/dx)(x⁵) = 5x⁴`), else a PNG of the typeset math (integrals, limits, stacked fractions, piecewise). Speaker
  notes are always plain text (Unicode).
- **Graph labels:** written in Unicode (`y = x² − 4x + 1`); SVG can't hold KaTeX (the renderer strips
  `foreignObject`).

## 2. Graphs as data: `figure: {graph: {...}}`

`figure` may be a graph spec instead of an SVG string, per version too (`{"A": {"graph": …}, "B": {"graph": …}}`).
It is drawn to clean SVG (PDF, HTML, handouts, cards) and to PNG (Word, PowerPoint). Black-and-white safe: black and
greys only, curves told apart by dash pattern and label, shading by hatching. Expressions use mathjs syntax
(`2x + 1`, `x^2 - 4x + 1`, `sin(x)`, `e^(0.5x)`, `(x+1)/(x-2)`, `ln(x)`, `sqrt(x)`); a leading `y =` and `$` are
dropped; mathjs evaluates them in its own sandbox (no JavaScript eval; its `import`, `evaluate`, `parse` are switched off
inside expressions).

**Nothing labels itself.** Only a `label` the maker wrote is drawn, and any element whose `id` is in `hide` loses its
label. The checker fails a graph whose visible label is the key (`checks/math.mjs`).

### `kind: "plane"` (the default)

| Field | What |
|---|---|
| `x`, `y` | The window, `[min, max]` (default `[-10, 10]`) |
| `ticks` | Tick step, a number or `{x, y}` (default: a nice step, about 10 ticks) |
| `labelEvery` | Number every Nth tick, a number or `{x, y}` |
| `grid` | `false` for none, a step, or `{x, y}` (default: the ticks) |
| `axes` | `"edge"` puts the axes on the left and bottom (default when 0 is outside the window) |
| `axisLabels` | `{x: "x", y: "y"}` (default on a centred plane), or words for data |
| `xTickFormat` | `"pi"`: x ticks at multiples of π/2 labelled `π/2`, `π`, … (trig graphs) |
| `title`, `width`, `height`, `alt` | Optional; size in px (default 340 × 300) |
| `functions[]` | `{id, expr, domain: [a, b], ends: {left, right: "open" \| "closed"}, style: "solid" \| "dashed" \| "dotted" \| "dashdot", label, labelAt: x, labelPos: "ne" \| "nw" \| "se" \| "sw" \| "n" \| "s" \| "e" \| "w"}`. A piecewise function is several functions with `domain` and `ends` |
| `asymptotes[]` | `{x: 2}`, `{y: 1}` or `{expr: "x + 1"}` (slant); always dashed. The curve is broken at a vertical one |
| `points[]` | `{id, at: [x, y], open, label, labelPos}` (or a bare `[x, y]`) |
| `segments[]` | `{from: [x, y], to: [x, y], style, arrow, label}` |
| `polygons[]` | `{id, points: [[x, y], …], shade, vertexLabels: ["A", "B", "C"]}` |
| `inequalities[]` | `{expr, sign: "<" \| "<=" \| ">" \| ">="}` or `{x: 3, sign}`: shaded side, boundary dashed when strict. Two or more: hatching only, at different angles, so the overlap reads as cross-hatched |
| `areas[]` | `{expr, from, to, base: "0"}`: the shaded region between `expr` and `base` (area under a curve, a definite integral) |
| `tangents[]` | `{expr, at, length, style, label, point}`: the tangent line at `x = at` (slope from mathjs's derivative), dashed by default, with its point |
| `slopeField` | `{expr: "x - y", step}`: dy/dx in `x` and `y` |
| `line` | On a scatter plot: `{fit: true}` (least squares) or `{expr}` |
| `hide` | Ids whose labels are not printed |

### Other kinds

| `kind` | Fields |
|---|---|
| `numberLine` | `from`, `to`, `step`, `labelEvery`, `tickLabels` (custom, e.g. fractions), `points[] {at, open, label}`, `rays[] {from, dir: "left" \| "right", open}`, `segments[] {from, to, openLeft, openRight}` |
| `scatter` | As a plane with axes on the edge: `x`, `y`, `ticks`, `points: [[x, y], …]`, `line`, `axisLabels` |
| `histogram` | `bins: [[lo, hi, count], …]` or `data` + `start` + `binWidth`; `axisLabels`, `yMax`, `yStep` |
| `boxPlot` | `min, q1, median, q3, max` or `data` (quartiles: median of each half); `from`, `to`, `step`, `axisLabel`, `outliers`, `lowWhisker`, `highWhisker` |
| `dotPlot` | `values`, `from`, `to`, `step`, `axisLabel` |

Example (the intersection is the asked answer, so its label is hidden):

```json
"figure": {"graph": {"x": [-6, 6], "y": [-6, 6], "ticks": 1,
  "functions": [{"expr": "2x + 1", "label": "$y = 2x + 1$", "labelAt": -2.5, "labelPos": "e"},
                {"expr": "-x + 4", "style": "dashed", "label": "$y = -x + 4$", "labelAt": 4.6}],
  "points": [{"id": "meet", "at": [1, 3], "label": "(1, 3)"}], "hide": ["meet"]}}
```

**The keyless student view** (`checks/student-view.mjs`) describes a graph by what a student reads off it, never by its
expression (that could be the answer): "a dashed curve or line, passing through grid points (−2, 6), (−1, 5), (0, 4)…",
asymptotes, open and closed dots, shading, and the visible labels. A hidden point is "an unlabeled dot".

## 3. The math check: `math: {check: {...}}`

`node checks/math.mjs <pack.json> [--write [--round N]] [--strict]`. A question opts in with a `math.check`; per version
as `math: {check: {"A": {...}, "B": {...}}}` (or `math: {"A": {check}, "B": {check}}`). SymPy (`checks/math_check.py`,
run with `python3 -I`) works the answer out **from the check alone, never from the key**, then judges what the pack says:

- `short` / `numeric`: the key is right, and so is every `accept` form. A decimal is right when the exact answer rounds
  to it (`2.67` for 8/3; the report says "right when rounded to 2 places"). A `unit` at the end is ignored.
- `mc`: the key is right, **exactly one choice is right**, and no wrong choice is equivalent to the key (`0.5` and
  `\frac12`; `2x^2-8` against `2(x-2)(x+2)` on a factor question is wrong because it isn't factored).

Keys and choices may be written in LaTeX or plain text: `$x = 4$`, `4`, `x = 2 or x = -3`, `$x = 3 \pm 2$`, `(3, 2)`,
`x = 3, y = 2`, `$x > 3$`, `-4 < x \le 2`, `no solution`, `all real numbers`, `DNE`, `$f'(x) = 24x(3x^2+1)^3$` (a
name before `=` is ignored), `$2x^3 - 4x + C$`, `$y = 2x - 1$`.

| `type` | Fields | Right answer |
|---|---|---|
| `solve` | `expr` (an equation or inequality, chains too), `var` (default `x`) | the solution set over the reals; the key may be values, `x = …` pieces, `±`, or an inequality |
| `zeros` | `expr`, `var` | the real zeros of `expr` |
| `system` | `exprs: ["2x + 3y = 12", "x - y = 1"]`, `vars: ["x", "y"]` | the point(s); `no solution` / `infinitely many` |
| `intersection` | `exprs: ["2x + 1", "-x + 4"]` (two functions of x) | the point(s) where they meet |
| `derivative` | `expr`, `var`, `order` (1), `at` (optional: the value there) | equivalent expression or value |
| `integral` | `expr`, `var`; `from`, `to` for a definite integral | definite: the value; indefinite: the key's derivative is `expr` (up to `+ C`) |
| `limit` | `expr`, `to` (number, `oo`, `-oo`), `dir` (`+-` default, `+`, `-`) | the value, `oo`, or `DNE` when the one-sided limits differ |
| `factor` | `expr` | equivalent **and** fully factored over the rationals (no factor splits further, no common factor left inside) |
| `simplify`, `equivalent` | `expr` (an expression, or one equation: then the key must be an equivalent equation) | equivalent (exact, then 12 numeric spot checks) |
| `evaluate` (`value`) | `expr`, `tol` (absolute) | the number; with `tol` for "round to …" answers |
| `vertex` | `expr` (a quadratic) | the point |
| `asymptote` | `expr`, `kind: "vertical" \| "horizontal" \| "slant"` | `x = …` / `y = …` |
| `tangent` | `expr`, `at` | the line `y = mx + b` |

Expressions in `expr` may be plain (`x^3 sin(x)`, `5(x - 2) = 3x + 4`, implicit multiplication allowed) or LaTeX.
Each job has a 20-second limit.

**For every question, opted in or not**, it also fails: LaTeX that KaTeX can't read (any text field, slides and
directions included), a graph that can't be drawn or whose expression gives no real value on its window, and a graph
label that gives the key away.

**Exit 1** on a wrong key, a wrong accept form, two right choices, a key it can't read, a check that can't run, bad
LaTeX, a bad graph or a label that leaks the key. A *wrong* choice it can't read is a warning (it can't say that choice
is wrong; `--strict` makes it an error). `--write` adds `{check: "math", round, agent: "🧮 Solver (checks/math.mjs,
SymPy)", checked, disagree, pass, findings, problems}` to `checks.solver` (round: the next for this check, or
`--round N`); the audit report shows it in the solver table. Run it once per round with `--write`, like
`checks/keys.mjs`.

`npm run check` runs it on every sample with a `math.check` and proves it still bites on broken copies of
`samples/_cap-math` (a wrong key, a wrong choice equal to the key, a label that gives the key away, a wrong accept
form, LaTeX that doesn't parse).

What it can't do: word answers ("the graph rises"), proofs, constructions, reading a graph's shape for a key that is
only on the picture (write the check from the function the graph draws), statistics answers that depend on a
convention (quartile methods: give `evaluate` the value you mean).

## 4. Number versions by script: `gen` (owner, Nov 8, 2026)

For a "same questions, different numbers" order (a test or quiz with versions, a `versions` order that asks for new
numbers), the maker writes **version A only**, with every number as a named parameter, and `scripts/versions.mjs` makes
B, C… in under a second. Why: the first real online order (docs/audits/TIME-2026-11-08.md) spent 9.9 of its 31 minutes
in the maker writing three versions by hand, most of it re-working each table, r, line and key for B and C.

```
node scripts/versions.mjs pack.json                 # makes every version in the document's `versions` other than A
node scripts/versions.mjs pack.json --verify        # B, C… in the pack still come from A's formulas (exit 1 if not)
```

The spec, on the document (parameters several items share, such as a two-way table) and on each item:

```jsonc
"gen": {                                                        // on the document: params, derived, constraints
  "params": { "a": {"int": [20, 60], "A": 36}, "b": {"int": [20, 60], "A": 24} },
  "derived": { "r1": "a + b", "n": "a + b + c + e" },             // mathjs, in order
  "constraints": ["a != c", "a / r1 != c / r2", "n <= 200"]
}
"gen": {                                                        // on a question
  "params": { "d0": {"num": [10, 30], "places": 1, "A": 12.5}, "xr": {"int": [4, 12], "A": 8}, "yr": {"int": [10, 50], "A": 26} },
  "derived": { "pred": "d0 + d1*xr" },
  "constraints": ["abs(yr - pred) >= 0.5"],
  "distinct": ["{{yr - pred|2}}", "{{pred - yr|2}}"],         // the key and each distractor formula, as printed: must differ
  "fields": {                                                   // templates for the version fields
    "prompt": "The least-squares line $\\hat{y} = {{d0}} + {{d1}}x$ … One data point is ({{xr}}, {{yr}}). Find its residual.",
    "answer": "{{yr - pred|2}}",
    "math": {"type": "evaluate", "expr": "{{yr}} - ({{d0}} + {{d1}}*{{xr}})"},
    "why": "Predicted: {{d0}} + {{d1}}({{xr}}) = {{pred|2}}. Residual = {{yr}} − {{pred|2}} = {{yr - pred|2}}."
  }
}
```

- **Parameters:** `int` (with `step`), `num` (with `places`) or `pick` (a list); each one gives its **version A value**.
  An item's names can't repeat the document's.
- **Placeholders:** `{{expr}}` prints a number (no trailing zeros), `{{expr|1}}` rounds to 1 place, `{{expr|f2}}` keeps
  2 places, `u` prints a minus as −, `,` adds thousands commas; a whole string `"{{=expr}}"` is the value itself (for a
  graph spec). Helpers besides mathjs's own: `corr(xs, ys)`, `slope(xs, ys)`, `intercept(xs, ys)`. Templates can't call
  `import`, `evaluate`, `parse` or similar.
- **Fields:** any per-version field (`prompt`, `figure` as an SVG string or a graph spec, `choices`, `answer`, `accept`,
  `why`, `math` as the `math.check` object). An mc item's choices are written in A's order and its key is A's `answer`;
  each new version moves the key to a letter the earlier versions didn't use (spreading the letters). Per-version fields
  with no template (a `unit`) are copied from A. Items without `gen` are written by hand in every version, as before.

**It refuses** (exit 1, nothing written) when: the formulas don't give version A exactly (so what the checkers read in A
is what makes B and C); a constraint fails (it redraws up to 200 times per item and per document, and names the
constraint that kept failing; a `--values` number that breaks one is refused, never redrawn); two choices print the same
or have the same value; two `distinct` texts print the same; a version's prompt and picture repeat another version's; a
numeric item has no `math` template, or a `math` template uses no parameter or comes out the same as A's while the
numbers changed (a number typed into the check); or SymPy (`checks/math.mjs`, run on every key it made) disagrees. It
warns when a choice is word for word in A (the memorizer bot reads a graded A). The same seed (the pack's id by default)
and the same A always give the same B, C….

**What it does not replace.** The math check on B and C uses the same formulas as their keys, so it proves the
arithmetic and rounding, not that a formula is right: version A's blind tester and solver prove that, and **a fresh
solver still works every number in B and C from the student copy** (docs/RUNBOOK.md, "The fast path"). Wilco runs on
every version. Tested by `scripts/test-versions.mjs` on the made-up fixture `checks/fixtures/versions/version-a.pack.json`
(in `npm run check`).

**Per-student numbers later** (the owner's wish in this order's request, "randomize the numbers, not the questions";
`feasibility.json` says not supported yet). The spec is the whole recipe: a student's version is
`versions.mjs --versions S --seed <order id>|<student code>`, with the same refusals and the same SymPy check. What it
still needs: making them before the class (say 40 seats a class, about 1 s for 40 versions), a teacher copy per seat (or
one answer table per seat), a solver sweep of a sample of seats plus SymPy on every seat, and the interactive page picking
its seat from a class code. Nothing about the checked version A changes.

## For the maker and solver briefs (the auditor adds these; nobody else edits `agents/`)

Suggested additions, for the auditor to word and version:

**`agents/maker.md`**
- Write all math in LaTeX between `$…$` (`$$…$$` for a line of its own): exponents, fractions, roots, inequalities,
  integrals, units (`$12\,\text{cm}^2$`). Use `\dfrac` for a fraction a student must read. Write money as plain
  `$12` (no closing `$` right after a non-space), or `\$12` when in doubt.
- Draw graphs as data (`figure: {graph: …}`, docs/KINDS-MATH.md), never as a hand-written SVG. Label only what the
  student is given; give the asked element an `id` and put it in `hide` (or leave it unlabeled).
- Give every math question a `math.check` the solver's tool can run (the table in §3), written from the problem, not
  from your key. A question it can't express (words, a proof) gets none; say so in your notes.
- Run `node checks/math.mjs pack.json` (no `--write`) while writing, with `checks/keys.mjs` and `checks/test-wise.mjs`.
  Fix wrong choices, never the check, to make it pass.
- Wilco's length bots read the LaTeX source (`\dfrac{8}{3}` is "longer" than `4`): when the key is a fraction, make
  some wrong choices fractions too.

**`agents/solver-math.md`**
- Step 1 is now: run `node checks/math.mjs pack.json` and read every line; then solve by hand (or in a short script)
  every item it did not check (`opted` < rows), every word answer, and every `why`.
- Check each `math.check` against the **prompt**: the tool proves the key matches the check, so a check copied wrong
  from the prompt hides a wrong key. Compare `expr`, numbers and `var` with the student copy.
- A graph: confirm the drawn curve, window and labels match the prompt, and that nothing visible gives the key away.
- Record the tool's run with `--write` in your round (it adds `checks.solver` with `check: "math"`), plus your own
  `checks.solver` entry for what you worked by hand.

**`agents/blind-math.md`**
- The student view writes math as LaTeX and describes graphs by grid points; flag a graph you couldn't read from its
  description as `ambiguous-wording`.

**`agents/wilco.md`** (a suggestion only, for the owner: never weaken a check) — Wilco's choice-length bots could read
the rendered text (`plainMath` in `scripts/render/math.mjs`) instead of the LaTeX source, so the cue matches what a
student sees.
