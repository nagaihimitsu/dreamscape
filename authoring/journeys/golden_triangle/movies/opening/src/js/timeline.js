/* Dreamscape India opening (prototype 2): time grid, map projection, camera and poses.
   Everything here is plain arithmetic on the time t (seconds): no DOM, no timers, no random numbers. */
(function () {
  "use strict";

  /* ---------- frame and time grid ---------- */
  const W = 720, H = 1280, FPS = 30, FRAMES = 450, DUR = FRAMES / FPS;     // exactly 15.000 s
  const BEAT = 0.74088, EIGHTH = BEAT / 2;                                // gt_jalandhar: 81 BPM
  const frameOf = n => Math.round(n * EIGHTH * FPS);                      // frame of the n-th eighth note
  const at = n => frameOf(n) / FPS;                                       // its time, snapped to that frame
  const fr = f => f / FPS;

  /* One bar = 8 eighth notes. Stamps fall on the bar lines (n = 8, 16, 24), the title on bar 5 (n = 32);
     the triangle closes one eighth note earlier (n = 31), as the pick-up to the title. */
  const SCHED = {
    dots:   { delhi: fr(1), agra: fr(5), jaipur: fr(9) },                  // the three city marks pop in
    plan:   [[fr(4), fr(10)], [fr(8), fr(14)], [fr(12), fr(18)]],          // the pencilled route is sketched, leg by leg
    dive:   [fr(12), fr(31)],
    delhi:  { arrive: fr(31),  paste: [at(3),  at(4),  at(5)],  caption: at(6),          stamp: at(8),  leave: at(11) },
    agra:   { arrive: at(13),  paste: [at(13), at(14)],         caption: at(14) + fr(5), stamp: at(16), leave: at(19) },
    jaipur: { arrive: at(21),  paste: [at(21), at(22), at(23)], caption: at(21) + fr(5), stamp: at(24), leave: at(26) },
    close:  at(31),                                                       // the line touches Delhi again
    title:  at(32),                                                       // the title is at full strength
    rings:  [at(10), at(12), at(18), at(20), at(26), at(28), at(30)],     // on every beat a ring leaves the end of the line (also while it waits at a city)
    glint:  [12.55, 13.95],                                               // one glint runs round the finished triangle
    fadeIn: [0, fr(6)],                                                   // f0 is the dimmed sheet (never black), clear from f6
  };
  SCHED.visited = { delhi: fr(8), agra: SCHED.agra.arrive, jaipur: SCHED.jaipur.arrive };   // the dot turns gold

  /* ---------- map: equirectangular at the mean latitude, north up; world space = pixels of the last frame ---------- */
  const PX_PER_DEG_LAT = 196, MEAN_LAT = 27.57, COS = Math.cos(MEAN_LAT * Math.PI / 180);
  const LON0 = 75.7873, LAT0 = 28.6139, X0 = 167, Y0 = 300;
  const proj = (lat, lon) => [X0 + (lon - LON0) * COS * PX_PER_DEG_LAT, Y0 + (LAT0 - lat) * PX_PER_DEG_LAT];
  const CITY = {
    delhi:  { ja: "デリー",       en: "DELHI",  lat: 28.6139, lon: 77.2090, ink: "#A8402F", rot: -11, label: [16, -14] },
    agra:   { ja: "アーグラ",     en: "AGRA",   lat: 27.1767, lon: 78.0081, ink: "#35557F", rot: 8,   label: [16, -2] },
    jaipur: { ja: "ジャイプール", en: "JAIPUR", lat: 26.9124, lon: 75.7873, ink: "#B5476A", rot: -7,  label: [-60, 38] },
  };
  const ORDER = ["delhi", "agra", "jaipur"];
  for (const k of ORDER) { const [x, y] = proj(CITY[k].lat, CITY[k].lon); CITY[k].x = x; CITY[k].y = y; }
  /* great-circle distance (haversine, mean Earth radius 6371.0 km): the notes written along the legs */
  const km = (a, b) => { const R = 6371.0, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const LEGS = [["delhi", "agra"], ["agra", "jaipur"], ["jaipur", "delhi"]].map(([a, b]) => {
    const A = CITY[a], B = CITY[b];
    return { a, b, A, B, len: Math.hypot(B.x - A.x, B.y - A.y), km: km(A, B) };
  });
  const PX_PER_KM = (LEGS[0].len / LEGS[0].km + LEGS[1].len / LEGS[1].km + LEGS[2].len / LEGS[2].km) / 3;

  /* ---------- easing ---------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const ioCubic = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const ioSine = u => 0.5 - 0.5 * Math.cos(Math.PI * u);
  const smooth = u => u * u * (3 - 2 * u);              // gentle in and out: top speed only 1.5x the mean (the flights)
  const outCubic = u => 1 - Math.pow(1 - u, 3);
  const outQuint = u => 1 - Math.pow(1 - u, 5);
  const snapHome = u => u * u * (3 - u) / 2;            // still at 1.5x its mean speed at the end: the last leg snaps shut
  const outBack = u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
  const pullBack = u => Math.pow(outCubic(u), 1.3);     // leaves at once, then settles for a long time

  /* ---------- camera: screen = (360, 640) + (world - centre) * zoom ---------- */
  const ZC = 2.6;                                        // close-up zoom
  const HOME = { x: W / 2, y: H / 2, z: 1 };
  const DOT_ON_SCREEN = { delhi: [250, 1150], agra: [250, 520], jaipur: [360, 290] };   // where the city dot sits in its close-up
  const closeUp = (k, z) => { const c = CITY[k], [sx, sy] = DOT_ON_SCREEN[k]; return { x: c.x - (sx - W / 2) / z, y: c.y - (sy - H / 2) / z, z }; };
  const CU = { delhi: closeUp("delhi", ZC), agra: closeUp("agra", ZC), jaipur: closeUp("jaipur", ZC) };
  const s2w = (cam, sx, sy) => [cam.x + (sx - W / 2) / cam.z, cam.y + (sy - H / 2) / cam.z];
  const w2s = (cam, wx, wy) => [W / 2 + (cam.shx || 0) + (wx - cam.x) * cam.z, H / 2 + (cam.shy || 0) + (wy - cam.y) * cam.z];

  function mix(a, b, e, dip = 0, u = e) {              // centre: straight line; zoom: geometric, with an optional dip mid-way
    const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)) * (1 - dip * Math.sin(Math.PI * u));
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z };
  }
  /* arriving on a city page the camera goes on settling for a moment (zoom 2.53 -> 2.60, the dot fixed), then it is quite still:
     the page is looked at with a steady camera, and frames that do not change cost the video next to nothing.
     (Small motions below are cut off once they are too small to see, for the same reason.) */
  const SETTLE = 0.4;
  const page = (k, t, t0) => closeUp(k, lerp(ZC - 0.07, ZC, outCubic(span(t, t0, t0 + SETTLE))));
  const FLIGHT_DIP = 0.5;                                // mid-flight the camera is at about zoom 1.3: both cities and the line are in view
  const PULL = 1.25;                                     // seconds of the pull-back to the whole sheet

  function cameraBase(t) {
    const s = SCHED;
    if (t < s.dive[0]) return { x: HOME.x, y: HOME.y, z: lerp(1.0, 1.035, span(t, 0, s.dive[0])) };
    if (t < s.dive[1]) { const u = span(t, s.dive[0], s.dive[1]); return mix({ x: HOME.x, y: HOME.y, z: 1.035 }, page("delhi", s.dive[1], s.dive[1]), ioCubic(u) * 0.55 + outCubic(u) * 0.45); }
    if (t < s.delhi.leave) return page("delhi", t, s.dive[1]);
    if (t < s.agra.arrive) { const u = span(t, s.delhi.leave, s.agra.arrive); return mix(CU.delhi, page("agra", s.agra.arrive, s.agra.arrive), smooth(u), FLIGHT_DIP, u); }
    if (t < s.agra.leave) return page("agra", t, s.agra.arrive);
    if (t < s.jaipur.arrive) { const u = span(t, s.agra.leave, s.jaipur.arrive); return mix(CU.agra, page("jaipur", s.jaipur.arrive, s.jaipur.arrive), smooth(u), FLIGHT_DIP, u); }
    if (t < s.jaipur.leave) return page("jaipur", t, s.jaipur.arrive);
    const cam = mix(CU.jaipur, HOME, pullBack(span(t, s.jaipur.leave, s.jaipur.leave + PULL)));
    const d = t - s.close;                                // the frame gives a small start when the triangle snaps shut
    if (d >= 0 && d < 0.9) cam.z *= 1 + 0.014 * Math.exp(-d / 0.11) * Math.cos(2 * Math.PI * 2.2 * d);
    return cam;
  }
  function camera(t) {
    const cam = cameraBase(t);
    let shx = 0, shy = 0;                                // the frame shakes for five frames after each stamp (until the shake is under half a pixel)
    for (const k of ORDER) {
      const d = t - SCHED[k].stamp;
      if (d >= 0 && d < 0.16) { const a = 6.5 * Math.exp(-d / 0.065); shx += a * Math.sin(2 * Math.PI * 17 * d); shy += a * Math.cos(2 * Math.PI * 13 * d); }
    }
    cam.shx = shx; cam.shy = shy;
    return cam;
  }
  const CENTROID = [(CITY.delhi.x + CITY.agra.x + CITY.jaipur.x) / 3, (CITY.delhi.y + CITY.agra.y + CITY.jaipur.y) / 3];   // the middle of the triangle

  /* ---------- the gold line: progress of each leg, 0..1 ---------- */
  function legProgress(t) {
    const s = SCHED;
    return [
      smooth(span(t, s.delhi.leave, s.agra.arrive)),
      smooth(span(t, s.agra.leave, s.jaipur.arrive)),
      snapHome(span(t, s.jaipur.leave, s.close)),
    ];
  }
  function tipAt(t) {                                    // world position of the moving end of the line, or null
    const pr = legProgress(t);
    for (let i = 0; i < 3; i++) if (pr[i] > 0 && pr[i] < 1) { const L = LEGS[i]; return [lerp(L.A.x, L.B.x, pr[i]), lerp(L.A.y, L.B.y, pr[i])]; }
    return null;
  }
  function lineEndAt(t) {                                // where the line ends at t, also while it waits at a city
    const tip = tipAt(t); if (tip) return tip;
    const pr = legProgress(t), k = pr[2] >= 1 ? "delhi" : pr[1] >= 1 ? "jaipur" : pr[0] >= 1 ? "agra" : "delhi";
    return [CITY[k].x, CITY[k].y];
  }
  const planProgress = t => SCHED.plan.map(([a, b]) => ioSine(span(t, a, b)));

  /* ---------- prints ----------
     A print is a photo on white paper. The first print of a city (the hero) has a wide lower margin with a handwritten
     caption, like an instant photo, and a strip of tape; the others are plain, with small pieces of tape.
     sp = where it lies on the city's page, in close-up screen px (zoom 2.6): centre x, y, outer width, tilt.
     Only the hero stays for the last picture (end = world px); the others slip under it and are gone. */
  const BORDER = 0.035, STRIP = 0.12;                    // white border and caption margin, as fractions of the outer width
  const PRINTS = [
    { c: "delhi",  f: "delhi_india_gate",      ar: 0.892, hero: true, sp: { x: 292, y: 492, w: 520, r: -2.5 }, end: { x: 318, y: 224, w: 132, r: -4 }, approach: 10, from: 0.5,
      tape: [{ w: 0.25, h: 0.062, at: [0.50, 0.004], r: -3 }], caption: { text: "インド門", align: "left" } },
    { c: "delhi",  f: "delhi_red_fort_facade", ar: 2,     sp: { x: 196, y: 957, w: 332, r: 3.5 },
      tape: [{ w: 0.20, h: 0.085, at: [0.035, 0.07], r: -43 }, { w: 0.20, h: 0.085, at: [0.965, 0.93], r: -47 }] },
    { c: "delhi",  f: "delhi_qutub_minar",     ar: 0.56,  sp: { x: 606, y: 372, w: 196, r: 5 },
      tape: [{ w: 0.42, h: 0.14, at: [0.52, 0.006], r: 4 }] },

    { c: "agra",   f: "agra_taj_mahal_arch",   ar: 0.8,   hero: true, sp: { x: 298, y: 920, w: 496, r: 2 }, end: { x: 628, y: 694, w: 120, r: 4 },
      tape: [{ w: 0.25, h: 0.062, at: [0.47, 0.004], r: 3 }], caption: { text: "タージ・マハル", align: "left" } },
    { c: "agra",   f: "term_parchin_kari",     ar: 0.8,   sp: { x: 606, y: 792, w: 204, r: 6 },
      tape: [{ w: 0.40, h: 0.13, at: [0.5, 0.006], r: -4 }] },

    { c: "jaipur", f: "jaipur_hawa_mahal_night", ar: 0.8,   hero: true, sp: { x: 474, y: 890, w: 456, r: 2.5 }, end: { x: 98, y: 498, w: 128, r: -4 },
      tape: [{ w: 0.25, h: 0.062, at: [0.53, 0.004], r: 4 }], caption: { text: "ハワー・マハル", align: "right" } },
    { c: "jaipur", f: "jaipur_amber_fort_hill", ar: 2,    sp: { x: 186, y: 1078, w: 332, r: -4 },
      tape: [{ w: 0.20, h: 0.085, at: [0.035, 0.93], r: 44 }, { w: 0.20, h: 0.085, at: [0.965, 0.07], r: 47 }] },
    { c: "jaipur", f: "jaipur_city_palace_peacock_gate", ar: 0.8, sp: { x: 128, y: 826, w: 186, r: -6 },
      tape: [{ w: 0.40, h: 0.13, at: [0.48, 0.006], r: 5 }] },
  ];
  { const n = { delhi: 0, agra: 0, jaipur: 0 }, hero = {};
    for (const p of PRINTS) {
      const [wx, wy] = s2w(CU[p.c], p.sp.x, p.sp.y);
      p.w = p.sp.w / ZC;                                 // the element's own size (world px); later sizes are a scale of it
      p.b = p.w * BORDER; p.iw = p.w - 2 * p.b; p.ih = p.iw / p.ar; p.foot = p.hero ? p.w * STRIP : p.b; p.h = p.b + p.ih + p.foot;
      p.spread = { x: wx, y: wy, r: p.sp.r };
      p.index = n[p.c]++;
      p.z = p.index + 1;                                 // later prints lie on top
      p.pasteAt = SCHED[p.c].paste[p.index];
      p.leaveAt = SCHED[p.c].leave;
      p.stampAt = SCHED[p.c].stamp;
      if (p.hero) hero[p.c] = p;
    }
    for (const p of PRINTS) p.heroPrint = hero[p.c]; }
  const GATHER = 0.62;
  function printPose(p, t) {
    const approach = (p.approach || 4) / FPS, from = p.from || 0.22;  // frames on the way down, and how much larger it starts
    const u = span(t, p.pasteAt - approach, p.pasteAt);              // coming down onto the page
    const lift = 1 - u * u;
    const d = t - p.pasteAt;
    let sc = 1 + from * lift, r = p.spread.r + (p.index % 2 ? -7 : 7) * lift, x = p.spread.x + 23 * from * lift, y = p.spread.y + 36 * from * lift;
    if (d >= 0 && d < 0.3) { sc -= 0.02 * Math.exp(-d / 0.05); r += (p.index % 2 ? -1 : 1) * 1.1 * Math.exp(-d / 0.085) * Math.sin(2 * Math.PI * 8 * d); }   // lands, and settles
    const ds = t - p.stampAt;                                        // the stamp makes the taped prints jump
    if (ds >= 0 && ds < 0.23) r += (p.index % 2 ? 0.75 : -0.75) * Math.exp(-ds / 0.075) * Math.sin(2 * Math.PI * 11 * ds);
    let opacity = t < p.pasteAt - approach ? 0 : clamp(u * 2.5);
    const k = ioCubic(span(t, p.leaveAt + 0.04 * p.index, p.leaveAt + GATHER));   // the line has left: the page is gathered up
    if (k > 0) {
      const e = p.heroPrint.end, w = p.hero ? e.w : e.w * 0.86;
      x = lerp(x, e.x, k); y = lerp(y, e.y, k); r = lerp(r, e.r, k); sc = lerp(sc, w / p.w, k);
      if (!p.hero) opacity *= 1 - span(k, 0.55, 0.92);
    }
    return { x, y, r, sc, lift, opacity, tape: span(t, p.pasteAt + 1 / FPS, p.pasteAt + 4 / FPS) };
  }

  /* ---------- stamps: pressed on the bar lines. The ink stays where it was pressed. ---------- */
  const STAMP_SIZE = 88;                                 // world px across (the drawing is a 100-unit box)
  const STAMP_OFF = { delhi: [98, -92], agra: [75, -95], jaipur: [-83, 108.5] };        // from the city mark, world px
  const STAMP_AT = {}; for (const k of ORDER) STAMP_AT[k] = [CITY[k].x + STAMP_OFF[k][0], CITY[k].y + STAMP_OFF[k][1]];
  const STAMP_DOWN = 5 / FPS, STAMP_UP = 5 / FPS;        // the hand stamp comes down for five frames and is lifted for five
  function stampPose(k, t) {
    const ts = SCHED[k].stamp, d = t - ts;
    const u = span(t, ts - STAMP_DOWN, ts), v = span(t, ts, ts + STAMP_UP);
    // the shadow of the hand stamp: wide and faint in the air, tight and dark on contact, gone as it is lifted
    const shadow = d < -STAMP_DOWN || d > STAMP_UP ? null
      : d < 0 ? { sc: lerp(1.9, 1.06, u * u), opacity: 0.34 * u * u, dx: 16 * (1 - u * u), dy: 22 * (1 - u * u) }
      : { sc: lerp(1.06, 1.7, outCubic(v)), opacity: 0.34 * (1 - v) * (1 - v), dx: 12 * outCubic(v), dy: 18 * outCubic(v) };
    return {
      x: STAMP_AT[k][0], y: STAMP_AT[k][1], size: STAMP_SIZE, r: CITY[k].rot,
      sc: d < 0 ? 1 : 1 - 0.035 * Math.exp(-d / 0.05),               // the rubber gives a little
      opacity: d < 0 ? 0 : lerp(1, 0.9, span(d, 0.05, 0.6)),          // wet ink, then dry
      shadow,
    };
  }

  /* ---------- captions: written on the hero print's lower margin, one character after another ---------- */
  function captionState(p, t) {
    const t0 = SCHED[p.c].caption, n = [...p.caption.text].length;
    return { written: span(t, t0, t0 + 0.05 * n) };
  }

  /* ---------- the close and the title ---------- */
  function closeState(t) {
    const d = t - SCHED.close;
    return {
      flash: d < 0 || d >= 0.9 ? 0 : Math.exp(-d / 0.16),             // all three sides light up (cut off once it is too faint to see, so that the held title is truly still)
      bloom: d < 0 ? 0 : outCubic(span(d, 0, 0.5)),                   // the gold spreads from Delhi over the triangle
      ring: d < 0 ? -1 : span(d, 0, 0.6),                             // a ring leaves each corner
    };
  }
  function titleState(t) {
    const T = SCHED.title, pre = 3 / FPS;                // three frames of pre-roll: full strength on the bar line
    const land = outQuint(span(t, T - pre, T + 0.42));
    const show = span(t, T - pre, T);
    return {
      plate: span(t, SCHED.close + 0.05, T + 0.1),                    // the grid clears behind the title
      journey: { opacity: show, scale: lerp(1.085, 1, land), tracking: lerp(0.07, 0.02, land) },
      country: { opacity: span(t, T - pre, T + 0.05), tracking: lerp(0.9, 0.56, outCubic(span(t, T - pre, T + 0.5))) },
      rule: outCubic(span(t, T, T + 0.45)),
      brand: { opacity: span(t, T + 0.08, T + 0.36), dy: lerp(-9, 0, outCubic(span(t, T + 0.08, T + 0.5))) },
      sub: span(t, T + 0.3, T + 0.62),
    };
  }

  /* ---------- the first frames come up from a dimmed sheet (the first frame is never black) ---------- */
  function blackAt(t) {
    const s = SCHED;
    return t < s.fadeIn[1] ? 0.42 * Math.pow(1 - span(t, s.fadeIn[0], s.fadeIn[1]), 1.4) : 0;
  }

  /* ---------- how far things move on screen between t and t + dt (px): the renderer uses it to choose how many
     sub-frames to blend for motion blur ---------- */
  function motionPx(t, dt) {
    const c0 = camera(t), c1 = camera(t + dt);
    let m = 0;
    const far = (w0, w1) => { const a = w2s(c0, w0[0], w0[1]), b = w2s(c1, w1[0], w1[1]); m = Math.max(m, Math.hypot(b[0] - a[0], b[1] - a[1])); };
    for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2]]) { const w = s2w(c0, sx, sy); far(w, w); }   // the map itself
    const corners = (x, y, hw, hh, deg, sc) => { const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [x + (i * hw * ca - j * hh * sa) * sc, y + (i * hw * sa + j * hh * ca) * sc]); };
    for (const p of PRINTS) {
      const a = printPose(p, t), b = printPose(p, t + dt);
      if (a.opacity <= 0 && b.opacity <= 0) continue;
      const A = corners(a.x, a.y, p.w / 2, p.h / 2, a.r, a.sc), B = corners(b.x, b.y, p.w / 2, p.h / 2, b.r, b.sc);
      for (let i = 0; i < 4; i++) far(A[i], B[i]);
    }
    for (const k of ORDER) {
      const a = stampPose(k, t), b = stampPose(k, t + dt);
      if (a.shadow && b.shadow) {
        const A = corners(a.x + a.shadow.dx, a.y + a.shadow.dy, a.size / 2, a.size / 2, 0, a.shadow.sc), B = corners(b.x + b.shadow.dx, b.y + b.shadow.dy, b.size / 2, b.size / 2, 0, b.shadow.sc);
        for (let i = 0; i < 4; i++) far(A[i], B[i]);
      }
      if (a.opacity > 0 && b.opacity > 0) {
        const A = corners(a.x, a.y, a.size / 2, a.size / 2, a.r, a.sc), B = corners(b.x, b.y, b.size / 2, b.size / 2, b.r, b.sc);
        for (let i = 0; i < 4; i++) far(A[i], B[i]);
      }
    }
    const tip0 = tipAt(t), tip1 = tipAt(t + dt);
    if (tip0 && tip1) far(tip0, tip1);
    const pl0 = planProgress(t), pl1 = planProgress(t + dt);
    for (let i = 0; i < 3; i++) if (pl1[i] > pl0[i]) m = Math.max(m, (pl1[i] - pl0[i]) * LEGS[i].len * c0.z);
    const cl0 = closeState(t), cl1 = closeState(t + dt);
    if (cl1.bloom > cl0.bloom) m = Math.max(m, (cl1.bloom - cl0.bloom) * 460);
    if (cl1.ring > cl0.ring && cl0.ring < 1) m = Math.max(m, (cl1.ring - cl0.ring) * 60);
    if (t + dt > SCHED.glint[0] && t < SCHED.glint[1]) m = Math.max(m, dt / (SCHED.glint[1] - SCHED.glint[0]) * 1500);
    const ta = titleState(t), tb = titleState(t + dt);
    if (ta.journey.opacity > 0 || tb.journey.opacity > 0) {
      m = Math.max(m, 320 * Math.abs(tb.journey.scale - ta.journey.scale) + 47 * 6.5 * Math.abs(tb.journey.tracking - ta.journey.tracking),
        27 * 1.5 * Math.abs(tb.country.tracking - ta.country.tracking), Math.abs(tb.brand.dy - ta.brand.dy), 80 * Math.abs(tb.rule - ta.rule));
    }
    return m;
  }

  window.GT = {
    W, H, FPS, FRAMES, DUR, BEAT, frameOf, at, SCHED,
    proj, CITY, ORDER, LEGS, PX_PER_DEG_LAT, PX_PER_KM, COS,
    clamp, lerp, span, ioCubic, ioSine, smooth, outCubic, outQuint, outBack,
    ZC, HOME, CU, DOT_ON_SCREEN, s2w, w2s, camera, CENTROID, legProgress, tipAt, lineEndAt, planProgress,
    BORDER, STRIP, PRINTS, printPose, STAMP_SIZE, STAMP_AT, stampPose, captionState, closeState, titleState, blackAt, motionPx,
  };
})();
