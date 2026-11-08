// Graphs as data: `figure: {graph: {...}}` in a pack becomes clean SVG (PDF and HTML) and, through the renderer's
// figurePng, a PNG (Word and PowerPoint). Spec: docs/KINDS-MATH.md.
//
// Kinds: "plane" (default: function plots, piecewise pieces, asymptotes, points, segments, polygons, inequalities,
// shaded area under a curve, tangent lines, slope fields), "numberLine", "scatter" (points given, or made from a target
// r), "histogram", "boxPlot", "dotPlot", "segmentedBar" (stacked 100% bars).
// Black-and-white safe: black and greys only, functions told apart by dash pattern and label, shading by hatching.
// Nothing labels itself: only a `label` the maker wrote is drawn, and any element whose `id` is in `hide` loses its
// label (so the asked answer is never printed on the picture).
//
// Functions are evaluated with mathjs's own expression parser (no JavaScript eval); its functions that could parse or
// import more code are switched off inside expressions.

import { create, all } from 'mathjs';
import { plainMath } from './math.mjs';

const M = create(all);
const parse = M.parse, derivative = M.derivative;
const off = () => { throw new Error('not allowed in a graph expression'); };
M.import({ ln: (x) => M.log(x) }, { override: true });
M.import({ import: off, createUnit: off, evaluate: off, parse: off, simplify: off, derivative: off, compile: off, resolve: off, reviver: off }, { override: true });

// Graph expressions: mathjs syntax ("2x + 1", "x^2 - 4x", "sin(x)", "e^(0.5x)", "1/(x-2)"). A leading "y =" or
// "f(x) =" and $ signs are dropped; a few LaTeX habits (\frac{a}{b}, \cdot, \sqrt{x}) are read too.
export function cleanExpr(expr) {
  let s = String(expr ?? '').replace(/\$/g, '').trim();
  s = s.replace(/^\s*(y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\)|h\s*\(\s*x\s*\))\s*=\s*/i, '');
  for (let k = 0; k < 5; k++) s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)').replace(/\\cdot|\\times/g, '*').replace(/\\left|\\right/g, '').replace(/\\pi/g, 'pi')
    .replace(/\\(sin|cos|tan|ln|log|exp)/g, '$1').replace(/[{]/g, '(').replace(/[}]/g, ')').replace(/[−–]/g, '-');
  return s;
}
const cache = new Map();
export function fn(expr, vars = ['x']) {
  const key = vars.join(',') + '|' + expr;
  if (cache.has(key)) return cache.get(key);
  const node = parse(cleanExpr(expr));
  const code = node.compile();
  const f = (...vals) => {
    try {
      const scope = Object.fromEntries(vars.map((v, i) => [v, vals[i]]));
      const y = code.evaluate(scope);
      return typeof y === 'number' && Number.isFinite(y) ? y : NaN;
    } catch { return NaN; }
  };
  f.node = node;
  cache.set(key, f);
  return f;
}
function slopeAt(expr, a) {
  try {
    const d = derivative(parse(cleanExpr(expr)), 'x').compile();
    const m = d.evaluate({ x: a });
    if (typeof m === 'number' && Number.isFinite(m)) return m;
  } catch { /* numeric below */ }
  const f = fn(expr), h = 1e-5;
  return (f(a + h) - f(a - h)) / (2 * h);
}

