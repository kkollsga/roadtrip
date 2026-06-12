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

  /* ---- celestial mechanics ----
     The sun and moon ride real circles: solar declination follows the
     day of year, altitude follows latitude and hour angle. Bodies are
     always somewhere on their orbit — they rise and set THROUGH the
     horizon instead of popping in and out. t: 0 = midnight; solar noon
     sits at NOON_T so the palette anchors keep their meaning. */
  const TAU = Math.PI * 2;
  const NOON_T = 0.425;
  const TILT = 0.409; // axial tilt, radians
  const sunLon = doy => TAU * ((doy || 81) - 81) / 365;

  function orbit(t, latDeg, decl, hourShift) {
    const lat = (latDeg === undefined ? 45 : latDeg) * Math.PI / 180;
    let H = TAU * (((t % 1) + 1) % 1 - NOON_T) - (hourShift || 0);
    H = ((H % TAU) + TAU + Math.PI) % TAU - Math.PI; // wrap to [-PI, PI)
    const sinAlt = Math.sin(lat) * Math.sin(decl)
      + Math.cos(lat) * Math.cos(decl) * Math.cos(H);
    // half-angle of the above-horizon sweep -> horizontal progress 0..1
    const cosH0 = U.clamp(-Math.tan(lat) * Math.tan(decl), -1, 1);
    const H0 = U.clamp(Math.acos(cosH0), 0.16, Math.PI - 0.05);
    return { up: sinAlt > -0.22, p: (H + H0) / (2 * H0), elev: sinAlt };
  }

  function sunPos(t, latDeg, doy) {
    return orbit(t, latDeg, TILT * Math.sin(sunLon(doy)));
  }

  /* the moon trails the sun by its phase: a full moon (0.5) rises at
     sunset; its declination follows its own ecliptic longitude, so a
     winter full moon rides high just like the real one */
  function moonPos(t, latDeg, doy, phase) {
    const ph = phase === undefined ? 0.5 : phase;
    const decl = TILT * Math.sin(sunLon(doy) + TAU * ph);
    return orbit(t, latDeg, decl, TAU * ph);
  }

  /* warp wall-clock t into the palette's canonical day, so latitude and
     season reshape the light: keyframes live at sunrise .09, noon .42,
     sunset .75 and deep night .92 — the warp pins them to the REAL
     sunrise/noon/sunset of this latitude and day of year. Polar winter
     never leaves the night keys (a brief noon glow); the midnight sun
     never reaches them. */
  function solarWarp(t, latDeg, doy) {
    const lat = (latDeg === undefined ? 45 : latDeg) * Math.PI / 180;
    const decl = TILT * Math.sin(sunLon(doy));
    const cosH0 = U.clamp(-Math.tan(lat) * Math.tan(decl), -1, 1);
    const half = U.clamp(Math.acos(cosH0), 0.10, Math.PI - 0.10) / TAU;
    const P = [
      [NOON_T - half, 0.09], [NOON_T, 0.42],
      [NOON_T + half, 0.75], [0.925, 0.92],
    ];
    let tt = ((t % 1) + 1) % 1;
    if (tt < P[0][0]) tt += 1;
    for (let i = 0; i < 4; i++) {
      const a = P[i], b = i < 3 ? P[i + 1] : [P[0][0] + 1, P[0][1] + 1];
      if (tt <= b[0] || i === 3) {
        const f = (tt - a[0]) / Math.max(1e-6, b[0] - a[0]);
        return ((a[1] + (b[1] - a[1]) * U.clamp(f, 0, 1)) % 1 + 1) % 1;
      }
    }
    return t;
  }

  /* "lit": apply daylight + ambient bounce to a base (daylight) color.
     At night colors sink toward the deep-blue ambient instead of black. */
  function lit(base, pal, light) {
    return U.mix(U.scale(base, 0.22 + 0.78 * light), pal.amb, (1 - light) * 0.45);
  }

  return { get, sunPos, moonPos, solarWarp, lit };
})();
