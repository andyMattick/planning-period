// Word search generator. Deterministic with a seed.
//
//   buildWordSearch({ words, seed, size, grade, directions }) ->
//     { size, grid: ["ABCD…", …], placements: [{ word, display, row, col, dir }], directions: [...], seed, unplaced: [...] }
//
// Directions by grade (a teacher's `directions` list wins): K–2 across and down; 3–5 adds down-right diagonals;
// 6–8 adds up-right diagonals, backwards and up; 9–12 all eight.
// Filler letters never spell a listed word a second time, in any of the eight directions, and never spell a word on
// the blocklist (checks/puzzles.mjs checks both again, on its own).

import { makeRng, lettersOf } from './rng.mjs';

export const DIR_VEC = {
  E: [0, 1], S: [1, 0], SE: [1, 1], NE: [-1, 1], W: [0, -1], N: [-1, 0], NW: [-1, -1], SW: [1, -1],
};
export const DIR_NAME = { E: 'across', S: 'down', SE: 'diagonal down-right', NE: 'diagonal up-right', W: 'backwards', N: 'up', NW: 'diagonal up-left', SW: 'diagonal down-left' };

// Short and plain on purpose: words a random grid of letters could spell that a teacher wouldn't want on a handout.
export const BLOCKLIST = ['ASS', 'FUCK', 'FUK', 'SHIT', 'DAMN', 'HELL', 'PISS', 'CRAP', 'DICK', 'COCK', 'CUNT', 'TIT', 'TITS', 'CUM',
  'SEX', 'FAG', 'SLUT', 'WHORE', 'BITCH', 'NAZI', 'KKK', 'PORN', 'BOOB', 'PENIS', 'RAPE', 'KILL', 'DIE', 'GUN', 'HATE', 'NIG', 'POOP', 'BUTT', 'PEE', 'TURD', 'WTF', 'STFU'];

export function directionsFor(grade) {
  const g = /^k$/i.test(String(grade).trim()) ? 0 : Number.parseInt(grade, 10);
  if (!Number.isFinite(g) || g <= 2) return ['E', 'S'];
  if (g <= 5) return ['E', 'S', 'SE'];
  if (g <= 8) return ['E', 'S', 'SE', 'NE', 'W', 'N'];
  return Object.keys(DIR_VEC);
}

export function sizeFor(grade, longest) {
  const g = /^k$/i.test(String(grade).trim()) ? 0 : Number.parseInt(grade, 10);
  const base = !Number.isFinite(g) || g <= 2 ? 10 : g <= 5 ? 12 : 15;
  return Math.max(base, longest);
}

