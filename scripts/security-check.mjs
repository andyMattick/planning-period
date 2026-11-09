#!/usr/bin/env node
/* 🛡️ Dominyk's security self-test (docs/security/README.md): static checks that each fixed weakness stays fixed. Part
   of npm run check (section 16). Each check names the finding in docs/security/ it guards.
     node scripts/security-check.mjs            exit 1 on any problem
     node scripts/security-check.mjs --self-test also shows that every check bites on a broken copy */
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/* Each check: (files) → list of problems. `files` maps a repository path to its text, so the self-test can feed broken copies. */
export const CHECKS = [
  ['workflows: no ${{ }} inside a run: script (an order id or payload would be pasted into the shell)', (f) => {
    const out = [];
    for (const [p, t] of Object.entries(f)) {
      if (!p.startsWith('.github/workflows/')) continue;
      const lines = t.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const m = /^(\s*)(- )?run:\s*(.*)$/.exec(lines[i]);
        if (!m || !m[3].trim()) continue;   // a job named run:, not a step
        const ind = m[1].length + (m[2] ? 2 : 0);
        if (m[3] && !/^[|>]/.test(m[3])) { if (m[3].includes('${{')) out.push(`${p}:${i + 1}`); continue; }
        for (let j = i + 1; j < lines.length && (!lines[j].trim() || lines[j].search(/\S/) > ind); j++) if (lines[j].includes('${{')) out.push(`${p}:${j + 1}`);
      }
    }
    return out;
  }],
  ['run-order.yml: agent sessions run as the agent user (finding 1)', (f) => {
    const t = f['.github/workflows/run-order.yml'] || '';
    return [!/useradd[^\n]*ppagent/.test(t) && 'no agent user is made', !/PP_AGENT_USER=ppagent/.test(t) && 'PP_AGENT_USER is not set',
      !/can use sudo: stopping/.test(t) && 'no check that the agent user has no sudo'].filter(Boolean);
  }],
  ['run-order.mjs: sessions get sessionEnv (no keys) and run through sudo -u when PP_AGENT_USER is set (finding 1)', (f) => {
    const t = f['scripts/run-order.mjs'] || '';
    return [!/const env = sessionEnv\(/.test(t) && 'sessions are not given sessionEnv', !/'-u', AGENT_USER/.test(t) && 'sessions do not run as the agent user',
      !/function takeDir/.test(t) && 'session folders are not taken back from the agent user', /env: \{ \.\.\.childEnv, PP_RUN_ROLE/.test(t) && 'a session gets the full environment'].filter(Boolean);
  }],
  ['supabase: every function is revoked from authenticated or granted to it on purpose; security definer sets search_path (finding 3)', (f) => {
    const sql = Object.entries(f).filter(([p]) => /^supabase\/.*\.sql$/.test(p)).sort(([a], [b]) => a.localeCompare(b)).map(([, t]) => t).join('\n').replace(/--[^\n]*/g, '');
    const out = [];
    for (const m of sql.matchAll(/create or replace function public\.(\w+)\s*\(([^)]*)\)[\s\S]*?\$\$/gi)) {
      const name = m[1], head = m[0];
      if (/security definer/i.test(head) && !/set search_path/i.test(head)) out.push(`${name}: security definer without set search_path`);
      const revoked = new RegExp(`revoke all on function[^;]*\\b${name}\\b[^;]*from[^;]*\\bauthenticated\\b`, 'i').test(sql);
      const granted = new RegExp(`grant execute on function[^;]*\\b${name}\\b[^;]*to authenticated`, 'i').test(sql);
      if (!revoked && !granted) out.push(`${name}: never revoked from authenticated (Supabase grants every new function to it by default)`);
    }
    if (!/revoke all on public\.teachers[^;]*from anon, authenticated/i.test(sql)) out.push('the default table grants are not taken back from authenticated');
    if (!/create trigger orders_check_new before insert on public\.orders/i.test(sql)) out.push('no orders_check_new trigger (her own folder, order limits)');
    return out;
  }],
];

/* Finding 2: checks/math_check.py reads pack text with SymPy's parse_expr, which runs eval. Each payload must be refused
   (and must leave no file behind); the self-test shows the same payload does run through plain parse_expr. */
