import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createRebuildScheduler, triggersRebuild, watchFolderTree } from "./content-watch";

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

  it("sees every save of a file on the real file system, also after it was replaced by a rename, and in folders added later", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "dreamscape-watch-"));
    const write = (file: string, text: string) => {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), text);
    };
    write("cities/milano.json", "{}\n");
    mkdirSync(path.join(root, "journeys"));
    const events: (string | null)[] = [];
    const errors: Error[] = [];
    const watcher = watchFolderTree(root, (file) => events.push(file), (error) => errors.push(error));
    let markers = 0;
    // A marker file written after the previous step: once it is reported, so is everything before it.
    const settle = async () => {
      const marker = `cities/settled-${++markers}`;
      write(marker, "");
      await vi.waitFor(() => expect(events).toContain(marker), { timeout: 5000, interval: 10 });
      events.length = 0;
    };
    const expectRebuildFor = async (file: string, save: () => void) => {
      await settle();
      save();
      await vi.waitFor(() => expect(events.filter((event) => event === null || triggersRebuild(event))).toContain(file), { timeout: 5000, interval: 10 });
    };
    // As city:bundle apply and journey:release --apply write: a temporary file next to the target, renamed over it.
    const replace = (file: string, temporary: string, text: string) => {
      write(temporary, text);
      renameSync(path.join(root, temporary), path.join(root, file));
    };
    try {
      await expectRebuildFor("cities/milano.json", () => write("cities/milano.json", "{\"a\":1}\n"));
      await expectRebuildFor("cities/milano.json", () => replace("cities/milano.json", "cities/milano.json.city-bundle-1-2-ab", "{\"a\":2}\n"));
      await expectRebuildFor("cities/milano.json", () => write("cities/milano.json", "{\"a\":3}\n"));
      await expectRebuildFor("cities/milano.json", () => replace("cities/milano.json", "cities/milano.json.journey-release-1-2-ab", "{\"a\":4}\n"));
      await expectRebuildFor("cities/milano.json", () => write("cities/milano.json", "{\"a\":5}\n"));
      // An editor's safe write from a dot file, and sed -i's temporary name.
      await expectRebuildFor("cities/milano.json", () => replace("cities/milano.json", "cities/.milano.json.tmp", "{\"a\":6}\n"));
      await expectRebuildFor("cities/milano.json", () => replace("cities/milano.json", "cities/sedAb12Cd", "{\"a\":7}\n"));
      await expectRebuildFor("cities/milano.json", () => write("cities/milano.json", "{\"a\":8}\n"));
      // journey:new prepares a journey in a dot folder and renames it into place; saves inside are seen afterwards.
      await expectRebuildFor("journeys/kyoto", () => {
        write("journeys/.new-kyoto-1/cities/kyoto.json", "{}\n");
        renameSync(path.join(root, "journeys/.new-kyoto-1"), path.join(root, "journeys/kyoto"));
      });
      await expectRebuildFor("journeys/kyoto/cities/kyoto.json", () => write("journeys/kyoto/cities/kyoto.json", "{\"b\":1}\n"));
      // A folder removed and made again under the same name.
      await expectRebuildFor("journeys/kyoto", () => rmSync(path.join(root, "journeys/kyoto"), { recursive: true }));
      await expectRebuildFor("journeys/kyoto", () => write("journeys/kyoto/cities/kyoto.json", "{}\n"));
      await expectRebuildFor("journeys/kyoto/cities/kyoto.json", () => write("journeys/kyoto/cities/kyoto.json", "{\"b\":2}\n"));
      expect(errors).toEqual([]);
    } finally {
      watcher.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
