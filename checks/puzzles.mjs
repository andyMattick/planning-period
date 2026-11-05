#!/usr/bin/env node
/* The puzzle checks (docs/KINDS-GAMES.md): every game and puzzle in a pack, checked from what the pack stores.

     node checks/puzzles.mjs <pack.json>               check; exit 1 on any problem
     node checks/puzzles.mjs <pack.json> --self-test   also break copies of the pack and make sure each break is caught

   Crossword: every placed word reads right across or down and stops there; the numbers are right; every run of 2 or
     more letters is an entry (a stray run longer than 2 fails, a stray 2-letter run is flagged); one connected grid;
     every word in the list is placed exactly once or reported as not placed; each entry's clue is the clue written
     for that word; no clue gives its own answer away.
   Word search: every listed word is in the grid exactly once, in any of the eight directions (a copy sitting inside a
     longer listed word, ORGAN inside ORGANELLE, is noted, not counted); it runs only in the directions allowed for
     the grade; no blocklisted word is spelled by the filler letters in any direction.
   Logic puzzles: the solver (scripts/games/logic.mjs) tries every answer and finds exactly one; the stored solution is
     that one; each clue names the items its rule uses (or says `because`: a clue that needs subject knowledge).
   Quiz show: every category has a clue and an answer at every value; no clue gives its answer away; no clue twice;
     never the trademarked show's name.

   This reads the grids on its own: it doesn't trust the builders that made them. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { solveGrid, solveCages, ruleItems } from '../scripts/games/logic.mjs';
import { BLOCKLIST, directionsFor } from '../scripts/games/wordsearch.mjs';

const letters = (s) => String(s || '').toUpperCase().normalize('NFKD').replace(/[^A-Z]/g, '');
const words = (s) => ` ${String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim()} `;
const DIRS8 = { E: [0, 1], S: [1, 0], SE: [1, 1], NE: [-1, 1], W: [0, -1], N: [-1, 0], NW: [-1, -1], SW: [1, -1] };
const TRADEMARK = /jeopardy/i; // owner rule: never the show's name; call it a quiz-show game

export function checkPack(pack) {
  const errors = [], warnings = [], notes = [];
  let games = 0;
  (pack.documents || []).forEach((doc, d) => {
    const kind = doc.kind || doc.item;
    const name = doc.title || `${kind} ${d + 1}`;
    const E = (m) => errors.push(`${name}: ${m}`), W = (m) => warnings.push(`${name}: ${m}`), N = (m) => notes.push(`${name}: ${m}`);
    if (['quizshow', 'crossword', 'wordsearch', 'logicpuzzle'].includes(kind)) {
      games++;
      if (TRADEMARK.test(JSON.stringify(doc))) E('uses the trademarked quiz show\'s name; call it a quiz-show game');
    }
    if (kind === 'crossword') checkCrossword(doc, E, W, N);
    if (kind === 'wordsearch') checkWordSearch(doc, pack, E, W, N);
    if (kind === 'logicpuzzle') checkLogic(doc, E, W, N);
    if (kind === 'quizshow') checkQuiz(doc, E, W, N);
  });
  return { games, errors, warnings, notes };
}

/* ---------- crossword ---------- */
function checkCrossword(doc, E, W, N) {
  const cw = doc.crossword || {};
  const L = cw.layout;
  if (!L || !Array.isArray(L.grid) || !L.grid.length) return E('no stored grid (run scripts/make-puzzles.mjs --write)');
  const g = L.grid, R = g.length, C = g[0].length;
  if (g.some((row) => row.length !== C || /[^A-Z.]/.test(row))) return E('the grid has rows of different lengths or characters other than A–Z and "."');
  const isL = (r, c) => r >= 0 && c >= 0 && r < R && c < C && g[r][c] !== '.';
  // numbers, recomputed from the grid
  const num = {}; let n = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (isL(r, c) && ((!isL(r, c - 1) && isL(r, c + 1)) || (!isL(r - 1, c) && isL(r + 1, c)))) num[`${r},${c}`] = ++n;
  // every run of 2 or more letters
  const runs = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (isL(r, c) && !isL(r, c - 1) && isL(r, c + 1)) { let s = ''; for (let k = c; isL(r, k); k++) s += g[r][k]; runs.push({ row: r, col: c, dir: 'across', text: s }); }
    if (isL(r, c) && !isL(r - 1, c) && isL(r + 1, c)) { let s = ''; for (let k = r; isL(k, c); k++) s += g[k][c]; runs.push({ row: r, col: c, dir: 'down', text: s }); }
  }
  const entries = L.entries || [];
  const list = (cw.words || []).map((w) => ({ ...w, key: letters(w.answer) }));
  for (const e of entries) {
    const where = `${e.n} ${e.dir}`;
    const [dr, dc] = e.dir === 'across' ? [0, 1] : [1, 0];
    let read = '';
    for (let i = 0; i < letters(e.answer).length; i++) read += isL(e.row + dr * i, e.col + dc * i) ? g[e.row + dr * i][e.col + dc * i] : '?';
    if (read !== letters(e.answer)) E(`${where}: the grid reads ${read}, the entry is ${letters(e.answer)}`);
    if (isL(e.row - dr, e.col - dc) || isL(e.row + dr * letters(e.answer).length, e.col + dc * letters(e.answer).length)) E(`${where} (${e.answer}): the word runs on into other letters`);
    if (num[`${e.row},${e.col}`] !== e.n) E(`${where} (${e.answer}): numbered ${e.n}, but its first square is number ${num[`${e.row},${e.col}`] ?? 'none'}`);
    const src = list.filter((w) => w.key === letters(e.answer));
    if (!src.length) E(`${where} (${e.answer}): not a word in the pack's list`);
    else if (String(src[0].clue || '').trim() !== String(e.clue || '').trim()) E(`${where} (${e.answer}): the clue in the grid ("${e.clue}") is not the clue written for this word ("${src[0].clue}")`);
    if (!String(e.clue || '').trim()) E(`${where}: no clue`);
    const ans = words(e.display || e.answer).trim();
    if (ans.length >= 3 && words(e.clue).includes(` ${ans} `)) E(`${where}: the clue gives away its answer "${ans}"`);
  }
  for (const run of runs) {
    const ent = entries.find((e) => e.row === run.row && e.col === run.col && e.dir === run.dir);
    if (!ent) (run.text.length > 2 ? E : W)(`a stray ${run.dir} run "${run.text}" at row ${run.row + 1}, column ${run.col + 1} is not an entry`);
    else if (letters(ent.answer).length !== run.text.length) E(`${ent.n} ${ent.dir}: the letters run on: the grid reads ${run.text}`);
  }
  for (const w of list) {
    const placed = entries.filter((e) => letters(e.answer) === w.key).length;
    if (placed > 1) E(`${w.answer} is placed ${placed} times`);
    if (!placed) {
      if ((L.unplaced || []).some((u) => letters(u.answer) === w.key)) W(`${w.answer} is not in the grid (reported on the teacher copy)`);
      else E(`${w.answer} is neither in the grid nor reported as not placed`);
    }
  }
  // one connected grid
  const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (isL(r, c)) cells.push(`${r},${c}`);
  if (cells.length) {
    const seen = new Set([cells[0]]), stack = [cells[0]];
    while (stack.length) { const [r, c] = stack.pop().split(',').map(Number); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${r + a},${c + b}`; if (isL(r + a, c + b) && !seen.has(k)) { seen.add(k); stack.push(k); } } }
    if (seen.size !== cells.length) E('the grid is in more than one piece');
  }
  N(`${entries.length} entries, ${R} × ${C}, numbering and every run checked`);
}

/* ---------- word search ---------- */
function findAll(grid, word) {
  const out = [], seen = new Set();
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) for (const [dir, [dr, dc]] of Object.entries(DIRS8)) {
    const cells = [];
    for (let i = 0; i < word.length; i++) { const rr = r + dr * i, cc = c + dc * i; if (grid[rr]?.[cc] !== word[i]) break; cells.push(`${rr},${cc}`); }
    if (cells.length !== word.length) continue;
    const k = [...cells].sort().join('|');
    if (!seen.has(k)) { seen.add(k); out.push({ row: r, col: c, dir, cells }); }
  }
  return out;
}

function checkWordSearch(doc, pack, E, W, N) {
  const ws = doc.wordsearch || {};
  const L = ws.layout;
  if (!L || !Array.isArray(L.grid) || !L.grid.length) return E('no stored grid (run scripts/make-puzzles.mjs --write)');
  const g = L.grid, n = g.length;
  if (g.some((row) => row.length !== n || /[^A-Z]/.test(row))) return E('the grid is not square, or has characters other than A–Z');
  const allowed = new Set(ws.directions?.length ? ws.directions : directionsFor(pack.order?.grade));
  const list = [...new Set((ws.words || []).map((w) => letters(typeof w === 'string' ? w : w.word)))].filter((w) => w.length >= 2);
  const found = new Map(list.map((w) => [w, findAll(g, w)]));
  const wordCells = new Set();
  for (const w of list) {
    const occ = found.get(w);
    // copies that sit inside a longer listed word are part of that word
    const inside = (o) => list.some((x) => x.length > w.length && x.includes(w) && found.get(x).some((xo) => o.cells.every((k) => xo.cells.includes(k))));
    const own = occ.filter((o) => !inside(o));
    if (!own.length && !occ.length) {
      if ((L.unplaced || []).some((u) => letters(u) === w)) W(`${w} is not in the grid (left off the word list)`); else E(`${w} is not in the grid`);
      continue;
    }
    if (own.length > 1) E(`${w} is in the grid ${own.length} times (row/col ${own.map((o) => `${o.row + 1}/${o.col + 1} ${o.dir}`).join(', ')})`);
    if (occ.length > own.length) N(`${w} also reads inside a longer listed word (counted once)`);
    const main = own[0] || occ[0];
    if (!allowed.has(main.dir)) E(`${w} runs ${main.dir}, which grade ${pack.order?.grade ?? '?'} doesn't use (${[...allowed].join(', ')})`);
    const p = (L.placements || []).find((x) => x.word === w);
    if (!p) E(`${w} has no stored placement (the key can't outline it)`);
    else if (!own.some((o) => o.row === p.row && o.col === p.col && o.dir === p.dir) && !occ.some((o) => o.row === p.row && o.col === p.col && o.dir === p.dir)) E(`${w}: the stored placement (row ${p.row + 1}, col ${p.col + 1}, ${p.dir}) doesn't read ${w}`);
    for (const o of occ) for (const k of o.cells) wordCells.add(k);
  }
  for (const p of L.placements || []) if (!list.includes(p.word)) E(`${p.word} is placed but not in the word list`);
  for (const b of BLOCKLIST) for (const o of findAll(g, b)) {
    if (o.cells.every((k) => wordCells.has(k))) N(`"${b}" reads inside listed words only`);
    else E(`the filler spells "${b}" at row ${o.row + 1}, col ${o.col + 1} (${o.dir})`);
  }
  N(`${list.length} words, each found exactly once, ${n} × ${n}`);
}

