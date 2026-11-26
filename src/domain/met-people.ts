import { z } from "zod";
import { battles, cityContents, scenes, storyState } from "../content";
import characterData from "../content/generated/content/presentation/characters.json";
import { getJourneyForCity } from "../content/journeys";
import { INSERTED_KINDS } from "../content/scene-schemas";
import { battleCityId } from "./chapter";
import type { GameState } from "./game-state-schema";
import type { MetTime } from "./met-times";
import { sceneCompleted } from "./scene-completed";

// The people met on the journey (2026-11-11 user decision; widened 2026-11-13), from the records the game keeps, never a
// relationship value; 旅の記録's 「出会った人」 (src/features/journey/met-people.ts) lists them. And the record of when and
// where each was first met (met-times.ts): the action that first lists a person records it (applyPlayerAction).

/** One person met: the entry's ID (a person of progression/story.json, or `quiz:<battle ID>` for a quiz's own partner). */
export type MetEntry = { id: string; cityId: string; nameJa: string; descriptionJa?: string; characterId?: string };

/** The quizzes whose partner a journey's portraits name (presentation/characters.json `battleCharacters`: quiz → character). */
const BATTLE_CHARACTERS: Readonly<Record<string, string>> =
  z.record(z.string(), z.string()).optional().parse((characterData as { battleCharacters?: unknown }).battleCharacters) ?? {};

/** The ID of a quiz's own partner, when no declared person stands for them. */
const quizPartnerId = (battleId: string) => `quiz:${battleId}`;

/** The current journey's cities in travel order (the current city alone when it is in no journey). */
export function journeyCityIds(game: Pick<GameState, "currentCityId">): string[] {
  return getJourneyForCity(game.currentCityId)?.cities.map((city) => city.id) ?? [game.currentCityId];
}

/**
 * The people met so far, in the order 旅の記録 meets them (not yet grouped by city):
 * - the people of progression/story.json named in the `# person:` of a scene the player has completed (sceneCompleted):
 *   a city's arrival once past it, a talk or an encounter seen (the `met` rule of conditions.ts), a guide read, a date
 *   played, an epilogue read;
 * - the partner of each quiz played, always under the name the quiz gives them (`enemyNameJa`; 2026-11-25 user decision):
 *   the declared person of the same city with that name, else the one whose portrait the quiz shows
 *   (presentation/characters.json `battleCharacters`; declared under another name), else the quiz's own partner (its name
 *   and role).
 * In a city's order: the arrival's people, then those of the talks and encounters in the order seen, the quiz partners in
 * the order played and the other scenes' (the epilogue's last). One entry a person (the same name in the same city is the
 * same person). Each has the writer's few words: the person's description, else their role, else the quiz's role for its
 * partner (the names set not yet filled in).
 */
