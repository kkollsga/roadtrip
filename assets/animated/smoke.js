/* Roadtrip animated overlay — cabin chimney smoke on cold evenings.
   The cabin body is a static SVG (assets/structures/cabin.svg); this
   module wraps its draw to puff smoke whenever the windows glow. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const base = Assets.cabin;
  Assets.cabin = function (ctx, x, y, s, c, v, time) {
    base(ctx, x, y, s, c, v, time);
    const ga = c.glowA;
    if (!(ga > 0.1) || time === undefined) return;
    const w = s * (0.8 + (v * 11 % 1) * 0.4); // same chimney x as the body
    ctx.fillStyle = `rgba(192,197,208,${0.22 * ga})`;
    for (let i = 0; i < 3; i++) {
      const px = x + w * 0.26 + s * 0.05
        + Math.sin(time * 0.5 + i * 1.7 + v * 9) * s * 0.035 + i * s * 0.045;
      const py = y - s * 0.45 - s * 0.56 - i * s * 0.11;
      ctx.beginPath();
      ctx.arc(px, py, s * (0.035 + i * 0.013), 0, TAU);
      ctx.fill();
    }
  };
})();
