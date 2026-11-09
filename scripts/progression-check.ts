import {
  conditionLeaves, leafKind, requiredLeaves, type Condition, type Leaf, type LeafKind,
} from "../src/content/condition-schemas";

// The progression check (unified event design stage 2b, 3.3 check 9 and its warnings; pure, on
// plain content and a snapshot of the records). For each city it asks whether the city finale can
// still show on the map when the player plays as well as possible: the map conditions (`when`, or
// the current rule written as the same condition) are read as "can become true" over the main
// parts that can be reached, until nothing new can be reached. Facts that never turn back
// (a played battle, a read guide, a held item that may be obtained, …) count as true once their
// source can be reached; the romance parts without `not` count as "some day true" (decision:
// お答え1). content:build stops a city without a way to clear it (from the start of each city); the
// exploration walk asks the same from the current state of every step (tests/explore). The other
// results are warnings: they break nothing.

/** What the check reads of the content (the build's parsed catalogs or the runtime's). */
export type ProgressionContent = {
  /** Journeys in catalog order, their cities in travel order. */
  journeys: readonly { id: string; cities: readonly { id: string }[]; initialBudget?: number | null;
    cityTransition?: "manual" | "after_epilogue"; initialState?: { ap: number } }[];
  episodes: readonly { id: string; kind: "episode" | "city_finale"; cityId: string; landmarkId: string | null; battleId: string;
    requiredEpisodeIds: readonly string[]; when?: Condition }[];
  storyBattles: readonly { battleId: string; requiredEpisodeIds: readonly string[]; when?: Condition }[];
  battles: readonly { id: string; cityId?: string; landmarkId: string | null; scope?: string }[];
  landmarks: readonly { id: string; cityId: string; guideStoryId?: string; observation?: boolean }[];
  encounters: readonly { id: string; cityId: string; repeatable?: boolean; completionMoney?: number; completionItemId?: string;
    quiz?: { rewardItemId: string }; options: readonly { cost?: number; giftItemId?: string; consumeItemId?: string }[] }[];
  items: readonly { id: string; cityId: string }[];
  dates: readonly { id: string; chapterId: string; kind: string; apCost: number; when?: Condition }[];
  /** Each city's travel: the hotel, the map events' places and admissions, the routes' fares, the starting budget. */
  travel: readonly { cityId: string; hotelPlaceId: string; initialBudget: number;
    events: readonly { id: string; placeId: string; admissionCost?: number }[];
    routes: readonly { fromPlaceId: string; toPlaceId: string; cost: number }[] }[];
  rewards: readonly { id?: string; episodeId?: string; battleId?: string; ap: number; trigger: string }[];
  /** The romance thresholds (romance/progression.json): the dates a stage and the confession need. */
  romance: { stages: readonly { stage: number; minCompletedDates: number }[]; confession: { minCompletedDates: number } };
  /**
   * The scenes whose `then: epilogue` (head or choice) starts their city's epilogue (stage 3b; 3.9 (d)): an inserted
   * scene at the visits of `landmarkIds` with its `when`, or a battle's head (`battleId`).
   */
  epilogueStarters?: readonly { sceneId: string; cityId: string; landmarkIds?: readonly string[]; battleId?: string; dateId?: string; when?: Condition }[];
  /** The AP of the scenes' tags (stage 3): gained once by a scene's `# ap: +N` / `# on_done: ap +N` (its scene_tag rules), spent by the main parts' `# on_done: ap -N`. */
  sceneAp?: readonly { cityId: string; gained: number; spent: number }[];
};

/**
 * The records the check starts from. `exact`: the records of a real game state (the walk), so
 * other cities' records are fixed; without it (the build) each city is checked from its start
 * and an earlier city's records are unknown (they may be either).
 */
export type ProgressionSnapshot = {
  exact: boolean;
  battles: ReadonlySet<string>; episodes: ReadonlySet<string>; cities: ReadonlySet<string>; landmarks: ReadonlySet<string>;
  guides: ReadonlySet<string>; encounters: ReadonlySet<string>; seenEncounters: ReadonlySet<string>; dates: ReadonlySet<string>;
  epilogues: ReadonlySet<string>; items: Readonly<Record<string, string>>;
  couple: boolean; romanceStage: number; cityDay: number; journeyDay?: number; money: number;
};

/** A city's map events with a condition each: an episode's or special battle's `when`, or the current rule written as a condition. */
type MainEvent = { id: string; kind: "episode" | "finale" | "special"; battleId: string; landmarkId: string | null; guide: boolean; condition?: Condition };

type City = {
  id: string; journeyId?: string; order: number;
  events: MainEvent[];
  /** Items a scene of the city gives, and those an option gives away or uses. */
  itemSources: Set<string>; itemSpends: Set<string>;
  /** The most money the party can have in the city (Infinity when a repeated scene pays). */
  maxMoney: number;
};

