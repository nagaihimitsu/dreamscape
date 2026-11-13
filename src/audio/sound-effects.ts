import { useEffect, useRef } from "react";
import soundVolumeData from "../content/generated/sound-volumes.json";
import { soundPath, type SystemSoundId } from "../content/sounds";
import { audioContext, decodedSoundCache, onAudioStateChange, onPageHidden, runningAudioContext, wantAudio } from "./audio-context";
import { admitsSe, SE_LATE_MS, SE_MAX_PLAYING } from "./se-rules";

// The sound effects (2026-11-12): the sounds the game plays by itself (playSe: a tap, a dialog, a quiz's answer, a ride)
// and a line's `# se:` (useLineSounds). Fire and forget, several at once (se-rules.ts), on the page's AudioContext
// (audio-context.ts) through their own gain, ⚙設定's 「効果音の大きさ」, apart from the voices. Only the sounds content:build
// registered play (generated/sound-volumes.json): any other ID, a system sound missing from the list included, is skipped
// in silence. Nothing plays while the page is hidden or 「効果音を出す」 is off. Presentation only: a sound that cannot load
// or play is skipped and the game goes on. No sound tells a relationship value.

/** Every registered sound's volume against the others (content:build, scripts/sound-files.ts). */
const volumes: Readonly<Partial<Record<string, number>>> = soundVolumeData;
/** The small sounds of taps and dialogs, fetched as soon as the audio runs: a click heard late is worse than none. */
const UI_SOUNDS: readonly SystemSoundId[] = ["ui_tap", "ui_confirm", "ui_open", "ui_close"];
/** How many decoded sounds stay in memory (the most recently used ones). */
const CACHE_SIZE = 32;
/** A sound that has not loaded by then is skipped. */
const LOAD_TIMEOUT_MS = 10_000;

/** ⚙設定's 「効果音を出す」 and 「効果音の大きさ」 (GameApp: useSoundEffectSettings). Off until the settings are read. */
const settings = { enabled: false, volume: 0.7 };
const load = decodedSoundCache(CACHE_SIZE, LOAD_TIMEOUT_MS);
const playing = new Set<AudioBufferSourceNode>();
/** When each sound last started (performance.now()), for SE_REPEAT_MS. */
const lastStart = new Map<string, number>();
/** The sound effects' own gain (「効果音の大きさ」), made once on the page's AudioContext. */
let bus: GainNode | undefined;
let preloaded = false;
let warned = false;

const urlOf = (id: string) => `${import.meta.env.BASE_URL}${soundPath(id)}`;

/** Stops every sound effect playing (the page hidden, the audio suspended, the setting turned off). */
function stopAll() {
  for (const source of playing) {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
  }
}

function seBus(audio: AudioContext): GainNode {
  if (!bus) {
    bus = audio.createGain();
    bus.gain.value = settings.volume;
    bus.connect(audio.destination);
  }
  return bus;
}

/** Fetches the small UI sounds once the page's audio runs with the setting on (the rest are fetched when first played). */
function preloadUiSounds() {
  const audio = runningAudioContext();
  if (preloaded || !settings.enabled || !audio) return;
  preloaded = true;
  for (const id of UI_SOUNDS) if (Object.hasOwn(volumes, id)) load(audio, urlOf(id)).catch(() => undefined);
}

onAudioStateChange((state) => {
  if (state === "running") preloadUiSounds();
  else stopAll();
});

/**
 * Plays the registered sound `id` once, fire and forget, over any playing: a line's `# se:`, a transport mode's `se`.
 * Skipped when it is not registered, the setting is off or the page hidden, the same sound started within SE_REPEAT_MS,
 * SE_MAX_PLAYING sounds play, or it is ready only after SE_LATE_MS.
 */
