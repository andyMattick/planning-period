// Tests site/zip.js: builds a zip in Node, then checks it with `unzip -t` and reads files back.
// Run: node scripts/test-zip.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
await import(join(here, '..', 'site', 'zip.js'));
const { makeZip, crc32 } = globalThis.PPZip;

assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926, 'CRC32 check value');

const binary = new Uint8Array(70000);
for (let i = 0; i < binary.length; i++) binary[i] = (i * 31 + 7) & 0xFF;
const order = { order: { grade: '6', topic: 'Ratios — café ½' }, tokens: 70 };
const files = [
  { name: 'order.json', data: JSON.stringify(order, null, 2) },
  { name: 'training/my old quiz.docx', data: binary },
  { name: 'sources/notes ñ.txt', data: 'Ratio notes, ünïcode ✓\n' },
  { name: 'sources/empty.txt', data: '' },
];
const zip = makeZip(files);

const dir = mkdtempSync(join(tmpdir(), 'pp-zip-'));
try {
  const path = join(dir, 'test.zip');
  writeFileSync(path, zip);
  const test = execFileSync('unzip', ['-t', path], { encoding: 'utf8' });
  assert.match(test, /No errors detected/, test);
  execFileSync('unzip', ['-q', path, '-d', join(dir, 'x')]);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'x', 'order.json'), 'utf8')), order);
  assert.deepEqual(new Uint8Array(readFileSync(join(dir, 'x', 'training', 'my old quiz.docx'))), binary);
  assert.equal(readFileSync(join(dir, 'x', 'sources', 'notes ñ.txt'), 'utf8'), 'Ratio notes, ünïcode ✓\n');
  assert.equal(readFileSync(join(dir, 'x', 'sources', 'empty.txt')).length, 0);
  assert.throws(() => makeZip([{ name: 'a', data: 'x' }, { name: 'a', data: 'y' }]), /duplicate/);
  console.log('zip ok: unzip -t passed, ' + files.length + ' files read back');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
