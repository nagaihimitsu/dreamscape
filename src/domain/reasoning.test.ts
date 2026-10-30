import { describe, expect, it } from "vitest";
import { battles, battleQuizzes, type BattleDefinition } from "../content";
import {
  startBattle,
  advanceBattle,
  answerBattle,
  leaveBattle,
  getReasoningContext,
  pressBattleClaim,
  selectReasoningClue,
  submitBattleEvidence,
  toggleBattleHint,
} from "./battle";
import { createGame, validateGameState, type GameState } from "./game";
import { canAccessFreeTime } from "./chapter";
import phase5 from "../../tests/fixtures/phase5-saves.json";

const special = (kind: "contradiction" | "connection") =>
  battles.find((battle) => battle.reasoning?.kind === kind)!;
const roundTrip = (state: GameState) => {
  const restored = validateGameState(JSON.parse(JSON.stringify(state)));
  expect(restored).toEqual(state);
  return restored;
};
function unchangedProgress(state: GameState) {
  const {
    revision,
    activeBattle,
    battleRecords,
    battleRewardReceipt,
    ...rest
  } = state;
  return rest;
}
function readScene(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; state.activeBattle?.phase === "dialogue" && i < 100; i++) {
    state = roundTrip(state);
    state = advanceBattle(state, state.revision);
  }
  return roundTrip(state);
}
function reachProof(
  battle: BattleDefinition,
  initial = createGame(),
): GameState {
  let state = startBattle(initial, battle.id);
  for (let i = 0; state.activeBattle?.phase !== "reasoning" && i < 200; i++) {
    state = roundTrip(state);
    state =
      state.activeBattle!.phase === "question"
        ? answerBattle(
            state,
            battleQuizzes[battle.quizId].questions[
              state.activeBattle!.roundIndex
            ].correctOptionId,
            state.revision,
          )
        : advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("reasoning");
  return roundTrip(state);
}
function select(state: GameState, ids: string[]): GameState {
  for (const id of ids)
    state = roundTrip(selectReasoningClue(state, id, state.revision));
  return state;
}
function finish(
  initial: GameState,
  battle: BattleDefinition,
  score: number,
): GameState {
  let state = initial;
  for (let i = 0; state.activeBattle?.phase !== "result" && i < 200; i++) {
    state = roundTrip(state);
    const active = state.activeBattle!;
    if (active.phase === "reasoning") {
      state = select(state, battle.reasoning!.correctClueIds);
      state = submitBattleEvidence(state, state.revision);
    } else if (active.phase === "question") {
      const q = battleQuizzes[battle.quizId].questions[active.roundIndex];
      state = answerBattle(
        state,
        active.roundIndex < score
          ? q.correctOptionId
          : q.options.find((o) => o.id !== q.correctOptionId)!.id,
        state.revision,
      );
    } else state = advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  return roundTrip(state);
}

describe("small proof steps inside three-round battles", () => {
  it.each(["contradiction", "connection"] as const)(
    "keeps %s proof and its claim available without tourism discoveries",
    (kind) => {
      const battle = special(kind);
      const initial = createGame("航", "澪");
      const started = startBattle(initial, battle.id);
      expect(getReasoningContext(started)?.claimText).toMatch(
        /[\p{Script=Han}]/u,
      );
      expect(getReasoningContext(started)?.pressedText).toBeNull();
      let state = reachProof(battle, initial);
      expect(state.discoveredClueIds).toEqual([]);
      expect(answerBattle(state, "A", state.revision)).toBe(state);
      expect(submitBattleEvidence(state, state.revision)).toBe(state);
      expect(selectReasoningClue(state, "missing", state.revision)).toBe(state);
      const clueId = battle.reasoning!.correctClueIds[0];
      const before = state;
      state = selectReasoningClue(state, clueId, before.revision);
      expect(selectReasoningClue(state, clueId, before.revision)).toBe(state);
      state = roundTrip(state);
      expect(state.activeBattle?.reasoning?.selectedClueIds).toEqual([clueId]);
      expect(unchangedProgress(state)).toEqual(unchangedProgress(initial));
    },
  );

  it.each(["contradiction", "connection"] as const)(
    "clears the prior question hint when entering %s without changing its recorded use",
    (kind) => {
      const battle = special(kind);
      let state = startBattle(createGame(), battle.id);
      while (state.activeBattle?.phase !== "reasoning") {
        state = roundTrip(state);
        if (state.activeBattle!.phase === "question") {
          state = toggleBattleHint(state, state.revision);
          const q =
            battleQuizzes[battle.quizId].questions[
              state.activeBattle!.roundIndex
            ];
          state = answerBattle(state, q.correctOptionId, state.revision);
        } else state = advanceBattle(state, state.revision);
      }
      state = roundTrip(state);
      expect(
        state.activeBattle!.answers.every((answer) => answer.hintUsed),
      ).toBe(true);
      expect(state.activeBattle!.hintUsed).toBe(false);
      expect(state.activeBattle!.hintOpen).toBe(false);
    },
  );

  it("B can press, reject every unrelated clue, then present the door evidence without a penalty", () => {
    const battle = special("contradiction");
    let state = reachProof(battle);
    const score = state.activeBattle!.score;
    const first = state;
    state = pressBattleClaim(state, state.revision);
    expect(pressBattleClaim(state, first.revision)).toBe(state);
    expect(getReasoningContext(state)?.pressedText).toMatch(
      /[\p{Script=Han}]/u,
    );
    state = readScene(state);
    for (const clueId of battle.reasoning!.caseClueIds.filter(
      (id) => !battle.reasoning!.correctClueIds.includes(id),
    )) {
      state = select(state, [clueId]);
      const before = state;
      state = submitBattleEvidence(state, state.revision);
      expect(submitBattleEvidence(state, before.revision)).toBe(state);
      expect(state.activeBattle?.reasoning?.status).toBe("incorrect");
      expect(state.activeBattle?.dialogueScene).toBe(
        battle.reasoning!.failureScene,
      );
      state = readScene(state);
      expect(state.activeBattle?.phase).toBe("reasoning");
      expect(state.activeBattle?.score).toBe(score);
      expect(state.ap).toBe(0);
    }
    state = select(state, battle.reasoning!.correctClueIds);
    state = submitBattleEvidence(state, state.revision);
    expect(state.activeBattle?.reasoning?.status).toBe("accepted");
    const accepted = state;
    expect(
      selectReasoningClue(
        state,
        battle.reasoning!.correctClueIds[0],
        state.revision,
      ),
    ).toBe(accepted);
    state = readScene(state);
    expect(state.activeBattle?.phase).toBe("question");
    expect(state.activeBattle?.score).toBe(score);
    const question =
      battleQuizzes[battle.quizId].questions[state.activeBattle!.roundIndex];
    const answered = answerBattle(
      state,
      question.correctOptionId,
      state.revision,
    );
    expect(
      answerBattle(answered, question.correctOptionId, state.revision),
    ).toBe(answered);
    expect(answered.activeBattle?.score).toBe(score + 1);
    roundTrip(answered);
  });

  it("C accepts only the exact two clues, in either order, while preserving a partial choice", () => {
    const battle = special("connection");
    const config = battle.reasoning!;
    for (let a = 0; a < config.caseClueIds.length; a++)
      for (let b = a + 1; b < config.caseClueIds.length; b++) {
        let state = reachProof(battle);
        const ids = [config.caseClueIds[b], config.caseClueIds[a]];
        state = select(state, [ids[0]]);
        expect(submitBattleEvidence(state, state.revision)).toBe(state);
        state = select(state, [ids[1]]);
        const third = config.caseClueIds.find((id) => !ids.includes(id))!;
        expect(selectReasoningClue(state, third, state.revision)).toBe(state);
        expect(pressBattleClaim(state, state.revision)).toBe(state);
        state = submitBattleEvidence(state, state.revision);
        const correct = ids.every((id) => config.correctClueIds.includes(id));
        expect(state.activeBattle?.reasoning?.status).toBe(
          correct ? "accepted" : "incorrect",
        );
        state = readScene(state);
        expect(state.activeBattle?.phase).toBe(
          correct ? "question" : "reasoning",
        );
        if (!correct) {
          state = select(state, ids);
          expect(state.activeBattle?.reasoning?.selectedClueIds).toEqual([]);
          state = select(state, config.correctClueIds);
          state = readScene(submitBattleEvidence(state, state.revision));
          expect(state.activeBattle?.phase).toBe("question");
        }
        expect(state.activeBattle?.score).toBe(2);
      }
  });

  it.each([0, 1, 2, 3])(
    "finishes/replays both special battles with %i correct and no chapter or AP effects",
    (score) => {
      for (const kind of ["contradiction", "connection"] as const) {
        const battle = special(kind);
        const initial = createGame();
        let state = finish(startBattle(initial, battle.id), battle, score);
        expect(state.activeBattle?.score).toBe(score);
        expect(state.battleRecords).toEqual([
          {
            battleId: battle.id,
            attempts: 1,
            firstScore: score,
            bestScore: score,
            lastScore: score,
          },
        ]);
        expect(unchangedProgress(state)).toEqual(unchangedProgress(initial));
        expect(state.battleRewardReceipt).toBeNull();
        expect(() =>
          validateGameState({
            ...state,
            battleRewardReceipt: {
              battleRunId: state.activeBattle!.runId,
              entries: [],
            },
          }),
        ).toThrow();
        expect(canAccessFreeTime(state)).toBe(false);
        const result = state;
        expect(advanceBattle(result, result.revision)).toBe(result);
        state = finish(startBattle(result, battle.id), battle, 3);
        expect(state.battleRecords[0].attempts).toBe(2);
        expect(state.battleRecords[0].bestScore).toBe(3);
        expect(unchangedProgress(state)).toEqual(unchangedProgress(initial));
        state = leaveBattle(state, state.revision);
        expect(state.activeBattle).toBeNull();
        roundTrip(state);
      }
    },
  );

  it("keeps an existing ending and pending AP untouched while either special battle is played", () => {
    for (const snapshot of [phase5.ending, phase5.pendingResult])
      for (const kind of ["contradiction", "connection"] as const) {
        const initial = validateGameState(snapshot);
        const battle = special(kind);
        const state = finish(startBattle(initial, battle.id), battle, 3);
        expect(unchangedProgress(state)).toEqual(unchangedProgress(initial));
      }
  });
});
