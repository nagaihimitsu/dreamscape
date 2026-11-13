import usesJson from "../content/generated/minigame-uses.json";
import { episodes, sceneConditions, scenes } from "../content";
import type { GameState } from "../domain/game";
import { debugQueryString, settingsQuery } from "./debug-query";
import { createDebugState, debugTargets, defaultDebugSettings, type DebugScene, type DebugSettings } from "./debug-state";
import { completedCity, isHotelInsert, rollTickets, startHotelInsertScene, withAp, withRelationship } from "./scenario-builders";
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

/**
 * The states a use's scene opens at for a reaction ticket: 場面の確認's one; a hotel-moment scene's, once per branch
 * (hotelInsertBranches). A branch Debug cannot set up, or one where the scene does not start, is left out (the test then
 * names any use it did not reach); the first (no branch) must open.
 */
export function miniGameUseStates(opening: MiniGameUseOpening, roll: DebugSettings["roll"]): GameState[] {
  const settings = { ...opening.settings, roll };
  if (opening.kind === "debug") return [createDebugState(settings)];
  const cityId = settings.cityId ?? "";
  const cleared = clearedCities.get(cityId) ?? completedCity(cityId);
  clearedCities.set(cityId, cleared);
  const base = withRelationship(withAp(cleared, settings.ap), settings);
  return hotelInsertBranches(opening.sceneId).flatMap((conds, index) => {
    try {
      return [startHotelInsertScene(base, opening.sceneId, rollTickets[roll], conds)];
    } catch (error) {
      if (index === 0) throw error;
      return [];
    }
  });
}
