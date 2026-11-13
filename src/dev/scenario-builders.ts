/**
 * Development and test only: game states built with the real game functions.
 *
 * Unit tests, Debug (src/dev/debug-state.ts) and the E2E state shortcuts use
 * these builders, so a scene is prepared the same way everywhere. Progress is
 * made only through the domain functions the screens call (every action must
 * change the state, and a finished map event is settled like GameApp does);
 * every exported builder returns its state through validateGameState, and the
 * city builders stop with a message unless the finale cleared the city. Only
 * the scene openers and withAp/withRelationship set values directly, as Debug
 * always has: they place the player at the scene's place and set AP and the
 * relationship.
 * Never imported by production code (scripts/dist-guard.ts checks the build).
 */
import { balance, battles, dates, episodes, getCities, getCityContent, getCityTours, getTour, landmarks, type QuizQuestion, type Tour } from "../content";
import { isTourOnlyPlace } from "../content/travel-schemas";
import { bookTour as bookTourOffer, continueTour, getTourOffers } from "../domain/tour";
import { encounters } from "../content/encounters";
import { getJourneyForCity } from "../content/journeys";
import { advanceBattle, answerBattle, battleChoiceDisplay, battleDialogueStop, chooseBattle, getActiveBattleContent, selectReasoningClue, startBattle, submitBattleEvidence } from "../domain/battle";
import { getNextEpisode, getNextStoryBattle, leaveBattleResult, startEpisode, storyBattlesForCity } from "../domain/chapter";
import { departToNextCity } from "../domain/city-travel";
import {
  advanceEncounter, answerEncounterQuiz, chooseEncounter, continueTourismEncounters, encounterCanFinish, encounterEntryRule, encounterVisitSlot, finishEncounter,
  getEncounterOptionAvailability, leaveBattleToFreeTime, nextObservationScene, proceedFromTourism, startTourismEncounter, visitedLandmarkOfEvent,
} from "../domain/encounter";
import { advanceOccasion, closeRomanceEnding, openEpilogue, openOccasion } from "../domain/occasion";
import { sceneById, sceneOption } from "../domain/scene-effects";
import { isSceneOpen } from "../domain/game-state-schema";
import { hasObservation, landmarkParts } from "../content/tourism-schemas";
import { advanceCityEpilogue, chooseCityEpilogue, completeArrivalLogo, epilogueChoiceDisplay, isAuthoredEpilogueCity } from "../domain/epilogue";
import { createGame, startDate, validateGameState, type GameState } from "../domain/game";
import { advanceTourismGuide, beginLandmarkGuide, chooseTourismGuide, getTourismAvailability, guideChoiceDisplay, openTourism, replayTourismGuide, skipTourismGuide, startTourismBattle } from "../domain/tourism";

/** The first shown, choosable choice of the open guide (stage 3a: a guide may have choices), if any. */
const firstGuideChoice = (state: GameState) =>
  state.activeTourism?.frame?.choices.find((choice) => guideChoiceDisplay(state, choice.index).show === "open");
/** The first choosable choice of the open arrival or epilogue, if any. */
const firstEpilogueChoice = (state: GameState) =>
  state.activeEpilogue?.frame.choices.find((choice) => epilogueChoiceDisplay(state, choice.index).show === "open");
/** Go on in the open guide: its first choice when it shows choices, else its next line. */
const guideStep = (current: GameState) => {
  const choice = firstGuideChoice(current);
  return choice ? chooseTourismGuide(current, choice.index, current.revision) : advanceTourismGuide(current, current.revision);
};
/** Skip the open guide (「閉じる」): it stops at a choice (decision 37), where the first is taken. */
const guideSkip = (current: GameState) => {
  const choice = firstGuideChoice(current);
  return choice ? chooseTourismGuide(current, choice.index, current.revision) : skipTourismGuide(current, current.revision);
};
/** Go on in the open arrival or epilogue: its first choice when it shows choices, else its next line. */
const epilogueStep = (current: GameState) => {
  const choice = firstEpilogueChoice(current);
  return choice ? chooseCityEpilogue(current, choice.index, current.revision) : advanceCityEpilogue(current, current.revision);
};
import { beginTravelEvent, finishTravelEventIfComplete, getTravelEventAvailability, getTravelSleepOptions, sleepAtHotel } from "../domain/travel-game";
import { getTransportModes, WALK_MODE_ID } from "../content/transport";
import { minimumHomeFare } from "../domain/travel-routes";
import { getUsableRoutes } from "../domain/transport";
import { otherCityItemsMissing, unmetConditionLabels } from "./condition-explain";

/** The option chosen for a quiz question (its round index counts from 0). */
export type AnswerPicker = (question: QuizQuestion, roundIndex: number) => string;
export const correctAnswer: AnswerPicker = (question) => question.correctOptionId;
export const wrongAnswer: AnswerPicker = (question) =>
  question.options.find((option) => option.id !== question.correctOptionId)!.id;
/** The first `score` questions correct, the rest wrong. */
export const firstCorrect = (score: number): AnswerPicker => (question, roundIndex) =>
  roundIndex < score ? correctAnswer(question, roundIndex) : wrongAnswer(question, roundIndex);

