import { encounters } from "../content/encounters";
import { sceneConditionReader } from "./scene-conditions";
import { responseProfileSchema } from "../content/schemas";
import { getCityStoryBackground, landmarks, responseProfiles } from "../content";
import type { EncounterDefinition } from "../content/encounter-schemas";
import { beginStory, continueStory, selectStoryChoice, storyFingerprint, validateStorySnapshot, type StoryFrame, type StoryStep } from "../story/runtime";
import { secureRomanceRoll } from "../random/romance-source";
import { canAccessFreeTime, leaveBattleResult } from "./chapter";
import { evaluateProgression, getPlayerAddress, type Availability, type GameState } from "./game";
import { earnRewards } from "./rewards";
import { createRomanceRollPlan, resolveRomanceChoice } from "./romance-random";
import { deriveRelationshipTone } from "./romance-tone";
import { scoreQuizAnswer } from "./quiz-answer";
import type { ActiveEncounter } from "./encounter-state";
import placeRuleData from "../content/generated/content/encounters/entry-rules.json";
import { encounterEntryRulesSchema } from "../content/encounter-entry-rules";
import { beginLandmarkObservation, startTourismBattle } from "./tourism";
import { battlePlayed, meets } from "./conditions";
import { advanceOccasion, commitThen, leaveObservation, occasionSteps, planThen } from "./occasion";
import { visitOrder, visitSlot, type MomentEntry, type VisitSlot } from "./encounter-moments";
import { battles, cityContents, episodes } from "../content";
import { applyChoiceEffects, applyDoneEffects, changesRelationship, choiceDisplay, doneReserve, insertedDoneReserve, placeSceneById, sceneById, sceneOption, type ChoiceDisplay } from "./scene-effects";
import type { SceneOption } from "../content/scene-schemas";
import { itemUsableIn } from "./item-cities";
import { usableAp, usableMoney } from "./reservations";

const findEncounter = (id: string) => encounters.encounters.find((item) => item.id === id);
const placeRules = encounterEntryRulesSchema.parse(placeRuleData);
/** An encounter's entry rule (its moment, `when` and quiz timing), if it has one. */
export const encounterEntryRule = (encounterId: string) => placeRules.entries.find((entry) => entry.encounterId === encounterId);
/** The entry rules in force (tests add fictional ones to it and take them out again). */
export const encounterEntryRuleList = placeRules.entries;
const entryRule = (event: EncounterDefinition) => encounterEntryRule(event.id);
/**
 * The landmarks a moment of a scene runs at (stage 3: `visit <landmark>`, `visit any` = every landmark of
 * the scene's city, `place <place>` = the landmarks visited at that place); a catalog's encounter at its landmark.
 * A `place` of a city whose content is not loaded (another journey's: a production page loads only the open
 * journey's part, src/content/index.ts loadJourneyContent) has no landmark here: none of its places can be visited.
 */
function sceneLandmarks(event: EncounterDefinition): string[] {
  const scene = sceneById(event.id);
  if (!scene || !scene.at.length) return event.landmarkId ? [event.landmarkId] : [];
  // (A stage-4 moment other than a visit runs at no landmark: moments.ts places it.)
  return [...new Set(scene.at.flatMap((moment) => "place" in moment
    ? (cityContents[event.cityId]?.travel.events ?? []).filter((item) => item.placeId === moment.place).flatMap((item) => visitedLandmarkOfEvent(item.id) ?? [])
    : !("visit" in moment) ? [] : moment.visit === "any" ? landmarks.filter((landmark) => landmark.cityId === event.cityId).map((landmark) => landmark.id) : [moment.visit]))];
}
/** Whether the encounter runs at the landmark's visit. */
export const encounterRunsAt = (encounterId: string, landmarkId: string) => {
  const event = findEncounter(encounterId);
  return !!event && sceneLandmarks(event).includes(landmarkId);
};
/** Every encounter's place at its landmarks' visits, for the order of each slot (encounter-moments.ts; read each time: test cities add encounters). */
const momentEntries = (): MomentEntry[] => encounters.encounters.flatMap((event) => sceneLandmarks(event).map((landmarkId) => ({
  encounterId: event.id, landmarkId, storyId: event.storyId, priority: entryRule(event)?.priority,
  order: placeSceneById(event.id)?.order ?? 0,
})));
const slotOf = (event: EncounterDefinition): VisitSlot => visitSlot(entryRule(event)?.priority);
/** The encounters of a slot of the landmark's visit, in play order. */
export const landmarkVisitOrder = (landmarkId: string, slot: VisitSlot) => visitOrder(momentEntries(), landmarkId, slot);
/** The slot of an encounter's landmark visit it runs in (before the main part, after a part, while observing, after it). */
export function encounterVisitSlot(encounterId: string): VisitSlot | undefined {
  const event = findEncounter(encounterId);
  return event && slotOf(event);
}
/** The inserted scenes of a landmark's visit by place in its order (the occasion's sequence, occasion.ts): `after observe` runs from the observation. */
export function sceneSchedule(landmarkId: string): { before: string[]; after: string[]; afterPart: Record<string, string[]> } {
  return { before: landmarkVisitOrder(landmarkId, "before"), after: landmarkVisitOrder(landmarkId, "after"),
    afterPart: { guide: landmarkVisitOrder(landmarkId, "afterGuide"), battle: landmarkVisitOrder(landmarkId, "afterBattle") } };
}
const unavailable = (reason: string): Availability => ({ available: false, reason });
const available: Availability = { available: true, reason: "" };

/**
 * The choice tags of a one-scene catalog encounter (stage 3b: a one-scene file takes the tags too), joined to its
 * catalog option by content:build: the part the catalog fields do not apply (requires, rel, money beyond the cost, AP, flags, memories, then:).
 */
