import type { PlayClock } from "../contract";

// The host's clock (docs/13 2.7): a play's time, stopped while the page is hidden or 「続ける」 waits. Frames and timers run
// from one requestAnimationFrame loop, so they stop with it. The driver is the browser's (performance.now and
// requestAnimationFrame); a test passes its own.
//
// Two more stops (2026-11-13, the host's flow): a lead (the host's 3・2・1 before 「スタート！」: the play's time stays 0
// and its frames draw the start, its timers wait, an input in it falls before 0) and a hit-stop (`hold`: the time stands
// still for a few tens of milliseconds while the frames go on drawing the same moment).

export interface ClockDriver {
  now(): number;
  frame(callback: (time: number) => void): number;
  cancel(id: number): void;
}

export const browserClockDriver: ClockDriver = {
  now: () => performance.now(),
  frame: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

/** A play's clock and its controls (the host's; a game sees only PlayClock). */
export interface HostClock extends PlayClock {
  /** Stops time (the page hidden): frames and timers wait. Cuts a hit-stop short. */
  pause(): void;
  /** Time runs again from where it stopped. */
  resume(): void;
  /** A hit-stop: time stands still for `ms` (the frames go on at the same moment, timers wait). A longer one extends it. */
  hold(ms: number): void;
  /** The play is over: no more frames or timers. */
  stop(): void;
  /** What is left of the lead (the host's count before the play's time starts); 0 once it has run. */
  leadLeft(): number;
  readonly paused: boolean;
}

export interface PlayClockOptions {
  /** The host's count before the play's time starts (its frames draw time 0, its timers wait). */
  leadMs?: number;
  /** Debug's slow-phone feel (E3): every input's time is read this much later. */
  inputDelayMs?: number;
}

/** An input event's time older or newer than this is not the browser's clock: the time of reading it is used. */
const STAMP_TRUST_MS = 1000;

/** A clock that starts now (its play's time after `leadMs`). */
export function createPlayClock(driver: ClockDriver = browserClockDriver, { leadMs = 0, inputDelayMs = 0 }: PlayClockOptions = {}): HostClock {
  const startedAt = driver.now();
  let stoppedTime = 0;
  let pausedAt: number | null = null;
  let holdFrom: number | null = null;
  let holdUntil = 0;
  let stopped = false;
  let frameId: number | null = null;
  const frames = new Set<(ms: number) => void>();
  const timers = new Set<{ at: number; callback: () => void }>();
  /** Ends a hit-stop whose time has come (by `at`), counting it as stopped time. */
  const settleHold = (at: number) => {
    if (holdFrom === null || at < holdUntil) return;
    stoppedTime += holdUntil - holdFrom;
    holdFrom = null;
  };
  /** The time since the clock was made, the stops left out (the lead included). */
  const elapsed = () => {
    const at = pausedAt ?? driver.now();
    settleHold(at);
    return (holdFrom ?? at) - startedAt - stoppedTime;
  };
  const now = () => Math.max(0, elapsed() - leadMs);
  const loop = () => {
    frameId = null;
    if (stopped || pausedAt !== null) return;
    const ms = now();
    if (elapsed() >= leadMs) for (const timer of [...timers]) if (timers.has(timer) && ms >= timer.at) {
      timers.delete(timer);
      timer.callback();
    }
    for (const callback of [...frames]) if (!stopped && pausedAt === null && frames.has(callback)) callback(ms);
    schedule();
  };
  const schedule = () => {
    if (frameId === null && !stopped && pausedAt === null && (frames.size || timers.size)) frameId = driver.frame(loop);
  };
  const unschedule = () => {
    if (frameId !== null) driver.cancel(frameId);
    frameId = null;
  };
  return {
    now,
    at(timeStamp) {
      const current = driver.now();
      const stamp = timeStamp > 0 && Math.abs(current - timeStamp) < STAMP_TRUST_MS ? timeStamp : current;
      return Math.min(elapsed(), stamp - startedAt - stoppedTime) - leadMs + inputDelayMs;
    },
    onFrame(callback) {
      frames.add(callback);
      schedule();
      return () => { frames.delete(callback); };
    },
    after(ms, callback) {
      const timer = { at: now() + ms, callback };
      timers.add(timer);
      schedule();
      return () => { timers.delete(timer); };
    },
    pause() {
      if (stopped || pausedAt !== null) return;
      pausedAt = driver.now();
      settleHold(pausedAt);
      // A hidden page cuts a hit-stop short (its stopped part counts; the rest is the pause's).
      if (holdFrom !== null) {
        stoppedTime += pausedAt - holdFrom;
        holdFrom = null;
      }
      unschedule();
    },
    resume() {
      if (stopped || pausedAt === null) return;
      stoppedTime += driver.now() - pausedAt;
      pausedAt = null;
      schedule();
    },
    hold(ms) {
      if (stopped || pausedAt !== null || !(ms > 0)) return;
      const at = driver.now();
      settleHold(at);
      if (holdFrom === null) holdFrom = at;
      holdUntil = Math.max(holdUntil, at + ms);
    },
    stop() {
      stopped = true;
      frames.clear();
      timers.clear();
      unschedule();
    },
    leadLeft: () => Math.max(0, leadMs - elapsed()),
    get paused() { return pausedAt !== null; },
  };
}
