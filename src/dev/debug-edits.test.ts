import { describe, expect, it } from "vitest";
import { storyState } from "../content";
import { validateGameState } from "../domain/game";
import { DAY_END, DAY_START } from "../domain/travel";
import { getTravelEventAvailability, getTravelSleepOptions, sleepAtHotel } from "../domain/travel-game";
import { getDayEnd } from "../domain/day-end";
import { getDateAvailability, isEventVisible } from "../domain/date-rules";
import { evaluateProgression } from "../domain/game";
import { debugTimeRange, type DebugRomanceStage } from "./debug-query";
import {
  debugEditRefusal, debugFlagGroups, debugFlagIds, setDebugFlag, setDebugStage, withDebugClock, withDebugFlags, withDebugStage,
} from "./debug-edits";
import { createDebugState, defaultDebugSettings, resolveDebugLaunch, type DebugSettings } from "./debug-state";
import { atPlace, cityStart, finishEpisode } from "./scenario-builders";

// Debug's flags and free time's clock (2026-11-15 user request 「〜〜のフラグを得たことにする」「自由時間を指定する」).
const free = (cityId: string, input: Partial<DebugSettings> = {}): DebugSettings =>
  ({ ...defaultDebugSettings(cityId), scene: "free", id: input.id ?? "", ...input });
const milano = (input: Partial<DebugSettings> = {}) => createDebugState(free("milano", { id: "p_hotel", ...input }));

describe("Debug's flags", () => {
  it("offers a journey's flags by the city whose scenes set or read them, in the journey's order", () => {
    const india = debugFlagGroups("agra");
    expect(india.map((group) => group.cityId)).toEqual(["delhi", "agra", "jaipur"]);
    expect(india.map((group) => group.nameJa)).toEqual(["デリー", "アーグラ", "ジャイプール"]);
    expect(india.find((group) => group.cityId === "delhi")!.flags.map((flag) => flag.id)).toContain("gt_delhi_golgappa_sick");
    expect(india.find((group) => group.cityId === "delhi")!.flags.find((flag) => flag.id === "gt_delhi_golgappa_sick")?.noteJa).toMatch(/ゴルガッパ/u);
    for (const group of india) expect(group.flags.every((flag) => flag.id.startsWith(`gt_${group.cityId}_`)), String(group.cityId)).toBe(true);
    expect(debugFlagIds("delhi")).toEqual(debugFlagIds("jaipur"));
    expect(debugFlagGroups("milano")).toEqual([{ cityId: "milano", nameJa: "ミラノ", flags: [expect.objectContaining({ id: "milano_tino_needs_pick" })] }]);
    // Every declared flag is offered in exactly one journey while each is named by a scene.
    const offered = [...debugFlagIds("milano"), ...debugFlagIds("delhi")];
    expect(offered.sort()).toEqual(storyState.flags.map((flag) => flag.id).filter((id) => !id.startsWith("smp_")).sort());
  });

  it("offers a flag no scene names yet in every journey, last", () => {
    storyState.flags.push({ id: "debug_test_unnamed_flag" });
    try {
      for (const cityId of ["milano", "jaipur"])
        expect(debugFlagGroups(cityId).at(-1)).toEqual({ cityId: null, nameJa: "どの場面も使っていないフラグ", flags: [{ id: "debug_test_unnamed_flag" }] });
    } finally {
      storyState.flags.pop();
    }
  });

  it("adds flags to a scene's starting state and refuses another journey's", () => {
    const state = milano();
    expect(state.storyProgress.flags).toEqual([]);
    const flagged = withDebugFlags(state, ["milano_tino_needs_pick", "milano_tino_needs_pick"]);
    expect(flagged.storyProgress.flags).toEqual(["milano_tino_needs_pick"]);
    expect(validateGameState(flagged)).toEqual(flagged);
    expect(withDebugFlags(state, [])).toBe(state);
    expect(() => withDebugFlags(state, ["gt_delhi_golgappa_sick"]))
      .toThrow("フラグ「gt_delhi_golgappa_sick」はミラノ編のフラグではありません（progression/story.json の flags のID。");
  });

  it("sets and clears a flag of the running game in free time, and a flag-gated hotel scene follows it", () => {
    const start = createDebugState(free("delhi", { id: "delhi_hotel_hub", progress: "initial" }));
    const sick = setDebugFlag(start, "gt_delhi_golgappa_sick", true);
    expect(sick.storyProgress.flags).toEqual(["gt_delhi_golgappa_sick"]);
    expect(setDebugFlag(sick, "gt_delhi_golgappa_sick", false).storyProgress.flags).toEqual([]);
    // 休む: the morning's scene `# when: flag gt_delhi_golgappa_sick` plays only with the flag.
    const rest = (state: typeof start) => {
      const way = getTravelSleepOptions(state).find((option) => option.plan.ok)!.route;
      return sleepAtHotel(state, way.mode, state.revision, way.viaPlaceId ?? null, () => 0);
    };
    expect(rest(start).activeEncounter).toBeNull();
    expect(rest(sick).activeEncounter?.encounterId).toBe("gt_delhi_hotel_sick_morning");
  });

  it("changes nothing while a scene is open", () => {
    const date = createDebugState({ ...defaultDebugSettings("milano"), scene: "date", id: "milano_brera_date_01" });
    expect(debugEditRefusal(date)).toMatch(/^場面の途中なので変えられません。/u);
    expect(() => setDebugFlag(date, "milano_tino_needs_pick", true)).toThrow("場面の途中なので変えられません。");
    expect(() => withDebugClock(date, { minute: 19 * 60 })).toThrow("場面の途中なので変えられません。");
    expect(() => setDebugStage(date, 2)).toThrow("場面の途中なので変えられません。");
    expect(debugEditRefusal(milano())).toBeNull();
  });
});

