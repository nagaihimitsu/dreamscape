import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { exportCityBundle } from "./city-bundle";
import { inputFingerprint, transitLedgerFiles } from "./city-bundle-files";
import { getJourneyAuthoringProfile, journeyAuthoringProfiles } from "./journey-authoring";
import { displayPath, loadContentSources, readJourneyCatalog, requireCity, storyFile } from "./content-sources";
import type { MergedKind } from "./content-layout";

// Fixtures and helpers shared by the city-bundle tests (scripts/city-bundle*.test.ts).
// The tests are split over several files so that their slow content builds run in parallel.

const roots: string[] = [];
export const allCities = readJourneyCatalog(process.cwd()).journeys.flatMap((journey) => journey.cities.map((city) => city.id));
/** Golden Triangle's journey-wide transit decision ledger (manifest authoring profile). */
export const indiaDecisionFile = getJourneyAuthoringProfile(process.cwd(), "golden_triangle").transitDecisionLedger!.file;
export function fixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-city-bundle-"));
  roots.push(root);
  for (const directory of ["content", "public"]) {
    cpSync(path.join(process.cwd(), directory), path.join(root, directory), { recursive: true });
  }
  const extraFiles = [...[...journeyAuthoringProfiles(process.cwd()).values()].map((profile) => profile.observationFile),
    ...transitLedgerFiles(process.cwd())];
  for (const file of extraFiles) {
    if (!existsSync(path.join(process.cwd(), file))) continue;
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    cpSync(path.join(process.cwd(), file), path.join(root, file));
  }
  return root;
}
export const read = (root: string, file: string) => readFileSync(path.join(root, file), "utf8");
export const readJson = (root: string, file: string) => JSON.parse(read(root, file));
export const writeJson = (root: string, file: string, value: unknown) =>
  writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
// Shared-art fixtures use the current location background for arrivals. An
// explicit story reference would correctly prevent replacing the hotel's art.
export function useArrivalLocationBackground(root: string, cityId: string) {
  const city = readJson(root, cityPaths(root, cityId).city);
  if (!city.arrivalStoryId) return;
  const file = storyFile(loadContentSources(root), city.arrivalStoryId)!;
  writeFileSync(file, readFileSync(file, "utf8").replace(/^# background:.*\n/gm, ""));
}
export const fingerprint = inputFingerprint;
/** Root-relative paths of a city's files and of the content layer holding them, wherever the fixture keeps them. */
export function cityPaths(root: string, cityId: string) {
  const sources = loadContentSources(root);
  const city = requireCity(sources, cityId);
  return { layer: displayPath(root, sources.layers.find((layer) => layer.id === city.layer)!.directory),
    city: displayPath(root, city.file), travel: displayPath(root, city.travelFile), settings: displayPath(root, city.settingsFile) };
}
export const cityFiles = (root: string, cityId: string) => { const paths = cityPaths(root, cityId); return [paths.city, paths.travel, paths.settings]; };
/** A catalog of the fixture's merged view (every content layer). */
export const merged = (root: string, kind: MergedKind) => loadContentSources(root).catalogs[kind]!.value as any;
/** Root-relative paths of every layer file of these catalogs. */
export const catalogFiles = (root: string, kinds: MergedKind[]) => {
  const sources = loadContentSources(root);
  return kinds.flatMap((kind) => sources.catalogs[kind]!.provenance.files.map((file) => displayPath(root, file)));
};
// A journey registers itself with its own folder and manifest.
export function registerJourney(root: string, journey: { id: string; [key: string]: unknown }) {
  mkdirSync(path.join(root, "content/journeys", journey.id), { recursive: true });
  writeJson(root, `content/journeys/${journey.id}/manifest.json`, { schemaVersion: 1, order: 900, ...journey });
}
export const testJourney = { id: "test_journey", nameJa: "試験の旅", status: "preparing",
  cities: [{ id: "testcity", nameJa: "試験都市" }],
  currency: { code: "TST", symbol: "¤", unitJa: "試験通貨", unit: "whole" },
  initialBudget: 1000, intercityModes: [] };
export const testLayer = "content/journeys/test_journey";
/** Fill a new-city template with the smallest valid city (a hotel modelled on Delhi's). */
export function completeTestCity(root: string, template: ReturnType<typeof exportCityBundle>) {
  const existing = exportCityBundle(root, "delhi");
  const hotel = structuredClone(existing.travel.places.find((place) => place.id === "delhi_hotel_hub")!);
  const identity = structuredClone(existing.travel.routes.find((route) => route.fromPlaceId === hotel.id && route.toPlaceId === hotel.id && route.mode === "walk")!);
  hotel.id = "testcity_hotel";
  hotel.cityId = "testcity";
  hotel.nameJa = "試験の滞在先";
  hotel.nameEn = "Test hotel";
  hotel.backgroundId = "testcity_hotel_bg";
  identity.fromPlaceId = hotel.id;
  identity.toPlaceId = hotel.id;
  template.city = { schemaVersion: 1, id: "testcity", countryCode: "ZZ", nameJa: "試験都市", themeJa: "試験用",
    firstClearReward: { rewardSourceId: "testcity_first_clear", ap: 0 }, landmarkIdsPlanned: [], productionStatus: "prototype" };
  template.travel = { cityId: "testcity", places: [hotel], routes: [identity], events: [] };
  template.travelSettings = { initialBudget: 1000, hotelPlaceId: hotel.id, lodgingCost: 0, retryMinutes: 15, notes: "試験用設定" };
  template.backgrounds = { testcity_hotel_bg: { nameJa: "試験", captionJa: "試験の滞在先", color: "#817569" } };
  template.assets = [];
  template.dateDestinations = [];
  template.transitDecisions = null;
}
/** Every file below content/ and public/ except one layer folder, by path. */
export function filesOutside(root: string, layer: string): Record<string, string> {
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

/** Remove the fixtures of the finished test (afterEach in each test file). */
export function removeFixtures() {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
}
