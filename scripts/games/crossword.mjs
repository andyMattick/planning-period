// Crossword generator: words + clues in, a connected grid out. Deterministic: the same words and seed give the same grid.
//
//   buildCrossword({ words: [{ answer, clue }], seed, size }) ->
//     { rows, cols, grid: ["CELL....", ...] ('.' = no square), entries: [{ n, dir, row, col, answer, display, clue }],
//       unplaced: [{ answer, clue, reason }], symmetry, attempts, seed }
//
// Rules the grid keeps (checks/puzzles.mjs checks them again, on its own):
//   - every word crosses another (one connected grid), letters only meet where two entries cross;
//   - no two letters touch side by side unless they belong to the same entry, so no stray words form;
//   - the grid fits in size × size (default 15); among the layouts that place the most words it prefers more
//     crossings, a smaller box and more 180° symmetry ("symmetric if possible": freeform grids rarely are exactly).

import { makeRng, lettersOf } from './rng.mjs';

const DIRS = { across: [0, 1], down: [1, 0] };

function tryLayout(words, rng, maxSize) {
  const cells = new Map(); // "r,c" -> letter
  const owner = new Map(); // "r,c" -> Set of dirs using the cell
  const placed = [];
  let minR = 0, maxR = 0, minC = 0, maxC = 0;
  const key = (r, c) => `${r},${c}`;
  const at = (r, c) => cells.get(key(r, c));

  function fits(w, r, c, dir) {
    const [dr, dc] = DIRS[dir];
    const len = w.letters.length;
    const r2 = r + dr * (len - 1), c2 = c + dc * (len - 1);
    const nMinR = Math.min(minR, r), nMaxR = Math.max(maxR, r2), nMinC = Math.min(minC, c), nMaxC = Math.max(maxC, c2);
    if (placed.length && (nMaxR - nMinR + 1 > maxSize || nMaxC - nMinC + 1 > maxSize)) return null;
    if (at(r - dr, c - dc) || at(r2 + dr, c2 + dc)) return null; // the squares before and after stay empty
    let crossings = 0;
    for (let i = 0; i < len; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      const ch = at(rr, cc);
      if (ch) {
        if (ch !== w.letters[i]) return null;
        if (owner.get(key(rr, cc)).has(dir)) return null; // would run along another word
        crossings++;
      } else {
        // a new letter: nothing beside it across the word's direction
        if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return null;
      }
    }
    if (placed.length && !crossings) return null;
    return { crossings, area: (nMaxR - nMinR + 1) * (nMaxC - nMinC + 1), box: [nMinR, nMaxR, nMinC, nMaxC] };
  }

  function place(w, r, c, dir) {
    const [dr, dc] = DIRS[dir];
    for (let i = 0; i < w.letters.length; i++) {
      const k = key(r + dr * i, c + dc * i);
      cells.set(k, w.letters[i]);
      if (!owner.has(k)) owner.set(k, new Set());
      owner.get(k).add(dir);
    }
    if (!placed.length) { minR = r; minC = c; maxR = r + dr * (w.letters.length - 1); maxC = c + dc * (w.letters.length - 1); }
    else {
      minR = Math.min(minR, r); minC = Math.min(minC, c);
      maxR = Math.max(maxR, r + dr * (w.letters.length - 1)); maxC = Math.max(maxC, c + dc * (w.letters.length - 1));
    }
    placed.push({ ...w, row: r, col: c, dir });
  }

  function bestSpot(w) {
    const options = [];
    for (const [k, ch] of cells) {
      const [cr, cc] = k.split(',').map(Number);
      for (let i = 0; i < w.letters.length; i++) {
        if (w.letters[i] !== ch) continue;
        for (const dir of ['across', 'down']) {
          const [dr, dc] = DIRS[dir];
          const r = cr - dr * i, c = cc - dc * i;
          const f = fits(w, r, c, dir);
          if (f) options.push({ r, c, dir, score: f.crossings * 12 - f.area * 0.08 + rng() * 2 });
        }
      }
    }
    if (!options.length) return null;
    options.sort((a, b) => b.score - a.score);
    return options[0];
  }

  const [first, ...rest] = words;
  if (first.letters.length > maxSize) return null;
  place(first, 0, 0, rng() < 0.5 ? 'across' : 'down');
  let queue = rest;
  for (let pass = 0; pass < 3 && queue.length; pass++) {
    const left = [];
    for (const w of queue) {
      const s = bestSpot(w);
      if (s) place(w, s.r, s.c, s.dir); else left.push(w);
    }
    queue = left;
  }
  return { placed, cells, unplaced: queue, box: [minR, maxR, minC, maxC] };
}

