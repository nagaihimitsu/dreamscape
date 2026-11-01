import { describe, expect, it } from "vitest";
import {
  advanceDate, chooseDate, createGame, finishDate, getDateAvailability,
  isEventVisible, startDate, type GameState,
} from "./game";

function playToEnd(initial: GameState, dateId: string): { state: GameState; text: string } {
  let state = startDate(initial, dateId, stableRolls());
  expect(state.activeDate?.dateId).toBe(dateId);
  const lines: string[] = [];
  for (let count = 0; state.activeDate && count < 100; count++) {
    const active = state.activeDate;
    lines.push(active.frame.text);
    if (active.frame.ended) state = finishDate(state, state.revision);
    else if (active.frame.choices.length) state = chooseDate(state, 0, state.revision);
    else state = advanceDate(state, state.revision);
  }
  expect(state.activeDate).toBeNull();
  return { state, text: lines.join("\n") };
}

describe("optional Milan moments", () => {
  it("offers the rain pause only between its two travel milestones and only once", () => {
    const base = { ...createGame(), completedChapters: ["milano"] };
    const before = { ...base, completedEpisodeIds: ["milano_duomo_episode"] };
    const during = { ...base, completedEpisodeIds: ["milano_duomo_episode", "milano_galleria_episode"] };
    const after = { ...during, completedEpisodeIds: [...during.completedEpisodeIds, "milano_last_supper_episode"] };
    const id = "milano_rain_pause_01";
    expect(isEventVisible(before, id)).toBe(false);
    expect(getDateAvailability(before, id).available).toBe(false);
    expect(isEventVisible(during, id)).toBe(true);
    expect(getDateAvailability(during, id).available).toBe(true);
    expect(isEventVisible(after, id)).toBe(false);
    expect(startDate(after, id)).toBe(after);
    const finished = playToEnd(during, id).state;
    expect(finished.playedDateIds).toContain(id);
    expect(finished.memories).toContain("milano_rain_pause_music");
    expect(finished.ap).toBe(during.ap);
    expect(getDateAvailability(finished, id).available).toBe(false);
    expect(startDate(finished, id)).toBe(finished);
  });

  it("does not invent a cafe callback after experiencing a different date", () => {
    const state = {
      ...createGame(),
      completedChapters: ["milano"],
      completedEpisodeIds: ["milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode"],
      memories: ["milano_san_satiro_first_b"],
      ap: 3,
    };
    const { text } = playToEnd(state, "milano_navigli_date_01");
    expect(text).not.toContain("前にも運河の近くで話しましたね");
    expect(text).toContain("水に映る灯り");
  });
});

/** Reproducible positive outcomes with varied delta tickets for these progression tests. */
function stableRolls() {
  let index = 0;
  const tickets = [0, 5000, 5000, 0];
  return () => tickets[index++ % tickets.length];
}
