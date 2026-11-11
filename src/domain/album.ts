import { battles, cityContents, dates, landmarks, tagContext } from "../content";
import { getJourneyForCity } from "../content/journeys";
import type { StoryPhoto } from "../content/tags";
import type { AlbumPhoto } from "./album-state";
import { activeEpilogueStoryId } from "./epilogue";
import type { GameState } from "./game-state-schema";
import { screenFor } from "./screen";

// The album (2026-11-11 user decision): a line's `# photo:` puts its image in the saved album the first time the line
// is on screen in normal play. Pure rules; the game's action (applyPlayerAction) and a new game's start record, so a
// re-read, a reload, a replayed guide or a resumed save never adds the same image again. Debug plays in its own
// memory storage (src/dev/DebugMode.tsx), so nothing it records reaches the normal save.

/**
 * The line on screen and the story it is read from, in the order of the screens (screen.ts): an encounter's, an
 * arrival's (once its title card has gone) or an epilogue's or a tour leg's narration, a sightseeing guide's, a
 * battle's talk, a date's. Null when no story line shows (free time, the observation, a battle's question, 交際開始).
 */
function lineOnScreen(state: GameState): { frame: { photo?: StoryPhoto }; storyId: string } | null {
  const screen = screenFor(state);
  if (screen === "encounter") return { frame: state.activeEncounter!.frame, storyId: state.activeEncounter!.storyId };
  if (screen === "epilogue") {
    const active = state.activeEpilogue!;
    const storyId = active.kind === "arrival" && !active.logoComplete ? null : activeEpilogueStoryId(active);
    return storyId ? { frame: active.frame, storyId } : null;
  }
  if (screen === "tourism") {
    const active = state.activeTourism!;
    const storyId = landmarks.find((landmark) => landmark.id === active.landmarkId)?.guideStoryId;
    return active.phase === "guide" && active.frame && storyId ? { frame: active.frame, storyId } : null;
  }
  if (screen === "battle") {
    const active = state.activeBattle!;
    const storyId = battles.find((battle) => battle.id === active.battleId)?.storyId;
    return active.phase === "dialogue" && active.frame && storyId ? { frame: active.frame, storyId } : null;
  }
  if (screen === "date") {
    const active = state.activeDate!;
    const storyId = dates.find((date) => date.id === active.dateId)?.storyId;
    return storyId ? { frame: active.frame, storyId } : null;
  }
  return null;
}

/**
 * The state with the photo of the line on screen added to its album: the line's `# photo:` image with its caption,
 * the city, the city's day and the minute of the game clock, the place the party is at (as the header shows them) and
 * the line's story. An image already in the album is never added again (the state comes back unchanged), whether the
 * line is read again, reloaded, replayed (a guide read again, a date played again: a line not read before still takes
 * its photo) or resumed from a save. Called on the snapshot an action leaves (no revision of its own).
 */
export function recordAlbumPhoto(state: GameState): GameState {
  const shown = lineOnScreen(state);
  const photo = shown?.frame.photo;
  if (!shown || !photo || state.album.some((entry) => entry.imageId === photo.imageId)) return state;
  const entry: AlbumPhoto = {
    imageId: photo.imageId,
    ...(photo.caption === undefined ? {} : { caption: photo.caption }),
    cityId: state.currentCityId,
    day: state.travel.day,
    minute: state.travel.minute,
    placeId: state.travel.currentPlaceId,
    storyId: shown.storyId,
  };
  return { ...state, album: [...state.album, entry] };
}

/**
 * A saved album names only what this build knows, as the save's other references do: a photo the content still has
 * (an album image of the build, which a `# photo:` may name), a city of the save's journey and a place of that city.
 * Otherwise the save is not loaded and its data is kept (persistence loadGame).
 */
export function validateAlbum(state: GameState): void {
  const journeyId = getJourneyForCity(state.currentCityId)?.id;
  for (const photo of state.album) {
    const city = cityContents[photo.cityId];
    if (!tagContext.photoIds.includes(photo.imageId) || !city || getJourneyForCity(photo.cityId)?.id !== journeyId ||
        !city.travel.places.some((place) => place.id === photo.placeId))
      throw new Error("アルバムの写真の参照先が見つかりません。");
  }
}
