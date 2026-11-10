import { describe, expect, it } from "vitest";
import { debugQueryString, parseDebugQuery, settingsQuery, type DebugQuery, type DebugSettings } from "./debug-query";

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

  it("leaves omitted items to the scene picker's defaults and ignores the order", () => {
    expect(parseDebugQuery("?scene=battle&debug&city=delhi")).toEqual({ kind: "launch", query: { dataMode: "real", cityId: "delhi", scene: "battle" } });
    expect(parseDebugQuery("?debug&scene=epilogue")).toEqual({ kind: "launch", query: { dataMode: "real", scene: "epilogue" } });
    // A setting without a target (a city without that scene) leaves the target out.
    expect(debugQueryString(settingsQuery("real", { ...settings, id: "" }))).not.toContain("target");
  });

  it.each([
    ["?debug&city=milano", "場面（scene）がありません。"],
    ["?debug&scene=battle&targt=x", "URLの項目「targt」は使えません。使える項目: data, city, scene, target, progress, ap, affection, trust, spark, roll, from, prep"],
    ["?debug&scene=battle&scene=date", "URLの項目「scene」が2回以上あります。"],
    ["?debug&scene=battle&city=", "URLの項目「city」に値がありません。"],
    ["?debug&scene=fight", "「scene=fight」は使えません。scene には tourism / battle / encounter / date / epilogue / occasion / tour / map のどれかを書きます。"],
    ["?debug&scene=battle&city=Milano", "「city=Milano」はIDの形ではありません"],
    ["?debug&scene=battle&target=a%20b", "「target=a b」はIDの形ではありません"],
    ["?debug&scene=battle&ap=13", "「ap=13」は使えません。ap には 0〜12 の整数を書きます。"],
    ["?debug&scene=battle&ap=1.5", "「ap=1.5」は使えません。"],
    ["?debug&scene=battle&affection=-21", "「affection=-21」は使えません。affection には -20〜20 の整数を書きます。"],
    ["?debug&scene=battle&trust=many", "「trust=many」は使えません。"],
    ["?debug&scene=date&roll=maybe", "「roll=maybe」は使えません。roll には positive / negative のどれかを書きます。"],
    ["?debug&scene=battle&progress=done", "「progress=done」は使えません。progress には completed / initial のどれかを書きます。"],
    ["?debug&scene=battle&data=mock", "「data=mock」は使えません。data には real / fixture のどれかを書きます。"],
  ])("rejects %s with a message", (search, message) => {
    const parsed = parseDebugQuery(search);
    expect(parsed.kind).toBe("error");
    expect(parsed.kind === "error" && parsed.message).toContain(message);
  });
});
