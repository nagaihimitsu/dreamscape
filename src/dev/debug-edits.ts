import { episodes, getCities, getCityContent, landmarks, scenes, storyState, tourismClues } from "../content";
import { sceneGivenClues } from "../content/scene-schemas";
import { isTourOnlyPlace } from "../content/travel-schemas";
import { getEpisodeAvailability } from "../domain/chapter";
import { formatMoneyForCity } from "../content/currency";
import { getJourneyForCity } from "../content/journeys";
import { validateGameState, type GameState } from "../domain/game";
import { hasActiveScene } from "../domain/game-state-schema";
import { tourKeepBack } from "../domain/reservations";
import { clueRecordAllowed } from "../domain/tourism";
import { getUsableRoutes } from "../domain/transport";
import { minimumHomeFare } from "../domain/travel-routes";
import { clockText, debugDayRange, debugRomanceStages, debugTimeRange, type DebugRomanceStage } from "./debug-query";
import { finishEpisode, withClues } from "./scenario-builders";

/**
 * Debug's changes to a game state (2026-11-15 user request 「〜〜のフラグを得たことにする」「自由時間を指定する」; 2026-11-16
 * 恋の段階; 2026-11-18 the clues heard in conversation): the story flags a scene opens with or the running Debug game has, the
 * clues a scene opens with, free time's clock, and the romance stage. Debug
 * only: what they give is never reached in play this way, but every result is a state the save's own check accepts
 * (validateGameState), so the game goes on from it with its real rules. Each throws a message for the person when it cannot
 * be made.
 */

/** A story flag (progression/story.json `flags`) with its author's note. */
export type DebugFlag = { id: string; noteJa?: string };
/** The flags of one city of a journey (the city whose scenes set or read them), or those no scene names (`cityId` null). */
export type DebugFlagGroup = { cityId: string | null; nameJa: string; flags: DebugFlag[] };

/** The flags a scene of the scene table sets (a choice's or its end's `# set:`) or reads (`# when:`, `cond("flag …")`). */
function flagsNamedBy(scene: (typeof scenes)[number]): Set<string> {
  const named = new Set([...scene.options.flatMap((option) => option.set ?? []), ...(scene.done.set ?? [])]);
  for (const cond of scene.conds) for (const match of cond.matchAll(/(?:^|\s)flag ([a-z][a-z0-9_]*)/gu)) named.add(match[1]);
  for (const match of JSON.stringify(scene.when ?? null).matchAll(/"flag":"([a-z][a-z0-9_]*)"/gu)) named.add(match[1]);
  return named;
}

/**
 * The flags Debug offers for a city: progression/story.json declares a journey's flags in one list for every journey, so a flag
 * belongs to the journey whose city's scene sets or reads it; grouped by that city, in the journey's order, the declared order
 * within a city. A flag no scene names yet (a branch written before the scene that sets it) is offered in every journey, last.
 */
export function debugFlagGroups(cityId: string): DebugFlagGroup[] {
  const journeyCities = getJourneyForCity(cityId)?.cities.map((city) => city.id) ?? [cityId];
  const groups = new Map<string | null, DebugFlag[]>([...journeyCities.map((id) => [id, []] as [string, DebugFlag[]]), [null, []]]);
  const citiesOf = new Map<string, Set<string>>();
  for (const scene of scenes) for (const flag of flagsNamedBy(scene))
    citiesOf.set(flag, (citiesOf.get(flag) ?? new Set()).add(scene.cityId));
  for (const flag of storyState.flags) {
    const cities = citiesOf.get(flag.id);
    const home = cities ? journeyCities.find((id) => cities.has(id)) : null;
    if (home !== undefined) groups.get(home)!.push({ id: flag.id, ...(flag.noteJa ? { noteJa: flag.noteJa } : {}) });
  }
  const cityName = (id: string) => getCities().find((city) => city.id === id)?.nameJa ?? id;
  return [...groups].filter(([, flags]) => flags.length)
    .map(([id, flags]) => ({ cityId: id, nameJa: id === null ? "どの場面も使っていないフラグ" : cityName(id), flags }));
}

/** The IDs of the flags Debug offers for a city (debugFlagGroups). */
export function debugFlagIds(cityId: string): string[] {
  return debugFlagGroups(cityId).flatMap((group) => group.flags.map((flag) => flag.id));
}

