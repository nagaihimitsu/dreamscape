import { travelCatalogSchema } from "../src/content/travel-schemas";
import { cityLayer, displayPath, journeyCatalogOf, loadContentSources, requireCity, type ContentSources } from "./content-sources";
import { inspectCityTransit, unsupportedTransitRoutes, type CityTransitReview } from "./transit-ledger";

// The authoring tools' view of a journey's in-city transport: which modes its
// per-city transit ledgers cover, where a city's ledger is, and the review of
// every city (journey:transit, city:bundle, journey:readiness).

/** A journey's declared transport modes (non-walk IDs). */
export type JourneyTransitPlan = { journeyId: string; modes: string[] };

export function journeyTransitPlan(sources: ContentSources, journeyId: string): JourneyTransitPlan {
  const journey = journeyCatalogOf(sources).journeys.find((entry) => entry.id === journeyId);
  if (!journey) throw new Error(`旅行編「${journeyId}」は登録されていません（content/journeys/<旅行編ID>/manifest.json）。` +
    `登録されている旅行編: ${journeyCatalogOf(sources).journeys.map((entry) => entry.id).join(", ") || "なし"}`);
  return { journeyId, modes: journey.transportModes.map((mode) => mode.id) };
}

/** The plan of the journey a city belongs to. */
export function cityTransitPlan(sources: ContentSources, cityId: string): JourneyTransitPlan {
  const owner = journeyCatalogOf(sources).journeys.find((journey) => journey.cities.some((city) => city.id === cityId));
  if (!owner) throw new Error(`都市「${cityId}」はどの旅行編の manifest.json の cities にもありません。`);
  return journeyTransitPlan(sources, owner.id);
}

/**
 * The root-relative path of a city's per-city transit ledger
 * (`<journey folder>/travel/<cityId>-transit.json`, also for a city that does
 * not exist yet), or undefined when its journey keeps none (walk only).
 */
export function cityTransitPath(sources: ContentSources, cityId: string): string | undefined {
  const plan = cityTransitPlan(sources, cityId);
  if (!plan.modes.length) return undefined;
  return `${displayPath(sources.root, cityLayer(sources, cityId).directory)}/travel/${cityId}-transit.json`;
}

export type CityTransitReport = CityTransitReview & {
  file: string;
  /** Routes of declared modes without a game-model estimate backed by a documented fact (transit-ledger.ts; a warning). */
  unsupportedRoutes: string[];
};
export type JourneyTransitReport = { journeyId: string; modes: string[]; cities: CityTransitReport[] };

/** Review every city of a journey (journey:transit): its ledger against its routes. */
export function inspectJourneyTransit(root: string, journeyId: string, sources = loadContentSources(root)): JourneyTransitReport {
  const plan = journeyTransitPlan(sources, journeyId);
  const journey = journeyCatalogOf(sources).journeys.find((entry) => entry.id === journeyId)!;
  if (!plan.modes.length) return { journeyId, modes: [], cities: [] };
  return { journeyId, modes: plan.modes, cities: journey.cities.map(({ id: cityId }) => {
    const files = requireCity(sources, cityId);
    const file = cityTransitPath(sources, cityId)!;
    if (files.transit === undefined)
      throw new Error(`都市「${cityId}」の交通判断台帳がありません: ${file}。乗り物を宣言した旅行編では、都市ごとに台帳を置きます（authoring/JOURNEY_AUTHORING.md）。`);
    const travel = travelCatalogSchema.parse(files.travel);
    return { ...inspectCityTransit(travel, files.transit, plan.modes, file), file,
      unsupportedRoutes: unsupportedTransitRoutes(travel, plan.modes).map((route) => `${route.fromPlaceId} → ${route.toPlaceId}（${route.mode}）`) };
  }) };
}
