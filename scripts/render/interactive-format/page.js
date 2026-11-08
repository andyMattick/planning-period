/* The interactive format's student page (docs/KINDS-INTERACTIVE-FORMAT.md): any worksheet, homework, quiz, test,
   reading quiz or study guide, answered on a device. Guided notes and review games (D.mode "notes" or "game") use the
   same saved work, question boxes and checking, and hand the page to interactive-format/notes.js or game.js (inlined
   before this file), which register themselves in window.PPI_MODES. scripts/render/interactive-format.mjs inlines it after
   window.PPA_DATA / window.PPI_DATA, scripts/render/apps/engine.js (window.PPA: storage, SHA-256, the number reader)
   and, when the page grades itself, interactive-format/forms.js (window.PPI_FORMS: the answer forms).

   grading "auto": Finish scores every objective item (multiple choice, true/false, numbers, matching) against salted
   SHA-256 hashes of the accepted forms; the explanation is locked with the right answer, so it opens only for a right
   one. Short and written answers are listed for the teacher, never scored here.
   grading "print": the page holds no keys or hashes at all. Finish shows a clean answer sheet to print or save as a PDF.

   Nothing is sent anywhere (the page's Content-Security-Policy forbids every request). Work is saved in this browser
   only (localStorage, every call in try/catch), so a reload picks up where the student left off. */
