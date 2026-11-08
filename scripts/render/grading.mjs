// "How to grade" on the teacher copy (PDF and Word), and the per-question lookups the audit report's coverage page uses.
// Points come from the question (`points`); without them we suggest points by type and say so. Full credit is the key;
// partial credit is the question's `credit.partial`, or a plain default by type. "Also accept" is the key's `accept`
// list plus the rubric notes the checkers left on KEEP findings about that question (e.g. "accept coffee or smoothie").

import { vv, questionsOf, kindOf, keyText, partsOf } from './util.mjs';

const GRADED_KINDS = new Set(['quiz', 'test', 'readingquiz']);
// A quiz or test that is graded by hand: on paper, or an interactive page printed for grading (not one graded in the page).
export const needsHowToGrade = (doc) => GRADED_KINDS.has(kindOf(doc)) && !(doc.format === 'interactive' && doc.grading === 'auto') && questionsOf(doc).length > 0;

const DEFAULT_POINTS = { mc: 1, tf: 1, numeric: 2, short: 2, open: 4 };
export function pointsOf(q) {
  if (q.points != null && !Number.isNaN(Number(q.points))) return { points: Number(q.points), given: true };
  // a multi-part answer: the parts' points added up (a part without points counts 2, marked as our suggestion)
  const parts = partsOf(q);
  if (parts.length) return { points: parts.reduce((s, p) => s + (p.points ?? 2), 0), given: parts.every((p) => p.points != null) };
  const type = q.type || 'short';
  if (type === 'match') return { points: (q.left && (Array.isArray(q.left) ? q.left.length : Object.values(q.left)[0]?.length)) || 1, given: false };
  return { points: DEFAULT_POINTS[type] ?? 1, given: false };
}

function defaultPartial(q, points) {
  const type = q.type || 'short';
  if (type === 'mc' || type === 'tf') return 'None: right or wrong.';
  if (type === 'match') return 'A point for each right pair.';
  if (points < 2) return 'None.';
  if (type === 'numeric') return `Half (${points / 2}): the right setup or method with a slip in the arithmetic.`;
  if (partsOf(q).length) return 'Part by part: each part earns its own points; a part gets partial points for some of its checklist.';
  if (type === 'open') return 'A point for each part of the strong answer the student gets (look for every part the question asks for).';
  return `Half (${points / 2}): part of it right, for example the value without the explanation, or the idea without the context.`;
}

// The question numbers a finding's `where` names ("Quiz A q7", "A q9|B q9|C q9", "q4 C"), in this document.
function whereHits(where, doc, pack) {
  const w = String(where || '');
  const docs = (pack.documents || []).filter((d) => questionsOf(d).length);
  if (docs.length > 1) {
    const t = String(doc.title || '').toLowerCase(), k = String(kindOf(doc) || '').toLowerCase();
    const lw = w.toLowerCase();
    const named = docs.filter((d) => lw.includes(String(d.title || '').toLowerCase()));
    if (named.length ? !named.includes(doc) : !(t && lw.includes(t)) && !(k && new RegExp(`\\b${k}\\b`).test(lw))) return new Set();
  }
  return new Set([...w.matchAll(/\bq(\d+)\b/gi)].map((m) => Number(m[1])));
}
const qNumber = (q, n) => (/^q\d+$/i.test(String(q.id || '')) ? Number(String(q.id).slice(1)) : n);

// Every finding (all checks) about this question of this document.
export function findingsFor(pack, doc, q, n) {
  const out = [];
  for (const runs of Object.values(pack.checks || {})) {
    for (const r of Array.isArray(runs) ? runs : []) {
      for (const f of r.findings || []) if (whereHits(f.where, doc, pack).has(qNumber(q, n))) out.push({ ...f, round: r.round ?? 1 });
    }
  }
  return out;
}

// The rubric notes a checker left: sentences of a KEEP (or a settled JUDGMENT) that say what to accept or require.
export function rubricNotes(pack, doc, q, n) {
  const notes = [];
  for (const f of findingsFor(pack, doc, q, n)) {
    const kind = String(f.kind || 'FIX').toUpperCase();
    // a FIX, an open judgment call, or a note the next round already acted on (it has `fixed`) is not a grading note
    if (kind === 'FIX' || kind === 'JUDGMENT' || f.fixed) continue;
    for (const s of `${f.what || ''} ${f.reason || ''}`.split(/(?<=[.!?])\s+/)) {
      if (/\b(rubric|accept|grader|credit|score[sd]? the)\b/i.test(s) && !/\bscorer\b/i.test(s)) {
        const t = s.trim().replace(/^Rubric note:\s*/i, '');
        if (t && !notes.includes(t)) notes.push(t);
      }
    }
  }
  return notes.concat((q.credit && Array.isArray(q.credit.notes) ? q.credit.notes : []).filter((x) => !notes.includes(x)));
}

// One row per question: {n, q, points, given, full, partial, accept[], notes[]}.
export function gradingRows(doc, ver, pack) {
  return questionsOf(doc).map(({ q, n }) => {
    const { points, given } = pointsOf(q);
    const accept = vv(q.accept, ver);
    const parts = partsOf(q, ver);
    // a multi-part answer: full credit part by part, from each part's checklist (else its strong answer)
    const full = vv(q.credit?.full, ver) || (parts.length ? parts.map((p) => `(${p.label})${p.points != null ? ` ${p.points} pt${p.points === 1 ? '' : 's'}:` : ''} ${p.checklist.length ? p.checklist.join('; ') : String(p.answer ?? '')}`).join(' · ') : keyText(q, ver));
    const same = (a) => String(a).replace(/−/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
    return {
      n, q, points, given,
      full,
      partial: vv(q.credit?.partial, ver) || defaultPartial(q, points),
      accept: (Array.isArray(accept) ? accept : accept ? [accept] : []).filter((a, i, all) => same(a) !== same(full) && all.findIndex((b) => same(b) === same(a)) === i),
      notes: rubricNotes(pack, doc, q, n),
    };
  });
}

export function gradingIntro(rows) {
  const total = rows.reduce((s, r) => s + r.points, 0);
  const given = rows.every((r) => r.given), none = rows.every((r) => !r.given);
  const by = (t) => rows.filter((r) => (r.q.type || 'short') === t);
  const parts = Object.entries({ mc: 'multiple choice', tf: 'true/false', match: 'matching', numeric: 'number answer', short: 'short answer', open: 'written answer' })
    .map(([t, w]) => [by(t), w]).filter(([l]) => l.length)
    .map(([l, w]) => `${w} ${[...new Set(l.map((r) => r.points))].join(' or ')} ${l.every((r) => r.points === 1) ? 'point' : 'points'}`);
  return `${total} points in all (${parts.join(', ')}). ${given ? 'Points are the ones in your pack.' : none ? 'Your examples showed no points, so these are our suggestion: change them to fit your class.' : 'Points marked * are our suggestion (the pack had none for them).'} Full credit is the key; the key's own wording is one way to say it, not the only way.`;
}
