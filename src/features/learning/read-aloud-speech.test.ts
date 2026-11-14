import { afterEach, describe, expect, it, vi } from "vitest";
import { createSpeechAudio } from "../../audio/speech-audio";
import { createSpeechReader, UNPROMPTED_START_MS, type SpeechScope, type UtteranceLike } from "./read-aloud-speech";

// The read-aloud buttons' speech and the page's sound (2026-11-13 user decision), with a fake speechSynthesis and a fake
// AudioContext: while English is read the music is lowered as for a voice and a voice stops; when the reading ends, is
// stopped or fails, the lowering lifts and the audio the speech interrupted (iOS) is woken with no tap.

class FakeUtterance implements UtteranceLike {
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;
  private readonly listeners = new Map<string, (() => void)[]>();
  constructor(readonly text: string) {}
  addEventListener(type: "start" | "end" | "error", listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: "start" | "end" | "error") {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

/** A fake page: the browser's speech (cancel fires the cut utterance's error at once, as the worst case), its audio and the music. */
function fakePage({ audioState = "running", speakThrows = false } = {}) {
  const spoken: FakeUtterance[] = [];
  const synth = {
    get speaking() {
      return spoken.some((utterance) => !ended.has(utterance));
    },
    pending: false,
    cancels: 0,
    speak(utterance: UtteranceLike) {
      if (speakThrows) throw new Error("speech unavailable");
      spoken.push(utterance as FakeUtterance);
    },
    cancel() {
      this.cancels++;
      for (const utterance of spoken) {
        if (ended.has(utterance)) continue;
        ended.add(utterance);
        utterance.fire("error");
      }
    },
    getVoices: () => [],
  };
  const ended = new Set<FakeUtterance>();
  const scope: SpeechScope = { speechSynthesis: synth, SpeechSynthesisUtterance: FakeUtterance };
  const audio = {
    state: audioState,
    resumes: 0,
    resume() {
      this.resumes++;
      return Promise.resolve();
    },
  };
  const page = { audio, ducks: [] as boolean[], voiceStops: 0, now: 0 };
  const sound = createSpeechAudio({
    audio: () => audio,
    wanted: () => true,
    hidden: () => false,
    duck: (reading) => page.ducks.push(reading),
    stopVoice: () => page.voiceStops++,
    now: () => page.now,
  });
  const reader = createSpeechReader(() => scope, sound);
  /** The utterance read last ends by itself. */
  const finish = (type: "end" | "error" = "end") => {
    const utterance = spoken.at(-1);
    if (!utterance) throw new Error("nothing spoken");
    ended.add(utterance);
    utterance.fire(type);
  };
  return { reader, synth, spoken, page, finish };
}

describe("reading English aloud", () => {
  it("speaks the English in en-US, lowers the music and stops a voice, and lifts the music at the end", () => {
    const { reader, spoken, page, finish } = fakePage();
    const heard: (string | null)[] = [];
    reader.subscribe(() => heard.push(reader.key()));
    reader.start("a|question", "  Where is\n the tower? ");
    expect(spoken.map((utterance) => [utterance.text, utterance.lang])).toEqual([["Where is the tower?", "en-US"]]);
    expect(reader.key()).toBe("a|question");
    expect(page.ducks).toEqual([true]);
    expect(page.voiceStops).toBe(1);
    finish();
    expect(reader.key()).toBeNull();
    expect(heard).toEqual(["a|question", null]);
    expect(page.ducks).toEqual([true, false]);
    // The audio ran all along (Chromium): nothing to wake.
    expect(page.audio.resumes).toBe(0);
  });

  it("reads nothing, and leaves the music alone, for a text without a word", () => {
    const { reader, spoken, page } = fakePage();
    reader.start("a|A", " 1 — 2 ");
    expect(spoken).toEqual([]);
    expect(page.ducks).toEqual([]);
  });

  it("wakes the audio the speech interrupted as the reading ends, with no tap (iOS)", () => {
    const { reader, page, finish } = fakePage();
    reader.start("a|question", "Hello");
    page.audio.state = "interrupted";
    finish();
    expect(page.audio.resumes).toBe(1);
  });

  it("keeps the music lowered from one button's reading to the next, the cut one's end changing nothing", () => {
    const { reader, synth, page, finish } = fakePage({ audioState: "interrupted" });
    reader.start("a|question", "Hello");
    reader.start("a|A", "Goodbye");
    expect(synth.cancels).toBe(1);
    expect(reader.key()).toBe("a|A");
    expect(page.ducks).toEqual([true]);
    expect(page.voiceStops).toBe(1);
    expect(page.audio.resumes).toBe(0);
    finish();
    expect(page.ducks).toEqual([true, false]);
    expect(page.audio.resumes).toBe(1);
  });

  it("lifts the music and wakes the audio at once when stopped, and again as the cut utterance ends", () => {
    const { reader, page, spoken } = fakePage({ audioState: "suspended" });
    reader.start("a|question", "Hello");
    // The cut utterance's end comes later here (cancel fires none in this fake).
    const late = spoken[0];
    spoken.length = 0;
    reader.stop("a|");
    expect(reader.key()).toBeNull();
    expect(page.ducks).toEqual([true, false]);
    expect(page.audio.resumes).toBe(1);
    page.now += 300;
    late.fire("end");
    expect(page.audio.resumes).toBe(2);
  });

  it("does not stop another screen's reading", () => {
    const { reader, page } = fakePage();
    reader.start("a|question", "Hello");
    reader.stop("b|");
    expect(reader.key()).toBe("a|question");
    expect(page.ducks).toEqual([true]);
  });

  it("ends the reading at once, lifting the music, when the browser cannot speak or fails", () => {
    const throwing = fakePage({ speakThrows: true });
    throwing.reader.start("a|question", "Hello");
    expect(throwing.reader.key()).toBeNull();
    expect(throwing.page.ducks).toEqual([true, false]);
    const failing = fakePage();
    failing.reader.start("a|question", "Hello");
    failing.finish("error");
    expect(failing.reader.key()).toBeNull();
    expect(failing.page.ducks).toEqual([true, false]);
  });
});

// 「問題が出たら英語を自動で読み上げる」 (2026-11-14 user decision): the automatic reading starts with no press, so the page's
// first tap primes the speech (iOS Safari speaks with no gesture only once the page has spoken in a gesture).
describe("priming the speech for the automatic reading", () => {
  it("speaks one empty, silent utterance, once, and is no reading: no key, no lowered music, no voice stopped", () => {
    const { reader, spoken, page } = fakePage();
    const heard: (string | null)[] = [];
    reader.subscribe(() => heard.push(reader.key()));
    expect(reader.primed()).toBe(false);
    reader.prime();
    expect(reader.primed()).toBe(true);
    expect(spoken.map((utterance) => [utterance.text, utterance.volume])).toEqual([["", 0]]);
    reader.prime();
    expect(spoken).toHaveLength(1);
    expect(reader.key()).toBeNull();
    expect(heard).toEqual([]);
    expect(page.ducks.every((ducked) => !ducked)).toBe(true);
    expect(page.voiceStops).toBe(0);
  });

  it("wakes the audio the empty utterance interrupted as it ends (iOS)", () => {
    const { reader, page, finish } = fakePage();
    reader.prime();
    page.audio.state = "interrupted";
    finish();
    expect(page.audio.resumes).toBe(1);
  });

  it("is primed by a press's reading, and speaks nothing over a reading going on", () => {
    const pressed = fakePage();
    pressed.reader.start("a|question", "Hello");
    expect(pressed.reader.primed()).toBe(true);
    pressed.reader.prime();
    expect(pressed.spoken.map((utterance) => utterance.text)).toEqual(["Hello"]);
    // Something already reading (another tab's page, a press the reader did not see): primed, nothing spoken over it.
    const busy = fakePage();
    busy.synth.pending = true;
    busy.reader.prime();
    expect(busy.reader.primed()).toBe(true);
    expect(busy.spoken).toEqual([]);
  });

  it("is primed even when the browser's speech fails, leaving the readings to the presses", () => {
    const { reader } = fakePage({ speakThrows: true });
    reader.prime();
    expect(reader.primed()).toBe(true);
    expect(reader.key()).toBeNull();
  });
});

// The automatic reading starts with no gesture. iOS ignores a speak() it does not allow, without an event, so one that has
// not started in time is given up: the sound comes back and the page waits to be primed by a tap again.
describe("an automatic (unprompted) reading", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not prime the page itself, as a press's reading does", () => {
    const { reader } = fakePage();
    reader.start("a|question", "Hello", { unprompted: true });
    expect(reader.primed()).toBe(false);
    reader.start("a|A", "Goodbye");
    expect(reader.primed()).toBe(true);
  });

