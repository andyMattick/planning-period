// My orders (docs/BACKEND.md): the signed-in teacher's orders with their status, the onboarding follow-up with
// one-tap answers, the online review of a preview (the same checklist and comments as REVIEW.html; Approve writes the
// approval render-pack.mjs --final checks), and the final files. The owner (a row in admins) sees every order.
(function () {
  'use strict';
  var esc = PP.esc;
  var $ = function (id) { return document.getElementById(id); };
  var backend = null, me = null, admin = false, menu = { items: [], extras: [] };
  var orders = [], events = {}, teachers = {};
  var drafts = {};   // order id -> what she has typed or ticked, kept across re-renders

  // The same four boxes as the preview's REVIEW.html and review.html (scripts/render/review.mjs CHECKLIST).
  var CHECKS = [
    ['answers', 'I checked the answers.'],
    ['level', 'The level fits my students.'],
    ['content', 'The wording and content are right for my class.'],
    ['noChanges', 'Nothing needs a change.']
  ];
  var STATUS = {
    draft: ['Draft', 'Not sent yet.'],
    sent: ['Sent', 'We have your order and your files. Our onboarding agent reads them next.'],
    onboarding: ['Being read', 'Our onboarding agent is reading your material and your order.'],
    needs_answer: ['Needs your answer', 'A few quick questions before we start. Tap an answer for each, or let us use our recommendations.'],
    building: ['Being made', 'The team is making your pack, and fresh agents are checking it. Your preview comes next.'],
    preview_ready: ['Your review', 'Your preview is ready. Open each file, look it over, then approve it or ask for changes. Nothing final is released until you approve.'],
    changes_requested: ['Making your changes', 'We have your comments. We make the changes, check them again and send you a new preview.'],
    approved: ['Approved', 'Thank you. We are making your final, editable files.'],
    final_ready: ['Ready', 'Your final files are ready to download.'],
    cancelled: ['Cancelled', 'This order was cancelled. Nothing more will be made.'],
    failed: ['Stopped', 'We could not finish this order. We will email you.']
  };
  var CANCELLABLE = ['draft', 'sent', 'onboarding', 'needs_answer', 'building', 'preview_ready', 'changes_requested', 'failed'];

  function draft(id) { return drafts[id] = drafts[id] || { checks: {}, comments: {}, general: '', name: '', answers: null, other: {}, extra: '', picks: null }; }
  // Judgment calls (the review's "Your decisions"): option 0 is always "keep it as it is"; any other pick asks for a
  // change, so it is sent with Request changes (scripts/render/review.mjs KEEP_OPTION). Our pick starts chosen.
  function calls(o) { return ((o.review || {}).judgments || []).filter(function (c) { return c && c.id; }); }
  function picksOf(o) {
    var d = draft(o.id);
    if (!d.picks) { d.picks = {}; calls(o).forEach(function (c) { if ((c.options || []).length && c.recommend != null) d.picks[c.id] = Number(c.recommend); }); }
    return d.picks;
  }
  function changePicks(o) { var p = picksOf(o); return calls(o).filter(function (c) { return (c.options || []).length && p[c.id] != null && p[c.id] !== 0; }); }
  function decisions(o) {
    var p = picksOf(o);
    return calls(o).filter(function (c) { return (c.options || []).length && p[c.id] != null; }).map(function (c) {
      return { id: c.id, where: c.where, choice: c.options[p[c.id]], option: p[c.id], recommended: c.recommend, change: p[c.id] !== 0 };
    });
  }
  function decisionsHTML(o) {
    var cs = calls(o), p = picksOf(o), id = esc(o.id);
    if (!cs.length) return '';
    return '<h4>Your decisions</h4><p class="small muted">Matters of your style, left for you. Our pick is chosen; tap another to change it. Keeping a question as it is lets you approve; any other choice is sent with Request changes.</p>' +
      cs.map(function (c) {
        var opts = c.options || [];
        return '<fieldset class="field jcall" data-call="' + esc(c.id) + '"><legend><b>' + esc(c.where) + '.</b> ' + esc(c.issue) + '</legend>' +
          (opts.length ? '<div class="choice-row">' + opts.map(function (x, i) {
            return '<label><input type="radio" name="jc-' + id + '-' + esc(c.id) + '" data-pick="' + id + '" data-call="' + esc(c.id) + '" value="' + i + '"' + (p[c.id] === i ? ' checked' : '') + '> ' + esc(x) +
              (i === c.recommend ? ' <span class="tag-int">our pick</span>' : '') + '</label>';
          }).join('') + '</div>' + (c.why ? '<p class="small muted">Why we suggest it: ' + esc(c.why) + '</p>' : '')
            : '<p class="small muted">' + esc(c.text || '') + ' Write your choice in the comments.</p>') + '</fieldset>';
      }).join('');
  }
  function itemLabel(id) {
    var it = (menu.items || []).concat(menu.extras || []).filter(function (x) { return x.id === id; })[0];
    return it ? it.label : id;
  }
  function when(t) {
    var d = new Date(t); if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  // The follow-up arrives as short Markdown: paragraphs, line breaks and **bold** only (escaped first).
  function mdLite(t) {
    return String(t || '').trim().split(/\n\s*\n/).map(function (p) {
      return '<p>' + esc(p).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  // The planner row's one next step for her, so the list reads like an inbox.
  function nextAction(o, mine) {
    var id = esc(o.id);
    if (o.status === 'needs_answer' && mine) {
      var n = ((o.follow_up || {}).questions || []).length;
      return '<a class="btn primary next" href="#fu-' + id + '">' + (n ? 'Answer ' + n + (n === 1 ? ' question' : ' questions') : 'Read our note') + '</a>';
    }
    if (o.status === 'preview_ready' && mine) return '<a class="btn primary next" href="#rv-' + id + '">Review preview</a>';
    if (o.status === 'final_ready') {
      var zip = (o.final_files || []).filter(function (f) { return /\.zip$/i.test(f); })[0];
      if (zip) return '<a class="btn primary next" data-sign="deliverables:' + esc(base(o) + zip) + '" data-name="' + esc(o.id + '.zip') + '" href="#">Download everything (zip)</a>';
    }
    return '';
  }
  function dateTab(t) {
    var d = new Date(t); if (isNaN(d)) return '';
    return '<span class="date-tab" aria-hidden="true"><span class="m">' + esc(d.toLocaleDateString(undefined, { month: 'short' })) + '</span><span class="d">' + d.getDate() + '</span></span>';
  }
  function base(o) { return o.teacher + '/' + o.id + '/'; }
  function letterOf(opt, i) { var m = /^\s*([A-Z])[\s.):]/.exec(opt); return m ? m[1] : String.fromCharCode(65 + i); }
  function optText(opt) { return String(opt).replace(/^\s*[A-Z][\s.):]+\s*/, ''); }

  // ---------- loading ----------
  function loadAll(focusId) {
    if (!me) { $('list').innerHTML = ''; return; }
    $('list').innerHTML = '<p class="muted">Loading your orders…</p>';
    Promise.all([
      backend.select('orders', 'select=*&order=created_at.desc'),
      backend.select('order_events', 'select=*&order=at.asc').catch(function () { return []; }),
      backend.rpc('is_admin').catch(function () { return false; })
    ]).then(function (r) {
      orders = r[0] || []; admin = r[2] === true;
      events = {}; (r[1] || []).forEach(function (e) { (events[e.order_id] = events[e.order_id] || []).push(e); });
      if (!admin) return;
      return backend.select('teachers', 'select=id,name,email').then(function (t) { teachers = {}; (t || []).forEach(function (x) { teachers[x.id] = x; }); }, function () {});
    }).then(function () { render(focusId); }, function (e) {
      $('list').innerHTML = '<div class="error" role="alert">We could not load your orders (' + esc(e.message || e) + '). <button type="button" class="btn link" data-refresh>Try again</button></div>';
    });
  }

  function render(focusId) {
    var head = '<div class="list-head"><h2>' + (admin ? 'Every order <span class="ph">owner view</span>' : 'Your orders') + '</h2>' +
      '<button type="button" class="btn" data-refresh>Refresh</button></div>';
    if (!orders.length) {
      $('list').innerHTML = head + '<div class="empty"><p>No orders yet.</p><p><a class="btn primary" href="./">Order a pack</a></p></div>';
      return;
    }
    $('list').innerHTML = head + orders.map(cardHTML).join('');
    signLinks();
    var want = focusId || new URLSearchParams(location.search).get('order');
    var el = want && document.getElementById('o-' + want);
    if (el) { el.classList.add('focus'); el.scrollIntoView({ block: 'start' }); }
  }

  function cardHTML(o) {
    var oj = o.order_json || {}, ord = oj.order || {};
    var st = STATUS[o.status] || [o.status, ''];
    var mine = o.teacher === me.id;
    var title = (ord.topic || 'Order') + (ord.grade ? ' · ' + (/^\d+$/.test(ord.grade) ? 'Grade ' + ord.grade : ord.grade) : '');
    var items = (ord.items || []).map(function (id) { var q = ord.quantities && ord.quantities[id]; return itemLabel(id) + (q > 1 ? ' × ' + q : ''); });
    var who = admin && teachers[o.teacher] ? ' · ' + esc(teachers[o.teacher].email || teachers[o.teacher].name) : '';
    var body = '';
    if (o.status === 'needs_answer' && mine) body = followUpHTML(o);
    else if (o.status === 'needs_answer') body = followUpHTML(o, true);
    else if (o.status === 'preview_ready' && mine) body = reviewHTML(o);
    else if (o.status === 'preview_ready') body = filesHTML(o, o.preview_files, 'Preview files');
    else if (o.status === 'changes_requested') body = commentsHTML(o);
    else if (o.status === 'final_ready') body = finalHTML(o);
    if (o.follow_up && o.status !== 'needs_answer' && o.follow_up.message) body += '<details class="fu-old"><summary>Our follow-up' + (o.answer ? ' and your answer' : '') + '</summary>' +
      mdLite(o.follow_up.message) + (o.answer ? '<p><b>You answered:</b> ' + esc(o.answer) + '</p>' : '') + '</details>';
    var ev = events[o.id] || [];
    var hist = ev.length ? '<details class="history"><summary>History</summary><ol class="timeline">' + ev.map(function (e) {
      return '<li><span>' + esc((STATUS[e.status] || [e.status])[0]) + '</span> <span class="muted small">' + esc(when(e.at)) + '</span>' + (e.note ? '<br><span class="small">' + esc(e.note) + '</span>' : '') + '</li>';
    }).join('') + '</ol></details>' : '';
    var cancel = mine && CANCELLABLE.indexOf(o.status) >= 0 && o.status !== 'preview_ready'
      ? '<p class="cancel-row"><button type="button" class="btn link danger" data-cancel="' + esc(o.id) + '">Cancel this order</button></p>' : '';
    return '<article class="order-card s-' + esc(o.status) + '" id="o-' + esc(o.id) + '" data-id="' + esc(o.id) + '">' +
      '<div class="order-head">' + dateTab(o.created_at) + '<div class="order-main"><h3>' + esc(title) + '</h3>' +
      '<p class="small muted">' + esc(items.join(', ')) + (items.length ? ' · ' : '') + esc(o.token_total) + ' tokens · ' + esc(when(o.created_at)) + who + '<br><span class="oid">' + esc(o.id) + '</span></p></div>' +
      '<div class="order-side"><span class="status-chip">' + esc(st[0]) + '</span>' + nextAction(o, mine) + '</div></div>' +
      '<p class="status-text">' + esc(st[1]) + '</p>' + (o.note ? '<p class="notice small">' + esc(o.note) + '</p>' : '') +
      body + '<div class="error" data-err role="alert"></div><div class="ok" data-ok role="status"></div>' + cancel + hist + '</article>';
  }

  // ---------- the onboarding follow-up ----------
  function followUpHTML(o, readOnly) {
    var fu = o.follow_up || {}, qs = fu.questions || [], d = draft(o.id);
    if (!d.answers) { d.answers = {}; qs.forEach(function (q, i) { var opts = q.options || []; var rec = String(q.recommended || ''); d.answers[q.id || 'q' + (i + 1)] = rec ? rec.charAt(0).toUpperCase() : (opts[0] ? letterOf(opts[0], 0) : ''); }); }
    var qHTML = qs.map(function (q, i) {
      var qid = q.id || 'q' + (i + 1), rec = String(q.recommended || '').charAt(0).toUpperCase();
      return '<fieldset class="fu-q"><legend>' + (i + 1) + '. ' + esc(q.ask) + '</legend><div class="choice-row">' + (q.options || []).map(function (opt, k) {
        var L = letterOf(opt, k);
        return '<label><input type="radio" name="' + esc(o.id + ':' + qid) + '" value="' + esc(L) + '" data-answer="' + esc(o.id) + '" data-q="' + esc(qid) + '"' +
          (d.answers[qid] === L ? ' checked' : '') + (readOnly ? ' disabled' : '') + '><span><b>' + esc(L) + '</b> ' + esc(optText(opt)) +
          (L === rec ? ' <span class="rec">our pick</span>' : '') + '</span></label>';
      }).join('') +
        // Other: her own answer in her own words (owner, Nov 8, 2026)
        '<label class="fu-other"><input type="radio" name="' + esc(o.id + ':' + qid) + '" value="Other" data-answer="' + esc(o.id) + '" data-q="' + esc(qid) + '"' +
        (d.answers[qid] === 'Other' ? ' checked' : '') + (readOnly ? ' disabled' : '') + '><span><b>Other</b> ' +
        '<input type="text" maxlength="300" class="fu-other-text" data-other="' + esc(o.id) + '" data-q="' + esc(qid) + '" aria-label="Other answer for question ' + (i + 1) + '" placeholder="Your own answer" value="' + esc((d.other || {})[qid] || '') + '"' + (readOnly ? ' disabled' : '') + '></span></label>' +
        '</div>' + (q.why ? '<p class="small muted">' + esc(q.why) + '</p>' : '') + '</fieldset>';
    }).join('');
    if (readOnly) return '<div class="fu"><p class="note"><b>Only the teacher who placed this order can answer.</b> Sign in with ' + esc((teachers[o.teacher] && teachers[o.teacher].email) || 'the email it was ordered from') + ' to choose answers.</p>' + mdLite(fu.message) + qHTML + '</div>';
    return '<div class="fu" id="fu-' + esc(o.id) + '" tabindex="-1">' + mdLite(fu.message) + qHTML +
      '<div class="field"><label for="fu-extra-' + esc(o.id) + '">Anything else? <span class="hint">(optional)</span></label>' +
      '<textarea id="fu-extra-' + esc(o.id) + '" rows="2" data-extra="' + esc(o.id) + '" placeholder="In your own words">' + esc(d.extra) + '</textarea></div>' +
      '<div class="actions">' + (qs.length ? '<button type="button" class="btn primary" data-send-answer="' + esc(o.id) + '">Send my answers</button>' : '') +
      '<button type="button" class="btn' + (qs.length ? '' : ' primary') + '" data-go="' + esc(o.id) + '">' + (qs.length ? 'Go: use your recommendations' : 'Go: start making it') + '</button></div></div>';
  }
  function sendAnswer(o, go) {
    var d = draft(o.id), qs = (o.follow_up && o.follow_up.questions) || [];
    var answers = {}, parts = [];
    qs.forEach(function (q, i) {
      var qid = q.id || 'q' + (i + 1), rec = String(q.recommended || '').charAt(0).toUpperCase();
      answers[qid] = go ? rec || d.answers[qid] : d.answers[qid];
      var other = String((d.other || {})[qid] || '').trim();
      if (!go && answers[qid] === 'Other') answers[qid] = 'Other: ' + (other || '(no text)');
      parts.push((i + 1) + ' ' + answers[qid]);
    });
    var text = go ? 'go' : parts.join(', ');
    if (d.extra.trim()) text += (text ? ' · ' : '') + d.extra.trim();
    return backend.rpc('answer_follow_up', { p_order: o.id, p_answer: text || 'go', p_answers: answers });
  }

  // ---------- the online review ----------
  function reviewHTML(o) {
    var rv = o.review || {}, d = draft(o.id), id = esc(o.id);
    if (!d.name) d.name = ((o.order_json || {}).order || {}).teacher || '';
    var titles = (rv.docTitles || []).slice();
    if ((rv.documents || []).some(function (x) { return /AUDIT-REPORT/i.test(x.file); })) titles.push('Audit report');
    var zip = (o.preview_files || []).filter(function (f) { return /\.zip$/i.test(f); })[0];
    var docs = rv.documents || [];
    var blindOff = rv.blindSkipped || (((o.order_json || {}).order || {}).checks || {}).blind === false;
    return '<div class="review" id="rv-' + id + '" tabindex="-1"><div class="paper-pane">' +
      (blindOff ? '<div class="notice" data-blind-skipped><p><b>Blind check skipped at your request — please work through the test yourself before students see it.</b></p></div>' : '') +
      '<h4>1. Look over your preview</h4><ul class="dl-list">' + docs.map(function (x, i) {
        // an interactive page (docs/KINDS-INTERACTIVE-FORMAT.md): tried here in a sandboxed frame, or downloaded
        if (/\.html$/i.test(x.file)) {
          return '<li class="is-page"><button type="button" class="btn" data-try="' + i + '" data-file="' + esc(x.file) + '">Try it here</button> <span>' + esc(x.title || x.file) + ' <span class="tag-int">interactive page</span><br><span class="small muted">' + esc(x.file) + '</span></span>' +
            '<button type="button" class="btn link" data-full="' + i + '" data-file="' + esc(x.file) + '">Open full screen</button>' +
            '<button type="button" class="btn link" data-dl-page="' + i + '" data-file="' + esc(x.file) + '">Download</button></li>';
        }
        return '<li><a class="btn" target="_blank" rel="noopener" data-doc="' + i + '" data-sign="deliverables:' + esc(base(o) + 'preview/' + x.file) + '" href="#">Open</a> <span>' + esc(x.title || x.file) + '<br><span class="small muted">' + esc(x.file) + '</span></span>' +
          (/\.pdf$/i.test(x.file) ? '<button type="button" class="btn link show-doc" data-show="' + i + '" aria-pressed="' + (i === 0) + '">Show here</button>' : '') + '</li>';
      }).join('') + '</ul>' +
      (docs.some(function (x) { return /\.html$/i.test(x.file); }) ? '<div class="try-frame" hidden><p class="small muted" data-try-label></p>' +
        '<iframe data-try-frame sandbox="allow-scripts allow-modals" title="Interactive page, as a student sees it"></iframe>' +
        '<p class="small muted">Answer it as a student would; nothing you type here is saved or sent. The watermark goes away in the final file.</p></div>' : '') +
      (docs.some(function (x) { return /\.pdf$/i.test(x.file); }) ? '<div class="paper-frame"><iframe data-viewer title="Your preview" loading="lazy"></iframe>' +
        '<p class="small muted">If the page doesn\'t show here, use Open.</p></div>' : '') +
      (zip ? '<p class="small"><a data-sign="deliverables:' + esc(base(o) + zip) + '" data-name="' + esc(o.id + '-preview.zip') + '" href="#">Download the whole preview</a> (a zip with REVIEW.html, for looking it over offline)</p>' : '') +
      '</div><div class="grade-pane">' +
      '<h4>2. Comments</h4><p class="small muted">What should change in each document: the question number and what it should say. Leave a box empty if it is fine.</p>' +
      titles.map(function (t, i) {
        return '<div class="field req"><label for="c-' + id + '-' + i + '">' + esc(t) + '</label><textarea id="c-' + id + '-' + i + '" rows="2" data-comment="' + id + '" data-title="' + esc(t) + '">' + esc(d.comments[t] || '') + '</textarea></div>';
      }).join('') +
      '<div class="field"><label for="c-' + id + '-all">For the whole pack</label><textarea id="c-' + id + '-all" rows="2" data-general="' + id + '" placeholder="Anything else to change">' + esc(d.general) + '</textarea></div>' +
      decisionsHTML(o) +
      '<h4>3. Approve or ask for changes</h4><p class="small muted">Tick every box only when it is true.</p><ul class="checks">' + CHECKS.map(function (c) {
        return '<li><label><input type="checkbox" data-check="' + id + '" data-key="' + c[0] + '"' + (d.checks[c[0]] ? ' checked' : '') + '> ' + esc(c[1]) + '</label></li>';
      }).join('') + '</ul>' +
      '<div class="field"><label for="who-' + id + '">Your name</label><input type="text" id="who-' + id + '" data-who="' + id + '" autocomplete="name" value="' + esc(d.name) + '"></div>' +
      '<div class="actions"><button type="button" class="btn" data-changes="' + id + '">Request changes</button>' +
      '<button type="button" class="btn primary" data-approve="' + id + '">Approve: release my files</button></div>' +
      '<p class="small muted" data-why="' + id + '"></p>' +
      '<p class="cancel-row"><button type="button" class="btn link danger" data-cancel="' + id + '">Cancel this order</button></p></div></div>';
  }
  // The large preview beside the checklist: only on a wide screen (phones open each file with Open).
  function wide() { return !!(window.matchMedia && matchMedia('(min-width: 1100px)').matches); }
  function showDoc(review, i) {
    var a = review.querySelector('a[data-doc="' + i + '"]'), f = review.querySelector('iframe[data-viewer]');
    if (!a || !f || !a.getAttribute('href') || a.getAttribute('href') === '#') return;
    f.src = a.href;
    review.querySelectorAll('[data-show]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-show') === String(i))); });
  }
  // An interactive page opens in a sandboxed frame (its own scripts run, but it can't reach this page, its storage or
  // the network: the page's own Content-Security-Policy forbids requests). Storage hands it back as text/plain.
  function tryPage(b) {
    var rv = b.closest('.review'), o = orderOf(b); if (!rv || !o) return;
    var box = rv.querySelector('.try-frame'), f = rv.querySelector('[data-try-frame]'), file = b.getAttribute('data-file');
    box.hidden = false;
    rv.querySelector('[data-try-label]').textContent = 'Loading ' + file + '…';
    backend.signedUrl('deliverables', base(o) + 'preview/' + file, 600).then(backend.fetchBytes).then(function (bytes) {
      f.srcdoc = new TextDecoder().decode(bytes);
      rv.querySelector('[data-try-label]').textContent = file;
      rv.querySelectorAll('[data-try]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      box.scrollIntoView({ block: 'nearest' });
    }, function () { rv.querySelector('[data-try-label]').textContent = 'This page could not be opened. Refresh the page.'; });
  }
  // The page's bytes (storage hands an interactive page back as text/plain, so it never runs on the storage site).
  function pageBytes(o, file) { return backend.signedUrl('deliverables', base(o) + 'preview/' + file, 600).then(backend.fetchBytes); }
  // Open full screen / Download: a small page of our own (page.html) loads the file itself in a new tab, so a phone that
  // pauses this tab can't cut the download short, and its Download button is a real tap (phones allow that).
  function pageLink(o, file, dl) { return 'page.html?p=' + encodeURIComponent(base(o) + 'preview/' + file) + '&n=' + encodeURIComponent(file) + (dl ? '&dl=1' : ''); }
  function fullPage(b) { var o = orderOf(b); if (o) window.open(pageLink(o, b.getAttribute('data-file')), '_blank'); }
  function downloadPage(b) { var o = orderOf(b); if (o) window.open(pageLink(o, b.getAttribute('data-file'), true), '_blank'); }
  function reviewState(o) {
    var d = draft(o.id);
    var all = CHECKS.every(function (c) { return d.checks[c[0]]; });
    var comments = Object.keys(d.comments).filter(function (t) { return d.comments[t].trim(); }).map(function (t) { return { title: t, comment: d.comments[t].trim() }; });
    if (d.general.trim()) comments.push({ title: 'Whole pack', comment: d.general.trim() });
    var ch = changePicks(o), p = picksOf(o);
    if (ch.length) comments.push({ title: 'Your decisions', comment: ch.map(function (c) { return c.where + ': ' + c.options[p[c.id]]; }).join(' · ') });
    var name = d.name.trim().length > 0;
    return { all: all, comments: comments, name: name, decisionChange: ch.length > 0, canApprove: all && name && !comments.length, canChange: name && comments.length > 0 };
  }
  function updateReview(o) {
    var card = document.getElementById('o-' + o.id); if (!card || o.status !== 'preview_ready') return;
    var s = reviewState(o), why = [];
    var ap = card.querySelector('[data-approve]'), ch = card.querySelector('[data-changes]');
    if (!ap) return;
    ap.disabled = !s.canApprove; ch.disabled = !s.canChange;
    if (!s.name) why.push('type your name');
    if (!s.all) why.push('tick every box to approve');
    if (!s.comments.length) why.push('write a comment to request changes');
    else if (s.decisionChange) why.push('one of your decisions asks for a change, so send it with Request changes (to approve instead, keep those questions as they are and clear your comments)');
    else why.push('to approve instead, clear your comments (approving means nothing needs a change)');
    card.querySelector('[data-why]').textContent = 'To continue: ' + why.join('; ') + '.';
  }
  // Approve: download every preview PDF she was shown, hash the bytes here (WebCrypto), and send the approval in the
  // shape render-pack.mjs --final checks: {orderId, name, date, statement, packHash, documents:[{file, title, sha256}]}.
  function approve(o, say) {
    var rv = o.review || {}, d = draft(o.id), docs = rv.documents || [];
    var out = [], chain = Promise.resolve();
    docs.forEach(function (x, i) {
      chain = chain.then(function () {
        say('Checking file ' + (i + 1) + ' of ' + docs.length + '…');
        return backend.signedUrl('deliverables', base(o) + 'preview/' + x.file, 600).then(backend.fetchBytes).then(PPBackend.sha256Hex).then(function (h) {
          if (x.sha256 && h !== x.sha256) throw new Error(x.file + ' is not the file the preview was made with. Refresh the page; if it happens again, tell us');
          out.push({ file: x.file, title: x.title, sha256: h });
        });
      });
    });
    return chain.then(function () {
      var approval = { orderId: o.id, name: d.name.trim(), date: new Date().toISOString(), statement: rv.statement,
        packHash: rv.packHash, documents: out, judgments: decisions(o) };
      return backend.rpc('approve_order', { p_order: o.id, p_approval: approval });
    });
  }
  function requestChanges(o) {
    var d = draft(o.id), s = reviewState(o);
    var body = { orderId: o.id, name: d.name.trim(), date: new Date().toISOString(), packHash: (o.review || {}).packHash || null,
      checklist: CHECKS.map(function (c) { return { item: c[1], checked: !!d.checks[c[0]] }; }), comments: s.comments, judgments: decisions(o) };
    return backend.rpc('request_changes', { p_order: o.id, p_comments: body });
  }

  function commentsHTML(o) {
    var c = (o.comments && o.comments.comments) || [];
    return c.length ? '<details open><summary>Your comments</summary><ul>' + c.map(function (x) { return '<li><b>' + esc(x.title) + ':</b> ' + esc(x.comment) + '</li>'; }).join('') + '</ul></details>' : '';
  }
  function filesHTML(o, list, heading) {
    return '<h4>' + esc(heading) + '</h4><ul class="dl-list">' + (list || []).map(function (f) {
      return '<li><a class="btn" data-sign="deliverables:' + esc(base(o) + f) + '" data-name="' + esc(f.split('/').pop()) + '" href="#">Download</a> <span>' + esc(f.replace(/^(final|preview)\//, '')) + '</span></li>';
    }).join('') + '</ul>';
  }
  function finalHTML(o) {
    var list = (o.final_files || []).slice();
    var zip = list.filter(function (f) { return /\.zip$/i.test(f); });
    var rest = list.filter(function (f) { return !/\.zip$/i.test(f); });
    // The zip is the row's own button (nextAction); here, each file on its own.
    return (zip.length ? '<p class="small muted">Everything is in one zip: the button above. Or download each file:</p>' : '') +
      (rest.length ? '<details><summary>Each file (' + rest.length + ')</summary>' + filesHTML(o, rest, 'Files') + '</details>' : '') +
      '<p class="notice small" data-brand-ai></p>';
  }
  // Private files open through short-lived signed links, made when the card is shown.
  function signLinks() {
    document.querySelectorAll('[data-sign]').forEach(function (a) {
      var v = a.getAttribute('data-sign'), i = v.indexOf(':');
      backend.signedUrl(v.slice(0, i), v.slice(i + 1), 3600, a.getAttribute('data-name') || null).then(function (u) {
        a.href = u;
        var rv = a.getAttribute('data-doc') === '0' && wide() && a.closest('.review');
        if (rv) showDoc(rv, 0);
      }, function () {
        a.removeAttribute('href'); a.classList.add('broken'); a.title = 'This file could not be opened. Refresh the page.';
      });
    });
    document.querySelectorAll('[data-brand-ai]').forEach(function (p) { p.textContent = (window.__brand && window.__brand.aiNotice) || ''; });
    orders.forEach(updateReview);
  }

  // ---------- events ----------
  function orderOf(el) { var c = el.closest('.order-card'); return c && orders.filter(function (o) { return o.id === c.getAttribute('data-id'); })[0]; }
  function act(o, card, job, okText) {
    var err = card.querySelector('[data-err]'), ok = card.querySelector('[data-ok]');
    err.textContent = ''; ok.textContent = '';
    card.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    var say = function (t) { ok.textContent = t; };
    return job(say).then(function () { delete drafts[o.id]; say(okText); setTimeout(function () { loadAll(o.id); }, 600); }, function (e) {
      ok.textContent = ''; err.textContent = 'That did not go through (' + (e.message || e) + ').';
      card.querySelectorAll('button').forEach(function (b) { b.disabled = false; }); updateReview(o);
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-refresh]')) { loadAll(); return; }
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-try')) { tryPage(b); return; }
    if (b.hasAttribute('data-full')) { fullPage(b); return; }
    if (b.hasAttribute('data-dl-page')) { downloadPage(b); return; }
    if (b.hasAttribute('data-show')) {
      var rv = b.closest('.review');
      if (wide()) showDoc(rv, b.getAttribute('data-show')); else { var a = rv.querySelector('a[data-doc="' + b.getAttribute('data-show') + '"]'); if (a) a.click(); }
      return;
    }
    var o = orderOf(b); if (!o) return;
    var card = document.getElementById('o-' + o.id);
    if (b.hasAttribute('data-send-answer')) act(o, card, function () { return sendAnswer(o, false); }, 'Thank you. We are starting on it.');
    else if (b.hasAttribute('data-go')) act(o, card, function () { return sendAnswer(o, true); }, 'Thank you. We are starting on it.');
    else if (b.hasAttribute('data-approve')) act(o, card, function (say) { return approve(o, say); }, 'Approved. We are making your final files.');
    else if (b.hasAttribute('data-changes')) act(o, card, function () { return requestChanges(o); }, 'Thank you. We will make the changes and send a new preview.');
    else if (b.hasAttribute('data-cancel')) {
      if (!confirm('Cancel this order? Nothing more will be made.')) return;
      act(o, card, function () { return backend.rpc('cancel_order', { p_order: o.id }); }, 'Cancelled.');
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target, o = orderOf(t); if (!o) return;
    var d = draft(o.id);
    if (t.hasAttribute('data-answer')) d.answers[t.getAttribute('data-q')] = t.value;
    else if (t.hasAttribute('data-other')) {
      var q = t.getAttribute('data-q'); d.other = d.other || {}; d.other[q] = t.value; d.answers[q] = 'Other';
      var r = t.closest('label') && t.closest('label').querySelector('input[type=radio]'); if (r) r.checked = true;
    }
    else if (t.hasAttribute('data-extra')) d.extra = t.value;
    else if (t.hasAttribute('data-comment')) d.comments[t.getAttribute('data-title')] = t.value;
    else if (t.hasAttribute('data-general')) d.general = t.value;
    else if (t.hasAttribute('data-check')) d.checks[t.getAttribute('data-key')] = t.checked;
    else if (t.hasAttribute('data-who')) d.name = t.value;
    else if (t.hasAttribute('data-pick')) { if (t.checked) picksOf(o)[t.getAttribute('data-call')] = Number(t.value); }
    updateReview(o);
  });
  document.addEventListener('change', function (e) { if (e.target.type === 'radio' || e.target.type === 'checkbox') e.target.dispatchEvent(new Event('input', { bubbles: true })); });

  // ---------- start ----------
  Promise.all([PP.loadBrand().catch(function () { return {}; }), PP.getJSON('../menu.json').catch(function () { return menu; }), PPBackend.load()]).then(function (r) {
    window.__brand = r[0]; menu = r[1] || menu; backend = r[2];
    if (!backend) { $('local').hidden = false; return; }
    PPBackend.wireSignIn(backend, function (u) {
      var was = me && me.id; me = u;
      if (!u) { $('list').innerHTML = ''; return; }
      if (was !== u.id) loadAll();
    });
  });
})();