/* ---------- logic puzzles ---------- */
function checkLogic(doc, E, W, N) {
  const pz = doc.puzzles || [];
  if (!pz.length) E('no puzzles');
  pz.forEach((p, i) => {
    const name = `puzzle ${i + 1}${p.title ? ` (${p.title})` : ''}`;
    const res = p.type === 'cages' ? solveCages(p) : p.type === 'grid' || !p.type ? solveGrid(p) : { count: 0, errors: [`unknown type "${p.type}" (grid or cages)`] };
    for (const e of res.errors || []) E(`${name}: ${e}`);
    if (res.errors?.length) return;
    if (res.count !== 1) return E(`${name}: ${res.count === 0 ? 'has no solution' : 'has more than one solution'} (the solver tried every answer)`);
    if (p.solution && JSON.stringify(p.solution) !== JSON.stringify(res.solution)) E(`${name}: the stored solution is not the one answer the solver found`);
    if (!p.solution) W(`${name}: no stored solution (run scripts/make-puzzles.mjs --write)`);
    for (const w of res.warnings || []) W(`${name}: ${w}`);
    if (p.type !== 'cages') (p.clues || []).forEach((c, j) => {
      const text = words(typeof c === 'string' ? c : c.text);
      if (!text.trim()) E(`${name} clue ${j + 1}: no text`);
      const missing = ruleItems(c.rule).filter((it) => !text.includes(` ${words(it).trim()} `));
      if (missing.length && !c.because) E(`${name} clue ${j + 1}: its rule uses ${missing.join(', ')}, but the clue doesn't name ${missing.length > 1 ? 'them' : 'it'} (add "because" if the clue needs subject knowledge instead)`);
      if (missing.length && c.because) N(`${name} clue ${j + 1}: needs subject knowledge (${c.because}); a fresh fact checker confirms it`);
    });
    N(`${name}: exactly one solution`);
  });
}

