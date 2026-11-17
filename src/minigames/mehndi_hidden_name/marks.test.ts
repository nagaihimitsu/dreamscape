import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readOtf } from "../testing/otf-outlines";
import {
  MEHNDI_DECOY_MARKS, MEHNDI_DECOY_MIN_SIZE, MEHNDI_DECOY_PLAIN_SIZE, MEHNDI_DECOYS, MEHNDI_GAP_AIR, MEHNDI_HIT, MEHNDI_MARK_PAD, MEHNDI_PLACES, MEHNDI_WRITING,
  MEHNDI_WRITING_MARK, mehndiDecoyBox, mehndiDecoyGlyphs, mehndiDecoyLayout, mehndiDecoySize, mehndiDecoysFor, mehndiMarkDistance, mehndiMarkRing, mehndiMarks,
  mehndiNear, mehndiPointAt, mehndiPointing, mehndiVineGaps, mehndiWritingBox, mehndiWrongRings, type MehndiBox, type MehndiMark, type MehndiMarkId,
  type MehndiPointedAt,
} from "./marks";
import { MEHNDI_SPOTS, MEHNDI_TARGETS, type MehndiParams, type MehndiTarget } from "./rules";
import { WRITING_ASCENT, WRITING_BASELINE, WRITING_DESCENT, WRITING_MAX_SIZE, writingSize, writingWidth } from "./writing";

// The decorations that look like letters (round 4, 2026-11-17; docs/13 2.2, 2.10): what they are made of (measured from
// the font file itself), that no run spells anything, where they are drawn, their size, and what a point of the lamp or
// a finger points at with them on the palm. Where they lie against the hand's lines is skin.test.ts's (the shapes drawn).

const font = readOtf(readFileSync(new URL("./fonts/FasolSPDemo.otf", import.meta.url)));
const ids = Object.keys(MEHNDI_DECOY_MARKS) as MehndiMarkId[];
/** The writings a play may have, at a target: short, long and pressed names, a name with no Latin form, the mark, FARHANA. */
const writings = (target: MehndiTarget): { params: MehndiParams; latin: string | null }[] => [
  { params: { target, text: "player" }, latin: "Taichi" },
  { params: { target, text: "player" }, latin: "Masayoshi" },
  { params: { target, text: "player" }, latin: "Alexandria Konstantinopoulou" },
  { params: { target, text: "player" }, latin: null },
  { params: { target, text: "illegible" }, latin: "Taichi" },
  { params: { target, text: "farhana" }, latin: "Taichi" },
];
/** A point of a thing's own frame, in the hand's units. */
const toHand = (mark: Pick<MehndiMark, "x" | "y" | "rotate">, x: number, y: number): [number, number] => {
  const angle = (mark.rotate * Math.PI) / 180;
  return [mark.x + x * Math.cos(angle) - y * Math.sin(angle), mark.y + x * Math.sin(angle) + y * Math.cos(angle)];
};
/** Points over a box grown by `pad`, about every `step` (its edges and corners among them), in its own frame. */
const grid = (box: MehndiBox, pad = 0, step = 2): [number, number][] => {
  const along = (from: number, to: number) => Array.from({ length: Math.ceil((to - from) / step) + 1 }, (_, index) => Math.min(to, from + index * step));
  return along(box.left - pad, box.right + pad).flatMap((x) => along(box.top - pad, box.bottom + pad).map((y): [number, number] => [x, y]));
};
const spotOf = (name: (typeof MEHNDI_SPOTS)[number]) => MEHNDI_SPOTS.indexOf(name);

