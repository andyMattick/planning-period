// The online backend (docs/BACKEND.md): email-link sign-in, uploads, orders and files on Supabase.
// A small client written on fetch, because the site loads nothing from a CDN. Only what the pages use:
//   Auth    POST /auth/v1/otp (magic link), the #access_token the link comes back with, refresh, /user, logout
//   REST    select / insert on tables, and rpc() for the functions in supabase/migrations/*_orders.sql
//   Storage upload, signed URLs for private files, download
// The settings come from ../backend.config.json ({ "supabaseUrl", "supabaseAnonKey" }), made from the host's
// environment by scripts/build-backend-config.mjs. No file (or an empty one) means local mode: the order page makes
// a zip to email, as before. The anon key is public by design; the security is the row level security in the SQL.
// The session is kept in this browser's localStorage, like Supabase's own client does.
(function (root) {
  'use strict';
  var SESSION_KEY = 'pp-session';

  function store(v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (v === null) localStorage.removeItem(SESSION_KEY); else localStorage.setItem(SESSION_KEY, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function jwtClaims(t) {
    try {
      var p = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(p + '==='.slice((p.length + 3) % 4)))));
    } catch (e) { return {}; }
  }
  function encPath(p) { return String(p).split('/').map(encodeURIComponent).join('/'); }
  // Storage keys: plain letters, digits and a few marks only (Supabase refuses some characters in object names).
  function safeKey(name) {
    var n = String(name).normalize ? String(name).normalize('NFKD').replace(/[̀-ͯ]/g, '') : String(name);
    n = n.replace(/[^A-Za-z0-9._ ()-]+/g, '_').replace(/\s+/g, ' ').replace(/^[.\s]+/, '_').trim();
    return n || 'file';
  }

  function makeClient(cfg) {
    var url = String(cfg.supabaseUrl).replace(/\/+$/, ''), key = cfg.supabaseAnonKey;
    var session = store();
    var listeners = [];

    function emit() { listeners.forEach(function (f) { try { f(session); } catch (e) {} }); }
    function setSession(s) { session = s; store(s); emit(); }
    function headers(extra) {
      var h = { apikey: key };
      var bearer = session && session.access_token ? session.access_token : (/^eyJ/.test(key) ? key : null);
      if (bearer) h.Authorization = 'Bearer ' + bearer;
      Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; });
      return h;
    }
    function fail(res) {
      return res.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        var msg = (j && (j.message || j.msg || j.error_description || j.error)) || t || ('HTTP ' + res.status);
        var err = new Error(msg); err.status = res.status; err.body = j; throw err;
      });
    }
    function call(method, path, body, extra) {
      return fresh().then(function () {
        var h = headers(extra), opts = { method: method, headers: h };
        if (body !== undefined) {
          if (body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) opts.body = body;
          else { opts.body = JSON.stringify(body); if (!h['Content-Type']) h['Content-Type'] = 'application/json'; }
        }
        return fetch(url + path, opts).then(function (res) {
          if (!res.ok) return fail(res);
          if (res.status === 204) return null;
          var ct = res.headers.get('Content-Type') || '';
          return /json/.test(ct) ? res.text().then(function (t) { return t ? JSON.parse(t) : null; }) : res.arrayBuffer();
        });
      });
    }

    // ---- auth ----
    // The magic link comes back to the page with #access_token=…&refresh_token=…&expires_in=…, or #error_description=….
    function fromHash() {
      var h = location.hash.replace(/^#/, '');
      if (!/(^|&)(access_token|error_description|error)=/.test(h)) return null;
      var p = {}; h.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) p[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
      if (p.access_token) {
        var c = jwtClaims(p.access_token);
        setSession({ access_token: p.access_token, refresh_token: p.refresh_token || null,
          expires_at: Number(p.expires_at) || (Math.floor(Date.now() / 1000) + (Number(p.expires_in) || 3600)),
          user: { id: c.sub, email: c.email || '' } });
        return { ok: true };
      }
      return { error: p.error_description || p.error || 'The sign-in link did not work.' };
    }
    var refreshing = null;
    function fresh() {
      if (!session || !session.refresh_token) return Promise.resolve();
      if (session.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
      if (!refreshing) {
        refreshing = fetch(url + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: session.refresh_token })
        }).then(function (res) {
          if (!res.ok) { setSession(null); return; }
          return res.json().then(function (s) {
            setSession({ access_token: s.access_token, refresh_token: s.refresh_token,
              expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
              user: s.user ? { id: s.user.id, email: s.user.email } : session.user });
          });
        }).catch(function () {}).then(function () { refreshing = null; });
      }
      return refreshing;
    }

    var client = {
      configured: true,
      url: url,
      hashResult: null,
      user: function () { return session && session.user && session.user.id ? session.user : null; },
      onChange: function (f) { listeners.push(f); },
      // Sends the email with the sign-in link. It brings her back to `back` (this page) signed in.
      signIn: function (email, back) {
        var q = back ? '?redirect_to=' + encodeURIComponent(back) : '';
        return fetch(url + '/auth/v1/otp' + q, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, create_user: true }) }).then(function (res) { if (!res.ok) return fail(res); });
      },
      // Checks the saved session with the server (a revoked or expired one signs her out).
      check: function () {
        if (!session) return Promise.resolve(null);
        return call('GET', '/auth/v1/user').then(function (u) {
          if (u && u.id) { session.user = { id: u.id, email: u.email || '' }; store(session); }
          return client.user();
        }, function (e) { if (e.status === 401 || e.status === 403) setSession(null); return client.user(); });
      },
      signOut: function () {
        var done = function () { setSession(null); };
        if (!session) return Promise.resolve(done());
        return call('POST', '/auth/v1/logout').then(done, done);
      },

      // ---- tables ----
      select: function (table, query) { return call('GET', '/rest/v1/' + table + '?' + (query || 'select=*')); },
      insert: function (table, row) { return call('POST', '/rest/v1/' + table, row, { Prefer: 'return=minimal' }); },
      update: function (table, query, patch) { return call('PATCH', '/rest/v1/' + table + '?' + query, patch, { Prefer: 'return=minimal' }); },
      rpc: function (fn, args) { return call('POST', '/rest/v1/rpc/' + fn, args || {}); },

      // ---- storage ----
      upload: function (bucket, path, blob) {
        return call('POST', '/storage/v1/object/' + bucket + '/' + encPath(path), blob,
          { 'Content-Type': (blob && blob.type) || 'application/octet-stream', 'x-upsert': 'false' });
      },
      remove: function (bucket, paths) { return call('DELETE', '/storage/v1/object/' + bucket, { prefixes: paths }); },
      signedUrl: function (bucket, path, seconds, downloadName) {
        return call('POST', '/storage/v1/object/sign/' + bucket + '/' + encPath(path), { expiresIn: seconds || 3600 }).then(function (r) {
          var s = (r && (r.signedURL || r.signedUrl)) || '';
          var full = /^https?:/.test(s) ? s : url + '/storage/v1' + (s.charAt(0) === '/' ? '' : '/') + s;
          return downloadName ? full + (full.indexOf('?') >= 0 ? '&' : '?') + 'download=' + encodeURIComponent(downloadName) : full;
        });
      },
      // "Paste a link": our own server reads the page (api/fetch-page.js; docs/BACKEND.md) for a signed-in teacher and
      // sends back { url, finalUrl, title, site, text, words }: text only, never the page itself.
      fetchPage: function (pageUrl) {
        var SAVE = 'We couldn\'t read that page. Save it from your browser (File → Save page as) and upload it instead.';
        return fresh().then(function () {
          if (!session || !session.access_token) { var e = new Error('Please sign in again to add links.'); e.status = 401; throw e; }
          return fetch('../api/fetch-page', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
            body: JSON.stringify({ url: pageUrl }) }).catch(function () { throw new Error(SAVE); });
        }).then(function (res) {
          return res.text().then(function (t) {
            var j = null; try { j = JSON.parse(t); } catch (e) {}
            if (!res.ok || !j || typeof j.text !== 'string') { var err = new Error((j && j.message) || SAVE); err.status = res.status; err.code = j && j.error; throw err; }
            return j;
          });
        });
      },
      fetchBytes: function (signed) {
        return fetch(signed).then(function (res) { if (!res.ok) return fail(res); return res.arrayBuffer(); });
      }
    };
    client.hashResult = fromHash();
    // The link opened in a tab that already shows this page only changes the hash: pick the sign-in up from there too.
    window.addEventListener('hashchange', function () { var r = fromHash(); if (r) { client.hashResult = r; if (r.error) emit(); } });
    return client;
  }

  var loading = null;
  // Resolves to the client, or null in local mode (no config, an empty one, or the config can't be read offline).
  function load() {
    if (loading) return loading;
    if (root.PP_BACKEND) return (loading = Promise.resolve(root.PP_BACKEND));   // a test can hand in its own client
    loading = fetch('../backend.config.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (cfg) { return cfg && cfg.supabaseUrl && cfg.supabaseAnonKey ? makeClient(cfg) : null; });
    return loading;
  }

  function sha256Hex(buf) {
    return crypto.subtle.digest('SHA-256', buf).then(function (d) {
      return Array.prototype.map.call(new Uint8Array(d), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  // The sign-in box both pages share (#account, #acct-out, #acct-in, #signin-email, #signin-btn, #signin-sent,
  // #signin-err, #acct-email, #signout-btn). onUser(user|null) runs now and on every change.
  function wireSignIn(client, onUser) {
    var $ = function (id) { return document.getElementById(id); };
    var box = $('account'); if (!box) return;
    box.hidden = false;
    function render() {
      var u = client.user();
      $('acct-out').hidden = !!u; $('acct-in').hidden = !u;
      if (u) $('acct-email').textContent = u.email || 'your account';
      if (root.PP && root.PP.setWho) root.PP.setWho(u);
      if (onUser) onUser(u);
    }
    if (client.hashResult && client.hashResult.error) $('signin-err').textContent = 'That sign-in link did not work (' + client.hashResult.error + '). Ask for a new one.';
    client.onChange(render);
    $('signin-btn').addEventListener('click', function () {
      var email = $('signin-email').value.trim(), btn = this;
      $('signin-err').textContent = ''; $('signin-sent').textContent = '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('signin-err').textContent = 'Please type your email address.'; $('signin-email').focus(); return; }
      btn.disabled = true;
      client.signIn(email, location.origin + location.pathname).then(function () {
        $('signin-sent').textContent = 'Check your email (' + email + ') and open the link on this device. It brings you back here signed in.';
      }, function (e) {
        $('signin-err').textContent = 'We could not send the link (' + (e.message || e) + '). Check the address and try again.';
      }).then(function () { btn.disabled = false; });
    });
    $('signin-email').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('signin-btn').click(); } });
    $('signout-btn').addEventListener('click', function () { client.signOut(); });
    render();
    client.check().then(render);
  }

  root.PPBackend = { load: load, makeClient: makeClient, safeKey: safeKey, sha256Hex: sha256Hex, wireSignIn: wireSignIn };
})(window);
