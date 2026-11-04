import { balance, battles, city, episodes, getCities, getCityContent } from "../content";
import { createGame, startDate, validateGameState, type GameState } from "../domain/game";
import { getNextEpisode, getNextStoryBattle, startEpisode } from "../domain/chapter";
import { openTourism, replayTourismGuide, skipTourismGuide, startTourismBattle } from "../domain/tourism";
import { advanceBattle, answerBattle, getActiveBattleContent, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "../domain/battle";
import { startEncounter, startTourismEncounter } from "../domain/encounter";
import { departToNextCity } from "../domain/city-travel";
import { encounters } from "../content/encounters";
import { minimumHomeFare } from "../domain/travel-routes";
import { getJourneyForCity } from "../content/journeys";

export type DebugScene = "tourism" | "battle" | "encounter" | "date";
export type DebugSettings = {
  cityId?: string;
  scene: DebugScene;
  id: string;
  progress: "initial" | "completed";
  ap: number;
  affection: number;
  trust: number;
  spark: number;
  roll: "positive" | "negative";
};

const completedByCity = new Map<string, GameState>();

/** Prepare linked earlier cities through the same progress and departure rules. */
function startingCity(cityId: string, visited = new Set<string>()): GameState {
  if (visited.has(cityId)) throw new Error("都市の出発先が循環しています。");
  const chain = new Set(visited).add(cityId);
  const previous = getCities().find((item) => item.nextCityId === cityId && item.productionStatus === "complete");
  if (previous) {
    const completed = completedJourney(previous.id, chain);
    const departed = departToNextCity(completed, completed.revision);
    if (departed.currentCityId !== cityId) throw new Error("前の街から出発できませんでした。");
    return departed;
  }
  const base = createGame();
  const { travelSettings } = getCityContent(cityId);
  const journey = getJourneyForCity(cityId);
  const initial = journey?.initialState;
  return { ...base, currentCityId: cityId, travelBudget: journey?.initialBudget ?? travelSettings.initialBudget,
    ap: initial?.ap ?? base.ap, affection: initial?.affection ?? base.affection,
    trust: initial?.trust ?? base.trust, spark: initial?.spark ?? base.spark,
    romanceStage: initial?.romanceStage ?? base.romanceStage, confessionStatus: initial?.confessionStatus ?? base.confessionStatus,
    travel: { ...base.travel, currentPlaceId: travelSettings.hotelPlaceId, hotelPlaceId: travelSettings.hotelPlaceId,
      ...(journey?.startWeekday === undefined ? {} : { calendar: { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: journey.startWeekday } }) } };
}

/** Generate a consistent completed journey using the actual game rules. */
function completedJourney(cityId: string, visited = new Set<string>()): GameState {
  if (visited.has(cityId)) throw new Error("都市の出発先が循環しています。");
  const cached = completedByCity.get(cityId);
  if (cached) return cached;
  let state = startingCity(cityId, visited);
  for (let count = 0; !state.completedCityIds.includes(cityId); count++) {
    if (count > 30) throw new Error("旅の準備を完了できませんでした。");
    const special = getNextStoryBattle(state);
    const episode = getNextEpisode(state);
    if (!special && !episode) throw new Error("次の旅が見つかりません。");
    state = special ? startBattle(state, special.battleId) : startEpisode(state, episode!.id);
    if (state.activeTourism?.phase === "guide") state = skipTourismGuide(state, state.revision);
    if (state.activeTourism) state = startTourismBattle(state, state.revision);
    for (let step = 0; state.activeBattle?.phase !== "result"; step++) {
      if (!state.activeBattle || step > 250) throw new Error("バトルの準備を完了できませんでした。");
      const active = state.activeBattle;
      const { battle, quiz } = getActiveBattleContent(active);
      if (active.phase === "reasoning") {
        for (const id of battle.reasoning!.correctClueIds) state = selectReasoningClue(state, id, state.revision);
        state = submitBattleEvidence(state, state.revision);
      } else if (active.phase === "question") {
        state = answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision);
      } else state = advanceBattle(state, state.revision);
    }
    state = leaveBattle(state, state.revision);
  }
  const complete = validateGameState(state);
  completedByCity.set(cityId, complete);
  return complete;
}

/** Build only states the real game functions can start; never alter player data. */
export function createDebugState(settings: DebugSettings): GameState {
  const cityId = settings.cityId ?? city.id;
  const base = settings.progress === "initial" ? startingCity(cityId) : completedJourney(cityId);
  let state: GameState = {
    ...base,
    // The requested AP value is the whole debug balance; retained pending
    // credits would otherwise be paid immediately after a date starts.
    pendingApRewards: [],
    ap: Math.min(balance.apCap, Math.max(0, settings.ap)),
    affection: settings.affection,
    trust: settings.trust,
    spark: settings.spark,
  };
  const { travel } = getCityContent(cityId);
  const landmarkId = settings.scene === "tourism" ? settings.id
    : settings.scene === "battle" ? battles.find((item) => item.id === settings.id)?.landmarkId
      : settings.scene === "encounter" ? encounters.encounters.find((item) => item.id === settings.id)?.landmarkId
        : undefined;
  const eventId = settings.scene === "battle"
    ? episodes.find((item) => item.cityId === cityId && item.battleId === settings.id)?.id ?? settings.id
    : settings.scene === "date" ? settings.id : undefined;
  const event = travel.events.find((item) => item.id === eventId);
  const place = travel.places.find((item) => item.id === event?.placeId) ??
    travel.places.find((item) => landmarkId && item.landmarkIds?.includes(landmarkId));
  if (!place) throw new Error("この街に場面の地点が見つかりません。");
  const returnReserve = minimumHomeFare(travel.routes, place.id, state.travel.hotelPlaceId, state.travel.minute);
  if (returnReserve === undefined || returnReserve > state.travelBudget)
    throw new Error("この地点から滞在先への帰路を確認できません。");
  state = { ...state, travel: { ...state.travel, currentPlaceId: place.id, returnReserve } };
  const nextRoll = () => settings.roll === "positive" ? 0 : 9999;
  switch (settings.scene) {
    case "tourism":
      state = openTourism(state, settings.id);
      if (state.activeTourism?.phase === "exploring") state = replayTourismGuide(state, state.revision);
      if (!state.activeTourism) throw new Error("この進行状態では場所を開けません。都市クリア後を選んでください。");
      break;
    case "battle":
      state = startBattle(state, settings.id);
      if (!state.activeBattle) throw new Error("この進行状態ではバトルを始められません。");
      break;
    case "encounter": {
      const encounter = encounters.encounters.find((item) => item.id === settings.id && item.cityId === cityId);
      if (encounter?.availability === "tourism") {
        state = openTourism(state, encounter.landmarkId);
        if (state.activeTourism?.phase === "guide") state = skipTourismGuide(state, state.revision);
        state = startTourismEncounter(state, settings.id, state.revision, nextRoll);
      } else state = startEncounter(state, settings.id, nextRoll);
      if (!state.activeEncounter) throw new Error("この進行状態では交流を始められません。必要な進行や品物を確認してください。");
      break;
    }
    case "date":
      state = startDate(state, settings.id, nextRoll);
      if (!state.activeDate) throw new Error("この進行状態ではデートを始められません。APや解放条件を確認してください。");
      break;
  }
  return validateGameState(state);
}
