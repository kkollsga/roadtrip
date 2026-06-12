/* Roadtrip — the world: parallax ridge layers, biome blending, chunked
   procedural item placement, the road, the car, and weather ground effects
   (wet asphalt sheen, accumulating snow cover). */
window.Scene = (() => {
  const C = U.col;
  const { TAU } = U;

  /* ---------------- biome profiles (compiled from biomes/*.yaml) --------
     tools/build.js flattens each YAML into engine fields and bakes the
     weighted item tables into cumulative form: [asset, cum] or, with a
     depth limit, [asset, cum, z0, z1]. Hex color strings become [r,g,b]
     here, once at boot. */
  const hydrate = o => {
    if (Array.isArray(o)) { o.forEach((e, i) => { o[i] = hydrate(e); }); return o; }
    if (o && typeof o === 'object') { for (const k in o) o[k] = hydrate(o[k]); return o; }
    return (typeof o === 'string' && o[0] === '#') ? C(o) : o;
  };
  const B = hydrate(JSON.parse(JSON.stringify(window.GEN.biomes)));
  const BIOME_NAMES = Object.keys(B);

  /* Each biome's `variants` (plus an implicit 'base' weighted baseW, default 4)
     are merged into complete, self-contained profile objects up front. All
     rendering reads resolved profiles, never raw defs. */
  BIOME_NAMES.forEach(n => {
    const base = B[n];
    const list = [[{ key: 'base' }, base.baseW || 4]].concat(base.variants || []);
    let tot = 0;
    base.profiles = list.map(pair => {
      tot += pair[1];
      return Object.assign({}, base, pair[0],
        { key: n + '/' + (pair[0].key || 'base'), bname: n, cum: tot });
    });
    base.profiles.forEach(p => { p.cum /= tot; });
  });

  /* ---- real-world scale ----
     Every asset carries its true height range in meters (Assets.sizes,
     from the SVGs' data-meters / the animated modules). On screen,
     pixels = meters * METER * h * parallax: parallax is 1/distance in
     this engine, so size falls off with distance exactly like position
     does. METER is calibrated against the car (~4.5 m long, ~1.5 m tall)
     at road parallax 1. Landmarks (LM_CFG) are exempt postcards. */
  const METER = 0.047;
  const itemMeters = (type, sf) => {
    const s = Assets.sizes[type];
    return s ? U.lerp(s[0], s[1], sf) : 8;
  };

  /* ---- the multiplane camera ----
     One projection drives EVERYTHING about depth. The eye sits CAM_H
     meters above the ground plane with the horizon at HORIZON·h; for an
     object at distance D meters:
       ground line  y(D) = HORIZON·h + FOCAL·CAM_H·h / D
       size         s(D) = meters · FOCAL·h / D
       parallax     p(D) = DREF / D            (the road plane drifts at 1)
       atmosphere   haze(D) grows with ln(D)   (colors wash into the fog)
     Vertical position, size, drift speed and washout always agree. */
  const HORIZON = 0.56;
  const CAM_H = 6.1;
  const DREF = 15;
  const FOCAL = METER * DREF; // 0.705 h-units of px per meter at 1 m
  const groundYf = D => (HORIZON + FOCAL * CAM_H / D); // fraction of h
  const hazeAt = D => U.clamp(0.05 + 0.19 * Math.log(D / DREF), 0.008, 0.96);
  /* a fixed-horizon camera cannot tilt up at near giants the way an eye
     would, so apparent size rolls off softly: true scale for anything
     modest, asymptotic compression for things that would tower several
     screens tall (a 90 m redwood at 18 m reads as huge, not infinite) */
  const softScale = (px, cap) => cap * Math.tanh(px / cap);

  /* landmark display size (fraction of h) and baseline (fraction of h) */
  const LM_CFG = {
    kilimanjaro: { s: 0.30, y: 0.64 }, fuji: { s: 0.28, y: 0.64 },
    matterhorn: { s: 0.32, y: 0.64 }, everest: { s: 0.36, y: 0.64 },
    denali: { s: 0.33, y: 0.64 }, monumentValley: { s: 0.20, y: 0.645 },
    delicateArch: { s: 0.10, y: 0.645 }, uluru: { s: 0.14, y: 0.645 },
    namibDune: { s: 0.22, y: 0.645 }, hawaii: { s: 0.17, y: 0.60 },
    etna: { s: 0.27, y: 0.615 }, eyjafjallajokull: { s: 0.25, y: 0.64 },
    halfDome: { s: 0.30, y: 0.64 }, devilsTower: { s: 0.24, y: 0.645 },
    oldFaithful: { s: 0.11, y: 0.66 }, bryceHoodoos: { s: 0.15, y: 0.65 },
    glacier: { s: 0.30, y: 0.645 }, sugarloaf: { s: 0.22, y: 0.605 },
  };

  /* ---------------- biome sequencing & blending ---------------- */
  /* Biome stretches last 30–50 minutes at cruise speed and crossfade over
     ~5 minutes: change is rare, slow, and never on demand. */
  const SEG_MIN = 243000, SEG_VAR = 162000, BLEND = 40500;
  let fixed = null;
  const segChain = [0];   // biome index per segment (the road starts in plains)
  const segStarts = [0];  // world-x where each segment begins
  function appendSeg() {
    const i = segChain.length;
    const pick = Math.floor(U.hash1(i * 977 + 131) * (BIOME_NAMES.length - 1));
    segChain.push((segChain[i - 1] + 1 + pick) % BIOME_NAMES.length);
    segStarts.push(segStarts[i - 1] + SEG_MIN + U.hash1(i * 5333 + 7) * SEG_VAR);
  }
  let segCursor = 0; // queries cluster around the car, so walk, don't search
  function segLookup(wx) {
    while (segStarts[segStarts.length - 1] <= wx) appendSeg();
    if (segCursor > segStarts.length - 2) segCursor = segStarts.length - 2;
    while (wx >= segStarts[segCursor + 1]) segCursor++;
    while (wx < segStarts[segCursor]) segCursor--;
    return segCursor;
  }
  function biomeAt(wx) {
    if (fixed) return { a: fixed, b: fixed, t: 0 };
    if (wx < 0) wx = 0;
    const si = segLookup(wx);
    const a = BIOME_NAMES[segChain[si]];
    const end = segStarts[si + 1];
    if (wx > end - BLEND) {
      return {
        a, b: BIOME_NAMES[segChain[si + 1]],
        t: U.smooth((wx - (end - BLEND)) / BLEND),
      };
    }
    return { a, b: a, t: 0 };
  }
  const weightOf = (wx, name) => {
    const bi = biomeAt(wx);
    return (bi.a === name ? 1 - bi.t : 0) + (bi.b === name ? bi.t : 0);
  };

  /* ---- variant sub-segments: scenery shifts WITHIN a biome every few
     minutes (lake stretches, dense woods, villages...), blending softly.
     Sub-segments are anchored to the biome segment, so they are stable
     and deterministic for any world position. ---- */
  const VSEG = 20000, VBLEND = 6000;
  function pickProf(profiles, r) {
    for (const p of profiles) if (r <= p.cum) return p;
    return profiles[profiles.length - 1];
  }
  function variantPair(name, si, segStart, wx) {
    const profiles = B[name].profiles;
    if (profiles.length === 1) return { p1: profiles[0], p2: profiles[0], vt: 0 };
    const vs = Math.floor((wx - segStart) / VSEG);
    const p1 = pickProf(profiles, U.hash2(si * 131 + 17, vs));
    const local = wx - segStart - vs * VSEG;
    if (local > VSEG - VBLEND) {
      return {
        p1, p2: pickProf(profiles, U.hash2(si * 131 + 17, vs + 1)),
        vt: U.smooth((local - (VSEG - VBLEND)) / VBLEND),
      };
    }
    return { p1, p2: p1, vt: 0 };
  }
  /* full resolution at a world position: biome blend x variant blend */
  function resolve(wx) {
    if (wx < 0) wx = 0;
    if (fixed) {
      const vp = variantPair(fixed, 0, 0, wx);
      return { t: 0, a: vp, b: vp };
    }
    const si = segLookup(wx);
    const aName = BIOME_NAMES[segChain[si]];
    const end = segStarts[si + 1];
    const a = variantPair(aName, si, segStarts[si], wx);
    if (wx > end - BLEND) {
      const bName = BIOME_NAMES[segChain[si + 1]];
      return {
        t: U.smooth((wx - (end - BLEND)) / BLEND),
        a, b: variantPair(bName, si + 1, end, wx),
      };
    }
    return { t: 0, a, b: a };
  }
  /* blended numeric / color parameter at a world position.
     The renderer asks thousands of times per frame at positions a few
     px apart, while the parameters only vary over thousands of px - so
     lookups are memoized per frame in 64 px buckets. */
  const effMemo = new Map();
  function clearEffMemo() { effMemo.clear(); }
  function effLookup(wx, key, mixFn) {
    let m = effMemo.get(key);
    if (!m) { m = new Map(); effMemo.set(key, m); }
    const bucket = (wx / 64) | 0;
    let v = m.get(bucket);
    if (v === undefined) {
      const bwx = bucket * 64 + 32;
      const r = resolve(bwx);
      const ea = r.a.vt ? mixFn(r.a.p1[key], r.a.p2[key], r.a.vt) : r.a.p1[key];
      v = r.t ? mixFn(ea,
        r.b.vt ? mixFn(r.b.p1[key], r.b.p2[key], r.b.vt) : r.b.p1[key], r.t) : ea;
      m.set(bucket, v);
    }
    return v;
  }
  function effN(wx, key) { return effLookup(wx, key, U.lerp); }
  function effC(wx, key) { return effLookup(wx, key, U.mix); }

  /* ridge crest noise is fixed per world grid point: cache it so panes
     stop re-evaluating thousands of fbm octaves every frame */
  const crestCache = new Map();
  function crestN(k, freq, seed) {
    let m = crestCache.get(seed);
    if (!m) { m = new Map(); crestCache.set(seed, m); }
    let v = m.get(k);
    if (v === undefined) {
      if (m.size > 4000) m.clear();
      v = U.fbm(k * 10 * freq, seed, 3);
      m.set(k, v);
    }
    return v;
  }

  /* Long-wavelength height envelope, phased differently per ridge layer, so
     spurs swell in different places and interlock — valleys open between
     them and the eye reads depth between the layers. */
  const ampEnv = (wx, seed) => 0.55 + 0.45 * U.noise1(wx / 3200 + seed * 7.3, seed + 900);

  /* ---------------- chunked item placement (cached, deterministic) ------ */
  const itemCache = new Map();
  const susp = { y: 0, vy: 0, p: 0, vp: 0 }; // body spring state (suspension)
  /* ---- set pieces: composed arrangements that recur rarely, giving the
     road memorable places instead of uniform scatter. Offsets in meters
     from the piece's center; s picks within the species' size range. */
  const grove6 = type => [-16, -9, -3, 4, 11, 18].map((dx, i) =>
    ({ type, dx, s: 0.35 + (i * 2.7 % 1) * 0.55, v: i * 0.37 % 1 }));
  /* human clusters are RARE — small hamlets far between, the only place
     buildings appear; nature pieces keep the usual cadence */
  const POIS = {
    plains: {
      human: [[{ type: 'barn', dx: 0, s: 0.7, v: 0.6 }, { type: 'cabin', dx: 15, s: 0.4, v: 0.3 },
        { type: 'roundTree', dx: -13, s: 0.85, v: 0.2 }, { type: 'roundTree', dx: 24, s: 0.5, v: 0.7 },
        { type: 'rock', dx: 7, s: 0.5, v: 0.5 }]],
      nature: [grove6('roundTree')],
    },
    forest: {
      human: [[{ type: 'cabin', dx: 0, s: 0.6, v: 0.55 }, { type: 'pine', dx: -11, s: 0.8, v: 0.3 },
        { type: 'pine', dx: 12, s: 0.55, v: 0.8 }, { type: 'rock', dx: 6, s: 0.4, v: 0.2 }]],
      nature: [grove6('pine')],
    },
    desert: {
      nature: [[{ type: 'rock', dx: -7, s: 0.9, v: 0.2 }, { type: 'rock', dx: 0, s: 0.6, v: 0.6 },
        { type: 'rock', dx: 6, s: 0.4, v: 0.9 }, { type: 'cactus', dx: -14, s: 0.8, v: 0.4 },
        { type: 'cactus', dx: 13, s: 0.5, v: 0.75 }]],
    },
    savanna: {
      nature: [
        [{ type: 'acacia', dx: 0, s: 0.9, v: 0.4 }, { type: 'elephant', dx: -12, s: 0.7, v: 0.3 },
         { type: 'giraffe', dx: 11, s: 0.8, v: 0.2 }, { type: 'giraffe', dx: 17, s: 0.55, v: 0.7 },
         { type: 'lion', dx: -5, s: 0.6, v: 0.5 }],
        grove6('acacia').slice(1, 5),
      ],
    },
    japan: {
      human: [[{ type: 'torii', dx: 0, s: 0.8, v: 0.3 }, { type: 'sakura', dx: -12, s: 0.85, v: 0.2 },
        { type: 'sakura', dx: 12, s: 0.7, v: 0.6 }, { type: 'rock', dx: -5, s: 0.45, v: 0.8 }]],
      nature: [grove6('sakura')],
    },
    lofoten: {
      human: [[{ type: 'cabin', dx: -8, s: 0.7, v: 0.6 }, { type: 'cabin', dx: 8, s: 0.55, v: 0.2 },
        { type: 'birch', dx: -18, s: 0.7, v: 0.4 }, { type: 'rock', dx: 16, s: 0.6, v: 0.7 }]],
      nature: [grove6('birch')],
    },
    fjord: {
      human: [[{ type: 'cabin', dx: -8, s: 0.7, v: 0.6 }, { type: 'cabin', dx: 8, s: 0.55, v: 0.2 },
        { type: 'pine', dx: -18, s: 0.8, v: 0.4 }, { type: 'rock', dx: 16, s: 0.6, v: 0.7 }]],
      nature: [grove6('pine')],
    },
    generic: { nature: [grove6('roundTree')] },
  };

  const OCC_TREES = { // types allowed on near hillsides (trees only)
    pine: 1, roundTree: 1, birch: 1, deadTree: 1, cactus: 1,
    palm: 1, sakura: 1, redwood: 1, canopyTree: 1, fern: 1,
  };
  function chunkItems(layerSeed, ci, p, chunkW, densityKey, tableKey) {
    const key = layerSeed + ':' + ci;
    let items = itemCache.get(key);
    if (items) return items;
    if (itemCache.size > 700) itemCache.clear();
    const r = U.rng(U.hash2(ci, layerSeed));
    items = [];
    const nearWX = (ci * chunkW + chunkW / 2) / p;
    const rs = resolve(nearWX);
    // placement comes in CLUSTERS: below the grove threshold the land is
    // open (45% of the road), above it copses thicken quickly — long
    // empty stretches between tight stands, and far fewer trees overall
    const grove = U.noise1(nearWX / 2600, layerSeed + 55);
    const gmul = grove < 0.45 ? 0.08
      : Math.pow((grove - 0.45) / 0.55, 1.4) * 2.4;
    const density = effN(nearWX, densityKey) * gmul;
    const count = Math.floor(density) + (r() < density % 1 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const side = r() < rs.t ? rs.b : rs.a;
      const prof = r() < side.vt ? side.p2 : side.p1;
      const table = prof[tableKey];
      if (!table) continue;
      const pickR = r();
      let pick = table[table.length - 1];
      for (const e of table) if (pickR <= e[1]) { pick = e; break; }
      // an entry may confine itself to a slice of the band's depth range:
      // [asset, cum, z0, z1] limits z; plain entries roam the whole band
      const zr = r();
      items.push({
        x: ci * chunkW + r() * chunkW, sf: r(), v: r(),
        z: pick.length > 2 ? pick[2] + zr * (pick[3] - pick[2]) : zr,
        prof, type: pick[0],
      });
    }
    itemCache.set(key, items);
    return items;
  }

  /* ======================== render ======================== */
  function render(ctx, env, pal) {
    clearEffMemo();
    const { w, h, worldX, light, time } = env;
    const fogW = env.weather.fog;
    const wet = env.weather.wetness || 0;
    const snowC = env.weather.snowCover || 0;
    const cwx = worldX + w * 0.5;
    const biC = biomeAt(cwx);
    const snowLit = Palette.lit(C('#e9eef6'), pal, light);
    const effD = d => Math.min(0.96, d + fogW * (0.22 + d * 1.3));
    /* the seasons repaint the living colors: autumn ambers, spring
       freshness, winter bareness (and the savanna's golden dry season),
       each biome following by its own 'seasonal' strength */
    const doySea = env.doy || 166;
    const bell = (c2, w2) => {
      let d2 = Math.abs(doySea - c2);
      d2 = Math.min(d2, 365 - d2);
      return Math.exp(-(d2 / w2) * (d2 / w2));
    };
    const SEA_A = bell(285, 40), SEA_S = bell(125, 35), SEA_W = bell(8, 50);
    const seasonC = (col, k2) => {
      let c2 = col;
      if (SEA_A > 0.02) c2 = U.mix(c2, C('#b07a3a'), SEA_A * 0.55 * k2);
      if (SEA_S > 0.02) c2 = U.mix(c2, C('#8aa84e'), SEA_S * 0.30 * k2);
      if (SEA_W > 0.02) c2 = U.mix(c2, C('#7a6f5a'), SEA_W * 0.45 * k2);
      return c2;
    };

    const tint = (base, d, snowMix) => {
      let c = Palette.lit(base, pal, light);
      // vibrance peaks at the road's depth and falls away both into the
      // distance (colors bleed into the haze) and toward the extreme
      // foreground (slightly muted again, like a lens focused on the road)
      const vib = U.clamp(1 - Math.abs(d - 0.07) / 0.15, 0, 1);
      if (vib > 0) c = U.sat(c, 1 + 0.5 * vib * (0.35 + 0.65 * light));
      if (snowC > 0 && snowMix) c = U.mix(c, snowLit, snowC * snowMix);
      return U.css(U.mix(c, pal.fog, effD(d)));
    };

    /* ---- ridge painter: a deep-rooted pane at distance D meters. Its
       baseline, drift speed and atmospheric washout all derive from D. */
    function ridge(D, seed, freq, ampKey, ampMul, colKey, capMul, foamW) {
      const p = DREF / D;
      const d = hazeAt(D);
      const baseY = h * groundYf(D);
      const cRaw = effC(cwx, colKey);
      const color = tint(colKey === 'far' ? cRaw
        : seasonC(cRaw, effN(cwx, 'seasonal')), d, 0.55);
      /* The crest is sampled on a WORLD-aligned grid (layer space), not on
         screen columns: between fixed world samples the slope never
         re-quantizes as the terrain scrolls, so the facet light/shadow is
         welded to the mountains instead of flickering through a
         screen-fixed mesh and lagging the terrain. */
      const step = 10;
      const lx = worldX * p;
      const k0 = Math.floor(lx / step) - 1;
      const k1 = Math.ceil((lx + w) / step) + 1;
      const pts = [], xs = [];
      const farPane = D >= 90; // the panes the open sea can swallow
      for (let k = k0; k <= k1; k++) {
        const sxp = k * step - lx; // screen x of this world sample
        const wxs = worldX + sxp;  // world position for biome parameters
        const amp = effN(wxs, ampKey) * h * ampMul * ampEnv(wxs, seed);
        const n = crestN(k, freq, seed);
        const rw = effN(wxs, 'ridged');
        const shaped = rw > 0
          ? U.lerp(n, Math.pow(1 - Math.abs(2 * n - 1), 1.35), rw)
          : n;
        xs.push(sxp);
        // signed elevation: where the region sits low (water high) crests
        // sink beneath the sea plane behind them — headlands, islands,
        // open water all emerge; where it sits high, far panes lift to
        // the horizon and the ocean hides behind the land
        const midPane = !farPane && D > 40;
        const wAt = farPane ? effN(wxs, 'water')
          : midPane ? effN(wxs, 'lake') : 0;
        const lift = farPane ? (1 - wAt) * h * 0.018 : 0;
        pts.push(baseY - lift - amp * (shaped - wAt * 0.85));
      }
      const xLast = xs[xs.length - 1];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(xs[0], h);
      for (let i = 0; i < pts.length; i++) ctx.lineTo(xs[i], pts[i]);
      ctx.lineTo(xLast, h);
      ctx.closePath();
      ctx.fill();
      const cap = effN(cwx, 'snowcap') * capMul;
      if (cap > 0.03) {
        // snow clings above a snowline that FOLLOWS the terrain (with a
        // gentle wobble), instead of being cut by a horizontal razor
        const ampRef = effN(cwx, ampKey) * h * ampMul;
        const lineAt = i3 => baseY - ampRef * (0.45 + 0.25 * U.noise1((k0 + i3) * 0.22, seed + 31));
        ctx.fillStyle = U.css(U.mix(snowLit, pal.fog, effD(d)), Math.min(1, cap));
        ctx.beginPath();
        let i2 = 0;
        while (i2 < pts.length) {
          if (pts[i2] >= lineAt(i2)) { i2++; continue; }
          let j3 = i2;
          while (j3 + 1 < pts.length && pts[j3 + 1] < lineAt(j3 + 1)) j3++;
          ctx.moveTo(xs[i2], pts[i2]);
          for (let q2 = i2 + 1; q2 <= j3; q2++) ctx.lineTo(xs[q2], pts[q2]);
          for (let q2 = j3; q2 >= i2; q2--) ctx.lineTo(xs[q2], lineAt(q2));
          ctx.closePath();
          i2 = j3 + 1;
        }
        ctx.fill();
      }
      // foam + wet edge where this ridge dips to meet open water
      if (foamW > 0.25) {
        const wl = h * (groundYf(60)); // only near/below the sea surface
        ctx.fillStyle = `rgba(34,52,72,${(0.20 * foamW).toFixed(3)})`;
        ctx.beginPath();
        let wi = 0; // contiguous shoreline runs as single bands (no seams)
        while (wi < pts.length) {
          if (pts[wi] < wl) { wi++; continue; }
          let wj = wi;
          while (wj + 1 < pts.length && pts[wj + 1] >= wl) wj++;
          ctx.moveTo(xs[wi], pts[wi]);
          for (let q = wi + 1; q <= wj; q++) ctx.lineTo(xs[q], pts[q]);
          for (let q = wj; q >= wi; q--) ctx.lineTo(xs[q], pts[q] + h * 0.013);
          ctx.closePath();
          wi = wj + 1;
        }
        ctx.fill();
        const foamLine = (dy, lw, a2) => {
          ctx.strokeStyle = `rgba(255,255,255,${a2.toFixed(3)})`;
          ctx.lineWidth = lw;
          ctx.beginPath();
          let pen = false;
          for (let i = 0; i < pts.length; i++) {
            if (pts[i] >= wl) {
              if (!pen) { ctx.moveTo(xs[i], pts[i] + dy); pen = true; }
              else ctx.lineTo(xs[i], pts[i] + dy);
            } else pen = false;
          }
          ctx.stroke();
        };
        const fA = foamW * (0.3 + 0.7 * light);
        foamLine(-0.8, 2.4, 0.55 * fA);          // breaking edge
        foamLine(-5 - Math.sin(time * 0.7) * 2.5, 1.2, 0.18 * fA); // receding wave
      }
      // faceted slopes: faces toward the sun catch light, lee faces fall
      // into shadow — quantized so the mountains read as cut planes
      {
        const dir = env.sunX !== undefined ? (env.sunX > w * 0.5 ? 1 : -1)
          : env.moonX !== undefined ? (env.moonX > w * 0.5 ? 1 : -1) : -1;
        const fade = 1 - effD(d) * 0.85; // facets soften into the haze
        const thr = 0.34 + d * 0.35; // distant layers facet less
        const fv = new Array(pts.length - 1);
        for (let i = 0; i < pts.length - 1; i++) {
          const f = U.clamp((pts[i + 1] - pts[i]) / step * dir * 1.5, -0.66, 0.66);
          fv[i] = Math.abs(f) < thr ? 0 : Math.round(f * 2) / 2;
        }
        // contiguous equal-toned runs become ONE polygon: translucent quads
        // sharing edges would double-blend into hairline seams. Each run
        // shades the WHOLE face from crest to base (nearer layers cover the
        // rest) — a band stopping mid-slope reads as a floating grey patch.
        let i = 0;
        while (i < fv.length) {
          const f = fv[i];
          if (f === 0) { i++; continue; }
          let j = i;
          while (j + 1 < fv.length && fv[j + 1] === f) j++;
          ctx.fillStyle = f > 0
            ? `rgba(255,252,244,${(0.085 * f * light * fade).toFixed(3)})`
            : `rgba(10,14,26,${(-0.13 * f * (0.3 + 0.7 * light) * fade).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(xs[i], pts[i]);
          for (let q = i + 1; q <= j + 1; q++) ctx.lineTo(xs[q], pts[q]);
          ctx.lineTo(xs[j + 1], h);
          ctx.lineTo(xs[i], h);
          ctx.closePath();
          ctx.fill();
          i = j + 1;
        }
      }
      return { baseY, pts, step };
    }

    /* ---- per-biome color set for item drawing at a given depth ---- */
    function colorsFor(prof, d) {
      const bb = prof;
      const glowA = U.clamp((0.4 - light) / 0.35, 0, 1) * 0.85;
      const sk = bb.seasonal || 0;
      return {
        foliage: tint(seasonC(bb.fol, sk), d, 0.45),
        foliage2: tint(seasonC(bb.fol2, sk), d, 0.45),
        trunk: tint(bb.trunk, d, 0),
        dark: tint(U.scale(bb.trunk, 0.55), d, 0),
        light: tint(C('#e8e0c4'), d, 0),
        accent: tint(C('#9a4538'), d, 0),
        pink: tint(C('#e3aab8'), d, 0.5),
        pink2: tint(C('#cf8a9b'), d, 0.5),
        fill: tint(U.mix(bb.far, bb.mid, 0.4), d, 0.5),
        tan: tint(C('#c89e62'), d, 0.35),    // fauna hides
        brown: tint(C('#7a5a3c'), d, 0),
        gray: tint(C('#8e8a84'), d, 0.4),
        strata: tint(U.scale(U.mix(bb.far, bb.mid, 0.4), 0.8), d, 0),
        glowA,
      };
    }

    function drawItemSet(p, seed, chunkW, densityKey, tableKey, d, groundY, marg, sink, landOnly) {
      const colorSets = {};
      const lx0 = worldX * p;
      const M = h * METER * p; // px per real-world meter on this layer
      const mg = marg || 200; // wide enough for the biggest band trees
      for (let ci = Math.floor((lx0 - mg) / chunkW); ci <= (lx0 + w + mg) / chunkW; ci++) {
        const items = chunkItems(seed, ci, p, chunkW, densityKey, tableKey);
        for (const it of items) {
          const sx = it.x - lx0;
          if (sx < -mg || sx > w + mg) continue;
          if (landOnly && (effN(it.x / p, 'water') > 0.35
            || effN(it.x / p, 'lake') > 0.35)) continue; // no woods in water
          const size = itemMeters(it.type, it.sf) * M;
          const c = colorSets[it.prof.key] || (colorSets[it.prof.key] = colorsFor(it.prof, d));
          const y = groundY(it.x, sx, it);
          const draw = it.type === 'mesa'
            ? () => Assets.mesa(ctx, sx, y, size * 2.8, size, c, it.v)
            : () => Assets[it.type](ctx, sx, y, size, c, it.v, time);
          if (sink) q(D0 / p, draw, y);
          else draw();
        }
      }
    }

    /* ---- near-field items: a continuous depth band around the road ----
       Each item lands at its own depth z in [0,1]; parallax, ground y,
       size and haze all derive from it. The list is painted sorted by
       ground y, so a nearer item always covers a farther one. Colors are
       shared across a few quantized depth levels. */
    function nearFieldItems(seed, chunkW, densityKey, tableKey, p0, p1, d0, d1, groundAt) {
      const list = [];
      const colorSets = {};
      // culling must scale with the object: a 90 m redwood is taller than
      // the screen and its canopy enters frame LONG before its trunk does.
      // reach = the world span the largest possible item can cover.
      const m = 260;
      const reach = 95 * h * METER; // max asset height in meters, as px/p
      const i0 = Math.floor((worldX - m / p0 - reach) / chunkW);
      const i1 = Math.floor((worldX + (w + m) / p0 + reach) / chunkW);
      for (let ci = i0; ci <= i1; ci++) {
        const items = chunkItems(seed, ci, 1, chunkW, densityKey, tableKey);
        for (const it of items) {
          const z = it.z;
          const p = U.lerp(p0, p1, z);
          const sx = (it.x - worldX) * p;
          const cullM = Math.max(m, itemMeters(it.type, it.sf) * h * METER * p);
          if (sx < -cullM || sx > w + cullM) continue;
          const zq = Math.round(z * 4) / 4;
          const ck = it.prof.key + ':' + zq;
          const c = colorSets[ck] || (colorSets[ck] = colorsFor(it.prof, U.lerp(d0, d1, zq)));
          // true size at this depth, rolled off so near giants stay framed
          const size = softScale(itemMeters(it.type, it.sf) * h * METER * p, h * 1.05);
          list.push({ y: groundAt(sx, z), sx, size, c, it, dist: D0 / p });
        }
      }
      return list;
    }

    /* ================= the distance ladder =================
       EVERY drawable carries its camera distance in meters (the road is
       ~15 m out; the sky effectively infinite). One queue, sorted far to
       near, paints the whole scene — stacking order is a property of the
       world, never of code position. Ties break on base y. */
    const Q = [];
    const q = (dist, fn, y) => Q.push({ dist, fn, y: y || 0 });
    const D0 = 15; // meters at parallax 1 (the road plane)

    // small grounding shadow so items read anchored even on pale terrain
    const itemShadow = (sx, y, size) => {
      if (size < 14) return; // invisible at that scale, not free to draw
      ctx.fillStyle = `rgba(8,12,20,${(0.06 + 0.10 * light).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(sx, y + 1, size * 0.16, Math.max(1.5, size * 0.028), 0, 0, TAU);
      ctx.fill();
    };
    const paintItem = o => {
      itemShadow(o.sx, o.y, o.size);
      Assets[o.it.type](ctx, o.sx, o.y, o.size, o.c, o.it.v, time);
    };

    // far ridges (where there is open sea, they read as headlands in it)
    const waterWpre = effN(cwx, 'water');
    q(280, () => ridge(280, 11, 1 / 620, 'farAmp', 1.0, 'far', 1.0, 0));
    q(140, () => ridge(140, 22, 1 / 480, 'farAmp', 0.65, 'far', 0.8, 0));
    q(90, () => ridge(90, 44, 1 / 520, 'farAmp', 0.32, 'far', 0.7, waterWpre));

    // the open sea: a PERMANENT plane just in front of the sky — land
    // panes rise above it or sink beneath it, so coverage emerges from
    // elevation instead of fading in and out
    const waterW = effN(cwx, 'water');
    {
      const top = env.horizonY, bot = h * groundYf(30); // the shore at 30 m
      const water = Palette.lit(effC(cwx, 'waterCol'), pal, light);
      q(420, () => {
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, U.css(U.mix(U.mix(water, pal.bot, 0.45), pal.fog, effD(0.5))));
      g.addColorStop(1, U.css(U.mix(water, pal.fog, effD(0.3))));
      ctx.fillStyle = g;
      ctx.fillRect(0, top, w, bot - top);
      // the horizon meets softly instead of banding in pale light
      const hg = ctx.createLinearGradient(0, top - 1, 0, top + 7);
      hg.addColorStop(0, U.css(pal.bot));
      hg.addColorStop(1, U.css(pal.bot, 0));
      ctx.fillStyle = hg;
      ctx.fillRect(0, top - 1, w, 8);
      // glitter path under sun or moon
      const gx = env.sunX !== undefined ? env.sunX : env.moonX;
      if (gx !== undefined) {
        const gcol = env.sunX !== undefined ? 'rgba(255,220,160,' : 'rgba(225,235,250,';
        const ga = (env.sunX !== undefined ? 0.20 : 0.13) * waterW;
        const gg = ctx.createLinearGradient(0, top, 0, bot);
        gg.addColorStop(0, gcol + ga + ')');
        gg.addColorStop(1, gcol + '0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.moveTo(gx - w * 0.012, top);
        ctx.lineTo(gx + w * 0.012, top);
        ctx.lineTo(gx + w * 0.05, bot);
        ctx.lineTo(gx - w * 0.05, bot);
        ctx.closePath();
        ctx.fill();
      }
      // drifting wave glints
      ctx.fillStyle = U.css(U.mix(U.scale(water, 1.35), pal.fog, 0.2), (0.14 + 0.16 * light) * waterW);
      for (let row = 0; row < 7; row++) {
        const ry = top + Math.pow((row + 1) / 8, 1.5) * (bot - top);
        const sp = 90 + row * 60;
        const off = (worldX * (0.04 + row * 0.02) + time * (6 + row * 3)) % sp;
        for (let x = -off; x < w; x += sp) {
          const len = 14 + row * 9;
          ctx.fillRect(x + U.hash2(row, Math.floor((x + off) / sp)) * 30, ry, len, 1 + row * 0.3);
        }
      }
      });
      // drifting ice in polar waters (bigger and lower = nearer)
      if (waterW > 0.02) {
        const p = 0.16, chunkW = 520, lx0 = worldX * p;
        const iceC = {
          ice: U.css(U.mix(U.mix(snowLit, pal.bot, 0.12), pal.fog, effD(0.38))),
          shade: U.css(U.mix(Palette.lit(C('#9fc0d8'), pal, light), pal.fog, effD(0.38))),
          deep: U.css(U.mix(Palette.lit(C('#2a4660'), pal, light), pal.fog, effD(0.38)), 0.85),
        };
        for (let ci = Math.floor((lx0 - 120) / chunkW); ci <= (lx0 + w + 120) / chunkW; ci++) {
          const r = U.rng(U.hash2(ci, 999));
          const irs = resolve((ci * chunkW + chunkW / 2) / p);
          const n = Math.floor(r() * 3.6);
          for (let k = 0; k < n; k++) {
            const iside = r() < irs.t ? irs.b : irs.a;
            const iprof = r() < iside.vt ? iside.p2 : iside.p1;
            const fr = r(), kind = r(), vv = r();
            const ix = ci * chunkW + r() * chunkW - lx0;
            if (iprof.bname !== 'tundra' && iprof.bname !== 'fjord') continue; // warm seas stay clear
            if (iprof.water < 0.3) continue;
            if (ix < -120 || ix > w + 120) continue;
            const Di = U.lerp(220, 31, fr); // meters out in the bay
            const iy = h * groundYf(Di) + 1;
            const pIce = DREF / Di;
            const fn = kind < 0.35 ? Assets.floe : Assets.iceberg;
            const sIce = itemMeters(kind < 0.35 ? 'floe' : 'iceberg', vv)
              * h * METER * pIce * (kind < 0.35 ? 2.0 : 1);
            q(Di, () => {
              const a0 = ctx.globalAlpha;
              ctx.globalAlpha = a0 * waterW;
              fn(ctx, ix, iy, sIce, iceC, vv);
              ctx.globalAlpha = a0;
            }, iy);
          }
        }
      }
    }

    // horizon set pieces: true-scale mesas (90-220 m) far out where their
    // bulk reads as distance, not as a wall
    drawItemSet(DREF / 500, 999, 1100, 'horizonDensity', 'horizonItems', hazeAt(500),
      ix => h * (groundYf(500) - 0.006 * U.fbm(ix / 240, 99, 2)), 900, true);

    // wind farms: true-scale turbines (110-150 m) far out on the horizon
    // ridges — or offshore — drifting past slowly in groups of 6-10
    {
      const FARM_W = 40000;
      const i0f = Math.floor((worldX - 400 / 0.028) / FARM_W);
      const i1f = Math.floor((worldX + (w + 400) / 0.028) / FARM_W);
      const farm = [];
      for (let ci = i0f; ci <= i1f; ci++) {
        const r = U.rng(U.hash2(ci, 3331));
        const frs = resolve(ci * FARM_W + FARM_W / 2);
        const fside = r() < frs.t ? frs.b : frs.a;
        const fprof = r() < fside.vt ? fside.p2 : fside.p1;
        const gate = r(), centerR = r();
        if (gate > (fprof.windfarm || 0)) continue;
        const cx = ci * FARM_W + (0.3 + centerR * 0.4) * FARM_W;
        const n = 6 + Math.floor(r() * 5);
        for (let k = 0; k < 10; k++) {
          const tx0 = r(), pz = r(), jit = r(), szR = r(), vv = r();
          if (k >= n) continue;
          const p = 0.028 + pz * 0.032;
          const sx = (cx + (tx0 - 0.5) * 26000 - worldX) * p;
          const s = U.lerp(110, 150, szR) * h * METER * p;
          if (sx < -s || sx > w + s) continue;
          farm.push({
            p, sx, s, v: vv, prof: fprof,
            y: h * (groundYf(DREF / p) + (jit - 0.5) * 0.004),
            d: hazeAt(DREF / p),
          });
        }
      }
      for (const t2 of farm) {
        q(D0 / t2.p, () =>
          Assets.turbine(ctx, t2.sx, t2.y, t2.s, colorsFor(t2.prof, t2.d), t2.v, time), t2.y);
      }
    }

    // famous landmarks drift by on their own distant layer
    {
      const p = 0.08, chunkW = 960;
      const lx0 = worldX * p;
      for (let ci = Math.floor((lx0 - 700) / chunkW); ci <= (lx0 + w + 700) / chunkW; ci++) {
        const r = U.rng(U.hash2(ci, 777));
        if (r() > 0.62) continue;
        // never two landmarks side by side: twin Kilimanjaros look wrong
        if (U.rng(U.hash2(ci - 1, 777))() <= 0.62) continue;
        const lwx = (ci * chunkW + chunkW / 2) / p;
        const lbi = biomeAt(lwx);
        const name = r() < lbi.t ? lbi.b : lbi.a;
        const kinds = B[name].landmarks;
        if (!kinds || !kinds.length) continue;
        const kind = kinds[Math.floor(r() * kinds.length) % kinds.length];
        const cfg = LM_CFG[kind];
        const sx = ci * chunkW + (0.2 + r() * 0.6) * chunkW - lx0;
        const s = h * cfg.s * (0.88 + r() * 0.28);
        const vv = r();
        if (sx < -s * 3 || sx > w + s * 3) continue;
        const dL = hazeAt(190);
        const c = {
          rock: tint(U.scale(effC(lwx, 'far'), 0.92), dL, 0.3),
          snow: U.css(U.mix(snowLit, pal.fog, effD(dL))),
          shadow: tint(U.scale(effC(lwx, 'far'), 0.70), dL, 0),
          warm: tint(C('#b4593a'), dL, 0.2),
          green: tint(C('#2f6b46'), dL, 0),
          light,
        };
        const ly = h * (groundYf(190) + (cfg.y - 0.645) * 0.35);
        q(190, () => Assets[kind](ctx, sx, ly, s, c, vv, time), ly);
      }
    }

    // lakes: a local water table on the mid pane — the same emergence as
    // the sea, one pane nearer. Where the mid crest dips below the table,
    // still water shows through.
    const lakeW = effN(cwx, 'lake');
    if (lakeW > 0.02) {
      q(58, () => {
        const top = h * groundYf(72), bot = h * groundYf(46);
        const water = Palette.lit(effC(cwx, 'waterCol'), pal, light);
        const g = ctx.createLinearGradient(0, top, 0, bot);
        g.addColorStop(0, U.css(U.mix(U.mix(water, pal.bot, 0.5), pal.fog, effD(hazeAt(70))), lakeW));
        g.addColorStop(1, U.css(U.mix(water, pal.fog, effD(hazeAt(50))), lakeW));
        ctx.fillStyle = g;
        ctx.fillRect(0, top, w, bot - top);
        // still-water sheen drifting slowly
        ctx.fillStyle = U.css(U.scale(water, 1.3), 0.10 * lakeW * (0.3 + 0.7 * light));
        for (let row = 0; row < 4; row++) {
          const ry = U.lerp(top, bot, (row + 1) / 5);
          const sp = 110 + row * 50;
          const off = (worldX * (0.18 + row * 0.03) + time * (3 + row * 2)) % sp;
          for (let x = -off; x < w; x += sp) {
            ctx.fillRect(x + U.hash2(row, Math.floor((x + off) / sp)) * 40, ry, 16 + row * 8, 1);
          }
        }
      });
    }

    // mid ridge + its landmarks (lighthouses, pagodas)
    q(55, () => {
      const pM = DREF / 55;
      ridge(55, 33, 1 / 360, 'midAmp', 1.0, 'mid', 0.6, waterWpre);
      drawItemSet(pM, 333, 700, 'midDensity', 'midItems', hazeAt(55), (ix) => {
        const nearwx = ix / pM;
        const amp = effN(nearwx, 'midAmp') * h * ampEnv(nearwx, 33);
        return h * groundYf(55) - amp * U.fbm(ix / 360, 33, 3) + 2;
      });
    });

    // distant forest bands: woods on the SLOPES of the ridge panes (their
    // ground lines sit just below the 140 m and 90 m pane baselines, so
    // the trees stand on terrain, never on haze) — and never at sea
    q(120, () => drawItemSet(DREF / 120, 611, 300, 'forestDepth', 'depthItems', hazeAt(120),
      ix => h * (groundYf(120) + 0.004 - 0.007 * U.fbm(ix / 300, 61, 2)), 200, null, true));
    q(70, () => drawItemSet(DREF / 70, 622, 300, 'forestDepth', 'depthItems', hazeAt(70),
      ix => h * (groundYf(70) + 0.004 - 0.008 * U.fbm(ix / 280, 62, 2)), 200, null, true));

    // tree line ridge (the ground band the road sits in), 28 m out
    const treeG = (ix) => h * (groundYf(28) + 0.004 - 0.020 * U.fbm(ix / 260, 44, 2));
    q(28, () => {
      ctx.fillStyle = tint(seasonC(effC(cwx, 'ground'), effN(cwx, 'seasonal')), 0.18, 0.65);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w + 10; sx += 10) ctx.lineTo(sx, treeG(worldX * (DREF / 28) + sx));
      ctx.lineTo(w + 10, h);
      ctx.closePath();
      ctx.fill();
    });

    // road elevation profile: mountain roads rise and (mostly) dip
    const hillW = (biC.a === 'mountains' ? 1 - biC.t : 0) + (biC.b === 'mountains' ? biC.t : 0)
      + 0.3 * ((biC.a === 'forest' ? 1 - biC.t : 0) + (biC.b === 'forest' ? biC.t : 0));
    const roadAmp = h * (0.006 + 0.042 * hillW);
    const rTopAt = sx => {
      const n = U.fbm((worldX + sx) / 950, 77, 2) * 2 - 1;
      return env.roadTop + (n < 0 ? n * 0.3 : n * 1.3) * roadAmp;
    };

    // roadside strip between tree line and road
    q(17.7, () => {
      ctx.fillStyle = tint(U.scale(seasonC(effC(cwx, 'ground'), effN(cwx, 'seasonal')), 0.82), hazeAt(19), 0.7);
      ctx.beginPath();
      ctx.moveTo(0, h * groundYf(19));
      ctx.lineTo(w, h * groundYf(19));
      for (let sx = w; sx >= 0; sx -= 20) ctx.lineTo(sx, rTopAt(sx) + 2);
      ctx.closePath();
      ctx.fill();
    });

    // set pieces: a farmstead, a shrine, a watering hole — composed,
    // recurring-but-rare places the road remembers
    {
      const POI_W = 26000;
      const p0 = DREF / 28, p1 = DREF / 18.2;
      for (let ci = Math.floor((worldX - 900) / POI_W); ci <= (worldX + w + 900) / POI_W; ci++) {
        const r = U.rng(U.hash2(ci, 5151));
        if (r() > 0.55) continue;
        const wx0 = ci * POI_W + (0.2 + r() * 0.6) * POI_W;
        if (effN(wx0, 'water') > 0.35) continue;
        const rs = resolve(wx0);
        const side = r() < rs.t ? rs.b : rs.a;
        const prof = r() < side.vt ? side.p2 : side.p1;
        const pool = POIS[prof.bname] || POIS.generic;
        // a hamlet only once in a long while; otherwise pure nature
        const wantHuman = r() < 0.28 && pool.human && pool.human.length;
        const list2 = wantHuman ? pool.human : (pool.nature || pool.human);
        const poi = list2[Math.floor(r() * list2.length) % list2.length];
        const z = 0.45 + r() * 0.35;
        const p = U.lerp(p0, p1, z);
        const c = colorsFor(prof, hazeAt(DREF / p));
        for (const m2 of poi) {
          const sx = (wx0 + m2.dx * h * METER - worldX) * p;
          if (sx < -300 || sx > w + 300) continue;
          const y = U.lerp(treeG(worldX * (DREF / 28) + sx), rTopAt(sx) - h * 0.010, z);
          const size = softScale(itemMeters(m2.type, m2.s) * h * METER * p, h * 1.05);
          const vv = (m2.v + ci * 0.137) % 1;
          q(DREF / p, () => {
            itemShadow(sx, y, size);
            Assets[m2.type](ctx, sx, y, size, c, vv, time);
          }, y);
        }
      }
    }

    // near field behind the road: items at every depth from the tree line
    // down to the far shoulder (forest biomes get real staggered depth)
    for (const o of nearFieldItems(444, 660, 'density', 'items',
      DREF / 28, DREF / 18.2, hazeAt(28), hazeAt(18.2),
      (sx, z) => U.lerp(treeG(worldX * (DREF / 28) + sx), rTopAt(sx) - h * 0.010, z))) {
      q(o.dist, () => paintItem(o), o.y);
    }


    /* roadside furniture comes in long stretches that simply start and stop:
       power wires, street lamps, an avenue of planted trees, or nothing. */
    {
      const FSEG = 5200;
      const ftype = i => {
        const r = U.hash1(i * 7919 + 37);
        return r < 0.30 ? 'wires' : r < 0.74 ? 'plain' : r < 0.92 ? 'avenue' : 'lights';
      };
      const fAt = x => ftype(Math.floor(x / FSEG));
      const d = effD(0.09);
      const polC = { dark: U.css(U.mix(Palette.lit(C('#2e2a26'), pal, light), pal.fog, d)) };

      // power poles: each stretch picks a side of the road, its own pole
      // height and cable sag; runs begin and end with a cable that rises
      // out of / drops back into the ground
      {
        // ~45 m between poles; each shoulder lives at its own parallax, so
        // the near row is bigger AND spreads wider on screen than the far
        const sp = 1500;
        const PSH = [DREF / 17.6, DREF / 12.2]; // far, near shoulder
        const rdH = env.roadBot - env.roadTop;
        const i0 = Math.floor((worldX - 2 * sp) / sp), i1 = Math.floor((worldX + w + 2 * sp) / sp);
        const runs = [[], []]; // far shoulder, near shoulder
        for (let i = i0; i <= i1; i++) {
          const wx1 = i * sp;
          if (fAt(wx1) !== 'wires') continue;
          const si = Math.floor(wx1 / FSEG);
          const side = U.hash1(si * 511 + 9) < 0.6 ? 0 : 1;
          const pS = PSH[side];
          const H = (9 + U.hash1(si * 727 + 3) * 2) * h * METER * pS; // 9-11 m
          const x1 = (wx1 - worldX) * pS;
          const baseY = side === 0
            ? rTopAt(x1) + h * 0.004
            : rTopAt(x1) + rdH + h * 0.014;
          runs[side].push({
            i, x1, H, baseY, pS,
            topY: baseY - H * 0.92,
            sag: H * (0.10 + U.hash1(si * 313 + 5) * 0.16),
          });
        }
        const drawRun = list => {
          ctx.strokeStyle = polC.dark;
          ctx.lineWidth = 1;
          for (let n = 0; n < list.length; n++) {
            const p1 = list[n], p2 = list[n + 1];
            const linked = p2 && p2.i === p1.i + 1;
            if (linked) {
              ctx.beginPath();
              ctx.moveTo(p1.x1, p1.topY);
              ctx.quadraticCurveTo((p1.x1 + p2.x1) / 2, (p1.topY + p2.topY) / 2 + p1.sag, p2.x1, p2.topY);
              ctx.moveTo(p1.x1, p1.topY + p1.H * 0.12);
              ctx.quadraticCurveTo((p1.x1 + p2.x1) / 2, (p1.topY + p2.topY) / 2 + p1.H * 0.12 + p1.sag, p2.x1, p2.topY + p2.H * 0.12);
              ctx.stroke();
            }
            const prev = list[n - 1];
            const fs = sp * p1.pS; // on-screen span to the neighbour pole
            // anchor cables hang BELOW their straight chord (gravity), the
            // same concave sag as the pole-to-pole spans
            if (!(prev && prev.i === p1.i - 1)) { // run starts: feed from the ground
              const gx = p1.x1 - fs * 0.30, gy = p1.baseY + 6;
              ctx.beginPath();
              ctx.moveTo(gx, gy);
              ctx.quadraticCurveTo((gx + p1.x1) / 2, (gy + p1.topY) / 2 + p1.sag * 0.7, p1.x1, p1.topY);
              ctx.stroke();
            }
            if (!linked) { // run ends: cable drops back into the ground
              const gx = p1.x1 + fs * 0.30, gy = p1.baseY + 6;
              ctx.beginPath();
              ctx.moveTo(p1.x1, p1.topY);
              ctx.quadraticCurveTo((gx + p1.x1) / 2, (gy + p1.topY) / 2 + p1.sag * 0.7, gx, gy);
              ctx.stroke();
            }
            Assets.pole(ctx, p1.x1, p1.baseY, p1.H, polC);
          }
        };
        if (runs[0].length) q(17.65, () => drawRun(runs[0]), runs[0][0].baseY);
        if (runs[1].length) q(12.2, () => drawRun(runs[1]), runs[1][0].baseY);
      }

      // street lamps: far side, near side, or alternating — per stretch,
      // with varying post heights
      {
        // ~35 m between lamps (alternating sides doubles the per-side gap);
        // shoulder parallax stretches the near row's size and spacing
        const sp = 1200;
        const rdH = env.roadBot - env.roadTop;
        const lampGlow = U.clamp((0.5 - light) / 0.4, 0, 1);
        const i0 = Math.floor((worldX - 600) / sp), i1 = Math.floor((worldX + w + 600) / sp);
        for (let i = i0; i <= i1; i++) {
          const wx1 = i * sp + 180;
          if (fAt(wx1) !== 'lights') continue;
          const si = Math.floor(wx1 / FSEG);
          const mode = Math.floor(U.hash1(si * 419 + 11) * 3); // far | near | alternating
          const side = mode === 2 ? (i % 2) : mode;
          const pS = side === 0 ? DREF / 17.6 : DREF / 12.2;
          const S = (7 + U.hash1(si * 941 + 7) * 2) * h * METER * pS; // 7-9 m
          const x1 = (wx1 - worldX) * pS;
          if (x1 < -160 || x1 > w + 160) continue;
          if (side === 0) {
            const yy = rTopAt(x1) + h * 0.004;
            q(17.65, () => Assets.streetlight(ctx, x1, yy, S,
              { dark: polC.dark, glowA: lampGlow, poolDY: rdH * 0.45 }, U.hash1(i)), yy);
          } else {
            const yy = rTopAt(x1) + rdH + h * 0.012;
            q(12.2, ((xx, SS, vv) => () => {
              ctx.save();
              ctx.translate(xx, 0);
              ctx.scale(-1, 1); // mirrored: the arm reaches back over the road
              Assets.streetlight(ctx, 0, yy, SS,
                { dark: polC.dark, glowA: lampGlow, poolDY: -rdH * 0.5 }, vv);
              ctx.restore();
            })(x1, S, U.hash1(i)), yy);
          }
        }
      }

      // a planted avenue: evenly spaced, uniform trees fitting the biome
      {
        const sp = 540; // ~16 m between planted trees
        const i0 = Math.floor((worldX - 300) / sp), i1 = Math.floor((worldX + w + 300) / sp);
        let avC = null, avName = null;
        for (let i = i0; i <= i1; i++) {
          const wx1 = i * sp + 150;
          if (fAt(wx1) !== 'avenue') continue;
          const x1 = (wx1 - worldX) * (DREF / 17.6); // far shoulder parallax
          if (x1 < -200 || x1 > w + 200) continue;
          const ars = resolve(wx1);
          const aside = ars.t < 0.5 ? ars.a : ars.b;
          const aprof = aside.vt < 0.5 ? aside.p1 : aside.p2;
          if (aprof.key !== avName) { avName = aprof.key; avC = colorsFor(aprof, 0.09); }
          const tfn = Assets[aprof.avenue] || Assets.roundTree;
          const c2 = avC, ty = rTopAt(x1) + h * 0.004;
          const ts = (6 + U.hash1(i * 31) * 3) * h * METER * (DREF / 17.6);
          q(17.65, () => {
            itemShadow(x1, ty, ts);
            tfn(ctx, x1, ty, ts, c2, 0.4 + U.hash1(i * 17) * 0.3, time);
          }, ty);
        }
      }
    }

    /* ---------------- the road (an undulating band) ---------------- */
    const { roadTop, roadBot } = env;
    const roadH = roadBot - roadTop;
    q(15, () => {
    const roadPath = new Path2D();
    roadPath.moveTo(0, rTopAt(0));
    for (let sx = 20; sx <= w + 20; sx += 20) roadPath.lineTo(sx, rTopAt(sx));
    for (let sx = w + 20; sx >= 0; sx -= 20) roadPath.lineTo(sx, rTopAt(sx) + roadH);
    roadPath.closePath();

    let asph = Palette.lit(C('#3a3e45'), pal, light);
    asph = U.scale(asph, 1 - 0.30 * wet); // rain darkens the asphalt
    ctx.fillStyle = U.css(U.mix(asph, pal.fog, effD(0.07)));
    ctx.fill(roadPath);

    if (wet > 0.02) { // sky sheen on wet asphalt
      ctx.save();
      ctx.clip(roadPath);
      const g = ctx.createLinearGradient(0, roadTop - roadAmp, 0, roadBot + roadAmp * 1.4);
      g.addColorStop(0, U.css(pal.bot, 0.16 * wet));
      g.addColorStop(1, U.css(pal.bot, 0.04 * wet));
      ctx.fillStyle = g;
      ctx.fillRect(0, roadTop - roadAmp, w, roadH + roadAmp * 2.4);
      // low sun / moon mirrored as a soft streak on the wet road
      const gx = env.sunX !== undefined && env.sunLow > 0.3 ? env.sunX : env.moonX;
      if (gx !== undefined) {
        const gg = ctx.createLinearGradient(0, roadTop, 0, roadBot);
        const cc = env.sunX !== undefined && env.sunLow > 0.3 ? '255,200,140,' : '220,230,250,';
        gg.addColorStop(0, `rgba(${cc}${0.16 * wet})`);
        gg.addColorStop(1, `rgba(${cc}0)`);
        ctx.fillStyle = gg;
        ctx.fillRect(gx - w * 0.04, roadTop - roadAmp, w * 0.08, roadH + roadAmp * 2.4);
      }
      ctx.restore();
    }

    // subtle worn patches drifting by
    {
      const sp = 380;
      ctx.fillStyle = `rgba(10,12,16,${0.10 * (1 - snowC)})`;
      for (let i = Math.floor(worldX / sp); i <= (worldX + w) / sp; i++) {
        const r1 = U.hash2(i, 901), r2 = U.hash2(i, 902);
        if (r1 < 0.45) continue;
        const px = i * sp - worldX + r2 * sp;
        ctx.beginPath();
        ctx.ellipse(px, rTopAt(px) + roadH * (0.25 + r1 * 0.5),
          40 + r2 * 60, 4 + r1 * 4, 0, 0, TAU);
        ctx.fill();
      }
    }

    // lane markings follow the profile (snow gradually buries them)
    {
      const lineA = (1 - snowC * 0.85) * (1 - wet * 0.25);
      const center = new Path2D();
      center.moveTo(0, rTopAt(0) + roadH * 0.52);
      for (let sx = 20; sx <= w + 20; sx += 20) center.lineTo(sx, rTopAt(sx) + roadH * 0.52);
      ctx.strokeStyle = U.css(U.mix(Palette.lit(C('#d8d8cf'), pal, light), pal.fog, effD(0.07)), 0.8 * lineA);
      ctx.lineWidth = 3.6;
      ctx.setLineDash([46, 76]);
      ctx.lineDashOffset = worldX % 122;
      ctx.stroke(center);
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.strokeStyle = U.css(U.mix(Palette.lit(C('#c8c8c0'), pal, light), pal.fog, effD(0.07)), 0.45 * lineA);
      ctx.lineWidth = 2.4;
      const eTop = new Path2D(), eBot = new Path2D();
      eTop.moveTo(0, rTopAt(0) + 5);
      eBot.moveTo(0, rTopAt(0) + roadH - 8);
      for (let sx = 20; sx <= w + 20; sx += 20) {
        eTop.lineTo(sx, rTopAt(sx) + 5);
        eBot.lineTo(sx, rTopAt(sx) + roadH - 8);
      }
      ctx.stroke(eTop);
      ctx.stroke(eBot);
    }

    // snow accumulation: banks on the shoulders, slush veil over the lane
    if (snowC > 0.01) {
      const sc = U.mix(snowLit, pal.fog, effD(0.07));
      const bTop = new Path2D(), bBot = new Path2D();
      bTop.moveTo(0, rTopAt(0) + roadH * 0.06);
      bBot.moveTo(0, rTopAt(0) + roadH * 0.97);
      for (let sx = 20; sx <= w + 20; sx += 20) {
        bTop.lineTo(sx, rTopAt(sx) + roadH * 0.06);
        bBot.lineTo(sx, rTopAt(sx) + roadH * 0.97);
      }
      ctx.strokeStyle = U.css(sc, 0.9 * snowC);
      ctx.lineWidth = roadH * 0.16;
      ctx.stroke(bTop);
      ctx.lineWidth = roadH * 0.22;
      ctx.stroke(bBot);
      ctx.fillStyle = U.css(sc, 0.18 * snowC);
      ctx.fill(roadPath);
    }
    });

    /* ---------------- the car (rides and tilts with the road) ------- */
    q(13.6, () => {
    const carX = env.carX;
    const carSurf = rTopAt(carX) + roadH * 0.60;
    const slope = (rTopAt(carX + 60) - rTopAt(carX - 60)) / 120;
    // the car is the scale constant — except on tiny viewports (phones),
    // where it shrinks so it doesn't tower over the scenery
    const cs = U.clamp(Math.min(h / 760, w / 1100), 0.42, 1);
    const car = Cars.LIST[env.carIndex] || Cars.LIST[0];
    // suspension: the wheels ride the road texture, the body follows on a
    // lagged spring with a hint of pitch — planted, never floating
    const wp = car.wheels || [-64, 64];
    const spd = U.clamp(env.speed / 135, 0, 1.4);
    const bumpAt = wx2 => (U.noise1(wx2 / 29, 510) - 0.5) * 2 * (0.7 + 1.5 * spd);
    const dR = bumpAt(worldX + wp[0] * cs);
    const dF = bumpAt(worldX + wp[1] * cs);
    const sdt = Math.min(env.dt || 0, 0.05);
    if (sdt > 0) {
      const targY = (dR + dF) * 0.5;
      const targP = (dF - dR) / ((wp[1] - wp[0]) * cs) * 0.55;
      susp.vy += (targY - susp.y) * 38 * sdt;
      susp.vy *= Math.max(0, 1 - 8 * sdt);
      susp.y += susp.vy * sdt;
      susp.vp += (targP - susp.p) * 30 * sdt;
      susp.vp *= Math.max(0, 1 - 8 * sdt);
      susp.p += susp.vp * sdt;
    }
    const idle = env.speed < 5 ? Math.sin(time * 9) * 0.25 : 0;
    ctx.save();
    ctx.translate(carX, carSurf);
    ctx.rotate(Math.atan(slope) + susp.p);
    ctx.scale(cs, cs);
    { // soft contact shadow: radial falloff + dark patches under the wheels
      const shA = 0.10 + 0.24 * light;
      ctx.save();
      ctx.translate(0, 3);
      ctx.scale(1, 0.08);
      const sg = ctx.createRadialGradient(0, 0, 12, 0, 0, 108);
      sg.addColorStop(0, `rgba(3,5,12,${shA})`);
      sg.addColorStop(0.65, `rgba(3,5,12,${shA * 0.55})`);
      sg.addColorStop(1, 'rgba(3,5,12,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(-110, -110, 220, 220);
      ctx.restore();
      ctx.fillStyle = `rgba(3,5,12,${0.16 + 0.22 * light})`;
      for (const wpx of (car.wheels || [-64, 64])) {
        ctx.beginPath();
        ctx.ellipse(wpx, 1.5, 23, 3.2, 0, 0, TAU);
        ctx.fill();
      }
    }
    const shade = base => U.css(U.mix(Palette.lit(base, pal, light), pal.fog, effD(0.05)));
    car.draw(ctx, {
      x: 0, y: 0, time, light,
      wheelRot: env.wheelRot, bob: susp.y + idle, drops: [dR, dF],
      speed: env.speed, shade,
    });

    // wheel spray on a wet road
    if (wet > 0.12 && env.speed > 40) {
      ctx.fillStyle = `rgba(200,214,228,${(0.05 + 0.16 * wet) * (0.3 + 0.7 * light)})`;
      for (let k = 0; k < 9; k++) {
        const fr = Math.random();
        const px = -70 - fr * 55 - Math.random() * 20;
        const py = -2 - fr * (14 + wet * 14) * Math.random();
        const pr = 0.8 + Math.random() * 2.2 * (1 - fr * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    });

    /* ---------------- foreground bank ---------------- */
    q(12.05, () => {
      ctx.fillStyle = tint(U.scale(seasonC(effC(cwx, 'ground'), effN(cwx, 'seasonal')), 0.52), 0.03, 0.7);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w + 20; sx += 20) ctx.lineTo(sx, rTopAt(sx) + roadH);
      ctx.lineTo(w + 20, h);
      ctx.closePath();
      ctx.fill();
    });

    // near field in front of the road — the bank runs from the road lip
    // (12 m) to the bottom of the frame (9.5 m); same ladder, same rule
    for (const o of nearFieldItems(555, 300, 'fgDensity', 'fgItems',
      DREF / 12, DREF / 9.5, hazeAt(12), hazeAt(9.5),
      (sx, z) => rTopAt(sx) + roadH + (h - roadBot) * U.lerp(0.15, 1.0, z))) {
      q(o.dist, () => paintItem(o), o.y);
    }

    // colossal redwood trunks sweeping past, floor to ceiling
    {
      const p = 1.45, chunkW = 1500, lx0 = worldX * p;
      for (let ci = Math.floor((lx0 - 300) / chunkW); ci <= (lx0 + w + 300) / chunkW; ci++) {
        const r = U.rng(U.hash2(ci, 4447));
        const rrs = resolve((ci * chunkW + chunkW / 2) / p);
        if (r() > 0.55) continue;
        const rside = r() < rrs.t ? rrs.b : rrs.a;
        const rprof = r() < rside.vt ? rside.p2 : rside.p1;
        const sx = ci * chunkW + r() * chunkW - lx0;
        const vv = r();
        if (rprof.bname !== 'redwood') continue;
        if (sx < -500 || sx > w + 500) continue;
        // capped: at full true scale the trunk slab swallows half the frame
        q(D0 / 1.45, () => Assets.redwoodTrunk(ctx, sx, h + 30,
          softScale(itemMeters('redwoodTrunk', vv) * h * METER * 1.45, h * 2.0),
          colorsFor(rprof, 0.012), vv), h + 30);
      }
    }

    /* ---------------- fireflies on forest evenings ---------------- */
    const forestW = (biC.a === 'forest' ? 1 - biC.t : 0) + (biC.b === 'forest' ? biC.t : 0);
    if (forestW > 0.05 && light < 0.42) q(8, () => {
      const aBase = U.clamp((0.42 - light) / 0.3, 0, 1) * forestW;
      const sp = 240, p = 0.85;
      for (let i = Math.floor(worldX * p / sp); i <= (worldX * p + w) / sp; i++) {
        for (let k = 0; k < 2; k++) {
          const r1 = U.hash2(i, 71 + k), r2 = U.hash2(i, 81 + k), r3 = U.hash2(i, 91 + k);
          const fx = i * sp + r1 * sp - worldX * p + Math.sin(time * (0.3 + r3 * 0.4) + r2 * 9) * 24;
          const fy = h * (0.66 + r2 * 0.16) + Math.sin(time * (0.5 + r1) + r3 * 9) * 10;
          const blink = Math.pow(Math.max(0, Math.sin(time * (0.8 + r3 * 1.4) + r1 * 40)), 3);
          if (blink < 0.05) continue;
          const a = aBase * blink;
          ctx.fillStyle = `rgba(255,217,122,${0.9 * a})`;
          ctx.beginPath(); ctx.arc(fx, fy, 1.4, 0, TAU); ctx.fill();
          ctx.fillStyle = `rgba(255,217,122,${0.18 * a})`;
          ctx.beginPath(); ctx.arc(fx, fy, 5, 0, TAU); ctx.fill();
        }
      }
    });
    /* ---- near hillsides that briefly hide the road (mountain passes) ---- */
    {
      const p = 1.55, chunkW = 900;
      const lx0 = worldX * p;
      const pad = h * 1.3;
      for (let ci = Math.floor((lx0 - pad) / chunkW); ci <= (lx0 + w + pad) / chunkW; ci++) {
        const r = U.rng(U.hash2(ci, 888));
        const owx = (ci * chunkW + chunkW / 2) / p;
        if (r() > effN(owx, 'occluder')) continue;
        const sx = ci * chunkW + r() * chunkW - lx0;
        const rad = h * (0.25 + r() * 0.75); // hill size varies; 1.0h is the cap
        const ors = resolve(owx);
        const oside = r() < ors.t ? ors.b : ors.a;
        const oprof = oside.vt > 0.5 ? oside.p2 : oside.p1;
        if (sx < -rad - 80 || sx > w + rad + 80) continue;
        // an irregular mound, not a perfect circle: the crest is shaped by
        // noise so every hillside has its own profile
        const peak = rad * (0.50 + r() * 0.18) + 40;
        const domeY = tq => (h + 30)
          - Math.pow(Math.sin(Math.PI * U.clamp(tq, 0, 1)), 0.8) * peak
          * (0.78 + 0.30 * U.noise1(tq * 2.8 + ci * 7.31, 889));
        const c = colorsFor(oprof, 0.015);
        const hillFill = tint(U.scale(oprof.ground, 0.40), 0.015, 0.7);
        // huge trees (this hillside is nearer than the car) scatter over
        // the crest AND down the front face; species follow the biome
        const hillTrees = [];
        for (let k = 0; k < 7; k++) {
          const gate = r(), pickR = r(), tq0 = r(), face = r(), ts0 = r(), vv = r();
          if (gate > 0.55) continue;
          const table = oprof.items;
          let type = table[table.length - 1][0];
          for (const e of table) if (pickR <= e[1]) { type = e[0]; break; }
          if (!OCC_TREES[type]) continue;
          const tq = 0.10 + tq0 * 0.80;
          const ty = domeY(tq);
          hillTrees.push({
            type, vv,
            x: sx - rad + tq * 2 * rad,
            y: ty + face * face * (h + 20 - ty) * 0.55 + 4,
            s: softScale(itemMeters(type, ts0) * h * METER * 1.55, h * 1.0),
          });
        }
        hillTrees.sort((a2, b2) => a2.y - b2.y); // lower on the face = nearer
        q(D0 / 1.55, () => {
          ctx.fillStyle = hillFill;
          ctx.beginPath();
          ctx.moveTo(sx - rad, h + 40);
          for (let qi = 0; qi <= 22; qi++) {
            const tq = qi / 22;
            ctx.lineTo(sx - rad + tq * 2 * rad, domeY(tq));
          }
          ctx.lineTo(sx + rad, h + 40);
          ctx.closePath();
          ctx.fill();
          for (const t2 of hillTrees) Assets[t2.type](ctx, t2.x, t2.y, t2.s, c, t2.vv, time);
        }, h + 40);
      }
    }

    /* ---- paint the world: one pass, far to near ---- */
    Q.sort((a2, b2) => (b2.dist - a2.dist) || (a2.y - b2.y));
    for (const o of Q) o.fn();
  }

  function setFixedBiome(name) {
    fixed = BIOME_NAMES.includes(name) ? name : null;
    itemCache.clear();
  }

  /* the road's latitude drifts with the biomes: tundra is arctic,
     the savanna equatorial — blended through the same crossfade */
  function latAt(wx) {
    const bi = biomeAt(wx);
    return U.lerp(B[bi.a].homeLat, B[bi.b].homeLat, bi.t);
  }

  /* climatological snow: where the seasonal temperature sits below
     freezing the ground is ALREADY white when you arrive — blended
     across biome borders like everything else. Weather adds on top. */
  function snowBaseAt(wx, doy) {
    const bi = biomeAt(wx);
    const warm = 0.5 + 0.5 * Math.cos(2 * Math.PI * ((doy || 166) - 201) / 365);
    const t = U.lerp(
      U.lerp(B[bi.a].tempLo, B[bi.a].tempHi, warm),
      U.lerp(B[bi.b].tempLo, B[bi.b].tempHi, warm), bi.t);
    return U.clamp((2 - t) / 6, 0, 0.95); // white below -4 C, bare above 2
  }

  function gradeAt(wx) {
    const bi = biomeAt(wx);
    const a = B[bi.a].grade, b = B[bi.b].grade;
    if (bi.t === 0) return a;
    return {
      tint: U.mix(a.tint, b.tint, bi.t),
      s: U.lerp(a.s, b.s, bi.t),
      lm: U.lerp(a.lm, b.lm, bi.t),
    };
  }

  /* per-biome weather weights + seasonal climate, consumed by weather
     and the daily forecast */
  const WEATHER_TABLES = {};
  const CLIMATES = {};
  BIOME_NAMES.forEach(n => {
    WEATHER_TABLES[n] = B[n].weather;
    CLIMATES[n] = { hi: B[n].tempHi, lo: B[n].tempLo };
  });

  return {
    render, biomeAt, weightOf, setFixedBiome, gradeAt, latAt, snowBaseAt, BIOME_NAMES, WEATHER_TABLES, CLIMATES,
    auroraAt: wx => effN(wx, 'aurora'),
  };
})();
