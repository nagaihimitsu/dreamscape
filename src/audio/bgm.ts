import { useEffect } from "react";
import musicJson from "../content/generated/music.json";
import { musicDataSchema, musicPath, type MusicData, type MusicPlay } from "../content/music";
import { AUDIO_GESTURES, audioContext, onAudioStateChange, onPageHidden, runningAudioContext, wantAudio } from "./audio-context";
import type { MusicDuck, SceneMusic } from "./scene-music";

// The background music (2026-11-12): the track the screen asks for (src/audio/scene-music.ts) streamed from
// `assets/bgm/<ID>.mp3` by one of two audio elements (decks; looped, read as they play: no whole track is decoded) on the
// page's AudioContext (audio-context.ts): each deck → its own gain (its fade and the track's volume) → one low-pass
// filter (the quiz's muffle) → the lowering (quiz, quiet, a ride, a voice) → ⚙設定's 「BGMの大きさ」 → the speakers.
// The gains do the volume (iOS ignores an element's own). A new track crossfades over 1.5 s; the same track goes on;
// the last few tracks' positions are kept, so a track comes back where it stopped. iOS lets an element play by itself
// only after it has played in a user's gesture: the reader's first gesture starts both decks (an idle one on a short
// silence). Nothing plays while the page is hidden, the page's audio is suspended or 「BGMを流す」 is off, and nothing
// is fetched while it is off. Presentation only: a track that cannot load or play is skipped in silence and the game
// goes on; the music tells nothing (no relationship value, no answer).

const EMPTY_DATA: MusicData = { schemaVersion: 1, sources: [], tracks: [], root: null, journeys: {} };

/** The tracks and where they play (content:build writes the file, scripts/music-files.ts); unreadable, nothing plays. */
function readMusicData(): MusicData {
  const parsed = musicDataSchema.safeParse(musicJson as unknown);
  if (!parsed.success && import.meta.env.DEV) console.warn("BGMの一覧を読めませんでした", parsed.error);
  return parsed.success ? parsed.data : EMPTY_DATA;
}
const data = readMusicData();
/** Every registered track's volume against the others. */
const volumes = new Map(data.tracks.map((track) => [track.id, track.volume]));

/** The tracks the journey `journeyId` plays where (the shared ones when the build has no entry for it), or null without music. */
export function journeyMusicPlay(journeyId: string): MusicPlay | null {
  return Object.hasOwn(data.journeys, journeyId) ? data.journeys[journeyId] : data.root;
}

/** A track change's crossfade, and the fade of silence (`# bgm: stop`, a screen without music). */
const CROSSFADE_S = 1.5;
/** The fade when 「BGMを流す」 is turned off. */
const OFF_FADE_S = 0.5;
/** How many tracks' positions are kept (the most recently stopped). */
const REMEMBERED_TRACKS = 6;
/** The level of each lowering, and a voice's (multiplied with it). */
const DUCK_LEVELS: Readonly<Record<MusicDuck, number>> = { none: 1, quiz: 0.35, quiet: 0.5, travel: 0.6 };
const VOICE_LEVEL = 0.5;
/** The low-pass filter open, and muffled for a quiz ("behind a wall"). */
const OPEN_HZ = 20_000;
const QUIZ_HZ = 900;
/** How long a lowering takes down and back, and a voice's. */
const DUCK_DOWN_S = 1;
const DUCK_UP_S = 1.5;
const VOICE_DOWN_S = 0.3;
const VOICE_UP_S = 0.8;

type Deck = {
  element: HTMLAudioElement;
  /** Its gain on the page's AudioContext (made with the graph). */
  gain: GainNode | null;
  /** The track its element holds, or null (nothing, or the short silence that unlocks it). */
  track: string | null;
  /** It has played once (iOS lets it play by itself afterwards). */
  unlocked: boolean;
  /** Pauses it once its fade-out has ended. */
  pauseTimer: number | undefined;
  /** Counts its loads (a position is set on the load it was meant for). */
  loads: number;
};
type Graph = { audio: AudioContext; filter: BiquadFilterNode; level: GainNode; bus: GainNode };

