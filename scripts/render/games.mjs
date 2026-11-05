// Games and puzzles: the quiz-show game, crosswords, word searches and logic puzzles (docs/KINDS-GAMES.md).
//
// renderGame(doc, base, ctx, io) makes every file for one game document. io = { pdf, write, later } from
// scripts/render-pack.mjs: pdf() is made in the preview and the final (watermarked in the preview); write() only in the
// final (PowerPoint, Word, the offline HTML game). The grids come from the pack (scripts/make-puzzles.mjs --write stores
// them), so the teacher approves the exact grid that is released.

import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, Footer, PageNumber, TabStopType, BorderStyle,
} from 'docx';
import PptxGenJS from 'pptxgenjs';
import { esc, inkAccent } from './util.mjs';
import { baseCss } from './html.mjs';
import { buildCrossword } from '../games/crossword.mjs';
import { buildWordSearch, DIR_VEC, DIR_NAME } from '../games/wordsearch.mjs';
import { solveGrid, solveCages, cageModel, cellName, opText } from '../games/logic.mjs';
import { lengthLabel } from '../games/rng.mjs';

export const GAME_KINDS = new Set(['quizshow', 'crossword', 'wordsearch', 'logicpuzzle']);

/* ---------------- shared page bits ---------------- */

const GAME_CSS = `
  .center { text-align: center; }
  .gridwrap { display: flex; justify-content: center; margin: 6pt 0 10pt; }
  .gridwrap svg { max-width: 100%; height: auto; }
  .gridwrap.cw svg { max-height: 4.1in; width: auto; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18pt; }
  .clues h3 { font-size: 12pt; margin: 6pt 0 4pt; border-bottom: 1.25pt solid #000; }
  .clue { display: grid; grid-template-columns: 20pt 1fr; margin: 0 0 3pt; break-inside: avoid; font-size: 10pt; line-height: 1.3; }
  .clue b { font-weight: 800; }
  .box { border: 1.25pt solid #000; border-radius: 4pt; padding: 6pt 10pt; margin: 8pt 0; break-inside: avoid; }
  .bank { columns: 3; font-weight: 700; letter-spacing: .03em; }
  .lgrid { border-collapse: collapse; margin: 4pt 0 10pt; width: auto; font-size: 9pt; }
  .lgrid td, .lgrid th { border: 0.75pt solid #000; padding: 0; text-align: center; vertical-align: middle; }
  .lgrid td.c { width: 22pt; height: 22pt; font-weight: 800; font-size: 12pt; }
  .lgrid td.c.thick-l { border-left: 2pt solid #000; } .lgrid td.c.thick-t { border-top: 2pt solid #000; }
  .lgrid th.v { height: 1.05in; vertical-align: bottom; padding: 3pt 0; }
  .lgrid th.v span { writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; white-space: nowrap; font-weight: 600; }
  .lgrid th.cat { background: #e6e6e6; font-weight: 800; padding: 2pt 4pt; }
  .lgrid th.rcat { background: #e6e6e6; font-weight: 800; width: 16pt; }
  .lgrid th.rcat span { writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; white-space: nowrap; }
  .lgrid th.item { text-align: right; padding: 0 5pt; white-space: nowrap; font-weight: 600; }
  .lgrid th.blank { border: none; background: none; }
  .lgrid td.no { color: #555; font-weight: 400; }
  ol.clues { margin: 2pt 0 8pt; padding-left: 20pt; } ol.clues li { margin: 0 0 3pt; }
  ol.path { margin: 2pt 0 8pt; padding-left: 20pt; font-size: 10pt; } ol.path li { margin: 0 0 2pt; break-inside: avoid; }
  ol.path.long { columns: 2; column-gap: 18pt; font-size: 9.5pt; }
  .warn { font-size: 9.5pt; border-left: 3pt solid #000; padding: 2pt 8pt; margin: 4pt 0; background: #f4f4f4; }
  .board { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .board th { background: #222; color: #fff; font-size: 10.5pt; padding: 6pt 4pt; text-align: center; border: 1.5pt solid #000; }
  .board td { text-align: center; font-size: 15pt; font-weight: 800; height: 0.55in; border: 1.5pt solid #000; vertical-align: middle; }
  .qs { margin: 0 0 8pt; break-inside: avoid; display: grid; grid-template-columns: 0.75in 1fr; gap: 0 8pt; border-bottom: 0.75pt solid #999; padding: 4pt 0; }
  .qs .val { font-weight: 800; font-size: 13pt; }
  .qs .a { margin-top: 3pt; } .qs .a b { font-weight: 800; }
  .score td { height: 0.62in; } .score td.name { width: 1.6in; } .score .vals { font-size: 8pt; color: #333; letter-spacing: .02em; }
  .wsl { display: grid; grid-template-columns: 1fr auto; gap: 14pt; align-items: start; }
  .wlist { border: 1.25pt solid #000; border-radius: 4pt; padding: 6pt 10pt; min-width: 1.6in; font-weight: 700; letter-spacing: .03em; }
  .wlist div { margin: 0 0 4pt; } .wlist .sq { display: inline-block; width: 9pt; height: 9pt; border: 1pt solid #000; margin-right: 5pt; vertical-align: -1pt; }
`;

