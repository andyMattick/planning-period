// Math typesetting for every text field of a pack: `$…$` inline and `$$…$$` display LaTeX (docs/KINDS-MATH.md).
//   PDF and HTML: KaTeX, rendered here in Node (renderToString), with its CSS and fonts inlined as data URIs: no CDN.
//   Word: real Word equations (OMML) through the `docx` package's Math classes, built from KaTeX's MathML. What docx
//         can't express (matrices, piecewise `cases`, accents such as \overline) becomes a crisp 3x PNG of the KaTeX
//         rendering instead, so it still looks right; the teacher can retype it with Word's equation editor.
//   PowerPoint: plain text when the math is simple enough to write in Unicode (x², ≤, π), else a PNG of the rendering.
//
// Delimiters follow Pandoc's rule so prices stay prices: an opening `$` is not followed by a space, a closing `$` is
// not preceded by a space and not followed by a digit ("$12 ÷ 3 = $4" has no math). `\$` is always a dollar sign.
// A pack can turn typesetting off with `"mathText": false`.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import katex from 'katex';
import { MathRun, MathFraction, MathSuperScript, MathSubScript, MathSubSuperScript, MathRadical, MathIntegral, MathSum, MathLimitLower, MathFunction, Math as DocxMath, TextRun, ImageRun } from 'docx';
import { esc } from './util.mjs';

const require = createRequire(import.meta.url);

let enabled = true;
export function setMathEnabled(pack) { enabled = pack?.mathText !== false; }

/* ---------- splitting text into text and math ---------- */
export function splitMath(text) {
  const s = String(text ?? '');
  const out = [];
  let buf = '';
  const push = (seg) => { if (buf) out.push({ t: 'text', s: buf }); buf = ''; out.push(seg); };
  if (!enabled || !s.includes('$')) return [{ t: 'text', s: s.replace(/\\\$/g, '$') }];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '$') { buf += '$'; i++; continue; }
    if (c !== '$') { buf += c; continue; }
    if (s[i + 1] === '$') { // display
      const end = s.indexOf('$$', i + 2);
      if (end > i + 2) { push({ t: 'math', s: s.slice(i + 2, end).trim(), display: true }); i = end + 1; continue; }
      buf += '$$'; i++; continue;
    }
    if (!s[i + 1] || /\s/.test(s[i + 1])) { buf += c; continue; }
    let j = i + 1, close = -1;
    for (; j < s.length; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === '$' && !/\s/.test(s[j - 1]) && !/\d/.test(s[j + 1] || '')) { close = j; break; }
    }
    if (close < 0) { buf += c; continue; }
    push({ t: 'math', s: s.slice(i + 1, close), display: false });
    i = close;
  }
  if (buf) out.push({ t: 'text', s: buf });
  return out;
}
export const hasMath = (text) => splitMath(text).some((x) => x.t === 'math');

// Every LaTeX error in a text (for the checks): [] when it all parses.
export function mathErrors(text) {
  const errs = [];
  for (const seg of splitMath(text)) {
    if (seg.t !== 'math') continue;
    try { katex.renderToString(seg.s, { throwOnError: true, displayMode: seg.display, strict: 'ignore' }); } catch (e) { errs.push(`$${seg.s}$: ${String(e.message).replace(/^KaTeX parse error: /, '')}`); }
  }
  return errs;
}

/* ---------- HTML and PDF ---------- */
const KOPTS = { throwOnError: false, strict: 'ignore', output: 'html' };
// `bold`: the math is set in bold too (a key, a right choice), not only the words around it.
export function mathHtml(text, { bold = false } = {}) {
  const tex = (s) => (bold ? `\\boldsymbol{${s}}` : s);
  return splitMath(text)
    .map((seg) => (seg.t === 'text' ? esc(seg.s) : seg.display
      ? `<span class="mathd">${katex.renderToString(tex(seg.s), { ...KOPTS, displayMode: true })}</span>`
      : katex.renderToString(tex(seg.s), { ...KOPTS, displayMode: false })))
    .join('');
}

