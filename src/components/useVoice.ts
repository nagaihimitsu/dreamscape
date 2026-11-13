import { useEffect, useRef } from "react";
import { voicePath } from "../content/voice-files";
import { audioContext, decodedSoundCache, onAudioStateChange, onPageHidden, wantAudio } from "../audio/audio-context";
import { duckForVoice as duckMusicForVoice } from "../audio/bgm";
import { duckAmbienceForVoice } from "../audio/ambience";
import { clampVoiceRate, effectiveVoiceMs } from "../audio/voice-rate";
import {
  playOnVoiceElement, releaseVoiceElement, setVoiceElementRate, voiceElement, wantVoiceElement, type VoiceElement, type VoiceElementLoad,
} from "../audio/voice-element";

// The voices of lines (2026-11-12): a line's `# voice: <ID>` (src/content/tags.ts) plays its recording, a journey's
// public/assets/voice/<ID>.mp3, as the line's text starts. Played through the page's one AudioContext (made and woken on a
// user's gesture: src/audio/audio-context.ts), the most recently used voices kept decoded in memory, one voice at a time.
// While a voice plays, the background music and the ambience are halved (src/audio/bgm.ts duckForVoice,
// src/audio/ambience.ts). Presentation only: a voice that cannot load or play is skipped in silence and the game goes on.
// Debug's speed of the voices (2026-11-13, src/audio/voice-rate.ts; 1× with Debug mode off): a voice at another rate
// plays on the voice element with its pitch kept (src/audio/voice-element.ts), and a new rate applies to the voice
// playing at once. Auto mode, the music's lowering and its return follow the voice's own end, which comes after its
// length ÷ the rate.

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
/** How long past its effective end a voice on the element may go without moving before it is stopped. */
const STALL_GRACE_MS = 1500;
/** How far the element may be from its buffer's place when a voice moves onto it (seconds) before it is put there. */
const HANDOVER_DRIFT_S = 0.08;

/**
 * ⚙設定's 「台詞の声を出す」 and 「声の大きさ」 (GameApp: useVoiceSettings), off until the settings are read; the rate
 * (useVoiceRate: Debug's, 1 with Debug mode off).
 */
const settings = { enabled: false, volume: 0.8, rate: 1 };
/** Decoded voices (or their loading), the most recently used last. */
const loadVoice = decodedSoundCache(CACHE_SIZE, LOAD_TIMEOUT_MS);

type Done = (state: "ended" | null) => void;
/** A voice from its decoded buffer, at 1× (normal play: always). */
type BufferSound = { kind: "buffer"; source: AudioBufferSourceNode; gain: GainNode; startedAt: number };
/** A voice on the voice element, at Debug's rate with its pitch kept; `guard` is its stall check (guardStall). */
type ElementSound = { kind: "element"; media: VoiceElement; guard: number | undefined };
/** The voice playing: what it is, how it sounds now (a voice from its buffer moves onto the element when a rate is set), and its owner. */
type Voice = { voiceId: string; sound: BufferSound | ElementSound; done: Done; handover?: VoiceElementLoad };
let playing: Voice | null = null;

const voiceUrl = (voiceId: string) => `${import.meta.env.BASE_URL}${voicePath(voiceId)}`;

// The page's audio suspended again (iOS after a call or another app's sound): the voice playing would never end (auto
// mode waits for it), so it stops.
onAudioStateChange((state) => {
  if (state !== "running" && playing) finish(playing, null);
});

/** Silences a sound (without telling the voice's owner). */
function silence(sound: Voice["sound"]) {
  if (sound.kind === "element") {
    window.clearTimeout(sound.guard);
    releaseVoiceElement(sound.media);
    return;
  }
  sound.source.onended = null;
  try {
    sound.source.stop();
  } catch {
    // Already stopped.
  }
  sound.source.disconnect();
  sound.gain.disconnect();
}

