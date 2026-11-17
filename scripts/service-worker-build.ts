import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build, type Plugin } from "vite";
// With their extensions: vite.config.ts imports this module (Vite's native config loader asks for them).
import { fileRule } from "../src/sw/cache-rules.ts";
import { OFFLINE_LIST_FILE } from "../src/offline/list.ts";
import { entryScript } from "./dist-guard.ts";
import { readJourneyFiles } from "./journey-files.ts";
import { playableJourneys } from "./journey-parts-build.ts";
import { builtFile, offlineList, releaseNumber, type BuiltFile } from "./offline-list-build.ts";

export { entryScript };

/** The service worker in the production build, beside index.html (src/app/service-worker.ts registers it). */
export const SERVICE_WORKER_FILE = "sw.js";
const SOURCE = "src/sw/service-worker.ts";

/**
 * The versions of the worker's caches (src/sw/cache-rules.ts cacheNames): a hash of the path and content (its
 * SHA-256, in hex) of every built file its rule keeps, per cache. A build that changes no picture or sound keeps the
 * media version, so a player's cached pictures and sounds stay; any change of one makes the next worker drop them and
 * fetch them anew.
 */
export function cacheVersions(files: readonly Pick<BuiltFile, "path" | "sha256">[]): { code: string; media: string } {
  const hashes = { code: createHash("sha256"), media: createHash("sha256") };
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    const rule = fileRule(file.path);
    if (rule !== "code" && rule !== "media") continue;
    hashes[rule].update(`${file.path}\0${file.sha256}\n`);
  }
  return { code: hashes.code.digest("hex").slice(0, 16), media: hashes.media.digest("hex").slice(0, 16) };
}

function listFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
}

/**
 * Vite plugin (production builds only): once the build is written, write the list of its files for 「オフラインで遊ぶ」
 * (`<outDir>/offline-files.json`, scripts/offline-list-build.ts) and bundle src/sw/service-worker.ts into
 * `<outDir>/sw.js` (a classic script, as every browser runs one) with the versions of the built files and the entry
 * script. Every built file is read and hashed once, for the versions and the list. Nothing is added to the game's own
 * files.
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
      const indexHtml = readFileSync(indexFile, "utf8");
      // After the withheld files' plugin copied the served files (its writeBundle): the build as it is published.
      const files = listFiles(outDir).filter((file) => file !== SERVICE_WORKER_FILE).map((file) => builtFile(file, readFileSync(path.join(outDir, file))));
      const versions = cacheVersions(files);
      const list = offlineList({
        files, indexHtml, owners: readJourneyFiles(root), playable: playableJourneys(root), release: releaseNumber(process.env.DREAMSCAPE_RELEASE),
      });
      writeFileSync(path.join(outDir, OFFLINE_LIST_FILE), `${JSON.stringify(list)}\n`);
      const output = await build({
        configFile: false,
        root,
        logLevel: "warn",
        publicDir: false,
        define: {
          __SW_CODE_VERSION__: JSON.stringify(versions.code),
          __SW_MEDIA_VERSION__: JSON.stringify(versions.media),
          __SW_ENTRY__: JSON.stringify(entryScript(indexHtml)),
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
