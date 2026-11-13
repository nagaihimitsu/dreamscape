import { encounterVisitSlot, landmarkVisitOrder } from "../domain/encounter";
import { battles, dateDestinations, dates, episodes, getCities, getCityContent, getCityTours, getTour, landmarks, type CityContent } from "../content";
import { isTourOnlyPlace } from "../content/travel-schemas";
import { encounters } from "../content/encounters";
import { battleCityId } from "../domain/chapter";
import { validateGameState, type GameState } from "../domain/game";
import { defaultJourneyId, getJourney } from "../content/journeys";
import { debugSceneLabels, debugValueRanges, type DebugQuery, type DebugScene, type DebugSettings } from "./debug-query";
import {
  cityStart, completedCity, finishEpisode, openBattleScene, openEpilogueScene, openTourismScene, rollTickets,
  startDateScene, startEncounterScene, startOccasionScene, tourScene, withAp, withRelationship,
} from "./scenario-builders";

export type { DebugScene, DebugSettings } from "./debug-query";

/** Debug opens the first city of the default journey unless another city is chosen. */
export const defaultDebugCityId = getJourney(defaultJourneyId)!.cities[0].id;

/**
 * A scene target; `unavailable` says why Debug can never open it (the screen shows it disabled, a URL is refused), and
 * `unavailableKind` what kind of reason it is: an item Debug's states lack, or a tour-only place (scene=tour opens it).
 */
export type DebugTarget = { id: string; name: string; unavailable?: string; unavailableKind?: "item" | "tour" };

/** Debug opens a tour-only place's scenes (tour stage 2a) only through its tour. */
const TOUR_ONLY = { unavailable: "ツアーの場面（scene=tour）から開けます", unavailableKind: "tour" as const };

type Encounter = (typeof encounters.encounters)[number];

/**
 * Debug's states hold no items: items come only from encounters. An encounter met while observing
 * starts after the observation's scenes before it, played with their first choices (startEncounterScene),
 * so one whose every choice needs an item that no such scene gives never starts there (its observation
 * refuses it: 必要な品物を持っていません). One met before or after a landmark's main part follows its
 * moment, playing the encounters before it with their first choices, which may give the item; when
 * not, its start explains the rule.
 */
function encounterTarget(item: Encounter): DebugTarget {
  if (encounterVisitSlot(item.id) !== "observe") return { id: item.id, name: item.titleJa };
  const order = item.landmarkId ? landmarkVisitOrder(item.landmarkId, "observe") : [];
  const givenBefore = new Set(order.slice(0, Math.max(0, order.indexOf(item.id)))
    .map((id) => encounters.encounters.find((event) => event.id === id)?.completionItemId).filter((id): id is string => !!id));
  const choices = item.options.filter((option) => !option.deferCompletion);
  const needed = choices.length && choices.every((option) => option.requiresItemId && !givenBefore.has(option.requiresItemId))
    ? [...new Set(choices.map((option) => option.requiresItemId!))] : [];
  const names = needed.map((id) => `「${encounters.items.find((entry) => entry.id === id)?.nameJa ?? id}」`).join("・");
  return { id: item.id, name: item.titleJa, ...(needed.length ? { unavailable: `品物${names}が必要なため開けません`, unavailableKind: "item" as const } : {}) };
}

/** The first target Debug can open, as the scene picker (場面の確認) preselects it. */
export function firstDebugTarget(targets: readonly DebugTarget[]): string {
  return targets.find((item) => !item.unavailable)?.id ?? "";
}

