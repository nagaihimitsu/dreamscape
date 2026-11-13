import usesJson from "../content/generated/minigame-uses.json";
import { episodes, sceneConditions, scenes } from "../content";
import type { GameState } from "../domain/game";
import { debugQueryString, settingsQuery } from "./debug-query";
import { createDebugState, debugTargets, defaultDebugSettings, type DebugScene, type DebugSettings } from "./debug-state";
import { cityStart, completedCity, finishEpisode, isHotelInsert, rollTickets, startDateScene, startHotelInsertScene, withAp, withRelationship } from "./scenario-builders";
import { miniGameUseListSchema, type MiniGameUse } from "../minigames/uses";

// Debug's 「ミニゲームの見本」 (docs/13 6.6) and the content-driven test of every use (src/minigames/minigame-uses.test.ts):
// where the stories use each game (content:build's generated/minigame-uses.json) and how Debug opens each use's scene.

const parsedUses = miniGameUseListSchema.safeParse(usesJson);
/** Every use the build's walk met (empty when the generated list cannot be read: usesProblem). */
export const miniGameUses: readonly MiniGameUse[] = parsedUses.success ? parsedUses.data : [];
export const usesProblem = !parsedUses.success;

/** The Debug scene each scene kind opens through (an arrival and a tour leg open with their city's start). */
const DEBUG_SCENE: Partial<Record<MiniGameUse["kind"], DebugScene>> = {
  date: "date", guide: "tourism", battle: "battle", talk: "encounter", encounter: "encounter", epilogue: "epilogue",
};

/**
 * How Debug opens a use's scene: its city and the Debug target of its main part (the date, the landmark of a guide, the
 * battle, the encounter, the city's finale for its epilogue), with 場面の確認's defaults; or why it cannot (a message).
 */
export function miniGameUseLaunch(use: MiniGameUse): DebugSettings | string {
  const entry = scenes.find((scene) => scene.id === use.sceneId);
  const scene = DEBUG_SCENE[use.kind];
  if (!entry || !scene) return `${use.sceneId}（${use.kind}）はDebugの場面の確認から開けません`;
  if (isHotelInsert(entry.id)) return `${use.sceneId}：宿の時点（「休む」）の場面は、場面の確認からは開けません`;
  const main = entry.main;
  const target = !main ? entry.id : "date" in main ? main.date : "guide" in main ? main.guide : "battle" in main ? main.battle
    : "epilogue" in main ? episodes.find((episode) => episode.cityId === main.epilogue && episode.kind === "city_finale")?.id ?? "" : "";
  const offered = debugTargets(entry.cityId)[scene].find((item) => item.id === target);
  if (!offered || offered.unavailable) return `${use.sceneId}：Debugでは ${scene} ${target} を開けません${offered?.unavailable ? `（${offered.unavailable}）` : ""}`;
  return { ...defaultDebugSettings(entry.cityId), scene, id: target };
}

/** The Debug launch URL (`?debug&…`) that opens a use's scene, or why it cannot be opened. */
export function miniGameUseUrl(use: MiniGameUse): { url: string } | { reason: string } {
  const launch = miniGameUseLaunch(use);
  return typeof launch === "string" ? { reason: launch } : { url: debugQueryString(settingsQuery("real", launch)) };
}

/**
 * How the content test opens a use's scene: through 場面の確認 (Debug's settings), or, for a scene of the hotel's moment
 * (`# at: hotel …`, which 場面の確認 does not list), through 「休む」 after its city is cleared (startHotelInsertScene, with
 * 場面の確認's defaults for the AP and the relationship); or why it cannot (a message).
 */
export type MiniGameUseOpening = { kind: "debug"; settings: DebugSettings } | { kind: "hotel"; settings: DebugSettings; sceneId: string };

export function miniGameUseOpening(use: MiniGameUse): MiniGameUseOpening | string {
  const entry = scenes.find((scene) => scene.id === use.sceneId);
  if (entry && isHotelInsert(entry.id)) return { kind: "hotel", settings: { ...defaultDebugSettings(entry.cityId), scene: "encounter", id: entry.id }, sceneId: entry.id };
  const launch = miniGameUseLaunch(use);
  return typeof launch === "string" ? launch : { kind: "debug", settings: launch };
}

/**
 * The branches of a hotel-moment scene the content test opens it at: none, and each `cond("…")` its story reads, alone (a
 * flag set, another scene seen), from the scene's own list of them; not its own `seen` (the scene runs once).
 */