function catalogTagOption(event: EncounterDefinition, option: EncounterDefinition["options"][number]): SceneOption | undefined {
  const scene = sceneById(event.id);
  const tags = scene?.origin === "catalog" ? sceneOption(scene, option.id) : undefined;
  if (!tags) return undefined;
  const money = (tags.money ?? 0) + (option.cost ?? 0);
  const { give: _give, use: _use, profile: _profile, later: _later, requires, ...rest } = tags;
  const extra = requires?.filter((condition) => !("item" in condition && condition.item.id === option.requiresItemId));
  const own = { ...rest, ...(money ? { money } : { money: undefined }), ...(extra?.length ? { requires: extra } : {}) };
  return Object.keys(own).some((key) => key !== "id" && key !== "knot" && key !== "translated" && own[key as keyof typeof own] !== undefined) ? own : undefined;
}

/** A tagged choice follows its stable ID; older Ink uses its original order. */
export function encounterChoiceOption(event: EncounterDefinition, choice: StoryFrame["choices"][number]) {
  return choice.optionId === undefined ? event.options[choice.index] : event.options.find((option) => option.id === choice.optionId);
}

/** Item IDs remain globally stable, but may only be used by events in their city. */
function itemBelongsToEncounter(event: EncounterDefinition, itemId: string | undefined): boolean {
  return itemId === undefined || encounters.items.some((item) => item.id === itemId && item.cityId === event.cityId);
}

/** The items a choice needs, gives or uses: the encounter's city's, or carried here from a city the journey has done (§2.4). */
function optionItemsBelongToEncounter(state: Pick<GameState, "completedCityIds">, event: EncounterDefinition, option: EncounterDefinition["options"][number]): boolean {
  return [option.requiresItemId, option.consumeItemId, option.giftItemId].every((itemId) => itemId === undefined || itemUsableIn(state, itemId, event.cityId));
}

function encounterFingerprint(event: EncounterDefinition): string {
  const ids = [event.storyId, ...(event.quiz ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId] : [])];
  // Odds have their own stored snapshot; rebalancing must not invalidate an active event.
  const fingerprintData = event.quiz ? { ...event, quiz: { ...event.quiz, chancePercent: 0 } } : event;
  const text = JSON.stringify(fingerprintData) + ids.map((id) => storyFingerprint(id)).join(":");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}

export function getActiveEncounterDefinition(active: ActiveEncounter): EncounterDefinition {
  const current = findEncounter(active.encounterId);
  try { if (current && encounterFingerprint(current) === active.contentHash) return current; }
  catch { /* Missing or changed content must not be resumed. */ }
  throw new Error("道中交流の保存状態が一致しません。");
}

function activeStoryId(active: ActiveEncounter, id: string): string {
  getActiveEncounterDefinition(active);
  return id;
}

/**
 * The entry rules of an encounter apart from the moment it is looked up at
 * (its entry rule's `when`, the city, no other scene, not completed unless
 * repeatable, and the items its actionable choices need). Encounters start
 * only at their landmark's visit: before its main part, while observing
 * (getTourismEncounterAvailability) or after its battle; there is no way to
 * start one from free time. Play reads only `available`; the reasons are for
 * Debug's candidate table (momentSceneAvailability).
 */
function getEncounterEntryAvailability(state: GameState, event: EncounterDefinition): Availability {
  if (event.cityId !== state.currentCityId) return unavailable("この街の場面ではありません。");
  if (!meets(state, entryRule(event)?.when)) return unavailable("この場所を訪れたあとに出会えます。");
  if (!canAccessFreeTime(state)) return unavailable("旅を進めると始められます。");
  if (state.activeEncounter || state.activeDate || state.activeTourism || state.activeEpilogue || state.activeBattle)
    return unavailable("途中の場面を終えてから始められます。");
  if (!event.repeatable && state.completedEncounterIds.includes(event.id)) return unavailable("この場面は終えています。");
  // A head # then: (stage 3b) that cannot be paid keeps the scene from showing (2.3).
  const head = sceneById(event.id)?.then;
  const plan = head && planThen(state, head, event.id, insertedDoneReserve(event.id));
  if (plan && plan.ok === false) return unavailable("この場面の移動ができません。");
  // A place file's scene: its own # on_done: that spends must be payable from what is left (it is kept back while it runs). With
  // a head then: decided as it starts, the plan read it against what the then: keeps back (the moment's other parts do not run).
  const place = placeSceneById(event.id);
  if (place) {
    if (plan && plan.ok === true && state.occasion) return available;
    const reserve = doneReserve(place.done);
    return usableMoney(state) < reserve.money || usableAp(state) < reserve.ap ? unavailable("この場面の支払いができません。") : available;
  }
  const actionable = event.options.filter((option) => !option.deferCompletion);
  if (actionable.length && actionable.every((option) => !optionItemsBelongToEncounter(state, event, option) || (option.requiresItemId && state.inventory[option.requiresItemId] !== "held")))
    return unavailable("必要な品物を持っていません。");
  return available;
}

/** Keep the optional cultural quiz after the main battle, so it cannot reveal its answer first. */
function hasLandmarkBattle(state: GameState, event: EncounterDefinition): boolean {
  const battleId = event.landmarkId && landmarks.find((landmark) => landmark.id === event.landmarkId)?.battleId;
  return !!battleId && battlePlayed(state, battleId);
}

/** A deferred quiz's leave branch, or its pre-battle visit, ends without the quiz. */
function encounterStoryCanFinish(state: GameState): boolean {
  const active = state.activeEncounter;
  if (!active || active.phase !== "story" || !active.frame.ended) return false;
  // A place file's scene ends with its last line, whatever choices it had (none, one or more).
  if (placeSceneById(active.encounterId)) return true;
  if (!active.selectedOptionId) return false;
  const event = getActiveEncounterDefinition(active);
  if (!event.quiz) return true;
  if (!entryRule(event)?.quizAfterLandmarkBattle) return false;
  const option = event.options.find((item) => item.id === active.selectedOptionId);
  return !!option?.deferCompletion || !hasLandmarkBattle(state, event);
}

