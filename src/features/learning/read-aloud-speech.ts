import type { SpeechAudio } from "../../audio/speech-audio";
import { pickEnglishVoice, READ_ALOUD_LANG, readAloudText } from "./read-aloud";

// 「英語を読み上げるボタン」 (2026-11-11 user decision): the browser's speech behind the buttons (ReadAloud.tsx). The page
// reads one utterance at a time (speechSynthesis has one queue), held here with the key of the button that started it;
// holding it also keeps Chrome from collecting it before its end event. The page's sound hears when a reading starts and
// when it is over (src/audio/speech-audio.ts, 2026-11-13: the music lowered while it reads, and playing on after it).
// The automatic reading of a quiz's question (2026-11-14 user decision, ReadAloud.tsx useAutoReadAloud) starts with no
// press: iOS Safari speaks with no gesture only once the page has spoken in a gesture, so a tap "primes" the speech (an
// empty, silent utterance) and the automatic reading waits until it is primed. iOS ignores a speak() it does not allow
// without a word or an event (a swipe's or a long press's touchend is no gesture there), so an automatic reading that
// has not started within UNPROMPTED_START_MS is given up: the sound comes back and the page waits to be primed again.

/** What the reader uses of an utterance (SpeechSynthesisUtterance). */
export type UtteranceLike = {
  lang: string;
  voice: SpeechSynthesisVoice | null;
  volume?: number;
  addEventListener(type: "start" | "end" | "error", listener: () => void): void;
};

/** How long an automatic reading (one started with no gesture) may take to start before it is given up (milliseconds). */
export const UNPROMPTED_START_MS = 3000;

/** What the reader uses of the browser's speech: window's, or a test's fakes. */
export type SpeechScope = {
  speechSynthesis: {
    readonly speaking: boolean;
    readonly pending: boolean;
    speak(utterance: UtteranceLike): void;
    cancel(): void;
    getVoices(): SpeechSynthesisVoice[];
  };
  SpeechSynthesisUtterance: new (text: string) => UtteranceLike;
};

/** The page's one reading, as the buttons use it. */
export type SpeechReader = {
  /** The key of the button whose English is being read, or null. */
  key(): string | null;
  /** Hears every change of what is being read; returns the way to stop hearing it. */
  subscribe(listener: () => void): () => void;
  /**
   * Reads `text` in English, instead of anything being read. Called in the press's own click handler: iOS Safari speaks
   * only from a user's gesture. `unprompted`: the automatic reading, started with no gesture (only once primed()); not
   * started within UNPROMPTED_START_MS, it is given up and the page is no longer primed.
   */
  start(key: string, text: string, options?: { unprompted?: boolean }): void;
  /** Stops what is being read, if a button whose key starts with `prefix` started it. */
  stop(prefix?: string): void;
  /**
   * Whether the page has spoken in a gesture (a press's reading, or prime()): iOS Safari then lets a reading start with
   * no gesture. Until then the automatic reading does not start (on iOS it would stay silent and never end).
   */
  primed(): boolean;
  /**
   * Speaks an empty, silent utterance, once, unless something is being read: called in a gesture's own handler (the
   * page's first tap), so that later readings may start with no gesture. Never a reading: no key, no lowered music.
   */
  prime(): void;
};

/** The reader over the browser's speech `scope` (read at each use), telling the page's sound `sound` when it reads. */
export function createSpeechReader(scope: () => SpeechScope, sound: Pick<SpeechAudio, "reading" | "ended">): SpeechReader {
  let reading: { key: string; utterance: UtteranceLike } | null = null;
  let primed = false;
  const listeners = new Set<() => void>();
  function setReading(next: typeof reading) {
    const was = reading !== null;
    reading = next;
    if (was !== (next !== null)) sound.reading(next !== null);
    for (const listener of listeners) listener();
  }

  return {
    key: () => reading?.key ?? null,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start(key, text, { unprompted = false } = {}) {
      const said = readAloudText(text);
      if (!said) return;
      // A press's reading is spoken in its gesture: the page is primed after it (the automatic reading checks first).
      if (!unprompted) primed = true;
      const { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance } = scope();
      const utterance = new Utterance(said);
      utterance.lang = READ_ALOUD_LANG;
      const voice = pickEnglishVoice(synth.getVoices());
      if (voice) utterance.voice = voice;
      // Its end or failure is the reading's end. One cut off (by the next press, a stop) may end after the next has
      // started: it only tells the page's sound that the speech has let go of it.
      const done = () => {
        if (reading?.utterance === utterance) setReading(null);
        else sound.ended();
      };
      utterance.addEventListener("end", done);
      utterance.addEventListener("error", done);
      let started = false;
      utterance.addEventListener("start", () => {
        started = true;
      });
      const cut = synth.speaking || synth.pending;
      // Held before the one read is cancelled, so that the cancelled one's end does not end this reading.
      setReading({ key, utterance });
      if (cut) synth.cancel();
      try {
        synth.speak(utterance);
      } catch {
        done();
        return;
      }
      if (!unprompted) return;
      setTimeout(() => {
        if (started || reading?.utterance !== utterance) return;
        // Not started: the browser did not let it speak with no gesture (iOS, no event at all). The sound comes back, and
        // the page waits for a tap to prime it again.
        primed = false;
        setReading(null);
        synth.cancel();
      }, UNPROMPTED_START_MS);
    },
    stop(prefix = "") {
      if (!reading?.key.startsWith(prefix)) return;
      setReading(null);
      scope().speechSynthesis.cancel();
    },
    primed: () => primed,
    prime() {
      if (primed) return;
      primed = true;
      try {
        const { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance } = scope();
        // Something is being read: it was started in a gesture, so the page is primed already.
        if (synth.speaking || synth.pending) return;
        const utterance = new Utterance("");
        utterance.volume = 0;
        // iOS may hand the sound to the speech even for this: its end lets the page's audio be woken (speech-audio.ts).
        const done = () => sound.ended();
        utterance.addEventListener("end", done);
        utterance.addEventListener("error", done);
        synth.speak(utterance);
        sound.ended();
      } catch {
        // A browser whose speech fails here reads nothing automatically either: its readings start from presses.
      }
    },
  };
}
