// 「英語を読み上げるボタン」 (2026-11-11 user decision): when the buttons show, what they read and with which voice.
import { describe, expect, it } from "vitest";
import { autoReadKey, pickEnglishVoice, readAloudLabel, readAloudSupported, readAloudText, type VoiceLike } from "./read-aloud";

const voice = (name: string, lang: string, extra: Partial<VoiceLike> = {}): VoiceLike =>
  ({ name, lang, voiceURI: name, default: false, ...extra });

describe("the read-aloud buttons", () => {
  it("show only where the browser has the Web Speech API", () => {
    expect(readAloudSupported({ speechSynthesis: {}, SpeechSynthesisUtterance: function Utterance() {} })).toBe(true);
    expect(readAloudSupported(undefined)).toBe(false);
    expect(readAloudSupported({})).toBe(false);
    expect(readAloudSupported({ speechSynthesis: null, SpeechSynthesisUtterance: function Utterance() {} })).toBe(false);
    expect(readAloudSupported({ speechSynthesis: {} })).toBe(false);
  });

  it("read the English as shown, in one line, and nothing without a word", () => {
    expect(readAloudText("  The keeper\n  still rings the bell.  ")).toBe("The keeper still rings the bell.");
    expect(readAloudText("A café, the spire’s roof?")).toBe("A café, the spire’s roof?");
    expect(readAloudText(" … ")).toBe("");
  });

  it("say which English they read", () => {
    expect(readAloudLabel("question")).toBe("問題文の英文を読み上げる");
    expect(readAloudLabel("B")).toBe("選択肢Bの英文を読み上げる");
  });
});

describe("the voice", () => {
  it("is the browser's default voice when it is English", () => {
    const daniel = voice("Daniel", "en-GB", { default: true });
    expect(pickEnglishVoice([voice("Samantha", "en-US"), daniel])).toBe(daniel);
  });

  it("is an American English voice on a phone set to Japanese, never a novelty voice, older voices after the others", () => {
    // As an iPhone lists them (alphabetically): novelty, Eloquence and classic voices come before Samantha.
    const samantha = voice("Samantha", "en-US", { voiceURI: "com.apple.voice.compact.en-US.Samantha" });
    const voices = [
      voice("Albert", "en-US", { voiceURI: "com.apple.speech.synthesis.voice.Albert" }),
      voice("Bad News", "en-US", { voiceURI: "com.apple.speech.synthesis.voice.BadNews" }),
      voice("Daniel", "en-GB", { voiceURI: "com.apple.voice.compact.en-GB.Daniel" }),
      voice("Eddy (English (US))", "en-US", { voiceURI: "com.apple.eloquence.en-US.Eddy" }),
      voice("Fred", "en-US", { voiceURI: "com.apple.speech.synthesis.voice.Fred" }),
      voice("Kyoko", "ja-JP", { default: true }),
      samantha,
    ];
    expect(pickEnglishVoice(voices)).toBe(samantha);
    // Without Samantha: British English before the older American voices.
    expect(pickEnglishVoice(voices.filter((item) => item !== samantha))?.name).toBe("Daniel");
    // Only older voices: still English.
    expect(pickEnglishVoice([voices[3], voices[4], voices[5]])?.name).toBe("Eddy (English (US))");
  });

  it("reads Android's language form and keeps the browser's order among equals", () => {
    const first = voice("English United States", "en_US");
    expect(pickEnglishVoice([voice("日本語", "ja_JP"), first, voice("English United States 2", "en-US")])).toBe(first);
  });

  it("is left to the browser when it has no English voice, or none loaded yet", () => {
    expect(pickEnglishVoice([])).toBeNull();
    expect(pickEnglishVoice([voice("Kyoko", "ja-JP", { default: true })])).toBeNull();
    expect(pickEnglishVoice([voice("Bells", "en-US"), voice("Zarvox", "en-US")])).toBeNull();
  });
});

// 「問題が出たら英語を自動で読み上げる」 (2026-11-14 user decision): what a quiz screen reads with no press.
describe("the automatic reading", () => {
  it("is due for a question waiting for its answer, once per question shown in a run", () => {
    expect(autoReadKey(true, "question", "b:3", 0, "q1")).toBe("b:3:0:q1");
    expect(autoReadKey(true, "question", "b:3", 1, "q2")).toBe("b:3:1:q2");
    // Played again (a new run), the same question is shown anew.
    expect(autoReadKey(true, "question", "b:4", 0, "q1")).toBe("b:4:0:q1");
  });

  it("is not due with the setting off, without a question, or once it is answered or gone", () => {
    expect(autoReadKey(false, "question", "b:3", 0, "q1")).toBeNull();
    expect(autoReadKey(true, "question", "b:3", 0, undefined)).toBeNull();
    for (const phase of ["dialogue", "feedback", "reasoning", "result"]) expect(autoReadKey(true, phase, "b:3", 0, "q1"), phase).toBeNull();
  });
});
