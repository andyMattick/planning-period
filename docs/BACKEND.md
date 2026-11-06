# The online backend: sign-in, uploads, My orders, online review

Roadmap A and B ("Streamline the order loop", docs/ROADMAP.md). A teacher signs in with an email link, Send uploads her
files straight to private storage, and **My orders** (`site/orders.html`) shows each order's status, the onboarding
follow-up with one-tap answers, the preview to review (Approve / Request changes / Cancel) and the final files. No zips
or email in between. The owner moves orders along with `scripts/orders.mjs` until the automatic runner (C) does it.

The backend is **its own Supabase project** (never Pet World's). Without it the site works exactly as before
(**local mode**): Send makes a zip on the device to email, and the preview is reviewed with REVIEW.html.

## How it fits together

| Piece | Where | What |
|---|---|---|
| Tables, rules, functions, buckets | `supabase/migrations/20261106120000_orders.sql` | `teachers`, `orders`, `order_events`, `admins`; row level security; `answer_follow_up`, `request_changes`, `approve_order`, `cancel_order`, `orders_due_for_purge`; the private buckets `uploads` and `deliverables` with their rules |
| The site's client | `site/backend.js` | A small fetch-based client (the site loads nothing from a CDN): email-link sign-in, tables, functions, uploads, signed links |
| The site's settings | `backend.config.json` (git-ignored) | `{ "supabaseUrl", "supabaseAnonKey" }`, written from the host's environment by `scripts/build-backend-config.mjs`; missing = local mode. `backend.config.example.json` shows the shape |
| The order page | `site/index.html`, `site/order.js` | The "Send it online" sign-in box at the top. Signed in: Send uploads to `uploads/<teacher>/<order>/{training,sources}/` and adds the order (status `sent`). Signed out, offline or local mode: the zip, as before |
| My orders | `site/orders.html`, `site/orders.js` | Her orders with status and history; the follow-up; the review; the final files |
| The owner's side | `scripts/orders.mjs` | `list`, `pull`, `follow-up`, `answer`, `preview`, `approval`, `final`, `purge`, `status` (docs/RUNBOOK.md) |
| The test | `scripts/test-orders.mjs` | The whole loop with a fake Supabase and Playwright (below) |

### Order status

`sent` → `onboarding` (the owner pulled it) → `needs_answer` (follow-up posted; she taps her answers) → `building` →
`preview_ready` → `changes_requested` (her comments; back to `building` and a new preview) or `approved` → `final_ready`.
`cancelled` (she cancels, any time before she approves) and `failed` (the owner, with a note she sees) end it. `draft`
is reserved. Every change is logged in `order_events` by a trigger.

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
too). Run `purge <id>` as soon as she confirms she has her pack (runbook step 13), and `purge --due` once a day (a
reminder, a cron job on the owner's computer, or the runner in C).

## The owner's setup, step by step (in the Supabase website)

1. **Make the project.** supabase.com → sign in → **New project**. A new organization or the same one, but a **new
   project**, not Pet World's. Name it after the product (from `brand.config.json`), pick a strong database password
   (save it in your password manager) and the region nearest your teachers. Wait for it to finish setting up.
2. **Run the SQL.** Left menu → **SQL Editor** → **New query**. Paste all of
   `supabase/migrations/20261106120000_orders.sql` and press **Run**. It should say "Success. No rows returned". This
   makes the tables, the rules, the functions and both storage buckets.
3. **Check the buckets.** Left menu → **Storage**. You should see `uploads` and `deliverables`, both **Private** (no
   "Public" badge). Don't make either public.
4. **Email sign-in.** Left menu → **Authentication** → **Sign In / Providers**: **Email** on, "Confirm email" on.
   Then **Emails** (templates): the "Magic Link" email can say "Sign in to your orders". For real teachers, set up
   **SMTP** (Authentication → Emails → SMTP settings) with the order email account's provider: Supabase's own sender is
   for testing only and sends just a few emails an hour.
5. **The web address.** Authentication → **URL Configuration**: **Site URL** = the site's address with `/site/`
   (for example the `website` in `brand.config.json` + `/site/`). Under **Redirect URLs** add
   `https://<your site>/site/index.html`, `https://<your site>/site/`, `https://<your site>/site/orders.html`, and for
   testing on your computer `http://localhost:4321/site/**`. The sign-in link only returns to addresses on this list.
6. **Make yourself the owner.** Open the site, sign in once with your own email (My orders → Email me a sign-in link).
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

## Tested, and how

- `node scripts/test-orders.mjs [--shots <folder>]`: a fake Supabase (`scripts/test-orders/fake-supabase.mjs`: the Auth,
  REST and Storage calls the site and the script make, with the same rules as the SQL) and Playwright, iPhone 13 and
  1280 px, light and dark: local mode (the web page counted as text, Send downloads the zip), sign-in by link, Send
  online, My orders in every status, the follow-up with one tap, Request changes, a tampered preview file refused,
  Approve → the real `render-pack.mjs --final` accepts the approval the browser made (and refuses a changed pack),
  final files, another teacher sees nothing, the owner sees everything, and `purge --due`. It renders the made-up
  `samples/_fixture` pack, never a real order. It is not part of `npm run check` (it takes a few minutes).
- The SQL was run against plain Postgres 16 with small stand-ins for Supabase's `auth` and `storage` schemas: a teacher
  can't add an order for someone else or an already-approved one, can't update an order directly or upload into
  another teacher's folder, answers only when asked, can't approve with a missing or changed file or cancel after
  approving; another teacher sees none of her rows; the owner sees all; anon sees nothing.
- **Not tested against a real Supabase project** (none exists yet): real email delivery, the real magic-link redirect,
  real Storage limits and the exact error texts. Do step 9 before telling teachers.
