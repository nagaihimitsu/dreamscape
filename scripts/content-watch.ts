import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync, statSync, watch, type FSWatcher } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";

// npm run content:watch [-- --with-sample]   /   npm run dev:watch [-- --with-sample]
// Generates the content (npm run content:build) once, then again whenever a
// file below content/ or public/ (and the sample journey with --with-sample)
// changes, so that a running dev server shows edited Ink, JSON and images.
// dev:watch (--dev) also starts the dev server (vite) after the first build that
// succeeds (as `npm run dev` does not start it when its content:build fails) and
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

/**
 * Builds that never overlap: a burst of changes (no change for `delayMs`)
 * starts one build, and any changes during a build start exactly one more
 * after it. A failed build does not stop later ones.
 */
export function createRebuildScheduler(build: () => Promise<unknown>, delayMs = 300) {
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> | undefined;
  let again = false;
  let stopped = false;
  const cancelTimer = () => {
    clearTimeout(timer);
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
      timer = setTimeout(run, delayMs);
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

const isFolder = (file: string) => statSync(file, { throwIfNoEntry: false })?.isDirectory() ?? false;

/**
 * Watches `folder` and everything below it; `onChange` gets each changed path
 * relative to `folder` ("/" separators; null when the system does not name it).
 *
 * On Linux this uses one non-recursive watcher per folder (dot folders left
 * out) and adds watchers for folders that appear later. Node's recursive
 * watcher there watches each file's inode, so after a file was replaced by a
 * rename (city:bundle and journey:release write a temporary file and rename
 * it, and so do `sed -i` and editors that save safely) it reports no more saves
 * of that file; a folder's own watcher reports every write by the file's name.
 * Elsewhere Node's recursive watcher uses the system's own (macOS FSEvents,
 * Windows ReadDirectoryChangesW), which follows names, and it does not hold every
 * subfolder open.
 */
export function watchFolderTree(folder: string, onChange: (relative: string | null) => void, onError: (error: Error) => void): { close(): void } {
  if (process.platform !== "linux") {
    const watcher = watch(folder, { recursive: true }, (_event, file) => onChange(file === null ? null : String(file).replaceAll("\\", "/")));
    watcher.on("error", onError);
    return { close: () => watcher.close() };
  }
  /** Watchers by folder, relative to `folder` ("" is `folder` itself). */
  const watchers = new Map<string, FSWatcher>();
  let closed = false;
  const unwatch = (relative: string) => {
    for (const [key, watcher] of watchers)
      if (key === relative || key.startsWith(`${relative}/`)) {
        watcher.close();
        watchers.delete(key);
      }
  };
  const add = (relative: string): void => {
    if (closed || watchers.has(relative)) return;
    const absolute = path.join(folder, relative);
    try {
      const watcher = watch(absolute, (event, name) => changed(relative, event, name === null ? null : String(name)));
      // A folder removed meanwhile only ends its watchers; any other failure ends watching.
      watcher.on("error", (error) => (isFolder(absolute) ? fail(error) : unwatch(relative)));
      watchers.set(relative, watcher);
      for (const entry of readdirSync(absolute, { withFileTypes: true }))
        if (entry.isDirectory() && !entry.name.startsWith(".")) add(relative ? `${relative}/${entry.name}` : entry.name);
    } catch (error) {
      if (isFolder(absolute)) fail(error instanceof Error ? error : new Error(String(error)));
      else unwatch(relative);
    }
  };
  // Reported after watchFolderTree has returned, so the caller can close what it started.
  const fail = (error: Error) => queueMicrotask(() => {
    if (!closed) onError(error);
  });
  const changed = (parent: string, event: string, name: string | null) => {
    if (closed) return;
    if (name === null) return onChange(parent ? `${parent}/` : null);
    const relative = parent ? `${parent}/${name}` : name;
    // A folder that appeared, was renamed, replaced or removed: watch what is there now.
    if (event === "rename") {
      unwatch(relative);
      if (!name.startsWith(".") && isFolder(path.join(folder, relative))) add(relative);
    }
    onChange(relative);
  };
  add("");
  return {
    close() {
      closed = true;
      for (const watcher of watchers.values()) watcher.close();
      watchers.clear();
    },
  };
}

const alive = (child: ChildProcess | undefined): child is ChildProcess => !!child && child.exitCode === null && child.signalCode === null;

function watchContent(root: string, withSample: boolean, dev: boolean): void {
  const folders = ["content", "public", ...(withSample ? [SAMPLE_JOURNEY_DIRECTORY] : [])];
  const missing = folders.filter((folder) => !existsSync(path.join(root, folder)));
  if (missing.length) throw new Error(`監視するフォルダがありません: ${missing.join("、")}（リポジトリの最上位で実行してください）`);
  const changed = new Set<string>();
  let building: ChildProcess | undefined;
  let vite: ChildProcess | undefined;
  let stopping = false;
  const startDevServer = () => {
    vite = spawn(process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "0.0.0.0"], { cwd: root, stdio: "inherit" });
    vite.on("error", (error) => {
      console.error(`content:watch: 開発サーバー（vite）を始められませんでした: ${error.message}`);
      stop(1);
    });
    // Quitting the dev server (q, or a crash) also ends the watcher.
    vite.on("exit", (code) => stop(code ?? 0));
  };
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
      if (!stopping) {
        console.log(ok ? "content:watch: 生成しました。変更を待っています（Ctrl+C で終了）。"
          : `content:watch: 生成に失敗しました（生成物は前回のままです）。直して保存すると、生成し直します。${dev && !vite ? "開発サーバーは、生成に成功してから始めます。" : ""}`);
        if (ok && dev && !vite) startDevServer();
      }
      resolve();
    };
    child.on("error", (error) => {
      console.error(`content:watch: content:build を始められませんでした: ${error.message}`);
      done(false);
    });
    child.on("exit", (code) => done(code === 0));
  });
  const scheduler = createRebuildScheduler(build);
  const watchers: { close(): void }[] = [];
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
  for (const folder of folders) watchers.push(watchFolderTree(path.join(root, folder), (file) => {
    if (file !== null && !triggersRebuild(file)) return;
    changed.add(file === null ? `${folder}/` : `${folder}/${file}`);
    scheduler.notify();
  }, (error) => {
    console.error(`content:watch: 監視を続けられません: ${error.message}`);
    stop(1);
  }));
  process.on("SIGINT", () => stop(0));
  process.on("SIGTERM", () => stop(0));

  console.log(`content:watch: ${folders.join("、")} を監視します。最初の生成をしています…`);
  // The first build goes through the scheduler, so a change saved meanwhile gives one more build, never a second one at the same time.
  scheduler.runNow();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--with-sample" && arg !== "--dev")) {
    console.error("使い方: npm run content:watch [-- --with-sample]、または npm run dev:watch [-- --with-sample]");
    process.exitCode = 1;
  } else {
    try {
      watchContent(process.cwd(), args.includes("--with-sample"), args.includes("--dev"));
    } catch (error) {
      console.error(`content:watch: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  }
}