export function hotelInsertBranches(sceneId: string): string[][] {
  const scene = scenes.find((item) => item.id === sceneId);
  const ownSeen = (text: string) => JSON.stringify(sceneConditions.conditions[text] ?? null).includes(`"${sceneId}"`);
  return [[], ...(scene?.conds ?? []).filter((text) => !ownSeen(text)).map((text) => [text])];
}

const clearedCities = new Map<string, GameState>();
function clearedCity(cityId: string): GameState {
  const cleared = clearedCities.get(cityId) ?? completedCity(cityId);
  clearedCities.set(cityId, cleared);
  return cleared;
}

/**
 * A date whose story reads whether an item is held (`cond("item <id> held")`), opened again without each such item
 * Debug's state holds: Debug's cleared city holds every item met on the way (the rain attar bought in Delhi), so the
 * branch for a player who never got it (Akbar's Tomb's sunglasses) is walked too.
 */
function dateWithoutHeldItems(settings: DebugSettings): GameState[] {
  if (settings.scene !== "date") return [];
  const read = scenes.find((scene) => scene.main && "date" in scene.main && scene.main.date === settings.id)?.conds ?? [];
  const items = read.map((text) => /^item (\S+) held$/u.exec(text)?.[1]).filter((id): id is string => !!id);
  if (!items.length) return [];
  const cityId = settings.cityId ?? "";
  const base = withRelationship(withAp(settings.progress === "initial" ? cityStart(cityId) : clearedCity(cityId), settings.ap), settings);
  return items.filter((id) => base.inventory[id] === "held").map((id) => {
    const inventory = { ...base.inventory };
    delete inventory[id];
    return startDateScene({ ...base, inventory }, settings.id, rollTickets[settings.roll]);
  });
}

/**
 * A date whose story reads whether an episode is done (`cond("episode <id>")`), opened again before it: Debug's cleared
 * city has done every episode (Lodhi Garden's branch for a player who has not seen Humayun's Tomb, with its 「一緒に言おう」,
 * would never be walked). From the city's start, the city's other episodes are finished one by one, in their order, until
 * the date can start (its own `when`); an episode that cannot be played that way is passed over.
 */
function dateBeforeEpisodes(settings: DebugSettings): GameState[] {
  if (settings.scene !== "date") return [];
  const read = scenes.find((scene) => scene.main && "date" in scene.main && scene.main.date === settings.id)?.conds ?? [];
  const skipped = read.map((text) => /^episode (\S+)$/u.exec(text)?.[1]).filter((id): id is string => !!id);
  const cityId = settings.cityId ?? "";
  const others = (skip: string) => episodes.filter((episode) => episode.cityId === cityId && episode.kind !== "city_finale" && episode.id !== skip);
  return skipped.flatMap((skip) => {
    let state = cityStart(cityId);
    for (const next of [...others(skip), null]) {
      try {
        return [startDateScene(withRelationship(withAp(state, settings.ap), settings), settings.id, rollTickets[settings.roll])];
      } catch {
        // The date's `when` is not met yet: one more episode.
      }
      if (!next) return [];
      try {
        state = finishEpisode(state, next.id);
      } catch {
        // Not playable from here (a tour's stop, say): the next one.
      }
    }
    return [];
  });
}

/**
 * The states a use's scene opens at for a reaction ticket: 場面の確認's one (a date also without each carried item its
 * story asks about: dateWithoutHeldItems; and before each episode it asks about: dateBeforeEpisodes); a hotel-moment
 * scene's, once per branch (hotelInsertBranches). A branch Debug cannot set up, or one where the scene does not start, is
 * left out (the test then names any use it did not reach); the first (no branch) must open.
 */
export function miniGameUseStates(opening: MiniGameUseOpening, roll: DebugSettings["roll"]): GameState[] {
  const settings = { ...opening.settings, roll };
  if (opening.kind === "debug") return [createDebugState(settings), ...dateWithoutHeldItems(settings), ...dateBeforeEpisodes(settings)];
  const base = withRelationship(withAp(clearedCity(settings.cityId ?? ""), settings.ap), settings);
  return hotelInsertBranches(opening.sceneId).flatMap((conds, index) => {
    try {
      return [startHotelInsertScene(base, opening.sceneId, rollTickets[roll], conds)];
    } catch (error) {
      if (index === 0) throw error;
      return [];
    }
  });
}