export function metPeople(game: Readonly<GameState>): MetEntry[] {
  const cityIds = journeyCityIds(game);
  const at = (cityId: string) => cityIds.indexOf(cityId);
  const reached = (cityId: string) => cityId === game.currentCityId || game.completedCityIds.includes(cityId) ||
    (at(cityId) >= 0 && at(cityId) < at(game.currentCityId));
  const met: MetEntry[] = [];
  const add = (entry: MetEntry) => {
    const same = met.find((item) => item.id === entry.id || (item.cityId === entry.cityId && item.nameJa === entry.nameJa));
    if (!same) met.push(entry);
    else {
      if (!same.descriptionJa && entry.descriptionJa) same.descriptionJa = entry.descriptionJa;
      if (!same.characterId && entry.characterId) same.characterId = entry.characterId;
    }
  };
  const words = (...texts: (string | undefined)[]) => {
    const text = texts.find((item) => item);
    return text ? { descriptionJa: text } : {};
  };
  const portrait = (characterId: string | undefined) => (characterId ? { characterId } : {});
  const addPeopleOf = (sceneList: readonly (typeof scenes)[number][]) => {
    for (const scene of sceneList)
      for (const person of scene.people.flatMap((id) => storyState.people.filter((item) => item.id === id)))
        add({ id: person.id, cityId: person.cityId, nameJa: person.nameJa, ...words(person.descriptionJa, person.titleJa), ...portrait(person.characterId) });
  };
  const isArrival = (scene: (typeof scenes)[number]) => !!scene.main && "arrival" in scene.main;
  addPeopleOf(cityIds.flatMap((cityId) => scenes.filter((scene) => isArrival(scene) && scene.cityId === cityId && sceneCompleted(scene, game, reached))));
  addPeopleOf(game.seenEncounterIds.flatMap((sceneId) => scenes.filter((scene) => scene.id === sceneId && INSERTED_KINDS.includes(scene.kind))));
  for (const record of game.battleRecords) {
    const battle = battles.find((item) => item.id === record.battleId);
    const cityId = battle && battleCityId(battle.id);
    if (!battle || !cityId) continue;
    const characterId = BATTLE_CHARACTERS[battle.id];
    const inCity = storyState.people.filter((item) => item.cityId === cityId);
    const named = inCity.find((item) => item.nameJa === battle.enemyNameJa);
    // The quiz's partner by their own name (enemyNameJa): a person of the partner's portrait declared under another name lends
    // the entry its ID and words, not its name.
    const person = named ?? (characterId === undefined ? undefined : inCity.find((item) => item.characterId === characterId));
    add(person
      ? { id: person.id, cityId: person.cityId, nameJa: named ? person.nameJa : battle.enemyNameJa,
        ...words(person.descriptionJa, person.titleJa, battle.enemyTitleJa), ...portrait(person.characterId ?? characterId) }
      : { id: quizPartnerId(battle.id), cityId, nameJa: battle.enemyNameJa, ...words(battle.enemyTitleJa), ...portrait(characterId) });
  }
  const other = scenes.filter((scene) => !isArrival(scene) && !INSERTED_KINDS.includes(scene.kind) && sceneCompleted(scene, game, reached));
  addPeopleOf([...other.filter((scene) => !(scene.main && "epilogue" in scene.main)), ...other.filter((scene) => !!scene.main && "epilogue" in scene.main)]);
  return met;
}

/** The IDs of the people met so far (metPeople). */
export const metPersonIds = (game: Readonly<GameState>): Set<string> => new Set(metPeople(game).map((entry) => entry.id));

/**
 * The state with the city, day, minute and place it is at now recorded for each person met in it who was not met in the
 * state the action began from (`before`: metPersonIds of it) and has no record yet. The people a save had met before it
 * kept times are in `before`, so they never take the time of a later action. Unchanged when no one is new. Called on the
 * snapshot an action leaves (no revision of its own).
 */
export function recordMetTimes(state: GameState, before: ReadonlySet<string>): GameState {
  const known = new Set((state.metTimes ?? []).map((item) => item.id));
  const added = [...metPersonIds(state)].filter((id) => !before.has(id) && !known.has(id)).map((id): MetTime =>
    ({ id, cityId: state.currentCityId, day: state.travel.day, minute: state.travel.minute, placeId: state.travel.currentPlaceId }));
  return added.length ? { ...state, metTimes: [...(state.metTimes ?? []), ...added] } : state;
}

/**
 * A record names only what this build knows, as the save's other references do: a declared person or a quiz, a city of the
 * save's journey and a place of that city. Otherwise the save is not loaded and its data is kept (persistence loadGame).
 */
export function validateMetTimes(state: GameState): void {
  const journeyId = getJourneyForCity(state.currentCityId)?.id;
  for (const item of state.metTimes ?? []) {
    const city = cityContents[item.cityId];
    const known = storyState.people.some((person) => person.id === item.id) ||
      battles.some((battle) => quizPartnerId(battle.id) === item.id);
    if (!known || !city || getJourneyForCity(item.cityId)?.id !== journeyId || !city.travel.places.some((place) => place.id === item.placeId))
      throw new Error("出会った人の記録の参照先が見つかりません。");
  }
}
