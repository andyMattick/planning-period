/* Shared helpers for the checks: read a pack.json (docs/PACK-FORMAT.md), turn every question into one row per version,
   and compare choices by text and by value. `valueOf` is copied from Pet World (scripts/notes/choice-gate.mjs, Nov 5,
   2026) so a number choice reads the same way it does there. */
import { readFileSync, writeFileSync } from 'node:fs';

export const TYPES = ['mc', 'short', 'numeric', 'open', 'match', 'tf'];
// documents where the answers are handed back (practice) and where they are not (assessment)
export const TEST_KINDS = ['test'];
export const VERSIONED_KINDS = ['quiz', 'test'];
export const SCORED_KINDS = ['worksheet', 'quiz', 'test', 'studyguide', 'reviewgame', 'homework', 'bellringer'];

export function loadPack(path) {
  let pack;
  try { pack = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { throw new Error(`${path}: not readable JSON (${e.message})`); }
  if (!pack || typeof pack !== 'object' || !Array.isArray(pack.documents)) throw new Error(`${path}: no documents list`);
  return pack;
}
export function savePack(path, pack) { writeFileSync(path, JSON.stringify(pack, null, 2) + '\n'); }

// a field given per version ({A: …, B: …}) rather than shared by both versions
export const perVersion = (f) => !!f && typeof f === 'object' && !Array.isArray(f) && Object.keys(f).length > 0 && Object.keys(f).every((k) => /^[A-Z]$/.test(k));
export const pick = (f, ver) => (perVersion(f) ? f[ver] : f);
export const versionsOf = (doc) => (Array.isArray(doc.versions) && doc.versions.length ? doc.versions : [null]);
// a whole unit pack holds several documents under one item; each may say what it is with `kind` (worksheet, quiz, test…)
export const kindOf = (doc) => doc.kind || doc.item;
export const docName = (doc, i) => doc.title || `${doc.item || 'document'} ${i + 1}`;

// one row per question per version
export function rows(pack) {
  const out = [];
  pack.documents.forEach((doc, d) => {
    const vers = versionsOf(doc);
    (doc.sections || []).forEach((sec, s) => (sec.questions || []).forEach((q, n) => {
      for (const ver of vers) {
        out.push({
          doc, d, docTitle: docName(doc, d), kind: kindOf(doc), sec, s, q, n, ver,
          id: q.id || `s${s + 1}q${n + 1}`,
          where: `${docName(doc, d)}${ver ? ' ' + ver : ''} ${q.id || `s${s + 1}q${n + 1}`}`,
          type: q.type, level: pick(q.level, ver), skill: pick(q.skill, ver),
          prompt: pick(q.prompt, ver), choices: pick(q.choices, ver), answer: pick(q.answer, ver),
          accept: pick(q.accept, ver), why: pick(q.why, ver), figure: pick(q.figure, ver),
        });
      }
    }));
  });
  return out;
}

export const norm = (s) => String(s ?? '').toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').replace(/[.!?;:,]+$/, '').trim();
// what makes two questions "the same question": the prompt, the picture and the choices (as a set) or the answer
export const signature = (r) => [norm(r.prompt), String(r.figure || ''), Array.isArray(r.choices) ? r.choices.map(norm).sort().join('¦') : norm(r.answer)].join('‖');

/* ---------- exact values (from Pet World scripts/notes/choice-gate.mjs) ---------- */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const R = (p, q = 1) => { if (q < 0) { p = -p; q = -q; } const g = gcd(p, q); return [p / g, q / g]; };
const dec = (s) => { const [w, f = ''] = s.split('.'); return R(Number(w || 0) * 10 ** f.length + Number(f || 0), 10 ** f.length); };
// the exact value of a number or a plain arithmetic expression (+ − × ÷ / ( ) | |, %, mixed numbers), or null for words
export function valueOf(text) {
  let s = String(text).replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, ':').replace(/\$/g, '').replace(/,(?=\d{3})/g, '').trim();
  if (!s || /[a-z]/i.test(s) || !/\d/.test(s) || /[̅]/.test(s)) return null;   // words, or bar notation
  s = s.replace(/(\d+) (\d+)\/(\d+)/g, '($1+$2/$3)');
  const toks = s.match(/\d+(?:\.\d+)?%?|[-+*:/()|]/g);
  if (!toks || toks.join('') !== s.replace(/\s+/g, '')) return null;
  let i = 0;
  const add = (a, b) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]), mul = (a, b) => R(a[0] * b[0], a[1] * b[1]);
  const div = (a, b) => (b[0] === 0 ? null : R(a[0] * b[1], a[1] * b[0]));
  function atom() {
    const t = toks[i++];
    if (t === '-') { const a = atom(); return a && [-a[0], a[1]]; }
    if (t === '+') return atom();
    if (t === '(') { const a = expr(); if (toks[i++] !== ')') throw 0; return a; }
    if (t === '|') { const a = expr(); if (toks[i++] !== '|') throw 0; return a && [Math.abs(a[0]), a[1]]; }
    if (t && /^\d/.test(t)) return t.endsWith('%') ? mul(dec(t.slice(0, -1)), [1, 100]) : dec(t);
    throw 0;
  }
  function term() { let a = atom(); while (a && /^[*:/]$/.test(toks[i] || '')) { const op = toks[i++], b = atom(); a = b && (op === '*' ? mul(a, b) : div(a, b)); } return a; }
  function expr() { let a = term(); while (a && /^[-+]$/.test(toks[i] || '')) { const op = toks[i++], b = term(); a = b && add(a, op === '-' ? [-b[0], b[1]] : b); } return a; }
  try { const v = expr(); return i === toks.length ? v : null; } catch (e) { return null; }
}
export const sameValue = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

/* ---------- --write: add this run to pack.checks.wilco ---------- */
export function nextRound(pack, check) {
  const list = (pack.checks && pack.checks.wilco) || [];
  return 1 + list.filter((e) => (e.check || 'test-wise') === check).reduce((m, e) => Math.max(m, Number(e.round) || 0), 0);
}
export function writeWilco(path, pack, entry) {
  pack.checks = pack.checks || {};
  pack.checks.wilco = pack.checks.wilco || [];
  pack.checks.wilco.push(entry);
  savePack(path, pack);
}
export function argsOf(argv) {
  const a = argv.slice(2), flags = new Set(a.filter((x) => x.startsWith('--')));
  const opt = (n) => { const i = a.indexOf(`--${n}`); return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : null; };
  const vals = new Set(['round', 'json', 'pass'].map((n) => opt(n)).filter(Boolean));
  return { flags, opt, files: a.filter((x) => !x.startsWith('--') && !vals.has(x)) };
}
