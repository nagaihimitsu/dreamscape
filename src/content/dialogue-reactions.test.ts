import { describe, expect, it } from "vitest";
import { dialogueReactionCatalogSchema, REACTION_MARKS, resolveDialogueReaction } from "./dialogue-reactions";

const entry = { storyId: "milano/test", speaker: "heroine" as const, text: "「ここにいよう」", targetCharacterId: "heroine" as const };
const parse = (entries: unknown[]) => dialogueReactionCatalogSchema.parse({ schemaVersion: 1, entries });

describe("dialogue reactions", () => {
  it("accepts all 13 marks and independent expression-only or mark-only entries", () => {
    expect(REACTION_MARKS).toHaveLength(13);
    for (const mark of REACTION_MARKS) expect(parse([{ ...entry, mark }]).entries[0].mark).toBe(mark);
    expect(parse([{ ...entry, expression: "smile" }]).entries[0].expression).toBe("smile");
    expect(() => parse([entry])).toThrow();
  });
  it("rejects unknown marks, targets, and duplicate target annotations", () => {
    expect(() => parse([{ ...entry, mark: "not_registered" }])).toThrow();
    expect(() => parse([{ ...entry, mark: "heart", targetCharacterId: "stranger" }])).toThrow();
    expect(() => parse([{ ...entry, mark: "heart" }, { ...entry, expression: "smile" }])).toThrow("Duplicate dialogue reaction");
  });
  it("matches story, text, speaker, and target without changing the frame", () => {
    const catalog = parse([{ ...entry, expression: "smile", mark: "heart" }, { ...entry, targetCharacterId: "enemy", mark: "sweat" }]);
    const frame = { speaker: "heroine" as const, text: entry.text };
    expect(resolveDialogueReaction(catalog, entry.storyId, frame, "heroine")).toEqual({ expression: "smile", mark: "heart" });
    expect(resolveDialogueReaction(catalog, entry.storyId, frame, "enemy")?.mark).toBe("sweat");
    expect(resolveDialogueReaction(catalog, "milano/other", frame, "heroine")).toBeUndefined();
    expect(resolveDialogueReaction(catalog, entry.storyId, { ...frame, speaker: "narrator" }, "heroine")).toBeUndefined();
    expect(resolveDialogueReaction(catalog, entry.storyId, { ...frame, text: "別の文" }, "heroine")).toBeUndefined();
    expect(frame).toEqual({ speaker: "heroine", text: entry.text });
  });
});
