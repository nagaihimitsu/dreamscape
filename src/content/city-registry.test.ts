import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { getCities, getCityContent } from ".";
import { createGame } from "../domain/game";
import { departToNextCity, getNextCity } from "../domain/city-travel";

it("registers authored cities without making prototypes playable", () => {
  // Other journey folders may register more cities.
  expect(getCities().map((city) => city.id)).toEqual(expect.arrayContaining(["agra", "bukhara", "delhi", "jaipur", "khiva", "luang_prabang", "milano", "samarkand", "tashkent"]));
  expect(getCityContent("milano").travel.cityId).toBe("milano");
  for (const id of ["milano", "delhi", "agra", "jaipur"])
    expect(getCityContent(id).city.productionStatus).toBe("complete");
  for (const id of ["tashkent", "samarkand", "bukhara", "khiva", "luang_prabang"]) {
    expect(getCityContent(id).city.productionStatus).toBe("prototype");
    expect(getCityContent(id).travel.cityId).toBe(id);
  }
  expect(() => getCityContent("unknown_city")).toThrow(/Unknown city/);
  expect(() => getCityContent("constructor")).toThrow(/Unknown city/);
});

it("lists the generated cities afresh in every run", () => {
  // Vitest caches transformed modules on disk unless their text contains
  // "import.meta.glob(" (a type argument such as import.meta.glob<T>( hides it),
  // so the city list would stay stale after a build adds a city (e.g. the sample journey's).
  const sources = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : sources(file);
    return /\.tsx?$/u.test(entry.name) ? [file] : [];
  });
  const typed = sources(path.resolve("src")).filter((file) => /import\.meta\.glob\s*</u.test(readFileSync(file, "utf8")) && !file.endsWith("city-registry.test.ts"));
  expect(typed).toEqual([]);
  const generated = readdirSync(path.resolve("src/content/generated/content/cities")).map((file) => file.replace(/\.json$/u, ""));
  expect(getCities().map((city) => city.id).sort()).toEqual(generated.sort());
});

it("does not offer departure to a registered incomplete city", () => {
  const state = { ...createGame(), currentCityId: "tashkent", completedCityIds: ["tashkent"] };
  expect(getCityContent("tashkent").city.nextCityId).toBe("samarkand");
  expect(getCityContent("samarkand").city.productionStatus).toBe("prototype");
  expect(getNextCity(state)).toBeUndefined();
  expect(departToNextCity(state, state.revision)).toBe(state);
});

it("registers India's authored events while keeping estimated route costs explicit", () => {
  let main = 0;
  let finales = 0;
  let dates = 0;
  for (const id of ["delhi", "agra", "jaipur"]) {
    const { travel, travelSettings } = getCityContent(id);
    expect(travel.places).toHaveLength(11);
    expect(travelSettings.lodgingCost).toBe(0);
    for (const event of travel.events) {
      expect(event.contentStatus).toBeUndefined();
      expect(event.admissionCost ?? 0).toBeGreaterThanOrEqual(0);
      if (event.id.endsWith("_finale")) finales++;
      else if (event.category === "main") main++;
      else dates++;
    }
    for (const route of travel.routes.filter((item) => item.fromPlaceId !== item.toPlaceId)) {
      expect(route.estimation).toBe("game_model");
      expect(route.sources.some((source) => source.claimType === "hypothesis")).toBe(true);
    }
  }
  expect([main, finales, dates]).toEqual([12, 3, 18]);
  expect(getCityContent("delhi").travel.places.find((place) => place.id === "delhi_lotus_temple")?.closedWeekdays).toEqual([0]);
  expect(getCityContent("agra").travel.places.find((place) => place.id === "agra_taj_mahal")?.closedWeekdays).toEqual([4]);
});