let cssCache = null;
// KaTeX's stylesheet with its woff2 fonts inlined, so a page renders the same offline and in a PDF.
export function katexCss() {
  if (cssCache) return cssCache;
  const dir = path.dirname(require.resolve('katex/dist/katex.min.css'));
  let css = fs.readFileSync(path.join(dir, 'katex.min.css'), 'utf8');
  css = css.replace(/src:url\(fonts\/([\w-]+)\.woff2\) format\("woff2"\)(?:,url\([^)]*\) format\("[a-z]+"\))*/g, (_, name) => {
    const data = fs.readFileSync(path.join(dir, 'fonts', `${name}.woff2`)).toString('base64');
    return `src:url(data:font/woff2;base64,${data}) format("woff2")`;
  });
  cssCache = css + '.katex{font-size:1.08em}.mathd{display:block;text-align:center;margin:4pt 0}.mathd .katex-display{margin:0}';
  return cssCache;
}
// Add KaTeX's CSS to a finished page only when the page has math in it.
export function withMathCss(html) {
  if (!html.includes('class="katex"')) return html;
  return html.replace('</head>', `<style>${katexCss()}</style></head>`);
}

/* ---------- Unicode, for slides and graph labels ---------- */
const SUP = { '−': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺', n: 'ⁿ', x: 'ˣ', '(': '⁽', ')': '⁾' };
const SUB = { '−': '₋', 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '-': '₋', '+': '₊' };
const SYM = { cdot: '·', times: '×', div: '÷', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', pm: '±', mp: '∓', pi: 'π', theta: 'θ', alpha: 'α', beta: 'β', infty: '∞', to: '→', rightarrow: '→', approx: '≈', degree: '°', circ: '°', lt: '<', gt: '>', Delta: 'Δ', delta: 'δ', mu: 'μ', sigma: 'σ', lambda: 'λ', in: '∈', cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅', ldots: '…', dots: '…', cdots: '⋯', angle: '∠', perp: '⊥', parallel: '∥', triangle: '△', sim: '~', cong: '≅', quad: ' ', qquad: '  ', ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ', '%': '%', '{': '{', '}': '}', '$': '$', '&': '&', '#': '#', lvert: '|', rvert: '|', vert: '|', mid: '|', prime: '′' };
const FUNCS = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'ln', 'log', 'exp', 'min', 'max'];

// LaTeX to plain Unicode, or null when it can't be written that way without losing meaning.
export function latexToUnicode(tex) {
  let s = String(tex), i = 0;
  const group = () => {
    while (s[i] === ' ') i++;
    if (s[i] === '{') {
      let depth = 0, j = i;
      for (; j < s.length; j++) { if (s[j] === '\\') { j++; continue; } if (s[j] === '{') depth++; else if (s[j] === '}' && --depth === 0) break; }
      const inner = s.slice(i + 1, j); i = j + 1; return inner;
    }
    if (s[i] === '\\') { const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i)); i += m[0].length; return m[0]; }
    return s[i++] ?? '';
  };
  const conv = (t) => latexToUnicode(t);
  let out = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i)); i += m[0].length;
      const name = m[1];
      if (name === 'left' || name === 'right' || name === 'displaystyle' || name === 'big' || name === 'Big') { if (s[i] === '.') i++; continue; }
      if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
        const a = conv(group()), b = conv(group());
        if (a == null || b == null) return null;
        const simple = (x) => /^[\w.π′]+$/.test(x) || /^-?\d+(\.\d+)?$/.test(x);
        const f = `${simple(a) ? a : `(${a})`}/${simple(b) ? b : `(${b})`}`;
        out += /^\s*[\w(\\]/.test(s.slice(i)) ? `(${f})` : f;
        continue;
      }
      if (name === 'sqrt') {
        if (s[i] === '[') return null;
        const a = conv(group()); if (a == null) return null;
        out += /^[\w.]+$/.test(a) ? `√${a}` : `√(${a})`; continue;
      }
      if (name === 'text' || name === 'mathrm' || name === 'textbf' || name === 'mathbf' || name === 'operatorname') { out += group(); continue; }
      if (FUNCS.includes(name)) { out += name; continue; }
      if (name in SYM) { out += SYM[name]; continue; }
      return null; // \int, \lim, \sum, \begin, accents…: not plain text
    }
    if (c === '^' || c === '_') {
      i++;
      const g = group();
      const a = conv(g); if (a == null) return null;
      if (c === '^' && (a === '°' || g === '\\circ')) { out += '°'; continue; }
      const map = c === '^' ? SUP : SUB;
      if ([...a].every((ch) => ch in map)) out += [...a].map((ch) => map[ch]).join('');
      else if (c === '^') out += `^(${a})`; else return null;
      continue;
    }
    if (c === '{' || c === '}') { i++; continue; }
    if (c === '&') return null;
    out += c === '-' ? '−' : c; i++;
  }
  return out.replace(/\s+/g, ' ');
}
// A whole text with its math written in Unicode, or null when some math can't be.
export function textToUnicode(text) {
  let ok = true;
  const s = splitMath(text).map((seg) => { if (seg.t === 'text') return seg.s; const u = latexToUnicode(seg.s); if (u == null) ok = false; return u ?? seg.s; }).join('');
  return ok ? s : null;
}
// For places that only take text (a graph label): Unicode where possible, else the LaTeX without its backslashes.
export function plainMath(text) {
  return textToUnicode(text) ?? splitMath(text).map((seg) => (seg.t === 'text' ? seg.s : seg.s.replace(/\\[a-zA-Z]+/g, (m) => SYM[m.slice(1)] ?? m.slice(1)).replace(/[{}]/g, ''))).join('');
}

