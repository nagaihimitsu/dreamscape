import type { PlayClock } from "../contract";

// The host's clock (docs/13 2.7): a play's time, stopped while the page is hidden or 「続ける」 waits. Frames and timers run
// from one requestAnimationFrame loop, so they stop with it. The driver is the browser's (performance.now and
// requestAnimationFrame); a test passes its own.

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
  /** Stops time (the page hidden): frames and timers wait. */
  pause(): void;
  /** Time runs again from where it stopped. */
  resume(): void;
  /** The play is over: no more frames or timers. */
  stop(): void;
  readonly paused: boolean;
}

/** An input event's time older or newer than this is not the browser's clock: the time of reading it is used. */
const STAMP_TRUST_MS = 1000;

/** A clock that starts now. */
export function createPlayClock(driver: ClockDriver = browserClockDriver): HostClock {
  const startedAt = driver.now();
  let stoppedTime = 0;
  let pausedAt: number | null = null;
  let stopped = false;
  let frameId: number | null = null;
  const frames = new Set<(ms: number) => void>();
  const timers = new Set<{ at: number; callback: () => void }>();
  const now = () => (pausedAt ?? driver.now()) - startedAt - stoppedTime;
  const loop = () => {
    frameId = null;
    if (stopped || pausedAt !== null) return;
    const ms = now();
    for (const timer of [...timers]) if (timers.has(timer) && ms >= timer.at) {
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
      return Math.min(now(), stamp - startedAt - stoppedTime);
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
      unschedule();
    },
    resume() {
      if (stopped || pausedAt === null) return;
      stoppedTime += driver.now() - pausedAt;
      pausedAt = null;
      schedule();
    },
    stop() {
      stopped = true;
      frames.clear();
      timers.clear();
      unschedule();
    },
    get paused() { return pausedAt !== null; },
  };
}
