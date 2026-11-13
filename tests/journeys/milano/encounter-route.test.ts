// Integration route through Milan's place encounters with the game's real Ink and domain functions
// (formerly qa/encounter-route.ts and qa/place-entry.ts). Encounters are met at their moments: while observing their
// landmark, after its battle (Nora, Tino, Rina), or before the finale (the Darsena's note).
// Location gating, browser storage and previous publication snapshots have separate tests.
import { describe, expect, it } from "vitest";
import { createGame, type GameState } from "../../../src/domain/game";
import {
  advanceEncounter,
  chooseEncounter,
  continueTourismEncounters,
  encounterCanFinish,
  finishEncounter,
  proceedFromTourism,
  validateEncounterState,
} from "../../../src/domain/encounter";
import { leaveBattleResult } from "../../../src/domain/chapter";
import { skipTourismGuide } from "../../../src/domain/tourism";
import { beginTravelEvent, getTravelEventAvailability, sleepAtHotel, waitForTravel } from "../../../src/domain/travel-game";
import { encounterOffered, meetEncounter } from "../../fixtures/encounter-moment";
import { finishEpisode, firstCorrect, playBattleToResult } from "../../../src/dev/scenario-builders";

function play(state: GameState, id: string, optionId: string, roll = 0): GameState {
  const initialRevision = state.revision;
  let next = meetEncounter(state, id, () => roll);
  expect(next.revision, id).not.toBe(initialRevision);
  for (let turn = 0; turn < 100; turn++) {
    validateEncounterState(next);
    // Reconstruct the complete active snapshot between every action.
    next = JSON.parse(JSON.stringify(next)) as GameState;
    const active = next.activeEncounter!;
    if (active.frame.choices.length) {
      const choice = active.frame.choices.find((item) => item.optionId === optionId);
      expect(choice, `${id}/${optionId}`).toBeDefined();
      next = chooseEncounter(next, choice!.index, next.revision);
    } else if (encounterCanFinish(next)) {
      const done = finishEncounter(next, next.revision);
      expect(done.activeEncounter).toBeNull();
      expect(finishEncounter(done, next.revision)).toEqual(done);
      validateEncounterState(done);
      return done;
    } else {
      next = advanceEncounter(next, next.revision);
    }
  }
  throw new Error(`Unfinished: ${id}`);
}

/**
 * Play a map destination as a player does: wait (or sleep) until it opens, depart on foot, then its scenes, guide, observation,
 * battle and the scenes after it, until free time. A scene's choice is the option `prefer` names for it (else its first open
 * one); every line passes through a save and a reload. `seen` collects each scene's lines.
 */
function visit(initial: GameState, eventId: string, prefer: Record<string, string>, seen: Map<string, string[]>): GameState {
  let state = initial;
  for (let attempt = 0; !getTravelEventAvailability(state, eventId, "walk").available; attempt++) {
    expect(attempt, eventId).toBeLessThan(120);
    const waited = waitForTravel(state, 30, state.revision);
    state = waited !== state ? waited : sleepAtHotel(state, "walk", state.revision);
  }
  state = beginTravelEvent(state, eventId, "walk", state.revision, () => 0);
  for (let step = 0; step < 400; step++) {
    state = JSON.parse(JSON.stringify(state)) as GameState;
    const active = state.activeEncounter;
    if (active) {
      validateEncounterState(state);
      seen.set(active.encounterId, [...(seen.get(active.encounterId) ?? []), active.frame.text]);
      const choice = active.frame.choices.find((item) => item.optionId === prefer[active.encounterId]) ?? active.frame.choices[0];
      state = choice ? chooseEncounter(state, choice.index, state.revision)
        : encounterCanFinish(state) ? continueTourismEncounters(state, finishEncounter(state, state.revision), () => 0)
          : advanceEncounter(state, state.revision);
    } else if (state.activeTourism?.phase === "guide") state = skipTourismGuide(state, state.revision);
    else if (state.activeTourism) state = proceedFromTourism(state, state.revision, () => 0);
    else if (state.activeBattle?.phase === "result") state = leaveBattleResult(state, state.revision, () => 0);
    else if (state.activeBattle) state = playBattleToResult(state);
    else return state;
  }
  throw new Error(`Unfinished: ${eventId}`);
}

