// Print HTML for student copies, teacher copies, rubrics, slide handouts and review-game cards.
// Letter size, black-and-white safe: color is only ever a second signal next to weight, borders or text.

import { esc, vv, cleanSvg, questionsOf, answerText, keyText, workLinesFor, kindOf, tfValue, letter, fontStack, inkAccent, numLabel, choiceLabel } from './util.mjs';

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
  .pb { break-before: page; }
  .keep { break-inside: avoid; page-break-inside: avoid; }
  .small { font-size: 9.5pt; color: #222; }
  `;
}

function page(title, css, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

export const PREVIEW_MARK = 'PREVIEW — not approved for use';

// Preview pages: a diagonal mark on every page (fixed elements repeat on each printed page).
export function watermark(html) {
  const mark = `<style>.pp-wm{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-38deg);font:800 34pt Arial,sans-serif;color:rgba(0,0,0,.13);white-space:nowrap;pointer-events:none;z-index:9999;letter-spacing:.02em}</style><div class="pp-wm">${esc(PREVIEW_MARK)}</div>`;
  return html.replace('</body>', mark + '</body>');
}

export function headerTemplate(text) {
  if (!text) return '<span></span>';
  return `<div style="width:100%;font-family:Arial,'Liberation Sans',sans-serif;font-size:8pt;font-weight:700;color:#000;padding:0 0.7in;text-align:center;letter-spacing:.04em;">${esc(text)}</div>`;
}

export function footerTemplate(label, brand) {
  // Chromium's footer: inline styles only, explicit font size.
  return `<div style="width:100%;font-family:Arial,'Liberation Sans',sans-serif;font-size:7.5pt;color:#333;padding:0 0.7in;display:flex;justify-content:space-between;align-items:center;">
  <span>${esc(label)}</span>
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
  const longest = Math.max(0, ...choices.map((c) => String(c).length));
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
  let inner = `<p>${esc(prompt)}${teacher ? `<span class="tag">L${esc(q.level ?? '?')} · ${esc(q.skill || 'skill')}</span>` : ''}</p>`;
  inner += figureHtml(vv(q.figure, ver));
  if (type === 'mc') {
    const ch = vv(q.choices, ver) || [];
    inner += `<div class="choices ${choiceCols(ch)}">${ch
      .map((c, i) => `<div class="ch${teacher && Number(ans) === i ? ' right' : ''}"><span class="l">${choiceLabel(i, L)}</span><span>${esc(c)}</span></div>`)
      .join('')}</div>`;
  } else if (type === 'tf') {
    const t = tfValue(ans);
    inner += `<div class="tf"><span class="${teacher && t ? 'right' : ''}">True</span><span class="${teacher && !t ? 'right' : ''}">False</span></div>`;
  } else if (type === 'match') {
    const left = vv(q.left, ver) || [];
    const right = vv(q.choices, ver) || [];
    const a = Array.isArray(ans) ? ans : [];
    inner += `<div class="match"><div>${left
      .map((x, i) => `<div class="row"><span class="blank">${teacher && a[i] != null ? letter(Number(a[i])) : '&nbsp;'}</span><span>${i + 1}. ${esc(x)}</span></div>`)
      .join('')}</div><div>${right.map((x, i) => `<div class="row"><b>${letter(i)}.</b> <span>${esc(x)}</span></div>`).join('')}</div></div>`;
  }
  if (!teacher) {
    const lines = workLinesFor(q, ctx);
    if (lines > 0) inner += `<div class="work">${'<div class="wl"></div>'.repeat(lines)}</div>`;
    const unit = vv(q.unit, ver);
    if (!['mc', 'tf', 'match', 'open'].includes(type)) inner += `<div class="ans"><span>Answer:</span><span class="ln"></span>${unit ? `<span>${esc(unit)}</span>` : ''}</div>`;
  }
  if (teacher) {
    const accept = (q.accept || []).length ? ` <span class="small">(also accept: ${esc(q.accept.join('; '))})</span>` : '';
    const label = type === 'open' ? 'A strong answer' : 'Answer';
    inner += `<div class="key"><div>${label}: <b>${esc(keyText(q, ver))}</b>${accept}</div>${q.why ? `<div class="why">Why: ${esc(vv(q.why, ver))}</div>` : ''}</div>`;
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
        `<tr><td>${n}</td><td>${esc(q.skill || '')}</td><td>${esc(q.level ?? '')}</td><td>${esc(q.type || 'short')}</td><td><b>${esc(keyText(q, ver))}</b></td></tr>`
    )
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
  return `${teacher ? `<div class="tbanner">TEACHER COPY${ver ? ` · VERSION ${esc(ver)}` : ''} · the key is in bold, with why under each answer</div>` : fieldsHtml(ctx.layout)}
  <div class="titlerow"><div><h1>${esc(doc.title)}</h1>${teacher && sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>${ver ? `<div class="ver">Version ${esc(ver)}</div>` : ''}</div>
  ${doc.directions ? `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${esc(vv(doc.directions, ver))}</p>` : ''}`;
}

export function copyHtml(doc, ver, ctx, teacher) {
  const items = questionsOf(doc);
  let body = headerHtml(doc, ver, ctx, teacher);
  (doc.sections || []).forEach((sec, si) => {
    // The heading and its directions travel with the first question: never alone at the foot of a page.
    let head = '';
    if (sec.heading) head += `<h2>${esc(sec.heading)}</h2>`;
    if (sec.directions) head += `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${esc(vv(sec.directions, ver))}</p>`;
    const qs = items.filter((it) => it.si === si).map((it) => questionHtml(it, ver, ctx, teacher));
    body += head ? `<div class="keep">${head}${qs[0] || ''}</div>${qs.slice(1).join('')}` : qs.join('');
  });
  if (doc.rubric) body += `<h2>${esc(doc.rubric.title || 'Rubric')}</h2>${rubricTableHtml(doc.rubric)}`;
  if (teacher && items.length) body += skillsMapHtml(doc, ver);
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
      (s, i) => `<div class="slide"><div><div class="snum">Slide ${i + 2}</div><h3>${esc(s.title)}</h3>${(s.bullets || []).length ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}${figureHtml(s.figure)}</div>
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
      const line = days && !['mc', 'tf', 'match'].includes(q.type || 'short') ? `<div class="ans"><span>Answer:</span><span class="ln"></span>${unit ? `<span>${esc(unit)}</span>` : ''}</div>` : '';
      return `<div class="card"><div class="cn">${days ? `Day ${n}` : n}</div><div class="cl">Level ${esc(q.level ?? '')}</div><p>${esc(vv(q.prompt))}</p>${figureHtml(vv(q.figure))}${
        ch.length ? `<div class="choices">${ch.map((c, i) => `<div class="ch"><span class="l">${choiceLabel(i, ctx.layout)}</span><span>${esc(c)}</span></div>`).join('')}</div>` : ''
      }${q.type === 'tf' ? '<div class="tf"><span>True</span><span>False</span></div>' : ''}${line}</div>`;
    })
    .join('')}</div>`;
  return page(doc.title, css, body);
}
