/* Interactive guided notes (docs/KINDS-INTERACTIVE-FORMAT.md, "Guided notes"): the notes' text with a typed box for
   each blank, any figures and tables inline, and the notes' stop-and-think and check questions. page.js builds the
   shared pieces (saved work, question boxes, checking) and hands them here as C when D.mode is "notes".

   grading "auto": "Check my notes" marks each blank ✓ or ✗ against salted hashes of its accepted forms (case, spaces
   and plurals forgiven: forms.js), shows the explanation of a right line, and lets her fix and check again; when every
   blank is right it shows the completed notes. "Print my notes" prints her filled-in notes for her binder.
   grading "print": no answer data at all. Finish shows her filled-in notes with her name and the date and prints them,
   for the teacher to check with the teacher copy. */
(window.PPI_MODES = window.PPI_MODES || {}).notes = function (C) {
  'use strict';
  var D = C.D, P = C.P, esc = C.esc, app = C.app, AUTO = C.AUTO, items = C.items;
  var last = null;          // the last check: {id: result}, shown as marks until she changes that line
  var confirmBlank = false;

  function blanksTotal() { return items.reduce(function (s, q) { return s + (C.scored(q) ? (q.type === 'fill' ? q.k : 1) : 0); }, 0); }
  function notesBody() {
    return (D.blocks || []).map(function (b) {
      if (b.t === 'q') return C.questionHtml(b);
      if (b.t === 'section') {
        var bank = /^\s*word bank\s*:/i.test(String(b.directions || '').replace(/<[^>]*>/g, ''));
        return '<h2 class="sec">' + esc(b.heading || '') + '</h2>' + (b.directions ? '<p class="' + (bank ? 'bank' : 'dirs') + '">' + b.directions + '</p>' : '');
      }
      if (b.t === 'passage') return '<article class="passage" aria-label="' + esc(b.title) + '"><h2>' + esc(b.title) + '</h2>' + (b.byline ? '<p class="byline">' + esc(b.byline) + '</p>' : '') +
        b.paras.map(function (p, i) { return '<div class="para"><span class="pn" aria-hidden="true">' + (i + 1) + '</span><p>' + p + '</p></div>'; }).join('') + '</article>';
      return '';
    }).join('');
  }
  function filledCount() {
    var n = 0, all = 0;
    items.forEach(function (q) {
      if (q.type === 'fill') { all += q.k; var a = C.st().answers[q.id] || []; for (var i = 0; i < q.k; i++) if (typeof a[i] === 'string' && a[i].trim()) n++; }
      else { all++; if (C.answered(q)) n++; }
    });
    return n + ' of ' + all + ' filled in';
  }

  /* ---------- 1. filling in the notes ---------- */
  function showNotes() {
    var st = C.st();
    document.body.setAttribute('data-view', 'notes');
    app.innerHTML = C.shell(
      '<section class="who" aria-label="About you"><div class="field"><label for="pp-name">Your name</label><input id="pp-name" type="text" autocomplete="name" value="' + esc(st.name) + '"></div>' +
      '<p class="date">Date: ' + esc(C.dateText()) + '</p></section>' +
      (C.canStore ? '' : '<p class="warn" role="status">This browser is blocking saving, so your notes will be lost if you close the page. Finish in one go.</p>') +
      (D.directions ? '<p class="dirs">' + D.directions + '</p>' : '') +
      '<p class="how noprint">' + (AUTO ? 'Type in each blank as you read or watch. Press <b>Check my notes</b> to see which blanks are right, fix any ✗ and check again. Press <b>Print my notes</b> for your binder.' :
        'Type in each blank as you read or watch. When you are done, press <b>Finish</b> to print your notes for your teacher.') + '</p>' +
      '<div id="main" class="notes" tabindex="-1">' + notesBody() + '</div>' +
      '<div class="finish noprint"><p id="pp-count" aria-live="polite">' + filledCount() + '</p><p id="pp-checkres" role="status" aria-live="polite"></p><p id="pp-err" class="err" role="alert"></p>' +
      '<div class="row">' + (AUTO ? '<button type="button" class="btn primary" id="pp-check">Check my notes</button><button type="button" class="btn" id="pp-printnotes">Print my notes</button>' :
        '<button type="button" class="btn primary" id="pp-finish">Finish</button>') + '<button type="button" class="btn" id="pp-reset">Start over for a new student</button></div></div>' +
      '<p class="saved noprint" id="pp-saved" aria-live="polite">' + (st.savedAt ? 'Saved on this device at ' + C.timeText(st.savedAt) + '.' : 'Your notes are saved on this device as you go.') + '</p>');
    if (last) paintMarks();
  }
  // marks from the last check, on the boxes: ✓ or ✗ beside each blank, the explanation under a right line
  function paintMarks() {
    items.forEach(function (q) {
      var r = last[q.id]; if (!r) return;
      var fb = document.getElementById('fb-' + q.id), box = document.getElementById('q-' + q.id);
      if (q.type === 'fill') {
        var marks = r.marks || q.parts.slice(1).map(function () { return false; });
        marks.forEach(function (ok, i) {
          var mk = document.getElementById('mk-' + q.id + '-' + i), inp = document.getElementById('a-' + q.id + '-' + i);
          if (mk) { mk.className = 'mk ' + (ok ? 'ok' : 'no'); mk.textContent = ok ? '✓' : '✗'; mk.setAttribute('aria-label', ok ? 'right' : 'not right yet'); }
          if (inp) { inp.classList.toggle('is-ok', ok); inp.classList.toggle('is-no', !ok); inp.setAttribute('aria-invalid', ok ? 'false' : 'true'); }
        });
        if (fb) fb.innerHTML = r.why ? '<p class="rwhy"><span class="lbl2">Why:</span> ' + esc(r.why) + '</p>' : r.msg ? '<p class="rmsg">' + esc(r.msg) + '</p>' : '';
      } else if (box) {
        var old = box.querySelector('.qfb'); if (old) old.parentNode.removeChild(old);
        var d = document.createElement('div'); d.className = 'qfb';
        d.innerHTML = badge(r) + (r.msg ? '<p class="rmsg">' + esc(r.msg) + '</p>' : '') + (r.kind !== 'right' && r.kind !== 'teacher' && q.hint ? '<p class="rhint"><span class="lbl2">Hint:</span> ' + q.hint + '</p>' : '') +
          (r.why ? '<p class="rwhy"><span class="lbl2">Why:</span> ' + esc(r.why) + '</p>' : '');
        box.appendChild(d);
      }
    });
  }
  function badge(r) {
    return r.kind === 'right' ? '<span class="badge ok">✓ Right</span>' : r.kind === 'partial' ? '<span class="badge part">◐ Partly right</span>' :
      r.kind === 'teacher' ? '<span class="badge tch">✎ For your teacher</span>' : '<span class="badge no">✗ Not right yet</span>';
  }
  // she changed a line: its old marks go away until the next check
  C.onChange = function (q) {
    confirmBlank = false;
    var c = document.getElementById('pp-count'); if (c) c.textContent = filledCount();
    if (!last || !last[q.id]) return;
    delete last[q.id];
    var box = document.getElementById('q-' + q.id); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.mk'), function (m) { m.className = 'mk'; m.textContent = ''; m.removeAttribute('aria-label'); });
    Array.prototype.forEach.call(box.querySelectorAll('.blank'), function (i) { i.classList.remove('is-ok', 'is-no'); i.removeAttribute('aria-invalid'); });
    var fb = document.getElementById('fb-' + q.id); if (fb) fb.innerHTML = '';
    var qfb = box.querySelector('.qfb'); if (qfb) qfb.parentNode.removeChild(qfb);
  };

  /* ---------- 2. checking (auto) ---------- */
  function checkAll() { return Promise.all(items.map(C.judge)).then(function (rs) { var o = {}; items.forEach(function (q, i) { o[q.id] = rs[i]; }); return o; }); }
  function scoreOf(res) {
    var got = 0, all = 0;
    items.forEach(function (q) { if (!C.scored(q)) return; var w = q.type === 'fill' ? q.k : 1; all += w; got += (res[q.id].pts || 0) * w; });
    return { got: got, all: all, pct: all ? Math.round(got / all * 100) : 0 };
  }
  function check() {
    var out = document.getElementById('pp-checkres');
    if (out) out.textContent = 'Checking…';
    checkAll().then(function (res) {
      last = res;
      var s = scoreOf(res);
      C.st().x.checked = { at: new Date().toISOString(), pct: s.pct };
      C.save();
      if (s.all && s.got === s.all) { showFilled({ res: res, done: true }); return; }
      paintMarks();
      if (out) out.innerHTML = '<span class="score" id="pp-score" data-pct="' + s.pct + '"><b>' + C.round1(s.got) + ' of ' + s.all + '</b> blanks and checks right <span class="pct">(' + s.pct + '%)</span></span><br>Fix the ✗ ones and press <b>Check my notes</b> again.';
      var firstNo = document.querySelector('.blank.is-no, .qfb .badge.no');
      if (firstNo && firstNo.focus) firstNo.focus();
    });
  }

  /* ---------- 3. the filled-in notes (to print) ---------- */
  function needName() {
    var err = document.getElementById('pp-err');
    if (C.st().name.trim()) return false;
    if (err) err.textContent = 'Type your name at the top first.';
    var n = document.getElementById('pp-name'); if (n) n.focus();
    return true;
  }
  function showFilled(o) {
    o = o || {};
    var st = C.st(), res = o.res || null;
    document.body.setAttribute('data-view', 'filled');
    var s = res ? scoreOf(res) : null;
    var body = (D.blocks || []).map(function (b) {
      if (b.t === 'section') return '<h3 class="fsec">' + esc(b.heading || '') + '</h3>';
      if (b.t !== 'q') return '';
      var r = res && res[b.id];
      if (b.type === 'fill') return '<div class="fline' + (r ? ' f-' + r.kind : '') + '" data-result="' + (r ? r.kind : '') + '"><span class="num">' + b.n + '.</span><p>' + C.fillText(b, st.answers[b.id], r && (r.marks || b.parts.slice(1).map(function () { return false; }))) + '</p>' +
        (r && r.why ? '<p class="rwhy"><span class="lbl2">Why:</span> ' + esc(r.why) + '</p>' : '') + '</div>';
      return '<div class="fq" data-result="' + (r ? r.kind : '') + '">' + (r ? badge(r) : '') + '<div class="rq"><span class="num">' + b.n + '.</span> <span>' + b.prompt + '</span></div>' + (b.figure ? '<div class="fig">' + b.figure + '</div>' : '') +
        '<p class="ra"><span class="lbl2">My answer:</span> ' + C.answerHtml(b) + '</p>' + (r && r.why ? '<p class="rwhy"><span class="lbl2">Why:</span> ' + esc(r.why) + '</p>' : '') + '</div>';
    }).join('');
    app.innerHTML = C.shell(
      '<section class="sheet filled" aria-labelledby="f-h"><h2 id="f-h" tabindex="-1">' + (o.done ? 'My completed notes' : 'My notes') + '</h2>' +
      '<dl class="sheet-meta"><div><dt>Name</dt><dd>' + esc(st.name) + '</dd></div><div><dt>Date</dt><dd>' + esc(C.dateText()) + '</dd></div>' +
      '<div><dt>Notes</dt><dd>' + esc(D.title) + (D.ver ? ' (version ' + esc(D.ver) + ')' : '') + '</dd></div></dl>' +
      (s ? '<p class="score" id="pp-score" data-pct="' + s.pct + '"><b>' + C.round1(s.got) + ' of ' + s.all + '</b> blanks and checks right <span class="pct">(' + s.pct + '%)</span></p>' : '') +
      (o.done ? '<p class="okline" role="status">Every blank is right. These are your completed notes.</p>' : '') +
      '<div class="row noprint"><button type="button" class="btn primary" id="pp-print">Print my notes</button>' + (AUTO ? '' : '<button type="button" class="btn" id="pp-pdf">Save as PDF</button>') +
      '<button type="button" class="btn" id="pp-edit">Back to my notes</button><button type="button" class="btn" id="pp-reset">Start over for a new student</button></div>' +
      '<p class="small noprint" id="pp-pdf-tip" hidden>In the print window, choose <b>Save as PDF</b> as the printer, then save the file and hand it in.</p>' +
      '<div class="fbody">' + body + '</div>' +
      (AUTO ? '' : '<p class="total">Checked by: ____________________ &nbsp; Score: ______</p>') + '</section>');
    document.getElementById('f-h').focus();
    if (o.print) setTimeout(function () { window.print(); }, 50);
  }
  function finish() {
    if (needName()) return;
    var blank = items.filter(function (q) { return !C.answered(q); }).map(function (q) { return q.n; });
    if (blank.length && !confirmBlank) {
      confirmBlank = true;
      document.getElementById('pp-err').textContent = (blank.length === 1 ? 'Line ' + blank[0] + ' is' : 'Lines ' + blank.join(', ') + ' are') + ' blank. Press Finish again to finish anyway.';
      return;
    }
    var st = C.st(); st.finished = true; st.finishedAt = new Date().toISOString(); C.save();
    showFilled({ print: true });
  }
  function printNotes() {
    if (needName()) return;
    checkAll().then(function (res) { last = res; showFilled({ res: res, print: true }); });
  }

  /* ---------- events ---------- */
  var resetArmed = null;
  app.addEventListener('input', C.onInput);
  app.addEventListener('change', function (e) { if (e.target.type === 'radio' || e.target.tagName === 'SELECT') C.onInput(e); });
  app.addEventListener('keydown', function (e) {   // Enter in a blank moves to the next blank
    if (e.key !== 'Enter' || !e.target.classList || !e.target.classList.contains('blank')) return;
    e.preventDefault();
    var all = Array.prototype.slice.call(app.querySelectorAll('.blank')), i = all.indexOf(e.target);
    if (all[i + 1]) all[i + 1].focus();
  });
  app.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.id === 'pp-check') check();
    else if (b.id === 'pp-printnotes') printNotes();
    else if (b.id === 'pp-finish') finish();
    else if (b.id === 'pp-print') window.print();
    else if (b.id === 'pp-pdf') { document.getElementById('pp-pdf-tip').hidden = false; window.print(); }
    else if (b.id === 'pp-edit') { var st = C.st(); st.finished = false; C.save(); showNotes(); var m = document.getElementById('main'); if (m) m.focus(); }
    else if (b.id === 'pp-reset') {
      if (!resetArmed) { b.textContent = 'Tap again to clear this device'; resetArmed = setTimeout(function () { resetArmed = null; b.textContent = 'Start over for a new student'; }, 4000); return; }
      clearTimeout(resetArmed); resetArmed = null; last = null;
      C.resetState(); showNotes(); document.getElementById('pp-name').focus();
    }
  });
  if (C.st().finished && !AUTO) showFilled(); else showNotes();
};
