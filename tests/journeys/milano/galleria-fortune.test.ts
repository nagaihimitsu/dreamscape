import { describe, expect, it } from "vitest";
import { battleQuizzes, battles } from "../../../src/content";
import { firstCorrect, playBattleToResult } from "../../../src/dev/scenario-builders";
import { leaveBattleResult, startEpisode } from "../../../src/domain/chapter";
import { advanceEncounter, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter, getTourismEncounterAvailability, proceedFromTourism, startTourismEncounter } from "../../../src/domain/encounter";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { closeTourism, openTourism, skipTourismGuide, startTourismBattle } from "../../../src/domain/tourism";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

// The Galleria's wish (galleria_fortune, a knot of places/milano_galleria.ink since 2026-11-13): met after the observation,
// every choice completes it (no 「また今度」), and completing it earns the battle's two-correct reward once (# on_done: reward).
// The ticket talk (milano_galleria_ticket_gift) follows it and gives the Galleria ticket; then the battle.
const galleria = "galleria_vittorio_emanuele_ii";
const encounter = "galleria_fortune";
const ticketTalk = "milano_galleria_ticket_gift";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

/** The battle played to its result with the real rules, then saved and restored. */
const finishBattle = (initial: GameState, score = 3) => restore(playBattleToResult(initial, { answer: firstCorrect(score) }));

/** Reach the second episode through an actual first-play Duomo battle. */
function enterGalleria(): GameState {
  let state = startEpisode(createGame(), "milano_duomo_episode");
  expect(state.activeTourism?.landmarkId).toBe("duomo_milano");
  state = finishBattle(startTourismBattle(state, state.revision));
  state = leaveBattleResult(state, state.revision);
  state = startEpisode(state, "milano_galleria_episode");
  expect(state.activeTourism?.landmarkId).toBe(galleria);
  return restore(state);
}

function exploreGalleria(): GameState {
  const state = enterGalleria();
  return restore(skipTourismGuide(state, state.revision));
}

/**
 * Play the open scene with the choice at `choiceIndex` to its end (saved and restored at every step). It returns to the
 * observation; with `chain`, the observation's next scene starts as the screen starts it (continueTourismEncounters).
 */
function playScene(initial: GameState, choiceIndex = 0, transcript: string[] = [], chain = false): GameState {
  let state = initial;
  const id = state.activeEncounter!.encounterId;
  for (let i = 0; state.activeEncounter?.encounterId === id && i < 80; i++) {
    state = restore(state);
    const active = state.activeEncounter!;
    transcript.push(active.frame.text);
    expect(active.phase).toBe("story");
    expect(state.activeTourism).toBeNull();
    const before = state;
    const updated = active.frame.choices.length ? chooseEncounter(state, choiceIndex, state.revision)
      : encounterCanFinish(state) ? finishEncounter(state, state.revision) : advanceEncounter(state, state.revision);
    state = chain ? continueTourismEncounters(before, updated, () => 0) : updated;
  }
  return restore(state);
}

