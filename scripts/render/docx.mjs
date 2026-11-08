// Word copies with the `docx` package. Same content and order as the PDFs.

import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, Footer,
  PageNumber, BorderStyle, ShadingType, TabStopType,
} from 'docx';
import { docxRuns as mr, plainMath } from './math.mjs';
import { isGraphFigure, graphText } from './graph.mjs';
import { needsHowToGrade, gradingRows, gradingIntro } from './grading.mjs';
import { vv, questionsOf, keyText, workLinesFor, tfValue, letter, inkAccent, numLabel, choiceLabel, passagePlan, passageByline, BLIND_SKIPPED_LINE, blindSkipped, stimulusPlan, groupLine, partsOf } from './util.mjs';

const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1008, bottom: 1008, left: 1008, right: 1008, footer: 500 } };
const TEXT_W = 12240 - 2 * 1008; // twips

function runs(text, opts = {}) {
  return new TextRun({ text: String(text ?? ''), ...opts });
}
const P = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts });
const line = (size = 1) => ({ style: BorderStyle.SINGLE, size: size * 6, color: '000000' });
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function cell(children, opts = {}) {
  return new TableCell({
    children: (Array.isArray(children) ? children : [children]).map((c) => (c instanceof Paragraph ? c : P(runs(c)))),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    ...opts,
  });
}

function table(rows, widths, header = true) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: widths.map((w) => Math.round((w / total) * TEXT_W)),
    rows: rows.map(
      (r, ri) =>
        new TableRow({
          tableHeader: header && ri === 0,
          children: r.map((c, ci) =>
            cell(c instanceof Paragraph ? c : P(runs(c, { bold: header && ri === 0 })), {
              width: { size: Math.round((widths[ci] / total) * TEXT_W), type: WidthType.DXA },
              shading: header && ri === 0 ? { type: ShadingType.CLEAR, fill: 'E6E6E6', color: 'auto' } : undefined,
            })
          ),
        })
    ),
  });
}

function footer(label, brand) {
  return new Footer({
    children: [
      P(
        [
          runs(`${label}\t${brand.shortName || brand.name} · Made with AI · check before use\tPage `, { size: 15, color: '333333' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 15, color: '333333' }),
          runs(' of ', { size: 15, color: '333333' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: '333333' }),
        ],
        { tabStops: [{ type: TabStopType.CENTER, position: TEXT_W / 2 }, { type: TabStopType.RIGHT, position: TEXT_W }] }
      ),
    ],
  });
}

async function figurePara(fig, ctx) {
  const png = fig ? await ctx.figurePng(fig) : null;
  if (!png) return [];
  const maxW = 430;
  const scale = Math.min(1, maxW / png.width);
  return [
    // a graph drawn from data carries its description (the data a student reads off it) as the picture's alt text
    P(new ImageRun({ type: 'png', data: png.data, transformation: { width: Math.round(png.width * scale), height: Math.round(png.height * scale) },
      ...(isGraphFigure(fig) ? { altText: { name: 'Graph', title: plainMath(fig.graph.title || 'Graph'), description: (fig.graph.alt || graphText(fig)).slice(0, 2000) } } : {}) }), {
      spacing: { before: 80, after: 80 },
      indent: { left: 360 },
      keepNext: true,
    }),
  ];
}

function fieldsBlock(layout) {
  const text = layout.fields.map((f, i) => `${f}: ${'_'.repeat(i === 0 ? 34 : 16)}`).join('    ');
  if (!layout.nameBox) return [P(runs(text, { size: 22 }), { spacing: { after: 200 } })];
  return [
    new Table({
      width: { size: TEXT_W, type: WidthType.DXA },
      columnWidths: [TEXT_W],
      rows: [new TableRow({ children: [cell(P(runs(text, { size: 22 })), { borders: { top: line(1.5), bottom: line(1.5), left: line(1.5), right: line(1.5) } })] })],
    }),
    P(runs(''), { spacing: { after: 120 } }),
  ];
}

