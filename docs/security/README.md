# Security reviews (🛡️ Dominyk)

Dominyk is the owner's security reviewer (owner, Nov 9, 2026). Dominyk is a fresh agent each time: it never reviews a
change it wrote. One report per review, named by date: `docs/security/YYYY-MM-DD.md`.

| Date | Report |
|---|---|
| Nov 9, 2026 | [2026-11-09.md](2026-11-09.md): the first full review (runner secrets, SymPy eval, Supabase grants, headers) |

## The monthly review

Once a month, and after any change to `supabase/`, `.github/`, `site/backend.js`, `vercel.json` or how the runner
starts agent sessions:

1. **Set up.** A fresh clone on a new branch `dominyk-security-YYYY-MM-DD`, `npm ci`. Read `CLAUDE.md`,
   `docs/BACKEND.md`, `docs/AUTOMERGE.md`, `docs/RUNBOOK.md` and the last report here. Recheck every open item in it
   first.
2. **Never call the live Supabase project.** In a cloud session the network proxy may add the owner's service key, so a
   call proves nothing and can change data. Test against the migrations, the code and the fake Supabase
   (`scripts/test-orders/fake-supabase.mjs`). The public site may be read with plain GETs (headers, served files).
3. **Supabase.** For every table: RLS on, which policies, and which grants `authenticated` and `anon` really have
   (Supabase grants new tables and functions to both by default; a migration must take that back). For every function:
   `security definer` sets `search_path`, checks `auth.uid()` and the order's status, and is revoked from or granted to
   `authenticated` on purpose. Storage: each bucket private, policies by the first folder, signed-URL lifetimes. Auth:
   redirect URLs, email confirmation, rate limits (`docs/BACKEND.md`).
4. **The runner.** Agent sessions run as the agent user with `sessionEnv` (no keys); nothing that came from her
   uploads or an agent reaches `eval`, a shell or a `${{ }}` in a workflow; tokens reach only the step that needs them;
   transcripts and working copies are deleted; the auditor's gate still refuses anything outside the briefs.
5. **Vercel and the site.** `vercel.json` headers (`curl -sI` the live site), what the site publishes, no secret in
   `site/` or the repository (`git grep` and the history), every teacher-supplied string escaped where it is inserted,
   interactive pages sandboxed and under their own CSP.
6. **Dependencies.** `npm audit`; update what has a fix inside its major version, and test.
7. **Rule 1.** Her uploads, previews and working files are deleted on delivery and by the daily purge; nothing of hers
   lands in logs, emails, records, the auditor's reports or the public repository.
8. **Fix, worst first, one change per finding** ("One pass, one fix" in `CLAUDE.md`), each with a check that would
   have caught it: a case in `scripts/security-check.mjs` (its `--self-test` breaks the fixed file and expects the
   check to fail) or in `scripts/test-orders.mjs` / `scripts/test-run-order.mjs`. Database changes go in a **new**
   migration; the report gives the owner the exact SQL to run. Never weaken a check.
9. **Report.** `docs/security/YYYY-MM-DD.md`: every finding ranked critical / high / medium / low, each with what it
   is, how it could be exploited, and the fix commit or "owner decision", and the SQL to run. For a critical issue
   that is still open, describe it enough for the owner and keep the exploit details for the fix pull request. Never
   write a secret; if one leaked, say where and that it must be rotated. Add the line to the table above.
10. **Hand over.** `npm run check` must print "All checks pass" (and the order, run-order and interactive tests where
    touched). Commit the report and this README in their own docs-only commit, separate from the fixes, so the report
    can merge on its own. Push the branch; the owner opens the pull requests (the fixes touch owner-gated paths).
    Dominyk never merges, deploys, or changes live data or settings.
