import type { StoryStateCatalog } from "../content/scene-schemas";
import type { StoryFrame } from "../story/frame-reader";

/** The narration's plate (UI redesign §3.3, decision H). */
export const NARRATION_PLATE = "旅の風景";

/**
 * The name on a line's plate (the dialogue window and its log) and whether the line is narration:
 * the heroine's and the player's names; `enemy` the one opposite on this screen (a battle's
 * opponent, a scene's `# person:`), when there is one; `# speaker: <person ID>` that person's
 * `nameJa` (progression/story.json people; 2026-11-11). Narration, and a speaker the screen
 * cannot name, show 旅の風景.
 */
export function speakerPlate(
  frame: Pick<StoryFrame, "speaker" | "speakerPersonId">,
  names: { heroine: string; player: string; enemy?: string },
  people: StoryStateCatalog["people"],
): { name: string; narration: boolean } {
  const name = frame.speaker === "heroine" ? names.heroine
    : frame.speaker === "player" ? names.player
      : frame.speaker === "enemy" ? names.enemy
        : frame.speaker === "person" ? people.find((person) => person.id === frame.speakerPersonId)?.nameJa
          : undefined;
  return name === undefined ? { name: NARRATION_PLATE, narration: true } : { name, narration: false };
}

/** A name plate's text (NameCutInPlate): the role over the name, and a battle opponent's quote when written. */
export type NameCutIn = { titleJa?: string; nameJa: string; quoteJa?: string };

/**
 * The name plate a line's `# cutin: name` shows (2026-11-11 user decision): a person's (`# speaker: <person ID>`) `titleJa`
 * and `nameJa` (progression/story.json people), or for `# speaker: enemy` the one opposite on this screen (`enemy`: a
 * battle's opponent, a scene's `# person:`), when there is one. None for a line without the tag.
 */
export function nameCutIn(
  frame: Pick<StoryFrame, "speaker" | "speakerPersonId" | "cutin">,
  enemy: NameCutIn | undefined,
  people: StoryStateCatalog["people"],
): NameCutIn | undefined {
  if (frame.cutin !== "name") return undefined;
  if (frame.speaker === "enemy") return enemy;
  const person = frame.speaker === "person" ? people.find((item) => item.id === frame.speakerPersonId) : undefined;
  return person && { nameJa: person.nameJa, ...(person.titleJa ? { titleJa: person.titleJa } : {}) };
}
