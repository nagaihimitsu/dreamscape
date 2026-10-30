import { createLegacyJourneyGame as createGame } from "../../tests/fixtures/legacy-game";
import { describe, expect, it } from "vitest";
import fixtures from "../../tests/fixtures/phase3-saves.json";
import {
  episodes as allEpisodes,
  landmarks,
  rewardRules as allRewardRules,
  tourismClues,
} from "../content";
import { advanceBattle, answerBattle, validateGameState } from "../domain";
import {
  discoverClue,
  openTourism,
  skipTourismGuide,
  startTourismBattle,
} from "../domain/tourism";
import {
  loadGame,
  parseGameState,
  SAVE_KEY,
  saveGame,
  type StorageLike,
} from "./index";

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

/** Captured with the published Phase 3 domain, before tourism or journey rewards existed. */
describe("Phase 3 save compatibility", () => {
  it.each(Object.entries(fixtures))(
    "preserves existing play and AP in %s while queuing newly earned journey rewards",
    (_name, fixture) => {
      const raw = JSON.stringify(fixture);
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      const loaded = loadGame(storage);
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded")
        throw new Error("Real Phase 3 fixture failed to migrate");
      const {
        schemaVersion: _oldSchema,
        completedChapters: _oldChapters,
        claimedRewardIds: _oldRewards,
        ...protectedFields
      } = fixture;
      expect(loaded.state).toMatchObject({
        ...protectedFields,
        schemaVersion: 7,
        activeTourism: null,
        discoveredClueIds: [],
        visitedLandmarkIds: [],
        completedCityIds: [],
        completedGuideIds: [],
      });
      expect(loaded.state.activeBattle).toEqual(
        fixture.activeBattle
          ? { ...fixture.activeBattle, reasoning: null }
          : null,
      );
      expect(loaded.state.completedChapters).toEqual(
        fixture.battleRecords.length
          ? [episodes[0].legacyChapterId]
          : fixture.completedChapters,
      );
      expect(loaded.state.completedEpisodeIds).toEqual(
        fixture.battleRecords.length ? [episodes[0].id] : [],
      );
      const eligible = fixture.battleRecords.length
        ? rewardRules.filter((rule) => rule.trigger !== "guide_read")
        : [];
      expect(loaded.state.claimedRewardIds).toEqual([
        ...fixture.claimedRewardIds,
        ...eligible.map((rule) => rule.id),
      ]);
      expect(loaded.state.pendingApRewards).toEqual(
        eligible.map((rule) => ({
          rewardId: rule.id,
          earnedAp: rule.ap,
          remainingAp: rule.ap,
        })),
      );
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(parseGameState(JSON.stringify(loaded.state))).toEqual(
        loaded.state,
      );
    },
  );

  it.each(["intro", "question", "feedback", "reaction", "result"] as const)(
    "continues the existing %s battle without resetting answers, hints or records",
    (name) => {
      let state = validateGameState(fixtures[name]);
      const oldAnswers = state.activeBattle!.answers;
      for (let i = 0; state.activeBattle!.phase !== "result" && i < 100; i++) {
        state = parseGameState(JSON.stringify(state));
        state =
          state.activeBattle!.phase === "question"
            ? answerBattle(state, "A", state.revision)
            : advanceBattle(state, state.revision);
      }
      expect(state.activeBattle!.phase).toBe("result");
      expect(state.activeBattle!.answers.slice(0, oldAnswers.length)).toEqual(
        oldAnswers,
      );
      expect(state.battleRecords[0].attempts).toBe(1);
      const newlyFinished = fixtures[name].activeBattle.phase !== "result";
      const expectedReward = newlyFinished
        ? rewardRules
            .filter(
              (rule) =>
                rule.trigger === "battle_complete" ||
                rule.trigger === "episode_clear" ||
                (rule.trigger === "battle_score" &&
                  state.activeBattle!.score >= rule.minScore!),
            )
            .reduce((sum, rule) => sum + rule.ap, 0)
        : 0;
      expect(state.ap).toBe(fixtures[name].ap + expectedReward);
      expect(state.affection).toBe(fixtures[name].affection);
    },
  );

  it("commits schema 7 on first discovery and rejects stale tab changes", () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify(fixtures.question);
    storage.setItem(SAVE_KEY, raw);
    const migrated = parseGameState(raw);
    const visit = openTourism(migrated, landmarks[0].id);
    expect(saveGame(storage, visit, migrated)).toEqual({ ok: true });
    const exploring = skipTourismGuide(visit, visit.revision);
    expect(saveGame(storage, exploring, visit)).toEqual({ ok: true });
    const discovered = discoverClue(
      exploring,
      tourismClues[0].id,
      exploring.revision,
    );
    expect(saveGame(storage, discovered, exploring)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).schemaVersion).toBe(7);
    expect(
      saveGame(
        storage,
        startTourismBattle(exploring, exploring.revision),
        exploring,
      ).ok,
    ).toBe(false);
    expect(parseGameState(storage.getItem(SAVE_KEY)!)).toEqual(discovered);
    expect(discovered.activeBattle).toEqual({
      ...fixtures.question.activeBattle,
      reasoning: null,
    });
  });
});

describe("tourism saves protect inconsistent input", () => {
  it.each([
    "unknown-clue",
    "duplicate-clue",
    "unvisited-clue",
    "unknown-landmark",
    "hash",
    "snapshot",
    "frame",
    "exploring-with-guide-frame",
    "unknown-version",
  ])("retains raw %s data without deleting or overwriting it", (kind) => {
    let state = openTourism(createGame(), landmarks[0].id);
    if (kind.includes("clue")) {
      state = skipTourismGuide(state, state.revision);
      state = discoverClue(state, tourismClues[0].id, state.revision);
    }
    const corrupted = {
      ...structuredClone(state),
      schemaVersion: Number(state.schemaVersion),
    };
    const active = corrupted.activeTourism!;
    if (kind === "unknown-clue") corrupted.discoveredClueIds = ["missing"];
    if (kind === "duplicate-clue")
      corrupted.discoveredClueIds.push(corrupted.discoveredClueIds[0]);
    if (kind === "unvisited-clue") corrupted.visitedLandmarkIds = [];
    if (kind === "unknown-landmark") active.landmarkId = "missing";
    if (kind === "hash") active.contentHash = "outdated";
    if (kind === "snapshot") active.storyState = "{}";
    if (kind === "frame") active.frame!.text = "保存されていない台詞";
    if (kind === "exploring-with-guide-frame") active.phase = "exploring";
    if (kind === "unknown-version") corrupted.schemaVersion = 99;
    const raw = JSON.stringify(corrupted);
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, raw);
    storage.setItem("another-game", "keep");
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
    expect(saveGame(storage, state).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    expect(storage.getItem("another-game")).toBe("keep");
  });
  it("keeps incompatible legacy battle definitions untouched", () => {
    const corrupted = structuredClone(fixtures.question);
    corrupted.activeBattle!.contentHash = "incompatible-phase3";
    const raw = JSON.stringify(corrupted);
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, raw);
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });
});