async function questionParas(item, ver, ctx, teacher) {
  const { q, n } = item;
  const L = ctx.layout;
  const type = q.type || 'short';
  const ans = vv(q.answer, ver);
  const out = [];
  const head = [runs(`${ctx.dayLabels ? `Day ${n}:` : numLabel(n, L)}  `, { bold: true }), ...(await mr(vv(q.prompt, ver), {}, ctx))];
  if (teacher) head.push(runs(`   [L${q.level ?? '?'} · ${q.skill || 'skill'}]`, { size: 17, color: '444444' }));
  out.push(P(head, { spacing: { before: 200, after: 60 }, keepNext: true, keepLines: true, indent: ctx.dayLabels ? { left: 800, hanging: 800 } : { left: 360, hanging: 360 } }));
  out.push(...(await figurePara(vv(q.figure, ver), ctx)));
  if (type === 'mc') {
    const chs = vv(q.choices, ver) || [];
    // Keep a question's lines together, but end the chain at its last line: a chain that runs into the next
    // question links the whole page and Word breaks it anywhere (a heading left alone at the foot of a page).
    const tail = !teacher && workLinesFor(q, ctx) === 0;
    for (const [i, c] of chs.entries()) {
      const right = teacher && Number(ans) === i;
      out.push(
        P([runs(`${choiceLabel(i, L)}  `, { bold: true }), ...(await mr(c, { bold: right }, ctx)), ...(right ? [runs('   ◀ answer', { bold: true })] : [])], {
          indent: { left: 720 },
          spacing: { after: 30 },
          keepNext: !(tail && i === chs.length - 1),
        })
      );
    }
  } else if (type === 'tf') {
    const t = tfValue(ans);
    out.push(P([runs('True', { bold: true, underline: teacher && t ? {} : undefined }), runs('          '), runs('False', { bold: true, underline: teacher && !t ? {} : undefined })], { indent: { left: 720 } }));
  } else if (type === 'match') {
    const left = vv(q.left, ver) || [];
    const right = vv(q.choices, ver) || [];
    const a = Array.isArray(ans) ? ans : [];
    const rows = Array.from({ length: Math.max(left.length, right.length) }, (_, i) => [
      left[i] != null ? P([runs(teacher && a[i] != null ? ` ${letter(Number(a[i]))} ` : '____', { bold: true, underline: teacher ? {} : undefined }), runs(`  ${i + 1}. ${plainMath(left[i])}`)]) : P(runs('')),
      right[i] != null ? P([runs(`${letter(i)}. `, { bold: true }), runs(plainMath(right[i]))]) : P(runs('')),
    ]);
    out.push(
      new Table({
        width: { size: TEXT_W - 720, type: WidthType.DXA },
        columnWidths: [(TEXT_W - 720) / 2, (TEXT_W - 720) / 2],
        borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
        indent: { size: 720, type: WidthType.DXA },
        rows: rows.map((r) => new TableRow({ children: r.map((c) => cell(c, { borders: { top: none, bottom: none, left: none, right: none } })) })),
      })
    );
  }
  const parts = partsOf(q, ver);
  if (parts.length) {
    const each = q.space != null ? Number(q.space) || 0 : 4;
    const keyOpts = { indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: '000000', space: 6 } }, shading: { type: ShadingType.CLEAR, fill: 'F4F4F4', color: 'auto' } };
    for (const p of parts) {
      out.push(P([runs(`(${p.label})  `, { bold: true }), ...(await mr(p.prompt, {}, ctx)), ...(p.points != null ? [runs(`  [${p.points} point${p.points === 1 ? '' : 's'}]`, { size: 18 })] : [])], { indent: { left: 720, hanging: 360 }, spacing: { before: 100, after: 40 }, keepNext: true }));
      if (teacher) {
        if (p.answer != null && p.answer !== '') out.push(P([runs('A strong answer: '), ...(await mr(String(p.answer), { bold: true }, ctx))], keyOpts));
        if (p.checklist.length) {
          out.push(P(runs(`Full credit for (${p.label}):`, { italics: true }), keyOpts));
          for (const c of p.checklist) out.push(P([runs('•  '), ...(await mr(c, { size: 20 }, ctx))], { ...keyOpts, indent: { left: 720 } }));
        }
      } else for (let i = 0; i < each; i++) out.push(P(runs('\t', { color: '999999' }), { indent: { left: 720 }, spacing: { before: 200 }, tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W, leader: 'dot' }] }));
    }
    if (teacher && q.why) out.push(P([runs('Why: ', { italics: true }), ...(await mr(vv(q.why, ver), { size: 20 }, ctx))], keyOpts));
    return out;
  }
  if (!teacher) {
    const lines = workLinesFor(q, ctx);
    // One dotted tab leader per line: bordered empty paragraphs would merge into a single line in Word.
    for (let i = 0; i < lines; i++) out.push(P(runs('\t', { color: '999999' }), { indent: { left: 360 }, spacing: { before: 200 }, tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W, leader: 'dot' }] }));
    const unit = vv(q.unit, ver);
    if (!['mc', 'tf', 'match', 'open'].includes(type)) out.push(P([runs('Answer: '), runs('_'.repeat(30)), ...(unit ? [runs(` ${plainMath(unit)}`)] : [])], { indent: { left: 360 }, spacing: { before: 160 } }));
  }
  if (teacher) {
    const kp = [runs(type === 'open' ? 'A strong answer: ' : 'Answer: '), ...(await mr(keyText(q, ver), { bold: true }, ctx))];
    if ((q.accept || []).length) kp.push(...(await mr(`  (also accept: ${q.accept.join('; ')})`, { size: 19 }, ctx)));
    const keyOpts = { indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: '000000', space: 6 } }, shading: { type: ShadingType.CLEAR, fill: 'F4F4F4', color: 'auto' } };
    out.push(P(kp, { ...keyOpts, spacing: { before: 80 } }));
    if (q.why) out.push(P([runs('Why: ', { italics: true }), ...(await mr(vv(q.why, ver), { size: 20 }, ctx))], keyOpts));
  }
  return out;
}

