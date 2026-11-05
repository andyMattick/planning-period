// Solvers for logic puzzles: they prove a puzzle has exactly one solution and write a short solve path for the key.
//
// 1. Grid logic ("type": "grid"): categories × items, clues. Every clue has its text (what students read) and a `rule`
//    the solver reads. Items are named by their exact text; every item name is different across the whole puzzle.
//      { "same": [a, b] }                    a and b belong together
//      { "not": [a, b] }                     a and b do not belong together
//      { "either": [a, [b, c, …]] }          a belongs with one of b, c, …
//      { "pairs": [[a, b], [x, y]] }         of a and b, one is x and the other is y
//      { "different": [a, b, c, …] }         all belong to different rows
//      { "less": [a, b], "cat": C, "by": k } in ordered category C (its items in order), a's is before b's (by exactly k steps)
//      { "next": [a, b], "cat": C }          a's and b's are side by side in C
//    solveGrid(p) -> { count (stops at 2), solution (rows of item names, one per item of the first category), path, errors }
//
// 2. Cage puzzles ("type": "cages", KenKen-style): an n × n grid, each row and column holds 1..n once, and each cage's
//    numbers make its target with its operation (+, -, ×, ÷; "=" for one square). Cells are "A1" (row letter, column number).
//    solveCages(p) -> { count (stops at 2), solution (rows of numbers), path, errors }

/* ---------------- grid logic ---------------- */

function perms(n) {
  const out = [];
  const a = [...Array(n).keys()];
  const go = (k) => {
    if (k === n) { out.push([...a]); return; }
    for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; go(k + 1); [a[k], a[i]] = [a[i], a[k]]; }
  };
  go(0);
  return out;
}

export function gridModel(p) {
  const errors = [];
  const cats = p.categories || [];
  const n = cats[0]?.items?.length || 0;
  const where = new Map(); // item -> [cat, index]
  cats.forEach((c, ci) => {
    if ((c.items || []).length !== n) errors.push(`category "${c.name}" has ${(c.items || []).length} items; every category needs ${n}`);
    (c.items || []).forEach((it, ii) => {
      const k = String(it).toLowerCase();
      if (where.has(k)) errors.push(`item "${it}" is in the puzzle twice (every item name must be different)`);
      where.set(k, [ci, ii]);
    });
  });
  if (cats.length < 2) errors.push('a grid puzzle needs at least 2 categories');
  if (n < 2) errors.push('a grid puzzle needs at least 2 items per category');
  if (cats.length > 5 || n > 6) errors.push('a grid puzzle can have at most 5 categories of at most 6 items (the solver and the page)');
  const loc = (name) => where.get(String(name).toLowerCase());
  const catIndex = (name) => cats.findIndex((c) => String(c.name).toLowerCase() === String(name).toLowerCase());
  return { cats, n, loc, catIndex, errors };
}

const RULES = ['same', 'not', 'either', 'pairs', 'different', 'less', 'next'];

// The items a rule names, for checking them against the clue's text.
export function ruleItems(rule) {
  const k = RULES.find((r) => r in (rule || {}));
  if (!k) return [];
  return [rule[k]].flat(3).map(String);
}

// rule -> { cats: categories it needs assigned, test(row) } where row(item) gives the row (index in category 0) of an item
export function compileRule(rule, M, errors, label) {
  const kind = RULES.find((r) => r in (rule || {}));
  if (!kind) { errors.push(`${label}: no rule the solver knows (${RULES.join(', ')})`); return null; }
  const items = ruleItems(rule);
  for (const it of items) if (!M.loc(it)) errors.push(`${label}: "${it}" is not an item in the puzzle`);
  if (items.some((it) => !M.loc(it))) return null;
  const cats = new Set(items.map((it) => M.loc(it)[0]));
  let ord = -1;
  if (kind === 'less' || kind === 'next') {
    ord = M.catIndex(rule.cat);
    if (ord < 0) { errors.push(`${label}: "${rule.cat}" is not a category`); return null; }
    cats.add(ord);
  }
  const v = rule[kind];
  const test = (row) => {
    switch (kind) {
      case 'same': return row(v[0]) === row(v[1]);
      case 'not': return row(v[0]) !== row(v[1]);
      case 'either': return v[1].some((b) => row(v[0]) === row(b));
      case 'pairs': {
        const [[a, b], [x, y]] = v;
        return row(a) !== row(b) && ((row(a) === row(x) && row(b) === row(y)) || (row(a) === row(y) && row(b) === row(x)));
      }
      case 'different': return new Set(v.map(row)).size === v.length;
      case 'less':
      case 'next': {
        // the position, in the ordered category, of the item there that shares a's row
        const pos = (it) => row.posIn(ord, row(it));
        const d = pos(v[1]) - pos(v[0]);
        if (kind === 'next') return Math.abs(d) === 1;
        return rule.by != null ? d === Number(rule.by) : d > 0;
      }
    }
    return false;
  };
  return { cats: [...cats], test, kind };
}

