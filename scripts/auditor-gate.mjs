#!/usr/bin/env node
/* The auditor's gate (owner, Nov 8, 2026: "auditor makes edits as they see fit"). The auditor's brief changes no longer
   wait for the owner: they go straight to main, but only through this gate. Run it on a git working tree that holds the
   auditor's edits (the runner's checkout after an order, or the weekly run's audit worktree):

     node scripts/auditor-gate.mjs --repo <working tree> --cause "<order id | weekly test YYYY-MM-DD>"
                                   [--report docs/audits/<report>.md] [--commit] [--push]
     node scripts/auditor-gate.mjs --self-test

   What may change: an existing brief, agents/<name>.md (not agents/README.md); a new report in docs/audits/ and the
   line for it in docs/audits/README.md; a new order record, records/<order id>.json. Anything else (checks/, scripts/,
   CLAUDE.md, menu.json prices, feasibility.json thresholds, samples, a new or deleted brief, comments/…) is refused:
   those stay the owner's.
   Each changed brief: its **Version N** goes up by exactly one; a new change-log line "- vN+1, <date> …" names the cause
   in brackets; every earlier change-log line stays; no sentence holding a hard rule (never, always, must, only, at most,
   at least, every, a number…) is removed or reworded (rewording a hard rule is the owner's call); no new sentence skips,
   bypasses, disables, loosens or relaxes something without a "never"/"don't" in it (a check is never weakened).
   Then `npm run check` must pass on the change (PP_GATE_CHECK overrides the command, for tests only).

   All or nothing: if any part is refused, no brief change is applied. The refused change is saved as
   docs/audits/refused/<date>-<cause>.patch, listed in docs/audits/BRIEF-CHANGES.md and in the report (for the owner),
   and only the report and the record are committed. Every applied change is one line in docs/audits/BRIEF-CHANGES.md
   (date, file, version, cause). --commit commits only those paths; --push pushes to main (on a rejection: fetch,
   rebase, check again, push once more).
   The last line printed is JSON: {"applied":[{file,from,to,cause}], "refused":[{file,why}], "sha", "digest"}.
   Exit 0 done (applied, nothing to do, or refused and listed) · 1 could not commit or push · 2 usage. */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, appendFileSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const git = (repo, ...a) => spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 });
const gitOk = (repo, ...a) => { const r = git(repo, ...a); if (r.status !== 0) throw new Error(`git ${a[0]}: ${(r.stderr || r.stdout).trim().split('\n').pop()}`); return r.stdout; };
const today = () => new Date().toISOString().slice(0, 10);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'audit';

/* ---------- what changed ---------- */
function changes(repo) {
  const out = gitOk(repo, 'status', '--porcelain=v1', '-uall', '-z');
  const parts = out.split('\0').filter(Boolean), list = [];
  for (let i = 0; i < parts.length; i++) {
    const xy = parts[i].slice(0, 2), path = parts[i].slice(3);
    if (/R|C/.test(xy)) { list.push({ path, state: 'added' }); list.push({ path: parts[++i], state: 'deleted' }); continue; }
    list.push({ path, state: xy === '??' || /A/.test(xy) ? 'added' : /D/.test(xy) ? 'deleted' : 'modified' });
  }
  return list;
}

