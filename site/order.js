// The order page: files, menu, requests, live token total, and Send (builds a zip on this device).
// Nothing is uploaded. Name, email and notices come from brand.config.json; the menu from menu.json.
(function () {
  'use strict';
  var esc = PP.esc, fmtBytes = PP.fmtBytes;
  var MB = 1024 * 1024;
  var LIMITS = { training: 25 * MB, sources: 25 * MB };
  var DEFAULT_TURNAROUND = 'This is a pilot. A person runs every order with the agent team, so please allow about 3 school days. ' +
    'If yours will take longer, we will email you and say so. Every pack includes the audit report. Please check the pack before students see it.';

  var brand = {}, menu = { grades: [], subjects: [], items: [], extras: [] };
  var files = { training: [], sources: [] };
  var picked = {};      // item id -> { qty, req }
  var extras = {};      // extra id -> true
  var lastZip = null;

  var $ = function (id) { return document.getElementById(id); };

  // ---------- files ----------
  function total(list) { return files[list].reduce(function (s, f) { return s + f.size; }, 0); }

  function addFiles(list, fileList) {
    var err = $('err-' + list); err.textContent = '';
    var skipped = [];
    Array.prototype.forEach.call(fileList, function (f) {
      var dup = files[list].some(function (g) { return g.name === f.name && g.size === f.size && g.lastModified === f.lastModified; });
      if (dup) return;
      if (total(list) + f.size > LIMITS[list]) { skipped.push(f.name); return; }
      files[list].push(f);
    });
    if (skipped.length) {
      err.textContent = 'We left out ' + skipped.join(', ') + ' because ' + (list === 'sources' ? 'source material' : 'training documents') +
        ' can be up to ' + fmtBytes(LIMITS[list]) + ' in total. Try a smaller file, just the pages you need, or remove something first.';
    }
    renderFiles(list);
  }

  function renderFiles(list) {
    var ul = $('list-' + list);
    ul.innerHTML = files[list].map(function (f, i) {
      return '<li><span class="fname">' + esc(f.name) + '</span><span class="fsize">' + fmtBytes(f.size) + '</span>' +
        '<button type="button" class="btn link" data-remove="' + list + ':' + i + '" aria-label="Remove ' + esc(f.name) + '">Remove</button></li>';
    }).join('');
    var n = files[list].length;
    $('meter-' + list).textContent = n ? n + ' file' + (n === 1 ? '' : 's') + ' · ' + fmtBytes(total(list)) + ' of ' + fmtBytes(LIMITS[list]) : '';
  }

  function setupDrop(list) {
    var zone = document.querySelector('.drop[data-list="' + list + '"]');
    var input = $('f-' + list);
    input.addEventListener('change', function () { addFiles(list, input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('over'); });
    });
    zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) addFiles(list, e.dataTransfer.files); });
    $('list-' + list).addEventListener('click', function (e) {
      var b = e.target.closest('[data-remove]'); if (!b) return;
      var parts = b.getAttribute('data-remove').split(':');
      files[parts[0]].splice(Number(parts[1]), 1);
      $('err-' + list).textContent = '';
      renderFiles(list);
    });
  }
  // A dropped file outside a zone should not open in the tab.
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // ---------- menu ----------
  function fillMenu() {
    $('grade').innerHTML += menu.grades.map(function (g) {
      return '<option value="' + esc(g) + '">' + esc(/^\d+$/.test(g) ? 'Grade ' + g : g === 'K' ? 'Kindergarten' : g) + '</option>';
    }).join('');
    $('subject').innerHTML += menu.subjects.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.label) + '</option>'; }).join('');
    $('subject').addEventListener('change', function () {
      var other = this.value === 'other';
      $('other-wrap').hidden = !other;
      if (other) $('subject-other').focus();
    });

    $('items').innerHTML = menu.items.map(function (it) {
      return '<div class="card" data-item="' + esc(it.id) + '">' +
        '<label class="pick"><input type="checkbox" value="' + esc(it.id) + '"><span><b>' + esc(it.label) + '</b></span></label>' +
        '<p class="detail">' + esc(it.detail) + '</p>' +
        '<div class="tags"><span class="tag cost">' + it.tokens + ' tokens</span>' +
        (it.versions ? '<span class="tag ab">A/B versions</span>' : '') +
        (it.formats || []).map(function (f) { return '<span class="tag">' + esc(f) + '</span>'; }).join('') + '</div>' +
        '<div class="qty" hidden><label for="qty-' + esc(it.id) + '">How many</label>' +
        '<input type="number" id="qty-' + esc(it.id) + '" min="1" max="20" value="1" inputmode="numeric">' +
        '<span class="muted small">' + esc(qtyUnit(it.id)) + '</span></div></div>';
    }).join('');

    $('extras').innerHTML = menu.extras.map(function (x) {
      return '<div class="card" data-extra="' + esc(x.id) + '">' +
        '<label class="pick"><input type="checkbox" value="' + esc(x.id) + '"><span><b>' + esc(x.label) + '</b></span></label>' +
        '<p class="detail">' + esc(x.detail) + '</p>' +
        '<div class="tags"><span class="tag cost">' + (x.tokens ? x.tokens + ' tokens' : 'Included') + '</span></div></div>';
    }).join('');

    $('items').addEventListener('change', function (e) {
      var card = e.target.closest('[data-item]'); if (!card) return;
      var id = card.getAttribute('data-item');
      if (e.target.type === 'checkbox') {
        if (e.target.checked) picked[id] = picked[id] || { qty: 1, req: '' }; else delete picked[id];
        card.classList.toggle('on', e.target.checked);
        card.querySelector('.qty').hidden = !e.target.checked;
        $('err-menu').textContent = '';
        renderRequests();
      }
      if (e.target.type === 'number' && picked[id]) {
        var q = Math.round(Number(e.target.value));
        if (!(q >= 1)) q = 1; if (q > 20) q = 20;
        e.target.value = q; picked[id].qty = q;
      }
      renderCost();
    });
    $('items').addEventListener('input', function (e) {
      if (e.target.type !== 'number') return;
      var id = e.target.closest('[data-item]').getAttribute('data-item');
      var q = Math.round(Number(e.target.value));
      if (picked[id] && q >= 1 && q <= 20) { picked[id].qty = q; renderCost(); }
    });
    $('extras').addEventListener('change', function (e) {
      var card = e.target.closest('[data-extra]'); if (!card) return;
      var id = card.getAttribute('data-extra');
      if (e.target.checked) extras[id] = true; else delete extras[id];
      card.classList.toggle('on', e.target.checked);
      renderCost();
    });
  }

  function qtyUnit(id) {
    return { worksheet: 'worksheets', notes: 'sets of notes', quiz: 'quizzes', test: 'tests', studyguide: 'guides',
      slides: 'decks', reviewgame: 'games', rubric: 'rubrics', project: 'packets', unitpack: 'units' }[id] || '';
  }
  function itemById(id) { return menu.items.filter(function (i) { return i.id === id; })[0]; }
  function pickedIds() { return menu.items.map(function (i) { return i.id; }).filter(function (id) { return picked[id]; }); }

  // ---------- requests ----------
  function renderRequests() {
    var box = $('item-requests');
    var ids = pickedIds();
    // Keep what was typed for items that stay picked.
    box.querySelectorAll('textarea[data-req]').forEach(function (t) {
      var id = t.getAttribute('data-req'); if (picked[id]) picked[id].req = t.value;
    });
    box.innerHTML = ids.length ? ids.map(function (id) {
      return '<div class="field req"><label for="req-' + esc(id) + '">' + esc(itemById(id).label) + '</label>' +
        '<textarea data-req="' + esc(id) + '" id="req-' + esc(id) + '" rows="2" placeholder="Requests just for this item (optional)">' + esc(picked[id].req) + '</textarea></div>';
    }).join('') : '<p class="muted small">Pick something in step 3 to add a request just for that item.</p>';
  }
  $('item-requests').addEventListener('input', function (e) {
    var id = e.target.getAttribute('data-req'); if (id && picked[id]) picked[id].req = e.target.value;
  });

  // ---------- cost ----------
  function costLines() {
    var lines = pickedIds().map(function (id) {
      var it = itemById(id), q = picked[id].qty;
      return { id: id, label: it.label, quantity: q, tokensEach: it.tokens, tokens: it.tokens * q };
    });
    menu.extras.forEach(function (x) {
      if (extras[x.id]) lines.push({ id: x.id, label: x.label, quantity: 1, tokensEach: x.tokens || 0, tokens: x.tokens || 0, extra: true });
    });
    return lines;
  }
  function renderCost() {
    var lines = costLines();
    var sum = lines.reduce(function (s, l) { return s + l.tokens; }, 0);
    $('cost-lines').innerHTML = (lines.length ? lines.map(function (l) {
      return '<tr><td>' + esc(l.label) + (l.quantity > 1 ? ' <span class="muted">× ' + l.quantity + '</span>' : '') + '</td>' +
        '<td class="n">' + (l.tokens ? l.tokens + ' tokens' : 'included') + '</td></tr>';
    }).join('') : '<tr><td class="muted">Nothing picked yet</td><td class="n">0</td></tr>') +
      '<tr class="total"><td>Total</td><td class="n">' + sum + ' tokens</td></tr>';
    return sum;
  }

  // ---------- send ----------
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function randId() {
    var a = new Uint8Array(3); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function safeName(name) { return String(name).replace(/[\/\\:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '_') || 'file'; }
  function uniqueNames(list) {
    var used = {};
    return list.map(function (f) {
      var n = safeName(f.name), base = n, ext = '', k = 2;
      var dot = n.lastIndexOf('.'); if (dot > 0) { base = n.slice(0, dot); ext = n.slice(dot); }
      while (used[n.toLowerCase()]) n = base + ' (' + (k++) + ')' + ext;
      used[n.toLowerCase()] = true;
      return n;
    });
  }
  function readBytes(f) {
    if (f.arrayBuffer) return f.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (ok, bad) {
      var r = new FileReader(); r.onload = function () { ok(new Uint8Array(r.result)); }; r.onerror = function () { bad(r.error); };
      r.readAsArrayBuffer(f);
    });
  }

  function validate() {
    var problems = [];
    if (!$('grade').value) problems.push('a grade');
    if (!$('subject').value) problems.push('a subject');
    else if ($('subject').value === 'other' && !$('subject-other').value.trim()) problems.push('which subject');
    if (!$('topic').value.trim()) problems.push('a topic');
    if (!pickedIds().length) problems.push('at least one thing to make');
    if (!files.sources.length) problems.push('your source material (step 2)');
    return problems;
  }

  $('order').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('err-send'); err.textContent = '';
    var problems = validate();
    if (problems.length) {
      err.textContent = 'Almost there. Please add ' + problems.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
      return;
    }
    var btn = $('send'); btn.disabled = true; btn.textContent = 'Making your order file…';
    var date = today(), rid = randId();
    var subj = $('subject').value;
    var trainNames = uniqueNames(files.training), srcNames = uniqueNames(files.sources);
    var lines = costLines();
    var tokenTotal = lines.reduce(function (s, l) { return s + l.tokens; }, 0);
    var ids = pickedIds();
    var general = $('req-general').value.trim();
    var orderJson = {
      format: 1,
      id: 'pp-' + date + '-' + rid,
      createdAt: new Date().toISOString(),
      order: {
        teacher: $('teacher').value.trim(),
        grade: $('grade').value,
        subject: subj,
        subjectOther: subj === 'other' ? $('subject-other').value.trim() : undefined,
        topic: $('topic').value.trim(),
        items: ids,
        extras: menu.extras.map(function (x) { return x.id; }).filter(function (id) { return extras[id]; }),
        requests: general,
        itemRequests: ids.reduce(function (o, id) { var r = (picked[id].req || '').trim(); if (r) o[id] = r; return o; }, {}),
        quantities: ids.reduce(function (o, id) { o[id] = picked[id].qty; return o; }, {}),
        sources: srcNames,
        styleExamples: trainNames
      },
      lines: lines,
      tokenTotal: tokenTotal,
      replyTo: $('reply').value.trim(),
      notices: { tokenNote: brand.tokenNote || '', aiNotice: brand.aiNotice || '', deleteNotice: brand.deleteNotice || '' }
    };
    var all = files.training.map(function (f, i) { return { f: f, name: 'training/' + trainNames[i] }; })
      .concat(files.sources.map(function (f, i) { return { f: f, name: 'sources/' + srcNames[i] }; }));

    Promise.all(all.map(function (x) { return readBytes(x.f).then(function (b) { return { name: x.name, data: b }; }); }))
      .then(function (entries) {
        entries.unshift({ name: 'order.json', data: JSON.stringify(orderJson, null, 2) + '\n' });
        var bytes = PPZip.makeZip(entries);
        var name = 'order-' + date + '-' + rid + '.zip';
        if (lastZip) URL.revokeObjectURL(lastZip.url);
        lastZip = { name: name, url: URL.createObjectURL(new Blob([bytes], { type: 'application/zip' })), size: bytes.length };
        download();
        showDone();
      })
      .catch(function (ex) {
        err.textContent = 'Sorry, we could not make the order file (' + (ex && ex.message || ex) + '). Try removing very large files and press Send again.';
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Send'; });
  });

  function download() {
    var a = document.createElement('a');
    a.href = lastZip.url; a.download = lastZip.name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function showDone() {
    $('zip-name').textContent = lastZip.name;
    $('zip-size').textContent = fmtBytes(lastZip.size);
    var mail = brand.orderEmail || '';
    $('order-email').innerHTML = brand.orderEmailIsPlaceholder ? esc(mail) : '<a href="mailto:' + esc(mail) + '?subject=' +
      encodeURIComponent('Order ' + lastZip.name) + '">' + esc(mail) + '</a>';
    $('ph-tag').hidden = !brand.orderEmailIsPlaceholder;
    $('turnaround').textContent = brand.turnaround || DEFAULT_TURNAROUND;
    $('order').hidden = true;
    $('done').hidden = false;
    $('done').focus();
    $('done').scrollIntoView({ block: 'start' });
  }
  $('zip-again').addEventListener('click', function (e) { e.preventDefault(); if (lastZip) download(); });
  $('new-order').addEventListener('click', function () {
    if (!confirm('Start a new order? This clears the files and choices on this page.')) return;
    location.reload();
  });

  // ---------- start ----------
  setupDrop('training'); setupDrop('sources');
  $('limit-text').textContent = fmtBytes(LIMITS.sources);
  renderFiles('training'); renderFiles('sources');
  Promise.all([PP.loadBrand(), PP.getJSON('../menu.json')]).then(function (r) {
    brand = r[0]; menu = r[1];
    fillMenu(); renderCost();
  }).catch(function (ex) {
    $('load-error').textContent = 'The menu could not load (' + ex.message + '). Open this page with npm run serve, not straight from the folder.';
    renderCost();
  });
})();