/** ⚙設定's 「BGMを流す」 and 「BGMの大きさ」 (GameApp: useBgmSettings). Off until the settings are read. */
const settings = { enabled: false, volume: 0.4 };
/** The track the screen asks for (null: silence), how it is lowered, and whether a line's voice plays. */
let wanted: string | null = null;
let duck: MusicDuck = "none";
let voice = false;
let decks: Deck[] | null = null;
let graph: Graph | null = null;
let graphFailed = false;
/** The deck that plays (or fades in) the wanted track. */
let active: Deck | null = null;
/** Where each recently stopped track was (seconds), the most recent last. */
const positions = new Map<string, number>();
let gestureListening = false;
let silence: string | undefined;
let warned = false;

/** The two decks, made once (none where the page has no audio element). */
function ensureDecks(): Deck[] | null {
  if (decks) return decks;
  if (typeof Audio === "undefined" || typeof document === "undefined") return null;
  decks = [0, 1].map((): Deck => {
    const element = new Audio();
    element.loop = true;
    element.preload = "auto";
    const deck: Deck = { element, gain: null, track: null, unlocked: false, pauseTimer: undefined, loads: 0 };
    element.addEventListener("error", () => skipFailed(deck));
    return deck;
  });
  onPageHidden(pauseAll);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) apply();
  });
  return decks;
}

/**
 * The decks' way to the speakers, made once: in a user's gesture (`inGesture`, which may make the page's audio) or once
 * the page's audio runs (a context made earlier would not start). An element is never played before it is connected
 * (it would play at its own full volume).
 */
function ensureGraph(inGesture: boolean): Graph | null {
  if (graph || graphFailed) return graph;
  const pair = ensureDecks();
  const audio = inGesture ? audioContext() : runningAudioContext();
  if (!pair || !audio) return null;
  try {
    const bus = audio.createGain();
    bus.gain.value = settings.volume;
    bus.connect(audio.destination);
    const level = audio.createGain();
    level.gain.value = levelOf();
    level.connect(bus);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = duck === "quiz" ? QUIZ_HZ : OPEN_HZ;
    filter.Q.value = 0;
    filter.connect(level);
    for (const deck of pair) {
      const gain = audio.createGain();
      gain.gain.value = 0;
      gain.connect(filter);
      audio.createMediaElementSource(deck.element).connect(gain);
      deck.gain = gain;
    }
    graph = { audio, filter, level, bus };
  } catch (error) {
    graphFailed = true;
    if (import.meta.env.DEV) console.warn("BGMを流す準備ができませんでした", error);
  }
  return graph;
}

/** The lowering's level now, with a voice's. */
function levelOf(): number {
  return DUCK_LEVELS[duck] * (voice ? VOICE_LEVEL : 1);
}

/** Plays an element, never throwing (an old browser's play() may throw instead of refusing). */
function start(element: HTMLAudioElement): Promise<void> {
  try {
    return element.play();
  } catch (error) {
    return Promise.reject(error);
  }
}

/** A short silence (a WAV in memory) that an idle deck plays once in a gesture, so that iOS lets it play later. */
function silenceUrl(): string {
  if (silence) return silence;
  const samples = 800;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => {
    for (let index = 0; index < value.length; index++) bytes[at + index] = value.charCodeAt(index);
  };
  // 8-bit mono PCM at 8 kHz: 0.1 s at the middle value (silence).
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  silence = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
  return silence;
}

/** Ramps a deck's gain from where it is (or `from`) to `to` in `seconds`. */
function ramp(param: AudioParam, to: number, seconds: number, from?: number) {
  if (!graph) return;
  const now = graph.audio.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(from ?? param.value, now);
  param.linearRampToValueAtTime(to, now + seconds);
}

/** Keeps where the deck's track is, to come back there (the REMEMBERED_TRACKS most recent). */
function remember(deck: Deck) {
  if (!deck.track) return;
  const time = deck.element.currentTime;
  positions.delete(deck.track);
  if (Number.isFinite(time) && time > 0) positions.set(deck.track, time);
  for (const key of positions.keys()) {
    if (positions.size <= REMEMBERED_TRACKS) break;
    positions.delete(key);
  }
}

