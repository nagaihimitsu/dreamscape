// The facts the common condition system reads (design p5 §5.3, stage 2), written by the
// game's own functions on the sample journey's optional part 「道中交流と品物」:
// seenEncounterIds (every finished encounter, 「また今度」 included) and itemUses (the
// encounter and option that gave an item away). The rental bicycle's ride counts are
// in rental.test.ts. Every state is saved and loaded with the game's save functions.
import { describe, expect, it } from "vitest";
import { getJourney } from "../../../src/content/journeys";
import { cityStart } from "../../../src/dev/scenario-builders";
import { advanceEncounter, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter } from "../../../src/domain/encounter";
import { finishTravelEventIfComplete } from "../../../src/domain/travel-game";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
import { journeyStorage } from "../../../src/persistence/journey-storage";
import { meetEncounter } from "../../fixtures/encounter-moment";
import { zodIssues } from "../../fixtures/zod-issues";

const STALL = "smp_mihon_bookmark_stall";
const GIFT = "smp_mihon_bookmark_gift";
const BOOKMARK = "smp_mihon_three_bookmark";

function saved(state: GameState): GameState {
  const values = new Map<string, string>();
  const base: StorageLike & { removeItem(key: string): void } = { getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
  const storage = journeyStorage(base, "sample_trip");
  expect(saveGame(storage, state)).toEqual({ ok: true });
  const loaded = loadGame(storage);
  expect(loaded).toEqual({ status: "loaded", state });
  return state;
}

/** The encounter and item records the checks below compare exactly. */
const records = ({ seenEncounterIds, completedEncounterIds, inventory, itemUses }: GameState) =>
  ({ seenEncounterIds, completedEncounterIds, inventory, itemUses });

/** Read the encounter (met at its moment: the stall on a departure to the tower, the gift after its battle) up to its choice and pick the option. */
function choose(state: GameState, encounterId: string, optionId: string): GameState {
  let next = meetEncounter(state, encounterId);
  expect(next.activeEncounter?.encounterId).toBe(encounterId);
  for (let step = 0; !next.activeEncounter!.frame.choices.length; step++) {
    expect(step).toBeLessThan(60);
    next = advanceEncounter(next, next.revision);
  }
  const choice = next.activeEncounter!.frame.choices.find((item) => item.optionId === optionId)!;
  return validateGameState(JSON.parse(JSON.stringify(chooseEncounter(next, choice.index, next.revision))));
}

/** Read the chosen encounter to its end and finish it; its moment goes on (after the stall, the tower's guide opens). */
function finish(state: GameState): GameState {
  let next = state;
  for (let step = 0; !encounterCanFinish(next); step++) {
    expect(step).toBeLessThan(60);
    next = advanceEncounter(next, next.revision);
  }
  // After the gift, the visit's next scene (the bell, priority +2) is not played here: the gift's records are compared.
  const finished = finishEncounter(next, next.revision);
  // (The bell is left out by ending the visit's occasion here, as if nothing followed the gift: its window settles.)
  const endVisit = (s: GameState): GameState => ({ ...s, occasion: null,
    travel: { ...s.travel, minute: s.travel.activeEvent?.endMinute ?? s.travel.minute, activeEvent: null } });
  const done = next.activeEncounter?.encounterId === STALL ? finishTravelEventIfComplete(next, continueTourismEncounters(next, finished, () => 0)) : endVisit(finished);
  expect(done.activeEncounter).toBeNull();
  return validateGameState(JSON.parse(JSON.stringify(done)));
}

describe("condition records of the sample journey's encounters (seenEncounterIds, itemUses)", () => {
  it("records every finished encounter once, 「また今度」 included, and the option that gave the bookmark away", () => {
    if (!getJourney("sample_trip"))
      throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してから、もう一度テストしてください。");
    let state = saved(cityStart("mihon"));
    expect(records(state)).toEqual({ seenEncounterIds: [], completedEncounterIds: [], inventory: {}, itemUses: {} });

    // 「また今度」: seen only once the scene ends (the choice alone writes nothing), not completed, nothing received.
    const putOff = saved(choose(state, STALL, "later"));
    expect(records(putOff)).toEqual({ seenEncounterIds: [], completedEncounterIds: [], inventory: {}, itemUses: {} });
    state = saved(finish(putOff));
    expect(records(state)).toEqual({ seenEncounterIds: [STALL], completedEncounterIds: [], inventory: {}, itemUses: {} });
    // Completed later: still seen once; the bookmark is received (receiving writes no use).
    state = saved(finish(choose(state, STALL, "drawn")));
    expect(records(state)).toEqual({ seenEncounterIds: [STALL], completedEncounterIds: [STALL], inventory: { [BOOKMARK]: "held" }, itemUses: {} });
    // The gift put off: seen, the bookmark kept.
    state = saved(finish(choose(state, GIFT, "later")));
    expect(records(state)).toEqual({ seenEncounterIds: [STALL, GIFT], completedEncounterIds: [STALL], inventory: { [BOOKMARK]: "held" }, itemUses: {} });

    // Choosing to tuck it into her guidebook gives it away: the status and the option are written at the same moment,
    // before the scene ends (a save in between keeps both).
    const chosen = saved(choose(state, GIFT, "guidebook"));
    expect(chosen.activeEncounter).toMatchObject({ encounterId: GIFT, selectedOptionId: "guidebook" });
    expect(chosen.inventory).toEqual({ [BOOKMARK]: "gifted" });
    expect(chosen.itemUses).toEqual({ [BOOKMARK]: { encounterId: GIFT, optionId: "guidebook" } });
    expect(chosen.seenEncounterIds).toEqual([STALL, GIFT]);
    const done = saved(finish(chosen));
    expect(records(done)).toEqual({ seenEncounterIds: [STALL, GIFT], completedEncounterIds: [STALL, GIFT],
      inventory: { [BOOKMARK]: "gifted" }, itemUses: { [BOOKMARK]: { encounterId: GIFT, optionId: "guidebook" } } });
  });

  it("refuses a save whose records disagree with the encounters and items", () => {
    let state = finish(choose(cityStart("mihon"), STALL, "drawn"));
    const chosen = choose(state, GIFT, "give");
    state = finish(chosen);
    expect(state.itemUses).toEqual({ [BOOKMARK]: { encounterId: GIFT, optionId: "give" } });
    const seen = (seenEncounterIds: string[]) => ({ ...state, seenEncounterIds });
    const uses = (itemUses: GameState["itemUses"]) => ({ ...state, itemUses });
    const seenMessage = "道中交流を見た記録が一致しません。";
    const usesMessage = "品物を渡した・使った記録が一致しません。";
    // Seen: a completed encounter missing, an unknown one, one of a city the journey has not completed.
    expect(() => validateGameState(seen([STALL]))).toThrow(seenMessage);
    expect(() => validateGameState(seen([STALL, GIFT, "smp_mihon_no_such_encounter"]))).toThrow(seenMessage);
    expect(() => validateGameState(seen([STALL, GIFT, "duomo_string"]))).toThrow(seenMessage);
    expect(() => validateGameState(seen([STALL, GIFT, GIFT]))).toThrow(zodIssues({ code: "custom", path: ["seenEncounterIds"] }));
    // Item uses: missing, naming an option that does not give the item, another encounter, an unknown option or encounter,
    // or a use of an item that was not given away.
    expect(() => validateGameState(uses({}))).toThrow(usesMessage);
    expect(() => validateGameState(uses({ [BOOKMARK]: { encounterId: GIFT, optionId: "later" } }))).toThrow(usesMessage);
    expect(() => validateGameState(uses({ [BOOKMARK]: { encounterId: STALL, optionId: "ask" } }))).toThrow(usesMessage);
    expect(() => validateGameState(uses({ [BOOKMARK]: { encounterId: GIFT, optionId: "no_such_option" } }))).toThrow(usesMessage);
    expect(() => validateGameState(uses({ [BOOKMARK]: { encounterId: "no_such_encounter", optionId: "give" } }))).toThrow(usesMessage);
    expect(() => validateGameState({ ...state, inventory: { [BOOKMARK]: "held" } })).toThrow(usesMessage);
    expect(() => validateGameState(uses({ [BOOKMARK]: { encounterId: GIFT, optionId: "give", extra: 1 } as never })))
      .toThrow(zodIssues({ code: "unrecognized_keys", path: ["itemUses", BOOKMARK], keys: ["extra"] }));
    // The status must match the kind of the recorded option: `give` gives the bookmark away, it does not use it.
    expect(() => validateGameState({ ...state, inventory: { [BOOKMARK]: "used" } })).toThrow(usesMessage);
    // The recorded scene must have been played (seen: a place file's scene may give an item and end with 「また今度」 in
    // another choice; stage 3a) or be running with that option: the gift's records removed, the gifted bookmark with its
    // use kept, nothing running.
    expect(state.activeEncounter).toBeNull();
    expect(() => validateGameState({ ...state, completedEncounterIds: [STALL], seenEncounterIds: [STALL] })).toThrow(usesMessage);
    // While the gift is running, its record must name the option actually chosen (both options give the bookmark).
    expect(() => validateGameState({ ...chosen, itemUses: { [BOOKMARK]: { encounterId: GIFT, optionId: "guidebook" } } })).toThrow(usesMessage);
    // The gift running with 「また今度」 chosen: a gifted bookmark recorded as given by `give` is not that choice.
    const putOff = choose(finish(choose(cityStart("mihon"), STALL, "drawn")), GIFT, "later");
    expect(putOff.activeEncounter).toMatchObject({ encounterId: GIFT, selectedOptionId: "later" });
    expect(putOff.inventory).toEqual({ [BOOKMARK]: "held" });
    expect(() => validateGameState({ ...putOff, inventory: { [BOOKMARK]: "gifted" },
      itemUses: { [BOOKMARK]: { encounterId: GIFT, optionId: "give" } } })).toThrow(usesMessage);
    // A record is never written for an encounter that has not reached its choice.
    const before = meetEncounter(finish(choose(cityStart("mihon"), STALL, "drawn")), GIFT);
    expect(() => validateGameState({ ...before, itemUses: { [BOOKMARK]: { encounterId: GIFT, optionId: "give" } } })).toThrow(usesMessage);
  });
});
