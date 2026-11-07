import { describe, expect, it } from "vitest";
import { inspectJourneyTransit } from "../../../scripts/journey-transit-review";
import { findPublicFile } from "../../../scripts/public-assets";
import { getCityContent, presentation, tourismAssets } from "../../../src/content";
import { currencyForCity, formatMoneyForCity } from "../../../src/content/currency";
import { getJourney, getJourneyForCity } from "../../../src/content/journeys";
import { prototypePreviewState } from "../../../src/dev/prototype-preview-state";
import { LEARNING_KEY, loadGame, SAVE_KEY, saveGame } from "../../../src/persistence";
import { journeyStorage } from "../../../src/persistence/journey-storage";
import { loadJourneyDraft, promoteJourneyDraft, saveJourneyDraft } from "../../../src/persistence/journey-preparation";
import { createGame } from "../../../src/domain/game";
import { DAY_END, DAY_START, planOvernight, planTravel, planTravelEvent } from "../../../src/domain/travel";
import { findTravelHomeRoutes } from "../../../src/domain/travel-routes";
import { getTravelEventAvailability } from "../../../src/domain/travel-game";

const cities = ["tashkent", "samarkand", "bukhara", "khiva"] as const;
function memoryStorage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
}

describe("Uzbekistan scenario-ready foundation", () => {
  it("records a sourced game decision for every public-transport and taxi direction", () => {
    const review = inspectJourneyTransit(process.cwd(), "uzbekistan");
    expect(review.map((city) => city.cityId)).toEqual(cities);
    for (const city of review) {
      expect(city.decisions).toBe(city.directions * 4);
      expect(city.ready, city.cityId).toBe(true);
      expect(city.counts.unconfirmed, city.cityId).toBe(0);
    }
  });

  it("registers an independent four-city journey while unfinished stories remain unavailable", () => {
    const journey = getJourney("uzbekistan")!;
    expect(journey.status).toBe("preparing");
    expect(journey.cities.map((city) => city.id)).toEqual(cities);
    expect(journey.initialBudget).toBe(4_000_000);
    expect(journey.currency.code).toBe("UZS");
    expect(journey.cityPlan).toEqual({ cityClearAp: 4, lodgingCost: 0, mainTourismCount: 4, dateCount: 6 });
    expect(journey.intercityModes).toEqual([]);
    expect(() => createGame("旅人", "相手", { journeyId: journey.id })).toThrow(/not ready/);
    expect(createGame().currentCityId).toBe("milano");
    for (const [index, cityId] of cities.entries()) {
      const { city, travel } = getCityContent(cityId);
      expect(getJourneyForCity(cityId)?.id).toBe(journey.id);
      expect(city.productionStatus).toBe("prototype");
      expect(city.countryCode).toBe("UZ");
      expect(city.nextCityId ?? null).toBe(cities[index + 1] ?? null);
      expect(travel.events.filter((event) => event.category === "main")).toHaveLength(4);
      expect(travel.events.filter((event) => event.category === "date")).toHaveLength(6);
      const preview = prototypePreviewState(cityId);
      expect(preview.completedCityIds).toEqual([]);
      expect(preview.battleRecords).toEqual([]);
      expect(preview.travelBudget).toBe(journey.initialBudget);
      for (const event of travel.events) {
        expect(event.contentStatus).toBe("pending_content");
        expect(getTravelEventAvailability(preview, event.id, "walk").available).toBe(false);
      }
      expect(currencyForCity(cityId).code).toBe("UZS");
      expect(formatMoneyForCity(cityId, 123)).toBe(`${journey.currency.symbol}123`);
      expect(formatMoneyForCity(cityId, 123)).not.toMatch(/[€₹]/);
    }
    expect(formatMoneyForCity("milano", 60)).toBe("€60");
    expect(formatMoneyForCity("delhi", 30_000)).toBe("₹30000");
  });

  it("preserves all three journeys' saves and notes without promoting unfinished content", () => {
    const base = memoryStorage();
    const milan = journeyStorage(base, "milano");
    const india = journeyStorage(base, "golden_triangle");
    const uzbekistan = journeyStorage(base, "uzbekistan");
    const milanState = createGame("ミラノ", "ミラノの相手");
    expect(saveGame(milan, milanState).ok).toBe(true);
    const indiaState = createGame("インド", "インドの相手", { journeyId: "golden_triangle" });
    expect(saveGame(india, indiaState).ok).toBe(true);
    const originalMilan = milan.getItem(SAVE_KEY);
    const originalIndia = india.getItem(SAVE_KEY);
    expect(saveJourneyDraft(uzbekistan, "ウズベキスタン", "新しい相手").ok).toBe(true);
    const loaded = loadJourneyDraft(uzbekistan);
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") throw new Error("Expected Uzbekistan preparation");
    expect(loaded.draft).toMatchObject({ journeyId: "uzbekistan", currentCityId: "tashkent", ap: 0,
      affection: 0, trust: 0, spark: 0, memories: [], claimedRewardIds: [], completedCityIds: [],
      inventory: {}, travelBudget: null });
    expect(promoteJourneyDraft(uzbekistan, loaded.raw).ok).toBe(false);
    expect(saveJourneyDraft(uzbekistan, "上書き", "禁止").ok).toBe(false);
    expect(uzbekistan.getItem(SAVE_KEY)).toBe(loaded.raw);
    expect(milan.getItem(SAVE_KEY)).toBe(originalMilan);
    expect(india.getItem(SAVE_KEY)).toBe(originalIndia);
    expect(loadGame(milan)).toEqual({ status: "loaded", state: milanState });
    expect(loadGame(india)).toEqual({ status: "loaded", state: indiaState });
    for (const [slot, note] of [[milan, "milan"], [india, "india"], [uzbekistan, "uzbekistan"]] as const) slot.setItem(LEARNING_KEY, note);
    expect([milan, india, uzbekistan].map((slot) => slot.getItem(LEARNING_KEY))).toEqual(["milan", "india", "uzbekistan"]);
    // A valid preparation copied into a different journey slot is still invalid.
    india.setItem(SAVE_KEY, loaded.raw);
    expect(loadJourneyDraft(india)).toMatchObject({ status: "invalid", raw: loaded.raw });
    expect(saveJourneyDraft(india, "再作成", "禁止").ok).toBe(false);
    expect(saveGame(india, indiaState).ok).toBe(false);
    expect(india.getItem(SAVE_KEY)).toBe(loaded.raw);
    uzbekistan.setItem(SAVE_KEY, "{broken");
    expect(loadJourneyDraft(uzbekistan)).toMatchObject({ status: "invalid", raw: "{broken" });
    expect(saveJourneyDraft(uzbekistan, "再作成", "禁止").ok).toBe(false);
    expect(uzbekistan.getItem(SAVE_KEY)).toBe("{broken");
  });

  it.each(cities)("keeps %s destinations, licensed images and routes inside their city", (cityId) => {
    const { city, travel, travelSettings } = getCityContent(cityId);
    const places = new Set(travel.places.map((place) => place.id));
    expect(places.size).toBe(travel.places.length);
    expect(places.has(travelSettings.hotelPlaceId)).toBe(true);
    expect(travelSettings.lodgingCost).toBe(0);
    expect(city.landmarkIdsPlanned).toHaveLength(4);
    for (const place of travel.places) expect(place.cityId).toBe(cityId);
    for (const route of travel.routes) {
      expect(places.has(route.fromPlaceId)).toBe(true);
      expect(places.has(route.toPlaceId)).toBe(true);
      if (route.fromPlaceId !== route.toPlaceId) {
        expect(route.estimation).toBe("game_model");
        expect(route.sources.some((source) => source.claimType === "hypothesis")).toBe(true);
      }
    }
    for (const event of travel.events) {
      expect(event.cityId).toBe(cityId);
      const place = travel.places.find((item) => item.id === event.placeId)!;
      const background = presentation.backgrounds[place.backgroundId];
      const asset = tourismAssets.find((item) => item.id === background?.imageAssetId)!;
      expect(asset, `${cityId}: ${event.id} image`).toBeDefined();
      expect(asset.isPlaceholder).toBe(false);
      expect(asset.licenseName).not.toBe("");
      expect(asset.sourceUrl).toMatch(/^https:\/\//);
      expect(findPublicFile(process.cwd(), asset.path), asset.path).toBeDefined();
    }
  });

  it.each(cities)("can travel between every pair and schedule every proposed event in %s", (cityId) => {
    const { travel, travelSettings } = getCityContent(cityId);
    const budget = getJourney("uzbekistan")!.initialBudget!;
    for (const origin of travel.places) for (const destination of travel.places) {
      const routes = travel.routes.filter((route) => route.fromPlaceId === origin.id && route.toPlaceId === destination.id);
      const home = findTravelHomeRoutes(travel.routes, destination.id, travelSettings.hotelPlaceId);
      const snapshot = { currentPlaceId: origin.id, hotelPlaceId: travelSettings.hotelPlaceId,
        day: 1, minute: DAY_START, ap: 12, travelBudget: budget };
      expect(routes.some((route) => {
        const arrival = planTravel(snapshot, route);
        return arrival.ok && home.some((back) => planOvernight({ ...snapshot, currentPlaceId: destination.id,
          minute: arrival.arrivalMinute, travelBudget: arrival.remainingBudget }, back, travelSettings.lodgingCost).ok);
      }), `${origin.id} → ${destination.id} → hotel`).toBe(true);
    }
    for (const origin of travel.places) for (const event of travel.events) {
      const place = travel.places.find((item) => item.id === event.placeId)!;
      const routes = travel.routes.filter((route) => route.fromPlaceId === origin.id && route.toPlaceId === place.id);
      const home = findTravelHomeRoutes(travel.routes, place.id, travelSettings.hotelPlaceId);
      let feasible = false;
      for (let weekday = 0; weekday < 7 && !feasible; weekday++) {
        for (let minute = DAY_START; minute < DAY_END && !feasible; minute += 30) {
          const snapshot = { currentPlaceId: origin.id, hotelPlaceId: travelSettings.hotelPlaceId,
            day: 1, minute, weekday, ap: 12, travelBudget: budget };
          feasible = routes.some((route) => home.some((back) => planTravelEvent(snapshot, event, route, back, place).ok));
        }
      }
      expect(feasible, `${cityId}: ${origin.id} → ${event.id}`).toBe(true);
    }
  });

  it("funds all forty planned visits and hotel returns from one initial journey budget", () => {
    let remaining = getJourney("uzbekistan")!.initialBudget!;
    for (const cityId of cities) {
      const { travel, travelSettings } = getCityContent(cityId);
      for (const event of travel.events) {
        const place = travel.places.find((item) => item.id === event.placeId)!;
        const outbound = travel.routes.filter((route) => route.fromPlaceId === travelSettings.hotelPlaceId && route.toPlaceId === place.id);
        const home = findTravelHomeRoutes(travel.routes, place.id, travelSettings.hotelPlaceId);
        let minimumCost = Infinity;
        // This verifies the travel budget only. AP comes from future authored
        // scenarios; each visit may take a separate day with free lodging.
        for (let weekday = 0; weekday < 7; weekday++) for (let minute = DAY_START; minute < DAY_END; minute += 30) {
          const snapshot = { currentPlaceId: travelSettings.hotelPlaceId, hotelPlaceId: travelSettings.hotelPlaceId,
            day: 1, minute, weekday, ap: 12, travelBudget: remaining };
          for (const route of outbound) for (const back of home) {
            const plan = planTravelEvent(snapshot, event, route, back, place);
            if (plan.ok) minimumCost = Math.min(minimumCost, remaining - plan.remainingBudget + back.cost + travelSettings.lodgingCost);
          }
        }
        expect(Number.isFinite(minimumCost), `${cityId}: ${event.id} within remaining budget ${remaining}`).toBe(true);
        remaining -= minimumCost;
      }
      // Leave room to enter any planned venue once again for its later finale.
      remaining -= Math.max(...travel.events.map((event) => event.admissionCost ?? 0));
      expect(remaining, `${cityId}: finale admission reserve`).toBeGreaterThanOrEqual(0);
    }
    expect(remaining).toBeGreaterThan(0);
  });
});
