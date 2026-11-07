#!/usr/bin/env node
// Unit tests for "Paste a link" (scripts/fetch-page.mjs, scripts/html-text.mjs): the address guard (a table of allowed
// and blocked addresses, a stubbed DNS), redirects, size, time and type limits against a local test server, the
// per-teacher limit, the handler's sign-in check, and the text extraction (linear time on hostile pages).
// Fast (a few seconds), so npm run check runs it.   node scripts/test-fetch-page.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { checkUrl, isBlockedIP, fetchPage, makeRateLimit, createHandler, PageError, USER_AGENT } from './fetch-page.mjs';
import { htmlToText, pageToText } from './html-text.mjs';

let passed = 0;
const ok = (m) => { passed++; if (process.env.VERBOSE) console.log('✓ ' + m); };
const code = async (p) => { try { await p; return 'ok'; } catch (e) { return e instanceof PageError ? e.code : 'THREW ' + e; } };
const codeSync = (f) => { try { f(); return 'ok'; } catch (e) { return e instanceof PageError ? e.code : 'THREW ' + e; } };

// ---------- 1. the address table (no network) ----------
const ALLOWED = ['https://en.wikipedia.org/wiki/Water_cycle', 'http://www.nps.gov:80/yell/index.htm', 'https://www.nps.gov:443/a',
  'en.wikipedia.org/wiki/Photosynthesis', 'https://8.8.8.8/', 'https://[2606:4700:4700::1111]/', 'https://172.32.0.1/', 'https://100.128.0.1/',
  'https://192.169.0.1/', 'https://xn--bcher-kva.example.com/'];
const BLOCKED = {
  blocked: ['http://127.0.0.1/', 'http://127.1', 'http://127.0.1', 'http://0x7f000001/', 'http://0x7f.0x0.0x0.0x1/', 'http://2130706433/',
    'http://017700000001/', 'http://0177.0.0.1/', 'http://0.0.0.0/', 'http://0/', 'http://[::1]/', 'http://[::]/', 'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:7f00:1]/', 'http://[::ffff:169.254.169.254]/', 'http://[0:0:0:0:0:ffff:a00:1]/', 'http://[::127.0.0.1]/',
    'http://169.254.169.254/latest/meta-data/', 'http://[fd00::1]/', 'http://[fc00::1]/', 'http://[fe80::1]/', 'http://[fec0::1]/',
    'http://[ff02::1]/', 'http://[64:ff9b::7f00:1]/', 'http://[2002:7f00:1::]/', 'http://[2001::1]/', 'http://[2001:db8::1]/', 'http://[100::1]/',
    'http://100.64.0.1/', 'http://100.127.255.255/', 'http://10.0.0.1/', 'http://172.16.0.1/', 'http://172.31.255.255/',
    'http://192.168.1.1/', 'http://192.0.0.8/', 'http://198.18.0.1/', 'http://224.0.0.1/', 'http://239.255.255.250/',
    'http://255.255.255.255/', 'http://240.0.0.1/', 'http://localhost/', 'http://LOCALHOST./', 'http://foo.localhost/',
    'http://metadata.google.internal/', 'http://intranet/', 'http://printer.local/', 'http://router.home.arpa/', 'http://x.onion/'],
  scheme: ['file:///etc/passwd', 'ftp://ftp.example.org/', 'gopher://example.org/', 'javascript:alert(1)', 'data:text/html,hi', 'ws://example.org/'],
  creds: ['https://user:pw@en.wikipedia.org/', 'https://user@en.wikipedia.org/'],
  port: ['https://en.wikipedia.org:8080/', 'http://en.wikipedia.org:22/', 'http://en.wikipedia.org:6379/'],
  badUrl: ['', 'not a url', 'https://', 'https://a b.org/', 'https://en.wikipedia.org/' + 'x'.repeat(2100), 'https://en.wikipedia.org\\@127.0.0.1/'],
};
for (const u of ALLOWED) assert.equal(codeSync(() => checkUrl(u)), 'ok', u);
for (const [want, list] of Object.entries(BLOCKED)) for (const u of list) assert.equal(codeSync(() => checkUrl(u)), want, u);
ok(`address table: ${ALLOWED.length} allowed, ${Object.values(BLOCKED).flat().length} refused`);
for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '::1', '::ffff:10.0.0.1', 'fe80::1%eth0', 'nonsense', '']) assert.ok(isBlockedIP(ip), ip);
for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4001:80b::200e']) assert.ok(!isBlockedIP(ip), ip);
ok('isBlockedIP on raw resolver answers (with a zone id, IPv4-mapped)');

