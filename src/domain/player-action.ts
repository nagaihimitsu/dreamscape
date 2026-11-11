import { getActiveBattleContent, getBattleObservationLandmarkId, advanceBattle, answerBattle, battleChoiceDisplay, battleDialogueStop, canSubmitBattleEvidence, canToggleReasoningClue, chooseBattle, pressBattleClaim, selectReasoningClue, submitBattleEvidence, toggleBattleHint } from "./battle";
import { getBattleResultExits } from "./chapter";
import { advanceCompletedJourneyCity, getPlayerDeparture } from "./city-travel";
import { recordAlbumPhoto } from "./album";
import { advanceOccasion, closeRomanceEnding, openOccasion } from "./occasion";
import { screenFor } from "./screen";
import { secureRomanceRoll } from "../random/romance-source";
import {
  advanceEncounter, answerEncounterQuiz, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter, leaveBattleToFreeTime,
  getActiveEncounterDefinition, getEncounterOptionAvailability, proceedFromTourism,
} from "./encounter";
import { advanceCityEpilogue, canReadCityEpilogue, chooseCityEpilogue, completeArrivalLogo, epilogueChoiceDisplay } from "./epilogue";
import { advanceDate, chooseDate, dateChoiceDisplay, finishDate, type GameState } from "./game";
import { getDayEnd, type NightAction } from "./day-end";
import { canClaimPendingRewards, claimPendingRewards } from "./rewards";
import { openTourism, advanceTourismGuide, chooseTourismGuide, discoverClue, getDiscoverableClueIds, guideChoiceDisplay, landmarkHasGuide, replayTourismGuide, skipTourismGuide } from "./tourism";
import { getTravelDestinations, getTravelWaitOptions } from "./travel-destinations";
import { getRentalOffers, rentTransport } from "./transport";
import { bookTour, cancelTourBooking, continueTour, getTourOffers } from "./tour";
import {
  beginTravelEvent, finishTravelEventIfComplete, getTravelEventAvailability, getTravelSleepOptions, sleepAtHotel, waitForTravel,
  type TravelMode,
} from "./travel-game";

/**
 * One player action as the game applies it: the change, the map event it completes, and the
 * automatic departure of a completed city, as one snapshot (the one that is saved). Returns
 * `previous` itself when the action changed nothing.
 */
export function applyPlayerAction(previous: GameState, change: (state: GameState) => GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  // The action, its occasion run to its next stop (4.1), the trip's window, the tour's next steps (a booked tour's start on its
  // morning, a running tour's legs after its visit; tour stage 2a), the city's automatic move, the occasion that move opened
  // (its negative scenes start in the same action), and the album's photo of the line then on screen. Nothing runs after an
  // action that changed nothing (a load is never changed).
  const changed = finishTravelEventIfComplete(previous, advanceOccasion(change(previous), nextRoll));
  if (changed === previous) return previous;
  const toured = continueTour(changed, nextRoll);
  // The line the action leaves on screen takes its # photo: into the album (once per image; album.ts).
  return recordAlbumPhoto(advanceOccasion(advanceCompletedJourneyCity(toured, toured.revision), nextRoll));
}

/**
 * A control a screen offers that changes the game (the name of the screen is in each group).
 * Presentation-only controls (logs, translations, the English note, settings, the clue book's
 * page turning) are not actions.
 */
