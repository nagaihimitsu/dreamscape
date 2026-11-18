import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { battles, scenes, type BattleDefinition } from "../../../src/content";
import { getJourney, getJourneyForCity } from "../../../src/content/journeys";
import type { SceneEntry } from "../../../src/content/scene-schemas";
import { getBattleResultExits } from "../../../src/domain/chapter";
import { meets } from "../../../src/domain/conditions";
import { leaveBattleToFreeTime } from "../../../src/domain/encounter";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { momentStepAvailability, openEpilogue, openOccasion } from "../../../src/domain/occasion";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "../../../src/domain/player-action";
import { resultExitLabel, screenFor } from "../../../src/domain/screen";
import { cityFinaleResult, completedCity, openBattleScene, playBattleToResult } from "../../../src/dev/scenario-builders";
import { debugTargets } from "../../../src/dev/debug-state";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
import { journeyStorage } from "../../../src/persistence/journey-storage";

// A reasoning quiz placed at a moment (時点のクイズ, 2026-11-18; 3.6–3.9): the sample journey's coach stop quiz (fictional) runs as
// a turn of the city's epilogue (opened as its then: epilogue opens it) when its # when: holds (the clue heard at the clock
// tower's bell), saves and resumes at every
// stage, its result's 「先へ進む」 goes on with the moment, and what it gives is given once. A departure's (Delhi → Agra, the
// sample's quiz added there in memory) runs before the departure's own scenes and goes on to the next city.

const QUIZ = "smp_mihon_special_b_coach";
const BELL = "smp_obs_mihon_coach_bell";
const MAP = ["travel", "wait", "rest", "rent", "claim_ap", "depart", "read_epilogue"];
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
/** Save the state as the game does and load it back: the same state comes back (same save version). */
function reload(state: GameState): GameState {
  const storage = journeyStorage(new MemoryStorage(), getJourneyForCity(state.currentCityId)!.id);
  expect(saveGame(storage, state).ok).toBe(true);
  const loaded = loadGame(storage);
  expect(loaded).toEqual({ status: "loaded", state });
  return (loaded as { state: GameState }).state;
}

const undo: (() => void)[] = [];
afterEach(() => { while (undo.length) undo.pop()!(); });
/** Change a scene of the generated list for one test (as content:build would write other tags). */
function patchScene(id: string, change: (scene: SceneEntry) => SceneEntry) {
  const list = scenes as SceneEntry[];
  const index = list.findIndex((scene) => scene.id === id);
  const before = list[index];
  list[index] = change(before);
  undo.push(() => { list[index] = before; });
}

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

/** Take the first action each screen offers (never the map's; `prefer`'s choices where offered; a battle to its result), until `done`. */
function playUntil(initial: GameState, done: (state: GameState) => boolean, prefer: readonly string[] = []): GameState {
  let state = initial;
  for (let step = 0; !done(state); step++) {
    expect(step, `stuck on ${screenFor(state)}`).toBeLessThan(400);
    if (state.activeBattle && state.activeBattle.phase !== "result") { state = restore(playBattleToResult(state)); continue; }
    if (state.activeBattle) { state = restore(leaveBattleToFreeTime(state, state.revision, () => 0)); continue; }
    const actions = listPlayerActions(state).filter((action) => !MAP.includes(action.kind));
    const choices = state.activeEncounter?.frame?.choices ?? [];
    const action = actions.find((item) => item.kind === "encounter_choose" &&
      prefer.includes(choices.find((choice) => choice.index === item.index)?.optionId ?? "")) ?? actions[0];
    if (!action) throw new Error(`no action on the screen ${screenFor(state)}`);
    state = restore(applyPlayerAction(state, playerActionChange(action, () => 0), () => 0));
  }
  return state;
}

let finale: GameState;
/** The sample's city cleared (its finale played, back in free time), with the coach stop's clue or without. */
function cleared(clue: boolean): GameState {
  finale ??= cityFinaleResult("mihon");
  const clues = finale.discoveredClueIds.filter((id) => id !== BELL);
  const result = restore({ ...finale, discoveredClueIds: clue ? [...clues, BELL] : clues });
  const free = restore(leaveBattleToFreeTime(result, result.revision, () => 0));
  expect(screenFor(free)).toBe("free_time");
  expect(free.completedCityIds).toEqual(["mihon"]);
  return free;
}
/** The city's epilogue as its then: epilogue opens it (the sample writes one, e.g. at the square after the finale): its moment's first stop. */
const toEpilogue = (state: GameState) => restore(openEpilogue(state, true, () => 0));

