import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { dateCatalogSchema, presentationSchema } from "../src/content/schemas";
import { travelCatalogSchema } from "../src/content/travel-schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { dateDestinationSchema, dateDestinationsSchema } from "../src/content/date-destinations";
import { cityLayer, journeyCatalogOf, parseCatalog, requireCity, type ContentSources } from "./content-sources";
import { completeFragment, emptyCatalog, trimFragment, type MergedKind } from "./content-layout";
import type { CityBundle } from "./city-bundle-schema";
import { bundleCatalogKinds, cityFiles, existing, layerPath, read } from "./city-bundle-files";
import { journeyAuthoringProfiles } from "./journey-authoring";
import { cityTransitFile, readTransitLedger, replaceTransitDecisions } from "./journey-transit-review";
import { journeyTransitDecisionFile } from "./journey-transit-decisions";
import { findPublicFile } from "./public-assets";

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
function checkObservationImages(root: string, bundle: CityBundle, baseline: CityBundle | null, publicRoots: readonly string[]) {
  for (const { observationFile: observationsFile } of journeyAuthoringProfiles(root).values()) {
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
      const absolute = findPublicFile(root, asset.path, publicRoots);
      if (!absolute || createHash("sha256").update(readFileSync(absolute)).digest("hex") !== expected.sha256)
        throw new Error(`Observation image hash changed for ${place.id}; review observations first`);
    }
  }
}

/**
 * The owner layer's own copy of a bundle catalog, with every mergeable key:
 * an empty fragment when the layer has none yet, else the file completed with
 * the keys it leaves out (`added`, trimmed again when they stay empty).
 */
type Fragment = { kind: MergedKind; file: string; absolute: string; exists: boolean; data: any; added: ReadonlyMap<string, unknown> };
function ownFragment(sources: ContentSources, layer: string, kind: MergedKind): Fragment {
  const file = `${layer}/${kind}`;
  const absolute = path.join(sources.root, file);
  // The loaded copy (the loader read every catalog file of every layer).
  const bytes = sources.tree.files.get(file);
  const exists = !!bytes;
  const schemaVersion = (sources.catalogs[kind]?.value as { schemaVersion?: unknown })?.schemaVersion;
  if (!bytes) return { kind, file, absolute, exists, data: emptyCatalog(kind, schemaVersion), added: new Map() };
  const data = JSON.parse(bytes.toString("utf8"));
  return { kind, file, absolute, exists, data, added: completeFragment(kind, data, schemaVersion) };
}

/**
 * Replace this city's catalog entries in the layer that owns the city, while
 * protecting other cities, other layers and reviewed images. Collisions are
 * checked against the merged catalogs of all layers.
 */
