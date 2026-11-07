import type { Journey } from "../src/content/journey-catalog";
import type { TravelCatalog } from "../src/content/travel-schemas";
import { WALK_MODE_ID } from "../src/content/transport-schemas";
import { journeyManifestPath } from "./content-layout";
import { inspectCityTransit, transitStatuses, type CityTransitReview } from "./transit-ledger";

// Build checks of in-city transport (pure): the modes a journey declares in
// its manifest, the routes that use them, rentals and the per-city transit
// ledger. A journey that still keeps the old journey-wide transit ledger
// (manifest authoring.transitDecisionLedger with pendingJa, today Golden
// Triangle: 「ツアー機能待ち」) is reported as waiting for its switch and keeps
// its old modes; the checks marked below do not apply to it.

/** Transport modes a journey may declare besides walking. */
export const MAX_TRANSPORT_MODES = 2;

/** A journey's transport facts the checks need: its declared modes and whether it still waits for its switch. */
export type JourneyTransport = { journey: Pick<Journey, "id" | "transportModes">; pendingJa?: string };

/** Every route uses walking or a mode its journey declares. */
export function checkRouteModes(travel: TravelCatalog, travelFile: string, transport: JourneyTransport): void {
  const declared = new Set([WALK_MODE_ID, ...transport.journey.transportModes.map((mode) => mode.id)]);
  for (const route of travel.routes) {
    if (declared.has(route.mode)) continue;
    const manifest = journeyManifestPath(transport.journey.id);
    throw new Error(`乗り物 "${route.mode}" は ${manifest} の transportModes に宣言されていません: ${travelFile} の ${route.fromPlaceId} → ${route.toPlaceId}。` +
      `manifest.json に宣言するか、経路の mode を直してください（Undeclared transport mode: ${travelFile} ${route.fromPlaceId} → ${route.toPlaceId} uses "${route.mode}"; declare it in ${manifest} transportModes）。`);
  }
}

/** A city's travel files as content:build has them (paths for the messages). */
export type CityTransitFiles = { travel: TravelCatalog; transit: unknown; transitFile: string };

/**
 * The per-city transit ledger: a journey that declares transport modes keeps
 * one ledger per city (all rules of inspectCityTransit); a walk-only journey
 * and a journey still waiting for its switch keep none (the waiting journey
 * keeps its old journey-wide ledger and its own tools). Returns the review,
 * or undefined without a ledger.
 */
export function checkCityTransit(city: CityTransitFiles, transport: JourneyTransport, options: { requireLedger: boolean }): CityTransitReview | undefined {
  const modes = transport.journey.transportModes.map((mode) => mode.id);
  if (city.transit === undefined) {
    if (options.requireLedger && modes.length && !transport.pendingJa)
      throw new Error(`交通判断台帳 ${city.transitFile} がありません。乗り物を宣言した旅行編では、都市ごとに台帳が要ります（Missing transit ledger）。`);
    return undefined;
  }
  if (transport.pendingJa)
    throw new Error(`${city.transitFile} は置けません。${transport.journey.id} は交通の切り替えを待っています（${transport.pendingJa}）。` +
      "それまでは編全体の旧方式の台帳だけを使います（A journey waiting for its transport switch keeps no per-city transit ledger）。");
  if (!modes.length)
    throw new Error(`${city.transitFile} は要りません。${transport.journey.id} は徒歩だけの旅行編です（Transit ledger in a walk-only journey）。`);
  return inspectCityTransit(city.travel, city.transit, modes, city.transitFile);
}

/**
 * One line of the build report per journey: its modes and its ledgers'
 * decisions per status, so that `inconclusive` stays visible, or what a
 * waiting journey waits for (e.g. `Transport golden_triangle: ツアー機能待ち …`).
 */
export function transportSummary(transport: JourneyTransport, reviews: readonly CityTransitReview[]): string {
  const { journey } = transport;
  const modes = ["walk", ...journey.transportModes.map((mode) => mode.id + (mode.rental ? " (rental)" : ""))].join(", ");
  if (transport.pendingJa)
    return `Transport ${journey.id}: ${transport.pendingJa}（交通は旧方式のまま。都市ごとの交通判断台帳と新しい交通の確認はまだ使いません）; modes ${modes}`;
  const totals = Object.fromEntries(transitStatuses.map((status) => [status,
    reviews.reduce((sum, review) => sum + Object.values(review.counts).reduce((inner, byStatus) => inner + byStatus[status], 0), 0)]));
  const ledger = reviews.length ? `; transit ledgers ${reviews.length}: ${transitStatuses.map((status) => `${status} ${totals[status]}`).join(", ")}` : "";
  return `Transport ${journey.id}: modes ${modes}${ledger}`;
}
