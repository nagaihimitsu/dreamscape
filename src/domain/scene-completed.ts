import type { SceneEntry } from "../content/scene-schemas";
import type { GameState } from "./game-state-schema";

// Whether the player has completed a scene, from what the save keeps (no saved data of its own). 旅の音楽室
// (src/features/journey/music-room.ts) and the people met (met-people.ts) read it.

/** A scene as the room and the people met read it (the scene table's entry). */
export type RoomScene = Pick<SceneEntry, "id" | "kind" | "main" | "at" | "story" | "knots" | "cityId" | "title">;
/** The parts of the game it reads. */
export type RoomGame = Pick<GameState, "seenEncounterIds" | "completedTourIds" | "completedGuideIds" | "battleRecords" | "playedDateIds" |
  "viewedEpilogueCityIds" | "activeEpilogue" | "currentCityId" | "completedCityIds">;

/**
 * Whether the player has completed `scene`: an inserted scene seen to its end (any choice), a guide read, a battle
 * played to its result, a date played, an epilogue read, a tour's leg of a finished tour, a city's arrival once the
 * party has reached the city (`reached`) and is past it.
 */
export function sceneCompleted(scene: RoomScene, game: RoomGame, reached: (cityId: string) => boolean): boolean {
  if (scene.kind === "talk" || scene.kind === "encounter") return game.seenEncounterIds.includes(scene.id);
  if (scene.kind === "tour_leg") return scene.at.some((at) => "tour" in at && game.completedTourIds.includes(at.tour));
  const main = scene.main;
  if (!main) return false;
  if ("guide" in main) return game.completedGuideIds.includes(main.guide);
  if ("battle" in main) return game.battleRecords.some((record) => record.battleId === main.battle);
  if ("date" in main) return game.playedDateIds.includes(main.date);
  if ("epilogue" in main) return game.viewedEpilogueCityIds.includes(main.epilogue);
  return reached(main.arrival) && !(game.activeEpilogue?.kind === "arrival" && game.currentCityId === main.arrival);
}

