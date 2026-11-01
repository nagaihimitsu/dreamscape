import { describe, expect, it } from "vitest";
import phase5 from "../../tests/fixtures/phase5-saves.json";
import { battles, battleQuizzes, progression } from "../content";
import { createGame, validateGameState, type GameState } from "../domain/game";
import { legacyRomanceValues } from "../domain/romance-migration";
import {
  advanceBattle,
  answerBattle,
  startBattle,
  selectReasoningClue,
  submitBattleEvidence,
} from "../domain/battle";
import { loadGame, SAVE_KEY, type StorageLike } from ".";

const snapshot = (state: GameState) =>
  JSON.parse(JSON.stringify(state)) as GameState;
const battle = () =>
  battles.find((entry) => entry.reasoning?.kind === "connection")!;
function proof(): GameState {
  let state = startBattle(createGame(), battle().id);
  for (let i = 0; state.activeBattle?.phase !== "reasoning" && i < 100; i++) {
    state =
      state.activeBattle?.phase === "question"
        ? answerBattle(
            state,
            battleQuizzes[battle().quizId].questions[
              state.activeBattle.roundIndex
            ].correctOptionId,
            state.revision,
          )
        : advanceBattle(state, state.revision);
  }
  return state;
}
class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("Phase 5 to 6 save migration", () => {
  it.each(Object.entries(phase5))(
    "preserves the actual Phase 5 %s snapshot, AP, and A fingerprint",
    (_name, raw) => {
      const state = validateGameState(raw);
      expect(state).toEqual({
        ...raw,
        schemaVersion: 9,
        recoveryAfterRejection: false,
        completedRecoveryCount: 0,
        activeDate: raw.activeDate ? { ...raw.activeDate, resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [], responseSnapshot: null } : null,
        ...legacyRomanceValues(raw, progression),
        activeEpilogue: null,
        viewedEpilogueCityIds: [],
        legacyTrialAvailable: true,
        activeBattle: raw.activeBattle
          ? { ...raw.activeBattle, reasoning: null }
          : null,
      });
      expect(validateGameState(JSON.parse(JSON.stringify(state)))).toEqual(
        state,
      );
    },
  );

  it("keeps raw legacy bytes untouched until the next explicit save", () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify(phase5.battleFeedback);
    storage.setItem(SAVE_KEY, raw);
    const result = loadGame(storage);
    expect(result.status).toBe("loaded");
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });

  it("rejects inconsistent or bypassed reasoning without deleting its original save", () => {
    const initial = proof();
    let selected = initial;
    for (const id of battle().reasoning!.correctClueIds)
      selected = selectReasoningClue(selected, id, selected.revision);
    const accepted = submitBattleEvidence(selected, selected.revision);
    const invalid: GameState[] = [];
    const change = (base: GameState, mutate: (state: GameState) => void) => {
      const next = snapshot(base);
      mutate(next);
      invalid.push(next);
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
    change(initial, (s) => {
      s.activeBattle!.phase = "question";
    });
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
    });
    for (const state of invalid) {
      expect(() => validateGameState(state)).toThrow();
      const storage = new MemoryStorage();
      const raw = JSON.stringify(state);
      storage.setItem(SAVE_KEY, raw);
      expect(loadGame(storage).status).toBe("invalid");
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
    }
  });
});
