/* ☄️ Answer shooter (docs/KINDS-PRACTICEGAMES.md). Adapted from the owner's Shape Asteroids (Pet World): targets drift
   toward the player's ship; the question is on top and every target carries one answer. Tap the right one (or press its
   number key) to fire. Typed questions (numbers or words) send one big target: type the answer before it lands.
   Waves of questions, each faster. One shot per question: a miss or a target that lands shows the right answer and why.
   With reduced motion the targets stand still and a bar shows the time. */
(function () {
  'use strict';
  var PG = window.PG, D = PG.D, esc = PG.esc, S = D.theme.sprites, N = D.theme.names;
  var set = D.settings || {};
  var PER_WAVE = Math.max(2, set.perWave || 5), SECONDS = Math.max(6, set.seconds || 16), SPEEDUP = set.speedup || 1.2;
  var L = '123456';

  PG.T = {
    how: '<ul class="how"><li>' + esc(S.target) + ' ' + esc(cap(N.targets)) + ' fall toward your ' + esc(N.player) + ', each carrying an answer.</li>' +
      '<li>Tap the right answer to fire (or press its number key). One shot per question!</li>' +
      '<li>Some questions need a typed answer: type it and press Enter before the ' + esc(N.target) + ' lands.</li>' +
      '<li>Every ' + PER_WAVE + ' questions a new wave starts, a little faster. Quick right answers score more.</li>' +
      '<li>At the end you’ll see every question you missed, with the right answer and why, and you can practice just those.</li></ul>',
    play: play
  };
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  function play(deck, done) {
    var G = { i: 0, score: 0, streak: 0, best: 0, records: [], raf: 0, paused: false };
    var app = PG.app;
    app.innerHTML = '<div class="hud" id="sh-hud"></div><div class="card" id="sh-q"></div>' +
      '<div class="field" id="sh-field" aria-label="Play area"><div class="ship" aria-hidden="true">' + esc(S.player) + '</div><div class="ground"></div><div class="timer"><i></i></div></div>' +
      '<div id="sh-under"></div>';
    var field = PG.$('#sh-field'), qBox = PG.$('#sh-q'), under = PG.$('#sh-under'), hud = PG.$('#sh-hud'), bar = PG.$('#sh-field .timer i');
    var cur = null, last = 0;

    function wave() { return Math.floor(G.i / PER_WAVE); }
    function drawHud() {
      hud.innerHTML = '<span class="pill">Wave ' + (wave() + 1) + '</span><span class="pill">Question ' + Math.min(G.i + 1, deck.length) + ' of ' + deck.length + '</span>' +
        '<span class="pill">Score ' + G.score + '</span>' + (G.streak > 1 ? '<span class="pill">🔥 ' + G.streak + ' in a row</span>' : '') +
        '<button type="button" id="sh-pause" class="pill" aria-pressed="' + G.paused + '">' + (G.paused ? '▶ Go' : '⏸ Pause') + '</button>';
      PG.$('#sh-pause').onclick = function () { G.paused = !G.paused; last = 0; drawHud(); if (!G.paused && cur && !cur.done) field.focus(); };
    }

    function next() {
      if (G.i >= deck.length) return finish();
      if (G.i > 0 && G.i % PER_WAVE === 0 && G.bannerFor !== G.i) { G.bannerFor = G.i; return banner('Wave ' + (wave() + 1) + '! A little faster.', next); }
      ask(deck[G.i]);
    }
    function banner(text, then) {
      var b = document.createElement('div'); b.className = 'banner fade-in'; b.textContent = text; field.appendChild(b);
      PG.say(text);
      setTimeout(function () { b.remove(); then(); }, PG.reduced ? 700 : 1300);
    }

    function ask(q) {
      PG.$$('.tg, .laser, .boom, .banner', field).forEach(function (e) { e.remove(); });
      field.classList.remove('hit-ground');
      var typed = !!q.typed;
      var limit = SECONDS * (typed ? 1.7 : 1) / Math.pow(SPEEDUP, wave());
      cur = { q: q, t: 0, limit: limit, done: false, targets: [] };
      qBox.innerHTML = PG.promptHTML(q); qBox.setAttribute('data-qid', q.id);
      under.innerHTML = typed ? PG.typedHTML('Fire') : '<p class="small muted">Tap the ' + esc(N.target) + ' with the right answer, or press its number.</p>';
      drawHud();
      var W = field.clientWidth, H = field.clientHeight;
      var opts = typed ? [{ html: '<span class="big">?</span>', c: -1 }] : (q.choices || []).map(function (h, c) { return { html: h, c: c }; });
      opts = typed ? opts : PG.shuffle(opts);
      var n = opts.length, lanes = typed ? 1 : Math.max(2, Math.min(n, Math.floor(W / 130))), rows = Math.ceil(n / lanes), lw = W / lanes;
      opts.forEach(function (o, k) {
        var el = document.createElement('button');
        el.type = 'button'; el.className = 'tg' + (typed ? ' boss' : '');
        el.setAttribute('data-c', o.c);
        el.innerHTML = (typed ? '' : '<span class="k" aria-hidden="true">' + L[k] + '</span>') + '<span class="spr" aria-hidden="true">' + esc(S.target) + '</span><span class="tx">' + o.html + '</span>';
        el.setAttribute('aria-label', typed ? 'The ' + N.target + ': type the answer below' : 'Answer ' + (k + 1) + ': ' + (q.choicesPlain[o.c] || ''));
        el.style.width = Math.min(lw - 10, typed ? 200 : 220) + 'px';
        field.appendChild(el);
        var lane = k % lanes, row = Math.floor(k / lanes);
        var t = { el: el, c: o.c, key: k, x: lane * lw + lw / 2, y0: 6 - row * 96, ph: Math.random() * 6.28, amp: PG.reduced ? 0 : Math.min(18, lw * 0.12) };
        if (PG.reduced) t.y0 = 8 + row * 96;
        cur.targets.push(t);
        if (!typed) el.onclick = function () { shoot(t); };
      });
      cur.drop = H - 64 - 8;   // how far a first-row target falls before it lands
      if (typed) PG.bindTyped(function (v) { shootTyped(v); });
      else setTimeout(function () { var first = PG.$('.tg', field); if (first) try { first.focus({ preventScroll: true }); } catch (e) {} }, 40);
      place(); last = 0;
    }

    function place() {
      var k = Math.min(1, cur.t / cur.limit);
      bar.style.width = (100 * (1 - k)) + '%';
      cur.targets.forEach(function (t) {
        var w = t.el.offsetWidth, h = t.el.offsetHeight;
        var y = PG.reduced ? t.y0 : t.y0 + cur.drop * k - (k * h);
        var x = Math.max(4, Math.min(field.clientWidth - w - 4, t.x + Math.sin(cur.t * 1.3 + t.ph) * t.amp - w / 2));
        t.el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
        t.yNow = y + h / 2; t.xNow = x + w / 2;
      });
    }
    function loop(ts) {
      G.raf = requestAnimationFrame(loop);
      if (!cur || cur.done || G.paused || document.hidden) { last = 0; return; }
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      cur.t += dt; place();
      if (cur.t >= cur.limit) timeUp();
    }
    G.raf = requestAnimationFrame(loop);

    function laser(t) {
      var W = field.clientWidth, H = field.clientHeight, x0 = W / 2, y0 = H - 40, dx = t.xNow - x0, dy = t.yNow - y0;
      var l = document.createElement('div'); l.className = 'laser';
      l.style.width = Math.hypot(dx, dy) + 'px'; l.style.transform = 'translate(' + x0 + 'px,' + y0 + 'px) rotate(' + Math.atan2(dy, dx) + 'rad)';
      field.appendChild(l); setTimeout(function () { l.remove(); }, 380);
      PG.sound('fire');
    }
    function boom(t, sprite) {
      var b = document.createElement('div'); b.className = 'boom'; b.textContent = sprite;
      b.style.transform = 'translate(' + (t.xNow - 24) + 'px,' + (t.yNow - 24) + 'px)'; field.appendChild(b);
      setTimeout(function () { b.remove(); }, 700);
    }
    function shoot(t) {
      if (!cur || cur.done || G.paused) return;
      var q = cur.q, ok = t.c === q.answer;
      laser(t);
      settle(ok, q.choicesPlain[t.c], t);
    }
    function shootTyped(v) {
      if (!cur || cur.done || G.paused) return;
      var t = cur.targets[0], ok = PG.checkTyped(cur.q, v);
      laser(t);
      settle(ok, v, t);
    }
    function timeUp() { settle(false, '(time ran out)', null, true); }

    function settle(ok, given, t, late) {
      cur.done = true;
      var q = cur.q;
      G.records.push({ q: q, ok: ok, given: given });
      cur.targets.forEach(function (x) {
        x.el.disabled = true;
        if (x.c === q.answer) x.el.classList.add('right');
        else if (t && x === t && !ok) x.el.classList.add('wrong', 'shake');
        else x.el.classList.add('dim');
      });
      var form = PG.$('#pg-typed'); if (form) PG.$$('input, button', form).forEach(function (e) { e.disabled = true; });
      if (ok) {
        var bonus = Math.round(50 * Math.max(0, 1 - cur.t / cur.limit));
        G.streak++; G.best = Math.max(G.best, G.streak);
        G.score += 100 + bonus + 10 * Math.min(G.streak - 1, 5);
        PG.sound('right'); setTimeout(function () { PG.sound('boom'); }, 120);
        boom(t, S.hit); t.el.classList.add('gone');
        under.innerHTML = '<div class="fb ok fade-in" role="status"><b>✓ Right!</b> +' + (100 + bonus) + (G.streak > 1 ? ' · 🔥 ' + G.streak + ' in a row' : '') + '</div>';
        PG.say('Right!');
        drawHud();
        G.i++;
        setTimeout(next, PG.reduced ? 600 : 1000);
      } else {
        G.streak = 0;
        PG.sound('wrong');
        if (late) { field.classList.add('hit-ground'); PG.say('Time ran out.'); }
        under.innerHTML = (late ? '<p class="fb bad fade-in"><b>' + esc(S.miss) + ' Too slow!</b> The ' + esc(N.target) + ' landed.</p>' : '') + PG.whyHTML(q, false) +
          '<div class="row"><button type="button" class="go" id="sh-next">Next ▶</button></div>';
        drawHud();
        G.i++;
        var nb = PG.$('#sh-next'); nb.onclick = next;
        setTimeout(function () { try { nb.focus({ preventScroll: true }); } catch (e) {} under.scrollIntoView({ block: 'nearest' }); }, 30);
      }
    }
    function finish() {
      cancelAnimationFrame(G.raf); document.removeEventListener('keydown', onKey);
      PG.say('Done!');
      done({ records: G.records, score: G.score, stats: [['Best streak', G.best]] });
    }
    function onKey(e) {
      if (!cur || cur.done || G.paused || e.target.tagName === 'INPUT') return;
      var k = L.indexOf(e.key);
      if (k >= 0) { var t = cur.targets.filter(function (x) { return x.key === k; })[0]; if (t && !cur.q.typed) { e.preventDefault(); shoot(t); } }
    }
    document.addEventListener('keydown', onKey);
    next();
  }
  PG.start();
})();
