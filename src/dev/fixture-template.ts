/**
 * Which authored city Debug's 仮の場面 (and the unit tests' fictional cities)
 * copy. Development and tests only; pure over the content passed in.
 *
 * A city qualifies when it has every required role: a normal episode whose
 * landmark (with its guide) holds the episode's battle, the place hosting that
 * episode's map event plus a walk route, and a city finale with an epilogue.
 * The optional roles (special battles B and C, an encounter that gives an item,
 * a normal date) are copied when the city has them and are listed as missing
 * otherwise. Candidates: the sample journey when it is loaded (npm run
 * dev:sample, unit tests), then the available journeys in manifest order.
 */
import { placeSceneById } from "../domain/scene-effects";
import type {
  BattleDefinition, CityContent, DateDefinition, DateDestination, EpisodeDefinition, LandmarkDefinition,
  StoryBattle, TourismClue,
} from "../content";
import type { EncounterCatalog, EncounterDefinition } from "../content/encounter-schemas";
import type { Journey } from "../content/journey-catalog";
import type { TravelEvent, TravelPlace, TravelRoute } from "../content/travel-schemas";

/** The development and test journey (scripts/content-layout.ts SAMPLE_JOURNEY_ID). */
export const sampleJourneyId = "sample_trip";

/** The content a template is chosen from (the runtime catalogs, or a test's own). */
export type DebugTemplateContent = {
  journeys: readonly Journey[];
  cityContents: Readonly<Record<string, CityContent>>;
  episodes: readonly EpisodeDefinition[];
  battles: readonly BattleDefinition[];
  landmarks: readonly LandmarkDefinition[];
  tourismClues: readonly TourismClue[];
  storyBattles: readonly StoryBattle[];
  encounters: Pick<EncounterCatalog, "items" | "encounters">;
  dates: readonly DateDefinition[];
  dateDestinations: readonly DateDestination[];
};

export type OptionalTemplateRole = "special_b" | "special_c" | "encounter" | "date";
export const optionalTemplateRoles: readonly OptionalTemplateRole[] = ["special_b", "special_c", "encounter", "date"];
export const optionalTemplateRoleLabels: Record<OptionalTemplateRole, string> = {
  special_b: "特殊戦B（矛盾追及）", special_c: "特殊戦C（証拠連結）", encounter: "品物をくれる道中交流", date: "デート",
};

export type TemplateSpecial = { storyBattle: StoryBattle; battle: BattleDefinition; landmark: LandmarkDefinition };

export type DebugTemplate = {
  journey: Journey;
  city: CityContent;
  normal: { episode: EpisodeDefinition; battle: BattleDefinition; landmark: LandmarkDefinition; place: TravelPlace; event: TravelEvent };
  walkRoute: TravelRoute;
  finale: { episode: EpisodeDefinition; battle: BattleDefinition };
  special_b?: TemplateSpecial;
  special_c?: TemplateSpecial;
  encounter?: { encounter: EncounterDefinition; item: EncounterCatalog["items"][number] };
  date?: { date: DateDefinition; destination: DateDestination };
  /** Optional roles this city does not have, in the order of optionalTemplateRoles. */
  missing: OptionalTemplateRole[];
  /** For the Debug screen: what the 仮の場面 lack, or "" when nothing is missing. */
  note: string;
};

const requiredRolesJa = "案内と対決のある観光地の通常エピソード、その出来事の地点と徒歩の経路、エピローグのある都市フィナーレ";
export const noTemplateMessage = `仮の場面の元になる都市がありません。公開中の旅行編のどれかに、${requiredRolesJa}を持つ都市が必要です。`;

/**
 * The template city: `cityId` when given (it must have the required roles),
 * else the first qualifying city of the candidates. Throws a message for the person.
 */
export function findDebugTemplate(content: DebugTemplateContent, cityId?: string): DebugTemplate {
  if (cityId !== undefined) {
    const journey = content.journeys.find((item) => item.cities.some((city) => city.id === cityId));
    const template = journey && templateOf(content, journey, cityId);
    if (!template) throw new Error(`都市「${cityId}」は仮の場面の元にできません。元にする都市には、${requiredRolesJa}が必要です。`);
    return template;
  }
  // The sample journey is in the catalogs only on the development server (and in unit tests), never in
  // a production build, where Debug also ships: there both filters were no-ops, so the ID is used only
  // under DEV and stays out of the build (its text is a never-in-dist marker, scripts/dist-guard.ts).
  const sampleId = import.meta.env.DEV ? sampleJourneyId : undefined;
  const sample = content.journeys.filter((journey) => journey.id === sampleId);
  const available = content.journeys.filter((journey) => journey.status === "available" && journey.id !== sampleId);
  for (const journey of [...sample, ...available])
    for (const city of journey.cities) {
      const template = templateOf(content, journey, city.id);
      if (template) return template;
    }
  throw new Error(noTemplateMessage);
}

