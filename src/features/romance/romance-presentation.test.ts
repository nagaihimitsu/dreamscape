import { describe, expect, it } from "vitest";
import { dates } from "../../content";
import { storyFingerprint } from "../../story/runtime";
import { resolveRomancePresentation } from "./romance-presentation";

describe("presentation of the active romance script", () => {
  it.each(dates.filter((date) => !date.legacyOnly).map((date) => [date.id] as const))(
    "uses the current script and destination for %s", (dateId) => {
      const date = dates.find((item) => item.id === dateId)!;
      expect(resolveRomancePresentation(date, { storyHash: storyFingerprint(date.storyId) })).toEqual({
        storyId: date.storyId,
        destinationId: date.destinationId,
      });
    },
  );

  it("rejects an unknown story fingerprint instead of guessing a scene", () => {
    const date = dates.find((item) => item.id === "milano_invitation_01")!;
    expect(() => resolveRomancePresentation(date, { storyHash: "unknown" })).toThrow(/シナリオが更新/);
  });

  it("does not invent a destination for an unknown event", () => {
    expect(resolveRomancePresentation(undefined, { storyHash: "unknown" })).toEqual({ storyId: "", destinationId: undefined });
  });
});
