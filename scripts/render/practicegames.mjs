// Practice games (menu item `practicegame`; docs/KINDS-PRACTICEGAMES.md).
//
// A practice game is ONE self-contained, offline HTML file built from the pack's questions on a tested template
// (`template`: shooter | grid | fixit) and dressed in the order's theme (`theme`: a preset, a title, a story line,
// emoji sprites and names, an accent color). No network (a Content-Security-Policy forbids it), no outside fonts, no
// accounts; progress is saved only in the browser on the student's device.
//
// Unlike the review apps (docs/KINDS-APPS.md), the answers ARE in the game file as plain data: the game must react
// instantly to a shot or a tap, and it is practice, never a grade. The teacher sheet says so.
//
// Preview: PDFs only (the teacher sheet with every question, answer and why; screenshots of the game), watermarked
// like every preview PDF. Final (after approval): the same PDFs, the HTML game and HOW-TO-SHARE-THE-GAMES.txt.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { esc, vv, cleanSvg, kindOf, tfValue, letter, inkAccent } from './util.mjs';
import { baseCss } from './html.mjs';
import { mathHtml, plainMath, katexCss, mathErrors } from './math.mjs';

const HERE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'practicegames');
const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');
export const PRACTICE_GAME_KIND = 'practicegame';
export const isPracticeGameDoc = (doc) => kindOf(doc) === PRACTICE_GAME_KIND;
export const TEMPLATES = {
  shooter: { name: 'Answer shooter', types: ['mc', 'tf', 'numeric', 'short'] },
  grid: { name: 'Grid battle', types: ['mc', 'tf', 'numeric', 'short'] },
  fixit: { name: 'Fix-it desk', types: ['fixit'] },
};

