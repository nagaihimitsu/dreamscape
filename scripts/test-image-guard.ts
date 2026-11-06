import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { publicRoots } from "./content-sources";

// prepareContentFixture (src/content/test-fixtures.ts) links each journey's
// images into its fixtures instead of copying them, so a test that writes over
// such a link changes the repository's file. The unit test run (vitest
// globalSetup) records every journey image before the tests and fails the run
// when one of them changed.

/** Size and modification time of every file in the journeys' public folders, by path. */
export function journeyImageStates(root: string): Map<string, string> {
  const states = new Map<string, string>();
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else {
        const stat = statSync(file);
        states.set(file, `${stat.size}:${stat.mtimeMs}`);
      }
    }
  };
  for (const directory of publicRoots(root)) if (directory !== path.join(root, "public")) visit(directory);
  return states;
}

/** The files whose state differs between `before` and `after`, added and removed ones included. */
export function changedFiles(before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): string[] {
  return [...new Set([...before.keys(), ...after.keys()])].filter((file) => before.get(file) !== after.get(file)).sort();
}

export default function setup() {
  const root = path.resolve(".");
  const before = journeyImageStates(root);
  return () => {
    const changed = changedFiles(before, journeyImageStates(root));
    if (changed.length)
      throw new Error(`Journey images changed during the unit tests (a test may have written through a fixture link; ` +
        `use replaceFixtureFile from src/content/test-fixtures.ts): ${changed.map((file) => path.relative(root, file)).join(", ")}`);
  };
}