function pageHtml(ctx, title, body, extraCss = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${baseCss(ctx)}${GAME_CSS}${extraCss}</style></head><body>${body}</body></html>`;
}

function fields(ctx) {
  const L = ctx.layout;
  return `<div class="fields${L.nameBox ? ' box' : ''}">${L.fields.map((f) => `<div class="field"><span>${esc(f)}:</span><span class="ln"></span></div>`).join('')}</div>`;
}

function head(doc, ctx, teacher, banner) {
  const o = ctx.pack.order || {};
  const sub = [o.grade && `Grade ${o.grade}`, ctx.subjectLabel, o.topic].filter(Boolean).join(' · ');
  return `${teacher ? `<div class="tbanner">${esc(banner || 'TEACHER COPY · the key')}</div>` : fields(ctx)}
  <div class="titlerow"><div><h1>${esc(doc.title)}</h1>${teacher && sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div></div>
  ${doc.directions && !teacher ? `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${esc(doc.directions)}</p>` : ''}`;
}

/* ---------------- Word helpers ---------------- */

const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1008, bottom: 1008, left: 1008, right: 1008, footer: 500 } };
const TEXT_W = 12240 - 2 * 1008;
const R = (text, o = {}) => new TextRun({ text: String(text ?? ''), ...o });
const P = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], ...o });

function wordFooter(label, brand) {
  const s = { size: 15, color: '333333' };
  return new Footer({
    children: [P([
      R(`${label}\t${brand.shortName || brand.name} · Made with AI · check before use\tPage `, s),
      new TextRun({ children: [PageNumber.CURRENT], ...s }), R(' of ', s), new TextRun({ children: [PageNumber.TOTAL_PAGES], ...s }),
    ], { tabStops: [{ type: TabStopType.CENTER, position: TEXT_W / 2 }, { type: TabStopType.RIGHT, position: TEXT_W }] })],
  });
}

async function wordImage(svg, ctx, maxW = 600) {
  const png = await ctx.figurePng(svg);
  if (!png) return [];
  const scale = Math.min(1, maxW / png.width, 640 / png.height);
  return [P(new ImageRun({ type: 'png', data: png.data, transformation: { width: Math.round(png.width * scale), height: Math.round(png.height * scale) } }), { spacing: { before: 120, after: 160 }, alignment: 'center' })];
}

function wordDoc(ctx, label, children) {
  const font = ctx.style.font || 'Arial';
  return Packer.toBuffer(new Document({
    creator: ctx.brand.shortName || ctx.brand.name,
    styles: { default: { document: { run: { font, size: (ctx.layout.fontSize || 12) * 2 } } } },
    sections: [{ properties: { page: PAGE }, footers: { default: wordFooter(label, ctx.brand) }, children }],
  }));
}

function wordHead(doc, ctx, teacher, banner) {
  const accent = inkAccent(ctx.style.accent).slice(1);
  const out = [];
  if (teacher) out.push(P(R(banner || 'TEACHER COPY · the key', { bold: true }), { border: { top: { style: BorderStyle.SINGLE, size: 12 }, bottom: { style: BorderStyle.SINGLE, size: 12 }, left: { style: BorderStyle.SINGLE, size: 12 }, right: { style: BorderStyle.SINGLE, size: 12 } }, spacing: { after: 160 } }));
  else out.push(P(R(ctx.layout.fields.map((f, i) => `${f}: ${'_'.repeat(i === 0 ? 34 : 16)}`).join('    '), { size: 22 }), { spacing: { after: 200 } }));
  out.push(P(R(doc.title, { bold: true, size: 40, color: accent }), { spacing: { after: 80 } }));
  if (doc.directions && !teacher) out.push(P(R(doc.directions, { bold: ctx.layout.boldDirections }), { spacing: { after: 160 } }));
  return out;
}
const H = (text) => P(R(text, { bold: true, size: 26 }), { spacing: { before: 200, after: 80 }, keepNext: true });

/* ================= crossword ================= */

export function crosswordLayout(doc) {
  const cw = doc.crossword || {};
  if (cw.layout?.grid?.length) return { layout: cw.layout, stored: true };
  return { layout: buildCrossword({ words: cw.words, seed: cw.seed ?? 1, size: cw.size ?? 15 }), stored: false };
}

export function crosswordSvg(L, { key = false } = {}) {
  const S = 30;
  const W = L.cols * S + 2, Hh = L.rows * S + 2;
  const nums = {};
  for (const e of L.entries) nums[`${e.row},${e.col}`] = e.n;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" font-family="Arial, 'Liberation Sans', sans-serif">`;
  L.grid.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    const x = 1 + c * S, y = 1 + r * S;
    out += `<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="#fff" stroke="#000" stroke-width="1.4"/>`;
    const n = nums[`${r},${c}`];
    if (n) out += `<text x="${x + 2.5}" y="${y + 9.5}" font-size="9" font-weight="700">${n}</text>`;
    if (key) out += `<text x="${x + S / 2}" y="${y + S / 2 + 6.5}" font-size="17" font-weight="700" text-anchor="middle">${ch}</text>`;
  }));
  return out + '</svg>';
}

function crosswordHtml(doc, ctx, teacher) {
  const { layout: L, stored } = crosswordLayout(doc);
  const cw = doc.crossword || {};
  const list = (dir) => L.entries.filter((e) => e.dir === dir).map((e) =>
    `<div class="clue"><b>${e.n}.</b><span>${esc(e.clue)} ${esc(lengthLabel(e.display))}${teacher ? ` <b>${esc(e.display.toUpperCase())}</b>` : ''}</span></div>`).join('');
  let body = head(doc, ctx, teacher, 'TEACHER COPY · the filled grid and every answer');
  body += `<div class="gridwrap cw">${crosswordSvg(L, { key: teacher })}</div>`;
  body += `<div class="cols clues"><div><h3>Across</h3>${list('across')}</div><div><h3>Down</h3>${list('down')}</div></div>`;
  if (cw.wordBank && !teacher) body += `<div class="box"><b>Word bank</b><div class="bank">${L.entries.map((e) => e.display.toUpperCase()).sort().map((w) => `<div>${esc(w)}</div>`).join('')}</div></div>`;
  if (teacher) {
    body += `<div class="box small"><b>About this grid.</b> ${L.entries.length} of ${(cw.words || []).length} words placed, every one crossing another; ${L.rows} × ${L.cols} squares; ${Math.round((L.symmetry || 0) * 100)}% of the squares have a partner in the 180° turned grid. Made by the grid builder (seed ${esc(L.seed ?? cw.seed ?? 1)})${stored ? '' : ', not yet stored in the pack'}; checked by <code>checks/puzzles.mjs</code>: every word reads right across and down, numbers are right, no stray words.</div>`;
    if (L.unplaced?.length) body += `<div class="warn"><b>Not in the grid:</b> ${L.unplaced.map((u) => `${esc(u.answer)} (${esc(u.reason)})`).join('; ')}.</div>`;
  }
  return pageHtml(ctx, doc.title, body);
}

async function crosswordDocx(doc, ctx, teacher) {
  const { layout: L } = crosswordLayout(doc);
  const kids = [...wordHead(doc, ctx, teacher, 'TEACHER COPY · the filled grid and every answer'), ...(await wordImage(crosswordSvg(L, { key: teacher }), ctx, 440))];
  for (const dir of ['across', 'down']) {
    kids.push(H(dir === 'across' ? 'Across' : 'Down'));
    for (const e of L.entries.filter((x) => x.dir === dir)) {
      kids.push(P([R(`${e.n}.  `, { bold: true }), R(`${e.clue} ${lengthLabel(e.display)}`), ...(teacher ? [R(`   ${e.display.toUpperCase()}`, { bold: true })] : [])], { spacing: { after: 60 }, indent: { left: 360, hanging: 360 } }));
    }
  }
  if (doc.crossword?.wordBank && !teacher) kids.push(H('Word bank'), P(R(L.entries.map((e) => e.display.toUpperCase()).sort().join('    '), { bold: true })));
  if (teacher && L.unplaced?.length) kids.push(P(R(`Not in the grid: ${L.unplaced.map((u) => `${u.answer} (${u.reason})`).join('; ')}.`, { italics: true })));
  return wordDoc(ctx, `${doc.title} · ${teacher ? 'Teacher' : 'Student'} copy`, kids);
}

/* ================= word search ================= */

export function wordsearchLayout(doc, ctx) {
  const ws = doc.wordsearch || {};
  if (ws.layout?.grid?.length) return { layout: ws.layout, stored: true };
  return { layout: buildWordSearch({ words: ws.words, seed: ws.seed ?? 1, size: ws.size, grade: ctx.pack.order?.grade, directions: ws.directions }), stored: false };
}

export function wordsearchSvg(L, { key = false } = {}) {
  const S = 30, n = L.size;
  const W = n * S + 2;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" font-family="'DejaVu Sans Mono', 'Liberation Mono', 'Courier New', monospace">`;
  out += `<rect x="1" y="1" width="${n * S}" height="${n * S}" fill="#fff" stroke="#000" stroke-width="1.5"/>`;
  if (key) {
    const segs = L.placements.map((p) => {
      const [dr, dc] = DIR_VEC[p.dir];
      const x1 = 1 + p.col * S + S / 2, y1 = 1 + p.row * S + S / 2;
      return { x1, y1, x2: x1 + dc * (p.word.length - 1) * S, y2: y1 + dr * (p.word.length - 1) * S };
    });
    // outlines first, then the fill, so crossing words stay readable; color is never the only signal (the outline is)
    out += segs.map((s) => `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#000" stroke-width="25" stroke-linecap="round"/>`).join('');
    out += segs.map((s) => `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#dcdcdc" stroke-width="22" stroke-linecap="round"/>`).join('');
  }
  L.grid.forEach((row, r) => [...row].forEach((ch, c) => {
    out += `<text x="${1 + c * S + S / 2}" y="${1 + r * S + S / 2 + 6.5}" font-size="18" font-weight="700" text-anchor="middle">${ch}</text>`;
  }));
  return out + '</svg>';
}

