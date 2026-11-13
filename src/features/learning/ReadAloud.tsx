import { useEffect, useId, useSyncExternalStore } from "react";
import { duckAmbienceForSpeech } from "../../audio/ambience";
import { audioWanted, madeAudioContext, onAudioStateChange } from "../../audio/audio-context";
import { duckMusicForSpeech } from "../../audio/bgm";
import { createSpeechAudio } from "../../audio/speech-audio";
import { Icon } from "../../components/icons";
import { stopLineVoice } from "../../components/useVoice";
import { readAloudLabel } from "./read-aloud";
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
 * The read-aloud buttons of one screen (`enabled`: the setting is on and the browser can read). What one of them reads
 * stops when it is pressed again, when another button reads, when `scope` changes (another question, or the quiz card
 * gone), when the screen goes, when the page is hidden and when the setting is turned off. Pressing never answers,
 * selects or advances anything.
 */
export function useReadAloud(enabled: boolean, scope: string) {
  const owner = `${useId()}|`;
  const current = useSyncExternalStore(speech.subscribe, speech.key, () => null);
  useEffect(() => {
    if (!enabled) return;
    // Chrome loads its voices on the first ask: ask early, so that the first press can choose an English voice.
    window.speechSynthesis.getVoices();
    const onHidden = () => {
      if (document.hidden) speech.stop(owner);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      speech.stop(owner);
    };
  }, [enabled, scope, owner]);
  return {
    enabled,
    isReading: (part: string) => current === owner + part,
    toggle: (part: string, text: string) => {
      if (speech.key() === owner + part) speech.stop();
      else speech.start(owner + part, text);
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
