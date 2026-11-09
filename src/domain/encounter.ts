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
import { validObservationEncounterIds, type ActiveEncounter } from "./encounter-state";
import placeRuleData from "../content/generated/content/encounters/entry-rules.json";
import { encounterEntryRulesSchema } from "../content/encounter-entry-rules";
import { startTourismBattle } from "./tourism";
import { battlePlayed, meets } from "./conditions";
import { nextInOrder, visitOrder, visitSlot, type MomentEntry, type VisitSlot } from "./encounter-moments";
import { startTravelEventScene } from "./travel-game";
import { battles, episodes } from "../content";
import { getTransportMode, WALK_MODE_ID } from "../content/transport";

const findEncounter = (id: string) => encounters.encounters.find((item) => item.id === id);
const placeRules = encounterEntryRulesSchema.parse(placeRuleData);
/** An encounter's entry rule (its moment, `when` and quiz timing), if it has one. */
export const encounterEntryRule = (encounterId: string) => placeRules.entries.find((entry) => entry.encounterId === encounterId);
const entryRule = (event: EncounterDefinition) => encounterEntryRule(event.id);
/** Every encounter's place at its landmark's visit, for the order of each slot (encounter-moments.ts; read each time: test cities add encounters). */
const momentEntries = (): MomentEntry[] => encounters.encounters.map((event) => ({
  encounterId: event.id, landmarkId: event.landmarkId, storyId: event.storyId, priority: entryRule(event)?.priority,
}));
const slotOf = (event: EncounterDefinition): VisitSlot => visitSlot(entryRule(event)?.priority);
/** The encounters of a slot of the landmark's visit, in play order. */
export const landmarkVisitOrder = (landmarkId: string, slot: VisitSlot) => visitOrder(momentEntries(), landmarkId, slot);
/** The slot of an encounter's landmark visit it runs in (before the main part, while observing, after it). */
export function encounterVisitSlot(encounterId: string): VisitSlot | undefined {
  const event = findEncounter(encounterId);
  return event && slotOf(event);
}
const unavailable = (reason: string): Availability => ({ available: false, reason });
const available: Availability = { available: true, reason: "" };

/** A tagged choice follows its stable ID; older Ink uses its original order. */
export function encounterChoiceOption(event: EncounterDefinition, choice: StoryFrame["choices"][number]) {
  return choice.optionId === undefined ? event.options[choice.index] : event.options.find((option) => option.id === choice.optionId);
}

/** Item IDs remain globally stable, but may only be used by events in their city. */
function itemBelongsToEncounter(event: EncounterDefinition, itemId: string | undefined): boolean {
  return itemId === undefined || encounters.items.some((item) => item.id === itemId && item.cityId === event.cityId);
}

function optionItemsBelongToEncounter(event: EncounterDefinition, option: EncounterDefinition["options"][number]): boolean {
  return [option.requiresItemId, option.consumeItemId, option.giftItemId].every((itemId) => itemBelongsToEncounter(event, itemId));
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
 * start one from free time.
 */
function getEncounterEntryAvailability(state: GameState, event: EncounterDefinition): Availability {
  if (event.cityId !== state.currentCityId) return unavailable("この街では出かけられません。");
  if (!meets(state, entryRule(event)?.when)) return unavailable("この場所を訪れたあとに出会えます。");
  if (!canAccessFreeTime(state)) return unavailable("旅を進めると出かけられます。");
  if (state.activeEncounter || state.activeDate || state.activeTourism || state.activeEpilogue || state.activeBattle)
    return unavailable("途中の場面を終えてから出かけられます。");
  if (!event.repeatable && state.completedEncounterIds.includes(event.id)) return unavailable("この寄り道は終えています。");
  const actionable = event.options.filter((option) => !option.deferCompletion);
  if (actionable.length && actionable.every((option) => !optionItemsBelongToEncounter(event, option) || (option.requiresItemId && state.inventory[option.requiresItemId] !== "held")))
    return unavailable("必要な品物を持っていません。");
  return available;
}

/** Used before entering a special encounter's battle, while still in free time: an encounter met while observing waits. */
export function hasPendingPlaceEncounter(state: GameState, landmarkId: string): boolean {
  return encounters.encounters.some((event) => event.landmarkId === landmarkId && slotOf(event) === "observe" &&
    getEncounterEntryAvailability(state, event).available);
}

/** Keep the optional cultural quiz after the main battle, so it cannot reveal its answer first. */
function hasLandmarkBattle(state: GameState, event: EncounterDefinition): boolean {
  const battleId = landmarks.find((landmark) => landmark.id === event.landmarkId)?.battleId;
  return !!battleId && battlePlayed(state, battleId);
}

/** A deferred quiz's leave branch, or its pre-battle visit, ends without the quiz. */
function encounterStoryCanFinish(state: GameState): boolean {
  const active = state.activeEncounter;
  if (!active || active.phase !== "story" || !active.frame.ended || !active.selectedOptionId) return false;
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

export function getEncounterOptionAvailability(state: GameState, index: number): Availability {
  const active = state.activeEncounter;
  const event = active && getActiveEncounterDefinition(active);
  const choice = active?.frame.choices.find((item) => item.index === index);
  const option = event && choice ? encounterChoiceOption(event, choice) : undefined;
  if (!active || active.phase !== "story" || active.selectedOptionId !== null || !option || !active.frame.choices.some((choice) => choice.index === index)) return unavailable("この選択肢は使えません。");
  if (!event || event.cityId !== state.currentCityId || !optionItemsBelongToEncounter(event, option)) return unavailable("この街では使えない品物です。");
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
  } };
}

