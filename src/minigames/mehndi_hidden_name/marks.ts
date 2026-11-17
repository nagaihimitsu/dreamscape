import { MEHNDI_SPOTS, MEHNDI_TUNING, type MehndiParams, type MehndiSpot, type MehndiTarget } from "./rules";
import { WRITING_ASCENT, WRITING_BASELINE, WRITING_DESCENT, WRITING_MAX_SIZE, writingSize, writingWidth } from "./writing";

// Where things lie on her palm, and what a point of the lamp or a finger points at (docs/13 2.2, 2.10). Pure: no React and
// no browser (the story checks read this file through the definition's load()). The six places are what the look counts
// (rules.ts); the writing has a room at its target; and, round 4 (2026-11-17, the user: 「既存のものではかんたんすぎるので、
// 文字(Fasol SP)に似た図形をたくさん作って配置する」), runs of letter-like decorations lie across the fingers, the palm and
// above the wrist: each mark a Fasol SP letter or two laid over each other, mirrored or turned (drawn as text from the
// unmodified font, Skin.tsx), read as no letter, no word and no name. A decoration belongs to the place nearest it: pointing
// at it points at that place (a wrong one: never the writing's). The writing itself is pointed at on its letters (its box),
// not only near its place (at the thumb a tap on the name's first letter was nearer no place: it did nothing). Nothing is
// random: the table is the same every time, and only the size follows the name.

/** The places, where the eye stops in the pattern (their names say what is drawn there, never what hides in it). */
export const MEHNDI_PLACES: Record<MehndiSpot, { x: number; y: number; labelJa: string }> = {
  index: { x: 204, y: 104, labelJa: "人差し指の花" },
  pinky: { x: 88, y: 204, labelJa: "小指の側の花" },
  peacock: { x: 150, y: 236, labelJa: "孔雀の羽の付け根" },
  thumb: { x: 214, y: 298, labelJa: "親指の付け根の蔓" },
  vine: { x: 136, y: 322, labelJa: "真ん中の蔓" },
  wrist: { x: 150, y: 392, labelJa: "手首の模様" },
};
/** A pointer within this of a place points at it (the places are further apart than twice this). */
export const MEHNDI_HIT = 30;
/**
 * Where the writing lies at each target: its centre, its slant, the room it has, and whether the central vine's line runs
 * under it. Every room, with the tall strokes and the tails of the largest size, lies inside the palm's outline, and its
 * centre within a point's reach of the place (MEHNDI_HIT). No line of the pattern crosses it: nothing is drawn at the
 * feather's base but the writing or a decoration (the fine curls and the leaf that were there are gone, 2026-11-17: the
 * Fasol SP tails of g, j, p, q and y reached the leaf), the vine's line breaks behind what is laid on it (mehndiVineGaps),
 * and the feather's point behind Fasol SP letters laid at its base (MEHNDI_FEATHER_GAP, Skin.tsx). At the thumb, the name
 * lies level under the spiral in a room of 52: its tall strokes anywhere along the room about 2.5 clear of the spiral's
 * lines (past their half width), its tails 2 inside the palm's edge, its centre 28 from the place (2026-11-17: slanted
 * −22° in a room of 54, as measured on 2026-11-16, the tall strokes of a long name ran into the spiral's last turn, and the
 * tails of one ending in g, j, p, q or y out past the palm's edge; level, a short name keeps the largest size).
 * skin.test.ts measures these from the shapes drawn.
 */
export const MEHNDI_WRITING: Record<MehndiTarget, { x: number; y: number; rotate: number; width: number; onVine: boolean }> = {
  thumb: { x: 201.5, y: 323, rotate: 0, width: 52, onVine: false },
  peacock: { x: 150, y: 246, rotate: -8, width: 58, onVine: true },
  vine: { x: 141, y: 316, rotate: -14, width: 62, onVine: true },
};
/** How far a ring stays out from what it rings (units: its 2 px line and a little air). */
export const RING_CLEAR = 4;
/**
 * The gold ring round the writing once found (in the hand's units): centred on the writing, not on the place pointed at
 * (at the thumb the two are apart, and a ring round the place crossed the name), and round all of its room, the tall
 * strokes and the tails of the largest size included, RING_CLEAR clear of them.
 */
