import { Story } from "inkjs";
import previousEncounterData from "../content/legacy/encounters_before_story_refactor.json";
import type { EncounterCatalog, EncounterDefinition } from "../src/content/encounter-schemas";
import type { JourneyConfig } from "../src/content/journey-schemas";
import type { QuizDefinition, QuizQuestion } from "../src/content/schemas";
import type { LandmarkDefinition } from "../src/content/tourism-schemas";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import { bindItemReader, type ItemStatus } from "../src/story/items";
import { bindMemoryReader } from "../src/story/memory";

function unique(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label}`);
}

/** Validate dialogue separately: battle Ink remains choice- and effect-free. */
export function validateEncounterStory(
  compiled: string,
  context: TagContext,
  options: EncounterDefinition["options"] | null,
  itemIds: string[],
  memoryIds: string[],
  requireChoiceIds = false,
): void {
  const positiveResponses = new Map<string, string>();
  const inventoryContexts: Readonly<Record<string, ItemStatus>>[] = [
    {}, ...itemIds.flatMap((id) => (["held", "gifted", "used"] as const).map((status) => ({ [id]: status }))),
  ];
  for (const [contextIndex, inventory] of inventoryContexts.entries()) for (const result of ["positive", "negative"]) {
    const story = new Story(compiled);
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
        if (++steps > 200) throw new Error("Encounter story contains a loop or too many lines");
        const line = current.Continue()?.trim() ?? "";
        const tags = parseStoryTags(current.currentTags ?? [], context);
        if (tags.effects.length) throw new Error("Encounter story cannot apply Ink effects");
        if (line) {
          if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(line))
            throw new Error(`Encounter dialogue must be Japanese: ${line}`);
          lines.push(line);
        }
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
      throw new Error(`Encounter needs three choices; found ${choices.length}`);
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
      if (parseStoryTags(choice.tags ?? [], context).effects.length)
        throw new Error("Encounter story cannot apply Ink effects");
      const branch = new Story(compiled);
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
          throw new Error(`Encounter reactions must differ: ${option.id}`);
      }
    }
  }
}

/** Validate stable IDs and references independently of the runtime game rules. */
export function validateEncounterContent({
  catalog, cityId, landmarks, journey, stories, quizzes, responseProfileIds, memoryIds, context,
  validateQuiz,
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
}): void {
  unique(catalog.items.map((item) => item.id), "encounter item ID");
  unique(catalog.encounters.map((event) => event.id), "encounter ID");
  const itemIds = new Set(catalog.items.map((item) => item.id));
  // The current route has one city; journey data also lets isolated tests
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
    if (!landmarks.some((landmark) => landmark.id === event.landmarkId && landmark.cityId === event.cityId))
      throw new Error(`Unknown encounter landmark: ${event.id}/${event.landmarkId}`);
    if (event.repeatable && (!event.quiz || event.completionMoneyEuro || event.completionItemId ||
      event.options.some((option) => option.costEuro || option.requiresItemId || option.consumeItemId || option.giftItemId || option.responseProfileId || option.deferCompletion)))
      throw new Error(`Repeatable encounter must be a free quiz without choice effects: ${event.id}`);
    unique(event.options.map((option) => option.id), `encounter option ID: ${event.id}`);
    for (const option of event.options) {
      for (const item of [option.requiresItemId, option.consumeItemId, option.giftItemId]) {
        if (item && !itemIds.has(item)) throw new Error(`Unknown encounter item: ${event.id}/${option.id}/${item}`);
        if (item && catalog.items.find((entry) => entry.id === item)?.cityId !== event.cityId)
          throw new Error(`Encounter item city mismatch: ${event.id}/${option.id}/${item}`);
      }
      if (option.consumeItemId && option.giftItemId) throw new Error(`Conflicting encounter item action: ${event.id}/${option.id}`);
      const spentItem = option.consumeItemId ?? option.giftItemId;
      if (spentItem && option.requiresItemId !== spentItem)
        throw new Error(`Encounter item action needs matching requirement: ${event.id}/${option.id}`);
      if (option.deferCompletion && (option.costEuro || option.requiresItemId || spentItem || option.responseProfileId))
        throw new Error(`Deferred encounter choice must have no cost or effects: ${event.id}/${option.id}`);
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
      const existingOrderedChoices = previousEncounterData.encounters.some((old) => old.id === event.id && old.storyId === scene.id);
      const choiceHasRules = !!scene.options?.some((option) => option.costEuro || option.requiresItemId || option.consumeItemId || option.giftItemId || option.responseProfileId || option.deferCompletion);
      try { validateEncounterStory(compiled, context, scene.options, catalog.items.filter((item) => item.cityId === event.cityId).map((item) => item.id), memoryIds, choiceHasRules && !existingOrderedChoices); }
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
    const hasUse = catalog.encounters.some((event) =>
      event.cityId === item.cityId && event.options.some((option) =>
        option.consumeItemId === item.id || option.giftItemId === item.id,
      ),
    );
    if (!hasUse) throw new Error(`Encounter item has no use in its city: ${item.id}/${item.cityId}`);
  }
}
