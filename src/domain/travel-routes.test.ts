import { describe, expect, it } from "vitest";
import type { TravelRoute } from "../content/travel-schemas";
import { travelRouteSchema } from "../content/travel-schemas";
import { composeHomeRoutes, findTravelHomeRoutes, minimumHomeFare } from "./travel-routes";

const source: TravelRoute["sources"][number] = {
  publisher: "test", title: "test route", url: "https://example.com/", checkedAt: "2026-11-03",
  claimType: "hypothesis", claimJa: "テスト用の経路",
};
function route(fromPlaceId: string, toPlaceId: string, mode: TravelRoute["mode"], minutes: number, cost: number, transferNote?: string): TravelRoute {
  return travelRouteSchema.parse({ fromPlaceId, toPlaceId, mode, minutes, cost, sources: [source], ...(transferNote ? { transferNote } : {}) });
}

describe("return routes", () => {
  it("does not offer a loop away from the hotel as a return when already there", () => {
    const routes = [route("hotel", "hotel", "walk", 0, 0), route("hotel", "station", "bus", 10, 20), route("station", "hotel", "walk", 8, 0)];
    expect(findTravelHomeRoutes(routes, "hotel", "hotel")).toEqual([routes[0]]);
  });

  it("retains the connection note on direct and bus-plus-walk return routes", () => {
    const note = "Idgahへの接続を含む";
    const routes = [route("sikri", "hotel", "bus", 100, 220, note), route("sikri", "station", "rail", 30, 30, note), route("station", "hotel", "walk", 8, 0)];
    const found = findTravelHomeRoutes(routes, "sikri", "hotel");
    expect(found.find((item) => item.mode === "bus")?.transferNote).toBe(note);
    expect(found.find((item) => item.mode === "rail")).toMatchObject({ transferNote: note, viaPlaceId: "station", minutes: 38 });
  });

  it("retains slower, cheaper returns and drops options dominated on both time and fare", () => {
    const routes = [route("site", "hotel", "taxi", 10, 10), route("site", "stop", "taxi", 15, 4),
      route("stop", "hotel", "walk", 5, 0), route("site", "other", "taxi", 16, 11), route("other", "hotel", "walk", 5, 0)];
    const found = findTravelHomeRoutes(routes, "site", "hotel");
    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({ mode: "taxi", minutes: 10, cost: 10 });
    expect(found[1]).toMatchObject({ mode: "taxi", minutes: 20, cost: 4, viaPlaceId: "stop" });
    expect(minimumHomeFare(routes, "site", "hotel", 20 * 60 + 30)).toBe(4);
    // The cheaper connection no longer fits, but the direct route still does.
    expect(minimumHomeFare(routes, "site", "hotel", 20 * 60 + 45)).toBe(10);
  });

  // Rule a (user answer 5, 2026-11-08; transport design §3.4).
  const ways = (found: ReturnType<typeof findTravelHomeRoutes>) => found.map((item) => `${item.mode}${item.viaPlaceId ? `@${item.viaPlaceId}` : ""} ${item.minutes}`);

  it("drops a vehicle option, direct or via another place, that is neither faster nor cheaper than walking straight home", () => {
    const routes = [route("site", "hotel", "walk", 20, 0), route("site", "hotel", "taxi", 20, 9), route("site", "hotel", "tram", 15, 5),
      route("site", "stop", "taxi", 18, 7), route("stop", "hotel", "walk", 4, 0), route("site", "near", "tram", 3, 6), route("near", "hotel", "walk", 10, 0)];
    expect(ways(composeHomeRoutes(routes, "site", "hotel"))).toEqual(["tram@near 13", "tram 15", "walk 20", "taxi 20", "taxi@stop 22"]);
    // An equal time counts as not faster; the faster tram options, direct or via, stay.
    expect(ways(findTravelHomeRoutes(routes, "site", "hotel"))).toEqual(["tram@near 13", "tram 15", "walk 20"]);
    // The reserve is the same as with the dropped taxis (they never fit where the walk does not).
    expect([9 * 60, 20 * 60 + 41, 20 * 60 + 46, 20 * 60 + 50, 21 * 60].map((minute) => minimumHomeFare(routes, "site", "hotel", minute)))
      .toEqual([0, 5, 6, undefined, 0]);
  });

  it("compares with the direct walk only: without one, or against a walk via another place, nothing is dropped", () => {
    const noWalk = [route("site", "hotel", "taxi", 30, 9), route("site", "stop", "bus", 40, 2), route("stop", "hotel", "walk", 5, 0)];
    expect(ways(findTravelHomeRoutes(noWalk, "site", "hotel"))).toEqual(["taxi 30", "bus@stop 45"]);
    expect(findTravelHomeRoutes(noWalk, "site", "hotel")).toEqual(composeHomeRoutes(noWalk, "site", "hotel"));
  });

  it("never lets another vehicle hide an option: a faster free bicycle keeps the slower, dearer taxi that still beats walking", () => {
    // The input is the usable routes: before renting, the bicycle is not there at all.
    const walkAndTaxi = [route("site", "hotel", "walk", 30, 0), route("site", "hotel", "taxi", 25, 10)];
    const rented = [...walkAndTaxi, route("site", "hotel", "bicycle", 10, 0)];
    expect(ways(findTravelHomeRoutes(walkAndTaxi, "site", "hotel"))).toEqual(["taxi 25", "walk 30"]);
    expect(ways(findTravelHomeRoutes(rented, "site", "hotel"))).toEqual(["bicycle 10", "taxi 25", "walk 30"]);
    // A rented bicycle is compared with the walk like any other mode.
    const slowBicycle = [...walkAndTaxi, route("site", "hotel", "bicycle", 30, 0)];
    expect(ways(findTravelHomeRoutes(slowBicycle, "site", "hotel"))).toEqual(["taxi 25", "walk 30"]);
  });
});
