// A small seeded random number generator, so a puzzle made from the same pack and seed is always the same puzzle.

export function hashString(s) {
  let h = 2166136261 >>> 0;
  for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// mulberry32
export function makeRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashString(seed)) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.shuffle = (arr) => {
    const a2 = [...arr];
    for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; }
    return a2;
  };
  return next;
}

// The letters a puzzle uses: "Cell membrane" -> "CELLMEMBRANE".
export const lettersOf = (s) => String(s || '').toUpperCase().normalize('NFKD').replace(/[^A-Z]/g, '');
// "(4, 8)" for a two-word answer, "(12)" for one word.
export function lengthLabel(display) {
  const parts = String(display || '').trim().split(/[\s-]+/).map(lettersOf).filter(Boolean);
  return `(${parts.map((p) => p.length).join(', ')})`;
}
