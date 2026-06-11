/* Roadtrip animated asset — streetlight.
   Standalone module; tools/build.js concatenates assets/animated/*.js
   into js/gen/animated.js, loaded after the SVG asset registry. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const { rr } = Assets;

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
  Assets.streetlight = streetlight;
  Assets.sizes.streetlight = [8, 11]; // real-world height, meters
})();
