/* The interactive review game (docs/KINDS-INTERACTIVE-FORMAT.md, "Review game"): the pack's question cards played on a
   device, one card at a time, with each card's category (its section) and points (its `points`, else its level), like
   the printed cards. page.js builds the shared pieces (saved work, answer boxes, checking) and hands them here as C
   when D.mode is "game".

   Alone, grading "auto": "Check" scores the card against salted hashes (a right first try earns its points, a right
   second try half), shows the explanation of a right answer (locked with it), and the results page totals the score;
   "Print my results". Longer written answers are left for the teacher.
   Alone, grading "print": no answer data at all. She answers every card, then gets an answer sheet to print or save.
   As a class ("Play as a class"): the cards big on a projector with a scoreboard for 2 to 6 teams; the teacher gives
   each card's points to a team. In "auto" pages "Reveal answer" shows the answer and why once the teacher types the
   class code printed only on the teacher copy (the answers are locked with it); "print" pages have no reveal. */
(window.PPI_MODES = window.PPI_MODES || {}).game = function (C) {
  'use strict';
  var D = C.D, P = C.P, esc = C.esc, app = C.app, AUTO = C.AUTO, cards = C.items;
  var TRIES = 2;
  function G() { var x = C.st().x; if (!x.game || typeof x.game !== 'object') x.game = {}; var g = x.game; if (!g.res) g.res = {}; if (!g.tries) g.tries = {}; if (typeof g.i !== 'number') g.i = 0; return g; }
  function ptsOf(q) { return q.pts || 1; }
  function totalPts() { return cards.reduce(function (s, q) { return s + (!AUTO || C.scored(q) ? ptsOf(q) : 0); }, 0); }
  function gotPts() { var g = G(); return cards.reduce(function (s, q) { var r = g.res[q.id]; return s + (r && r.got ? r.got : 0); }, 0); }
  function cats() { var seen = []; cards.forEach(function (q) { if (q.cat && seen.indexOf(q.cat) < 0) seen.push(q.cat); }); return seen; }
  function head(q, i) {
    return '<div class="cardhead"><span class="chip">' + esc(q.cat || 'Review') + '</span><span class="chip pts">' + ptsOf(q) + ' point' + (ptsOf(q) === 1 ? '' : 's') + '</span>' +
      '<span class="cnum">Card ' + (i + 1) + ' of ' + cards.length + '</span></div>';
  }
  function saved() { var st = C.st(); return '<p class="saved noprint" id="pp-saved" aria-live="polite">' + (st.savedAt ? 'Saved on this device at ' + C.timeText(st.savedAt) + '.' : 'Your game is saved on this device as you go.') + '</p>'; }
  function warn() { return C.canStore ? '' : '<p class="warn" role="status">This browser is blocking saving, so your game will be lost if you close the page. Finish in one go.</p>'; }

  /* ---------- the start ---------- */
  function showStart() {
    var st = C.st(), g = G();
    document.body.setAttribute('data-view', 'start'); document.body.classList.remove('big');
    var cs = cats(), going = g.started && !g.done;
    app.innerHTML = C.shell(
      '<section class="who" aria-label="About you"><div class="field"><label for="pp-name">Your name</label><input id="pp-name" type="text" autocomplete="name" value="' + esc(st.name) + '"></div>' +
      '<p class="date">Date: ' + esc(C.dateText()) + '</p></section>' + warn() +
      (D.directions ? '<p class="dirs">' + D.directions + '</p>' : '') +
      '<div id="main" class="gstart" tabindex="-1"><p><b>' + cards.length + ' cards</b>' + (cs.length ? ' in ' + cs.length + ' categor' + (cs.length === 1 ? 'y' : 'ies') + ': ' + cs.map(esc).join(' · ') : '') + '. ' + totalPts() + ' points to win.</p>' +
      '<p class="how">' + (AUTO ? 'Answer each card and press <b>Check</b>. A right answer on the first try earns the card\'s points; on the second try, half.' :
        'Answer each card and press <b>Save and next</b>. At the end you get an answer sheet to print or save for your teacher.') + '</p>' +
      '<p id="pp-err" class="err" role="alert"></p>' +
      '<div class="row"><button type="button" class="btn primary" id="pp-start">' + (going ? 'Keep playing (card ' + (g.i + 1) + ')' : 'Start') + '</button>' +
      '<button type="button" class="btn" id="pp-class">Play as a class (projector)</button>' + (g.started ? '<button type="button" class="btn" id="pp-reset">Start over for a new student</button>' : '') + '</div></div>' + saved());
  }
  function start() {
    var st = C.st(), g = G();
    if (!st.name.trim()) { document.getElementById('pp-err').textContent = 'Type your name at the top first.'; document.getElementById('pp-name').focus(); return; }
    if (g.done) { if (AUTO) { showResults(); return; } showSheet(); return; }
    g.started = true; C.save(); showCard();
  }

  /* ---------- one card ---------- */
  function feedbackHtml(q, r, again) {
    if (!r) return '';
    if (r.kind === 'teacher') return '<p class="fbk tch"><b>✎ Your teacher checks this one.</b> Your answer is saved.</p>';
    if (r.kind === 'right') return '<p class="fbk ok"><b>✓ Right!</b> +' + C.round1(r.got) + ' point' + (r.got === 1 ? '' : 's') + '</p>' + (r.why ? '<p class="rwhy"><span class="lbl2">Why:</span> ' + esc(r.why) + '</p>' : '');
    var h = '<p class="fbk ' + (r.kind === 'partial' ? 'part' : 'no') + '"><b>' + (r.kind === 'partial' ? '◐ Partly right.' : '✗ Not right.') + '</b>' +
      (again ? ' Try once more for half the points.' : r.got ? ' +' + C.round1(r.got) + ' points.' : ' Your teacher can go over this one.') + '</p>';
    if (r.msg) h += '<p class="rmsg">' + esc(r.msg) + '</p>';
    if (q.hint) h += '<p class="rhint"><span class="lbl2">Hint:</span> ' + q.hint + '</p>';
    return h;
  }
  function showCard(fb) {
    var g = G(), q = cards[g.i], r = g.res[q.id];
    document.body.setAttribute('data-view', 'card'); document.body.classList.remove('big');
    var final = !!r && r.final;
    app.innerHTML = C.shell(warn() +
      '<p class="gscore noprint" aria-live="polite">' + esc(C.st().name) + (AUTO ? ' · Score: <b id="pp-run">' + C.round1(gotPts()) + '</b> of ' + totalPts() : '') + '</p>' +
      '<section class="gcard" id="main" tabindex="-1" aria-label="Card ' + (g.i + 1) + ' of ' + cards.length + '">' + head(q, g.i) + C.questionHtml(q) +
      '<div id="pp-fb" role="status" aria-live="polite">' + (fb || (final ? feedbackHtml(q, r, false) : '')) + '</div><p id="pp-err" class="err" role="alert"></p>' +
      '<div class="row">' + (AUTO ? (final ? '<button type="button" class="btn primary" id="pp-next">' + (g.i + 1 < cards.length ? 'Next card' : 'See my results') + '</button>' :
        '<button type="button" class="btn primary" id="pp-check">Check</button>') :
        (g.i > 0 ? '<button type="button" class="btn" id="pp-back">Back</button>' : '') + '<button type="button" class="btn primary" id="pp-next">' + (g.i + 1 < cards.length ? 'Save and next' : 'Finish') + '</button>') +
      '<button type="button" class="btn" id="pp-home">Menu</button></div></section>' + saved());
    if (final && AUTO) Array.prototype.forEach.call(app.querySelectorAll('.gcard input, .gcard select, .gcard textarea'), function (el) { el.disabled = true; });
    var m = document.getElementById('main'); if (m) m.focus();
  }
  function check() {
    var g = G(), q = cards[g.i], err = document.getElementById('pp-err');
    if (!C.answered(q)) { err.textContent = 'Answer the card first.'; return; }
    g.tries[q.id] = (g.tries[q.id] || 0) + 1;
    var n = g.tries[q.id];
    C.judge(q).then(function (r) {
      var res = { kind: r.kind, why: r.why || '', msg: r.msg || '', got: 0, final: true };
      if (r.kind === 'right') res.got = ptsOf(q) * (n === 1 ? 1 : 0.5);
      else if (r.kind === 'teacher') res.got = 0;
      else if (n < TRIES) res.final = false;
      else res.got = r.kind === 'partial' ? Math.round(ptsOf(q) * r.pts * 0.5 * 10) / 10 : 0;
      g.res[q.id] = res; C.save();
      if (res.final) showCard();
      else { document.getElementById('pp-fb').innerHTML = feedbackHtml(q, res, true); }
    });
  }
  function next() {
    var g = G(), q = cards[g.i];
    if (!AUTO) {
      var st = C.st(); g.res[q.id] = { kind: 'saved', final: true };
      if (g.i + 1 >= cards.length) {
        var blank = cards.filter(function (c) { return !C.answered(c); }).map(function (c) { return cards.indexOf(c) + 1; });
        if (blank.length && !g.confirm) { g.confirm = true; document.getElementById('pp-err').textContent = (blank.length === 1 ? 'Card ' + blank[0] + ' is' : 'Cards ' + blank.join(', ') + ' are') + ' blank. Press Finish again to finish anyway.'; return; }
        g.done = true; g.confirm = false; st.finished = true; st.finishedAt = new Date().toISOString(); C.save(); showSheet(); return;
      }
    }
    if (g.i + 1 >= cards.length) { g.done = true; var s = C.st(); s.finished = true; s.finishedAt = new Date().toISOString(); C.save(); showResults(); return; }
    g.i++; C.save(); showCard();
  }

  /* ---------- the end: results (auto) or the answer sheet (print) ---------- */
  function badge(r) {
    return !r ? '<span class="badge no">✗ Not played</span>' : r.kind === 'right' ? '<span class="badge ok">✓ Right</span>' : r.kind === 'partial' ? '<span class="badge part">◐ Partly right</span>' :
      r.kind === 'teacher' ? '<span class="badge tch">✎ Needs your teacher</span>' : '<span class="badge no">✗ Not right</span>';
  }
  function showResults() {
    var g = G(), st = C.st(), all = totalPts(), got = gotPts(), pct = all ? Math.round(got / all * 100) : 0;
    document.body.setAttribute('data-view', 'results'); document.body.classList.remove('big');
    var teacher = cards.filter(function (q) { return !C.scored(q); }).length;
    var list = cards.map(function (q, i) {
      var r = g.res[q.id];
      return '<li class="r r-' + (r ? r.kind : 'wrong') + '" data-result="' + (r ? r.kind : 'wrong') + '">' + badge(r) + ' <span class="small">' + esc(q.cat || '') + ' · ' + (r && r.kind !== 'teacher' ? C.round1(r.got || 0) + ' of ' + ptsOf(q) + ' points' : ptsOf(q) + ' points') + (g.tries[q.id] > 1 && r && r.kind === 'right' ? ' (second try)' : '') + '</span>' +
        '<div class="rq"><span class="num">' + (i + 1) + '.</span> <span>' + (q.prompt || C.fillText(q, [])) + '</span></div>' +
        '<p class="ra"><span class="lbl2">Your answer:</span> ' + C.answerHtml(q) + '</p>' + (r && r.why ? '<p class="rwhy"><span class="lbl2">Why:</span> ' + esc(r.why) + '</p>' : '') + '</li>';
    }).join('');
    app.innerHTML = C.shell(
      '<section class="results" aria-labelledby="r-h"><h2 id="r-h" tabindex="-1">Your results</h2>' +
      '<p class="meta">' + esc(st.name) + ' · ' + esc(C.dateText(st.finishedAt)) + '</p>' +
      '<div class="score" id="pp-score" data-pct="' + pct + '"><b>' + C.round1(got) + ' of ' + all + '</b> points <span class="pct">(' + pct + '%)</span></div>' +
      (teacher ? '<p class="tnote">' + teacher + ' card' + (teacher === 1 ? '' : 's') + ' need' + (teacher === 1 ? 's' : '') + ' your teacher. They are not in the score.</p>' : '') +
      '<div class="row noprint"><button type="button" class="btn primary" id="pp-print">Print my results</button><button type="button" class="btn" id="pp-again">Play again</button><button type="button" class="btn" id="pp-reset">Start over for a new student</button></div>' +
      '<ol class="rlist">' + list + '</ol>' +
      '<p class="small">The explanation shows for a right answer. For the others, ask your teacher, who has the answer key.</p></section>');
    document.getElementById('r-h').focus();
  }
  function showSheet() {
    var st = C.st();
    document.body.setAttribute('data-view', 'sheet'); document.body.classList.remove('big');
    var list = cards.map(function (q, i) {
      return '<li class="sq"><p class="small">' + esc(q.cat || '') + ' · ' + ptsOf(q) + ' point' + (ptsOf(q) === 1 ? '' : 's') + '</p><div class="rq"><span class="num">' + (i + 1) + '.</span> <span>' + (q.prompt || C.fillText(q, [])) + '</span></div>' +
        '<p class="ra"><span class="lbl2">Answer:</span> ' + C.answerHtml(q) + '</p>' +
        '<p class="grade-line"><span>Points: ______ / ' + ptsOf(q) + '</span><span>Grader notes: ____________________</span></p></li>';
    }).join('');
    app.innerHTML = C.shell(
      '<section class="sheet" aria-labelledby="s-h"><h2 id="s-h" tabindex="-1">Answer sheet</h2>' +
      '<dl class="sheet-meta"><div><dt>Name</dt><dd>' + esc(st.name) + '</dd></div><div><dt>Date</dt><dd>' + esc(C.dateText(st.finishedAt)) + '</dd></div>' +
      '<div><dt>Review game</dt><dd>' + esc(D.title) + (D.ver ? ' (version ' + esc(D.ver) + ')' : '') + '</dd></div></dl>' +
      '<div class="row noprint"><button type="button" class="btn primary" id="pp-print">Print</button><button type="button" class="btn" id="pp-pdf">Save as PDF</button>' +
      '<button type="button" class="btn" id="pp-edit">Change my answers</button><button type="button" class="btn" id="pp-reset">Start over for a new student</button></div>' +
      '<p class="small noprint" id="pp-pdf-tip" hidden>In the print window, choose <b>Save as PDF</b> as the printer, then save the file and hand it in.</p>' +
      '<ol class="slist">' + list + '</ol>' +
      '<p class="total">Total: ______ / ' + totalPts() + '</p><p class="small">Graded by: ____________________</p></section>');
    document.getElementById('s-h').focus();
  }

  /* ---------- class mode: the teacher drives it on a projector ---------- */
  function K() { var x = C.st().x; if (!x.cls || typeof x.cls !== 'object') x.cls = {}; var k = x.cls; if (!Array.isArray(k.teams)) k.teams = []; if (!k.awarded) k.awarded = {}; if (typeof k.i !== 'number') k.i = 0; return k; }
  var codeOk = false, revealed = null;   // the code is kept in memory only, never saved
  function showClassSetup() {
    var k = K();
    document.body.setAttribute('data-view', 'class-setup'); document.body.classList.remove('big');
    app.innerHTML = C.shell('<section class="csetup" id="main" tabindex="-1" aria-labelledby="c-h"><h2 id="c-h">Play as a class</h2>' +
      '<p>Put this page on the projector. Teams take turns answering out loud; you give each card\'s points to a team.</p>' +
      '<div class="field"><label for="pp-teams">Number of teams</label><select id="pp-teams">' + [2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (n === (k.teams.length || 2) ? ' selected' : '') + '>' + n + ' teams</option>'; }).join('') + '</select></div>' +
      (AUTO ? '<div class="field"><label for="pp-code">Class code (on your teacher copy), to reveal answers</label><input id="pp-code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false"></div><p class="small">Without the code you can still play: read the answers from your teacher copy.</p>' :
        '<p class="small">Read the answers from your teacher copy: this page holds no answers.</p>') +
      '<p id="pp-err" class="err" role="alert"></p><div class="row"><button type="button" class="btn primary" id="pp-cstart">' + (k.teams.length && !k.done ? 'Keep playing' : 'Start the class game') + '</button><button type="button" class="btn" id="pp-exit">Back</button></div></section>');
    document.getElementById('c-h').focus();
  }
  function tryCode(raw) {
    var c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!c) return Promise.resolve(false);
    return P.hashOf('_class', 'code:' + c).then(function (h) { if (h === D.tc) { codeOk = c; return true; } return false; });
  }
  function classStart() {
    var k = K(), n = Number(document.getElementById('pp-teams').value) || 2, codeEl = document.getElementById('pp-code');
    if (!k.teams.length || k.teams.length !== n || k.done) { k.teams = []; for (var i = 0; i < n; i++) k.teams.push({ name: 'Team ' + (i + 1), score: 0 }); k.awarded = {}; k.i = 0; k.done = false; }
    C.save();
    var go = function () { revealed = null; showClassCard(); };
    if (codeEl && codeEl.value.trim()) tryCode(codeEl.value).then(function (ok) { if (!ok) { document.getElementById('pp-err').textContent = 'That code doesn\'t match this page. Check the teacher copy, or leave it blank.'; return; } go(); });
    else go();
  }
  function board() {
    var k = K();
    return '<ol class="board" id="pp-board" aria-label="Scores">' + k.teams.map(function (t) { return '<li><span class="tn">' + esc(t.name) + '</span> <b class="ts">' + C.round1(t.score) + '</b></li>'; }).join('') + '</ol>';
  }
  function plainCard(q) {
    var h = '<div class="cprompt">' + (q.prompt || C.fillText(q, [])) + '</div>' + (q.figure ? '<div class="fig">' + q.figure + '</div>' : '');
    if (q.type === 'mc') h += '<ol class="cchoices" type="A">' + q.choices.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ol>';
    if (q.type === 'tf') h += '<p class="cchoices">True or false?</p>';
    if (q.type === 'match') h += '<div class="cmatch"><ol>' + q.left.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ol><ol type="A">' + q.choices.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ol></div>';
    if (q.unit) h += '<p class="small">Answer in ' + q.unit + '</p>';
    return h;
  }
  function showClassCard() {
    var k = K(), q = cards[k.i], aw = k.awarded[q.id];
    document.body.setAttribute('data-view', 'class'); document.body.classList.add('big');
    app.innerHTML = C.shell(board() +
      '<section class="gcard ccard" id="main" tabindex="-1" aria-label="Card ' + (k.i + 1) + ' of ' + cards.length + '">' + head(q, k.i) + plainCard(q) +
      '<div id="pp-answer" role="status" aria-live="polite">' + (revealed ? revealed : '') + '</div><p id="pp-err" class="err" role="alert"></p>' +
      '<div class="row noprint">' + (AUTO ? '<button type="button" class="btn" id="pp-reveal">Reveal answer</button>' : '') + '</div>' +
      (AUTO && !codeOk ? '<div class="row noprint" id="pp-codebox" hidden><label class="sr" for="pp-code2">Class code</label><input id="pp-code2" type="text" placeholder="Class code" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="button" class="btn" id="pp-codeok">Unlock</button></div>' : '') +
      '<p class="award-h">' + (aw === undefined ? 'Give ' + ptsOf(q) + ' point' + (ptsOf(q) === 1 ? '' : 's') + ' to:' : aw < 0 ? 'No points for this card.' : esc(k.teams[aw].name) + ' got ' + ptsOf(q) + ' point' + (ptsOf(q) === 1 ? '' : 's') + '.') + '</p>' +
      '<div class="row noprint award">' + k.teams.map(function (t, i) { return '<button type="button" class="btn' + (aw === i ? ' primary' : '') + '" data-team="' + i + '" aria-pressed="' + (aw === i) + '">+' + ptsOf(q) + ' ' + esc(t.name) + '</button>'; }).join('') +
      '<button type="button" class="btn' + (aw === -1 ? ' primary' : '') + '" data-team="-1" aria-pressed="' + (aw === -1) + '">No points</button></div>' +
      '<div class="row noprint">' + (k.i > 0 ? '<button type="button" class="btn" id="pp-cback">Back</button>' : '') + '<button type="button" class="btn primary" id="pp-cnext">' + (k.i + 1 < cards.length ? 'Next card' : 'Final scores') + '</button><button type="button" class="btn" id="pp-exit">Leave class mode</button></div></section>');
  }
  function reveal() {
    var q = cards[K().i];
    if (!codeOk) { var cb = document.getElementById('pp-codebox'); if (cb) { cb.hidden = false; document.getElementById('pp-code2').focus(); } return; }
    P.unlock(q.id, 'reveal:' + codeOk, q.rv || '').then(function (o) {
      if (!o) { document.getElementById('pp-err').textContent = 'This card can\'t be revealed here: use the teacher copy.'; return; }
      revealed = '<p class="canswer"><span class="lbl2">Answer:</span> ' + esc(o.answer) + '</p>' + (o.why ? '<p class="rwhy"><span class="lbl2">Why:</span> ' + esc(o.why) + '</p>' : '');
      document.getElementById('pp-answer').innerHTML = revealed;
    });
  }
  function award(t) {
    var k = K(), q = cards[k.i], old = k.awarded[q.id];
    if (old !== undefined && old >= 0) k.teams[old].score -= ptsOf(q);
    if (old === t) delete k.awarded[q.id];
    else { k.awarded[q.id] = t; if (t >= 0) k.teams[t].score += ptsOf(q); }
    C.save(); showClassCard();
  }
  function showStandings() {
    var k = K(); k.done = true; C.save();
    document.body.setAttribute('data-view', 'class-end'); document.body.classList.add('big');
    var best = Math.max.apply(null, k.teams.map(function (t) { return t.score; }));
    var win = k.teams.filter(function (t) { return t.score === best; });
    var rows = k.teams.slice().sort(function (a, b) { return b.score - a.score; });
    app.innerHTML = C.shell('<section class="results" aria-labelledby="ce-h"><h2 id="ce-h" tabindex="-1">Final scores</h2>' +
      '<p class="score" id="pp-winner">' + (win.length === 1 ? esc(win[0].name) + ' wins!' : 'A tie: ' + win.map(function (t) { return esc(t.name); }).join(' and ') + '.') + '</p>' +
      '<ol class="board final">' + rows.map(function (t) { return '<li><span class="tn">' + esc(t.name) + '</span> <b class="ts">' + C.round1(t.score) + '</b></li>'; }).join('') + '</ol>' +
      '<p class="small">' + esc(D.title) + ' · ' + esc(C.dateText()) + '</p>' +
      '<div class="row noprint"><button type="button" class="btn primary" id="pp-print">Print the scores</button><button type="button" class="btn" id="pp-cagain">Play again</button><button type="button" class="btn" id="pp-exit">Leave class mode</button></div></section>');
    document.getElementById('ce-h').focus();
  }

  /* ---------- events ---------- */
  var resetArmed = null;
  app.addEventListener('input', C.onInput);
  app.addEventListener('change', function (e) { if (e.target.type === 'radio' || e.target.tagName === 'SELECT') C.onInput(e); });
  C.onChange = function () { var g = G(), q = cards[g.i]; if (g.res[q.id] && !g.res[q.id].final) { var fb = document.getElementById('pp-fb'); if (fb) fb.innerHTML = ''; } };
  app.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    var id = b.id, g = G();
    if (id === 'pp-start') start();
    else if (id === 'pp-check') check();
    else if (id === 'pp-next') next();
    else if (id === 'pp-back') { if (g.i > 0) { g.i--; C.save(); showCard(); } }
    else if (id === 'pp-home') showStart();
    else if (id === 'pp-print') window.print();
    else if (id === 'pp-pdf') { document.getElementById('pp-pdf-tip').hidden = false; window.print(); }
    else if (id === 'pp-edit') { g.done = false; g.i = 0; var st = C.st(); st.finished = false; C.save(); showCard(); }
    else if (id === 'pp-again') { C.st().x.game = {}; C.st().answers = {}; C.st().finished = false; C.save(); G().started = true; C.save(); showCard(); }
    else if (id === 'pp-class') showClassSetup();
    else if (id === 'pp-cstart') classStart();
    else if (id === 'pp-exit') { document.body.classList.remove('big'); showStart(); }
    else if (id === 'pp-reveal') reveal();
    else if (id === 'pp-codeok') tryCode(document.getElementById('pp-code2').value).then(function (ok) { if (ok) reveal(); else document.getElementById('pp-err').textContent = 'That code doesn\'t match this page.'; });
    else if (b.hasAttribute('data-team')) award(Number(b.getAttribute('data-team')));
    else if (id === 'pp-cnext') { var k = K(); revealed = null; if (k.i + 1 < cards.length) { k.i++; C.save(); showClassCard(); } else showStandings(); }
    else if (id === 'pp-cback') { var k2 = K(); revealed = null; if (k2.i > 0) { k2.i--; C.save(); showClassCard(); } }
    else if (id === 'pp-cagain') { var k3 = K(); k3.teams.forEach(function (t) { t.score = 0; }); k3.awarded = {}; k3.i = 0; k3.done = false; revealed = null; C.save(); showClassCard(); }
    else if (id === 'pp-reset') {
      if (!resetArmed) { b.textContent = 'Tap again to clear this device'; resetArmed = setTimeout(function () { resetArmed = null; b.textContent = 'Start over for a new student'; }, 4000); return; }
      clearTimeout(resetArmed); resetArmed = null; codeOk = false; revealed = null;
      C.resetState(); showStart(); document.getElementById('pp-name').focus();
    }
  });
  var g0 = G();
  if (g0.done) { if (AUTO) showResults(); else showSheet(); }
  else showStart();
};
