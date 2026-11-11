import { beforeAll, describe, expect, it } from "vitest";
import { getJourney } from "../../../src/content/journeys";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../../../src/domain/player-action";
import { screenFor } from "../../../src/domain/screen";
import { beginTravelEvent } from "../../../src/domain/travel-game";
import { cityStart, playBattleToResult } from "../../../src/dev/scenario-builders";

// The album (2026-11-11) on the sample journey (fictional): its # photo: examples — the market guide's first line (a
// background's ID), the library guide's (a tourism photo's) and the date's last part (a photo with its caption) —
// played with the game's own actions, saved and restored at every step: each image is taken once.

const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const MAP = ["travel", "wait", "rest", "rent", "claim_ap", "depart", "read_epilogue"];
const act = (state: GameState, action: PlayerAction) => {
  const next = applyPlayerAction(state, playerActionChange(action, () => 0), () => 0);
  expect(next, action.kind).not.toBe(state);
  return restore(next);
};
/** Take the first action the screen offers (never the map's; a battle with its right answers), saving and restoring each step, until `done`. */
function playUntil(initial: GameState, done: (state: GameState) => boolean, limit = 400): GameState {
  let state = initial;
  for (let step = 0; !done(state); step++) {
    expect(step, "the play did not reach the expected step").toBeLessThan(limit);
    if (state.activeBattle && state.activeBattle.phase !== "result") { state = restore(playBattleToResult(state)); continue; }
    const action = listPlayerActions(state).find((item) => !MAP.includes(item.kind));
    if (!action) throw new Error(`no action on the screen ${screenFor(state)}`);
    state = act(state, action);
  }
  return state;
}
const free = (state: GameState) => !state.occasion && screenFor(state) === "free_time";
const depart = (state: GameState, eventId: string) =>
  restore(applyPlayerAction(state, (current) => beginTravelEvent(current, eventId, "walk", current.revision, () => 0), () => 0));

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the sample journey's album", () => {
  it("takes the market guide's photo on its first line, and only once: through the guide, a reload, a second reading and the battle", () => {
    let state = depart(cityStart("mihon"), "smp_mihon_special_b_market");
    expect(state.activeTourism).toMatchObject({ landmarkId: "mihon_market", phase: "guide" });
    expect(state.activeTourism?.frame?.photo).toEqual({ imageId: "smp_bg_mihon_market" });
    const taken = [{ imageId: "smp_bg_mihon_market", cityId: "mihon", day: state.travel.day, minute: state.travel.minute,
      placeId: "mihon_market", storyId: "tourism/smp_mihon_market_guide" }];
    expect(state.album).toEqual(taken);
    state = playUntil(state, (current) => current.activeTourism?.phase === "exploring");
    expect(state.album).toEqual(taken);
    // 「観光案内をもう一度読む」: the same line on screen again.
    state = act(state, { kind: "guide_again" });
    expect(state.activeTourism?.frame?.photo).toEqual({ imageId: "smp_bg_mihon_market" });
    expect(state.album).toEqual(taken);
    state = playUntil(state, free);
    expect(state.album).toEqual(taken);
    // The library's guide takes its own photo next (a tourism photo's ID); the market's stays first.
    state = depart(state, "smp_mihon_special_c_library");
    expect(state.album.map((photo) => photo.imageId)).toEqual(["smp_bg_mihon_market", "smp_img_mihon_library"]);
  });

  it("takes the date's photo with its caption at the tower, and keeps the album when the date is over", () => {
    const afterTower = playUntil(depart(cityStart("mihon"), "smp_mihon_main_clock_tower"), free);
    expect(afterTower.album).toEqual([]);
    const dated = playUntil(depart(afterTower, "smp_mihon_date_tower_square"), free);
    expect(dated.playedDateIds).toEqual(["smp_mihon_date_tower_square"]);
    expect(dated.album).toEqual([expect.objectContaining({ imageId: "smp_img_mihon_clock_tower", caption: "三時までの席。お茶のあとも、針は三時のまま",
      cityId: "mihon", placeId: "mihon_clock_tower", storyId: "places/smp_mihon_clock_tower.smp_mihon_date_tower_square" })]);
  });
});
