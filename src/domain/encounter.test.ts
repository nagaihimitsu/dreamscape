import { describe, expect, it } from "vitest";
import { completedDateCount, createGame, validateGameState, type GameState } from "./game";
import { encounters } from "../content/encounters";
import { responseProfiles } from "../content";
import { loadGame, saveGame, type StorageLike } from "../persistence";
import galleriaFixture from "../../tests/fixtures/galleria-stage2-pool.json";
import previousEncounterData from "../../content/legacy/encounters_before_story_refactor.json";
import { encounterCatalogSchema } from "../content/encounter-schemas";
import { storyFingerprint } from "../story/runtime";
import { startEncounter, chooseEncounter, advanceEncounter, answerEncounterQuiz, finishEncounter, getEncounterAvailability, getEncounterOptionAvailability, validateEncounterState } from "./encounter";

const ready = (): GameState => ({ ...createGame(), completedEpisodeIds: ["milano_duomo_episode"] });
const restored = (s: GameState): GameState => {
  const copy = JSON.parse(JSON.stringify(s)) as GameState;
  validateEncounterState(copy);
  return copy;
};
function untilChoice(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; i < 100 && !state.activeEncounter?.frame.choices.length; i++) {
    state = restored(state);
    const next = advanceEncounter(state, state.revision);
    if (next === state) throw new Error("choice not reached");
    state = next;
  }
  expect(state.activeEncounter?.frame.choices).toHaveLength(3);
  return restored(state);
}
function untilPhase(initial: GameState, phase: "quiz" | "outcome"): GameState {
  let state = initial;
  for (let i = 0; i < 100 && state.activeEncounter?.phase !== phase; i++) {
    state = restored(state);
    const next = advanceEncounter(state, state.revision);
    if (next === state) throw new Error(`phase ${phase} not reached`);
    state = next;
  }
  expect(state.activeEncounter?.phase).toBe(phase);
  return restored(state);
}
function finish(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; i < 100 && !state.activeEncounter?.frame.ended; i++) {
    state = restored(state);
    const next = advanceEncounter(state, state.revision);
    if (next === state) throw new Error("end not reached");
    state = next;
  }
  return restored(finishEncounter(state, state.revision));
}
function choose(initial: GameState, index: number): GameState {
  const state = untilChoice(initial);
  const next = chooseEncounter(state, index, state.revision);
  expect(next).not.toBe(state);
  expect(chooseEncounter(next, index, state.revision)).toBe(next);
  return restored(next);
}
function fortune(initial: GameState, answer: "A" | "B", roll: number): GameState {
  let state = choose(startEncounter(initial, "galleria_fortune", () => roll), 0);
  state = untilPhase(state, "quiz");
  const answered = answerEncounterQuiz(state, answer, state.revision);
  expect(answerEncounterQuiz(answered, answer, state.revision)).toBe(answered);
  state = untilPhase(restored(answered), "outcome");
  return finish(state);
}

