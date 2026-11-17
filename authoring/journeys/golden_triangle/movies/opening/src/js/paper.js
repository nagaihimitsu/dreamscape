/* The map paper: a cream sheet with soft, slow mottling, drawn once into a canvas when the page loads.
   It is made here from fixed-seed noise (no picture file, nobody else's work): the same sheet every time.
   The texture is kept broad and soft on purpose: fine grain would shimmer under the camera and cost the
   video a great many bits. */
(function () {
  "use strict";
  const GT = window.GT;
  const AREA = { x: -140, y: -260, w: 1000, h: 1700 };   // world px the canvas covers (the camera never sees past it)
  const RES = 0.5;                                       // canvas pixels per world px

  function noiseField(seed) {
    const hash = (x, y) => { let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    const s = u => u * u * u * (u * (u * 6 - 15) + 10);
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = s(x - xi), v = s(y - yi);
      const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  }

  function drawPaper() {
    const cw = Math.round(AREA.w * RES), ch = Math.round(AREA.h * RES);
    const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(cw, ch), d = img.data;
    const wide = noiseField(5), mid = noiseField(17), small = noiseField(29), warm = noiseField(41);
    const BASE = [243, 232, 208];                        // #F3E8D0
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const wx = AREA.x + x / RES, wy = AREA.y + y / RES;
      const n = 0.50 * wide(wx / 300, wy / 300) + 0.32 * mid(wx / 110, wy / 110) + 0.18 * small(wx / 38, wy / 38);   // 0..1, mostly slow
      const shade = (n - 0.5) * 0.085;                   // about +-3% in lightness
      const tone = (warm(wx / 220 + 9, wy / 220 + 3) - 0.5) * 0.05;   // some patches a little warmer (older) than others
      const i = (y * cw + x) * 4;
      d[i] = Math.round(BASE[0] * (1 + shade + tone * 0.2));
      d[i + 1] = Math.round(BASE[1] * (1 + shade - tone * 0.1));
      d[i + 2] = Math.round(BASE[2] * (1 + shade * 1.5 - tone));
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    cv.style.left = AREA.x + "px"; cv.style.top = AREA.y + "px"; cv.style.width = AREA.w + "px"; cv.style.height = AREA.h + "px";
    return cv;
  }

  GT.drawPaper = drawPaper;
  GT.PAPER_AREA = AREA;
})();