function heading(text, accent, opts = {}) {
  return P(runs(text, { bold: true, size: 26 }), {
    spacing: { before: 280, after: 100 },
    keepNext: true,
    keepLines: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent.slice(1), space: 2 } },
    ...opts,
  });
}

export function rubricTable(rubric) {
  if (!rubric?.criteria?.length) return [];
  const n = Math.max(...rubric.criteria.map((c) => (c.levels || []).length));
  const names = rubric.levelNames && rubric.levelNames.length >= n ? rubric.levelNames : Array.from({ length: n }, (_, i) => `${n - i}`);
  const rows = [['Criteria', ...names]];
  for (const c of rubric.criteria) {
    rows.push([
      P([runs(c.name, { bold: true }), ...(c.points != null ? [runs(`  (${c.points} pts)`, { size: 18 })] : [])]),
      ...Array.from({ length: n }, (_, i) => (c.levels || [])[i] ?? ''),
    ]);
  }
  const out = [table(rows, [1.3, ...names.map(() => 1)])];
  if (rubric.note) out.push(P(runs(rubric.note, { size: 19 }), { spacing: { before: 100 } }));
  return out;
}

async function skillsMap(doc, ver, accent, ctx) {
  const items = questionsOf(doc);
  const levels = {};
  const skills = {};
  for (const { q, n } of items) {
    levels[q.level ?? '?'] = (levels[q.level ?? '?'] || 0) + 1;
    (skills[q.skill || '—'] ||= []).push(n);
  }
  const total = items.length || 1;
  return [
    heading('Skills and level map', accent, { pageBreakBefore: true }),
    P(
      runs(
        `Level 1 = on-ramp, 2 = on level, 3 = harder. ` +
          Object.keys(levels).sort().map((k) => `Level ${k}: ${levels[k]} (${Math.round((levels[k] / total) * 100)}%)`).join(' · ') +
          (doc.versions?.length > 1 ? `. Versions ${doc.versions.join(' and ')} test the same skill at the same level, question for question.` : '.'),
        { size: 20 }
      ),
      { spacing: { after: 120 } }
    ),
    table([['Skill', 'Questions', 'How many'], ...Object.entries(skills).map(([s, ns]) => [s, ns.join(', '), String(ns.length)])], [3, 2, 1]),
    P(runs(''), { spacing: { after: 120 } }),
    table(
      [['#', 'Skill', 'Level', 'Type', `Key${ver ? ` (version ${ver})` : ''}`], ...(await Promise.all(items.map(async ({ q, n }) => [String(n), q.skill || '', String(q.level ?? ''), q.type || 'short', P(await mr(keyText(q, ver), { bold: true }, ctx))])))],
      [0.5, 2.6, 0.7, 0.9, 3]
    ),
  ];
}

