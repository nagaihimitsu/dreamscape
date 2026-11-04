import { createHash } from "node:crypto";
import { closeSync, existsSync, linkSync, lstatSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { indiaInputFingerprint } from "./promote-india";

export const decisionFile = "authoring/research/golden-triangle-transit-20261103/decisions.json";
export const catalogFiles = ["content/romance/presentation.json", "content/tourism/catalog.json", "content/romance/date_destinations.json"] as const;
export const cityFiles = (id: string) => [`content/cities/${id}.json`, `content/travel/${id}.json`, `content/travel/${id}-settings.json`];
export const read = (root: string, file: string): any => JSON.parse(readFileSync(path.join(root, file), "utf8"));

/** Fingerprint the actual validation inputs, including India transit decisions if present. */
export function inputFingerprint(root: string, ignored: ReadonlySet<string> = new Set()): string {
  const h = createHash("sha256").update(indiaInputFingerprint(root, ignored));
  const file = path.join(root, decisionFile);
  if (existsSync(file)) {
    if (lstatSync(file).isSymbolicLink()) throw new Error("Transit decisions must not be a symlink");
    h.update("transit\0").update(readFileSync(file));
  } else h.update("missing-transit\0");
  return h.digest("hex");
}
export function existing(root: string, id: string): boolean {
  const present = cityFiles(id).map((file) => existsSync(path.join(root, file)));
  if (present.some(Boolean) && !present.every(Boolean)) throw new Error(`Incomplete city file set: ${id}`);
  return present.every(Boolean);
}

/** Transaction: stage all results, verify the snapshot again, and roll back on rename failure. */
export function writeCityBundleFiles(root: string, original: Record<string, string | null>, next: Record<string, string>, fingerprint: string,
  move: typeof renameSync = renameSync, createLink: typeof linkSync = linkSync) {
  const files = Object.keys(next);
  const allowed = /^content\/(?:cities\/[a-z][a-z0-9_]*\.json|travel\/[a-z][a-z0-9_]*(?:-settings)?\.json|romance\/(?:presentation|date_destinations)\.json|tourism\/catalog\.json)$/;
  if (files.some((file) => (!allowed.test(file) && file !== decisionFile) || !Object.hasOwn(original, file) || typeof next[file] !== "string"))
    throw new Error("Invalid city bundle file set");
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const staged: string[] = [], changed: string[] = [];
  const ignored = new Set<string>();
  // Only one city-bundle apply may write at a time. Other editing tools must
  // still be protected by the content fingerprint and by file comparisons.
  const lockPath = path.join(root, ".city-bundle.lock");
  let lock: number;
  try { lock = openSync(lockPath, "wx", 0o600); }
  catch (error) { throw new Error("Another city bundle apply is in progress (or its lock needs recovery)", { cause: error }); }
  try {
    if (inputFingerprint(root) !== fingerprint) throw new Error("Content or assets changed during validation");
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
    closeSync(lock);
    rmSync(lockPath, { force: true });
  }
}