function wordsearchHtml(doc, ctx, teacher) {
  const { layout: L, stored } = wordsearchLayout(doc, ctx);
  const list = L.placements.map((p) => p.display).sort((a, b) => a.localeCompare(b));
  const dirs = L.directions.map((d) => DIR_NAME[d]);
  let body = head(doc, ctx, teacher, 'TEACHER COPY · every word outlined');
  if (!teacher) body += `<p class="small">Words go ${esc(dirs.length > 1 ? `${dirs.slice(0, -1).join(', ')} and ${dirs[dirs.length - 1]}` : dirs[0])}. Tick each word when you find it.</p>`;
  if (teacher) {
    body += `<div class="gridwrap">${wordsearchSvg(L, { key: true })}</div><div class="wlist" style="columns:2">${[...L.placements]
      .sort((a, b) => a.display.localeCompare(b.display))
      .map((p) => `<div>${esc(p.display.toUpperCase())} <span class="small" style="font-weight:400">row ${p.row + 1}, col ${p.col + 1}, ${esc(DIR_NAME[p.dir])}</span></div>`).join('')}</div>`;
  } else {
    body += `<div class="wsl"><div class="gridwrap" style="margin:0">${wordsearchSvg(L)}</div><div class="wlist">${list.map((w) => `<div><span class="sq"></span>${esc(w.toUpperCase())}</div>`).join('')}</div></div>`;
  }
  if (teacher) {
    body += `<div class="box small"><b>About this grid.</b> ${L.size} × ${L.size}, ${L.placements.length} words, directions: ${esc(dirs.join(', '))}. Made by the grid builder (seed ${esc(L.seed)})${stored ? '' : ', not yet stored in the pack'}; checked by <code>checks/puzzles.mjs</code>: every word is in the grid exactly once, and the filler letters spell no listed word and no word on the blocklist, in any direction.</div>`;
    if (L.unplaced?.length) body += `<div class="warn"><b>Not in the grid:</b> ${esc(L.unplaced.join(', '))}.</div>`;
  }
  return pageHtml(ctx, doc.title, body);
}

/* ================= logic puzzles ================= */

export function puzzleResult(pz) {
  return pz.type === 'cages' ? solveCages(pz) : solveGrid(pz);
}

function logicGridHtml(pz, sol) {
  const cats = pz.categories;
  const k = cats.length, n = cats[0].items.length;
  const colCats = [...Array(k).keys()].slice(1);
  const rowCats = [0, ...[...Array(k).keys()].slice(2).reverse()];
  const rowOf = new Map();
  if (sol) sol.forEach((row, r) => row.forEach((it) => rowOf.set(String(it).toLowerCase(), r)));
  const mark = (a, b) => (sol ? (rowOf.get(String(a).toLowerCase()) === rowOf.get(String(b).toLowerCase()) ? '●' : '×') : '');
  let h = `<table class="lgrid"><tr><th class="blank" colspan="2"></th>${colCats.map((c) => `<th class="cat" colspan="${n}">${esc(cats[c].name)}</th>`).join('')}</tr>`;
  h += `<tr><th class="blank" colspan="2"></th>${colCats.map((c) => cats[c].items.map((it, j) => `<th class="v${j === 0 ? ' thick-l' : ''}"><span>${esc(it)}</span></th>`).join('')).join('')}</tr>`;
  rowCats.forEach((r, bi) => {
    cats[r].items.forEach((it, i) => {
      h += '<tr>';
      if (i === 0) h += `<th class="rcat" rowspan="${n}"><span>${esc(cats[r].name)}</span></th>`;
      h += `<th class="item">${esc(it)}</th>`;
      colCats.forEach((c) => {
        const show = r === 0 || c < r;
        cats[c].items.forEach((cit, j) => {
          const cls = `c${j === 0 ? ' thick-l' : ''}${i === 0 && bi > 0 ? ' thick-t' : ''}`;
          if (!show) { h += `<td class="${cls}" style="border:none"></td>`; return; }
          const m = mark(it, cit);
          h += `<td class="${cls}${m === '×' ? ' no' : ''}">${m}</td>`;
        });
      });
      h += '</tr>';
    });
  });
  return h + '</table>';
}

function answerTableHtml(pz, sol) {
  const cats = pz.categories;
  return `<table style="width:auto;min-width:60%"><tr>${cats.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr>${cats[0].items
    .map((it, r) => `<tr>${cats.map((c, ci) => `<td style="height:20pt;min-width:1.2in">${ci === 0 ? esc(it) : sol ? `<b>${esc(sol[r][ci])}</b>` : ''}</td>`).join('')}</tr>`)
    .join('')}</table>`;
}

export function cageSvg(pz, { key = false, solution } = {}) {
  const M = cageModel(pz);
  const n = M.n, S = 58, W = n * S + 4;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" font-family="Arial, 'Liberation Sans', sans-serif">`;
  out += `<rect x="2" y="2" width="${n * S}" height="${n * S}" fill="#fff"/>`;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out += `<rect x="${2 + c * S}" y="${2 + r * S}" width="${S}" height="${S}" fill="none" stroke="#888" stroke-width="0.8"/>`;
  // thick lines between squares of different cages, and round the outside
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = 2 + c * S, y = 2 + r * S, o = M.owner[r][c];
    if (c === n - 1 || M.owner[r][c + 1] !== o) out += `<line x1="${x + S}" y1="${y}" x2="${x + S}" y2="${y + S}" stroke="#000" stroke-width="3" stroke-linecap="square"/>`;
    if (r === n - 1 || M.owner[r + 1][c] !== o) out += `<line x1="${x}" y1="${y + S}" x2="${x + S}" y2="${y + S}" stroke="#000" stroke-width="3" stroke-linecap="square"/>`;
    if (c === 0) out += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + S}" stroke="#000" stroke-width="3" stroke-linecap="square"/>`;
    if (r === 0) out += `<line x1="${x}" y1="${y}" x2="${x + S}" y2="${y}" stroke="#000" stroke-width="3" stroke-linecap="square"/>`;
  }
  for (const cg of M.cages) {
    const [r, c] = [...cg.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    out += `<text x="${2 + c * S + 4}" y="${2 + r * S + 14}" font-size="12.5" font-weight="700">${esc(`${cg.target}${opText(cg.op)}`)}</text>`;
  }
  if (key && solution) solution.forEach((row, r) => row.forEach((v, c) => {
    out += `<text x="${2 + c * S + S / 2}" y="${2 + r * S + S / 2 + 12}" font-size="26" font-weight="700" text-anchor="middle">${v}</text>`;
  }));
  return out + '</svg>';
}