export function playSound(id: string): void {
  const volume = Object.hasOwn(volumes, id) ? volumes[id] : undefined;
  if (volume === undefined || !settings.enabled || document.hidden) return;
  const asked = performance.now();
  if (!admitsSe(lastStart.get(id), playing.size, asked)) return;
  lastStart.set(id, asked);
  const audio = audioContext();
  if (!audio) return;
  onPageHidden(stopAll);
  // A browser that has seen the reader's gesture lets the audio wake now; checked again before the sound starts.
  if (audio.state !== "running") void audio.resume().catch(() => undefined);
  load(audio, urlOf(id)).then((buffer) => {
    if (audio.state !== "running" || document.hidden || !settings.enabled || playing.size >= SE_MAX_PLAYING ||
        performance.now() - asked > SE_LATE_MS) return;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(seBus(audio));
    source.onended = () => {
      playing.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    playing.add(source);
    source.start();
  }).catch((error: unknown) => {
    if (import.meta.env.DEV && !warned) {
      warned = true;
      console.warn(`効果音を再生できませんでした: ${id}`, error);
    }
  });
}

/** Plays a sound the game plays by itself (playSound), at the moment its thing appears or its action happens. */
export function playSe(id: SystemSoundId): void {
  playSound(id);
}

/** A load has just brought a scene back (GameApp): its cues wait for the player's next action. */
let cuesHeld = false;
/** 高速送り runs on the scene on screen (useAutoAdvance). */
let fastForward = false;

/** Holds the scene's cues while a load or the page's start has brought the scene back, until the player's next action (GameApp). */
export function holdSceneCues(held: boolean): void {
  cuesHeld = held;
}

/** The scene's 高速送り (useAutoAdvance): its cues stay silent while it runs. */
export function setSceneFastForward(on: boolean): void {
  fastForward = on;
}

/**
 * Plays a cue of the scene on screen (a line's phone, letter, name plate or recall, a word learned, a city's title):
 * playSe, but not for a scene a load has just brought back (holdSceneCues) nor during 高速送り.
 */
export function playCue(id: SystemSoundId): void {
  if (!cuesHeld && !fastForward) playSound(id);
}

/**
 * Applies ⚙設定's 「効果音を出す」 (`enabled`) and 「効果音の大きさ」 (`volume`, 0 to 1) to every sound effect: off stops
 * the sounds playing (and nothing is fetched); a new volume applies at once, to the sounds playing too. Called by GameApp.
 */
export function useSoundEffectSettings(enabled: boolean, volume: number): void {
  useEffect(() => {
    settings.enabled = enabled;
    settings.volume = volume;
    if (bus) bus.gain.value = volume;
    if (!enabled) stopAll();
    // Until the page's audio runs, the reader's next gesture makes or wakes it.
    wantAudio("se", enabled);
    preloadUiSounds();
  }, [enabled, volume]);
}

/** The text of the last line whose sounds were decided: the same line kept on screen (no new line read) is not heard again. */
let lastLine: string | null = null;

/**
 * The sounds of the line on screen (DialogueText): its `# se:` (`seId`) and the cues of its scene tags (`cues`,
 * line-staging.ts lineCues), once as its text starts (`started`: after its `# pause:`), none while `muted` (高速送り). A
 * frame that kept the line before it (the story stopped at a choice or its end) has no `# se:` (frame-reader.ts), and its
 * cues are not played again: a line with the same text as the last one plays its `# se:` only. `onCue`: the line's
 * cue that is no sound (its scene shake, `# shake`), run as its cues play: not for a scene a load brought back
 * (holdSceneCues), nor during 高速送り, nor again for a line kept on screen.
 */
export function useLineSounds(text: string, seId: string | undefined, cues: readonly SystemSoundId[], started: boolean, muted: boolean,
  onCue?: () => void): void {
  const latest = useRef({ seId, cues, muted, onCue });
  latest.current = { seId, cues, muted, onCue };
  const heard = useRef<string | null>(null);
  useEffect(() => {
    if (!started || heard.current === text) return;
    heard.current = text;
    const kept = text === lastLine;
    lastLine = text;
    const line = latest.current;
    if (line.muted) return;
    if (line.seId) playSound(line.seId);
    if (kept) return;
    for (const cue of line.cues) playCue(cue);
    if (!cuesHeld && !fastForward) line.onCue?.();
  }, [text, started]);
}
