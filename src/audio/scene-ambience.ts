import { AMBIENCE_STOP, type AmbienceJourneyPlay } from "../content/ambience";
import { musicDuck, type MusicGame, type MusicScreen, type SceneMusic } from "./scene-music";

// Which ambience plays (環境音, 2026-11-13 user decision): from what GameApp shows, the journey's places' own tracks
// (`play.places`, src/content/ambience.ts) and the scene's `# ambience:`, the track or silence, and how it is lowered
// (as the music: scene-music.ts musicDuck). Pure: src/audio/ambience.ts plays the answer. Nothing here reads a
// relationship value.

/** The scene's track: its `# ambience:` (`stop`: silence), else the place's own, else none. */
const written = (ambience: string | undefined, place: string | null): string | null =>
  ambience === AMBIENCE_STOP ? null : ambience ?? place;

/** The battle's `# ambience:`: its frame's, or the one it keeps while it has no frame (a call's question, its result). */
const battleAmbience = (battle: NonNullable<MusicGame["activeBattle"]>): string | undefined => (battle.frame ? battle.frame.ambience : battle.ambience);

/** The ambience of the story screen GameApp shows (in the music's order), or none outside a story scene. */
function storyAmbience(play: AmbienceJourneyPlay, game: MusicGame): string | null {
  const placeId = game.travel.currentPlaceId;
  const place = Object.hasOwn(play.places, placeId) ? play.places[placeId] : null;
  if (game.activeEncounter) return written(game.activeEncounter.frame?.ambience, place);
  if (game.activeEpilogue) return written(game.activeEpilogue.frame?.ambience, place);
  if (game.activeTourism) {
    // The guide is the tourism's scene; an observation opened from a battle keeps the battle's ambience.
    const ambience = game.activeTourism.phase === "guide" ? game.activeTourism.frame?.ambience : game.activeBattle ? battleAmbience(game.activeBattle) : undefined;
    return written(ambience, place);
  }
  if (game.activeBattle) return written(battleAmbience(game.activeBattle), place);
  if (game.activeDate) return written(game.activeDate.frame?.ambience, place);
  return null;
}

/**
 * The ambience of what GameApp shows: in a story scene (an encounter, an arrival, an epilogue or a tour leg,
 * sightseeing and its observation, a battle in every phase, a date) the scene's `# ambience:` (`stop`: silence), else
 * its place's own track (`play.places` by the place the party is at), else none. None on the title screen, under an
 * opening movie, the end roll, a night's visual, the packing and a ride's visual, on the 「交際開始」 screen, the night
 * screen and free time. `play` null or undefined (no ambience): none. Lowered as the music is (musicDuck: a quiz's
 * question part, a `# quiet:` line; a voice's own lowering is the player's).
 */
export function sceneAmbience(play: AmbienceJourneyPlay | null | undefined, screen: MusicScreen): SceneMusic {
  const { game } = screen;
  if (!play || !game || screen.opening || screen.endRoll || screen.nightVisual || screen.packing || screen.riding) return { track: null, duck: "none" };
  const track = storyAmbience(play, game);
  return { track, duck: track === null ? "none" : musicDuck(screen, game) };
}