export function mehndiWritingRing(target: MehndiTarget): { x: number; y: number; diameter: number } {
  const place = MEHNDI_WRITING[target];
  const reach = Math.max(WRITING_ASCENT - WRITING_BASELINE, WRITING_DESCENT + WRITING_BASELINE) * WRITING_MAX_SIZE;
  return { x: place.x, y: place.y, diameter: 2 * (Math.hypot(place.width / 2, reach) + RING_CLEAR) };
}

/** The place a point (in the hand's units) points at: the nearest within `reach`, if any. */
export function mehndiSpotAt(x: number, y: number, reach = MEHNDI_HIT): number | null {
  const distances = MEHNDI_SPOTS.map((spot) => Math.hypot(MEHNDI_PLACES[spot].x - x, MEHNDI_PLACES[spot].y - y));
  const nearest = distances.indexOf(Math.min(...distances));
  return distances[nearest] <= reach ? nearest : null;
}

/**
 * Whether a point of the lamp (in the hand's units) is near the place to point at for the writing (her hand's hot and cold):
 * centred on the place a point finds, so it never fires nearer another place (2026-11-14 playtest: the thumb's tell fired
 * with the lamp nearer the central vine), and never on a decoration (each lies further from the writing's place).
 */
export function mehndiNear(x: number, y: number, target: MehndiTarget, units = MEHNDI_TUNING.nearUnits): boolean {
  return Math.hypot(MEHNDI_PLACES[target].x - x, MEHNDI_PLACES[target].y - y) <= units;
}

/** A box in a frame of its own (the hand's units; y down; 0 the small letters' middle). */
export interface MehndiBox { left: number; right: number; top: number; bottom: number }
/** A glyph of a mark: one letter, its advance's centre `dx` em from the mark's origin, mirrored (left to right) or half-turned (180°). */
export interface MehndiGlyph { letter: string; dx: number; turn?: "mirror" | "half" }
/**
 * A mark: Fasol SP letters laid over each other or turned; its ink (em; x about the mark's origin, y up from the baseline;
 * the bounds of the glyphs' outlines in FasolSPDemo.otf, a half turn about the small letters' middle, WRITING_BASELINE
 * above the baseline, as it is drawn: marks.test.ts reads them from the file); and the letters a glance might take it for.
 */
export interface MehndiDecoyMark {
  glyphs: readonly MehndiGlyph[];
  ink: { left: number; right: number; bottom: number; top: number };
  readsAs: string;
}
/** Air between the ink of two marks in a run (em). */
export const MEHNDI_DECOY_GAP = 0.08;
/** The decorations are never smaller than this (a pressed long name may be): under it they stop looking like letters. */
export const MEHNDI_DECOY_MIN_SIZE = 9;
/** Their size where the writing is not a Latin name (the mark, FARHANA). */
export const MEHNDI_DECOY_PLAIN_SIZE = 14;
/** A point this near a thing's box is on it (the lamp's aim; a tap first). */
export const MEHNDI_MARK_PAD = 4;
/** The central vine's gap behind what is laid on it: that thing's box, grown by this (its corners rounded, Skin.tsx). */
export const MEHNDI_GAP_AIR = 2.5;

export type MehndiMarkId = "hh" | "kk" | "ky" | "km" | "hz" | "tk" | "mk" | "mh" | "zx" | "vx" | "rv" | "nz" | "mz" | "xz" | "yx";
/**
 * The fifteen marks, reviewed (2026-11-17): each was drawn large and at the game's size from the font's own glyphs, and
 * reads as no vowel, no digit or punctuation mark, and no letter of another script (Cyrillic Ж Ф Ш Я З Д Л Б И Н к, Greek
 * θ α, and ø þ œ ə were looked for). `readsAs` lists the consonants a glance might take a mark for (marks.test.ts lets no
 * run spell a word with them). Forms tried and left out: s over x (a dollar sign), a turned r over f (L), d over q (d, o),
 * e over k (an e), any bowl (o, a, ø), a stem through x (Ж), n over w and w over r (w).
 */
