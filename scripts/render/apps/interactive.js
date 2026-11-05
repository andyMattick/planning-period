/* Interactive worksheet (docs/KINDS-APPS.md). Runs after engine.js; reads window.PPA_DATA.
   Typed answers and choices are checked against hashes, a miss starts a short wait, after two misses the student
   writes what she's thinking and then gets the hint, the explanation unlocks with the right answer, and everything is
   saved on this device only (localStorage, one key per pack and document). */
(function () {
  'use strict';
  var P = window.PPA, D = P.D, esc = P.esc;
  var KEY = D.key;
  var WAITS = [3, 6, 10];          // seconds after the 1st, 2nd, 3rd+ miss
  var THINK_WORDS = 5;             // words she writes before the hint opens
  var items = [], byId = {};
  (D.sections || []).forEach(function (s) { (s.items || []).forEach(function (it) { items.push(it); byId[it.id] = it; }); });
  var auto = items.filter(function (it) { return it.type !== 'open'; });
  var written = items.filter(function (it) { return it.type === 'open'; });

  function fresh() { return { v: 1, name: '', items: {}, at: 0 }; }
  function load() {
    var o = P.loadJSON(KEY), S = fresh();
    if (!o) return S;
    if (typeof o.name === 'string') S.name = o.name.slice(0, 40);
    if (o.items && typeof o.items === 'object') for (var id in o.items) if (byId[id] && o.items[id] && typeof o.items[id] === 'object') S.items[id] = o.items[id];
    S.at = Number(o.at) || 0;
    return S;
  }
  var S = load();
  function st(id) { return S.items[id] || (S.items[id] = { v: '', ok: false, misses: 0, think: '', hint: false, work: '', until: 0 }); }
  var saveTimer = null;
  function save() {
    S.at = Date.now();
    var ok = P.saveJSON(KEY, S);
    var el = document.getElementById('saved');
    if (el) el.textContent = ok ? 'Saved on this device at ' + new Date(S.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not saved: this browser blocks saving.';
    if (!ok) showBlocked();
  }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
  function showBlocked() { var b = document.getElementById('blocked'); if (b) b.hidden = false; }

  /* ---------- rendering ---------- */
  function choiceHTML(it, i, text, s) {
    var letter = String.fromCharCode(65 + i), on = String(s.v) === String(i);
    return '<label class="choice' + (on ? ' sel' : '') + (s.ok && on ? ' right' : '') + '"><input type="radio" name="r-' + esc(it.id) + '" value="' + i + '"' + (on ? ' checked' : '') + (s.ok ? ' disabled' : '') + '><span class="l">' + letter + '.</span><span>' + esc(text) + '</span></label>';
  }
  function itemHTML(it) {
    var s = st(it.id), h = [];
    h.push('<div class="card q" id="q-' + esc(it.id) + '" data-id="' + esc(it.id) + '">');
    h.push('<p><b>' + it.n + '.</b> ' + esc(it.prompt) + (it.level ? '<span class="tag">Level ' + it.level + '</span>' : '') + '</p>');
    if (it.figure) h.push('<div class="fig">' + it.figure + '</div>');
    if (it.type === 'mc') h.push('<div class="choices" role="radiogroup">' + it.choices.map(function (c, i) { return choiceHTML(it, i, c, s); }).join('') + '</div>');
    else if (it.type === 'tf') h.push('<div class="choices" role="radiogroup">' + ['True', 'False'].map(function (c) { var v = c === 'True' ? 'true' : 'false', on = s.v === v; return '<label class="choice' + (on ? ' sel' : '') + (s.ok && on ? ' right' : '') + '"><input type="radio" name="r-' + esc(it.id) + '" value="' + v + '"' + (on ? ' checked' : '') + (s.ok ? ' disabled' : '') + '><span>' + c + '</span></label>'; }).join('') + '</div>');
    else if (it.type === 'open') h.push('<label class="sr" for="a-' + esc(it.id) + '">Your answer</label><textarea id="a-' + esc(it.id) + '" data-open="' + esc(it.id) + '" rows="5" placeholder="Write your answer in full sentences.">' + esc(s.v) + '</textarea><p class="small muted" data-wc="' + esc(it.id) + '"></p>');
    else h.push('<div class="row"><label class="sr" for="a-' + esc(it.id) + '">Your answer</label><input class="grow" type="text" id="a-' + esc(it.id) + '" data-typed="' + esc(it.id) + '" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="' + (it.type === 'numeric' ? 'decimal' : 'text') + '" value="' + esc(s.v) + '"' + (s.ok ? ' readonly' : '') + ' placeholder="' + (it.type === 'numeric' ? 'Type a number' : 'Type your answer') + '">' + (it.unit ? '<span class="muted">' + esc(it.unit) + '</span>' : '') + '</div>');
    if (it.work) h.push('<details class="work"' + (s.work ? ' open' : '') + '><summary>✏️ Show your work</summary><label class="sr" for="w-' + esc(it.id) + '">Your work</label><textarea id="w-' + esc(it.id) + '" data-work="' + esc(it.id) + '" rows="4" placeholder="Write your steps here.">' + esc(s.work) + '</textarea></details>');
    if (it.type !== 'open') {
      h.push('<div class="think" data-think-box="' + esc(it.id) + '" hidden><p class="small"><b>Before you try again:</b> write what you\'re thinking (' + THINK_WORDS + ' words or more). Then you can see a hint.</p><textarea rows="3" data-think="' + esc(it.id) + '">' + esc(s.think) + '</textarea><div class="row" style="margin-top:8px"><button type="button" data-hint="' + esc(it.id) + '">💡 Show my hint</button></div></div>');
      h.push('<div class="row no-print" style="margin-top:10px"><button type="button" class="primary" data-check="' + esc(it.id) + '">Check</button></div>');
    }
    h.push('<div class="fb-wrap" data-fb="' + esc(it.id) + '" aria-live="polite"></div>');
    h.push('</div>');
    return h.join('');
  }
  function render() {
    var h = [];
    h.push('<div class="topbar"><div class="row"><span class="title">' + esc(D.title) + '</span><button type="button" class="no-print" id="theme" aria-label="Color theme">Theme: <span id="themeName"></span></button></div><div class="bar" style="margin-top:8px" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" id="pbar"><i></i></div><div class="small muted" id="ptext" style="margin-top:4px"></div></div>');
    h.push('<div class="notice" id="blocked" hidden>This browser is blocking saving, so your answers will be lost when you close the page. Checking still works. Try a normal (not private) window.</div>');
    h.push('<h1>' + esc(D.title) + '</h1>');
    if (D.sub) h.push('<p class="muted small">' + esc(D.sub) + '</p>');
    h.push('<div class="card"><label for="name"><b>Your name</b> <span class="muted small">(it stays on this device)</span></label><input type="text" id="name" maxlength="40" autocomplete="off" value="' + esc(S.name) + '"><p class="small muted" style="margin:8px 0 0" id="saved">Your work saves on this device as you go.</p></div>');
    if (D.directions) h.push('<p><b>' + esc(D.directions) + '</b></p>');
    h.push('<p class="small muted no-print">Type an answer and press Check. After a miss, wait a moment and try again. After two misses you write what you\'re thinking, and then a hint opens.</p>');
    (D.sections || []).forEach(function (sec) {
      if (sec.heading) h.push('<h2>' + esc(sec.heading) + '</h2>');
      if (sec.directions) h.push('<p>' + esc(sec.directions) + '</p>');
      (sec.items || []).forEach(function (it) { h.push(itemHTML(it)); });
    });
    h.push('<div class="card no-print"><div class="row"><button type="button" id="print">🖨️ Print or save as PDF</button><button type="button" id="reset">Start over</button></div><p class="small muted" id="resetMsg" style="margin:8px 0 0"></p></div>');
    h.push('<div class="foot">' + esc(D.notice || '') + '<br>Saved only on this device: nothing is sent anywhere.</div>');
    document.getElementById('app').innerHTML = h.join('');
    document.getElementById('themeName').textContent = P.themeName();
    items.forEach(function (it) { paint(it.id); });
    progress();
  }

  function paint(id) {
    var it = byId[id], s = st(id), fb = document.querySelector('[data-fb="' + cssId(id) + '"]');
    if (!fb) return;
    if (it.type === 'open') { var wc = document.querySelector('[data-wc="' + cssId(id) + '"]'); if (wc) { var n = P.words(s.v); wc.textContent = n + ' word' + (n === 1 ? '' : 's') + (n >= it.minWords ? ' · Saved. Your teacher will read this.' : ' · Write at least ' + it.minWords + '.'); } return; }
    var btn = document.querySelector('[data-check="' + cssId(id) + '"]'), think = document.querySelector('[data-think-box="' + cssId(id) + '"]');
    var needThink = !s.ok && s.misses >= 2 && !s.hint;
    if (think) think.hidden = !needThink;
    if (needThink) { var hb = think.querySelector('[data-hint]'); hb.disabled = P.words(s.think) < THINK_WORDS; }
    var out = '';
    if (s.ok) {
      out = '<div class="fb ok"><b class="mark">✓ Right!</b>' + (s.why ? esc(s.why) : '') + '</div>';
      if (btn) btn.hidden = true;
    } else {
      if (s.changed) out += '<div class="fb info">This question changed since you answered it. Try it again.</div>';
      if (s.msg) out += '<div class="fb bad"><b class="mark">✗ Not yet.</b>' + esc(s.msg) + '</div>';
      if (s.hint && it.hint) out += '<div class="fb info"><b class="mark">💡 Hint:</b>' + esc(it.hint) + '</div>';
      if (btn) { btn.hidden = false; tick(id); }
    }
    fb.innerHTML = out;
  }
  function cssId(id) { return String(id).replace(/["\\]/g, '\\$&'); }
  var timers = {};
  function tick(id) {
    var s = st(id), btn = document.querySelector('[data-check="' + cssId(id) + '"]');
    if (!btn) return;
    var left = Math.ceil((s.until - Date.now()) / 1000), needThink = !s.ok && s.misses >= 2 && !s.hint;
    clearTimeout(timers[id]);
    if (left > 0) { btn.disabled = true; btn.textContent = 'Wait ' + left + ' s'; timers[id] = setTimeout(function () { tick(id); }, 250); }
    else { btn.disabled = needThink; btn.textContent = 'Check'; }
  }
  function progress() {
    var right = auto.filter(function (it) { return st(it.id).ok; }).length;
    var done = written.filter(function (it) { return P.words(st(it.id).v) >= it.minWords; }).length;
    var total = auto.length + written.length, pct = total ? Math.round(100 * (right + done) / total) : 0;
    var bar = document.getElementById('pbar');
    bar.firstChild.style.width = pct + '%'; bar.setAttribute('aria-valuenow', pct);
    document.getElementById('ptext').textContent = right + ' of ' + auto.length + ' checked right' + (written.length ? ' · ' + done + ' of ' + written.length + ' written' : '');
  }

  /* ---------- checking ---------- */
  function check(id) {
    var it = byId[id], s = st(id);
    if (s.ok || s.until > Date.now() || (s.misses >= 2 && !s.hint)) return;
    var raw = it.type === 'mc' || it.type === 'tf' ? s.v : (document.getElementById('a-' + id) || {}).value;
    if (raw === '' || raw == null) { s.msg = it.type === 'mc' || it.type === 'tf' ? 'Pick an answer first.' : 'Type an answer first.'; paint(id); return; }
    s.v = String(raw);
    P.judge(it, raw).then(function (r) {
      if (r.res === 'unread') { s.msg = it.type === 'numeric' ? 'Type a number, like 12, -4, 2.5 or 3/4.' : 'Type an answer first.'; paint(id); return; }
      if (r.res === 'ok') { s.ok = true; s.msg = ''; s.changed = false; s.why = (r.ex && r.ex.why) || ''; }
      else {
        s.misses = (s.misses || 0) + 1;
        s.until = Date.now() + 1000 * WAITS[Math.min(s.misses, WAITS.length) - 1];
        s.msg = r.res === 'sign' ? 'You have the right size. Check the sign.' : r.res === 'miss' ? r.msg : 'Look again and try once more.';
      }
      saveSoon(); paint(id); progress();
      if (r.res === 'ok' && (it.type === 'mc' || it.type === 'tf')) render();
    });
  }
  /* a saved right answer is checked again on load: if the question changed, it opens again */
  function recheck() {
    items.forEach(function (it) {
      var s = S.items[it.id];
      if (!s || !s.ok || it.type === 'open') return;
      P.judge(it, s.v).then(function (r) {
        if (r.res === 'ok') { s.why = (r.ex && r.ex.why) || s.why; paint(it.id); return; }
        s.ok = false; s.changed = true; s.misses = 0; s.hint = false; paint(it.id); progress(); saveSoon();
      });
    });
  }

  /* ---------- events ---------- */
  var resetArmed = 0;
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.check) check(t.dataset.check);
    else if (t.dataset.hint) { var s = st(t.dataset.hint); if (P.words(s.think) >= THINK_WORDS) { s.hint = true; saveSoon(); paint(t.dataset.hint); } }
    else if (t.id === 'print') window.print();
    else if (t.id === 'theme') { P.themeNext(); document.getElementById('themeName').textContent = P.themeName(); }
    else if (t.id === 'reset') {
      var msg = document.getElementById('resetMsg');
      if (Date.now() - resetArmed < 5000) { P.lsDel(KEY); S = fresh(); resetArmed = 0; render(); document.getElementById('resetMsg').textContent = 'Everything on this sheet was erased.'; }
      else { resetArmed = Date.now(); msg.textContent = 'This erases every answer on this sheet. Tap “Start over” again to erase.'; }
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.type === 'radio') { var id = t.name.slice(2), s = st(id); if (s.ok) return; s.v = t.value; s.msg = ''; saveSoon(); document.querySelectorAll('input[name="' + cssId(t.name) + '"]').forEach(function (r) { r.closest('.choice').classList.toggle('sel', r.checked); }); paint(id); }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'name') { S.name = t.value.slice(0, 40); saveSoon(); }
    else if (t.dataset.typed) { var s = st(t.dataset.typed); if (!s.ok) { s.v = t.value; saveSoon(); } }
    else if (t.dataset.work) { st(t.dataset.work).work = t.value; saveSoon(); }
    else if (t.dataset.think) { st(t.dataset.think).think = t.value; saveSoon(); paint(t.dataset.think); }
    else if (t.dataset.open) { st(t.dataset.open).v = t.value; saveSoon(); paint(t.dataset.open); progress(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.typed) { e.preventDefault(); check(e.target.dataset.typed); } });

  P.themeInit();
  render();
  if (!P.storageWorks()) showBlocked();
  recheck();
})();
