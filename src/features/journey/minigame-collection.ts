import type { SceneEntry } from "../../content/scene-schemas";
import type { MiniGameUse } from "../../minigames/uses";

// ミニゲーム集 (2026-11-20 user decision): once the journey is over, beside 旅の音楽室, every mini-game the journey's stories
// play, each as often as the player likes, apart from the story. Pure: MiniGameCollection.tsx gives it content:build's
// list of the uses (generated/minigame-uses.json) and plays each game through its own host. Nothing here reads or
// writes the save, a relationship value or a setting.

/** A game of the collection: the use it is played as (its pictures, keys and the person opposite her) and the use's city. */
export type CollectionGame = { use: MiniGameUse; cityId: string };

/**
 * The journey's games, one per game its stories play (`uses`, content:build's list), whichever scenes the player met:
 * those whose scene is in one of the journey's cities (`cityOf`, `cityIds` in the journey's order), in the order of the
 * cities, then of the list. Each is played as one of its uses: a scene's first game (no `prefix`) before a second game
 * of a scene (as cricket's 「もう一球」), else the first in the list.
 */
export function collectionGames(uses: readonly MiniGameUse[], cityOf: (sceneId: string) => string | undefined,
  cityIds: readonly string[]): CollectionGame[] {
  const picked = new Map<string, CollectionGame & { at: number }>();
  uses.forEach((use, at) => {
    const cityId = cityOf(use.sceneId);
    if (cityId === undefined || !cityIds.includes(cityId)) return;
    const current = picked.get(use.game);
    if (current && !(current.use.prefix && !use.prefix)) return;
    picked.set(use.game, { use, cityId, at });
  });
  return [...picked.values()]
    .sort((left, right) => cityIds.indexOf(left.cityId) - cityIds.indexOf(right.cityId) || left.at - right.at)
    .map(({ use, cityId }) => ({ use, cityId }));
}

/**
 * The scene the heroine's look is chosen by (her outfit: CharacterFigure's sceneId), as the scene's screen gives it: a
 * date's ID (RomanceScene), a battle's ID (BattleScreen), a guide's landmark (TourismScreen), else the scene's own
 * (EncounterScreen; an arrival or epilogue, which no game is in yet, by its city alone).
 */
export function lookSceneId(scene: Pick<SceneEntry, "id" | "main">): string {
  const main = scene.main;
  if (!main) return scene.id;
  return "date" in main ? main.date : "battle" in main ? main.battle : "guide" in main ? main.guide : scene.id;
}
