#!/usr/bin/env node
// Pilot sign-up emails (owner, Nov 14, 2026: "a notification to mattick.family3 when I get a request", and "send them
// an email when we approve ALONG WITH steps on what they need to do"). Run by .github/workflows/teacher-email.yml on the
// 'teacher-signup' and 'teacher-approved' dispatches (supabase/runner/dispatch-teachers.sql).
//
//   node scripts/notify-teacher.mjs signup <teacher id>     emails the owner: a teacher is waiting for approval
//   node scripts/notify-teacher.mjs approved <teacher id>   emails the teacher: you're in, and what to do next
//   add --dry-run to print the email instead of sending it
//   node scripts/notify-teacher.mjs --self-test             checks both emails against a made-up teacher (no network)
//
// Reads the teacher (email, name, allowance) with the service key (PP_SUPABASE_URL, PP_SUPABASE_SERVICE_KEY) and sends
// through Gmail SMTP the same way as scripts/notify-order.mjs (PP_NOTIFY_FROM, PP_NOTIFY_TO, PP_NOTIFY_APP_PASSWORD).
// Nothing set up: it says so and exits 0. The welcome email goes only to the address she signed up with.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = JSON.parse(readFileSync(join(ROOT, 'brand.config.json'), 'utf8'));
const menu = JSON.parse(readFileSync(join(ROOT, 'menu.json'), 'utf8'));
const tok = (id) => (menu.items.find((i) => i.id === id) || {}).tokens;

