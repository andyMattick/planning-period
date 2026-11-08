#!/usr/bin/env node
// End-to-end test of scripts/run-order.mjs --dry-run against the fake Supabase of scripts/test-orders.mjs: canned role
// outputs (scripts/test-run-order/fixtures, made-up teacher and quiz), everything else real (orders.mjs, versions.mjs,
// Wilco's checks, SymPy, the renderer, the browser check). It spends nothing.
//   node scripts/test-run-order.mjs        (about a minute; part of npm run check)
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
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

async function newOrder(id) {
  const files = { [`${teacher}/${id}/sources/made-up-notes.txt`]: 'Two-way tables, conditional percents, correlation, least-squares lines, residuals (made-up notes).\n',
    [`${teacher}/${id}/training/made-up-past-quiz.html`]: '<html><body><h1>Past Quiz</h1><ol><li>Question one?</li></ol><script>alert(1)</script></body></html>' };
  for (const [p, body] of Object.entries(files)) await api('POST', `/storage/v1/object/uploads/${p}`, Buffer.from(body), { 'Content-Type': 'text/plain', 'x-upsert': 'true' });
  await api('POST', '/rest/v1/orders', { id, teacher, status: 'sent', token_total: 40, upload_files: Object.keys(files),
    order_json: { order: { teacher: 'Mr. Example (made-up)', grade: '12', subject: 'math', topic: 'Two-variable data', items: ['quiz'], requests: 'Same questions, different numbers',
      itemSpecs: { quiz: { format: 'interactive', grading: 'print', versions: 3 } }, sources: ['made-up-notes.txt'], styleExamples: ['made-up-past-quiz.html'] } } });
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

  /* 5. nothing to do for an order in another status; a bad id is refused */
  ok((await run(ID, [])).code === 0, 'auto on a preview_ready order does nothing');
  ok((await run('pp-bad', [])).code === 2, 'a bad id is refused');
} finally {
  fake.close?.(); fake.server?.close?.();
  if (process.env.PP_TEST_KEEP) console.log(`kept ${tmp}`); else rmSync(tmp, { recursive: true, force: true });
}
if (bad) { console.log(`run-order: ${bad} of ${n} checks failed`); process.exit(1); }
console.log(`run-order: all ${n} checks pass (dry run: onboarding, a build with a FIX round and a targeted recheck, the cost stop, a crash)`);
process.exit(0);
