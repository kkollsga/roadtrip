/* Roadtrip animated asset — turbine.
   Standalone module; tools/build.js concatenates assets/animated/*.js
   into js/gen/animated.js, loaded after the SVG asset registry. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const { rr } = Assets;

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
  Assets.turbine = turbine;
  Assets.sizes.turbine = [110, 150]; // real-world height, meters
})();
