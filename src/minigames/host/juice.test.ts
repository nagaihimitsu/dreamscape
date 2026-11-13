import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlayClock, type ClockDriver } from "./clock";
import { createJuice } from "./juice";

// The host's juice toolkit (docs/13 2.6): what each tool moves, and that with less motion only the hit-stop's stop and
// the refusal's sound are left.

/** An element whose animations the test sees. */
function fakeElement() {
  const animations: { keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = [];
  const children: unknown[] = [];
  const element = {
    animations,
    children,
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    className: "",
    animate(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      animations.push({ keyframes, options });
      return { onfinish: null } as unknown as Animation;
    },
    appendChild(child: unknown) { children.push(child); return child; },
    remove() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 400 }),
  };
  return element;
}
type Fake = ReturnType<typeof fakeElement>;

const stillDriver: ClockDriver = { now: () => 1000, frame: () => 1, cancel: () => undefined };

function setUp(still: boolean) {
  const stage = fakeElement();
  const fx = fakeElement();
  const clock = createPlayClock(stillDriver);
  const hold = vi.spyOn(clock, "hold");
  const sounds: string[] = [];
  const juice = createJuice({ stage: () => stage as unknown as HTMLElement, fx: () => fx as unknown as HTMLElement, still, clock, seed: 7, sound: (id) => sounds.push(id) });
  return { stage, fx, hold, sounds, juice };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the juice toolkit", () => {
  it("with less motion: the hit-stop only stops time, the refusal only sounds, and nothing else moves or appears", () => {
    vi.useFakeTimers();
    const { stage, fx, hold, sounds, juice } = setUp(true);
    const target = fakeElement();
    juice.hitStop(500, target as unknown as Element);
    expect(hold).toHaveBeenCalledWith(150);
    juice.shake("l");
    juice.flash("big");
    juice.burst({ x: 0.5, y: 0.5 }, "star");
    juice.squash(target as unknown as Element, "land");
    juice.denied(target as unknown as Element);
    expect(sounds).toEqual(["ui_denied"]);
    for (const element of [stage, fx, target] as Fake[]) expect(element.animations).toEqual([]);
    expect(fx.children).toEqual([]);
  });

  it("moves the thing hit through a hit-stop, shakes the stage, squashes, wiggles a refusal, and flashes and bursts in the effects layer", () => {
    vi.useFakeTimers();
    const created: Fake[] = [];
    vi.stubGlobal("document", { createElement: () => { const element = fakeElement(); created.push(element); return element; } });
    const { stage, fx, hold, sounds, juice } = setUp(false);
    const target = fakeElement();
    juice.hitStop(undefined, target as unknown as Element);
    expect(hold).toHaveBeenCalledWith(90);
    expect(stage.dataset.hitstop).toBe("");
    vi.advanceTimersByTime(90);
    expect(stage.dataset.hitstop).toBeUndefined();
    expect(target.animations).toHaveLength(1);
    expect(target.animations[0].options.duration).toBe(90);
    juice.shake("s");
    expect(stage.animations).toHaveLength(1);
    juice.squash(target as unknown as Element, "press");
    juice.denied(target as unknown as Element);
    expect(target.animations).toHaveLength(3);
    expect(sounds).toEqual(["ui_denied"]);
    juice.flash("big");
    juice.burst({ x: 0.5, y: 0.5 }, "star");
    // The flash, then the burst's ring and five stars: at most six particles.
    expect(fx.children.length).toBe(1 + 1 + 5);
    expect(created.every((element) => element.animations.length <= 1)).toBe(true);
  });
});
