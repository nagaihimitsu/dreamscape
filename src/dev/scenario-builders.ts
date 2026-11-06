/**
 * Development and test only: game states built with the real game functions.
 *
 * Unit tests, Debug (src/dev/debug-state.ts) and the E2E state shortcuts use
 * these builders, so a scene is prepared the same way everywhere. Progress is
 * made only through the domain functions the screens call (every action must
 * change the state, and a finished map event is settled like GameApp does);
 * every builder returns a state that passes validateGameState. Only the scene
 * openers and withAp/withRelationship set values directly, as Debug always has:
 * they place the player at the scene's place and set AP and the relationship.
 * Never imported by production code (scripts/dist-guard.ts checks the build).
 */
import { balance, battles, episodes, getCities, getCityContent, type QuizQuestion } from "../content";
import { encounters } from "../content/encounters";
import { getJourneyForCity } from "../content/journeys";
import { advanceBattle, answerBattle, getActiveBattleContent, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "../domain/battle";
import { getNextEpisode, getNextStoryBattle, startEpisode } from "../domain/chapter";
import { departToNextCity } from "../domain/city-travel";
import { startEncounter, startTourismEncounter } from "../domain/encounter";
import { advanceCityEpilogue, completeArrivalLogo, startCityArrival, startCityEpilogue } from "../domain/epilogue";
import { createGame, startDate, validateGameState, type GameState } from "../domain/game";
import { advanceTourismGuide, openTourism, replayTourismGuide, skipTourismGuide, startTourismBattle } from "../domain/tourism";
import { finishTravelEventIfComplete } from "../domain/travel-game";
import { minimumHomeFare } from "../domain/travel-routes";

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

/** One player action: it must change the state; a finished map event is settled as GameApp settles it. */
function act(state: GameState, change: (current: GameState) => GameState, what: string, options: PlayOptions = {}): GameState {
  const changed = change(state);
  if (changed === state) throw new Error(`${what}: この操作では状態が変わりませんでした。`);
  const settled = finishTravelEventIfComplete(state, changed);
  return options.after ? options.after(settled, state) : settled;
}

/** Play the active battle to its result screen: correct evidence for B/C, answers by `options.answer`. */
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
    } else state = act(state, (current) => advanceBattle(current, current.revision), what, options);
  }
  return state;
}

/** Read the open sightseeing guide line by line to its end (the guide's reward is earned). */
export function readGuide(initial: GameState, options: PlayOptions = {}): GameState {
  let state = initial;
  for (let line = 0; state.activeTourism?.phase === "guide"; line++) {
    if (line > MAX_STEPS) throw new Error(`観光案内 ${state.activeTourism.landmarkId} を読み終えられませんでした。`);
    state = act(state, (current) => advanceTourismGuide(current, current.revision), "観光案内", options);
  }
  return state;
}

/** From an opened guide or observation, go on to the landmark's battle (read or skip the guide first). */
function tourismToBattle(initial: GameState, options: EpisodePlayOptions): GameState {
  let state = initial;
  if (state.activeTourism?.phase === "guide")
    state = options.guide === "read" ? readGuide(state, options)
      : act(state, (current) => skipTourismGuide(current, current.revision), "観光案内を飛ばす", options);
  if (state.activeTourism)
    state = act(state, (current) => startTourismBattle(current, current.revision), "観光地の対決", options);
  return state;
}

/** Start an episode (its guide, then its battle; a finale starts its battle) and play to the result screen. */
export function playEpisodeToResult(state: GameState, episodeId: string, options: EpisodePlayOptions = {}): GameState {
  const started = act(state, (current) => startEpisode(current, episodeId), `エピソード ${episodeId} を始める`, options);
  return playBattleToResult(tourismToBattle(started, options), options);
}

/** Finish one main episode like a player: guide, battle and leaving its result. */
export function finishEpisode(state: GameState, episodeId: string, options: EpisodePlayOptions = {}): GameState {
  const result = playEpisodeToResult(state, episodeId, options);
  return validateGameState(act(result, (current) => leaveBattle(current, current.revision), "対決の結果を閉じる", options));
}

/**
 * Play the current city's remaining special battles and episodes in the order
 * the city recommends, until the finale's result screen (the city is cleared).
 */
export function playCityToFinaleResult(initial: GameState, options: CityPlayOptions = {}): GameState {
  const cityId = initial.currentCityId;
  let state = initial;
  for (let count = 0; ; count++) {
    if (count > 50) throw new Error(`${cityId} のフィナーレまで進められませんでした。`);
    const special = getNextStoryBattle(state);
    const episode = special ? null : getNextEpisode(state);
    if (!special && !episode) throw new Error(`${cityId} に次の対決がありません。`);
    state = special
      ? playBattleToResult(act(state, (current) => startBattle(current, special.battleId), `特殊戦 ${special.battleId} を始める`, options), options)
      : playEpisodeToResult(state, episode!.id, options);
    options.onResult?.(state);
    if (episode?.kind === "city_finale") return validateGameState(state);
    state = act(state, (current) => leaveBattle(current, current.revision), "対決の結果を閉じる", options);
  }
}

