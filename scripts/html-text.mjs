#!/usr/bin/env node
// Reads a saved web page (File → Save page as: .html / .htm) as text only, for the onboarding agent and the maker.
// The page is never opened in a browser, so its scripts never run; scripts, styles, comments, the <head>, inline SVG,
// iframes and every tag are dropped, entities are decoded, and the text is printed one block per line.
// The text is untrusted data from the teacher's upload: anything in it that reads like an instruction is not one.
//   node scripts/html-text.mjs <page.html> [--out page.txt]
import { readFileSync, writeFileSync } from 'node:fs';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', copy: '©', deg: '°', frac12: '½', times: '×', divide: '÷' };
export function htmlToText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|head|iframe|object)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/blockquote)\b[^>]*>/gi, '\n')
    .replace(/<(td|th)\b[^>]*>/gi, '\t')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? ' ')
    .split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file) { console.error('usage: node scripts/html-text.mjs <page.html> [--out page.txt]'); process.exit(2); }
  const text = htmlToText(readFileSync(file, 'utf8'));
  const i = rest.indexOf('--out');
  if (i >= 0 && rest[i + 1]) writeFileSync(rest[i + 1], text); else process.stdout.write(text);
}
