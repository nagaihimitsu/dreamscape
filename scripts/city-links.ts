import type { journeyCatalogSchema } from "../src/content/journey-catalog";
import type { citySchema } from "../src/content/schemas";

/** Validate authored city links separately from content completion. */
export function validateCityLinks(cities: Array<ReturnType<typeof citySchema.parse>>, journeyCatalog: ReturnType<typeof journeyCatalogSchema.parse>) {
  for (const current of cities) {
    const seen = new Set<string>();
    let next: typeof current | undefined = current;
    while (next) {
      if (seen.has(next.id)) throw new Error(`Cyclic city route: ${next.id}`);
      seen.add(next.id);
      if (!next.nextCityId) break;
      const following = cities.find((item) => item.id === next!.nextCityId);
      const owner = journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === next!.id));
      const index = owner?.cities.findIndex((planned) => planned.id === next!.id) ?? -1;
      const plannedNext = following?.productionStatus === "prototype" && owner?.cities[index + 1]?.id === following.id;
      if (!following || (following.productionStatus !== "complete" && !plannedNext)) throw new Error(`Unknown or incomplete next city: ${next.nextCityId}`);
      next = following;
    }
  }
  for (const current of cities) {
    const owner = journeyCatalog.journeys.find((item) => item.cities.some((planned) => planned.id === current.id));
    if (!owner) throw new Error(`City has no journey: ${current.id}`);
    if (current.nextCityId) {
      const index = owner.cities.findIndex((planned) => planned.id === current.id);
      if (owner.cities[index + 1]?.id !== current.nextCityId)
        throw new Error(`Next city is outside the journey order: ${current.id}/${current.nextCityId}`);
    }
  }
}