/** The encounter's last line ends the scene (EncounterScreen's 「観光に戻る」／「自由時間へ」) instead of reading on. */
export function encounterCanFinish(state: GameState): boolean {
  const active = state.activeEncounter;
  return !!active && active.frame.ended && (active.phase === "outcome" || encounterStoryCanFinish(state));
}

/**
 * How a choice of the open encounter shows (decision 43): hidden when what it needs does not hold
 * (`# requires:`, the item of `# give:`/`# use:`, today's requiresItemId), greyed out with the reason
 * when it cannot be paid, open otherwise. The screen and listPlayerActions read this one function.
 */
export function encounterChoiceDisplay(state: GameState, index: number): ChoiceDisplay & { cost?: number; ap?: number } {
  const active = state.activeEncounter;
  const choice = active?.frame.choices.find((item) => item.index === index);
  const place = active && placeSceneById(active.encounterId);
  if (active && choice && place) {
    if (active.phase !== "story") return { show: "grey", reason: "この選択肢は使えません。" };
    const option = sceneOption(place, choice.optionId);
    if (choice.optionId !== undefined && !option) return { show: "hidden" };
    const shown = choiceDisplay(state, option, doneReserve(place.done));
    // (A Debug test city's copy of a place encounter runs as a catalog encounter: no scene of its own, nothing hidden.)
    return { ...shown, ...((option?.money ?? 0) < 0 ? { cost: -option!.money! } : {}), ...((option?.ap ?? 0) < 0 ? { ap: -option!.ap! } : {}) };
  }
  const event = active && getActiveEncounterDefinition(active);
  const option = event && choice ? encounterChoiceOption(event, choice) : undefined;
  if (event && option && (!optionItemsBelongToEncounter(state, event, option) || (option.requiresItemId && state.inventory[option.requiresItemId] !== "held")))
    return { show: "hidden" };
  const availability = getEncounterOptionAvailability(state, index);
  if (!availability.available) return { show: "grey", reason: availability.reason, cost: option?.cost };
  // Its choice tags (a one-scene file's): hidden or greyed out the same way as a place file's.
  const tags = event && option ? catalogTagOption(event, option) : undefined;
  const shown = tags ? choiceDisplay(state, tags) : { show: "open" as const };
  const ap = (tags?.ap ?? 0) < 0 ? { ap: -tags!.ap! } : {};
  return shown.show === "open" ? { show: "open", cost: option?.cost, ...ap } : shown.show === "hidden" ? shown : { ...shown, cost: option?.cost, ...ap };
}

export function getEncounterOptionAvailability(state: GameState, index: number): Availability {
  const active = state.activeEncounter;
  const place = active && placeSceneById(active.encounterId);
  if (active && place) {
    const choice = active.frame.choices.find((item) => item.index === index);
    if (!choice) return unavailable("この選択肢は使えません。");
    const shown = encounterChoiceDisplay(state, index);
    return shown.show === "open" ? available : unavailable(shown.show === "grey" ? shown.reason : "この選択肢は使えません。");
  }
  const event = active && getActiveEncounterDefinition(active);
  const choice = active?.frame.choices.find((item) => item.index === index);
  const option = event && choice ? encounterChoiceOption(event, choice) : undefined;
  if (!active || active.phase !== "story" || active.selectedOptionId !== null || !option || !active.frame.choices.some((choice) => choice.index === index)) return unavailable("この選択肢は使えません。");
  if (!event || event.cityId !== state.currentCityId || !optionItemsBelongToEncounter(state, event, option)) return unavailable("この街では使えない品物です。");
  const cost = option.cost ?? 0;
  if (state.travelBudget < cost) return unavailable("旅行予算が足りません。");
  if (state.travelBudget - cost < state.travel.returnReserve) return unavailable("帰りの交通費を確保しているため、今は使えません。");
  if (option.requiresItemId && state.inventory[option.requiresItemId] !== "held") return unavailable("必要な品物を持っていません。");
  return available;
}

function variables(state: GameState) {
  return { player_address: getPlayerAddress(state), romance_stage: state.romanceStage, ending_reached: state.endingReached, relationship_tone: deriveRelationshipTone(state) };
}
function checkedStep(step: StoryStep): StoryStep {
  if (step.effects.length) throw new Error("道中交流に未対応の効果があります。");
  return step;
}
function withStep(active: ActiveEncounter, step: StoryStep): ActiveEncounter {
  checkedStep(step);
  return { ...active, storyState: step.storyState, frame: step.frame };
}

/** The tickets are persisted together with the event before any selection. */
function beginEncounter(state: GameState, event: EncounterDefinition, nextRoll: () => number): GameState {
  const id = event.id;
  const [romanceRoll] = createRomanceRollPlan(1, nextRoll);
  const [rewardTicket] = createRomanceRollPlan(1, nextRoll);
  const step = checkedStep(beginStory(event.storyId, state.playerName, state.heroineName, variables(state), state.memories, state.inventory,
    getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state)));
  const next = { ...state, revision: state.revision + 1 };
  return { ...next, activeEncounter: {
    encounterId: id, runId: `${id}:${next.revision}`, contentHash: encounterFingerprint(event),
    storyId: event.storyId, storyHash: storyFingerprint(event.storyId), storyState: step.storyState, frame: step.frame,
    phase: "story", selectedOptionId: null, quizAnswerId: null, rewardRoll: rewardTicket.reaction,
    rewardChancePercent: event.quiz?.chancePercent ?? null,
    rewardAlreadyDrawn: !!event.quiz && !!state.encounterRewards[id], romanceRoll,
    responseProfiles: responseProfiles.filter((profile) => event.options.some((option) => option.responseProfileId === profile.id)).map((profile) => responseProfileSchema.parse(profile)),
    romanceResolution: null,
    ...(placeSceneById(id) ? { chosen: [] } : {}),
  } };
}

