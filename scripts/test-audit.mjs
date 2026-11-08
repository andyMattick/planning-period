#!/usr/bin/env node
// The audit report's two copies (owner, Nov 8, 2026; scripts/render/audit.mjs), for every sample pack:
//   1. the teacher report (before "Appendix: the full log") is at most 3 pages;
//   2. the teacher's AUDIT-REPORT has no AI cost: no amount in dollars and cents and no dollar amount next to a cost
//      word, once the dollars inside the questions are taken out (a money word problem is content), and no model-token
//      detail;
//   3. the teacher report has none of the internal words on the denylist below;
//   4. the owner copy has the cost; a judgment call with options shows them, one without falls back to the checker's words;
//   5. the owner copy is never delivered: render-pack.mjs writes it outside out-preview/ and the zip, and
//      scripts/orders.mjs filters it out of the preview and final uploads.
//   node scripts/test-audit.mjs [--no-browser] [--pdf <folder>] [pack.json …]   (--pdf saves each teacher report)   (default: every samples/**/pack.json with a log or checks)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditHtml, judgmentCalls } from './render/audit.mjs';
import { subjectLabelOf, money } from './render/util.mjs';
import { htmlToText as htmlText } from './html-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const noBrowser = args.includes('--no-browser');
const pdfAt = args.indexOf('--pdf'), PDF_DIR = pdfAt >= 0 ? path.resolve(args.splice(pdfAt, 2)[1]) : null;
let failed = 0;
const ok = (m) => console.log(`✓ ${m}`);
const bad = (m) => { failed++; console.log(`✗ ${m}`); };

// Internal words a teacher shouldn't meet in her report (owner review, Nov 8, 2026).
export const DENYLIST = [
  /\bL[123]\b/, /\bWilco\b/i, /feasibility/i, /\bkeys check\b/i, /\bkeys? rows?\b/i, /\bbots?\b/i, /Lead \(waiting\)/i, /\bLead\b/,
  /\bCLI\b/, /\bbranch\b/i, /\bcache\b/i, /test-wise/i, /\bchance\b/i, /\bnpm\b/, /\.json\b/, /\.mjs\b/, /\bSymPy\b/i,
  /\bJUDGMENT\b/, /\bKEEP\b/, /\bFIX\b/, /\bscorer\b/i, /\bAI cost\b/i, /\bper version-item\b/i,
];

function loadPlaywright() {
  try { return require('playwright'); } catch {}
  const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  return createRequire(path.join(g, 'noop.js'))('playwright');
}

function packsToTest() {
  const given = args.filter((a) => !a.startsWith('--'));
  if (given.length) return given.map((p) => path.resolve(p));
  const out = [];
  const walk = (d, depth) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && depth < 2 && !/^(out|out-preview|node_modules)$/.test(e.name)) walk(p, depth + 1);
      else if (e.name === 'pack.json') out.push(p);
    }
  };
  walk(path.join(ROOT, 'samples'), 0);
  return out.sort();
}

// The pack with every dollar sign in its content (questions, findings, the original's review) taken out, so any dollar
// left in the teacher report can only be a cost.
function withoutContentDollars(pack) {
  const strip = (x) => JSON.parse(JSON.stringify(x ?? null).replace(/\$/g, '¤'));
  return { ...pack, documents: strip(pack.documents), checks: strip(pack.checks), originalReview: strip(pack.originalReview), style: strip(pack.style) };
}

const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));
const menu = JSON.parse(fs.readFileSync(path.join(ROOT, 'menu.json'), 'utf8'));
const ctxFor = (pack, tokenTotal = 70) => ({ pack, brand, style: pack.style || {}, subjectLabel: subjectLabelOf(menu, pack.order || {}), date: '2026-11-08', preview: true, approval: null, tokenTotal });

let browser = null, page = null;
if (!noBrowser) {
  try {
    const { chromium } = loadPlaywright();
    const exe = process.env.PP_CHROMIUM || '/opt/pw-browsers/chromium';
    browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox'] });
    page = await browser.newPage();
  } catch (e) { console.log(`⏭️  page counts skipped: Playwright isn't here (${e.message.split('\n')[0]})`); }
}
async function pages(html, name) {
  await page.setContent(html, { waitUntil: 'load' });
  const buf = await page.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<span></span>',
    margin: { top: '0.6in', bottom: '0.7in', left: '0.7in', right: '0.7in' } });
  if (PDF_DIR) { fs.mkdirSync(PDF_DIR, { recursive: true }); fs.writeFileSync(path.join(PDF_DIR, `${name}.pdf`), buf); }
  return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
}

