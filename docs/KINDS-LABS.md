# Science labs and simulations (owner, Nov 12, 2026)

The owner: "do we have a good lab writer? if not, can we add the ability to write a lab? include the option of creating
simulations." Before this, the only choice was `project` ("Project or lab packet"): steps, a checklist and a rubric, with
no lab structure, a single safety line in the blind tester's brief and no simulations.

The menu item is `lab` ("Science lab with teacher guide", 70 tokens), with the option **Add a built-in simulation**
(+25 tokens). Its request fields are inquiry level, class period (minutes), days, students per group and students in
the class (`feasibility.json` `lab`). Labs are **not automatic** (no `"auto": true`): a person runs the first ones, with
the agent team, until the logs show the safety pass holds.

## What a lab has (the design the owner set)

1. **Pedagogy, not a cookbook.** An anchoring phenomenon or a driving question; objectives and standards; pre-lab
   readiness (background, vocabulary and at least 2 pre-lab questions, safety included); the inquiry level
   (`structured`: question and procedure given; `guided`: question given, students plan part of the procedure, with
   design prompts and a teacher sign-off; `open`: students choose both); analysis beyond fill-in-the-blank: graphing,
   percent error, sources of error, and a **CER** conclusion (claim, evidence, reasoning).
2. **Logistics.** Materials with exact sizes, concentrations and amounts **per group** (or per student, or shared by
   the class); consumables separate from durables; groups and shared stations sized to the class (28–32 students in
   pairs or groups of 3–4, so nobody waits in line for one hotplate); a teacher guide with solution recipes, setup
   time, expected sample data and troubleshooting for common mistakes. The teacher guide works out the class totals
   (60 mL per group × 10 groups = 600 mL).
3. **Simulations, when they earn it.** When the idea is invisible, slow, dangerous or expensive; for low-stakes
   iteration (20 trials in minutes); in a hybrid design (predict with the simulation, then test with equipment); and
   always offline on a Chromebook with no downloads or logins.
