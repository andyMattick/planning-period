// "Build a learning world": a request form for a custom world (docs/WORLD-REQUESTS.md).
// Collects who it's for, subjects and standards, the world's look, what each unit gets and the grown-up controls,
// then Send builds world-request-<date>-<id>.zip on this device (world-request.json + uploads). Nothing is uploaded,
// and there are no prices here: the owner sends a quote and a timeline.
(function () {
  'use strict';
  var esc = PP.esc, fmtBytes = PP.fmtBytes;
  var LIMIT = 25 * 1024 * 1024;
  var brand = {}, menu = { grades: [], subjects: [] };
  var subj = {};        // subject id -> { source: 'upload' | 'standardOrder', files: [], units: '', name: '' }
  var lastZip = null;
  var $ = function (id) { return document.getElementById(id); };

  var THEMES = { 'pet-town': 'Pet town', ocean: 'Ocean', space: 'Space', city: 'City', fantasy: 'Fantasy', own: 'Their own idea' };
  var AUDIENCES = { homeschool: 'Homeschool family', classroom: 'Classroom', tutor: 'Tutor', coop: 'Co-op', school: 'School' };
  var FEATURES = [
    ['practice', 'Practice stations with 3 levels', 'Each unit has a few stations; every skill has an easier, a middle and a harder level.'],
    ['hints', 'Step-by-step hints and mix-up detection', 'Problems are worked a step at a time, and a wrong answer is matched to the usual mix-up so the hint fits.'],
    ['notes', 'Note sheets', 'A printable, fill-in note sheet for each station, with worked examples.'],
    ['videos', 'Video picks', 'Short teaching videos picked and checked for each lesson.'],
    ['quizzes', 'Quizzes', 'Short quizzes along the way.'],
    ['unitTest', 'A unit test, with a review first', 'Flashcards and review questions before every test; a miss shows the lesson again.'],
    ['signOff', 'A grown-up signs off before tests', 'A grown-up enters a PIN before the review and before each test.'],
    ['game', 'A game for every unit', 'An original game that practices the unit, inside the unit.'],
    ['arcade', 'An Arcade', 'Every unit game also lives in one Arcade, with tickets to earn.'],
    ['rewards', 'Rewards', 'Coins, stickers and a sticker book for finished work.'],
    ['dashboard', 'A teacher or parent dashboard', 'Progress by skill, the mix-ups each student makes, practice time and test results.'],
    ['printable', 'A printable pack', 'The note sheets, quizzes and tests as PDFs, with answer keys for the grown-up.']
  ];
  var CONTROLS = [
    ['pinBeforeTests', 'A PIN before tests', 'A grown-up OKs every review and test.', true],
    ['videoFirst', 'Video first', 'The first practice each day waits until a video is watched.', true],
    ['dailyPlan', 'A daily plan', 'A short list for each day: which units, how long.', true],
    ['music', 'Music', 'Background music the student can turn on (you can switch it off).', true],
    ['breaks', 'Breaks', 'Reminders to take a short break after a stretch of work.', true]
  ];

  function checksHTML(list, prefix, allOn) {
    return list.map(function (f) {
      var on = allOn || f[3];
      return '<li><label><input type="checkbox" data-' + prefix + '="' + esc(f[0]) + '"' + (on ? ' checked' : '') + '><span>' + esc(f[1]) +
        '<span class="why">' + esc(f[2]) + '</span></span></label></li>';
    }).join('');
  }
  $('features').innerHTML = checksHTML(FEATURES, 'feature', true);
  $('controls').innerHTML = checksHTML(CONTROLS, 'control', false);

  // ---------- step 1 ----------
  function gradeLabel(g) { return /^\d+$/.test(g) ? 'Grade ' + g : g === 'K' ? 'Kindergarten' : g; }
  function fillGrades() {
    $('grades').innerHTML = menu.grades.map(function (g) {
      return '<label' + (g.length > 2 ? ' class="wide"' : '') + '><input type="checkbox" value="' + esc(g) + '"> ' + esc(g) + '</label>';
    }).join('');
  }
  function radio(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  function grades() { return Array.prototype.map.call($('grades').querySelectorAll('input:checked'), function (i) { return i.value; }); }

  // ---------- step 2: subjects, each with its own standards ----------
  function fillSubjects() {
    $('subjects').innerHTML = menu.subjects.map(function (s) {
      return '<label><input type="checkbox" value="' + esc(s.id) + '"> ' + esc(s.id === 'other' ? 'Other' : s.label) + '</label>';
    }).join('');
  }
  function subjectLabel(id) {
    if (id === 'other') return $('subj-other').value.trim() || 'Other subject';
    var s = menu.subjects.filter(function (x) { return x.id === id; })[0];
    return s ? s.label : id;
  }
  function pickedSubjects() { return menu.subjects.map(function (s) { return s.id; }).filter(function (id) { return subj[id]; }); }
  function totalBytes() { return pickedSubjects().reduce(function (s, id) { return s + subj[id].files.reduce(function (t, f) { return t + f.size; }, 0); }, 0); }

  function renderSubjects() {
    var ids = pickedSubjects();
    $('subj-other-wrap').hidden = !subj.other;
    $('subject-cards').innerHTML = ids.length ? ids.map(function (id) {
      var s = subj[id];
      return '<div class="subj-card" data-subj="' + esc(id) + '"><h3>' + esc(subjectLabel(id)) + '</h3>' +
        '<div class="choice-row">' +
        '<label><input type="radio" name="src-' + esc(id) + '" value="upload"' + (s.source === 'upload' ? ' checked' : '') + '> I’ll send our standards or curriculum</label>' +
        '<label><input type="radio" name="src-' + esc(id) + '" value="standardOrder"' + (s.source === 'standardOrder' ? ' checked' : '') + '> Use your standard order for the grade</label></div>' +
        (s.source === 'upload'
          ? '<div class="drop" data-drop="' + esc(id) + '"><p>Drag files here, or</p><label class="btn" for="f-' + esc(id) + '">Choose files</label>' +
            '<input class="sr-only" type="file" id="f-' + esc(id) + '" data-file="' + esc(id) + '" multiple>' +
            '<p class="small muted" style="margin-top:.6em">Standards, a curriculum map, a syllabus, a scope and sequence: PDF, Word, a photo.</p></div>' +
            '<ul class="files">' + s.files.map(function (f, i) {
              return '<li><span class="fname">' + esc(f.name) + '</span><span class="fsize">' + fmtBytes(f.size) + '</span>' +
                '<button type="button" class="btn link" data-remove="' + esc(id) + ':' + i + '" aria-label="Remove ' + esc(f.name) + '">Remove</button></li>';
            }).join('') + '</ul>' +
            '<div class="field"><label for="sname-' + esc(id) + '">Which standards <span class="hint">(optional)</span></label>' +
            '<input type="text" id="sname-' + esc(id) + '" data-sname="' + esc(id) + '" value="' + esc(s.name) + '" placeholder="For example: Georgia 7th grade math, 2021"></div>'
          : '<p class="small muted" style="margin:.4em 0">We’ll follow a common order for the grade and send it to you to check in the unit map.</p>') +
        '<div class="field"><label for="units-' + esc(id) + '">Number of units <span class="hint">(leave blank and we’ll suggest one)</span></label>' +
        '<input type="number" id="units-' + esc(id) + '" data-units="' + esc(id) + '" min="1" max="40" inputmode="numeric" value="' + esc(s.units) + '" placeholder="For example: 8" style="max-width:160px"></div>' +
        '</div>';
    }).join('') : '<p class="muted small">Pick a subject above to tell us about it.</p>';
    renderBuildings();
  }
  function addFiles(id, list) {
    var err = $('err-2'); err.textContent = '';
    var skipped = [];
    Array.prototype.forEach.call(list, function (f) {
      if (subj[id].files.some(function (g) { return g.name === f.name && g.size === f.size && g.lastModified === f.lastModified; })) return;
      if (totalBytes() + f.size > LIMIT) { skipped.push(f.name); return; }
      subj[id].files.push(f);
    });
    if (skipped.length) err.textContent = 'We left out ' + skipped.join(', ') + ' because files can be up to ' + fmtBytes(LIMIT) + ' in total. Try just the pages you need.';
    renderSubjects();
  }
  $('subjects').addEventListener('change', function (e) {
    var id = e.target.value;
    if (e.target.checked) subj[id] = subj[id] || { source: '', files: [], units: '', name: '' }; else delete subj[id];
    $('err-2').textContent = '';
    renderSubjects();
    if (id === 'other' && e.target.checked) $('subj-other').focus();
  });
  $('subj-other').addEventListener('input', function () { var h = document.querySelector('[data-subj="other"] h3'); if (h) h.textContent = subjectLabel('other'); });
  var cards = $('subject-cards');
  cards.addEventListener('change', function (e) {
    var card = e.target.closest('[data-subj]'); if (!card) return;
    var id = card.getAttribute('data-subj');
    if (e.target.type === 'radio') { subj[id].source = e.target.value; $('err-2').textContent = ''; renderSubjects(); }
    if (e.target.type === 'file') { addFiles(id, e.target.files); }
  });
  cards.addEventListener('input', function (e) {
    var u = e.target.getAttribute('data-units'), n = e.target.getAttribute('data-sname');
    if (u && subj[u]) { subj[u].units = e.target.value; renderBuildings(); }
    if (n && subj[n]) subj[n].name = e.target.value;
  });
  cards.addEventListener('click', function (e) {
    var b = e.target.closest('[data-remove]'); if (!b) return;
    var p = b.getAttribute('data-remove').split(':');
    subj[p[0]].files.splice(Number(p[1]), 1); renderSubjects();
  });
  ['dragenter', 'dragover'].forEach(function (ev) {
    cards.addEventListener(ev, function (e) { var z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
  });
  cards.addEventListener('dragleave', function (e) { var z = e.target.closest('[data-drop]'); if (z) z.classList.remove('over'); });
  cards.addEventListener('drop', function (e) {
    var z = e.target.closest('[data-drop]'); if (!z) return;
    e.preventDefault(); z.classList.remove('over');
    if (e.dataTransfer && e.dataTransfer.files) addFiles(z.getAttribute('data-drop'), e.dataTransfer.files);
  });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // ---------- step 3 ----------
  function unitCount() {
    var ids = pickedSubjects(), known = 0, blank = 0;
    ids.forEach(function (id) { var n = Number(subj[id].units); if (n > 0) known += Math.round(n); else blank++; });
    return { known: known, blank: blank, subjects: ids.length };
  }
  function renderBuildings() {
    var u = unitCount();
    $('buildings-text').textContent = !u.subjects ? 'Each unit becomes its own building. We set this up from the units in step 2.'
      : 'Each unit becomes its own building: ' + (u.known ? u.known + ' building' + (u.known === 1 ? '' : 's') + (u.blank ? ' so far, plus the units we suggest for ' + u.blank + ' subject' + (u.blank === 1 ? '' : 's') : '') : 'we’ll suggest the units') + '.';
  }
  $('themes').addEventListener('change', function () { $('theme-own-wrap').hidden = radio('theme') !== 'own'; if (radio('theme') === 'own') $('theme-own').focus(); });

  // ---------- the request ----------
  function checked(prefix) {
    var out = {};
    document.querySelectorAll('[data-' + prefix + ']').forEach(function (i) { out[i.getAttribute('data-' + prefix)] = i.checked; });
    return out;
  }
  function request() {
    var u = unitCount();
    return {
      who: { audience: radio('audience'), grades: grades(), students: Number($('students').value) || null, startDate: $('start').value || null },
      subjects: pickedSubjects().map(function (id) {
        var s = subj[id];
        return { id: id, label: subjectLabel(id), source: s.source || null, standardsName: s.name.trim() || null,
          units: Number(s.units) > 0 ? Math.round(Number(s.units)) : null, files: [] };
      }),
      calendarWeeks: Number($('weeks').value) || null,
      world: { theme: radio('theme') || 'pet-town', themeIdea: radio('theme') === 'own' ? $('theme-own').value.trim() : null,
        keepPets: $('keep-pets').checked, mascot: $('mascot').value.trim() || null,
        buildings: { perUnit: 1, auto: true, unitsSoFar: u.known, subjectsToSuggest: u.blank },
        studentLoves: $('loves').value.trim() || null },
      unitFeatures: checked('feature'),
      grownUpControls: checked('control'),
      notes: $('notes').value.trim() || null
    };
  }

  function summaryHTML() {
    var r = request(), off = function (o, list) { return list.filter(function (f) { return o[f[0]]; }).map(function (f) { return f[1]; }); };
    var feats = off(r.unitFeatures, FEATURES), ctrls = off(r.grownUpControls, CONTROLS);
    var row = function (k, v) { return '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; };
    var dash = '<span class="muted">not given</span>';
    return '<dl class="order">' +
      row('For', r.who.audience ? esc(AUDIENCES[r.who.audience]) : dash) +
      row('Grades', r.who.grades.length ? esc(r.who.grades.map(gradeLabel).join(', ')) : dash) +
      row('Students', r.who.students ? esc(r.who.students) : dash) +
      row('Start', r.who.startDate ? esc(r.who.startDate) : dash) +
      row('Subjects', r.subjects.length ? '<ul>' + r.subjects.map(function (s) {
        var src = s.source === 'upload' ? (subj[s.id].files.length + ' file' + (subj[s.id].files.length === 1 ? '' : 's') + (s.standardsName ? ', ' + esc(s.standardsName) : ''))
          : s.source === 'standardOrder' ? 'your standard order' : '<span class="muted">standards not chosen yet</span>';
        return '<li><b>' + esc(s.label) + '</b>: ' + src + ', ' + (s.units ? s.units + ' unit' + (s.units === 1 ? '' : 's') : 'units suggested by us') + '</li>';
      }).join('') + '</ul>' : dash) +
      row('Calendar', r.calendarWeeks ? esc(r.calendarWeeks) + ' weeks' : dash) +
      row('World', esc(r.world.theme === 'own' ? (r.world.themeIdea || 'their own idea') : THEMES[r.world.theme]) + (r.world.keepPets ? ', with pets' : ', no pets') +
        (r.world.mascot ? ', mascot ' + esc(r.world.mascot) : '')) +
      row('Loves', r.world.studentLoves ? esc(r.world.studentLoves) : dash) +
      row('Each unit', feats.length ? esc(feats.join(', ')) : '<span class="muted">nothing picked</span>') +
      row('Grown-up', ctrls.length ? esc(ctrls.join(', ')) : '<span class="muted">none</span>') +
      '</dl>';
  }

  function validate() {
    var p = [], s1 = [], s2 = [];
    if (!radio('audience')) s1.push('who it’s for');
    if (!grades().length) s1.push('a grade');
    if (s1.length) p.push({ step: 0, text: s1.join(' and ') + ' (step 1)' });
    var ids = pickedSubjects();
    if (!ids.length) s2.push('at least one subject');
    ids.forEach(function (id) {
      var s = subj[id];
      if (!s.source) s2.push('standards or our standard order for ' + subjectLabel(id));
      else if (s.source === 'upload' && !s.files.length) s2.push('your standards file for ' + subjectLabel(id));
    });
    if (subj.other && !$('subj-other').value.trim()) s2.push('which other subject');
    if (s2.length) p.push({ step: 1, text: s2.join(', ') + ' (step 2)' });
    return p;
  }

  // ---------- send ----------
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function randId() {
    var a = new Uint8Array(3);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (var i = 0; i < 3; i++) a[i] = Math.random() * 256;
    return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function safeName(n) { return String(n).replace(/[\/\\:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '_') || 'file'; }
  function readBytes(f) {
    if (f.arrayBuffer) return f.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(new Uint8Array(r.result)); }; r.onerror = function () { bad(r.error); }; r.readAsArrayBuffer(f); });
  }

  $('world').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('err-send'); err.textContent = '';
    var problems = validate();
    if (problems.length) {
      err.textContent = 'Almost there. Please add ' + problems.map(function (x) { return x.text; }).join(', and ') + '.';
      return;
    }
    var btn = $('send'); btn.disabled = true; btn.textContent = 'Making your request file…';
    var date = today(), rid = randId(), r = request(), entries = [];
    r.subjects.forEach(function (s) {
      if (s.source !== 'upload') return;
      var used = {};
      subj[s.id].files.forEach(function (f) {
        var n = safeName(f.name), base = n, ext = '', k = 2, dot = n.lastIndexOf('.');
        if (dot > 0) { base = n.slice(0, dot); ext = n.slice(dot); }
        while (used[n.toLowerCase()]) n = base + ' (' + (k++) + ')' + ext;
        used[n.toLowerCase()] = true;
        var path = 'standards/' + s.id + '/' + n;
        s.files.push(path); entries.push({ f: f, name: path });
      });
    });
    var json = {
      format: 1,
      kind: 'world-request',
      id: 'wr-' + date + '-' + rid,
      createdAt: new Date().toISOString(),
      request: r,
      contact: { name: $('who').value.trim(), email: $('reply').value.trim() },
      quote: 'Quote-based: no price on the form. The owner sends a unit map, a quote and a timeline first (docs/WORLD-REQUESTS.md).',
      promise: 'Built by the agent team unit by unit; the family or teacher approves each unit before a student sees it.',
      notices: { rights: 'Only upload material you have the right to use.', sentToAI: 'What you upload is sent to AI to plan and build your world.',
        aiNotice: brand.aiNotice || '', deleteNotice: brand.deleteNotice || '' }
    };
    Promise.all(entries.map(function (x) { return readBytes(x.f).then(function (b) { return { name: x.name, data: b }; }); }))
      .then(function (files) {
        files.unshift({ name: 'world-request.json', data: JSON.stringify(json, null, 2) + '\n' });
        var bytes = PPZip.makeZip(files);
        var name = 'world-request-' + date + '-' + rid + '.zip';
        if (lastZip) URL.revokeObjectURL(lastZip.url);
        lastZip = { name: name, url: URL.createObjectURL(new Blob([bytes], { type: 'application/zip' })), size: bytes.length };
        download(); showDone();
      })
      .catch(function (ex) { err.textContent = 'Sorry, we could not make the request file (' + (ex && ex.message || ex) + '). Try removing very large files and press Send again.'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Send'; });
  });
  function download() {
    var a = document.createElement('a'); a.href = lastZip.url; a.download = lastZip.name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function showDone() {
    $('zip-name').textContent = lastZip.name; $('zip-size').textContent = fmtBytes(lastZip.size);
    var mail = brand.orderEmail || '';
    $('order-email').innerHTML = brand.orderEmailIsPlaceholder ? esc(mail)
      : '<a href="mailto:' + esc(mail) + '?subject=' + encodeURIComponent('World request ' + lastZip.name) + '">' + esc(mail) + '</a>';
    $('ph-tag').hidden = !brand.orderEmailIsPlaceholder;
    $('world').hidden = true; $('done').hidden = false; $('done').focus(); $('done').scrollIntoView({ block: 'start' });
  }
  $('zip-again').addEventListener('click', function (e) { e.preventDefault(); if (lastZip) download(); });
  $('new-request').addEventListener('click', function () { if (confirm('Start a new request? This clears the files and choices on this page.')) location.reload(); });

  // ---------- phones: one step per screen (same as the order page) ----------
  var STEP_NAMES = ['Who', 'Subject', 'World', 'Units', 'Controls', 'Send'];
  var steps = Array.prototype.slice.call(document.querySelectorAll('#world > .step'));
  var current = 0;
  var dots = document.createElement('ol');
  dots.className = 'wizard-dots'; dots.setAttribute('aria-label', 'Request steps');
  dots.innerHTML = steps.map(function (s, i) {
    return '<li style="display:contents"><button type="button" data-go="' + i + '"><span class="dot" aria-hidden="true"></span><span>' + (i + 1) + '. ' + STEP_NAMES[i] + '</span></button></li>';
  }).join('');
  $('world').insertBefore(dots, steps[0]);
  var wnav = document.createElement('div');
  wnav.className = 'wizard-nav';
  wnav.innerHTML = '<button type="button" class="btn" data-back>Back</button><button type="button" class="btn primary" data-next>Next</button>';
  $('world').appendChild(wnav);
  function showStep(i, focus) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach(function (s, k) { s.classList.toggle('current', k === current); });
    dots.querySelectorAll('button').forEach(function (b, k) {
      if (k === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', k < current);
    });
    wnav.querySelector('[data-back]').disabled = current === 0;
    wnav.querySelector('[data-next]').hidden = current === steps.length - 1;
    if (current === steps.length - 1) $('summary').innerHTML = summaryHTML();
    if (focus && document.body.classList.contains('wizard')) {
      window.scrollTo(0, 0);
      var h = steps[current].querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }
  dots.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) showStep(Number(b.getAttribute('data-go')), true); });
  wnav.addEventListener('click', function (e) {
    if (e.target.closest('[data-back]')) showStep(current - 1, true);
    if (e.target.closest('[data-next]')) showStep(current + 1, true);
  });
  // On the long (desktop) page the summary keeps itself up to date.
  $('world').addEventListener('input', function () { if (!document.body.classList.contains('wizard')) $('summary').innerHTML = summaryHTML(); });
  $('world').addEventListener('change', function () { if (!document.body.classList.contains('wizard')) $('summary').innerHTML = summaryHTML(); });
  var phoneQuery = window.matchMedia ? matchMedia('(max-width: 640px)') : null;
  function applyLayout() { document.body.classList.toggle('wizard', !!(phoneQuery && phoneQuery.matches)); }
  if (phoneQuery) (phoneQuery.addEventListener ? phoneQuery.addEventListener('change', applyLayout) : phoneQuery.addListener(applyLayout));
  applyLayout(); showStep(0, false);

  // ---------- start ----------
  $('limit-text').textContent = fmtBytes(LIMIT);
  Promise.all([PP.loadBrand(), PP.getJSON('../menu.json')]).then(function (r) {
    brand = r[0]; menu = r[1];
    fillGrades(); fillSubjects(); renderSubjects(); $('summary').innerHTML = summaryHTML();
  }).catch(function (ex) {
    $('load-error').textContent = 'The page could not load (' + ex.message + '). Open it with npm run serve, not straight from the folder.';
  });
})();

// The live example world (brand.config.json exampleWorld): fill names and links from the config when it loads.
(async () => {
  try {
    const cfg = await (await fetch('../brand.config.json', { cache: 'no-cache' })).json();
    const ex = cfg && cfg.exampleWorld;
    if (!ex) return;
    document.querySelectorAll('[data-ex]').forEach((el) => {
      const v = ex[el.getAttribute('data-ex')];
      if (!v) return;
      if (el.tagName === 'A') el.href = v; else el.textContent = v;
    });
  } catch (e) { /* offline: the built-in links stay */ }
})();
