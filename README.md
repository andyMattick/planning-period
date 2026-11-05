# Planning Period (working name)

Teachers drop in their own examples and their source material, pick from a menu, add requests, see the token cost and
press Send. Agents make the pack, separate agents check it, and the teacher gets printable files and an audit report.

- The name and notices: `brand.config.json` (the only place the name lives)
- The menu and token costs: `menu.json`, `docs/PRICING.md`
- The pack format: `docs/PACK-FORMAT.md`
- The team and the rules: `CLAUDE.md`, `agents/`
- Running an order by hand (the pilot): `docs/RUNBOOK.md`
- The auditor's reports (one per audit, newest first): `docs/audits/README.md`
- World requests (a custom learning world, quoted): `docs/WORLD-REQUESTS.md`

## Setup for running orders and checks
- `npm ci` (renderer: docx, pptxgenjs, katex, mathjs)
- Python 3 with SymPy for the math check: `pip install sympy` (checks/math_check.py)
- Playwright's Chromium for PDFs and app tests (preinstalled in the cloud sessions)
- Hosting the site: `vercel.json` (no install needed for the site itself)
