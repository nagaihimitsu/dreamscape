import { describe, expect, it } from "vitest";
import { battleQuizzes, battles } from "../content";
import { advanceBattle, answerBattle, leaveBattle } from "./battle";
import { startEpisode } from "./chapter";
import { advanceEncounter, answerEncounterQuiz, chooseEncounter, finishEncounter, getEncounterAvailability, getTourismEncounterAvailability, startEncounter, startTourismEncounter } from "./encounter";
import { createGame, validateGameState, type GameState } from "./game";
import { openTourism, skipTourismGuide, startTourismBattle } from "./tourism";
import { encounters } from "../content/encounters";
import { encounterCatalogSchema } from "../content/encounter-schemas";
import preSoundData from "../../content/legacy/encounters_before_sound_fortune.json";

const galleria = "galleria_vittorio_emanuele_ii";
const encounter = "galleria_fortune";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

function finishBattle(initial: GameState): GameState {
  let state = initial;
  const battle = battles.find((entry) => entry.id === state.activeBattle?.battleId)!;
  const quiz = battleQuizzes[battle.quizId];
  for (let i = 0; state.activeBattle?.phase !== "result" && i < 160; i++) {
    const active = state.activeBattle!;
    state = active.phase === "question"
      ? answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision)
      : advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  return restore(state);
}

/** Reach the second episode through an actual first-play Duomo battle. */
function enterGalleria(): GameState {
  let state = startEpisode(createGame(), "milano_duomo_episode");
  expect(state.activeTourism?.landmarkId).toBe("duomo_milano");
  state = finishBattle(startTourismBattle(state, state.revision));
  state = leaveBattle(state, state.revision);
  state = startEpisode(state, "milano_galleria_episode");
  expect(state.activeTourism?.landmarkId).toBe(galleria);
  return restore(state);
}

function exploreGalleria(): GameState {
  const state = enterGalleria();
  return restore(skipTourismGuide(state, state.revision));
}

