import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { citySchema, dateCatalogSchema, presentationSchema } from "../src/content/schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { buildContent } from "./content-pipeline";
import { buildIndiaTransitReview, indiaTransitCities, readIndiaTransitReview } from "./india-transit-review";
import { compactTravel, expandTravel } from "./city-bundle-routes";
import { idSchema, bundleSchema, completeBundleSchema, editableBundleSchema, completeEditableBundleSchema, type CityBundle, type EditableCityBundle } from "./city-bundle-schema";
import { catalogFiles, cityFiles, decisionFile, existing, inputFingerprint, read, writeCityBundleFiles } from "./city-bundle-files";
import { assertUniqueIds, mergeCityCatalogs, referencedBackgrounds } from "./city-bundle-catalogs";

export type { CityBundle, EditableCityBundle } from "./city-bundle-schema";
export { writeCityBundleFiles } from "./city-bundle-files";

const output = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const indiaCity = (id: string) => (indiaTransitCities as readonly string[]).includes(id);

/** Convert a v1 bundle or an incomplete new-city template without inventing data. */
export function compactCityBundle(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid city bundle");
  const bundle = raw as Record<string, unknown>;
  if (bundle.schemaVersion !== 1) throw new Error("Only version 1 city bundles can be compacted");
  return { ...bundle, schemaVersion: 2, travel: compactTravel(bundle.travel) };
}

/** Export the concise authoring form; game content remains the directed v1 catalogs. */
export function exportEditableCityBundle(root: string, cityId: string): EditableCityBundle {
  return completeEditableBundleSchema.parse(compactCityBundle(exportCityBundle(root, cityId)));
}

