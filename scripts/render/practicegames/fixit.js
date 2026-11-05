/* ✍️ Fix-it desk (docs/KINDS-PRACTICEGAMES.md). Adapted from the owner's Red Pen Desk, Book Repair Desk and Rule Court
   (Pet World): helpers turn in papers, and every paper has exactly one mistake (a word, a mark, a number or a step).
     1. Find it: tap the piece with the mistake. A wrong tap says that piece is fine and sends the paper back to the
        pile; it comes back two papers later, and a second wrong tap circles the mistake.
     2. Fix it: pick the fix (each wrong fix can say why) or type it (capitals and marks count).
   Every paper ends fixed, shown corrected and stamped: a star when it was fixed with no slips. */
(function () {
  'use strict';
  var PG = window.PG, D = PG.D, esc = PG.esc, S = D.theme.sprites, N = D.theme.names;
  var HELPERS = [].concat(S.helpers || ['🙂']), NAMES = [].concat(N.helpers || ['Ava', 'Ben', 'Cruz', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana']);
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  PG.T = {
    how: '<ul class="how"><li>You’re at ' + esc(N.desk) + '. Each ' + esc(N.helper) + ' turns in a ' + esc(N.paper) + ' with <b>exactly one mistake</b>.</li>' +
      '<li><b>Find it:</b> tap the part that’s wrong. A wrong tap sends the ' + esc(N.paper) + ' back to your pile; it comes back soon.</li>' +
      '<li><b>Fix it:</b> pick or type the fix. When you type, capitals and punctuation count.</li>' +
      '<li>A ' + esc(N.paper) + ' fixed with no slips gets a ' + esc(S.stamp) + '. At the end you’ll see the ones that needed help, with the fix and why.</li></ul>',
    play: play
  };

  function play(deck, done) {
    var G = { pile: deck.slice(), st: {}, records: [], fixed: 0, stars: 0, score: 0, n: deck.length, who: 0, cur: null, phase: 'find', msg: '' };
    deck.forEach(function (q, i) { G.st[q.id] = { taps: 0, fixMiss: 0, given: '', helper: i, tried: {} }; });
    var app = PG.app;

    function paperHTML(q, mode) {
      var st = G.st[q.id];
      if (mode === 'fixed') return '<div class="paper fixed" id="fx-paper"><div class="ptext">' + q.fixedHtml + '</div><div class="stamp" aria-label="' + (perfect(q) ? 'a star' : 'fixed with help') + '">' + esc(perfect(q) ? S.stamp : S.ok) + '</div></div>';
      var html = q.pieces.map(function (p, i) {
        if (p.br) return '<br>';
        var cls = 'pc' + (mode === 'fix' && p.e ? ' err' : '') + (st.circled && p.e ? ' circled' : '') + (st.tried[i] ? ' ok' : '');
        var inner = p.h;
        return (mode === 'find' ? '<button type="button" class="' + cls + '" data-i="' + i + '" data-e="' + p.e + '"' + (st.tried[i] ? ' data-tried="1" disabled' : '') + '>' + inner + '</button>' : '<span class="' + cls + '">' + inner + '</span>') + (p.sp ? ' ' : '');
      }).join('');
      return '<div class="paper" id="fx-paper"><div class="ptext">' + html + '</div></div>';
    }
    function perfect(q) { var st = G.st[q.id]; return !st.taps && !st.fixMiss; }
    function helperOf(q) { var k = G.st[q.id].helper; return HELPERS[k % HELPERS.length] + ' ' + NAMES[k % NAMES.length]; }

    function render(focus) {
      var q = G.cur, P = G.phase, st = G.st[q.id], body = '';
      var head = '<p class="from"><span class="who">' + esc(helperOf(q)) + '</span> ' + (st.returned ? 'brought this ' + esc(N.paper) + ' back.' : 'turned in a ' + esc(N.paper) + '.') + '</p>';
      if (P === 'find') body = head + '<p class="q">' + (st.circled ? 'Here’s the mistake, circled. Tap it.' : 'Tap the part with the mistake.') + '</p>' + paperHTML(q, 'find');
      else if (P === 'fix') body = head + '<p class="q">Found it! Now fix <span class="errword">' + q.errHtml + '</span>.</p>' + paperHTML(q, 'fix') +
        (q.choices ? '<div class="opts" id="fx-opts">' + q.choices.map(function (h, c) { return '<button type="button" data-c="' + c + '"' + (st['no' + c] ? ' class="wrong" disabled' : '') + '><span class="k">' + (c + 1) + '</span><span>' + h + '</span></button>'; }).join('') + '</div>'
          : PG.typedHTML('Fix it', 'Type the fix')) + G.msg;
      else if (P === 'back') body = head + paperHTML(q, 'find') + G.msg + '<div class="row"><button type="button" class="go" id="fx-next">Next ' + esc(N.paper) + ' ▶</button></div>';
      else body = '<p class="from"><span class="who">' + esc(helperOf(q)) + '</span>: “Thanks! I fixed it.”</p>' + paperHTML(q, 'fixed') + G.msg + '<div class="row"><button type="button" class="go" id="fx-next">' + (G.pile.length ? 'Next ' + esc(N.paper) + ' ▶' : 'See results ▶') + '</button></div>';
      app.innerHTML = '<div id="fx" data-phase="' + P + '"><div class="hud"><span class="pill">Fixed ' + G.fixed + ' of ' + G.n + '</span><span class="pill">' + esc(S.stamp) + ' ' + G.stars + '</span><span class="pill">📥 Pile ' + G.pile.length + '</span></div>' +
        '<div class="card desk" data-qid="' + esc(q.id) + '">' + body + '</div></div>';
      PG.$$('#fx-paper button.pc').forEach(function (b) { b.onclick = function () { tap(+b.getAttribute('data-i')); }; });
      PG.$$('#fx-opts button').forEach(function (b) { b.onclick = function () { pickFix(+b.getAttribute('data-c')); }; });
      if (P === 'fix' && !q.choices) PG.bindTyped(typedFix);
      var nb = PG.$('#fx-next'); if (nb) { nb.onclick = next; if (focus) setTimeout(function () { try { nb.focus({ preventScroll: true }); } catch (e) {} }, 30); }
      if (focus && P === 'find') setTimeout(function () { var b = PG.$('#fx-paper button.pc:not([disabled])'); if (b) try { b.focus({ preventScroll: true }); } catch (e) {} }, 30);
      if (focus && P === 'fix' && q.choices) setTimeout(function () { var b = PG.$('#fx-opts button:not([disabled])'); if (b) try { b.focus({ preventScroll: true }); } catch (e) {} }, 30);
    }
    function plainOf(h) { var d = document.createElement('div'); d.innerHTML = h; var a = d.querySelector('annotation'); return a ? a.textContent : d.textContent; }

    function tap(i) {
      var q = G.cur, st = G.st[q.id], p = q.pieces[i];
      if (p.e) { PG.sound('right'); G.phase = 'fix'; G.msg = ''; render(true); PG.say('Found it. Now fix it.'); return; }
      PG.sound('wrong');
      st.taps++; st.tried[i] = 1;
      if (!st.given) st.given = 'tapped “' + plainOf(p.h) + '”';
      if (st.taps >= 2) { st.circled = true; G.phase = 'find'; render(true); PG.say('The mistake is circled.'); return; }
      G.msg = '<div class="fb bad fade-in" role="status">Hmm, not that one: “' + p.h + '” is right. This ' + esc(N.paper) + ' goes back on your pile' + (G.pile.length ? ' and comes back soon' : '') + '. Read every part again when it does.</div>';
      G.pile.splice(Math.min(2, G.pile.length), 0, q);
      G.phase = 'back'; render(true);
    }
    function pickFix(c) {
      var q = G.cur, st = G.st[q.id];
      if (c === q.answer) return fixed();
      PG.sound('wrong'); st.fixMiss++; st['no' + c] = 1;
      if (!st.given) st.given = 'fixed it as “' + q.choicesPlain[c] + '”';
      G.msg = '<div class="fb bad fade-in" role="status">Not that fix. ' + (q.choiceWhy && q.choiceWhy[c] ? q.choiceWhy[c] : 'Try another one.') + '</div>';
      render(true);
    }
    function typedFix(v) {
      var q = G.cur, st = G.st[q.id];
      if (PG.checkTyped(q, v)) return fixed();
      PG.sound('wrong'); st.fixMiss++;
      if (!st.given) st.given = 'fixed it as “' + v + '”';
      if (st.fixMiss >= 2) { G.msg = '<div class="fb bad">The fix is <b>' + q.fixHtml + '</b>.</div>'; return fixed(true); }
      G.msg = '<div class="fb bad fade-in" role="status">Not quite. Check the spelling, the capitals and the marks, then try again.</div>';
      render(true);
    }
    function fixed(shown) {
      var q = G.cur, ok = perfect(q);
      PG.sound(ok ? 'win' : 'right');
      G.fixed++; if (ok) G.stars++;
      G.score += ok ? 100 : 50;
      G.records.push({ q: q, ok: ok, given: G.st[q.id].given });
      G.msg = (shown ? G.msg : '') + '<div class="fb ' + (ok ? 'ok' : 'info') + ' fade-in" role="status"><b>' + (ok ? esc(S.stamp) + ' Perfect!' : esc(S.ok) + ' Fixed, with a little help.') + '</b>' + (q.why ? ' ' + q.why : '') + '</div>';
      G.phase = 'done'; render(true);
    }
    function next() {
      if (!G.pile.length) return done({ records: G.records, score: G.score, stats: [[S.stamp + ' papers', G.stars]], line: G.stars === G.n ? 'Every ' + N.paper + ' perfect!' : null });
      G.cur = G.pile.shift(); G.phase = 'find'; G.msg = ''; if (G.st[G.cur.id].taps) G.st[G.cur.id].returned = true;
      render(true); window.scrollTo(0, 0);
    }
    next();
  }
  PG.start();
})();
