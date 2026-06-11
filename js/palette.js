/* Roadtrip — time-of-day palette. Keyframed sky/light colors over the
   day phase t in [0,1], interpolated per frame. This file sets the mood. */
window.Palette = (() => {
  const C = U.col;

  /* t, sky top, sky horizon, horizon glow, daylight 0..1, fog/haze color,
     ambient (what shadows lean toward), star visibility 0..1 */
  const KEYS = [
    { t: 0.000, top: C('#0a1318'), bot: C('#16262c'), glow: C('#16262c'), light: 0.12, fog: C('#101c20'), amb: C('#1d2c30'), stars: 1.00 },
    { t: 0.040, top: C('#15242a'), bot: C('#3d3a32'), glow: C('#8a6a4a'), light: 0.20, fog: C('#2b2e28'), amb: C('#2e342f'), stars: 0.65 },
    { t: 0.090, top: C('#41586a'), bot: C('#e9c87e'), glow: C('#f2dc9a'), light: 0.50, fog: C('#c2a878'), amb: C('#6a6450'), stars: 0.00 },
    { t: 0.160, top: C('#5d7a8a'), bot: C('#cfd8cf'), glow: C('#f5ecc2'), light: 0.88, fog: C('#c5cfc2'), amb: C('#b8c2b2'), stars: 0.00 },
    { t: 0.350, top: C('#4a7490'), bot: C('#b3cdd1'), glow: C('#fff7d8'), light: 1.00, fog: C('#c8d2c8'), amb: C('#d2dcd2'), stars: 0.00 },
    { t: 0.550, top: C('#4f7186'), bot: C('#b9c9c4'), glow: C('#f7eccc'), light: 0.96, fog: C('#c6cfc4'), amb: C('#cdd6cc'), stars: 0.00 },
    { t: 0.670, top: C('#57708c'), bot: C('#e3c98e'), glow: C('#ecd49a'), light: 0.82, fog: C('#cdb88a'), amb: C('#b3a888'), stars: 0.00 },
    { t: 0.750, top: C('#3d4a62'), bot: C('#d9a05e'), glow: C('#e8b46a'), light: 0.58, fog: C('#94795e'), amb: C('#6f6258'), stars: 0.05 },
    { t: 0.820, top: C('#232f42'), bot: C('#8a5e54'), glow: C('#a86d56'), light: 0.34, fog: C('#3d4244'), amb: C('#344044'), stars: 0.40 },
    { t: 0.900, top: C('#0e1a20'), bot: C('#1d3038'), glow: C('#1d3038'), light: 0.16, fog: C('#14222a'), amb: C('#20303a'), stars: 0.95 },
    { t: 1.000, top: C('#0a1318'), bot: C('#16262c'), glow: C('#16262c'), light: 0.12, fog: C('#101c20'), amb: C('#1d2c30'), stars: 1.00 },
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

  /* Sun travels t 0.06 → 0.79; elevation is a sine arc. p = horizontal
     progress. The arc extends a little past the horizon (negative
     elevation) so the disc rises and sets behind the scenery instead of
     popping in and out of existence. */
  function sunPos(t) {
    t = ((t % 1) + 1) % 1;
    const p = (t - 0.06) / 0.73;
    if (p < -0.22 || p > 1.22) return { up: false, p: 0, elev: 0 };
    return { up: true, p, elev: Math.sin(Math.PI * p) };
  }

  /* Moon travels t 0.83 → 1.07 (wrapping past midnight). */
  function moonPos(t) {
    t = ((t % 1) + 1) % 1;
    const m = t < 0.5 ? t + 1 : t;
    const p = (m - 0.83) / 0.24;
    if (p < -0.22 || p > 1.22) return { up: false, p: 0, elev: 0 };
    return { up: true, p, elev: Math.sin(Math.PI * p) };
  }

  /* "lit": apply daylight + ambient bounce to a base (daylight) color.
     At night colors sink toward the deep-blue ambient instead of black. */
  function lit(base, pal, light) {
    return U.mix(U.scale(base, 0.22 + 0.78 * light), pal.amb, (1 - light) * 0.45);
  }

  return { get, sunPos, moonPos, lit };
})();