/** Puts the track `id` on the deck, from where it was last stopped. */
function load(deck: Deck, id: string) {
  remember(deck);
  window.clearTimeout(deck.pauseTimer);
  deck.track = id;
  const loading = ++deck.loads;
  const { element } = deck;
  element.src = `${import.meta.env.BASE_URL}${musicPath(id)}`;
  const position = positions.get(id);
  if (position === undefined) return;
  element.addEventListener("loadedmetadata", () => {
    if (deck.loads === loading && Number.isFinite(element.duration) && position < element.duration) element.currentTime = position;
  }, { once: true });
}

/** Plays the deck (in silence until its gain rises); refused (no gesture yet, iOS), it is tried again at the next gesture. */
function play(deck: Deck) {
  if (!graph || document.hidden || !settings.enabled || !deck.element.paused) return;
  start(deck.element).then(() => {
    deck.unlocked = true;
  }, () => {
    if (deck === active && settings.enabled) listenForGesture(true);
  });
}

/** Lets an idle deck play later (iOS): plays it once, on a short silence when it holds no track, and pauses it. */
function unlock(deck: Deck) {
  if (!deck.element.paused) return;
  if (!deck.track) deck.element.src = silenceUrl();
  start(deck.element).then(() => {
    deck.unlocked = true;
    if (deck !== active) deck.element.pause();
  }, () => listenForGesture(true));
}

function fadeIn(deck: Deck, seconds: number, from?: number) {
  window.clearTimeout(deck.pauseTimer);
  if (deck.gain && deck.track) ramp(deck.gain.gain, volumes.get(deck.track) ?? 1, seconds, from);
}

/** Fades the deck out and pauses it, keeping its position, unless it is the active deck again by then. */
function fadeOut(deck: Deck, seconds: number) {
  if (deck.gain) ramp(deck.gain.gain, 0, seconds);
  window.clearTimeout(deck.pauseTimer);
  deck.pauseTimer = window.setTimeout(() => {
    if (deck === active) return;
    remember(deck);
    deck.element.pause();
  }, seconds * 1000 + 100);
}

/** Pauses both decks (the page hidden, its audio suspended); the active one plays again with apply. */
function pauseAll() {
  for (const deck of decks ?? []) {
    window.clearTimeout(deck.pauseTimer);
    if (deck !== active) remember(deck);
    deck.element.pause();
  }
}

/** A track that cannot load or play is skipped in silence (asked for again, it is loaded again). */
function skipFailed(deck: Deck) {
  if (!deck.track) return;
  if (import.meta.env.DEV && !warned) {
    warned = true;
    console.warn(`BGMを再生できませんでした: ${deck.track}`, deck.element.error);
  }
  positions.delete(deck.track);
  deck.track = null;
  if (deck === active) active = null;
}

/** Makes the decks play what the screen asks for: the wanted track (crossfaded in, or going on), or silence. */
function apply() {
  if (!settings.enabled) return;
  const pair = ensureDecks();
  if (!pair) return;
  const current = ensureGraph(false);
  // Until the reader's first gesture (or the page's audio runs), nothing can play.
  if (!current) {
    if (wanted !== null && !graphFailed) listenForGesture(true);
    return;
  }
  if (pair.some((deck) => !deck.unlocked)) listenForGesture(true);
  if (wanted === null) {
    const stopping = active;
    active = null;
    if (stopping) fadeOut(stopping, CROSSFADE_S);
    return;
  }
  if (active?.track === wanted) {
    fadeIn(active, CROSSFADE_S);
    play(active);
    return;
  }
  const previous = active;
  // The other deck may still hold the track while it fades out (a quick return): it comes back from where it is.
  const next = pair.find((deck) => deck.track === wanted) ?? pair.find((deck) => deck !== previous && deck.element.paused) ??
    pair.find((deck) => deck !== previous) ?? pair[0];
  const fresh = next.track !== wanted;
  if (fresh) load(next, wanted);
  active = next;
  if (previous) fadeOut(previous, CROSSFADE_S);
  fadeIn(next, CROSSFADE_S, fresh ? 0 : undefined);
  play(next);
}

