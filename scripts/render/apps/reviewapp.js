/* Review app (docs/KINDS-APPS.md). Runs after engine.js; reads window.PPA_DATA.
   Modes, as the pack chooses: Flashcards (flip, know it / not yet, boxes so misses come back sooner), Memorize (read,
   first letters, fade out, from memory; forgiving punctuation), Practice (choices and typed answers checked against
   hashes, shuffled, missed ones come back in the round) and Match (tap a word, then its meaning).
   Progress is saved on this device only (localStorage, one key per pack and document). No accounts. */
(function () {
  'use strict';
  var P = window.PPA, D = P.D, esc = P.esc, KEY = D.key;
  var app = document.getElementById('app');
  var MODES = { flashcards: ['🃏', 'Flashcards'], memorize: ['🧠', 'Memorize'], practice: ['✏️', 'Practice'], match: ['🔗', 'Match'] };
  var modes = (D.modes || []).filter(function (m) { return MODES[m]; });
  var cards = D.cards || [], passages = D.passages || [], practice = D.practice || [], pairs = D.pairs || [];
  var cardById = {}, pracById = {};
  cards.forEach(function (c) { cardById[c.id] = c; });
  practice.forEach(function (q) { pracById[q.id] = q; });

  /* ---------- saving ---------- */
  function fresh() { return { v: 1, cards: {}, mem: {}, prac: {}, pracRounds: 0, pracBest: null, match: { rounds: 0, best: null, seen: {} }, at: 0 }; }
  function load() {
    var o = P.loadJSON(KEY), S = fresh();
    if (!o) return S;
    ['cards', 'mem', 'prac'].forEach(function (k) { if (o[k] && typeof o[k] === 'object') S[k] = o[k]; });
    if (o.match && typeof o.match === 'object') { S.match.rounds = Number(o.match.rounds) || 0; S.match.best = o.match.best == null ? null : Number(o.match.best); if (o.match.seen && typeof o.match.seen === 'object') S.match.seen = o.match.seen; }
    S.pracRounds = Number(o.pracRounds) || 0; S.pracBest = o.pracBest == null ? null : o.pracBest;
    return S;
  }
  var S = load();
  function save() { S.at = Date.now(); if (!P.saveJSON(KEY, S)) { var b = document.getElementById('blocked'); if (b) b.hidden = false; } }
  function cs(id) { return S.cards[id] || (S.cards[id] = { box: 0, seen: 0, miss: 0 }); }
  function ms(id) { return S.mem[id] || (S.mem[id] = { step: 0, best: {}, tries: 0 }); }
  function ps(id) { return S.prac[id] || (S.prac[id] = { right: 0, miss: 0 }); }

  /* ---------- frame ---------- */
  var view = 'home';
  function frame(title, body, back) {
    app.innerHTML = '<div class="topbar"><div class="row">' + (back ? '<button type="button" data-go="home" aria-label="Back to the menu">← Menu</button>' : '') + '<span class="title">' + esc(title) + '</span><button type="button" id="theme" aria-label="Color theme">Theme: ' + P.themeName() + '</button></div></div>' +
      '<div class="notice" id="blocked"' + (P.canSave() ? ' hidden' : '') + '>This browser is blocking saving, so your progress will be lost when you close the page. Try a normal (not private) window.</div>' + body +
      '<div class="foot">' + esc(D.notice || '') + '<br>Progress is saved only on this device: nothing is sent anywhere.</div>';
    window.scrollTo(0, 0);
  }
  function known() { return cards.filter(function (c) { return cs(c.id).box >= 2; }).length; }
  function home() {
    view = 'home';
    var tiles = modes.map(function (m) {
      var info = '';
      if (m === 'flashcards') info = known() + ' of ' + cards.length + ' cards known';
      if (m === 'memorize') info = passages.map(function (p) { return esc(p.title) + ': step ' + (Math.min(ms(p.id).step, 4) + 1) + ' of 5' + (ms(p.id).step >= 5 ? ' ✓' : ''); }).join('<br>');
      if (m === 'practice') { var r = practice.filter(function (q) { return ps(q.id).right > 0; }).length; info = r + ' of ' + practice.length + ' answered right' + (S.pracBest != null ? ' · best round ' + S.pracBest + '%' : ''); }
      if (m === 'match') info = (S.match.rounds ? S.match.rounds + ' round' + (S.match.rounds === 1 ? '' : 's') + ' done' : pairs.length + ' pairs to match') + (S.match.best != null ? ' · fewest misses ' + S.match.best : '');
      return '<button type="button" class="card tile" data-go="' + m + '"><span class="ico" aria-hidden="true">' + MODES[m][0] + '</span><span><b>' + MODES[m][1] + '</b><br><span class="small muted">' + info + '</span></span></button>';
    }).join('');
    frame(D.title, '<h1>' + esc(D.title) + '</h1>' + (D.sub ? '<p class="muted small">' + esc(D.sub) + '</p>' : '') + '<div class="tiles">' + tiles + '</div>' +
      '<div class="card"><div class="row"><button type="button" id="reset">Start over</button></div><p class="small muted" id="resetMsg" style="margin:8px 0 0">Start over erases this app\'s progress on this device.</p></div>', false);
  }

  /* ---------- 🃏 flashcards ---------- */
  var deck = [], flipped = false, roundStats = null;
  function startCards() {
    var order = cards.map(function (c, i) { return { c: c, i: i, s: cs(c.id) }; });
    order.sort(function (a, b) { return a.s.box - b.s.box || a.s.seen - b.s.seen || a.i - b.i; });
    deck = order.slice(0, 10).map(function (o) { return o.c.id; });
    roundStats = { know: 0, notYet: 0, n: deck.length };
    flipped = false; showCard();
  }
  function showCard() {
    view = 'flashcards';
    if (!deck.length) {
      frame('Flashcards', '<div class="card"><h2>Round done</h2><p>' + roundStats.know + ' “know it” · ' + roundStats.notYet + ' “not yet”. Cards you miss come back sooner.</p><p class="muted">' + known() + ' of ' + cards.length + ' cards known.</p><div class="row"><button type="button" class="primary" data-go="flashcards">Another round</button><button type="button" data-go="home">Menu</button></div></div>', true);
      return;
    }
    var c = cardById[deck[0]], box = cs(c.id).box;
    frame('Flashcards', '<p class="small muted">' + deck.length + ' left in this round · box ' + (box + 1) + ' of 5</p>' +
      '<button type="button" class="card flash' + (flipped ? ' back' : '') + '" id="flip" aria-label="' + (flipped ? 'Answer side' : 'Question side. Tap to see the answer.') + '"><span class="side small muted">' + (flipped ? 'Answer' : 'Tap to flip') + '</span><span class="face">' + esc(flipped ? c.back : c.front) + '</span>' + (flipped ? '<span class="small muted front-again">' + esc(c.front) + '</span>' : '') + '</button>' +
      (flipped ? '<div class="row two"><button type="button" id="notyet">Not yet</button><button type="button" class="primary" id="knowit">Know it</button></div>' : '<div class="row two"><button type="button" class="primary" id="flipbtn">Show answer</button></div>'), true);
  }
  function rate(knowIt) {
    var id = deck.shift(), s = cs(id);
    s.seen++;
    if (knowIt) { s.box = Math.min(s.box + 1, 4); roundStats.know++; }
    else { s.box = 0; s.miss++; roundStats.notYet++; deck.splice(Math.min(3, deck.length), 0, id); }
    save(); flipped = false; showCard();
  }

  /* ---------- 🧠 memorize ---------- */
  var STEPS = ['Read it', 'First letters', 'Fade: a third hidden', 'Fade: two thirds hidden', 'From memory'];
  var memP = null, memStep = 0, memBlanks = null, memResult = null;
  function core(w) { return String(w).replace(/[’‘]/g, "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); }
  function wnorm(w) { return String(w).toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}]/gu, ''); }
  function lines(p) { return String(p.text).split(/\n/).map(function (l) { return l.split(/\s+/).filter(Boolean); }); }
  function flatWords(p) { var out = []; lines(p).forEach(function (l) { l.forEach(function (w) { if (wnorm(w)) out.push(w); }); }); return out; }
  function memList() {
    if (passages.length === 1) return memOpen(passages[0].id);
    view = 'memorize';
    frame('Memorize', '<h2>Pick a passage</h2>' + passages.map(function (p) { return '<button type="button" class="card tile" data-mem="' + esc(p.id) + '"><span><b>' + esc(p.title) + '</b><br><span class="small muted">Step ' + (Math.min(ms(p.id).step, 4) + 1) + ' of 5</span></span></button>'; }).join(''), true);
  }
  function memOpen(id, step) {
    view = 'memorize'; memP = passages.filter(function (p) { return p.id === id; })[0];
    var s = ms(id);
    memStep = step == null ? Math.min(s.step, 4) : step; memResult = null;
    var words = flatWords(memP), r = P.rng((s.tries + 1) * 7919 + memStep);
    memBlanks = {};
    if (memStep === 2 || memStep === 3) {
      var k = Math.max(1, Math.round(words.length * (memStep === 2 ? 1 / 3 : 2 / 3)));
      P.shuffle(words.map(function (w, i) { return i; }), r).slice(0, k).forEach(function (i) { memBlanks[i] = true; });
    }
    memDraw();
  }
  function memDraw() {
    var s = ms(memP.id), h = [];
    h.push('<h1>' + esc(memP.title) + '</h1>' + (memP.source ? '<p class="small muted">' + esc(memP.source) + '</p>' : ''));
    h.push('<div class="steps" role="tablist">' + STEPS.map(function (n, i) { var open = i <= s.step; return '<button type="button" class="step' + (i === memStep ? ' on' : '') + (i < s.step ? ' done' : '') + '"' + (open ? ' data-step="' + i + '"' : ' disabled') + ' aria-label="Step ' + (i + 1) + ': ' + n + (open ? '' : ' (locked)') + '">' + (i < s.step ? '✓' : i + 1) + '</button>'; }).join('') + '</div>');
    h.push('<h2>Step ' + (memStep + 1) + ': ' + STEPS[memStep] + '</h2>');
    var idx = 0, ls = lines(memP);
    if (memStep === 0) {
      h.push('<p class="muted small">Read it out loud three times. Then go to step 2.</p><div class="card passage">' + ls.map(function (l) { return '<span class="pl">' + (esc(l.join(' ')) || '&nbsp;') + '</span>'; }).join('') + '</div>');
      h.push('<div class="row"><button type="button" class="primary" id="memNext">I read it. Next step</button></div>');
    } else if (memStep === 1) {
      h.push('<p class="muted small">Each word shows its first letter. Type the whole passage below. Punctuation and capitals don\'t count.</p><div class="card passage letters">' + ls.map(function (l) { return l.map(function (w) { var c = core(w); if (!c) return esc(w); var i = w.indexOf(c); return esc(w.slice(0, i)) + '<b>' + esc(c.charAt(0)) + '</b><span class="dash">' + '_'.repeat(Math.max(1, c.length - 1)) + '</span>' + esc(w.slice(i + c.length)); }).join(' '); }).map(function (x) { return '<span class="pl">' + (x || '&nbsp;') + '</span>'; }).join('') + '</div>');
      h.push('<label class="sr" for="memType">Type the passage</label><textarea id="memType" rows="6" autocapitalize="sentences" placeholder="Type the passage here."></textarea><div class="row" style="margin-top:10px"><button type="button" class="primary" id="memCheck">Check</button></div>');
    } else if (memStep === 2 || memStep === 3) {
      h.push('<p class="muted small">Fill in the missing words. Punctuation and capitals don\'t count.</p><div class="card passage fade">');
      h.push(ls.map(function (l) { return l.map(function (w) { if (!wnorm(w)) return esc(w); var i = idx++; if (!memBlanks[i]) return '<span>' + esc(w) + '</span>'; var c = core(w), at = w.indexOf(c); return esc(w.slice(0, at)) + '<input type="text" class="blank" data-bi="' + i + '" aria-label="Missing word ' + (i + 1) + '" autocomplete="off" autocapitalize="off" spellcheck="false" size="' + Math.max(3, c.length) + '">' + esc(w.slice(at + c.length)); }).join(' '); }).map(function (x) { return '<span class="pl">' + (x || '&nbsp;') + '</span>'; }).join(''));
      h.push('</div><div class="row"><button type="button" class="primary" id="memCheck">Check</button></div>');
    } else {
      h.push('<p class="muted small">Type the whole passage from memory. Punctuation and capitals don\'t count.</p><label class="sr" for="memType">Type the passage</label><textarea id="memType" rows="7" autocapitalize="sentences" placeholder="Type the passage here."></textarea><div class="row" style="margin-top:10px"><button type="button" class="primary" id="memCheck">Check</button></div>');
    }
    h.push('<div id="memOut" aria-live="polite">' + (memResult || '') + '</div>');
    frame('Memorize', h.join(''), true);
  }
  /* compare typed words with the passage's words (longest common run in order), so one skipped word doesn't sink the rest */
  function lcsMatch(want, got) {
    var n = want.length, m = got.length, L = [], i, j;
    for (i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = want[i] === got[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var ok = new Array(n).fill(false); i = 0; j = 0;
    while (i < n && j < m) { if (want[i] === got[j]) { ok[i] = true; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
    return ok;
  }
  function memCheck() {
    var words = flatWords(memP), want = words.map(wnorm), ok;
    if (memStep === 2 || memStep === 3) {
      ok = want.map(function (w, i) { if (!memBlanks[i]) return true; var el = app.querySelector('[data-bi="' + i + '"]'); return !!el && wnorm(el.value) === w; });
      var asked = Object.keys(memBlanks).length, right = Object.keys(memBlanks).filter(function (i) { return ok[i]; }).length, score = Math.round(100 * right / asked);
      app.querySelectorAll('[data-bi]').forEach(function (el) { var i = +el.dataset.bi; el.classList.toggle('good', ok[i]); el.classList.toggle('miss', !ok[i]); });
      return memScore(score, right + ' of ' + asked + ' words right.', words, ok);
    }
    var typed = (document.getElementById('memType').value || '').split(/\s+/).map(wnorm).filter(Boolean);
    if (!typed.length) { document.getElementById('memOut').innerHTML = '<div class="fb info">Type the passage first.</div>'; return; }
    ok = lcsMatch(want, typed);
    var good = ok.filter(Boolean).length, extra = Math.max(0, typed.length - good), sc = Math.max(0, Math.round(100 * (good - extra * 0.5) / want.length));
    memScore(sc, good + ' of ' + want.length + ' words right' + (extra ? ', ' + extra + ' extra or wrong word' + (extra === 1 ? '' : 's') : '') + '.', words, ok);
  }
  function memScore(score, line, words, ok) {
    var s = ms(memP.id), pass = score >= 90;
    s.tries++; s.best[memStep] = Math.max(s.best[memStep] || 0, score);
    if (pass && s.step <= memStep) s.step = memStep + 1;
    save();
    var shown = '<div class="card passage">' + words.map(function (w, i) { return ok[i] ? '<span class="w-ok">' + esc(w) + '</span>' : '<span class="w-miss" title="missed">' + esc(w) + '</span>'; }).join(' ') + '</div>';
    memResult = '<div class="fb ' + (pass ? 'ok' : 'bad') + '"><b class="mark">' + (pass ? '✓ ' + score + '%!' : score + '%.') + '</b>' + line + ' ' + (pass ? (memStep < 4 ? 'The next step is open.' : 'You know it by heart. Come back tomorrow and try step 5 again.') : '90% opens the next step. Missed words are underlined below; read them and try again.') + '</div>' + shown +
      '<div class="row"><button type="button" data-step="' + memStep + '">Try again</button>' + (pass && memStep < 4 ? '<button type="button" class="primary" data-step="' + (memStep + 1) + '">Next step</button>' : '') + '</div>';
    document.getElementById('memOut').innerHTML = memResult;
  }

  /* ---------- ✏️ practice ---------- */
  var queue = [], cur = null, curState = null, round = null;
  function startPractice() {
    queue = P.shuffle(practice.map(function (q) { return q.id; }));
    round = { first: {}, n: queue.length, tries: {} };
    nextQ();
  }
  function nextQ() {
    view = 'practice';
    if (!queue.length) {
      var right = Object.keys(round.first).filter(function (k) { return round.first[k]; }).length, pct = round.n ? Math.round(100 * right / round.n) : 0;
      S.pracRounds++; S.pracBest = Math.max(S.pracBest || 0, pct); save();
      frame('Practice', '<div class="card"><h2>Round done</h2><p>' + right + ' of ' + round.n + ' right on the first try (' + pct + '%). Every question you missed came back until you got it.</p><div class="row"><button type="button" class="primary" data-go="practice">Another round</button><button type="button" data-go="home">Menu</button></div></div>', true);
      return;
    }
    cur = pracById[queue[0]]; curState = { done: false };
    var q = cur, h = [];
    h.push('<p class="small muted">' + queue.length + ' left in this round</p><div class="card"><p><b>' + esc(q.prompt) + '</b></p>');
    if (q.type === 'mc') h.push('<div class="choices">' + q.choices.map(function (c, i) { return '<button type="button" class="choice" data-pick="' + i + '"><span class="l">' + String.fromCharCode(65 + i) + '.</span><span>' + esc(c) + '</span></button>'; }).join('') + '</div>');
    else if (q.type === 'tf') h.push('<div class="choices"><button type="button" class="choice" data-pick="true">True</button><button type="button" class="choice" data-pick="false">False</button></div>');
    else h.push('<div class="row"><label class="sr" for="pa">Your answer</label><input class="grow" type="text" id="pa" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="' + (q.type === 'numeric' ? 'decimal' : 'text') + '">' + (q.unit ? '<span class="muted">' + esc(q.unit) + '</span>' : '') + '</div><div class="row" style="margin-top:10px"><button type="button" class="primary" id="pcheck">Check</button></div>');
    h.push('<div id="pfb" aria-live="polite"></div></div>');
    frame('Practice', h.join(''), true);
  }
  function answer(raw, btn) {
    if (curState.done) return;
    var q = cur;
    P.judge(q, raw).then(function (r) {
      var fb = document.getElementById('pfb');
      if (r.res === 'unread') { fb.innerHTML = '<div class="fb info">' + (q.type === 'numeric' ? 'Type a number, like 12, -4, 2.5 or 3/4.' : 'Type an answer first.') + '</div>'; return; }
      curState.done = true;
      var first = !(q.id in round.first);
      if (r.res === 'ok') {
        if (first) round.first[q.id] = true;
        ps(q.id).right++; queue.shift();
        if (btn) btn.classList.add('right');
        fb.innerHTML = '<div class="fb ok"><b class="mark">✓ Right!</b>' + esc((r.ex && r.ex.why) || '') + '</div><div class="row" style="margin-top:10px"><button type="button" class="primary" id="pnext">Next</button></div>';
      } else {
        if (first) round.first[q.id] = false;
        ps(q.id).miss++;
        queue.splice(Math.min(3, queue.length), 0, queue.shift());
        var msg = r.res === 'sign' ? 'You have the right size. Check the sign.' : r.res === 'miss' ? r.msg : 'That one will come back later in this round.';
        fb.innerHTML = '<div class="fb bad"><b class="mark">✗ Not yet.</b>' + esc(msg) + '</div>' + (q.hint ? '<div class="fb info"><b class="mark">💡 Hint:</b>' + esc(q.hint) + '</div>' : '') + '<div class="row" style="margin-top:10px"><button type="button" class="primary" id="pnext" disabled>Wait…</button></div>';
        setTimeout(function () { var b = document.getElementById('pnext'); if (b) { b.disabled = false; b.textContent = 'Next'; } }, 2000);
      }
      app.querySelectorAll('[data-pick]').forEach(function (b) { b.disabled = true; });
      var inp = document.getElementById('pa'); if (inp) inp.readOnly = true;
      save();
    });
  }

  /* ---------- 🔗 match ---------- */
  var mRound = null;
  function startMatch() {
    view = 'match';
    var pool = pairs.map(function (p, i) { return { p: p, i: i, n: S.match.seen[p.id] || 0 }; });
    pool = P.shuffle(pool); pool.sort(function (a, b) { return a.n - b.n; });
    var pick = pool.slice(0, Math.min(5, pool.length)).map(function (o) { return o.p; });
    mRound = { pairs: pick, left: P.shuffle(pick), right: P.shuffle(pick), sel: null, done: {}, misses: 0 };
    matchDraw();
  }
  function matchDraw() {
    var r = mRound, all = r.pairs.every(function (p) { return r.done[p.id]; });
    if (all) {
      S.match.rounds++; S.match.best = S.match.best == null ? r.misses : Math.min(S.match.best, r.misses);
      r.pairs.forEach(function (p) { S.match.seen[p.id] = (S.match.seen[p.id] || 0) + 1; }); save();
      frame('Match', '<div class="card"><h2>All matched!</h2><p>' + r.misses + ' miss' + (r.misses === 1 ? '' : 'es') + ' this round.</p><div class="row"><button type="button" class="primary" data-go="match">Another round</button><button type="button" data-go="home">Menu</button></div></div>', true);
      return;
    }
    var col = function (list, side) { return list.map(function (p) { var d = r.done[p.id], on = r.sel && r.sel.side === side && r.sel.id === p.id; return '<button type="button" class="choice m' + (d ? ' right' : '') + (on ? ' sel' : '') + '" data-m="' + side + '" data-id="' + esc(p.id) + '"' + (d ? ' disabled' : '') + '>' + (d ? '✓ ' : '') + esc(side === 'l' ? p.term : p.def) + '</button>'; }).join(''); };
    frame('Match', '<p class="small muted">Tap a word, then tap its meaning. Misses: ' + r.misses + '</p><div class="match"><div class="choices">' + col(r.left, 'l') + '</div><div class="choices">' + col(r.right, 'r') + '</div></div><div id="mfb" aria-live="polite"></div>', true);
  }
  function matchTap(side, id) {
    var r = mRound;
    if (!r.sel || r.sel.side === side) { r.sel = { side: side, id: id }; return matchDraw(); }
    if (r.sel.id === id) { r.done[id] = true; r.sel = null; return matchDraw(); }
    r.misses++; var a = r.sel; r.sel = null; matchDraw();
    [a, { side: side, id: id }].forEach(function (x) { var b = app.querySelector('[data-m="' + x.side + '"][data-id="' + x.id.replace(/"/g, '\\"') + '"]'); if (b) b.classList.add('nope'); });
    document.getElementById('mfb').innerHTML = '<div class="fb bad"><b class="mark">✗</b>Those two don\'t go together. Try again.</div>';
  }

  /* ---------- events ---------- */
  var resetArmed = 0;
  app.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.id === 'theme') { P.themeNext(); t.textContent = 'Theme: ' + P.themeName(); return; }
    var go = t.dataset.go;
    if (go === 'home') return home();
    if (go === 'flashcards') return startCards();
    if (go === 'memorize') return memList();
    if (go === 'practice') return startPractice();
    if (go === 'match') return startMatch();
    if (t.id === 'flip' || t.id === 'flipbtn') { flipped = !flipped; return showCard(); }
    if (t.id === 'knowit') return rate(true);
    if (t.id === 'notyet') return rate(false);
    if (t.dataset.mem) return memOpen(t.dataset.mem);
    if (t.dataset.step != null) return memOpen(memP.id, +t.dataset.step);
    if (t.id === 'memNext') { var s = ms(memP.id); if (s.step < 1) s.step = 1; save(); return memOpen(memP.id, 1); }
    if (t.id === 'memCheck') return memCheck();
    if (t.dataset.pick != null) { t.classList.add('sel'); return answer(t.dataset.pick === 'true' ? true : t.dataset.pick === 'false' ? false : +t.dataset.pick, t); }
    if (t.id === 'pcheck') return answer(document.getElementById('pa').value);
    if (t.id === 'pnext') return nextQ();
    if (t.dataset.m) return matchTap(t.dataset.m, t.dataset.id);
    if (t.id === 'reset') {
      var msg = document.getElementById('resetMsg');
      if (Date.now() - resetArmed < 5000) { P.lsDel(KEY); S = fresh(); resetArmed = 0; home(); document.getElementById('resetMsg').textContent = 'This app\'s progress was erased.'; }
      else { resetArmed = Date.now(); msg.textContent = 'This erases all progress in this app. Tap “Start over” again to erase.'; }
    }
  });
  app.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'pa') { e.preventDefault(); answer(e.target.value); }
    else if (e.target.classList && e.target.classList.contains('blank')) { e.preventDefault(); var n = app.querySelectorAll('.blank'), i = Array.prototype.indexOf.call(n, e.target); if (n[i + 1]) n[i + 1].focus(); else memCheck(); }
  });

  P.themeInit();
  home();
  if (!P.storageWorks()) { var b = document.getElementById('blocked'); if (b) b.hidden = false; }
})();
