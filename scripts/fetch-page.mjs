// "Paste a link" (docs/BACKEND.md): the server reads one web page for a signed-in teacher and returns its article text
// only. The Vercel function api/fetch-page.js is a thin wrapper around createHandler(); `npm run serve` mounts the same
// handler at /api/fetch-page for local testing.
//
// This fetches addresses a user typed, from our server, so it guards against server-side request forgery:
//   - only http and https, only ports 80 and 443, no user name or password in the address, at most 2048 characters;
//   - the host is resolved here and EVERY address it resolves to must be public: private, loopback, link-local
//     (169.254.169.254 metadata), CGNAT, multicast, reserved, documentation, 6to4/Teredo/NAT64 and IPv4-mapped IPv6 to
//     any of those are refused (isBlockedIP); names like localhost or *.internal are refused before any lookup;
//   - the connection goes to the address that was checked (the socket's lookup is pinned to it, so a second DNS answer
//     can't swap in a private one: no DNS rebinding); TLS still checks the certificate against the host name;
//   - redirects are followed by hand, at most 3, and each new address goes through every check again;
//   - 10 seconds in all, at most 3 MB read (after decompression), only text/html, application/xhtml+xml and text/plain;
//     no cookies sent or kept, no meta refresh or script ever followed (the page is only text to us).
// It returns { url, finalUrl, title, site, text, words } and never the page's HTML. The text is untrusted data.
// It logs only the host, the status and the size. A per-teacher limit (30 an hour) is kept in memory per server
// instance: a cold start or a second instance starts its own count (fine for a pilot; a shared store later).
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import dns from 'node:dns';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { pageToText } from './html-text.mjs';

const require = createRequire(import.meta.url);
const brand = (() => { try { return require('../brand.config.json'); } catch { return {}; } })();

export const LIMITS = { timeoutMs: 10000, maxBytes: 3 * 1024 * 1024, maxRedirects: 3, maxUrl: 2048, perHour: 30, maxTextChars: 1500000, maxTextBytes: 4000000 };
// C0 controls but tab and new line, DEL, C1 controls, and the bidi overrides/isolates (they can disguise a title or file name)
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;
export const USER_AGENT = `${String(brand.shortName || brand.name || 'Teacher packs').replace(/[^\x20-\x7e]/g, '')} link reader (text only; for a teacher's own lesson materials)`;

// Messages the teacher sees (site/order.js shows `message`).
const SAVE = 'Save the page from your browser (File → Save page as) and upload it instead.';
export const MSG = {
  badUrl: 'That doesn\'t look like a web address. Paste the whole address, starting with https://',
  scheme: 'Only web addresses (http:// or https://) work here.',
  creds: 'That address has a user name or password in it. Remove it, or save the page and upload it.',
  port: 'That address uses an unusual port. ' + SAVE,
  blocked: 'We can\'t read that address: it points to a private or local network, not a public web page.',
  dns: 'We couldn\'t find that website. Check the address and try again.',
  timeout: 'That page took too long to load. ' + SAVE,
  tooBig: 'That page is too big to read as a link (over 3 MB). ' + SAVE,
  notPage: 'That link is a file, not a web page. Download the file and upload it instead.',
  notText: 'That link isn\'t a web page we can read as text. Download the file and upload it instead.',
  denied: 'This page didn\'t let us read it (it may need a sign-in or a subscription). Save it from your browser (File → Save page as) and upload it.',
  missing: 'That page wasn\'t found (the site said it doesn\'t exist). Check the address.',
  upstream: 'That website had a problem sending the page. Try again later, or save the page and upload it.',
  redirects: 'That link sends us on to too many other pages. Open it in your browser, then paste the address it ends up at.',
  empty: 'We read that page but found almost no text in it (it may build itself with scripts). ' + SAVE,
  signIn: 'Please sign in again to add links.',
  rate: 'That\'s a lot of links in one hour. Wait a bit, or save the pages and upload them.',
  failed: 'We couldn\'t read that page. ' + SAVE,
};
export class PageError extends Error { constructor(code, status = 422) { super(MSG[code] || MSG.failed); this.code = code; this.status = status; } }

