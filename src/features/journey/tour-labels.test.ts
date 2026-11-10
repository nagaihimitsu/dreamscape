import { describe, expect, it } from "vitest";
import { getTour } from "../../content";
import { tourDuration, tourItinerary, tourSellerBadge } from "./tour-labels";

describe("the tour card's words (tour stage 2a)", () => {
  it("writes Agra's Fatehpur Sikri tour as the itinerary from 9:00, the visit with its admission included", () => {
    expect(tourItinerary(getTour("gt_agra_tour_fatehpur_sikri")!)).toEqual({
      lines: ["9:00 車でファテープル・シークリーへ（約60分）", "10:00 ファテープル・シークリーを巡る（約3時間・入場料込み）", "13:00 車で宿へ（約60分）"],
      end: "14:00ごろ解散",
    });
  });

  it("says durations in minutes below two hours, then in hours, and names the seller by channel", () => {
    expect([40, 60, 90, 120, 150, 180].map(tourDuration)).toEqual(["約40分", "約60分", "約90分", "約2時間", "約2時間30分", "約3時間"]);
    expect(tourSellerBadge({ channel: "web", sellerJa: "ツアー予約サイト" })).toBe("Web予約");
    expect(tourSellerBadge({ channel: "desk", sellerJa: "宿のフロント" })).toBe("窓口：宿のフロント");
    expect(tourSellerBadge({ channel: "introduced", sellerJa: "知人" })).toBe("紹介：知人");
  });
});
