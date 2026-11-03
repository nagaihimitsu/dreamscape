import data from "../../content/journeys/catalog.json";
import { journeyCatalogSchema } from "./journey-catalog";

export const journeys = journeyCatalogSchema.parse(data).journeys;
export function getJourney(id: string) {
  return journeys.find((journey) => journey.id === id);
}
export function getJourneyForCity(cityId: string) {
  return journeys.find((journey) => journey.cities.some((city) => city.id === cityId));
}
export type { Journey } from "./journey-catalog";