/* ---------- the reader (the same file the page runs) ---------- */
let reader = null;
export function loadReader() {
  if (reader) return reader;
  const ctx = { globalThis: {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('reader.js'), ctx);
  return (reader = ctx.PGR);
}

/* ---------- themes ---------- */
// Every preset has light and dark colors (all text pairs at 4.5:1 or better) and default sprites and names per template.
const DARK_BASE = { bg: '#14181d', card: '#1f252c', ink: '#eceff2', muted: '#a8b2bc', line: '#3a434d', focus: '#8ab8ff', ok: '#7fd69e', 'ok-soft': '#1d3326', bad: '#f19a84', 'bad-soft': '#3a2420', 'accent-ink': '#10161b' };
const LIGHT_BASE = { bg: '#f5f6f2', card: '#ffffff', ink: '#1b2126', muted: '#56606a', line: '#d4d8d2', focus: '#1b5fb8', ok: '#1f7a46', 'ok-soft': '#e3f3e8', bad: '#a3361f', 'bad-soft': '#fbe9e4', 'accent-ink': '#ffffff' };
export const PRESETS = {
  space: {
    light: { accent: '#3d4fb8', field: '#0d1330', 'field-ink': '#eef1ff', target: '#f4ead8', 'target-ink': '#1d1606', 'target-line': '#c79a52', laser: '#55e6ff', sea: '#dfe6ff', 'sea-line': '#9aa6d6', paper: '#fffdf6', 'paper-ink': '#1b2126' },
    dark: { accent: '#9fb0ff', field: '#070a1c', 'field-ink': '#eef1ff', target: '#2b2f4f', 'target-ink': '#f4ead8', 'target-line': '#c79a52', laser: '#55e6ff', sea: '#1a2142', 'sea-line': '#45508a', paper: '#262b38', 'paper-ink': '#eceff2' },
    sprites: { shooter: { icon: '🚀', hero: '🚀', player: '🚀', target: '☄️', hit: '💥', miss: '🌑' }, grid: { icon: '🛸', hero: '🛸', hit: '💥', miss: '✖️', enemy: '👾' }, fixit: { icon: '🛰️', hero: '👩‍🚀', helpers: ['👩‍🚀', '🧑‍🚀', '👨‍🚀', '🤖', '👽'], stamp: '⭐', ok: '✔️' } },
    names: { shooter: { player: 'ship', target: 'comet', targets: 'comets' }, grid: { enemy: 'the invaders', mine: 'your fleet', ships: ['Star Cruiser', 'Comet Hopper', 'Moon Skiff', 'Orbiter'] }, fixit: { helper: 'cadet', paper: 'flight log', desk: 'Mission Control' } },
  },
  ocean: {
    light: { accent: '#0b6a8a', field: '#0b4a66', 'field-ink': '#eafaff', target: '#fff5e0', 'target-ink': '#14262e', 'target-line': '#e0a23c', laser: '#7cf7ff', sea: '#d8f0f7', 'sea-line': '#8cc3d4', paper: '#fffdf6', 'paper-ink': '#1b2126' },
    dark: { accent: '#6cc9e6', field: '#062633', 'field-ink': '#eafaff', target: '#173543', 'target-ink': '#fff5e0', 'target-line': '#e0a23c', laser: '#7cf7ff', sea: '#0e2f3c', 'sea-line': '#2f6a7d', paper: '#22303a', 'paper-ink': '#eceff2' },
    sprites: { shooter: { icon: '🐠', hero: '🐙', player: '🐙', target: '🫧', hit: '✨', miss: '🌊' }, grid: { icon: '⚓', hero: '⚓', hit: '💥', miss: '💦', enemy: '🏴‍☠️' }, fixit: { icon: '🐚', hero: '🐢', helpers: ['🐢', '🐬', '🦀', '🐙', '🐳'], stamp: '⭐', ok: '✔️' } },
    names: { shooter: { player: 'octopus', target: 'bubble', targets: 'bubbles' }, grid: { enemy: 'the pirates', mine: 'your fleet', ships: ['Galleon', 'Frigate', 'Schooner', 'Sloop'] }, fixit: { helper: 'sailor', paper: 'logbook page', desk: 'the harbor office' } },
  },
  jungle: {
    light: { accent: '#2f6f3e', field: '#1d3b23', 'field-ink': '#f0fbe9', target: '#fbf3d2', 'target-ink': '#1e2410', 'target-line': '#b6902f', laser: '#d6ff7c', sea: '#e3f2d8', 'sea-line': '#9cc48a', paper: '#fffdf3', 'paper-ink': '#1b2126' },
    dark: { accent: '#8fd49c', field: '#0f2113', 'field-ink': '#f0fbe9', target: '#263a24', 'target-ink': '#fbf3d2', 'target-line': '#b6902f', laser: '#d6ff7c', sea: '#16301a', 'sea-line': '#3d6b44', paper: '#25302a', 'paper-ink': '#eceff2' },
    sprites: { shooter: { icon: '🌴', hero: '🐒', player: '🐒', target: '🥥', hit: '💥', miss: '🍂' }, grid: { icon: '🗺️', hero: '🧭', hit: '💥', miss: '🍃', enemy: '🐊' }, fixit: { icon: '🦜', hero: '🦜', helpers: ['🦜', '🐒', '🐸', '🦎', '🐯'], stamp: '⭐', ok: '✔️' } },
    names: { shooter: { player: 'monkey', target: 'coconut', targets: 'coconuts' }, grid: { enemy: 'the crocodiles', mine: 'your camp', ships: ['Big Tent', 'Canoe', 'Lookout', 'Raft'] }, fixit: { helper: 'explorer', paper: 'field note', desk: 'base camp' } },
  },
  classroom: {
    light: { accent: '#9a3f12', field: '#2d4a3e', 'field-ink': '#f4f1e6', target: '#fff8e8', 'target-ink': '#2a1d10', 'target-line': '#c58b3f', laser: '#ffe066', sea: '#f3ece0', 'sea-line': '#c9b89c', paper: '#fffef8', 'paper-ink': '#1b2126' },
    dark: { accent: '#f0a27a', field: '#1a2b24', 'field-ink': '#f4f1e6', target: '#3a2e22', 'target-ink': '#fff8e8', 'target-line': '#c58b3f', laser: '#ffe066', sea: '#2b261e', 'sea-line': '#6b5a40', paper: '#2b2a25', 'paper-ink': '#eceff2' },
    sprites: { shooter: { icon: '✏️', hero: '🧑‍🏫', player: '🖍️', target: '📝', hit: '✅', miss: '❌' }, grid: { icon: '🏫', hero: '🏫', hit: '💥', miss: '✖️', enemy: '🦹' }, fixit: { icon: '✍️', hero: '🧑‍🏫', helpers: ['🐶', '🐱', '🐰', '🦊', '🐼', '🐸'], stamp: '⭐', ok: '✔️' } },
    names: { shooter: { player: 'crayon', target: 'note', targets: 'notes' }, grid: { enemy: 'the rival school', mine: 'your school', ships: ['Bus', 'Library', 'Gym', 'Cafeteria'] }, fixit: { helper: 'student', paper: 'paper', desk: 'your desk' } },
  },
};

const lum = (hex) => {
  const m = String(hex).replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return m.slice(1).map((h) => parseInt(h, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
};
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// lighten a color until it reads on a dark card
function lightAccent(hex, bg) {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let i = 0; i < 40 && contrast(`#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`, bg) < 4.5; i++) [r, g, b] = [r, g, b].map((c) => Math.round(c + (255 - c) * 0.12));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export function themeOf(doc, problems = []) {
  const t = doc.theme || {}, tpl = doc.template;
  const presetName = t.preset || { shooter: 'space', grid: 'ocean', fixit: 'classroom' }[tpl] || 'space';
  const P = PRESETS[presetName];
  if (!P) { problems.push(`${doc.title}: unknown theme preset "${t.preset}" (use ${Object.keys(PRESETS).join(', ')})`); return themeOf({ ...doc, theme: { ...t, preset: 'space' } }); }
  const light = { ...LIGHT_BASE, ...P.light }, dark = { ...DARK_BASE, ...P.dark };
  if (t.accent) {
    if (!/^#[0-9a-f]{6}$/i.test(t.accent)) problems.push(`${doc.title}: theme.accent must be a color like #2b6cb0`);
    else { light.accent = inkAccent(t.accent); dark.accent = lightAccent(t.accent, dark.card); }
  }
  for (const [mode, c] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg, min] of [['ink', 'bg', 7], ['ink', 'card', 7], ['muted', 'card', 4.5], ['accent', 'card', 4.5], ['accent-ink', 'accent', 4.5], ['field-ink', 'field', 4.5], ['target-ink', 'target', 4.5], ['paper-ink', 'paper', 4.5]]) {
      if (contrast(c[fg], c[bg]) < min) problems.push(`${doc.title}: ${mode} colors: ${fg} on ${bg} is ${contrast(c[fg], c[bg]).toFixed(1)}:1 (needs ${min}:1)`);
    }
  }
  const sprites = { ...P.sprites[tpl], ...(t.sprites || {}) };
  const names = { ...P.names[tpl], ...(t.names || {}) };
  return { preset: presetName, light, dark, sprites, names, title: t.title || doc.title, story: t.story || '' };
}
const tokens = (c) => Object.entries(c).map(([k, v]) => `--${k}:${v};`).join('');
function themeCss(theme) {
  return `:root{${tokens(theme.light)}color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${tokens(theme.dark)}color-scheme:dark}}
:root[data-theme="dark"]{${tokens(theme.dark)}color-scheme:dark}`;
}

/* ---------- one question → what the game holds ---------- */
const mh = (s) => mathHtml(String(s ?? ''));
const plain = (s) => plainMath(String(s ?? ''));
const mathProblems = (where, s, problems) => { for (const e of mathErrors(String(s ?? ''))) problems.push(`${where}: math doesn't typeset: ${e}`); };

// A fix-it item's text: exactly one [[error span]]. Pieces are words, except that $…$ math stays one piece; the span's
// pieces are the mistake. Lines break at "\n".
export function fixitParts(text) {
  const s = String(text ?? '');
  const opens = s.split('[[').length - 1, closes = s.split(']]').length - 1;
  if (opens !== 1 || closes !== 1) return { error: `needs exactly one [[mistake]] marked (found ${opens} [[ and ${closes} ]])` };
  const a = s.indexOf('[['), b = s.indexOf(']]');
  if (b < a) return { error: 'the ]] comes before the [[' };
  const before = s.slice(0, a), err = s.slice(a + 2, b), after = s.slice(b + 2);
  if (!err.trim()) return { error: 'the [[mistake]] is empty' };
  return { before, err, after, clean: before + err + after };
}
// Pieces of the whole (clean) text; a piece that overlaps the [[mistake]] (characters a to b) is the mistake.
function pieces(text, a, b) {
  const out = [];
  const re = /\$[^$]+\$[.,;:!?)]*|\n|[^\s$]+/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[0] === '\n') { out.push({ br: 1 }); continue; }
    const end = m.index + m[0].length;
    out.push({ h: mh(m[0]), e: m.index < b && end > a ? 1 : 0, sp: /[ \t]/.test(text[end] || '') ? 1 : 0 });
  }
  return out;
}