/* ---------- SVG helpers ---------- */
const FONT = `font-family="Arial, 'Liberation Sans', Helvetica, sans-serif"`;
const r2 = (n) => Math.round(n * 100) / 100;
const xmlEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DASH = { solid: '', dashed: '7 4', dotted: '1.5 3.5', dashdot: '8 3 2 3' };
const dashAttr = (style) => (DASH[style] ? ` stroke-dasharray="${DASH[style]}"` : '');
const fmt = (n) => {
  if (Math.abs(n) < 1e-9) return '0';
  const s = String(Math.round(n * 1000) / 1000);
  return s.replace('-', '−');
};
function hashOf(obj) {
  const s = JSON.stringify(obj);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
function text(x, y, s, { anchor = 'middle', size = 12, weight = 400, halo = true, italic = false } = {}) {
  const t = xmlEsc(plainMath(s));
  return `<text x="${r2(x)}" y="${r2(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''} ${FONT} fill="#000"${halo ? ' stroke="#fff" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"' : ''}>${t}</text>`;
}
function niceStep(range, target = 10) {
  const raw = range / target, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
function ticksOf(lo, hi, step) {
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Math.abs(v) < 1e-12 ? 0 : Math.round(v * 1e9) / 1e9);
  return out;
}
const visibleLabel = (el, hide) => (el && el.label != null && !(el.id && hide.has(el.id)) ? String(el.label) : null);
function labelAt(px, py, s, pos = 'ne', opts) {
  const dx = { ne: 7, nw: -7, se: 7, sw: -7, n: 0, s: 0, e: 9, w: -9 }[pos] ?? 7;
  const dy = { ne: -7, nw: -7, se: 16, sw: 16, n: -9, s: 18, e: 4, w: 4 }[pos] ?? -7;
  const anchor = dx > 0 ? 'start' : dx < 0 ? 'end' : 'middle';
  return text(px + dx, py + dy, s, { anchor, ...opts });
}
function arrowHead(x, y, angle, size = 8) {
  const a = (d) => [x - size * Math.cos(angle - d), y - size * Math.sin(angle - d)];
  const [p1, p2] = [a(0.42), a(-0.42)];
  return `<path d="M${r2(p1[0])},${r2(p1[1])} L${r2(x)},${r2(y)} L${r2(p2[0])},${r2(p2[1])}" fill="none" stroke="#000" stroke-width="1.6"/>`;
}

/* ---------- the coordinate plane ---------- */
function plane(g, uid) {
  const hide = new Set(g.hide || []);
  const W = Number(g.width) || 340, H = Number(g.height) || (g.kind === 'scatter' ? 260 : 300);
  const [xmin, xmax] = g.x || [-10, 10], [ymin, ymax] = g.y || [-10, 10];
  const edge = g.axes === 'edge' || g.kind === 'scatter' || xmin > 0 || ymin > 0 || xmax < 0 || ymax < 0;
  const pad = { l: edge ? 46 : 16, r: 16, t: g.title ? 26 : 14, b: edge ? 40 : 16 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const X = (x) => pad.l + ((x - xmin) / (xmax - xmin)) * pw;
  const Y = (y) => pad.t + ((ymax - y) / (ymax - ymin)) * ph;
  const tk = typeof g.ticks === 'object' && g.ticks ? g.ticks : { x: g.ticks, y: g.ticks };
  const xs = Number(tk.x) || niceStep(xmax - xmin), ys = Number(tk.y) || niceStep(ymax - ymin);
  const gridStep = g.grid === false ? null : { x: Number(g.grid?.x ?? g.grid) || xs, y: Number(g.grid?.y ?? g.grid) || ys };
  const le = typeof g.labelEvery === 'object' && g.labelEvery ? g.labelEvery : { x: g.labelEvery, y: g.labelEvery };
  const xEvery = Number(le.x) || (ticksOf(xmin, xmax, xs).length > 13 ? 2 : 1);
  const yEvery = Number(le.y) || (ticksOf(ymin, ymax, ys).length > 13 ? 2 : 1);
  const out = [];
  // a label stays inside the plot: near an edge it flips to the other side of its point
  const placeLabel = (px, py, str, pos = 'ne', opts) => {
    let p = pos;
    const w = plainMath(str).length * 6.6 + 10;
    if (/e/.test(p) && px + w > W - pad.r) p = p.replace('e', 'w');
    else if (/w/.test(p) && px - w < pad.l) p = p.replace('w', 'e');
    if (/n/.test(p) && py < pad.t + 18) p = p.replace('n', 's');
    else if (/s/.test(p) && py > H - pad.b - 18) p = p.replace('s', 'n');
    return labelAt(Math.max(pad.l + 2, Math.min(W - pad.r - 2, px)), Math.max(pad.t + 2, Math.min(H - pad.b - 2, py)), str, p, opts);
  };
  const defs = [`<clipPath id="c${uid}"><rect x="${r2(X(xmin))}" y="${r2(Y(ymax))}" width="${r2(pw)}" height="${r2(ph)}"/></clipPath>`];
  const hatch = (n, angle, base = true) => { defs.push(`<pattern id="h${uid}${n}" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(${angle})">${base ? '<rect width="7" height="7" fill="#e4e4e4"/>' : ''}<line x1="0" y1="0" x2="0" y2="7" stroke="#6a6a6a" stroke-width="1.1"/></pattern>`); return `url(#h${uid}${n})`; };
  if (g.title) out.push(text(W / 2, 16, g.title, { size: 13, weight: 700, halo: false }));

  // grid
  if (gridStep) {
    const lines = [];
    for (const x of ticksOf(xmin, xmax, gridStep.x)) lines.push(`M${r2(X(x))},${r2(Y(ymax))}V${r2(Y(ymin))}`);
    for (const y of ticksOf(ymin, ymax, gridStep.y)) lines.push(`M${r2(X(xmin))},${r2(Y(y))}H${r2(X(xmax))}`);
    out.push(`<path d="${lines.join('')}" stroke="#c8c8c8" stroke-width="0.8" fill="none"/>`);
  }
  if (edge) out.push(`<rect x="${r2(X(xmin))}" y="${r2(Y(ymax))}" width="${r2(pw)}" height="${r2(ph)}" fill="none" stroke="#000" stroke-width="1"/>`);

  // shading first (under the curves): inequalities and areas
  const body = [];
  (g.inequalities || []).forEach((q, n) => {
    const fill = hatch(`i${n}`, n % 2 ? -45 : 45, (g.inequalities || []).length < 2);
    const strict = /^[<>]$/.test(String(q.sign).trim());
    const above = />/.test(q.sign);
    if (q.x != null) { // vertical boundary x = c
      const c = Number(q.x);
      const [a, b] = above ? [c, xmax] : [xmin, c];
      body.push(`<rect x="${r2(X(a))}" y="${r2(Y(ymax))}" width="${r2(X(b) - X(a))}" height="${r2(ph)}" fill="${fill}" fill-opacity="0.85"/>`);
      body.push(`<path d="M${r2(X(c))},${r2(Y(ymax))}V${r2(Y(ymin))}" stroke="#000" stroke-width="2"${strict ? dashAttr('dashed') : ''}/>`);
      return;
    }
    const f = fn(q.expr), N = 400, pts = [];
    for (let i = 0; i <= N; i++) { const x = xmin + ((xmax - xmin) * i) / N; let y = f(x); if (!Number.isFinite(y)) continue; y = Math.max(ymin - (ymax - ymin), Math.min(ymax + (ymax - ymin), y)); pts.push([X(x), Y(y)]); }
    if (!pts.length) return;
    const yEdge = above ? Y(ymax) - 5 : Y(ymin) + 5;
    body.push(`<path d="M${r2(pts[0][0])},${r2(yEdge)}${pts.map((p) => `L${r2(p[0])},${r2(p[1])}`).join('')}L${r2(pts[pts.length - 1][0])},${r2(yEdge)}Z" fill="${fill}" fill-opacity="0.85"/>`);
    body.push(`<path d="M${pts.map((p) => `${r2(p[0])},${r2(p[1])}`).join('L')}" fill="none" stroke="#000" stroke-width="2"${strict ? dashAttr('dashed') : ''}/>`);
  });
  (g.areas || []).forEach((a, n) => {
    const f = fn(a.expr), base = fn(a.base ?? '0'), lo = Number(a.from), hi = Number(a.to), N = 200, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const x = lo + ((hi - lo) * i) / N; const y = f(x), b = base(x); if (Number.isFinite(y) && Number.isFinite(b)) { top.push([X(x), Y(y)]); bot.push([X(x), Y(b)]); } }
    if (!top.length) return;
    const fill = hatch(`a${n}`, 45);
    body.push(`<path d="M${top.map((p) => `${r2(p[0])},${r2(p[1])}`).join('L')}L${bot.reverse().map((p) => `${r2(p[0])},${r2(p[1])}`).join('L')}Z" fill="${fill}" stroke="#000" stroke-width="0.8"/>`);
    for (const x of [lo, hi]) body.push(`<path d="M${r2(X(x))},${r2(Y(base(x)))}V${r2(Y(f(x)))}" stroke="#000" stroke-width="1.2"/>`);
  });

  // polygons
  (g.polygons || []).forEach((p, n) => {
    const pts = (p.points || []).map(([x, y]) => `${r2(X(x))},${r2(Y(y))}`).join(' ');
    body.push(`<polygon points="${pts}" fill="${p.shade ? hatch(`p${n}`, -45) : 'none'}" stroke="#000" stroke-width="1.8"/>`);
  });
  // slope field
  if (g.slopeField) {
    const sf = g.slopeField, f = fn(sf.expr, ['x', 'y']), st = Number(sf.step) || xs, len = Number(sf.length) || Math.min(pw / ((xmax - xmin) / st), ph / ((ymax - ymin) / st)) * 0.55;
    const segs = [];
    for (const x of ticksOf(xmin, xmax, st)) for (const y of ticksOf(ymin, ymax, st)) {
      const m = f(x, y); if (!Number.isFinite(m)) continue;
      const ang = Math.atan(-m * (ph / (ymax - ymin)) / (pw / (xmax - xmin))); // screen slope
      const dx = (len / 2) * Math.cos(ang), dy = (len / 2) * Math.sin(ang);
      segs.push(`M${r2(X(x) - dx)},${r2(Y(y) - dy)}L${r2(X(x) + dx)},${r2(Y(y) + dy)}`);
    }
    body.push(`<path d="${segs.join('')}" stroke="#333" stroke-width="1.2"/>`);
  }

  // asymptotes (dashed)
  for (const a of g.asymptotes || []) {
    if (a.x != null) body.push(`<path d="M${r2(X(a.x))},${r2(Y(ymax))}V${r2(Y(ymin))}" stroke="#000" stroke-width="1.3"${dashAttr('dashed')}/>`);
    else if (a.y != null) body.push(`<path d="M${r2(X(xmin))},${r2(Y(a.y))}H${r2(X(xmax))}" stroke="#000" stroke-width="1.3"${dashAttr('dashed')}/>`);
    else if (a.expr) { const f = fn(a.expr); body.push(`<path d="M${r2(X(xmin))},${r2(Y(f(xmin)))}L${r2(X(xmax))},${r2(Y(f(xmax)))}" stroke="#000" stroke-width="1.3"${dashAttr('dashed')}/>`); }
  }

  // functions (and piecewise pieces: functions with a domain and open/closed ends)
  const labels = [], dots = [];
  const R = ymax - ymin;
  for (const fdef of g.functions || []) {
    const f = fn(fdef.expr);
    const [d0, d1] = fdef.domain || [xmin, xmax];
    const lo = Math.max(d0, xmin - (xmax - xmin) * 0.01), hi = Math.min(d1, xmax + (xmax - xmin) * 0.01);
    if (!(hi > lo)) continue;
    const breaks = (g.asymptotes || []).filter((a) => a.x != null).map((a) => Number(a.x));
    const N = 900, paths = [];
    let cur = [], prev = null;
    for (let i = 0; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N;
      let y = f(x);
      if (!Number.isFinite(y)) { if (cur.length > 1) paths.push(cur); cur = []; prev = null; continue; }
      const yc = Math.max(ymin - 3 * R, Math.min(ymax + 3 * R, y));
      if (prev && (Math.abs(yc - prev[1]) > 1.6 * R || breaks.some((b) => (prev[0] - b) * (x - b) < 0))) { if (cur.length > 1) paths.push(cur); cur = []; }
      cur.push([x, yc]); prev = [x, yc];
    }
    if (cur.length > 1) paths.push(cur);
    for (const p of paths) body.push(`<path d="M${p.map(([x, y]) => `${r2(X(x))},${r2(Y(y))}`).join('L')}" fill="none" stroke="#000" stroke-width="${fdef.width || 2.2}" stroke-linejoin="round"${dashAttr(fdef.style)}/>`);
    for (const [end, x] of [['left', d0], ['right', d1]]) {
      const kind = fdef.ends?.[end];
      if (kind === 'open' || kind === 'closed') {
        const y = f(x);
        if (Number.isFinite(y)) dots.push({ x, y, open: kind === 'open' });
      }
    }
    const lab = visibleLabel(fdef, hide);
    if (lab) {
      const lx = fdef.labelAt != null ? Number(fdef.labelAt) : lo + (hi - lo) * 0.82;
      const ly = f(lx);
      if (Number.isFinite(ly)) labels.push(placeLabel(X(lx), Y(Math.max(ymin, Math.min(ymax, ly))), lab, fdef.labelPos || 'nw', { italic: false }));
    }
  }
  // tangent lines
  for (const t of g.tangents || []) {
    const f = fn(t.expr), a = Number(t.at), fa = f(a), m = slopeAt(t.expr, a);
    const half = t.length ? Number(t.length) / 2 : (xmax - xmin);
    body.push(`<path d="M${r2(X(a - half))},${r2(Y(fa - m * half))}L${r2(X(a + half))},${r2(Y(fa + m * half))}" stroke="#000" stroke-width="1.6"${dashAttr(t.style || 'dashed')}/>`);
    if (t.point !== false) dots.push({ x: a, y: fa, open: false });
    const lab = visibleLabel(t, hide);
    if (lab) labels.push(placeLabel(X(a + half * 0.5), Y(fa + m * half * 0.5), lab, t.labelPos || 'se'));
  }
  // segments
  for (const s of g.segments || []) {
    const [x1, y1] = s.from, [x2, y2] = s.to;
    body.push(`<path d="M${r2(X(x1))},${r2(Y(y1))}L${r2(X(x2))},${r2(Y(y2))}" stroke="#000" stroke-width="1.8"${dashAttr(s.style)}/>`);
    if (s.arrow) body.push(arrowHead(X(x2), Y(y2), Math.atan2(Y(y2) - Y(y1), X(x2) - X(x1))));
    const lab = visibleLabel(s, hide);
    if (lab) labels.push(placeLabel((X(x1) + X(x2)) / 2, (Y(y1) + Y(y2)) / 2, lab, s.labelPos || 'n'));
  }
  // a fitted or given line on a scatter plot
  if (g.line) {
    let expr = g.line.expr;
    if (!expr && g.line.fit && (g.points || []).length > 1) {
      const P = g.points.map((p) => (Array.isArray(p) ? p : p.at)), n = P.length;
      const mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
      const sxy = P.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0), sxx = P.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
      const m = sxy / sxx; expr = `${m}*x + ${my - m * mx}`;
    }
    if (expr) { const f = fn(expr); body.push(`<path d="M${r2(X(xmin))},${r2(Y(f(xmin)))}L${r2(X(xmax))},${r2(Y(f(xmax)))}" stroke="#000" stroke-width="1.6"${dashAttr(g.line.style || 'dashed')}/>`); const lab = visibleLabel(g.line, hide); if (lab) labels.push(placeLabel(X(xmax - (xmax - xmin) * 0.15), Y(f(xmax - (xmax - xmin) * 0.15)), lab, 'nw')); }
  }
  // points
  for (const p of g.points || []) {
    const at = Array.isArray(p) ? p : p.at;
    if (!at) continue;
    dots.push({ x: at[0], y: at[1], open: !!p.open, mark: p.mark || (g.kind === 'scatter' ? 'dot' : 'dot') });
    const lab = Array.isArray(p) ? null : visibleLabel(p, hide);
    if (lab) labels.push(placeLabel(X(at[0]), Y(at[1]), lab, p.labelPos || 'ne'));
  }
  (g.polygons || []).forEach((p) => (p.vertexLabels || []).forEach((v, i) => {
    if (!v || !p.points[i] || (p.id && hide.has(p.id))) return;
    const [x, y] = p.points[i], cx = p.points.reduce((s, q) => s + q[0], 0) / p.points.length, cy = p.points.reduce((s, q) => s + q[1], 0) / p.points.length;
    labels.push(placeLabel(X(x), Y(y), v, `${y >= cy ? 'n' : 's'}${x >= cx ? 'e' : 'w'}`));
  }));

  // axes
  const ax = [];
  const xAxisY = edge ? Y(ymin) : Y(0), yAxisX = edge ? X(xmin) : X(0);
  if (!edge) {
    ax.push(`<path d="M${r2(X(xmin) - 2)},${r2(xAxisY)}H${r2(X(xmax) + 4)}" stroke="#000" stroke-width="1.4"/>`, arrowHead(X(xmax) + 6, xAxisY, 0), arrowHead(X(xmin) - 4, xAxisY, Math.PI));
    ax.push(`<path d="M${r2(yAxisX)},${r2(Y(ymin) + 2)}V${r2(Y(ymax) - 4)}" stroke="#000" stroke-width="1.4"/>`, arrowHead(yAxisX, Y(ymax) - 6, -Math.PI / 2), arrowHead(yAxisX, Y(ymin) + 4, Math.PI / 2));
  }
  const tl = [];
  const piFmt = g.xTickFormat === 'pi';
  const fmtX = (v) => {
    if (!piFmt) return fmt(v);
    const k = Math.round((v / Math.PI) * 2); // halves of π
    if (k === 0) return '0';
    const sgn = k < 0 ? '−' : '', a = Math.abs(k);
    return a % 2 === 0 ? `${sgn}${a / 2 === 1 ? '' : a / 2}π` : `${sgn}${a === 1 ? '' : a}π/2`;
  };
  ticksOf(xmin, xmax, piFmt ? Math.PI / 2 : xs).forEach((v, i, arr) => {
    const idx = Math.round(v / (piFmt ? Math.PI / 2 : xs));
    if (!edge && Math.abs(v) < 1e-9) return;
    tl.push(`<path d="M${r2(X(v))},${r2(xAxisY - (edge ? 0 : 3.5))}V${r2(xAxisY + 3.5)}" stroke="#000" stroke-width="1"/>`);
    if (idx % xEvery === 0) tl.push(text(X(v), xAxisY + 15, fmtX(v), { size: 10.5 }));
  });
  ticksOf(ymin, ymax, ys).forEach((v) => {
    const idx = Math.round(v / ys);
    if (!edge && Math.abs(v) < 1e-9) return;
    tl.push(`<path d="M${r2(yAxisX - 3.5)},${r2(Y(v))}H${r2(yAxisX + (edge ? 0 : 3.5))}" stroke="#000" stroke-width="1"/>`);
    if (idx % yEvery === 0) tl.push(text(yAxisX - 6, Y(v) + 3.8, fmt(v), { size: 10.5, anchor: 'end' }));
  });
  if (!edge && g.originLabel !== false && xmin < 0 && ymin < 0) tl.push(text(yAxisX - 5, xAxisY + 14, '0', { size: 10.5, anchor: 'end' }));
  const axl = g.axisLabels || (edge ? {} : { x: 'x', y: 'y' });
  if (axl.x) tl.push(edge ? text(X((xmin + xmax) / 2), H - 6, axl.x, { size: 11.5, weight: 700, halo: false }) : text(X(xmax) + 2, xAxisY - 8, axl.x, { size: 12.5, anchor: 'end', italic: axl.x.length === 1 }));
  if (axl.y) tl.push(edge ? `<g transform="translate(13,${r2(Y((ymin + ymax) / 2))}) rotate(-90)">${text(0, 0, axl.y, { size: 11.5, weight: 700, halo: false })}</g>` : text(yAxisX + 8, Y(ymax) + 4, axl.y, { size: 12.5, anchor: 'start', italic: axl.y.length === 1 }));

  const dotSvg = dots
    .filter((d) => d.x >= xmin - 1e-9 && d.x <= xmax + 1e-9 && d.y >= ymin - 1e-9 && d.y <= ymax + 1e-9)
    .map((d) => `<circle cx="${r2(X(d.x))}" cy="${r2(Y(d.y))}" r="${d.open ? 4.2 : 4}" fill="${d.open ? '#fff' : '#000'}" stroke="#000" stroke-width="1.8"/>`);
  return { W, H, svg: `<defs>${defs.join('')}</defs>${out.join('')}${ax.join('')}<g clip-path="url(#c${uid})">${body.join('')}</g>${tl.join('')}${dotSvg.join('')}${labels.join('')}` };
}

