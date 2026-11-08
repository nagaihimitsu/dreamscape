import { getJourneyForCity } from "./journeys";
import { WALK_MODE, type TransportMode } from "./transport-schemas";

export * from "./transport-schemas";

/** Walking first, then the modes the city's journey declares. */
export function getTransportModes(cityId: string): TransportMode[] {
  return [WALK_MODE, ...(getJourneyForCity(cityId)?.transportModes ?? [])];
}

export function getTransportMode(cityId: string, modeId: string): TransportMode | undefined {
  return getTransportModes(cityId).find((mode) => mode.id === modeId);
}

/** The label of a route's mode; an undeclared ID (never in built content) shows as is. */
export function transportLabel(cityId: string, modeId: string): string {
  return getTransportMode(cityId, modeId)?.nameJa ?? modeId;
}