describe("the marks: Fasol SP letters laid over each other, mirrored or turned", () => {
  it("are the fifteen reviewed ones: letters a–z only, never one plain letter, read as consonants only", () => {
    expect(ids).toEqual(["hh", "kk", "ky", "km", "hz", "tk", "mk", "mh", "zx", "vx", "rv", "nz", "mz", "xz", "yx"]);
    const drawn = (id: MehndiMarkId) => MEHNDI_DECOY_MARKS[id].glyphs.map((glyph) => `${glyph.letter}${glyph.dx ? `@${glyph.dx}` : ""}${glyph.turn ? ` ${glyph.turn}` : ""}`);
    expect(Object.fromEntries(ids.map((id) => [id, drawn(id)]))).toEqual({
      hh: ["h", "h half"], kk: ["k", "k half"], ky: ["k", "y"], km: ["k mirror"], hz: ["h", "z"], tk: ["t@-0.157", "k"], mk: ["m", "k@0.1 mirror"],
      mh: ["m", "h half"], zx: ["z", "x"], vx: ["v", "x"], rv: ["r", "v"], nz: ["n", "z"], mz: ["m", "z"], xz: ["x", "z half"], yx: ["y", "x"],
    });
    for (const id of ids) {
      const { glyphs, readsAs } = MEHNDI_DECOY_MARKS[id];
      // Small letters the font draws (its unicode-range): never a digit or a mark (the demo draws an advert for those).
      for (const glyph of glyphs) expect(glyph.letter, id).toMatch(/^[a-z]$/u);
      // Two letters over each other, or one turned: never a letter as it is written.
      expect(glyphs.length > 1 || glyphs[0].turn !== undefined, id).toBe(true);
      // No vowel among what a glance might read: no run can read as a syllable, so never as a name or a part of one.
      expect(readsAs, id).toMatch(/^[bcdfghjklmnpqrstvwxyz]+$/u);
    }
  });

  it("have the ink the font's own glyphs give them (read from the file: outlines, advances, the turn as drawn)", () => {
    expect(font.unitsPerEm).toBe(1000);
    for (const id of ids) {
      const ink = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
      for (const { letter, dx, turn } of MEHNDI_DECOY_MARKS[id].glyphs) {
        const glyph = font.glyph(letter);
        // The glyph about its advance's centre (drawn with text-anchor middle), in em.
        const [left, right] = [(glyph.left - glyph.advance / 2) / 1000, (glyph.right - glyph.advance / 2) / 1000];
        const [bottom, top] = [glyph.bottom / 1000, glyph.top / 1000];
        // Mirrored about that centre; half-turned about it at the small letters' middle (WRITING_BASELINE above the baseline).
        const x = turn ? [dx - right, dx - left] : [dx + left, dx + right];
        const y = turn === "half" ? [2 * WRITING_BASELINE - top, 2 * WRITING_BASELINE - bottom] : [bottom, top];
        ink.left = Math.min(ink.left, x[0]);
        ink.right = Math.max(ink.right, x[1]);
        ink.bottom = Math.min(ink.bottom, y[0]);
        ink.top = Math.max(ink.top, y[1]);
      }
      for (const side of ["left", "right", "bottom", "top"] as const) expect(Math.abs(MEHNDI_DECOY_MARKS[id].ink[side] - ink[side]), `${id} ${side}`).toBeLessThan(0.0015);
    }
    // The reader reads the glyphs writing.ts measures the name by (its advances), and no mark reaches past the name's own
    // tall strokes and tails (so a run's box never outgrows a name's).
    for (const letter of "abcdefghijklmnopqrstuvwxyz") {
      expect(writingWidth(letter).high / 1.01, letter).toBeCloseTo(font.glyph(letter).advance / 1000, 6);
      expect(font.glyph(letter).top / 1000, letter).toBeLessThanOrEqual(WRITING_ASCENT);
      expect(font.glyph(letter).bottom / 1000, letter).toBeGreaterThanOrEqual(-WRITING_DESCENT);
    }
    for (const id of ids) {
      expect(MEHNDI_DECOY_MARKS[id].ink.top, id).toBeLessThanOrEqual(WRITING_ASCENT);
      // A half-turned tall stroke reaches lower than any tail (a run's box says so: mehndiDecoyBox).
      expect(MEHNDI_DECOY_MARKS[id].ink.bottom, id).toBeGreaterThanOrEqual(2 * WRITING_BASELINE - WRITING_ASCENT);
    }
  });
});

