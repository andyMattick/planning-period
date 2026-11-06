# Roadmap

Ideas the owner asked for, in his words, with what's planned. Newest first.

## Say or type what you want; the onboarding agent does the rest (owner, Nov 5, 2026)
- **Owner:** "can we add a feature that a person speaks or types what they want and the onboard person takes all the info they share, asks questions for the rest?"
- **Step 1 (no server):** a "Tell us in your own words" box at the top of the order page with a 🎤 button (the browser's own dictation, Web Speech API, on the device; typing always works). The text goes in order.json as `ownWords`. The onboarding agent reads it first, fills grade, subject, items, numbers, due date and requests from it, shows "here's what we understood", and its follow-up asks only for what's missing (still at most 3 questions). The menu stays for people who prefer it. About 30–45 min, $5–10.
- **Step 2 (with the automatic server):** a live conversation with the onboarding agent that fills the order on screen as they talk and asks its questions right away.
- **Status:** planned; build after the interactive standard and the English reading remake.

## A less plain, less "AI" look (owner, Nov 5, 2026)
- **Owner:** "the presentation of the app is pretty plain, can we make it look less ai?" — picked **Bright classroom**: bold friendly colors, rounded shapes, playful doodle illustrations of the agent characters (Tess, Brick, Reel, Inka, Wilco, Hush, Tally, Margo; original designs from docs/marketing/CAMPAIGN-YOUR-STANDARDS-YOUR-WORLD.md's character sheet), a bit like Pet World.
- **Plan:** a design pass over every page (order, review, samples, world, about): a distinctive heading font (bundled, no CDN), a real palette with light and dark versions, code-drawn SVG doodles of the agents (no stock art), a stronger hero, the agents shown at work in "How it works", phone screenshots and a fresh-eyes design review before merging. Bump the service worker. About 1 hour, $8–15.
- **Status:** next session, first.

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
- **Also:** upload a web page (a saved .html file, text only, scripts ignored) alongside PDF and Word; paste a link later
  (needs the server).
- **Status:** web-page upload, A and B being built Nov 6, 2026; B2, C, C2, D next.
