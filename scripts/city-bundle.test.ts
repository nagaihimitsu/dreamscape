import { createHash } from "node:crypto";
import { cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyCityBundle, compactCityBundle, exportCityBundle, exportEditableCityBundle, newCityBundle, writeCityBundleFiles } from "./city-bundle";
import { compactTravel, expandTravel, type CompactTravel } from "./city-bundle-routes";
import { travelCatalogSchema } from "../src/content/travel-schemas";
import { inputFingerprint } from "./city-bundle-files";
import { getJourneyAuthoringProfile, journeyAuthoringProfiles } from "./journey-authoring";
import { displayPath, loadContentSources, readJourneyCatalog, requireCity, storyFile } from "./content-sources";
import type { MergedKind } from "./content-layout";
import { cityTransitFile, inspectCityTransit, readTransitLedger } from "./journey-transit-review";
import { inspectIndiaReadiness, loadIndiaReadiness } from "./india-readiness";
import { buildIndiaTransitReview, readIndiaTransitReview } from "./india-transit-review";
import { resolvePublicFile } from "./public-assets";

const roots: string[] = [];
const allCities = readJourneyCatalog(process.cwd()).journeys.flatMap((journey) => journey.cities.map((city) => city.id));
function fixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-city-bundle-"));
  roots.push(root);
  for (const directory of ["content", "public"]) {
    cpSync(path.join(process.cwd(), directory), path.join(root, directory), { recursive: true });
  }
  const extraFiles = [...[...journeyAuthoringProfiles(process.cwd()).values()].map((profile) => profile.observationFile),
    "authoring/research/golden-triangle-transit-20261103/decisions.json",
    ...allCities.map((cityId) => cityTransitFile(process.cwd(), cityId)).filter((file): file is string => !!file)];
  for (const file of extraFiles) {
    if (!existsSync(path.join(process.cwd(), file))) continue;
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    cpSync(path.join(process.cwd(), file), path.join(root, file));
  }
  return root;
}
const read = (root: string, file: string) => readFileSync(path.join(root, file), "utf8");
const readJson = (root: string, file: string) => JSON.parse(read(root, file));
const writeJson = (root: string, file: string, value: unknown) =>
  writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
