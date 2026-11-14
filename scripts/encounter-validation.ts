import { Story } from "inkjs";
import type { EncounterCatalog, EncounterDefinition } from "../src/content/encounter-schemas";
import type { JourneyConfig } from "../src/content/journey-schemas";
import type { QuizDefinition, QuizQuestion } from "../src/content/schemas";
import type { LandmarkDefinition } from "../src/content/tourism-schemas";
import { checkLinesWithoutChoice } from "./ink-validation";
import { forEachCondAssignment } from "./scene-conditions";
import { translationLanguageWarning } from "./data-language";
import type { ContentWarning } from "./content-report";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import { bindItemReader, type ItemStatus } from "../src/story/items";
import { bindMemoryReader } from "../src/story/memory";
import { unique } from "./content-validation-utils";

/** An encounter's story walked on its own (each cond assignment, item status and reaction): its choices match its options, and it applies no Ink effect. */
export function validateEncounterStory(
  compiled: string,
  context: TagContext,
  options: EncounterDefinition["options"] | null,
  itemIds: string[],
  memoryIds: string[],
  requireChoiceIds = false,
  /** Called with each choice's text and its `# translation:` (for the data-language warning). */
  onTranslation?: (choiceText: string, translation: string) => void,
  /** A choice's two reactions that read the same (a warning; decision 39). */
  onReactionWarning?: (message: string) => void,
): void {
  const positiveResponses = new Map<string, string>();
  const inventoryContexts: Readonly<Record<string, ItemStatus>>[] = [
    {}, ...itemIds.flatMap((id) => (["held", "gifted", "used"] as const).map((status) => ({ [id]: status }))),
  ];
  forEachCondAssignment(compiled, (bind) => {
    for (const [contextIndex, inventory] of inventoryContexts.entries()) for (const result of ["positive", "negative"]) {
      const story = new Story(compiled);
      bind(story);
      bindItemReader(story, inventory, itemIds);
      bindMemoryReader(story, [], memoryIds);
      story.onError = (message) => { throw new Error(message); };
      for (const name of ["player_name", "heroine_name"]) {
        if (!story.variablesState.GlobalVariableExistsWithName(name))
          throw new Error(`Missing encounter variable: ${name}`);
        story.variablesState.$(name, "検証名");
      }
      if (story.variablesState.GlobalVariableExistsWithName("romance_result"))
        story.variablesState.$("romance_result", result);
      else if (options?.some((option) => option.responseProfileId))
        throw new Error("Encounter reaction profile needs the romance_result variable");

      const read = (current: Story): string[] => {
        let steps = 0;
        const lines: string[] = [];
        while (current.canContinue) {
          checkLinesWithoutChoice(++steps);
          const line = current.Continue()?.trim() ?? "";
          const tags = parseStoryTags(current.currentTags ?? [], context);
          if (tags.effects.length) throw new Error("Encounter story cannot apply Ink effects");
          if (line) lines.push(line);
        }
        return lines;
      };
      if (!read(story).length) throw new Error("Empty encounter story");
      const choices = story.currentChoices;
      if (!options) {
        if (choices.length) throw new Error("Encounter conclusion cannot contain choices");
        continue;
      }
      if (choices.length !== options.length)
        throw new Error(`Encounter choices differ from its catalog options: ${choices.length} in the story, ${options.length} in the catalog`);
      unique(choices.map((choice) => choice.text.trim().toLowerCase()), "encounter option text");
      const taggedChoiceCount = choices.filter((choice) => (choice.tags ?? []).some((tag) => /^option\s*:/u.test(tag))).length;
      if (taggedChoiceCount !== 0 && taggedChoiceCount !== choices.length)
        throw new Error("Encounter choice IDs must be specified for every choice");
      if (requireChoiceIds && taggedChoiceCount !== choices.length)
        throw new Error("Encounter choice effects require stable option IDs");
      const saved = story.state.ToJson();
      const choiceOptions = choices.map((choice, index) => {
        const optionTags = (choice.tags ?? []).filter((tag) => /^option\s*:/u.test(tag));
        if (optionTags.length > 1) throw new Error("Encounter choice has multiple IDs");
        const id = optionTags[0]?.slice(optionTags[0].indexOf(":") + 1).trim();
        const option = id === undefined ? options[index] : options.find((item) => item.id === id);
        if (!option) throw new Error(`Unknown encounter choice ID: ${id}`);
        if (choice.index !== index || (option.textEn !== undefined && choice.text.trim() !== option.textEn))
          throw new Error(`Encounter choice does not match data: ${option.id}`);
        return option;
      });
      unique(choiceOptions.map((option) => option.id), "encounter choice ID");
      for (const [index, option] of choiceOptions.entries()) {
        const choice = choices[index];
        const choiceTags = parseStoryTags(choice.tags ?? [], context);
        if (choiceTags.effects.length)
          throw new Error("Encounter story cannot apply Ink effects");
        if (choiceTags.translationJa) onTranslation?.(choice.text.trim(), choiceTags.translationJa);
        const branch = new Story(compiled);
        bind(branch);
        const branchInventory: Record<string, ItemStatus> = { ...inventory };
        if (option.requiresItemId) branchInventory[option.requiresItemId] = "held";
        if (option.consumeItemId) branchInventory[option.consumeItemId] = "used";
        if (option.giftItemId) branchInventory[option.giftItemId] = "gifted";
        bindItemReader(branch, branchInventory, itemIds);
        bindMemoryReader(branch, [], memoryIds);
        branch.onError = (message) => { throw new Error(message); };
        branch.state.LoadJson(saved);
        branch.ChooseChoiceIndex(choice.index);
        const response = read(branch);
        if (!response.length) throw new Error(`Empty encounter response: ${option.id}`);
        if (branch.currentChoices.length) throw new Error(`Encounter has extra choices: ${option.id}`);
        if (option.responseProfileId) {
          const reactionKey = `${contextIndex}/${option.id}`;
          if (result === "positive") positiveResponses.set(reactionKey, response.join("\n"));
          else if (positiveResponses.get(reactionKey) === response.join("\n"))
            onReactionWarning?.(`The two reactions of the encounter choice ${option.id} read the same (not stopped)`);
        }
      }
    }
  });
}

