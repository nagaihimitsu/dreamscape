import { describe, expect, it } from "vitest";
import destinationsData from "../../content/romance/date_destinations.json";
import { dateDestinationsSchema } from "./date-destinations";
import { getCityContent, presentation } from "./index";

describe("Indian date destinations awaiting story content", () => {
  it.each(["delhi", "agra", "jaipur"])("registers six independently sourced locations in %s", (cityId) => {
    const destinations = dateDestinationsSchema.parse(destinationsData).destinations.filter((item) => item.cityId === cityId);
    const { travel } = getCityContent(cityId);
    expect(destinations).toHaveLength(6);
    expect(new Set(destinations.map((item) => item.id)).size).toBe(6);
    for (const destination of destinations) {
      const place = travel.places.find((item) => item.destinationIds?.includes(destination.id));
      expect(place?.cityId).toBe(cityId);
      expect(place?.backgroundAssetId).toBe(destination.backgroundAssetId);
      expect(presentation.backgrounds[destination.backgroundAssetId]).toBeDefined();
      expect(destination.facts.length).toBeGreaterThan(0);
      expect(travel.events.some((event) => event.placeId === place?.id && event.category === "date" && event.contentStatus === "pending_content")).toBe(true);
    }
  });
});
