import { encounters } from "../content/encounters";
import { previousMilanoEncounters } from "../content/milano-3f32b60";
import { legacyEncounters, legacyStoryId } from "../content/legacy-milano";
import previousEncounterData from "../../content/legacy/encounters_before_story_refactor.json";
import preGalleriaEncounterData from "../../content/legacy/encounters_before_galleria_integration.json";
import preSoundFortuneData from "../../content/legacy/encounters_before_sound_fortune.json";
import { responseProfileSchema } from "../content/schemas";
import { city, responseProfiles } from "../content";
import { encounterCatalogSchema, type EncounterDefinition } from "../content/encounter-schemas";
import { beginStory, continueStory, selectStoryChoice, storyFingerprint, validateStorySnapshot, type StoryFrame, type StoryStep } from "../story/runtime";
import { secureRomanceRoll } from "../random/romance-source";
import { canAccessFreeTime } from "./chapter";
import { evaluateProgression, getPlayerAddress, type Availability, type GameState } from "./game";
import { earnRewards } from "./rewards";
import { createRomanceRollPlan, resolveRomanceChoice } from "./romance-random";
import { deriveRelationshipTone } from "./romance-tone";
import { scoreQuizAnswer } from "./quiz-answer";
import type { ActiveEncounter } from "./encounter-state";
import placeRuleData from "../../content/encounters/entry-rules.json";
import { encounterEntryRulesSchema } from "../content/encounter-entry-rules";

const findEncounter = (id: string) => encounters.encounters.find((item) => item.id === id);
const previousEncounters = encounterCatalogSchema.parse(previousEncounterData).encounters;
const preGalleriaEncounters = encounterCatalogSchema.parse(preGalleriaEncounterData).encounters;
const preSoundFortuneEncounters = encounterCatalogSchema.parse(preSoundFortuneData).encounters;
const placeRules = encounterEntryRulesSchema.parse(placeRuleData);
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

function encounterFingerprint(event: EncounterDefinition, archived = false): string {
  const ids = [event.storyId, ...(event.quiz ? [event.quiz.wonStoryId, event.quiz.lostStoryId, event.quiz.alreadyStoryId] : [])];
  // Odds have their own stored snapshot; rebalancing must not invalidate an active event.
  const fingerprintData = event.quiz ? { ...event, quiz: { ...event.quiz, chancePercent: 0 } } : event;
  const text = JSON.stringify(fingerprintData) + ids.map((id) => storyFingerprint(archived ? legacyStoryId(id) : id)).join(":");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}

export function getActiveEncounterDefinition(active: ActiveEncounter): EncounterDefinition {
  const current = findEncounter(active.encounterId);
  try { if (current && encounterFingerprint(current) === active.contentHash) return current; }
  catch { /* A rewritten current story can be absent while old snapshots remain available. */ }
  const preSound = preSoundFortuneEncounters.find((event) => event.id === active.encounterId);
  try { if (preSound && encounterFingerprint(preSound) === active.contentHash) return preSound; }
  catch { /* An older script is resolved against the archived publications below. */ }
  const preGalleria = preGalleriaEncounters.find((event) => event.id === active.encounterId);
  try { if (preGalleria && encounterFingerprint(preGalleria) === active.contentHash) return preGalleria; }
  catch { /* An older script is resolved against the archived publication below. */ }
  const soundBase = previousMilanoEncounters.find((event) => event.id === active.encounterId);
  try { if (soundBase && encounterFingerprint(soundBase) === active.contentHash) return soundBase; }
  catch { /* An older script is resolved against the archived publication below. */ }
  const previous = previousEncounters.find((event) => event.id === active.encounterId);
  try { if (previous && encounterFingerprint(previous) === active.contentHash) return previous; }
  catch { /* An older script is resolved against the archived publication below. */ }
  const old = legacyEncounters.encounters.find((event) => event.id === active.encounterId);
  if (old && encounterFingerprint(old, true) === active.contentHash) return old;
  throw new Error("道中交流の保存状態が一致しません。");
}

