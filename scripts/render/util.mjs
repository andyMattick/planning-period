// Shared helpers for the pack renderer. Nothing here knows the product's name:
// the brand always comes from brand.config.json.
import { isGraphFigure, graphSvg } from './graph.mjs';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const letter = (i) => String.fromCharCode(65 + i);

// A value that differs by version is an object keyed by version letters: {"A": …, "B": …}.
export function isVersioned(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const keys = Object.keys(x);
  return keys.length > 0 && keys.every((k) => /^[A-Z]$/.test(k));
}

// Pick the value for one version (falls back to the first version given).
export function vv(x, ver) {
  if (!isVersioned(x)) return x;
  if (ver && ver in x) return x[ver];
  return x[Object.keys(x)[0]];
}

/* The subject as the teacher wrote it: "Other (say which)" plus her own words (order.subjectOther) prints her words. */
export function subjectLabelOf(menu, order = {}) {
  const other = typeof order.subjectOther === 'string' ? order.subjectOther.trim() : '';
  if (order.subject === 'other' && other) return other;
  return menu?.subjects?.find((s) => s.id === order.subject)?.label || order.subject || '';
}

export function slug(s) {
  return (
    String(s || 'document')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'document'
  );
}

// Strip anything active from an agent-written SVG before it is shown or rasterized.
// A graph given as data (`{graph: {...}}`, docs/KINDS-MATH.md) is drawn to SVG first.
export function cleanSvg(svg) {
  if (isGraphFigure(svg)) svg = graphSvg(svg.graph);
  if (typeof svg !== 'string' || !/<svg[\s>]/i.test(svg)) return null;
  let s = svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href\s*=\s*["'])\s*javascript:[^"']*/gi, '$1#');
  // Give it a size when it only has a viewBox, so it doesn't fall back to 300x150.
  const open = s.match(/<svg[^>]*>/i)[0];
  if (!/\swidth\s*=/.test(open)) {
    const vb = open.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (vb) s = s.replace(open, open.replace(/<svg/i, `<svg width="${vb[1]}" height="${vb[2]}"`));
  }
  if (!/xmlns=/.test(open)) s = s.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return s;
}

// Reading passages (docs/PACK-FORMAT.md, "Passages"): documents[].passages = [{id, title, kind, paragraphs, source}].
// Only passages with a paragraphs list are reading passages (a review app's memorize passages use `text`).
export function readingPassages(doc, ver) {
  const list = vv(doc.passages, ver);
  return (Array.isArray(list) ? list : []).filter((p) => p && Array.isArray(vv(p.paragraphs, ver)) && vv(p.paragraphs, ver).length);
}
// The passage ids a section or a question points at (`passage`: an id or a list of ids, maybe per version).
export function passageRefs(x, ver) {
  const r = vv(x?.passage, ver);
  return (Array.isArray(r) ? r : r ? [r] : []).map(String);
}
// What the line under a passage's title says: its kind and where it is from.
export function passageByline(p) {
  const kind = { fiction: 'Fiction', nonfiction: 'Nonfiction', poem: 'Poem', drama: 'Drama' }[p.kind] || '';
  const src = p.source;
  const from = !src || src === 'original' ? 'Written for this quiz' : typeof src === 'string' ? src : src.citation ? `From ${src.citation}` : '';
  return [kind, from].filter(Boolean).join(' · ');
}
// The order passages print in: each one just before the first section or question that cites it; a passage nothing
// cites prints at the top of the document. Returns {top: [passages], before: Map(sectionIndex -> [passages]),
// beforeQ: Map(question -> [passages])}.
export function passagePlan(doc, ver) {
  const ps = readingPassages(doc, ver), byId = new Map(ps.map((p) => [String(p.id), p]));
  const done = new Set(), before = new Map(), beforeQ = new Map();
  const take = (ids) => ids.filter((id) => byId.has(id) && !done.has(id)).map((id) => (done.add(id), byId.get(id)));
  (doc.sections || []).forEach((sec, si) => {
    const s = take(passageRefs(sec, ver));
    if (s.length) before.set(si, s);
    for (const q of sec.questions || []) { const t = take(passageRefs(q, ver)); if (t.length) beforeQ.set(q, t); }
  });
  return { top: ps.filter((p) => !done.has(String(p.id))), before, beforeQ };
}

// Shared data sets (docs/PACK-FORMAT.md, "Shared data sets"): documents[].stimuli = [{id, title, intro, table, figure}]
// (the list, or any field, may be per version). A question cites one with `stimulus: <id>`; the questions that cite
// it are its group. On paper the data set prints once, just before the group's first question; on the interactive page
// it shows with each of its questions.
export function stimuliOf(doc, ver) {
  const list = vv(doc.stimuli, ver);
  return (Array.isArray(list) ? list : []).filter((x) => x && x.id != null).map((x) => ({
    id: String(x.id), title: vv(x.title, ver), intro: vv(x.intro, ver), table: vv(x.table, ver), figure: vv(x.figure ?? x.plot, ver),
  }));
}
export const stimulusRef = (q, ver) => { const r = vv(q?.stimulus, ver); return r == null || r === '' ? null : String(r); };
// {byId: Map(id -> stimulus), first: Map(question -> stimulus printed before it), groups: Map(id -> [question numbers])}
export function stimulusPlan(doc, ver) {
  const byId = new Map(stimuliOf(doc, ver).map((x) => [x.id, x]));
  const first = new Map(), groups = new Map();
  for (const { q, n } of questionsOf(doc)) {
    const id = stimulusRef(q, ver);
    if (!id || !byId.has(id)) continue;
    if (!groups.has(id)) { groups.set(id, []); first.set(q, byId.get(id)); }
    groups.get(id).push(n);
  }
  return { byId, first, groups };
}
// "Use this for questions 3–5." (consecutive) or "questions 3, 5 and 6."
export function groupLine(ns) {
  if (!ns || !ns.length) return '';
  if (ns.length === 1) return `Use this for question ${ns[0]}.`;
  const run = ns.every((n, i) => i === 0 || n === ns[i - 1] + 1);
  return `Use this for questions ${run ? `${ns[0]}–${ns[ns.length - 1]}` : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`}.`;
}

// Multi-part long answers (docs/PACK-FORMAT.md, "Multi-part answers"): a short or open question may have
// parts: [{label: "a", prompt, answer, checklist: ["…"], points}]; each field may be per version.
export const partsOf = (q, ver) => (Array.isArray(vv(q?.parts, ver)) ? vv(q.parts, ver) : []).map((p, i) => ({
  label: String(vv(p.label, ver) ?? String.fromCharCode(97 + i)), prompt: vv(p.prompt, ver) ?? '', answer: vv(p.answer, ver),
  checklist: (Array.isArray(vv(p.checklist, ver)) ? vv(p.checklist, ver) : []).map(String), points: p.points != null && !Number.isNaN(Number(p.points)) ? Number(p.points) : null,
}));

// One version per student (docs/PACK-FORMAT.md, "One version per student"): doc.pool = {students, size, seed, codes,
// versions: [{code, questions: {<id>: {prompt, choices, answer, …}}, stimuli: {<id>: {intro, table, figure, …}}}]},
// made by scripts/versions.mjs --pool from version A's gen spec. Each pool version as a plain document (no versions):
// [{code, doc}]. Fields a pool version doesn't list are version A's.
export const hasPool = (doc) => !!(doc && doc.pool && Array.isArray(doc.pool.versions) && doc.pool.versions.length);
export function flatVersion(doc, ver = 'A') {
  const d = structuredClone(doc);
  delete d.versions; delete d.pool; delete d.gen;
  const flat = (o) => { for (const [k, v] of Object.entries(o)) if (k !== 'gen' && isVersioned(v)) o[k] = vv(v, ver); delete o.gen; };
  for (const sec of d.sections || []) { for (const k of ['directions', 'passage']) if (isVersioned(sec[k])) sec[k] = vv(sec[k], ver); for (const q of sec.questions || []) { flat(q); if (q.math && isVersioned(q.math.check)) q.math = { ...q.math, check: vv(q.math.check, ver) }; } }
  if (isVersioned(d.directions)) d.directions = vv(d.directions, ver);
  if (d.stimuli) { d.stimuli = vv(d.stimuli, ver); if (Array.isArray(d.stimuli)) d.stimuli.forEach(flat); }
  return d;
}
export function poolDocs(doc) {
  if (!hasPool(doc)) return [];
  return doc.pool.versions.map((pv) => {
    const d = flatVersion(doc, 'A');
    for (const sec of d.sections || []) for (const q of sec.questions || []) Object.assign(q, structuredClone((pv.questions || {})[q.id] || {}));
    for (const st of Array.isArray(d.stimuli) ? d.stimuli : []) Object.assign(st, structuredClone((pv.stimuli || {})[st.id] || {}));
    d.title = doc.title; d.code = pv.code;
    return { code: pv.code, doc: d };
  });
}

// Every question, numbered straight through the document's sections.
export function questionsOf(doc) {
  const out = [];
  let n = 0;
  (doc.sections || []).forEach((sec, si) => {
    (sec.questions || []).forEach((q) => out.push({ q, n: ++n, si, section: sec }));
  });
  return out;
}

export function tfValue(a) {
  if (typeof a === 'boolean') return a;
  return /^(t|true|yes|1)$/i.test(String(a).trim());
}

// The key, as text, for one version of one question.
export function answerText(q, ver) {
  const a = vv(q.answer, ver);
  const type = q.type || 'short';
  if (type === 'mc') {
    const ch = vv(q.choices, ver) || [];
    const i = Number(a);
    return Number.isInteger(i) && ch[i] != null ? `${letter(i)}. ${ch[i]}` : String(a ?? '');
  }
  if (type === 'tf') return tfValue(a) ? 'True' : 'False';
  if (type === 'match') {
    const arr = Array.isArray(a) ? a : [];
    return arr.map((ci, i) => `${i + 1}–${letter(Number(ci))}`).join(', ');
  }
  if (Array.isArray(a)) return a.join('; ');
  const parts = partsOf(q, ver);
  if (parts.length && (a == null || a === '')) return parts.map((p) => `(${p.label}) ${p.answer ?? ''}`).join(' ');
  return String(a ?? '');
}

export const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
export const int = (n) => (Number(n) || 0).toLocaleString('en-US');

// Safe font stack with the teacher's font first.
export function fontStack(font) {
  const clean = String(font || '').replace(/["';{}<>]/g, '').trim();
  const serif = /serif|times|georgia|garamond|cambria|palatino|book|baskerville/i.test(clean) && !/sans/i.test(clean);
  const tail = serif
    ? '"Liberation Serif", "Times New Roman", Georgia, "DejaVu Serif", serif'
    : '"Liberation Sans", Arial, "Helvetica Neue", Helvetica, "DejaVu Sans", sans-serif';
  return clean ? `"${clean}", ${tail}` : tail;
}

// The teacher's accent, darkened until it reads as text on white and survives a grayscale printer.
export function inkAccent(hex) {
  let m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return '#222222';
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  const lum = (r, g, b) => {
    const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  for (let i = 0; i < 40 && 1.05 / (lum(r, g, b) + 0.05) < 7; i++) {
    r = Math.round(r * 0.9);
    g = Math.round(g * 0.9);
    b = Math.round(b * 0.9);
  }
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

// Layout choices: explicit style.layout fields first, then what the notes say.
export function layoutOf(style = {}) {
  const notes = (style.notes || []).join(' ').toLowerCase();
  const L = style.layout || {};
  return {
    nameBox: L.nameBox ?? (/box/.test(notes) && /name/.test(notes)),
    boldDirections: L.boldDirections ?? (/bold direction/.test(notes) || !/plain direction/.test(notes)),
    numbering: L.numbering || (/\d\)/.test(notes) ? '1)' : '1.'),
    choiceStyle: L.choiceStyle || 'A.',
    fields: Array.isArray(L.fields) && L.fields.length ? L.fields : ['Name', 'Date'],
    fontSize: Number(L.fontSize) || 12,
    workLines: L.workLines ?? (/show (your )?work/.test(notes) ? 3 : 2),
  };
}

export function numLabel(n, layout) {
  return layout.numbering === '1)' ? `${n})` : `${n}.`;
}
export function choiceLabel(i, layout) {
  const L = letter(i);
  return layout.choiceStyle === '(A)' ? `(${L})` : layout.choiceStyle === 'A)' ? `${L})` : `${L}.`;
}

// Fields removed from project.json: anything that looks like a secret or an internal note.
const SECRET = /^(_|secret|private)|api.?key|password|passcode|access.?token|refresh.?token|bearer|^auth$|authorization|auth.?token|session.?id|cookie|card.?number|payment|stripe|signed.?url|upload.?url/i;
export function scrubSecrets(x) {
  if (Array.isArray(x)) return x.map(scrubSecrets);
  if (!x || typeof x !== 'object') return x;
  const out = {};
  for (const [k, v] of Object.entries(x)) if (!SECRET.test(k)) out[k] = scrubSecrets(v);
  return out;
}

// Display formats, used everywhere a number is printed: minutes to 1 decimal, money to 2, percents whole.
export const mins = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '—' : Number(n).toFixed(1));
export const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;

// What a document is: a whole unit pack's parts and a "versions" order say it with `kind`.
export const kindOf = (doc) => doc.kind || doc.item;

// The key with its unit ("13 boxes"), unless the key already says it.
export function keyText(q, ver) {
  const t = answerText(q, ver);
  const unit = vv(q.unit, ver);
  if (!unit || (q.type || 'short') === 'mc' || ['tf', 'match'].includes(q.type)) return t;
  return new RegExp(`\\b${String(unit).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i').test(t) ? t : `${t} ${unit}`;
}

// Blank work lines under a question on the student copy: `space` wins; else open 6, numeric the layout's work lines,
// and a level 3 multiple-choice question in math 3.
export function workLinesFor(q, ctx) {
  if (q.space != null) return Number(q.space) || 0;
  const type = q.type || 'short';
  if (type === 'open') return 6;
  if (type === 'numeric') return ctx.layout.workLines;
  if (type === 'mc' && Number(q.level) === 3 && ctx.pack?.order?.subject === 'math') return 3;
  return 0;
}

// The teacher may skip the blind check (owner, Nov 8, 2026: order.checks.blind = false on the order page). Every place
// she reads the pack says so on its first page: the audit report, the preview's review, the teacher copies.
export const BLIND_SKIPPED_LINE = 'Blind check skipped at your request — please work through the test yourself before students see it.';
export const blindSkipped = (pack) => !!(pack && pack.order && pack.order.checks && pack.order.checks.blind === false);