describe("the optional Galleria conversation", () => {
  it("can be skipped entirely on the way to the ordinary three-question battle", () => {
    let state = enterGalleria();
    expect(getTourismEncounterAvailability(state, encounter).available).toBe(false);
    state = restore(startTourismBattle(state, state.revision));
    expect(state.activeEncounter).toBeNull();
    expect(state.activeBattle?.battleId).toBe("milano_galleria_01");
    expect(battleQuizzes[battles.find((battle) => battle.id === "milano_galleria_01")!.quizId].questions).toHaveLength(3);
    expect(state.completedEncounterIds).not.toContain(encounter);
  });

  it.each([0, 1])("restores exploration after choice %s without revealing the later quiz", (choiceIndex) => {
    let state = exploreGalleria();
    const savedTourism = state.activeTourism;
    const ap = state.ap;
    const rewards = state.claimedRewardIds;
    const inventory = { ...state.inventory };
    const budget = state.travelBudget;
    expect(getEncounterAvailability(state, encounter).available).toBe(false);
    expect(startEncounter(state, encounter, () => 0)).toBe(state);
    expect(getTourismEncounterAvailability(state, encounter).available).toBe(true);
    const revision = state.revision;
    state = restore(startTourismEncounter(state, encounter, revision, () => 0));
    expect(startTourismEncounter(state, encounter, revision, () => 0)).toBe(state);
    expect(state.activeTourism).toBeNull();
    expect(state.activeEncounter?.encounterId).toBe(encounter);
    const transcript: string[] = [];
    for (let i = 0; state.activeEncounter && i < 80; i++) {
      state = restore(state);
      const active = state.activeEncounter!;
      transcript.push(active.frame.text);
      expect(active.phase).toBe("story");
      expect(state.activeTourism).toBeNull();
      state = active.frame.choices.length
        ? chooseEncounter(state, choiceIndex, state.revision)
        : active.frame.ended
          ? finishEncounter(state, state.revision)
          : advanceEncounter(state, state.revision);
    }
    expect(state.activeEncounter).toBeNull();
    expect(state.activeTourism).toEqual(savedTourism);
    expect(state.completedEncounterIds).toContain(encounter);
    expect(getTourismEncounterAvailability(state, encounter).available).toBe(true);
    expect(state.ap).toBe(ap + 1);
    expect(state.claimedRewardIds).toEqual([...rewards, "victory_galleria_first"]);
    expect(state.travelBudget).toBe(budget);
    expect(state.inventory).toEqual(inventory);
    expect(state.encounterRewards[encounter]).toBeUndefined();
    // The family's exchange must not supply the bull's city, the roof's
    // materials, or the two squares asked by the three main questions.
    expect(transcript.join("\n")).not.toMatch(/トリノ|Turin|鉄|iron|ガラス|glass|ドゥオモ広場|スカラ広場/i);
    // A previous completion, including one from an older save, must not
    // prevent revisiting the conversation or award resources a second time.
    state = restore(startTourismEncounter(state, encounter, state.revision, () => 0));
    for (let i = 0; state.activeEncounter && i < 80; i++) {
      state = restore(state);
      const active = state.activeEncounter!;
      state = active.frame.choices.length
        ? chooseEncounter(state, (choiceIndex + 1) % 3, state.revision)
        : active.frame.ended
          ? finishEncounter(state, state.revision)
          : advanceEncounter(state, state.revision);
    }
    expect(state.activeEncounter).toBeNull();
    expect(state.activeTourism).toEqual(savedTourism);
    expect(state.completedEncounterIds.filter((id) => id === encounter)).toHaveLength(1);
    expect(state.ap).toBe(ap + 1);
    expect(state.claimedRewardIds).toEqual([...rewards, "victory_galleria_first"]);
    expect(state.travelBudget).toBe(budget);
    expect(state.inventory).toEqual(inventory);
    expect(state.encounterRewards[encounter]).toBeUndefined();
    state = restore(startTourismBattle(state, state.revision));
    expect(state.activeBattle?.battleId).toBe("milano_galleria_01");
    state = finishBattle(state);
    expect(state.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
    expect(state.battleRewardReceipt?.entries.some((item) => item.rewardId === "victory_galleria_first")).toBe(false);
  });

  it("does not award the shared AP again if the battle already granted it", () => {
    let state = exploreGalleria();
    state = finishBattle(startTourismBattle(state, state.revision));
    expect(state.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
    state = leaveBattle(state, state.revision);
    state = restore(openTourism(state, galleria));
    const ap = state.ap;
    const pending = state.pendingApRewards;
    const rewards = state.claimedRewardIds;
    state = restore(startTourismEncounter(state, encounter, state.revision, () => 0));
    for (let i = 0; state.activeEncounter && i < 80; i++) {
      state = restore(state);
      const active = state.activeEncounter!;
      state = active.phase === "quiz"
        ? answerEncounterQuiz(state, "A", state.revision)
        : active.phase === "feedback"
          ? advanceEncounter(state, state.revision)
        : active.frame.choices.length
        ? chooseEncounter(state, 0, state.revision)
        : active.frame.ended && active.phase === "outcome"
          ? finishEncounter(state, state.revision)
          : advanceEncounter(state, state.revision);
    }
    expect(state.activeEncounter).toBeNull();
    expect(state.activeTourism?.landmarkId).toBe(galleria);
    expect(state.ap).toBe(ap);
    expect(state.pendingApRewards).toEqual(pending);
    expect(state.claimedRewardIds).toEqual(rewards);
    expect(state.encounterRewards[encounter]).toBeUndefined();
  });

  it("returns to observation without rewards or a quiz when the player leaves", () => {
    let state = exploreGalleria();
    const before = { ap: state.ap, budget: state.travelBudget, rewards: [...state.claimedRewardIds] };
    state = restore(startTourismEncounter(state, encounter, state.revision, () => 0));
    for (let i = 0; state.activeEncounter && i < 80; i++) {
      const active = state.activeEncounter;
      expect(active.phase).toBe("story");
      state = active.frame.choices.length ? chooseEncounter(state, 2, state.revision)
        : active.frame.ended ? finishEncounter(state, state.revision)
          : advanceEncounter(state, state.revision);
      state = restore(state);
    }
    expect(state.activeTourism?.landmarkId).toBe(galleria);
    expect(state.completedEncounterIds).not.toContain(encounter);
    expect(state.ap).toBe(before.ap);
    expect(state.claimedRewardIds).toEqual(before.rewards);
    expect(state.travelBudget).toBe(before.budget);
    expect(state.encounterRewards[encounter]).toBeUndefined();
  });

  it("resumes an in-progress fortune_tour scene using its original fingerprint", () => {
    const index = encounters.encounters.findIndex((event) => event.id === encounter);
    const current = encounters.encounters[index];
    const previous = encounterCatalogSchema.parse(preSoundData).encounters.find((event) => event.id === encounter)!;
    let state: GameState;
    try {
      encounters.encounters[index] = previous;
      const exploring = exploreGalleria();
      state = startTourismEncounter(exploring, encounter, exploring.revision, () => 0);
      expect(state.activeEncounter?.storyId).toBe("encounters/galleria_fortune_tour");
    } finally {
      encounters.encounters[index] = current;
    }
    state = restore(state!);
    for (let step = 0; state.activeEncounter && step < 80; step++) {
      const active = state.activeEncounter;
      expect(active.phase).toBe("story");
      state = active.frame.choices.length ? chooseEncounter(state, 0, state.revision)
        : active.frame.ended ? finishEncounter(state, state.revision)
          : advanceEncounter(state, state.revision);
      state = restore(state);
    }
    expect(state.activeEncounter).toBeNull();
    expect(state.activeTourism?.landmarkId).toBe(galleria);
    expect(state.encounterRewards[encounter]).toBeUndefined();
  });
});