export const MEHNDI_DECOY_MARKS: Readonly<Record<MehndiMarkId, MehndiDecoyMark>> = {
  hh: { glyphs: [{ letter: "h", dx: 0 }, { letter: "h", dx: 0, turn: "half" }], ink: { left: -0.302, right: 0.302, bottom: -0.537, top: 0.897 }, readsAs: "hy" },
  kk: { glyphs: [{ letter: "k", dx: 0 }, { letter: "k", dx: 0, turn: "half" }], ink: { left: -0.301, right: 0.301, bottom: -0.537, top: 0.897 }, readsAs: "ky" },
  ky: { glyphs: [{ letter: "k", dx: 0 }, { letter: "y", dx: 0 }], ink: { left: -0.301, right: 0.3, bottom: -0.465, top: 0.897 }, readsAs: "ky" },
  km: { glyphs: [{ letter: "k", dx: 0, turn: "mirror" }], ink: { left: -0.3, right: 0.301, bottom: 0, top: 0.897 }, readsAs: "kh" },
  hz: { glyphs: [{ letter: "h", dx: 0 }, { letter: "z", dx: 0 }], ink: { left: -0.298, right: 0.302, bottom: 0, top: 0.897 }, readsAs: "hzl" },
  tk: { glyphs: [{ letter: "t", dx: -0.157 }, { letter: "k", dx: 0 }], ink: { left: -0.301, right: 0.3, bottom: 0, top: 0.897 }, readsAs: "tkf" },
  mk: { glyphs: [{ letter: "m", dx: 0 }, { letter: "k", dx: 0.1, turn: "mirror" }], ink: { left: -0.376, right: 0.401, bottom: 0, top: 0.897 }, readsAs: "mnkh" },
  mh: { glyphs: [{ letter: "m", dx: 0 }, { letter: "h", dx: 0, turn: "half" }], ink: { left: -0.376, right: 0.381, bottom: -0.537, top: 0.361 }, readsAs: "mnrqy" },
  zx: { glyphs: [{ letter: "z", dx: 0 }, { letter: "x", dx: 0 }], ink: { left: -0.235, right: 0.236, bottom: 0, top: 0.495 }, readsAs: "zx" },
  vx: { glyphs: [{ letter: "v", dx: 0 }, { letter: "x", dx: 0 }], ink: { left: -0.232, right: 0.228, bottom: 0, top: 0.495 }, readsAs: "vx" },
  rv: { glyphs: [{ letter: "r", dx: 0 }, { letter: "v", dx: 0 }], ink: { left: -0.232, right: 0.228, bottom: 0, top: 0.495 }, readsAs: "rv" },
  nz: { glyphs: [{ letter: "n", dx: 0 }, { letter: "z", dx: 0 }], ink: { left: -0.235, right: 0.236, bottom: 0, top: 0.495 }, readsAs: "nz" },
  mz: { glyphs: [{ letter: "m", dx: 0 }, { letter: "z", dx: 0 }], ink: { left: -0.376, right: 0.381, bottom: 0, top: 0.495 }, readsAs: "mnz" },
  xz: { glyphs: [{ letter: "x", dx: 0 }, { letter: "z", dx: 0, turn: "half" }], ink: { left: -0.236, right: 0.235, bottom: -0.135, top: 0.495 }, readsAs: "xz" },
  yx: { glyphs: [{ letter: "y", dx: 0 }, { letter: "x", dx: 0 }], ink: { left: -0.237, right: 0.232, bottom: -0.465, top: 0.495 }, readsAs: "yx" },
};

/**
 * A run of marks: the place it belongs to (the nearest to every point of it), its centre (the small letters' middle), its
 * slant, its size against the decorations' size, its marks, and whether the central vine's line runs under it.
 */
export interface MehndiDecoy {
  id: string;
  place: MehndiSpot;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  marks: readonly MehndiMarkId[];
  onVine?: boolean;
}
/**
 * The runs (reviewed, 2026-11-17): on the fingers, across the palm and above the wrist, one in each of the writing's three
 * rooms (as long as a name: drawn in the two rooms the writing is not in). Each is drawn only where the writing's place is
 * another (mehndiDecoysFor). skin.test.ts measures, from the shapes drawn, that every run at the largest size lies inside
 * the hand, off the fingertips, clear of every line, nearest its own place, and far from the writing, its place and its ring.
 */
