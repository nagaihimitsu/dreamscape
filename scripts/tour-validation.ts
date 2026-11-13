import { tourSchema, type Tour, type TourLeg } from "../src/content/tour-schemas";
import { isTourOnlyPlace, type TravelCatalog, type TravelEvent } from "../src/content/travel-schemas";
import { conditionLeaves, type Condition } from "../src/content/condition-schemas";
import type { SceneEntry } from "../src/content/scene-schemas";
import { DAY_END, DAY_START } from "../src/domain/travel";
import { displayPath, type ContentSources } from "./content-sources";
import { schemaIssueLines } from "./content-validation-utils";
import type { ContentWarning } from "./content-report";

// The tours of the journey folders (tour design stage 2a; `tours/<tourId>.json`): their shape
// (parseTourFiles), then the rules between a tour and its city (validateTours, content:build). Pure,
// on the loaded sources and the parsed catalogs. Following AGENTS.md's first principle, only what
// would break a run or a save stops the build (an unknown place or event, a broken chain of steps, a
// time the save cannot hold, an end with no way home, a published placeholder); the rest are
// warnings (windows, the 21:00 return, desk places, the source mix, the `# then:` cases).

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The latest saved minute (game-state-schema.ts travel.minute) and the latest end of a map event's window (activeEvent.endMinute). */
const LAST_MINUTE = 1980;
const LAST_EVENT_END = 1320;

/** A parsed tour with the file it comes from. */
export type TourFile = { file: string; layer: string; tour: Tour };

/**
 * Every tour file, parsed strictly (`schemaVersion: 1`), named after its ID (`tours/<id>.json`),
 * each ID once across the journeys. Throws the first problem, naming the file.
 */
export function parseTourFiles(sources: Pick<ContentSources, "root" | "tourFiles">): TourFile[] {
  const seen = new Map<string, string>();
  return sources.tourFiles.map(({ file, layer, id, data }) => {
    const shown = displayPath(sources.root, file);
    if (isObject(data) && typeof data.id === "string" && data.id !== id)
      throw new Error(`ツアーのファイル名がツアーIDと違います（Tour file name differs from its id）: ${shown} のIDは ${JSON.stringify(data.id)} です。` +
        `ファイル名を ${data.id}.json にしてください。`);
    const parsed = tourSchema.safeParse(data);
    if (!parsed.success) throw new Error(`Invalid tour ${shown}:\n${schemaIssueLines(parsed.error.issues)}`, { cause: parsed.error });
    const previous = seen.get(parsed.data.id);
    if (previous) throw new Error(`Duplicate tour ID ${parsed.data.id}: ${previous} and ${shown}`);
    seen.set(parsed.data.id, shown);
    return { file, layer, tour: parsed.data };
  });
}

/** What the tour checks read of the content. */
export type TourCheckContent = {
  root: string;
  tours: readonly TourFile[];
  /**
   * Every city with its journey (the journey that lists it), its travel data and its hotel; `prototype`: an unpublished city (no
   * scene can be played there yet), whose tours may name events still to be written (`pending_content`).
   */
  cities: readonly { id: string; journeyId?: string; travel: TravelCatalog; hotelPlaceId: string; prototype?: boolean }[];
  episodes: readonly { id: string; kind: "episode" | "city_finale"; cityId: string; landmarkId: string | null; battleId: string }[];
  /** The special battles (B, C) by battle ID. */
  storyBattleIds: readonly string[];
  battles: readonly { id: string; landmarkId: string | null }[];
  /** Journeys published (`status: "available"`; the sample journey aside): their tours keep no placeholder. */
  publishedJourneyIds: ReadonlySet<string>;
  /** The scene list (generated/scenes.json), for the `# then:` warnings. */
  scenes: readonly Pick<SceneEntry, "id" | "cityId" | "at" | "priority" | "then" | "options" | "main">[];
};

/** A tour's steps with their times from 09:00 at the hotel (the schedule continueTour follows; src/domain/tour.ts). */
type Timed = { index: number; from: string; to: string; start: number; end: number; event?: TravelEvent; leg?: TourLeg };

