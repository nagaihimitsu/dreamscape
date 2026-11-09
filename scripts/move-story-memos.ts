import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "./content-layout";

// npm run story:move-memos -- --journey <journeyId> --from <storyId> --to <storyId> [--write]
// When a scene moves into a place file (the unified event design, stage 3a), its lines' expression and
// reaction memos (presentation/dialogue-expressions.json, dialogue-reactions.json: "story ID + speaker +
// text") follow it: this rewrites their story ID, from the old file's ID to the place file's
// (`places/<prefix>_<place>`). Without --write it only lists what it would change.

export const MEMO_FILES = ["presentation/dialogue-expressions.json", "presentation/dialogue-reactions.json"] as const;

/** The memo catalog with every entry of `from` moved to `to`, and how many moved. */
export function moveMemos(catalog: { entries: { storyId: string }[] }, from: string, to: string): { catalog: typeof catalog; moved: number } {
  let moved = 0;
  const entries = catalog.entries.map((entry) => {
    if (entry.storyId !== from) return entry;
    moved++;
    return { ...entry, storyId: to };
  });
  return { catalog: { ...catalog, entries }, moved };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const value = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const [journeyId, from, to] = [value("--journey"), value("--from"), value("--to")];
  if (!journeyId || !from || !to) throw new Error("Usage: npm run story:move-memos -- --journey <journeyId> --from <storyId> --to <storyId> [--write]");
  const folder = journeyId === SAMPLE_JOURNEY_ID ? SAMPLE_JOURNEY_DIRECTORY : path.join("content", "journeys", journeyId);
  for (const relative of MEMO_FILES) {
    const file = path.join(process.cwd(), folder, relative);
    if (!existsSync(file)) continue;
    const result = moveMemos(JSON.parse(readFileSync(file, "utf8")), from, to);
    console.log(`${path.join(folder, relative)}: ${result.moved} 件${args.includes("--write") ? "を書き換えました" : "（--write で書き換えます）"}`);
    if (args.includes("--write") && result.moved) writeFileSync(file, `${JSON.stringify(result.catalog, null, 2)}\n`);
  }
}
