import { describe, expect, it } from "vitest";
import type { TravelRoute } from "../content/travel-schemas";
import { travelRouteSchema } from "../content/travel-schemas";
import { findTravelHomeRoutes, minimumHomeFare } from "./travel-routes";

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
});
