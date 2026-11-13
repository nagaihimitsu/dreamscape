import { describe, expect, it } from "vitest";
import { AFTER_SPEECH_MS, createSpeechAudio, shouldTryResume, voiceDucked, type SpeechWakeState } from "./speech-audio";

// English read aloud and the page's sound (2026-11-13 user decision): the music lowered as for a voice while it reads, a
// voice stopped as it starts, and the page's audio woken with no tap after it (iOS gives the speech the sound).
describe("the lowering by voice", () => {
  it("lowers the music while a line's voice plays or English is read aloud, once for both", () => {
    expect(voiceDucked({ voice: false, reading: false })).toBe(false);
    expect(voiceDucked({ voice: true, reading: false })).toBe(true);
    expect(voiceDucked({ voice: false, reading: true })).toBe(true);
    expect(voiceDucked({ voice: true, reading: true })).toBe(true);
  });
});

describe("waking the page's audio after a reading", () => {
  const after: SpeechWakeState = { state: "interrupted", wanted: true, hidden: false, reading: false, sinceSpeechMs: 0 };

  it("asks the audio to run again when Safari interrupted it or it was suspended, once a reading is over", () => {
    expect(shouldTryResume(after)).toBe(true);
    expect(shouldTryResume({ ...after, state: "suspended" })).toBe(true);
    expect(shouldTryResume({ ...after, sinceSpeechMs: AFTER_SPEECH_MS })).toBe(true);
  });

  it("leaves running, closed and unmade audio alone", () => {
    expect(shouldTryResume({ ...after, state: "running" })).toBe(false);
    expect(shouldTryResume({ ...after, state: "closed" })).toBe(false);
    expect(shouldTryResume({ ...after, state: undefined })).toBe(false);
  });

  it("never while a reading goes on, the page is hidden or no part wants the audio", () => {
    expect(shouldTryResume({ ...after, reading: true })).toBe(false);
    expect(shouldTryResume({ ...after, hidden: true })).toBe(false);
    expect(shouldTryResume({ ...after, wanted: false })).toBe(false);
  });

  it("only within a few seconds after a reading: another app's sound later is not taken back", () => {
    expect(shouldTryResume({ ...after, sinceSpeechMs: null })).toBe(false);
    expect(shouldTryResume({ ...after, sinceSpeechMs: AFTER_SPEECH_MS + 1 })).toBe(false);
    expect(shouldTryResume({ ...after, sinceSpeechMs: -1 })).toBe(false);
    expect(AFTER_SPEECH_MS).toBe(5000);
  });
});

/** A fake page: an AudioContext's state and resume, the lowering, the voice and the clock, with what was asked of them. */
function fakePage(state = "running") {
  type FakeAudio = { state: string; resumes: number; resume(): Promise<void> };
  const audio: FakeAudio = {
    state,
    resumes: 0,
    resume() {
      this.resumes++;
      return Promise.resolve();
    },
  };
  const page = {
    audio: audio as FakeAudio | undefined,
    wanted: true,
    hidden: false,
    now: 1000,
    ducks: [] as boolean[],
    voiceStops: 0,
  };
  const sound = createSpeechAudio({
    audio: () => page.audio,
    wanted: () => page.wanted,
    hidden: () => page.hidden,
    duck: (reading) => page.ducks.push(reading),
    stopVoice: () => page.voiceStops++,
    now: () => page.now,
  });
  return { page, sound };
}

describe("the reading's wiring to the page's sound", () => {
  it("lowers the music and stops a voice as a reading starts, and lifts it as it ends, with nothing to wake", () => {
    const { page, sound } = fakePage();
    sound.reading(true);
    expect(page.ducks).toEqual([true]);
    expect(page.voiceStops).toBe(1);
    // Another button reading at once (the store goes from one key to another): nothing more.
    sound.reading(true);
    expect(page.ducks).toEqual([true]);
    sound.reading(false);
    expect(page.ducks).toEqual([true, false]);
    expect(page.audio?.resumes).toBe(0);
  });

  it("wakes the audio the speech interrupted at once when the reading is over, and again at a cut utterance's end", () => {
    const { page, sound } = fakePage();
    sound.reading(true);
    page.audio!.state = "interrupted";
    // While it reads, the sound is the speech's: no wake, even as the state changes.
    sound.stateChanged();
    expect(page.audio?.resumes).toBe(0);
    sound.reading(false);
    expect(page.audio?.resumes).toBe(1);
    page.now += 200;
    sound.ended();
    expect(page.audio?.resumes).toBe(2);
    // The lowering lifted, and asked to play on again at the end.
    expect(page.ducks).toEqual([true, false, false]);
  });

  it("does not wake at a cut utterance's end while the next reading goes on", () => {
    const { page, sound } = fakePage("interrupted");
    sound.reading(true);
    sound.ended();
    expect(page.audio?.resumes).toBe(0);
    expect(page.ducks).toEqual([true]);
  });

  it("wakes the audio when it stops running within a few seconds after a reading, and not later", () => {
    const { page, sound } = fakePage();
    sound.reading(true);
    sound.reading(false);
    expect(page.audio?.resumes).toBe(0);
    page.now += 1500;
    page.audio!.state = "interrupted";
    sound.stateChanged();
    expect(page.audio?.resumes).toBe(1);
    page.now += AFTER_SPEECH_MS;
    sound.stateChanged();
    expect(page.audio?.resumes).toBe(1);
  });

  it("never wakes audio no part wants, a hidden page's audio, or audio not made yet", () => {
    const { page, sound } = fakePage("suspended");
    page.wanted = false;
    sound.reading(true);
    sound.reading(false);
    page.wanted = true;
    page.hidden = true;
    sound.reading(true);
    sound.reading(false);
    expect(page.audio?.resumes).toBe(0);
    page.hidden = false;
    page.audio = undefined;
    sound.reading(true);
    sound.reading(false);
    expect(page.ducks).toEqual([true, false, true, false, true, false]);
  });

  it("keeps going when the browser refuses or throws on resume", async () => {
    const { page, sound } = fakePage("suspended");
    page.audio!.resume = () => Promise.reject(new Error("NotAllowedError"));
    sound.reading(true);
    expect(() => sound.reading(false)).not.toThrow();
    page.audio!.resume = () => {
      throw new Error("old browser");
    };
    sound.reading(true);
    expect(() => sound.reading(false)).not.toThrow();
    await Promise.resolve();
  });
});
