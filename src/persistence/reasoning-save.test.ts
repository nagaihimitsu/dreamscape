import { describe, expect, it } from "vitest";
import { battles, battleQuizzes } from "../content";
import { createGame, validateGameState, type GameState } from "../domain/game";
import { advanceBattle, answerBattle, startBattle, selectReasoningClue, submitBattleEvidence } from "../domain/battle";
import { loadGame, SAVE_KEY, type StorageLike } from ".";

const snapshot = (state: GameState) => JSON.parse(JSON.stringify(state)) as GameState;
const battle = () => battles.find((entry) => entry.id === "milano_brera_c01")!;
function proof(): GameState {
  let state = startBattle(createGame(), battle().id);
  for (let i = 0; state.activeBattle?.phase !== "reasoning" && i < 100; i++) {
    state = state.activeBattle?.phase === "question"
      ? answerBattle(state, battleQuizzes[battle().quizId].questions[state.activeBattle.roundIndex].correctOptionId, state.revision)
      : advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("reasoning");
  return state;
}
class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("reasoning save protection", () => {
  it("rejects inconsistent or bypassed reasoning without deleting its original save", () => {
    const initial = proof();
    let selected = initial;
    for (const id of battle().reasoning!.correctClueIds)
      selected = selectReasoningClue(selected, id, selected.revision);
    const accepted = submitBattleEvidence(selected, selected.revision);
    const invalid: Array<{ state: GameState; message: string }> = [];
    const progressMismatch = "保存された推理の進行が一致しません。";
    const change = (base: GameState, mutate: (state: GameState) => void, message = progressMismatch) => {
      const next = snapshot(base);
      mutate(next);
      invalid.push({ state: next, message });
    };
    change(initial, (s) => {
      s.activeBattle!.reasoning = null;
    });
    change(initial, (s) => {
      s.activeBattle!.reasoning!.selectedClueIds = ["missing"];
    });
    change(initial, (s) => {
      s.activeBattle!.reasoning!.statementId = "unrelated";
    });
    change(initial, (s) => {
      s.activeBattle!.reasoning!.pressed = true;
    });
    change(initial, (s) => {
      s.activeBattle!.reasoning!.status = "accepted";
    });
    // The saved story stops at the reasoning's call, not at a quiz's.
    change(initial, (s) => {
      s.activeBattle!.phase = "question";
    }, "クイズの会話の位置が一致しません。");
    change(selected, (s) => {
      s.activeBattle!.reasoning!.selectedClueIds = [
        battle().reasoning!.correctClueIds[0],
        battle().reasoning!.correctClueIds[0],
      ];
    });
    change(accepted, (s) => {
      s.activeBattle!.reasoning!.submittedClueIds = [];
    });
    change(accepted, (s) => {
      s.activeBattle!.reasoning!.status = "incorrect";
    });
    change(accepted, (s) => {
      s.activeBattle!.contentHash = "changed-evidence";
    }, "クイズが更新されています。以前の途中データは保管されています。");
    for (const { state, message } of invalid) {
      expect(() => validateGameState(state)).toThrow(message);
      const storage = new MemoryStorage();
      const raw = JSON.stringify(state);
      storage.setItem(SAVE_KEY, raw);
      expect(loadGame(storage).status).toBe("invalid");
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
    }
  });
});