// ---------- addresses ----------
function v4ToInt(ip) { return ip.split('.').reduce((n, p) => n * 256 + Number(p), 0); }
const V4_BLOCKED = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.31.196.0', 24], ['192.52.193.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['192.175.48.0', 24], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([a, bits]) => [v4ToInt(a), bits]);
function v4Blocked(ip) {
  const n = v4ToInt(ip);
  return V4_BLOCKED.some(([base, bits]) => Math.floor(n / 2 ** (32 - bits)) === Math.floor(base / 2 ** (32 - bits)));
}
// IPv6 as 8 numbers (handles ::, an IPv4 tail and a %zone).
function v6Parts(ip) {
  let s = ip.replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  const m = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (m) { const n = v4ToInt(m[1]); s = s.slice(0, -m[1].length) + (Math.floor(n / 65536)).toString(16) + ':' + (n % 65536).toString(16); }
  const [head, tail] = s.includes('::') ? s.split('::') : [s, null];
  const h = head ? head.split(':') : [], t = tail ? tail.split(':') : [];
  const parts = tail === null ? h : [...h, ...Array(8 - h.length - t.length).fill('0'), ...t];
  return parts.map((p) => parseInt(p || '0', 16));
}
function v6Blocked(ip) {
  const p = v6Parts(ip);
  if (p.length !== 8 || p.some((x) => !(x >= 0 && x <= 0xffff))) return true;
  const v4 = (a, b) => `${p[a] >> 8}.${p[a] & 255}.${p[b] >> 8}.${p[b] & 255}`;
  if (p.slice(0, 5).every((x) => x === 0) && (p[5] === 0xffff || p[5] === 0)) {   // ::ffff:a.b.c.d (mapped), ::a.b.c.d (compatible), ::, ::1
    return p[5] === 0 ? true : v4Blocked(v4(6, 7));
  }
  if (p[0] === 0 && p[1] === 0 && p[2] === 0 && p[3] === 0 && p[4] === 0xffff && p[5] === 0) return true;   // ::ffff:0:a.b.c.d (translated)
  if ((p[0] & 0xe000) !== 0x2000) return true;      // only global unicast 2000::/3 (this refuses fc00::/7, fe80::/10, fec0::/10, ff00::/8, 100::/64 …)
  if (p[0] === 0x2001 && p[1] < 0x0200) return true; // 2001::/23 IETF special purpose (Teredo 2001::/32, benchmarking, ORCHID …)
  if (p[0] === 0x2001 && p[1] === 0x0db8) return true; // documentation
  if (p[0] === 0x2002) return true;                  // 6to4 (wraps an IPv4 address)
  if (p[0] === 0x3fff && p[1] < 0x1000) return true; // documentation 3fff::/20
  if (p[0] === 0x0064 && p[1] === 0xff9b) return true; // NAT64 (outside 2000::/3 anyway)
  return false;
}
export function isBlockedIP(ip) {
  const fam = net.isIP(String(ip).replace(/^\[|\]$/g, '').split('%')[0]);
  if (fam === 4) return v4Blocked(ip);
  if (fam === 6) return v6Blocked(ip);
  return true;   // not an address at all
}

const BAD_NAMES = /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp|private|test|invalid|example|onion|arpa|home\.arpa)$/i;

