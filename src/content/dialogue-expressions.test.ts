import { describe, expect, it } from "vitest";
import {
  dialogueExpressionCatalogSchema,
  resolveDialogueExpression,
} from "./dialogue-expressions";

const entry = {
  storyId: "milano/cafe_01",
  speaker: "heroine" as const,
  text: "「もう少しだけ、ここにいよう」",
  emotion: "smile",
};
const catalog = dialogueExpressionCatalogSchema.parse({ schemaVersion: 1, entries: [entry] });
const frame = { speaker: "heroine" as const, text: entry.text, emotion: "neutral" };

describe("dialogue expression annotations", () => {
  it("uses only an exact story, speaker and dialogue match", () => {
    expect(resolveDialogueExpression(catalog, entry.storyId, frame)).toBe("smile");
    expect(resolveDialogueExpression(catalog, "milano/walk_01", frame)).toBe("neutral");
    expect(resolveDialogueExpression(catalog, entry.storyId, { ...frame, speaker: "narrator" })).toBe("neutral");
    expect(resolveDialogueExpression(catalog, entry.storyId, { ...frame, text: `${entry.text}！` })).toBe("neutral");
    expect(frame.emotion).toBe("neutral");
  });

  it("preserves an explicit Ink expression and does not apply enemy or player expressions to the heroine", () => {
    expect(resolveDialogueExpression(catalog, entry.storyId, { ...frame, emotion: "shy" })).toBe("shy");
    expect(resolveDialogueExpression(catalog, entry.storyId, { ...frame, speaker: "enemy", emotion: "shy" })).toBe("neutral");
    expect(resolveDialogueExpression(catalog, entry.storyId, { ...frame, speaker: "player", emotion: "shy" })).toBe("neutral");
  });

  it("rejects duplicate annotations for the same line", () => {
    expect(() => dialogueExpressionCatalogSchema.parse({
      schemaVersion: 1,
      entries: [entry, { ...entry, emotion: "shy" }],
    })).toThrow("Duplicate dialogue expression");
  });
});
