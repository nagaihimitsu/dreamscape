import { describe, expect, it } from "vitest";
import { hudPlaceName, placeDisplayName, sceneBackdropPhoto } from "./travel-labels";

describe("placeDisplayName", () => {
  const game = { travel: { hotelPlaceId: "p_hotel" } };

  it("calls the hotel 「滞在先のホテル」, without the data name's mark of a fictional one", () => {
    expect(placeDisplayName(game, { id: "p_hotel", nameJa: "駅前のホテル（架空）" })).toBe("滞在先のホテル");
    expect(placeDisplayName(game, { id: "p_hotel", nameJa: "駅前のホテル" })).toBe("滞在先のホテル");
  });

  it("uses the data name for every other place and 「不明」 for a missing one", () => {
    expect(placeDisplayName(game, { id: "p_duomo", nameJa: "ドゥオモ広場" })).toBe("ドゥオモ広場");
    expect(placeDisplayName(game, { id: "p_other", nameJa: "架空の広場" })).toBe("架空の広場");
    expect(placeDisplayName(game, undefined)).toBe("不明");
  });
});

describe("sceneBackdropPhoto", () => {
  const backgrounds = {
    bg_station: { nameJa: "駅", imageAssetId: "img_station" },
    bg_drawn: { nameJa: "描いた背景" },
    bg_missing: { nameJa: "写真がない", imageAssetId: "img_none" },
  };
  const assets = [{ id: "img_station", path: "station.webp" }];

  it("names a scene's background and credits its photo when the background is a registered photo", () => {
    expect(sceneBackdropPhoto("bg_station", backgrounds, assets)).toEqual({ nameJa: "駅", asset: assets[0] });
  });

  it("leaves the label to the place when the background has no registered photo", () => {
    expect(sceneBackdropPhoto("bg_drawn", backgrounds, assets)).toBeUndefined();
    expect(sceneBackdropPhoto("bg_missing", backgrounds, assets)).toBeUndefined();
    expect(sceneBackdropPhoto("bg_unknown", backgrounds, assets)).toBeUndefined();
  });
});

describe("hudPlaceName", () => {
  const cities = [
    { hotelPlaceId: "d_hotel", places: [{ id: "d_hotel", nameJa: "デリーの宿（架空）" }, { id: "d_market", nameJa: "月の市場" }] },
    { hotelPlaceId: "a_hotel", places: [{ id: "a_hotel", nameJa: "アーグラの宿（架空）" }, { id: "a_garden", nameJa: "川向こうの庭" }] },
  ];
  const here = "赤い城";

  it("names the party's place while the scene's background says nothing of where it is, or no scene shows", () => {
    expect(hudPlaceName(here, {}, cities)).toBe("赤い城");
    expect(hudPlaceName(here, { backdrop: {} }, cities)).toBe("赤い城");
  });

  it("names where the shown background is: a place off the map by its name, a map place as the screens name it", () => {
    expect(hudPlaceName("滞在先のホテル", { backdrop: { placeJa: "中央駅" } }, cities)).toBe("中央駅");
    expect(hudPlaceName(here, { backdrop: { placeId: "d_market" } }, cities)).toBe("月の市場");
    // The hotel is 「滞在先のホテル」, also another city's (its own city's hotel), never its data name.
    expect(hudPlaceName(here, { backdrop: { placeId: "d_hotel" } }, cities)).toBe("滞在先のホテル");
    expect(hudPlaceName(here, { backdrop: { placeId: "a_hotel" } }, cities)).toBe("滞在先のホテル");
    expect(hudPlaceName(here, { backdrop: { placeId: "a_garden" } }, cities)).toBe("川向こうの庭");
  });

  it("keeps the party's place for a placeId no map has", () => {
    expect(hudPlaceName(here, { backdrop: { placeId: "nowhere" } }, cities)).toBe("赤い城");
  });

  it("names a tour's leg in its car, whatever the background says", () => {
    expect(hudPlaceName(here, { legJa: "車で川向こうへ", backdrop: { placeJa: "中央駅" } }, cities)).toBe("車で川向こうへ");
    expect(hudPlaceName(here, { legJa: "車で川向こうへ", backdrop: { placeId: "d_hotel" } }, cities)).toBe("車で川向こうへ");
  });
});
