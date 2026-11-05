/* How the practice games read typed answers. The same file runs in the page and in the build (scripts/render/
   practicegames.mjs loads it in Node), so the build stores answers exactly the way the page will compare them. */
(function (root) {
  'use strict';
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function frac(p, q) { if (q < 0) { p = -p; q = -q; } var g = gcd(p, q); return [p / g, q / g]; }
  function dec(s) { var parts = s.split('.'), f = parts[1] || ''; return frac(Number(parts[0] || 0) * Math.pow(10, f.length) + Number(f || 0), Math.pow(10, f.length)); }
  // "3/4", "0.75", "1 1/2", "-2", "−2", "$4.50", "1,200", "50%" (read as 50), and with unitMarks "12 cm": an exact
  // fraction [p, q], or null
  function parseNum(raw, unitMarks) {
    var s = String(raw == null ? '' : raw).replace(/[−–—]/g, '-').replace(/[$%]/g, '').replace(/,(?=\d{3})/g, '').trim();
    if (unitMarks) s = s.replace(/\s*[a-zA-Z°²³][a-zA-Z°²³ .]*$/, '').trim();
    var neg = false; if (/^-/.test(s)) { neg = true; s = s.slice(1).trim(); }
    var m, v = null;
    if ((m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) { if (+m[3]) v = frac(+m[1] * +m[3] + +m[2], +m[3]); }
    else if ((m = s.match(/^(\d*\.?\d+)\s*\/\s*(\d*\.?\d+)$/))) { var a = dec(m[1]), b = dec(m[2]); if (b[0]) v = frac(a[0] * b[1], a[1] * b[0]); }
    else if (/^(\d+\.?\d*|\.\d+)$/.test(s)) v = dec(s);
    if (!v) return null;
    return neg ? [-v[0], v[1]] : v;
  }
  // words: capitals, extra spaces, end marks and a leading a/an/the don't count
  function normText(s) { return String(s == null ? '' : s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().replace(/[.!?;:,]+$/, '').replace(/^(a|an|the) /, '').trim(); }
  // a fix-it fix is compared exactly (capitals and marks are often the mistake), apart from spaces and curly quotes
  function normFix(s) { return String(s == null ? '' : s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(); }
  root.PGR = { parseNum: parseNum, normText: normText, normFix: normFix };
})(typeof window !== 'undefined' ? window : globalThis);
