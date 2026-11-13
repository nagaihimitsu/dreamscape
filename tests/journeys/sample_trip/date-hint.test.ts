import { beforeAll, describe, expect, it } from "vitest";
import { dates } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { hintedLockedDates, isEventVisible } from "../../../src/domain/date-rules";
import { cityStart } from "../../../src/dev/scenario-builders";

// A date's # hint: (2026-11-13) on the sample journey (fictional): the clock tower square's date waits for the tower's
// episode (# when: episodes mihon >= 1) and shows its locked card with the writer's words until then.

const DATE = "smp_mihon_date_tower_square";

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the sample date's hint", () => {
  it("goes from the knot's head into the date's catalog entry", () => {
    expect(dates.find((date) => date.id === DATE)?.hintJa).toBe("時計塔の番人と話したあとで");
  });

  it("shows a locked card while the date's when does not hold, and none once it is open or played", () => {
    const start = cityStart("mihon");
    expect(isEventVisible(start, DATE)).toBe(false);
    expect(hintedLockedDates(start)).toEqual([{ dateId: DATE, hintJa: "時計塔の番人と話したあとで" }]);
    const open = { ...start, completedEpisodeIds: [...start.completedEpisodeIds, "smp_mihon_main_clock_tower"] };
    expect(isEventVisible(open, DATE)).toBe(true);
    expect(hintedLockedDates(open)).toEqual([]);
    expect(hintedLockedDates({ ...start, playedDateIds: [DATE] })).toEqual([]);
  });

  it("never reads a relationship value", () => {
    const start = cityStart("mihon");
    for (const values of [{ affection: 0, trust: 0, spark: 0 }, { affection: 99, trust: 99, spark: 99, romanceStage: 4 as const }])
      expect(hintedLockedDates({ ...start, ...values })).toEqual(hintedLockedDates(start));
  });
});
