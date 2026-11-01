import { describe, expect, it, vi } from "vitest";
import { dialogueExpressionCatalogSchema } from "../src/content/dialogue-expressions";
import { compileInk, validateStory } from "./content-pipeline";
import { createDialogueExpressionValidator } from "./dialogue-expression-validation";

const storyId = "milano/test";
const text = "「ここにいよう」";
const source = `VAR player_name = "なお"
VAR heroine_name = "りえ"
# speaker: heroine
${text}
-> END`;
const entry = { storyId, speaker: "heroine" as const, text, emotion: "smile" };
const catalog = () => dialogueExpressionCatalogSchema.parse({ schemaVersion: 1, entries: [entry] });
const create = (input = catalog(), content = source) =>
  createDialogueExpressionValidator(input, { [storyId]: content }, [storyId], ["neutral", "smile"]);
const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral", "smile"] };

describe("dialogue expression content validation", () => {
  it("accepts a reachable static line with the matching speaker", () => {
    const validator = create();
    validateStory(compileInk(source), context, { choiceCount: 0, effectCount: 0, kind: "normal" }, {}, [],
      (line, speaker, explicit) => validator.observe(storyId, line, speaker, explicit));
    expect(() => validator.finish()).not.toThrow();
  });

  it("warns when a story is removed, but rejects an unknown expression", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const badStory = catalog();
    badStory.entries[0].storyId = "milano/missing";
    expect(() => create(badStory).finish()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("story no longer exists"));
    warn.mockRestore();
    const badEmotion = catalog();
    badEmotion.entries[0].emotion = "not_registered";
    expect(() => create(badEmotion)).toThrow("Unknown dialogue expression emotion");
    badEmotion.entries[0].storyId = "milano/missing";
    expect(() => create(badEmotion)).toThrow("Unknown dialogue expression emotion");
  });

  it("warns when a line is rewritten, while rejecting invalid interpolated annotations", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const changed = create(catalog(), source.replace(text, "「違う言葉」"));
    expect(() => changed.finish()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Stale dialogue expression"));
    warn.mockRestore();
    const withName = catalog();
    withName.entries[0].text = "「{heroine_name}、こんにちは」";
    expect(() => create(withName, source.replace(text, withName.entries[0].text))).toThrow("not a static Ink line");
  });

  it("warns if a previously annotated line becomes unreachable or changes speaker", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unreachableSource = `VAR player_name = "なお"
VAR heroine_name = "りえ"
先に終わります。
-> END
=== hidden ===
# speaker: heroine
${text}
-> END`;
    const unreachable = create(catalog(), unreachableSource);
    validateStory(compileInk(unreachableSource), context, { choiceCount: 0, effectCount: 0, kind: "normal" }, {}, [],
      (line, speaker, explicit) => unreachable.observe(storyId, line, speaker, explicit));
    expect(() => unreachable.finish()).not.toThrow();
    const wrongSpeaker = source.replace("speaker: heroine", "speaker: narrator");
    const mismatch = create(catalog(), wrongSpeaker);
    validateStory(compileInk(wrongSpeaker), context, { choiceCount: 0, effectCount: 0, kind: "normal" }, {}, [],
      (line, speaker, explicit) => mismatch.observe(storyId, line, speaker, explicit));
    expect(() => mismatch.finish()).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unreachable or speaker changed"));
    warn.mockRestore();
  });

  it("allows Ink emotion to replace an external expression", () => {
    const tagged = source.replace(text, `# emotion: neutral\n${text}`);
    const validator = create(catalog(), tagged);
    validateStory(compileInk(tagged), context, { choiceCount: 0, effectCount: 0, kind: "normal" }, {}, [],
      (line, speaker, explicit) => validator.observe(storyId, line, speaker, explicit));
    expect(() => validator.finish()).not.toThrow();
  });

  it("allows explicit Ink emotions on one route of a previously annotated line", () => {
    const branched = `VAR player_name = "なお"
VAR heroine_name = "りえ"
# speaker: heroine
* [一]
    ${text}
    -> END
* [二]
    # emotion: neutral
    // A comment separates the metadata from the dialogue in the source.
    ${text}
    -> END
* [三]
    別の台詞。
    -> END`;
    const validator = create(catalog(), branched);
    expect(() => validateStory(compileInk(branched), context,
      { choiceCount: 1, effectCount: 0, kind: "normal" }, {}, [],
      (line, speaker, explicit) => validator.observe(storyId, line, speaker, explicit))).not.toThrow();
  });
});
