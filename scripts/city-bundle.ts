import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { citySchema, dateCatalogSchema, presentationSchema } from "../src/content/schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { loadContentSources, parseCatalog, readJourneyCatalog, requireCity } from "./content-sources";
import { buildContent } from "./content-pipeline";
import { compactTravel, expandTravel } from "./city-bundle-routes";
import { idSchema, bundleSchema, editableBundleSchema, type CityBundle, type EditableCityBundle } from "./city-bundle-schema";
import { bundleCatalogKinds, existing, inputFingerprint, writeCityBundleFiles } from "./city-bundle-files";
import { assertUniqueIds, mergeCityCatalogs, referencedBackgrounds } from "./city-bundle-catalogs";
import { cityTransitPath, cityTransitPlan } from "./journey-transit";
import { exportTransitDecisions, inspectCityTransit, transitLedgerSchema } from "./transit-ledger";

export type { CityBundle, EditableCityBundle } from "./city-bundle-schema";
export { writeCityBundleFiles } from "./city-bundle-files";

const output = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Convert a v1 bundle or an incomplete new-city template without inventing data. */
export function compactCityBundle(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("作業コピーの形が違います（JSON のオブジェクトにします）。");
  const bundle = raw as Record<string, unknown>;
  if (bundle.schemaVersion !== 1) throw new Error("短い形にできるのは版1（schemaVersion: 1）の作業コピーだけです。");
  return { ...bundle, schemaVersion: 2, travel: compactTravel(bundle.travel) };
}

/** Export the concise authoring form; game content remains the directed v1 catalogs. */
export function exportEditableCityBundle(root: string, cityId: string): EditableCityBundle {
  return editableBundleSchema.parse(compactCityBundle(exportCityBundle(root, cityId)));
}

function owner(root: string, id: string) {
  const journeys = readJourneyCatalog(root).journeys.filter((journey) => journey.cities.some((city) => city.id === id));
  if (journeys.length !== 1) throw new Error(`都市 ${id} は、ちょうど1つの旅行編の manifest.json の cities に登録してから使います。`);
  return journeys[0];
}
/** Read an editable snapshot. The catalogs stay authoritative until explicit apply. */
export function exportCityBundle(root: string, cityId: string): CityBundle {
  idSchema.parse(cityId);
  const fingerprint = inputFingerprint(root);
  owner(root, cityId);
  const sources = loadContentSources(root);
  if (!existing(sources, cityId)) throw new Error(`都市 ${cityId} の都市データがまだありません（新しい都市は new で作ります）。`);
  const files = requireCity(sources, cityId);
  const city = citySchema.parse(files.data);
  const travel = travelCatalogSchema.parse(files.travel);
  const travelSettings = travelSettingsSchema.parse(files.settings);
  if (city.id !== cityId || travel.cityId !== cityId) throw new Error(`都市IDが合いません: 都市 ${cityId} の作業コピーに、ほかの都市の項目（cityId・id）があります。`);
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
    if (!presentation.backgrounds[id]) throw new Error(`背景が登録されていません: ${id}`);
    backgrounds[id] = presentation.backgrounds[id];
  }
  const assetIds = new Set(Object.values(backgrounds).map((item) => item.imageAssetId).filter((item): item is string => !!item));
  for (const landmark of landmarks) assetIds.add(landmark.imageAssetId);
  const assets = tourism.assets.filter((item) => assetIds.has(item.id));
  if (assets.length !== assetIds.size) throw new Error(`都市 ${cityId} が使う画像の登録（assets）が足りません。`);
  let transitDecisions: unknown[] | null = null;
  if (cityTransitPath(sources, cityId)) {
    // A journey with transport modes: the city's ledger decisions (none yet without a ledger).
    transitDecisions = files.transit === undefined ? [] : exportTransitDecisions(transitLedgerSchema.parse(files.transit));
  }
  if (inputFingerprint(root) !== fingerprint) throw new Error("書き出しの途中で content/ か public/ が変わりました。もう一度 export してください。");
  return bundleSchema.parse({ schemaVersion: 1, cityId, baseFingerprint: fingerprint, city, travel, travelSettings, backgrounds, assets, dateDestinations, landmarks, clues, transitDecisions });
}

