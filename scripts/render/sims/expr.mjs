// A small, safe calculator for lab simulations (docs/KINDS-LABS.md, "Simulations"). A model is a formula the maker
// writes ("120 * 2^(-(T - 20) / 10)"); it is parsed here into a tree of numbers, names, operators and a fixed list of
// math functions, never run as code, so nothing in a pack can make a student's page do anything else. The same source
// runs in Node (checks/labs.mjs) and in the simulation page (scripts/render/lab.mjs inlines it without the exports).

const FUNCS = {
  sqrt: Math.sqrt, exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10, abs: Math.abs,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: Math.min, max: Math.max, pow: Math.pow,
};
const CONSTS = { pi: Math.PI, e: Math.E };

export function parseExpr(src) {
  const s = String(src ?? '');
  if (s.length > 400) throw new Error('the formula is longer than 400 characters');
  const toks = [];
  const re = /\s*(?:(\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(\*\*|[-+*/^(),]))/y;
  let i = 0;
  while (i < s.length) {
    if (/^\s*$/.test(s.slice(i))) break;
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) throw new Error(`can't read "${s.slice(i, i + 12).trim()}"`);
    toks.push(m[1] != null ? { t: 'num', v: Number(m[1]) } : m[2] != null ? { t: 'name', v: m[2] } : { t: 'op', v: m[3] === '**' ? '^' : m[3] });
    i = re.lastIndex;
  }
  let p = 0;
  const peek = () => toks[p], take = () => toks[p++];
  const want = (v) => { const k = take(); if (!k || k.v !== v) throw new Error(`expected "${v}"`); };
  function primary() {
    const k = take();
    if (!k) throw new Error('the formula ends too soon');
    if (k.t === 'num') return { n: k.v };
    if (k.t === 'name') {
      if (peek() && peek().v === '(') {
        if (!Object.prototype.hasOwnProperty.call(FUNCS, k.v)) throw new Error(`unknown function "${k.v}"`);
        take(); const args = [];
        if (peek() && peek().v !== ')') { args.push(add()); while (peek() && peek().v === ',') { take(); args.push(add()); } }
        want(')');
        return { f: k.v, args };
      }
      return Object.prototype.hasOwnProperty.call(CONSTS, k.v) ? { n: CONSTS[k.v] } : { v: k.v };
    }
    if (k.v === '(') { const e = add(); want(')'); return e; }
    if (k.v === '-') return { neg: power() };
    if (k.v === '+') return power();
    throw new Error(`unexpected "${k.v}"`);
  }
  function power() { const b = primary(); if (peek() && peek().v === '^') { take(); return { op: '^', a: b, b: unary() }; } return b; }
  function unary() { if (peek() && peek().v === '-') { take(); return { neg: unary() }; } if (peek() && peek().v === '+') { take(); return unary(); } return power(); }
  function mul() { let a = unary(); while (peek() && (peek().v === '*' || peek().v === '/')) { const op = take().v; a = { op, a, b: unary() }; } return a; }
  function add() { let a = mul(); while (peek() && (peek().v === '+' || peek().v === '-')) { const op = take().v; a = { op, a, b: mul() }; } return a; }
  const tree = add();
  if (p < toks.length) throw new Error(`unexpected "${toks[p].v}"`);
  return tree;
}

// the names a formula reads (to check them against the simulation's inputs and earlier outputs)
export function namesIn(tree, out = new Set()) {
  if (tree.v != null) out.add(tree.v);
  for (const k of ['a', 'b', 'neg']) if (tree[k]) namesIn(tree[k], out);
  (tree.args || []).forEach((x) => namesIn(x, out));
  return out;
}

export function evalExpr(tree, vars) {
  if (tree.n != null) return tree.n;
  if (tree.v != null) { if (!Object.prototype.hasOwnProperty.call(vars, tree.v)) throw new Error(`unknown name "${tree.v}"`); return Number(vars[tree.v]); }
  if (tree.neg) return -evalExpr(tree.neg, vars);
  if (tree.f) return FUNCS[tree.f](...tree.args.map((x) => evalExpr(x, vars)));
  const a = evalExpr(tree.a, vars), b = evalExpr(tree.b, vars);
  switch (tree.op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return a / b; case '^': return Math.pow(a, b); }
  throw new Error('bad formula');
}

// A small seeded random generator (mulberry32) and a normal draw, so a trial's noise can be replayed in a test.
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function normal(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// One trial: every output from the inputs (and earlier outputs), with relative noise (sim.noise, e.g. 0.05 = ±5% typical).
export function runTrial(sim, inputs, r) {
  const vars = { ...inputs };
  const out = {};
  for (const o of sim.outputs) {
    let y = evalExpr(o.tree || parseExpr(o.expr), vars);
    const n = o.noise ?? sim.noise ?? 0;
    if (r && n) y = y * (1 + n * normal(r));
    if (o.min != null) y = Math.max(o.min, y);
    vars[o.id] = y; out[o.id] = y;
  }
  return out;
}