export type PlayerAction =
  // Free time (FreeTimeHub; B案's PhotoCardFreeTime, the previous MapListFreeTime alike): PlaceCard's ways (TravelMenu's rows before;
  // TravelRentals: 借りる; TravelTours: 予約する・予約を取り消す), StayCard or TravelActions (待機・休む), FreeTimeExtras (PendingRewards, 出発), CityProgress.
  | { kind: "travel"; eventId: string; mode: TravelMode }
  | { kind: "rent"; modeId: string }
  | { kind: "book_tour"; tourId: string; offerId: string }
  | { kind: "cancel_tour" }
  | { kind: "wait"; minutes: number }
  | { kind: "rest"; mode: TravelMode; viaPlaceId: string | null }
  | { kind: "depart" }
  | { kind: "read_epilogue" }
  | { kind: "claim_ap" }
  // Arrival and city epilogue: EpilogueScreen (the arrival logo ends by itself).
  | { kind: "arrival_logo" }
  | { kind: "epilogue_next" }
  | { kind: "epilogue_choose"; index: number }
  // Sightseeing: TourismScreen, ObservationViewer, the clue book's 「資料を読む」.
  | { kind: "guide_next" }
  | { kind: "guide_choose"; index: number }
  | { kind: "guide_close" }
  | { kind: "guide_again" }
  | { kind: "discover"; clueId: string }
  | { kind: "observation_next" }
  // Place encounters: EncounterScreen.
  | { kind: "encounter_choose"; index: number }
  | { kind: "encounter_answer"; optionId: string }
  | { kind: "encounter_next" }
  | { kind: "encounter_finish" }
  // Battles: BattleScreen, ReasoningPanel, the clue book (evidence, 「観光に戻って調べる」).
  | { kind: "battle_next" }
  | { kind: "battle_choose"; index: number }
  | { kind: "battle_answer"; optionId: string }
  | { kind: "battle_hint" }
  | { kind: "battle_press" }
  | { kind: "evidence_toggle"; clueId: string }
  | { kind: "evidence_submit" }
  | { kind: "battle_observe"; landmarkId: string }
  | { kind: "battle_epilogue" }
  | { kind: "battle_leave" }
  // Dates: RomanceScene.
  | { kind: "date_choose"; index: number }
  | { kind: "date_next" }
  | { kind: "date_finish" }
  // The 「交際開始」 screen (a step of the date's occasion, 3.9 (c)).
  | { kind: "romance_close" };

/**
 * What the player can do now: every enabled control of the screen this state shows, built from
 * the same availability rules the screens use (GameApp picks the screen by the same order:
 * encounter, epilogue, sightseeing, battle, date, free time). Used by the exploration tests;
 * when a screen gains or changes a control, change this list with it. Free time at the day's end
 * (21:00 or later, getDayEnd) offers what its night screen does: the night actions open now and
 * the rest by its one way home (alone when there is none: the game then rests by itself).
 */