/* ---------- PNG of rendered math (Word fallback, PowerPoint) ---------- */
// One page (deviceScaleFactor 3) renders KaTeX HTML and screenshots it. Returns {data, width, height} in CSS px.
export function mathPngMaker(page) {
  const cache = new Map();
  return async (html, { fontPt = 12, width = null, font = 'Arial' } = {}) => {
    const key = `${fontPt}|${width}|${font}|${html}`;
    if (cache.has(key)) return cache.get(key);
    const box = width ? `width:${width}px;` : 'display:inline-block;';
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${katexCss()} body{margin:0;background:#fff} #m{${box}padding:2px 3px;font-family:${font};font-size:${fontPt}pt;line-height:1.35;color:#000}</style></head><body><div id="m">${html}</div></body></html>`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$('#m');
    const b = await el.boundingBox();
    const out = { data: await el.screenshot({ type: 'png', omitBackground: false }), width: Math.ceil(b.width), height: Math.ceil(b.height) };
    cache.set(key, out);
    return out;
  };
}

/* ---------- Word: KaTeX MathML to docx Math (OMML) ---------- */
function parseXml(xml) {
  const root = { name: '#root', attrs: {}, kids: [] };
  const stack = [root];
  const ent = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos|nbsp);/gi, (_, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' }[e.toLowerCase()]));
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[5] != null) { if (m[5]) top.kids.push({ name: '#text', text: ent(m[5]) }); continue; }
    if (m[1]) { stack.pop(); continue; }
    const attrs = {};
    for (const a of m[3].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = ent(a[2]);
    const node = { name: m[2], attrs, kids: [] };
    top.kids.push(node);
    if (!m[4]) stack.push(node);
  }
  return root;
}
const textOf = (n) => (n.name === '#text' ? n.text : n.kids.map(textOf).join(''));
const elems = (n) => n.kids.filter((k) => k.name !== '#text');
class Unsupported extends Error {}
const NARY_INT = /^[∫∬∭∮]$/, NARY_SUM = /^[∑∏]$/;

function baseText(n) { return n && ['mo', 'mi'].includes(n.name) ? textOf(n).trim() : null; }

function convRow(kids) {
  const out = [];
  for (let k = 0; k < kids.length; k++) {
    const n = kids[k];
    const head = ['msubsup', 'munderover', 'msub', 'munder', 'msup', 'mover'].includes(n.name) ? elems(n)[0] : n;
    const bt = baseText(head);
    if (bt && (NARY_INT.test(bt) || NARY_SUM.test(bt))) {
      const parts = n === head ? [] : elems(n).slice(1);
      const lower = ['msubsup', 'munderover', 'msub', 'munder'].includes(n.name) ? conv(parts[0]) : undefined;
      const upper = ['msubsup', 'munderover'].includes(n.name) ? conv(parts[1]) : ['msup', 'mover'].includes(n.name) ? conv(parts[0]) : undefined;
      const rest = convRow(kids.slice(k + 1));
      const Cls = NARY_INT.test(bt) ? MathIntegral : MathSum;
      out.push(new Cls({ children: rest.length ? rest : [new MathRun('')], ...(lower ? { subScript: lower } : {}), ...(upper ? { superScript: upper } : {}) }));
      return out;
    }
    // lim_{x→a}: Word wants a function name with its argument (m:func > m:fName > m:limLow)
    if ((n.name === 'msub' || n.name === 'munder') && /^lim/.test(textOf(elems(n)[0]).replace(/\u2061/g, ''))) {
      const lim = new MathLimitLower({ children: [new MathRun('lim')], limit: conv(elems(n)[1]) });
      let j = k + 1;
      while (kids[j] && kids[j].name === 'mo' && /^[\u2061\u2062]$/.test(textOf(kids[j]))) j++;
      if (kids[j]) { out.push(new MathFunction({ name: [lim], children: conv(kids[j]) })); k = j; } else out.push(lim);
      continue;
    }
    // a function name (sin, cos, log, ln) followed by ⁡ and its argument
    if (n.name === 'mi' && textOf(n).length > 1) {
      const next = kids[k + 1];
      if (next && next.name === 'mo' && textOf(next) === '⁡' && kids[k + 2]) {
        out.push(new MathFunction({ name: [new MathRun(textOf(n))], children: conv(kids[k + 2]) }));
        k += 2;
        continue;
      }
    }
    out.push(...conv(n));
  }
  return out;
}

