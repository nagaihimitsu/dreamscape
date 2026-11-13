import { Story } from "inkjs";
import type { BattleDefinition, QuizDefinition } from "../src/content/schemas";
import type { TourismCatalog } from "../src/content/tourism-schemas";
import { checkLinesWithoutChoice } from "./ink-validation";
import { forEachCondAssignment } from "./scene-conditions";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import type { DialogueObserver } from "./dialogue-expression-validation";
import { unique } from "./content-validation-utils";

/**
 * Tourism is optional; the content contract never grants effects or asks Ink choices.
 * The image files themselves are checked by checkTourismImages (content-images.ts).
 */
export function validateTourism(
  catalog: TourismCatalog,
  cityId: string,
  plannedLandmarkIds: string[],
  battles: BattleDefinition[],
  quizzes: Record<string, QuizDefinition>,
  stories: Record<string, string>,
  context: TagContext,
  observeForStory?: (storyId: string) => DialogueObserver,
  /** How messages name a story's Ink file (its real path). */
  storyLabel: (storyId: string) => string = (storyId) => `${storyId}.ink`,
  /** A guide content:build walks as a scene instead (a place file's knot, or a guide with choices; stage 3a): counted, not walked here. */
  walkedAsScene: (guideStoryId: string) => boolean = () => false,
): number {
  unique(
    catalog.landmarks.map((item) => item.id),
    "tourism landmark ID",
  );
  unique(
    catalog.assets.map((item) => item.id),
    "tourism asset ID",
  );
  unique(
    catalog.clues.map((item) => item.id),
    "tourism clue ID",
  );
  unique(
    catalog.clues.map((item) => item.factId),
    "tourism fact ID",
  );
  let guideCount = 0;
  for (const landmark of catalog.landmarks) {
    if (landmark.cityId !== cityId || !plannedLandmarkIds.includes(landmark.id))
      throw new Error(`Unknown tourism city/landmark: ${landmark.id}`);
    if (!catalog.assets.some((asset) => asset.id === landmark.imageAssetId))
      throw new Error(`Unknown tourism imageAssetId: ${landmark.id}`);
    const battle = battles.find((item) => item.id === landmark.battleId);
    if (!battle || battle.landmarkId !== landmark.id)
      throw new Error(`Tourism battle landmark mismatch: ${landmark.id}`);
    for (const clueId of landmark.clueIds) {
      const clue = catalog.clues.find((item) => item.id === clueId);
      if (!clue || clue.landmarkId !== landmark.id)
        throw new Error(`Unknown or mismatched tourism clue: ${clueId}`);
    }
    // A landmark without a guide (stage 2b) has no guide to check.
    const guideStoryId = landmark.guideStoryId;
    if (!guideStoryId) continue;
    if (walkedAsScene(guideStoryId)) { guideCount++; continue; }
    const compiled = stories[guideStoryId];
    if (!compiled)
      throw new Error(`Unknown tourism guideStoryId: ${guideStoryId}`);
    try {
      forEachCondAssignment(compiled, (bind) => {
        const story = new Story(compiled);
        bind(story);
        story.onError = (message) => {
          throw new Error(message);
        };
        for (const [name, value] of Object.entries({
          player_name: "検証主人公",
          heroine_name: "検証ヒロイン",
          player_address: "検証主人公さん",
        })) {
          if (!story.variablesState.GlobalVariableExistsWithName(name))
            throw new Error(`Missing tourism guide variable: ${name}`);
          story.variablesState.$(name, value);
        }
        let count = 0;
        let hasText = false;
        let speaker: string = "narrator";
        let explicitEmotion = false;
        while (story.canContinue) {
          checkLinesWithoutChoice(++count);
          const line = story.Continue()?.trim() ?? "";
          const tags = parseStoryTags(story.currentTags ?? [], context);
          if (tags.speaker) speaker = tags.speaker;
          if (tags.emotion !== undefined) explicitEmotion = true;
          if (tags.effects.length)
            throw new Error("Tourism guide cannot grant effects");
          if (line) {
            hasText = true;
            observeForStory?.(guideStoryId)(line, speaker, explicitEmotion);
            explicitEmotion = false;
          }
        }
        if (!hasText) throw new Error("Tourism guide is empty");
        if (story.currentChoices.length)
          throw new Error("Tourism guide cannot contain choices");
      });
    } catch (error) {
      throw new Error(
        `${storyLabel(guideStoryId)} (landmark ${landmark.id}): ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    guideCount++;
  }
  for (const clue of catalog.clues) {
    const landmark = catalog.landmarks.find(
      (item) => item.id === clue.landmarkId,
    );
    if (!landmark?.clueIds.includes(clue.id))
      throw new Error(`Unlisted tourism clue: ${clue.id}`);
    // An empty list is an observation-only clue and needs no check. A listed
    // question must belong to a quiz of the clue's own landmark (a city
    // finale quiz has no landmark, so its questions cannot be listed).
    for (const questionId of clue.relatedQuestionIds) {
      if (
        !Object.values(quizzes).some(
          (quiz) =>
            quiz.landmarkId === clue.landmarkId &&
            quiz.questions.some((question) => question.id === questionId),
        )
      )
        throw new Error(`Unknown related tourism question: ${questionId}`);
    }
  }
  return guideCount;
}
