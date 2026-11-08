# Runbook: one order by hand (the pilot)

How the owner runs a real order before anything is automated. The team and the order of work: `agents/README.md`.
The rules: `CLAUDE.md` (no farming, the source fence, honest turnaround, tokens, fix choices not keys, made-up
samples, **no release without the teacher's agreement**).

Set these first (every command below uses them):

```
ORDER=pp-2026-11-05-g6-math            # the order id (date, grade, subject)
TEACHER=t-0001                         # the teacher's id (never their name)
REPO=~/pp-team                         # this repository
WORK=~/pp-work/$ORDER                  # the order folder: outside the repo, deleted after delivery
STYLE=~/pp-styles/$TEACHER             # the teacher's style notes: kept for their agents only
```

**Online orders** (docs/BACKEND.md) use `scripts/orders.mjs` with the service key from `~/.pp-owner.env`
(`source ~/.pp-owner.env` first); `TEACHER` is then her account id (the order's `teacher`). **Zip orders** (local
mode, or a teacher who didn't sign in) use the email steps marked "zip:". Everything else is the same.

## The fast path: `scripts/run-order.mjs` (owner, Nov 8, 2026)

"If this is going to be feasible, we have got to make this shorter." The first real online order took 31 minutes from
her answer to the preview, 13 of them gaps between steps (docs/audits/TIME-2026-11-08.md). The coordinator runs the
steps below for one online order with no gaps, and the automatic runner (docs/BACKEND.md) starts it when she sends and
when she answers. By hand:
```
source ~/.pp-owner.env
node $REPO/scripts/run-order.mjs $ORDER                 # auto: onboarding for sent, the build for building
node $REPO/scripts/run-order.mjs $ORDER --dry-run --keep --no-post   # canned sessions, nothing spent (a rehearsal)
```

| Stage | Runbook steps | What runs, in order (⫽ = at the same time) | Target |
|---|---|---|---|
| onboard (`sent`) | 1, 2, 3 | pull, text copies; 🧭 onboarding ⫽ 🎨 style notes (first order); script checks on the follow-up (≤ 3 questions with options, ≤ 400 words, a token total); post it | 2–3 min |
| build (`building`) | 1, 4, 4b | pull; 📝 maker (version A only when the numbers change: `agents/maker.md` v11); `versions.mjs --write` | 5 min |
| | 5, 6, 7 | 🤖 Wilco scripts first (seconds), then 🙈 blind tester (A) ⫽ 🧮 solver (A) ⫽ 🧮 solver (B, C…) or 🔎 fact checker; entries merged by the script | 2 min |
| | 8, 9 | a new 📝 maker session on the FIX list (whole-version wording, step 8) → `versions.mjs` → a recheck of **only the changed rows**: a fresh blind tester (A rows of script-made items, every version of hand-written ones) ⫽ a fresh solver or fact checker (every version of the changed rows, plus a sweep of every `why`) ⫽ Wilco | 3.5 min a round |
| | 9, 10 | **one scripted whole-version check of every version** (`versions.mjs --verify`, keys, test-wise, cross-item, `math.mjs`, `interactive-format.mjs --browser`) ⫽ 🧾 reporter (faster setting; the script writes the log rows from each session's record, the reporter writes the story) | 1 min |
| | 11 | render the watermarked preview, browser check, `orders.mjs preview` | 1.5 min |

**What keeps the quality the same:**
- Every check is still a fresh session that never saw the pack being made; a recheck is a new session, not the round 1
  one; the blind tester and solver answer in a folder with the student view and no `pack.json`, and get the key only in
  their second phase (the same session, resumed). The maker never writes `checks`, `log` or `audit`.
- Parallel changes who waits, not who checks: each checker writes its own entry file; only the script merges.
- A recheck covers every row the FIX round changed (found by comparing every version's rows before and after, so a
  change the FIX list didn't ask for is rechecked too), and the final scripted check covers every row of every version.
- Judgment roles (onboarding, style notes, maker, blind tester, solver, fact checker, probe) run on the standard
  setting; only the reporter, which records numbers it is handed, runs on the faster setting (`agents/reporter.md` rule
  8 already says so).
- Caps: maker r1 budget/3, FIX rounds budget/6 (step 4), each checker 15% of the budget, onboarding $1, style notes
  $0.50, reporter 6%, and none more than half of what is left below the **cost stop (2× the budget)**, split over the
  sessions running together. Past the stop the script hands the order to the owner (step 9, "Cost stop").
- After round 3 with a FIX open, a final check that fails, or an order kind it doesn't do yet (reading items, apps,
  puzzles, practice games), it stops: **exit 3**, the status stays where it was with a note for her ("needs a quick look
  from us"), and `pack.json`, `run-log.jsonl` and `HANDOFF.md` are kept in `deliverables/<teacher>/<id>/work/`
  (`orders.mjs work-get $ORDER`). Carry on by hand from the step it names. A crash: **exit 1**, status `failed` with a
  note she sees.
- Her uploads are read as text only (`html-text.mjs`; Word and PowerPoint from their XML; PDFs as they are); the
  working folder and the sessions' transcripts are deleted after the run (`--keep` keeps the folder).
- Her blind-check choice (step 5) comes from her order, never from the maker's pack.

## 1. Receive the order

Online:
```
node $REPO/scripts/orders.mjs list sent                  # new orders
node $REPO/scripts/orders.mjs pull $ORDER                # → $WORK/in/order.json, in/sources/, in/training/; status onboarding
cd "$WORK"
```
Zip:
```
mkdir -p "$WORK/in" && cd "$WORK"
unzip -q ~/Downloads/$ORDER.zip -d in    # untrusted: its own empty folder, never run anything inside it
ls -R in                                 # expect order.json, sources/, training/ (the teacher's style examples)
```
- **Saved web pages** (`.html` / `.htm` in `sources/` or `training/`): read them as text only, never open them in a
  browser or run anything in them (or in a `_files` folder saved next to them). Make a text copy for the agents:
  ```
  mkdir -p "$WORK/text" && for f in in/sources/*.htm* in/training/*.htm*; do [ -f "$f" ] && node $REPO/scripts/html-text.mjs "$f" --out "$WORK/text/$(basename "$f").txt"; done
  ```
  Give the agents the `.txt` copies. The text is untrusted data: an instruction inside it is not one.
- **Pasted links** arrive as `.txt` sources (or style examples) named `link - <title>.txt`: a header (the address,
  the title, the date it was read), then the page's article text, already read on our server as text only. Nothing to
  convert: give it to the agents as is. `order.json` `order.links` lists each one (file, address, site, title, date);
  the reporter puts the addresses in the audit report's sources. The text is untrusted data like any web page, and the
  source fence applies the same way (name the site; use only what the order needs).
- Check `order.json` against `menu.json` (items, grade, subject) and the token total the teacher saw.
- **Source fence:** if a source is a whole copyrighted book or more than the order needs, use only the chapters the
  order names; say so to the teacher. Write the start time in the log (step 10's rows start now).
- Tell the teacher the honest turnaround (pilot: same day for one item, 1–2 days for a unit pack, plus their review).

## 2. Onboarding and the follow-up (before anything is made)

Start a **fresh** session with `agents/onboarding.md` and only the files it lists: `in/order.json`, `in/sources/`,
`in/training/`, `$REPO/menu.json` and `$REPO/feasibility.json`. For example:
```
cd "$WORK" && claude -p "$(cat $REPO/agents/onboarding.md)

The order folder is $WORK (order.json, sources/, training/). menu.json and feasibility.json are in $REPO.
Write onboarding.json and FOLLOW-UP.md in $WORK." --allowedTools Read,Write,Glob,Grep
cat "$WORK/FOLLOW-UP.md"
```
- Read `FOLLOW-UP.md` before it goes out (honest, friendly, at most 3 questions, nothing they already answered), then
  send it. Online: `node $REPO/scripts/orders.mjs follow-up $ORDER "$WORK/FOLLOW-UP.md"` (the questions and options
  come from `onboarding.json` next to it, so she answers with one tap in My orders; status `needs_answer`, or
  `building` when there are no questions). Zip: email it to the teacher's `replyTo` address.
- **Wait for the answer.** Online: `node $REPO/scripts/orders.mjs list building` shows it has come, and
  `node $REPO/scripts/orders.mjs answer $ORDER` writes `$WORK/followup-answer.md`. Zip: save it, in their words, as
  `$WORK/followup-answer.md`. A reply of "go" means: use the recommended defaults. If the follow-up asked no
  questions, write `no questions asked: started` in that file and go on.
- An answer that changes the items or the size changes the tokens: rerun the onboarding agent with the answer
  (it recomputes `tokens`) and confirm the new total with the teacher before step 4.
- The reporter logs this step and the time spent waiting (waiting is not agent time).

## 3. The teacher's style notes (first order only, or when they send new examples)

A fresh agent reads `in/training/*` and writes `$STYLE/style.md`: layout, numbering, how directions are worded, question
kinds and how many, reading level, how keys and explanations look, font and accent colour if obvious. Short bullet
lines, no copied passages. Then:
```
mkdir -p "$STYLE" && cp in/training/* "$STYLE/" 2>/dev/null; ls "$STYLE"
```
The examples stay only for this teacher's agents; `rm -rf "$STYLE"` when they ask (and tell them it's done).

## 4. Maker

Start a fresh agent with `agents/maker.md`, `$WORK/onboarding.json` and `$WORK/followup-answer.md` (read first),
`$STYLE/style.md`, `in/order.json`, `in/sources/` and `docs/PACK-FORMAT.md`, in a folder that holds **a copy of
`$REPO/checks/`** (and `scripts/` for puzzles), so it runs the checks itself: `node checks/keys.mjs pack.json` and
`node checks/test-wise.mjs pack.json` until both exit 0 (and `node checks/cross-item.mjs pack.json`: every pack) (`--items` only shows which bot picks each key: it always exits
0), plus `checks/math.mjs` for math, `checks/puzzles.mjs` for puzzles, `checks/apps.mjs` for apps. (g7-ela: without
them the lead relayed bot output 8 times.) It writes `$WORK/pack.json`. Log its minutes, tokens and cost from the
session's own record.

**Interactive items** (`itemSpecs.<item>.format: "interactive"`; docs/KINDS-INTERACTIVE-FORMAT.md): the maker sets
the document's `format` and `grading` (`agents/maker.md`, "The interactive format") and also runs
`node checks/interactive-format.mjs pack.json`. Everything else in steps 4–10 is the same: the blind tester solves
`student-view.mjs`, not the page.

**Dollar cap on every maker session** (owner, option 1, Nov 6, 2026): the order's budget is tokens × $0.10; a first
draft gets **one third** of it, a redesign **one quarter**, a FIX round (step 8) **one sixth**, and never more than half
of what is left below the cost stop (2× the budget). A reading quiz with a rubric (165 tokens, $16.50): **$5.50,
$4.10, $2.75**. With `claude -p`, pass `--max-budget-usd <cap>`; give the runner at least 60 minutes (g7-ela2: a
10-minute runner limit lost $0.43 of work). Why: g7-ela2's uncapped makers cost $7.32 and $12.21 against a $16.50 order
(84% of its $26.21); its capped FIX round used $2.42 of $5.50. Every other sample's maker sessions fit these caps
(g4-math $1.38 of $2.33, g8-science $2.02 of $3.83, g11-history $3.01 of $3.17, g7-ela $3.06 at the reading price). A
session that hits its cap leaves its last saved `pack.json` (the maker saves as it goes): send that draft to the checks;
if it is incomplete, one fresh session at the FIX cap finishes it, then tell the owner.

## 4a. ELA reading items: the no-passage gate (required, every round, and before the preview)

Owner's rule, Nov 5, 2026, and option 1, Nov 6 (g7-ela: 20 of 20 answered without the passages; g7-ela2, remade:
A 10, 8 and 9 of 10 over three rounds; the bots passed both). First `node $REPO/checks/no-passage.mjs "$WORK/pack.json"
--write` and `node $REPO/checks/cross-item.mjs "$WORK/pack.json" --write` (the maker already ran them; a fail goes
straight back, **before any paid probe**: owner, Nov 7, 2026, docs/audits/AUDIT-2026-11-07-ela-try-c.md proposal 2). Then, for each version, a **fresh** session with
`agents/blind-ela.md` (mode 1): never the maker, never a session that has seen the passages, the other version, the key
or an earlier draft. It gets that version's questions only:
```
node $REPO/checks/student-view.mjs "$WORK/pack.json" --no-passages --only "<every where in version A, | between>" --out "$WORK/probe-A.md"
node $REPO/checks/score-blind.mjs "$WORK/pack.json" "$WORK/probe-A.jsonl"     # the lead scores it; the same for B
```
**A version fails** when a short answer earns more than half its credit without the passage (the lead scores short
answers against `accept` and `why`) or, when the teacher picked the in-testing multiple choice (owner, Nov 7, 2026: a
reading quiz is citing short answers and a RACE by default), its multiple choice is right **more than chance + 15
points** (4 choices: more than 40%; 10 mc: 5 fails, 8 mc: 4 fails). The lead's probe entry names every item the probe
got right with its cue tag, at any confidence (`agents/blind-ela.md`; docs/audits/AUDIT-2026-11-07-ela-try-d.md proposal 1). Why that line, and why it is never raised: `agents/blind-ela.md`, mode 1. A fail goes
back to the maker (a redesign in round 1, a FIX round after) to fix the questions, never the key; then the probe again
on new fresh sessions. **A reused passage whose probe tags a `type` cue:** the FIX list asks for a new turn for the
story, not only new items (`agents/maker.md` reading rule 1; try d proposal 2, adopted Nov 7, 2026). Steps 6–7 start
only on a draft that passed, with two exceptions. **The keyless blind solve (step 5) runs after round 1 whether or not
the gate passed**, so its findings (two right answers, guessable keys, wrong levels) join round 2's FIX list instead of
arriving in round 3 with no round left (try d proposal 3, adopted Nov 7, 2026; the same cost, earlier). And **a nonfiction passage the maker
means to keep gets the fact checker in round 1, alongside the gate** (g7-ela2: three failed gates left the article's
claims unchecked). The probes run again on changed reading items every round, and **twice on every whole
version just before the preview** (step 11): two fresh sessions per version, and the version fails if either run fails;
never average a fail away (try d proposal 4, adopted Nov 7, 2026: at 8 items chance alone reaches the line 11–26% of
the time). A version that fails is not previewed without telling the owner. Log each probe
(about $0.27 a version; the lead's scoring is not a session).

## 4b. Number versions made by script (owner, Nov 8, 2026)

For "same questions, different numbers" (docs/KINDS-MATH.md §4; `agents/maker.md`, "Same questions, different
numbers"), the maker writes version A with a `gen` spec and runs `scripts/versions.mjs` itself. The lead (or
`scripts/run-order.mjs`) runs it again as the record, before any checker:
```
node $REPO/scripts/versions.mjs "$WORK/pack.json" --write          # B, C… from A; refuses bad numbers; SymPy on every key
```
Then the checks split by version:
- **Version A gets the full checks:** the blind tester (step 5) on A's student view
  (`student-view.mjs --only "<every where in A, | between>"`), and the solver (step 6) on A.
- **B, C… get the script and a solver:** `versions.mjs` (constraints, distractors, SymPy on every key it made) plus a
  **fresh solver session that works every number in B, C… from their student view** before it reads the key (the
  independent check that a formula and its key agree with the problem a student reads). Their wording is A's word for
  word except the numbers, so a second blind read adds nothing the A read and the solver don't catch. Items without
  `gen` (written by hand per version) get the blind tester in every version, as before.
- **Wilco on every version** (step 7), as always.
- After a FIX round, `versions.mjs` remakes B, C… from the fixed A; the recheck covers the changed items in A and the
  solver rechecks the changed items in every version. Before the preview, `versions.mjs --verify` proves B, C… still
  come from A's formulas.

## 5. Fresh blind tester for the subject (at the same time as 6 and 7)

**Skipped when the teacher asked** (owner, Nov 8, 2026: `order.checks.blind` is `false`, the order page's "Blind
check by a fresh agent (recommended)" unticked). Then no blind tester runs in any round, and the log says so: a row
"Blind check skipped at the teacher's request" (`scripts/run-order.mjs` writes it). Everything else still runs, each as a
fresh agent or a script: the solver or fact checker (steps 6, 9), Wilco, keys, cross-item and the interactive checks
(step 7), `versions.mjs`, and **the ELA no-passage probe for reading items** (step 4a: a gate on the questions, not the
blind check). The audit report's first page, REVIEW.html, My orders' review and every teacher copy say "Blind check
skipped at your request — please work through the test yourself before students see it." (`scripts/render/util.mjs`
`BLIND_SKIPPED_LINE`). This is the teacher's own opt-out, never the lead's: the lead never skips a check to save time.

```
node $REPO/checks/student-view.mjs "$WORK/pack.json" --out "$WORK/view.md"
```
Start a **fresh** agent (never the maker) with `agents/blind-<subject>.md` (`menu.json` maps the subject to its
checker), `view.md` and the sources. ELA reading items: two phases, `view.md` alone first, then the passages as a
separate file: `student-view.mjs --no-passages` for phase a, then the full view, which prints the pack's `passages`
(docs/PACK-FORMAT.md, "Passages"; older packs without the field need a `passages.md`). Keep `pack.json` out of its folder until
it has answered (copy it in for scoring: g4-math and g8-science ran it this way). It answers into
`$WORK/blind-r1.jsonl`, then:
```
node $REPO/checks/score-blind.mjs "$WORK/pack.json" "$WORK/blind-r1.jsonl"
```
and writes its `checks.blind` round 1 entry (FIX / KEEP / JUDGMENT, difficulty by level; ELA: `passageFree` from its
no-passage phase) to `$WORK/checks-blind-r1.json`. The lead merges it into `pack.json` (checkers run at the same time,
so none of them writes the pack).

## 6. Solver (math) or fact checker (science, social studies; ELA nonfiction)

A fresh agent with `agents/solver-math.md` or `agents/facts.md`. It solves or checks from `view.md` and the sources
before reading the key, and writes its entry file (`checks-solver-r1.json` or `checks-facts-r1.json`) for the lead to
merge. The solver starts with `node $REPO/checks/math.mjs "$WORK/pack.json"` (and records it with `--write`). Give the
fact checker web search, and check the session's allowed tools actually took (g11-history: a quoting slip denied them).

## 7. Wilco

```
node $REPO/checks/keys.mjs "$WORK/pack.json" --write
node $REPO/checks/test-wise.mjs "$WORK/pack.json" --write          # add --pass 70 if the teacher gave a pass mark
node $REPO/checks/no-passage.mjs "$WORK/pack.json" --write         # reading items
node $REPO/checks/cross-item.mjs "$WORK/pack.json" --write         # every pack: no key printed in another item
```
Both must exit 0 (plus `checks/apps.mjs` for apps, `checks/puzzles.mjs` for puzzles and, for interactive documents,
`node $REPO/checks/interactive-format.mjs "$WORK/pack.json" --browser`: the pages are self-contained, a print page holds
no answer data, an auto page no plain-text key, every hash verifies, all right → 100% and all wrong → 0%). On a fail, `--items` lists
which bot picks each key, for the maker. The lead runs these scripts; no agent session is needed.

## 8. Round 2 on FIX

A **new short session** of the maker gets only the FIX list, **written for the whole version**: each finding names
the item and the cue, and the list ends with "re-check every other item in this version for the words, ideas and quotes
you change, and rerun every check" (owner, Nov 7, 2026, docs/audits/AUDIT-2026-11-07-ela-try-c.md proposal 4: try c's item-by-item fixes moved
clues to other items, A 8 → 9 of 10). The findings come from `checks.blind`, `checks.solver`, `checks.facts`, and
Wilco's `--items` and cross-item lines. Send a checker's suggested fix as a direction, with its facts marked to check. It changes
wrong choices, never a right key to pass a check (a key that is wrong is corrected and logged), keeps ids, and reruns
the checks in its folder. JUDGMENT items go to the teacher in the preview, not to the maker.

## 9. Fresh recheck

A **different fresh** blind tester (not round 1's, not the maker) on the changed items only:
```
node $REPO/checks/student-view.mjs "$WORK/pack.json" --only "<where>|<where>" --out "$WORK/view-r2.md"   # "|" between items (titles can hold commas); a where that matches nothing is an error
node $REPO/checks/score-blind.mjs "$WORK/pack.json" "$WORK/blind-r2.jsonl"
node $REPO/checks/keys.mjs "$WORK/pack.json" --write && node $REPO/checks/test-wise.mjs "$WORK/pack.json" --write
```
It records round 2 and sets `fixed` on each earlier finding it confirms (no separate "confirmed" list); a problem
found again is a new finding with `sameAs` naming the earlier one, so it is counted once. In the same round, a **fresh
fact checker** (science, social studies, ELA nonfiction) or **solver** (math) checks the changed text, **every
suggested wording** the maker used, and sweeps the whole pack for any claim it marks false; ELA reading items get the
no-passage probe again (step 4a). A new FIX: back to step 8. **The last round's fact FIXes get a fresh fact recheck
before the preview** (or before a sample is shown), even when no round is left for anything else (try d proposal 6,
adopted Nov 7, 2026: 3 fact FIXes from round 3 were never rechecked). After round 3, stop and decide with the teacher (next
section).

**Cost stop.** After every round the lead adds up the log. When the order passes **2× its token budget** (tokens ×
$0.10), tell the owner before any more rounds, with what is open and what another round would cost (g7-ela reached
4×: $22.48 against $5.50). The owner decides; the teacher is never charged more without asking.

## When round 3 ends with an open FIX

Round 3 is the limit, so a FIX can still be open when it ends (the g11-history sample: a key that a round 2 checker's
suggested wording had made false, and a review sheet twice the length the teacher asked for).

- **The order lead never sends a preview with a known FIX without telling the owner** (later, when orders are live: the
  teacher). Say what the open FIX is, where, and what it would take to fix it.
- **The owner (later: the teacher) decides** one of two things:
  1. **An extra round:** rounds 4 and 5 at most, with the same separation of roles as rounds 1–3. A **fresh** maker
     session gets only the open FIX list (step 8); a **fresh** blind tester rechecks the changed items (step 9); a
     **fresh** fact checker (or solver) checks every claim in the changed text, **including any wording a checker
     suggested**: a checker's suggested wording is new content and gets checked like the maker's (the q21 lesson: a
     recheck suggested "Hayes pulling the last federal troops out of the South", the maker used it word for word, and it
     was a myth). Wilco runs again (step 7). A new FIX in round 4 gets one more maker round and recheck (round 5); then
     stop, even if a FIX is still open, and send the preview as in 2.
  2. **Send the preview as it is**, with every open FIX **listed first** in the audit report (`audit.notes`' first line:
     "Open for the teacher: …", what is wrong and what would fix it) and in the message that goes with the preview.
- **The extra rounds are logged and priced like the others:** every session's own minutes, tokens and dollars in `log`
  with its `round` (4 or 5), the lead's steps as "not measured", `fixed` set on each finding the round 4–5 rechecks
  confirm, and the totals give the extra rounds on their own as well as in the order's total.
- **The auditor reviews why the limit was hit** (step 14): which finding kept coming back, which brief let it through,
  and whether a check or a brief should change so the next order finishes in three rounds.


## 10. Reporter

A cheaper-tier agent with `agents/reporter.md`, given a short hand-off (one line per session from its own record:
minutes, tokens, dollars; and `pack.json` without `documents`), fills `log` (every row above, including your own steps, marked "not
measured") and `audit.notes`: every round, every catch, every fix, Wilco before and after, time and cost.

## 11. Preview, then the teacher agrees or asks for changes (CLAUDE.md rule 7)

```
# reading items first: two final whole-version no-passage probes per version (step 4a) and the fact recheck of the last round's fixes (step 9)
node $REPO/scripts/render-pack.mjs "$WORK" --preview   # writes $WORK/out-preview/ and $WORK/preview.zip: watermarked PDFs and interactive pages, AUDIT-REPORT, REVIEW.html
node $REPO/checks/interactive-format.mjs "$WORK/pack.json"   # interactive documents: the rendered pages are up to date and pass
cd "$WORK/preview" && zip -qr "$WORK/$ORDER-preview.zip" . && cd -
```
(Modes: docs/PACK-FORMAT.md, "Preview, sign-off, final".) **`pack.json`'s `id` must be the order id** (the
approval is checked against it).

Online: `node $REPO/scripts/orders.mjs preview $ORDER` uploads `out-preview/` and `preview.zip` (status
`preview_ready`). She opens the PDFs in My orders and approves or asks for changes there; `orders.mjs list approved`
and `list changes_requested` show which. Then `node $REPO/scripts/orders.mjs approval $ORDER` writes
`$WORK/approval.json` (she agreed) or `$WORK/comments-$ORDER.json` (she asked for changes): carry on below with that
file already in place (skip the `cp`).

Zip: send the preview zip. The teacher
opens `REVIEW.html` offline, looks everything over and saves one of two files:

- **`comments-<id>.json` (changes requested).** Copy their comments, in their words, to the repository:
  ```
  cp ~/Downloads/comments-$ORDER.json "$WORK/" && mkdir -p $REPO/comments
  node -e 'console.log(JSON.stringify(require(process.argv[1]),null,2))' "$WORK/comments-$ORDER.json"   # read them
  ```
  then write `$REPO/comments/$ORDER.md`: one line per request (where, what they asked, date), **no student names and no
  more than a few words of their material**. Run a maker round on the requests (step 8), a fresh recheck (step 9),
  Wilco, the reporter (log the preview round and each request), and a **new preview** (this step again).
- **`approval-<id>.json` (they agree: they looked it over and nothing needs a change).** Save it in the order folder:
  ```
  cp ~/Downloads/approval-$ORDER.json "$WORK/approval.json"
  ```
  The reporter logs the approval (date, the pack version it approved).

Nothing goes out as final without `approval.json`; the renderer's final mode refuses to run without a matching one.

## 12. Render the final pack

```
node $REPO/scripts/render-pack.mjs "$WORK" --final     # writes $WORK/out/ and $WORK/out.zip; refuses without a matching $WORK/approval.json
ls "$WORK/out"                                                    # student/teacher copies, A/B, AUDIT-REPORT.pdf, project.json, README.txt
cd "$WORK/out" && zip -qr "$WORK/$ORDER.zip" . && cd -
```
Open two files at phone and print size before sending (an interactive page: answer it on a phone, press Finish).
The final has `HOW-TO-SHARE-THE-INTERACTIVE-PAGES.txt` when the pack has interactive pages.
Online: `node $REPO/scripts/orders.mjs final $ORDER` uploads `out/` and `out.zip` (status `final_ready`); she downloads
them in My orders.

## 13. Deliver, then delete uploads and working copies (CLAUDE.md rule 1)

Online: step 12's `final` delivered it. When she has downloaded it (or after 7 days):
`node $REPO/scripts/orders.mjs purge $ORDER` deletes her uploads and the preview files from storage (the final files
stay for her; add `--finals` to delete them too), then run the record and `rm -rf "$WORK"` lines below.
`node $REPO/scripts/orders.mjs purge --due` does it for every order that is due (run it daily). A failed order:
`node $REPO/scripts/orders.mjs status $ORDER failed "<what she should know>"`.

Zip: send `$WORK/$ORDER.zip` (the notices inside say it was made by AI and to check it before students see it). When the
teacher confirms they have it:
```
mkdir -p $REPO/records && cd ~ && node -e 'const p=require(process.argv[1]);const {documents,style,...r}=p;r.order={grade:p.order?.grade,subject:p.order?.subject,topic:p.order?.topic,items:p.order?.items};try{const o=require(process.argv[3]);r.onboarding={source:(o.source||[]).map(x=>({kind:x.kind,pages:x.pages,ideas:x.ideas})),made:o.whatWeWillMake,warnings:(o.warnings||[]).map(w=>w.kind),questions:(o.questions||[]).length,tokens:o.tokens}}catch{};require("fs").writeFileSync(process.argv[2],JSON.stringify(r,null,2)+"\n")' "$WORK/pack.json" "$REPO/records/$ORDER.json" "$WORK/onboarding.json"
rm -rf "$WORK"                                    # uploads, pack.json, views, blind answers, previews, final files, zips
rm -f ~/Downloads/$ORDER*.zip ~/Downloads/*-$ORDER.json
ls ~/pp-work; ls ~/Downloads | grep "$ORDER" || echo "deleted"
```
The record keeps only the checks, the log, the audit and the onboarding counts (no questions, no style notes, no sources, no requests text): it is what the
auditor and the pricing need. Cloud sessions used for the order: archive them. The style notes stay in `$STYLE` for
this teacher only.

## 14. Auditor

A fresh agent with `agents/auditor.md`, `records/$ORDER.json`, `comments/$ORDER.md` (if any) and `agents/`. It edits
briefs (version bump and a change-log line naming the finding or comment), records the changes in the record's
`audit.briefChanges`, lists cheaper-without-losing-quality ideas, writes its report (`docs/audits/AUDIT-<date>.md`, a
line in `docs/audits/README.md`), and commits:
```
cd $REPO && npm run check && git add agents/ records/$ORDER.json comments/ docs/audits/ && git commit -m "Audit $ORDER: <what changed in which brief>"
```
If the teacher writes more comments after delivery, add them to `comments/$ORDER.md` and run the auditor again.

## Where things live

| What | Where | Kept? |
|---|---|---|
| Order zip, sources, pack.json, views, previews, final files | `~/pp-work/<order>/` | deleted after delivery |
| Online: her uploads, the preview files | Supabase `uploads/<teacher>/<order>/`, `deliverables/<teacher>/<order>/preview/` | deleted by `orders.mjs purge` after delivery |
| Online: the final files | Supabase `deliverables/<teacher>/<order>/final/` | for her to download; `purge --finals` deletes them |
| The teacher's style notes and examples | `~/pp-styles/<teacher>/` | for their agents only, deleted on request |
| The teacher's change requests and later comments | `comments/<order>.md` (repo) | yes: the auditor's input |
| The onboarding read-out, the follow-up and the answer | `~/pp-work/<order>/onboarding.json`, `FOLLOW-UP.md`, `followup-answer.md` | deleted after delivery (the record keeps the counts) |
| The teacher's agreement | `~/pp-work/<order>/approval.json`, logged in the pack and the record | the log line |
| Checks, log and audit of the order | `records/<order>.json` (repo) | yes |
| The auditor's reports | `docs/audits/` (repo) | yes |