export interface PlayOptions {
  /** Default: every answer correct. */
  answer?: AnswerPicker;
  /** Called after every action with the new and the previous state, e.g. a save/restore round trip or a check. */
  after?: (next: GameState, previous: GameState) => GameState;
}
export interface EpisodePlayOptions extends PlayOptions {
  /** Read the sightseeing guide to the end (earns its reward) or skip it (default). */
  guide?: "read" | "skip";
}
export interface CityPlayOptions extends EpisodePlayOptions {
  /** Called at each battle's result, before it is left. */
  onResult?: (state: GameState) => void;
}
/** Names of the player and the heroine for a new game. */
export type Names = readonly [player: string, heroine: string];

/** Date and encounter reactions use these saved tickets: 0 favours a positive and 9999 a negative reaction. */
export const rollTickets = { positive: 0, negative: 9999 } as const;

const MAX_STEPS = 400;

/**
 * One player action: it must change the state; a finished map event is settled and a booked or running tour goes on (tour stage
 * 2a) as GameApp's commit does (applyPlayerAction), with the reaction ticket 0.
 */
function act(state: GameState, change: (current: GameState) => GameState, what: string, options: PlayOptions = {}): GameState {
  const changed = change(state);
  if (changed === state) throw new Error(`${what}: この操作では状態が変わりませんでした。`);
  const settled = continueTour(finishTravelEventIfComplete(state, changed), () => rollTickets.positive);
  return options.after ? options.after(settled, state) : settled;
}

/** Play the active battle to its result screen: correct evidence for B/C, answers by `options.answer`, a conversation's first open choice. */
export function playBattleToResult(initial: GameState, options: PlayOptions = {}): GameState {
  const answer = options.answer ?? correctAnswer;
  let state = initial;
  for (let step = 0; state.activeBattle?.phase !== "result"; step++) {
    const active = state.activeBattle;
    if (!active) throw new Error("対決が始まっていません。");
    if (step > MAX_STEPS) throw new Error(`対決 ${active.battleId} を結果まで進められませんでした。`);
    const what = `対決 ${active.battleId}（${active.phase}）`;
    const { battle, quiz } = getActiveBattleContent(active);
    if (active.phase === "reasoning") {
      for (const clueId of battle.reasoning!.correctClueIds)
        if (!state.activeBattle!.reasoning!.selectedClueIds.includes(clueId))
          state = act(state, (current) => selectReasoningClue(current, clueId, current.revision), what, options);
      state = act(state, (current) => submitBattleEvidence(current, current.revision), what, options);
    } else if (active.phase === "question") {
      const optionId = answer(quiz.questions[active.roundIndex], active.roundIndex);
      state = act(state, (current) => answerBattle(current, optionId, current.revision), what, options);
    } else if (active.phase === "dialogue" && battleDialogueStop(active) === "choices") {
      const choice = active.frame!.choices.find((item) => battleChoiceDisplay(state, item.index).show === "open");
      if (!choice) throw new Error(`${what}：選べる選択肢がありません。`);
      state = act(state, (current) => chooseBattle(current, choice.index, current.revision), what, options);
    } else state = act(state, (current) => advanceBattle(current, current.revision), what, options);
  }
  return validateGameState(state);
}

/** Read the open sightseeing guide line by line to its end (the guide's reward is earned). */
export function readGuide(initial: GameState, options: PlayOptions = {}): GameState {
  let state = initial;
  for (let line = 0; state.activeTourism?.phase === "guide"; line++) {
    if (line > MAX_STEPS) throw new Error(`観光案内 ${state.activeTourism.landmarkId} を読み終えられませんでした。`);
    state = act(state, guideStep, "観光案内", options);
  }
  return validateGameState(state);
}

/** From an opened guide or observation, go on to the landmark's battle (read or skip the guide first). */
function tourismToBattle(initial: GameState, options: EpisodePlayOptions): GameState {
  let state = initial;
  if (state.activeTourism?.phase === "guide") {
    if (options.guide === "read") state = readGuide(state, options);
    else for (let step = 0; state.activeTourism?.phase === "guide"; step++) {
      if (step > MAX_STEPS) throw new Error("観光案内を飛ばせませんでした。");
      state = act(state, guideSkip, "観光案内を飛ばす", options);
    }
  }
  if (state.activeTourism)
    state = act(state, (current) => startTourismBattle(current, current.revision), "観光地の対決", options);
  return state;
}

/** Start an episode (its guide, then its battle; a finale starts its battle) and play to the result screen. */
export function playEpisodeToResult(state: GameState, episodeId: string, options: EpisodePlayOptions = {}): GameState {
  const started = act(state, (current) => startEpisode(current, episodeId), `エピソード ${episodeId} を始める`, options);
  return playBattleToResult(tourismToBattle(started, options), options);
}

/**
 * Leave the battle's result screen and play the inserted scenes that follow it (a visit's `# priority: +N` / `after battle`
 * scenes) with their first choices, back to free time.
 */
function leaveResult(result: GameState, options: PlayOptions): GameState {
  return settleScenes(act(result, (current) => leaveBattleResult(current, current.revision), "対決の結果を閉じる", options), 0);
}

/** Finish one main episode like a player: guide, battle, leaving its result and the scenes after it. */
export function finishEpisode(state: GameState, episodeId: string, options: EpisodePlayOptions = {}): GameState {
  return validateGameState(leaveResult(playEpisodeToResult(state, episodeId, options), options));
}

/**
 * Play the current city's remaining special battles and episodes in the order
 * the city recommends, until the finale's result screen; stops with a message
 * if that finale did not clear the city.
 */
