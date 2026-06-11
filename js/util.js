/* Roadtrip — shared helpers: math, deterministic hashing/noise, color. */
window.U = (() => {
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  /* Deterministic integer hash -> [0,1). Same seed = same scenery at any
     window size, which keeps the world stable across resizes. */
  function hash1(n) {
    n = Math.imul(n ^ (n >>> 15), 2246822519);
    n = Math.imul(n ^ (n >>> 13), 3266489917);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  const hash2 = (a, b) => hash1(Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263));

  /* 1D value noise + fractal sum, used for every ridge line. */
  function noise1(x, seed) {
    const i = Math.floor(x), f = x - i;
    return lerp(hash2(i, seed), hash2(i + 1, seed), smooth(f));
  }
  function fbm(x, seed, oct) {
    oct = oct || 3;
    let v = 0, amp = 0.5, fr = 1, norm = 0;
    for (let o = 0; o < oct; o++) {
      v += amp * noise1(x * fr, seed + o * 101);
      norm += amp; amp *= 0.5; fr *= 2.03;
    }
    return v / norm; // 0..1
  }

  /* Small fast PRNG for per-chunk item placement. */
  function rng(seed) {
    let s = (seed * 4294967296) >>> 0 || 1;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Colors are [r,g,b] arrays 0-255 so we can lerp them cheaply per frame. */
  function col(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (c1, c2, t) => [
    lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)
  ];
  const scale = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  /* saturate (k>1) / desaturate (k<1) around the color's own luma */
  const sat = (c, k) => {
    const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return [
      clamp(l + (c[0] - l) * k, 0, 255),
      clamp(l + (c[1] - l) * k, 0, 255),
      clamp(l + (c[2] - l) * k, 0, 255),
    ];
  };
  const css = (c, a) => a === undefined
    ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  return { TAU, clamp, lerp, smooth, hash1, hash2, noise1, fbm, rng, col, mix, scale, sat, css };
})();