/** A place encounter uses the same unlock and item rules as its existing definition. */
export function getTourismEncounterAvailability(state: GameState, id: string): Availability {
  const event = findEncounter(id);
  const active = state.activeTourism;
  if (!event || event.cityId !== state.currentCityId || slotOf(event) !== "observe" ||
      !active || active.phase !== "exploring" || active.landmarkId !== event.landmarkId ||
      !state.visitedLandmarkIds.includes(active.landmarkId) ||
      state.activeBattle || state.activeDate || state.activeEncounter || state.activeEpilogue ||
      active.encounterIds?.includes(id) ||
      (!event.repeatable && state.completedEncounterIds.includes(id)))
    return unavailable("今は話しかけられません。");
  // An encounter whose quiz waits for the landmark's battle is met during the
  // first observation, before its milestone; its story then ends without the quiz.
  if (entryRule(event)?.quizAfterLandmarkBattle) return available;
  return getEncounterEntryAvailability({ ...state, activeTourism: null }, event);
}

export function startTourismEncounter(
  state: GameState,
  id: string,
  expectedRevision: number,
  nextRoll: () => number = secureRomanceRoll,
): GameState {
  if (state.revision !== expectedRevision || !getTourismEncounterAvailability(state, id).available) return state;
  const tourism = state.activeTourism!;
  const next = beginEncounter({ ...state, activeTourism: null }, findEncounter(id)!, nextRoll);
  return { ...next, activeEncounter: { ...next.activeEncounter!, returnTourism: { landmarkId: tourism.landmarkId, contentHash: tourism.contentHash, encounterIds: [...(tourism.encounterIds ?? []), id] } } };
}

/** Start each eligible encounter once per observation visit, then continue normally. */
export function nextTourismEncounter(state: GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  const active = state.activeTourism;
  if (!active || active.phase !== "exploring") return state;
  const id = landmarkVisitOrder(active.landmarkId, "observe").find((item) => getTourismEncounterAvailability(state, item).available);
  return id ? startTourismEncounter(state, id, state.revision, nextRoll) : state;
}

/** Where an encounter met before or after a landmark's main part goes on from (its saved moment). */
type VisitMoment = Pick<ActiveEncounter, "trip"> | Pick<ActiveEncounter, "afterBattle">;

/** An encounter before or after the main part can run now (the same entry rules as everywhere, with no scene open). */
function momentEncounterEligible(state: GameState, id: string): boolean {
  const event = findEncounter(id);
  return !!event && getEncounterEntryAvailability(state, event).available;
}