export function gameQuestion(q, n, ctx, problems) {
  const { tpl, reader: R, unitMarks, where } = ctx;
  const type = q.type;
  const id = String(q.id || `q${n}`);
  if (!TEMPLATES[tpl].types.includes(type)) { problems.push(`${where}: type ${type} can't be used in the ${TEMPLATES[tpl].name} (use ${TEMPLATES[tpl].types.join(', ')})`); return null; }
  for (const f of ['prompt', 'why']) mathProblems(where, vv(q[f]), problems);
  const prompt = vv(q.prompt);
  const item = { id, n, type, level: vv(q.level) || null, skill: vv(q.skill) || '', why: vv(q.why) ? mh(vv(q.why)) : '' };
  const fig = cleanSvg(vv(q.figure)); if (fig) item.figure = fig;
  const answer = vv(q.answer), accept = vv(q.accept) || [];
  if (type === 'fixit') {
    const parts = fixitParts(prompt);
    if (parts.error) { problems.push(`${where}: ${parts.error}`); return null; }
    item.prompt = mh(parts.clean);
    item.plain = plain(parts.clean);
    item.pieces = pieces(parts.clean, parts.before.length, parts.before.length + parts.err.length);
    if (!item.pieces.some((p) => p.e)) problems.push(`${where}: the [[mistake]] holds no word to tap`);
    if (item.pieces.filter((p) => !p.br && !p.e).length < 3) problems.push(`${where}: a paper needs at least 3 parts that are right, besides the mistake`);
    const choices = vv(q.choices);
    let fixText;
    if (Array.isArray(choices) && choices.length) {
      choices.forEach((c) => mathProblems(where, c, problems));
      if (!(Number.isInteger(answer) && answer >= 0 && answer < choices.length)) { problems.push(`${where}: answer must be the index of the right fix in choices`); return null; }
      item.choices = choices.map(mh); item.choicesPlain = choices.map(plain); item.answer = answer;
      item.choiceWhy = (q.choiceWhy || []).map((w) => (w ? mh(w) : ''));
      fixText = choices[answer];
      const dup = new Set(choices.map((c) => R.normFix(c)));
      if (dup.size !== choices.length) problems.push(`${where}: two fix choices are the same`);
      if (choices.some((c) => R.normFix(c) === R.normFix(parts.err))) problems.push(`${where}: a fix choice is the mistake itself`);
    } else {
      fixText = answer;
      if (answer == null || !String(answer).trim()) { problems.push(`${where}: no fix (answer)`); return null; }
      const forms = [answer, ...accept].map(String);
      if (forms.some((f) => f.includes('$'))) problems.push(`${where}: a typed fix can't be math ($…$); give choices instead`);
      item.typed = { kind: 'fix', texts: [...new Set(forms.map(R.normFix))] };
      item.typedShow = String(answer);
      if (item.typed.texts.includes(R.normFix(parts.err))) problems.push(`${where}: the fix is the same as the mistake`);
    }
    if (R.normFix(fixText) === R.normFix(parts.err)) problems.push(`${where}: the fix is the same as the mistake`);
    mathProblems(where, fixText, problems);
    item.errHtml = mh(parts.err);
    item.fixHtml = mh(fixText);
    item.fixedHtml = `${mh(parts.before)}<ins>${mh(fixText)}</ins>${mh(parts.after)}`;
    item.answerHtml = `<s>${mh(parts.err)}</s> → <b>${mh(fixText)}</b>`;
    return item;
  }
  item.prompt = mh(prompt);
  item.plain = plain(prompt);
  if (type === 'mc' || type === 'tf') {
    const choices = type === 'tf' ? ['True', 'False'] : (vv(q.choices) || []).map(String);
    const ans = type === 'tf' ? (tfValue(answer) ? 0 : 1) : Number(answer);
    if (!(choices.length >= 2 && choices.length <= 6)) problems.push(`${where}: a choice question needs 2–6 choices`);
    if (!(Number.isInteger(ans) && ans >= 0 && ans < choices.length)) { problems.push(`${where}: answer ${JSON.stringify(answer)} is not one of the choices`); return null; }
    choices.forEach((c) => mathProblems(where, c, problems));
    item.choices = choices.map(mh); item.choicesPlain = choices.map(plain); item.answer = ans;
    item.answerHtml = item.choices[ans];
    return item;
  }
  const forms = [answer, ...accept].filter((x) => x != null && String(x).trim() !== '').map(String);
  if (!forms.length) { problems.push(`${where}: no answer to check against`); return null; }
  if (type === 'numeric') {
    const nums = [];
    for (const f of forms) {
      const v = R.parseNum(f.replace(/\$/g, ''), unitMarks);
      if (!v) problems.push(`${where}: the accepted form “${f}” doesn't read as a number`);
      else if (!nums.some((x) => x[0] === v[0] && x[1] === v[1])) nums.push(v);
    }
    item.typed = { kind: 'num', nums };
  } else {
    item.typed = { kind: 'text', texts: [...new Set(forms.map(R.normText))] };
  }
  const unit = vv(q.unit) ? ` ${vv(q.unit)}` : '';
  item.answerHtml = mh(String(answer)) + esc(unit);
  item.typedShow = String(answer) + unit;
  return item;
}

