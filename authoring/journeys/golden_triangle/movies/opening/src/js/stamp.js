/* The souvenir stamp: one round design in three inks, drawn once into a canvas when the page loads, so the worn
   ink cannot shimmer while the camera moves. It is an invented mark: no date, no post-office name.
   The drawing is a 100-unit box centred on (0, 0). The wear uses a fixed-seed noise: the same picture every time. */
(function () {
  "use strict";
  const GT = window.GT;
  const PX = 640;                                        // canvas size: the stamp is 229 px across at most on screen

  /* text set along a circle: `outward` letters stand on the circle with their heads away from the centre (top arc),
     otherwise they stand inside the circle with their heads to the centre (bottom arc, reading left to right) */
  function arcText(ctx, text, radius, tracking, outward) {
    const widths = [...text].map(ch => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
    let run = -total / 2;
    [...text].forEach((ch, i) => {
      const a = (run + widths[i] / 2) / radius; run += widths[i] + tracking;
      ctx.save();
      if (outward) { ctx.translate(radius * Math.sin(a), -radius * Math.cos(a)); ctx.rotate(a); }
      else { ctx.translate(radius * Math.sin(a), radius * Math.cos(a)); ctx.rotate(-a); }
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
  }

  /* fixed-seed value noise, 0..1 */
  function noiseField(seed) {
    const hash = (x, y) => { let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    const smooth = u => u * u * (3 - 2 * u);
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
      const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  }

  function drawStamp(key) {
    const c = GT.CITY[key], cv = document.createElement("canvas"); cv.width = cv.height = PX;
    const ctx = cv.getContext("2d"), k = PX / 100;
    ctx.setTransform(k, 0, 0, k, PX / 2, PX / 2);
    ctx.strokeStyle = ctx.fillStyle = c.ink; ctx.lineJoin = "round"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    // two rings
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 46.5, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 41.5, 0, Math.PI * 2); ctx.stroke();
    // the city in capitals over the top, INDIA along the bottom
    ctx.font = '700 10.5px "Noto Sans JP"'; arcText(ctx, c.en, 32.5, 3.4, true);
    ctx.font = '700 7.4px "Noto Sans JP"'; arcText(ctx, "INDIA", 38.6, 3.0, false);
    // the band with the city in katakana
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-39.8, -11.5); ctx.lineTo(39.8, -11.5); ctx.moveTo(-39.8, 11.5); ctx.lineTo(39.8, 11.5); ctx.stroke();
    const kana = { delhi: [17.5, 6.2], agra: [15.5, 5.6], jaipur: [12.6, 4.6] }[key];
    ctx.font = `700 ${kana[0]}px "Noto Serif JP"`; ctx.fillText(c.ja, 0, kana[1]);
    // the triangle in miniature, true shape, with this city's corner marked
    const cx = (GT.CITY.delhi.x + GT.CITY.agra.x + GT.CITY.jaipur.x) / 3, cy = (GT.CITY.delhi.y + GT.CITY.agra.y + GT.CITY.jaipur.y) / 3;
    const s = 13 / (GT.CITY.agra.x - GT.CITY.jaipur.x), pt = n => [(GT.CITY[n].x - cx) * s, (GT.CITY[n].y - cy) * s + 21.5];
    ctx.lineWidth = 1.1; ctx.beginPath(); GT.ORDER.forEach((n, i) => { const [x, y] = pt(n); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke();
    const [mx, my] = pt(key); ctx.beginPath(); ctx.arc(mx, my, 2.2, 0, Math.PI * 2); ctx.fill();

    // wear: fine speckle where the ink did not take, and one side pressed a little lighter
    const img = ctx.getImageData(0, 0, PX, PX), d = img.data;
    const seed = { delhi: 11, agra: 23, jaipur: 37 }[key], fine = noiseField(seed), mid = noiseField(seed + 101), wide = noiseField(seed + 202);
    const tilt = { delhi: [0.8, 0.6], agra: [-0.7, 0.7], jaipur: [0.6, -0.8] }[key];      // the lighter side
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
      const i = (y * PX + x) * 4; if (d[i + 3] === 0) continue;
      const ux = x / k, uy = y / k;                                                       // stamp units, 0..100
      const n = 0.62 * fine(ux * 1.15, uy * 1.15) + 0.38 * mid(ux * 0.42, uy * 0.42);
      const press = 0.5 + 0.5 * (((ux - 50) * tilt[0] + (uy - 50) * tilt[1]) / 50);       // 0..1 across the stamp
      const patch = wide(ux * 0.07, uy * 0.07);
      const thin = 0.10 * press + 0.16 * Math.max(0, patch - 0.45);                       // where the ink is thinner
      // the name in the band must stay whole (a dropout once cut the long-vowel mark of アーグラ in two): there the wear only
      // lightens the ink a little; the full wear returns smoothly over the two rules
      const band = 1 - GT.clamp((Math.abs(uy - 50) - 11) / 5);                            // 1 inside the band, 0 well outside it
      const drop = GT.clamp((0.80 - thin - n) * 7 + 0.5);                                 // dropouts
      const a = drop + (1 - drop) * band * 0.86;
      d[i + 3] = Math.round(d[i + 3] * a * (1 - 0.35 * thin));
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  window.GT.drawStamp = drawStamp;
})();