/** Begin a moment's encounter, its continuation saved with it. */
function startMomentEncounter(state: GameState, id: string, moment: VisitMoment, nextRoll: () => number): GameState {
  const next = beginEncounter(state, findEncounter(id)!, nextRoll);
  return { ...next, activeEncounter: { ...next.activeEncounter!, ...moment } };
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

/** The landmark whose visit a battle ends: a sightseeing episode's battle or a special battle at a landmark. */
function battleVisitLandmark(battleId: string): string | undefined {
  const episode = episodes.find((item) => item.battleId === battleId);
  if (episode) return episode.kind === "city_finale" ? undefined : episode.landmarkId ?? undefined;
  return battles.find((battle) => battle.id === battleId)?.landmarkId ?? undefined;
}

/**
 * On departing from the map to a landmark (beginTravelEvent, after the fare and time were
 * settled), the first encounter before its main part (a negative priority), if one can run;
 * the state unchanged otherwise. The trip's event and mode are its continuation: after the
 * last of these encounters the main part opens as the departure would have opened it.
 */
export function startBeforeVisitEncounter(state: GameState, eventId: string, modeId: string, nextRoll: () => number = secureRomanceRoll): GameState {
  const landmarkId = visitedLandmarkOfEvent(eventId);
  const id = landmarkId && nextInOrder(landmarkVisitOrder(landmarkId, "before"), undefined, (item) => momentEncounterEligible(state, item));
  return id ? startMomentEncounter(state, id, { trip: { eventId, modeId } }, nextRoll) : state;
}

/**
 * On leaving a landmark battle's result to free time (leaveBattleResult), the first encounter
 * after the landmark's main part (a positive priority), if one can run; the state unchanged otherwise.
 */
export function startAfterVisitEncounter(state: GameState, battleId: string, nextRoll: () => number = secureRomanceRoll): GameState {
  const landmarkId = battleVisitLandmark(battleId);
  const id = landmarkId && nextInOrder(landmarkVisitOrder(landmarkId, "after"), undefined, (item) => momentEncounterEligible(state, item));
  return id ? startMomentEncounter(state, id, { afterBattle: { battleId, encounterIds: [id] } }, nextRoll) : state;
}

/**
 * The battle result screen's 「自由時間へ戻る／進む」: leave the result (leaveBattleResult), then the
 * encounters after the landmark's main part (a positive priority) start, if one can run.
 */
export function leaveBattleToFreeTime(state: GameState, expectedRevision: number, nextRoll: () => number = secureRomanceRoll): GameState {
  const left = leaveBattleResult(state, expectedRevision);
  return left === state ? state : startAfterVisitEncounter(left, state.activeBattle!.battleId, nextRoll);
}

/** The finished encounter's moment goes on: the next encounter of its slot, else (on a trip) the visit's main part. */
function continueVisitMoment(active: ActiveEncounter, next: GameState, nextRoll: () => number): GameState {
  const event = findEncounter(active.encounterId)!;
  const slot = active.trip ? "before" : "after";
  const id = nextInOrder(landmarkVisitOrder(event.landmarkId, slot), active.encounterId, (item) => momentEncounterEligible(next, item));
  if (active.trip)
    return id ? startMomentEncounter(next, id, { trip: active.trip }, nextRoll) : startTravelEventScene(next, active.trip.eventId, nextRoll);
  const chain = active.afterBattle!;
  return id ? startMomentEncounter(next, id, { afterBattle: { battleId: chain.battleId, encounterIds: [...chain.encounterIds, id] } }, nextRoll) : next;
}

/** Whether finishing the open encounter leads on to more of its moment (another encounter or the visit's main part), not to free time. */
export function encounterLeadsOnward(state: GameState): boolean {
  const active = state.activeEncounter;
  if (!active) return false;
  if (active.trip || active.returnTourism) return true;
  if (!active.afterBattle) return false;
  const event = findEncounter(active.encounterId);
  return !!event && nextInOrder(landmarkVisitOrder(event.landmarkId, "after"), active.encounterId,
    (item) => item !== active.encounterId && momentEncounterEligible({ ...state, activeEncounter: null }, item)) !== undefined;
}

export function proceedFromTourism(state: GameState, expectedRevision: number, nextRoll: () => number = secureRomanceRoll): GameState {
  if (state.revision !== expectedRevision) return state;
  const next = nextTourismEncounter(state, nextRoll);
  return next !== state ? next : startTourismBattle(state, expectedRevision);
}

/**
 * After an encounter finishes, its moment goes on: while observing, newly eligible encounters at
 * the same landmark run too; before the main part, the next such encounter or else the main part
 * opens; after it, the next encounter after the battle.
 */
export function continueTourismEncounters(previous: GameState, next: GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  const active = previous.activeEncounter;
  if (!active || next.activeEncounter || next === previous) return next;
  if (active.returnTourism) return next.activeTourism ? nextTourismEncounter(next, nextRoll) : next;
  return active.trip || active.afterBattle ? continueVisitMoment(active, next, nextRoll) : next;
}

export function chooseEncounter(state: GameState, index: number, expectedRevision: number): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active || !getEncounterOptionAvailability(state, index).available) return state;
  const event = getActiveEncounterDefinition(active);
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
  const step = selectStoryChoice(activeStoryId(active, active.storyId), active.storyState, active.frame, index, state.memories, {}, { ...variables(next), romance_result: result }, next.inventory, sceneConditionReader(next));
  return { ...next, revision: state.revision + 1, activeEncounter: withStep({ ...active, selectedOptionId: option.id, romanceResolution }, step) };
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