describe("Debug's 恋の段階 (2026-11-16)", () => {
  it("starts a scene at the chosen stage, lower too, and at the progress's own without one", () => {
    const start = createDebugState(free("delhi", { id: "delhi_hotel_hub", progress: "initial" }));
    expect(start.romanceStage).toBe(1);
    const launch = resolveDebugLaunch({ dataMode: "real", cityId: "delhi", scene: "free", progress: "initial", stage: 3 });
    expect(launch).toMatchObject({ kind: "scene", settings: { stage: 3 } });
    const third = createDebugState(launch.kind === "scene" ? launch.settings : free("delhi"));
    expect(third).toEqual({ ...start, romanceStage: 3 });
    expect(validateGameState(third)).toEqual(third);
    // Lower: set as chosen, nothing else changes (the relationship values stay as Debug set them).
    expect(withDebugStage(third, 1)).toEqual(start);
    expect(withDebugStage(start, 1)).toBe(start);
    expect(() => withDebugStage(start, 5 as DebugRomanceStage)).toThrow("恋の段階は1〜4にしてください。");
  });

  it("opens Delhi's rooftop confession at night at stage 2 and not at stage 1", () => {
    // `# when: episodes delhi >= 1`, `not couple`, `time night`; minRomanceStage 2 (date_catalog.json).
    const night = withDebugClock(atPlace(finishEpisode(cityStart("delhi"), "gt_delhi_main_red_fort"), "delhi_hotel_hub"), { minute: 19 * 60 });
    expect(night.romanceStage).toBe(1);
    expect(isEventVisible(night, "gt_delhi_date_confession")).toBe(false);
    expect(getDateAvailability(night, "gt_delhi_date_confession")).toEqual({ available: false, reason: "もう少し、一緒の時間を過ごしてから。" });
    const second = setDebugStage(night, 2);
    expect(isEventVisible(second, "gt_delhi_date_confession")).toBe(true);
    expect(getDateAvailability(second, "gt_delhi_date_confession")).toEqual({ available: true, reason: "" });
    expect(isEventVisible(setDebugStage(second, 1), "gt_delhi_date_confession")).toBe(false);
  });

  it("leaves play's rule as it is: a stage below what the relationship values and completed dates reach rises where play evaluates it", () => {
    const reached = { ...createDebugState(free("delhi", { id: "delhi_hotel_hub" })), affection: 2, trust: 1, playedDateIds: ["gt_delhi_date_india_gate"] };
    const lowered = withDebugStage({ ...reached, romanceStage: 2 }, 1);
    expect(lowered.romanceStage).toBe(1);
    expect(evaluateProgression(lowered).romanceStage).toBe(2);
    // A stage above them stays (play never lowers it).
    expect(evaluateProgression(withDebugStage(lowered, 4)).romanceStage).toBe(4);
  });
});

