import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { compileInk, validateStory } from "../../scripts/content-pipeline";
import { bindMemoryReader, validateMemoryReferences } from "./memory";

const script = `EXTERNAL has_memory(memory_id)
VAR player_name = ""
VAR heroine_name = ""
{has_memory("brera_memory"):
以前の絵の話。
- else:
初めての絵の話。
}
-> END
`;

describe("Ink memory reference", () => {
  it("reads only registered memories and changes the callback without changing state", () => {
    const compiled = compileInk(script);
    for (const [available, expected] of [
      [[], "初めての絵の話。"],
      [["brera_memory"], "以前の絵の話。"],
    ] as const) {
      const story = new Story(compiled);
      bindMemoryReader(story, available, ["brera_memory"]);
      expect(story.Continue()?.trim()).toBe(expected);
      expect(available).toEqual(expected.startsWith("以前") ? ["brera_memory"] : []);
    }
  });

  it("rejects unknown, malformed, or dynamic references before compilation", () => {
    expect(validateMemoryReferences(script, ["brera_memory"])).toEqual(["brera_memory"]);
    expect(() => validateMemoryReferences(script, [])).toThrow(/Unknown memory ID/);
    expect(() => validateMemoryReferences(script.replace('"brera_memory"', "memory_id"), ["brera_memory"])).toThrow(/literal/);
    expect(() => validateMemoryReferences(script.replace('"brera_memory"', '"../escape"'), ["brera_memory"])).toThrow(/literal/);
  });

  it("does not make an unknown reference executable by bypassing static validation", () => {
    const story = new Story(compileInk(script));
    bindMemoryReader(story, ["brera_memory"], []);
    expect(() => story.Continue()).toThrow(/Unknown memory ID/);
  });

  it("validates complete Ink paths with both the recalled and absent context", () => {
    const compiled = compileInk(script);
    const contract = { choiceCount: 0, effectCount: 0, kind: "special" } as const;
    for (const available of [[], ["brera_memory"]])
      expect(validateStory(compiled, { effectIds: [], backgroundIds: [], emotionIds: [] }, contract, {}, [], undefined, { available, known: ["brera_memory"] })).toBe(1);
  });
});
