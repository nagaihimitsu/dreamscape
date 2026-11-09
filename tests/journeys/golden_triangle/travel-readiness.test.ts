import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getCityContent } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { inspectJourneyTransit } from "../../../scripts/journey-transit";
import { transitLedgerSchema } from "../../../scripts/transit-ledger";
import { DAY_END, DAY_START, planOvernight, planTravel, planTravelEvent } from "../../../src/domain/travel";
import { findTravelHomeRoutes } from "../../../src/domain/travel-routes";

const cities = ["delhi", "agra", "jaipur"] as const;
/** The journey's budget (generous until the final balance pass; the finale test below checks the money it really needs). */
const budget = getJourney("golden_triangle")!.initialBudget!;
const ledgerOf = (cityId: string) =>
  transitLedgerSchema.parse(JSON.parse(readFileSync(`content/journeys/golden_triangle/travel/${cityId}-transit.json`, "utf8")));
const vehicle = (cityId: string) => getCityContent(cityId).travel.routes.filter((route) => route.mode !== "walk");

describe("India city travel data", () => {
  it("records a game decision for every direction and mode in a ready ledger per city", () => {
    const report = inspectJourneyTransit(process.cwd(), "golden_triangle");
    // A decision to omit a game route does not establish whether a real
    // service exists; its sources must retain any factual uncertainty.
    expect(report.cities.map(({ cityId, decisions, ready }) => ({ cityId, decisions, ready })))
      .toEqual(cities.map((cityId) => ({ cityId, decisions: 220, ready: true })));
  });

  it("caps the 10 old-city ↔ Nahargarh Fort autos at the negotiated ₹250 the travel guide gives", () => {
    const fort = "jaipur_nahargarh_fort";
    const oldCity = ["jaipur_hawa_mahal", "jaipur_city_palace", "jaipur_jantar_mantar", "jaipur_johari_bazaar", "jaipur_hotel_hub"];
    const capped = ledgerOf("jaipur").decisions.filter((decision) => decision.mode === "auto_rickshaw" && decision.reasonJa.includes("₹150〜250"));
    expect(capped.map((decision) => [decision.fromPlaceId, decision.toPlaceId].sort().join(" ↔ ")).sort())
      .toEqual(oldCity.flatMap((place) => [[fort, place].sort().join(" ↔ "), [fort, place].sort().join(" ↔ ")]).sort());
    for (const decision of capped) {
      expect(decision.reasonJa).toContain("₹250にした");
      const route = vehicle("jaipur").find((item) => item.mode === "auto_rickshaw" && item.fromPlaceId === decision.fromPlaceId && item.toPlaceId === decision.toPlaceId)!;
      expect(route.cost, `${route.fromPlaceId} → ${route.toPlaceId}`).toBe(250);
    }
  });

  it("reaches Fatehpur Sikri by 20 provisional autos without a documented fact, to be replaced by the tour", () => {
    const fs = "agra_fatehpur_sikri";
    const routes = vehicle("agra").filter((route) => route.fromPlaceId === fs || route.toPlaceId === fs);
    expect(routes).toHaveLength(20);
    expect(routes.every((route) => route.mode === "auto_rickshaw" && route.minutes >= 80 && route.minutes <= 95 && route.cost >= 820 && route.cost <= 940)).toBe(true);
    // No documented fact covers a ~40 km auto ride (only hypotheses): exactly the routes content:build warns about.
    expect(routes.every((route) => route.sources.every((source) => source.claimType === "hypothesis"))).toBe(true);
    const report = inspectJourneyTransit(process.cwd(), "golden_triangle");
    expect(report.cities.find((city) => city.cityId === "agra")!.unsupportedRoutes.sort())
      .toEqual(routes.map((route) => `${route.fromPlaceId} → ${route.toPlaceId}（auto_rickshaw）`).sort());
    const decisions = ledgerOf("agra").decisions.filter((decision) => decision.mode === "auto_rickshaw" && (decision.fromPlaceId === fs || decision.toPlaceId === fs));
    expect(decisions).toHaveLength(20);
    for (const decision of decisions) {
      expect(decision.status).toBe("available");
      expect(decision.reasonJa).toContain("仮のゲーム値");
      expect(decision.reasonJa).toContain("ツアー機能");
    }
  });

  it("lodges the party in Taj Ganj near the Taj Mahal South Gate, a walk from the Taj Mahal and a ride from the fort", () => {
    const { travel, travelSettings } = getCityContent("agra");
    const inn = travel.places.find((place) => place.id === travelSettings.hotelPlaceId)!;
    expect(inn).toMatchObject({ id: "agra_hotel_hub", nameJa: "アーグラの架空宿（タージ・マハル南門付近）", latitude: 27.1687, longitude: 78.0413 });
    // 「架空」 keeps the place shown as a fictional lodging (placeDisplayName).
    expect(inn.nameJa).toContain("架空");
    const between = (from: string, to: string) => travel.routes.filter((route) => route.fromPlaceId === from && route.toPlaceId === to)
      .map(({ mode, minutes, cost }) => ({ mode, minutes, cost }));
    for (const [from, to] of [[inn.id, "agra_taj_mahal"], ["agra_taj_mahal", inn.id]])
      expect(between(from, to), `${from} → ${to}`).toEqual([{ mode: "walk", minutes: 13, cost: 0 }]);
    for (const [from, to] of [[inn.id, "agra_agra_fort"], ["agra_agra_fort", inn.id]])
      expect(between(from, to), `${from} → ${to}`).toEqual([
        { mode: "walk", minutes: 38, cost: 0 }, { mode: "auto_rickshaw", minutes: 25, cost: 120 }, { mode: "metro", minutes: 30, cost: 20 }]);
    // Autos to and from the inn include the walk to where an auto may stop (TT-a, a game assumption).
    for (const route of travel.routes.filter((item) => item.mode === "auto_rickshaw" && (item.fromPlaceId === inn.id || item.toPlaceId === inn.id)))
      expect(route.sources.map((source) => source.title)).toContain("アーグラの宿とオートの乗り降りの場所のあいだの時間");
  });

  it("lets the Agra finale at the Taj Mahal start with at most ₹3,100 from every place and walks the party home", () => {
    const { travel, travelSettings } = getCityContent("agra");
    const finale = travel.events.find((event) => event.id === "gt_agra_finale")!;
    const place = travel.places.find((item) => item.id === finale.placeId)!;
    const home = findTravelHomeRoutes(travel.routes, place.id, travelSettings.hotelPlaceId);
    expect(Math.min(...home.map((route) => route.cost))).toBe(0);
    expect(home.find((route) => route.cost === 0)).toMatchObject({ mode: "walk", minutes: 13 });
    for (const origin of travel.places.filter((item) => item.id !== place.id)) {
      const outgoing = travel.routes.filter((route) => route.fromPlaceId === origin.id && route.toPlaceId === place.id);
      const feasible = outgoing.some((route) => home.some((returnRoute) => [0, 1, 2, 3, 4, 5, 6].some((weekday) =>
        planTravelEvent({ currentPlaceId: origin.id, hotelPlaceId: travelSettings.hotelPlaceId, day: 1, minute: DAY_START, weekday, ap: 12, travelBudget: 3_100 },
          finale, route, returnRoute, place).ok)));
      expect(feasible, `${origin.id}: start the finale with ₹3,100`).toBe(true);
    }
  });

  it.each(cities)("keeps the short walks walk-only and gives %s its own metro decision", (cityId) => {
    const { travel } = getCityContent(cityId);
    const walkOnly = travel.places.flatMap((from) => travel.places.filter((to) => to.id !== from.id).flatMap((to) => {
      const routes = travel.routes.filter((route) => route.fromPlaceId === from.id && route.toPlaceId === to.id);
      return routes.every((route) => route.mode === "walk") ? routes : [];
    }));
    expect(walkOnly).toHaveLength({ delhi: 2, agra: 4, jaipur: 18 }[cityId]);
    // A walk of 15 minutes or less leaves no vehicle route (decision T5).
    expect(walkOnly.every((route) => route.minutes <= 15)).toBe(true);
    expect(travel.routes.filter((route) => route.mode === "walk" && route.fromPlaceId !== route.toPlaceId && route.minutes <= 15)).toEqual(walkOnly);
    expect(vehicle(cityId).filter((route) => route.mode === "metro")).toHaveLength({ delhi: 44, agra: 4, jaipur: 0 }[cityId]);
  });

  it.each(cities)("offers a budgeted route between every pair and a return in %s", (cityId) => {
    const { travel, travelSettings } = getCityContent(cityId);
    const hotel = travelSettings.hotelPlaceId;
    expect(travelSettings.lodgingCost).toBe(0);
    for (const from of travel.places) for (const to of travel.places) {
      const routes = travel.routes.filter((item) => item.fromPlaceId === from.id && item.toPlaceId === to.id);
      expect(routes.length, `${cityId}: ${from.id} → ${to.id}`).toBeGreaterThan(0);
      const snapshot = { currentPlaceId: from.id, hotelPlaceId: hotel, day: 1, minute: DAY_START, ap: 12, travelBudget: budget };
      const returnRoutes = findTravelHomeRoutes(travel.routes, to.id, hotel);
      expect(returnRoutes.length, `${cityId}: return from ${to.id}`).toBeGreaterThan(0);
      // At least one authored route and hotel return must fit an ordinary day.
      expect(routes.some((outbound) => {
        const arrival = planTravel(snapshot, outbound);
        if (!arrival.ok) return false;
        return returnRoutes.some((home) => planOvernight({ ...snapshot, currentPlaceId: to.id,
          minute: arrival.arrivalMinute, travelBudget: arrival.remainingBudget }, home, travelSettings.lodgingCost).ok);
      }), `${cityId}: round trip ${from.id} → ${to.id}`).toBe(true);
      for (const route of routes.filter((item) => item.fromPlaceId !== item.toPlaceId)) {
        expect(route.estimation, `${cityId}: ${route.fromPlaceId} → ${route.toPlaceId}/${route.mode}`).toBe("game_model");
        expect(route.sources.some((source) => source.claimType === "hypothesis")).toBe(true);
      }
    }
  });

  it.each(cities)("can schedule each proposed event from each location in %s", (cityId) => {
    const { travel, travelSettings } = getCityContent(cityId);
    // This tests travel feasibility separately from story progress requirements.
    // Waiting is in 30-minute steps and the game week is independent of the real clock.
    for (const origin of travel.places) for (const event of travel.events) {
      const place = travel.places.find((item) => item.id === event.placeId)!;
      const outgoing = travel.routes.filter((item) => item.fromPlaceId === origin.id && item.toPlaceId === place.id);
      const home = findTravelHomeRoutes(travel.routes, place.id, travelSettings.hotelPlaceId);
      let feasible = false;
      for (let weekday = 0; weekday < 7 && !feasible; weekday++) {
        for (let minute = DAY_START; minute < DAY_END && !feasible; minute += 30) {
          const snapshot = { currentPlaceId: origin.id, hotelPlaceId: travelSettings.hotelPlaceId,
            day: 1, minute, weekday, ap: 12, travelBudget: budget };
          feasible = outgoing.some((route) => home.some((returnRoute) =>
            planTravelEvent(snapshot, event, route, returnRoute, place).ok));
        }
      }
      expect(feasible, `${cityId}: ${origin.id} → ${event.id}`).toBe(true);
    }
  });
});
