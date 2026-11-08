#!/usr/bin/env node
// A stand-in for `claude -p` in scripts/run-order.mjs --dry-run (and scripts/test-run-order.mjs): it spends nothing.
// It copies the canned outputs for its role (fixtures/<PP_RUN_ROLE>/, e.g. maker-r1, blind-r1a) into the session's
// folder, records what it was given (arguments, the folder's files, the labels in view.md) and prints a result record
// like Claude Code's --output-format json (session_id, duration_ms, total_cost_usd, usage), stopping at its
// --max-budget-usd cap like the real one.
//   PP_FAKE_FIXTURES  the fixtures folder        PP_FAKE_CALLS  a .jsonl file to record each call in (optional)
//   PP_FAKE_COST_SCALE multiply every cost        PP_FAKE_FAIL_ROLE  this role exits 1 with no record
//   PP_FAKE_TOKENS    rewrites onboarding.json's token total (the cost-stop test)
// A fixture folder may hold _edit.mjs instead of (or beside) files: its default export runs with the session's folder
// (the auditor's edits to the briefs; PP_FAKE_AUDIT picks the variant).
import { readdirSync, readFileSync, writeFileSync, appendFileSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const role = process.env.PP_RUN_ROLE || 'unknown', fx = process.env.PP_FAKE_FIXTURES, cwd = process.cwd();
const a = process.argv.slice(2), val = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
const start = Date.now();
const files = readdirSync(cwd);
const view = existsSync(join(cwd, 'view.md')) ? [...readFileSync(join(cwd, 'view.md'), 'utf8').matchAll(/^\*\*(.+?)\*\*/gm)].map((m) => m[1]) : null;
if (process.env.PP_FAKE_FAIL_ROLE === role) { console.error('fake failure'); process.exit(1); }
await new Promise((r) => setTimeout(r, 400));   // long enough for the test to see parallel sessions overlap
const dir = fx && join(fx, role);
let result = { cost: 0.1, ms: 30000 };
if (dir && existsSync(dir)) {
  for (const f of readdirSync(dir)) if (!['_result.json', '_edit.mjs'].includes(f)) cpSync(join(dir, f), join(cwd, f), { recursive: true });
  if (existsSync(join(dir, '_edit.mjs'))) await (await import(pathToFileURL(join(dir, '_edit.mjs')).href)).default(cwd);
  if (existsSync(join(dir, '_result.json'))) result = { ...result, ...JSON.parse(readFileSync(join(dir, '_result.json'), 'utf8')) };
}
if (process.env.PP_FAKE_TOKENS && existsSync(join(cwd, 'onboarding.json'))) {
  const o = JSON.parse(readFileSync(join(cwd, 'onboarding.json'), 'utf8')); const t = Number(process.env.PP_FAKE_TOKENS);
  o.tokens = { ...o.tokens, asked: t, recomputed: t }; writeFileSync(join(cwd, 'onboarding.json'), JSON.stringify(o, null, 2));
}
const cap = Number(val('--max-budget-usd')) || Infinity;
let cost = result.cost * (Number(process.env.PP_FAKE_COST_SCALE) || 1), subtype = 'success';
if (cost > cap) { cost = cap; subtype = 'error_max_budget_usd'; }
const session_id = val('--resume') || randomUUID();
if (process.env.PP_FAKE_CALLS) appendFileSync(process.env.PP_FAKE_CALLS, JSON.stringify({ role, start, end: Date.now(), cwd, files, view,
  cap: val('--max-budget-usd'), model: val('--model'), resume: val('--resume'), mode: val('--permission-mode'), tools: val('--allowedTools'), session_id }) + '\n');
console.log(JSON.stringify({ type: 'result', subtype, is_error: subtype !== 'success', duration_ms: result.ms, total_cost_usd: cost, session_id, num_turns: 3,
  usage: { input_tokens: 10, output_tokens: 1000, cache_read_input_tokens: 50000, cache_creation_input_tokens: 5000 } }));