/** Validate stable IDs and references independently of the runtime game rules. */
export function validateEncounterContent({
  catalog, cityId, landmarks, journey, stories, quizzes, responseProfileIds, memoryIds, context,
  validateQuiz, onWarning, sceneItems = { uses: [], sources: [] }, carriedItems = [], hasNextCity = false,
}: {
  catalog: EncounterCatalog;
  cityId: string;
  landmarks: LandmarkDefinition[];
  journey: JourneyConfig;
  stories: Record<string, string>;
  quizzes: Record<string, QuizDefinition>;
  responseProfileIds: string[];
  memoryIds: string[];
  context: TagContext;
  validateQuiz: (quiz: { questions: QuizQuestion[] }) => void;
  /** Receives the warnings that do not stop the build (a `# translation:` without Japanese), once each. */
  onWarning?: (warning: ContentWarning) => void;
  /** The items the tagged scenes use (# give:, # use:, # on_done: use) and give (# on_done: item; stage 3a). */
  sceneItems?: { uses: readonly string[]; sources: readonly string[] };
  /** Items carried through the journey from its earlier cities (`"carry": "journey"`): held, given and used here too (the item design §2.5). */
  carriedItems?: readonly { id: string; cityId: string }[];
  /** The city has a next city: its own items that are not carried need a use in it (else they are left behind unused). */
  hasNextCity?: boolean;
}): void {
  const reported = new Set<string>();
  unique(catalog.items.map((item) => item.id), "encounter item ID");
  unique(catalog.encounters.map((event) => event.id), "encounter ID");
  const itemIds = new Set([...catalog.items, ...carriedItems].map((item) => item.id));
  // Called for one city at a time (content-validation.ts); journey data also lets isolated tests
  // exercise another city without registering new production content.
  const knownCities = new Set([cityId, ...journey.episodes.map((episode) => episode.cityId)]);
  for (const item of catalog.items)
    if (!knownCities.has(item.cityId)) throw new Error(`Unknown item city: ${item.id}/${item.cityId}`);
  const storyIds: string[] = [];
  const questionIds = Object.values(quizzes).flatMap((quiz) => quiz.questions.map((question) => question.id));
  const alternativeRewards: string[] = [];
  const itemSources: string[] = [];
  for (const event of catalog.encounters) {
    if (event.cityId !== cityId) throw new Error(`Unknown encounter city: ${event.id}/${event.cityId}`);
    if (event.landmarkId !== undefined && !landmarks.some((landmark) => landmark.id === event.landmarkId && landmark.cityId === event.cityId))
      throw new Error(`Unknown encounter landmark: ${event.id}/${event.landmarkId}`);
    // Rev. 5: a repeated encounter may have effects (listed by the balance report), and a 「また今度」 choice may cost money.
    unique(event.options.map((option) => option.id), `encounter option ID: ${event.id}`);
    for (const option of event.options) {
      for (const item of [option.requiresItemId, option.consumeItemId, option.giftItemId]) {
        if (item && !itemIds.has(item)) throw new Error(`Unknown encounter item: ${event.id}/${option.id}/${item}`);
        if (item && catalog.items.find((entry) => entry.id === item)?.cityId !== event.cityId && !carriedItems.some((entry) => entry.id === item))
          throw new Error(`Encounter item city mismatch: ${event.id}/${option.id}/${item}`);
      }
      if (option.consumeItemId && option.giftItemId) throw new Error(`Conflicting encounter item action: ${event.id}/${option.id}`);
      const spentItem = option.consumeItemId ?? option.giftItemId;
      if (spentItem && option.requiresItemId !== spentItem)
        throw new Error(`Encounter item action needs matching requirement: ${event.id}/${option.id}`);
      // Today's catalog records a given or used item only for a completed encounter (validateItemUses), so a 「また今度」 choice cannot give one.
      if (option.deferCompletion && (option.requiresItemId || spentItem))
        throw new Error(`A 「また今度」 choice of an encounter catalog cannot need or give an item (move the encounter to a place file): ${event.id}/${option.id}`);
      if (option.responseProfileId && !responseProfileIds.includes(option.responseProfileId))
        throw new Error(`Unknown encounter response profile: ${event.id}/${option.id}/${option.responseProfileId}`);
    }
    if (event.completionItemId && !itemIds.has(event.completionItemId))
      throw new Error(`Unknown encounter completion item: ${event.id}/${event.completionItemId}`);
    if (event.completionItemId && catalog.items.find((item) => item.id === event.completionItemId)?.cityId !== event.cityId)
      throw new Error(`Encounter completion item city mismatch: ${event.id}/${event.completionItemId}`);
    if (event.completionItemId) itemSources.push(event.completionItemId);
    if (event.alternativeApRewardId) {
      alternativeRewards.push(event.alternativeApRewardId);
      const rule = journey.rewards.find((reward) => reward.id === event.alternativeApRewardId);
      const episode = journey.episodes.find((entry) => entry.id === rule?.episodeId);
      if (!rule || rule.trigger !== "battle_score" || rule.ap !== 1 || rule.minScore !== 2 || episode?.cityId !== event.cityId || episode.landmarkId !== event.landmarkId)
        throw new Error(`Invalid encounter alternative reward: ${event.id}/${event.alternativeApRewardId}`);
    }
    const scenes: Array<{ id: string; options: EncounterDefinition["options"] | null }> = [{ id: event.storyId, options: event.options }];
    if (event.quiz) {
      if (!itemIds.has(event.quiz.rewardItemId)) throw new Error(`Unknown encounter quiz item: ${event.id}/${event.quiz.rewardItemId}`);
      if (catalog.items.find((item) => item.id === event.quiz!.rewardItemId)?.cityId !== event.cityId)
        throw new Error(`Encounter quiz item city mismatch: ${event.id}/${event.quiz.rewardItemId}`);
      itemSources.push(event.quiz.rewardItemId);
      validateQuiz({ questions: [event.quiz.question] });
      questionIds.push(event.quiz.question.id);
      scenes.push(...[event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId].map((id) => ({ id, options: null })));
    }
    for (const scene of scenes) {
      storyIds.push(scene.id);
      const compiled = stories[scene.id];
      if (!compiled) throw new Error(`Unknown encounter story: ${event.id}/${scene.id}`);
      const choiceHasRules = !!scene.options?.some((option) => option.cost || option.requiresItemId || option.consumeItemId || option.giftItemId || option.responseProfileId || option.deferCompletion);
      const onTranslation = (choiceText: string, translation: string) => {
        const warning = translationLanguageWarning(scene.id, choiceText, translation);
        if (warning && !reported.has(warning.message)) {
          reported.add(warning.message);
          onWarning?.(warning);
        }
      };
      try { validateEncounterStory(compiled, context, scene.options, catalog.items.filter((item) => item.cityId === event.cityId).map((item) => item.id), memoryIds, choiceHasRules, onTranslation,
        (message) => onWarning?.({ kind: "scene-tag", message: `${event.id}: ${message}` })); }
      catch (error) {
        throw new Error(`Invalid encounter story: ${event.id}/${scene.id}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
    }
  }
  unique(storyIds, "encounter story ID");
  unique(questionIds, "production quiz question ID");
  unique(alternativeRewards, "encounter alternative reward");
  unique(itemSources, "encounter item source");
  for (const item of catalog.items) {
    const hasUse = sceneItems.uses.includes(item.id) || catalog.encounters.some((event) =>
      event.cityId === item.cityId && event.options.some((option) =>
        option.consumeItemId === item.id || option.giftItemId === item.id,
      ),
    );
    // Only an item that may be left behind needs a use: one not carried, in a city with a next city (a keepsake may just be held).
    if (!hasUse && hasNextCity && item.carry !== "journey") throw new Error(`Encounter item has no use in its city: ${item.id}/${item.cityId}`);
    // Without a source the item can never be held, so its uses (and conditions reading it) never happen.
    if (!itemSources.includes(item.id) && !sceneItems.sources.includes(item.id))
      throw new Error(`Encounter item has no source: ${item.id} (give it as an encounter's completionItemId or quiz.rewardItemId, or a scene's # on_done: item)`);
  }
}
