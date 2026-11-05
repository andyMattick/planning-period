#!/usr/bin/env node
// Turns <folder>/pack.json into files for the teacher. See docs/PACK-FORMAT.md.
//
//   node scripts/render-pack.mjs <folder>            preview if <folder>/approval.json is missing, else final
//   node scripts/render-pack.mjs <folder> --preview  out-preview/ + preview.zip: watermarked PDFs and REVIEW.html only
//   node scripts/render-pack.mjs <folder> --final    out/ + out.zip: every file, only with a matching approval.json

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { slug, questionsOf, layoutOf, scrubSecrets, cleanSvg, kindOf } from './render/util.mjs';
import { copyHtml, rubricHtml, handoutHtml, cardsHtml, footerTemplate, headerTemplate, watermark, PREVIEW_MARK } from './render/html.mjs';
import { copyDocx, rubricDocx } from './render/docx.mjs';
import { deckPptx } from './render/pptx.mjs';
import { auditHtml, tptHtml } from './render/audit.mjs';
import { reviewHtml, STATEMENT } from './render/review.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const DECK_ITEMS = new Set(['slides', 'reviewgame', 'bellringer']);

export class RenderError extends Error {}

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return createRequire(path.join(globalRoot, 'noop.js'))('playwright');
  }
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
// The pack's fingerprint: any change to its content (not just its whitespace) changes it.
export const packHashOf = (pack) => sha256(JSON.stringify(pack));

function readPack(folder) {
  const packPath = path.join(folder, 'pack.json');
  if (!fs.existsSync(packPath)) throw new RenderError(`no pack.json in ${folder}`);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  if (pack.format !== 1) throw new RenderError(`unknown pack format ${pack.format} (this renderer reads format 1)`);
  if (!Array.isArray(pack.documents) || !pack.documents.length) throw new RenderError('pack has no documents');
  return pack;
}

// The approval must name this order, cover exactly the PDFs in the current preview (same SHA-256),
// and come from this exact pack. Anything else and the final files are not made.
export function checkApproval(folder, pack) {
  const file = path.join(folder, 'approval.json');
  const previewDir = path.join(folder, 'out-preview');
  const how = `Render the preview (--preview), have the teacher sign off in REVIEW.html, and save the file it gives as ${file}.`;
  if (!fs.existsSync(file)) throw new RenderError(`not approved: ${file} is missing. ${how}`);
  let a;
  try {
    a = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new RenderError(`not approved: approval.json is not valid JSON (${e.message}).`);
  }
  if (a.orderId !== pack.id) throw new RenderError(`not approved: approval.json is for order "${a.orderId}", but this pack is "${pack.id}".`);
  if (!a.name || !String(a.name).trim()) throw new RenderError('not approved: approval.json has no name.');
  if (!a.date || Number.isNaN(Date.parse(a.date))) throw new RenderError('not approved: approval.json has no valid date.');
  if (a.statement !== STATEMENT) throw new RenderError('not approved: the agreement text in approval.json is not the one the review page shows.');
  if (a.packHash !== packHashOf(pack)) throw new RenderError(`not approved: pack.json changed after ${a.name} approved it. Render a new preview and get a new approval.`);
  if (!fs.existsSync(previewDir)) throw new RenderError(`not approved: ${previewDir} is missing, so the PDFs ${a.name} saw can't be compared. ${how}`);
  const docs = Array.isArray(a.documents) ? a.documents : [];
  const current = fs.readdirSync(previewDir).filter((f) => f.endsWith('.pdf')).sort();
  const approved = docs.map((d) => d.file).sort();
  const missing = current.filter((f) => !approved.includes(f));
  if (missing.length) throw new RenderError(`not approved: the preview has PDFs that weren't approved: ${missing.join(', ')}.`);
  for (const d of docs) {
    const p = path.join(previewDir, path.basename(String(d.file || '')));
    if (!fs.existsSync(p)) throw new RenderError(`not approved: ${d.file} was approved but isn't in the current preview.`);
    if (sha256(fs.readFileSync(p)) !== d.sha256) throw new RenderError(`not approved: ${d.file} changed after ${a.name} saw it. Get a new approval for the new preview.`);
  }
  return a;
}

