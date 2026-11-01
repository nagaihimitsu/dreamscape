import { REACTION_MARKS, type DialogueReaction, type ReactionTarget } from "./dialogue-reactions";

export interface TagContext {
  effectIds: string[];
  backgroundIds: string[];
  emotionIds: string[];
}

export interface StoryTags {
  speaker?: "narrator" | "heroine" | "player" | "enemy";
  background?: string;
  emotion?: string;
  reactions?: Partial<Record<ReactionTarget, DialogueReaction>>;
  optionId?: string;
  translationJa?: string;
  effects: string[];
}

/** Interpret Ink's official currentTags/choice.tags output, never Ink source. */
export function parseStoryTags(
  tags: readonly string[],
  context: TagContext,
): StoryTags {
  const result: StoryTags = { effects: [] };
  for (const tag of tags) {
    const separator = tag.indexOf(":");
    const key = tag.slice(0, separator).trim();
    const value = tag.slice(separator + 1).trim();
    if (separator < 1 || !value) throw new Error(`Invalid story tag: ${tag}`);
    if (key === "effect") {
      if (!context.effectIds.includes(value))
        throw new Error(`Unknown effect: ${value}`);
      if (result.effects.includes(value))
        throw new Error(`Duplicate effect tag: ${value}`);
      result.effects.push(value);
    } else if (key === "speaker") {
      if (!["narrator", "heroine", "player", "enemy"].includes(value))
        throw new Error(`Unknown speaker: ${value}`);
      if (result.speaker) throw new Error("Duplicate speaker tag");
      result.speaker = value as StoryTags["speaker"];
    } else if (key === "background") {
      if (!context.backgroundIds.includes(value))
        throw new Error(`Unknown background: ${value}`);
      if (result.background) throw new Error("Duplicate background tag");
      result.background = value;
    } else if (key === "emotion") {
      if (!context.emotionIds.includes(value))
        throw new Error(`Unknown emotion: ${value}`);
      if (result.emotion) throw new Error("Duplicate emotion tag");
      result.emotion = value;
    } else if (key === "reaction") {
      // A mark may be used alone: `heroine,sweat`. Both properties can also
      // be provided: `heroine,exasperated,sigh`.
      const parts = value.split(",").map((part) => part.trim());
      const [target, first, second] = parts;
      if ((target !== "heroine" && target !== "enemy") || parts.length < 2 || parts.length > 3 || !first || (parts.length === 3 && !second))
        throw new Error(`Invalid reaction tag: ${value}`);
      let expression: string | undefined;
      let mark: DialogueReaction["mark"];
      if (parts.length === 2 && REACTION_MARKS.includes(first as NonNullable<DialogueReaction["mark"]>)) {
        mark = first as NonNullable<DialogueReaction["mark"]>;
      } else {
        if (!context.emotionIds.includes(first)) throw new Error(`Unknown reaction emotion: ${first}`);
        expression = first;
        if (second) {
          if (!REACTION_MARKS.includes(second as NonNullable<DialogueReaction["mark"]>)) throw new Error(`Unknown reaction mark: ${second}`);
          mark = second as NonNullable<DialogueReaction["mark"]>;
        }
      }
      result.reactions ??= {};
      if (result.reactions[target]) throw new Error(`Duplicate reaction target: ${target}`);
      result.reactions[target] = { ...(expression ? { expression } : {}), ...(mark ? { mark } : {}) };
    } else if (key === "option") {
      if (!/^[a-z][a-z0-9_]*$/u.test(value) || result.optionId) throw new Error(`Invalid or duplicate option tag: ${value}`);
      result.optionId = value;
    } else if (key === "translation") {
      if (result.translationJa) throw new Error("Duplicate translation tag");
      result.translationJa = value;
    } else {
      throw new Error(`Unknown story tag: ${key}`);
    }
  }
  return result;
}
