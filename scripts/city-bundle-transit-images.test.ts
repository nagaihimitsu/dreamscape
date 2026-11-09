import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { applyCityBundle, compactCityBundle, exportCityBundle, exportEditableCityBundle } from "./city-bundle";
import { travelCatalogSchema } from "../src/content/travel-schemas";
import { getJourneyAuthoringProfile } from "./journey-authoring";
import { cityTransitPath, cityTransitPlan } from "./journey-transit";
import { inspectCityTransit } from "./transit-ledger";
import { loadContentSources } from "./content-sources";
import { resolvePublicFile } from "./public-assets";
import { cityFiles, cityPaths, fingerprint, fixture, merged, read, readJson, removeFixtures, useArrivalLocationBackground, writeJson } from "./city-bundle-test-helpers";

afterEach(removeFixtures);

describe("city editing bundle: transit ledgers, images and observations", () => {
  it("edits the selected Uzbek transit ledger while rejecting unknown directions and image changes", async () => {
    const root = fixture();
    const cityId = "tashkent";
    const sources = loadContentSources(root);
    const ledgerFile = cityTransitPath(sources, cityId)!;
    expect(ledgerFile).toBe("content/journeys/uzbekistan/travel/tashkent-transit.json");
    const otherLedger = cityTransitPath(sources, "khiva")!;
    const otherBefore = read(root, otherLedger);
    const { modes } = cityTransitPlan(sources, cityId);
    const bundle = exportEditableCityBundle(root, cityId);
    const decisions = bundle.transitDecisions as Array<{ status: string; reasonJa: string; sources: unknown[] }>;
    expect(decisions).toHaveLength(bundle.travel.places.length * (bundle.travel.places.length - 1) * modes.length);
    expect(decisions.every((decision) => decision.sources.length > 0)).toBe(true);
    decisions[0].reasonJa += " 編集テストの注記。";
    const changed = await applyCityBundle(root, bundle, true);
    expect(changed.changedFiles).toEqual([ledgerFile]);
    expect(read(root, otherLedger)).toBe(otherBefore);
    const travel = travelCatalogSchema.parse(readJson(root, cityPaths(root, cityId).travel));
    expect(inspectCityTransit(travel, readJson(root, ledgerFile), modes).ready).toBe(true);

    const missing = exportCityBundle(root, cityId);
    missing.transitDecisions!.pop();
    const before = fingerprint(root);
    await expect(applyCityBundle(root, missing, true)).rejects.toThrow(/Undecided transit direction/);
    const unknown = exportCityBundle(root, cityId);
    // content:build accepts an inconclusive decision; applying a city with one is refused.
    const absent = (unknown.transitDecisions as typeof decisions).find((decision) => decision.status !== "available")!;
    absent.status = "inconclusive";
    await expect(applyCityBundle(root, unknown, true)).rejects.toThrow(/undecided directions/);
    // Two decisions for one direction and mode are refused.
    const duplicate = exportCityBundle(root, cityId);
    duplicate.transitDecisions!.push(structuredClone(duplicate.transitDecisions![0]));
    await expect(applyCityBundle(root, duplicate, true)).rejects.toThrow(/Invalid or duplicate transit direction/);
    // A route where the ledger decided against its mode is refused, also from the compact form: an
    // absent route is not equivalent to a confirmed service.
    type Decision = { fromPlaceId: string; toPlaceId: string; mode: string; status: string };
    const conflicting = exportCityBundle(root, cityId);
    const refused = (conflicting.transitDecisions as Decision[]).find((decision) => decision.status === "not_suitable")!;
    const template = conflicting.travel.routes.find((route) => route.mode === refused.mode && route.fromPlaceId !== route.toPlaceId)!;
    conflicting.travel.routes.push({ ...structuredClone(template), fromPlaceId: refused.fromPlaceId, toPlaceId: refused.toPlaceId });
    await expect(applyCityBundle(root, conflicting, true)).rejects.toThrow(/Transit decision and route disagree/);
    await expect(applyCityBundle(root, compactCityBundle(conflicting), true)).rejects.toThrow(/Transit decision and route disagree/);
    expect(fingerprint(root)).toBe(before);

    const observations = readJson(root, getJourneyAuthoringProfile(root, "uzbekistan").observationFile);
    const mainId = Object.keys(observations.images).find((id) => id.startsWith(`${cityId}_`))!;
    const imagePath = observations.images[mainId].path;
    const changedImage = exportCityBundle(root, cityId);
    const image = changedImage.assets.find((asset) => asset.path === imagePath)!;
    image.path = changedImage.assets.find((asset) => asset.id !== image.id)!.path;
    await expect(applyCityBundle(root, changedImage, true)).rejects.toThrow(/Observation image changed/);
    expect(fingerprint(root)).toBe(before);

    const absolute = resolvePublicFile(root, imagePath);
    writeFileSync(absolute, Buffer.concat([readFileSync(absolute), Buffer.from("test changed image")]));
    // Re-exporting after a binary edit must still require observation review.
    const changedBytes = exportCityBundle(root, cityId);
    await expect(applyCityBundle(root, changedBytes, true)).rejects.toThrow(/Observation image hash changed/);
    expect(read(root, otherLedger)).toBe(otherBefore);
  }, 180_000);

  it("protects missing images, reviewed observation photographs and the release gate", async () => {
    const root = fixture();
    const before = fingerprint(root);
    const missing = exportCityBundle(root, "delhi");
    missing.assets.find((item) => item.id === "gt_img_delhi_red_fort")!.path = "assets/tourism/india/not-found.jpg";
    await expect(applyCityBundle(root, missing, true)).rejects.toThrow("Observation image changed for delhi_red_fort; review observations first");
    expect(fingerprint(root)).toBe(before);
    const changedPhoto = exportCityBundle(root, "delhi");
    changedPhoto.assets.find((item) => item.id === "gt_img_delhi_red_fort")!.path =
      changedPhoto.assets.find((item) => item.id === "gt_img_delhi_qutb_minar")!.path;
    await expect(applyCityBundle(root, changedPhoto, true)).rejects.toThrow("Observation image changed for delhi_red_fort; review observations first");
    expect(fingerprint(root)).toBe(before);
    // The release gate is tested with an actually unfinished journey. India
    // already has authored stories and must permit ordinary no-op edits.
    const prematureRelease = exportCityBundle(root, "tashkent");
    prematureRelease.city.productionStatus = "complete";
    await expect(applyCityBundle(root, prematureRelease, true)).rejects.toThrow("City release status cannot be changed with a bundle");
    expect(fingerprint(root)).toBe(before);
    const shared = exportCityBundle(root, "delhi");
    const sharedAsset = shared.assets.find((item) => item.id === "gt_img_hotel_illustration")!;
    sharedAsset.altJa = "他都市の画像を変えてはならない";
    await expect(applyCityBundle(root, shared, true)).rejects.toThrow("Cannot change another city's or shared image: gt_img_hotel_illustration");
    expect(fingerprint(root)).toBe(before);
  }, 180_000);

  it("does not allow editing a background also used by another city", async () => {
    const root = fixture();
    for (const cityId of ["delhi", "agra"]) useArrivalLocationBackground(root, cityId);
    const agraTravel = cityPaths(root, "agra").travel;
    const agra = readJson(root, agraTravel);
    const delhi = readJson(root, cityPaths(root, "delhi").travel);
    const sharedId = delhi.places.find((item: { id: string }) => item.id === "delhi_hotel_hub").backgroundId;
    agra.places.find((item: { id: string }) => item.id === "agra_hotel_hub").backgroundId = sharedId;
    writeJson(root, agraTravel, agra);
    const bundle = exportCityBundle(root, "delhi");
    bundle.backgrounds[sharedId].captionJa = "他都市の共有背景を変更してはならない";
    const before = fingerprint(root);
    await expect(applyCityBundle(root, bundle, true)).rejects.toThrow(/Cannot change another city's or shared background/);
    expect(fingerprint(root)).toBe(before);
  }, 180_000);

  it("lets a city stop using a shared background while preserving the other city's copy", async () => {
    const root = fixture();
    for (const cityId of ["delhi", "agra"]) useArrivalLocationBackground(root, cityId);
    const agraTravel = cityPaths(root, "agra").travel;
    const agra = readJson(root, agraTravel);
    const delhi = readJson(root, cityPaths(root, "delhi").travel);
    const sharedId = delhi.places.find((item: { id: string }) => item.id === "delhi_hotel_hub").backgroundId;
    agra.places.find((item: { id: string }) => item.id === "agra_hotel_hub").backgroundId = sharedId;
    writeJson(root, agraTravel, agra);
    const sharedBackground = merged(root, "romance/presentation.json").backgrounds[sharedId];
    const bundle = exportCityBundle(root, "delhi");
    bundle.travel.places.find((place) => place.id === "delhi_hotel_hub")!.backgroundId = "delhi_alternate_hotel_bg";
    bundle.backgrounds.delhi_alternate_hotel_bg = { ...bundle.backgrounds[sharedId], captionJa: "デリーの滞在先" };
    delete bundle.backgrounds[sharedId];
    await applyCityBundle(root, bundle, true);
    const presentation = merged(root, "romance/presentation.json");
    expect(presentation.backgrounds[sharedId]).toEqual(sharedBackground);
    expect(presentation.backgrounds.delhi_alternate_hotel_bg.captionJa).toBe("デリーの滞在先");
    expect(readJson(root, agraTravel).places.find((item: { id: string }) => item.id === "agra_hotel_hub").backgroundId).toBe(sharedId);
  }, 180_000);

  it("edits Milan's observations and image attribution without changing unrelated content", async () => {
    const root = fixture();
    const milanTourism = `${cityPaths(root, "milano").layer}/tourism/catalog.json`;
    const before = readJson(root, milanTourism);
    const indiaFiles = ["delhi", "agra", "jaipur"].flatMap((id) => cityFiles(root, id).slice(0, 2));
    const others = Object.fromEntries(indiaFiles.map((file) => [file, read(root, file)]));
    const bundle = exportCityBundle(root, "milano");
    const landmark = bundle.landmarks!.find((item) => item.id === "last_supper")!;
    const clue = bundle.clues!.find((item) => item.id === "last_supper_perspective")!;
    const asset = bundle.assets.find((item) => item.id === landmark.imageAssetId)!;
    landmark.descriptionJa += " 試験用の追記。";
    clue.titleJa += " 試験";
    clue.sources[0].claimJa += " 試験用の追記。";
    asset.altJa += " 試験";
    const snapshot = fingerprint(root);
    const preview = await applyCityBundle(root, bundle);
    expect(preview.changedFiles).toContain(milanTourism);
    expect(fingerprint(root)).toBe(snapshot);
    await applyCityBundle(root, bundle, true);
    const after = readJson(root, milanTourism);
    expect(after.landmarks.find((item: { id: string }) => item.id === landmark.id)).toEqual(landmark);
    expect(after.clues.find((item: { id: string }) => item.id === clue.id)).toEqual(clue);
    expect(after.assets.find((item: { id: string }) => item.id === asset.id)).toEqual(asset);
    expect(after.landmarks.filter((item: { id: string }) => item.id !== landmark.id))
      .toEqual(before.landmarks.filter((item: { id: string }) => item.id !== landmark.id));
    expect(after.clues.filter((item: { id: string }) => item.id !== clue.id))
      .toEqual(before.clues.filter((item: { id: string }) => item.id !== clue.id));
    expect(after.assets.filter((item: { id: string }) => item.id !== asset.id))
      .toEqual(before.assets.filter((item: { id: string }) => item.id !== asset.id));
    for (const file of indiaFiles) expect(read(root, file), file).toBe(others[file]);
    const reloaded = exportCityBundle(root, "milano");
    expect(reloaded.landmarks!.find((item) => item.id === landmark.id)).toEqual(landmark);
    expect(reloaded.clues!.find((item) => item.id === clue.id)).toEqual(clue);
  }, 180_000);

  it("preserves existing Milan observations when applying a legacy bundle", async () => {
    const root = fixture();
    const bundle = exportCityBundle(root, "milano");
    const legacy: Record<string, unknown> = { ...bundle };
    delete legacy.landmarks;
    delete legacy.clues;
    const milanTourism = `${cityPaths(root, "milano").layer}/tourism/catalog.json`;
    const before = read(root, milanTourism);
    const preview = await applyCityBundle(root, legacy);
    expect(preview.changedFiles).toEqual([]);
    await applyCityBundle(root, legacy, true);
    expect(read(root, milanTourism)).toBe(before);
    const compactLegacy = compactCityBundle(legacy);
    expect((await applyCityBundle(root, compactLegacy, true)).changedFiles).toEqual([]);
    expect(read(root, milanTourism)).toBe(before);
  }, 180_000);

  it("rejects foreign landmarks, invalid observation ownership and duplicate IDs", async () => {
    const root = fixture();
    const before = fingerprint(root);
    const foreign = exportCityBundle(root, "milano");
    foreign.landmarks![0].cityId = "agra";
    await expect(applyCityBundle(root, foreign, true)).rejects.toThrow("City ownership mismatch: milano");
    expect(fingerprint(root)).toBe(before);
    const wrongOwner = exportCityBundle(root, "milano");
    wrongOwner.clues![0].landmarkId = "nonexistent_landmark";
    await expect(applyCityBundle(root, wrongOwner, true)).rejects.toThrow("Clue belongs to another city: milano");
    expect(fingerprint(root)).toBe(before);
    const duplicate = exportCityBundle(root, "milano");
    duplicate.clues!.push(structuredClone(duplicate.clues![0]));
    await expect(applyCityBundle(root, duplicate, true)).rejects.toThrow("Duplicate clue ID");
    expect(fingerprint(root)).toBe(before);
  }, 180_000);
});