function activeStoryId(active: ActiveEncounter, id: string): string {
  const event = findEncounter(active.encounterId);
  try { if (event && encounterFingerprint(event) === active.contentHash) return id; }
  catch { /* Resolve against the immutable publication below. */ }
  const preSound = preSoundFortuneEncounters.find((item) => item.id === active.encounterId);
  try { if (preSound && encounterFingerprint(preSound) === active.contentHash) return id; }
  catch { /* Resolve against the immutable publications below. */ }
  const preGalleria = preGalleriaEncounters.find((item) => item.id === active.encounterId);
  try { if (preGalleria && encounterFingerprint(preGalleria) === active.contentHash) return id; }
  catch { /* Resolve against the immutable publication below. */ }
  const soundBase = previousMilanoEncounters.find((item) => item.id === active.encounterId);
  try { if (soundBase && encounterFingerprint(soundBase) === active.contentHash) return id; }
  catch { /* Resolve against the immutable publication below. */ }
  const previous = previousEncounters.find((item) => item.id === active.encounterId);
  try { if (previous && encounterFingerprint(previous) === active.contentHash) return id; }
  catch { /* Resolve against the immutable publication below. */ }
  return legacyStoryId(id);
}

export function getEncounterAvailability(state: GameState, id: string): Availability {
  const event = findEncounter(id);
  if (!event) return unavailable("寄り道が見つかりません。");
  const revisitableFortune = event.id === "galleria_fortune" && event.availability === "tourism" && hasGalleriaBattle(state);
  if (event.availability === "dormant" || (event.availability === "tourism" && !revisitableFortune))
    return unavailable("この寄り道は自由時間からは選べません。");
  if (event.cityId !== city.id) return unavailable("この街では出かけられません。");
  const rule = placeRules.entries.find((entry) => entry.encounterId === id && (!entry.storyId || entry.storyId === event.storyId));
  if (rule?.completedEpisodeId && !state.completedEpisodeIds.includes(rule.completedEpisodeId))
    return unavailable("この場所を訪れたあとに出会えます。");
  if (rule?.completedStoryBattleId && !state.battleRecords.some((record) => record.battleId === rule.completedStoryBattleId && record.attempts > 0))
    return unavailable("この場所を訪れたあとに出会えます。");
  if (!canAccessFreeTime(state)) return unavailable("旅を進めると出かけられます。");
  if (state.activeEncounter || state.activeDate || state.activeTourism || state.activeEpilogue || state.activeBattle)
    return unavailable("途中の場面を終えてから出かけられます。");
  if (!event.repeatable && state.completedEncounterIds.includes(id)) return unavailable("この寄り道は終えています。");
  const actionable = event.options.filter((option) => !option.deferCompletion);
  if (actionable.length && actionable.every((option) => !optionItemsBelongToEncounter(event, option) || (option.requiresItemId && state.inventory[option.requiresItemId] !== "held")))
    return unavailable("必要な品物を持っていません。");
  return available;
}

/** Keep the optional cultural quiz after the main battle, so it cannot reveal its answer first. */
function hasGalleriaBattle(state: GameState): boolean {
  return state.battleRecords.some((record) => record.battleId === "milano_galleria_01" && record.attempts > 0);
}

/** The new fortune's leave branch, or its pre-battle visit, ends without a quiz. */
export function encounterStoryCanFinish(state: GameState): boolean {
  const active = state.activeEncounter;
  if (!active || active.phase !== "story" || !active.frame.ended || !active.selectedOptionId) return false;
  const event = getActiveEncounterDefinition(active);
  if (!event.quiz) return true;
  if (event.storyId !== "encounters/sound_galleria_fortune") return false;
  const option = event.options.find((item) => item.id === active.selectedOptionId);
  return !!option?.deferCompletion || !hasGalleriaBattle(state);
}

