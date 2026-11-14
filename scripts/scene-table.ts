import type { Condition } from "../src/content/condition-schemas";
import { conditionLeaves } from "../src/content/condition-schemas";
import type { EncounterDefinition } from "../src/content/encounter-schemas";
import type { EncounterEntryRule } from "../src/content/encounter-entry-rules";
import { fnvHash } from "../src/content/fingerprint";
import type { RewardRule } from "../src/content/journey-schemas";
import { INSERTED_KINDS, type SceneAt, type SceneDone, type SceneEntry, type SceneKind, type SceneMain, type SceneOption } from "../src/content/scene-schemas";
import { knotAddress } from "../src/content/story-address";
import { choiceOption, moduleCalls, readHead, reachableKnots, type PlaceFile, type PlaceHead } from "./place-files";

// The scene table of content:build (the unified event design, stage 3a, 3.3): the scenes of the
// place files with their option tables, the head `# on_done:` of one-scene main files, and
// the encounter catalogs read as the same table (the same scenes at the same moments with the
// same money; no journey has one since Milan moved to place files on 2026-11-13). Also the AP
// rules of the tags that give AP (`scene_tag`, made
// statically from the Ink text, so a tag in a branch the walk does not take still has its rule),
// with the check that their IDs do not collide with the authors' reward IDs.
// Pure: the caller passes the read place files and the parsed catalogs.

/** Where the catalogs point at a main part: the address (story file or knot) of each guide, battle, date, arrival and epilogue. */
export type MainAddresses = { address: string; main: SceneMain; cityId: string; title: string; kind: SceneKind }[];

/** The fingerprint of a place-file scene: the file's declarations, the scene's knots and the scene's data (not its head). */
export function placeFingerprint(compiled: string, knots: readonly string[], data: unknown): string {
  const root = (JSON.parse(compiled) as { root: unknown[] }).root;
  const named = root[root.length - 1] as Record<string, unknown>;
  const functions = Object.keys(named).filter((name) => name !== "global decl" && !knots.includes(name) && name === "cond");
  return fnvHash(JSON.stringify([named["global decl"], ...knots.map((knot) => named[knot]), ...functions.map((name) => named[name]), data]));
}

export type PlaceTableInput = {
  file: PlaceFile;
  compiled: string;
  apCap: number;
  mains: MainAddresses;
  /** The landmark's city of each landmark (an inserted scene's city is its visit's). */
  landmarkCity: (landmarkId: string) => string | undefined;
  /** The city of a transport place (`# at: place <place>`, `hotel <place>`, `ticket <place>`, `trip … from/to <place>`). */
  placeCity?: (placeId: string) => string | undefined;
  /** The city of a date (`# at: date <date>`). */
  dateCity?: (dateId: string) => string | undefined;
  /** Whether a city exists (`# at: finale|epilogue|depart|arrive <city>`). */
  cityExists?: (cityId: string) => boolean;
  /** A tour's step (`# at: tour <tour> <step>`; tour stages 2b, 3): its tour's city and whether it is a leg or an event step. */
  tourStep?: (tourId: string, stepId: string) => { cityId: string; kind: "leg" | "event" } | undefined;
  /** The file's position among all place files (scenes of one priority: written order, then file name). */
  onWarning?: (message: string) => void;
};

