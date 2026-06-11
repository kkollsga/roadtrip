/* Roadtrip animated asset — lighthouse.
   Standalone module; tools/build.js concatenates assets/animated/*.js
   into js/gen/animated.js, loaded after the SVG asset registry. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const { rr } = Assets;

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
  Assets.lighthouse = lighthouse;
  Assets.sizes.lighthouse = [20, 35]; // real-world height, meters
})();
