import { describe, expect, it } from "vitest";
import { battles, battleQuizzes, rewardRules } from "../content";
import { createGame, type GameState } from "../domain/game";
import { advanceBattle, answerBattle } from "../domain/battle";
import { startEpisode } from "../domain/chapter";
import { startTourismBattle } from "../domain/tourism";
import { loadGame, saveGame, SAVE_KEY, type StorageLike } from "./index";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function currentResult(): GameState {
  let state = startEpisode({ ...createGame(), ap: 12 });
  state = startTourismBattle(state, state.revision);
  for (let i = 0; state.activeBattle?.phase !== "result" && i < 200; i++) {
    const active = state.activeBattle!;
    const battle = battles.find((item) => item.id === active.battleId)!;
    state = active.phase === "question"
      ? answerBattle(state, battleQuizzes[battle.quizId].questions[active.roundIndex].correctOptionId, state.revision)
      : advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  expect(state.pendingApRewards.length).toBeGreaterThan(0);
  expect(state.battleRewardReceipt?.entries.length).toBeGreaterThan(0);
  return state;
}

describe("current reward and journey saves protect inconsistent input", () => {
  it.each(["unearned", "duplicate", "unknown", "remainder", "oversized", "city", "episode", "receipt", "receipt-amount", "version"])(
    "preserves raw %s data without overwriting it", (kind) => {
      const state = currentResult();
      const corrupted = { ...structuredClone(state), schemaVersion: Number(state.schemaVersion) };
      if (kind === "unearned") corrupted.claimedRewardIds.push(rewardRules.find((item) => item.trigger === "guide_read")!.id);
      if (kind === "duplicate") corrupted.pendingApRewards.push({ ...corrupted.pendingApRewards[0] });
      if (kind === "unknown") corrupted.pendingApRewards[0].rewardId = "missing";
      if (kind === "remainder") corrupted.pendingApRewards[0].remainingAp = corrupted.pendingApRewards[0].earnedAp + 1;
      if (kind === "oversized") corrupted.pendingApRewards[0].earnedAp = 1_000_000;
      if (kind === "city") corrupted.completedCityIds = ["milano"];
      if (kind === "episode") corrupted.completedEpisodeIds = [];
      if (kind === "receipt") corrupted.battleRewardReceipt!.battleRunId = "another-run";
      if (kind === "receipt-amount") corrupted.battleRewardReceipt!.entries[0].creditedAp += 1;
      if (kind === "version") corrupted.schemaVersion = 999;
      const raw = JSON.stringify(corrupted);
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      storage.setItem("another-game", "keep");
      expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
      expect(saveGame(storage, createGame()).ok).toBe(false);
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(storage.getItem("another-game")).toBe("keep");
    },
  );
});