describe("the runs of marks", () => {
  /** Words written without a vowel (English, and noises): no run may hold one in what it might be read as. */
  const VOWELLESS_WORDS = ["my", "by", "fly", "sky", "thy", "why", "wry", "try", "cry", "dry", "fry", "gym", "hymn", "lynx", "myth", "nth", "ply", "pry", "shy",
    "sly", "spy", "sty", "sync", "tsk", "hmm", "hm", "mm", "zzz", "shh", "brr", "pfft", "psst", "crypt", "rhythm", "tryst", "nymph", "lymph", "glyph", "myrrh",
    "synth", "xyz"];

  it("spell nothing: two to four marks, none twice in a row, no vowelless word in any reading", () => {
    for (const { id, marks } of MEHNDI_DECOYS) {
      expect(marks.length, id).toBeGreaterThanOrEqual(2);
      expect(marks.length, id).toBeLessThanOrEqual(4);
      marks.forEach((mark, index) => expect(mark, `${id} ${index}`).not.toBe(marks[index - 1]));
      // Every way of reading the run: one of each mark's readings, in order.
      let readings = [""];
      for (const mark of marks) readings = readings.flatMap((read) => [...MEHNDI_DECOY_MARKS[mark].readsAs].map((letter) => read + letter));
      for (const reading of readings) for (const word of VOWELLESS_WORDS) expect(reading.includes(word), `${id} read as ${reading}: ${word}`).toBe(false);
    }
    expect(new Set(MEHNDI_DECOYS.map((decoy) => decoy.id)).size).toBe(MEHNDI_DECOYS.length);
  });

  it("are laid out as reviewed: each mark's origin, the run's width and its height (em)", () => {
    // 2026-11-17's review: [the marks' origins, the width, the box's top and bottom]; 0 the small letters' middle, y down.
    const reviewed: Record<string, [number[], number, number, number]> = {
      ring_finger: [[-0.276, 0.34], 1.152, -0.717, 0.18],
      middle_tip: [[-0.271, 0.342], 1.14, -0.717, 0.18],
      index_band: [[-0.417, 0.338], 1.437, -0.717, 0.717],
      pinky_finger: [[-0.338, 0.269], 1.14, -0.717, 0.18],
      pinky_palm: [[-0.616, -0.006, 0.611], 1.694, -0.717, 0.717],
      feather_base: [[-1.033, -0.424, 0.332, 1.028], 2.529, -0.717, 0.717],
      middle_low: [[-0.288, 0.429], 1.328, -0.717, 0.315],
      palm_top: [[-0.275, 0.34], 1.152, -0.717, 0.18],
      vine_room: [[-0.951, -0.334, 0.277, 0.884], 2.371, -0.717, 0.645],
      palm_left: [[-0.612, 0.006, 0.619], 1.694, -0.717, 0.717],
      palm_low: [[-0.417, 0.338], 1.437, -0.717, 0.645],
      thumb_room: [[-0.885, -0.273, 0.333, 0.95], 2.373, -0.717, 0.717],
      thumb_finger: [[-0.271, 0.342], 1.14, -0.717, 0.18],
      wrist_top: [[-0.616, 0, 0.618], 1.701, -0.717, 0.645],
    };
    expect(MEHNDI_DECOYS.map((decoy) => decoy.id)).toEqual(Object.keys(reviewed));
    for (const decoy of MEHNDI_DECOYS) {
      const [origins, width, top, bottom] = reviewed[decoy.id];
      const layout = mehndiDecoyLayout(decoy.marks);
      expect(layout.origins.length, decoy.id).toBe(origins.length);
      layout.origins.forEach((origin, index) => expect(Math.abs(origin - origins[index]), `${decoy.id} ${index}`).toBeLessThanOrEqual(0.0015));
      expect(Math.abs(layout.width - width), decoy.id).toBeLessThanOrEqual(0.0015);
      // At its largest (the name's largest size times its scale), in the hand's units.
      const size = WRITING_MAX_SIZE * decoy.scale;
      const box = mehndiDecoyBox(decoy, size);
      expect(box.right - box.left, decoy.id).toBeCloseTo(width * size, 1);
      expect(box.left, decoy.id).toBeCloseTo(-box.right, 9);
      expect(Math.abs(box.top - top * size), decoy.id).toBeLessThanOrEqual(0.05);
      expect(Math.abs(box.bottom - bottom * size), decoy.id).toBeLessThanOrEqual(0.05);
      // The glyphs as drawn: each mark's letters about its origin.
      const glyphs = mehndiDecoyGlyphs(decoy);
      expect(glyphs.map((glyph) => glyph.letter).join(""), decoy.id).toBe(decoy.marks.flatMap((mark) => MEHNDI_DECOY_MARKS[mark].glyphs.map((glyph) => glyph.letter)).join(""));
      let at = 0;
      decoy.marks.forEach((mark, index) => {
        for (const glyph of MEHNDI_DECOY_MARKS[mark].glyphs) {
          expect(glyphs[at].x, `${decoy.id} ${mark}`).toBeCloseTo(layout.origins[index] + glyph.dx, 9);
          expect(glyphs[at].turn, `${decoy.id} ${mark}`).toBe(glyph.turn);
          at += 1;
        }
      });
    }
  });

  it("are drawn where the writing is not: all but its own place's, a name-long run in each room it leaves empty", () => {
    const drawn = (target: MehndiTarget) => mehndiDecoysFor(target).map((decoy) => decoy.id);
    expect(drawn("thumb")).toEqual(["ring_finger", "middle_tip", "index_band", "pinky_finger", "pinky_palm", "feather_base", "middle_low", "palm_top", "vine_room",
      "palm_left", "palm_low", "wrist_top"]);
    expect(drawn("peacock")).toEqual(["ring_finger", "middle_tip", "index_band", "pinky_finger", "pinky_palm", "vine_room", "palm_left", "palm_low", "thumb_room",
      "thumb_finger", "wrist_top"]);
    expect(drawn("vine")).toEqual(["ring_finger", "middle_tip", "index_band", "pinky_finger", "pinky_palm", "feather_base", "middle_low", "palm_top", "thumb_room",
      "thumb_finger", "wrist_top"]);
    const rooms: Record<MehndiTarget, string> = { thumb: "thumb_room", peacock: "feather_base", vine: "vine_room" };
    for (const target of MEHNDI_TARGETS) {
      for (const decoy of mehndiDecoysFor(target)) expect(decoy.place, `${target} ${decoy.id}`).not.toBe(target);
      for (const other of MEHNDI_TARGETS) expect(drawn(target).includes(rooms[other]), `${target} ${rooms[other]}`).toBe(other !== target);
      // A room's run lies where the writing would, and is about as long as a name in the room (four marks, most of the room).
      const run = MEHNDI_DECOYS.find((decoy) => decoy.id === rooms[target])!;
      const room = MEHNDI_WRITING[target];
      expect(Math.hypot(run.x - room.x, run.y - room.y), target).toBeLessThanOrEqual(8);
      expect(run.rotate, target).toBe(room.rotate);
      expect(run.marks.length, target).toBe(4);
      expect(mehndiDecoyLayout(run.marks).width * WRITING_MAX_SIZE, target).toBeGreaterThan(room.width * 0.6);
      expect(mehndiDecoyLayout(run.marks).width * WRITING_MAX_SIZE, target).toBeLessThanOrEqual(room.width);
    }
  });

  it("take the name's size (never smaller than reads as letters), or a middling one where no name is written", () => {
    const thumb: MehndiParams = { target: "thumb", text: "player" };
    expect(mehndiDecoySize(thumb, "Taichi")).toBe(16);
    const long = mehndiDecoySize(thumb, "Masayoshi");
    expect(long).toBe(writingSize("Masayoshi", MEHNDI_WRITING.thumb.width).fontSize);
    expect(long).toBeLessThan(16);
    expect(long).toBeGreaterThan(MEHNDI_DECOY_MIN_SIZE);
    // The same name in a wider room is larger, and the decorations with it.
    expect(mehndiDecoySize({ target: "vine", text: "player" }, "Masayoshi")).toBeGreaterThan(long);
    expect(mehndiDecoySize(thumb, "Alexandria Konstantinopoulou")).toBe(MEHNDI_DECOY_MIN_SIZE);
    expect(MEHNDI_DECOY_MIN_SIZE).toBe(9);
    expect(MEHNDI_DECOY_PLAIN_SIZE).toBe(14);
    for (const target of MEHNDI_TARGETS) {
      expect(mehndiDecoySize({ target, text: "player" }, null), target).toBe(14);
      expect(mehndiDecoySize({ target, text: "illegible" }, "Taichi"), target).toBe(14);
      expect(mehndiDecoySize({ target, text: "farhana" }, "Taichi"), target).toBe(14);
    }
    // A run's own size is that times its scale, and its box shrinks about its centre with it.
    for (const decoy of MEHNDI_DECOYS) {
      expect(decoy.scale, decoy.id).toBeGreaterThanOrEqual(0.8);
      expect(decoy.scale, decoy.id).toBeLessThanOrEqual(1);
      const [large, small] = [mehndiDecoyBox(decoy, 16 * decoy.scale), mehndiDecoyBox(decoy, 9 * decoy.scale)];
      for (const side of ["left", "top"] as const) expect(small[side], decoy.id).toBeGreaterThan(large[side]);
      for (const side of ["right", "bottom"] as const) expect(small[side], decoy.id).toBeLessThan(large[side]);
    }
  });
});

