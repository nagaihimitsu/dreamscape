import { describe, expect, it } from "vitest";
import { placeDisplayName, sceneBackdropPhoto } from "./travel-labels";

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
