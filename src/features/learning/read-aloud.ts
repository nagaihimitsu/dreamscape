// 「英語を読み上げるボタン」 (2026-11-11 user decision): the rules of the read-aloud buttons, kept apart from the browser's
// speech (ReadAloud.tsx) so that they can be tested. The browser's own Web Speech API reads: no audio files, no network.

/** The language the buttons ask for: the English of the quizzes. */
export const READ_ALOUD_LANG = "en-US";

/** Whether this browser can read aloud: the Web Speech API's `speechSynthesis` and `SpeechSynthesisUtterance`. */
export function readAloudSupported(scope?: { speechSynthesis?: unknown; SpeechSynthesisUtterance?: unknown }): boolean {
  return !!scope && typeof scope.speechSynthesis === "object" && scope.speechSynthesis !== null &&
    typeof scope.SpeechSynthesisUtterance === "function";
}

/** What a button reads: the English as shown, its runs of spaces and line breaks made one space; "" when it has no word. */
export function readAloudText(text: string): string {
  const said = text.replace(/\s+/gu, " ").trim();
  return /\p{L}/u.test(said) ? said : "";
}

/** A button's name (its aria-label): which English it reads, the question ("question") or an option (its mark). */
export function readAloudLabel(part: string): string {
  return part === "question" ? "問題文の英文を読み上げる" : `選択肢${part}の英文を読み上げる`;
}

/** What the voice choice reads of a voice (SpeechSynthesisVoice). */
export type VoiceLike = Pick<SpeechSynthesisVoice, "name" | "lang" | "voiceURI" | "default">;

/** Apple's novelty voices (iPhone, iPad, Mac), listed as en-US beside the reading voices: they sing, bubble or whisper. */
const NOVELTY_VOICES = new Set([
  "albert", "bad news", "bahh", "bells", "boing", "bubbles", "cellos", "deranged", "good news", "hysterical", "jester",
  "organ", "pipe organ", "princess", "superstar", "trinoids", "whisper", "wobble", "zarvox",
]);
/** Apple's older voices (the Eloquence voices and the classic MacinTalk ones): English, but after the usual ones. */
const DATED_VOICES = new Set([
  "eddy", "flo", "grandma", "grandpa", "reed", "rocko", "sandy", "shelley",
  "agnes", "bruce", "fred", "junior", "kathy", "ralph", "vicki", "victoria",
]);

/** A voice's language in lower case with a hyphen ("en_US" → "en-us"). */
const voiceLang = (voice: VoiceLike) => voice.lang.replace(/_/gu, "-").toLowerCase();
/** A voice's name without the language Chrome adds after it ("Eddy (English (US))" → "eddy"). */
const voiceName = (voice: VoiceLike) => voice.name.split(" (")[0].trim().toLowerCase();

/**
 * The voice to read English with: the browser's default voice when it is English, else the first American English voice,
 * else the first other English voice; Apple's older voices after the others, its novelty voices never. Null when there is
 * no English voice (or the browser has not loaded its voices yet): the utterance's lang, en-US, then leaves the voice to
 * the browser (its voice for that language, or its default voice).
 */
export function pickEnglishVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  let best: { voice: T; rank: number } | null = null;
  for (const voice of voices) {
    const lang = voiceLang(voice);
    if ((lang !== "en" && !lang.startsWith("en-")) || NOVELTY_VOICES.has(voiceName(voice))) continue;
    const dated = DATED_VOICES.has(voiceName(voice)) || voice.voiceURI.startsWith("com.apple.eloquence.");
    const rank = (voice.default ? 0 : 4) + (dated ? 2 : 0) + (lang === "en-us" ? 0 : 1);
    if (!best || rank < best.rank) best = { voice, rank };
  }
  return best?.voice ?? null;
}
