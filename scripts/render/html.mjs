// Print HTML for student copies, teacher copies, rubrics, slide handouts and review-game cards.
// Letter size, black-and-white safe: color is only ever a second signal next to weight, borders or text.

import { mathHtml as mh, withMathCss, plainMath } from './math.mjs';
import { needsHowToGrade, gradingRows, gradingIntro } from './grading.mjs';
import { esc, vv, cleanSvg, questionsOf, answerText, keyText, workLinesFor, kindOf, tfValue, letter, fontStack, inkAccent, numLabel, choiceLabel, passagePlan, passageByline, BLIND_SKIPPED_LINE, blindSkipped } from './util.mjs';

const qLabel = (n, ctx) => (ctx.dayLabels ? `Day ${n}` : numLabel(n, ctx.layout));

export function baseCss(ctx) {
  const { style, layout } = ctx;
  const accent = inkAccent(style.accent);
  return `
  @page { size: Letter; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: ${fontStack(style.font)}; font-size: ${layout.fontSize}pt; line-height: 1.38; color: #000; background: #fff; }
  h1 { font-size: 20pt; margin: 0 0 2pt; color: ${accent}; line-height: 1.15; }
  h2 { font-size: 13pt; margin: 14pt 0 6pt; padding-bottom: 2pt; border-bottom: 1.5pt solid ${accent}; color: #000; break-after: avoid; }
  .sub { font-size: 9.5pt; color: #333; margin: 0 0 8pt; }
  .fields { display: flex; gap: 18pt; margin: 0 0 12pt; font-size: 11pt; }
  .fields.box { border: 1.5pt solid #000; padding: 8pt 10pt; border-radius: 3pt; }
  .field { display: flex; align-items: flex-end; gap: 5pt; flex: 1; }
  .field:first-child { flex: 2.2; }
  .field .ln { flex: 1; border-bottom: 1pt solid #000; height: 14pt; }
  .titlerow { display: flex; justify-content: space-between; align-items: flex-start; gap: 12pt; }
  .ver { border: 2pt solid #000; font-weight: 700; padding: 2pt 9pt; font-size: 12pt; white-space: nowrap; border-radius: 3pt; }
  .tbanner { border: 2pt solid #000; background: #eee; font-weight: 700; padding: 4pt 9pt; margin: 0 0 10pt; font-size: 11pt; letter-spacing: .02em; }
  .directions { margin: 4pt 0 10pt; }
  .directions.bold { font-weight: 700; }
  .q { display: grid; grid-template-columns: 22pt 1fr; gap: 0 4pt; margin: 0 0 12pt; break-inside: avoid; }
  .q .num { font-weight: 700; }
  .q.day { grid-template-columns: 44pt 1fr; }
  .q .body > p { margin: 0 0 4pt; }
  .fig { margin: 4pt 0 6pt; }
  .fig svg { max-width: 100%; height: auto; max-height: 3.2in; }
  .choices { display: grid; gap: 3pt 16pt; margin: 3pt 0 0 2pt; }
  .choices.c4 { grid-template-columns: repeat(4, 1fr); }
  .choices.c2 { grid-template-columns: repeat(2, 1fr); }
  .choices.c1 { grid-template-columns: 1fr; }
  .ch { display: flex; gap: 5pt; padding: 1pt 4pt; border: 1.5pt solid transparent; border-radius: 3pt; }
  .ch .l { font-weight: 700; min-width: 16pt; }
  .ch.right { border-color: #000; font-weight: 700; background: #f0f0f0; }
  .tf { display: flex; gap: 28pt; margin-top: 3pt; font-weight: 700; }
  .tf span { padding: 1pt 6pt; border: 1.5pt solid transparent; border-radius: 3pt; }
  .tf span.right { border-color: #000; background: #f0f0f0; }
  .ans { display: flex; align-items: flex-end; gap: 6pt; margin-top: 8pt; }
  .ans .ln { width: 2.4in; border-bottom: 1pt solid #000; height: 14pt; }
  .work { margin-top: 3pt; }
  .work .wl { height: 22pt; border-bottom: 0.75pt dashed #999; }
  .match { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; margin-top: 3pt; }
  .match .row { display: flex; gap: 6pt; margin-bottom: 4pt; align-items: flex-end; }
  .match .blank { display: inline-block; width: 26pt; border-bottom: 1pt solid #000; text-align: center; font-weight: 700; }
  .key { margin-top: 5pt; padding: 4pt 8pt; border-left: 3pt solid #000; background: #f4f4f4; font-size: 10.5pt; break-inside: avoid; }
  .key b { font-weight: 800; }
  .key .why { margin-top: 2pt; }
  .tag { font-size: 8.5pt; border: 1pt solid #555; padding: 0 4pt; border-radius: 6pt; margin-left: 4pt; white-space: nowrap; font-weight: 400; color: #222; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  th, td { border: 1pt solid #000; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #e6e6e6; }
  table.grade { font-size: 9pt; } table.grade tr { break-inside: avoid; } td.n, th.n { text-align: right; }
  .pb { break-before: page; }
  .keep { break-inside: avoid; page-break-inside: avoid; }
  .small { font-size: 9.5pt; color: #222; }
  .passage { margin: 6pt 0 14pt; }
  .passage h2 { margin-top: 10pt; }
  .passage .byline { font-size: 9.5pt; color: #222; margin: -2pt 0 6pt; font-style: italic; }
  .para { display: grid; grid-template-columns: 22pt 1fr; gap: 0 4pt; margin: 0 0 6pt; break-inside: avoid; line-height: 1.5; }
  .para .pn { font-weight: 700; font-size: 9.5pt; text-align: right; padding-right: 4pt; padding-top: 1.5pt; }
  .para p { margin: 0; }
  `;
}

