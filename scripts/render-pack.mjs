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
import { slug, questionsOf, layoutOf, scrubSecrets, cleanSvg, kindOf, subjectLabelOf } from './render/util.mjs';
import { copyHtml, rubricHtml, handoutHtml, cardsHtml, footerTemplate, headerTemplate, watermark, PREVIEW_MARK } from './render/html.mjs';
import { copyDocx, rubricDocx } from './render/docx.mjs';
import { deckPptx } from './render/pptx.mjs';
import { auditHtml } from './render/audit.mjs';
import { reviewHtml, STATEMENT } from './render/review.mjs';
import { mathPngMaker, setMathEnabled } from './render/math.mjs';
import { GAME_KINDS, renderGame } from './render/games.mjs';
import { isAppDoc, renderAppDoc } from './render/apps.mjs';
import { isLab, simFileName, simPageHtml } from './render/lab.mjs';
import { isPracticeGameDoc, renderPracticeGameDoc } from './render/practicegames.mjs';
import { needsAllKeys, keyVersions, allVersionsKeyHtml, teacherKeyPageHtml } from './render/keys.mjs';
import { hasPool } from './render/util.mjs';
import { isInteractiveFormat, formatProblems, renderInteractivePages, teacherNoteHtml, teacherNoteLines, versionsOfDoc, howToShareText, classCodesOf } from './render/interactive-format.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const DECK_ITEMS = new Set(['slides', 'reviewgame', 'bellringer']);

export class RenderError extends Error {}

// The owner's copy of the audit report: in the order folder only, never delivered (scripts/orders.mjs skips it too).
export const OWNER_AUDIT = 'AUDIT-REPORT-OWNER.pdf';
export const isOwnerOnly = (f) => /AUDIT-REPORT-OWNER/i.test(String(f));

// Tokens charged for the order: the pack's order, else the order file next to it (samples: order.json; work folders:
// in/order.json, from scripts/orders.mjs pull).
function tokenTotalOf(pack, folder) {
  const direct = pack.order?.tokenTotal ?? pack.tokenTotal;
  if (direct != null && !Number.isNaN(Number(direct))) return Number(direct);
  for (const f of ['order.json', path.join('in', 'order.json')]) {
    try {
      const o = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
      const t = o.tokenTotal ?? o.order?.tokenTotal;
      if (t != null && !Number.isNaN(Number(t))) return Number(t);
    } catch {}
  }
  return null;
}

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

// The files a teacher reviews and approves: every PDF in the preview and every interactive page (not REVIEW.html).
export const reviewedFile = (f) => f.endsWith('.pdf') || (f.endsWith('.html') && f !== 'REVIEW.html');

