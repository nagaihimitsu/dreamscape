import type { SpeechAudio } from "../../audio/speech-audio";
import { pickEnglishVoice, READ_ALOUD_LANG, readAloudText } from "./read-aloud";

// 「英語を読み上げるボタン」 (2026-11-11 user decision): the browser's speech behind the buttons (ReadAloud.tsx). The page
// reads one utterance at a time (speechSynthesis has one queue), held here with the key of the button that started it;
// holding it also keeps Chrome from collecting it before its end event. The page's sound hears when a reading starts and
// when it is over (src/audio/speech-audio.ts, 2026-11-13: the music lowered while it reads, and playing on after it).

/** What the reader uses of an utterance (SpeechSynthesisUtterance). */
export type UtteranceLike = {
  lang: string;
  voice: SpeechSynthesisVoice | null;
  addEventListener(type: "end" | "error", listener: () => void): void;
};

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
   * only from a user's gesture.
   */
  start(key: string, text: string): void;
  /** Stops what is being read, if a button whose key starts with `prefix` started it. */
  stop(prefix?: string): void;
};

/** The reader over the browser's speech `scope` (read at each use), telling the page's sound `sound` when it reads. */
export function createSpeechReader(scope: () => SpeechScope, sound: Pick<SpeechAudio, "reading" | "ended">): SpeechReader {
  let reading: { key: string; utterance: UtteranceLike } | null = null;
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
    start(key, text) {
      const said = readAloudText(text);
      if (!said) return;
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
      const cut = synth.speaking || synth.pending;
      // Held before the one read is cancelled, so that the cancelled one's end does not end this reading.
      setReading({ key, utterance });
      if (cut) synth.cancel();
      try {
        synth.speak(utterance);
      } catch {
        done();
      }
    },
    stop(prefix = "") {
      if (!reading?.key.startsWith(prefix)) return;
      setReading(null);
      scope().speechSynthesis.cancel();
    },
  };
}