/** Throws the reason when a flag is not one Debug offers for the city (a launch URL's `flags`, a change). */
export function checkDebugFlags(cityId: string, ids: readonly string[]): void {
  if (!ids.length) return;
  const offered = debugFlagIds(cityId);
  const unknown = ids.find((id) => !offered.includes(id));
  if (unknown === undefined) return;
  const journey = getJourneyForCity(cityId)?.nameJa ?? getCityContent(cityId).city.nameJa;
  throw new Error(`フラグ「${unknown}」は${journey}のフラグではありません（progression/story.json の flags のID。場面の確認の「フラグを得たことにする」に一覧があります）。`);
}

/** The state with these flags obtained too (a scene's starting state; each must be offered for the current city). */
export function withDebugFlags(state: GameState, ids: readonly string[]): GameState {
  if (!ids.length) return state;
  checkDebugFlags(state.currentCityId, ids);
  const added = ids.filter((id, index) => !state.storyProgress.flags.includes(id) && ids.indexOf(id) === index);
  return validateGameState({ ...state, storyProgress: { ...state.storyProgress, flags: [...state.storyProgress.flags, ...added] } });
}

/** A clue a scene gives (`# clue:`, `# on_done: clue`; 2026-11-18) with its card's title. */
export type DebugClue = { id: string; titleJa: string };
/** The clues of one city of a journey (the city whose scene gives them). */
export type DebugClueGroup = { cityId: string; nameJa: string; clues: DebugClue[] };

/**
 * The clues Debug offers for a city (2026-11-18; the scene picker's 「手がかりを得たことにする」, a launch URL's `clues`): those of
 * the city's journey that some scene gives in conversation. The save check keeps such a clue without its landmark's visit
 * (clueRecordAllowed with no landmark visited); a clue an observation finds is found by opening the observation, in Debug too.
 * Grouped by the city whose scene gives it (the journey's first), in the journey's order, the tourism catalog's order within one.
 */
export function debugClueGroups(cityId: string): DebugClueGroup[] {
  const journeyCities = getJourneyForCity(cityId)?.cities.map((city) => city.id) ?? [cityId];
  const groups = new Map<string, DebugClue[]>(journeyCities.map((id) => [id, []]));
  // The cities whose scenes give each clue (sceneGivenClueIds, by city).
  const givers = new Map<string, Set<string>>();
  for (const scene of scenes) for (const id of sceneGivenClues([scene])) givers.set(id, (givers.get(id) ?? new Set()).add(scene.cityId));
  for (const clue of tourismClues) {
    const cities = givers.get(clue.id);
    const home = cities && journeyCities.find((id) => cities.has(id));
    if (home) groups.get(home)!.push({ id: clue.id, titleJa: clue.titleJa });
  }
  const cityName = (id: string) => getCities().find((city) => city.id === id)?.nameJa ?? id;
  return [...groups].filter(([, clues]) => clues.length).map(([id, clues]) => ({ cityId: id, nameJa: cityName(id), clues }));
}

/** The IDs of the clues Debug offers for a city (debugClueGroups). */
export function debugClueIds(cityId: string): string[] {
  return debugClueGroups(cityId).flatMap((group) => group.clues.map((clue) => clue.id));
}

/** Throws the reason when a clue is not one Debug offers for the city (a launch URL's `clues`, a choice of the scene picker). */
export function checkDebugClues(cityId: string, ids: readonly string[]): void {
  if (!ids.length) return;
  const offered = debugClueIds(cityId);
  const refused = ids.find((id) => !offered.includes(id));
  if (refused === undefined) return;
  const clue = tourismClues.find((item) => item.id === refused);
  const journey = getJourneyForCity(cityId)?.nameJa ?? getCityContent(cityId).city.nameJa;
  if (!clue) throw new Error(`手がかり「${refused}」は登録されていません（tourism/catalog.json の clues のID）。`);
  if (!clueRecordAllowed({ visitedLandmarkIds: [] }, refused))
    throw new Error(`手がかり「${refused}」は場面が渡す手がかりではありません。観察で見つけてください（Debugでも、その観光地の観察を開くと見つかります）。`);
  throw new Error(`手がかり「${refused}」は${journey}の場面が渡す手がかりではありません。`);
}

