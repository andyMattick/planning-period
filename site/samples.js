// The samples gallery: reads samples/index.json ([{id, title, grade, subject, folder}]) and each pack.json.
(function () {
  'use strict';
  var esc = PP.esc;
  var box = document.getElementById('samples');
  var menu = { items: [], subjects: [], extras: [] };

  function folderOf(s) {
    var f = s.folder || s.id;
    if (/^samples\//.test(f)) f = f.slice(8);
    return '../samples/' + String(f).replace(/\/+$/, '') + '/';
  }
  function label(list, id) { var x = (list || []).filter(function (i) { return i.id === id; })[0]; return x ? x.label : id; }
  function num(n, d) { return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d || 0 }) : '—'; }

  function stats(pack) {
    var checks = pack.checks || {}, log = Array.isArray(pack.log) ? pack.log : [];
    var rounds = 0, fixed = 0, findings = 0;
    Object.keys(checks).forEach(function (k) {
      (Array.isArray(checks[k]) ? checks[k] : []).forEach(function (c) {
        if (c && Number(c.round) > rounds) rounds = Number(c.round);
        (c && Array.isArray(c.findings) ? c.findings : []).forEach(function (f) {
          findings++;
          if (f && (f.kind === 'FIX' || f.fixed)) fixed++;
        });
      });
    });
    var minutes = log.reduce(function (s, l) { return s + (Number(l.minutes) || 0); }, 0);
    var cost = log.reduce(function (s, l) { return s + (Number(l.cost) || 0); }, 0);
    var agents = {}; log.forEach(function (l) { if (l.who) agents[l.who] = true; });
    return { rounds: rounds, fixed: fixed, findings: findings, minutes: minutes, cost: cost, steps: log.length, agents: Object.keys(agents).length };
  }

  function fileList(folder, s, pack) {
    var known = s.files || pack.files;
    var out = folder + 'out/';
    var p = Array.isArray(known) ? Promise.resolve(known)
      : fetch(out, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (a) { if (!Array.isArray(a)) throw 0; return a; });
    return p.then(function (names) {
      names = names.filter(function (n) { return !/\/$/.test(n); });
      if (!names.length) return '<p class="muted small">No files yet. <a href="' + esc(out) + '">Open the folder</a></p>';
      return '<ul class="filelist">' + names.map(function (n) {
        return '<li><a href="' + esc(out + String(n).split('/').map(encodeURIComponent).join('/')) + '">' + esc(n) + '</a></li>';
      }).join('') + '</ul>';
    }).catch(function () { return '<p class="small"><a href="' + esc(out) + '">Open the pack’s files</a></p>'; });
  }

  function card(s) {
    var folder = folderOf(s);
    return PP.getJSON(folder + 'pack.json').then(function (pack) {
      var o = pack.order || {}, st = stats(pack);
      var items = (o.items || []).map(function (id) { return label(menu.items, id); });
      var subj = o.subject === 'other' && o.subjectOther ? o.subjectOther : label(menu.subjects, o.subject || s.subject);
      var html = '<article class="sample"><h2>' + esc(s.title || pack.id || s.id) + '</h2>' +
        '<p class="muted small">Grade ' + esc(o.grade || s.grade || '—') + ' · ' + esc(subj || '') + (o.topic ? ' · ' + esc(o.topic) : '') + '</p>' +
        '<h3>How hard the team worked</h3><div class="stats">' +
        stat(num(st.rounds), st.rounds === 1 ? 'round of checks' : 'rounds of checks') +
        stat(num(st.fixed), st.fixed === 1 ? 'catch fixed' : 'catches fixed') +
        stat(num(st.minutes), 'agent minutes') +
        stat(st.cost ? '$' + st.cost.toFixed(2) : '—', 'build cost') + '</div>' +
        '<h3>The order</h3><dl class="order">' +
        row('Teacher', o.teacher) + row('Made', items.join(', ')) + row('Requests', o.requests) +
        row('Sources', (o.sources || []).join(', ')) + row('Style examples', (o.styleExamples || []).join(', ')) + '</dl>' +
        (s.alsoInteractive ? '<p class="small"><b>Also available as an interactive page:</b> ' + esc(s.alsoInteractive) + '</p>' : '') +
        logTable(pack.log) +
        '<h3>Files</h3><div data-files>Loading…</div></article>';
      var el = document.createElement('div'); el.innerHTML = html;
      var node = el.firstChild;
      fileList(folder, s, pack).then(function (h) { node.querySelector('[data-files]').innerHTML = h; });
      return node;
    }).catch(function () {
      var el = document.createElement('div');
      el.innerHTML = '<article class="sample"><h2>' + esc(s.title || s.id) + '</h2><p class="muted">This sample’s pack.json isn’t ready yet.</p></article>';
      return el.firstChild;
    });
  }
  function stat(v, k) { return '<div class="stat"><div class="v">' + esc(v) + '</div><div class="k">' + esc(k) + '</div></div>'; }
  function row(k, v) { return v ? '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>' : ''; }
  function logTable(log) {
    if (!Array.isArray(log) || !log.length) return '';
    return '<details><summary>Every step (' + log.length + ')</summary><div class="scroll-x"><table class="log"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Min</th></tr></thead><tbody>' +
      log.map(function (l) {
        return '<tr><td>' + esc(l.at || '') + '</td><td>' + esc(l.who || '') + '</td><td>' + esc(l.what || '') + '</td><td>' + esc(l.minutes != null ? l.minutes : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
  }

  function empty(msg) { box.innerHTML = '<div class="empty"><p>' + msg + '</p><p><a class="btn primary" href="./">Order a pack</a></p></div>'; }

  PP.loadBrand().catch(function () {});
  PP.getJSON('../menu.json').then(function (m) { menu = m; }).catch(function () {})
    .then(function () { return PP.getJSON('../samples/index.json'); })
    .then(function (list) {
      if (Array.isArray(list)) list = list.filter(function (x) { return x && !x.hidden; });   // a sample still failing a gate stays off the public page
      if (!Array.isArray(list) || !list.length) return empty('No sample packs yet. Check back soon.');
      return Promise.all(list.map(card)).then(function (nodes) {
        box.innerHTML = ''; nodes.forEach(function (n) { box.appendChild(n); });
      });
    })
    .catch(function () { empty('No sample packs yet. Check back soon.'); });
})();
