import { useEffect } from "react";
import musicJson from "../content/generated/music.json";
import { musicDataSchema, musicPath, type MusicData, type MusicPlay } from "../content/music";
import { createLoopPlayer } from "./loop-player";
import type { MusicDuck, SceneMusic } from "./scene-music";

// The background music (2026-11-12): the track the screen asks for (src/audio/scene-music.ts) streamed from
// `assets/bgm/<ID>.mp3` by a looping player (loop-player.ts: two audio elements on the page's AudioContext, a 1.5 s
// crossfade, the quiz's muffle, the lowerings and ⚙設定's 「BGMの大きさ」). Nothing plays while the page is hidden, the
// page's audio is suspended or 「BGMを流す」 is off, and nothing is fetched while it is off. Presentation only: a track
// that cannot load or play is skipped in silence and the game goes on; the music tells nothing (no relationship value,
// no answer).

const EMPTY_DATA: MusicData = { schemaVersion: 1, sources: [], tracks: [], root: null, journeys: {} };

/** The tracks and where they play (content:build writes the file, scripts/music-files.ts); unreadable, nothing plays. */
function readMusicData(): MusicData {
  const parsed = musicDataSchema.safeParse(musicJson as unknown);
  if (!parsed.success && import.meta.env.DEV) console.warn("BGMの一覧を読めませんでした", parsed.error);
  return parsed.success ? parsed.data : EMPTY_DATA;
}
const data = readMusicData();

/** Whether the build has the track `trackId` (a mini-game's own music plays only once its file is registered: docs/13 2.11). */
export const hasTrack = (trackId: string): boolean => data.tracks.some((track) => track.id === trackId);

/** The tracks the journey `journeyId` plays where (the shared ones when the build has no entry for it), or null without music. */
export function journeyMusicPlay(journeyId: string): MusicPlay | null {
  return Object.hasOwn(data.journeys, journeyId) ? data.journeys[journeyId] : data.root;
}

/** What a registered track is for (its `useJa`, as the credits list says it), or undefined for a track the build lacks. */
export function trackUseJa(trackId: string): string | undefined {
  return data.tracks.find((track) => track.id === trackId)?.useJa;
}

/** The level of each lowering (a voice's halves it again: loop-player.ts). */
const DUCK_LEVELS: Readonly<Record<MusicDuck, number>> = { none: 1, quiz: 0.35, quiet: 0.5, travel: 0.6, minigame: 0.25 };

const player = createLoopPlayer({
  part: "bgm",
  pathOf: musicPath,
  volumes: new Map(data.tracks.map((track) => [track.id, track.volume])),
  duckLevels: DUCK_LEVELS,
  labelJa: "BGM",
});

/**
 * Sends the screen's music (scene-music.ts sceneMusic) to the player: a new track crossfades in, the same one goes on,
 * null fades to silence, undefined keeps what plays; the lowering ramps to its level.
 */
export function playSceneMusic(target: SceneMusic): void {
  player.play(target);
}

/** A line's voice starts or ends (src/components/useVoice.ts): the music is halved while it plays. */
export function duckForVoice(playing: boolean): void {
  player.duckForVoice(playing);
}

/**
 * English read aloud starts or is over (src/audio/speech-audio.ts): the music is lowered as for a voice while it reads,
 * and plays on after it.
 */
export function duckMusicForSpeech(reading: boolean): void {
  player.duckForSpeech(reading);
}

/**
 * Applies ⚙設定's 「BGMを流す」 (`enabled`) and 「BGMの大きさ」 (`volume`, 0 to 1): off fades the music out and pauses it
 * (nothing is fetched while it is off); on plays the screen's track again; a new volume applies at once. Called by GameApp.
 */
export function useBgmSettings(enabled: boolean, volume: number): void {
  useEffect(() => {
    player.applySettings(enabled, volume);
  }, [enabled, volume]);
}

/** Plays the screen's music (GameApp: sceneMusic of what it shows), as it changes. */
export function useSceneMusic(target: SceneMusic): void {
  const { track, duck: lowered } = target;
  useEffect(() => {
    playSceneMusic({ track, duck: lowered });
  }, [track, lowered]);
}
