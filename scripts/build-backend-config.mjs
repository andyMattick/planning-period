#!/usr/bin/env node
// Writes backend.config.json (next to brand.config.json) from the host's environment, so the Supabase settings are
// never committed. Vercel runs it in its build (vercel.json); `npm run serve` serves the same thing fresh.
//   PP_SUPABASE_URL       https://<project>.supabase.co
//   PP_SUPABASE_ANON_KEY  the project's anon (or publishable) key: public by design, the SQL's row level security protects the data
// Neither set: no file is written and an old one is removed, so the site runs in local mode (Send makes a zip to email).
// Never put the service (secret) key here: it is only for scripts/orders.mjs on the owner's computer.
import { writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONFIG_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend.config.json');

export function backendConfig(env = process.env) {
  const url = (env.PP_SUPABASE_URL || '').trim(), key = (env.PP_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  if (!/^https?:\/\//.test(url)) throw new Error('PP_SUPABASE_URL must start with https://');
  if (/service_role|sb_secret_/.test(key) || /"role"\s*:\s*"service_role"/.test(decode(key))) throw new Error('PP_SUPABASE_ANON_KEY is a service (secret) key. Use the anon or publishable key; the service key never goes on the site.');
  return { supabaseUrl: url.replace(/\/+$/, ''), supabaseAnonKey: key };
}
function decode(jwt) { try { return Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'); } catch { return ''; } }

if (import.meta.url === `file://${process.argv[1]}`) {
  const cfg = backendConfig();
  if (cfg) { writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n'); console.log(`backend.config.json: online orders on (${cfg.supabaseUrl})`); }
  else { rmSync(CONFIG_FILE, { force: true }); console.log('backend.config.json: not written (PP_SUPABASE_URL / PP_SUPABASE_ANON_KEY not set): local mode'); }
}