export function getEncounterOptionAvailability(state: GameState, index: number): Availability {
  const active = state.activeEncounter;
  const event = active && getActiveEncounterDefinition(active);
  const choice = active?.frame.choices.find((item) => item.index === index);
  const option = event && choice ? encounterChoiceOption(event, choice) : undefined;
  if (!active || active.phase !== "story" || active.selectedOptionId !== null || !option || !active.frame.choices.some((choice) => choice.index === index)) return unavailable("この選択肢は使えません。");
  if (!event || event.cityId !== city.id || !optionItemsBelongToEncounter(event, option)) return unavailable("この街では使えない品物です。");
  if (state.travelBudget < option.costEuro) return unavailable("旅行予算が足りません。");
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
  const step = checkedStep(beginStory(event.storyId, state.playerName, state.heroineName, variables(state), state.memories, state.inventory));
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

export function startEncounter(state: GameState, id: string, nextRoll: () => number = secureRomanceRoll): GameState {
  if (!getEncounterAvailability(state, id).available) return state;
  return beginEncounter(state, findEncounter(id)!, nextRoll);
}

/** A single optional encounter can be entered from its own observation screen. */
export function getTourismEncounterAvailability(state: GameState, id: string): Availability {
  const event = findEncounter(id);
  const active = state.activeTourism;
  if (!event || event.availability !== "tourism" || event.cityId !== city.id ||
      !active || active.phase !== "exploring" || active.landmarkId !== event.landmarkId ||
      !state.visitedLandmarkIds.includes(active.landmarkId) ||
      state.activeBattle || state.activeDate || state.activeEncounter || state.activeEpilogue ||
      (!event.repeatable && state.completedEncounterIds.includes(id)))
    return unavailable("今は話しかけられません。");
  return available;
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
  return { ...next, activeEncounter: { ...next.activeEncounter!, returnTourism: { landmarkId: tourism.landmarkId, contentHash: tourism.contentHash } } };
}

export function chooseEncounter(state: GameState, index: number, expectedRevision: number): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active || !getEncounterOptionAvailability(state, index).available) return state;
  const event = getActiveEncounterDefinition(active);
  const choice = active.frame.choices.find((item) => item.index === index)!;
  const option = encounterChoiceOption(event, choice)!;
  if (option.textEn !== undefined && choice.text !== option.textEn) throw new Error("交流の選択肢が一致しません。");
  let next = { ...state, travelBudget: state.travelBudget - option.costEuro, inventory: { ...state.inventory } };
  if (option.consumeItemId) next.inventory[option.consumeItemId] = "used";
  if (option.giftItemId) next.inventory[option.giftItemId] = "gifted";
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
  const step = selectStoryChoice(activeStoryId(active, active.storyId), active.storyState, active.frame, index, state.memories, {}, { ...variables(next), romance_result: result }, next.inventory);
  return { ...next, revision: state.revision + 1, activeEncounter: withStep({ ...active, selectedOptionId: option.id, romanceResolution }, step) };
}

/** Progress dialogue, enter the quiz, or show its recorded outcome. */
export function advanceEncounter(state: GameState, expectedRevision: number): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active) return state;
  let event: EncounterDefinition;
  try { event = getActiveEncounterDefinition(active); }
  catch { return state; }
  if (event.cityId !== city.id) return state;
  if (active.phase === "feedback") {
    const quiz = event.quiz!;
    const correct = active.quizAnswerId === quiz.question.correctOptionId;
    const record = state.encounterRewards[event.id];
    const storyId = !correct ? quiz.lostStoryId : active.rewardAlreadyDrawn ? quiz.alreadyStoryId : record?.won ? quiz.wonStoryId : quiz.lostStoryId;
    const resolvedStoryId = activeStoryId(active, storyId);
    const step = checkedStep(beginStory(resolvedStoryId, state.playerName, state.heroineName, variables(state), state.memories, state.inventory));
    return { ...state, revision: state.revision + 1, activeEncounter: withStep({ ...active, phase: "outcome", storyId, storyHash: storyFingerprint(resolvedStoryId) }, step) };
  }
  if (active.phase === "quiz" || active.frame.choices.length) return state;
  if (active.frame.ended) {
    if (event.quiz && encounterStoryCanFinish(state)) return finishEncounter(state, expectedRevision);
    if (active.phase === "story" && event.quiz && active.selectedOptionId && !encounterStoryCanFinish(state))
      return { ...state, revision: state.revision + 1, activeEncounter: { ...active, phase: "quiz" } };
    return state;
  }
  return { ...state, revision: state.revision + 1, activeEncounter: withStep(active, continueStory(activeStoryId(active, active.storyId), active.storyState, active.frame, state.memories, variables(state), state.inventory)) };
}

