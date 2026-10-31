import { readFile } from "node:fs/promises";
import path from "node:path";
import { Story } from "inkjs";
import sharp from "sharp";
import type { BattleDefinition, QuizDefinition } from "../src/content/schemas";
import type { TourismCatalog } from "../src/content/tourism-schemas";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import type { DialogueObserver } from "./dialogue-expression-validation";

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}`);
}

/** Tourism is optional; the content contract never grants effects or asks Ink choices. */
export async function validateTourism(
  root: string,
  catalog: TourismCatalog,
  cityId: string,
  plannedLandmarkIds: string[],
  battles: BattleDefinition[],
  quizzes: Record<string, QuizDefinition>,
  stories: Record<string, string>,
  context: TagContext,
  observeForStory?: (storyId: string) => DialogueObserver,
): Promise<number> {
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
  for (const asset of catalog.assets) {
    const bytes = await readFile(path.join(root, "public", asset.path));
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";
    if (!jpeg && !png && !webp)
      throw new Error(`Invalid tourism image: ${asset.path}`);
    let dimensions: { width?: number; height?: number };
    try {
      dimensions = await sharp(bytes).metadata();
    } catch {
      throw new Error(`Invalid tourism image: ${asset.path}`);
    }
    if (dimensions.width !== asset.width || dimensions.height !== asset.height)
      throw new Error(`Tourism image dimensions do not match: ${asset.id}/${asset.path}`);
  }
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
    const compiled = stories[landmark.guideStoryId];
    if (!compiled)
      throw new Error(`Unknown tourism guideStoryId: ${landmark.guideStoryId}`);
    try {
      const story = new Story(compiled);
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
        if (++count > 40) throw new Error("Tourism guide loops or is too long");
        const line = story.Continue()?.trim() ?? "";
        const tags = parseStoryTags(story.currentTags ?? [], context);
        if (tags.speaker) speaker = tags.speaker;
        if (tags.emotion !== undefined) explicitEmotion = true;
        if (tags.effects.length)
          throw new Error("Tourism guide cannot grant effects");
        if (line) {
          hasText = true;
          observeForStory?.(landmark.guideStoryId)(line, speaker, explicitEmotion);
          explicitEmotion = false;
          if (
            !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(
              line,
            )
          )
            throw new Error("Tourism guide must be Japanese");
        }
      }
      if (!hasText) throw new Error("Tourism guide is empty");
      if (story.currentChoices.length)
        throw new Error("Tourism guide cannot contain choices");
    } catch (error) {
      throw new Error(
        `content/stories/${landmark.guideStoryId}.ink (landmark ${landmark.id}): ${error instanceof Error ? error.message : String(error)}`,
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
