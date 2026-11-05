// AUDIT-REPORT.pdf and SELL-IT-ON-TPT.pdf. Every number here is counted from the pack: nothing is estimated or rounded up.
// Display formats are the same everywhere: minutes to 1 decimal, money to 2, percents whole (util.mjs).

import { esc, money, int, mins, pct, questionsOf, inkAccent, fontStack } from './util.mjs';
import { gameItemCount } from './games.mjs';

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
  if (ctx.preview) return `<div class="notice"><b>Preview: not approved yet.</b> Nothing is released until the teacher signs off in REVIEW.html.</div>`;
  return '';
}

function frontPage(pack, ctx, st) {
  const o = pack.order || {};
  const what = [o.topic, [o.grade && `grade ${o.grade}`, ctx.subjectLabel?.toLowerCase()].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  const checkers = st.agents.filter((a) => !NOT_CHECKERS.test(a));
  const summary = [
    `The maker wrote ${plural(st.questionsInPack, 'question')}${(pack.documents || []).some((d) => d.versions?.length > 1) ? ' (counting each version)' : ''}.`,
    checkers.length ? `${plural(checkers.length, 'separate agent')} that didn't write ${checkers.length === 1 ? 'it' : 'them'} checked the work over ${plural(st.rounds, 'round')}.` : '',
    findingWords(st),
  ].filter(Boolean).join(' ');
  const docs = (pack.documents || []).map((d) => `${esc(d.title)}${d.versions?.length ? ` (versions ${esc(d.versions.join(', '))})` : ''}`).join(' · ');
  const orig = pack.originalReview;
  const tileHow = [st.kept && `${st.kept} kept on purpose`, st.teacher && `${st.teacher} left for you to decide`, st.open && `${st.open} not fixed yet`].filter(Boolean).join(' · ');
  return `<section class="front"><div class="brand"><span>${esc(ctx.brand.name)} · Audit report</span><span>${esc(pack.id || '')}</span></div>
  <h1>How your pack was made</h1>
  <p class="for">${esc(what)}${o.teacher ? ` · for ${esc(o.teacher)}` : ''}${ctx.date ? ` · ${esc(ctx.date)}` : ''}</p>
  <div class="summary">${esc(summary)}</div>
  <div class="tiles">
    ${tile(int(st.agents.length), 'agents involved', `${plural(st.log.length, 'logged step')}. The agent that writes never checks its own work.`)}
    ${tile(int(st.rounds), st.rounds === 1 ? 'round of checks' : 'rounds of checks', `${plural(st.checkRuns, 'check run')} by fresh agents${st.wilcoRuns ? `, plus ${plural(st.wilcoRuns, 'Wilco run')}` : ''}; each round rechecks the fixes.`)}
    ${tile(int(st.questionsChecked || st.questionsInPack), 'questions checked', `${st.questionsInPack} in the pack, each version counted.`)}
    ${tile(`${int(st.fixFound)}<small> → ${int(st.fixed)} fixed</small>`, 'catches found and fixed', tileHow || 'Every catch is listed with before and after.')}
    ${tile(mins(st.minutes), 'minutes of agent work', `${st.first ? `Logged from ${st.first} to ${st.last}` : 'Added up from the log'}${st.unlogged ? `; ${plural(st.unlogged, 'step')} not timed` : ''}.`)}
    ${tile(money(st.cost), 'AI cost of this pack', `${int(st.tokens)} tokens, added up from the log.`)}
  </div>
  ${approvalLine(ctx)}
  <h3>In this pack</h3><p>${docs}${orig ? `. We also checked your original${orig.file ? ` (${esc(orig.file)})` : ''}: ${plural((orig.findings || []).length, 'finding')}, on the page "What we found in your original".` : ''}</p>
  <div class="notice"><b>Check it before students see it.</b> ${esc(ctx.brand.aiNotice)}</div></section>`;
}

function timeline(pack, st) {
  const byWho = {};
  for (const l of st.log) if (l.minutes != null) byWho[l.who || '—'] = (byWho[l.who || '—'] || 0) + (Number(l.minutes) || 0);
  const untimed = [...new Set(st.log.filter((l) => l.minutes == null).map((l) => l.who))].filter((w) => !(w in byWho));
  const notes = pack.style?.notes || [];
  return `<h2 class="pb">Every step, in order</h2>
  <p class="lead">The reporter logged each step as it happened: who did it, what they did, how long it took and what it cost. A dash means the step wasn't timed.</p>
  <table><tr><th style="width:7%">Time</th><th style="width:19%">Who</th><th>What</th><th class="n">Minutes</th><th class="n">Tokens</th><th class="n">Cost</th></tr>
  ${st.log.map((l) => `<tr><td>${esc(l.at || '')}</td><td>${esc(l.who || '')}</td><td>${esc(l.what || '')}</td><td class="n">${mins(l.minutes)}</td><td class="n">${l.tokens != null ? int(l.tokens) : '—'}</td><td class="n">${l.cost != null ? money(l.cost) : '—'}</td></tr>`).join('')}
  <tr class="tot"><td></td><td>${plural(st.log.length, 'step')}</td><td>Total</td><td class="n">${mins(st.minutes)}</td><td class="n">${int(st.tokens)}</td><td class="n">${money(st.cost)}</td></tr></table>
  <h3>The team on this pack</h3>
  <table><tr><th>Agent</th><th class="n">Steps</th><th class="n">Minutes</th><th class="n">Cost</th></tr>${st.agents
    .map((a) => {
      const mine = st.log.filter((l) => norm(l.who) === norm(a));
      return `<tr><td>${esc(a)}</td><td class="n">${mine.length}</td><td class="n">${mine.some((l) => l.minutes != null) ? mins(mine.reduce((s, l) => s + (Number(l.minutes) || 0), 0)) : '—'}</td><td class="n">${money(mine.reduce((s, l) => s + (Number(l.cost) || 0), 0))}</td></tr>`;
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
  return `<h2 class="pb">What the checkers caught, and how it was fixed</h2>
  <p class="lead">${plural(st.findings.length, 'finding')} in all${st.duplicates ? ` (${st.duplicates} more ${st.duplicates === 1 ? 'was the same problem' : 'were the same problems'} found again in a later round, shown under the first and counted once)` : ''}. ${esc(findingWords(st))} Wrong choices and wording were fixed; answer keys were never changed just to pass a check.</p>
  ${order
    .map((b) => {
      const list = st.findings.filter((f) => f.bucket === b);
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

function auditorSection(pack, ctx) {
  const a = pack.audit || {};
  return `<h2 class="pb">What the auditor changed</h2>
  <p class="lead">After the order, the auditor reads every finding and changes the agents' briefs so the same mistake is less likely next time.</p>
  ${(a.briefChanges || []).length ? `<h3>Changes to the agents' briefs</h3><ul>${a.briefChanges.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">No brief changes from this order.</p>'}
  ${(a.notes || []).length ? `<h3>Notes</h3><ul>${a.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  ${approvalLine(ctx)}<div class="notice"><b>Made with AI. Check it before students see it.</b><br>${esc(ctx.brand.aiNotice)}<br><br>${esc(ctx.brand.deleteNotice)}</div>`;
}

export function auditHtml(pack, ctx) {
  const st = auditStats(pack);
  const body = frontPage(pack, ctx, st) + timeline(pack, st) + findingsSection(st) + originalSection(pack) + checksSection(pack, st, ctx) + auditorSection(pack, ctx);
  return { html: `<!doctype html><html><head><meta charset="utf-8"><title>Audit report</title><style>${css(ctx)}</style></head><body>${body}</body></html>`, stats: st };
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

export function tptHtml(pack, ctx, sellable) {
  const o = pack.order || {};
  const body = `<div class="brand"><span>${esc(ctx.brand.name)} · Sell it yourself</span><span>${esc(pack.id || '')}</span></div>
  <h1 style="font-size:22pt;margin-top:12pt">Selling this pack on Teachers Pay Teachers</h1>
  <p class="for" style="margin-bottom:8pt">A practical guide. It isn't legal advice, and TPT's rules can change, so check them before you list.</p>
  <div class="two">
  <div>
    <h3 style="margin-top:2pt">1. Make sure it's yours to sell</h3>
    <ul><li>Sell it only if the source you uploaded is your own work (your notes, your old worksheets) or material you have the rights to sell.</li>
    <li>If it came from a textbook, a bought curriculum or someone else's product, don't sell it: that material belongs to them.</li>
    <li>Some schools and districts have rules about selling material made for your job. Check yours.</li></ul>
    <h3>2. Check it first</h3>
    <ul><li>Read every question and key yourself. The agents checked it, but you're the one putting your name on it.</li>
    <li>Try it with students once if you can, and fix anything that confused them.</li></ul>
    <h3>3. What to upload</h3>
    <ul>${sellable.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <p class="muted">Leave out AUDIT-REPORT.pdf, project.json and README.txt: they're for you.</p>
  </div>
  <div>
    <h3 style="margin-top:2pt">4. How to describe it</h3>
    <ul><li>Title: grade, topic and type, for example "${esc(exampleTitle(pack))}".</li>
    <li>Say exactly what's inside: page counts, versions, that keys are included.</li>
    <li>Use a student page for the preview, never the key.</li>
    <li>Only list standards you've checked the pack really covers.</li>
    <li>Price it by looking at similar listings. We don't guess sales or prices.</li></ul>
    <h3>5. Say it was made with AI</h3>
    <p>Put a line like this in your description:</p>
    <div class="summary" style="font-size:10.5pt">"This resource was drafted with AI tools from my own teaching materials, then reviewed and edited by me."</div>
    <p>Keep the "Made with AI" footer on the pages. Before you list, <b>read TPT's current policy on AI-made resources</b> (in their seller help pages and terms) and follow it: it may ask for a specific disclosure or a setting on the listing.</p>
  </div></div>
  <div class="notice">${esc(ctx.brand.aiNotice)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Sell it on TPT</title><style>${css(ctx)}</style></head><body>${body}</body></html>`;
}
