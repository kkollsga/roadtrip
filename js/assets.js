/* Endless Drive — procedural scenery art. Every function draws one item with
   its base at (x, y), overall size s, a palette of pre-tinted CSS colors c,
   a deterministic variant v in [0,1), and the running clock (for things that
   move: turbine blades, lighthouse beams). Flat layered-silhouette style. */
window.Assets = (() => {
  const { TAU } = U;

  function rr(ctx, x, y, w, h, r) { // rounded rect path helper
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function pine(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.trunk;
    ctx.fillRect(x - s * 0.028, y - s * 0.17, s * 0.056, s * 0.18);
    ctx.fillStyle = v > 0.5 ? c.foliage : c.foliage2;
    const tiers = 4, w = s * (0.42 + (v % 0.13));
    for (let i = 0; i < tiers; i++) {
      const f = i / tiers;
      const ty = y - s * 0.13 - f * s * 0.62;
      const tw = w * (1 - f * 0.66);
      const th = s * 0.34;
      ctx.beginPath();
      ctx.moveTo(x - tw / 2, ty);
      ctx.quadraticCurveTo(x - tw * 0.08, ty - th * 0.5, x, ty - th);
      ctx.quadraticCurveTo(x + tw * 0.08, ty - th * 0.5, x + tw / 2, ty);
      ctx.closePath();
      ctx.fill();
    }
  }

  function roundTree(ctx, x, y, s, c, v) {
    const lean = (v - 0.5) * s * 0.12;
    ctx.strokeStyle = c.trunk;
    ctx.lineWidth = Math.max(1.5, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.4, y - s * 0.3, x + lean, y - s * 0.5);
    ctx.stroke();
    ctx.fillStyle = v > 0.55 ? c.foliage : c.foliage2;
    const r = s * (0.26 + (v % 0.07));
    const cx = x + lean, cy = y - s * 0.62;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.arc(cx - r * 0.75, cy + r * 0.30, r * 0.66, 0, TAU);
    ctx.arc(cx + r * 0.75, cy + r * 0.28, r * 0.7, 0, TAU);
    ctx.arc(cx + r * 0.1, cy - r * 0.45, r * 0.6, 0, TAU);
    ctx.fill();
  }

  function birch(ctx, x, y, s, c, v) {
    ctx.strokeStyle = c.light;
    ctx.lineWidth = Math.max(1.2, s * 0.045);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (v - 0.5) * s * 0.1, y - s * 0.6); ctx.stroke();
    ctx.fillStyle = c.foliage2;
    ctx.beginPath();
    ctx.ellipse(x + (v - 0.5) * s * 0.1, y - s * 0.72, s * 0.17, s * 0.26, 0, 0, TAU);
    ctx.fill();
  }

  function deadTree(ctx, x, y, s, c, v) {
    const r = U.rng(v + 0.123);
    ctx.strokeStyle = c.trunk;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const tx = x + (r() - 0.5) * s * 0.2, ty = y - s * 0.66;
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.028);
    for (let i = 0; i < 3; i++) {
      const by = y - s * (0.3 + r() * 0.35);
      const dir = r() > 0.5 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(U.lerp(x, tx, (y - by) / (y - ty)), by);
      ctx.lineTo(x + dir * s * (0.16 + r() * 0.2), by - s * (0.12 + r() * 0.18));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function cactus(ctx, x, y, s, c, v) {
    const w = s * 0.16;
    ctx.fillStyle = c.foliage;
    ctx.beginPath(); rr(ctx, x - w / 2, y - s, w, s, w / 2); ctx.fill();
    if (v > 0.25) { // left arm
      const ay = y - s * 0.55;
      ctx.beginPath(); rr(ctx, x - s * 0.3, ay - w * 0.45, s * 0.3, w * 0.9, w * 0.45); ctx.fill();
      ctx.beginPath(); rr(ctx, x - s * 0.3, ay - s * 0.3, w * 0.9, s * 0.3 + w, w * 0.45); ctx.fill();
    }
    if (v > 0.6) { // right arm
      const ay = y - s * 0.38;
      ctx.beginPath(); rr(ctx, x, ay - w * 0.45, s * 0.26, w * 0.9, w * 0.45); ctx.fill();
      ctx.beginPath(); rr(ctx, x + s * 0.26 - w * 0.9, ay - s * 0.24, w * 0.9, s * 0.24 + w, w * 0.45); ctx.fill();
    }
  }

  function palm(ctx, x, y, s, c, v) {
    const sway = (v - 0.5) * 0.5;
    const topX = x + s * (0.16 + sway * 0.2), topY = y - s * 0.74;
    ctx.strokeStyle = c.trunk;
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - s * 0.06, y - s * 0.4, topX, topY);
    ctx.stroke();
    ctx.strokeStyle = c.foliage;
    ctx.lineWidth = Math.max(1.5, s * 0.045);
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = -2.8 + i * 0.52 + sway;
      const len = s * 0.42;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.6 - len * 0.18,
        topX + Math.cos(a) * len, topY + Math.sin(a) * len * 0.55 + len * 0.3);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function bush(ctx, x, y, s, c, v) {
    ctx.fillStyle = v > 0.5 ? c.foliage : c.foliage2;
    ctx.beginPath();
    ctx.arc(x - s * 0.22, y - s * 0.16, s * 0.22, 0, TAU);
    ctx.arc(x + s * 0.1, y - s * 0.22, s * 0.27, 0, TAU);
    ctx.arc(x + s * 0.3, y - s * 0.13, s * 0.18, 0, TAU);
    ctx.fill();
  }

  function tuft(ctx, x, y, s, c, v) {
    ctx.strokeStyle = c.foliage2;
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.lineCap = 'round';
    const r = U.rng(v + 0.77);
    for (let i = 0; i < 4; i++) {
      const dx = (i - 1.5) * s * 0.12 + (r() - 0.5) * s * 0.08;
      ctx.beginPath();
      ctx.moveTo(x + dx, y);
      ctx.quadraticCurveTo(x + dx + s * 0.05, y - s * 0.32, x + dx + (r() - 0.3) * s * 0.3, y - s * (0.4 + r() * 0.25));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function rock(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.45, y);
    ctx.lineTo(x - s * 0.3, y - s * (0.3 + v * 0.15));
    ctx.lineTo(x + s * 0.05, y - s * (0.42 + (v % 0.1)));
    ctx.lineTo(x + s * 0.36, y - s * 0.22);
    ctx.lineTo(x + s * 0.45, y);
    ctx.closePath();
    ctx.fill();
  }

  function mesa(ctx, x, y, w, h, c, v) {
    ctx.fillStyle = c.fill;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w * (0.32 + v * 0.06), y - h * 0.78);
    ctx.lineTo(x - w * 0.27, y - h);
    ctx.lineTo(x + w * (0.24 + (v % 0.08)), y - h);
    ctx.lineTo(x + w * 0.31, y - h * 0.72);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.strata;
    ctx.fillRect(x - w * 0.31, y - h * 0.62, w * 0.64, h * 0.035);
    ctx.fillRect(x - w * 0.34, y - h * 0.4, w * 0.7, h * 0.03);
  }

  function barn(ctx, x, y, s, c, v) {
    const w = s * (1.1 + (v * 7 % 1) * 0.35), h = s * 0.52;
    ctx.fillStyle = c.accent;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = c.dark; // gambrel roof with overhang
    ctx.beginPath();
    ctx.moveTo(x - w * 0.60, y - h);
    ctx.lineTo(x - w * 0.42, y - h - s * 0.20);
    ctx.lineTo(x - w * 0.16, y - h - s * 0.33);
    ctx.lineTo(x + w * 0.16, y - h - s * 0.33);
    ctx.lineTo(x + w * 0.42, y - h - s * 0.20);
    ctx.lineTo(x + w * 0.60, y - h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.light; // white trim under the eave
    ctx.fillRect(x - w / 2, y - h, w, s * 0.022);
    const dw = w * 0.26; // big doors with an X brace
    ctx.fillStyle = c.dark;
    ctx.fillRect(x - dw / 2, y - h * 0.72, dw, h * 0.72);
    ctx.strokeStyle = c.light;
    ctx.lineWidth = Math.max(0.8, s * 0.014);
    ctx.strokeRect(x - dw / 2, y - h * 0.72, dw, h * 0.72);
    ctx.beginPath();
    ctx.moveTo(x - dw / 2, y - h * 0.72); ctx.lineTo(x + dw / 2, y);
    ctx.moveTo(x + dw / 2, y - h * 0.72); ctx.lineTo(x - dw / 2, y);
    ctx.stroke();
    ctx.fillStyle = c.dark; // hayloft door
    ctx.fillRect(x - s * 0.07, y - h - s * 0.17, s * 0.14, s * 0.13);
    ctx.fillStyle = c.glowA > 0 ? `rgba(255,198,106,${0.3 + 0.6 * c.glowA})` : c.light;
    ctx.fillRect(x - w * 0.38, y - h * 0.62, s * 0.10, s * 0.10);
    ctx.fillRect(x + w * 0.27, y - h * 0.62, s * 0.10, s * 0.10);
    if (v > 0.55) { // some farms get a silo
      const sx2 = x + w * 0.74, sr = s * 0.13;
      ctx.fillStyle = c.light;
      ctx.fillRect(sx2 - sr, y - s * 0.78, sr * 2, s * 0.78);
      ctx.fillStyle = c.dark;
      ctx.beginPath();
      ctx.arc(sx2, y - s * 0.78, sr, Math.PI, 0);
      ctx.fill();
    }
  }

  function cabin(ctx, x, y, s, c, v, time) {
    const w = s * (0.8 + (v * 11 % 1) * 0.4), h = s * 0.45;
    const painted = v > 0.45 && c.accent; // about half wear the classic falu red
    ctx.fillStyle = painted ? c.accent : c.trunk;
    ctx.fillRect(x - w / 2, y - h, w, h);
    if (!painted) { // log courses
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = c.dark;
      ctx.lineWidth = Math.max(0.7, s * 0.008);
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y - h * i / 4);
        ctx.lineTo(x + w / 2, y - h * i / 4);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = c.dark; // roof with overhang + chimney
    ctx.beginPath();
    ctx.moveTo(x - w * 0.64, y - h);
    ctx.lineTo(x, y - h - s * 0.34);
    ctx.lineTo(x + w * 0.64, y - h);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + w * 0.26, y - h - s * 0.52, s * 0.10, s * 0.30);
    const ga = c.glowA; // white-trimmed window, lit after dark
    ctx.fillStyle = c.light;
    ctx.fillRect(x - w * 0.32 - s * 0.014, y - h * 0.68 - s * 0.014, s * 0.148, s * 0.148);
    ctx.fillStyle = ga > 0 ? `rgba(255,198,106,${0.35 + 0.6 * ga})` : c.dark;
    ctx.fillRect(x - w * 0.32, y - h * 0.68, s * 0.12, s * 0.12);
    ctx.fillStyle = c.dark; // door
    ctx.fillRect(x + w * 0.08, y - h * 0.60, s * 0.13, h * 0.60);
    if (ga > 0.1 && time !== undefined) { // chimney smoke on cold evenings
      ctx.fillStyle = `rgba(192,197,208,${0.22 * ga})`;
      for (let i = 0; i < 3; i++) {
        const px = x + w * 0.26 + s * 0.05 + Math.sin(time * 0.5 + i * 1.7 + v * 9) * s * 0.035 + i * s * 0.045;
        const py = y - h - s * 0.56 - i * s * 0.11;
        ctx.beginPath();
        ctx.arc(px, py, s * (0.035 + i * 0.013), 0, TAU);
        ctx.fill();
      }
    }
  }

  function turbine(ctx, x, y, s, c, v, time) {
    ctx.strokeStyle = c.light;
    ctx.lineWidth = Math.max(1.5, s * 0.022);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s); ctx.stroke();
    const rot = time * 0.55 + v * 9;
    ctx.lineWidth = Math.max(1.2, s * 0.018);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = rot + i * TAU / 3;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + Math.cos(a) * s * 0.4, y - s + Math.sin(a) * s * 0.4);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = c.light;
    ctx.beginPath(); ctx.arc(x, y - s, s * 0.03, 0, TAU); ctx.fill();
  }

  function lighthouse(ctx, x, y, s, c, v, time) {
    const w = s * 0.22;
    ctx.fillStyle = c.light;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w * 0.32, y - s * 0.8);
    ctx.lineTo(x + w * 0.32, y - s * 0.8);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.fillRect(x - w * 0.46, y - s * 0.3, w * 0.92, s * 0.12);
    ctx.fillRect(x - w * 0.38, y - s * 0.62, w * 0.76, s * 0.1);
    ctx.fillStyle = c.dark; // lamp room + cap
    ctx.fillRect(x - w * 0.36, y - s * 0.94, w * 0.72, s * 0.14);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.36, y - s * 0.94);
    ctx.lineTo(x, y - s * 1.04);
    ctx.lineTo(x + w * 0.36, y - s * 0.94);
    ctx.closePath();
    ctx.fill();
    if (c.glowA > 0) { // rotating beam at night
      const a = time * 0.7 + v * 6;
      const beam = Math.max(0, Math.cos(a));
      ctx.fillStyle = `rgba(255,236,170,${c.glowA * 0.9})`;
      ctx.beginPath(); ctx.arc(x, y - s * 0.87, w * 0.2, 0, TAU); ctx.fill();
      if (beam > 0.1) {
        const dir = Math.sin(a) > 0 ? 1 : -1;
        const g = ctx.createLinearGradient(x, 0, x + dir * s * 2.4, 0);
        g.addColorStop(0, `rgba(255,236,170,${0.20 * c.glowA * beam})`);
        g.addColorStop(1, 'rgba(255,236,170,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.87);
        ctx.lineTo(x + dir * s * 2.4, y - s * 0.87 - s * 0.5);
        ctx.lineTo(x + dir * s * 2.4, y - s * 0.87 + s * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /* drifting polar ice — y is the waterline.
     c = { ice (sunlit), shade (cold face), deep (submerged hint) } */
  function iceberg(ctx, x, y, s, c, v) {
    const r = U.rng(v * 9973 + 17);
    const lw = s * (0.8 + r() * 0.5);
    const rw = s * (0.8 + r() * 0.5);
    const px = x + (r() - 0.5) * s * 0.5;       // peak x
    const ph = s * (0.85 + r() * 0.6);          // peak height
    const ls = y - s * (0.30 + r() * 0.22);     // shoulders
    const rs = y - s * (0.24 + r() * 0.26);
    ctx.fillStyle = c.ice;
    ctx.beginPath();
    ctx.moveTo(x - lw, y);
    ctx.lineTo(x - lw * 0.55, ls);
    ctx.lineTo(px, y - ph);
    ctx.lineTo(x + rw * 0.5, rs);
    ctx.lineTo(x + rw, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.shade; // lee face in cold shadow
    ctx.beginPath();
    ctx.moveTo(px, y - ph);
    ctx.lineTo(x + rw * 0.5, rs);
    ctx.lineTo(x + rw, y);
    ctx.lineTo(px * 0.35 + x * 0.65, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.deep; // submerged mass glimmering below
    ctx.beginPath();
    ctx.moveTo(x - lw * 0.8, y);
    ctx.lineTo(x + (r() - 0.5) * s * 0.4, y + s * 0.20);
    ctx.lineTo(x + rw * 0.8, y);
    ctx.closePath();
    ctx.fill();
  }

  function floe(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.ice;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x - s * 0.72, y - s * 0.10);
    ctx.lineTo(x + s * (0.3 + v * 0.3), y - s * 0.13);
    ctx.lineTo(x + s * 0.95, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.deep;
    ctx.fillRect(x - s * 0.85, y, s * 1.7, s * 0.05);
  }

  function streetlight(ctx, x, y, s, c, v) {
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = Math.max(2, s * 0.045);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - s);
    ctx.quadraticCurveTo(x + s * 0.02, y - s * 1.16, x + s * 0.34, y - s * 1.12);
    ctx.stroke();
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.ellipse(x + s * 0.36, y - s * 1.11, s * 0.07, s * 0.035, 0, 0, TAU);
    ctx.fill();
    if (c.glowA > 0) {
      const lx = x + s * 0.36, ly = y - s * 1.09;
      const gy = y + (c.poolDY || s * 0.4);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,214,140,${0.9 * c.glowA})`;
      ctx.beginPath(); ctx.arc(lx, ly, s * 0.045, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 0.5);
      g.addColorStop(0, `rgba(255,200,120,${0.30 * c.glowA})`);
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - s * 0.5, ly - s * 0.5, s, s);
      const cg = ctx.createLinearGradient(0, ly, 0, gy);
      cg.addColorStop(0, `rgba(255,205,130,${0.18 * c.glowA})`);
      cg.addColorStop(1, `rgba(255,205,130,${0.05 * c.glowA})`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(lx - s * 0.07, ly);
      ctx.lineTo(lx + s * 0.07, ly);
      ctx.lineTo(lx + s * 0.40, gy);
      ctx.lineTo(lx - s * 0.40, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,205,130,${0.13 * c.glowA})`;
      ctx.beginPath(); ctx.ellipse(lx, gy, s * 0.48, s * 0.07, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function fern(ctx, x, y, s, c, v) {
    ctx.strokeStyle = v > 0.5 ? c.foliage : c.foliage2;
    ctx.lineWidth = Math.max(1.2, s * 0.06);
    ctx.lineCap = 'round';
    const r = U.rng(v * 631 + 9);
    for (let i = 0; i < 6; i++) {
      const dir = i % 2 ? 1 : -1;
      const len = s * (0.5 + r() * 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + dir * len * 0.35, y - len * 0.9,
        x + dir * len * (0.75 + r() * 0.3), y - len * (0.35 + r() * 0.25));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  /* towering sequoia for the tree line: tapered trunk, foliage tiers high up */
  function redwood(ctx, x, y, s, c, v) {
    const tw = s * 0.05 * (0.9 + v * 0.3);
    ctx.fillStyle = c.trunk;
    ctx.beginPath();
    ctx.moveTo(x - tw * 2.0, y);
    ctx.quadraticCurveTo(x - tw * 1.2, y - s * 0.05, x - tw, y - s * 0.16);
    ctx.lineTo(x - tw * 0.5, y - s * 0.97);
    ctx.lineTo(x + tw * 0.5, y - s * 0.97);
    ctx.lineTo(x + tw, y - s * 0.16);
    ctx.quadraticCurveTo(x + tw * 1.2, y - s * 0.05, x + tw * 2.0, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = v > 0.5 ? c.foliage : c.foliage2;
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const f = i / (tiers - 1);
      const ty = y - s * (0.36 + f * 0.60);
      const twd = s * 0.20 * (1 - f * 0.55) * (0.85 + ((v * 7 + i * 0.37) % 1) * 0.35);
      ctx.beginPath();
      ctx.ellipse(x + (i % 2 ? 1 : -1) * twd * 0.15, ty, twd, s * 0.05, 0, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.99, s * 0.055, s * 0.045, 0, 0, TAU);
    ctx.fill();
  }

  /* a colossal trunk sweeping past in the near foreground; s = visible height */
  function redwoodTrunk(ctx, x, y, s, c, v) {
    const w2 = s * 0.075 * (0.8 + v * 0.5);
    ctx.fillStyle = c.trunk;
    ctx.beginPath();
    ctx.moveTo(x - w2 * 1.9, y);
    ctx.quadraticCurveTo(x - w2 * 1.2, y - s * 0.05, x - w2, y - s * 0.16);
    ctx.lineTo(x - w2 * 0.78, y - s * 1.05);
    ctx.lineTo(x + w2 * 0.78, y - s * 1.05);
    ctx.lineTo(x + w2, y - s * 0.16);
    ctx.quadraticCurveTo(x + w2 * 1.2, y - s * 0.05, x + w2 * 1.9, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.dark; // deep bark furrows
    ctx.lineWidth = Math.max(1.5, w2 * 0.10);
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 4; i++) {
      const fx = x - w2 * 0.62 + i * w2 * 0.41 + ((v * 13) % 1) * w2 * 0.15;
      ctx.beginPath();
      ctx.moveTo(fx, y - s * 0.02);
      ctx.quadraticCurveTo(fx + w2 * 0.18, y - s * 0.5, fx - w2 * 0.06, y - s * 1.03);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* rainforest emergent: slender trunk, broad layered umbrella crown */
  function canopyTree(ctx, x, y, s, c, v) {
    const r = U.rng(v * 397 + 3);
    const lean = (v - 0.5) * s * 0.12;
    ctx.strokeStyle = c.trunk;
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.5, y - s * 0.35, x + lean, y - s * 0.64);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.03); // buttress flare
    ctx.beginPath();
    ctx.moveTo(x - s * 0.07, y); ctx.lineTo(x, y - s * 0.10);
    ctx.moveTo(x + s * 0.07, y); ctx.lineTo(x, y - s * 0.10);
    ctx.stroke();
    const cw = s * (0.44 + r() * 0.12), cy0 = y - s * (0.72 + r() * 0.08);
    ctx.fillStyle = v > 0.5 ? c.foliage : c.foliage2;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.ellipse(x + lean + i * cw * 0.30, cy0 + Math.abs(i) * s * 0.035,
        cw * (0.34 - Math.abs(i) * 0.05), s * (0.115 - Math.abs(i) * 0.015), 0, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = c.foliage2; // a higher second tier
    ctx.beginPath();
    ctx.ellipse(x + lean - cw * 0.20, cy0 - s * 0.09, cw * 0.30, s * 0.085, 0, 0, TAU);
    ctx.ellipse(x + lean + cw * 0.25, cy0 - s * 0.07, cw * 0.24, s * 0.07, 0, 0, TAU);
    ctx.fill();
  }

  /* Pão de Açúcar: steep granite domes rising straight from the bay */
  function sugarloaf(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.rock;
    ctx.beginPath(); // the main loaf
    ctx.moveTo(x - s * 0.10, y);
    ctx.quadraticCurveTo(x - s * 0.14, y - s * 0.72, x + s * 0.16, y - s * 0.98);
    ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.72, x + s * 0.52, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // Morro da Urca beside it
    ctx.moveTo(x - s * 0.78, y);
    ctx.quadraticCurveTo(x - s * 0.78, y - s * 0.50, x - s * 0.48, y - s * 0.55);
    ctx.quadraticCurveTo(x - s * 0.18, y - s * 0.48, x - s * 0.12, y);
    ctx.closePath();
    ctx.fill();
    if (c.green) { // jungle skirting the bases
      ctx.fillStyle = c.green;
      ctx.beginPath();
      ctx.ellipse(x - s * 0.45, y, s * 0.42, s * 0.10, 0, 0, TAU);
      ctx.ellipse(x + s * 0.25, y, s * 0.38, s * 0.09, 0, 0, TAU);
      ctx.fill();
    }
  }

  /* a broad ice tongue spilling between two dark shoulders to the valley */
  function glacier(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.rock;
    ctx.beginPath(); // left shoulder
    ctx.moveTo(x - s * 1.5, y);
    ctx.lineTo(x - s * 0.95, y - s * 0.78);
    ctx.lineTo(x - s * 0.55, y - s * 0.95);
    ctx.lineTo(x - s * 0.28, y - s * 0.55);
    ctx.lineTo(x - s * 0.30, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // right shoulder
    ctx.moveTo(x + s * 1.5, y);
    ctx.lineTo(x + s * 1.0, y - s * 0.85);
    ctx.lineTo(x + s * 0.55, y - s * 1.0);
    ctx.lineTo(x + s * 0.30, y - s * 0.60);
    ctx.lineTo(x + s * 0.32, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.snow; // névé up high, narrowing tongue, terminal snout
    ctx.beginPath();
    ctx.moveTo(x - s * 0.55, y - s * 0.95);
    ctx.quadraticCurveTo(x, y - s * 1.10, x + s * 0.55, y - s * 1.0);
    ctx.lineTo(x + s * 0.30, y - s * 0.60);
    ctx.quadraticCurveTo(x + s * 0.24, y - s * 0.30, x + s * 0.26, y);
    ctx.lineTo(x - s * 0.24, y);
    ctx.quadraticCurveTo(x - s * 0.26, y - s * 0.35, x - s * 0.28, y - s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.save(); // crevasse bands
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = c.shadow;
    ctx.lineWidth = Math.max(1, s * 0.015);
    for (let i = 0; i < 5; i++) {
      const fy = y - s * (0.12 + i * 0.15);
      const wgt = s * (0.24 - i * 0.02);
      ctx.beginPath();
      ctx.moveTo(x - wgt, fy);
      ctx.quadraticCurveTo(x, fy + s * 0.05, x + wgt, fy);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(140,200,235,0.35)'; // blue glow at the snout
    ctx.beginPath();
    ctx.moveTo(x - s * 0.24, y);
    ctx.quadraticCurveTo(x, y - s * 0.10, x + s * 0.26, y);
    ctx.closePath();
    ctx.fill();
  }

  /* ---- Japan ---- */

  /* cherry tree in full bloom; uses c.pink / c.pink2 */
  function sakura(ctx, x, y, s, c, v) {
    const lean = (v - 0.5) * s * 0.34;
    ctx.strokeStyle = c.trunk;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.3, y - s * 0.34, x + lean, y - s * 0.54);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.035); // a low graceful branch
    ctx.beginPath();
    ctx.moveTo(x + lean * 0.4, y - s * 0.30);
    ctx.quadraticCurveTo(x + lean * 0.4 - s * 0.12, y - s * 0.40, x + lean * 0.4 - s * 0.24, y - s * 0.44);
    ctx.stroke();
    ctx.lineCap = 'butt';
    const cx = x + lean, cy = y - s * 0.64;
    const r = s * (0.23 + (v % 0.08));
    ctx.fillStyle = v > 0.55 ? c.pink : c.pink2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.arc(cx - r * 0.85, cy + r * 0.25, r * 0.62, 0, TAU);
    ctx.arc(cx + r * 0.80, cy + r * 0.20, r * 0.66, 0, TAU);
    ctx.arc(cx + r * 0.10, cy - r * 0.50, r * 0.55, 0, TAU);
    ctx.arc(x + lean * 0.4 - s * 0.24, y - s * 0.46, r * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; // sunlit blossom highlight
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.42, 0, TAU);
    ctx.fill();
  }

  /* vermilion torii gate */
  function torii(ctx, x, y, s, c, v) {
    const w = s * 0.78;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w / 2 + s * 0.04, y - s * 0.78);
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2 - s * 0.04, y - s * 0.78);
    ctx.stroke();
    ctx.fillStyle = c.accent; // kasagi, curved up at the ends
    ctx.beginPath();
    ctx.moveTo(x - w * 0.68, y - s * 0.90);
    ctx.quadraticCurveTo(x, y - s * 0.81, x + w * 0.68, y - s * 0.90);
    ctx.lineTo(x + w * 0.66, y - s * 0.80);
    ctx.quadraticCurveTo(x, y - s * 0.73, x - w * 0.66, y - s * 0.80);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - w * 0.56, y - s * 0.62, w * 1.12, s * 0.055); // nuki
  }

  /* wooden teahouse with shoji panels and a red lantern */
  function teahouse(ctx, x, y, s, c, v) {
    const w = s * 1.3, hh = s * 0.5;
    ctx.fillStyle = c.trunk;
    ctx.fillRect(x - w / 2, y - hh, w, hh);
    ctx.fillStyle = c.dark; // engawa step
    ctx.fillRect(x - w / 2 - s * 0.05, y - s * 0.06, w + s * 0.1, s * 0.06);
    ctx.beginPath(); // gently curved roof
    ctx.moveTo(x - w * 0.62, y - hh);
    ctx.quadraticCurveTo(x - w * 0.5, y - hh - s * 0.06, x - w * 0.3, y - hh - s * 0.20);
    ctx.quadraticCurveTo(x, y - hh - s * 0.33, x + w * 0.3, y - hh - s * 0.20);
    ctx.quadraticCurveTo(x + w * 0.5, y - hh - s * 0.06, x + w * 0.62, y - hh);
    ctx.closePath();
    ctx.fill();
    const ga = c.glowA; // shoji panels: pale paper by day, warm-lit at night
    ctx.fillStyle = ga > 0 ? `rgba(255,214,150,${0.3 + 0.6 * ga})` : c.light;
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(x + i * w * 0.27 - w * 0.09, y - hh * 0.76, w * 0.18, hh * 0.52);
    }
    ctx.fillStyle = ga > 0 ? `rgba(255,92,70,${0.5 + 0.5 * ga})` : c.accent;
    ctx.beginPath(); // the lantern
    ctx.ellipse(x - w * 0.46, y - hh * 0.56, s * 0.045, s * 0.062, 0, 0, TAU);
    ctx.fill();
  }

  /* three-tiered pagoda */
  function pagoda(ctx, x, y, s, c, v) {
    for (let i = 0; i < 3; i++) {
      const by = y - i * s * 0.30;
      const rw = s * (0.46 - i * 0.09);
      ctx.fillStyle = c.accent;
      ctx.fillRect(x - rw * 0.7, by - s * 0.20, rw * 1.4, s * 0.20);
      if (c.glowA > 0) {
        ctx.fillStyle = `rgba(255,210,140,${0.7 * c.glowA})`;
        ctx.fillRect(x - rw * 0.16, by - s * 0.16, rw * 0.32, s * 0.11);
      }
      const ry = by - s * 0.20, rww = rw * 1.5;
      ctx.fillStyle = c.dark; // swooping eaves
      ctx.beginPath();
      ctx.moveTo(x - rww, ry - s * 0.015);
      ctx.quadraticCurveTo(x - rww * 0.6, ry - s * 0.10, x, ry - s * 0.115);
      ctx.quadraticCurveTo(x + rww * 0.6, ry - s * 0.10, x + rww, ry - s * 0.015);
      ctx.quadraticCurveTo(x + rww * 0.5, ry - s * 0.055, x, ry - s * 0.05);
      ctx.quadraticCurveTo(x - rww * 0.5, ry - s * 0.055, x - rww, ry - s * 0.015);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = c.dark; // finial
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.90);
    ctx.lineTo(x, y - s * 1.04);
    ctx.stroke();
  }

  /* ---- US national park landmarks ---- */

  function halfDome(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.rock;
    ctx.beginPath();
    ctx.moveTo(x - s * 1.1, y);
    ctx.lineTo(x - s * 0.45, y - s * 0.28);
    ctx.lineTo(x - s * 0.30, y - s * 0.92); // the sheer northwest face
    ctx.quadraticCurveTo(x + s * 0.12, y - s * 1.04, x + s * 0.45, y - s * 0.76);
    ctx.quadraticCurveTo(x + s * 0.78, y - s * 0.42, x + s * 1.15, y);
    ctx.closePath();
    ctx.fill();
    ctx.save(); // pale granite sheen on the face
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = c.snow;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.45, y - s * 0.28);
    ctx.lineTo(x - s * 0.30, y - s * 0.92);
    ctx.lineTo(x - s * 0.04, y - s * 0.97);
    ctx.lineTo(x - s * 0.16, y - s * 0.30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function devilsTower(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.rock;
    ctx.beginPath();
    ctx.moveTo(x - s * 1.0, y); // talus skirt
    ctx.quadraticCurveTo(x - s * 0.55, y - s * 0.18, x - s * 0.42, y - s * 0.34);
    ctx.lineTo(x - s * 0.30, y - s * 0.95); // fluted shaft, flat top
    ctx.lineTo(x + s * 0.30, y - s * 0.95);
    ctx.lineTo(x + s * 0.42, y - s * 0.34);
    ctx.quadraticCurveTo(x + s * 0.55, y - s * 0.18, x + s * 1.0, y);
    ctx.closePath();
    ctx.fill();
    ctx.save(); // columnar flutes
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = c.shadow;
    ctx.lineWidth = Math.max(1, s * 0.018);
    for (let i = -3; i <= 3; i++) {
      const fx = x + i * s * 0.082;
      ctx.beginPath();
      ctx.moveTo(fx, y - s * 0.93);
      ctx.lineTo(fx + i * s * 0.014, y - s * 0.36);
      ctx.stroke();
    }
    ctx.restore();
  }

  function oldFaithful(ctx, x, y, s, c, v, time) {
    ctx.fillStyle = c.rock; // sinter mound
    ctx.beginPath();
    ctx.moveTo(x - s * 0.9, y);
    ctx.quadraticCurveTo(x - s * 0.25, y - s * 0.22, x - s * 0.06, y - s * 0.26);
    ctx.lineTo(x + s * 0.06, y - s * 0.26);
    ctx.quadraticCurveTo(x + s * 0.25, y - s * 0.22, x + s * 0.9, y);
    ctx.closePath();
    ctx.fill();
    // erupts ~14s out of every ~75s, like the real one (sped up)
    const cyc = (time + v * 75) % 75;
    const e = cyc < 14 ? Math.sin(Math.PI * cyc / 14) : 0;
    if (e > 0.02) {
      const top = y - s * 0.26;
      const ht = s * (0.5 + 1.6 * e);
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = c.snow;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.05, top);
      ctx.quadraticCurveTo(x - s * (0.10 + 0.10 * e), top - ht * 0.6, x - s * (0.16 + 0.10 * e), top - ht);
      ctx.lineTo(x + s * (0.10 + 0.12 * e), top - ht);
      ctx.quadraticCurveTo(x + s * (0.08 + 0.08 * e), top - ht * 0.5, x + s * 0.05, top);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.4; // steam drifting off the top
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
          x + s * (0.06 + i * 0.15) + s * 0.05 * Math.sin(time * 0.4 + i * 2),
          top - ht + i * s * 0.05,
          s * (0.16 - i * 0.03), s * (0.10 - i * 0.02), 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function bryceHoodoos(ctx, x, y, s, c, v) {
    const r = U.rng(v * 7919 + 5);
    ctx.fillStyle = c.warm;
    for (let i = 0; i < 5; i++) {
      const hx = x + (i - 2) * s * 0.36 + (r() - 0.5) * s * 0.12;
      const hh = s * (0.55 + r() * 0.45);
      const hw = s * (0.07 + r() * 0.04);
      ctx.beginPath();
      ctx.moveTo(hx - hw * 1.7, y);
      ctx.lineTo(hx - hw * 0.7, y - hh * 0.85);
      ctx.lineTo(hx - hw, y - hh); // overhanging cap
      ctx.lineTo(hx + hw, y - hh);
      ctx.lineTo(hx + hw * 0.7, y - hh * 0.85);
      ctx.lineTo(hx + hw * 1.7, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = c.shadow;
    ctx.fillRect(x - s * 1.0, y - s * 0.30, s * 2.0, s * 0.022);
    ctx.restore();
  }

  function pole(ctx, x, y, s, c) {
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s); ctx.stroke();
    ctx.lineWidth = Math.max(1.5, s * 0.025);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.16, y - s * 0.92);
    ctx.lineTo(x + s * 0.16, y - s * 0.92);
    ctx.moveTo(x - s * 0.11, y - s * 0.8);
    ctx.lineTo(x + s * 0.11, y - s * 0.8);
    ctx.stroke();
  }

  function sign(ctx, x, y, s, c, v) {
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.7); ctx.stroke();
    ctx.fillStyle = c.light;
    if (v > 0.5) { // diamond
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.17, y - s * 0.83);
      ctx.lineTo(x, y - s * 0.66);
      ctx.lineTo(x - s * 0.17, y - s * 0.83);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath(); rr(ctx, x - s * 0.16, y - s, s * 0.32, s * 0.26, s * 0.03); ctx.fill();
    }
  }

  /* ---- famous landmarks (far-distance silhouettes) ----
     c = { rock, snow, shadow, warm } pre-tinted for the far layer. */

  function kilimanjaro(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.rock;
    ctx.beginPath();
    ctx.moveTo(x - s * 1.9, y);
    ctx.quadraticCurveTo(x - s * 0.62, y - s * 0.30, x - s * 0.40, y - s * 0.86);
    ctx.quadraticCurveTo(x - s * 0.05, y - s * 1.00, x + s * 0.34, y - s * 0.84);
    ctx.quadraticCurveTo(x + s * 0.60, y - s * 0.30, x + s * 1.9, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.snow; // glacier cap with a ragged hem
    ctx.beginPath();
    ctx.moveTo(x - s * 0.40, y - s * 0.84);
    ctx.quadraticCurveTo(x - s * 0.05, y - s * 0.99, x + s * 0.33, y - s * 0.82);
    ctx.lineTo(x + s * 0.24, y - s * 0.74);
    ctx.lineTo(x + s * 0.12, y - s * 0.79);
    ctx.lineTo(x - s * 0.02, y - s * 0.72);
    ctx.lineTo(x - s * 0.16, y - s * 0.80);
    ctx.lineTo(x - s * 0.30, y - s * 0.73);
    ctx.closePath();
    ctx.fill();
  }

  function fuji(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.rock;
    ctx.beginPath();
    ctx.moveTo(x - s * 1.25, y);
    ctx.quadraticCurveTo(x - s * 0.42, y - s * 0.18, x - s * 0.17, y - s * 0.93);
    ctx.lineTo(x + s * 0.15, y - s * 0.93);
    ctx.quadraticCurveTo(x + s * 0.40, y - s * 0.18, x + s * 1.25, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.snow; // zigzag snow hem
    ctx.beginPath();
    ctx.moveTo(x - s * 0.17, y - s * 0.93);
    ctx.lineTo(x + s * 0.15, y - s * 0.93);
    ctx.quadraticCurveTo(x + s * 0.20, y - s * 0.74, x + s * 0.26, y - s * 0.56);
    ctx.lineTo(x + s * 0.13, y - s * 0.64);
    ctx.lineTo(x + s * 0.02, y - s * 0.55);
    ctx.lineTo(x - s * 0.10, y - s * 0.65);
    ctx.lineTo(x - s * 0.20, y - s * 0.56);
    ctx.quadraticCurveTo(x - s * 0.22, y - s * 0.72, x - s * 0.17, y - s * 0.93);
    ctx.closePath();
    ctx.fill();
  }

  function matterhorn(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.rock;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.95, y);
    ctx.lineTo(x - s * 0.42, y - s * 0.42);
    ctx.lineTo(x - s * 0.18, y - s * 0.62);
    ctx.lineTo(x + s * 0.02, y - s * 1.00); // the hooked summit
    ctx.lineTo(x + s * 0.10, y - s * 0.84);
    ctx.lineTo(x + s * 0.34, y - s * 0.46);
    ctx.lineTo(x + s * 0.85, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.snow; // snow streak on the east face
    ctx.beginPath();
    ctx.moveTo(x - s * 0.06, y - s * 0.78);
    ctx.lineTo(x + s * 0.02, y - s * 1.00);
    ctx.lineTo(x + s * 0.08, y - s * 0.82);
    ctx.lineTo(x - s * 0.01, y - s * 0.60);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.42, y - s * 0.42);
    ctx.lineTo(x - s * 0.18, y - s * 0.62);
    ctx.lineTo(x - s * 0.10, y - s * 0.46);
    ctx.lineTo(x - s * 0.30, y - s * 0.30);
    ctx.closePath();
    ctx.fill();
  }

  function everest(ctx, x, y, s, c, v) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x - s * 1.3, y);
      ctx.lineTo(x - s * 0.85, y - s * 0.45);
      ctx.lineTo(x - s * 0.55, y - s * 0.38);
      ctx.lineTo(x - s * 0.25, y - s * 0.72);
      ctx.lineTo(x, y - s * 1.00);
      ctx.lineTo(x + s * 0.20, y - s * 0.62);
      ctx.lineTo(x + s * 0.50, y - s * 0.78);
      ctx.lineTo(x + s * 0.80, y - s * 0.40);
      ctx.lineTo(x + s * 1.3, y);
      ctx.closePath();
    };
    ctx.fillStyle = c.rock;
    path();
    ctx.fill();
    ctx.save(); // snow above ~half height
    ctx.beginPath();
    ctx.rect(x - s * 1.4, y - s * 1.1, s * 2.8, s * 0.62);
    ctx.clip();
    ctx.fillStyle = c.snow;
    path();
    ctx.fill();
    ctx.restore();
    ctx.save(); // summit plume streaming east
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = c.snow;
    ctx.beginPath();
    ctx.ellipse(x + s * 0.24, y - s * 0.97, s * 0.26, s * 0.032, 0.06, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function denali(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.snow; // fully glaciated massif
    ctx.beginPath();
    ctx.moveTo(x - s * 1.5, y);
    ctx.quadraticCurveTo(x - s * 0.95, y - s * 0.42, x - s * 0.50, y - s * 0.74);
    ctx.quadraticCurveTo(x - s * 0.22, y - s * 1.00, x - s * 0.02, y - s * 0.98);
    ctx.quadraticCurveTo(x + s * 0.18, y - s * 0.80, x + s * 0.40, y - s * 0.82);
    ctx.quadraticCurveTo(x + s * 0.80, y - s * 0.50, x + s * 1.5, y);
    ctx.closePath();
    ctx.fill();
    ctx.save(); // shadowed southeast face
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = c.shadow;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.02, y - s * 0.98);
    ctx.quadraticCurveTo(x + s * 0.18, y - s * 0.80, x + s * 0.40, y - s * 0.82);
    ctx.quadraticCurveTo(x + s * 0.80, y - s * 0.50, x + s * 1.5, y);
    ctx.lineTo(x + s * 0.1, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function monumentValley(ctx, x, y, s, c, v) {
    function butte(bx, bw, bh) {
      ctx.beginPath();
      ctx.moveTo(bx - bw / 2 - bh * 0.3, y);
      ctx.lineTo(bx - bw / 2, y - bh * 0.3);
      ctx.lineTo(bx - bw / 2 + bh * 0.02, y - bh);
      ctx.lineTo(bx + bw / 2 - bh * 0.02, y - bh);
      ctx.lineTo(bx + bw / 2, y - bh * 0.3);
      ctx.lineTo(bx + bw / 2 + bh * 0.3, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = c.warm;
    butte(x - s * 1.05, s * 0.60, s * 0.55);
    butte(x, s * 0.22, s * 0.95);
    butte(x + s * 0.95, s * 0.32, s * 0.72);
    ctx.fillStyle = c.shadow;
    ctx.fillRect(x - s * 1.32, y - s * 0.36, s * 0.56, s * 0.02);
    ctx.fillRect(x - s * 0.10, y - s * 0.60, s * 0.21, s * 0.02);
  }

  function delicateArch(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.warm;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.50, y);
    ctx.quadraticCurveTo(x - s * 0.56, y - s * 0.76, x, y - s * 0.88);
    ctx.quadraticCurveTo(x + s * 0.54, y - s * 0.78, x + s * 0.42, y);
    ctx.lineTo(x + s * 0.25, y);
    ctx.quadraticCurveTo(x + s * 0.30, y - s * 0.52, x, y - s * 0.58);
    ctx.quadraticCurveTo(x - s * 0.32, y - s * 0.52, x - s * 0.27, y);
    ctx.closePath();
    ctx.fill();
  }

  function uluru(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.warm;
    ctx.beginPath();
    ctx.moveTo(x - s * 1.25, y);
    ctx.quadraticCurveTo(x - s * 1.05, y - s * 0.74, x - s * 0.60, y - s * 0.84);
    ctx.quadraticCurveTo(x, y - s * 0.97, x + s * 0.55, y - s * 0.85);
    ctx.quadraticCurveTo(x + s * 1.0, y - s * 0.70, x + s * 1.2, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.shadow; // the famous striations
    ctx.lineWidth = Math.max(1, s * 0.022);
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 4; i++) {
      const gx = x - s * 0.55 + i * s * 0.34;
      ctx.beginPath();
      ctx.moveTo(gx, y - s * (0.72 - i * 0.02));
      ctx.quadraticCurveTo(gx + s * 0.06, y - s * 0.4, gx + s * 0.03, y - s * 0.08);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function namibDune(ctx, x, y, s, c, v) {
    const ax = x + s * 0.05, ay = y - s * 0.85; // crest apex
    ctx.fillStyle = c.warm; // sunlit windward face
    ctx.beginPath();
    ctx.moveTo(x - s * 1.5, y);
    ctx.quadraticCurveTo(x - s * 0.55, y - s * 0.60, ax, ay);
    ctx.lineTo(x + s * 0.85, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.shadow; // slip face in shade
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(x + s * 0.30, y - s * 0.42, x + s * 0.85, y);
    ctx.lineTo(x + s * 0.30, y);
    ctx.quadraticCurveTo(x + s * 0.16, y - s * 0.40, ax, ay);
    ctx.closePath();
    ctx.fill();
  }

  function hawaii(ctx, x, y, s, c, v) {
    ctx.fillStyle = c.rock; // shield volcano rising from the sea
    ctx.beginPath();
    ctx.moveTo(x - s * 1.7, y);
    ctx.quadraticCurveTo(x - s * 0.75, y - s * 0.52, x - s * 0.10, y - s * 0.62);
    ctx.quadraticCurveTo(x + s * 0.55, y - s * 0.54, x + s * 1.6, y);
    ctx.closePath();
    ctx.fill();
    ctx.save(); // soft steam wisp at the caldera
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = c.snow;
    ctx.beginPath();
    ctx.ellipse(x - s * 0.02, y - s * 0.70, s * 0.18, s * 0.05, -0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* shared eruption effect: towering churning ash lit from beneath, lava
     fountains, ballistic embers and glowing flows. (cx, cy) is the crater;
     vigor 0..1; the fire gets brighter at night via c.light. */
  function eruption(ctx, cx, cy, s, c, time, vigor) {
    const pulse = 0.7 + 0.3 * Math.sin(time * 1.9) * Math.sin(time * 0.47);
    const k = vigor * (1.25 - c.light * 0.85);
    ctx.save();
    // towering ash column, churning as it rises and drifts downwind
    ctx.fillStyle = c.shadow;
    ctx.globalAlpha = 0.55 * vigor;
    const billow = i => {
      const f = i / 7;
      return {
        x: cx + s * (0.03 + f * 0.42 + Math.sin(time * 0.35 + i * 1.9) * 0.035 * (0.3 + f)),
        y: cy - s * (0.06 + f * 0.74),
        r: s * (0.06 + f * 0.20),
      };
    };
    for (let i = 0; i < 8; i++) {
      const b = billow(i);
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 0.8, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    // the column's base glows, lit by the vent below
    for (let i = 0; i < 3; i++) {
      const b = billow(i);
      ctx.fillStyle = `rgba(255,118,40,${((0.28 - i * 0.085) * k * pulse).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r * 0.95, b.r * 0.75, 0, 0, TAU);
      ctx.fill();
    }
    // vent glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.45);
    g.addColorStop(0, `rgba(255,110,30,${(0.65 * k * pulse).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - s * 0.45, cy - s * 0.45, s * 0.9, s * 0.9);
    // lava fountain spraying from the vent
    ctx.strokeStyle = `rgba(255,196,96,${(0.7 * k * pulse).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, s * 0.013);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const a = -Math.PI / 2 + (j - 2) * 0.24 + Math.sin(time * 3 + j * 2.1) * 0.06;
      const len = s * (0.10 + 0.09 * ((time * 1.3 + j * 0.37) % 1));
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    }
    ctx.stroke();
    // embers on ballistic arcs
    for (let e = 0; e < 7; e++) {
      const tt = (time * 0.5 + e / 7) % 1;
      const dir = e % 2 ? 1 : -1;
      const ex = cx + dir * s * (0.04 + 0.24 * tt) * (0.7 + (e % 3) * 0.2);
      const ey = cy - s * 0.6 * tt * (1 - tt * 0.78);
      ctx.fillStyle = `rgba(255,160,70,${((1 - tt) * 0.8 * k).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(ex, ey, s * 0.013, 0, TAU);
      ctx.fill();
    }
    // glowing lava streams working down the flank
    ctx.strokeStyle = `rgba(255,132,46,${(0.55 * k).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, s * 0.016);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.02, cy);
    ctx.quadraticCurveTo(cx - s * 0.10, cy + s * 0.16, cx - s * 0.07, cy + s * 0.34);
    ctx.quadraticCurveTo(cx - s * 0.06, cy + s * 0.42, cx - s * 0.10, cy + s * 0.50);
    ctx.moveTo(cx + s * 0.03, cy);
    ctx.quadraticCurveTo(cx + s * 0.12, cy + s * 0.12, cx + s * 0.14, cy + s * 0.28);
    ctx.quadraticCurveTo(cx + s * 0.15, cy + s * 0.36, cx + s * 0.20, cy + s * 0.44);
    ctx.stroke();
    ctx.restore();
  }

  function etna(ctx, x, y, s, c, v, time) {
    ctx.fillStyle = c.rock; // broad Mediterranean stratovolcano
    ctx.beginPath();
    ctx.moveTo(x - s * 1.6, y);
    ctx.quadraticCurveTo(x - s * 0.80, y - s * 0.30, x - s * 0.34, y - s * 0.66);
    ctx.lineTo(x - s * 0.09, y - s * 0.94);
    ctx.lineTo(x + s * 0.10, y - s * 0.92);
    ctx.quadraticCurveTo(x + s * 0.46, y - s * 0.50, x + s * 1.55, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.snow; // light snow dusting near the summit
    ctx.beginPath();
    ctx.moveTo(x - s * 0.09, y - s * 0.94);
    ctx.lineTo(x + s * 0.10, y - s * 0.92);
    ctx.lineTo(x + s * 0.16, y - s * 0.78);
    ctx.lineTo(x + s * 0.05, y - s * 0.83);
    ctx.lineTo(x - s * 0.06, y - s * 0.76);
    ctx.lineTo(x - s * 0.15, y - s * 0.80);
    ctx.closePath();
    ctx.fill();
    if (v > 0.58) eruption(ctx, x, y - s * 0.93, s, c, time, (v - 0.58) / 0.42);
  }

  function eyjafjallajokull(ctx, x, y, s, c, v, time) {
    ctx.fillStyle = c.rock; // low glacier-capped Icelandic shield
    ctx.beginPath();
    ctx.moveTo(x - s * 1.7, y);
    ctx.quadraticCurveTo(x - s * 0.80, y - s * 0.50, x - s * 0.20, y - s * 0.78);
    ctx.lineTo(x + s * 0.30, y - s * 0.73);
    ctx.quadraticCurveTo(x + s * 0.90, y - s * 0.40, x + s * 1.7, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.snow; // the ice cap, ragged hem
    ctx.beginPath();
    ctx.moveTo(x - s * 0.20, y - s * 0.78);
    ctx.lineTo(x + s * 0.30, y - s * 0.73);
    ctx.quadraticCurveTo(x + s * 0.58, y - s * 0.58, x + s * 0.72, y - s * 0.44);
    ctx.lineTo(x + s * 0.50, y - s * 0.50);
    ctx.lineTo(x + s * 0.30, y - s * 0.42);
    ctx.lineTo(x + s * 0.05, y - s * 0.52);
    ctx.lineTo(x - s * 0.22, y - s * 0.44);
    ctx.lineTo(x - s * 0.44, y - s * 0.52);
    ctx.quadraticCurveTo(x - s * 0.55, y - s * 0.60, x - s * 0.20, y - s * 0.78);
    ctx.closePath();
    ctx.fill();
    if (v > 0.5) eruption(ctx, x + s * 0.04, y - s * 0.75, s, c, time, (v - 0.5) / 0.5);
  }

  return {
    rr, pine, roundTree, birch, deadTree, cactus, palm, bush, tuft, rock,
    mesa, barn, cabin, turbine, lighthouse, pole, sign, iceberg, floe,
    streetlight, fern, redwood, redwoodTrunk, canopyTree, sugarloaf, glacier,
    sakura, torii, teahouse, pagoda,
    kilimanjaro, fuji, matterhorn, everest, denali,
    monumentValley, delicateArch, uluru, namibDune, hawaii,
    etna, eyjafjallajokull,
    halfDome, devilsTower, oldFaithful, bryceHoodoos,
  };
})();