/**
 * An `after observe` encounter (or one without a priority) can start from the observation of the
 * landmark's visit now: the occasion's landmark, not started in this occasion, the entry rules.
 */
export function getTourismEncounterAvailability(state: GameState, id: string): Availability {
  const event = findEncounter(id);
  const occasion = state.occasion;
  // The observation's landmark: the occasion's, or (an observation opened outside a map trip: Debug, tests) the open one's.
  const landmarkId = occasion ? occasion.landmarkId : state.activeTourism?.phase === "exploring" ? state.activeTourism.landmarkId : null;
  if (!event || event.cityId !== state.currentCityId || slotOf(event) !== "observe" || !landmarkId ||
      (occasion && occasion.at !== "main:observe") || !encounterRunsAt(id, landmarkId) || !state.visitedLandmarkIds.includes(landmarkId) ||
      (state.activeTourism && (state.activeTourism.phase !== "exploring" || state.activeTourism.landmarkId !== landmarkId)) ||
      state.activeBattle || state.activeDate || state.activeEncounter || state.activeEpilogue ||
      occasion?.started.includes(id) || (!event.repeatable && state.completedEncounterIds.includes(id)))
    return unavailable("今は話しかけられません。");
  // An encounter whose quiz waits for the landmark's battle is met during the
  // first observation, before its milestone; its story then ends without the quiz.
  if (entryRule(event)?.quizAfterLandmarkBattle) return available;
  return getEncounterEntryAvailability({ ...state, activeTourism: null }, event);
}

/** The next `after observe` encounter that can start from the observation now (the observation's 「進む」, and on returning to it). */
export function nextObservationScene(state: GameState): string | undefined {
  const landmarkId = state.occasion?.landmarkId ?? state.activeTourism?.landmarkId;
  return landmarkId ? landmarkVisitOrder(landmarkId, "observe").find((item) => getTourismEncounterAvailability(state, item).available) : undefined;
}

/**
 * Start an encounter met from the observation: it returns to the observation (the occasion's position stays there). An
 * observation opened outside a map trip (Debug, tests) gains its occasion here: a visit without a map event (its
 * observation, then the landmark's battle when it can start).
 */
export function startTourismEncounter(
  state: GameState,
  id: string,
  expectedRevision: number,
  nextRoll: () => number = secureRomanceRoll,
): GameState {
  if (state.revision !== expectedRevision || !getTourismEncounterAvailability(state, id).available) return state;
  const occasion = state.occasion ?? { kind: "visit" as const, eventId: null, landmarkId: state.activeTourism!.landmarkId,
    parts: ["observe" as const, "battle" as const], ran: ["observe" as const], at: "main:observe", started: [] };
  return beginMomentScene({ ...state, activeTourism: null, occasion: { ...occasion, started: [...occasion.started, id] } }, id, nextRoll);
}

/** Start the next eligible encounter of the observation, once per visit. */
export function nextTourismEncounter(state: GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  const id = state.activeTourism?.phase === "exploring" ? nextObservationScene(state) : undefined;
  return id ? startTourismEncounter(state, id, state.revision, nextRoll) : state;
}

/** An inserted scene of the occasion can start now (its entry rules; no scene is running). */
export function momentSceneEligible(state: GameState, id: string): boolean {
  return momentSceneAvailability(state, id).available;
}
/** Why an inserted scene can or cannot start now (Debug's candidate table reads the reason). */
export function momentSceneAvailability(state: GameState, id: string): Availability {
  const event = findEncounter(id);
  return event ? getEncounterEntryAvailability(state, event) : unavailable("場面が見つかりません。");
}

/** Begin an inserted scene of the occasion: its tickets are drawn now and its head # then: is decided (paid) at its start. */
export function beginMomentScene(state: GameState, id: string, nextRoll: () => number): GameState {
  const begun = beginEncounter(state, findEncounter(id)!, nextRoll);
  const head = sceneById(id)?.then;
  return head ? commitThen(begun, head, id, insertedDoneReserve(id)) : begun;
}

/**
 * The landmark a map event visits: a sightseeing episode's or a special battle's landmark
 * (a finale and a date are other moments, not visits).
 */
export function visitedLandmarkOfEvent(eventId: string): string | undefined {
  const episode = episodes.find((item) => item.id === eventId);
  if (episode) return episode.kind === "city_finale" ? undefined : episode.landmarkId ?? undefined;
  return battles.find((battle) => battle.id === eventId)?.landmarkId ?? undefined;
}

/** The battle result screen's 「自由時間へ戻る／進む」: leave the result, then the occasion goes on (after battle, +N, its end). */
export function leaveBattleToFreeTime(state: GameState, expectedRevision: number, nextRoll: () => number = secureRomanceRoll): GameState {
  return leaveBattleResult(state, expectedRevision, nextRoll);
}

/** What finishing the open encounter leads to: back to the observation, on to more of the occasion, or free time (the finish button's label). */
export function encounterLeadsOnward(state: GameState): "observe" | "onward" | false {
  if (!state.activeEncounter || !encounterCanFinish(state)) return false;
  const after = advanceOccasion(finishEncounter(state, state.revision), () => 0);
  if (after.activeTourism?.phase === "exploring") return "observe";
  return after.activeEncounter || after.activeTourism || after.activeBattle || after.activeDate || after.activeEpilogue ? "onward" : false;
}

