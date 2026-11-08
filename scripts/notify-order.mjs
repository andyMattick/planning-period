#!/usr/bin/env node
// Emails the owner when a teacher sends an order (owner, Nov 8, 2026: "an email to mattick.family3 when someone places
// an order"). Run by .github/workflows/order-email.yml on the 'order-sent' dispatch (supabase/runner/dispatch.sql).
//
//   node scripts/notify-order.mjs <order id>            reads the order (orders.mjs show) and sends the email
//   node scripts/notify-order.mjs <order id> --dry-run  prints the email instead of sending it
//   node scripts/notify-order.mjs <order id> --handoff "<reason>" [--dry-run]
//                                                       "Needs you": the runner handed the order to the owner (a bigger
//                                                       order, the cost stop, an open FIX…); run-order.yml sends it when
//                                                       scripts/run-order.mjs exits 3, with the reason it wrote
//   node scripts/notify-order.mjs --self-test           checks the email text against a made-up order (no network)
//
// The email says what was ordered (grade, subject, topic, items, tokens) and links to the site. It never carries her
// uploads, her requests text or her style examples (CLAUDE.md rule 1). Sending: Gmail SMTP through curl, with the
// sender's app password from the environment (PP_NOTIFY_FROM, PP_NOTIFY_TO, PP_NOTIFY_APP_PASSWORD), written only to a
// private netrc file that is deleted right after. Nothing set up: it says so and exits 0.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = JSON.parse(readFileSync(join(ROOT, 'brand.config.json'), 'utf8'));
const menu = JSON.parse(readFileSync(join(ROOT, 'menu.json'), 'utf8'));

function itemName(id) {
  const all = [];
  (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.id && (o.name || o.label || o.title)) all.push(o); Object.values(o).forEach(walk); } })(menu);
  const m = all.find((x) => x.id === id);
  return m ? (m.name || m.label || m.title) : id;
}

const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();

