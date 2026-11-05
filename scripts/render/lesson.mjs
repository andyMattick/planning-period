// Interactive lessons (kind `lesson`; docs/KINDS-LESSONS.md), built to the owner's interactive assignment standard
// (docs/INTERACTIVE-STANDARD.md, rules L1–D3).
//
// One lesson document becomes ONE offline HTML page (pages in reverse order: hook → labs → rule card → check → My notes),
// a teacher copy generated from that same file (C1), and one private teacher board per pack (T2). Answers are never in
// the student file: every accepted form is a salted SHA-256 hash, explanations are locked with the right answer, and
// the teacher question is stored only as ciphertext (AES-GCM, with a SHA-256 stream fallback for browsers without
// crypto.subtle). The build reads answers with the page's own code (apps/engine.js + lesson/forms.js, run in Node).
//
// The build FAILS (problems) on: pages out of the reverse order (L1), required minutes outside 35–45 (L2), fewer than 3
// mechanics or one twice in a row (L3), an off-the-board activity without materials, a result entry or a fallback (L5),
// a blank in the source inventory that no fill-in covers (L6), a rule card that unlocks on something other than the labs
// above it (L7), an auto-checked item without a hint, a why-wrong message per wrong choice or an explanation (Q1), no
// seed that gives a pattern-free order (Q2a–d), the key strictly longest or shortest too often or alone with/without
// "because" (Q3a, Q3b), fewer than two 12-word short answers or no teacher question (T1), a free response without a
// model and look-fors (Q5), an AP lesson without its bell ringer (A1–A3), no build line (D1), an id that changed since
// the last build (S2, ids.lock.json), or any teacher-only text in the student file. Q3c is reported as warnings.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { esc, vv, cleanSvg, kindOf, letter } from './util.mjs';
import { baseCss } from './html.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');
export const isLessonDoc = (doc) => kindOf(doc) === 'lesson';
export const PARTS = ['bell', 'hook', 'lab', 'rule', 'check'];            // in this order (L1); My notes is added last
export const MECHANICS = ['simulate', 'sort', 'build', 'predict-then-reveal', 'find-the-mistake', 'slider-hunt', 'hands-on'];
const CHECKED_MECHANICS = ['sort', 'build', 'find-the-mistake', 'slider-hunt'];
export const ITEM_TYPES = ['mc', 'numeric', 'short', 'open'];
export const ID_RE = /^[a-z][a-z0-9-]{0,40}$/;
export const WAITS = [5, 10, 15, 20];                                       // T3: seconds after the 1st, 2nd, 3rd, 4th+ miss
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest();

/* ---------- the page's own code, run in Node ---------- */
export function loadForms(settings = {}) {
  const ctx = { window: { PPA_DATA: settings }, TextEncoder, TextDecoder, atob, btoa, console, Uint8Array, Uint32Array, Promise, JSON, Math, String, Number, Date, Array, Object, RegExp, parseFloat, isFinite };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(HERE, 'apps', 'engine.js'), 'utf8'), ctx);
  vm.runInContext(read('lesson/forms.js'), ctx);
  return { P: ctx.window.PPA, F: ctx.window.PPL_FORMS };
}

function readerSettings(pack, doc) {
  const numeric = ['math', 'science'].includes(pack.order?.subject);
  const a = doc.app || {};
  return { numberWords: a.numberWords ?? numeric, unitMarks: a.unitMarks ?? numeric };
}
export const lessonIdOf = (doc) => String(doc.lessonId || doc.id || '');
export const saltOf = (pack, doc) => sha(`PPL1|${pack.id || 'pack'}|${lessonIdOf(doc)}`).toString('hex').slice(0, 16);
// S2: fixed forever. Never derived from the title, the build number or the file name.
export const storageKeyOf = (pack, doc) => `pp-lesson:${pack.id || 'pack'}:${lessonIdOf(doc)}:v1`;
const seedOf = (pack, doc) => (Number.isInteger(doc.seed) ? doc.seed : sha(`seed|${pack.id}|${lessonIdOf(doc)}`).readUInt32BE(0));

function lock(salt, id, canon, obj) {
  const pt = Buffer.from('PPA:' + JSON.stringify(obj), 'utf8');
  const key = `PPA1x|${salt}|${id}|${canon}`;
  const out = Buffer.alloc(pt.length);
  for (let i = 0; i * 32 < pt.length; i++) { const ks = sha(key + '#' + i); for (let j = 0; j < 32 && i * 32 + j < pt.length; j++) out[i * 32 + j] = pt[i * 32 + j] ^ ks[j]; }
  return out.toString('base64');
}
const hashOf = (salt, id, canon) => sha(`PPA1|${salt}|${id}|${canon}`).toString('hex');

/* ---------- T1: the teacher question, stored only as ciphertext ---------- */
export const codeNorm = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const TQ_ITER = 60000, TQ_FALLBACK_ITER = 1500;
export function sealQuestion(salt, lessonId, code, question) {
  const pt = Buffer.from('PPLQ:' + JSON.stringify({ q: question }), 'utf8');
  const tqSalt = sha(`PPL-TQ|${salt}|${lessonId}`).toString('hex').slice(0, 32);
  const key = crypto.pbkdf2Sync(codeNorm(code), tqSalt, TQ_ITER, 32, 'sha256');
  const iv = sha(`PPL-IV|${salt}|${lessonId}|${question}`).subarray(0, 12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(pt), c.final(), c.getAuthTag()]);
  // fallback (no crypto.subtle): a SHA-256 stream keyed by the code, stretched 1500 times
  let k = sha(`PPL-TQx|${tqSalt}|${codeNorm(code)}`);
  for (let i = 1; i < TQ_FALLBACK_ITER; i++) k = sha(k.toString('hex'));
  const kh = k.toString('hex'), x = Buffer.alloc(pt.length);
  for (let i = 0; i * 32 < pt.length; i++) { const ks = sha(kh + '#' + i); for (let j = 0; j < 32 && i * 32 + j < pt.length; j++) x[i * 32 + j] = pt[i * 32 + j] ^ ks[j]; }
  return { salt: tqSalt, iter: TQ_ITER, fiter: TQ_FALLBACK_ITER, iv: iv.toString('base64'), gcm: ct.toString('base64'), ctr: x.toString('base64') };
}
export function openQuestion(sealed, code) {   // Node's reading, for the checks
  const key = crypto.pbkdf2Sync(codeNorm(code), sealed.salt, sealed.iter, 32, 'sha256');
  const buf = Buffer.from(sealed.gcm, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.iv, 'base64'));
  d.setAuthTag(buf.subarray(buf.length - 16));
  const s = Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]).toString('utf8');
  return JSON.parse(s.slice(5)).q;
}

