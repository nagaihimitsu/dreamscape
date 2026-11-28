import { describe, expect, it } from "vitest";
import type { ListedTerm } from "../src/content/glossary";
import { checkTermTags, glossaryWarnings, termTagsOf } from "./glossary-terms";

// content:build's reading of `# term:` (旅の図鑑, 2026-11-13; scripts/glossary-terms.ts), on small Ink sources: which
// term each tag names and where, the terms of another journey, and the notes that do not stop the build.

const term = (id: string, journeyId: string, lineJa = "短い説明。"): ListedTerm =>
  ({ id, nameJa: "言葉", category: "food", lineJa, imageId: `${id}_img`, journeyId });
const journeys = new Map([["gt_term_golgappa", "golden_triangle"], ["smp_term_pan", "sample_trip"]]);
const source = [
  "=== gt_scene ===",
  "# speaker: narrator",
  "# term: gt_term_golgappa",
  "屋台でゴルガッパを頼んだ。",
  "* [Spicy? # option: spicy]",
  "-> END",
].join("\n");

describe("the # term: tags of an Ink source", () => {
  it("are read with their line, knot and the line they belong to (comments left out)", () => {
    expect(termTagsOf(`${source}\n// # term: gt_term_hidden`)).toEqual([
      expect.objectContaining({ key: "term", value: "gt_term_golgappa", line: 3, knot: "gt_scene", textLine: 4, choice: false }),
    ]);
  });

  it("name a term of the story's own journey; another journey's term, an unknown one and an empty tag stop the build", () => {
    expect(() => checkTermTags(source, "golden_triangle", journeys)).not.toThrow();
    expect(() => checkTermTags(source, "sample_trip", journeys))
      .toThrow("Term of another journey in # term: gt_term_golgappa is a term of golden_triangle");
    expect(() => checkTermTags(source.replace("gt_term_golgappa", "gt_term_pani"), "golden_triangle", journeys))
      .toThrow("Unknown term in # term: gt_term_pani");
    expect(() => checkTermTags(source.replace("# term: gt_term_golgappa", "# term:"), "golden_triangle", journeys)).toThrow("# term: without an ID");
  });
});

describe("the notes of 旅の図鑑", () => {
  const story = (text: string, layer = "golden_triangle") => ({ root: "/r", storyFiles: [{ id: "places/gt_x", file: "/r/x.ink", layer, source: text }] });
  const notes = (text: string, terms: ListedTerm[]) => glossaryWarnings(story(text) as never, terms).map((warning) => warning.message);

  it("say nothing of a tagged term with a short line", () => {
    expect(notes(source, [term("gt_term_golgappa", "golden_triangle")])).toEqual([]);
  });

  it("warn about a line over 40 characters and a term no tag of its journey names", () => {
    expect(notes(source, [term("gt_term_golgappa", "golden_triangle", "あ".repeat(41)), term("gt_term_blackbuck", "golden_triangle")])).toEqual([
      expect.stringContaining("Term line over 40 characters: gt_term_golgappa, 41"),
      expect.stringContaining("Term without a # term: tag: gt_term_blackbuck"),
    ]);
    // A tag in another journey's story does not count for it.
    expect(glossaryWarnings(story(source, "sample_trip") as never, [term("gt_term_golgappa", "golden_triangle")]).map((warning) => warning.message))
      .toEqual([expect.stringContaining("Term without a # term: tag: gt_term_golgappa")]);
  });

  it("say nothing of a term no tag names when an outfit puts it in 旅の図鑑", () => {
    const terms = [term("gt_term_golgappa", "golden_triangle"), term("gt_term_saree", "golden_triangle")];
    expect(glossaryWarnings(story(source) as never, terms, ["gt_term_saree"]).map((warning) => warning.message)).toEqual([]);
  });

  it("say nothing of a term tagged once on each branch of a scene (the arms of a conditional, the choices of a menu), or after the branch it is met on first", () => {
    const terms = [term("gt_term_golgappa", "golden_triangle")];
    const arms = "=== gt_quiz ===\n{ quiz_correct:\n    # term: gt_term_golgappa\n    正解。\n- else:\n    # term: gt_term_golgappa\n    不正解。\n}\n-> END";
    expect(notes(arms, terms)).toEqual([]);
    const choices = "=== gt_date ===\n* [Yes]\n    # term: gt_term_golgappa\n    はい。\n* [No]\n    # term: gt_term_golgappa\n    いいえ。\n- -> END";
    expect(notes(choices, terms)).toEqual([]);
    // Met first on the wrong answer's arm: the walk past the right answer meets it after the conditional.
    const oneArm = arms.replace("    # term: gt_term_golgappa\n    正解。", "    正解。").replace("\n-> END", "\n# term: gt_term_golgappa\nその後。");
    expect(notes(oneArm, terms)).toEqual([]);
    // A tag before the conditional is passed by every walk into its arms.
    expect(notes(`=== gt_quiz ===\n# term: gt_term_golgappa\n前。\n${arms.replace("=== gt_quiz ===\n", "")}`, terms))
      .toEqual([expect.stringContaining("Term tagged twice on one path of a scene"), expect.stringContaining("Term tagged twice on one path of a scene")]);
  });

  it("warn about the same term twice on one path of a scene (not in two scenes) and a tag on a choice", () => {
    const twice = `${source}\n# term: gt_term_golgappa\nもう一度。`;
    expect(notes(twice, [term("gt_term_golgappa", "golden_triangle")])).toEqual([expect.stringContaining("Term tagged twice on one path of a scene: gt_term_golgappa")]);
    const twoScenes = `${source}\n=== gt_other ===\n# term: gt_term_golgappa\nもう一度。`;
    expect(notes(twoScenes, [term("gt_term_golgappa", "golden_triangle")])).toEqual([]);
    const onChoice = source.replace("* [Spicy? # option: spicy]", "* [Spicy? # option: spicy # term: gt_term_golgappa]");
    expect(notes(onChoice, [term("gt_term_golgappa", "golden_triangle")])).toEqual([
      expect.stringContaining("Term tagged twice on one path of a scene: gt_term_golgappa"),
      expect.stringContaining("# term: on a choice: gt_term_golgappa"),
    ]);
  });

  it("warn about a line with more than two cards of 旅の図鑑 and 旅のことば (only two show under the window)", () => {
    const terms = [term("gt_term_golgappa", "golden_triangle"), term("gt_term_pani", "golden_triangle")];
    const two = "=== gt_x ===\n# term: gt_term_golgappa\n# local_word: gt_word_a\n行。\n-> END";
    expect(notes(two, terms.slice(0, 1))).toEqual([]);
    const three = "=== gt_x ===\n# term: gt_term_golgappa\n# term: gt_term_pani\n# local_word: gt_word_a\n行。\n-> END";
    expect(notes(three, terms)).toEqual([expect.stringContaining("More than 2 cards on one line: gt_term_golgappa, gt_term_pani, gt_word_a")]);
  });
});
