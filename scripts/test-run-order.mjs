#!/usr/bin/env node
// End-to-end test of scripts/run-order.mjs --dry-run against the fake Supabase of scripts/test-orders.mjs: canned role
// outputs (scripts/test-run-order/fixtures, made-up teacher and quiz), everything else real (orders.mjs, versions.mjs,
// Wilco's checks, SymPy, the renderer, the browser check). It spends nothing.
//   node scripts/test-run-order.mjs        (about a minute; part of npm run check)
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync, readdirSync, cpSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { startFake, ANON, SERVICE } from './test-orders/fake-supabase.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'pp-run-order-'));
const fake = await startFake();
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log(`✗ ${m}`); } };
const T = 'Two-Variable Data Quiz';

async function api(method, path, body, headers = {}) {
  const r = await fetch(fake.url + path, { method, headers: { apikey: SERVICE, ...headers, ...(body && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (Buffer.isBuffer(body) ? body : JSON.stringify(body)) : undefined });
  const t = await r.text(); if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${t}`); return t ? JSON.parse(t) : null;
}
const state = () => api('GET', '/__test/state');
const orderOf = async (id) => (await state()).orders.find((o) => o.id === id);

// a made-up teacher, signed in the way the site does it
await fetch(`${fake.url}/auth/v1/otp?redirect_to=http://x/`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'teacher@example.test' }) });
const link = await (await fetch(`${fake.url}/__test/magic-link?email=teacher@example.test`)).json();
const teacher = link.user.id, token = /access_token=([^&]+)/.exec(link.link)[1];

async function newOrder(id, extra = {}) {
  const files = { [`${teacher}/${id}/sources/made-up-notes.txt`]: 'Two-way tables, conditional percents, correlation, least-squares lines, residuals (made-up notes).\n',
    [`${teacher}/${id}/training/made-up-past-quiz.html`]: '<html><body><h1>Past Quiz</h1><ol><li>Question one?</li></ol><script>alert(1)</script></body></html>' };
  for (const [p, body] of Object.entries(files)) await api('POST', `/storage/v1/object/uploads/${p}`, Buffer.from(body), { 'Content-Type': 'text/plain', 'x-upsert': 'true' });
  await api('POST', '/rest/v1/orders', { id, teacher, status: 'sent', token_total: 40, upload_files: Object.keys(files),
    order_json: { order: { teacher: 'Mr. Example (made-up)', grade: '12', subject: 'math', topic: 'Two-variable data', items: ['quiz'], requests: 'Same questions, different numbers',
      itemSpecs: { quiz: { format: 'interactive', grading: 'print', versions: 3 } }, sources: ['made-up-notes.txt'], styleExamples: ['made-up-past-quiz.html'], ...extra } } });
}
function run(id, args, extraEnv = {}) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [join(ROOT, 'scripts/run-order.mjs'), id, '--dry-run', ...args], {
      env: { ...process.env, PP_SUPABASE_URL: fake.url, PP_SUPABASE_SERVICE_KEY: SERVICE, PP_MODEL_STANDARD: 'standard-alias', PP_MODEL_FAST: 'fast-alias', ...extraEnv } });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => res({ code, out }));
  });
}
const callsOf = (f) => (existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
const overlap = (a, b) => a && b && a.start < b.end && b.start < a.end;

try {
  /* 1. onboarding on "sent": the onboarding and style sessions at the same time, the follow-up posted */
  const ID = 'pp-2026-11-08-test01', calls = join(tmp, 'calls1.jsonl'), work1 = join(tmp, 'w-onboard');
  await newOrder(ID);
  const r1 = await run(ID, ['--work', work1], { PP_FAKE_CALLS: calls });
  ok(r1.code === 0, `onboard exit ${r1.code}:\n${r1.out}`);
  let o = await orderOf(ID);
  ok(o.status === 'needs_answer', `after onboarding the order is ${o.status}`);
  ok(o.follow_up?.questions?.length === 1 && o.follow_up?.onboarding?.tokens?.recomputed === 40, 'the follow-up carries the questions and onboarding.json');
  ok((o.follow_up?.runLog || []).some((r) => /Onboarding/.test(r.who) && r.cost > 0), 'the follow-up carries the run log so far');
  ok((await state()).objects.includes(`deliverables/${teacher}/style/style.md`), 'the style notes are kept in her deliverables folder');
  let c = callsOf(calls);
  const ob = c.find((x) => x.role === 'onboarding-r1'), st = c.find((x) => x.role === 'style-r1');
  ok(overlap(ob, st), 'onboarding and style notes ran at the same time');
  ok(ob && ob.mode === 'dontAsk' && ob.cap === '1.00' && ob.model === 'standard-alias', `onboarding session args: ${JSON.stringify(ob)}`);
  ok(st && st.files.includes('training') && !st.files.includes('order.json'), 'the style session sees only her examples');
  ok(!existsSync(work1), 'the working folder is deleted after the run');
  ok(!/Two-way tables|Question one/.test(r1.out), 'the run\'s output shows none of her content');

  /* 2. her answer → build: maker, versions, parallel checks, a FIX round, a targeted recheck, the preview */
  await fetch(`${fake.url}/rest/v1/rpc/answer_follow_up`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_order: ID, p_answer: 'A', p_answers: { q1: 'A' } }) });
  ok((await orderOf(ID)).status === 'building', 'her answer moves the order to building');
  const calls2 = join(tmp, 'calls2.jsonl'), work2 = join(tmp, 'w-build');
  const r2 = await run(ID, ['--work', work2, '--keep'], { PP_FAKE_CALLS: calls2 });
  ok(r2.code === 0, `build exit ${r2.code}:\n${r2.out}`);
  o = await orderOf(ID);
  ok(o.status === 'preview_ready', `after the build the order is ${o.status}`);
  const objs = (await state()).objects;
  ok(['A', 'B', 'C'].every((v) => objs.some((k) => k.startsWith(`deliverables/${teacher}/${ID}/preview/`) && k.endsWith(`interactive-${v}.html`))), 'the preview has an interactive page for A, B and C');
  c = callsOf(calls2);
  const roles = c.map((x) => x.role);
  for (const want of ['maker-r1', 'blind-r1a', 'blind-r1b', 'solver-r1a', 'solver-r1b', 'solver-bc-r1a', 'solver-bc-r1b', 'maker-r2', 'blind-r2a', 'blind-r2b', 'solver-r2a', 'solver-r2b', 'reporter-r2'])
    ok(roles.includes(want), `no ${want} session (ran: ${roles.join(', ')})`);
  ok(!roles.includes('onboarding-r1') && !roles.includes('style-r1') && !roles.includes('solver-bc-r2a'), 'the build reran nothing it didn\'t need');
  const by = Object.fromEntries(c.map((x) => [x.role, x]));
  ok(overlap(by['blind-r1a'], by['solver-r1a']) && overlap(by['blind-r1a'], by['solver-bc-r1a']), 'round 1: blind tester and both solvers ran in parallel');
  ok(overlap(by['blind-r2a'], by['solver-r2a']), 'round 2: the rechecks ran in parallel');
  for (const k of ['blind-r1a', 'solver-r1a', 'solver-bc-r1a', 'blind-r2a', 'solver-r2a']) ok(by[k] && !by[k].files.includes('pack.json') && by[k].files.includes('view.md'), `${k}: phase a had a key in its folder or no view`);
  for (const k of ['blind-r1b', 'solver-r1b', 'blind-r2b']) ok(by[k]?.files.includes('pack.json') && by[k].resume === by[k.replace(/b$/, 'a')].session_id, `${k}: phase b isn't the same session with the key`);
  const v1 = by['blind-r1a'].view || [];
  ok(v1.length === 10 && v1.every((w) => / A q\d$/.test(w) || / [BC] q7$/.test(w)), `round 1 blind view: A of the script-made items, every version of q7 (got ${v1.join(', ')})`);
  ok((by['solver-bc-r1a'].view || []).length === 14 && by['solver-bc-r1a'].view.every((w) => / [BC] q\d$/.test(w) && !/q7$/.test(w)), 'the B/C solver got every script-made row of B and C');
  ok(JSON.stringify(by['blind-r2a'].view) === JSON.stringify([`${T} A q4`]), `the blind recheck saw only the changed A item (got ${by['blind-r2a'].view})`);
  ok(JSON.stringify((by['solver-r2a'].view || []).slice().sort()) === JSON.stringify([`${T} A q4`, `${T} B q4`, `${T} C q4`]), `the solver recheck saw the changed item in every version (got ${by['solver-r2a'].view})`);
  ok(by['maker-r1'].cap === '1.33' && by['maker-r2'].cap === '0.67', `maker caps: ${by['maker-r1'].cap}, ${by['maker-r2'].cap} (budget/3, budget/6 of $4.00)`);
  ok(by['reporter-r2'].model === 'fast-alias' && ['maker-r1', 'blind-r1a', 'solver-r1a'].every((k) => by[k].model === 'standard-alias'), 'the reporter on the faster setting, judgment roles on the standard one');
  ok(by['maker-r2'].files.includes('FIX.md') && !by['maker-r2'].files.includes('view.md'), 'the FIX maker gets the FIX list');
  const pack = JSON.parse(readFileSync(join(work2, 'pack.json'), 'utf8'));
  ok(pack.id === ID && JSON.stringify(pack.documents[0].versions) === '["A","B","C"]', 'pack id and versions');
  ok(pack.order?.itemSpecs?.quiz?.versions === 3 && pack.order.itemSpecs.quiz.format === 'interactive', 'her item settings (itemSpecs: versions, format, the all-versions key) reach the renderer from her order');
  const q4 = pack.documents[0].sections[0].questions[3];
  ok(/practiced longer/.test(q4.choices.B.join(' ')) && q4.choices.B.join() !== q4.choices.A.join(), 'B was remade from the fixed A');
  const fix = pack.checks.blind.flatMap((e) => e.findings).find((f) => f.kind === 'FIX');
  ok(fix && fix.fixed === true, 'the round 1 FIX is marked fixed by the recheck');
  ok(pack.checks.blind.map((e) => e.round).join() === '1,2' && pack.checks.solver.some((e) => e.check === 'math'), 'checks merged by round, SymPy recorded');
  ok((pack.checks.wilco || []).some((e) => e.check === 'versions'), 'versions.mjs recorded in checks.wilco');
  ok(pack.log.some((r) => /Onboarding/.test(r.who)) && pack.log.filter((r) => r.cost > 0).length >= 14 && pack.log.every((r) => typeof r.round === 'number'), 'the log has every session from both stages');
  ok(pack.audit.notes.some((x) => /agreed with all 10/.test(x)) && pack.audit.notes.some((x) => /^Totals:/.test(x)), 'audit notes: the reporter\'s story and the totals');
  ok(existsSync(join(work2, 'out-preview', 'AUDIT-REPORT.pdf')) && existsSync(join(work2, 'preview.zip')), 'the preview was rendered');

  /* 3. the cost stop: a budget the onboarding and style sessions already used up → handed to the owner */
  const ID3 = 'pp-2026-11-08-test03', calls3 = join(tmp, 'calls3.jsonl');
  await newOrder(ID3);
  ok((await run(ID3, ['--work', join(tmp, 'w3a')], { PP_FAKE_CALLS: calls3, PP_FAKE_TOKENS: '5', PP_FAKE_COST_SCALE: '4' })).code === 0, 'onboard (small budget)');
  await fetch(`${fake.url}/rest/v1/rpc/answer_follow_up`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_order: ID3, p_answer: 'go' }) });
  const r3 = await run(ID3, ['--work', join(tmp, 'w3b')], { PP_FAKE_CALLS: calls3 });
  ok(r3.code === 3 && /cost stop/.test(r3.out), `cost stop: exit ${r3.code}\n${r3.out}`);
  o = await orderOf(ID3);
  ok(o.status === 'building' && /quick look/.test(o.note || ''), `cost stop leaves the order building with a note (${o.status}, ${o.note})`);
  ok((await state()).objects.includes(`deliverables/${teacher}/${ID3}/work/HANDOFF.md`), 'the working files are kept for the owner');
  ok(!callsOf(calls3).some((x) => x.role === 'maker-r1'), 'no maker session after the cost stop');
  ok(!existsSync(join(tmp, 'w3b')), 'the working folder is deleted after a hand-off');

  /* 4. a session that crashes → failed, with a note she sees */
  const ID4 = 'pp-2026-11-08-test04';
  await newOrder(ID4);
  const r4 = await run(ID4, ['--work', join(tmp, 'w4')], { PP_FAKE_FAIL_ROLE: 'onboarding-r1' });
  o = await orderOf(ID4);
  ok(r4.code === 1 && o.status === 'failed' && /went wrong/.test(o.note || ''), `a crash: exit ${r4.code}, ${o.status}`);

  /* 5. the teacher skipped the blind check: no blind tester, every other check, and every page says so */
  const ID5 = 'pp-2026-11-08-test05', calls5 = join(tmp, 'calls5.jsonl'), work5 = join(tmp, 'w5');
  await newOrder(ID5, { checks: { blind: false } });
  ok((await run(ID5, ['--work', join(tmp, 'w5a')], { PP_FAKE_CALLS: calls5 })).code === 0, 'onboard (blind check off)');
  await fetch(`${fake.url}/rest/v1/rpc/answer_follow_up`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_order: ID5, p_answer: 'go' }) });
  const r5 = await run(ID5, ['--work', work5, '--keep'], { PP_FAKE_CALLS: calls5 });
  ok(r5.code === 0 && (await orderOf(ID5)).status === 'preview_ready', `blind off: exit ${r5.code}\n${r5.out}`);
  const roles5 = callsOf(calls5).map((x) => x.role);
  ok(!roles5.some((r) => r.startsWith('blind')) && ['solver-r1a', 'solver-bc-r1a', 'reporter-r1'].every((r) => roles5.includes(r)), `blind off: no blind tester, the solvers and reporter ran (${roles5.join(', ')})`);
  const p5 = JSON.parse(readFileSync(join(work5, 'pack.json'), 'utf8'));
  ok(p5.order.checks?.blind === false && p5.log.some((r) => /Blind check skipped at the teacher's request/.test(r.what)) && !(p5.checks.blind || []).length, 'blind off: recorded in the pack and the log, no blind entries');
  const line = 'Blind check skipped at your request — please work through the test yourself before students see it.';
  ok(readFileSync(join(work5, 'out-preview', 'REVIEW.html'), 'utf8').includes(line), 'blind off: REVIEW.html says so');
  ok((await orderOf(ID5)).review?.blindSkipped === true, 'blind off: My orders\' review is told');
  { // the audit report's first page and each teacher copy (skipped where pdftotext isn't installed)
    const pdfs = readdirSync(join(work5, 'out-preview')).filter((f) => f.endsWith('.pdf'));
    const txt = (f) => spawnSync('pdftotext', ['-l', '1', join(work5, 'out-preview', f), '-'], { encoding: 'utf8' });
    if (txt(pdfs[0]).status === 0) {
      const flat = (f) => txt(f).stdout.replace(/\s+/g, ' ');
      ok(flat('AUDIT-REPORT.pdf').includes(line.replace(/\s+/g, ' ')), 'blind off: the audit report\'s first page says so');
      const tc = pdfs.filter((f) => /teacher/.test(f));
      ok(tc.length === 3 && tc.every((f) => flat(f).includes('Blind check skipped at your request')), 'blind off: every teacher copy says so');
    }
  }

  /* 5b. bigger orders (owner, Nov 8, 2026: "leave the runner for what we see as simple … within 24 hours for bigger"):
     onboarding runs as usual; the build hands off before any session, with the 24-hour note for her, the reason for
     the owner's email (PP_HANDOFF_FILE), and notify-order.mjs --handoff --dry-run prints a "Needs you" email */
  const node = (args, env = {}) => new Promise((res) => {   // async: the fake Supabase runs in this process
    const p = spawn(process.execPath, args, { env: { ...process.env, PP_SUPABASE_URL: fake.url, PP_SUPABASE_SERVICE_KEY: SERVICE, ...env } });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => res({ code, out }));
  });
  const bigger = [
    ['pp-2026-11-08-big001', 'one per student', { itemSpecs: { quiz: { format: 'interactive', grading: 'print', versions: 'student', students: 30 } } }, /One version per student/],
    ['pp-2026-11-08-big002', 'a reading quiz', { subject: 'ela', items: ['readingquiz'], itemSpecs: { readingquiz: { versions: 2 } } }, /English \/ reading/],
    ['pp-2026-11-08-big003', 'more than 3 items', { items: ['quiz', 'worksheet', 'homework', 'studyguide'] }, /More than 3 items/],
  ];
  for (const [bid, what, extra, why] of bigger) {
    await newOrder(bid, extra);
    const cb = join(tmp, `calls-${bid}.jsonl`), hf = join(tmp, `handoff-${bid}.txt`);
    if (bid.endsWith('1')) {   // onboarding still runs for a bigger order: she gets her questions
      ok((await run(bid, ['--work', join(tmp, `w-${bid}a`)], { PP_FAKE_CALLS: cb })).code === 0 && (await orderOf(bid)).status === 'needs_answer', `${what}: onboarding ran and posted the follow-up`);
      await fetch(`${fake.url}/rest/v1/rpc/answer_follow_up`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_order: bid, p_answer: 'go' }) });
    } else await api('PATCH', `/rest/v1/orders?id=eq.${bid}`, { status: 'building' });
    const rb = await run(bid, ['--work', join(tmp, `w-${bid}b`)], { PP_FAKE_CALLS: cb, PP_HANDOFF_FILE: hf });
    o = await orderOf(bid);
    ok(rb.code === 3 && /bigger than the automatic path/.test(rb.out), `${what}: handed off (exit ${rb.code})\n${rb.out}`);
    ok(o.status === 'building' && o.note === 'This order is bigger than our automatic path, so a person on our team runs it with the agent team. Your preview will be ready within 24 hours of your answer.', `${what}: her note promises 24 hours (${o.status}, ${o.note})`);
    ok(!callsOf(cb).some((x) => /^(maker|blind|solver|facts|reporter)/.test(x.role)), `${what}: nothing was built or spent before the hand-off`);
    const reason = existsSync(hf) ? readFileSync(hf, 'utf8') : '';
    ok(/^build: bigger than the automatic path/.test(reason) && why.test(reason), `${what}: the reason for the owner (${reason.trim()})`);
    ok((await state()).objects.includes(`deliverables/${teacher}/${bid}/work/HANDOFF.md`), `${what}: HANDOFF.md kept for the owner`);
    const mail = await node([join(ROOT, 'scripts/notify-order.mjs'), bid, '--handoff', reason.trim(), '--dry-run']);
    ok(mail.code === 0 && /Subject: Needs you: pp-2026-11-08-big00\d/.test(mail.out) && why.test(mail.out) && !/Same questions, different numbers|made-up notes|Two-way tables/.test(mail.out), `${what}: the owner's "Needs you" email (dry run), with no requests text:\n${mail.out}`);
  }
  { // not set up: the hand-off email does nothing, quietly
    const q = await node([join(ROOT, 'scripts/notify-order.mjs'), 'pp-2026-11-08-big001', '--handoff', 'x'], { PP_NOTIFY_FROM: '', PP_NOTIFY_TO: '', PP_NOTIFY_APP_PASSWORD: '' });
    ok(q.code === 0 && /not set up.*Nothing sent/.test(q.out), `the hand-off email without PP_NOTIFY_* sends nothing and exits 0 (${q.code}: ${q.out})`);
  }

  /* 7. her approval → the final: rendered against her approval, posted (final_ready), uploads, preview and working files
     deleted, finals and style notes kept, the owner copy never uploaded; then the auditor edits a brief and the gate
     puts it on main (a made-up copy of the repository with its own bare origin; the gate's npm run check is stubbed here,
     scripts/auditor-gate.mjs --self-test and npm run check itself cover it) */
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const download = async (k) => Buffer.from(await (await fetch(`${fake.url}/storage/v1/object/${k}`, { headers: { apikey: SERVICE } })).arrayBuffer());
  async function approve(id) {   // what My orders does: download every preview file she was shown, hash it, approve_order
    const ord = await orderOf(id);
    const documents = [];
    for (const d of ord.review.documents) documents.push({ file: d.file, title: d.title, sha256: sha(await download(`deliverables/${teacher}/${id}/preview/${d.file}`)) });
    const r = await fetch(`${fake.url}/rest/v1/rpc/approve_order`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_order: id, p_approval: { orderId: id, name: 'Mr. Example (made-up)', date: new Date().toISOString(), statement: ord.review.statement, packHash: ord.review.packHash, documents, judgments: [] } }) });
    return r.ok;
  }
  // a made-up copy of the repository (its working tree as it is now) with a bare origin to push to
  const repo = join(tmp, 'repo'), origin = join(tmp, 'origin.git');
  cpSync(ROOT, repo, { recursive: true, filter: (p) => !/(^|\/)(\.git|node_modules)(\/|$)/.test(p.slice(ROOT.length)) });
  symlinkSync(join(ROOT, 'node_modules'), join(repo, 'node_modules'), 'dir');
  const git = (cwd, ...a) => spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });
  git(tmp, 'init', '-q', '--bare', '-b', 'main', origin);
  git(repo, 'init', '-q', '-b', 'main'); writeFileSync(join(repo, '.git/info/exclude'), 'node_modules\n');
  git(repo, 'add', '-A'); git(repo, '-c', 'user.name=t', '-c', 'user.email=t@example.test', 'commit', '-q', '-m', 'start');
  git(repo, 'remote', 'add', 'origin', origin); git(repo, 'push', '-q', 'origin', 'main');
  const onMain = (f) => { const r = git(origin, 'show', `main:${f}`); return r.status === 0 ? r.stdout : null; };
  const GATE = { PP_GATE_CHECK: `node -e "console.log('All checks pass.')"`, GIT_AUTHOR_NAME: 'order runner', GIT_AUTHOR_EMAIL: 'runner@example.test' };
  const makerV = Number(/\*\*Version (\d+)\*\*/.exec(readFileSync(join(ROOT, 'agents/maker.md'), 'utf8'))[1]);

  ok(await approve(ID) && (await orderOf(ID)).status === 'approved', 'she approves the preview in My orders (approve_order)');
  const calls7 = join(tmp, 'calls7.jsonl'), work7 = join(tmp, 'w-final');
  const r7 = await run(ID, ['--work', work7, '--audit', '--audit-repo', repo, '--audit-push'], { PP_FAKE_CALLS: calls7, ...GATE });
  ok(r7.code === 0, `final exit ${r7.code}:\n${r7.out}`);
  o = await orderOf(ID);
  let objs7 = (await state()).objects;
  const mine = (part) => objs7.filter((k) => k.startsWith(`deliverables/${teacher}/${ID}/${part}/`));
  ok(o.status === 'final_ready' && (o.final_files || []).includes('final/out.zip') && mine('final').length >= 5, `final posted: ${o.status}, ${(o.final_files || []).length} files`);
  ok(['A', 'B', 'C'].every((v) => mine('final').some((k) => k.endsWith(`interactive-${v}.html`))) && mine('final').some((k) => /README\.txt$/.test(k)), 'the final has every version\'s page and the README');
  ok(!objs7.some((k) => /OWNER/i.test(k)) && !(o.final_files || []).some((f) => /OWNER/i.test(f)), 'the owner copy of the audit report was never uploaded');
  ok(!(await download(`deliverables/${teacher}/${ID}/final/out.zip`)).includes('AUDIT-REPORT-OWNER'), 'the final zip has no owner copy');
  ok(!objs7.some((k) => k.startsWith(`uploads/${teacher}/${ID}/`)) && !mine('preview').length && !mine('work').length && o.uploads_purged_at, 'her uploads, the preview files and the working files are deleted');
  ok(objs7.includes(`deliverables/${teacher}/style/style.md`), 'her style notes are kept (hers, deletable anytime)');
  ok(!existsSync(work7), 'the working folder (with the owner copy) is deleted');
  const c7 = callsOf(calls7);
  ok(c7.length === 1 && c7[0].role === 'auditor-r1' && c7[0].cap === '1.00' && !c7[0].files.includes('.git'), `one fresh auditor session, capped, with no .git (${c7.map((x) => x.role)})`);
  const maker7 = onMain('agents/maker.md') || '';
  ok(maker7.includes(`**Version ${makerV + 1}**`) && maker7.includes('(dry-run auditor)'), 'the auditor\'s brief change passed the gate and is on main');
  ok((onMain('docs/audits/BRIEF-CHANGES.md') || '').includes(`agents/maker.md v${makerV} → v${makerV + 1}`) && /auditor changed: agents\/maker\.md v\d+ .*to undo: git revert [0-9a-f]{40}/.test(r7.out), 'listed in docs/audits/BRIEF-CHANGES.md, and the run says how to undo it');
  const rec = JSON.parse(onMain(`records/${ID}.json`) || '{}');
  ok(rec.checks && rec.log?.some((r) => /final files/.test(r.what)) && !rec.documents && !rec.style && !JSON.stringify(rec).includes('Mr. Example') && !JSON.stringify(rec).includes('Same questions, different numbers'), 'the record on main: checks and log, no documents, style, name or requests');
  ok((onMain('docs/audits/README.md') || '').includes(ID) && git(origin, 'log', '-1', '--format=%s', 'main').stdout.startsWith(`Auditor (${ID})`), 'the report is listed and the commit names the order');

  /* 8. another order: the auditor also edits checks/ → the gate refuses the whole change; the order is delivered anyway */
  ok(await approve(ID5), 'approve the second order');
  const r8 = await run(ID5, ['--work', join(tmp, 'w8'), '--audit', '--audit-repo', repo, '--audit-push'], { ...GATE, PP_FAKE_AUDIT: 'checks' });
  ok(r8.code === 0 && (await orderOf(ID5)).status === 'final_ready', `delivered although the audit was refused: exit ${r8.code}\n${r8.out}`);
  ok(/refused/.test(r8.out) && !(onMain('checks/test-wise.mjs') || '').includes('loosened') && (onMain('agents/maker.md') || '').includes(`**Version ${makerV + 1}**`), 'the gate refused it: checks/ and the brief on main are unchanged');
  ok(/REFUSED .*checks\/test-wise\.mjs/.test(onMain('docs/audits/BRIEF-CHANGES.md') || '') && (onMain(`docs/audits/refused/${new Date().toISOString().slice(0, 10)}-${ID5}.patch`) || '').includes('loosened'), 'listed for the owner with the patch');

  /* 9. a preview file changed after she approved → failed with a note, nothing posted */
  const ID6 = 'pp-2026-11-08-test06';
  await newOrder(ID6, { checks: { blind: false } });
  ok((await run(ID6, ['--work', join(tmp, 'w6a')])).code === 0, 'onboard (third order)');
  await fetch(`${fake.url}/rest/v1/rpc/answer_follow_up`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_order: ID6, p_answer: 'go' }) });
  ok((await run(ID6, ['--work', join(tmp, 'w6b')])).code === 0 && (await orderOf(ID6)).status === 'preview_ready', 'build (third order)');
  ok(await approve(ID6), 'approve the third order');
  const victim = (await orderOf(ID6)).review.documents[0].file;
  await api('POST', `/storage/v1/object/deliverables/${teacher}/${ID6}/preview/${victim}`, Buffer.concat([await download(`deliverables/${teacher}/${ID6}/preview/${victim}`), Buffer.from('\n')]), { 'Content-Type': 'application/pdf', 'x-upsert': 'true' });
  const calls9 = join(tmp, 'calls9.jsonl');
  const r9 = await run(ID6, ['--work', join(tmp, 'w9'), '--audit', '--audit-repo', repo], { PP_FAKE_CALLS: calls9, ...GATE });
  o = await orderOf(ID6);
  ok(r9.code === 1 && o.status === 'failed' && /no longer matches the one you approved/.test(o.note || '') && /changed after/.test(r9.out), `a changed preview file: exit ${r9.code}, ${o.status}, ${o.note}`);
  ok(!(await state()).objects.some((k) => k.startsWith(`deliverables/${teacher}/${ID6}/final/`)) && !(o.final_files || []).length && !callsOf(calls9).length, 'nothing was posted and no auditor ran');

  /* 10. the daily purge: a failed order a week old loses its uploads, preview and working files */
  await fetch(`${fake.url}/__test/age?id=${ID6}`);
  const pr = await new Promise((res) => {   // async: the fake Supabase runs in this process
    const p = spawn(process.execPath, [join(ROOT, 'scripts/orders.mjs'), 'purge', '--due', '7'], { env: { ...process.env, PP_SUPABASE_URL: fake.url, PP_SUPABASE_SERVICE_KEY: SERVICE } });
    let stdout = '', stderr = ''; p.stdout.on('data', (d) => { stdout += d; }); p.stderr.on('data', (d) => { stderr += d; });
    p.on('close', (status) => res({ status, stdout, stderr }));
  });
  const left = (await state()).objects.filter((k) => k.includes(`/${ID6}/`));
  ok(pr.status === 0 && !left.length && (await orderOf(ID6)).uploads_purged_at, `purge --due deleted the failed order's files (${pr.stdout}${pr.stderr}; left ${left})`);
  ok((await state()).objects.includes(`deliverables/${teacher}/style/style.md`), 'her style notes survive the daily purge');

  /* 6. nothing to do for an order in another status; a bad id is refused */
  ok((await run(ID, [])).code === 0, 'auto on a preview_ready order does nothing');
  ok((await run('pp-bad', [])).code === 2, 'a bad id is refused');
} finally {
  fake.close?.(); fake.server?.close?.();
  if (process.env.PP_TEST_KEEP) console.log(`kept ${tmp}`); else rmSync(tmp, { recursive: true, force: true });
}
if (bad) { console.log(`run-order: ${bad} of ${n} checks failed`); process.exit(1); }
console.log(`run-order: all ${n} checks pass (dry run: onboarding, a build with a FIX round and a targeted recheck, the cost stop, a crash, bigger orders handed off with the 24-hour note and the owner's email, the final after her approval with the auditor through the gate, a refused audit, a changed preview file refused, the daily purge)`);
process.exit(0);