// Checks the address itself (no network): returns the parsed URL or throws a PageError.
export function checkUrl(raw) {
  const s = String(raw || '').trim();
  if (!s || s.length > LIMITS.maxUrl || /[\s\u0000-\u001f\u007f\\]/.test(s)) throw new PageError('badUrl', 400);
  let u;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s); } catch { throw new PageError('badUrl', 400); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new PageError('scheme', 400);
  if (u.username || u.password) throw new PageError('creds', 400);
  if (u.port && u.port !== '80' && u.port !== '443') throw new PageError('port', 400);
  const host = u.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host) throw new PageError('badUrl', 400);
  if (net.isIP(host)) { if (isBlockedIP(host)) throw new PageError('blocked'); }
  else if (!host.includes('.') || BAD_NAMES.test(host) || !/^[a-z0-9.-]+$/i.test(host)) throw new PageError('blocked');
  u.hash = '';
  return u;
}

// Resolves the host and returns one checked address to connect to. Every address the name has must be public.
async function resolveSafe(u, resolver, signal) {
  const host = u.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (net.isIP(host)) return { address: host, family: net.isIP(host) };
  let list;
  // a lookup can't be cancelled, so the time limit races it
  const timedOut = new Promise((_, rej) => { if (signal) signal.addEventListener('abort', () => rej(new PageError('timeout')), { once: true }); });
  timedOut.catch(() => {});   // handled here even when it fires after the lookup won (a later hop's time-out)
  try { list = await Promise.race([resolver(host), timedOut]); } catch (e) { throw e instanceof PageError ? e : new PageError('dns'); }
  if (!list || !list.length) throw new PageError('dns');
  if (list.some((a) => isBlockedIP(a.address))) throw new PageError('blocked');
  return list.find((a) => a.family === 4) || list[0];
}
const defaultResolver = (host) => dns.promises.lookup(host, { all: true, verbatim: true });

// ---------- one request, to a pinned address ----------
function requestOnce(u, addr, { signal, maxBytes }) {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request({
      protocol: u.protocol, hostname: u.hostname.replace(/^\[|\]$/g, ''), port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search, method: 'GET', agent: false, signal,
      servername: net.isIP(u.hostname.replace(/^\[|\]$/g, '')) ? undefined : u.hostname,
      // the socket goes to the address we checked, never to a fresh DNS answer
      lookup: (_h, opts, cb) => (opts && opts.all ? cb(null, [{ address: addr.address, family: addr.family }]) : cb(null, addr.address, addr.family)),
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9', 'Accept-Encoding': 'gzip, deflate, br', 'Accept-Language': 'en' },
    }, (res) => {
      const status = res.statusCode, headers = res.headers;
      // a redirect or an error: its body is never read (a server could stream one forever)
      if ((status >= 300 && status < 400 && headers.location) || status >= 400) { res.destroy(); return resolve({ status, headers }); }
      const type = String(headers['content-type'] || '').toLowerCase();
      if (!/^(text\/html|application\/xhtml\+xml|text\/plain)\b/.test(type) && type) { res.destroy(); return resolve({ status, headers, type }); }
      const len = Number(headers['content-length']);
      if (len > maxBytes && !headers['content-encoding']) { res.destroy(); return reject(new PageError('tooBig')); }
      const enc = String(headers['content-encoding'] || '').toLowerCase().trim();
      let stream = res;
      if (enc === 'gzip' || enc === 'x-gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
      else if (enc && enc !== 'identity') { res.destroy(); return reject(new PageError('notText')); }
      const chunks = []; let size = 0, raw = 0;
      res.on('data', (c) => { raw += c.length; if (raw > maxBytes) { res.destroy(); stream.destroy(); reject(new PageError('tooBig')); } });   // also when it inflates to nothing
      stream.on('data', (c) => {
        size += c.length;
        if (size > maxBytes || raw > maxBytes) { res.destroy(); stream.destroy(); reject(new PageError('tooBig')); return; }
        chunks.push(c);
      });
      stream.on('end', () => resolve({ status, headers, type, body: Buffer.concat(chunks), bytes: raw }));
      stream.on('error', () => reject(new PageError('failed')));
      res.on('error', (e) => reject(signal && signal.aborted ? new PageError('timeout') : new PageError('failed')));
    });
    if (signal) signal.addEventListener('abort', () => { req.destroy(); reject(new PageError('timeout')); }, { once: true });
    req.on('error', (e) => reject(signal && signal.aborted ? new PageError('timeout') : e instanceof PageError ? e : new PageError(e && e.code === 'ENOTFOUND' ? 'dns' : 'failed')));
    req.end();
  });
}

