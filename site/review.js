// The web version of the preview's REVIEW.html: a checklist, per-document comments,
// and two buttons that download comments-<order>.json or approval-<order>.json to email back.
(function () {
  'use strict';
  var esc = PP.esc;
  var $ = function (id) { return document.getElementById(id); };
  var brand = {}, menu = { items: [] };
  var docs = [];            // [{ name, comment }]
  var CHECKS = {
    answers: 'I checked the answers.',
    level: 'The level fits my students.',
    content: 'The wording and content are right for my class.',
    noChanges: 'Nothing needs a change.'
  };

  function addDoc(name) {
    name = String(name || '').trim();
    if (!name || docs.some(function (d) { return d.name.toLowerCase() === name.toLowerCase(); })) return;
    docs.push({ name: name, comment: '' });
  }
  function renderDocs() {
    $('docs').innerHTML = docs.length ? docs.map(function (d, i) {
      return '<div class="field req"><label for="c-' + i + '">' + esc(d.name) + '</label>' +
        '<textarea id="c-' + i + '" data-doc="' + i + '" rows="2" placeholder="What should change? (leave empty if it is fine)">' + esc(d.comment) + '</textarea></div>';
    }).join('') : '<p class="muted small">Pick your preview files above and each document gets its own comment box, or add one below.</p>';
  }
  $('docs').addEventListener('input', function (e) {
    var i = e.target.getAttribute('data-doc'); if (i != null) docs[i].comment = e.target.value; update();
  });
  $('add-doc-btn').addEventListener('click', function () { addDoc($('add-doc').value); $('add-doc').value = ''; renderDocs(); });
  $('add-doc').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('add-doc-btn').click(); } });

  // Preview files: read order.json for the id and the items; every other file becomes a document to comment on.
  function docNameFromFile(name) {
    var base = name.split('/').pop();
    if (/^(order|project)\.json$/i.test(base) || /^(REVIEW\.html|README\.txt)$/i.test(base) || base.startsWith('.')) return '';
    return base;
  }
  function pick(fileList) {
    $('err-pick').textContent = '';
    var list = Array.prototype.slice.call(fileList);
    var fileDocs = list.map(function (f) { return docNameFromFile(f.webkitRelativePath || f.name); }).filter(Boolean);
    var useFiles = function () { fileDocs.forEach(addDoc); };
    var json = list.filter(function (f) { return /^(order|project)\.json$/i.test(f.name); })
      .sort(function (a) { return /^order/i.test(a.name) ? -1 : 1; })[0];
    if (!json) { useFiles(); renderDocs(); if (!$('order-id').value) $('err-pick').textContent = 'No order.json in those files. Type the order id from your preview instead.'; return; }
    json.text().then(function (t) {
      var j = JSON.parse(t);
      var id = j.id || (j.order && j.order.id) || '';
      if (id) $('order-id').value = id;
      else $('err-pick').textContent = 'We could not find the order id in ' + json.name + '. Please type it.';
      // Prefer the pack's document titles (plus the audit report), then the picked file names, then the ordered items.
      var titles = (j.documents || []).map(function (d) { return d && d.title; }).filter(Boolean);
      if (titles.length) {
        titles.forEach(addDoc);
        if (fileDocs.some(function (n) { return /^AUDIT-REPORT/i.test(n); })) addDoc('Audit report');
      } else if (fileDocs.length) useFiles();
      else ((j.order && j.order.items) || []).forEach(function (id) {
        var it = (menu.items || []).filter(function (x) { return x.id === id; })[0]; addDoc(it ? it.label : id);
      });
      renderDocs(); update();
    }).catch(function () { useFiles(); $('err-pick').textContent = json.name + ' could not be read. Please type the order id.'; renderDocs(); });
  }
  var zone = document.querySelector('[data-pick]');
  $('f-preview').addEventListener('change', function () { pick(this.files); this.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('over'); }); });
  zone.addEventListener('drop', function (e) { if (e.dataTransfer) pick(e.dataTransfer.files); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // Buttons
  function checks() {
    var o = {}; document.querySelectorAll('[data-check]').forEach(function (c) { o[c.getAttribute('data-check')] = c.checked; }); return o;
  }
  function comments() {
    return docs.filter(function (d) { return d.comment.trim(); }).map(function (d) { return { document: d.name, comment: d.comment.trim() }; });
  }
  function hasComments() { return comments().length > 0 || $('c-general').value.trim().length > 0; }
  function update() {
    var c = checks(), all = Object.keys(CHECKS).every(function (k) { return c[k]; });
    var name = $('who').value.trim().length > 0;
    $('agree').disabled = !(all && name && !hasComments());
    $('changes').disabled = !(hasComments() && name);
    var why = [];
    if (!name) why.push('type your name');
    if (!all) why.push('tick every box to agree');
    if (!hasComments()) why.push('write a comment to request changes');
    else why.push('to agree instead, clear your comments (agreeing means nothing needs a change)');
    $('why-disabled').textContent = why.length ? 'To continue: ' + why.join('; ') + '.' : '';
  }
  document.addEventListener('input', update);
  document.addEventListener('change', update);

  function safeId(id) { return String(id).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'order'; }
  function save(kind) {
    $('err-send').textContent = ''; $('done').innerHTML = '';
    var orderId = $('order-id').value.trim();
    if (!orderId) { $('err-send').textContent = 'Please add the order id in step 1 (it is in your preview’s order.json and README).'; $('order-id').focus(); return; }
    var c = checks();
    var body = {
      format: 1, kind: kind === 'approval' ? 'approval' : 'changes', orderId: orderId,
      name: $('who').value.trim(), at: new Date().toISOString(),
      checklist: Object.keys(CHECKS).map(function (k) { return { id: k, text: CHECKS[k], checked: !!c[k] }; }),
      comments: comments(), general: $('c-general').value.trim()
    };
    if (kind === 'approval') body.agreement = 'I looked over the preview and the audit report, and nothing needs a change. Please release my final files.';
    var file = (kind === 'approval' ? 'approval-' : 'comments-') + safeId(orderId) + '.json';
    var url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2) + '\n'], { type: 'application/json' }));
    var a = document.createElement('a'); a.href = url; a.download = file; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    var mail = esc(brand.orderEmail || '');
    $('done').innerHTML = 'We saved <b>' + esc(file) + '</b> to your downloads. Email it to <b>' + mail + '</b>' +
      (brand.orderEmailIsPlaceholder ? ' <span class="ph">(placeholder address)</span>' : '') + '. ' +
      (kind === 'approval' ? 'When we get it, we release your final, editable files.' : 'We make the changes, check them again and send you a new preview.');
  }
  $('agree').addEventListener('click', function () { save('approval'); });
  $('changes').addEventListener('click', function () { save('changes'); });

  renderDocs(); update();
  Promise.all([PP.loadBrand(), PP.getJSON('../menu.json').catch(function () { return menu; })])
    .then(function (r) { brand = r[0]; menu = r[1]; })
    .catch(function (ex) { $('load-error').textContent = 'Settings could not load (' + ex.message + '). Open this page with npm run serve.'; });
})();
