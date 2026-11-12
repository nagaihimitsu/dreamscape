import { BGM_STOP, type MusicPlay } from "../content/music";

// Which music plays (2026-11-12): from what GameApp shows, the journey's `play` (src/content/music.ts) and the scene's
// `# bgm:`, the track (or silence, or the track playing kept) and how it is lowered. Pure: src/audio/bgm.ts plays the
// answer. Nothing here reads a relationship value: the music tells none, a confession's result included (the track of a
// confession's scene is the one its writer chose, the same whatever the result).

/**
 * How the track playing is lowered: `quiz` while a quiz's question part is on screen (quieter and muffled, the track
 * goes on), `quiet` on a `# quiet:` line, `travel` under a ride's visual (its sound is heard), `none` otherwise.
 */
export type MusicDuck = "none" | "quiz" | "quiet" | "travel";

/**
 * What the screen asks of the music: `track` a track's ID, null for silence, undefined to keep whatever plays (the
 * 「交際開始」 screen, the packing); and how it is lowered.
 */
export type SceneMusic = { track: string | null | undefined; duck: MusicDuck };

/** The free time's part of the day by the game clock: morning 05:00–11:59, day 12:00–17:59, night 18:00–04:59. */
export type FreeTimePeriod = "morning" | "day" | "night";

/** A scene's frame as the music reads it: its `# bgm:` (a track or `stop`) and its `# quiet:`. */
type MusicFrame = { bgm?: string; quiet?: string } | null;
/** The parts of the game state the music reads (GameState has them). */
export type MusicGame = {
  travel: { minute: number; currentPlaceId: string };
  activeEncounter: { phase: string; frame: MusicFrame } | null;
  activeEpilogue: { kind?: string; logoComplete?: boolean; frame: MusicFrame } | null;
  activeTourism: { phase: string; frame: MusicFrame } | null;
  /** A battle without a frame (a call's question, its result) keeps its frame's `# bgm:` in `bgm` (src/domain/battle.ts). */
  activeBattle: { phase: string; frame: MusicFrame; bgm?: string } | null;
  activeDate: { frame: MusicFrame } | null;
};

/** What GameApp shows besides the game state: its overlays and the screens it decides itself. */
export type MusicScreen = {
  /** The game; null on the title screen (no game yet). */
  game: MusicGame | null;
  /** The journey's end roll is on screen. */
  endRoll: boolean;
  /** A night's visual is on screen (a rest at the hotel, 「次の日」). */
  nightVisual: boolean;
  /** A ride's visual is on screen (over the screen it leads to). */
  riding: boolean;
  /** A departure's packing is shown in place of the screen. */
  packing: boolean;
  /** The 「交際開始」 screen. */
  romanceEnding: boolean;
  /** The night screen. */
  nightScreen: boolean;
};

const DAY = 24 * 60;

/** The free time's part of the day at the game clock's `minute` (minutes from midnight; past midnight wraps). */
export function freeTimePeriod(minute: number): FreeTimePeriod {
  const time = Number.isFinite(minute) ? ((Math.floor(minute) % DAY) + DAY) % DAY : 12 * 60;
  if (time >= 5 * 60 && time < 12 * 60) return "morning";
  if (time >= 12 * 60 && time < 18 * 60) return "day";
  return "night";
}

/** The battle's `# bgm:`: its frame's, or the one it keeps while it has no frame. */
const battleBgm = (battle: NonNullable<MusicGame["activeBattle"]>): string | undefined => (battle.frame ? battle.frame.bgm : battle.bgm);

/** The line on screen (as lineFrameOnScreen of local-words.ts): the scene shown, none under an arrival's title or outside a story. */
function lineOnScreen(game: MusicGame): MusicFrame {
  return game.activeEncounter ? game.activeEncounter.frame
    : game.activeEpilogue ? (game.activeEpilogue.kind === "arrival" && !game.activeEpilogue.logoComplete ? null : game.activeEpilogue.frame)
      : game.activeTourism ? (game.activeTourism.phase === "guide" ? game.activeTourism.frame : null)
        : game.activeBattle ? (game.activeBattle.phase === "dialogue" ? game.activeBattle.frame : null)
          : game.activeDate?.frame ?? null;
}

/** A quiz's question part is on screen: a battle in any phase but its conversation, an encounter's question and its answer. */
function quizOnScreen(game: MusicGame): boolean {
  if (game.activeEncounter) return game.activeEncounter.phase === "quiz" || game.activeEncounter.phase === "feedback";
  if (game.activeEpilogue || game.activeTourism) return false;
  return !!game.activeBattle && game.activeBattle.phase !== "dialogue";
}

/** The scene's track: its `# bgm:` (`stop`: silence), else `usual`. */
const written = (bgm: string | undefined, usual: string): string | null => (bgm === BGM_STOP ? null : bgm ?? usual);

/** The track of the story screen GameApp shows (in its order), or of free time; undefined keeps the track playing. */
function screenTrack(play: MusicPlay, screen: MusicScreen, game: MusicGame): string | null | undefined {
  const placeId = game.travel.currentPlaceId;
  const place = Object.hasOwn(play.places, placeId) ? play.places[placeId] : play.place;
  if (game.activeEncounter) return written(game.activeEncounter.frame?.bgm, place);
  if (game.activeEpilogue) {
    const { kind } = game.activeEpilogue;
    // A tour leg's narration is a ride between places, not a farewell: the place's track.
    return written(game.activeEpilogue.frame?.bgm, kind === "arrival" ? play.arrival : kind === "tour_leg" ? place : play.epilogue);
  }
  if (game.activeTourism) {
    // The guide is the tourism's scene; an observation opened from a battle keeps the battle's music.
    const bgm = game.activeTourism.phase === "guide" ? game.activeTourism.frame?.bgm : game.activeBattle ? battleBgm(game.activeBattle) : undefined;
    return written(bgm, place);
  }
  if (game.activeBattle) return written(battleBgm(game.activeBattle), place);
  if (game.activeDate) return written(game.activeDate.frame?.bgm, place);
  if (screen.romanceEnding) return undefined;
  if (screen.nightScreen) return play.night;
  return play.freeTime[freeTimePeriod(game.travel.minute)];
}

/**
 * The music of what GameApp shows, in its order: the title screen (`title`), the end roll (`endRoll`), a night's visual
 * (`night`), the packing (kept), the story screens (an encounter, an arrival or epilogue, sightseeing, a battle, a
 * date: the scene's `# bgm:`, else the place's track or the screen's usual one), the 「交際開始」 screen (kept), the
 * night screen (`night`) and free time (by the game clock). `play` null or undefined (no music list): silence.
 * Lowered under a ride's visual (`travel`), else while a quiz's question part is on screen (`quiz`; a writer's track
 * too), else on a `# quiet:` line (`quiet`).
 */
export function sceneMusic(play: MusicPlay | null | undefined, screen: MusicScreen): SceneMusic {
  const { game } = screen;
  if (!play) return { track: null, duck: "none" };
  if (!game) return { track: play.title, duck: "none" };
  if (screen.endRoll) return { track: play.endRoll, duck: "none" };
  if (screen.nightVisual) return { track: play.night, duck: "none" };
  if (screen.packing) return { track: undefined, duck: screen.riding ? "travel" : "none" };
  const duck: MusicDuck = screen.riding ? "travel" : quizOnScreen(game) ? "quiz" : lineOnScreen(game)?.quiet ? "quiet" : "none";
  return { track: screenTrack(play, screen, game), duck };
}
