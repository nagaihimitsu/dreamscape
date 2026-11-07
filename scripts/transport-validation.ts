import type { Journey } from "../src/content/journey-catalog";
import type { RentalOffer, TravelCatalog } from "../src/content/travel-schemas";
import { WALK_MODE_ID } from "../src/content/transport-schemas";
import { journeyManifestPath } from "./content-layout";
import { inspectCityTransit, transitStatuses, unsupportedTransitRoutes, type CityTransitReview } from "./transit-ledger";

// Build checks of in-city transport (pure): the modes a journey declares in
// its manifest, the routes that use them, rentals and the per-city transit
// ledger. A journey that still keeps the old journey-wide transit ledger
// (manifest authoring.transitDecisionLedger with pendingJa, today Golden
// Triangle: 「ツアー機能待ち」) is reported as waiting for its switch and keeps
// its old modes; the checks marked below do not apply to it.

/** Transport modes a journey may declare besides walking. */
export const MAX_TRANSPORT_MODES = 2;

/** What a journey waiting for its transport switch waits for, and its own command that checks the old ledger meanwhile. */
export type TransportPending = { pendingJa: string; inspectCommand: string };

/** A journey's transport facts the checks need: its declared modes and whether it still waits for its switch. */
export type JourneyTransport = { journey: Pick<Journey, "id" | "transportModes">; pending?: TransportPending;
  /** The journey's manifest as content:build read it (default: content/journeys/<id>/manifest.json). */
  manifestFile?: string };
const manifestOf = (transport: JourneyTransport) => transport.manifestFile ?? journeyManifestPath(transport.journey.id);

/** The one Japanese line content:build, journey:transit and journey:readiness print for a waiting journey. */
export function transportWaitingJa({ pendingJa, inspectCommand }: TransportPending): string {
  return `${pendingJa}（交通は旧方式のまま。都市ごとの交通判断台帳と新しい交通の確認はまだ使いません。旧方式の判断台帳は ${inspectCommand} で確かめます）`;
}

/** Walking plus at most two declared modes; a journey waiting for its switch keeps its old ones. */
export function checkTransportModeCount(transport: JourneyTransport): void {
  const count = transport.journey.transportModes.length;
  if (count <= MAX_TRANSPORT_MODES || transport.pending) return;
  const manifest = manifestOf(transport);
  throw new Error(`乗り物は徒歩のほかに${MAX_TRANSPORT_MODES}つまでです: ${manifest} の transportModes に${count}つあります` +
    `（At most ${MAX_TRANSPORT_MODES} transport modes besides walking: ${manifest}）。`);
}

/**
 * Every route uses walking or a mode its journey declares, and a route from a
 * place to the same place is walking (the place's zero-time route): no ledger
 * decision covers a pair with from = to, so a vehicle there would go unchecked.
 */
export function checkRouteModes(travel: TravelCatalog, travelFile: string, transport: JourneyTransport): void {
  const declared = new Set([WALK_MODE_ID, ...transport.journey.transportModes.map((mode) => mode.id)]);
  for (const route of travel.routes) {
    if (route.fromPlaceId === route.toPlaceId && route.mode !== WALK_MODE_ID)
      throw new Error(`同じ地点への経路は徒歩だけです: ${travelFile} の ${route.fromPlaceId} → ${route.toPlaceId} が "${route.mode}" です。` +
        `その地点の徒歩0分の経路だけを残してください（Same-place route of a vehicle: ${travelFile} ${route.fromPlaceId} uses "${route.mode}"）。`);
    if (declared.has(route.mode)) continue;
    const manifest = manifestOf(transport);
    throw new Error(`乗り物 "${route.mode}" は ${manifest} の transportModes に宣言されていません: ${travelFile} の ${route.fromPlaceId} → ${route.toPlaceId}。` +
      `manifest.json に宣言するか、経路の mode を直してください（Undeclared transport mode: ${travelFile} ${route.fromPlaceId} → ${route.toPlaceId} uses "${route.mode}"; declare it in ${manifest} transportModes）。`);
  }
}

