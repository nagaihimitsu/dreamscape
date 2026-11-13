import { describe, expect, it } from "vitest";
import usesJson from "../content/generated/minigame-uses.json";
import { scenes, tagContext } from "../content";
import { miniGameShortPurseStates, miniGameUseOpening, miniGameUseStates } from "../dev/minigame-room";
import { openMiniGame } from "../domain/minigame";
import { applyPlayerAction, listPlayerActions, miniGameAvailableOutcomes, playerActionChange, type PlayerAction } from "../domain/player-action";
import { screenFor } from "../domain/screen";
import { validateGameState, type GameState } from "../domain/game";
import { loadGame, saveGame, type StorageLike } from "../persistence";
import { availableOutcome } from "./fallback";
import { MINI_GAMES } from "./registry";
import { miniGameOptionId, miniGameParams, miniGameTagText, type MiniGameTag } from "./tag";
import { miniGameUseListSchema, type MiniGameUse } from "./uses";

// Every use of every game, with every outcome (docs/13 6.3): content:build's walk lists the uses
// (generated/minigame-uses.json); this opens each one's scene as Debug opens it, walks it by the player's actions
// (every choice, both reaction tickets), and at each mini-game takes every outcome: the state is valid, saves and loads
// the same, and the story goes past the choice point. A scene whose outcomes pay money is walked again with the money to
// spend just short of each payment: there the player's actions are the outcomes still available, and every outcome falls
// back to one of them (docs/13 4.2). Adding a game or a use adds nothing here.

const uses = miniGameUseListSchema.parse(usesJson);

/** A use's tag as the frame keeps it. */
const tagOf = (use: MiniGameUse): MiniGameTag => ({ id: use.game, auto: use.auto, ...(use.prefix ? { prefix: use.prefix } : {}),
  ...(use.bg ? { bg: use.bg } : {}), ...(use.art ? { art: use.art } : {}), ...(use.params ? { params: use.params } : {}) });

/** The scene on screen (its kind and ID): the walk stays in the scene it opened. */
function sceneOn(state: GameState): string {
  const screen = screenFor(state);
  const id = state.activeEncounter?.encounterId ?? state.activeEpilogue?.episodeId ?? state.activeTourism?.landmarkId ??
    state.activeBattle?.battleId ?? state.activeDate?.dateId ?? "";
  return `${screen}:${id}`;
}
/** Where the scene's story is (its Ink state and line, and its phase: a quiz's question and its feedback hold the same line), to walk each place once. */
function placeOf(state: GameState): string {
  const active = state.activeEncounter ?? state.activeEpilogue ?? state.activeTourism ?? state.activeBattle ?? state.activeDate;
  const frame = active && "frame" in active ? active.frame : null;
  const phase = active && "phase" in active ? active.phase : "";
  return `${sceneOn(state)}|${phase}|${active && "storyState" in active ? active.storyState : ""}|${frame?.text ?? ""}|${state.travelBudget}|${state.ap}`;
}
const frameOf = (state: GameState) => JSON.stringify((state.activeEncounter ?? state.activeEpilogue ?? state.activeTourism ?? state.activeBattle ?? state.activeDate)?.frame ?? null);

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

/** Walks the scene from `start` by every action the player has; at each mini-game, checks every outcome. Returns the tags met and the outcomes greyed there. */
function walkUses(start: GameState, roll: () => number): { met: Set<string>; greyed: Set<string> } {
  const met = new Set<string>();
  const greyed = new Set<string>();
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
      const text = miniGameTagText(game.tag);
      met.add(text);
      // The player's actions there are the game's outcomes available now (all, unless a choice is greyed); every outcome
      // a play may end on falls back to one of them (docs/13 4.2).
      const definition = MINI_GAMES[game.tag.id];
      const available = miniGameAvailableOutcomes(state)!;
      expect(actions, text).toEqual(available.map((outcome): PlayerAction => ({ kind: "minigame", outcome })));
      for (const outcome of definition.outcomes) {
        expect(available, `${text}: ${outcome.id} falls back to an available outcome`).toContain(availableOutcome(definition, outcome.id, available));
        if (!available.includes(outcome.id)) greyed.add(`${text}: ${outcome.id}`);
      }
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
  return { met, greyed };
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
    // Opened as Debug's 「ミニゲームの見本」 opens it (src/dev/minigame-room.ts; a scene of the hotel's moment through 「休む」,
    // once per branch of its story): when a use is hidden behind a condition Debug's start lacks (a relationship value, a
    // flag…), give its scene's opening the settings it needs there.
    const opening = miniGameUseOpening(sceneUses[0]);
    if (typeof opening === "string") throw new Error(`${opening}: give its scene kind an opener in src/dev/minigame-room.ts`);
    const met = new Set<string>();
    const greyed = new Set<string>();
    for (const roll of ["positive", "negative"] as const) {
      for (const state of miniGameUseStates(opening, roll)) {
        // With the money the scene opens with, then just short of each payment its outcomes ask for.
        for (const start of [state, ...miniGameShortPurseStates(state, sceneId)]) {
          const walked = walkUses(start, () => (roll === "positive" ? 0 : 9999));
          for (const tag of walked.met) met.add(tag);
          for (const outcome of walked.greyed) greyed.add(outcome);
        }
      }
    }
    // Each outcome that pays was met greyed, and its fallback taken (the short purses reach every payment).
    const options = scenes.find((scene) => scene.id === sceneId)?.options ?? [];
    const paying = sceneUses.flatMap((use) => MINI_GAMES[use.game].outcomes
      .filter((outcome) => (options.find((option) => option.id === miniGameOptionId(use, outcome.id))?.money ?? 0) < 0)
      .map((outcome) => `${miniGameTagText(tagOf(use))}: ${outcome.id}`));
    expect(paying.filter((outcome) => !greyed.has(outcome)), "outcomes that pay, never met greyed").toEqual([]);
    // A use not met is hidden behind a condition Debug's start lacks (see above).
    const missing = sceneUses.filter((use) => !met.has(miniGameTagText(tagOf(use))));
    expect(missing.map((use) => `${use.knot ?? use.storyId}: # minigame: ${miniGameTagText(tagOf(use))}`), "uses the walk did not reach").toEqual([]);
  });
});
