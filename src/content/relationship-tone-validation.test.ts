import { describe, expect, it } from "vitest";
import { RELATIONSHIP_TONES } from "../domain/romance-tone";
import { compileInk, validateRelationshipToneSource, validateStory } from "../../scripts/content-pipeline";

const header = `VAR player_name = ""
VAR heroine_name = ""
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
`;
const choices = ["a", "b", "c"].map((id) => `* [選択${id}]
    # effect: effect_${id}
    {romance_result == "positive":
        届いた${id}。
    - else:
        届かなかった${id}。
    }
    -> END
`).join("\n");
const context = { effectIds: ["effect_a", "effect_b", "effect_c"], backgroundIds: [], emotionIds: [] };
const effects = context.effectIds.map((id) => ({ id, affectionDelta: 0, responseProfileId: "attentive" }));

describe("relationship tone Ink contract", () => {
  it("accepts every allowed ID in direct comparisons and ignores examples in comments", () => {
    for (const tone of RELATIONSHIP_TONES) {
      const source = `${header}// relationship_tone == "typo"\n{ relationship_tone == "${tone}": 近くを見る。 }\n${choices}`;
      expect(() => validateRelationshipToneSource(source)).not.toThrow();
      expect(validateStory(compileInk(source), context,
        { choiceCount: 1, effectCount: 1, kind: "special" }, {}, effects, undefined,
        { available: [], known: [] }, true, undefined, tone)).toBe(6);
    }
  });

  it("rejects misspellings, unsupported switches and script-side assignments", () => {
    expect(() => validateRelationshipToneSource(`${header}{ relationship_tone_after == "strianed": 会話 }`))
      .toThrow(/Unknown relationship tone: strianed/);
    expect(() => validateRelationshipToneSource(`${header}{ relationship_tone: - "strianed": 会話 }`))
      .toThrow(/Compare relationship tone/);
    expect(() => validateRelationshipToneSource(`${header}~ relationship_tone = "warm"`))
      .toThrow(/cannot be assigned/);
    expect(() => validateRelationshipToneSource(header.replace('VAR relationship_tone = "reserved"', "VAR relationship_tone = 0")))
      .toThrow(/declared with a quoted allowed ID/);
  });

  it("requires all three variables for the new contract but preserves legacy Ink", () => {
    const source = header.replace('VAR relationship_tone_before = "reserved"\n', "") + choices;
    const compiled = compileInk(source);
    const validate = (withTone: boolean) => validateStory(compiled, context,
      { choiceCount: 1, effectCount: 1, kind: "special" }, {}, effects, undefined,
      { available: [], known: [] }, true, undefined, withTone ? "reserved" : undefined);
    expect(validate(false)).toBe(6);
    expect(() => validate(true)).toThrow(/Missing required relationship tone Ink variable: relationship_tone_before/);
  });

  it("updates before and after tone for the response while preserving the opening tone", () => {
    const source = `${header}{ relationship_tone == "reserved": 開始時。 }
${choices.replace("届いたa。", '{ relationship_tone_before == "reserved" && relationship_tone_after == "strained": 変化後。 }')}`;
    const observed: string[] = [];
    validateStory(compileInk(source), context,
      { choiceCount: 1, effectCount: 1, kind: "special" }, {}, effects,
      (text) => observed.push(text), { available: [], known: [] }, true, undefined, "reserved");
    expect(observed).toContain("開始時。");
    expect(observed).toContain("変化後。");
  });
});