function owner(root: string, id: string) {
  const catalog = journeyCatalogSchema.parse(read(root, "content/journeys/catalog.json"));
  const journeys = catalog.journeys.filter((journey) => journey.cities.some((city) => city.id === id));
  if (journeys.length !== 1) throw new Error(`Register city ${id} in exactly one journey before creating its bundle`);
  return journeys[0];
}
/** Read an editable snapshot. The catalogs stay authoritative until explicit apply. */
export function exportCityBundle(root: string, cityId: string): CityBundle {
  idSchema.parse(cityId);
  const fingerprint = inputFingerprint(root);
  owner(root, cityId);
  if (!existing(root, cityId)) throw new Error(`Unknown registered city: ${cityId}`);
  const [cityPath, travelPath, settingsPath] = cityFiles(cityId);
  const city = citySchema.parse(read(root, cityPath));
  const travel = travelCatalogSchema.parse(read(root, travelPath));
  const travelSettings = travelSettingsSchema.parse(read(root, settingsPath));
  if (city.id !== cityId || travel.cityId !== cityId) throw new Error(`City ownership mismatch: ${cityId}`);
  const presentation = presentationSchema.parse(read(root, catalogFiles[0]));
  const tourism = tourismCatalogSchema.parse(read(root, catalogFiles[1]));
  const landmarks = tourism.landmarks.filter((landmark) => landmark.cityId === cityId);
  const landmarkIds = new Set(landmarks.map((landmark) => landmark.id));
  const clues = tourism.clues.filter((clue) => landmarkIds.has(clue.landmarkId));
  const destinationCatalog = dateDestinationsSchema.parse(read(root, catalogFiles[2]));
  const dateDestinations = destinationCatalog.destinations.filter((item) => item.cityId === cityId);
  const dates = dateCatalogSchema.parse(read(root, "content/romance/date_catalog.json")).dates;
  const dateBackgrounds = dates.filter((item) => item.chapterId === cityId).map((item) => item.backgroundAssetId);
  const backgroundIds = referencedBackgrounds(travel, dateDestinations, dateBackgrounds);
  const backgrounds: CityBundle["backgrounds"] = {};
  for (const id of backgroundIds) {
    if (!presentation.backgrounds[id]) throw new Error(`Missing background: ${id}`);
    backgrounds[id] = presentation.backgrounds[id];
  }
  const assetIds = new Set(Object.values(backgrounds).map((item) => item.imageAssetId).filter((item): item is string => !!item));
  for (const landmark of landmarks) assetIds.add(landmark.imageAssetId);
  const assets = tourism.assets.filter((item) => assetIds.has(item.id));
  if (assets.length !== assetIds.size) throw new Error(`Missing city image asset: ${cityId}`);
  let transitDecisions: unknown[] | null = null;
  if (indiaCity(cityId)) {
    const ledger = read(root, decisionFile);
    if (!Array.isArray(ledger.decisions)) throw new Error("Invalid transit decision ledger");
    transitDecisions = ledger.decisions.filter((item: { cityId?: string }) => item.cityId === cityId);
  }
  if (inputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during export; retry");
  return completeBundleSchema.parse({ schemaVersion: 1, cityId, baseFingerprint: fingerprint, city, travel, travelSettings, backgrounds, assets, dateDestinations, landmarks, clues, transitDecisions });
}

/** Produce an intentionally incomplete, unpublished template; authors must fill its blanks. */
export function newCityBundle(root: string, cityId: string): unknown {
  idSchema.parse(cityId);
  owner(root, cityId);
  if (existing(root, cityId)) throw new Error(`City already exists: ${cityId}`);
  if (indiaCity(cityId)) throw new Error("India's registered city files must be restored before editing");
  const hotel = `${cityId}_hotel`;
  const background = `${cityId}_hotel_bg`;
  return { schemaVersion: 1, cityId, baseFingerprint: inputFingerprint(root),
    city: { schemaVersion: 1, id: cityId, countryCode: "", nameJa: "", themeJa: "", firstClearReward: { rewardSourceId: "", ap: null }, landmarkIdsPlanned: [], productionStatus: "prototype" },
    travel: { cityId, places: [{ id: hotel, cityId, nameJa: "", nameEn: "", latitude: null, longitude: null, backgroundAssetId: background, sources: [] }], routes: [], events: [] },
    travelSettings: { initialBudget: null, hotelPlaceId: hotel, lodgingCost: null, retryMinutes: 15, notes: "要入力：ゲーム用の前提と出典を記入してください。" },
    backgrounds: { [background]: { nameJa: "", captionJa: "", color: "#817569", fallback: "neutral" } },
    assets: [], dateDestinations: [], landmarks: [], clues: [], transitDecisions: null };
}

/** Validate in an isolated copy before optionally committing an editable snapshot. */
export async function applyCityBundle(root: string, raw: unknown, apply = false): Promise<{ changedFiles: string[] }> {
  let input: z.infer<typeof bundleSchema>;
  if (raw && typeof raw === "object" && "schemaVersion" in raw && raw.schemaVersion === 2) {
    const compact = editableBundleSchema.parse(raw);
    const previous = existing(root, compact.cityId)
      ? travelCatalogSchema.parse(read(root, cityFiles(compact.cityId)[1])).routes : [];
    input = bundleSchema.parse({ ...compact, schemaVersion: 1, travel: expandTravel(compact.travel, previous) });
  } else input = bundleSchema.parse(raw);
  const { cityId } = input;
  owner(root, cityId);
  const fingerprint = inputFingerprint(root);
  if (input.baseFingerprint !== fingerprint) throw new Error("City bundle is stale: content or assets changed since export");
  const isExisting = existing(root, cityId);
  const baseline = isExisting ? exportCityBundle(root, cityId) : null;
  const bundle = completeBundleSchema.parse({ ...input,
    landmarks: input.landmarks ?? baseline?.landmarks ?? [], clues: input.clues ?? baseline?.clues ?? [] });
  if (bundle.city.id !== cityId || bundle.travel.cityId !== cityId || bundle.travel.places.some((place) => place.cityId !== cityId) || bundle.travel.events.some((event) => event.cityId !== cityId) || bundle.dateDestinations.some((item) => item.cityId !== cityId) || bundle.landmarks.some((item) => item.cityId !== cityId))
    throw new Error(`City ownership mismatch: ${cityId}`);
  if (bundle.city.productionStatus !== (baseline?.city.productionStatus ?? "prototype")) throw new Error("City release status cannot be changed with a bundle");
  if (indiaCity(cityId) !== (bundle.transitDecisions !== null)) throw new Error("Transit decision ledger does not match city");
  if (baseline) for (const event of bundle.travel.events) {
    const previous = baseline.travel.events.find((entry) => entry.id === event.id);
    if (previous && previous.contentStatus !== event.contentStatus) throw new Error(`Event release status cannot be changed with a bundle: ${event.id}`);
    if (!previous && bundle.city.productionStatus === "prototype" && event.contentStatus !== "pending_content") throw new Error(`New prototype event must remain pending: ${event.id}`);
  }
  if (!baseline && bundle.travel.events.some((event) => event.contentStatus !== "pending_content")) throw new Error("New prototype events must remain pending");
  assertUniqueIds(bundle.assets, (entry) => entry.id, "asset");
  assertUniqueIds(bundle.dateDestinations, (entry) => entry.id, "destination");
  assertUniqueIds(bundle.landmarks, (entry) => entry.id, "landmark");
  assertUniqueIds(bundle.clues, (entry) => entry.id, "clue");
  const landmarkIds = new Set(bundle.landmarks.map((landmark) => landmark.id));
  if (bundle.clues.some((clue) => !landmarkIds.has(clue.landmarkId))) throw new Error(`Clue belongs to another city: ${cityId}`);
  if (bundle.transitDecisions?.some((item: any) => item?.cityId !== cityId)) throw new Error("Transit decision belongs to another city");
  const values = mergeCityCatalogs(root, bundle, baseline);
  const original: Record<string, string | null> = Object.fromEntries(Object.keys(values).map((file) => [file, existsSync(path.join(root, file)) ? readFileSync(path.join(root, file), "utf8") : null]));
  // Keep formatting and array ordering for semantically unchanged documents.
  const next: Record<string, string> = Object.fromEntries(Object.entries(values).map(([file, value]) => [file,
    original[file] !== null && isDeepStrictEqual(JSON.parse(original[file]!), value) ? original[file]! : output(value)]));
  const changedFiles = Object.keys(next).filter((file) => original[file] !== next[file]);
  const stage = mkdtempSync(path.join(tmpdir(), "dreamscape-city-bundle-"));
  try {
    cpSync(path.join(root, "content"), path.join(stage, "content"), { recursive: true });
    cpSync(path.join(root, "public"), path.join(stage, "public"), { recursive: true });
    for (const [file, value] of Object.entries(next)) {
      const target = path.join(stage, file);
      if (file === decisionFile) continue;
      writeFileSync(target, value);
    }
    if (bundle.transitDecisions) {
      const transit = readIndiaTransitReview(root);
      const check = buildIndiaTransitReview({ catalogs: { ...transit.catalogs, [cityId]: bundle.travel }, decisions: JSON.parse(next[decisionFile]) });
      const counts = check.counts[cityId as keyof typeof check.counts];
      if (counts.unresearched || counts.inconclusive) throw new Error(`Transit has undecided directions: ${cityId}`);
    }
    await buildContent(stage, false);
    if (inputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during validation; bundle was not applied");
    if (apply && changedFiles.length) writeCityBundleFiles(root, original, Object.fromEntries(changedFiles.map((file) => [file, next[file]])), fingerprint);
    return { changedFiles };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}