export function playCityToFinaleResult(initial: GameState, options: CityPlayOptions = {}): GameState {
  const cityId = initial.currentCityId;
  let state = initial;
  for (let count = 0; ; count++) {
    if (count > 50) throw new Error(`${cityId} のフィナーレまで進められませんでした。`);
    const special = getNextStoryBattle(state);
    const episode = special ? null : getNextEpisode(state);
    if (!special && !episode) throw new Error(`${cityId} に次の対決がありません。`);
    // A battle at a tour-only place is played on its tour, as in play (tour stage 2a): booked, the night, the visit, the way back.
    const tour = tourOf(state, special?.battleId ?? episode!.id);
    if (tour) {
      state = playTour(state, tour.id, options);
      continue;
    }
    state = special
      ? playBattleToResult(act(state, (current) => startBattle(current, special.battleId), `特殊戦 ${special.battleId} を始める`, options), options)
      : playEpisodeToResult(state, episode!.id, options);
    options.onResult?.(state);
    if (episode?.kind === "city_finale") {
      if (!state.completedCityIds.includes(cityId))
        throw new Error(`${cityId} のフィナーレ ${episode.id} の結果になりましたが、都市クリアになっていません。`);
      return state;
    }
    state = leaveResult(state, options);
  }
}

/** Clear the current city: every remaining battle, the finale, and leaving the finale's result (and the scenes after it). */
export function clearCity(state: GameState, options: CityPlayOptions = {}): GameState {
  const result = playCityToFinaleResult(state, options);
  return validateGameState(leaveResult(result, options));
}

/**
 * Play the inserted scenes the running occasion shows (stage 4: after the finale, around an arrival, an epilogue, a
 * night) with their first choices, a choice without a `# then:` first (so a scene that offers to move on or to start
 * the epilogue stays where it is), until no inserted scene is open. Another scene that starts (a guide, a battle, a
 * date, an arrival or an epilogue) is left open for its own player.
 */
function settleScenes(initial: GameState, ticket: number): GameState {
  let state = initial;
  for (let step = 0; state.activeEncounter; step++) {
    if (step > MAX_STEPS) throw new Error("時点の場面を終えられませんでした。");
    const active = state.activeEncounter;
    const scene = sceneById(active.encounterId);
    const open = active.frame.choices.filter((item) => getEncounterOptionAvailability(state, item.index).available);
    const choice = open.find((item) => !sceneOption(scene, item.optionId)?.then) ?? open[0];
    state = choice && active.phase === "story"
      ? act(state, (current) => advanceOccasion(chooseEncounter(current, choice.index, current.revision, () => ticket), () => ticket), "場面の選択")
      : playOccasionStep(state, ticket);
  }
  return state;
}

/** Finish the arrival logo and conversation through their real, effect-free transitions. */
export function settleArrival(initial: GameState): GameState {
  let state = settleScenes(initial, 0);
  for (let line = 0; state.activeEpilogue?.kind === "arrival" || (state.occasion?.kind === "arrive" && state.activeEncounter); line++) {
    if (line > MAX_STEPS) throw new Error("到着の会話を完了できませんでした。");
    state = state.activeEpilogue?.kind === "arrival" && !state.activeEpilogue.logoComplete
      ? advanceOccasion(completeArrivalLogo(state, state.revision), () => 0)
      : state.activeEncounter ? settleScenes(state, 0) : act(state, (current) => advanceOccasion(epilogueStep(current), () => 0), "到着の会話");
  }
  return validateGameState(state);
}

/** Read the open city epilogue to its end (and the scenes after it). */
export function readEpilogue(initial: GameState): GameState {
  let state = initial;
  for (let line = 0; state.activeEpilogue && state.activeEpilogue.kind !== "arrival"; line++) {
    if (line > MAX_STEPS) throw new Error("エピローグを読み終えられませんでした。");
    state = act(state, (current) => advanceOccasion(epilogueStep(current), () => 0), "エピローグ");
  }
  return validateGameState(settleScenes(state, 0));
}

/** A new game as the title screen starts it: the journey's first city with its arrival read. */
export function newJourney(journeyId: string, names?: Names): GameState {
  const created = names ? createGame(names[0], names[1], { journeyId }) : createGame(undefined, undefined, { journeyId });
  return settleArrival(openOccasion(created, { kind: "arrive" }, created.revision, () => 0));
}

/**
 * Leave a cleared city the way its journey does: a journey that moves on after
 * the epilogue reads it first; otherwise the player departs from the map.
 */
export function departFromClearedCity(state: GameState): GameState {
  const read = getJourneyForCity(state.currentCityId)?.cityTransition === "after_epilogue"
    ? readEpilogue(openEpilogueScene(state)) : state;
  const departed = advanceOccasion(departToNextCity(read, read.revision), () => 0);
  if (departed === read) throw new Error(`${state.currentCityId} から次の都市へ出発できませんでした。`);
  return settleArrival(settleScenes(departed, 0));
}

/**
 * The start of a city: earlier cities of its journey cleared and left through
 * the real rules, the arrival read. A city that is not the start of a playable
 * journey (Debug's 仮の場面) starts as the default journey's new game moved there.
 */
export function cityStart(cityId: string, names?: Names): GameState {
  return startOfCity(cityId, new Set(), names);
}

