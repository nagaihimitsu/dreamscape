import { expect, it } from "vitest";
import { getCities, getCityContent } from ".";
import { createGame } from "../domain/game";
import { departToNextCity, getNextCity } from "../domain/city-travel";

it("registers authored cities without making prototypes playable", () => {
  expect(getCities().map((city) => city.id).sort()).toEqual(["agra", "bukhara", "delhi", "jaipur", "khiva", "milano", "samarkand", "tashkent"]);
  expect(getCityContent("milano").travel.cityId).toBe("milano");
  for (const id of ["delhi", "agra", "jaipur", "tashkent", "samarkand", "bukhara", "khiva"]) {
    expect(getCityContent(id).city.productionStatus).toBe("prototype");
    expect(getCityContent(id).travel.cityId).toBe(id);
  }
  expect(() => getCityContent("unknown_city")).toThrow(/Unknown city/);
  expect(() => getCityContent("constructor")).toThrow(/Unknown city/);
});

it("does not offer departure to a registered incomplete city", () => {
  const state = { ...createGame(), currentCityId: "delhi", completedCityIds: ["delhi"] };
  expect(getCityContent("delhi").city.nextCityId).toBe("agra");
  expect(getCityContent("agra").city.productionStatus).toBe("prototype");
  expect(getNextCity(state)).toBeUndefined();
  expect(departToNextCity(state, state.revision)).toBe(state);
});

it("keeps the authored Indian places and route costs distinct from playable stories", () => {
  let main = 0;
  let dates = 0;
  for (const id of ["delhi", "agra", "jaipur"]) {
    const { travel, travelSettings } = getCityContent(id);
    expect(travel.places).toHaveLength(11);
    expect(travelSettings.lodgingCost).toBe(0);
    for (const event of travel.events) {
      expect(event.contentStatus).toBe("pending_content");
      expect(event.admissionCost).toBeGreaterThanOrEqual(0);
      if (event.category === "main") main++;
      else dates++;
    }
    for (const route of travel.routes.filter((item) => item.fromPlaceId !== item.toPlaceId)) {
      expect(route.estimation).toBe("game_model");
      expect(route.sources.some((source) => source.claimType === "hypothesis")).toBe(true);
    }
  }
  expect([main, dates]).toEqual([12, 18]);
  expect(getCityContent("delhi").travel.places.find((place) => place.id === "delhi_lotus_temple")?.closedWeekdays).toEqual([0]);
  expect(getCityContent("agra").travel.places.find((place) => place.id === "agra_taj_mahal")?.closedWeekdays).toEqual([4]);
});
