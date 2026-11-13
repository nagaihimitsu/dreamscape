import type { MiniGameMusic } from "../contract";

// The mini-games' own music (docs/13 2.11; group3 6.6): three shared tracks, a game picks one by its feel (`music`).
// Their files come later (content/presentation/music.json and public/assets/bgm/<ID>.mp3): until a track is registered,
// the screen keeps the scene's track (GameApp asks bgm.ts hasTrack), so nothing fails without them.

/** The track of each kind of mini-game music: calm (a search, 100–110 BPM), bright (timing, 130–140), festive (rhythm, 150–160). */
export const MINI_GAME_TRACKS: Readonly<Record<Exclude<MiniGameMusic, "scene">, string>> = {
  calm: "mg_calm",
  bright: "mg_bright",
  festive: "mg_festive",
};

/** The track a game asks for while it plays, or null for the scene's own. */
export const miniGameTrack = (music: MiniGameMusic | undefined): string | null => (music && music !== "scene" ? MINI_GAME_TRACKS[music] : null);