/* ---------- quiz show ---------- */
function checkQuiz(doc, E, W, N) {
  const b = doc.board || {};
  const values = (b.values || [100, 200, 300, 400, 500]).map(Number);
  if (values.some((v, i) => !(v > 0) || (i && v <= values[i - 1]))) E('values must be positive and go up');
  const cats = b.categories || [];
  if (cats.length < 2) E('a board needs at least 2 categories');
  const seenCat = new Set(), seenClue = new Map();
  const one = (where, q) => {
    if (!String(q.clue || '').trim()) E(`${where}: no clue`);
    if (!String(q.answer || '').trim()) E(`${where}: no answer`);
    const ans = words(String(q.answer || '').replace(/^\s*(the|a|an)\s+/i, '')).trim();
    if (ans.length >= 4 && words(q.clue).includes(` ${ans} `)) E(`${where}: the clue gives away its answer "${q.answer}"`);
    const k = words(q.clue).trim();
    if (k && seenClue.has(k)) E(`${where}: the same clue as ${seenClue.get(k)}`);
    seenClue.set(k, where);
  };
  for (const c of cats) {
    if (!String(c.name || '').trim()) E('a category has no name');
    if (seenCat.has(words(c.name))) E(`category "${c.name}" is on the board twice`);
    seenCat.add(words(c.name));
    for (const v of values) {
      const q = (c.clues || []).filter((x) => Number(x.value) === v);
      if (q.length !== 1) { E(`${c.name} ${v}: ${q.length ? `${q.length} clues` : 'no clue'} (one per value)`); continue; }
      one(`${c.name} ${v}`, q[0]);
    }
  }
  if (b.final) one('the final round', b.final);
  N(`${cats.length} categories × ${values.length} values${b.final ? ' and a final round' : ''}, every clue and answer present`);
}