/** What each scene of the scene picker (場面の確認) lists for a city. */
export function debugTargets(cityId: string): Record<DebugScene, DebugTarget[]> {
  const { city, travel } = getCityContent(cityId);
  // A tour-only place's landmarks and map events (tour stage 2a): their scenes open only through the tour.
  const tourOnly = new Set(travel.places.filter((place) => isTourOnlyPlace(place)).flatMap((place) => [place.id, ...(place.landmarkIds ?? [])]));
  const atTourOnly = (landmarkId: string | null | undefined, eventId?: string) => (!!landmarkId && tourOnly.has(landmarkId)) ||
    (eventId !== undefined && tourOnly.has(travel.events.find((event) => event.id === eventId)?.placeId ?? ""));
  const mark = (target: DebugTarget, tour: boolean): DebugTarget => (tour ? { ...target, ...TOUR_ONLY } : target);
  return {
    tourism: landmarks.filter((item) => item.cityId === cityId).map((item) => mark({ id: item.id, name: item.nameJa }, atTourOnly(item.id))),
    battle: battles.filter((item) => battleCityId(item.id) === cityId).map((item) => mark({ id: item.id, name: item.titleJa },
      atTourOnly(item.landmarkId, episodes.find((episode) => episode.battleId === item.id)?.id ?? item.id))),
    // A landmark's visit's scenes (a scene of another moment, stage 4, runs when its moment opens in play: the date, the hotel…).
    encounter: encounters.encounters.filter((item) => item.cityId === cityId && item.landmarkId)
      .map((item) => (atTourOnly(item.landmarkId) ? { id: item.id, name: item.titleJa, ...TOUR_ONLY } : encounterTarget(item))),
    date: dates.filter((item) => item.kind === "normal" && travel.events.some((event) => event.id === item.id))
      .map((item) => mark({ id: item.id, name: item.titleJa }, atTourOnly(undefined, item.id))),
    epilogue: episodes.filter((item) => item.cityId === cityId && item.kind === "city_finale" && item.epilogueStoryId)
      .map((item) => ({ id: item.id, name: `${city.nameJa}のエピローグ` })),
    occasion: landmarks.filter((item) => item.cityId === cityId).map((item) => mark({ id: item.id, name: `${item.nameJa}の時点` }, atTourOnly(item.id))),
    tour: getCityTours(cityId).map((item) => ({ id: item.id, name: item.titleJa })),
  };
}