/** Produce an intentionally incomplete, unpublished template; authors must fill its blanks. */
export function newCityBundle(root: string, cityId: string): unknown {
  idSchema.parse(cityId);
  owner(root, cityId);
  const sources = loadContentSources(root);
  if (existing(sources, cityId)) throw new Error(`都市 ${cityId} はもうあります（今の内容は export で書き出します）。`);
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
  let bundle: CityBundle;
  if (raw && typeof raw === "object" && "schemaVersion" in raw && raw.schemaVersion === 2) {
    const compact = editableBundleSchema.parse(raw);
    const sources = loadContentSources(root);
    const previous = existing(sources, compact.cityId)
      ? travelCatalogSchema.parse(requireCity(sources, compact.cityId).travel).routes : [];
    bundle = bundleSchema.parse({ ...compact, schemaVersion: 1, travel: expandTravel(compact.travel, previous) });
  } else bundle = bundleSchema.parse(raw);
  const { cityId } = bundle;
  owner(root, cityId);
  const fingerprint = inputFingerprint(root);
  if (bundle.baseFingerprint !== fingerprint) throw new Error("作業コピーが古くなっています: 書き出した後に content/ か public/ が変わりました。export し直して、編集を新しいコピーへ移してください。");
  const sources = loadContentSources(root);
  const isExisting = existing(sources, cityId);
  const baseline = isExisting ? exportCityBundle(root, cityId) : null;
  if (bundle.city.id !== cityId || bundle.travel.cityId !== cityId || bundle.travel.places.some((place) => place.cityId !== cityId) || bundle.travel.events.some((event) => event.cityId !== cityId) || bundle.dateDestinations.some((item) => item.cityId !== cityId) || bundle.landmarks.some((item) => item.cityId !== cityId))
    throw new Error(`都市IDが合いません: 都市 ${cityId} の作業コピーに、ほかの都市の項目（cityId・id）があります。`);
  if (bundle.city.productionStatus !== (baseline?.city.productionStatus ?? "prototype")) throw new Error("都市の公開状態（productionStatus）は city:bundle では変えられません（公開は journey:release で行います）。");
  const ownDecisionFile = cityTransitPath(sources, cityId);
  if (!!ownDecisionFile !== (bundle.transitDecisions !== null)) throw new Error("transitDecisions が旅行編に合いません（乗り物を宣言した旅行編では判断の配列、宣言しない旅行編では null にします）。");
  if (baseline) for (const event of bundle.travel.events) {
    const previous = baseline.travel.events.find((entry) => entry.id === event.id);
    if (previous && previous.contentStatus !== event.contentStatus) throw new Error(`出来事の公開状態（contentStatus）は city:bundle では変えられません: ${event.id}`);
    if (!previous && bundle.city.productionStatus === "prototype" && event.contentStatus !== "pending_content") throw new Error(`制作中の都市に足す出来事は contentStatus: "pending_content" にします: ${event.id}`);
  }
  if (!baseline && bundle.travel.events.some((event) => event.contentStatus !== "pending_content")) throw new Error("新しい都市の出来事は contentStatus: \"pending_content\" にします。");
  assertUniqueIds(bundle.assets, (entry) => entry.id, "画像");
  assertUniqueIds(bundle.dateDestinations, (entry) => entry.id, "デート先");
  assertUniqueIds(bundle.landmarks, (entry) => entry.id, "観光地");
  assertUniqueIds(bundle.clues, (entry) => entry.id, "観察ポイント");
  const landmarkIds = new Set(bundle.landmarks.map((landmark) => landmark.id));
  if (bundle.clues.some((clue) => !landmarkIds.has(clue.landmarkId))) throw new Error(`この都市（${cityId}）の観光地にない観察ポイントがあります（clues の landmarkId）。`);
  if (bundle.transitDecisions?.some((item: any) => item?.cityId !== cityId)) throw new Error(`交通の判断がほかの都市のものです。この都市（${cityId}）の判断だけを書きます。`);
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
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, value);
    }
    if (bundle.transitDecisions && ownDecisionFile && next[ownDecisionFile] !== undefined) {
      // content:build accepts inconclusive decisions; an applied city has none.
      if (!inspectCityTransit(bundle.travel, JSON.parse(next[ownDecisionFile]), cityTransitPlan(sources, cityId).modes, ownDecisionFile).ready)
        throw new Error(`「特定できず」（inconclusive）の交通の判断が残っています: ${cityId}。反映の前に決めてください。`);
    }
    await buildContent(stage, false);
    if (inputFingerprint(root) !== fingerprint) throw new Error("検証の途中で content/ か public/ が変わりました。反映していません。");
    if (apply && changedFiles.length) writeCityBundleFiles(root, original, Object.fromEntries(changedFiles.map((file) => [file, next[file]])), fingerprint);
    return { changedFiles };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}