export const MEHNDI_DECOYS: readonly MehndiDecoy[] = [
  { id: "ring_finger", place: "index", x: 126, y: 117, rotate: -2, scale: 0.85, marks: ["km", "zx"] },
  { id: "middle_tip", place: "index", x: 164, y: 103, rotate: 0, scale: 0.85, marks: ["hz", "rv"] },
  { id: "index_band", place: "index", x: 206, y: 166, rotate: 5, scale: 0.85, marks: ["tk", "mh"] },
  { id: "pinky_finger", place: "pinky", x: 72.4, y: 161.5, rotate: -7, scale: 0.8, marks: ["vx", "km"] },
  { id: "pinky_palm", place: "pinky", x: 83, y: 252, rotate: 4, scale: 0.8, marks: ["rv", "hh", "nz"] },
  { id: "feather_base", place: "peacock", x: 150, y: 246, rotate: -8, scale: 1, marks: ["rv", "kk", "mh", "nz"], onVine: true },
  { id: "middle_low", place: "peacock", x: 165, y: 181, rotate: 0, scale: 0.85, marks: ["mk", "xz"] },
  { id: "palm_top", place: "peacock", x: 192, y: 232, rotate: -6, scale: 0.85, marks: ["tk", "zx"] },
  { id: "vine_room", place: "vine", x: 134, y: 318, rotate: -14, scale: 1, marks: ["nz", "ky", "rv", "hz"], onVine: true },
  { id: "palm_left", place: "vine", x: 94, y: 306, rotate: 6, scale: 0.9, marks: ["nz", "hh", "rv"] },
  { id: "palm_low", place: "vine", x: 104, y: 348, rotate: 10, scale: 0.85, marks: ["ky", "mz"] },
  { id: "thumb_room", place: "thumb", x: 206.5, y: 323, rotate: 0, scale: 1, marks: ["kk", "rv", "hz", "nz"] },
  { id: "thumb_finger", place: "thumb", x: 260.6, y: 254.2, rotate: 22, scale: 0.8, marks: ["hz", "vx"] },
  { id: "wrist_top", place: "wrist", x: 176, y: 368, rotate: -4, scale: 0.8, marks: ["nz", "km", "yx"] },
];

/** The runs drawn with the writing at a target: all but those of the writing's own place, in the table's order. */
export function mehndiDecoysFor(target: MehndiTarget): MehndiDecoy[] {
  return MEHNDI_DECOYS.filter((decoy) => decoy.place !== target);
}

/**
 * A run laid out (em): the marks ink to ink with MEHNDI_DECOY_GAP between them, the whole centred on 0. `origins`: each
 * mark's origin; `width`: the run's ink from end to end.
 */
export function mehndiDecoyLayout(marks: readonly MehndiMarkId[]): { origins: number[]; width: number } {
  const inks = marks.map((id) => MEHNDI_DECOY_MARKS[id].ink);
  const width = inks.reduce((sum, ink) => sum + ink.right - ink.left, 0) + MEHNDI_DECOY_GAP * Math.max(0, marks.length - 1);
  const origins: number[] = [];
  let x = -width / 2;
  for (const ink of inks) {
    origins.push(x - ink.left);
    x += ink.right - ink.left + MEHNDI_DECOY_GAP;
  }
  return { origins, width };
}

/** A run's glyphs as drawn: each letter, its advance's centre `x` em from the run's centre, and its turn. */
export function mehndiDecoyGlyphs(decoy: MehndiDecoy): { letter: string; x: number; turn?: "mirror" | "half" }[] {
  const { origins } = mehndiDecoyLayout(decoy.marks);
  return decoy.marks.flatMap((id, index) => MEHNDI_DECOY_MARKS[id].glyphs.map((glyph) => ({
    letter: glyph.letter, x: origins[index] + glyph.dx, ...(glyph.turn ? { turn: glyph.turn } : {}),
  })));
}

/**
 * The decorations' size (the hand's units; a run's own is this times its scale): the name's own size, so that the name
 * does not stand out by its size, never under MEHNDI_DECOY_MIN_SIZE; where the writing is not a Latin name, MEHNDI_DECOY_PLAIN_SIZE.
 */
export function mehndiDecoySize(params: MehndiParams, latin: string | null): number {
  if (params.text !== "player" || !latin) return MEHNDI_DECOY_PLAIN_SIZE;
  return Math.max(writingSize(latin, MEHNDI_WRITING[params.target].width).fontSize, MEHNDI_DECOY_MIN_SIZE);
}

