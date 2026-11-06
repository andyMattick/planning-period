#!/usr/bin/env node
// End-to-end test of online orders (docs/BACKEND.md), with a fake Supabase (scripts/test-orders/fake-supabase.mjs)
// and Playwright: the order page signed out (local mode: Send makes a zip) and signed in (Send uploads), My orders in
// every status, the follow-up answered with one tap, the online review (request changes, then approve), and the
// owner's scripts/orders.mjs in between. The approval the browser makes must satisfy the real render-pack.mjs --final.
// Phone (iPhone 13) and desktop (1280 px), light and dark; no page may scroll sideways.
//   node scripts/test-orders.mjs [--shots <folder>]        (screenshots; default: a temporary folder)
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { startFake, ANON, SERVICE } from './test-orders/fake-supabase.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require('playwright'); } catch {}
  const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  return createRequire(join(g, 'noop.js'))('playwright');
}
const { chromium, devices } = loadPlaywright();
const si = process.argv.indexOf('--shots');
const SHOTS = si > 0 ? resolve(process.argv[si + 1]) : mkdtempSync(join(tmpdir(), 'pp-orders-shots-'));
mkdirSync(SHOTS, { recursive: true });
const TMP = mkdtempSync(join(tmpdir(), 'pp-orders-test-'));
const WORK_ROOT = join(TMP, 'pp-work');
let passed = 0;
const ok = (m) => { passed++; console.log(`✓ ${m}`); };

// ---------- servers ----------
const fake = await startFake();
function serve(port, extraEnv) {
  const p = spawn(process.execPath, [join(ROOT, 'scripts/serve.mjs')], { env: { ...process.env, PORT: String(port), PP_SUPABASE_URL: '', PP_SUPABASE_ANON_KEY: '', ...extraEnv }, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((res) => p.stdout.on('data', (d) => { if (/Serving/.test(String(d))) res(p); }));
}
const LOCAL_PORT = 4398, ONLINE_PORT = 4399;
const servers = [await serve(LOCAL_PORT, {}), await serve(ONLINE_PORT, { PP_SUPABASE_URL: fake.url, PP_SUPABASE_ANON_KEY: ANON })];
const LOCAL = `http://localhost:${LOCAL_PORT}/site/`, ONLINE = `http://localhost:${ONLINE_PORT}/site/`;

// Async on purpose: the fake Supabase runs in this process, so a blocking spawnSync would starve it.
function owner(...args) {
  return new Promise((res, rej) => {
    const p = spawn(process.execPath, [join(ROOT, 'scripts/orders.mjs'), ...args], {
      env: { ...process.env, PP_SUPABASE_URL: fake.url, PP_SUPABASE_SERVICE_KEY: SERVICE, PP_WORK_ROOT: WORK_ROOT } });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => code === 0 ? res(out) : rej(new Error(`orders.mjs ${args.join(' ')} failed (${code}):\n${out}${err}`)));
  });
}
const state = async () => (await fetch(`${fake.url}/__test/state`)).json();
const svc = (method, path, body) => fetch(fake.url + path, { method, headers: { apikey: SERVICE, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });

// ---------- fixtures ----------
const FIX = join(TMP, 'files'); mkdirSync(FIX);
writeFileSync(join(FIX, 'water-cycle.html'), `<!doctype html><html><head><title>The water cycle</title><script>window.evil = 1; document.title = 'ran'</script>
<style>p{color:red}</style></head><body><nav>Home | News | Sports</nav><article><h1>The water cycle</h1>${'<p>Water evaporates from the ocean, rises as vapor, cools into clouds and falls as rain or snow. '.repeat(40)}</p></article></body></html>`);
writeFileSync(join(FIX, 'my old quiz.txt'), 'Quiz 3. 1) Name the four stages of the water cycle. 2) What makes vapor cool?\n'.repeat(5));
const PDF_SRC = join(ROOT, 'samples/_fixture/out-preview/ratios-quiz-student-A.pdf');
if (existsSync(PDF_SRC)) cpSync(PDF_SRC, join(FIX, 'chapter 4 (ratios).pdf'));

const browser = await chromium.launch();
const PHONE = { ...devices['iPhone 13'] }, DESK = { viewport: { width: 1280, height: 900 } };
async function ctx(kind, scheme = 'light') {
  const c = await browser.newContext({ ...(kind === 'phone' ? PHONE : DESK), colorScheme: scheme, serviceWorkers: 'block', acceptDownloads: true });
  c.setDefaultTimeout(15000);
  return c;
}
async function noSideways(page, what) {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(sw <= w + 1, `${what}: the page scrolls sideways (${sw} > ${w})`);
}
async function shot(page, name) { await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: true }); }

