// The page's audio (2026-11-12), shared by the lines' voices (src/components/useVoice.ts), the sound effects
// (sound-effects.ts) and the music (bgm.ts): one AudioContext for the whole page, made and woken on a user's gesture (the only moment a browser
// lets audio start), caches of decoded sounds, and the page going to the background. Played through the Web Audio API,
// not an audio element (iOS Safari ignores an audio element's volume). Each part keeps its own gain and settings.

/** A touch starts the page's audio only on its release (pointerup); a mouse and keys on their press. */
export const AUDIO_GESTURES = ["pointerdown", "pointerup", "keydown"] as const;

let context: AudioContext | undefined;
const stateListeners = new Set<(state: AudioContextState) => void>();
/** The parts that want the page's audio now (their setting is on): until it runs, the reader's next gesture wakes it. */
const wanting = new Set<string>();
let gestureListening = false;
const hiddenListeners = new Set<() => void>();
let hiddenListening = false;

/** The page's AudioContext, made on first use; undefined where the browser has no Web Audio. */
export function audioContext(): AudioContext | undefined {
  if (context) return context;
  if (typeof AudioContext === "undefined") return undefined;
  try {
    context = new AudioContext();
  } catch {
    return undefined;
  }
  const made = context;
  // Running: no gesture is needed any more. Suspended again (iOS after a call or another app's sound): each part hears
  // it (a voice playing would never end), and the next gesture wakes the audio.
  made.addEventListener("statechange", () => {
    for (const listener of stateListeners) listener(made.state);
    listenForGesture(wanting.size > 0 && made.state !== "running");
  });
  return made;
}

/** The page's AudioContext when it has been made and runs (nothing is made here). */
export function runningAudioContext(): AudioContext | undefined {
  return context?.state === "running" ? context : undefined;
}

/** Hears every change of the page's audio state (running, suspended, closed). */
export function onAudioStateChange(listener: (state: AudioContextState) => void): void {
  stateListeners.add(listener);
}

/**
 * Whether the part `part` (its setting) wants the page's audio: while any part does and the audio does not run, the
 * reader's next gesture makes or wakes it (a sound starts with no gesture of its own).
 */
export function wantAudio(part: string, on: boolean): void {
  if (on) wanting.add(part);
  else wanting.delete(part);
  listenForGesture(wanting.size > 0 && context?.state !== "running");
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
  for (const type of AUDIO_GESTURES) {
    if (on) document.addEventListener(type, unlock, true);
    else document.removeEventListener(type, unlock, true);
  }
}

/** Calls `listener` whenever the page is hidden (another tab, the phone locked); once per listener. */
export function onPageHidden(listener: () => void): void {
  hiddenListeners.add(listener);
  if (hiddenListening) return;
  hiddenListening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) for (const hidden of hiddenListeners) hidden();
  });
}

/**
 * A cache of decoded sounds by URL: `load` gives the decoded sound from memory or fetches and decodes it, keeping the
 * `size` most recently used (or their loading). A sound that has not loaded within `timeoutMs` fails (a stalled request
 * must not hold anything up), and a failed one is forgotten, to be tried again later.
 */
export function decodedSoundCache(size: number, timeoutMs: number): (audio: AudioContext, url: string) => Promise<AudioBuffer> {
  const buffers = new Map<string, Promise<AudioBuffer>>();
  return (audio, url) => {
    const cached = buffers.get(url);
    if (cached) {
      buffers.delete(url);
      buffers.set(url, cached);
      return cached;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const loading = fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => audio.decodeAudioData(data))
      .finally(() => window.clearTimeout(timer));
    buffers.set(url, loading);
    loading.catch(() => {
      if (buffers.get(url) === loading) buffers.delete(url);
    });
    for (const key of buffers.keys()) {
      if (buffers.size <= size) break;
      buffers.delete(key);
    }
    return loading;
  };
}