function withLabels(svgText, n, S = 58) {
  // a small frame with the row letters (A, B, …) and column numbers, around the cage grid
  const W = n * S + 4;
  const lab = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 22}" height="${W + 20}" viewBox="0 0 ${W + 22} ${W + 20}" font-family="Arial, 'Liberation Sans', sans-serif">`
    + [...Array(n).keys()].map((c) => `<text x="${22 + 2 + c * S + S / 2}" y="13" font-size="11" text-anchor="middle" fill="#333">${c + 1}</text>`).join('')
    + [...Array(n).keys()].map((r) => `<text x="9" y="${20 + 2 + r * S + S / 2 + 4}" font-size="11" text-anchor="middle" fill="#333">${String.fromCharCode(65 + r)}</text>`).join('')
    + `<g transform="translate(22,20)">${svgText.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></svg>`;
  return lab;
}

function logicHtml(doc, ctx, teacher) {
  let body = head(doc, ctx, teacher, 'TEACHER COPY · solutions, a short solve path, and the solver\'s proof that each puzzle has one answer');
  (doc.puzzles || []).forEach((pz, i) => {
    const res = puzzleResult(pz);
    const sol = pz.solution || res.solution;
    body += `<div class="${i ? 'pb' : ''}"><h2>Puzzle ${i + 1}${pz.title ? `: ${esc(pz.title)}` : ''}</h2>`;
    if (pz.story) body += `<p>${esc(pz.story)}</p>`;
    if (pz.type === 'cages') {
      const n = Number(pz.size);
      body += `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${esc(pz.directions || `Write the numbers 1 to ${n} in each row and each column, with no number twice in a row or column. The numbers in each heavy-outlined cage make the cage's target with its sign (+ add, − subtract, × multiply, ÷ divide). A cage with no sign is just that number.`)}</p>`;
      body += `<div class="gridwrap">${withLabels(cageSvg(pz, { key: teacher, solution: sol }), n)}</div>`;
    } else {
      body += `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${esc(pz.directions || 'Use the clues to match each item with one item from every other category. Mark ● for yes and × for no in the grid, then fill in the answer table.')}</p>`;
      body += `<ol class="clues">${(pz.clues || []).map((c) => `<li>${esc(typeof c === 'string' ? c : c.text)}</li>`).join('')}</ol>`;
      body += logicGridHtml(pz, teacher ? sol : null);
      body += `<div class="keep"><p><b>Answer table</b></p>${answerTableHtml(pz, teacher ? sol : null)}</div>`;
    }
    if (teacher) {
      body += `<div class="keep"><h3 style="margin:10pt 0 2pt;font-size:12pt">A short solve path</h3><ol class="path${(pz.path || res.path || []).length > 12 ? ' long' : ''}">${(pz.path || res.path || []).map((s) => `<li>${esc(s.text || s)}</li>`).join('')}</ol></div>`;
      body += `<div class="box small"><b>One answer, proved.</b> ${res.count === 1 ? 'The solver tried every possible answer: exactly one fits all the clues.' : `The solver found ${res.count === 0 ? 'no answer' : 'more than one answer'}; this puzzle must be fixed before it is used.`}${
        (pz.clues || []).some((c) => c.because) ? ` Clues that need science to use: ${(pz.clues || []).map((c, j) => (c.because ? `${j + 1} (${esc(c.because)})` : null)).filter(Boolean).join('; ')}.` : ''
      }</div>`;
      for (const w of res.warnings || []) body += `<div class="warn">${esc(w)}</div>`;
    }
    body += '</div>';
  });
  return pageHtml(ctx, doc.title, body);
}

// The grid as a real Word table (editable): row labels, rotated column labels, ● / × in the key.
function logicGridDocx(pz, sol) {
  const cats = pz.categories;
  const k = cats.length, n = cats[0].items.length;
  const colCats = [...Array(k).keys()].slice(1);
  const rowCats = [0, ...[...Array(k).keys()].slice(2).reverse()];
  const rowOf = new Map();
  if (sol) sol.forEach((row, r) => row.forEach((it) => rowOf.set(String(it).toLowerCase(), r)));
  const thin = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const thick = { style: BorderStyle.SINGLE, size: 16, color: '000000' };
  const off = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const C = 340; // twips per square
  const cellOf = (text, o = {}) => new TableCell({ children: [P(R(text, { bold: true, size: o.size || 18 }), { alignment: o.align || 'center' })], verticalAlign: 'center', ...o.cell });
  const rows = [];
  rows.push(new TableRow({ children: [
    cellOf('', { cell: { columnSpan: 2, borders: { top: off, left: off, bottom: off, right: off } } }),
    ...colCats.map((c) => cellOf(cats[c].name, { cell: { columnSpan: n, shading: { fill: 'E6E6E6' }, borders: { top: thick, bottom: thin, left: thick, right: thick } } })),
  ] }));
  rows.push(new TableRow({ height: { value: 1300, rule: 'atLeast' }, children: [
    cellOf('', { cell: { columnSpan: 2, borders: { top: off, left: off, bottom: off, right: off } } }),
    ...colCats.flatMap((c) => cats[c].items.map((it, j) => cellOf(it, { size: 16, cell: { textDirection: 'btLr', width: { size: C, type: WidthType.DXA }, borders: { left: j === 0 ? thick : thin, top: thin, bottom: thin, right: thin } } }))),
  ] }));
  rowCats.forEach((r, bi) => cats[r].items.forEach((it, i) => {
    const kids = [];
    if (i === 0) kids.push(cellOf(cats[r].name, { cell: { rowSpan: n, textDirection: 'btLr', shading: { fill: 'E6E6E6' }, borders: { top: thick, bottom: thick, left: thick, right: thin } } }));
    kids.push(cellOf(it, { size: 16, align: 'right', cell: { borders: { top: i === 0 ? thick : thin, bottom: thin, left: thin, right: thin } } }));
    colCats.forEach((c) => cats[c].items.forEach((cit, j) => {
      const show = r === 0 || c < r;
      const b = { left: j === 0 ? thick : thin, top: i === 0 && bi > 0 ? thick : thin, bottom: thin, right: thin };
      const m = !show || !sol ? '' : rowOf.get(String(it).toLowerCase()) === rowOf.get(String(cit).toLowerCase()) ? '●' : '×';
      kids.push(cellOf(m, { size: 20, cell: { width: { size: C, type: WidthType.DXA }, borders: show ? b : { top: off, bottom: off, left: off, right: off } } }));
    }));
    rows.push(new TableRow({ height: { value: C, rule: 'atLeast' }, children: kids }));
  }));
  return new Table({ rows, columnWidths: [400, 1700, ...colCats.flatMap(() => Array(n).fill(C))] });
}

