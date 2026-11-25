import { describe, expect, it } from "vitest";
import { alwaysBefore, branchPaths } from "./ink-branches";

// The static branch paths of an Ink source (scripts/ink-branches.ts): which arm of a multi-line conditional, and which
// choice of a menu, each line is on.

const lines = (...text: string[]) => text.join("\n");

describe("the branch path of each line", () => {
  it("tells the arms of a conditional apart, and joins them again after its end", () => {
    const paths = branchPaths(lines("=== scene ===", "{ quiz_correct:", "  正解。", "- else:", "  不正解。", "}", "その後。"));
    expect(paths[2]).toEqual([{ block: 2, arm: 0 }]);
    expect(paths[4]).toEqual([{ block: 2, arm: 1 }]);
    expect(alwaysBefore(paths[2], paths[4])).toBe(false);
    expect(paths[6]).toEqual([]);
    // A walk may take the other arm: the line after the end is not always past the first arm.
    expect(alwaysBefore(paths[2], paths[6])).toBe(false);
    expect(alwaysBefore(paths[0], paths[4])).toBe(true);
  });

  it("reads a conditional opened by `{` alone, nested conditionals and a choice inside an arm", () => {
    const paths = branchPaths(lines("{", "- romance_stage >= 3:", "  { cond(\"couple\"):", "    恋人。", "  }", "- else:", "  * [A]", "    a", "  * [B]", "    b", "}"));
    expect(paths[3]).toEqual([{ block: 1, arm: 0 }, { block: 3, arm: 0 }]);
    expect(paths[7]).toEqual([{ block: 1, arm: 1 }, { block: 7, arm: 0 }]);
    expect(paths[9]).toEqual([{ block: 1, arm: 1 }, { block: 7, arm: 1 }]);
    expect(alwaysBefore(paths[3], paths[7])).toBe(false);
  });

  it("tells the choices of a menu apart until the gather, and starts afresh in a new knot", () => {
    const paths = branchPaths(lines("* [Yes]", "  はい。", "  * * [Sure]", "    もちろん。", "* [No]", "  いいえ。", "- 合流。", "-> next", "=== next ===", "* [Again]"));
    expect(paths[1]).toEqual([{ block: 1, arm: 0 }]);
    expect(paths[3]).toEqual([{ block: 1, arm: 0 }, { block: 3, arm: 0 }]);
    expect(paths[5]).toEqual([{ block: 1, arm: 1 }]);
    expect(alwaysBefore(paths[1], paths[3])).toBe(true);
    expect(alwaysBefore(paths[3], paths[5])).toBe(false);
    expect(paths[6]).toEqual([]);
    expect(paths[7]).toEqual([]);
    expect(paths[9]).toEqual([{ block: 10, arm: 0 }]);
  });

  it("does not take a divert or a comment for a branch", () => {
    const paths = branchPaths(lines("// - else:", "-> END", "テキスト。 // { a:"));
    expect(paths).toEqual([[], [], []]);
  });
});
