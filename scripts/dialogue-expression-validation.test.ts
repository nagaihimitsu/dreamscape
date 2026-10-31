import { describe, expect, it } from "vitest";
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

  it("rejects an unknown story or expression", () => {
    const badStory = catalog();
    badStory.entries[0].storyId = "milano/missing";
    expect(() => create(badStory)).toThrow("Unknown dialogue expression storyId");
    const badEmotion = catalog();
    badEmotion.entries[0].emotion = "not_registered";
    expect(() => create(badEmotion)).toThrow("Unknown dialogue expression emotion");
  });

  it("rejects changed, interpolated and name-dependent source lines", () => {
    expect(() => create(catalog(), source.replace(text, "「違う言葉」"))).toThrow("not a static Ink line");
    const withName = catalog();
    withName.entries[0].text = "「{heroine_name}、こんにちは」";
    expect(() => create(withName, source.replace(text, withName.entries[0].text))).toThrow("not a static Ink line");
    // A test-time rendered value must not be mistaken for a literal source line.
    const rendered = catalog();
    rendered.entries[0].text = "「検証ヒロイン、こんにちは」";
    expect(() => create(rendered, source.replace(text, "「{heroine_name}、こんにちは」"))).toThrow("not a static Ink line");
  });

  it("rejects a source line that is unreachable or has a different speaker", () => {
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
    expect(() => unreachable.finish()).toThrow("Unreachable or mismatched dialogue expression");
    const wrongSpeaker = source.replace("speaker: heroine", "speaker: narrator");
    const mismatch = create(catalog(), wrongSpeaker);
    validateStory(compileInk(wrongSpeaker), context, { choiceCount: 0, effectCount: 0, kind: "normal" }, {}, [],
      (line, speaker, explicit) => mismatch.observe(storyId, line, speaker, explicit));
    expect(() => mismatch.finish()).toThrow("Unreachable or mismatched dialogue expression");
  });

  it("rejects a contiguous explicit emotion before traversing the story", () => {
    const tagged = source.replace(text, `# emotion: neutral\n\n# speaker: heroine\n${text}`);
    expect(() => create(catalog(), tagged)).toThrow("Dialogue expression conflicts with Ink emotion");
  });

  it("rejects an explicit Ink emotion reached through a branch even across a source comment", () => {
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
      (line, speaker, explicit) => validator.observe(storyId, line, speaker, explicit)))
      .toThrow("Dialogue expression conflicts with Ink emotion");
  });
});
