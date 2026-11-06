import data from "./generated/content/journeys/catalog.json";
import { journeyCatalogSchema } from "./journey-catalog";

export const journeys = journeyCatalogSchema.parse(data).journeys;
/**
 * The journey the title screen, a new game and Debug start with: the first
 * available journey in manifest order (content:build requires one).
 */
export const defaultJourneyId = journeys.find((journey) => journey.status === "available")!.id;
export function getJourney(id: string) {
  return journeys.find((journey) => journey.id === id);
}
export function getJourneyForCity(cityId: string) {
  return journeys.find((journey) => journey.cities.some((city) => city.id === cityId));
}
export type { Journey } from "./journey-catalog";
