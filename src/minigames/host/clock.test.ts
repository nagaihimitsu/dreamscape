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

  it("holds time at 0 through a lead: its frames draw the start, its timers wait, an input in it falls before 0", () => {
    const fake = fakeDriver();
    const clock = createPlayClock(fake.driver, { leadMs: 900 });
    const seen: number[] = [];
    let started = false;
    clock.onFrame((ms) => seen.push(ms));
    clock.after(0, () => { started = true; });
    fake.tick(300);
    expect(clock.leadLeft()).toBe(600);
    expect(clock.at(1250)).toBe(-650);
    fake.tick(500);
    expect(started).toBe(false);
    expect(seen).toEqual([0, 0]);
    fake.tick(150);
    expect(started).toBe(true);
    expect(clock.leadLeft()).toBe(0);
    expect(seen).toEqual([0, 0, 50]);
  });

  it("stands still through a hit-stop: frames go on at the same moment, timers wait, then time runs on", () => {
    const fake = fakeDriver();
    const clock = createPlayClock(fake.driver);
    const seen: number[] = [];
    let fired = false;
    clock.onFrame((ms) => seen.push(ms));
    clock.after(150, () => { fired = true; });
    fake.tick(100);
    clock.hold(90);
    fake.tick(40);
    // A longer hit-stop in the middle of one extends it; a shorter one does not shorten it.
    clock.hold(80);
    clock.hold(5);
    fake.tick(40);
    fake.tick(60);
    expect(fired).toBe(false);
    fake.tick(40);
    expect(seen).toEqual([100, 100, 100, 120, 160]);
    expect(fired).toBe(true);
    // A hidden page cuts a hit-stop short: its stopped part counts, then the pause's.
    clock.hold(100);
    fake.tick(30);
    clock.pause();
    fake.tick(1000);
    clock.resume();
    fake.tick(16);
    expect(clock.now()).toBe(176);
  });

  it("reads every input later by Debug's slow-phone delay", () => {
    const fake = fakeDriver();
    const clock = createPlayClock(fake.driver, { inputDelayMs: 120 });
    fake.tick(500);
    expect(clock.at(1480)).toBe(600);
    expect(clock.now()).toBe(500);
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
