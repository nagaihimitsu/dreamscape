import { afterEach, describe, expect, it } from "vitest";
import { allRewardRules, balance } from "../content";
import { encounters } from "../content/encounters";
import type { EncounterDefinition } from "../content/encounter-schemas";
import { isRewardEarned } from "./chapter";
import { createGame, type GameState } from "./game";
import { earnRewards } from "./rewards";
import { applyDoneEffects } from "./scene-effects";

// `# on_done: reward <reward ID>` (plan C1) in the game: finishing the scene earns the one-off reward once, whichever way earns it
// first (the scene, or the battle's own score); above the AP cap the rest is stored as pending AP; and the save check reads the
// completed scene (its encounter's alternativeApRewardId) as the reward's cause. The Galleria's wish (galleria_fortune) plays it
// end to end, saved and loaded again (tests/journeys/milano/galleria-ap.test.ts).

const REWARD = "victory_galleria_first";
const rule = allRewardRules.find((item) => item.id === REWARD)!;
const done = { reward: REWARD };

describe("# on_done: reward (C1) in the game", () => {
  const before = [...encounters.encounters];
  afterEach(() => { encounters.encounters.splice(0, encounters.encounters.length, ...before); });

  it("earns the reward's AP once, however often the scene is done", () => {
    const state = createGame();
    const first = applyDoneEffects(state, "x_wish", done, state.revision + 1);
    expect(first.ap).toBe(state.ap + rule.ap);
    expect(first.claimedRewardIds).toEqual([...state.claimedRewardIds, REWARD]);
    expect(applyDoneEffects(first, "x_wish", done, first.revision + 1)).toEqual(first);
  });

  it("does not pay twice with the battle's own reward, in either order", () => {
    const state = createGame();
    const byScene = applyDoneEffects(state, "x_wish", done, state.revision + 1);
    expect(earnRewards(byScene, [REWARD]).state).toEqual(byScene);
    const byBattle = earnRewards(state, [REWARD]).state;
    expect(applyDoneEffects(byBattle, "x_wish", done, state.revision + 1)).toEqual(byBattle);
    expect(byBattle.ap).toBe(byScene.ap);
  });

  it("stores the AP above the cap as pending AP", () => {
    const full: GameState = { ...createGame(), ap: balance.apCap };
    const next = applyDoneEffects(full, "x_wish", done, full.revision + 1);
    expect(next.ap).toBe(balance.apCap);
    expect(next.pendingApRewards).toEqual([{ rewardId: REWARD, earnedAp: rule.ap, remainingAp: rule.ap }]);
  });

  it("is a cause of the claimed reward in the save check once the scene is completed (alternativeApRewardId)", () => {
    const wish = { ...structuredClone(encounters.encounters[0]), id: "x_wish", alternativeApRewardId: REWARD } as EncounterDefinition;
    delete (wish as Partial<EncounterDefinition>).quiz;
    encounters.encounters.splice(0, encounters.encounters.length, ...before.filter((event) => event.alternativeApRewardId !== REWARD), wish);
    const state = createGame();
    expect(isRewardEarned(state, rule)).toBe(false);
    expect(isRewardEarned({ ...state, seenEncounterIds: ["x_wish"] }, rule)).toBe(false);
    expect(isRewardEarned({ ...state, seenEncounterIds: ["x_wish"], completedEncounterIds: ["x_wish"] }, rule)).toBe(true);
  });
});