export const storageKeyOf = (pack, base) => `pp-game:${pack.id || 'pack'}:${base}:v1`;
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));

/* The data one game page holds (window.PG_DATA). Returns {data, problems}. Problems are collected, never thrown. */
export function gameData(pack, doc, base, brand = {}) {
  const problems = [], name = doc.title || 'practice game';
  const tpl = doc.template;
  if (!TEMPLATES[tpl]) { problems.push(`${name}: template must be one of ${Object.keys(TEMPLATES).join(', ')} (got ${JSON.stringify(tpl)})`); return { data: null, problems }; }
  if (Array.isArray(doc.versions) && doc.versions.length > 1) problems.push(`${name}: a practice game has one version (drop "versions")`);
  const theme = themeOf(doc, problems);
  const o = pack.order || {};
  const subject = doc.subject || o.subject;
  const unitMarks = (doc.settings?.unitMarks ?? ['math', 'science'].includes(subject));
  const R = loadReader();
  const seen = new Set();
  let n = 0;
  const questions = [];
  for (const sec of doc.sections || []) for (const q of sec.questions || []) {
    const where = `${name} ${q.id || '(no id)'}`;
    if (!q.id) problems.push(`${where}: no id`);
    else if (seen.has(q.id)) problems.push(`${where}: id used twice`);
    seen.add(q.id);
    const item = gameQuestion(q, ++n, { tpl, reader: R, unitMarks, where }, problems);
    if (item) questions.push(item);
  }
  const min = tpl === 'grid' ? 8 : 4;
  if (questions.length < min) problems.push(`${name}: the ${TEMPLATES[tpl].name} needs at least ${min} questions (has ${questions.length})`);
  const data = {
    template: tpl, key: storageKeyOf(pack, base), title: String(theme.title || doc.title || ''),
    sub: [doc.grade || o.grade ? `Grade ${doc.grade || o.grade}` : '', doc.topic || o.topic, o.teacher].filter(Boolean).join(' · '),
    story: theme.story, directions: String(doc.directions || ''),
    notice: `${brand.aiNotice || 'Made with AI.'} ${brand.shortName || brand.name || ''}`.trim(),
    theme: { sprites: theme.sprites, names: theme.names },
    settings: doc.settings || {}, unitMarks, numericKeys: questions.length > 0 && questions.every((q) => q.type === 'numeric'),
    questions,
  };
  return { data, problems, theme };
}

