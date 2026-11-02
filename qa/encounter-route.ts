// Copy to qa/ in the target checkout after building content. Uses the game's real Ink and domain functions.
// Completed sightseeing is a fixture. Location gating, browser storage and previous publication snapshots have separate integration cases.
import assert from "node:assert/strict";
import { createGame, type GameState } from "../src/domain/game";
import { advanceEncounter, answerEncounterQuiz, chooseEncounter, finishEncounter, getEncounterAvailability, startEncounter, validateEncounterState } from "../src/domain/encounter";

function play(state: GameState, id: string, optionId: string, roll = 0, answer = "B"): GameState {
  const initialRevision = state.revision;
  let next = startEncounter(state, id, () => roll);
  assert.notEqual(next.revision, initialRevision, id);
  for (let turn = 0; turn < 100; turn++) {
    validateEncounterState(next);
    // Reconstruct the complete active snapshot between every action.
    next = JSON.parse(JSON.stringify(next));
    const a = next.activeEncounter!;
    if (a.phase === "quiz") {
      next = answerEncounterQuiz(next, answer, next.revision);
    } else if (a.frame.choices.length) {
      const choice = a.frame.choices.find(x => x.optionId === optionId);
      assert.ok(choice, id + "/" + optionId);
      next = chooseEncounter(next, choice.index, next.revision);
    } else if (a.frame.ended && (a.phase === "outcome" || (a.phase === "story" && id !== "galleria_fortune"))) {
      const done = finishEncounter(next, next.revision);
      assert.equal(done.activeEncounter, null);
      assert.deepEqual(finishEncounter(done, next.revision), done);
      validateEncounterState(done);
      return done;
    } else {
      next = advanceEncounter(next, next.revision);
    }
  }
  throw new Error("Unfinished: " + id);
}
let initial = createGame("ユウ", "ミオ");
initial = {...initial, completedEpisodeIds: ["milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode", "milano_finale"], completedCityIds:["milano"], completedChapters:["milano"], battleRecords:[{battleId:"milano_galleria_01",firstScore:0,lastScore:0,bestScore:0,attempts:1}]};
assert.equal(getEncounterAvailability(initial, "castello_pick").available, false);
let game = play(initial, "duomo_string", "leave");
assert.ok(!game.inventory.blue_pick && !game.completedEncounterIds.includes("duomo_string"));
game = play(game, "duomo_string", "case");
assert.equal(game.inventory.blue_pick, "held");
game = play(game, "castello_pick", "later");
assert.equal(game.inventory.blue_pick, "held");
game = play(game, "castello_pick", "give");
assert.equal(game.inventory.blue_pick, "gifted");
assert.equal(getEncounterAvailability(game, "castello_pick").available, false);
game = play(game, "galleria_print", "pay");
assert.equal(game.travelBudget, 16);
assert.equal(getEncounterAvailability(game, "galleria_ticket_press").available, false);
game = play(game, "galleria_fortune", "believe", 1, "A");
assert.ok(!game.encounterRewards.galleria_fortune);
const beforeDraw = game;
game = play(game, "galleria_fortune", "doubt", 2499);
assert.equal(game.inventory.galleria_ticket, "held");
assert.equal(game.encounterRewards.galleria_fortune.won, true);
game = play(game, "galleria_ticket_press", "later");
assert.equal(game.inventory.galleria_ticket, "held");
game = play(game, "galleria_ticket_press", "press");
assert.equal(game.inventory.galleria_ticket, "used");
game = play(game, "galleria_fortune", "believe", 9999);
assert.equal(game.inventory.galleria_ticket, "used");
assert.equal(game.encounterRewards.galleria_fortune.roll, 2499);
assert.equal(game.claimedRewardIds.filter(id=>id==="victory_galleria_first").length, 1);
assert.equal(game.travelBudget, 16);
let lost = play(beforeDraw, "galleria_fortune", "doubt", 2500);
assert.equal(lost.encounterRewards.galleria_fortune.won, false);
lost = play(lost, "galleria_fortune", "believe", 0);
assert.equal(lost.encounterRewards.galleria_fortune.roll, 2500);
assert.ok(!lost.inventory.galleria_ticket);
const old: GameState = {...initial, completedEncounterIds:["galleria_cafe","galleria_outing"],inventory:{galleria_souvenir:"held"}};
// Legacy exhibit admission was paid. Gift still has its own, later event. C case is complete on this fixture.
old.battleRecords = [...old.battleRecords, {battleId:"milano_brera_c01",attempts:1,firstScore:2,bestScore:2,lastScore:2}];
assert.equal(play(old,"brera_bookmark","offer").inventory.galleria_souvenir,"gifted");
console.log("OK: pick defer/gift, paid visit before ticket, wrong/loss/win thresholds, delayed redemption, persistent draws, AP dedupe, old bookmark");
