/* ⚓ Grid battle (docs/KINDS-PRACTICEGAMES.md). Adapted from the owner's Harbor Battleship (Pet World): two hidden
   fleets; each shot at the enemy's grid is earned by answering a question right. A wrong answer shows the right answer
   and why, and there's no shot. Then the computer fires once (it usually finishes off a ship it has hit; otherwise it
   fires mostly on a checkerboard, which every ship crosses). Two kinds of grid:
     letters  squares A1, B3… (any subject)
     plane    the points of a coordinate plane from −R to R; with namePoints the student types the coordinates of the
              point she aimed at, and the shot lands where she typed (so swapping x and y misses)
   Phone: one grid at a time (tabs; the game switches for each turn). Wide screens: both grids side by side.
   Keyboard: arrows move the aim on the grid, Enter fires. */
(function () {
  'use strict';
  var PG = window.PG, D = PG.D, esc = PG.esc, S = D.theme.sprites, N = D.theme.names;
  var set = D.settings || {};
  var PLANE = set.mode === 'plane';
  var R = PLANE ? Math.max(3, Math.min(6, set.range || 4)) : 0;
  var SIZE = PLANE ? 2 * R + 1 : Math.max(5, Math.min(8, set.size || 6));
  var NAME = PLANE && set.namePoints !== false;
  var FLEET = (set.ships || (SIZE >= 8 ? [4, 3, 3, 2] : [3, 3, 2, 2])).slice(0, 5);
  var SHIP_NAMES = [].concat(N.ships || []);
  var LET = 'ABCDEFGHIJ';
  function sg(n) { return n < 0 ? '−' + (-n) : String(n); }
  // a square's place: [col, row] from 0; its name: "B3" or "(−1, 2)"
  function nameOf(c, r) { return PLANE ? '(' + sg(c - R) + ', ' + sg(R - r) + ')' : LET[c] + (r + 1); }
  function key(c, r) { return c + ',' + r; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  PG.T = {
    how: '<ul class="how"><li>' + esc(cap(N.enemy)) + ' and ' + esc(N.mine) + ' are hidden on two ' + (PLANE ? 'coordinate planes' : 'grids') + ': ' + FLEET.length + ' ships each (' + FLEET.join(', ') + ' ' + (PLANE ? 'points' : 'squares') + ' long).</li>' +
      '<li>Answer the question. A right answer earns a shot: tap a ' + (PLANE ? 'point' : 'square') + ' in their waters (or use the arrow keys and Enter).' + (NAME ? ' Then type the point’s coordinates: the shot lands where you type!' : '') + '</li>' +
      '<li>A wrong answer shows the right answer and why, and there’s no shot that round.</li>' +
      '<li>Then ' + esc(N.enemy) + ' fire back once. The game ends when the questions run out or a fleet is sunk.</li>' +
      '<li>⭐ for hitting more ship ' + (PLANE ? 'points' : 'squares') + ' than they do, ⭐ for sinking 2 ships, ⭐ for 80% right.</li></ul>',
    play: play
  };
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  function placeFleet() {
    for (;;) {
      var taken = {}, ships = [], ok = true;
      for (var i = 0; i < FLEET.length && ok; i++) {
        var len = FLEET[i], placed = false;
        for (var t = 0; t < 300 && !placed; t++) {
          var h = Math.random() < 0.5, c = rnd(0, h ? SIZE - len : SIZE - 1), r = rnd(0, h ? SIZE - 1 : SIZE - len), cells = [];
          for (var k = 0; k < len; k++) cells.push(h ? [c + k, r] : [c, r + k]);
          if (cells.some(function (x) { return taken[key(x[0], x[1])]; })) continue;
          cells.forEach(function (x) { taken[key(x[0], x[1])] = 1; });
          ships.push({ name: SHIP_NAMES[i] || ('Ship ' + (i + 1)), cells: cells, hits: {} }); placed = true;
        }
        if (!placed) ok = false;
      }
      if (ok) return ships;
    }
  }
  function shipAt(fleet, c, r) { for (var i = 0; i < fleet.length; i++) if (fleet[i].cells.some(function (x) { return x[0] === c && x[1] === r; })) return fleet[i]; return null; }
  function sunk(s) { return Object.keys(s.hits).length === s.cells.length; }
  function afloat(f) { return f.filter(function (s) { return !sunk(s); }); }
  function partsHit(f) { return f.reduce(function (n, s) { return n + Object.keys(s.hits).length; }, 0); }

  function play(deck, done) {
    var G = { deck: deck, i: 0, enemy: placeFleet(), mine: placeFleet(), mySh: {}, theirSh: {}, records: [], phase: 'ask', view: 'enemy', cursor: [Math.floor(SIZE / 2), Math.floor(SIZE / 2)], aim: null, msg: '', named: 0, namedOK: 0, last: null, over: false };
    var app = PG.app;

    /* ---------- the boards (SVG) ---------- */
    var C = PLANE ? 30 : 44, PAD = PLANE ? 24 : 26, W = PAD + C * SIZE + (PLANE ? PAD - C : 6);
    function cx(c) { return PLANE ? PAD + c * C : PAD + c * C + C / 2; }
    function cy(r) { return PLANE ? PAD + r * C : PAD + r * C + C / 2; }
    function boardSVG(which) {
      var enemy = which === 'enemy', shots = enemy ? G.mySh : G.theirSh, fleet = enemy ? G.enemy : G.mine, g = '';
      g += '<rect class="sea" x="0" y="0" width="' + W + '" height="' + W + '" rx="12"/>';
      if (PLANE) {
        for (var i = 0; i < SIZE; i++) g += '<line class="gl" x1="' + cx(i) + '" y1="' + cy(0) + '" x2="' + cx(i) + '" y2="' + cy(SIZE - 1) + '"/><line class="gl" x1="' + cx(0) + '" y1="' + cy(i) + '" x2="' + cx(SIZE - 1) + '" y2="' + cy(i) + '"/>';
        g += '<line class="ax" x1="' + (cx(0) - 8) + '" y1="' + cy(R) + '" x2="' + (cx(SIZE - 1) + 8) + '" y2="' + cy(R) + '"/><line class="ax" x1="' + cx(R) + '" y1="' + (cy(SIZE - 1) + 8) + '" x2="' + cx(R) + '" y2="' + (cy(0) - 8) + '"/>';
        for (var v = -R; v <= R; v++) if (v) g += '<text class="n" x="' + cx(v + R) + '" y="' + (cy(R) + 13) + '">' + sg(v) + '</text><text class="n" x="' + (cx(R) - 9) + '" y="' + (cy(R - v) + 4) + '">' + sg(v) + '</text>';
      } else {
        for (var c = 0; c < SIZE; c++) g += '<text class="n" x="' + cx(c) + '" y="' + (PAD - 8) + '">' + LET[c] + '</text>';
        for (var r = 0; r < SIZE; r++) g += '<text class="n" x="' + (PAD - 12) + '" y="' + (cy(r) + 5) + '">' + (r + 1) + '</text>';
      }
      var tappable = enemy && G.phase === 'aim', marks = '';
      for (var cc = 0; cc < SIZE; cc++) for (var rr = 0; rr < SIZE; rr++) {
        var k = key(cc, rr), res = shots[k], X = cx(cc), Y = cy(rr), nm = nameOf(cc, rr);
        var attrs = ' data-cell="' + k + '"' + (res ? ' data-shot="' + res + '"' : '') + ' aria-label="' + esc(nm + (res ? (res === 'hit' ? ', hit' : ', miss') : '')) + '"' + (tappable && !res ? ' role="button"' : '');
        if (PLANE) g += '<g' + attrs + ' class="cell' + (tappable && !res ? ' live' : '') + '"><circle class="hot" cx="' + X + '" cy="' + Y + '" r="13"/><circle class="dot" cx="' + X + '" cy="' + Y + '" r="2.5"/>';
        else g += '<g' + attrs + ' class="cell' + (tappable && !res ? ' live' : '') + '"><rect class="sq" x="' + (X - C / 2 + 1) + '" y="' + (Y - C / 2 + 1) + '" width="' + (C - 2) + '" height="' + (C - 2) + '" rx="5"/>';
        g += '</g>';
        if (res) marks += '<text class="mk' + (k === G.last ? ' new' : '') + '" x="' + X + '" y="' + (Y + 7) + '">' + esc(res === 'hit' ? S.hit : S.miss) + '</text>';
      }
      if (!enemy || G.over) fleet.forEach(function (s) {   // her ships (and theirs at the end) as capsules
        var xs = s.cells.map(function (x) { return cx(x[0]); }), ys = s.cells.map(function (x) { return cy(x[1]); }), pad = PLANE ? 11 : 17;
        var x0 = Math.min.apply(0, xs) - pad, y0 = Math.min.apply(0, ys) - pad;
        g += '<rect class="ship' + (enemy ? ' theirs' : '') + (sunk(s) ? ' sunk' : '') + '" x="' + x0 + '" y="' + y0 + '" width="' + (Math.max.apply(0, xs) - Math.min.apply(0, xs) + 2 * pad) + '" height="' + (Math.max.apply(0, ys) - Math.min.apply(0, ys) + 2 * pad) + '" rx="' + pad + '"/>';
      });
      g += marks;
      if (enemy && G.phase === 'aim') g += '<circle class="cursor" cx="' + cx(G.cursor[0]) + '" cy="' + cy(G.cursor[1]) + '" r="' + (PLANE ? 13 : 19) + '"/>';
      if (enemy && G.aim && G.phase === 'name') g += '<circle class="aim" cx="' + cx(G.aim[0]) + '" cy="' + cy(G.aim[1]) + '" r="13"/><text class="lbl" x="' + (cx(G.aim[0]) + 13) + '" y="' + (cy(G.aim[1]) - 12) + '">A</text>';
      return '<svg id="gb-' + which + '" class="board' + (tappable ? ' aiming' : '') + '" viewBox="0 0 ' + W + ' ' + W + '" ' + (tappable ? 'tabindex="0" ' : '') + 'role="group" aria-label="' + esc(enemy ? 'Their waters' : 'Your fleet') + (tappable ? ': choose where to fire' : '') + '">' + g + '</svg>';
    }
    function fleetHTML(f) { return '<div class="fleet">' + f.map(function (s) { return sunk(s) ? '<span class="gone"><s>' + esc(s.name) + '</s> sunk</span>' : '<span>' + esc(s.name) + ' (' + s.cells.length + ')</span>'; }).join('') + '</div>'; }

    /* ---------- the screen ---------- */
    function render(focus) {
      var q = G.deck[G.i], P = G.phase, panel = '';
      if (P === 'ask') {
        panel = '<p class="small muted">Answer right to earn a shot.</p>' + PG.promptHTML(q) +
          (q.typed ? PG.typedHTML('Check') : '<div class="opts" id="gb-opts">' + q.choices.map(function (h, c) { return '<button type="button" data-c="' + c + '"><span class="k">' + (c + 1) + '</span><span>' + h + '</span></button>'; }).join('') + '</div>');
      } else if (P === 'aim') {
        panel = '<div class="fb ok fade-in"><b>✓ Right!</b> You earned a shot. Tap a ' + (PLANE ? 'point' : 'square') + ' in their waters' + (PLANE ? '' : ' (or use the arrow keys and Enter)') + '.</div>';
      } else if (P === 'name') {
        panel = '<p class="q">You aimed at point A. What are its coordinates? The shot lands where you type.</p>' +
          '<form class="row" id="gb-name" autocomplete="off"><span class="coord">( <input type="text" id="gb-x" inputmode="numeric" aria-label="x-coordinate" maxlength="3"> , <input type="text" id="gb-y" inputmode="numeric" aria-label="y-coordinate" maxlength="3"> )</span><button class="go" type="submit">🔥 Fire</button></form>' +
          '<p class="small muted">Type a minus sign for a negative number, like -3. x comes first.</p>';
      } else {
        panel = G.msg + '<div class="row"><button type="button" class="go" id="gb-next">' + (G.over ? 'See results ▶' : 'Next question ▶') + '</button></div>';
      }
      var wide = window.innerWidth >= 760;
      var showEnemy = wide || G.view === 'enemy', showMine = wide || G.view === 'mine';
      app.innerHTML = '<div id="gb" data-phase="' + P + '"' + (G.aim ? ' data-aim="' + (G.aim[0] - R) + ',' + (R - G.aim[1]) + '"' : '') + '>' +
        '<div class="hud"><span class="pill">Round ' + Math.min(G.i + 1, G.deck.length) + ' of ' + G.deck.length + '</span><span class="pill">' + esc(S.hit) + ' Your hits ' + partsHit(G.enemy) + '</span><span class="pill">Their hits ' + partsHit(G.mine) + '</span></div>' +
        '<div class="card" id="gb-panel"' + (q && P === 'ask' ? ' data-qid="' + esc(q.id) + '"' : '') + '>' + panel + '</div>' +
        (wide ? '' : '<div class="tabs" role="tablist"><button type="button" role="tab" data-view="enemy" aria-selected="' + (G.view === 'enemy') + '">' + esc(S.enemy) + ' Their waters</button><button type="button" role="tab" data-view="mine" aria-selected="' + (G.view === 'mine') + '">⚓ Your fleet</button></div>') +
        '<div class="boards">' +
        (showEnemy ? '<div class="bwrap"><h2>' + esc(S.enemy) + ' Their waters (' + esc(N.enemy) + ')</h2>' + boardSVG('enemy') + fleetHTML(G.enemy) + '</div>' : '') +
        (showMine ? '<div class="bwrap"><h2>⚓ ' + esc(cap(N.mine)) + '</h2>' + boardSVG('mine') + fleetHTML(G.mine) + '</div>' : '') +
        '</div></div>';
      PG.$$('[data-view]').forEach(function (b) { b.onclick = function () { G.view = b.getAttribute('data-view'); render(); }; });
      PG.$$('#gb-opts button').forEach(function (b) { b.onclick = function () { answer(+b.getAttribute('data-c')); }; });
      if (q && q.typed && P === 'ask') PG.bindTyped(function (v) { answer(v); });
      var eb = PG.$('#gb-enemy');
      if (eb && P === 'aim') {
        PG.$$('[data-cell]', eb).forEach(function (el) { if (!el.hasAttribute('data-shot')) el.addEventListener('click', function () { var k = el.getAttribute('data-cell').split(',').map(Number); aimAt(k[0], k[1]); }); });
        eb.addEventListener('keydown', onBoardKey);
        if (focus) setTimeout(function () { try { eb.focus({ preventScroll: true }); } catch (e) {} }, 30);
      }
      if (P === 'name') { var f = PG.$('#gb-name'); f.onsubmit = function (e) { e.preventDefault(); fireNamed(); }; setTimeout(function () { PG.$('#gb-x').focus(); }, 30); }
      var nb = PG.$('#gb-next'); if (nb) { nb.onclick = nextRound; if (focus) setTimeout(function () { try { nb.focus({ preventScroll: true }); } catch (e) {} }, 30); }
      if (P === 'ask' && focus && !q.typed) setTimeout(function () { var b = PG.$('#gb-opts button'); if (b) try { b.focus({ preventScroll: true }); } catch (e) {} }, 30);
    }
    function onBoardKey(e) {
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) { e.preventDefault(); G.cursor = [Math.max(0, Math.min(SIZE - 1, G.cursor[0] + d[0])), Math.max(0, Math.min(SIZE - 1, G.cursor[1] + d[1]))]; render(true); PG.say(nameOf(G.cursor[0], G.cursor[1])); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!G.mySh[key(G.cursor[0], G.cursor[1])]) aimAt(G.cursor[0], G.cursor[1]); else PG.say('Already fired there.'); }
    }

    /* ---------- a round ---------- */
    function answer(v) {
      var q = G.deck[G.i], ok, given;
      if (q.typed) { ok = PG.checkTyped(q, v); given = v; } else { ok = v === q.answer; given = q.choicesPlain[v]; }
      G.records.push({ q: q, ok: ok, given: given });
      if (ok) { PG.sound('right'); G.phase = 'aim'; G.view = 'enemy'; render(true); PG.say('Right! Choose where to fire.'); }
      else { PG.sound('wrong'); G.msg = PG.whyHTML(q, false) + '<p class="fb info">No shot this round.</p>'; enemyTurn(); }
    }
    function aimAt(c, r) {
      G.cursor = [c, r];
      if (NAME) { G.aim = [c, r]; G.phase = 'name'; render(true); return; }
      fireAt(c, r, '');
    }
    function fireNamed() {
      var read = function (id) { var s = PG.$(id).value.replace(/[−–]/g, '-').trim(); return /^-?\d+$/.test(s) ? parseInt(s, 10) : NaN; };
      var x = read('#gb-x'), y = read('#gb-y');
      if (isNaN(x) || isNaN(y)) { PG.say('Type a whole number in each box.'); (isNaN(x) ? PG.$('#gb-x') : PG.$('#gb-y')).focus(); return; }
      var ax = G.aim[0] - R, ay = R - G.aim[1], note;
      G.named++;
      if (x === ax && y === ay) { G.namedOK++; note = ''; }
      else note = '<p class="fb bad">You aimed at ' + nameOf(G.aim[0], G.aim[1]) + ' but typed (' + sg(x) + ', ' + sg(y) + ')' + (x === ay && y === ax ? ': x and y swapped. x (across) comes first.' : Math.abs(x) === Math.abs(ax) && Math.abs(y) === Math.abs(ay) ? ': check the signs. Left of the y-axis x is negative; below the x-axis y is negative.' : '.') + ' The shot goes where you typed.</p>';
      G.aim = null;
      var c = x + R, r = R - y;
      if (c < 0 || r < 0 || c >= SIZE || r >= SIZE) { G.msg = note + '<p class="fb info">(' + sg(x) + ', ' + sg(y) + ') is outside their waters: a splash in the open sea.</p>'; return enemyTurn(); }
      if (G.mySh[key(c, r)]) { G.msg = note + '<p class="fb info">You already fired at (' + sg(x) + ', ' + sg(y) + '). The shot is wasted.</p>'; return enemyTurn(); }
      fireAt(c, r, note);
    }
    function shoot(fleet, shots, c, r) {
      var s = shipAt(fleet, c, r), k = key(c, r);
      shots[k] = s ? 'hit' : 'miss'; G.last = k;
      if (!s) return 'miss';
      s.hits[k] = 1;
      return sunk(s) ? 'sunk ' + s.name : 'hit';
    }
    function fireAt(c, r, note) {
      var res = shoot(G.enemy, G.mySh, c, r);
      PG.sound(res === 'miss' ? 'click' : 'boom');
      G.msg = note + '<p class="fb ' + (res === 'miss' ? 'info' : 'ok') + '">Your shot at ' + nameOf(c, r) + ': ' + (res === 'miss' ? esc(S.miss) + ' a miss.' : res === 'hit' ? esc(S.hit) + ' a hit!' : esc(S.hit) + ' you sank their ' + esc(res.slice(5)) + '!') + '</p>';
      if (!afloat(G.enemy).length) { G.over = true; G.msg += '<p class="fb ok"><b>You sank every ship!</b></p>'; G.phase = 'next'; G.view = 'enemy'; render(true); return; }
      enemyTurn();
    }
    function enemyTurn() {
      var target = null, live = Object.keys(G.theirSh).filter(function (k) { if (G.theirSh[k] !== 'hit') return false; var p = k.split(',').map(Number); return !sunk(shipAt(G.mine, p[0], p[1])); });
      if (live.length && Math.random() < 0.6) {
        var opts = [];
        live.forEach(function (k) { var p = k.split(',').map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var c = p[0] + d[0], r = p[1] + d[1]; if (c >= 0 && r >= 0 && c < SIZE && r < SIZE && !G.theirSh[key(c, r)]) opts.push([c, r]); }); });
        if (opts.length) target = pick(opts);
      }
      for (var t = 0; !target && t < 500; t++) { var c = rnd(0, SIZE - 1), r = rnd(0, SIZE - 1); if (!G.theirSh[key(c, r)] && ((c + r) % 2 === 0 || t > 60 || Math.random() < 0.25)) target = [c, r]; }
      if (target) {
        var res = shoot(G.mine, G.theirSh, target[0], target[1]);
        G.msg += '<p class="fb ' + (res === 'miss' ? 'info' : 'bad') + '">' + esc(cap(N.enemy)) + ' fired at ' + nameOf(target[0], target[1]) + ': ' + (res === 'miss' ? 'a miss.' : res === 'hit' ? 'a hit on your fleet!' : 'they sank your ' + esc(res.slice(5)) + '!') + '</p>';
      }
      if (!afloat(G.mine).length) { G.over = true; G.msg += '<p class="fb bad"><b>Your whole fleet is sunk.</b></p>'; }
      if (G.i + 1 >= G.deck.length) G.over = true;
      G.phase = 'next'; G.view = 'mine';
      render(true);
    }
    function nextRound() {
      if (G.over) return finish();
      G.i++; G.phase = 'ask'; G.msg = ''; G.view = 'enemy'; G.last = null;
      render(true); window.scrollTo(0, 0);
    }
    function finish() {
      var right = G.records.filter(function (r) { return r.ok; }).length, mine = partsHit(G.enemy), theirs = partsHit(G.mine);
      var sank = G.enemy.filter(sunk).length;
      var stars = (mine > theirs || !afloat(G.enemy).length ? 1 : 0) + (sank >= 2 ? 1 : 0) + (G.records.length && right / G.records.length >= 0.8 ? 1 : 0);
      var stats = [['Ships sunk', sank + ' of ' + G.enemy.length], ['Your hits / theirs', mine + ' / ' + theirs]];
      if (G.named) stats.push(['Points named right', G.namedOK + ' of ' + G.named]);
      done({ records: G.records, score: right * 100 + mine * 50 + sank * 100, stars: stars, stats: stats, line: !afloat(G.enemy).length ? 'Every ship sunk!' : mine > theirs ? 'You won the battle!' : !afloat(G.mine).length ? 'Your fleet went down. Try again!' : 'Battle over!' });
    }
    var lastWide = window.innerWidth >= 760;
    window.addEventListener('resize', function () { var w = window.innerWidth >= 760; if (w !== lastWide && document.getElementById('gb')) { lastWide = w; render(); } });
    render(true);
  }
  PG.start();
})();