// How to grade (scripts/render/grading.mjs), the same table as the PDF.
async function howToGrade(doc, ver, accent, ctx) {
  const rows = gradingRows(doc, ver, ctx.pack);
  const body = await Promise.all(rows.map(async (r) => [
    String(r.n), `${r.points}${r.given ? '' : '*'}`, P(await mr(r.full, { bold: true }, ctx)), r.partial,
    P(await mr([...(r.accept.length ? [`Also accept: ${r.accept.join('; ')}`] : []), ...r.notes].join(' · ') || '—', {}, ctx)),
  ]));
  return [
    heading(`How to grade${ver ? ` · version ${ver}` : ''}`, accent, { pageBreakBefore: true }),
    P(runs(gradingIntro(rows), { size: 20 }), { spacing: { after: 120 } }),
    table([['#', 'Points', 'Full credit', 'Partial credit', 'Also accept · look for'], ...body], [0.4, 0.6, 2.6, 2.4, 2.6]),
  ];
}

function docShell(ctx, label, children) {
  return new Document({
    creator: ctx.brand.shortName || ctx.brand.name,
    title: label,
    description: ctx.brand.aiNotice,
    styles: { default: { document: { run: { font: ctx.style.font || 'Arial', size: ctx.layout.fontSize * 2 } } } },
    sections: [{ properties: { page: PAGE }, footers: { default: footer(label, ctx.brand) }, children }],
  });
}

// A reading passage: title and byline kept with the first paragraph, each paragraph numbered in the margin and kept whole.
async function passageParas(p, ver, ctx, accent) {
  const paras = vv(p.paragraphs, ver) || [];
  const out = [heading(p.title || 'Passage', accent)];
  const by = passageByline(p);
  if (by) out.push(P(runs(by, { italics: true, size: 19 }), { keepNext: true, spacing: { after: 100 } }));
  for (const [i, t] of paras.entries()) {
    out.push(P([runs(`${i + 1}\t`, { bold: true, size: 19 }), ...(await mr(t, {}, ctx))], {
      indent: { left: 480, hanging: 480 },
      tabStops: [{ type: TabStopType.LEFT, position: 480 }],
      spacing: { after: 120, line: 300 },
      keepLines: true,
    }));
  }
  out.push(P(runs(''), { spacing: { after: 80 } }));
  return out;
}

// A shared data set: its title, which questions use it, the intro, the table and the graph, printed once before its group.
async function stimulusParas(st, ns, ver, ctx) {
  const box = { border: { left: { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 6 } }, indent: { left: 240 } };
  const out = [];
  if (st.title) out.push(P(runs(plainMath(String(st.title)), { bold: true, size: 23 }), { ...box, spacing: { before: 200, after: 40 }, keepNext: true }));
  if (ns && ns.length) out.push(P(runs(groupLine(ns), { italics: true, size: 19 }), { ...box, keepNext: true }));
  if (st.intro) out.push(P(await mr(String(st.intro), {}, ctx), { ...box, spacing: { after: 80 }, keepNext: true }));
  const t = st.table;
  if (t && Array.isArray(t.rows)) {
    if (t.caption) out.push(P(runs(plainMath(String(t.caption)), { size: 19 }), { ...box, keepNext: true }));
    const cols = Array.isArray(t.columns) ? t.columns : [];
    const rows = [...(cols.length ? [cols] : []), ...t.rows].map((r) => (Array.isArray(r) ? r : [r]).map((c) => plainMath(String(c ?? ''))));
    const n = Math.max(...rows.map((r) => r.length));
    out.push(table(rows.map((r) => Array.from({ length: n }, (_, i) => r[i] ?? '')), Array.from({ length: n }, (_, i) => (i === 0 ? 1.6 : 1)), cols.length > 0));
  }
  out.push(...(await figurePara(st.figure, ctx)));
  out.push(P(runs(''), { spacing: { after: 60 } }));
  return out;
}

