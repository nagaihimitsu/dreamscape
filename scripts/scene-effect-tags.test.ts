import { describe, expect, it } from "vitest";
import { checkSceneEffectTags, itemJourneys, sceneEffectTagsOf } from "./scene-effect-tags";

// The scene's atmosphere tags (2026-11-13), read statically from the Ink source: a line's # item_show: names an item of
// the story's own journey, # weather: and # tint: their own values.

const items = itemJourneys(
  [{ id: "ta_bookmark", cityId: "ta_city" }, { id: "tb_ticket", cityId: "tb_city" }, { id: "lost_item", cityId: "nowhere" }],
  [{ id: "ta_city", layer: "trip_a" }, { id: "tb_city", layer: "trip_b" }],
);

describe("the atmosphere tags of a story", () => {
  it("are read with their values, lines and knots, without comments", () => {
    const story = "=== knot ===\n# item_show: ta_bookmark # weather: petals\nしおり。\n# tint: off\n// # weather: snow\n# item_show\n-> END\n";
    expect(sceneEffectTagsOf(story)).toEqual([
      { key: "item_show", value: "ta_bookmark", line: 2, knot: "knot" },
      { key: "weather", value: "petals", line: 2, knot: "knot" },
      { key: "tint", value: "off", line: 4, knot: "knot" },
      { key: "item_show", value: "", line: 6, knot: "knot" },
    ]);
    // Other tags that start alike are not theirs.
    expect(sceneEffectTagsOf("# weatherman: x\n# tints: on\n")).toEqual([]);
  });

  it("let a story show its own journey's item, any weather and the tint switched off and on", () => {
    const story = "# item_show: ta_bookmark\nしおり。\n# weather: rain\n雨。\n# weather: stop\n# tint: off\n# tint: on\n夜。\n";
    expect(() => checkSceneEffectTags(story, "trip_a", items)).not.toThrow();
    for (const weather of ["dust", "colors", "petals"]) expect(() => checkSceneEffectTags(`# weather: ${weather}\n空。\n`, "trip_a", items)).not.toThrow();
  });

  it("stop an item_show without an item, an unknown item, another journey's item, and other weather and tint values", () => {
    expect(() => checkSceneEffectTags("# item_show\nしおり。\n", "trip_a", items)).toThrow("# item_show: without an item");
    expect(() => checkSceneEffectTags("# item_show:\nしおり。\n", "trip_a", items)).toThrow("# item_show: without an item");
    expect(() => checkSceneEffectTags("# item_show: nope\nしおり。\n", "trip_a", items)).toThrow("Unknown item in # item_show: nope");
    expect(() => checkSceneEffectTags("# item_show: tb_ticket\n切符。\n", "trip_a", items))
      .toThrow("1行目の # item_show: tb_ticket は、旅行編 trip_b の品物です");
    expect(() => checkSceneEffectTags("# item_show: lost_item\n品物。\n", "trip_a", items)).toThrow("is an item of no journey");
    expect(() => checkSceneEffectTags("# weather: snow\n雪。\n", "trip_a", items)).toThrow("Invalid weather tag: snow");
    expect(() => checkSceneEffectTags("# tint: night\n夜。\n", "trip_a", items)).toThrow("Invalid tint tag: night");
    expect(() => checkSceneEffectTags("# weather: rain # weather: stop\n雨。\n", "trip_a", items)).toThrow("Duplicate weather tag on line 1");
  });
});