(function () {
  'use strict';
  var P = window.PPA, F = window.PPI_FORMS, D = window.PPI_DATA || {};
  var AUTO = D.grading === 'auto' && !!F;
  var esc = P.esc;
  var app = document.getElementById('app');
  var items = [], byId = {};
  function setBlocks(blocks) {
    items.length = 0; Object.keys(byId).forEach(function (k) { delete byId[k]; });
    (blocks || []).forEach(function (b) { if (b.t === 'q') items.push(b); });
    items.forEach(function (q) { byId[q.id] = q; });
  }
  /* One version per student (D.pool): the page holds every version's questions (never a key) and picks one from the
     student's name, through a 5-letter version code shown on her page and her answer sheet. The teacher's key page
     (a separate file, never shared with students) finds the same version from the code or the name. */
  var POOL = D.pool && Array.isArray(D.pool.codes) && D.pool.codes.length ? D.pool : null;
  function normName(n) { return String(n || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function poolIndex(name) {
    var b = P.sha256Sync(new TextEncoder().encode('PPS1|' + POOL.salt + '|' + normName(name)));
    return (((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0) % POOL.codes.length;
  }
  function usePool(code) {
    var i = POOL.codes.indexOf(code);
    if (i < 0) { D.blocks = []; D.stimuli = {}; D.code = null; setBlocks([]); return false; }
    D.blocks = POOL.versions[i].blocks; D.stimuli = POOL.versions[i].stimuli || {}; D.code = code; setBlocks(D.blocks);
    return true;
  }
  if (POOL) { var raw0 = P.loadJSON(D.key) || {}; usePool(raw0.x && typeof raw0.x.code === 'string' ? raw0.x.code : ''); }
  else setBlocks(D.blocks);
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var OBJECTIVE = { mc: 1, tf: 1, numeric: 1, match: 1, fill: 1 };
  function scored(q) { return !!OBJECTIVE[q.type] || !!q.words; }

  /* ---------- saved work (S1–S3: autosave and autoload; loading merges over the defaults and never clears) ---------- */
  function load() {
    var o = P.loadJSON(D.key) || {};
    var s = { name: '', answers: {}, finished: false, finishedAt: null, savedAt: null };
    if (typeof o.name === 'string') s.name = o.name;
    if (o.answers && typeof o.answers === 'object') Object.keys(o.answers).forEach(function (k) { if (byId[k]) s.answers[k] = o.answers[k]; });
    if (o.finished === true) s.finished = true;
    if (typeof o.finishedAt === 'string') s.finishedAt = o.finishedAt;
    if (typeof o.savedAt === 'string') s.savedAt = o.savedAt;
    s.x = o.x && typeof o.x === 'object' ? o.x : {};   // what guided notes and review games keep (merged as it is)
    return s;
  }
  var st = load();
  var canStore = P.storageWorks();
  function save() {
    st.savedAt = new Date().toISOString();
    var ok = P.saveJSON(D.key, st);
    var el = document.getElementById('pp-saved');
    if (el) el.textContent = ok ? 'Saved on this device at ' + timeText(st.savedAt) + '.' : 'This browser is not saving: keep this page open until you finish.';
  }
  function timeText(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function dateText(iso) { var d = iso ? new Date(iso) : new Date(); return isNaN(d) ? '' : d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }); }

  /* ---------- answers ---------- */
  function answered(q) {
    var a = st.answers[q.id];
    if (q.type === 'match') return Array.isArray(a) && a.some(function (x) { return x !== null && x !== '' && x !== undefined; });
    if (q.type === 'fill' || q.sub) return Array.isArray(a) && a.some(function (x) { return typeof x === 'string' && x.trim() !== ''; });
    if (q.type === 'mc') return typeof a === 'number';
    if (q.type === 'tf') return a === 'true' || a === 'false';
    return typeof a === 'string' && a.trim() !== '';
  }
  function answerHtml(q) {
    var a = st.answers[q.id];
    if (!answered(q)) return '<i>(blank)</i>';
    if (q.type === 'mc') return q.choices[a] != null ? '<b>' + LETTERS[a] + '.</b> ' + q.choices[a] : '<i>(blank)</i>';
    if (q.type === 'tf') return a === 'true' ? 'True' : 'False';
    if (q.type === 'fill') return fillText(q, a);
    if (q.sub) return q.sub.map(function (p, i) { var v = a[i]; return '<span class="psub"><b>(' + esc(p.label) + ')</b> ' + (typeof v === 'string' && v.trim() ? '<span class="typed">' + esc(v).replace(/\n/g, '<br>') + '</span>' : '<i>(blank)</i>') + '</span>'; }).join('');
    if (q.type === 'match') return q.left.map(function (l, i) { var c = a[i]; return '<span class="pair">' + (i + 1) + ' → ' + (c === null || c === '' || c === undefined ? '<i>blank</i>' : LETTERS[c]) + '</span>'; }).join(' ');
    return '<span class="typed">' + esc(a).replace(/\n/g, '<br>') + '</span>' + (q.unit && q.type !== 'open' ? ' ' + q.unit : '');
  }

  // a notes line with what she typed in each blank (underlined), as text
  function fillText(q, a, marks) {
    return q.parts.map(function (p, i) {
      if (i === q.parts.length - 1) return p;
      var v = Array.isArray(a) && typeof a[i] === 'string' && a[i].trim() ? esc(a[i]) : '<i>blank</i>';
      var m = marks ? (marks[i] ? ' <span class="mk ok" aria-label="right">✓</span>' : ' <span class="mk no" aria-label="not right">✗</span>') : '';
      return p + '<u class="filled">' + v + '</u>' + m;
    }).join('');
  }
  // a notes line to fill in: the text with a box for each blank
  function fillHtml(q) {
    var id = esc(q.id), a = Array.isArray(st.answers[q.id]) ? st.answers[q.id] : [];
    return '<div class="nline" role="group" aria-labelledby="nl-' + id + '" id="q-' + id + '" data-q="' + id + '"><span class="sr" id="nl-' + id + '">Notes line ' + q.n + ', ' + q.k + ' blank' + (q.k === 1 ? '' : 's') + '</span>' +
      '<span class="num" aria-hidden="true">' + q.n + '.</span><p class="ntext">' + q.parts.map(function (p, i) {
        if (i === q.parts.length - 1) return p;
        return p + '<input type="text" class="blank" id="a-' + id + '-' + i + '" data-b="' + i + '" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Blank ' + (i + 1) + (q.k > 1 ? ' of ' + q.k : '') + '" value="' + esc(a[i] || '') + '"><span class="mk" id="mk-' + id + '-' + i + '" aria-live="polite"></span>';
      }).join('') + '</p><div class="nfb" id="fb-' + id + '"></div></div>';
  }

  /* ---------- the page around the questions ---------- */
  function shell(inner) {
    return (D.preview ? '<div class="pv-banner" role="note"><b>PREVIEW</b> · not approved for use. The final file has no watermark.</div>' : '') +
      '<header class="top"><div><p class="kicker">' + esc(D.sub || '') + '</p><h1>' + esc(D.title) + '</h1></div>' +
      (D.code ? '<span class="ver">Version code ' + esc(D.code) + '</span>' : D.ver ? '<span class="ver">Version ' + esc(D.ver) + '</span>' : '') + '</header>' + inner +
      '<footer class="foot"><p>' + esc(D.notice || '') + '</p><p>' + esc(D.build || '') + '</p></footer>';
  }
  // a shared data set, shown with each question that uses it
  function stimHtml(q) {
    var st = q.stim && D.stimuli && D.stimuli[q.stim];
    if (!st) return '';
    return '<div class="stim">' + (st.title ? '<p class="stitle">' + st.title + '</p>' : '') + (st.use ? '<p class="use">' + esc(st.use) + '</p>' : '') +
      (st.intro ? '<p>' + st.intro + '</p>' : '') + (st.table ? '<div class="stab">' + st.table + '</div>' : '') + (st.figure ? '<div class="fig">' + st.figure + '</div>' : '') + '</div>';
  }
  function questionHtml(q) {
    if (q.type === 'fill') return fillHtml(q);
    var id = esc(q.id), h = '<div class="q" role="group" aria-labelledby="p-' + id + '" id="q-' + id + '" data-q="' + id + '" tabindex="-1">' + stimHtml(q) +
      '<div class="qhead"><span class="num" aria-hidden="true">' + q.n + '.</span><div class="prompt" id="p-' + id + '"><span class="sr">Question ' + q.n + '. </span>' + q.prompt + '</div></div>' +
      (q.figure ? '<div class="fig">' + q.figure + '</div>' : '');
    var a = st.answers[q.id];
    if (q.type === 'mc' || q.type === 'tf') {
      var opts = q.type === 'tf' ? ['True', 'False'] : q.choices;
      h += '<div class="choices">' + opts.map(function (c, i) {
        var v = q.type === 'tf' ? (i === 0 ? 'true' : 'false') : String(i);
        var on = q.type === 'tf' ? a === v : a === i;
        return '<label class="ch"><input type="radio" name="c-' + id + '" value="' + v + '"' + (on ? ' checked' : '') + '>' +
          (q.type === 'mc' ? '<span class="l">' + LETTERS[i] + '.</span>' : '') + '<span class="ct">' + c + '</span></label>';
      }).join('') + '</div>';
    } else if (q.type === 'match') {
      var arr = Array.isArray(a) ? a : [];
      h += '<div class="mlist"><p class="small">Choices:</p><ol class="mright" type="A">' + q.choices.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ol></div>' +
        '<div class="mrows">' + q.left.map(function (l, i) {
          return '<div class="mrow"><label for="m-' + id + '-' + i + '"><b>' + (i + 1) + '.</b> ' + l + '</label><select id="m-' + id + '-' + i + '" data-m="' + i + '">' +
            '<option value="">Choose a letter</option>' + q.choicesText.map(function (c, j) {
              return '<option value="' + j + '"' + (arr[i] === j ? ' selected' : '') + '>' + LETTERS[j] + '. ' + esc(c) + '</option>';
            }).join('') + '</select></div>';
        }).join('') + '</div>';
    } else if (q.sub) {
      var pa = Array.isArray(a) ? a : [];
      h += q.sub.map(function (p, i) {
        return '<div class="psub"><label class="lbl" for="a-' + id + '-' + i + '"><span aria-hidden="true">(' + esc(p.label) + ')</span><span class="sr">Part ' + esc(p.label) + '.</span> ' + p.prompt +
          (p.points != null ? ' <span class="small">(' + p.points + ' point' + (p.points === 1 ? '' : 's') + ')</span>' : '') + '</label>' +
          '<textarea id="a-' + id + '-' + i + '" data-p="' + i + '" rows="' + (q.type === 'open' ? 5 : 2) + '" spellcheck="true">' + esc(pa[i] || '') + '</textarea></div>';
      }).join('');
    } else if (q.type === 'open') {
      h += '<label class="lbl" for="a-' + id + '">Your answer</label><textarea id="a-' + id + '" rows="6" spellcheck="true">' + esc(a || '') + '</textarea>';
    } else {
      h += '<label class="lbl" for="a-' + id + '">Your answer</label><div class="ansrow"><input type="text" id="a-' + id + '" autocomplete="off" autocapitalize="off" spellcheck="' + (q.type === 'short') + '" value="' + esc(a || '') + '"' + (q.unitText ? ' aria-describedby="u-' + id + '"' : '') + '>' +
        (q.unit ? '<span class="unit" id="u-' + id + '">' + q.unit + '</span>' : '') + '</div>';
    }
    return h + '</div>';
  }
  function blocksHtml() {
    return (D.blocks || []).map(function (b) {
      if (b.t === 'q') return questionHtml(b);
      if (b.t === 'section') return '<h2 class="sec">' + esc(b.heading || '') + '</h2>' + (b.directions ? '<p class="dirs">' + b.directions + '</p>' : '');
      if (b.t === 'passage') return '<article class="passage" aria-label="' + esc(b.title) + '"><h2>' + esc(b.title) + '</h2>' + (b.byline ? '<p class="byline">' + esc(b.byline) + '</p>' : '') +
        b.paras.map(function (p, i) { return '<div class="para"><span class="pn" aria-hidden="true">' + (i + 1) + '</span><p><span class="sr">Paragraph ' + (i + 1) + '. </span>' + p + '</p></div>'; }).join('') + '</article>';
      return '';
    }).join('') + (D.rubric ? '<section class="rubric"><h2 class="sec">How your written answer is scored</h2>' + D.rubric + '</section>' : '');
  }
  function countText() {
    var n = items.filter(answered).length;
    return n + ' of ' + items.length + ' answered';
  }

  /* ---------- question navigation: a numbered button per question (answered or not), Previous and Next ---------- */
  var cur = 0;
  function navLabel(q) { return 'Question ' + q.n + ', ' + (answered(q) ? 'answered' : 'not answered yet'); }
  function navHtml() {
    if (items.length < 2) return '';
    return '<nav class="qnav noprint" aria-label="Go to a question"><button type="button" class="btn nb" id="pp-prev">Previous</button>' +
      '<div class="qnums">' + items.map(function (q, i) {
        return '<button type="button" class="qn' + (answered(q) ? ' done' : '') + '" data-go="' + i + '" aria-label="' + esc(navLabel(q)) + '"' + (i === cur ? ' aria-current="true"' : '') + '>' + q.n + '<span class="dot" aria-hidden="true">' + (answered(q) ? '✓' : '') + '</span></button>';
      }).join('') + '</div><button type="button" class="btn nb" id="pp-next">Next</button></nav>';
  }
  function updateNav() {
    var bs = app.querySelectorAll('.qnav .qn');
    for (var i = 0; i < bs.length; i++) {
      var q = items[Number(bs[i].getAttribute('data-go'))]; if (!q) continue;
      var done = answered(q);
      bs[i].className = 'qn' + (done ? ' done' : '');
      bs[i].setAttribute('aria-label', navLabel(q));
      bs[i].querySelector('.dot').textContent = done ? '✓' : '';
      if (Number(bs[i].getAttribute('data-go')) === cur) bs[i].setAttribute('aria-current', 'true'); else bs[i].removeAttribute('aria-current');
    }
    var pv = document.getElementById('pp-prev'), nx = document.getElementById('pp-next');
    if (pv) pv.disabled = cur <= 0;
    if (nx) nx.disabled = cur >= items.length - 1;
  }
  function go(i) {
    if (i < 0 || i >= items.length) return;
    cur = i;
    var el = document.getElementById('q-' + items[i].id);
    if (el) { if (el.scrollIntoView) el.scrollIntoView({ block: 'start' }); el.focus({ preventScroll: true }); }
    updateNav();
  }
  function missingHtml(blank) {
    return '<p><b>Not answered yet:</b></p><div class="qnums">' + blank.map(function (q) {
      return '<button type="button" class="qn" data-go="' + items.indexOf(q) + '" aria-label="Go to question ' + q.n + '">' + q.n + '</button>';
    }).join('') + '</div><p>' + (AUTO ? 'You can still finish: press <b>Finish</b> again.' : 'You can still print your answer sheet: press <b>Finish</b> again.') + '</p>';
  }

  /* ---------- 1. answering ---------- */
  var confirmBlank = false;
  function showAnswering() {
    document.body.setAttribute('data-view', 'answer');
    app.innerHTML = shell(
      '<section class="who" aria-label="About you"><div class="field"><label for="pp-name">Your name</label><input id="pp-name" type="text" autocomplete="name" value="' + esc(st.name) + '"></div>' +
      '<p class="date">Date: ' + esc(dateText()) + '</p></section>' +
      (canStore ? '' : '<p class="warn" role="status">This browser is blocking saving, so your answers will be lost if you close the page. Finish in one go.</p>') +
      navHtml() +
      (D.directions ? '<p class="dirs">' + D.directions + '</p>' : '') +
      '<p class="how noprint">' + (AUTO ? 'Answer every question, then press <b>Finish</b>. The page checks your answers when you finish. Written answers go to your teacher.' :
        'Answer every question, then press <b>Finish</b> to make an answer sheet to print or save for your teacher.') + '</p>' +
      '<div id="main" tabindex="-1">' + blocksHtml() + '</div>' +
      '<div class="finish noprint"><p id="pp-count" aria-live="polite">' + countText() + '</p><p id="pp-err" class="err" role="alert"></p><div id="pp-missing" class="missing" hidden></div>' +
      '<button type="button" class="btn primary" id="pp-finish">Finish</button></div>' +
      '<p class="saved noprint" id="pp-saved" aria-live="polite">' + (st.savedAt ? 'Saved on this device at ' + timeText(st.savedAt) + '.' : 'Your answers are saved on this device as you go.') + '</p>');
    updateNav();
  }
  function onInput(e) {
    var t = e.target;
    if (t.id === 'pp-name') { st.name = t.value; save(); return; }
    var box = t.closest && t.closest('[data-q]'); if (!box) return;
    var q = byId[box.getAttribute('data-q')]; if (!q || (st.finished && !D.mode)) return;
    if (q.type === 'mc') st.answers[q.id] = Number(t.value);
    else if (q.type === 'tf') st.answers[q.id] = t.value;
    else if (q.type === 'match') {
      var arr = Array.isArray(st.answers[q.id]) ? st.answers[q.id].slice() : q.left.map(function () { return null; });
      arr[Number(t.getAttribute('data-m'))] = t.value === '' ? null : Number(t.value);
      st.answers[q.id] = arr;
    } else if (q.type === 'fill') {
      var bs = Array.isArray(st.answers[q.id]) ? st.answers[q.id].slice() : [];
      bs[Number(t.getAttribute('data-b'))] = t.value;
      st.answers[q.id] = bs;
    } else if (q.sub) {
      var ps = Array.isArray(st.answers[q.id]) ? st.answers[q.id].slice() : [];
      ps[Number(t.getAttribute('data-p'))] = t.value;
      st.answers[q.id] = ps;
    } else st.answers[q.id] = t.value;
    confirmBlank = false;
    if (core.onChange) core.onChange(q, t);
    save();
    var c = document.getElementById('pp-count'); if (c) c.textContent = countText();
    updateNav();
  }
  function finish() {
    var err = document.getElementById('pp-err');
    if (!st.name.trim()) { err.textContent = 'Type your name at the top first.'; document.getElementById('pp-name').focus(); return; }
    var blankQs = items.filter(function (q) { return !answered(q); }), blank = blankQs.map(function (q) { return q.n; });
    if (blank.length && !confirmBlank) {
      confirmBlank = true;
      err.textContent = (blank.length === 1 ? 'Question ' + blank[0] + ' is' : 'Questions ' + blank.join(', ') + ' are') + ' blank. Press Finish again to finish anyway.';
      var ms = document.getElementById('pp-missing'); if (ms) { ms.innerHTML = missingHtml(blankQs); ms.hidden = false; }
      return;
    }
    st.finished = true; st.finishedAt = new Date().toISOString();
    save();
    showDone();
  }

  /* ---------- 2a. grading "auto": scored here, against hashes ---------- */
  function accHas(list, h) { for (var i = 0; i < (list || []).length; i++) if (list[i].h === h || list[i] === h) return list[i]; return null; }
  function judge(q) {
    var a = st.answers[q.id];
    if (!scored(q)) return Promise.resolve({ kind: 'teacher' });
    if (!answered(q)) return Promise.resolve({ kind: 'wrong', pts: 0, msg: 'You left this blank.' });
    var done = function (r) {
      if (r.res === 'ok') return { kind: 'right', pts: 1, why: (r.ex && r.ex.why) || '' };
      if (r.res === 'sign') return { kind: 'wrong', pts: 0, msg: 'The number is right, but check the sign.' };
      if (r.res === 'miss') return { kind: 'wrong', pts: 0, msg: r.msg };
      if (r.res === 'unread') return { kind: 'wrong', pts: 0, msg: 'This could not be read as a number.' };
      return { kind: 'wrong', pts: 0 };
    };
    if (q.type === 'mc' || q.type === 'tf') {
      var canon = q.type === 'mc' ? 'opt:' + a : 'tf:' + a;
      return P.hashOf(q.id, canon).then(function (h) {
        var hit = accHas(q.acc, h);
        if (hit) return P.unlock(q.id, canon, hit.x).then(function (o) { return done({ res: 'ok', ex: o }); });
        return done(q.miss && q.miss[h] ? { res: 'miss', msg: q.miss[h] } : { res: 'no' });
      });
    }
    if (q.type === 'numeric' || q.words) return F.judgeTyped(q.id, q, a, q.type === 'numeric' ? 'numeric' : 'short').then(done);
    if (q.type === 'fill') return F.judgeFill(q.id, q, a, q.ftype).then(function (r) {
      // a notes line: a point per blank; the line is right only as an accepted combination
      var right = r.res === 'ok' ? q.k : r.mixed ? 0 : r.marks.filter(Boolean).length;
      var marks = r.res === 'ok' ? r.marks : r.mixed ? r.marks.map(function () { return false; }) : r.marks;
      return { kind: right === q.k ? 'right' : right ? 'partial' : 'wrong', pts: right / q.k, marks: marks, why: r.res === 'ok' ? (r.ex && r.ex.why) || '' : '',
        msg: r.mixed ? 'Each word could fit, but not together like this. Look at the order.' : '' };
    });
    // matching: a point split over the pairs; the explanation opens only when every pair is right
    return Promise.all(q.left.map(function (_, i) {
      var c = a[i];
      if (c === null || c === undefined || c === '') return false;
      return P.hashOf(q.id + '.' + i, 'opt:' + c).then(function (h) { return !!accHas(q.pairs[i], h); });
    })).then(function (rs) {
      var right = rs.filter(Boolean).length, all = right === rs.length;
      var res = { kind: all ? 'right' : right ? 'partial' : 'wrong', pts: right / rs.length, msg: all ? '' : right + ' of ' + rs.length + ' pairs right.' };
      if (!all) return res;
      return P.unlock(q.id, 'match:' + a.join(','), q.x).then(function (o) { res.why = (o && o.why) || ''; return res; });
    });
  }
  function round1(x) { return Math.round(x * 10) / 10; }
  function showDone() { if (AUTO) showResults(); else showSheet(); }
  function showResults() {
    document.body.setAttribute('data-view', 'results');
    app.innerHTML = shell('<p class="loading" role="status">Checking your answers…</p>');
    Promise.all(items.map(judge)).then(function (rs) {
      var obj = items.filter(scored), pts = 0;
      rs.forEach(function (r) { if (r.pts) pts += r.pts; });
      var teacher = items.length - obj.length, pct = obj.length ? Math.round(pts / obj.length * 100) : 0;
      var list = items.map(function (q, i) {
        var r = rs[i];
        var badge = r.kind === 'right' ? '<span class="badge ok">✓ Right</span>' : r.kind === 'partial' ? '<span class="badge part">◐ Partly right</span>' :
          r.kind === 'teacher' ? '<span class="badge tch">✎ Needs your teacher</span>' : '<span class="badge no">✗ Not right</span>';
        return '<li class="r r-' + r.kind + '" data-result="' + r.kind + '">' + badge + '<div class="rq"><span class="num">' + q.n + '.</span> <span>' + q.prompt + '</span></div>' +
          '<p class="ra"><span class="lbl2">Your answer:</span> ' + answerHtml(q) + '</p>' +
          (r.msg ? '<p class="rmsg">' + esc(r.msg) + '</p>' : '') +
          (r.kind !== 'right' && r.kind !== 'teacher' && q.hint ? '<p class="rhint"><span class="lbl2">Hint:</span> ' + q.hint + '</p>' : '') +
          (r.why ? '<p class="rwhy"><span class="lbl2">Why:</span> ' + esc(r.why) + '</p>' : '') + '</li>';
      }).join('');
      app.innerHTML = shell(
        '<section class="results" aria-labelledby="r-h"><h2 id="r-h" tabindex="-1">Your results</h2>' +
        '<p class="meta">' + esc(st.name) + ' · finished ' + esc(dateText(st.finishedAt)) + ' at ' + esc(timeText(st.finishedAt)) + '</p>' +
        '<div class="score" id="pp-score" data-pct="' + pct + '"><b>' + round1(pts) + ' of ' + obj.length + '</b> checked question' + (obj.length === 1 ? '' : 's') + ' right <span class="pct">(' + pct + '%)</span></div>' +
        (teacher ? '<p class="tnote">' + teacher + ' written answer' + (teacher === 1 ? '' : 's') + ' need' + (teacher === 1 ? 's' : '') + ' your teacher. They are not in the score.</p>' : '') +
        '<div class="row noprint"><button type="button" class="btn primary" id="pp-print">Print my results</button><button type="button" class="btn" id="pp-reset">Start over for a new student</button></div>' +
        '<ol class="rlist">' + list + '</ol>' +
        '<p class="small">The explanation shows for a right answer. For the others, ask your teacher, who has the answer key.</p></section>');
      document.getElementById('r-h').focus();
    });
  }

  /* ---------- 2b. grading "print": an answer sheet for someone else to grade ---------- */
  function showSheet() {
    document.body.setAttribute('data-view', 'sheet');
    var list = items.map(function (q) {
      var a = st.answers[q.id];
      if (q.sub) return '<li class="sq"><div class="rq"><span class="num">' + q.n + '.</span> <span>' + q.prompt + '</span></div>' + q.sub.map(function (p, i) {
        var v = Array.isArray(a) ? a[i] : '';
        return '<div class="psub"><p class="ra"><span class="lbl2">(' + esc(p.label) + ')</span> ' + (typeof v === 'string' && v.trim() ? '<span class="typed">' + esc(v).replace(/\n/g, '<br>') + '</span>' : '<i>(blank)</i>') + '</p>' +
          '<p class="grade-line"><span>Part (' + esc(p.label) + ') points: ______ / ' + (p.points != null ? p.points : 2) + '</span></p></div>';
      }).join('') + '<p class="grade-line"><span>Points: ______ / ' + (q.points || 1) + '</span><span>Grader notes: ____________________</span></p></li>';
      return '<li class="sq"><div class="rq"><span class="num">' + q.n + '.</span> <span>' + q.prompt + '</span></div>' +
        '<p class="ra"><span class="lbl2">Answer:</span> ' + answerHtml(q) + '</p>' +
        '<p class="grade-line"><span>Points: ______ / ' + (q.points || 1) + '</span><span>Grader notes: ____________________</span></p></li>';
    }).join('');
    var total = items.reduce(function (s, q) { return s + (q.points || 1); }, 0);
    app.innerHTML = shell(
      '<section class="sheet" aria-labelledby="s-h"><h2 id="s-h" tabindex="-1">Answer sheet</h2>' +
      '<dl class="sheet-meta"><div><dt>Name</dt><dd>' + esc(st.name) + '</dd></div><div><dt>Date</dt><dd>' + esc(dateText(st.finishedAt)) + '</dd></div>' +
      '<div><dt>Assignment</dt><dd>' + esc(D.title) + (D.ver ? ' (version ' + esc(D.ver) + ')' : '') + '</dd></div>' +
      (D.code ? '<div><dt>Version code</dt><dd class="vcode">' + esc(D.code) + '</dd></div>' : '') + '</dl>' +
      '<div class="row noprint"><button type="button" class="btn primary" id="pp-print">Print</button><button type="button" class="btn" id="pp-pdf">Save as PDF</button>' +
      '<button type="button" class="btn" id="pp-edit">Change my answers</button><button type="button" class="btn" id="pp-reset">Start over for a new student</button></div>' +
      '<p class="small noprint" id="pp-pdf-tip" hidden>In the print window, choose <b>Save as PDF</b> as the printer, then save the file and hand it in.</p>' +
      '<ol class="slist">' + list + '</ol>' +
      '<p class="total">Total: ______ / ' + total + '</p><p class="small">Graded by: ____________________</p></section>');
    document.getElementById('s-h').focus();
  }

  /* ---------- guided notes and review games: the same pieces, their own screens ---------- */
  function resetState() { P.lsDel(D.key); var f = load(); f.name = ''; f.answers = {}; f.x = {}; f.finished = false; f.finishedAt = null; f.savedAt = null; st = f; }
  var core = {
    P: P, F: F, D: D, AUTO: AUTO, esc: esc, app: app, items: items, byId: byId, LETTERS: LETTERS, canStore: canStore,
    st: function () { return st; }, save: save, resetState: resetState, timeText: timeText, dateText: dateText,
    answered: answered, answerHtml: answerHtml, fillText: fillText, questionHtml: questionHtml, judge: judge, scored: scored, shell: shell,
    onInput: onInput, round1: round1, onChange: null,
  };
  var MODE = D.mode && window.PPI_MODES && window.PPI_MODES[D.mode];
  if (MODE) { MODE(core); return; }

  /* ---------- one version per student: the name picks the version before the questions show ---------- */
  function showStart() {
    document.body.setAttribute('data-view', 'start');
    app.innerHTML = shell('<section class="who" aria-label="About you"><div class="field"><label for="pp-name">Your name (first and last)</label><input id="pp-name" type="text" autocomplete="name" value="' + esc(st.name) + '"></div>' +
      '<p class="date">Date: ' + esc(dateText()) + '</p></section>' +
      '<p class="how">Everyone gets their own numbers. Type your name the way your teacher writes it, then press <b>Get my questions</b>. Your version code will show at the top.</p>' +
      '<p id="pp-err" class="err" role="alert"></p><div class="row"><button type="button" class="btn primary" id="pp-start">Get my questions</button></div>');
  }
  function start() {
    var name = (document.getElementById('pp-name') || {}).value || '';
    if (!normName(name)) { document.getElementById('pp-err').textContent = 'Type your name first.'; document.getElementById('pp-name').focus(); return; }
    var code = POOL.codes[poolIndex(name)];
    st.name = name; st.x.code = code; usePool(code); save();
    showAnswering(); var m = document.getElementById('main'); if (m) m.focus();
  }

  /* ---------- events ---------- */
  var resetArmed = null;
  app.addEventListener('input', onInput);
  app.addEventListener('change', function (e) { if (e.target.type === 'radio' || e.target.tagName === 'SELECT') onInput(e); });
  app.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-go')) { go(Number(b.getAttribute('data-go'))); return; }
    if (b.id === 'pp-prev') { go(cur - 1); return; }
    if (b.id === 'pp-next') { go(cur + 1); return; }
    if (b.id === 'pp-start') { start(); return; }
    if (b.id === 'pp-finish') finish();
    else if (b.id === 'pp-print') window.print();
    else if (b.id === 'pp-pdf') { document.getElementById('pp-pdf-tip').hidden = false; window.print(); }
    else if (b.id === 'pp-edit') { st.finished = false; save(); showAnswering(); var m = document.getElementById('main'); if (m) m.focus(); }
    else if (b.id === 'pp-reset') {
      if (!resetArmed) { b.textContent = 'Tap again to clear this device'; resetArmed = setTimeout(function () { resetArmed = null; b.textContent = 'Start over for a new student'; }, 4000); return; }
      clearTimeout(resetArmed); resetArmed = null;
      P.lsDel(D.key); st = load(); st.name = ''; st.answers = {}; st.x = {}; st.finished = false; st.finishedAt = null; st.savedAt = null;
      if (POOL) { usePool(''); showStart(); } else showAnswering();
      document.getElementById('pp-name').focus();
    }
  });
  // the question a student is working on is the current one in the navigation
  app.addEventListener('focusin', function (e) {
    var box = e.target.closest && e.target.closest('[data-q]'); if (!box) return;
    var i = items.indexOf(byId[box.getAttribute('data-q')]);
    if (i >= 0 && i !== cur) { cur = i; updateNav(); }
  });
  app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'pp-name' && POOL && !D.code) start(); });
  if (POOL && !D.code) showStart();
  else if (st.finished) showDone(); else showAnswering();
})();
