/* Endless Drive — the world: parallax ridge layers, biome blending, chunked
   procedural item placement, the road, the car, and weather ground effects
   (wet asphalt sheen, accumulating snow cover). */
window.Scene = (() => {
  const C = U.col;
  const { TAU } = U;

  /* ---------------- biome definitions (colors are full-daylight bases) --- */
  function tbl(pairs) {
    let tot = 0; pairs.forEach(p => { tot += p[1]; });
    let acc = 0;
    return pairs.map(p => { acc += p[1]; return [p[0], acc / tot]; });
  }
  /* ======================= BIOME DEFINITIONS =======================
     Each biome is ONE self-contained object; mk() fills defaults, so a
     new biome only states what makes it different. Fields:

     Terrain  far/mid/ground       layer base colors (full daylight)
              farAmp/midAmp        ridge heights (fraction of viewport h)
              ridged 0..1          0 = rolling hills, 1 = sharp alpine peaks
              snowcap 0..1         permanent snow on ridge tops
              water 0..1           open sea behind the mid layer
              waterCol             sea color (ice drifts in cold seas)
     Flora    fol/fol2/trunk       foliage + bark colors
              density + items      tree-line items (weighted table via tbl)
              fgDensity + fgItems  foreground-strip items
              midDensity/midItems  rare structures on the mid ridge
              avenue               tree used for planted roadside avenues
     Light    grade {tint,s,lm}    color cast, strength, light multiplier
              aurora 0..1          northern lights on clear nights
     Weather  weather              [[type, weight], ...] for auto mode;
                                   types: clear overcast rain snow fog
     Extras   landmarks            famous-silhouette pool for this biome
              occluder 0..1        near hillsides that briefly hide the road
  ================================================================== */
  function mk(def) {
    return Object.assign({
      far: C('#7d92aa'), mid: C('#8fae70'), ground: C('#79a35d'),
      fol: C('#55844a'), fol2: C('#6f9c54'), trunk: C('#6b5340'),
      farAmp: 0.10, midAmp: 0.06, ridged: 0, snowcap: 0,
      water: 0, waterCol: C('#3c6f95'), aurora: 0, occluder: 0,
      landmarks: [], grade: { tint: C('#ffffff'), s: 0, lm: 1 },
      avenue: 'roundTree',
      density: 3, items: tbl([['roundTree', 1]]),
      fgDensity: 2, fgItems: tbl([['tuft', 1]]),
      midDensity: 0, midItems: null,
      forestDepth: 0, depthItems: tbl([['pine', .6], ['roundTree', .4]]),
      weather: [['clear', 5], ['overcast', 2], ['rain', 1.5], ['fog', 0.8]],
    }, def);
  }

  const B = {
    plains: mk({
      far: C('#7d92aa'), mid: C('#8fae70'), ground: C('#79a35d'),
      fol: C('#55844a'), fol2: C('#6f9c54'), trunk: C('#6b5340'),
      farAmp: 0.10, midAmp: 0.055, snowcap: 0, water: 0, waterCol: C('#3c6f95'), aurora: 0,
      ridged: 0, occluder: 0, landmarks: ['kilimanjaro', 'devilsTower', 'oldFaithful'],
      grade: { tint: C('#ffe3a8'), s: 0.12, lm: 1.0 }, avenue: 'roundTree',
      density: 3.0, items: tbl([['roundTree', .40], ['bush', .18], ['tuft', .14], ['pine', .06], ['barn', .05], ['turbine', .10], ['sign', .04], ['rock', .03]]),
      fgDensity: 2.2, fgItems: tbl([['tuft', .52], ['bush', .26], ['roundTree', .12], ['rock', .1]]),
      forestDepth: 0.5,
      midDensity: 0, midItems: null,
      weather: [['clear', 5], ['overcast', 2], ['rain', 2], ['fog', 0.5]],
      variants: [
        [{ key: 'groves', density: 6.5, forestDepth: 2, items: tbl([['roundTree', .5], ['pine', .2], ['bush', .2], ['tuft', .1]]) }, 2],
        [{ key: 'farmland', density: 3.5, items: tbl([['barn', .18], ['turbine', .30], ['roundTree', .22], ['tuft', .2], ['sign', .1]]) }, 2],
        [{ key: 'lakeside', water: 0.55, waterCol: C('#447a99'), farAmp: 0.07 }, 1.5],
      ],
    }),
    forest: mk({
      far: C('#5e7b94'), mid: C('#557e62'), ground: C('#47714f'),
      fol: C('#2f5d3e'), fol2: C('#3d7050'), trunk: C('#4a3a2c'),
      farAmp: 0.14, midAmp: 0.07, snowcap: 0, water: 0, waterCol: C('#3c6f95'), aurora: 0,
      ridged: 0.15, occluder: 0.035, landmarks: [],
      grade: { tint: C('#7fae84'), s: 0.14, lm: 0.94 }, avenue: 'roundTree',
      density: 10, items: tbl([['pine', .50], ['roundTree', .25], ['birch', .14], ['deadTree', .04], ['bush', .05], ['cabin', .02]]),
      fgDensity: 2.5, fgItems: tbl([['bush', .42], ['tuft', .28], ['pine', .15], ['rock', .15]]),
      forestDepth: 5, depthItems: tbl([['pine', .7], ['roundTree', .3]]),
      midDensity: 0, midItems: null,
      weather: [['clear', 5], ['overcast', 2], ['rain', 2], ['fog', 1]],
      variants: [
        [{ key: 'clearing', density: 2.2, forestDepth: 2, items: tbl([['bush', .35], ['tuft', .25], ['roundTree', .2], ['deadTree', .1], ['rock', .1]]) }, 2],
        [{ key: 'lakeside', water: 0.6, waterCol: C('#3f7390'), density: 6 }, 1.5],
      ],
    }),
    desert: mk({
      far: C('#b9805a'), mid: C('#d3a06a'), ground: C('#dcb077'),
      fol: C('#5e7d4a'), fol2: C('#8a6a4a'), trunk: C('#7a5a3e'),
      farAmp: 0.06, midAmp: 0.04, snowcap: 0, water: 0, waterCol: C('#3c6f95'), aurora: 0,
      ridged: 0, occluder: 0, landmarks: ['monumentValley', 'delicateArch', 'uluru', 'namibDune', 'bryceHoodoos'],
      grade: { tint: C('#ffb24d'), s: 0.22, lm: 1.06 }, avenue: 'palm',
      density: 1.6, items: tbl([['cactus', .45], ['bush', .20], ['rock', .20], ['tuft', .10], ['sign', .05]]),
      fgDensity: 1.2, fgItems: tbl([['rock', .45], ['tuft', .28], ['bush', .15], ['cactus', .12]]),
      midDensity: 0.55, midItems: tbl([['mesa', 1]]),
      weather: [['clear', 9], ['overcast', 0.6]],
      baseW: 6, // deserts stay deserts — less internal variety
      variants: [
        [{ key: 'mesaField', midDensity: 1.3 }, 2],
        [{ key: 'dunes', density: 0.7, farAmp: 0.05, items: tbl([['tuft', .4], ['rock', .35], ['bush', .25]]) }, 2],
      ],
    }),
    mountains: mk({
      far: C('#8c9cb2'), mid: C('#67788a'), ground: C('#5e7a52'),
      fol: C('#35594a'), fol2: C('#42685a'), trunk: C('#4f4438'),
      farAmp: 0.30, midAmp: 0.13, snowcap: 1, water: 0, waterCol: C('#3c6f95'), aurora: 0,
      ridged: 1, occluder: 0.10, landmarks: ['matterhorn', 'everest', 'halfDome', 'glacier'],
      grade: { tint: C('#b9c8e8'), s: 0.15, lm: 1.0 }, avenue: 'pine',
      density: 3.2, items: tbl([['pine', .62], ['rock', .26], ['deadTree', .06], ['tuft', .06]]),
      fgDensity: 1.6, fgItems: tbl([['rock', .52], ['tuft', .36], ['pine', .12]]),
      forestDepth: 1.5,
      midDensity: 0, midItems: null,
      weather: [['clear', 5], ['overcast', 2], ['snow', 2], ['fog', 1]],
      variants: [
        [{ key: 'alpineLake', water: 0.5, waterCol: C('#3f7a90') }, 1.5],
        [{ key: 'forestedValley', farAmp: 0.20, midAmp: 0.09, density: 6, forestDepth: 5, items: tbl([['pine', .8], ['rock', .12], ['tuft', .08]]) }, 2],
      ],
    }),
    coast: mk({
      far: C('#6f93ae'), mid: C('#cbb98a'), ground: C('#86a868'),
      fol: C('#4e7d4a'), fol2: C('#6f9c54'), trunk: C('#7a6a4e'),
      farAmp: 0.02, midAmp: 0.03, snowcap: 0, water: 1, waterCol: C('#3c6f95'), aurora: 0,
      ridged: 0, occluder: 0, landmarks: ['hawaii', 'etna'],
      grade: { tint: C('#b8e4de'), s: 0.15, lm: 1.04 }, avenue: 'palm',
      density: 1.8, items: tbl([['palm', .42], ['bush', .20], ['tuft', .20], ['rock', .12], ['sign', .06]]),
      fgDensity: 1.6, fgItems: tbl([['tuft', .5], ['rock', .18], ['bush', .17], ['palm', .15]]),
      midDensity: 0.12, midItems: tbl([['lighthouse', 1]]),
      weather: [['clear', 5], ['overcast', 2], ['rain', 2], ['fog', 1]],
      variants: [
        [{ key: 'headland', water: 0.3, density: 3.2, farAmp: 0.07, midDensity: 0 }, 2],
        [{ key: 'palmGrove', density: 4, items: tbl([['palm', .7], ['bush', .2], ['tuft', .1]]) }, 1.5],
      ],
    }),
    tundra: mk({
      far: C('#9fb3c8'), mid: C('#c2cfdc'), ground: C('#dde7f0'),
      fol: C('#2e4a44'), fol2: C('#43555a'), trunk: C('#5a4a3c'),
      farAmp: 0.15, midAmp: 0.06, snowcap: 0.9, water: 0.85, waterCol: C('#28465e'), aurora: 1,
      ridged: 0.45, occluder: 0.03, landmarks: ['denali', 'eyjafjallajokull'],
      grade: { tint: C('#9fc0e4'), s: 0.22, lm: 0.92 }, avenue: 'pine',
      density: 1.1, items: tbl([['deadTree', .38], ['pine', .30], ['rock', .22], ['cabin', .10]]),
      fgDensity: 0.6, fgItems: tbl([['rock', .6], ['tuft', .3], ['deadTree', .1]]),
      midDensity: 0, midItems: null,
      weather: [['clear', 5], ['overcast', 2], ['snow', 2], ['fog', 1]],
      variants: [
        [{ key: 'inland', water: 0, density: 1.8 }, 2.5],
        [{ key: 'iceShelf', water: 0.95, density: 0.5 }, 1.5],
      ],
    }),
    redwood: mk({
      far: C('#5e7e88'), mid: C('#41614f'), ground: C('#3c5a44'),
      fol: C('#2c5a3c'), fol2: C('#3e7050'), trunk: C('#7a4634'),
      farAmp: 0.13, midAmp: 0.075, snowcap: 0, water: 0, waterCol: C('#3c6f95'), aurora: 0,
      ridged: 0.1, occluder: 0.05, landmarks: ['halfDome'],
      grade: { tint: C('#9bbf9e'), s: 0.18, lm: 0.93 }, avenue: 'pine',
      density: 5.5, items: tbl([['redwood', .42], ['pine', .18], ['fern', .16], ['roundTree', .10], ['bush', .14]]),
      fgDensity: 2.4, fgItems: tbl([['fern', .46], ['bush', .28], ['tuft', .18], ['pine', .08]]),
      forestDepth: 4, depthItems: tbl([['pine', .8], ['roundTree', .2]]),
      midDensity: 0, midItems: null,
      weather: [['clear', 4], ['overcast', 2.5], ['rain', 2], ['fog', 2.5]],
      baseW: 6, // the groves go on and on — low variety, that's the point
      variants: [
        [{ key: 'clearing', density: 1.8, items: tbl([['fern', .4], ['bush', .3], ['roundTree', .2], ['rock', .1]]) }, 1.5],
      ],
    }),
    fjord: mk({ // Norway: sheer snowcapped walls dropping into a deep teal sea
      far: C('#7c93ad'), mid: C('#557a58'), ground: C('#5d8455'),
      fol: C('#3a6a48'), fol2: C('#4c7f55'), trunk: C('#54483a'),
      farAmp: 0.34, midAmp: 0.11, snowcap: 0.9, water: 0.9, waterCol: C('#2f5c70'), aurora: 0.5,
      ridged: 0.8, occluder: 0.07, landmarks: ['glacier'],
      grade: { tint: C('#a8ccd4'), s: 0.16, lm: 0.97 }, avenue: 'pine',
      density: 3.2, items: tbl([['pine', .42], ['birch', .22], ['cabin', .10], ['rock', .12], ['bush', .14]]),
      fgDensity: 1.8, fgItems: tbl([['tuft', .45], ['rock', .27], ['bush', .18], ['pine', .10]]),
      forestDepth: 2.5,
      midDensity: 0.08, midItems: tbl([['lighthouse', 1]]),
      weather: [['clear', 4], ['overcast', 2.5], ['rain', 2], ['snow', 1.5], ['fog', 1.5]],
      variants: [
        [{ key: 'innerValley', water: 0, density: 4.5, midAmp: 0.13 }, 2],
        [{ key: 'fishingVillage', midDensity: 0.3, density: 2.5, items: tbl([['cabin', .4], ['pine', .3], ['rock', .15], ['bush', .15]]) }, 1.5],
      ],
    }),
    tropics: mk({ // Brazil: turquoise bay, bright sand, dense rainforest
      far: C('#6a9a8c'), mid: C('#e6d3a0'), ground: C('#4d8a52'),
      fol: C('#1f6b3a'), fol2: C('#2f8a4a'), trunk: C('#6a553e'),
      farAmp: 0.10, midAmp: 0.04, snowcap: 0, water: 0.9, waterCol: C('#2a9db0'), aurora: 0,
      ridged: 0.25, occluder: 0.04, landmarks: ['sugarloaf'],
      grade: { tint: C('#e8f0a8'), s: 0.15, lm: 1.05 }, avenue: 'palm',
      density: 7, items: tbl([['canopyTree', .35], ['palm', .30], ['fern', .15], ['bush', .12], ['roundTree', .08]]),
      fgDensity: 2.6, fgItems: tbl([['fern', .34], ['tuft', .26], ['bush', .22], ['palm', .18]]),
      forestDepth: 2, depthItems: tbl([['canopyTree', .5], ['roundTree', .3], ['palm', .2]]),
      midDensity: 0, midItems: null,
      weather: [['clear', 5], ['overcast', 1.5], ['rain', 3]],
      variants: [
        [{ key: 'jungle', water: 0, density: 9.5, mid: C('#3f7a52'), midAmp: 0.07, forestDepth: 6 }, 3],
        [{ key: 'cove', water: 0.95, density: 4, items: tbl([['palm', .6], ['fern', .2], ['bush', .2]]) }, 1.5],
      ],
    }),
    japan: mk({ // Japan: sakura in bloom, temple roofs, dramatic peaks
      far: C('#8a9bc0'), mid: C('#6f9a78'), ground: C('#7da877'),
      fol: C('#3a6d4e'), fol2: C('#4d7f5c'), trunk: C('#4a3a32'),
      farAmp: 0.30, midAmp: 0.10, ridged: 0.85, snowcap: 0.45,
      occluder: 0.06, landmarks: ['fuji'],
      grade: { tint: C('#f4cfd8'), s: 0.16, lm: 1.0 }, avenue: 'sakura',
      density: 6, items: tbl([['sakura', .34], ['pine', .24], ['roundTree', .08], ['teahouse', .08], ['torii', .06], ['bush', .20]]),
      fgDensity: 2.2, fgItems: tbl([['bush', .36], ['tuft', .34], ['sakura', .15], ['rock', .15]]),
      midDensity: 0.12, midItems: tbl([['pagoda', 1]]),
      forestDepth: 4.5, depthItems: tbl([['sakura', .45], ['pine', .55]]),
      weather: [['clear', 5], ['overcast', 2], ['rain', 2], ['fog', 1.5]],
      variants: [
        [{ key: 'sakuraGrove', density: 8.5, forestDepth: 6, items: tbl([['sakura', .68], ['bush', .22], ['teahouse', .10]]) }, 2],
        [{ key: 'village', density: 4.5, midDensity: 0.3, items: tbl([['teahouse', .34], ['sakura', .26], ['torii', .14], ['pine', .26]]) }, 1.5],
        [{ key: 'lakeside', water: 0.55, waterCol: C('#4a7d96'), density: 4 }, 1.5],
      ],
    }),
  };
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

  const TYPES = { // size range as fraction of viewport height
    pine: { s: [0.09, 0.15] }, roundTree: { s: [0.09, 0.14] },
    birch: { s: [0.08, 0.12] }, deadTree: { s: [0.06, 0.10] },
    cactus: { s: [0.05, 0.10] }, palm: { s: [0.10, 0.14] },
    bush: { s: [0.030, 0.050] }, tuft: { s: [0.020, 0.035] },
    rock: { s: [0.025, 0.050] }, barn: { s: [0.06, 0.105] },
    cabin: { s: [0.05, 0.09] }, turbine: { s: [0.20, 0.28] },
    lighthouse: { s: [0.14, 0.18] }, sign: { s: [0.045, 0.055] },
    mesa: { s: [0.16, 0.26] },
    redwood: { s: [0.34, 0.56] }, fern: { s: [0.030, 0.050] },
    canopyTree: { s: [0.11, 0.17] },
    sakura: { s: [0.07, 0.12] }, teahouse: { s: [0.065, 0.10] },
    torii: { s: [0.07, 0.10] }, pagoda: { s: [0.13, 0.18] },
  };

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
  /* blended numeric / color parameter at a world position */
  function effN(wx, key) {
    const r = resolve(wx);
    const ea = r.a.vt ? U.lerp(r.a.p1[key], r.a.p2[key], r.a.vt) : r.a.p1[key];
    if (!r.t) return ea;
    const eb = r.b.vt ? U.lerp(r.b.p1[key], r.b.p2[key], r.b.vt) : r.b.p1[key];
    return U.lerp(ea, eb, r.t);
  }
  function effC(wx, key) {
    const r = resolve(wx);
    const ea = r.a.vt ? U.mix(r.a.p1[key], r.a.p2[key], r.a.vt) : r.a.p1[key];
    if (!r.t) return ea;
    const eb = r.b.vt ? U.mix(r.b.p1[key], r.b.p2[key], r.b.vt) : r.b.p1[key];
    return U.mix(ea, eb, r.t);
  }

  /* Long-wavelength height envelope, phased differently per ridge layer, so
     spurs swell in different places and interlock — valleys open between
     them and the eye reads depth between the layers. */
  const ampEnv = (wx, seed) => 0.55 + 0.45 * U.noise1(wx / 3200 + seed * 7.3, seed + 900);

  /* ---------------- chunked item placement (cached, deterministic) ------ */
  const itemCache = new Map();
  function chunkItems(layerSeed, ci, p, chunkW, densityKey, tableKey) {
    const key = layerSeed + ':' + ci;
    let items = itemCache.get(key);
    if (items) return items;
    if (itemCache.size > 700) itemCache.clear();
    const r = U.rng(U.hash2(ci, layerSeed));
    items = [];
    const nearWX = (ci * chunkW + chunkW / 2) / p;
    const rs = resolve(nearWX);
    const density = effN(nearWX, densityKey);
    const count = Math.floor(density) + (r() < density % 1 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const side = r() < rs.t ? rs.b : rs.a;
      const prof = r() < side.vt ? side.p2 : side.p1;
      const table = prof[tableKey];
      if (!table) continue;
      const pickR = r();
      let type = table[table.length - 1][0];
      for (const e of table) if (pickR <= e[1]) { type = e[0]; break; }
      items.push({ x: ci * chunkW + r() * chunkW, sf: r(), v: r(), prof, type });
    }
    itemCache.set(key, items);
    return items;
  }

  /* ======================== render ======================== */
  function render(ctx, env, pal) {
    const { w, h, worldX, light, time } = env;
    const fogW = env.weather.fog;
    const wet = env.weather.wetness || 0;
    const snowC = env.weather.snowCover || 0;
    const cwx = worldX + w * 0.5;
    const biC = biomeAt(cwx);
    const snowLit = Palette.lit(C('#e9eef6'), pal, light);
    const effD = d => Math.min(0.96, d + fogW * (0.22 + d * 1.3));
    const tint = (base, d, snowMix) => {
      let c = Palette.lit(base, pal, light);
      if (snowC > 0 && snowMix) c = U.mix(c, snowLit, snowC * snowMix);
      return U.css(U.mix(c, pal.fog, effD(d)));
    };

    /* ---- ridge painter; returns nothing, draws fill + optional snowcaps */
    function ridge(p, seed, freq, baseFrac, ampKey, ampMul, colKey, d, capMul, fringeMul, foamW) {
      const baseY = h * baseFrac;
      const color = tint(effC(cwx, colKey), d, 0.55);
      const pts = [];
      const step = 10;
      for (let sx = 0; sx <= w + step; sx += step) {
        const wxs = worldX + sx;
        const amp = effN(wxs, ampKey) * h * ampMul * ampEnv(wxs, seed);
        const n = U.fbm((worldX * p + sx) * freq, seed, 3);
        const rw = effN(wxs, 'ridged');
        const shaped = rw > 0
          ? U.lerp(n, Math.pow(1 - Math.abs(2 * n - 1), 1.35), rw)
          : n;
        pts.push(baseY - amp * shaped);
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < pts.length; i++) ctx.lineTo(i * step, pts[i]);
      ctx.lineTo(w + step, h);
      ctx.closePath();
      ctx.fill();
      const cap = effN(cwx, 'snowcap') * capMul;
      if (cap > 0.03) {
        const amp = effN(cwx, ampKey) * h * ampMul;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, baseY - amp * 0.72);
        ctx.clip();
        ctx.fillStyle = U.css(U.mix(snowLit, pal.fog, effD(d)), Math.min(1, cap));
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < pts.length; i++) ctx.lineTo(i * step, pts[i]);
        ctx.lineTo(w + step, h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // tiny tree fringe along the crest — forested ridges receding
      const fringe = effN(cwx, 'forestDepth') * (fringeMul || 0);
      if (fringe > 0.3) {
        ctx.fillStyle = tint(U.scale(effC(cwx, colKey), 0.80), d, 0.5);
        ctx.beginPath();
        const lx0 = worldX * p;
        for (let k = Math.floor(lx0 / 16); k <= (lx0 + w) / 16; k++) {
          const hsh = U.hash2(k, seed + 77);
          if (hsh > Math.min(0.9, fringe * 0.16)) continue;
          const fx = k * 16 - lx0;
          const idx = Math.max(0, Math.min(pts.length - 1, Math.round(fx / step)));
          const fy = pts[idx];
          const fh = h * (0.012 + (hsh * 7 % 1) * 0.016) * (0.8 + (fringeMul || 0) * 0.5);
          ctx.moveTo(fx - 3.2, fy + 1);
          ctx.lineTo(fx, fy - fh);
          ctx.lineTo(fx + 3.2, fy + 1);
        }
        ctx.fill();
      }
      // foam + wet edge where this ridge dips to meet open water
      if (foamW > 0.25) {
        const wl = h * 0.655; // only near/below the waterline
        ctx.fillStyle = `rgba(34,52,72,${(0.20 * foamW).toFixed(3)})`;
        ctx.beginPath();
        for (let i = 0; i < pts.length - 1; i++) {
          if (pts[i] < wl && pts[i + 1] < wl) continue;
          ctx.moveTo(i * step, pts[i]);
          ctx.lineTo((i + 1) * step, pts[i + 1]);
          ctx.lineTo((i + 1) * step, pts[i + 1] + h * 0.013);
          ctx.lineTo(i * step, pts[i] + h * 0.013);
          ctx.closePath();
        }
        ctx.fill();
        const foamLine = (dy, lw, a2) => {
          ctx.strokeStyle = `rgba(255,255,255,${a2.toFixed(3)})`;
          ctx.lineWidth = lw;
          ctx.beginPath();
          let pen = false;
          for (let i = 0; i < pts.length; i++) {
            if (pts[i] >= wl) {
              if (!pen) { ctx.moveTo(i * step, pts[i] + dy); pen = true; }
              else ctx.lineTo(i * step, pts[i] + dy);
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
        // shade a band hugging the ridge line, not a full-height curtain
        const fDepth = effN(cwx, ampKey) * h * ampMul * 0.6 + h * 0.02;
        for (let i = 0; i < pts.length - 1; i++) {
          let f = U.clamp((pts[i + 1] - pts[i]) / step * dir * 1.5, -0.66, 0.66);
          if (Math.abs(f) < 0.28 + d * 0.35) continue; // distant layers facet less
          f = Math.round(f * 2) / 2;
          if (f === 0) continue;
          ctx.fillStyle = f > 0
            ? `rgba(255,252,244,${(0.14 * f * light * fade).toFixed(3)})`
            : `rgba(10,14,26,${(-0.22 * f * (0.3 + 0.7 * light) * fade).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(i * step, pts[i]);
          ctx.lineTo((i + 1) * step, pts[i + 1]);
          ctx.lineTo((i + 1) * step, Math.min(h, pts[i + 1] + fDepth));
          ctx.lineTo(i * step, Math.min(h, pts[i] + fDepth));
          ctx.closePath();
          ctx.fill();
        }
      }
      return { baseY, pts, step };
    }

    /* ---- per-biome color set for item drawing at a given depth ---- */
    function colorsFor(prof, d) {
      const bb = prof;
      const glowA = U.clamp((0.4 - light) / 0.35, 0, 1) * 0.85;
      return {
        foliage: tint(bb.fol, d, 0.45),
        foliage2: tint(bb.fol2, d, 0.45),
        trunk: tint(bb.trunk, d, 0),
        dark: tint(U.scale(bb.trunk, 0.55), d, 0),
        light: tint(C('#e6e2d4'), d, 0),
        accent: tint(C('#9a4538'), d, 0),
        pink: tint(C('#f0b6c9'), d, 0.5),
        pink2: tint(C('#e094b2'), d, 0.5),
        fill: tint(U.mix(bb.far, bb.mid, 0.4), d, 0.5),
        strata: tint(U.scale(U.mix(bb.far, bb.mid, 0.4), 0.8), d, 0),
        glowA,
      };
    }

    function drawItemSet(p, seed, chunkW, densityKey, tableKey, d, groundY, sizeMul) {
      const colorSets = {};
      const lx0 = worldX * p;
      for (let ci = Math.floor((lx0 - 80) / chunkW); ci <= (lx0 + w + 80) / chunkW; ci++) {
        const items = chunkItems(seed, ci, p, chunkW, densityKey, tableKey);
        for (const it of items) {
          const sx = it.x - lx0;
          if (sx < -90 || sx > w + 90) continue;
          const ty = TYPES[it.type];
          const size = h * U.lerp(ty.s[0], ty.s[1], it.sf) * (sizeMul || 1);
          const c = colorSets[it.prof.key] || (colorSets[it.prof.key] = colorsFor(it.prof, d));
          const y = groundY(it.x, sx, it);
          if (it.type === 'mesa') Assets.mesa(ctx, sx, y, size * 2.8, size, c, it.v);
          else Assets[it.type](ctx, sx, y, size, c, it.v, time);
        }
      }
    }

    /* ================= layers, back to front ================= */

    // far ridges (where there is open sea, they read as headlands in it)
    const waterWpre = effN(cwx, 'water');
    ridge(0.055, 11, 1 / 620, 0.615, 'farAmp', 1.0, 'far', 0.68, 1.0, 0, 0);
    ridge(0.115, 22, 1 / 480, 0.660, 'farAmp', 0.65, 'far', 0.52, 0.8, 0.35, 0);
    // nearest far ridge ducks low where open water takes over
    ridge(0.165, 44, 1 / 520, 0.697, 'farAmp', 0.32 * (1 - waterWpre * 0.85), 'far', 0.38, 0.7, 0.7, 0);

    // open water (warm seas, cold fjords, passing lakes)
    const waterW = effN(cwx, 'water');
    if (waterW > 0.02) {
      const top = env.horizonY, bot = h * 0.705;
      const water = Palette.lit(effC(cwx, 'waterCol'), pal, light);
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, U.css(U.mix(U.mix(water, pal.bot, 0.45), pal.fog, effD(0.5)), waterW));
      g.addColorStop(1, U.css(U.mix(water, pal.fog, effD(0.3)), waterW));
      ctx.fillStyle = g;
      ctx.fillRect(0, top, w, bot - top);
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
      // drifting ice in polar waters (bigger and lower = nearer)
      {
        const p = 0.16, chunkW = 520, lx0 = worldX * p;
        const iceC = {
          ice: U.css(U.mix(U.mix(snowLit, pal.bot, 0.12), pal.fog, effD(0.38))),
          shade: U.css(U.mix(Palette.lit(C('#9fc0d8'), pal, light), pal.fog, effD(0.38))),
          deep: U.css(U.mix(Palette.lit(C('#2a4660'), pal, light), pal.fog, effD(0.38)), 0.85),
        };
        ctx.save();
        ctx.globalAlpha = waterW;
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
            const iy = U.lerp(top + (bot - top) * 0.30, bot - 3, fr);
            const s = h * (0.020 + 0.058 * fr) * (0.75 + vv * 0.5);
            if (kind < 0.35) Assets.floe(ctx, ix, iy, s * 2.0, iceC, vv);
            else Assets.iceberg(ctx, ix, iy, s, iceC, vv);
          }
        }
        ctx.restore();
      }
    }

    // famous landmarks drift by on their own distant layer
    {
      const p = 0.08, chunkW = 960;
      const lx0 = worldX * p;
      for (let ci = Math.floor((lx0 - 700) / chunkW); ci <= (lx0 + w + 700) / chunkW; ci++) {
        const r = U.rng(U.hash2(ci, 777));
        if (r() > 0.62) continue;
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
        const c = {
          rock: tint(U.scale(effC(lwx, 'far'), 0.92), 0.52, 0.3),
          snow: U.css(U.mix(snowLit, pal.fog, effD(0.52))),
          shadow: tint(U.scale(effC(lwx, 'far'), 0.70), 0.52, 0),
          warm: tint(C('#b4593a'), 0.50, 0.2),
          green: tint(C('#2f6b46'), 0.50, 0),
          light,
        };
        Assets[kind](ctx, sx, h * cfg.y, s, c, vv, time);
      }
    }

    // mid ridge + its landmarks (mesas, lighthouse)
    const mid = ridge(0.24, 33, 1 / 360, 0.725, 'midAmp', 1.0, 'mid', 0.26, 0.6, 1.0, waterWpre);
    drawItemSet(0.24, 333, 700, 'midDensity', 'midItems', 0.34, (ix) => {
      const nearwx = ix / 0.24;
      const amp = effN(nearwx, 'midAmp') * h * ampEnv(nearwx, 33);
      return h * 0.725 - amp * U.fbm(ix / 360, 33, 3) + 2;
    });

    // distant forest bands: wooded hills stretching far away.
    // Depth of forest (forestDepth) is its own variable biome layer.
    drawItemSet(0.33, 611, 300, 'forestDepth', 'depthItems', 0.30,
      ix => h * 0.752 - h * 0.018 * U.fbm(ix / 300, 61, 2), 0.55);
    drawItemSet(0.41, 622, 300, 'forestDepth', 'depthItems', 0.26,
      ix => h * 0.774 - h * 0.016 * U.fbm(ix / 280, 62, 2), 0.75);

    // tree line ridge (the ground band the road sits in)
    const treeG = (ix) => h * 0.795 - h * 0.022 * U.fbm(ix / 260, 44, 2);
    ctx.fillStyle = tint(effC(cwx, 'ground'), 0.18, 0.65);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let sx = 0; sx <= w + 10; sx += 10) ctx.lineTo(sx, treeG(worldX * 0.5 + sx));
    ctx.lineTo(w + 10, h);
    ctx.closePath();
    ctx.fill();
    drawItemSet(0.5, 444, 460, 'density', 'items', 0.18, ix => treeG(ix) + 2);

    // road elevation profile: mountain roads rise and (mostly) dip
    const hillW = (biC.a === 'mountains' ? 1 - biC.t : 0) + (biC.b === 'mountains' ? biC.t : 0)
      + 0.3 * ((biC.a === 'forest' ? 1 - biC.t : 0) + (biC.b === 'forest' ? biC.t : 0));
    const roadAmp = h * (0.006 + 0.042 * hillW);
    const rTopAt = sx => {
      const n = U.fbm((worldX + sx) / 950, 77, 2) * 2 - 1;
      return env.roadTop + (n < 0 ? n * 0.3 : n * 1.3) * roadAmp;
    };

    // roadside strip between tree line and road
    ctx.fillStyle = tint(U.scale(effC(cwx, 'ground'), 0.82), 0.10, 0.7);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.787);
    ctx.lineTo(w, h * 0.787);
    for (let sx = w; sx >= 0; sx -= 20) ctx.lineTo(sx, rTopAt(sx) + 2);
    ctx.closePath();
    ctx.fill();

    /* roadside furniture comes in long stretches that simply start and stop:
       power wires, street lamps, an avenue of planted trees, or nothing. */
    {
      const FSEG = 5200;
      const ftype = i => {
        const r = U.hash1(i * 7919 + 37);
        return r < 0.34 ? 'wires' : r < 0.58 ? 'plain' : r < 0.79 ? 'avenue' : 'lights';
      };
      const fAt = x => ftype(Math.floor(x / FSEG));
      const d = effD(0.09);
      const polC = { dark: U.css(U.mix(Palette.lit(C('#2e2a26'), pal, light), pal.fog, d)) };

      // power poles; wire spans only between two poles of the same stretch
      {
        const sp = 540, H = h * 0.165, sag = H * 0.16;
        ctx.strokeStyle = polC.dark;
        const i0 = Math.floor((worldX - 100) / sp), i1 = Math.floor((worldX + w + 100) / sp);
        for (let i = i0; i <= i1; i++) {
          const wx1 = i * sp, wx2 = wx1 + sp;
          if (fAt(wx1) !== 'wires') continue;
          const x1 = wx1 - worldX, x2 = wx2 - worldX;
          const t1 = rTopAt(x1) + h * 0.004 - H * 0.92;
          if (fAt(wx2) === 'wires') {
            const t2 = rTopAt(x2) + h * 0.004 - H * 0.92;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, t1);
            ctx.quadraticCurveTo((x1 + x2) / 2, (t1 + t2) / 2 + sag, x2, t2);
            ctx.moveTo(x1, t1 + H * 0.12);
            ctx.quadraticCurveTo((x1 + x2) / 2, (t1 + t2) / 2 + H * 0.12 + sag, x2, t2 + H * 0.12);
            ctx.stroke();
          }
          Assets.pole(ctx, x1, t1 + H * 0.92, H, polC);
        }
      }

      // street lamps, glowing once the light fades
      {
        const sp = 460, S = h * 0.145;
        const lampGlow = U.clamp((0.5 - light) / 0.4, 0, 1);
        const lampC = { dark: polC.dark, glowA: lampGlow, poolDY: (env.roadBot - env.roadTop) * 0.45 };
        const i0 = Math.floor((worldX - 200) / sp), i1 = Math.floor((worldX + w + 200) / sp);
        for (let i = i0; i <= i1; i++) {
          const wx1 = i * sp + 180;
          if (fAt(wx1) !== 'lights') continue;
          const x1 = wx1 - worldX;
          if (x1 < -120 || x1 > w + 120) continue;
          Assets.streetlight(ctx, x1, rTopAt(x1) + h * 0.004, S, lampC, U.hash1(i));
        }
      }

      // a planted avenue: evenly spaced, uniform trees fitting the biome
      {
        const sp = 300;
        const i0 = Math.floor((worldX - 120) / sp), i1 = Math.floor((worldX + w + 120) / sp);
        let avC = null, avName = null;
        for (let i = i0; i <= i1; i++) {
          const wx1 = i * sp + 150;
          if (fAt(wx1) !== 'avenue') continue;
          const x1 = wx1 - worldX;
          if (x1 < -80 || x1 > w + 80) continue;
          const ars = resolve(wx1);
          const aside = ars.t < 0.5 ? ars.a : ars.b;
          const aprof = aside.vt < 0.5 ? aside.p1 : aside.p2;
          if (aprof.key !== avName) { avName = aprof.key; avC = colorsFor(aprof, 0.09); }
          const tfn = Assets[aprof.avenue] || Assets.roundTree;
          tfn(ctx, x1, rTopAt(x1) + h * 0.004,
            h * (0.082 + U.hash1(i * 31) * 0.012), avC, 0.4 + U.hash1(i * 17) * 0.3, time);
        }
      }
    }

    /* ---------------- the road (an undulating band) ---------------- */
    const { roadTop, roadBot } = env;
    const roadH = roadBot - roadTop;
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

    /* ---------------- the car (rides and tilts with the road) ------- */
    const carX = env.carX;
    const carSurf = rTopAt(carX) + roadH * 0.60;
    const slope = (rTopAt(carX + 60) - rTopAt(carX - 60)) / 120;
    // the car is the scale constant — except on tiny viewports (phones),
    // where it shrinks so it doesn't tower over the scenery
    const cs = U.clamp(Math.min(h / 760, w / 1100), 0.42, 1);
    ctx.save();
    ctx.translate(carX, carSurf);
    ctx.rotate(Math.atan(slope));
    ctx.scale(cs, cs);
    const car = Cars.LIST[env.carIndex] || Cars.LIST[0];
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
      wheelRot: env.wheelRot, bob: env.carBob, speed: env.speed, shade,
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

    /* ---------------- foreground strip ---------------- */
    ctx.fillStyle = tint(U.scale(effC(cwx, 'ground'), 0.52), 0.03, 0.7);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let sx = 0; sx <= w + 20; sx += 20) ctx.lineTo(sx, rTopAt(sx) + roadH);
    ctx.lineTo(w + 20, h);
    ctx.closePath();
    ctx.fill();
    drawItemSet(1.3, 555, 300, 'fgDensity', 'fgItems', 0.03,
      (ix, sx, it) => rTopAt(sx) + roadH + (h - roadBot) * (0.25 + it.v * 0.5), 1.7);

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
        if (sx < -200 || sx > w + 200) continue;
        Assets.redwoodTrunk(ctx, sx, h + 30, h * 1.3, colorsFor(rprof, 0.012), vv);
      }
    }

    /* ---------------- fireflies on forest evenings ---------------- */
    const forestW = (biC.a === 'forest' ? 1 - biC.t : 0) + (biC.b === 'forest' ? biC.t : 0);
    if (forestW > 0.05 && light < 0.42) {
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
    }
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
        const rad = h * (0.55 + r() * 0.45);
        const ors = resolve(owx);
        const oside = r() < ors.t ? ors.b : ors.a;
        const oprof = oside.vt > 0.5 ? oside.p2 : oside.p1;
        if (sx < -rad - 80 || sx > w + rad + 80) continue;
        const cy = h + rad * 0.55;
        ctx.fillStyle = tint(U.scale(oprof.ground, 0.40), 0.015, 0.7);
        ctx.beginPath();
        ctx.arc(sx, cy, rad, 0, TAU);
        ctx.fill();
        const c = colorsFor(oprof, 0.015);
        for (let k = -2; k <= 2; k++) {
          if (r() > 0.7) continue;
          const dx = k * rad * 0.16 + (r() - 0.5) * rad * 0.06;
          const ty2 = cy - Math.sqrt(Math.max(0, rad * rad - dx * dx)) + 3;
          Assets.pine(ctx, sx + dx, ty2, h * (0.05 + r() * 0.04), c, r(), time);
        }
      }
    }
    void mid;
  }

  function setFixedBiome(name) {
    fixed = BIOME_NAMES.includes(name) ? name : null;
    itemCache.clear();
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

  /* per-biome weather weights, consumed by the weather module */
  const WEATHER_TABLES = {};
  BIOME_NAMES.forEach(n => { WEATHER_TABLES[n] = B[n].weather; });

  return {
    render, biomeAt, weightOf, setFixedBiome, gradeAt, BIOME_NAMES, WEATHER_TABLES,
    auroraAt: wx => effN(wx, 'aurora'),
  };
})();
