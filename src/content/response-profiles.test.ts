import { describe, expect, it } from "vitest";
import profileData from "../../content/romance/response_profiles.json";
import { responseProfileCatalogSchema } from "./schemas";
import { compileInk, validateNoInkRandom, validateStory } from "../../scripts/content-pipeline";

const profile = profileData.profiles[0];

describe("romance response profile contract", () => {
  it("accepts the configured profiles", () => {
    expect(responseProfileCatalogSchema.parse(profileData).profiles.length).toBeGreaterThan(0);
  });

  it.each([
    ["chance below zero", (p: any) => { p.baseChance = -1; }],
    ["chance above 100", (p: any) => { p.maxChance = 101; }],
    ["minimum above base", (p: any) => { p.minChance = p.baseChance + 1; }],
    ["base above maximum", (p: any) => { p.maxChance = p.baseChance - 1; }],
    ["inverted delta range", (p: any) => { p.positive.trust = [3, 2]; }],
    ["unknown stat", (p: any) => { p.negative.luck = [0, 1]; }],
  ])("rejects %s", (_label, mutate) => {
    const copy = structuredClone(profile);
    mutate(copy);
    expect(() => responseProfileCatalogSchema.parse({ schemaVersion: 1, profiles: [copy] })).toThrow();
  });
});

describe("Ink randomness in romance", () => {
  it.each([
    ["RANDOM", "VAR number = 0\n~ number = RANDOM(1, 2)\n"],
    ["SEED_RANDOM", "~ SEED_RANDOM(1)\n"],
    ["LIST_RANDOM", "LIST items = a, b\nVAR number = 0\n~ number = LIST_RANDOM(items)\n"],
  ])("rejects the compiled %s call", (name, source) => {
    expect(() => validateNoInkRandom(compileInk(`${source}会話。\n-> END\n`))).toThrow(name);
  });

  it("allows names in comments, strings and dialogue", () => {
    const source = `// RANDOM(1, 2) はコメント
/* SEED_RANDOM(1)
LIST_RANDOM(items) もコメント */
VAR message = "RANDOM(1, 2)"
台詞にも RANDOM(1, 2) と書ける。
-> END
`;
    expect(() => validateNoInkRandom(compileInk(source))).not.toThrow();
  });
});

const context = { effectIds: ["effect_a", "effect_b", "effect_c"], backgroundIds: [], emotionIds: [] };
const effects = ["effect_a", "effect_b", "effect_c"].map((id) => ({ id, affectionDelta: 0, responseProfileId: "attentive" }));
const header = `VAR player_name = ""
VAR heroine_name = ""
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
`;
const choices = ["a", "b", "c"].map((c) => `* [選択${c}]
    # effect: effect_${c}
    {romance_result == "positive":
        届いた${c}。
    - else:
        届かなかった${c}。
    }
    -> END
`).join("\n");

function validate(source: string) {
  return validateStory(compileInk(source), context,
    { choiceCount: 1, effectCount: 1, kind: "special" }, {}, effects, undefined,
    { available: [], known: [] }, true);
}

describe("random reaction Ink validation", () => {
  it("executes all three choices with both reactions", () => {
    expect(validate(header + choices)).toBe(6);
  });

  it("rejects a missing choice effect", () => {
    expect(() => validate(header + choices.replace("    # effect: effect_a\n", ""))).toThrow(/exactly one effect/);
  });

  it("rejects multiple effects on a choice", () => {
    expect(() => validate(header + choices.replace("    # effect: effect_a", "    # effect: effect_a\n    # effect: effect_b"))).toThrow(/exactly one effect/);
  });

  it("rejects an undeclared result variable", () => {
    expect(() => validate(header.replace('VAR romance_result = "neutral"\n', "") + choices)).toThrow();
  });

  it("rejects an effect without a response profile", () => {
    const input = effects.map((effect) => ({ id: effect.id, affectionDelta: 0 }));
    expect(() => validateStory(compileInk(header + choices), context,
      { choiceCount: 1, effectCount: 1, kind: "special" }, {}, input, undefined,
      { available: [], known: [] }, true)).toThrow(/needs a response profile/);
  });

  it("rejects reaction paths that show the same dialogue", () => {
    expect(() => validate(header + choices.replace("届かなかったa。", "届いたa。")))
      .toThrow(/different positive and negative reactions/);
  });

  it("rejects choice effects that depend on the hidden outcome", () => {
    const variableEffect = choices.replace(
      '    # effect: effect_a\n    {romance_result == "positive":\n        届いたa。\n    - else:\n        届かなかったa。',
      '    {romance_result == "positive":\n        # effect: effect_a\n        届いたa。\n    - else:\n        # effect: effect_b\n        届かなかったa。',
    );
    expect(() => validate(header + variableEffect)).toThrow(/must not depend/);
  });
});