/** The state with these clues found too (heard in conversation; a scene's starting state: each must be offered for the current city). */
export function withDebugClues(state: GameState, ids: readonly string[]): GameState {
  if (!ids.length) return state;
  checkDebugClues(state.currentCityId, ids);
  return withClues(state, ids);
}

/** An episode of a city (not its finale) Debug can record as finished, with its landmark's name. */
export type DebugEpisode = { id: string; nameJa: string };

/**
 * The episodes Debug offers to finish for a city (2026-11-25 user request 「〇〇のエピソードを終えた状態を得る」; the scene picker's
 * 「エピソードを終えたことにする」, a launch URL's `episodes`): the city's episodes in their order, without its finale (finishing it
 * clears the city: 旅の進行「都市クリア後」) and without those at a tour-only place (played on their tour: scene=tour).
 */
export function debugEpisodes(cityId: string): DebugEpisode[] {
  const { travel } = getCityContent(cityId);
  const tourOnly = new Set(travel.places.filter((place) => isTourOnlyPlace(place)).flatMap((place) => [place.id, ...(place.landmarkIds ?? [])]));
  return episodes.filter((episode) => episode.cityId === cityId && episode.kind !== "city_finale" && !(episode.landmarkId && tourOnly.has(episode.landmarkId)))
    .map((episode) => ({ id: episode.id, nameJa: landmarks.find((item) => item.id === episode.landmarkId)?.nameJa ?? episode.id }));
}

/** Throws the reason when an episode is not one Debug offers to finish for the city (a launch URL's `episodes`). */
export function checkDebugEpisodes(cityId: string, ids: readonly string[]): void {
  if (!ids.length) return;
  const offered = debugEpisodes(cityId).map((episode) => episode.id);
  const refused = ids.find((id) => !offered.includes(id));
  if (refused === undefined) return;
  const city = getCityContent(cityId).city.nameJa;
  const episode = episodes.find((item) => item.id === refused);
  if (episode?.cityId === cityId && episode.kind === "city_finale")
    throw new Error(`エピソード「${refused}」は${city}のフィナーレです。フィナーレを終えた状態は、旅の進行を「都市クリア後」にして開きます。`);
  if (episode?.cityId === cityId)
    throw new Error(`エピソード「${refused}」はツアーで訪ねる場所のエピソードです。ツアーの場面（scene=tour）から遊んでください。`);
  throw new Error(`エピソード「${refused}」は${city}のエピソードではありません（progression/journey.json の episodes のID）。`);
}

/**
 * The state with these episodes of the current city finished, as a player finishes them (finishEpisode: the guide skipped, the quiz
 * answered right, each choice the first open one, the scenes after it played), one by one in the city's order; one already finished
 * is passed over. Only from free time (a scene's starting state); an episode that cannot start yet says why.
 */
