import type { Journey } from "../src/content/journey-catalog";
import type { TravelCatalog } from "../src/content/travel-schemas";
import { WALK_MODE_ID } from "../src/content/transport-schemas";
import { journeyManifestPath } from "./content-layout";

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