/** The observation's 「進む」: the next waiting `after observe` encounter, else the next main part (or, during a battle, back to it). */
export function proceedFromTourism(state: GameState, expectedRevision: number, nextRoll: () => number = secureRomanceRoll): GameState {
  if (state.revision !== expectedRevision) return state;
  if (state.activeBattle) return startTourismBattle(state, expectedRevision);
  const next = nextTourismEncounter(state, nextRoll);
  return next !== state ? next : state.occasion ? leaveObservation(state, nextRoll) : startTourismBattle(state, expectedRevision);
}

/** After an encounter's action, its occasion goes on (the next scene, the observation again, the next part, or its end). */
export function continueTourismEncounters(previous: GameState, next: GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  if (next === previous || next.activeEncounter) return next;
  // Back in the observation: the next waiting encounter of it starts (once per visit).
  if (next.activeTourism?.phase === "exploring" && previous.activeEncounter) return nextTourismEncounter(next, nextRoll);
  return advanceOccasion(next, nextRoll);
}

export function chooseEncounter(state: GameState, index: number, expectedRevision: number, nextRoll: () => number = secureRomanceRoll): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active || !getEncounterOptionAvailability(state, index).available) return state;
  const event = getActiveEncounterDefinition(active);
  const place = placeSceneById(event.id);
  if (place) {
    // A place file's scene: the choice's tags apply first (one save), then Ink goes on with the new state (4.4).
    const choice = active.frame.choices.find((item) => item.index === index)!;
    const option = sceneOption(place, choice.optionId);
    const revision = state.revision + 1;
    const applied = option ? applyChoiceEffects(state, place.id, option, revision, nextRoll) : { state };
    const next = applied.state;
    const profile = "profile" in applied ? applied.profile : undefined;
    const chosen = [...(active.chosen ?? []), { optionId: option?.id ?? `_${choice.index}`, ...(profile ? { result: profile.result, roll: profile.roll } : {}) }];
    const step = selectStoryChoice(activeStoryId(active, active.storyId), active.storyState, active.frame, index, next.memories, {},
      { ...variables(next), ...(profile ? { romance_result: profile.result } : {}) }, next.inventory, sceneConditionReader(next));
    return { ...next, revision, activeEncounter: withStep({ ...active, chosen, selectedOptionId: option?.id ?? active.selectedOptionId }, step) };
  }
  const choice = active.frame.choices.find((item) => item.index === index)!;
  const option = encounterChoiceOption(event, choice)!;
  if (option.textEn !== undefined && choice.text !== option.textEn) throw new Error("交流の選択肢が一致しません。");
  const cost = option.cost ?? 0;
  if (state.travelBudget - cost < state.travel.returnReserve) return state;
  let next = { ...state, travelBudget: state.travelBudget - cost, inventory: { ...state.inventory }, itemUses: { ...state.itemUses } };
  // The item's status and the option that changed it are written together.
  if (option.consumeItemId) {
    next.inventory[option.consumeItemId] = "used";
    next.itemUses[option.consumeItemId] = { encounterId: event.id, optionId: option.id };
  }
  if (option.giftItemId) {
    next.inventory[option.giftItemId] = "gifted";
    next.itemUses[option.giftItemId] = { encounterId: event.id, optionId: option.id };
  }
  let result = "positive";
  let romanceResolution: ActiveEncounter["romanceResolution"] = null;
  if (option.responseProfileId) {
    const profile = active.responseProfiles.find((item) => item.id === option.responseProfileId);
    if (!profile) throw new Error("交流のリアクション設定が見つかりません。");
    const resolution = resolveRomanceChoice(profile, state, active.romanceRoll);
    result = resolution.result;
    // A small one-off gesture must not outweigh a full date.
    const small = (n: number) => Math.max(-1, Math.min(1, n));
    const deltas = { affection: small(resolution.deltas.affection), trust: small(resolution.deltas.trust), spark: small(resolution.deltas.spark) };
    romanceResolution = { profileId: profile.id, before: { affection: state.affection, trust: state.trust, spark: state.spark }, deltas, result: resolution.result };
    next = { ...next, affection: next.affection + deltas.affection, trust: next.trust + deltas.trust, spark: next.spark + deltas.spark };
  }
  // A one-scene file's choice tags, after the catalog's fields, before Ink goes on (4.4).
  const tags = catalogTagOption(event, option);
  if (tags) {
    if (encounterChoiceDisplay(state, index).show !== "open") return state;
    next = applyChoiceEffects(next, event.id, tags, state.revision + 1, nextRoll).state;
  }
  const step = selectStoryChoice(activeStoryId(active, active.storyId), active.storyState, active.frame, index, next.memories, {}, { ...variables(next), romance_result: result }, next.inventory, sceneConditionReader(next));
  const chosen = { ...next, revision: state.revision + 1, activeEncounter: withStep({ ...active, selectedOptionId: option.id, romanceResolution }, step) };
  return chosen;
}

