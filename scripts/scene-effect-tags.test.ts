import { describe, expect, it } from "vitest";
import { catalogSceneItems, checkSceneEffectTags, sceneEffectTagsOf, sceneItems } from "./scene-effect-tags";

// The scene's atmosphere tags (2026-11-13), read statically from the Ink source: a line's # item_show: and # item_out:
// (2026-11-15) name an item of the story's own journey, # item_out:'s number one of its lines, # weather: and # tint:
// their own values.

const items = sceneItems(
  [{ id: "ta_bookmark", cityId: "ta_city" }, { id: "tb_ticket", cityId: "tb_city" }, { id: "lost_item", cityId: "nowhere" },
    // Three lines written on it, the third shown only after an epilogue (conditional lines count too).
    { id: "ta_memo", cityId: "ta_city", linesJa: ["一行目。", "二行目。", { textJa: "三行目。", when: { epilogueViewed: "ta_city" } }] }],
  [{ id: "ta_city", layer: "trip_a" }, { id: "tb_city", layer: "trip_b" }],
);
const check = (story: string) => () => checkSceneEffectTags(story, "trip_a", items);

describe("the atmosphere tags of a story", () => {
  it("are read with their values, lines and knots, without comments", () => {
    const story = "=== knot ===\n# item_show: ta_bookmark # weather: petals\nしおり。\n# tint: off\n// # weather: snow\n# item_show\n# item_out: ta_memo 2\n-> END\n";
    expect(sceneEffectTagsOf(story)).toEqual([
      { key: "item_show", value: "ta_bookmark", line: 2, knot: "knot" },
      { key: "weather", value: "petals", line: 2, knot: "knot" },
      { key: "tint", value: "off", line: 4, knot: "knot" },
      { key: "item_show", value: "", line: 6, knot: "knot" },
      { key: "item_out", value: "ta_memo 2", line: 7, knot: "knot" },
    ]);
    // Other tags that start alike are not theirs.
    expect(sceneEffectTagsOf("# weatherman: x\n# tints: on\n# item_outer: x\n")).toEqual([]);
  });

  it("know each item's journey and how many lines are written on it", () => {
    expect(items.get("ta_memo")).toEqual({ journey: "trip_a", lines: 3 });
    expect(items.get("ta_bookmark")).toEqual({ journey: "trip_a", lines: 0 });
    expect(items.get("lost_item")).toEqual({ journey: undefined, lines: 0 });
    // From the merged catalog as loaded: an entry without an ID or a city is left out, lines that are no list count none.
    const catalog = { items: [{ id: "ta_memo", cityId: "ta_city", linesJa: ["a", "b"] }, { id: "ta_card", cityId: "ta_city", linesJa: "a" }, { cityId: "ta_city" }] };
    const sources = { catalogs: { "encounters/catalog.json": { value: catalog } }, cities: [{ id: "ta_city", layer: "trip_a" }] };
    const loaded = catalogSceneItems(sources as unknown as Parameters<typeof catalogSceneItems>[0]);
    expect([...loaded]).toEqual([["ta_memo", { journey: "trip_a", lines: 2 }], ["ta_card", { journey: "trip_a", lines: 0 }]]);
  });

  it("let a story show its own journey's item, take one out with or without a line, any weather and the tint switched off and on", () => {
    expect(check("# item_show: ta_bookmark\nしおり。\n# weather: rain\n雨。\n# weather: stop\n# tint: off\n# tint: on\n夜。\n")).not.toThrow();
    for (const weather of ["dust", "colors", "petals"]) expect(check(`# weather: ${weather}\n空。\n`)).not.toThrow();
    // The same item on the next lines, its highlight moving; the conditional third line; an item with no lines, whole.
    expect(check("# item_out: ta_memo\nメモを出した。\n# item_out: ta_memo 1\n一行目。\n# item_out: ta_memo 3\n三行目。\n")).not.toThrow();
    expect(check("# item_out: ta_bookmark\nしおりを出した。\n")).not.toThrow();
    // An item card after one of the other kind, on the next line: one card a line.
    expect(check("# item_show: ta_bookmark\nしおり。\n# item_out: ta_memo 2\nメモ。\n")).not.toThrow();
    expect(check("しおり。 # item_out: ta_bookmark\n* [渡す] # item_show: ta_bookmark\n  -> END\n")).not.toThrow();
  });

  it("stop an item_show without an item, an unknown item, another journey's item, and other weather and tint values", () => {
    expect(check("# item_show\nしおり。\n")).toThrow("# item_show: without an item");
    expect(check("# item_show:\nしおり。\n")).toThrow("# item_show: without an item");
    expect(check("# item_show: nope\nしおり。\n")).toThrow("Unknown item in # item_show: nope");
    expect(check("# item_show: tb_ticket\n切符。\n")).toThrow("1行目の # item_show: tb_ticket は、旅行編 trip_b の品物です");
    expect(check("# item_show: lost_item\n品物。\n")).toThrow("is an item of no journey");
    expect(check("# weather: snow\n雪。\n")).toThrow("Invalid weather tag: snow");
    expect(check("# tint: night\n夜。\n")).toThrow("Invalid tint tag: night");
    expect(check("# weather: rain # weather: stop\n雨。\n")).toThrow("Duplicate weather tag on line 1");
  });

  it("stop an item_out without an item, with extra words, an unknown item, another journey's item, and a line number it cannot show", () => {
    expect(check("# item_out\nメモ。\n")).toThrow("品物の ID がありません：1行目の # item_out。# item_out: <品物のID> か # item_out: <品物のID> <行の番号>");
    expect(check("# item_out:\nメモ。\n")).toThrow("# item_out: without an item");
    expect(check("# item_out: ta_memo 2 3\nメモ。\n")).toThrow("# item_out: に書けるのは、品物の ID と行の番号だけです：1行目の # item_out: ta_memo 2 3");
    expect(check("# item_out: ta_memo 二行目 を読む\nメモ。\n")).toThrow("Extra words in # item_out: を読む");
    expect(check("# item_out: nope 1\nメモ。\n")).toThrow("Unknown item in # item_out: nope");
    expect(check("# item_out: Ta_Memo\nメモ。\n")).toThrow("Unknown item in # item_out: Ta_Memo");
    expect(check("# item_out: tb_ticket\n切符。\n")).toThrow("1行目の # item_out: tb_ticket は、旅行編 trip_b の品物です");
    expect(check("# item_out: lost_item\n品物。\n")).toThrow("Item of another journey in # item_out: lost_item is an item of no journey");
    // A line number is a whole number from 1, written plainly.
    for (const number of ["0", "-1", "1.5", "two", "02", "+1"])
      expect(check(`# item_out: ta_memo ${number}\nメモ。\n`), number).toThrow(`Invalid line number in # item_out: ${number}`);
    // Past the item's lines (the conditional third counts): its count; an item with no lines has none to number.
    expect(check("=== memo ===\n# item_out: ta_memo 4\nメモ。\n")).toThrow(
      "品物にその行がありません：knot memo の2行目の # item_out: ta_memo 4。ta_memo に書かれた行（linesJa。条件つきの行も数えます）は 3 行です");
    expect(check("# item_out: ta_memo 4\nメモ。\n")).toThrow("Line 4 of # item_out: ta_memo is past its 3 lines");
    expect(check("# item_out: ta_bookmark 1\nしおり。\n")).toThrow("# item_out: ta_bookmark has no lines to number");
  });

  it("stop two item_out tags and an item_show with an item_out on one line, wherever its tags are written before it", () => {
    expect(check("# item_out: ta_memo # item_out: ta_bookmark\nメモ。\n")).toThrow("Duplicate item_out tag on line 1");
    expect(check("# item_out: ta_memo\n# item_out: ta_memo 1\nメモ。\n")).toThrow("Duplicate item_out tag on line 3");
    expect(check("# item_show: ta_bookmark # item_out: ta_memo\nメモ。\n")).toThrow("# item_show: and # item_out: on one line, 2");
    expect(check("# speaker: narrator\n# item_show: ta_bookmark\n\n# item_out: ta_memo 1\nメモ。\n")).toThrow(
      "1つの行に # item_show: と # item_out: の両方があります：4行目の # item_out: ta_memo 1");
    expect(check("メモ。 # item_out: ta_memo # item_show: ta_bookmark\n")).toThrow("# item_show: and # item_out: on one line, 1");
    expect(check("* [見る] # item_out: ta_memo # item_show: ta_bookmark\n  -> END\n")).toThrow("# item_show: and # item_out: on one line, 1");
  });
});