const PLACEHOLDER = /<[^<>]*>|要調査|\bTODO\b|\bTBD\b/u;
/** The texts of a JSON value that look like a placeholder (`<要調査>`, `<Q1>`). */
function placeholders(value: unknown, at = ""): string[] {
  if (typeof value === "string") return PLACEHOLDER.test(value) ? [`${at || "/"} "${value}"`] : [];
  if (Array.isArray(value)) return value.flatMap((item, index) => placeholders(item, `${at}/${index}`));
  if (isObject(value)) return Object.entries(value).flatMap(([key, item]) => placeholders(item, `${at}/${key}`));
  return [];
}

/** Whether a condition names a seen (or finished) encounter or scene: an introduction comes from meeting someone (decision 9). */
const namesSeenScene = (condition: Condition | undefined) => !!condition &&
  conditionLeaves(condition).some((leaf) => "encounterSeen" in leaf || "encounterCompleted" in leaf);

const sourceMix = (sources: readonly { claimType: string }[]) =>
  sources.some((source) => source.claimType === "documented_fact") && sources.some((source) => source.claimType === "hypothesis");

/**
 * The rules between the tours and their cities (tour design §2.16, the 2a checks 1–4, 6–9, 13, 14).
 * Throws every error at once (one per line); returns the warnings.
 */