/** Progress dialogue, enter the quiz, or show its recorded outcome. */
export function advanceEncounter(state: GameState, expectedRevision: number): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active) return state;
  let event: EncounterDefinition;
  try { event = getActiveEncounterDefinition(active); }
  catch { return state; }
  if (event.cityId !== state.currentCityId) return state;
  if (active.phase === "feedback") {
    const quiz = event.quiz!;
    const correct = active.quizAnswerId === quiz.question.correctOptionId;
    const record = state.encounterRewards[event.id];
    const storyId = !correct ? quiz.lostStoryId : active.rewardAlreadyDrawn ? quiz.alreadyStoryId : record?.won ? quiz.wonStoryId : quiz.lostStoryId;
    const resolvedStoryId = activeStoryId(active, storyId);
    const step = checkedStep(beginStory(resolvedStoryId, state.playerName, state.heroineName, variables(state), state.memories, state.inventory,
      getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state)));
    return { ...state, revision: state.revision + 1, activeEncounter: withStep({ ...active, phase: "outcome", storyId, storyHash: storyFingerprint(resolvedStoryId) }, step) };
  }
  if (active.phase === "quiz" || active.frame.choices.length) return state;
  if (active.frame.ended) {
    if (event.quiz && encounterStoryCanFinish(state)) return finishEncounter(state, expectedRevision);
    if (active.phase === "story" && event.quiz && active.selectedOptionId && !encounterStoryCanFinish(state))
      return { ...state, revision: state.revision + 1, activeEncounter: { ...active, phase: "quiz" } };
    return state;
  }
  return { ...state, revision: state.revision + 1, activeEncounter: withStep(active, continueStory(activeStoryId(active, active.storyId), active.storyState, active.frame, state.memories, variables(state), state.inventory, sceneConditionReader(state))) };
}

export function answerEncounterQuiz(state: GameState, optionId: string, expectedRevision: number): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active || active.phase !== "quiz") return state;
  const event = getActiveEncounterDefinition(active);
  const quiz = event.quiz;
  if (!quiz) return state;
  if (event.cityId !== state.currentCityId || !itemBelongsToEncounter(event, quiz.rewardItemId)) return state;
  const correct = scoreQuizAnswer(quiz.question, optionId);
  if (correct === null) return state;
  const answer = optionId as "A" | "B" | "C";
  let inventory = state.inventory;
  let rewards = state.encounterRewards;
  if (correct && !rewards[event.id]) {
    if (active.rewardChancePercent === null) throw new Error("抽選確率が保存されていません。");
    const won = active.rewardRoll < active.rewardChancePercent * 100;
    rewards = { ...rewards, [event.id]: { roll: active.rewardRoll, chancePercent: active.rewardChancePercent, won } };
    if (won) {
      if (inventory[quiz.rewardItemId]) throw new Error("贈り物の記録が一致しません。");
      inventory = { ...inventory, [quiz.rewardItemId]: "held" };
    }
  }
  return { ...state, revision: state.revision + 1, inventory, encounterRewards: rewards,
    activeEncounter: { ...active, phase: "feedback", quizAnswerId: answer } };
}

export function getEncounterQuizFeedback(state: GameState): { correct: boolean; explanationJa: string } | null {
  const active = state.activeEncounter;
  const quiz = active && getActiveEncounterDefinition(active).quiz;
  if (!active || active.phase !== "feedback" || !quiz || !active.quizAnswerId) return null;
  const correct = scoreQuizAnswer(quiz.question, active.quizAnswerId);
  if (correct === null) return null;
  return { correct, explanationJa: correct ? quiz.question.correctExplanationJa : quiz.question.incorrectExplanationJa };
}

/** Close a place file's scene: seen; done unless a 「また今度」 was chosen, with its # on_done: (A24: in this one save). */
function finishPlaceScene(state: GameState, active: ActiveEncounter, event: EncounterDefinition): GameState {
  const place = placeSceneById(event.id)!;
  const chosen = (active.chosen ?? []).map((item) => sceneOption(place, item.optionId)).filter((option) => !!option);
  const later = chosen.some((option) => option!.later);
  const seenEncounterIds = state.seenEncounterIds.includes(event.id) ? state.seenEncounterIds : [...state.seenEncounterIds, event.id];
  let next: GameState = { ...state, revision: state.revision + 1, activeEncounter: null, seenEncounterIds };
  if (!later) {
    next = applyDoneEffects({ ...next, completedEncounterIds: next.completedEncounterIds.includes(event.id) ? next.completedEncounterIds : [...next.completedEncounterIds, event.id] },
      place.id, place.done, next.revision);
  }
  return changesRelationship(later ? {} : place.done, chosen as never) ? evaluateProgression(next) : next;
}

export function finishEncounter(state: GameState, expectedRevision: number): GameState {
  return backToObservation(finishEncounterScene(state, expectedRevision));
}

/** An encounter met from the observation returns to it as it closes (its next one, if any, starts in continueTourismEncounters). */
function backToObservation(state: GameState): GameState {
  const occasion = state.occasion;
  if (!occasion?.landmarkId || occasion.at !== "main:observe" || occasion.then || state.activeEncounter || state.activeTourism) return state;
  return beginLandmarkObservation(state, occasion.landmarkId);
}

function finishEncounterScene(state: GameState, expectedRevision: number): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active || !active.frame.ended) return state;
  if (placeSceneById(active.encounterId) && active.phase === "story") {
    const placeEvent = getActiveEncounterDefinition(active);
    return placeEvent.cityId === state.currentCityId ? finishPlaceScene(state, active, placeEvent) : state;
  }
  if (!active.selectedOptionId || (active.phase !== "outcome" && active.phase !== "story")) return state;
  const event = getActiveEncounterDefinition(active);
  if (event.cityId !== state.currentCityId || !itemBelongsToEncounter(event, event.completionItemId)) return state;
  if (event.quiz && active.phase !== "outcome" && !encounterStoryCanFinish(state)) return state;
  const option = event.options.find((item) => item.id === active.selectedOptionId)!;
  const first = !state.completedEncounterIds.includes(event.id) && !option.deferCompletion;
  // Seen with any choice, 「また今度」 included; completion stays a separate record.
  const seenEncounterIds = state.seenEncounterIds.includes(event.id) ? state.seenEncounterIds : [...state.seenEncounterIds, event.id];
  let next: GameState = { ...state, revision: state.revision + 1, activeEncounter: null, seenEncounterIds };
  if (first) {
    if (event.completionItemId && next.inventory[event.completionItemId]) throw new Error("品物の記録が一致しません。");
    const total = next.travelBudget + (event.completionMoney ?? 0);
    if (!Number.isSafeInteger(total)) throw new Error("旅行予算の上限を超えました。");
    next = { ...next, travelBudget: total, completedEncounterIds: [...next.completedEncounterIds, event.id],
      inventory: event.completionItemId ? { ...next.inventory, [event.completionItemId]: "held" } : next.inventory };
    if (event.alternativeApRewardId) next = earnRewards(next, [event.alternativeApRewardId]).state;
  }
  // A gift changes relationship values, but remains distinct from a completed
  // date. Apply the existing thresholds only after its scene finishes.
  const tags = catalogTagOption(event, option);
  return active.romanceResolution || tags?.rel ? evaluateProgression(next) : next;
}

