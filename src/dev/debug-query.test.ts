import { describe, expect, it } from "vitest";
import { clockText, debugQueryString, parseClockText, parseDebugQuery, settingsQuery, type DebugQuery, type DebugSettings } from "./debug-query";

const settings: DebugSettings = { cityId: "milano", scene: "date", id: "milano_brera_date_01", progress: "completed", ap: 9, affection: -3, trust: 2, spark: 0, roll: "negative" };

describe("Debug launch URLs", () => {
  it("opens the scene picker (場面の確認) for ?debug alone", () => {
    expect(parseDebugQuery("?debug")).toEqual({ kind: "panel" });
    expect(parseDebugQuery("?debug=1")).toEqual({ kind: "panel" });
    expect(parseDebugQuery("")).toEqual({ kind: "panel" });
  });

  it("writes every item in a fixed order and reads it back", () => {
    const url = debugQueryString(settingsQuery("real", settings));
    expect(url).toBe("?debug&city=milano&scene=date&target=milano_brera_date_01&progress=completed&ap=9&affection=-3&trust=2&spark=0&roll=negative");
    expect(parseDebugQuery(url)).toEqual({ kind: "launch", query: settingsQuery("real", settings) });
    const fixture = debugQueryString(settingsQuery("fixture", { ...settings, cityId: "test_city" }));
    expect(fixture.startsWith("?debug&data=fixture&city=test_city&")).toBe(true);
    expect(parseDebugQuery(fixture)).toEqual({ kind: "launch", query: settingsQuery("fixture", { ...settings, cityId: "test_city" }) });
    const map: DebugQuery = { dataMode: "real", cityId: "samarkand", scene: "map" };
    expect(debugQueryString(map)).toBe("?debug&city=samarkand&scene=map");
    expect(parseDebugQuery(debugQueryString(map))).toEqual({ kind: "launch", query: map });
  });

  it("writes and reads a date's items left out (without) and the episode it opens before (before), for a date only", () => {
    const without = { ...settings, without: ["gt_delhi_rain_attar", "other_item"], before: "gt_delhi_main_humayun_tomb" };
    const url = debugQueryString(settingsQuery("real", without));
    expect(url.endsWith("&roll=negative&without=gt_delhi_rain_attar%2Cother_item&before=gt_delhi_main_humayun_tomb")).toBe(true);
    expect(parseDebugQuery(url)).toEqual({ kind: "launch", query: settingsQuery("real", without) });
    expect(debugQueryString(settingsQuery("real", { ...settings, without: [] }))).not.toMatch(/without|before/u);
    expect(parseDebugQuery("?debug&scene=battle&without=gt_delhi_rain_attar")).toEqual({ kind: "error", message: "without と before は scene=date（デート）で使います。" });
    expect(parseDebugQuery("?debug&scene=tourism&before=gt_delhi_main_humayun_tomb")).toEqual({ kind: "error", message: "without と before は scene=date（デート）で使います。" });
    expect(parseDebugQuery("?debug&scene=date&without=Rain")).toEqual({ kind: "error", message: "「without=Rain」はIDの形ではありません（品物のIDを , で区切ります）。" });
  });

  it("writes and reads free time's day and time (scene=free only, the time as 19:00) and the flags of any scene (2026-11-15)", () => {
    const free: DebugSettings = { ...settings, scene: "free", id: "p_hotel", day: 2, time: 19 * 60, flags: ["milano_tino_needs_pick", "other_flag"] };
    const url = debugQueryString(settingsQuery("real", free));
    expect(url.endsWith("&roll=negative&day=2&time=19:00&flags=milano_tino_needs_pick%2Cother_flag")).toBe(true);
    expect(parseDebugQuery(url)).toEqual({ kind: "launch", query: settingsQuery("real", free) });
    expect(parseDebugQuery("?debug&scene=free&time=9:05")).toEqual({ kind: "launch", query: { dataMode: "real", scene: "free", time: 545 } });
    // Another scene keeps its flags and leaves out free time's clock; no flags, no item.
    const date = debugQueryString(settingsQuery("real", { ...free, scene: "date", id: "milano_brera_date_01" }));
    expect(date).toContain("&flags=milano_tino_needs_pick%2Cother_flag");
    expect(date).not.toMatch(/day=|time=/u);
    expect(debugQueryString(settingsQuery("real", { ...settings, flags: [] }))).not.toContain("flags");
  });

  it("writes and reads 恋の段階 (stage) after the relationship values, for any scene; left out, the progress's own (2026-11-16)", () => {
    const staged: DebugSettings = { ...settings, stage: 2 };
    const url = debugQueryString(settingsQuery("real", staged));
    expect(url).toBe("?debug&city=milano&scene=date&target=milano_brera_date_01&progress=completed&ap=9&affection=-3&trust=2&spark=0&stage=2&roll=negative");
    expect(parseDebugQuery(url)).toEqual({ kind: "launch", query: settingsQuery("real", staged) });
    expect(parseDebugQuery("?debug&city=delhi&scene=free&time=19:00&stage=4"))
      .toEqual({ kind: "launch", query: { dataMode: "real", cityId: "delhi", scene: "free", time: 1140, stage: 4 } });
    expect(parseDebugQuery("?debug&scene=battle&stage=1")).toEqual({ kind: "launch", query: { dataMode: "real", scene: "battle", stage: 1 } });
    expect(debugQueryString(settingsQuery("real", settings))).not.toContain("stage");
  });

  it("reads and writes a clock as HH:MM", () => {
    expect([clockText(540), clockText(1140), clockText(1260)]).toEqual(["09:00", "19:00", "21:00"]);
    expect([parseClockText("19:00"), parseClockText("9:30"), parseClockText("24:00"), parseClockText("19:60"), parseClockText("1900"), parseClockText("")])
      .toEqual([1140, 570, null, null, null, null]);
  });

  it("leaves omitted items to the scene picker's defaults and ignores the order", () => {
    expect(parseDebugQuery("?scene=battle&debug&city=delhi")).toEqual({ kind: "launch", query: { dataMode: "real", cityId: "delhi", scene: "battle" } });
    expect(parseDebugQuery("?debug&scene=epilogue")).toEqual({ kind: "launch", query: { dataMode: "real", scene: "epilogue" } });
    // A setting without a target (a city without that scene) leaves the target out.
    expect(debugQueryString(settingsQuery("real", { ...settings, id: "" }))).not.toContain("target");
  });

  it.each([
    ["?debug&city=milano", "場面（scene）がありません。"],
    ["?debug&scene=battle&targt=x", "URLの項目「targt」は使えません。使える項目: data, city, scene, target, progress, ap, affection, trust, spark, stage, roll, from, prep"],
    ["?debug&scene=battle&scene=date", "URLの項目「scene」が2回以上あります。"],
    ["?debug&scene=battle&city=", "URLの項目「city」に値がありません。"],
    ["?debug&scene=fight", "「scene=fight」は使えません。scene には tourism / battle / encounter / date / epilogue / occasion / tour / free / map のどれかを書きます。"],
    ["?debug&scene=free&time=8:59", "「time=8:59」は使えません。time には 09:00〜21:00 の時刻を 19:00 のように書きます。"],
    ["?debug&scene=free&time=21:01", "「time=21:01」は使えません。"],
    ["?debug&scene=free&time=night", "「time=night」は使えません。"],
    ["?debug&scene=free&day=0", "「day=0」は使えません。day には 1〜30 の整数（滞在の何日目か）を書きます。"],
    ["?debug&scene=free&day=31", "「day=31」は使えません。"],
    ["?debug&scene=date&time=19:00", "day と time は scene=free（街歩き）で使います。"],
    ["?debug&scene=battle&day=2", "day と time は scene=free（街歩き）で使います。"],
    ["?debug&scene=free&flags=Night", "「flags=Night」はIDの形ではありません（フラグのIDを , で区切ります）。"],
    ["?debug&city=samarkand&scene=map&flags=a_flag", "flags は scene=map（地図・交通の確認）では使えません。"],
    ["?debug&scene=battle&city=Milano", "「city=Milano」はIDの形ではありません"],
    ["?debug&scene=battle&target=a%20b", "「target=a b」はIDの形ではありません"],
    ["?debug&scene=battle&ap=13", "「ap=13」は使えません。ap には 0〜12 の整数を書きます。"],
    ["?debug&scene=battle&ap=1.5", "「ap=1.5」は使えません。"],
    ["?debug&scene=battle&affection=-21", "「affection=-21」は使えません。affection には -20〜20 の整数を書きます。"],
    ["?debug&scene=battle&trust=many", "「trust=many」は使えません。"],
    ["?debug&scene=free&stage=0", "「stage=0」は使えません。stage には恋の段階 1〜4 の整数を書きます。"],
    ["?debug&scene=free&stage=5", "「stage=5」は使えません。"],
    ["?debug&scene=free&stage=2.0", "「stage=2.0」は使えません。"],
    ["?debug&scene=free&stage=two", "「stage=two」は使えません。"],
    ["?debug&city=samarkand&scene=map&stage=2", "stage は scene=map（地図・交通の確認）では使えません。"],
    ["?debug&scene=date&roll=maybe", "「roll=maybe」は使えません。roll には positive / negative のどれかを書きます。"],
    ["?debug&scene=battle&progress=done", "「progress=done」は使えません。progress には completed / initial のどれかを書きます。"],
    ["?debug&scene=battle&data=mock", "「data=mock」は使えません。data には real / fixture のどれかを書きます。"],
  ])("rejects %s with a message", (search, message) => {
    const parsed = parseDebugQuery(search);
    expect(parsed.kind).toBe("error");
    expect(parsed.kind === "error" && parsed.message).toContain(message);
  });
});
