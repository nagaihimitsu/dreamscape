import { describe, expect, it } from "vitest";
import usesJson from "../content/generated/minigame-uses.json";
import { episodes, scenes, tagContext } from "../content";
import { createDebugState, debugTargets, defaultDebugSettings, type DebugScene, type DebugSettings } from "../dev/debug-state";
import { openMiniGame } from "../domain/minigame";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../domain/player-action";
import { screenFor } from "../domain/screen";
import { validateGameState, type GameState } from "../domain/game";
import { loadGame, saveGame, type StorageLike } from "../persistence";
import { MINI_GAMES } from "./registry";
import { miniGameParams, miniGameTagText, type MiniGameTag } from "./tag";
import { miniGameUseListSchema, type MiniGameUse } from "./uses";

// Every use of every game, with every outcome (docs/13 6.3): content:build's walk lists the uses
// (generated/minigame-uses.json); this opens each one's scene as Debug opens it, walks it by the player's actions
// (every choice, both reaction tickets), and at each mini-game takes every outcome: the state is valid, saves and loads
// the same, and the story goes past the choice point. Adding a game or a use adds nothing here.

const uses = miniGameUseListSchema.parse(usesJson);

/** A use's tag as the frame keeps it. */
const tagOf = (use: MiniGameUse): MiniGameTag => ({ id: use.game, auto: use.auto, ...(use.prefix ? { prefix: use.prefix } : {}),
  ...(use.bg ? { bg: use.bg } : {}), ...(use.art ? { art: use.art } : {}), ...(use.params ? { params: use.params } : {}) });

/** The Debug scene each scene kind opens through (the Debug launch's own table; tour legs and arrivals open with their city). */
const DEBUG_SCENE: Partial<Record<MiniGameUse["kind"], DebugScene>> = { date: "date", guide: "tourism", battle: "battle", talk: "encounter", encounter: "encounter", epilogue: "epilogue" };

/**
 * How Debug opens a use's scene: its city and the Debug target of its main part (a date, a landmark's guide, a battle, an
 * encounter, the city's finale for its epilogue). When a use is hidden behind a condition Debug's start lacks (a
 * relationship value, a flag…), add a line here that changes its settings; none is needed yet.
 */
function debugLaunch(use: MiniGameUse): DebugSettings | string {
  const entry = scenes.find((scene) => scene.id === use.sceneId);
  const scene = DEBUG_SCENE[use.kind];
  if (!entry || !scene) return `${use.sceneId} (${use.kind}) has no Debug scene: add its opener to this test`;
  const main = entry.main;
  const target = !main ? entry.id : "date" in main ? main.date : "guide" in main ? main.guide : "battle" in main ? main.battle
    : "epilogue" in main ? episodes.find((episode) => episode.cityId === main.epilogue && episode.kind === "city_finale")?.id ?? "" : "";
  const offered = debugTargets(entry.cityId)[scene].find((item) => item.id === target);
  if (!offered || offered.unavailable) return `${use.sceneId}: Debug cannot open ${scene} ${target}${offered?.unavailable ? ` (${offered.unavailable})` : ""}`;
  return { ...defaultDebugSettings(entry.cityId), scene, id: target };
}

/** The scene on screen (its kind and ID): the walk stays in the scene it opened. */
function sceneOn(state: GameState): string {
  const screen = screenFor(state);
  const id = state.activeEncounter?.encounterId ?? state.activeEpilogue?.episodeId ?? state.activeTourism?.landmarkId ??
    state.activeBattle?.battleId ?? state.activeDate?.dateId ?? "";
  return `${screen}:${id}`;
}
/** Where the scene's story is (its Ink state and line), to walk each place once. */
function placeOf(state: GameState): string {
  const active = state.activeEncounter ?? state.activeEpilogue ?? state.activeTourism ?? state.activeBattle ?? state.activeDate;
  const frame = active && "frame" in active ? active.frame : null;
  return `${sceneOn(state)}|${active && "storyState" in active ? active.storyState : ""}|${frame?.text ?? ""}|${state.travelBudget}|${state.ap}`;
}
const frameOf = (state: GameState) => JSON.stringify((state.activeEncounter ?? state.activeEpilogue ?? state.activeTourism ?? state.activeBattle ?? state.activeDate)?.frame ?? null);

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

