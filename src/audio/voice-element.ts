import { AUDIO_GESTURES, audioContext } from "./audio-context";
import { playElement, silenceUrl } from "./loop-player";

// The voice element (2026-11-13, for Debug's speed of the voices: voice-rate.ts). A voice played faster or slower keeps
// its pitch only on a media element (playbackRate with preservesPitch): an AudioBufferSourceNode's playbackRate changes
// the pitch with the speed. So a voice at a rate other than 1× (only while Debug mode is on) plays on this one audio
// element, routed into the page's AudioContext as the music's decks are (loop-player.ts): the element → its gain (「声の
// 大きさ」) → the speakers, so the volume works on iOS too. At 1× (normal play, always) a voice plays from its decoded
// buffer as before (src/components/useVoice.ts). iOS lets an element play by itself only after it has played in a user's
// gesture: while a rate is set, the reader's next gesture plays it once on a short silence.

export type VoiceElement = { element: HTMLAudioElement; gain: GainNode };

let made: VoiceElement | null = null;
let failed = false;
/** It has played once (iOS lets it play by itself afterwards). */
let unlocked = false;
/** A voice holds it (loading or playing): the unlock leaves it alone. */
let inUse = false;
/** Counts its loads: a load that another one replaced does not play. */
let loads = 0;
let gestureListening = false;

/** The voice element on the page's AudioContext, made once (null where it cannot be: the voices then stay at 1×). */
export function voiceElement(audio: AudioContext): VoiceElement | null {
  if (made || failed) return made;
  if (typeof Audio === "undefined") {
    failed = true;
    return null;
  }
  try {
    const element = new Audio();
    element.preload = "auto";
    const gain = audio.createGain();
    gain.connect(audio.destination);
    audio.createMediaElementSource(element).connect(gain);
    made = { element, gain };
  } catch (error) {
    failed = true;
    if (import.meta.env.DEV) console.warn("声の速さを変えて鳴らす準備ができませんでした", error);
  }
  return made;
}

type PitchKeeping = { preservesPitch: boolean; webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };

/**
 * Sets an element's speed with its pitch kept: preservesPitch, and the prefixed names older Safari and Firefox read;
 * the default rate too, which a new load starts from.
 */
export function setVoiceElementRate(element: Pick<HTMLMediaElement, "playbackRate" | "defaultPlaybackRate"> & PitchKeeping, rate: number): void {
  element.preservesPitch = true;
  element.webkitPreservesPitch = true;
  element.mozPreservesPitch = true;
  element.defaultPlaybackRate = rate;
  element.playbackRate = rate;
}

/** A voice loading on the element: `playing` resolves true once it plays and false once it was cancelled or replaced. */
export type VoiceElementLoad = { playing: Promise<boolean>; cancel: () => void };

/**
 * Loads the voice at `url` on the element in place of what it held and plays it from `offsetS` seconds at `rate`.
 * `playing` resolves true once it plays, and false when `cancel` was called or another voice took the element first;
 * it rejects when the voice cannot load or play within `timeoutMs` (a stalled request must not hold auto mode).
 */
export function playOnVoiceElement({ element }: VoiceElement, url: string, offsetS: number, rate: number, timeoutMs: number): VoiceElementLoad {
  const load = ++loads;
  inUse = true;
  element.onended = null;
  element.onerror = null;
  element.src = url;
  // Before any data this is where the playback starts (its default start position).
  if (offsetS > 0) element.currentTime = offsetS;
  setVoiceElementRate(element, rate);
  const playing = new Promise<boolean>((resolve, reject) => {
    const timer = window.setTimeout(() => fail(new Error(`${timeoutMs} ms`)), timeoutMs);
    function fail(error: unknown) {
      window.clearTimeout(timer);
      if (load !== loads) {
        resolve(false);
        return;
      }
      inUse = false;
      element.pause();
      reject(error);
    }
    playElement(element).then(() => {
      window.clearTimeout(timer);
      if (load !== loads) {
        resolve(false);
        return;
      }
      unlocked = true;
      listenForGesture(false);
      resolve(true);
    }, fail);
  });
  return {
    playing,
    cancel() {
      if (load !== loads) return;
      // A later load number: its play, refused by the pause, resolves false.
      loads += 1;
      inUse = false;
      element.pause();
    },
  };
}

/** The voice playing on the element stops (it keeps its rate for the next voice). */
export function releaseVoiceElement({ element }: VoiceElement): void {
  inUse = false;
  element.onended = null;
  element.onerror = null;
  element.pause();
}

/** While `on` (a rate other than 1× with the voices on), the reader's next gesture lets the element play by itself (iOS). */
export function wantVoiceElement(on: boolean): void {
  listenForGesture(on && !unlocked && !failed);
}

/** The reader's gesture: makes the element (and the page's audio) and plays it once on a short silence. */
function onGesture() {
  const audio = audioContext();
  const voice = audio ? voiceElement(audio) : null;
  if (!voice || unlocked) {
    listenForGesture(false);
    return;
  }
  // A voice loading or playing on it unlocks it with its own play.
  if (inUse) return;
  voice.element.src = silenceUrl();
  playElement(voice.element).then(() => {
    unlocked = true;
    listenForGesture(false);
    if (!inUse) voice.element.pause();
  }, () => undefined);
}

function listenForGesture(on: boolean) {
  if (on === gestureListening || typeof document === "undefined") return;
  gestureListening = on;
  for (const type of AUDIO_GESTURES) {
    if (on) document.addEventListener(type, onGesture, true);
    else document.removeEventListener(type, onGesture, true);
  }
}