export function answerEncounterQuiz(state: GameState, optionId: string, expectedRevision: number): GameState {
  const active = state.activeEncounter;
  if (state.revision !== expectedRevision || !active || active.phase !== "quiz") return state;
  const event = getActiveEncounterDefinition(active);
  const quiz = event.quiz;
  if (!quiz) return state;
  if (event.cityId !== city.id || !itemBelongsToEncounter(event, quiz.rewardItemId)) return state;
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
  if (event.cityId !== city.id || !itemBelongsToEncounter(event, event.completionItemId)) return state;
  if (event.quiz && active.phase !== "outcome" && !encounterStoryCanFinish(state)) return state;
  const option = event.options.find((item) => item.id === active.selectedOptionId)!;
  const first = !state.completedEncounterIds.includes(event.id) && !option.deferCompletion;
  let next: GameState = { ...state, revision: state.revision + 1, activeEncounter: null };
  if (first) {
    if (event.completionItemId && next.inventory[event.completionItemId]) throw new Error("品物の記録が一致しません。");
    const total = next.travelBudget + (event.completionMoneyEuro ?? 0);
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

/** Reject changed scripts, invalid snapshots, impossible item/reward combinations and stale quiz state. */
export function validateEncounterState(state: GameState): void {
  const fail = (): never => { throw new Error("道中交流の保存状態が一致しません。"); };
  // Completed historical lotteries and their prizes remain valid even when
  // the current event no longer offers that lottery.
  const historicalEncounters = [...encounters.encounters, ...preSoundFortuneEncounters, ...preGalleriaEncounters, ...previousMilanoEncounters, ...previousEncounters, ...legacyEncounters.encounters];
  for (const id of state.completedEncounterIds) {
    const event = findEncounter(id);
    if (!event || !itemBelongsToEncounter(event, event.completionItemId) || (event.completionItemId && !state.inventory[event.completionItemId])) fail();
  }
  for (const [id, status] of Object.entries(state.inventory)) {
    if (!encounters.items.some((item) => item.id === id)) fail();
    const prizeEvent = historicalEncounters.find((item) => item.quiz?.rewardItemId === id);
    const completionEvent = encounters.encounters.find((item) => item.completionItemId === id);
    if (prizeEvent && (!itemBelongsToEncounter(prizeEvent, id) || !state.encounterRewards[prizeEvent.id]?.won)) fail();
    if (completionEvent && (!itemBelongsToEncounter(completionEvent, id) || !state.completedEncounterIds.includes(completionEvent.id))) fail();
    if (status !== "held") {
      const matching = encounters.encounters.some((item) => item.options.some((option) =>
        (status === "gifted" ? option.giftItemId === id : option.consumeItemId === id) && optionItemsBelongToEncounter(item, option) &&
        (state.completedEncounterIds.includes(item.id) ||
          (state.activeEncounter?.encounterId === item.id && state.activeEncounter.selectedOptionId === option.id))));
      if (!matching) fail();
    }
  }
  for (const [id, record] of Object.entries(state.encounterRewards)) {
    const event = historicalEncounters.find((item) => item.id === id && !!item.quiz);
    const quiz = event?.quiz;
    if (!event || !quiz || !itemBelongsToEncounter(event, quiz.rewardItemId) || record.won !== (record.roll < record.chancePercent * 100) || (record.won && !state.inventory[quiz.rewardItemId])) fail();
  }
  const active = state.activeEncounter;
  if (!active) return;
  const event = getActiveEncounterDefinition(active);
  if (event.cityId !== city.id) fail();
  if (state.activeDate || state.activeTourism || state.activeEpilogue || state.activeBattle) fail();
  if (active.returnTourism && (event.availability !== "tourism" || active.returnTourism.landmarkId !== event.landmarkId ||
      !state.visitedLandmarkIds.includes(active.returnTourism.landmarkId))) fail();
  if (active.storyHash !== storyFingerprint(activeStoryId(active, active.storyId))) fail();
  const validStories = [event!.storyId, ...(event!.quiz ? [event!.quiz.wonStoryId, event!.quiz.lostStoryId, event!.quiz.alreadyStoryId] : [])];
  if (!validStories.includes(active.storyId)) fail();
  const option = event!.options.find((item) => item.id === active.selectedOptionId);
  if (active.selectedOptionId && !option) fail();
  if (option && !optionItemsBelongToEncounter(event!, option)) fail();
  if (option?.giftItemId && state.inventory[option.giftItemId] !== "gifted") fail();
  if (option?.consumeItemId && state.inventory[option.consumeItemId] !== "used") fail();
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
