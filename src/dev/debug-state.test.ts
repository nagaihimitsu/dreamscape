import { describe, expect, it } from "vitest";
import { advanceDate, chooseDate, validateGameState } from "../domain/game";
import { createDebugState, type DebugSettings } from "./debug-state";

const base: DebugSettings = { scene: "tourism", id: "duomo_milano", progress: "completed", ap: 9, affection: 3, trust: 2, spark: 1, roll: "positive" };

describe("debug scene preparation", () => {
  it.each([
    ["tourism", "duomo_milano"],
    ["battle", "milano_duomo_01"],
    ["encounter", "galleria_fortune"],
    ["date", "milano_brera_date_01"],
  ] as const)("opens a valid %s scene using game rules", (scene, id) => {
    const game = createDebugState({ ...base, scene, id });
    expect(validateGameState(game)).toEqual(game);
    expect(game.affection).toBe(3);
    expect(game.trust).toBe(2);
    expect(game.spark).toBe(1);
    expect(scene === "tourism" ? game.activeTourism?.landmarkId : scene === "battle" ? game.activeBattle?.battleId : scene === "encounter" ? game.activeEncounter?.encounterId : game.activeDate?.dateId).toBe(id);
    expect(game.ap).toBe(scene === "date" ? 7 : 9);
  });
  it("uses saved deterministic tickets with the ordinary date choice resolver", () => {
    for (const [roll, expected] of [["positive", "positive"], ["negative", "negative"]] as const) {
      let game = createDebugState({ ...base, scene: "date", id: "milano_brera_date_01", roll });
      for (let i = 0; !game.activeDate!.frame.choices.length; i++) {
        expect(i).toBeLessThan(50);
        game = advanceDate(game, game.revision);
      }
      game = chooseDate(game, game.activeDate!.frame.choices[0].index, game.revision);
      expect(game.activeDate!.resolvedChoices[0].result).toBe(expected);
      expect(validateGameState(game)).toEqual(game);
    }
  });
  it("does not open a locked scene and keeps the AP limit", () => {
    expect(() => createDebugState({ ...base, scene: "date", id: "milano_brera_date_01", progress: "initial" })).toThrow();
    expect(() => createDebugState({ ...base, scene: "date", id: "milano_brera_date_01", ap: 0 })).toThrow();
    expect(createDebugState({ ...base, ap: 99 }).ap).toBe(12);
  });
});
