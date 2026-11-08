import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getCityContent, presentation, tourismAssets } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { prototypePreviewState } from "../../../src/dev/prototype-preview-state";
import { inspectJourneyTransit } from "../../../scripts/journey-transit";
import { loadJourneyScaffold, journeyRequirements } from "../../../scripts/journey-scaffold";
import { createGame, validateGameState } from "../../../src/domain/game";
import { rentTransport } from "../../../src/domain/transport";
import { planTravel } from "../../../src/domain/travel";
import { getTravelEventAvailability, getTravelHomeRoutes } from "../../../src/domain/travel-game";
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
    expect(travel.routes.filter((route) => route.mode === "tuk_tuk")).toHaveLength(38);
    expect(travel.routes.filter((route) => route.mode === "bicycle")).toHaveLength(24);
    expect(inspectJourneyTransit(process.cwd(), cityId)).toMatchObject({ modes: ["tuk_tuk", "bicycle"], cities: [{ directions: 110, decisions: 220, ready: true,
      unsupportedRoutes: [],
      counts: { tuk_tuk: { available: 38, not_suitable: 72, not_applicable: 0, inconclusive: 0 },
        bicycle: { available: 24, not_suitable: 86, not_applicable: 0, inconclusive: 0 } } }] });
  });

  it("only uses reviewed vehicle paths that avoid the named restricted street", () => {
    const root = "authoring/journeys/luang_prabang/research/luang-prabang-20261104/";
    const model = JSON.parse(readFileSync(root + "safe-taxi-model.json", "utf8"));
    const pickups = JSON.parse(readFileSync(root + "riverside-pickups.json", "utf8"));
    const { travel } = getCityContent(cityId);
    const taxis = travel.routes.filter((route) => route.mode === "tuk_tuk");
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

  it("declares tuk-tuk and a rental bicycle (user decision U3), rented at the hotel with placeholder values (U5)", () => {
    expect(getJourney(cityId)!.transportModes).toEqual([
      { id: "tuk_tuk", nameJa: "トゥクトゥク", movingJa: "トゥクトゥクで移動中", kind: "three_wheeler" },
      { id: "bicycle", nameJa: "自転車", movingJa: "自転車で移動中", kind: "bicycle", rental: true },
    ]);
    const { travelSettings } = getCityContent(cityId);
    expect(travelSettings.rentals).toEqual([expect.objectContaining({ modeId: "bicycle", placeIds: ["luang_prabang_hotel"], cost: 60_000 })]);
    const [offer] = travelSettings.rentals!;
    expect(offer.sources.map((source) => source.claimType).sort()).toEqual(["documented_fact", "documented_fact", "hypothesis"]);
  });

  it("rides the bicycles on the central street (the shorter times of U4), citing the author's field check of July 2026", () => {
    const { travel } = getCityContent(cityId);
    const walk = (from: string, to: string) => travel.routes.find((route) => route.mode === "walk" && route.fromPlaceId === from && route.toPlaceId === to)!;
    const note = "https://github.com/nagaihimitsu/dreamscape/blob/main/authoring/journeys/luang_prabang/research/field-check-2026-07/README.md";
    expect(readFileSync("authoring/journeys/luang_prabang/research/field-check-2026-07/README.md", "utf8")).toContain("2026年7月（日付は記録していません）");
    for (const route of travel.routes.filter((item) => item.mode === "bicycle")) {
      expect(route.cost).toBe(0);
      expect(route.minutes % 5).toBe(0);
      // Every bicycle direction saves at least 10 minutes against walking (the research's threshold).
      expect(walk(route.fromPlaceId, route.toPlaceId).minutes - route.minutes).toBeGreaterThanOrEqual(10);
      expect(route.sources.find((source) => source.url === note)).toMatchObject({ claimType: "documented_fact", checkedAt: "2026-11-07" });
      expect(route.sources.some((source) => source.claimType === "hypothesis")).toBe(true);
    }
    const toTemple = travel.routes.filter((route) => route.mode === "bicycle" && (route.fromPlaceId === "luang_prabang_wat_phol_phao" || route.toPlaceId === "luang_prabang_wat_phol_phao"));
    expect(toTemple).toHaveLength(20);
    // U4: the shorter times that ride the central street (set A of the research, p4/transport-uzbekistan-
    // luang-prabang.md §7). If the street closed, haw_pha_bang <-> wat_phol_phao, wat_phol_phao -> night_market
    // and wat_phol_phao -> xieng_thong would be 25 instead of 20.
    const short = (id: string) => id.replace("luang_prabang_", "");
    const minutes = Object.fromEntries(travel.routes.filter((route) => route.mode === "bicycle")
      .map((route) => [`${short(route.fromPlaceId)}>${short(route.toPlaceId)}`, route.minutes]));
    expect(minutes).toEqual({
      "ethnology>wat_phol_phao": 20, "ethnology>xieng_thong": 15, "haw_pha_bang>wat_phol_phao": 20,
      "heuan_chan>wat_phol_phao": 20, "hotel>wat_phol_phao": 20, "hotel>xieng_thong": 15,
      "night_market>wat_phol_phao": 20, "phousi>wat_phol_phao": 25, "royal_palace>wat_phol_phao": 20,
      "wat_mai>wat_phol_phao": 20, "wat_phol_phao>ethnology": 20, "wat_phol_phao>haw_pha_bang": 20,
      "wat_phol_phao>heuan_chan": 20, "wat_phol_phao>hotel": 20, "wat_phol_phao>night_market": 20,
      "wat_phol_phao>phousi": 25, "wat_phol_phao>royal_palace": 20, "wat_phol_phao>wat_mai": 20,
      "wat_phol_phao>wat_sen": 20, "wat_phol_phao>xieng_thong": 20, "wat_sen>wat_phol_phao": 25,
      "xieng_thong>ethnology": 15, "xieng_thong>hotel": 15, "xieng_thong>wat_phol_phao": 25,
    });
  });

  it("explains each bicycle decision by the streets its route rides (the night market only where it rides the central street)", () => {
    const ledger = JSON.parse(readFileSync(`content/journeys/${cityId}/travel/${cityId}-transit.json`, "utf8")) as {
      decisions: { fromPlaceId: string; toPlaceId: string; mode: string; status: string; reasonJa: string }[];
    };
    const bicycle = ledger.decisions.filter((decision) => decision.mode === "bicycle" && decision.status === "available");
    expect(bicycle).toHaveLength(24);
    const short = (id: string) => id.replace("luang_prabang_", "");
    // The research's routed-bike steps ride neither Sisavangvong Rd nor Sakkaline Rd in these 4 directions.
    const offStreet = bicycle.filter((decision) => decision.reasonJa.startsWith("中心の通り（シーサワンウォン通り）を通らない"))
      .map((decision) => `${short(decision.fromPlaceId)}>${short(decision.toPlaceId)}`).sort();
    expect(offStreet).toEqual(["ethnology>wat_phol_phao", "hotel>wat_phol_phao", "wat_phol_phao>ethnology", "wat_phol_phao>hotel"]);
    for (const decision of bicycle) {
      expect(decision.reasonJa.includes("夜市"), `${decision.fromPlaceId}>${decision.toPlaceId}`)
        .toBe(!decision.reasonJa.startsWith("中心の通り（シーサワンウォン通り）を通らない"));
    }
  });

  it("never lets the rental bicycle hide another way home: renting only adds bicycle options (rule a compares with the walk only)", () => {
    const state = prototypePreviewState(cityId);
    const rented = rentTransport(state, "bicycle", state.revision);
    expect(rented.travel.rentedModeIds).toEqual(["bicycle"]);
    const { travel, travelSettings } = getCityContent(cityId);
    const home = (base: typeof state, placeId: string) => getTravelHomeRoutes({ ...base, travel: { ...base.travel, currentPlaceId: placeId } }, placeId);
    let bicycleBeatsKeptVehicle = 0;
    for (const place of travel.places.filter((item) => item.id !== travelSettings.hotelPlaceId)) {
      const before = home(state, place.id);
      const after = home(rented, place.id);
      expect(before.some((option) => option.mode === "bicycle"), place.id).toBe(false);
      expect(after.filter((option) => option.mode !== "bicycle"), place.id).toEqual(before);
      // A bicycle option faster and cheaper than a tuk-tuk option still leaves that tuk-tuk option in the list.
      bicycleBeatsKeptVehicle += after.filter((option) => option.mode === "tuk_tuk" && after.some((bicycle) =>
        bicycle.mode === "bicycle" && bicycle.minutes <= option.minutes && bicycle.cost <= option.cost)).length;
    }
    expect(bicycleBeatsKeptVehicle).toBeGreaterThan(0);
  });

  it("saves ride counts of the tuk-tuk, and of the bicycle only once it is rented", () => {
    const state = prototypePreviewState(cityId);
    const tampered = (base: typeof state, rideCounts: Record<string, number>) => ({ ...base, travel: { ...base.travel, rideCounts } });
    expect(validateGameState(tampered(state, { tuk_tuk: 3 })).travel.rideCounts).toEqual({ tuk_tuk: 3 });
    for (const counts of [{ bicycle: 1 }, { metro: 1 }, { walk: 1 }] as Record<string, number>[])
      expect(() => validateGameState(tampered(state, counts)), JSON.stringify(counts)).toThrow("乗り物に乗った回数の記録が一致しません。");
    const rented = rentTransport(state, "bicycle", state.revision);
    expect(rented.travel.rentedModeIds).toEqual(["bicycle"]);
    const counted = validateGameState(tampered(rented, { bicycle: 2, tuk_tuk: 1 }));
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(saveGame(storage, counted)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: counted });
  });
});
