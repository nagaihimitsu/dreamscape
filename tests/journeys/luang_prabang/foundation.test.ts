import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getCityContent, presentation, tourismAssets } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { prototypePreviewState } from "../../../src/dev/prototype-preview-state";
import { inspectJourneyTransit } from "../../../scripts/journey-transit";
import { loadJourneyScaffold, journeyRequirements } from "../../../scripts/journey-scaffold";
import { createGame } from "../../../src/domain/game";
import { planTravel } from "../../../src/domain/travel";
import { getTravelEventAvailability } from "../../../src/domain/travel-game";
import { loadGame, saveGame } from "../../../src/persistence";

describe("Luang Prabang city foundation", () => {
  const cityId = "luang_prabang";
  it("keeps the single-city journey separate and unfinished", () => {
    const journey = getJourney(cityId)!;
    expect(journey).toMatchObject({ status: "preparing", currency: { code: "LAK" }, initialBudget: 2_000_000,
      cityPlan: { mainTourismCount: 4, dateCount: 6, lodgingCost: 0, cityClearAp: 4 } });
    expect(journey.cities.map((city) => city.id)).toEqual([cityId]);
    expect(() => createGame("旅人", "相手", { journeyId: cityId })).toThrow(/not ready/);
    expect(createGame().currentCityId).toBe("milano");
    const { city, travel } = getCityContent(cityId);
    expect(city.productionStatus).toBe("prototype");
    expect(city.countryCode).toBe("LA");
    expect(travel.places).toHaveLength(11);
    expect(travel.events.filter((event) => event.category === "main")).toHaveLength(4);
    expect(travel.events.filter((event) => event.category === "date")).toHaveLength(6);
    expect(travel.places.some((place) => /kuang|クァンシー|クアンシー/i.test(`${place.id} ${place.nameJa} ${place.nameEn}`))).toBe(false);
    for (const event of travel.events) {
      expect(event.contentStatus).toBe("pending_content");
      expect(getTravelEventAvailability(prototypePreviewState(cityId), event.id, "walk").available).toBe(false);
      const place = travel.places.find((item) => item.id === event.placeId)!;
      const asset = tourismAssets.find((item) => item.id === presentation.backgrounds[place.backgroundId]?.imageAssetId);
      expect(asset).toMatchObject({ isPlaceholder: false });
      expect(asset?.licenseName).toMatch(/CC BY/);
    }
  });

  it("connects every direction on foot and records vehicle options and transport decisions", () => {
    const { travel, travelSettings } = getCityContent(cityId);
    const preview = prototypePreviewState(cityId);
    for (const a of travel.places) for (const b of travel.places) {
      const routes = travel.routes.filter((route) => route.fromPlaceId === a.id && route.toPlaceId === b.id);
      expect(routes.some((route) => route.mode === "walk")).toBe(true);
      if (a.id === b.id) continue;
      for (const route of routes) {
        expect(route.estimation).toBe("game_model");
        expect(route.sources.some((source) => source.claimType === "hypothesis")).toBe(true);
        const result = planTravel({ ...preview.travel, currentPlaceId: a.id, hotelPlaceId: travelSettings.hotelPlaceId,
          ap: preview.ap, travelBudget: preview.travelBudget }, route);
        expect(result.ok, `${a.id} to ${b.id} ${route.mode}`).toBe(true);
      }
    }
    expect(travel.routes.filter((route) => route.mode === "taxi")).toHaveLength(38);
    expect(inspectJourneyTransit(process.cwd(), cityId)).toMatchObject({ modes: ["taxi"], cities: [{ directions: 110, decisions: 110, ready: true,
      counts: { taxi: { available: 38, not_suitable: 72, not_applicable: 0, inconclusive: 0 } } }] });
  });

  it("only uses reviewed vehicle paths that avoid the named restricted street", () => {
    const root = "authoring/journeys/luang_prabang/research/luang-prabang-20261104/";
    const model = JSON.parse(readFileSync(root + "safe-taxi-model.json", "utf8"));
    const pickups = JSON.parse(readFileSync(root + "riverside-pickups.json", "utf8"));
    const { travel } = getCityContent(cityId);
    const taxis = travel.routes.filter((route) => route.mode === "taxi");
    expect(Object.keys(model.directions)).toHaveLength(taxis.length);
    for (const route of taxis) {
      const direction = model.directions[`${route.fromPlaceId}>${route.toPlaceId}`];
      expect(direction).toBeDefined();
      const leg = pickups.carRoutes[`${direction.pickup}>${direction.dropoff}`];
      expect(leg.blockedForModel).toBe(false);
      expect(leg.roads.some(([name]: [string, number]) => /sisavangvong/i.test(name))).toBe(false);
      expect(route.sources.some((source) => source.url === "https://kpl.gov.la/en/detail.aspx?id=97345")).toBe(true);
    }
  });

  it("can save and reload an isolated debug preview and supply scenario requirements", () => {
    const state = prototypePreviewState(cityId);
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(saveGame(storage, state)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
    const plan = journeyRequirements(loadJourneyScaffold(process.cwd(), cityId));
    expect(plan).toHaveLength(1);
    expect(plan[0].main).toHaveLength(4);
    expect(plan[0].dates).toHaveLength(6);
  });
});
