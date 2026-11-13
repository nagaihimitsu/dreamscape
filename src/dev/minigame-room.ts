import usesJson from "../content/generated/minigame-uses.json";
import { episodes, scenes } from "../content";
import { debugQueryString, settingsQuery } from "./debug-query";
import { debugTargets, defaultDebugSettings, type DebugScene, type DebugSettings } from "./debug-state";
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