// ---------- 2. DNS: every answer must be public (stubbed resolver, no network) ----------
const stub = (map) => async (h) => { if (!(h in map)) { const e = new Error('nx'); e.code = 'ENOTFOUND'; throw e; } return map[h].map((a) => ({ address: a, family: a.includes(':') ? 6 : 4 })); };
const resolver = stub({ 'evil.example.com': ['10.0.0.5'], 'mixed.example.com': ['93.184.215.14', '127.0.0.1'], 'meta.example.com': ['169.254.169.254'],
  'v6.example.com': ['::ffff:192.168.0.1'], 'ula.example.com': ['fd12:3456::1'] });
for (const h of ['evil', 'mixed', 'meta', 'v6', 'ula']) assert.equal(await code(fetchPage(`https://${h}.example.com/`, { resolver, log: () => {} })), 'blocked', h);
assert.equal(await code(fetchPage('https://nowhere.example.com/', { resolver, log: () => {} })), 'dns');
ok('a name that resolves to a private, loopback, metadata or mapped address (even one of several) is refused; no answer → "couldn\'t find"');

// ---------- 3. a local test server (the tests' only way past the private-address rule is allowAddress) ----------
const ARTICLE = `<!doctype html><html><head><title>The Water Cycle &amp; You</title><script>window.evil=1</script><style>p{}</style></head>
<body><nav>Home | News | Sports | Weather</nav><header><p>Site banner</p></header><main><article><h1>The water cycle</h1>
${'<p>Water evaporates from the ocean, rises as vapor, cools into clouds and falls as rain or snow. </p>'.repeat(30)}
<form><button>Subscribe</button></form></article><aside>Related stories: celebrity news</aside></main><footer>© Somebody, all rights reserved</footer>
<meta http-equiv="refresh" content="0; url=http://169.254.169.254/"></body></html>`;
let seenUA = '';
const srv = createServer((req, res) => {
  seenUA = req.headers['user-agent'] || '';
  const u = new URL(req.url, 'http://x'), p = u.pathname;
  const hop = (to) => { res.writeHead(302, { Location: to }); res.end(); };
  if (p === '/article') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(ARTICLE); }
  if (p === '/latin1') { res.writeHead(200, { 'Content-Type': 'text/html; charset=iso-8859-1' }); return res.end(Buffer.from('<title>Caf\xe9</title><p>' + 'Le caf\xe9 est tr\xe8s bon aujourd\'hui. '.repeat(10) + '</p>', 'latin1')); }
  if (p === '/plain') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('Notes on fractions. '.repeat(20)); }
  if (p === '/gz') { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' }); return res.end(gzipSync(ARTICLE)); }
  if (p === '/bomb') { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' }); return res.end(gzipSync(Buffer.alloc(8 * 1024 * 1024, 0x61))); }
  if (p === '/big') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(Buffer.alloc(3 * 1024 * 1024 + 10, 0x61)); }
  if (p === '/big-chunked') { res.writeHead(200, { 'Content-Type': 'text/html' }); let n = 0; const w = () => { while (n < 40 && res.write(Buffer.alloc(100 * 1024, 0x62))) n++; if (n >= 40) res.end(); else res.once('drain', w); }; return w(); }
  if (p === '/slow') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.write('<p>start'); return setTimeout(() => res.end('</p>'), 3000); }
  if (p === '/pdf') { res.writeHead(200, { 'Content-Type': 'application/pdf' }); return res.end('%PDF-1.4'); }
  if (p === '/png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end('x'); }
  if (p === '/json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{}'); }
  if (p === '/paywall') { res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end('<p>Subscribe to read</p>'); }
  if (p === '/gone') { res.writeHead(404); return res.end(); }
  if (p === '/endless-403') { res.writeHead(403, { 'Content-Type': 'text/html' }); const iv = setInterval(() => { if (!res.write('x'.repeat(65536))) {} }, 1); res.on('close', () => clearInterval(iv)); return; }
  if (p === '/oops') { res.writeHead(500); return res.end(); }
  if (p === '/empty') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<div id="app"></div><script src="app.js"></script>'); }
  if (p === '/r1') return hop('/r2');
  if (p === '/r2') return hop('/article');
  if (p === '/loop') return hop('/loop');
  if (p === '/to-meta') return hop('http://169.254.169.254/latest/meta-data/');
  if (p === '/to-private') return hop('http://10.0.0.1/');
  if (p === '/to-other-port') return hop(`http://127.0.0.1:${PORT + 1}/`);
  if (p === '/to-file') return hop('file:///etc/passwd');
  if (p === '/to-name') return hop('http://evil.example.com/');
  res.writeHead(404); res.end();
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const PORT = srv.address().port, BASE = `http://127.0.0.1:${PORT}`;
const allowAddress = (h, p) => h === '127.0.0.1' && p === String(PORT);
const logs = [];
const get = (path, extra = {}) => fetchPage(BASE + path, { allowAddress, resolver, log: (m) => logs.push(m), ...extra });

