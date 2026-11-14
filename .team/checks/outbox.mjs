/* The outbox: how a lesson gets from a project to the team when the session that learned it can't reach the team repo.

   A project keeps `.team/OUTBOX.md`. A session that learns something that isn't about that project's own code adds
   one line under the header:

     - 2026-11-20 | what went wrong, with the numbers | what catches it now, or "reader only"

   The weekly run (WEEKLY.md) reads every project's outbox, writes each line into the team's LESSONS.md with the next
   id, and empties the outbox. So a line should never be old. The project's own check command calls outboxProblems:
   a malformed line fails, and so does a line older than MAX_AGE_DAYS, which means two weekly runs missed it and the
   owner should know.

   outboxProblems(text, today = new Date())  → a list of problems (empty when the outbox is fine)
   outboxEntries(text)                       → [{ date, what, catches, line }] for the weekly run */
export const MAX_AGE_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

export function outboxEntries(text) {
  return String(text ?? '').split('\n').filter((l) => /^- /.test(l)).map((line) => {
    const parts = line.slice(2).split(' | ').map((p) => p.trim());
    return { line, date: parts[0], what: parts[1], catches: parts[2], parts: parts.length };
  });
}

export function outboxProblems(text, today = new Date()) {
  const out = [];
  if (text == null) return ['.team/OUTBOX.md is missing: copy templates/OUTBOX.md from the team repo'];
  for (const e of outboxEntries(text)) {
    const short = e.line.length > 70 ? `${e.line.slice(0, 70)}…` : e.line;
    if (e.parts !== 3 || !e.what || !e.catches) { out.push(`.team/OUTBOX.md: "${short}" needs 3 parts: date | what went wrong | what catches it now`); continue; }
    const t = /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? Date.parse(`${e.date}T00:00:00Z`) : NaN;
    if (Number.isNaN(t)) { out.push(`.team/OUTBOX.md: "${short}" needs a date like 2026-11-20 first`); continue; }
    const age = Math.floor((today.getTime() - t) / DAY);
    if (age < -1) out.push(`.team/OUTBOX.md: "${short}" is dated in the future`);
    else if (age > MAX_AGE_DAYS) out.push(`.team/OUTBOX.md: a lesson from ${e.date} has waited ${age} days. The weekly run should have taken it to the team's LESSONS.md and emptied the outbox: run it, or tell the owner it isn't running`);
  }
  return out;
}
