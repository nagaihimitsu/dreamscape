import { battles, cityContents, scenes, storyState } from "../../content";
import { battleCityId } from "../../domain/chapter";
import type { GameState } from "../../domain/game";
import { journeyCityIds, metPeople } from "../../domain/met-people";
import { withNames } from "../romance/names";

/**
 * One person met, as 旅の記録 lists them: the name and the writer's few words (optional). `characterId`: the person's
 * portrait (story.json `characterId`, or the quiz's partner in characters.json), when there is one.
 */
export type MetPerson = { id: string; nameJa: string; descriptionJa?: string; characterId?: string };
/** The people met in one city. */
export type MetPeopleGroup = { cityId: string; cityNameJa: string; people: MetPerson[] };

/**
 * Whether the current journey has anyone to meet: a person of its cities (progression/story.json `people`) named in a
 * scene's `# person:`, or a quiz of its cities (each has its partner).
 */
export function declaresPeople(game: Readonly<GameState>): boolean {
  const cityIds = journeyCityIds(game);
  return storyState.people.some((person) => cityIds.includes(person.cityId) && scenes.some((scene) => scene.people.includes(person.id))) ||
    battles.some((battle) => cityIds.includes(battleCityId(battle.id) ?? ""));
}

/**
 * 旅の記録's 「出会った人」 (2026-11-11 user decision; widened 2026-11-13): the people met so far (src/domain/met-people.ts
 * metPeople), grouped by their city in the journey's travel order, in a city in the order met; the names set are filled in.
 */
export function metPeopleGroups(game: Readonly<GameState>): MetPeopleGroup[] {
  const cityIds = journeyCityIds(game);
  const met = metPeople(game);
  const rank = (cityId: string) => (cityIds.includes(cityId) ? cityIds.indexOf(cityId) : cityIds.length);
  const groups = new Map<string, MetPeopleGroup>();
  for (const person of [...met].sort((a, b) => rank(a.cityId) - rank(b.cityId))) {
    const group = groups.get(person.cityId) ??
      { cityId: person.cityId, cityNameJa: cityContents[person.cityId]?.city.nameJa ?? person.cityId, people: [] };
    groups.set(person.cityId, group);
    group.people.push({ id: person.id, nameJa: person.nameJa, ...(person.descriptionJa ? { descriptionJa: withNames(person.descriptionJa, game) } : {}),
      ...(person.characterId ? { characterId: person.characterId } : {}) });
  }
  return [...groups.values()];
}