export function validateTours(content: TourCheckContent): ContentWarning[] {
  const errors: string[] = [];
  const warnings: ContentWarning[] = [];
  const warn = (message: string) => warnings.push({ kind: "tour-note", message });
  const toursOfEvent = new Map<string, string[]>();
  for (const { file, layer, tour } of content.tours) {
    const shown = displayPath(content.root, file);
    const fail = (message: string) => errors.push(`${message}: ${shown}`);
    const city = content.cities.find((item) => item.id === tour.cityId);
    if (!city) { fail(`ツアーの都市 ${tour.cityId} がありません（Unknown tour city）`); continue; }
    if (city.journeyId !== layer) { fail(`ツアーの都市 ${tour.cityId} はこの旅行編の都市ではありません（Tour city of another journey）`); continue; }
    const { travel, hotelPlaceId } = city;
    const placeOf = (id: string) => travel.places.find((place) => place.id === id);
    for (const [label, ids] of [["行程", tour.steps.map((step) => step.id)], ["販売", tour.offers.map((offer) => offer.id)]] as const)
      if (new Set(ids).size !== ids.length) fail(`${label}のIDが重なっています（Duplicate tour ${label === "行程" ? "step" : "offer"} ID）`);
    if (!tour.steps.some((step) => step.kind === "event")) fail("ツアーに見学の行程（kind: \"event\"）がありません（Tour without an event step）");
    if (content.publishedJourneyIds.has(layer)) {
      const found = placeholders(tour);
      if (found.length) fail(`公開中の旅行編のツアーに仮の値が残っています（Placeholder in a published tour）: ${found.join(", ")}`);
    }

    // The chain from the hotel at 09:00 (checks 3, 4, 7, 8).
    const timed: Timed[] = [];
    let place = hotelPlaceId;
    let minute = DAY_START;
    let broken = false;
    for (const [index, step] of tour.steps.entries()) {
      if (step.kind === "leg") {
        if (!placeOf(step.toPlaceId)) { fail(`行程 ${step.id} の行き先 ${step.toPlaceId} はこの都市の地点ではありません（Unknown leg place）`); broken = true; break; }
        if (step.toPlaceId === place) fail(`行程 ${step.id} はいる地点 ${place} へ向かっています（Leg to the place it starts from）`);
        timed.push({ index, from: place, to: step.toPlaceId, start: minute, end: minute + step.minutes, leg: step });
        if (!sourceMix(step.sources))
          warn(`Tour leg sources: ${shown} step ${step.id} has no documented_fact or no hypothesis source (a leg's time is a game estimate ` +
            "backed by a documented fact; not stopped)");
        place = step.toPlaceId;
        minute += step.minutes;
        continue;
      }
      const event = travel.events.find((item) => item.id === step.eventId);
      if (!event) { fail(`行程 ${step.id} の出来事 ${step.eventId} はこの都市の地図の出来事ではありません（Unknown tour event）`); broken = true; break; }
      toursOfEvent.set(event.id, [...(toursOfEvent.get(event.id) ?? []), tour.id]);
      if (event.placeId !== place) fail(`行程 ${step.id} の出来事 ${event.id} は、ツアーがいる地点 ${place} ではなく ${event.placeId} の出来事です（Event step away from the tour's place）`);
      if (!isTourOnlyPlace(placeOf(event.placeId)))
        fail(`行程 ${step.id} の出来事 ${event.id} はツアー専用の地点（"access": "tour"）の出来事ではありません（Tour event at a normal place）`);
      const episode = content.episodes.find((item) => item.id === event.id);
      const special = content.storyBattleIds.includes(event.id);
      // An event still to be written opens nothing; in a prototype city no tour can run yet (as its map events wait), so it waits too.
      if (event.contentStatus === "pending_content" ? !city.prototype : event.category !== "main" || (episode ? episode.kind !== "episode" : !special))
        fail(`行程 ${step.id} の出来事 ${event.id} は、観光地のエピソードか特殊戦にしてください（都市フィナーレ・デート・制作中の出来事はツアーで開けません）（Invalid tour event kind）`);
      const end = minute + event.activityMinutes;
      timed.push({ index, from: place, to: place, start: minute, end, event });
      if (end > LAST_EVENT_END) fail(`行程 ${step.id} は ${clock(end)} に終わります。地図の出来事は22:00までに終わる必要があります（Tour event ends after 22:00）`);
      const opening = placeOf(event.placeId)?.openingWindows;
      if ((opening && !opening.some((window) => minute >= window.start && minute < window.end)) ||
          (event.startWindows && !event.startWindows.some((window) => minute >= window.start && minute < window.end)) ||
          (event.endWindows && !event.endWindows.some((window) => end >= window.start && end <= window.end)))
        warn(`Tour schedule outside the windows: ${shown} step ${step.id} reaches ${event.id} at ${clock(minute)} and ends at ${clock(end)}, ` +
          `outside the place's opening or the event's start or end windows (the tour still opens it; not stopped)`);
      minute = end;
    }
    if (minute > LAST_MINUTE) fail(`ツアーの終わり ${clock(minute)} が保存できる時刻（翌9:00）を超えます（Tour ends too late）`);
    if (broken) continue;
    const last = tour.steps.at(-1)!;
    if (last.kind !== "leg") fail("ツアーの最後の行程は移動（kind: \"leg\"）にしてください（Tour does not end with a leg）");
    else if (isTourOnlyPlace(placeOf(last.toPlaceId))) fail(`ツアーの最後の行き先 ${last.toPlaceId} はツアー専用の地点です（Tour ends at a tour-only place）`);
    else if (last.toPlaceId !== hotelPlaceId) {
      const walk = travel.routes.find((route) => route.fromPlaceId === last.toPlaceId && route.toPlaceId === hotelPlaceId && route.mode === "walk");
      if (!walk) fail(`ツアーの最後の行き先 ${last.toPlaceId} は宿でも、宿へ歩いて帰れる地点でもありません（Tour ends with no walk home）`);
      else if (minute + walk.minutes > DAY_END)
        warn(`Tour returns late: ${shown} ends at ${last.toPlaceId} at ${clock(minute)}, and the walk to the hotel ends after 21:00 (not stopped)`);
    } else if (minute > DAY_END) warn(`Tour returns late: ${shown} is back at the hotel at ${clock(minute)}, after 21:00 (not stopped)`);

    // Offers (checks 9, 13).
    for (const offer of tour.offers) {
      for (const placeId of offer.placeIds ?? []) {
        const offerPlace = placeOf(placeId);
        if (!offerPlace) { fail(`販売 ${offer.id} の場所 ${placeId} はこの都市の地点ではありません（Unknown offer place）`); continue; }
        if (isTourOnlyPlace(offerPlace) || (placeId !== hotelPlaceId && !travel.events.some((event) => event.placeId === placeId)))
          warn(`Tour offer place out of reach: ${shown} offer ${offer.id} is sold at ${placeId}, which is ${isTourOnlyPlace(offerPlace) ? "tour-only" :
            "neither the hotel nor a place with a map event"} (the party may never stand there; not stopped)`);
      }
      if (offer.channel === "introduced" && !namesSeenScene(offer.when))
        warn(`Introduced tour offer without its introduction: ${shown} offer ${offer.id} is "introduced" but its when names no seen scene ` +
          "(encounterSeen or encounterCompleted; decision 9; not stopped)");
      if (!sourceMix(offer.sources))
        warn(`Tour offer sources: ${shown} offer ${offer.id} has no documented_fact or no hypothesis source (a price is a game value ` +
          "built from documented prices; not stopped)");
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));

  // Tour-only places (check 6): each is used by a tour, each event there is in exactly one.
  for (const city of content.cities)
    for (const place of city.travel.places.filter((item) => isTourOnlyPlace(item))) {
      const events = city.travel.events.filter((event) => event.placeId === place.id);
      if (!events.some((event) => toursOfEvent.has(event.id)))
        warn(`Tour-only place without a tour: ${city.id}/${place.id} has "access": "tour" but no tour of the city opens an event there (not stopped)`);
      for (const event of events) {
        const holding = toursOfEvent.get(event.id) ?? [];
        if (holding.length !== 1)
          warn(`Tour-only event ${holding.length ? "in more than one tour" : "in no tour"}: ${city.id}/${event.id}${holding.length ? ` (${holding.join(", ")})` : ""} ` +
            "(the progression check stops a required one that no tour reaches; not stopped)");
      }
    }
  return [...warnings, ...tourSceneWarnings(content)];
}

