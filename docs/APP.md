# The app: one codebase for the web and the phone

The order site in `site/` is a Progressive Web App (PWA). The same files are:

- **a normal website on a computer:** a long page, with links at the top;
- **an app on a phone (640 px wide or less):** a title bar, a bottom tab bar (Order · Orders · Review · Samples · About), one
  order step per screen with progress dots and Back / Next, big tap targets, and room for the notch and home bar
  (`env(safe-area-inset-*)`);
- **an installed app:** it has its own icon and opens full screen. After the first visit it opens with no internet.

There is no framework and nothing loads from a CDN. Later, the same `site/` folder can be wrapped with Capacitor for the
App Store and Google Play (see below).

## The pieces

| File | What it does |
|---|---|
| `site/manifest.webmanifest` | The app's name, icons, colors and `display: standalone`. It is **generated** from `brand.config.json` by `scripts/build-manifest.mjs` and git-ignored, so the product's name is never typed anywhere else. `npm run serve` writes it at start and serves it fresh on every request, and `npm run check` writes and checks it. A static host or a Capacitor build runs `node scripts/build-manifest.mjs` first. |
| `site/icons/` | An open planner with a check mark. It has no text, so it survives a rename. `icon.svg` is the drawing; `icon-192/512.png`, `maskable-192/512.png` (Android's shaped icons, with the art inside the safe zone) and `apple-touch-icon.png` (180 px) are rendered from it by `node scripts/build-icons.mjs` (Playwright). The PNGs are committed. |
| `site/sw.js` | The service worker. See "Offline" below. |
| `site/common.js` | Registers the service worker, adds the phone tab bar, shows the install prompt, and sets the iPhone home-screen title from the config. |
| `site/style.css` | The app layout lives in the `@media (max-width: 640px)` block at the end. |
| `site/about.html` | The About tab: how it works, the team, installing, and your files. |
| `site/orders.html`, `orders.js`, `backend.js` | My orders (the Orders tab) and the online backend client: docs/BACKEND.md |
| Every page's `<head>` | `manifest`, `theme-color` (light and dark), `apple-touch-icon`, `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and `viewport-fit=cover`. |

## Installing it

**iPhone and iPad (Safari):** open the site, tap **Share**, then **Add to Home Screen**. On a phone, Safari shows a
short tip that says this. The tip has **Not now**, and the answer is remembered on that device. Other iPhone browsers
can't install web apps in every iOS version; Safari always can.

**Android (Chrome, Edge, Samsung Internet):** the browser offers **Install app**. On a phone, the page shows its own
**Install the app** card as soon as the browser allows it (`beforeinstallprompt`), with **Install** and **Not now**.
The About tab has an Install button too, and the ⋮ menu always has **Install app** or **Add to Home screen**.

**Computer (Chrome or Edge):** the install icon appears in the address bar. The page itself stays a normal website
and doesn't show a banner.

A web app only installs from **https** (or `localhost`), so the hosted site needs https.

## Offline

`site/sw.js` (cache names `shell-<VERSION>` and `data-<VERSION>`):

- **App shell** (the pages, CSS, JS and icons): saved on the first visit. After that it comes from the device first
  and is refreshed in the background. A page that isn't saved yet falls back to the order page.
- **Settings and data** (`brand.config.json`, `menu.json`, the manifest, and `samples/*.json`): **network first**, so
  a change to the menu or the name shows up as soon as you're online. When offline, the last saved copy is used.
- **Never saved:** files a teacher picks. They are read on the device and never fetched, and the order zip and the
  review JSON are made on the device as downloads. Sample pack files (`samples/*/out/`) aren't cached either.
- **Updating:** bump `VERSION` in `site/sw.js` whenever the shell changes. The new worker takes over right away, and
  old caches are deleted.

Offline, a teacher can fill in a whole order and press Send. The zip is made on the device, and she emails it when
she's back online.

Checked with Playwright (iPhone 13 and Pixel 7 emulation, 1280 px desktop, light and dark). The manifest loads with
the name from the config, the service worker registers and controls the page, and with the browser set offline every
tab reloads and the menu still shows.

## Later: the App Store and Google Play (Capacitor)

Capacitor puts the same `site/` folder inside a native app shell. Nothing in the pages needs to change.

What's needed:

1. **Accounts:** an Apple Developer Program membership ($99 a year, which needs a Mac with Xcode to build and upload)
   and a Google Play Console account ($25 once).
2. **A small `app/` folder** (not made yet): `npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`,
   then `npx cap init`. Write `capacitor.config.json` with `webDir` pointing at a copy of `site/` plus the two JSON files
   it reads (the pages fetch `../brand.config.json` and `../menu.json`, so copy those next to it, or change the two
   paths in `common.js` / `order.js` for the app build). Generate the app name and id from `brand.config.json` the
   same way the manifest is generated, so the name still lives in one place.
3. **Icons and splash:** start from `site/icons/icon.svg` (1024 px for the App Store) with `@capacitor/assets`.
4. **Native touches that help app review:** saving the zip uses `@capacitor/filesystem` and `@capacitor/share`, so
   "Email this file" opens the share sheet with the zip attached. Picking files works through the normal file input.
5. **Store listing:** screenshots (the Playwright ones are a start), a privacy policy (the delete notice is the core
   of it), and the AI notice in the description.

Apple rejects apps that are "just a website", so the store version should arrive with the backend below (real sending
and status), not before.

## The backend (built Nov 6, 2026)

Online orders are in: sign-in by email link, Send uploads, **My orders** (`site/orders.html`, the Orders tab) with the
follow-up, the online review and the final files. Setup, rules and tests: **docs/BACKEND.md**. With no
`backend.config.json` (local mode) everything below "Offline" still holds: Send makes the zip. `site/backend.js` is a
small fetch client, so nothing loads from a CDN; Supabase is another origin, so the service worker never touches or
caches sign-in, uploads, orders or signed file links.

Still to come from the plan below: Background Sync for an order sent offline (today: the zip), push notifications.

## When there's a real backend (the plan, Nov 5, 2026)

Only Send and the review page change:

- **Send** uploads the order (order.json plus the files) to the backend over https, with a progress bar, instead of
  making a zip to email. Keep the zip as the fallback for offline (save it and send when back online, using Background
  Sync where it's supported).
- **Review** loads the preview straight from the order, and "Request changes" / "I agree" post to the backend instead
  of downloading a JSON file to email.
- **Sign in** (email link) so a teacher sees her orders, previews and final files in the app; push notifications when
  a preview is ready.
- The service worker must **never cache** upload requests or anything private. Keep it to GET requests for the shell
  and public data, as it is now. `POST` requests are already skipped.
- The delete notice becomes something the backend enforces: delete uploads and working copies after delivery.
