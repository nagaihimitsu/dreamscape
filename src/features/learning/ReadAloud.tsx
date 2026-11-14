import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { duckAmbienceForSpeech } from "../../audio/ambience";
import { audioWanted, madeAudioContext, onAudioStateChange } from "../../audio/audio-context";
import { duckMusicForSpeech } from "../../audio/bgm";
import { createSpeechAudio } from "../../audio/speech-audio";
import { Icon } from "../../components/icons";
import { stopLineVoice } from "../../components/useVoice";
import { AUTO_READ_DELAY_MS, readAloudLabel } from "./read-aloud";
import { createSpeechReader } from "./read-aloud-speech";

// 「英語を読み上げるボタン」 (2026-11-11 user decision): the buttons over the browser's speech (read-aloud-speech.ts: one
// reading at a time). While it reads, the page's sound gives way (src/audio/speech-audio.ts, 2026-11-13): the music and
// the ambience lowered as for a line's voice, a voice playing stopped; after it, they play on with no tap, the page's
// audio woken where the speech stopped it (iOS).
const sound = createSpeechAudio({
  audio: madeAudioContext,
  wanted: audioWanted,
  hidden: () => document.hidden,
  duck: (reading) => {
    duckMusicForSpeech(reading);
    duckAmbienceForSpeech(reading);
  },
  stopVoice: stopLineVoice,
  now: () => performance.now(),
});
onAudioStateChange(sound.stateChanged);
const speech = createSpeechReader(() => window, sound);

/**
 * The read-aloud buttons of one screen (`enabled`: the setting is on and the browser can read) and its automatic reading
 * (`auto`: 「問題が出たら英語を自動で読み上げる」 is on, useAutoReadAloud). What one of them reads stops when it is pressed
 * again, when another button reads, when `scope` changes (another question, or the quiz card gone), when the screen goes,
 * when the page is hidden, when either setting changes, and when the screen calls stop() (a quiz's answer). Pressing never
 * answers, selects or advances anything.
 */
export function useReadAloud(enabled: boolean, scope: string, auto = false) {
  const owner = `${useId()}|`;
  const current = useSyncExternalStore(speech.subscribe, speech.key, () => null);
  const active = enabled || auto;
  useEffect(() => {
    if (!active) return;
    // Chrome loads its voices on the first ask: ask early, so that the first reading can choose an English voice.
    window.speechSynthesis.getVoices();
    const onHidden = () => {
      if (document.hidden) speech.stop(owner);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      speech.stop(owner);
    };
  }, [active, enabled, auto, scope, owner]);
  return {
    enabled,
    isReading: (part: string) => current === owner + part,
    toggle: (part: string, text: string) => {
      if (speech.key() === owner + part) speech.stop();
      else speech.start(owner + part, text);
    },
    /** Reads `text` as `part` (its button, when shown, says so), unless that part is being read already. */
    read: (part: string, text: string) => {
      if (speech.key() !== owner + part) speech.start(owner + part, text);
    },
    /** Stops what this screen's buttons or its automatic reading are reading. */
    stop: () => speech.stop(owner),
  };
}
export type ReadAloud = ReturnType<typeof useReadAloud>;

/**
 * 「問題が出たら英語を自動で読み上げる」 (2026-11-14 user decision): reads `text` as `part` once for each `key` (a question
 * shown in a run; null: nothing due), AUTO_READ_DELAY_MS after it shows, so that the card lands first. Not read when the
 * key goes before then (answered, the card gone), when the page is hidden, or before the page is primed (its first tap,
 * primeSpeechOnGesture; iOS Safari would stay silent). A key that went unread is not read later.
 */
export function useAutoReadAloud(reader: ReadAloud, key: string | null, part: string, text: string) {
  const latest = useRef({ reader, part, text });
  latest.current = { reader, part, text };
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (key === null || done.current === key) return;
    const timer = window.setTimeout(() => {
      done.current = key;
      if (document.hidden || !speech.primed()) return;
      latest.current.reader.read(latest.current.part, latest.current.text);
    }, AUTO_READ_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key]);
}

/**
 * Primes the page's speech at its next tap or key (click, touchend or keydown, in their own handlers: iOS Safari's
 * gesture), once, for the automatic reading. Returns the way to stop waiting (the setting turned off).
 */
export function primeSpeechOnGesture(): () => void {
  if (speech.primed()) return () => undefined;
  const events = ["click", "touchend", "keydown"] as const;
  const stop = () => {
    for (const type of events) document.removeEventListener(type, onGesture, true);
  };
  function onGesture() {
    stop();
    speech.prime();
  }
  for (const type of events) document.addEventListener(type, onGesture, { capture: true, passive: true });
  return stop;
}

/**
 * The speaker button beside an English text (`part`: "question" or an option's mark): pressed, it reads `text` aloud; pressed
 * while reading, it stops (aria-pressed says which). A button of its own, never inside another one. Nothing without the setting.
 */
export function ReadAloudButton({ reader, part, text }: { reader: ReadAloud; part: string; text: string }) {
  if (!reader.enabled) return null;
  return (
    <button
      type="button"
      className="read-aloud"
      data-testid={`read-aloud-${part}`}
      aria-label={readAloudLabel(part)}
      aria-pressed={reader.isReading(part)}
      onClick={() => reader.toggle(part, text)}
    >
      <Icon name="speaker" />
    </button>
  );
}
