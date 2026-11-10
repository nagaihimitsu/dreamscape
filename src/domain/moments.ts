import { dates, episodes, getCityContent, scenes } from "../content";
import { INSERTED_KINDS, type AfterPart, type SceneAt, type SceneEntry } from "../content/scene-schemas";
import { storyFileOf } from "../content/story-address";
import { WALK_MODE_ID } from "../content/transport";

/**
 * The moments of the unified event design that are not a landmark's visit (stage 4, 2.3): the
 * place a date or a finale opens at, the city's epilogue, its departure and an arrival, the
 * hotel's night, a trip by a mode (at the place it leaves) and the ticket counter of an
 * admission; a step of a running tour (tour stages 2b, 3). Which inserted scenes run at a moment and in what order (2.4, 2.5): the negative
 * priorities before the main part, `after <part>` right after it, the positive ones after the
 * main group; the same priority in written order within a place file, then by file name. Pure:
 * reads the scene list content:build wrote. (A landmark's visit keeps encounter.ts's schedule,
 * which also places today's encounter catalogs.)
 */
export type Moment =
  | { kind: "date"; dateId: string; placeId?: string }
  | { kind: "finale"; cityId: string; placeId?: string }
  | { kind: "epilogue"; cityId: string }
  | { kind: "depart"; cityId: string }
  | { kind: "arrive"; cityId: string }
  | { kind: "hotel"; cityId: string; placeId: string }
  | { kind: "trip"; cityId: string; modeId: string; from: string; to: string }
  | { kind: "ticket"; cityId: string; placeId: string }
  | { kind: "tour"; tourId: string; stepId: string };

/** Whether one `# at:` of a scene (of `sceneCityId`) names the moment. */
export function atMatches(at: SceneAt, moment: Moment, sceneCityId: string): boolean {
  switch (moment.kind) {
    case "date": return ("date" in at && at.date === moment.dateId) || ("place" in at && !!moment.placeId && at.place === moment.placeId);
    case "finale": return ("finale" in at && at.finale === moment.cityId) || ("place" in at && !!moment.placeId && at.place === moment.placeId);
    case "epilogue": return "epilogue" in at && at.epilogue === moment.cityId;
    case "depart": return "depart" in at && at.depart === moment.cityId;
    case "arrive": return "arrive" in at && at.arrive === moment.cityId;
    case "hotel": return "hotel" in at && (at.hotel === "any" ? sceneCityId === moment.cityId : at.hotel === moment.placeId);
    case "trip": return "trip" in at && sceneCityId === moment.cityId && at.trip === moment.modeId &&
      (!at.from || at.from === moment.from) && (!at.to || at.to === moment.to);
    case "ticket": return "ticket" in at && at.ticket === moment.placeId;
    case "tour": return "tour" in at && at.tour === moment.tourId && at.step === moment.stepId;
  }
}

/** The inserted scenes (a place file's talks and encounters) that run at the moment, in any slot. */
export function scenesAt(moment: Moment): SceneEntry[] {
  return scenes.filter((scene) => scene.origin === "place" && INSERTED_KINDS.includes(scene.kind) && scene.at.some((at) => atMatches(at, moment, scene.cityId)));
}
/** Whether any scene runs at the moment (the game opens a stage-4 occasion only then; else everything goes on as before). */
export const momentHasScenes = (moment: Moment) => scenesAt(moment).length > 0;
/** A tour leg's narration (`# scene: tour_leg`; tour stage 2b), if its leg has one (content:build allows one per leg). */
export const narrationAt = (moment: Extract<Moment, { kind: "tour" }>): SceneEntry | undefined =>
  scenes.find((scene) => scene.origin === "place" && scene.kind === "tour_leg" && scene.at.some((at) => atMatches(at, moment, scene.cityId)));

const byFile = (left: SceneEntry, right: SceneEntry) => {
  const [a, b] = [storyFileOf(left.story.storyId), storyFileOf(right.story.storyId)];
  return a < b ? -1 : a > b ? 1 : left.order - right.order;
};

/** The schedule of a moment: the scenes before the main part, after a main part, and after the main group (IDs, in play order). */
export type MomentSchedule = { before: string[]; after: string[]; afterPart: Partial<Record<AfterPart, string[]>> };
export function momentSchedule(moment: Moment): MomentSchedule {
  const own = scenesAt(moment);
  const sided = (sign: 1 | -1) => own.filter((scene) => typeof scene.priority === "number" && Math.sign(scene.priority) === sign)
    .sort((left, right) => (left.priority as number) - (right.priority as number) || byFile(left, right)).map((scene) => scene.id);
  const afterPart: MomentSchedule["afterPart"] = {};
  for (const scene of [...own].sort(byFile)) if (typeof scene.priority === "string") {
    const part = scene.priority.slice("after ".length) as AfterPart;
    (afterPart[part] ??= []).push(scene.id);
  }
  return { before: sided(-1), after: sided(1), afterPart };
}

/** The place a map event happens at (a date's or a finale's), if any. */
export const eventPlace = (cityId: string, eventId: string | null) =>
  eventId === null ? undefined : getCityContent(cityId).travel.events.find((event) => event.id === eventId)?.placeId;

/** The city of a date or a finale (a battle without a landmark), if it is one. */
export function eventCity(eventId: string | null): string | undefined {
  if (eventId === null) return undefined;
  return dates.find((date) => date.id === eventId)?.chapterId ?? episodes.find((episode) => episode.id === eventId && episode.kind === "city_finale")?.cityId;
}

/** A running tour's step as a moment (tour stages 2b, 3; the occasion's `tour`). */
export const tourMoment = (tour: { id: string; step: string }): Extract<Moment, { kind: "tour" }> => ({ kind: "tour", tourId: tour.id, stepId: tour.step });

/** The trip moment of a move (walking is `walk`). */
export const tripMoment = (cityId: string, modeId: string, from: string, to: string): Moment =>
  ({ kind: "trip", cityId, modeId: modeId || WALK_MODE_ID, from, to });