function startOfCity(cityId: string, visited: Set<string>, names?: Names): GameState {
  if (visited.has(cityId)) throw new Error("都市の出発先が循環しています。");
  const chain = new Set(visited).add(cityId);
  const previous = getCities().find((item) => item.nextCityId === cityId && item.productionStatus === "complete");
  if (previous) {
    const arrived = departFromClearedCity(clearCity(startOfCity(previous.id, chain, names)));
    if (arrived.currentCityId !== cityId) throw new Error("前の街から出発できませんでした。");
    return arrived;
  }
  const journey = getJourneyForCity(cityId);
  if (journey?.status === "available" && journey.cities[0]?.id === cityId) return newJourney(journey.id, names);
  const base = names ? createGame(names[0], names[1]) : createGame();
  const { travelSettings } = getCityContent(cityId);
  const initial = journey?.initialState;
  return validateGameState({ ...base, currentCityId: cityId, travelBudget: journey?.initialBudget ?? travelSettings.initialBudget,
    ap: initial?.ap ?? base.ap, affection: initial?.affection ?? base.affection,
    trust: initial?.trust ?? base.trust, spark: initial?.spark ?? base.spark,
    romanceStage: initial?.romanceStage ?? base.romanceStage, confessionStatus: initial?.confessionStatus ?? base.confessionStatus,
    travel: { ...base.travel, currentPlaceId: travelSettings.hotelPlaceId, hotelPlaceId: travelSettings.hotelPlaceId,
      ...(journey?.startWeekday === undefined ? {} : { calendar: { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: journey.startWeekday } }) } });
}

/** The city's finale result screen, every earlier battle of the city cleared (correct answers by default). */
export function cityFinaleResult(cityId: string, options: CityPlayOptions & { names?: Names } = {}): GameState {
  return playCityToFinaleResult(cityStart(cityId, options.names), options);
}

/**
 * Midway through a city: its start, then the first half of the battles before its finale (special
 * battles first, in the order the city recommends) won and left, back in free time.
 */
export function cityMidway(cityId: string, options: CityPlayOptions & { names?: Names } = {}): GameState {
  let state = cityStart(cityId, options.names);
  const before = episodes.filter((episode) => episode.cityId === cityId && episode.kind !== "city_finale").length +
    storyBattlesForCity(cityId).length;
  for (let played = 0; played < Math.ceil(before / 2); played++) {
    const special = getNextStoryBattle(state);
    const episode = special ? null : getNextEpisode(state);
    if (!episode && !special) throw new Error(`${cityId} の途中まで進められませんでした。`);
    const tour = tourOf(state, special?.battleId ?? episode!.id);
    if (tour) {
      state = playTour(state, tour.id, options);
      continue;
    }
    const result = special
      ? playBattleToResult(act(state, (current) => startBattle(current, special.battleId), `特殊戦 ${special.battleId} を始める`, options), options)
      : playEpisodeToResult(state, episode!.id, options);
    state = act(result, (current) => leaveBattleResult(current, current.revision), "対決の結果を閉じる", options);
  }
  return validateGameState(state);
}

/** The city cleared and its finale result left: free time after the clear. */
export function completedCity(cityId: string, options: CityPlayOptions & { names?: Names } = {}): GameState {
  return clearCity(cityStart(cityId, options.names), options);
}

/** The tour of the current city whose event step opens a map event at a tour-only place (tour stage 2a), if the event is one. */
function tourOf(state: GameState, eventId: string): Tour | undefined {
  const { travel } = getCityContent(state.currentCityId);
  const event = travel.events.find((item) => item.id === eventId);
  if (!event || !isTourOnlyPlace(travel.places.find((place) => place.id === event.placeId))) return undefined;
  const tour = getCityTours(state.currentCityId).find((item) => item.steps.some((step) => step.kind === "event" && step.eventId === eventId));
  if (!tour) throw new Error(`${eventId} はツアー専用の地点の出来事ですが、それを開くツアーがありません。`);
  return tour;
}

/**
 * Book a tour of the current city (tour stage 2a): through `offerId`, or the first offer that can be booked here (a desk's place
 * first: the party is placed at the desk's place when it is elsewhere, as Debug places it; else the website).
 */
export function bookTour(state: GameState, tourId: string, offerId?: string): GameState {
  const tour = getTour(tourId);
  if (!tour || tour.cityId !== state.currentCityId) throw new Error(`ツアー「${tourId}」はこの都市のツアーではありません。`);
  const choose = (current: GameState) => getTourOffers(current).find((choice) => choice.tour.id === tourId && choice.available && (!offerId || choice.offer.id === offerId));
  let current = state;
  let choice = choose(current);
  const desk = tour.offers.find((offer) => (offerId ? offer.id === offerId : offer.channel === "desk") && offer.placeIds?.length);
  if (desk && (!choice || (!offerId && choice.offer.channel !== "desk"))) {
    const placed = atPlace(current, desk.placeIds![0]);
    if (choose(placed)) { current = placed; choice = choose(placed); }
  }
  if (!choice) {
    const reason = getTourOffers(state).find((item) => item.tour.id === tourId)?.reason;
    throw new Error(`この進行状態ではツアー「${tour.titleJa}」を予約できません。${reason ?? "見学先をもう訪ねたか、まだ開いていないか、ほかのツアーを予約しています。旅の進行を「旅の開始時」にしてください。"}`);
  }
  const offer = choice.offer;
  return validateGameState(act(current, (s) => bookTourOffer(s, tourId, offer.id, s.revision), `ツアー ${tourId} を予約する`));
}

/** Rest at the hotel by the first way home that can be taken (the night; a booked tour starts the next morning). */
function restAtHotel(state: GameState, options: PlayOptions = {}): GameState {
  const sleep = getTravelSleepOptions(state).find((option) => option.plan.ok);
  if (!sleep) throw new Error("宿へ帰って休めません。");
  return act(state, (current) => sleepAtHotel(current, sleep.route.mode, current.revision, sleep.route.viaPlaceId ?? null, () => rollTickets.positive), "休む", options);
}