function templateOf(content: DebugTemplateContent, journey: Journey, cityId: string): DebugTemplate | undefined {
  const city = content.cityContents[cityId];
  if (!city || city.city.productionStatus !== "complete") return undefined;
  const { travel } = city;
  const landmarkOf = (battle: BattleDefinition) =>
    content.landmarks.find((item) => item.id === battle.landmarkId && item.cityId === cityId && item.battleId === battle.id);
  const battleOf = (id: string) => content.battles.find((item) => item.id === id);
  const walkRoute = travel.routes.find((item) => item.mode === "walk" && item.fromPlaceId !== item.toPlaceId) ??
    travel.routes.find((item) => item.mode === "walk");
  const normal = content.episodes.flatMap((episode) => {
    const battle = episode.kind === "episode" && episode.cityId === cityId ? battleOf(episode.battleId) : undefined;
    const landmark = battle && landmarkOf(battle);
    const event = landmark && episode.landmarkId === landmark.id ? travel.events.find((item) => item.id === episode.id) : undefined;
    const place = event && travel.places.find((item) => item.id === event.placeId);
    return battle && landmark && event && place ? [{ episode, battle, landmark, place, event }] : [];
  })[0];
  const finale = content.episodes.flatMap((episode) => {
    const battle = episode.kind === "city_finale" && episode.cityId === cityId && episode.epilogueStoryId ? battleOf(episode.battleId) : undefined;
    return battle ? [{ episode, battle }] : [];
  })[0];
  if (!normal || !finale || !walkRoute) return undefined;

  const special = (format: "B" | "C"): TemplateSpecial | undefined => content.storyBattles.flatMap((storyBattle) => {
    const battle = battleOf(storyBattle.battleId);
    const landmark = battle?.format === format ? landmarkOf(battle) : undefined;
    // The reasoning round points at the clues of its own landmark, which the copy renames.
    const ownClues = (ids: readonly string[]) => !!landmark && ids.every((id) => landmark.clueIds.includes(id) &&
      content.tourismClues.some((clue) => clue.id === id && clue.landmarkId === landmark.id));
    return battle && landmark && battle.reasoning && ownClues(battle.reasoning.caseClueIds) ? [{ storyBattle, battle, landmark }] : [];
  })[0];
  // A plain encounter that gives an item of this city: no quiz, no AP alternative, no item needed to choose.
  // A place file's encounter (stage 3a) gives its item by # on_done: item and needs nothing by # give:/# use:/# requires:.
  const encounter = content.encounters.encounters.flatMap((event) => {
    const place = placeSceneById(event.id);
    const plain = place ? place.kind === "encounter" && place.options.every((option) => !option.give && !option.use && !option.requires)
      : event.options.every((option) => !option.requiresItemId && !option.consumeItemId && !option.giftItemId);
    const itemId = place ? place.done.items?.[0] : event.completionItemId;
    const item = event.cityId === cityId && !event.quiz && !event.alternativeApRewardId && plain
      ? content.encounters.items.find((entry) => entry.id === itemId && entry.cityId === cityId) : undefined;
    return item ? [{ encounter: event, item }] : [];
  })[0];
  const date = content.dates.flatMap((entry) => {
    const destination = entry.kind === "normal" && travel.events.some((event) => event.id === entry.id && event.category === "date")
      ? content.dateDestinations.find((item) => item.id === entry.destinationId && item.cityId === cityId) : undefined;
    return destination ? [{ date: entry, destination }] : [];
  })[0];

  const roles = { special_b: special("B"), special_c: special("C"), encounter, date };
  const missing = optionalTemplateRoles.filter((role) => !roles[role]);
  const note = missing.length
    ? `元にした${city.city.nameJa}に${missing.map((role) => optionalTemplateRoleLabels[role]).join("・")}がないため、仮の場面にもありません。`
    : "";
  return { journey, city, normal, walkRoute, finale, ...roles, missing, note };
}
