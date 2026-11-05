/* The shared runtime of every practice game (docs/KINDS-PRACTICEGAMES.md). One template script (shooter.js, grid.js,
   fixit.js) sets PG.T = {how, play(deck, done)}; this file draws the bar at the top, the start screen and the results
   screen (every question missed, with the right answer and why), keeps progress on this device (every read and write
   in try/catch), reads typed answers (numbers exactly, words forgivingly), and plays sounds (off until turned on).
   Answers are in this file's data on purpose: it is practice, not a test (the teacher sheet says so).
   Adapted from the owner's Pet World arcade games (the forgiving number reader, the stars, the results list); nothing
   Pet World specific (pets, coins, tickets, PINs, messages to an app) is used. */
(function () {
  'use strict';
  var D = window.PG_DATA;
  var PG = window.PG = { D: D };
  var app = document.getElementById('app');
  var esc = PG.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  PG.$ = function (sel, root) { return (root || document).querySelector(sel); };
  PG.$$ = function (sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); };
  PG.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  PG.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- saving on this device ---------- */
  var storeOK = true;
  PG.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { storeOK = false; return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { storeOK = false; } }
  };
  var saved = PG.store.get(D.key, null) || { plays: 0, best: 0, bestStars: 0, misses: [] };
  PG.store.set(D.key, saved);

  /* ---------- theme: follows the device; the player can pick light or dark ---------- */
  var THEME_KEY = 'pp-game-theme';
  function applyTheme(t) { if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  applyTheme(PG.store.get(THEME_KEY, ''));
  function isDark() { var t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }

  /* ---------- sound: off by default; little beeps made here (no files, no network) ---------- */
  var SOUND_KEY = 'pp-game-sound', ac = null;
  PG.soundOn = PG.store.get(SOUND_KEY, false) === true;
  PG.sound = function (kind) {
    if (!PG.soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var notes = { right: [660, 880], wrong: [220, 165], boom: [140, 90], fire: [990], win: [523, 659, 784, 1046], click: [520] }[kind] || [440];
      notes.forEach(function (f, i) {
        var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.09;
        o.type = kind === 'boom' || kind === 'wrong' ? 'square' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.18);
      });
    } catch (e) { /* no sound on this device */ }
  };

  /* ---------- the bar at the top ---------- */
  var top = document.getElementById('top');
  function drawTop() {
    top.innerHTML = '<div class="in"><span class="ttl">' + esc(D.theme.sprites.icon || '') + ' ' + esc(D.title) + '</span>' +
      '<button type="button" id="pg-sound" aria-pressed="' + PG.soundOn + '" title="Sound">' + (PG.soundOn ? '🔊 On' : '🔇 Off') + '</button>' +
      '<button type="button" id="pg-theme" title="Light or dark">' + (isDark() ? '☀️' : '🌙') + '<span class="sr"> Switch light or dark</span></button></div>';
    PG.$('#pg-sound').onclick = function () { PG.soundOn = !PG.soundOn; PG.store.set(SOUND_KEY, PG.soundOn); drawTop(); PG.sound('click'); };
    PG.$('#pg-theme').onclick = function () { var t = isDark() ? 'light' : 'dark'; applyTheme(t); PG.store.set(THEME_KEY, t); drawTop(); };
  }
  drawTop();
  var live = document.createElement('div'); live.className = 'sr'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live);
  PG.say = function (msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); };

  /* ---------- reading typed answers ---------- */
  PG.parseNum = function (raw) { return window.PGR.parseNum(raw, D.unitMarks); };
  PG.normText = window.PGR.normText;
  PG.normFix = window.PGR.normFix;
  PG.checkTyped = function (q, raw) {
    var t = q.typed;
    if (!t) return false;
    if (t.kind === 'num') { var v = PG.parseNum(raw); return !!v && t.nums.some(function (n) { return n[0] === v[0] && n[1] === v[1]; }); }
    if (t.kind === 'fix') return t.texts.indexOf(PG.normFix(raw)) >= 0;
    return t.texts.indexOf(PG.normText(raw)) >= 0;
  };

  /* ---------- pieces every template uses ---------- */
  PG.promptHTML = function (q) { return '<div class="q">' + q.prompt + (q.figure ? '<div class="fig">' + q.figure + '</div>' : '') + '</div>'; };
  PG.whyHTML = function (q, ok) {
    return '<div class="fb ' + (ok ? 'ok' : 'bad') + ' fade-in" role="status">' + (ok ? '<b>✓ Right!</b> ' : '<b>✗ Not this time.</b> The answer is <b>' + q.answerHtml + '</b>. ') + (q.why ? '<div>' + q.why + '</div>' : '') + '</div>';
  };
  // a typed answer box (numbers or words); onSubmit(value)
  PG.typedHTML = function (label, placeholder) {
    return '<form class="row" id="pg-typed" autocomplete="off"><label class="grow"><span class="sr">' + esc(label || 'Your answer') + '</span>' +
      '<input type="text" id="pg-in" inputmode="' + (D.numericKeys ? 'decimal' : 'text') + '" placeholder="' + esc(placeholder || 'Type your answer') + '" autocapitalize="off" spellcheck="false"></label>' +
      '<button class="go" type="submit">' + esc(label || 'Check') + '</button></form>';
  };
  PG.bindTyped = function (onSubmit) {
    var f = PG.$('#pg-typed'), box = PG.$('#pg-in');
    if (!f) return;
    f.onsubmit = function (e) { e.preventDefault(); if (!box.value.trim()) { box.focus(); return; } onSubmit(box.value); };
    setTimeout(function () { try { box.focus({ preventScroll: true }); } catch (e) { box.focus(); } }, 30);
  };
  PG.starsText = function (n, of) { of = of || 3; var s = ''; for (var i = 0; i < of; i++) s += i < n ? '⭐' : '☆'; return s; };
  PG.accStars = function (right, total) { var p = total ? right / total : 0; return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0; };

  /* ---------- screens ---------- */
  function byId(id) { for (var i = 0; i < D.questions.length; i++) if (D.questions[i].id === id) return D.questions[i]; return null; }
  function savedMisses() { return (saved.misses || []).map(byId).filter(Boolean); }
  PG.start = function () {
    var misses = savedMisses();
    app.innerHTML = '<div class="hero fade-in"><div class="big" aria-hidden="true">' + esc(D.theme.sprites.hero || D.theme.sprites.icon || '🎮') + '</div>' +
      '<h1>' + esc(D.title) + '</h1>' + (D.sub ? '<p class="muted small">' + esc(D.sub) + '</p>' : '') + '</div>' +
      (D.story ? '<div class="card"><p>' + esc(D.story) + '</p></div>' : '') +
      '<div class="card"><h2>How to play</h2>' + PG.T.how + (D.directions ? '<p class="muted small">' + esc(D.directions) + '</p>' : '') + '</div>' +
      (saved.plays ? '<p class="muted">Best: ' + saved.best + ' points · ' + PG.starsText(saved.bestStars) + ' · played ' + saved.plays + ' time' + (saved.plays === 1 ? '' : 's') + ' on this device</p>' : '') +
      (storeOK ? '' : '<p class="notice">This browser isn’t saving progress (a private window, or storage is blocked). The game still works.</p>') +
      '<div class="row"><button class="go" type="button" id="pg-play">▶ Play (' + D.questions.length + ' questions)</button>' +
      (misses.length ? '<button type="button" id="pg-misses">🎯 Practice my misses (' + misses.length + ')</button>' : '') + '</div>' +
      '<p class="small muted" style="margin-top:14px">' + esc(D.notice) + '</p>';
    PG.$('#pg-play').onclick = function () { PG.run(D.questions, false); };
    if (PG.$('#pg-misses')) PG.$('#pg-misses').onclick = function () { PG.run(misses, true); };
    window.scrollTo(0, 0);
  };
  PG.run = function (list, replay) {
    var deck = PG.shuffle(list);
    PG.replay = !!replay;
    window.scrollTo(0, 0);
    PG.T.play(deck, function (res) { PG.results(res, list, replay); });
  };
  // res: {records: [{q, ok, given, note}], score, stars, stats: [[label, value]], line}
  PG.results = function (res, list, replay) {
    var recs = res.records, right = recs.filter(function (r) { return r.ok; }).length;
    var stars = res.stars != null ? res.stars : PG.accStars(right, recs.length);
    var missed = recs.filter(function (r) { return !r.ok; });
    saved.plays = (saved.plays || 0) + 1;
    if (!replay) { saved.best = Math.max(saved.best || 0, res.score || 0); saved.bestStars = Math.max(saved.bestStars || 0, stars); }
    // the misses list keeps every question still missed: a replay clears the ones now right
    var keep = (saved.misses || []).filter(function (id) { return !recs.some(function (r) { return r.q.id === id; }); });
    saved.misses = keep.concat(missed.map(function (r) { return r.q.id; }));
    if (!replay) saved.misses = missed.map(function (r) { return r.q.id; });
    PG.store.set(D.key, saved);
    PG.sound(stars >= 2 ? 'win' : 'click');
    var stats = [['Right', right + ' of ' + recs.length], ['Score', res.score || 0]].concat(res.stats || []);
    app.innerHTML = '<div class="hero fade-in" id="pg-results"><div class="stars" aria-label="' + stars + ' of 3 stars">' + PG.starsText(stars) + '</div>' +
      '<h1>' + esc(res.line || (stars === 3 ? 'Amazing!' : stars === 2 ? 'Great work!' : stars === 1 ? 'Good start!' : 'Keep practicing!')) + '</h1>' +
      (replay ? '<p class="muted">Practice round: your misses</p>' : '') + '</div>' +
      '<div class="stats">' + stats.map(function (s) { return '<div><b>' + esc(s[1]) + '</b>' + esc(s[0]) + '</div>'; }).join('') + '</div>' +
      (missed.length ? '<h2>Look at these again (' + missed.length + ')</h2><ul class="missed">' + missed.map(function (r) {
        return '<li><div>' + r.q.prompt + '</div>' + (r.given ? '<div><span class="lbl">You answered:</span> ' + esc(r.given) + '</div>' : '') +
          '<div><span class="lbl">Right answer:</span> ' + r.q.answerHtml + '</div>' + (r.q.why ? '<div><span class="lbl">Why:</span> ' + r.q.why + '</div>' : '') + '</li>';
      }).join('') + '</ul>' : '<div class="fb ok">Every question right. Nothing to practice!</div>') +
      '<div class="row" style="margin-top:12px">' + (missed.length ? '<button class="go" type="button" id="pg-replay">🎯 Practice my misses (' + missed.length + ')</button>' : '') +
      '<button type="button" id="pg-again"' + (missed.length ? '' : ' class="go"') + '>🔁 Play again</button><button type="button" id="pg-home">🏠 Start screen</button></div>';
    if (PG.$('#pg-replay')) PG.$('#pg-replay').onclick = function () { PG.run(missed.map(function (r) { return r.q; }), true); };
    PG.$('#pg-again').onclick = function () { PG.run(D.questions, false); };
    PG.$('#pg-home').onclick = PG.start;
    window.scrollTo(0, 0);
    PG.say('Game over. ' + right + ' of ' + recs.length + ' right.');
  };
  PG.app = app;   // the template script sets PG.T and calls PG.start()
})();
