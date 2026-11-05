# Instructions for AI coding assistants

**Planning Period** is a working name. The product's name, contact email and notices live in `brand.config.json`
only. Never write the name anywhere else (pages read it from the config; `npm run check` fails if it appears elsewhere).

## What this is
Teachers and homeschool parents drop in **training documents** (their own past work, so their agents learn their style)
and **source material**, pick items from the **menu** (`menu.json`), type any specific requests, see the **token cost**
and press **Send**. Our agent team makes the pack, separate agents check it, and the teacher gets a zip of printable
documents (PDF, Word, PowerPoint, teacher copies, A/B versions) plus an **audit report** of everything the agents did.

The selling point: **agents taught by teachers, checked by agents that didn't write the work**, and a report that shows
the work.

## The team (`agents/`)
| Agent | Brief | Job |
|---|---|---|
| 🧭 Onboarding | `agents/onboarding.md` | First after Send: measures the source, checks the order against `feasibility.json`, warns when it asks too much and sends a short follow-up (at most 3 questions) |
| 📝 Maker | `agents/maker.md` | Writes the pack from the source, in the teacher's style |
| 🙈 Blind tester (one per subject) | `agents/blind-<subject>.md` | Solves the student copy with no key; FIX / KEEP / JUDGMENT |
| 🧮 Solver (math) | `agents/solver-math.md` | Works every math answer independently |
| 🔎 Fact checker (science, social studies) | `agents/facts.md` | Checks every claim, date, name, term and equation |
| 🤖 Wilco | `agents/wilco.md`, `checks/` | Test-wise bots: can a student guess without knowing? |
| 🧾 Reporter | `agents/reporter.md` | Logs every step and writes the audit report: how hard the team worked |
| 🔎 Auditor | `agents/auditor.md` | After each order, changes the agents' briefs from the findings and teacher comments (with a change log), and finds ways to make it cheaper without losing quality |

**The builder never checks its own work.** Every check is a fresh agent.

## Rules (owner, Nov 5, 2026)
1. **We aren't farming their work.** Uploads and working copies are deleted after delivery. Style examples are kept only
   for that teacher's own agents, deletable anytime, never used for anyone else.
2. **Their sources:** limited use of copyrighted material is allowed, with a fence (a notice and a size limit); what they
   do with the output is on them. Every pack says it was made by AI from their source material.
3. **Honest turnaround,** and every pack says to check it before students see it.
4. **Tokens:** every item has a token cost from real build costs (`docs/PRICING.md`); the order page shows the total
   before Send.
5. Fix wrong choices, never keys, to pass a check. Never weaken a check to pass.
6. Samples use made-up teachers and students only.
7. **No release without the teacher's agreement.** The teacher gets a watermarked preview first and either asks for
   changes (a maker round, a fresh recheck, a new preview) or agrees; only then are the final files rendered and sent
   (`approval.json` in the order folder; `docs/RUNBOOK.md` step 11).

## Before every commit
`npm run check` (brand name in one place, menu and pack files valid, the renderer builds the samples, Wilco's bots pass
the samples). Commit messages are plain and specific.
