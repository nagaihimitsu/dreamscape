import { afterEach, beforeEach, describe, expect, it } from "vitest";
import galleria from "../../tests/fixtures/galleria-stage2-pool.json";
import { battleQuizzes, battles, rewardRules } from "../content";
import { createGame, validateGameState, type GameState } from "./game";
import { advanceBattle, answerBattle, startBattle } from "./battle";
import { isRewardEarned } from "./chapter";
import { earnRewards, settlePendingAp } from "./rewards";
import { advanceEncounter, answerEncounterQuiz, chooseEncounter, finishEncounter, startEncounter } from "./encounter";
import { encounters } from "../content/encounters";
import { encounterCatalogSchema } from "../content/encounter-schemas";
import publishedEncounterData from "../../content/legacy/encounters_before_galleria_integration.json";

const rewardId = "victory_galleria_first";
const cultureId = "galleria_fortune";
const scoreRule = rewardRules.find((rule) => rule.id === rewardId)!;
const credit = (state: GameState) => earnRewards(state, [rewardId]).state;
const count = (state: GameState) => state.claimedRewardIds.filter((id) => id === rewardId).length;

function finishGalleriaBattle(initial: GameState, score: number): GameState {
  let state = startBattle(initial, "milano_galleria_01");
  expect(state.activeBattle?.battleId).toBe("milano_galleria_01");
  const quiz = battleQuizzes[battles.find((battle) => battle.id === "milano_galleria_01")!.quizId];
  for (let n = 0; state.activeBattle?.phase !== "result" && n < 150; n++) {
    const battle = state.activeBattle!;
    state = battle.phase === "question"
      ? answerBattle(state, battle.roundIndex < score
        ? quiz.questions[battle.roundIndex].correctOptionId
        : quiz.questions[battle.roundIndex].options.find((option) => option.id !== quiz.questions[battle.roundIndex].correctOptionId)!.id,
      state.revision)
      : advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  return state;
}

function finishCulture(initial: GameState, answer = "B", roll = 9999): GameState {
  let state = startEncounter(initial, cultureId, () => roll);
  expect(state.activeEncounter?.encounterId).toBe(cultureId);
  for (let n = 0; state.activeEncounter && n < 150; n++) {
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    const active = state.activeEncounter!;
    if (active.phase === "quiz") state = answerEncounterQuiz(state, answer, state.revision);
    else if (active.phase === "feedback") state = advanceEncounter(state, state.revision);
    else if (active.frame.choices.length) state = chooseEncounter(state, 2, state.revision);
    else if (active.frame.ended && (active.phase === "outcome")) state = finishEncounter(state, state.revision);
    else state = advanceEncounter(state, state.revision);
  }
  expect(state.activeEncounter).toBeNull();
  return validateGameState(JSON.parse(JSON.stringify(state)));
}

describe("formerly published Galleria score and cultural encounter AP compatibility", () => {
  const currentEntries = [...encounters.encounters];
  beforeEach(() => {
    encounters.encounters.splice(0, encounters.encounters.length, ...encounterCatalogSchema.parse(publishedEncounterData).encounters);
  });
  afterEach(() => { encounters.encounters.splice(0, encounters.encounters.length, ...currentEntries); });
  it("retains the existing ID and permits either score or completed culture", () => {
    expect(scoreRule).toMatchObject({ trigger: "battle_score", ap: 1, minScore: 2 });
    const old = validateGameState(galleria);
    expect(old.completedEncounterIds).toEqual([]);
    expect(isRewardEarned(old, scoreRule)).toBe(false);
    expect(isRewardEarned({ ...old, completedEncounterIds: [cultureId] }, scoreRule)).toBe(true);
    const highScore = finishGalleriaBattle(old, 2);
    expect(isRewardEarned(highScore, scoreRule)).toBe(true);
    expect(highScore.ap).toBe(old.ap + 1);
    expect(count(highScore)).toBe(1);
  });

  it("does not add a second AP when the culture route precedes a high-score battle", () => {
    const old = validateGameState(galleria);
    const culture = credit({ ...old, completedEncounterIds: [cultureId] });
    expect(culture.ap).toBe(old.ap + 1);
    expect(count(culture)).toBe(1);
    const result = finishGalleriaBattle(culture, 3);
    expect(result.ap).toBe(culture.ap);
    expect(count(result)).toBe(1);
    expect(result.battleRewardReceipt?.entries.some((entry) => entry.rewardId === rewardId)).toBe(false);
  });

  it("awards the shared AP on a real cultural outing even after an incorrect cultural answer", () => {
    const old = validateGameState(galleria);
    const state = finishCulture(old, "A");
    expect(state.completedEncounterIds).toContain(cultureId);
    expect(state.ap).toBe(old.ap + 1);
    expect(count(state)).toBe(1);
    expect(state.encounterRewards[cultureId]).toBeUndefined();
    const replayed = finishCulture(state, "B");
    expect(replayed.ap).toBe(state.ap);
    expect(count(replayed)).toBe(1);
  });

  it("can save at every step of a winning cultural quiz", () => {
    const state = finishCulture(validateGameState(galleria), "B", 0);
    expect(state.encounterRewards[cultureId]?.won).toBe(true);
    expect(state.inventory.galleria_ticket).toBe("held");
  });

  it("does not add a second AP when the high-score battle precedes the culture route", () => {
    const highScore = finishGalleriaBattle(validateGameState(galleria), 2);
    const afterCulture = credit({ ...highScore, completedEncounterIds: [cultureId] });
    expect(afterCulture.ap).toBe(highScore.ap);
    expect(afterCulture.pendingApRewards).toEqual(highScore.pendingApRewards);
    expect(count(afterCulture)).toBe(1);
  });

  it("preserves pending overflow and never duplicates it when both routes are achieved", () => {
    const old = { ...validateGameState(galleria), ap: 12, completedEncounterIds: [cultureId] };
    let state = credit(old);
    expect(state.ap).toBe(12);
    expect(state.pendingApRewards).toContainEqual({ rewardId, earnedAp: 1, remainingAp: 1 });
    state = finishGalleriaBattle(state, 3);
    expect(count(state)).toBe(1);
    expect(state.pendingApRewards.filter((reward) => reward.rewardId === rewardId)).toHaveLength(1);
    state = settlePendingAp({ ...state, ap: 11 });
    expect(state.ap).toBe(12);
    expect(state.pendingApRewards).toEqual([]);
    expect(credit(state)).toEqual(state);
  });

  it("does not invent a culture completion or a score reward when migrating an old low-score save", () => {
    const migrated = validateGameState(galleria);
    expect(migrated.ap).toBe(galleria.ap);
    expect(migrated.claimedRewardIds).toEqual(galleria.claimedRewardIds);
    expect(migrated.pendingApRewards).toEqual(galleria.pendingApRewards);
    expect(migrated.completedEncounterIds).toEqual([]);
    expect(count(migrated)).toBe(0);
    expect(isRewardEarned(migrated, scoreRule)).toBe(false);
    expect(createGame().claimedRewardIds).not.toContain(rewardId);
  });

  it.each([2, 12])("preserves an already claimed v9 score reward at %i AP", (ap) => {
    const result = finishGalleriaBattle({ ...validateGameState(galleria), ap }, 2);
    const { travelBudget: _budget, inventory: _inventory, completedEncounterIds: _encounters,
      encounterRewards: _encounterRewards, activeEncounter: _activeEncounter, updatedDateIds: _updatedDateIds, ...old } = result;
    const migrated = validateGameState({ ...old, schemaVersion: 9 });
    expect(migrated.ap).toBe(result.ap);
    expect(migrated.claimedRewardIds).toEqual(result.claimedRewardIds);
    expect(migrated.pendingApRewards).toEqual(result.pendingApRewards);
    expect(migrated.completedEncounterIds).toEqual([]);
    expect(migrated.activeBattle).toEqual(result.activeBattle);
    expect(count(migrated)).toBe(1);
    const afterCulture = credit({ ...migrated, completedEncounterIds: [cultureId] });
    expect(afterCulture.ap).toBe(migrated.ap);
    expect(afterCulture.pendingApRewards).toEqual(migrated.pendingApRewards);
  });
});