/** Leaves of the romance (decision: お答え1). */
const ROMANCE: readonly LeafKind[] = ["relationship", "romanceStage", "couple", "datePlayed"];
/** Leaves whose record never turns back once true. */
const MONOTONE: readonly LeafKind[] = ["battlePlayed", "episodeCompleted", "episodesCompleted", "cityCompleted", "landmarkVisited", "guideRead",
  "encounterCompleted", "encounterSeen", "datePlayed", "epilogueViewed", "battlesPlayed", "couple", "rented"];

/** How a run of the check reads some leaves (the warnings' "what if" runs). */
type Mode = {
  /** The romance parts never become true (the romance-only warning). */
  noRomance?: boolean;
  /** The parts that may turn false for good are false (the "may never be met again" warning). */
  fragile?: boolean;
  /** These battles are never played (the battle left after the epilogue). */
  without?: ReadonlySet<string>;
};

const journeyOf = (content: ProgressionContent, cityId: string) => content.journeys.find((journey) => journey.cities.some((city) => city.id === cityId));
const orderOf = (content: ProgressionContent, cityId: string) => journeyOf(content, cityId)?.cities.findIndex((city) => city.id === cityId) ?? -1;
const battleCityOf = (content: ProgressionContent, battleId: string) => {
  const battle = content.battles.find((item) => item.id === battleId);
  return battle?.cityId ?? content.landmarks.find((item) => item.id === battle?.landmarkId)?.cityId;
};

/** The current rule of an episode or special battle without `when`, as a condition (undefined: always shown). */
function currentRule(content: ProgressionContent, cityId: string, kind: MainEvent["kind"], requiredEpisodeIds: readonly string[]): Condition | undefined {
  const parts: Condition[] = requiredEpisodeIds.map((id) => ({ episodeCompleted: id }));
  if (kind === "finale")
    parts.push(...content.storyBattles.filter((battle) => battleCityOf(content, battle.battleId) === cityId).map((battle) => ({ battlePlayed: battle.battleId })));
  return parts.length ? { all: parts } : undefined;
}

function cityModel(content: ProgressionContent, cityId: string): City {
  const guided = (landmarkId: string | null) => !!content.landmarks.find((item) => item.id === landmarkId)?.guideStoryId;
  const events: MainEvent[] = [
    ...content.episodes.filter((episode) => episode.cityId === cityId).map((episode): MainEvent => {
      const kind = episode.kind === "city_finale" ? "finale" : "episode";
      return { id: episode.id, kind, battleId: episode.battleId, landmarkId: episode.landmarkId, guide: guided(episode.landmarkId),
        condition: episode.when ?? currentRule(content, cityId, kind, episode.requiredEpisodeIds) };
    }),
    ...content.storyBattles.filter((battle) => battleCityOf(content, battle.battleId) === cityId).map((battle): MainEvent => {
      const landmarkId = content.battles.find((item) => item.id === battle.battleId)?.landmarkId ?? null;
      return { id: battle.battleId, kind: "special", battleId: battle.battleId, landmarkId, guide: guided(landmarkId),
        condition: battle.when ?? currentRule(content, cityId, "special", battle.requiredEpisodeIds) };
    }),
  ];
  const encounters = content.encounters.filter((item) => item.cityId === cityId);
  const journey = journeyOf(content, cityId);
  // The journey's budget and every gain up to this city (decision: 3.3 check 9).
  const upTo = journey ? journey.cities.slice(0, orderOf(content, cityId) + 1).map((city) => city.id) : [cityId];
  const paying = content.encounters.filter((item) => upTo.includes(item.cityId) && (item.completionMoney ?? 0) > 0);
  const start = journey?.initialBudget ?? content.travel.find((item) => item.cityId === (journey?.cities[0]?.id ?? cityId))?.initialBudget ?? 0;
  return {
    id: cityId, journeyId: journey?.id, order: orderOf(content, cityId), events,
    itemSources: new Set(encounters.flatMap((item) => [item.completionItemId, item.quiz?.rewardItemId].filter((id): id is string => !!id))),
    itemSpends: new Set(encounters.flatMap((item) => item.options.flatMap((option) => [option.giftItemId, option.consumeItemId].filter((id): id is string => !!id)))),
    maxMoney: paying.some((item) => item.repeatable) ? Infinity : start + paying.reduce((sum, item) => sum + (item.completionMoney ?? 0), 0),
  };
}

/** What the run has reached in the city. */
type Reach = { battles: Set<string>; episodes: Set<string>; landmarks: Set<string>; guides: Set<string>; finale: boolean };
type Truth = { canTrue: boolean; canFalse: boolean };

