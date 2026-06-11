// Roadtrip - Weather system. Calm, soothing precipitation + fog.
// Attaches window.Weather. No modules, no deps.
(function () {
  'use strict';

  var TYPES = ['clear', 'overcast', 'rain', 'snow', 'fog'];

  // Per-type scalar targets. Order: cloudCover, fog, precip, dim.
  var TARGETS = {
    clear:    { cloud: 0.12, fog: 0.02, precip: 0.0,  dim: 0.0  },
    overcast: { cloud: 0.85, fog: 0.12, precip: 0.0,  dim: 0.22 },
    rain:     { cloud: 0.95, fog: 0.25, precip: 0.85, dim: 0.35 },
    snow:     { cloud: 0.8,  fog: 0.3,  precip: 0.7,  dim: 0.18 },
    fog:      { cloud: 0.55, fog: 0.85, precip: 0.0,  dim: 0.25 }
  };

  // Allowed types per biome, with weights (clear favored).
  var BIOMES = {
    plains:    [['clear', 5], ['overcast', 2], ['rain', 2], ['fog', 0.5]],
    forest:    [['clear', 5], ['overcast', 2], ['rain', 2], ['fog', 1]],
    desert:    [['clear', 9], ['overcast', 0.6]],
    mountains: [['clear', 5], ['overcast', 2], ['snow', 2], ['fog', 1]],
    coast:     [['clear', 5], ['overcast', 2], ['rain', 2], ['fog', 1]],
    tundra:    [['clear', 5], ['overcast', 2], ['snow', 2], ['fog', 1]]
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  // Smoothstep eased transition.
  function ease(t) { return t * t * (3 - 2 * t); }

  function allowedFor(biome) {
    // The scene injects per-biome weather tables (Weather.biomeWeather);
    // the built-in BIOMES map is only a fallback.
    if (W.biomeWeather && W.biomeWeather[biome]) return W.biomeWeather[biome];
    return BIOMES[biome] || BIOMES.plains;
  }

  function pickWeighted(list, avoid) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) {
      if (list[i][0] !== avoid) total += list[i][1];
    }
    if (total <= 0) return list[0][0];
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      if (list[i][0] === avoid) continue;
      r -= list[i][1];
      if (r <= 0) return list[i][0];
    }
    return list[list.length - 1][0];
  }

  function biomeAllows(biome, type) {
    var list = allowedFor(biome);
    for (var i = 0; i < list.length; i++) if (list[i][0] === type) return true;
    return false;
  }

  var W = {
    types: TYPES,
    mode: 'auto',
    biomeWeather: null, // per-biome weight tables injected by the scene

    // Blended scalar outputs.
    cloudCover: TARGETS.clear.cloud,
    fog: TARGETS.clear.fog,
    precip: 0,
    wetness: 0,
    snowCover: 0,
    dim: 0,
    current: { type: 'clear', intensity: 0 },

    // Internal state machine.
    _from: 'clear',
    _to: 'clear',
    _blend: 1,          // 0..1 progress of current transition
    _blendDur: 10,      // seconds for active transition
    _hold: 0,           // remaining hold time before next auto change
    _drift: 0,          // phase for precip ±20% sine drift
    _biome: 'plains',
    _inited: false
  };

  // ---- Particle pools (preallocated at max) ----
  var RAIN_MAX = 700;
  var SNOW_MAX = 500;
  var FOG_BLOBS = 7;

  var rainP = new Array(RAIN_MAX);
  var snowP = new Array(SNOW_MAX);
  var fogBlobs = new Array(FOG_BLOBS);

  (function initPools() {
    var i;
    for (i = 0; i < RAIN_MAX; i++) {
      rainP[i] = { x: 0, y: 0, len: 0, vy: 0, wind: 0, on: false };
    }
    for (i = 0; i < SNOW_MAX; i++) {
      snowP[i] = { x: 0, y: 0, r: 0, sway: 0, phase: 0, base: 0, on: false };
    }
    for (i = 0; i < FOG_BLOBS; i++) {
      fogBlobs[i] = { x: 0, y: 0, rx: 0, ry: 0, vx: 0, depth: 0, seeded: false };
    }
  })();

  function seedRain(p, w, h) {
    p.x = rand(0, w);
    p.y = rand(-h, h);
    p.len = rand(16, 30);
    p.vy = rand(900, 1300);
    p.wind = rand(-90, -30); // steady tailwind so streaks slant with travel
    p.on = true;
  }

  function seedSnow(p, w, h) {
    p.r = rand(1, 3.2);
    p.x = rand(0, w);
    p.y = rand(-h, h);
    p.sway = rand(8, 26);
    p.phase = rand(0, Math.PI * 2);
    p.base = rand(40, 90);
    p.on = true;
  }

  function seedBlob(b, w, h, horizonY) {
    b.depth = rand(0.3, 1);
    b.rx = rand(0.2, 0.45) * w;
    b.ry = b.rx * rand(0.3, 0.5);
    b.x = rand(0, w);
    b.y = horizonY + rand(-h * 0.12, h * 0.18);
    b.vx = -rand(6, 22) * b.depth;
    b.seeded = true;
  }

  // ---- State machine ----
  function startTransition(to) {
    W._from = W._to;
    W._to = to;
    W._blend = 0;
    W._blendDur = rand(8, 12);
  }

  function nextAuto(biome) {
    var list = allowedFor(biome);
    return pickWeighted(list, W._to);
  }

  function ensureInit(env) {
    if (W._inited) return;
    W._inited = true;
    W._biome = (env && env.biome) || 'plains';
    W._from = W._to = 'clear';
    W._blend = 1;
    W._hold = rand(90, 240);
  }

  // Jump straight to the current mode's steady state (deep links, tests).
  W.warp = function (opts) {
    W._inited = true;
    W._hold = rand(90, 240);
    if (W.mode !== 'auto' && TYPES.indexOf(W.mode) !== -1) {
      W._from = W._to = W.mode;
    } else {
      W._from = W._to;
    }
    W._blend = 1;
    if (opts && typeof opts.wetness === 'number') W.wetness = clamp(opts.wetness, 0, 1);
    if (opts && typeof opts.snowCover === 'number') W.snowCover = clamp(opts.snowCover, 0, 1);
  };

  W.setMode = function (m) {
    if (m === 'auto') {
      W.mode = 'auto';
      // Re-validate against biome on next update.
      if (!biomeAllows(W._biome, W._to)) startTransition(nextAuto(W._biome));
      W._hold = rand(90, 240);
      return;
    }
    if (TYPES.indexOf(m) === -1) return;
    W.mode = m;
    if (W._to !== m) startTransition(m);
  };

  W.update = function (dt, env) {
    ensureInit(env);
    dt = (typeof dt === 'number' && dt > 0) ? dt : 0;
    var w = env.w, h = env.h;

    if (env.biome) W._biome = env.biome;

    // Fixed mode self-heals: if the target drifted from the requested type
    // (e.g. setMode ran before the first update), transition to it now.
    if (W.mode !== 'auto' && W._to !== W.mode && TYPES.indexOf(W.mode) !== -1) {
      startTransition(W.mode);
    }

    // --- State machine ---
    if (dt > 0) {
      W._drift += dt * 0.35;

      if (W._blend < 1) {
        W._blend = clamp(W._blend + dt / W._blendDur, 0, 1);
      }

      if (W.mode === 'auto') {
        // If current target no longer allowed by biome, transition out.
        if (W._blend >= 1 && !biomeAllows(W._biome, W._to)) {
          startTransition(nextAuto(W._biome));
        } else if (W._blend >= 1) {
          W._hold -= dt;
          if (W._hold <= 0) {
            startTransition(nextAuto(W._biome));
            W._hold = rand(90, 240);
          }
        }
      }
    }

    // --- Blend scalars between from/to targets ---
    var a = TARGETS[W._from] || TARGETS.clear;
    var b = TARGETS[W._to] || TARGETS.clear;
    var k = ease(W._blend);

    W.cloudCover = lerp(a.cloud, b.cloud, k);
    W.fog = lerp(a.fog, b.fog, k);
    W.dim = clamp(lerp(a.dim, b.dim, k), 0, 0.4);

    // Precip with slow ±20% sine drift so it feels alive.
    var driftMul = 1 + 0.2 * Math.sin(W._drift);
    var basePrecip = lerp(a.precip, b.precip, k);
    W.precip = clamp(basePrecip * driftMul, 0, 1);

    // --- Wetness: rises ~30s during rain, dries ~90s after ---
    var raining = (W._to === 'rain' && W._blend > 0.2) || W._from === 'rain';
    var rainAmt = (W._to === 'rain' ? k : (W._from === 'rain' ? 1 - k : 0));
    if (rainAmt > 0.05) {
      W.wetness = clamp(W.wetness + dt / 30 * rainAmt, 0, 1);
    } else {
      W.wetness = clamp(W.wetness - dt / 90, 0, 1);
    }

    // --- Snow cover: accumulates ~45s while snowing, melts ~150s after ---
    var snowAmt = (W._to === 'snow' ? k : (W._from === 'snow' ? 1 - k : 0));
    if (snowAmt > 0.05) {
      W.snowCover = clamp(W.snowCover + dt / 45 * snowAmt, 0, 1);
    } else {
      W.snowCover = clamp(W.snowCover - dt / 150, 0, 1);
    }

    W.current.type = W._to;
    W.current.intensity = W.precip;

    // --- Advance particles (only when not paused) ---
    if (dt > 0) {
      stepRain(dt, env, w, h);
      stepSnow(dt, env, w, h);
      stepFog(dt, env, w, h);
    }
  };

  // Which precip kind is dominant for particle rendering.
  function rainStrength() {
    var k = ease(W._blend);
    var s = 0;
    if (W._to === 'rain') s = Math.max(s, k);
    if (W._from === 'rain') s = Math.max(s, 1 - k);
    return s * (W.precip > 0 ? clamp(W.precip / 0.85, 0, 1.2) : s);
  }
  function snowStrength() {
    var k = ease(W._blend);
    var s = 0;
    if (W._to === 'snow') s = Math.max(s, k);
    if (W._from === 'snow') s = Math.max(s, 1 - k);
    return s;
  }

  function stepRain(dt, env, w, h) {
    var inten = rainStrength();
    var want = Math.min(RAIN_MAX, Math.floor((w * h) / 3600 * inten));
    var drift = -env.speed * 0.9;
    for (var i = 0; i < RAIN_MAX; i++) {
      var p = rainP[i];
      if (i < want) {
        if (!p.on) seedRain(p, w, h);
        var vx = drift + p.wind;
        p.x += vx * dt;
        p.y += p.vy * dt;
        if (p.y > h + 30 || p.x < -40 || p.x > w + 40) {
          // Respawn at top / right edge.
          seedRain(p, w, h);
          p.y = rand(-40, -5);
          if (vx > 0) p.x = rand(-40, w);
          else p.x = rand(0, w + 40);
        }
      } else {
        p.on = false;
      }
    }
  }

  function stepSnow(dt, env, w, h) {
    var inten = snowStrength();
    var want = Math.min(SNOW_MAX, Math.floor((w * h) / 9000 * inten));
    for (var i = 0; i < SNOW_MAX; i++) {
      var p = snowP[i];
      if (i < want) {
        if (!p.on) seedSnow(p, w, h);
        var depth = (p.r - 1) / 2.2;            // 0..1, bigger = nearer
        var speed = p.base * (0.7 + 0.6 * depth); // nearer falls faster
        p.phase += dt * 1.2;
        var swayX = Math.cos(p.phase) * p.sway;        // horizontal sway velocity
        var worldDrift = -env.speed * 0.85 * (0.4 + 0.6 * depth);
        p.x += (worldDrift + swayX) * dt;
        p.y += speed * dt;
        if (p.y > h + 6 || p.x < -10 || p.x > w + 10) {
          seedSnow(p, w, h);
          p.y = rand(-10, -2);
          p.x = rand(0, w);
        }
      } else {
        p.on = false;
      }
    }
  }

  function stepFog(dt, env, w, h) {
    for (var i = 0; i < FOG_BLOBS; i++) {
      var b = fogBlobs[i];
      if (!b.seeded) seedBlob(b, w, h, env.horizonY);
      b.x += b.vx * dt;
      if (b.x + b.rx < 0) {
        b.x = w + b.rx;
        b.y = env.horizonY + rand(-h * 0.12, h * 0.18);
      }
    }
  }

  // ---- Rendering (front: over finished scene) ----
  W.renderFront = function (ctx, env, pal) {
    if (!env) return;
    var w = env.w, h = env.h;
    var light = (pal && typeof pal.light === 'number') ? pal.light : 1;
    var fc = (pal && pal.fog) || [200, 205, 210];

    // --- Fog ---
    if (W.fog > 0.01) {
      drawFog(ctx, env, fc, light);
    }

    // --- Rain ---
    var rs = rainStrength();
    if (rs > 0.01) drawRain(ctx, env, rs);

    // --- Snow ---
    var ss = snowStrength();
    if (ss > 0.01) drawSnow(ctx, env, ss);
  };

  function drawFog(ctx, env, fc, light) {
    var w = env.w, h = env.h, hy = env.horizonY;
    var op = clamp(W.fog, 0, 1) * (0.55 + 0.45 * light);
    if (op <= 0.001) return;
    var r = fc[0] | 0, g = fc[1] | 0, b = fc[2] | 0;

    ctx.save();

    // (b) Large soft drifting blobs first (under the band).
    for (var i = 0; i < FOG_BLOBS; i++) {
      var blob = fogBlobs[i];
      if (!blob.seeded) seedBlob(blob, w, h, hy);
      var ba = op * 0.10 * blob.depth;
      if (ba <= 0.002) continue;
      ctx.save();
      ctx.translate(blob.x, blob.y);
      ctx.scale(1, blob.ry / blob.rx);
      var rg = ctx.createRadialGradient(0, 0, 0, 0, 0, blob.rx);
      rg.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + ba.toFixed(4) + ')');
      rg.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, blob.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // (a) Horizontal band strongest near horizon, fading above and below.
    var span = h * 0.5;
    var top = hy - span;
    var bot = hy + span;
    var lg = ctx.createLinearGradient(0, top, 0, bot);
    var peak = op * 0.5;
    lg.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    lg.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',' + peak.toFixed(4) + ')');
    lg.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, top, w, bot - top);

    ctx.restore();
  }

  function drawRain(ctx, env, strength) {
    var inten = clamp(W.precip * strength, 0, 1);
    var aBase = lerp(0.22, 0.50, inten) * (0.40 + 0.60 * env.light);
    if (aBase <= 0.005) return;
    var drift = -env.speed * 0.9;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (var i = 0; i < RAIN_MAX; i++) {
      var p = rainP[i];
      if (!p.on) continue;
      var vx = drift + p.wind;
      var vy = p.vy;
      var mag = Math.sqrt(vx * vx + vy * vy) || 1;
      // Streak line matches velocity vector.
      var dx = vx / mag * p.len;
      var dy = vy / mag * p.len;
      ctx.strokeStyle = 'rgba(192,210,240,' + aBase.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - dx, p.y - dy);
      ctx.stroke();
    }
    // Impact splashes shimmering on the road surface.
    if (typeof env.roadTop === 'number' && typeof env.roadBot === 'number') {
      var n = Math.floor(26 * inten);
      ctx.strokeStyle = 'rgba(195,212,240,' + (aBase * 0.55).toFixed(3) + ')';
      ctx.lineWidth = 1;
      for (var s = 0; s < n; s++) {
        var sx = Math.random() * env.w;
        var sy = env.roadTop + Math.random() * (env.roadBot - env.roadTop);
        var sr = 1.5 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.ellipse(sx, sy, sr, sr * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSnow(ctx, env, strength) {
    ctx.save();
    for (var i = 0; i < SNOW_MAX; i++) {
      var p = snowP[i];
      if (!p.on) continue;
      var depth = (p.r - 1) / 2.2;
      var a = lerp(0.3, 0.9, depth) * strength;
      if (a <= 0.01) continue;
      ctx.fillStyle = 'rgba(245,248,255,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  window.Weather = W;
})();