// Shared-art fixtures use the current location background for arrivals. An
// explicit story reference would correctly prevent replacing the hotel's art.
function useArrivalLocationBackground(root: string, cityId: string) {
  const city = readJson(root, cityPaths(root, cityId).city);
  if (!city.arrivalStoryId) return;
  const file = storyFile(loadContentSources(root), city.arrivalStoryId)!;
  writeFileSync(file, readFileSync(file, "utf8").replace(/^# background:.*\n/gm, ""));
}
const fingerprint = inputFingerprint;
/** Root-relative paths of a city's files and of the content layer holding them, wherever the fixture keeps them. */
function cityPaths(root: string, cityId: string) {
  const sources = loadContentSources(root);
  const city = requireCity(sources, cityId);
  return { layer: displayPath(root, sources.layers.find((layer) => layer.id === city.layer)!.directory),
    city: displayPath(root, city.file), travel: displayPath(root, city.travelFile), settings: displayPath(root, city.settingsFile) };
}
const cityFiles = (root: string, cityId: string) => { const paths = cityPaths(root, cityId); return [paths.city, paths.travel, paths.settings]; };
/** A catalog of the fixture's merged view (every content layer). */
const merged = (root: string, kind: MergedKind) => loadContentSources(root).catalogs[kind]!.value as any;
/** Root-relative paths of every layer file of these catalogs. */
const catalogFiles = (root: string, kinds: MergedKind[]) => {
  const sources = loadContentSources(root);
  return kinds.flatMap((kind) => sources.catalogs[kind]!.provenance.files.map((file) => displayPath(root, file)));
};
// A journey registers itself with its own folder and manifest.
function registerJourney(root: string, journey: { id: string; [key: string]: unknown }) {
  mkdirSync(path.join(root, "content/journeys", journey.id), { recursive: true });
  writeJson(root, `content/journeys/${journey.id}/manifest.json`, { schemaVersion: 1, order: 900, ...journey });
}
const testJourney = { id: "test_journey", nameJa: "試験の旅", status: "preparing",
  cities: [{ id: "testcity", nameJa: "試験都市" }],
  currency: { code: "TST", symbol: "¤", unitJa: "試験通貨", unit: "whole" },
  initialBudget: 1000, intercityModes: [] };
const testLayer = "content/journeys/test_journey";
/** Fill a new-city template with the smallest valid city (a hotel modelled on Delhi's). */
function completeTestCity(root: string, template: ReturnType<typeof exportCityBundle>) {
  const existing = exportCityBundle(root, "delhi");
  const hotel = structuredClone(existing.travel.places.find((place) => place.id === "delhi_hotel_hub")!);
  const identity = structuredClone(existing.travel.routes.find((route) => route.fromPlaceId === hotel.id && route.toPlaceId === hotel.id && route.mode === "walk")!);
  hotel.id = "testcity_hotel";
  hotel.cityId = "testcity";
  hotel.nameJa = "試験の滞在先";
  hotel.nameEn = "Test hotel";
  hotel.backgroundAssetId = "testcity_hotel_bg";
  identity.fromPlaceId = hotel.id;
  identity.toPlaceId = hotel.id;
  template.city = { schemaVersion: 1, id: "testcity", countryCode: "ZZ", nameJa: "試験都市", themeJa: "試験用",
    firstClearReward: { rewardSourceId: "testcity_legacy_placeholder", ap: 0 }, landmarkIdsPlanned: [], productionStatus: "prototype" };
  template.travel = { cityId: "testcity", places: [hotel], routes: [identity], events: [] };
  template.travelSettings = { initialBudget: 1000, hotelPlaceId: hotel.id, lodgingCost: 0, retryMinutes: 15, notes: "試験用設定" };
  template.backgrounds = { testcity_hotel_bg: { nameJa: "試験", captionJa: "試験の滞在先", color: "#817569" } };
  template.assets = [];
  template.dateDestinations = [];
  template.transitDecisions = null;
}
/** Every file below content/ and public/ except one layer folder, by path. */
function filesOutside(root: string, layer: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (relative: string) => {
    if (relative === layer) return;
    const absolute = path.join(root, relative);
    if (statSync(absolute).isDirectory()) for (const name of readdirSync(absolute)) walk(`${relative}/${name}`);
    else files[relative] = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  };
  walk("content");
  walk("public");
  return files;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("city editing bundle", () => {
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
    const decisionFile = "authoring/research/golden-triangle-transit-20261103/decisions.json";
    const decisions = read(root, decisionFile);
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
      expect(read(root, decisionFile), cityId).toBe(decisions);
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

  it("applies one city's metadata, travel, prices, images and destinations without changing other cities", async () => {
    const root = fixture();
    const bundle = exportCityBundle(root, "delhi");
    const agraBefore = cityFiles(root, "agra").map((file) => read(root, file));
    const milanBefore = cityFiles(root, "milano").map((file) => read(root, file));
    const delhi = cityPaths(root, "delhi");
    const beforePresentation = merged(root, "romance/presentation.json");
    const beforeTourism = merged(root, "tourism/catalog.json");
    const beforeDestinations = merged(root, "romance/date_destinations.json");
    const beforeReadiness = inspectIndiaReadiness(loadIndiaReadiness(root));
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
    const afterReadiness = inspectIndiaReadiness(loadIndiaReadiness(root));
    expect(beforeReadiness.ready).toBe(true);
    expect(afterReadiness.ready).toBe(beforeReadiness.ready);
    expect(afterReadiness.readyForPromotion).toBe(beforeReadiness.readyForPromotion);
    expect(afterReadiness.cities.map((city) => city.issues.map((issue) => issue.code))).toEqual(beforeReadiness.cities.map((city) => city.issues.map((issue) => issue.code)));
  }, 180_000);

  it("rejects stale edits after unrelated content or image changes without writing", async () => {
    const root = fixture();
    for (const file of [cityPaths(root, "agra").city, "assets/tourism/india/agra_taj_mahal.jpg", "authoring/research/golden-triangle-transit-20261103/decisions.json"]) {
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

  it("checks a city's transit decisions alongside its edited routes", async () => {
    const root = fixture();
    const bundle = exportCityBundle(root, "delhi");
    expect(bundle.transitDecisions).not.toBeNull();
    const decisions = bundle.transitDecisions as { cityId: string; fromPlaceId: string; toPlaceId: string; mode: "rail" | "bus"; status: string }[];
    const decision = decisions[0];
    expect(decision).toMatchObject({ cityId: "delhi", status: "not_suitable" });
    const template = bundle.travel.routes.find((route) => route.mode === decision.mode && route.fromPlaceId !== route.toPlaceId)!;
    bundle.travel.routes.push({ ...structuredClone(template), fromPlaceId: decision.fromPlaceId, toPlaceId: decision.toPlaceId });
    const before = fingerprint(root);
    await expect(applyCityBundle(root, bundle, true)).rejects.toThrow("Reviewed transit decision conflicts with a playable route: delhi:");
    expect(fingerprint(root)).toBe(before);
    // Compacting the same edit must still reject a route that was recorded as
    // unsuitable; an absent route is not equivalent to a confirmed service.
    await expect(applyCityBundle(root, compactCityBundle(bundle), true)).rejects.toThrow("Reviewed transit decision conflicts with a playable route: delhi:");
    expect(fingerprint(root)).toBe(before);
    const unreviewed = exportEditableCityBundle(root, "delhi");
    const index = unreviewed.travel.routes.findIndex((route) => route.mode === "bus");
    expect(index).toBeGreaterThanOrEqual(0);
    unreviewed.travel.routes.splice(index, 1);
    await expect(applyCityBundle(root, unreviewed, true)).rejects.toThrow(/undecided/i);
    expect(fingerprint(root)).toBe(before);
    bundle.transitDecisions = decisions.filter((item) => item !== decision);
    const original = readJson(root, "authoring/research/golden-triangle-transit-20261103/decisions.json");
    await applyCityBundle(root, bundle, true);
    const updated = readJson(root, "authoring/research/golden-triangle-transit-20261103/decisions.json");
    expect(updated.decisions.filter((item: { cityId: string }) => item.cityId !== "delhi"))
      .toEqual(original.decisions.filter((item: { cityId: string }) => item.cityId !== "delhi"));
    expect(updated.decisions.some((item: { cityId: string; fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.cityId === "delhi" && item.fromPlaceId === decision.fromPlaceId && item.toPlaceId === decision.toPlaceId && item.mode === decision.mode)).toBe(false);
    const report = buildIndiaTransitReview(readIndiaTransitReview(root));
    expect(report.counts.delhi.unresearched).toBe(0);
    expect(report.counts.delhi.inconclusive).toBe(0);
    expect(report.counts.delhi.available).toBeGreaterThan(0);
  }, 180_000);

  it("edits the selected Uzbek transit ledger while rejecting unknown directions and image changes", async () => {
    const root = fixture();
    const cityId = "tashkent";
    const ledgerFile = cityTransitFile(root, cityId)!;
    const otherLedger = cityTransitFile(root, "khiva")!;
    const otherBefore = read(root, otherLedger);
    const bundle = exportEditableCityBundle(root, cityId);
    const decisions = bundle.transitDecisions as Array<{ status: string; reasonJa: string; sources: unknown[] }>;
    expect(decisions).toHaveLength(bundle.travel.places.length * (bundle.travel.places.length - 1) * 4);
    expect(decisions.every((decision) => decision.sources.length > 0)).toBe(true);
    decisions[0].reasonJa += " 編集テストの注記。";
    const changed = await applyCityBundle(root, bundle, true);
    expect(changed.changedFiles).toEqual([ledgerFile]);
    expect(read(root, otherLedger)).toBe(otherBefore);
    const travel = travelCatalogSchema.parse(readJson(root, cityPaths(root, cityId).travel));
    expect(inspectCityTransit(travel, readTransitLedger(root, ledgerFile)).ready).toBe(true);

    const missing = exportCityBundle(root, cityId);
    missing.transitDecisions!.pop();
    const before = fingerprint(root);
    await expect(applyCityBundle(root, missing, true)).rejects.toThrow(/Unreviewed transit direction/);
    const unknown = exportCityBundle(root, cityId);
    const absent = (unknown.transitDecisions as typeof decisions).find((decision) => decision.status !== "available")!;
    absent.status = "unconfirmed";
    await expect(applyCityBundle(root, unknown, true)).rejects.toThrow(/undecided directions/);
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
    const sharedId = delhi.places.find((item: { id: string }) => item.id === "delhi_hotel_hub").backgroundAssetId;
    agra.places.find((item: { id: string }) => item.id === "agra_hotel_hub").backgroundAssetId = sharedId;
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
    const sharedId = delhi.places.find((item: { id: string }) => item.id === "delhi_hotel_hub").backgroundAssetId;
    agra.places.find((item: { id: string }) => item.id === "agra_hotel_hub").backgroundAssetId = sharedId;
    writeJson(root, agraTravel, agra);
    const sharedBackground = merged(root, "romance/presentation.json").backgrounds[sharedId];
    const bundle = exportCityBundle(root, "delhi");
    bundle.travel.places.find((place) => place.id === "delhi_hotel_hub")!.backgroundAssetId = "delhi_alternate_hotel_bg";
    bundle.backgrounds.delhi_alternate_hotel_bg = { ...bundle.backgrounds[sharedId], captionJa: "デリーの滞在先" };
    delete bundle.backgrounds[sharedId];
    await applyCityBundle(root, bundle, true);
    const presentation = merged(root, "romance/presentation.json");
    expect(presentation.backgrounds[sharedId]).toEqual(sharedBackground);
    expect(presentation.backgrounds.delhi_alternate_hotel_bg.captionJa).toBe("デリーの滞在先");
    expect(readJson(root, agraTravel).places.find((item: { id: string }) => item.id === "agra_hotel_hub").backgroundAssetId).toBe(sharedId);
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

  it("applies edits to all eight cities without changing other cities", async () => {
    const root = fixture();
    const cities = allCities;
    for (const cityId of cities) {
      const untouched = cities.filter((id) => id !== cityId).flatMap((id) => cityFiles(root, id));
      const before = Object.fromEntries(untouched.map((file) => [file, read(root, file)]));
      const sharedFiles = [...catalogFiles(root, ["tourism/catalog.json", "romance/presentation.json", "romance/date_destinations.json"]),
        "authoring/research/golden-triangle-transit-20261103/decisions.json"];
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

  it("requires a registered journey and complete input before creating a new prototype city", async () => {
    const root = fixture();
    expect(() => newCityBundle(root, "unregistered_city")).toThrow("Register city unregistered_city in exactly one journey before creating its bundle");
    expect(() => newCityBundle(root, "delhi")).toThrow("City already exists: delhi");
    for (const unsafeId of ["constructor", "prototype", "__proto__"]) {
      registerJourney(root, { id: "unsafe_test", nameJa: "試験", status: "preparing",
        cities: [{ id: unsafeId, nameJa: "試験" }],
        currency: { code: "TST", symbol: "¤", unitJa: "試験通貨", unit: "whole" }, intercityModes: [] });
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
    await expect(applyCityBundle(root, template, true)).rejects.toThrow(/"countryCode"[\s\S]*Too small: expected string to have exactly 2 characters/);
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
    expect(() => newCityBundle(root, "testcity")).toThrow("City already exists: testcity");
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
      descriptionJa: "試験用のデート先", backgroundAssetId: "testcity_garden_bg", facts: template.travel.places[0].sources };
    bundle.travel.places[0].destinationIds = [destination.id];
    bundle.backgrounds[destination.backgroundAssetId] = { nameJa: "試験の庭園", captionJa: "試験用の背景", color: "#6f8a5b" };
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
    shared.travel.places[0].backgroundAssetId = coreBackground[0];
    delete shared.backgrounds.testcity_hotel_bg;
    shared.backgrounds[coreBackground[0]] = { ...(coreBackground[1] as object), captionJa: "他の層の背景を変えてはならない" } as typeof shared.backgrounds[string];
    await expect(applyCityBundle(root, shared, true)).rejects.toThrow(/Cannot change another city's or shared background/);
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
      descriptionJa: "試験用のデート先", backgroundAssetId: "testcity_garden_bg", facts: template.travel.places[0].sources };
    bundle.travel.places[0].destinationIds = [destination.id];
    bundle.backgrounds[destination.backgroundAssetId] = { nameJa: "試験の庭園", captionJa: "試験用の背景", color: "#6f8a5b" };
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
      .toThrow("Invalid city bundle file set");
    expect(() => writeCityBundleFiles(root, { "content/journeys/unknown_journey/cities/testcity.json": null },
      { "content/journeys/unknown_journey/cities/testcity.json": "new" }, before)).toThrow("Invalid city bundle file set");
    // A new city's files belong to its own journey's layer, not to another registered one.
    for (const layer of [otherLayer, "content"]) {
      const file = `${layer}/cities/testcity.json`;
      expect(() => writeCityBundleFiles(root, { [file]: null }, { [file]: "new" }, before), layer).toThrow("Invalid city bundle file set");
    }
    expect(fingerprint(root)).toBe(before);
  }, 180_000);
});
