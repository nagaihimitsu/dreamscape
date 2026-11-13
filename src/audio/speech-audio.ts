// English read aloud and the page's sound (2026-11-13 user decision): while the browser's speech reads (the read-aloud
// buttons, src/features/learning/ReadAloud.tsx), the music and the ambience are lowered as for a line's voice
// (loop-player.ts: the same level and fades) and a line's voice playing stops (two voices never talk at once); when the
// reading ends, is stopped or fails, the lowering lifts and the music plays on by itself. iOS Safari gives the speech the
// sound: the page's AudioContext stops running while it reads ("interrupted" since Safari 16.4, "suspended" before) and
// every part stops (audio-context.ts onAudioStateChange). So as a reading is over, the page's audio is asked to run again
// with no gesture: at once, again at the utterance's own end event (one cut off ends a little later), and whenever it
// stops running within AFTER_SPEECH_MS after (the speech letting go of the sound); running again, the music plays on
// (loop-player.ts). A browser that still refuses leaves it to the reader's next gesture, as before. Never while a
// reading goes on (taking the sound back could cut the speech), with the page hidden, or when no part wants the audio.
// Safari's navigator.audioSession is not set: its mixing type ("ambient") obeys the ring/silent switch, so a phone on
// silent would lose the music for the reading, and whether it keeps the speech from taking the sound is unknown.
// The rules are pure functions; createSpeechAudio wires them to the page with what it is given (ReadAloud.tsx).

/** What lowers the music and the ambience as a voice does: a line's voice playing, English being read aloud. */
export type VoiceDuckState = { voice: boolean; reading: boolean };

/** Whether the music and the ambience are lowered as for a voice now: while a line's voice plays or English is read aloud. */
export function voiceDucked({ voice, reading }: VoiceDuckState): boolean {
  return voice || reading;
}

/** How long after a reading the page's audio, stopping, is asked to run again by itself (milliseconds). */
export const AFTER_SPEECH_MS = 5000;

/** What the wake after a reading reads. */
export type SpeechWakeState = {
  /** The page's AudioContext's state (Safari's "interrupted" included), undefined before it is made. */
  state: string | undefined;
  /** A part wants the page's audio (its setting is on: audio-context.ts wantAudio). */
  wanted: boolean;
  /** The page is hidden (another tab, the phone locked). */
  hidden: boolean;
  /** English is being read aloud. */
  reading: boolean;
  /** Milliseconds since a reading was last over, or its utterance ended (null: none yet). */
  sinceSpeechMs: number | null;
};

/**
 * Whether to ask the page's audio to run again with no gesture: it is suspended or interrupted, a part wants it, the
 * page shows, nothing is being read and a reading was over at most AFTER_SPEECH_MS ago.
 */
export function shouldTryResume({ state, wanted, hidden, reading, sinceSpeechMs }: SpeechWakeState): boolean {
  if (state !== "suspended" && state !== "interrupted") return false;
  if (!wanted || hidden || reading || sinceSpeechMs === null) return false;
  return sinceSpeechMs >= 0 && sinceSpeechMs <= AFTER_SPEECH_MS;
}

/** What the wiring needs of the page (ReadAloud.tsx gives the real ones; the tests give fakes). */
export type SpeechAudioDeps = {
  /** The page's AudioContext when it has been made (none is made for this). */
  audio: () => { readonly state: string; resume(): Promise<void> } | undefined;
  /** A part wants the page's audio. */
  wanted: () => boolean;
  hidden: () => boolean;
  /** Lowers the music and the ambience as for a voice (true); lifts it and lets them play on where the speech stopped them (false). */
  duck: (reading: boolean) => void;
  /** Stops a line's voice playing, if one is. */
  stopVoice: () => void;
  /** The time in milliseconds (performance.now()). */
  now: () => number;
};

/** What the read-aloud speech tells the page's sound. */
export type SpeechAudio = {
  /** A reading starts (true) or is over (false: it ended, was stopped or failed). */
  reading(on: boolean): void;
  /** An utterance cut off before its end (the next press, a stop) has ended: the speech lets go of the sound now. */
  ended(): void;
  /** The page's audio state changed (audio-context.ts onAudioStateChange). */
  stateChanged(): void;
};

/** Wires the reading to the page's sound: lowering while it reads, a voice stopped as it starts, the audio woken after it. */
export function createSpeechAudio(deps: SpeechAudioDeps): SpeechAudio {
  let reading = false;
  let overAt: number | null = null;

  /** Asks the page's audio to run again when the rule says so; a refusal is left to the next gesture. */
  function wake() {
    const audio = deps.audio();
    const sinceSpeechMs = overAt === null ? null : deps.now() - overAt;
    if (!audio || !shouldTryResume({ state: audio.state, wanted: deps.wanted(), hidden: deps.hidden(), reading, sinceSpeechMs })) return;
    try {
      void audio.resume().catch(() => undefined);
    } catch {
      // An old browser's resume() may throw instead of refusing.
    }
  }

  /** The speech is over (or has let go of the sound): the lowering lifts, the music plays on, the audio is woken. */
  function over() {
    overAt = deps.now();
    deps.duck(false);
    wake();
  }

  return {
    reading(on) {
      if (on === reading) return;
      reading = on;
      if (!on) {
        over();
        return;
      }
      deps.stopVoice();
      deps.duck(true);
    },
    ended() {
      // The next reading has started: it holds the sound (and the lowering) now.
      if (!reading) over();
    },
    stateChanged: wake,
  };
}
