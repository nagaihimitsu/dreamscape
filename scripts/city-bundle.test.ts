import { afterEach, describe, expect, it } from "vitest";
import { existsSync, linkSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyCityBundle, compactCityBundle, exportCityBundle, exportEditableCityBundle, writeCityBundleFiles } from "./city-bundle";
import { compactTravel, expandTravel, type CompactTravel } from "./city-bundle-routes";
import { travelCatalogSchema } from "../src/content/travel-schemas";
import { allCities, cityPaths, fingerprint, fixture, indiaDecisionFile, merged, read, readJson, registerJourney, removeFixtures, testJourney, testLayer } from "./city-bundle-test-helpers";

afterEach(removeFixtures);

describe("city editing bundle: routes, export and atomic writes", () => {
  it("creates zero-time walking routes for new places from the shared source", () => {
    const original = readJson(process.cwd(), cityPaths(process.cwd(), "milano").travel);
    const compact = compactTravel(original) as CompactTravel;
    expect(compact.samePlaceRoute).toBeDefined();
    const place = { ...compact.places[0], id: "milano_test_place" };
    compact.places.push(place);
    const expanded = travelCatalogSchema.parse(expandTravel(compact, original.routes));
    const identity = expanded.routes.filter((route) => route.fromPlaceId === place.id && route.toPlaceId === place.id);
    expect(identity).toHaveLength(1);
    expect(identity[0]).toMatchObject({ mode: "walk", minutes: 0, cost: 0,
      sources: compact.routeSources[compact.samePlaceRoute!.sourceRef] });
    expect(expanded.routes.filter((route) => route.fromPlaceId !== place.id && route.toPlaceId !== place.id)).toEqual(original.routes);
  });

  it("reuses an edited shared source while leaving unrelated sources intact", () => {
    const original = readJson(process.cwd(), cityPaths(process.cwd(), "milano").travel);
    const compact = compactTravel(original) as CompactTravel;
    const first = compact.routes.find((route) => route.mode === "walk")!;
    const affected = compact.routes.filter((route) => route.sourceRef === first.sourceRef);
    expect(affected.length).toBeGreaterThan(1);
    const prior = compact.routeSources[first.sourceRef][0].claimJa;
    compact.routeSources[first.sourceRef][0].claimJa += " 試験用の追記。";
    const expanded = travelCatalogSchema.parse(expandTravel(compact, original.routes));
    for (const reference of affected) {
      const route = expanded.routes.find((item) => item.fromPlaceId === reference.fromPlaceId && item.toPlaceId === reference.toPlaceId && item.mode === reference.mode)!;
      expect(route.sources[0].claimJa).toBe(`${prior} 試験用の追記。`);
      if (reference.bothDirections) {
        const reverse = expanded.routes.find((item) => item.fromPlaceId === reference.toPlaceId && item.toPlaceId === reference.fromPlaceId && item.mode === reference.mode)!;
        expect(reverse.sources[0].claimJa).toBe(route.sources[0].claimJa);
      }
    }
    const other = compact.routes.find((item) => item.sourceRef !== first.sourceRef)!;
    const unrelated = expanded.routes.find((item) => item.fromPlaceId === other.fromPlaceId && item.toPlaceId === other.toPlaceId && item.mode === other.mode)!;
    expect(unrelated.sources).toEqual(compact.routeSources[other.sourceRef]);
  });

  it("does not invent the reverse of Milan's one-way tram route", () => {
    const original = readJson(process.cwd(), cityPaths(process.cwd(), "milano").travel);
    const compact = compactTravel(original) as CompactTravel;
    const tram = compact.routes.find((route) => route.mode === "tram")!;
    expect(tram).toBeDefined();
    expect(tram.bothDirections).toBeUndefined();
    const expanded = travelCatalogSchema.parse(expandTravel(compact, original.routes));
    expect(expanded.routes.filter((route) => route.mode === "tram")).toEqual(original.routes.filter((route: { mode: string }) => route.mode === "tram"));
  });

  it("round-trips compact city routes without changing direction, order, sources or transit reviews", async () => {
    const root = fixture();
    const before = fingerprint(root);
    const decisions = read(root, indiaDecisionFile);
    for (const cityId of allCities) {
      const file = cityPaths(root, cityId).travel;
      const original = read(root, file);
      const bundle = exportEditableCityBundle(root, cityId);
      expect(bundle.schemaVersion).toBe(2);
      expect(compactCityBundle(exportCityBundle(root, cityId))).toEqual(bundle);
      expect(bundle.travel.routes.length).toBeLessThan(readJson(root, file).routes.length);
      expect((await applyCityBundle(root, bundle, true)).changedFiles, cityId).toEqual([]);
      // Compare the full file, not just times and fares: array order, all
      // direction-specific evidence, transfer notes and estimates matter.
      expect(read(root, file), cityId).toBe(original);
      expect(read(root, indiaDecisionFile), cityId).toBe(decisions);
    }
    expect(fingerprint(root)).toBe(before);
  }, 480_000);

  it("applies an explicitly bidirectional edit to exactly those two directed routes", async () => {
    const root = fixture();
    const milan = cityPaths(root, "milano").travel;
    const before = readJson(root, milan);
    const bundle = exportEditableCityBundle(root, "milano");
    const route = bundle.travel.routes.find((item) => item.bothDirections && item.mode === "walk")!;
    expect(route).toBeDefined();
    const { fromPlaceId, toPlaceId, mode } = route;
    route.minutes += 1;
    expect((await applyCityBundle(root, bundle, true)).changedFiles).toEqual([milan]);
    const after = readJson(root, milan);
    expect(after.routes).toHaveLength(before.routes.length);
    for (let index = 0; index < before.routes.length; index++) {
      const previous = before.routes[index];
      const selected = previous.mode === mode &&
        ((previous.fromPlaceId === fromPlaceId && previous.toPlaceId === toPlaceId) ||
          (previous.fromPlaceId === toPlaceId && previous.toPlaceId === fromPlaceId));
      expect(after.routes[index]).toEqual(selected ? { ...previous, minutes: previous.minutes + 1 } : previous);
    }
  }, 180_000);

  it("rejects missing source references, duplicate directed routes and unknown places without writing", async () => {
    const root = fixture();
    const before = fingerprint(root);
    const brokenSource = exportEditableCityBundle(root, "milano");
    brokenSource.travel.routes[0].sourceRef = "missing_source";
    await expect(applyCityBundle(root, brokenSource, true)).rejects.toThrow("Unknown route source: missing_source");
    expect(fingerprint(root)).toBe(before);

    const duplicate = exportEditableCityBundle(root, "milano");
    const shared = duplicate.travel.routes.find((route) => route.bothDirections)!;
    const reverse = { ...shared, fromPlaceId: shared.toPlaceId, toPlaceId: shared.fromPlaceId };
    delete reverse.bothDirections;
    duplicate.travel.routes.push(reverse);
    await expect(applyCityBundle(root, duplicate, true)).rejects.toThrow("Duplicate directed route: p_galleria:p_duomo:walk");
    expect(fingerprint(root)).toBe(before);

    const missingPlace = exportEditableCityBundle(root, "milano");
    missingPlace.travel.routes[0].toPlaceId = "missing_place";
    await expect(applyCityBundle(root, missingPlace, true)).rejects.toThrow(/Unknown route destination/);
    expect(fingerprint(root)).toBe(before);
  }, 180_000);

  it("exports every existing city accurately and checks an unchanged bundle without writing", async () => {
    const root = fixture();
    const before = fingerprint(root);
    const tourism = merged(root, "tourism/catalog.json");
    for (const cityId of allCities) {
      const bundle = exportCityBundle(root, cityId);
      const paths = cityPaths(root, cityId);
      expect(bundle.cityId).toBe(cityId);
      expect(bundle.city).toEqual(readJson(root, paths.city));
      expect(bundle.travel).toEqual(readJson(root, paths.travel));
      expect(bundle.travelSettings).toEqual(readJson(root, paths.settings));
      const landmarks = tourism.landmarks.filter((item: { cityId: string }) => item.cityId === cityId);
      const landmarkIds = new Set(landmarks.map((item: { id: string }) => item.id));
      expect(bundle.landmarks).toEqual(landmarks);
      expect(bundle.clues).toEqual(tourism.clues.filter((item: { landmarkId: string }) => landmarkIds.has(item.landmarkId)));
    }
    await applyCityBundle(root, exportCityBundle(root, "delhi"));
    expect(fingerprint(root)).toBe(before);
    expect(() => exportCityBundle(root, "unknown_city")).toThrow("Register city unknown_city in exactly one journey before creating its bundle");
  }, 180_000);

  it("rolls back earlier writes if a later file cannot be replaced", () => {
    const root = fixture();
    const { city, settings } = cityPaths(root, "delhi");
    const original = { [city]: read(root, city), [settings]: read(root, settings) };
    const next = { [city]: `${original[city]}\n`, [settings]: `${original[settings]}\n` };
    const before = fingerprint(root);
    let calls = 0;
    const failingMove: typeof renameSync = (from, to) => {
      if (++calls === 2) throw new Error("injected rename failure");
      renameSync(from, to);
    };
    expect(() => writeCityBundleFiles(root, original, next, exportCityBundle(root, "delhi").baseFingerprint, failingMove))
      .toThrow(/injected rename failure/);
    expect(calls).toBe(2);
    expect(read(root, city)).toBe(original[city]);
    expect(read(root, settings)).toBe(original[settings]);
    expect(fingerprint(root)).toBe(before);
    expect(existsSync(path.join(root, ".city-bundle.lock"))).toBe(false);
  }, 180_000);

  it("never overwrites a city file created concurrently and rolls back earlier new files", () => {
    const root = fixture();
    // A new city's files go to its journey's folder (here test_journey's own, as it has no city elsewhere).
    registerJourney(root, testJourney);
    const city = `${testLayer}/cities/testcity.json`, travel = `${testLayer}/travel/testcity.json`;
    const original = { [city]: null, [travel]: null };
    const next = { [city]: "first new file", [travel]: "second new file" };
    const milan = cityPaths(root, "milano").city;
    const beforeMilan = read(root, milan);
    let calls = 0;
    const racingLink: typeof linkSync = (from, to) => {
      if (++calls === 2) writeFileSync(to, "another editor's file", { flag: "wx" });
      linkSync(from, to);
    };
    expect(() => writeCityBundleFiles(root, original, next, exportCityBundle(root, "delhi").baseFingerprint, renameSync, racingLink)).toThrow(/EEXIST: file already exists, link/);
    expect(calls).toBe(2);
    expect(existsSync(path.join(root, city))).toBe(false);
    expect(read(root, travel)).toBe("another editor's file");
    expect(read(root, milan)).toBe(beforeMilan);
    expect(existsSync(path.join(root, ".city-bundle.lock"))).toBe(false);
  }, 180_000);

  it("does not overwrite another editor's newer change during a rollback", () => {
    const root = fixture();
    const { city, settings } = cityPaths(root, "delhi");
    const original = { [city]: read(root, city), [settings]: read(root, settings) };
    const next = { [city]: `${original[city]}\n`, [settings]: `${original[settings]}\n` };
    const newer = "another editor's newer city data";
    let calls = 0;
    const racingMove: typeof renameSync = (from, to) => {
      if (++calls === 2) {
        writeFileSync(path.join(root, city), newer);
        throw new Error("injected failure after another editor changed the first file");
      }
      renameSync(from, to);
    };
    expect(() => writeCityBundleFiles(root, original, next, exportCityBundle(root, "delhi").baseFingerprint, racingMove))
      .toThrow(/rollback failed/i);
    expect(read(root, city)).toBe(newer);
    expect(read(root, settings)).toBe(original[settings]);
    expect(existsSync(path.join(root, ".city-bundle.lock"))).toBe(false);
  }, 180_000);

  it("does not delete another editor's newer change to a new file during a rollback", () => {
    const root = fixture();
    registerJourney(root, testJourney);
    const city = `${testLayer}/cities/testcity.json`, travel = `${testLayer}/travel/testcity.json`;
    const original = { [city]: null, [travel]: null };
    const next = { [city]: "first new file", [travel]: "second new file" };
    const newer = "another editor changed the first file";
    let calls = 0;
    const racingLink: typeof linkSync = (from, to) => {
      if (++calls === 2) {
        writeFileSync(path.join(root, city), newer);
        throw new Error("injected link failure");
      }
      linkSync(from, to);
    };
    expect(() => writeCityBundleFiles(root, original, next, exportCityBundle(root, "delhi").baseFingerprint, renameSync, racingLink))
      .toThrow(/rollback failed/i);
    expect(read(root, city)).toBe(newer);
    expect(existsSync(path.join(root, travel))).toBe(false);
    expect(existsSync(path.join(root, ".city-bundle.lock"))).toBe(false);
  }, 180_000);
});
