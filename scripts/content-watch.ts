import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";

// npm run content:watch [-- --with-sample]   /   npm run dev:watch [-- --with-sample]
// Generates the content (npm run content:build) once, then again whenever a
// file below content/ or public/ (and the sample journey with --with-sample)
// changes, so that a running dev server shows edited Ink, JSON and images.
// dev:watch (--dev) also starts the dev server (vite) after the first build and
// stops it together with the watcher. A failed build leaves the previous
// generated files in place (content:build validates before it writes) and the
// watcher keeps waiting for the next change.

/** Temporary files that journey:release and city:bundle write next to their targets before renaming them. */
const toolTemporaryFile = /\.(?:journey-release|journey-rollback|city-bundle|city-rollback)-/u;

/**
 * Whether a changed path (relative to a watched folder) should start a build:
 * not editor swap or backup files, the tools' temporary files, or anything in a
 * dot folder (journey:new prepares a journey in content/journeys/.new-…).
 */
export function triggersRebuild(relative: string): boolean {
  const parts = relative.split(/[\\/]/u).filter(Boolean);
  if (parts.some((part) => part.startsWith("."))) return false;
  const name = parts.at(-1);
  if (!name) return true;
  return !(name.endsWith("~") || name.startsWith("#") || /\.(?:swp|swx|tmp)$/u.test(name) || toolTemporaryFile.test(name));
}

type Timers = { setTimeout: (callback: () => void, ms: number) => unknown; clearTimeout: (handle: unknown) => void };
const realTimers: Timers = { setTimeout: (callback, ms) => setTimeout(callback, ms), clearTimeout: (handle) => clearTimeout(handle as NodeJS.Timeout) };

/**
 * Builds that never overlap: a burst of changes (no change for `delayMs`)
 * starts one build, and any changes during a build start exactly one more
 * after it. A failed build does not stop later ones.
 */
export function createRebuildScheduler(build: () => Promise<unknown>, delayMs = 300, timers: Timers = realTimers) {
  let timer: unknown;
  let running: Promise<void> | undefined;
  let again = false;
  let stopped = false;
  const cancelTimer = () => {
    if (timer !== undefined) timers.clearTimeout(timer);
    timer = undefined;
  };
  const run = (): void => {
    timer = undefined;
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    running = Promise.resolve().then(build).then(() => undefined, () => undefined).finally(() => {
      running = undefined;
      if (again) {
        again = false;
        run();
      }
    });
  };
  return {
    /** A change: build once no further change came for `delayMs`. */
    notify(): void {
      if (stopped) return;
      cancelTimer();
      timer = timers.setTimeout(run, delayMs);
    },
    /** Build now (the first build), or once more after the running one. */
    runNow(): void {
      cancelTimer();
      run();
    },
    /** No more builds: a waiting change and a follow-up are dropped (a running build finishes). */
    stop(): void {
      stopped = true;
      again = false;
      cancelTimer();
    },
    /** Resolves when no build is running or due as a follow-up. */
    async idle(): Promise<void> {
      while (running) await running;
    },
  };
}

const alive = (child: ChildProcess | undefined): child is ChildProcess => !!child && child.exitCode === null && child.signalCode === null;

async function watchContent(root: string, withSample: boolean, dev: boolean): Promise<void> {
  const folders = ["content", "public", ...(withSample ? [SAMPLE_JOURNEY_DIRECTORY] : [])];
  const missing = folders.filter((folder) => !existsSync(path.join(root, folder)));
  if (missing.length) throw new Error(`監視するフォルダーがありません: ${missing.join("、")}（リポジトリの最上位で実行してください）`);
  const changed = new Set<string>();
  let building: ChildProcess | undefined;
  let vite: ChildProcess | undefined;
  let stopping = false;
  const build = () => new Promise<void>((resolve) => {
    const files = [...changed];
    changed.clear();
    if (files.length) console.log(`\ncontent:watch: ${files[0]} ${files.length > 1 ? `ほか ${files.length - 1} 件が` : "が"}変わりました。生成し直します…`);
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/build-content.ts", ...(withSample ? ["--with-sample"] : [])],
      { cwd: root, stdio: "inherit" });
    building = child;
    const done = (ok: boolean) => {
      if (building !== child) return;
      building = undefined;
      if (!stopping) console.log(ok ? "content:watch: 生成しました。変更を待っています（Ctrl+C で終了）。"
        : "content:watch: 生成に失敗しました（生成物は前回のままです）。直して保存すると、生成し直します。");
      resolve();
    };
    child.on("error", (error) => {
      console.error(`content:watch: content:build を始められませんでした: ${error.message}`);
      done(false);
    });
    child.on("exit", (code) => done(code === 0));
  });
  const scheduler = createRebuildScheduler(build);
  const watchers = folders.map((folder) => watch(path.join(root, folder), { recursive: true }, (_event, file) => {
    if (file !== null && !triggersRebuild(String(file))) return;
    changed.add(file === null ? `${folder}/` : `${folder}/${String(file).replaceAll("\\", "/")}`);
    scheduler.notify();
  }));
  const stop = (exitCode: number) => {
    if (stopping) return;
    stopping = true;
    scheduler.stop();
    for (const watcher of watchers) watcher.close();
    // The dev server and a running build stop with the watcher (Ctrl+C reaches them too in a terminal).
    for (const child of [vite, building]) if (alive(child)) child.kill("SIGTERM");
    process.exitCode = exitCode;
    // Leave even if a child ignores the request; the timer alone does not keep the process running.
    setTimeout(() => process.exit(exitCode), 5000).unref();
  };
  for (const watcher of watchers) watcher.on("error", (error) => {
    console.error(`content:watch: 監視を続けられません: ${error.message}`);
    stop(1);
  });
  process.on("SIGINT", () => stop(0));
  process.on("SIGTERM", () => stop(0));

  console.log(`content:watch: ${folders.join("、")} を監視します。最初の生成をしています…`);
  // The first build goes through the scheduler, so a change saved meanwhile gives one more build, never a second one at the same time.
  scheduler.runNow();
  await scheduler.idle();
  if (stopping || !dev) return;
  vite = spawn(process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "0.0.0.0"], { cwd: root, stdio: "inherit" });
  vite.on("error", (error) => {
    console.error(`content:watch: 開発サーバー（vite）を始められませんでした: ${error.message}`);
    stop(1);
  });
  // Quitting the dev server (q, or a crash) also ends the watcher.
  vite.on("exit", (code) => stop(code ?? 0));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--with-sample" && arg !== "--dev")) {
    console.error("使い方: npm run content:watch [-- --with-sample]、または npm run dev:watch [-- --with-sample]");
    process.exitCode = 1;
  } else {
    try {
      await watchContent(process.cwd(), args.includes("--with-sample"), args.includes("--dev"));
    } catch (error) {
      console.error(`content:watch: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  }
}