/** A run's box in its own frame, at its drawn size (the decorations' size times its scale): its ink from end to end, from its tallest stroke to its lowest. */
export function mehndiDecoyBox(decoy: MehndiDecoy, size: number): MehndiBox {
  const { width } = mehndiDecoyLayout(decoy.marks);
  const inks = decoy.marks.map((id) => MEHNDI_DECOY_MARKS[id].ink);
  return {
    left: (-width / 2) * size, right: (width / 2) * size,
    top: (WRITING_BASELINE - Math.max(...inks.map((ink) => ink.top))) * size,
    bottom: (WRITING_BASELINE - Math.min(...inks.map((ink) => ink.bottom))) * size,
  };
}

/**
 * The writing's box in its own frame (MEHNDI_WRITING's): the name as wide as it may be drawn (never wider than its room)
 * from its tall strokes to its tails; FARHANA over its row of marks; the letterless mark (illegible, or a name with no
 * Latin form).
 */
export function mehndiWritingBox(params: MehndiParams, latin: string | null): MehndiBox {
  if (params.text === "player" && latin) {
    const room = MEHNDI_WRITING[params.target].width;
    const { fontSize, squeeze } = writingSize(latin, room);
    const width = squeeze ? room : Math.min(room, writingWidth(latin).high * fontSize);
    return { left: -width / 2, right: width / 2, top: (WRITING_BASELINE - WRITING_ASCENT) * fontSize, bottom: (WRITING_BASELINE + WRITING_DESCENT) * fontSize };
  }
  return params.text === "farhana" ? { left: -27, right: 27, top: -9, bottom: 9.5 } : { left: -27, right: 27, top: -8.5, bottom: 9 };
}

/** A thing on the palm that can be pointed at by itself: a run of decorations, or the writing (`id` "writing"). */
export interface MehndiMark {
  id: string;
  /** The place pointing at it points at. */
  spot: MehndiSpot;
  x: number;
  y: number;
  rotate: number;
  box: MehndiBox;
}
export const MEHNDI_WRITING_MARK = "writing";

/** The things drawn for a play: the runs (the table's order), then the writing. */
export function mehndiMarks(params: MehndiParams, latin: string | null): MehndiMark[] {
  const size = mehndiDecoySize(params, latin);
  const writing = MEHNDI_WRITING[params.target];
  return [
    ...mehndiDecoysFor(params.target).map((decoy) => ({
      id: decoy.id, spot: decoy.place, x: decoy.x, y: decoy.y, rotate: decoy.rotate, box: mehndiDecoyBox(decoy, size * decoy.scale),
    })),
    { id: MEHNDI_WRITING_MARK, spot: params.target, x: writing.x, y: writing.y, rotate: writing.rotate, box: mehndiWritingBox(params, latin) },
  ];
}

/** How far a point (the hand's units) is from a thing's box: 0 inside it. */
export function mehndiMarkDistance(mark: MehndiMark, x: number, y: number): number {
  const angle = (-mark.rotate * Math.PI) / 180;
  const dx = x - mark.x;
  const dy = y - mark.y;
  const fx = dx * Math.cos(angle) - dy * Math.sin(angle);
  const fy = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.hypot(Math.max(mark.box.left - fx, 0, fx - mark.box.right), Math.max(mark.box.top - fy, 0, fy - mark.box.bottom));
}

/** The ring round a thing pointed at: centred on it, round all of its box, RING_CLEAR clear of it. */
export function mehndiMarkRing(mark: MehndiMark): { x: number; y: number; diameter: number } {
  const { left, right, top, bottom } = mark.box;
  return { x: mark.x, y: mark.y, diameter: 2 * (Math.hypot(Math.max(Math.abs(left), Math.abs(right)), Math.max(Math.abs(top), Math.abs(bottom))) + RING_CLEAR) };
}

/** What a point points at: a place (its index in MEHNDI_SPOTS), and the thing under the point, if it was on one. */
export interface MehndiPointed { spot: number; mark: MehndiMark | null }
const nearestMark = (marks: readonly MehndiMark[], x: number, y: number, within: number): MehndiMark | null => {
  let found: MehndiMark | null = null;
  let least = Infinity;
  for (const mark of marks) {
    const distance = mehndiMarkDistance(mark, x, y);
    if (distance <= within && distance < least) {
      found = mark;
      least = distance;
    }
  }
  return found;
};
/**
 * What a point (the hand's units) points at. First a thing whose box it is on (within MEHNDI_MARK_PAD; the nearest, the
 * earlier of two as near): the thing's place. Else the place within `reach`, as before. Else, for a finger on a small
 * palm (`pad` wider than MEHNDI_MARK_PAD), the thing within `pad`. The order is safe: every decoration lies further from
 * the writing's place than its reach, the writing's box (padded) lies beyond every other place's reach, and the wider pad
 * only counts where no place is within reach (marks.test.ts).
 */
