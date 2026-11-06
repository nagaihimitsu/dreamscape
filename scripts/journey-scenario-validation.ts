import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { presentationSchema } from "../src/content/schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import type { TagContext } from "../src/content/tags";
import { RELATIONSHIP_TONES } from "../src/domain/romance-tone";
import { validateMemoryReferences } from "../src/story/memory";
import { validateBattleStory } from "./battle-validation";
import { displayPath, loadContentSources, parseCatalog, storyFile } from "./content-sources";
import { withContext } from "./content-validation-utils";
import { validateEpilogue } from "./epilogue-validation";
import { compileInk, validateNoInkRandom, validateRelationshipToneSource, validateStory } from "./ink-validation";
import { buildJourneyFragments, journeyNarrativeSchema, journeyRequirements, loadJourneyScaffold } from "./journey-scaffold";
import { validateTourism, validateTourismAssets } from "./tourism-validation";

function inkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? inkFiles(file) : entry.name.endsWith(".ink") ? [file] : [];
  });
}

/** Check authored scripts with the production contracts, without inventing quizzes
 * or writing generated content/release markers. This is not a release gate. */
export async function validateJourneyScenario(root: string, journeyId: string, directory: string, selectedCityId?: string) {
  const input = loadJourneyScaffold(root, journeyId);
  const requirements = journeyRequirements(input, selectedCityId ? [selectedCityId] : undefined);
  const base = path.resolve(root, directory);
  const json = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
  const narrative = journeyNarrativeSchema.parse(json(path.join(base, selectedCityId ?? "", "narrative.json")));
  const fragments = buildJourneyFragments(input, narrative, requirements.map((city) => city.cityId));
  const sources = loadContentSources(root);
  const presentation = parseCatalog(sources, presentationSchema, "romance/presentation.json");
  const tourism = parseCatalog(sources, tourismCatalogSchema, "tourism/catalog.json");
  const expected = requirements.flatMap((city) => [
    ...city.main.flatMap((event) => [event.guideStoryId, event.battleStoryId]),
    ...city.dates.map((event) => event.storyId), city.finale.battleStoryId, city.finale.epilogueStoryId,
  ].map((storyId) => ({ cityId: city.cityId, storyId,
    draftFile: path.join(base, city.cityId, "stories", `${storyId}.ink`),
    publishedFile: storyFile(sources, storyId) })));
  const actualFiles = new Set(inkFiles(path.join(base, selectedCityId ?? "")));
  const expectedFiles = new Set(expected.map((story) => story.draftFile));
  const duplicate = expected.filter((story) => actualFiles.has(story.draftFile) && story.publishedFile);
  if (duplicate.length) throw new Error(`Scenario has both draft and published Ink: ${duplicate.map((story) => story.storyId).join(", ")}; keep one source`);
  const missing = expected.filter((story) => !actualFiles.has(story.draftFile) && !story.publishedFile).map((story) => story.draftFile);
  const extra = [...actualFiles].filter((file) => !expectedFiles.has(file));
  if (missing.length || extra.length)
    throw new Error(`Scenario Ink file mismatch: missing [${missing.map((file) => path.relative(base, file)).join(", ")}]; extra [${extra.map((file) => path.relative(base, file)).join(", ")}]`);
  for (const city of requirements) {
    const own = journeyNarrativeSchema.parse(json(path.join(base, city.cityId, "narrative.json")));
    const subset = { main: Object.fromEntries(city.main.map((event) => [event.eventId, narrative.main[event.eventId]])),
      dates: Object.fromEntries(city.dates.map((event) => [event.eventId, narrative.dates[event.eventId]])),
      finales: { [city.cityId]: narrative.finales[city.cityId] } };
    if (!isDeepStrictEqual(own, subset)) throw new Error(`Scenario metadata differs from the combined narrative: ${city.cityId}`);
  }
  const stories: Record<string, string> = {};
  const inkSources: Record<string, string> = {};
  const storyFiles: Record<string, string> = {};
  for (const { storyId, draftFile, publishedFile } of expected) {
    const file = actualFiles.has(draftFile) ? draftFile : publishedFile!;
    storyFiles[storyId] = file;
    const source = readFileSync(file, "utf8");
    withContext(file, () => {
      // Also reject an unwanted protagonist line in a currently unreachable branch.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (/#\s*speaker\s*:\s*player\b/.test(code)) throw new Error("The protagonist speaks only through date choices");
      validateMemoryReferences(source, Object.keys(fragments.memories));
      stories[storyId] = compileInk(source, file);
      inkSources[storyId] = source;
    });
  }
  let guides = 0;
  let battleScenarios = 0;
  let dateRoutes = 0;
  let epilogueScenarios = 0;
  const observe = (text: string, speaker: string) => {
    if (speaker === "player") throw new Error("The protagonist speaks only through date choices");
    if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)) throw new Error("Scenario dialogue must be Japanese");
  };
  for (const city of requirements) {
    const travel = input.cities.find((item) => item.cityId === city.cityId)!;
    const context: TagContext = { effectIds: [], emotionIds: Object.keys(presentation.emotions),
      backgroundIds: [...new Set(travel.places.map((place) => place.backgroundAssetId))] };
    const ownLandmarks = fragments.landmarks.filter((landmark) => landmark.cityId === city.cityId);
    const ownClues = fragments.clues.filter((clue) => ownLandmarks.some((landmark) => landmark.id === clue.landmarkId));
    const ownAssets = tourism.assets.filter((asset) => ownLandmarks.some((landmark) => landmark.imageAssetId === asset.id));
    await validateTourismAssets(root, ownAssets);
    guides += validateTourism({ schemaVersion: 1, landmarks: ownLandmarks, clues: ownClues, assets: ownAssets },
    city.cityId, input.plannedLandmarks[city.cityId], fragments.battles, {}, stories, context, () => observe,
    (storyId) => storyFiles[storyId] ? displayPath(root, storyFiles[storyId]) : `${storyId}.ink`);
    for (const battle of fragments.battles.filter((battle) => battle.cityId === city.cityId || ownLandmarks.some((landmark) => landmark.battleId === battle.id)))
      battleScenarios += withContext(battle.storyId, () => validateBattleStory(stories[battle.storyId], battle, context, observe));
    epilogueScenarios += withContext(city.finale.epilogueStoryId, () => validateEpilogue(stories[city.finale.epilogueStoryId], context, observe));
    for (const date of fragments.dates.filter((date) => date.chapterId === city.cityId)) {
      const source = inkSources[date.storyId];
      const compiled = stories[date.storyId];
      const effects = fragments.effects.filter((effect) => effect.id.startsWith(`${date.id}_`));
      const dateContext = { ...context, effectIds: effects.map((effect) => effect.id) };
      withContext(date.storyId, () => {
        validateNoInkRandom(compiled);
        validateRelationshipToneSource(source);
        const references = validateMemoryReferences(source, Object.keys(fragments.memories));
        for (const id of references) {
          const has = (seed: typeof date.validationContexts[number]) => (seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : [])).includes(id);
          if (!date.validationContexts.some(has) || !date.validationContexts.some((seed) => !has(seed)))
            throw new Error(`Memory reference needs present and absent validation contexts: ${id}`);
        }
        // The published runtime supplies all relationship stages and ending states.
        // Exercise them even when the generated minimum metadata has one seed.
        for (const romanceStage of [1, 2, 3, 4]) for (const endingReached of [false, true]) for (const tone of RELATIONSHIP_TONES)
          for (const seed of date.validationContexts) dateRoutes += validateStory(compiled, dateContext, date, {
            player_address: "検証主人公さん", romance_stage: romanceStage, ending_reached: endingReached,
            confession_ready: seed.confessionReady, confession_result: seed.confessionResult ?? "deferred",
            memory_callback: "旅の思い出",
          }, effects, observe, { available: seed.memoryIds ?? (seed.memoryId ? [seed.memoryId] : []), known: Object.keys(fragments.memories) }, true, undefined, tone);
      });
    }
  }
  return { journeyId, cities: requirements.map((city) => city.cityId), stories: expected.length,
    guides, battleScenarios, dateRoutes, epilogueScenarios, readyForPublication: false as const };
}