export function emailFor(row, { from, to, handoff = null } = {}) {
  const oj = row.order_json || {};
  const o = oj.order || oj; // the site saves {id, lines, order, replyTo, …}; older rows hold the order itself
  const subject = oneLine(o.subjectOther || o.subject || '');
  const lines = Array.isArray(oj.lines) ? oj.lines.map((l) => `  - ${oneLine(l.label || itemName(l.id))}${l.quantity > 1 ? ` ×${l.quantity}` : ''}${l.format ? ` (${oneLine(l.format)})` : ''}`) : [];
  const items = lines.length ? lines : (o.items || []).map((id) => {
    const n = o.quantities?.[id];
    const spec = o.itemSpecs?.[id] || {};
    const bits = [spec.format, spec.versions ? `${spec.versions} version${spec.versions === 1 ? '' : 's'}` : '', spec.questions ? `${spec.questions} questions` : ''].filter(Boolean);
    return `  - ${itemName(id)}${n > 1 ? ` ×${n}` : ''}${bits.length ? ` (${bits.join(', ')})` : ''}`;
  });
  const title = handoff != null
    ? `Needs you: ${row.id}, grade ${oneLine(o.grade) || '?'} ${subject}`.trim()
    : `New order: ${oneLine(o.teacher) || 'a teacher'}, grade ${oneLine(o.grade) || '?'} ${subject}`.trim();
  const body = [
    ...(handoff != null ? [
      `The order runner handed this order to you. She has a note in My orders that it will be ready within 24 hours.`,
      '',
      `Why:     ${oneLine(handoff).slice(0, 500) || '(no reason given)'}`,
      `Next:    node scripts/orders.mjs work-get ${row.id}, then docs/RUNBOOK.md`,
    ] : [`${oneLine(o.teacher) || 'A teacher'} sent an order on ${brand.name}.`]),
    '',
    `Order:   ${row.id}`,
    ...(oj.replyTo ? [`Teacher: ${oneLine(o.teacher) || '?'} <${oneLine(oj.replyTo)}>`] : []),
    `Grade:   ${oneLine(o.grade) || '?'}`,
    `Subject: ${subject || '?'}`,
    `Topic:   ${oneLine(o.topic) || '?'}`,
    `Tokens:  ${row.token_total ?? '?'}`,
    `Files:   ${(row.upload_files || []).length} uploaded`,
    'Items:',
    ...(items.length ? items : ['  (none listed)']),
    '',
    `Open My orders: ${brand.website}/`,
    '',
    'This email lists only what was ordered. Her files and requests stay in the app.',
  ].join('\r\n');
  const headers = [
    `From: ${brand.name} ${handoff != null ? 'runner' : 'orders'} <${from}>`,
    `To: <${to}>`,
    `Subject: ${title.replace(/[^\x20-\x7e]/g, '')}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  return { subject: title, text: headers.join('\r\n') + '\r\n\r\n' + body + '\r\n' };
}

function selfTest() {
  const row2 = { id: 'pp-2026-01-03-abcdef', token_total: 70, order_json: { replyTo: 't@example.org', lines: [{ id: 'test', label: 'Unit test', format: 'interactive', quantity: 1 }], order: { teacher: 'Mr. Lee', grade: '12', subject: 'other', subjectOther: 'Statistics', topic: 'Two-variable data', requests: 'SECRET 2', itemRequests: { test: 'SECRET 3' } } } };
  const t2 = emailFor(row2, { from: 'a@example.com', to: 'b@example.com' }).text;
  const row = { id: 'pp-2026-01-02-abcdef', token_total: 42, upload_files: [{}, {}], order_json: { teacher: 'Ms. Rivera\r\nBcc: x@y', grade: '7', subject: 'math', topic: 'Ratios', items: ['test'], quantities: { test: 1 }, itemSpecs: { test: { format: 'interactive', versions: 3, questions: 16 } }, requests: 'SECRET REQUEST TEXT' } };
  const { text, subject } = emailFor(row, { from: 'a@example.com', to: 'b@example.com' });
  const cases = [
    ['subject names the teacher and grade', subject.startsWith('New order: Ms. Rivera')],
    ['no header injection from the teacher name', !/\r\nBcc:/i.test(text)],
    ['order id, tokens and file count', text.includes('pp-2026-01-02-abcdef') && text.includes('Tokens:  42') && text.includes('2 uploaded')],
    ['item with its format and versions', /interactive, 3 versions, 16 questions/.test(text)],
    ['her requests text is not in the email', !text.includes('SECRET REQUEST TEXT')],
    ['links to the site', text.includes(brand.website)],
    ['saved-order shape: teacher, email, subject, item label', t2.includes('Mr. Lee <t@example.org>') && t2.includes('Subject: Statistics') && t2.includes('- Unit test (interactive)')],
    ['saved-order shape: no requests text', !t2.includes('SECRET')],
  ];
  const h = emailFor(row2, { from: 'a@example.com', to: 'b@example.com', handoff: 'build: bigger than the automatic path (One version per student)\r\nBcc: x@y' });
  cases.push(
    ['hand-off: subject says "Needs you" with the order id', h.subject.startsWith('Needs you: pp-2026-01-03-abcdef') && /\r\nSubject: Needs you: pp-2026-01-03-abcdef/.test(h.text)],
    ['hand-off: the reason, the 24-hour promise and the next step', h.text.includes('Why:     build: bigger than the automatic path (One version per student)') && /within 24 hours/.test(h.text) && h.text.includes('work-get pp-2026-01-03-abcdef')],
    ['hand-off: no header injection from the reason', !/\r\nBcc:/i.test(h.text)],
    ['hand-off: what was ordered, without her requests text', h.text.includes('- Unit test (interactive)') && !h.text.includes('SECRET')],
  );
  let bad = 0;
  for (const [name, pass] of cases) { console.log(`${pass ? '✓' : '✗'} ${name}`); if (!pass) bad++; }
  process.exit(bad ? 1 : 0);
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) selfTest();
else {
  const hi = args.indexOf('--handoff');
  const handoff = hi >= 0 ? String(args[hi + 1] ?? '') : null;
  const id = args.find((a, i) => !a.startsWith('--') && !(hi >= 0 && i === hi + 1));
  if (!id || !/^pp-\d{4}-\d{2}-\d{2}-[a-z0-9]+$/.test(id)) { console.error('usage: notify-order.mjs <order id> [--handoff "<reason>"] [--dry-run]'); process.exit(2); }
  const dry = args.includes('--dry-run');
  const { PP_NOTIFY_FROM: from, PP_NOTIFY_TO: to, PP_NOTIFY_APP_PASSWORD: pass } = process.env;
  if (!dry && (!from || !to || !pass)) { console.log('Order email not set up (PP_NOTIFY_FROM, PP_NOTIFY_TO, PP_NOTIFY_APP_PASSWORD; docs/BACKEND.md). Nothing sent.'); process.exit(0); }
  const show = spawnSync(process.execPath, [join(ROOT, 'scripts', 'orders.mjs'), 'show', id], { encoding: 'utf8' });
  if (show.status !== 0) { console.error(`Could not read order ${id}:\n${show.stderr}`); process.exit(1); }
  const row = JSON.parse(show.stdout.slice(show.stdout.indexOf('{')));
  const mail = emailFor(row, { from: from || 'sender@example.com', to: to || 'owner@example.com', handoff });
  if (dry) { console.log(mail.text); process.exit(0); }
  const dir = mkdtempSync(join(tmpdir(), 'pp-mail-'));
  try {
    writeFileSync(join(dir, 'netrc'), `machine smtp.gmail.com login ${from} password ${pass}\n`, { mode: 0o600 });
    writeFileSync(join(dir, 'mail.txt'), mail.text);
    const r = spawnSync('curl', ['-sS', '--ssl-reqd', '--url', 'smtps://smtp.gmail.com:465', '--netrc-file', join(dir, 'netrc'), '--mail-from', from, '--mail-rcpt', to, '--upload-file', join(dir, 'mail.txt')], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(`The email was not sent (curl ${r.status}): ${r.stderr.trim()}`); process.exit(1); }
    console.log(`Emailed the owner about ${id}: ${mail.subject}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
