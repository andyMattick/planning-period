// A small stand-in for a Supabase project, for scripts/test-orders.mjs only: the parts of Auth, PostgREST and Storage
// that site/backend.js and scripts/orders.mjs use, with the same rules as supabase/migrations/*_orders.sql (a teacher
// sees only her rows and files, inserts only status 'sent', and changes an order only through the four functions).
// It keeps everything in memory. It is not a test of the SQL itself (that one ran against Postgres: docs/BACKEND.md).
import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';

export const ANON = 'fake-anon-key', SERVICE = 'fake-service-key';
const STATUSES = ['draft', 'sent', 'onboarding', 'needs_answer', 'building', 'preview_ready', 'changes_requested', 'approved', 'final_ready', 'cancelled', 'failed'];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

export function startFake({ port = 0 } = {}) {
  const db = { users: [], teachers: [], admins: [], orders: [], order_events: [], otp: [], objects: new Map(), signed: new Map(), tokens: new Map() };
  const now = () => new Date().toISOString();

  function userFor(email) {
    let u = db.users.find((x) => x.email === email);
    if (!u) { u = { id: randomUUID(), email }; db.users.push(u); db.teachers.push({ id: u.id, name: '', email, created_at: now() }); }
    return u;
  }
  function tokenFor(u) {
    const t = `${b64({ alg: 'none' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.${randomBytes(8).toString('hex')}`;
    db.tokens.set(t, u.id); return t;
  }
  function who(req) {
    const key = req.headers.apikey, auth = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (key === SERVICE) return { service: true };
    if (key !== ANON) return { bad: true };
    if (auth && db.tokens.has(auth)) return { uid: db.tokens.get(auth) };
    return { anon: true };
  }
  const isAdmin = (uid) => db.admins.includes(uid);
  const canSeeOrder = (w, o) => w.service || (w.uid && (o.teacher === w.uid || isAdmin(w.uid)));
  function setStatus(o, status, by) {
    if (o.status !== status) db.order_events.push({ id: db.order_events.length + 1, order_id: o.id, at: now(), status, by: by || null, note: o.note || null });
    o.status = status; o.updated_at = now();
  }
  class PgErr extends Error { constructor(m, code = 'P0001', status = 400) { super(m); this.code = code; this.status = status; } }

  // PostgREST filters: col=eq.x, col=in.(a,b); order=col.desc; select=* or a,b
  function query(rows, params) {
    let out = rows.slice();
    for (const [k, v] of params) {
      if (['select', 'order', 'limit'].includes(k)) continue;
      const m = /^(eq|in)\.(.*)$/.exec(v); if (!m) continue;
      out = m[1] === 'eq' ? out.filter((r) => String(r[k]) === m[2]) : out.filter((r) => m[2].replace(/^\(|\)$/g, '').split(',').includes(String(r[k])));
    }
    const ord = params.get('order');
    if (ord) { const [c, dir] = ord.split('.'); out.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (dir === 'desc' ? -1 : 1)); }
    const sel = params.get('select');
    if (sel && sel !== '*') { const cols = sel.split(','); out = out.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))); }
    return out;
  }
  const TABLE_VIEW = {
    orders: (w) => db.orders.filter((o) => canSeeOrder(w, o)),
    order_events: (w) => db.order_events.filter((e) => { const o = db.orders.find((x) => x.id === e.order_id); return o && canSeeOrder(w, o); }),
    teachers: (w) => db.teachers.filter((t) => w.service || (w.uid && (t.id === w.uid || isAdmin(w.uid)))),
  };

  function rpc(w, fn, a) {
    if (fn === 'is_admin') return !!(w.uid && isAdmin(w.uid));
    if (fn === 'orders_due_for_purge') {
      if (!w.service) throw new PgErr('permission denied for function orders_due_for_purge', '42501', 401);
      const cutoff = Date.now() - (a.p_days ?? 7) * 864e5;
      return db.orders.filter((o) => !o.uploads_purged_at && o.upload_files.length && ['final_ready', 'cancelled', 'failed'].includes(o.status) && Date.parse(o.updated_at) <= cutoff)
        .map((o) => ({ id: o.id, teacher: o.teacher, status: o.status, updated_at: o.updated_at }));
    }
    if (!w.uid) throw new PgErr('permission denied', '42501', 401);
    const o = db.orders.find((x) => x.id === a.p_order && x.teacher === w.uid);
    if (!o) throw new PgErr('order not found');
    if (fn === 'answer_follow_up') {
      if (o.status !== 'needs_answer') throw new PgErr(`this order is not waiting for an answer (it is ${o.status})`);
      if (!String(a.p_answer || '').trim()) throw new PgErr('the answer is empty');
      Object.assign(o, { answer: String(a.p_answer).trim().slice(0, 2000), answers: a.p_answers ?? null, answered_at: now(), note: null });
      return setStatus(o, 'building', w.uid), null;
    }
    if (fn === 'request_changes') {
      if (o.status !== 'preview_ready') throw new PgErr(`there is no preview to review (the order is ${o.status})`);
      const c = a.p_comments || {};
      if (c.orderId !== o.id) throw new PgErr('the comments are for another order');
      if (!(c.comments || []).length) throw new PgErr('write at least one comment');
      o.comments = c; o.note = null; return setStatus(o, 'changes_requested', w.uid), null;
    }
    if (fn === 'approve_order') {
      const p = a.p_approval || {};
      if (o.status !== 'preview_ready' || !o.review) throw new PgErr(`there is no preview to approve (the order is ${o.status})`);
      if (p.orderId !== o.id) throw new PgErr('the approval is for another order');
      if (!String(p.name || '').trim()) throw new PgErr('the approval needs your name');
      if (p.statement !== o.review.statement) throw new PgErr("the agreement text is not the preview's");
      if (p.packHash !== o.review.packHash) throw new PgErr('the approval is for an older preview');
      const missing = (o.review.documents || []).filter((r) => !(p.documents || []).some((d) => d.file === r.file && d.sha256 === r.sha256)).length;
      if (missing) throw new PgErr(`${missing} preview file(s) were not approved or changed since the preview was made`);
      o.approval = p; o.note = null; return setStatus(o, 'approved', w.uid), null;
    }
    if (fn === 'cancel_order') {
      if (['approved', 'final_ready', 'cancelled'].includes(o.status)) throw new PgErr(`this order can't be cancelled now (it is ${o.status})`);
      return setStatus(o, 'cancelled', w.uid), null;
    }
    throw new PgErr(`function ${fn} does not exist`, 'PGRST202', 404);
  }

  const objKey = (bucket, name) => `${bucket}/${name}`;
  function canStorage(w, op, bucket, name) {
    if (w.service) return true;
    if (!w.uid) return false;
    const mine = name.split('/')[0] === w.uid;
    if (bucket === 'uploads') return op === 'read' ? mine || isAdmin(w.uid) : mine;
    if (bucket === 'deliverables') return op === 'read' && (mine || isAdmin(w.uid));
    return false;
  }

  const server = createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    const json = () => (raw.length ? JSON.parse(raw.toString('utf8')) : {});
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-upsert, prefer, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
    const send = (status, body, type = 'application/json') => {
      res.writeHead(status, { ...cors, 'Content-Type': type });
      res.end(body == null ? '' : Buffer.isBuffer(body) ? body : typeof body === 'string' && type !== 'application/json' ? body : JSON.stringify(body));
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const url = new URL(req.url, 'http://x'), path = url.pathname;
    try {
      // ---- test-only helpers ----
      if (path === '/__test/magic-link') {
        const o = [...db.otp].reverse().find((x) => x.email === url.searchParams.get('email'));
        if (!o) return send(404, { message: 'no link sent' });
        const u = userFor(o.email), t = tokenFor(u);
        return send(200, { link: `${o.redirect}#access_token=${t}&expires_in=3600&refresh_token=r-${t.slice(-16)}&token_type=bearer&type=magiclink`, user: u });
      }
      if (path === '/__test/admin') { const u = userFor(url.searchParams.get('email')); if (!db.admins.includes(u.id)) db.admins.push(u.id); return send(200, u); }
      if (path === '/__test/state') return send(200, { orders: db.orders, events: db.order_events, objects: [...db.objects.keys()] });
      if (path === '/__test/age') { const o = db.orders.find((x) => x.id === url.searchParams.get('id')); o.updated_at = new Date(Date.now() - 30 * 864e5).toISOString(); return send(200, {}); }

      const w = who(req);
      if (w.bad && !(req.method === 'GET' && path.startsWith('/storage/v1/object/sign/'))) return send(401, { message: 'Invalid API key' });   // signed links need no key

      // ---- auth ----
      if (path === '/auth/v1/otp' && req.method === 'POST') {
        const b = json(); if (!/@/.test(b.email || '')) return send(400, { msg: 'Unable to validate email address: invalid format' });
        db.otp.push({ email: b.email, redirect: url.searchParams.get('redirect_to') || '' }); return send(200, {});
      }
      if (path === '/auth/v1/user') { if (!w.uid) return send(401, { msg: 'invalid JWT' }); const u = db.users.find((x) => x.id === w.uid); return send(200, { id: u.id, email: u.email }); }
      if (path === '/auth/v1/logout') { db.tokens.delete((req.headers.authorization || '').replace(/^Bearer /, '')); return send(204, null); }
      if (path === '/auth/v1/token') return send(400, { error: 'invalid_grant' });

      // ---- rest ----
      let m;
      if ((m = /^\/rest\/v1\/rpc\/(\w+)$/.exec(path)) && req.method === 'POST') return send(200, rpc(w, m[1], json()));
      if ((m = /^\/rest\/v1\/(\w+)$/.exec(path))) {
        const table = m[1];
        if (w.anon) return send(401, { code: '42501', message: `permission denied for table ${table}` });
        if (req.method === 'GET') { const view = TABLE_VIEW[table]; if (!view) return send(404, { message: `no table ${table}` }); return send(200, query(view(w), url.searchParams)); }
        if (req.method === 'POST' && table === 'orders') {
          const r = json();
          if (!w.service) {
            const ok = r.teacher === w.uid && r.status === 'sent' && ['follow_up', 'answer', 'answers', 'review', 'comments', 'approval', 'note', 'uploads_purged_at'].every((k) => r[k] == null)
              && (r.preview_files == null || !r.preview_files.length) && (r.final_files == null || !r.final_files.length);
            if (!ok) return send(403, { code: '42501', message: 'new row violates row-level security policy for table "orders"' });
          }
          if (!/^pp-\d{4}-\d{2}-\d{2}-[a-z0-9]{6}$/.test(r.id)) return send(400, { code: '23514', message: 'new row violates check constraint "orders_id_check"' });
          if (db.orders.some((o) => o.id === r.id)) return send(409, { code: '23505', message: 'duplicate key value violates unique constraint "orders_pkey"' });
          const o = { follow_up: null, answer: null, answers: null, answered_at: null, review: null, comments: null, approval: null, note: null, uploads_purged_at: null,
            upload_files: [], preview_files: [], final_files: [], token_total: 0, ...r, created_at: now(), updated_at: now() };
          db.orders.push(o); db.order_events.push({ id: db.order_events.length + 1, order_id: o.id, at: now(), status: o.status, by: w.uid || null, note: null });
          return send(201, null);
        }
        if (req.method === 'PATCH') {
          if (!w.service) return send(403, { code: '42501', message: `permission denied for table ${table}` });
          const patch = json(), rows = query(db[table], url.searchParams);
          for (const r of rows) {
            if (patch.status && !STATUSES.includes(patch.status)) return send(400, { message: 'violates check constraint' });
            const { status, ...rest } = patch; Object.assign(r, rest); if (status) setStatus(r, status, null); else r.updated_at = now();
          }
          return send(204, null);
        }
        return send(405, { message: 'not in the fake' });
      }

      // ---- storage ----
      if ((m = /^\/storage\/v1\/object\/sign\/(\w+)\/(.+)$/.exec(path))) {
        const bucket = m[1], name = decodeURIComponent(m[2]);
        if (req.method === 'POST') {
          if (!canStorage(w, 'read', bucket, name) || !db.objects.has(objKey(bucket, name))) return send(400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
          const t = randomBytes(12).toString('hex'); db.signed.set(t, { key: objKey(bucket, name), exp: Date.now() + (json().expiresIn || 60) * 1000 });
          return send(200, { signedURL: `/object/sign/${bucket}/${m[2]}?token=${t}` });
        }
        const s = db.signed.get(url.searchParams.get('token'));
        if (!s || s.key !== objKey(bucket, name) || s.exp < Date.now()) return send(400, { message: 'invalid signature' });
        const obj = db.objects.get(s.key);
        const dl = url.searchParams.get('download');
        res.writeHead(200, { ...cors, 'Content-Type': obj.type, ...(dl ? { 'Content-Disposition': `attachment; filename="${dl}"` } : {}) });
        return res.end(obj.body);
      }
      if ((m = /^\/storage\/v1\/object\/list\/(\w+)$/.exec(path)) && req.method === 'POST') {
        const bucket = m[1], b = json(), prefix = (b.prefix || '').replace(/\/?$/, '/').replace(/^\/$/, '');
        const seen = new Map();
        for (const k of db.objects.keys()) {
          if (!k.startsWith(`${bucket}/${prefix}`)) continue;
          const name = k.slice(bucket.length + 1);
          if (!canStorage(w, 'read', bucket, name)) continue;
          const rest = name.slice(prefix.length), i = rest.indexOf('/');
          if (i >= 0) seen.set(rest.slice(0, i), { name: rest.slice(0, i), id: null });
          else seen.set(rest, { name: rest, id: randomUUID(), metadata: { size: db.objects.get(k).body.length } });
        }
        return send(200, [...seen.values()].sort((a, c) => (a.name < c.name ? -1 : 1)).slice(b.offset || 0, (b.offset || 0) + (b.limit || 100)));
      }
      if ((m = /^\/storage\/v1\/object\/(\w+)$/.exec(path)) && req.method === 'DELETE') {
        const bucket = m[1], gone = [];
        for (const name of json().prefixes || []) {
          if (!(w.service || (w.uid && bucket === 'uploads' && name.split('/')[0] === w.uid))) continue;
          if (db.objects.delete(objKey(bucket, name))) gone.push({ name });
        }
        return send(200, gone);
      }
      if ((m = /^\/storage\/v1\/object\/(\w+)\/(.+)$/.exec(path))) {
        const bucket = m[1], name = decodeURIComponent(m[2]), key = objKey(bucket, name);
        if (!['uploads', 'deliverables'].includes(bucket)) return send(400, { message: 'Bucket not found' });
        if (req.method === 'POST' || req.method === 'PUT') {
          if (!canStorage(w, 'write', bucket, name)) return send(403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
          if (db.objects.has(key) && req.headers['x-upsert'] !== 'true') return send(400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
          db.objects.set(key, { body: raw, type: req.headers['content-type'] || 'application/octet-stream' });
          return send(200, { Key: key });
        }
        if (req.method === 'GET') {
          if (!canStorage(w, 'read', bucket, name) || !db.objects.has(key)) return send(400, { statusCode: '404', message: 'Object not found' });
          const obj = db.objects.get(key); res.writeHead(200, { ...cors, 'Content-Type': obj.type }); return res.end(obj.body);
        }
      }
      return send(404, { message: `not in the fake: ${req.method} ${path}` });
    } catch (e) {
      if (e instanceof PgErr) return send(e.status, { code: e.code, message: e.message });
      console.error(e); return send(500, { message: String(e.message || e) });
    }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, db, url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}