function judge(content: ProgressionContent, city: City, now: ProgressionSnapshot, reach: Reach, mode: Mode, condition: Condition): Truth {
  if ("all" in condition) {
    const parts = condition.all.map((child) => judge(content, city, now, reach, mode, child));
    return { canTrue: parts.every((part) => part.canTrue), canFalse: parts.some((part) => part.canFalse) };
  }
  if ("any" in condition) {
    const parts = condition.any.map((child) => judge(content, city, now, reach, mode, child));
    return { canTrue: parts.some((part) => part.canTrue), canFalse: parts.every((part) => part.canFalse) };
  }
  if ("not" in condition) {
    const inner = judge(content, city, now, reach, mode, condition.not);
    return { canTrue: inner.canFalse, canFalse: inner.canTrue };
  }
  if ("atLeast" in condition) {
    const parts = condition.atLeast.of.map((child) => judge(content, city, now, reach, mode, child));
    return { canTrue: parts.filter((part) => part.canTrue).length >= condition.atLeast.count,
      canFalse: parts.filter((part) => part.canFalse).length > parts.length - condition.atLeast.count };
  }
  return judgeLeaf(content, city, now, reach, mode, condition as Leaf);
}

function judgeLeaf(content: ProgressionContent, city: City, now: ProgressionSnapshot, reach: Reach, mode: Mode, leaf: Leaf): Truth {
  const kind = leafKind(leaf);
  if (mode.noRomance && ROMANCE.includes(kind)) return { canTrue: false, canFalse: true };
  const truth = rawLeaf(content, city, now, reach, leaf);
  if (!mode.fragile) return truth;
  // The parts that may turn false for good (3.3 「二度と満たされなくなるおそれ」).
  if (MONOTONE.includes(kind) || ("romanceStage" in leaf && leaf.romanceStage.atLeast !== undefined)) return { ...truth, canFalse: false };
  if (("money" in leaf && leaf.money.atLeast !== undefined) || ("item" in leaf && leaf.item.is === "held" && city.itemSpends.has(leaf.item.id)) ||
      ("cityDay" in leaf && leaf.cityDay.atMost !== undefined) || ("journeyDay" in leaf && leaf.journeyDay.atMost !== undefined) ||
      ("romanceStage" in leaf && leaf.romanceStage.atMost !== undefined))
    return { ...truth, canTrue: false };
  return truth;
}

/** A fact of the city (reachable here) or of another city (fixed in an exact snapshot; earlier: unknown, later: false otherwise). */
function fact(content: ProgressionContent, city: City, now: ProgressionSnapshot, factCity: string | undefined, isNow: boolean, reachable: boolean): Truth {
  if (factCity === city.id || factCity === undefined) return { canTrue: isNow || reachable, canFalse: !isNow };
  if (now.exact) return { canTrue: isNow, canFalse: !isNow };
  const earlier = journeyOf(content, factCity)?.id === city.journeyId && orderOf(content, factCity) < city.order;
  return { canTrue: earlier || isNow, canFalse: !isNow };
}