/**
 * itemUses names, for exactly the gifted and used items, the option that gave
 * the item away (giftItemId) or used it (consumeItemId), in an encounter that
 * was completed or is running with that option chosen.
 */
function validateItemUses(state: GameState): void {
  const spent = Object.entries(state.inventory).filter(([, status]) => status === "gifted" || status === "used");
  const consistent = Object.keys(state.itemUses).length === spent.length && spent.every(([id, status]) => {
    const use = state.itemUses[id];
    // A tagged scene (a place file's, or a main part's): the option's # give:/# use:, or its # on_done: use (no option).
    const tagged = use && sceneById(use.encounterId);
    if (use && tagged && tagged.origin !== "catalog") {
      if (use.optionId === undefined) return status === "used" && !!tagged.done.use?.includes(id);
      const option = sceneOption(tagged, use.optionId);
      const running = state.activeEncounter?.encounterId === tagged.id && !!state.activeEncounter.chosen?.some((item) => item.optionId === option?.id);
      // A battle's conversation choice (stage 5; a place file's battle knot or a one-scene battle file): applied by its run
      // (still going), or on its first play (its result recorded). Only that, whatever file the battle is written in.
      const battleId = tagged.kind === "battle" && tagged.main && "battle" in tagged.main ? tagged.main.battle : undefined;
      const byBattle = !!battleId && (state.battleRecords.some((record) => record.battleId === battleId) ||
        (state.activeBattle?.battleId === battleId && !!option && state.activeBattle.appliedOptionIds.includes(option.id)));
      return !!option && (status === "gifted" ? option.give?.item : option.use) === id && (battleId ? byBattle :
        !placeSceneById(tagged.id) || tagged.kind === "date" || tagged.kind === "guide" || state.completedEncounterIds.includes(tagged.id) ||
          state.seenEncounterIds.includes(tagged.id) || running);
    }
    if (!use?.optionId) return false;
    const event = use && findEncounter(use.encounterId);
    const option = event?.options.find((item) => item.id === use.optionId);
    return !!event && !!option && (status === "gifted" ? option.giftItemId : option.consumeItemId) === id &&
      optionItemsBelongToEncounter(state, event, option) &&
      (state.completedEncounterIds.includes(event.id) ||
        (state.activeEncounter?.encounterId === event.id && state.activeEncounter.selectedOptionId === option.id));
  });
  if (!consistent) throw new Error("品物を渡した・使った記録が一致しません。");
}

/**
 * An encounter in progress belongs to the running occasion (stage 3b): started in it, at its
 * landmark's visit, and either its current step or (an `after observe` one) met from its observation.
 */
function validateEncounterMoment(state: GameState, active: ActiveEncounter, event: EncounterDefinition): void {
  const occasion = state.occasion;
  const fail = () => { throw new Error("道中交流の時点の記録が一致しません。"); };
  if (!occasion || !occasion.started.includes(event.id)) return fail();
  // Met from a visit's observation (it returns there).
  if (occasion.at === "main:observe" && slotOf(event) === "observe")
    return occasion.landmarkId && encounterRunsAt(event.id, occasion.landmarkId) ? undefined : fail();
  // A step of the occasion's sequence (a visit's, or a stage-4 moment's: its trip, ticket counter, date, finale, hotel, …), after its part when it follows one.
  const step = occasionSteps(occasion).find((item) => "scene" in item && item.scene === event.id);
  if (occasion.at !== event.id || !step || ("after" in step && step.after && !occasion.ran.includes(step.after))) fail();
  void active;
}

