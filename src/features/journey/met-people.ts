import { cityContents, scenes, storyState } from "../../content";
import { getJourneyForCity } from "../../content/journeys";
import { INSERTED_KINDS } from "../../content/scene-schemas";
import type { GameState } from "../../domain/game";
import { withNames } from "../romance/names";

/** One person met, as 旅の記録 lists them: the name and the writer's few words (optional). */
export type MetPerson = { id: string; nameJa: string; descriptionJa?: string };
/** The people met in one city. */
export type MetPeopleGroup = { cityId: string; cityNameJa: string; people: MetPerson[] };

/** The current journey's cities in travel order (the current city alone when it is in no journey). */
function journeyCityIds(game: Readonly<GameState>): string[] {
  return getJourneyForCity(game.currentCityId)?.cities.map((city) => city.id) ?? [game.currentCityId];
}

/**
 * Whether the current journey has anyone to meet: a person of its cities (progression/story.json `people`)
 * named in a talk's or an encounter's `# person:`, the scenes whose seeing the `met` rule reads. A person
 * named only in an arrival or epilogue (for their portrait) is never listed, so they do not open the section.
 */
export function declaresPeople(game: Readonly<GameState>): boolean {
  const cityIds = journeyCityIds(game);
  return storyState.people.some((person) => cityIds.includes(person.cityId) &&
    scenes.some((scene) => INSERTED_KINDS.includes(scene.kind) && scene.people.includes(person.id)));
}

/**
 * 旅の記録's 「出会った人」 (2026-11-11 user decision): the people of progression/story.json met so far (a scene naming the
 * person in `# person:` was seen: the `met` rule of src/domain/conditions.ts), grouped by their city in the journey's
 * travel order, each city's people in the order first met. Names and the writer's descriptions only, never a
 * relationship value; the names set are filled into a description.
 */
export function metPeopleGroups(game: Readonly<GameState>): MetPeopleGroup[] {
  const firstMet: string[] = [];
  for (const sceneId of game.seenEncounterIds)
    for (const scene of scenes.filter((item) => item.id === sceneId))
      for (const personId of scene.people) if (!firstMet.includes(personId)) firstMet.push(personId);
  const cityIds = journeyCityIds(game);
  const rank = (cityId: string) => (cityIds.includes(cityId) ? cityIds.indexOf(cityId) : cityIds.length);
  const people = firstMet.flatMap((id) => storyState.people.filter((person) => person.id === id))
    .sort((a, b) => rank(a.cityId) - rank(b.cityId));
  const groups = new Map<string, MetPeopleGroup>();
  for (const person of people) {
    const group = groups.get(person.cityId) ??
      { cityId: person.cityId, cityNameJa: cityContents[person.cityId]?.city.nameJa ?? person.cityId, people: [] };
    groups.set(person.cityId, group);
    group.people.push({ id: person.id, nameJa: person.nameJa, ...(person.descriptionJa ? { descriptionJa: withNames(person.descriptionJa, game) } : {}) });
  }
  return [...groups.values()];
}
