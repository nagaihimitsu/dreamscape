import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyCityBundle, exportCityBundle } from "./city-bundle";
import { inspectJourneyReadiness, loadJourneyReadiness } from "./journey-readiness";
import { resolvePublicFile } from "./public-assets";
import { allCities, catalogFiles, cityFiles, cityPaths, fingerprint, fixture, indiaDecisionFile, merged, read, readJson, removeFixtures } from "./city-bundle-test-helpers";

afterEach(removeFixtures);

describe("city editing bundle: applying edits to each city", () => {
  it("applies one city's metadata, travel, prices, images and destinations without changing other cities", async () => {
    const root = fixture();
    const bundle = exportCityBundle(root, "delhi");
    const agraBefore = cityFiles(root, "agra").map((file) => read(root, file));
    const milanBefore = cityFiles(root, "milano").map((file) => read(root, file));
    const delhi = cityPaths(root, "delhi");
    const beforePresentation = merged(root, "romance/presentation.json");
    const beforeTourism = merged(root, "tourism/catalog.json");
    const beforeDestinations = merged(root, "romance/date_destinations.json");
    const beforeReadiness = inspectJourneyReadiness(loadJourneyReadiness(root, "golden_triangle"));
    bundle.city.themeJa = "試験用の都市テーマ";
    bundle.travel.places.find((place) => place.id === "delhi_hotel_hub")!.nameJa = "試験用の滞在先";
    const route = bundle.travel.routes.find((item) => item.mode === "taxi" && item.fromPlaceId !== item.toPlaceId)!;
    route.minutes += 1;
    route.cost += 1;
    bundle.travelSettings.notes = "試験用の旅行設定";
    const backgroundId = bundle.travel.places.find((place) => place.id === "delhi_red_fort")!.backgroundAssetId;
    bundle.backgrounds[backgroundId].captionJa = "試験用の背景説明";
    const asset = bundle.assets.find((item) => item.id === bundle.backgrounds[backgroundId].imageAssetId)!;
    asset.altJa = "試験用の画像説明";
    bundle.dateDestinations[0].descriptionJa = "試験用のデート先説明";
    const before = fingerprint(root);
    await applyCityBundle(root, bundle);
    expect(fingerprint(root)).toBe(before);
    await applyCityBundle(root, bundle, true);
    expect(readJson(root, delhi.city).themeJa).toBe("試験用の都市テーマ");
    const travel = readJson(root, delhi.travel);
    expect(travel.places.find((place: { id: string }) => place.id === "delhi_hotel_hub").nameJa).toBe("試験用の滞在先");
    expect(travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.fromPlaceId === route.fromPlaceId && item.toPlaceId === route.toPlaceId && item.mode === route.mode)).toEqual(route);
    expect(readJson(root, delhi.settings).notes).toBe("試験用の旅行設定");
    const afterPresentation = merged(root, "romance/presentation.json");
    const afterTourism = merged(root, "tourism/catalog.json");
    const afterDestinations = merged(root, "romance/date_destinations.json");
    expect(afterPresentation.backgrounds[backgroundId].captionJa).toBe("試験用の背景説明");
    expect(afterTourism.assets.find((item: { id: string }) => item.id === asset.id).altJa).toBe("試験用の画像説明");
    expect(afterDestinations.destinations.find((item: { id: string }) => item.id === bundle.dateDestinations[0].id).descriptionJa).toBe("試験用のデート先説明");
    for (const [id, background] of Object.entries(beforePresentation.backgrounds)) if (!(id in bundle.backgrounds))
      expect(afterPresentation.backgrounds[id]).toEqual(background);
    for (const item of beforeTourism.assets) if (!bundle.assets.some((asset) => asset.id === item.id))
      expect(afterTourism.assets.find((asset: { id: string }) => asset.id === item.id)).toEqual(item);
    for (const item of beforeDestinations.destinations) if (item.cityId !== "delhi")
      expect(afterDestinations.destinations.find((destination: { id: string }) => destination.id === item.id)).toEqual(item);
    expect(cityFiles(root, "agra").map((file) => read(root, file))).toEqual(agraBefore);
    expect(cityFiles(root, "milano").map((file) => read(root, file))).toEqual(milanBefore);
    const afterReadiness = inspectJourneyReadiness(loadJourneyReadiness(root, "golden_triangle"));
    expect(beforeReadiness.ready).toBe(true);
    expect(afterReadiness.ready).toBe(beforeReadiness.ready);
    expect(afterReadiness.readyForPromotion).toBe(beforeReadiness.readyForPromotion);
    expect(afterReadiness.cities.map((city) => city.issues.map((issue) => issue.code))).toEqual(beforeReadiness.cities.map((city) => city.issues.map((issue) => issue.code)));
  }, 180_000);

  it("rejects stale edits after unrelated content or image changes without writing", async () => {
    const root = fixture();
    for (const file of [cityPaths(root, "agra").city, "assets/tourism/india/agra_taj_mahal.jpg", indiaDecisionFile]) {
      const bundle = exportCityBundle(root, "delhi");
      const target = file.startsWith("assets/") ? resolvePublicFile(root, file) : path.join(root, file);
      const original = readFileSync(target);
      writeFileSync(target, Buffer.concat([original, Buffer.from("\n")]));
      const before = fingerprint(root);
      await expect(applyCityBundle(root, bundle, true)).rejects.toThrow("City bundle is stale: content or assets changed since export");
      expect(fingerprint(root)).toBe(before);
      expect(readFileSync(target)).toEqual(Buffer.concat([original, Buffer.from("\n")]));
      writeFileSync(target, original);
    }
  }, 180_000);

  it("rejects missing references and duplicate or foreign IDs without writing", async () => {
    const root = fixture();
    const before = fingerprint(root);
    const brokenRoute = exportCityBundle(root, "delhi");
    brokenRoute.travel.routes[0].toPlaceId = "missing_place";
    await expect(applyCityBundle(root, brokenRoute, true)).rejects.toThrow(/Unknown route destination/);
    expect(fingerprint(root)).toBe(before);
    const duplicate = exportCityBundle(root, "delhi");
    duplicate.dateDestinations[0].id = "agra_mehtab_bagh";
    await expect(applyCityBundle(root, duplicate, true)).rejects.toThrow("Duplicate destination ID");
    expect(fingerprint(root)).toBe(before);
    const wrongCity = exportCityBundle(root, "delhi");
    wrongCity.travel.places[0].cityId = "agra";
    await expect(applyCityBundle(root, wrongCity, true)).rejects.toThrow(/Place belongs to another city/);
    expect(fingerprint(root)).toBe(before);
  }, 180_000);

  it("applies edits to every city without changing other cities", async () => {
    const root = fixture();
    const cities = allCities;
    for (const cityId of cities) {
      const untouched = cities.filter((id) => id !== cityId).flatMap((id) => cityFiles(root, id));
      const before = Object.fromEntries(untouched.map((file) => [file, read(root, file)]));
      const sharedFiles = [...catalogFiles(root, ["tourism/catalog.json", "romance/presentation.json", "romance/date_destinations.json"]),
        indiaDecisionFile];
      const sharedBefore = Object.fromEntries(sharedFiles.map((file) => [file, read(root, file)]));
      const bundle = exportCityBundle(root, cityId);
      bundle.travelSettings.notes += " 都市ごとの編集検証。";
      const result = await applyCityBundle(root, bundle, true);
      expect(result.changedFiles).toEqual([cityPaths(root, cityId).settings]);
      expect(exportCityBundle(root, cityId).travelSettings.notes).toBe(bundle.travelSettings.notes);
      for (const file of untouched) expect(read(root, file), `${cityId}: ${file}`).toBe(before[file]);
      for (const file of sharedFiles) expect(read(root, file), `${cityId}: ${file}`).toBe(sharedBefore[file]);
    }
  }, 480_000);
});
