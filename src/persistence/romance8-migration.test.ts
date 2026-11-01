import { describe, expect, it } from "vitest";
import phase1 from "../../tests/fixtures/phase1-saves.json";
import phase2 from "../../tests/fixtures/phase2-saves.json";
import phase3 from "../../tests/fixtures/phase3-saves.json";
import phase4 from "../../tests/fixtures/phase4-saves.json";
import phase5 from "../../tests/fixtures/phase5-saves.json";
import phase6 from "../../tests/fixtures/phase6-saves.json";
import phase7 from "../../tests/fixtures/phase7-free-time.json";
import castle from "../../tests/fixtures/castle-clear-unplayed.json";
import { advanceDate, canConfessSuccessfully, chooseDate, createGame, finishDate, getDateAvailability, isEventVisible, setNames, startDate } from "../domain/game";
import { battles, battleQuizzes } from "../content";
import { startEpisode, enterFreeTime } from "../domain/chapter";
import { advanceBattle, answerBattle } from "../domain/battle";
import { skipTourismGuide, startTourismBattle } from "../domain/tourism";
import { beginStory, storyFingerprint } from "../story/runtime";
import { loadGame, parseGameState, saveGame, SAVE_KEY, type StorageLike } from ".";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const snapshots = [phase1, phase2, phase3, phase4, phase5, phase6, phase7]
  .flatMap((fixture) => Object.entries(fixture).map(([name, state]) => [name, state] as const));
snapshots.push(["phase7_castle_unplayed", castle]);