4. **Safety.** A bold warning inside the step where the hazard happens, not only at the top; the PPE; SDS references
   and disposal in the teacher guide, and cleanup for students ("pour down the sink with running water" or "the heavy
   metal waste container"); safer substitutions (potato catalase instead of manganese dioxide or liver).
5. **Pacing and differentiation.** Time in phases that fit the bell schedule (briefing, experiment, cleanup and
   debrief) with stopping points for multi-day labs; support (sentence starters, labelled graph axes) and extensions;
   an absentee plan: a dry lab with sample data, or the simulation.

## The pack: `documents[].lab`

A lab is an ordinary document (`item: "lab"`, `kind: "lab"`): its pre-lab and analysis questions are `sections`, so
keys, Wilco, the blind tester and How to grade work as for any other document. Sections with `"part": "prelab"` come
first and print before the bench (safety, materials, procedure, data); the rest print after it. One question in the
analysis has `"cer": true`. The `lab` field (see `samples/_cap-labs/pack.json`, a complete example):

| Field | What |
|---|---|
| `phenomenon`, `drivingQuestion` | The hook, printed in a box at the top |
| `objectives[]`, `standards[]` | "By the end of this lab, you can…" |
| `inquiry` | `structured` \| `guided` \| `open` |
| `period: {minutes, days}`, `timing: [{phase, minutes}]` | The phases must fit `minutes × days` |
| `groups: {size, classSize, stations}` | Per-group materials and the teacher's class totals come from these |
| `background[]`, `vocabulary: [{term, meaning}]` | Pre-lab reading |
| `safety: {ppe[], hazards: [{material, hazard, precaution}], disposal[], rules[]}` | The safety box and cleanup |
| `materials: [{item, amount, unit, per: group\|student\|class, kind: consumable\|durable, hazard?, note?}]` | Exact sizes and concentrations in `item` |
| `design[]` | Guided and open inquiry: prompts students answer before the teacher signs off |
| `procedure: [{text, safety?, stop?}]` | `safety` prints in bold just before the step; `stop` marks a stopping point |
| `dataTable: {title, columns: [{name, unit, digits}], blankRows}` | Empty rows on the student copy, expected data on the teacher's |
| `differentiation: {support[], extension[]}` | "Need a start?" box and "If you finish early" |
| `makeup: {plan, data[][]}` | For absent students: a dry lab with sample data, or the simulation |
| `teacher: {setupMinutes, recipes[], substitutions[], expectedData[][], expectedNote, troubleshooting[], sds[]}` | The teacher guide |
| `simulation` | Below |

## Simulations: `lab.simulation`

One self-contained page, `<lab>-simulation.html`, in the preview (watermarked) and the final: sliders for the inputs,
**Run trial** (1, 3 or 5 at a time) with realistic noise, a data table, a graph of any input against any output,
Delete last, Clear all, **Copy data** (paste into a spreadsheet or a report) and Print. It makes no outside requests
(its own Content-Security-Policy forbids them), works at phone width and needs no account.

```jsonc
"simulation": {
  "title": "Catalase at different temperatures", "intro": "…", "use": "…for the teacher guide…",
  "limits": "What the model leaves out (required: the page says it is a model)",
  "inputs":  [{ "id": "T", "label": "Temperature", "unit": "°C", "min": 0, "max": 70, "step": 1, "value": 20, "digits": 0 }],
  "outputs": [{ "id": "a", "label": "Enzyme activity", "expr": "exp(-((T - 38) / 16)^2)", "hidden": true, "noise": 0, "min": 0, "max": 1 },
              { "id": "t", "label": "Float time", "unit": "s", "expr": "8 / (a * C / 3 + 0.06)", "digits": 1, "min": 0, "max": 140 }],
  "noise": 0.06,                      // relative noise per trial (0 to 0.5); an output's own "noise" wins
  "graph": { "x": "T", "y": "t" }
}
```

- **A model is a formula, never code.** `scripts/render/sims/expr.mjs` parses it into numbers, names, `+ - * / ^`,
  parentheses and a fixed list of functions (`sqrt exp ln log log10 abs sin cos tan floor ceil round min max pow`) and
  the constants `pi`, `e`. The page and `checks/labs.mjs` use the same file, so what is checked is what runs.
- An output may read the inputs and earlier outputs; `hidden: true` keeps an in-between value off the page (a value
  that would give the answer away).
- `checks/labs.mjs` runs every formula over a grid of every input's range (5 points each) and fails a value that isn't
  a number or falls outside the output's stated `min` / `max`.

## The checks

- **`checks/labs.mjs`** (scripted, free, every round; `npm run check` runs its self-test and every sample): structure,
  timing against the period, pre-lab before analysis, a CER question, materials with amounts and kinds, every hazardous
  material with a precaution, PPE, disposal and a safety callout in the steps that use it, the teacher guide, support
  and extension, a makeup plan, design prompts for guided and open inquiry, and the simulation (above).
- **🔎 Fact checker** (`agents/facts.md`, labs): every claim, quantity and concentration; the hazards and PPE for each
  material against its SDS; disposal against local practice ("down the sink" only for what may go there); the safer
  substitution; whether the expected data is plausible; and a simulation's numbers against the real phenomenon.
- **🙈 Blind tester** (`agents/blind-science.md`, labs): solves the pre-lab and analysis questions cold; reads the
  procedure as a student with the clock running (does it fit the period, does every step say how much and how long, is
  every data column produced by a step); and, with a simulation, runs it and checks it can answer the analysis.
- **Rendering** (`scripts/test-interactive.mjs`): the simulation in a browser at 375 and 1280 px.

## What is not built yet

- Data-logging probes (Vernier, PASCO) as a material kind with their own setup notes.
- A simulation with more than one graph at a time, or a model that changes over time (populations, cooling curves as
  an animation). Today a time series is a slider for time.
- Labs as interactive pages (`format: "interactive"`): a lab is printable, plus its simulation.
