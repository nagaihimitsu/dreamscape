import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { citySchema, dateCatalogSchema, presentationSchema } from "../src/content/schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { loadContentSources, parseCatalog, readJourneyCatalog, requireCity } from "./content-sources";
import { buildContent } from "./content-pipeline";
import { buildJourneyTransitDecisionReview, journeyTransitDecisionFile, readJourneyTransitDecisions } from "./journey-transit-decisions";
import { compactTravel, expandTravel } from "./city-bundle-routes";
import { idSchema, bundleSchema, completeBundleSchema, editableBundleSchema, completeEditableBundleSchema, type CityBundle, type EditableCityBundle } from "./city-bundle-schema";
import { bundleCatalogKinds, existing, inputFingerprint, read, writeCityBundleFiles } from "./city-bundle-files";
import { assertUniqueIds, mergeCityCatalogs, referencedBackgrounds } from "./city-bundle-catalogs";
import { cityTransitPath, cityTransitPlan } from "./journey-transit";
import { exportTransitDecisions, inspectCityTransit, transitLedgerSchema } from "./transit-ledger";

export type { CityBundle, EditableCityBundle } from "./city-bundle-schema";
export { writeCityBundleFiles } from "./city-bundle-files";

const output = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

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
  const journeys = readJourneyCatalog(root).journeys.filter((journey) => journey.cities.some((city) => city.id === id));
  if (journeys.length !== 1) throw new Error(`Register city ${id} in exactly one journey before creating its bundle`);
  return journeys[0];
}
/** Read an editable snapshot. The catalogs stay authoritative until explicit apply. */
export function exportCityBundle(root: string, cityId: string): CityBundle {
  idSchema.parse(cityId);
  const fingerprint = inputFingerprint(root);
  owner(root, cityId);
  const sources = loadContentSources(root);
  if (!existing(sources, cityId)) throw new Error(`Unknown registered city: ${cityId}`);
  const files = requireCity(sources, cityId);
  const city = citySchema.parse(files.data);
  const travel = travelCatalogSchema.parse(files.travel);
  const travelSettings = travelSettingsSchema.parse(files.settings);
  if (city.id !== cityId || travel.cityId !== cityId) throw new Error(`City ownership mismatch: ${cityId}`);
  const [presentationKind, tourismKind, destinationsKind] = bundleCatalogKinds;
  const presentation = parseCatalog(sources, presentationSchema, presentationKind);
  const tourism = parseCatalog(sources, tourismCatalogSchema, tourismKind);
  const landmarks = tourism.landmarks.filter((landmark) => landmark.cityId === cityId);
  const landmarkIds = new Set(landmarks.map((landmark) => landmark.id));
  const clues = tourism.clues.filter((clue) => landmarkIds.has(clue.landmarkId));
  const destinationCatalog = parseCatalog(sources, dateDestinationsSchema, destinationsKind);
  const dateDestinations = destinationCatalog.destinations.filter((item) => item.cityId === cityId);
  const dates = parseCatalog(sources, dateCatalogSchema, "romance/date_catalog.json").dates;
  const dateBackgrounds = dates.filter((item) => item.chapterId === cityId).map((item) => item.backgroundId);
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
  const journeyLedger = journeyTransitDecisionFile(root, cityId);
  if (journeyLedger) {
    const ledger = read(root, journeyLedger);
    if (!Array.isArray(ledger.decisions)) throw new Error("Invalid transit decision ledger");
    transitDecisions = ledger.decisions.filter((item: { cityId?: string }) => item.cityId === cityId);
  } else if (cityTransitPath(sources, cityId)) {
    // A journey with transport modes: the city's ledger decisions (none yet without a ledger).
    transitDecisions = files.transit === undefined ? [] : exportTransitDecisions(transitLedgerSchema.parse(files.transit));
  }
  if (inputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during export; retry");
  return completeBundleSchema.parse({ schemaVersion: 1, cityId, baseFingerprint: fingerprint, city, travel, travelSettings, backgrounds, assets, dateDestinations, landmarks, clues, transitDecisions });
}

/** Produce an intentionally incomplete, unpublished template; authors must fill its blanks. */
export function newCityBundle(root: string, cityId: string): unknown {
  idSchema.parse(cityId);
  owner(root, cityId);
  const sources = loadContentSources(root);
  if (existing(sources, cityId)) throw new Error(`City already exists: ${cityId}`);
  if (journeyTransitDecisionFile(root, cityId)) throw new Error(`Registered city files must be restored before editing: ${cityId} (its transit decisions are kept in its journey's ledger)`);
  const hotel = `${cityId}_hotel`;
  const background = `${cityId}_hotel_bg`;
  return { schemaVersion: 1, cityId, baseFingerprint: inputFingerprint(root),
    city: { schemaVersion: 1, id: cityId, countryCode: "", nameJa: "", themeJa: "", firstClearReward: { rewardSourceId: "", ap: null }, landmarkIdsPlanned: [], productionStatus: "prototype" },
    travel: { cityId, places: [{ id: hotel, cityId, nameJa: "", nameEn: "", latitude: null, longitude: null, backgroundId: background, sources: [] }], routes: [], events: [] },
    travelSettings: { initialBudget: null, hotelPlaceId: hotel, lodgingCost: null, retryMinutes: 15, notes: "要入力：ゲーム用の前提と出典を記入してください。" },
    backgrounds: { [background]: { nameJa: "", captionJa: "", color: "#817569", fallback: "neutral" } },
    // A journey with transport modes needs the new city's transit decisions (to be filled in).
    assets: [], dateDestinations: [], landmarks: [], clues: [], transitDecisions: cityTransitPath(sources, cityId) ? [] : null };
}

/** Validate in an isolated copy before optionally committing an editable snapshot. */
export async function applyCityBundle(root: string, raw: unknown, apply = false): Promise<{ changedFiles: string[] }> {
  let input: z.infer<typeof bundleSchema>;
  if (raw && typeof raw === "object" && "schemaVersion" in raw && raw.schemaVersion === 2) {
    const compact = editableBundleSchema.parse(raw);
    const sources = loadContentSources(root);
    const previous = existing(sources, compact.cityId)
      ? travelCatalogSchema.parse(requireCity(sources, compact.cityId).travel).routes : [];
    input = bundleSchema.parse({ ...compact, schemaVersion: 1, travel: expandTravel(compact.travel, previous) });
  } else input = bundleSchema.parse(raw);
  const { cityId } = input;
  owner(root, cityId);
  const fingerprint = inputFingerprint(root);
  if (input.baseFingerprint !== fingerprint) throw new Error("City bundle is stale: content or assets changed since export");
  const sources = loadContentSources(root);
  const isExisting = existing(sources, cityId);
  const baseline = isExisting ? exportCityBundle(root, cityId) : null;
  const bundle = completeBundleSchema.parse({ ...input,
    landmarks: input.landmarks ?? baseline?.landmarks ?? [], clues: input.clues ?? baseline?.clues ?? [] });
  if (bundle.city.id !== cityId || bundle.travel.cityId !== cityId || bundle.travel.places.some((place) => place.cityId !== cityId) || bundle.travel.events.some((event) => event.cityId !== cityId) || bundle.dateDestinations.some((item) => item.cityId !== cityId) || bundle.landmarks.some((item) => item.cityId !== cityId))
    throw new Error(`City ownership mismatch: ${cityId}`);
  if (bundle.city.productionStatus !== (baseline?.city.productionStatus ?? "prototype")) throw new Error("City release status cannot be changed with a bundle");
  const ownDecisionFile = cityTransitPath(sources, cityId);
  const journeyLedger = journeyTransitDecisionFile(root, cityId);
  if (!!(journeyLedger || ownDecisionFile) !== (bundle.transitDecisions !== null)) throw new Error("Transit decision ledger does not match city");
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
  const values = mergeCityCatalogs(sources, bundle, baseline);
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
      // The old journey-wide ledger is not content; the per-city ledger is, and content:build checks it below.
      if (file === journeyLedger) continue;
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, value);
    }
    if (bundle.transitDecisions && ownDecisionFile && next[ownDecisionFile] !== undefined) {
      // content:build accepts inconclusive decisions; an applied city has none.
      if (!inspectCityTransit(bundle.travel, JSON.parse(next[ownDecisionFile]), cityTransitPlan(sources, cityId).modes, ownDecisionFile).ready)
        throw new Error(`Transit has undecided directions: ${cityId}`);
    } else if (bundle.transitDecisions && journeyLedger) {
      const transit = readJourneyTransitDecisions(root, owner(root, cityId).id);
      const check = buildJourneyTransitDecisionReview({ catalogs: { ...transit.catalogs, [cityId]: bundle.travel }, decisions: JSON.parse(next[journeyLedger]) });
      const counts = check.counts[cityId];
      if (counts.unresearched || counts.inconclusive) throw new Error(`Transit has undecided directions: ${cityId}`);
    }
    await buildContent(stage, false);
    if (inputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during validation; bundle was not applied");
    if (apply && changedFiles.length) writeCityBundleFiles(root, original, Object.fromEntries(changedFiles.map((file) => [file, next[file]])), fingerprint);
    return { changedFiles };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}