async function logicDocx(doc, ctx, teacher) {
  const kids = wordHead(doc, ctx, teacher, 'TEACHER COPY · solutions and a short solve path');
  for (const [i, pz] of (doc.puzzles || []).entries()) {
    const res = puzzleResult(pz);
    const sol = pz.solution || res.solution;
    kids.push(P(R(`Puzzle ${i + 1}${pz.title ? `: ${pz.title}` : ''}`, { bold: true, size: 28 }), { spacing: { before: 240, after: 80 }, pageBreakBefore: i > 0, keepNext: true }));
    if (pz.story) kids.push(P(R(pz.story), { spacing: { after: 100 } }));
    if (pz.type === 'cages') {
      const n = Number(pz.size);
      kids.push(P(R(pz.directions || `Write the numbers 1 to ${n} in each row and each column, with no number twice in a row or column. The numbers in each heavy-outlined cage make the cage's target with its sign. A cage with no sign is just that number.`, { bold: ctx.layout.boldDirections })));
      kids.push(...(await wordImage(withLabels(cageSvg(pz, { key: teacher, solution: sol }), n), ctx, 320)));
    } else {
      kids.push(P(R(pz.directions || 'Use the clues to match each item with one item from every other category. Mark ● for yes and × for no in the grid, then fill in the answer table.', { bold: ctx.layout.boldDirections }), { spacing: { after: 100 } }));
      (pz.clues || []).forEach((c, j) => kids.push(P([R(`${j + 1}.  `, { bold: true }), R(typeof c === 'string' ? c : c.text)], { indent: { left: 360, hanging: 360 }, spacing: { after: 50 } })));
      kids.push(P(R(''), { spacing: { after: 60 } }), logicGridDocx(pz, teacher ? sol : null));
      const cats = pz.categories;
      const w = Math.floor(TEXT_W / cats.length);
      kids.push(H('Answer table'), new Table({
        width: { size: w * cats.length, type: WidthType.DXA }, columnWidths: cats.map(() => w),
        rows: [new TableRow({ tableHeader: true, children: cats.map((c) => new TableCell({ children: [P(R(c.name, { bold: true }))] })) }),
          ...cats[0].items.map((it, r) => new TableRow({ children: cats.map((c, ci) => new TableCell({ children: [P(R(ci === 0 ? it : teacher && sol ? sol[r][ci] : '', { bold: ci > 0 }))] })) }))],
      }));
    }
    if (teacher) {
      kids.push(H('A short solve path'));
      (pz.path || res.path || []).forEach((s, j) => kids.push(P([R(`${j + 1}.  `, { bold: true }), R(s.text || s)], { indent: { left: 360, hanging: 360 }, spacing: { after: 40 } })));
      kids.push(P(R(res.count === 1 ? 'One answer, proved: the solver tried every possible answer and exactly one fits all the clues.' : 'The solver did not find exactly one answer: fix this puzzle before it is used.', { italics: true }), { spacing: { before: 120 } }));
    }
  }
  return wordDoc(ctx, `${doc.title} · ${teacher ? 'Teacher' : 'Student'} copy`, kids);
}

/* ================= quiz-show game ================= */

export function boardOf(doc) {
  const b = doc.board || {};
  const values = (b.values?.length ? b.values : [100, 200, 300, 400, 500]).map(Number);
  const categories = (b.categories || []).map((c) => ({
    name: c.name,
    clues: values.map((v, i) => {
      const cl = (c.clues || []).find((x) => Number(x.value) === v) || (c.clues || [])[i] || {};
      return { value: v, clue: cl.clue || '', answer: cl.answer || '', accept: cl.accept || [], why: cl.why || '' };
    }),
  }));
  return { values, categories, final: b.final && b.final.clue ? b.final : null, teams: Math.min(6, Math.max(2, Number(doc.teams || b.teams) || 4)) };
}

function quizTeacherHtml(doc, ctx) {
  const B = boardOf(doc);
  let body = `<div class="tbanner">TEACHER COPY · the board, every clue and every answer (the projector game and the slides are in the final files)</div>
  <h1>${esc(doc.title)}</h1><p class="sub">${esc([ctx.pack.order?.grade && `Grade ${ctx.pack.order.grade}`, ctx.subjectLabel, ctx.pack.order?.topic].filter(Boolean).join(' · '))}</p>
  ${doc.directions ? `<p class="directions${ctx.layout.boldDirections ? ' bold' : ''}">${esc(doc.directions)}</p>` : ''}
  <h2>The board</h2><table class="board"><tr>${B.categories.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr>${B.values
    .map((v) => `<tr>${B.categories.map(() => `<td>${v}</td>`).join('')}</tr>`).join('')}</table>
  ${B.final ? `<p><b>Final round:</b> ${esc(B.final.category || 'Final')}</p>` : ''}
  <div class="box small"><b>How to play.</b> Teams take turns picking a category and a value. Read the clue; the first team to answer right gets the points (a wrong answer loses them, if you play that way). Then that team picks next. ${B.final ? 'In the final round each team writes a wager (up to its score) before seeing the clue.' : ''} The offline game (<code>.html</code>, no internet needed) keeps the scores and greys out used tiles; the slides link each tile to its clue and back.</div>`;
  B.categories.forEach((c, ci) => {
    body += `<h2 class="${ci === 0 ? 'pb' : ''}">${esc(c.name)}</h2>`;
    for (const q of c.clues) body += `<div class="qs"><div class="val">${q.value}</div><div><div>${esc(q.clue)}</div><div class="a">Answer: <b>${esc(q.answer)}</b>${q.accept?.length ? ` <span class="small">(also accept: ${esc(q.accept.join('; '))})</span>` : ''}</div>${q.why ? `<div class="small">Why: ${esc(q.why)}</div>` : ''}</div></div>`;
  });
  if (B.final) body += `<h2>Final round: ${esc(B.final.category || '')}</h2><div class="qs"><div class="val">Wager</div><div><div>${esc(B.final.clue)}</div><div class="a">Answer: <b>${esc(B.final.answer)}</b>${B.final.accept?.length ? ` <span class="small">(also accept: ${esc(B.final.accept.join('; '))})</span>` : ''}</div>${B.final.why ? `<div class="small">Why: ${esc(B.final.why)}</div>` : ''}</div></div>`;
  return pageHtml(ctx, doc.title, body);
}

function scoreSheetHtml(doc, ctx) {
  const B = boardOf(doc);
  const rows = Array.from({ length: B.teams }, (_, i) => `<tr><td class="name"><span class="small">Team ${i + 1}</span></td>${B.categories.map(() => `<td><div class="vals">${B.values.join('  ')}</div></td>`).join('')}${B.final ? '<td></td>' : ''}<td></td></tr>`).join('');
  const body = `<h1>${esc(doc.title)}: score sheet</h1>
  <p class="directions">Write each team's name. Circle a value when the team earns it; cross it out when the team loses it. Add up the circled values minus the crossed ones for the total.</p>
  <table class="score"><tr><th>Team</th>${B.categories.map((c) => `<th>${esc(c.name)}</th>`).join('')}${B.final ? '<th>Final wager (+/−)</th>' : ''}<th>Total</th></tr>${rows}</table>
  <h2>Tiles played</h2><p class="small">Cross out each tile once it has been played.</p>
  <table class="board"><tr>${B.categories.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr>${B.values.map((v) => `<tr>${B.categories.map(() => `<td>${v}</td>`).join('')}</tr>`).join('')}</table>`;
  return pageHtml(ctx, `${doc.title} score sheet`, body);
}