try {
  const a = await get('/article');
  assert.deepEqual(Object.keys(a).sort(), ['finalUrl', 'site', 'text', 'title', 'url', 'words']);
  assert.equal(a.title, 'The Water Cycle & You');
  assert.match(a.text, /^The water cycle\nWater evaporates/);
  assert.ok(!/Home \| News|celebrity|all rights reserved|Subscribe|Site banner|window\.evil|<|>/.test(a.text), 'only the article text, no tags');
  assert.equal(a.words, 3 + 30 * 17);
  assert.match(seenUA, /link reader/); assert.ok(!/@/.test(seenUA), 'no email in the user agent');
  assert.ok(logs.every((l) => Object.keys(JSON.parse(l).fetchPage).join() === 'host,status,bytes'), 'logs only host, status and size');
  ok('a page: title, article text only (nav, header, aside, form, footer, scripts dropped), word count; meta refresh not followed; logs host/status/size');

  assert.equal((await get('/gz')).words, a.words);
  assert.match((await get('/latin1')).text, /Le café est très bon/);
  assert.equal((await get('/plain')).words, 60);
  const r = await get('/r1'); assert.equal(r.finalUrl, BASE + '/article'); assert.equal(r.url, BASE + '/r1');
  ok('gzip, a declared charset, text/plain, and 2 redirects (finalUrl reported)');

  const cases = { '/loop': 'redirects', '/to-meta': 'blocked', '/to-private': 'blocked', '/to-other-port': 'port', '/to-file': 'scheme',
    '/to-name': 'blocked', '/pdf': 'notPage', '/png': 'notPage', '/json': 'notText', '/paywall': 'denied', '/endless-403': 'denied', '/gone': 'missing',
    '/oops': 'upstream', '/empty': 'empty', '/big': 'tooBig', '/big-chunked': 'tooBig', '/bomb': 'tooBig' };
  for (const [p, want] of Object.entries(cases)) assert.equal(await code(get(p)), want, p);
  ok('refused: a redirect loop (max 3), redirects to metadata / a private IP / another port / file: / a name resolving private; PDF, image, JSON; 403 paywall, 404, 500; a script-only page; over 3 MB (declared, streamed, or a gzip bomb)');

  const t0 = Date.now();
  assert.equal(await code(get('/slow', { timeoutMs: 400 })), 'timeout');
  assert.ok(Date.now() - t0 < 1500, 'the time limit stops a slow page');
  const t1 = Date.now();
  assert.equal(await code(fetchPage('https://hang.example.com/', { resolver: () => new Promise(() => {}), timeoutMs: 300, log: () => {} })), 'timeout');
  assert.ok(Date.now() - t1 < 1500, 'the time limit stops a DNS lookup that never answers');
  ok('a slow page and a DNS lookup that never answers stop at the time limit');
  assert.ok(new PageError('denied').message.includes("didn't let us read it") && new PageError('notPage').message.includes('Download the file and upload it instead'));

  // ---------- 4. the handler: sign-in, method, rate limit ----------
  const users = { 'good-token-aaaaaaaaaaaaaaaa': { id: 'teacher-1' } };
  const fakeAuth = async (url, init) => { const t = init.headers.Authorization.slice(7); assert.ok(url.endsWith('/auth/v1/user') && init.headers.apikey === 'anon');
    return users[t] ? new Response(JSON.stringify(users[t]), { status: 200 }) : new Response('{}', { status: 401 }); };
  const h = createHandler({ config: () => ({ supabaseUrl: 'https://proj.supabase.co', supabaseAnonKey: 'anon' }), fetchImpl: fakeAuth, allowAddress, resolver, log: () => {},
    rateLimit: makeRateLimit(2) });
  const hs = createServer(h); await new Promise((r2) => hs.listen(0, '127.0.0.1', r2));
  const HB = `http://127.0.0.1:${hs.address().port}/`;
  const call = (token, body, method = 'POST', type = 'application/json') => fetch(HB, { method, headers: { 'Content-Type': type, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined })
    .then(async (x) => ({ status: x.status, body: await x.json() }));
  assert.equal((await call(null, { url: BASE + '/article' })).status, 401);
  assert.equal((await call('bad-token-bbbbbbbbbbbbbbbbbbbb', { url: BASE + '/article' })).status, 401);
  assert.equal((await call('good-token-aaaaaaaaaaaaaaaa', {}, 'GET')).status, 405);
  assert.equal((await call('good-token-aaaaaaaaaaaaaaaa', { url: BASE + '/article' }, 'POST', 'text/plain')).status, 415);
  const g1 = await call('good-token-aaaaaaaaaaaaaaaa', { url: BASE + '/article' });
  assert.equal(g1.status, 200); assert.equal(g1.body.title, 'The Water Cycle & You'); assert.ok(!('html' in g1.body));
  const g2 = await call('good-token-aaaaaaaaaaaaaaaa', { url: 'http://169.254.169.254/' });
  assert.equal(g2.status, 422); assert.equal(g2.body.error, 'blocked');
  assert.equal((await call('good-token-aaaaaaaaaaaaaaaa', { url: BASE + '/article' })).status, 429);
  hs.close();
  const noCfg = createHandler({ config: () => null });
  const hs2 = createServer(noCfg); await new Promise((r2) => hs2.listen(0, '127.0.0.1', r2));
  assert.equal((await fetch(`http://127.0.0.1:${hs2.address().port}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 503);
  hs2.close();
  ok('handler: no or bad token → 401 (checked with Supabase /auth/v1/user and the anon key), GET → 405, not JSON → 415, no backend → 503, a blocked URL → 422 with the friendly message, over the limit → 429; never HTML');

  let now = 0; const lim = makeRateLimit(30, () => now);
  for (let i = 0; i < 30; i++) assert.ok(lim('t'));
  assert.ok(!lim('t')); assert.ok(lim('other'));
  now = 3600e3 + 1; assert.ok(lim('t'));
  ok('rate limit: 30 an hour per teacher, others unaffected, back after an hour');
} finally { srv.close(); }

// ---------- 5. extraction: linear time on hostile pages, never throws ----------
for (const s of ['<script'.repeat(500000), '<a'.repeat(1500000), '<!--'.repeat(750000), '<nav>'.repeat(600000), '<article><main>'.repeat(200000), '<title>'.repeat(400000), '&#1'.repeat(1000000)]) {
  const t = Date.now(); htmlToText(s); pageToText(s);
  assert.ok(Date.now() - t < 3000, 'linear time on ' + s.slice(0, 10) + ` (${Date.now() - t} ms)`);
}
assert.equal(htmlToText('<p>a &#99999999; &#xD800; b</p>'), 'a b\n');
assert.equal(htmlToText('<head><title>x</title></head><body><p>Hello <b>you</b></p><p>there</p>'), 'Hello you\nthere\n');
assert.equal(htmlToText('<head><title>No close<p>Body text'), 'Body text\n'.replace('Body', 'No close Body'));
ok('extraction: 3 MB of hostile markup in linear time; bad character codes don\'t throw; an unclosed <head> keeps the body');
assert.ok(USER_AGENT.length > 10);

console.log(`fetch-page: all ${passed} checks pass`);
