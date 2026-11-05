import { createHash } from "node:crypto";
import { closeSync, existsSync, linkSync, lstatSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { indiaInputFingerprint } from "./promote-india";
import { cityTransitFile } from "./journey-transit-review";
import { cityLayer, displayPath, loadContentSources, readJourneyCatalog, type ContentLayer, type ContentSources } from "./content-sources";
import type { MergedKind } from "./content-layout";
import { createParentDirectories, removeCreatedDirectories } from "./created-directories";

export const decisionFile = "authoring/research/golden-triangle-transit-20261103/decisions.json";
/** The catalogs a city bundle edits, written to the layer that owns the city. */
export const bundleCatalogKinds = ["romance/presentation.json", "tourism/catalog.json", "romance/date_destinations.json"] as const satisfies readonly MergedKind[];
/** Root-relative posix directory of a content layer: `content` or `content/journeys/<journeyId>`. */
export const layerPath = (root: string, layer: ContentLayer) => displayPath(root, layer.directory);
/** A city's own files (city, travel, travel settings) in the layer at `layer` (see layerPath). */
export const cityFiles = (layer: string, id: string) => [`${layer}/cities/${id}.json`, `${layer}/travel/${id}.json`, `${layer}/travel/${id}-settings.json`];
export const read = (root: string, file: string): any => JSON.parse(readFileSync(path.join(root, file), "utf8"));

/** Fingerprint the actual validation inputs, including India transit decisions if present. */
export function inputFingerprint(root: string, ignored: ReadonlySet<string> = new Set()): string {
  const h = createHash("sha256").update(indiaInputFingerprint(root, ignored));
  const file = path.join(root, decisionFile);
  if (existsSync(file)) {
    if (lstatSync(file).isSymbolicLink()) throw new Error("Transit decisions must not be a symlink");
    h.update("transit\0").update(readFileSync(file));
  } else h.update("missing-transit\0");
  for (const city of readJourneyCatalog(root).journeys.flatMap((journey) => journey.cities)) {
    const ledger = cityTransitFile(root, city.id);
    if (!ledger) continue;
    const absolute = path.join(root, ledger);
    h.update(ledger).update("\0");
    if (existsSync(absolute)) {
      if (lstatSync(absolute).isSymbolicLink()) throw new Error("Transit decisions must not be a symlink");
      h.update(readFileSync(absolute));
    } else h.update("missing");
  }
  return h.digest("hex");
}
/** Whether a city's files exist (a travel file without its city file is rejected by the loader). */
export function existing(sources: ContentSources, id: string): boolean {
  const city = sources.cities.find((item) => item.id === id);
  if (!city) return false;
  if (!existsSync(city.travelFile) || !existsSync(city.settingsFile)) throw new Error(`Incomplete city file set: ${id}`);
  return true;
}

// Files a bundle may write: one city's own files and the bundle catalogs, all in one content layer.
const layerFile = /^(content(?:\/journeys\/[a-z][a-z0-9_]*)?)\/(?:cities\/([a-z][a-z0-9_]*)\.json|travel\/([a-z][a-z0-9_]*)(?:-settings)?\.json|romance\/(?:presentation|date_destinations)\.json|tourism\/catalog\.json)$/;

/** True when every content file of a write set belongs to one existing layer, the owner layer of each city of it (see cityLayer). */
function inOneOwnerLayer(sources: ContentSources, files: readonly string[]): boolean {
  const matches = files.map((file) => layerFile.exec(file)).filter((match) => match !== null);
  const layers = new Set(matches.map((match) => match[1]));
  if (layers.size > 1) return false;
  const [layer] = layers;
  if (layer === undefined) return true;
  if (!sources.layers.some((entry) => layerPath(sources.root, entry) === layer)) return false;
  // A new city belongs to the layer of its journey (manifest), not to any registered folder.
  return matches.every((match) => {
    const cityId = match[2] ?? match[3];
    return cityId === undefined || layerPath(sources.root, cityLayer(sources, cityId)) === layer;
  });
}

/** Transaction: stage all results, verify the snapshot again, and roll back on rename failure. */
export function writeCityBundleFiles(root: string, original: Record<string, string | null>, next: Record<string, string>, fingerprint: string,
  move: typeof renameSync = renameSync, createLink: typeof linkSync = linkSync) {
  const files = Object.keys(next);
  const extraLedgers = new Set(readJourneyCatalog(root).journeys.flatMap((journey) => journey.cities)
    .map((city) => cityTransitFile(root, city.id)).filter(Boolean));
  if (files.some((file) => (!layerFile.test(file) && file !== decisionFile && !extraLedgers.has(file)) || !Object.hasOwn(original, file) || typeof next[file] !== "string")
    || !inOneOwnerLayer(loadContentSources(root), files))
    throw new Error("Invalid city bundle file set");
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const staged: string[] = [], changed: string[] = [];
  const ignored = new Set<string>();
  let created: string[] = [];
  let committed = false;
  // Only one city-bundle apply may write at a time. Other editing tools must
  // still be protected by the content fingerprint and by file comparisons.
  const lockPath = path.join(root, ".city-bundle.lock");
  let lock: number;
  try { lock = openSync(lockPath, "wx", 0o600); }
  catch (error) { throw new Error("Another city bundle apply is in progress (or its lock needs recovery)", { cause: error }); }
  try {
    if (inputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during validation");
    // The owner layer may not have this kind of file yet (e.g. a journey's first tourism catalog).
    created = createParentDirectories(root, files);
    for (const directory of created) ignored.add(directory);
    for (const file of files) {
      const target = path.join(root, file), before = original[file];
      if ((existsSync(target) ? readFileSync(target, "utf8") : null) !== before) throw new Error(`File changed during validation: ${file}`);
      const tmp = `${target}.city-bundle-${token}`;
      writeFileSync(tmp, next[file], { flag: "wx", mode: before === null ? 0o644 : statSync(target).mode });
      staged.push(tmp); ignored.add(path.relative(root, tmp));
    }
    for (const file of files) {
      const target = path.join(root, file);
      if ((existsSync(target) ? readFileSync(target, "utf8") : null) !== original[file]) throw new Error(`File changed during validation: ${file}`);
    }
    if (inputFingerprint(root, ignored) !== fingerprint) throw new Error("Content or assets changed during validation");
    for (const file of files) {
      const target = path.join(root, file), tmp = `${target}.city-bundle-${token}`;
      if (original[file] === null) {
        // link() is create-only: a competing creator cannot be overwritten.
        createLink(tmp, target);
        changed.push(file);
        rmSync(tmp);
      } else {
        move(tmp, target);
        changed.push(file);
      }
    }
    committed = true;
  } catch (error) {
    const failures: string[] = [];
    for (const file of changed.reverse()) {
      const target = path.join(root, file), before = original[file];
      try {
        // An unrelated editor may have changed our output after the rename.
        // Never overwrite or remove their later changes during rollback.
        if (!existsSync(target) || readFileSync(target, "utf8") !== next[file]) {
          failures.push(file);
          continue;
        }
        if (before === null) rmSync(target);
        else {
          const tmp = `${target}.city-rollback-${token}`;
          writeFileSync(tmp, before, { flag: "wx", mode: statSync(target).mode });
          renameSync(tmp, target);
        }
      } catch { failures.push(file); }
    }
    if (failures.length) throw new Error(`City bundle rollback failed: ${failures.join(", ")}`, { cause: error });
    throw error;
  } finally {
    for (const tmp of staged) if (existsSync(tmp)) rmSync(tmp, { force: true });
    if (!committed) removeCreatedDirectories(root, created);
    closeSync(lock);
    rmSync(lockPath, { force: true });
  }
}

