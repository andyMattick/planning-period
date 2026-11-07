# Roadmap

Ideas the owner asked for, in his words, with what's planned. Newest first.

## Reading quizzes: short answer + RACE; multiple choice on passages "in testing" (owner, Nov 7, 2026)
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
- **Status:** in testing. g7-ela2 stays hidden from the Samples page and on `checks/cross-item-debt.json` until a later
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
    order, status updates); onboarding questions answered on the page. **The auditor still reviews every order's findings and
    teacher comments, but its brief changes arrive as a proposal the owner approves** (never live automatically).
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
  steps there); B2, C, C2, D next.