const CLEAR_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function quizPptx(doc, ctx) {
  const B = boardOf(doc);
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = doc.title;
  pres.company = ctx.brand.shortName || ctx.brand.name;
  const font = ctx.style.font || 'Arial';
  const accent = inkAccent(ctx.style.accent).slice(1);
  const C = B.categories.length, V = B.values.length;
  const BOARD = 2;
  const clueSlide = (ci, vi) => 3 + 2 * (ci * V + vi);
  const finalStart = 3 + 2 * C * V;
  const footer = (s, dark = true) => s.addText(`${ctx.brand.shortName || ctx.brand.name} · Made with AI · check before use`, { x: 0.4, y: 7.05, w: 12.5, h: 0.3, fontSize: 9, color: dark ? 'B8C4DA' : '555555', fontFace: font });
  const link = (s, text, slide, box, opts = {}) => {
    s.addText(text, { ...box, fontSize: 18, bold: true, color: 'FFFFFF', fill: { color: '333333' }, align: 'center', valign: 'middle', fontFace: font, rectRadius: 0.1, ...opts });
    s.addImage({ data: CLEAR_PNG, ...box, hyperlink: { slide, tooltip: text } }); // the whole button is the link
  };

  const t = pres.addSlide();
  t.background = { color: 'FFFFFF' };
  t.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.35, fill: { color: accent } });
  t.addText(doc.title, { x: 0.8, y: 1.8, w: 11.7, h: 1.4, fontSize: 44, bold: true, color: accent, fontFace: font });
  t.addText([ctx.pack.order?.grade && `Grade ${ctx.pack.order.grade}`, ctx.subjectLabel, ctx.pack.order?.topic].filter(Boolean).join(' · '), { x: 0.8, y: 3.2, w: 11.7, h: 0.6, fontSize: 22, color: '333333', fontFace: font });
  t.addText(doc.directions || 'Pick a category and a value. Click the tile to see the clue; click Show answer, then Back to board.', { x: 0.8, y: 4.0, w: 11.7, h: 1.0, fontSize: 18, color: '333333', fontFace: font });
  link(t, 'Start: go to the board →', BOARD, { x: 0.8, y: 5.3, w: 4.6, h: 0.8 });
  t.addNotes(`${ctx.brand.aiNotice} Run the show in slideshow mode: each tile on the board links to its clue, and each clue links to its answer and back to the board. PowerPoint can't grey out a used tile; the offline HTML game in this pack does that and keeps the score.`);
  footer(t, false);

  const b = pres.addSlide();
  b.background = { color: '0B1E3F' };
  const gx = 0.35, gy = 0.3, gw = 12.63, gh = B.final ? 6.0 : 6.55;
  const cw = gw / C, rh = gh / (V + 1);
  B.categories.forEach((c, ci) => {
    b.addText(c.name, { x: gx + ci * cw + 0.04, y: gy, w: cw - 0.08, h: rh - 0.08, fontSize: C > 5 ? 15 : 18, bold: true, color: 'FFFFFF', fill: { color: '1F3A6E' }, align: 'center', valign: 'middle', fontFace: font, fit: 'shrink' });
    B.values.forEach((v, vi) => {
      const box = { x: gx + ci * cw + 0.04, y: gy + (vi + 1) * rh + 0.04, w: cw - 0.08, h: rh - 0.08 };
      b.addText(String(v), { ...box, fontSize: 32, bold: true, color: 'FFD54A', fill: { color: '17407F' }, align: 'center', valign: 'middle', fontFace: font });
      b.addImage({ data: CLEAR_PNG, ...box, hyperlink: { slide: clueSlide(ci, vi), tooltip: `${c.name} for ${v}` } });
    });
  });
  if (B.final) link(b, `Final round: ${B.final.category || ''}`, finalStart, { x: 4.2, y: 6.45, w: 4.9, h: 0.5 }, { fontSize: 16, fill: { color: '7A5A00' } });
  footer(b);
  b.addNotes('The board. Click a value to open its clue. PowerPoint does not grey out used tiles: cross them off on the printed score sheet, or use the offline HTML game.');

  const clueSlideOf = (title, text, answerSlide, notes) => {
    const s = pres.addSlide();
    s.background = { color: '0B1E3F' };
    s.addText(title, { x: 0.6, y: 0.3, w: 12.1, h: 0.7, fontSize: 24, bold: true, color: 'FFD54A', fontFace: font });
    s.addText(text, { x: 0.8, y: 1.2, w: 11.7, h: 4.6, fontSize: 36, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: font, fit: 'shrink' });
    link(s, 'Show answer →', answerSlide, { x: 7.9, y: 6.05, w: 3.0, h: 0.75 });
    link(s, '← Back to board', BOARD, { x: 2.4, y: 6.05, w: 3.0, h: 0.75 });
    s.addNotes(notes);
    footer(s);
  };
  const answerSlideOf = (title, answer, why, notes) => {
    const s = pres.addSlide();
    s.background = { color: '0B1E3F' };
    s.addText(title, { x: 0.6, y: 0.3, w: 12.1, h: 0.7, fontSize: 24, bold: true, color: 'FFD54A', fontFace: font });
    s.addText(answer, { x: 0.8, y: 1.4, w: 11.7, h: 2.8, fontSize: 44, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: font, fit: 'shrink' });
    if (why) s.addText(why, { x: 1.2, y: 4.3, w: 10.9, h: 1.5, fontSize: 20, color: 'DDE6F5', align: 'center', valign: 'top', fontFace: font, fit: 'shrink' });
    link(s, '← Back to board', BOARD, { x: 5.15, y: 6.05, w: 3.0, h: 0.75 });
    s.addNotes(notes);
    footer(s);
  };
  B.categories.forEach((c, ci) => c.clues.forEach((q, vi) => {
    const notes = `Answer: ${q.answer}${q.accept?.length ? ` (also accept: ${q.accept.join('; ')})` : ''}${q.why ? `. Why: ${q.why}` : ''}`;
    clueSlideOf(`${c.name} · ${q.value}`, q.clue, clueSlide(ci, vi) + 1, notes);
    answerSlideOf(`${c.name} · ${q.value} · answer`, q.answer, q.why, notes);
  }));
  if (B.final) {
    const f = B.final;
    const notes = `Answer: ${f.answer}${f.accept?.length ? ` (also accept: ${f.accept.join('; ')})` : ''}${f.why ? `. Why: ${f.why}` : ''}`;
    const s = pres.addSlide();
    s.background = { color: '0B1E3F' };
    s.addText('Final round', { x: 0.6, y: 1.4, w: 12.1, h: 1.0, fontSize: 40, bold: true, color: 'FFD54A', align: 'center', fontFace: font });
    s.addText(`Category: ${f.category || ''}`, { x: 0.6, y: 2.6, w: 12.1, h: 1.0, fontSize: 32, color: 'FFFFFF', align: 'center', fontFace: font });
    s.addText('Each team writes a wager (0 up to its score) before the clue is shown.', { x: 0.6, y: 3.8, w: 12.1, h: 0.8, fontSize: 20, color: 'DDE6F5', align: 'center', fontFace: font });
    link(s, 'Show the clue →', finalStart + 1, { x: 5.15, y: 5.2, w: 3.0, h: 0.75 });
    s.addNotes(notes);
    footer(s);
    clueSlideOf(`Final round · ${f.category || ''}`, f.clue, finalStart + 2, notes);
    answerSlideOf('Final round · answer', f.answer, f.why, notes);
  }
  return pres.write({ outputType: 'nodebuffer' });
}

