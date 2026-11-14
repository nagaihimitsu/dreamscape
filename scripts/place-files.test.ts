import { describe, expect, it } from "vitest";
import { choiceOption, parseDone, readHead, readMainFileHead, readPlaceFile, reachableKnots } from "./place-files";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";

// The place files of the unified event design, stage 3a (3.1): the file's top, the knots' heads,
// the choices' effect tags read statically, and what stops the build (A1, A2, A6, A7, the # ap: numbers).

const top = "INCLUDE modules.ink\n-> DONE\n";
const talk = (head: string, body = "「こんにちは」\n-> END\n") => `${top}\n=== smp_x_talk ===\n# scene: talk\n${head}${body}`;

describe("place files", () => {
  it("reads a knot's head, blanks it (line numbers kept) and compiles with the game's modules.ink", () => {
    const source = talk("# at: visit x_tower\n# priority: +2\n# when: flag smp_x_flag\n# person: smp_x_lili\n# on_done: ap +1\n# on_done: item smp_x_card\n# sources: none\n");
    const file = readPlaceFile("places/smp_x_tower", source);
    expect(file.source.split("\n")).toHaveLength(source.split("\n").length);
    expect(file.source).not.toContain("# at:");
    const head = readHead(file.knots[0], 12)!;
    expect(head).toMatchObject({ kind: "talk", at: [{ visit: "x_tower" }], priority: 2, when: { flag: "smp_x_flag" }, people: ["smp_x_lili"],
      done: { ap: 1, items: ["smp_x_card"] }, sources: "none" });
    expect(() => compileInk(file.source, "places/smp_x_tower.ink", { [MODULES_FILE]: MODULES_INK })).not.toThrow();
  });

  it.each([
    ["VAR x = 1\n" + top + "=== a ===\n# scene: talk\nx\n-> END\n", "starts with the two lines"],
    [`${top}VAR x = 1\n=== a ===\n# scene: talk\nx\n-> END\n`, "declares no VAR"],
    [talk("# at: visit x\n# priority: -1\n", "line\n# priority: -2\n-> END\n"), "Head tag outside the head"],
    [talk("# at: visit x\n# priority: -1\n", "line\n# rel: affection +1\n-> END\n"), "An effect tag follows a choice"],
    [talk("# at: visit x\n# priority: -1\n", "= stitch\nline\n-> END\n"), "A stitch right after the head"],
    [talk("# at: visit x # speaker: narrator\n# priority: -1\n"), "Write each head tag on its own line"],
  ])("refuses a malformed place file (%#)", (source, message) => {
    expect(() => readPlaceFile("places/smp_x_tower", source)).toThrow(message);
  });

  it("reads the effect tags on the lines right after a choice, keyed by # option:", () => {
    const file = readPlaceFile("places/smp_x_tower", talk("# at: visit x\n# priority: +1\n",
      "* [Here. # option: give # translation: どうぞ]\n    # give: smp_x_card heroine\n    # rel: affection +1, trust -1\n    # rel: affection +1\n" +
      "    # money: -300\n    # money: +100\n    # ap: -1\n    # set: smp_x_flag\n    # speaker: heroine\n    「ありがとう」\n    -> END\n" +
      "* [Later. # option: later]\n    # later\n    -> END\n* [Just look.]\n    -> END\n"));
    const [give, later, plain] = file.knots[0].choices.map((choice) => choiceOption(choice, 12));
    expect(give).toEqual({ id: "give", knot: "smp_x_talk", translated: true, give: { item: "smp_x_card", to: "heroine" },
      rel: { affection: 2, trust: -1 }, money: -200, ap: -1, set: ["smp_x_flag"] });
    expect(later).toEqual({ id: "later", knot: "smp_x_talk", later: true });
    expect(plain).toBeUndefined();
  });

  it.each([
    ["    # ap: +0\n", "# ap: 0 does nothing"],
    ["    # ap: +13\n", "at most 12"],
    ["    # ap: 1\n", "with its sign"],
    ["    # money: 1.5\n", "with its sign"],
    ["    # rel: charm +1\n", "# rel: takes"],
  ])("refuses a choice tag's malformed number: %j", (tag, message) => {
    const file = readPlaceFile("places/smp_x_tower", talk("# at: visit x\n# priority: +1\n", `* [A # option: a]\n${tag}    x\n    -> END\n`));
    expect(() => choiceOption(file.knots[0].choices[0], 12)).toThrow(message);
  });

  it("warns, without stopping, about spending more AP than the cap; needs # option: on a choice with effects (A6)", () => {
    const warnings: string[] = [];
    const spend = readPlaceFile("places/smp_x_tower", talk("# at: visit x\n# priority: +1\n", "* [A # option: a]\n    # ap: -13\n    x\n    -> END\n"));
    expect(choiceOption(spend.knots[0].choices[0], 12, (message) => warnings.push(message))?.ap).toBe(-13);
    expect(warnings[0]).toContain("never be chosen");
    const noId = readPlaceFile("places/smp_x_tower", talk("# at: visit x\n# priority: +1\n", "* [A]\n    # rel: spark +1\n    x\n    -> END\n"));
    expect(() => choiceOption(noId.knots[0].choices[0], 12)).toThrow("needs # option:");
  });

  it("follows diverts to helper knots and refuses a target that is no knot, stitch or label (A2)", () => {
    const file = readPlaceFile("places/smp_x_tower", `${top}\n=== smp_x_date ===\n# scene: date\nhi\n-> smp_x_aside ->\n-> tea\n= tea\ntea\n- (stop) -> END\n\n=== smp_x_aside ===\nx\n->->\n`);
    expect(reachableKnots(file, "smp_x_date").map((knot) => knot.name)).toEqual(["smp_x_date", "smp_x_aside"]);
    const variable = readPlaceFile("places/smp_x_tower", `${top}\n=== smp_x_a ===\n# scene: talk\n# at: visit x\n# priority: +1\n-> somewhere_var\n`);
    expect(() => reachableKnots(variable, "smp_x_a")).toThrow("A divert goes to no knot, stitch or label");
  });

  it("reads every moment and its positions, refuses a position its moment lacks (A2), and reads # on_done:", () => {
    const head = (lines: string) => readHead(readPlaceFile("places/smp_x_tower", talk(lines)).knots[0], 12);
    // Stage 3b opens place, visit any, several moments and after guide / after battle; the other moments are stage 4.
    expect(head("# at: place x\n# at: visit any\n# priority: after guide\n")).toMatchObject({ at: [{ place: "x" }, { visit: "any" }], priority: "after guide" });
    expect(head("# at: visit x\n# priority: after battle\n")).toMatchObject({ priority: "after battle" });
    // Stage 4 opens the other moments of 2.3 and their positions; a position a moment lacks stops (A2). Tour stages 2b, 3: a tour's step.
    expect(head("# at: date smp_x_date\n# priority: after date\n")).toMatchObject({ at: [{ date: "smp_x_date" }], priority: "after date" });
    expect(head("# at: hotel\n# at: hotel x_hotel\n# priority: -1\n")).toMatchObject({ at: [{ hotel: "any" }, { hotel: "x_hotel" }] });
    expect(head("# at: trip walk from x_a to x_b\n# priority: -1\n")).toMatchObject({ at: [{ trip: "walk", from: "x_a", to: "x_b" }] });
    expect(head("# at: arrive x\n# at: finale x\n# at: epilogue x\n# at: depart x\n# at: ticket x_gate\n# priority: -1\n")?.at)
      .toEqual([{ arrive: "x" }, { finale: "x" }, { epilogue: "x" }, { depart: "x" }, { ticket: "x_gate" }]);
    expect(head("# at: arrive x\n# priority: after logo\n")).toMatchObject({ priority: "after logo" });
    expect(() => head("# at: visit x\n# priority: after date\n")).toThrow("has no after date");
    expect(() => head("# at: hotel\n# priority: after battle\n")).toThrow("has no after battle");
    expect(() => head("# at: trip walk\n# priority: +1\n")).toThrow("has no positive priority");
    expect(head("# at: tour x_tour first\n# priority: -1\n")).toMatchObject({ at: [{ tour: "x_tour", step: "first" }], priority: -1 });
    expect(head("# at: tour x_tour first\n# priority: after leg\n")).toMatchObject({ priority: "after leg" });
    expect(() => head("# at: visit x\n# priority: after leg\n")).toThrow("has no after leg");
    expect(() => head("# at: tour x_tour\n# priority: -1\n")).toThrow("# at: takes");
    expect(() => head("# at: somewhere x\n# priority: -1\n")).toThrow("# at: takes");
    expect(parseDone(["money -300", "rel affection +1", "use smp_x_card", "set smp_x_flag"], 12))
      .toEqual({ money: -300, rel: { affection: 1 }, use: ["smp_x_card"], set: ["smp_x_flag"] });
    expect(() => parseDone(["ap +13"], 12)).toThrow("at most 12");
  });

  it("reads the # on_done: and # then: at the top of a one-scene main file and blanks them", () => {
    const { source, onDone, then } = readMainFileHead('VAR player_name = ""\n\n# on_done: money -300\n# then: epilogue\n# speaker: heroine\nline\n-> END\n');
    expect(onDone).toEqual(["money -300"]);
    expect(then).toBe("epilogue");
    expect(source).toBe('VAR player_name = ""\n\n\n\n# speaker: heroine\nline\n-> END\n');
  });

  it("reads a date's # hint: (2026-11-13) in a date knot's head and a one-scene file's, and stops one on another scene", () => {
    const date = `${top}\n=== smp_x_date ===\n# scene: date\n# when: episodes x >= 1\n# hint: 塔の話を聞いたあとで\n「こんにちは」\n-> END\n`;
    const file = readPlaceFile("places/smp_x_tower", date);
    expect(file.source).not.toContain("# hint:");
    expect(readHead(file.knots[0], 12)).toMatchObject({ kind: "date", hint: "塔の話を聞いたあとで" });
    expect(() => readHead(readPlaceFile("places/smp_x_tower", talk("# at: visit x\n# priority: +1\n# hint: いつか\n")).knots[0], 12))
      .toThrow("# hint: is a date's head tag");
    expect(() => readPlaceFile("places/smp_x_tower", `${top}\n=== smp_x_date ===\n# scene: date\n# hint:\n「こんにちは」\n-> END\n`)).toThrow("Empty head tag");
    const head = readMainFileHead('VAR player_name = ""\n# hint: 朝市のあとで\n# speaker: heroine\nline\n-> END\n');
    expect(head).toEqual({ source: 'VAR player_name = ""\n\n# speaker: heroine\nline\n-> END\n', onDone: [], hint: "朝市のあとで" });
    expect(() => readMainFileHead("# hint: 一\n# hint: 二\nline\n")).toThrow("Write # hint: once");
    expect(() => readMainFileHead("# hint:\nline\n")).toThrow("Empty head tag: # hint:");
  });
});
