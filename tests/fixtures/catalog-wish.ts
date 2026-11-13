import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileInk } from "../../scripts/ink-validation";
import { stories } from "../../src/content";
import { encounters } from "../../src/content/encounters";
import type { EncounterCatalog, EncounterDefinition } from "../../src/content/encounter-schemas";
import type { EncounterEntryRule } from "../../src/content/encounter-entry-rules";
import { encounterEntryRuleList } from "../../src/domain/encounter";
import { addJourneyWordMeanings } from "./word-meanings";

type EncounterItem = EncounterCatalog["items"][number];

/**
 * The Galleria's wish as a catalog encounter with its quiz and ticket lottery (tests/fixtures/catalog-encounters/): the form
 * Milan had until 2026-11-13. The game's wish is now a knot of the Galleria's place file without a quiz or lottery; the game
 * still runs a catalog encounter's quiz (quizAfterLandmarkBattle) and lottery, and these tests keep them covered with the
 * tests' own IDs. installCatalogWish() adds the encounter, its item, its entry rule and its four stories; the returned
 * function takes them out again.
 */
export const WISH = "test_galleria_wish";
export const WISH_TICKET = `${WISH}_ticket`;

const FIXTURE = "tests/fixtures/catalog-encounters";
const fixture = JSON.parse(readFileSync(path.join(FIXTURE, "catalog.json"), "utf8")) as {
  items: EncounterItem[]; entryRules: EncounterEntryRule[]; encounters: EncounterDefinition[];
};

export function catalogWish(): EncounterDefinition {
  return structuredClone(fixture.encounters.find((event) => event.id === WISH)!);
}

export function installCatalogWish(): () => void {
  const wish = catalogWish();
  const storyIds = [wish.storyId, wish.quiz!.wonStoryId, wish.quiz!.lostStoryId, wish.quiz!.alreadyStoryId];
  encounters.encounters.push(wish);
  encounters.items.push(...structuredClone(fixture.items));
  encounterEntryRuleList.push(...structuredClone(fixture.entryRules));
  for (const id of storyIds) stories[id] = compileInk(readFileSync(path.join(FIXTURE, `${id}.ink`), "utf8"), `${id}.ink`);
  return () => {
    const keep = <T>(list: T[], drop: (item: T) => boolean) => list.splice(0, list.length, ...list.filter((item) => !drop(item)));
    keep(encounters.encounters, (event) => event.id === WISH);
    keep(encounters.items, (item) => fixture.items.some((entry) => entry.id === item.id));
    keep(encounterEntryRuleList, (rule) => rule.encounterId === WISH);
    for (const id of storyIds) delete stories[id];
  };
}

/**
 * The meanings of the words of the wish's choices that the core dictionary lacks: only the Golden Triangle's defines them
 * (these meanings), and a Milan encounter may use only the core dictionary and Milan's own (content-ownership.ts).
 */
const WISH_WORD_MEANINGS = { count: "数える", luck: "運", my: "私の" };

/**
 * Add the wish in its catalog form to a content fixture's Milan (prepareContentFixture), for the build tests of a catalog
 * encounter: its entry, item, entry rule, four stories and the word meanings its English needs in Milan's own dictionary.
 * Without alternativeApRewardId: the game's wish earns that reward (# on_done: reward), and one reward has one way to earn
 * it. Returns the fixture path of the wish's story file.
 */
export async function addCatalogWishToContent(fixtureRoot: string, change: (wish: EncounterDefinition) => void = () => {}): Promise<string> {
  const milano = path.join(fixtureRoot, "content/journeys/milano");
  const catalogFile = path.join(milano, "encounters/catalog.json");
  const catalog = JSON.parse(await readFile(catalogFile, "utf8")) as { items: EncounterItem[]; encounters: EncounterDefinition[] };
  const wish = catalogWish();
  delete wish.alternativeApRewardId;
  change(wish);
  catalog.items.push(...structuredClone(fixture.items));
  catalog.encounters.push(wish);
  await writeFile(catalogFile, JSON.stringify(catalog, null, 2));
  await writeFile(path.join(milano, "encounters/entry-rules.json"), JSON.stringify({ schemaVersion: 2, entries: fixture.entryRules }, null, 2));
  await mkdir(path.join(milano, "stories/encounters"), { recursive: true });
  for (const id of [wish.storyId, wish.quiz!.wonStoryId, wish.quiz!.lostStoryId, wish.quiz!.alreadyStoryId])
    await writeFile(path.join(milano, "stories", `${id}.ink`), readFileSync(path.join(FIXTURE, `${id}.ink`), "utf8"));
  await addJourneyWordMeanings(fixtureRoot, "milano", WISH_WORD_MEANINGS);
  return path.join(milano, "stories", `${wish.storyId}.ink`);
}
