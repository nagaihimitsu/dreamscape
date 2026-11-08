// Rule a of the ways home (user answer 5, 2026-11-08; transport design §3.4): the 休む list and the
// return checks leave out a vehicle option that is neither faster nor cheaper than walking straight
// home. Checked over every city of every journey in the generated content (the unit tests build it
// with the sample journey), before renting and with every rental mode rented.
import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { journeys } from "../content/journeys";
import { getTransportMode } from "../content/transport";
import { WALK_MODE_ID } from "../content/transport-schemas";
import type { TravelRoute } from "../content/travel-schemas";
import { canReturnByDayEnd, DAY_START, planOvernight, type TravelSnapshot } from "./travel";
import { cheapestOnTimeFare, composeHomeRoutes, findTravelHomeRoutes, minimumHomeFare, type HomeRoute } from "./travel-routes";

const cities = journeys.flatMap((journey) => journey.cities.map((city) => ({ journeyId: journey.id, cityId: city.id })));

/** The usable routes before renting (getUsableRoutes) and once every rental mode is rented. */
function routeSets(cityId: string): TravelRoute[][] {
  const { routes } = getCityContent(cityId).travel;
  const notRented = routes.filter((route) => !getTransportMode(cityId, route.mode)?.rental);
  return notRented.length === routes.length ? [routes] : [notRented, routes];
}

const label = (option: HomeRoute) => `${option.mode}${option.viaPlaceId ? ` via ${option.viaPlaceId}` : ""} ${option.minutes} min ${option.cost}`;

/** The best overnight plan as getTravelSleepOptions builds it from these ways home: most money left, then earliest arrival. */
function bestOvernight(snapshot: TravelSnapshot, home: readonly HomeRoute[], lodgingCost: number) {
  const allowLateReturn = !canReturnByDayEnd(snapshot, home);
  const plans = home.map((option) => planOvernight(snapshot, option, lodgingCost, allowLateReturn)).flatMap((plan) => plan.ok ? [plan] : []);
  plans.sort((a, b) => b.remainingBudget - a.remainingBudget || a.arrivalMinute - b.arrivalMinute);
  return plans[0] ?? null;
}

describe("ways home: rule a", () => {
  it("offers no vehicle option that is neither faster nor cheaper than walking straight home, in every city of every journey and the sample", () => {
    const journeysChecked = new Set<string>();
    let dropped = 0;
    for (const { journeyId, cityId } of cities) {
      const { travel, travelSettings: { hotelPlaceId } } = getCityContent(cityId);
      for (const routes of routeSets(cityId)) for (const place of travel.places) {
        if (place.id === hotelPlaceId) continue;
        const walk = routes.find((route) => route.fromPlaceId === place.id && route.toPlaceId === hotelPlaceId && route.mode === WALK_MODE_ID);
        const composed = composeHomeRoutes(routes, place.id, hotelPlaceId);
        const home = findTravelHomeRoutes(routes, place.id, hotelPlaceId);
        const where = `${cityId} ${place.id}`;
        if (walk) expect(home, where).toContain(walk);
        for (const option of home.filter((item) => item.mode !== WALK_MODE_ID))
          expect(!walk || option.minutes < walk.minutes || option.cost < walk.cost, `${where}: ${label(option)}`).toBe(true);
        // Nothing else is left out: every dropped option is a vehicle the direct walk beats or equals on both.
        const kept = new Set(home.map(label));
        for (const option of composed.filter((item) => !kept.has(label(item))))
          expect(option.mode !== WALK_MODE_ID && !!walk && walk.minutes <= option.minutes && walk.cost <= option.cost, `${where}: ${label(option)}`).toBe(true);
        dropped += composed.length - home.length;
      }
      journeysChecked.add(journeyId);
    }
    expect([...journeysChecked].sort()).toEqual(journeys.map((journey) => journey.id).sort());
    expect(journeysChecked).toContain("sample_trip");
    expect(dropped).toBeGreaterThan(0);
  });

  it("keeps the return reserve, the on-time return and the overnight plan the same as without the rule, for every place, minute and budget", () => {
    const mismatches: string[] = [];
    let placesWithDrops = 0;
    for (const { cityId } of cities) {
      const { travel, travelSettings: { hotelPlaceId, lodgingCost } } = getCityContent(cityId);
      for (const routes of routeSets(cityId)) for (const place of travel.places) {
        const withRule = findTravelHomeRoutes(routes, place.id, hotelPlaceId);
        const without = composeHomeRoutes(routes, place.id, hotelPlaceId);
        if (withRule.length === without.length) continue; // Nothing dropped: the same list.
        placesWithDrops++;
        // Every budget at which a comparison with a fare can change, from nothing to more than the dearest fare.
        const fares = without.map((option) => option.cost);
        const budgets = [...new Set([0, ...fares.flatMap((fare) => [fare - 1, fare]), Math.max(...fares) + 1])].filter((budget) => budget >= 0);
        // Every minute from the start of the day to the next morning (a late or emergency return included).
        for (let minute = DAY_START; minute < 24 * 60 + DAY_START; minute++) {
          if (minimumHomeFare(routes, place.id, hotelPlaceId, minute) !== cheapestOnTimeFare(without, minute))
            mismatches.push(`${cityId} ${place.id} ${minute}: reserve`);
          for (const travelBudget of budgets) {
            const snapshot: TravelSnapshot = { currentPlaceId: place.id, hotelPlaceId, day: 1, minute, ap: 0, travelBudget };
            if (canReturnByDayEnd(snapshot, withRule) !== canReturnByDayEnd(snapshot, without))
              mismatches.push(`${cityId} ${place.id} ${minute} ${travelBudget}: on-time return`);
            if (JSON.stringify(bestOvernight(snapshot, withRule, lodgingCost)) !== JSON.stringify(bestOvernight(snapshot, without, lodgingCost)))
              mismatches.push(`${cityId} ${place.id} ${minute} ${travelBudget}: overnight plan`);
          }
        }
      }
    }
    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(placesWithDrops).toBeGreaterThan(0);
  });
});