describe("the Galleria wish during observation", () => {
  it("is introduced automatically before the ordinary three-question battle", () => {
    let state = exploreGalleria();
    state = restore(proceedFromTourism(state, state.revision, () => 0));
    expect(state.activeEncounter?.encounterId).toBe(encounter);
    expect(state.activeBattle).toBeNull();
    expect(battleQuizzes[battles.find((battle) => battle.id === "milano_galleria_01")!.quizId].questions).toHaveLength(3);
  });

  it("goes on to the ticket talk, which gives the ticket, and then to the battle", () => {
    let state = exploreGalleria();
    state = playScene(restore(proceedFromTourism(state, state.revision, () => 0)), 2, [], true);
    expect(state.completedEncounterIds).toContain(encounter);
    expect(state.inventory.galleria_ticket).toBeUndefined();
    expect(state.activeEncounter?.encounterId).toBe(ticketTalk);
    state = playScene(state, 0, [], true);
    expect(state.activeTourism?.landmarkId).toBe(galleria);
    expect(state.inventory.galleria_ticket).toBe("held");
    expect(state.completedEncounterIds).toEqual(expect.arrayContaining([encounter, ticketTalk]));
    expect(state.occasion?.started).toEqual([encounter, ticketTalk]);
    state = restore(proceedFromTourism(state, state.revision, () => 0));
    expect(state.activeEncounter).toBeNull();
    expect(state.activeBattle?.battleId).toBe("milano_galleria_01");
  });

  it.each([0, 1, 2])("restores exploration after choice %s, completed with the shared AP once (no 「また今度」)", (choiceIndex) => {
    let state = exploreGalleria();
    const savedTourism = state.activeTourism;
    const ap = state.ap;
    const rewards = state.claimedRewardIds;
    const inventory = { ...state.inventory };
    const budget = state.travelBudget;
    expect(getTourismEncounterAvailability(state, encounter).available).toBe(true);
    const revision = state.revision;
    state = restore(startTourismEncounter(state, encounter, revision, () => 0));
    expect(startTourismEncounter(state, encounter, revision, () => 0)).toBe(state);
    expect(state.activeTourism).toBeNull();
    expect(state.activeEncounter?.encounterId).toBe(encounter);
    const transcript: string[] = [];
    state = playScene(state, choiceIndex, transcript);
    expect(state.activeEncounter).toBeNull();
    expect(state.activeTourism).toEqual(savedTourism);
    expect(state.occasion?.started).toEqual([encounter]);
    expect(state.completedEncounterIds).toContain(encounter);
    expect(getTourismEncounterAvailability(state, encounter).available).toBe(false);
    expect(state.ap).toBe(ap + 1);
    expect(state.claimedRewardIds).toEqual([...rewards, "victory_galleria_first"]);
    expect(state.travelBudget).toBe(budget);
    expect(state.inventory).toEqual(inventory);
    expect(state.encounterRewards[encounter]).toBeUndefined();
    // The family's exchange must not supply the bull's city (the battle's third question), the roof's
    // materials, or the two squares the first question asks about.
    expect(transcript.join("\n")).not.toMatch(/トリノ|Turin|鉄|iron|ガラス|glass|ドゥオモ広場|スカラ広場/i);
    // The wish repeats on a new observation (# repeat: always) without paying anything a second time.
    state = restore(closeTourism(state, state.revision));
    state = restore(openTourism(state, galleria));
    state = restore(startTourismEncounter(state, encounter, state.revision, () => 0));
    state = playScene(state, (choiceIndex + 1) % 3);
    expect(state.activeEncounter).toBeNull();
    expect(state.activeTourism).toEqual(savedTourism);
    expect(state.occasion?.started).toEqual([encounter]);
    expect(state.completedEncounterIds.filter((id) => id === encounter)).toHaveLength(1);
    expect(state.ap).toBe(ap + 1);
    expect(state.claimedRewardIds).toEqual([...rewards, "victory_galleria_first"]);
    expect(state.travelBudget).toBe(budget);
    expect(state.inventory).toEqual(inventory);
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
    state = leaveBattleResult(state, state.revision);
    state = restore(openTourism(state, galleria));
    const ap = state.ap;
    const pending = state.pendingApRewards;
    const rewards = state.claimedRewardIds;
    state = playScene(restore(startTourismEncounter(state, encounter, state.revision, () => 0)));
    expect(state.activeEncounter).toBeNull();
    expect(state.activeTourism?.landmarkId).toBe(galleria);
    expect(state.completedEncounterIds).toContain(encounter);
    expect(state.ap).toBe(ap);
    expect(state.pendingApRewards).toEqual(pending);
    expect(state.claimedRewardIds).toEqual(rewards);
  });

  it("loads a save of the version before the rewrite: the wish done with its reward, no ticket, the battle with one correct answer", () => {
    // Before 2026-11-13 the wish was a catalog encounter that earned the same reward; no one met the ticket talk or held a ticket.
    let state = exploreGalleria();
    state = playScene(restore(proceedFromTourism(state, state.revision, () => 0)), 0);
    state = finishBattle(startTourismBattle(state, state.revision), 1);
    state = restore(leaveBattleResult(state, state.revision));
    expect(state).toMatchObject({ completedEncounterIds: [encounter], seenEncounterIds: [encounter], inventory: {} });
    expect(state.battleRecords.find((record) => record.battleId === "milano_galleria_01")?.bestScore).toBe(1);
    expect(state.claimedRewardIds).toContain("victory_galleria_first");
    const values = new Map<string, string>();
    const storage: StorageLike = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
    expect(saveGame(storage, state)).toEqual({ ok: true });
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") expect(loaded.state).toEqual(state);
  });

  it("rejects a saved encounter when its definition has changed", () => {
    const exploring = exploreGalleria();
    const current = startTourismEncounter(exploring, encounter, exploring.revision, () => 0);
    expect(current.activeEncounter).not.toBeNull();
    const state = { ...current, activeEncounter: { ...current.activeEncounter!, contentHash: "changed-definition" } };
    const before = JSON.stringify(state!);
    expect(() => restore(state!)).toThrow("道中交流の保存状態が一致しません");
    expect(JSON.stringify(state!)).toBe(before);
  });
});
