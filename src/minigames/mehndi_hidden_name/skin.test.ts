import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGameNames } from "../contract";
import type { SearchView } from "../engines/search/EnginePlay";
import { mehndiHiddenName } from "./definition";
import { MEHNDI_SPOTS, MEHNDI_TARGETS, mehndiSetup, type MehndiParams, type MehndiTarget } from "./rules";
import {
  MEHNDI_FEATHER, MEHNDI_FEATHER_GAP, MEHNDI_HIT, MEHNDI_PALM, MEHNDI_PLACES, MEHNDI_SPIRAL, MEHNDI_WRITING, mehndiSkin, mehndiSpotAt, mehndiWritingRing,
} from "./Skin";
import { WRITING_ASCENT, WRITING_BASELINE, WRITING_DESCENT, WRITING_MAX_SIZE } from "./writing";

// The hidden name's field (docs/13 2.10, 2.12–2.13): the player's name in Latin letters in the Fasol SP hand (the user's
// decisions of 2026-11-16, no Japanese letters in the pattern, and 2026-11-17, the font), as text (never HTML), or no
// letters at all without a Latin form;
// an illegible mark with no letters where the story says Hindi, six places as buttons named by the pattern, and the use's
// art in its slots. The player's name as typed is kana here: it must never be drawn.
const view: SearchView = { total: 1, round: 0, searched: [], done: [], presses: {}, last: null, roundAt: 0, nudge: null, ending: null };
const field = (params: MehndiParams, latin: Pick<MiniGameNames, "playerLatin"> = { playerLatin: "Haruto" }, art: Record<string, string> = {},
  shown: SearchView = view) =>
  renderToStaticMarkup(createElement(mehndiSkin.Field, {
    params, still: false, seed: 1, cast: { heroine: null }, names: { player: "はると", heroine: "ヒロイン", ...latin }, art, sound: () => undefined,
    vibrate: () => undefined, setup: mehndiSetup(params), view: shown, live: true, search: () => undefined, active: () => undefined, frames: () => () => undefined,
  }));
/** The name's text element in the Fasol SP hand and what it says, if one is drawn. */
const lettering = (html: string) => html.match(/<text class="mg-mehndi-hidden-name-writing mg-mehndi-hidden-name-lettering"[^>]*>([^<]*)<\/text>/u);
const japanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