function symmetryOf(grid) {
  const R = grid.length, C = grid[0].length;
  let filled = 0, matched = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (grid[r][c] === '.') continue;
    filled++;
    if (grid[R - 1 - r][C - 1 - c] !== '.') matched++;
  }
  return filled ? matched / filled : 0;
}

// Numbers go on every square that starts an across or down run of 2 or more letters, reading row by row.
export function numberGrid(grid) {
  const R = grid.length, C = grid[0]?.length || 0;
  const L = (r, c) => r >= 0 && c >= 0 && r < R && c < C && grid[r][c] !== '.';
  const nums = {};
  let n = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (!L(r, c)) continue;
    const across = !L(r, c - 1) && L(r, c + 1);
    const down = !L(r - 1, c) && L(r + 1, c);
    if (across || down) nums[`${r},${c}`] = ++n;
  }
  return nums;
}

export function buildCrossword({ words, seed = 1, size = 15, attempts = 300 } = {}) {
  const list = (words || []).map((w, i) => ({ i, answer: lettersOf(w.answer), display: String(w.answer || '').trim(), clue: w.clue, letters: lettersOf(w.answer) }));
  const unusable = list.filter((w) => w.letters.length < 2 || w.letters.length > size);
  const seen = new Set();
  const dupes = [];
  const usable = list.filter((w) => {
    if (w.letters.length < 2 || w.letters.length > size) return false;
    if (seen.has(w.letters)) { dupes.push(w); return false; }
    seen.add(w.letters);
    return true;
  });
  const rng = makeRng(`crossword:${seed}`);
  let best = null;
  // keep trying (up to 5× as long) while the best layout so far still leaves a word out
  for (let t = 0; usable.length && (t < attempts || (best && best.lay.unplaced.length && t < attempts * 5)); t++) {
    // longest words first, with a little shuffle so each attempt tries a new layout
    const order = rng.shuffle(usable).sort((a, b) => b.letters.length - a.letters.length + (rng() - 0.5) * 3);
    const lay = tryLayout(order, rng, size);
    if (!lay) continue;
    const [r0, r1, c0, c1] = lay.box;
    const grid = Array.from({ length: r1 - r0 + 1 }, () => Array(c1 - c0 + 1).fill('.'));
    for (const [k, ch] of lay.cells) { const [r, c] = k.split(',').map(Number); grid[r - r0][c - c0] = ch; }
    const g = grid.map((row) => row.join(''));
    const crossings = [...lay.cells.keys()].length;
    const letters = lay.placed.reduce((s, w) => s + w.letters.length, 0);
    const sym = symmetryOf(g);
    const area = g.length * g[0].length;
    const score = lay.placed.length * 1000 + (letters - crossings) * 6 + sym * 40 - area * 0.3 - Math.abs(g.length - g[0].length) * 2;
    if (!best || score > best.score) best = { score, lay, grid: g, r0, c0, sym, t };
  }
  if (!best) return { rows: 0, cols: 0, grid: [], entries: [], unplaced: list.map((w) => ({ answer: w.display, clue: w.clue, reason: 'no layout' })), symmetry: 0, seed };
  const nums = numberGrid(best.grid);
  const entries = best.lay.placed
    .map((w) => ({ row: w.row - best.r0, col: w.col - best.c0, dir: w.dir, answer: w.letters, display: w.display, clue: w.clue }))
    .map((e) => ({ n: nums[`${e.row},${e.col}`], ...e }))
    .sort((a, b) => (a.dir === b.dir ? a.n - b.n : a.dir === 'across' ? -1 : 1));
  const unplaced = [
    ...unusable.map((w) => ({ answer: w.display, clue: w.clue, reason: w.letters.length < 2 ? 'too short' : `longer than the ${size}-square grid` })),
    ...dupes.map((w) => ({ answer: w.display, clue: w.clue, reason: 'the same word is already in the list' })),
    ...best.lay.unplaced.map((w) => ({ answer: w.display, clue: w.clue, reason: 'no place where it crosses another word' })),
  ];
  return { rows: best.grid.length, cols: best.grid[0].length, grid: best.grid, entries, unplaced, symmetry: Math.round(best.sym * 100) / 100, seed, size };
}
