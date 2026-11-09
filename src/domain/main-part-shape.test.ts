// The shape of a landmark's main part (unified event design stage 2b, 3.9 (a)(b), 4.8 「本筋の形の試験」),
// on a fictional test city (installTestCity): a landmark without a guide, without an observation, or
// with neither (the battle starts on arrival); map conditions (`when`) of all / any / atLeast, money,
// items and the romance; a played finale whose condition later turns false; the map condition checked
// once, on departing (decision 21).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { allRewardRules, episodes, journeyConfig, landmarks } from "../content";
import { installTestCity } from "../dev/test-cities";
import { playBattleToResult, readGuide } from "../dev/scenario-builders";
import type { Condition } from "../content/condition-schemas";
import { getBattleObservationLandmarkId } from "./battle";
import { isEpisodeUnlocked, isStoryBattleUnlocked } from "./chapter";
import { meets } from "./conditions";
import { proceedFromTourism } from "./encounter";
import { createGame, validateGameState, type GameState } from "./game";
import { listPlayerActions } from "./player-action";
import { beginTravelEvent, finishTravelEventIfComplete, getTravelEventAvailability, isTravelEventVisible, startTravelEventScene } from "./travel-game";
import { cityContents } from "../content";
import { encounters } from "../content/encounters";

const EPISODE = "test_episode";
const LANDMARK = "test_landmark";
const FINALE = "test_finale";
const record = (battleId: string) => ({ battleId, attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 });
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const landmark = () => landmarks.find((item) => item.id === LANDMARK)!;
const episode = (id: string) => episodes.find((item) => item.id === id)!;
const event = (id: string) => cityContents.test_city.travel.events.find((item) => item.id === id)!;

/** A new game standing at the test city's hotel. */
function atTestCity(): GameState {
  const game = createGame();
  return validateGameState({ ...game, currentCityId: "test_city",
    travel: { ...game.travel, currentPlaceId: "test_hotel", hotelPlaceId: "test_hotel" } });
}
/** Depart from the map like GameApp (walking), settling a finished map event. */
const depart = (state: GameState, eventId: string) =>
  restore(finishTravelEventIfComplete(state, beginTravelEvent(state, eventId, "walk", state.revision, () => 0)));

