#!/usr/bin/env node
// A stand-in for sudo in scripts/test-run-order.mjs (PP_SUDO_BIN): `sudo [-n] [-u user] [-H] [--preserve-env=a,b] -- cmd …`.
// Records each call in PP_FAKE_SUDO_LOG ({user, preserve, cmd}); runs `-u <user> … -- <command>` as this same user with
// only the preserved variables (what sudo's env_reset leaves); does nothing for a root command (chown, pkill: the test
// runs as one user).
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const a = process.argv.slice(2), at = a.indexOf('--');
if (at < 0) { console.error('fake sudo: no --'); process.exit(2); }
const opts = a.slice(0, at), cmd = a.slice(at + 1);
const user = opts.includes('-u') ? opts[opts.indexOf('-u') + 1] : null;
const preserve = (opts.find((x) => x.startsWith('--preserve-env=')) || '').slice('--preserve-env='.length);
if (process.env.PP_FAKE_SUDO_LOG) appendFileSync(process.env.PP_FAKE_SUDO_LOG, JSON.stringify({ user, preserve, cmd: cmd.slice(0, 1) }) + '\n');
if (!user) process.exit(0);
const env = { HOME: process.env.HOME };
for (const k of preserve.split(',').filter(Boolean)) if (process.env[k] != null) env[k] = process.env[k];
const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
process.exit(r.status ?? 1);
