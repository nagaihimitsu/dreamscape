import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { buildJourneyTransitDecisionReview, readJourneyTransitDecisions } from "../../scripts/journey-transit-decisions";
import { DAY_END, DAY_START, planOvernight, planTravel, planTravelEvent } from "./travel";
import { findTravelHomeRoutes } from "./travel-routes";

const cities = ["delhi", "agra", "jaipur"] as const;

describe("India city travel data", () => {
  it("records a game decision for every public-transport direction", () => {
    const review = buildJourneyTransitDecisionReview(readJourneyTransitDecisions(process.cwd(), "golden_triangle"));
    for (const cityId of cities) {
      // A decision to omit a game route does not establish whether a real
      // service exists; its sources must retain any factual uncertainty.
      expect(review.counts[cityId].unresearched, cityId).toBe(0);
      expect(review.counts[cityId].inconclusive, cityId).toBe(0);
    }
  });

  it.each(cities)("offers a budgeted route between every pair and a return in %s", (cityId) => {
    const { travel, travelSettings } = getCityContent(cityId);
    const hotel = travelSettings.hotelPlaceId;
    expect(travelSettings.lodgingCost).toBe(0);
    for (const from of travel.places) for (const to of travel.places) {
      const routes = travel.routes.filter((item) => item.fromPlaceId === from.id && item.toPlaceId === to.id);
      expect(routes.length, `${cityId}: ${from.id} → ${to.id}`).toBeGreaterThan(0);
      const snapshot = { currentPlaceId: from.id, hotelPlaceId: hotel, day: 1, minute: DAY_START, ap: 12, travelBudget: 30_000 };
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
            day: 1, minute, weekday, ap: 12, travelBudget: 30_000 };
          feasible = outgoing.some((route) => home.some((returnRoute) =>
            planTravelEvent(snapshot, event, route, returnRoute, place).ok));
        }
      }
      expect(feasible, `${cityId}: ${origin.id} → ${event.id}`).toBe(true);
    }
  });
});
