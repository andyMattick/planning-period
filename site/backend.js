// The online backend (docs/BACKEND.md): email + password sign-in (or an email link), uploads, orders and files on Supabase.
// A small client written on fetch, because the site loads nothing from a CDN. Only what the pages use:
//   Auth    POST /auth/v1/token?grant_type=password, /signup, /recover, /resend, PUT /user (set a password),
//           POST /auth/v1/otp (magic link), the #access_token links come back with, refresh, /user, logout
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
        var err = new Error(msg); err.status = res.status; err.body = j;
        err.code = (j && (j.error_code || (typeof j.error === 'string' ? j.error : '') || (typeof j.code === 'string' ? j.code : ''))) || '';
        throw err;
      });
    }
    // Every call starts with a fresh access token. A 401 with a session (an access token the server no longer takes,
    // say the device clock is off) gets one refresh and one retry before it counts.
    function call(method, path, body, extra, retried) {
      return fresh().then(function () {
        var h = headers(extra), opts = { method: method, headers: h }, had = session && session.access_token;
        if (body !== undefined) {
          if (body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) opts.body = body;
          else { opts.body = JSON.stringify(body); if (!h['Content-Type']) h['Content-Type'] = 'application/json'; }
        }
        return fetch(url + path, opts).then(function (res) {
          if (res.status === 401 && had && !retried && session && session.refresh_token) {
            if (!adoptStored() || session.access_token === had) session.expires_at = 0;
            return call(method, path, body, extra, true);
          }
          if (!res.ok) return fail(res);
          if (res.status === 204) return null;
          var ct = res.headers.get('Content-Type') || '';
          return /json/.test(ct) ? res.text().then(function (t) { return t ? JSON.parse(t) : null; }) : res.arrayBuffer();
        });
      });
    }

    // ---- auth ----
    // A session from any token response (password sign-in, refresh, sign-up without email confirmation) or link.
    // `method` is how she signed in ('password', 'link', 'signup', 'recovery'): My orders offers to set a password
    // unless she already has one. Only the tokens are kept, never a password.
    function sessionFrom(s, method) {
      var c = jwtClaims(s.access_token), u = s.user || {};
      return { access_token: s.access_token, refresh_token: s.refresh_token || null,
        expires_at: Number(s.expires_at) || (Math.floor(Date.now() / 1000) + (Number(s.expires_in) || 3600)),
        user: { id: u.id || c.sub, email: u.email || c.email || '' },
        method: method || (session && session.method) || 'link',
        hasPassword: !!((u.user_metadata && u.user_metadata.has_password) || (session && session.hasPassword) || method === 'password') };
    }
    // Email links come back to the page with #access_token=…&refresh_token=…&expires_in=…&type=magiclink|signup|recovery,
    // or #error=…&error_code=…&error_description=….
    function fromHash() {
      var h = location.hash.replace(/^#/, '');
      if (!/(^|&)(access_token|error_description|error)=/.test(h)) return null;
      var p = {}; h.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) p[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
      if (p.access_token) {
        var type = p.type || 'magiclink';
        setSession(sessionFrom(p, type === 'recovery' ? 'recovery' : type === 'signup' ? 'signup' : 'link'));
        return { ok: true, type: type };
      }
      return { error: p.error_description || p.error || 'The sign-in link did not work.', code: p.error_code || p.error || '' };
    }
    // Another tab may have refreshed (refresh tokens are single use): take its newer session instead of reusing ours.
    function adoptStored() {
      var s = store();
      if (s && s.refresh_token && session && s.refresh_token !== session.refresh_token && s.user && session.user && s.user.id === session.user.id) { session = s; return true; }
      return false;
    }
    var refreshing = null;
    // Gets a new access token with the refresh token. It signs her out only when the server says the refresh token is
    // no good (400/401/403); offline or a server hiccup keeps the session for the next try.
    function refresh() {
      if (!session || !session.refresh_token) return Promise.resolve();
      if (!refreshing) {
        var used = session.refresh_token;
        refreshing = fetch(url + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: used })
        }).then(function (res) {
          if (!res.ok) {
            if (adoptStored()) { emit(); return; }
            if (res.status === 400 || res.status === 401 || res.status === 403) setSession(null);
            return;
          }
          return res.json().then(function (s) { setSession(sessionFrom(s)); });
        }).catch(function () {}).then(function () { refreshing = null; });
      }
      return refreshing;
    }
    function fresh() {
      if (!session || !session.refresh_token) return Promise.resolve();
      adoptStored();
      if (session.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
      return refresh();
    }
    // The auth endpoints that take no session: sign in, sign up, reset, resend.
    function authPost(path, body) {
      return fetch(url + path, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .catch(function () { var e = new Error('offline'); e.code = 'offline'; throw e; })
        .then(function (res) { if (!res.ok) return fail(res); return res.status === 204 ? null : res.json().catch(function () { return null; }); });
    }
    function redirect(back) { return back ? '?redirect_to=' + encodeURIComponent(back) : ''; }
    // Another tab signed in or out: follow it.
    window.addEventListener('storage', function (e) {
      if (e.key !== SESSION_KEY) return;
      var s = store();
      if ((s && s.access_token) !== (session && session.access_token)) { session = s; emit(); }
    });

    var client = {
      configured: true,
      url: url,
      hashResult: null,
      user: function () { return session && session.user && session.user.id ? session.user : null; },
      onChange: function (f) { listeners.push(f); },
      // Sends the email with the sign-in link. It brings her back to `back` (this page) signed in.
      signIn: function (email, back) {
        return authPost('/auth/v1/otp' + redirect(back), { email: email, create_user: true }).then(function () {});
      },
      // Email and password. The password goes to Supabase only; we keep the tokens it sends back.
      signInPassword: function (email, password) {
        return authPost('/auth/v1/token?grant_type=password', { email: email, password: password }).then(function (s) {
          setSession(sessionFrom(s, 'password'));
          return client.user();
        });
      },
      // A new account. With "Confirm email" on (our setting) Supabase sends a confirmation email and no session:
      // resolves { confirm: true }. With it off, she is signed in at once: { confirm: false }.
      signUp: function (email, password, back) {
        return authPost('/auth/v1/signup' + redirect(back), { email: email, password: password, data: { has_password: true } }).then(function (r) {
          if (r && r.access_token) { setSession(sessionFrom(r, 'password')); return { confirm: false }; }
          return { confirm: true };
        });
      },
      // The confirmation email again (her first one expired or went to spam).
      resendConfirm: function (email, back) {
        return authPost('/auth/v1/resend' + redirect(back), { type: 'signup', email: email }).then(function () {});
      },
      // "Forgot password?": an email with a link back to `back`, signed in to set a new password.
      recover: function (email, back) {
        return authPost('/auth/v1/recover' + redirect(back), { email: email }).then(function () {});
      },
      // Sets (or changes) the signed-in teacher's password.
      setPassword: function (password) {
        return call('PUT', '/auth/v1/user', { password: password, data: { has_password: true } }).then(function () {
          if (session) { session.method = 'password'; session.hasPassword = true; store(session); emit(); }
        });
      },
      needsNewPassword: function () { return !!(session && session.method === 'recovery'); },
      hasPassword: function () { return !!(session && (session.hasPassword || session.method === 'password')); },
      skipNewPassword: function () { if (session) { session.method = 'link'; store(session); emit(); } },
      // Checks the saved session with the server (a revoked or expired one signs her out).
      check: function () {
        if (!session) return Promise.resolve(null);
        return call('GET', '/auth/v1/user').then(function (u) {
          if (u && u.id && session) {
            session.user = { id: u.id, email: u.email || '' };
            if (u.user_metadata && u.user_metadata.has_password) session.hasPassword = true;
            store(session);
          }
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
          // Storage labels this JSON answer with the stored file's type (text/plain for an interactive page), so it can
          // arrive as raw bytes: read it as JSON either way.
          if (r instanceof ArrayBuffer) { try { r = JSON.parse(new TextDecoder().decode(r)); } catch (_) { r = null; } }
          var s = (r && (r.signedURL || r.signedUrl)) || '';
          // no link back means storage refused quietly: say so, instead of fetching the storage root ("Route GET:/ not found")
          if (!s) { var e = new Error('The file link could not be made (' + (r && (r.message || r.error) || (r == null ? 'empty answer' : JSON.stringify(r).slice(0, 120))) + ').'); e.code = 'no_signed_url'; throw e; }
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
    window.addEventListener('hashchange', function () { var r = fromHash(); if (r) { client.hashResult = r; emit(); } });
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

  // ---- the sign-in box both pages share ----
  // Markup the page provides: #account, #acct-out (her intro) with an empty #signin-forms, #acct-in with #acct-email
  // and #signout-btn, and on My orders #acct-pass (set or change a password). onUser(user|null) runs now and on every
  // change. Email and password is the main way; "Create an account", "Forgot password?" and "Email me a sign-in link"
  // are the other modes of the same form. Passwords go straight to Supabase and are never logged or stored here.
  var MIN_PASSWORD = 8;   // the same minimum the owner sets in Supabase (docs/BACKEND.md step 4; Supabase's own default is 6)
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // What a teacher reads when something goes wrong (Supabase error codes, with its older messages as a fallback).
  function authMessage(e, what) {
    var code = (e && e.code) || '', msg = String((e && e.message) || e || ''), st = e && e.status;
    var reasons = (e && e.body && e.body.weak_password && e.body.weak_password.reasons) || [];
    if (code === 'offline' || /failed to fetch|networkerror|load failed/i.test(msg)) return 'We couldn\'t reach the server. Check your internet connection and try again.';
    if (code === 'invalid_credentials' || code === 'invalid_grant' && /credentials/i.test(msg) || /invalid login credentials/i.test(msg))
      return 'That email and password don\'t match an account. Check them and try again, or use Forgot password?';
    if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return 'unconfirmed';
    if (st === 429 || /rate_limit|rate limit|too many/i.test(code + ' ' + msg))
      return what === 'email' ? 'We\'ve sent several emails to this address already. Wait a few minutes (and check your spam folder), then try again.'
        : 'Too many tries in a short time. Wait a few minutes, then try again.';
    if (code === 'same_password' || /different from the old password/i.test(msg)) return 'That is already your password. Choose a different one, or keep using it.';
    if (code === 'weak_password' || /password should be at least|weak password/i.test(msg)) {
      if (reasons.indexOf('pwned') >= 0 || /pwned|leak/i.test(msg)) return 'That password has shown up in a data leak on another site. Please choose a different one.';
      return 'Please use at least ' + MIN_PASSWORD + ' characters' + (/character|letter|digit|symbol/i.test(msg) && !/at least \d+ characters/i.test(msg) ? ' (' + msg.replace(/\.$/, '') + ')' : '') + '.';
    }
    if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(msg)) return 'There\'s already an account for that email. Sign in, or use Forgot password? to set a new password.';
    if (code === 'signup_disabled' || /signups not allowed/i.test(msg)) return 'New accounts are switched off right now. Please email us.';
    if (code === 'reauthentication_needed' || /reauthenticat/i.test(msg)) return 'For your safety, sign out and sign back in, then set your password within a few minutes.';
    if (code === 'otp_expired' || /expired|invalid/i.test(msg) && what === 'link') return 'That email link has expired or was already used. Sign in with your password, or ask for a new link.';
    if (st === 401 || st === 403) return 'Please sign in again, then try once more.';
    return 'Something went wrong (' + msg.replace(/[<>]/g, '') + '). Please try again.';
  }

  function wireSignIn(client, onUser) {
    var $ = function (id) { return document.getElementById(id); };
    var esc = (root.PP && root.PP.esc) || function (s) { return String(s); };
    var box = $('account'); if (!box) return;
    box.hidden = false;
    var forms = $('signin-forms');
    if (!forms) { forms = document.createElement('div'); forms.id = 'signin-forms'; $('acct-out').appendChild(forms); }
    var mode = 'signin', back = location.origin + location.pathname;
    var iosApp = !!(root.PP && root.PP.standalone && root.PP.isIOS);
    var MODES = {
      signin: { title: '', button: 'Sign in', pw: 'current-password' },
      signup: { title: 'Create an account', button: 'Create account', pw: 'new-password' },
      forgot: { title: 'Forgot your password?', button: 'Email me a reset link', intro: 'We email you a link. Open it on this device to set a new password.' },
      link: { title: 'Sign in with an email link', button: 'Email me a sign-in link', intro: 'No password needed: we email you a link, and opening it on this device signs you in.' }
    };
    function pwField(id, auto, label, rule) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><div class="pw-wrap">' +
        '<input type="password" id="' + id + '" name="' + (auto === 'new-password' ? 'new-password' : 'password') + '" autocomplete="' + auto + '"' +
        (auto === 'new-password' ? ' minlength="' + MIN_PASSWORD + '" aria-describedby="' + id + '-rule"' : '') + ' autocapitalize="none" spellcheck="false" required>' +
        '<button type="button" class="btn pw-toggle" data-pw-toggle="' + id + '" aria-controls="' + id + '" aria-pressed="false" aria-label="Show password">Show</button></div>' +
        (rule ? '<p class="hint" id="' + id + '-rule">At least ' + MIN_PASSWORD + ' characters. A short phrase you\'ll remember works well.</p>' : '') + '</div>';
    }
    function drawForms(keep) {
      var m = MODES[mode], email = ($('signin-email') && $('signin-email').value) || '';
      var alt = {
        signin: '<p class="small signin-alt">New here? <button type="button" class="btn link" data-mode-go="signup">Create an account</button></p>' +
          '<p class="small signin-alt">No password? <button type="button" class="btn link" data-mode-go="link">Email me a sign-in link instead</button></p>',
        signup: '<p class="small signin-alt">Already have an account? <button type="button" class="btn link" data-mode-go="signin">Sign in</button></p>',
        forgot: '<p class="small signin-alt"><button type="button" class="btn link" data-mode-go="signin">Back to sign in</button></p>',
        link: '<p class="small signin-alt"><button type="button" class="btn link" data-mode-go="signin">Sign in with a password instead</button></p>'
      }[mode];
      forms.innerHTML = '<form class="signin-form" id="signin-form" data-mode="' + mode + '" novalidate>' +
        (m.title ? '<h3 class="h4">' + m.title + '</h3>' : '') + (m.intro ? '<p class="small">' + m.intro + '</p>' : '') +
        '<div class="field"><label for="signin-email">Email</label><input type="email" id="signin-email" name="email" autocomplete="' + (m.pw ? 'username' : 'email') + '" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="you@school.org" required></div>' +
        (m.pw ? pwField('signin-password', m.pw, mode === 'signup' ? 'Choose a password' : 'Password', mode === 'signup') : '') +
        '<div class="signin-actions"><button type="submit" class="btn primary" id="signin-btn">' + m.button + '</button>' +
        (mode === 'signin' ? '<button type="button" class="btn link" data-mode-go="forgot">Forgot password?</button>' : '') + '</div>' +
        '<div class="ok small" id="signin-sent" role="status"></div><div class="error" id="signin-err" role="alert"></div>' + alt +
        (mode === 'link' && iosApp ? '<p class="small muted">On iPhone, this home-screen app keeps its own sign-in: a link from your email opens in Safari instead. Sign in here with a password to stay signed in in the app.</p>' : '') +
        '</form>';
      $('signin-email').value = email;
      if (keep) { $('signin-sent').textContent = keep.sent || ''; if (keep.err) $('signin-err').textContent = keep.err; }
    }
    function setMode(m, keep, focus) {
      mode = m; drawForms(keep);
      if (focus) { var f = $('signin-email').value ? ($('signin-password') || $('signin-btn')) : $('signin-email'); f.focus(); }
    }
    function unconfirmedHTML(email) {
      return 'Please confirm your email first: open the link in the email we sent when you made your account (check your spam folder). ' +
        '<button type="button" class="btn link" data-resend="' + esc(email) + '">Send the confirmation email again</button>';
    }
    function show(id, text, html) { var el = $(id); if (!el) return; if (html) el.innerHTML = text; else el.textContent = text; }

    // Set a new password: after a reset link (#acct-reset, above the signed-in line), and on My orders (#acct-pass).
    function newPasswordForm(prefix, title, intro, button, cancel) {
      var u = client.user() || {};
      return '<form class="signin-form" id="' + prefix + '-form" novalidate>' + (title ? '<h2 class="h3">' + title + '</h2>' : '') +
        (intro ? '<p class="small">' + intro + '</p>' : '') +
        '<input type="email" name="username" autocomplete="username" value="' + esc(u.email || '') + '" hidden readonly tabindex="-1">' +
        pwField(prefix + '-password', 'new-password', 'New password', true) +
        '<div class="signin-actions"><button type="submit" class="btn primary" id="' + prefix + '-save">' + button + '</button>' +
        (cancel ? '<button type="button" class="btn link" id="' + prefix + '-cancel">' + cancel + '</button>' : '') + '</div>' +
        '<div class="error" id="' + prefix + '-err" role="alert"></div></form>';
    }
    var reset = $('acct-reset');
    if (!reset) { reset = document.createElement('div'); reset.id = 'acct-reset'; reset.hidden = true; box.insertBefore(reset, $('acct-in')); }
    var note = $('acct-note');
    if (!note) { note = document.createElement('p'); note.id = 'acct-note'; note.className = 'ok small'; note.setAttribute('role', 'status'); $('acct-in').appendChild(note); }
    var pass = $('acct-pass'), passOpen = false;
    function drawPass() {
      if (!pass) return;
      var has = client.hasPassword();
      pass.innerHTML = passOpen
        ? newPasswordForm('setpw', has ? 'Change your password' : 'Set a password', has ? 'Choose a new password for this account.' : 'Next time, sign in with your email and this password: no email to wait for.', 'Save password', 'Cancel')
        : has ? '<p class="small"><button type="button" class="btn link" id="setpw-open">Change password</button></p>'
          : '<p class="small pass-prompt">Set a password so you don\'t need an email next time. <button type="button" class="btn" id="setpw-open">Set a password</button></p>';
    }

    var lastUser;
    function render() {
      var u = client.user();
      $('acct-out').hidden = !!u; $('acct-in').hidden = !u;
      if (u) $('acct-email').textContent = u.email || 'your account';
      var needReset = !!u && client.needsNewPassword();
      if (needReset && reset.hidden) {
        reset.innerHTML = newPasswordForm('reset', 'Set a new password', 'You opened the reset link, so you\'re signed in. Choose a new password for next time.', 'Save new password', 'Not now');
        reset.hidden = false;
      } else if (!needReset) { reset.hidden = true; reset.innerHTML = ''; }
      if (pass) { pass.hidden = !u || needReset; if (u && (!lastUser || lastUser.id !== u.id)) passOpen = false; if (u && !pass.contains(document.activeElement)) drawPass(); }
      if (!u) { note.textContent = ''; if (lastUser) setMode('signin'); }
      lastUser = u;
      if (root.PP && root.PP.setWho) root.PP.setWho(u);
      if (onUser) onUser(u);
    }

    // What an email link brought back (on load, or in a tab that already showed this page): say so once.
    function applyHash() {
      var hr = client.hashResult;
      if (!hr || hr.shown) return;
      hr.shown = true;
      if (hr.error) { setMode('signin'); show('signin-err', authMessage({ message: hr.error, code: hr.code }, 'link')); }
      else if (hr.type === 'signup') note.textContent = 'Your email is confirmed and you\'re signed in. Next time, sign in with your email and password.';
      else note.textContent = '';
    }
    drawForms();
    client.onChange(function () { render(); applyHash(); });

    function busy(btn, on) { btn.disabled = on; btn.setAttribute('aria-busy', on ? 'true' : 'false'); }
    function savePassword(prefix, done) {
      var pw = $(prefix + '-password'), err = $(prefix + '-err'), btn = $(prefix + '-save');
      err.textContent = '';
      if (pw.value.length < MIN_PASSWORD) { err.textContent = 'Please use at least ' + MIN_PASSWORD + ' characters.'; pw.focus(); return; }
      busy(btn, true);
      client.setPassword(pw.value).then(function () { pw.value = ''; done(); }, function (e) {
        err.textContent = authMessage(e, 'password'); busy(btn, false);
      });
    }

    box.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var go = t.getAttribute('data-mode-go');
      if (go) { setMode(go, null, true); return; }
      var tg = t.getAttribute('data-pw-toggle');
      if (tg) {
        var inp = $(tg), on = inp.type === 'password';
        inp.type = on ? 'text' : 'password';
        t.textContent = on ? 'Hide' : 'Show'; t.setAttribute('aria-pressed', on ? 'true' : 'false'); t.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
        return;
      }
      if (t.hasAttribute('data-resend')) {
        var to = t.getAttribute('data-resend'); busy(t, true);
        client.resendConfirm(to, back).then(function () {
          show('signin-err', ''); show('signin-sent', 'We sent the confirmation email to ' + to + ' again. Open the link once, then sign in here with your password.');
        }, function (er) { show('signin-err', authMessage(er, 'email')); });
        return;
      }
      if (t.id === 'signout-btn') { client.signOut(); return; }
      if (t.id === 'reset-cancel') { client.skipNewPassword(); return; }
      if (t.id === 'setpw-open') { passOpen = true; drawPass(); $('setpw-password').focus(); return; }
      if (t.id === 'setpw-cancel') { passOpen = false; drawPass(); return; }
    });

    box.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (f.id === 'reset-form') return savePassword('reset', function () { note.textContent = 'Your new password is saved. Next time, sign in with your email and this password.'; });
      if (f.id === 'setpw-form') return savePassword('setpw', function () { passOpen = false; drawPass(); note.textContent = 'Your password is saved. Next time, sign in with your email and this password.'; });
      if (f.id !== 'signin-form') return;
      var email = $('signin-email').value.trim(), pwEl = $('signin-password'), pw = pwEl ? pwEl.value : '', btn = $('signin-btn');
      show('signin-err', ''); show('signin-sent', '');
      if (!EMAIL_RE.test(email)) { show('signin-err', 'Please type your email address.'); $('signin-email').focus(); return; }
      if (pwEl && !pw) { show('signin-err', 'Please type your password.'); pwEl.focus(); return; }
      if (mode === 'signup' && pw.length < MIN_PASSWORD) { show('signin-err', 'Please use at least ' + MIN_PASSWORD + ' characters for your password.'); pwEl.focus(); return; }
      busy(btn, true);
      var done = function () { busy(btn, false); };
      if (mode === 'signin') {
        client.signInPassword(email, pw).then(function () { pwEl.value = ''; done(); }, function (er) {
          var m = authMessage(er, 'password');
          if (m === 'unconfirmed') show('signin-err', unconfirmedHTML(email), true); else show('signin-err', m);
          done();
        });
      } else if (mode === 'signup') {
        client.signUp(email, pw, back).then(function (r) {
          pwEl.value = '';
          if (r.confirm) setMode('signin', { sent: 'Almost done. Check your email (' + email + ') once to confirm your account, then sign in here with your password.' });
          done();
        }, function (er) { show('signin-err', authMessage(er, 'password')); done(); });
      } else if (mode === 'forgot') {
        client.recover(email, back).then(function () {
          show('signin-sent', 'If there\'s an account for ' + email + ', we\'ve emailed it a link to set a new password. Open it on this device (check your spam folder too).'); done();
        }, function (er) { show('signin-err', authMessage(er, 'email')); done(); });
      } else {
        client.signIn(email, back).then(function () {
          show('signin-sent', 'Check your email (' + email + ') and open the link on this device. It brings you back here signed in.'); done();
        }, function (er) { show('signin-err', authMessage(er, 'email')); done(); });
      }
    });
    render(); applyHash();
    client.check().then(render);
  }

  root.PPBackend = { load: load, makeClient: makeClient, safeKey: safeKey, sha256Hex: sha256Hex, wireSignIn: wireSignIn, authMessage: authMessage, MIN_PASSWORD: MIN_PASSWORD };
})(window);
