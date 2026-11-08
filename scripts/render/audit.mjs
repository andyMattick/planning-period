// AUDIT-REPORT.pdf. Every number here is counted from the pack: nothing is estimated or rounded up.
// Display formats are the same everywhere: minutes to 1 decimal, money to 2, percents whole (util.mjs).

import { esc, money, int, mins, pct, questionsOf, inkAccent, fontStack, vv, keyText, BLIND_SKIPPED_LINE, blindSkipped } from './util.mjs';
import { gameItemCount } from './games.mjs';
import { plainMath } from './math.mjs';
import { gradingRows, needsHowToGrade, pointsOf } from './grading.mjs';

const CHECK_NAMES = { blind: '🙈 Blind tester', solver: '🧮 Solver', wilco: '🤖 Wilco', facts: '🔎 Fact checker' };
const norm = (s) => String(s || '').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
// "🤖 Wilco (keys)" and "🙈 Blind tester (math), recheck" belong to "Wilco" and "Blind tester".
const baseName = (s) => norm(String(s || '').replace(/\(.*?\)|,.*$/g, ''));
const NOT_CHECKERS = /maker|reporter|auditor|order lead|style notes/i;

// One count from the findings, used in the sentence, the tile and the findings list:
//   fixed    a FIX that was fixed
//   open     a FIX not fixed yet (left for the teacher)
//   kept     a KEEP, or a JUDGMENT the agents settled (it has `fixed`)
//   teacher  a JUDGMENT left for the teacher to decide (or any finding with `forTeacher: true`)
export function bucketOf(f) {
  const kind = String(f.kind || 'FIX').toUpperCase();
  if (f.forTeacher) return kind === 'FIX' && !f.fixed ? 'open' : 'teacher';
  if (kind === 'FIX') return f.fixed ? 'fixed' : 'open';
  if (kind === 'KEEP') return 'kept';
  return f.fixed ? 'kept' : 'teacher';
}
const BUCKET = {
  teacher: { pill: 'For you to decide', right: 'Why it is left for you', dark: false, open: true },
  open: { pill: 'Not fixed: for you', right: 'Not fixed yet', dark: false, open: true },
  fixed: { pill: 'Fixed', right: 'After · how it was fixed', dark: true },
  kept: { pill: 'Looked at and kept', right: 'Why it was kept', dark: false },
};
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function auditStats(pack) {
  const log = pack.log || [];
  const checks = pack.checks || {};
  const findings = [];
  const runs = [];
  for (const kind of Object.keys(CHECK_NAMES)) {
    for (const r of checks[kind] || []) {
      runs.push({ kind, ...r });
      for (const f of r.findings || []) findings.push({ check: kind, round: r.round ?? 1, agent: r.agent || CHECK_NAMES[kind], ...f, bucket: bucketOf(f) });
    }
  }
  const agents = new Map();
  for (const l of log) if (l.who && !agents.has(norm(l.who))) agents.set(norm(l.who), l.who);
  const logBases = new Set(log.map((l) => baseName(l.who)));
  for (const r of runs) {
    const who = r.agent || CHECK_NAMES[r.kind];
    if (!logBases.has(baseName(who)) && !agents.has(norm(who))) agents.set(norm(who), who);
  }
  // A finding with sameAs {check, round, where} is an earlier finding found again: it is counted once, under the
  // earlier one ("found again in round N"). If the earlier one has no fix text, the later one's counts for it.
  const all = findings.splice(0);
  for (const f of all) {
    const ref = f.sameAs;
    const orig = ref && all.find((o) => o !== f && !o.sameAs && o.check === (ref.check || f.check) && Number(o.round) === Number(ref.round) && o.where === (ref.where || f.where));
    if (!orig) {
      findings.push(f);
      continue;
    }
    (orig.again ||= []).push(f);
    if (!orig.fixed && f.fixed) {
      orig.fixed = f.fixed;
      orig.bucket = bucketOf(orig);
    }
  }
  const count = (b) => findings.filter((f) => f.bucket === b).length;
  // The order's rounds: an explicit pack.rounds, or the highest round of the blind, fact and solver checks.
  // Wilco's runs are counted on their own (it reruns after every change, so its round counter runs ahead).
  const roundOf = (r) => Number(r.round) || 1;
  const orderRuns = runs.filter((r) => r.kind !== 'wilco');
  const rounds = Number(pack.rounds) || (orderRuns.length ? Math.max(...orderRuns.map(roundOf)) : runs.length ? Math.max(...runs.map(roundOf)) : 0);
  const questionsInPack = (pack.documents || []).reduce((s, d) => s + (questionsOf(d).length || gameItemCount(d)) * Math.max(1, (d.versions || []).length), 0); // games: docs/KINDS-GAMES.md
  const checkedCounts = runs.map((r) => Number(r.of ?? r.checked ?? 0)).filter(Boolean);
  const fixed = count('fixed'), open = count('open');
  return {
    log,
    runs,
    findings,
    agents: [...agents.values()],
    rounds,
    checkRuns: orderRuns.length,
    wilcoRuns: runs.length - orderRuns.length,
    duplicates: all.length - findings.length,
    questionsInPack,
    questionsChecked: checkedCounts.length ? Math.max(...checkedCounts) : 0,
    fixFound: fixed + open,
    fixed,
    open,
    kept: count('kept'),
    teacher: count('teacher'),
    minutes: log.reduce((s, l) => s + (Number(l.minutes) || 0), 0),
    unlogged: log.filter((l) => l.minutes == null).length,
    tokens: log.reduce((s, l) => s + (Number(l.tokens) || 0), 0),
    cost: log.reduce((s, l) => s + (Number(l.cost) || 0), 0),
    first: log[0]?.at,
    last: log[log.length - 1]?.at,
  };
}

// The same sentence parts wherever the findings are counted.
function findingWords(st) {
  const parts = [];
  if (st.fixFound) parts.push(`${plural(st.fixFound, 'problem')} needed a fix: ${st.fixed === st.fixFound ? (st.fixed === 1 ? 'it was fixed' : `all ${st.fixed} were fixed`) : `${st.fixed} fixed, ${st.open} not fixed yet and left for you`}.`);
  else parts.push('Nothing needed a fix.');
  if (st.kept) parts.push(`${plural(st.kept, 'more was', 'more were')} looked at and kept on purpose.`);
  if (st.teacher) parts.push(`${st.teacher} ${st.teacher === 1 ? 'is a judgment call' : 'are judgment calls'} left for you to decide.`);
  return parts.join(' ');
}

