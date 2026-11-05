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
