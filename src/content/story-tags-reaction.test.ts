import { describe, expect, it } from "vitest";
import { dialogueExpressionCatalogSchema, resolveDialogueExpression } from "./dialogue-expressions";
import { dialogueReactionCatalogSchema, resolveDialogueReaction } from "./dialogue-reactions";
import { parseStoryTags } from "./tags";
import { storyFrameSchema } from "../story/runtime";

const context = { effectIds: [], backgroundIds: ["cafe"], emotionIds: ["neutral", "exasperated", "smile"] };

describe("Ink presentation and choice tags", () => {
  it("reads independent reactions for multiple people, including a mark alone", () => {
    expect(parseStoryTags(["reaction: heroine,exasperated,sigh", "reaction: enemy,sweat"], context).reactions).toEqual({
      heroine: { expression: "exasperated", mark: "sigh" }, enemy: { mark: "sweat" },
    });
    expect(parseStoryTags(["reaction: heroine,smile"], context).reactions).toEqual({ heroine: { expression: "smile" } });
  });

  it("rejects bad targets, emotions, marks, duplicate targets and malformed tags", () => {
    for (const [tag, message] of [
      ["reaction: player,smile", "Unknown reaction target: player"],
      ["reaction: heroine,unknown", "Unknown reaction emotion: unknown"],
      ["reaction: heroine,smile,unknown", "Unknown reaction mark: unknown"],
      ["reaction: heroine", "Invalid reaction tag: heroine"],
      ["reaction: heroine,smile,", "Invalid reaction tag: heroine,smile,"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["reaction: heroine,sigh", "reaction: heroine,smile"], context)).toThrow("Duplicate reaction target");
  });

  it("reads choice identity and translation without repeating choice text", () => {
    expect(parseStoryTags(["option: coffee", "translation: コーヒーを頼む"], context)).toMatchObject({ optionId: "coffee", translationJa: "コーヒーを頼む" });
    expect(() => parseStoryTags(["option: bad id"], context)).toThrow("Invalid or duplicate option tag: bad id");
  });

  it("accepts frames without reactions and makes authored reactions override external annotations", () => {
    const old = { text: "行", speaker: "heroine" as const, emotion: "neutral", background: "cafe", choices: [], ended: false };
    expect(storyFrameSchema.parse(old)).toEqual(old);
    const catalog = dialogueReactionCatalogSchema.parse({ schemaVersion: 1, entries: [{ storyId: "milano/test", text: "行", speaker: "heroine", targetCharacterId: "heroine", expression: "smile", mark: "heart" }] });
    const current = storyFrameSchema.parse({ ...old, reactions: { heroine: { expression: "exasperated", mark: "sigh" } } });
    expect(resolveDialogueReaction(catalog, "milano/test", current, "heroine")).toEqual({ expression: "exasperated", mark: "sigh" });
    expect(resolveDialogueReaction(catalog, "milano/test", { ...old, emotionExplicit: true }, "heroine")).toEqual({ expression: undefined, mark: "heart" });
    expect(resolveDialogueReaction(catalog, "milano/test", { ...old, emotionExplicit: true, reactions: { heroine: { expression: "exasperated" } } }, "heroine")).toEqual({ expression: "exasperated", mark: "heart" });
  });

  it("keeps a neutral written in the Ink line over the external expression annotation for that line", () => {
    const catalog = dialogueExpressionCatalogSchema.parse({ schemaVersion: 1, entries: [{ storyId: "milano/test", text: "行", speaker: "heroine", emotion: "smile" }] });
    expect(resolveDialogueExpression(catalog, "milano/test", { text: "行", speaker: "heroine", emotion: "neutral", emotionExplicit: true })).toBe("neutral");
    expect(resolveDialogueExpression(catalog, "milano/test", { text: "行", speaker: "heroine", emotion: "neutral" })).toBe("smile");
  });
});
