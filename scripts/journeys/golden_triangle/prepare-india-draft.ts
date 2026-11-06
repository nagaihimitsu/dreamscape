import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildIndiaDraft, indiaDraftDirectory, serializeIndiaDraft } from "./india-draft";

const args = process.argv.slice(2);
if (args.length !== 1 || !["--write", "--check"].includes(args[0])) {
  throw new Error("Usage: npx tsx scripts/journeys/golden_triangle/prepare-india-draft.ts --check|--write");
}
const draft = buildIndiaDraft();
for (const [name, value] of Object.entries(draft)) {
  const file = path.join(indiaDraftDirectory, name);
  const content = serializeIndiaDraft(value);
  if (args[0] === "--check") {
    let actual: string;
    try { actual = readFileSync(file, "utf8"); }
    catch { throw new Error(`Draft file is missing: ${name}`); }
    if (actual !== content) throw new Error(`Draft differs from its source: ${name}; regenerate with --write after reviewing changes`);
  } else {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}
console.log(`India draft ${args[0] === "--check" ? "verified" : "generated"}: ${Object.keys(draft).length} files; authoring only.`);
