/* Interactive lessons: the answer forms, the seeded answer order and the small expression reader (docs/KINDS-LESSONS.md).
   Runs after scripts/render/apps/engine.js (window.PPA) in every lesson page, and in Node (vm) at build time, so the
   build and the page read answers, and order the choices, exactly the same way.

   Q4 (equivalent forms): numbers are exact reduced fractions (0.125 = .125 = 1/8 = 12.5% = "one eighth"), a percent is
   also read as its plain number, an item may accept rounded values (`round`) or a tolerance (`tol`), and words ignore
   case, plurals, a leading a/an/the, and symbol-or-word spellings (÷ / divided by, % / percent, g/cm³ / grams per cubic
   centimeter). Q2: the choice order comes from one seeded stream per lesson (the build picks the seed). */
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

  /* ---------- Q2: one seeded stream orders every choice item, in page order ---------- */
  function choiceItems(data) {
    var out = [];
    (data.pages || []).forEach(function (pg) { (pg.items || []).forEach(function (it) { if (it.type === 'mc') out.push(it); }); });
    return out;
  }
  /* {itemId: [original index shown in slot 0, slot 1, …]} */
  function orders(data, seed) {
    var r = P.rng(seed == null ? data.seed : seed), out = {};
    choiceItems(data).forEach(function (it) {
      var idx = []; for (var i = 0; i < it.choices.length; i++) idx.push(i);
      out[it.id] = P.shuffle(idx, r);
    });
    return out;
  }

  /* ---------- a small, safe expression reader (no eval: the page's CSP forbids it) ---------- */
  function rand() { return Math.random(); }
  var FN = {
    round: function (x, p) { var k = Math.pow(10, p || 0); return Math.round(x * k) / k; },
    min: Math.min, max: Math.max, abs: Math.abs, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil,
    rand: function () { return rand(); },
    randint: function (a, b) { return a + Math.floor(rand() * (b - a + 1)); },
    uniform: function (a, b) { return a + rand() * (b - a); },
    binom: function (n, p) { var c = 0; for (var i = 0; i < n; i++) if (rand() < p) c++; return c; },
  };
  function evalExpr(src, vars) {
    var toks = String(src).match(/\d*\.?\d+(?:e[-+]?\d+)?|[a-zA-Z_][a-zA-Z_0-9]*|<=|>=|==|!=|&&|\|\||[-+*/^(),<>!]/g) || [], i = 0;
    function peek() { return toks[i]; }
    function next() { return toks[i++]; }
    function prim() {
      var t = next();
      if (t === '(') { var v = or(); if (next() !== ')') throw new Error('missing )'); return v; }
      if (t === '-') return -pow();
      if (t === '+') return pow();
      if (t === '!') return pow() ? 0 : 1;
      if (/^[\d.]/.test(t)) return parseFloat(t);
      if (/^[a-zA-Z_]/.test(t)) {
        if (peek() === '(') {
          next(); var args = [];
          if (peek() !== ')') { args.push(or()); while (peek() === ',') { next(); args.push(or()); } }
          if (next() !== ')') throw new Error('missing )');
          if (!FN.hasOwnProperty(t)) throw new Error('unknown function ' + t);
          return FN[t].apply(null, args);
        }
        if (t === 'pi') return Math.PI;
        if (vars && Object.prototype.hasOwnProperty.call(vars, t)) return Number(vars[t]);
        throw new Error('unknown name ' + t);
      }
      throw new Error('cannot read ' + t);
    }
    function pow() { var b = prim(); if (peek() === '^') { next(); return Math.pow(b, pow()); } return b; }
    function mul() { var v = pow(); while (peek() === '*' || peek() === '/') { var o = next(), w = pow(); v = o === '*' ? v * w : v / w; } return v; }
    function add() { var v = mul(); while (peek() === '+' || peek() === '-') { var o = next(), w = mul(); v = o === '+' ? v + w : v - w; } return v; }
    function cmp() {
      var v = add();
      while (/^(<|>|<=|>=|==|!=)$/.test(peek() || '')) {
        var o = next(), w = add(), e = 1e-9;
        v = o === '<' ? v < w - e : o === '>' ? v > w + e : o === '<=' ? v <= w + e : o === '>=' ? v >= w - e : o === '==' ? Math.abs(v - w) <= e : Math.abs(v - w) > e;
        v = v ? 1 : 0;
      }
      return v;
    }
    function and() { var v = cmp(); while (peek() === '&&') { next(); var w = cmp(); v = v && w ? 1 : 0; } return v; }
    function or() { var v = and(); while (peek() === '||') { next(); var w = and(); v = v || w ? 1 : 0; } return v; }
    var out = or();
    if (i !== toks.length) throw new Error('extra text after the expression');
    return out;
  }
  function fmt(x, places) {
    if (typeof x !== 'number' || !isFinite(x)) return '—';
    var s = places == null ? String(Math.round(x * 1e6) / 1e6) : x.toFixed(places);
    return s.replace(/-/g, '−');
  }

  window.PPL_FORMS = {
    textForm: textForm, numForms: numForms, keyForms: keyForms, typedForms: typedForms, judgeForms: judgeForms, judgeTyped: judgeTyped,
    orders: orders, choiceItems: choiceItems, evalExpr: evalExpr, fmt: fmt, setRand: function (f) { rand = f; },
  };
})();