/**
 * Play a running tour's current step like a player: an event step's visit (the guide, read or skipped by `options.guide`, the
 * observation's 「進む」, the scenes with their first choices, the battle to its result (`options.onResult` there) and 「ツアーを続ける」),
 * or a leg's moment (its scenes with their first choices and its narration; tour stages 2b, 3). Stops when the tour has moved past
 * the step (its next step's moment, or its end).
 */
function playTourStep(initial: GameState, options: CityPlayOptions = {}): GameState {
  let state = initial;
  const step = state.tour?.status === "running" ? state.tour.step : -1;
  for (let count = 0; state.tour?.status === "running" && state.tour.step === step; count++) {
    if (count > MAX_STEPS) throw new Error("ツアーの見学を終えられませんでした。");
    if (state.activeBattle?.phase === "result") {
      options.onResult?.(state);
      state = act(state, (current) => leaveBattleToFreeTime(current, current.revision, () => rollTickets.positive), "ツアーを続ける", options);
    } else if (state.activeBattle) state = playBattleToResult(state, options);
    else if (state.activeTourism?.phase === "guide") state = options.guide === "read" ? readGuide(state, options) : act(state, guideSkip, "観光案内を飛ばす", options);
    else state = playOccasionStep(state, rollTickets.positive);
  }
  return state;
}

/** Play a tour of the current city through (tour stage 2a): booked if it is not, the night, every event step's visit, the way back. */
export function playTour(initial: GameState, tourId: string, options: CityPlayOptions = {}): GameState {
  let state = initial.tour?.tourId === tourId ? initial : bookTour(initial, tourId);
  if (state.tour?.status === "booked") state = settleScenes(restAtHotel(state, options), 0);
  for (let count = 0; state.tour?.status === "running"; count++) {
    if (count > 20) throw new Error(`ツアー ${tourId} を終えられませんでした。`);
    state = playTourStep(state, options);
  }
  if (!state.completedTourIds.includes(tourId)) throw new Error(`ツアー ${tourId} を最後まで終えられませんでした。`);
  return validateGameState(state);
}

/**
 * Debug's tour scene (scene=tour): the tour booked at the start of its city; with `stepId` (an event step's ID), its morning
 * played until that step's visit opens (earlier steps played through: their visits, and a leg's scenes and narration with their
 * first choices, tour stages 2b, 3).
 */
export function tourScene(state: GameState, tourId: string, stepId?: string): GameState {
  const tour = getTour(tourId);
  if (!tour) throw new Error(`ツアー「${tourId}」はありません。`);
  const step = stepId === undefined ? undefined : tour.steps.findIndex((item) => item.id === stepId);
  if (step !== undefined && (step < 0 || tour.steps[step].kind !== "event"))
    throw new Error(`「${stepId}」は${tour.titleJa}の見学の行程ではありません（行程：${tour.steps.filter((item) => item.kind === "event").map((item) => item.id).join("、")}）。`);
  let current = bookTour(state, tourId);
  if (step === undefined) return current;
  current = settleScenes(restAtHotel(current), 0);
  for (let count = 0; current.tour?.status === "running" && current.tour.step < step; count++) {
    if (count > 20) throw new Error(`ツアー ${tourId} の行程 ${stepId} まで進められませんでした。`);
    current = playTourStep(current);
  }
  if (current.tour?.status !== "running" || current.tour.step !== step) throw new Error(`ツアー ${tourId} の行程 ${stepId} まで進められませんでした。`);
  return validateGameState(current);
}

/** Debug's AP value: the whole balance (pending credits would otherwise be paid when a date starts), within the cap. */
export function withAp(state: GameState, ap: number): GameState {
  return validateGameState({ ...state, pendingApRewards: [], ap: Math.min(balance.apCap, Math.max(0, ap)) });
}

/** Debug's relationship values, set directly. */
export function withRelationship(state: GameState, values: Pick<GameState, "affection" | "trust" | "spark">): GameState {
  return validateGameState({ ...state, affection: values.affection, trust: values.trust, spark: values.spark });
}

/** Put the player at a place of the current city (Debug's placement), keeping a payable way back to the hotel. */
function atPlace(state: GameState, placeId: string): GameState {
  const { travel } = getCityContent(state.currentCityId);
  const place = travel.places.find((item) => item.id === placeId);
  if (!place) throw new Error("この街に場面の地点が見つかりません。");
  if (isTourOnlyPlace(place)) throw new Error("ツアー専用の地点です。ツアーの場面（scene=tour）から開けます。");
  const returnReserve = minimumHomeFare(getUsableRoutes(state), placeId, state.travel.hotelPlaceId, state.travel.minute);
  if (returnReserve === undefined || returnReserve > state.travelBudget)
    throw new Error("この地点から滞在先への帰路を確認できません。");
  return { ...state, travel: { ...state.travel, currentPlaceId: placeId, returnReserve } };
}

/** The place where the map starts a scene: its map event's place, else the place of its landmark. */
function scenePlaceId(cityId: string, eventId: string | undefined, landmarkId: string | undefined): string {
  const { travel } = getCityContent(cityId);
  const event = travel.events.find((item) => item.id === eventId);
  const place = travel.places.find((item) => item.id === event?.placeId) ??
    travel.places.find((item) => landmarkId && item.landmarkIds?.includes(landmarkId));
  if (!place) throw new Error("この街に場面の地点が見つかりません。");
  return place.id;
}