/** Reject changed scripts, invalid snapshots, impossible item/reward combinations and stale quiz state. */
export function validateEncounterState(state: GameState): void {
  const fail = (): never => { throw new Error("道中交流の保存状態が一致しません。"); };
  // Seen encounters belong to this city or to a city the journey has completed; every completed one was seen.
  if (state.seenEncounterIds.some((id) => {
    const event = findEncounter(id);
    return !event || (event.cityId !== state.currentCityId && !state.completedCityIds.includes(event.cityId));
  }) || state.completedEncounterIds.some((id) => !state.seenEncounterIds.includes(id)))
    throw new Error("道中交流を見た記録が一致しません。");
  validateItemUses(state);
  for (const id of state.completedEncounterIds) {
    const event = findEncounter(id);
    if (!event || !itemBelongsToEncounter(event, event.completionItemId) || (event.completionItemId && !state.inventory[event.completionItemId])) fail();
  }
  for (const [id, status] of Object.entries(state.inventory)) {
    const definition = encounters.items.find((item) => item.id === id);
    // Held: an item of this city, or one carried through the journey from a city it has done; a carried item is never left behind.
    if (!definition || (status === "held" && !itemUsableIn(state, id, state.currentCityId)) ||
        (status === "left_behind" && (definition.carry === "journey" || definition.cityId === state.currentCityId || !state.completedCityIds.includes(definition.cityId)))) fail();
    const prizeEvent = encounters.encounters.find((item) => item.quiz?.rewardItemId === id);
    const completionEvent = encounters.encounters.find((item) => item.completionItemId === id);
    if (prizeEvent && (!itemBelongsToEncounter(prizeEvent, id) || !state.encounterRewards[prizeEvent.id]?.won)) fail();
    if (completionEvent && (!itemBelongsToEncounter(completionEvent, id) || !state.completedEncounterIds.includes(completionEvent.id))) fail();
  }
  for (const [id, record] of Object.entries(state.encounterRewards)) {
    const event = encounters.encounters.find((item) => item.id === id && !!item.quiz);
    const quiz = event?.quiz;
    if (!event || !quiz || !itemBelongsToEncounter(event, quiz.rewardItemId) || record.won !== (record.roll < record.chancePercent * 100) || (record.won && !state.inventory[quiz.rewardItemId])) fail();
  }
  const active = state.activeEncounter;
  if (!active) return;
  const event = getActiveEncounterDefinition(active);
  if (event.cityId !== state.currentCityId) fail();
  if (state.activeDate || state.activeTourism || state.activeEpilogue || state.activeBattle) fail();
  validateEncounterMoment(state, active, event);
  if (active.storyHash !== storyFingerprint(activeStoryId(active, active.storyId))) fail();
  const validStories = [event!.storyId, ...(event!.quiz ? [event!.quiz.wonStoryId, event!.quiz.lostStoryId, event!.quiz.alreadyStoryId] : [])];
  if (!validStories.includes(active.storyId)) fail();
  const place = placeSceneById(event.id);
  if (place) {
    // A place file's scene: its choices so far are its own options (or free choices), it has no quiz; Ink's turn is their count.
    if (active.phase !== "story" || active.quizAnswerId !== null || active.romanceResolution || !active.chosen ||
        active.chosen.some((item) => !item.optionId.startsWith("_") && !sceneOption(place, item.optionId)) ||
        (active.selectedOptionId !== null && !sceneOption(place, active.selectedOptionId))) fail();
    validateStorySnapshot(activeStoryId(active, active.storyId), active.storyState, active.frame,
      { playerName: state.playerName, heroineName: state.heroineName, choiceCount: active.chosen!.length }, state.memories, state.inventory);
    return;
  }
  const option = event!.options.find((item) => item.id === active.selectedOptionId);
  if (active.selectedOptionId && !option) fail();
  if (option && !optionItemsBelongToEncounter(state, event!, option)) fail();
  if (option?.giftItemId && state.inventory[option.giftItemId] !== "gifted") fail();
  if (option?.consumeItemId && state.inventory[option.consumeItemId] !== "used") fail();
  for (const itemId of [option?.giftItemId, option?.consumeItemId])
    if (itemId && (state.itemUses[itemId]?.encounterId !== event.id || state.itemUses[itemId]?.optionId !== option!.id))
      throw new Error("品物を渡した・使った記録が一致しません。");
  const resolution = active.romanceResolution;
  if (!!option?.responseProfileId !== !!resolution) fail();
  if (resolution) {
    const profile = active.responseProfiles.find((item) => item.id === resolution.profileId);
    if (!profile || option?.responseProfileId !== resolution.profileId) fail();
    const expected = resolveRomanceChoice(profile!, resolution.before, active.romanceRoll);
    const small = (n: number) => Math.max(-1, Math.min(1, n));
    const tagRel = (option && catalogTagOption(event, option)?.rel) ?? {};
    if (resolution.result !== expected.result || (["affection", "trust", "spark"] as const).some((key) =>
      resolution.deltas[key] !== small(expected.deltas[key]) || state[key] !== resolution.before[key] + resolution.deltas[key] + (tagRel[key] ?? 0))) fail();
  }
  if (active.phase !== "story" && (!event!.quiz || !active.selectedOptionId)) fail();
  if ((active.phase === "quiz" || active.phase === "feedback") && (active.storyId !== event!.storyId || !active.frame.ended)) fail();
  if ((active.phase === "story" || active.phase === "quiz") && active.quizAnswerId !== null) fail();
  if ((active.phase === "feedback" || active.phase === "outcome") && active.quizAnswerId === null) fail();
  if (active.phase === "outcome" && active.storyId === event!.storyId) fail();
  if (active.phase === "story" && active.storyId !== event!.storyId) fail();
  const quiz = event!.quiz;
  const record = state.encounterRewards[event!.id];
  if ((active.rewardChancePercent === null) !== !quiz) fail();
  if (new Set(active.responseProfiles.map((profile) => profile.id)).size !== active.responseProfiles.length ||
    active.responseProfiles.some((profile) => !event!.options.some((item) => item.responseProfileId === profile.id)) ||
    event!.options.some((item) => item.responseProfileId && !active.responseProfiles.some((profile) => profile.id === item.responseProfileId))) fail();
  if (active.rewardAlreadyDrawn && (!quiz || !record)) fail();
  if (quiz && !active.rewardAlreadyDrawn && record && (active.quizAnswerId !== quiz.question.correctOptionId || record.roll !== active.rewardRoll || record.chancePercent !== active.rewardChancePercent)) fail();
  if (quiz && active.quizAnswerId === quiz.question.correctOptionId && !record) fail();
  if (active.phase === "outcome" && quiz) {
    const expectedStory = active.quizAnswerId !== quiz.question.correctOptionId ? quiz.lostStoryId :
      active.rewardAlreadyDrawn ? quiz.alreadyStoryId : record?.won ? quiz.wonStoryId : quiz.lostStoryId;
    if (active.storyId !== expectedStory) fail();
  }
  validateStorySnapshot(activeStoryId(active, active.storyId), active.storyState, active.frame, { playerName: state.playerName, heroineName: state.heroineName, choiceCount: active.storyId === event!.storyId && option ? 1 : 0,
    ...(resolution ? { variables: { romance_result: resolution.result } } : {}) }, state.memories, state.inventory);
}
