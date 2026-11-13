import { describe, expect, it } from "vitest";
import { createPlayClock, type ClockDriver } from "./clock";

/** A driver whose time and frames the test moves. */
function fakeDriver() {
  let time = 1000;
  let next = 1;
  const waiting = new Map<number, (time: number) => void>();
  const driver: ClockDriver = {
    now: () => time,
    frame: (callback) => { waiting.set(next, callback); return next++; },
    cancel: (id) => { waiting.delete(id); },
  };
  return {
    driver,
    /** Moves time by `ms` and runs the frame waiting then. */
    tick(ms: number) {
      time += ms;
      const callbacks = [...waiting.values()];
      waiting.clear();
      for (const callback of callbacks) callback(time);
    },
    get waiting() { return waiting.size; },
  };
}

describe("the host's play clock", () => {
  it("counts from the start, and calls each frame with the play's time", () => {
    const fake = fakeDriver();
    const clock = createPlayClock(fake.driver);
    const seen: number[] = [];
    clock.onFrame((ms) => seen.push(ms));
    fake.tick(16);
    fake.tick(16);
    expect(seen).toEqual([16, 32]);
    expect(clock.now()).toBe(32);
  });

  it("stops while paused: no frames, no timers, and the stopped time left out", () => {
    const fake = fakeDriver();
    const clock = createPlayClock(fake.driver);
    const seen: number[] = [];
    let fired = false;
    clock.onFrame((ms) => seen.push(ms));
    clock.after(100, () => { fired = true; });
    fake.tick(50);
    clock.pause();
    expect(clock.paused).toBe(true);
    fake.tick(5000);
    expect(seen).toEqual([50]);
    expect(clock.now()).toBe(50);
    clock.resume();
    fake.tick(40);
    expect(fired).toBe(false);
    fake.tick(20);
    expect(fired).toBe(true);
    expect(seen).toEqual([50, 90, 110]);
  });

  it("puts an input's time on the play's measure, trusting only a stamp near the browser's clock", () => {
    const fake = fakeDriver();
    const clock = createPlayClock(fake.driver);
    fake.tick(500);
    expect(clock.at(1480)).toBe(480);
    // A stamp from another clock (or none) is read as now.
    expect(clock.at(0)).toBe(500);
    expect(clock.at(99_999)).toBe(500);
  });

  it("ends everything when stopped, and asks no frame without anything to call", () => {
    const fake = fakeDriver();
    const clock = createPlayClock(fake.driver);
    expect(fake.waiting).toBe(0);
    const off = clock.onFrame(() => undefined);
    expect(fake.waiting).toBe(1);
    off();
    fake.tick(16);
    expect(fake.waiting).toBe(0);
    let called = false;
    clock.after(10, () => { called = true; });
    clock.stop();
    fake.tick(100);
    expect(called).toBe(false);
  });
});