describe("version 8 romance compatibility", () => {
  it.each(snapshots)("loads the published %s checkpoint without rewriting the original", (_name, raw) => {
    const storage = new MemoryStorage();
    const original = JSON.stringify(raw);
    storage.setItem(SAVE_KEY, original);
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") throw new Error("Published checkpoint was rejected");
    const state = loaded.state;
    expect(state.schemaVersion).toBe(11);
    expect(state).toMatchObject({
      playerName: raw.playerName,
      heroineName: raw.heroineName,
      ap: raw.ap,
      affection: raw.affection,
      playedDateIds: raw.playedDateIds,
      memories: raw.memories,
    });
    if ("confessionStatus" in raw) expect(state.confessionStatus).toBe(raw.confessionStatus);
    if ("endingReached" in raw) expect(state.endingReached).toBe(raw.endingReached);
    if (raw.schemaVersion !== 1) expect(state.romanceStage).toBe(raw.romanceStage);
    if (raw.activeDate) expect(state.activeDate).toMatchObject(raw.activeDate);
    if ("activeBattle" in raw && raw.activeBattle) expect(state.activeBattle).toMatchObject(raw.activeBattle);
    if ("activeTourism" in raw) expect(state.activeTourism).toEqual(raw.activeTourism);
    if ("activeEpilogue" in raw) expect(state.activeEpilogue).toEqual(raw.activeEpilogue);
    expect(state.lastRejectedDateCount).toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBe(original);
    expect(parseGameState(JSON.stringify(state))).toEqual(state);
  });

  it("finishes an already accepted old in-progress confession exactly once", () => {
    const old = phase2.confessionPending;
    const pending = parseGameState(JSON.stringify(old));
    expect(pending.activeDate?.pendingOutcome).toBe("accepted");
    expect(canConfessSuccessfully(pending)).toBe(true);
    const result = finishDate(pending, pending.revision);
    expect(result.confessionStatus).toBe("accepted");
    expect(result.endingReached).toBe(true);
    expect(result.ap).toBe(old.ap);
    expect(finishDate(result, result.revision)).toBe(result);
    expect(parseGameState(JSON.stringify(result))).toEqual(result);
  });

  it.each([
    ["milano_invitation_01", "milano/invitation_01"],
    ["milano_reassurance_01", "milano/reassurance_01"],
  ] as const)("resumes the original %s Ink after its catalog story changes", (dateId, storyId) => {
    // Construct the old save from the actual published Ink and its fingerprint,
    // not from the replacement story, so this exercises the legacy alias.
    const isInvitation = dateId === "milano_invitation_01";
    const base = isInvitation ? phase2.activeDate : phase2.ending;
    const playedDateIds = isInvitation
      ? ["milano_cafe_01", "milano_walk_01"]
      : phase2.ending.playedDateIds;
    const memories = base.memories.filter((id) => id !== "milano_confession_promise");
    const frame = beginStory(storyId, base.playerName, base.heroineName, {
      player_address: base.playerName,
      romance_stage: isInvitation ? 3 : 4,
      memory_callback: "一緒に過ごした時間",
      confession_ready: !isInvitation,
    });
    expect(frame.effects).toEqual([]);
    const old = {
      ...base,
      romanceStage: isInvitation ? 3 : 4,
      affection: isInvitation ? 6 : base.affection,
      playedDateIds,
      memories,
      confessionStatus: isInvitation ? "none" : "deferred",
      endingReached: false,
      unlockedEventIds: [...new Set([...base.unlockedEventIds, dateId])],
      activeDate: {
        dateId,
        runId: `${dateId}:legacy`,
        replay: false,
        storyState: frame.storyState,
        storyHash: storyFingerprint(storyId),
        frame: frame.frame,
        choiceCount: 0,
        step: 1,
        appliedEffectIds: [],
        pendingOutcome: null,
      },
    };
    let state = parseGameState(JSON.stringify(old));
    expect(state.activeDate).toMatchObject({ ...old.activeDate, resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [], responseSnapshot: null });
    for (let step = 0; state.activeDate && step < 80; step++) {
      const active = state.activeDate;
      if (active.frame.ended) state = finishDate(state, state.revision);
      else if (active.frame.choices.length) state = chooseDate(state, 0, state.revision);
      else state = advanceDate(state, state.revision);
      state = parseGameState(JSON.stringify(state));
    }
    expect(state.activeDate).toBeNull();
    expect(state.playedDateIds).toContain(dateId);
    expect(state.ap).toBe(old.ap);
  });

  it("retains an old, unlocked but unplayed invitation", () => {
    const old = {
      ...phase2.activeDate,
      activeDate: null,
      romanceStage: 3,
      affection: 6,
      playedDateIds: ["milano_cafe_01", "milano_walk_01"],
      unlockedEventIds: ["milano_invitation_01"],
    };
    const migrated = parseGameState(JSON.stringify(old));
    expect(migrated.unlockedEventIds).toContain("milano_invitation_01");
    expect(isEventVisible(migrated, "milano_invitation_01")).toBe(true);
    expect(getDateAvailability(migrated, "milano_invitation_01").available).toBe(true);
    const started = startDate(migrated, "milano_invitation_01");
    expect(started.activeDate?.dateId).toBe("milano_invitation_01");
    expect(started.ap).toBe(old.ap);
  });

  it("retains an old relationship, battle records and rewards through a new destination date", () => {
    const old = phase7.cityClearViewed;
    let state = parseGameState(JSON.stringify(old));
    expect(state.endingReached).toBe(true);
    expect(getDateAvailability(state, "milano_la_scala_date_01").available).toBe(true);
    state = startDate(state, "milano_la_scala_date_01");
    // The old save has 3 AP waiting above the cap. Spending 2 claims 2 of
    // those points immediately, so the visible balance remains at the cap.
    expect(state.ap).toBe(old.ap);
    expect(state.pendingApRewards).toEqual([{ ...old.pendingApRewards[0], remainingAp: 1 }]);
    for (let step = 0; state.activeDate && step < 80; step++) {
      const active = state.activeDate;
      if (active.frame.ended) state = finishDate(state, state.revision);
      else if (active.frame.choices.length) state = chooseDate(state, 0, state.revision);
      else state = advanceDate(state, state.revision);
      state = parseGameState(JSON.stringify(state));
    }
    expect(state.activeDate).toBeNull();
    expect(state.confessionStatus).toBe("accepted");
    expect(state.endingReached).toBe(true);
    expect(state.playedDateIds).toEqual([...old.playedDateIds, "milano_la_scala_date_01"]);
    expect(state.battleRecords).toEqual(old.battleRecords);
    expect(state.completedEpisodeIds).toEqual(old.completedEpisodeIds);
    expect(state.completedCityIds).toEqual(old.completedCityIds);
    expect(state.claimedRewardIds).toEqual(old.claimedRewardIds);
    expect(state.pendingApRewards).toEqual([{ ...old.pendingApRewards[0], remainingAp: 1 }]);
    expect(state.memories).toEqual(expect.arrayContaining(old.memories));
  });

  it("resumes an in-progress temporary event and does not lose unlocked history after its window closes", () => {
    function clearEpisode(initial: ReturnType<typeof createGame>, episodeId: string) {
      let state = startEpisode(initial, episodeId);
      expect(state.activeTourism).not.toBeNull();
      state = skipTourismGuide(state, state.revision);
      state = startTourismBattle(state, state.revision);
      for (let step = 0; state.activeBattle?.phase !== "result" && step < 100; step++) {
        const battle = state.activeBattle!;
        if (battle.phase === "question") {
          const quizId = battles.find((item) => item.id === battle.battleId)!.quizId;
          const question = battleQuizzes[quizId].questions[battle.roundIndex];
          state = answerBattle(state, question.options.find((option) => option.id !== question.correctOptionId)!.id, state.revision);
        } else state = advanceBattle(state, state.revision);
      }
      expect(state.activeBattle?.phase).toBe("result");
      return enterFreeTime(state, state.revision);
    }
    let state = clearEpisode(createGame(), "milano_duomo_episode");
    state = clearEpisode(state, "milano_galleria_episode");
    const eventId = "milano_rain_pause_01";
    expect(getDateAvailability(state, eventId).available).toBe(true);
    const expiredUnplayed = clearEpisode(state, "milano_last_supper_episode");
    expect(expiredUnplayed.playedDateIds).not.toContain(eventId);
    expect(isEventVisible(expiredUnplayed, eventId)).toBe(false);
    expect(getDateAvailability(expiredUnplayed, eventId).available).toBe(false);
    expect(startDate(expiredUnplayed, eventId)).toBe(expiredUnplayed);
    expect(parseGameState(JSON.stringify(expiredUnplayed))).toEqual(expiredUnplayed);
    const ap = state.ap;
    state = startDate(state, eventId);
    const begun = state;
    expect(begun.activeDate?.dateId).toBe(eventId);
    expect(startEpisode(begun, "milano_last_supper_episode")).toBe(begun);
    for (let step = 0; state.activeDate && step < 80; step++) {
      state = parseGameState(JSON.stringify(state));
      const active = state.activeDate!;
      if (active.frame.ended) state = finishDate(state, state.revision);
      else if (active.frame.choices.length) state = chooseDate(state, 0, state.revision);
      else state = advanceDate(state, state.revision);
    }
    expect(state.activeDate).toBeNull();
    expect(state.playedDateIds).toContain(eventId);
    expect(state.ap).toBe(ap);
    expect(startDate(state, eventId)).toBe(state);
    const unlocked = [...state.unlockedEventIds];
    state = clearEpisode(state, "milano_last_supper_episode");
    expect(state.unlockedEventIds).toEqual(expect.arrayContaining(unlocked));
    expect(state.playedDateIds).toContain(eventId);
    expect(isEventVisible(state, eventId)).toBe(false);
    expect(parseGameState(JSON.stringify(state))).toEqual(state);
  });

  it("keeps bad, unknown and incompatible snapshots untouched", () => {
    for (const raw of [
      "not json",
      JSON.stringify({ ...castle, schemaVersion: 999 }),
      JSON.stringify({ ...castle, trust: 12 }), // a version 7 payload cannot contain version 8 fields
      JSON.stringify({ ...phase2.activeDate, activeDate: { ...phase2.activeDate.activeDate, storyHash: "corrupted" } }),
    ]) {
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      expect(loadGame(storage).status).toBe("invalid");
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
    }
  });

  it("round-trips negative trust and spark without changing game progress", () => {
    const storage = new MemoryStorage();
    const state = { ...createGame(), trust: -3, spark: -2 };
    expect(saveGame(storage, state).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
    expect(parseGameState(storage.getItem(SAVE_KEY)!)).toEqual(state);
  });

  it("does not let an old tab overwrite a migrated save", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(phase7.cityClearViewed));
    const original = loadGame(storage);
    expect(original.status).toBe("loaded");
    if (original.status !== "loaded") throw new Error("Legacy ending did not load");
    const first = setNames(original.state, "新しい名前", original.state.heroineName);
    expect(saveGame(storage, first, original.state).ok).toBe(true);
    const persisted = storage.getItem(SAVE_KEY);
    const stale = setNames(original.state, "古いタブ", original.state.heroineName);
    expect(saveGame(storage, stale, original.state).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(persisted);
  });
});