// Enumerate assignments: perm[c][i] = index (in category c) of the item in row i. Category 0 is the rows.
export function enumerate(M, rules, facts, limit = Infinity) {
  const k = M.cats.length, n = M.n;
  const P = perms(n);
  const perm = Array(k).fill(null);
  perm[0] = [...Array(n).keys()];
  const inv = Array(k).fill(null);
  inv[0] = perm[0];
  const row = (it) => { const [c, i] = M.loc(it); return inv[c][i]; };
  row.posIn = (c, r) => perm[c][r];
  const ready = rules.map((r) => Math.max(...r.cats));
  const factList = facts ? [...facts.entries()].map(([key, val]) => { const [a, b] = key.split('|'); return { a, b, val, c: Math.max(M.loc(a)[0], M.loc(b)[0]) }; }) : [];
  const out = [];
  const go = (c) => {
    if (out.length >= limit) return;
    if (c === k) { out.push(perm.slice(1).map((p) => [...p])); return; }
    for (const p of P) {
      perm[c] = p;
      const iv = Array(n);
      p.forEach((x, r) => { iv[x] = r; });
      inv[c] = iv;
      let ok = true;
      for (const f of factList) if (f.c === c && (row(f.a) === row(f.b)) !== f.val) { ok = false; break; }
      if (ok) for (let i = 0; i < rules.length; i++) if (ready[i] === c && !rules[i].test(row)) { ok = false; break; }
      if (ok) go(c + 1);
      if (out.length >= limit) return;
    }
    perm[c] = null;
    inv[c] = null;
  };
  go(1);
  return out;
}

// pair facts that hold in every assignment: "a|b" -> true (together) / false (not)
function commonFacts(M, sols) {
  const out = new Map();
  if (!sols.length) return out;
  const k = M.cats.length, n = M.n;
  for (let c1 = 0; c1 < k; c1++) for (let c2 = c1 + 1; c2 < k; c2++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const together = (s) => {
      const r1 = c1 === 0 ? i : s[c1 - 1].indexOf(i);
      const r2 = s[c2 - 1].indexOf(j);
      return r1 === r2;
    };
    const v = together(sols[0]);
    if (sols.every((s) => together(s) === v)) out.set(`${M.cats[c1].items[i]}|${M.cats[c2].items[j]}`, v);
  }
  return out;
}

function solutionRows(M, sol) {
  return M.cats[0].items.map((it, r) => [it, ...sol.map((p, c) => M.cats[c + 1].items[p[r]])]);
}

export function solveGrid(p) {
  const M = gridModel(p);
  const errors = [...M.errors];
  if (errors.length) return { count: 0, errors, path: [] };
  const clues = (p.clues || []).map((c, i) => ({ text: typeof c === 'string' ? c : c.text, rule: c.rule, i }));
  const rules = clues.map((c) => compileRule(c.rule, M, errors, `clue ${c.i + 1}`));
  if (errors.length) return { count: 0, errors, path: [] };
  const all = enumerate(M, rules, null, 2);
  const res = { count: all.length, errors, path: [], warnings: [] };
  if (all.length !== 1) return res;
  res.solution = solutionRows(M, all[0]);

  // clues that aren't needed (the puzzle is still unique without them): fine, but the teacher may want to know
  rules.forEach((r, i) => {
    const without = rules.filter((_, j) => j !== i);
    if (enumerate(M, without, null, 2).length === 1) res.warnings.push(`clue ${i + 1} is not needed: the puzzle has one solution without it`);
  });

  // a short solve path: take the clues one at a time (the first that tells something new), with what is known so far
  const facts = new Map();
  const total = M.cats.length * (M.cats.length - 1) / 2 * M.n * M.n;
  const used = new Set();
  for (let step = 0; step < 40 && facts.size < total; step++) {
    let found = null;
    for (const c of clues) {
      const sols = enumerate(M, [rules[c.i]], facts);
      const f = commonFacts(M, sols);
      const fresh = [...f].filter(([key]) => !facts.has(key));
      if (fresh.length) { found = { c, fresh }; break; }
    }
    if (!found) {
      // no single clue says more: put them all together (try the cases)
      const sols = enumerate(M, rules, facts);
      const fresh = [...commonFacts(M, sols)].filter(([key]) => !facts.has(key));
      if (!fresh.length) break;
      found = { c: null, fresh };
    }
    for (const [key, v] of found.fresh) facts.set(key, v);
    const yes = found.fresh.filter(([, v]) => v).map(([key]) => key.replace('|', ' = '));
    const noList = found.fresh.filter(([, v]) => !v).map(([key]) => key.replace('|', ' ≠ '));
    const no = noList.length <= 3 && !yes.length ? noList.join('; ') : noList.length ? `${noList.length} ✗ in the grid` : '';
    const why = found.c ? `Clue ${found.c.i + 1}${used.has(found.c.i) ? ' again, with what we know now' : ''}` : 'All the clues together (try each case)';
    if (found.c) used.add(found.c.i);
    res.path.push({ clue: found.c ? found.c.i + 1 : null, text: `${why}: ${[yes.join('; '), no].filter(Boolean).join(', and ')}.` });
  }
  return res;
}