export function listPlayerActions(state: GameState): PlayerAction[] {
  const screen = screenFor(state);
  if (screen === "romance_ending") return [{ kind: "romance_close" }];
  const encounter = screen === "encounter" ? state.activeEncounter : null;
  if (encounter) {
    if (encounter.phase === "quiz")
      return getActiveEncounterDefinition(encounter).quiz!.question.options.map((option) => ({ kind: "encounter_answer", optionId: option.id }));
    if (encounter.phase === "feedback") return [{ kind: "encounter_next" }];
    if (encounter.frame.choices.length)
      return encounter.frame.choices.filter((choice) => getEncounterOptionAvailability(state, choice.index).available)
        .map((choice) => ({ kind: "encounter_choose", index: choice.index }));
    return [encounterCanFinish(state) ? { kind: "encounter_finish" } : { kind: "encounter_next" }];
  }
  const epilogue = state.activeEpilogue;
  if (epilogue) {
    if (epilogue.kind === "arrival" && !epilogue.logoComplete) return [{ kind: "arrival_logo" }];
    if (epilogue.frame.choices.length)
      return epilogue.frame.choices.filter((choice) => epilogueChoiceDisplay(state, choice.index).show === "open")
        .map((choice) => ({ kind: "epilogue_choose", index: choice.index }));
    return [{ kind: "epilogue_next" }];
  }
  const tourism = state.activeTourism;
  if (tourism) {
    if (tourism.phase === "guide" && tourism.frame?.choices.length)
      return tourism.frame.choices.filter((choice) => guideChoiceDisplay(state, choice.index).show === "open")
        .map((choice) => ({ kind: "guide_choose", index: choice.index }));
    if (tourism.phase === "guide") return [{ kind: "guide_next" }, { kind: "guide_close" }];
    return [
      { kind: "observation_next" }, ...(landmarkHasGuide(tourism.landmarkId) ? [{ kind: "guide_again" as const }] : []),
      ...getDiscoverableClueIds(state).map((clueId) => ({ kind: "discover" as const, clueId })),
    ];
  }
  const battle = state.activeBattle;
  if (battle) {
    const observe = getBattleObservationLandmarkId(state);
    const back: PlayerAction[] = observe ? [{ kind: "battle_observe", landmarkId: observe }] : [];
    // A flow battle's conversation may stop at its choices (stage 5).
    if (battle.phase === "dialogue" && battleDialogueStop(battle) === "choices")
      return [...battle.frame!.choices.filter((choice) => battleChoiceDisplay(state, choice.index).show === "open")
        .map((choice) => ({ kind: "battle_choose" as const, index: choice.index })), ...back];
    if (battle.phase === "dialogue" || battle.phase === "feedback") return [{ kind: "battle_next" }, ...back];
    if (battle.phase === "question") {
      const { quiz } = getActiveBattleContent(battle);
      return [
        ...quiz.questions[battle.roundIndex].options.map((option) => ({ kind: "battle_answer" as const, optionId: option.id })),
        { kind: "battle_hint" }, ...back,
      ];
    }
    if (battle.phase === "reasoning") {
      const rule = getActiveBattleContent(battle).battle.reasoning!;
      return [
        ...rule.caseClueIds.filter((clueId) => canToggleReasoningClue(state, clueId)).map((clueId) => ({ kind: "evidence_toggle" as const, clueId })),
        ...(rule.kind === "contradiction" ? [{ kind: "battle_press" as const }] : []),
        ...(canSubmitBattleEvidence(state) ? [{ kind: "evidence_submit" as const }] : []),
      ];
    }
    const exits = getBattleResultExits(state);
    return [
      ...(canClaimPendingRewards(state) ? [{ kind: "claim_ap" as const }] : []),
      ...(exits.epilogue ? [{ kind: "battle_epilogue" as const }] : []),
      ...(exits.leave ? [{ kind: "battle_leave" as const }] : []),
      ...back,
    ];
  }
  const date = state.activeDate;
  if (date) {
    if (date.frame.choices.length) return date.frame.choices.filter((choice) => dateChoiceDisplay(state, choice.index).show === "open")
      .map((choice) => ({ kind: "date_choose", index: choice.index }));
    return [date.frame.ended ? { kind: "date_finish" } : { kind: "date_next" }];
  }
  const dayEnd = getDayEnd(state);
  if (dayEnd) return [...dayEnd.actions.flatMap((action) => nightPlayerActions(state, action)),
    { kind: "rest" as const, mode: dayEnd.way.mode, viaPlaceId: dayEnd.way.viaPlaceId ?? null }];
  return [
    ...getTravelDestinations(state).candidates.flatMap((event) => event.routes
      .filter((route) => getTravelEventAvailability(state, event.id, route.mode).available)
      .map((route) => ({ kind: "travel" as const, eventId: event.id, mode: route.mode }))),
    ...(canReadCityEpilogue(state) ? [{ kind: "read_epilogue" as const }] : []),
    ...(canClaimPendingRewards(state) ? [{ kind: "claim_ap" as const }] : []),
    ...(getPlayerDeparture(state) ? [{ kind: "depart" as const }] : []),
    ...getTravelWaitOptions(state).filter((option) => option.available).map((option) => ({ kind: "wait" as const, minutes: option.minutes })),
    ...getRentalOffers(state).filter((choice) => choice.available).map((choice) => ({ kind: "rent" as const, modeId: choice.offer.modeId })),
    ...getTourOffers(state).filter((choice) => choice.available).map((choice) => ({ kind: "book_tour" as const, tourId: choice.tour.id, offerId: choice.offer.id })),
    ...(state.tour?.status === "booked" ? [{ kind: "cancel_tour" as const }] : []),
    ...getTravelSleepOptions(state).filter((option) => option.plan.ok)
      .map(({ route }) => ({ kind: "rest" as const, mode: route.mode, viaPlaceId: route.viaPlaceId ?? null })),
  ];
}

