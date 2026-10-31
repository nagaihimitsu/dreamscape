import { Story } from "inkjs";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import type { DialogueObserver } from "./dialogue-expression-validation";

/** The city ending is a saved short conversation, never an automatic romance reward. */
export function validateEpilogue(
  compiled: string,
  context: TagContext,
  observe?: DialogueObserver,
): number {
  let scenarios = 0;
  for (const romanceStage of [1, 2, 3, 4]) {
    for (const endingReached of [false, true]) {
      const story = new Story(compiled);
      story.onError = (message) => {
        throw new Error(message);
      };
      for (const [key, value] of Object.entries({
        player_name: "検証主人公",
        heroine_name: "検証ヒロイン",
        player_address: "検証主人公さん",
        romance_stage: romanceStage,
        ending_reached: endingReached,
        memory_callback: "覚えている旅の言葉",
      })) {
        if (!story.variablesState.GlobalVariableExistsWithName(key)) {
          if (key === "memory_callback") continue;
          throw new Error(`Missing epilogue Ink variable: ${key}`);
        }
        story.variablesState.$(key, value);
      }
      let lines = 0;
      let hasText = false;
      let speaker: string = "narrator";
      let explicitEmotion = false;
      while (story.canContinue) {
        if (++lines > 50) throw new Error("City epilogue is too long or loops");
        const line = story.Continue()?.trim() ?? "";
        const tags = parseStoryTags(story.currentTags ?? [], context);
        if (tags.speaker) speaker = tags.speaker;
        if (tags.emotion !== undefined) explicitEmotion = true;
        if (tags.effects.length)
          throw new Error("City epilogue cannot grant romance or AP effects");
        if (line) {
          hasText = true;
          observe?.(line, speaker, explicitEmotion);
          explicitEmotion = false;
          if (
            !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(
              line,
            )
          )
            throw new Error("City epilogue must be Japanese");
        }
      }
      if (!hasText || story.currentChoices.length)
        throw new Error("City epilogue must be a nonempty linear conversation");
      scenarios++;
    }
  }
  return scenarios;
}
