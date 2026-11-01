import { describe, expect, it } from "vitest";
import { battles, battleQuizzes, landmarks, tourismClues } from "../content";
import { createGame, validateGameState, type GameState } from "./game";
import { advanceBattle, answerBattle, getReasoningContext, pressBattleClaim, selectReasoningClue, startBattle, submitBattleEvidence } from "./battle";
import phase6 from "../../tests/fixtures/phase6-saves.json";

const ids = ["milano_la_scala_b01", "milano_brera_c01"] as const;
const reload = (s: GameState) => validateGameState(JSON.parse(JSON.stringify(s)));
function progressDialogue(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; i < 150 && state.activeBattle?.phase === "dialogue"; i++) state = reload(advanceBattle(state, state.revision));
  return state;
}
function proof(id: typeof ids[number]): GameState {
  let state = startBattle(createGame(), id);
  for (let i = 0; i < 150 && state.activeBattle?.phase !== "reasoning"; i++) {
    state = progressDialogue(state);
    if (state.activeBattle?.phase === "question") {
      const battle = battles.find((entry) => entry.id === id)!;
      const question = battleQuizzes[battle.quizId].questions[state.activeBattle.roundIndex];
      state = reload(answerBattle(state, question.correctOptionId, state.revision));
      state = reload(advanceBattle(state, state.revision));
    }
  }
  expect(state.activeBattle?.phase).toBe("reasoning");
  return state;
}

describe("new Milan reasoning cases", () => {
  it("uses two different actual places and independent evidence and quizzes", () => {
    const cases = ids.map((id) => battles.find((battle) => battle.id === id)!);
    expect(cases.map((battle) => battle.landmarkId)).toEqual(["la_scala_case", "brera_case"]);
    expect(new Set(cases.map((battle) => battle.quizId)).size).toBe(2);
    for (const battle of cases) {
      const landmark = landmarks.find((item) => item.id === battle.landmarkId)!;
      expect(landmark.id).not.toBe("last_supper");
      expect(battleQuizzes[battle.quizId].landmarkId).toBe(landmark.id);
      for (const clueId of battle.reasoning!.caseClueIds) {
        const clue = tourismClues.find((item) => item.id === clueId)!;
        expect(clue.landmarkId).toBe(landmark.id);
        expect(clue.descriptionJa).not.toMatch(/最後の晩餐|レオナルド|使徒/);
        expect(clue.sources.length).toBeGreaterThan(0);
      }
    }
  });
  it.each(ids)("%s allows wrong evidence to be retried before scoring the English answer", (id) => {
    const battle = battles.find((entry) => entry.id === id)!;
    const config = battle.reasoning!;
    let state = proof(id);
    expect(state.discoveredClueIds).toEqual([]);
    const claim = getReasoningContext(state)!.claimText;
    expect(claim).not.toMatch(/最後の晩餐|レオナルド|使徒/);
    if (config.kind === "contradiction") state = progressDialogue(pressBattleClaim(state, state.revision));
    const before = state.activeBattle!.score;
    const incorrectIds = config.caseClueIds.filter((clue) => !config.correctClueIds.includes(clue)).slice(0, config.correctClueIds.length);
    expect(incorrectIds).toHaveLength(config.correctClueIds.length);
    for (const clue of incorrectIds) state = reload(selectReasoningClue(state, clue, state.revision));
    state = reload(submitBattleEvidence(state, state.revision));
    expect(state.activeBattle!.reasoning!.status).toBe("incorrect");
    state = progressDialogue(state);
    expect(state.activeBattle!.phase).toBe("reasoning");
    for (const clue of incorrectIds) state = selectReasoningClue(state, clue, state.revision);
    for (const clue of config.correctClueIds) state = reload(selectReasoningClue(state, clue, state.revision));
    state = reload(submitBattleEvidence(state, state.revision));
    expect(state.activeBattle!.reasoning!.status).toBe("accepted");
    state = progressDialogue(state);
    expect(state.activeBattle!.phase).toBe("question");
    const question = battleQuizzes[battle.quizId].questions[config.roundIndex];
    const wrong = question.options.find((option) => option.id !== question.correctOptionId)!;
    state = reload(answerBattle(state, wrong.id, state.revision));
    expect(state.activeBattle!.score).toBe(before);
    expect(state.activeBattle!.answers.at(-1)!.correct).toBe(false);
  });
  it.each(["B_selected", "C_selected"] as const)("still restores old %s evidence and its old case", (id) => {
    const state = validateGameState(phase6[id]);
    expect(state.activeBattle!.battleId).toBe(`milano_last_supper_${id[0].toLowerCase()}01`);
    expect(state.activeBattle!.reasoning!.selectedClueIds).toEqual(phase6[id].activeBattle.reasoning.selectedClueIds);
    expect(reload(state).activeBattle).toEqual(state.activeBattle);
  });
});
