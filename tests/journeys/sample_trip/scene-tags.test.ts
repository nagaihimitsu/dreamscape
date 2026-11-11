import { beforeAll, describe, expect, it } from "vitest";
import { getJourney } from "../../../src/content/journeys";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "../../../src/domain/player-action";
import { screenFor } from "../../../src/domain/screen";
import { beginTravelEvent, sleepAtHotel } from "../../../src/domain/travel-game";
import { cityStart, playBattleToResult } from "../../../src/dev/scenario-builders";
import type { StoryFrame } from "../../../src/story/runtime";

// The scene tags (2026-11-11) on the sample journey (fictional): the hotel morning's # phone: messages and the date's
// # stand: places, played with the game's own actions, saved and restored at every step.

const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const MAP = ["travel", "wait", "rest", "rent", "claim_ap", "depart", "read_epilogue"];
/** Take the first action the screen offers (never the map's; a battle with its right answers) until `done`, keeping the frames `frameOf` reads. */
function playUntil(initial: GameState, done: (state: GameState) => boolean, frameOf: (state: GameState) => StoryFrame | undefined = () => undefined) {
  let state = initial;
  const frames: StoryFrame[] = [];
  for (let step = 0; !done(state); step++) {
    expect(step, "the play did not reach the expected step").toBeLessThan(400);
    const frame = frameOf(state);
    if (frame) frames.push(frame);
    if (state.activeBattle && state.activeBattle.phase !== "result") { state = restore(playBattleToResult(state)); continue; }
    const action = listPlayerActions(state).find((item) => !MAP.includes(item.kind));
    if (!action) throw new Error(`no action on the screen ${screenFor(state)}`);
    state = restore(applyPlayerAction(state, playerActionChange(action, () => 0), () => 0));
  }
  return { state, frames };
}
const free = (state: GameState) => !state.occasion && screenFor(state) === "free_time";
const depart = (state: GameState, eventId: string) =>
  restore(applyPlayerAction(state, (current) => beginTravelEvent(current, eventId, "walk", current.revision, () => 0), () => 0));

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the sample journey's scene tags", () => {
  it("stacks the hotel morning's phone messages until the narration, which shows no phone", () => {
    // At 15:00 the party rests at once; the morning's scene (the tower not visited yet) follows the night.
    const start = cityStart("mihon");
    const morning = restore(applyPlayerAction({ ...start, travel: { ...start.travel, currentPlaceId: "mihon_hotel", minute: 15 * 60 } },
      (current) => sleepAtHotel(current, "walk", current.revision, null, () => 0), () => 0));
    expect(morning.activeEncounter?.encounterId).toBe("smp_mihon_hotel_morning");
    const { frames } = playUntil(morning, (state) => !state.activeEncounter, (state) => state.activeEncounter?.frame);
    expect(frames.map((frame) => frame.phone ?? null)).toEqual([
      { side: "received" },
      { side: "sent", earlier: [{ side: "received", speaker: "heroine", text: "起きてる？　窓の外、見て。" }] },
      null,
      null,
    ]);
  });

  it("places the heroine of the date apart, then close, then near, each until the next # stand:", () => {
    const afterTower = playUntil(depart(cityStart("mihon"), "smp_mihon_main_clock_tower"), free).state;
    const { frames } = playUntil(depart(afterTower, "smp_mihon_date_tower_square"), free, (state) => state.activeDate?.frame);
    const stands = frames.map((frame) => frame.stand);
    expect(stands[0]).toBe("apart");
    expect(stands.filter((stand, index) => stand !== stands[index - 1])).toEqual(["apart", "close", "near"]);
  });
});
