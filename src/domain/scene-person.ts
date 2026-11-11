import type { StoryStateCatalog } from "../content/scene-schemas";

/** The person who stands opposite the heroine in a scene: their portrait and their name for `# speaker: enemy`. */
export type ScenePerson = { characterId: string; nameJa: string };

/**
 * The first of a scene's `# person:` that has a portrait (`characterId` in progression/story.json
 * people). A talk, encounter, arrival or epilogue shows that person on the other side of the
 * heroine and names their `# speaker: enemy` lines; a scene without one keeps today's look.
 */
export function scenePerson(people: StoryStateCatalog["people"], scenePeople: readonly string[] | undefined): ScenePerson | undefined {
  for (const id of scenePeople ?? []) {
    const person = people.find((item) => item.id === id);
    if (person?.characterId) return { characterId: person.characterId, nameJa: person.nameJa };
  }
  return undefined;
}
