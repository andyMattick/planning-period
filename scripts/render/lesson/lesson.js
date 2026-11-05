/* Interactive lesson page (docs/KINDS-LESSONS.md; the standard: docs/INTERACTIVE-STANDARD.md).
   Runs after apps/engine.js and lesson/forms.js; reads window.PPL_DATA (and, in the teacher copy only, PPL_TEACHER).
   Adapted from the owner's Pet World note-sheet engine (scripts/notes/engine/notes.js there): hashed answers, the wait
   after a miss, "write what you were thinking" after two misses, My notes, backups and save codes that merge, the
   teacher copy's F2. Nothing is sent anywhere; work is saved in localStorage on this device only. */
(function () {
  'use strict';
  var P = window.PPA, F = window.PPL_FORMS, D = window.PPL_DATA, esc = P.esc;
  var T = window.PPL_TEACHER || null;           // teacher copy (C1–C3)
  var tmode = 'answers';                        // teacher copy: 'answers' | 'blank' (F2 switches)
  var KEY = D.key, WAITS = D.waits || [5, 10, 15, 20], THINK = D.thinkWords || 4;
  var ORD = F.orders(D);                        // Q2: display order of every choice item (original indexes)
  var PAGES = D.pages, byPage = {}, ITEM = {}, PAGE_OF = {};
  PAGES.forEach(function (p, i) { p.n = i; byPage[p.id] = p; (p.items || []).forEach(function (it) { ITEM[it.id] = it; PAGE_OF[it.id] = p.id; }); });
  var LAB_N = {}; (function () { var n = 0; PAGES.forEach(function (p) { if (p.part === 'lab') LAB_N[p.id] = ++n; }); })();
  function $(id) { return document.getElementById(id); }
  function words(s) { return P.words(s); }
  function clock(t) { try { return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }

  /* ================= saving (S1–S4) ================= */
  function defaults() {
    return { v: 1, lesson: D.lessonId, name: '', at: 0, build: D.build.n, page: '', items: {}, blanks: {}, widgets: {}, open: {}, frq: {}, tq: { revealed: false, q: '', a: '' }, notes: {}, extra: '', stuck: [] };
  }
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  /* S3: merge over defaults; anything the save has (even ids this build doesn't know) is kept, nothing is cleared */
  function mergeOver(o) {
    var S = defaults();
    if (!isObj(o)) return S;
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (isObj(S[k]) && isObj(v)) { Object.keys(v).forEach(function (j) { S[k][j] = v[j]; }); }
      else if (Array.isArray(S[k])) { if (Array.isArray(v)) S[k] = v; }
      else if (typeof S[k] === 'string') { if (typeof v === 'string') S[k] = v; }
      else if (typeof S[k] === 'number') { if (typeof v === 'number') S[k] = v; }
      else if (S[k] === undefined) S[k] = v;
    });
    return S;
  }
  function longer(a, b) { a = a || ''; b = b || ''; return String(b).trim().length > String(a).trim().length ? b : a; }
  function union(a, b) { var out = (a || []).slice(); (b || []).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); }); return out; }
  function stWins(a, b) {
    if (!isObj(a)) return b; if (!isObj(b)) return a;
    var w = (b.ok && !a.ok) ? b : a, o = {}; Object.keys(a).concat(Object.keys(b)).forEach(function (k) { o[k] = w[k] !== undefined ? w[k] : (a[k] !== undefined ? a[k] : b[k]); });
    o.wrong = union(a.wrong, b.wrong); o.misses = Math.max(a.misses || 0, b.misses || 0); o.think = longer(a.think, b.think);
    if (a.rows || b.rows) o.rows = (a.rows || []).length >= (b.rows || []).length ? a.rows : b.rows;
    return o;
  }
  /* backups and save codes merge: right answers win, longer writing wins, different notes are kept side by side */
  function mergeSaves(cur, inc) {
    var out = mergeOver(cur), b = mergeOver(inc);
    ['items', 'blanks', 'widgets'].forEach(function (f) { Object.keys(b[f]).forEach(function (k) { out[f][k] = stWins(out[f][k], b[f][k]); }); });
    ['open', 'frq'].forEach(function (f) { Object.keys(b[f]).forEach(function (k) { out[f][k] = longer(out[f][k], b[f][k]); }); });
    Object.keys(b.notes).forEach(function (k) {
      var x = out.notes[k], y = b.notes[k];
      if (!x || !x.text) out.notes[k] = y;
      else if (y && y.text && y.text.trim() !== x.text.trim() && x.text.indexOf(y.text.trim()) < 0) out.notes[k] = { text: x.text + '\n— from a backup —\n' + y.text, src: x.src || y.src, at: Math.max(x.at || 0, y.at || 0) };
    });
    if (b.extra && out.extra.indexOf(b.extra.trim()) < 0) out.extra = out.extra ? out.extra + '\n' + b.extra : b.extra;
    out.tq = { revealed: !!(out.tq.revealed || b.tq.revealed), q: out.tq.q || b.tq.q, a: longer(out.tq.a, b.tq.a) };
    var seen = {}; out.stuck = out.stuck.concat(b.stuck).filter(function (s) { var k = s && (s.id + '|' + s.a + '|' + s.at); if (!s || seen[k]) return false; seen[k] = 1; return true; });
    out.name = out.name || b.name; out.at = Math.max(out.at || 0, b.at || 0);
    return out;
  }
  var S = T ? defaults() : mergeOver(P.loadJSON(KEY));
  var saveTimer = null;
  function save() {
    if (T) return;                              // C3: the teacher copy never saves (only Reset lesson touches storage)
    S.at = Date.now(); S.build = D.build.n;
    var ok = P.saveJSON(KEY, S);
    var el = $('saved');
    if (el) el.textContent = ok ? 'Saved automatically at ' + clock(S.at) : 'Not saved: this browser is blocking saving.';
    if (!ok) showBlocked();
  }
  function saveSoon() { if (T) return; clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); }
  function showBlocked() { var b = $('blocked'); if (b) b.hidden = false; }

  function b64u(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function backupObj() { return { app: 'pp-lesson', key: KEY, lesson: D.lessonId, build: D.build.n, at: new Date().toISOString(), data: S }; }
  /* the save code: deflate-compressed where the browser can, plain where it can't (both load anywhere that can read them) */
  function saveCode() {
    var json = JSON.stringify(backupObj());
    try {
      if (typeof CompressionStream === 'function') {
        var st = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        return new Response(st).arrayBuffer().then(function (b) { return 'PPL1.' + b64u(new Uint8Array(b)); }, function () { return 'PPL0.' + b64u(new TextEncoder().encode(json)); });
      }
    } catch (e) { }
    return Promise.resolve('PPL0.' + b64u(new TextEncoder().encode(json)));
  }
  function readCode(code) {
    code = String(code || '').replace(/\s+/g, '');
    try {
      if (code.indexOf('PPL0.') === 0) return Promise.resolve(JSON.parse(new TextDecoder().decode(unb64u(code.slice(5)))));
      if (code.indexOf('PPL1.') === 0) {
        if (typeof DecompressionStream !== 'function') return Promise.reject(new Error('old browser'));
        var st = new Blob([unb64u(code.slice(5))]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Response(st).text().then(function (t) { return JSON.parse(t); });
      }
    } catch (e) { return Promise.reject(e); }
    return Promise.reject(new Error('not a save code'));
  }
  function restoreFrom(o) {
    if (!isObj(o) || o.app !== 'pp-lesson' || o.lesson !== D.lessonId || !isObj(o.data)) return 'That backup is not for this lesson.';
    S = mergeSaves(S, o.data); save(); recheck(); route();
    return 'Restored. Nothing on this device was erased.';
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function copyText(txt, done, fail) {
    var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (er) { fail(); } ta.remove(); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback(); } catch (e) { fallback(); }
  }

  /* ================= state helpers ================= */
  function itemSt(id) { return S.items[id] || (S.items[id] = { v: '', ok: false, wrong: [], misses: 0, until: 0, think: '', hint: false }); }
  function blankSt(id) { return S.blanks[id] || (S.blanks[id] = { v: '', ok: false, wrong: [], misses: 0, until: 0, hint: false }); }
  function wSt(id) { return S.widgets[id] || (S.widgets[id] = { ok: false, wrong: [], misses: 0, until: 0, think: '', hint: false }); }
  function stOf(k) { var t = k.charAt(0), id = k.slice(2); return t === 'i' ? itemSt(id) : t === 'b' ? blankSt(id) : wSt(id); }
  function waitLeft(st) { return Math.max(0, Math.ceil(((st.until || 0) - Date.now()) / 1000)); }
  function needThink(st) { return !st.ok && (st.misses || 0) >= 2 && words(st.think) < THINK; }
  /* T3: a miss adds a wait (5 s, 10 s, 15 s, then 20 s) and is listed under "Where I got stuck" */
  function missed(st, rec) {
    st.misses = (st.misses || 0) + 1;
    st.until = Date.now() + 1000 * WAITS[Math.min(st.misses, WAITS.length) - 1];
    S.stuck.push({ id: rec.id, page: rec.page, q: rec.q, a: rec.a, at: Date.now() });
  }
  function itemDone(it) {
    if (it.type === 'open') return words(S.open[it.id]) >= it.minWords;
    return !!(S.items[it.id] && S.items[it.id].ok);
  }
  function widgetDone(W) {
    var st = S.widgets[W.id] || {};
    if (W.mechanic === 'simulate') return (st.rows || []).length >= W.runs;
    if (W.mechanic === 'predict-then-reveal') return !!st.revealed;
    if (W.mechanic === 'hands-on') return W.fields.every(function (f) { return String((st.vals || {})[f.id] || '').trim() !== '' && P.parseNum(String(st.vals[f.id])); });
    return !!st.ok;
  }
  function pageDone(p) {
    if (p.part === 'notes') return false;
    if ((p.items || []).some(function (it) { return !itemDone(it); })) return false;
    if (p.blanks && Object.keys(p.blanks).some(function (id) { return !(S.blanks[id] && S.blanks[id].ok); })) return false;
    if (p.widget && !widgetDone(p.widget)) return false;
    if (p.frq && words(S.frq[p.frq.id]) < 20) return false;
    if (p.tq && words(S.tq.a) < 8) return false;
    return true;
  }
  /* L7: a rule card opens after the required labs above it. L8: nothing else is locked unless the teacher asked. */
  function lockReason(p) {
    if (T) return '';
    if (p.part === 'rule' && p.after) { var left = p.after.filter(function (id) { return !pageDone(byPage[id]); }); if (left.length) return 'This rule card opens after you finish ' + left.map(function (id) { return label(byPage[id]); }).join(', ') + '.'; }
    if (D.locking) for (var i = 0; i < p.n; i++) { var q = PAGES[i]; if (!q.optional && q.part !== 'notes' && !pageDone(q)) return 'Your teacher set this lesson to open in order. Finish ' + label(q) + ' first.'; }
    return '';
  }
  function label(p) {
    return p.part === 'lab' ? 'Lab ' + LAB_N[p.id] : p.part === 'hook' ? 'Hook' : p.part === 'rule' ? 'Rule card' : p.part === 'check' ? 'Check' : p.part === 'bell' ? 'Bell ringer' : 'My notes';
  }
  var PART_ICON = { bell: '🔔', hook: '🎣', lab: '🧪', rule: '📜', check: '🎯', notes: '📓' };

  /* ================= page shell ================= */
  var cur = '';
  function shell() {
    var h = [];
    h.push('<div class="shell">');
    h.push('<aside class="side" id="side" aria-label="Lesson pages"><div class="side-h"><b>' + esc(D.title) + '</b><span class="muted small">' + D.minutes.required + ' min' + (D.minutes.optional ? ' + ' + D.minutes.optional + ' optional' : '') + '</span></div><ol class="navl" id="navl"></ol></aside>');
    h.push('<main class="main"><div class="topbar no-print"><div class="row"><button type="button" class="navbtn" id="navbtn" aria-controls="side" aria-expanded="false">☰ Pages</button><span class="title">' + esc(D.title) + '</span><button type="button" id="addnote" title="Add a note to this page">✎ Note</button><button type="button" id="theme" aria-label="Color theme">◐ <span id="themeName"></span></button></div>' +
      '<div class="bar" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" id="pbar"><i></i></div><div class="row small muted tight"><span id="ptext"></span><span id="saved">' + (T ? '' : (S.at ? 'Saved automatically at ' + clock(S.at) : 'Your work saves on this device as you go.')) + '</span></div></div>');
    h.push('<div class="notice" id="blocked" hidden>This browser is blocking saving, so your work will be lost when you close the page. Checking still works. Try a normal (not private) window, or copy a save code from My notes before you leave.</div>');
    h.push('<div class="print-only nameline">Name: ______________________________ &nbsp; Date: ______________</div>');
    h.push('<div id="pagebox"></div>');
    h.push('<div class="foot" id="foot"></div>');
    h.push('</main></div>');
    if (T) h.push('<div class="tbar" id="tbar" role="status"></div>');
    $('app').innerHTML = h.join('');
  }
  function nav() {
    var h = [];
    PAGES.forEach(function (p) {
      var done = pageDone(p), lk = lockReason(p);
      h.push('<li class="' + (p.id === cur ? 'on ' : '') + (done ? 'done ' : '') + (lk ? 'locked' : '') + '"><a href="#/' + p.id + '" data-part="' + p.part + '"><span class="ic">' + (done ? '✓' : lk ? '🔒' : PART_ICON[p.part]) + '</span><span class="nt"><span class="nl">' + esc(label(p)) + '</span> ' + esc(p.title) +
        (p.part !== 'notes' ? '<span class="nm">' + p.minutes + ' min' + (p.optional ? ' · optional' : '') + '</span>' : '') + '</span></a></li>');
    });
    $('navl').innerHTML = h.join('');
    progress();
  }
  function progress() {
    var req = PAGES.filter(function (p) { return !p.optional && p.part !== 'notes'; }), done = req.filter(pageDone).length;
    var pct = req.length ? Math.round(100 * done / req.length) : 0, bar = $('pbar');
    bar.firstChild.style.width = pct + '%'; bar.setAttribute('aria-valuenow', pct);
    $('ptext').textContent = done + ' of ' + req.length + ' parts done' + (done === req.length ? ' · lesson finished ⭐' : '');
  }
  function go(id) {
    if (!byPage[id]) id = PAGES[0].id;
    if (location.hash !== '#/' + id) { try { history.replaceState(null, '', '#/' + id); } catch (e) { try { location.hash = '#/' + id; } catch (er) { } } }
    cur = id; S.page = id; saveSoon();
    document.body.classList.remove('navopen'); var nb = $('navbtn'); if (nb) nb.setAttribute('aria-expanded', 'false');
    renderPage();
    try { window.scrollTo(0, 0); } catch (e) { }
  }
  function route() { var m = String(location.hash || '').match(/^#\/([a-z0-9-]+)/); go(m ? m[1] : (S.page && byPage[S.page] ? S.page : PAGES[0].id)); }

  /* ================= one page ================= */
  function renderPage() {
    var p = byPage[cur], h = [], lk = lockReason(p);
    h.push('<section class="page" id="page-' + p.id + '" data-page="' + p.id + '" data-part="' + p.part + '"' + (p.mechanic ? ' data-mechanic="' + p.mechanic + '"' : '') + ' data-minutes="' + p.minutes + '"' + (p.optional ? ' data-optional="true"' : '') + '>');
    h.push('<header class="ph"><p class="chips"><span class="chip part">' + PART_ICON[p.part] + ' ' + esc(label(p)) + '</span>' + (p.part !== 'notes' ? '<span class="chip">about ' + p.minutes + ' min</span>' : '') + (p.optional && p.part !== 'notes' ? '<span class="chip opt">Optional: it never blocks finishing</span>' : '') + (p.mechanic ? '<span class="chip mech">' + esc(mechName(p.mechanic)) + '</span>' : '') + '</p><h1>' + esc(p.title) + '</h1></header>');
    if (p.part === 'notes') { h.push(notesHTML()); }
    else if (lk) { h.push('<div class="card locked-card"><p><b>🔒 Not yet.</b> ' + esc(lk) + '</p><p class="small muted">Nothing is lost: come back when you’re ready.</p></div>'); }
    else {
      if (p.story) h.push('<div class="card story"><p>' + esc(p.story) + '</p></div>');
      if (p.intro) h.push('<p>' + esc(p.intro) + '</p>');
      if (p.figure) h.push('<div class="fig">' + p.figure + '</div>');
      if (p.widget) h.push(widgetHTML(p.widget));
      if (p.sentences) h.push(sentencesHTML(p));
      if (p.keyIdeas) h.push('<div class="card"><h2>Key ideas</h2><ul>' + p.keyIdeas.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>');
      (p.items || []).forEach(function (it, i) { h.push(itemHTML(it, i)); });
      if (p.frq) h.push(frqHTML(p.frq));
      if (p.tq) h.push(tqHTML());
    }
    if (p.part !== 'notes') h.push(noteBoxHTML(p));
    var i = p.n;
    h.push('<nav class="pager no-print">' + (i > 0 ? '<a class="btn" href="#/' + PAGES[i - 1].id + '">← ' + esc(label(PAGES[i - 1])) + '</a>' : '<span></span>') + (i < PAGES.length - 1 ? '<a class="btn primary" href="#/' + PAGES[i + 1].id + '">' + esc(label(PAGES[i + 1])) + ' →</a>' : '') + '</nav>');
    h.push('</section>');
    $('pagebox').innerHTML = h.join('');
    $('foot').innerHTML = '<span class="build">Build ' + D.build.n + ' (' + esc(D.build.note) + ')</span><br>' + esc(D.notice) + '<br>Saved only on this device: nothing is sent anywhere.';
    nav();
    if (T) teacherPaint();
    tick();
  }
  function mechName(m) { return { 'simulate': '🎛️ Simulate', 'sort': '🗂️ Sort', 'build': '🧱 Build', 'predict-then-reveal': '🔮 Predict, then reveal', 'find-the-mistake': '🔍 Find the mistake', 'slider-hunt': '🎚️ Slider hunt', 'hands-on': '✋ Off the board' }[m] || m; }

  /* ---------- the miss flow pieces shared by items, blanks and widgets ---------- */
  function flowHTML(k, hint, checkLabel) {
    var st = stOf(k), h = [];
    if (!st.ok) {
      if ((st.misses || 0) >= 2) h.push('<div class="think"><label for="th-' + k + '"><b>Before you try again:</b> in one sentence, what were you thinking?</label><textarea id="th-' + k + '" rows="2" data-think="' + k + '">' + esc(st.think) + '</textarea></div>');
      h.push('<div class="row no-print acts"><button type="button" class="primary" data-check="' + k + '" data-wait="' + k + '">' + (checkLabel || 'Check') + '</button>' + (hint ? '<button type="button" data-hint="' + k + '">💡 Hint</button>' : '') + '</div>');
      if (hint) h.push('<div class="fb info" data-hintbox="' + k + '"' + (st.hint || (st.misses >= 2 && !needThink(st)) ? '' : ' hidden') + '><b class="mark">💡 Hint:</b> ' + esc(hint) + '</div>');
    }
    return h.join('');
  }
  function fbHTML(st) {
    if (st.ok) return '<div class="fb ok"><b class="mark">✓ Right!</b> ' + esc(st.ex || '') + '</div>';
    var h = '';
    if (st.changed) h += '<div class="fb info">This changed since you answered it. Try it again.</div>';
    if (st.msg) h += '<div class="fb bad"><b class="mark">✗ Not yet.</b> ' + esc(st.msg) + '</div>';
    return h;
  }

  /* ---------- questions ---------- */
  function itemHTML(it, i) {
    var st = itemSt(it.id), h = [], k = 'i:' + it.id, done = itemDone(it);
    h.push('<div class="card q' + (done ? ' is-right' : '') + '" id="q-' + it.id + '" data-id="' + it.id + '" data-type="' + it.type + '">');
    h.push('<p class="qp"><b>' + (i + 1) + '.</b> ' + esc(it.prompt) + (it.level ? '<span class="tag">Level ' + esc(it.level) + '</span>' : '') + '</p>');
    if (it.figure) h.push('<div class="fig">' + it.figure + '</div>');
    if (it.type === 'mc') {
      h.push('<div class="choices" role="group" aria-label="Choices">');
      ORD[it.id].forEach(function (o, slot) {
        var sel = String(st.v) === String(o), nope = (st.wrong || []).indexOf(o) >= 0, right = st.ok && sel;
        h.push('<button type="button" class="choice' + (sel ? ' sel' : '') + (nope ? ' nope' : '') + (right ? ' right' : '') + '" data-pick="' + it.id + '" data-orig="' + o + '" aria-pressed="' + sel + '"' + (st.ok || nope ? ' disabled' : '') + '><span class="l">' + String.fromCharCode(65 + slot) + '.</span><span>' + esc(it.choices[o]) + '</span>' + (nope ? '<span class="x" aria-label="tried">✗</span>' : '') + '</button>');
      });
      h.push('</div>');
    } else if (it.type === 'open') {
      h.push('<label class="sr" for="o-' + it.id + '">Your answer</label><textarea id="o-' + it.id + '" data-open="' + it.id + '" rows="4" placeholder="Write at least ' + it.minWords + ' words, in full sentences.">' + esc(S.open[it.id] || '') + '</textarea><p class="small muted" data-wc="' + it.id + '">' + wcText(S.open[it.id], it.minWords) + '</p>');
    } else {
      h.push('<div class="row"><label class="sr" for="a-' + it.id + '">Your answer</label><input class="grow" type="text" id="a-' + it.id + '" data-typed="' + it.id + '" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="' + (it.type === 'numeric' ? 'decimal' : 'text') + '" value="' + esc(st.v) + '"' + (st.ok ? ' readonly' : '') + ' placeholder="' + (it.type === 'numeric' ? 'Type a number' : 'Type your answer') + '">' + (it.unit ? '<span class="muted">' + esc(it.unit) + '</span>' : '') + '</div>');
      if ((st.wrong || []).length && !st.ok) h.push('<p class="small muted tried">Tried: ' + st.wrong.map(esc).join(' · ') + '</p>');
    }
    if (it.type !== 'open') { h.push('<div aria-live="polite">' + fbHTML(st) + '</div>'); h.push(flowHTML(k, it.hint)); }
    h.push('<div class="tkey" data-tkey="' + it.id + '" hidden></div>');
    h.push('</div>');
    return h.join('');
  }
  function wcText(t, min) { var n = words(t); return n + ' word' + (n === 1 ? '' : 's') + (n >= min ? ' · ✓ Saved. It goes on your My notes page.' : ' · write at least ' + min + '.'); }
  function checkItem(id) {
    var it = ITEM[id], st = itemSt(id), p = PAGE_OF[id];
    if (st.ok || waitLeft(st) || needThink(st)) return;
    var raw = it.type === 'mc' ? st.v : ($('a-' + id) || {}).value;
    if (raw === '' || raw == null) { st.msg = it.type === 'mc' ? 'Pick an answer first.' : 'Type an answer first.'; renderPage(); return; }
    var judged = it.type === 'mc' ? F.judgeForms(id, it, ['opt:' + Number(raw)]) : F.judgeTyped(id, it, raw, it.type);
    judged.then(function (r) {
      if (r.res === 'unread') { st.msg = it.type === 'numeric' ? 'Type a number, like 12, 2.5, 3/4 or 40%.' : 'Type an answer first.'; renderPage(); return; }
      var shown = it.type === 'mc' ? it.choices[Number(raw)] : String(raw);
      if (r.res === 'ok') {
        st.ok = true; st.msg = ''; st.changed = false; st.ex = (r.ex && r.ex.why) || ''; st.v = String(raw);
        st.q = it.prompt; st.a = shown; st.at = Date.now();               // S4: the note keeps its own text
      } else {
        if (it.type === 'mc') { if (st.wrong.indexOf(Number(raw)) < 0) st.wrong.push(Number(raw)); st.v = ''; }
        else if (st.wrong.indexOf(shown) < 0) st.wrong.push(shown);
        st.msg = r.res === 'sign' ? 'You have the right size. Check the sign.' : r.res === 'miss' ? r.msg : (it.wrong || 'That isn’t it. Look again at what the question asks.');
        missed(st, { id: id, page: p, q: it.prompt, a: shown });
      }
      saveSoon(); renderPage();
    });
  }

  /* ---------- fill-in blanks (L6) ---------- */
  function sentencesHTML(p) {
    var h = ['<div class="card blanks" data-blanks="' + p.id + '">'];
    p.sentences.forEach(function (s) {
      h.push('<p class="sent">' + esc(s).replace(/\{([a-z0-9-]+)\}/g, function (m, id) {
        var b = p.blanks[id], st = blankSt(id);
        return '<span class="bw"><label class="sr" for="bl-' + id + '">blank</label><input type="text" class="blank' + (st.ok ? ' good' : (st.wrong || []).length ? ' miss' : '') + '" id="bl-' + id + '" data-blank="' + id + '" size="' + b.size + '" style="width:' + (b.size * 0.62 + 1.6) + 'em" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(st.v) + '"' + (st.ok ? ' readonly' : '') + '></span>';
      }) + '</p>');
    });
    Object.keys(p.blanks).forEach(function (id) {
      var st = blankSt(id), b = p.blanks[id];
      if (st.ok && st.ex) h.push('<div class="fb ok small"><b class="mark">✓</b> ' + esc(st.ex) + '</div>');
      else if (!st.ok && st.msg) h.push('<div class="fb bad small"><b class="mark">✗</b> “' + esc(st.v) + '”: ' + esc(st.msg) + '</div>');
      if (!st.ok && (st.hint || st.misses >= 2)) h.push('<div class="fb info small"><b class="mark">💡</b> ' + esc(b.hint) + '</div>');
    });
    var open = Object.keys(p.blanks).filter(function (id) { return !blankSt(id).ok; });
    if (open.length) h.push('<div class="row no-print acts"><button type="button" class="primary" data-checkblanks="' + p.id + '" data-wait="p:' + p.id + '">Check my blanks</button><button type="button" data-blankhint="' + p.id + '">💡 Hint</button></div>');
    h.push('</div>');
    return h.join('');
  }
  function blankWait(p) { return Math.max.apply(null, [0].concat(Object.keys(p.blanks).map(function (id) { return waitLeft(blankSt(id)); }))); }
  function checkBlanks(pid) {
    var p = byPage[pid];
    if (blankWait(p)) return;
    var jobs = Object.keys(p.blanks).map(function (id) {
      var st = blankSt(id), el = $('bl-' + id), raw = el ? el.value : '';
      if (st.ok || !String(raw).trim()) return Promise.resolve();
      st.v = raw;
      return F.judgeTyped(id, p.blanks[id], raw, p.blanks[id].num ? 'numeric' : 'short').then(function (r) {
        if (r.res === 'ok') { st.ok = true; st.msg = ''; st.changed = false; st.ex = (r.ex && r.ex.why) || ''; st.s = sentenceOf(p, id); st.at = Date.now(); }
        else if (r.res !== 'unread') {
          if (st.wrong.indexOf(raw) < 0) st.wrong.push(raw);
          st.msg = r.res === 'miss' ? r.msg : r.res === 'sign' ? 'Check the sign.' : (p.blanks[id].wrong || 'Not this word. Read the whole sentence again.');
          missed(st, { id: id, page: pid, q: sentenceOf(p, id), a: raw });
        }
      });
    });
    Promise.all(jobs).then(function () { saveSoon(); renderPage(); });
  }
  function sentenceOf(p, id) { var s = p.sentences.filter(function (x) { return x.indexOf('{' + id + '}') >= 0; })[0] || ''; return s.replace(/\{([a-z0-9-]+)\}/g, function (m, b) { return b === id ? '____' : '…'; }); }
  function filledSentence(p, s) { return s.replace(/\{([a-z0-9-]+)\}/g, function (m, id) { var st = S.blanks[id]; return st && st.ok ? '[' + st.v + ']' : '____'; }); }

  /* ---------- the six mechanics, plus off-the-board (L3, L5) ---------- */
  function widgetHTML(W) {
    var st = wSt(W.id), k = 'w:' + W.id, h = ['<div class="card widget w-' + W.mechanic + (widgetDone(W) ? ' is-done' : '') + '" data-widget="' + W.id + '" data-mechanic="' + W.mechanic + '">'];
    if (W.prompt) h.push('<p class="wp">' + esc(W.prompt) + '</p>');
    if (W.figure) h.push('<div class="fig">' + W.figure + '</div>');
    var M = W.mechanic;
    if (M === 'simulate') h.push(simHTML(W, st));
    if (M === 'predict-then-reveal') {
      h.push('<div class="choices">' + W.options.map(function (o, i) { var on = st.pick === i; return '<button type="button" class="choice' + (on ? ' sel' : '') + '" data-predict="' + W.id + '" data-i="' + i + '" aria-pressed="' + on + '"' + (st.revealed ? ' disabled' : '') + '><span class="l">' + String.fromCharCode(65 + i) + '.</span><span>' + esc(o) + '</span></button>'; }).join('') + '</div>');
      if (!st.revealed) h.push('<div class="row acts no-print"><button type="button" class="primary" data-reveal="' + W.id + '"' + (st.pick == null ? ' disabled' : '') + '>Lock in my prediction and reveal</button></div>');
      else h.push('<div class="reveal card"><p><b>Reveal:</b> ' + esc(W.reveal) + '</p>' + (W.revealFigure ? '<div class="fig">' + W.revealFigure + '</div>' : '') + '<label for="pr-' + W.id + '" class="small"><b>Were you right? What surprised you?</b> (optional)</label><textarea id="pr-' + W.id + '" rows="2" data-wnote="' + W.id + '">' + esc(st.note || '') + '</textarea></div>');
    }
    if (M === 'sort') {
      h.push('<div class="sortlist">');
      W.cards.forEach(function (c) {
        var cs = (st.cards || {})[c.id] || {}, right = cs.ok;
        h.push('<div class="sortcard' + (right ? ' good' : cs.bad ? ' miss' : '') + '" data-card="' + c.id + '"><div class="ct">' + esc(c.text) + '</div><div class="bins">' + W.bins.map(function (b) {
          var on = cs.bin === b.id, nope = (cs.wrong || []).indexOf(b.id) >= 0;
          return '<button type="button" class="binbtn' + (on ? ' sel' : '') + (nope ? ' nope' : '') + '" data-sort="' + W.id + '" data-c="' + c.id + '" data-b="' + b.id + '" aria-pressed="' + on + '"' + (right || nope ? ' disabled' : '') + '>' + esc(b.label) + (nope ? ' ✗' : '') + '</button>';
        }).join('') + '</div>' + (right && cs.ex ? '<div class="small okt">✓ ' + esc(cs.ex) + '</div>' : cs.bad ? '<div class="small badt">✗ ' + esc(c.miss) + '</div>' : '') + '</div>');
      });
      h.push('</div>');
    }
    if (M === 'build') {
      var seq = st.seq || [];
      h.push('<div class="slots" aria-label="Your build">');
      for (var i = 0; i < W.slots; i++) h.push('<button type="button" class="slot' + (seq[i] ? ' full' : '') + '" data-unslot="' + W.id + '" data-i="' + i + '"' + (st.ok ? ' disabled' : '') + '>' + (seq[i] ? esc(seq[i]) : '<span class="muted">' + (i + 1) + '</span>') + '</button>');
      h.push('</div>');
      if (!st.ok) h.push('<div class="tiles2">' + W.tiles.map(function (t, j) { return '<button type="button" class="tile2" data-tile="' + W.id + '" data-j="' + j + '">' + esc(t) + '</button>'; }).join('') + '<button type="button" data-clear="' + W.id + '">Clear</button></div>');
      if ((st.wrong || []).length && !st.ok) h.push('<p class="small muted tried">Tried: ' + st.wrong.map(esc).join(' · ') + '</p>');
    }
    if (M === 'find-the-mistake') {
      h.push('<ol class="steps2">' + W.steps.map(function (s, i) {
        var nope = (st.wrong || []).indexOf(i) >= 0, right = st.ok && st.step === i;
        return '<li><button type="button" class="stepbtn' + (nope ? ' nope' : '') + (right ? ' right' : '') + (st.pick === i ? ' sel' : '') + '" data-step="' + W.id + '" data-i="' + i + '"' + (st.ok || nope ? ' disabled' : '') + '><span class="l">Step ' + (i + 1) + '</span> ' + esc(s) + '</button>' + (nope && (st.msgs || {})[i] ? '<div class="small badt">✗ ' + esc(st.msgs[i]) + '</div>' : '') + '</li>';
      }).join('') + '</ol>');
    }
    if (M === 'slider-hunt') {
      var v = st.x != null ? st.x : W.slider.value;
      h.push('<label class="sl"><span>' + esc(W.slider.label) + ': <b data-sv="' + W.id + '">' + F.fmt(v) + '</b> ' + esc(W.slider.unit) + '</span><input type="range" min="' + W.slider.min + '" max="' + W.slider.max + '" step="' + W.slider.step + '" value="' + v + '" data-slide="' + W.id + '"' + (st.ok ? ' disabled' : '') + '></label>');
      h.push('<div class="readout" data-readout="' + W.id + '">' + readoutHTML(W, v) + '</div>');
      if ((st.wrong || []).length && !st.ok) h.push('<p class="small muted tried">Tried: ' + st.wrong.map(function (x) { return F.fmt(x); }).join(' · ') + '</p>');
    }
    if (M === 'hands-on') h.push(handsHTML(W, st));
    if (['sort', 'build', 'find-the-mistake', 'slider-hunt'].indexOf(M) >= 0) {
      h.push('<div aria-live="polite">' + fbHTML(st) + '</div>');
      h.push(flowHTML(k, W.hint, M === 'sort' ? 'Check my sort' : M === 'slider-hunt' ? 'This is it' : M === 'find-the-mistake' ? 'Check this step' : 'Check my build'));
    }
    h.push('<div class="tkey" data-tkey="' + W.id + '" hidden></div></div>');
    return h.join('');
  }
  function readoutHTML(W, x) { return W.readout.map(function (r) { var v; try { v = F.evalExpr(r.expr, { x: x }); } catch (e) { v = NaN; } return '<span class="ro"><span class="muted small">' + esc(r.label) + '</span> <b>' + F.fmt(v, r.places) + '</b></span>'; }).join(''); }
  function isRandom(W) { return W.outputs.some(function (o) { return /rand|binom|uniform/.test(o.expr); }); }
  function simVals(W, st) { var v = {}; W.vars.forEach(function (x) { v[x.id] = (st.vals || {})[x.id] != null ? st.vals[x.id] : x.value; }); return v; }
  function simCalc(W, vals) {
    var out = {};
    W.outputs.forEach(function (o, i) { try { out['o' + i] = F.evalExpr(o.expr, vals); } catch (e) { out['o' + i] = NaN; } });
    var all = {}; Object.keys(vals).forEach(function (k) { all[k] = vals[k]; }); W.outputs.forEach(function (o, i) { all['out' + (i + 1)] = out['o' + i]; });
    var verdict = W.verdicts.filter(function (v) { try { return F.evalExpr(v.when, all); } catch (e) { return false; } })[0];
    return { out: out, verdict: verdict ? verdict.text : '' };
  }
  function simHTML(W, st) {
    var h = [], vals = simVals(W, st), rnd = isRandom(W);
    W.vars.forEach(function (x) { h.push('<label class="sl"><span>' + esc(x.label) + ': <b data-simv="' + W.id + ':' + x.id + '">' + F.fmt(vals[x.id]) + '</b></span><input type="range" min="' + x.min + '" max="' + x.max + '" step="' + x.step + '" value="' + vals[x.id] + '" data-sim="' + W.id + '" data-var="' + x.id + '"></label>'); });
    if (!rnd) h.push('<div class="readout" data-simout="' + W.id + '">' + simOutHTML(W, vals) + '</div>');
    var rows = st.rows || [];
    h.push('<div class="row acts no-print"><button type="button" class="primary" data-run="' + W.id + '">' + esc(W.button) + '</button>' + (W.repeat ? '<button type="button" data-run="' + W.id + '" data-n="' + W.repeat + '">Run ' + W.repeat + ' at once</button>' : '') + '<span class="small muted">' + rows.length + ' of ' + W.runs + ' runs recorded' + (rows.length >= W.runs ? ' ✓' : '') + '</span></div>');
    if (rows.length) {
      h.push('<div class="tablewrap"><table class="runs"><thead><tr><th>#</th>' + W.vars.map(function (x) { return '<th>' + esc(x.label) + '</th>'; }).join('') + W.outputs.map(function (o) { return '<th>' + esc(o.label) + '</th>'; }).join('') + (W.verdicts.length ? '<th>Result</th>' : '') + '</tr></thead><tbody>' +
        rows.slice(-12).map(function (r, i) { return '<tr><td>' + (rows.length > 12 ? rows.length - 12 + i + 1 : i + 1) + '</td>' + W.vars.map(function (x) { return '<td>' + F.fmt(r.v[x.id]) + '</td>'; }).join('') + W.outputs.map(function (o, j) { return '<td>' + F.fmt(r.o['o' + j], o.places) + '</td>'; }).join('') + (W.verdicts.length ? '<td>' + esc(r.t) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>');
      if (rnd) h.push(dotPlot(rows.map(function (r) { return r.o.o0; }), W.outputs[0]));
    }
    return h.join('');
  }
  function simOutHTML(W, vals) { var c = simCalc(W, vals); return W.outputs.map(function (o, i) { return '<span class="ro"><span class="muted small">' + esc(o.label) + '</span> <b>' + F.fmt(c.out['o' + i], o.places) + '</b></span>'; }).join('') + (c.verdict ? '<span class="ro verdict"><b>' + esc(c.verdict) + '</b></span>' : ''); }
  function dotPlot(vals, o) {
    vals = vals.filter(function (v) { return isFinite(v); }); if (!vals.length) return '';
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); if (hi === lo) { lo -= 0.5; hi += 0.5; }
    var W = 320, H = 120, bins = {}, step = (hi - lo) / 20, maxc = 1;
    vals.forEach(function (v) { var b = Math.round((v - lo) / step); bins[b] = (bins[b] || 0) + 1; maxc = Math.max(maxc, bins[b]); });
    var r = Math.max(2, Math.min(6, (H - 30) / (2 * maxc))), s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Dot plot of ' + esc(o.label) + ', ' + vals.length + ' runs" class="dots"><line x1="10" y1="' + (H - 18) + '" x2="' + (W - 10) + '" y2="' + (H - 18) + '" stroke="currentColor"/>'];
    Object.keys(bins).forEach(function (b) { for (var i = 0; i < bins[b]; i++) s.push('<circle cx="' + (14 + b * (W - 28) / 20) + '" cy="' + (H - 22 - r - i * 2 * r) + '" r="' + r + '" fill="currentColor"/>'); });
    s.push('<text x="10" y="' + (H - 3) + '" font-size="11" fill="currentColor">' + F.fmt(lo, 2) + '</text><text x="' + (W - 10) + '" y="' + (H - 3) + '" font-size="11" text-anchor="end" fill="currentColor">' + F.fmt(hi, 2) + '</text></svg>');
    return '<div class="fig plot">' + s.join('') + '</div>';
  }
  function handsHTML(W, st) {
    var h = [], vals = st.vals || {};
    h.push('<div class="hands"><div><h3>You need</h3><ul>' + W.materials.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>');
    h.push('<div><h3>Do this</h3><ol>' + W.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div></div>');
    h.push('<h3>Your results</h3><div class="fields">' + W.fields.map(function (f) { return '<label class="fld"><span>' + esc(f.label) + '</span><span class="row"><input type="text" inputmode="decimal" data-field="' + W.id + '" data-f="' + f.id + '" value="' + esc(vals[f.id] == null ? '' : vals[f.id]) + '" autocomplete="off"><span class="muted">' + esc(f.unit) + '</span></span></label>'; }).join('') + '</div>');
    if (W.calc.length) h.push('<div class="readout" data-calc="' + W.id + '">' + calcHTML(W, vals) + '</div>');
    h.push('<div class="row acts no-print"><button type="button" data-simit="' + W.id + '">🎲 Simulate it for me</button><span class="small muted">No materials? This fills in realistic results.</span></div>');
    if (st.simulated) h.push('<p class="small notice">' + esc(W.simNote) + '</p>');
    return h.join('');
  }
  function calcHTML(W, vals) {
    var v = {}; W.fields.forEach(function (f) { var n = P.parseNum(String(vals[f.id] == null ? '' : vals[f.id])); v[f.id] = n ? n[0] / n[1] : NaN; });
    return W.calc.map(function (c) { var r; try { r = F.evalExpr(c.expr, v); } catch (e) { r = NaN; } return '<span class="ro"><span class="muted small">' + esc(c.label) + '</span> <b>' + F.fmt(r, c.places) + '</b></span>'; }).join('');
  }
  function checkWidget(wid) {
    var W = findWidget(wid), st = wSt(wid), p = pageOfWidget(wid);
    if (st.ok || waitLeft(st) || needThink(st)) return;
    var M = W.mechanic, canon, shown;
    if (M === 'sort') {
      var cards = st.cards || (st.cards = {}), todo = W.cards.filter(function (c) { return !(cards[c.id] || {}).ok; });
      if (todo.some(function (c) { return !(cards[c.id] || {}).bin; })) { st.msg = 'Put every card in a bin first.'; renderPage(); return; }
      Promise.all(todo.map(function (c) { var cs = cards[c.id]; return F.judgeForms(W.id + '--' + c.id, c, ['bin:' + cs.bin]).then(function (r) { return { c: c, cs: cs, r: r }; }); })).then(function (res) {
        var bad = res.filter(function (x) { return x.r.res !== 'ok'; });
        res.forEach(function (x) {
          if (x.r.res === 'ok') { x.cs.ok = true; x.cs.bad = false; x.cs.ex = (x.r.ex && x.r.ex.why) || ''; }
          else { x.cs.bad = true; x.cs.wrong = union(x.cs.wrong, [x.cs.bin]); x.cs.bin = ''; }
        });
        if (bad.length) { st.msg = bad.length + ' card' + (bad.length === 1 ? ' is' : 's are') + ' in the wrong bin. Read the note under ' + (bad.length === 1 ? 'it' : 'each one') + '.'; missed(st, { id: W.id, page: p.id, q: W.prompt, a: bad.map(function (x) { return x.c.text + ' → ' + binLabel(W, x.cs.wrong[x.cs.wrong.length - 1]); }).join('; ') }); }
        else { st.ok = true; st.msg = ''; st.ex = 'Every card is in the right bin.'; st.q = W.prompt; st.a = W.bins.map(function (b) { return b.label + ': ' + W.cards.filter(function (c) { return cards[c.id].bin === b.id; }).map(function (c) { return c.text; }).join(', '); }).join(' | '); st.at = Date.now(); }
        saveSoon(); renderPage();
      });
      return;
    }
    if (M === 'build') { var seq = st.seq || []; if (seq.length < W.slots || seq.some(function (x) { return !x; })) { st.msg = 'Fill every box first.'; renderPage(); return; } canon = 'seq:' + seq.join('|'); shown = seq.join(' '); }
    if (M === 'find-the-mistake') { if (st.pick == null) { st.msg = 'Tap the step you think is wrong first.'; renderPage(); return; } canon = 'step:' + st.pick; shown = 'Step ' + (st.pick + 1); }
    if (M === 'slider-hunt') { var x = st.x != null ? st.x : W.slider.value; canon = F.numForms(String(x))[0]; shown = F.fmt(x) + (W.slider.unit ? ' ' + W.slider.unit : ''); }
    F.judgeForms(W.id, W, [canon]).then(function (r) {
      if (r.res === 'ok') { st.ok = true; st.msg = ''; st.changed = false; st.ex = (r.ex && r.ex.why) || ''; st.q = W.prompt; st.a = shown; st.at = Date.now(); if (M === 'find-the-mistake') st.step = st.pick; }
      else {
        if (M === 'find-the-mistake') { st.wrong = union(st.wrong, [st.pick]); st.msgs = st.msgs || {}; st.msgs[st.pick] = r.res === 'miss' ? r.msg : W.wrong; st.pick = null; st.msg = r.res === 'miss' ? r.msg : W.wrong; }
        else if (M === 'slider-hunt') { st.wrong = union(st.wrong, [st.x != null ? st.x : W.slider.value]); st.msg = W.wrong; }
        else { st.wrong = union(st.wrong, [shown]); st.msg = r.res === 'miss' ? r.msg : W.wrong; }
        missed(st, { id: W.id, page: p.id, q: W.prompt, a: shown });
      }
      saveSoon(); renderPage();
    });
  }
  function binLabel(W, id) { var b = W.bins.filter(function (x) { return x.id === id; })[0]; return b ? b.label : id; }
  function findWidget(id) { for (var i = 0; i < PAGES.length; i++) if (PAGES[i].widget && PAGES[i].widget.id === id) return PAGES[i].widget; return null; }
  function pageOfWidget(id) { for (var i = 0; i < PAGES.length; i++) if (PAGES[i].widget && PAGES[i].widget.id === id) return PAGES[i]; return null; }

  /* ---------- AP free response, teacher question (T1, T2) ---------- */
  function frqHTML(f) {
    return '<div class="card q frq" data-id="' + f.id + '"><p class="qp"><b>Free response.</b> ' + esc(f.prompt) + '</p>' + (f.parts.length ? '<ol type="a">' + f.parts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
      '<label class="sr" for="f-' + f.id + '">Your response</label><textarea id="f-' + f.id + '" data-frq="' + f.id + '" rows="7" placeholder="Answer every part, in context.">' + esc(S.frq[f.id] || '') + '</textarea><p class="small muted" data-wc="' + f.id + '">' + wcText(S.frq[f.id], 20) + '</p><div class="tkey" data-tkey="' + f.id + '" hidden></div></div>';
  }
  function shortsReady() { var p = byPage[cur]; return (p.items || []).filter(function (it) { return it.type === 'open' && it.minWords >= 12; }).every(itemDone); }
  function tqHTML() {
    var h = ['<div class="card tq" id="tq"><h2>🧑‍🏫 Your teacher’s question</h2>'];
    if (!shortsReady() && !T) h.push('<p class="small muted">Answer the two short answers above first (12 words or more each). Then type the code your teacher gives you.</p>');
    if (S.tq.revealed && S.tq.q) {
      h.push('<p class="tqq"><b>Question:</b> ' + esc(S.tq.q) + '</p><label class="sr" for="tqa">Your answer</label><textarea id="tqa" data-tqa="1" rows="4" placeholder="Answer your teacher’s question.">' + esc(S.tq.a) + '</textarea><p class="small muted" data-wc="tq">' + wcText(S.tq.a, 8) + '</p>');
    } else {
      h.push('<div class="row"><label for="tqcode" class="sr">Code</label><input type="text" id="tqcode" class="grow" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Code from your teacher"' + (shortsReady() || T ? '' : ' disabled') + '><button type="button" id="tqopen"' + (shortsReady() || T ? '' : ' disabled') + '>Show the question</button></div><p class="small muted" id="tqmsg">Typing the code shows the question. It doesn’t finish it: you still write the answer.</p>');
    }
    h.push('<div class="tkey" data-tkey="tq" hidden></div></div>');
    return h.join('');
  }
  function openTq(code) {
    var c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), Q = D.tq, msg = $('tqmsg');
    if (!Q || !c) return;
    var done = function (q) { if (q) { S.tq.revealed = true; S.tq.q = q; saveSoon(); renderPage(); } else if (msg) msg.textContent = 'That code didn’t work. Check it with your teacher.'; };
    gcmOpen(Q, c).then(function (q) { return q || ctrOpen(Q, c); }, function () { return ctrOpen(Q, c); }).then(done, function () { done(null); });
  }
  function u8(b64) { return Uint8Array.from(atob(b64), function (ch) { return ch.charCodeAt(0); }); }
  function gcmOpen(Q, code) {
    try {
      var sub = window.crypto && window.crypto.subtle;
      if (!sub || !sub.importKey) return Promise.resolve(null);
      var enc = new TextEncoder();
      return sub.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']).then(function (base) {
        return sub.deriveKey({ name: 'PBKDF2', salt: enc.encode(Q.salt), iterations: Q.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      }).then(function (key) { return sub.decrypt({ name: 'AES-GCM', iv: u8(Q.iv) }, key, u8(Q.gcm)); }).then(function (buf) {
        var s = new TextDecoder().decode(new Uint8Array(buf)); return s.indexOf('PPLQ:') === 0 ? JSON.parse(s.slice(5)).q : null;
      }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  /* the fallback when crypto.subtle is missing: the same question, under a SHA-256 stream keyed by the code */
  function ctrOpen(Q, code) {
    var k = P.sha256Sync(new TextEncoder().encode('PPL-TQx|' + Q.salt + '|' + code));
    for (var i = 1; i < Q.fiter; i++) k = P.sha256Sync(new TextEncoder().encode(P.hex(k)));
    var kh = P.hex(k), ct = u8(Q.ctr), out = new Uint8Array(ct.length);
    for (var b = 0; b * 32 < ct.length; b++) { var ks = P.sha256Sync(new TextEncoder().encode(kh + '#' + b)); for (var j = 0; j < 32 && b * 32 + j < ct.length; j++) out[b * 32 + j] = ct[b * 32 + j] ^ ks[j]; }
    var s = new TextDecoder().decode(out);
    if (s.indexOf('PPLQ:') !== 0) return null;
    try { return JSON.parse(s.slice(5)).q; } catch (e) { return null; }
  }

  /* ---------- own notes (N2, N3) ---------- */
  function noteBoxHTML(p) {
    var n = S.notes[p.id] || {};
    return '<details class="mynote no-print-empty' + (n.text ? ' has' : '') + '" id="note-' + p.id + '"' + (n.text ? ' open' : '') + '><summary>📝 My notes for this page</summary><label class="sr" for="nt-' + p.id + '">My notes</label><textarea id="nt-' + p.id + '" data-note="' + p.id + '" rows="3" placeholder="Anything you want to remember. It goes on your My notes page.">' + esc(n.text || '') + '</textarea></details>';
  }

  /* ---------- My notes (N1): right answers with why, filled blanks, key ideas, free responses, the teacher question.
     Never hints, never model answers. Built only from what the save holds (S4: each entry keeps its own text). ---------- */
  function notesHTML() {
    var h = [];
    h.push('<div class="card"><label for="name"><b>Your name</b> <span class="small muted">(it stays on this device)</span></label><input type="text" id="name" maxlength="40" autocomplete="off" value="' + esc(S.name) + '"><p class="print-only">Name: ' + esc(S.name || '______________________') + ' &nbsp; Date: ______________</p>' +
      '<div class="row acts no-print"><button type="button" class="primary" id="print">🖨️ Print my notes</button></div></div>');
    PAGES.forEach(function (p) {
      if (p.part === 'notes') return;
      var body = [];
      if (p.sentences && Object.keys(p.blanks).some(function (id) { return S.blanks[id] && S.blanks[id].ok; })) body.push('<ul class="filled">' + p.sentences.map(function (s) { return '<li>' + esc(filledSentence(p, s)) + '</li>'; }).join('') + '</ul>');
      if (p.keyIdeas && pageDone(p)) body.push('<ul>' + p.keyIdeas.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>');
      if (p.widget) {
        var W = p.widget, st = S.widgets[W.id] || {};
        if (W.mechanic === 'predict-then-reveal' && st.revealed) body.push('<p>I predicted: <b>' + esc(W.options[st.pick]) + '</b>. What happened: ' + esc(W.reveal) + (st.note ? '<br>My thought: ' + esc(st.note) : '') + '</p>');
        if (W.mechanic === 'simulate' && (st.rows || []).length) body.push('<p>I ran the simulation ' + st.rows.length + ' times.</p>');
        if (W.mechanic === 'hands-on' && widgetDone(W)) body.push('<p>' + (st.simulated ? 'Simulated results' : 'My results') + ': ' + W.fields.map(function (f) { return esc(f.label) + ' ' + esc(st.vals[f.id]) + ' ' + esc(f.unit); }).join(' · ') + '</p>');
        if (st.ok && st.a) body.push('<p class="right"><b>✓ ' + esc(st.q || W.prompt) + '</b><br>' + esc(st.a) + (st.ex ? '<br><span class="why">Why: ' + esc(st.ex) + '</span>' : '') + '</p>');
      }
      (p.items || []).forEach(function (it) {
        if (it.type === 'open') { var t = S.open[it.id]; if (t && t.trim()) body.push('<p class="right"><b>' + esc(it.prompt) + '</b><br>' + esc(t) + '</p>'); return; }
        var st = S.items[it.id];
        if (st && st.ok) body.push('<p class="right"><b>✓ ' + esc(st.q || it.prompt) + '</b><br>' + esc(st.a || st.v) + (st.ex ? '<br><span class="why">Why: ' + esc(st.ex) + '</span>' : '') + '</p>');
      });
      if (p.frq && (S.frq[p.frq.id] || '').trim()) body.push('<p class="right"><b>Free response</b><br>' + esc(S.frq[p.frq.id]) + '</p>');
      if (p.tq && S.tq.revealed) body.push('<p class="right"><b>Teacher question: ' + esc(S.tq.q) + '</b><br>' + (S.tq.a ? esc(S.tq.a) : '<span class="muted">(not answered yet)</span>') + '</p>');
      var n = S.notes[p.id];
      if (n && n.text && n.text.trim()) body.push('<p class="own"><b>My note' + (n.src && n.src !== p.title ? ' (on ' + esc(n.src) + ')' : '') + ':</b> ' + esc(n.text) + '</p>');
      if (body.length) h.push('<div class="card nsec"><h2>' + PART_ICON[p.part] + ' ' + (p.title.indexOf(label(p)) === 0 ? '' : esc(label(p)) + ': ') + esc(p.title) + '</h2>' + body.join('') + '</div>');
    });
    Object.keys(S.notes).forEach(function (k) { if (!byPage[k] && S.notes[k] && S.notes[k].text) h.push('<div class="card nsec"><h2>📝 ' + esc(S.notes[k].src || k) + '</h2><p class="own">' + esc(S.notes[k].text) + '</p></div>'); });
    h.push('<div class="card nsec"><h2>🧗 Where I got stuck</h2>' + (S.stuck.length ? '<ul class="stuck">' + S.stuck.map(function (s) {
      var later = s.id && ((S.items[s.id] || {}).ok || (S.blanks[s.id] || {}).ok || (S.widgets[s.id] || {}).ok);
      var th = (S.items[s.id] || S.widgets[s.id] || {}).think;
      return '<li><b>' + esc(s.q) + '</b><br>I tried: “' + esc(s.a) + '”' + (later ? ' · ✓ got it later' : ' · not yet') + (th ? '<br>What I was thinking: “' + esc(th) + '”' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="muted">Nothing yet.</p>') + '</div>');
    h.push('<div class="card nsec"><h2>✎ More notes</h2><label for="extra" class="sr">More notes</label><textarea id="extra" data-extra="1" rows="4" placeholder="Add notes any time.">' + esc(S.extra) + '</textarea></div>');
    h.push('<div class="card no-print" id="savebox"><h2>💾 Backups and save codes</h2><p class="small">Your work is saved in this browser only. To move it to another device, download a backup file or copy a save code, then load it there. Loading adds to what is already here; it never erases anything.</p>' +
      '<div class="row"><button type="button" class="primary" id="bkDown">⬇️ Download backup file</button><label class="btn" for="bkFile">⬆️ Restore from a backup file</label><input type="file" id="bkFile" accept=".json,application/json" hidden></div>' +
      '<div class="row acts"><button type="button" id="codeShow">🔑 Show my save code</button><button type="button" id="codeLoad">Load a save code</button></div>' +
      '<textarea id="codeBox" rows="3" aria-label="save code" placeholder="Your save code appears here, or paste one and press Load a save code"></textarea><p class="small" id="bkmsg" aria-live="polite"></p></div>');
    return h.join('');
  }

  /* ================= teacher copy (C1–C3) ================= */
  function teacherPaint() {
    var bar = $('tbar');
    bar.innerHTML = '<b>TEACHER COPY</b> · Showing <b>' + (tmode === 'answers' ? 'ANSWERS' : 'BLANK') + '</b> · press F2 to switch · <button type="button" id="treset">Reset lesson</button>';
    document.querySelectorAll('#pagebox input, #pagebox textarea, #pagebox button:not(.navkeep)').forEach(function (el) { if (el.closest('.pager')) return; el.disabled = true; });
    if (tmode !== 'answers') return;
    var p = byPage[cur];
    (p.items || []).forEach(function (it) {
      var t = T.items[it.id], box = document.querySelector('[data-tkey="' + it.id + '"]'); if (!t || !box) return;
      if (it.type === 'mc') document.querySelectorAll('[data-pick="' + it.id + '"]').forEach(function (b) { if (Number(b.getAttribute('data-orig')) === t.answer) b.classList.add('key', 'right'); });
      else if (it.type !== 'open') { var inp = $('a-' + it.id); if (inp) inp.value = t.answer; }
      box.hidden = false;
      box.innerHTML = it.type === 'open' ? '<p><b>Model answer:</b> ' + esc(t.model) + '</p><p><b>Look for:</b></p><ul>' + t.look.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'
        : '<p><b>Answer:</b> ' + esc(it.type === 'mc' ? 'option ' + (t.answer + 1) + ': ' + t.choices[t.answer] : t.answer) + ((t.accept || []).length ? ' <span class="small">(also ' + t.accept.map(esc).join(', ') + ')</span>' : '') + '</p><p><b>Why:</b> ' + esc(t.why) + '</p><p class="small"><b>Hint:</b> ' + esc(t.hint) + '</p>' + (t.ced ? '<p class="small"><b>CED:</b> ' + esc([].concat(t.ced).join(', ')) + '</p>' : '');
    });
    if (p.blanks) Object.keys(p.blanks).forEach(function (id) { var el = $('bl-' + id); if (el) { el.value = T.blanks[id].answer; el.classList.add('good'); } });
    if (p.widget) {
      var W = p.widget, t = T.widgets[W.id], box = document.querySelector('[data-tkey="' + W.id + '"]'), msg = '';
      if (W.mechanic === 'sort') { W.cards.forEach(function (c) { var b = document.querySelector('[data-sort="' + W.id + '"][data-c="' + c.id + '"][data-b="' + t[c.id] + '"]'); if (b) b.classList.add('key', 'sel'); }); msg = '<ul>' + W.cards.map(function (c) { return '<li>' + esc(c.text) + ' → <b>' + esc(binLabel(W, t[c.id])) + '</b>: ' + esc(t.cards[c.id].why) + '</li>'; }).join('') + '</ul>'; }
      if (W.mechanic === 'build') { var slots = document.querySelectorAll('[data-unslot="' + W.id + '"]'); t.answer[0].forEach(function (x, i) { if (slots[i]) slots[i].textContent = x; }); msg = '<p><b>Answer:</b> ' + t.answer.map(function (a) { return esc(a.join(' ')); }).join(' or ') + '</p><p><b>Why:</b> ' + esc(t.why) + '</p>'; }
      if (W.mechanic === 'find-the-mistake') { var sb = document.querySelector('[data-step="' + W.id + '"][data-i="' + t.answer + '"]'); if (sb) sb.classList.add('key', 'right'); msg = '<p><b>The mistake is step ' + (t.answer + 1) + '.</b> ' + esc(t.why) + '</p>'; }
      if (W.mechanic === 'slider-hunt') { var r = document.querySelector('[data-slide="' + W.id + '"]'); if (r) { r.value = t.answer; document.querySelector('[data-readout="' + W.id + '"]').innerHTML = readoutHTML(W, t.answer); document.querySelector('[data-sv="' + W.id + '"]').textContent = F.fmt(t.answer); } msg = '<p><b>Answer:</b> ' + t.answer + (t.tol ? ' (± ' + t.tol + ')' : '') + ' ' + esc(W.slider.unit) + '</p><p><b>Why:</b> ' + esc(t.why) + '</p>'; }
      if (msg && box) { box.hidden = false; box.innerHTML = msg + (t.hint ? '<p class="small"><b>Hint:</b> ' + esc(t.hint) + '</p>' : ''); }
    }
    if (p.frq) { var f = T.frq[p.frq.id], fb = document.querySelector('[data-tkey="' + p.frq.id + '"]'); fb.hidden = false; fb.innerHTML = '<p><b>Scoring guide:</b></p><ul>' + f.guide.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul><p><b>Model response:</b> ' + esc(f.model) + '</p><p><b>Typical wrong answers:</b></p><ul>' + f.errors.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>' + (f.ced ? '<p class="small"><b>CED:</b> ' + esc([].concat(f.ced).join(', ')) + ' (not checked against the CED yet)</p>' : ''); }
    if (p.tq) { var tb = document.querySelector('[data-tkey="tq"]'); tb.hidden = false; tb.innerHTML = '<p><b>Code:</b> ' + esc(T.tq.code) + '</p><p><b>Question:</b> ' + esc(T.tq.question) + '</p><ul>' + T.tq.look.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'; }
  }
  var resetArmed = 0;

  /* ================= live bits: waits ================= */
  function tick() {
    document.querySelectorAll('[data-wait]').forEach(function (b) {
      if (T) return;
      var k = b.getAttribute('data-wait'), left, think = false;
      if (k.indexOf('p:') === 0) left = blankWait(byPage[k.slice(2)]);
      else { var st = stOf(k); left = waitLeft(st); think = needThink(st); }
      if (!b.dataset.label) b.dataset.label = b.textContent;
      b.disabled = left > 0 || think;
      b.textContent = left > 0 ? 'Wait ' + left + ' s' : b.dataset.label;
    });
  }
  setInterval(tick, 500);

  /* ================= events ================= */
  // D2: links like href="#/lab-1" work inside any viewer frame (a document-level handler, not the browser's hash jump)
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#/"]') : null;
    if (a) { e.preventDefault(); go(a.getAttribute('href').slice(2)); return; }
    var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
    var d = b.dataset;
    if (b.id === 'navbtn') { var o = document.body.classList.toggle('navopen'); b.setAttribute('aria-expanded', String(o)); return; }
    if (b.id === 'theme') { P.themeNext(); $('themeName').textContent = P.themeName(); return; }
    if (b.id === 'addnote') { var nb = $('note-' + cur); if (nb) { nb.open = true; var ta = nb.querySelector('textarea'); if (ta) ta.focus(); } return; }
    if (b.id === 'treset' && T) {
      if (Date.now() - resetArmed < 5000) { P.lsDel(KEY); resetArmed = 0; b.textContent = 'Reset done: this device’s saved work for the lesson is erased'; }
      else { resetArmed = Date.now(); b.textContent = 'Click again to erase this lesson’s saved work on this device'; }
      return;
    }
    if (T) return;                                   // C3: nothing else works in the teacher copy
    if (d.pick) { var st = itemSt(d.pick); if (!st.ok) { st.v = d.orig; st.msg = ''; renderPage(); saveSoon(); } return; }
    if (d.check) { var t = d.check.charAt(0), id = d.check.slice(2); if (t === 'i') checkItem(id); else checkWidget(id); return; }
    if (d.hint) { stOf(d.hint).hint = true; saveSoon(); renderPage(); return; }
    if (d.checkblanks) { checkBlanks(d.checkblanks); return; }
    if (d.blankhint) { Object.keys(byPage[d.blankhint].blanks).forEach(function (id) { blankSt(id).hint = true; }); saveSoon(); renderPage(); return; }
    if (d.predict) { var ps = wSt(d.predict); if (!ps.revealed) { ps.pick = Number(d.i); saveSoon(); renderPage(); } return; }
    if (d.reveal) { var rs = wSt(d.reveal); if (rs.pick != null) { rs.revealed = true; rs.at = Date.now(); saveSoon(); renderPage(); } return; }
    if (d.sort) { var ss = wSt(d.sort); ss.cards = ss.cards || {}; var cs = ss.cards[d.c] || (ss.cards[d.c] = {}); if (!cs.ok) { cs.bin = d.b; cs.bad = false; ss.msg = ''; saveSoon(); renderPage(); } return; }
    if (d.tile) { var W = findWidget(d.tile), bs = wSt(d.tile), seq = bs.seq || (bs.seq = []); var i = seq.indexOf(''); if (i < 0) i = seq.length; if (i < W.slots) { seq[i] = W.tiles[Number(d.j)]; bs.msg = ''; saveSoon(); renderPage(); } return; }
    if (d.unslot) { var us = wSt(d.unslot); if (us.seq && !us.ok) { us.seq[Number(d.i)] = ''; saveSoon(); renderPage(); } return; }
    if (d.clear) { wSt(d.clear).seq = []; saveSoon(); renderPage(); return; }
    if (d.step) { var fs = wSt(d.step); if (!fs.ok) { fs.pick = Number(d.i); fs.msg = ''; saveSoon(); renderPage(); } return; }
    if (d.run) {
      var SW = findWidget(d.run), sst = wSt(d.run), n = Number(d.n) || 1; sst.rows = sst.rows || [];
      for (var r = 0; r < n; r++) { var vals = simVals(SW, sst), c = simCalc(SW, vals); sst.rows.push({ v: vals, o: c.out, t: c.verdict }); }
      if (sst.rows.length > 400) sst.rows = sst.rows.slice(-400);
      saveSoon(); renderPage(); return;
    }
    if (d.simit) {
      var HW = findWidget(d.simit), hs = wSt(d.simit), v = {}; hs.vals = hs.vals || {};
      HW.fields.forEach(function (f) { try { v[f.id] = F.evalExpr(f.sim, v); } catch (er) { v[f.id] = 0; } hs.vals[f.id] = String(Math.round(v[f.id] * 100) / 100); });
      hs.simulated = true; saveSoon(); renderPage(); return;
    }
    if (b.id === 'tqopen') { openTq(($('tqcode') || {}).value); return; }
    if (b.id === 'print') { try { window.print(); } catch (er) { } return; }
    if (b.id === 'bkDown') { try { download(D.lessonId + '-backup.json', JSON.stringify(backupObj(), null, 1)); $('bkmsg').textContent = 'Backup file saved.'; } catch (er) { $('bkmsg').textContent = 'This browser would not save a file. Use the save code instead.'; } return; }
    if (b.id === 'codeShow') { saveCode().then(function (c) { $('codeBox').value = c; copyText(c, function () { $('bkmsg').textContent = 'Save code copied. Paste it on the other device.'; }, function () { $('bkmsg').textContent = 'Copy the code in the box.'; }); }); return; }
    if (b.id === 'codeLoad') { readCode($('codeBox').value).then(function (o) { var m = restoreFrom(o); var el = $('bkmsg'); if (el) el.textContent = m; }, function () { $('bkmsg').textContent = 'That save code didn’t work. Check that you copied all of it.'; }); return; }
  });
  document.addEventListener('input', function (e) {
    var t = e.target, d = t.dataset || {};
    if (T) return;
    if (t.id === 'name') { S.name = t.value.slice(0, 40); saveSoon(); }
    else if (d.typed) { var st = itemSt(d.typed); if (!st.ok) { st.v = t.value; saveSoon(); } }
    else if (d.blank) { var bs = blankSt(d.blank); if (!bs.ok) { bs.v = t.value; saveSoon(); } }
    else if (d.think) { var th = stOf(d.think); th.think = t.value; var recent = S.stuck.filter(function (s) { return s.id === d.think.slice(2); }).pop(); if (recent) recent.think = t.value; saveSoon(); var hb = document.querySelector('[data-hintbox="' + d.think + '"]'); if (hb && !needThink(th)) hb.hidden = false; tick(); }
    else if (d.open) { S.open[d.open] = t.value; var wc = document.querySelector('[data-wc="' + d.open + '"]'); if (wc) wc.textContent = wcText(t.value, ITEM[d.open].minWords); saveSoon(); var tq = $('tq'); if (tq && byPage[cur].tq) { var ready = shortsReady(); ['tqcode', 'tqopen'].forEach(function (x) { if ($(x)) $(x).disabled = !ready; }); } nav(); }
    else if (d.frq) { S.frq[d.frq] = t.value; var fw = document.querySelector('[data-wc="' + d.frq + '"]'); if (fw) fw.textContent = wcText(t.value, 20); saveSoon(); nav(); }
    else if (d.tqa) { S.tq.a = t.value; var qw = document.querySelector('[data-wc="tq"]'); if (qw) qw.textContent = wcText(t.value, 8); saveSoon(); nav(); }
    else if (d.note) { S.notes[d.note] = { text: t.value, src: byPage[d.note].title, at: Date.now() }; saveSoon(); }
    else if (d.extra) { S.extra = t.value; saveSoon(); }
    else if (d.wnote) { wSt(d.wnote).note = t.value; saveSoon(); }
    else if (d.slide) { var W = findWidget(d.slide), ws = wSt(d.slide); ws.x = Number(t.value); document.querySelector('[data-sv="' + W.id + '"]').textContent = F.fmt(ws.x); document.querySelector('[data-readout="' + W.id + '"]').innerHTML = readoutHTML(W, ws.x); ws.msg = ''; saveSoon(); }
    else if (d.sim) { var SW = findWidget(d.sim), ss = wSt(d.sim); ss.vals = ss.vals || {}; ss.vals[d['var']] = Number(t.value); var lab = document.querySelector('[data-simv="' + SW.id + ':' + d['var'] + '"]'); if (lab) lab.textContent = F.fmt(ss.vals[d['var']]); var so = document.querySelector('[data-simout="' + SW.id + '"]'); if (so) so.innerHTML = simOutHTML(SW, simVals(SW, ss)); saveSoon(); }
    else if (d.field) { var HW = findWidget(d.field), hs = wSt(d.field); hs.vals = hs.vals || {}; hs.vals[d.f] = t.value; hs.simulated = false; var c = document.querySelector('[data-calc="' + HW.id + '"]'); if (c) c.innerHTML = calcHTML(HW, hs.vals); saveSoon(); nav(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'bkFile' && !T) {
      var f = t.files && t.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () { var o = null; try { o = JSON.parse(r.result); } catch (er) { o = null; } var m = o ? restoreFrom(o) : 'That file is not a backup.'; var el = $('bkmsg'); if (el) el.textContent = m; }; r.readAsText(f);
      t.value = '';
    }
    if (t.dataset && (t.dataset.field || t.dataset.slide || t.dataset.sim)) renderPageKeepFocus();
  });
  function renderPageKeepFocus() { var a = document.activeElement, id = a && a.id; renderPage(); if (id && $(id)) try { $(id).focus(); } catch (e) { } }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'F2' && T) { e.preventDefault(); tmode = tmode === 'answers' ? 'blank' : 'answers'; renderPage(); return; }   // C2: F2 only, never a letter key
    var d = (e.target && e.target.dataset) || {};
    if (e.key !== 'Enter' || T) return;
    if (d.typed) { e.preventDefault(); checkItem(d.typed); }
    else if (d.blank) { e.preventDefault(); checkBlanks(cur); }
    else if (e.target.id === 'tqcode') { e.preventDefault(); openTq(e.target.value); }
  });
  window.addEventListener('hashchange', function () { var m = String(location.hash || '').match(/^#\/([a-z0-9-]+)/); if (m && m[1] !== cur) go(m[1]); });

  /* a saved right answer is checked again when the page opens: if a newer build changed it, it reopens */
  function recheck() {
    if (T) return;
    Object.keys(S.items).forEach(function (id) {
      var st = S.items[id], it = ITEM[id];
      if (!st || !st.ok || !it || it.type === 'open') return;
      var j = it.type === 'mc' ? F.judgeForms(id, it, ['opt:' + Number(st.v)]) : F.judgeTyped(id, it, st.v, it.type);
      j.then(function (r) { if (r.res === 'ok') { if (r.ex && r.ex.why) st.ex = r.ex.why; return; } st.ok = false; st.changed = true; st.misses = 0; st.until = 0; saveSoon(); if (PAGE_OF[id] === cur) renderPage(); else nav(); });
    });
    PAGES.forEach(function (p) {
      if (!p.blanks) return;
      Object.keys(p.blanks).forEach(function (id) {
        var st = S.blanks[id]; if (!st || !st.ok) return;
        F.judgeTyped(id, p.blanks[id], st.v, p.blanks[id].num ? 'numeric' : 'short').then(function (r) { if (r.res !== 'ok') { st.ok = false; st.changed = true; st.msg = 'This blank changed in a newer build. Try it again.'; saveSoon(); if (p.id === cur) renderPage(); else nav(); } });
      });
    });
  }

  P.themeInit();
  shell();
  $('themeName').textContent = P.themeName();
  if (!T && !P.storageWorks()) showBlocked();
  route();
  recheck();
})();