function charsetOf(type, body) {
  const m = /charset=["']?([\w-]+)/i.exec(type || '') || /<meta[^>]{0,200}?charset=["']?([\w-]+)/i.exec(body.subarray(0, 2048).toString('latin1'));
  return m ? m[1].toLowerCase() : 'utf-8';
}
function decodeBody(body, type) {
  try { return new TextDecoder(charsetOf(type, body)).decode(body); } catch { return new TextDecoder('utf-8').decode(body); }
}

// Fetches one page, following at most 3 redirects, each checked again. Options (tests only): resolver, maxBytes,
// timeoutMs, and allowAddress(ip, port) — the local test server's way past the private-address rule; the Vercel
// function never passes it.
export async function fetchPage(rawUrl, opts = {}) {
  const resolver = opts.resolver || defaultResolver, maxBytes = opts.maxBytes || LIMITS.maxBytes;
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), opts.timeoutMs || LIMITS.timeoutMs);
  const log = opts.log || ((m) => console.log(m));
  let u;
  try {
    u = opts.allowAddress ? checkUrlTest(rawUrl, opts.allowAddress) : checkUrl(rawUrl);
    const first = u.href;
    for (let hop = 0; ; hop++) {
      const addr = opts.allowAddress && opts.allowAddress(u.hostname, u.port) ? { address: u.hostname, family: 4 } : await resolveSafe(u, resolver, ac.signal);
      if (ac.signal.aborted) throw new PageError('timeout');
      const r = await requestOnce(u, addr, { signal: ac.signal, maxBytes });
      log(JSON.stringify({ fetchPage: { host: u.hostname, status: r.status, bytes: r.bytes || 0 } }));
      if (r.status >= 300 && r.status < 400 && r.headers.location) {
        if (hop >= LIMITS.maxRedirects) throw new PageError('redirects');
        let next;
        try { next = new URL(String(r.headers.location), u); } catch { throw new PageError('badUrl'); }
        u = opts.allowAddress ? checkUrlTest(next.href, opts.allowAddress) : checkUrl(next.href);
        continue;
      }
      if (r.status === 401 || r.status === 402 || r.status === 403 || r.status === 407 || r.status === 429 || r.status === 451) throw new PageError('denied');
      if (r.status === 404 || r.status === 410) throw new PageError('missing');
      if (r.status >= 400) throw new PageError('upstream');
      if (r.body === undefined) {
        throw new PageError(/^(application\/pdf|image\/|audio\/|video\/|application\/(msword|vnd\.|zip|octet-stream))/.test(r.type || '') ? 'notPage' : 'notText');
      }
      const html = decodeBody(r.body, r.type);
      const plain = /^text\/plain/.test(r.type || '');
      const page = plain ? { title: '', text: html.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim(), words: 0 } : pageToText(html);
      if (plain) page.words = (page.text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || []).length;
      // control characters (other than tab and new line) are dropped: they aren't text, and JSON writes each as 6 bytes
      page.text = page.text.replace(CONTROL, ''); page.title = String(page.title || '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
      if (page.words < 20) throw new PageError('empty');
      if (page.text.length > LIMITS.maxTextChars) throw new PageError('tooBig');   // keeps the reply well under the host's response limit
      if (Buffer.byteLength(page.text) > LIMITS.maxTextBytes) throw new PageError('tooBig');   // 2-byte charsets grow in UTF-8
      const site = u.hostname.replace(/^www\./, '');
      return { url: first, finalUrl: u.href, title: (page.title || site).slice(0, 300), site, text: page.text, words: page.words };
    }
  } catch (e) {
    if (ac.signal.aborted && !(e instanceof PageError && e.code !== 'failed')) throw new PageError('timeout');
    if (e instanceof PageError) throw e;
    throw new PageError('failed');
  } finally { clearTimeout(timer); }
}
// The test path: the same checks, except the one host:port the test server listens on.
function checkUrlTest(raw, allow) {
  try { return checkUrl(raw); } catch (e) {
    let u; try { u = new URL(String(raw)); } catch { throw e; }
    if (u.protocol === 'http:' && !u.username && !u.password && allow(u.hostname, u.port)) return u;
    throw e;
  }
}

