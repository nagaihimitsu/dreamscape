import type { MiniGameMusic } from "../contract";

// The mini-games' own music (docs/13 2.11; group3 6.6): two shared tracks, a game picks one by its feel (`music`).
// They are registered in the shared list (content/presentation/music.json, public/assets/bgm/<ID>.mp3); swapping one
// for another piece keeps its ID (replace the file and its source there). A track the build lacks leaves the scene's
// track playing (GameApp asks bgm.ts hasTrack). A rhythm game has none: its own beat is its music (the scene's track is
// lowered by quietScene), since a track's tempo would clash with the game's beat.

/** The track of each kind of mini-game music: calm (a search, about 110 BPM), bright (timing, about 134 BPM). */
export const MINI_GAME_TRACKS: Readonly<Record<Exclude<MiniGameMusic, "scene">, string>> = {
  calm: "mg_calm",
  bright: "mg_bright",
};

/** The track a game asks for while it plays, or null for the scene's own. */
export const miniGameTrack = (music: MiniGameMusic | undefined): string | null => (music && music !== "scene" ? MINI_GAME_TRACKS[music] : null);
