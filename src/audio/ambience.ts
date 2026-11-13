import { useEffect } from "react";
import ambienceJson from "../content/generated/ambience.json";
import { ambienceDataSchema, ambiencePath, type AmbienceData, type AmbienceJourneyPlay } from "../content/ambience";
import { createLoopPlayer } from "./loop-player";
import type { MusicDuck, SceneMusic } from "./scene-music";

// The ambience (環境音, 2026-11-13 user decision): a quiet looping sound of the place under the background music, the
// track the screen asks for (src/audio/scene-ambience.ts) streamed from `assets/ambience/<ID>.mp3` by its own looping
// player (loop-player.ts: the music's two decks, crossfade, quiz muffle and lowerings). Its level is half the music's
// 「BGMの大きさ」; ⚙設定's 「環境音を流す」 turns it off. Nothing plays while the page is hidden or its audio is suspended,
// and nothing is fetched while it is off. Presentation only: a track that cannot load or play is skipped in silence.

const EMPTY_DATA: AmbienceData = { schemaVersion: 1, sources: [], tracks: [], journeys: {} };

/** The tracks and the places' own (content:build writes the file, scripts/ambience-files.ts); unreadable, nothing plays. */
function readAmbienceData(): AmbienceData {
  const parsed = ambienceDataSchema.safeParse(ambienceJson as unknown);
  if (!parsed.success && import.meta.env.DEV) console.warn("環境音の一覧を読めませんでした", parsed.error);
  return parsed.success ? parsed.data : EMPTY_DATA;
}
const data = readAmbienceData();

/** No place with a track of its own. */
const NO_PLACES: AmbienceJourneyPlay = { places: {} };

/** The places' own tracks of the journey `journeyId` (none when the build has no entry for it: then only the lines' own play). */
export function journeyAmbiencePlay(journeyId: string): AmbienceJourneyPlay {
  return Object.hasOwn(data.journeys, journeyId) ? data.journeys[journeyId] : NO_PLACES;
}

/** The ambience's level against the music's 「BGMの大きさ」. */
export const AMBIENCE_LEVEL = 0.5;
/** Each lowering (a quiz's question part lower and muffled, a quiet line a little; under a ride it does not play). */
const DUCK_LEVELS: Readonly<Record<MusicDuck, number>> = { none: 1, quiz: 0.35, quiet: 0.6, travel: 0.6 };

const player = createLoopPlayer({
  part: "ambience",
  pathOf: ambiencePath,
  volumes: new Map(data.tracks.map((track) => [track.id, track.volume])),
  duckLevels: DUCK_LEVELS,
  labelJa: "環境音",
});

/** A line's voice starts or ends (src/components/useVoice.ts): the ambience is halved while it plays, as the music is. */
export function duckAmbienceForVoice(playing: boolean): void {
  player.duckForVoice(playing);
}

/** The ambience's volume from ⚙設定's 「BGMの大きさ」 (0 to 1): half of it. */
export const ambienceVolume = (bgmVolume: number): number => Math.max(0, Math.min(1, bgmVolume)) * AMBIENCE_LEVEL;

/**
 * Applies ⚙設定's 「環境音を流す」 (`enabled`) and 「BGMの大きさ」 (`bgmVolume`, 0 to 1; the ambience plays at half of it):
 * off fades the ambience out and pauses it (nothing is fetched while it is off); on plays the screen's track again.
 * Called by GameApp.
 */
export function useAmbienceSettings(enabled: boolean, bgmVolume: number): void {
  useEffect(() => {
    player.applySettings(enabled, ambienceVolume(bgmVolume));
  }, [enabled, bgmVolume]);
}

/** Plays the screen's ambience (GameApp: sceneAmbience of what it shows), as it changes. */
export function useSceneAmbience(target: SceneMusic): void {
  const { track, duck } = target;
  useEffect(() => {
    player.play({ track, duck });
  }, [track, duck]);
}
