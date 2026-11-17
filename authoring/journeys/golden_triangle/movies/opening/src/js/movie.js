/* Builds the stage once, then window.renderAt(seconds) sets every element from the time alone.
   No CSS animation, no timers, no random numbers, no network: the same t always gives the same picture. */
(function () {
  "use strict";
  const GT = window.GT, { W, H, FPS, SCHED, CITY, ORDER, LEGS, proj, clamp, lerp, span, outCubic, outBack, ioSine } = GT;
  const NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const html = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
  const $ = id => document.getElementById(id);

  const TYPE = GT.type;
  const LABEL_BASELINE = 0.4325 * 26;      // city names are placed by their vertical centre: (ascent - descent) / 2 below it lies the baseline
  const COL = {
    paper: "#F3E8D0", paperLight: "#F8EFDB", grid: "#CDB487", degree: "#A8936C", ink: "#3B2F2A", softInk: "#6B5A4A",
    goldDeep: "#9C7420", gold: "#D3A537", goldLight: "#F4DC96", glow: "#FFF7DA", washIn: "#F6E3B0", washOut: "#EBCB85", goldText: "#7A5A1C",
  };

  /* ---------- layer 1: the map ---------- */
  const world = $("world"), world2 = $("world2"), black = $("black");
  const map = $("map");
  const C3 = { x: GT.CENTROID[0], y: GT.CENTROID[1] };                             // the middle of the triangle
  const PERIMETER = LEGS[0].len + LEGS[1].len + LEGS[2].len;
  const TRI = `M${CITY.delhi.x} ${CITY.delhi.y} L${CITY.agra.x} ${CITY.agra.y} L${CITY.jaipur.x} ${CITY.jaipur.y} Z`;
  const FAR = Math.max(LEGS[0].len, LEGS[2].len);                                  // from Delhi to the farthest corner
  svg("defs", {}, map).innerHTML = `
    <radialGradient id="hole"><stop offset="0" stop-color="#000"/><stop offset=".62" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <mask id="gridmask" maskUnits="userSpaceOnUse" x="-720" y="-1280" width="2160" height="3840"><rect x="-720" y="-1280" width="2160" height="3840" fill="#fff"/><ellipse id="gridhole" cx="360" cy="930" rx="560" ry="200" fill="url(#hole)"/></mask>
    <radialGradient id="tipglow"><stop offset="0" stop-color="${COL.glow}"/><stop offset=".35" stop-color="${COL.goldLight}" stop-opacity=".9"/><stop offset="1" stop-color="${COL.goldLight}" stop-opacity="0"/></radialGradient>
    <radialGradient id="washfill" gradientUnits="userSpaceOnUse" cx="${C3.x}" cy="${C3.y}" r="250"><stop offset="0" stop-color="${COL.washIn}"/><stop offset="1" stop-color="${COL.washOut}"/></radialGradient>
    <radialGradient id="bloomgrad"><stop offset="0" stop-color="#fff"/><stop offset=".76" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="bloom" maskUnits="userSpaceOnUse" x="0" y="0" width="720" height="1280"><circle id="bloomc" cx="${CITY.delhi.x}" cy="${CITY.delhi.y}" r="0" fill="url(#bloomgrad)"/></mask>
    <linearGradient id="foldv" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".46" stop-color="#fff" stop-opacity=".34"/><stop offset=".5" stop-color="#6b4a1c" stop-opacity=".30"/><stop offset=".58" stop-color="#6b4a1c" stop-opacity=".07"/><stop offset="1" stop-color="#6b4a1c" stop-opacity="0"/></linearGradient>
    <linearGradient id="foldh" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".46" stop-color="#fff" stop-opacity=".34"/><stop offset=".5" stop-color="#6b4a1c" stop-opacity=".30"/><stop offset=".58" stop-color="#6b4a1c" stop-opacity=".07"/><stop offset="1" stop-color="#6b4a1c" stop-opacity="0"/></linearGradient>`;
  const sheet = svg("g", {}, map);                                                 // what the title clears away behind it: folds and grid
  // the folds of the sheet (it was folded in three, and once down the middle)
  for (const y of [427, 853]) svg("rect", { x: -720, y: y - 7, width: 2160, height: 14, fill: "url(#foldh)" }, sheet);
  svg("rect", { x: 353, y: -1280, width: 14, height: 3840, fill: "url(#foldv)" }, sheet);
  // grid: a line every half degree; nothing else is drawn (no borders, coasts, roads or tiles)
  const gridHalf = svg("g", { fill: "none", stroke: COL.grid, "stroke-opacity": 0.5 }, sheet);
  const gridWhole = svg("g", { fill: "none", stroke: COL.grid, "stroke-opacity": 0.8 }, sheet);
  for (let i = 44; i <= 66; i++) { const lat = i / 2, y = proj(lat, 0)[1]; svg("line", { x1: -720, x2: 1440, y1: y, y2: y }, i % 2 ? gridHalf : gridWhole); }
  for (let i = 140; i <= 168; i++) { const lon = i / 2, x = proj(0, lon)[0]; svg("line", { y1: -1280, y2: 2560, x1: x, x2: x }, i % 2 ? gridHalf : gridWhole); }
  const gridHole = $("gridhole");

  // map furniture: the sheet's name, north, and a scale (true to the projection)
  const legend = svg("g", { fill: "none", stroke: COL.softInk, "stroke-linecap": "round", "stroke-linejoin": "round" }, map);
  { const g = svg("g", { transform: "translate(30 46)" }, legend);
    svg("rect", { x: 0, y: 0, width: 172, height: 68, fill: COL.paperLight, "fill-opacity": 0.9, "stroke-width": 1.2 }, g);
    svg("rect", { x: 3.6, y: 3.6, width: 164.8, height: 60.8, "stroke-width": 0.5 }, g);
    TYPE.make(g, "serif700", "北インド", 21, { tracking: 0.16 * 21, anchor: "middle", fill: COL.ink }).g.setAttribute("transform", "translate(87.7 33)");
    TYPE.make(g, "sans700", "NORTH INDIA", 8.6, { tracking: 0.3 * 8.6, anchor: "middle", fill: COL.softInk }).g.setAttribute("transform", "translate(87.3 53)");
    for (const t of g.querySelectorAll("g")) t.setAttribute("stroke", "none"); }
  { const g = svg("g", { transform: "translate(60 190)", "stroke-width": 1.3 }, legend);
    svg("path", { d: "M0 24 L0 -22 M-6.5 -11.5 L0 -24 L6.5 -11.5" }, g);
    TYPE.make(g, "sans700", "N", 11.5, { anchor: "middle", fill: COL.softInk }).g.setAttribute("transform", "translate(0 41)"); g.lastChild.setAttribute("stroke", "none"); }
  { const L = 100 * GT.PX_PER_KM, g = svg("g", { transform: "translate(64 1232)", "stroke-width": 1 }, legend);
    svg("rect", { x: 0, y: 0, width: L / 2, height: 5, fill: COL.softInk }, g);
    svg("rect", { x: L / 2, y: 0, width: L / 2, height: 5 }, g);
    for (const [x, text] of [[0, "0"], [L / 2, "50"], [L, "100 km"]]) { const t = TYPE.make(g, "sans500", text, 10.5, { tracking: 0.3, anchor: "middle", fill: COL.softInk }).g; t.setAttribute("transform", `translate(${x + (text.length > 3 ? 9 : 0)} -6)`); t.setAttribute("stroke", "none"); } }

  // the route as it was planned: a pencilled, dashed triangle that the gold line then follows
  const planEls = LEGS.map(L => svg("line", { x1: L.A.x, y1: L.A.y, x2: L.A.x, y2: L.A.y, stroke: COL.softInk, "stroke-opacity": 0.5, "stroke-dasharray": "5.5 4.5", fill: "none" }, map));
  // the triangle: gold fill (it spreads from Delhi when the triangle closes), three gold legs
  const wash = svg("path", { d: TRI, fill: "url(#washfill)", stroke: "none", opacity: 0, mask: "url(#bloom)" }, map);
  const bloomC = $("bloomc");
  const halo = svg("path", { d: TRI, stroke: COL.goldLight, "stroke-linejoin": "round", fill: "none", visibility: "hidden" }, map);   // the close: a soft light round the three sides
  const legEls = LEGS.map(L => {
    const d = `M${L.A.x} ${L.A.y} L${L.B.x} ${L.B.y}`, dash = `${L.len} ${L.len + 40}`;
    return [
      svg("path", { d, stroke: COL.goldDeep, "stroke-linecap": "round", fill: "none", "stroke-dasharray": dash }, map),
      svg("path", { d, stroke: COL.gold, "stroke-linecap": "round", fill: "none", "stroke-dasharray": dash }, map),
    ];
  });
  const flash = svg("path", { d: TRI, stroke: COL.glow, "stroke-linejoin": "round", fill: "none", visibility: "hidden" }, map);       // the close: a hot core along the three sides
  const glint = svg("path", { d: TRI, stroke: COL.glow, "stroke-linecap": "round", fill: "none", "stroke-dasharray": `${PERIMETER * 0.06} ${PERIMETER * 2}`, visibility: "hidden" }, map);
  // on every beat a ring leaves the end of the line, where it is at that moment
  const rings = SCHED.rings.map(tb => {
    const at = GT.lineEndAt(tb + 1e-4);
    return { tb, el: svg("circle", { cx: at[0], cy: at[1], r: 8, fill: "none", stroke: COL.gold, "stroke-width": 1.6 }, map) };
  });
  const tip = svg("circle", { r: 15, fill: "url(#tipglow)" }, map);
  // the distance of each leg, written beside it once the line is half-way along
  const kmEls = LEGS.map((L, i) => {
    const mx = (L.A.x + L.B.x) / 2, my = (L.A.y + L.B.y) / 2;
    let nx = -(L.B.y - L.A.y) / L.len, ny = (L.B.x - L.A.x) / L.len;                // a normal; turned to point away from the middle of the triangle
    if ((mx + nx - C3.x) ** 2 + (my + ny - C3.y) ** 2 < (mx - C3.x) ** 2 + (my - C3.y) ** 2) { nx = -nx; ny = -ny; }
    let a = Math.atan2(L.B.y - L.A.y, L.B.x - L.A.x) * 180 / Math.PI; if (a > 90) a -= 180; if (a < -90) a += 180;   // never upside down
    const below = ny > 0.5 ? 9 : 0;                                                // text under a line needs room for its own height
    const item = TYPE.make(map, "sans500", `${Math.round(L.km)} km`, 10.5, { tracking: 0.35, anchor: "middle", fill: COL.softInk, halo: { color: COL.paper, width: 3 } });
    item.g.setAttribute("transform", `translate(${mx + nx * (11 + below)} ${my + ny * (11 + below)}) rotate(${a}) translate(0 3.6)`);
    return item.g;
  });
  // city marks and names
  const dots = {}, labels = {}, cornerRings = {};
  for (const k of ORDER) {
    const c = CITY[k], g = svg("g", {}, map);
    cornerRings[k] = svg("circle", { cx: c.x, cy: c.y, r: 10, fill: "none", stroke: COL.gold, "stroke-width": 2.2, visibility: "hidden" }, g);
    const pulse = svg("circle", { cx: c.x, cy: c.y, r: 12, fill: "none", stroke: COL.gold, "stroke-width": 2 }, g);
    const body = svg("g", {}, g);
    svg("circle", { cx: c.x, cy: c.y, r: 8.5, fill: COL.paperLight, stroke: COL.ink, "stroke-width": 2.4 }, body);
    const core = svg("circle", { cx: c.x, cy: c.y, r: 3.7, fill: COL.ink }, body);
    dots[k] = { body, pulse, core };
  }
  for (const k of ORDER) {                                                         // left edge and vertical centre given from the dot
    const c = CITY[k];
    labels[k] = TYPE.make(map, "serif700", c.ja, 26, { tracking: 0.02 * 26, fill: COL.ink, halo: { color: COL.paper, width: 5 } }).g;
    labels[k].setAttribute("transform", `translate(${c.x + c.label[0]} ${c.y + c.label[1] + LABEL_BASELINE})`);
  }

  /* ---------- layer 2: degree numbers on the frame edges ---------- */
  const degrees = $("degrees"), degreeEls = [];
  const degText = (text, anchor) => TYPE.make(degrees, "sans500", text, 15, { tracking: 0.04 * 15, anchor, fill: COL.degree }).g;
  for (let lat = 22; lat <= 33; lat++) degreeEls.push({ el: degText(`${lat}°N`, "start"), lat, wy: proj(lat, 0)[1] });
  for (let lon = 71; lon <= 83; lon++) degreeEls.push({ el: degText(`${lon}°E`, "middle"), lon, wx: proj(0, lon)[0] });

  /* ---------- layer 3: prints and stamps ---------- */
  const prints = GT.PRINTS.map(p => {
    const el = html("div", "print" + (p.hero ? " hero" : ""), $("prints")); el.style.zIndex = p.z; el.style.width = p.w + "px"; el.style.height = p.h + "px";
    const img = html("img", "", el); img.decoding = "sync"; img.alt = ""; img.src = `photos/${p.f}.jpg`;
    const line = html("u", "", el);
    for (const e of [img, line]) { e.style.left = p.b + "px"; e.style.top = p.b + "px"; e.style.width = p.iw + "px"; e.style.height = p.ih + "px"; }
    const tapes = p.tape.map(tp => {
      const b = html("b", "", el), tw = tp.w * p.w, th = tp.h * p.w;
      b.style.width = tw + "px"; b.style.height = th + "px"; b.style.left = (tp.at[0] * p.w - tw / 2) + "px"; b.style.top = (tp.at[1] * p.h - th / 2) + "px";
      return { tp, b };
    });
    let caption = null;
    if (p.caption) {                                                               // handwriting on the lower margin
      const s = svg("svg", { xmlns: NS }, el), size = p.w * 0.066;
      caption = TYPE.make(s, "klee600", p.caption.text, size, { tracking: 0.05 * size, anchor: p.caption.align === "right" ? "end" : "start", fill: COL.ink });
      caption.g.setAttribute("transform", `translate(${p.caption.align === "right" ? p.w - p.b - size * 0.5 : p.b + size * 0.5} ${p.b + p.ih + p.foot * 0.5 + size * 0.34}) rotate(${p.caption.align === "right" ? 1.2 : -1.2})`);
    }
    return { p, el, img, tapes, caption };
  });
  const stamps = {}, stampShadows = {};

  /* ---------- layer 4: the title (screen space: it lands when the camera is back on the whole sheet) ---------- */
  const title = $("title");
  const TITLE = { brandY: 857, brandSize: 60, subY: 897, subSize: 21, ruleY: 919, countryY: 968, countrySize: 27, journeyY: 1031, journeySize: 47, journeyPivot: 1014 };
  const T = {
    brand: TYPE.make(title, "gelasio500", "Dreamscape", TITLE.brandSize, { tracking: 0.02 * TITLE.brandSize, anchor: "middle", fill: COL.ink }),
    sub: TYPE.make(title, "sans500", "旅の余白", TITLE.subSize, { tracking: 0.62 * TITLE.subSize, anchor: "middle", fill: COL.goldText }),
    rule: svg("rect", { y: TITLE.ruleY, height: 2.4, fill: COL.gold }, title), ruleLine: svg("rect", { y: TITLE.ruleY + 2.4, height: 0.9, fill: COL.goldDeep }, title),
    country: TYPE.make(title, "serif700", "インド", TITLE.countrySize, { anchor: "middle", fill: COL.ink }),
    journey: TYPE.make(title, "serif700", "ゴールデントライアングル編", TITLE.journeySize, { anchor: "middle", fill: COL.ink }),
  };
  T.sub.g.setAttribute("transform", `translate(360 ${TITLE.subY})`);

  /* ---------- every frame is a function of t ---------- */
  function renderAt(t) {
    const s = SCHED, cam = GT.camera(t);
    world.style.transform = world2.style.transform = `translate(${W / 2 + cam.shx}px, ${H / 2 + cam.shy}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`;
    // lines keep a quiet weight when the camera is close: grid and pencil grow with the square root of the zoom, the gold line a little less
    const thin = 1 / Math.sqrt(cam.z), lineW = 6.4 / Math.pow(cam.z, 0.72), markS = Math.pow(cam.z, -0.32);
    gridWhole.setAttribute("stroke-width", 1.1 * thin); gridHalf.setAttribute("stroke-width", 0.6 * thin);

    // the pencilled route
    const plan = GT.planProgress(t);
    planEls.forEach((el, i) => {
      const L = LEGS[i]; el.setAttribute("visibility", plan[i] > 0 ? "visible" : "hidden");
      el.setAttribute("x2", lerp(L.A.x, L.B.x, plan[i])); el.setAttribute("y2", lerp(L.A.y, L.B.y, plan[i])); el.setAttribute("stroke-width", 1.35 * thin);
    });

    // city marks pop in, names follow
    const cl = GT.closeState(t);
    for (const k of ORDER) {
      const c = CITY[k], u = span(t, s.dots[k], s.dots[k] + 0.2), sc = (u <= 0 ? 0 : outBack(u)) * markS;
      dots[k].body.setAttribute("transform", `translate(${c.x} ${c.y}) scale(${sc}) translate(${-c.x} ${-c.y})`);
      labels[k].setAttribute("opacity", span(t, s.dots[k] + 0.04, s.dots[k] + 0.2));
      // visited: gold centre and one ring (Delhi, where the journey starts, is gold from the first second)
      const d = t - s.visited[k];
      dots[k].core.setAttribute("fill", d >= 0 ? COL.gold : COL.ink);
      const pu = clamp(d / 0.4), on = d >= 0 && pu < 1;
      dots[k].pulse.setAttribute("r", (12 + 18 * outCubic(pu)) * markS); dots[k].pulse.setAttribute("stroke-opacity", on ? 0.9 * (1 - pu) : 0); dots[k].pulse.setAttribute("stroke-width", 2 * markS);
      // the close: a ring leaves every corner
      const cr = cornerRings[k], ron = cl.ring >= 0 && cl.ring < 1;
      cr.setAttribute("visibility", ron ? "visible" : "hidden");
      if (ron) { cr.setAttribute("r", 10 + (k === "delhi" ? 44 : 30) * outCubic(cl.ring)); cr.setAttribute("stroke-opacity", 0.95 * (1 - cl.ring)); }
    }

    // the gold line
    const pr = GT.legProgress(t);
    legEls.forEach((parts, i) => {
      const off = LEGS[i].len * (1 - pr[i]);
      const swell = 1 + 0.9 * cl.flash;                                           // the close: the gold swells for a moment
      parts[0].setAttribute("stroke-width", lineW * swell + 1.5 * thin * thin); parts[1].setAttribute("stroke-width", lineW * swell);
      for (const p of parts) { p.setAttribute("stroke-dashoffset", off); p.setAttribute("visibility", pr[i] > 0 ? "visible" : "hidden"); }
      kmEls[i].setAttribute("opacity", span(pr[i], 0.5, 0.62));
    });
    const tp = GT.tipAt(t);
    tip.setAttribute("visibility", tp ? "visible" : "hidden");
    if (tp) { tip.setAttribute("cx", tp[0]); tip.setAttribute("cy", tp[1]); tip.setAttribute("r", 17 * thin); }
    for (const rg of rings) {
      const u = (t - rg.tb) / GT.BEAT, on = u >= 0 && u < 1;
      rg.el.setAttribute("visibility", on ? "visible" : "hidden");
      if (on) { rg.el.setAttribute("r", (8 + 22 * outCubic(u)) * thin); rg.el.setAttribute("stroke-opacity", 0.8 * (1 - u)); rg.el.setAttribute("stroke-width", 1.6 * thin); }
    }

    // the close: all three sides flash, gold spreads from Delhi; later one glint runs round
    for (const e of [flash, halo]) e.setAttribute("visibility", cl.flash > 0.01 ? "visible" : "hidden");
    if (cl.flash > 0.01) {
      halo.setAttribute("stroke-width", lineW * (1 + 3.4 * cl.flash)); halo.setAttribute("stroke-opacity", 0.6 * cl.flash);
      flash.setAttribute("stroke-width", lineW * (0.45 + 0.5 * cl.flash)); flash.setAttribute("stroke-opacity", Math.min(1, cl.flash * 1.2));
    }
    wash.setAttribute("opacity", cl.bloom > 0 ? 0.96 : 0);
    if (cl.bloom > 0 && cl.bloom < 1) { wash.setAttribute("mask", "url(#bloom)"); bloomC.setAttribute("r", cl.bloom * FAR / 0.74); } else wash.setAttribute("mask", "none");
    const gu = span(t, s.glint[0], s.glint[1]);
    if (gu > 0 && gu < 1) { glint.setAttribute("visibility", "visible"); glint.setAttribute("stroke-width", lineW * 0.55); glint.setAttribute("stroke-dashoffset", -PERIMETER * 0.94 * ioSine(gu)); glint.setAttribute("stroke-opacity", Math.sin(Math.PI * gu)); }
    else glint.setAttribute("visibility", "hidden");
    const ts = GT.titleState(t);
    sheet.setAttribute("mask", ts.plate > 0 ? "url(#gridmask)" : "none"); gridHole.setAttribute("opacity", ts.plate);

    // degree numbers: whole degrees as they come into view; one that a print lies on is not drawn (it would peep out from under it)
    const poses = prints.map(pr => GT.printPose(pr.p, t));
    const covered = [];
    poses.forEach((q, i) => {                                                      // screen boxes of the prints, a little generous
      if (q.opacity <= 0.5) return;
      const p = prints[i].p, a = q.r * Math.PI / 180, hw = (Math.abs(Math.cos(a)) * p.w + Math.abs(Math.sin(a)) * p.h) / 2 * q.sc, hh = (Math.abs(Math.sin(a)) * p.w + Math.abs(Math.cos(a)) * p.h) / 2 * q.sc;
      const [cx, cy] = GT.w2s(cam, q.x, q.y); covered.push([cx - hw * cam.z - 6, cy - hh * cam.z - 6, cx + hw * cam.z + 6, cy + hh * cam.z + 6]);
    });
    const hidden = (x0, y0, x1, y1) => covered.some(b => x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]);
    for (const e of degreeEls) {
      let x, y, a;
      if (e.lat !== undefined) { const ly = H / 2 + cam.shy + (e.wy - cam.y) * cam.z; x = 12; y = ly - 7; a = ly > 150 && ly < 1240 && !hidden(10, y - 13, 52, y + 2) ? (ly > 760 && ly < 1100 ? 1 - ts.plate : 1) : 0; }
      else { x = W / 2 + cam.shx + (e.wx - cam.x) * cam.z; y = 1262; a = x > 40 && x < 680 && !hidden(x - 20, y - 13, x + 20, y + 2) ? 1 : 0; }
      e.el.setAttribute("visibility", a > 0 ? "visible" : "hidden");
      if (a > 0) { e.el.setAttribute("transform", `translate(${x} ${y})`); e.el.setAttribute("opacity", a); }
    }

    // prints: pasted on the eighth notes; when the line leaves, the page is gathered up and only the hero print stays
    prints.forEach(({ p, el, tapes, caption }, i) => {
      const q = poses[i];
      el.style.opacity = q.opacity;
      if (q.opacity <= 0) { el.style.visibility = "hidden"; return; }
      el.style.visibility = "visible";
      el.style.transform = `translate(${q.x}px, ${q.y}px) rotate(${q.r}deg) scale(${q.sc}) translate(${-p.w / 2}px, ${-p.h / 2}px)`;
      el.style.boxShadow = `${0.5 + 3.4 * q.lift}px ${1.1 + 6.6 * q.lift}px ${2.2 + 9 * q.lift}px rgba(59,47,42,${0.36 - 0.16 * q.lift}), 0 0 0.6px rgba(59,47,42,0.35)`;   // lifted -> stuck
      for (const { tp, b } of tapes) { b.style.opacity = q.tape; b.style.transform = `rotate(${tp.r}deg) scale(${1 + 0.3 * (1 - q.tape)})`; }
      if (caption) { const c = GT.captionState(p, t), n = caption.glyphs.length; caption.glyphs.forEach((g, j) => g.setAttribute("opacity", clamp(c.written * n - j))); }
    });

    // stamps: the hand stamp's shadow comes down, the ink is there on the bar line
    for (const k of ORDER) {
      const q = GT.stampPose(k, t), el = stamps[k], sh = stampShadows[k];
      el.style.opacity = q.opacity; el.style.visibility = q.opacity > 0 ? "visible" : "hidden";
      if (q.opacity > 0) el.style.transform = `translate(${q.x}px, ${q.y}px) rotate(${q.r}deg) scale(${q.size / 100 * q.sc}) translate(-50px, -50px)`;
      sh.style.visibility = q.shadow ? "visible" : "hidden";
      if (q.shadow) { sh.style.opacity = q.shadow.opacity; sh.style.transform = `translate(${q.x + q.shadow.dx}px, ${q.y + q.shadow.dy}px) scale(${q.size / 100 * q.shadow.sc}) translate(-50px, -50px)`; }
    }

    // title: the journey's name lands on the bar line, the rest follows
    const J = ts.journey;
    T.journey.g.setAttribute("opacity", J.opacity); T.journey.setTracking(J.tracking * TITLE.journeySize);
    T.journey.g.setAttribute("transform", `translate(360 ${TITLE.journeyPivot}) scale(${J.scale}) translate(0 ${TITLE.journeyY - TITLE.journeyPivot})`);
    T.country.g.setAttribute("opacity", ts.country.opacity); T.country.setTracking(ts.country.tracking * TITLE.countrySize);
    T.country.g.setAttribute("transform", `translate(360 ${TITLE.countryY})`);
    for (const r of [T.rule, T.ruleLine]) { r.setAttribute("x", 360 - 80 * ts.rule); r.setAttribute("width", 160 * ts.rule); r.setAttribute("opacity", ts.rule > 0 ? 1 : 0); }
    T.brand.g.setAttribute("opacity", ts.brand.opacity); T.brand.g.setAttribute("transform", `translate(360 ${TITLE.brandY + ts.brand.dy})`);
    T.sub.g.setAttribute("opacity", ts.sub);

    black.style.opacity = GT.blackAt(t);
    GT.now = t;
  }

  /* ---------- wait for fonts and pictures, draw the paper and the stamps, then show the first frame ---------- */
  const FACES = [                          // only the stamps are drawn with the font files; all other type is outlines
    ['700 26px "Noto Serif JP"', "デリーアーグラジャイプール"],
    ['700 12px "Noto Sans JP"', "DELHIAGRAJAIPURINDIA"],
  ];
  const q = new URLSearchParams(location.search);
  if (q.get("guide")) document.body.classList.add("guide");
  GT.ready = (async () => {
    const loaded = await Promise.all(FACES.map(([font, text]) => document.fonts.load(font, text)));
    loaded.forEach((faces, i) => { if (!faces.length) throw new Error("font not loaded: " + FACES[i][0]); });
    await document.fonts.ready;
    await Promise.all(prints.map(({ img }) => img.decode()));
    const paper = GT.drawPaper(); paper.id = "paper"; world.insertBefore(paper, map);
    for (const k of ORDER) {
      const cv = GT.drawStamp(k); cv.className = "stamp"; $("stamps").appendChild(cv); stamps[k] = cv;
      stampShadows[k] = html("i", "stampshadow", $("stamps"));
    }
    renderAt(parseFloat(q.get("t") || "0"));
    window.GT_READY = true;
  })();
  GT.ready.catch(e => { window.GT_ERROR = String(e && e.message || e); console.error(e); });

  /* a fingerprint of everything renderAt has set: when it is the same as for the frame before, the picture is the same */
  GT.signature = () => { const str = $("stage").innerHTML; let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16) + ":" + str.length; };

  window.renderAt = renderAt;
})();