const PAYLOADS = ["__import__('os').mkdir(MARK)", "().__class__.__base__.__subclasses__()", "(lambda: __import__('os').mkdir(MARK))()"];
export function mathEvalCheck({ plain = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pp-sec-')), mark = join(dir, 'ran');
  const py = `import sys, json; sys.path.insert(0, ${JSON.stringify(join(ROOT, 'checks'))})
import math_check as m
from sympy.parsing.sympy_parser import parse_expr
out = []
for p in json.loads(sys.argv[1]):
    p = p.replace('MARK', repr(sys.argv[2]))
    try:
        (parse_expr(p) if ${plain ? 'True' : 'False'} else m.expr_of(p)); out.append('read')
    except m.Unread: out.append('refused')
    except Exception as e: out.append('error ' + type(e).__name__)
print(json.dumps(out))`;
  const r = spawnSync('python3', ['-I', '-c', py, JSON.stringify(PAYLOADS), mark], { encoding: 'utf8', timeout: 60000 });
  const ran = existsSync(mark);
  rmSync(dir, { recursive: true, force: true });
  if (r.status !== 0) return { ran, problems: [`python3 failed: ${(r.stderr || '').trim().split('\n').pop()}`] };
  const res = JSON.parse(r.stdout.trim().split('\n').pop());
  return { ran, problems: [...(ran ? ['a payload ran (it made a file)'] : []), ...PAYLOADS.filter((_, i) => res[i] !== 'refused').map((p, i) => `not refused: ${p}`)] };
}

export function files() {
  const f = {};
  for (const w of readdirSync(join(ROOT, '.github/workflows'))) f[`.github/workflows/${w}`] = read(`.github/workflows/${w}`);
  for (const p of ['scripts/run-order.mjs']) if (existsSync(join(ROOT, p))) f[p] = read(p);
  for (const d of ['supabase/migrations', 'supabase/runner']) for (const x of readdirSync(join(ROOT, d))) if (x.endsWith('.sql')) f[`${d}/${x}`] = read(`${d}/${x}`);
  return f;
}

export function run(f = files()) {
  const problems = [];
  for (const [name, check] of CHECKS) for (const p of check(f)) problems.push(`${name}: ${p}`);
  return problems;
}

// broken copies each check must catch
const BREAK = [
  ['.github/workflows/ci.yml', (t) => t + '\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - run: |\n          echo "${{ github.event.client_payload.id }}"\n'],
  ['.github/workflows/run-order.yml', (t) => t.replace(/PP_AGENT_USER=ppagent/g, 'PP_AGENT_USER=')],
  ['scripts/run-order.mjs', (t) => t.replace('const env = sessionEnv(', 'const env = (')],
  ['supabase/migrations/20261109120000_security.sql', (t) => t.replace(/revoke all on function public\.orders_due_for_purge[^;]*;/, '')],
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = run();
  const hasSympy = spawnSync('python3', ['-I', '-c', 'import sympy'], { encoding: 'utf8' }).status === 0;
  if (hasSympy) for (const p of mathEvalCheck().problems) problems.push(`checks/math_check.py: untrusted text never reaches eval (finding 2): ${p}`);
  else console.log('⏭️  no SymPy here: the math_check.py eval check is skipped');
  problems.forEach((p) => console.log(`✗ ${p}`));
  let missed = 0;
  if (process.argv.includes('--self-test')) for (const [p, broke] of BREAK) {
    const f = files(); f[p] = broke(f[p]);
    if (run(f).length === 0) { missed++; console.log(`✗ self-test: a broken ${p} was not caught`); }
  }
  if (process.argv.includes('--self-test') && hasSympy && !mathEvalCheck({ plain: true }).ran) { missed++; console.log('✗ self-test: the payload did not run through plain parse_expr (the check would prove nothing)'); }
  if (problems.length || missed) process.exit(1);
  console.log(`security: all ${CHECKS.length} checks pass${process.argv.includes('--self-test') ? `, and each of ${BREAK.length} broken copies is caught` : ''} (scripts/security-check.mjs)`);
}
