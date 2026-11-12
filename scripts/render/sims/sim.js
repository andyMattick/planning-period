// The lab simulation page (docs/KINDS-LABS.md, "Simulations"). Runs offline in any browser (Chromebooks included): no
// downloads, accounts or network. Expects SIM (the pack's lab.simulation, checked by checks/labs.mjs) and the safe
// calculator from scripts/render/sims/expr.mjs (parseExpr, evalExpr, rng, normal, runTrial), inlined before this file.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var seedParam = Number(new URLSearchParams(location.search).get('seed'));
  var r = rng(Number.isFinite(seedParam) && seedParam > 0 ? seedParam : Date.now() % 2147483647);
  SIM.outputs.forEach(function (o) { o.tree = parseExpr(o.expr); });
  var rows = [];
  var unit = function (x) { return x.unit ? ' (' + x.unit + ')' : ''; };
  var fmt = function (v, d) { return Number.isFinite(v) ? Number(v.toFixed(d == null ? 2 : d)).toString() : '—'; };   // graph ticks
  var cell = function (v, d) { return Number.isFinite(v) ? v.toFixed(d == null ? 2 : d) : '—'; };                     // the data table: fixed decimals, as a student records them
  var shown = SIM.outputs.filter(function (o) { return !o.hidden; });   // an in-between value of the model can stay hidden

  // controls
  $('inputs').innerHTML = SIM.inputs.map(function (x) {
    return '<div class="ctl"><label for="in-' + esc(x.id) + '">' + esc(x.label) + esc(unit(x)) + '</label>' +
      '<div class="pair"><input type="range" id="in-' + esc(x.id) + '" min="' + x.min + '" max="' + x.max + '" step="' + x.step + '" value="' + x.value + '" aria-describedby="v-' + esc(x.id) + '">' +
      '<input type="number" class="num" id="n-' + esc(x.id) + '" min="' + x.min + '" max="' + x.max + '" step="' + x.step + '" value="' + x.value + '" aria-label="' + esc(x.label) + ' value"></div>' +
      '<span class="sr" id="v-' + esc(x.id) + '"></span></div>';
  }).join('');
  SIM.inputs.forEach(function (x) {
    var range = $('in-' + x.id), box = $('n-' + x.id);
    var sync = function (v) { v = Math.min(x.max, Math.max(x.min, Number(v))); if (!Number.isFinite(v)) return; range.value = v; box.value = v; };
    range.addEventListener('input', function () { sync(range.value); });
    box.addEventListener('change', function () { sync(box.value); });
  });
  var current = function () { var o = {}; SIM.inputs.forEach(function (x) { o[x.id] = Number($('in-' + x.id).value); }); return o; };

  // the data table
  var cols = SIM.inputs.map(function (x) { return { id: x.id, label: x.label + unit(x), d: x.digits }; })
    .concat(shown.map(function (o) { return { id: o.id, label: o.label + unit(o), d: o.digits, out: true }; }));
  function drawTable() {
    $('thead').innerHTML = '<tr><th scope="col">Trial</th>' + cols.map(function (c) { return '<th scope="col">' + esc(c.label) + '</th>'; }).join('') + '</tr>';
    $('tbody').innerHTML = rows.length ? rows.map(function (row, i) {
      return '<tr><th scope="row">' + (i + 1) + '</th>' + cols.map(function (c) { return '<td>' + cell(row[c.id], c.d) + '</td>'; }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + (cols.length + 1) + '" class="empty">No trials yet. Set the sliders and press Run trial.</td></tr>';
    $('count').textContent = rows.length + ' trial' + (rows.length === 1 ? '' : 's');
    drawGraph();
  }

  // the graph: a chosen input across, a chosen output up
  var gx = $('gx'), gy = $('gy');
  gx.innerHTML = SIM.inputs.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.label) + '</option>'; }).join('');
  gy.innerHTML = shown.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.label) + '</option>'; }).join('');
  if (SIM.graph) { gx.value = SIM.graph.x; gy.value = SIM.graph.y; }
  gx.addEventListener('change', drawGraph); gy.addEventListener('change', drawGraph);
  function nice(lo, hi) {
    if (lo === hi) { lo -= 1; hi += 1; }
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / 5)));
    [1, 2, 5, 10].some(function (m) { if (span / (step * m) <= 6) { step *= m; return true; } return false; });
    return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step: step };
  }
  function drawGraph() {
    var xi = SIM.inputs.filter(function (x) { return x.id === gx.value; })[0], yo = shown.filter(function (o) { return o.id === gy.value; })[0];
    var W = 560, H = 340, L = 64, R = 16, T = 16, B = 52;
    var xs = { lo: xi.min, hi: xi.max }, X = nice(xs.lo, xs.hi);
    var ys = rows.map(function (row) { return row[yo.id]; }).filter(Number.isFinite);
    var Y = nice(Math.min(0, Math.min.apply(null, ys.concat([yo.min != null ? yo.min : 0]))), Math.max.apply(null, ys.concat([yo.max != null ? yo.max : 1])));
    var px = function (v) { return L + (v - X.lo) / (X.hi - X.lo) * (W - L - R); }, py = function (v) { return H - B - (v - Y.lo) / (Y.hi - Y.lo) * (H - T - B); };
    var g = '';
    for (var v = X.lo; v <= X.hi + 1e-9; v += X.step) g += '<line class="grid" x1="' + px(v) + '" x2="' + px(v) + '" y1="' + T + '" y2="' + (H - B) + '"/><text class="tick" x="' + px(v) + '" y="' + (H - B + 18) + '" text-anchor="middle">' + fmt(v, 3) + '</text>';
    for (var w = Y.lo; w <= Y.hi + 1e-9; w += Y.step) g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + py(w) + '" y2="' + py(w) + '"/><text class="tick" x="' + (L - 8) + '" y="' + (py(w) + 4) + '" text-anchor="end">' + fmt(w, 3) + '</text>';
    g += '<line class="axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/><line class="axis" x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (H - B) + '"/>';
    g += '<text class="lab" x="' + ((L + W - R) / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(xi.label + unit(xi)) + '</text>';
    g += '<text class="lab" transform="translate(16 ' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(yo.label + unit(yo)) + '</text>';
    g += rows.map(function (row) { var x = row[xi.id], y = row[yo.id]; return Number.isFinite(x) && Number.isFinite(y) ? '<circle class="pt" cx="' + px(x) + '" cy="' + py(y) + '" r="5"/>' : ''; }).join('');
    $('graph').setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    $('graph').innerHTML = g;
    $('graph').setAttribute('aria-label', 'Graph of ' + yo.label + ' against ' + xi.label + ', ' + rows.length + ' point' + (rows.length === 1 ? '' : 's'));
  }

  // trials
  $('run').addEventListener('click', function () {
    var n = Number($('repeat').value) || 1, last;
    for (var k = 0; k < n; k++) {
      var inp = current(), out;
      try { out = runTrial(SIM, inp, r); } catch (e) { $('live').textContent = 'The model could not run: ' + e.message; return; }
      last = Object.assign({}, inp, out); rows.push(last);
    }
    drawTable();
    $('live').textContent = 'Trial ' + rows.length + ': ' + shown.map(function (o) { return o.label + ' ' + cell(last[o.id], o.digits) + (o.unit ? ' ' + o.unit : ''); }).join(', ') + '.';
  });
  $('undo').addEventListener('click', function () { rows.pop(); drawTable(); });
  $('clear').addEventListener('click', function () { if (rows.length && $('clear').getAttribute('data-sure') !== '1') { $('clear').setAttribute('data-sure', '1'); $('clear').textContent = 'Press again to clear'; return; } rows = []; $('clear').removeAttribute('data-sure'); $('clear').textContent = 'Clear all'; drawTable(); });
  function csv() { return ['Trial'].concat(cols.map(function (c) { return c.label; })).map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(',') + '\n' + rows.map(function (row, i) { return [i + 1].concat(cols.map(function (c) { return cell(row[c.id], c.d); })).join(','); }).join('\n'); }
  $('copy').addEventListener('click', function () {
    var done = function () { $('live').textContent = 'Copied ' + rows.length + ' trials. Paste them into a spreadsheet or your lab report.'; };
    var area = $('csv');
    var fallback = function () { area.hidden = false; area.value = csv(); area.select(); $('live').textContent = 'Select all of the box below and copy it.'; };
    try { navigator.clipboard.writeText(csv()).then(done, fallback); } catch (e) { fallback(); }
  });
  $('print').addEventListener('click', function () { window.print(); });
  drawTable();
  window.PPSim = { rows: function () { return rows.slice(); }, set: function (id, v) { var e = $('in-' + id); e.value = v; e.dispatchEvent(new Event('input')); } };
})();