/** Walks the scene from `start` by every action the player has; at each mini-game, checks every outcome. Returns the tags met. */
function walkUses(start: GameState, roll: () => number): Set<string> {
  const met = new Set<string>();
  const scene = sceneOn(start);
  const seen = new Set<string>();
  const waiting = [start];
  while (waiting.length) {
    const state = waiting.pop()!;
    if (sceneOn(state) !== scene || seen.has(placeOf(state))) continue;
    seen.add(placeOf(state));
    expect(seen.size, `the walk of ${scene} is longer than expected`).toBeLessThan(4000);
    const game = openMiniGame(state);
    const actions = listPlayerActions(state);
    if (game) {
      met.add(miniGameTagText(game.tag));
      // The player's actions there are the game's outcomes, each one.
      expect(actions, miniGameTagText(game.tag)).toEqual(MINI_GAMES[game.tag.id].outcomes.map((outcome): PlayerAction => ({ kind: "minigame", outcome: outcome.id })));
    }
    for (const action of actions) {
      const next = applyPlayerAction(state, playerActionChange(action, roll));
      if (action.kind !== "minigame") {
        if (next !== state) waiting.push(next);
        continue;
      }
      const where = `${miniGameTagText(game!.tag)}: ${action.outcome}`;
      expect(next, `${where} takes its choice`).not.toBe(state);
      expect(() => validateGameState(next), where).not.toThrow();
      const storage = memoryStorage();
      expect(saveGame(storage, next).ok, where).toBe(true);
      expect(loadGame(storage), where).toEqual({ status: "loaded", state: next });
      expect(frameOf(next), `${where} goes past the choice point`).not.toBe(frameOf(state));
      waiting.push(next);
    }
  }
  return met;
}

describe("every mini-game use with every outcome (the generated uses list)", () => {
  it("lists the uses content:build's walk met", () => {
    expect(Array.isArray(usesJson)).toBe(true);
  });

  it.each(uses.map((use) => [`${use.sceneId} ${use.knot ?? ""} ${use.game}${use.prefix ? ` prefix ${use.prefix}` : ""}`, use] as const))(
    "reaches every outcome of %s by its rules, with its params", async (_, use) => {
      const definition = MINI_GAMES[use.game];
      const { rules } = await definition.load();
      const params = miniGameParams(tagOf(use), tagContext);
      for (const outcome of definition.outcomes) expect(rules.outcomeOf(rules.autoRecord(outcome.id, params), params), outcome.id).toBe(outcome.id);
    });

  const byScene = new Map<string, MiniGameUse[]>();
  for (const use of uses) byScene.set(use.sceneId, [...byScene.get(use.sceneId) ?? [], use]);
  it.each([...byScene.keys()])("opens %s as Debug does and takes every outcome of each of its uses, both reaction tickets", (sceneId) => {
    const sceneUses = byScene.get(sceneId)!;
    const launch = debugLaunch(sceneUses[0]);
    if (typeof launch === "string") throw new Error(launch);
    const met = new Set<string>();
    for (const roll of ["positive", "negative"] as const) {
      const state = createDebugState({ ...launch, roll });
      for (const tag of walkUses(state, () => (roll === "positive" ? 0 : 9999))) met.add(tag);
    }
    // A use not met is hidden behind a condition Debug's start lacks: give its scene an opener above.
    const missing = sceneUses.filter((use) => !met.has(miniGameTagText(tagOf(use))));
    expect(missing.map((use) => `${use.knot ?? use.storyId}: # minigame: ${miniGameTagText(tagOf(use))}`), "uses the walk did not reach").toEqual([]);
  });
});