/* ---------- number line ---------- */
function numberLine(g, uid) {
  const hide = new Set(g.hide || []);
  const W = Number(g.width) || 420, H = Number(g.height) || 70;
  const lo = Number(g.from ?? -5), hi = Number(g.to ?? 5), st = Number(g.step) || 1, every = Number(g.labelEvery) || 1;
  const pad = 20, X = (x) => pad + ((x - lo) / (hi - lo)) * (W - 2 * pad), y = g.title ? 42 : 30;
  const out = [];
  if (g.title) out.push(text(W / 2, 15, g.title, { size: 12.5, weight: 700, halo: false }));
  out.push(`<path d="M${pad - 12},${y}H${W - pad + 12}" stroke="#000" stroke-width="1.5"/>`, arrowHead(W - pad + 14, y, 0), arrowHead(pad - 14, y, Math.PI));
  const custom = Array.isArray(g.tickLabels) ? g.tickLabels : null;
  ticksOf(lo, hi, st).forEach((v, i) => {
    out.push(`<path d="M${r2(X(v))},${y - 6}V${y + 6}" stroke="#000" stroke-width="1.2"/>`);
    const lab = custom ? custom[i] : (Math.round((v - lo) / st) % every === 0 ? fmt(v) : null);
    if (lab != null && lab !== '') out.push(text(X(v), y + 21, lab, { size: 11.5 }));
  });
  const thick = [];
  for (const r of g.rays || []) {
    const a = Number(r.from), right = r.dir !== 'left';
    const end = right ? W - pad + 8 : pad - 8;
    thick.push(`<path d="M${r2(X(a))},${y}H${r2(end)}" stroke="#000" stroke-width="4.5"/>`, arrowHead(right ? end + 4 : end - 4, y, right ? 0 : Math.PI, 10));
    thick.push(dot(X(a), y, r.open));
  }
  for (const s of g.segments || []) {
    thick.push(`<path d="M${r2(X(s.from))},${y}H${r2(X(s.to))}" stroke="#000" stroke-width="4.5"/>`);
    thick.push(dot(X(s.from), y, s.openLeft), dot(X(s.to), y, s.openRight));
  }
  const labs = [];
  for (const p of g.points || []) {
    const at = typeof p === 'number' ? p : p.at;
    thick.push(dot(X(at), y, !!p.open));
    const lab = typeof p === 'number' ? null : visibleLabel(p, hide);
    if (lab) labs.push(text(X(at), y - 12, lab, { size: 11.5, weight: 700 }));
  }
  function dot(cx, cy, open) { return `<circle cx="${r2(cx)}" cy="${cy}" r="5.2" fill="${open ? '#fff' : '#000'}" stroke="#000" stroke-width="2"/>`; }
  void uid;
  return { W, H, svg: out.join('') + thick.join('') + labs.join('') };
}