describe("what a point points at", () => {
  it("a decoration points at its own place, a wrong one, and never stirs her hand", () => {
    for (const target of MEHNDI_TARGETS) for (const { params, latin } of writings(target)) {
      const marks = mehndiMarks(params, latin);
      const label = `${target} ${params.text} ${latin}`;
      // The runs drawn, then the writing.
      expect(marks.map((mark) => mark.id), label).toEqual([...mehndiDecoysFor(target).map((decoy) => decoy.id), MEHNDI_WRITING_MARK]);
      for (const mark of marks.slice(0, -1)) {
        expect(mark.spot, `${label} ${mark.id}`).not.toBe(target);
        // On the run (its centre, its corners, all over its box): the run, and the place it belongs to.
        for (const [fx, fy] of [[0, 0] as [number, number], ...grid(mark.box)]) {
          const [x, y] = toHand(mark, fx, fy);
          expect(mehndiMarkDistance(mark, x, y), `${label} ${mark.id}`).toBeLessThan(1e-9);
          expect(mehndiPointAt(marks, x, y), `${label} ${mark.id} ${fx},${fy}`).toEqual({ spot: spotOf(mark.spot), mark });
          // Her hand's hot and cold fires only near the writing's place: never with the lamp on a decoration.
          expect(mehndiNear(x, y, target), `${label} ${mark.id} ${fx},${fy}`).toBe(false);
        }
        // Just off it (the lamp's aim, within MEHNDI_MARK_PAD): the run, or another as near; a wrong place either way.
        for (const [fx, fy] of grid(mark.box, MEHNDI_MARK_PAD * 0.7)) {
          const [x, y] = toHand(mark, fx, fy);
          const at = mehndiPointAt(marks, x, y);
          expect(at?.mark, `${label} ${mark.id} ${fx},${fy}`).not.toBeNull();
          expect(at!.spot, `${label} ${mark.id} ${fx},${fy}`).not.toBe(spotOf(target));
          expect(at!.spot, `${label} ${mark.id} ${fx},${fy}`).toBe(spotOf(at!.mark!.spot));
          if (at!.mark !== mark) expect(mehndiMarkDistance(at!.mark!, x, y)).toBeLessThanOrEqual(mehndiMarkDistance(mark, x, y));
          expect(mehndiNear(x, y, target), `${label} ${mark.id} ${fx},${fy}`).toBe(false);
        }
      }
    }
  });

  it("the writing is pointed at on its letters, wherever it lies (a tap on the name's first letter at the thumb did nothing)", () => {
    for (const target of MEHNDI_TARGETS) for (const { params, latin } of writings(target)) {
      const marks = mehndiMarks(params, latin);
      const writing = marks[marks.length - 1];
      const label = `${target} ${params.text} ${latin}`;
      expect(writing).toMatchObject({ id: MEHNDI_WRITING_MARK, spot: target, x: MEHNDI_WRITING[target].x, y: MEHNDI_WRITING[target].y, rotate: MEHNDI_WRITING[target].rotate });
      expect(writing.box).toEqual(mehndiWritingBox(params, latin));
      // A name is never wider than its room (the mark and FARHANA are as wide as they are drawn: 54).
      expect(writing.box.right, label).toBeLessThanOrEqual(params.text === "player" && latin ? MEHNDI_WRITING[target].width / 2 : 27);
      expect(writing.box.left, label).toBe(-writing.box.right);
      for (const [fx, fy] of grid(writing.box, MEHNDI_MARK_PAD * 0.7)) {
        const [x, y] = toHand(writing, fx, fy);
        expect(mehndiPointAt(marks, x, y), `${label} ${fx},${fy}`).toEqual({ spot: spotOf(target), mark: writing });
      }
    }
    // The name's box: its drawn width (as wide as it may be) and its size's tall strokes and tails; a pressed name fills its room.
    const taichi = mehndiWritingBox({ target: "thumb", text: "player" }, "Taichi");
    expect(taichi.right * 2).toBeCloseTo(writingWidth("Taichi").high * 16, 9);
    expect(taichi.top).toBeCloseTo((WRITING_BASELINE - WRITING_ASCENT) * 16, 9);
    expect(taichi.bottom).toBeCloseTo((WRITING_BASELINE + WRITING_DESCENT) * 16, 9);
    expect(mehndiWritingBox({ target: "thumb", text: "player" }, "Alexandria Konstantinopoulou")).toMatchObject({ left: -26, right: 26 });
    // 2026-11-17: a tap on the T of Taichi at the thumb, 39.8 from the thumb's place and 47 from the vine's, was a dead tap.
    const thumb = mehndiMarks({ target: "thumb", text: "player" }, "Taichi");
    expect(Math.hypot(183 - MEHNDI_PLACES.thumb.x, 323 - MEHNDI_PLACES.thumb.y)).toBeGreaterThan(MEHNDI_HIT);
    expect(mehndiPointAt(thumb, 183, 323)).toEqual({ spot: spotOf("thumb"), mark: thumb[thumb.length - 1] });
    // No other place's reach comes to the writing's room (padded), at its largest: a point on the writing never points elsewhere,
    // whichever of the two a point is tried against first.
    for (const target of MEHNDI_TARGETS) {
      const room = MEHNDI_WRITING[target];
      const box: MehndiBox = {
        left: -room.width / 2, right: room.width / 2, top: (WRITING_BASELINE - WRITING_ASCENT) * WRITING_MAX_SIZE, bottom: (WRITING_BASELINE + WRITING_DESCENT) * WRITING_MAX_SIZE,
      };
      for (const [fx, fy] of grid(box, MEHNDI_MARK_PAD, 1)) {
        const [x, y] = toHand(room, fx, fy);
        for (const spot of MEHNDI_SPOTS) {
          if (spot !== target) expect(Math.hypot(MEHNDI_PLACES[spot].x - x, MEHNDI_PLACES[spot].y - y), `${target} ${spot} ${fx},${fy}`).toBeGreaterThan(MEHNDI_HIT);
        }
      }
    }
  });

  it("a place is pointed at as before where no thing lies, and the nearer thing wins where two are as near", () => {
    const marks = mehndiMarks({ target: "thumb", text: "player" }, "Taichi");
    expect(mehndiPointAt(marks, 204, 104)).toEqual({ spot: spotOf("index"), mark: null });
    expect(mehndiPointAt(marks, 214, 298)).toEqual({ spot: spotOf("thumb"), mark: null });
    expect(mehndiPointAt(marks, 150, 392)).toEqual({ spot: spotOf("wrist"), mark: null });
    expect(mehndiPointAt(marks, 20, 20)).toBeNull();
    expect(mehndiPointAt(marks, 150, 60)).toBeNull();
    // With no things at all, it is the place within reach (the look as it was).
    expect(mehndiPointAt([], 214, 298 + MEHNDI_HIT - 1)).toEqual({ spot: spotOf("thumb"), mark: null });
    expect(mehndiPointAt([], 214, 298 + MEHNDI_HIT + 1)).toBeNull();
    // A thing first, even within a place's reach: the run above the wrist lies within reach of no place but is found on its box;
    // the run at the feather's base lies on the peacock's place.
    const base = marks.find((mark) => mark.id === "feather_base")!;
    expect(mehndiPointAt(marks, MEHNDI_PLACES.peacock.x, MEHNDI_PLACES.peacock.y + 8)).toEqual({ spot: spotOf("peacock"), mark: base });
    const two: MehndiMark[] = [
      { id: "a", spot: "index", x: 100, y: 100, rotate: 0, box: { left: -5, right: 5, top: -5, bottom: 5 } },
      { id: "b", spot: "pinky", x: 116, y: 100, rotate: 0, box: { left: -5, right: 5, top: -5, bottom: 5 } },
    ];
    expect(mehndiPointAt(two, 107, 100)?.mark?.id).toBe("a");
    expect(mehndiPointAt(two, 109, 100)?.mark?.id).toBe("b");
    // As near: the earlier in the list.
    expect(mehndiPointAt(two, 108, 100)?.mark?.id).toBe("a");
    // A turned box is measured in its own frame.
    const turned: MehndiMark = { id: "t", spot: "wrist", x: 100, y: 300, rotate: 90, box: { left: -10, right: 10, top: -2, bottom: 2 } };
    expect(mehndiMarkDistance(turned, 100, 309)).toBe(0);
    expect(mehndiMarkDistance(turned, 109, 300)).toBeCloseTo(7, 9);
  });

  it("a key points at what lies at its place: that place always, and the run laid on it where there is one", () => {
    // Enter or Space on a place's button points at the place's own point (Skin.tsx), where Tab brought the lamp.
    const on: Record<string, string[]> = {};
    for (const target of MEHNDI_TARGETS) for (const { params, latin } of writings(target)) {
      const marks = mehndiMarks(params, latin);
      MEHNDI_SPOTS.forEach((spot, index) => {
        const at = mehndiPointAt(marks, MEHNDI_PLACES[spot].x, MEHNDI_PLACES[spot].y);
        const label = `${target} ${params.text} ${latin} ${spot}`;
        // Never another place: a key on the writing's place finds it, a key on another never does.
        expect(at?.spot, label).toBe(index);
        if (at?.mark) expect(at.mark.spot, label).toBe(spot);
        if (at?.mark && at.mark.id !== MEHNDI_WRITING_MARK) (on[`${target} ${spot}`] ??= []).push(at.mark.id);
      });
    }
    // The runs in the two rooms the writing is not in lie on their places (2026-11-17 review: by keys she said 「そこは、
    // 孔雀の羽だけ」 with a run of decorations lit there): her word is about the run, whatever the writing is (six writings).
    expect(Object.fromEntries(Object.entries(on).map(([key, ids]) => [key, [...new Set(ids)]]))).toEqual({
      "thumb peacock": ["feather_base"], "thumb vine": ["vine_room"], "peacock vine": ["vine_room"], "vine peacock": ["feather_base"],
    });
    for (const ids of Object.values(on)) expect(ids).toHaveLength(6);
  });

  it("a finger on a small palm finds a decoration a finger's width away, where no place is within its reach", () => {
    // The palm's width (px) on a 320 × 568 phone (the play's height bounds it), on a 320px-wide and on a 390px-wide one.
    for (const width of [223, 288, 358]) {
      const reach = Math.max(MEHNDI_HIT, (22 * 300) / width);
      const pad = Math.max(MEHNDI_MARK_PAD, (16 * 300) / width);
      expect(pad).toBeGreaterThan(MEHNDI_MARK_PAD);
      for (const target of MEHNDI_TARGETS) for (const { params, latin } of writings(target)) {
        const marks = mehndiMarks(params, latin);
        const label = `${width} ${target} ${params.text} ${latin}`;
        let beyond = 0;
        for (const mark of marks.slice(0, -1)) {
          // A run with a finger's pad on each side is a target of about a fingertip: 44px across or more on a 390px phone
          // (a 358px palm; 43.99 for the shortest run beside the letterless mark), 41px or more on a 320px-wide one and
          // 39px on a 320 × 568 one, at the size of a name of up to about eight letters; never under 36px (the smallest
          // size, beside a pressed long name). The pad is no wider: on a palm of 288px or more, a tap just outside the
          // reach of the writing's place then never counts as the nearest decoration (each lies 47 or more from that place).
          const across = (side: number) => ((side + 2 * pad) * width) / 300;
          const least = Math.min(across(mark.box.right - mark.box.left), across(mark.box.bottom - mark.box.top));
          expect(least, `${label} ${mark.id}`).toBeGreaterThanOrEqual(mehndiDecoySize(params, latin) < MEHNDI_DECOY_PLAIN_SIZE ? 36 : { 223: 39, 288: 41, 358: 43.9 }[width]!);
          if (width >= 288) expect(MEHNDI_HIT + pad, `${label} ${mark.id}`).toBeLessThan(47);
          for (const [fx, fy] of grid(mark.box, pad * 0.99, 3)) {
            const [x, y] = toHand(mark, fx, fy);
            const at = mehndiPointAt(marks, x, y, reach, pad);
            const placeNear = MEHNDI_SPOTS.some((spot) => Math.hypot(MEHNDI_PLACES[spot].x - x, MEHNDI_PLACES[spot].y - y) <= reach);
            const distance = mehndiMarkDistance(mark, x, y);
            if (distance > pad) continue;
            // A finger's width from the run: never a dead tap. A place within reach is that place (on a palm of 288px or
            // more never the writing's: the run lies beyond its reach and this pad); else the run, or a thing nearer still.
            expect(at, `${label} ${mark.id} ${fx},${fy}`).not.toBeNull();
            if (placeNear) {
              if (width >= 288) expect(at!.spot, `${label} ${mark.id} ${fx},${fy}`).not.toBe(spotOf(target));
              continue;
            }
            beyond += 1;
            expect(at!.mark, `${label} ${mark.id} ${fx},${fy}`).not.toBeNull();
            if (at!.mark === mark) expect(at!.spot, `${label} ${mark.id} ${fx},${fy}`).toBe(spotOf(mark.spot));
            else expect(mehndiMarkDistance(at!.mark!, x, y), `${label} ${mark.id} ${fx},${fy}`).toBeLessThanOrEqual(distance);
          }
        }
        expect(beyond, label).toBeGreaterThan(100);
        expect(mehndiPointAt(marks, 20, 20, reach, pad), label).toBeNull();
        expect(mehndiPointAt(marks, 150, 60, reach, pad), label).toBeNull();
        expect(mehndiPointAt(marks, MEHNDI_PLACES[target].x, MEHNDI_PLACES[target].y, reach, pad)?.spot, label).toBe(spotOf(target));
        // The writing too: a finger's width off its letters, even beyond its place's reach, is the writing, unless
        // another place is within the finger's reach (as before) or a decoration is nearer the finger.
        const writing = marks[marks.length - 1];
        let found = 0;
        for (const [fx, fy] of grid(writing.box, pad * 0.99, 3)) {
          const [x, y] = toHand(writing, fx, fy);
          const distance = mehndiMarkDistance(writing, x, y);
          if (distance > pad) continue;
          const at = mehndiPointAt(marks, x, y, reach, pad);
          expect(at, `${label} writing ${fx},${fy}`).not.toBeNull();
          if (at!.spot === spotOf(target)) found += 1;
          else if (at!.mark) expect(mehndiMarkDistance(at!.mark, x, y), `${label} writing ${fx},${fy}`).toBeLessThan(distance);
          else expect(Math.hypot(MEHNDI_PLACES[MEHNDI_SPOTS[at!.spot]].x - x, MEHNDI_PLACES[MEHNDI_SPOTS[at!.spot]].y - y), `${label} writing ${fx},${fy}`).toBeLessThanOrEqual(reach);
        }
        expect(found, label).toBeGreaterThan(50);
      }
    }
  });
});

