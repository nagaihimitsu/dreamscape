import type { StoryStateCatalog } from "../content/scene-schemas";

/** The person who stands opposite the heroine in a scene: their portrait and their name for `# speaker: enemy`. */
export type ScenePerson = { characterId: string; nameJa: string; titleJa?: string };

/**
 * The first of a scene's `# person:` that has a portrait (`characterId` in progression/story.json
 * people). A talk, encounter, arrival or epilogue shows that person on the other side of the
 * heroine and names their `# speaker: enemy` lines; a scene without one keeps today's look.
 */
export function scenePerson(people: StoryStateCatalog["people"], scenePeople: readonly string[] | undefined): ScenePerson | undefined {
  for (const id of scenePeople ?? []) {
    const person = people.find((item) => item.id === id);
    if (person?.characterId) return { characterId: person.characterId, nameJa: person.nameJa, ...(person.titleJa ? { titleJa: person.titleJa } : {}) };
  }
  return undefined;
}

/**
 * The portrait of the person who says the line in their own name (`# speaker: <person ID>`), when
 * that person has one (`characterId`; 2026-11-11 user decision): from that line they stand opposite
 * the heroine in any scene (scene-stage.ts). A phone's message or a sheet's line is read, not
 * said there: no one comes in for it.
 */
export function speakingPerson(people: StoryStateCatalog["people"],
  frame: { speaker: string; speakerPersonId?: string; phone?: unknown; letter?: unknown }): string | undefined {
  if (frame.speaker !== "person" || frame.phone || frame.letter) return undefined;
  return people.find((item) => item.id === frame.speakerPersonId)?.characterId;
}