export function mergeCityCatalogs(sources: ContentSources, bundle: CityBundle, baseline: CityBundle | null): Record<string, unknown> {
  const { root } = sources;
  const { cityId } = bundle;
  const layer = layerPath(root, cityLayer(sources, cityId));
  const [presentationKind, tourismKind, destinationsKind] = bundleCatalogKinds;
  const own = { presentation: ownFragment(sources, layer, presentationKind), tourism: ownFragment(sources, layer, tourismKind),
    destinations: ownFragment(sources, layer, destinationsKind) };
  const dates = parseCatalog(sources, dateCatalogSchema, "romance/date_catalog.json").dates;
  const dateBackgrounds = dates.filter((item) => item.chapterId === cityId).map((item) => item.backgroundAssetId);
  const refs = referencedBackgrounds(bundle.travel, bundle.dateDestinations, dateBackgrounds);
  if (Object.keys(bundle.backgrounds).some((id) => !refs.has(id)) || [...refs].some((id) => !bundle.backgrounds[id])) throw new Error("Bundle backgrounds must exactly match city references");
  // Merged view of every layer: used for checks only; writes go to `own`.
  const presentation = parseCatalog(sources, presentationSchema, presentationKind);
  const tourism = parseCatalog(sources, tourismCatalogSchema, tourismKind);
  const tourismItems = sources.catalogs[tourismKind]?.provenance.items ?? {};
  const fromOtherLayer = (fragment: Fragment, file: string | undefined) => file !== undefined && file !== fragment.absolute;
  // A city's entries are replaced in its own layer only.
  const outside = [
    ...tourism.landmarks.filter((item, index) => item.cityId === cityId && fromOtherLayer(own.tourism, tourismItems.landmarks?.[index])).map((item) => item.id),
    ...tourism.clues.filter((item, index) => (baseline?.landmarks ?? []).some((landmark) => landmark.id === item.landmarkId) &&
      fromOtherLayer(own.tourism, tourismItems.clues?.[index])).map((item) => item.id),
  ];
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
  const destinationCatalog = parseCatalog(sources, dateDestinationsSchema, destinationsKind);
  const destinationItems = sources.catalogs[destinationsKind]?.provenance.items.destinations ?? [];
  outside.push(...destinationCatalog.destinations.filter((item, index) => item.cityId === cityId && fromOtherLayer(own.destinations, destinationItems[index]))
    .map((item) => item.id));
  if (outside.length) throw new Error(`City entries outside the city's content layer (${layer}): ${outside.join(", ")}`);
  const oldBackgrounds = new Set(Object.keys(baseline?.backgrounds ?? {}));
  const oldAssets = new Set((baseline?.assets ?? []).map((asset) => asset.id));
  const otherDestinations = destinationCatalog.destinations.filter((item) => item.cityId !== cityId);
  assertUniqueIds([...otherDestinations, ...bundle.dateDestinations], (entry) => entry.id, "destination");
  // References from other cities make a background shared and immutable;
  // so does a definition in another layer, which this bundle cannot write.
  const otherBackgrounds = new Set(otherDestinations.map((item) => item.backgroundAssetId));
  for (const date of dates) {
    if (date.chapterId !== cityId) otherBackgrounds.add(date.backgroundAssetId);
  }
  for (const planned of journeyCatalogOf(sources).journeys.flatMap((journey) => journey.cities)) {
    if (planned.id === cityId || !existing(sources, planned.id)) continue;
    for (const place of travelCatalogSchema.parse(requireCity(sources, planned.id).travel).places)
      otherBackgrounds.add(place.backgroundAssetId);
  }
  const backgroundFiles = sources.catalogs[presentationKind]?.provenance.keys.backgrounds ?? {};
  const foreignBackgrounds = new Set(Object.keys(presentation.backgrounds).filter((id) => fromOtherLayer(own.presentation, backgroundFiles[id])));
  for (const id of foreignBackgrounds) otherBackgrounds.add(id);
  for (const [id, value] of Object.entries(bundle.backgrounds)) {
    const previous = presentation.backgrounds[id];
    if (previous && (!oldBackgrounds.has(id) || otherBackgrounds.has(id)) && !isDeepStrictEqual(previous, value)) throw new Error(`Cannot change another city's or shared background: ${id}`);
  }
  for (const id of oldBackgrounds) {
    if (!bundle.backgrounds[id] && !otherBackgrounds.has(id)) {
      delete presentation.backgrounds[id];
      delete own.presentation.data.backgrounds[id];
    }
  }
  Object.assign(presentation.backgrounds, bundle.backgrounds);
  for (const [id, value] of Object.entries(bundle.backgrounds)) if (!foreignBackgrounds.has(id)) own.presentation.data.backgrounds[id] = value;
  const otherAssetIds = new Set(Object.entries(presentation.backgrounds).filter(([id]) => !refs.has(id) || otherBackgrounds.has(id)).map(([, bg]) => bg.imageAssetId).filter((id): id is string => !!id));
  for (const landmark of tourism.landmarks) if (landmark.cityId !== cityId) otherAssetIds.add(landmark.imageAssetId);
  const foreignAssets = tourism.assets.filter((_, index) => fromOtherLayer(own.tourism, tourismItems.assets?.[index]));
  for (const asset of foreignAssets) otherAssetIds.add(asset.id);
  for (const asset of bundle.assets) {
    const previous = tourism.assets.find((item) => item.id === asset.id);
    if (previous && (!oldAssets.has(asset.id) || otherAssetIds.has(asset.id)) && !isDeepStrictEqual(previous, asset)) throw new Error(`Cannot change another city's or shared image: ${asset.id}`);
  }
  const pendingAssets = new Map(bundle.assets.filter((item) => !foreignAssets.some((asset) => asset.id === item.id)).map((item) => [item.id, item]));
  const mergedAssets: typeof tourism.assets = [];
  for (const asset of own.tourism.data.assets as typeof tourism.assets) {
    const replacement = pendingAssets.get(asset.id);
    if (replacement) {
      mergedAssets.push(replacement);
      pendingAssets.delete(asset.id);
    } else if (!oldAssets.has(asset.id) || otherAssetIds.has(asset.id)) mergedAssets.push(asset);
  }
  own.tourism.data.assets = [...mergedAssets, ...pendingAssets.values()];
  assertUniqueIds([...foreignAssets, ...own.tourism.data.assets], (entry) => entry.id, "asset");
  own.tourism.data.landmarks = replaceOwnedEntries(own.tourism.data.landmarks, bundle.landmarks, (item) => item.cityId === cityId);
  own.tourism.data.clues = replaceOwnedEntries(own.tourism.data.clues, bundle.clues, (item) => oldLandmarkIds.has(item.landmarkId));
  own.destinations.data.destinations = replaceOwnedEntries(own.destinations.data.destinations, bundle.dateDestinations, (item) => item.cityId === cityId);
  checkObservationImages(root, bundle, baseline, sources.publicRoots);
  const [cityPath, travelPath, settingsPath] = cityFiles(layer, cityId);
  const values: Record<string, unknown> = { [cityPath]: bundle.city, [travelPath]: bundle.travel, [settingsPath]: bundle.travelSettings };
  // A fragment (or a key of it) the layer does not have yet is created only when it gains entries.
  for (const fragment of [own.presentation, own.tourism, own.destinations])
    if (fragment.exists) values[fragment.file] = trimFragment(fragment.data, fragment.added);
    else if (!isDeepStrictEqual(fragment.data, emptyCatalog(fragment.kind, fragment.data.schemaVersion))) values[fragment.file] = fragment.data;
  if (bundle.transitDecisions) {
    const ownFile = cityTransitFile(root, cityId);
    if (ownFile) {
      values[ownFile] = replaceTransitDecisions(readTransitLedger(root, ownFile), bundle.transitDecisions);
      return values;
    }
    const decisionFile = journeyTransitDecisionFile(root, cityId);
    if (!decisionFile) throw new Error(`No transit decision ledger for city: ${cityId}`);
    const ledger = read(root, decisionFile);
    if (!isDeepStrictEqual(baseline?.transitDecisions, bundle.transitDecisions)) {
      // Replace each of this city's records where it stands (one direction and mode), drop removed
      // ones and append new ones, so an edit changes only its own lines; other cities' records stay.
      type Decision = { cityId: string; fromPlaceId: string; toPlaceId: string; mode: string };
      const key = (entry: Decision) => `${entry.cityId}:${entry.fromPlaceId}:${entry.toPlaceId}:${entry.mode}`;
      const pending = new Map<string, Decision>();
      for (const entry of bundle.transitDecisions as Decision[]) {
        if (pending.has(key(entry))) throw new Error(`Duplicate transit decision: ${key(entry)}`);
        pending.set(key(entry), entry);
      }
      ledger.decisions = ledger.decisions.flatMap((entry: Decision) => {
        if (entry.cityId !== cityId) return [entry];
        const replacement = pending.get(key(entry));
        pending.delete(key(entry));
        return replacement ? [replacement] : [];
      });
      ledger.decisions.push(...pending.values());
    }
    values[decisionFile] = ledger;
  }
  return values;
}