function rawLeaf(content: ProgressionContent, city: City, now: ProgressionSnapshot, reach: Reach, leaf: Leaf): Truth {
  const both = { canTrue: true, canFalse: true };
  const landmarkCity = (id: string) => content.landmarks.find((item) => item.id === id)?.cityId;
  const cityBattles = (cityId: string) => content.battles.filter((battle) => battle.scope !== "city_finale" && battleCityOf(content, battle.id) === cityId).map((battle) => battle.id);
  if ("battlePlayed" in leaf) return fact(content, city, now, battleCityOf(content, leaf.battlePlayed), now.battles.has(leaf.battlePlayed), reach.battles.has(leaf.battlePlayed));
  if ("episodeCompleted" in leaf)
    return fact(content, city, now, content.episodes.find((item) => item.id === leaf.episodeCompleted)?.cityId, now.episodes.has(leaf.episodeCompleted), reach.episodes.has(leaf.episodeCompleted));
  if ("episodesCompleted" in leaf) {
    const ids = content.episodes.filter((item) => item.cityId === leaf.episodesCompleted.city).map((item) => item.id);
    const count = (set: ReadonlySet<string>) => ids.filter((id) => set.has(id) || now.episodes.has(id)).length;
    return fact(content, city, now, leaf.episodesCompleted.city, count(now.episodes) >= leaf.episodesCompleted.atLeast, count(reach.episodes) >= leaf.episodesCompleted.atLeast);
  }
  if ("battlesPlayed" in leaf) {
    const ids = cityBattles(leaf.battlesPlayed.city);
    const count = (set: ReadonlySet<string>) => ids.filter((id) => set.has(id) || now.battles.has(id)).length;
    return fact(content, city, now, leaf.battlesPlayed.city, count(now.battles) >= leaf.battlesPlayed.atLeast, count(reach.battles) >= leaf.battlesPlayed.atLeast);
  }
  if ("cityCompleted" in leaf) return fact(content, city, now, leaf.cityCompleted, now.cities.has(leaf.cityCompleted), reach.finale);
  if ("epilogueViewed" in leaf) return fact(content, city, now, leaf.epilogueViewed, now.epilogues.has(leaf.epilogueViewed), reach.finale);
  if ("landmarkVisited" in leaf) return fact(content, city, now, landmarkCity(leaf.landmarkVisited), now.landmarks.has(leaf.landmarkVisited), reach.landmarks.has(leaf.landmarkVisited));
  if ("guideRead" in leaf) return fact(content, city, now, landmarkCity(leaf.guideRead), now.guides.has(leaf.guideRead), reach.guides.has(leaf.guideRead));
  if ("encounterCompleted" in leaf || "encounterSeen" in leaf) {
    const id = "encounterCompleted" in leaf ? leaf.encounterCompleted : leaf.encounterSeen;
    const done = ("encounterCompleted" in leaf ? now.encounters : now.seenEncounters).has(id);
    return fact(content, city, now, content.encounters.find((item) => item.id === id)?.cityId, done, true);
  }
  if ("datePlayed" in leaf)
    return fact(content, city, now, content.dates.find((item) => item.id === leaf.datePlayed)?.chapterId, now.dates.has(leaf.datePlayed), true);
  if ("item" in leaf) {
    const { id, is } = leaf.item;
    const status = now.items[id];
    if (content.items.find((item) => item.id === id)?.cityId !== city.id) return now.exact ? { canTrue: status === is || (is === "obtained" && !!status), canFalse: !(status === is || (is === "obtained" && !!status)) } : both;
    const obtainable = !status && city.itemSources.has(id);
    if (is === "obtained") return { canTrue: !!status || city.itemSources.has(id), canFalse: !status };
    if (is === "held") return { canTrue: status === "held" || obtainable, canFalse: true };
    if (is === "left_behind") return { canTrue: status === is, canFalse: status !== is };
    return { canTrue: status === is || ((status === "held" || obtainable) && city.itemSpends.has(id)), canFalse: status !== is };
  }
  if ("cityDay" in leaf) return { canTrue: leaf.cityDay.atMost === undefined || now.cityDay <= leaf.cityDay.atMost,
    canFalse: leaf.cityDay.atLeast === undefined || now.cityDay < leaf.cityDay.atLeast || leaf.cityDay.atMost !== undefined };
  if ("journeyDay" in leaf) {
    if (now.journeyDay === undefined) return both;
    return { canTrue: leaf.journeyDay.atMost === undefined || now.journeyDay <= leaf.journeyDay.atMost,
      canFalse: leaf.journeyDay.atLeast === undefined || now.journeyDay < leaf.journeyDay.atLeast || leaf.journeyDay.atMost !== undefined };
  }
  if ("money" in leaf) return { canTrue: leaf.money.atLeast === undefined || Math.max(city.maxMoney, now.exact ? now.money : 0) >= leaf.money.atLeast, canFalse: true };
  if ("romanceStage" in leaf) return { canTrue: leaf.romanceStage.atMost === undefined || now.romanceStage <= leaf.romanceStage.atMost,
    canFalse: leaf.romanceStage.atLeast === undefined || now.romanceStage < leaf.romanceStage.atLeast };
  if ("couple" in leaf) return { canTrue: true, canFalse: !now.couple };
  if ("rented" in leaf) return both;
  // time, weekday, rides, relationship: they come round, or either way (3.3 check 9).
  return both;
}

/** Reach every main part of the city that can show on the map, until nothing new shows. */
function reachCity(content: ProgressionContent, city: City, now: ProgressionSnapshot, mode: Mode): Reach {
  const reach: Reach = { battles: new Set(), episodes: new Set(), landmarks: new Set(), guides: new Set(), finale: now.cities.has(city.id) };
  const add = (event: MainEvent) => {
    reach.battles.add(event.battleId);
    if (event.kind !== "special") reach.episodes.add(event.id);
    if (event.landmarkId) reach.landmarks.add(event.landmarkId);
    if (event.landmarkId && event.guide) reach.guides.add(event.landmarkId);
    if (event.kind === "finale") reach.finale = true;
  };
  const done = new Set<string>();
  for (let changed = true; changed;) {
    changed = false;
    for (const event of city.events) {
      if (done.has(event.id) || mode.without?.has(event.battleId)) continue;
      const played = now.battles.has(event.battleId);
      if (played || !event.condition || judge(content, city, now, reach, mode, event.condition).canTrue) {
        add(event);
        done.add(event.id);
        changed = true;
      }
    }
  }
  return reach;
}

/** The records at the start of a city in the build's check: nothing played yet, other cities unknown. */
export function startSnapshot(): ProgressionSnapshot {
  const none = new Set<string>();
  return { exact: false, battles: none, episodes: none, cities: none, landmarks: none, guides: none, encounters: none, seenEncounters: none,
    dates: none, epilogues: none, items: {}, couple: false, romanceStage: 1, cityDay: 1, money: 0 };
}

