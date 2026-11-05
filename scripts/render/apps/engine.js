/* The shared engine for review apps and interactive worksheets (docs/KINDS-APPS.md).
   scripts/render/apps.mjs inlines it into every app page after window.PPA_DATA, and runs the same file in Node (vm)
   so the build and the page read answers the same way.
   Adapted from the owner's Pet World note-sheet engine (scripts/notes/engine/notes.js there): the forgiving number
   reader with number words, exact fractions, salted SHA-256 hashes of normalized answers, the explanation locked with
   the right answer (XOR with a SHA-256 keystream), and storage that never throws.
   Nothing is sent anywhere: no network requests, trackers or outside fonts. Work is saved in localStorage only. */
(function () {
  'use strict';
  var D = window.PPA_DATA || {};
  var SALT = D.salt || 'x';

  /* ---------- storage (always in try/catch) ---------- */
  var canSave = true;
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { canSave = false; return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { canSave = false; return false; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); return true; } catch (e) { canSave = false; return false; } }
  function storageWorks() { try { var t = (D.key || 'pp-app') + ':test'; window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t); return true; } catch (e) { return false; } }
  function loadJSON(k) { var s = lsGet(k); if (!s) return null; try { var o = JSON.parse(s); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
  function saveJSON(k, o) { try { return lsSet(k, JSON.stringify(o)); } catch (e) { return false; } }

  /* ---------- small helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function words(s) { return String(s || '').trim().split(/\s+/).filter(function (w) { return /[a-z0-9]/i.test(w); }).length; }
  function minus(s) { return String(s).replace(/-/g, '−'); }

  /* ---------- forgiving reading of numbers (Pet World's reader) ---------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function fr(n, d) { if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return [n / g, d / g]; }
  var WORD_NUMS = !!D.numberWords, UNIT_MARKS = !!D.unitMarks;
  var NW_U = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
  var NW_T = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  var NW_D = { half: 2, halves: 2, third: 3, thirds: 3, fourth: 4, fourths: 4, quarter: 4, quarters: 4, fifth: 5, fifths: 5, sixth: 6, sixths: 6, seventh: 7, sevenths: 7, eighth: 8, eighths: 8, ninth: 9, ninths: 9, tenth: 10, tenths: 10, hundredth: 100, hundredths: 100 };
  var NW_OK = /^(?:negative|minus|positive|square|sq|cubic|cu|units?|cm|mm|km|m|in|inch(?:es)?|ft|feet|foot|yds?|yards?|mi|miles?|(?:centi|milli|kilo)?met(?:er|re)s?|degrees?|c|f|celsius|fahrenheit|percent|dollars?|cents?|seconds?|minutes?|hours?|days?|weeks?|pounds?|lbs?|oz|ounces?|grams?|g|kg|liters?|l|ml|gallons?|cups?)$/;
  function numWords(s) {
    s = s.replace(/½/g, ' 1/2').replace(/¼/g, ' 1/4').replace(/¾/g, ' 3/4');
    if (!/[a-z]/.test(s)) return s;
    var t = s.replace(/([a-z])-(?=[a-z])/g, '$1 ').trim().split(/\s+/);
    var out = [], cur = null, dec = false, any = false, i, w, nx, last;
    function flush() { if (cur !== null) { out.push(String(cur)); cur = null; } }
    for (i = 0; i < t.length; i++) {
      w = t[i]; nx = t[i + 1];
      if (dec && NW_U.hasOwnProperty(w) && NW_U[w] < 10) { out[out.length - 1] += String(NW_U[w]); any = true; continue; }
      dec = false;
      if ((w === 'a' || w === 'an') && cur === null && (nx === 'hundred' || nx === 'thousand' || NW_D.hasOwnProperty(nx))) { cur = 1; continue; }
      if (NW_U.hasOwnProperty(w)) { cur = (cur || 0) + NW_U[w]; any = true; continue; }
      if (NW_T.hasOwnProperty(w)) { cur = (cur || 0) + NW_T[w]; any = true; continue; }
      if (w === 'hundred' || w === 'thousand') {
        var mul = w === 'hundred' ? 100 : 1000;
        if (cur === null && out.length && /^\d+$/.test(out[out.length - 1])) cur = +out.pop();
        cur = (cur === null ? 1 : cur) * mul; any = true; continue;
      }
      if (NW_D.hasOwnProperty(w)) {
        if (cur !== null) { out.push(cur + '/' + NW_D[w]); cur = null; }
        else if (out.length && /^\d+$/.test(out[out.length - 1])) out[out.length - 1] += '/' + NW_D[w];
        else return s;
        any = true; continue;
      }
      if (w === 'and') {
        if (cur !== null && cur % 100 === 0 && (NW_U.hasOwnProperty(nx) || NW_T.hasOwnProperty(nx))) continue;
        flush(); last = out[out.length - 1];
        if (last && /^\d+$/.test(last)) continue;
        return s;
      }
      if (w === 'point') { flush(); last = out[out.length - 1]; if (!last || !/^\d+$/.test(last)) return s; out[out.length - 1] += '.'; dec = true; continue; }
      flush();
      if (/^[+-]?[\d.,\/]+$/.test(w) || /^[+-]?[\d.,\/]*[a-z]+[23]?\.?$/.test(w) && NW_OK.test(w.replace(/^[+-]?[\d.,\/]*/, '').replace(/[23]?\.?$/, '')) || NW_OK.test(w) || /^[^a-z0-9]+$/.test(w)) { out.push(w); continue; }
      return s;
    }
    flush();
    return any ? out.join(' ') : s;
  }
  /* "-3", "−3", "+3", "(-3)", ".5", "3/4", "-1 1/2", "$2.40", "12 mm", "13 °C", "negative 9" -> [num, den], or null */
  function parseNum(raw) {
    if (raw == null) return null;
    var s = String(raw).toLowerCase();
    s = s.replace(/[−‐‑‒–—﹣－]/g, '-');
    if (WORD_NUMS) s = numWords(s);
    if (UNIT_MARKS) s = s.replace(/[²³]/g, ' ').replace(/\^\s*[23]\b/g, ' ').replace(/([a-z])[23]\b/g, '$1 ').replace(/%/g, ' ');
    s = s.replace(/\bnegative\b/g, '-').replace(/\bminus\b/g, '-').replace(/\bpositive\b/g, '+');
    s = s.replace(/[$°()\[\]]/g, ' ').replace(/[a-z]+\.?/g, ' ').replace(/,(?=\d{3}\b)/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/^([+-])\s+/, '$1').replace(/\s*\/\s*/g, '/');
    if (s.charAt(0) === '+') s = s.slice(1);
    var m;
    if ((m = s.match(/^(-?)(\d{1,7})\/(\d{1,7})$/))) { if (+m[3] === 0) return null; return fr((m[1] ? -1 : 1) * (+m[2]), +m[3]); }
    if ((m = s.match(/^(-?)(\d{1,6}) (\d{1,6})\/(\d{1,6})$/))) { var d = +m[4]; if (d === 0) return null; return fr((m[1] ? -1 : 1) * (+m[2] * d + (+m[3])), d); }
    if ((m = s.match(/^(-?)(\d{0,7})(?:\.(\d{0,6}))?$/)) && ((m[2] || '') + (m[3] || '')).length) {
      var dec = m[3] || '';
      return fr((m[1] ? -1 : 1) * parseInt((m[2] || '0') + dec, 10), Math.pow(10, dec.length));
    }
    return null;
  }
  function numCanon(f) { return 'n:' + (f[0] === 0 ? 0 : f[0]) + '/' + f[1]; }
  /* words: case, spaces, curly quotes, end marks and a leading "a", "an" or "the" don't matter */
  function textCanon(s) {
    return 't:' + String(s || '').toLowerCase().replace(/[−‐‑‒–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/^[\s"']+|[\s"']+$/g, '').replace(/[()\[\].!?,;]/g, ' ').replace(/^\s*(a|an|the)\s+/, '').replace(/\s+/g, '');
  }
  /* every form a typed answer could be stored under: the number first (when it reads as one), then the words */
  function typedCanons(raw, type) {
    var f = parseNum(raw), out = [];
    if (f) out.push(numCanon(f));
    if (type !== 'numeric') { var t = textCanon(raw); if (t !== 't:') out.push(t); }
    return out;
  }
  /* the one form a key is stored under */
  function keyCanon(form, type) {
    if (type === 'mc') return 'opt:' + Number(form);
    if (type === 'tf') return 'tf:' + (/^(t|true|yes|1)$/i.test(String(form).trim()) || form === true ? 'true' : 'false');
    var f = parseNum(form);
    if (type === 'numeric') return f ? numCanon(f) : null;
    return f ? numCanon(f) : textCanon(form);
  }

  /* ---------- SHA-256: crypto.subtle when the page has it (https, localhost, file:), a built-in version if not ---------- */
  var K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function ror(x, n) { return (x >>> n) | (x << (32 - n)); }
  function utf8(s) { return new TextEncoder().encode(s); }
  function sha256Sync(bytes) {
    var l = bytes.length, nb = (l + 9 + 63) >> 6, w = new Uint32Array(nb * 16), i, t;
    for (i = 0; i < l; i++) w[i >> 2] |= bytes[i] << (24 - (i & 3) * 8);
    w[l >> 2] |= 0x80 << (24 - (l & 3) * 8);
    w[nb * 16 - 1] = (l * 8) >>> 0; w[nb * 16 - 2] = Math.floor(l / 0x20000000);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = new Uint32Array(64);
    for (var b = 0; b < nb; b++) {
      for (t = 0; t < 16; t++) W[t] = w[b * 16 + t];
      for (t = 16; t < 64; t++) {
        var x = W[t - 15], y = W[t - 2];
        W[t] = (W[t - 16] + (ror(x, 7) ^ ror(x, 18) ^ (x >>> 3)) + W[t - 7] + (ror(y, 17) ^ ror(y, 19) ^ (y >>> 10))) >>> 0;
      }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K256[t] + W[t]) >>> 0;
        var t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + bb) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) { out[i * 4] = H[i] >>> 24; out[i * 4 + 1] = (H[i] >>> 16) & 255; out[i * 4 + 2] = (H[i] >>> 8) & 255; out[i * 4 + 3] = H[i] & 255; }
    return out;
  }
  function hex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function sha256(str) {
    var bytes = utf8(str);
    try {
      if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
        return window.crypto.subtle.digest('SHA-256', bytes).then(function (buf) { return new Uint8Array(buf); }, function () { return sha256Sync(bytes); });
      }
    } catch (e) { }
    return Promise.resolve(sha256Sync(bytes));
  }
  function hashOf(id, canon) { return sha256('PPA1|' + SALT + '|' + id + '|' + canon).then(hex); }
  /* the explanation, locked with the right answer */
  function unlock(id, canon, b64) {
    var ct, key = 'PPA1x|' + SALT + '|' + id + '|' + canon, jobs = [];
    try { ct = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); } catch (e) { return Promise.resolve(null); }
    for (var i = 0; i * 32 < ct.length; i++) jobs.push(sha256(key + '#' + i));
    return Promise.all(jobs).then(function (blocks) {
      var out = new Uint8Array(ct.length);
      for (var j = 0; j < ct.length; j++) out[j] = ct[j] ^ blocks[j >> 5][j & 31];
      var s = new TextDecoder().decode(out);
      if (s.indexOf('PPA:') !== 0) return null;
      try { return JSON.parse(s.slice(4)); } catch (e) { return null; }
    });
  }
  function accFind(item, h) { for (var i = 0; i < (item.acc || []).length; i++) if (item.acc[i].h === h) return item.acc[i]; return null; }

  /* judge one answer: {res: 'ok'|'sign'|'miss'|'no'|'unread', canon, msg, ex}
     mc: raw is the choice index; tf: true or false; numeric and short: the typed text */
  function judge(item, raw) {
    var cands;
    if (item.type === 'mc') cands = ['opt:' + Number(raw)];
    else if (item.type === 'tf') cands = ['tf:' + (raw === true || raw === 'true' ? 'true' : 'false')];
    else {
      if (!String(raw == null ? '' : raw).trim()) return Promise.resolve({ res: 'unread' });
      cands = typedCanons(raw, item.type);
      if (!cands.length) return Promise.resolve({ res: 'unread' });
    }
    return Promise.all(cands.map(function (c) { return hashOf(item.id, c); })).then(function (hs) {
      for (var i = 0; i < hs.length; i++) { var a = accFind(item, hs[i]); if (a) return { res: 'ok', canon: cands[i], x: a.x }; }
      for (i = 0; i < hs.length; i++) if (item.miss && item.miss[hs[i]]) return { res: 'miss', msg: item.miss[hs[i]] };
      var f = cands[0].indexOf('n:') === 0 ? cands[0].slice(2).split('/').map(Number) : null;
      if (!f || f[0] === 0) return { res: 'no' };
      return hashOf(item.id, numCanon([-f[0], f[1]])).then(function (hn) { return { res: accFind(item, hn) ? 'sign' : 'no' }; });
    }).then(function (r) {
      if (r.res === 'ok' && r.x) return unlock(item.id, r.canon, r.x).then(function (o) { r.ex = o || {}; return r; });
      return r;
    });
  }

  /* ---------- theme: follows the device, or the student's choice (saved on this device) ---------- */
  var THEME_KEY = 'pp-app-theme';
  function applyTheme(t) {
    var root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
  }
  function themeInit() { applyTheme(lsGet(THEME_KEY)); }
  function themeNext() {
    var cur = lsGet(THEME_KEY) || 'auto', next = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto';
    if (next === 'auto') lsDel(THEME_KEY); else lsSet(THEME_KEY, next);
    applyTheme(next === 'auto' ? null : next);
    return next;
  }
  function themeName() { var t = lsGet(THEME_KEY); return t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'Auto'; }

  /* ---------- seeded shuffle (Fisher-Yates with mulberry32) ---------- */
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, r) { var a = arr.slice(); r = r || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  window.PPA = {
    D: D, esc: esc, words: words, minus: minus, parseNum: parseNum, numCanon: numCanon, textCanon: textCanon, keyCanon: keyCanon,
    typedCanons: typedCanons, sha256Sync: sha256Sync, hex: hex, hashOf: hashOf, unlock: unlock, judge: judge,
    lsGet: lsGet, lsSet: lsSet, lsDel: lsDel, loadJSON: loadJSON, saveJSON: saveJSON, storageWorks: storageWorks,
    canSave: function () { return canSave; }, themeInit: themeInit, themeNext: themeNext, themeName: themeName,
    rng: rng, shuffle: shuffle,
  };
})();