/* ---------------- cage puzzles (KenKen-style) ---------------- */

export const opText = (op) => ({ '-': '−', x: '×', '*': '×', '/': '÷', '=': '' })[op] ?? op;

const cellRC = (s) => {
  const m = /^([A-Z])(\d+)$/i.exec(String(s).trim());
  return m ? [m[1].toUpperCase().charCodeAt(0) - 65, Number(m[2]) - 1] : null;
};
export const cellName = (r, c) => `${String.fromCharCode(65 + r)}${c + 1}`;

function cageOk(cage, vals, complete) {
  const t = Number(cage.target);
  const op = cage.op;
  if (op === '=' ) return !complete || vals[0] === t;
  if (op === '+') { const s = vals.reduce((a, b) => a + b, 0); return complete ? s === t : s <= t; }
  if (op === '×' || op === 'x' || op === '*') { const s = vals.reduce((a, b) => a * b, 1); return complete ? s === t : t % s === 0; }
  if (op === '-' || op === '−') return !complete || Math.abs(vals[0] - vals[1]) === t;
  if (op === '÷' || op === '/') return !complete || Math.max(...vals) / Math.min(...vals) === t;
  return false;
}

export function cageModel(p) {
  const errors = [];
  const n = Number(p.size);
  if (!(n >= 3 && n <= 7)) errors.push('a cage puzzle is 3×3 to 7×7');
  const owner = Array.from({ length: n || 0 }, () => Array(n || 0).fill(-1));
  const cages = (p.cages || []).map((cg, ci) => {
    const cells = (cg.cells || []).map(cellRC);
    if (cells.some((x) => !x || x[0] >= n || x[1] >= n)) errors.push(`cage ${ci + 1}: a cell is not on the ${n}×${n} grid`);
    const op = cg.op || (cells.length === 1 ? '=' : '');
    if (!['+', '-', '−', '×', 'x', '*', '÷', '/', '='].includes(op)) errors.push(`cage ${ci + 1}: unknown operation "${cg.op}"`);
    if (['-', '−', '÷', '/'].includes(op) && cells.length !== 2) errors.push(`cage ${ci + 1}: a ${op} cage has exactly 2 squares`);
    if (op === '=' && cells.length !== 1) errors.push(`cage ${ci + 1}: a cage with no operation has 1 square`);
    if (!Number.isInteger(Number(cg.target)) || Number(cg.target) < 0) errors.push(`cage ${ci + 1}: the target must be a whole number`);
    return { ...cg, op, cells: cells.filter(Boolean), i: ci };
  });
  if (errors.length) return { n, cages, owner, errors };
  for (const cg of cages) for (const [r, c] of cg.cells) {
    if (owner[r][c] >= 0) errors.push(`${cellName(r, c)} is in two cages`);
    owner[r][c] = cg.i;
  }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (owner[r][c] < 0) errors.push(`${cellName(r, c)} is in no cage`);
  for (const cg of cages) {
    // the squares of a cage touch (side by side)
    const set = new Set(cg.cells.map(([r, c]) => `${r},${c}`));
    const seen = new Set([[...set][0]]);
    const stack = [[...set][0]];
    while (stack.length) {
      const [r, c] = stack.pop().split(',').map(Number);
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${r + dr},${c + dc}`;
        if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push(k); }
      }
    }
    if (seen.size !== set.size) errors.push(`cage ${cg.i + 1}: its squares don't all touch`);
  }
  return { n, cages, owner, errors };
}

export function solveCages(p) {
  const M = cageModel(p);
  if (M.errors.length) return { count: 0, errors: M.errors, path: [] };
  const { n, cages, owner } = M;
  const g = Array.from({ length: n }, () => Array(n).fill(0));
  const sols = [];
  const order = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) order.push([r, c]);
  const go = (k) => {
    if (sols.length >= 2) return;
    if (k === order.length) { sols.push(g.map((row) => [...row])); return; }
    const [r, c] = order[k];
    for (let v = 1; v <= n; v++) {
      if (g[r].includes(v) || g.some((row) => row[c] === v)) continue;
      g[r][c] = v;
      const cg = cages[owner[r][c]];
      const vals = cg.cells.map(([rr, cc]) => g[rr][cc]).filter(Boolean);
      if (cageOk(cg, vals, vals.length === cg.cells.length)) go(k + 1);
      g[r][c] = 0;
    }
  };
  go(0);
  const res = { count: sols.length, errors: [], path: [] };
  if (sols.length !== 1) return res;
  res.solution = sols[0];

  // the solve path: candidates per square, narrowed by cages, rows and columns, until every square has one number
  const cand = Array.from({ length: n }, () => Array.from({ length: n }, () => new Set([...Array(n)].map((_, i) => i + 1))));
  const placedNote = (r, c, v, why) => res.path.push({ text: `${cellName(r, c)} = ${v} (${why})` });
  const done = new Set();
  const fix = (r, c, v, why) => {
    if (done.has(`${r},${c}`)) return false;
    done.add(`${r},${c}`);
    cand[r][c] = new Set([v]);
    for (let i = 0; i < n; i++) { if (i !== c) cand[r][i].delete(v); if (i !== r) cand[i][c].delete(v); }
    placedNote(r, c, v, why);
    return true;
  };
  const told = new Set();
  for (const cg of cages) if (cg.op === '=') fix(cg.cells[0][0], cg.cells[0][1], Number(cg.target), 'a one-square cage');
  for (let round = 0; round < 60 && done.size < n * n; round++) {
    let progress = false;
    // cages: keep only numbers that appear in some way of making the target that fits the rows and columns
    for (const cg of cages) {
      const keep = cg.cells.map(() => new Set());
      const vals = [];
      const walk = (i) => {
        if (i === cg.cells.length) {
          if (!cageOk(cg, vals, true)) return;
          for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) {
            const [ra, ca] = cg.cells[a], [rb, cb] = cg.cells[b];
            if ((ra === rb || ca === cb) && vals[a] === vals[b]) return;
          }
          vals.forEach((v, j) => keep[j].add(v));
          return;
        }
        const [r, c] = cg.cells[i];
        for (const v of cand[r][c]) { vals.push(v); walk(i + 1); vals.pop(); }
      };
      walk(0);
      let cut = false;
      cg.cells.forEach(([r, c], j) => {
        for (const v of [...cand[r][c]]) if (!keep[j].has(v)) { cand[r][c].delete(v); progress = true; cut = true; }
      });
      const can = [...new Set(keep.flatMap((k) => [...k]))].sort((a, b) => a - b);
      if (cut && cg.op !== '=' && !told.has(cg.i) && can.length < n && cg.cells.some(([r, c]) => !done.has(`${r},${c}`))) {
        told.add(cg.i);
        res.path.push({ text: `The ${cg.target}${opText(cg.op)} cage (${cg.cells.map(([r, c]) => cellName(r, c)).join(', ')}) can only use ${can.slice(0, -1).join(', ')}${can.length > 1 ? ' and ' : ''}${can[can.length - 1]}.` });
      }
    }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!done.has(`${r},${c}`) && cand[r][c].size === 1) {
        const cg = cages[owner[r][c]];
        progress = fix(r, c, [...cand[r][c]][0], `the ${cg.target}${opText(cg.op)} cage and the row and column leave only this`) || progress;
      }
    }
    for (let v = 1; v <= n; v++) for (let i = 0; i < n; i++) {
      const inRow = [...Array(n).keys()].filter((c) => cand[i][c].has(v));
      if (inRow.length === 1 && !done.has(`${i},${inRow[0]}`)) progress = fix(i, inRow[0], v, `the only square in row ${String.fromCharCode(65 + i)} that can be ${v}`) || progress;
      const inCol = [...Array(n).keys()].filter((r) => cand[r][i].has(v));
      if (inCol.length === 1 && !done.has(`${inCol[0]},${i}`)) progress = fix(inCol[0], i, v, `the only square in column ${i + 1} that can be ${v}`) || progress;
    }
    if (!progress) break;
  }
  if (done.size < n * n) res.path.push({ text: `The other ${n * n - done.size} squares: try a number in one square and follow it; only one choice works.` });
  return res;
}
