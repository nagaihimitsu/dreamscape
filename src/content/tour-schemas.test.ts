import { describe, expect, it } from "vitest";
import { tourCatalogSchema, tourSchema } from "./tour-schemas";

const source = { publisher: "Example Cabs", title: "Day trip", url: "https://example.org/day-trip", checkedAt: "2026-11-10",
  claimType: "documented_fact", claimJa: "片道は車で約1時間。" } as const;
const leg = (id: string, toPlaceId: string) => ({ id, kind: "leg", labelJa: "車で移動", toPlaceId, minutes: 60,
  vehicle: { kind: "car", movingJa: "ツアーの車で移動中" }, estimation: "game_model", sources: [source] });
const tour = (patch: Record<string, unknown> = {}) => ({
  schemaVersion: 1, id: "tst_tour_fort", cityId: "tst_city", titleJa: "砦の日帰りツアー", summaryJa: "車で砦へ行き、昼に宿へ戻ります。",
  steps: [leg("out", "tst_fort"), { id: "visit", kind: "event", eventId: "tst_fort_episode" }, leg("back", "tst_hotel")],
  offers: [{ id: "desk", channel: "desk", sellerJa: "宿のフロント", placeIds: ["tst_hotel"], price: 3200, sources: [source] },
    { id: "web", channel: "web", sellerJa: "ツアー予約サイト", price: 3500, sources: [source] }],
  ...patch,
});

describe("tour schema (tour design stage 2a)", () => {
  it("accepts a tour with legs, an event step and desk and web offers, and a catalog of tours", () => {
    expect(tourSchema.parse(tour())).toEqual(tour());
    expect(tourCatalogSchema.parse([])).toEqual([]);
    expect(tourSchema.parse(tour({ when: { cityCompleted: "tst_city" } })).when).toEqual({ cityCompleted: "tst_city" });
    const introduced = { id: "friend", channel: "introduced", sellerJa: "知り合いの紹介", price: 0, when: { encounterSeen: "tst_meeting" }, sources: [source] };
    expect(tourSchema.parse(tour({ offers: [introduced] })).offers[0]).toEqual(introduced);
  });

  it.each<[string, Record<string, unknown>]>([
    ["another schema version", { schemaVersion: 2 }],
    ["an unknown field", { guideNameJa: "ガイド" }],
    ["no steps", { steps: [] }],
    ["no offers", { offers: [] }],
    ["a leg of no time", { steps: [{ ...leg("out", "tst_fort"), minutes: 0 }] }],
    ["a leg without sources", { steps: [{ ...leg("out", "tst_fort"), sources: [] }] }],
    ["a leg that is not a game estimate", { steps: [{ ...leg("out", "tst_fort"), estimation: undefined }] }],
    ["a leg with a story (stage 2b)", { steps: [{ ...leg("out", "tst_fort"), storyId: "places/tst_city" }] }],
    ["an unknown vehicle art", { steps: [{ ...leg("out", "tst_fort"), vehicle: { kind: "boat", movingJa: "船で移動中" } }] }],
    ["an unknown step kind", { steps: [{ id: "stroll", kind: "stroll" }] }],
    ["a desk offer without places", { offers: [{ id: "desk", channel: "desk", sellerJa: "宿のフロント", price: 1, sources: [source] }] }],
    ["a web offer with places", { offers: [{ id: "web", channel: "web", sellerJa: "予約サイト", placeIds: ["tst_hotel"], price: 1, sources: [source] }] }],
    ["a negative price", { offers: [{ id: "web", channel: "web", sellerJa: "予約サイト", price: -1, sources: [source] }] }],
    ["a price that is not whole", { offers: [{ id: "web", channel: "web", sellerJa: "予約サイト", price: 10.5, sources: [source] }] }],
    ["an invalid condition", { when: { cityCompleted: 3 } }],
    ["an ID that is not an ID", { id: "Tour-1" }],
  ])("rejects %s", (_label, patch) => {
    expect(tourSchema.safeParse(tour(patch)).success).toBe(false);
  });
});