describe("Debug's clock of free time", () => {
  it("keeps the game's day (9:00) and its end (21:00)", () => {
    expect(debugTimeRange).toEqual([DAY_START, DAY_END]);
  });

  it("opens Milan's free time at night: its night-only date can start, and not again in the morning", () => {
    const night = milano({ time: 19 * 60 });
    expect(night.travel).toMatchObject({ minute: 1140, day: 1, currentPlaceId: "p_hotel", returnReserve: 0 });
    expect(validateGameState(night)).toEqual(night);
    expect(getTravelEventAvailability(night, "milano_night_01", "walk").available).toBe(true);
    const morning = withDebugClock(night, { minute: 9 * 60 });
    expect(getTravelEventAvailability(morning, "milano_night_01", "walk")).toMatchObject({ available: false, reason: "到着する時間には、この出来事を始められません。" });
    // 21:00 is the day's end, as after a wait to it.
    expect(getDayEnd(milano({ time: DAY_END }))).not.toBeNull();
    expect(getDayEnd(night)).toBeNull();
  });

  it("moves the calendar with the day and starts a new day's route and headlines empty", () => {
    const start = createDebugState(free("delhi", { id: "delhi_hotel_hub" }));
    expect(start.travel.todayEpisodeIds.length).toBeGreaterThan(0);
    const third = withDebugClock(start, { day: 3, minute: 600 });
    expect(third.travel).toMatchObject({ day: 3, minute: 600, todayPlaceIds: [], todayEpisodeIds: [],
      calendar: { journeyDay: start.travel.calendar!.cityStartJourneyDay + 2, cityStartJourneyDay: start.travel.calendar!.cityStartJourneyDay } });
    expect(validateGameState(third)).toEqual(third);
    // The same day keeps today's records; the URL's day opens there too.
    expect(withDebugClock(start, { minute: 600 }).travel.todayEpisodeIds).toEqual(start.travel.todayEpisodeIds);
    expect(createDebugState(free("delhi", { id: "delhi_hotel_hub", day: 3, time: 600 })).travel).toMatchObject({ day: 3, minute: 600 });
  });

  it("keeps a fare home that is on time from where the party is, and refuses a time with none", () => {
    // The Navigli laundry lane: walking home takes 30 minutes, a taxi 19 (€12).
    const navigli = createDebugState(free("milano", { id: "p_navigli" }));
    expect(withDebugClock(navigli, { minute: 20 * 60 }).travel.returnReserve).toBe(0);
    expect(withDebugClock(navigli, { minute: 20 * 60 + 35 }).travel.returnReserve).toBe(12);
    expect(() => withDebugClock(navigli, { minute: 20 * 60 + 45 }))
      .toThrow("ナヴィリオ洗濯屋小路からは、20:45には宿へ帰れません。もっと早い時刻にするか、宿で時刻を変えてください。");
    expect(() => withDebugClock({ ...navigli, travelBudget: 5, travel: { ...navigli.travel, returnReserve: 0 } }, { minute: 20 * 60 + 35 }))
      .toThrow(/^ナヴィリオ洗濯屋小路から20:35に宿へ帰る交通費（.+）を、今の予算では確保できません。$/u);
  });

  it("refuses a time or day out of range, and a day change while a tour is booked", () => {
    expect(() => withDebugClock(milano(), { minute: 8 * 60 })).toThrow("時刻は09:00〜21:00にしてください。");
    expect(() => withDebugClock(milano(), { day: 0 })).toThrow("日は1〜30日目にしてください。");
    const booked = createDebugState({ ...defaultDebugSettings("agra"), scene: "tour", id: "gt_agra_tour_fatehpur_sikri", progress: "initial" });
    expect(booked.tour?.status).toBe("booked");
    expect(() => withDebugClock(booked, { day: booked.travel.day + 1 }))
      .toThrow(`ツアーを予約している間は日を変えられません（予約した日：${booked.tour!.bookedDay}日目。翌朝に出発します）。時刻は変えられます。`);
    const later = withDebugClock(booked, { minute: 17 * 60 });
    expect(validateGameState(later)).toEqual(later);
  });
});