/** Every scene of one place file, with its head read and its options gathered (its knot and the helper knots it calls). */
export function placeScenes(input: PlaceTableInput): { entry: SceneEntry; head: PlaceHead }[] {
  const { file } = input;
  const result: { entry: SceneEntry; head: PlaceHead }[] = [];
  file.knots.forEach((knot, order) => {
    if (knot.isFunction) return;
    const head = readHead(knot, input.apCap);
    if (!head) return;
    const label = `${file.storyId} (${knot.name})`;
    const address = knotAddress(file.storyId, knot.name);
    const reached = reachableKnots(file, knot.name);
    const options: SceneOption[] = [];
    for (const item of reached) for (const choice of item.choices) {
      const option = choiceOption(choice, input.apCap, (message) => input.onWarning?.(`${label}: ${message}`));
      if (!option) continue;
      if (options.some((other) => other.id === option.id))
        throw new Error(`The option ID ${option.id} is written twice in the scene ${label} (with the knots it calls): one ID per choice (the save and the AP rules name it)`);
      options.push(option);
    }
    const inserted = INSERTED_KINDS.includes(head.kind);
    // A tour leg's narration (tour stage 2b): no catalog points at it; its # at: names its leg.
    const narration = head.kind === "tour_leg";
    const main = input.mains.find((item) => item.address === address);
    // `after leg` follows a leg's narration (tour stage 3): a tour's event step has none.
    for (const moment of head.at) if ("tour" in moment && head.priority === "after leg" && input.tourStep?.(moment.tour, moment.step)?.kind !== "leg")
      throw new Error(`# priority: after leg needs a leg of the tour: ${label} is at # at: ${momentText(moment)}, which is not a leg (A2)`);
    if (narration) {
      const first = head.at[0];
      const leg = head.at.length === 1 && first && "tour" in first ? first : undefined;
      if (!leg || input.tourStep?.(leg.tour, leg.step)?.kind !== "leg")
        throw new Error(`A tour leg's narration names its leg once: # at: tour <tour> <leg> (${label}${head.at.length ? `; # at: ${head.at.map(momentText).join(", ")}` : ""})`);
      for (const key of ["priority", "repeat", "when", "until", "on_done", "then", "person"] as const) if (knot.head.some((tag) => tag.key === key))
        throw new Error(`A tour leg's narration takes no # ${key}: (${label}): it is read as its leg starts, with nothing to choose and nothing it does`);
      if (reached.some((item) => item.choices.length))
        throw new Error(`A tour leg's narration has no choices (${label}): write the in-car conversation as the leg's encounter (# scene: encounter, # priority: after leg)`);
      if (main) throw new Error(`The narration ${label} is also the main part ${JSON.stringify(main.main)} of a catalog`);
    } else if (inserted) {
      if (!head.at.length) throw new Error(`The scene ${label} needs # at: (visit <landmark>, visit any or place <place>; an inserted ${head.kind})`);
      if (head.priority === undefined) throw new Error(`The scene ${label} needs # priority: (-1, after guide, after observe, after battle or +1)`);
      if (main) throw new Error(`The ${head.kind} ${label} is also the main part ${JSON.stringify(main.main)} of a catalog; a catalog points at a guide, battle or date knot`);
      if (head.kind === "encounter" && head.title === undefined) throw new Error(`An encounter needs # title: (${label})`);
    } else {
      for (const key of ["at", "priority", "repeat"] as const) if (knot.head.some((tag) => tag.key === key))
        throw new Error(`A main part's knot takes no # ${key}: (${label}): the catalog points at it, its order (the landmark's order) and repetition are the game's (A5)`);
      if (!main) throw new Error(`No catalog points at the ${head.kind} ${label}: write its address ${address} in the catalog (a landmark's guideStoryId, a battle's or a date's storyId)`);
      if (main.kind !== head.kind) throw new Error(`The catalog points at ${label} as a ${main.kind}, its head says # scene: ${head.kind}`);
      if ((head.whenTexts.length && head.kind !== "battle" && head.kind !== "date") || (head.untilTexts.length && head.kind !== "date"))
        throw new Error(`Only a battle's knot takes # when: and only a date's # until: as its map condition (${label})`);
    }
    // An inserted scene's city: its moments' (visit any, bare hotel and a trip without places: the city of the file's other scenes, settled below).
    const cities = inserted || narration ? [...new Set(head.at.map((moment) => momentCity(input, moment, label)).filter((city): city is string => !!city))] : [main!.cityId];
    if (cities.length > 1) throw new Error(`The moments of ${label} are in different cities (${cities.join(", ")}); one scene belongs to one city`);
    const cityId = cities[0] ?? "";
    // The helper knots, then the calls of modules.ink (a battle's -> quiz(n) -> and -> reasoning ->, stage 5).
    const knots = [...reached.map((item) => item.name), ...moduleCalls(file, reached)];
    const conds = [...new Set(reached.flatMap((item) => item.conds))];
    const data = { options, done: head.done, people: head.people, kind: head.kind };
    result.push({ head, entry: {
      id: knot.name, kind: head.kind, ...(head.title ? { title: head.title } : main ? { title: main.title } : {}), cityId,
      story: { storyId: file.storyId, knot: knot.name }, ...(main ? { main: main.main } : {}),
      at: inserted || narration ? head.at : [],
      ...(inserted ? { priority: head.priority } : {}), order,
      repeat: head.repeat ?? "once", people: head.people, ...(head.when && inserted ? { when: head.when } : {}),
      options, done: head.done, ...(head.then ? { then: head.then } : {}), ...(head.sources ? { sources: head.sources } : {}),
      conds, knots, fingerprint: placeFingerprint(input.compiled, knots, data), origin: "place",
    } });
  });
  // `visit any`, a bare `hotel` or a trip without places names no city: the scene is of the city of the file's other scenes.
  const fileCity = result.find((item) => item.entry.cityId)?.entry.cityId;
  for (const item of result) if (!item.entry.cityId) {
    if (!fileCity) throw new Error(`The scene ${file.storyId} (${item.entry.id}) says # at: ${item.entry.at.map(momentText).join(", ")}, which names no city, and no scene of its file names a landmark, place, date or city: put it in a place file of its city`);
    item.entry.cityId = fileCity;
  }
  return result;
}

/**
 * The city of a moment (null: it names none, `visit any`, a bare `hotel`, a trip without places); throws for an
 * unknown landmark, place, date or city (A2).
 */
function momentCity(input: PlaceTableInput, moment: SceneAt, label: string): string | null {
  const known = (city: string | undefined, what: string) => {
    if (!city) throw new Error(`Unknown ${what} in # at: ${Object.entries(moment).map(([key, value]) => `${key} ${value}`).join(" ")} (${label})`);
    return city;
  };
  if ("visit" in moment) return moment.visit === "any" ? null : known(input.landmarkCity(moment.visit), "landmark");
  if ("place" in moment) return known(input.placeCity?.(moment.place), "place");
  if ("ticket" in moment) return known(input.placeCity?.(moment.ticket), "place");
  if ("hotel" in moment) return moment.hotel === "any" ? null : known(input.placeCity?.(moment.hotel), "place");
  if ("date" in moment) return known(input.dateCity?.(moment.date), "date");
  if ("trip" in moment) {
    const cities = [moment.from, moment.to].filter((place): place is string => !!place).map((place) => known(input.placeCity?.(place), "place"));
    if (new Set(cities).size > 1) throw new Error(`# at: trip from and to are places of different cities (${label})`);
    return cities[0] ?? null;
  }
  if ("tour" in moment) return known(input.tourStep?.(moment.tour, moment.step)?.cityId, "tour or tour step");
  const city = "finale" in moment ? moment.finale : "epilogue" in moment ? moment.epilogue : "depart" in moment ? moment.depart : moment.arrive;
  return known(input.cityExists?.(city) ? city : undefined, "city");
}

/** The words of a moment, for messages (`visit mihon_clock_tower`, `trip walk to mihon_market`). */
export const momentText = (moment: SceneAt) => Object.entries(moment).map(([key, value]) => `${key} ${value}`).join(" ");

/** The encounter definition and entry rule the game runs an inserted place scene with (generated catalogs; the runtime's encounter path). */
export function insertedSceneEncounter(entry: SceneEntry, landmarkName: (landmarkId: string) => string,
  landmarksOf: (moment: SceneEntry["at"][number], cityId: string) => readonly string[] = (moment) => ("visit" in moment ? [moment.visit] : [])): { encounter: EncounterDefinition; rule: EncounterEntryRule } {
  // The definition keeps one landmark (its title's place; the checks of today's catalog read it); the scene table's `at` says where it runs.
  // A scene at no visit (a date, a finale, the hotel, … stage 4) has none: its title is its own or its city's.
  const landmarkId = entry.at.flatMap((moment) => landmarksOf(moment, entry.cityId))[0];
  const title = entry.title ?? (landmarkId ? landmarkName(landmarkId) : entry.id);
  return {
    encounter: {
      id: entry.id, cityId: entry.cityId, ...(landmarkId ? { landmarkId } : {}), titleJa: title, descriptionJa: title,
      storyId: knotAddress(entry.story.storyId, entry.story.knot!),
      // The catalog's item fields mirror the tags for the checks that read today's catalog shape (the progression check's
      // item sources and spends, the save's item records); the game applies a place scene's effects from the scene table.
      options: entry.options.map((option) => {
        const spent = option.give?.item ?? option.use;
        return { id: option.id, ...(option.later ? { deferCompletion: true } : {}), ...(spent ? { requiresItemId: spent } : {}),
          ...(option.give ? { giftItemId: option.give.item } : {}), ...(option.use ? { consumeItemId: option.use } : {}) };
      }),
      ...(entry.done.items?.length === 1 ? { completionItemId: entry.done.items[0] } : {}),
      // `# on_done: reward`: the save check (isRewardEarned) reads a completed encounter's alternativeApRewardId as the reward's cause.
      ...(entry.done.reward ? { alternativeApRewardId: entry.done.reward } : {}),
      ...(entry.repeat === "always" ? { repeatable: true } : {}),
    } as EncounterDefinition,
    rule: { encounterId: entry.id, priority: entry.priority, ...(entry.when ? { when: entry.when } : {}) },
  };
}

/** The encounter catalog read as the scene table (content:build converts it, nothing is moved; only the tests' fixtures write one now). */
export function catalogScenes(encounters: readonly EncounterDefinition[], rules: readonly EncounterEntryRule[], fingerprint: (storyId: string) => string): SceneEntry[] {
  return encounters.map((event, order) => {
    const rule = rules.find((item) => item.encounterId === event.id);
    const done: SceneDone = {
      ...(event.completionItemId ? { items: [event.completionItemId] } : {}),
      ...(event.completionMoney ? { money: event.completionMoney } : {}),
    };
    return {
      id: event.id, kind: "encounter", title: event.titleJa, cityId: event.cityId, story: { storyId: event.storyId },
      at: event.landmarkId ? [{ visit: event.landmarkId }] : [], ...(rule?.priority !== undefined ? { priority: rule.priority } : { priority: "after observe" as const }), order,
      repeat: event.repeatable ? "always" : "once", people: [], ...(rule?.when ? { when: rule.when } : {}),
      options: event.options.map((option) => ({
        id: option.id, knot: event.storyId.split("/").at(-1)!,
        ...(option.requiresItemId ? { requires: [{ item: { id: option.requiresItemId, is: "held" as const } }] } : {}),
        ...(option.giftItemId ? { give: { item: option.giftItemId, to: "heroine" } } : {}),
        ...(option.consumeItemId ? { use: option.consumeItemId } : {}),
        ...(option.cost ? { money: -option.cost } : {}),
        ...(option.responseProfileId ? { profile: option.responseProfileId } : {}),
        ...(option.deferCompletion ? { later: true as const } : {}),
        ...(option.translationJa ? { translated: true as const } : {}),
      })),
      done, conds: [], knots: [], fingerprint: fingerprint(event.storyId), origin: "catalog",
    };
  });
}

/**
 * A one-scene catalog encounter's choice tags (`# requires:`, `# rel:`, `# money:`, `# ap:`, `# set:`, `# memory:`,
 * `# then:`) joined to its catalog options by `# option:` (the catalog keeps the gift, the use, 「また今度」 and the reaction).
 */
export function mergeCatalogChoiceTags(scene: SceneEntry, tagged: readonly SceneOption[]): SceneEntry {
  if (!tagged.length) return scene;
  const options = scene.options.map((option) => {
    const tags = tagged.find((item) => item.id === option.id);
    if (!tags) return option;
    const money = (option.money ?? 0) + (tags.money ?? 0);
    return { ...option, ...(tags.requires ? { requires: [...(option.requires ?? []), ...tags.requires] } : {}),
      ...(tags.rel ? { rel: tags.rel } : {}), ...(money ? { money } : {}), ...(tags.ap ? { ap: tags.ap } : {}),
      ...(tags.set ? { set: tags.set } : {}), ...(tags.memory ? { memory: tags.memory } : {}), ...(tags.then ? { then: tags.then } : {}),
      ...(tags.translated ? { translated: true as const } : {}) };
  });
  for (const tags of tagged) if (!scene.options.some((option) => option.id === tags.id))
    throw new Error(`# option: ${tags.id} in ${scene.story.storyId} is no option of the encounter ${scene.id} in encounters/catalog.json`);
  return { ...scene, options };
}

/** The scene of a one-scene main file's head (`# on_done:`), named after the main part (3.3: a battle's ID, `<landmark>_guide`, `<city>_arrival`, `<city>_epilogue`). */
export function mainFileSceneId(main: SceneMain): string {
  if ("battle" in main) return main.battle;
  if ("date" in main) return main.date;
  if ("guide" in main) return `${main.guide}_guide`;
  if ("arrival" in main) return `${main.arrival}_arrival`;
  return `${main.epilogue}_epilogue`;
}

/** An authored reward of progression/journey.json as `# on_done: reward` reads it: its AP, trigger and city (its episode's or story battle's). */
export type RewardOfCity = { id: string; ap: number; trigger: string; cityId: string | undefined };

/**
 * `# on_done: reward <reward ID>` (an inserted scene's other way to earn a one-off reward, docs/01): stops it on a main part (its
 * first finish is its own trigger), an unknown reward, one that gives no AP, one of another city, and a reward that two scenes (or
 * a scene and a catalog encounter's alternativeApRewardId) name, since the save check reads one scene as its cause. Returns the errors.
 */
export function sceneRewardErrors(scenes: readonly SceneEntry[], rewards: readonly RewardOfCity[],
  catalogAlternatives: readonly { encounterId: string; rewardId: string }[] = []): string[] {
  const errors: string[] = [];
  const named = new Map(catalogAlternatives.map((item) => [item.rewardId, `the encounter ${item.encounterId} of encounters/catalog.json`]));
  for (const scene of scenes) {
    const id = scene.done.reward;
    if (!id) continue;
    const where = `${scene.story.storyId}${scene.story.knot ? ` (${scene.story.knot})` : ""}`;
    if (!INSERTED_KINDS.includes(scene.kind)) {
      errors.push(`A main part takes no # on_done: reward (${where}): its reward is its own (a guide_read, battle or episode reward of progression/journey.json)`);
      continue;
    }
    const rule = rewards.find((item) => item.id === id);
    if (!rule || rule.trigger === "scene_tag") errors.push(`# on_done: reward ${id} names no reward of progression/journey.json (${where})`);
    else if (rule.ap <= 0) errors.push(`# on_done: reward ${id} gives no AP (${where}); write # on_done: ap +N for a scene's own AP`);
    else if (rule.cityId !== scene.cityId) errors.push(`# on_done: reward ${id} is a reward of ${rule.cityId ?? "no city"}, the scene ${where} is in ${scene.cityId}`);
    const other = named.get(id);
    if (other) errors.push(`The reward ${id} is named by two ways to earn it: ${other} and # on_done: reward of ${where} (one scene per reward)`);
    named.set(id, `# on_done: reward of ${where}`);
  }
  return errors;
}

/** Where a rule ID comes from, for the collision message. */
type RuleOrigin = { id: string; origin: string };

/**
 * The AP rules of the tags that give AP: one per `# ap: +N` choice (scene ID __ option ID) and per
 * `# on_done: ap +N` (scene ID __on_done). A helper knot's tag has a rule for each scene that calls it.
 */
export function sceneTagRules(scenes: readonly SceneEntry[], titleOf: (scene: SceneEntry) => string): (RewardRule & { origin: string })[] {
  return scenes.flatMap((scene) => [
    ...scene.options.filter((option) => (option.ap ?? 0) > 0).map((option) => ({
      id: `${scene.id}__${option.id}`, sceneId: scene.id, trigger: "scene_tag" as const, ap: option.ap!, minScore: null, titleJa: titleOf(scene),
      origin: `the choice ${option.id} of ${scene.id} (# ap: +${option.ap})`,
    })),
    ...((scene.done.ap ?? 0) > 0 ? [{
      id: `${scene.id}__on_done`, sceneId: scene.id, trigger: "scene_tag" as const, ap: scene.done.ap!, minScore: null, titleJa: titleOf(scene),
      origin: `the # on_done: ap +${scene.done.ap} of ${scene.id}`,
    }] : []),
  ]);
}

/** Stop when the generated rules' IDs collide with each other or with the authors' rewards (3.3; rename an option or a knot). */
export function checkRuleIds(generated: readonly (RewardRule & { origin: string })[], authored: readonly RuleOrigin[]): void {
  const all: RuleOrigin[] = [...authored, ...generated.map((rule) => ({ id: rule.id, origin: rule.origin }))];
  for (const [index, rule] of all.entries()) {
    const other = all.findIndex((item, at) => at < index && item.id === rule.id);
    if (other >= 0)
      throw new Error(`Two AP rules have the ID ${rule.id}: ${all[other].origin} and ${rule.origin} (rename the option ID or the knot)`);
  }
}

/** The references a scene's options and done effects make, checked against the declared content. */
export type SceneReferences = {
  items: ReadonlyMap<string, string>;
  flags: ReadonlySet<string>;
  people: ReadonlySet<string>;
  memories: ReadonlySet<string>;
  profiles: ReadonlySet<string>;
  effects: ReadonlySet<string>;
  /** An item carried through the journey (`"carry": "journey"`) from a city before the scene's: held, given and used there too. */
  carriedInto?: (itemId: string, sceneCityId: string) => boolean;
};

/** Stop at an undeclared flag, person, item, memory, profile or effect, and at an item of another city (A2, A22). */
export function checkSceneReferences(scene: SceneEntry, refs: SceneReferences): void {
  const where = `${scene.story.storyId}${scene.story.knot ? ` (${scene.story.knot})` : ""}`;
  const item = (id: string, what: string) => {
    const city = refs.items.get(id);
    if (!city) throw new Error(`Unknown item in ${what} of ${where}: ${id} (declare it in encounters/catalog.json items)`);
    if (city !== scene.cityId && !(what !== "# on_done: item" && refs.carriedInto?.(id, scene.cityId)))
      throw new Error(`An item of another city in ${what} of ${where}: ${id} belongs to ${city}, the scene is in ${scene.cityId} (A22; ` +
        `an item carried through the journey, "carry": "journey", is held, given and used in the journey's later cities)`);
  };
  const flag = (id: string, what: string) => {
    if (!refs.flags.has(id)) throw new Error(`Undeclared flag in ${what} of ${where}: ${id} (declare it in progression/story.json flags)`);
  };
  for (const person of scene.people) if (!refs.people.has(person))
    throw new Error(`Undeclared person in # person: of ${where}: ${person} (declare it in progression/story.json people)`);
  for (const option of scene.options) {
    const what = `the choice ${option.id}`;
    if (option.give) {
      item(option.give.item, `${what} (# give:)`);
      if (option.give.to !== "heroine" && !refs.people.has(option.give.to))
        throw new Error(`# give: names no one known in ${where} (${option.id}): ${option.give.to} (heroine, or a person of progression/story.json)`);
    }
    if (option.use) item(option.use, `${what} (# use:)`);
    for (const id of option.set ?? []) flag(id, `${what} (# set:)`);
    for (const id of option.memory ?? []) if (!refs.memories.has(id)) throw new Error(`Unknown memory in ${what} of ${where}: ${id}`);
    if (option.profile && !refs.profiles.has(option.profile)) throw new Error(`Unknown reaction profile in ${what} of ${where}: ${option.profile}`);
    if (option.effect && !refs.effects.has(option.effect)) throw new Error(`Unknown effect in ${what} of ${where}: ${option.effect}`);
  }
  for (const id of scene.done.items ?? []) item(id, "# on_done: item");
  for (const id of scene.done.use ?? []) item(id, "# on_done: use");
  for (const id of scene.done.set ?? []) flag(id, "# on_done: set");
}

/** The conditions of a scene (its head and its options' `# requires:`), for the condition checks. */
export function sceneConditionsOf(scene: SceneEntry): { field: string; condition: Condition }[] {
  return [
    ...(scene.when ? [{ field: "when", condition: scene.when }] : []),
    ...scene.options.flatMap((option) => (option.requires ?? []).map((condition) => ({ field: `# requires: of ${option.id}`, condition }))),
  ];
}

/** What the then: loop check reads of the journey besides the scenes (3.3 check 10; stage 4). */
export type ThenLoopContext = {
  /** A city's routes: the mode a `then: move` takes (`by`, else walking when a walk route joins the places, else the cheapest; 4.4). */
  routes?: (cityId: string) => readonly { fromPlaceId: string; toPlaceId: string; mode: string; cost: number; minutes: number }[];
  /** Whether a mode of the city is a rental (usable only once rented). Unknown: any other mode may be one. */
  rental?: (cityId: string, modeId: string) => boolean;
  /** Whether the city's departure opens (it has a next city). */
  departs?: (cityId: string) => boolean;
  /** Whether the player cannot leave the city without its epilogue (a journey that moves on after it, or its last city). */
  epilogueRequired?: (cityId: string) => boolean;
  /** The city's hotel (「休む」 is a trip there). */
  hotel?: (cityId: string) => string | undefined;
  /** The city whose finale is at the place, and whether it charges admission (its ticket counter opens then). */
  finaleAt?: (placeId: string) => { cityId: string; admission: boolean } | undefined;
};
type Loop = { sure: boolean; stops: boolean; text: string };
type Verdict = "yes" | "maybe" | "no";
const WALK = "walk";

/**
 * Whether a trip scene's head `then: move` makes its trip run it again: each place the trip may leave from is read on its own
 * (the party has not moved: the new trip leaves the same place). The move goes by `by`, else walking when a walk route joins
 * the places, else the cheapest it can use. "yes": from some place it surely goes by the trip's mode for no fare (its free leg
 * is cheaper than every other mode's); "maybe": it may (another mode is as cheap, so what is rented decides, or each round pays a
 * fare until the money runs out).
 */
function tripLoop(context: ThenLoopContext, cityId: string, moment: Extract<SceneAt, { trip: string }>, then: { move: string; by?: string }): Verdict {
  if (!context.routes) return then.by ? (then.by === moment.trip ? "yes" : "no") : "maybe";
  const all = context.routes(cityId);
  const froms = moment.from ? [moment.from] : [...new Set(all.map((route) => route.fromPlaceId))];
  let maybe = false;
  for (const from of froms) {
    // The trip's scene runs there only when a route of its mode leaves the place.
    if (from === then.move || !all.some((route) => route.fromPlaceId === from && route.toPlaceId !== from && route.mode === moment.trip)) continue;
    const legs = all.filter((route) => route.fromPlaceId === from && route.toPlaceId === then.move);
    const usable = then.by ? legs.filter((route) => route.mode === then.by) : legs.some((route) => route.mode === WALK) ? legs.filter((route) => route.mode === WALK) : legs;
    const own = usable.filter((route) => route.mode === moment.trip);
    if (!own.length) continue;
    // Its own mode is usable whenever its scene runs, and planThen takes the cheapest leg, the first listed on a tie (4.4): a free own
    // leg wins unless another free leg is listed before it. That one wins when it is a plain mode (no loop from here); when it is
    // a rental, renting it decides.
    const first = usable.findIndex((route) => route.mode === moment.trip && route.cost === 0);
    if (first >= 0) {
      const before = usable.slice(0, first).filter((route) => route.cost === 0);
      if (!before.length) return "yes";
      if (context.rental && before.some((route) => !context.rental!(cityId, route.mode))) continue;
    }
    maybe = true;
  }
  return maybe ? "maybe" : "no";
}

/**
 * Whether a trip scene runs on the way home of 「休む」 pressed at a place: its `from` allows the place and its mode is a way home there
 * that the player takes. "yes": walking home (a walk home there, and no free plain way home faster than it), or the only way home
 * there for no fare; "maybe": the player may rest by another mode, or that only way home charges a fare (each round pays it until
 * the money runs out); "no": the rest from there never runs it.
 */
function restTripRuns(context: ThenLoopContext, cityId: string, moment: Extract<SceneAt, { trip: string }>, place: string): Verdict {
  if (moment.from && moment.from !== place) return "no";
  const hotel = context.hotel?.(cityId);
  if (place === hotel) return "no";
  if (!context.routes || !hotel) return moment.trip === WALK ? "yes" : "maybe";
  const all = context.routes(cityId);
  // The ways home from there: a route to the hotel, or a ride and a walk to it (their fares and minutes added).
  const ways = all.filter((route) => route.fromPlaceId === place && route.toPlaceId !== place).flatMap((route) => route.toPlaceId === hotel ? [route]
    : route.mode === WALK ? [] : all.filter((walk) => walk.fromPlaceId === route.toPlaceId && walk.toPlaceId === hotel && walk.mode === WALK)
      .map((walk) => ({ ...route, cost: route.cost + walk.cost, minutes: route.minutes + walk.minutes })));
  const own = ways.filter((way) => way.mode === moment.trip);
  if (!own.length) return "no";
  if (moment.trip === WALK) {
    // 「休む」 also offers a faster way home (rule a): a free one of a plain mode is open to every player.
    const walk = Math.min(...own.map((way) => way.minutes));
    return ways.some((way) => way.mode !== WALK && way.cost === 0 && way.minutes < walk && context.rental && !context.rental(cityId, way.mode)) ? "maybe" : "yes";
  }
  if (ways.every((way) => way.mode === moment.trip)) return own.some((way) => way.cost === 0) ? "yes" : "maybe";
  return "maybe";
}

/**
 * Whether the night of 「休む」 is dropped for good after a scene's `then: move` on the way home: the next 「休む」 leaves from where
 * the move left the party; a scene repeated always that runs on that way home (this one, or another) moves the party on again.
 * Followed from place to place until a place comes again (dropped: "yes" when every link is sure, else "maybe") or no such scene
 * runs there (the night comes: "no").
 */
function restChain(scenes: readonly SceneEntry[], context: ThenLoopContext, scene: SceneEntry, then: { move: string }): Verdict {
  const hotel = context.hotel?.(scene.cityId);
  const movers = scenes.filter((item) => item.cityId === scene.cityId && item.repeat === "always" && item.then && "move" in item.then &&
    item.then.move !== hotel && item.at.some((at) => "trip" in at && (!at.to || at.to === hotel)));
  const seen = new Set<string>();
  let verdict: Verdict = "yes";
  for (let place = then.move; ;) {
    if (seen.has(place)) return verdict;
    seen.add(place);
    const links = movers.map((item) => {
      const runs = item.at.map((at) => ("trip" in at && (!at.to || at.to === hotel) ? restTripRuns(context, item.cityId, at, place) : "no" as Verdict));
      const best: Verdict = runs.includes("yes") ? (item.when ? "maybe" : "yes") : runs.includes("maybe") ? "maybe" : "no";
      return { item, best };
    }).filter((link) => link.best !== "no");
    const link = links.find((item) => item.best === "yes") ?? links[0];
    if (!link) return "no";
    if (link.best === "maybe") verdict = "maybe";
    place = (link.item.then as { move: string }).move;
  }
}

/**
 * Whether a moment of a scene runs again after its head's `then: move` to the place (the visit there, the place itself, its
 * ticket counter, or the trip there by the mode the move takes).
 */
function runsAtMoveTarget(scene: SceneEntry, moment: SceneAt, then: { move: string; by?: string }, visits: readonly string[], context: ThenLoopContext): Verdict {
  const placeId = then.move;
  if ("place" in moment) return moment.place === placeId && visits.length > 0 ? "yes" : "no";
  if ("visit" in moment) return (moment.visit === "any" ? visits.length > 0 : visits.includes(moment.visit)) ? "yes" : "no";
  if ("ticket" in moment) return moment.ticket === placeId ? "yes" : "no";
  if (!("trip" in moment) || (moment.to && moment.to !== placeId) || moment.from === placeId) return "no";
  return tripLoop(context, scene.cityId, moment, then);
}

/**
 * The then: loop a scene repeated always makes with its head (A12, 3.3 check 10), if any: a `then: move` to a place whose visit,
 * ticket counter or trip runs it again; a `then: move` from before a moment's main step the game needs (stage 4: the hotel's night,
 * also on the trip home of 「休む」, the city's finale, also at its place and its ticket counter, the departure, the epilogue), which
 * drops that step each time the moment comes; a `then: epilogue` at the epilogue.
 */
function thenLoopOf(scenes: readonly SceneEntry[], scene: SceneEntry, placeLandmarks: (placeId: string) => readonly string[], context: ThenLoopContext): Loop | undefined {
  const then = scene.then;
  if (!then || scene.repeat !== "always") return undefined;
  const before = typeof scene.priority === "number" && scene.priority < 0;
  if ("epilogue" in then)
    return scene.at.some((moment) => "epilogue" in moment && moment.epilogue === scene.cityId)
      ? { sure: true, stops: true, text: `${scene.id} runs at the epilogue of ${scene.cityId} and reopens it by its head's then: epilogue` } : undefined;
  const visits = placeLandmarks(then.move);
  const verdicts = scene.at.map((moment) => runsAtMoveTarget(scene, moment, then, visits, context));
  const again: Loop | undefined = verdicts.includes("yes") || verdicts.includes("maybe")
    ? { sure: verdicts.includes("yes"), stops: true, text: `${scene.id} moves to ${then.move} by its head's then:, where the visit of ${scene.at.map(momentText).join(", ")} ` +
      `runs it again${verdicts.includes("yes") ? "" : " when the move goes by the mode of its trip (walking when a walk route joins them, else the cheapest it can use)"}` } : undefined;
  if (again?.sure) return again;
  const dropped = droppedStep(scenes, scene, then, before, context);
  return dropped?.sure && dropped.stops ? dropped : again ?? dropped;
}

/** A scene before a main step the game needs that always moves elsewhere drops that step each time its moment comes (stage 4). */
function droppedStep(scenes: readonly SceneEntry[], scene: SceneEntry, then: { move: string }, before: boolean, context: ThenLoopContext): Loop | undefined {
  const hotel = context.hotel?.(scene.cityId);
  const blocked = scene.at.flatMap((moment): { text: string; required: boolean; sure: boolean }[] => {
    if ("hotel" in moment) return before ? [{ text: "the night", required: true, sure: true }] : [];
    if ("depart" in moment) return context.departs?.(moment.depart) ?? true ? [{ text: `the departure from ${moment.depart}`, required: true, sure: true }] : [];
    if ("epilogue" in moment) return before ? [{ text: `the epilogue of ${moment.epilogue}`, required: context.epilogueRequired?.(moment.epilogue) ?? true, sure: true }] : [];
    const finale = "finale" in moment ? (before ? moment.finale : undefined) : "place" in moment ? (before ? context.finaleAt?.(moment.place)?.cityId : undefined)
      : "ticket" in moment && context.finaleAt?.(moment.ticket)?.admission ? context.finaleAt(moment.ticket)!.cityId : undefined;
    if (finale) return [{ text: `the finale of ${finale}`, required: true, sure: true }];
    // The trip home of 「休む」 (to the hotel, or anywhere); a move to the hotel itself gets there (the night comes next time).
    if ("trip" in moment && then.move !== hotel && (!moment.to || moment.to === hotel)) {
      const rest = restChain(scenes, context, scene, then);
      return rest === "no" ? [] : [{ text: "the night (on the way home of 「休む」)", required: true, sure: rest === "yes" }];
    }
    return [];
  });
  // Stopped when a step the game needs surely never comes; else a warning (the player may avoid it, or leave without it).
  const stopping = blocked.filter((item) => item.sure && item.required);
  const named = stopping.length ? stopping : blocked;
  return blocked.length ? { sure: stopping.length > 0, stops: stopping.length > 0, text: `${scene.id} runs at ` +
    `${scene.at.map(momentText).join(", ")} before ${named.map((item) => item.text).join(", ")} and moves to ${then.move} by its head's then: each time, ` +
    `so ${named.length > 1 ? "they" : "it"} ${stopping.length ? "never" : "may never"} come${named.length > 1 || !stopping.length ? "" : "s"}` } : undefined;
}

/**
 * An unconditional loop of `then:` (A12, 3.3 check 10): a scene repeated always, with no `when`/`until` to stop it, whose head's
 * `then:` always moves on to a moment that runs it again (or drops a main step the game needs; stage 4), so the game cannot go on.
 */
export function thenLoopErrors(scenes: readonly SceneEntry[], placeLandmarks: (placeId: string) => readonly string[], context: ThenLoopContext = {}): string[] {
  return scenes.flatMap((scene) => {
    const loop = scene.when ? undefined : thenLoopOf(scenes, scene, placeLandmarks, context);
    return loop?.sure && loop.stops ? [`An endless then: loop: ${loop.text}, repeated always without # when: or # until: (A12)`] : [];
  });
}

/**
 * A `then:` loop that may not end (3.3 warning; not stopped): the loops of thenLoopErrors with a `# when:`/`# until:` (the loop ends
 * only when it turns false), a loop that depends on the mode of the move, and an epilogue that never comes in a city the player may
 * leave without it.
 */
export function thenLoopWarnings(scenes: readonly SceneEntry[], placeLandmarks: (placeId: string) => readonly string[], context: ThenLoopContext = {}): string[] {
  return scenes.flatMap((scene) => {
    const loop = thenLoopOf(scenes, scene, placeLandmarks, context);
    if (!loop || (!scene.when && loop.sure && loop.stops)) return [];
    return [scene.when ? `A then: loop left only conditionally: ${loop.text} (repeated always); only its # when: / # until: turning false ends the loop`
      : `A then: loop that may not end: ${loop.text} (repeated always without # when: or # until:)`];
  });
}

/** What the warnings of the stage-4 moments read of the journey: the landmarks, dates and finale (its city) at a place. */
export type MomentPlaces = {
  landmarksAt: (placeId: string) => readonly string[];
  datesAt: (placeId: string) => readonly string[];
  finaleAt: (placeId: string) => string | undefined;
};
export type MomentWarning = { kind: "same-priority" | "repeat-without-until" | "later-never-again"; message: string };

/**
 * The warnings of 2.5 and 2.6 at the moments other than a landmark's visit (stage 4; a visit's are condition-validation.ts's,
 * read through the scene's landmark): inserted scenes of different files that share a priority at one moment (they run in file
 * name order), a scene repeated always without `# until:` (it runs every time its moment comes), and 「また今度」 at moments that
 * come only once (the epilogue, an arrival, a departure, after the finale's battle). Warnings only.
 */
export function momentWarnings(scenes: readonly SceneEntry[], places: MomentPlaces): MomentWarning[] {
  const shown = (priority: SceneEntry["priority"]) => (typeof priority === "number" && priority > 0 ? `+${priority}` : String(priority));
  const hasVisit = (scene: SceneEntry) => scene.at.some((moment) => "visit" in moment || ("place" in moment && places.landmarksAt(moment.place).length > 0));
  /** The moments an `at` names here (a visit's are read elsewhere; `place` names the dates and the finale there). */
  const keysOf = (scene: SceneEntry, moment: SceneAt): { key: string; from?: string; to?: string }[] => {
    if ("visit" in moment) return [];
    if ("place" in moment) {
      const finale = places.finaleAt(moment.place);
      return [...places.datesAt(moment.place).map((id) => ({ key: `date ${id}` })), ...(finale ? [{ key: `finale ${finale}` }] : [])];
    }
    if ("hotel" in moment) return [{ key: `hotel ${scene.cityId}` }];
    if ("trip" in moment) return [{ key: `trip ${moment.trip} in ${scene.cityId}`, from: moment.from, to: moment.to }];
    return [{ key: momentText(moment) }];
  };
  const inserted = scenes.filter((scene) => INSERTED_KINDS.includes(scene.kind) && scene.priority !== undefined);
  const groups = new Map<string, { scene: SceneEntry; from?: string; to?: string; key: string }[]>();
  for (const scene of inserted) for (const moment of scene.at) for (const item of keysOf(scene, moment)) {
    const group = `${item.key}\u0000${scene.priority}`;
    groups.set(group, [...(groups.get(group) ?? []), { ...item, scene }]);
  }
  // A trip's scenes share it only when their from and to can name the same trip.
  const meets = (a: { from?: string; to?: string }, b: { from?: string; to?: string }) => (!a.from || !b.from || a.from === b.from) && (!a.to || !b.to || a.to === b.to);
  const same = [...groups.values()].flatMap((group): MomentWarning[] => {
    const shared = [...new Map(group.filter((item) => group.some((other) => other.scene.story.storyId !== item.scene.story.storyId && meets(item, other)))
      .map((item) => [item.scene.id, item])).values()];
    const files = [...new Set(shared.map((item) => item.scene.story.storyId))];
    return files.length > 1 ? [{ kind: "same-priority", message: `Scenes share a priority: ${shared.map((item) => item.scene.id).join(", ")} have priority ` +
      `${shown(shared[0].scene.priority)} at ${shared[0].key}; they run in the order of their story files' names (${files.join(", ")})` }] : [];
  });
  // `# until:` becomes a `not` in the scene's when, like a `# when: not …`: either closes the repetition.
  const closes = (condition: Condition | undefined): boolean => !!condition && ("not" in condition || ("all" in condition && condition.all.some(closes)));
  const stageFour = (scene: SceneEntry) => scene.at.filter((moment) => keysOf(scene, moment).length > 0);
  const repeated = inserted.filter((scene) => scene.repeat === "always" && !closes(scene.when) && !hasVisit(scene) && stageFour(scene).length)
    .map((scene): MomentWarning => ({ kind: "repeat-without-until", message: `Repeated scene without until: ${scene.id} (# repeat: always) has no # until:, ` +
      `so it runs every time ${stageFour(scene).map(momentText).join(", ")} comes` }));
  const afterFinale = (scene: SceneEntry) => (typeof scene.priority === "number" ? scene.priority > 0 : scene.priority === "after battle");
  const once = (scene: SceneEntry, moment: SceneAt) => "epilogue" in moment || "arrive" in moment || "depart" in moment || "tour" in moment ||
    (("finale" in moment || ("place" in moment && !places.landmarksAt(moment.place).length && !places.datesAt(moment.place).length && !!places.finaleAt(moment.place))) &&
      afterFinale(scene));
  const later = inserted.flatMap((scene): MomentWarning[] => {
    const option = scene.options.find((item) => item.later);
    return option && scene.at.length && scene.at.every((moment) => once(scene, moment))
      ? [{ kind: "later-never-again", message: `「また今度」 leads to no later moment: ${scene.id} (at ${scene.at.map(momentText).join(", ")}, priority ${shown(scene.priority)}) ` +
        `can be ended with 「また今度」 (option ${option.id}), but that moment comes only once, so it is never met again (add a moment where it can come back)` }]
      : [];
  });
  return [...later, ...same, ...repeated];
}

/**
 * The rules of a tour's steps across the place files (tour stages 2b, 3; `# at: tour <tour> <step>`): a leg has at most one narration
 * (`# scene: tour_leg`) and at most one scene after it (`# priority: after leg`: the in-car encounter, before the leg moves the
 * party). That scene runs once on the one day of the tour, whose price covers it: it neither spends nor gives money, gives no AP,
 * offers no 「また今度」 and does not repeat. Returns the errors (content:build stops on them).
 */
export function tourMomentErrors(scenes: readonly SceneEntry[]): string[] {
  const errors: string[] = [];
  const legs = new Map<string, { narrations: string[]; inCar: string[] }>();
  for (const scene of scenes) for (const moment of scene.at) {
    if (!("tour" in moment)) continue;
    const key = momentText(moment);
    const leg = legs.get(key) ?? { narrations: [], inCar: [] };
    legs.set(key, leg);
    if (scene.kind === "tour_leg") leg.narrations.push(scene.id);
    if (scene.priority !== "after leg") continue;
    leg.inCar.push(scene.id);
    const spends = [...scene.options.filter((option) => option.money !== undefined).map((option) => `the choice ${option.id}'s # money:`),
      ...(scene.done.money !== undefined ? ["# on_done: money"] : []),
      ...scene.options.filter((option) => (option.ap ?? 0) > 0).map((option) => `the choice ${option.id}'s # ap: +${option.ap}`),
      ...((scene.done.ap ?? 0) > 0 ? [`# on_done: ap +${scene.done.ap}`] : []),
      ...(scene.done.reward ? [`# on_done: reward ${scene.done.reward}`] : []),
      ...scene.options.filter((option) => option.later).map((option) => `the choice ${option.id}'s # later (「また今度」)`),
      ...(scene.repeat === "always" ? ["# repeat: always"] : [])];
    if (spends.length)
      errors.push(`The in-car encounter ${scene.id} (# at: ${key}, # priority: after leg) takes no ${spends.join(", ")}: it runs once on the tour's day, ` +
        "whose price covers it (no money, no AP reward, no 「また今度」, no repetition)");
  }
  for (const [key, leg] of legs) {
    if (leg.narrations.length > 1) errors.push(`A tour leg has one narration: ${leg.narrations.join(", ")} are all # scene: tour_leg at # at: ${key}`);
    if (leg.inCar.length > 1) errors.push(`A tour leg has at most one in-car encounter: ${leg.inCar.join(", ")} are all # priority: after leg at # at: ${key}`);
  }
  return errors;
}

/** The leaves a condition reads (for the stage-3a parts' references). */
export const conditionParts = (condition: Condition) => conditionLeaves(condition);
