// TEMPORARY equivalence harness for the journey-folder refactor (phases P2-P9).
// Delete together with scripts/dev/refactor-baseline.ts in phase P10.
//
// Skipped unless REFACTOR_BASELINE is "write" or "check". It runs under vitest so that
// import.meta.glob in the content modules works exactly as in the game.
//   write: dump runtime data to $REFACTOR_BASELINE_DIR/runtime
//   check: dump to $REFACTOR_ACTUAL_DIR/runtime and compare file by file with the baseline
// Usually started by `npx tsx scripts/dev/refactor-baseline.ts write|check`.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const mode = process.env.REFACTOR_BASELINE;
const enabled = mode === "write" || mode === "check";
const scratch = process.env.REFACTOR_SCRATCH ??
  "/tmp/claude-0/-home-user-dreamscape/166acf5d-4176-5db4-b7ac-26f10be92c60/scratchpad";
const baselineDir = path.join(process.env.REFACTOR_BASELINE_DIR ?? path.join(scratch, "refactor-baseline"), "runtime");
const actualDir = path.join(process.env.REFACTOR_ACTUAL_DIR ?? path.join(scratch, "refactor-check"), "runtime");
const targetDir = mode === "write" ? baselineDir : actualDir;

/** Key-order-preserving JSON dump. */
const dumpJson = (value: unknown): string => `${JSON.stringify(value, null, 2) ?? JSON.stringify("[undefined]")}\n`;

function listFiles(root: string, dir = ""): string[] {
  if (!existsSync(path.join(root, dir))) return [];
  return readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      return entry.isDirectory() ? listFiles(root, rel) : [rel];
    })
    .sort();
}

function describeJsonDiff(expected: unknown, actual: unknown): string {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const first = expected.findIndex((item, index) => JSON.stringify(item) !== JSON.stringify(actual[index]));
    return `array length ${expected.length} -> ${actual.length}; first differing index ${first === -1 ? expected.length : first}`;
  }
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    const before = expected as Record<string, unknown>, after = actual as Record<string, unknown>;
    const removed = Object.keys(before).filter((key) => !Object.hasOwn(after, key));
    const added = Object.keys(after).filter((key) => !Object.hasOwn(before, key));
    const changed = Object.keys(before).filter((key) => Object.hasOwn(after, key) &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const order = removed.length + added.length + changed.length === 0 ? " (key order only)" : "";
    const show = (keys: string[]) => keys.slice(0, 20).join(", ") + (keys.length > 20 ? ` …(+${keys.length - 20})` : "");
    return `removed [${show(removed)}] added [${show(added)}] changed [${show(changed)}]${order}`;
  }
  return `${JSON.stringify(expected)?.slice(0, 200)} -> ${JSON.stringify(actual)?.slice(0, 200)}`;
}

/** Writes one capture category and, in check mode, returns its differences from the baseline. */
function capture(category: string, files: Record<string, unknown>): string[] {
  for (const [name, value] of Object.entries(files)) {
    const file = path.join(targetDir, category, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, dumpJson(value));
  }
  if (mode !== "check") return [];
  const expectedFiles = listFiles(path.join(baselineDir, category));
  if (expectedFiles.length === 0) return [`${category}: no baseline (run write mode first)`];
  const actualFiles = listFiles(path.join(actualDir, category));
  const differences = [
    ...expectedFiles.filter((file) => !actualFiles.includes(file)).map((file) => `${category}/${file}: missing`),
    ...actualFiles.filter((file) => !expectedFiles.includes(file)).map((file) => `${category}/${file}: unexpected new file`),
  ];
  for (const file of expectedFiles.filter((name) => actualFiles.includes(name))) {
    const expected = readFileSync(path.join(baselineDir, category, file), "utf8");
    const actual = readFileSync(path.join(actualDir, category, file), "utf8");
    if (expected !== actual)
      differences.push(`${category}/${file}: ${describeJsonDiff(JSON.parse(expected), JSON.parse(actual))}`);
  }
  return differences;
}

/** One file per data export; functions appear only in _exports.json. */
function exportFiles(moduleExports: Record<string, unknown>): Record<string, unknown> {
  const files: Record<string, unknown> = {
    // Sorted: declaration order is not content.
    "_exports.json": Object.fromEntries(Object.keys(moduleExports).sort().map((name) => [name, typeof moduleExports[name]])),
  };
  for (const [name, value] of Object.entries(moduleExports))
    if (typeof value !== "function") files[`${name}.json`] = value;
  return files;
}

describe.skipIf(!enabled)(`refactor equivalence (${mode ?? "disabled"})`, () => {
  beforeAll(() => rmSync(targetDir, { recursive: true, force: true }));

  it("runtime exports of src/content/index.ts", async () => {
    expect(capture("exports/content-index", exportFiles(await import("./content/index")))).toEqual([]);
  });

  it("runtime exports of src/content/journeys.ts", async () => {
    expect(capture("exports/content-journeys", exportFiles(await import("./content/journeys")))).toEqual([]);
  });

  it("runtime exports of src/content/encounters.ts", async () => {
    expect(capture("exports/content-encounters", exportFiles(await import("./content/encounters")))).toEqual([]);
  });

  it("getCities() order and tagContext", async () => {
    const { getCities, tagContext } = await import("./content/index");
    const cities = getCities();
    expect(capture("cities", {
      "get-cities.json": { order: cities.map((city) => city.id), cities },
      "tag-context.json": tagContext,
    })).toEqual([]);
  });

  it("battle, tourism, story and encounter fingerprints", async () => {
    const { battles, landmarks, stories } = await import("./content/index");
    const { encounters } = await import("./content/encounters");
    const { battleFingerprint } = await import("./domain/battle");
    const { tourismFingerprint } = await import("./domain/tourism");
    const { encounterFingerprint } = await import("./domain/encounter");
    const { storyFingerprint } = await import("./story/runtime");
    expect(capture("fingerprints", {
      "battles.json": Object.fromEntries(battles.map(({ id }) => [id, battleFingerprint(id)])),
      "tourism.json": Object.fromEntries(landmarks.map(({ id }) => [id, tourismFingerprint(id)])),
      "stories.json": Object.fromEntries(Object.keys(stories).map((id) => [id, storyFingerprint(id)])),
      "encounters.json": Object.fromEntries(encounters.encounters.map((event) => [event.id, encounterFingerprint(event)])),
    })).toEqual([]);
  });

  it("journeyStorage physical keys", async () => {
    const { journeys } = await import("./content/journeys");
    const { journeyStorage } = await import("./persistence/journey-storage");
    const { LEARNING_KEY, SAVE_KEY } = await import("./persistence");
    const base = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
    const keys = Object.fromEntries(journeys.map(({ id }) => {
      const storage = journeyStorage(base, id);
      return [id, {
        save: storage.physicalKey(SAVE_KEY),
        backupPrefix: storage.physicalKey(`${SAVE_KEY}.backup.`),
        learning: storage.physicalKey(LEARNING_KEY),
      }];
    }));
    expect(capture("persistence", { "journey-storage.json": keys })).toEqual([]);
  });
});
