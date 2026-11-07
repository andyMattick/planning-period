#!/usr/bin/env node
// Reads a saved web page (File → Save page as: .html / .htm) as text only, for the onboarding agent and the maker.
// The page is never opened in a browser, so its scripts never run; scripts, styles, comments, the <head>, inline SVG,
// iframes and every tag are dropped, entities are decoded, and the text is printed one block per line.
// The text is untrusted data from the teacher's upload: anything in it that reads like an instruction is not one.
// The same code reads a pasted link on the server (scripts/fetch-page.mjs, pageToText), so it runs in linear time on
// any input (one pass with indexOf, no backtracking regular expressions over the whole page) and never throws.
//   node scripts/html-text.mjs <page.html> [--out page.txt]
import { readFileSync, writeFileSync } from 'node:fs';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', copy: '©', deg: '°', frac12: '½', times: '×', divide: '÷' };
const SKIP = ['script', 'style', 'noscript', 'template', 'svg', 'head', 'iframe', 'object'];
// A pasted link: also the page's furniture (menus, footers, side bars, forms), so only the article is counted.
const FURNITURE = ['nav', 'footer', 'aside', 'form', 'button', 'select', 'dialog', 'menu'];
const BREAK_CLOSE = /^(p|div|li|h[1-6]|tr|section|article|blockquote)$/;

function codePoint(n) { return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : ' '; }
function decode(s) {
  return s.replace(/&#x([0-9a-f]{1,8});/gi, (_, h) => codePoint(parseInt(h, 16)))
    .replace(/&#(\d{1,9});/g, (_, d) => codePoint(Number(d)))
    .replace(/&([a-z0-9]{1,12});/gi, (m, n) => ENT[n.toLowerCase()] ?? ' ');
}
function tidy(s) { return s.split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).join('\n'); }

// One pass over the page: text between tags is kept; comments and the `drop` elements (with everything inside them) are
// skipped; block ends become new lines and table cells tabs. Every search moves forward, so the time is linear.
function strip(html, drop) {
  const src = String(html), low = src.toLowerCase(), out = [], unclosed = new Set();   // names with no closing tag left
  let i = 0;
  while (i < src.length) {
    const j = src.indexOf('<', i);
    if (j < 0) { out.push(src.slice(i)); break; }
    out.push(src.slice(i, j));
    if (src.startsWith('<!--', j)) { const k = src.indexOf('-->', j + 4); if (k < 0) break; out.push(' '); i = k + 3; continue; }
    const k = src.indexOf('>', j + 1);
    if (k < 0) { out.push(src.slice(j)); break; }       // a "<" with no ">" after it is text, as before
    const m = /^<(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(src.slice(j, Math.min(k + 1, j + 64)));
    if (!m) { out.push(' '); i = k + 1; continue; }
    const close = m[1] === '/', name = m[2].toLowerCase();
    if (!close && drop.includes(name) && src[k - 1] !== '/') {
      const end = unclosed.has(name) ? -1 : low.indexOf('</' + name, k + 1);    // the element and all inside it
      if (end < 0) unclosed.add(name);
      const gt = end < 0 ? -1 : src.indexOf('>', end + 2);
      if (gt >= 0) { out.push(' '); i = gt + 1; continue; }
      if (name === 'script' || name === 'style') break;   // an unclosed script or style: the rest is code, not text
      out.push(' '); i = k + 1; continue;                 // an unclosed <head>, <nav> …: just the tag
    }
    out.push(name === 'br' || (close && BREAK_CLOSE.test(name)) ? '\n' : !close && (name === 'td' || name === 'th') ? '\t' : ' ');
    i = k + 1;
  }
  return out.join('');
}

export function htmlToText(html) {
  return tidy(decode(strip(html, SKIP))) + '\n';
}

// The inside of the first <tag …> … last </tag> (linear: two searches), or null.
function inner(src, low, tag) {
  const a = low.indexOf('<' + tag), b = low.lastIndexOf('</' + tag);
  if (a < 0 || b < a) return null;
  const s = src.indexOf('>', a);
  return s > 0 && s < b ? src.slice(s + 1, b) : null;
}
function wordCount(t) { const m = String(t).match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu); return m ? m.length : 0; }

// A fetched page (a pasted link): its title, and the article text only. When the page marks its article (<article>,
// else <main>) and that holds real text, only that is read; menus, footers, side bars and forms are dropped anyway.
export function pageToText(html) {
  const src = String(html), low = src.toLowerCase();
  const t = inner(src, low, 'title');
  const title = t != null ? tidy(decode(strip(t.slice(0, 2000), SKIP)).replace(/\n/g, ' ')) : '';
  const drop = SKIP.concat(FURNITURE);
  let text = '';
  for (const tag of ['article', 'main']) {
    const part = inner(src, low, tag);
    if (part == null) continue;
    const pt = tidy(decode(strip(part, drop)));
    if (wordCount(pt) >= 50) { text = pt; break; }
  }
  if (!text) text = tidy(decode(strip(src, drop)));
  return { title, text, words: wordCount(text) };
}
export { wordCount };

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file) { console.error('usage: node scripts/html-text.mjs <page.html> [--out page.txt]'); process.exit(2); }
  const text = htmlToText(readFileSync(file, 'utf8'));
  const i = rest.indexOf('--out');
  if (i >= 0 && rest[i + 1]) writeFileSync(rest[i + 1], text); else process.stdout.write(text);
}