/** Open a landmark's sightseeing guide at its place (re-read when the landmark was already visited). */
export function openTourismScene(state: GameState, landmarkId: string): GameState {
  const at = atPlace(state, scenePlaceId(state.currentCityId, undefined, landmarkId));
  let next = openTourism(at, landmarkId);
  if (next.activeTourism?.phase === "exploring") next = replayTourismGuide(next, next.revision);
  // A visited landmark without an observation (India's) has no observation to re-read the guide from: the guide opens
  // as its visit opens it (beginLandmarkGuide), and its end goes on to the landmark's battle.
  else if (!next.activeTourism && at.visitedLandmarkIds.includes(landmarkId) && getTourismAvailability(at, landmarkId).available &&
      landmarks.some((item) => item.id === landmarkId && !hasObservation(item)))
    next = beginLandmarkGuide(at, landmarkId);
  if (!next.activeTourism) throw new Error("この進行状態では場所を開けません。都市クリア後を選んでください。");
  return validateGameState(next);
}

/** Start a battle at its place: a landmark's battle, a special battle B/C or the city finale. */
export function openBattleScene(state: GameState, battleId: string): GameState {
  const landmarkId = battles.find((item) => item.id === battleId)?.landmarkId ?? undefined;
  const eventId = episodes.find((item) => item.cityId === state.currentCityId && item.battleId === battleId)?.id ?? battleId;
  const next = startBattle(atPlace(state, scenePlaceId(state.currentCityId, eventId, landmarkId)), battleId);
  if (!next.activeBattle) throw new Error("この進行状態ではバトルを始められません。");
  return validateGameState(next);
}

/** Play the open encounter with its first selectable choice to its end, and let its moment go on (another encounter or the main part). */
function playEncounterFirstChoice(initial: GameState, ticket: number): GameState {
  let state = initial;
  const id = state.activeEncounter!.encounterId;
  for (let step = 0; state.activeEncounter?.encounterId === id && state.activeEncounter.runId === initial.activeEncounter!.runId; step++) {
    if (step > MAX_STEPS) throw new Error(`道中交流 ${id} を終えられませんでした。`);
    const active = state.activeEncounter;
    const choice = active.frame.choices.find((item) => getEncounterOptionAvailability(state, item.index).available);
    state = choice && active.selectedOptionId === null
      ? act(state, (current) => chooseEncounter(current, choice.index, current.revision), `道中交流 ${id} の選択`)
      : act(state, (current) => continueTourismEncounters(current,
        active.frame.ended ? finishEncounter(current, current.revision) : advanceEncounter(current, current.revision), () => ticket), `道中交流 ${id}`);
  }
  return state;
}

/** Run the encounters that come before the target in its moment with their first choices, until the target is open. */
function untilEncounter(initial: GameState, encounterId: string, ticket: number): GameState {
  let state = initial;
  for (let count = 0; state.activeEncounter && state.activeEncounter.encounterId !== encounterId; count++) {
    if (count > 20) throw new Error("前に流れる道中交流を終えられませんでした。");
    state = playEncounterFirstChoice(state, ticket);
  }
  return state;
}

/**
 * From an opened guide or observation, on to the landmark's battle as a player goes: the guide skipped, then the
 * observation's 「進む」, its scenes played with their first choices, until the battle starts.
 */
function throughObservation(initial: GameState, ticket: number): GameState {
  let state = initial;
  for (let step = 0; !state.activeBattle; step++) {
    if (step > MAX_STEPS) throw new Error("観察から対決へ進めませんでした。");
    if (state.activeTourism?.phase === "guide") state = act(state, guideSkip, "観光案内を飛ばす");
    else if (state.activeEncounter) state = playEncounterFirstChoice(state, ticket);
    else if (state.activeTourism) state = act(state, (current) => proceedFromTourism(current, current.revision, () => ticket), "観察の「進む」");
    else throw new Error("観察から対決へ進めませんでした。");
  }
  return state;
}

/** Depart from the map to the landmark's map event (its episode or special battle) by the first mode that can go now. */
function departToLandmark(state: GameState, landmarkId: string, ticket: number): GameState {
  const { travel } = getCityContent(state.currentCityId);
  const event = travel.events.find((item) => visitedLandmarkOfEvent(item.id) === landmarkId &&
    [WALK_MODE_ID, ...getTransportModes(state.currentCityId).map((mode) => mode.id)].some((mode) => getTravelEventAvailability(state, item.id, mode).available));
  const mode = event && [WALK_MODE_ID, ...getTransportModes(state.currentCityId).map((item) => item.id)]
    .find((item) => getTravelEventAvailability(state, event.id, item).available);
  if (!event || !mode)
    throw new Error("この交流は、地図から観光地へ出発したときに起きます。この進行状態ではその観光地へ出発できません。旅の進行を「旅の開始時」にしてください。");
  return act(state, (current) => beginTravelEvent(current, event.id, mode, current.revision, () => ticket), `${landmarkId} へ出発`);
}

/**
 * Start an encounter the way play meets it, with a saved reaction ticket, at the moment of its
 * landmark's visit its rule names (the unified event design, stage 1):
 * - before the main part (a negative priority): depart to the landmark from the map (beginTravelEvent);
 * - after it (a positive priority): depart, play the landmark's battle to its result with the real
 *   functions (guide skipped, every answer correct) and leave it with 「自由時間へ」;
 * - while observing: at its place the landmark's observation opens (a first visit skips the guide)
 *   and the encounter starts there under the observation's own rule (getTourismEncounterAvailability);
 *   after the scene the observation goes on.
 * The encounters that run before it in the same moment are played with their first choices. Free time never starts one.
 */
