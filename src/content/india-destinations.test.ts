import { describe, expect, it } from "vitest";
import destinationsData from "./generated/content/romance/date_destinations.json";
import { dateDestinationsSchema } from "./date-destinations";
import { dates, getCityContent, presentation, stories } from "./index";

describe("authored Indian date destinations", () => {
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
      const event = travel.events.find((event) => event.placeId === place?.id && event.category === "date");
      expect(event).toBeDefined();
      expect(event?.contentStatus).toBeUndefined();
      const date = dates.find((date) => date.id === event?.id);
      expect(date?.destinationId).toBe(destination.id);
      expect(date?.chapterId).toBe(cityId);
      expect(date && stories[date.storyId]).toBeDefined();
    }
  });
});
