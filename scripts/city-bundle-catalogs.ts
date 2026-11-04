import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { dateCatalogSchema, presentationSchema } from "../src/content/schemas";
import { travelCatalogSchema } from "../src/content/travel-schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { dateDestinationSchema, dateDestinationsSchema } from "../src/content/date-destinations";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import type { CityBundle } from "./city-bundle-schema";
import { catalogFiles, cityFiles, decisionFile, existing, read } from "./city-bundle-files";
import { journeyAuthoringProfiles } from "./journey-authoring";
import { cityTransitFile, readTransitLedger, replaceTransitDecisions } from "./journey-transit-review";

export const assertUniqueIds = <T>(items: readonly T[], get: (v: T) => string, label: string) => {
  const ids = items.map(get);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} ID`);
};

export function referencedBackgrounds(travel: z.infer<typeof travelCatalogSchema>, destinations: z.infer<typeof dateDestinationSchema>[], dateBackgrounds: string[]) {
  return new Set([...travel.places.map((place) => place.backgroundAssetId), ...destinations.map((destination) => destination.backgroundAssetId), ...dateBackgrounds]);
}

/** Replace this city's entries in place, remove omitted ones, then append new IDs. */
function replaceOwnedEntries<T extends { id: string }>(current: readonly T[], replacements: readonly T[], belongsToCity: (item: T) => boolean): T[] {
  const pending = new Map(replacements.map((item) => [item.id, item]));
  const merged = current.flatMap((item) => {
    if (!belongsToCity(item)) return [item];
    const replacement = pending.get(item.id);
    pending.delete(item.id);
    return replacement ? [replacement] : [];
  });
  return [...merged, ...pending.values()];
}

/** Ensure observation regions stay tied to their reviewed image bytes. */
function checkObservationImages(root: string, bundle: CityBundle, baseline: CityBundle | null) {
  for (const { observationFile: observationsFile } of Object.values(journeyAuthoringProfiles)) {
    const file = path.join(root, observationsFile);
    if (!existsSync(file)) continue;
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
}

/** Protect other cities and reviewed images while replacing this city's catalog entries. */
export function mergeCityCatalogs(root: string, bundle: CityBundle, baseline: CityBundle | null): Record<string, unknown> {
  const { cityId } = bundle;
  const dates = dateCatalogSchema.parse(read(root, "content/romance/date_catalog.json")).dates;
  const dateBackgrounds = dates.filter((item) => item.chapterId === cityId).map((item) => item.backgroundAssetId);
  const refs = referencedBackgrounds(bundle.travel, bundle.dateDestinations, dateBackgrounds);
  if (Object.keys(bundle.backgrounds).some((id) => !refs.has(id)) || [...refs].some((id) => !bundle.backgrounds[id])) throw new Error("Bundle backgrounds must exactly match city references");
  const presentation = presentationSchema.parse(read(root, catalogFiles[0]));
  const tourism = tourismCatalogSchema.parse(read(root, catalogFiles[1]));
  const otherLandmarks = tourism.landmarks.filter((landmark) => landmark.cityId !== cityId);
  const oldLandmarkIds = new Set((baseline?.landmarks ?? []).map((landmark) => landmark.id));
  const otherClues = tourism.clues.filter((clue) => !oldLandmarkIds.has(clue.landmarkId));
  assertUniqueIds([...otherLandmarks, ...bundle.landmarks], (entry) => entry.id, "landmark");
  assertUniqueIds([...otherClues, ...bundle.clues], (entry) => entry.id, "clue");
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
  assertUniqueIds([...otherDestinations, ...bundle.dateDestinations], (entry) => entry.id, "destination");
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
  assertUniqueIds(tourism.assets, (entry) => entry.id, "asset");
  tourism.landmarks = replaceOwnedEntries(tourism.landmarks, bundle.landmarks, (item) => item.cityId === cityId);
  tourism.clues = replaceOwnedEntries(tourism.clues, bundle.clues, (item) => oldLandmarkIds.has(item.landmarkId));
  destinationCatalog.destinations = replaceOwnedEntries(destinationCatalog.destinations, bundle.dateDestinations, (item) => item.cityId === cityId);
  checkObservationImages(root, bundle, baseline);
  const [cityPath, travelPath, settingsPath] = cityFiles(cityId);
  const values: Record<string, unknown> = { [cityPath]: bundle.city, [travelPath]: bundle.travel, [settingsPath]: bundle.travelSettings,
    [catalogFiles[0]]: presentation, [catalogFiles[1]]: tourism, [catalogFiles[2]]: destinationCatalog };
  if (bundle.transitDecisions) {
    const ownFile = cityTransitFile(root, cityId);
    if (ownFile) {
      values[ownFile] = replaceTransitDecisions(readTransitLedger(root, ownFile), bundle.transitDecisions);
      return values;
    }
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
  return values;
}
