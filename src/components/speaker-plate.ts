import type { StoryStateCatalog } from "../content/scene-schemas";
import type { StoryFrame } from "../story/frame-reader";

/** The narration's name in the log (UI redesign §3.3, decision H); the window shows no band for it (2026-11-25). */
export const NARRATION_PLATE = "旅の風景";

/**
 * The name on a line's plate (the dialogue window and its log) and whether the line is narration:
 * the heroine's and the player's names; `enemy` the one opposite on this screen (a battle's
 * opponent, a scene's `# person:`), when there is one; `# speaker: <person ID>` that person's
 * `nameJa` (progression/story.json people; 2026-11-11). Narration, and a speaker the screen
 * cannot name, are the narration: the window shows no band, the log 旅の風景. A remembered line (`# remembered`, 2026-11-16) with a name on its
 * plate is `remembered`: the plate shows REMEMBERED_MARK beside the name (DialogueWindowHead),
 * the window a memory's tone, and the log the name with it (loggedSpeaker).
 */
export function speakerPlate(
  frame: Pick<StoryFrame, "speaker" | "speakerPersonId" | "remembered">,
  names: { heroine: string; player: string; enemy?: string },
  people: StoryStateCatalog["people"],
): SpeakerPlate {
  const name = frame.speaker === "heroine" ? names.heroine
    : frame.speaker === "player" ? names.player
      : frame.speaker === "enemy" ? names.enemy
        : frame.speaker === "person" ? people.find((person) => person.id === frame.speakerPersonId)?.nameJa
          : undefined;
  if (name === undefined) return { name: NARRATION_PLATE, narration: true };
  return frame.remembered ? { name, narration: false, remembered: true } : { name, narration: false };
}

/** A line's plate (speakerPlate): the name it shows, whether it is the narration's, and whether the line is remembered. */
export type SpeakerPlate = { name: string; narration: boolean; remembered?: true };

/** The mark beside the name on a remembered line's plate (`# remembered`, 2026-11-16 user decision): a label, not a button. */
export const REMEMBERED_MARK = "回想";

/** The name the conversation log keeps for a line: a remembered line's 「<name>（回想）」. */
export const loggedSpeaker = (plate: { name: string; remembered?: boolean }): string =>
  plate.remembered ? `${plate.name}（${REMEMBERED_MARK}）` : plate.name;

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