export function withDebugEpisodes(state: GameState, ids: readonly string[]): GameState {
  if (!ids.length) return state;
  checkDebugEpisodes(state.currentCityId, ids);
  let next = state;
  for (const episode of debugEpisodes(state.currentCityId)) {
    if (!ids.includes(episode.id) || next.completedEpisodeIds.includes(episode.id)) continue;
    const availability = getEpisodeAvailability(next, episode.id);
    if (!availability.available)
      throw new Error(`エピソード「${episode.nameJa}」（${episode.id}）を終えたことにできません：${availability.reason}`);
    try {
      next = finishEpisode(next, episode.id);
    } catch (error) {
      throw new Error(`エピソード「${episode.nameJa}」（${episode.id}）を終えたことにできません：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return next;
}

/**
 * Why the running Debug game cannot be changed now, or null: only while no scene is open (free time and the day's end).
 * A scene open has its saved story position, its conditions read as it goes and its time window; changing the flags or the
 * clock under it would give a scene the play never has, so the change waits until it ends (or 「移動画面に戻る（Debug）」).
 */
export function debugEditRefusal(state: GameState): string | null {
  return hasActiveScene(state)
    ? "場面の途中なので変えられません。場面を終えるか、≡メニューの「移動画面に戻る（Debug）」で街歩きに戻ってから変えてください。"
    : null;
}

/** Obtain or clear one flag of the running Debug game (refused while a scene is open). */
export function setDebugFlag(state: GameState, id: string, obtained: boolean): GameState {
  const refusal = debugEditRefusal(state);
  if (refusal) throw new Error(refusal);
  checkDebugFlags(state.currentCityId, [id]);
  const flags = state.storyProgress.flags.filter((flag) => flag !== id);
  return validateGameState({ ...state, storyProgress: { ...state.storyProgress, flags: obtained ? [...flags, id] : flags } });
}

/**
 * The state at 恋の段階 `stage` (GameState.romanceStage), set as chosen, lower too; nothing else changes (the relationship
 * values stay). Play only raises the stage (evaluateProgression, after a choice or a scene's end that moves the relationship,
 * and at a date's end), so a stage below what the relationship values and completed dates reach comes back up there, as in play.
 */
export function withDebugStage(state: GameState, stage: DebugRomanceStage): GameState {
  if (!(debugRomanceStages as readonly number[]).includes(stage))
    throw new Error(`恋の段階は${debugRomanceStages[0]}〜${debugRomanceStages.at(-1)}にしてください。`);
  return stage === state.romanceStage ? state : validateGameState({ ...state, romanceStage: stage });
}

/** Set the running Debug game's 恋の段階 (refused while a scene is open, as the flags and the clock are). */
export function setDebugStage(state: GameState, stage: DebugRomanceStage): GameState {
  const refusal = debugEditRefusal(state);
  if (refusal) throw new Error(refusal);
  return withDebugStage(state, stage);
}

/**
 * Free time's clock set to `day` (of the stay in the city, travel.day) and `minute`, as Debug's scene picker opens it and its bar
 * changes it. Refused while a scene is open (a tour running has one). Backwards too: nothing in the state counts the hours. The
 * rules kept: 9:00 to 21:00 (at 21:00 the day's end follows as in play: the night screen, or the rest), the journey's calendar
 * moves with the day (its weekday too), a booked tour keeps its day (it starts the morning after), and the fare home kept back
 * (returnReserve) is the cheapest way home that is on time from where the party is, as after a wait; when none is, or the
 * budget cannot keep it, the time is refused. A new day starts with an empty route and headlines (the night's map and recap).
 */
export function withDebugClock(state: GameState, clock: { day?: number; minute?: number }): GameState {
  const refusal = debugEditRefusal(state);
  if (refusal) throw new Error(refusal);
  const day = clock.day ?? state.travel.day;
  const minute = clock.minute ?? state.travel.minute;
  if (!Number.isInteger(minute) || minute < debugTimeRange[0] || minute > debugTimeRange[1])
    throw new Error(`時刻は${clockText(debugTimeRange[0])}〜${clockText(debugTimeRange[1])}にしてください。`);
  if (!Number.isInteger(day) || day < debugDayRange[0] || day > debugDayRange[1])
    throw new Error(`日は${debugDayRange[0]}〜${debugDayRange[1]}日目にしてください。`);
  if (state.tour?.status === "booked" && day !== state.tour.bookedDay)
    throw new Error(`ツアーを予約している間は日を変えられません（予約した日：${state.tour.bookedDay}日目。翌朝に出発します）。時刻は変えられます。`);
  const travel = state.travel;
  const fare = minimumHomeFare(getUsableRoutes(state), travel.currentPlaceId, travel.hotelPlaceId, minute);
  const place = getCityContent(state.currentCityId).travel.places.find((item) => item.id === travel.currentPlaceId)?.nameJa ?? travel.currentPlaceId;
  if (fare === undefined)
    throw new Error(`${place}からは、${clockText(minute)}には宿へ帰れません。もっと早い時刻にするか、宿で時刻を変えてください。`);
  if (fare > state.travelBudget - tourKeepBack(state).money)
    throw new Error(`${place}から${clockText(minute)}に宿へ帰る交通費（${formatMoneyForCity(state.currentCityId, fare)}）を、今の予算では確保できません。`);
  const newDay = day !== travel.day;
  return validateGameState({ ...state, travel: { ...travel, day, minute, returnReserve: fare,
    ...(travel.calendar ? { calendar: { ...travel.calendar, journeyDay: travel.calendar.cityStartJourneyDay + day - 1 } } : {}),
    ...(newDay ? { todayPlaceIds: [], todayEpisodeIds: [] } : {}) } });
}