// Every place a string reads in the grid, in all eight directions: [{ row, col, dir, cells: ["r,c", …] }].
export function findAll(grid, word) {
  const n = grid.length, out = [];
  if (!word) return out;
  for (let r = 0; r < n; r++) for (let c = 0; c < grid[r].length; c++) {
    if (grid[r][c] !== word[0]) continue;
    for (const [dir, [dr, dc]] of Object.entries(DIR_VEC)) {
      let ok = true;
      const cells = [];
      for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i, cc = c + dc * i;
        if (rr < 0 || cc < 0 || rr >= n || cc >= grid[rr].length || grid[rr][cc] !== word[i]) { ok = false; break; }
        cells.push(`${rr},${cc}`);
      }
      if (ok) out.push({ row: r, col: c, dir, cells });
    }
  }
  // a one-letter-long or palindrome word reads both ways over the same squares: count it once
  const seen = new Set();
  return out.filter((o) => { const k = [...o.cells].sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
}

export function buildWordSearch({ words, seed = 1, size, grade, directions, attempts = 60 } = {}) {
  const list = [];
  const seen = new Set();
  for (const w of words || []) {
    const display = typeof w === 'string' ? w : w.word;
    const word = lettersOf(display);
    if (word.length < 2 || seen.has(word)) continue;
    seen.add(word);
    list.push({ word, display: String(display).trim() });
  }
  const dirs = directions?.length ? directions.filter((d) => DIR_VEC[d]) : directionsFor(grade);
  const longest = Math.max(0, ...list.map((w) => w.word.length));
  const n = Number(size) || sizeFor(grade, longest);
  const rng = makeRng(`wordsearch:${seed}`);
  const sorted = [...list].sort((a, b) => b.word.length - a.word.length);

  for (let t = 0; t < attempts; t++) {
    const grid = Array.from({ length: n }, () => Array(n).fill(null));
    const placements = [];
    const unplaced = [];
    for (const w of sorted) {
      let done = false;
      const tries = [];
      for (let k = 0; k < 400; k++) tries.push([rng.pick(dirs), rng.int(n), rng.int(n)]);
      // prefer spots that share a letter with a word already down (a tighter, harder grid), then any spot that fits
      let bestTry = null;
      for (const [dir, r, c] of tries) {
        const [dr, dc] = DIR_VEC[dir];
        const er = r + dr * (w.word.length - 1), ec = c + dc * (w.word.length - 1);
        if (er < 0 || ec < 0 || er >= n || ec >= n) continue;
        let ok = true, shared = 0;
        for (let i = 0; i < w.word.length; i++) {
          const ch = grid[r + dr * i][c + dc * i];
          if (ch && ch !== w.word[i]) { ok = false; break; }
          if (ch) shared++;
        }
        if (!ok || shared === w.word.length) continue;
        const score = shared * 3 + rng();
        if (!bestTry || score > bestTry.score) bestTry = { dir, r, c, score };
        if (shared === 0 && rng() < 0.15) break;
      }
      if (bestTry) {
        const [dr, dc] = DIR_VEC[bestTry.dir];
        for (let i = 0; i < w.word.length; i++) grid[bestTry.r + dr * i][bestTry.c + dc * i] = w.word[i];
        placements.push({ word: w.word, display: w.display, row: bestTry.r, col: bestTry.c, dir: bestTry.dir });
        done = true;
      }
      if (!done) unplaced.push(w.display);
    }
    if (unplaced.length && t < attempts - 1) continue;

    // filler, then fix any accidental second copy of a listed word or any blocklisted word
    const filler = new Set();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!grid[r][c]) { filler.add(`${r},${c}`); grid[r][c] = String.fromCharCode(65 + rng.int(26)); }
    const wordCells = placements.map((p) => {
      const [dr, dc] = DIR_VEC[p.dir];
      return new Set(Array.from({ length: p.word.length }, (_, i) => `${p.row + dr * i},${p.col + dc * i}`));
    });
    let clean = false;
    for (let round = 0; round < 400 && !clean; round++) {
      const g = grid.map((row) => row.join(''));
      const bad = [];
      placements.forEach((p) => {
        for (const o of findAll(g, p.word)) {
          if (o.cells.every((k) => wordCells[placements.indexOf(p)].has(k))) continue; // the placed copy
          // a copy sitting entirely inside a longer listed word (ION inside IONIC) is part of that word, not a second copy
          if (wordCells.some((set, j) => placements[j].word.length > p.word.length && placements[j].word.includes(p.word) && o.cells.every((k) => set.has(k)))) continue;
          bad.push(o.cells);
        }
      });
      for (const b of BLOCKLIST) for (const o of findAll(g, b)) if (o.cells.some((k) => filler.has(k))) bad.push(o.cells);
      if (!bad.length) { clean = true; break; }
      for (const cells of bad) {
        const free = cells.filter((k) => filler.has(k));
        if (!free.length) continue; // made only of listed words' letters: a new layout is needed
        const [r, c] = rng.pick(free).split(',').map(Number);
        grid[r][c] = String.fromCharCode(65 + rng.int(26));
      }
      if (bad.every((cells) => !cells.some((k) => filler.has(k)))) break;
    }
    if (!clean) continue;
    return { size: n, grid: grid.map((row) => row.join('')), placements, directions: dirs, seed, unplaced, attempt: t + 1 };
  }
  return { size: n, grid: [], placements: [], directions: dirs, seed, unplaced: list.map((w) => w.display), error: 'no clean grid found' };
}