/** Clear the current city: every remaining battle, the finale, and leaving the finale's result. */
export function clearCity(state: GameState, options: CityPlayOptions = {}): GameState {
  const result = playCityToFinaleResult(state, options);
  return validateGameState(act(result, (current) => leaveBattle(current, current.revision), "フィナーレの結果を閉じる", options));
}

/** Finish the arrival logo and conversation through their real, effect-free transitions. */
export function settleArrival(initial: GameState): GameState {
  let state = initial.activeEpilogue?.kind === "arrival" && !initial.activeEpilogue.logoComplete
    ? completeArrivalLogo(initial, initial.revision) : initial;
  for (let line = 0; state.activeEpilogue?.kind === "arrival"; line++) {
    if (line > MAX_STEPS) throw new Error("到着の会話を完了できませんでした。");
    state = act(state, (current) => advanceCityEpilogue(current, current.revision), "到着の会話");
  }
  return validateGameState(state);
}

/** Read the open city epilogue to its end. */
export function readEpilogue(initial: GameState): GameState {
  let state = initial;
  for (let line = 0; state.activeEpilogue && state.activeEpilogue.kind !== "arrival"; line++) {
    if (line > MAX_STEPS) throw new Error("エピローグを読み終えられませんでした。");
    state = act(state, (current) => advanceCityEpilogue(current, current.revision), "エピローグ");
  }
  return validateGameState(state);
}

/** A new game as the title screen starts it: the journey's first city with its arrival read. */
export function newJourney(journeyId: string, names?: Names): GameState {
  const created = names ? createGame(names[0], names[1], { journeyId }) : createGame(undefined, undefined, { journeyId });
  return settleArrival(startCityArrival(created, created.revision));
}

/**
 * Leave a cleared city the way its journey does: a journey that moves on after
 * the epilogue reads it first; otherwise the player departs from the map.
 */
export function departFromClearedCity(state: GameState): GameState {
  const read = getJourneyForCity(state.currentCityId)?.cityTransition === "after_epilogue"
    ? readEpilogue(openEpilogueScene(state)) : state;
  const departed = departToNextCity(read, read.revision);
  if (departed === read) throw new Error(`${state.currentCityId} から次の都市へ出発できませんでした。`);
  return settleArrival(departed);
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

/** The city cleared and its finale result left: free time after the clear. */
export function completedCity(cityId: string, options: CityPlayOptions & { names?: Names } = {}): GameState {
  return clearCity(cityStart(cityId, options.names), options);
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
export function atPlace(state: GameState, placeId: string): GameState {
  const { travel } = getCityContent(state.currentCityId);
  if (!travel.places.some((place) => place.id === placeId)) throw new Error("この街に場面の地点が見つかりません。");
  const returnReserve = minimumHomeFare(travel.routes, placeId, state.travel.hotelPlaceId, state.travel.minute);
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
  let next = openTourism(atPlace(state, scenePlaceId(state.currentCityId, undefined, landmarkId)), landmarkId);
  if (next.activeTourism?.phase === "exploring") next = replayTourismGuide(next, next.revision);
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

/** Start an encounter at its place with a saved reaction ticket (a place encounter opens its observation first). */
export function startEncounterScene(state: GameState, encounterId: string, ticket: number): GameState {
  const encounter = encounters.encounters.find((item) => item.id === encounterId && item.cityId === state.currentCityId);
  const placed = atPlace(state, scenePlaceId(state.currentCityId, undefined, encounter?.landmarkId ?? undefined));
  const nextRoll = () => ticket;
  let next: GameState;
  if (encounter?.availability === "tourism") {
    next = openTourism(placed, encounter.landmarkId!);
    if (next.activeTourism?.phase === "guide") next = skipTourismGuide(next, next.revision);
    next = startTourismEncounter(next, encounterId, next.revision, nextRoll);
  } else next = startEncounter(placed, encounterId, nextRoll);
  if (!next.activeEncounter) throw new Error("この進行状態では交流を始められません。必要な進行や品物を確認してください。");
  return validateGameState(next);
}

/** Start a date at its place with a saved reaction ticket; its AP is spent as on the map. */
export function startDateScene(state: GameState, dateId: string, ticket: number): GameState {
  const next = startDate(atPlace(state, scenePlaceId(state.currentCityId, dateId, undefined)), dateId, () => ticket);
  if (!next.activeDate) throw new Error("この進行状態ではデートを始められません。APや解放条件を確認してください。");
  return validateGameState(next);
}

/** Open the cleared current city's epilogue (as from its finale result or the city's records). */
export function openEpilogueScene(state: GameState): GameState {
  const next = startCityEpilogue(state, state.currentCityId, state.revision);
  if (!next.activeEpilogue) throw new Error("エピローグは都市クリア後に開けます。旅の進行を「都市クリア後」にしてください。");
  return validateGameState(next);
}