export function startEncounterScene(state: GameState, encounterId: string, ticket: number): GameState {
  const encounter = encounters.encounters.find((item) => item.id === encounterId && item.cityId === state.currentCityId);
  const slot = encounterVisitSlot(encounterId);
  const unmetRule = (at: GameState) => {
    const rule = encounterEntryRule(encounterId);
    const unmet = rule?.when && !rule.quizAfterLandmarkBattle ? unmetConditionLabels(at, rule.when) : [];
    return `この進行状態では交流を始められません。必要な進行や品物を確認してください。${unmet.length ? `入場の条件を満たしていません：${unmet.join("、")}` : ""}`;
  };
  if (encounter && !encounter.landmarkId) throw new Error(`この場面は観光地の訪問の場面ではありません（${encounterId}）。時点を開く操作で流してください。`);
  if (encounter?.landmarkId && slot !== "observe") {
    let next = untilEncounter(departToLandmark(state, encounter.landmarkId, ticket), encounterId, ticket);
    if (slot === "after" && next.activeEncounter?.encounterId !== encounterId) {
      if (next.activeEncounter) throw new Error(unmetRule(next));
      const arrived = next;
      const afterBattle = (atBattle: GameState) => untilEncounter(act(playBattleToResult(atBattle, {}),
        (current) => leaveBattleToFreeTime(current, current.revision, () => ticket), "対決の結果を閉じる"), encounterId, ticket);
      next = afterBattle(tourismToBattle(arrived, {}));
      // A scene whose condition a scene of the observation meets (Rina's crest room after the Galleria's wish): the visit
      // again, through its observation's scenes with their first choices, as play meets them.
      if (next.activeEncounter?.encounterId !== encounterId) next = afterBattle(throughObservation(arrived, ticket));
    }
    if (next.activeEncounter?.encounterId !== encounterId) throw new Error(unmetRule(next));
    return validateGameState(next);
  }
  const placed = atPlace(state, scenePlaceId(state.currentCityId, undefined, encounter?.landmarkId));
  let observing = encounter?.landmarkId ? openTourism(placed, encounter.landmarkId) : placed;
  for (let step = 0; observing.activeTourism?.phase === "guide" && step < MAX_STEPS; step++) observing = guideSkip(observing);
  let next = startTourismEncounter(observing, encounterId, observing.revision, () => ticket);
  // A scene whose condition an earlier scene of the same observation meets (the Galleria's ticket talk after its wish): the
  // observation's scenes before it are played with their first choices, as play meets them, until it starts.
  for (let count = 0; next.activeEncounter?.encounterId !== encounterId && count < 20; count++) {
    if (next.activeEncounter) observing = playEncounterFirstChoice(next, ticket);
    else {
      const earlier = nextObservationScene(observing);
      if (!earlier || earlier === encounterId) break;
      observing = playEncounterFirstChoice(act(observing, (current) => proceedFromTourism(current, current.revision, () => ticket), "観察の「進む」"), ticket);
    }
    next = observing.activeEncounter ? observing : startTourismEncounter(observing, encounterId, observing.revision, () => ticket);
  }
  // The observation reads the rule's `when` (unless the quiz waits for the battle); Debug names what is missing.
  if (next.activeEncounter?.encounterId !== encounterId) throw new Error(unmetRule(observing));
  return validateGameState(next);
}

/**
 * 「場面から始める」 (the unified event design 4.8, decision 6 (a)): open the landmark's visit the ordinary way
 * (from the map when it shows there, else a visit without a map event) and play it with the real functions — the
 * first selectable choice, correct answers, the observation's 「進む」 — until the scene `from` starts. `prep`: scenes
 * played first (each at its own moment, also with the real functions), for the items `from` needs. Without `from`, it
 * stops at the occasion's first stop. When `from` does not come, it says which parts of its condition are false and
 * which scenes give the items they name.
 */
