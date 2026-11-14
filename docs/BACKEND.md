# The online backend: sign-in, uploads, My orders, online review

Roadmap A and B ("Streamline the order loop", docs/ROADMAP.md). A teacher signs in with her email and password (or an email link), Send uploads her
files straight to private storage, and **My orders** (`site/orders.html`) shows each order's status, the onboarding
follow-up with one-tap answers, the preview to review (Approve / Request changes / Cancel) and the final files. No zips
or email in between. The owner moves orders along with `scripts/orders.mjs`, or the automatic runner (C, below) does it once it is set up.

The backend is **its own Supabase project** (never Pet World's). Without it the site works exactly as before
(**local mode**): Send makes a zip on the device to email, and the preview is reviewed with REVIEW.html.

## How it fits together

| Piece | Where | What |
|---|---|---|
| Tables, rules, functions, buckets | `supabase/migrations/20261106120000_orders.sql` | `teachers`, `orders`, `order_events`, `admins`; row level security; `answer_follow_up`, `request_changes`, `approve_order`, `cancel_order`, `orders_due_for_purge`; the private buckets `uploads` and `deliverables` with their rules |
| The site's client | `site/backend.js` | A small fetch-based client (the site loads nothing from a CDN): sign-in (password, email link, create an account, reset, set a password), tables, functions, uploads, signed links. `wireSignIn` draws the sign-in box on both pages |
| The site's settings | `backend.config.json` (git-ignored) | `{ "supabaseUrl", "supabaseAnonKey" }`, written from the host's environment by `scripts/build-backend-config.mjs`; missing = local mode. `backend.config.example.json` shows the shape |
| The order page | `site/index.html`, `site/order.js` | The "Send it online" sign-in box at the top. Signed in: Send uploads to `uploads/<teacher>/<order>/{training,sources}/` and adds the order (status `sent`). Signed out, offline or local mode: the zip, as before |
| My orders | `site/orders.html`, `site/orders.js` | Her orders with status and history; the follow-up; the review; the final files |
| The owner's side | `scripts/orders.mjs` | `list`, `pull`, `follow-up`, `answer`, `preview` (also keeps the reviewed `pack.json` in `work/`), `preview-get`, `approval`, `final`, `purge`, `status`, `work-get`/`work-put`, `style-*` (docs/RUNBOOK.md); the automatic runner calls the same commands |
| The test | `scripts/test-orders.mjs` | The whole loop with a fake Supabase and Playwright (below) |

### The teacher's blind-check choice

`order_json.order.checks.blind` (owner, Nov 8, 2026): `false` when she unticked "Blind check by a fresh agent" on the
order page. It is hers to change only by sending the order; the team reads it from her order, never from the maker's
pack (`scripts/run-order.mjs` copies it into `pack.order.checks`). `orders.mjs preview` passes `review.blindSkipped`
so My orders shows the warning above the preview. What is skipped and what still runs: docs/RUNBOOK.md step 5.

### Order status

`sent` → `onboarding` (the owner pulled it) → `needs_answer` (follow-up posted; she taps her answers) → `building` →
`preview_ready` → `changes_requested` (her comments; back to `building` and a new preview) or `approved` → `final_ready`.
`cancelled` (she cancels, any time before she approves) and `failed` (the owner or the runner, with a note she sees)
end it. `draft` is reserved. With the automatic runner on, `sent`, `building` and `approved` each start it (the
onboarding, the build, the final); `approved` → `final_ready` needs nobody, and a final refused by the approval check
goes to `failed`. Every change is logged in `order_events` by a trigger.

### Who can do what (the row level security)

- **A teacher** sees only her own `teachers` row, `orders`, `order_events` and files. She can add an order only for
  herself, only with status `sent` and nothing the team fills in. She can't update or delete an order directly: the
  four functions are the only way (answer the follow-up, request changes, approve, cancel), and each checks the status.
  She can add files only under `uploads/<her id>/`, and read only her own folder in `uploads` and `deliverables`.
- **Approve** (`approve_order`) accepts only an approval for this order with the preview's `packHash` and agreement
  text, listing every preview PDF with the SHA-256 the preview was made with. The browser downloads each PDF it shows
  her and hashes the bytes itself (WebCrypto), so the approval is in exactly the shape `render-pack.mjs --final` checks
  (`{orderId, name, date, statement, packHash, documents:[{file, title, sha256}]}`), and the renderer checks it again.
- **The owner role** is a row in `public.admins` (her auth user id). Admins can read every order, event, teacher and
  file, in My orders too ("owner view", read-only: the functions only act for the order's own teacher). Nobody can add
  an admin from the site; it's done in the SQL editor (step 6). A table was picked over a custom JWT claim because it
  needs no auth hook and takes effect at once.
- **The service key** (owner's computer only) bypasses all of this; `scripts/orders.mjs` uses it.

### Deleting uploads (CLAUDE.md rule 1)

Supabase Storage files can only be deleted through its API, not from SQL, so the retention job is:
`orders_due_for_purge(days)` lists orders that are `final_ready`, `cancelled` or `failed`, were last changed more than
`days` ago (default 7) and still have uploads, and `node scripts/orders.mjs purge --due` deletes their uploads and
preview files and sets `uploads_purged_at`. Final files stay for her to download (`purge <id> --finals` deletes them
too). The runner runs `purge <id>` right after it posts her final files, and `.github/workflows/purge-due.yml` runs
`purge --due 7` every day (08:23 UTC) for cancelled, failed and older orders, so nothing waits on the owner (by hand:
`orders.mjs purge <id>`, `purge --due`). Her style notes (`deliverables/<teacher>/style/`) are never purged: they are
hers, kept for her own agents, deleted with `orders.mjs style-forget <teacher id>` when she asks.

## The owner's setup, step by step (in the Supabase website)

1. **Make the project.** supabase.com → sign in → **New project**. A new organization or the same one, but a **new
   project**, not Pet World's. Name it after the product (from `brand.config.json`), pick a strong database password
   (save it in your password manager) and the region nearest your teachers. Wait for it to finish setting up.
2. **Run the SQL.** Left menu → **SQL Editor** → **New query**. Paste all of
   `supabase/migrations/20261106120000_orders.sql` and press **Run**. It should say "Success. No rows returned". This
   makes the tables, the rules, the functions and both storage buckets.
3. **Check the buckets.** Left menu → **Storage**. You should see `uploads` and `deliverables`, both **Private** (no
   "Public" badge). Don't make either public.
4. **Email and password sign-in.** Left menu → **Authentication** → **Sign In / Providers** → **Email**:
   - **Enable Email provider**: on. **Confirm email**: on (a new account must open one email before it can sign in).
   - **Minimum password length**: **8**. Supabase's own default is 6; the site asks for 8 and says so, and this makes
     the server refuse anything shorter too. **Password requirements**: leave at "No required characters" (the page
     only shows the length rule; a longer phrase beats forced symbols).
   - **Prevent use of leaked passwords** (it may say "Pro plan" or be missing on the free plan): turn it on if your plan
     has it. A password found in a known data leak is then refused, and the page says "That password has shown up in a
     data leak on another site. Please choose a different one."
   - **Secure password change**: leave **off**. When on, Supabase wants a fresh sign-in (or a code) before a password
     change, which would block "Set a password" in My orders for a teacher who signed in days ago with a link.
   - Save. Then **Authentication → Sessions** (if your plan shows it): leave "Time-box user sessions" and "Inactivity
     timeout" empty so teachers stay signed in; leave "Detect and revoke potentially compromised refresh tokens" on.

   Then **Authentication → Emails** (templates). Write the product name from `brand.config.json` where it says
   *the product name*; keep `{{ .ConfirmationURL }}` exactly as it is.
   - **Confirm signup**: subject `Confirm your account for the product name`; body
     `<p>Hi! Tap the link to confirm your email. It opens the site signed in, and from then on you sign in with your
     email and password.</p><p><a href="{{ .ConfirmationURL }}">Confirm my email</a></p><p>Didn't make an account?
     Ignore this email.</p>`
   - **Reset password**: subject `Set a new password`; body `<p>Someone (we hope you) asked to reset the password for
     this email. Open the link on the device you use for your orders and choose a new password.</p><p><a
     href="{{ .ConfirmationURL }}">Set a new password</a></p><p>Didn't ask? Ignore this email: your password stays
     the same.</p>`
   - **Magic Link**: subject `Your sign-in link`; body `<p><a href="{{ .ConfirmationURL }}">Sign in to your
     orders</a></p><p>Open it on the device you're ordering from. Tip: set a password in My orders and you won't need
     this email next time.</p>`

   For real teachers, set up **SMTP** (Authentication → Emails → SMTP settings) with the order email account's provider:
   Supabase's own sender is for testing only and sends just a few emails an hour. With passwords, a teacher needs an
   email only once (to confirm) and when she forgets her password, so the limit matters much less than with links.
   **Authentication → Rate Limits** shows the limits; the defaults are fine (the page says "Too many tries in a short
   time" or "We've sent several emails to this address already" when one is hit).
5. **The web address.** Authentication → **URL Configuration**: **Site URL** = the site's address with `/site/`
   (for example the `website` in `brand.config.json` + `/site/`). Under **Redirect URLs** add
   `https://<your site>/site/index.html`, `https://<your site>/site/`, `https://<your site>/site/orders.html`, and for
   testing on your computer `http://localhost:4321/site/**`. The sign-in link only returns to addresses on this list.
   The confirmation and password-reset links come back to the page she asked from (the order page or My orders), so
   these same addresses cover them: nothing to add. Only if the site also runs at another address (a custom domain
   next to the vercel.app one, or Vercel preview links) add that address's three pages too, or the links fall back
   to the Site URL.
6. **Make yourself the owner.** Open the site, make your account once (My orders → Create an account, then open the
   confirmation email).
   Then in the SQL Editor run:
   ```sql
   insert into public.admins (id, note) select id, 'owner' from auth.users where email = 'YOUR EMAIL';
   ```
   My orders now says "owner view" and shows every order.
7. **The site's keys (Vercel).** Supabase: **Project Settings → API** (or **API Keys**): copy the **Project URL** and
   the **anon** (or **publishable**) key. Vercel → the project → **Settings → Environment Variables**: add
   `PP_SUPABASE_URL` = the Project URL and `PP_SUPABASE_ANON_KEY` = the anon key, for Production (and Preview if you
   like). Redeploy. The build (`vercel.json`) writes `backend.config.json` from them; the order page then shows
   "Send it online". The anon key is meant to be public: what protects the data is step 2's rules.
   Remove the two variables and redeploy to go back to local mode.
8. **The owner's computer.** Copy the **service_role** (or **secret**) key from the same page. It can read and change
   everything: never put it in Vercel, the site, the repository or a chat. Keep it in a file only you can read:
   ```
   printf 'export PP_SUPABASE_URL=https://<project>.supabase.co\nexport PP_SUPABASE_SERVICE_KEY=<service key>\n' > ~/.pp-owner.env
   chmod 600 ~/.pp-owner.env
   source ~/.pp-owner.env && node scripts/orders.mjs list
   ```
9. **Try it once yourself** (a made-up order, a made-up teacher name, a sample source): sign in on the order page, send,
   then follow docs/RUNBOOK.md with the `orders.mjs` commands to the final files, and `purge` it.

Locally: `PP_SUPABASE_URL=… PP_SUPABASE_ANON_KEY=… npm run serve` (or a `backend.config.json` copied from the example)
switches online orders on at http://localhost:4321/site/.

## Sign-in: passwords, email links and staying signed in (built Nov 8, 2026)

The owner, Nov 8, 2026: "the sign-in email every time is really annoying." Email and password is now the main way;
the email link is still there as the second.

| What she does | What the page calls | What she sees |
|---|---|---|
| **Sign in** (email + password) | `POST /auth/v1/token?grant_type=password` | Signed in at once. Wrong password: "That email and password don't match an account…"; not confirmed yet: "Please confirm your email first…" with **Send the confirmation email again** (`POST /auth/v1/resend`) |
| **Create an account** | `POST /auth/v1/signup?redirect_to=<this page>` (with `data.has_password`) | "Almost done. Check your email (…) once to confirm your account, then sign in here with your password." The link in that email brings her back signed in ("Your email is confirmed…"). For an address that already has an account Supabase sends nothing and answers the same, so nobody can test who has an account |
| **Forgot password?** | `POST /auth/v1/recover?redirect_to=<this page>` | "If there's an account for …, we've emailed it a link…". The link brings her back signed in (`#…&type=recovery`) with **Set a new password** on top (kept after a reload until she saves or taps **Not now**) → `PUT /auth/v1/user {password}` |
| **Email me a sign-in link instead** | `POST /auth/v1/otp` (as before) | As before |
| **Set a password** (My orders, signed in) | `PUT /auth/v1/user {password, data.has_password}` | For a teacher who has used only links: "Set a password so you don't need an email next time." Afterwards (and for anyone with a password) it reads **Change password** |

- **The rule**: at least 8 characters, shown under every new-password box and checked before sending; the server
  checks it again (step 4). Leaked or reused passwords get their own message.
- **Phones fill it in**: real `<form>`s with labelled inputs; `autocomplete="username"` on the email,
  `current-password` to sign in, `new-password` to create or reset (with a hidden `username` field holding her email so
  the phone saves the new password under the right account). **Show / Hide** switches the box between dots and text.
- **Nothing secret is kept**: the password goes from the box to Supabase over HTTPS and the box is cleared. The browser
  keeps only the session (`pp-session` in localStorage: access token, refresh token, expiry, her id and email, and
  how she signed in), as before. Nothing logs a password.
- **Staying signed in**: the access token lasts an hour; before any call within a minute of expiry the client trades the
  refresh token for a new pair (`grant_type=refresh_token`). A 401 on a call (say the phone's clock is off) gets one
  refresh and one retry. It signs her out only if Supabase refuses the refresh token itself, never because she was
  offline or the server hiccuped. Refresh tokens are single use, so with two tabs open the second one picks up the
  first one's new tokens from localStorage instead of reusing the old one (which Supabase would treat as stolen), and
  every tab follows a sign-in or sign-out in another tab.
- **The installed app (PWA)**: on Android and computers the installed app shares the browser's storage, so one sign-in
  covers both. **An iPhone home-screen app keeps its own sign-in**: a link opened from Gmail or Mail opens in Safari (a
  different "browser" as far as sign-in goes), so a link, a confirmation or a reset signs in Safari, not the app. With a
  password she just signs in inside the app. The link form says so when it's opened from the iPhone app, and after a
  reset in Safari she signs in in the app with the new password. The service worker never touches Supabase (another
  origin), so none of this is cached.

## Paste a link (built Nov 7, 2026)

On the order page, steps 1 and 2 each have a **🔗 Paste a link** box (signed in only; signed out or in local mode it
says to sign in, or to save the page with File → Save page as and upload it). **Get the page** sends the address to our
own server, which reads the page as text and sends back `{ url, finalUrl, title, site, text, words }` (never the
page's HTML). The page shows a preview card (title, site, word count, the first ~300 words, and the pages it adds to
the source count) with **Use this** / **Remove**. **Use this** turns it into a `.txt` file in that step's list
(`link - <title>.txt`: a header with the address, the title and the date, then the text), so the 25 MB limit, the
page count, the upload to `uploads/<teacher>/<order>/{training,sources}/`, `orders.mjs pull` and the onboarding agent
treat it exactly like an uploaded file. `order.json` also lists each link in `order.links`
(`[{ file, url, pasted?, site, title, read }]`) for the audit report. The source notice and the "sent to AI" notice stay
on screen.

| Piece | Where |
|---|---|
| The server function | `api/fetch-page.js` (a Vercel serverless function; `vercel.json` gives it 20 s and the two files it reads) → `scripts/fetch-page.mjs` (all the logic) |
| The text extraction | `scripts/html-text.mjs` `pageToText` (the same code as for saved pages; linear time on any input) |
| The browser side | `site/backend.js` `fetchPage`, `site/order.js` (the link box and card) |
| Local testing | `npm run serve` mounts the same handler at `/api/fetch-page` |
| Tests | `scripts/test-fetch-page.mjs` (in `npm run check`), and the link steps in `scripts/test-orders.mjs` |

**Why a Vercel function, not a Supabase Edge Function:** the site is already on Vercel, which already has the only two
settings the function needs (`PP_SUPABASE_URL`, `PP_SUPABASE_ANON_KEY`), so there's **no new secret** and nothing new to
deploy by hand (Edge Functions need the Supabase CLI and a separate deploy). It runs on Node, so it shares
`scripts/html-text.mjs` with the agents' copy instead of a Deno fork, and Node lets us pin the socket to the address we
checked (Deno's `fetch` can't), which is what stops DNS rebinding.

**The guard** (this fetches addresses a user typed, from our server):
- Only a signed-in teacher: the function checks her access token with Supabase (`/auth/v1/user` with the anon key; no
  service key). No token or a bad one: 401.
- Only `http`/`https`, ports 80 and 443, no user name or password in the address, at most 2048 characters.
- The host is resolved on the server and **every** address must be public. Refused: `0.0.0.0/8`, `10/8`, `100.64/10`
  (CGNAT), `127/8`, `169.254/16` (link-local, the cloud metadata address 169.254.169.254), `172.16/12`, `192.168/16`,
  `192.0.0/24`, the documentation and benchmarking ranges, `224/4` multicast, `240/4` and broadcast; IPv6 `::`, `::1`,
  IPv4-mapped and -compatible addresses (checked as IPv4), everything outside `2000::/3` (so `fc00::/7`, `fe80::/10`,
  `ff00::/8` …), Teredo, 6to4, NAT64 and documentation prefixes. Names like `localhost`, `*.local`, `*.internal`,
  `*.home.arpa` are refused before any lookup. Odd spellings (`127.1`, `0x7f000001`, `2130706433`, octal) are
  normalised by the URL parser first, so they're caught too.
- The connection goes to the address that was checked (the socket's lookup is pinned), so a second DNS answer can't
  swap in a private address. TLS still checks the certificate against the host name.
- At most 3 redirects, followed by hand; every new address goes through all the checks again. Meta refresh and
  scripts are never followed (the page is only text to us).
- 10 seconds in all, at most 3 MB read (counted after decompression, so a gzip bomb stops too); only `text/html`,
  `application/xhtml+xml` and `text/plain`. A PDF, image or other file: "Download the file and upload it instead".
  401/402/403/429/451 (a paywall or a block): "This page didn't let us read it: save it from your browser and upload it".
- 30 links an hour per teacher. **The count is kept in memory per server instance** (a cold start or a second instance
  starts its own count): fine for the pilot; move it to a table if it's ever abused.
- The user agent names the product (read from `brand.config.json`) and nothing personal.
- It logs only the host, the status and the size of each request: never the path, the token or the text.

**The owner's setup:** nothing new. Steps 1–7 above already set `PP_SUPABASE_URL` and `PP_SUPABASE_ANON_KEY` in Vercel;
the next deploy picks up `api/fetch-page.js` by itself. To check it after deploying: sign in on the order page, paste a
public article's address in step 2, press **Get the page**, and see the preview. (Vercel → the project → **Logs**,
filter `fetchPage`, shows one line per request: host, status, bytes.) To switch links off, delete `api/fetch-page.js`
and redeploy: the box then says it couldn't read the page and to upload the saved page instead.

## The pilot: you approve each teacher, and each gets 150 tokens (owner, Nov 12, 2026)
While we test, a teacher who signs up can look around and set up an order, but can't send one until you approve her.
An approved teacher has **150 tokens in all**, across every order she sends (cancelled ones count too: an order can be
cancelled after the agents have worked on it). Orders are free during the pilot. You (a row in `admins`) are not limited.

- **Turn it on (once):** Supabase → **SQL Editor** → New query → paste all of
  `supabase/migrations/20261112120000_pilot_limit.sql` → **Run**. It changes no data. Until you run it, nothing changes:
  anyone signed in can send orders, as before.
- **Approve a teacher:** sign in to the site as yourself → **My orders** → **Teachers waiting for approval** → **Approve**
  (150 tokens). Or Table Editor → `pilot_teachers` → Insert row: her id (from `teachers`) and `tokens`.
- **Give someone more tokens:** Table Editor → `pilot_teachers` → change her `tokens`.
- **Take approval back:** delete her row in `pilot_teachers`.
- **What she sees:** at the top of the order page, "Your account is waiting for approval…", then "Pilot: free while we
  test. You have N tokens left." (and a warning when the order on the page is bigger), then a thank-you when they're
  used up. If she tries anyway, the database refuses the order with the same words.
- **The total her page sends can't be trusted on its own**, so the runner checks it: when the onboarding agent's recount
  is higher than what was sent, the order is handed to you before anything is built (`scripts/run-order.mjs`).
- **Ending the pilot:** a later migration that drops the two checks in `orders_check_new` (keep the 10-a-day and 5-open
  limits), once payments are in.

## The automatic runner (roadmap C, built Nov 8, 2026; needs the owner's setup below)

Owner, Nov 8, 2026: "if this is going to be feasible, we have got to make this shorter" (docs/audits/TIME-2026-11-08.md:
31 minutes from her answer to the preview, 13 of them gaps between steps), and the same day: make the final step
automatic too, and "auditor makes edits as they see fit". The runner does what the owner did with `orders.mjs` and
`claude -p`, as soon as she acts:

```
she sends an order ──► orders row inserted (sent) ──► trigger ──► GitHub repository_dispatch "order-sent"
                                                                     └► Actions: run-order.mjs <id> --stage onboard
                                                                          onboarding + style notes ─► follow-up posted (needs_answer)
she answers in My orders ──► status building ──► trigger ──► "order-answered"
                                                                     └► Actions: run-order.mjs <id> --stage build
                                                                          maker → versions → parallel checks → FIX rounds →
                                                                          final check + reporter → preview posted (preview_ready)
                                                                          (the pack she reviews is kept in work/ beside it)
she presses Approve ──► approve_order: status approved ──► trigger ──► "order-approved"
                                                                     └► Actions: run-order.mjs <id> --stage final
                                                                          her approval + the kept pack + the preview files she saw →
                                                                          render-pack.mjs --final (refuses if anything changed) →
                                                                          finals posted (final_ready) → purge (uploads, preview, work/) →
                                                                          🔎 auditor → scripts/auditor-gate.mjs → main (or refused, listed)
every day 08:23 UTC ──► .github/workflows/purge-due.yml ──► orders.mjs purge --due 7
```

| Piece | Where | What |
|---|---|---|
| The trigger | `supabase/runner/dispatch.sql` (and `dispatch-approved.sql`, the same function, for an owner who ran the first version) | On a new `sent` order, or a status change to `building` or `approved`, `pg_net` posts `{event_type, client_payload: {id}}` to GitHub's dispatches API with a token from Supabase Vault. Not set up = does nothing |
| The workflow | `.github/workflows/run-order.yml` | Checks the id, installs (npm, Claude Code, Playwright's Chromium, SymPy), runs `scripts/run-order.mjs`, deletes the working copies; one run per order at a time (`concurrency`), 75 minutes (45 for the final), `contents: read`; the final alone gets `PP_AUDIT_TOKEN`, handed only to the gate's `git push` |
| The daily purge | `.github/workflows/purge-due.yml` | `orders.mjs purge --due 7` every day: uploads, preview files and kept working files of `final_ready`, `cancelled` and `failed` orders a week old (finals and style notes stay). Off: variable `PP_PURGE_ENABLED` = `false` |
| The coordinator | `scripts/run-order.mjs` | docs/RUNBOOK.md, "The fast path". Exit 3 = handed to the owner (status unchanged with a note for her, files kept in `deliverables/<teacher>/<id>/work/`); exit 1 = failed (status `failed` with a note she sees). Every hand-off also emails the owner "Needs you" (below, "What runs automatically") |
| The auditor's gate | `scripts/auditor-gate.mjs` | Briefs only (one version bump and a cause each, no hard rule removed or reworded, nothing skipped), then `npm run check`; commits and pushes to main what passes, lists the rest for the owner (`docs/audits/BRIEF-CHANGES.md`, `docs/audits/refused/`) |
| The tests | `scripts/test-run-order.mjs`, `scripts/auditor-gate.mjs --self-test` | `--dry-run` end to end against the fake Supabase, and the gate in made-up repositories (both in `npm run check`) |

**The final, step by step** (`run-order.mjs --stage final`, docs/RUNBOOK.md steps 11–14): `orders.mjs work-get` (the
`pack.json` and `run-log.jsonl` that `orders.mjs preview` kept beside the preview: the exact pack she reviewed) →
`orders.mjs preview-get` (the preview files she saw, from storage) → `orders.mjs approval` (`approval.json`) →
`render-pack.mjs --final`, which refuses unless the approval names this order and this exact pack and every preview
file still has the SHA-256 she approved; **on a refusal the order goes to `failed` with a note for her ("We did not
release your final files: the preview we have on file no longer matches the one you approved…"), nothing is posted,
and the runner stops** → `orders.mjs final` (status `final_ready`; the owner copy of the audit report,
`AUDIT-REPORT-OWNER.pdf`, is never uploaded: it stays in the working folder, which is deleted) → `orders.mjs purge
<id>` (her uploads, the preview files and `work/`; the finals stay for her to download, her style notes stay) → the
order's record (`records/<id>.json`: checks, log, audit and counts; no documents, uploads, style notes, name or
requests) → a fresh 🔎 auditor session, capped at $1.00, in a copy of the repository without `.git` → the gate. The
order is delivered whatever the auditor does; an auditor or gate failure is a line in the run's summary. Every step is
a line in the run log and the Actions summary (ids, steps, counts and costs; never her content).

**What stays manual** (the owner, by hand, as before):
- **Request changes.** Her comments after a preview (`changes_requested`): the owner writes `comments/<id>.md` and runs
  a maker round, a fresh recheck and a new preview (docs/RUNBOOK.md step 11). `orders.mjs preview` keeps the new pack,
  so when she then approves, the final runs automatically.
- **Bigger orders and hard cases the runner hands off** (exit 3): every order that isn't simple (below), the cost stop,
  a FIX still open after round 3, a final whose pack wasn't kept (a preview posted by hand before Nov 8, 2026). The
  status stays where it was, with a note for her that promises 24 hours; `orders.mjs work-get <id>` fetches the files.
  Every hand-off emails the owner "Needs you: <id>" with the reason (below), and shows in the Actions tab (a red run).

### What runs automatically (owner, Nov 8, 2026)

"Let's leave the runner for what we see as simple and tell them it will be within 24 hours for bigger." One rule, in
`menu.json`, read by both the order page and the runner through `site/scope.js` (`PPScope.check`):

- **Simple** (automatic): every item has `"auto": true` (worksheet, guided notes, quiz, unit test, study guide,
  homework, bell ringers, review game, versions of my test), the subject is in `automatic.subjects` (math, science,
  social studies, other), no item is set to one version per student (`itemSpecs.<item>.versions = "student"`: the
  runner doesn't build pools yet), at most **3 items** (`automatic.maxItems`, counting quantities) and at most **150
  tokens** (`automatic.maxTokens`: a quiz, a unit test and a worksheet with extra versions still fit; a whole unit pack
  doesn't). The all-versions key (`itemSpecs.<item>.keyPack`) stays simple: the runner copies her `itemSpecs` into
  `pack.order`, and the renderer makes it.
- **Bigger** (a person, within 24 hours): anything else: reading items and English / reading (the no-passage probe is
  scored by the lead), slides, rubrics, projects, unit packs, puzzles, apps, practice games, one version per student,
  more than 3 items or 150 tokens. An order sent as a zip by email is always by hand.

What she sees before Send (`#turnaround-before`, step 5): simple → "Usually ready in under an hour: the preview comes to
My orders after you answer our questions."; bigger → "Ready within 24 hours: a person on our team runs bigger orders
with the agent team." with a "Why:" line (e.g. "One version per student", "Reading quiz", "More than 3 items"); both end
"Every pack includes the audit report. Please check the pack before students see it." The same line is on the done
screens after Send. (The old `brand.config.json` `turnaround` override is no longer read: one honest text per path.)

What the runner does: onboarding runs for every order (she gets her questions as usual). The build checks the rule
first, before any session or spending; a bigger order is handed off (exit 3) with her note "This order is bigger than
our automatic path, so a person on our team runs it with the agent team. Your preview will be ready within 24 hours of
your answer." Other build hand-offs say "Your order needs a quick look from a person on our team before the preview.
Your preview will be ready within 24 hours of your answer."; a final hand-off says "…your final files … will be ready
within 24 hours of your approval." The final after her approval runs automatically for every order whose pack was kept
(a bigger order posted by hand with `orders.mjs preview` too).

**The owner's email on every hand-off:** `run-order.mjs` writes the reason (ids, steps, counts, menu names; never her
content) to `PP_HANDOFF_FILE`; `run-order.yml`'s next step runs `scripts/notify-order.mjs <id> --handoff "<reason>"`,
which emails "Needs you: <id>, grade … subject" with the reason, what was ordered and the next step (`orders.mjs
work-get`), under the same rules as the order email (no files, no requests text). It uses the order email's settings
(`PP_NOTIFY_FROM`, `PP_NOTIFY_TO`, `PP_NOTIFY_APP_PASSWORD`; off with `PP_NOTIFY_ENABLED` = `false`) and does nothing,
quietly, when they aren't set.
- **What the gate refuses.** A brief change the gate refuses (or any change to checks, scripts, prices or thresholds the
  auditor recommends) is listed for the owner in the audit report, `docs/audits/BRIEF-CHANGES.md` and
  `docs/audits/refused/<date>-<cause>.patch`; the owner applies it by hand if he agrees. Applied changes need nothing:
  each is a line in `BRIEF-CHANGES.md`, and `git revert <sha>` undoes one.

### The owner's setup: one checklist, once, in this order

Nothing here is done for you: no secret, token, trigger or schedule exists until you make it. Steps 1–6 turn on the
whole path (send → follow-up → preview → final → purge); 7–8 turn on the auditor; 9 tries it.

1. **An API key for the runner.** console.anthropic.com → **API keys** → **Create key** (a workspace just for the
   runner is best), then on that workspace **Limits** → set a **monthly spend limit**. Each order is capped by its own
   cost stop (2× its tokens × $0.10) and each audit at $1.00, but the workspace limit is the backstop.
2. **The repository's Actions secrets.** GitHub → this repository → **Settings → Secrets and variables → Actions →
   Secrets → New repository secret**, three times:
   - `ANTHROPIC_API_KEY`: the key from step 1;
   - `PP_SUPABASE_URL`: the Project URL (the same as in `~/.pp-owner.env`);
   - `PP_SUPABASE_SERVICE_KEY`: the service_role (secret) key. It only ever lives here and on your computer.
   (The daily purge uses the last two.)
3. **The repository's Actions variables** (same page, **Variables** tab → **New repository variable**):
   - `PP_RUNNER_ENABLED` = `true` (the on/off switch for the order runner);
   - `PP_MODEL_FAST` = the alias of the faster model setting, as Claude Code's `/model` list names it (the reporter uses
     it); `PP_MODEL_STANDARD` = the standard one, or leave it unset for Claude Code's default;
   - optional `PP_CLAUDE_CODE_VERSION` = a Claude Code version to pin (default: the latest);
   - nothing to set for the daily purge or the auditor (they are on once their secrets exist; `PP_PURGE_ENABLED` =
     `false` or `PP_AUDITOR_ENABLED` = `false` turns one off).
4. **A token for the trigger.** GitHub → your avatar → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**: name "order runner dispatch", expiry 90 days (put a reminder in your
   calendar), **Repository access: Only select repositories** → this repository, **Permissions → Repository
   permissions → Contents: Read and write** (what the dispatches API needs; nothing else). Copy it.
5. **Supabase.** In the project: **Database → Extensions** → enable **pg_net**. Then **SQL Editor → New query**:
   ```sql
   select vault.create_secret('OWNER/REPO', 'pp_github_repo');        -- this repository, e.g. someone/some-repo
   select vault.create_secret('THE TOKEN FROM STEP 4', 'pp_github_token');
   ```
   (or **Project Settings → Vault → Add secret**), then **New query**, paste all of `supabase/runner/dispatch.sql` and
   **Run**. If you already ran `dispatch.sql` before Nov 8, 2026, run `supabase/runner/dispatch-approved.sql` instead
   (it adds the approved trigger; running it again changes nothing). Check: **Database → Triggers** lists
   `orders_dispatch_runner` on `orders`.
6. **The daily purge.** Nothing more to do: with the secrets from step 2 it runs every day. To see it once now:
   **Actions → Daily purge → Run workflow**; the run's summary says what it deleted ("Nothing is due for deletion." on
   a new project).
7. **A token for the auditor's commits** (the runner commits the auditor's gated brief changes to main). GitHub →
   **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**: name "order
   runner auditor", expiry 90 days (calendar reminder), **Only select repositories** → this repository, **Repository
   permissions → Contents: Read and write** and nothing else. Copy it.
8. **Its secret.** This repository → **Settings → Secrets and variables → Actions → New repository secret**:
   `PP_AUDIT_TOKEN` = the token from step 7. Only the final stage gets it, and only the gate's `git push` sees it. If
   `main` has branch protection that blocks direct pushes, allow this token's owner to push (**Settings → Branches**,
   the rule for `main`), or the gate's push fails and the audit is listed as not applied. Without this secret the final
   still runs; the auditor is skipped.
9. **Try it**, with made-up material only. Send a made-up order from the order page (a made-up name, a sample source).
   Within a minute **Actions** shows "Run order" running; a few minutes later My orders shows the follow-up. Answer it:
   the build runs and the preview arrives in My orders. Approve it: a third run makes the final; My orders shows
   **Ready** with the zip; the run's summary ends with the auditor's digest ("auditor changed: …; to undo: git revert
   <sha>" or "auditor changed nothing"). In Supabase **Storage**, `uploads/<teacher>/<order>/` and
   `deliverables/<teacher>/<order>/preview/` and `work/` are gone and `final/` is there. To rerun one by hand: **Actions
   → Run order → Run workflow** with the order id (stage `auto`; `final` to include the auditor). On your computer:
   `source ~/.pp-owner.env && node scripts/run-order.mjs <id>`.

**Privacy.** The runner prints only ids, step names, times and costs, never her files, questions or answers; the
runner's machine is thrown away after each job and the workflow deletes the working copies and session transcripts
anyway. Keep the repository **private** all the same (Actions logs of a public repository are public). The record the
auditor commits holds no documents, uploads, style notes, names or requests.

**Turn it off** (any one of these): set the variable `PP_RUNNER_ENABLED` to `false` (runs start and skip at once);
Actions → Run order → **⋯ → Disable workflow**; or in the SQL Editor
`alter table public.orders disable trigger orders_dispatch_runner;` (`enable trigger` turns it back on). The auditor
alone: `PP_AUDITOR_ENABLED` = `false`, or delete the `PP_AUDIT_TOKEN` secret. The daily purge: `PP_PURGE_ENABLED` =
`false` or Actions → Daily purge → **Disable workflow**. To remove the trigger:
`drop trigger if exists orders_dispatch_runner on public.orders; drop function if exists public.dispatch_order_runner();`,
delete the Vault secrets and revoke the tokens. With it off, everything works as before: `orders.mjs` by hand.

**Tested:** `scripts/test-run-order.mjs` (the coordinator, dry run, against the fake Supabase: both early stages, a
FIX round with a changed-items recheck, the cost stop, a crash, the blind check skipped; her approval → the final
rendered and posted (`final_ready`), uploads, preview and working files deleted, finals and style notes kept, the
owner copy never uploaded, the auditor's change through the gate on main in a made-up copy of the repository with its
record; an auditor that also edits `checks/` refused and listed, the order delivered anyway; a preview file changed
after her approval → `failed` with a note and nothing posted; the daily `purge --due`); `scripts/auditor-gate.mjs
--self-test` (a good change lands; checks/, scripts/, CLAUDE.md, prices, thresholds, a removed or reworded rule, a
skipped check, no bump, no cause, an edited change log and a failing `npm run check` refused; a lost push race rebased);
`dispatch.sql` and `dispatch-approved.sql` against plain Postgres 16 with stand-ins for `vault` and `net` (the old
trigger sends nothing on approved; after `dispatch-approved.sql`, run twice, `sent` → `order-sent`, `building` →
`order-answered`, `approved` → `order-approved` once; the same status again, `final_ready`, `failed`, a disabled trigger
and no secrets send nothing); both workflows with `actionlint`. **Not tested:** a real GitHub dispatch, a real Actions
run, real Claude Code sessions in it, a real push with the fine-grained token (or branch protection), the schedule
firing, and pg_net on a real Supabase project: do step 9 before telling teachers.

### Order emails (owner, Nov 8, 2026)
When a teacher sends an order, `.github/workflows/order-email.yml` emails the owner a short note: who sent it (name and
reply-to email), grade, subject, topic, items, tokens, how many files, and a link to the site. It never carries her
files, her requests text or her style examples. It starts from the same `order-sent` dispatch as the runner, so it needs
steps 2 (the two Supabase secrets), 4 and 5 above; it runs even when `PP_RUNNER_ENABLED` is off.
1. Gmail (the account that sends; it can send to itself): **Google Account → Security → 2-Step Verification** on, then
   **App passwords** → name it "order emails" → copy the 16-letter password.
2. GitHub → this repository → **Settings → Secrets and variables → Actions → Secrets → New repository secret**
   `PP_NOTIFY_APP_PASSWORD` = that password.
3. Same page, **Variables**: `PP_NOTIFY_FROM` = the Gmail address, `PP_NOTIFY_TO` = where the email goes.
4. Try it: **Actions → Order email → Run workflow** with an existing order id. Off switch: variable
   `PP_NOTIFY_ENABLED` = `false`.

Tested: `node scripts/notify-order.mjs --self-test` (the text, no header injection from a name or a hand-off reason, no
requests text, the "Needs you" hand-off email) and `--dry-run` (scripts/test-run-order.mjs runs `--handoff --dry-run`
for each bigger order it hands off). Not tested: a real Gmail send.

### Sign-up emails (owner, Nov 14, 2026)
Two emails for the pilot, from `.github/workflows/teacher-email.yml` and `scripts/notify-teacher.mjs`:
- **Someone signs up** → an email to `PP_NOTIFY_TO` (the owner): their name, email, when they signed up, whether they
  confirmed their email, and how to approve (My orders → "Teachers waiting for approval" → Approve).
- **The owner approves them** → a welcome email to the address they signed up with: their tokens (and what that buys, from
  menu.json), the steps (sign in, examples, sources, what you want, requests, review cost and send, answer the
  questions, check the preview, download), "check it before students see it", the delete notice, and replies go to the owner.

Setup: the order email's Gmail setup above (`PP_NOTIFY_FROM`, `PP_NOTIFY_TO`, `PP_NOTIFY_APP_PASSWORD`), the runner's
Supabase secrets and Vault secrets (`pp_github_repo`, `pp_github_token`), then run
`supabase/runner/dispatch-teachers.sql` once in the SQL Editor. Try it: **Actions → Teacher email → Run workflow** with
`signup` and a teacher's id (the email comes to you). Changing a teacher's tokens later sends nothing. Same off switch:
`PP_NOTIFY_ENABLED` = `false`.

Tested: `node scripts/notify-teacher.mjs --self-test` (in `npm run check`) and `--dry-run`. Not tested: a real Gmail send.

## Tested, and how

- `node scripts/test-orders.mjs [--shots <folder>]`: a fake Supabase (`scripts/test-orders/fake-supabase.mjs`: the Auth,
  REST and Storage calls the site and the script make, with the same rules as the SQL; sign-up with email
  confirmation, password grant, single-use refresh tokens, reset, `PUT /user`, access tokens a test can expire and a
  rate limit it can trip) and Playwright, iPhone 13 and 1280 px, light and dark: local mode (the web page counted as
  text, Send downloads the zip), passwords (create an account → the 8-character rule → sign in before confirming is
  refused and the email resent → confirm → wrong password → rate limit → sign in, nothing but tokens stored → reload
  → an expired access token is refreshed, and one the server refuses early gets a refresh and a retry → forgot
  password → set a new password (the same one refused) → the old one fails and the new one works → a link-only
  teacher sets a password in My orders and signs in with it; the boxes at 375 and 1280 px, light and dark), sign-in by link, Send
  online, My orders in every status, the follow-up with one tap, Request changes, a tampered preview file refused,
  Approve → the real `render-pack.mjs --final` accepts the approval the browser made (and refuses a changed pack),
  final files, another teacher sees nothing, the owner sees everything, and `purge --due`. It renders the made-up
  `samples/_fixture` pack, never a real order. It is not part of `npm run check` (it takes a few minutes).
- The SQL was run against plain Postgres 16 with small stand-ins for Supabase's `auth` and `storage` schemas: a teacher
  can't add an order for someone else or an already-approved one, can't update an order directly or upload into
  another teacher's folder, answers only when asked, can't approve with a missing or changed file or cancel after
  approving; another teacher sees none of her rows; the owner sees all; anon sees nothing.
- `node scripts/test-fetch-page.mjs` (part of `npm run check`, a few seconds, no outside network): 75 allowed and refused
  addresses (`127.1`, `0x7f000001`, `2130706433`, `[::ffff:127.0.0.1]`, `169.254.169.254`, `localhost` …), a stubbed
  DNS that answers with private addresses, and a local page server: redirects (a loop, to metadata, to a private IP, to
  another port, to `file:`), PDF/image/JSON, 403/404/500, over 3 MB (declared, streamed, a gzip bomb), a slow page, gzip,
  a charset, the handler's 401/405/415/429/503, the rate limit, and the extraction in linear time on 3 MB of hostile
  markup. The test reaches its local server only through an `allowAddress` option the Vercel function never passes.
- `scripts/test-orders.mjs` also pastes a link (a local page) → preview → Use this → Send, and checks the `.txt` in
  uploads and `order.links`; a metadata address and a redirect to it show the friendly error; signed out and local mode
  show the save-and-upload hint.
- **Not tested on Vercel's real runtime or against real websites** (the sandbox has no direct internet): the function's
  bundling (`includeFiles`), the 20 s limit, real paywalls and sites that block bots. Try a few real articles after the
  first deploy.
- **Not tested against a real Supabase project** (none exists yet): real email delivery, the real magic-link,
  confirmation and reset redirects, real Storage limits and the exact error texts (the page matches Supabase's
  `error_code`s and falls back to its older messages). Do step 9 before telling teachers, with a password: create an
  account, confirm, sign out, sign in, Forgot password?, and on an iPhone sign in inside the home-screen app.