function page(title, css, body) {
  return withMathCss(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`);
}

export const PREVIEW_MARK = 'PREVIEW — not approved for use';

// Preview pages (owner, Nov 8, 2026: a softer mark): nothing across the body. The mark is a light band in the top
// margin (headerTemplate) and a "PREVIEW" word in the footer, on every page; the body is left as the final will print.
export function watermark(html) {
  return html.replace('<body>', '<body data-preview="1">');
}

export function headerTemplate(text) {
  if (!text) return '<span></span>';
  return `<div style="width:100%;margin:0 0.45in;padding:3pt 0;background:#ececec;border-top:1.5pt solid #000;border-bottom:1.5pt solid #000;-webkit-print-color-adjust:exact;font-family:Arial,'Liberation Sans',sans-serif;font-size:8pt;font-weight:700;color:#000;text-align:center;letter-spacing:.06em;">${esc(text)}</div>`;
}

export function footerTemplate(label, brand, { preview = false } = {}) {
  // Chromium's footer: inline styles only, explicit font size.
  return `<div style="width:100%;font-family:Arial,'Liberation Sans',sans-serif;font-size:7.5pt;color:#333;padding:0 0.7in;display:flex;justify-content:space-between;align-items:center;">
  <span>${preview ? '<b style="color:#000;letter-spacing:.06em">PREVIEW</b> · ' : ''}${esc(label)}</span>
  <span>${esc(brand.shortName || brand.name)} · Made with AI · check before use</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
}

function fieldsHtml(layout) {
  return `<div class="fields${layout.nameBox ? ' box' : ''}">${layout.fields
    .map((f) => `<div class="field"><span>${esc(f)}:</span><span class="ln"></span></div>`)
    .join('')}</div>`;
}

function figureHtml(fig) {
  const svg = cleanSvg(fig);
  return svg ? `<div class="fig">${svg}</div>` : '';
}

function choiceCols(choices) {
  const longest = Math.max(0, ...choices.map((c) => plainMath(c).length));
  if (choices.length === 4 && longest <= 14) return 'c4';
  if (longest <= 34) return 'c2';
  return 'c1';
}

function questionHtml(item, ver, ctx, teacher) {
  const { q, n } = item;
  const L = ctx.layout;
  const type = q.type || 'short';
  const prompt = vv(q.prompt, ver);
  const ans = vv(q.answer, ver);
  let inner = `<p>${mh(prompt)}${teacher ? `<span class="tag">L${esc(q.level ?? '?')} · ${esc(q.skill || 'skill')}</span>` : ''}</p>`;
  inner += figureHtml(vv(q.figure, ver));
  if (type === 'mc') {
    const ch = vv(q.choices, ver) || [];
    inner += `<div class="choices ${choiceCols(ch)}">${ch
      .map((c, i) => `<div class="ch${teacher && Number(ans) === i ? ' right' : ''}"><span class="l">${choiceLabel(i, L)}</span><span>${mh(c, { bold: teacher && Number(ans) === i })}</span></div>`)
      .join('')}</div>`;
  } else if (type === 'tf') {
    const t = tfValue(ans);
    inner += `<div class="tf"><span class="${teacher && t ? 'right' : ''}">True</span><span class="${teacher && !t ? 'right' : ''}">False</span></div>`;
  } else if (type === 'match') {
    const left = vv(q.left, ver) || [];
    const right = vv(q.choices, ver) || [];
    const a = Array.isArray(ans) ? ans : [];
    inner += `<div class="match"><div>${left
      .map((x, i) => `<div class="row"><span class="blank">${teacher && a[i] != null ? letter(Number(a[i])) : '&nbsp;'}</span><span>${i + 1}. ${mh(x)}</span></div>`)
      .join('')}</div><div>${right.map((x, i) => `<div class="row"><b>${letter(i)}.</b> <span>${mh(x)}</span></div>`).join('')}</div></div>`;
  }
  if (!teacher) {
    const lines = workLinesFor(q, ctx);
    if (lines > 0) inner += `<div class="work">${'<div class="wl"></div>'.repeat(lines)}</div>`;
    const unit = vv(q.unit, ver);
    if (!['mc', 'tf', 'match', 'open'].includes(type)) inner += `<div class="ans"><span>Answer:</span><span class="ln"></span>${unit ? `<span>${mh(unit)}</span>` : ''}</div>`;
  }
  if (teacher) {
    const accept = (q.accept || []).length ? ` <span class="small">(also accept: ${mh(q.accept.join('; '))})</span>` : '';
    const label = type === 'open' ? 'A strong answer' : 'Answer';
    inner += `<div class="key"><div>${label}: <b>${mh(keyText(q, ver), { bold: true })}</b>${accept}</div>${q.why ? `<div class="why">Why: ${mh(vv(q.why, ver))}</div>` : ''}</div>`;
  }
  return `<div class="q${ctx.dayLabels ? ' day' : ''}"><div class="num">${qLabel(n, ctx)}</div><div class="body">${inner}</div></div>`;
}

function skillsMapHtml(doc, ver) {
  const items = questionsOf(doc);
  const levels = {};
  const skills = {};
  for (const { q, n } of items) {
    const lv = q.level ?? '?';
    levels[lv] = (levels[lv] || 0) + 1;
    (skills[q.skill || '—'] ||= []).push(n);
  }
  const total = items.length || 1;
  const lvRow = Object.keys(levels)
    .sort()
    .map((k) => `<td><b>Level ${esc(k)}</b>: ${levels[k]} (${Math.round((levels[k] / total) * 100)}%)</td>`)
    .join('');
  return `<h2 class="pb">Skills and level map</h2>
  <p class="small">Each question's skill and level (1 = on-ramp, 2 = on level, 3 = harder, often two steps).${
    doc.versions?.length > 1 ? ` Version ${doc.versions.join(' and ')} test the same skill at the same level, question for question.` : ''
  }</p>
  <table><tr>${lvRow}</tr></table><br>
  <table><tr><th>Skill</th><th>Questions</th><th>How many</th></tr>${Object.entries(skills)
    .map(([s, ns]) => `<tr><td>${esc(s)}</td><td>${ns.join(', ')}</td><td>${ns.length}</td></tr>`)
    .join('')}</table><br>
  <table><tr><th>#</th><th>Skill</th><th>Level</th><th>Type</th><th>Key${ver ? ` (version ${esc(ver)})` : ''}</th></tr>${items
    .map(
      ({ q, n }) =>
        `<tr><td>${n}</td><td>${esc(q.skill || '')}</td><td>${esc(q.level ?? '')}</td><td>${esc(q.type || 'short')}</td><td><b>${mh(keyText(q, ver), { bold: true })}</b></td></tr>`
    )
    .join('')}</table>`;
}

// How to grade (scripts/render/grading.mjs): points, full and partial credit, and what else to accept, per question.
function howToGradeHtml(doc, ver, ctx) {
  const rows = gradingRows(doc, ver, ctx.pack);
  const list = (r) => [...(r.accept.length ? [`Also accept: ${r.accept.map((a) => mh(a)).join('; ')}`] : []), ...r.notes.map((x) => esc(x))].join('<br>');
  return `<h2 class="pb">How to grade${ver ? ` · version ${esc(ver)}` : ''}</h2>
  <p class="small">${esc(gradingIntro(rows))}</p>
  <table class="grade"><tr><th style="width:5%">#</th><th class="n" style="width:7%">Points</th><th style="width:30%">Full credit</th><th style="width:28%">Partial credit</th><th>Also accept · look for</th></tr>${rows
    .map((r) => `<tr><td>${r.n}</td><td class="n">${r.points}${r.given ? '' : '*'}</td><td><b>${mh(r.full, { bold: true })}</b></td><td>${esc(r.partial)}</td><td>${list(r) || '—'}</td></tr>`)
    .join('')}</table>`;
}

export function rubricTableHtml(rubric) {
  if (!rubric?.criteria?.length) return '';
  const n = Math.max(...rubric.criteria.map((c) => (c.levels || []).length));
  const names = rubric.levelNames && rubric.levelNames.length >= n ? rubric.levelNames : Array.from({ length: n }, (_, i) => `${n - i}`);
  return `<table class="rubric"><tr><th style="width:18%">Criteria</th>${names.map((x) => `<th>${esc(x)}</th>`).join('')}</tr>${rubric.criteria
    .map((c) => `<tr><td><b>${esc(c.name)}</b>${c.points != null ? `<br><span class="small">${esc(c.points)} pts</span>` : ''}</td>${Array.from({ length: n }, (_, i) => `<td>${esc((c.levels || [])[i] ?? '')}</td>`).join('')}</tr>`)
    .join('')}</table>${rubric.note ? `<p class="small">${esc(rubric.note)}</p>` : ''}`;
}

function headerHtml(doc, ver, ctx, teacher) {
  const o = ctx.pack.order || {};
  const sub = [o.grade && `Grade ${o.grade}`, ctx.subjectLabel, o.topic].filter(Boolean).join(' · ');
  return `${teacher ? `<div class="tbanner">TEACHER COPY${ver ? ` · VERSION ${esc(ver)}` : ''} · the key is in bold, with why under each answer</div>${blindSkipped(ctx.pack) ? `<div class="tbanner">${esc(BLIND_SKIPPED_LINE)}</div>` : ''}` : fieldsHtml(ctx.layout)}
  <div class="titlerow"><div><h1>${esc(doc.title)}</h1>${teacher && sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>${ver ? `<div class="ver">Version ${esc(ver)}</div>` : ''}</div>
  ${doc.directions ? `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${mh(vv(doc.directions, ver))}</p>` : ''}`;
}

// A reading passage: its title, a byline (kind, source) and numbered paragraphs. The title and byline travel with
// the first paragraph, so a title is never left alone at the foot of a page; each paragraph stays whole.
function passageHtml(p, ver) {
  const paras = vv(p.paragraphs, ver) || [];
  const para = (t, i) => `<div class="para"><span class="pn">${i + 1}</span><p>${mh(t)}</p></div>`;
  const by = passageByline(p);
  return `<div class="passage"><div class="keep"><h2>${esc(p.title || 'Passage')}</h2>${by ? `<p class="byline">${esc(by)}</p>` : ''}${para(paras[0], 0)}</div>${paras.slice(1).map((t, i) => para(t, i + 1)).join('')}</div>`;
}

export function copyHtml(doc, ver, ctx, teacher) {
  const items = questionsOf(doc);
  const plan = passagePlan(doc, ver);
  let body = headerHtml(doc, ver, ctx, teacher);
  body += plan.top.map((p) => passageHtml(p, ver)).join('');
  (doc.sections || []).forEach((sec, si) => {
    body += (plan.before.get(si) || []).map((p) => passageHtml(p, ver)).join('');
    // The heading and its directions travel with the first question: never alone at the foot of a page.
    let head = '';
    if (sec.heading) head += `<h2>${esc(sec.heading)}</h2>`;
    if (sec.directions) head += `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${mh(vv(sec.directions, ver))}</p>`;
    const secItems = items.filter((it) => it.si === si);
    const qs = secItems.map((it) => questionHtml(it, ver, ctx, teacher));
    // A passage a question cites (and no earlier one did) prints just before that question.
    const pre = secItems.map((it) => (plan.beforeQ.get(it.q) || []).map((p) => passageHtml(p, ver)).join(''));
    if (pre[0]) { body += pre[0]; pre[0] = ''; }
    const q = qs.map((x, i) => pre[i] + x);
    body += head ? `<div class="keep">${head}${q[0] || ''}</div>${q.slice(1).join('')}` : q.join('');
  });
  if (doc.rubric) body += `<h2>${esc(doc.rubric.title || 'Rubric')}</h2>${rubricTableHtml(doc.rubric)}`;
  if (teacher && items.length) body += skillsMapHtml(doc, ver);
  if (teacher && needsHowToGrade(doc)) body += howToGradeHtml(doc, ver, ctx);
  return page(doc.title, baseCss(ctx), body);
}

export function rubricHtml(doc, ctx) {
  const body = `<div class="titlerow"><div><h1>${esc(doc.title)}</h1></div></div>
  ${doc.directions ? `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${esc(doc.directions)}</p>` : ''}
  ${rubricTableHtml(doc.rubric)}`;
  const css = baseCss(ctx) + ` table.rubric { font-size: 10.5pt; } table.rubric td { height: 0.9in; }`;
  return page(doc.title, css, body);
}

export function handoutHtml(doc, ctx) {
  const slides = doc.slides || [];
  const css =
    baseCss(ctx) +
    ` .slide { display: grid; grid-template-columns: 1fr 2.3in; gap: 10pt; border: 1.25pt solid #000; border-radius: 4pt; padding: 8pt 10pt; margin: 0 0 10pt; break-inside: avoid; }
      .slide h3 { margin: 0 0 4pt; font-size: 12.5pt; } .slide ul { margin: 0; padding-left: 16pt; } .slide .fig svg { max-height: 1.8in; }
      .slide .notes { border-left: 1pt solid #000; padding-left: 8pt; font-size: 9pt; color: #333; } .slide .notes .wl { height: 18pt; border-bottom: .75pt dashed #999; }
      .snum { font-size: 9pt; font-weight: 700; }`;
  const body = `${fieldsHtml(ctx.layout)}<h1>${esc(doc.title)}</h1>${doc.directions ? `<p class="directions">${esc(doc.directions)}</p>` : '<p class="directions">Follow along and add your own notes on the right.</p>'}
  ${slides
    .map(
      (s, i) => `<div class="slide"><div><div class="snum">Slide ${i + 2}</div><h3>${esc(s.title)}</h3>${(s.bullets || []).length ? `<ul>${s.bullets.map((b) => `<li>${mh(b)}</li>`).join('')}</ul>` : ''}${figureHtml(s.figure)}</div>
      <div class="notes">My notes${'<div class="wl"></div>'.repeat(4)}</div></div>`
    )
    .join('')}`;
  return page(doc.title, css, body);
}

// Review-game cards (no answers), or bell-ringer day cards: one short question a day, 10 to a set, with an answer line.
export function cardsHtml(doc, ctx, { days = false } = {}) {
  const items = questionsOf(doc);
  const css =
    baseCss(ctx) +
    ` .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
      .card { border: 1pt dashed #000; min-height: ${days ? '1.5in' : '2.35in'}; padding: ${days ? '7pt 10pt' : '10pt 12pt'}; break-inside: avoid; position: relative; }
      .card p { margin: 3pt 0; font-size: ${days ? '10.5pt' : 'inherit'}; }
      .card .cn { font-weight: 800; font-size: ${days ? '12pt' : '14pt'}; } .card .cl { position: absolute; right: 8pt; top: 6pt; font-size: 8.5pt; border: 1pt solid #000; border-radius: 6pt; padding: 0 5pt; }
      .card .fig svg { max-height: ${days ? '0.9in' : '1.3in'}; } .card .choices { grid-template-columns: 1fr 1fr; font-size: ${days ? '10.5pt' : 'inherit'}; }
      .card .ans { margin-top: 5pt; font-size: 10.5pt; } .card .ans .ln { width: 1.4in; }${days ? ' h1 { font-size: 17pt; } .fields { margin-bottom: 8pt; } .directions { margin: 2pt 0 6pt; }' : ''}`;
  const head = days
    ? `${fieldsHtml(ctx.layout)}<h1>${esc(doc.title)}</h1><p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${esc(doc.directions || 'One a day. Answer in the box for today.')}</p>`
    : `<h1>${esc(doc.title)}</h1><p class="directions">Cut along the dashed lines. The answers are in the teacher copy and the slide notes.</p>`;
  const body = `${head}
  <div class="cards">${items
    .map(({ q, n }) => {
      const ch = q.type === 'mc' ? vv(q.choices) || [] : [];
      const unit = vv(q.unit);
      const line = days && !['mc', 'tf', 'match'].includes(q.type || 'short') ? `<div class="ans"><span>Answer:</span><span class="ln"></span>${unit ? `<span>${mh(unit)}</span>` : ''}</div>` : '';
      return `<div class="card"><div class="cn">${days ? `Day ${n}` : n}</div><div class="cl">Level ${esc(q.level ?? '')}</div><p>${mh(vv(q.prompt))}</p>${figureHtml(vv(q.figure))}${
        ch.length ? `<div class="choices">${ch.map((c, i) => `<div class="ch"><span class="l">${choiceLabel(i, ctx.layout)}</span><span>${mh(c)}</span></div>`).join('')}</div>` : ''
      }${q.type === 'tf' ? '<div class="tf"><span>True</span><span>False</span></div>' : ''}${line}</div>`;
    })
    .join('')}</div>`;
  return page(doc.title, css, body);
}