/** Whether the city's finale can still show on the map (or the city is cleared) from the snapshot. */
export function canStillClearCity(content: ProgressionContent, cityId: string, now: ProgressionSnapshot = startSnapshot()): boolean {
  return reachCity(content, cityModel(content, cityId), now, {}).finale;
}

/** The finale's condition, for messages. */
function finaleOf(city: City) {
  return city.events.find((event) => event.kind === "finale");
}

/** The cities with a finale (the ones the check reads). */
const finaleCities = (content: ProgressionContent) => [...new Set(content.episodes.filter((episode) => episode.kind === "city_finale").map((episode) => episode.cityId))];

/** Whether one of the city's then: epilogue scenes can come in the reach (its visit reached and its condition true some day, or its battle played). */
function epilogueReachable(content: ProgressionContent, city: City, reach: Reach, mode: Mode): boolean {
  const dateWhen = (dateId: string) => content.dates.find((date) => date.id === dateId)?.when;
  return (content.epilogueStarters ?? []).filter((starter) => starter.cityId === city.id).some((starter) => starter.battleId
    ? reach.battles.has(starter.battleId)
    : starter.dateId ? !dateWhen(starter.dateId) || judge(content, city, startSnapshot(), reach, mode, dateWhen(starter.dateId)!).canTrue
    : (starter.landmarkIds ?? []).some((id) => reach.landmarks.has(id)) && (!starter.when || judge(content, city, startSnapshot(), reach, mode, starter.when).canTrue));
}
const authoredCities = (content: ProgressionContent) => [...new Set((content.epilogueStarters ?? []).map((starter) => starter.cityId))];
/** A city the player cannot leave without its epilogue: one of a journey that moves on after the epilogue, or the journey's last city. */
const epilogueRequired = (content: ProgressionContent, cityId: string) => {
  const journey = journeyOf(content, cityId);
  return journey?.cityTransition === "after_epilogue" || journey?.cities.at(-1)?.id === cityId;
};

/** Check 9's errors: a city whose finale can never show on the map, however well the player plays; a city whose author-started epilogue can never begin. */
export function progressionErrors(content: ProgressionContent): string[] {
  const epilogues = authoredCities(content).filter((cityId) => epilogueRequired(content, cityId)).flatMap((cityId) => {
    const city = cityModel(content, cityId);
    return epilogueReachable(content, city, reachCity(content, city, startSnapshot(), {}), {}) ? [] : [`No way to start the epilogue of city ${cityId}: ` +
      `its epilogue begins only with a then: epilogue, and none of its scenes with one (${(content.epilogueStarters ?? []).filter((item) => item.cityId === cityId)
        .map((item) => item.sceneId).join(", ")}) can ever come, however the city is played; ${journeyOf(content, cityId)?.cityTransition === "after_epilogue"
        ? "the journey moves on only after the epilogue" : "the journey ends only with its last city's epilogue"} (A19)`];
  });
  return [...epilogues, ...finaleCities(content).flatMap((cityId) => {
    const city = cityModel(content, cityId);
    const reach = reachCity(content, city, startSnapshot(), {});
    if (reach.finale) return [];
    const finale = finaleOf(city)!;
    const unreached = city.events.filter((event) => event.kind !== "finale" && !reach.battles.has(event.battleId)).map((event) => event.id);
    return [`No way to clear city ${cityId}: the map condition of the finale ${finale.id} can never be met, however the city is played ` +
      `(battles that can be played: ${reach.battles.size}${unreached.length ? `; never shown on the map: ${unreached.join(", ")}` : ""}). ` +
      `Change its when in progression/journey.json (a part without not that names a romance value counts as met some day)`];
  })];
}

export type ProgressionWarning = {
  kind: "never-met-again" | "romance-only-city" | "unfindable-clue" | "battle-after-epilogue" | "never-offered" | "money-shortfall" | "ap-shortfall"
    | "epilogue-unreachable";
  message: string;
};

/** The main parts (and their cost) the finale needs at the least: its condition's required leaves, followed through the events they name. */
function requiredEvents(content: ProgressionContent, city: City, cost: (event: MainEvent) => number): MainEvent[] {
  const finale = finaleOf(city);
  if (!finale) return [];
  const needed = new Map<string, MainEvent>([[finale.id, finale]]);
  const queue = [finale];
  while (queue.length) {
    const event = queue.pop()!;
    for (const leaf of event.condition ? requiredLeaves(event.condition) : []) {
      const named = city.events.filter((item) =>
        ("battlePlayed" in leaf && item.battleId === leaf.battlePlayed) || ("episodeCompleted" in leaf && item.id === leaf.episodeCompleted) ||
        ("landmarkVisited" in leaf && item.landmarkId === leaf.landmarkVisited) || ("guideRead" in leaf && item.landmarkId === leaf.guideRead));
      const counted = "battlesPlayed" in leaf && leaf.battlesPlayed.city === city.id
        ? city.events.filter((item) => item.kind !== "finale").sort((a, b) => cost(a) - cost(b)).slice(0, leaf.battlesPlayed.atLeast) : [];
      for (const item of [...named.slice(0, 1), ...counted])
        if (!needed.has(item.id)) {
          needed.set(item.id, item);
          queue.push(item);
        }
    }
  }
  return [...needed.values()];
}