const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
const ascii = (s) => oneLine(s).replace(/[^\x20-\x7e]/g, '');
const EMAIL = /^[^\s@<>()",;:\\]+@[^\s@<>()",;:\\]+\.[^\s@<>()",;:\\]+$/;

function message({ fromName, from, to, replyTo, subject, body }) {
  const headers = [
    `From: ${ascii(fromName).replace(/[<>"]/g, '')} <${from}>`,
    `To: <${to}>`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${ascii(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  return headers.join('\r\n') + '\r\n\r\n' + body.join('\r\n') + '\r\n';
}

// To the owner: someone signed up and is waiting.
export function signupEmail(t, { from, to }) {
  const who = oneLine(t.name) || oneLine(t.email) || 'A teacher';
  const subject = `Waiting for approval: ${who}`;
  return { subject, to, text: message({ fromName: `${brand.name} sign-ups`, from, to, subject, body: [
    `A teacher signed up for ${brand.name} and is waiting for your approval.`,
    '',
    `Name:      ${oneLine(t.name) || '(not given yet)'}`,
    `Email:     ${oneLine(t.email) || '?'}`,
    `Signed up: ${t.created_at ? new Date(t.created_at).toUTCString() : '?'}`,
    ...(t.confirmed === false ? ["Note:      they haven't confirmed their email yet."] : []),
    '',
    `Approve: sign in at ${brand.website}/ → My orders → "Teachers waiting for approval" → Approve.`,
    'They get a welcome email with the steps as soon as you approve them.',
    '',
    'Not someone you know? Leave them waiting: they can sign in but cannot send an order.',
  ] }) };
}

// To the teacher: approved, with the steps.
export function approvedEmail(t, { from, owner }) {
  const name = oneLine(t.name).split(/\s+/)[0];
  const tokens = Number(t.tokens) || 150;
  const subject = `You're in: welcome to the ${brand.name} pilot`;
  const site = `${brand.website}/`;
  return { subject, to: oneLine(t.email), text: message({ fromName: brand.name, from, to: oneLine(t.email), replyTo: owner, subject, body: [
    `Hi${name ? ' ' + name : ''},`,
    '',
    `Your ${brand.name} account is approved. You have ${tokens} tokens for the pilot, free. That's about ${Math.floor(tokens / tok('quiz'))} quizzes (${tok('quiz')} tokens each) or ${Math.floor(tokens / tok('worksheet'))} worksheets (${tok('worksheet')} each), or a mix.`,
    '',
    'What to do:',
    '',
    `1. Go to ${site} and sign in with this email address (${oneLine(t.email)}).`,
    '2. Your examples (optional but worth it): add a few things you have made before, like a quiz or worksheet. The agents learn your style from them. They are kept only for your own agents, and you can delete them anytime.',
    `3. Your sources: add the material to teach from: a chapter, your notes, slides or a list of standards. ${oneLine(brand.studentDataNotice)}`,
    '4. What you want: pick from the menu (a quiz, a worksheet, a lab, a review game and more). Each item shows its tokens.',
    '5. Requests: say anything specific (number of questions, versions, what to focus on). Blanks get sensible defaults.',
    `6. Review cost and send: the total shows before you press Send. An order can't go over the tokens you have left.`,
    '7. Answer our questions: the first agent may ask up to 3 quick questions in My orders. One tap each.',
    '8. Check the preview: a watermarked preview comes to My orders, usually in under an hour for a simple order, within 24 hours for a bigger one. Ask for changes, or press Approve.',
    '9. Download: after you approve, the final files (PDF, Word, teacher copies with keys) and the audit report of everything the agents checked are in My orders.',
    '',
    `Please check everything before it goes in front of students. ${oneLine(brand.trainingNotice)} ${oneLine(brand.deleteNotice)}`,
    '',
    'I would love to hear what worked and what did not: just reply to this email.',
    '',
    'Thank you for testing it,',
    brand.name,
  ] }) };
}

function selfTest() {
  const t = { id: 'x', email: 'ms.rivera@example.org', name: 'Ana Rivera\r\nBcc: evil@example.com', created_at: '2026-11-14T15:00:00Z', tokens: 150, confirmed: false };
  const s = signupEmail(t, { from: 'a@example.com', to: 'owner@example.com' });
  const a = approvedEmail(t, { from: 'a@example.com', owner: 'owner@example.com' });
  const a2 = approvedEmail({ email: 'x@example.org', name: '', tokens: 300 }, { from: 'a@example.com', owner: 'owner@example.com' });
  const cases = [
    ['sign-up: to the owner, names her', s.to === 'owner@example.com' && /\r\nSubject: Waiting for approval: Ana Rivera/.test(s.text) && s.text.includes('ms.rivera@example.org')],
    ['sign-up: how to approve, and the unconfirmed note', s.text.includes('Teachers waiting for approval') && s.text.includes("haven't confirmed")],
    ['no header injection from her name', !/\r\nBcc:/i.test(s.text) && !/\r\nBcc:/i.test(a.text)],
    ['approved: to her, reply goes to the owner', a.to === 'ms.rivera@example.org' && a.text.includes('Reply-To: <owner@example.com>')],
    ['approved: greets her by first name', a.text.includes('Hi Ana,')],
    ['approved: her tokens and what they buy, from menu.json', a.text.includes('150 tokens') && a.text.includes(`${tok('quiz')} tokens each`) && a2.text.includes('300 tokens')],
    ['approved: the steps, in the order page\'s words', ['sign in', 'Your examples', 'Your sources', 'What you want', 'Requests', 'Review cost and send', 'My orders', 'preview', 'Approve', 'audit report'].every((w) => a.text.includes(w))],
    ['approved: check before students, never used to train AI, the delete notice, no student data', a.text.includes('check everything before') && a.text.includes(oneLine(brand.deleteNotice)) && a.text.includes(oneLine(brand.trainingNotice)) && a.text.includes(oneLine(brand.studentDataNotice))],
    ['approved: no name, plain "Hi,"', a2.text.includes('Hi,\r\n')],
    ['links to the site', s.text.includes(brand.website) && a.text.includes(brand.website)],
  ];
  let bad = 0;
  for (const [name, pass] of cases) { console.log(`${pass ? '✓' : '✗'} ${name}`); if (!pass) bad++; }
  process.exit(bad ? 1 : 0);
}

async function readTeacher(id) {
  const url = (process.env.PP_SUPABASE_URL || '').replace(/\/+$/, ''), key = process.env.PP_SUPABASE_SERVICE_KEY || '';
  if (!url || !key) throw new Error('PP_SUPABASE_URL and PP_SUPABASE_SERVICE_KEY are not set');
  const headers = { apikey: key, ...(/^eyJ/.test(key) ? { Authorization: `Bearer ${key}` } : {}) };
  const get = async (path) => { const r = await fetch(url + path, { headers }); if (!r.ok) throw new Error(`${path.split('?')[0]}: HTTP ${r.status}`); return r.json(); };
  const [t] = await get(`/rest/v1/teachers?id=eq.${id}&select=id,email,name,created_at`);
  if (!t) throw new Error(`no teacher ${id}`);
  const [p] = await get(`/rest/v1/pilot_teachers?teacher=eq.${id}&select=tokens`);
  const [admin] = await get(`/rest/v1/admins?id=eq.${id}&select=id`);
  let confirmed;
  try { const u = await get(`/auth/v1/admin/users/${id}`); confirmed = !!u.email_confirmed_at; } catch { confirmed = undefined; }
  return { ...t, tokens: p ? p.tokens : null, approved: !!p, admin: !!admin, confirmed };
}

function send(mail, { from, pass }) {
  const dir = mkdtempSync(join(tmpdir(), 'pp-mail-'));
  try {
    writeFileSync(join(dir, 'netrc'), `machine smtp.gmail.com login ${from} password ${pass}\n`, { mode: 0o600 });
    writeFileSync(join(dir, 'mail.txt'), mail.text);
    const r = spawnSync('curl', ['-sS', '--ssl-reqd', '--url', 'smtps://smtp.gmail.com:465', '--netrc-file', join(dir, 'netrc'), '--mail-from', from, '--mail-rcpt', mail.to, '--upload-file', join(dir, 'mail.txt')], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`curl ${r.status}: ${r.stderr.trim()}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) selfTest();
else {
  const [kind, id] = args.filter((a) => !a.startsWith('--'));
  if (!['signup', 'approved'].includes(kind) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
    console.error('usage: notify-teacher.mjs signup|approved <teacher id> [--dry-run]'); process.exit(2);
  }
  const dry = args.includes('--dry-run');
  const { PP_NOTIFY_FROM: from, PP_NOTIFY_TO: owner, PP_NOTIFY_APP_PASSWORD: pass } = process.env;
  if (!dry && (!from || !owner || !pass)) { console.log('Teacher emails not set up (PP_NOTIFY_FROM, PP_NOTIFY_TO, PP_NOTIFY_APP_PASSWORD; docs/BACKEND.md). Nothing sent.'); process.exit(0); }
  try {
    const t = await readTeacher(id);
    if (t.admin) { console.log('That is an owner account: no email.'); process.exit(0); }
    if (kind === 'signup' && t.approved) { console.log('Already approved: no sign-up email.'); process.exit(0); }
    if (kind === 'approved' && !t.approved) { console.log('Not approved (no pilot_teachers row): no welcome email.'); process.exit(0); }
    if (kind === 'approved' && !EMAIL.test(oneLine(t.email))) throw new Error('her email address is missing or unusual; nothing sent');
    const mail = kind === 'signup' ? signupEmail(t, { from: from || 'sender@example.com', to: owner || 'owner@example.com' })
      : approvedEmail(t, { from: from || 'sender@example.com', owner: owner || 'owner@example.com' });
    if (dry) { console.log(mail.text); process.exit(0); }
    send(mail, { from, pass });
    console.log(kind === 'signup' ? `Emailed the owner: ${mail.subject}` : 'Emailed the teacher her welcome and steps.');
  } catch (e) { console.error(`Not sent: ${e.message}`); process.exit(1); }
}
