#!/usr/bin/env node
/* 🛡️ Dominyk's security self-test (docs/security/README.md): static checks that each fixed weakness stays fixed. Part
   of npm run check (section 16). Each check names the finding in docs/security/ it guards.
     node scripts/security-check.mjs            exit 1 on any problem
     node scripts/security-check.mjs --self-test also shows that every check bites on a broken copy */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
];

export function files() {
  const f = {};
  for (const w of readdirSync(join(ROOT, '.github/workflows'))) f[`.github/workflows/${w}`] = read(`.github/workflows/${w}`);
  for (const p of ['scripts/run-order.mjs']) if (existsSync(join(ROOT, p))) f[p] = read(p);
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
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = run();
  problems.forEach((p) => console.log(`✗ ${p}`));
  let missed = 0;
  if (process.argv.includes('--self-test')) for (const [p, broke] of BREAK) {
    const f = files(); f[p] = broke(f[p]);
    if (run(f).length === 0) { missed++; console.log(`✗ self-test: a broken ${p} was not caught`); }
  }
  if (problems.length || missed) process.exit(1);
  console.log(`security: all ${CHECKS.length} checks pass${process.argv.includes('--self-test') ? `, and each of ${BREAK.length} broken copies is caught` : ''} (scripts/security-check.mjs)`);
}