describe("Milan encounter route", () => {
  it("brings Nora's pick from the Duomo to Tino at the castle, or, when the castle came first, to the Darsena before the finale", () => {
    const seen = new Map<string, string[]>();
    // The Duomo first: Nora's pick, given to Tino after the castle's battle.
    let game = visit(createGame("ユウ", "ミオ"), "milano_duomo_episode", { duomo_string: "case" }, seen);
    expect(game.inventory.blue_pick).toBe("held");
    game = visit(game, "milano_castello_episode", { castello_pick: "give" }, seen);
    expect(game.inventory.blue_pick).toBe("gifted");
    expect(game.itemUses).toEqual({ blue_pick: { encounterId: "castello_pick", optionId: "give" } });
    expect(game.storyProgress.flags).toEqual([]);

    // The castle first: Tino plays with his thumb (no pick); Nora then tells where he plays, and he gets it before the finale.
    seen.clear();
    let other = visit(createGame("ユウ", "ミオ"), "milano_castello_episode", { castello_pick: "wonder" }, seen);
    expect(other.storyProgress.flags).toEqual(["milano_tino_needs_pick"]);
    expect(other.completedEncounterIds).toContain("castello_pick");
    other = visit(other, "milano_duomo_episode", { duomo_string: "coil" }, seen);
    expect(other.inventory.blue_pick).toBe("held");
    expect(seen.get("duomo_string")!.join("\n")).toContain("ダルセナ");
    for (const id of ["milano_galleria_episode", "milano_last_supper_episode", "milano_la_scala_b01", "milano_brera_c01"]) other = visit(other, id, {}, seen);
    expect(seen.has("milano_darsena_tino")).toBe(false);
    const budget = other.travelBudget;
    other = visit(other, "milano_finale", { milano_darsena_tino: "give" }, seen);
    expect(seen.has("milano_darsena_tino")).toBe(true);
    expect(other.completedCityIds).toContain("milano");
    expect(other.inventory.blue_pick).toBe("gifted");
    expect(other.itemUses.blue_pick).toEqual({ encounterId: "milano_darsena_tino", optionId: "give" });
    expect(other.travelBudget).toBe(budget);
  });

  it("redeems the ticket the wish's talk gives at Rina's crest room after the Galleria's battle", () => {
    // A real game: the Duomo, then the Galleria with one correct answer (its two-correct reward still to earn).
    let game = finishEpisode(finishEpisode(createGame("ユウ", "ミオ"), "milano_duomo_episode"), "milano_galleria_episode", { answer: firstCorrect(1) });
    expect(game.claimedRewardIds).not.toContain("victory_galleria_first");
    const budget = game.travelBudget;
    // The wish completes with any choice and earns the battle's two-correct reward once; its ticket talk gives the ticket.
    game = play(game, "galleria_fortune", "believe");
    expect(game.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
    expect(game.inventory.galleria_ticket).toBeUndefined();
    const beforeTicket = game;
    game = play(game, "milano_galleria_ticket_gift", "");
    expect(game.inventory.galleria_ticket).toBe("held");
    // Rina's crest room, after the Galleria's battle: 「また今度」 keeps the ticket; a print uses it, or the boy gets it.
    game = play(game, "galleria_print", "leave");
    expect(game.inventory.galleria_ticket).toBe("held");
    expect(game.completedEncounterIds).not.toContain("galleria_print");
    const withTicket = game;
    game = play(game, "galleria_print", "bull");
    expect(game.inventory.galleria_ticket).toBe("used");
    expect(game.itemUses.galleria_ticket).toEqual({ encounterId: "galleria_print", optionId: "bull" });
    const given = play(withTicket, "galleria_print", "boy");
    expect(given.inventory.galleria_ticket).toBe("gifted");
    expect(game.encounterRewards).toEqual({});
    expect(game.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
    expect(game.travelBudget).toBe(budget);
    // Without the ticket (a save of the version before the rewrite): the sample, or the paid print once.
    const paid = play(beforeTicket, "galleria_print", "pay");
    expect(paid.travelBudget).toBe(budget - 4);
    expect(paid.completedEncounterIds).toContain("galleria_print");
  });
});

describe("Milan place entry", () => {
  it("gates encounters by visited place and case and allows a free exit", () => {
    const fresh = createGame("ユウ", "ミオ");
    const first: GameState = { ...fresh, completedEpisodeIds: ["milano_duomo_episode"] };
    // A completed episode in a real save always carries its completed battle.
    const second: GameState = {
      ...first,
      completedEpisodeIds: [...first.completedEpisodeIds, "milano_galleria_episode"],
      battleRecords: [{ battleId: "milano_galleria_01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }],
    };
    // The wish is met in the Galleria's first observation; every choice completes it, with the shared AP.
    expect(encounterOffered(first, "galleria_fortune").available).toBe(true);

    let state = meetEncounter(second, "galleria_fortune", () => 100);
    for (let i = 0; !state.activeEncounter!.frame.choices.length; i++) {
      expect(i).toBeLessThan(30);
      state = advanceEncounter(state, state.revision);
    }
    const leave = state.activeEncounter!.frame.choices.find((choice) => choice.optionId === "leave")!;
    state = chooseEncounter(state, leave.index, state.revision);
    while (state.activeEncounter) {
      expect(state.activeEncounter.phase).toBe("story");
      validateEncounterState(state);
      state = encounterCanFinish(state) ? finishEncounter(state, state.revision) : advanceEncounter(state, state.revision);
    }
    expect(state.ap).toBe(second.ap + 1);
    expect(state.inventory).toEqual({});
    expect(state.encounterRewards).toEqual({});
    expect(state.completedEncounterIds).toEqual(["galleria_fortune"]);
    expect(encounterOffered(state, "galleria_fortune").available).toBe(true);
  });
});