describe("the shape of a landmark's main part (stage 2b)", () => {
  let cleanup: () => void;
  beforeEach(() => {
    cleanup = installTestCity();
    // The copied encounter met while observing the test landmark is not part of these tests.
    const copied = encounters.encounters.findIndex((item) => item.id === "test_encounter");
    if (copied >= 0) encounters.encounters.splice(copied, 1);
  });
  afterEach(() => cleanup());

  it("opens the observation at once at a landmark without a guide, records the visit, and offers no guide or its AP", () => {
    delete landmark().guideStoryId;
    const visit = depart(atTestCity(), EPISODE);
    expect(visit.activeTourism).toMatchObject({ landmarkId: LANDMARK, phase: "exploring", storyState: null, frame: null });
    expect(meets(visit, { landmarkVisited: LANDMARK })).toBe(true);
    expect(listPlayerActions(visit).map((action) => action.kind)).not.toContain("guide_again");
    const battle = restore(proceedFromTourism(visit, visit.revision, () => 0));
    const result = playBattleToResult(battle);
    expect(result.completedGuideIds).toEqual([]);
    const guideRules = allRewardRules.filter((rule) => rule.episodeId === EPISODE && rule.trigger === "guide_read").map((rule) => rule.id);
    expect(result.claimedRewardIds.filter((id) => guideRules.includes(id))).toEqual([]);
  });

  it("goes from the guide straight to the battle at a landmark without an observation", () => {
    landmark().observation = false;
    const visit = depart(atTestCity(), EPISODE);
    expect(visit.activeTourism?.phase).toBe("guide");
    const battle = restore(readGuide(visit));
    expect(battle.activeTourism).toBeNull();
    expect(battle.activeBattle?.battleId).toBe(episode(EPISODE).battleId);
    expect(battle.completedGuideIds).toEqual([LANDMARK]);
    expect(meets(battle, { landmarkVisited: LANDMARK })).toBe(true);
    // No observation to return to from the battle.
    expect(getBattleObservationLandmarkId(battle)).toBeNull();
    expect(listPlayerActions(battle).map((action) => action.kind)).not.toContain("battle_observe");
  });

  it("starts the battle on arrival at a landmark with neither, and records the visit", () => {
    delete landmark().guideStoryId;
    landmark().observation = false;
    const arrived = depart(atTestCity(), EPISODE);
    expect(arrived.activeTourism).toBeNull();
    expect(arrived.activeBattle).toMatchObject({ battleId: episode(EPISODE).battleId, phase: "dialogue" });
    expect(meets(arrived, { landmarkVisited: LANDMARK })).toBe(true);
    const result = playBattleToResult(arrived);
    expect(result.completedEpisodeIds).toContain(EPISODE);
  });

  it("reads all, any and atLeast, money, items and the romance in a finale's when; without when the current rule holds", () => {
    const finale = episode(FINALE);
    const base = atTestCity();
    const specials = journeyConfig.storyBattles.filter((battle) => battle.battleId.startsWith("test_special")).map((battle) => battle.battleId);
    // The current rule: the required episode and every special battle of the city.
    expect(isEpisodeUnlocked(base, finale)).toBe(false);
    const allPlayed = { ...base, completedEpisodeIds: [EPISODE], battleRecords: [record(episode(EPISODE).battleId), ...specials.map(record)] };
    expect(isEpisodeUnlocked(allPlayed, finale)).toBe(true);
    finale.requiredEpisodeIds = [];
    const cases: [Condition, Partial<GameState>, boolean][] = [
      [{ all: [{ battlePlayed: episode(EPISODE).battleId }, { battlePlayed: specials[0] }] }, { battleRecords: [record(specials[0])] }, false],
      [{ all: [{ battlePlayed: episode(EPISODE).battleId }, { battlePlayed: specials[0] }] }, { battleRecords: [record(specials[0]), record(episode(EPISODE).battleId)] }, true],
      [{ any: [{ battlesPlayed: { city: "test_city", atLeast: 2 } }, { money: { atLeast: 3000 } }] }, { travelBudget: 3000 }, true],
      [{ any: [{ battlesPlayed: { city: "test_city", atLeast: 2 } }, { money: { atLeast: 3000 } }] }, { travelBudget: 2999 }, false],
      [{ atLeast: { count: 2, of: specials.map((id) => ({ battlePlayed: id })).concat({ battlePlayed: episode(EPISODE).battleId }) } },
        { battleRecords: [record(specials[0])] }, false],
      [{ atLeast: { count: 2, of: specials.map((id) => ({ battlePlayed: id })).concat({ battlePlayed: episode(EPISODE).battleId }) } },
        { battleRecords: [record(specials[0]), record(episode(EPISODE).battleId)] }, true],
      [{ item: { id: "test_item", is: "held" } }, { inventory: { test_item: "held" } }, true],
      [{ item: { id: "test_item", is: "held" } }, { inventory: { test_item: "gifted" } }, false],
      [{ couple: true }, { confessionStatus: "accepted" }, true],
      [{ couple: true }, {}, false],
      [{ not: { couple: true } }, {}, true],
      [{ relationship: { axis: "affection", atLeast: 5 } }, { affection: 5 }, true],
    ];
    for (const [when, change, expected] of cases) {
      finale.when = when;
      expect(isEpisodeUnlocked({ ...base, ...change }, finale), JSON.stringify(when)).toBe(expected);
    }
    // A special battle's when is read the same way.
    const special = journeyConfig.storyBattles.find((battle) => battle.battleId === specials[0])!;
    special.when = { money: { atLeast: 500 } };
    expect(isStoryBattleUnlocked({ ...base, travelBudget: 499 }, specials[0])).toBe(false);
    expect(isStoryBattleUnlocked({ ...base, travelBudget: 500 }, specials[0])).toBe(true);
  });

  it("records a finale and loads the save although its when turned false after it was played (4.2)", () => {
    const finale = episode(FINALE);
    finale.requiredEpisodeIds = [];
    finale.when = { money: { atLeast: 50 } };
    const rich = atTestCity();
    expect(isTravelEventVisible(rich, event(FINALE))).toBe(true);
    const result = playBattleToResult(depart(rich, FINALE));
    expect(result.completedCityIds).toContain("test_city");
    // Spending afterwards makes the condition false; the records stay and the save still loads.
    const spent = restore({ ...result, travelBudget: 10 });
    expect(meets(spent, finale.when)).toBe(false);
    expect(spent.completedEpisodeIds).toContain(FINALE);
  });

  it("checks the map condition once, on departing: money spent before the main part or while observing does not refuse it (decision 21)", () => {
    const normal = episode(EPISODE);
    normal.when = { money: { atLeast: 50 } };
    const start = { ...atTestCity(), travelBudget: 60 };
    expect(getTravelEventAvailability(start, EPISODE, "walk").available).toBe(true);
    // The state of a trip after an encounter before the main part spent 20 (activeEncounter.trip goes on here).
    const departed = { ...start, revision: start.revision + 1, travelBudget: 40,
      travel: { ...start.travel, currentPlaceId: event(EPISODE).placeId, activeEvent: { eventId: EPISODE, placeId: event(EPISODE).placeId, endMinute: start.travel.minute + 30 } } };
    expect(meets(departed, normal.when)).toBe(false);
    expect(getTravelEventAvailability({ ...departed, travel: { ...departed.travel, activeEvent: null } }, EPISODE, "walk").available).toBe(false);
    const opened = restore(startTravelEventScene(departed, EPISODE, () => 0));
    expect(opened.activeTourism?.landmarkId).toBe(LANDMARK);
    // While observing (as an encounter after observe would), money spent does not refuse the way on to the battle either.
    normal.when = { money: { atLeast: 30 } };
    const observing = restore(readGuide(opened));
    expect(observing.activeTourism?.phase).toBe("exploring");
    const spent = restore({ ...observing, revision: observing.revision + 1, travelBudget: 20 });
    expect(meets(spent, normal.when)).toBe(false);
    const battle = restore(proceedFromTourism(spent, spent.revision, () => 0));
    expect(battle.activeBattle?.battleId).toBe(normal.battleId);
  });
});