/** The scene picker's starting values for a city. */
export function defaultDebugSettings(cityId = defaultDebugCityId): DebugSettings {
  return { cityId, scene: "tourism", id: firstDebugTarget(debugTargets(cityId).tourism), progress: "completed",
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
  const id = query.target ?? firstDebugTarget(targets);
  if (!id) throw new Error(`${city.nameJa}の「${label}」は、どれもDebugでは開けません（理由は場面の確認の一覧にあります）。`);
  const target = targets.find((item) => item.id === id);
  if (!target) throw new Error(`「${id}」は${city.nameJa}の「${label}」にありません。`);
  if (target.unavailable)
    throw new Error(`「${id}」（${target.name}）は、${target.unavailable}。${target.unavailableKind === "item" ? "Debugの場面は品物を持たない状態から始まります。" : ""}`);
  const defaults = defaultDebugSettings(cityId);
  // A tour is booked before the city is cleared (a cleared city has played its tour): it starts at the city's start.
  const progress = query.progress ?? (query.scene === "tour" ? "initial" : defaults.progress);
  return { kind: "scene", settings: { ...defaults, scene: query.scene, id,
    progress, ap: query.ap ?? defaults.ap, affection: query.affection ?? defaults.affection,
    trust: query.trust ?? defaults.trust, spark: query.spark ?? defaults.spark, roll: query.roll ?? defaults.roll,
    ...(query.from ? { from: query.from } : {}), ...(query.prep ? { prep: query.prep } : {}), ...(query.step ? { step: query.step } : {}),
    ...(query.without ? { without: query.without } : {}), ...(query.before ? { before: query.before } : {}) } };
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

/** The state a Debug scene starts from: the city's start, or its cleared state (kept while Debug stays open). */
export function debugCityState(cityId: string, progress: DebugSettings["progress"]): GameState {
  return progress === "initial" ? cityStart(cityId) : completedJourney(cityId);
}

/** The state without the held items a date's `without` names (the branch of a player who never got them); each must be held. */
function withoutHeldItems(state: GameState, itemIds: readonly string[]): GameState {
  if (!itemIds.length) return state;
  const inventory = { ...state.inventory };
  for (const id of itemIds) {
    if (inventory[id] !== "held") throw new Error(`without の「${id}」は、Debugのこの場面の状態で持っている品物ではありません。`);
    delete inventory[id];
  }
  return { ...state, inventory };
}

/**
 * A date opened before an episode its story asks about (`before`): Debug's cleared city has done every episode, so that
 * branch (Lodhi Garden's for a player who has not seen Humayun's Tomb) would never open. From the city's start, the city's
 * other episodes (not its finale) are finished one by one, in their order, until the date can start (its own `when`); an
 * episode that cannot be played that way (a tour's stop) is passed over.
 */
function dateBeforeEpisode(settings: DebugSettings, before: string, cityId: string): GameState {
  if (!episodes.some((episode) => episode.id === before && episode.cityId === cityId && episode.kind !== "city_finale"))
    throw new Error(`before の「${before}」は、${getCityContent(cityId).city.nameJa}のフィナーレでないエピソードではありません。`);
  const others = episodes.filter((episode) => episode.cityId === cityId && episode.kind !== "city_finale" && episode.id !== before);
  let state = cityStart(cityId);
  for (const next of [...others, null]) {
    try {
      return startDateScene(withRelationship(withAp(withoutHeldItems(state, settings.without ?? []), settings.ap), settings), settings.id,
        rollTickets[settings.roll]);
    } catch (error) {
      // The date's `when` is not met yet: one more episode.
      if (!next) throw new Error(`「${settings.id}」は「${before}」の前には始められません（${error instanceof Error ? error.message : String(error)}）`);
    }
    try {
      state = finishEpisode(state, next.id);
    } catch {
      // Not playable from here (a tour's stop, say): the next one.
    }
  }
  throw new Error(`「${settings.id}」は「${before}」の前には始められません`);
}

/** Build only states the real game functions can start; never alter player data. */
export function createDebugState(settings: DebugSettings): GameState {
  const cityId = settings.cityId ?? defaultDebugCityId;
  if (settings.scene === "epilogue" && settings.progress === "initial")
    throw new Error("エピローグは都市クリア後に開けます。旅の進行を「都市クリア後」にしてください。");
  if (settings.scene === "tour" && settings.progress === "completed")
    throw new Error("ツアーは都市クリアの前に予約します。旅の進行を「旅の開始時」にしてください。");
  const base = withoutHeldItems(debugCityState(cityId, settings.progress), settings.without ?? []);
  const state = withRelationship(withAp(base, settings.ap), settings);
  const ticket = rollTickets[settings.roll];
  switch (settings.scene) {
    case "tourism": return openTourismScene(state, settings.id);
    case "battle": return openBattleScene(state, settings.id);
    case "encounter": return startEncounterScene(state, settings.id, ticket);
    case "date": return settings.before ? dateBeforeEpisode(settings, settings.before, cityId) : startDateScene(state, settings.id, ticket);
    case "occasion": return startOccasionScene(state, settings.id, settings.from, settings.prep ?? [], ticket);
    case "tour": {
      if (!getCityTours(cityId).some((item) => item.id === settings.id))
        throw new Error(`「${settings.id}」は${getCityContent(cityId).city.nameJa}のツアーではありません。`);
      return tourScene(state, settings.id, settings.step);
    }
    case "epilogue": {
      if (!episodes.some((item) => item.id === settings.id && item.cityId === cityId && item.kind === "city_finale"))
        throw new Error(`「${settings.id}」は${getCityContent(cityId).city.nameJa}のフィナーレではありません。`);
      return validateGameState(openEpilogueScene(state));
    }
  }
}

/** Where the scene starts, for the Debug bar: the landmark, the date's destination or the city; a tour with its step (「予約中」 before it starts). */
export function debugSceneLocation(settings: DebugSettings, state: GameState): string {
  if (settings.scene === "tour") {
    const tour = getTour(settings.id);
    const record = state.tour;
    const step = record?.status === "running" ? tour?.steps[record.step] : undefined;
    const label = step?.kind === "event" ? step.labelJa ?? getCityContent(state.currentCityId).travel.events.find((event) => event.id === step.eventId)?.titleJa
      : step?.labelJa;
    return `ツアー：${tour?.titleJa ?? settings.id}（${label ?? (record?.status === "booked" ? "予約中" : "行程")}）`;
  }
  const landmarkId = settings.scene === "tourism" ? settings.id
    : settings.scene === "battle" ? battles.find((item) => item.id === settings.id)?.landmarkId
      : settings.scene === "encounter" ? encounters.encounters.find((item) => item.id === settings.id)?.landmarkId
        : undefined;
  const destinationId = settings.scene === "date" ? dates.find((item) => item.id === settings.id)?.destinationId : undefined;
  return landmarks.find((item) => item.id === landmarkId)?.nameJa ??
    dateDestinations.find((item) => item.id === destinationId)?.nameJa ??
    getCityContent(state.currentCityId).city.nameJa;
}
