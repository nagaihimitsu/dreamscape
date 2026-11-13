import usesJson from "../content/generated/minigame-uses.json";
import { episodes, sceneConditions, scenes } from "../content";
import type { GameState } from "../domain/game";
import { openMiniGame } from "../domain/minigame";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "../domain/player-action";
import { debugQueryString, settingsQuery } from "./debug-query";
import { createDebugState, debugCityState, debugTargets, defaultDebugSettings, type DebugScene, type DebugSettings } from "./debug-state";
import { isHotelInsert, rollTickets, startHotelInsertScene, withAp, withRelationship } from "./scenario-builders";
import { miniGameTagText } from "../minigames/tag";
import { miniGameUseKey, miniGameUseListSchema, miniGameUseTag, type MiniGameUse } from "../minigames/uses";

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

/**
 * The Debug launch URL (`?debug&…`) that opens a use's scene on the use's own branch, or why it cannot be opened: 場面の確認's
 * settings, or for a date whose story asks whether an item is held, the settings without it when only those reach the use
 * (Akbar's Tomb's sunglasses: dateWithoutHeldItems, which the content test walks too).
 */
export function miniGameUseUrl(use: MiniGameUse): { url: string } | { reason: string } {
  const launch = miniGameUseLaunch(use);
  return typeof launch === "string" ? { reason: launch } : { url: debugQueryString(settingsQuery("real", useBranch(use, launch))) };
}

const branches = new Map<string, DebugSettings>();
function useBranch(use: MiniGameUse, launch: DebugSettings): DebugSettings {
  const variants = dateWithoutHeldItems(launch);
  if (!variants.length) return launch;
  const key = miniGameUseKey(use);
  const known = branches.get(key);
  if (known) return known;
  const options = [launch, ...variants];
  const branch = options[firstReaching(options.map(createDebugState), miniGameTagText(miniGameUseTag(use)))] ?? launch;
  branches.set(key, branch);
  return branch;
}

/** How many places of a scene firstReaching looks at, all starts together, before it gives up (-1). */
const REACH_LIMIT = 3000;
/**
 * Which start (its index) reaches a mini-game whose tag reads `tagText` first, walking every start's scene by the player's
 * actions (every choice; each outcome of a mini-game on the way) one place at a time in turn, so a start that leads
 * there soon is found without walking the others to their ends; -1 when none does within REACH_LIMIT.
 */
function firstReaching(starts: readonly GameState[], tagText: string): number {
  const roll = () => 0;
  const active = (state: GameState) => state.activeEncounter ?? state.activeEpilogue ?? state.activeTourism ?? state.activeBattle ?? state.activeDate;
  // The scene a state shows: the walk stays in the one it opened.
  const sceneOf = (state: GameState) => JSON.stringify([state.activeEncounter?.encounterId, state.activeEpilogue?.episodeId,
    state.activeTourism?.landmarkId, state.activeBattle?.battleId, state.activeDate?.dateId]);
  const walks = starts.map((start) => ({ scene: sceneOf(start), waiting: [start], seen: new Set<string>() }));
  for (let step = 0; step < REACH_LIMIT && walks.some((walk) => walk.waiting.length); step++) {
    const index = step % walks.length;
    const walk = walks[index];
    const state = walk.waiting.pop();
    const scene = state && active(state);
    if (!state || !scene || sceneOf(state) !== walk.scene) continue;
    // Where the story is (its Ink state, line and phase; the budget and AP its choices change), to walk each place once.
    const place = JSON.stringify(["storyState" in scene ? scene.storyState : "", "phase" in scene ? scene.phase : "",
      scene.frame?.text ?? "", state.travelBudget, state.ap]);
    if (walk.seen.has(place)) continue;
    walk.seen.add(place);
    const game = openMiniGame(state);
    if (game && miniGameTagText(game.tag) === tagText) return index;
    for (const action of listPlayerActions(state)) {
      const next = applyPlayerAction(state, playerActionChange(action, roll), roll);
      if (next !== state) walk.waiting.push(next);
    }
  }
  return -1;
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

/**
 * A date whose story reads whether an item is held (`cond("item <id> held")`), opened again without each such item
 * Debug's state holds (the settings' `without`): Debug's cleared city holds every item met on the way (the rain attar
 * bought in Delhi), so the branch for a player who never got it (Akbar's Tomb's sunglasses) is walked and linked too.
 */
function dateWithoutHeldItems(settings: DebugSettings): DebugSettings[] {
  if (settings.scene !== "date") return [];
  const read = scenes.find((scene) => scene.main && "date" in scene.main && scene.main.date === settings.id)?.conds ?? [];
  const items = read.map((text) => /^item (\S+) held$/u.exec(text)?.[1]).filter((id): id is string => !!id);
  if (!items.length) return [];
  const base = debugCityState(settings.cityId ?? "", settings.progress);
  return items.filter((id) => base.inventory[id] === "held").map((id) => ({ ...settings, without: [id] }));
}

/**
 * The states a use's scene opens at for a reaction ticket: 場面の確認's one (a date also without each carried item its
 * story asks about: dateWithoutHeldItems); a hotel-moment scene's, once per branch (hotelInsertBranches). A branch Debug
 * cannot set up, or one where the scene does not start, is left out (the test then names any use it did not reach); the
 * first (no branch) must open.
 */
export function miniGameUseStates(opening: MiniGameUseOpening, roll: DebugSettings["roll"]): GameState[] {
  const settings = { ...opening.settings, roll };
  if (opening.kind === "debug") return [settings, ...dateWithoutHeldItems(settings)].map(createDebugState);
  const base = withRelationship(withAp(debugCityState(settings.cityId ?? "", "completed"), settings.ap), settings);
  return hotelInsertBranches(opening.sceneId).flatMap((conds, index) => {
    try {
      return [startHotelInsertScene(base, opening.sceneId, rollTickets[roll], conds)];
    } catch (error) {
      if (index === 0) throw error;
      return [];
    }
  });
}
