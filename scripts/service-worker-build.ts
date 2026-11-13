import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build, type Plugin } from "vite";
// With their extensions: vite.config.ts imports this module (Vite's native config loader asks for them).
import { fileRule } from "../src/sw/cache-rules.ts";
import { eagerFiles } from "./dist-guard.ts";

/** The service worker in the production build, beside index.html (src/app/service-worker.ts registers it). */
export const SERVICE_WORKER_FILE = "sw.js";
const SOURCE = "src/sw/service-worker.ts";

/** A built file as the versions read it: its path in the build and its bytes. */
export type BuiltFile = { path: string; bytes: Buffer };

/**
 * The versions of the worker's caches (src/sw/cache-rules.ts cacheNames): a hash of the path and content of every built
 * file its rule keeps, per cache. A build that changes no picture or sound keeps the media version, so a player's
 * cached pictures and sounds stay; any change of one makes the next worker drop them and fetch them anew.
 */
export function cacheVersions(files: readonly BuiltFile[]): { code: string; media: string } {
  const hashes = { code: createHash("sha256"), media: createHash("sha256") };
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    const rule = fileRule(file.path);
    if (rule !== "code" && rule !== "media") continue;
    hashes[rule].update(`${file.path}\0${createHash("sha256").update(file.bytes).digest("hex")}\n`);
  }
  return { code: hashes.code.digest("hex").slice(0, 16), media: hashes.media.digest("hex").slice(0, 16) };
}

/** The page's entry script (`assets/index-….js`): the worker of a version takes over when a page of that version asks. */
export function entryScript(indexHtml: string): string {
  const entry = eagerFiles(indexHtml).find((file) => file.endsWith(".js"));
  if (!entry) throw new Error("index.html has no module script for the service worker to name.");
  return entry;
}

function listFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
}

/**
 * Vite plugin (production builds only): once the build is written, bundle src/sw/service-worker.ts into
 * `<outDir>/sw.js` (a classic script, as every browser runs one) with the versions of the built files and the entry
 * script. Nothing is added to the game's own files.
 */
export function serviceWorkerPlugin(): Plugin {
  let outDir = "";
  let root = "";
  return {
    name: "dreamscape-service-worker",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const indexFile = path.join(outDir, "index.html");
      if (!existsSync(indexFile)) return;
      const files = listFiles(outDir).filter((file) => file !== SERVICE_WORKER_FILE)
        .map((file) => ({ path: file, bytes: readFileSync(path.join(outDir, file)) }));
      const versions = cacheVersions(files);
      const output = await build({
        configFile: false,
        root,
        logLevel: "warn",
        publicDir: false,
        define: {
          __SW_CODE_VERSION__: JSON.stringify(versions.code),
          __SW_MEDIA_VERSION__: JSON.stringify(versions.media),
          __SW_ENTRY__: JSON.stringify(entryScript(readFileSync(indexFile, "utf8"))),
        },
        build: {
          write: false,
          minify: true,
          lib: { entry: path.join(root, SOURCE), formats: ["iife"], name: "dreamscapeServiceWorker", fileName: () => SERVICE_WORKER_FILE },
        },
      });
      const chunk = (Array.isArray(output) ? output : [output]).flatMap((result) => "output" in result ? result.output : [])
        .find((item) => item.type === "chunk");
      if (!chunk || chunk.type !== "chunk") throw new Error(`The service worker (${SOURCE}) was not built.`);
      writeFileSync(path.join(outDir, SERVICE_WORKER_FILE), chunk.code);
    },
  };
}
