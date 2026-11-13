import { useEffect, useRef } from "react";
import { voicePath } from "../content/voice-files";
import { audioContext, decodedSoundCache, onAudioStateChange, onPageHidden, wantAudio } from "../audio/audio-context";
import { duckForVoice as duckMusicForVoice } from "../audio/bgm";
import { duckAmbienceForVoice } from "../audio/ambience";

// The voices of lines (2026-11-12): a line's `# voice: <ID>` (src/content/tags.ts) plays its recording, a journey's
// public/assets/voice/<ID>.mp3, as the line's text starts. Played through the page's one AudioContext (made and woken on a
// user's gesture: src/audio/audio-context.ts), the most recently used voices kept decoded in memory, one voice at a time.
// While a voice plays, the background music and the ambience are halved (src/audio/bgm.ts duckForVoice,
// src/audio/ambience.ts). Presentation only: a voice that cannot load or play is skipped in silence and the game goes on.

/** The music and the ambience are halved while a voice plays. */
function duckForVoice(playing: boolean) {
  duckMusicForVoice(playing);
  duckAmbienceForVoice(playing);
}

/** A line's voice as auto-advance waits for it: loading or playing ("busy"), or played to its end ("ended"). */
export type LineVoiceState = "busy" | "ended";
/** What useAutoAdvance gives a line's DialogueText for its voice: none while 高速送り, and how it plays, heard back. */
export type VoiceLink = { muted: boolean; onState: (state: LineVoiceState | null) => void };

/** How many decoded voices stay in memory (the most recently used ones). */
const CACHE_SIZE = 40;
/** A voice that has not loaded by then is skipped (a stalled request must not hold auto-advance). */
const LOAD_TIMEOUT_MS = 10_000;

/** ⚙設定's 「台詞の声を出す」 and 「声の大きさ」 (GameApp: useVoiceSettings). Off until the settings are read. */
const settings = { enabled: false, volume: 0.8 };
/** Decoded voices (or their loading), the most recently used last. */
const loadVoice = decodedSoundCache(CACHE_SIZE, LOAD_TIMEOUT_MS);
type Playing = { source: AudioBufferSourceNode; gain: GainNode; done: (state: "ended" | null) => void };
let playing: Playing | null = null;

// The page's audio suspended again (iOS after a call or another app's sound): the voice playing would never end (auto
// mode waits for it), so it stops.
onAudioStateChange((state) => {
  if (state !== "running" && playing) finish(playing, null);
});

/** Stops `current` if it is still the voice playing, and tells its owner how it ended. */
function finish(current: Playing, state: "ended" | null) {
  if (playing !== current) return;
  playing = null;
  duckForVoice(false);
  current.source.onended = null;
  try {
    current.source.stop();
  } catch {
    // Already stopped.
  }
  current.source.disconnect();
  current.gain.disconnect();
  current.done(state);
}

/** A hidden page (another tab, the phone locked) stops the voice. */
const stopHiddenVoice = () => {
  if (playing) finish(playing, null);
};

/** English read aloud starts (src/audio/speech-audio.ts): the voice playing stops, as when the page is hidden. */
export function stopLineVoice(): void {
  if (playing) finish(playing, null);
}

/**
 * Plays the voice `voiceId` in place of the one playing. `onDone` hears "ended" when it played to its end, and null when
 * it could not load or play or was stopped (the returned function, the page hidden, the setting turned off, another
 * voice), once.
 */
function playVoice(voiceId: string, onDone: (state: "ended" | null) => void): () => void {
  let settled = false;
  const settle = (state: "ended" | null) => {
    if (settled) return;
    settled = true;
    onDone(state);
  };
  const audio = audioContext();
  if (!audio) {
    settle(null);
    return () => undefined;
  }
  onPageHidden(stopHiddenVoice);
  // A browser that has seen the reader's gesture lets the audio wake now; checked again before the voice starts.
  if (audio.state !== "running") void audio.resume().catch(() => undefined);
  let own: Playing | null = null;
  loadVoice(audio, `${import.meta.env.BASE_URL}${voicePath(voiceId)}`).then((buffer) => {
    if (settled) return;
    if (audio.state !== "running" || document.hidden || !settings.enabled) {
      settle(null);
      return;
    }
    if (playing) finish(playing, null);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.value = settings.volume;
    source.connect(gain);
    gain.connect(audio.destination);
    const current: Playing = { source, gain, done: settle };
    source.onended = () => finish(current, "ended");
    source.start();
    own = current;
    playing = current;
    duckForVoice(true);
  }).catch((error: unknown) => {
    if (import.meta.env.DEV) console.warn(`台詞の声を再生できませんでした: ${voiceId}`, error);
    settle(null);
  });
  return () => {
    if (own) finish(own, null);
    settle(null);
  };
}

/**
 * Applies ⚙設定's 「台詞の声を出す」 (`enabled`) and 「声の大きさ」 (`volume`, 0 to 1) to every line's voice: off stops the
 * voice playing (and nothing is fetched); a new volume applies to it at once. Called by GameApp.
 */
export function useVoiceSettings(enabled: boolean, volume: number): void {
  useEffect(() => {
    settings.enabled = enabled;
    settings.volume = volume;
    if (!enabled && playing) finish(playing, null);
    if (playing) playing.gain.gain.value = volume;
    // Until the page's audio runs, the reader's next gesture makes or wakes it (a voice starts with no gesture of its own).
    wantAudio("voice", enabled);
  }, [enabled, volume]);
}

/**
 * The voice of the line on screen (`# voice:`; DialogueText): it starts as the line's text starts (`started`: after its
 * `# pause:`), never while `muted` (高速送り) or with the setting off, and stops when the line changes or the screen
 * goes. `onState` hears "busy" while it loads and plays, "ended" when it has played to its end, and null when it
 * stopped otherwise or the line goes.
 */
export function useLineVoice(voiceId: string | undefined, started: boolean, muted: boolean, onState?: VoiceLink["onState"]): void {
  const report = useRef(onState);
  report.current = onState;
  useEffect(() => {
    if (!voiceId || !started || muted || !settings.enabled || document.hidden) return;
    report.current?.("busy");
    const stop = playVoice(voiceId, (state) => report.current?.(state));
    return () => {
      stop();
      report.current?.(null);
    };
  }, [voiceId, started, muted]);
}
