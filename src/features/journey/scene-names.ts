import { battles, cityContents, dates, getTour, landmarks } from "../../content";
import type { SceneNames } from "./music-room";

/**
 * The names a scene's content goes by (music-room.ts sceneGroup: 旅の音楽室's voice groups, ミニゲーム集's places), from the
 * loaded content; each falls back to its ID.
 */
export const SCENE_NAMES: SceneNames = {
  city: (cityId) => cityContents[cityId]?.city.nameJa ?? cityId,
  landmark: (landmarkId) => landmarks.find((landmark) => landmark.id === landmarkId)?.nameJa ?? landmarkId,
  place: (cityId, placeId) => cityContents[cityId]?.travel.places.find((place) => place.id === placeId)?.nameJa ?? placeId,
  battle: (battleId) => battles.find((battle) => battle.id === battleId)?.titleJa ?? battleId,
  date: (dateId) => dates.find((date) => date.id === dateId)?.titleJa ?? dateId,
  tour: (tourId) => getTour(tourId)?.titleJa ?? tourId,
};
