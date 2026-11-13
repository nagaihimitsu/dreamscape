import type { GameState } from "./game-state-schema";
import { screenFor } from "./screen";
import { miniGameChoice, type MiniGameTag } from "../minigames/tag";

// A line's `# minigame:` as the game's rules see it (docs/13 1.5): the same in every story scene. The game takes the
// choice of its outcome as the screen's choice button would (player-action.ts chooseMiniGameOutcome: the one table from
// the scene's kind to its choice). Light module (the state's types and the tag reader only): the E2E helper reads it.

/** The scene a choice point is in, as the player's actions name its choice (player-action.ts). */
export type MiniGameScene = "encounter" | "epilogue" | "guide" | "battle" | "date";

export interface OpenMiniGame {
  scene: MiniGameScene;
  tag: MiniGameTag;
  choices: readonly { index: number; optionId?: string }[];
}

/**
 * The `# minigame:` of the choice point on screen (the screen order of screenFor; listPlayerActions offers the game's
 * outcomes there): an encounter's story, an arrival's (after its title card), an epilogue's or a tour leg's line, a
 * guide's, a battle's conversation stopped at its choices (not a quiz's or reasoning's call), a date's. Null elsewhere.
 */
export function openMiniGame(state: GameState): OpenMiniGame | null {
  const open = (scene: MiniGameScene, frame: { minigame?: MiniGameTag; choices: OpenMiniGame["choices"] } | null | undefined): OpenMiniGame | null =>
    frame?.minigame && frame.choices.length ? { scene, tag: frame.minigame, choices: frame.choices } : null;
  switch (screenFor(state)) {
    case "encounter": {
      const encounter = state.activeEncounter!;
      return encounter.phase === "story" || encounter.phase === "outcome" ? open("encounter", encounter.frame) : null;
    }
    case "epilogue": {
      const epilogue = state.activeEpilogue!;
      return epilogue.kind === "arrival" && !epilogue.logoComplete ? null : open("epilogue", epilogue.frame);
    }
    case "tourism":
      return state.activeTourism!.phase === "guide" ? open("guide", state.activeTourism!.frame) : null;
    case "battle": {
      const battle = state.activeBattle!;
      return battle.phase === "dialogue" && battle.frame && !battle.frame.choices.some((choice) => choice.call) ? open("battle", battle.frame) : null;
    }
    case "date":
      return open("date", state.activeDate!.frame);
    default:
      return null;
  }
}

/** The choice index the outcome takes at the open mini-game (undefined: none open, or its choice set lacks the outcome). */
export function miniGameOutcomeChoice(state: GameState, outcome: string): { scene: MiniGameScene; index: number } | undefined {
  const game = openMiniGame(state);
  const choice = game && miniGameChoice(game.choices, game.tag, outcome);
  return game && choice ? { scene: game.scene, index: choice.index } : undefined;
}
