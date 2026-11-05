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
ls -R in                                 # expect order.json, sources/, style/ (training documents, first order only)
```
- Check `order.json` against `menu.json` (items, grade, subject) and the token total the teacher saw.
- **Source fence:** if a source is a whole copyrighted book or more than the order needs, use only the chapters the
  order names; say so to the teacher. Write the start time in the log (step 10's rows start now).
- Tell the teacher the honest turnaround (pilot: same day for one item, 1–2 days for a unit pack, plus their review).

## 2. The teacher's style notes (first order only, or when they send new examples)

A fresh agent reads `in/style/*` and writes `$STYLE/style.md`: layout, numbering, how directions are worded, question
kinds and how many, reading level, how keys and explanations look, font and accent colour if obvious. Short bullet
lines, no copied passages. Then:
```
mkdir -p "$STYLE" && cp in/style/* "$STYLE/" 2>/dev/null; ls "$STYLE"
```
The examples stay only for this teacher's agents; `rm -rf "$STYLE"` when they ask (and tell them it's done).

## 3. Maker

Start a fresh agent with `agents/maker.md`, `$STYLE/style.md`, `in/order.json`, `in/sources/` and
`docs/PACK-FORMAT.md`. It writes `$WORK/pack.json` and runs `node $REPO/checks/keys.mjs` and
`node $REPO/checks/test-wise.mjs --items` until both exit 0. Log its minutes, tokens and cost.

## 4. Fresh blind tester for the subject (at the same time as 5 and 6)

```
node $REPO/checks/student-view.mjs "$WORK/pack.json" --out "$WORK/view.md"
```
Start a **fresh** agent (never the maker) with `agents/blind-<subject>.md` (`menu.json` maps the subject to its
checker), `view.md` and the sources. It answers into `$WORK/blind-r1.jsonl`, then:
```
node $REPO/checks/score-blind.mjs "$WORK/pack.json" "$WORK/blind-r1.jsonl"
```
and records `checks.blind` round 1 (FIX / KEEP / JUDGMENT, difficulty by level).

## 5. Solver (math) or fact checker (science, social studies; ELA nonfiction)

A fresh agent with `agents/solver-math.md` or `agents/facts.md`. It solves or checks from `view.md` and the sources
before reading the key, and records `checks.solver` or `checks.facts`.

## 6. Wilco

```
node $REPO/checks/keys.mjs "$WORK/pack.json" --write
node $REPO/checks/test-wise.mjs "$WORK/pack.json" --write          # add --pass 70 if the teacher gave a pass mark
```
Both must exit 0. On a fail, `--items` lists which bot picks each key, for the maker.

## 7. Round 2 on FIX

A **new short session** of the maker gets only the FIX list (from `checks.blind`, `checks.solver`, `checks.facts`, and
Wilco's `--items` lines). It changes wrong choices, never a right key, keeps ids, and reruns both checks. JUDGMENT
items go to the teacher in the preview, not to the maker.

## 8. Fresh recheck

A **different fresh** blind tester (not round 1's, not the maker) on the changed items only:
```
node $REPO/checks/student-view.mjs "$WORK/pack.json" --only "<where>,<where>" --out "$WORK/view-r2.md"
node $REPO/checks/score-blind.mjs "$WORK/pack.json" "$WORK/blind-r2.jsonl"
node $REPO/checks/keys.mjs "$WORK/pack.json" --write && node $REPO/checks/test-wise.mjs "$WORK/pack.json" --write
```
It records round 2 and sets `fixed` on each finding it confirms. A new FIX: back to step 7. After round 3, stop and
decide with the teacher.

## 9. Reporter

A cheaper-tier agent with `agents/reporter.md` fills `log` (every row above, including your own steps, marked "not
measured") and `audit.notes`: every round, every catch, every fix, Wilco before and after, time and cost.

## 10. Preview, then the teacher agrees or asks for changes (CLAUDE.md rule 7)

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
  more than a few words of their material**. Run a maker round on the requests (step 7), a fresh recheck (step 8),
  Wilco, the reporter (log the preview round and each request), and a **new preview** (this step again).
- **`approval-<id>.json` (they agree: they looked it over and nothing needs a change).** Save it in the order folder:
  ```
  cp ~/Downloads/approval-$ORDER.json "$WORK/approval.json"
  ```
  The reporter logs the approval (date, the pack version it approved).

Nothing goes out as final without `approval.json`; the renderer's final mode refuses to run without a matching one.

## 11. Render the final pack

```
node $REPO/scripts/render-pack.mjs "$WORK" --final     # writes $WORK/out/ and $WORK/out.zip; refuses without a matching $WORK/approval.json
ls "$WORK/out"                                                    # student/teacher copies, A/B, AUDIT-REPORT.pdf, project.json, README.txt
cd "$WORK/out" && zip -qr "$WORK/$ORDER.zip" . && cd -
```
Open two files at phone and print size before sending.

## 12. Deliver, then delete uploads and working copies (CLAUDE.md rule 1)

Send `$WORK/$ORDER.zip` (the notices inside say it was made by AI and to check it before students see it). When the
teacher confirms they have it:
```
mkdir -p $REPO/records && cd ~ && node -e 'const p=require(process.argv[1]);const {documents,style,...r}=p;r.order={grade:p.order?.grade,subject:p.order?.subject,topic:p.order?.topic,items:p.order?.items};require("fs").writeFileSync(process.argv[2],JSON.stringify(r,null,2)+"\n")' "$WORK/pack.json" "$REPO/records/$ORDER.json"
rm -rf "$WORK"                                    # uploads, pack.json, views, blind answers, previews, final files, zips
rm -f ~/Downloads/$ORDER*.zip ~/Downloads/*-$ORDER.json
ls ~/pp-work; ls ~/Downloads | grep "$ORDER" || echo "deleted"
```
The record keeps only the checks, the log and the audit (no questions, no style notes, no sources, no requests text): it is what the
auditor and the pricing need. Cloud sessions used for the order: archive them. The style notes stay in `$STYLE` for
this teacher only.

## 13. Auditor

A fresh agent with `agents/auditor.md`, `records/$ORDER.json`, `comments/$ORDER.md` (if any) and `agents/`. It edits
briefs (version bump and a change-log line naming the finding or comment), records the changes in the record's
`audit.briefChanges`, lists cheaper-without-losing-quality ideas, and commits:
```
cd $REPO && npm run check && git add agents/ records/$ORDER.json comments/ && git commit -m "Audit $ORDER: <what changed in which brief>"
```
If the teacher writes more comments after delivery, add them to `comments/$ORDER.md` and run the auditor again.

## Where things live

| What | Where | Kept? |
|---|---|---|
| Order zip, sources, pack.json, views, previews, final files | `~/pp-work/<order>/` | deleted after delivery |
| The teacher's style notes and examples | `~/pp-styles/<teacher>/` | for their agents only, deleted on request |
| The teacher's change requests and later comments | `comments/<order>.md` (repo) | yes: the auditor's input |
| The teacher's agreement | `~/pp-work/<order>/approval.json`, logged in the pack and the record | the log line |
| Checks, log and audit of the order | `records/<order>.json` (repo) | yes |
