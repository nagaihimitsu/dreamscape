import { describe, expect, it, vi } from "vitest";
import { createRebuildScheduler, triggersRebuild } from "./content-watch";

describe("content:watch", () => {
  it("rebuilds for content files, not for editor swap files, the tools' temporary files or dot folders", () => {
    for (const file of ["journeys/milano/stories/tourism/a.ink", "journeys/milano/public/assets/tourism/milano/duomo.jpg",
      "romance/date_catalog.json", "journeys/kyoto"])
      expect(triggersRebuild(file), file).toBe(true);
    for (const file of ["journeys/.new-kyoto-1234-1/manifest.json", "stories/.a.ink.swp", "stories/a.ink~", "stories/#a.ink#", "x.tmp",
      "journeys/milano/cities/milano.json.journey-release-12-34-ab", "journeys/milano/cities/milano.json.journey-rollback-12-34-ab",
      "travel/delhi.json.city-bundle-12-34-ab", "travel/delhi.json.city-rollback-12-34-ab"])
      expect(triggersRebuild(file), file).toBe(false);
  });

  it("runs one build for a burst of changes and exactly one more for changes during a build, never two at once", async () => {
    vi.useFakeTimers();
    try {
      let running = 0, most = 0, builds = 0;
      let finish: () => void = () => {};
      const scheduler = createRebuildScheduler(() => new Promise<void>((resolve) => {
        builds++; running++; most = Math.max(most, running);
        finish = () => { running--; resolve(); };
      }), 300);
      scheduler.notify(); scheduler.notify(); scheduler.notify();
      await vi.advanceTimersByTimeAsync(299);
      expect(builds).toBe(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(builds).toBe(1);
      // Two bursts while the first build runs: one follow-up build after it, not two.
      scheduler.notify(); await vi.advanceTimersByTimeAsync(300);
      scheduler.notify(); await vi.advanceTimersByTimeAsync(300);
      expect(builds).toBe(1);
      finish(); await vi.advanceTimersByTimeAsync(0);
      expect(builds).toBe(2);
      finish(); await scheduler.idle();
      expect(builds).toBe(2);
      expect(most).toBe(1);
    } finally { vi.useRealTimers(); }
  });

  it("counts a change saved during the first build as one follow-up build", async () => {
    vi.useFakeTimers();
    try {
      let running = 0, most = 0, builds = 0;
      const finishers: (() => void)[] = [];
      const scheduler = createRebuildScheduler(() => new Promise<void>((resolve) => {
        builds++; running++; most = Math.max(most, running);
        finishers.push(() => { running--; resolve(); });
      }), 300);
      scheduler.runNow();
      await vi.advanceTimersByTimeAsync(0);
      expect(builds).toBe(1);
      // The watchers already run while the first (slow, uncached) build works.
      scheduler.notify(); await vi.advanceTimersByTimeAsync(300);
      scheduler.notify(); await vi.advanceTimersByTimeAsync(300);
      expect(builds).toBe(1);
      const idle = scheduler.idle();
      finishers.shift()!(); await vi.advanceTimersByTimeAsync(0);
      expect(builds).toBe(2);
      finishers.shift()!();
      await idle;
      expect([builds, most]).toEqual([2, 1]);
    } finally { vi.useRealTimers(); }
  });

  it("keeps watching after a failed build and builds nothing after stop", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const scheduler = createRebuildScheduler(async () => { calls++; if (calls === 1) throw new Error("broken Ink"); }, 300);
      scheduler.notify(); await vi.advanceTimersByTimeAsync(300); await scheduler.idle();
      scheduler.notify(); await vi.advanceTimersByTimeAsync(300); await scheduler.idle();
      expect(calls).toBe(2);
      scheduler.notify();
      scheduler.stop();
      await vi.advanceTimersByTimeAsync(1000);
      scheduler.notify(); scheduler.runNow();
      await vi.advanceTimersByTimeAsync(1000); await scheduler.idle();
      expect(calls).toBe(2);
    } finally { vi.useRealTimers(); }
  });
});
