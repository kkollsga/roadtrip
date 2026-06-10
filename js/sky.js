/* Endless Drive — sky: gradient, sun/moon, stars, clouds, aurora, birds,
   shooting stars. Drawn first each frame; scenery layers paint over it. */
window.Sky = (() => {
  const { TAU } = U;

  let birds = [];           // flocks: {x, y, n, vx, phase}
  let birdTimer = 12;
  let meteors = [];         // {x, y, vx, vy, life}
  let meteorTimer = 6;

  function starAlpha(i, j, time) {
    const tw = U.hash2(i * 13 + 7, j * 31 + 3);
    return 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * (0.4 + tw * 1.2) + tw * 40));
  }

  /* the moon with its true phase: lit limb + elliptical terminator */
  function drawMoonPhase(ctx, x, y, r, ph, litCol, darkCol) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = darkCol; // earthshine disc
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    const waxing = ph < 0.5;
    const c = Math.cos(TAU * ph); // 1 = new, 0 = quarter, -1 = full
    ctx.fillStyle = litCol;
    ctx.beginPath();
    if (waxing) ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    else ctx.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false);
    ctx.ellipse(0, 0, Math.max(0.001, Math.abs(c)) * r, r, 0,
      waxing ? Math.PI / 2 : Math.PI * 1.5,
      waxing ? -Math.PI / 2 : Math.PI / 2,
      c > 0);
    ctx.fill();
    ctx.restore();
  }

  function render(ctx, env, pal) {
    const { w, h, time, dt } = env;
    const horizonY = env.horizonY;

    // -- sky gradient --
    const g = ctx.createLinearGradient(0, 0, 0, horizonY * 1.12);
    g.addColorStop(0, U.css(pal.top));
    g.addColorStop(1, U.css(pal.bot));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // moonlight competes with the stars: on dim or moonless nights the
    // whole sky burns brighter
    const mph = env.moonPhase !== undefined ? env.moonPhase : 0.5;
    const illum = (1 - Math.cos(TAU * mph)) / 2;
    const moonArc = Palette.moonPos(env.t);
    const moonLight = illum * (moonArc.up ? U.clamp(moonArc.elev * 3, 0, 1) : 0);
    const starBoost = 1 + 0.55 * (1 - moonLight);

    // -- stars (slight parallax so the sky drifts very slowly) --
    if (pal.stars > 0.04) {
      const sx = env.worldX * 0.012;
      const cell = 130;
      for (let i = Math.floor(sx / cell); i < (sx + w) / cell + 1; i++) {
        for (let j = 0; j < Math.ceil(horizonY / cell); j++) {
          const n = Math.floor(2 + U.hash2(i, j * 57) * 2);
          for (let k = 0; k < n; k++) {
            const px = i * cell + U.hash2(i * 3 + k, j) * cell - sx;
            const py = j * cell + U.hash2(i, j * 7 + k) * cell;
            if (py > horizonY - 8) continue;
            const mag = U.hash2(i * 7 + k * 13, j * 29 + 1);
            const planet = U.hash2(i * 31 + k, j * 53 + 9) < 0.015;
            const bright = planet ? 1 : mag * mag;
            // brightest bodies surface first as dusk deepens, the dim
            // multitude fills in only once the sky is truly dark
            const thr = planet ? 0.06 : 0.18 + (1 - bright) * 0.72;
            const fade = U.clamp((pal.stars - thr) / 0.16, 0, 1);
            if (fade <= 0) continue;
            const tw = planet ? 0.9 : starAlpha(i + k, j, time);
            ctx.globalAlpha = Math.min(1,
              fade * (0.35 + 0.65 * bright) * tw * (1 - py / horizonY * 0.4) * starBoost);
            ctx.fillStyle = planet
              ? ['#ffe9c4', '#ffd6b8', '#e8f0ff'][Math.floor(mag * 3) % 3]
              : '#ffffff';
            const r = planet ? 1.7 + mag * 0.9 : 0.5 + bright * 1.4;
            ctx.fillRect(px, py, r, r);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // -- shooting stars --
    if (pal.stars > 0.6) {
      meteorTimer -= dt;
      if (meteorTimer <= 0 && meteors.length < 2) {
        meteorTimer = 14 + Math.random() * 30;
        const a = Math.PI * (0.15 + Math.random() * 0.2);
        const sp = 700 + Math.random() * 500;
        meteors.push({
          x: w * (0.2 + Math.random() * 0.7), y: horizonY * (0.05 + Math.random() * 0.3),
          vx: -Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9,
        });
      }
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      const fade = Math.min(1, m.life * 2) * pal.stars;
      const tg = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.12, m.y - m.vy * 0.12);
      tg.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
      tg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = tg;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 0.12, m.y - m.vy * 0.12);
      ctx.stroke();
    }

    // -- aurora (high-latitude nights): one sinuous band with glowing
    // patches and dark gaps — part of the night sky, never a wallpaper --
    if (env.aurora > 0.02 && pal.stars > 0.3) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const A = env.aurora * pal.stars;
      const ax = env.worldX * 0.01 + time * 5; // slow celestial drift
      const colW = 8;
      // shared vertical gradient: faint top, bright lower rim
      const gTop = h * 0.04, gBot = h * 0.30;
      const grad = ctx.createLinearGradient(0, gTop, 0, gBot);
      grad.addColorStop(0, 'rgba(96,220,160,0)');
      grad.addColorStop(0.6, 'rgba(96,220,160,0.14)');
      grad.addColorStop(0.96, 'rgba(116,230,172,0.30)');
      grad.addColorStop(1, 'rgba(96,220,160,0.06)');
      for (let x = 0; x <= w; x += colW) {
        // long-wave envelope makes glowing stretches with dark sky between;
        // faster shimmer adds ray striations inside them
        const patch = Math.pow(U.noise1((x + ax) * 0.0016, 611), 1.6);
        const ray = 0.45 + 0.55 * U.noise1((x + ax * 1.4) * 0.006 + time * 0.06, 622);
        const a = A * patch * ray * 2.0;
        if (a < 0.03) continue;
        const baseY = h * (0.15
          + 0.07 * U.noise1((x + ax) * 0.0011 + 31, 633)
          + 0.013 * Math.sin(time * 0.09 + x * 0.002));
        const len = h * (0.05 + 0.13 * U.noise1((x + ax) * 0.004 - time * 0.03, 644));
        ctx.globalAlpha = Math.min(0.7, a);
        ctx.fillStyle = grad;
        ctx.fillRect(x, baseY - len, colW, len);
        // faint magenta fringe along the bright lower edge
        ctx.globalAlpha = Math.min(0.35, a * 0.45);
        ctx.fillStyle = 'rgba(206,128,210,1)';
        ctx.fillRect(x, baseY - h * 0.006, colW, h * 0.011);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // -- sun --
    const sun = Palette.sunPos(env.t);
    // far north in winter the sun barely grazes (or never clears) the horizon
    if (env.polar) sun.elev = sun.elev * (1 - 0.96 * env.polar) - 0.05 * env.polar;
    if (sun.up) {
      const sxp = w * (0.14 + 0.72 * sun.p);
      const syp = horizonY - sun.elev * (horizonY - h * 0.09);
      const lowness = 1 - U.smooth(U.clamp(sun.elev * 1.6, 0, 1));
      const sunCol = U.mix(U.col('#fff6dc'), U.col('#ff8a4d'), lowness);
      const glowR = h * (0.30 + lowness * 0.50);
      const gg = ctx.createRadialGradient(sxp, syp, 0, sxp, syp, glowR);
      gg.addColorStop(0, U.css(sunCol, 0.55));
      gg.addColorStop(1, U.css(sunCol, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(sxp - glowR, syp - glowR, glowR * 2, glowR * 2);
      // a big disc near the horizon, with stepped halo rings
      const sr = h * 0.030 * (1 + lowness * 2.4);
      ctx.fillStyle = U.css(sunCol, 0.10);
      ctx.beginPath(); ctx.arc(sxp, syp, sr * 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = U.css(sunCol, 0.14);
      ctx.beginPath(); ctx.arc(sxp, syp, sr * 1.7, 0, TAU); ctx.fill();
      ctx.fillStyle = U.css(U.mix(sunCol, U.col('#ffffff'), 0.4 * (1 - lowness)));
      ctx.beginPath(); ctx.arc(sxp, syp, sr, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.28 * (1 - lowness * 0.6)})`;
      ctx.beginPath();
      ctx.arc(sxp - sr * 0.30, syp - sr * 0.35, sr * 0.30, 0, TAU);
      ctx.arc(sxp + sr * 0.25, syp + sr * 0.15, sr * 0.16, 0, TAU);
      ctx.fill();
      if (sun.elev > 0.02) { env.sunX = sxp; env.sunY = syp; }
      env.sunLow = lowness;
    }

    // -- moon, showing tonight's true phase (absent around new moon) --
    if (moonArc.up && illum > 0.03) {
      const mx = w * (0.16 + 0.68 * moonArc.p);
      const my = horizonY - moonArc.elev * (horizonY - h * 0.12);
      const r = h * 0.024;
      const ga = 0.06 + 0.26 * illum; // glow follows the phase
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, r * 6);
      mg.addColorStop(0, `rgba(220,230,245,${ga.toFixed(3)})`);
      mg.addColorStop(1, 'rgba(220,230,245,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(mx - r * 6, my - r * 6, r * 12, r * 12);
      drawMoonPhase(ctx, mx, my, r, mph,
        '#e8edf5', U.css(U.mix(pal.top, U.col('#8e98ac'), 0.22), 0.9));
      if (moonArc.elev > 0.02 && illum > 0.25) { env.moonX = mx; env.moonY = my; }
    }

    // -- clouds: two parallax bands of chunked ellipse clusters --
    drawClouds(ctx, env, pal, 0.04, h * 0.16, 11, 0.55);
    drawClouds(ctx, env, pal, 0.09, h * 0.30, 23, 1.0);

    // a heavy ceiling closes over the sky as cover approaches full storm
    if (env.weather.cloudCover > 0.7) {
      const sa = Math.min(0.6, (env.weather.cloudCover - 0.7) * 2.0);
      const sc = Palette.lit(U.col('#69748a'), pal, env.light);
      const sg = ctx.createLinearGradient(0, 0, 0, h * 0.32);
      sg.addColorStop(0, U.css(sc, sa));
      sg.addColorStop(1, U.css(sc, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h * 0.32);
    }

    // -- birds (daytime, gentle) --
    birdTimer -= dt;
    if (birdTimer <= 0) {
      birdTimer = 25 + Math.random() * 40;
      if (env.light > 0.5 && birds.length < 2) {
        const n = 3 + Math.floor(Math.random() * 4);
        birds.push({
          x: w + 60, y: h * (0.12 + Math.random() * 0.25),
          n, vx: -(18 + Math.random() * 14), phase: Math.random() * 9,
        });
      }
    }
    ctx.strokeStyle = U.css(U.scale(pal.top, 0.45), 0.8);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    for (let i = birds.length - 1; i >= 0; i--) {
      const f = birds[i];
      f.x += (f.vx - env.speed * 0.04) * dt;
      if (f.x < -120) { birds.splice(i, 1); continue; }
      for (let b = 0; b < f.n; b++) {
        const bx = f.x + (b % 2 ? -1 : 1) * Math.ceil(b / 2) * 14 + Math.ceil(b / 2) * 6;
        const by = f.y + Math.ceil(b / 2) * 7 + Math.sin(time * 0.7 + b) * 2;
        const flap = Math.sin(time * 6 + f.phase + b * 0.7) * 3;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by - flap);
        ctx.quadraticCurveTo(bx, by + 2, bx + 5, by - flap);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  }

  function drawClouds(ctx, env, pal, p, baseY, layerSeed, sizeMul) {
    const { w, h, time } = env;
    const cover = env.weather.cloudCover;
    const lx = env.worldX * p + time * 4; // clouds also drift on their own
    const chunkW = 560;
    const lit = Palette.lit(U.col('#ffffff'), pal, env.light);
    const shade = Palette.lit(U.col('#a8b2c2'), pal, env.light);
    for (let ci = Math.floor(lx / chunkW); ci < (lx + w) / chunkW + 1; ci++) {
      const r = U.rng(U.hash2(ci, layerSeed));
      const count = 2 + Math.floor(r() * 2);
      for (let k = 0; k < count; k++) {
        const need = r();           // cloud appears once cover exceeds this
        const cx = ci * chunkW + r() * chunkW - lx;
        const cy = baseY + (r() - 0.5) * h * 0.14;
        const cw = h * (0.10 + r() * 0.16) * sizeMul;
        const wob = r();            // always drawn: stable layout as cover shifts
        const a = U.clamp((cover + 0.12 - need) * 3.0, 0, 1) * 0.92;
        if (a < 0.01) continue;
        const grey = U.clamp((cover - 0.30) * 1.2, 0, 0.8); // storm = darker
        // sculpted cumulus: lobed arcs on top, flat base
        ctx.fillStyle = U.css(U.mix(lit, shade, grey + wob * 0.10), a);
        ctx.beginPath();
        ctx.moveTo(cx - cw * 0.95, cy);
        ctx.arc(cx - cw * 0.58, cy - cw * 0.05, cw * (0.30 + wob * 0.06), Math.PI * 0.95, Math.PI * 1.55);
        ctx.arc(cx - cw * 0.04, cy - cw * 0.30, cw * (0.40 + wob * 0.08), Math.PI * 1.05, Math.PI * 1.92);
        ctx.arc(cx + cw * 0.50, cy - cw * 0.08, cw * 0.34, Math.PI * 1.25, Math.PI * 2.0);
        ctx.lineTo(cx + cw * 0.95, cy);
        ctx.closePath();
        ctx.fill();
        // soft shading hugging the flat base
        ctx.fillStyle = U.css(shade, a * 0.30);
        ctx.beginPath();
        ctx.ellipse(cx - cw * 0.05, cy - cw * 0.045, cw * 0.64, cw * 0.10, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  return { render };
})();
