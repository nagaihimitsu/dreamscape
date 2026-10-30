export interface TagContext {
  effectIds: string[];
  backgroundIds: string[];
  emotionIds: string[];
}

export interface StoryTags {
  speaker?: "narrator" | "heroine" | "player";
  background?: string;
  emotion?: string;
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
      if (!["narrator", "heroine", "player"].includes(value))
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
    } else {
      throw new Error(`Unknown story tag: ${key}`);
    }
  }
  return result;
}
