/* Endless Drive — boot, the frame loop, and the App API the UI drives. */
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

  const BASE_SPEED = 150; // px/s scenery scroll at speedMult 1

  const App = {
    carIndex: 0,
    speedMult: 0.9,
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

    let pal = Palette.get(DayCycle.t);
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
      roadTop: H * 0.80, roadBot: H * 0.92,
      carX: W * 0.42, carY: H * 0.872,
      carIndex: App.carIndex,
      wheelRot: state.wheelRot,
      biome,
      weather: null,
      aurora: Scene.auroraAt(state.worldX + W * 0.5),
    };

    env.light = pal.light;
    Weather.update(runDt, env);
    env.light = U.clamp(pal.light * (1 - Weather.dim), 0.05, 1);
    env.weather = {
      cloudCover: Weather.cloudCover,
      fog: Weather.fog,
      wetness: Weather.wetness,
      snowCover: Weather.snowCover || 0,
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