function css(ctx) {
  const accent = inkAccent(ctx.style.accent);
  return `
  @page { size: Letter; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: ${fontStack(null)}; font-size: 10.5pt; line-height: 1.4; color: #000; background: #fff; }
  .brand { font-size: 9pt; letter-spacing: .08em; text-transform: uppercase; color: #333; border-bottom: 1pt solid #000; padding-bottom: 4pt; display: flex; justify-content: space-between; }
  h1 { font-size: 30pt; line-height: 1.05; margin: 18pt 0 4pt; }
  .for { font-size: 12pt; margin: 0 0 16pt; color: #222; }
  h2 { font-size: 15pt; margin: 0 0 6pt; padding-bottom: 3pt; border-bottom: 2pt solid ${accent}; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 12pt 0 4pt; break-after: avoid; }
  .lead { font-size: 11pt; margin: 0 0 10pt; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin: 6pt 0 14pt; }
  .tile { border: 1.5pt solid #000; border-radius: 5pt; padding: 8pt 10pt 7pt; min-height: 1.1in; }
  .tile .big { font-size: 34pt; font-weight: 800; line-height: 1; letter-spacing: -.01em; }
  .tile .big small { font-size: 15pt; font-weight: 700; }
  .tile .lab { font-weight: 700; font-size: 11pt; margin-top: 5pt; }
  .tile .how { font-size: 8.5pt; color: #333; margin-top: 2pt; }
  .summary { border-left: 4pt solid #000; padding: 6pt 10pt; background: #f2f2f2; font-size: 11pt; margin: 0 0 12pt; }
  .notice { border: 2pt solid #000; padding: 7pt 11pt; border-radius: 4pt; margin-top: 8pt; break-inside: avoid; }
  .notice b { font-size: 11pt; }
  .pb { break-before: page; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin: 4pt 0 8pt; }
  th, td { border: 1pt solid #000; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  th { background: #e6e6e6; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  tr.tot td { font-weight: 700; background: #f2f2f2; }
  .finding { border: 1.25pt solid #000; border-radius: 4pt; margin: 0 0 8pt; break-inside: avoid; }
  .finding .fh { background: #e9e9e9; padding: 3pt 8pt; font-size: 9.5pt; border-bottom: 1pt solid #000; display: flex; justify-content: space-between; gap: 8pt; }
  .finding .fh b { font-size: 10pt; }
  .ba { display: grid; grid-template-columns: 1fr 1fr; }
  .ba > div { padding: 5pt 8pt; }
  .ba > div + div { border-left: 1pt solid #000; }
  .ba .k { font-size: 8pt; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 2pt; }
  .ba q { display: block; font-style: italic; margin-top: 3pt; padding-left: 6pt; border-left: 2pt solid #999; quotes: none; }
  .pill { border: 1pt solid #000; border-radius: 7pt; padding: 0 6pt; font-size: 8.5pt; font-weight: 700; white-space: nowrap; }
  .pill.dark { background: #000; color: #fff; }
  ul { margin: 2pt 0 8pt; padding-left: 16pt; } li { margin-bottom: 2pt; }
  .muted { color: #333; font-size: 9.5pt; }
  .chart { margin: 4pt 0 8pt; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
  .front .tiles { margin: 4pt 0 10pt; }
  .front .summary { margin-bottom: 8pt; }
  .front h1 { margin-top: 12pt; }
  .front .for { margin-bottom: 10pt; }
  .front h3 { margin-top: 8pt; }
  .pill.open { border-width: 2pt; }
  .unjudged { color: #666; }
  .finding .again { border-top: 1pt dashed #000; padding: 4pt 8pt; font-size: 9pt; }
  .keep { break-inside: avoid; }
  .styleNotes { columns: 2; column-gap: 18pt; font-size: 9.5pt; }
  .styleNotes li { break-inside: avoid; }
  .front h2 { font-size: 13pt; margin: 10pt 0 4pt; border-bottom-width: 1.5pt; }
  .front p, .front li { font-size: 9.5pt; line-height: 1.33; }
  .front .notice { padding: 5pt 9pt; font-size: 9.5pt; }
  .front ul { margin: 2pt 0 4pt; }
  .front .checks li, .front .fixes li { margin-bottom: 3pt; }
  .arrow { font-weight: 800; }
  .jc { border: 1.25pt solid #000; border-radius: 4pt; padding: 4pt 8pt; margin: 0 0 6pt; break-inside: avoid; font-size: 10pt; }
  .jc .opts { margin: 3pt 0 2pt; padding-left: 16pt; }
  .jc .opts li.pick { font-weight: 700; list-style: '★ '; }
  .jc .jwhy { font-size: 9.5pt; }
  .front ul.calls li { margin-bottom: 2pt; font-size: 9.5pt; }
  .tbars { margin: 2pt 0 6pt; }
  .tbar { display: grid; grid-template-columns: 1.9in 1fr 0.8in; gap: 8pt; align-items: center; margin: 3pt 0; font-size: 10pt; }
  .tbar .tr { border: 1pt solid #000; height: 11pt; display: block; }
  .tbar .tf { display: block; height: 100%; background: #555; }
  .tbar b { text-align: right; }
  .cover h3 { margin: 8pt 0 2pt; }
  .cover .mix { margin: 0 0 3pt; font-size: 10pt; }
  table.cov { font-size: 8pt; margin-top: 2pt; line-height: 1.25; }
  table.cov td, table.cov th { padding: 1.5pt 4pt; }
  .appendix .divider { border: 2pt solid #000; border-radius: 5pt; padding: 10pt 14pt; margin: 0 0 14pt; background: #f2f2f2; }
  .appendix .divider .k { font-size: 9pt; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  .appendix .divider h1 { font-size: 24pt; margin: 2pt 0 4pt; }
  .appendix .divider p { margin: 0; }
  .keptList { font-size: 9.5pt; } .keptList li { break-inside: avoid; margin-bottom: 3pt; }
  `;
}

function tile(big, lab, how) {
  return `<div class="tile"><div class="big">${big}</div><div class="lab">${esc(lab)}</div><div class="how">${esc(how)}</div></div>`;
}