export function startOccasionScene(state: GameState, landmarkId: string, from: string | undefined, prep: readonly string[], ticket: number): GameState {
  let current = state;
  const cityNameJa = (cityId: string) => getCities().find((city) => city.id === cityId)?.nameJa ?? cityId;
  for (const id of prep) {
    // prep= plays the city's own scenes (an earlier city's scene, and the items it gives, are not played here).
    const owner = encounters.encounters.find((item) => item.id === id)?.cityId;
    if (owner && owner !== current.currentCityId)
      throw new Error(`prep= の ${id} は${cityNameJa(owner)}の場面です。prep= は同じ都市（${cityNameJa(current.currentCityId)}）の場面だけを流します。`);
    current = untilEncounter(startEncounterScene(current, id, ticket), id, ticket);
    current = playEncounterFirstChoice(current, ticket);
    for (let step = 0; isSceneOpen(current) && step < MAX_STEPS; step++) current = playOccasionStep(current, ticket);
  }
  const placed = atPlace(current, scenePlaceId(current.currentCityId, undefined, landmarkId));
  const event = getCityContent(current.currentCityId).travel.events.find((item) => visitedLandmarkOfEvent(item.id) === landmarkId);
  const mode = event && [WALK_MODE_ID, ...getTransportModes(current.currentCityId).map((item) => item.id)]
    .find((item) => getTravelEventAvailability(current, event.id, item).available);
  let next = event && mode ? act(current, (s) => beginTravelEvent(s, event.id, mode, s.revision, () => ticket), `${landmarkId} へ出発`)
    : advanceOccasion({ ...placed, occasion: { kind: "visit", eventId: null, landmarkId,
      parts: landmarkParts(landmarks.find((item) => item.id === landmarkId)!).filter((part) => part !== "guide" || !placed.visitedLandmarkIds.includes(landmarkId)),
      ran: [], at: null, started: [] }, visitedLandmarkIds: placed.visitedLandmarkIds.includes(landmarkId) ? placed.visitedLandmarkIds : [...placed.visitedLandmarkIds, landmarkId] }, () => ticket);
  if (!from) return validateGameState(next);
  for (let step = 0; next.activeEncounter?.encounterId !== from; step++) {
    if (!isSceneOpen(next) || step > MAX_STEPS) {
      const rule = encounterEntryRule(from)?.when;
      const unmet = rule ? unmetConditionLabels(next, rule) : [];
      // An item of an earlier city: Debug starts without it, and prep= plays only this city's scenes (the item design §2.7).
      const earlier = rule ? otherCityItemsMissing(next, rule) : [];
      const givers = encounters.encounters.filter((item) => item.cityId === next.currentCityId && rule && JSON.stringify(rule).includes(`"${item.completionItemId}"`))
        .map((item) => item.id);
      throw new Error(`場面 ${from} はこの時点で始まりませんでした。${unmet.length ? `偽の部品：${unmet.join("、")}。` : ""}` +
        `${earlier.length ? `${earlier.map((item) => `${item.cityNameJa}の品物 ${item.itemId} ${item.statusJa}こと`).join("、")}が要ります` +
          "（Debug は前の都市を本筋（到着・バトル・フィナーレと、エピローグの後に次の都市へ進む旅行編ではエピローグ。観光の案内は飛ばす）に沿って遊んでから始まるので、デート・差し込み・観光の案内・道中交流でしかもらえない品物や、" +
          "選択肢で渡した・使った記録はないことがあります。prep= は同じ都市の場面だけを流します）。" : ""}` +
        `${givers.length ? `品物をくれる場面：${givers.join("、")}（prep= で先に流せます）。` : ""}`);
    }
    next = playOccasionStep(next, ticket);
  }
  return validateGameState(next);
}

/** One step of an occasion as a player would take it (Debug's 「場面から始める」). */
function playOccasionStep(state: GameState, ticket: number): GameState {
  if (state.activeEncounter) {
    const active = state.activeEncounter;
    if (active.phase === "quiz") {
      const quiz = encounters.encounters.find((item) => item.id === active.encounterId)!.quiz!.question;
      return act(state, (current) => answerEncounterQuiz(current, quiz.correctOptionId, current.revision), "交流のクイズ");
    }
    const choice = active.frame.choices.find((item) => getEncounterOptionAvailability(state, item.index).available);
    if (choice) return act(state, (current) => chooseEncounter(current, choice.index, current.revision, () => ticket), "交流の選択");
    return act(state, (current) => continueTourismEncounters(current, encounterCanFinish(current) ? finishEncounter(current, current.revision)
      : advanceEncounter(current, current.revision), () => ticket), "交流を進める");
  }
  // A tour leg's narration (tour stage 2b): read to its end, then its leg's moment goes on.
  if (state.activeEpilogue?.kind === "tour_leg") return act(state, epilogueStep, "ツアーの区間の語り");
  if (state.activeTourism?.phase === "guide") return guideSkip(state);
  if (state.activeTourism) return act(state, (current) => proceedFromTourism(current, current.revision, () => ticket), "観察の「進む」");
  if (state.activeBattle?.phase === "result") return act(state, (current) => leaveBattleToFreeTime(current, current.revision, () => ticket), "対決の結果を閉じる");
  if (state.activeBattle) return playBattleToResult(state);
  if (state.occasion?.romanceEnding) return act(state, (current) => closeRomanceEnding(current, current.revision, () => ticket), "「交際開始」");
  throw new Error("この時点を進められませんでした。");
}

/** Start a date at its place with a saved reaction ticket; its AP is spent as on the map. */
export function startDateScene(state: GameState, dateId: string, ticket: number): GameState {
  const placed = atPlace(state, scenePlaceId(state.currentCityId, dateId, undefined));
  const next = startDate(placed, dateId, () => ticket);
  if (!next.activeDate) {
    // Debug names the unmet parts of the date's when, and an until that has been reached.
    const date = dates.find((item) => item.id === dateId);
    const parts = [...(date?.when ? [date.when] : []), ...(date?.until ? [{ not: date.until }] : [])];
    const unmet = parts.length ? unmetConditionLabels(placed, { all: parts }) : [];
    throw new Error(`この進行状態ではデートを始められません。APや解放条件を確認してください。${unmet.length ? `デートの条件を満たしていません：${unmet.join("、")}` : ""}`);
  }
  return validateGameState(next);
}

/**
 * Open the cleared current city's epilogue (as from its finale result or the city's records; a city whose author starts
 * it with a then: epilogue, as that then: does). The scenes before it (stage 4) are played with their first choices.
 */
export function openEpilogueScene(state: GameState): GameState {
  const cleared = state.completedCityIds.includes(state.currentCityId);
  const next = cleared ? settleScenes(openEpilogue(state, isAuthoredEpilogueCity(state.currentCityId), () => 0), 0) : state;
  if (!next.activeEpilogue) throw new Error("エピローグは都市クリア後に開けます。旅の進行を「都市クリア後」にしてください。");
  return validateGameState(next);
}
