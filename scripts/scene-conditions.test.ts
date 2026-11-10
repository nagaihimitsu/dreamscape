import { Story } from "inkjs";
import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { validateEpilogue } from "./epilogue-validation";
import {
  bindCondAssignment, compiledConditionTexts, COND_DECLARATION, COND_FALLBACK, condWalk, forEachCondAssignment,
  parseSceneConditions, readSceneConditions,
} from "./scene-conditions";

// A scene's cond("…") at content:build (unified event design stage 2a, decisions 10 and 40).
const declared = (body: string, vars = "") => `VAR player_name = ""\nVAR heroine_name = ""\n${vars}${COND_DECLARATION}\n${body}\n${COND_FALLBACK.join("\n")}\n`;

describe("reading a scene's cond texts", () => {
  it("lists each literal text once, in the order written, and skips comments, the declaration and the stand-in", () => {
    const source = declared(`// cond("in a comment")\n/* cond("in a block") */\n{ cond("money >= 300"): rich }\n` +
      `* {cond("couple")} [A]\n* [B {cond("money >= 300"): x}]\n`);
    expect(readSceneConditions(source)).toEqual(["money >= 300", "couple"]);
    expect(readSceneConditions("VAR player_name = \"\"\nHello.\n")).toEqual([]);
  });

  it("stops a one-scene file that calls cond without its declaration, with the three lines to add (decision 40)", () => {
    const missing = () => readSceneConditions(`VAR player_name = ""\n{ cond("couple"): yes }\n${COND_FALLBACK.join("\n")}\n`);
    expect(missing).toThrow(`add the line\n  EXTERNAL cond(text)\nafter the VAR lines`);
    expect(missing).toThrow(`the two lines\n  === function cond(text) ===\n  ~ return false`);
  });

  it("stops a cond without one literal text", () => {
    expect(() => readSceneConditions(declared(`~ temp text = "couple"\n{ cond(text): yes }`))).toThrow("cond takes one condition written as text in quotes");
    expect(() => readSceneConditions(declared(`{ cond("a" + "b"): yes }`))).toThrow("(line 4)");
  });

  it("reads each text as a condition, naming the text that is not one", () => {
    expect(parseSceneConditions(["rel affection >= 3", "not couple"]))
      .toEqual({ "rel affection >= 3": { relationship: { axis: "affection", atLeast: 3 } }, "not couple": { not: { couple: true } } });
    expect(() => parseSceneConditions(["money > 3"])).toThrow('cond("money > 3"): Write the condition part "money"');
    expect(() => parseSceneConditions(["flag smp_x y"])).toThrow('cond("flag smp_x y"): Write the condition part "flag"');
    expect(parseSceneConditions(["flag smp_x", "ap >= 1"])).toEqual({ "flag smp_x": { flag: "smp_x" }, "ap >= 1": { ap: { atLeast: 1 } } });
  });

  it("finds the texts in the compiled story too", () => {
    const compiled = compileInk(declared(`{ cond("money >= 300"): rich }\n* {cond("couple")} [A]\n  a\n* [B]\n  b\n- -> END`));
    expect(compiledConditionTexts(compiled)).toEqual(["couple", "money >= 300"]);
  });
});

describe("walking the texts' values", () => {
  it("walks representative values: all false, all true and each text alone true", () => {
    const texts = ["a", "b", "c", "d", "e"];
    const { assignments } = condWalk(texts);
    expect(assignments).toHaveLength(texts.length + 2);
    for (const text of texts) expect(new Set(assignments.map((item) => item[text]))).toEqual(new Set([true, false]));
    expect(condWalk([]).assignments).toEqual([{}]);
    expect(condWalk(["a"]).assignments).toEqual([{ a: false }, { a: true }]);
  });

  it("binds cond to the walk's values and refuses a text the walk does not know", () => {
    const compiled = compileInk(declared(`{ cond("couple"): yes | no }\n{ cond("money >= 1"): more }`));
    const story = new Story(compiled);
    bindCondAssignment(story, { couple: true, "money >= 1": false });
    expect(story.ContinueMaximally().trim()).toBe("yes");
    const unknown = new Story(compiled);
    bindCondAssignment(unknown, { couple: true });
    expect(() => unknown.ContinueMaximally()).toThrow("Unknown cond text: money >= 1");
  });

  it("stops a scene that breaks only in one combination, naming it", () => {
    const compiled = compileInk(declared(`It begins.\n{ cond("couple") && not cond("rel trust >= 2"): -> wait }\nIt ends.\n-> END\n=== wait ===\n* [Wait] waited\n- -> END`,
      'VAR player_address = ""\nVAR romance_stage = 1\nVAR ending_reached = false\n'));
    const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
    expect(() => validateEpilogue(compiled, context)).toThrow('(with cond("couple") true, cond("rel trust >= 2") false)');
    let walks = 0;
    forEachCondAssignment(compiled, () => { walks++; });
    expect(walks).toBe(4);
  });
});