// The offline game: one HTML file, no network (a Content-Security-Policy forbids it), keyboard friendly.
export function quizHtmlApp(doc, ctx) {
  const B = boardOf(doc);
  const data = {
    title: doc.title, directions: doc.directions || '', values: B.values, teams: B.teams,
    categories: B.categories.map((c) => ({ name: c.name, clues: c.clues.map((q) => ({ v: q.value, c: q.clue, a: q.answer, w: q.why || '' })) })),
    final: B.final ? { cat: B.final.category || '', c: B.final.clue, a: B.final.answer, w: B.final.why || '' } : null,
    footer: `${ctx.brand.shortName || ctx.brand.name} · Made with AI · check before use`,
    key: `qs-${ctx.pack.id || ''}-${doc.title}`,
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'">
<title>${esc(doc.title)}</title>
<style>
:root { --bg: #0b1e3f; --tile: #17407f; --head: #1f3a6e; --gold: #ffd54a; --ink: #fff; --muted: #c9d6ee; --used: #3b4a63; --panel: #10284f; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
body { min-height: 100vh; display: flex; flex-direction: column; }
header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 16px; }
h1 { font-size: clamp(18px, 3vw, 30px); margin: 0; color: var(--gold); }
.tools { display: flex; gap: 8px; flex-wrap: wrap; }
button { font: inherit; cursor: pointer; border-radius: 8px; border: 2px solid transparent; }
button:focus-visible, input:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.btn { background: #2a3d63; color: var(--ink); padding: 8px 14px; font-weight: 700; }
.btn.gold { background: var(--gold); color: #1a1a1a; }
main { flex: 1; padding: 0 16px 12px; }
.board { display: grid; gap: 6px; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); }
.cat { background: var(--head); border-radius: 8px; padding: 8px 4px; text-align: center; font-weight: 800; font-size: clamp(11px, 1.8vw, 22px); display: flex; align-items: center; justify-content: center; min-height: 3.2em; overflow-wrap: anywhere; }
.tile { background: var(--tile); color: var(--gold); font-weight: 900; font-size: clamp(16px, 4vw, 44px); min-height: clamp(48px, 11vh, 110px); }
.tile[aria-disabled="true"] { background: var(--used); color: #8c97ab; text-decoration: line-through; }
.teams { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); padding: 10px 16px 14px; }
.team { background: var(--panel); border-radius: 10px; padding: 8px 10px; display: grid; gap: 6px; }
.team input { width: 100%; font: inherit; font-weight: 700; background: transparent; color: var(--ink); border: 1px solid #4a5d83; border-radius: 6px; padding: 4px 6px; }
.team .score { font-size: clamp(22px, 3.4vw, 36px); font-weight: 900; color: var(--gold); text-align: center; }
.team .row { display: flex; gap: 6px; } .team .row button { flex: 1; padding: 6px 0; font-weight: 800; background: #2a3d63; color: var(--ink); }
.overlay { position: fixed; inset: 0; background: rgba(5, 14, 30, .96); display: none; align-items: center; justify-content: center; padding: 16px; }
.overlay.open { display: flex; }
.card { width: min(1000px, 100%); max-height: 100%; overflow: auto; text-align: center; }
.card .meta { color: var(--gold); font-weight: 800; font-size: clamp(16px, 2.4vw, 26px); }
.card .clue { font-size: clamp(22px, 4.2vw, 52px); line-height: 1.25; margin: 18px 0; overflow-wrap: anywhere; }
.card .answer { font-size: clamp(22px, 4vw, 48px); font-weight: 900; color: var(--gold); margin: 10px 0; }
.card .why { color: var(--muted); font-size: clamp(14px, 2vw, 22px); }
.card .award { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 14px 0; }
.card .award button { padding: 8px 12px; font-weight: 800; background: #2a3d63; color: var(--ink); }
.card .award .pair { display: inline-flex; gap: 4px; } .card .award .plus { border-color: #6fbf73; } .card .award .minus { border-color: #e57373; }
.card .acts { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
.wager { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 10px 0; }
.wager label { background: var(--panel); padding: 6px 8px; border-radius: 8px; } .wager input { width: 6em; font: inherit; }
.hint { color: var(--muted); font-size: 13px; padding: 0 16px 6px; }
footer { color: var(--muted); font-size: 12px; text-align: center; padding: 8px 16px 14px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style></head>
<body>
<header><h1 id="title"></h1><div class="tools"><button class="btn" id="finalBtn" hidden>Final round</button><button class="btn" id="newGame">New game</button></div></header>
<main><div class="board" id="board" role="grid" aria-label="Game board"></div></main>
<p class="hint">Keyboard: Tab to a tile and press Enter. In a clue: Space shows the answer (in the final round, first the clue, after the wagers); 1–6 gives the points to that team, Shift + 1–6 takes them away; Esc goes back to the board.</p>
<section class="teams" id="teams" aria-label="Team scores"></section>
<footer id="foot"></footer>
<div class="overlay" id="ov" role="dialog" aria-modal="true" aria-labelledby="ovMeta"><div class="card">
  <div class="meta" id="ovMeta"></div><div class="clue" id="ovClue"></div>
  <div class="wager" id="ovWager" hidden></div>
  <div id="ovAns" hidden><div class="answer" id="ovAnswer"></div><div class="why" id="ovWhy"></div></div>
  <div class="award" id="ovAward" aria-label="Give or take points"></div>
  <div class="acts"><button class="btn gold" id="reveal">Show answer</button><button class="btn" id="back">Back to board</button></div>
  <div class="sr" aria-live="polite" id="live"></div>
</div></div>
<script type="application/json" id="data">${json}</script>
<script>
(function () {
  var D = JSON.parse(document.getElementById('data').textContent);
  var store = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
                set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  function fresh() { var t = []; for (var i = 0; i < D.teams; i++) t.push({ name: 'Team ' + (i + 1), score: 0 }); return { used: {}, teams: t, finalDone: false }; }
  var S = store.get(D.key) || fresh();
  if (!S.teams || S.teams.length !== D.teams) S = fresh();
  function save() { store.set(D.key, S); }
  var $ = function (id) { return document.getElementById(id); };
  $('title').textContent = D.title; document.title = D.title; $('foot').textContent = D.footer;
  var board = $('board'); board.style.setProperty('--cols', D.categories.length);
  var cur = null, lastTile = null, hiddenClue = false;
  function renderBoard() {
    board.innerHTML = '';
    D.categories.forEach(function (c) { var h = document.createElement('div'); h.className = 'cat'; h.setAttribute('role', 'columnheader'); h.textContent = c.name; board.appendChild(h); });
    D.values.forEach(function (v, vi) {
      D.categories.forEach(function (c, ci) {
        var b = document.createElement('button'); var id = ci + ':' + vi; var used = !!S.used[id];
        b.className = 'tile'; b.textContent = v; b.dataset.id = id;
        b.setAttribute('aria-label', c.name + ' for ' + v + (used ? ', already played' : ''));
        if (used) b.setAttribute('aria-disabled', 'true');
        b.addEventListener('click', function () { if (!S.used[id]) openClue(ci, vi, b); });
        board.appendChild(b);
      });
    });
    $('finalBtn').hidden = !D.final;
  }
  function renderTeams() {
    var box = $('teams'); box.innerHTML = '';
    S.teams.forEach(function (t, i) {
      var d = document.createElement('div'); d.className = 'team';
      var inp = document.createElement('input'); inp.value = t.name; inp.setAttribute('aria-label', 'Team ' + (i + 1) + ' name');
      inp.addEventListener('change', function () { t.name = inp.value || ('Team ' + (i + 1)); save(); });
      var sc = document.createElement('div'); sc.className = 'score'; sc.textContent = t.score; sc.setAttribute('aria-live', 'polite');
      var row = document.createElement('div'); row.className = 'row';
      [[-100, '−100'], [100, '+100']].forEach(function (p) { var b = document.createElement('button'); b.textContent = p[1]; b.setAttribute('aria-label', (p[0] > 0 ? 'Add 100 to ' : 'Take 100 from ') + t.name); b.addEventListener('click', function () { add(i, p[0]); }); row.appendChild(b); });
      d.appendChild(inp); d.appendChild(sc); d.appendChild(row); box.appendChild(d);
    });
  }
  function add(i, pts) { S.teams[i].score += pts; save(); renderTeams(); $('live').textContent = S.teams[i].name + ': ' + S.teams[i].score; }
  function awardButtons(value, wagers) {
    var a = $('ovAward'); a.innerHTML = '';
    S.teams.forEach(function (t, i) {
      var pts = function () { return wagers ? Math.max(0, Number((document.getElementById('w' + i) || {}).value) || 0) : value; };
      var p = document.createElement('button'); p.className = 'plus'; p.textContent = t.name + ' +' + (wagers ? 'wager' : value);
      p.addEventListener('click', function () { add(i, pts()); });
      var m = document.createElement('button'); m.className = 'minus'; m.textContent = t.name + ' −' + (wagers ? 'wager' : value);
      m.addEventListener('click', function () { add(i, -pts()); });
      var g = document.createElement('span'); g.className = 'pair'; g.appendChild(p); g.appendChild(m); a.appendChild(g);
    });
  }
  function open(meta, clue, ans, why, value, wagers) {
    $('ovMeta').textContent = meta; $('ovClue').textContent = clue; $('ovAnswer').textContent = ans; $('ovWhy').textContent = why || '';
    $('ovAns').hidden = true; $('reveal').hidden = false;
    hiddenClue = !!wagers; $('ovClue').hidden = hiddenClue; $('reveal').textContent = hiddenClue ? 'Show the clue' : 'Show answer';
    var w = $('ovWager'); w.hidden = !wagers; w.innerHTML = '';
    if (wagers) S.teams.forEach(function (t, i) { var l = document.createElement('label'); l.textContent = t.name + ' wager '; var inp = document.createElement('input'); inp.type = 'number'; inp.min = 0; inp.id = 'w' + i; l.appendChild(inp); w.appendChild(l); });
    awardButtons(value, wagers);
    $('ov').classList.add('open'); $('reveal').focus();
  }
  function openClue(ci, vi, tile) {
    var c = D.categories[ci], q = c.clues[vi]; cur = { id: ci + ':' + vi, value: q.v }; lastTile = tile;
    S.used[cur.id] = true; save();
    open(c.name + ' · ' + q.v, q.c, q.a, q.w, q.v, false);
  }
  function reveal() {
    if (hiddenClue) { hiddenClue = false; $('ovClue').hidden = false; $('reveal').textContent = 'Show answer'; $('live').textContent = $('ovClue').textContent; return; }
    $('ovAns').hidden = false; $('reveal').hidden = true; $('back').focus(); $('live').textContent = 'Answer: ' + $('ovAnswer').textContent; }
  function close() {
    $('ov').classList.remove('open'); renderBoard();
    var t = lastTile && board.querySelector('[data-id="' + (cur && cur.id) + '"]'); (t || board.querySelector('.tile')).focus(); cur = null;
  }
  $('reveal').addEventListener('click', reveal);
  $('back').addEventListener('click', close);
  $('finalBtn').addEventListener('click', function () { if (!D.final) return; cur = { id: 'final', value: 0 }; lastTile = null; open('Final round · ' + D.final.cat, D.final.c, D.final.a, D.final.w, 0, true); });
  $('newGame').addEventListener('click', function () { if (confirm('Start a new game? Scores and played tiles are cleared.')) { var names = S.teams.map(function (t) { return t.name; }); S = fresh(); S.teams.forEach(function (t, i) { t.name = names[i]; }); save(); renderBoard(); renderTeams(); } });
  document.addEventListener('keydown', function (e) {
    if (!$('ov').classList.contains('open')) return;
    if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Escape') close(); return; }
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if ((e.key === ' ' || e.key === 'Enter') && !$('reveal').hidden && document.activeElement === $('reveal')) return; // the button handles it
    if (e.key === ' ' && !$('reveal').hidden) { e.preventDefault(); reveal(); return; }
    var m = /^(Digit|Numpad)([1-6])$/.exec(e.code || '');
    if (m && cur && cur.id !== 'final') { var i = Number(m[2]) - 1; if (i < S.teams.length) { e.preventDefault(); add(i, e.shiftKey ? -cur.value : cur.value); } }
    if (e.key === 'Tab') { // keep focus inside the dialog
      var f = Array.prototype.filter.call($('ov').querySelectorAll('button, input'), function (x) { return !x.hidden && x.offsetParent !== null; });
      if (f.length) { var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
  });
  renderBoard(); renderTeams();
})();
</script>
</body></html>
`;
}

/* ================= dispatch ================= */

export async function renderGame(doc, base, ctx, { pdf, write, later }) {
  const kind = doc.kind || doc.item;
  const t = doc.title;
  if (kind === 'quizshow') {
    await pdf(`${base}-teacher.pdf`, quizTeacherHtml(doc, ctx), `${t} · Teacher copy`, `${t}: the board, every clue and answer (the answer key)`, t);
    await pdf(`${base}-score-sheet.pdf`, scoreSheetHtml(doc, ctx), `${t} · Score sheet`, `${t}: printable score sheet`, t);
    write(`${base}.pptx`, await later(() => quizPptx(doc, ctx)), `${t}: projector slides (each tile links to its clue and back; answers in the notes)`);
    write(`${base}.html`, await later(() => quizHtmlApp(doc, ctx)), `${t}: the game in a browser, offline (tiles grey out, team scores)`);
    return;
  }
  for (const teacher of [false, true]) {
    const who = teacher ? 'teacher' : 'student';
    const label = `${t} · ${teacher ? 'Teacher' : 'Student'} copy`;
    const what = `${t}: ${who} copy${teacher ? ' (key)' : ''}`;
    if (kind === 'crossword') {
      await pdf(`${base}-${who}.pdf`, crosswordHtml(doc, ctx, teacher), label, what, t);
      write(`${base}-${who}.docx`, await later(() => crosswordDocx(doc, ctx, teacher)), `${what} (Word)`);
    } else if (kind === 'wordsearch') {
      await pdf(`${base}-${who}.pdf`, wordsearchHtml(doc, ctx, teacher), label, what, t);
    } else if (kind === 'logicpuzzle') {
      await pdf(`${base}-${who}.pdf`, logicHtml(doc, ctx, teacher), label, what, t);
      write(`${base}-${who}.docx`, await later(() => logicDocx(doc, ctx, teacher)), `${what} (Word)`);
    }
  }
}

// What a game document holds, counted like questions for the audit report: quiz-show clues, crossword clues, word-search
// words, logic puzzles.
export function gameItemCount(doc) {
  const kind = doc.kind || doc.item;
  if (kind === 'quizshow') { const B = boardOf(doc); return B.categories.length * B.values.length + (B.final ? 1 : 0); }
  if (kind === 'crossword') return (doc.crossword?.words || []).length;
  if (kind === 'wordsearch') return (doc.wordsearch?.words || []).length;
  if (kind === 'logicpuzzle') return (doc.puzzles || []).length;
  return 0;
}
