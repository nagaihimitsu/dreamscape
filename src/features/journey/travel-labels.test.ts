import { describe, expect, it } from "vitest";
import { placeDisplayName } from "./travel-labels";

describe("placeDisplayName", () => {
  const game = { travel: { hotelPlaceId: "p_hotel" } };

  it("calls the hotel 「滞在先」 and keeps the mark of a fictional one", () => {
    expect(placeDisplayName(game, { id: "p_hotel", nameJa: "駅前のホテル（架空）" })).toBe("滞在先（架空）");
    expect(placeDisplayName(game, { id: "p_hotel", nameJa: "駅前のホテル" })).toBe("滞在先");
  });

  it("uses the data name for every other place and 「不明」 for a missing one", () => {
    expect(placeDisplayName(game, { id: "p_duomo", nameJa: "ドゥオモ広場" })).toBe("ドゥオモ広場");
    expect(placeDisplayName(game, { id: "p_other", nameJa: "架空の広場" })).toBe("架空の広場");
    expect(placeDisplayName(game, undefined)).toBe("不明");
  });
});