/** The cheapest round trip from the hotel to a place: a fare there, the admission and a fare back (lower bounds). */
function tripCost(travel: ProgressionContent["travel"][number] | undefined, eventId: string): number {
  if (!travel) return 0;
  const event = travel.events.find((item) => item.id === eventId);
  if (!event) return 0;
  const fare = (from: string | undefined, to: string | undefined) => from === to ? 0
    : Math.min(...travel.routes.filter((route) => (from === undefined || route.fromPlaceId === from) && (to === undefined || route.toPlaceId === to))
      .map((route) => route.cost), Infinity);
  const out = event.placeId === travel.hotelPlaceId ? 0 : Math.min(fare(travel.hotelPlaceId, event.placeId), fare(undefined, event.placeId));
  const back = event.placeId === travel.hotelPlaceId ? 0 : Math.min(fare(event.placeId, travel.hotelPlaceId), fare(event.placeId, undefined));
  return (Number.isFinite(out) ? out : 0) + (Number.isFinite(back) ? back : 0) + (event.admissionCost ?? 0);
}

/** Whether a leaf needs the romance (a date, the couple, a stage, a relationship value at least). */
const romanceNeed = (leaf: Leaf) => "datePlayed" in leaf || "couple" in leaf || ("romanceStage" in leaf && leaf.romanceStage.atLeast !== undefined) ||
  ("relationship" in leaf && leaf.relationship.atLeast !== undefined);

/** The money each journey needs for the cities' required main parts after playing everything else first (3.3 「お金で詰むおそれ」). */
function moneyWarnings(content: ProgressionContent): ProgressionWarning[] {
  return content.journeys.flatMap((journey): ProgressionWarning[] => {
    let money = journey.initialBudget ?? content.travel.find((item) => item.cityId === journey.cities[0]?.id)?.initialBudget ?? 0;
    for (const { id: cityId } of journey.cities) {
      if (!finaleCities(content).includes(cityId)) continue;
      const city = cityModel(content, cityId);
      const travel = content.travel.find((item) => item.cityId === cityId);
      const cost = (event: MainEvent) => tripCost(travel, event.id);
      const required = requiredEvents(content, city, cost);
      const encounters = content.encounters.filter((item) => item.cityId === cityId);
      if (encounters.some((item) => item.repeatable && (item.completionMoney ?? 0) > 0)) return [];
      const gains = encounters.reduce((sum, item) => sum + (item.completionMoney ?? 0), 0);
      const optional = [...city.events.filter((event) => !required.includes(event)).map(cost),
        ...content.dates.filter((date) => date.chapterId === cityId).map((date) => tripCost(travel, date.id))].reduce((sum, value) => sum + value, 0);
      const needed = required.reduce((sum, event) => sum + cost(event), 0);
      const left = money + gains - optional - needed;
      if (left < 0)
        return [{ kind: "money-shortfall", message: `Money may run short in city ${cityId}: playing the dates and the other events first, each at its cheapest ` +
          `(fares, admissions and the fare back; lodging not counted), leaves ${money + gains - optional}, and the main parts the finale needs ` +
          `(${required.map((event) => event.id).join(", ")}) cost at least ${needed}: ${-left} short${gains ? "" : " (no scene of the city pays money)"} ` +
          `(not stopped: the budget is set when balancing the finished scenario)` }];
      money = left;
    }
    return [];
  });
}

