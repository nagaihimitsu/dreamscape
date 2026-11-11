import { useEffect, useId, useSyncExternalStore } from "react";
import { Icon } from "../../components/icons";
import { pickEnglishVoice, READ_ALOUD_LANG, readAloudLabel, readAloudText } from "./read-aloud";

// 「英語を読み上げるボタン」 (2026-11-11 user decision): the browser's speech behind the buttons. The page reads one
// utterance at a time (speechSynthesis has one queue), held here with the key of the button that started it; holding
// it also keeps Chrome from collecting it before its end event.
let reading: { key: string; utterance: SpeechSynthesisUtterance } | null = null;
const listeners = new Set<() => void>();
function setReading(next: typeof reading) {
  reading = next;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const readingKey = () => reading?.key ?? null;

/** Stops what is being read, if a button whose key starts with `prefix` started it. */
function stopReading(prefix = "") {
  if (!reading?.key.startsWith(prefix)) return;
  setReading(null);
  window.speechSynthesis.cancel();
}

/**
 * Reads `text` in English, instead of anything being read. Called in the press's own click handler: iOS Safari speaks
 * only from a user's gesture.
 */
function startReading(key: string, text: string) {
  const said = readAloudText(text);
  if (!said) return;
  const synth = window.speechSynthesis;
  const utterance = new window.SpeechSynthesisUtterance(said);
  utterance.lang = READ_ALOUD_LANG;
  const voice = pickEnglishVoice(synth.getVoices());
  if (voice) utterance.voice = voice;
  // One cut off (by the next press, a stop) may end after the next has started: only the one being read clears it.
  const done = () => {
    if (reading?.utterance === utterance) setReading(null);
  };
  utterance.addEventListener("end", done);
  utterance.addEventListener("error", done);
  if (synth.speaking || synth.pending) synth.cancel();
  setReading({ key, utterance });
  try {
    synth.speak(utterance);
  } catch {
    done();
  }
}

/**
 * The read-aloud buttons of one screen (`enabled`: the setting is on and the browser can read). What one of them reads
 * stops when it is pressed again, when another button reads, when `scope` changes (another question, or the quiz card
 * gone), when the screen goes, when the page is hidden and when the setting is turned off. Pressing never answers,
 * selects or advances anything.
 */
export function useReadAloud(enabled: boolean, scope: string) {
  const owner = `${useId()}|`;
  const current = useSyncExternalStore(subscribe, readingKey, () => null);
  useEffect(() => {
    if (!enabled) return;
    // Chrome loads its voices on the first ask: ask early, so that the first press can choose an English voice.
    window.speechSynthesis.getVoices();
    const onHidden = () => {
      if (document.hidden) stopReading(owner);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      stopReading(owner);
    };
  }, [enabled, scope, owner]);
  return {
    enabled,
    isReading: (part: string) => current === owner + part,
    toggle: (part: string, text: string) => {
      if (reading?.key === owner + part) stopReading();
      else startReading(owner + part, text);
    },
  };
}
export type ReadAloud = ReturnType<typeof useReadAloud>;

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
