// The ride's small map card (2026-11-13 user decision; TravelTransition): the two places as dots with their names and a straight
// dotted line from the place left to the place reached, on the sample city's fictional places.
import { describe, expect, it } from "vitest";
import { cityStart } from "../../dev/scenario-builders";
import { RIDE_MAP, RIDE_NAME_LINE, rideMapLayout, rideRoute, wrapPlaceName, type RideRoute } from "./ride-map";

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
    const layout = rideMapLayout({ from: stop(0, 0, "西"), to: stop(0, 0.001, "東") })!;
    expect(layout.height).toBe(RIDE_MAP.height);
    expect(layout.from).toEqual({ x: RIDE_MAP.padX, y: 42 });
    expect(layout.to).toEqual({ x: RIDE_MAP.width - RIDE_MAP.padX, y: 42 });
    expect(layout.labels).toEqual({
      from: { x: 10, y: 32, anchor: "start", lines: ["西"] },
      to: { x: 210, y: 32, anchor: "end", lines: ["東"] },
    });
  });

  it("draws the line's dots from the place left to the place reached, evenly, clear of both dots", () => {
    const { from, to, dots } = rideMapLayout({ from: stop(0, 0.001), to: stop(0, 0) })!;
    // West from the east end: the first dot is by the place left (on the right).
    expect(from.x).toBeGreaterThan(to.x);
    expect(dots.length).toBe(25);
    expect(dots[0]).toEqual({ x: from.x - 8, y: 42 });
    expect(dots.at(-1)).toEqual({ x: to.x + 9, y: 42 });
    for (let index = 1; index < dots.length; index++) {
      const gap = dots[index - 1].x - dots[index].x;
      expect(gap).toBeGreaterThan(6.9);
      expect(gap).toBeLessThan(7.4);
    }
  });

  it("fits a north–south ride to the card's height, the names centred, the north one above and the south one below", () => {
    const layout = rideMapLayout({ from: stop(0.001, 0, "北"), to: stop(0, 0, "南") })!;
    expect(layout.from).toEqual({ x: 110, y: RIDE_MAP.padTop });
    expect(layout.to).toEqual({ x: 110, y: RIDE_MAP.height - RIDE_MAP.padBottom });
    expect(layout.labels.from).toEqual({ x: 110, y: 14, anchor: "middle", lines: ["北"] });
    expect(layout.labels.to).toEqual({ x: 110, y: 78, anchor: "middle", lines: ["南"] });
    expect(layout.dots.every((dot) => dot.x === 110 && dot.y > layout.from.y && dot.y < layout.to.y)).toBe(true);
  });

  it("keeps a slanting ride's shape at one scale, its names on opposite sides of the line", () => {
    const route: RideRoute = rideRoute(cityStart("mihon"), "mihon_hotel", "mihon_clock_tower")!;
    const layout = rideMapLayout(route)!;
    // North-east from the hotel, as on the maps (north up): as far east as north at the equator.
    expect(layout.from).toEqual({ x: 92, y: 60 });
    expect(layout.to).toEqual({ x: 128, y: 24 });
    expect(layout.labels.from).toMatchObject({ y: 78, anchor: "middle", lines: ["滞在先のホテル"] });
    expect(layout.labels.to).toMatchObject({ y: 14, anchor: "middle", lines: ["見本の時計塔"] });
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
    // East–west: both names above the line, on one row; each takes at most 8 characters a line.
    const level = rideMapLayout({ from: stop(0, 0, "ジャーマー・マスジド"), to: stop(0, 0.001, "ファテープル・シークリー") })!;
    expect(level.labels.from.lines).toEqual(["ジャーマー・", "マスジド"]);
    expect(level.labels.to.lines).toEqual(["ファテープル・", "シークリー"]);
    // North–south: each name centred on its dot, with the card's width.
    const steep = rideMapLayout({ from: stop(0.001, 0, "ジャーマー・マスジド"), to: stop(0, 0, "ファテープル・シークリー") })!;
    expect(steep.labels.from.lines).toEqual(["ジャーマー・マスジド"]);
    expect(steep.labels.to.lines).toEqual(["ファテープル・シークリー"]);
    expect(steep.height).toBe(RIDE_MAP.height);
  });

  it("grows the drawing above for a name of more lines over its dot, the ride and the other name moving down with it", () => {
    const long = "ムハンマド・アミン・ハン・マドラサ外観";
    const plain = rideMapLayout({ from: stop(0, 0, "西"), to: stop(0, 0.001, "東") })!;
    const layout = rideMapLayout({ from: stop(0, 0, long), to: stop(0, 0.001, "東") })!;
    expect(layout.labels.from.lines).toEqual(["ムハンマド・", "アミン・ハン・", "マドラサ外観"]);
    // Its last line where a one-line name stands, the first two above it; nothing above the card's top.
    const grown = layout.height - RIDE_MAP.height;
    expect(grown).toBeGreaterThan(0);
    expect(layout.labels.from.y + 2 * RIDE_NAME_LINE).toBe(plain.labels.from.y + grown);
    expect(layout.labels.from.y).toBeGreaterThanOrEqual(13);
    expect(layout.from).toEqual({ x: plain.from.x, y: plain.from.y + grown });
    expect(layout.labels.to).toEqual({ ...plain.labels.to, y: plain.labels.to.y + grown });
    expect(layout.dots).toEqual(plain.dots.map((dot) => ({ ...dot, y: dot.y + grown })));
  });

  it("grows the drawing below for a name of more lines under its dot", () => {
    const layout = rideMapLayout({ from: stop(0.001, 0, "北"), to: stop(0, 0, "ムハンマド・アミン・ハン・マドラサ外観・南門") })!;
    expect(layout.labels.to.lines).toEqual(["ムハンマド・アミン・ハン・", "マドラサ外観・南門"]);
    expect(layout.labels.to.y).toBe(78);
    expect(layout.height).toBe(78 + RIDE_NAME_LINE + 3 + 2);
    expect(layout.from).toEqual({ x: 110, y: RIDE_MAP.padTop });
  });
});