// Fill the order with real controls on the desktop page (the phone wizard is filled the same way after its steps show).
async function fillOrder(page, files) {
  await page.waitForSelector('#items .card', { state: 'attached' });
  await page.setInputFiles('#f-sources', files.sources);
  if (files.training) await page.setInputFiles('#f-training', files.training);
  await page.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set('grade', '5'); set('subject', 'science'); set('topic', 'The water cycle'); set('teacher', 'Ms. Ortiz (made-up)');
    const box = document.querySelector('#items [data-item="quiz"] input[type=checkbox]'); box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => /about \d+ page/.test(document.querySelector('#list-sources .fpages')?.textContent || ''));
}

try {
  // ===== 1. local mode: no backend config, Send makes a zip =====
  for (const kind of ['phone', 'desktop']) {
    const c = await ctx(kind), page = await c.newPage();
    await page.goto(LOCAL);
    await fillOrder(page, { sources: [join(FIX, 'water-cycle.html')] });
    assert.equal(await page.isVisible('#account'), false, 'no sign-in box in local mode');
    const pages = await page.textContent('#list-sources .fpages');
    assert.match(pages, /about \d+ page/, 'the web page is counted');
    assert.equal(await page.evaluate(() => window.evil), undefined, 'the uploaded web page never ran');
    await noSideways(page, `order page (local, ${kind})`);
    if (kind === 'phone') { await page.evaluate(() => window.PPShowStep(1)); await shot(page, 'local-phone-sources-html'); await page.evaluate(() => window.PPShowStep(4)); }
    const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('order').requestSubmit())]);
    assert.match(dl.suggestedFilename(), /^order-\d{4}-\d{2}-\d{2}-[0-9a-f]{6}\.zip$/);
    await page.waitForSelector('#done:not([hidden])');
    await shot(page, `local-${kind}-done-zip`);
    await c.close();
  }
  ok('local mode: the web page is counted as text (scripts never run), no sign-in box, Send downloads the order zip (phone and desktop)');

  // ===== 2. sign in and send online =====
  const c = await ctx('desktop'), page = await c.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(ONLINE);
  await page.waitForSelector('#account:not([hidden])');
  await shot(page, 'online-desktop-signed-out');
  await page.fill('#signin-email', 'ortiz@example.org');
  await page.click('#signin-btn');
  await page.waitForSelector('#signin-sent:not(:empty)');
  const { link } = await (await fetch(`${fake.url}/__test/magic-link?email=ortiz@example.org`)).json();
  assert.ok(link.startsWith(ONLINE), 'the link comes back to the order page');
  await page.goto(link);
  await page.waitForSelector('#acct-in:not([hidden])');
  assert.equal(await page.textContent('#acct-email'), 'ortiz@example.org');
  assert.ok(!page.url().includes('access_token'), 'the token is cleared from the address bar');
  assert.match(await page.textContent('#send-note'), /uploads your files/);
  ok('sign-in: email link → back on the order page signed in, the token taken out of the address bar');

  const sources = [join(FIX, 'water-cycle.html'), ...(existsSync(join(FIX, 'chapter 4 (ratios).pdf')) ? [join(FIX, 'chapter 4 (ratios).pdf')] : [])];
  await fillOrder(page, { sources, training: [join(FIX, 'my old quiz.txt')] });
  assert.equal(await page.inputValue('#reply'), 'ortiz@example.org', 'her email is filled in from the account');
  await page.click('#send');
  await page.waitForSelector('#done-online:not([hidden])');
  await shot(page, 'online-desktop-sent');
  const orderId = await page.textContent('#online-id');
  let st = await state();
  let o = st.orders.find((x) => x.id === orderId);
  assert.equal(o.status, 'sent');
  assert.equal(o.upload_files.length, sources.length + 1);
  assert.ok(o.upload_files.every((p) => p.startsWith(`${o.teacher}/${orderId}/`) && st.objects.includes('uploads/' + p)), 'files are in uploads/<teacher>/<order>/');
  assert.deepEqual(o.order_json.order.sources, sources.map((s) => s.split('/').pop().replace(/[^A-Za-z0-9._ ()-]+/g, '_')));
  assert.equal(o.order_json.delivery, 'online');
  ok(`Send uploaded ${o.upload_files.length} files to uploads/<teacher>/${orderId}/ and added the order (status sent); no zip`);

  // ===== 3. My orders, and the owner's pull =====
  await page.goto(ONLINE + 'orders.html?order=' + orderId);
  await page.waitForSelector(`#o-${orderId}`);
  assert.match(await page.textContent(`#o-${orderId} .status-chip`), /Sent/);
  await owner('list');
  const pullOut = await owner('pull', orderId);
  const WORK = join(WORK_ROOT, orderId);
  assert.ok(existsSync(join(WORK, 'in/order.json')) && existsSync(join(WORK, 'in/sources/water-cycle.html')) && existsSync(join(WORK, 'in/training/my old quiz.txt')), pullOut);
  assert.equal((await state()).orders.find((x) => x.id === orderId).status, 'onboarding');
  const txt = execFileSync(process.execPath, [join(ROOT, 'scripts/html-text.mjs'), join(WORK, 'in/sources/water-cycle.html')], { encoding: 'utf8' });
  assert.ok(/The water cycle/.test(txt) && !/window\.evil|color:red/.test(txt), 'html-text keeps the text and drops scripts and styles');
  ok('orders.mjs list and pull: order.json, sources/ and training/ in ~/pp-work/<id>/in; status onboarding; html-text.mjs reads the web page as text');

  // ===== 4. the follow-up, answered with one tap =====
  writeFileSync(join(WORK, 'FOLLOW-UP.md'), 'Thanks for your order! We will make **one quiz** on the water cycle: 10 questions, A and B versions.\n\nYour web page covers 4 stages, so 10 questions fit well.');
  writeFileSync(join(WORK, 'onboarding.json'), JSON.stringify({ questions: [
    { id: 'q1', ask: 'How many answer choices?', options: ['A 3 choices', 'B 4 choices'], recommended: 'B', why: 'Most grade 5 quizzes use 4.' },
    { id: 'q2', ask: 'Add a short written question at the end?', options: ['A yes', 'B no'], recommended: 'A' }] }));
  await owner('follow-up', orderId, join(WORK, 'FOLLOW-UP.md'));
  for (const [kind, scheme] of [['phone', 'light'], ['phone', 'dark'], ['desktop', 'light']]) {
    const c2 = await ctx(kind, scheme), p2 = await c2.newPage();
    await p2.goto(ONLINE + 'orders.html');
    await p2.evaluate((s) => localStorage.setItem('pp-session', s), await page.evaluate(() => localStorage.getItem('pp-session')));
    await p2.goto(ONLINE + 'orders.html?order=' + orderId);
    await p2.waitForSelector(`#o-${orderId} .fu-q`);
    await noSideways(p2, `My orders, needs answer (${kind} ${scheme})`);
    await shot(p2, `orders-${kind}-${scheme}-needs-answer`);
    await c2.close();
  }
  await page.reload();
  await page.waitForSelector(`#o-${orderId} .fu-q`);
  assert.ok(await page.isChecked(`input[name="${orderId}:q1"][value="B"]`), 'our pick is chosen to start');
  await page.check(`input[name="${orderId}:q1"][value="A"]`);
  await page.fill(`[data-extra="${orderId}"]`, 'Use local rivers in the stories.');
  await page.click(`[data-send-answer="${orderId}"]`);
  await page.waitForFunction((id) => /Being made/.test(document.querySelector('#o-' + id + ' .status-chip')?.textContent || ''), orderId);
  o = (await state()).orders.find((x) => x.id === orderId);
  assert.equal(o.answer, '1 A, 2 A · Use local rivers in the stories.');
  assert.deepEqual(o.answers, { q1: 'A', q2: 'A' });
  await owner('answer', orderId);
  assert.match(readFileSync(join(WORK, 'followup-answer.md'), 'utf8'), /1 A, 2 A/);
  ok('follow-up: questions with one-tap options (our pick pre-chosen); her answer saved, status building; orders.mjs answer writes followup-answer.md');

  // ===== 5. preview → request changes → new preview → approve =====
  const pack = JSON.parse(readFileSync(join(ROOT, 'samples/_fixture/pack.json'), 'utf8'));
  pack.id = orderId;
  writeFileSync(join(WORK, 'pack.json'), JSON.stringify(pack, null, 2));
  const render = (mode) => spawnSync(process.execPath, [join(ROOT, 'scripts/render-pack.mjs'), WORK, mode], { encoding: 'utf8', timeout: 600000 });
  let r = render('--preview');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  await owner('preview', orderId);
  o = (await state()).orders.find((x) => x.id === orderId);
  assert.equal(o.status, 'preview_ready');
  await page.reload();
  await page.waitForSelector(`[data-approve="${orderId}"]`);
  assert.ok(await page.isDisabled(`[data-approve="${orderId}"]`) && await page.isDisabled(`[data-changes="${orderId}"]`));
  const href = await page.getAttribute(`#o-${orderId} .dl-list a`, 'href');
  assert.match(href, /\/storage\/v1\/object\/sign\/deliverables\/.+token=/, 'preview files open through signed links');
  assert.equal((await fetch(href)).status, 200);
  for (const [kind, scheme] of [['phone', 'light'], ['phone', 'dark'], ['desktop', 'dark']]) {
    const c2 = await ctx(kind, scheme), p2 = await c2.newPage();
    await p2.goto(ONLINE + 'orders.html');
    await p2.evaluate((s) => localStorage.setItem('pp-session', s), await page.evaluate(() => localStorage.getItem('pp-session')));
    await p2.goto(ONLINE + 'orders.html?order=' + orderId);
    await p2.waitForSelector(`[data-approve="${orderId}"]`);
    await noSideways(p2, `My orders, review (${kind} ${scheme})`);
    await shot(p2, `orders-${kind}-${scheme}-review`);
    await c2.close();
  }
  await page.fill(`#o-${orderId} textarea[data-comment]`, 'Question 4: say "kilometres", not "miles".');
  await page.fill(`[data-who="${orderId}"]`, 'Ms. Ortiz');
  assert.ok(await page.isDisabled(`[data-approve="${orderId}"]`), 'approve stays off while there are comments');
  await page.click(`[data-changes="${orderId}"]`);
  await page.waitForFunction((id) => /Making your changes/.test(document.querySelector('#o-' + id + ' .status-chip')?.textContent || ''), orderId);
  await shot(page, 'orders-desktop-changes-requested');
  await owner('approval', orderId);
  const comments = JSON.parse(readFileSync(join(WORK, `comments-${orderId}.json`), 'utf8'));
  assert.equal(comments.orderId, orderId); assert.equal(comments.comments[0].comment, 'Question 4: say "kilometres", not "miles".');
  assert.equal(comments.checklist.length, 4);
  ok('review: signed links to the preview PDFs; Request changes saved her comments (status changes_requested); orders.mjs approval wrote comments-<id>.json');

  await owner('preview', orderId);   // the "new preview" after a maker round (same pack here)
  await page.reload();
  await page.waitForSelector(`[data-approve="${orderId}"]`);
  // a file that differs from the one the preview was made with is refused in the browser
  const one = o.review.documents[0].file, key = `${o.teacher}/${orderId}/preview/${one}`;
  const good = readFileSync(join(WORK, 'out-preview', one));
  await fetch(`${fake.url}/storage/v1/object/deliverables/${key.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { apikey: SERVICE, 'x-upsert': 'true', 'Content-Type': 'application/pdf' }, body: Buffer.concat([good, Buffer.from('tampered')]) });
  for (const k of ['answers', 'level', 'content', 'noChanges']) await page.check(`#o-${orderId} [data-key="${k}"]`);
  await page.fill(`[data-who="${orderId}"]`, 'Ms. Ortiz');
  await page.click(`[data-approve="${orderId}"]`);
  await page.waitForSelector(`#o-${orderId} [data-err]:not(:empty)`);
  assert.match(await page.textContent(`#o-${orderId} [data-err]`), /not the file the preview was made with/);
  assert.equal((await state()).orders.find((x) => x.id === orderId).status, 'preview_ready');
  await fetch(`${fake.url}/storage/v1/object/deliverables/${key.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { apikey: SERVICE, 'x-upsert': 'true', 'Content-Type': 'application/pdf' }, body: good });
  ok('approve refuses a preview file whose bytes differ from the preview (SHA-256 in the browser)');

  await page.click(`[data-approve="${orderId}"]`);
  await page.waitForFunction((id) => /Approved/.test(document.querySelector('#o-' + id + ' .status-chip')?.textContent || ''), orderId);
  await owner('approval', orderId);
  const approval = JSON.parse(readFileSync(join(WORK, 'approval.json'), 'utf8'));
  assert.deepEqual(Object.keys(approval).sort(), ['date', 'documents', 'name', 'orderId', 'packHash', 'statement']);
  r = render('--final');
  assert.equal(r.status, 0, 'render-pack.mjs --final accepts the browser\'s approval:\n' + r.stdout + r.stderr);
  ok(`approve: the browser hashed ${approval.documents.length} preview PDFs; render-pack.mjs --final accepts the approval it wrote`);

  // a changed pack is still refused by the renderer (the approval is tied to the pack she saw)
  const changed = { ...pack, documents: pack.documents.map((d, i) => (i ? d : { ...d, title: d.title + ' (changed)' })) };
  cpSync(join(WORK, 'pack.json'), join(TMP, 'pack.keep.json'));
  writeFileSync(join(WORK, 'pack.json'), JSON.stringify(changed));
  assert.equal(render('--final').status, 1, 'a changed pack is refused');
  cpSync(join(TMP, 'pack.keep.json'), join(WORK, 'pack.json'));
  assert.equal(render('--final').status, 0);
  ok('render-pack.mjs --final still refuses when the pack changed after her approval');

  // ===== 6. final files =====
  await owner('final', orderId);
  await page.reload();
  await page.waitForSelector(`#o-${orderId}.s-final_ready a.btn.primary[href*="token="]`);
  const zipHref = await page.getAttribute(`#o-${orderId} a.btn.primary`, 'href');
  const zipRes = await fetch(zipHref);
  assert.equal(zipRes.status, 200);
  assert.equal(Buffer.from(await zipRes.arrayBuffer()).subarray(0, 2).toString(), 'PK');
  await shot(page, 'orders-desktop-final-ready');
  ok('final: orders.mjs final uploaded out/ and out.zip (status final_ready); My orders links the zip and each file');

  // ===== 7. My orders in every status (phone and desktop, light and dark) =====
  const teacher = o.teacher, mk = async (status, extra = {}) => {
    const id = 'pp-2026-11-0' + (1 + Object.keys(made).length) + '-' + status.replace(/_/g, '').slice(0, 6).padEnd(6, 'x');
    made[status] = id;
    await svc('POST', '/rest/v1/orders', { id, teacher, status: 'sent', order_json: { id, order: { grade: '7', subject: 'ela', topic: 'Status: ' + status, items: ['worksheet'], quantities: { worksheet: 1 } } }, token_total: 30, upload_files: [] });
    if (status !== 'sent') await svc('PATCH', `/rest/v1/orders?id=eq.${id}`, { status, ...extra });
  };
  const made = {};
  await mk('sent'); await mk('onboarding'); await mk('building'); await mk('approved'); await mk('cancelled');
  await mk('failed', { note: 'Your scan was too blurry to read. We emailed you about a clearer copy.' });
  for (const [kind, scheme] of [['phone', 'light'], ['phone', 'dark'], ['desktop', 'light'], ['desktop', 'dark']]) {
    const c2 = await ctx(kind, scheme), p2 = await c2.newPage();
    p2.on('dialog', (d) => d.accept());
    await p2.goto(ONLINE + 'orders.html');
    await p2.evaluate((s) => localStorage.setItem('pp-session', s), await page.evaluate(() => localStorage.getItem('pp-session')));
    await p2.reload();
    await p2.waitForSelector('.order-card.s-failed');
    for (const s of ['sent', 'onboarding', 'building', 'approved', 'cancelled', 'failed', 'final_ready']) assert.ok(await p2.isVisible(`.order-card.s-${s}`), s);
    await noSideways(p2, `My orders, every status (${kind} ${scheme})`);
    await shot(p2, `orders-${kind}-${scheme}-all-statuses`);
    await c2.close();
  }
  ok('My orders shows sent, onboarding, building, approved, cancelled, failed (with the note) and final_ready without sideways scroll');

  await page.reload();
  await page.waitForSelector(`[data-cancel="${made.building}"]`);
  await page.click(`[data-cancel="${made.building}"]`);
  await page.waitForFunction((id) => /Cancelled/.test(document.querySelector('#o-' + id + ' .status-chip')?.textContent || ''), made.building);
  ok('Cancel this order → cancelled');

  // ===== 8. another teacher sees nothing; the owner sees everything =====
  {
    const c2 = await ctx('desktop'), p2 = await c2.newPage();
    await p2.goto(ONLINE + 'orders.html');
    await p2.fill('#signin-email', 'other@example.org'); await p2.click('#signin-btn');
    await p2.waitForSelector('#signin-sent:not(:empty)');
    await p2.goto((await (await fetch(`${fake.url}/__test/magic-link?email=other@example.org`)).json()).link);
    await p2.waitForSelector('.empty');
    const signed = await p2.evaluate(async ([u, k]) => {
      const s = JSON.parse(localStorage.getItem('pp-session'));
      const r = await fetch(u + '/storage/v1/object/sign/uploads/' + k, { method: 'POST', headers: { apikey: 'fake-anon-key', Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: '{"expiresIn":60}' });
      return r.status;
    }, [fake.url, o.upload_files[0]]);
    assert.notEqual(signed, 200, "another teacher can't open her uploads");
    await shot(p2, 'orders-desktop-empty');
    await fetch(`${fake.url}/__test/admin?email=owner@example.org`);
    await p2.click('#signout-btn');
    await p2.fill('#signin-email', 'owner@example.org'); await p2.click('#signin-btn');
    await p2.waitForSelector('#signin-sent:not(:empty)');
    await p2.goto((await (await fetch(`${fake.url}/__test/magic-link?email=owner@example.org`)).json()).link);
    await p2.waitForSelector('.list-head .ph');
    assert.ok((await p2.locator('.order-card').count()) >= 7, 'the owner sees every order');
    assert.equal(await p2.locator('[data-approve], [data-send-answer], [data-cancel]').count(), 0, 'the owner sees but does not act for her');
    await c2.close();
  }
  ok("another teacher sees no orders and can't open her files; the owner (admins) sees every order, read-only");

  // ===== 9. retention: purge =====
  await fetch(`${fake.url}/__test/age?id=${orderId}`);
  await owner('purge', '--due', '7');
  st = await state();
  assert.equal(st.objects.filter((k) => k.startsWith(`uploads/${teacher}/${orderId}/`)).length, 0, 'uploads deleted');
  assert.equal(st.objects.filter((k) => k.startsWith(`deliverables/${teacher}/${orderId}/preview/`)).length, 0, 'preview files deleted');
  assert.ok(st.objects.some((k) => k.startsWith(`deliverables/${teacher}/${orderId}/final/`)), 'final files kept for her');
  assert.ok(st.orders.find((x) => x.id === orderId).uploads_purged_at);
  assert.match(await owner('purge', '--due', '7'), /Nothing is due/);
  ok('purge --due: her uploads and the preview files are deleted, the final files kept, uploads_purged_at set');

  await c.close();
  console.log(`\nAll ${passed} order tests pass. Screenshots: ${SHOTS}`);
} catch (e) {
  console.error('\n✗ ' + (e.stack || e));
  process.exitCode = 1;
} finally {
  await browser.close();
  servers.forEach((s) => s.kill());
  fake.close();
  rmSync(TMP, { recursive: true, force: true });
}