/** A city's travel files as content:build has them (paths for the messages). */
export type CityTransitFiles = { travel: TravelCatalog; transit: unknown; transitFile: string; travelFile?: string };

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
    if (options.requireLedger && modes.length && !transport.pending)
      throw new Error(`交通判断台帳 ${city.transitFile} がありません。乗り物を宣言した旅行編では、都市ごとに台帳が要ります（Missing transit ledger）。`);
    return undefined;
  }
  if (transport.pending)
    throw new Error(`${city.transitFile} は置けません。${transport.journey.id} は交通の切り替えを待っています（${transport.pending.pendingJa}）。` +
      "それまでは編全体の旧方式の台帳だけを使います（A journey waiting for its transport switch keeps no per-city transit ledger）。");
  if (!modes.length)
    throw new Error(`${city.transitFile} は要りません。${transport.journey.id} は徒歩だけの旅行編です（Transit ledger in a walk-only journey）。`);
  const review = inspectCityTransit(city.travel, city.transit, modes, city.transitFile);
  // A route of a declared mode is a game estimate backed by a documented fact (the fact's reach is a review rule).
  const unsupported = unsupportedTransitRoutes(city.travel, modes);
  if (unsupported.length) {
    const [first] = unsupported;
    throw new Error(`乗り物の経路${unsupported.length}本に、ゲーム用の推定の印（"estimation": "game_model"）か事実の出典（documented_fact）がありません。` +
      `最初の1本: ${city.travelFile ?? city.travel.cityId} の ${first.fromPlaceId} → ${first.toPlaceId}（${first.mode}）` +
      `（A route of a declared transport mode needs a game-model estimate and a documented fact）。`);
  }
  return review;
}

/**
 * One line of the build report per journey: its modes and its ledgers'
 * decisions per status, so that `inconclusive` stays visible, or what a
 * waiting journey waits for (e.g. `Transport golden_triangle: ツアー機能待ち …`).
 */
export function transportSummary(transport: JourneyTransport, reviews: readonly CityTransitReview[]): string {
  const { journey } = transport;
  const modes = ["walk", ...journey.transportModes.map((mode) => mode.id + (mode.rental ? " (rental)" : ""))].join(", ");
  if (transport.pending) return `Transport ${journey.id}: ${transportWaitingJa(transport.pending)}; modes ${modes}`;
  const totals = Object.fromEntries(transitStatuses.map((status) => [status,
    reviews.reduce((sum, review) => sum + Object.values(review.counts).reduce((inner, byStatus) => inner + byStatus[status], 0), 0)]));
  const ledger = reviews.length ? `; transit ledgers ${reviews.length}: ${transitStatuses.map((status) => `${status} ${totals[status]}`).join(", ")}` : "";
  return `Transport ${journey.id}: modes ${modes}${ledger}`;
}

/**
 * Rentals of a city: an offer names a rental mode of the journey that has
 * routes in this city, at places of the city; every rental mode with routes
 * here has an offer (else its routes could never be ridden). A journey
 * waiting for its switch declares no rental mode and keeps no offer.
 */
export function checkCityRentals(travel: TravelCatalog, rentals: readonly RentalOffer[] | undefined, settingsFile: string, transport: JourneyTransport): void {
  const offers = rentals ?? [];
  const rentalModes = transport.journey.transportModes.filter((mode) => mode.rental).map((mode) => mode.id);
  if (transport.pending && (rentalModes.length || offers.length))
    throw new Error(`${transport.journey.id} は交通の切り替えを待っているので（${transport.pending.pendingJa}）、借りる乗り物と貸し出しはまだ使えません（Rentals in a journey waiting for its transport switch）。`);
  const places = new Set(travel.places.map((place) => place.id));
  const routed = new Set(travel.routes.map((route) => route.mode));
  for (const offer of offers) {
    if (!rentalModes.includes(offer.modeId))
      throw new Error(`${settingsFile} の貸し出し "${offer.modeId}" は、借りる乗り物（manifest.json の transportModes で "rental": true）ではありません（Rental offer for a mode that is not a declared rental mode）。`);
    if (!routed.has(offer.modeId))
      throw new Error(`${settingsFile} の貸し出し "${offer.modeId}" には、この都市の経路がありません（Rental offer for a mode without routes in the city）。`);
    const unknown = offer.placeIds.find((placeId) => !places.has(placeId));
    if (unknown) throw new Error(`${settingsFile} の貸し出し "${offer.modeId}" の場所 "${unknown}" は、この都市の地点ではありません（Unknown rental place）。`);
  }
  for (const modeId of rentalModes)
    if (routed.has(modeId) && !offers.some((offer) => offer.modeId === modeId))
      throw new Error(`借りる乗り物 "${modeId}" の経路がありますが、${settingsFile} の rentals に貸し出しがありません（Rental mode without an offer）。`);
}
