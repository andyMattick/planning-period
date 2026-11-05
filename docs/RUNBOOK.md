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

## 1. Receive the order zip

```
mkdir -p "$WORK/in" && cd "$WORK"
unzip -q ~/Downloads/$ORDER.zip -d in    # untrusted: its own empty folder, never run anything inside it
ls -R in                                 # expect order.json, sources/, training/ (the teacher's style examples)
```
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
  send it to the teacher's `replyTo` address.
- **Wait for the answer.** Save it, in their words, as `$WORK/followup-answer.md` (a reply of "go" means: use the
  recommended defaults). If the follow-up asked no questions, write `no questions asked: started` in that file and go on.
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
`node checks/test-wise.mjs pack.json` until both exit 0 (`--items` only shows which bot picks each key: it always exits
0), plus `checks/math.mjs` for math, `checks/puzzles.mjs` for puzzles, `checks/apps.mjs` for apps. (g7-ela: without
them the lead relayed bot output 8 times.) It writes `$WORK/pack.json`. Log its minutes, tokens and cost from the
session's own record.

## 4a. ELA reading items: the no-passage gate (round 1, before any other checker)

Owner's rule, Nov 5, 2026 (g7-ela: three fresh testers answered 20 of 20 without the passages; the bots passed it).
For each version, a **fresh** session with `agents/blind-ela.md` (mode 1) and that version's questions only, no
passages:
```
node $REPO/checks/student-view.mjs "$WORK/pack.json" --no-passages --only "<every where in version A, | between>" --out "$WORK/probe-A.md"
node $REPO/checks/score-blind.mjs "$WORK/pack.json" "$WORK/probe-A.jsonl"     # the same for B
```
**Over about 40% right in either version fails the round** (chance 25% with 4 choices; 5 of 10 fails). A fail goes back
to a fresh maker session for a redesign of the passage and choices (`agents/maker.md`, "Reading items"), then the probe
again on new fresh sessions. Steps 5–7 start only on a draft that passed. The probes run again on changed reading
items in every later round. Log each probe (about $0.20 a version).

## 5. Fresh blind tester for the subject (at the same time as 6 and 7)

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
```
Both must exit 0 (plus `checks/apps.mjs` for apps and `checks/puzzles.mjs` for puzzles). On a fail, `--items` lists
which bot picks each key, for the maker. The lead runs these scripts; no agent session is needed.

## 8. Round 2 on FIX

A **new short session** of the maker gets only the FIX list (from `checks.blind`, `checks.solver`, `checks.facts`, and
Wilco's `--items` lines). Send a checker's suggested fix as a direction, with its facts marked to check. It changes
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
no-passage probe again (step 4a). A new FIX: back to step 8. After round 3, stop and decide with the teacher (next
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
node $REPO/scripts/render-pack.mjs "$WORK" --preview   # writes $WORK/out-preview/ and $WORK/preview.zip: watermarked PDFs, AUDIT-REPORT, REVIEW.html
cd "$WORK/preview" && zip -qr "$WORK/$ORDER-preview.zip" . && cd -
```
(Modes: docs/PACK-FORMAT.md, "Preview, sign-off, final".) Send the preview zip. The teacher
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
Open two files at phone and print size before sending.

## 13. Deliver, then delete uploads and working copies (CLAUDE.md rule 1)

Send `$WORK/$ORDER.zip` (the notices inside say it was made by AI and to check it before students see it). When the
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
| The teacher's style notes and examples | `~/pp-styles/<teacher>/` | for their agents only, deleted on request |
| The teacher's change requests and later comments | `comments/<order>.md` (repo) | yes: the auditor's input |
| The onboarding read-out, the follow-up and the answer | `~/pp-work/<order>/onboarding.json`, `FOLLOW-UP.md`, `followup-answer.md` | deleted after delivery (the record keeps the counts) |
| The teacher's agreement | `~/pp-work/<order>/approval.json`, logged in the pack and the record | the log line |
| Checks, log and audit of the order | `records/<order>.json` (repo) | yes |
| The auditor's reports | `docs/audits/` (repo) | yes |