const CSP = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; media-src 'none'; base-uri 'none'; form-action 'none'";

/* The student page: one file, everything inline. */
export function gameHtml(pack, doc, base, brand) {
  const { data, problems, theme } = gameData(pack, doc, base, brand);
  if (!data) return { html: '', data, problems };
  const json = jsonForScript(data);
  const math = json.includes('class=\\"katex');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<title>${esc(data.title)}</title>
<style>${themeCss(theme)}
${read('shell.css')}
${read(`${data.template}.css`)}${math ? `\n${katexCss()}` : ''}</style>
</head><body><header class="top" id="top"></header><main class="wrap" id="app"><noscript>This game needs JavaScript turned on.</noscript></main>
<script>window.PG_DATA=${json};</script>
<script>${read('reader.js')}</script>
<script>${read('core.js')}</script>
<script>${read(`${data.template}.js`)}</script>
</body></html>
`;
  return { html, data, problems };
}

/* ---------- the teacher sheet (preview and final PDF) ---------- */
const HOW = {
  shooter: 'Questions appear one at a time at the top of the play area. Targets carrying the answers fall toward the player; the student taps the right one (or presses its number key) to fire. A typed question sends one big target: the student types the answer before it lands. One shot per question. Every few questions a new wave starts, a little faster. Quick right answers score more; stars come from the share right.',
  grid: 'Two hidden fleets on two grids. Each round the student answers a question: a right answer earns a shot at the enemy grid (tap a square, or use the arrow keys and Enter); a wrong answer shows the right answer and why, and there is no shot. Then the computer fires once at the student\'s fleet. The game ends when the questions run out or a fleet is sunk. Stars: hitting more ship squares than the computer, sinking ships, and 80% right.',
  fixit: 'The student sits at a desk and helpers turn in papers. Each paper has exactly one mistake. The student taps the mistake, then fixes it (picks or types the fix). A wrong tap sends the paper back to the pile; it returns two papers later, and a second wrong tap circles the mistake. Every paper ends fixed and stamped: a star when it was fixed with no slips.',
};
const EXTRA = `
  .item { border: 1pt solid #888; border-radius: 4pt; padding: 7pt 9pt; margin: 0 0 9pt; break-inside: avoid; }
  .item p { margin: 0 0 4pt; } .lbl { font-weight: 700; } .forms { font-size: 10pt; }
  .err { border-bottom: 2pt solid #000; font-weight: 700; background: #eee; }
  ins { text-decoration: none; font-weight: 700; border-bottom: 1.5pt double #000; }
  .facts td:first-child { width: 28%; font-weight: 700; }
  .shots { display: flex; gap: 10pt; align-items: flex-start; flex-wrap: wrap; }
  .shots figure { margin: 0 0 10pt; } .shots img { border: 1pt solid #999; display: block; }
  .shots figcaption { font-size: 9pt; margin-top: 3pt; }
  .screenwide img { width: 100%; }`;
function printPage(title, css, body) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
  return html.includes('class="katex"') ? html.replace('</head>', `<style>${katexCss()}</style></head>`) : html;
}
function keyItemHtml(q, src) {
  const parts = [`<div class="item"><p><b>${q.n}.</b> `];
  if (q.type === 'fixit') {
    const p = fixitParts(vv(src.prompt));
    parts.push(`${mh(p.before)}<span class="err">${mh(p.err)}</span>${mh(p.after)}${q.level ? ` <span class="tag">Level ${esc(q.level)}</span>` : ''}</p>`);
    parts.push(`<div class="key"><b>Mistake:</b> ${q.errHtml} &nbsp; <b>Fix:</b> ${q.fixHtml}`);
    if (q.choices) parts.push(`<div class="forms"><span class="lbl">Fix choices:</span> ${q.choices.map((c, i) => `${letter(i)}. ${i === q.answer ? `<b>${c}</b>` : c}${q.choiceWhy?.[i] && i !== q.answer ? ` <i>(${q.choiceWhy[i]})</i>` : ''}`).join(' · ')}</div>`);
    else if (q.typed.texts.length > 1) parts.push(`<div class="forms"><span class="lbl">Also accepted:</span> ${(vv(src.accept) || []).map((a) => esc(a)).join(' · ')}</div>`);
    parts.push(`<div class="forms"><span class="lbl">Fixed:</span> ${q.fixedHtml}</div>`);
  } else {
    parts.push(`${q.prompt}${q.level ? ` <span class="tag">Level ${esc(q.level)}</span>` : ''}</p>`);
    if (q.figure) parts.push(`<div class="fig">${q.figure}</div>`);
    if (q.choices) parts.push(`<div class="choices c1">${q.choices.map((c, i) => `<div class="ch${i === q.answer ? ' right' : ''}"><span class="l">${letter(i)}.</span><span>${c}</span></div>`).join('')}</div>`);
    parts.push(`<div class="key"><b>Answer:</b> ${q.answerHtml}`);
    if (q.typed) {
      const acc = (vv(src.accept) || []).map(String);
      if (acc.length) parts.push(`<div class="forms"><span class="lbl">Also accepted:</span> ${acc.map((a) => esc(a)).join(' · ')}</div>`);
      parts.push(`<div class="forms">${q.type === 'numeric' ? 'Typed. The game also accepts the same value written another way (3/4, 0.75, 1 1/2, a $ sign, a comma in 1,200)' + (src._unitMarks ? ', or with a unit after the number' : '') + '.' : 'Typed. Capitals, extra spaces, end marks and a leading “a”, “an” or “the” don’t count.'}</div>`);
    }
  }
  if (q.why) parts.push(`<div class="why"><span class="lbl">Why:</span> ${q.why}</div>`);
  parts.push('</div></div>');
  return parts.join('');
}
export function teacherSheetHtml(pack, doc, base, ctx) {
  const o = pack.order || {};
  const { data, theme } = gameData(pack, doc, base, ctx.brand);
  const srcById = new Map((doc.sections || []).flatMap((s) => s.questions || []).map((q) => [String(q.id), { ...q, _unitMarks: data.unitMarks }]));
  const s = theme.sprites, nm = theme.names;
  const types = [...new Set(data.questions.map((q) => q.type))];
  const typeName = { mc: 'multiple choice', tf: 'true/false', numeric: 'typed numbers', short: 'typed words', fixit: 'find and fix the mistake' };
  const body = `<div class="tbanner">PRACTICE GAME · TEACHER SHEET · every question, answer and why</div>
  <h1>${esc(data.title)}</h1>
  <p class="sub">${esc([o.grade && `Grade ${o.grade}`, ctx.subjectLabel, o.topic, o.teacher].filter(Boolean).join(' · '))}</p>
  <table class="facts">
    <tr><td>Game</td><td>${esc(TEMPLATES[data.template].name)}: ${esc(HOW[data.template])}</td></tr>
    <tr><td>Theme</td><td>${esc(theme.preset)} colors · ${esc([...new Set(Object.values(s).flat())].join(' '))}${data.story ? `<br>Story on the start screen: “${esc(data.story)}”` : ''}<br>Names: ${esc(Object.entries(nm).map(([k, v]) => `${k}: ${[].concat(v).join(', ')}`).join(' · '))}</td></tr>
    <tr><td>Questions</td><td>${data.questions.length} (${types.map((t) => `${data.questions.filter((q) => q.type === t).length} ${typeName[t]}`).join(', ')}), in a new random order each game</td></tr>
    <tr><td>Results screen</td><td>Every question missed, with the student’s answer, the right answer and why, and a “Practice my misses” round with only those. The misses are remembered on the device until they’re answered right.</td></tr>
    <tr><td>Device</td><td>One HTML file: phones, tablets, Chromebooks and computers, touch or keyboard, light or dark. Works offline, no accounts, sends nothing anywhere. Progress (best score, stars, misses) is saved only in that browser. Sound is off until the student turns it on.</td></tr>
    <tr><td>Answers</td><td><b>The answers are inside the game file.</b> A game has to react the moment a student taps, so the answers travel with it. A student who opens the file’s code could find them. Use the game for practice, never for a grade.</td></tr>
  </table>
  ${doc.directions ? `<p><b>Directions shown to students:</b> ${esc(doc.directions)}</p>` : ''}
  <h2>Every question</h2>
  ${data.questions.map((q) => keyItemHtml(q, srcById.get(q.id) || {})).join('')}`;
  return printPage(`${doc.title}: teacher sheet`, baseCss(ctx) + EXTRA, body);
}

/* ---------- playing a game in a browser (the screenshots here, and checks/practicegames.mjs) ---------- */
// Opens the file offline: every request that isn't the file itself is blocked and counted.
// `seed` makes Math.random repeatable, so the preview's screenshots and the final's are the same pictures.
export async function openOffline(browser, file, { width = 375, height = 800, theme = 'light', reducedMotion = 'no-preference', storage = true, seed = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion, serviceWorkers: 'block' });
  const outside = [];
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('file:') || u.startsWith('data:')) return route.continue();
    outside.push(u); return route.abort();
  });
  if (seed != null) await context.addInitScript((s) => { let a = s >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  if (!storage) await context.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + file);
  await page.waitForSelector('#pg-play');
  return { context, page, outside, errors };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// What a right (or a wrong) answer to the question on screen is, from the page's own data.
async function currentQ(page) { return page.evaluate(() => { const el = document.querySelector('[data-qid]'); const id = el && el.getAttribute('data-qid'); return id ? window.PG_DATA.questions.find((q) => q.id === id) : null; }); }
const rightTyped = (q) => (q.typed.kind === 'num' ? q.typedShow.replace(/ [a-z].*$/i, '') : q.typedShow);
const wrongTyped = (q) => (q.typed?.kind === 'num' ? '999999' : 'zzzz');

/* Plays one game through the screen, the way a student does. `right(i)` says whether to answer the i-th question
   right. Stops at the results screen (or after `stopAfter` questions, leaving the game on screen). Returns
   {asked, rightCount}. */
export async function playThrough(page, right = () => true, { stopAfter = Infinity, pace = 0 } = {}) {
  let asked = 0, rightCount = 0;
  const T = await page.evaluate(() => window.PG_DATA.template);
  for (let guard = 0; guard < 400; guard++) {
    if (await page.$('#pg-results')) break;
    if (asked >= stopAfter) break;
    if (T === 'shooter') {
      if (await page.$('#sh-next')) { await page.click('#sh-next', { timeout: 2000 }).catch(() => {}); await wait(60); continue; }
      const live = await page.$('#sh-q[data-qid]');
      const tg = await page.$('.tg:not([disabled])');
      if (!live || !tg) { await wait(80); continue; }
      const q = await currentQ(page); const ok = right(asked);
      if (q.typed) { await page.fill('#pg-in', ok ? rightTyped(q) : wrongTyped(q)); await page.press('#pg-in', 'Enter'); }
      else { const c = ok ? q.answer : (q.answer + 1) % q.choices.length; await page.$eval(`.tg[data-c="${c}"]`, (el) => el.click()); }   // a moving target: click it where it is now
      asked++; if (ok) rightCount++;
      await page.waitForFunction(() => document.querySelector('#sh-next') || document.querySelector('#pg-results') || !document.querySelector('.tg[disabled]'), null, { timeout: 8000 });
      await wait(pace);
    } else if (T === 'grid') {
      const state = await page.evaluate(() => document.querySelector('#gb')?.getAttribute('data-phase'));
      if (state === 'ask') {
        const q = await currentQ(page); const ok = right(asked);
        if (q.typed) { await page.fill('#pg-in', ok ? rightTyped(q) : wrongTyped(q)); await page.press('#pg-in', 'Enter'); }
        else { const c = ok ? q.answer : (q.answer + 1) % q.choices.length; await page.click(`#gb-opts button[data-c="${c}"]`); }
        asked++; if (ok) rightCount++;
        await wait(60 + pace);
      } else if (state === 'aim') {
        await page.click('#gb-enemy [data-cell]:not([data-shot])');
        await wait(60);
      } else if (state === 'name') {
        const xy = await page.evaluate(() => document.querySelector('#gb').getAttribute('data-aim'));
        await page.fill('#gb-x', xy.split(',')[0]); await page.fill('#gb-y', xy.split(',')[1]); await page.press('#gb-y', 'Enter');
        await wait(60);
      } else if (await page.$('#gb-next')) { await page.click('#gb-next', { timeout: 2000 }).catch(() => {}); await wait(60 + pace); }
      else await wait(80);
    } else {
      const state = await page.evaluate(() => document.querySelector('#fx')?.getAttribute('data-phase'));
      if (state === 'find') {
        const q = await currentQ(page); const ok = right(asked);
        const sel = ok ? '#fx-paper [data-e="1"]' : '#fx-paper [data-e="0"]:not([data-tried])';
        await page.click(sel);
        if (ok) { asked++; rightCount++; } else asked++;
        await wait(60 + pace);
      } else if (state === 'fix') {
        const q = await currentQ(page);
        if (q.choices) await page.click(`#fx-opts button[data-c="${q.answer}"]`);
        else { await page.fill('#pg-in', q.typedShow); await page.press('#pg-in', 'Enter'); }
        await wait(60 + pace);
      } else if (await page.$('#fx-next')) { await page.click('#fx-next', { timeout: 2000 }).catch(() => {}); await wait(60 + pace); }
      else await wait(80);
    }
  }
  return { asked, rightCount };
}

export async function screenshots(browser, file) {
  const shots = [];
  for (const [width, height, label] of [[375, 740, 'Phone (375 px)'], [1280, 800, 'Computer (1280 px)']]) {
    const { context, page } = await openOffline(browser, file, { width, height, reducedMotion: 'reduce', seed: 7 });
    shots.push({ label: `${label}: start`, width, png: await page.screenshot({ type: 'png' }) });
    await page.click('#pg-play');
    await playThrough(page, (i) => i % 3 !== 1, { stopAfter: 2 });
    await wait(150);
    shots.push({ label: `${label}: playing`, width, png: await page.screenshot({ type: 'png' }) });
    if (width === 375) {
      await playThrough(page, (i) => i % 3 !== 1);
      await page.waitForSelector('#pg-results');
      shots.push({ label: `${label}: results`, width, png: await page.screenshot({ type: 'png' }) });
    }
    await context.close();
  }
  return shots;
}
function shotsHtml(doc, ctx, shots) {
  const phone = shots.filter((s) => s.width < 600), wide = shots.filter((s) => s.width >= 600);
  const img = (s, w) => `<figure><img src="data:image/png;base64,${s.png.toString('base64')}" style="width:${w}" alt="${esc(s.label)}"><figcaption>${esc(s.label)}</figcaption></figure>`;
  const body = `<h1>${esc(doc.title)}: what students see</h1>
  <p class="small">Screenshots of the game on a phone and on a computer, made from this preview's content (a few questions answered, one of them wrong on purpose, so the screens show the feedback).
  The game itself comes with the final files, after you approve; it works offline, with no accounts, and saves only on the student's device.</p>
  <div class="shots">${phone.map((s) => img(s, '2.05in')).join('')}</div>
  <div class="screenwide pb">${wide.map((s) => img(s, '100%')).join('')}</div>`;
  return printPage(`${doc.title}: screens`, baseCss(ctx) + EXTRA, body);
}

export function shareText(brand, files) {
  return [
    'HOW TO SHARE THE PRACTICE GAMES',
    '',
    'Each game is one HTML file. It works offline, needs no accounts and sends nothing anywhere: a student\'s best score,',
    'stars and missed questions are saved only in the browser on their own device (a private window, or clearing the',
    'browser\'s data, erases them). Sound is off until the student turns it on.',
    '',
    ...files.map((f) => `  ${f}`),
    '',
    'Ways to share one:',
    '  - Email it, or post it as a file: students download it and open it in any browser (phone, tablet, Chromebook, computer).',
    '  - Google Drive or Classroom: upload the file. Students download it and open it in a browser; Drive\'s own preview',
    '    shows the code, not the game.',
    '  - Any static web host (your school site, GitHub Pages, Netlify, Google Sites "embed code"): upload the file as is.',
    '  - On a projector: open it on the teacher computer and let the class call out answers.',
    '',
    'The answers are inside the game file (a game has to react the moment a student taps). A student who opens the',
    'code could find them, so use the games for practice, never for grades. The teacher sheet (…-teacher.pdf) lists',
    'every question with its answer and why.',
    '',
    `${brand.aiNotice || ''}`,
  ].join('\n') + '\n';
}

/* ---------- the renderer's hook: one practice game ---------- */
// io: { pdf(file, html, label, what, title), write(file, buf, what), browser }
export async function renderPracticeGameDoc(doc, base, ctx, io) {
  const { pack, brand } = ctx;
  const { html, problems } = gameHtml(pack, doc, base, brand);
  if (problems.length) throw new Error(`${doc.title}: ${problems.join('; ')}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-game-'));
  try {
    const file = path.join(tmp, `${base}.html`);
    fs.writeFileSync(file, html);
    const shots = await screenshots(io.browser, file);
    await io.pdf(`${base}-teacher.pdf`, teacherSheetHtml(pack, doc, base, ctx), `${doc.title} · Teacher sheet`, `${doc.title}: teacher sheet (how the game plays, every question with its answer and why)`, doc.title);
    await io.pdf(`${base}-screens.pdf`, shotsHtml(doc, ctx, shots), `${doc.title} · Screens`, `${doc.title}: screenshots of the game`, doc.title);
    io.write(`${base}.html`, html, `${doc.title}: the practice game (one offline file for students)`);
    ctx.gameFiles = [...(ctx.gameFiles || []), `${base}.html`];
    const last = pack.documents.filter(isPracticeGameDoc).at(-1) === doc;
    if (last && !ctx.preview) io.write('HOW-TO-SHARE-THE-GAMES.txt', shareText(brand, ctx.gameFiles), 'How to share the practice games (email, Google Drive or Classroom, any website)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
