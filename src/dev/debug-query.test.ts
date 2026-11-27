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

  it("writes and reads the day and time (the time as 19:00) and the flags of any scene (2026-11-15; the clock beyond free time 2026-11-16)", () => {
    const free: DebugSettings = { ...settings, scene: "free", id: "p_hotel", day: 2, time: 19 * 60, flags: ["milano_tino_needs_pick", "other_flag"] };
    const url = debugQueryString(settingsQuery("real", free));
    expect(url.endsWith("&roll=negative&day=2&time=19:00&flags=milano_tino_needs_pick%2Cother_flag")).toBe(true);
    expect(parseDebugQuery(url)).toEqual({ kind: "launch", query: settingsQuery("real", free) });
    expect(parseDebugQuery("?debug&scene=free&time=9:05")).toEqual({ kind: "launch", query: { dataMode: "real", scene: "free", time: 545 } });
    // Another scene keeps its flags and its clock (a date's night branch); no flags, no item.
    const date = debugQueryString(settingsQuery("real", { ...free, scene: "date", id: "milano_brera_date_01" }));
    expect(date.endsWith("&roll=negative&day=2&time=19:00&flags=milano_tino_needs_pick%2Cother_flag")).toBe(true);
    expect(parseDebugQuery("?debug&city=delhi&scene=date&target=gt_delhi_date_chandni_chowk&time=19:00"))
      .toEqual({ kind: "launch", query: { dataMode: "real", cityId: "delhi", scene: "date", target: "gt_delhi_date_chandni_chowk", time: 1140 } });
    expect(parseDebugQuery("?debug&scene=battle&day=2")).toEqual({ kind: "launch", query: { dataMode: "real", scene: "battle", day: 2 } });
    expect(debugQueryString(settingsQuery("real", { ...settings, flags: [] }))).not.toContain("flags");
  });

  it("writes and reads the people met after the clues (2026-11-27), a quiz's own partner too, never for the map check", () => {
    const free: DebugSettings = { ...settings, scene: "free", id: "", clues: ["smp_obs_a"], met: ["gt_monu", "quiz:gt_delhi_quiz"] };
    const url = debugQueryString(settingsQuery("real", free));
    expect(url.endsWith("&clues=smp_obs_a&met=gt_monu%2Cquiz:gt_delhi_quiz")).toBe(true);
    expect(parseDebugQuery("?debug&city=delhi&scene=free&met=gt_monu,quiz:gt_delhi_quiz"))
      .toEqual({ kind: "launch", query: { dataMode: "real", cityId: "delhi", scene: "free", met: ["gt_monu", "quiz:gt_delhi_quiz"] } });
    expect(parseDebugQuery("?debug&city=delhi&scene=free&met=Monu")).toMatchObject({ kind: "error", message: expect.stringMatching(/出会った人/u) });
    expect(parseDebugQuery("?debug&city=delhi&scene=map&met=gt_monu")).toMatchObject({ kind: "error" });
  });

  it("writes and reads the clues heard of any scene after the flags (2026-11-18), never for the map check", () => {
    const epilogue: DebugSettings = { ...settings, scene: "epilogue", id: "smp_mihon_finale", flags: ["a_flag"], clues: ["smp_obs_a", "smp_obs_b"] };
    const url = debugQueryString(settingsQuery("real", epilogue));
    expect(url.endsWith("&roll=negative&flags=a_flag&clues=smp_obs_a%2Csmp_obs_b")).toBe(true);
    expect(parseDebugQuery(url)).toEqual({ kind: "launch", query: settingsQuery("real", epilogue) });
    expect(parseDebugQuery("?debug&city=delhi&scene=epilogue&clues=gt_delhi_clue_dubey_announcement"))
      .toEqual({ kind: "launch", query: { dataMode: "real", cityId: "delhi", scene: "epilogue", clues: ["gt_delhi_clue_dubey_announcement"] } });
    expect(debugQueryString(settingsQuery("real", { ...settings, clues: [] }))).not.toContain("clues");
    expect(parseDebugQuery("?debug&scene=free&clues=Bell")).toEqual({ kind: "error", message: "「clues=Bell」はIDの形ではありません（手がかりのIDを , で区切ります）。" });
    expect(parseDebugQuery("?debug&city=samarkand&scene=map&clues=a_clue"))
      .toEqual({ kind: "error", message: "clues は scene=map（地図・交通の確認）では使えません。物語のある場面で使います。" });
  });

  it("reads a hotel's scene (scene=hotel) with its night's clock and flags (2026-11-16)", () => {
    const url = "?debug&city=delhi&scene=hotel&target=gt_delhi_hotel_sick_morning&time=19:00&flags=gt_delhi_player_sick";
    expect(parseDebugQuery(url)).toEqual({ kind: "launch", query: { dataMode: "real", cityId: "delhi", scene: "hotel",
      target: "gt_delhi_hotel_sick_morning", time: 1140, flags: ["gt_delhi_player_sick"] } });
    const hotel: DebugSettings = { ...settings, cityId: "delhi", scene: "hotel", id: "gt_delhi_hotel_sick_morning", time: 1140 };
    expect(parseDebugQuery(debugQueryString(settingsQuery("real", hotel)))).toEqual({ kind: "launch", query: settingsQuery("real", hotel) });
  });

  it("writes and reads 撮影の形 (shot=1) last, for any scene but the map check; never from the settings (2026-11-16)", () => {
    const query: DebugQuery = { ...settingsQuery("real", settings), shot: true };
    const url = debugQueryString(query);
    expect(url).toBe("?debug&city=milano&scene=date&target=milano_brera_date_01&progress=completed&ap=9&affection=-3&trust=2&spark=0&roll=negative&shot=1");
    expect(parseDebugQuery(url)).toEqual({ kind: "launch", query });
    expect(parseDebugQuery("?debug&shot=1&scene=free")).toEqual({ kind: "launch", query: { dataMode: "real", scene: "free", shot: true } });
    expect(debugQueryString(settingsQuery("real", settings))).not.toContain("shot");
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
    ["?debug&scene=fight", "「scene=fight」は使えません。scene には tourism / battle / encounter / date / epilogue / occasion / tour / free / hotel / map のどれかを書きます。"],
    ["?debug&scene=free&time=8:59", "「time=8:59」は使えません。time には 09:00〜21:00 の時刻を 19:00 のように書きます。"],
    ["?debug&scene=free&time=21:01", "「time=21:01」は使えません。"],
    ["?debug&scene=free&time=night", "「time=night」は使えません。"],
    ["?debug&scene=free&day=0", "「day=0」は使えません。day には 1〜30 の整数（滞在の何日目か）を書きます。"],
    ["?debug&scene=free&day=31", "「day=31」は使えません。"],
    ["?debug&scene=date&time=19:30:00", "「time=19:30:00」は使えません。"],
    ["?debug&city=samarkand&scene=map&time=19:00", "time は scene=map（地図・交通の確認）では使えません。物語のある場面で使います。"],
    ["?debug&city=samarkand&scene=map&day=2&time=19:00", "day と time は scene=map（地図・交通の確認）では使えません。"],
    ["?debug&scene=date&shot=0", "「shot=0」は使えません。shot には 1 を書きます（撮影の形：Debugの帯や印を隠して開きます）。"],
    ["?debug&scene=date&shot=true", "「shot=true」は使えません。"],
    ["?debug&scene=date&shot", "URLの項目「shot」に値がありません。"],
    ["?debug&city=samarkand&scene=map&shot=1", "shot は scene=map（地図・交通の確認）では使えません。"],
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
