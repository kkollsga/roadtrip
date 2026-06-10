/* Endless Drive — time-of-day palette. Keyframed sky/light colors over the
   day phase t in [0,1], interpolated per frame. This file sets the mood. */
window.Palette = (() => {
  const C = U.col;

  /* t, sky top, sky horizon, horizon glow, daylight 0..1, fog/haze color,
     ambient (what shadows lean toward), star visibility 0..1 */
  const KEYS = [
    { t: 0.000, top: C('#04060f'), bot: C('#0b1026'), glow: C('#0b1026'), light: 0.12, fog: C('#0a0e20'), amb: C('#141a33'), stars: 1.00 },
    { t: 0.040, top: C('#131a38'), bot: C('#3c2f4e'), glow: C('#7a4a5a'), light: 0.20, fog: C('#241f3a'), amb: C('#2a2440'), stars: 0.65 },
    { t: 0.090, top: C('#3f5783'), bot: C('#ffac6e'), glow: C('#ffc98a'), light: 0.50, fog: C('#c9a08a'), amb: C('#6a5a60'), stars: 0.00 },
    { t: 0.160, top: C('#6fa7d8'), bot: C('#d8ecf4'), glow: C('#fff3c9'), light: 0.88, fog: C('#cfdde8'), amb: C('#c8d4dd'), stars: 0.00 },
    { t: 0.350, top: C('#4e94d4'), bot: C('#bfe2f2'), glow: C('#ffffff'), light: 1.00, fog: C('#d4e4ee'), amb: C('#dde8ee'), stars: 0.00 },
    { t: 0.550, top: C('#5391c8'), bot: C('#c4dfe9'), glow: C('#fff6d8'), light: 0.96, fog: C('#d2e0e8'), amb: C('#d8e2e8'), stars: 0.00 },
    { t: 0.670, top: C('#5f7eb4'), bot: C('#ffd9a3'), glow: C('#ffe2a8'), light: 0.82, fog: C('#e0c8a8'), amb: C('#c0b09a'), stars: 0.00 },
    { t: 0.750, top: C('#4a4a80'), bot: C('#ff8e55'), glow: C('#ff9e5e'), light: 0.58, fog: C('#b08068'), amb: C('#7a6470'), stars: 0.05 },
    { t: 0.820, top: C('#232450'), bot: C('#b45a68'), glow: C('#d06a6a'), light: 0.34, fog: C('#4a3a55'), amb: C('#3a3050'), stars: 0.40 },
    { t: 0.900, top: C('#0a0f28'), bot: C('#1c2750'), glow: C('#1c2750'), light: 0.16, fog: C('#131a33'), amb: C('#1a2140'), stars: 0.95 },
    { t: 1.000, top: C('#04060f'), bot: C('#0b1026'), glow: C('#0b1026'), light: 0.12, fog: C('#0a0e20'), amb: C('#141a33'), stars: 1.00 },
  ];

  function get(t) {
    t = ((t % 1) + 1) % 1;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].t < t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = U.smooth(U.clamp((t - a.t) / (b.t - a.t), 0, 1));
    return {
      top: U.mix(a.top, b.top, f),
      bot: U.mix(a.bot, b.bot, f),
      glow: U.mix(a.glow, b.glow, f),
      light: U.lerp(a.light, b.light, f),
      fog: U.mix(a.fog, b.fog, f),
      amb: U.mix(a.amb, b.amb, f),
      stars: U.lerp(a.stars, b.stars, f),
    };
  }

  /* Sun travels t 0.06 → 0.79; elevation is a sine arc. p = horizontal progress. */
  function sunPos(t) {
    t = ((t % 1) + 1) % 1;
    const p = (t - 0.06) / 0.73;
    if (p < 0 || p > 1) return { up: false, p: 0, elev: 0 };
    return { up: true, p, elev: Math.sin(Math.PI * p) };
  }

  /* Moon travels t 0.83 → 1.07 (wrapping past midnight). */
  function moonPos(t) {
    t = ((t % 1) + 1) % 1;
    const m = t < 0.5 ? t + 1 : t;
    const p = (m - 0.83) / 0.24;
    if (p < 0 || p > 1) return { up: false, p: 0, elev: 0 };
    return { up: true, p, elev: Math.sin(Math.PI * p) };
  }

  /* "lit": apply daylight + ambient bounce to a base (daylight) color.
     At night colors sink toward the deep-blue ambient instead of black. */
  function lit(base, pal, light) {
    return U.mix(U.scale(base, 0.22 + 0.78 * light), pal.amb, (1 - light) * 0.45);
  }

  return { get, sunPos, moonPos, lit };
})();
