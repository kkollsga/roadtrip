/* Roadtrip animated asset — oldFaithful.
   Standalone module; tools/build.js concatenates assets/animated/*.js
   into js/gen/animated.js, loaded after the SVG asset registry. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const { rr } = Assets;

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
  Assets.oldFaithful = oldFaithful;
})();
