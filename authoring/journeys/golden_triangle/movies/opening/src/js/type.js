/* Type set as outlines (js/glyphs.js), so that it moves under the camera as smoothly as the map does.
   A run is laid out left to right from advance widths, pair kerning and tracking; the baseline is y = 0. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg", FACES = window.GT_GLYPHS;

  /* x of each glyph (px) and the width of the run without tracking after the last glyph */
  function layout(key, text, size, tracking) {
    const f = FACES[key], s = size / f.upm, chars = [...text], xs = [];
    let x = 0;
    chars.forEach((ch, i) => {
      const g = f.glyphs[ch];
      if (!g) throw new Error(`no outline for "${ch}" in ${key}: add it in tools/make_glyphs.py`);
      xs.push(x);
      x += g.adv * s + (i < chars.length - 1 ? tracking + (f.kern[ch + chars[i + 1]] || 0) * s : 0);
    });
    return { xs, width: x, s };
  }

  /* make(parent, face, text, size, { tracking, anchor: "start" | "middle" | "end", fill, halo: { color, width } })
     -> { g, glyphs: [path], halos: [path], width, setTracking(px) }   (place the run with g's transform) */
  function make(parent, key, text, size, o = {}) {
    const f = FACES[key], chars = [...text], anchor = o.anchor || "start";
    const g = document.createElementNS(NS, "g");
    const item = { g, glyphs: [], halos: [], width: 0 };
    const add = (attrs) => chars.map(ch => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", f.glyphs[ch].d); for (const k in attrs) p.setAttribute(k, attrs[k]); g.appendChild(p); return p; });
    if (o.halo) item.halos = add({ fill: "none", stroke: o.halo.color, "stroke-width": o.halo.width / (size / f.upm), "stroke-linejoin": "round" });   // all halos under all glyphs
    item.glyphs = add({ fill: o.fill || "#000" });
    item.setTracking = tracking => {
      const L = layout(key, text, size, tracking), x0 = anchor === "middle" ? -L.width / 2 : anchor === "end" ? -L.width : 0;
      L.xs.forEach((x, i) => { const t = `translate(${x0 + x} 0) scale(${L.s} ${-L.s})`; item.glyphs[i].setAttribute("transform", t); if (item.halos[i]) item.halos[i].setAttribute("transform", t); });
      item.width = L.width;
    };
    item.setTracking(o.tracking || 0);
    if (parent) parent.appendChild(g);
    return item;
  }

  window.GT.type = { make, layout, face: key => FACES[key] };
})();