export async function renderPack(folder, { mode } = {}) {
  folder = path.resolve(folder);
  const pack = readPack(folder);
  if (!mode) mode = fs.existsSync(path.join(folder, 'approval.json')) ? 'final' : 'preview';
  const preview = mode === 'preview';
  const approval = preview ? null : checkApproval(folder, pack);

  const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));
  const menu = JSON.parse(fs.readFileSync(path.join(ROOT, 'menu.json'), 'utf8'));
  const style = pack.style || {};
  const order = pack.order || {};
  const subjectLabel = menu.subjects.find((s) => s.id === order.subject)?.label || order.subject || '';
  const date = pack.date || order.date || (pack.id?.match(/\d{4}-\d{2}-\d{2}/) || [])[0] || new Date().toISOString().slice(0, 10);

  const outDir = path.join(folder, preview ? 'out-preview' : 'out');
  const zipPath = path.join(folder, preview ? 'preview.zip' : 'out.zip');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.rmSync(zipPath, { force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const { chromium } = loadPlaywright();
  const executablePath = process.env.PP_CHROMIUM || '/opt/pw-browsers/chromium';
  const browser = await chromium.launch({ executablePath: fs.existsSync(executablePath) ? executablePath : undefined, args: ['--no-sandbox'] });
  const made = []; // {file, what, title}
  try {
    const page = await browser.newPage();
    const figPage = await (await browser.newContext({ deviceScaleFactor: 3 })).newPage();
    const figCache = new Map();
    const ctx = {
      pack, brand, style, layout: layoutOf(style), subjectLabel, date, preview, approval,
      async figurePng(svgText) {
        const svg = cleanSvg(svgText);
        if (!svg) return null;
        if (figCache.has(svg)) return figCache.get(svg);
        await figPage.setContent(`<!doctype html><html><body style="margin:0;background:#fff;display:inline-block">${svg}</body></html>`);
        const el = await figPage.$('svg');
        const box = await el.boundingBox();
        const data = await el.screenshot({ type: 'png' });
        const out = { data, width: Math.round(box.width), height: Math.round(box.height) };
        figCache.set(svg, out);
        return out;
      },
    };

    const pdf = async (file, html, label, what, title) => {
      await page.setContent(preview ? watermark(html) : html, { waitUntil: 'load' });
      await page.pdf({
        path: path.join(outDir, file), format: 'Letter', printBackground: true, displayHeaderFooter: true,
        headerTemplate: headerTemplate(preview ? `${PREVIEW_MARK} · order ${pack.id || ''}` : ''),
        footerTemplate: footerTemplate(label, brand),
        margin: { top: '0.6in', bottom: '0.7in', left: '0.7in', right: '0.7in' },
      });
      made.push({ file, what, title: title || label });
    };
    // Word, PowerPoint and project.json are editable, so they are only made after sign-off.
    const write = (file, buf, what) => {
      if (preview) return;
      fs.writeFileSync(path.join(outDir, file), buf);
      made.push({ file, what });
    };
    const later = async (fn) => (preview ? null : fn());

    const used = new Set();
    for (const doc of pack.documents) {
      let base = slug(doc.title || doc.item);
      for (let i = 2; used.has(base); i++) base = `${slug(doc.title || doc.item)}-${i}`;
      used.add(base);
      const hasQs = questionsOf(doc).length > 0;
      const kind = kindOf(doc);
      const bell = kind === 'bellringer'; // one question a day: day cards for students, a slide a day
      const deck = DECK_ITEMS.has(kind) || DECK_ITEMS.has(doc.item) || (Array.isArray(doc.slides) && doc.slides.length > 0);
      ctx.dayLabels = bell;

      if (deck) {
        write(`${base}.pptx`, await later(() => deckPptx(doc, ctx)), `${doc.title}: slides with speaker notes`);
        if (doc.slides?.length) await pdf(`${base}-handout.pdf`, handoutHtml(doc, ctx), `${doc.title} · Handout`, `${doc.title}: printable handout with room for notes`, doc.title);
        if (hasQs && !doc.slides?.length && !bell) await pdf(`${base}-cards.pdf`, cardsHtml(doc, ctx), `${doc.title} · Cards`, `${doc.title}: printable question cards (no answers)`, doc.title);
      }
      if (hasQs) {
        const versions = Array.isArray(doc.versions) && doc.versions.length ? doc.versions : [null];
        const copies = deck && !bell ? [true] : [false, true]; // a review game's key is the teacher copy; the cards are the student side
        for (const ver of versions) {
          for (const teacher of copies) {
            const who = teacher ? 'teacher' : 'student';
            const name = `${base}-${who}${ver ? `-${ver}` : ''}`;
            const label = `${doc.title} · ${teacher ? 'Teacher' : 'Student'} copy${ver ? ` ${ver}` : ''}`;
            const what = `${doc.title}: ${who} copy${ver ? `, version ${ver}` : ''}${teacher ? ' (key, why, skills map)' : ''}`;
            await pdf(`${name}.pdf`, bell && !teacher ? cardsHtml(doc, ctx, { days: true }) : copyHtml(doc, ver, ctx, teacher), label, what, doc.title);
            if (!deck || bell) write(`${name}.docx`, await later(() => copyDocx(doc, ver, ctx, teacher)), what + ' (Word)');
          }
        }
      } else if (doc.rubric) {
        await pdf(`${base}.pdf`, rubricHtml(doc, ctx), `${doc.title} · Rubric`, `${doc.title}: rubric`, doc.title);
        write(`${base}.docx`, await later(() => rubricDocx(doc, ctx)), `${doc.title}: rubric (Word)`);
      } else if (!deck) {
        console.warn(`render-pack: "${doc.title}" has no questions, slides or rubric; skipped`);
      }
    }

    // Which of Wilco's bots the pack has enough questions to judge (checks/test-wise.mjs, the whole-pack group), for
    // rounds that didn't record it: a bot that isn't judged is shown greyed, never as over the line.
    const wise = path.join(ROOT, 'checks', 'test-wise.mjs');
    if (fs.existsSync(wise)) {
      try {
        const { playPack } = await import(pathToFileURL(wise).href);
        const res = playPack(pack);
        const rows = res.groups[res.groups.length - 1]?.rows || [];
        ctx.botJudged = (name) => rows.find((r) => r.name === name)?.counted;
      } catch (e) {
        console.warn(`render-pack: couldn't play Wilco's bots for the report (${e.message}); every bot is shown as judged`);
      }
    }
    const audit = auditHtml(pack, ctx);
    await pdf('AUDIT-REPORT.pdf', audit.html, 'Audit report', 'The audit report: every agent, every round, every catch and fix, time and cost', 'Audit report');

    let files;
    if (preview) {
      const pdfs = made.map((m) => ({ file: m.file, title: m.title, sha256: sha256(fs.readFileSync(path.join(outDir, m.file))) }));
      fs.writeFileSync(path.join(outDir, 'REVIEW.html'), reviewHtml(pack, ctx, pdfs, packHashOf(pack)));
      files = [...made.map((m) => m.file), 'REVIEW.html'];
    } else {
      const wantsTpt = [...(order.items || []), ...(order.extras || [])].includes('tpt');
      if (wantsTpt) {
        const sellable = made.filter((m) => !/^AUDIT/.test(m.file)).map((m) => m.file);
        await pdf('SELL-IT-ON-TPT.pdf', tptHtml(pack, ctx, sellable), 'Sell it yourself', 'A one-page guide to selling this pack on Teachers Pay Teachers');
      }
      write('project.json', JSON.stringify(scrubSecrets(pack), null, 2) + '\n', 'This pack as data: upload it again to change it, reprint it or make new versions');
      const readme = [
        `${brand.name}: your pack`,
        `Order ${pack.id || ''}${order.topic ? ` · ${order.topic}` : ''}${order.grade ? ` · grade ${order.grade}` : ''}${order.teacher ? ` · for ${order.teacher}` : ''}`,
        `Approved by ${approval.name} on ${String(approval.date).slice(0, 10)}, after reading the preview.`,
        '',
        'WHAT IS INSIDE',
        ...made.map((m) => `  ${m.file.padEnd(34)} ${m.what}`),
        `  ${'README.txt'.padEnd(34)} This file`,
        '',
        'CHECK IT BEFORE STUDENTS SEE IT',
        `  ${brand.aiNotice}`,
        '  Every page says "Made with AI · check before use" in the footer.',
        '',
        'TO CHANGE OR REPRINT IT',
        '  Upload project.json with a new order and say what to change (a new version C, easier level 1,',
        '  a different font). The agents start from this pack instead of from scratch, the checkers',
        '  check the changes again, and you get a new preview to approve.',
        '',
        'YOUR FILES',
        `  ${brand.deleteNotice}`,
        '',
        brand.orderEmail && !brand.orderEmailIsPlaceholder ? `Questions: ${brand.orderEmail}` : '',
      ].join('\n');
      fs.writeFileSync(path.join(outDir, 'README.txt'), readme.replace(/\n+$/, '\n'));
      files = [...made.map((m) => m.file), 'README.txt'];
    }

    execFileSync('zip', ['-q', '-r', '-X', zipPath, '.'], { cwd: outDir });
    return { mode, outDir, zipPath, files, stats: audit.stats };
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const folder = args.find((a) => !a.startsWith('--'));
  const mode = args.includes('--final') ? 'final' : args.includes('--preview') ? 'preview' : undefined;
  if (!folder) {
    console.error('usage: node scripts/render-pack.mjs <folder> [--preview | --final]');
    process.exit(1);
  }
  try {
    const res = await renderPack(folder, { mode });
    console.log(`Rendered the ${res.mode} (${res.files.length} files) to ${path.relative(process.cwd(), res.outDir) || res.outDir}`);
    for (const f of res.files) console.log(`  ${f}`);
    console.log(`Zip: ${path.relative(process.cwd(), res.zipPath)}`);
  } catch (e) {
    if (!(e instanceof RenderError)) throw e;
    console.error(`render-pack: ${e.message}`);
    process.exit(1);
  }
}
