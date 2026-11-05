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
  var picked = {};      // item id -> { qty, req, spec }
  var feas = null;      // feasibility.json
  var estimates = typeof WeakMap !== 'undefined' ? new WeakMap() : null;   // source File -> { pages, method, detail }
  var feasChoice = null, feasWarned = false;
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
    if (list === 'sources') estimateSources();
    if (picked.versions) renderRequests();
  }

  // ---------- how much source there is (read on the device, never sent anywhere) ----------
  function estimateSources() {
    var wpp = feas && feas.wordsPerPage;
    var todo = files.sources.filter(function (f) { return !estimates || !estimates.has(f); });
    Promise.all(todo.map(function (f) {
      return PPFeas.estimate(f, wpp).catch(function () { return { name: f.name, pages: null, method: 'unknown' }; })
        .then(function (r) { if (estimates) estimates.set(f, r); });
    })).then(function () { showEstimates(); renderFeas(); });
    showEstimates(); renderFeas();
  }
  function estOf(f) { return estimates && estimates.get(f); }
  function showEstimates() {
    var items = $('list-sources').querySelectorAll('li');
    files.sources.forEach(function (f, i) {
      var r = estOf(f), li = items[i]; if (!li) return;
      var tag = li.querySelector('.fpages');
      if (!tag) { tag = document.createElement('span'); tag.className = 'fpages'; li.insertBefore(tag, li.querySelector('.fsize')); }
      tag.textContent = !r ? 'reading…' : r.pages != null ? 'about ' + pagesText(r.pages) : 'pages unknown';
    });
    var unknown = files.sources.filter(function (f) { var r = estOf(f); return r && r.pages == null; });
    $('ask-pages-wrap').hidden = !unknown.length || $('standards-only').checked;
    $('ask-pages-names').textContent = unknown.map(function (f) { return f.name; }).join(', ');
  }
  function pagesText(p) { var n = Math.max(1, Math.round(p)); return n + (n === 1 ? ' page' : ' pages'); }

  // The questions asked across items (A/B versions don't double) and what the source supports.
  function feasState() {
    var d = (feas && feas.defaults) || {};
    var asked = pickedIds().reduce(function (s, id) { return s + PPFeas.questionsFor(id, picked[id].spec, d[id]) * picked[id].qty; }, 0);
    var st = { asked: asked, pages: null, low: null, high: null, method: [], askedPages: null };
    if ($('standards-only').checked) {
      var n = Number($('standards-count').value);
      st.method.push('standards');
      if (n > 0) {
        var per = (feas && feas.fromStandardsOnly && feas.fromStandardsOnly.questionsPerStandard) || [4, 8];
        st.standards = n; st.low = n * per[0]; st.high = n * per[1];
      }
      return st;
    }
    var known = 0, unknown = 0, pending = 0;
    files.sources.forEach(function (f) {
      var r = estOf(f);
      if (!r) pending++;
      else if (r.pages == null) unknown++;
      else { known += r.pages; if (st.method.indexOf(r.method) < 0) st.method.push(r.method); }
    });
    var ask = Number($('ask-pages').value);
    if (unknown && ask > 0) { known += ask; st.askedPages = ask; st.method.push('asked'); }
    if (!files.sources.length || pending || (unknown && !(ask > 0))) { st.incomplete = true; if (!known) return st; }
    var qpp = (feas && feas.questionsPerPage) || { low: 6, high: 10 };
    st.pages = known;
    st.low = Math.max(1, Math.round(known * qpp.low)); st.high = Math.max(1, Math.round(known * qpp.high));
    return st;
  }

  function renderFeas() {
    if (!feas) return;
    var st = feasState(), box = $('feas'), mini = $('feas-send');
    var over = st.high != null && st.asked > st.high && !st.incomplete;
    if (over) feasWarned = true;
    if (!over) {
      box.innerHTML = st.high != null && st.asked && !st.incomplete
        ? '<p class="small muted">About ' + (st.standards ? plural(st.standards, 'standard') : pagesText(st.pages)) + ' of material: room for about ' + st.low + '–' + st.high + ' good questions. You asked for ' + st.asked + '.</p>' : '';
      mini.innerHTML = feasChoice === 'lowered' ? '<p class="small muted">Lowered to fit your material.</p>' : '';
      return;
    }
    var msg = PPFeas.fill(feas.messages && feas.messages.tooMany, { asked: st.asked, pages: st.standards ? st.standards + ' standard(s)' : Math.max(1, Math.round(st.pages)), low: st.low, high: st.high });
    if (st.standards) msg = msg.replace('page(s) of material', 'of material');
    var chosen = { addMaterial: 'You said you will add more material.', bestJudgment: 'You asked us to use our best judgment. We will tell you what we chose in the follow-up.' }[feasChoice];
    box.innerHTML = '<div class="warn" role="status"><p><b>That may be too much.</b> ' + esc(msg) + '</p>' +
      '<div class="warn-actions">' +
      '<button type="button" class="btn' + (feasChoice === 'lowered' ? ' primary' : '') + '" data-feas="lower">Lower it to ' + st.high + '</button>' +
      '<button type="button" class="btn' + (feasChoice === 'addMaterial' ? ' primary' : '') + '" data-feas="addMaterial">I’ll add more material</button>' +
      '<button type="button" class="btn' + (feasChoice === 'bestJudgment' ? ' primary' : '') + '" data-feas="bestJudgment">Use your best judgment</button></div>' +
      (chosen ? '<p class="small" style="margin:.6em 0 0">' + esc(chosen) + '</p>' : '') + '</div>';
    mini.innerHTML = '<p class="warn small">' + (chosen ? esc(chosen) : 'You asked for ' + st.asked + ' questions; your material supports about ' + st.low + '–' + st.high + '. See step 4. You can still send.') + '</p>';
  }
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }

  // "Lower it to {high}": scale every question count down to fit, keeping the mix.
  function lowerTo(high) {
    var d = (feas && feas.defaults) || {}, st = feasState();
    if (!st.asked) return;
    // Share `high` out by each item's part of the total (largest remainder, so the new total is exactly `high`).
    var rows = pickedIds().filter(function (id) { return PPFeas.COUNTS_QUESTIONS[id]; }).map(function (id) {
      var each = PPFeas.questionsFor(id, picked[id].spec, d[id]), qty = picked[id].qty;
      var share = high * each * qty / st.asked / qty;   // new questions per copy
      return { id: id, each: each, qty: qty, n: Math.max(1, Math.floor(share)), frac: share - Math.floor(share) };
    }).filter(function (r) { return r.each > 0; });
    var left = high - rows.reduce(function (s, r) { return s + r.n * r.qty; }, 0);
    rows.slice().sort(function (a, b) { return b.frac - a.frac; }).forEach(function (r) { if (left >= r.qty) { r.n++; left -= r.qty; } });
    rows.forEach(function (r) {
      var spec = picked[r.id].spec = picked[r.id].spec || {};
      var types = spec.types || {};
      var keys = PPFeas.TYPE_KEYS.filter(function (k) { return types[k] !== '' && types[k] != null && Number(types[k]) > 0; });
      if (keys.length) {   // keep the mix: scale the typed counts so they add up to the new number
        var tot = keys.reduce(function (s, k) { return s + Number(types[k]); }, 0), given = 0;
        keys.forEach(function (k, i) {
          var v = i === keys.length - 1 ? r.n - given : Math.round(Number(types[k]) * r.n / tot);
          v = Math.max(0, Math.min(v, r.n - given)); types[k] = String(v); given += v;
        });
      }
      spec.questions = String(r.n);
    });
    renderRequests();
  }
  $('feas').addEventListener('click', function (e) {
    var b = e.target.closest('[data-feas]'); if (!b) return;
    var what = b.getAttribute('data-feas');
    if (what === 'lower') { lowerTo(feasState().high); feasChoice = 'lowered'; }
    else feasChoice = what;
    renderFeas();
    if (what === 'addMaterial') {
      if (document.body.classList.contains('wizard') && window.PPShowStep) window.PPShowStep(1);
      else $('s2-h').scrollIntoView({ block: 'start' });
    }
  });
  ['standards-only', 'standards-count', 'ask-pages'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      $('standards-wrap').hidden = !$('standards-only').checked;
      showEstimates(); renderFeas();
    });
  });

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
        if (e.target.checked) picked[id] = picked[id] || { qty: 1, req: '', spec: {} }; else delete picked[id];
        card.classList.toggle('on', e.target.checked);
        card.querySelector('.qty').hidden = !e.target.checked;
        $('err-menu').textContent = '';
        renderRequests();
      }
      if (e.target.type === 'number' && picked[id]) {
        var q = Math.round(Number(e.target.value));
        if (!(q >= 1)) q = 1; if (q > 20) q = 20;
        e.target.value = q; picked[id].qty = q;
        renderRequests();
      }
      renderCost();
    });
    $('items').addEventListener('input', function (e) {
      if (e.target.type !== 'number') return;
      var id = e.target.closest('[data-item]').getAttribute('data-item');
      var q = Math.round(Number(e.target.value));
      if (picked[id] && q >= 1 && q <= 20) { picked[id].qty = q; renderCost(); renderFeas(); }
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
  function fieldHTML(id, f, spec, d) {
    var key = id + ':' + f.key, idAttr = 'sp-' + id + '-' + f.key, v = spec[f.key];
    var ph = d && d[f.key] != null ? String(d[f.key]) : '';
    if (f.type === 'types') {
      var t = spec.types || {}, dt = (d && d.types) || {};
      return '<fieldset class="spec-types"><legend>' + esc(f.label) + '</legend>' + PPFeas.TYPE_KEYS.map(function (k) {
        return '<label class="spec-mini"><span>' + esc(PPFeas.TYPE_NAMES[k]) + '</span><input type="number" min="0" max="99" inputmode="numeric" data-spec="' + esc(key + ':' + k) + '"' +
          ' value="' + esc(t[k] || '') + '" placeholder="' + esc(dt[k] != null ? dt[k] : (d && d.types ? 0 : '')) + '"></label>';
      }).join('') + '</fieldset>';
    }
    var input;
    if (f.type === 'select') {
      input = '<select id="' + idAttr + '" data-spec="' + esc(key) + '">' + f.options.map(function (o) {
        var label = o[0] === '' && ph ? 'Choose (we’d pick: ' + ph + ')' : o[1];
        return '<option value="' + esc(o[0]) + '"' + ((v || '') === o[0] ? ' selected' : '') + '>' + esc(label) + '</option>';
      }).join('') + '</select>';
    } else if (f.type === 'file') {
      var names = files.sources.concat(files.training).map(function (x) { return x.name; });
      input = '<select id="' + idAttr + '" data-spec="' + esc(key) + '"><option value="">' + (names.length ? 'Choose a file' : 'Upload your test in step 1 or 2 first') + '</option>' +
        names.map(function (n) { return '<option' + (v === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>';
    } else {
      input = '<input id="' + idAttr + '" data-spec="' + esc(key) + '" type="' + (f.type === 'number' ? 'number' : 'text') + '"' +
        (f.type === 'number' ? ' min="0" inputmode="numeric"' : '') + ' value="' + esc(v || '') + '" placeholder="' + esc(ph) + '">';
    }
    return '<div class="spec-field"><label for="' + idAttr + '">' + esc(f.label) + '</label>' + input + '</div>';
  }

  function renderRequests() {
    var box = $('item-requests');
    var ids = pickedIds();
    var defaults = (feas && feas.defaults) || {}, limits = (feas && feas.limits) || {};
    var tmpl = (feas && feas.messages && feas.messages.defaultUsed) || 'If you leave this blank, we\'ll use: {default}.';
    box.innerHTML = ids.length ? ids.map(function (id) {
      var spec = picked[id].spec = picked[id].spec || {}, d = defaults[id], fields = PPFeas.SPECS[id] || [];
      var def = PPFeas.defaultText(id, d);
      return '<div class="item-spec req" data-item-spec="' + esc(id) + '"><h3>' + esc(itemById(id).label) +
        (picked[id].qty > 1 ? ' <span class="muted">× ' + picked[id].qty + '</span>' : '') + '</h3>' +
        (fields.length ? '<div class="spec-grid">' + fields.map(function (f) { return fieldHTML(id, f, spec, d); }).join('') + '</div>' : '') +
        (def ? '<p class="small muted spec-default">' + esc(PPFeas.fill(tmpl, { default: def })) + '</p>' : '') +
        '<div class="spec-notes" data-notes="' + esc(id) + '">' + notesHTML(id, spec, limits[id]) + '</div>' +
        '<div class="field"><label for="req-' + esc(id) + '">Anything else for this item</label>' +
        '<textarea data-req="' + esc(id) + '" id="req-' + esc(id) + '" rows="2" placeholder="For example: level 3 needs two steps">' + esc(picked[id].req) + '</textarea></div></div>';
    }).join('') : '<p class="muted small">Pick something in step 3 to tell us the details for that item.</p>';
    renderFeas();
  }
  function notesHTML(id, spec, lim) {
    var notes = PPFeas.limitNotes(id, spec, lim);
    return notes.map(function (n) { return '<p class="warn small">' + esc(n) + '</p>'; }).join('');
  }
  $('item-requests').addEventListener('input', function (e) {
    var id = e.target.getAttribute('data-req'); if (id && picked[id]) { picked[id].req = e.target.value; return; }
    var sp = e.target.getAttribute('data-spec'); if (!sp) return;
    var parts = sp.split(':'), item = parts[0], key = parts[1];
    if (!picked[item]) return;
    var spec = picked[item].spec = picked[item].spec || {};
    if (key === 'types') { spec.types = spec.types || {}; spec.types[parts[2]] = e.target.value; }
    else spec[key] = e.target.value;
    if (feasChoice === 'lowered') feasChoice = null;
    var lim = (feas && feas.limits) || {};
    var notes = $('item-requests').querySelector('[data-notes="' + item + '"]');
    if (notes) notes.innerHTML = notesHTML(item, spec, lim[item]);
    renderFeas();
  });
  $('item-requests').addEventListener('change', function (e) { if (e.target.tagName === 'SELECT') e.target.dispatchEvent(new Event('input', { bubbles: true })); });

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

  // Only what the teacher typed; a blank field means "use the default" (feasibility.json).
  function cleanSpec(spec) {
    var out = {}, any = false;
    Object.keys(spec || {}).forEach(function (k) {
      var v = spec[k];
      if (k === 'types') {
        var t = {}, anyT = false;
        Object.keys(v || {}).forEach(function (tk) { if (v[tk] !== '' && v[tk] != null) { t[tk] = Number(v[tk]); anyT = true; } });
        if (anyT) { out.types = t; any = true; }
      } else if (v !== '' && v != null) {
        out[k] = /^\d+$/.test(String(v)) && k !== 'file' && k !== 'turnIn' ? Number(v) : String(v).trim(); any = true;
      }
    });
    return any ? out : null;
  }
  function feasRecord() {
    var st = feasState();
    return {
      pagesEstimated: st.pages != null ? Math.round(st.pages * 10) / 10 : null,
      method: st.method.join('+') || 'none',
      files: files.sources.map(function (f) { var r = estOf(f) || {}; return { name: f.name, pages: r.pages != null ? Math.round(r.pages * 10) / 10 : null, method: r.method || 'pending' }; }),
      askedPages: st.askedPages,
      standards: st.standards || null,
      asked: st.asked, low: st.low, high: st.high,
      tooMuch: st.high != null && st.asked > st.high,
      warned: feasWarned,
      choice: feasChoice
    };
  }

  function validate() {
    var problems = [];
    var menuStep = [];
    if (!$('grade').value) menuStep.push('a grade');
    if (!$('subject').value) menuStep.push('a subject');
    else if ($('subject').value === 'other' && !$('subject-other').value.trim()) menuStep.push('which subject');
    if (!$('topic').value.trim()) menuStep.push('a topic');
    if (!pickedIds().length) menuStep.push('at least one thing to make');
    if (menuStep.length) problems.push(menuStep.join(', ') + ' (step 3)');
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
        itemSpecs: ids.reduce(function (o, id) { var sp = cleanSpec(picked[id].spec); if (sp) o[id] = sp; return o; }, {}),
        feasibility: feasRecord(),
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

  // ---------- phones: one step per screen, with progress dots and Back / Next (desktop keeps the long page) ----------
  var STEP_NAMES = ['Examples', 'Sources', 'Menu', 'Requests', 'Send'];
  var steps = Array.prototype.slice.call(document.querySelectorAll('#order > .step'));
  var current = 0;
  var dots = document.createElement('ol');
  dots.className = 'wizard-dots'; dots.setAttribute('aria-label', 'Order steps');
  dots.innerHTML = steps.map(function (s, i) {
    return '<li style="display:contents"><button type="button" data-go="' + i + '"><span class="dot" aria-hidden="true"></span>' +
      '<span>' + (i + 1) + '. ' + STEP_NAMES[i] + '</span></button></li>';
  }).join('');
  $('order').insertBefore(dots, steps[0]);
  var wnav = document.createElement('div');
  wnav.className = 'wizard-nav';
  wnav.innerHTML = '<button type="button" class="btn" data-back>Back</button><button type="button" class="btn primary" data-next>Next</button>';
  $('order').appendChild(wnav);

  function showStep(i, focus) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach(function (s, k) { s.classList.toggle('current', k === current); });
    dots.querySelectorAll('button').forEach(function (b, k) {
      if (k === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', k < current);
    });
    wnav.querySelector('[data-back]').disabled = current === 0;
    wnav.querySelector('[data-next]').hidden = current === steps.length - 1;
    if (focus && document.body.classList.contains('wizard')) {
      window.scrollTo(0, 0);
      var h = steps[current].querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }
  window.PPShowStep = function (i) { showStep(i, true); };
  dots.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) showStep(Number(b.getAttribute('data-go')), true); });
  wnav.addEventListener('click', function (e) {
    if (e.target.closest('[data-back]')) showStep(current - 1, true);
    if (e.target.closest('[data-next]')) showStep(current + 1, true);
  });
  var phoneQuery = window.matchMedia ? matchMedia('(max-width: 640px)') : null;
  function applyLayout() { document.body.classList.toggle('wizard', !!(phoneQuery && phoneQuery.matches)); }
  if (phoneQuery) (phoneQuery.addEventListener ? phoneQuery.addEventListener('change', applyLayout) : phoneQuery.addListener(applyLayout));
  applyLayout(); showStep(0, false);

  // ---------- start ----------
  setupDrop('training'); setupDrop('sources');
  $('limit-text').textContent = fmtBytes(LIMITS.sources);
  renderFiles('training'); renderFiles('sources');
  Promise.all([PP.loadBrand(), PP.getJSON('../menu.json'), PP.getJSON('../feasibility.json').catch(function () { return null; })]).then(function (r) {
    brand = r[0]; menu = r[1]; feas = r[2];
    fillMenu(); renderCost(); renderRequests(); estimateSources();
  }).catch(function (ex) {
    $('load-error').textContent = 'The menu could not load (' + ex.message + '). Open this page with npm run serve, not straight from the folder.';
    renderCost();
  });
})();
