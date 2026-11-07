import { describe, expect, it } from "vitest";
import { leftStoryScene, storySceneOnScreen, type SceneState } from "./scene-exit";

const none: SceneState = { activeEncounter: null, activeEpilogue: null, activeTourism: null, activeBattle: null, activeDate: null };
const date = { ...none, activeDate: { runId: "date-run-1" } };
const guide = { ...none, activeTourism: { landmarkId: "p_duomo", phase: "guide" as const } };
const observing = { ...none, activeTourism: { landmarkId: "p_duomo", phase: "exploring" as const } };
const battleDialogue = { ...none, activeBattle: { runId: "battle-run-1", phase: "dialogue" } };
const battleQuestion = { ...none, activeBattle: { runId: "battle-run-1", phase: "question" } };
const epilogue = { ...none, activeEpilogue: { episodeId: "milano_finale" } };
const arrival = { ...none, activeEpilogue: { episodeId: "next_city_first", kind: "arrival" as const } };
const encounter = (runId: string) => ({ ...none, activeEncounter: { runId } });

// AGENTS.md 選択肢の誤タップ防止: after a story scene ends, the second tap of the double tap
// that ended it must not press the next screen (a date's end starting another date).
describe("which story scene is on screen", () => {
  it("names each scene with the dialogue window, and nothing else", () => {
    expect(storySceneOnScreen(date)).toBe("date:date-run-1");
    expect(storySceneOnScreen(guide)).toBe("guide:p_duomo");
    expect(storySceneOnScreen(battleDialogue)).toBe("battle:battle-run-1");
    expect(storySceneOnScreen(epilogue)).toBe("epilogue:milano_finale:ending");
    expect(storySceneOnScreen(arrival)).toBe("epilogue:next_city_first:arrival");
    expect(storySceneOnScreen(encounter("e1"))).toBe("encounter:e1");
    for (const state of [none, observing, battleQuestion, { ...none, activeBattle: { runId: "b", phase: "result" } }, null])
      expect(storySceneOnScreen(state)).toBeNull();
  });

  it("follows the screen order: an encounter over the tourism screen, the tourism screen over its battle", () => {
    expect(storySceneOnScreen({ ...observing, activeEncounter: { runId: "e1" } })).toBe("encounter:e1");
    expect(storySceneOnScreen({ ...observing, activeBattle: battleDialogue.activeBattle })).toBeNull();
    expect(storySceneOnScreen({ ...epilogue, activeDate: date.activeDate })).toBe("epilogue:milano_finale:ending");
  });
});

describe("leaving a story scene", () => {
  const name = storySceneOnScreen;
  it("is every change from a story scene: to the map, the observation, a question or another scene", () => {
    expect(leftStoryScene(name(date), name(none))).toBe(true);
    expect(leftStoryScene(name(guide), name(observing))).toBe(true);
    expect(leftStoryScene(name(battleDialogue), name(battleQuestion))).toBe(true);
    expect(leftStoryScene(name(epilogue), name(arrival))).toBe(true);
    expect(leftStoryScene(name(encounter("e1")), name(encounter("e2")))).toBe(true);
    expect(leftStoryScene(name(encounter("e1")), name(guide))).toBe(true);
  });

  it("is not reading on in the same scene, entering a scene or moving between other screens", () => {
    expect(leftStoryScene(name(date), name({ ...none, activeDate: { runId: "date-run-1" } }))).toBe(false);
    expect(leftStoryScene(name(none), name(date))).toBe(false);
    expect(leftStoryScene(name(observing), name(battleQuestion))).toBe(false);
    expect(leftStoryScene(null, null)).toBe(false);
  });
});