/* ---------- Q2: a seeded search for an order with no pattern ---------- */
export function orderProblems(slots, sizes, { strictShare = true } = {}) {
  const out = [];
  const seqCheck = (s, label) => {
    for (let i = 2; i < s.length; i++) if (s[i] === s[i - 1] && s[i] === s[i - 2]) { out.push(`Q2a: three ${letter(s[i])}s in a row${label}`); break; }
    for (let L = 2; L <= 4; L++) for (let i = 0; i + 2 * L <= s.length; i++) {
      const block = s.slice(i, i + L);
      if (new Set(block).size < 2) continue;
      if (block.every((x, j) => s[i + L + j] === x)) { out.push(`Q2b: the cycle ${block.map(letter).join('')} repeats${label}`); L = 9; break; }
    }
  };
  seqCheck(slots, '');
  for (const k of [...new Set(sizes)]) {           // the same rules inside each option count's own run
    const sub = slots.filter((_, i) => sizes[i] === k);
    if (sub.length >= 4) seqCheck(sub, ` among the ${k}-option items`);
  }
  const maxK = Math.max(0, ...sizes);
  for (let j = 0; j < maxK; j++) {
    const share = sizes.reduce((a, k) => a + (j < k ? 1 / k : 0), 0);
    const used = slots.filter((x) => x === j).length;
    const cap = Math.ceil(share - 1e-9) + (strictShare ? 0 : 1);
    if (used > Math.max(cap, 1)) out.push(`Q2c: slot ${letter(j)} holds ${used} keys (its share is about ${share.toFixed(1)})`);
  }
  const two = slots.filter((_, i) => sizes[i] === 2);
  if (two.length >= 2) { const a = two.filter((x) => x === 0).length; if (Math.abs(a - (two.length - a)) > 1) out.push(`Q2d: two-option items put the key first ${a} of ${two.length} times`); }
  return out;
}
export function displaySlots(F, data, seed, keyOf) {
  const ord = F.orders(data, seed);
  const items = F.choiceItems(data);
  return { items, slots: items.map((it) => ord[it.id].indexOf(keyOf(it.id))), sizes: items.map((it) => it.choices.length), ord };
}
function findSeed(F, data, base, keyOf) {
  for (const strict of [true, false]) {
    for (let s = 0; s < 200000; s++) {
      const seed = (base + s) >>> 0;
      const { slots, sizes } = displaySlots(F, data, seed, keyOf);
      if (!orderProblems(slots, sizes, { strictShare: strict }).length) return { seed, strict, tries: s + 1 };
    }
  }
  return null;
}

/* ---------- Q3: answer length and "because" ---------- */
export function lengthAudit(list) {
  // list: [{where, choices, answer}] (multiple choice only)
  const fail = [], warn = [];
  const len = (s) => String(s).trim().length;
  let longest = 0, shortest = 0;
  const longW = [], shortW = [];
  for (const q of list) {
    const L = q.choices.map(len), k = L[q.answer], others = L.filter((_, i) => i !== q.answer);
    if (others.every((x) => k > x)) { longest++; longW.push(q.where); }
    if (others.every((x) => k < x)) { shortest++; shortW.push(q.where); }
    const bec = q.choices.map((c) => /\bbecause\b/i.test(c));
    const nb = bec.filter(Boolean).length;
    if (nb === 1 && bec[q.answer]) fail.push(`Q3b ${q.where}: the key is the only choice with a "because" reason`);
    if (nb === q.choices.length - 1 && !bec[q.answer] && q.choices.length > 2) fail.push(`Q3b ${q.where}: the key is the only choice without a "because" reason`);
    // Q3c (warnings)
    const hedge = /\b(usually|often|sometimes|might|may|can|generally|most|probably|likely|tends? to)\b/i;
    const hz = q.choices.map((c) => hedge.test(c));
    if (q.choices.length > 2 && hz.filter(Boolean).length === 1 && hz[q.answer]) warn.push(`Q3c ${q.where}: the key is the only hedged choice`);
    const dg = q.choices.map((c) => /\d/.test(c));
    if (q.choices.length > 2 && dg.filter(Boolean).length === 1 && dg[q.answer]) warn.push(`Q3c ${q.where}: the key is the only choice with an exact number`);
    q.choices.forEach((c, i) => { if (len(c) < 2) warn.push(`Q3c ${q.where}: choice ${letter(i)} is too short to be a real distractor`); });
  }
  const n = list.length, cap = n < 4 ? 1 : 0.3 * n + 1e-9;
  if (longest > cap) fail.push(`Q3a: the key is the strictly longest choice in ${longest} of ${n} items (${longW.join(', ')}); 30% at most`);
  if (shortest > cap) fail.push(`Q3a: the key is the strictly shortest choice in ${shortest} of ${n} items (${shortW.join(', ')}); 30% at most`);
  const aota = list.filter((q) => q.choices.some((c) => /\b(all|none|both|neither) of (the|these) (above|choices)\b/i.test(c)));
  if (aota.length > 1) warn.push(`Q3c: "all/none of the above" is used in ${aota.length} items`);
  aota.forEach((q) => { if (/\b(all|none) of (the|these) (above|choices)\b/i.test(q.choices[q.answer])) warn.push(`Q3c ${q.where}: "all/none of the above" is the key`); });
  const wrongs = new Map();
  for (const q of list) q.choices.forEach((c, i) => { if (i === q.answer) return; const k = String(c).toLowerCase().replace(/\d+(\.\d+)?/g, '#').replace(/\s+/g, ' ').trim(); wrongs.set(k, [...(wrongs.get(k) || []), q.where]); });
  for (const [k, w] of wrongs) if (w.length > 1 && k.length > 3) warn.push(`Q3c: the wrong choice "${k}" is reused in ${w.join(', ')}`);
  return { fail, warn, longest, shortest, n };
}

/* ---------- S2: ids.lock.json ---------- */
// {"<lessonId>": {"storageKey": "...", "ids": {"<id>": "<what>"}}}. New ids are added; a missing or retyped id fails.
export function checkIdLock(lockFile, lessonId, storageKey, ids, { write = true } = {}) {
  const problems = [];
  let lockData = {};
  if (lockFile && fs.existsSync(lockFile)) { try { lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8')); } catch (e) { problems.push(`S2: ${lockFile} is not valid JSON`); return { problems }; } }
  const prev = lockData[lessonId];
  if (prev) {
    if (prev.storageKey !== storageKey) problems.push(`S2: the storage key changed from ${prev.storageKey} to ${storageKey}`);
    for (const [id, what] of Object.entries(prev.ids || {})) {
      if (!(id in ids)) problems.push(`S2: the id "${id}" (${what}) was in an earlier build and is gone (ids never change; keep it)`);
      else if (ids[id] !== what) problems.push(`S2: the id "${id}" was a ${what} and is now a ${ids[id]}`);
    }
  }
  const added = Object.keys(ids).filter((id) => !prev || !(id in (prev.ids || {})));
  if (!problems.length && lockFile && write && (added.length || !prev)) {
    lockData[lessonId] = { storageKey, ids: { ...(prev?.ids || {}), ...Object.fromEntries(added.map((id) => [id, ids[id]])) } };
    fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2) + '\n');
  }
  return { problems, added };
}