try {
  for (const file of packsToTest()) {
    const rel = path.relative(ROOT, file);
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!(pack.log || []).length && !Object.keys(pack.checks || {}).length) continue;
    const teacher = auditHtml(withoutContentDollars(pack), ctxFor(pack));
    const owner = auditHtml(pack, ctxFor(pack), { owner: true });
    const text = htmlText(teacher.html), part = htmlText(teacher.teacherHtml);
    // A cost is always written in dollars and cents (util.mjs money) or next to a cost word; a whole-dollar amount in a
    // reporter's note about a money word problem ("8 × $40 = $320") is content.
    const dollars = text.match(/.{0,40}(?:\$\s?\d[\d,]*\.\d\d\b|\b(?:cost|cap|budget|total|spent|dollars?|price)\W{0,12}\$\s?\d).{0,20}/gi);
    if (dollars) bad(`${rel}: the teacher's audit report shows a dollar amount: ${dollars.slice(0, 3).map((x) => `"${x.trim()}"`).join(', ')}`);
    else ok(`${rel}: no dollars in the teacher's audit report`);
    if (/cache (read|write)|\bTokens?:\s*(in|out)\b/i.test(text)) bad(`${rel}: the teacher's audit report shows model-token detail`);
    const hits = DENYLIST.map((re) => (part.match(new RegExp(`.{0,30}${re.source}.{0,30}`, re.flags.replace('g', ''))) || [])[0]).filter(Boolean);
    if (hits.length) bad(`${rel}: the teacher report uses internal words: ${hits.slice(0, 4).map((x) => `"${x.trim()}"`).join(', ')}`);
    else ok(`${rel}: the teacher report is in plain words (denylist of ${DENYLIST.length})`);
    const cost = (pack.log || []).reduce((s, l) => s + (Number(l.cost) || 0), 0);
    if (cost > 0 && !htmlText(owner.html).includes(money(cost))) bad(`${rel}: the owner copy doesn't show the cost ${money(cost)}`);
    if (!/Appendix/.test(teacher.html) || !/The full log/.test(teacher.html)) bad(`${rel}: no "Appendix: the full log" divider`);
    if (page) {
      const n = await pages(teacher.teacherHtml, rel.replace(/\/pack\.json$/, '').replace(/[\/]/g, '-'));
      if (n > 3) bad(`${rel}: the teacher report is ${n} pages (at most 3)`); else ok(`${rel}: the teacher report is ${n} page${n === 1 ? '' : 's'}`);
    }
  }

  // Judgment calls: with options, our pick is marked; without (older packs), the checker's own words, as before.
  {
    const base = { format: 1, id: 'pp-test', documents: [{ title: 'Quiz', sections: [{ questions: [{ id: 'q1', type: 'short', prompt: 'x', answer: '1' }] }] }], log: [] };
    const old = { ...base, checks: { blind: [{ round: 1, findings: [{ where: 'Quiz q1', kind: 'JUDGMENT', what: 'Reading 1: keep. Reading 2: reword.' }] }] } };
    const neu = { ...base, checks: { blind: [{ round: 1, findings: [{ where: 'Quiz q1', kind: 'JUDGMENT', what: 'Too easy.', judgment: { issue: 'Too easy.', options: ['Keep it', 'Reword it'], recommend: 1, why: 'A test should not give it away.' } }] }] } };
    const [o] = judgmentCalls(old), [n] = judgmentCalls(neu);
    const th = htmlText(auditHtml(neu, ctxFor(neu)).teacherHtml), to = htmlText(auditHtml(old, ctxFor(old)).teacherHtml);
    if (o && !o.options.length && to.includes('Reading 1: keep') && n && n.options.length === 2 && n.recommend === 1 && /Our pick: Reword it/.test(th) && /Why: A test should not give it away/.test(th))
      ok('judgment calls: options with our pick and why; an older pack falls back to the checker\'s words');
    else bad('judgment calls: options or the fallback are wrong');
  }

  // The owner copy is never delivered.
  {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'orders.mjs'), 'utf8');
    const filtered = (src.match(/\.filter\(deliverable\)/g) || []).length;
    if (filtered >= 2 && /AUDIT-REPORT-OWNER/.test(src)) ok('scripts/orders.mjs leaves the owner copy out of the preview and final uploads');
    else bad('scripts/orders.mjs must filter AUDIT-REPORT-OWNER out of both the preview and the final uploads');
    const fx = path.join(ROOT, 'samples', '_fixture');
    if (page && fs.existsSync(path.join(fx, 'pack.json'))) {
      const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'render-pack.mjs'), fx, '--preview'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
      const inPreview = fs.existsSync(path.join(fx, 'out-preview')) ? fs.readdirSync(path.join(fx, 'out-preview')) : [];
      const zip = fs.existsSync(path.join(fx, 'preview.zip')) ? execFileSync('unzip', ['-Z1', path.join(fx, 'preview.zip')], { encoding: 'utf8' }) : '';
      const review = fs.existsSync(path.join(fx, 'out-preview', 'REVIEW.html')) ? fs.readFileSync(path.join(fx, 'out-preview', 'REVIEW.html'), 'utf8') : '';
      if (r.status !== 0) bad(`render-pack.mjs failed on samples/_fixture:\n${r.stdout}${r.stderr}`);
      else if (inPreview.some((f) => /OWNER/i.test(f)) || /OWNER/i.test(zip) || /OWNER/i.test(review)) bad('the owner copy is in out-preview/, preview.zip or REVIEW.html');
      else if (!fs.existsSync(path.join(fx, 'AUDIT-REPORT-OWNER.pdf'))) bad('render-pack.mjs did not write AUDIT-REPORT-OWNER.pdf in the order folder');
      else ok('render-pack.mjs keeps the owner copy in the order folder: not in out-preview/, preview.zip or REVIEW.html');
    }
  }
} finally {
  if (browser) await browser.close();
}
console.log(failed ? `\n${failed} problem(s).` : '\nAll audit report checks pass.');
process.exit(failed ? 1 : 0);