  it("is given up when it has not started in time: the sound comes back and the page is no longer primed", () => {
    vi.useFakeTimers();
    const { reader, synth, page } = fakePage();
    reader.prime();
    reader.start("a|question", "Hello", { unprompted: true });
    const cancels = synth.cancels;
    expect(reader.key()).toBe("a|question");
    vi.advanceTimersByTime(UNPROMPTED_START_MS - 1);
    expect(reader.key()).toBe("a|question");
    vi.advanceTimersByTime(1);
    expect(reader.key()).toBeNull();
    expect(reader.primed()).toBe(false);
    expect(synth.cancels).toBe(cancels + 1);
    expect(page.ducks.at(-1)).toBe(false);
  });

  it("goes on once it has started, and a press's reading has no such limit", () => {
    vi.useFakeTimers();
    const unprompted = fakePage();
    unprompted.reader.prime();
    unprompted.reader.start("a|question", "Hello", { unprompted: true });
    unprompted.spoken.at(-1)!.fire("start");
    vi.advanceTimersByTime(UNPROMPTED_START_MS * 2);
    expect(unprompted.reader.key()).toBe("a|question");
    expect(unprompted.reader.primed()).toBe(true);
    const pressed = fakePage();
    pressed.reader.start("a|question", "Hello");
    vi.advanceTimersByTime(UNPROMPTED_START_MS * 2);
    expect(pressed.reader.key()).toBe("a|question");
  });

  it("leaves alone a later reading when the one given up was already cut", () => {
    vi.useFakeTimers();
    const { reader, synth } = fakePage();
    reader.prime();
    reader.start("a|question", "Hello", { unprompted: true });
    reader.start("a|A", "Goodbye");
    const cancels = synth.cancels;
    vi.advanceTimersByTime(UNPROMPTED_START_MS);
    expect(reader.key()).toBe("a|A");
    expect(reader.primed()).toBe(true);
    expect(synth.cancels).toBe(cancels);
  });
});