export function finishEncounter(state: GameState, expectedRevision: number): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active || !active.frame.ended || !active.selectedOptionId || (active.phase !== "outcome" && active.phase !== "story")) return state;
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
  if (active.returnTourism) {
    if (active.returnTourism.landmarkId !== event.landmarkId || !next.visitedLandmarkIds.includes(event.landmarkId))
      throw new Error("観光への復帰先が一致しません。");
    next = { ...next, activeTourism: { ...active.returnTourism, phase: "exploring", storyState: null, frame: null } };
  }
  // A gift changes relationship values, but remains distinct from a completed
  // date. Apply the existing thresholds only after its scene finishes.
  return active.romanceResolution ? evaluateProgression(next) : next;
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
    const event = use && findEncounter(use.encounterId);
    const option = event?.options.find((item) => item.id === use.optionId);
    return !!event && !!option && (status === "gifted" ? option.giftItemId : option.consumeItemId) === id &&
      optionItemsBelongToEncounter(event, option) &&
      (state.completedEncounterIds.includes(event.id) ||
        (state.activeEncounter?.encounterId === event.id && state.activeEncounter.selectedOptionId === option.id));
  });
  if (!consistent) throw new Error("品物を渡した・使った記録が一致しません。");
}

/**
 * An encounter in progress continues from exactly one moment of its landmark's visit (the schema
 * allows one at most), and that moment must match the encounter's slot and the rest of the state:
 * - the observation it returns to (returnTourism) for an encounter met while observing;
 * - the map's trip to the landmark (trip: the map event still running, and its mode) for one before the main part;
 * - the landmark battle it follows (afterBattle: a played battle of that landmark, and the encounters of
 *   that chain in their play order, ending with this one) for one after it.
 * No moment at all is the shape of the removed free-time start.
 */
function validateEncounterMoment(state: GameState, active: ActiveEncounter, event: EncounterDefinition): void {
  const fail = (): never => { throw new Error("道中交流の時点の記録が一致しません。"); };
  const slot = slotOf(event);
  if (active.returnTourism) {
    if (slot !== "observe" || active.returnTourism.landmarkId !== event.landmarkId ||
        !validObservationEncounterIds(active.returnTourism.landmarkId, active.returnTourism.encounterIds) ||
        (active.returnTourism.encounterIds && !active.returnTourism.encounterIds.includes(event.id)) ||
        !state.visitedLandmarkIds.includes(active.returnTourism.landmarkId)) fail();
  } else if (active.trip) {
    const trip = state.travel.activeEvent;
    if (slot !== "before" || trip?.eventId !== active.trip.eventId || visitedLandmarkOfEvent(active.trip.eventId) !== event.landmarkId ||
        (active.trip.modeId !== WALK_MODE_ID && !getTransportMode(state.currentCityId, active.trip.modeId))) fail();
  } else if (active.afterBattle) {
    const { battleId, encounterIds } = active.afterBattle;
    const order = landmarkVisitOrder(event.landmarkId, "after");
    const positions = encounterIds.map((id) => order.indexOf(id));
    if (slot !== "after" || state.travel.activeEvent || battleVisitLandmark(battleId) !== event.landmarkId || !battlePlayed(state, battleId) ||
        encounterIds[encounterIds.length - 1] !== event.id ||
        positions.some((position, index) => position < 0 || (index > 0 && position <= positions[index - 1]))) fail();
  } else fail();
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
    if (!definition || (status === "held" && definition.cityId !== state.currentCityId) ||
        (status === "left_behind" && (definition.cityId === state.currentCityId || !state.completedCityIds.includes(definition.cityId)))) fail();
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
  const option = event!.options.find((item) => item.id === active.selectedOptionId);
  if (active.selectedOptionId && !option) fail();
  if (option && !optionItemsBelongToEncounter(event!, option)) fail();
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
    if (resolution.result !== expected.result || (["affection", "trust", "spark"] as const).some((key) =>
      resolution.deltas[key] !== small(expected.deltas[key]) || state[key] !== resolution.before[key] + resolution.deltas[key])) fail();
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