/* ---------- self-test: break a copy of the pack, one way at a time ---------- */
function selfTest(pack) {
  const out = [];
  const doc = (p, kind) => p.documents.find((d) => (d.kind || d.item) === kind);
  const cases = [];
  const add = (what, kind, fn, expect) => { if (!doc(pack, kind)) return; const p = structuredClone(pack); fn(doc(p, kind)); cases.push([what, p, expect]); };
  add('a wrong letter in the crossword grid', 'crossword', (d) => { const L = d.crossword.layout; const e = L.entries[0]; const row = L.grid[e.row].split(''); row[e.col] = row[e.col] === 'Z' ? 'Q' : 'Z'; L.grid[e.row] = row.join(''); }, /the grid reads/);
  add('two crossword clues swapped', 'crossword', (d) => { const [a, b] = d.crossword.layout.entries; [a.clue, b.clue] = [b.clue, a.clue]; }, /is not the clue written/);
  add('a crossword entry numbered wrong', 'crossword', (d) => { d.crossword.layout.entries[1].n += 1; }, /numbered \d+, but/);
  add('a stray crossword word', 'crossword', (d) => { d.crossword.words = [{ answer: 'cat', clue: 'A pet that purrs.' }, { answer: 'car', clue: 'It has four wheels and an engine.' }];
    d.crossword.layout = { rows: 3, cols: 3, grid: ['CAT', 'A.O', 'R.E'], entries: [{ n: 1, dir: 'across', row: 0, col: 0, answer: 'CAT', display: 'cat', clue: 'A pet that purrs.' }, { n: 1, dir: 'down', row: 0, col: 0, answer: 'CAR', display: 'car', clue: 'It has four wheels and an engine.' }], unplaced: [] }; }, /stray down run "TOE"/);
  add('a crossword clue that gives its answer away', 'crossword', (d) => { const e = d.crossword.layout.entries[0]; const w = d.crossword.words.find((x) => letters(x.answer) === letters(e.answer)); w.clue = e.clue = `${e.clue} It is the ${e.display}.`; }, /gives away/);
  add('a word search word placed twice', 'wordsearch', (d) => { const L = d.wordsearch.layout; const w = [...L.placements].sort((a, b) => a.word.length - b.word.length)[0].word; const r = L.grid.findIndex((row, i) => !L.placements.some((p) => p.row === i)); const row = (r >= 0 ? L.grid[r] : L.grid[L.grid.length - 1]).split(''); for (let i = 0; i < w.length; i++) row[i] = w[i]; L.grid[r >= 0 ? r : L.grid.length - 1] = row.join(''); }, /in the grid \d+ times/);
  add('a blocklisted word in the word search filler', 'wordsearch', (d) => { const L = d.wordsearch.layout; const used = new Set();
    for (const p of L.placements) { const [dr, dc] = DIRS8[p.dir]; for (let i = 0; i < p.word.length; i++) used.add(`${p.row + dr * i},${p.col + dc * i}`); }
    for (let r = 0; r < L.grid.length; r++) for (let c = 0; c + 4 <= L.grid.length; c++) if ([0, 1, 2, 3].every((i) => !used.has(`${r},${c + i}`))) { const row = L.grid[r].split(''); 'HELL'.split('').forEach((ch, i) => { row[c + i] = ch; }); L.grid[r] = row.join(''); return; } }, /filler spells "HELL"/);
  add('a logic puzzle with two solutions (a clue removed)', 'logicpuzzle', (d) => { const p = d.puzzles.find((x) => x.type !== 'cages'); p.clues.pop(); }, /more than one solution/);
  add('a cage puzzle with two solutions (each row one cage)', 'logicpuzzle', (d) => { const p = d.puzzles.find((x) => x.type === 'cages'); if (!p) return; const n = Number(p.size); p.cages = [...Array(n).keys()].map((r) => ({ cells: [...Array(n).keys()].map((c) => String.fromCharCode(65 + r) + (c + 1)), op: '+', target: (n * (n + 1)) / 2 })); }, /more than one solution/);
  add('a logic clue that doesn\'t name its items', 'logicpuzzle', (d) => { const p = d.puzzles.find((x) => x.type !== 'cages'); const c = p.clues.find((x) => !x.because); c.text = 'Somebody presented on some day.'; }, /doesn't name/);
  add('a quiz-show clue with no answer', 'quizshow', (d) => { d.board.categories[0].clues[0].answer = ''; }, /no answer/);
  add('a quiz-show clue that gives its answer away', 'quizshow', (d) => { const q = d.board.categories[1].clues[2]; q.clue = `${q.clue} (Hint: ${q.answer})`; }, /gives away/);
  add('the trademarked show name', 'quizshow', (d) => { d.title = 'Cells Jeopardy'; }, /trademarked/);
  const before = new Set(checkPack(pack).errors);
  for (const [what, p, expect] of cases) {
    const fresh = checkPack(p).errors.filter((e) => !before.has(e));
    const hit = expect ? fresh.find((e) => expect.test(e)) : fresh[0];
    out.push([what, !!hit, hit]);
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!file) { console.error('usage: node checks/puzzles.mjs <pack.json> [--self-test]'); process.exit(1); }
  const pack = JSON.parse(readFileSync(file, 'utf8'));
  const r = checkPack(pack);
  if (!r.games) { console.log(`${file}: no games or puzzles in this pack`); }
  else {
    for (const m of r.notes) console.log(`  · ${m}`);
    for (const m of r.warnings) console.log(`  ⚠ ${m}`);
    for (const m of r.errors) console.log(`  ✗ ${m}`);
    console.log(r.errors.length ? `PUZZLES FAIL: ${r.errors.length} problem(s)` : `puzzles pass (${r.games} game/puzzle document(s), ${r.warnings.length} warning(s))`);
  }
  let bad = r.errors.length > 0;
  if (process.argv.includes('--self-test')) {
    for (const [what, caught, first] of selfTest(pack)) {
      console.log(`  ${caught ? '✓ catches' : '✗ MISSES'} ${what}${caught ? ` (${first})` : ''}`);
      if (!caught) bad = true;
    }
  }
  process.exit(bad ? 1 : 0);
}
