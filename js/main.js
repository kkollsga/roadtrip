/* Roadtrip — boot, the frame loop, and the App API the UI drives. */
(() => {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const BASE_SPEED = 205; // px/s scenery scroll at speedMult 1

  const App = {
    carIndex: 0,
    speedMult: 0.9,
    latitude: 0.55,    // slider 0..1 -> 8..78 deg north (manual mode)
    latMode: 'auto',   // 'auto': follow the road's biome; 'manual': slider
    setLatitude(v) { this.latitude = U.clamp(+v || 0, 0, 1); this.latMode = 'manual'; },
    setLatAuto() { this.latMode = 'auto'; },
    latDeg() {
      return this.latMode === 'auto'
        ? this._autoLat || 45
        : U.lerp(8, 78, this.latitude);
    },
    setMonth(m) { DayCycle.setMonth(m); },
    setDaysPerMonth(n) { DayCycle.setDaysPerMonth(n); },
    weatherMode: 'auto',
    biomeMode: 'auto',
    paused: false,
    biomes: Scene.BIOME_NAMES,
    setCar(i) { this.carIndex = ((i % Cars.LIST.length) + Cars.LIST.length) % Cars.LIST.length; },
    setSpeed(x) { this.speedMult = U.clamp(+x || 0, 0, 2); },
    setWeatherMode(m) {
      this.weatherMode = m;
      Weather.setMode(m);
    },
    setBiomeMode(m) {
      this.biomeMode = m;
      Scene.setFixedBiome(m === 'auto' ? null : m);
    },
    setDayLoopMinutes(m) { DayCycle.setLoop(U.clamp(+m || 15, 1, 600)); },
    startSession(min) { DayCycle.startSession(U.clamp(+min || 50, 1, 600)); },
    stopSession() { DayCycle.stopSession(); },
    togglePause() { this.paused = !this.paused; },
  };
  window.App = App;
  Weather.biomeWeather = Scene.WEATHER_TABLES; // biome defs own their weather

  // URL parameters: ?t=0.7&biome=desert&weather=rain&car=2&speed=1.2&ui=0
  {
    const q = new URLSearchParams(location.search);
    if (q.has('t')) DayCycle.lock(U.clamp(parseFloat(q.get('t')) || 0, 0, 1));
    if (q.has('biome')) App.setBiomeMode(q.get('biome'));
    if (q.has('weather')) App.setWeatherMode(q.get('weather'));
    if (q.has('car')) App.setCar(parseInt(q.get('car'), 10) || 0);
    if (q.has('speed')) App.setSpeed(parseFloat(q.get('speed')));
    if (q.has('lat')) App.setLatitude(parseFloat(q.get('lat')));
    if (q.has('month')) App.setMonth(parseInt(q.get('month'), 10) || 0);
    if (q.has('dpm')) App.setDaysPerMonth(parseInt(q.get('dpm'), 10) || 7);
    if (q.get('ui') === '0') document.body.classList.add('no-ui');
    if (q.has('warp')) {
      const wm = q.get('weather');
      Weather.warp({ wetness: wm === 'rain' ? 1 : 0, snowCover: wm === 'snow' ? 1 : 0 });
    }
  }

  /* The road position is anchored to the wall clock: at any given date and
     time you join the drive wherever it "really is" along its year-long
     loop. Refreshing the page therefore rejoins the same stretch of road
     instead of revealing a new biome — discovery happens by driving. */
  const YEAR = 365 * 86400;
  const clockWorldX = (Date.now() / 1000 % YEAR) * BASE_SPEED;

  /* The real lunar phase for tonight (0 = new, 0.5 = full), anchored to the
     known new moon of 2000-01-06 18:14 UTC. Some nights are moonless. */
  const moonQ = new URLSearchParams(location.search).get('moon');
  const MOON_PHASE = moonQ !== null
    ? U.clamp(parseFloat(moonQ) || 0, 0, 1)
    : (((Date.now() / 86400000 - 10962.76) / 29.530588) % 1 + 1) % 1;

  const state = {
    worldX: parseFloat(new URLSearchParams(location.search).get('wx')) || clockWorldX,
    time: 0,
    wheelRot: 0,
    last: performance.now(),
    hiddenPaused: false,
  };

  // pause the clock while the tab is hidden so nothing jumps on return
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.hiddenPaused = true;
    } else {
      state.hiddenPaused = false;
      state.last = performance.now();
    }
  });

  let vignette = null, vigW = 0, vigH = 0;
  function getVignette() {
    if (vignette && vigW === W && vigH === H) return vignette;
    vigW = W; vigH = H;
    vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(2,4,10,0.22)');
    return vignette;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (state.hiddenPaused) return;
    let dt = Math.min(0.05, (now - state.last) / 1000);
    state.last = now;
    state.time += dt;
    const runDt = App.paused ? 0 : dt;

    DayCycle.update(runDt);
    // cruise speed wanders on its own: easy stretches, lazy slowdowns
    const wander = 0.78 + 0.42 * U.noise1(state.time / 90, 77);
    const speed = App.paused ? 0 : BASE_SPEED * wander * App.speedMult;
    state.worldX += speed * runDt;
    state.wheelRot += (speed * runDt) / Cars.WHEEL_R;

    // latitude + season reshape daylight: the palette follows the sun.
    // In auto mode the latitude rides the biomes (arctic tundra,
    // equatorial savanna), crossfading with them.
    App._autoLat = Scene.latAt(state.worldX + W * 0.5);
    const latDeg = App.latDeg();
    const doy = DayCycle.dayOfYear();
    const moonPhase = ((MOON_PHASE + DayCycle.dayCount / 29.530588) % 1 + 1) % 1;
    let pal = Palette.get(Palette.solarWarp(DayCycle.t, latDeg, doy));
    // per-biome lighting character (desert heat, cold tundra, marine coast...)
    const grade = Scene.gradeAt(state.worldX + W * 0.5);
    pal = {
      top: U.mix(pal.top, grade.tint, grade.s * 0.18),
      bot: U.mix(pal.bot, grade.tint, grade.s * 0.30),
      glow: U.mix(pal.glow, grade.tint, grade.s * 0.20),
      fog: U.mix(pal.fog, grade.tint, grade.s * 0.35),
      amb: U.mix(pal.amb, grade.tint, grade.s * 0.30),
      light: U.clamp(pal.light * grade.lm, 0, 1),
      stars: pal.stars,
    };
    // the palette can only be as bright as the sun is high: polar-winter
    // noon holds at blue hour, and under the midnight sun night never
    // truly falls — both fall out of the real solar altitude
    {
      const sunNow = Palette.sunPos(DayCycle.t, latDeg, doy);
      const sunDay = U.smooth(U.clamp((sunNow.elev + 0.07) / 0.38, 0, 1));
      const hiBound = U.lerp(0.20, 1.0, sunDay);
      const loBound = U.lerp(0.12, 0.78, sunDay);
      const toward = (key, f) => {
        const k = Palette.get(key);
        pal = {
          top: U.mix(pal.top, k.top, f), bot: U.mix(pal.bot, k.bot, f),
          glow: U.mix(pal.glow, k.glow, f), fog: U.mix(pal.fog, k.fog, f),
          amb: U.mix(pal.amb, k.amb, f),
          light: U.lerp(pal.light, k.light, f),
          stars: U.lerp(pal.stars, k.stars, f),
        };
      };
      if (pal.light > hiBound) toward(0.815, U.clamp(1 - hiBound / pal.light, 0, 1));
      else if (pal.light < loBound) toward(0.67, U.clamp(1 - pal.light / loBound, 0, 1));
    }
    const biome = (() => {
      const bi = Scene.biomeAt(state.worldX + W * 0.5);
      return bi.t < 0.5 ? bi.a : bi.b;
    })();

    const env = {
      w: W, h: H, dt: runDt, time: state.time,
      worldX: state.worldX, speed,
      t: DayCycle.t,
      light: 1, // filled below once weather has updated
      horizonY: H * 0.56,
      roadTop: H * 0.805, roadBot: H * 0.90,
      carX: W * 0.42, carY: H * 0.872,
      carIndex: App.carIndex,
      wheelRot: state.wheelRot,
      moonPhase,
      latDeg, doy,
      biome,
      weather: null,
      aurora: Scene.auroraAt(state.worldX + W * 0.5),
    };

    // pseudo forecast for the day: temperature from the biome's seasonal
    // climate, precipitation odds from its weather table, type from temp
    {
      const day = DayCycle.dayCount;
      if (App._fcDay !== day || App._fcBiome !== biome) {
        App._fcDay = day; App._fcBiome = biome;
        const cl = Scene.CLIMATES[biome] || { hi: 18, lo: -2 };
        const warm = 0.5 + 0.5 * Math.cos(2 * Math.PI * (doy - 201) / 365);
        const temp = Math.round(U.lerp(cl.lo, cl.hi, warm) + (U.hash1(day * 131 + 7) * 6 - 3));
        const tbl = Scene.WEATHER_TABLES[biome] || [];
        let tot = 0, wet = 0;
        for (const [k2, w2] of tbl) {
          tot += w2;
          if (k2 === 'rain' || k2 === 'snow' || k2 === 'storm') wet += w2;
          if (k2 === 'fog') wet += w2 * 0.4;
        }
        const seasonWet = 1 + 0.35 * Math.cos(2 * Math.PI * (doy - 280) / 365);
        const chance = U.clamp((tot ? wet / tot : 0.2) * seasonWet * 1.25
          + (U.hash1(day * 977 + 3) * 0.2 - 0.1), 0.05, 0.9);
        App.forecast = {
          tempC: temp,
          chance: Math.round(chance * 20) * 5 / 100,
          type: temp < 1 ? 'snow' : 'rain',
        };
        Weather.forecast = App.forecast;
      }
    }

    env.light = pal.light;
    Weather.update(runDt, env);
    env.light = U.clamp(pal.light * (1 - Weather.dim), 0.05, 1);
    App.lightNow = env.light;
    App.moonPhaseNow = moonPhase;
    env.weather = {
      cloudCover: Weather.cloudCover,
      fog: Weather.fog,
      wetness: Weather.wetness,
      // the season lays its own snow under whatever the weather brings
      snowCover: Math.max(Weather.snowCover || 0,
        Scene.snowBaseAt(state.worldX + W * 0.5, doy)),
      precip: Weather.precip,
    };

    Sky.render(ctx, env, pal);
    Scene.render(ctx, env, pal);
    Weather.renderFront(ctx, env, { fog: pal.fog, light: env.light });

    ctx.fillStyle = getVignette();
    ctx.fillRect(0, 0, W, H);
  }

  requestAnimationFrame(frame);
})();
