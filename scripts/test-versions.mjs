#!/usr/bin/env node
// Tests for scripts/versions.mjs (script-made number versions) on the made-up fixture
// checks/fixtures/versions/version-a.pack.json (version A only, with a gen spec on 7 of its 8 items). Part of npm run check.
//   node scripts/test-versions.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(ROOT, 'checks/fixtures/versions/version-a.pack.json');
const tmp = mkdtempSync(join(tmpdir(), 'pp-versions-'));
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (c) return; bad++; console.log(`✗ ${m}`); };
const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
const fixture = () => JSON.parse(readFileSync(FIX, 'utf8'));
const qOf = (p, id) => p.documents[0].sections[0].questions.find((q) => q.id === id);
const save = (name, p) => { const f = join(tmp, name); writeFileSync(f, JSON.stringify(p)); return f; };
const run = (p, ...extra) => { const f = save(`p${n}.json`, p); const r = node([join(ROOT, 'scripts/versions.mjs'), f, ...extra]); return { ...r, file: f, out: r.stdout + r.stderr }; };
const nums = (svg) => [...String(svg).matchAll(/>(\d+)</g)].map((m) => Number(m[1]));

try {
  /* 1. it makes B and C, and they pass the other checks */
  const r = run(fixture());
  ok(r.status === 0, `versions.mjs refused the good fixture:\n${r.out}`);
  const p = JSON.parse(readFileSync(r.file, 'utf8'));
  ok(JSON.stringify(p.documents[0].versions) === '["A","B","C"]', 'versions list is A, B, C');
  ok(/SymPy checked (\d+) keys, 0 disagree/.test(r.out) && Number(/SymPy checked (\d+)/.exec(r.out)[1]) >= 12, `SymPy didn't check every made key:\n${r.out}`);
  for (const c of ['keys.mjs', 'test-wise.mjs', 'cross-item.mjs', 'math.mjs']) { const x = node([join(ROOT, 'checks', c), r.file]); ok(x.status === 0, `checks/${c} fails the made versions:\n${x.stdout}${x.stderr}`); }
  // repeatable, and --verify agrees
  const again = run(fixture());
  ok(readFileSync(again.file, 'utf8') === readFileSync(r.file, 'utf8'), 'the same seed and A gave different versions');
  ok(run(fixture(), '--seed', 'other').status === 0, 'another seed was refused');
  ok(readFileSync(run(fixture(), '--seed', 'other').file, 'utf8') !== readFileSync(r.file, 'utf8'), 'another seed gave the same numbers');
  const v = node([join(ROOT, 'scripts/versions.mjs'), r.file, '--verify']);
  ok(v.status === 0 && /verified/.test(v.stdout), `--verify fails on what it made:\n${v.stdout}`);

  /* 2. new numbers, keys recomputed from the picture the student sees, mc keys moved */
  const q2 = qOf(p, 'q2'), q3 = qOf(p, 'q3'), q8 = qOf(p, 'q8');
  for (const ver of ['B', 'C']) {
    const [a, , c, e] = nums(q2.figure[ver]), b = nums(q2.figure[ver])[1], total = a + b + c + e;
    ok(JSON.stringify(nums(q2.figure[ver])) !== JSON.stringify(nums(q2.figure.A)), `${ver}: the table repeats A's numbers`);
    ok(q2.answer[ver] === String(Math.round((c / total) * 1000) / 10), `${ver} q2: key ${q2.answer[ver]} isn't ${c}/${total}`);
    ok(q3.answer[ver] === String(Math.round((a / (a + c)) * 1000) / 10), `${ver} q3: key ${q3.answer[ver]} isn't ${a}/${a + c}`);
    const m = /\{y\} = ([\d.]+) \+ ([\d.]+)x.*\((\d+), (\d+)\)/.exec(q8.prompt[ver]);
    ok(m && Math.abs(Number(q8.answer[ver]) - (Number(m[4]) - (Number(m[1]) + Number(m[2]) * Number(m[3])))) < 1e-9, `${ver} q8: residual ${q8.answer[ver]} is wrong for "${q8.prompt[ver]}"`);
    for (const id of ['q1', 'q4', 'q6']) { const q = qOf(p, id); ok(q.answer[ver] !== q.answer.A, `${ver} ${id}: the key is under the same letter as in A`); }
  }
  ok(qOf(p, 'q1').answer.B !== qOf(p, 'q1').answer.C, 'q1: B and C put the key under the same letter');
  ok(qOf(p, 'q7').prompt.B === fixture().documents[0].sections[0].questions[6].prompt.B, 'an item with no gen spec was changed');

  /* 3. it refuses */
  const refuses = (what, edit, extra = [], expect) => {
    const f = fixture(); edit(f);
    const x = run(f, ...extra);
    ok(x.status === 1 && (!expect || expect.test(x.out)), `didn't refuse ${what} (exit ${x.status}):\n${x.out}`);
    ok(readFileSync(x.file, 'utf8') === JSON.stringify(f), `wrote the pack although it refused ${what}`);
  };
  refuses('formulas that don\'t reproduce A', (f) => { qOf(f, 'q2').prompt.A = qOf(f, 'q2').prompt.A.replace('one decimal', 'two decimal'); }, [], /the formulas give/);
  refuses('a constraint no numbers can meet', (f) => { f.documents[0].gen.constraints.push('a == 36 and b == 24 and c == 30 and e == 50'); }, [], /no numbers pass/);
  refuses('a distractor formula that always equals the key', (f) => { qOf(f, 'q3').gen.distinct.push('{{a/k1*100|1}}'); }, [], /both print/);
  refuses('fixed numbers that break a constraint', () => {}, ['--values', JSON.stringify({ B: { a: 30, b: 24, c: 30, e: 50 } })], /a != c/);
  refuses('a fixed number outside its range', () => {}, ['--values', JSON.stringify({ C: { 'q8.xr': 99 } })], /outside its range/);
  refuses('a math check with no parameter in it', (f) => { qOf(f, 'q5').gen.fields.math.expr = '2.4 + 1.9*6'; }, [], /uses no parameter/);
  refuses('two choices that print the same', (f) => { const q = qOf(f, 'q4'); q.gen.fields.choices[2] = q.gen.fields.choices[1]; q.choices.A[2] = q.choices.A[1]; }, [], /the same/);
  refuses('a key formula SymPy disagrees with', (f) => { const q = qOf(f, 'q2'); q.gen.fields.answer = '{{c/n*100 + 1|1}}'; q.answer.A = '22.4'; q.gen.fields.why = q.gen.fields.why.replace('{{c/n*100|1}}', '{{c/n*100 + 1|1}}'); q.why.A = q.why.A.replace('21.4', '22.4'); }, [], /math:/);
  refuses('a template that asks for something outside mathjs', (f) => { qOf(f, 'q5').gen.derived = { z: 'import({}, {})' }; }, [], /not allowed|import/);
  { // --verify catches a B that no longer comes from A's formulas
    const t = JSON.parse(readFileSync(r.file, 'utf8')); qOf(t, 'q2').answer.B = '50';
    const x = node([join(ROOT, 'scripts/versions.mjs'), save('tampered.json', t), '--verify']);
    ok(x.status === 1 && /verify: q2 B answer/.test(x.stdout), `--verify missed a changed key:\n${x.stdout}`);
  }
  { // a pack with no gen spec: nothing to do, exit 0
    const x = node([join(ROOT, 'scripts/versions.mjs'), join(ROOT, 'checks/fixtures/good.pack.json'), '--no-math', '--out', join(tmp, 'none.json')]);
    ok(x.status === 0 && /nothing to make/.test(x.stdout), `a pack with no gen spec: ${x.stdout}`);
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

if (bad) { console.log(`versions: ${bad} of ${n} checks failed`); process.exit(1); }
console.log(`versions: all ${n} checks pass (B and C made from A, keys recomputed and SymPy-checked; 9 kinds of refusal)`);