export function mehndiPointAt(marks: readonly MehndiMark[], x: number, y: number, reach = MEHNDI_HIT, pad = MEHNDI_MARK_PAD): MehndiPointed | null {
  const on = nearestMark(marks, x, y, MEHNDI_MARK_PAD);
  if (on) return { spot: MEHNDI_SPOTS.indexOf(on.spot), mark: on };
  const spot = mehndiSpotAt(x, y, reach);
  if (spot !== null) return { spot, mark: null };
  const by = pad > MEHNDI_MARK_PAD ? nearestMark(marks, x, y, pad) : null;
  return by ? { spot: MEHNDI_SPOTS.indexOf(by.spot), mark: by } : null;
}

/** A wrong thing or place pointed at by hand: the place, and the thing's id (null: the place itself). */
export interface MehndiPointedAt { spot: number; markId: string | null }
/**
 * The dashed rings of the wrong places (the hand's units): one round each decoration pointed at (its own size) and one at
 * each place pointed at itself (`diameter` null: the stylesheet's), then one at each wrong place of the look that no point
 * by hand accounts for (「おまかせ」, a record). Never one at the writing's place.
 */
export function mehndiWrongRings(target: MehndiTarget, searched: readonly number[], pointed: readonly MehndiPointedAt[], marks: readonly MehndiMark[]):
  { key: string; x: number; y: number; diameter: number | null }[] {
  const writingSpot = MEHNDI_SPOTS.indexOf(target);
  const rings: { key: string; x: number; y: number; diameter: number | null }[] = [];
  const atPlace = (spot: number) => ({ key: `place-${spot}`, x: MEHNDI_PLACES[MEHNDI_SPOTS[spot]].x, y: MEHNDI_PLACES[MEHNDI_SPOTS[spot]].y, diameter: null });
  for (const { spot, markId } of pointed) {
    if (spot === writingSpot || rings.some((ring) => ring.key === (markId ?? `place-${spot}`))) continue;
    const mark = markId === null ? undefined : marks.find((item) => item.id === markId);
    rings.push(mark ? { key: mark.id, ...mehndiMarkRing(mark) } : atPlace(spot));
  }
  for (const spot of searched) {
    if (spot !== writingSpot && !pointed.some((item) => item.spot === spot) && !rings.some((ring) => ring.key === `place-${spot}`)) rings.push(atPlace(spot));
  }
  return rings;
}

/**
 * Where the central vine's line breaks (lit only, so the dark shows no gap to give anything away): behind the writing's
 * room where the writing lies on the vine, and behind each run drawn on it, each a box in that thing's own frame, the
 * room or the run at the largest size grown by MEHNDI_GAP_AIR. Always two (the feather's base and the vine's middle each
 * hold the writing or a run). Before 2026-11-17 one gap of 32 × 25 lay behind the writing: the vine's line came 0.7 into
 * the writing's room in the vine.
 */
export function mehndiVineGaps(target: MehndiTarget): { x: number; y: number; rotate: number; rect: { x: number; y: number; width: number; height: number } }[] {
  const grown = (box: MehndiBox) => ({
    x: box.left - MEHNDI_GAP_AIR, y: box.top - MEHNDI_GAP_AIR, width: box.right - box.left + 2 * MEHNDI_GAP_AIR, height: box.bottom - box.top + 2 * MEHNDI_GAP_AIR,
  });
  const writing = MEHNDI_WRITING[target];
  const room: MehndiBox = {
    left: -writing.width / 2, right: writing.width / 2,
    top: (WRITING_BASELINE - WRITING_ASCENT) * WRITING_MAX_SIZE, bottom: (WRITING_BASELINE + WRITING_DESCENT) * WRITING_MAX_SIZE,
  };
  return [
    ...(writing.onVine ? [{ x: writing.x, y: writing.y, rotate: writing.rotate, rect: grown(room) }] : []),
    ...mehndiDecoysFor(target).filter((decoy) => decoy.onVine)
      .map((decoy) => ({ x: decoy.x, y: decoy.y, rotate: decoy.rotate, rect: grown(mehndiDecoyBox(decoy, WRITING_MAX_SIZE * decoy.scale)) })),
  ];
}