export async function copyDocx(doc, ver, ctx, teacher) {
  const accent = inkAccent(ctx.style.accent);
  const kids = [];
  if (teacher) {
    kids.push(
      P(runs(`TEACHER COPY${ver ? ` · VERSION ${ver}` : ''} · the key is in bold, with why under each answer`, { bold: true, size: 21 }), {
        border: { top: line(2), bottom: line(2), left: line(2), right: line(2) },
        shading: { type: ShadingType.CLEAR, fill: 'EEEEEE', color: 'auto' },
        spacing: { after: 160 },
      })
    );
    if (blindSkipped(ctx.pack)) kids.push(P(runs(BLIND_SKIPPED_LINE, { bold: true, size: 21 }), { border: { top: line(2), bottom: line(2), left: line(2), right: line(2) }, spacing: { after: 160 } }));
  } else kids.push(...fieldsBlock(ctx.layout));
  kids.push(
    P([runs(doc.title, { bold: true, size: 40, color: accent.slice(1) }), ...(ver ? [runs(`\tVersion ${ver}`, { bold: true, size: 24 })] : [])], {
      tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W }],
      spacing: { after: 60 },
    })
  );
  if (teacher) {
    const o = ctx.pack.order || {};
    const sub = [o.grade && `Grade ${o.grade}`, ctx.subjectLabel, o.topic].filter(Boolean).join(' · ');
    if (sub) kids.push(P(runs(sub, { size: 19, color: '333333' })));
  }
  if (doc.directions) kids.push(P(await mr(vv(doc.directions, ver), { bold: ctx.layout.boldDirections }, ctx), { spacing: { before: 100, after: 120 } }));
  const items = questionsOf(doc);
  const plan = passagePlan(doc, ver), splan = stimulusPlan(doc, ver);
  for (const p of plan.top) kids.push(...(await passageParas(p, ver, ctx, accent)));
  for (const [si, sec] of (doc.sections || []).entries()) {
    for (const p of plan.before.get(si) || []) kids.push(...(await passageParas(p, ver, ctx, accent)));
    // A passage a question cites (and no earlier one did) prints just before it, ahead of its section heading.
    const secItems = items.filter((x) => x.si === si);
    const qPassages = async (it) => { for (const p of plan.beforeQ.get(it.q) || []) kids.push(...(await passageParas(p, ver, ctx, accent))); };
    if (secItems[0]) await qPassages(secItems[0]);
    if (sec.heading) kids.push(heading(sec.heading, accent));
    if (sec.directions) kids.push(P(await mr(vv(sec.directions, ver), { bold: ctx.layout.boldDirections }, ctx), { keepNext: (sec.questions || []).length > 0, keepLines: true }));
    for (const [k, it] of secItems.entries()) {
      if (k > 0) await qPassages(it);
      if (splan.first.has(it.q)) { const st = splan.first.get(it.q); kids.push(...(await stimulusParas(st, splan.groups.get(st.id), ver, ctx))); }
      kids.push(...(await questionParas(it, ver, ctx, teacher)));
    }
  }
  if (doc.rubric) kids.push(heading(doc.rubric.title || 'Rubric', accent), ...rubricTable(doc.rubric));
  if (teacher && items.length) kids.push(...(await skillsMap(doc, ver, accent, ctx)));
  if (teacher && needsHowToGrade(doc)) kids.push(...(await howToGrade(doc, ver, accent, ctx)));
  const label = `${doc.title} · ${teacher ? 'Teacher' : 'Student'} copy${ver ? ` ${ver}` : ''}`;
  return Packer.toBuffer(docShell(ctx, label, kids));
}

export async function rubricDocx(doc, ctx) {
  const accent = inkAccent(ctx.style.accent);
  const kids = [P(runs(doc.title, { bold: true, size: 40, color: accent.slice(1) }), { spacing: { after: 120 } })];
  if (doc.directions) kids.push(P(runs(doc.directions, { bold: ctx.layout.boldDirections }), { spacing: { after: 160 } }));
  kids.push(...rubricTable(doc.rubric));
  return Packer.toBuffer(docShell(ctx, `${doc.title} · Rubric`, kids));
}
