import { describe, expect, it } from "vitest";
import { createDebugState } from "../../../src/dev/debug-state";
import { dates } from "../../../src/content";
import {
  advanceDate, chooseDate, createGame, finishDate, getDateAvailability,
  isEventVisible, startDate, validateGameState, type GameState,
} from "../../../src/domain/game";

const novecentoId = "milano_novecento_date_01";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

/** Generate a valid history via the current game rules. */
function currentFreeTime(): GameState {
  const state = createDebugState({ scene: "tourism", id: "duomo_milano", progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
  return validateGameState({ ...state, activeTourism: null });
}

const seed = () => currentFreeTime();

describe("Milan date availability", () => {
  it("starts the Novecento date independently of other dates", () => {
    const state = seed();
    expect(state.playedDateIds).toEqual([]);
    const definition = dates.find((entry) => entry.id === novecentoId)!;
    expect(JSON.stringify(definition.when)).not.toContain("datePlayed");
    expect(isEventVisible(state, novecentoId)).toBe(true);
    expect(getDateAvailability(state, novecentoId).available).toBe(true);
    const started = startDate(state, novecentoId, () => 0);
    expect(started.activeDate?.dateId).toBe(novecentoId);
    expect(started.ap).toBe(state.ap - definition.apCost);
    expect(restore(started)).toEqual(started);
    let completed = started;
    for (let i = 0; i < 100 && completed.activeDate; i++) {
      const active = completed.activeDate;
      if (active.frame.ended) completed = finishDate(completed, completed.revision);
      else if (active.frame.choices.length) completed = chooseDate(completed, 0, completed.revision);
      else completed = advanceDate(completed, completed.revision);
    }
    expect(completed.activeDate).toBeNull();
    expect(completed.playedDateIds).toContain(novecentoId);
    expect(completed.memories.filter((memory) => memory === "sound_memory_novecento_date_01")).toHaveLength(1);
    expect(restore(completed)).toEqual(completed);
  });

  it("does not offer an ordinary date again after its first completion", () => {
    let state = startDate(seed(), "milano_cafe_01", () => 4321);
    for (let i = 0; i < 100 && state.activeDate; i++) {
      const frame = state.activeDate.frame;
      state = frame.ended ? finishDate(state, state.revision)
        : frame.choices.length ? chooseDate(state, 0, state.revision)
        : advanceDate(state, state.revision);
    }
    expect(state.playedDateIds).toContain("milano_cafe_01");
    expect(isEventVisible(state, "milano_cafe_01")).toBe(false);
    expect(getDateAvailability(state, "milano_cafe_01").available).toBe(false);
    expect(startDate(state, "milano_cafe_01")).toBe(state);
  });

  it("keeps the reasons' order: the city clear, an episode, until, then the general reason", () => {
    const base = { ...createGame(), ap: 12 };
    const progress = (episodeIds: string[], cityIds: string[] = []): GameState =>
      ({ ...base, completedEpisodeIds: episodeIds, completedCityIds: cityIds });
    const reason = (state: GameState, id: string) => getDateAvailability(state, id).reason;
    const later = "旅を進めると、この場所に誘えます。";
    // milano_rain_pause_01: when = a Milan episode and the Galleria; until = the Last Supper.
    expect(reason(progress([]), "milano_rain_pause_01")).toBe(later);
    expect(reason(progress(["milano_last_supper_episode"]), "milano_rain_pause_01")).toBe(later);
    expect(reason(progress(["milano_galleria_episode", "milano_last_supper_episode"]), "milano_rain_pause_01")).toBe("この機会は過ぎました。");
    expect(getDateAvailability(progress(["milano_galleria_episode"]), "milano_rain_pause_01").available).toBe(true);
    // milano_city_date_01: when = a Milan episode and the Milan clear.
    expect(reason(progress([]), "milano_city_date_01")).toBe("都市の旅を終えると、このデートに誘えます。");
    expect(reason(progress(["milano_duomo_episode"]), "milano_city_date_01")).toBe("都市の旅を終えると、このデートに誘えます。");
    expect(reason(progress([], ["milano"]), "milano_city_date_01")).toBe("もう少し、一緒の時間を過ごしてから。");
    expect(getDateAvailability(progress(["milano_duomo_episode"], ["milano"]), "milano_city_date_01").available).toBe(true);
  });

  it("loads a running date whose when or until no longer holds (conditions are not checked again)", () => {
    const started = startDate(seed(), novecentoId, () => 0);
    expect(started.activeDate?.dateId).toBe(novecentoId);
    const definition = dates.find((entry) => entry.id === novecentoId)!;
    const { when, until } = definition;
    try {
      definition.when = { not: { cityCompleted: "milano" } };
      definition.until = { cityCompleted: "milano" };
      expect(getDateAvailability(seed(), novecentoId).available).toBe(false);
      expect(restore(started)).toEqual(started);
    } finally {
      definition.when = when;
      definition.until = until;
    }
  });
});