/** A night screen's button as the actions it offers (GameApp wires it to the same control as in free time). */
function nightPlayerActions(state: GameState, action: NightAction): PlayerAction[] {
  if (action === "book_tour")
    return getTourOffers(state).filter((choice) => choice.available).map((choice) => ({ kind: "book_tour" as const, tourId: choice.tour.id, offerId: choice.offer.id }));
  return [{ kind: action }];
}

/** The change a screen commits for `action` (with the shown revision), as GameApp wires each control. */
export function playerActionChange(action: PlayerAction, nextRoll: () => number): (state: GameState) => GameState {
  return (state) => {
    const revision = state.revision;
    switch (action.kind) {
      case "travel": return beginTravelEvent(state, action.eventId, action.mode, revision, nextRoll);
      case "wait": return waitForTravel(state, action.minutes, revision);
      case "rent": return rentTransport(state, action.modeId, revision);
      case "book_tour": return bookTour(state, action.tourId, action.offerId, revision);
      case "cancel_tour": return cancelTourBooking(state, revision);
      case "rest": return sleepAtHotel(state, action.mode, revision, action.viaPlaceId, nextRoll);
      case "depart": return openOccasion(state, { kind: "depart" }, revision, nextRoll);
      case "read_epilogue": case "battle_epilogue": return openOccasion(state, { kind: "epilogue" }, revision, nextRoll);
      case "claim_ap": return claimPendingRewards(state, revision);
      case "arrival_logo": return completeArrivalLogo(state, revision);
      case "epilogue_next": return advanceCityEpilogue(state, revision);
      case "epilogue_choose": return chooseCityEpilogue(state, action.index, revision, nextRoll);
      case "guide_next": return advanceTourismGuide(state, revision);
      case "guide_choose": return chooseTourismGuide(state, action.index, revision, nextRoll);
      case "guide_close": return skipTourismGuide(state, revision);
      case "guide_again": return replayTourismGuide(state, revision);
      case "discover": return discoverClue(state, action.clueId, revision);
      case "observation_next": return proceedFromTourism(state, revision, nextRoll);
      case "encounter_choose": return chooseEncounter(state, action.index, revision, nextRoll);
      case "encounter_answer": return answerEncounterQuiz(state, action.optionId, revision);
      case "encounter_next": return continueTourismEncounters(state, advanceEncounter(state, revision), nextRoll);
      case "encounter_finish": return continueTourismEncounters(state, finishEncounter(state, revision), nextRoll);
      case "battle_next": return advanceBattle(state, revision);
      case "battle_choose": return chooseBattle(state, action.index, revision, nextRoll);
      case "battle_answer": return answerBattle(state, action.optionId, revision);
      case "battle_hint": return toggleBattleHint(state, revision);
      case "battle_press": return pressBattleClaim(state, revision);
      case "evidence_toggle": return selectReasoningClue(state, action.clueId, revision);
      case "evidence_submit": return submitBattleEvidence(state, revision);
      case "battle_observe": return openTourism(state, action.landmarkId);
      case "battle_leave": return leaveBattleToFreeTime(state, revision, nextRoll);
      case "date_choose": return chooseDate(state, action.index, revision);
      case "date_next": return advanceDate(state, revision);
      case "date_finish": return finishDate(state, revision);
      case "romance_close": return closeRomanceEnding(state, revision, nextRoll);
    }
  };
}