/* ---------- the build: pack document → page data, teacher data, report ---------- */
const str = (x) => (x == null ? '' : String(vv(x)));
export function lessonData(pack, doc, brand = {}, { lockFile = null, writeLock = true } = {}) {
  const problems = [], warnings = [];
  const name = doc.title || 'lesson';
  const fail = (m) => problems.push(`${name}: ${m}`), warn = (m) => warnings.push(`${name}: ${m}`);
  const lessonId = lessonIdOf(doc);
  if (!ID_RE.test(lessonId)) fail(`lessonId "${lessonId}" must be lowercase letters, digits and dashes (S2), set once and never changed`);
  const salt = saltOf(pack, doc), reader = readerSettings(pack, doc);
  const { P, F } = loadForms({ salt, ...reader });
  const o = pack.order || {};
  const build = doc.build || {};
  if (!(Number.isInteger(build.n) && build.n >= 1) || !String(build.note || '').trim()) fail('D1: needs build: {n, note} (the "Build N (what changed)" line)');
  if (Array.isArray(doc.versions) && doc.versions.length > 1) fail('a lesson has one version (drop "versions")');

  const ids = {};               // S2: every id and what it is
  const claim = (id, what) => {
    if (!ID_RE.test(String(id || ''))) { fail(`S2: the ${what} id "${id}" must be lowercase letters, digits and dashes`); return; }
    if (id in ids) fail(`S2: the id "${id}" is used twice (${ids[id]} and ${what})`);
    ids[id] = what;
  };
  const T = { items: {}, blanks: {}, widgets: {}, pages: {}, frq: {}, ced: [], notes: [].concat(doc.teacherNotes || []) };
  const inventory = (doc.blanksInventory || []).map((b) => ({ ...b }));
  const covered = new Map(inventory.map((b) => [b.id, []]));
  const cover = (inv, where) => {
    if (!inv) return;
    for (const v of [].concat(inv)) { if (!covered.has(v)) fail(`L6: ${where} points at blank "${v}", which isn't in blanksInventory`); else covered.get(v).push(where); }
  };

  // one typed answer (numeric, short, a blank) → {acc, miss}
  const typedEntry = (id, type, q, where) => {
    const forms = [vv(q.answer), ...(vv(q.accept) || [])].filter((a) => a != null && String(a).trim() !== '');
    const canons = [];
    for (const f of forms) {
      const cs = F.keyForms(f, type, q);
      if (!cs.length) fail(`${where}: the accepted form "${f}" doesn't read${type === 'numeric' ? ' as a number' : ''}`);
      for (const c of cs) if (!canons.includes(c)) canons.push(c);
    }
    if (!canons.length) fail(`${where}: no accepted form to check against`);
    const why = str(q.why);
    const miss = {};
    for (const m of q.miss || []) {
      const cs = F.keyForms(m.answer, type, { round: [] });
      if (!cs.length) { fail(`${where}: the wrong answer "${m.answer}" doesn't read`); continue; }
      if (cs.some((c) => canons.includes(c))) { fail(`${where}: the wrong answer "${m.answer}" is also a right answer`); continue; }
      for (const c of cs) miss[hashOf(salt, id, c)] = String(m.why || '');
    }
    return { acc: canons.map((c) => ({ h: hashOf(salt, id, c), x: lock(salt, id, c, { why }) })), miss, canons };
  };
  const needQ1 = (where, x, { wrong = true } = {}) => {
    if (!str(x.hint).trim()) fail(`Q1 ${where}: no hint`);
    if (!str(x.why).trim()) fail(`Q1 ${where}: no explanation (why) for after a right answer`);
    if (wrong && !(x.miss || []).length && !str(x.wrong).trim()) fail(`Q1 ${where}: no wrong-answer message (miss or wrong)`);
  };

  const mcList = [];             // for Q3
  const pagesIn = doc.pages || [];
  if (!pagesIn.length) fail('a lesson needs pages');
  const pages = [];
  let lastRank = -1, hasOpen = 0, tqPage = null;
  const seenParts = new Set();
  pagesIn.forEach((pg, pi) => {
    const where = `page ${pg.id || pi + 1}`;
    claim(pg.id, 'page');
    const part = pg.part;
    if (!PARTS.includes(part)) fail(`L1 ${where}: part "${part}" (use ${PARTS.join(', ')}; My notes is added last by the engine)`);
    const rank = PARTS.indexOf(part);
    if (rank < lastRank) fail(`L1 ${where}: a ${part} page comes after a ${PARTS[lastRank]} page (order: ${PARTS.join(' → ')} → My notes)`);
    lastRank = Math.max(lastRank, rank);
    seenParts.add(part);
    if (!(Number(pg.minutes) > 0)) fail(`L2 ${where}: no minutes`);
    const out = { id: pg.id, part, title: str(pg.title), minutes: Number(pg.minutes) || 0, optional: !!pg.optional, mechanic: null };
    if (pg.story) out.story = str(pg.story);
    if (pg.intro) out.intro = str(pg.intro);
    if (pg.figure && cleanSvg(pg.figure)) out.figure = cleanSvg(pg.figure);
    if (pg.keyIdeas) out.keyIdeas = [].concat(pg.keyIdeas).map(String);
    T.pages[pg.id] = { look: pg.look || null };

    // fill-in sentences with blanks: "Density is {b-mass} divided by {b-volume}."
    if (pg.sentences) {
      out.sentences = [];
      out.blanks = {};
      const bl = Object.fromEntries((pg.blanks || []).map((b) => [b.id, b]));
      for (const s of [].concat(pg.sentences)) {
        const text = String(s);
        const used = [...text.matchAll(/\{([a-z][a-z0-9-]*)\}/g)].map((m) => m[1]);
        for (const id of used) {
          const b = bl[id];
          if (!b) { fail(`${where}: the sentence names blank {${id}}, which isn't in blanks`); continue; }
          claim(id, 'blank');
          const bw = `${where} blank ${id}`;
          needQ1(bw, b);
          const e = typedEntry(id, b.type || 'short', b, bw);
          out.blanks[id] = { acc: e.acc, miss: e.miss, hint: str(b.hint), wrong: str(b.wrong), size: Math.max(4, Math.min(16, String(vv(b.answer)).length + 3)) };
          if (b.type === 'numeric') out.blanks[id].num = true;
          T.blanks[id] = { answer: str(b.answer), accept: vv(b.accept) || [], why: str(b.why), hint: str(b.hint), miss: b.miss || [], inv: b.inv || null };
          cover(b.inv, bw);
        }
        out.sentences.push(text);
      }
      for (const id of Object.keys(bl)) if (!(id in out.blanks)) fail(`${where}: blank ${id} is in no sentence`);
    }

    // questions
    out.items = [];
    (pg.questions || []).forEach((q, qi) => {
      const qw = `${where} ${q.id || '#' + (qi + 1)}`;
      claim(q.id, 'question');
      const type = q.type;
      if (!ITEM_TYPES.includes(type)) { fail(`${qw}: type ${type} (use ${ITEM_TYPES.join(', ')})`); return; }
      const it = { id: q.id, type, prompt: str(q.prompt) };
      if (q.level) it.level = vv(q.level);
      const fig = cleanSvg(vv(q.figure)); if (fig) it.figure = fig;
      if (q.unit) it.unit = str(q.unit);
      cover(q.inv, qw);
      if (type === 'open') {
        it.minWords = Number(q.minWords) || 12;
        if (!str(q.answer).trim() || !q.look || ![].concat(q.look).length) fail(`Q5 ${qw}: a free response needs a model answer (answer) and look-fors (look), for the teacher only`);
        T.items[q.id] = { type, model: str(q.answer), look: [].concat(q.look || []).map(String), prompt: it.prompt };
        if (it.minWords >= 12) { hasOpen++; tqPage = pg.id; }
        out.items.push(it);
        return;
      }
      needQ1(qw, q, { wrong: type !== 'mc' });
      it.hint = str(q.hint);
      if (type === 'mc') {
        it.choices = (vv(q.choices) || []).map(String);
        const ans = Number(vv(q.answer));
        if (!(Number.isInteger(ans) && ans >= 0 && ans < it.choices.length)) fail(`${qw}: answer must be a choice index`);
        if (it.choices.length < 2 || it.choices.length > 5) fail(`${qw}: 2 to 5 choices`);
        const missBy = new Map((q.miss || []).map((m) => [Number(m.answer), String(m.why || '')]));
        it.choices.forEach((_, i) => { if (i !== ans && !String(missBy.get(i) || '').trim()) fail(`Q1 ${qw}: no message saying why choice ${letter(i)} (“${it.choices[i]}”) is wrong`); });
        if (missBy.has(ans)) fail(`${qw}: a wrong-answer message on the right choice`);
        it.acc = [{ h: hashOf(salt, q.id, 'opt:' + ans), x: lock(salt, q.id, 'opt:' + ans, { why: str(q.why) }) }];
        it.miss = {};
        for (const [i, m] of missBy) it.miss[hashOf(salt, q.id, 'opt:' + i)] = m;
        T.items[q.id] = { type, answer: ans, why: str(q.why), hint: it.hint, miss: [...missBy].map(([i, m]) => ({ answer: i, why: m })), prompt: it.prompt, choices: it.choices, ced: q.ced || null };
        mcList.push({ where: qw, choices: it.choices, answer: ans, bell: part === 'bell' });
      } else {
        const e = typedEntry(q.id, type, q, qw);
        it.acc = e.acc; it.miss = e.miss; it.wrong = str(q.wrong);
        T.items[q.id] = { type, answer: str(q.answer), accept: vv(q.accept) || [], why: str(q.why), hint: it.hint, miss: q.miss || [], prompt: it.prompt, round: q.round, tol: q.tol, calc: q.calc || null, forms: e.canons.length };
        if (q.calc) {   // K1: recompute the key in code
          try {
            const v = F.evalExpr(q.calc, q.calcVars || {}), k = P.parseNum(String(vv(q.answer)));
            if (!k || Math.abs(v - k[0] / k[1]) > 1e-9 * Math.max(1, Math.abs(v))) fail(`K1 ${qw}: the key ${vv(q.answer)} isn't what ${q.calc} gives (${v})`);
          } catch (er) { fail(`K1 ${qw}: calc "${q.calc}" doesn't read (${er.message})`); }
        }
      }
      out.items.push(it);
    });

    // the page's mechanic (one widget a page)
    if (pg.widget) {
      const w = pg.widget, ww = `${where} widget ${w.id}`;
      claim(w.id, 'widget');
      const m = w.mechanic;
      if (!MECHANICS.includes(m)) fail(`L3 ${ww}: mechanic "${m}" (use ${MECHANICS.join(', ')})`);
      out.mechanic = m;
      const W = { id: w.id, mechanic: m, prompt: str(w.prompt) };
      if (w.figure && cleanSvg(w.figure)) W.figure = cleanSvg(w.figure);
      const TW = { mechanic: m };
      if (CHECKED_MECHANICS.includes(m)) { needQ1(ww, w, { wrong: m !== 'sort' && m !== 'find-the-mistake' }); W.hint = str(w.hint); W.wrong = str(w.wrong); }
      const solved = (canon) => [{ h: hashOf(salt, w.id, canon), x: lock(salt, w.id, canon, { why: str(w.why) }) }];
      try {
        if (m === 'simulate') {
          W.vars = (w.vars || []).map((v) => ({ id: v.id, label: str(v.label), min: +v.min, max: +v.max, step: +v.step || 1, value: +v.value }));
          W.outputs = (w.outputs || []).map((x) => ({ label: str(x.label), expr: String(x.expr), places: x.places }));
          W.verdicts = (w.verdicts || []).map((x) => ({ when: String(x.when), text: str(x.text) }));
          W.runs = Number(w.runs) || 3;
          W.button = str(w.button || 'Run it');
          if (w.repeat) W.repeat = Number(w.repeat);
          if (!W.outputs.length) fail(`${ww}: a simulation needs outputs`);
          const vars = Object.fromEntries(W.vars.map((v) => [v.id, v.value]));
          W.outputs.forEach((y, i) => { vars['out' + (i + 1)] = F.evalExpr(y.expr, vars); });
          for (const y of W.verdicts) F.evalExpr(y.when, vars);
          for (const v of W.vars) if (!(v.min <= v.value && v.value <= v.max)) fail(`${ww}: ${v.id} starts outside its range`);
        } else if (m === 'predict-then-reveal') {
          W.options = (w.options || []).map(String);
          W.reveal = str(w.reveal);
          if (W.options.length < 2 || !W.reveal) fail(`${ww}: a prediction needs 2+ options and a reveal`);
          if (w.revealFigure && cleanSvg(w.revealFigure)) W.revealFigure = cleanSvg(w.revealFigure);
        } else if (m === 'sort') {
          W.bins = (w.bins || []).map((b) => ({ id: b.id, label: str(b.label) }));
          if (W.bins.length < 2) fail(`${ww}: a sort needs 2+ bins`);
          W.cards = (w.cards || []).map((c) => {
            const cid = `${w.id}--${c.id}`;
            claim(c.id, `card of ${w.id}`);
            if (!W.bins.some((b) => b.id === c.bin)) fail(`${ww} card ${c.id}: bin "${c.bin}" isn't one of the bins`);
            if (!str(c.miss).trim()) fail(`Q1 ${ww} card ${c.id}: no message for a wrong placement (miss)`);
            if (!str(c.why).trim()) fail(`Q1 ${ww} card ${c.id}: no explanation (why)`);
            TW[c.id] = c.bin;
            return { id: c.id, text: str(c.text), acc: [{ h: hashOf(salt, cid, 'bin:' + c.bin), x: lock(salt, cid, 'bin:' + c.bin, { why: str(c.why) }) }], miss: str(c.miss) };
          });
          if (W.cards.length < 4) fail(`${ww}: a sort needs 4+ cards`);
          TW.cards = Object.fromEntries((w.cards || []).map((c) => [c.id, { text: str(c.text), bin: c.bin, why: str(c.why), miss: str(c.miss) }]));
          TW.bins = W.bins;
        } else if (m === 'build') {
          W.tiles = (w.tiles || []).map(String);
          W.slots = Number(w.slots) || 0;
          const answers = (w.answer && Array.isArray(w.answer[0]) ? w.answer : [w.answer]).filter(Boolean);
          if (!answers.length || answers.some((a) => a.length !== W.slots || a.some((t) => !W.tiles.includes(t)))) fail(`${ww}: every answer must use ${W.slots} of the tiles`);
          W.acc = answers.flatMap((a) => solved('seq:' + a.join('|')));
          W.miss = Object.fromEntries((w.miss || []).map((x) => [hashOf(salt, w.id, 'seq:' + x.answer.join('|')), String(x.why)]));
          TW.answer = answers; TW.why = str(w.why); TW.miss = w.miss || []; TW.hint = W.hint;
        } else if (m === 'find-the-mistake') {
          W.steps = (w.steps || []).map(String);
          const a = Number(w.answer);
          if (!(a >= 0 && a < W.steps.length)) fail(`${ww}: answer must be a step index`);
          W.steps.forEach((_, i) => { if (i !== a && !str((w.miss || {})[i]).trim()) fail(`Q1 ${ww}: no message for step ${i + 1} (why it isn't the mistake)`); });
          W.acc = solved('step:' + a);
          W.miss = Object.fromEntries(W.steps.map((_, i) => i).filter((i) => i !== a).map((i) => [hashOf(salt, w.id, 'step:' + i), str(w.miss[i])]));
          TW.answer = a; TW.why = str(w.why); TW.miss = w.miss; TW.hint = W.hint;
        } else if (m === 'slider-hunt') {
          const s = w.slider || {};
          W.slider = { label: str(s.label), min: +s.min, max: +s.max, step: +s.step || 1, value: +s.value, unit: str(s.unit) };
          W.readout = (w.readout || []).map((x) => ({ label: str(x.label), expr: String(x.expr), places: x.places }));
          for (const x of W.readout) F.evalExpr(x.expr, { x: W.slider.value });
          const tgt = Number(w.answer), tol = Number(w.tol) || 0;
          if (!(tgt >= W.slider.min && tgt <= W.slider.max)) fail(`${ww}: the answer is outside the slider`);
          const ok = [];
          for (let v = W.slider.min; v <= W.slider.max + 1e-9; v += W.slider.step) { const r = Math.round(v * 1e6) / 1e6; if (Math.abs(r - tgt) <= tol + 1e-9) ok.push(r); }
          if (!ok.length) fail(`${ww}: no slider stop lands on the answer`);
          W.acc = ok.flatMap((v) => solved(F.numForms(String(v))[0]));
          TW.answer = tgt; TW.tol = tol; TW.why = str(w.why); TW.hint = W.hint;
        } else if (m === 'hands-on') {
          W.materials = (w.materials || []).map(String);
          W.steps = (w.steps || []).map(String);
          W.fields = (w.fields || []).map((f) => ({ id: f.id, label: str(f.label), unit: str(f.unit), sim: String(f.sim || '') }));
          W.calc = (w.calc || []).map((x) => ({ label: str(x.label), expr: String(x.expr), places: x.places }));
          W.simNote = str(w.simNote || 'These are simulated results, not your own measurements.');
          if (!W.materials.length) fail(`L5 ${ww}: no materials list`);
          if (!W.fields.length) fail(`L5 ${ww}: no place to enter the result (fields)`);
          W.fields.forEach((f) => { if (!f.sim) fail(`L5 ${ww}: field ${f.id} has no "simulate it for me" value (sim)`); });
          const vars = {}; W.fields.forEach((f) => { if (f.sim) vars[f.id] = F.evalExpr(f.sim, vars); });
          for (const x of W.calc) F.evalExpr(x.expr, vars);
        }
      } catch (er) { fail(`${ww}: an expression doesn't read (${er.message})`); }
      out.widget = W;
      T.widgets[w.id] = TW;
    }
    if (pg.frq) {      // AP free response: the prompt for students, the rest for the teacher (A3)
      const f = pg.frq;
      claim(f.id, 'frq');
      out.frq = { id: f.id, prompt: str(f.prompt), parts: (f.parts || []).map(String) };
      if (!f.guide || !f.model || !f.errors) fail(`A3 ${where}: the FRQ needs a scoring guide, a model response and typical wrong answers`);
      T.frq[f.id] = { guide: [].concat(f.guide || []), model: str(f.model), errors: [].concat(f.errors || []), ced: f.ced || null };
    }
    if (part === 'rule') {   // L7: unlocks after the required labs above it
      const labsAbove = pagesIn.slice(0, pi).filter((p) => p.part === 'lab' && !p.optional).map((p) => p.id);
      out.after = pg.after ? [].concat(pg.after) : labsAbove;
      for (const a of out.after) if (!labsAbove.includes(a)) fail(`L7 ${where}: unlocks after "${a}", which isn't a required lab above it`);
      if (!out.after.length) fail(`L7 ${where}: no required lab above the rule card`);
      if (pg.optional) fail(`L7 ${where}: a rule card is never optional`);
    }
    pages.push(out);
  });
  for (const p of ['hook', 'lab', 'rule', 'check']) if (!seenParts.has(p)) fail(`L1: no ${p} page (a lesson runs hook → labs → rule → check → My notes)`);
  const hook = pages.find((p) => p.part === 'hook');
  if (hook && !hook.story) fail('L4: the hook needs a story or contest (story)');

  // L2: minutes
  const required = pages.filter((p) => !p.optional).reduce((a, p) => a + p.minutes, 0);
  const optional = pages.filter((p) => p.optional).reduce((a, p) => a + p.minutes, 0);
  if (required < 35 || required > 45) fail(`L2: ${required} required minutes (35 to 45)`);
  // L3: mechanics
  const mechSeq = pages.filter((p) => p.mechanic).map((p) => p.mechanic);
  if (new Set(mechSeq).size < 3) fail(`L3: ${new Set(mechSeq).size} different mechanics (3 at least): ${mechSeq.join(', ')}`);
  mechSeq.forEach((m, i) => { if (i && mechSeq[i - 1] === m) fail(`L3: ${m} twice in a row`); });
  // L6: coverage
  if (!inventory.length) fail('L6: no blanksInventory (every blank in the source worksheet, listed)');
  for (const b of inventory) { claim(b.id, 'inventory blank'); if (!covered.get(b.id)?.length) fail(`L6: the source blank ${b.id} (“${b.text}”) isn't a fill-in anywhere`); }
  const coverage = inventory.map((b) => ({ ...b, where: covered.get(b.id) || [] }));
  // T1
  if (hasOpen < 2) fail(`T1: ${hasOpen} short answers of 12+ words (2 needed before the teacher question)`);
  const tq = doc.teacherQuestion || {};
  if (!str(tq.question).trim() || codeNorm(tq.code).length < 4) fail('T1: needs teacherQuestion: {code (4+ letters or digits), question, look}');
  // A1: AP bell ringer
  const bell = pages.filter((p) => p.part === 'bell');
  if (doc.ap) {
    if (!bell.length) fail('A1: an AP lesson needs a bell ringer page (part "bell")');
    for (const b of bell) {
      const mcs = b.items.filter((i) => i.type === 'mc');
      if (mcs.length < 3 || mcs.length > 5) fail(`A1 ${b.id}: ${mcs.length} multiple-choice questions (3 to 5)`);
      if (!b.frq) fail(`A1 ${b.id}: no FRQ`);
      for (const it of mcs) {   // A2: the same length
        const L = it.choices.map((c) => c.trim().length);
        if (Math.max(...L) > 1.5 * Math.min(...L)) fail(`A2 ${b.id} ${it.id}: the choices aren't about the same length (${L.join(', ')} characters)`);
      }
    }
  } else if (bell.length) warn('a bell ringer page in a lesson without ap: true');
  if (doc.ap) T.ced = [...pagesIn.flatMap((p) => (p.questions || []).map((q) => q.ced).filter(Boolean)), ...pagesIn.map((p) => p.frq?.ced).filter(Boolean)].flat();

  const data = {
    kind: 'lesson', v: 1, key: storageKeyOf(pack, doc), lessonId, salt, ...reader, title: str(doc.title),
    sub: [o.grade && `Grade ${o.grade}`, o.topic, o.teacher].filter(Boolean).join(' · '),
    notice: `${brand.aiNotice || 'Made with AI.'} ${brand.shortName || brand.name || ''}`.trim(),
    build: { n: build.n || 0, note: str(build.note) }, locking: doc.locking === true, ap: !!doc.ap,
    waits: WAITS, thinkWords: 4,
    minutes: { required, optional },
    pages: [...pages, { id: 'notes', part: 'notes', title: 'My notes', minutes: 0, optional: true, mechanic: null, items: [] }],
  };
  if (tqPage) { const p = data.pages.find((x) => x.id === tqPage); p.tq = true; claim('tq', 'teacher question'); }
  if (str(tq.question).trim()) data.tq = sealQuestion(salt, lessonId, tq.code, str(tq.question));
  T.tq = { code: String(tq.code || ''), question: str(tq.question), look: [].concat(tq.look || []).map(String) };

  // Q2: a seed that gives an order with no pattern (the engine shuffles at display time with it)
  const keyOf = (id) => T.items[id].answer;
  let seedInfo = null;
  if (F.choiceItems(data).length) {
    seedInfo = findSeed(F, data, seedOf(pack, doc), keyOf);
    if (!seedInfo) fail('Q2: no seed gives an answer order without runs, cycles or an overused slot');
    else { data.seed = seedInfo.seed; if (!seedInfo.strict) warn('Q2c: the strict share could not be met; one slot is used one more time than its share'); }
  } else data.seed = seedOf(pack, doc);
  const disp = displaySlots(F, data, data.seed, keyOf);

  // Q3
  const la = lengthAudit(mcList);
  la.fail.forEach((m) => fail(m)); la.warn.forEach((m) => warn(m));

  // S2: ids
  const lockRes = checkIdLock(lockFile, lessonId, data.key, ids, { write: writeLock });
  lockRes.problems.forEach((m) => fail(m));

  const report = {
    required, optional, mechanics: mechSeq, seed: data.seed, seedTries: seedInfo?.tries || 0,
    order: disp.items.map((it, i) => ({ id: it.id, slot: letter(disp.slots[i]), size: disp.sizes[i] })),
    lengths: { longest: la.longest, shortest: la.shortest, n: la.n }, coverage, ids, addedIds: lockRes.added || [],
  };
  return { data, teacher: T, problems, warnings, report, P, F };
}