// What pointing at a thing or a place does (the field's decision: Skin.tsx's pointAt only carries it out). 2026-11-17
// review: with the decision in the field, a decoration that counted as the writing, or a tap that saw no decorations,
// passed every test.
describe("what pointing does to the look", () => {
  const thumb: MehndiParams = { target: "thumb", text: "player" };
  const marks = mehndiMarks(thumb, "Taichi");
  const on = (id: string) => ({ spot: spotOf(marks.find((mark) => mark.id === id)!.spot), mark: marks.find((mark) => mark.id === id)! });
  const place = (name: (typeof MEHNDI_SPOTS)[number]) => ({ spot: spotOf(name), mark: null });
  /** A look played through `mehndiPointing`: the places searched, the wrong things remembered, and each point's result. */
  const look = (target: MehndiTarget, points: { spot: number; mark: MehndiMark | null }[], all = marks) => {
    const searched: number[] = [];
    const pointed: MehndiPointedAt[] = [];
    const results = points.map((hit) => {
      const result = mehndiPointing(target, searched, pointed, all, hit);
      if (result.ring) pointed.push(result.ring);
      if (result.search !== null) searched.push(result.search);
      return result;
    });
    return { searched, pointed, results };
  };

  it("the writing, on its letters or at its place, is the find; a decoration never is", () => {
    expect(mehndiPointing("thumb", [], [], marks, on(MEHNDI_WRITING_MARK))).toEqual({ search: spotOf("thumb"), ring: null, count: 0 });
    expect(mehndiPointing("thumb", [], [], marks, place("thumb"))).toEqual({ search: spotOf("thumb"), ring: null, count: 0 });
    // After wrong things too: the find searches the writing's place, and adds no ring.
    expect(mehndiPointing("thumb", [spotOf("index")], [{ spot: spotOf("index"), markId: "middle_tip" }], marks, on(MEHNDI_WRITING_MARK)))
      .toEqual({ search: spotOf("thumb"), ring: null, count: 1 });
    for (const target of MEHNDI_TARGETS) for (const { params, latin } of writings(target)) {
      const all = mehndiMarks(params, latin);
      for (const mark of all.slice(0, -1)) {
        const result = mehndiPointing(target, [], [], all, { spot: spotOf(mark.spot), mark });
        // A wrong place of the look (the outcome can no longer be `found`), ringed round the run, the first wrong thing.
        expect(result, `${target} ${params.text} ${mark.id}`).toEqual({ search: spotOf(mark.spot), ring: { spot: spotOf(mark.spot), markId: mark.id }, count: 1 });
        expect(result.search, `${target} ${mark.id}`).not.toBe(spotOf(target));
      }
    }
  });

  it("counts the wrong things pointed at, each once, whichever places they belong to (her words follow the count)", () => {
    // 2026-11-17 review, at the thumb: the middle finger's run, the little finger's, then three more of places already counted.
    const { searched, pointed, results } = look("thumb", [on("middle_tip"), on("pinky_finger"), on("ring_finger"), on("index_band"), on("pinky_palm"), on("feather_base")]);
    expect(results.map((result) => result.count)).toEqual([1, 2, 3, 4, 5, 6]);
    // The look counts a place once (the rules: the outcome and the record), her words every new wrong thing.
    expect(results.map((result) => result.search)).toEqual([spotOf("index"), spotOf("pinky"), null, null, null, spotOf("peacock")]);
    expect(searched).toEqual([spotOf("index"), spotOf("pinky"), spotOf("peacock")]);
    expect(results.every((result) => result.ring !== null)).toBe(true);
    expect(pointed.map((item) => item.markId)).toEqual(["middle_tip", "pinky_finger", "ring_finger", "index_band", "pinky_palm", "feather_base"]);
    // The count is the dashed rings shown.
    expect(mehndiWrongRings("thumb", searched, pointed, marks)).toHaveLength(6);
  });

  it("a wrong thing pointed at again is not a new one: no search, no ring, the count as it was", () => {
    const { results } = look("thumb", [on("middle_tip"), on("middle_tip"), place("index"), place("index"), on("ring_finger"), on("middle_tip")]);
    expect(results).toEqual([
      { search: spotOf("index"), ring: { spot: spotOf("index"), markId: "middle_tip" }, count: 1 },
      { search: null, ring: null, count: 1 },
      // The place itself (a key, or a point beside its runs) is another thing than its runs.
      { search: null, ring: { spot: spotOf("index"), markId: null }, count: 2 },
      { search: null, ring: null, count: 2 },
      { search: null, ring: { spot: spotOf("index"), markId: "ring_finger" }, count: 3 },
      { search: null, ring: null, count: 3 },
    ]);
  });

  it("counts a wrong place of 「おまかせ」 (searched, pointed at by no hand) as one wrong thing", () => {
    // The place's ring stands for it; pointing at the place itself again is not a new thing, a run of it is.
    expect(mehndiPointing("thumb", [spotOf("index")], [], marks, place("index"))).toEqual({ search: null, ring: null, count: 1 });
    expect(mehndiPointing("thumb", [spotOf("index")], [], marks, place("wrist"))).toEqual({ search: spotOf("wrist"), ring: { spot: spotOf("wrist"), markId: null }, count: 2 });
    // A run of that place takes the place's ring's part (mehndiWrongRings): still one wrong thing.
    expect(mehndiPointing("thumb", [spotOf("index")], [], marks, on("middle_tip"))).toEqual({ search: null, ring: { spot: spotOf("index"), markId: "middle_tip" }, count: 1 });
  });
});