const OWNER_PATHS = [[/^checks\//, 'checks/ are the owner\'s (a check is never weakened by the auditor)'],
  [/^scripts\//, 'scripts/ are the owner\'s'], [/^CLAUDE\.md$/, 'CLAUDE.md is the owner\'s'],
  [/^menu\.json$/, 'menu.json (prices) stays the owner\'s: write the price idea in the report'],
  [/^feasibility\.json$/, 'feasibility.json (thresholds) stays the owner\'s: write the recalibration in the report'],
  [/^docs\/PRICING\.md$/, 'docs/PRICING.md stays the owner\'s'], [/^comments\//, 'comments/ are the teacher\'s words, written by the owner']];

function pathRule(c) {
  const p = c.path;
  if (/^agents\/[a-z0-9-]+\.md$/.test(p) && p !== 'agents/README.md') {
    if (c.state === 'modified') return { kind: 'brief' };
    return { why: c.state === 'added' ? 'a new brief is a new agent: the owner\'s call' : 'deleting a brief is the owner\'s call' };
  }
  if (/^docs\/audits\/README\.md$/.test(p) && c.state === 'modified') return { kind: 'report' };
  if (/^docs\/audits\/[A-Za-z0-9._-]+\.md$/.test(p) && c.state === 'added' && !/BRIEF-CHANGES/.test(p)) return { kind: 'report' };
  if (/^records\/pp-\d{4}-\d{2}-\d{2}-[a-z0-9]{6}\.json$/.test(p) && c.state === 'added') return { kind: 'record' };
  for (const [re, why] of OWNER_PATHS) if (re.test(p)) return { why };
  return { why: c.state === 'modified' && /^docs\/audits\//.test(p) ? 'an earlier report stays as it was' : 'only briefs (agents/*.md), a new report and a new record may change' };
}

/* ---------- one brief ---------- */
const HARD = /\b(never|always|must|only|at most|at least|no more than|every|each|don'?t|do not|not|no|required?|refuse[sd]?|fails?|stops?|cap|caps|limit|threshold)\b|\d|≤|≥|%/i;
const WEAK = /\b(skip|skips|skipping|bypass|disable|ignore|turn off|no longer|optional|loosen|relax|lower the bar|raise the (threshold|pass mark|limit|cap)|waive|drop the)\b/i;
const NEG = /\b(never|don'?t|do not|not|no|without skipping)\b/i;
const norm = (s) => s.toLowerCase().replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
function sentences(text) {
  const logical = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || /^\*\*Version \d+\*\*/.test(t) || /^---+$/.test(t)) { logical.push(null); continue; }
    const starts = /^([-*] |#|\||\d+\. |```)/.test(t);
    if (!starts && logical.length && logical[logical.length - 1] != null && !/^(#|\||```)/.test(logical[logical.length - 1])) logical[logical.length - 1] += ' ' + t;
    else logical.push(t);
  }
  return logical.filter(Boolean).flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z*`"“(])/)).map(norm).filter((s) => s.length > 2);
}
const versionOf = (t) => { const m = /^\*\*Version (\d+)\*\*/m.exec(t); return m ? Number(m[1]) : null; };
const logLines = (t) => { const i = t.search(/^## Change log/m); return i < 0 ? [] : t.slice(i).split('\n').filter((l) => /^- v\d+/.test(l)); };

export function checkBrief(oldText, newText) {
  const problems = [];
  const from = versionOf(oldText), to = versionOf(newText);
  if (to !== from + 1) problems.push(`the version goes from v${from} to v${to ?? '?'}: bump it by exactly one`);
  const oldLog = logLines(oldText), newLog = logLines(newText);
  for (const l of oldLog) if (!newLog.includes(l)) problems.push(`an earlier change-log line was changed or removed (“${l.slice(0, 60)}…”)`);
  const added = newLog.filter((l) => !oldLog.includes(l));
  const entry = added.find((l) => l.startsWith(`- v${to},`));
  // the cause, in brackets: an order id, a weekly run, a finding or a teacher's comment (agents/auditor.md step 2)
  if (!entry) problems.push(`no change-log line "- v${to}, <date> …" for the new version`);
  else if (!/\([^)]{3,}\)/.test(entry)) problems.push('the change-log line names no cause in brackets (the order or run and the finding)');
  const ns = sentences(newText), nset = new Set(ns), os = sentences(oldText), oset = new Set(os);
  for (const s of os) {
    if (nset.has(s) || ns.some((n) => n.includes(s))) continue;
    if (HARD.test(s)) problems.push(`removes or rewords a rule: “${s.slice(0, 90)}” (rewording a hard rule is the owner's call)`);
  }
  for (const s of ns) {
    if (oset.has(s) || /^- v\d+,/.test(s)) continue;
    if (WEAK.test(s) && !NEG.test(s)) problems.push(`may weaken a check: “${s.slice(0, 90)}” (a check is never weakened; write it up for the owner)`);
  }
  return { from, to, cause: entry ? entry.replace(/^- /, '') : '', problems };
}

/* ---------- the gate ---------- */
export function gate({ repo, cause, report = null, commit = false, push = false, checkCmd = process.env.PP_GATE_CHECK || 'npm run check', log = console.log }) {
  repo = resolve(repo);
  const date = today(), list = changes(repo);
  const applied = [], refused = [];
  const briefs = [], keep = [];
  for (const c of list) {
    const r = pathRule(c);
    if (r.why) { refused.push({ file: c.path, why: r.why }); continue; }
    if (r.kind === 'brief') {
      const oldText = gitOk(repo, 'show', `HEAD:${c.path}`), newText = readFileSync(join(repo, c.path), 'utf8');
      const b = checkBrief(oldText, newText);
      if (b.problems.length) b.problems.forEach((why) => refused.push({ file: c.path, why }));
      briefs.push({ file: c.path, ...b });
    } else keep.push(c.path);
  }
  const check = () => {
    const r = spawnSync('sh', ['-c', `${checkCmd} 2>&1`], { cwd: repo, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 1800000, env: { ...process.env, PP_AUDIT_TOKEN: '' } });
    const pass = r.status === 0 && /All checks pass/.test(r.stdout || '');
    return { pass, tail: (r.stdout || '').trim().split('\n').filter((l) => /✗|fail|FAIL/.test(l)).slice(0, 8).join(' | ') || (r.stdout || '').trim().split('\n').slice(-3).join(' | ') };
  };
  let patch = null;
  const undo = (why) => {
    // all or nothing: keep the whole proposal as a patch for the owner, then put every refused path back
    const dir = join(repo, 'docs/audits/refused');
    mkdirSync(dir, { recursive: true });
    patch = `docs/audits/refused/${date}-${slug(cause)}.patch`;
    const paths = list.filter((c) => c.state !== 'added' && pathRule(c).kind !== 'report' && pathRule(c).kind !== 'record').map((c) => c.path);
    const tracked = paths.length ? git(repo, 'diff', 'HEAD', '--', ...paths).stdout : '';
    const untracked = list.filter((c) => c.state === 'added' && !pathRule(c).kind).map((c) => `--- /dev/null\n+++ b/${c.path}\n` +
      (existsSync(join(repo, c.path)) ? readFileSync(join(repo, c.path), 'utf8').split('\n').map((l) => '+' + l).join('\n') : '') + '\n').join('');
    writeFileSync(join(repo, patch), `# Refused by the auditor's gate, ${date} (${cause}): ${why}\n# Apply by hand only if the owner agrees: git apply ${patch}\n${tracked}${untracked}`);
    for (const c of list) {
      const k = pathRule(c).kind;
      if (k === 'report' || k === 'record') continue;
      if (c.state === 'added') rmSync(join(repo, c.path), { force: true, recursive: true });
      else gitOk(repo, 'checkout', 'HEAD', '--', c.path);
    }
  };
  if (refused.length) undo('see the list');
  else if (briefs.length) {
    log(`gate: ${briefs.length} brief change${briefs.length === 1 ? ' passes' : 's pass'} the rules; running the checks (${checkCmd})`);
    const r = check();
    if (!r.pass) { refused.push({ file: briefs.map((b) => b.file).join(', '), why: `npm run check failed on the change: ${r.tail}` }); undo('npm run check failed'); }
    else for (const b of briefs) applied.push({ file: b.file, from: b.from, to: b.to, cause: b.cause });
  }
  // the ledger: one line per applied change, and the refusals for the owner
  const ledger = join(repo, 'docs/audits/BRIEF-CHANGES.md');
  if (applied.length || refused.length) {
    if (!existsSync(ledger)) writeFileSync(ledger, `# Brief changes made by the auditor\n\nOwner, Nov 8, 2026: "auditor makes edits as they see fit", through \`scripts/auditor-gate.mjs\`. One line per\nchange, newest last: date · brief and version · cause · from. To undo one: \`git revert <sha>\` (the sha is in the\ncommit that adds the line). Refused changes are listed for the owner with their patch in \`docs/audits/refused/\`.\n\n`);
    for (const a of applied) appendFileSync(ledger, `- ${date} · ${a.file} v${a.from} → v${a.to} · ${a.cause} · ${cause}\n`);
    if (refused.length) appendFileSync(ledger, `- ${date} · REFUSED (for the owner) · ${cause} · ${[...new Set(refused.map((r) => r.file))].join(', ')} · ${refused.map((r) => r.why).join('; ').slice(0, 400)}${patch ? ` · ${patch}` : ''}\n`);
  }
  if (report && (applied.length || refused.length)) {
    const rp = join(repo, report);
    mkdirSync(dirname(rp), { recursive: true });
    appendFileSync(rp, `\n## The gate (scripts/auditor-gate.mjs)\n\n` +
      (applied.length ? `Applied to main:\n${applied.map((a) => `- ${a.file} v${a.from} → v${a.to}: ${a.cause}`).join('\n')}\n` : 'No brief change was applied.\n') +
      (refused.length ? `\nRefused, for the owner (nothing of it was applied${patch ? `; the whole change is in \`${patch}\`` : ''}):\n${refused.map((r) => `- ${r.file}: ${r.why}`).join('\n')}\n` : ''));
  }
  let sha = null;
  const digest = () => applied.length ? `auditor changed: ${applied.map((a) => `${a.file} v${a.to} (${a.cause.replace(/^v\d+,\s*/, '').slice(0, 120)})`).join('; ')}; to undo: git revert ${sha || '<sha>'}`
    : refused.length ? `auditor changed nothing: the gate refused its change (${[...new Set(refused.map((r) => r.file))].join(', ')}), listed for the owner${patch ? ` in ${patch}` : ''}` : 'auditor changed nothing';
  if (commit) {
    const paths = ['agents', 'docs/audits', 'records'].filter((p) => existsSync(join(repo, p)));
    gitOk(repo, 'add', '-A', '--', ...paths);
    const staged = gitOk(repo, 'diff', '--cached', '--name-only').split('\n').filter(Boolean);
    const stray = staged.filter((p) => !/^(agents|docs\/audits|records)\//.test(p));
    if (stray.length) throw new Error(`refusing to commit: ${stray.join(', ')} staged`);
    if (staged.length) {
      if (!applied.length && refused.length === 0 && !briefs.length) log('gate: no brief change; committing the report and record only');
      // the commit as a whole must pass too (a report can trip the name rule)
      if (!applied.length) { const r = check(); if (!r.pass) { gitOk(repo, 'reset', '-q'); throw new Error(`npm run check fails on the report and record: ${r.tail}`); } }
      const msg = `Auditor (${cause}): ${applied.length ? applied.map((a) => `${a.file.replace('agents/', '')} v${a.to}`).join(', ') : refused.length ? 'change refused by the gate, listed for the owner' : 'report, no brief changes'}`;
      gitOk(repo, '-c', 'user.name=' + (process.env.GIT_AUTHOR_NAME || git(repo, 'config', 'user.name').stdout.trim() || 'order runner'),
        '-c', 'user.email=' + (process.env.GIT_AUTHOR_EMAIL || git(repo, 'config', 'user.email').stdout.trim() || 'runner@localhost'), 'commit', '-q', '-m', msg);
      sha = gitOk(repo, 'rev-parse', 'HEAD').trim();
      if (push) {
        // the runner's push token (PP_AUDIT_TOKEN: fine-grained, Contents: write on this repository) is given to git here
        // only, never stored in .git/config and never in the auditor session's environment
        const tok = process.env.PP_AUDIT_TOKEN, auth = tok ? ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${Buffer.from(`x-access-token:${tok}`).toString('base64')}`] : [];
        let r = git(repo, ...auth, 'push', '-q', 'origin', 'HEAD:main');
        if (r.status !== 0) {
          gitOk(repo, ...auth, 'fetch', '-q', 'origin', 'main'); gitOk(repo, 'rebase', '-q', 'FETCH_HEAD');
          const c = check(); if (!c.pass) throw new Error(`after rebasing on main, npm run check fails: ${c.tail}`);
          sha = gitOk(repo, 'rev-parse', 'HEAD').trim();
          r = git(repo, ...auth, 'push', '-q', 'origin', 'HEAD:main');
          if (r.status !== 0) throw new Error(`push to main failed twice: ${(r.stderr || '').trim().split('\n').pop()}`);
        }
      }
    }
  }
  return { applied, refused, sha, patch, digest: digest() };
}

/* ---------- self-test (npm run check): a made-up repo, every rule bites ---------- */
function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'pp-gate-'));
  let n = 0, bad = 0;
  const ok = (c, m) => { n++; if (!c) { bad++; console.log(`✗ ${m}`); } };
  const brief = `# Maker\n\n## Rules\n1. Never skip the blind check.\n2. At most 3 questions in a follow-up.\n3. Write plainly, the way the teacher writes, and keep the\n   style notes in mind.\n\n---\n**Version 2** (Nov 5, 2026)\n\n## Change log\n- v1, Nov 5, 2026: first brief.\n- v2, Nov 6, 2026 (sample-1, blind FIX ×2): rule 2.\n`;
  const PASS = `node -e "console.log('All checks pass.')"`, FAIL = `if grep -q "Version 3" agents/maker.md; then echo "✗ the samples fail"; exit 1; else echo "All checks pass."; fi`;
  let k = 0;
  const setup = () => {
    k++;
    const origin = join(tmp, `origin-${k}.git`), repo = join(tmp, `repo-${k}`);
    spawnSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
    spawnSync('git', ['init', '-q', '-b', 'main', repo]);
    for (const [f, t] of Object.entries({ 'agents/maker.md': brief, 'agents/README.md': '# Team\n', 'checks/keys.mjs': 'export const MAX = 3;\n', 'menu.json': '{"price": 10}\n',
      'feasibility.json': '{"min": 2}\n', 'CLAUDE.md': '# Rules\n', 'docs/audits/README.md': '# Reports\n', 'docs/audits/OLD.md': '# Old\n' })) {
      mkdirSync(dirname(join(repo, f)), { recursive: true }); writeFileSync(join(repo, f), t);
    }
    gitOk(repo, 'add', '-A'); gitOk(repo, '-c', 'user.name=t', '-c', 'user.email=t@x', 'commit', '-q', '-m', 'start');
    gitOk(repo, 'remote', 'add', 'origin', origin); gitOk(repo, 'push', '-q', 'origin', 'main');
    return { repo, origin };
  };
  const bump = (t, extra, log = '- v3, Nov 8, 2026 (pp-2026-11-08-abcdef, blind FIX ×2): numbers in words.') =>
    t.replace('**Version 2** (Nov 5, 2026)', '**Version 3** (Nov 8, 2026)').replace('3. Write plainly', `${extra}\n3. Write plainly`).replace(/\n$/, `\n${log}\n`);
  const quiet = () => {};
  const run = (edit, opts = {}) => {
    const { repo, origin } = setup();
    edit(repo);
    const r = gate({ repo, cause: 'pp-2026-11-08-abcdef', report: 'docs/audits/AUDIT-2026-11-08-abcdef.md', commit: true, push: true, checkCmd: PASS, log: quiet, ...opts });
    return { r, repo, origin, mainHas: (f, s) => { const x = git(origin, 'show', `main:${f}`); return x.status === 0 && x.stdout.includes(s); } };
  };
  const put = (repo, f, t) => { mkdirSync(dirname(join(repo, f)), { recursive: true }); writeFileSync(join(repo, f), t); };
  const report = (repo) => { put(repo, 'docs/audits/AUDIT-2026-11-08-abcdef.md', '# Audit\n'); put(repo, 'docs/audits/README.md', '# Reports\n- new\n'); put(repo, 'records/pp-2026-11-08-abcdef.json', '{}\n'); };

  // a good change lands on main, with its ledger line and the report
  let t = run((repo) => { report(repo); put(repo, 'agents/maker.md', bump(brief, '2b. Write numbers under ten as words in directions.')); });
  ok(t.r.applied.length === 1 && !t.r.refused.length && t.r.sha, `a good change is applied (${JSON.stringify(t.r.refused)})`);
  ok(t.mainHas('agents/maker.md', 'Version 3') && t.mainHas('docs/audits/BRIEF-CHANGES.md', 'agents/maker.md v2 → v3') && t.mainHas('records/pp-2026-11-08-abcdef.json', '{}'), 'it is on main with its ledger line and the record');
  ok(/to undo: git revert [0-9a-f]{40}/.test(t.r.digest), `the digest says how to undo it (${t.r.digest})`);
  // refusals: nothing of the brief lands, the report and the refusal do
  const refusedCase = (name, edit, want) => {
    const x = run((repo) => { report(repo); edit(repo); });
    ok(!x.r.applied.length && x.r.refused.some((r) => want.test(r.why)), `${name}: refused (${JSON.stringify(x.r.refused)})`);
    ok(!x.mainHas('agents/maker.md', 'Version 3') && x.mainHas('docs/audits/BRIEF-CHANGES.md', 'REFUSED') && x.mainHas('docs/audits/AUDIT-2026-11-08-abcdef.md', 'Refused, for the owner'), `${name}: nothing applied, listed for the owner`);
    ok(x.r.patch && existsSync(join(x.repo, x.r.patch)) && !git(x.repo, 'status', '--porcelain').stdout.trim(), `${name}: the change is kept as a patch, the tree is clean`);
    return x;
  };
  const good = bump(brief, '2b. Write numbers under ten as words in directions.');
  const c1 = refusedCase('an edit to checks/', (repo) => { put(repo, 'agents/maker.md', good); put(repo, 'checks/keys.mjs', 'export const MAX = 5;\n'); }, /checks\//);
  ok(c1.mainHas('checks/keys.mjs', 'MAX = 3'), 'checks/ on main is unchanged');
  refusedCase('a raised threshold in a brief', (repo) => put(repo, 'agents/maker.md', bump(brief, '').replace('At most 3 questions', 'At most 5 questions')), /rewords a rule/);
  refusedCase('a removed rule', (repo) => put(repo, 'agents/maker.md', bump(brief, '').replace('1. Never skip the blind check.\n', '')), /rewords a rule/);
  refusedCase('a new sentence that skips a check', (repo) => put(repo, 'agents/maker.md', bump(brief, '2b. Skip the solver for short quizzes.')), /weaken/);
  refusedCase('no version bump', (repo) => put(repo, 'agents/maker.md', brief.replace('3. Write plainly', '2b. Use words for small numbers.\n3. Write plainly')), /bump it/);
  refusedCase('no cause in the change log', (repo) => put(repo, 'agents/maker.md', bump(brief, '2b. Use words for small numbers.', '- v3, Nov 8, 2026: words.')), /no cause/);
  refusedCase('a changed earlier change-log line', (repo) => put(repo, 'agents/maker.md', bump(brief, '2b. Use words.').replace('rule 2.', 'rule two.')), /earlier change-log/);
  refusedCase('menu.json prices', (repo) => { put(repo, 'agents/maker.md', good); put(repo, 'menu.json', '{"price": 12}\n'); }, /prices/);
  refusedCase('feasibility.json thresholds', (repo) => put(repo, 'feasibility.json', '{"min": 1}\n'), /thresholds/);
  refusedCase('CLAUDE.md', (repo) => put(repo, 'CLAUDE.md', '# Rules\nnone\n'), /CLAUDE\.md/);
  refusedCase('scripts/', (repo) => put(repo, 'scripts/x.mjs', '1\n'), /scripts\//);
  refusedCase('a new brief', (repo) => put(repo, 'agents/new.md', '# New\n'), /new brief/);
  refusedCase('an earlier report', (repo) => put(repo, 'docs/audits/OLD.md', '# Changed\n'), /earlier report/);
  const f = run((repo) => { report(repo); put(repo, 'agents/maker.md', good); }, { checkCmd: FAIL });
  ok(!f.r.applied.length && f.r.refused.some((r) => /npm run check failed/.test(r.why)) && !f.mainHas('agents/maker.md', 'Version 3'), 'a change that fails npm run check is not applied');
  // a wrapped paragraph and an extended sentence are fine
  t = run((repo) => put(repo, 'agents/maker.md', bump(brief, '').replace('and keep the\n   style notes in mind.', 'and keep the style notes in mind, including her headings.')));
  ok(t.r.applied.length === 1, `rewrapping and extending a sentence is fine (${JSON.stringify(t.r.refused)})`);
  // a push that loses the race rebases and pushes again
  t = run((repo) => {
    put(repo, 'agents/maker.md', good);
    const other = join(tmp, 'other'); spawnSync('git', ['clone', '-q', join(tmp, `origin-${k}.git`), other]);
    put(other, 'docs/weekly.md', 'x\n'); gitOk(other, 'add', '-A'); gitOk(other, '-c', 'user.name=t', '-c', 'user.email=t@x', 'commit', '-q', '-m', 'report'); gitOk(other, 'push', '-q', 'origin', 'main');
    rmSync(other, { recursive: true, force: true });
  });
  ok(t.r.applied.length === 1 && t.mainHas('agents/maker.md', 'Version 3') && t.mainHas('docs/weekly.md', 'x'), 'a rejected push is rebased on main and pushed again');
  rmSync(tmp, { recursive: true, force: true });
  if (bad) { console.log(`auditor-gate: ${bad} of ${n} checks failed`); process.exit(1); }
  console.log(`auditor-gate: all ${n} checks pass (a good change lands; checks/, scripts/, CLAUDE.md, prices, thresholds, a reworded or removed rule, a skipped check, no bump, no cause and a failing npm run check are refused)`);
}

/* ---------- command line ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (a.includes('--self-test')) selfTest();
  else {
    const repo = opt('--repo'), cause = opt('--cause');
    if (!repo || !cause) { console.error('usage: node scripts/auditor-gate.mjs --repo <working tree> --cause "<order id | weekly test date>" [--report docs/audits/x.md] [--commit] [--push]'); process.exit(2); }
    try {
      const r = gate({ repo, cause, report: opt('--report'), commit: a.includes('--commit'), push: a.includes('--push') });
      console.log(r.digest);
      console.log(JSON.stringify(r));
    } catch (e) { console.error(`auditor-gate: ${e.message}`); console.log(JSON.stringify({ applied: [], refused: [], sha: null, error: e.message, digest: `auditor: ${e.message}` })); process.exit(1); }
  }
}
