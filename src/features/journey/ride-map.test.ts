// The ride's map card (2026-11-13 user decision, larger on the map's tiles 2026-11-26; TravelTransition): the two places as dots with their names and a straight
// dotted line from the place left to the place reached, on the sample city's fictional places.
import { describe, expect, it } from "vitest";
import { cityStart } from "../../dev/scenario-builders";
import { project } from "./map-focus";
import { RIDE_MAP, RIDE_MAX_SCALE, RIDE_NAME_LINE, rideMapLayout, rideRoute, wrapPlaceName, type RideRoute } from "./ride-map";

const stop = (latitude: number, longitude: number, nameJa = "場所") => ({ latitude, longitude, nameJa });

describe("the places of a ride", () => {
  it("takes both places of the party's city with their map positions and their names as the screens write them", () => {
    const state = cityStart("mihon");
    expect(rideRoute(state, "mihon_hotel", "mihon_clock_tower")).toEqual({
      from: { latitude: 0, longitude: 0, nameJa: "滞在先のホテル" },
      to: { latitude: 0.001, longitude: 0.001, nameJa: "見本の時計塔" },
    });
  });

  it("is none when either place is unknown or both are the same place", () => {
    const state = cityStart("mihon");
    expect(rideRoute(state, "mihon_hotel", "mihon_hotel")).toBeUndefined();
    expect(rideRoute(state, "mihon_hotel", "nowhere")).toBeUndefined();
    expect(rideRoute(state, undefined, "mihon_market")).toBeUndefined();
    expect(rideRoute(state, "mihon_market", undefined)).toBeUndefined();
  });
});

