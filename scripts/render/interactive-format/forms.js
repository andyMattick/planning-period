/* The interactive format's answer forms (docs/KINDS-INTERACTIVE-FORMAT.md): ported from the unmerged lesson engine on
   the istd-build branch (scripts/render/lesson/forms.js there, Nov 2026), trimmed to the answer forms; its seeded
   choice order and expression reader are not used here (the page keeps the pack's choice order so the letters match
   the teacher copy). Runs after scripts/render/apps/engine.js (window.PPA) in every interactive page, and in Node (vm)
   at build time, so the build and the page read answers exactly the same way.

   Q4 (equivalent forms): numbers are exact reduced fractions (0.125 = .125 = 1/8 = 12.5% = "one eighth"), a percent is
   also read as its plain number, a question may accept rounded values (`round`) or a tolerance (`tol`), and words ignore
   case, plurals, a leading a/an/the, and symbol-or-word spellings (÷ / divided by, % / percent, g/cm³ / grams per cubic
   centimeter). */
(function () {
  'use strict';
  var P = window.PPA;

  /* ---------- words: symbols, units, plurals ---------- */
  var SYM = [[/÷/g, ' divided by '], [/[×✕]/g, ' times '], [/\*/g, ' times '], [/≤|<=/g, ' less than or equal to '], [/≥|>=/g, ' greater than or equal to '],
    [/≠|!=/g, ' not equal to '], [/</g, ' less than '], [/>/g, ' greater than '], [/=/g, ' equals '], [/\+/g, ' plus '], [/&/g, ' and '],
    [/%/g, ' percent '], [/°/g, ' degree '], [/²|\^\s*2\b/g, ' squared '], [/³|\^\s*3\b/g, ' cubed '], [/\//g, ' per ']];
  var UNITS = { g: 'gram', gm: 'gram', gr: 'gram', kg: 'kilogram', mg: 'milligram', cm: 'centimeter', mm: 'millimeter', m: 'meter', km: 'kilometer',
    ml: 'milliliter', l: 'liter', cc: 'cubic centimeter', s: 'second', sec: 'second', min: 'minute', h: 'hour', hr: 'hour', hrs: 'hour', in: 'inch', ft: 'foot', feet: 'foot',
    yd: 'yard', mi: 'mile', lb: 'pound', lbs: 'pound', oz: 'ounce', metre: 'meter', metres: 'meter', litre: 'liter', litres: 'liter', centimetre: 'centimeter', millilitre: 'milliliter',
    pct: 'percent', '%': 'percent', vs: 'versus', w: 'with' };
  var RISKY = { in: 1, s: 1, h: 1, l: 1, m: 1, min: 1, w: 1, vs: 1 };      // ordinary words or letters unless the answer looks like units
  var NO_PLURAL = { gas: 1, mass: 1, glass: 1, less: 1, bus: 1, plus: 1, minus: 1, focus: 1, this: 1, is: 1, was: 1, has: 1, does: 1, always: 1, analysis: 1, basis: 1, axis: 1, thesis: 1, process: 1, success: 1, class: 1, cross: 1, loss: 1, across: 1, us: 1, yes: 1, its: 1, hers: 1, his: 1, sometimes: 1, perhaps: 1, series: 1, species: 1, news: 1, physics: 1, statistics: 1, mathematics: 1, census: 1, versus: 1, previous: 1, various: 1, famous: 1, nervous: 1, delicious: 1, obvious: 1, continuous: 1 };
  function singular(w) {
    if (w.length <= 3 || NO_PLURAL[w] || /(ss|us|is)$/.test(w)) return w;
    if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
    if (/(ches|shes|xes|zes|sses|oes)$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function textForm(raw) {
    var s = String(raw == null ? '' : raw).toLowerCase().replace(/[−‐‑‒–—﹣]/g, '-').replace(/[‘’`]/g, "'").replace(/[“”]/g, '"');
    s = s.replace(/([a-z])(2|3)\b/g, function (m, a, n) { return a + (n === '3' ? '³' : '²'); });        // cm3, m2
    var unity = /\d|\/|³|²|\bper\b/.test(s);
    SYM.forEach(function (p) { s = s.replace(p[0], p[1]); });
    var t = s.replace(/'s\b/g, '').replace(/[^a-z0-9.\s-]/g, ' ').replace(/(^|\s)[.-]+|[.-]+(?=\s|$)/g, ' ').trim().split(/\s+/).filter(Boolean);
    t = t.map(function (w) { var u = UNITS[w]; return u && (!RISKY[w] || unity) ? u : w; }).join(' ').split(' ');
    for (var i = 0; i < t.length; i++) {                                          // "centimeter cubed" -> "cubic centimeter"
      if ((t[i] === 'cubed' || t[i] === 'squared') && i > 0) { var w = t[i - 1]; t[i - 1] = t[i] === 'cubed' ? 'cubic' : 'square'; t[i] = w; }
    }
    t = t.map(singular);
    while (t.length && /^(a|an|the)$/.test(t[0])) t.shift();
    return t.length ? 't:' + t.join('') : '';
  }

  /* ---------- numbers: exact values, percents, rounding ---------- */
  function hasPercent(raw) { return /%|\bper\s*cent\b|\bpercent\b|\bpct\b/i.test(String(raw)); }
  function numOf(raw) {
    var s = String(raw == null ? '' : raw).replace(/%/g, ' ').replace(/\bper\s*cent\b|\bpercent\b|\bpct\b/gi, ' ');
    return P.parseNum(s);
  }
  function canon(f) { return P.numCanon(f); }
  function fr(n, d) { var a = Math.abs(n), b = Math.abs(d); while (b) { var x = a % b; a = b; b = x; } a = a || 1; if (d < 0) { n = -n; d = -d; } return [n / a, d / a]; }
  /* every number a typed answer could mean: as typed, and a percent as its fraction (12.5% -> 1/8) */
  function numForms(raw) {
    var f = numOf(raw);
    if (!f) return [];
    var out = [];
    if (hasPercent(raw)) out.push(canon(fr(f[0], f[1] * 100)));
    out.push(canon(f));
    return out;
  }
  function terminating(d) { while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }
  function roundForms(f, item) {
    var out = [], places = item && item.round !== undefined ? item.round : (terminating(f[1]) ? [] : [2, 3]);
    if (places === false || places === null) places = [];
    [].concat(places).forEach(function (p) {
      var k = Math.round(f[0] * Math.pow(10, p) / f[1]);
      out.push(canon(fr(k, Math.pow(10, p))));
    });
    var tol = item && item.tol;
    if (tol && tol.places >= 0 && tol.within > 0) {
      var sc = Math.pow(10, tol.places), v = f[0] / f[1], lo = Math.ceil((v - tol.within) * sc - 1e-9), hi = Math.floor((v + tol.within) * sc + 1e-9);
      for (var k = lo; k <= hi && k - lo < 2000; k++) out.push(canon(fr(k, sc)));
    }
    return out;
  }
  /* the forms a key is stored under (each one is hashed) */
  function keyForms(form, type, item) {
    if (type === 'mc') return ['opt:' + Number(form)];
    if (type === 'tf') return ['tf:' + (/^(t|true|yes|1)$/i.test(String(form).trim()) || form === true ? 'true' : 'false')];
    var out = [], f = numOf(form);
    if (f) {
      if (hasPercent(form)) { var g = fr(f[0], f[1] * 100); out.push(canon(g)); roundForms(g, item).forEach(function (c) { out.push(c); }); }
      out.push(canon(f)); roundForms(f, item).forEach(function (c) { out.push(c); });
    } else if (type !== 'numeric') { var t = textForm(form); if (t) out.push(t); }
    return out.filter(function (c, i) { return out.indexOf(c) === i; });
  }
  /* the forms a typed answer is tried under, in order */
  function typedForms(raw, type) {
    if (!String(raw == null ? '' : raw).trim()) return [];
    var out = numForms(raw);
    if (type !== 'numeric') { var t = textForm(raw); if (t) out.push(t); }
    return out.filter(function (c, i) { return out.indexOf(c) === i; });
  }

  /* ---------- judging against hashes ---------- */
  function accFind(entry, h) { for (var i = 0; i < (entry.acc || []).length; i++) if (entry.acc[i].h === h) return entry.acc[i]; return null; }
  /* {res: 'ok'|'sign'|'miss'|'no'|'unread', canon, msg, ex} for one hashed entry (an item, a blank, a widget) */
  function judgeForms(id, entry, forms) {
    if (!forms.length) return Promise.resolve({ res: 'unread' });
    return Promise.all(forms.map(function (c) { return P.hashOf(id, c); })).then(function (hs) {
      var i, a;
      for (i = 0; i < hs.length; i++) { a = accFind(entry, hs[i]); if (a) return { res: 'ok', canon: forms[i], x: a.x }; }
      for (i = 0; i < hs.length; i++) if (entry.miss && entry.miss[hs[i]]) return { res: 'miss', msg: entry.miss[hs[i]] };
      var f = forms[0].indexOf('n:') === 0 ? forms[0].slice(2).split('/').map(Number) : null;
      if (!f || f[0] === 0) return { res: 'no' };
      return P.hashOf(id, canon([-f[0], f[1]])).then(function (hn) { return { res: accFind(entry, hn) ? 'sign' : 'no' }; });
    }).then(function (r) {
      if (r.res === 'ok' && r.x) return P.unlock(id, r.canon, r.x).then(function (o) { r.ex = o || {}; return r; });
      return r;
    });
  }
  function judgeTyped(id, entry, raw, type) { return judgeForms(id, entry, typedForms(raw, type)); }
  /* a line of guided notes with k blanks: each blank marked against its own hashes, and the line right only when the
     whole combination is an accepted one (so "either order" keys stay paired). {res: 'ok'|'no', marks: [bool], own: each blank by its own hashes, ex} */
  function judgeFill(id, entry, raws, type) {
    var t = type === 'numeric' ? 'numeric' : 'short', k = entry.k || 1, per = [], i;
    for (i = 0; i < k; i++) per.push(typedForms((raws || [])[i], t));
    var marks = Promise.all(per.map(function (fs, j) {
      return Promise.all(fs.map(function (c) { return P.hashOf(id + '.' + j, c); })).then(function (hs) {
        for (var x = 0; x < hs.length; x++) if ((entry.blanks[j] || []).indexOf(hs[x]) >= 0) return true;
        return false;
      });
    }));
    var combos = [[]];
    per.forEach(function (fs) { var next = []; combos.forEach(function (cmb) { fs.forEach(function (c) { if (next.length < 256) next.push(cmb.concat([c])); }); }); combos = next; });
    return marks.then(function (ms) {
      if (!combos.length) return { res: 'no', marks: ms };
      return Promise.all(combos.map(function (cmb) { return P.hashOf(id, 'fill:' + cmb.join('|')); })).then(function (hs) {
        for (var x = 0; x < hs.length; x++) {
          var a = accFind(entry, hs[x]);
          if (a) { var canon = 'fill:' + combos[x].join('|'); return P.unlock(id, canon, a.x).then(function (o) { return { res: 'ok', marks: ms.map(function () { return true; }), own: ms, ex: o || {} }; }); }
        }
        return { res: 'no', marks: ms, mixed: ms.length > 1 && ms.every(Boolean) };
      });
    });
  }

  window.PPI_FORMS = {
    textForm: textForm, numForms: numForms, keyForms: keyForms, typedForms: typedForms, judgeForms: judgeForms, judgeTyped: judgeTyped, judgeFill: judgeFill,
  };
})();
