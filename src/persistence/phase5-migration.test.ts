import { describe, expect, it } from "vitest";
import fixtures from "../../tests/fixtures/phase4-saves.json";
import {
  episodes as allEpisodes,
  rewardRules as allRewardRules,
} from "../content";
import {
  createGame,
  enterFreeTime,
  claimPendingRewards,
  startDate,
  validateGameState,
} from "../domain";
import { loadGame, saveGame, SAVE_KEY, type StorageLike } from "./index";

const episodes = allEpisodes.filter(
  (episode) => episode.id === "milano_last_supper_episode",
);
const rewardRules = allRewardRules.filter(
  (rule) => rule.episodeId === episodes[0].id,
);

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
const pendingTotal = (state: ReturnType<typeof validateGameState>) =>
  state.pendingApRewards.reduce((sum, item) => sum + item.remainingAp, 0);

describe("published Phase 4 saves migrate without overwriting their checkpoints", () => {
  it.each(Object.entries(fixtures))(
    "preserves wallet and all active progress in %s",
    (_name, fixture) => {
      const raw = JSON.stringify(fixture);
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      const loaded = loadGame(storage);
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded")
        throw new Error("Actual Phase 4 save failed to load");
      const next = loaded.state;
      expect(next.schemaVersion).toBe(9);
      for (const key of [
        "playerName",
        "heroineName",
        "revision",
        "ap",
        "affection",
        "romanceStage",
        "memories",
        "playedDateIds",
        "unlockedEventIds",
        "confessionStatus",
        "endingReached",
        "activeDate",
        "battleRecords",
        "activeTourism",
        "visitedLandmarkIds",
        "discoveredClueIds",
      ] as const) {
        if (key === "activeDate" && fixture.activeDate)
          expect(next.activeDate, key).toMatchObject({ ...fixture.activeDate, resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [], responseSnapshot: null });
        else expect(next[key], key).toEqual(fixture[key]);
      }
      expect(next.activeBattle).toEqual(
        fixture.activeBattle
          ? { ...fixture.activeBattle, reasoning: null }
          : null,
      );
      expect(next.completedCityIds).toEqual([]);
      expect(next.completedGuideIds).toEqual([]); // A visit may have skipped its guide.
      expect(next.claimedRewardIds).toEqual(
        expect.arrayContaining(fixture.claimedRewardIds),
      );
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(validateGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
    },
  );

  it("offers verified old battle entitlements once without resetting AP or awarding a city clear", () => {
    const state = validateGameState(fixtures.result);
    expect(state.ap).toBe(fixtures.result.ap);
    expect(state.completedEpisodeIds).toEqual([episodes[0].id]);
    expect(state.completedChapters).toContain(episodes[0].legacyChapterId);
    expect(pendingTotal(state)).toBe(6);
    expect(
      state.battleRewardReceipt?.entries.every(
        (entry) => entry.creditedAp === 0,
      ),
    ).toBe(true);
    const received = claimPendingRewards(state, state.revision);
    expect(received.ap).toBe(state.ap + 6);
    expect(received.pendingApRewards).toEqual([]);
    expect(claimPendingRewards(received, state.revision)).toBe(received);
    expect(claimPendingRewards(received, received.revision)).toBe(received);
    expect(received.activeBattle).toEqual({
      ...fixtures.result.activeBattle,
      reasoning: null,
    });
    expect(validateGameState(JSON.parse(JSON.stringify(received)))).toEqual(
      received,
    );
  });

  it("never gives the legacy four AP twice, even at the cap with a finished battle", () => {
    const raw = {
      ...fixtures.result,
      ap: 12,
      completedChapters: fixtures.legacyChapter.completedChapters,
      claimedRewardIds: fixtures.legacyChapter.claimedRewardIds,
    };
    let state = validateGameState(raw);
    expect(state.ap).toBe(12);
    expect(pendingTotal(state)).toBe(2);
    expect(
      state.pendingApRewards.some(
        (item) => item.rewardId === "chapter_milano_first_clear",
      ),
    ).toBe(false);
    expect(claimPendingRewards(state, state.revision)).toBe(state);
    state = enterFreeTime(state, state.revision);
    state = startDate(state, "milano_cafe_01");
    expect(state.ap).toBe(12);
    expect(state.pendingApRewards).toEqual([]);
    expect(
      state.claimedRewardIds.filter(
        (id) => id === "chapter_milano_first_clear",
      ),
    ).toHaveLength(1);
    expect(validateGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("does not infer episode or city completion from the old mock-chapter token alone", () => {
    const state = validateGameState(fixtures.legacyChapter);
    expect(state.completedChapters).toEqual(
      fixtures.legacyChapter.completedChapters,
    );
    expect(state.completedEpisodeIds).toEqual([]);
    expect(state.completedCityIds).toEqual([]);
    expect(state.pendingApRewards).toEqual([]);
  });
});

describe("new reward and chapter inconsistencies are retained for recovery", () => {
  it.each([
    "unearned",
    "duplicate",
    "unknown",
    "remainder",
    "oversized",
    "city",
    "episode",
    "receipt",
    "receipt-amount",
    "version",
  ])("preserves raw %s data", (kind) => {
    const state = validateGameState(fixtures.result);
    const corrupted = {
      ...structuredClone(state),
      schemaVersion: Number(state.schemaVersion),
    };
    if (kind === "unearned")
      corrupted.claimedRewardIds.push(
        rewardRules.find((item) => item.trigger === "guide_read")!.id,
      );
    if (kind === "duplicate")
      corrupted.pendingApRewards.push({ ...corrupted.pendingApRewards[0] });
    if (kind === "unknown") corrupted.pendingApRewards[0].rewardId = "missing";
    if (kind === "remainder")
      corrupted.pendingApRewards[0].remainingAp =
        corrupted.pendingApRewards[0].earnedAp + 1;
    if (kind === "oversized")
      corrupted.pendingApRewards[0].earnedAp = 1_000_000;
    if (kind === "city") corrupted.completedCityIds = ["milano"];
    if (kind === "episode") corrupted.completedEpisodeIds = [];
    if (kind === "receipt")
      corrupted.battleRewardReceipt!.battleRunId = "another-run";
    if (kind === "receipt-amount")
      corrupted.battleRewardReceipt!.entries[0].creditedAp += 1;
    if (kind === "version") corrupted.schemaVersion = 999;
    const raw = JSON.stringify(corrupted);
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, raw);
    storage.setItem("another-game", "keep");
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    expect(storage.getItem("another-game")).toBe("keep");
  });
});