/** Stops `current` if it is still the voice playing, and tells its owner how it ended. */
function finish(current: Voice, state: "ended" | null) {
  if (playing !== current) return;
  playing = null;
  duckForVoice(false);
  current.handover?.cancel();
  silence(current.sound);
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

/** Starts `buffer` on the page's audio at 1×; its end finishes `voice`. */
function bufferSound(audio: AudioContext, buffer: AudioBuffer, voice: () => Voice): BufferSound {
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = settings.volume;
  source.connect(gain);
  gain.connect(audio.destination);
  const sound: BufferSound = { kind: "buffer", source, gain, startedAt: audio.currentTime };
  source.onended = () => {
    const current = voice();
    if (current.sound === sound) finish(current, "ended");
  };
  source.start();
  return sound;
}

/** The voice element's sound (already playing): its end finishes `voice`, as an error does. */
function elementSound(element: VoiceElement, voice: () => Voice): ElementSound {
  const sound: ElementSound = { kind: "element", media: element, guard: undefined };
  const end = (state: "ended" | null) => {
    const current = voice();
    if (current.sound === sound) finish(current, state);
  };
  element.element.onended = () => end("ended");
  element.element.onerror = () => end(null);
  return sound;
}

/** The gain of a sound's volume (「声の大きさ」). */
const gainOf = (sound: Voice["sound"]): GainNode => sound.kind === "element" ? sound.media.gain : sound.gain;

/**
 * A voice on the element ends with its `ended`; this guard keeps a stalled one (a network gone mid-voice) from holding
 * auto mode. Once its effective remaining length (the rest ÷ the rate) and STALL_GRACE_MS have passed, a voice that
 * has not moved on is stopped, and one still moving (a length the browser estimated short) is looked at again.
 * A new rate sets it again.
 */
function guardStall(voice: Voice) {
  const sound = voice.sound;
  if (sound.kind !== "element") return;
  window.clearTimeout(sound.guard);
  const { element } = sound.media;
  const at = element.currentTime;
  const restMs = Number.isFinite(element.duration) ? Math.max(0, element.duration - at) * 1000 : 0;
  sound.guard = window.setTimeout(() => {
    if (playing !== voice || voice.sound !== sound) return;
    if (element.currentTime > at) guardStall(voice);
    else finish(voice, null);
  }, effectiveVoiceMs(restMs, settings.rate) + STALL_GRACE_MS);
}

/**
 * A voice playing from its buffer when a rate is set moves onto the voice element from where it is (a buffer's own
 * rate would change its pitch). It goes on from its buffer at 1× until the element plays it, and to its end if the
 * element cannot.
 */
function handOver(voice: Voice) {
  const sound = voice.sound;
  if (sound.kind !== "buffer" || voice.handover) return;
  const audio = audioContext();
  const element = audio ? voiceElement(audio) : null;
  if (!audio || !element) return;
  // Where the voice is in its recording (its buffer plays at 1×).
  const at = () => audio.currentTime - sound.startedAt;
  element.gain.gain.value = settings.volume;
  const load = playOnVoiceElement(element, voiceUrl(voice.voiceId), at(), settings.rate, LOAD_TIMEOUT_MS);
  voice.handover = load;
  const over = () => {
    if (voice.handover === load) voice.handover = undefined;
  };
  load.playing.then((plays) => {
    over();
    if (!plays) return;
    const position = at();
    if (playing !== voice || voice.sound !== sound || position >= (sound.source.buffer?.duration ?? 0)) {
      // The voice ended or stopped meanwhile.
      releaseVoiceElement(element);
      return;
    }
    if (Math.abs(element.element.currentTime - position) > HANDOVER_DRIFT_S) element.element.currentTime = position;
    setVoiceElementRate(element.element, settings.rate);
    silence(sound);
    voice.sound = elementSound(element, () => voice);
    guardStall(voice);
  }, over);
}

/**
 * Plays the voice `voiceId` in place of the one playing. `onDone` hears "ended" when it played to its end, and null when
 * it could not load or play or was stopped (the returned function, the page hidden, the setting turned off, another
 * voice), once.
 */
function playVoice(voiceId: string, onDone: Done): () => void {
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
  const url = voiceUrl(voiceId);
  let own: Voice | null = null;
  let loading: VoiceElementLoad | null = null;
  /** Whether the voice may start now (checked once it has loaded). */
  const startable = () => audio.state === "running" && !document.hidden && settings.enabled;
  /** The voice (started) is the one playing, the music halved. */
  const begin = (voice: Voice) => {
    own = voice;
    playing = voice;
    duckForVoice(true);
  };
  const failed = (error: unknown) => {
    if (import.meta.env.DEV) console.warn(`台詞の声を再生できませんでした: ${voiceId}`, error);
    settle(null);
  };

  // Debug's rate other than 1×: on the voice element, its pitch kept (where there is none, from the buffer at 1×).
  const element = settings.rate !== 1 ? voiceElement(audio) : null;
  if (element) {
    // The element is about to hold this voice: one playing on it stops now (one from a buffer goes on until it plays).
    if (playing?.sound.kind === "element") finish(playing, null);
    element.gain.gain.value = settings.volume;
    const load = playOnVoiceElement(element, url, 0, settings.rate, LOAD_TIMEOUT_MS);
    loading = load;
    load.playing.then((plays) => {
      loading = null;
      if (plays && !settled && startable()) {
        if (playing) finish(playing, null);
        const voice: Voice = { voiceId, sound: elementSound(element, () => voice), done: settle };
        begin(voice);
        guardStall(voice);
        return;
      }
      if (plays) releaseVoiceElement(element);
      settle(null);
    }, (error: unknown) => {
      loading = null;
      failed(error);
    });
  } else {
    loadVoice(audio, url).then((buffer) => {
      if (settled) return;
      if (!startable()) {
        settle(null);
        return;
      }
      if (playing) finish(playing, null);
      const voice: Voice = { voiceId, sound: bufferSound(audio, buffer, () => voice), done: settle };
      begin(voice);
    }).catch(failed);
  }
  return () => {
    if (own) finish(own, null);
    loading?.cancel();
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
    if (playing) gainOf(playing.sound).gain.value = volume;
    // Until the page's audio runs, the reader's next gesture makes or wakes it (a voice starts with no gesture of its own).
    wantAudio("voice", enabled);
    wantVoiceElement(enabled && settings.rate !== 1);
  }, [enabled, volume]);
}

/** Sets the rate of every voice (on the scale), the voice playing included. */
function applyRate(rate: number) {
  const next = clampVoiceRate(rate);
  if (next === settings.rate) return;
  settings.rate = next;
  wantVoiceElement(settings.enabled && next !== 1);
  const voice = playing;
  if (!voice) return;
  if (voice.sound.kind === "element") {
    setVoiceElementRate(voice.sound.media.element, next);
    guardStall(voice);
  } else if (next !== 1) handOver(voice);
}

/**
 * The rate every line's voice plays at: Debug's speed of the voices while Debug mode is on, 1 with it off
 * (src/audio/voice-rate.ts effectiveVoiceRate; GameApp, Debug's 音と演出の見本). A new rate applies to the voice playing
 * at once; the voices go back to 1× when the screen that set it goes.
 */
export function useVoiceRate(rate: number): void {
  useEffect(() => {
    applyRate(rate);
  }, [rate]);
  useEffect(() => () => applyRate(1), []);
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
