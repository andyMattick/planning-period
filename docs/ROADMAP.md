# Roadmap

Ideas the owner asked for, in his words, with what's planned. Newest first.

## Printable or interactive, graded in the page or printed (owner, Nov 8, 2026)
- **Owner:** "When I select something I want to make, I want to have the option of creating an interactive [page] OR
  pdf/word etc. If interactive, I want the option to grade it automatically when I'm done OR print out the results for
  someone else to grade later."
- **Done (branch `interactive-format`):** a Format and a Grading choice on the order page for every item with
  questions (`menu.json` `interactive: true`; same tokens), stored in `itemSpecs`; pack fields `format` and `grading`;
  the renderer makes one self-contained offline page per version (grading "auto": salted hashes, the score and
  explanations at Finish, written answers to the teacher; "print": no answer data, an answer sheet to print or save as
  a PDF) plus the teacher copy; the preview watermarks the pages and the approval hashes them; My orders shows them in a
  sandboxed frame; `checks/interactive-format.mjs` in `npm run check`, the browser run in `npm run test:interactive`
  and `test:orders`; fixtures `samples/_cap-interactive`; onboarding v10, maker v9, wilco v5.
- **Done (branch `interactive-notes-review`, owner: "I want it for guided notes and review"):** guided notes (a box per
  blank, Check my notes, the filled-in notes to print) and the review game (one card at a time with categories and
  points, a results page or an answer sheet, and a class mode for a projector with a class code on the teacher copy);
  fixtures `samples/_cap-interactive/notes` and `…/reviewgame`; onboarding v11, maker v10, wilco v6.
  docs/KINDS-INTERACTIVE-FORMAT.md.