/** The reader's gesture: makes or wakes the page's audio and the graph, plays the wanted track and unlocks the idle deck. */
function onGesture() {
  const pair = ensureDecks();
  const current = settings.enabled ? ensureGraph(true) : null;
  if (!pair || !current) {
    listenForGesture(false);
    return;
  }
  if (current.audio.state !== "running") void current.audio.resume().catch(() => undefined);
  if (!active || active.element.paused) apply();
  for (const deck of pair) if (!deck.unlocked && deck !== active) unlock(deck);
  listenForGesture(pair.some((deck) => !deck.unlocked));
}

function listenForGesture(on: boolean) {
  if (on === gestureListening || typeof document === "undefined") return;
  gestureListening = on;
  for (const type of AUDIO_GESTURES) {
    if (on) document.addEventListener(type, onGesture, true);
    else document.removeEventListener(type, onGesture, true);
  }
}

/** Ramps the lowering (and the quiz's muffle) to the current level in `seconds`. */
function applyLevel(seconds: number) {
  if (!graph) return;
  const now = graph.audio.currentTime;
  const level = graph.level.gain;
  level.cancelScheduledValues(now);
  level.setTargetAtTime(levelOf(), now, seconds / 3);
  const frequency = graph.filter.frequency;
  frequency.cancelScheduledValues(now);
  frequency.setTargetAtTime(duck === "quiz" ? QUIZ_HZ : OPEN_HZ, now, seconds / 3);
}

onAudioStateChange((state) => {
  if (state === "running") apply();
  else pauseAll();
});

/**
 * Sends the screen's music (scene-music.ts sceneMusic) to the player: a new track crossfades in, the same one goes on,
 * null fades to silence, undefined keeps what plays; the lowering ramps to its level.
 */
export function playSceneMusic(target: SceneMusic): void {
  if (target.duck !== duck) {
    const down = DUCK_LEVELS[target.duck] < DUCK_LEVELS[duck] || target.duck === "quiz";
    duck = target.duck;
    applyLevel(down ? DUCK_DOWN_S : DUCK_UP_S);
  }
  if (target.track === undefined || target.track === wanted) return;
  wanted = target.track;
  apply();
}

/** A line's voice starts or ends (src/components/useVoice.ts): the music is halved while it plays. */
export function duckForVoice(playing: boolean): void {
  if (playing === voice) return;
  voice = playing;
  applyLevel(playing ? VOICE_DOWN_S : VOICE_UP_S);
}

/**
 * Applies ⚙設定's 「BGMを流す」 (`enabled`) and 「BGMの大きさ」 (`volume`, 0 to 1): off fades the music out and pauses it
 * (nothing is fetched while it is off); on plays the screen's track again; a new volume applies at once. Called by GameApp.
 */
export function useBgmSettings(enabled: boolean, volume: number): void {
  useEffect(() => {
    const was = settings.enabled;
    settings.enabled = enabled;
    settings.volume = volume;
    if (graph) {
      const now = graph.audio.currentTime;
      graph.bus.gain.cancelScheduledValues(now);
      graph.bus.gain.setTargetAtTime(volume, now, 0.03);
    }
    // Until the page's audio runs, the reader's next gesture makes or wakes it.
    wantAudio("bgm", enabled);
    if (!enabled) {
      listenForGesture(false);
      const stopping = active;
      active = null;
      for (const deck of decks ?? []) if (deck === stopping || !deck.element.paused) fadeOut(deck, OFF_FADE_S);
    } else if (!was) apply();
  }, [enabled, volume]);
}

/** Plays the screen's music (GameApp: sceneMusic of what it shows), as it changes. */
export function useSceneMusic(target: SceneMusic): void {
  const { track, duck: lowered } = target;
  useEffect(() => {
    playSceneMusic({ track, duck: lowered });
  }, [track, lowered]);
}
