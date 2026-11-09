# Auto-merge when green (owner, Nov 9, 2026)

A pull request merges by itself once its checks pass. The owner only steps in when a check fails or the change touches
a sensitive area.

| Check (job) | Workflow | What |
|---|---|---|
| `check` | `.github/workflows/ci.yml` | `npm run check` ("All checks pass"), `scripts/test-orders.mjs`, `scripts/test-interactive.mjs` |
| `owner-gate` | `.github/workflows/owner-gate.yml` | Fails when the pull request changes a sensitive path, until the owner adds the label `owner-ok` |

**Sensitive paths** (the `OWNER_PATHS` line in owner-gate.yml): `CLAUDE.md`, `.github/`, `supabase/`,
`brand.config.json`, `site/backend.js`, `scripts/auditor-gate.mjs`. Everything else (agent briefs, checks with their
self-tests, the site, docs, samples, reports) merges by itself when green.

## How sessions work with it
1. Branch, change, run the checks in CLAUDE.md, push, open a pull request.
2. Turn on auto-merge for it (squash). It merges when `check` and `owner-gate` pass.
3. A sensitive path: say so in the pull request and to the owner; it waits for the `owner-ok` label.
4. A red check: fix it on the branch (CLAUDE.md, "One pass, one fix"); never weaken a check to get green.

The weekly test's report commits and the auditor's gated brief changes (docs/WEEKLY-TEST.md, step 9; the runner's
final stage) still push to `main` directly, through the ruleset's bypass list below; the gate runs `npm run check`
itself before it pushes.

## The owner's setup (once)
1. GitHub → this repository → **Settings → General → Pull Requests**: tick **Allow auto-merge** (and, if you like,
   **Automatically delete head branches**).
2. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**: name `main`, Enforcement **Active**, Target
   branches **Include default branch**. Tick **Require status checks to pass** and add `check` and `owner-gate`
   (they appear after the first run of each workflow). Under **Bypass list** add **Repository admin** (your auditor
   token and your own pushes) and the **Claude** GitHub App (the weekly sessions' report commits). Save.
3. **Issues → Labels → New label** `owner-ok` (any color).