// Split a label into lines of at most n characters, at spaces.
function wrap(text, n) {
  const out = [];
  let cur = '';
  for (const w of String(text).split(/\s+/)) {
    if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out;
}

function barChart(rows, { width = 640, max, line, chance, unit = (v) => v, right = 200 } = {}) {
  // rows: [{label, value, over?, unjudged?}]; grayscale bars, hatched when over the line, outlined when not judged.
  // Labels show in full: the label column grows to fit (up to 230 px) and longer names wrap onto a second line.
  const labelW = Math.min(230, Math.max(110, ...rows.map((r) => String(r.label).length * 6.2 + 12)));
  const perLine = Math.floor((labelW - 12) / 6.2);
  const lines = rows.map((r) => wrap(r.label, perLine));
  const rowH = Math.max(22, ...lines.map((l) => l.length * 13 + 8)), top = chance != null || line != null ? 18 : 4;
  const h = top + rows.length * rowH + 6;
  const M = max || Math.max(1e-9, ...rows.map((r) => r.value), line || 0, chance || 0);
  const X = (v) => labelW + (v / M) * (width - labelW - right);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" font-family="Arial, sans-serif" font-size="11">
  <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="3"/></pattern></defs>`;
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    const fill = r.over ? 'url(#hatch)' : r.unjudged ? '#e4e4e4' : '#8a8a8a';
    const ink = r.unjudged ? '#666' : '#000';
    const note = r.over ? ' (over)' : r.unjudged ? ' · not judged (too few questions)' : '';
    // keep the value clear of the line and the chance mark
    let tx = X(r.value) + 5;
    for (const m of [chance, line]) if (m != null && tx > X(m) - 30 && tx < X(m) + 6) tx = X(m) + 6;
    const ls = lines[i];
    const ly = y + rowH / 2 - ((ls.length - 1) * 13) / 2 + 4;
    s += `<text x="${labelW - 6}" y="${ly}" text-anchor="end" fill="${ink}">${ls.map((t, k) => `<tspan x="${labelW - 6}" dy="${k ? 13 : 0}">${esc(t)}</tspan>`).join('')}</text>
    <rect x="${labelW}" y="${y + rowH / 2 - 7}" width="${Math.max(1, X(r.value) - labelW)}" height="14" fill="${fill}" stroke="${ink}" stroke-width="1"${r.unjudged ? ' stroke-dasharray="3 2"' : ''}/>
    <text x="${tx}" y="${y + rowH / 2 + 4}" font-weight="${r.unjudged ? 400 : 700}" fill="${ink}">${esc(unit(r.value))}${esc(note)}</text>`;
  });
  const bottom = top + rows.length * rowH;
  if (chance != null) s += `<line x1="${X(chance)}" y1="${top - 4}" x2="${X(chance)}" y2="${bottom}" stroke="#000" stroke-dasharray="3 3"/><text x="${X(chance)}" y="${top - 6}" text-anchor="middle" font-size="10">chance ${pct(chance)}</text>`;
  if (line != null) s += `<line x1="${X(line)}" y1="${top - 4}" x2="${X(line)}" y2="${bottom}" stroke="#000" stroke-width="2.5"/><text x="${X(line) + 4}" y="${top - 6}" font-size="10" font-weight="700">line ${pct(line)}</text>`;
  return `<div class="chart">${s}</svg></div>`;
}

function approvalLine(ctx) {
  if (ctx.approval) return `<div class="notice"><b>Approved by ${esc(ctx.approval.name)} on ${esc(String(ctx.approval.date).slice(0, 10))}.</b> They read the preview and agreed: “${esc(ctx.approval.statement)}”</div>`;
  if (ctx.preview) return `<div class="notice"><b>Preview: not approved yet.</b> Nothing is released until you approve it in your review (My orders, or REVIEW.html in the preview zip).</div>`;
  return '';
}

/* ---------- the teacher report (owner, Nov 8, 2026): 2–3 pages in plain words ---------- */

export const firstSentence = (s, max = 160) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  const one = (t.match(/^.*?[.!?](?=\s|$)/) || [t])[0];
  return one.length > max ? one.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : one;
};

// Agent words a teacher shouldn't have to learn: levels, check names, finding kinds.
export function plainWords(s) {
  return String(s ?? '')
    .replace(/\b[Aa]n? L([123])\b(?! item| question)/g, (m, l) => `${m[0]}${l === '1' ? 'n easier' : l === '2' ? ' middle' : ' harder'} question`)
    .replace(/\b([Aa]n?) L([123])\b/g, (m, a, l) => `${a[0]}${l === '1' ? 'n easier' : l === '2' ? ' middle' : ' harder'}`)
    .replace(/\bL1\b/g, 'easier').replace(/\bL2\b/g, 'middle').replace(/\bL3\b/g, 'harder')
    .replace(/\blevel[- ]?1\b/gi, 'easier level').replace(/\blevel[- ]?2\b/gi, 'middle level').replace(/\blevel[- ]?3\b/gi, 'harder level')
    .replace(/🤖\s*/g, '').replace(/\bWilco('s)?\b/g, 'the guessing check').replace(/\btest-wise\b/gi, 'guessing')
    .replace(/\s*\(chance \d+%\)/gi, '').replace(/,?\s*\bchance \d+%/gi, '').replace(/\bbots\b/g, 'guessing tricks').replace(/\bbot\b/g, 'guessing trick')
    .replace(/\bSymPy\b/g, 'a math engine').replace(/\bscorer\b/gi, 'automatic marking')
    .replace(/\bJUDGMENT\b/g, 'judgment call').replace(/\bKEEP\b/g, 'kept').replace(/\bFIX\b/g, 'fix')
    .replace(/\bkeys? (?:check )?rows?\b/gi, 'answers').replace(/\brows\b/g, 'answers');
}

// The teacher's copy has no AI cost and no model-token detail (owner, Nov 8, 2026). Those live in the agents' own log
// lines and the reporter's notes ("cap $2.33", "(0.3 min, $0.09)", "Tokens: in 6, out 1274, cache read …"), so those
// two are cleaned for her copy. Dollars inside the questions (a money word problem) are content and stay.
const AMT = String.raw`\$\s?\d[\d,]*(?:\.\d+)?`;
export function scrubCost(text) {
  return String(text ?? '')
    .replace(/\s*\((?=[^()]*\$\s?\d)(?=[^()]*(?:\d\.\d\d|\bmin\b|\bcap\b|\bcost|\bbudget|\btokens?\b|\d\s?x\b))[^()]*\)/gi, '')
    .replace(/\s*\b(?:Tokens?|Model tokens)\s*:?\s*(?:in|out)\s*[\d,]+[^.]*?(?:cache[^.]*)?\.(?=\s|$)/gi, '')
    .replace(/\s*\bTokens\s+[\d,]{5,}[^.;]*[.;]/g, '')
    .replace(new RegExp(String.raw`[,;]?\s*\b(?:AI cost|cost(?: stop)?|cap|budget|new total|total|spent|so far|after round \d+:?)\s*(?:of|at|is|was|=)?\s*${AMT}(?:\s*(?:of|\/)\s*${AMT})?(?:\s*\([\d.]+\s?x\))?(?:\s*\(?\s*[\d.]+\s?x\)?)?`, 'gi'), '')
    .replace(/\$\s?\d[\d,]*\.\d\d\b(?:\s*(?:exact|estimated))?/g, '')
    .replace(/\b(?:\d+(?:\.\d+)?\s?x)\s*(?=[).,;]|$)/g, '')
    .replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,;:)])/g, '$1').replace(/\(\s*[,;]?\s*\)/g, '').replace(/([,;:])\s*([.,;])/g, '$2').replace(/(?<!\.)\.\.(?!\.)/g, '.').trim();
}
// The reporter's notes: a sentence about cost, budget or model tokens is left out of her copy whole (half a money
// sentence reads worse than none); the owner copy keeps every word.
const COST_SENTENCE = /\$\s?\d[\d,]*\.\d\d|\bbudget\b|\bcost stop\b|\bcap \$|\btokens?:\s*(?:in|out)\b|\bcache (?:read|write)\b|\btokens?\s+[\d,]{5,}|\btokens? (?:and cost )?not measured|\bbilled\b|\bdollars\b/i;
export function scrubNote(text) {
  const parts = String(text ?? '').split(/(?<=[.;])\s+(?=[A-Z(])/);
  return parts.filter((x) => !COST_SENTENCE.test(x)).map(scrubCost).join(' ').trim();
}
function forTeacher(pack) {
  const a = pack.audit || {};
  return { ...pack, log: (pack.log || []).map((l) => ({ ...l, what: scrubCost(l.what) })), audit: { ...a, notes: (a.notes || []).map(scrubNote).filter(Boolean), briefChanges: (a.briefChanges || []).map(scrubCost) } };
}

const MAX_FIXES = 6, MAX_OPEN = 4, MAX_CARDS = 4, MAX_LINES = 10;
const LEVEL = { 1: 'easier', 2: 'middle', 3: 'harder' };
const TYPE = { mc: 'choice', tf: 'true/false', match: 'matching', numeric: 'number', short: 'short answer', open: 'written' };
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const qDocs = (pack) => (pack.documents || []).filter((d) => questionsOf(d).length);

// "Intro Stats — Unit 4 Assessment A q6|B q6|C q6" → "Question 6, all versions"; "q4 C" → "Question 4, version C".
export function shortWhere(where, pack) {
  let w = String(where || '');
  const docs = pack.documents || [];
  const doc = docs.find((d) => d.title && w.toLowerCase().includes(String(d.title).toLowerCase()));
  if (doc) w = w.replace(new RegExp(escRe(doc.title), 'i'), ' ');
  const qs = new Set(), vs = new Set();
  for (const m of w.matchAll(/\b([A-F])\s*q(\d+)\b/g)) { vs.add(m[1]); qs.add(Number(m[2])); }
  for (const m of w.matchAll(/\bq(\d+)\s+([A-F])\b/g)) { vs.add(m[2]); qs.add(Number(m[1])); }
  for (const m of w.matchAll(/\bq(\d+)\b/gi)) qs.add(Number(m[1]));
  if (!qs.size) return where || '';
  const multi = qDocs(pack).length > 1;
  const first = w.search(/\b([A-F]\s*)?q\d+\b/i);
  // several documents: a short name for the document ("Unit 5 Test" for "Unit 5 Test: Reconstruction, 1865–1877")
  const short = (t) => { const x = String(t || '').split(/:\s| — | – /)[0].trim(); return x.length >= 4 ? x : String(t || ''); };
  const prefix = multi ? (doc ? short(doc.title) : w.slice(0, Math.max(0, first)).trim()) : '';
  const allV = (doc || (qDocs(pack).length === 1 ? qDocs(pack)[0] : null))?.versions;
  const list = [...qs].sort((x, y) => x - y);
  const qtxt = list.length === 1 ? `question ${list[0]}` : `questions ${list.join(', ')}`;
  const vtxt = vs.size ? (allV && allV.length > 1 && allV.every((v) => vs.has(v)) ? 'all versions' : `version ${[...vs].sort().join(', ')}`) : '';
  const out = [prefix, qtxt, vtxt].filter(Boolean).join(', ');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// A judgment call's choices: `judgment.options` (strings or {label}), `recommend` (index), `why`, `issue`, `by`.
// Without them (older packs) it is null and the report shows the checker's own words, as before.
export function judgmentOf(f) {
  const j = f && f.judgment;
  if (!j || !Array.isArray(j.options) || j.options.length < 2) return null;
  const options = j.options.map((o) => (typeof o === 'string' ? { label: o } : { label: String(o?.label || '') })).filter((o) => o.label);
  if (options.length < 2) return null;
  const rec = Number.isInteger(Number(j.recommend)) && options[Number(j.recommend)] ? Number(j.recommend) : null;
  return { issue: j.issue || firstSentence(f.what, 140), options, recommend: rec, why: j.why || '', by: j.by || '' };
}

// The judgment calls a teacher is asked (for REVIEW.html and My orders): one entry per open JUDGMENT, our pick first-class.
export function judgmentCalls(pack) {
  const st = auditStats(pack);
  return st.findings.filter((f) => f.bucket === 'teacher').map((f, i) => {
    const j = judgmentOf(f);
    return { id: `j${i + 1}`, where: shortWhere(f.where, pack), whereRaw: f.where || '', issue: plainWords(j ? j.issue : firstSentence(f.what, 200)),
      text: j ? '' : plainWords(f.what || ''), options: j ? j.options.map((o) => plainWords(o.label)) : [], recommend: j ? j.recommend : null, why: j ? plainWords(j.why) : '', by: j ? j.by : '' };
  });
}

// Minutes spent waiting for the teacher's answer: a log row's `waiting` (minutes), or "15 minutes waiting" in its text.
export function waitingMinutes(log) {
  let n = 0;
  for (const l of log || []) {
    if (l.waiting != null && !Number.isNaN(Number(l.waiting))) { n += Number(l.waiting); continue; }
    const m = String(l.what || '').match(/(\d+(?:\.\d+)?)\s*min(?:utes?)?\s+(?:of\s+)?waiting/i);
    if (m && /wait/i.test(`${l.who} ${l.what}`)) n += Number(m[1]);
  }
  return n;
}

// The checks in one or two plain sentences each.
function whoChecked(pack, st) {
  const c = pack.checks || {}, out = [];
  const blind = c.blind || [], solver = (c.solver || []).filter((r) => r.check !== 'math'), math = (c.solver || []).filter((r) => r.check === 'math');
  const facts = c.facts || [], wilco = c.wilco || [];
  const later = (runs) => runs.filter((r) => Number(r.round ?? 1) > 1);
  const newFix = (runs) => runs.reduce((s, r) => s + (r.findings || []).filter((f) => String(f.kind || 'FIX').toUpperCase() === 'FIX' && !f.sameAs).length, 0);
  if (blind.length) {
    const r = blind[0];
    const re = later(blind);
    out.push(`<b>A blind tester</b> answered ${r.of != null ? `all ${esc(r.of)}` : 'the'} questions from the student copy without the key${r.matched != null && r.of != null ? ` and agreed with the key on <b>${esc(r.matched)} of ${esc(r.of)}</b>` : ''}.${re.length ? ` ${re.length === 1 ? 'Then a different fresh tester' : 'Then fresh testers'} rechecked the changed questions${newFix(re) ? ` and found ${plural(newFix(re), 'new problem')}` : ' and found no new problems'}.` : ''}`);
    const pf = blind.filter((x) => x.passageFree && Object.keys(x.passageFree).length);
    if (pf.length) {
      const last = pf[pf.length - 1];
      const got = Object.values(last.passageFree).reduce((s, x) => s + Number(x.matched || 0), 0), of = Object.values(last.passageFree).reduce((s, x) => s + Number(x.of || 0), 0);
      out.push(`<b>Reading questions need the passage:</b> a reader who never saw the passages got ${got} of ${of} right${last.gate ? (last.gate === 'pass' ? ', low enough to pass' : ', <b>too many: this did not pass</b>') : ''}.`);
    }
  }
  if (solver.length) {
    const r = solver[0], d = solver.reduce((s, x) => s + Number(x.disagree || 0), 0);
    out.push(`<b>A solver</b> worked ${r.checked != null ? `all ${esc(r.checked)}` : 'every'} answer${Number(r.checked) === 1 ? '' : 's'} on its own: ${d === 0 ? '<b>no disagreements</b> with the key' : `<b>${d} disagreement${d === 1 ? '' : 's'}</b> with the key (each one is in the fixes below)`}${later(solver).length ? `, and a fresh solver checked again after the fixes` : ''}.${math.length ? ` A math engine also redid ${esc(Math.max(...math.map((x) => Number(x.checked) || 0)))} of the calculations.` : ''}`);
  } else if (math.length) out.push(`<b>A math engine</b> redid ${esc(Math.max(...math.map((x) => Number(x.checked) || 0)))} of the calculations: ${math.every((x) => !Number(x.disagree)) ? 'no disagreements' : 'see the appendix'}.`);
  if (facts.length) {
    const r = facts[0];
    out.push(`<b>A fact checker</b> checked ${r.claims != null ? `${esc(r.claims)} claims, dates, names and terms` : 'every claim'}${r.flagged != null ? `; ${esc(r.flagged)} needed a look` : ''}${later(facts).length ? ' and checked again after the fixes' : ''}.`);
  }
  const keys = wilco.filter(isKeys);
  if (keys.length) out.push(`<b>An automatic check of every answer key</b> ${keys[keys.length - 1].pass ? 'passed' : '<b>did not pass</b>'}${keys.length > 1 ? ` (run ${keys.length} times, after each change)` : ''}.`);
  return out;
}

// "Could a student guess without knowing?" in one line, from the last round of the guessing bots.
export function guessLine(pack, ctx) {
  const bots = (pack.checks?.wilco || []).filter((r) => !isKeys(r) && (r.worst || r.chance != null));
  if (!bots.length) {
    const mc = qDocs(pack).some((d) => questionsOf(d).some(({ q }) => ['mc', 'tf', 'match'].includes(q.type)));
    return mc ? 'Could a student guess without knowing? This pack was not run through the guessing check.' : 'Could a student guess without knowing? There are no multiple-choice questions to guess on.';
  }
  const r = bots[bots.length - 1];
  const chance = Number(r.chance) || 0, line = r.line ?? chance + 0.1;
  const rows = botRows(r, ctx, line).filter((x) => !x.unjudged);
  const top = rows.length ? Math.max(...rows.map((x) => x.value)) : null;
  if (top == null) return 'Could a student guess without knowing? Too few multiple-choice questions to test it fairly, so it was not judged.';
  if (!r.pass || top > line + 1e-9) return `Could a student guess without knowing? <b>Sometimes: the best guessing trick scored ${pct(top)}, above the ${pct(line)} we allow.</b> The appendix shows which trick and where; please look at those questions before you approve.`;
  const at = Math.abs(top - line) < 0.005;
  return `Could a student guess without knowing? <b>No.</b> The best guessing trick (picking by length, wording or position) scored ${pct(top)}, ${at ? 'right at' : 'under'} the ${pct(line)} we allow (we flag anything above it).`;
}

const levelName = (l) => LEVEL[l] || (l == null ? '—' : `level ${l}`);
function levelMix(doc) {
  const c = {};
  for (const { q } of questionsOf(doc)) c[q.level ?? '?'] = (c[q.level ?? '?'] || 0) + 1;
  return Object.keys(c).sort().map((k) => `${levelName(k === '?' ? null : k).replace(/^./, (x) => x.toUpperCase())} ${c[k]}`).join(' · ');
}
const shortKey = (q, ver, n = 34) => { if (q.type === 'open') return 'model answer (teacher copy)'; if ((q.type || 'short') === 'mc') { const i = Number(vv(q.answer, ver)); return Number.isInteger(i) ? String.fromCharCode(65 + i) : '?'; } const t = plainMath(keyText(q, ver)).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
// What differs between versions of one question: numbers only, the wording, or nothing.
function versionChange(q, vers) {
  const ps = vers.map((v) => plainMath(String(vv(q.prompt, v) ?? '')));
  const ks = vers.map((v) => keyText(q, v));
  const same = (a) => a.every((x) => x === a[0]);
  const strip = (x) => x.replace(/[−-]?\d[\d,.]*/g, '#');
  if (same(ps)) return same(ks) ? 'same question' : 'same question, different answer';
  if (same(ps.map(strip))) return 'new numbers';
  return 'new wording';
}

function coveragePage(pack) {
  const docs = qDocs(pack);
  if (!docs.length) return '';
  const many = docs.reduce((s, d) => s + questionsOf(d).length, 0) > 26;
  return `<section class="pb cover"><h2>What each question covers</h2>
  <p class="lead">Each question's skill and level (easier, middle or harder)${docs.some((d) => (d.versions || []).length > 1) ? ', and what changes between versions: every version asks the same skill at the same level, question for question' : ''}.</p>
  ${docs.map((d) => {
    const items = questionsOf(d), vers = (d.versions || []).length > 1 ? d.versions : null;
    const lessonOf = (q) => q.lesson || q.source || '';
    const hasLesson = items.some(({ q }) => lessonOf(q));
    const head = `<h3>${esc(d.title)}${vers ? ` · versions ${esc(vers.join(', '))}` : ''}</h3><p class="mix"><b>Levels${vers ? ' (each version)' : ''}:</b> ${esc(levelMix(d))} · ${plural(items.length, 'question')}${needsHowToGrade(d) ? ` · ${items.reduce((s, { q }) => s + pointsOf(q).points, 0)} points` : ''}</p>`;
    if (!vers && many) {
      // a long pack without versions: grouped by skill, so the page stays one page
      const by = new Map();
      for (const { q, n } of items) { const k = q.skill || '—'; if (!by.has(k)) by.set(k, []); by.get(k).push({ q, n }); }
      return head + `<table class="cov"><tr><th>Skill</th><th>Questions</th><th>Levels</th></tr>${[...by].map(([k, l]) => `<tr><td>${esc(k)}</td><td>${l.map((x) => x.n).join(', ')}</td><td>${[...new Set(l.map((x) => levelName(x.q.level)))].join(', ')}</td></tr>`).join('')}</table>`;
    }
    return head + `<table class="cov"><tr><th>#</th><th>Skill${hasLesson ? ' · lesson' : ''}</th><th>Level</th><th>Type</th>${vers ? vers.map((v) => `<th>Key ${esc(v)}</th>`).join('') + '<th>Across versions</th>' : '<th>Key</th>'}</tr>${items
      .map(({ q, n }) => `<tr><td>${n}</td><td>${esc(q.skill || '')}${hasLesson && lessonOf(q) ? ` <span class="muted">· ${esc(lessonOf(q))}</span>` : ''}</td><td>${esc(levelName(q.level))}</td><td>${esc(TYPE[q.type || 'short'] || q.type)}</td>${
        vers ? vers.map((v) => `<td>${esc(shortKey(q, v, (q.type === 'mc' ? 3 : 30)))}</td>`).join('') + `<td>${esc(versionChange(q, vers))}</td>` : `<td>${esc(shortKey(q, null, 40))}</td>`}</tr>`)
      .join('')}</table>`;
  }).join('')}</section>`;
}

function timeBars(agent, waiting) {
  const max = Math.max(agent, waiting, 1);
  const bar = (label, v) => `<div class="tbar"><span class="tl">${label}</span><span class="tr"><span class="tf" style="width:${Math.max(1.5, (v / max) * 100)}%"></span></span><b>${mins(v)} min</b></div>`;
  return `<div class="tbars">${bar('Agent work', agent)}${bar('Waiting for your answer', waiting)}</div>`;
}

function teacherPart(pack, ctx, st, owner) {
  const o = pack.order || {};
  const what = [o.topic, [o.grade && `grade ${o.grade}`, ctx.subjectLabel?.toLowerCase()].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  const docs = pack.documents || [];
  const fixed = st.findings.filter((f) => f.bucket === 'fixed'), open = st.findings.filter((f) => f.bucket === 'open');
  const calls = judgmentCalls(pack);
  const checkSessions = st.log.filter((l) => /blind|solver|fact|probe|checker/i.test(l.who || '') && !/style/i.test(l.who || '')).length || st.checkRuns;
  const roles = new Set(st.log.map((l) => baseName(l.who)).filter((w) => w && !/^lead\b/.test(w)));
  const waiting = waitingMinutes(st.log);
  const docLine = (d) => {
    const n = questionsOf(d).length || gameItemCount(d);
    if (!n && (d.slides || []).length) return `<li><b>${esc(d.title)}</b>: ${plural(d.slides.length + 1, 'slide')} with speaker notes, and a handout.</li>`;
    const pool = d.pool && Array.isArray(d.pool.versions) ? d.pool.versions.length : 0;
    // one version per student: how many, how they were checked, and which ones a fresh agent solved without the key
    const sample = pool && Array.isArray(d.pool.blindSample) ? d.pool.blindSample : [];
    const vers = pool ? ` in ${pool} versions, one per student (each with a 5-letter code; every version's numbers and keys were made from version A by script and each key checked by the math checker; ${sample.length ? `a fresh agent solved ${plural(sample.length, 'sample version')} (${sample.map(esc).join(', ')}) without the key` : 'a fresh agent solves a sample of 3 versions without the key'}; your key page and the all-versions key cover all ${pool})`
      : (d.versions || []).length > 1 ? ` in ${d.versions.length} versions (${d.versions.join(', ')})` : '';
    const fmt = d.format === 'interactive' ? (d.grading === 'auto' ? ', an interactive page graded on the page' : ', an interactive page students answer and you grade from print') : '';
    return `<li><b>${esc(d.title)}</b>${n ? `: ${plural(n, 'question')}` : ''}${vers}${fmt}${questionsOf(d).length ? ', with a teacher copy (the key, why, the skills map' + (needsHowToGrade(d) ? ' and how to grade' : '') + ')' : ''}.</li>`;
  };
  // A long list of calls (older packs had up to 21) leaves less room for the fixes: fewer and shorter lines then.
  const busy = calls.length > MAX_CARDS;
  const maxFixes = busy ? 4 : MAX_FIXES, len = busy ? 95 : 120;
  const fixLine = (f) => `<li><b>${esc(shortWhere(f.where, pack))}.</b> ${esc(plainWords(firstSentence(f.what, len)))} <span class="arrow">→</span> ${esc(plainWords(firstSentence(f.fixed, len)))}</li>`;
  const callHtml = (c) => {
    if (!c.options.length) return `<div class="jc"><b>${esc(c.where)}.</b> ${esc(c.text || c.issue)} <span class="muted">Tell us your choice in your review comments.</span></div>`;
    return `<div class="jc"><b>${esc(c.where)}.</b> ${esc(c.issue)}<ul class="opts">${c.options.map((x, i) => `<li class="${i === c.recommend ? 'pick' : ''}">${i === c.recommend ? '<b>Our pick:</b> ' : ''}${esc(x)}</li>`).join('')}</ul>${c.why ? `<div class="jwhy">${c.recommend != null ? 'Why: ' : ''}${esc(c.why)}${/report/i.test(c.by) ? ' <span class="muted">(suggested by the reporter)</span>' : ''}</div>` : ''}</div>`;
  };
  // Many calls (older packs had up to 21): one line each, so the report stays within 3 pages.
  const callLine = (c) => `<li><b>${esc(c.where)}.</b> ${esc(firstSentence(c.issue, 100))}${c.options.length ? ` <i>Choices:</i> ${c.options.map((x, i) => (i === c.recommend ? `<b>${esc(x)} (our pick)</b>` : esc(x))).join(' · ')}` : ''}</li>`;
  const graded = qDocs(pack).filter(needsHowToGrade);
  const pts = graded.map((d) => questionsOf(d).reduce((s, { q }) => s + pointsOf(q).points, 0));
  const ptsGiven = graded.every((d) => questionsOf(d).every(({ q }) => pointsOf(q).given));
  const notesN = graded.reduce((s, d) => s + gradingRows(d, (d.versions || [])[0] || null, pack).filter((r) => r.notes.length).length, 0);
  const tokens = ctx.tokenTotal;
  return `<section class="front"><div class="brand"><span>${esc(ctx.brand.name)} · Your report</span><span>${esc(pack.id || '')}</span></div>
  <h1>How your pack was made</h1>
  <p class="for">${esc(what)}${o.teacher ? ` · for ${esc(o.teacher)}` : ''}${ctx.date ? ` · ${esc(ctx.date)}` : ''}</p>
  ${approvalLine(ctx)}${blindSkipped(pack) ? `<div class="notice"><b>${esc(BLIND_SKIPPED_LINE)}</b></div>` : ''}
  ${open.length ? `<div class="notice"><b>${plural(open.length, 'problem is', 'problems are')} not fixed yet.</b> ${open.slice(0, MAX_OPEN).map((f) => `${esc(shortWhere(f.where, pack))}: ${esc(plainWords(firstSentence(f.what, 110)).replace(/[.]+$/, ""))}`).join(' · ')}${open.length > MAX_OPEN ? ` · and ${open.length - MAX_OPEN} more, each in the appendix under "Not fixed yet"` : ''}. Please look at ${open.length === 1 ? 'it' : 'them'} before you approve.</div>` : ''}
  <h2>What we made</h2><ul>${docs.map(docLine).join('')}</ul>
  <h2>Who checked it, and how</h2>
  <p>The agent that wrote your pack never checks its own work. Fresh agents that didn't write it checked it in ${plural(checkSessions, 'session')} over ${plural(st.rounds, 'round')}; each round after the first rechecked the fixes.</p>
  <ul class="checks">${whoChecked(pack, st).map((x) => `<li>${x}</li>`).join('')}<li>${guessLine(pack, ctx)}</li></ul>
  <h2>What was caught and fixed</h2>
  <p>${esc(plainWords(findingWords(st)))}${st.kept ? ' The kept ones are in the appendix, one line each.' : ''}</p>
  ${fixed.length ? `<ul class="fixes">${fixed.slice(0, maxFixes).map(fixLine).join('')}${fixed.length > maxFixes ? `<li class="muted">And ${plural(fixed.length - maxFixes, 'more fix', 'more fixes')}, each with its before and after in the appendix.</li>` : ''}</ul>` : ''}
  ${calls.length ? `<h2>Your decisions</h2><p>${calls.length === 1 ? 'One question is' : `${calls.length} questions are`} a matter of your style, so we left ${calls.length === 1 ? 'it' : 'them'} for you. ${calls.some((c) => c.options.length) ? 'Our pick is already chosen in your review; change it with one tap.' : ''}</p>${calls.length > MAX_CARDS ? `<ul class="calls">${calls.slice(0, MAX_LINES).map(callLine).join('')}${calls.length > MAX_LINES ? `<li class="muted">And ${calls.length - MAX_LINES} more: every one is in your review, to choose there.</li>` : ''}</ul><p class="muted">The checkers' full words for each are in the appendix under "Left for you to decide".</p>` : calls.map(callHtml).join('')}` : ''}
  ${graded.length ? `<h2>How to grade</h2><p>The teacher copy ends with a <b>How to grade</b> page: the points, what earns full and partial credit, and other answers to accept, for every question${notesN ? ` (the checkers added notes on ${plural(notesN, 'question')})` : ''}. ${graded.map((d, i) => `${esc(d.title)}: ${pts[i]} points`).join(' · ')}${ptsGiven ? '.' : ' (our suggested points: change them to fit your class).'}</p>` : ''}
  <h2>Time and effort</h2>
  ${timeBars(st.minutes, waiting)}
  <p>${tokens != null ? `<b>Tokens charged: ${int(tokens)}</b> (your order). ` : ''}Effort: ${plural(roles.size, 'agent')}, ${plural(st.rounds, 'round')} of checks, ${plural(checkSessions, 'checking session')}${st.wilcoRuns ? ` and ${plural(st.wilcoRuns, 'automatic check')}` : ''}.</p>
  ${pack.originalReview ? `<p>We also checked your original${pack.originalReview.file ? ` (${esc(pack.originalReview.file)})` : ''}: ${plural((pack.originalReview.findings || []).length, 'finding')}, in the appendix under "What we found in your original".</p>` : ''}
  <div class="notice"><b>Check it before students see it.</b> ${esc(ctx.brand.aiNotice)} ${esc(ctx.brand.deleteNotice || '')}</div>
  </section>${coveragePage(pack)}`;
}

// Owner copy only: what the pack cost to make, next to what the teacher was charged.
function ownerCosts(pack, ctx, st) {
  const tokens = ctx.tokenTotal;
  const budget = tokens != null ? tokens * 0.1 : null;
  const cached = st.log.filter((l) => /cache/i.test(l.what || '')).length;
  return `<h3>Cost (owner copy only)</h3>
  <table><tr><th>What</th><th class="n">Amount</th></tr>
  <tr><td>AI cost, added up from the log</td><td class="n"><b>${money(st.cost)}</b></td></tr>
  <tr><td>Model tokens, added up from the log${cached ? ` (${plural(cached, 'step')} list the cache split in their line)` : ''}</td><td class="n">${int(st.tokens)}</td></tr>
  ${tokens != null ? `<tr><td>Tokens charged to the teacher</td><td class="n">${int(tokens)}</td></tr><tr><td>Budget (tokens × $0.10) · cost stop at 2×</td><td class="n">${money(budget)} · ${money(budget * 2)}</td></tr><tr><td>Cost against the budget</td><td class="n">${(st.cost / budget).toFixed(2)}×</td></tr>` : ''}
  <tr><td>Per question in the pack (each version counted)</td><td class="n">${st.questionsInPack ? money(st.cost / st.questionsInPack) : '—'}</td></tr></table>
  <p class="muted">Steps with no cost recorded count as $0 here; the reporter's notes say which ones were not measured.</p>`;
}


function timeline(pack, st, owner) {
  const byWho = {};
  for (const l of st.log) if (l.minutes != null) byWho[l.who || '—'] = (byWho[l.who || '—'] || 0) + (Number(l.minutes) || 0);
  const untimed = [...new Set(st.log.filter((l) => l.minutes == null).map((l) => l.who))].filter((w) => !(w in byWho));
  const notes = pack.style?.notes || [];
  // The teacher's copy has no dollars and no model-token counts (owner, Nov 8, 2026): those are in the owner copy only.
  const $ = (x) => (owner ? x : '');
  return `<h2>Every step, in order</h2>
  <p class="lead">The reporter logged each step as it happened: who did it, what they did${owner ? ', how long it took and what it cost' : ' and how long it took'}. A dash means the step wasn't timed.</p>
  <table><tr><th style="width:7%">Time</th><th style="width:19%">Who</th><th>What</th><th class="n">Minutes</th>${$('<th class="n">Tokens</th><th class="n">Cost</th>')}</tr>
  ${st.log.map((l) => `<tr><td>${esc(l.at || '')}</td><td>${esc(l.who || '')}</td><td>${esc(l.what || '')}</td><td class="n">${mins(l.minutes)}</td>${$(`<td class="n">${l.tokens != null ? int(l.tokens) : '—'}</td><td class="n">${l.cost != null ? money(l.cost) : '—'}</td>`)}</tr>`).join('')}
  <tr class="tot"><td></td><td>${plural(st.log.length, 'step')}</td><td>Total</td><td class="n">${mins(st.minutes)}</td>${$(`<td class="n">${int(st.tokens)}</td><td class="n">${money(st.cost)}</td>`)}</tr></table>
  <h3>The team on this pack</h3>
  <table><tr><th>Agent</th><th class="n">Steps</th><th class="n">Minutes</th>${$('<th class="n">Cost</th>')}</tr>${st.agents
    .map((a) => {
      const mine = st.log.filter((l) => norm(l.who) === norm(a));
      return `<tr><td>${esc(a)}</td><td class="n">${mine.length}</td><td class="n">${mine.some((l) => l.minutes != null) ? mins(mine.reduce((s, l) => s + (Number(l.minutes) || 0), 0)) : '—'}</td>${$(`<td class="n">${money(mine.reduce((s, l) => s + (Number(l.cost) || 0), 0))}</td>`)}</tr>`;
    })
    .join('')}</table>
  <h3>Where the time went</h3>
  ${Object.keys(byWho).length ? barChart(Object.entries(byWho).map(([label, value]) => ({ label, value })), { unit: (v) => `${mins(v)} min`, right: 70 }) : ''}
  ${untimed.length ? `<p class="muted">Not timed: ${esc(untimed.join(', '))}.</p>` : ''}
  ${notes.length ? `<h3>What your agents learned from your examples</h3><ul class="styleNotes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
}

function findingCard(f) {
  const b = BUCKET[f.bucket];
  const right = f.bucket === 'fixed' ? f.fixed : f.bucket === 'kept' ? f.reason || f.fixed || '' : f.reason || f.fixed || (f.bucket === 'open' ? 'Not fixed yet: please look at it before you approve.' : 'Left for you to decide.');
  return `<div class="finding"><div class="fh"><span><b>${esc(f.where || '')}</b> · round ${esc(f.round)} · ${esc(f.agent)}</span><span class="pill${b.dark ? ' dark' : ''}${b.open ? ' open' : ''}">${esc(b.pill)}</span></div>
    <div class="ba"><div><div class="k">Before · what the checker caught</div>${esc(f.what || '')}${f.before ? `<q>${esc(f.before)}</q>` : ''}</div>
    <div><div class="k">${esc(b.right)}</div>${esc(right)}${f.after ? `<q>${esc(f.after)}</q>` : ''}</div></div>${(f.again || [])
      .map((g) => `<div class="again"><b>Found again in round ${esc(g.round)}</b> by ${esc(g.agent)} (counted once): ${esc(g.what || '')}</div>`)
      .join('')}</div>`;
}

function findingsSection(st) {
  if (!st.findings.length) return `<h2 class="pb">What the checkers caught</h2><p class="lead">The checkers found nothing that needed a change.</p>`;
  // An open FIX comes first (docs/RUNBOOK.md, "When round 3 ends with an open FIX"), then the teacher's calls.
  const order = ['open', 'teacher', 'fixed', 'kept'];
  const heads = { teacher: 'Left for you to decide', open: 'Not fixed yet', fixed: 'Fixed', kept: 'Looked at and kept on purpose' };
  const keptLine = (f) => `<li><b>${esc(f.where || '')}</b> · round ${esc(f.round)} · ${esc(f.agent)}: ${esc(firstSentence(f.what, 170))}${f.reason ? ` <i>Kept because:</i> ${esc(firstSentence(f.reason, 120))}` : ''}${(f.again || []).length ? ` (found again in round ${esc(f.again.map((g) => g.round).join(', '))}, counted once)` : ''}</li>`;
  return `<h2 class="pb">What the checkers caught, and how it was fixed</h2>
  <p class="lead">${plural(st.findings.length, 'finding')} in all${st.duplicates ? ` (${st.duplicates} more ${st.duplicates === 1 ? 'was the same problem' : 'were the same problems'} found again in a later round, shown under the first and counted once)` : ''}. ${esc(findingWords(st))} Wrong choices and wording were fixed; answer keys were never changed just to pass a check.</p>
  ${order
    .map((b) => {
      const list = st.findings.filter((f) => f.bucket === b);
      if (b === 'kept' && list.length) return `<h3>${heads[b]} (${list.length})</h3><p class="muted">One line each: where, who and why it was kept.</p><ul class="keptList">${list.map(keptLine).join('')}</ul>`;
      return list.length ? `<div class="keep"><h3>${heads[b]} (${list.length})</h3>${findingCard(list[0])}</div>${list.slice(1).map(findingCard).join('')}` : '';
    })
    .join('')}`;
}

// A Wilco round is either the keys check (counts of rows, errors, warnings) or the test-wise bots (chance and a line).
const isKeys = (r) => r.check === 'keys' || (r.check == null && r.chance == null && (r.rows != null || r.errors != null));

function botRows(r, ctx, line) {
  return (r.worst || []).map((w) => {
    const [label, value, info] = Array.isArray(w) ? w : [w.name, w.score, w];
    const known = info && typeof info === 'object' && 'judged' in info ? info.judged : ctx.botJudged?.(label);
    const unjudged = known === false;
    return { label, value: Number(value), unjudged, over: !unjudged && Number(value) > line + 1e-9 };
  });
}

function wilcoHtml(wilco, ctx) {
  const keys = wilco.filter(isKeys), bots = wilco.filter((r) => !isKeys(r));
  let s = '';
  if (keys.length) {
    s += `<p class="muted">The keys check reads every question row: one right answer, keys in range, A and B testing the same skills at the same levels.</p>
    <table><tr><th>Round</th><th>Keys check</th><th class="n">Rows</th><th class="n">Errors</th><th class="n">Warnings</th></tr>${keys
      .map((r) => `<tr><td>${esc(r.round ?? 1)}</td><td><b>${r.pass ? 'passed' : 'did not pass'}</b>${(r.problems || []).length ? `: ${esc(r.problems.map((p) => (typeof p === 'string' ? p : p.what || JSON.stringify(p))).join('; '))}` : ''}</td><td class="n">${r.rows ?? '—'}</td><td class="n">${r.errors ?? 0}</td><td class="n">${r.warnings ?? 0}</td></tr>`)
      .join('')}</table>`;
  }
  if (bots.length) {
    s += `<p class="muted">Each test-wise bot answers with a trick (pick the longest choice, the largest number, and so on). A bot passes when it scores no higher than the line, ${
      bots.some((r) => r.line != null) ? 'set for each round' : '10 points above chance'
    }. A bot is only judged when there are enough questions of its kind (a number bot needs 3 questions with number choices); with fewer, one question would swing it, so it is shown greyed and not judged.</p>`;
    for (const r of bots) {
      const chance = Number(r.chance) || 0;
      const line = r.line ?? chance + 0.1;
      const rows = botRows(r, ctx, line);
      const judged = rows.filter((x) => !x.unjudged);
      const top = judged.length ? Math.max(...judged.map((x) => x.value)) : null;
      const who = top == null ? [] : judged.filter((x) => x.value === top).map((x) => x.label);
      s += `<p><b>Round ${esc(r.round ?? 1)}:</b> ${r.pass ? 'passed' : 'did not pass'}${r.questions != null ? ` on ${plural(r.questions, 'choice question')}` : ''}. Chance ${pct(chance)}, line ${pct(line)}${r.bots ? `, ${esc(r.bots)} bots run` : ''}${
        who.length ? `, highest judged ${who.length === 1 ? `bot: ${esc(who[0])}` : `bots: ${esc(who.join(', '))}`} at ${pct(top)}` : ''
      }.</p>${rows.length ? barChart(rows, { max: Math.max(0.6, line + 0.1, ...rows.map((x) => x.value)), line, chance, unit: pct }) : ''}`;
    }
  }
  return s;
}

function checksSection(pack, st, ctx) {
  const c = pack.checks || {};
  const blind = c.blind || [], solver = c.solver || [], wilco = c.wilco || [], facts = c.facts || [];
  let s = `<h2 class="pb">The checks, round by round</h2><p class="lead">Each check is run by a fresh agent that didn't write the work. Early rounds catch problems; the last round of each check is what this pack passed.</p>`;
  s += `<h3>🙈 Blind tester: solved the student copy with no key</h3>`;
  // Reading items: how many a reader got right WITHOUT the passages (the no-passage probe, agents/blind-ela.md)
  const pf = blind.some((r) => r.passageFree && Object.keys(r.passageFree).length);
  const pfCell = (r) => (r.passageFree ? Object.entries(r.passageFree).map(([v, x]) => `${esc(v)}: ${esc(x.matched)} of ${esc(x.of)}`).join(' · ') + (r.gate ? ` (${r.gate === 'pass' ? 'passed' : 'failed'})` : '') : '—');
  s += blind.length
    ? `<table><tr><th>Round</th><th>Agent</th><th class="n">Matched the key</th>${pf ? '<th class="n">Right without the passages</th>' : ''}<th class="n">Findings</th></tr>${blind.map((r) => `<tr><td>${esc(r.round ?? 1)}</td><td>${esc(r.agent || CHECK_NAMES.blind)}</td><td class="n"><b>${esc(r.matched)} of ${esc(r.of)}</b></td>${pf ? `<td class="n">${pfCell(r)}</td>` : ''}<td class="n">${(r.findings || []).length}</td></tr>`).join('')}</table>
      <p class="muted">Later rounds recheck only the questions that changed. Where the blind tester's answer didn't match the key, the question was looked at again (see the findings).${pf ? ' "Right without the passages": answered from the questions alone, before reading; a reading question should need the passage, so about 40% or more right (chance is 25%) fails the round and the questions are redesigned.' : ''}</p>`
    : `<p class="muted">Not run for this pack.</p>`;
  s += `<h3>🧮 Solver: worked every answer on its own</h3>`;
  s += solver.length
    ? `<table><tr><th>Round</th><th class="n">Answers worked</th><th class="n">Disagreements with the key</th><th class="n">Findings</th></tr>${solver.map((r) => `<tr><td>${esc(r.round ?? 1)}</td><td class="n">${esc(r.checked)}</td><td class="n"><b>${esc(r.disagree)}</b></td><td class="n">${(r.findings || []).length}</td></tr>`).join('')}</table>`
    : `<p class="muted">Not used for this subject.</p>`;
  s += `<h3>🤖 Wilco: are the keys sound, and could a student guess without knowing?</h3>`;
  s += wilco.length ? wilcoHtml(wilco, ctx) : `<p class="muted">No multiple-choice questions to test.</p>`;
  s += `<h3>🔎 Fact checker: every claim, date, name and term</h3>`;
  s += facts.length
    ? `<table><tr><th>Round</th><th class="n">Claims checked</th><th class="n">Flagged</th><th>Notes</th></tr>${facts.map((r) => `<tr><td>${esc(r.round ?? 1)}</td><td class="n">${esc(r.claims)}</td><td class="n">${esc(r.flagged)}</td><td>${esc(r.notes || '')}</td></tr>`).join('')}</table>`
    : `<p class="muted">${['science', 'social', 'ela'].includes(pack.order?.subject) ? 'Not run for this pack.' : `Not used for this subject${pack.order?.subject === 'math' ? ' (math answers are checked by the solver instead)' : ''}.`}</p>`;
  return s;
}

// The teacher's own uploaded original (a "versions" order): what the checkers found in it. Not counted with the pack's
// findings, because nobody here wrote it.
function originalSection(pack) {
  const o = pack.originalReview;
  if (!o) return '';
  const list = o.findings || [];
  const word = { FIX: 'Worth fixing', KEEP: 'Fine as it is', JUDGMENT: 'Your call' };
  return `<h2 class="pb">What we found in your original</h2>
  <p class="lead">${o.file ? `Your upload: <b>${esc(o.file)}</b>. ` : ''}${esc(o.summary || 'The checkers looked over the test you sent before the versions were made.')} These are findings about your original, not about the versions: nothing in your file was changed.</p>
  ${list.length
    ? list
        .map(
          (f) => `<div class="finding"><div class="fh"><span><b>${esc(f.where || '')}</b>${f.agent ? ` · ${esc(f.agent)}` : ''}</span><span class="pill${String(f.kind).toUpperCase() === 'FIX' ? ' dark' : ''}">${esc(word[String(f.kind || 'FIX').toUpperCase()] || f.kind)}</span></div>
    <div class="ba"><div><div class="k">What we found</div>${esc(f.what || '')}${f.before ? `<q>${esc(f.before)}</q>` : ''}</div>
    <div><div class="k">What we suggest${f.inVersions ? ' · in the versions' : ''}</div>${esc(f.suggestion || f.fixed || f.reason || '')}${f.inVersions ? `<q>${esc(f.inVersions)}</q>` : ''}</div></div></div>`
        )
        .join('')
    : '<p class="muted">We found nothing to change in your original.</p>'}
  ${(o.notes || []).length ? `<ul>${o.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
}

function auditorSection(pack, ctx, st, owner) {
  const a = pack.audit || {};
  return `<h2 class="pb">What the auditor changed</h2>
  <p class="lead">After the order, the auditor reads every finding and changes the agents' briefs so the same mistake is less likely next time.</p>
  ${(a.briefChanges || []).length ? `<h3>Changes to the agents' briefs</h3><ul>${a.briefChanges.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">No brief changes from this order.</p>'}
  ${(a.notes || []).length ? `<h3>Notes</h3><ul>${a.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  ${owner ? ownerCosts(pack, ctx, st) : ''}
  ${approvalLine(ctx)}<div class="notice"><b>Made with AI. Check it before students see it.</b><br>${esc(ctx.brand.aiNotice)}<br><br>${esc(ctx.brand.deleteNotice)}</div>`;
}

// Two files from one pack (owner, Nov 8, 2026): the teacher's AUDIT-REPORT.pdf (a 2–3 page report in plain words, then
// "Appendix: the full log", with no dollars and no model-token counts anywhere) and the owner's AUDIT-REPORT-OWNER.pdf
// (the same, plus costs, token and cache detail). The owner copy is never delivered (render-pack.mjs writes it outside
// out-preview/ and out/). `teacherHtml` is the teacher part alone (the checks count its pages and its words).
export function auditHtml(pack, ctx, { owner = false } = {}) {
  if (!owner) pack = forTeacher(pack);
  const st = auditStats(pack);
  const head = `<!doctype html><html><head><meta charset="utf-8"><title>${owner ? 'Audit report (owner copy)' : 'Audit report'}</title><style>${css(ctx)}</style></head><body>`;
  const teacher = teacherPart(pack, ctx, st, owner);
  const appendix = `<section class="appendix pb"><div class="divider"><div class="k">Appendix</div><h1>The full log</h1><p>Everything the agents did, step by step, with every finding and every check, for the record. You don't need it to use your pack.${owner ? ' <b>Owner copy:</b> with costs and token detail. Never send this file to the teacher.' : ''}</p></div>` +
    timeline(pack, st, owner) + findingsSection(st) + originalSection(pack) + checksSection(pack, st, ctx) + auditorSection(pack, ctx, st, owner) + '</section>';
  return {
    html: head + teacher + appendix + '</body></html>',
    teacherHtml: head + teacher + '</body></html>',
    stats: st,
  };
}

const ITEM_WORDS = { worksheet: 'Worksheet', homework: 'Homework', bellringer: 'Bell Ringers', notes: 'Guided Notes', quiz: 'Quiz', test: 'Unit Test', studyguide: 'Study Guide', slides: 'Lesson Slides', reviewgame: 'Review Game', rubric: 'Rubric', project: 'Project Packet', unitpack: 'Unit Pack' };
function exampleTitle(pack) {
  const o = pack.order || {};
  const docs = pack.documents || [];
  const kinds = [...new Set(docs.map((d) => ITEM_WORDS[d.kind || d.item]).filter(Boolean))];
  const what = kinds.length > 1 ? `${kinds.slice(0, -1).join(', ')} and ${kinds[kinds.length - 1]}` : kinds[0] || 'Practice';
  const topic = String(o.topic || '').replace(/\b([a-z])([a-z]{3,})/g, (m, a, b) => a.toUpperCase() + b);
  const ab = docs.some((d) => (d.versions || []).length > 1) ? ' with A/B Versions' : '';
  return [o.grade && `Grade ${o.grade}`, topic, what].filter(Boolean).join(' ') + ab;
}