describe("a reasoning quiz placed at the epilogue (the sample's coach stop)", () => {
  it("starts as the moment's turn when its # when: holds (the clue heard at the bell), and is passed when it does not", () => {
    const heard = toEpilogue(cleared(true));
    expect(heard.occasion).toMatchObject({ kind: "epilogue", cityId: "mihon", at: QUIZ, started: [QUIZ] });
    expect(heard.activeBattle).toMatchObject({ battleId: QUIZ, phase: "dialogue" });
    expect(screenFor(heard)).toBe("battle");
    // Without the clue, its # when: is false as its turn comes: the moment goes on without it (to the epilogue itself here; the
    // bookmark's and Lili's scenes wait for their own conditions).
    const unheard = cleared(false);
    expect(momentStepAvailability(unheard, QUIZ)).toEqual({ available: false, reason: "時点の条件を満たしていません。" });
    const passed = toEpilogue(unheard);
    expect(passed.activeBattle).toBeNull();
    expect(passed.activeEpilogue).not.toBeNull();
    expect(passed.occasion).toMatchObject({ kind: "epilogue", at: "main:epilogue", started: [] });
    expect(passed.battleRecords.some((record) => record.battleId === QUIZ)).toBe(false);
  });

  it("saves and resumes at every stage: before it, in its conversation, question, answer, reasoning and result, and after it", () => {
    const before = cleared(true);
    reload(before);
    const started = toEpilogue(reload(before));
    const phases = new Set<string>();
    // Each step is saved and loaded, and the play goes on from the loaded state.
    const viaSaves = playBattleToResult(reload(started), { after: (next) => { phases.add(next.activeBattle!.phase); return reload(next); } });
    expect([...phases].sort()).toEqual(["dialogue", "feedback", "question", "reasoning", "result"]);
    expect(viaSaves).toEqual(playBattleToResult(started));
    expect(viaSaves.occasion).toMatchObject({ kind: "epilogue", at: QUIZ, started: [QUIZ] });
    // After it: the moment's next step (the epilogue itself here), as saved.
    const after = reload(restore(leaveBattleToFreeTime(reload(viaSaves), viaSaves.revision, () => 0)));
    expect(after.activeEpilogue).not.toBeNull();
    expect(after.occasion).toMatchObject({ at: "main:epilogue", started: [QUIZ] });
  });

  it("its result's 「先へ進む」 goes on with the moment (its next step: the epilogue here; a scene after it in the route test); a second tap changes nothing", () => {
    const result = playBattleToResult(toEpilogue(cleared(true)));
    expect(resultExitLabel(result)).toBe("先へ進む");
    expect(getBattleResultExits(result)).toEqual({ epilogue: false, leave: true });
    const left = restore(leaveBattleToFreeTime(result, result.revision, () => 0));
    expect(leaveBattleToFreeTime(left, result.revision, () => 0)).toBe(left);
    expect(left).toMatchObject({ activeBattle: null, battleRewardReceipt: null });
    const epilogue = left;
    expect(epilogue.activeEpilogue).not.toBeNull();
    expect(epilogue.occasion).toMatchObject({ kind: "epilogue", at: "main:epilogue", ran: ["epilogue"], started: [QUIZ] });
    // It is no map quiz: `battles <city> >= N` counts the city's three map battles only (not the finale, not this one).
    expect(meets(epilogue, { battlesPlayed: { city: "mihon", atLeast: 3 } })).toBe(true);
    expect(meets(epilogue, { battlesPlayed: { city: "mihon", atLeast: 4 } })).toBe(false);
  });

  it("gives its head # on_done: and its choices' tags once (its first play), not on a reload or a second tap; # repeat: once never runs it again", () => {
    // As content:build would write `# on_done: money +7` and the first choice's `# money: +3` (the sample writes none).
    patchScene(QUIZ, (scene) => ({ ...scene, done: { money: 7 },
      options: scene.options.map((option) => (option.id === "ask_which_three" ? { ...option, money: 3 } : option)) }));
    const before = cleared(true);
    const started = toEpilogue(before);
    const budget = started.travelBudget;
    const result = playBattleToResult(started, { after: (next) => reload(next) });
    expect(result.activeBattle?.appliedOptionIds).toEqual(["ask_which_three"]);
    expect(result.travelBudget).toBe(budget + 3 + 7);
    // Leaving the reloaded result, twice: nothing more.
    const left = restore(leaveBattleToFreeTime(reload(result), result.revision, () => 0));
    expect(left.travelBudget).toBe(budget + 10);
    // Once played, its turn is passed (repeat once): a later moment of the same kind goes on without it.
    const played = restore({ ...before, battleRecords: left.battleRecords, travelBudget: left.travelBudget });
    expect(momentStepAvailability(played, QUIZ)).toEqual({ available: false, reason: "もう遊んだクイズです。" });
    const passed = toEpilogue(played);
    expect(passed.activeBattle).toBeNull();
    expect(passed.occasion).toMatchObject({ at: "main:epilogue", started: [] });
  });

  it("repeated always, it runs again, and gives nothing more: its tags apply on the first play only", () => {
    patchScene(QUIZ, (scene) => ({ ...scene, repeat: "always", done: { money: 7 },
      options: scene.options.map((option) => (option.id === "ask_which_three" ? { ...option, money: 3 } : option)) }));
    const before = cleared(true);
    const started = toEpilogue(before);
    const firstResult = playBattleToResult(started);
    expect(firstResult.travelBudget).toBe(started.travelBudget + 10);
    // The same moment of a later play (the records of the first): its turn comes again.
    const again = toEpilogue(restore({ ...before, battleRecords: firstResult.battleRecords, travelBudget: firstResult.travelBudget }));
    expect(again.activeBattle?.battleId).toBe(QUIZ);
    const replayed = playBattleToResult(again);
    expect(replayed.activeBattle?.appliedOptionIds).toEqual([]);
    expect(replayed.travelBudget).toBe(again.travelBudget);
    expect(replayed.battleRecords.find((record) => record.battleId === QUIZ)?.attempts).toBe(2);
  });

  it("refuses a save with the quiz open outside its moment: no moment, another step, not started there, another kind of moment", () => {
    let reasoning: GameState | undefined;
    playBattleToResult(toEpilogue(cleared(true)), { after: (next) => { if (!reasoning && next.activeBattle?.phase === "reasoning") reasoning = next; return next; } });
    if (!reasoning) throw new Error("the quiz has no reasoning stop");
    const occasion = reasoning.occasion!;
    expect(occasion).toMatchObject({ kind: "epilogue", at: QUIZ });
    const tampered: GameState[] = [
      { ...reasoning, occasion: null },
      { ...reasoning, occasion: { ...occasion, at: "main:epilogue", ran: ["epilogue"] } },
      { ...reasoning, occasion: { ...occasion, started: [] } },
      { ...reasoning, occasion: { ...occasion, kind: "depart", parts: ["depart"], ran: [] } },
    ];
    for (const state of tampered) expect(() => restore(state)).toThrow("クイズの時点の記録が一致しません。");
    expect(restore(reasoning)).toEqual(reasoning);
  });
});