- **Open:** ordering questions; a class view of results (each result stays on the student's device); the Word teacher
  copy's note box; measure the price on the first five interactive orders.

## Referral codes (owner, Nov 12, 2026)
- **Done:** an optional "Referral code" box in step 5 of the order page, filled in by a shared link
  (`…/?ref=CODE`), cleaned to capitals, digits and dashes (24 at most), saved as `referral` in the order
  (`order_json.referral`) and shown in the owner's new-order email. No database change: it rides in `order_json`.
- **Later:** the reward program (who gets what, when a code counts, codes per teacher). Nothing is promised to anyone yet.

## Reading quizzes: short answer + RACE; multiple choice on passages retired (owner, Nov 7 and Nov 11, 2026)
- **Owner:** after four ELA tries (g7-ela2 remake, tries c and d) failed the fresh no-passage probe, reading quizzes are
  sold as citing short answers plus a RACE response until a passage-based multiple-choice version passes.
- **Done:** `menu.json` (the item's text and an option the teacher sees: "Multiple choice on passages is in testing: our
  checks can still sometimes answer it without reading. Short answers and RACE are fully checked."), `feasibility.json`
  (default 6 short answers + 1 RACE a version; `mcInTesting` for the option), the order page (a Yes/No field with that
  warning), onboarding v9 (warns in those words), maker v8, blind-ela v6, docs/FEASIBILITY.md, docs/PRICING.md (150 kept).
  We make no claim that it passes: try d's final probes were A 4 and B 7 of 8 (`docs/audits/AUDIT-2026-11-07-ela-try-d.md`).
- **What lets multiple choice graduate:** one reading sample whose every version passes **two fresh final no-passage
  probes** (the runbook's step 4a line, chance + 15 points; a version fails if either run fails, never averaged), with
  the keyless blind solve and the fact recheck of its last round's fixes clean. Then the owner decides whether to drop
  "in testing" and make multiple choice an ordinary option again.
- **Nov 11, 2026 (owner review):** retired, not sold even "in testing": the menu option, `mcInTesting` and the
  `inTesting` warning are gone; onboarding v13 says it isn't offered (`notOffered`), maker v13 never writes it.
- **Status:** retired. g7-ela2 stays hidden from the Samples page and on `checks/cross-item-debt.json` until a later
  attempt passes.

## Say or type what you want; the onboarding agent does the rest (owner, Nov 5, 2026)
- **Owner:** "can we add a feature that a person speaks or types what they want and the onboard person takes all the info they share, asks questions for the rest?"
- **Step 1 (no server):** a "Tell us in your own words" box at the top of the order page with a 🎤 button (the browser's own dictation, Web Speech API, on the device; typing always works). The text goes in order.json as `ownWords`. The onboarding agent reads it first, fills grade, subject, items, numbers, due date and requests from it, shows "here's what we understood", and its follow-up asks only for what's missing (still at most 3 questions). The menu stays for people who prefer it. About 30–45 min, $5–10.
- **Step 2 (with the automatic server):** a live conversation with the onboarding agent that fills the order on screen as they talk and asks its questions right away.
- **Status:** planned; build after the interactive standard and the English reading remake.

## A less plain, less "AI" look (owner, Nov 5, 2026)
- **Owner:** "the presentation of the app is pretty plain, can we make it look less ai?" — picked **Bright classroom**: bold friendly colors, rounded shapes, playful doodle illustrations of the agent characters (Tess, Brick, Reel, Inka, Wilco, Hush, Tally, Margo; original designs from docs/marketing/CAMPAIGN-YOUR-STANDARDS-YOUR-WORLD.md's character sheet), a bit like Pet World.
- **Plan:** a design pass over every page (order, review, samples, world, about): a distinctive heading font (bundled, no CDN), a real palette with light and dark versions, code-drawn SVG doodles of the agents (no stock art), a stronger hero, the agents shown at work in "How it works", phone screenshots and a fresh-eyes design review before merging. Bump the service worker. About 1 hour, $8–15.
- **Status:** first pass done Nov 7, 2026 (branch `teacher-app-look`): a teacher's-app shell (top bar, sidebar, restyled tab bar), status folder colors, the order page as numbered planning steps with a sticky token summary and paper icons, My orders as a planner with a next action per row, the review beside a large preview. Agent doodles and a bundled heading font are still open.

## Streamline the order loop (owner, Nov 6, 2026)
- **Owner:** "[the product] feels very clunky... teachers make it, it zips, they email it, i claude it, i send back the doc
  for reviews they approve / disapprove, i remake, they approve or we just cancel it... how can we streamline this?"
- **The plan:** the teacher's clicks drive the loop; the owner steps in only for exceptions.
  - **A.** Sign-in (email link), direct upload to private storage, an orders dashboard with status. No zips or email.
  - **B.** Online review: the preview opens in the dashboard; Approve / Request changes (comments) / Cancel; approval releases
    the final files to download.
  - **B2.** 📁 My documents (opt-in, off by default): keep finished packs, project files and style examples under the
    account to reprint, edit or make versions; delete anytime (the delete notice changes to match).
  - **C.** The automatic runner: a server worker runs the same agent team on each new order (its own API key, a cost cap per
    order, status updates); onboarding questions answered on the page. The auditor reviews every order's findings and
    teacher comments; **since Nov 8, 2026 its brief changes go straight to main through a gate** (owner: "auditor makes
    edits as they see fit"; `scripts/auditor-gate.mjs`), and only refused ones wait for the owner.
  - **C2.** 📚 Shared library (opt-in): after approving, a teacher may share a finished, checked pack (never their uploads)
    with credit and a license (e.g. CC BY); one more review before it's public; others use it as is or "make this mine"
    (remix through the team in their style, fewer tokens); a name scan keeps student information out; sharing earns tokens.
  - **D.** Tokens and payment (Stripe) once real teachers pay.
- **Also:** upload a web page (a saved .html file, text only, scripts ignored) alongside PDF and Word (built Nov 6, 2026:
  both drop zones, the page count reads the page's text, `scripts/html-text.mjs` for the agents).
- **Paste a link** (built Nov 7, 2026): a box for a web address in steps 1 and 2, signed in only. Our server (a Vercel
  function, `api/fetch-page.js`) reads the page as text, never runs it, with an address guard and the same source
  fence and size limit; the link becomes a `.txt` source. Signed out: File → Save page as, and drop in the .html file.
  docs/BACKEND.md, "Paste a link".
- **Status:** web-page upload, A and B built Nov 6, 2026; paste a link Nov 7, 2026 (docs/BACKEND.md; needs the owner's new Supabase project,
  steps there); **C built Nov 8, 2026, pending the owner's setup** (below); B2, C2, D next.
- **C, the automatic runner (built Nov 8, 2026, branch `speed-ups`; owner: "if this is going to be feasible, we have
  got to make this shorter"):** a database trigger (`supabase/runner/dispatch.sql`, pg_net + Vault) sends a GitHub
  `repository_dispatch` when an order is sent (onboarding, the follow-up) and when she answers (the build, up to
  `preview_ready`); `.github/workflows/run-order.yml` runs `scripts/run-order.mjs` with the secrets from the
  repository's Actions secrets, one run per order at a time. The build checks in parallel, rechecks only changed items,
  makes number versions by script (`scripts/versions.mjs`) and has a cost stop. Target: about 14 minutes from her answer
  to the preview for a test like the first real order (31 before; docs/audits/TIME-2026-11-08.md).
  **Pending the owner:** the Actions secrets and variables, two fine-grained tokens (dispatch; the auditor's commits),
  pg_net and the Vault secrets, running `dispatch.sql` (or `dispatch-approved.sql`), one made-up order end to end
  (docs/BACKEND.md, "The owner's setup: one checklist").
  **The final, automatic (owner, Nov 8, 2026):** when she approves, the runner renders the final with
  `render-pack.mjs --final` (refused if anything changed since she approved: `failed` with a note, nothing posted),
  posts it (`final_ready`), deletes her uploads, the preview and the working files (finals and her style notes stay;
  the owner copy of the audit report is never uploaded), and a daily workflow runs `purge --due 7`.
  **The auditor, automatic (owner, Nov 8, 2026: "auditor makes edits as they see fit"):** after each delivered order
  and in the weekly test a fresh auditor edits the briefs; `scripts/auditor-gate.mjs` puts on main only brief edits
  with a version bump and a cause that remove or reword no hard rule, weaken no check and pass `npm run check`;
  checks, scripts, CLAUDE.md, prices and thresholds stay the owner's. Applied changes: `docs/audits/BRIEF-CHANGES.md`
  (`git revert <sha>` undoes one); refused ones are listed there for the owner.
  **Still by hand:** her change requests after a preview (a changes round), the hard cases the runner hands back
  (reading items, apps, puzzles and practice games, the cost stop, a FIX open after round 3), and what the gate
  refuses; per-student numbers (docs/KINDS-MATH.md §4, "Per-student numbers later").