/** The AP a city's finale needs for its dates, against the AP the city gives (3.3 「AP で詰むおそれ」; scene tags' AP from stage 3). */
function apWarnings(content: ProgressionContent): ProgressionWarning[] {
  return finaleCities(content).flatMap((cityId): ProgressionWarning[] => {
    const city = cityModel(content, cityId);
    const required = requiredEvents(content, city, () => 0);
    const leaves = required.flatMap((event) => (event.condition ? requiredLeaves(event.condition) : [])).filter(romanceNeed);
    if (!leaves.length) return [];
    const dates = content.dates.filter((date) => date.chapterId === cityId);
    const cheapest = Math.min(...dates.filter((date) => date.kind === "normal").map((date) => date.apCost), Infinity);
    const perDate = Number.isFinite(cheapest) ? cheapest : 0;
    const named = new Set(leaves.flatMap((leaf) => ("datePlayed" in leaf ? [leaf.datePlayed] : [])));
    const count = Math.max(0, ...leaves.map((leaf) => "couple" in leaf ? content.romance.confession.minCompletedDates
      : "romanceStage" in leaf ? content.romance.stages.find((stage) => stage.stage === leaf.romanceStage.atLeast)?.minCompletedDates ?? 0 : 0));
    const needed = [...named].reduce((sum, id) => sum + (dates.find((date) => date.id === id)?.apCost ?? 0), 0) + Math.max(0, count - named.size) * perDate;
    const eventIds = new Set(city.events.filter((event) => event.kind !== "finale").map((event) => event.id));
    const battleIds = new Set(city.events.filter((event) => event.kind === "special").map((event) => event.battleId));
    const journey = journeyOf(content, cityId);
    const gained = (journey?.cities[0]?.id === cityId ? journey.initialState?.ap ?? 0 : 0) + content.rewards
      .filter((rule) => (rule.episodeId !== undefined && eventIds.has(rule.episodeId)) || (rule.battleId !== undefined && battleIds.has(rule.battleId)))
      .reduce((sum, rule) => sum + rule.ap, 0);
    const tags = (content.sceneAp ?? []).filter((item) => item.cityId === cityId);
    const gainedWithTags = gained + tags.reduce((sum, item) => sum + item.gained, 0);
    const others = dates.filter((date) => !named.has(date.id)).reduce((sum, date) => sum + date.apCost, 0) + tags.reduce((sum, item) => sum + item.spent, 0);
    const left = Math.max(0, gainedWithTags - others);
    return left < needed
      ? [{ kind: "ap-shortfall", message: `AP may run short in city ${cityId}: its finale needs dates (${leaves.map((leaf) => JSON.stringify(leaf)).join(", ")}, ` +
        `${needed} AP), the city gives ${gainedWithTags} AP (with its scenes' tags), and the other dates may use ${others} AP first, leaving ${left} (${needed - left} short; ` +
        `not stopped: AP is set when balancing)` }]
      : [];
  });
}

/** Check 9's warnings: probable dead ends that break nothing (content:build lists them). */
export function progressionWarnings(content: ProgressionContent, clueUses: readonly { clueId: string; usedBy: string }[] = [],
  landmarkClues: readonly { landmarkId: string; clueIds: readonly string[] }[] = []): ProgressionWarning[] {
  const warnings: ProgressionWarning[] = [];
  for (const cityId of finaleCities(content)) {
    const city = cityModel(content, cityId);
    const start = startSnapshot();
    const reach = reachCity(content, city, start, {});
    if (!reach.finale) continue; // An error of progressionErrors.
    const finale = finaleOf(city)!;
    if (!reachCity(content, city, start, { fragile: true }).finale)
      warnings.push({ kind: "never-met-again", message: `Finale condition may never be met again: city ${cityId}'s finale ${finale.id} (or a main part it needs) ` +
        `shows on the map only while a part holds that can turn false for good (money spent, an item given or used, a battle played or ` +
        `a date or the couple under not, a day limit), and no other way is left` });
    if (!reachCity(content, city, start, { noRomance: true }).finale)
      warnings.push({ kind: "romance-only-city", message: `City ${cityId} can be cleared only through the romance: without the romance values ` +
        `(the couple, dates, the stage, the relationship values) its finale ${finale.id} never shows on the map, so a player who plays no dates cannot clear it` });
    if (journeyOf(content, cityId)?.cityTransition === "after_epilogue")
      for (const event of city.events.filter((item) => item.kind !== "finale"))
        if (reachCity(content, city, start, { without: new Set([event.battleId]) }).finale)
          warnings.push({ kind: "battle-after-epilogue", message: `Battle left after the epilogue: in city ${cityId}, the finale can show on the map before ` +
            `${event.battleId} is played; the journey moves on after the epilogue, so that battle may never be played (keep the finale's condition, ` +
            `or let a later stage's then: epilogue choose when the epilogue starts)` });
    const laterCities = new Set(journeyOf(content, cityId)?.cities.slice(city.order + 1).map((item) => item.id) ?? []);
    for (const date of content.dates.filter((item) => item.chapterId === cityId && item.when)) {
      const later = conditionLeaves(date.when!).some((leaf) => {
        const named = "battlePlayed" in leaf ? battleCityOf(content, leaf.battlePlayed) : "cityCompleted" in leaf ? leaf.cityCompleted
          : "datePlayed" in leaf ? content.dates.find((item) => item.id === leaf.datePlayed)?.chapterId : undefined;
        return !!named && laterCities.has(named);
      });
      if (!later && !judge(content, city, start, reach, {}, date.when!).canTrue)
        warnings.push({ kind: "never-offered", message: `Date never offered: the condition (when) of date ${date.id} can never be met, however city ${cityId} is played` });
    }
  }
  const closed = new Set(content.landmarks.filter((item) => item.observation === false).map((item) => item.id));
  for (const { landmarkId, clueIds } of landmarkClues.filter((item) => closed.has(item.landmarkId) && item.clueIds.length)) {
    const used = clueUses.filter((use) => clueIds.includes(use.clueId));
    warnings.push({ kind: "unfindable-clue", message: `Clues that can never be found: ${landmarkId} has no observation (observation: false) but lists ` +
      `${clueIds.join(", ")}${used.length ? `, used by ${used.map((use) => `${use.usedBy} (${use.clueId})`).join(", ")}` : ""} ` +
      `(not stopped: a question or the evidence can be answered without them)` });
  }
  // The author-started epilogue (3.9 (d)): a city of a journey the player leaves by choice may never reach its then: epilogue
  // scenes (the city is left without the epilogue), and any such city may lose them in some plays (fragile parts).
  for (const cityId of authoredCities(content)) {
    const city = cityModel(content, cityId);
    const start = startSnapshot();
    const reachable = epilogueReachable(content, city, reachCity(content, city, start, {}), {});
    if (!reachable && !epilogueRequired(content, cityId))
      warnings.push({ kind: "epilogue-unreachable", message: `The epilogue of city ${cityId} may never start: no scene with its then: epilogue can come, ` +
        `however the city is played; the player may leave for the next city without it (not stopped)` });
    else if (reachable && !epilogueReachable(content, city, reachCity(content, city, start, { fragile: true }), { fragile: true }))
      warnings.push({ kind: "epilogue-unreachable", message: `The epilogue of city ${cityId} may become impossible to start in some plays: its then: epilogue ` +
        `scenes come only while a part holds that can turn false for good (money spent, an item given or used, a battle played, a day limit)` });
  }
  return [...warnings, ...moneyWarnings(content), ...apWarnings(content)];
}

