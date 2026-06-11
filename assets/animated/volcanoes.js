/* Roadtrip animated assets — etna, eyjafjallajokull.
   Standalone module; tools/build.js concatenates assets/animated/*.js
   into js/gen/animated.js, loaded after the SVG asset registry. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const { rr } = Assets;

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
  Assets.etna = etna;
  Assets.eyjafjallajokull = eyjafjallajokull;
})();