describe("the card's drawing", () => {
  it("fits an east–west ride to the card's width: the names start and end at their dots, above them", () => {
    const layout = rideMapLayout({ from: stop(0, 0, "西"), to: stop(0, 0.01, "東") })!;
    expect(layout.height).toBe(RIDE_MAP.height);
    expect(layout.from).toEqual({ x: RIDE_MAP.padX, y: 100 });
    expect(layout.to).toEqual({ x: RIDE_MAP.width - RIDE_MAP.padX, y: 100 });
    expect(layout.labels).toEqual({
      from: { x: 38, y: 89, anchor: "start", lines: ["西"] },
      to: { x: 282, y: 89, anchor: "end", lines: ["東"] },
    });
  });

  it("draws the line's dots from the place left to the place reached, evenly, clear of both dots", () => {
    const { from, to, dots } = rideMapLayout({ from: stop(0, 0.01), to: stop(0, 0) })!;
    // West from the east end: the first dot is by the place left (on the right).
    expect(from.x).toBeGreaterThan(to.x);
    expect(dots.length).toBe(24);
    expect(dots[0]).toEqual({ x: from.x - 10, y: 100 });
    expect(dots.at(-1)).toEqual({ x: to.x + 11, y: 100 });
    for (let index = 1; index < dots.length; index++) {
      const gap = dots[index - 1].x - dots[index].x;
      expect(gap).toBeGreaterThan(9);
      expect(gap).toBeLessThan(9.4);
    }
  });

  it("fits a north–south ride to the card's height, the names centred, the north one above and the south one below", () => {
    const layout = rideMapLayout({ from: stop(0.01, 0, "北"), to: stop(0, 0, "南") })!;
    expect(layout.from).toEqual({ x: 160, y: RIDE_MAP.padTop });
    expect(layout.to).toEqual({ x: 160, y: RIDE_MAP.height - RIDE_MAP.padBottom });
    expect(layout.labels.from).toEqual({ x: 160, y: 41, anchor: "middle", lines: ["北"] });
    expect(layout.labels.to).toEqual({ x: 160, y: 168, anchor: "middle", lines: ["南"] });
    expect(layout.dots.every((dot) => dot.x === 160 && dot.y > layout.from.y && dot.y < layout.to.y)).toBe(true);
  });

  it("draws a short walk no closer than zoom 17 of the tiles, centred, keeping its shape and its names on opposite sides", () => {
    // About 157 m north-east from the hotel: at most RIDE_MAX_SCALE, so shorter than the line's room.
    const route: RideRoute = rideRoute(cityStart("mihon"), "mihon_hotel", "mihon_clock_tower")!;
    const layout = rideMapLayout(route)!;
    expect(layout.scale).toBe(RIDE_MAX_SCALE);
    expect(layout.from).toEqual({ x: 113.4, y: 146.6 });
    expect(layout.to).toEqual({ x: 206.6, y: 53.4 });
    expect(layout.labels.from).toMatchObject({ y: 166.6, anchor: "middle", lines: ["滞在先のホテル"] });
    expect(layout.labels.to).toMatchObject({ y: 42.4, anchor: "middle", lines: ["見本の時計塔"] });
  });

  it("gives the tiles the drawing's scale: SVG units per pixel of the world at zoom 0", () => {
    const layout = rideMapLayout({ from: stop(0, 0), to: stop(0, 0.01) })!;
    const across = project({ latitude: 0, longitude: 0.01 }, 0).x - project({ latitude: 0, longitude: 0 }, 0).x;
    expect(layout.scale * across).toBeCloseTo(layout.to.x - layout.from.x, 6);
  });

  it("has no line for two places at one position", () => {
    expect(rideMapLayout({ from: stop(0.5, 0.5, "A"), to: stop(0.5, 0.5, "B") })).toBeNull();
  });

  it("writes a name whole, on one line when it fits, else broken where it reads well (after 「・」 and the like)", () => {
    expect(wrapPlaceName("滞在先のホテル", 8)).toEqual(["滞在先のホテル"]);
    expect(wrapPlaceName("ジャーマー・マスジド", 8)).toEqual(["ジャーマー・", "マスジド"]);
    expect(wrapPlaceName("ファテープル・シークリー", 11)).toEqual(["ファテープル・", "シークリー"]);
    expect(wrapPlaceName("ムハンマド・アミン・ハン・マドラサ外観", 11)).toEqual(["ムハンマド・アミン・", "ハン・マドラサ外観"]);
    expect(wrapPlaceName("ムハンマド・アミン・ハン・マドラサ外観", 8)).toEqual(["ムハンマド・", "アミン・ハン・", "マドラサ外観"]);
    expect(wrapPlaceName("架空ホテル（コルドゥージオ付近）", 8)).toEqual(["架空ホテル", "（コルドゥージオ", "付近）"]);
    expect(wrapPlaceName("Piazza del Duomo", 8)).toEqual(["Piazza", "del", "Duomo"]);
  });

  it("breaks a name with no such point at the line's end, never before 「ー」 or a small kana, and cuts only past its last line", () => {
    expect(wrapPlaceName("ルアンパパーン夜市", 8)).toEqual(["ルアンパパーン夜", "市"]);
    expect(wrapPlaceName("ルアンパパーン夜市", 5)).toEqual(["ルアンパ", "パーン夜市"]);
    expect(wrapPlaceName("見本の街のとても長い名前の広場", 4, 2)).toEqual(["見本の街", "のとて…"]);
  });

  it("gives each name the room of its side of the card: one line when it fits, half the row each when both share one", () => {
    // East–west: both names above the line, on one row; each takes at most 9 characters a line.
    const level = rideMapLayout({ from: stop(0, 0, "ジャーマー・マスジド"), to: stop(0, 0.01, "ファテープル・シークリー") })!;
    expect(level.labels.from.lines).toEqual(["ジャーマー・", "マスジド"]);
    expect(level.labels.to.lines).toEqual(["ファテープル・", "シークリー"]);
    // North–south: each name centred on its dot, with the card's width.
    const steep = rideMapLayout({ from: stop(0.01, 0, "ジャーマー・マスジド"), to: stop(0, 0, "ファテープル・シークリー") })!;
    expect(steep.labels.from.lines).toEqual(["ジャーマー・マスジド"]);
    expect(steep.labels.to.lines).toEqual(["ファテープル・シークリー"]);
    expect(steep.height).toBe(RIDE_MAP.height);
  });

  // Names longer than the card has room for in three lines over or under their dot (no place name comes near).
  const longest = "ムハンマド・アミン・ハン・マドラサ外観・".repeat(3);

  it("grows the drawing above for a name of more lines over its dot, the ride and the other name moving down with it", () => {
    const plain = rideMapLayout({ from: stop(0.01, 0, "北"), to: stop(0, 0, "南") })!;
    const layout = rideMapLayout({ from: stop(0.01, 0, longest), to: stop(0, 0, "南") })!;
    expect(layout.labels.from.lines).toHaveLength(3);
    // Its last line where a one-line name stands, the first two above it; nothing above the card's top.
    const grown = layout.height - RIDE_MAP.height;
    expect(grown).toBeGreaterThan(0);
    expect(layout.labels.from.y + 2 * RIDE_NAME_LINE).toBe(plain.labels.from.y + grown);
    expect(layout.labels.from.y).toBeGreaterThanOrEqual(14);
    expect(layout.from).toEqual({ x: plain.from.x, y: plain.from.y + grown });
    expect(layout.labels.to).toEqual({ ...plain.labels.to, y: plain.labels.to.y + grown });
    expect(layout.dots).toEqual(plain.dots.map((dot) => ({ ...dot, y: dot.y + grown })));
  });

  it("grows the drawing below for a name of more lines under its dot", () => {
    const layout = rideMapLayout({ from: stop(0.01, 0, "北"), to: stop(0, 0, longest) })!;
    expect(layout.labels.to.lines).toHaveLength(3);
    expect(layout.labels.to.y).toBe(168);
    expect(layout.height).toBe(168 + 2 * RIDE_NAME_LINE + 3 + 2);
    expect(layout.from).toEqual({ x: 160, y: RIDE_MAP.padTop });
  });
});
