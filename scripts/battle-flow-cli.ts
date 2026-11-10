import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BattleDefinition } from "../src/content/schemas";
import { splitStoryAddress } from "../src/content/story-address";
import { compareBattleForms, convertBattle } from "./battle-flow";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "./content-layout";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { MEMO_FILES, moveMemos } from "./move-story-memos";
import { includesModules, readMainFileHead, readPlaceFile } from "./place-files";

// npm run battle:flow -- --journey <journeyId> [--battle <battleId>] [--root <folder>] [--write]
// Convert a journey's battles in the scene form (stages 3–4) to the one-flow form (stage 5; battle-flow.ts). For each
// battle it plays the old and the new form for every combination of right and wrong answers, presses and wrong
// evidence, and lists whether every frame stays the same. Without --write it only checks; with --write it writes the
// converted stories, the catalog without scenes, removes the rebuttal stories and their reasoning-intros.json entries
// (their lines are in the flow now) and moves their memos, only when every battle it converts shows the same lines.
// --root: the folder that holds content/ and authoring/ (default: the working directory), to try a copy.

type Catalog = { schemaVersion: number; battles: BattleDefinition[] };
type Intros = { schemaVersion: number; entries: { battleId: string; storyId: string }[] };

/** Compile a story as content:build does: a place file's or a one-scene file's head tags blanked, modules.ink when it is included. */
function compile(storyId: string, source: string): string {
  const read = storyId.startsWith("places/") ? readPlaceFile(storyId, source).source : readMainFileHead(source).source;
  return includesModules(read) ? compileInk(read, `${storyId}.ink`, { [MODULES_FILE]: MODULES_INK }) : compileInk(read, `${storyId}.ink`);
}

export type BattleFlowResult = { battleId: string; plans: number; difference: string | null };

/** Check (and with `write`, convert) the scene-form battles of a journey folder. */
export function convertJourneyBattles(folder: string, options: { battleId?: string; write?: boolean } = {}): BattleFlowResult[] {
  const file = (relative: string) => path.join(folder, relative);
  const catalog = JSON.parse(readFileSync(file("battles/catalog.json"), "utf8")) as Catalog;
  const introsFile = file("presentation/reasoning-intros.json");
  const intros = existsSync(introsFile) ? JSON.parse(readFileSync(introsFile, "utf8")) as Intros : undefined;
  const sources = new Map<string, string>();
  const source = (storyId: string) => sources.get(storyId) ?? readFileSync(file(`stories/${storyId}.ink`), "utf8");
  const results: BattleFlowResult[] = [];
  const removed: { battleId: string; storyId: string }[] = [];
  const battles = catalog.battles.map((battle) => {
    if (!battle.scenes || (options.battleId && battle.id !== options.battleId)) return battle;
    const storyId = splitStoryAddress(battle.storyId).storyId;
    const quiz = JSON.parse(readFileSync(file(`quizzes/${battle.quizId}.json`), "utf8")) as { questions: unknown[] };
    const intro = intros?.entries.find((entry) => entry.battleId === battle.id);
    const rebuttal = intro ? { storyId: intro.storyId, source: readFileSync(file(`stories/${intro.storyId}.ink`), "utf8") } : undefined;
    const before = source(storyId);
    const converted = convertBattle({ battle, source: before, ...(rebuttal ? { rebuttal } : {}) }, quiz.questions.length);
    const compared = compareBattleForms(
      { battle, compiled: compile(storyId, before), ...(rebuttal ? { rebuttalCompiled: compile(rebuttal.storyId, rebuttal.source) } : {}) },
      { battle: converted.battle, compiled: compile(storyId, converted.source) }, quiz.questions.length);
    results.push({ battleId: battle.id, ...compared });
    sources.set(storyId, converted.source);
    if (intro) removed.push(intro);
    return converted.battle;
  });
  if (!options.write || results.some((result) => result.difference)) return results;
  for (const [storyId, text] of sources) writeFileSync(file(`stories/${storyId}.ink`), text);
  writeFileSync(file("battles/catalog.json"), `${JSON.stringify({ ...catalog, battles }, null, 2)}\n`);
  if (intros && removed.length) {
    writeFileSync(introsFile, `${JSON.stringify({ ...intros, entries: intros.entries.filter((entry) => !removed.includes(entry)) }, null, 2)}\n`);
    for (const entry of removed) {
      rmSync(file(`stories/${entry.storyId}.ink`));
      const target = splitStoryAddress(catalog.battles.find((battle) => battle.id === entry.battleId)!.storyId).storyId;
      for (const relative of MEMO_FILES) {
        if (!existsSync(file(relative))) continue;
        const moved = moveMemos(JSON.parse(readFileSync(file(relative), "utf8")), entry.storyId, target);
        if (moved.moved) writeFileSync(file(relative), `${JSON.stringify(moved.catalog, null, 2)}\n`);
      }
    }
  }
  return results;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const value = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const journeyId = value("--journey");
  if (!journeyId) throw new Error("Usage: npm run battle:flow -- --journey <journeyId> [--battle <battleId>] [--root <folder>] [--write]");
  const root = path.resolve(value("--root") ?? process.cwd());
  const folder = path.join(root, journeyId === SAMPLE_JOURNEY_ID ? SAMPLE_JOURNEY_DIRECTORY : path.join("content", "journeys", journeyId));
  const write = args.includes("--write");
  const battleId = value("--battle");
  const results = convertJourneyBattles(folder, { write, ...(battleId ? { battleId } : {}) });
  for (const result of results)
    console.log(result.difference ? `✗ ${result.battleId}: ${result.difference}` : `✓ ${result.battleId}: the same lines in ${result.plans} ways to play`);
  const failed = results.filter((result) => result.difference).length;
  console.log(results.length ? `${results.length - failed} of ${results.length} battle(s) show the same lines in the one-flow form` : "No battle in the scene form");
  if (write) console.log(failed ? "Nothing written (a battle's lines would change)." : results.length ? "Written." : "");
  if (failed) process.exitCode = 1;
}