/* ---------- pages ---------- */
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));
export const CSP = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; base-uri 'none'; form-action 'none'";
const head = (title) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>`;

/* The student page: one file, everything inline. */
export function lessonHtml(data) {
  return `${head(data.title)}
<style>${read('apps/app.css')}${read('lesson/lesson.css')}</style>
</head><body><div id="app" class="lesson"><noscript>This page needs JavaScript turned on.</noscript></div>
<script>window.PPA_DATA=window.PPL_DATA=${jsonForScript(data)};</script>
<script>${read('apps/engine.js')}</script>
<script>${read('lesson/forms.js')}</script>
<script>${read('lesson/lesson.js')}</script>
</body></html>
`;
}

/* C1: the teacher copy is made from the student file by this script, never by hand: the same page with the teacher's
   data added and the title marked. The engine sees PPL_TEACHER and becomes display-only (C3), F2 switches (C2). */
export const TEACHER_MARK = '<script>window.PPA_DATA=window.PPL_DATA=';
export function teacherCopyHtml(studentHtml, teacher) {
  if (!studentHtml.includes(TEACHER_MARK)) throw new Error('teacher copy: the student file has no data block');
  return studentHtml
    .replace(/<title>/, '<title>TEACHER COPY · ')
    .replace(TEACHER_MARK, `<script>window.PPL_TEACHER=${jsonForScript(teacher)};</script>\n${TEACHER_MARK}`);
}

/* T2: the private board, one per pack: each lesson's code and question, for the teacher to show when she's ready. */
export function boardHtml(pack, lessons, brand = {}) {
  const o = pack.order || {};
  const css = `${read('apps/app.css')} .code{font:700 1.6rem/1.2 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;padding:6px 12px;border:2px dashed var(--accent);border-radius:10px;display:inline-block}
  .q{font-size:1.3rem;line-height:1.4;margin:12px 0} .hide .reveal{filter:blur(9px)} .reveal{transition:filter .2s}`;
  const body = lessons.map((L, i) => `<section class="card hide" id="l-${esc(L.data.lessonId)}"><p class="muted small" style="margin:0">Lesson ${i + 1} · ${esc(L.data.lessonId)}</p><h2 style="margin-top:4px">${esc(L.data.title)}</h2>
  <p>Code for students: <span class="code reveal">${esc(L.teacher.tq.code)}</span></p>
  <p class="q reveal"><b>Question:</b> ${esc(L.teacher.tq.question)}</p>
  <div class="reveal small"><b>Look for:</b><ul>${L.teacher.tq.look.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
  <button type="button" data-show>Show / hide</button></section>`).join('');
  return `${head('Teacher board (private)')}
<style>${css}</style></head><body><main class="wrap">
<div class="notice"><b>Private: for the teacher only.</b> Each lesson's teacher question unlocks with its code. Show a code (or read the question aloud) when the class is ready. Typing the code on a student's page shows the question; it never marks it done.</div>
<h1>Teacher board</h1><p class="muted small">${esc([o.grade && `Grade ${o.grade}`, o.topic, o.teacher].filter(Boolean).join(' · '))}</p>
${body}
<p class="foot">This page is a pacing tool, not a lock: a determined student with the file and programming tools could find a question. ${esc(brand.aiNotice || '')}</p>
</main><script>document.addEventListener('click',function(e){var b=e.target.closest('[data-show]');if(b)b.closest('section').classList.toggle('hide');});</script></body></html>
`;
}

/* ---------- the content PDF (the teacher's review packet: every page, answer, form, hint and message) ---------- */
const EXTRA = `
  .item { border: 1pt solid #888; border-radius: 4pt; padding: 7pt 9pt; margin: 0 0 9pt; break-inside: avoid; }
  .item p { margin: 0 0 4pt; } .lbl { font-weight: 700; } .small2 { font-size: 10pt; }
  .pg { border-top: 2pt solid #000; margin-top: 14pt; padding-top: 6pt; }
  .meta { font-size: 10pt; color: #333; } table.t { border-collapse: collapse; width: 100%; font-size: 10pt; } table.t td, table.t th { border: 1pt solid #999; padding: 3pt 5pt; vertical-align: top; text-align: left; }
  .shots { display: flex; gap: 12pt; align-items: flex-start; flex-wrap: wrap; } .shots figure { margin: 0 0 10pt; } .shots img { border: 1pt solid #999; display: block; } .shots figcaption { font-size: 9pt; margin-top: 3pt; }
  .screenwide img { width: 100%; }`;
function printPage(title, css, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}
export function contentHtml(pack, doc, built, ctx) {
  const { data, teacher: T, report, warnings } = built;
  const o = pack.order || {};
  const L = (s) => `<span class="lbl">${s}</span>`;
  const formsLine = (t) => (t.accept && t.accept.length ? `<div class="small2">${L('Also accepted:')} ${t.accept.map(esc).join(' · ')}${t.round ? ` · rounded to ${[].concat(t.round).join(' or ')} places` : ''}${t.tol ? ` · within ${t.tol.within}` : ''}</div>` : '') + `<div class="small2">The page also accepts the same value written another way (fraction, decimal, percent, number words, a unit after it), plurals, capitals and symbol-or-word spellings.</div>`;
  const missLines = (list, mc) => (list || []).map((m) => `<div class="small2">${L(`If a student answers ${mc ? letter(Number(m.answer)) : esc(m.answer)}:`)} ${esc(m.why)}</div>`).join('');
  const orderOf = Object.fromEntries(report.order.map((x) => [x.id, x.slot]));
  const pagesHtml = data.pages.filter((p) => p.part !== 'notes').map((p) => {
    const parts = [`<div class="pg"><h2>${esc(p.title)}</h2><p class="meta">${esc(p.part === 'bell' ? 'Bell ringer' : p.part)} · ${p.minutes} min${p.optional ? ' · OPTIONAL (never blocks finishing)' : ''}${p.mechanic ? ` · mechanic: ${esc(p.mechanic)}` : ''}${p.after ? ` · unlocks after: ${p.after.map(esc).join(', ')}` : ''}</p>`];
    if (p.story) parts.push(`<p><i>${esc(p.story)}</i></p>`);
    if (p.intro) parts.push(`<p>${esc(p.intro)}</p>`);
    if (p.keyIdeas) parts.push(`<ul>${p.keyIdeas.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>`);
    if (p.sentences) parts.push(`<div class="item">${p.sentences.map((s) => `<p>${esc(s).replace(/\{([a-z0-9-]+)\}/g, (m, id) => `<b>[${esc(T.blanks[id]?.answer)}]</b>`)}</p>`).join('')}${Object.entries(p.blanks).map(([id]) => { const t = T.blanks[id]; return `<div class="small2">${L(id + ':')} ${esc(t.answer)}${t.accept.length ? ' (also ' + t.accept.map(esc).join(', ') + ')' : ''} · hint: ${esc(t.hint)} · why: ${esc(t.why)}${t.inv ? ` · source blank ${esc(t.inv)}` : ''}</div>${missLines(t.miss)}`; }).join('')}</div>`);
    const w = p.widget, tw = w && T.widgets[w.id];
    if (w) {
      const wp = [`<div class="item"><p>${L(`Mechanic: ${esc(w.mechanic)}`)} ${esc(w.prompt)}</p>`];
      if (w.mechanic === 'simulate') wp.push(`<div class="small2">Sliders: ${w.vars.map((v) => `${esc(v.label)} ${v.min}–${v.max}`).join('; ')}. Shows: ${w.outputs.map((x) => `${esc(x.label)} = ${esc(x.expr)}`).join('; ')}. ${w.verdicts.map((v) => `${esc(v.when)} → ${esc(v.text)}`).join('; ')}. Done after ${w.runs} recorded runs.</div>`);
      if (w.mechanic === 'predict-then-reveal') wp.push(`<div class="small2">Options: ${w.options.map(esc).join(' / ')}. Reveal: ${esc(w.reveal)} (any prediction counts; students explain the surprise).</div>`);
      if (w.mechanic === 'sort') wp.push(`<table class="t"><tr><th>Card</th><th>Bin</th><th>Why</th><th>If misplaced</th></tr>${Object.values(tw.cards).map((c) => `<tr><td>${esc(c.text)}</td><td>${esc(tw.bins.find((b) => b.id === c.bin)?.label)}</td><td>${esc(c.why)}</td><td>${esc(c.miss)}</td></tr>`).join('')}</table>`);
      if (w.mechanic === 'build') wp.push(`<div class="small2">${L('Answer:')} ${tw.answer.map((a) => a.map(esc).join(' ')).join(' or ')} · tiles: ${w.tiles.map(esc).join(', ')} · why: ${esc(tw.why)} · hint: ${esc(tw.hint)}</div>${(tw.miss || []).map((m) => `<div class="small2">${L(`If built ${m.answer.map(esc).join(' ')}:`)} ${esc(m.why)}</div>`).join('')}`);
      if (w.mechanic === 'find-the-mistake') wp.push(`<ol>${w.steps.map((s, i) => `<li>${i === tw.answer ? '<b>' : ''}${esc(s)}${i === tw.answer ? '</b> ← the mistake' : ` <span class="small2">(${esc(tw.miss[i])})</span>`}</li>`).join('')}</ol><div class="small2">why: ${esc(tw.why)} · hint: ${esc(tw.hint)}</div>`);
      if (w.mechanic === 'slider-hunt') wp.push(`<div class="small2">${L('Answer:')} ${tw.answer}${tw.tol ? ` (± ${tw.tol})` : ''} on the slider ${esc(w.slider.label)} ${w.slider.min}–${w.slider.max} step ${w.slider.step} · why: ${esc(tw.why)} · hint: ${esc(tw.hint)}</div>`);
      if (w.mechanic === 'hands-on') wp.push(`<div class="small2">${L('Materials:')} ${w.materials.map(esc).join('; ')}</div><ol class="small2">${w.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><div class="small2">${L('Result entry:')} ${w.fields.map((f) => `${esc(f.label)} (simulated: ${esc(f.sim)})`).join('; ')}${w.calc.length ? ` · computed: ${w.calc.map((x) => `${esc(x.label)} = ${esc(x.expr)}`).join('; ')}` : ''}</div>`);
      wp.push('</div>');
      parts.push(wp.join(''));
    }
    for (const it of p.items) {
      const t = T.items[it.id];
      const ip = [`<div class="item"><p><b>${esc(it.id)}.</b> ${esc(it.prompt)}${it.level ? ` <span class="tag">Level ${esc(it.level)}</span>` : ''}</p>`];
      if (it.figure) ip.push(`<div class="fig">${it.figure}</div>`);
      if (it.type === 'mc') ip.push(`<div class="choices c1">${it.choices.map((c, i) => `<div class="ch${i === t.answer ? ' right' : ''}"><span class="l">${i + 1}.</span><span>${esc(c)}</span></div>`).join('')}</div><div class="small2">Original option ${t.answer + 1} is right; students see it in slot ${orderOf[it.id]} (seeded order).${t.ced ? ` CED: ${esc([].concat(t.ced).join(', '))}` : ''}</div>`);
      if (it.type === 'open') ip.push(`<div class="key">${L('Model answer:')} ${esc(t.model)}<div class="small2">${L('Look for:')} ${t.look.map(esc).join('; ')}</div><div class="small2">${it.minWords}+ words.</div></div>`);
      else {
        ip.push(`<div class="key">${L('Answer:')} ${esc(it.type === 'mc' ? `${t.answer + 1}. ${t.choices[t.answer]}` : t.answer)}${it.unit ? ' ' + esc(it.unit) : ''}`);
        if (it.type !== 'mc') ip.push(formsLine(t));
        ip.push(`<div class="why">${L('Why:')} ${esc(t.why)}</div><div class="small2">${L('Hint:')} ${esc(t.hint)}</div>${missLines(t.miss, it.type === 'mc')}</div>`);
      }
      ip.push('</div>');
      parts.push(ip.join(''));
    }
    if (p.frq) { const f = T.frq[p.frq.id]; parts.push(`<div class="item"><p>${L('FRQ:')} ${esc(p.frq.prompt)}</p>${p.frq.parts.length ? `<ol type="a">${p.frq.parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}<div class="small2">${L('Scoring guide:')}<ul>${f.guide.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>${L('Model response:')} ${esc(f.model)}<br>${L('Typical wrong answers:')}<ul>${f.errors.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>${f.ced ? `${L('CED:')} ${esc([].concat(f.ced).join(', '))} (not checked against the CED yet)` : ''}</div></div>`); }
    if (p.tq) parts.push(`<div class="item"><p>${L('Teacher question')} (code <b>${esc(T.tq.code)}</b>, stored only as ciphertext in the student file): ${esc(T.tq.question)}</p><div class="small2">${L('Look for:')} ${T.tq.look.map(esc).join('; ')}</div></div>`);
    parts.push('</div>');
    return parts.join('');
  }).join('');
  const cov = `<table class="t"><tr><th>Source blank</th><th>Source text</th><th>Answer</th><th>Where it is a fill-in</th></tr>${report.coverage.map((b) => `<tr><td>${esc(b.id)}${b.where ? '' : ''}</td><td>${esc(b.text)}${b.source ? `<br><span class="small2">${esc(b.source)}</span>` : ''}</td><td>${esc(b.answer ?? '')}</td><td>${b.where.map(esc).join('<br>') || '<b>NOT COVERED</b>'}</td></tr>`).join('')}</table>`;
  const body = `<div class="tbanner">TEACHER REVIEW · every page, answer, accepted form, hint and message in the lesson</div>
  <h1>${esc(data.title)}</h1>
  <p class="sub">${esc([o.grade && `Grade ${o.grade}`, ctx.subjectLabel, o.topic, o.teacher].filter(Boolean).join(' · '))}</p>
  <p>Build ${data.build.n} (${esc(data.build.note)}). ${report.required} required minutes${report.optional ? ` plus ${report.optional} optional` : ''}. Mechanics in order: ${report.mechanics.map(esc).join(' → ')}. ${data.locking ? 'Locking is ON (pages open in order), as requested.' : 'No page is locked; the rule card opens after the labs above it.'}</p>
  <h2>Multiple-choice audit</h2>
  <p class="small2">Students see the choices in a seeded order (seed ${data.seed}): ${report.order.map((x) => `${esc(x.id)} ${x.slot}`).join(' · ') || 'no choice items'}. No three in a row, no repeating cycle, no slot used more than its share, two-option items about half and half. Saved work keeps the original option numbers. The key is the strictly longest choice in ${report.lengths.longest} of ${report.lengths.n} items and the strictly shortest in ${report.lengths.shortest}.</p>
  ${warnings.length ? `<p class="small2">${L('Warnings (Q3c and others, for a reviewer):')}</p><ul class="small2">${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
  <h2>Blanks inventory and coverage</h2>${cov}
  ${T.notes.length ? `<h2>Teacher notes</h2><ul>${T.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
  ${pagesHtml}`;
  return printPage(`${data.title}: content`, baseCss(ctx) + EXTRA, body);
}

/* ---------- screenshots ---------- */
export async function openOffline(browser, file, { width = 375, height = 800, theme = 'light', init = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme, serviceWorkers: 'block', acceptDownloads: true });
  const outside = [];
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    outside.push(u); return route.abort();
  });
  if (init) await context.addInitScript(init.fn, init.arg);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + file);
  await page.waitForSelector('#app .page');
  return { context, page, outside, errors };
}
export async function screenshots(browser, file, data) {
  const shots = [];
  const first = data.pages[0].id, lab = data.pages.find((p) => p.part === 'lab')?.id, check = data.pages.find((p) => p.part === 'check')?.id;
  for (const [width, height, label, theme] of [[375, 760, 'Phone (375 px)', 'light'], [1280, 800, 'Computer (1280 px)', 'light'], [1280, 800, 'Computer, dark', 'dark']]) {
    const { context, page } = await openOffline(browser, file, { width, height, theme });
    shots.push({ label: `${label}: ${data.pages[0].title}`, width, png: await page.screenshot({ type: 'png' }) });
    if (width === 375 || theme === 'dark') for (const id of [lab, check, 'notes'].filter(Boolean)) {
      await page.evaluate((x) => { location.hash = '#/' + x; }, id); await page.waitForTimeout(150);
      shots.push({ label: `${label}: ${data.pages.find((p) => p.id === id).title}`, width, png: await page.screenshot({ type: 'png' }) });
      if (theme === 'dark') break;
    }
    await context.close();
  }
  return shots;
}
function shotsHtml(data, ctx, shots) {
  const phone = shots.filter((s) => s.width < 600), wide = shots.filter((s) => s.width >= 600);
  const img = (s, w) => `<figure><img src="data:image/png;base64,${s.png.toString('base64')}" style="width:${w}" alt="${esc(s.label)}"><figcaption>${esc(s.label)}</figcaption></figure>`;
  const body = `<h1>${esc(data.title)}: what students see</h1>
  <p class="small">Screenshots of the interactive lesson on a phone and a computer, made from this preview's content. The lesson file, its teacher copy and the teacher board come with the final files, after you approve. It works offline, with no accounts, and saves only on the student's device.</p>
  <div class="shots">${phone.map((s) => img(s, '1.95in')).join('')}</div>
  <div class="screenwide">${wide.map((s) => img(s, '100%')).join('')}</div>`;
  return printPage(`${data.title}: screens`, baseCss(ctx) + EXTRA, body);
}

/* ---------- S5: saves from earlier builds still show ---------- */
// <folder>/saves/<lessonId>-build-<n>.json: a backup file from an earlier build. Each is loaded into a fresh browser,
// and every answer it had right must show as right, every note and short answer must be on the My notes page.
export async function checkOldSaves(browser, file, data, saveFiles) {
  const problems = [];
  for (const f of saveFiles) {
    let backup;
    try { backup = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { problems.push(`S5: ${path.basename(f)} is not readable JSON`); continue; }
    const save = backup.data || backup;
    const { context, page, errors } = await openOffline(browser, file, { width: 1280, init: { fn: ([k, v]) => { try { if (!sessionStorage.getItem('pp-seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('pp-seeded', '1'); } } catch (e) { /* blocked */ } }, arg: [data.key, JSON.stringify(save)] } });
    try {
      await page.waitForTimeout(400);
      const right = Object.entries(save.items || {}).filter(([, s]) => s && s.ok).map(([id]) => id);
      for (const id of right) {
        const pid = data.pages.find((p) => p.items.some((i) => i.id === id))?.id;
        if (!pid) { problems.push(`S5 ${path.basename(f)}: item ${id} is no longer in the lesson`); continue; }
        await page.evaluate((x) => { location.hash = '#/' + x; }, pid); await page.waitForTimeout(120);
        const ok = await page.$(`.q[data-id="${id}"].is-right`);
        if (!ok) problems.push(`S5 ${path.basename(f)}: ${id} was right in the old save and doesn't show as right`);
      }
      await page.evaluate(() => { location.hash = '#/notes'; }); await page.waitForTimeout(200);
      const notesText = await page.textContent('#app');
      for (const n of Object.values(save.notes || {})) if (n && n.text && !notesText.includes(n.text.trim().slice(0, 40))) problems.push(`S5 ${path.basename(f)}: an own note ("${n.text.slice(0, 30)}…") is missing from My notes`);
      for (const [id, t] of Object.entries(save.open || {})) if (t && t.trim() && !notesText.includes(t.trim().slice(0, 40))) problems.push(`S5 ${path.basename(f)}: the answer to ${id} is missing from My notes`);
      if (errors.length) problems.push(`S5 ${path.basename(f)}: page errors: ${errors.join('; ')}`);
    } finally { await context.close(); }
  }
  return problems;
}

/* ---------- the renderer's hook ---------- */
export function savesFor(folder, lessonId) {
  const dir = folder && path.join(folder, 'saves');
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.startsWith(lessonId + '-') && f.endsWith('.json')).sort().map((f) => path.join(dir, f));
}
export function leakProblems(html, built) {
  const T = built.teacher, out = [];
  const secrets = [];
  for (const [id, t] of Object.entries(T.items)) {
    if (t.why) secrets.push([`${id} why`, t.why]);
    if (t.model) secrets.push([`${id} model answer`, t.model]);
    (t.look || []).forEach((l) => secrets.push([`${id} look-for`, l]));
  }
  for (const [id, t] of Object.entries(T.blanks)) if (t.why) secrets.push([`${id} why`, t.why]);
  for (const [id, f] of Object.entries(T.frq)) { secrets.push([`${id} model`, f.model]); f.guide.forEach((g) => secrets.push([`${id} guide`, g])); f.errors.forEach((g) => secrets.push([`${id} typical error`, g])); }
  for (const c of T.ced || []) secrets.push(['CED code', c]);
  for (const [id, w] of Object.entries(T.widgets)) { if (w.why) secrets.push([`${id} why`, w.why]); for (const c of Object.values(w.cards || {})) secrets.push([`${id} card why`, c.why]); }
  secrets.push(['teacher question', T.tq.question], ['teacher question code', T.tq.code]);
  T.tq.look.forEach((l) => secrets.push(['teacher question look-for', l]));
  const plain = html.toLowerCase();
  for (const [what, s] of secrets) {
    const t = String(s || '').trim();
    if (t.length >= 6 && plain.includes(t.toLowerCase())) out.push(`the student file contains the ${what} (“${t.slice(0, 50)}”)`);
    else if (what === 'teacher question code' && t && new RegExp(`\\b${t.replace(/[^A-Za-z0-9-]/g, '')}\\b`, 'i').test(html)) out.push('the student file contains the teacher question code');
  }
  return out;
}

export function buildLesson(pack, doc, brand, opts = {}) {
  const built = lessonData(pack, doc, brand, opts);
  const html = lessonHtml(built.data);
  const teacher = teacherCopyHtml(html, built.teacher);
  for (const m of leakProblems(html, built)) built.problems.push(`${doc.title}: ${m}`);
  return { ...built, html, teacherHtml: teacher };
}

// io: { pdf(file, html, label, what, title), write(file, buf, what), browser }
export async function renderLessonDoc(doc, base, ctx, io) {
  const { pack, brand } = ctx;
  const lockFile = ctx.folder ? path.join(ctx.folder, 'ids.lock.json') : null;
  const b = buildLesson(pack, doc, brand, { lockFile, writeLock: true });
  if (b.problems.length) throw new Error(`${doc.title}: the lesson doesn't meet the interactive standard:\n  - ${b.problems.join('\n  - ')}`);
  for (const w of b.warnings) console.log(`  ⚠️  ${w}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-lesson-'));
  try {
    const file = path.join(tmp, `${base}.html`);
    fs.writeFileSync(file, b.html);
    const old = await checkOldSaves(io.browser, file, b.data, savesFor(ctx.folder, b.data.lessonId));
    if (old.length) throw new Error(`${doc.title}: old saved work doesn't show any more:\n  - ${old.join('\n  - ')}`);
    const shots = await screenshots(io.browser, file, b.data);
    await io.pdf(`${base}-content.pdf`, contentHtml(pack, doc, b, ctx), `${doc.title} · Lesson content`, `${doc.title}: every page, answer, accepted form, hint and message in the interactive lesson`, doc.title);
    await io.pdf(`${base}-screens.pdf`, shotsHtml(b.data, ctx, shots), `${doc.title} · Screens`, `${doc.title}: screenshots of the interactive lesson`, doc.title);
    io.write(`${base}.html`, b.html, `${doc.title}: the interactive lesson (one offline file for students)`);
    io.write(`${base}-TEACHER-COPY.html`, b.teacherHtml, `${doc.title}: teacher copy (F2 shows answers or blank; keep it from students)`);
    ctx.lessons = [...(ctx.lessons || []), { data: b.data, teacher: b.teacher }];
    const last = pack.documents.filter(isLessonDoc).at(-1) === doc;
    if (last) io.write('TEACHER-BOARD.html', boardHtml(pack, ctx.lessons, brand), 'Teacher board: each lesson\'s code and teacher question (private)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