describe("a reasoning quiz placed at a departure (Delhi → Agra, the sample's quiz added there in memory)", () => {
  /** The sample's coach stop quiz as a battle of Delhi's Red Fort, placed at Delhi's departure before its own scenes (-2, -1). */
  function addDepartureQuiz() {
    const id = "zz_test_depart_quiz";
    const battle: BattleDefinition = { ...battles.find((item) => item.id === QUIZ)!, id, landmarkId: "delhi_red_fort" };
    const sample = scenes.find((scene) => scene.id === QUIZ)!;
    const { when: _when, ...rest } = sample;
    const entry: SceneEntry = { ...rest, id, cityId: "delhi", main: { battle: id }, at: [{ depart: "delhi" }], priority: -4 };
    (battles as BattleDefinition[]).push(battle);
    (scenes as SceneEntry[]).push(entry);
    undo.push(() => {
      (battles as BattleDefinition[]).splice(battles.indexOf(battle), 1);
      (scenes as SceneEntry[]).splice(scenes.indexOf(entry), 1);
    });
    return id;
  }

  it("runs before the departure's own scenes, resumes from a save, and its 「先へ進む」 goes on to them and to the next city", () => {
    const id = addDepartureQuiz();
    const cleared = completedCity("delhi");
    const epilogue = restore(openOccasion(cleared, { kind: "epilogue" }, cleared.revision, () => 0));
    const leaving = playUntil(epilogue, (state) => !!state.activeBattle);
    expect(leaving.currentCityId).toBe("delhi");
    expect(leaving.occasion).toMatchObject({ kind: "depart", cityId: "delhi", parts: ["depart"], at: id, started: [id] });
    const result = playBattleToResult(reload(leaving), { after: (next) => reload(next) });
    expect(resultExitLabel(result)).toBe("先へ進む");
    const next = restore(leaveBattleToFreeTime(reload(result), result.revision, () => 0));
    // Golden Triangle's own departure scenes follow (the station at -2 and -1), still in Delhi; then Agra.
    expect(next.activeEncounter?.encounterId).toBe("gt_delhi_depart_scam");
    expect(next.occasion).toMatchObject({ kind: "depart", at: "gt_delhi_depart_scam", started: [id, "gt_delhi_depart_scam"] });
    const agra = playUntil(next, (state) => state.currentCityId === "agra");
    expect(agra.battleRecords.find((record) => record.battleId === id)?.attempts).toBe(1);
  });
});

describe("Debug and the scenario builders (3.10)", () => {
  it("list neither the moment quiz as a battle nor its landmark as a visit, and refuse to open the quiz by itself", () => {
    const targets = debugTargets("mihon");
    expect(targets.battle.map((target) => target.id)).not.toContain(QUIZ);
    expect(targets.tourism.map((target) => target.id)).not.toContain("mihon_coach_stop");
    expect(targets.occasion.map((target) => target.id)).not.toContain("mihon_coach_stop");
    // The map's quizzes stay listed.
    expect(targets.battle.map((target) => target.id)).toContain("smp_mihon_main_clock_tower_battle");
    expect(() => openBattleScene(completedCity("mihon"), QUIZ)).toThrow("この場面は時点の場面です。時点を開く操作（エピローグ・出発など）で流してください");
  });
});