// ---------- the per-teacher limit (in memory, per server instance) ----------
export function makeRateLimit(perHour = LIMITS.perHour, now = () => Date.now()) {
  const seen = new Map();
  return (id) => {
    const t = now(), list = (seen.get(id) || []).filter((x) => t - x < 3600e3);
    if (seen.size > 5000) for (const [k, v] of seen) if (!v.some((x) => t - x < 3600e3)) seen.delete(k);
    if (list.length >= perHour) { seen.set(id, list); return false; }
    list.push(t); seen.set(id, list); return true;
  };
}

// ---------- who is asking: a signed-in teacher (Supabase checks the access token; no service key) ----------
export async function verifyTeacher(authHeader, cfg, fetchImpl = fetch) {
  const m = /^Bearer\s+([A-Za-z0-9._~+/=-]{20,4096})$/.exec(String(authHeader || ''));
  if (!m || !cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  try {
    const r = await fetchImpl(cfg.supabaseUrl.replace(/\/+$/, '') + '/auth/v1/user', {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + m[1] }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const u = await r.json();
    return u && typeof u.id === 'string' && u.id ? { id: u.id } : null;
  } catch { return null; }
}
export function envConfig(env = process.env) {
  const url = (env.PP_SUPABASE_URL || '').trim(), key = (env.PP_SUPABASE_ANON_KEY || '').trim();
  return url && key ? { supabaseUrl: url, supabaseAnonKey: key } : null;
}

// ---------- the HTTP handler: POST { url } with Authorization: Bearer <the teacher's access token> ----------
async function readJson(req, max = 4096) {
  if (req.body !== undefined && req.body !== null) {   // Vercel may have parsed it already
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    const s = String(req.body); if (s.length > max) throw new PageError('badUrl', 413); return JSON.parse(s);
  }
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > max) throw new PageError('badUrl', 413); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
export function createHandler(opts = {}) {
  const allow = opts.rateLimit || makeRateLimit();
  const config = opts.config || (() => envConfig());
  return async function handler(req, res) {
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { error: 'method', message: 'Use POST.' }); }
      if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return send(415, { error: 'badUrl', message: MSG.badUrl });
      const cfg = config();
      if (!cfg) return send(503, { error: 'offline', message: 'Links need online orders, which aren\'t set up here. ' + SAVE });
      const who = await verifyTeacher(req.headers.authorization, cfg, opts.fetchImpl);
      if (!who) return send(401, { error: 'signIn', message: MSG.signIn });
      let body; try { body = await readJson(req); } catch (e) { return send(e.status || 400, { error: 'badUrl', message: MSG.badUrl }); }
      if (!body || typeof body.url !== 'string') return send(400, { error: 'badUrl', message: MSG.badUrl });
      if (!allow(who.id)) return send(429, { error: 'rate', message: MSG.rate });
      const page = await fetchPage(body.url, { resolver: opts.resolver, allowAddress: opts.allowAddress, log: opts.log });
      return send(200, page);
    } catch (e) {
      const pe = e instanceof PageError ? e : new PageError('failed');
      return send(pe.status === 400 || pe.status === 413 ? pe.status : 422, { error: pe.code, message: pe.message });
    }
  };
}