/**
 * The walk's money summary (3.3 探索テスト): whether the money now covers, at the cheapest, the
 * main parts the current city's finale still needs. Undefined when it does (or cannot be told).
 */
export function moneyShortNow(content: ProgressionContent, cityId: string, now: ProgressionSnapshot): number | undefined {
  if (now.cities.has(cityId)) return undefined;
  const city = cityModel(content, cityId);
  const travel = content.travel.find((item) => item.cityId === cityId);
  const encounters = content.encounters.filter((item) => item.cityId === cityId);
  if (encounters.some((item) => item.repeatable && (item.completionMoney ?? 0) > 0)) return undefined;
  const cost = (event: MainEvent) => tripCost(travel, event.id);
  const needed = requiredEvents(content, city, cost).filter((event) => !now.battles.has(event.battleId)).reduce((sum, event) => sum + cost(event), 0);
  const gains = encounters.filter((item) => !now.encounters.has(item.id)).reduce((sum, item) => sum + (item.completionMoney ?? 0), 0);
  return now.money + gains < needed ? needed - now.money - gains : undefined;
}

/**
 * The walk's AP summary (3.3 探索テスト): in a city whose finale needs dates, the AP those dates
 * still need beyond the AP held now (`ap`) and the AP the city's rewards not yet `claimed` give.
 * Undefined when it is enough, or the finale needs no date.
 */
export function apShortNow(content: ProgressionContent, cityId: string, now: ProgressionSnapshot, ap: number, claimed: ReadonlySet<string> = new Set()): number | undefined {
  if (now.cities.has(cityId)) return undefined;
  const city = cityModel(content, cityId);
  const leaves = requiredEvents(content, city, () => 0).flatMap((event) => (event.condition ? requiredLeaves(event.condition) : [])).filter(romanceNeed);
  if (!leaves.length) return undefined;
  const dates = content.dates.filter((date) => date.chapterId === cityId);
  const cheapest = Math.min(...dates.filter((date) => date.kind === "normal").map((date) => date.apCost), Infinity);
  const named = [...new Set(leaves.flatMap((leaf) => ("datePlayed" in leaf ? [leaf.datePlayed] : [])))].filter((id) => !now.dates.has(id));
  const count = Math.max(0, ...leaves.map((leaf) => "couple" in leaf && !now.couple ? content.romance.confession.minCompletedDates
    : "romanceStage" in leaf && now.romanceStage < (leaf.romanceStage.atLeast ?? 0) ? content.romance.stages.find((stage) => stage.stage === leaf.romanceStage.atLeast)?.minCompletedDates ?? 0 : 0));
  const played = dates.filter((date) => now.dates.has(date.id)).length;
  const needed = named.reduce((sum, id) => sum + (dates.find((date) => date.id === id)?.apCost ?? 0), 0) +
    Math.max(0, count - played - named.length) * (Number.isFinite(cheapest) ? cheapest : 0);
  const eventIds = new Set(city.events.filter((event) => event.kind !== "finale").map((event) => event.id));
  const battleIds = new Set(city.events.filter((event) => event.kind === "special").map((event) => event.battleId));
  const coming = content.rewards.filter((rule) => !claimed.has(rule.id ?? "") &&
    ((rule.episodeId !== undefined && eventIds.has(rule.episodeId)) || (rule.battleId !== undefined && battleIds.has(rule.battleId))))
    .reduce((sum, rule) => sum + rule.ap, 0);
  return ap + coming < needed ? needed - ap - coming : undefined;
}