describe("the rings and the vine's gaps", () => {
  const thumb: MehndiParams = { target: "thumb", text: "player" };
  const marks = mehndiMarks(thumb, "Taichi");
  const mark = (id: string) => marks.find((item) => item.id === id)!;

  it("rings each decoration pointed at round the decoration, and a place pointed at itself at the place", () => {
    // Two runs of one place (the index finger's): two rings, each round its run, as wide as the run asks.
    const rings = mehndiWrongRings("thumb", [spotOf("index")], [{ spot: spotOf("index"), markId: "ring_finger" }, { spot: spotOf("index"), markId: "middle_tip" }], marks);
    expect(rings).toEqual([
      { key: "ring_finger", ...mehndiMarkRing(mark("ring_finger")) },
      { key: "middle_tip", ...mehndiMarkRing(mark("middle_tip")) },
    ]);
    for (const id of ["ring_finger", "middle_tip", "feather_base", "wrist_top"]) {
      const { box, x, y } = mark(id);
      const ring = mehndiMarkRing(mark(id));
      expect([ring.x, ring.y], id).toEqual([x, y]);
      // Round all of its box, a few units clear of it.
      for (const cornerX of [box.left, box.right]) for (const cornerY of [box.top, box.bottom]) expect(Math.hypot(cornerX, cornerY), id).toBeLessThanOrEqual(ring.diameter / 2 - 3.9);
      expect(ring.diameter, id).toBeLessThan(60);
    }
    // 「おまかせ」 or a key: the place (the stylesheet's width).
    expect(mehndiWrongRings("thumb", [spotOf("index"), spotOf("wrist")], [], marks)).toEqual([
      { key: `place-${spotOf("index")}`, x: 204, y: 104, diameter: null }, { key: `place-${spotOf("wrist")}`, x: 150, y: 392, diameter: null },
    ]);
    expect(mehndiWrongRings("thumb", [spotOf("pinky")], [{ spot: spotOf("pinky"), markId: null }], marks)).toEqual([{ key: `place-${spotOf("pinky")}`, x: 88, y: 204, diameter: null }]);
    // A place pointed at itself keeps its ring after one of its runs is pointed at; each thing once.
    const both = mehndiWrongRings("thumb", [spotOf("pinky")], [
      { spot: spotOf("pinky"), markId: null }, { spot: spotOf("pinky"), markId: "pinky_palm" }, { spot: spotOf("pinky"), markId: "pinky_palm" },
    ], marks);
    expect(both.map((ring) => ring.key)).toEqual([`place-${spotOf("pinky")}`, "pinky_palm"]);
    // The writing's place is never ringed as wrong, found on its letters or at its place.
    expect(mehndiWrongRings("thumb", [spotOf("index"), spotOf("thumb")], [{ spot: spotOf("thumb"), markId: MEHNDI_WRITING_MARK }, { spot: spotOf("thumb"), markId: null }], marks))
      .toEqual([{ key: `place-${spotOf("index")}`, x: 204, y: 104, diameter: null }]);
    expect(mehndiWrongRings("thumb", [], [], marks)).toEqual([]);
  });

  it("breaks the central vine behind the two things laid on it, whatever the writing: each thing's box at its largest, grown", () => {
    for (const target of MEHNDI_TARGETS) {
      const gaps = mehndiVineGaps(target);
      expect(gaps, target).toHaveLength(2);
      // At the feather's base and in the vine's middle: the writing's room where it is, the room's run where it is not.
      const expected = (["peacock", "vine"] as const).map((room) => {
        const run = MEHNDI_DECOYS.find((decoy) => decoy.id === (room === "peacock" ? "feather_base" : "vine_room"))!;
        const at = room === target ? MEHNDI_WRITING[room] : run;
        const box: MehndiBox = room === target
          ? { left: -MEHNDI_WRITING[room].width / 2, right: MEHNDI_WRITING[room].width / 2, top: (WRITING_BASELINE - WRITING_ASCENT) * 16, bottom: (WRITING_BASELINE + WRITING_DESCENT) * 16 }
          : mehndiDecoyBox(run, 16 * run.scale);
        return {
          x: at.x, y: at.y, rotate: at.rotate,
          rect: { x: box.left - MEHNDI_GAP_AIR, y: box.top - MEHNDI_GAP_AIR, width: box.right - box.left + 2 * MEHNDI_GAP_AIR, height: box.bottom - box.top + 2 * MEHNDI_GAP_AIR },
        };
      });
      expect([...gaps].sort((a, b) => a.y - b.y), target).toEqual(expected);
    }
    expect(MEHNDI_GAP_AIR).toBe(2.5);
    expect(MEHNDI_DECOYS.filter((decoy) => decoy.onVine).map((decoy) => decoy.id)).toEqual(["feather_base", "vine_room"]);
  });
});
