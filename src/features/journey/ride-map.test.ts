// The ride's small map card (2026-11-13 user decision; TravelTransition): the two places as dots with their names and a straight
// dotted line from the place left to the place reached, on the sample city's fictional places.
import { describe, expect, it } from "vitest";
import { cityStart } from "../../dev/scenario-builders";
import { RIDE_MAP, rideMapLayout, rideRoute, shortPlaceName, type RideRoute } from "./ride-map";

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
    expect(layout.from).toEqual({ x: RIDE_MAP.padX, y: 42 });
    expect(layout.to).toEqual({ x: RIDE_MAP.width - RIDE_MAP.padX, y: 42 });
    expect(layout.labels).toEqual({
      from: { x: 10, y: 32, anchor: "start", text: "西" },
      to: { x: 210, y: 32, anchor: "end", text: "東" },
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
    expect(layout.labels.from).toEqual({ x: 110, y: 14, anchor: "middle", text: "北" });
    expect(layout.labels.to).toEqual({ x: 110, y: 78, anchor: "middle", text: "南" });
    expect(layout.dots.every((dot) => dot.x === 110 && dot.y > layout.from.y && dot.y < layout.to.y)).toBe(true);
  });

  it("keeps a slanting ride's shape at one scale, its names on opposite sides of the line", () => {
    const route: RideRoute = rideRoute(cityStart("mihon"), "mihon_hotel", "mihon_clock_tower")!;
    const layout = rideMapLayout(route)!;
    // North-east from the hotel, as on the maps (north up): as far east as north at the equator.
    expect(layout.from).toEqual({ x: 92, y: 60 });
    expect(layout.to).toEqual({ x: 128, y: 24 });
    expect(layout.labels.from).toMatchObject({ y: 78, anchor: "middle", text: "滞在先のホテル" });
    expect(layout.labels.to).toMatchObject({ y: 14, anchor: "middle", text: "見本の時計塔" });
  });

  it("has no line for two places at one position", () => {
    expect(rideMapLayout({ from: stop(0.5, 0.5, "A"), to: stop(0.5, 0.5, "B") })).toBeNull();
  });

  it("writes a long name short", () => {
    expect(shortPlaceName("滞在先のホテル")).toBe("滞在先のホテル");
    expect(shortPlaceName("見本の街のとても長い名前の広場")).toBe("見本の街のとて…");
    expect(shortPlaceName("abcdefghij", 4)).toBe("abc…");
    expect(rideMapLayout({ from: stop(0, 0, "見本の街のとても長い名前の広場"), to: stop(0, 1, "東") })!.labels.from.text).toBe("見本の街のとて…");
  });
});
