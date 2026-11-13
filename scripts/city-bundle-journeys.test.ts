import { afterEach, describe, expect, it } from "vitest";
import { existsSync, linkSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { applyCityBundle, compactCityBundle, exportCityBundle, exportEditableCityBundle, newCityBundle, writeCityBundleFiles } from "./city-bundle";
import { cityPaths, completeTestCity, filesOutside, fingerprint, fixture, read, readJson, registerJourney, removeFixtures, testJourney, testLayer, writeJson } from "./city-bundle-test-helpers";

afterEach(removeFixtures);

describe("city editing bundle: new cities and journey folders", () => {
  it("requires a registered journey and complete input before creating a new prototype city", async () => {
    const root = fixture();
    expect(() => newCityBundle(root, "unregistered_city")).toThrow("都市 unregistered_city は、ちょうど1つの旅行編の manifest.json の cities に登録してから使います。");
    expect(() => newCityBundle(root, "delhi")).toThrow("都市 delhi はもうあります");
    for (const unsafeId of ["constructor", "prototype", "__proto__"]) {
      registerJourney(root, { id: "unsafe_test", nameJa: "試験", status: "preparing",
        cities: [{ id: unsafeId, nameJa: "試験" }],
        currency: { code: "TST", symbol: "¤", unitJa: "試験通貨", unit: "whole" }, intercityModes: [], transportModes: [] });
      expect(() => newCityBundle(root, unsafeId)).toThrow("Reserved city ID");
      rmSync(path.join(root, "content/journeys/unsafe_test"), { recursive: true });
    }
    registerJourney(root, testJourney);
    const before = fingerprint(root);
    // A journey without cities elsewhere keeps its first city in its own folder.
    const newFiles = [`${testLayer}/cities/testcity.json`, `${testLayer}/travel/testcity.json`, `${testLayer}/travel/testcity-settings.json`];
    const template = newCityBundle(root, "testcity") as ReturnType<typeof exportCityBundle>;
    const compactTemplate = compactCityBundle(template) as { schemaVersion: number; travel: { places: unknown[]; routes: unknown[]; routeSources: unknown; samePlaceRoute?: unknown } };
    expect(compactTemplate.schemaVersion).toBe(2);
    expect(compactTemplate.travel.places).toEqual(template.travel.places);
    expect(compactTemplate.travel.routes).toEqual([]);
    expect(compactTemplate.travel.routeSources).toEqual({});
    expect(compactTemplate.travel.samePlaceRoute).toBeUndefined();
    await expect(applyCityBundle(root, template, true)).rejects.toThrow(/countryCode[\s\S]*Too small: expected string to have exactly 2 characters/);
    expect(fingerprint(root)).toBe(before);
    expect(newFiles.every((file) => !existsSync(path.join(root, file)))).toBe(true);

    completeTestCity(root, template);
    const milan = cityPaths(root, "milano").city, delhi = cityPaths(root, "delhi").travel;
    const beforeMilan = read(root, milan);
    const beforeDelhi = read(root, delhi);
    await applyCityBundle(root, template);
    expect(fingerprint(root)).toBe(before);
    await applyCityBundle(root, template, true);
    expect(newFiles.every((file) => existsSync(path.join(root, file)))).toBe(true);
    expect(readJson(root, newFiles[0])).toEqual(template.city);
    expect(readJson(root, newFiles[1])).toEqual(template.travel);
    expect(read(root, milan)).toBe(beforeMilan);
    expect(read(root, delhi)).toBe(beforeDelhi);
    expect(() => newCityBundle(root, "testcity")).toThrow("都市 testcity はもうあります");
  }, 180_000);

  it("edits a city of a journey folder only there, creating the folder's missing catalogs", async () => {
    const root = fixture();
    registerJourney(root, testJourney);
    const others = filesOutside(root, testLayer);
    const template = newCityBundle(root, "testcity") as ReturnType<typeof exportCityBundle>;
    completeTestCity(root, template);
    expect((await applyCityBundle(root, template, true)).changedFiles).toEqual([`${testLayer}/cities/testcity.json`,
      `${testLayer}/travel/testcity.json`, `${testLayer}/travel/testcity-settings.json`, `${testLayer}/romance/presentation.json`]);
    // Only catalogs that gain entries are created, with just this journey's part.
    expect(readJson(root, `${testLayer}/romance/presentation.json`)).toEqual({ schemaVersion: 1, backgrounds: template.backgrounds, memories: {} });
    expect(existsSync(path.join(root, testLayer, "romance/date_destinations.json"))).toBe(false);
    expect(existsSync(path.join(root, testLayer, "tourism"))).toBe(false);

    const bundle = exportEditableCityBundle(root, "testcity");
    expect(bundle.city).toEqual(template.city);
    expect(bundle.backgrounds).toEqual(template.backgrounds);
    const destination = { id: "testcity_garden", cityId: "testcity", nameJa: "試験の庭園", nameEn: "Test garden",
      descriptionJa: "試験用のデート先", backgroundId: "testcity_garden_bg", facts: template.travel.places[0].sources };
    bundle.travel.places[0].destinationIds = [destination.id];
    bundle.backgrounds[destination.backgroundId] = { nameJa: "試験の庭園", captionJa: "試験用の背景", color: "#6f8a5b" };
    bundle.dateDestinations.push(destination);
    bundle.travelSettings.notes += " 編集の検証。";
    const before = fingerprint(root);
    const expected = [`${testLayer}/travel/testcity.json`, `${testLayer}/travel/testcity-settings.json`,
      `${testLayer}/romance/presentation.json`, `${testLayer}/romance/date_destinations.json`];
    expect((await applyCityBundle(root, bundle)).changedFiles).toEqual(expected);
    expect(fingerprint(root)).toBe(before);
    expect((await applyCityBundle(root, bundle, true)).changedFiles).toEqual(expected);
    expect(readJson(root, `${testLayer}/romance/date_destinations.json`)).toEqual({ schemaVersion: 1, destinations: [destination] });
    expect(Object.keys(readJson(root, `${testLayer}/romance/presentation.json`).backgrounds)).toEqual(["testcity_hotel_bg", "testcity_garden_bg"]);
    expect(exportCityBundle(root, "testcity").dateDestinations).toEqual([destination]);
    expect(filesOutside(root, testLayer)).toEqual(others);
    // A background of another layer is shared: it can be used but not changed from this city.
    const shared = exportCityBundle(root, "testcity");
    const coreBackground = Object.entries(readJson(root, "content/romance/presentation.json").backgrounds)[0];
    shared.travel.places[0].backgroundId = coreBackground[0];
    delete shared.backgrounds.testcity_hotel_bg;
    shared.backgrounds[coreBackground[0]] = { ...(coreBackground[1] as object), captionJa: "他の層の背景を変えてはならない" } as typeof shared.backgrounds[string];
    await expect(applyCityBundle(root, shared, true)).rejects.toThrow(/ほかの都市の背景や共有の背景は変えられません/);
    expect(filesOutside(root, testLayer)).toEqual(others);
  }, 180_000);

  it("edits a city whose journey folder has catalogs without some keys, adding only keys that gain entries", async () => {
    const root = fixture();
    registerJourney(root, testJourney);
    const others = filesOutside(root, testLayer);
    const template = newCityBundle(root, "testcity") as ReturnType<typeof exportCityBundle>;
    completeTestCity(root, template);
    // The merge accepts fragments that leave keys out: this layer contributes nothing there.
    const presentationFile = `${testLayer}/romance/presentation.json`, tourismFile = `${testLayer}/tourism/catalog.json`;
    const destinationsFile = `${testLayer}/romance/date_destinations.json`;
    const files: Record<string, unknown> = { [`${testLayer}/cities/testcity.json`]: template.city, [`${testLayer}/travel/testcity.json`]: template.travel,
      [`${testLayer}/travel/testcity-settings.json`]: template.travelSettings,
      [presentationFile]: { schemaVersion: 1, backgrounds: template.backgrounds }, [tourismFile]: { schemaVersion: 1, assets: [] },
      [destinationsFile]: { schemaVersion: 1 } };
    for (const [file, value] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeJson(root, file, value);
    }
    const tourism = read(root, tourismFile);
    const bundle = exportEditableCityBundle(root, "testcity");
    const destination = { id: "testcity_garden", cityId: "testcity", nameJa: "試験の庭園", nameEn: "Test garden",
      descriptionJa: "試験用のデート先", backgroundId: "testcity_garden_bg", facts: template.travel.places[0].sources };
    bundle.travel.places[0].destinationIds = [destination.id];
    bundle.backgrounds[destination.backgroundId] = { nameJa: "試験の庭園", captionJa: "試験用の背景", color: "#6f8a5b" };
    bundle.dateDestinations.push(destination);
    expect((await applyCityBundle(root, bundle, true)).changedFiles).toEqual([`${testLayer}/travel/testcity.json`, presentationFile, destinationsFile]);
    // Keys that stay empty are not added; the untouched partial catalog keeps its bytes.
    expect(readJson(root, presentationFile)).toStrictEqual({ schemaVersion: 1, backgrounds: bundle.backgrounds });
    expect(readJson(root, destinationsFile)).toStrictEqual({ schemaVersion: 1, destinations: [destination] });
    expect(read(root, tourismFile)).toBe(tourism);
    expect(exportCityBundle(root, "testcity").dateDestinations).toEqual([destination]);
    expect(filesOutside(root, testLayer)).toEqual(others);
  }, 180_000);

  it("removes the files and folders it created in a journey folder when a later write fails", () => {
    const root = fixture();
    registerJourney(root, testJourney);
    const otherLayer = "content/journeys/other_journey";
    registerJourney(root, { ...testJourney, id: "other_journey", order: 901, cities: [{ id: "othercity", nameJa: "別の試験都市" }] });
    const city = `${testLayer}/cities/testcity.json`, presentation = `${testLayer}/romance/presentation.json`;
    const original = { [city]: null, [presentation]: null };
    const next = { [city]: "first new file", [presentation]: "second new file" };
    const before = fingerprint(root);
    let calls = 0;
    const failingLink: typeof linkSync = (from, to) => {
      if (++calls === 2) throw new Error("injected link failure");
      linkSync(from, to);
    };
    expect(() => writeCityBundleFiles(root, original, next, before, renameSync, failingLink)).toThrow("injected link failure");
    expect(calls).toBe(2);
    expect(readdirSync(path.join(root, testLayer))).toEqual(["manifest.json"]);
    expect(fingerprint(root)).toBe(before);
    // One bundle writes one layer: never a journey folder and the core layer together.
    const core = "content/romance/presentation.json";
    expect(() => writeCityBundleFiles(root, { [city]: null, [core]: read(root, core) }, { [city]: "new", [core]: `${read(root, core)}\n` }, before))
      .toThrow("書き込むファイルの組が正しくありません");
    expect(() => writeCityBundleFiles(root, { "content/journeys/unknown_journey/cities/testcity.json": null },
      { "content/journeys/unknown_journey/cities/testcity.json": "new" }, before)).toThrow("書き込むファイルの組が正しくありません");
    // A new city's files belong to its own journey's layer, not to another registered one.
    for (const layer of [otherLayer, "content"]) {
      const file = `${layer}/cities/testcity.json`;
      expect(() => writeCityBundleFiles(root, { [file]: null }, { [file]: "new" }, before), layer).toThrow("書き込むファイルの組が正しくありません");
    }
    expect(fingerprint(root)).toBe(before);
  }, 180_000);
});