describe("travel encounters", () => {
  it("resumes a previously published encounter whose catalog included English text", () => {
    const event = encounterCatalogSchema.parse(previousEncounterData).encounters.find((item) => item.id === "galleria_cafe")!;
    const fingerprintSource = JSON.stringify(event) + storyFingerprint(event.storyId);
    let hash = 2166136261;
    for (let index = 0; index < fingerprintSource.length; index++) hash = Math.imul(hash ^ fingerprintSource.charCodeAt(index), 16777619);
    const started = startEncounter(ready(), event.id, () => 0);
    const previous = { ...started, activeEncounter: { ...started.activeEncounter!, contentHash: (hash >>> 0).toString(16) } };
    const completed = finish(choose(restored(previous), 0));
    expect(completed.travelBudget).toBe(18);
    expect(completed.inventory.galleria_souvenir).toBe("held");
  });
  it("charges the chosen amount once, preserves the completed café reward and rejects insufficient funds", () => {
    let state = untilChoice(startEncounter(ready(), "galleria_cafe", () => 0));
    const poor = { ...state, travelBudget: 3 };
    expect(getEncounterOptionAvailability(poor, 0).available).toBe(false);
    expect(chooseEncounter(poor, 0, poor.revision)).toBe(poor);
    state = chooseEncounter(state, 0, state.revision);
    expect(state.travelBudget).toBe(16);
    state = finish(state);
    expect(state.travelBudget).toBe(18);
    expect(state.inventory.galleria_souvenir).toBe("held");
    expect(startEncounter(state, "galleria_cafe", () => 0)).toBe(state);
  });
  it("allows the free conversation, the gift to be deferred, and only one transfer", () => {
    let state = finish(choose(startEncounter(ready(), "galleria_cafe", () => 0), 2));
    expect(state.travelBudget).toBe(22);
    state = finish(choose(startEncounter(state, "galleria_gift", () => 0), 2));
    expect(state.inventory.galleria_souvenir).toBe("held");
    expect(state.completedEncounterIds).not.toContain("galleria_gift");
    state = finish(choose(startEncounter(state, "galleria_gift", () => 0), 0));
    expect(state.inventory.galleria_souvenir).toBe("gifted");
    expect(startEncounter(state, "galleria_gift", () => 0)).toBe(state);
  });
  it("draws only on the first perfect quiz even after a failed attempt, and never re-awards a ticket", () => {
    let state = fortune(ready(), "A", 0);
    expect(state.encounterRewards.galleria_fortune).toBeUndefined();
    expect(state.claimedRewardIds).toContain("victory_galleria_first");
    state = fortune(state, "B", 0);
    expect(state.encounterRewards.galleria_fortune).toEqual({ roll: 0, chancePercent: 25, won: true });
    expect(state.inventory.galleria_ticket).toBe("held");
    state = finish(choose(startEncounter(state, "galleria_outing", () => 0), 0));
    expect(state.inventory.galleria_ticket).toBe("used");
    state = fortune(state, "B", 0);
    expect(state.inventory.galleria_ticket).toBe("used");
    expect(state.encounterRewards.galleria_fortune).toEqual({ roll: 0, chancePercent: 25, won: true });
  });
  it("persists losing rolls and lets players buy the alternative without a ticket", () => {
    let state = fortune(ready(), "B", 9999);
    expect(state.encounterRewards.galleria_fortune).toEqual({ roll: 9999, chancePercent: 25, won: false });
    state = fortune(state, "B", 0);
    expect(state.encounterRewards.galleria_fortune.won).toBe(false);
    expect(state.inventory.galleria_ticket).toBeUndefined();
    state = finish(choose(startEncounter(state, "galleria_outing", () => 0), 1));
    expect(state.travelBudget).toBe(16);
  });
  it("reconstructs gift reactions from saved tickets and rejects altered outcomes", () => {
    const withItem = finish(choose(startEncounter(ready(), "galleria_cafe", () => 0), 2));
    const happy = choose(startEncounter(withItem, "galleria_gift", () => 0), 0);
    const unhappy = choose(startEncounter(withItem, "galleria_gift", () => 9999), 0);
    expect(happy.activeEncounter!.romanceResolution!.result).toBe("positive");
    expect(unhappy.activeEncounter!.romanceResolution!.result).toBe("negative");
    expect(happy.activeEncounter!.frame.text).not.toBe(unhappy.activeEncounter!.frame.text);
    expect(() => validateEncounterState({ ...happy, trust: happy.trust + 1 })).toThrow();
    expect(() => validateEncounterState({ ...happy, inventory: { ...happy.inventory, galleria_souvenir: "held" } })).toThrow();
  });
  it("rejects missing draws, inconsistent prizes and forged outcome stories", () => {
    let state = choose(startEncounter(ready(), "galleria_fortune", () => 0), 0);
    state = untilPhase(state, "quiz");
    state = answerEncounterQuiz(state, "B", state.revision);
    expect(() => validateEncounterState({ ...state, encounterRewards: {} })).toThrow();
    expect(() => validateEncounterState({ ...state, inventory: {} })).toThrow();
    state = untilPhase(state, "outcome");
    const altered = structuredClone(state);
    altered.activeEncounter!.storyId = "encounters/galleria_quiz_lost";
    expect(() => validateEncounterState(altered)).toThrow();
  });
  it("reads a previously gifted souvenir in a later encounter without changing it", () => {
    let state = finish(choose(startEncounter(ready(), "galleria_cafe", () => 0), 2));
    state = finish(choose(startEncounter(state, "galleria_gift", () => 0), 0));
    state = choose(startEncounter(state, "galleria_outing", () => 0), 1);
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      lines.push(state.activeEncounter!.frame.text);
      if (state.activeEncounter!.frame.ended) break;
      state = restored(advanceEncounter(state, state.revision));
    }
    expect(lines.join("\n")).toContain("しおり");
    expect(state.inventory.galleria_souvenir).toBe("gifted");
  });
  it("keeps recorded lottery odds and an active response profile across rebalancing", () => {
    const quiz = encounters.encounters.find((event) => event.id === "galleria_fortune")!.quiz!;
    const profile = responseProfiles.find((item) => item.id === "attentive")!;
    const oldChance = quiz.chancePercent;
    const oldBase = profile.baseChance;
    try {
      const drawn = fortune(ready(), "B", 2000);
      let active = finish(choose(startEncounter(drawn, "galleria_cafe", () => 0), 2));
      active = untilChoice(startEncounter(active, "galleria_gift", () => 7000));
      quiz.chancePercent = 0;
      profile.baseChance = 0;
      expect(restored(drawn).encounterRewards.galleria_fortune.won).toBe(true);
      active = restored(chooseEncounter(active, 0, active.revision));
      expect(active.activeEncounter!.romanceResolution!.result).toBe("positive");
    } finally {
      quiz.chancePercent = oldChance;
      profile.baseChance = oldBase;
    }
  });
  it("commits and reloads the actual first-perfect prize through the save API", () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
    };
    let state = validateGameState(galleriaFixture);
    state = choose(startEncounter(state, "galleria_fortune", () => 0), 0);
    state = untilPhase(state, "quiz");
    expect(saveGame(storage, state)).toEqual({ ok: true });
    const answer = answerEncounterQuiz(state, "B", state.revision);
    expect(saveGame(storage, answer, state)).toEqual({ ok: true });
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") {
      expect(loaded.state.encounterRewards.galleria_fortune).toEqual({ roll: 0, chancePercent: 25, won: true });
      expect(loaded.state.inventory.galleria_ticket).toBe("held");
    }
  });
  it("rejects competing tabs for payment, gifts, and lottery outcomes", () => {
    function commitFirst(previous: GameState, first: GameState, competing: GameState): GameState {
      const values = new Map<string, string>();
      const storage: StorageLike = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => { values.set(key, value); },
      };
      expect(saveGame(storage, previous)).toEqual({ ok: true });
      expect(saveGame(storage, first, previous)).toEqual({ ok: true });
      expect(saveGame(storage, competing, previous).ok).toBe(false);
      const result = loadGame(storage);
      expect(result.status).toBe("loaded");
      if (result.status !== "loaded") throw new Error("save unavailable");
      expect(result.state).toEqual(first);
      return result.state;
    }

    const base = validateGameState(galleriaFixture);
    const payment = untilChoice(startEncounter(base, "galleria_cafe", () => 0));
    const paid = chooseEncounter(payment, 0, payment.revision);
    const otherPayment = chooseEncounter(payment, 1, payment.revision);
    expect(commitFirst(payment, paid, otherPayment).travelBudget).toBe(payment.travelBudget - 4);

    const withItem = finish(paid);
    expect(withItem.inventory.galleria_souvenir).toBe("held");
    const gift = untilChoice(startEncounter(withItem, "galleria_gift", () => 0));
    const given = chooseEncounter(gift, 0, gift.revision);
    const kept = chooseEncounter(gift, 2, gift.revision);
    const savedGift = commitFirst(gift, given, kept);
    expect(savedGift.inventory.galleria_souvenir).toBe("gifted");
    expect(savedGift.travelBudget).toBe(gift.travelBudget);

    let quiz = choose(startEncounter(base, "galleria_fortune", () => 0), 0);
    quiz = untilPhase(quiz, "quiz");
    const correct = answerEncounterQuiz(quiz, "B", quiz.revision);
    const incorrect = answerEncounterQuiz(quiz, "A", quiz.revision);
    const savedLottery = commitFirst(quiz, correct, incorrect);
    expect(savedLottery.encounterRewards.galleria_fortune).toEqual({ roll: 0, chancePercent: 25, won: true });
    expect(savedLottery.inventory.galleria_ticket).toBe("held");
    expect(savedLottery.travelBudget).toBe(quiz.travelBudget);
  });
  it("evaluates existing stage thresholds after a gift without counting it as a date", () => {
    const start = { ...ready(), playedDateIds: ["milano_cafe_01"], affection: 1, trust: 0, spark: 1 };
    let state = finish(choose(startEncounter(start, "galleria_cafe", () => 0), 2));
    state = choose(startEncounter(state, "galleria_gift", () => 0), 0);
    expect(state.romanceStage).toBe(1);
    state = finish(state);
    expect(state.romanceStage).toBe(2);
    expect(completedDateCount(state)).toBe(1);
    expect(state.playedDateIds).toEqual(["milano_cafe_01"]);

    const withoutDate = { ...ready(), affection: 1, trust: 0, spark: 1 };
    let other = finish(choose(startEncounter(withoutDate, "galleria_cafe", () => 0), 2));
    other = finish(choose(startEncounter(other, "galleria_gift", () => 0), 0));
    expect(other.romanceStage).toBe(1);
    expect(completedDateCount(other)).toBe(0);
  });
  it("prevents using and gifting an item from a different city without touching money or AP", () => {
    let state = finish(choose(startEncounter(ready(), "galleria_cafe", () => 0), 2));
    state = untilChoice(startEncounter(state, "galleria_gift", () => 0));
    const souvenir = encounters.items.find((item) => item.id === "galleria_souvenir")!;
    const cityId = souvenir.cityId;
    try {
      souvenir.cityId = "roma";
      expect(getEncounterOptionAvailability(state, 0).available).toBe(false);
      expect(chooseEncounter(state, 0, state.revision)).toBe(state);
      expect(state.inventory.galleria_souvenir).toBe("held");
      expect(() => validateEncounterState(state)).toThrow();
    } finally { souvenir.cityId = cityId; }
    const next = finish(chooseEncounter(state, 0, state.revision));
    expect(next.inventory.galleria_souvenir).toBe("gifted");
    expect(next.travelBudget).toBe(state.travelBudget);
    expect(next.ap).toBe(state.ap);
  });
  it("rejects both prize and completion awards from a different city before state changes", () => {
    let cafe = choose(startEncounter(ready(), "galleria_cafe", () => 0), 2);
    while (!cafe.activeEncounter!.frame.ended) cafe = advanceEncounter(cafe, cafe.revision);
    const souvenir = encounters.items.find((item) => item.id === "galleria_souvenir")!;
    const originalSouvenirCity = souvenir.cityId;
    try {
      souvenir.cityId = "roma";
      expect(finishEncounter(cafe, cafe.revision)).toBe(cafe);
      expect(cafe.inventory.galleria_souvenir).toBeUndefined();
    } finally { souvenir.cityId = originalSouvenirCity; }

    let quiz = choose(startEncounter(ready(), "galleria_fortune", () => 0), 0);
    quiz = untilPhase(quiz, "quiz");
    const ticket = encounters.items.find((item) => item.id === "galleria_ticket")!;
    const originalTicketCity = ticket.cityId;
    try {
      ticket.cityId = "roma";
      expect(answerEncounterQuiz(quiz, "B", quiz.revision)).toBe(quiz);
      expect(quiz.inventory.galleria_ticket).toBeUndefined();
      expect(quiz.encounterRewards.galleria_fortune).toBeUndefined();
    } finally { ticket.cityId = originalTicketCity; }
    const winner = answerEncounterQuiz(quiz, "B", quiz.revision);
    expect(winner.inventory.galleria_ticket).toBe("held");
    expect(winner.ap).toBe(quiz.ap);
    expect(winner.travelBudget).toBe(quiz.travelBudget);
  });
  it("does not consume an entry ticket from another city", () => {
    const won = fortune(ready(), "B", 0);
    const outing = untilChoice(startEncounter(won, "galleria_outing", () => 0));
    const ticket = encounters.items.find((item) => item.id === "galleria_ticket")!;
    const original = ticket.cityId;
    try {
      ticket.cityId = "roma";
      expect(getEncounterOptionAvailability(outing, 0).available).toBe(false);
      expect(chooseEncounter(outing, 0, outing.revision)).toBe(outing);
      expect(outing.inventory.galleria_ticket).toBe("held");
      expect(() => validateEncounterState(outing)).toThrow();
    } finally { ticket.cityId = original; }
    const used = finish(chooseEncounter(outing, 0, outing.revision));
    expect(used.inventory.galleria_ticket).toBe("used");
    expect(used.travelBudget).toBe(outing.travelBudget);
    expect(used.ap).toBe(outing.ap);
  });
  it("keeps foreign-city possessions while allowing local items after city completion", () => {
    const foreign = { id: "test_roma_item", cityId: "roma", nameJa: "旅の品", descriptionJa: "別の街の品。" };
    encounters.items.push(foreign);
    try {
      const initial = { ...ready(), completedCityIds: ["milano"], inventory: { test_roma_item: "held" as const } };
      expect(getEncounterAvailability(initial, "galleria_cafe").available).toBe(true);
      const bought = finish(choose(startEncounter(initial, "galleria_cafe", () => 0), 2));
      const gifted = finish(choose(startEncounter(bought, "galleria_gift", () => 0), 0));
      expect(gifted.inventory.test_roma_item).toBe("held");
      expect(gifted.inventory.galleria_souvenir).toBe("gifted");
      expect(gifted.ap).toBe(initial.ap);
      expect(gifted.travelBudget).toBe(initial.travelBudget + 2);
    } finally { encounters.items.pop(); }
  });
  it("resumes a v10 Milan encounter, and refuses to advance an encounter from another city", () => {
    const initial = validateGameState(galleriaFixture);
    const started = startEncounter(initial, "galleria_cafe", () => 4321);
    const reloaded = validateGameState(JSON.parse(JSON.stringify(started)));
    expect(reloaded.activeEncounter).toEqual(started.activeEncounter);
    expect(reloaded.inventory).toEqual(initial.inventory);
    expect(reloaded.ap).toBe(initial.ap);
    expect(reloaded.travelBudget).toBe(initial.travelBudget);
    expect(advanceEncounter(reloaded, reloaded.revision)).not.toBe(reloaded);

    const event = encounters.encounters.find((item) => item.id === "galleria_cafe")!;
    const original = event.cityId;
    try {
      event.cityId = "roma";
      expect(getEncounterAvailability(initial, event.id).available).toBe(false);
      expect(advanceEncounter(reloaded, reloaded.revision)).toBe(reloaded);
      expect(() => validateEncounterState(reloaded)).toThrow();
    } finally { event.cityId = original; }
  });
});
