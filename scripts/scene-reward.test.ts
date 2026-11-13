import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { parseDone, readPlaceFile } from "./place-files";
import { insertedSceneEncounter, placeScenes, sceneRewardErrors, tourMomentErrors, type MainAddresses, type RewardOfCity } from "./scene-table";
import type { SceneEntry } from "../src/content/scene-schemas";

// `# on_done: reward <reward ID>` (plan C1): an inserted scene's other way to earn a one-off reward of progression/journey.json
// (docs/01 「文化交流にも既存報酬の代替達成条件がある」). content:build reads it, writes it to the scene table and to the
// encounter the game runs (alternativeApRewardId, which the save check reads as the reward's cause), and stops it on a main
// part, an unknown reward, one without AP or of another city, a reward named twice, and an in-car encounter of a tour.

const top = "INCLUDE modules.ink\n-> DONE\n";
const tourStep = (tourId: string, stepId: string) => tourId === "smp_x_tour" && stepId === "out" ? { cityId: "x", kind: "leg" as const } : undefined;
const mains: MainAddresses = [{ address: "places/smp_x_square.smp_x_guide", main: { guide: "x_square" }, cityId: "x", title: "広場", kind: "guide" }];

function scenesOf(...knots: [name: string, head: string][]): SceneEntry[] {
  const source = top + knots.map(([name, head]) => `\n=== ${name} ===\n${head}x\n-> END\n`).join("");
  const file = readPlaceFile("places/smp_x_square", source);
  const compiled = compileInk(file.source, "places/smp_x_square.ink", { [MODULES_FILE]: MODULES_INK });
  return placeScenes({ file, compiled, apCap: 12, mains, landmarkCity: () => "x", tourStep }).map((item) => item.entry);
}
const wish = (extra = "") => `# scene: encounter\n# title: 願掛け\n# at: visit x_square\n# priority: after observe\n${extra}`;
const rewards: RewardOfCity[] = [
  { id: "x_battle_two", ap: 1, trigger: "battle_score", cityId: "x" },
  { id: "x_free", ap: 0, trigger: "battle_complete", cityId: "x" },
  { id: "y_battle_two", ap: 1, trigger: "battle_score", cityId: "y" },
];

describe("# on_done: reward (C1)", () => {
  it("reads one reward ID in a head's # on_done: and refuses two, none or more than one word", () => {
    expect(parseDone(["reward x_battle_two", "set x_flag"], 12)).toEqual({ reward: "x_battle_two", set: ["x_flag"] });
    expect(() => parseDone(["reward x_battle_two", "reward x_free"], 12)).toThrow("Write # on_done: reward once");
    expect(() => parseDone(["reward"], 12)).toThrow("# on_done: reward takes one ID");
    expect(() => parseDone(["reward x_a x_b"], 12)).toThrow("# on_done: reward takes one ID");
    expect(() => parseDone(["reward X-Bad"], 12)).toThrow();
  });

  it("writes it to the scene table and to the encounter the game runs (alternativeApRewardId)", () => {
    const [scene] = scenesOf(["smp_x_wish", wish("# on_done: reward x_battle_two\n")]);
    expect(scene.done).toEqual({ reward: "x_battle_two" });
    const { encounter } = insertedSceneEncounter(scene, () => "広場");
    expect(encounter.alternativeApRewardId).toBe("x_battle_two");
    // Without the tag the encounter names no reward.
    const [plain] = scenesOf(["smp_x_wish", wish()]);
    expect(insertedSceneEncounter(plain, () => "広場").encounter).not.toHaveProperty("alternativeApRewardId");
    expect(sceneRewardErrors([scene], rewards)).toEqual([]);
  });

  it("stops it on a main part, an unknown or scene_tag reward, one without AP, one of another city and a reward named twice", () => {
    const one = (name: string, reward: string) => scenesOf([name, wish(`# on_done: reward ${reward}\n`)])[0];
    const guide = scenesOf(["smp_x_guide", "# scene: guide\n# on_done: reward x_battle_two\n"])[0];
    expect(sceneRewardErrors([guide], rewards)).toEqual([expect.stringContaining("A main part takes no # on_done: reward")]);
    expect(sceneRewardErrors([one("smp_x_a", "x_unknown")], rewards)).toEqual([expect.stringContaining("names no reward")]);
    expect(sceneRewardErrors([one("smp_x_a", "x_tag")], [{ id: "x_tag", ap: 1, trigger: "scene_tag", cityId: "x" }]))
      .toEqual([expect.stringContaining("names no reward")]);
    expect(sceneRewardErrors([one("smp_x_a", "x_free")], rewards)).toEqual([expect.stringContaining("gives no AP")]);
    expect(sceneRewardErrors([one("smp_x_a", "y_battle_two")], rewards)).toEqual([expect.stringContaining("is a reward of y")]);
    expect(sceneRewardErrors([one("smp_x_a", "x_battle_two"), one("smp_x_b", "x_battle_two")], rewards))
      .toEqual([expect.stringContaining("named by two ways to earn it")]);
    expect(sceneRewardErrors([one("smp_x_a", "x_battle_two")], rewards, [{ encounterId: "x_catalog_wish", rewardId: "x_battle_two" }]))
      .toEqual([expect.stringContaining("the encounter x_catalog_wish of encounters/catalog.json")]);
  });

  it("is an AP reward a tour's in-car encounter may not give (its day's price covers it)", () => {
    const car = scenesOf(["smp_x_car", "# scene: encounter\n# title: 車\n# at: tour smp_x_tour out\n# priority: after leg\n# on_done: reward x_battle_two\n"]);
    expect(tourMomentErrors(car)).toEqual([expect.stringContaining("# on_done: reward x_battle_two")]);
  });
});
