import { z } from "zod";
import { battles, cityContents, scenes, storyState } from "../../content";
import characterData from "../../content/generated/content/presentation/characters.json";
import { getJourneyForCity } from "../../content/journeys";
import { INSERTED_KINDS } from "../../content/scene-schemas";
import { battleCityId } from "../../domain/chapter";
import type { GameState } from "../../domain/game";
import { withNames } from "../romance/names";
import { sceneCompleted } from "./music-room";

/** One person met, as 旅の記録 lists them: the name and the writer's few words (optional). */
export type MetPerson = { id: string; nameJa: string; descriptionJa?: string };
/** The people met in one city. */
export type MetPeopleGroup = { cityId: string; cityNameJa: string; people: MetPerson[] };

/** The quizzes whose partner a journey's portraits name (presentation/characters.json `battleCharacters`: quiz → character). */
const BATTLE_CHARACTERS: Readonly<Record<string, string>> =
  z.record(z.string(), z.string()).optional().parse((characterData as { battleCharacters?: unknown }).battleCharacters) ?? {};

/** The current journey's cities in travel order (the current city alone when it is in no journey). */
function journeyCityIds(game: Readonly<GameState>): string[] {
  return getJourneyForCity(game.currentCityId)?.cities.map((city) => city.id) ?? [game.currentCityId];
}

/**
 * Whether the current journey has anyone to meet: a person of its cities (progression/story.json `people`) named in a
 * scene's `# person:`, or a quiz of its cities (each has its partner).
 */
export function declaresPeople(game: Readonly<GameState>): boolean {
  const cityIds = journeyCityIds(game);
  return storyState.people.some((person) => cityIds.includes(person.cityId) && scenes.some((scene) => scene.people.includes(person.id))) ||
    battles.some((battle) => cityIds.includes(battleCityId(battle.id) ?? ""));
}

type Met = MetPerson & { cityId: string };

/**
 * 旅の記録's 「出会った人」 (2026-11-11 user decision; widened 2026-11-13): the people met so far, from the records the game
 * keeps, never a relationship value:
 * - the people of progression/story.json named in the `# person:` of a scene the player has completed (music-room.ts
 *   sceneCompleted): a city's arrival once past it, a talk or an encounter seen (the `met` rule of src/domain/conditions.ts),
 *   a guide read, a date played, an epilogue read;
 * - the partner of each quiz played: the declared person whose portrait the quiz shows (presentation/characters.json
 *   `battleCharacters`) or who has the partner's name in the same city, else the quiz's own partner (its name and role).
 * Grouped by their city in the journey's travel order; in a city, the arrival's people, then those of the talks and
 * encounters in the order seen, the quiz partners in the order played and the other scenes' (the epilogue's last). One
 * entry a person (the same name in the same city is the same person). Each has the writer's few words: the person's
 * description, else their role, else the quiz's role for its partner; the names set are filled in.
 */
export function metPeopleGroups(game: Readonly<GameState>): MetPeopleGroup[] {
  const cityIds = journeyCityIds(game);
  const at = (cityId: string) => cityIds.indexOf(cityId);
  const reached = (cityId: string) => cityId === game.currentCityId || game.completedCityIds.includes(cityId) ||
    (at(cityId) >= 0 && at(cityId) < at(game.currentCityId));
  const met: Met[] = [];
  const add = (entry: Met) => {
    const same = met.find((item) => item.id === entry.id || (item.cityId === entry.cityId && item.nameJa === entry.nameJa));
    if (!same) met.push(entry);
    else if (!same.descriptionJa && entry.descriptionJa) same.descriptionJa = entry.descriptionJa;
  };
  const words = (...texts: (string | undefined)[]) => {
    const text = texts.find((item) => item);
    return text ? { descriptionJa: text } : {};
  };
  const addPeopleOf = (sceneList: readonly (typeof scenes)[number][]) => {
    for (const scene of sceneList)
      for (const person of scene.people.flatMap((id) => storyState.people.filter((item) => item.id === id)))
        add({ id: person.id, cityId: person.cityId, nameJa: person.nameJa, ...words(person.descriptionJa, person.titleJa) });
  };
  const isArrival = (scene: (typeof scenes)[number]) => !!scene.main && "arrival" in scene.main;
  addPeopleOf(cityIds.flatMap((cityId) => scenes.filter((scene) => isArrival(scene) && scene.cityId === cityId && sceneCompleted(scene, game, reached))));
  addPeopleOf(game.seenEncounterIds.flatMap((sceneId) => scenes.filter((scene) => scene.id === sceneId && INSERTED_KINDS.includes(scene.kind))));
  for (const record of game.battleRecords) {
    const battle = battles.find((item) => item.id === record.battleId);
    const cityId = battle && battleCityId(battle.id);
    if (!battle || !cityId) continue;
    const characterId = BATTLE_CHARACTERS[battle.id];
    const person = storyState.people.find((item) => item.cityId === cityId &&
      ((characterId !== undefined && item.characterId === characterId) || item.nameJa === battle.enemyNameJa));
    add(person
      ? { id: person.id, cityId: person.cityId, nameJa: person.nameJa, ...words(person.descriptionJa, person.titleJa, battle.enemyTitleJa) }
      : { id: `quiz:${battle.id}`, cityId, nameJa: battle.enemyNameJa, ...words(battle.enemyTitleJa) });
  }
  const other = scenes.filter((scene) => !isArrival(scene) && !INSERTED_KINDS.includes(scene.kind) && sceneCompleted(scene, game, reached));
  addPeopleOf([...other.filter((scene) => !(scene.main && "epilogue" in scene.main)), ...other.filter((scene) => !!scene.main && "epilogue" in scene.main)]);
  const rank = (cityId: string) => (cityIds.includes(cityId) ? cityIds.indexOf(cityId) : cityIds.length);
  const groups = new Map<string, MetPeopleGroup>();
  for (const person of [...met].sort((a, b) => rank(a.cityId) - rank(b.cityId))) {
    const group = groups.get(person.cityId) ??
      { cityId: person.cityId, cityNameJa: cityContents[person.cityId]?.city.nameJa ?? person.cityId, people: [] };
    groups.set(person.cityId, group);
    group.people.push({ id: person.id, nameJa: person.nameJa, ...(person.descriptionJa ? { descriptionJa: withNames(person.descriptionJa, game) } : {}) });
  }
  return [...groups.values()];
}
