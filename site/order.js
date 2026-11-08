// The order page: files, menu, requests, live token total, and Send.
// Signed in (online orders on, docs/BACKEND.md): Send uploads the files to the private uploads bucket and adds the
// order (status sent). Otherwise (local mode, signed out or offline): Send builds a zip on this device to email.
// Name, email and notices come from brand.config.json; the menu from menu.json.
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
  var backend = null;   // PPBackend client, or null in local mode

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
      return '<li><span class="fname">' + esc(f.name) + '</span>' + (f.ppLink ? '<span class="flink" title="' + esc(f.ppLink.url) + '">🔗 ' + esc(f.ppLink.site) + '</span>' : '') + '<span class="fsize">' + fmtBytes(f.size) + '</span>' +
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
    $('ask-pages-wrap').hidden = !unknown.length;
    $('ask-pages-names').textContent = unknown.map(function (f) { return f.name; }).join(', ');
  }
  function pagesText(p) { var n = Math.max(1, Math.round(p)); return n + (n === 1 ? ' page' : ' pages'); }

  // The questions asked across items (A/B versions don't double) and what the source supports.
  // Each item draws on the material at its own rate: math practice (worksheet, homework, bell ringers) at
  // mathPracticePerPage when the subject is math, everything else at questionsPerPage (feasibility.json).
  // The range shown is for the mix asked: units ÷ Σ(share ÷ rate), so "asked ≤ high" means the mix fits.
  // A source that is only standards is counted in pages here like any other; the onboarding agent spots it, counts the
  // standards (feasibility.fromStandardsOnly) and its follow-up explains (owner, Nov 7, 2026: no checkbox on the page).
  function rateFor(id) {
    var mpp = feas && feas.mathPracticePerPage;
    if (mpp && $('subject').value === 'math' && (mpp.appliesTo || []).indexOf(id) >= 0) return { low: mpp.low, high: mpp.high, math: true };
    var qpp = (feas && feas.questionsPerPage) || { low: 6, high: 10 };
    return { low: qpp.low, high: qpp.high };
  }
  function feasRows() {
    var d = (feas && feas.defaults) || {}, lim = (feas && feas.limits) || {};
    return pickedIds().filter(function (id) { return PPFeas.COUNTS_QUESTIONS[id]; }).map(function (id) {
      var r = rateFor(id), q = PPFeas.questionsFor(id, picked[id].spec, d[id]);
      var range = lim[id] && lim[id].questions;
      return { id: id, label: itemById(id).label, n: q, qty: picked[id].qty, rlow: r.low, rhigh: r.high, math: !!r.math,
        min: Math.min(q, range ? range[0] : 1) };
    }).filter(function (r) { return r.n > 0; });
  }
  function useOf(rows, key) { return rows.reduce(function (s, r) { return s + r.n * r.qty / r[key]; }, 0); }
  function supported(rows, units, key) {
    var asked = rows.reduce(function (s, r) { return s + r.n * r.qty; }, 0);
    if (!asked) { var r0 = rateFor('quiz'); return Math.max(1, Math.round(units * (key === 'rlow' ? r0.low : r0.high))); }
    return Math.max(1, Math.round(asked * units / useOf(rows, key)));
  }
  function feasState() {
    var rows = feasRows();
    var asked = rows.reduce(function (s, r) { return s + r.n * r.qty; }, 0);
    var st = { asked: asked, pages: null, low: null, high: null, method: [], askedPages: null, rows: rows, units: null,
      mathPractice: rows.some(function (r) { return r.math; }) };
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
    st.pages = known; st.units = known;
    st.low = supported(rows, known, 'rlow'); st.high = supported(rows, known, 'rhigh');
    return st;
  }

  // "Lower it": cut the biggest item first (most questions, counting copies), never below its minimum in
  // feasibility.limits, then the next biggest, until the mix fits. If every item at its minimum still doesn't fit,
  // say so and name the biggest item to remove.
  function lowerPlan(st) {
    var rows = st.rows.map(function (r) { return Object.assign({ asked: r.n }, r); });
    var biggest = rows.slice().sort(function (a, b) { return b.n * b.qty - a.n * a.qty; });
    var units = st.units || 0, eps = 1e-9;
    biggest.forEach(function (r) {
      var excess = useOf(rows, 'rhigh') - units;
      if (excess <= eps) return;
      var cut = Math.ceil(excess * r.rhigh / r.qty - eps);
      r.n = Math.max(r.min, r.n - cut);
    });
    var total = rows.reduce(function (s, r) { return s + r.n * r.qty; }, 0);
    return { rows: rows, total: total, fits: useOf(rows, 'rhigh') <= units + eps, biggest: biggest[0] || null };
  }

  // "1 page" / "3 pages": the plural is done here, not in feasibility.json's "{pages} page(s)".
  function amountText(st) { return pagesText(st.pages); }
  function tooManyText(st) {
    var tmpl = String((feas && feas.messages && feas.messages.tooMany) || '{asked} questions from about {pages} page(s) of material is more than it can support.');
    tmpl = tmpl.indexOf('{pages} page(s)') >= 0 ? tmpl.replace('{pages} page(s)', '{amount}') : tmpl.replace('{pages}', '{amount}').replace(/ page\(s\)/g, '');
    return PPFeas.fill(tmpl, { asked: st.asked, amount: amountText(st), low: st.low, high: st.high });
  }
  function renderFeas() {
    if (!feas) return;
    var st = feasState(), box = $('feas'), mini = $('feas-send');
    var over = st.high != null && st.asked > st.high && !st.incomplete;
    if (over) feasWarned = true;
    if (!over) {
      box.innerHTML = st.high != null && st.asked && !st.incomplete
        ? '<p class="small muted">About ' + amountText(st) + ' of material: room for about ' + st.low + '–' + st.high + ' good questions' +
          (st.mathPractice ? ' (math practice draws more from a page than quizzes and tests do)' : '') + '. You asked for ' + st.asked + '.</p>' : '';
      mini.innerHTML = feasChoice === 'lowered' ? '<p class="small muted">Lowered to fit your material.</p>' : '';
      return;
    }
    var plan = lowerPlan(st);
    var msg = tooManyText(st);
    var chosen = { addMaterial: 'You said you will add more material.', bestJudgment: 'You asked us to use our best judgment. We will tell you what we chose in the follow-up.' }[feasChoice];
    var minTotal = st.rows.reduce(function (s, r) { return s + r.min * r.qty; }, 0);
    var big = plan.biggest;
    var cantLower = !plan.fits && big
      ? '<p class="small" style="margin:.6em 0 0" data-cant-lower>Even with every item at the smallest we make (' + plural(minTotal, 'question') + ' in all), that is more than ' +
        esc(amountText(st)) + ' can support. Try removing an item: the biggest is <b>' + esc(big.label) + '</b> (' + plural(big.asked * big.qty, 'question') +
        (big.qty > 1 ? ', ' + big.qty + ' copies' : '') + '). Or add more material.</p>' : '';
    box.innerHTML = '<div class="warn" role="status"><p><b>That may be too much.</b> ' + esc(msg) + '</p>' + cantLower +
      '<div class="warn-actions">' +
      (plan.fits ? '<button type="button" class="btn' + (feasChoice === 'lowered' ? ' primary' : '') + '" data-feas="lower">Lower it to ' + plan.total + '</button>' : '') +
      '<button type="button" class="btn' + (feasChoice === 'addMaterial' ? ' primary' : '') + '" data-feas="addMaterial">I’ll add more material</button>' +
      '<button type="button" class="btn' + (feasChoice === 'bestJudgment' ? ' primary' : '') + '" data-feas="bestJudgment">Use your best judgment</button></div>' +
      (chosen ? '<p class="small" style="margin:.6em 0 0">' + esc(chosen) + '</p>' : '') + '</div>';
    mini.innerHTML = '<p class="warn small">' + (chosen ? esc(chosen) : 'You asked for ' + st.asked + ' questions; your material supports about ' + st.low + '–' + st.high + '. See step 4. You can still send.') + '</p>';
  }
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }

  // Apply the plan: the new count for each item, keeping its mix of types.
  function lowerTo() {
    var st = feasState();
    if (!st.asked) return false;
    var plan = lowerPlan(st);
    if (!plan.fits) return false;
    plan.rows.forEach(function (r) {
      var old = st.rows.filter(function (x) { return x.id === r.id; })[0];
      if (old && old.n === r.n) return;
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
    return true;
  }
  $('feas').addEventListener('click', function (e) {
    var b = e.target.closest('[data-feas]'); if (!b) return;
    var what = b.getAttribute('data-feas');
    if (what === 'lower') { if (lowerTo()) feasChoice = 'lowered'; }
    else feasChoice = what;
    renderFeas();
    if (what === 'addMaterial') {
      if (document.body.classList.contains('wizard') && window.PPShowStep) window.PPShowStep(1);
      else $('s2-h').scrollIntoView({ block: 'start' });
    }
  });
  $('ask-pages').addEventListener('input', function () { showEstimates(); renderFeas(); });

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

  // ---------- paste a link (signed in only: our server reads the page as text, docs/BACKEND.md) ----------
  // The page comes back as text only; "Use this" turns it into a .txt file in this step's list, so it is counted,
  // size-limited, uploaded and pulled exactly like an uploaded file (a header names the address, title and date).
  var linkPending = { training: null, sources: null };
  function linkBox(list) { return document.querySelector('.linkbox[data-link="' + list + '"]'); }
  function renderLinkAccess() {
    var on = !!(backend && backend.user());
    ['training', 'sources'].forEach(function (list) {
      var b = linkBox(list); if (!b) return;
      b.querySelector('input').disabled = !on;
      b.querySelector('[data-link-get]').disabled = !on;
      var hint = b.querySelector('[data-link-hint]');
      hint.hidden = on;
      hint.textContent = backend ? 'Sign in to add links, or save the page (File → Save page as) and upload it.'
        : 'Links work when orders are sent online. For now, save the page (File → Save page as) and upload it.';
      if (!on) { linkPending[list] = null; renderLinkCard(list); }
    });
  }
  function firstWords(text, n) {
    var m = String(text).match(/\S+\s*/g) || [];
    return m.slice(0, n).join('').trim() + (m.length > n ? ' …' : '');
  }
  function renderLinkCard(list) {
    var card = linkBox(list).querySelector('[data-link-card]'), p = linkPending[list];
    card.hidden = !p;
    if (!p) { card.innerHTML = ''; return; }
    var wpp = (feas && feas.wordsPerPage) || 300;
    card.innerHTML = '<h3>' + esc(p.title) + '</h3>' +
      '<p class="link-meta">' + esc(p.site) + ' · ' + p.words.toLocaleString() + ' words · ' +
      (list === 'sources' ? 'adds about ' + pagesText(p.words / wpp) + ' of source' : 'about ' + pagesText(p.words / wpp)) + '</p>' +
      '<p class="small muted" style="margin:0 0 4px">The start of what we read (text only):</p>' +
      '<div class="link-text" tabindex="0" aria-label="The page text">' + esc(firstWords(p.text, 300)) + '</div>' +
      '<div class="link-actions"><button type="button" class="btn primary" data-link-use>Use this</button>' +
      '<button type="button" class="btn link" data-link-drop>Remove</button></div>';
  }
  function linkFile(p) {
    var header = 'Web page (pasted link, read as text only): ' + p.title + '\n' +
      'Address: ' + p.finalUrl + '\n' + (p.finalUrl !== p.url ? 'Pasted address: ' + p.url + '\n' : '') +
      'Site: ' + p.site + '\n' + 'Read on: ' + new Date().toISOString().slice(0, 10) + '\n\n---\n\n';
    var name = safeName('link - ' + String(p.title).replace(/\s+/g, ' ').slice(0, 80)).replace(/\.+$/, '') + '.txt';
    var f = new File([header + p.text + '\n'], name, { type: 'text/plain', lastModified: Date.now() });
    f.ppLink = { url: p.finalUrl, pasted: p.url, site: p.site, title: p.title };
    return f;
  }
  function setupLink(list) {
    var b = linkBox(list); if (!b) return;
    var input = b.querySelector('input'), btn = b.querySelector('[data-link-get]');
    var err = b.querySelector('[data-link-err]'), status = b.querySelector('[data-link-status]');
    function get() {
      err.textContent = ''; status.textContent = '';
      var v = input.value.trim();
      if (!v) { err.textContent = 'Paste a web address first.'; input.focus(); return; }
      if (!backend || !backend.user()) { renderLinkAccess(); return; }
      btn.disabled = true; status.textContent = 'Getting the page…';
      backend.fetchPage(v).then(function (p) {
        linkPending[list] = p; status.textContent = ''; renderLinkCard(list);
      }, function (e) { status.textContent = ''; err.textContent = e.message || String(e); })
        .then(function () { btn.disabled = !(backend && backend.user()); });
    }
    btn.addEventListener('click', get);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); get(); } });
    b.addEventListener('click', function (e) {
      var p = linkPending[list];
      if (e.target.closest('[data-link-drop]')) { linkPending[list] = null; renderLinkCard(list); input.focus(); return; }
      if (!p || !e.target.closest('[data-link-use]')) return;
      if (files[list].some(function (g) { return g.ppLink && g.ppLink.url === p.finalUrl; })) { err.textContent = 'That page is already in your list.'; return; }
      var f = linkFile(p);
      addFiles(list, [f]);
      if (files[list].indexOf(f) < 0) return;   // over the size limit: addFiles said so
      linkPending[list] = null; renderLinkCard(list);
      input.value = ''; status.textContent = 'Added "' + f.name + '".';
    });
  }

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
      renderFeas();   // math practice draws more from a page
    });

    $('items').innerHTML = menu.items.map(function (it) {
      return '<div class="card" data-item="' + esc(it.id) + '">' +
        '<label class="pick"><input type="checkbox" value="' + esc(it.id) + '">' + paperIcon(it.id) + '<span><b>' + esc(it.label) + '</b></span></label>' +
        '<p class="detail">' + esc(it.detail) + '</p>' +
        '<div class="tags"><span class="tag cost">' + it.tokens + ' tokens</span>' +
        (it.versions ? '<span class="tag ab">A/B versions</span>' : '') +
        (it.interactive ? '<span class="tag int">or interactive</span>' : '') +
        (it.formats || []).map(function (f) { return '<span class="tag">' + esc(f) + '</span>'; }).join('') + '</div>' +
        '<div class="qty" hidden><label for="qty-' + esc(it.id) + '">How many</label>' +
        '<input type="number" id="qty-' + esc(it.id) + '" min="1" max="20" value="1" inputmode="numeric">' +
        '<span class="muted small">' + esc(qtyUnit(it.id)) + '</span></div></div>';
    }).join('');

    $('extras').innerHTML = menu.extras.map(function (x) {
      return '<div class="card" data-extra="' + esc(x.id) + '">' +
        '<label class="pick"><input type="checkbox" value="' + esc(x.id) + '">' + paperIcon(x.id) + '<span><b>' + esc(x.label) + '</b></span></label>' +
        '<p class="detail">' + esc(x.detail) + '</p>' +
        '<div class="tags"><span class="tag cost">' + (x.tokens ? x.tokens + ' tokens' : 'Included') + '</span></div></div>';
    }).join('');

    $('items').addEventListener('change', function (e) {
      var card = e.target.closest('[data-item]'); if (!card) return;
      var id = card.getAttribute('data-item');
      if (e.target.type === 'checkbox') {
        if (e.target.checked) picked[id] = picked[id] || { qty: 1, req: '', spec: itemById(id).interactive ? { format: 'printable' } : {} }; else delete picked[id];
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

  // Small paper-style icons for the menu, so it reads like a catalog of classroom documents.
  var PAPER_KIND = { worksheet: 'lines', notes: 'lines', homework: 'lines', studyguide: 'lines', bellringer: 'lines',
    quiz: 'checks', readingquiz: 'checks', test: 'checks', versions: 'checks',
    slides: 'screen', quizshow: 'screen', rubric: 'grid', crossword: 'grid', wordsearch: 'grid', logicpuzzle: 'grid',
    project: 'stack', unitpack: 'stack', unitfull: 'stack',
    reviewgame: 'device', reviewapp: 'device', interactive: 'device', practicegame: 'device', styleSetup: 'pen' };
  var PAPER_GLYPH = {
    lines: '<path d="M10 17h16M10 22h16M10 27h16M10 32h10"/>',
    checks: '<rect x="9.5" y="15.5" width="5" height="5" rx="1"/><path d="M17 18h9"/><rect x="9.5" y="25.5" width="5" height="5" rx="1"/><path d="M10.5 28l1.6 1.6 3-3.6M17 28h9"/>',
    screen: '<rect x="8.5" y="16.5" width="19" height="13" rx="1.5"/><path d="M15 33h6M18 29.5V33"/>',
    grid: '<path d="M9.5 15.5h17v17h-17zM9.5 21.2h17M9.5 26.8h17M15.2 15.5v17M20.8 15.5v17"/>',
    stack: '<path d="M9 18h18M9 23h18M9 28h18M9 33h18"/><path d="M6 8v34h24" opacity=".55"/>',
    device: '<rect x="12.5" y="14.5" width="11" height="19" rx="2"/><path d="M16.5 30.5h3"/>',
    pen: '<path d="M11 32l2-6 11-11 4 4-11 11z"/><path d="M21 18l4 4"/>'
  };
  function paperIcon(id) {
    var k = PAPER_KIND[id] || 'lines';
    return '<span class="paper p-' + k + '" aria-hidden="true"><svg viewBox="0 0 36 44" width="36" height="44">' +
      '<path class="sheet" d="M4.5 2.5h19l8 8v31h-27z"/><path class="fold" d="M23.5 2.5v8h8"/>' +
      '<g class="glyph" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + PAPER_GLYPH[k] + '</g></svg></span>';
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
      var spec = picked[id].spec = picked[id].spec || {}, d = defaults[id], fields = (PPFeas.SPECS[id] || []).concat(optionFields(id));
      var def = PPFeas.defaultText(id, d);
      return '<div class="item-spec req" data-item-spec="' + esc(id) + '"><h3>' + esc(itemById(id).label) +
        (picked[id].qty > 1 ? ' <span class="muted">× ' + picked[id].qty + '</span>' : '') + '</h3>' +
        formatHTML(id, spec) +
        (fields.length ? '<div class="spec-grid">' + fields.map(function (f) { return fieldHTML(id, f, spec, d); }).join('') + '</div>' : '') +
        (def ? '<p class="small muted spec-default">' + esc(PPFeas.fill(tmpl, { default: def })) + '</p>' : '') +
        '<div class="spec-notes" data-notes="' + esc(id) + '">' + notesHTML(id, spec, limits[id]) + '</div>' +
        '<div class="field"><label for="req-' + esc(id) + '">Anything else for this item</label>' +
        '<textarea data-req="' + esc(id) + '" id="req-' + esc(id) + '" rows="2" placeholder="For example: level 3 needs two steps">' + esc(picked[id].req) + '</textarea></div></div>';
    }).join('') : '<p class="muted small">Pick something in step 3 to tell us the details for that item.</p>';
    renderFeas();
  }
  // Printable or interactive (owner, Nov 8, 2026; docs/KINDS-INTERACTIVE-FORMAT.md): for a menu item with
  // "interactive": true, how students get it, and, for an interactive page, how it is graded. Stored in the order as
  // itemSpecs.<item>.format ("printable" | "interactive") and .grading ("auto" | "print"). Same tokens either way.
  var FORMATS = [['printable', 'Printable', 'PDF and Word, student and teacher copies, as always.'],
    ['interactive', 'Interactive', 'A page students open and answer on any device (one offline file, no accounts). You also get the teacher copy with the key.']];
  var GRADINGS = [['auto', 'Grade automatically when the student finishes', 'Multiple choice, true/false, number and matching questions are scored when she presses Finish; short and written answers are listed for you. Good for practice and low-stakes checks.'],
    ['print', 'Print the results to grade later', 'No answers in the file at all. Finish makes an answer sheet to print or save as a PDF, for you or someone else to grade with the key.']];
  function radioGroup(id, key, legend, opts, value) {
    return '<fieldset class="spec-format" data-format-group="' + esc(key) + '"><legend>' + esc(legend) + '</legend>' + opts.map(function (o) {
      var rid = 'fmt-' + id + '-' + key + '-' + o[0];
      return '<label class="radio-card" for="' + esc(rid) + '"><input type="radio" id="' + esc(rid) + '" name="fmt-' + esc(id + '-' + key) + '" value="' + esc(o[0]) + '" data-spec="' + esc(id + ':' + key) + '"' + (value === o[0] ? ' checked' : '') + '>' +
        '<span><b>' + esc(o[1]) + '</b><span class="small muted">' + esc(o[2]) + '</span></span></label>';
    }).join('') + '</fieldset>';
  }
  // Guided notes and the review game (owner, Nov 8, 2026: "I want it for guided notes and review"): the same two choices,
  // worded for what students do with them.
  var FORMATS_FOR = {
    notes: [FORMATS[0], ['interactive', 'Interactive', 'Students fill in the blanks of the notes on any device (one offline file, no accounts), then print their notes for their binder. You also get the teacher copy with the key.']],
    reviewgame: [['printable', 'Printable', 'Question cards and projector slides, as always, with your key.'], ['interactive', 'Interactive', 'The cards played on any device, one at a time with categories and points, or as a class on a projector with team scores (one offline file, no accounts). You also get the teacher copy with the key.']],
  };
  var GRADINGS_FOR = {
    notes: [['auto', 'Check the blanks automatically', '"Check my notes" marks each blank right or not (capital letters and plurals forgiven) so she can fix it; stop-and-think answers are left for you.'],
      ['print', 'Print the notes to check later', 'No answers in the file at all. Finish prints her filled-in notes with her name and the date, for you to check with the key.']],
    reviewgame: [['auto', 'Score the cards automatically', 'Each card is scored as she plays (half points on a second try), with a results page to print. On a projector, the class code on your teacher copy reveals the answers.'],
      ['print', 'Print the answers to grade later', 'No answers in the file at all. She answers every card, then prints an answer sheet for you to grade with the key.']],
  };
  function formatHTML(id, spec) {
    if (!(itemById(id) || {}).interactive) return '';
    var f = spec.format === 'interactive' ? 'interactive' : 'printable';
    return '<div class="format-box" data-format-box="' + esc(id) + '">' + radioGroup(id, 'format', 'Format', FORMATS_FOR[id] || FORMATS, f) +
      (f === 'interactive' ? radioGroup(id, 'grading', id === 'notes' ? 'Checking' : 'Grading', GRADINGS_FOR[id] || GRADINGS, spec.grading === 'print' ? 'print' : 'auto') +
        '<p class="small muted">Interactive costs the same tokens as printable. ' + (spec.grading === 'print' ? '' : 'Answers are stored as scrambled codes, not text: enough to stop peeking, not a determined student with programming tools, so use it for practice, not for a graded test.') + '</p>' : '') + '</div>';
  }
  function formatLabel(id) {
    var sp = picked[id] && picked[id].spec;
    if (!(itemById(id) || {}).interactive || !sp) return '';
    if (sp.format !== 'interactive') return 'printable';
    if (id === 'notes') return 'interactive, ' + (sp.grading === 'print' ? 'notes printed to check later' : 'blanks checked automatically');
    if (id === 'reviewgame') return 'interactive, ' + (sp.grading === 'print' ? 'answers printed to grade later' : 'scored automatically');
    return 'interactive, ' + (sp.grading === 'print' ? 'results printed to grade later' : 'graded automatically');
  }
  // A menu item's options (menu.json items[].options): a Yes/No choice each; one marked "testing" shows its note as a
  // warning when picked (owner, Nov 7, 2026: multiple choice on reading passages is in testing).
  function optionFields(id) {
    return ((itemById(id) || {}).options || []).map(function (o) {
      return { key: o.id, label: o.label, type: 'select', options: [['', 'No'], [o.status || 'yes', 'Yes']] };
    });
  }
  function notesHTML(id, spec, lim) {
    var notes = PPFeas.limitNotes(id, spec, lim);
    ((itemById(id) || {}).options || []).forEach(function (o) { if (spec && spec[o.id] && o.note) notes.push(o.note); });
    return notes.map(function (n) { return '<p class="warn small">' + esc(n) + '</p>'; }).join('');
  }
  // ---------- the blind check (on by default; unchecking shows what it means) ----------
  $('blind-check').addEventListener('change', function () { $('blind-off-note').hidden = this.checked; });

  $('item-requests').addEventListener('input', function (e) {
    var id = e.target.getAttribute('data-req'); if (id && picked[id]) { picked[id].req = e.target.value; return; }
    var sp = e.target.getAttribute('data-spec'); if (!sp) return;
    var parts = sp.split(':'), item = parts[0], key = parts[1];
    if (!picked[item]) return;
    var spec = picked[item].spec = picked[item].spec || {};
    if (key === 'types') { spec.types = spec.types || {}; spec.types[parts[2]] = e.target.value; }
    else if (e.target.type === 'radio' && !e.target.checked) return;
    else spec[key] = e.target.value;
    if (key === 'format' || key === 'grading') {
      if (spec.format === 'interactive' && !spec.grading) spec.grading = 'auto';
      if (spec.format !== 'interactive') delete spec.grading;
      var fb = $('item-requests').querySelector('[data-format-box="' + item + '"]');
      if (fb) { fb.outerHTML = formatHTML(item, spec); var again = $('item-requests').querySelector('#fmt-' + item + '-' + key + '-' + e.target.value); if (again) again.focus(); }
      renderCost();
      return;
    }
    if (feasChoice === 'lowered') feasChoice = null;
    var lim = (feas && feas.limits) || {};
    var notes = $('item-requests').querySelector('[data-notes="' + item + '"]');
    if (notes) notes.innerHTML = notesHTML(item, spec, lim[item]);
    renderFeas();
  });
  $('item-requests').addEventListener('change', function (e) { if (e.target.tagName === 'SELECT' || e.target.type === 'radio') e.target.dispatchEvent(new Event('input', { bubbles: true })); });

  // ---------- cost ----------
  function costLines() {
    var lines = pickedIds().map(function (id) {
      var it = itemById(id), q = picked[id].qty;
      return { id: id, label: it.label, format: formatLabel(id) || undefined, quantity: q, tokensEach: it.tokens, tokens: it.tokens * q };
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
      return '<tr><td>' + esc(l.label) + (l.quantity > 1 ? ' <span class="muted">× ' + l.quantity + '</span>' : '') + (l.format ? '<br><span class="small muted" data-format-line="' + esc(l.id) + '">' + esc(l.format) + (/^interactive/.test(l.format) ? ' · same price as printable' : '') + '</span>' : '') + '</td>' +
        '<td class="n">' + (l.tokens ? l.tokens + ' tokens' : 'included') + '</td></tr>';
    }).join('') : '<tr><td class="muted">Nothing picked yet</td><td class="n">0</td></tr>') +
      '<tr class="total"><td>Total</td><td class="n">' + sum + ' tokens</td></tr>';
    // The summary card (desktop: right column) and the phone's bottom bar show the same total.
    var sl = $('sum-lines');
    if (sl) sl.innerHTML = lines.length ? lines.map(function (l) {
      return '<li><span>' + esc(l.label) + (l.quantity > 1 ? ' × ' + l.quantity : '') + (l.format ? '<br><span class="small muted">' + esc(l.format) + '</span>' : '') + '</span><span class="n">' + (l.tokens ? l.tokens : 'incl.') + '</span></li>';
    }).join('') : '<li class="muted">Nothing picked yet</li>';
    document.querySelectorAll('[data-sum-total]').forEach(function (el) { el.textContent = sum + ' tokens'; });
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
  function uniqueNames(list, namer) {
    var used = {};
    return list.map(function (f) {
      var n = (namer || safeName)(f.name), base = n, ext = '', k = 2;
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
      standards: null,   // filled by the onboarding agent when the source is only standards (docs/PACK-FORMAT.md)
      asked: st.asked, low: st.low, high: st.high,
      mathPractice: st.mathPractice,
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
    var online = sendsOnline();
    var btn = $('send'); btn.disabled = true; btn.textContent = online ? 'Sending…' : 'Making your order file…';
    var date = today(), rid = randId();
    var subj = $('subject').value;
    var namer = online ? PPBackend.safeKey : null;
    var trainNames = uniqueNames(files.training, namer), srcNames = uniqueNames(files.sources, namer);
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
        // the teacher may skip the blind check (owner, Nov 8, 2026); every other check still runs (docs/RUNBOOK.md step 5)
        checks: { blind: $('blind-check').checked },
        itemRequests: ids.reduce(function (o, id) { var r = (picked[id].req || '').trim(); if (r) o[id] = r; return o; }, {}),
        quantities: ids.reduce(function (o, id) { o[id] = picked[id].qty; return o; }, {}),
        itemSpecs: ids.reduce(function (o, id) { var sp = cleanSpec(picked[id].spec); if (sp) o[id] = sp; return o; }, {}),
        feasibility: feasRecord(),
        sources: srcNames,
        styleExamples: trainNames,
        links: linkRecords(trainNames, srcNames)
      },
      lines: lines,
      tokenTotal: tokenTotal,
      replyTo: $('reply').value.trim(),
      notices: { tokenNote: brand.tokenNote || '', aiNotice: brand.aiNotice || '', deleteNotice: brand.deleteNotice || '' }
    };
    renameSpecFile(orderJson, trainNames, srcNames);
    var all = files.training.map(function (f, i) { return { f: f, name: 'training/' + trainNames[i] }; })
      .concat(files.sources.map(function (f, i) { return { f: f, name: 'sources/' + srcNames[i] }; }));

    var job = online ? sendOnline(orderJson, all) : makeZipOrder(orderJson, all, date, rid);
    job.catch(function (ex) {
        if (online) {
          err.innerHTML = esc('Sorry, your order did not go through (' + (ex && ex.message || ex) + '). Nothing was sent. Press Send to try again, or ') +
            '<button type="button" class="btn link" id="send-zip">make a zip to email instead</button>.';
          $('send-zip').addEventListener('click', function () {
            err.textContent = '';
            var n2 = uniqueNames(files.training), s2 = uniqueNames(files.sources);
            orderJson.order.styleExamples = n2; orderJson.order.sources = s2; orderJson.order.links = linkRecords(n2, s2); delete orderJson.delivery;
            renameSpecFile(orderJson, n2, s2);
            var all2 = files.training.map(function (f, i) { return { f: f, name: 'training/' + n2[i] }; })
              .concat(files.sources.map(function (f, i) { return { f: f, name: 'sources/' + s2[i] }; }));
            makeZipOrder(orderJson, all2, date, rid).catch(function (e2) { err.textContent = 'We could not make the zip either (' + (e2.message || e2) + ').'; });
          });
        } else err.textContent = 'Sorry, we could not make the order file (' + (ex && ex.message || ex) + '). Try removing very large files and press Send again.';
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Send'; $('send-progress').textContent = ''; });
  });

  // Pasted links (saved as .txt sources): where each came from, for the onboarding agent and the audit report.
  function linkRecords(trainNames, srcNames) {
    var out = [];
    [['training', trainNames], ['sources', srcNames]].forEach(function (x) {
      files[x[0]].forEach(function (f, i) {
        if (f.ppLink) out.push({ file: x[0] + '/' + x[1][i], url: f.ppLink.url, pasted: f.ppLink.pasted !== f.ppLink.url ? f.ppLink.pasted : undefined, site: f.ppLink.site, title: f.ppLink.title, read: today() });
      });
    });
    return out.length ? out : undefined;
  }

  // "Which uploaded file is the test" (itemSpecs.versions.file) names the file as it is saved in the order.
  function renameSpecFile(orderJson, trainNames, srcNames) {
    var v = orderJson.order.itemSpecs && orderJson.order.itemSpecs.versions, picked = v && (v.original || v.file);
    if (!picked) return;
    var i = files.sources.map(function (f) { return f.name; }).indexOf(picked), j = files.training.map(function (f) { return f.name; }).indexOf(picked);
    var saved = i >= 0 ? srcNames[i] : j >= 0 ? trainNames[j] : picked;
    if (saved !== picked) { v.original = picked; v.file = saved; } else { delete v.original; v.file = picked; }
  }
  function makeZipOrder(orderJson, all, date, rid) {
    return Promise.all(all.map(function (x) { return readBytes(x.f).then(function (b) { return { name: x.name, data: b }; }); }))
      .then(function (entries) {
        entries.unshift({ name: 'order.json', data: JSON.stringify(orderJson, null, 2) + '\n' });
        var bytes = PPZip.makeZip(entries);
        var name = 'order-' + date + '-' + rid + '.zip';
        if (lastZip) URL.revokeObjectURL(lastZip.url);
        lastZip = { name: name, url: URL.createObjectURL(new Blob([bytes], { type: 'application/zip' })), size: bytes.length };
        download();
        showDone();
      });
  }

  // ---------- online: upload to uploads/<teacher>/<order>/, then add the order (docs/BACKEND.md) ----------
  function sendsOnline() { return !!(backend && backend.user() && navigator.onLine !== false); }
  function sendOnline(orderJson, all) {
    var user = backend.user(), base = user.id + '/' + orderJson.id + '/', done = [];
    orderJson.delivery = 'online';
    var prog = $('send-progress');
    var chain = Promise.resolve();
    all.forEach(function (x, i) {
      chain = chain.then(function () {
        prog.textContent = 'Uploading ' + (i + 1) + ' of ' + all.length + ': ' + x.f.name + '…';
        return backend.upload('uploads', base + x.name, x.f).then(function () { done.push(base + x.name); });
      });
    });
    return chain.then(function () {
      prog.textContent = 'Sending your order…';
      return backend.insert('orders', { id: orderJson.id, teacher: user.id, status: 'sent', order_json: orderJson,
        token_total: orderJson.tokenTotal, upload_files: done });
    }).then(function () { showDoneOnline(orderJson, done.length); }, function (e) {
      if (done.length) backend.remove('uploads', done).catch(function () {});   // nothing half-sent stays behind
      throw e;
    });
  }
  function showDoneOnline(orderJson, n) {
    $('online-id').textContent = orderJson.id;
    $('online-count').textContent = n + ' file' + (n === 1 ? '' : 's');
    $('online-turnaround').textContent = brand.turnaround || DEFAULT_TURNAROUND;
    $('online-link').href = 'orders.html?order=' + encodeURIComponent(orderJson.id);
    $('order').hidden = true;
    $('done-online').hidden = false;
    $('done-online').focus();
    $('done-online').scrollIntoView({ block: 'start' });
  }
  function onUser(u) {
    $('send-note').textContent = u
      ? 'Send uploads your files and your order to us, privately: only you and our team can see them.'
      : 'Nothing is uploaded. Send makes one zip file on this device for you to email' + (backend ? ' (or sign in at the top to send it online).' : '.');
    if (u && u.email && !$('reply').value.trim()) $('reply').value = u.email;
    renderLinkAccess();
  }

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
  document.querySelectorAll('#new-order, [data-new-order]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!confirm('Start a new order? This clears the files and choices on this page.')) return;
      location.reload();
    });
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
  wnav.innerHTML = '<button type="button" class="btn" data-back>Back</button>' +
    '<button type="button" class="wiz-total" data-jump-send aria-label="Token total: go to step 5, review cost and send"><span class="small">Total</span><b data-sum-total>0 tokens</b></button>' +
    '<button type="button" class="btn primary" data-next>Next</button>';
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
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-jump-send]'); if (!j) return;
    e.preventDefault();
    if (document.body.classList.contains('wizard')) showStep(steps.length - 1, true);
    else { var h = $('s5-h'); h.setAttribute('tabindex', '-1'); h.scrollIntoView({ block: 'start', behavior: 'smooth' }); h.focus({ preventScroll: true }); }
  });
  wnav.addEventListener('click', function (e) {
    if (e.target.closest('[data-back]')) showStep(current - 1, true);
    if (e.target.closest('[data-next]')) showStep(current + 1, true);
  });
  var phoneQuery = window.matchMedia ? matchMedia('(max-width: 640px)') : null;
  function applyLayout() { document.body.classList.toggle('wizard', !!(phoneQuery && phoneQuery.matches)); }
  if (phoneQuery) (phoneQuery.addEventListener ? phoneQuery.addEventListener('change', applyLayout) : phoneQuery.addListener(applyLayout));
  applyLayout(); showStep(0, false);

  // ---------- start ----------
  PPBackend.load().then(function (b) { backend = b; if (b) PPBackend.wireSignIn(b, onUser); renderLinkAccess(); });
  setupDrop('training'); setupDrop('sources'); setupLink('training'); setupLink('sources');
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
