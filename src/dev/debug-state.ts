import { battles, dateDestinations, dates, episodes, getCities, getCityContent, landmarks, type CityContent } from "../content";
import { encounters } from "../content/encounters";
import { battleCityId } from "../domain/chapter";
import { validateGameState, type GameState } from "../domain/game";
import { defaultJourneyId, getJourney } from "../content/journeys";
import { debugSceneLabels, debugValueRanges, type DebugQuery, type DebugScene, type DebugSettings } from "./debug-query";
import {
  cityStart, completedCity, openBattleScene, openEpilogueScene, openTourismScene, rollTickets,
  startDateScene, startEncounterScene, withAp, withRelationship,
} from "./scenario-builders";

export type { DebugScene, DebugSettings } from "./debug-query";

/** Debug opens the first city of the default journey unless another city is chosen. */
export const defaultDebugCityId = getJourney(defaultJourneyId)!.cities[0].id;

export type DebugTarget = { id: string; name: string };

/** What each scene of the settings screen can open in a city. */
export function debugTargets(cityId: string): Record<DebugScene, DebugTarget[]> {
  const { city, travel } = getCityContent(cityId);
  return {
    tourism: landmarks.filter((item) => item.cityId === cityId).map((item) => ({ id: item.id, name: item.nameJa })),
    battle: battles.filter((item) => battleCityId(item.id) === cityId).map((item) => ({ id: item.id, name: item.titleJa })),
    encounter: encounters.encounters.filter((item) => item.cityId === cityId && item.availability !== "dormant").map((item) => ({ id: item.id, name: item.titleJa })),
    date: dates.filter((item) => item.kind === "normal" && travel.events.some((event) => event.id === item.id)).map((item) => ({ id: item.id, name: item.titleJa })),
    epilogue: episodes.filter((item) => item.cityId === cityId && item.kind === "city_finale" && item.epilogueStoryId)
      .map((item) => ({ id: item.id, name: `${city.nameJa}のエピローグ` })),
  };
}

/** The settings screen's starting values for a city. */
export function defaultDebugSettings(cityId = defaultDebugCityId): DebugSettings {
  return { cityId, scene: "tourism", id: debugTargets(cityId).tourism[0]?.id ?? "", progress: "completed",
    ap: debugValueRanges.ap[1], affection: 0, trust: 0, spark: 0, roll: "positive" };
}

export type DebugLaunch = { kind: "scene"; settings: DebugSettings } | { kind: "map"; cityId: string };

/** Check a launch URL against the content and fill the omitted values; throws a message for the person. */
export function resolveDebugLaunch(query: DebugQuery): DebugLaunch {
  const cityId = query.cityId ?? defaultDebugCityId;
  const city = getCities().find((item) => item.id === cityId);
  if (!city) throw new Error(`都市「${cityId}」は登録されていません。${query.dataMode === "fixture" ? "" : "仮の場面の都市なら data=fixture を付けます。"}`);
  const prototype = city.productionStatus === "prototype";
  if (query.scene === "map") {
    if (!prototype) throw new Error(`地図・交通の確認（scene=map）は制作中の都市だけで使えます。${city.nameJa}では観光・バトルなどの場面を指定してください。`);
    return { kind: "map", cityId };
  }
  if (prototype) throw new Error(`${city.nameJa}は制作中の都市で、物語・クイズはまだありません。地図・交通は scene=map で確認できます。`);
  const label = debugSceneLabels[query.scene];
  const targets = debugTargets(cityId)[query.scene];
  if (!targets.length) throw new Error(`${city.nameJa}には「${label}」の場面がありません。`);
  const id = query.target ?? targets[0].id;
  if (!targets.some((item) => item.id === id)) throw new Error(`「${id}」は${city.nameJa}の「${label}」にありません。`);
  const defaults = defaultDebugSettings(cityId);
  return { kind: "scene", settings: { ...defaults, scene: query.scene, id,
    progress: query.progress ?? defaults.progress, ap: query.ap ?? defaults.ap, affection: query.affection ?? defaults.affection,
    trust: query.trust ?? defaults.trust, spark: query.spark ?? defaults.spark, roll: query.roll ?? defaults.roll } };
}

// Keyed by the city's content object: installing 仮の場面 again (possibly from another
// template city) registers new objects, so a cleared state of an older copy is never reused.
const completedByCity = new WeakMap<CityContent, GameState>();

/** Debug reuses a city's cleared state while it stays open (about 0.1 s per city to build). */
function completedJourney(cityId: string): GameState {
  const content = getCityContent(cityId);
  const cached = completedByCity.get(content) ?? completedCity(cityId);
  completedByCity.set(content, cached);
  return cached;
}

/** Build only states the real game functions can start; never alter player data. */
export function createDebugState(settings: DebugSettings): GameState {
  const cityId = settings.cityId ?? defaultDebugCityId;
  if (settings.scene === "epilogue" && settings.progress === "initial")
    throw new Error("エピローグは都市クリア後に開けます。旅の進行を「都市クリア後」にしてください。");
  const base = settings.progress === "initial" ? cityStart(cityId) : completedJourney(cityId);
  const state = withRelationship(withAp(base, settings.ap), settings);
  const ticket = rollTickets[settings.roll];
  switch (settings.scene) {
    case "tourism": return openTourismScene(state, settings.id);
    case "battle": return openBattleScene(state, settings.id);
    case "encounter": return startEncounterScene(state, settings.id, ticket);
    case "date": return startDateScene(state, settings.id, ticket);
    case "epilogue": {
      if (!episodes.some((item) => item.id === settings.id && item.cityId === cityId && item.kind === "city_finale"))
        throw new Error(`「${settings.id}」は${getCityContent(cityId).city.nameJa}のフィナーレではありません。`);
      return validateGameState(openEpilogueScene(state));
    }
  }
}

/** Where the scene starts, for the Debug bar: the landmark, the date's destination or the city. */
export function debugSceneLocation(settings: DebugSettings, state: GameState): string {
  const landmarkId = settings.scene === "tourism" ? settings.id
    : settings.scene === "battle" ? battles.find((item) => item.id === settings.id)?.landmarkId
      : settings.scene === "encounter" ? encounters.encounters.find((item) => item.id === settings.id)?.landmarkId
        : undefined;
  const destinationId = settings.scene === "date" ? dates.find((item) => item.id === settings.id)?.destinationId : undefined;
  return landmarks.find((item) => item.id === landmarkId)?.nameJa ??
    dateDestinations.find((item) => item.id === destinationId)?.nameJa ??
    getCityContent(state.currentCityId).city.nameJa;
}
