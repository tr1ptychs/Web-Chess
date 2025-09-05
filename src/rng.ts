export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRNG(seed: string | number) {
  const n = typeof seed === "number" ? seed : seedFromString(seed);
  const r = mulberry32(n);
  return {
    nextFloat: () => r(),
    choice<T>(arr: T[]): T {
      return arr[Math.floor(r() * arr.length)];
    },
  };
}
