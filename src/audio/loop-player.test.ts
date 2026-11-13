import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoopPlayer } from "./loop-player";

// The looping player's lowering by voice and by English read aloud, and its playing on after the speech (2026-11-13 user
// decision), on a fake page: a fake AudioContext (gains that note their ramps, a state that can change), fake audio
// elements and a fake document. The level node is the gain the low-pass filter feeds (loop-player.ts ensureGraph).

type Ramp = [kind: string, value: number, ...rest: number[]];

class FakeParam {
  readonly calls: Ramp[] = [];
  constructor(public value: number) {}
  cancelScheduledValues() {}
  setValueAtTime(value: number, time: number) {
    this.calls.push(["set", value, time]);
    this.value = value;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.calls.push(["ramp", value, time]);
    this.value = value;
  }
  setTargetAtTime(value: number, time: number, constant: number) {
    this.calls.push(["target", value, time, constant]);
    this.value = value;
  }
}
class FakeNode {
  readonly outputs: FakeNode[] = [];
  connect(node: FakeNode) {
    this.outputs.push(node);
    return node;
  }
}
class FakeGain extends FakeNode {
  readonly gain = new FakeParam(1);
}
class FakeFilter extends FakeNode {
  type = "";
  readonly frequency = new FakeParam(350);
  readonly Q = new FakeParam(1);
}
class FakeAudioContext extends EventTarget {
  static last: FakeAudioContext | undefined;
  state = "running";
  currentTime = 0;
  readonly destination = new FakeNode();
  readonly filters: FakeFilter[] = [];
  constructor() {
    super();
    FakeAudioContext.last = this;
  }
  createGain() {
    return new FakeGain();
  }
  createBiquadFilter() {
    const filter = new FakeFilter();
    this.filters.push(filter);
    return filter;
  }
  createMediaElementSource() {
    return new FakeNode();
  }
  resume() {
    return Promise.resolve();
  }
  /** The browser changes its state (iOS: the speech interrupts it, then lets it run again). */
  change(state: string) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}
class FakeAudio {
  static made: FakeAudio[] = [];
  loop = false;
  preload = "";
  src = "";
  currentTime = 0;
  duration = Number.NaN;
  paused = true;
  error = null;
  plays = 0;
  constructor() {
    FakeAudio.made.push(this);
  }
  addEventListener() {}
  play() {
    this.plays++;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

/** A fresh fake document for each test (a page's listeners stay on its own). */
let fakeDocument = Object.assign(new EventTarget(), { hidden: false });
const DUCKS = { none: 1, quiz: 0.35, quiet: 0.5, travel: 0.6 };

/** A player on a fresh fake page, its graph made by the reader's first gesture and the track "a" playing under a quiz. */
async function playingPlayer(): Promise<{ player: LoopPlayer; audio: FakeAudioContext; level: FakeParam; deck: FakeAudio }> {
  vi.resetModules();
  FakeAudio.made = [];
  const { createLoopPlayer } = await import("./loop-player");
  const player = createLoopPlayer({ part: "bgm", pathOf: (id) => `assets/bgm/${id}.mp3`, volumes: new Map(), duckLevels: DUCKS, labelJa: "BGM" });
  player.applySettings(true, 0.4);
  player.play({ track: "a", duck: "quiz" });
  fakeDocument.dispatchEvent(new Event("pointerup"));
  const audio = FakeAudioContext.last;
  if (!audio) throw new Error("no AudioContext was made");
  const level = audio.filters[0].outputs[0] as FakeGain;
  const deck = FakeAudio.made.find((element) => element.src.endsWith("assets/bgm/a.mp3"));
  if (!deck) throw new Error("the track was not loaded");
  return { player, audio, level: level.gain, deck };
}

beforeEach(() => {
  fakeDocument = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", fakeDocument);
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("AudioContext", FakeAudioContext);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the looping player's lowering by voice and by English read aloud", () => {
  it("lowers the music for a reading exactly as for a voice: the same level and fades, never twice", async () => {
    const { player, level, deck } = await playingPlayer();
    expect(deck.paused).toBe(false);
    expect(level.value).toBeCloseTo(0.35);
    player.duckForVoice(true);
    const byVoice = level.calls.at(-1);
    player.duckForVoice(false);
    const backFromVoice = level.calls.at(-1);
    player.duckForSpeech(true);
    expect(level.calls.at(-1)).toEqual(byVoice);
    expect(level.value).toBeCloseTo(0.35 * 0.5);
    // A voice during the reading (or the reading during a voice): one lowering.
    const calls = level.calls.length;
    player.duckForVoice(true);
    player.duckForVoice(false);
    expect(level.calls.length).toBe(calls);
    player.duckForSpeech(false);
    expect(level.calls.at(-1)).toEqual(backFromVoice);
    expect(level.value).toBeCloseTo(0.35);
  });

  it("keeps the voice's lowering when the reading ends during a voice", async () => {
    const { player, level } = await playingPlayer();
    player.duckForSpeech(true);
    player.duckForVoice(true);
    player.duckForSpeech(false);
    expect(level.value).toBeCloseTo(0.35 * 0.5);
    player.duckForVoice(false);
    expect(level.value).toBeCloseTo(0.35);
  });

  it("plays the track on after a reading when the speech paused it while the audio ran", async () => {
    const { player, deck } = await playingPlayer();
    player.duckForSpeech(true);
    deck.pause();
    const plays = deck.plays;
    player.duckForSpeech(false);
    expect(deck.paused).toBe(false);
    expect(deck.plays).toBe(plays + 1);
  });

  it("stops while the speech interrupts the page's audio and plays on by itself when it runs again", async () => {
    const { player, audio, deck } = await playingPlayer();
    player.duckForSpeech(true);
    audio.change("interrupted");
    expect(deck.paused).toBe(true);
    // Over while the audio does not run yet: nothing plays into it.
    player.duckForSpeech(false);
    expect(deck.paused).toBe(true);
    audio.change("running");
    expect(deck.paused).toBe(false);
  });

  it("changes nothing for the music when nothing is read", async () => {
    const { level, deck } = await playingPlayer();
    expect(level.calls.filter(([kind]) => kind === "target")).toEqual([]);
    expect(deck.paused).toBe(false);
  });
});
