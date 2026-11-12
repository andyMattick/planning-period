// What the teacher asks for, measured against how much material she sent (feasibility.json).
// - SPECS: the structured fields per menu item (number and types of questions, pages, days ...).
// - estimate(file): about how many pages of source a picked file is, read on the device:
//     text (txt/md/csv/html): words ÷ wordsPerPage; PDF: page objects; DOCX/PPTX: unzip and count words (and slides);
//     anything else: unknown, so the page asks the teacher.
// - asked(...), range(...): the questions she asked for, and what the source supports (low–high).
// Nothing here blocks Send; the page shows a warning and records the teacher's choice.
(function (root) {
  'use strict';

  var Q_FIELDS = [
    { key: 'questions', label: 'Number of questions', type: 'number' },
    { key: 'types', label: 'Mix of types', type: 'types' },
    { key: 'choices', label: 'Choices per multiple-choice question', type: 'number' }
  ];
  var VERSIONS = { key: 'versions', label: 'Versions (A, B, C)', type: 'number', min: 1, max: 3 };
  // Quiz and test (owner, Nov 8, 2026): versions are one setting: a number of versions (1 to 10, A, B, C…), or one per
  // student (interactive pages only: each student's name picks her own numbers), with how many students.
  var VERSION_PICK = { key: 'versions', label: 'Versions', type: 'select', options: [['', 'Choose'], ['1', '1 version'], ['2', '2 versions (A, B)'],
    ['3', '3 versions (A, B, C)'], ['4', '4 versions'], ['5', '5 versions'], ['6', '6 versions'], ['7', '7 versions'], ['8', '8 versions'], ['9', '9 versions'],
    ['10', '10 versions'], ['student', 'One per student (interactive)']], min: 1, max: 10 };
  var STUDENTS = { key: 'students', label: 'How many students', type: 'number', min: 2, max: 150, onlyFor: { versions: 'student' } };
  var SPECS = {
    worksheet: Q_FIELDS, homework: Q_FIELDS, bellringer: Q_FIELDS, reviewgame: Q_FIELDS,
    quiz: Q_FIELDS.concat([VERSION_PICK, STUDENTS]), test: Q_FIELDS.concat([VERSION_PICK, STUDENTS]),
    readingquiz: [Q_FIELDS[0], { key: 'passages', label: 'Passages', type: 'number' }, VERSIONS],
    versions: [
      { key: 'file', label: 'Which uploaded file is the test?', type: 'file' },
      { key: 'versions', label: 'How many versions', type: 'number', min: 2, max: 3 }
    ],
    studyguide: [{ key: 'pages', label: 'Pages', type: 'number' }],
    notes: [{ key: 'pages', label: 'Pages', type: 'number' }],
    slides: [{ key: 'slides', label: 'Number of slides', type: 'number' }],
    project: [
      { key: 'days', label: 'How long (school days)', type: 'number' },
      { key: 'grouping', label: 'Alone or in groups', type: 'select', options: [['', 'Choose'], ['alone', 'Alone'], ['groups', 'In groups'], ['either', 'Either']] },
      { key: 'turnIn', label: 'What students turn in', type: 'text' }
    ],
    lab: [
      { key: 'inquiry', label: 'How much students design', type: 'select', options: [['', 'Choose'], ['structured', 'Structured: we give the steps'], ['guided', 'Guided: they plan part of it'], ['open', 'Open: they pick the question too']] },
      { key: 'minutes', label: 'Class period (minutes)', type: 'number' },
      { key: 'days', label: 'Days', type: 'number' },
      { key: 'groupSize', label: 'Students per group', type: 'number' },
      { key: 'classSize', label: 'Students in the class', type: 'number' }
    ],
    unitfull: [
      { key: 'days', label: 'Days', type: 'number' }, { key: 'lessons', label: 'Lessons', type: 'number' },
      { key: 'quizzes', label: 'Quizzes', type: 'number' }, { key: 'tests', label: 'Tests', type: 'number' },
      { key: 'bellringers', label: 'Bell ringers', type: 'number' }
    ]
  };
  var TYPE_NAMES = { mc: 'multiple choice', short: 'short answer', open: 'written response' };
  var TYPE_KEYS = ['mc', 'short', 'open'];
  // Items whose questions are written from the source (versions copies the teacher's own test; unitfull works from standards).
  var COUNTS_QUESTIONS = { worksheet: 1, homework: 1, bellringer: 1, quiz: 1, test: 1, reviewgame: 1, studyguide: 1 };

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  // The default, in words, for the "If you leave this blank" line.
  function defaultText(id, d) {
    if (!d) return '';
    var parts = [];
    if (d.questions != null && SPECS[id] && SPECS[id][0].key === 'questions') {
      var t = d.types ? TYPE_KEYS.filter(function (k) { return d.types[k]; }).map(function (k) { return d.types[k] + ' ' + TYPE_NAMES[k]; }) : [];
      parts.push(plural(d.questions, 'question') + (t.length ? ' (' + t.join(', ') + ')' : ''));
      if (d.passages) parts.push('on ' + plural(d.passages, 'passage'));
      if (d.choices && (!d.types || d.types.mc)) parts.push(d.choices + ' choices each');
      if (d.versions) parts.push(d.versions === 'student' ? 'one version per student' : plural(d.versions, 'version'));
    } else if (id === 'versions') {
      parts.push(plural(d.versions, 'version') + ', with the same number and types of questions as your test');
    } else if (id === 'studyguide') {
      parts.push(plural(d.pages, 'page') + (d.questions ? ' with ' + d.questions + ' practice questions' : ''));
    } else if (d.pages) parts.push(plural(d.pages, 'page'));
    else if (d.slides) parts.push(plural(d.slides, 'slide'));
    else if (id === 'project') {
      parts.push(plural(d.days, 'school day'));
      parts.push(d.grouping === 'either' ? 'alone or in groups' : d.grouping);
      if (d.turnIn) parts.push('students turn in ' + d.turnIn);
    } else if (id === 'lab') {
      parts.push('a ' + d.inquiry + ' lab', (d.days === 1 ? 'one ' : d.days + ' ') + d.minutes + '-minute period' + (d.days === 1 ? '' : 's'), 'groups of ' + d.groupSize + ' in a class of ' + d.classSize);
    } else if (id === 'unitfull') {
      parts.push(plural(d.days, 'day'), plural(d.lessons, 'lesson'), plural(d.quizzes, 'quiz', 'quizzes'),
        plural(d.tests, 'test'), plural(d.bellringers, 'bell ringer'));
    }
    return parts.join(', ');
  }

  function num(v) { var n = Number(v); return v === '' || v == null || !isFinite(n) ? null : n; }

  // Questions one item asks for: the typed number, else the sum of typed types, else the default.
  function questionsFor(id, spec, d) {
    if (!COUNTS_QUESTIONS[id]) return 0;
    spec = spec || {}; d = d || {};
    var q = num(spec.questions);
    if (q != null) return q;
    var types = spec.types || {}, sum = 0, any = false;
    TYPE_KEYS.forEach(function (k) { var n = num(types[k]); if (n != null) { sum += n; any = true; } });
    if (any) return sum;
    return d.questions || 0;
  }

  // Warnings for one item: a value outside feasibility.limits, or a mix that doesn't add up.
  function limitNotes(id, spec, limits) {
    var notes = [], lim = limits || {};
    (SPECS[id] || []).forEach(function (f) {
      var range = lim[f.key] || (f.min != null ? [f.min, f.max] : null);
      var n = num(spec && spec[f.key]);
      if (range && n != null && (n < range[0] || n > range[1])) {
        notes.push(f.label + ': ' + n + ' is outside what we usually make (' + range[0] + '–' + range[1] + '). We can talk about it in the follow-up.');
      }
    });
    if (spec && spec.types) {
      var sum = 0, any = false;
      TYPE_KEYS.forEach(function (k) { var n = num(spec.types[k]); if (n != null) { sum += n; any = true; } });
      var q = num(spec.questions);
      if (any && q != null && sum !== q) notes.push('The mix adds up to ' + sum + ', but you asked for ' + q + ' questions.');
    }
    return notes;
  }

  // ---------- reading the source on the device ----------
  var TEXT_EXT = /\.(txt|md|markdown|csv|tsv|html?|json|xml)$/i;
  function words(text) { var m = String(text).match(/[A-Za-z0-9À-ɏͰ-ϿЀ-ӿ]+(?:['’][A-Za-z]+)?/g); return m ? m.length : 0; }
  // A saved web page (File → Save page as), read as text only: its scripts never run (it is never opened as a page).
  // Scripts, styles, comments, templates, inline SVG and the <head> are dropped, then every tag; entities become spaces.
  function htmlText(t) {
    return String(t)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|template|svg|head|iframe|object)\b[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(nbsp|#160|#xa0);/gi, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  }
  function bytesOf(file) { return file.arrayBuffer ? file.arrayBuffer().then(function (b) { return new Uint8Array(b); }) : Promise.reject(new Error('no reader')); }

  function pdfPages(bytes) {
    var s = new TextDecoder('latin1').decode(bytes);
    var m = s.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
    if (m && m.length) return m.length;
    var max = 0, re = /\/Type\s*\/Pages[\s\S]{0,200}?\/Count\s+(\d+)|\/Count\s+(\d+)[\s\S]{0,200}?\/Type\s*\/Pages/g, r;
    while ((r = re.exec(s))) max = Math.max(max, Number(r[1] || r[2]));
    return max || null;
  }

  // A small reader for the zip inside .docx / .pptx: the central directory, then each entry's data.
  function zipEntries(bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), eocd = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return [];
    var n = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true), out = [];
    var dec = new TextDecoder();
    for (var k = 0; k < n && p + 46 <= bytes.length; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
      var nameLen = dv.getUint16(p + 28, true), extra = dv.getUint16(p + 30, true), comment = dv.getUint16(p + 32, true);
      var local = dv.getUint32(p + 42, true);
      var name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      out.push({ name: name, method: method, size: size, local: local });
      p += 46 + nameLen + extra + comment;
    }
    return out;
  }
  function zipRead(bytes, e) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var start = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
    var data = bytes.subarray(start, start + e.size);
    if (e.method === 0) return Promise.resolve(new TextDecoder().decode(data));
    if (e.method !== 8 || typeof DecompressionStream === 'undefined') return Promise.reject(new Error('cannot unzip here'));
    var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }
  function xmlWords(xml, para) {
    return words(xml.replace(new RegExp('</' + para + '>', 'g'), ' ').replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' '));
  }

  function estimate(file, wordsPerPage) {
    var wpp = wordsPerPage || 300, name = file.name || '';
    var result = function (pages, method, detail) { return { name: name, pages: pages, method: method, detail: detail || '' }; };
    if (TEXT_EXT.test(name) || /^text\//.test(file.type || '')) {
      return file.text().then(function (t) {
        var html = /\.html?$/i.test(name) || /^text\/html/.test(file.type || '');
        if (html) t = htmlText(t);
        var w = words(t); return result(w / wpp, html ? 'html-words' : 'text-words', plural(w, 'word') + (html ? ' of web page text' : ''));
      });
    }
    if (/\.pdf$/i.test(name) || file.type === 'application/pdf') {
      return bytesOf(file).then(function (b) { var n = pdfPages(b); return n ? result(n, 'pdf-pages', plural(n, 'page')) : result(null, 'unknown', 'PDF'); });
    }
    if (/\.(docx|pptx)$/i.test(name)) {
      var isDoc = /\.docx$/i.test(name);
      return bytesOf(file).then(function (b) {
        var entries = zipEntries(b);
        var parts = entries.filter(function (e) { return isDoc ? e.name === 'word/document.xml' : /^ppt\/slides\/slide\d+\.xml$/.test(e.name); });
        if (!parts.length) return result(null, 'unknown', '');
        return Promise.all(parts.map(function (e) { return zipRead(b, e); })).then(function (xmls) {
          var w = xmls.reduce(function (s, x) { return s + xmlWords(x, isDoc ? 'w:p' : 'a:p'); }, 0);
          return isDoc ? result(w / wpp, 'docx-words', plural(w, 'word'))
            : result(w / wpp, 'pptx-words', plural(parts.length, 'slide') + ', ' + plural(w, 'word'));
        });
      }).catch(function () { return result(null, 'unknown', ''); });
    }
    return Promise.resolve(result(null, 'unknown', ''));
  }

  function fill(template, values) {
    return String(template || '').replace(/\{(\w+)\}/g, function (m, k) { return values[k] != null ? values[k] : m; });
  }

  root.PPFeas = {
    SPECS: SPECS, TYPE_KEYS: TYPE_KEYS, TYPE_NAMES: TYPE_NAMES, COUNTS_QUESTIONS: COUNTS_QUESTIONS,
    defaultText: defaultText, questionsFor: questionsFor, limitNotes: limitNotes, estimate: estimate, fill: fill,
    _test: { pdfPages: pdfPages, zipEntries: zipEntries, words: words, htmlText: htmlText }
  };
})(typeof window !== 'undefined' ? window : globalThis);
