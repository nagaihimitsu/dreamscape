// The save's times of what was lived (lived-times.ts): recorded as an episode is completed, refused when they name nothing lived.
import { describe, expect, it } from "vitest";
import { cityStart, finishEpisode } from "../dev/scenario-builders";
import { validateGameState } from "./game";

describe("the save's lived times", () => {
  it("times an episode as completed, and refuses a time of nothing lived", () => {
    const state = finishEpisode(cityStart("delhi"), "gt_delhi_main_jama_masjid");
    expect(state.livedTimes?.at(-1)).toEqual({ id: "gt_delhi_main_jama_masjid", day: state.travel.day, minute: expect.any(Number) });
    expect(validateGameState(state)).toEqual(state);
    expect(() => validateGameState({ ...state, livedTimes: [{ id: "gt_agra_main_taj_mahal", day: 1, minute: 600 }] }))
      .toThrow("旅の記録の時刻の参照先が見つかりません。");
  });
});
