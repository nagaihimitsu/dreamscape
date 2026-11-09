import { describe, expect, it } from "vitest";
import { screenOnShow, storySceneChanged, storySceneOnScreen, type SceneState } from "./story-scene-change";

const none: SceneState = { activeEncounter: null, activeEpilogue: null, activeTourism: null, activeBattle: null, activeDate: null };
const date = { ...none, activeDate: { runId: "date-run-1" } };
const guide = { ...none, activeTourism: { landmarkId: "p_duomo", phase: "guide" as const } };
const observing = { ...none, activeTourism: { landmarkId: "p_duomo", phase: "exploring" as const } };
const battleDialogue = { ...none, activeBattle: { runId: "battle-run-1", phase: "dialogue" } };
const battleQuestion = { ...none, activeBattle: { runId: "battle-run-1", phase: "question" } };
const epilogue = { ...none, activeEpilogue: { episodeId: "milano_finale" } };
const arrival = { ...none, activeEpilogue: { episodeId: "next_city_first", kind: "arrival" as const } };
const encounter = (runId: string) => ({ ...none, activeEncounter: { runId } });

// AGENTS.md 選択肢の誤タップ防止: after a story scene starts or ends, the second tap of the double
// tap that did it must not press the next screen (a date's end starting another date) nor read
// the new scene's first line on before it is seen.
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

describe("a story scene starting or ending", () => {
  const name = storySceneOnScreen;
  it("is every change from a story scene: to the map, the observation, a question or another scene", () => {
    expect(storySceneChanged(name(date), name(none))).toBe(true);
    expect(storySceneChanged(name(guide), name(observing))).toBe(true);
    expect(storySceneChanged(name(battleDialogue), name(battleQuestion))).toBe(true);
    expect(storySceneChanged(name(epilogue), name(arrival))).toBe(true);
    expect(storySceneChanged(name(encounter("e1")), name(encounter("e2")))).toBe(true);
    expect(storySceneChanged(name(encounter("e1")), name(guide))).toBe(true);
  });

  it("is every change into a story scene: a destination's date or guide, a battle's talk, the epilogue", () => {
    expect(storySceneChanged(name(none), name(date))).toBe(true);
    expect(storySceneChanged(name(none), name(guide))).toBe(true);
    expect(storySceneChanged(name(battleQuestion), name(battleDialogue))).toBe(true);
    expect(storySceneChanged(name({ ...none, activeBattle: { runId: "battle-run-1", phase: "feedback" } }), name(battleDialogue))).toBe(true);
    expect(storySceneChanged(name({ ...none, activeBattle: { runId: "battle-run-1", phase: "result" } }), name(epilogue))).toBe(true);
    expect(storySceneChanged(null, name(arrival))).toBe(true);
  });

  it("is not reading on in the same scene or moving between other screens", () => {
    expect(storySceneChanged(name(date), name({ ...none, activeDate: { runId: "date-run-1" } }))).toBe(false);
    expect(storySceneChanged(name(observing), name(battleQuestion))).toBe(false);
    expect(storySceneChanged(name(none), name(battleQuestion))).toBe(false);
    expect(storySceneChanged(null, null)).toBe(false);
  });
});

// UI redesign §3.7 E: a new screen takes a lost focus on its heading, and free time opens at the top.
describe("which screen is on show", () => {
  const view = { sceneEpoch: 0, showRomanceEnding: false };
  const at = (state: SceneState) => ({ ...state, currentCityId: "milano" });
  it("names each screen, a new scene with a new name", () => {
    expect(screenOnShow(null, view)).toBe("title");
    expect(screenOnShow(at(none), view)).toBe("free:milano");
    expect(screenOnShow(at(guide), view)).toBe("tourism:p_duomo:guide");
    expect(screenOnShow(at(observing), view)).toBe("tourism:p_duomo:exploring");
    expect(screenOnShow(at(battleDialogue), view)).toBe(screenOnShow(at(battleQuestion), view));
    expect(screenOnShow(at(date), view)).toBe("date:date-run-1:0");
    expect(screenOnShow(at(encounter("e1")), view)).toBe("encounter:e1:0");
    expect(screenOnShow(at(epilogue), view)).toBe("epilogue:milano_finale:ending");
  });

  it("makes a loaded scene, the talk after an arrival's title card and the romance ending new screens", () => {
    expect(screenOnShow(at(date), { ...view, sceneEpoch: 1 })).not.toBe(screenOnShow(at(date), view));
    const card = { ...at(none), activeEpilogue: { episodeId: "e", kind: "arrival" as const, logoComplete: false } };
    const talk = { ...card, activeEpilogue: { ...card.activeEpilogue, logoComplete: true } };
    expect(screenOnShow(card, view)).not.toBe(screenOnShow(talk, view));
    expect(screenOnShow({ ...at(none), endingReached: true }, { ...view, showRomanceEnding: true })).toBe("romance-ending");
    expect(screenOnShow({ ...at(none), endingReached: true }, view)).toBe("free:milano");
  });
});
