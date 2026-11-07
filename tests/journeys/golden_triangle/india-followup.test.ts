import { describe, expect, it } from "vitest";
import { readIndiaFollowup, validateIndiaFollowup } from "../../../scripts/journeys/golden_triangle/india-followup";

describe("India follow-up research", () => {
  it("uses the same source contract as Milan and covers all named attraction candidates", () => {
    const data = readIndiaFollowup(process.cwd());
    const counts = validateIndiaFollowup(data);
    expect(counts.images).toBe(30);
    const places = data.places as Array<{ id: string }>;
    const venues = data.venues as { records: Array<{ placeId: string }> };
    const candidates = places.filter((place) => !place.id.endsWith("_hotel_hub")).map((place) => place.id);
    expect(new Set(venues.records.map((record) => record.placeId))).toEqual(new Set(candidates));
  });

  it("rejects a city mismatch and a source without a valid HTTPS URL", () => {
    const original = readIndiaFollowup(process.cwd());
    const wrongCity = structuredClone(original);
    const venues = wrongCity.venues as { records: Array<{ cityId: string }> };
    venues.records[0].cityId = venues.records[0].cityId === "jaipur" ? "delhi" : "jaipur";
    expect(() => validateIndiaFollowup(wrongCity)).toThrow(/mismatched city/);
    const badSource = structuredClone(original);
    const access = badSource.access as { records: Array<{ sources: Array<{ url: string }> }> };
    access.records[0].sources[0].url = "http://example.org";
    expect(() => validateIndiaFollowup(badSource)).toThrow();
  });

  it("does not treat a preview as a fully reviewed production image", () => {
    const input = readIndiaFollowup(process.cwd());
    const images = input.images as { images: Array<{ previewViewed: boolean; originalImageDownloaded: boolean; productionReady: boolean }> };
    images.images[0].previewViewed = true;
    images.images[0].originalImageDownloaded = false;
    images.images[0].productionReady = true;
    expect(() => validateIndiaFollowup(input)).toThrow(/Production image requires/);
  });
});