/**
 * The `# then:` cases a tour skips (A20, tour design §2.6): a hotel scene after the night (`# priority:` +N) with a then: in a city
 * that has a tour does not run its then: on a booked tour's morning; a then: at a tour event step's visit (its inserted scenes and
 * its guide's and battle's heads) or at a tour's step itself (`# at: tour <tour> <step>`, tour stages 2b, 3) never runs while the tour
 * runs. Both only warn: the game refuses the then: and goes on.
 */
export function tourSceneWarnings(content: Pick<TourCheckContent, "root" | "tours" | "cities" | "episodes" | "battles" | "scenes">): ContentWarning[] {
  const warnings: ContentWarning[] = [];
  const hasThen = (scene: TourCheckContent["scenes"][number]) => !!scene.then || scene.options.some((option) => !!option.then);
  const tourCities = new Set(content.tours.map((item) => item.tour.cityId));
  for (const scene of content.scenes.filter((item) => tourCities.has(item.cityId) && hasThen(item)))
    if (scene.at.some((moment) => "hotel" in moment) && typeof scene.priority === "number" && scene.priority > 0)
      warnings.push({ kind: "tour-note", message: `Then: on a booked tour's morning: the hotel scene ${scene.id} (after the night) has a then:, ` +
        `and ${scene.cityId} has a tour; on the morning a booked tour starts the then: does not run (A20; not stopped)` });
  for (const { tour } of content.tours) {
    const travel = content.cities.find((item) => item.id === tour.cityId)?.travel;
    for (const step of tour.steps) {
      if (step.kind !== "event") continue;
      const event = travel?.events.find((item) => item.id === step.eventId);
      const episode = content.episodes.find((item) => item.id === step.eventId);
      const battleId = episode?.battleId ?? step.eventId;
      const landmarkId = episode?.landmarkId ?? content.battles.find((item) => item.id === battleId)?.landmarkId ?? undefined;
      const atVisit = (scene: TourCheckContent["scenes"][number]) => scene.cityId === tour.cityId && (
        scene.at.some((moment) => ("visit" in moment && (moment.visit === landmarkId || moment.visit === "any")) || ("place" in moment && moment.place === event?.placeId)) ||
        (!!scene.main && (("guide" in scene.main && scene.main.guide === landmarkId) || ("battle" in scene.main && scene.main.battle === battleId))));
      for (const scene of content.scenes.filter((item) => hasThen(item) && atVisit(item)))
        warnings.push({ kind: "tour-note", message: `Then: during a tour: the scene ${scene.id} at the visit of ${step.eventId} has a then:, and that visit ` +
          `is step ${step.id} of the tour ${tour.id}; while a tour runs the then: is refused (the tour goes on; not stopped)` });
    }
    for (const scene of content.scenes.filter((item) => hasThen(item) && item.at.some((moment) => "tour" in moment && moment.tour === tour.id)))
      warnings.push({ kind: "tour-note", message: `Then: during a tour: the scene ${scene.id} at a step of the tour ${tour.id} has a then:; ` +
        "while a tour runs the then: is refused (the tour goes on; not stopped)" });
  }
  return warnings;
}

const clock = (minute: number) => `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`;