function conv(n) {
  if (!n) return [];
  switch (n.name) {
    case '#text': return n.text.trim() ? [new MathRun(n.text)] : [];
    case '#root': case 'span': case 'math': case 'semantics': case 'mrow': case 'mstyle': case 'mpadded':
      return convRow(elems(n).filter((k) => k.name !== 'annotation'));
    case 'annotation': case 'mphantom': return [];
    case 'mi': case 'mn': case 'mtext': {
      const t = textOf(n).replace(/ /g, ' ');
      return t ? [new MathRun(t)] : [];
    }
    case 'mo': { const t = textOf(n); return t === '⁡' || t === '⁢' ? [] : [new MathRun(t)]; }
    case 'mspace': return [new MathRun(' ')];
    case 'mfrac': { const [a, b] = elems(n); return [new MathFraction({ numerator: conv(a), denominator: conv(b) })]; }
    case 'msup': {
      const [a, b] = elems(n);
      if (/^[′″‴]+$/.test(textOf(b).trim())) return [...conv(a), new MathRun(textOf(b).trim())]; // f′: a prime, not an exponent
      return [new MathSuperScript({ children: conv(a), superScript: conv(b) })];
    }
    case 'msub': { const [a, b] = elems(n); return [new MathSubScript({ children: conv(a), subScript: conv(b) })]; }
    case 'msubsup': { const [a, b, c] = elems(n); return [new MathSubSuperScript({ children: conv(a), subScript: conv(b), superScript: conv(c) })]; }
    case 'msqrt': return [new MathRadical({ children: convRow(elems(n)) })];
    case 'mroot': { const [a, b] = elems(n); return [new MathRadical({ children: conv(a), degree: conv(b) })]; }
    default: throw new Unsupported(n.name); // mtable (matrices, cases), mover/munder accents, menclose…
  }
}

// One LaTeX string as docx Math, or null when it needs the image fallback.
export function latexToOmml(tex, display = false) {
  const mml = katex.renderToString(tex, { throwOnError: false, strict: 'ignore', output: 'mathml', displayMode: display });
  try {
    const kids = conv(parseXml(mml));
    return new DocxMath({ children: kids });
  } catch (e) {
    if (e instanceof Unsupported) return null;
    throw e;
  }
}

// A text as docx runs: TextRuns for the words, Word equations for the math, an image where Word math can't go.
// `opts` are TextRun options for the words (bold, size…). Async because the image fallback renders a PNG.
export async function docxRuns(text, opts = {}, ctx) {
  const out = [];
  for (const seg of splitMath(text)) {
    if (seg.t === 'text') { if (seg.s) out.push(new TextRun({ text: seg.s, ...opts })); continue; }
    if (seg.display) out.push(new TextRun({ text: '', break: 1 }));
    const eq = latexToOmml(seg.s, seg.display);
    if (eq) out.push(eq);
    else if (ctx?.mathPng) {
      const png = await ctx.mathPng(katex.renderToString(seg.s, { ...KOPTS, displayMode: seg.display }), { fontPt: (opts.size || 24) / 2 });
      out.push(new ImageRun({ type: 'png', data: png.data, transformation: { width: png.width, height: png.height } }));
    } else out.push(new TextRun({ text: plainMath(`$${seg.s}$`), ...opts }));
    if (seg.display) out.push(new TextRun({ text: '', break: 1 }));
  }
  return out.length ? out : [new TextRun({ text: '', ...opts })];
}