describe("the hidden name's field", () => {
  it("writes the player's name in Latin letters in the Fasol SP hand, never the name as typed", () => {
    const html = field({ target: "thumb", text: "player" }, { playerLatin: "Taichi" });
    expect(html).toContain('class="mg-mehndi-hidden-name"');
    const writing = lettering(html);
    expect(writing?.[1]).toBe("Taichi");
    expect(writing?.[0]).not.toMatch(japanese);
    // A short name at the largest size, unpressed (only a long one is pressed to its room), its small letters centred on
    // the place (the baseline 0.18 of the size under it).
    expect(writing?.[0]).toContain('font-size="16"');
    expect(writing?.[0]).toContain('y="2.88"');
    expect(writing?.[0]).not.toContain("textLength");
    expect(html).not.toContain("はると");
    for (const target of ["peacock", "vine"] as const) expect(lettering(field({ target, text: "player" }, { playerLatin: "Taichi" }))?.[1], target).toBe("Taichi");
    // A long name only ever pressed narrower, to the room (the thumb's 52 units), at the smallest size.
    const long = lettering(field({ target: "thumb", text: "player" }, { playerLatin: "Alexandria Konstantinopoulou" }))?.[0];
    expect(long).toContain('font-size="6"');
    expect(long).toContain(`textLength="${MEHNDI_WRITING.thumb.width}"`);
    expect(long).toContain('lengthAdjust="spacingAndGlyphs"');
    // A hyphen or an apostrophe stays in the name (the stylesheet leaves it to the fallback, never the demo's advert).
    for (const name of ["Jan-Poru", "O'Brien"]) expect(lettering(field({ target: "vine", text: "player" }, { playerLatin: name }))?.[1], name).toBe(name.replace("'", "&#x27;"));
  });

  it("writes the Latin name as text, never as HTML", () => {
    const html = field({ target: "thumb", text: "player" }, { playerLatin: "<b>Haru</b>" });
    expect(lettering(html)?.[1]).toBe("&lt;b&gt;Haru&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("draws the letterless mark at the target when the name has no Latin form (no letters of any script)", () => {
    // null, or left out of the names.
    for (const latin of [{ playerLatin: null }, {}]) {
      const html = field({ target: "thumb", text: "player" }, latin);
      expect(lettering(html)).toBeNull();
      const lit = html.split("mg-mehndi-hidden-name-lit")[1];
      expect(lit).toContain("mg-mehndi-hidden-name-mark");
      expect(lit).not.toMatch(/<text/u);
      expect(html).not.toContain("はると");
      expect(html).not.toMatch(/[ऀ-ॿ]/u);
    }
  });

  it("draws an illegible mark with no letters where the story says Hindi, and FARHANA over unreadable marks", () => {
    const illegible = field({ target: "peacock", text: "illegible" });
    expect(illegible).toContain("mg-mehndi-hidden-name-mark");
    expect(illegible).not.toContain("Haruto");
    expect(illegible).not.toMatch(/[ऀ-ॿ]/u);
    const farhana = field({ target: "vine", text: "farhana" });
    expect(farhana).toContain(">FARHANA<");
    // FARHANA keeps its own letters (the story's Latin capitals), not the player's name's hand.
    expect(farhana).not.toContain("mg-mehndi-hidden-name-lettering");
    // Her number is a row of marks: no digits are written.
    expect(farhana).not.toMatch(/>[^<]*\d[^<]*</u);
  });

  it("names the six places by the pattern there, never by what hides in it", () => {
    const html = field({ target: "vine", text: "farhana" });
    for (const label of ["人差し指の花", "小指の側の花", "孔雀の羽の付け根", "親指の付け根の蔓", "真ん中の蔓", "手首の模様"]) expect(html).toContain(`aria-label="${label}"`);
    expect(html).not.toMatch(/aria-label="[^"]*(文字|名前)/u);
  });

  it("rings each wrong place pointed at while the look goes on, and the writing once the player found it", () => {
    const thumb: MehndiParams = { target: "thumb", text: "player" };
    const looking = field(thumb, undefined, {}, { ...view, searched: [0, 2, 5] });
    expect(looking.match(/mg-mehndi-hidden-name-mark-ring" data-wrong="true"/gu)).toHaveLength(3);
    expect(looking).not.toContain("data-writing");
    const found = field(thumb, undefined, {}, { ...view, searched: [0, 2, 3], ending: { kind: "found", spot: 3, misses: 2, helped: 0 } });
    expect(found.match(/data-wrong="true"/gu)).toHaveLength(2);
    expect(found).toContain("data-writing");
    // The wrong places' rings stay round the places pointed at (the index finger's flower here: 204, 104 of 300 × 420).
    expect(found).toMatch(/data-wrong="true" style="left:68%;top:24.76\d*%"/u);
    // One line for how to play, before and during the play; no line under the label (she never shows the place).
    expect(mehndiSkin.hintJa).toBe(mehndiHiddenName.hintJa);
    expect(mehndiSkin.detailJa).toBeUndefined();
  });

  it("rings the writing found round the writing itself, all of its room with its tall strokes and tails, at every target", () => {
    for (const target of ["thumb", "peacock", "vine"] as const) {
      const ring = mehndiWritingRing(target);
      const spot = MEHNDI_SPOTS.indexOf(target);
      const html = field({ target, text: "player" }, { playerLatin: "Masayoshi" }, {}, { ...view, searched: [spot], ending: { kind: "found", spot, misses: 0, helped: 0 } });
      // The ring's place and size (in the palm's share: 300 × 420 units, the width in cqw of the palm).
      const style = html.match(/data-writing="true" aria-hidden="true" style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)cqw"/u);
      expect(style, target).not.toBeNull();
      expect(Number(style![1]), target).toBeCloseTo((ring.x / 300) * 100, 3);
      expect(Number(style![2]), target).toBeCloseTo((ring.y / 420) * 100, 3);
      expect(Number(style![3]), target).toBeCloseTo((ring.diameter / 300) * 100, 1);
      // Centred on the writing: its transform's translate.
      const writing = html.match(/mg-mehndi-hidden-name-lettering" transform="translate\(([\d.]+) ([\d.]+)\) rotate\((-?[\d.]+)\)"/u);
      expect([Number(writing![1]), Number(writing![2])], target).toEqual([ring.x, ring.y]);
      // Every corner of the name's room (a long name is pressed to its width) at the largest size lies inside the ring, a
      // few units clear of its line (the slant turns the room about the ring's centre).
      const half = MEHNDI_WRITING[target].width / 2;
      for (const y of [(WRITING_BASELINE - WRITING_ASCENT) * WRITING_MAX_SIZE, (WRITING_BASELINE + WRITING_DESCENT) * WRITING_MAX_SIZE])
        for (const x of [-half, half]) expect(Math.hypot(x, y), `${target} ${x} ${y}`).toBeLessThanOrEqual(ring.diameter / 2 - 3);
    }
    // At the thumb the writing lies under the spiral, apart from the place pointed at: the ring is round the writing.
    const thumb = mehndiWritingRing("thumb");
    expect(Math.hypot(thumb.x - MEHNDI_PLACES.thumb.x, thumb.y - MEHNDI_PLACES.thumb.y)).toBeGreaterThan(20);
  });

  it("leaves out the leaf at the feather's base when the writing lies there (the name's tails reach it), and draws it elsewhere", () => {
    const leaf = "M150 262 c-8 0 -10 -8 -4 -10";
    expect(field({ target: "peacock", text: "player" })).not.toContain(leaf);
    for (const target of ["thumb", "vine"] as const) expect(field({ target, text: "player" }), target).toContain(leaf);
  });

  it("curls the five other places like writing (lit only), never the writing's own, and gives the pool the tuning's size", () => {
    for (const target of ["thumb", "peacock", "vine"] as const) {
      const html = field({ target, text: "player" });
      const places = [...html.matchAll(/mg-mehndi-hidden-name-lookalike" data-place="([a-z]+)"/gu)].map((match) => match[1]);
      expect(places.sort(), target).toEqual(["index", "peacock", "pinky", "thumb", "vine", "wrist"].filter((spot) => spot !== target).sort());
      // Only in the lit layer (the dark shows the broad lines only).
      expect(html.split("mg-mehndi-hidden-name-lit")[0]).not.toContain("lookalike");
    }
    expect(field({ target: "thumb", text: "player" })).toContain("--mehndi-lamp-r:max(8cqw, 18px)");
  });

  it("breaks the central vine's line behind the writing laid on it (in the vine, at the feather's base), in the lit pattern only", () => {
    for (const params of [{ target: "vine", text: "farhana" }, { target: "peacock", text: "player" }, { target: "peacock", text: "illegible" }] as const) {
      expect(field(params).match(/mask="url\(#[^)]*vinegap\)"/gu), params.target).toHaveLength(1);
    }
    expect(field({ target: "thumb", text: "farhana" })).not.toContain("vinegap");
  });

  it("loads the font's stylesheet with the play only: the definition (on the title page) imports no stylesheet or font file", () => {
    const definition = readFileSync(new URL("./definition.ts", import.meta.url), "utf8");
    expect([...definition.matchAll(/^import .*$/gmu)].map((line) => line[0])).toEqual(['import { z } from "zod";', 'import { defineMiniGame } from "../contract";']);
    expect(definition).not.toMatch(/\.css|\.otf|@font-face/u);
    expect(readFileSync(new URL("./Skin.tsx", import.meta.url), "utf8")).toContain('import "./skin.css";');
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(mehndiHiddenName.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["palm", "sprite"], ["lamp", "sprite"]]);
    const html = field({ target: "thumb", text: "player" }, undefined, { palm: "/assets/minigames/palm.webp", lamp: "/assets/minigames/lamp.webp" });
    expect(html).toContain('src="/assets/minigames/palm.webp"');
    expect(html).toContain('src="/assets/minigames/lamp.webp"');
    // The writing is the game's, over the picture.
    expect(html).toContain(">Haruto<");
  });
});

// Where the writing lies (in the hand's units, 300 × 420), measured from the shapes the field draws: every room, at the
// largest size with its tall strokes and tails, clear of the broad lines by their half width and a unit of air, inside the
// palm's outline, and its centre within a point's reach of its place. 2026-11-17: at the thumb (then slanted −22° in a room
// of 54 at 208, 324) the tall strokes of a long name ran into the spiral's last turn, and the tails out past the palm's edge;
// at the feather's base the tall strokes ran into the feather's point.
describe("where the writing lies", () => {
  type Point = [number, number];
  /** A path's points (absolute M, L, C and Z, as the hand's are drawn), its curves sampled about every 0.1 unit. */
  const pathPoints = (d: string): Point[] => {
    const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/gu) ?? [];
    const points: Point[] = [];
    let command = "";
    let start: Point = [0, 0];
    for (let index = 0; index < tokens.length;) {
      if (/^[MLCZ]$/u.test(tokens[index])) command = tokens[index++];
      if (command === "Z") {
        points.push(start);
        continue;
      }
      const take = (count: number) => tokens.slice(index, (index += count)).map(Number);
      if (command === "M") {
        const [x, y] = take(2);
        start = [x, y];
        points.push(start);
        command = "L";
      } else if (command === "L") {
        const [x, y] = take(2);
        points.push([x, y]);
      } else {
        const [x0, y0] = points[points.length - 1];
        const [x1, y1, x2, y2, x3, y3] = take(6);
        for (let step = 1; step <= 1000; step += 1) {
          const t = step / 1000;
          const u = 1 - t;
          points.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
        }
      }
    }
    return points;
  };
  /** The broad lines' half width (skin.css). */
  const css = readFileSync(new URL("./skin.css", import.meta.url), "utf8");
  const half = Number(css.match(/\.mg-mehndi-hidden-name-ink \{[^}]*stroke-width: ([\d.]+);/u)![1]) / 2;
  const AIR = 1;
  /** The room at the largest size, in the writing's own frame: its width, from the tall strokes' tops to the tails' ends. */
  const room = (target: MehndiTarget) => ({
    left: -MEHNDI_WRITING[target].width / 2, right: MEHNDI_WRITING[target].width / 2,
    top: (WRITING_BASELINE - WRITING_ASCENT) * WRITING_MAX_SIZE, bottom: (WRITING_BASELINE + WRITING_DESCENT) * WRITING_MAX_SIZE,
  });
  /** A point of the hand in the writing's frame at a target (its transform undone), and back. */
  const toWriting = (target: MehndiTarget, [x, y]: Point): Point => {
    const place = MEHNDI_WRITING[target];
    const angle = (-place.rotate * Math.PI) / 180;
    return [(x - place.x) * Math.cos(angle) - (y - place.y) * Math.sin(angle), (x - place.x) * Math.sin(angle) + (y - place.y) * Math.cos(angle)];
  };
  const toHand = (target: MehndiTarget, [x, y]: Point): Point => {
    const place = MEHNDI_WRITING[target];
    const angle = (place.rotate * Math.PI) / 180;
    return [place.x + x * Math.cos(angle) - y * Math.sin(angle), place.y + x * Math.sin(angle) + y * Math.cos(angle)];
  };
  /** How far a point (in the writing's frame) is outside the room (negative: inside it). */
  const outside = (target: MehndiTarget, [x, y]: Point) => {
    const box = room(target);
    const dx = Math.max(box.left - x, x - box.right);
    const dy = Math.max(box.top - y, y - box.bottom);
    return dx <= 0 && dy <= 0 ? Math.max(dx, dy) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  };
  /** The tall strokes' tops anywhere along the room (every half unit), in the hand's units. */
  const tops = (target: MehndiTarget): Point[] => {
    const box = room(target);
    return Array.from({ length: (box.right - box.left) * 2 + 1 }, (_, index) => toHand(target, [box.left + index / 2, box.top]));
  };
  const segment = (point: Point, a: Point, b: Point) => {
    const [vx, vy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * vx + (point[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(point[0] - a[0] - t * vx, point[1] - a[1] - t * vy);
  };
  /** The nearest a line drawn through `points` comes to `point`, less the line's half width. */
  const clear = (point: Point, points: Point[]) => Math.min(...points.slice(1).map((b, index) => segment(point, points[index], b))) - half;

  it("lays the name at the thumb clear of the spiral: its tall strokes anywhere along the room, and all of the room", () => {
    const spiral = pathPoints(MEHNDI_SPIRAL);
    // The spiral is the one drawn (three turns, out to 20 from its centre near the thumb's place).
    expect(spiral).toHaveLength(73);
    expect(Math.max(...spiral.map(([x, y]) => Math.hypot(x - MEHNDI_PLACES.thumb.x, y - (MEHNDI_PLACES.thumb.y - 6))))).toBeCloseTo(20, 1);
    // The tops of h, k, t, l, d, b, f wherever they fall along the room, at the largest size.
    const fromTops = Math.min(...tops("thumb").map((top) => clear(top, spiral)));
    expect(fromTops).toBeGreaterThanOrEqual(AIR);
    // And no line of the spiral comes nearer the room anywhere (its corners, its sides, the tails).
    const fromRoom = Math.min(...spiral.map((point) => outside("thumb", toWriting("thumb", point)))) - half;
    expect(fromRoom).toBeGreaterThanOrEqual(AIR);
  });

  it("hides the feather's point behind a name at its base (lit only), so the name's tall strokes clear what is drawn", () => {
    const feather = pathPoints(MEHNDI_FEATHER);
    // The feather comes to its point where the peacock's place is.
    expect(feather[0]).toEqual([MEHNDI_PLACES.peacock.x, MEHNDI_PLACES.peacock.y]);
    // Drawn whole, its point lies among the tall strokes: they would run into it.
    expect(Math.min(...tops("peacock").map((top) => clear(top, feather)))).toBeLessThan(0);
    // The lit pattern masks it there for the player's name, with the gap in the writing's frame (rounded as drawn).
    const html = field({ target: "peacock", text: "player" }, { playerLatin: "Hideaki" });
    const [dark, lit] = html.split("mg-mehndi-hidden-name-lit");
    const masked = new RegExp(`<path d="${MEHNDI_FEATHER}" mask="url\\(#([^)]*feathergap)\\)"></path>`, "u");
    expect(dark).not.toMatch(masked);
    const id = lit.match(masked)?.[1];
    expect(id).toBeDefined();
    const gap = MEHNDI_FEATHER_GAP;
    const place = MEHNDI_WRITING.peacock;
    const rx = Number(lit.match(new RegExp(`<mask id="${id}"[^>]*>.*?<rect x="${gap.x}" y="${gap.y}" width="${gap.width}" height="${gap.height}" rx="([\\d.]+)" fill="#000" stroke="none" transform="translate\\(${place.x} ${place.y}\\) rotate\\(${place.rotate}\\)"></rect>`, "u"))?.[1]);
    expect(rx).toBeGreaterThan(0);
    const hidden = ([x, y]: Point) => {
      const nearest: Point = [Math.min(Math.max(x, gap.x + rx), gap.x + gap.width - rx), Math.min(Math.max(y, gap.y + rx), gap.y + gap.height - rx)];
      return Math.hypot(x - nearest[0], y - nearest[1]) <= rx;
    };
    // What is drawn of the feather (each point of its line outside the gap, with its full half width) clears the tall
    // strokes along the room, and the room.
    const shown = feather.filter((point) => !hidden(toWriting("peacock", point)));
    expect(shown.length).toBeLessThan(feather.length);
    const nearest = (point: Point) => Math.min(...shown.map((drawn) => Math.hypot(point[0] - drawn[0], point[1] - drawn[1]))) - half;
    expect(Math.min(...tops("peacock").map(nearest))).toBeGreaterThanOrEqual(AIR);
    expect(Math.min(...shown.map((point) => outside("peacock", toWriting("peacock", point)))) - half).toBeGreaterThanOrEqual(AIR);
    // Only the point is hidden: the rest of the feather is drawn.
    expect(feather.filter((point) => hidden(toWriting("peacock", point))).every(([, y]) => y > MEHNDI_PLACES.peacock.y - 6)).toBe(true);
    // The illegible mark (her secret) is drawn as it was, the feather whole over it: its top line keeps clear of the point.
    for (const params of [{ target: "peacock", text: "illegible" }, { target: "thumb", text: "player" }, { target: "vine", text: "player" }] as const) {
      expect(field(params), `${params.target} ${params.text}`).not.toContain("feathergap");
    }
    expect(field({ target: "peacock", text: "player" }, { playerLatin: null })).not.toContain("feathergap");
    const markLine = [toHand("peacock", [-26, -7]), toHand("peacock", [26, -7])] as [Point, Point];
    expect(Math.min(...feather.map((point) => segment(point, ...markLine))) - half - 1.3 / 2).toBeGreaterThan(0.5);
  });

  it("keeps every room inside the palm's outline, and its centre within a point's reach of its place", () => {
    const outline = pathPoints(MEHNDI_PALM);
    const inside = ([x, y]: Point) => {
      let within = false;
      for (let index = 0, last = outline.length - 1; index < outline.length; last = index, index += 1) {
        const [ax, ay] = outline[index];
        const [bx, by] = outline[last];
        if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) within = !within;
      }
      return within;
    };
    for (const target of MEHNDI_TARGETS) {
      const box = room(target);
      const edge: Point[] = [];
      for (let x = box.left; x <= box.right; x += 0.5) edge.push([x, box.top], [x, box.bottom]);
      for (let y = box.top; y <= box.bottom; y += 0.5) edge.push([box.left, y], [box.right, y]);
      for (const point of edge.map((point) => toHand(target, point))) {
        expect(inside(point), `${target} ${point}`).toBe(true);
        // At least 1.5 inside the edge (the tails of a name ending in g, j, p, q or y at the thumb).
        expect(clear(point, outline) + half, `${target} ${point}`).toBeGreaterThanOrEqual(1.5);
      }
      // A point at the writing's centre points at its place (the nearest, within reach).
      const place = MEHNDI_WRITING[target];
      expect(Math.hypot(place.x - MEHNDI_PLACES[target].x, place.y - MEHNDI_PLACES[target].y), target).toBeLessThanOrEqual(MEHNDI_HIT - 2);
      expect(mehndiSpotAt(place.x, place.y), target).toBe(MEHNDI_SPOTS.indexOf(target));
    }
  });
});
