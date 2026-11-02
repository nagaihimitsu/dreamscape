import { describe, expect, it } from "vitest";
import { dates, dialogueExpressions } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { storyFingerprint } from "../../story/runtime";
import { resolveRomancePresentation } from "./romance-presentation";

describe("presentation of a saved romance script", () => {
  // The invitation already has both current and published legacy Ink, so this
  // checks the same hash-based routing used by versioned ordinary dates.
  const invitation = dates.find((date) => date.id === "milano_invitation_01")!;
  const oldStoryId = "milano/invitation_01";
  const date = { ...invitation, destinationId: "milano_brera", legacyDestinationId: "milano_la_scala" };

  it("shows the current location for the current script and the configured old location for a legacy script", () => {
    const current = resolveRomancePresentation(date, { storyHash: storyFingerprint(date.storyId) });
    expect(current).toEqual({ storyId: date.storyId, destinationId: "milano_brera" });
    const old = resolveRomancePresentation(date, { storyHash: storyFingerprint(oldStoryId) });
    expect(old).toEqual({ storyId: oldStoryId, destinationId: "milano_la_scala" });
  });

  it("does not invent a location for an old script without a recorded destination", () => {
    const old = resolveRomancePresentation({ ...date, legacyDestinationId: undefined }, { storyHash: storyFingerprint(oldStoryId) });
    expect(old.destinationId).toBeUndefined();
    expect(old.storyId).toBe(oldStoryId);
  });

  it("uses the original dialogue's registered expression instead of the replacement script's", () => {
    const annotation = dialogueExpressions.entries.find((entry) => entry.storyId === oldStoryId)!;
    expect(annotation).toBeDefined();
    const old = resolveRomancePresentation(date, { storyHash: storyFingerprint(oldStoryId) });
    const frame = { text: annotation.text, speaker: annotation.speaker, emotion: "neutral" } as const;
    expect(resolveDialogueExpression(dialogueExpressions, old.storyId, frame)).toBe(annotation.emotion);
    expect(resolveDialogueExpression(dialogueExpressions, date.storyId, frame)).toBe("neutral");
  });

  it("rejects an unknown story fingerprint instead of guessing a scene", () => {
    expect(() => resolveRomancePresentation(date, { storyHash: "unknown" })).toThrow(/シナリオが更新/);
  });

  it.each([
    ["milano_la_scala_date_01", "milano/la_scala_date_01"],
    ["milano_san_satiro_date_01", "milano/san_satiro_date_01"],
    ["milano_fondazione_prada_date_01", "milano/fondazione_prada_date_01"],
    ["milano_love_date_01", "milano/love_date_01"],
    ["milano_love_date_01", "milano/love_date_tour_01_random"],
  ] as const)("keeps the same known destination for a saved earlier %s script", (dateId, previousStoryId) => {
    const configured = dates.find((item) => item.id === dateId)!;
    expect(configured.legacyStoryIds).toContain(previousStoryId);
    expect(configured.legacyDestinationId).toBe(configured.destinationId);
    expect(resolveRomancePresentation(configured, { storyHash: storyFingerprint(previousStoryId) })).toEqual({
      storyId: previousStoryId,
      destinationId: configured.destinationId,
    });
  });

  it.each(["milano_cafe_01", "milano_walk_01", "milano_night_01", "milano_city_date_01"])(
    "does not assign a newly invented location to an earlier %s script",
    (dateId) => {
      const configured = dates.find((item) => item.id === dateId)!;
      expect(configured.destinationId).toBeTruthy();
      expect(configured.legacyStoryIds?.length).toBeGreaterThan(0);
      expect(configured.legacyDestinationId).toBeUndefined();
      const previousStoryId = configured.legacyStoryIds![0];
      expect(resolveRomancePresentation(configured, { storyHash: storyFingerprint(previousStoryId) }).destinationId).toBeUndefined();
    },
  );

  it("keeps the known tourism-version location without inventing one for the older cafe script", () => {
    const cafe = dates.find((item) => item.id === "milano_cafe_01")!;
    expect(resolveRomancePresentation(cafe, { storyHash: storyFingerprint(cafe.storyId) }).destinationId)
      .toBe("milano_starbucks_roastery");
    expect(resolveRomancePresentation(cafe, { storyHash: storyFingerprint("milano/cafe_tourism_01") }).destinationId)
      .toBe("milano_cafe_naviglio");
    expect(resolveRomancePresentation(cafe, { storyHash: storyFingerprint("milano/cafe_01") }).destinationId)
      .toBeUndefined();
  });

  it.each([
    ["milano_cafe_01", "milano/cafe_refresh_01", "milano_starbucks_roastery"],
    ["milano_walk_01", "milano/walk_refresh_01", "milano_duomo_square_walk"],
    ["milano_brera_date_01", "milano/brera_date_02_rewrite", "milano_brera"],
    ["milano_novecento_date_01", "milano/novecento_date_01_rewrite", "milano_novecento"],
  ] as const)("keeps the saved previous location for %s after the rewrite", (dateId, previousStoryId, destinationId) => {
    const configured = dates.find((item) => item.id === dateId)!;
    expect(resolveRomancePresentation(configured, { storyHash: storyFingerprint(previousStoryId) })).toEqual({
      storyId: previousStoryId,
      destinationId,
    });
  });
});
