import { useEffect, useRef } from "react";
import { voicePath } from "../content/voice-files";

// The voices of lines (2026-11-12): a line's `# voice: <ID>` (src/content/tags.ts) plays its recording, a journey's
// public/assets/voice/<ID>.mp3, as the line's text starts. Played through the Web Audio API, not an audio element
// (iOS Safari ignores an audio element's volume): one AudioContext for the whole page, made and woken on a user's
// gesture, the most recently used voices kept decoded in memory, one voice at a time. Presentation only: a voice that
// cannot load or play is skipped in silence and the game goes on.

/** A line's voice as auto-advance waits for it: loading or playing ("busy"), or played to its end ("ended"). */
export type LineVoiceState = "busy" | "ended";
/** What useAutoAdvance gives a line's DialogueText for its voice: none while 高速送り, and how it plays, heard back. */
export type VoiceLink = { muted: boolean; onState: (state: LineVoiceState | null) => void };

/** How many decoded voices stay in memory (the most recently used ones). */
const CACHE_SIZE = 40;
/** A voice that has not loaded by then is skipped (a stalled request must not hold auto-advance). */
const LOAD_TIMEOUT_MS = 10_000;
/** A touch starts the page's audio only on its release (pointerup); a mouse and keys on their press. */
const GESTURES = ["pointerdown", "pointerup", "keydown"] as const;

/** ⚙設定's 「台詞の声を出す」 and 「声の大きさ」 (GameApp: useVoiceSettings). Off until the settings are read. */
const settings = { enabled: false, volume: 0.8 };
let context: AudioContext | undefined;
/** Decoded voices (or their loading) by ID, the most recently used last. */
const buffers = new Map<string, Promise<AudioBuffer>>();
type Playing = { source: AudioBufferSourceNode; gain: GainNode; done: (state: "ended" | null) => void };
let playing: Playing | null = null;
let gestureListening = false;
let hiddenListening = false;

/** The page's AudioContext, made on first use; undefined where the browser has no Web Audio. */
function audioContext(): AudioContext | undefined {
  if (context) return context;
  if (typeof AudioContext === "undefined") return undefined;
  try {
    context = new AudioContext();
  } catch {
    return undefined;
  }
  const made = context;
  // Running: no gesture is needed any more. Suspended again (iOS after a call or another app's sound): the voice playing
  // would never end (auto mode waits for it), so it stops, and the next gesture wakes the audio.
  made.addEventListener("statechange", () => {
    if (made.state !== "running" && playing) finish(playing, null);
    listenForGesture(settings.enabled && made.state !== "running");
  });
  return made;
}

/** Makes or wakes the page's audio in a user's gesture, the only moment a browser lets it start. */
function unlock() {
  const audio = audioContext();
  if (!audio || audio.state === "running") listenForGesture(false);
  else void audio.resume().catch(() => undefined);
}

function listenForGesture(on: boolean) {
  if (on === gestureListening) return;
  gestureListening = on;
  for (const type of GESTURES) {
    if (on) document.addEventListener(type, unlock, true);
    else document.removeEventListener(type, unlock, true);
  }
}

/** Stops `current` if it is still the voice playing, and tells its owner how it ended. */
function finish(current: Playing, state: "ended" | null) {
  if (playing !== current) return;
  playing = null;
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
function stopWhenHidden() {
  if (hiddenListening) return;
  hiddenListening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) finish(playing, null);
  });
}

/** The decoded voice `voiceId`, from memory or fetched and decoded (a failed one is forgotten, to be tried again later). */
function loadVoice(audio: AudioContext, voiceId: string): Promise<AudioBuffer> {
  const cached = buffers.get(voiceId);
  if (cached) {
    buffers.delete(voiceId);
    buffers.set(voiceId, cached);
    return cached;
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
  const loading = fetch(`${import.meta.env.BASE_URL}${voicePath(voiceId)}`, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => audio.decodeAudioData(data))
    .finally(() => window.clearTimeout(timer));
  buffers.set(voiceId, loading);
  loading.catch(() => {
    if (buffers.get(voiceId) === loading) buffers.delete(voiceId);
  });
  for (const id of buffers.keys()) {
    if (buffers.size <= CACHE_SIZE) break;
    buffers.delete(id);
  }
  return loading;
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
  stopWhenHidden();
  // A browser that has seen the reader's gesture lets the audio wake now; checked again before the voice starts.
  if (audio.state !== "running") void audio.resume().catch(() => undefined);
  let own: Playing | null = null;
  loadVoice(audio, voiceId).then((buffer) => {
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
    listenForGesture(enabled && context?.state !== "running");
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