/* ---------- data plots on one number axis: histogram, box plot, dot plot ---------- */
function quartiles(data) {
  const d = [...data].map(Number).sort((a, b) => a - b), n = d.length;
  const med = (a) => (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
  const lower = d.slice(0, Math.floor(n / 2)), upper = d.slice(Math.ceil(n / 2));
  return { min: d[0], q1: med(lower), median: med(d), q3: med(upper), max: d[n - 1] };
}
function axisBelow(out, X, lo, hi, st, y, every = 1, label) {
  out.push(`<path d="M${r2(X(lo))},${y}H${r2(X(hi))}" stroke="#000" stroke-width="1.3"/>`);
  ticksOf(lo, hi, st).forEach((v) => {
    out.push(`<path d="M${r2(X(v))},${y}V${y + 5}" stroke="#000" stroke-width="1"/>`);
    if (Math.round((v - lo) / st) % every === 0) out.push(text(X(v), y + 17, fmt(v), { size: 10.5, halo: false }));
  });
  if (label) out.push(text((X(lo) + X(hi)) / 2, y + 33, label, { size: 11.5, weight: 700, halo: false }));
}
function boxPlot(g) {
  const s = g.data ? quartiles(g.data) : g;
  const W = Number(g.width) || 420, H = Number(g.height) || (g.axisLabel ? 120 : 105);
  const lo = Number(g.from ?? s.min), hi = Number(g.to ?? s.max), st = Number(g.step) || niceStep(hi - lo);
  const pad = 20, X = (x) => pad + ((x - lo) / (hi - lo)) * (W - 2 * pad);
  const out = [], top = g.title ? 30 : 14, mid = top + 22, bh = 36;
  if (g.title) out.push(text(W / 2, 15, g.title, { size: 12.5, weight: 700, halo: false }));
  const lw = s.lowWhisker ?? s.min, hw = s.highWhisker ?? s.max;
  out.push(`<path d="M${r2(X(lw))},${mid}H${r2(X(s.q1))}M${r2(X(s.q3))},${mid}H${r2(X(hw))}M${r2(X(lw))},${mid - 10}V${mid + 10}M${r2(X(hw))},${mid - 10}V${mid + 10}" stroke="#000" stroke-width="1.8"/>`);
  out.push(`<rect x="${r2(X(s.q1))}" y="${mid - bh / 2}" width="${r2(X(s.q3) - X(s.q1))}" height="${bh}" fill="#ececec" stroke="#000" stroke-width="1.8"/>`);
  out.push(`<path d="M${r2(X(s.median))},${mid - bh / 2}V${mid + bh / 2}" stroke="#000" stroke-width="2.6"/>`);
  for (const o of g.outliers || []) out.push(`<text x="${r2(X(o))}" y="${mid + 4}" text-anchor="middle" font-size="13" ${FONT}>*</text>`);
  axisBelow(out, X, lo, hi, st, mid + bh / 2 + 14, Number(g.labelEvery) || 1, g.axisLabel);
  return { W, H, svg: out.join('') };
}
function dotPlot(g) {
  const vals = (g.values || []).map(Number);
  const lo = Number(g.from ?? Math.min(...vals)), hi = Number(g.to ?? Math.max(...vals)), st = Number(g.step) || 1;
  const counts = new Map();
  for (const v of vals) counts.set(v, (counts.get(v) || 0) + 1);
  const most = Math.max(1, ...counts.values());
  const W = Number(g.width) || 420, r = 6, gap = 14.5;
  const top = g.title ? 26 : 8, axisY = top + most * gap + 8;
  const H = Number(g.height) || axisY + (g.axisLabel ? 40 : 26);
  const pad = 20, X = (x) => pad + ((x - lo) / (hi - lo)) * (W - 2 * pad);
  const out = [];
  if (g.title) out.push(text(W / 2, 15, g.title, { size: 12.5, weight: 700, halo: false }));
  for (const [v, c] of counts) for (let k = 0; k < c; k++) out.push(`<circle cx="${r2(X(v))}" cy="${r2(axisY - 9 - k * gap)}" r="${r}" fill="#000"/>`);
  axisBelow(out, X, lo, hi, st, axisY, Number(g.labelEvery) || 1, g.axisLabel);
  return { W, H, svg: out.join('') };
}
function histogram(g) {
  let bins = g.bins;
  if (!bins && g.data) {
    const start = Number(g.start ?? Math.min(...g.data)), w = Number(g.binWidth) || 10, n = Math.ceil((Math.max(...g.data) - start + 1e-9) / w) || 1;
    bins = Array.from({ length: n }, (_, i) => [start + i * w, start + (i + 1) * w, g.data.filter((v) => v >= start + i * w && (v < start + (i + 1) * w || (i === n - 1 && v === start + (i + 1) * w))).length]);
  }
  bins = bins || [];
  const lo = Number(g.from ?? bins[0]?.[0] ?? 0), hi = Number(g.to ?? bins[bins.length - 1]?.[1] ?? 1);
  const ymax = Number(g.yMax) || Math.max(1, ...bins.map((b) => b[2])) + 1, ys = Number(g.yStep) || niceStep(ymax, 6);
  const W = Number(g.width) || 400, H = Number(g.height) || 250;
  const pad = { l: 46, r: 14, t: g.title ? 26 : 12, b: 44 };
  const X = (x) => pad.l + ((x - lo) / (hi - lo)) * (W - pad.l - pad.r), Y = (y) => pad.t + ((ymax - y) / ymax) * (H - pad.t - pad.b);
  const out = [];
  if (g.title) out.push(text(W / 2, 16, g.title, { size: 12.5, weight: 700, halo: false }));
  out.push(`<path d="${ticksOf(0, ymax, ys).map((v) => `M${pad.l},${r2(Y(v))}H${W - pad.r}`).join('')}" stroke="#d0d0d0" stroke-width="0.8"/>`);
  for (const [a, b, c] of bins) out.push(`<rect x="${r2(X(a))}" y="${r2(Y(c))}" width="${r2(X(b) - X(a))}" height="${r2(Y(0) - Y(c))}" fill="#d9d9d9" stroke="#000" stroke-width="1.4"/>`);
  out.push(`<path d="M${pad.l},${r2(Y(0))}H${W - pad.r}M${pad.l},${r2(Y(0))}V${pad.t}" stroke="#000" stroke-width="1.3"/>`);
  const edges = [...new Set(bins.flatMap((b) => [b[0], b[1]]))];
  for (const e of edges) out.push(`<path d="M${r2(X(e))},${r2(Y(0))}V${r2(Y(0) + 5)}" stroke="#000"/>`, text(X(e), Y(0) + 17, fmt(e), { size: 10.5, halo: false }));
  for (const v of ticksOf(0, ymax, ys)) out.push(text(pad.l - 6, Y(v) + 3.8, fmt(v), { size: 10.5, anchor: 'end', halo: false }));
  if (g.axisLabels?.x) out.push(text((pad.l + W - pad.r) / 2, H - 6, g.axisLabels.x, { size: 11.5, weight: 700, halo: false }));
  if (g.axisLabels?.y) out.push(`<g transform="translate(13,${r2((pad.t + Y(0)) / 2)}) rotate(-90)">${text(0, 0, g.axisLabels.y, { size: 11.5, weight: 700, halo: false })}</g>`);
  return { W, H, svg: out.join('') };
}

/* ---------- a scatter plot made from a target r (owner, Nov 8, 2026: "estimate r from this scatterplot") ----------
   `{kind: "scatter", r: -0.75, n: 25, seed: "q7", x: [0, 10], y: [0, 100]}` with no `points`: n points whose correlation
   is r (exactly before rounding to `places`, default 1 place on the window's scale), repeatable from the seed. The
   x values are spread over the middle 80% of the window; the noise is made perpendicular to x and scaled so that
   corr(x, y) = r, then y is fitted into the middle 80% of the y window. checks/math.mjs recomputes r from the points
   drawn and fails a graph more than 0.02 off. */
function seeded(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function corrOf(points) {
  const xs = points.map((p) => Number(Array.isArray(p) ? p[0] : p.at[0])), ys = points.map((p) => Number(Array.isArray(p) ? p[1] : p.at[1]));
  const n = xs.length, mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxy / Math.sqrt(sxx * syy);
}
export function scatterPoints(g) {
  if (Array.isArray(g.points) && g.points.length) return g.points;
  const r = Number(g.r);
  if (!Number.isFinite(r) || Math.abs(r) > 1) throw new Error('a scatter plot made from r needs "r" between -1 and 1 (or "points")');
  const n = Math.max(5, Math.min(200, Math.round(Number(g.n) || 25)));
  const [x0, x1] = g.x || [0, 10], [y0, y1] = g.y || [0, 10];
  const rand = seeded(`${g.seed ?? ''}|${r}|${n}|${x0},${x1}|${y0},${y1}`);
  const normal = () => { const u = 1 - rand(), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const xs = Array.from({ length: n }, (_, i) => (i + rand()) / n);   // spread out, never two on top of each other
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, center = (a) => { const m = mean(a); return a.map((v) => v - m); };
  const xc = center(xs);
  let z = center(Array.from({ length: n }, normal));
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const k = dot(z, xc) / dot(xc, xc);
  z = z.map((v, i) => v - k * xc[i]);
  const ux = xc.map((v) => v / Math.sqrt(dot(xc, xc))), uz = z.map((v) => v / Math.sqrt(dot(z, z)));
  const ys = ux.map((v, i) => r * v + Math.sqrt(Math.max(0, 1 - r * r)) * uz[i]);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const places = Number.isInteger(g.places) ? g.places : Math.max(0, 3 - Math.floor(Math.log10(Math.max(1e-9, Math.max(x1 - x0, y1 - y0)))));
  const rd = (v) => Math.round(v * 10 ** places) / 10 ** places;
  return xs.map((x, i) => [rd(x0 + (x1 - x0) * (0.1 + 0.8 * x)), rd(y0 + (y1 - y0) * (0.1 + 0.8 * (hi > lo ? (ys[i] - lo) / (hi - lo) : 0.5)))]);
}

/* ---------- a segmented (stacked 100%) bar graph ----------
   `{kind: "segmentedBar", categories: ["Bus", "Car", "Walk"], bars: [{label: "Grade 9", counts: [12, 30, 8]}, …],
   axisLabels: {x, y}, title, labels: false}`. Each bar is its counts as percents of the bar's total (or `percents`
   given straight, which must add to 100). Segments are told apart by fill pattern and the legend, never by colour
   alone. `labels: true` prints each segment's percent inside it (leave it off when a question asks for one).
   checks/math.mjs fails a bar whose percents don't add to 100, or whose stated `percents` don't match its `counts`. */
export function segmentPercents(bar) {
  if (Array.isArray(bar.counts) && bar.counts.length) {
    const t = bar.counts.reduce((s, c) => s + Number(c), 0);
    return bar.counts.map((c) => (t > 0 ? (Number(c) / t) * 100 : 0));
  }
  return (bar.percents || []).map(Number);
}
const FILLS = [
  (id) => ({ def: '', fill: '#ffffff' }),
  (id) => ({ def: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="1.3"/></pattern>`, fill: `url(#${id})` }),
  (id) => ({ def: '', fill: '#9a9a9a' }),
  (id) => ({ def: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6"><rect width="6" height="6" fill="#fff"/><circle cx="3" cy="3" r="1.3" fill="#000"/></pattern>`, fill: `url(#${id})` }),
  (id) => ({ def: '', fill: '#d8d8d8' }),
  (id) => ({ def: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#d8d8d8"/><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="1.3"/></pattern>`, fill: `url(#${id})` }),
  (id) => ({ def: '', fill: '#4a4a4a' }),
];
function segmentedBar(g, uid) {
  const cats = (g.categories || []).map(String), bars = g.bars || [];
  if (!cats.length || !bars.length) throw new Error('a segmented bar graph needs categories and bars');
  if (cats.length > FILLS.length) throw new Error(`a segmented bar graph has at most ${FILLS.length} categories`);
  const W = Number(g.width) || Math.max(320, 120 + bars.length * 80), legendH = 18 * Math.ceil(cats.length / 3) + 8;
  const H = Number(g.height) || 270 + legendH;
  const pad = { l: 50, r: 14, t: g.title ? 28 : 12, b: 44 + legendH };
  const Y = (p) => pad.t + ((100 - p) / 100) * (H - pad.t - pad.b);
  const slot = (W - pad.l - pad.r) / bars.length, bw = Math.min(64, slot * 0.6);
  const out = [], defs = [], fills = cats.map((_, i) => FILLS[i](`s${uid}${i}`));
  fills.forEach((f) => f.def && defs.push(f.def));
  if (g.title) out.push(text(W / 2, 17, g.title, { size: 12.5, weight: 700, halo: false }));
  for (const v of [0, 20, 40, 60, 80, 100]) out.push(`<path d="M${pad.l - 4},${r2(Y(v))}H${W - pad.r}" stroke="${v ? '#d0d0d0' : '#000'}" stroke-width="${v ? 0.8 : 1.3}"/>`, text(pad.l - 7, Y(v) + 3.8, `${v}%`, { size: 10.5, anchor: 'end', halo: false }));
  out.push(`<path d="M${pad.l},${r2(Y(0))}V${r2(Y(100))}" stroke="#000" stroke-width="1.3"/>`);
  bars.forEach((b, i) => {
    const ps = segmentPercents(b), cx = pad.l + slot * (i + 0.5);
    let acc = 0;
    ps.forEach((p, j) => {
      const y1 = Y(acc), y2 = Y(acc + p);
      out.push(`<rect x="${r2(cx - bw / 2)}" y="${r2(y2)}" width="${r2(bw)}" height="${r2(y1 - y2)}" fill="${fills[j].fill}" stroke="#000" stroke-width="1.2"/>`);
      if (g.labels && p >= 7) out.push(text(cx, (y1 + y2) / 2 + 4, `${Math.round(p)}%`, { size: 10.5, weight: 700 }));
      acc += p;
    });
    out.push(text(cx, Y(0) + 16, b.label ?? '', { size: 10.5, halo: false }));
  });
  if (g.axisLabels?.x) out.push(text((pad.l + W - pad.r) / 2, Y(0) + 33, g.axisLabels.x, { size: 11.5, weight: 700, halo: false }));
  out.push(`<g transform="translate(13,${r2((Y(0) + Y(100)) / 2)}) rotate(-90)">${text(0, 0, g.axisLabels?.y || 'Percent', { size: 11.5, weight: 700, halo: false })}</g>`);
  const ly = H - legendH + 4, colW = (W - pad.l) / 3;
  cats.forEach((c, j) => {
    const lx = pad.l + (j % 3) * colW, yy = ly + Math.floor(j / 3) * 18;
    out.push(`<rect x="${r2(lx)}" y="${r2(yy)}" width="14" height="12" fill="${fills[j].fill}" stroke="#000" stroke-width="1"/>`, text(lx + 19, yy + 10.5, c, { size: 10.5, anchor: 'start', halo: false }));
  });
  return { W, H, svg: `<defs>${defs.join('')}</defs>${out.join('')}` };
}

/* ---------- entry points ---------- */
export const isGraphFigure = (fig) => !!fig && typeof fig === 'object' && !Array.isArray(fig) && fig.graph && typeof fig.graph === 'object';

// A scatter plot given by its r draws (and is described) from its generated points.
const withPoints = (g) => ((g.kind === 'scatter' && !(Array.isArray(g.points) && g.points.length) && g.r != null) ? { ...g, points: scatterPoints(g) } : g);

export function graphSvg(g) {
  const uid = 'g' + hashOf(g);
  g = withPoints(g);
  const kind = g.kind || 'plane';
  const r = kind === 'numberLine' ? numberLine(g, uid) : kind === 'boxPlot' ? boxPlot(g) : kind === 'dotPlot' ? dotPlot(g) : kind === 'histogram' ? histogram(g) : kind === 'segmentedBar' ? segmentedBar(g, uid) : plane(g, uid);
  // accessible: a short name (title) and the whole description (what a student reads off it: the data for a data plot)
  const desc = graphText({ graph: g });
  const alt = xmlEsc(g.alt || desc);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r.W}" height="${r.H}" viewBox="0 0 ${r.W} ${r.H}" role="img" aria-label="${alt}"><title>${xmlEsc(plainMath(g.title || graphName(g)))}</title><desc>${xmlEsc(desc)}</desc><rect width="${r.W}" height="${r.H}" fill="#fff"/>${r.svg}</svg>`;
}
const graphName = (g) => ({ scatter: 'Scatter plot', numberLine: 'Number line', boxPlot: 'Box plot', dotPlot: 'Dot plot', histogram: 'Histogram', segmentedBar: 'Segmented bar graph' })[g.kind] || 'Graph';

// The data behind a data plot, as a table for screen readers and the interactive page ({caption, head, rows}), or null.
export function graphTable(fig) {
  if (!isGraphFigure(fig)) return null;
  const g = withPoints(fig.graph);
  const pctTxt = (p) => `${Math.round(p * 10) / 10}%`;
  if (g.kind === 'segmentedBar') {
    return { caption: plainMath(g.title || 'Segmented bar graph'), head: ['', ...(g.categories || []).map((c) => plainMath(c))],
      rows: (g.bars || []).map((b) => [plainMath(String(b.label ?? '')), ...segmentPercents(b).map(pctTxt)]) };
  }
  if (g.kind === 'scatter' && Array.isArray(g.points) && g.points.length) {
    const ax = g.axisLabels || {};
    return { caption: plainMath(g.title || 'Scatter plot'), head: [plainMath(ax.x || 'x'), plainMath(ax.y || 'y')],
      rows: g.points.map((p) => (Array.isArray(p) ? p : p.at)).filter(Boolean).map((p) => [fmt(p[0]).replace('−', '-'), fmt(p[1]).replace('−', '-')]) };
  }
  return null;
}
export function figureToSvg(fig) {
  if (isGraphFigure(fig)) return graphSvg(fig.graph);
  return typeof fig === 'string' ? fig : null;
}

// Every label printed on the graph (after `hide`), for the checks: none may give the key away.
export function graphLabels(fig) {
  if (!isGraphFigure(fig)) return [];
  const g = fig.graph, hide = new Set(g.hide || []), out = [];
  const add = (el) => { const l = visibleLabel(el, hide); if (l) out.push(l); };
  for (const k of ['functions', 'points', 'segments', 'tangents', 'asymptotes']) for (const el of g[k] || []) if (el && !Array.isArray(el) && typeof el === 'object') add(el);
  if (g.line) add(g.line);
  for (const p of g.polygons || []) if (!(p.id && hide.has(p.id))) out.push(...(p.vertexLabels || []).filter(Boolean));
  if (g.title) out.push(g.title);
  if (Array.isArray(g.tickLabels)) out.push(...g.tickLabels.filter(Boolean));
  return out.map(String);
}

// What a student sees on the graph, in words (for the keyless student view a blind tester reads).
export function graphText(fig) {
  if (!isGraphFigure(fig)) return '';
  const g = withPoints(fig.graph), kind = g.kind || 'plane', parts = [];
  const labs = graphLabels(fig);
  if (kind === 'plane' || kind === 'scatter') {
    const [x0, x1] = g.x || [-10, 10], [y0, y1] = g.y || [-10, 10];
    parts.push(`${kind === 'scatter' ? 'scatter plot' : 'coordinate plane'}, x from ${x0} to ${x1}, y from ${y0} to ${y1}${g.grid === false ? '' : ', grid'}`);
    // What a student can read off the grid, never the expression itself (that could be the asked answer).
    const tk = typeof g.ticks === 'object' && g.ticks ? g.ticks : { x: g.ticks, y: g.ticks };
    const xs = Number(tk.x) || niceStep(x1 - x0), ys = Number(tk.y) || niceStep(y1 - y0);
    const nice = (v) => fmt(v).replace('−', '-');
    const trace = (expr, lo = x0, hi = x1) => {
      const f = fn(expr), pts = [];
      for (const x of ticksOf(Math.max(lo, x0), Math.min(hi, x1), xs)) {
        const y = f(x);
        if (Number.isFinite(y) && y >= y0 && y <= y1 && Math.abs(y / ys - Math.round(y / ys)) < 1e-9) pts.push(`(${nice(x)}, ${nice(y)})`);
      }
      if (pts.length >= 2) return `passing through grid points ${pts.slice(0, 6).join(', ')}`;
      const samp = [];
      for (let i = 1; i <= 5; i++) { const x = Math.max(lo, x0) + ((Math.min(hi, x1) - Math.max(lo, x0)) * i) / 6, y = f(x); if (Number.isFinite(y) && y >= y0 && y <= y1) samp.push(`(${nice(x)}, about ${nice(Math.round(y * 10) / 10)})`); }
      return `passing near ${samp.join(', ')}`;
    };
    for (const f of g.functions || []) {
      const fe = fn(f.expr);
      const ends = f.domain ? ` from x = ${f.domain[0]} to x = ${f.domain[1]}${f.ends ? ` (${Object.entries(f.ends).map(([k, v]) => `${v} dot at (${nice(f.domain[k === 'left' ? 0 : 1])}, ${nice(Math.round(fe(f.domain[k === 'left' ? 0 : 1]) * 100) / 100)})`).join(', ')})` : ''}` : '';
      parts.push(`a ${f.style && f.style !== 'solid' ? f.style + ' ' : ''}curve or line${ends}, ${trace(f.expr, ...(f.domain || []))}`);
    }
    for (const a of g.asymptotes || []) parts.push(`a dashed asymptote ${a.x != null ? `x = ${a.x}` : a.y != null ? `y = ${a.y}` : `y = ${a.expr}`}`);
    for (const q of g.inequalities || []) parts.push(`a ${/=/.test(q.sign) ? 'solid' : 'dashed'} boundary ${q.x != null ? `x = ${q.x}` : trace(q.expr)}, shaded ${q.x != null ? (/>/.test(q.sign) ? 'to the right' : 'to the left') : /> /.test(q.sign + ' ') || />/.test(q.sign) ? 'above' : 'below'}`);
    for (const a of g.areas || []) parts.push(`the region under the curve from x = ${a.from} to x = ${a.to}, shaded`);
    for (const t of g.tangents || []) parts.push(`a tangent line touching the curve at x = ${t.at}`);
    if (g.slopeField) parts.push(`a slope field for dy/dx = ${g.slopeField.expr}`);
    const hide = new Set(g.hide || []);
    for (const p of g.points || []) {
      const at = Array.isArray(p) ? p : p.at;
      if (!at) continue;
      if (!Array.isArray(p) && p.id && hide.has(p.id)) parts.push(`an unlabeled ${p.open ? 'open' : 'closed'} dot (the student reads it from the graph)`);
      else parts.push(`a ${p.open ? 'open' : 'closed'} dot at (${at[0]}, ${at[1]})`);
    }
    for (const p of g.polygons || []) parts.push(`a polygon with vertices ${p.points.map((q) => `(${q[0]}, ${q[1]})`).join(', ')}`);
    for (const s of g.segments || []) parts.push(`a segment from (${s.from}) to (${s.to})`);
    if (g.line) parts.push(g.line.fit ? 'a line of best fit' : `the line y = ${g.line.expr}`);
  } else if (kind === 'numberLine') {
    parts.push(`number line from ${g.from} to ${g.to}, ticks every ${g.step || 1}`);
    for (const p of g.points || []) parts.push(`${p.open ? 'open' : 'closed'} dot at ${typeof p === 'number' ? p : p.at}`);
    for (const r of g.rays || []) parts.push(`a ray from ${r.from} (${r.open ? 'open' : 'closed'} dot) to the ${r.dir || 'right'}`);
    for (const s of g.segments || []) parts.push(`a segment from ${s.from} to ${s.to}`);
  } else if (kind === 'boxPlot') {
    const s = g.data ? quartiles(g.data) : g;
    parts.push(`box plot: min ${s.min}, Q1 ${s.q1}, median ${s.median}, Q3 ${s.q3}, max ${s.max}`);
  } else if (kind === 'dotPlot') parts.push(`dot plot of ${(g.values || []).join(', ')}`);
  else if (kind === 'segmentedBar') parts.push(`segmented bar graph (each bar adds to 100%): ${(g.bars || []).map((b) => `${plainMath(String(b.label ?? ''))}: ${segmentPercents(b).map((p, j) => `${plainMath(String((g.categories || [])[j] ?? ''))} ${Math.round(p * 10) / 10}%`).join(', ')}`).join('; ')}`);
  else if (kind === 'histogram') parts.push(`histogram: ${(g.bins || []).map((b) => `${b[0]}–${b[1]}: ${b[2]}`).join('; ') || `${(g.data || []).length} values`}`);
  if (labs.length) parts.push(`labels: ${labs.map(plainMath).join(' · ')}`);
  return parts.join('; ');
}
