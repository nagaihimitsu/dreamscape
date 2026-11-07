import { travelCatalogSchema } from "../src/content/travel-schemas";
import { cityLayer, displayPath, journeyCatalogOf, loadContentSources, requireCity, type ContentSources } from "./content-sources";
import { authoringProfileOf } from "./journey-authoring";
import { inspectCityTransit, unsupportedTransitRoutes, type CityTransitReview } from "./transit-ledger";

// The authoring tools' view of a journey's in-city transport: which modes its
// per-city transit ledgers cover, where a city's ledger is, and the review of
// every city (journey:transit, city:bundle, journey:readiness).

/** A journey's declared transport modes (non-walk IDs) and, while it waits for its switch, what it waits for. */
export type JourneyTransitPlan = { journeyId: string; modes: string[]; pendingJa?: string };

export function journeyTransitPlan(sources: ContentSources, journeyId: string): JourneyTransitPlan {
  const journey = journeyCatalogOf(sources).journeys.find((entry) => entry.id === journeyId);
  const manifest = sources.manifests.find((entry) => entry.id === journeyId);
  if (!journey || !manifest) throw new Error(`Unknown journey: ${journeyId}`);
  const pendingJa = authoringProfileOf(manifest.data, manifest.file)?.transitDecisionLedger?.pendingJa;
  return { journeyId, modes: journey.transportModes.map((mode) => mode.id), ...(pendingJa ? { pendingJa } : {}) };
}

/** The plan of the journey a city belongs to. */
export function cityTransitPlan(sources: ContentSources, cityId: string): JourneyTransitPlan {
  const owner = journeyCatalogOf(sources).journeys.find((journey) => journey.cities.some((city) => city.id === cityId));
  if (!owner) throw new Error(`City belongs to no journey: ${cityId}`);
  return journeyTransitPlan(sources, owner.id);
}

/**
 * The root-relative path of a city's per-city transit ledger
 * (`<journey folder>/travel/<cityId>-transit.json`, also for a city that does
 * not exist yet), or undefined when its journey keeps none: walk only, or
 * still waiting for its transport switch (the old journey-wide ledger).
 */
export function cityTransitPath(sources: ContentSources, cityId: string): string | undefined {
  const plan = cityTransitPlan(sources, cityId);
  if (!plan.modes.length || plan.pendingJa) return undefined;
  return `${displayPath(sources.root, cityLayer(sources, cityId).directory)}/travel/${cityId}-transit.json`;
}

export type CityTransitReport = CityTransitReview & {
  file: string;
  /** Routes of declared modes without a game-model estimate backed by a documented fact (transit-ledger.ts). */
  unsupportedRoutes: string[];
};
export type JourneyTransitReport =
  | { journeyId: string; pendingJa: string }
  | { journeyId: string; modes: string[]; cities: CityTransitReport[] };

/** Review every city of a journey (journey:transit): its ledger against its routes, or what the journey waits for. */
export function inspectJourneyTransit(root: string, journeyId: string, sources = loadContentSources(root)): JourneyTransitReport {
  const plan = journeyTransitPlan(sources, journeyId);
  if (plan.pendingJa) return { journeyId, pendingJa: plan.pendingJa };
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
