// The dry-run auditor (scripts/test-run-order.mjs): edits a brief the way agents/auditor.md says (a new rule, one version
// bump, a change-log line naming the cause), writes its report, a line in docs/audits/README.md and the record's
// briefChanges. PP_FAKE_AUDIT=checks also edits checks/ (the gate must refuse the whole change).
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

export default function edit(dir) {
  const task = readFileSync(join(dir, 'TASK.md'), 'utf8');
  const id = /order (pp-\d{4}-\d{2}-\d{2}-[a-z0-9]{6})/.exec(task)[1], report = /report to (docs\/audits\/\S+\.md)/.exec(task)[1];
  const f = join(dir, 'agents/maker.md');
  let t = readFileSync(f, 'utf8');
  const v = Number(/^\*\*Version (\d+)\*\*/m.exec(t)[1]);
  t = t.replace(/\n---\n\*\*Version \d+\*\*[^\n]*/, `\n- **Numbers in directions (dry-run auditor):** write numbers under ten as words in directions.\n\n---\n**Version ${v + 1}** (Nov 8, 2026)`);
  t = t.replace(/\n*$/, `\n- v${v + 1}, Nov 8, 2026 (${id}, dry-run auditor test: blind FIX ×1 on a direction): numbers under ten as words in directions.\n`);
  writeFileSync(f, t);
  writeFileSync(join(dir, report), `# Audit of ${id} (dry run)\n\nOne brief change: agents/maker.md v${v + 1}.\n`);
  const readme = join(dir, 'docs/audits/README.md'), r = readFileSync(readme, 'utf8');
  writeFileSync(readme, r.replace(/\n- /, `\n- [${report.split('/').pop()}](${report.split('/').pop()}): dry-run audit of ${id}.\n- `));
  const rec = join(dir, 'records', `${id}.json`), j = JSON.parse(readFileSync(rec, 'utf8'));
  j.audit = { ...(j.audit || {}), briefChanges: [`agents/maker.md v${v + 1}: numbers under ten as words in directions (${id})`] };
  writeFileSync(rec, JSON.stringify(j, null, 2) + '\n');
  if (process.env.PP_FAKE_AUDIT === 'checks') appendFileSync(join(dir, 'checks/test-wise.mjs'), '\n// the auditor loosened a bot here\n');
}
