import { createHash } from "node:crypto";
import { closeSync, cpSync, existsSync, linkSync, lstatSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { citySchema, dateCatalogSchema, presentationSchema } from "../src/content/schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { landmarkSchema, tourismAssetSchema, tourismCatalogSchema, tourismClueSchema } from "../src/content/tourism-schemas";
import { dateDestinationSchema, dateDestinationsSchema } from "../src/content/date-destinations";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { buildContent } from "./content-pipeline";
import { indiaInputFingerprint } from "./promote-india";
import { buildIndiaTransitReview, indiaTransitCities, readIndiaTransitReview } from "./india-transit-review";

const idSchema = z.string().regex(/^[a-z][a-z0-9_]*$/).refine((value) => !["constructor", "prototype", "__proto__"].includes(value), "Reserved city ID");
const backgroundSchema = presentationSchema.shape.backgrounds;
const decisionFile = "authoring/research/golden-triangle-transit-20261103/decisions.json";
const observationsFile = "authoring/drafts/golden-triangle/observation-cards.json";
const catalogFiles = ["content/romance/presentation.json", "content/tourism/catalog.json", "content/romance/date_destinations.json"] as const;
const output = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const read = (root: string, file: string): any => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const cityFiles = (id: string) => [`content/cities/${id}.json`, `content/travel/${id}.json`, `content/travel/${id}-settings.json`];
const indiaCity = (id: string) => (indiaTransitCities as readonly string[]).includes(id);
const keys = <T>(items: readonly T[], get: (v: T) => string, label: string) => {
  const ids = items.map(get);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} ID`);
};

const bundleSchema = z.object({
  schemaVersion: z.literal(1), cityId: idSchema,
  baseFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  city: citySchema, travel: travelCatalogSchema, travelSettings: travelSettingsSchema,
  backgrounds: backgroundSchema, assets: z.array(tourismAssetSchema), dateDestinations: z.array(dateDestinationSchema),
  // Earlier version-1 working copies have no tourism section. Preserve their
  // catalog values on import rather than silently deleting existing content.
  landmarks: z.array(landmarkSchema).optional(), clues: z.array(tourismClueSchema).optional(),
  // null means this city has no compatible auxiliary transit decision ledger.
  transitDecisions: z.array(z.unknown()).nullable(),
}).strict();
const completeBundleSchema = bundleSchema.extend({ landmarks: z.array(landmarkSchema), clues: z.array(tourismClueSchema) });
export type CityBundle = z.infer<typeof completeBundleSchema>;

/** Fingerprint the actual validation inputs, including India transit decisions if present. */
function inputFingerprint(root: string, ignored: ReadonlySet<string> = new Set()): string {
  const h = createHash("sha256").update(indiaInputFingerprint(root, ignored));
  const file = path.join(root, decisionFile);
  if (existsSync(file)) {
    if (lstatSync(file).isSymbolicLink()) throw new Error("Transit decisions must not be a symlink");
    h.update("transit\0").update(readFileSync(file));
  } else h.update("missing-transit\0");
  return h.digest("hex");
}
function owner(root: string, id: string) {
  const catalog = journeyCatalogSchema.parse(read(root, "content/journeys/catalog.json"));
  const journeys = catalog.journeys.filter((journey) => journey.cities.some((city) => city.id === id));
  if (journeys.length !== 1) throw new Error(`Register city ${id} in exactly one journey before creating its bundle`);
  return journeys[0];
}
function existing(root: string, id: string): boolean {
  const present = cityFiles(id).map((file) => existsSync(path.join(root, file)));
  if (present.some(Boolean) && !present.every(Boolean)) throw new Error(`Incomplete city file set: ${id}`);
  return present.every(Boolean);
}
function referencedBackgrounds(travel: z.infer<typeof travelCatalogSchema>, destinations: z.infer<typeof dateDestinationSchema>[], dateBackgrounds: string[]) {
  return new Set([...travel.places.map((place) => place.backgroundAssetId), ...destinations.map((destination) => destination.backgroundAssetId), ...dateBackgrounds]);
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

/** Ensure India observation regions stay tied to their reviewed image bytes. */
function checkObservationImages(root: string, bundle: CityBundle, baseline: CityBundle | null) {
  const file = path.join(root, observationsFile);
  if (!existsSync(file)) return;
  const observations = read(root, observationsFile);
  for (const previous of baseline?.travel.places ?? []) {
    if (observations.images?.[previous.id] && !bundle.travel.places.some((place) => place.id === previous.id))
      throw new Error(`Observation place removed: ${previous.id}; review observations first`);
  }
  for (const place of bundle.travel.places) {
    const expected = observations.images?.[place.id];
    if (!expected) continue;
    const bg = bundle.backgrounds[place.backgroundAssetId];
    const asset = bundle.assets.find((entry) => entry.id === bg?.imageAssetId);
    if (!asset || asset.path !== expected.path) throw new Error(`Observation image changed for ${place.id}; review observations first`);
    const absolute = path.join(root, "public", asset.path);
    if (!existsSync(absolute) || createHash("sha256").update(readFileSync(absolute)).digest("hex") !== expected.sha256)
      throw new Error(`Observation image hash changed for ${place.id}; review observations first`);
  }
}

/** Transaction: stage all results, verify the snapshot again, and roll back on rename failure. */
export function writeCityBundleFiles(root: string, original: Record<string, string | null>, next: Record<string, string>, fingerprint: string,
  move: typeof renameSync = renameSync, createLink: typeof linkSync = linkSync) {
  const files = Object.keys(next);
  const allowed = /^content\/(?:cities\/[a-z][a-z0-9_]*\.json|travel\/[a-z][a-z0-9_]*(?:-settings)?\.json|romance\/(?:presentation|date_destinations)\.json|tourism\/catalog\.json)$/;
  if (files.some((file) => (!allowed.test(file) && file !== decisionFile) || !Object.hasOwn(original, file) || typeof next[file] !== "string"))
    throw new Error("Invalid city bundle file set");
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const staged: string[] = [], changed: string[] = [];
  const ignored = new Set<string>();
  // Only one city-bundle apply may write at a time. Other editing tools must
  // still be protected by the content fingerprint and by file comparisons.
  const lockPath = path.join(root, ".city-bundle.lock");
  let lock: number;
  try { lock = openSync(lockPath, "wx", 0o600); }
  catch (error) { throw new Error("Another city bundle apply is in progress (or its lock needs recovery)", { cause: error }); }
  try {
    if (inputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during validation");
    for (const file of files) {
      const target = path.join(root, file), before = original[file];
      if ((existsSync(target) ? readFileSync(target, "utf8") : null) !== before) throw new Error(`File changed during validation: ${file}`);
      const tmp = `${target}.city-bundle-${token}`;
      writeFileSync(tmp, next[file], { flag: "wx", mode: before === null ? 0o644 : statSync(target).mode });
      staged.push(tmp); ignored.add(path.relative(root, tmp));
    }
    for (const file of files) {
      const target = path.join(root, file);
      if ((existsSync(target) ? readFileSync(target, "utf8") : null) !== original[file]) throw new Error(`File changed during validation: ${file}`);
    }
    if (inputFingerprint(root, ignored) !== fingerprint) throw new Error("Content or assets changed during validation");
    for (const file of files) {
      const target = path.join(root, file), tmp = `${target}.city-bundle-${token}`;
      if (original[file] === null) {
        // link() is create-only: a competing creator cannot be overwritten.
        createLink(tmp, target);
        changed.push(file);
        rmSync(tmp);
      } else {
        move(tmp, target);
        changed.push(file);
      }
    }
  } catch (error) {
    const failures: string[] = [];
    for (const file of changed.reverse()) {
      const target = path.join(root, file), before = original[file];
      try {
        // An unrelated editor may have changed our output after the rename.
        // Never overwrite or remove their later changes during rollback.
        if (!existsSync(target) || readFileSync(target, "utf8") !== next[file]) {
          failures.push(file);
          continue;
        }
        if (before === null) rmSync(target);
        else {
          const tmp = `${target}.city-rollback-${token}`;
          writeFileSync(tmp, before, { flag: "wx", mode: statSync(target).mode });
          renameSync(tmp, target);
        }
      } catch { failures.push(file); }
    }
    if (failures.length) throw new Error(`City bundle rollback failed: ${failures.join(", ")}`, { cause: error });
    throw error;
  } finally {
    for (const tmp of staged) if (existsSync(tmp)) rmSync(tmp, { force: true });
    closeSync(lock);
    rmSync(lockPath, { force: true });
  }
}

/** Validate in an isolated copy before optionally committing an editable snapshot. */
export async function applyCityBundle(root: string, raw: unknown, apply = false): Promise<{ changedFiles: string[] }> {
  const input = bundleSchema.parse(raw);
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
  keys(bundle.assets, (entry) => entry.id, "asset");
  keys(bundle.dateDestinations, (entry) => entry.id, "destination");
  keys(bundle.landmarks, (entry) => entry.id, "landmark");
  keys(bundle.clues, (entry) => entry.id, "clue");
  const landmarkIds = new Set(bundle.landmarks.map((landmark) => landmark.id));
  if (bundle.clues.some((clue) => !landmarkIds.has(clue.landmarkId))) throw new Error(`Clue belongs to another city: ${cityId}`);
  if (bundle.transitDecisions?.some((item: any) => item?.cityId !== cityId)) throw new Error("Transit decision belongs to another city");
  const dates = dateCatalogSchema.parse(read(root, "content/romance/date_catalog.json")).dates;
  const dateBackgrounds = dates.filter((item) => item.chapterId === cityId).map((item) => item.backgroundAssetId);
  const refs = referencedBackgrounds(bundle.travel, bundle.dateDestinations, dateBackgrounds);
  if (Object.keys(bundle.backgrounds).some((id) => !refs.has(id)) || [...refs].some((id) => !bundle.backgrounds[id])) throw new Error("Bundle backgrounds must exactly match city references");
  const presentation = presentationSchema.parse(read(root, catalogFiles[0]));
  const tourism = tourismCatalogSchema.parse(read(root, catalogFiles[1]));
  const otherLandmarks = tourism.landmarks.filter((landmark) => landmark.cityId !== cityId);
  const oldLandmarkIds = new Set((baseline?.landmarks ?? []).map((landmark) => landmark.id));
  const otherClues = tourism.clues.filter((clue) => !oldLandmarkIds.has(clue.landmarkId));
  keys([...otherLandmarks, ...bundle.landmarks], (entry) => entry.id, "landmark");
  keys([...otherClues, ...bundle.clues], (entry) => entry.id, "clue");
  // Existing hotspot positions were reviewed on their current photograph.
  // A photo change needs the separate observation-review workflow.
  for (const previous of baseline?.landmarks ?? []) {
    if (!baseline!.clues.some((clue) => clue.landmarkId === previous.id && clue.kind === "hotspot")) continue;
    const updated = bundle.landmarks.find((landmark) => landmark.id === previous.id);
    if (!updated) continue;
    const oldAsset = baseline!.assets.find((asset) => asset.id === previous.imageAssetId);
    const newAsset = bundle.assets.find((asset) => asset.id === updated.imageAssetId);
    if (updated.imageAssetId !== previous.imageAssetId || oldAsset?.path !== newAsset?.path)
      throw new Error(`Observation image changed for ${previous.id}; review observations first`);
  }
  const assetRefs = new Set(Object.values(bundle.backgrounds).map((bg) => bg.imageAssetId).filter((id): id is string => !!id));
  for (const landmark of bundle.landmarks) assetRefs.add(landmark.imageAssetId);
  if (bundle.assets.some((asset) => !assetRefs.has(asset.id)) || bundle.assets.length !== assetRefs.size) throw new Error("Bundle assets must exactly match city image references");
  const destinationCatalog = dateDestinationsSchema.parse(read(root, catalogFiles[2]));
  const oldBackgrounds = new Set(Object.keys(baseline?.backgrounds ?? {}));
  const oldAssets = new Set((baseline?.assets ?? []).map((asset) => asset.id));
  const otherDestinations = destinationCatalog.destinations.filter((item) => item.cityId !== cityId);
  keys([...otherDestinations, ...bundle.dateDestinations], (entry) => entry.id, "destination");
  // References from other cities make a background shared and immutable.
  const otherBackgrounds = new Set(otherDestinations.map((item) => item.backgroundAssetId));
  for (const date of dates) {
    if (date.chapterId !== cityId) otherBackgrounds.add(date.backgroundAssetId);
  }
  for (const planned of journeyCatalogSchema.parse(read(root, "content/journeys/catalog.json")).journeys.flatMap((journey) => journey.cities)) {
    if (planned.id === cityId || !existing(root, planned.id)) continue;
    for (const place of travelCatalogSchema.parse(read(root, cityFiles(planned.id)[1])).places) otherBackgrounds.add(place.backgroundAssetId);
  }
  for (const [id, value] of Object.entries(bundle.backgrounds)) {
    const previous = presentation.backgrounds[id];
    if (previous && (!oldBackgrounds.has(id) || otherBackgrounds.has(id)) && !isDeepStrictEqual(previous, value)) throw new Error(`Cannot change another city's or shared background: ${id}`);
  }
  for (const id of oldBackgrounds) {
    if (!bundle.backgrounds[id] && !otherBackgrounds.has(id)) delete presentation.backgrounds[id];
  }
  Object.assign(presentation.backgrounds, bundle.backgrounds);
  const otherAssetIds = new Set(Object.entries(presentation.backgrounds).filter(([id]) => !refs.has(id) || otherBackgrounds.has(id)).map(([, bg]) => bg.imageAssetId).filter((id): id is string => !!id));
  for (const landmark of tourism.landmarks) if (landmark.cityId !== cityId) otherAssetIds.add(landmark.imageAssetId);
  for (const asset of bundle.assets) {
    const previous = tourism.assets.find((item) => item.id === asset.id);
    if (previous && (!oldAssets.has(asset.id) || otherAssetIds.has(asset.id)) && !isDeepStrictEqual(previous, asset)) throw new Error(`Cannot change another city's or shared image: ${asset.id}`);
  }
  const pendingAssets = new Map(bundle.assets.map((item) => [item.id, item]));
  const mergedAssets: typeof tourism.assets = [];
  for (const asset of tourism.assets) {
    const replacement = pendingAssets.get(asset.id);
    if (replacement) {
      mergedAssets.push(replacement);
      pendingAssets.delete(asset.id);
    } else if (!oldAssets.has(asset.id) || otherAssetIds.has(asset.id)) mergedAssets.push(asset);
  }
  tourism.assets = [...mergedAssets, ...pendingAssets.values()];
  keys(tourism.assets, (entry) => entry.id, "asset");
  const pendingLandmarks = new Map(bundle.landmarks.map((landmark) => [landmark.id, landmark]));
  tourism.landmarks = tourism.landmarks.flatMap((landmark) => {
    if (landmark.cityId !== cityId) return [landmark];
    const replacement = pendingLandmarks.get(landmark.id);
    pendingLandmarks.delete(landmark.id);
    return replacement ? [replacement] : [];
  });
  tourism.landmarks.push(...pendingLandmarks.values());
  const pendingClues = new Map(bundle.clues.map((clue) => [clue.id, clue]));
  tourism.clues = tourism.clues.flatMap((clue) => {
    if (!oldLandmarkIds.has(clue.landmarkId)) return [clue];
    const replacement = pendingClues.get(clue.id);
    pendingClues.delete(clue.id);
    return replacement ? [replacement] : [];
  });
  tourism.clues.push(...pendingClues.values());
  const pendingDestinations = new Map(bundle.dateDestinations.map((item) => [item.id, item]));
  destinationCatalog.destinations = destinationCatalog.destinations.flatMap((item) => {
    if (item.cityId !== cityId) return [item];
    const replacement = pendingDestinations.get(item.id);
    pendingDestinations.delete(item.id);
    return replacement ? [replacement] : [];
  });
  destinationCatalog.destinations.push(...pendingDestinations.values());
  checkObservationImages(root, bundle, baseline);
  const [cityPath, travelPath, settingsPath] = cityFiles(cityId);
  const values: Record<string, unknown> = { [cityPath]: bundle.city, [travelPath]: bundle.travel, [settingsPath]: bundle.travelSettings,
    [catalogFiles[0]]: presentation, [catalogFiles[1]]: tourism, [catalogFiles[2]]: destinationCatalog };
  if (bundle.transitDecisions) {
    const ledger = read(root, decisionFile);
    if (!isDeepStrictEqual(baseline?.transitDecisions, bundle.transitDecisions)) {
      // Keep every other city's records in their original order.
      let inserted = false;
      ledger.decisions = ledger.decisions.flatMap((entry: { cityId: string }) => {
        if (entry.cityId !== cityId) return [entry];
        if (inserted) return [];
        inserted = true;
        return bundle.transitDecisions!;
      });
      if (!inserted) ledger.decisions.push(...bundle.transitDecisions);
    }
    values[decisionFile] = ledger;
  }
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
