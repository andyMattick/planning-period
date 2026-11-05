// AUDIT-REPORT.pdf and SELL-IT-ON-TPT.pdf. Every number here is counted from the pack: nothing is estimated or rounded up.

import { esc, money, int, questionsOf, inkAccent, fontStack } from './util.mjs';

const CHECK_NAMES = { blind: '🙈 Blind tester', solver: '🧮 Solver', wilco: '🤖 Wilco', facts: '🔎 Fact checker' };
const KIND_WORDS = { FIX: 'Fixed', KEEP: 'Looked at and kept', JUDGMENT: 'Judgment call' };

const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;
const norm = (s) => String(s || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().toLowerCase();

export function auditStats(pack) {
  const log = pack.log || [];
  const checks = pack.checks || {};
  const findings = [];
  const runs = [];
  for (const kind of Object.keys(CHECK_NAMES)) {
    for (const r of checks[kind] || []) {
      runs.push({ kind, ...r });
      for (const f of r.findings || []) findings.push({ check: kind, round: r.round ?? 1, agent: r.agent || CHECK_NAMES[kind], ...f });
    }
  }
  const agents = new Map();
  for (const l of log) if (l.who && !agents.has(norm(l.who))) agents.set(norm(l.who), l.who);
  for (const r of runs) {
    const who = r.agent || CHECK_NAMES[r.kind];
    if (!agents.has(norm(who))) agents.set(norm(who), who);
  }
  const questionsInPack = (pack.documents || []).reduce((s, d) => s + questionsOf(d).length * Math.max(1, (d.versions || []).length), 0);
  const checkedCounts = runs.map((r) => Number(r.of ?? r.checked ?? 0)).filter(Boolean);
  const caught = findings.filter((f) => (f.kind || 'FIX') !== 'KEEP');
  const fixed = caught.filter((f) => f.fixed);
  return {
    log,
    runs,
    findings,
    agents: [...agents.values()],
    rounds: runs.length ? Math.max(...runs.map((r) => Number(r.round) || 1)) : 0,
    checkRuns: runs.length,
    questionsInPack,
    questionsChecked: checkedCounts.length ? Math.max(...checkedCounts) : 0,
    caught: caught.length,
    fixed: fixed.length,
    kept: findings.length - caught.length,
    minutes: log.reduce((s, l) => s + (Number(l.minutes) || 0), 0),
    tokens: log.reduce((s, l) => s + (Number(l.tokens) || 0), 0),
    cost: log.reduce((s, l) => s + (Number(l.cost) || 0), 0),
    first: log[0]?.at,
    last: log[log.length - 1]?.at,
  };
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
  .notice { border: 2pt solid #000; padding: 8pt 11pt; border-radius: 4pt; margin-top: 10pt; break-inside: avoid; }
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
  `;
}

function tile(big, lab, how) {
  return `<div class="tile"><div class="big">${big}</div><div class="lab">${esc(lab)}</div><div class="how">${esc(how)}</div></div>`;
}

function barChart(rows, { width = 640, max, line, chance, unit = (v) => v } = {}) {
  // rows: [{label, value, over?}]; grayscale bars, hatched when over the line.
  const rowH = 22, labelW = 170, right = 70, top = chance != null || line != null ? 18 : 4;
  const h = top + rows.length * rowH + 6;
  const M = max || Math.max(1e-9, ...rows.map((r) => r.value), line || 0, chance || 0);
  const X = (v) => labelW + (v / M) * (width - labelW - right);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" font-family="Arial, sans-serif" font-size="11">
  <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="3"/></pattern></defs>`;
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    s += `<text x="${labelW - 6}" y="${y + 14}" text-anchor="end">${esc(r.label)}</text>
    <rect x="${labelW}" y="${y + 3}" width="${Math.max(1, X(r.value) - labelW)}" height="${rowH - 8}" fill="${r.over ? 'url(#hatch)' : '#8a8a8a'}" stroke="#000" stroke-width="1"/>
    <text x="${X(r.value) + 5}" y="${y + 14}" font-weight="700">${esc(unit(r.value))}${r.over ? ' (over)' : ''}</text>`;
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
  const allFixed = st.caught > 0 && st.fixed === st.caught;
  const checkers = st.agents.filter((a) => !/maker|reporter|auditor/i.test(a));
  const summary = [
    `The maker wrote ${st.questionsInPack} question${st.questionsInPack === 1 ? '' : 's'}${(pack.documents || []).some((d) => d.versions?.length > 1) ? ' (counting each version)' : ''}.`,
    checkers.length ? `${checkers.length} separate agent${checkers.length === 1 ? '' : 's'} that didn't write ${checkers.length === 1 ? 'it' : 'them'} checked the work over ${st.rounds} round${st.rounds === 1 ? '' : 's'}.` : '',
    st.caught
      ? `They caught ${st.caught} problem${st.caught === 1 ? '' : 's'}; ${allFixed ? `all ${st.fixed} were fixed` : `${st.fixed} ${st.fixed === 1 ? 'was' : 'were'} fixed`} before this pack was made.`
      : `They found nothing that needed a fix.`,
    st.kept ? `${st.kept} more ${st.kept === 1 ? 'was' : 'were'} looked at and kept on purpose (the reasons are with the findings).` : '',
  ].filter(Boolean).join(' ');
  const docs = (pack.documents || []).map((d) => `${esc(d.title)}${d.versions?.length ? ` (versions ${esc(d.versions.join(', '))})` : ''}`).join(' · ');
  return `<div class="brand"><span>${esc(ctx.brand.name)} · Audit report</span><span>${esc(pack.id || '')}</span></div>
  <h1>How your pack was made</h1>
  <p class="for">${esc(what)}${o.teacher ? ` · for ${esc(o.teacher)}` : ''}${ctx.date ? ` · ${esc(ctx.date)}` : ''}</p>
  <div class="summary">${esc(summary)}</div>
  <div class="tiles">
    ${tile(int(st.agents.length), 'agents involved', `${st.log.length} logged steps. The agent that writes never checks its own work.`)}
    ${tile(int(st.rounds), st.rounds === 1 ? 'round of checks' : 'rounds of checks', `${st.checkRuns} check runs in all; each round rechecks the fixes.`)}
    ${tile(int(st.questionsChecked || st.questionsInPack), 'questions checked', `${st.questionsInPack} in the pack, each version counted.`)}
    ${tile(`${int(st.caught)}<small> → ${int(st.fixed)} fixed</small>`, 'catches found and fixed', st.kept ? `Plus ${st.kept} looked at and kept on purpose.` : 'Every catch is listed with before and after.')}
    ${tile(int(Math.round(st.minutes)), 'minutes of agent work', st.first ? `Logged from ${st.first} to ${st.last}.` : 'Added up from the log.')}
    ${tile(money(st.cost), 'AI cost of this pack', `${int(st.tokens)} tokens, added up from the log.`)}
  </div>
  ${approvalLine(ctx)}
  <h3>In this pack</h3><p>${docs}</p>

  ${(pack.style?.notes || []).length ? `<h3>What your agents learned from your examples</h3><ul>${pack.style.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
  <div class="notice"><b>Check it before students see it.</b> ${esc(ctx.brand.aiNotice)}</div>`;
}

function timeline(st) {
  const byWho = {};
  for (const l of st.log) byWho[l.who || '—'] = (byWho[l.who || '—'] || 0) + (Number(l.minutes) || 0);
  return `<h2 class="pb">Every step, in order</h2>
  <p class="lead">The reporter logged each step as it happened: who did it, what they did, how long it took and what it cost.</p>
  <table><tr><th>Time</th><th>Who</th><th>What</th><th class="n">Minutes</th><th class="n">Tokens</th><th class="n">Cost</th></tr>
  ${st.log.map((l) => `<tr><td>${esc(l.at || '')}</td><td>${esc(l.who || '')}</td><td>${esc(l.what || '')}</td><td class="n">${esc(l.minutes ?? '')}</td><td class="n">${l.tokens != null ? int(l.tokens) : ''}</td><td class="n">${l.cost != null ? money(l.cost) : ''}</td></tr>`).join('')}
  <tr class="tot"><td></td><td>${st.log.length} steps</td><td>Total</td><td class="n">${int(Math.round(st.minutes))}</td><td class="n">${int(st.tokens)}</td><td class="n">${money(st.cost)}</td></tr></table>
  <h3>The team on this pack</h3>
  <table><tr><th>Agent</th><th class="n">Steps</th><th class="n">Minutes</th><th class="n">Cost</th></tr>${st.agents
    .map((a) => {
      const mine = st.log.filter((l) => norm(l.who) === norm(a));
      return `<tr><td>${esc(a)}</td><td class="n">${mine.length}</td><td class="n">${int(mine.reduce((s, l) => s + (Number(l.minutes) || 0), 0))}</td><td class="n">${money(mine.reduce((s, l) => s + (Number(l.cost) || 0), 0))}</td></tr>`;
    })
    .join('')}</table>
  <h3>Where the time went</h3>
  ${barChart(Object.entries(byWho).map(([label, value]) => ({ label, value })), { unit: (v) => `${v} min` })}`;
}

function findingsSection(st) {
  if (!st.findings.length) return `<h2 class="pb">What the checkers caught</h2><p class="lead">The checkers found nothing that needed a change.</p>`;
  const card = (f) => `<div class="finding"><div class="fh"><span><b>${esc(f.where || '')}</b> · round ${esc(f.round)} · ${esc(f.agent)}</span><span class="pill${(f.kind || 'FIX') === 'FIX' ? ' dark' : ''}">${esc(KIND_WORDS[f.kind || 'FIX'] || f.kind)}</span></div>
    <div class="ba"><div><div class="k">Before · what the checker caught</div>${esc(f.what || '')}${f.before ? `<q>${esc(f.before)}</q>` : ''}</div>
    <div><div class="k">${(f.kind || 'FIX') === 'KEEP' ? 'Why it was kept' : 'After · how it was fixed'}</div>${esc(f.fixed || f.reason || (f.kind === 'KEEP' ? '' : 'Not fixed'))}${f.after ? `<q>${esc(f.after)}</q>` : ''}</div></div></div>`;
  return `<h2 class="pb">What the checkers caught, and how it was fixed</h2>
  <p class="lead">${st.findings.length} finding${st.findings.length === 1 ? '' : 's'} in all: ${st.caught} caught${st.caught ? ` (${st.fixed} fixed)` : ''}${st.kept ? `, ${st.kept} looked at and kept` : ''}. Wrong choices and wording were fixed; answer keys were never changed just to pass a check.</p>
  ${st.findings.map(card).join('')}`;
}

function checksSection(pack, st) {
  const c = pack.checks || {};
  const blind = c.blind || [], solver = c.solver || [], wilco = c.wilco || [], facts = c.facts || [];
  let s = `<h2 class="pb">The checks, round by round</h2><p class="lead">Each check is run by a fresh agent that didn't write the work. Early rounds catch problems; the last round of each check is what this pack passed.</p>`;
  s += `<h3>🙈 Blind tester: solved the student copy with no key</h3>`;
  s += blind.length
    ? `<table><tr><th>Round</th><th>Agent</th><th class="n">Matched the key</th><th class="n">Findings</th></tr>${blind.map((r) => `<tr><td>${esc(r.round ?? 1)}</td><td>${esc(r.agent || CHECK_NAMES.blind)}</td><td class="n"><b>${esc(r.matched)} of ${esc(r.of)}</b></td><td class="n">${(r.findings || []).length}</td></tr>`).join('')}</table>
      <p class="muted">Where the blind tester's answer didn't match the key, the question was looked at again (see the findings).</p>`
    : `<p class="muted">Not run for this pack.</p>`;
  s += `<h3>🧮 Solver: worked every answer on its own</h3>`;
  s += solver.length
    ? `<table><tr><th>Round</th><th class="n">Answers worked</th><th class="n">Disagreements with the key</th></tr>${solver.map((r) => `<tr><td>${esc(r.round ?? 1)}</td><td class="n">${esc(r.checked)}</td><td class="n"><b>${esc(r.disagree)}</b></td></tr>`).join('')}</table>`
    : `<p class="muted">Not used for this subject.</p>`;
  s += `<h3>🤖 Wilco: could a student guess without knowing?</h3>`;
  if (wilco.length) {
    s += `<p class="muted">Each bot answers with a trick (pick the longest choice, the odd one out, and so on). A bot passes when it scores no higher than the line; the line is ${
      wilco.some((r) => r.line != null) ? 'set per round' : '10 points above chance'
    }.</p>`;
    for (const r of wilco) {
      const line = r.line ?? (Number(r.chance) || 0) + 0.1;
      const rows = (r.worst || []).map(([label, value]) => ({ label, value: Number(value), over: Number(value) > line + 1e-9 }));
      s += `<p><b>Round ${esc(r.round ?? 1)}:</b> ${r.pass ? 'passed' : 'did not pass'}. Chance ${pct(r.chance)}, line ${pct(line)}${r.bots ? `, ${esc(r.bots)} bots run` : ''}${
        rows.length ? (() => { const top = Math.max(...rows.map((x) => x.value)); const who = rows.filter((x) => x.value === top).map((x) => x.label); return `, highest ${who.length === 1 ? `bot: ${esc(who[0])}` : `bots: ${esc(who.join(', '))}`} at ${pct(top)}`; })() : ''
      }.</p>${rows.length ? barChart(rows, { max: Math.max(0.6, line + 0.1, ...rows.map((x) => x.value)), line, chance: Number(r.chance), unit: pct }) : ''}`;
    }
  } else s += `<p class="muted">No multiple-choice questions to test.</p>`;
  s += `<h3>🔎 Fact checker: every claim, date, name and term</h3>`;
  s += facts.length
    ? `<table><tr><th>Round</th><th class="n">Claims checked</th><th class="n">Flagged</th><th>Notes</th></tr>${facts.map((r) => `<tr><td>${esc(r.round ?? 1)}</td><td class="n">${esc(r.claims)}</td><td class="n">${esc(r.flagged)}</td><td>${esc(r.notes || '')}</td></tr>`).join('')}</table>`
    : `<p class="muted">Not used for this subject${pack.order?.subject === 'math' ? ' (math answers are checked by the solver instead)' : ''}.</p>`;
  return s;
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
  const body = frontPage(pack, ctx, st) + timeline(st) + findingsSection(st) + checksSection(pack, st) + auditorSection(pack, ctx);
  return { html: `<!doctype html><html><head><meta charset="utf-8"><title>Audit report</title><style>${css(ctx)}</style></head><body>${body}</body></html>`, stats: st };
}

const ITEM_WORDS = { worksheet: 'Worksheet', notes: 'Guided Notes', quiz: 'Quiz', test: 'Unit Test', studyguide: 'Study Guide', slides: 'Lesson Slides', reviewgame: 'Review Game', rubric: 'Rubric', project: 'Project Packet', unitpack: 'Unit Pack' };
function exampleTitle(pack) {
  const o = pack.order || {};
  const docs = pack.documents || [];
  const kinds = [...new Set(docs.map((d) => ITEM_WORDS[d.item]).filter(Boolean))];
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
