import type { Condition } from "../src/content/condition-schemas";
import { conditionLeaves } from "../src/content/condition-schemas";
import type { EncounterDefinition } from "../src/content/encounter-schemas";
import type { EncounterEntryRule } from "../src/content/encounter-entry-rules";
import { fnvHash } from "../src/content/fingerprint";
import type { RewardRule } from "../src/content/journey-schemas";
import { INSERTED_KINDS, type SceneAt, type SceneDone, type SceneEntry, type SceneKind, type SceneMain, type SceneOption } from "../src/content/scene-schemas";
import { knotAddress } from "../src/content/story-address";
import { choiceOption, readHead, reachableKnots, type PlaceFile, type PlaceHead } from "./place-files";

// The scene table of content:build (the unified event design, stage 3a, 3.3): the scenes of the
// place files with their option tables, the head `# on_done:` of one-scene main files, and
// today's encounter catalogs read as the same table (Milan, unchanged: the same scenes at the same
// moments with the same money). Also the AP rules of the tags that give AP (`scene_tag`, made
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
    const main = input.mains.find((item) => item.address === address);
    if (inserted) {
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
    const cities = inserted ? [...new Set(head.at.map((moment) => momentCity(input, moment, label)).filter((city): city is string => !!city))] : [main!.cityId];
    if (cities.length > 1) throw new Error(`The moments of ${label} are in different cities (${cities.join(", ")}); one scene belongs to one city`);
    const cityId = cities[0] ?? "";
    const knots = reached.map((item) => item.name);
    const conds = [...new Set(reached.flatMap((item) => item.conds))];
    const data = { options, done: head.done, people: head.people, kind: head.kind };
    result.push({ head, entry: {
      id: knot.name, kind: head.kind, ...(head.title ? { title: head.title } : main ? { title: main.title } : {}), cityId,
      story: { storyId: file.storyId, knot: knot.name }, ...(main ? { main: main.main } : {}),
      at: inserted ? head.at : [],
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
      ...(entry.repeat === "always" ? { repeatable: true } : {}),
    } as EncounterDefinition,
    rule: { encounterId: entry.id, priority: entry.priority, ...(entry.when ? { when: entry.when } : {}) },
  };
}

/** Today's encounter catalog read as the scene table (Milan: content:build converts it, nothing is moved; the equivalence test compares). */
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

/**
 * An unconditional loop of `then:` (A12, 3.3 check 10): a scene that always moves on (its head's
 * `then:`) to a place whose visit runs the scene again, with no `when`/`until` to stop it and
 * repeated always. (Stage 3 has only the visit moments.)
 */
export function thenLoopErrors(scenes: readonly SceneEntry[], placeLandmarks: (placeId: string) => readonly string[]): string[] {
  return scenes.flatMap((scene) => {
    const then = scene.then;
    if (!then || !("move" in then) || scene.when || scene.repeat !== "always") return [];
    const visits = placeLandmarks(then.move);
    const runsThere = scene.at.some((moment) => runsAtMoveTarget(moment, then.move, visits));
    return runsThere
      ? [`An endless then: loop: ${scene.id} moves to ${then.move} by its head's then:, where the visit of ${scene.at.map(momentText).join(", ")} ` +
        `runs it again, repeated always without # when: or # until: (A12)`]
      : [];
  }).concat(scenes.flatMap((scene) => {
    // The 3.3 example: an epilogue's scene that reopens the epilogue by its head's then: (each opening runs it again).
    const then = scene.then;
    return then && "epilogue" in then && !scene.when && scene.repeat === "always" && scene.at.some((moment) => "epilogue" in moment && moment.epilogue === scene.cityId)
      ? [`An endless then: loop: ${scene.id} runs at the epilogue of ${scene.cityId} and reopens it by its head's then: epilogue, repeated always without # when: or # until: (A12)`]
      : [];
  }));
}
/** Whether a moment runs at the visit a `then: move` to the place opens (visits there, or the place itself). */
const runsAtMoveTarget = (moment: SceneAt, placeId: string, visits: readonly string[]) =>
  "place" in moment ? moment.place === placeId : "visit" in moment ? (moment.visit === "any" ? visits.length > 0 : visits.includes(moment.visit))
    : "trip" in moment ? (!moment.to || moment.to === placeId) : "ticket" in moment ? moment.ticket === placeId : false;

/**
 * A `then:` loop that can be left only conditionally (3.3 warning): the same loop as thenLoopErrors, but the scene has a
 * `# when:`/`# until:`, so the loop ends only when that condition turns false (not stopped).
 */
export function thenLoopWarnings(scenes: readonly SceneEntry[], placeLandmarks: (placeId: string) => readonly string[]): string[] {
  return scenes.flatMap((scene) => {
    const then = scene.then;
    if (!then || !("move" in then) || !scene.when || scene.repeat !== "always") return [];
    const visits = placeLandmarks(then.move);
    const runsThere = scene.at.some((moment) => runsAtMoveTarget(moment, then.move, visits));
    return runsThere ? [`A then: loop left only conditionally: ${scene.id} moves to ${then.move} by its head's then:, where its visit runs it again ` +
      `(repeated always); only its # when: / # until: turning false ends the loop`] : [];
  });
}

/** The leaves a condition reads (for the stage-3a parts' references). */
export const conditionParts = (condition: Condition) => conditionLeaves(condition);