// The approval must name this order, cover exactly the PDFs and interactive pages in the current preview (same SHA-256),
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
  const current = fs.readdirSync(previewDir).filter(reviewedFile).sort();
  const approved = docs.map((d) => d.file).sort();
  const missing = current.filter((f) => !approved.includes(f));
  if (missing.length) throw new RenderError(`not approved: the preview has files that weren't approved: ${missing.join(', ')}.`);
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
  const subjectLabel = subjectLabelOf(menu, order);
  const date = pack.date || order.date || (pack.id?.match(/\d{4}-\d{2}-\d{2}/) || [])[0] || new Date().toISOString().slice(0, 10);

  const outDir = path.join(folder, preview ? 'out-preview' : 'out');
  const zipPath = path.join(folder, preview ? 'preview.zip' : 'out.zip');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.rmSync(zipPath, { force: true });
  fs.rmSync(path.join(folder, OWNER_AUDIT), { force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const { chromium } = loadPlaywright();
  const executablePath = process.env.PP_CHROMIUM || '/opt/pw-browsers/chromium';
  const browser = await chromium.launch({ executablePath: fs.existsSync(executablePath) ? executablePath : undefined, args: ['--no-sandbox'] });
  const made = []; // {file, what, title}
  try {
    const page = await browser.newPage();
    const figPage = await (await browser.newContext({ deviceScaleFactor: 3 })).newPage();
    const figCache = new Map();
    setMathEnabled(pack);
    const ctx = {
      packHash: packHashOf(pack),
      tokenTotal: tokenTotalOf(pack, folder),
      pack, brand, style, layout: layoutOf(style), subjectLabel, date, preview, approval,
      mathPng: mathPngMaker(figPage), // typeset math as a PNG: Word's fallback and PowerPoint (docs/KINDS-MATH.md)
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
        footerTemplate: footerTemplate(label, brand, { preview }),
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
    // An interactive page (docs/KINDS-INTERACTIVE-FORMAT.md) is in the preview (watermarked) and in the final, like a PDF.
    const html = async (file, text, what, title) => {
      fs.writeFileSync(path.join(outDir, file), text);
      made.push({ file, what, title: title || file });
    };
    const interactiveFiles = [];
    // every version's key (scripts/render/keys.mjs): a printable all-versions key (preview and final) and, in the final,
    // the teacher's key page (by letter, version code or a student's name); never with the students' pages. Always for one
    // version per student; for 2+ versions only with the paid key pack (itemSpecs.<item>.keyPack)
    const allKeys = async (doc, base) => {
      if (!needsAllKeys(doc, pack)) return;
      const n = keyVersions(doc).length, what = hasPool(doc) ? `${n} versions, one per student` : `${n} versions`;
      await pdf(`${base}-all-versions-key.pdf`, allVersionsKeyHtml(doc, ctx), `${doc.title} · All keys`, `${doc.title}: every version's key (${what}), to print`, doc.title);
      write(`${base}-teacher-key.html`, teacherKeyPageHtml(pack, doc, base, ctx), `${doc.title}: your key page (type a version${hasPool(doc) ? ' code or a student\'s name' : ''} to see its key; ${what}). For you only: never share it with students`);
    };
    const baseOf = new Map();   // document → its file name base (the README needs a review game's class codes)

    const used = new Set();
    for (const doc of pack.documents) {
      let base = slug(doc.title || doc.item);
      for (let i = 2; used.has(base); i++) base = `${slug(doc.title || doc.item)}-${i}`;
      used.add(base);
      baseOf.set(doc, base);
      // review apps and interactive worksheets: docs/KINDS-APPS.md
      if (isAppDoc(doc)) { await renderAppDoc(doc, base, ctx, { pdf, write, browser }).catch((e) => { throw e instanceof RenderError ? e : new RenderError(e.message); }); continue; }
      // practice games: docs/KINDS-PRACTICEGAMES.md
      if (isPracticeGameDoc(doc)) { await renderPracticeGameDoc(doc, base, ctx, { pdf, write, browser }).catch((e) => { throw e instanceof RenderError ? e : new RenderError(e.message); }); continue; }
      // a science lab (docs/KINDS-LABS.md): its simulation is its own offline page, in the preview and the final
      ctx.labBase = base;
      if (isLab(doc) && doc.lab.simulation) {
        await html(simFileName(base), simPageHtml(doc.lab.simulation, { title: doc.title, preview, brandName: brand.shortName || brand.name }),
          `${doc.title}: the simulation (one offline page that runs in any browser, Chromebooks included; no logins)`, `${doc.title} · Simulation`);
      }
      const hasQs = questionsOf(doc).length > 0;
      const kind = kindOf(doc);
      const fmtProblems = formatProblems(pack, doc);
      if (fmtProblems.length) throw new RenderError(fmtProblems.join('; '));
      if (isInteractiveFormat(doc)) {
        // one HTML page per version for students, and the teacher copy (the key) as a PDF, plus Word in the final
        try { interactiveFiles.push(...await renderInteractivePages(doc, base, ctx, { html })); } catch (e) { throw new RenderError(e.message); }
        const note = teacherNoteHtml(doc, classCodesOf(pack, doc, base));
        for (const ver of versionsOfDoc(doc)) {
          const name = `${base}-teacher${ver ? `-${ver}` : ''}`;
          const what = `${doc.title}: teacher copy${ver ? `, version ${ver}` : ''} (key, why, skills map; the key for the interactive page)`;
          const page = copyHtml(doc, ver, ctx, true).replace(/(<div class="tbanner">[\s\S]*?<\/div>)/, `$1${note}`);
          await pdf(`${name}.pdf`, page, `${doc.title} · Teacher copy${ver ? ` ${ver}` : ''}`, what, doc.title);
          write(`${name}.docx`, await later(() => copyDocx(doc, ver, ctx, true)), what + ' (Word)');
        }
        await allKeys(doc, base);
        continue;
      }
      if (GAME_KINDS.has(kind)) { await renderGame(doc, base, ctx, { pdf, write, later }); continue; } // docs/KINDS-GAMES.md
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
        if (!deck) await allKeys(doc, base);
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
    await pdf('AUDIT-REPORT.pdf', audit.html, 'Audit report', 'The audit report: what was made, who checked it, what was fixed, your decisions and how to grade; then the full log', 'Audit report');
    // The owner copy (costs, token and cache detail) goes in the order folder, never in out-preview/, out/ or a zip:
    // it is for the owner and the auditor, and is never delivered to the teacher.
    const ownerAudit = auditHtml(pack, ctx, { owner: true });
    await page.setContent(preview ? watermark(ownerAudit.html) : ownerAudit.html, { waitUntil: 'load' });
    await page.pdf({
      path: path.join(folder, OWNER_AUDIT), format: 'Letter', printBackground: true, displayHeaderFooter: true,
      headerTemplate: headerTemplate(`OWNER COPY · never send to the teacher · order ${pack.id || ''}`),
      footerTemplate: footerTemplate('Audit report · owner copy', brand, { preview }),
      margin: { top: '0.6in', bottom: '0.7in', left: '0.7in', right: '0.7in' },
    });

    let files;
    if (preview) {
      const pdfs = made.map((m) => ({ file: m.file, title: m.title, sha256: sha256(fs.readFileSync(path.join(outDir, m.file))) }));
      fs.writeFileSync(path.join(outDir, 'REVIEW.html'), reviewHtml(pack, ctx, pdfs, packHashOf(pack)));   // pdfs: every PDF and interactive page
      files = [...made.map((m) => m.file), 'REVIEW.html'];
    } else {
      if (interactiveFiles.length) write('HOW-TO-SHARE-THE-INTERACTIVE-PAGES.txt', howToShareText(brand, interactiveFiles), 'How to share the interactive pages (email, Google Drive or Classroom, any website)');
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
        ...pack.documents.filter(isInteractiveFormat).flatMap((d) => ['', `INTERACTIVE: ${d.title}`, ...teacherNoteLines(d, classCodesOf(pack, d, baseOf.get(d))).map((l) => '  ' + l)]),
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
    return { mode, outDir, zipPath, files, stats: audit.stats, ownerAudit: path.join(folder, OWNER_AUDIT) };
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
