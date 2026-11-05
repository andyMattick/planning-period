#!/usr/bin/env node
// Builds the grids for a pack's puzzles and stores them in the pack, so the grid the teacher approves is the grid that
// is released (docs/KINDS-GAMES.md).
//
//   node scripts/make-puzzles.mjs <folder | pack.json>             show what it would build; change nothing
//   node scripts/make-puzzles.mjs <folder | pack.json> --write     store any missing grid, solution and solve path
//   node scripts/make-puzzles.mjs <folder | pack.json> --write --rebuild   build every grid again (new seed? set it first)
//
// Crosswords and word searches get `layout` (from their words and seed); logic puzzles get `solution` and `path` from the
// solver, and the script stops (exit 1) when a logic puzzle doesn't have exactly one solution. Run checks/puzzles.mjs
// afterwards: it checks the stored grids on its own.

import fs from 'node:fs';
import path from 'node:path';
import { buildCrossword } from './games/crossword.mjs';
import { buildWordSearch } from './games/wordsearch.mjs';
import { solveGrid, solveCages } from './games/logic.mjs';

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
if (!target) { console.error('usage: node scripts/make-puzzles.mjs <folder | pack.json> [--write] [--rebuild]'); process.exit(1); }
const file = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'pack.json') : target;
const write = args.includes('--write'), rebuild = args.includes('--rebuild');
const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
let bad = 0, changed = 0;

for (const doc of pack.documents || []) {
  const kind = doc.kind || doc.item;
  if (kind === 'crossword' && doc.crossword) {
    const cw = doc.crossword;
    if (!cw.layout || rebuild) {
      cw.layout = buildCrossword({ words: cw.words, seed: cw.seed ?? 1, size: cw.size ?? 15 });
      changed++;
    }
    const L = cw.layout;
    console.log(`${doc.title}: ${L.entries.length} of ${(cw.words || []).length} words in a ${L.rows} × ${L.cols} grid, symmetry ${Math.round(L.symmetry * 100)}%`);
    console.log(L.grid.map((r) => '   ' + r.replace(/\./g, '·')).join('\n'));
    for (const u of L.unplaced || []) console.log(`   not placed: ${u.answer} (${u.reason}). Change the seed, the size or the word list, or keep it out.`);
  }
  if (kind === 'wordsearch' && doc.wordsearch) {
    const ws = doc.wordsearch;
    if (!ws.layout || rebuild) {
      ws.layout = buildWordSearch({ words: ws.words, seed: ws.seed ?? 1, size: ws.size, grade: pack.order?.grade, directions: ws.directions });
      changed++;
    }
    const L = ws.layout;
    if (L.error) { bad++; console.log(`${doc.title}: ${L.error}`); continue; }
    console.log(`${doc.title}: ${L.placements.length} words in a ${L.size} × ${L.size} grid, directions ${L.directions.join(', ')}`);
    console.log(L.grid.map((r) => '   ' + r.split('').join(' ')).join('\n'));
    for (const u of L.unplaced || []) console.log(`   not placed: ${u}`);
  }
  if (kind === 'logicpuzzle') {
    (doc.puzzles || []).forEach((pz, i) => {
      const res = pz.type === 'cages' ? solveCages(pz) : solveGrid(pz);
      const name = `${doc.title} puzzle ${i + 1}${pz.title ? ` (${pz.title})` : ''}`;
      if (res.errors?.length) { bad++; console.log(`${name}: ${res.errors.join('; ')}`); return; }
      if (res.count !== 1) { bad++; console.log(`${name}: ${res.count === 0 ? 'no solution' : 'more than one solution'}; add or change a clue`); return; }
      if (!pz.solution || rebuild) { pz.solution = res.solution; changed++; }
      if (!pz.path || rebuild) { pz.path = res.path.map((s) => s.text); changed++; }
      console.log(`${name}: exactly one solution, ${res.path.length} steps in the solve path`);
      for (const w of res.warnings || []) console.log(`   note: ${w}`);
    });
  }
}

if (write && changed) { fs.writeFileSync(file, JSON.stringify(pack, null, 2) + '\n'); console.log(`\nStored ${changed} grid(s), solution(s) and path(s) in ${file}.`); }
else if (changed) console.log(`\n${changed} thing(s) to store: run again with --write.`);
process.exit(bad ? 1 : 0);
