import { defaultJourneyId, getJourney, type Journey } from "../content/journeys";
import { sceneConditionReader } from "./scene-conditions";
import { createRomanceRollPlan, resolveRomanceChoice } from "./romance-random";
import { deriveRelationshipTone } from "./romance-tone";
import { secureRomanceRoll } from "../random/romance-source";
import { DAY_END } from "./travel";
import { validateEncounterState } from "./encounter";
import { responseProfileSchema } from "../content/schemas";
import { validateEpilogueState } from "./epilogue";
import {
  validateJourneyState,
} from "./chapter";
import {
  settlePendingAp,
  validateRewardState,
} from "./rewards";
import { validateTourismState } from "./tourism";
import {
  validateBattleState,
} from "./battle";
import {
  balance,
  dates,
  effects,
  responseProfiles,
  getCityContent,
  getCityStoryBackground,
} from "../content";
import {
  beginStory,
  continueStory,
  selectStoryChoice,
  storyFingerprint,
  type StoryStep,
} from "../story/runtime";

import { GAME_STATE_VERSION, gameStateSchema, nameSchema, type GameState, type ActiveDate } from "./game-state-schema";
import {
  activeDateStoryId, completedDateCount, evaluateProgression, getPlayerAddress,
  getMemoryCallback, canConfessSuccessfully, confessionResult,
  getDateAvailability, dateBelongsToCity,
} from "./date-rules";

import { validateTravelState, validateGameHistory, validateActiveDateState, validateStoryProgress } from "./game-state-validation";
import { applyChoiceEffects, applyDoneEffects, choiceDisplay, sceneOption, type ChoiceDisplay } from "./scene-effects";
import { fileDateScene, mainScene, taggedDateScene } from "./reservations";
import type { SceneOption } from "../content/scene-schemas";
import { validateOccasionState } from "./occasion";
import { validateTourState } from "./tour";
import { advanceRunningOccasion } from "./occasion-hooks";
import { validateAlbum } from "./album";

export { GAME_STATE_VERSION, gameStateSchema } from "./game-state-schema";
export type { GameState, ActiveDate } from "./game-state-schema";
export {
  completedDateCount, evaluateProgression, getPlayerAddress, getMemoryCallback,
  canConfessSuccessfully, confessionResult,
  activeDateStoryId, isDateUnlockedForTravel, isEventVisible, getDateAvailability,
} from "./date-rules";

export interface Availability {
  available: boolean;
  reason: string;
}

export function createGame(
  playerName = balance.defaultPlayerName,
  heroineName = balance.defaultHeroineName,
  options: { journeyId: string; initialState?: NonNullable<Journey["initialState"]> } = { journeyId: defaultJourneyId },
): GameState {
  const journey = getJourney(options.journeyId);
  if (!journey || journey.status !== "available" || journey.initialBudget === null)
    throw new Error(`Journey is not ready: ${options.journeyId}`);
  const cityId = journey.cities[0].id;
  const { travelSettings } = getCityContent(cityId);
  const initial = options.initialState ?? journey.initialState;
  if (initial && initial.pendingAp !== 0) throw new Error("Pending AP requires a reward record");
  return {
    schemaVersion: GAME_STATE_VERSION,
    currentCityId: cityId,
    travel: { currentPlaceId: travelSettings.hotelPlaceId, hotelPlaceId: travelSettings.hotelPlaceId, day: 1, minute: 540, returnReserve: 0, returnDeadline: DAY_END, activeEvent: null, rentedModeIds: [], rideCounts: {}, temporaryFlags: [], todayPlaceIds: [], todayEpisodeIds: [],
      ...(journey.startWeekday === undefined ? {} : { calendar: { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: journey.startWeekday } }) },
    travelBudget: journey.initialBudget ?? travelSettings.initialBudget,
    inventory: {},
    completedEncounterIds: [],
    seenEncounterIds: [],
    itemUses: {},
    storyProgress: { lines: {}, flags: [] },
    encounterRewards: {},
    activeEncounter: null,
    occasion: null,
    tour: null,
    completedTourIds: [],
    revision: 0,
    playerName: nameSchema.parse(playerName),
    heroineName: nameSchema.parse(heroineName),
    ap: initial?.ap ?? 0,
    affection: initial?.affection ?? 0,
    trust: initial?.trust ?? 0,
    spark: initial?.spark ?? 0,
    lastRejectedDateCount: null,
    recoveryAfterRejection: false,
    completedRecoveryCount: 0,
    romanceStage: initial?.romanceStage ?? 1,
    claimedRewardIds: [],
    playedDateIds: [],
    memories: [],
    album: [],
    activeDate: null,
    unlockedEventIds: [],
    confessionStatus: initial?.confessionStatus ?? "none",
    endingReached: false,
    activeBattle: null,
    battleRecords: [],
    activeTourism: null,
    discoveredClueIds: [],
    visitedLandmarkIds: [],
    completedEpisodeIds: [],
    completedCityIds: [],
    completedGuideIds: [],
    pendingApRewards: [],
    battleRewardReceipt: null,
    activeEpilogue: null,
    viewedEpilogueCityIds: [],
  };
}

export function setNames(
  state: GameState,
  playerName: string,
  heroineName: string,
): GameState {
  if (
    state.activeDate ||
    state.activeBattle ||
    state.activeTourism ||
    state.activeEpilogue ||
    state.activeEncounter
  )
    return state;
  const player = nameSchema.safeParse(playerName),
    heroine = nameSchema.safeParse(heroineName);
  if (
    !player.success ||
    !heroine.success ||
    (state.playerName === player.data && state.heroineName === heroine.data)
  )
    return state;
  return {
    ...state,
    playerName: player.data,
    heroineName: heroine.data,
    revision: state.revision + 1,
  };
}

function applyStep(
  state: GameState,
  active: ActiveDate,
  result: StoryStep,
): GameState {
  let affection = state.affection;
  let trust = state.trust;
  let spark = state.spark;
  let pendingOutcome = active.pendingOutcome;
  const memories = [...state.memories],
    applied = [...active.appliedEffectIds];
  const date = dates.find((item) => item.id === active.dateId)!;
  result.effects.forEach((effectId, index) => {
    const key = `${active.runId}:${active.step}:${index}:${effectId}`;
    if (applied.includes(key)) return;
    const effect = effects.find((item) => item.id === effectId);
    if (!effect) throw new Error("未定義のイベントです。");
    applied.push(key);
    if (effect.outcome) {
      if (date.kind !== "confession")
        throw new Error("告白以外で結果を変更できません。");
      pendingOutcome = effect.outcome === "accepted" && !canConfessSuccessfully(state)
        && activeDateStoryId(date, active) === date.storyId
          ? confessionResult(state) : effect.outcome;
    }
    if (!active.replay && !effect.outcome) {
      const resolved = active.resolutionMode === "random_v1"
        ? active.resolvedChoices[active.choiceCount - 1] : undefined;
      if (active.resolutionMode === "random_v1" && (!resolved || resolved.effectId !== effectId))
        throw new Error("選択結果と会話の効果が一致しません。");
      affection += resolved?.deltas.affection ?? effect.affectionDelta;
      trust += resolved?.deltas.trust ?? effect.trustDelta ?? 0;
      spark += resolved?.deltas.spark ?? effect.sparkDelta ?? 0;
      if (effect.memoryId && !memories.includes(effect.memoryId))
        memories.push(effect.memoryId);
    }
  });
  return {
    ...state,
    affection,
    trust,
    spark,
    memories,
    activeDate: {
      ...active,
      pendingOutcome,
      storyState: result.storyState,
      frame: result.frame,
      appliedEffectIds: applied,
    },
  };
}

/**
 * Start a date. `decided`: its occasion decided it when it opened from the map (4.2, decision 21; the AP was
 * kept back): the scenes before it may have changed items, flags or money, so its map conditions are not read
 * again; only what makes it impossible still refuses (another city, a scene open, played already, the AP).
 */
export function startDate(state: GameState, dateId: string, nextRoll: () => number = secureRomanceRoll, decided = false): GameState {
  const date = dates.find((item) => item.id === dateId);
  if (!date) return state;
  const impossible = !dateBelongsToCity(state, date) || !!(state.activeDate || state.activeBattle || state.activeTourism || state.activeEpilogue || state.activeEncounter) ||
    ((date.kind === "normal" || !date.repeatable) && state.playedDateIds.includes(dateId)) || state.ap < date.apCost;
  if (decided ? impossible : !getDateAvailability(state, dateId).available) return state;
  const placeId = getCityContent(state.currentCityId).travel.events.find((item) => item.id === dateId)?.placeId ?? state.travel.currentPlaceId;
  const result = beginStory(date.storyId, state.playerName, state.heroineName, {
    relationship_tone: deriveRelationshipTone(state),
    relationship_tone_before: deriveRelationshipTone(state),
    relationship_tone_after: deriveRelationshipTone(state),
    player_address: getPlayerAddress(state),
    romance_stage: state.romanceStage,
    memory_callback: getMemoryCallback(state),
    ending_reached: state.endingReached,
    confession_ready: canConfessSuccessfully(state),
    confession_result: confessionResult(state),
  }, state.memories, {}, getCityStoryBackground(state.currentCityId, placeId), sceneConditionReader(state));
  const next = {
    ...state,
    revision: state.revision + 1,
    ap: state.ap - date.apCost,
  };
  return applyStep(
    settlePendingAp(next),
    {
      dateId,
      runId: `${dateId}:${next.revision}`,
      replay: date.rewardOnlyOnce && state.playedDateIds.includes(dateId),
      storyState: result.storyState,
      storyHash: storyFingerprint(date.storyId),
      frame: result.frame,
      choiceCount: 0,
      turnCount: 0,
      step: 1,
      appliedEffectIds: [],
      // A confession written with tags (a place file's knot; DA-1): its outcome is confession_result, fixed now from the
      // relationship state and passed to Ink as the same value (never random; no # effect: sets it).
      pendingOutcome: date.kind === "confession" && taggedDateScene(date.id) ? confessionResult(state) : null,
      resolutionMode: date.kind === "confession" ? "fixed" : "random_v1",
      randomPlan: date.kind === "confession" ? [] : createRomanceRollPlan(date.choiceCount, nextRoll),
      resolvedChoices: [],
      // Freeze the data used by every future choice in this event, so an
      // editorial rebalance cannot change a saved ticket after a reload.
      responseSnapshot: date.kind === "confession" ? null : {
        profiles: responseProfiles.map((profile) => responseProfileSchema.parse(profile)),
        effectProfiles: Object.fromEntries(effects.flatMap((effect) =>
          effect.responseProfileId ? [[effect.id, effect.responseProfileId]] : [])),
      },
    },
    result,
  );
}

export function advanceDate(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeDate;
  if (
    state.revision !== expectedRevision ||
    !active ||
    active.frame.ended ||
    active.frame.choices.length
  )
    return state;
  const date = dates.find((item) => item.id === active.dateId)!;
  return applyStep(
    { ...state, revision: state.revision + 1 },
    { ...active, step: active.step + 1 },
    continueStory(activeDateStoryId(date, active), active.storyState, active.frame, state.memories, {
      relationship_tone: deriveRelationshipTone(state),
      relationship_tone_before: deriveRelationshipTone(active.resolvedChoices.at(-1)?.before ?? state),
      relationship_tone_after: deriveRelationshipTone(state),
    }, undefined, sceneConditionReader(state)),
  );
}

export function chooseDate(
  state: GameState,
  index: number,
  expectedRevision: number,
  /** Internal: a one-scene date's choice tags were applied already (this same action). */
  tagsApplied = false,
): GameState {
  const active = state.activeDate;
  if (
    state.revision !== expectedRevision ||
    !active ||
    !active.frame.choices.some((choice) => choice.index === index)
  )
    return state;
  const date = dates.find((item) => item.id === active.dateId)!;
  const storyId = activeDateStoryId(date, active);
  const toneBefore = deriveRelationshipTone(state);
  const tagged = taggedDateScene(date.id);
  if (tagged) return chooseTaggedDate(state, active, tagged, index);
  // A one-scene date's choice tags apply first (not on a replay), then the choice goes on as before (4.4).
  const fileTags = fileTagOption(date.id, active.frame.choices.find((choice) => choice.index === index)?.optionId);
  if (fileTags && !tagsApplied) {
    if (dateChoiceDisplay(state, index).show !== "open") return state;
    if (!active.replay) return chooseDate(applyChoiceEffects(state, fileDateScene(date.id)!.id, fileTags, state.revision + 1).state, index, expectedRevision, true);
  }
  if (active.resolutionMode === "fixed") {
    return applyStep(
      { ...state, revision: state.revision + 1 },
      { ...active, choiceCount: active.choiceCount + 1, turnCount: active.turnCount + 1, step: active.step + 1 },
      selectStoryChoice(storyId, active.storyState, active.frame, index, state.memories, {}, {
        relationship_tone: toneBefore,
        relationship_tone_before: toneBefore,
        relationship_tone_after: toneBefore,
      }, undefined, sceneConditionReader(state)),
    );
  }
  const ticket = active.randomPlan[active.choiceCount];
  if (!ticket || active.resolvedChoices.length !== active.choiceCount)
    throw new Error("恋愛リアクションの保存状態が一致しません。");
  // Probe a separate Ink instance, so the selected effect is known before
  // setting variables and consuming the choice in the real story.
  const probe = selectStoryChoice(storyId, active.storyState, active.frame, index, state.memories, {
    romance_result: "positive", affection_delta: 0, trust_delta: 0, spark_delta: 0,
  }, {}, undefined, sceneConditionReader(state));
  if (probe.effects.length !== 1) throw new Error("選択肢の効果を確認できません。");
  const effectId = probe.effects[0];
  const effect = effects.find((item) => item.id === effectId);
  const profileId = active.responseSnapshot?.effectProfiles[effectId];
  const profile = active.responseSnapshot?.profiles.find((item) => item.id === profileId);
  if (!effect || effect.outcome || !profile) throw new Error("選択肢のリアクション設定が見つかりません。");
  const before = { affection: state.affection, trust: state.trust, spark: state.spark };
  const resolution = resolveRomanceChoice(profile, before, ticket);
  // applyStep does not apply relationship changes to a saved replay.
  const after = active.replay ? before : {
    affection: before.affection + resolution.deltas.affection,
    trust: before.trust + resolution.deltas.trust,
    spark: before.spark + resolution.deltas.spark,
  };
  const toneAfter = deriveRelationshipTone(after);
  const step = selectStoryChoice(storyId, active.storyState, active.frame, index, state.memories, {
    romance_result: resolution.result,
    affection_delta: resolution.deltas.affection,
    trust_delta: resolution.deltas.trust,
    spark_delta: resolution.deltas.spark,
  }, {
    relationship_tone: toneAfter,
    relationship_tone_before: toneBefore,
    relationship_tone_after: toneAfter,
  }, undefined, sceneConditionReader({ ...state, ...after }));
  if (step.effects.length !== 1 || step.effects[0] !== effectId)
    throw new Error("選択肢の結果と会話の効果が一致しません。");
  return applyStep(
    { ...state, revision: state.revision + 1 },
    { ...active, choiceCount: active.choiceCount + 1, turnCount: active.turnCount + 1, step: active.step + 1,
      resolvedChoices: [...active.resolvedChoices, { choiceIndex: index, effectId, before, ...resolution }] },
    step,
  );
}

export { taggedDateScene } from "./reservations";

/**
 * A choice of a date written with tags. A choice of the date's own knot is a romance choice: it uses
 * the next saved ticket with its `# profile:` (the date's choiceCount counts these), and its other
 * tags (`# memory:`, `# rel:`…) apply too. A choice of a helper knot is an in-scene choice: no ticket,
 * no reaction, only its tags (3.5). A replayed date applies no effect (A17).
 */
/** How a choice of the open date shows (decision 43): a date written with tags hides and greys its choices like any scene; today's dates show all. */
export function dateChoiceDisplay(state: GameState, index: number): ChoiceDisplay {
  const active = state.activeDate;
  const choice = active?.frame.choices.find((item) => item.index === index);
  if (!active || !choice) return { show: "grey", reason: "この選択肢は使えません。" };
  const scene = taggedDateScene(active.dateId);
  if (!scene) {
    // A one-scene date's choice tags (stage 3b): hidden or greyed out like a place file's (a replay asks nothing to be paid).
    const tags = fileTagOption(active.dateId, choice.optionId);
    const shown = tags ? choiceDisplay(state, tags) : { show: "open" as const };
    return active.replay && shown.show === "grey" ? { show: "open" } : shown;
  }
  const option = sceneOption(scene, choice.optionId);
  if (!option) return { show: "hidden" };
  // A replayed date applies nothing, so it asks nothing to be paid; what a choice needs to show still holds.
  const shown = choiceDisplay(state, option);
  return active.replay && shown.show === "grey" ? { show: "open" } : shown;
}

/** A one-scene date's choice tags by option ID, without its romance part (the # effect: keeps that). */
function fileTagOption(dateId: string, optionId: string | undefined): SceneOption | undefined {
  const option = sceneOption(fileDateScene(dateId), optionId);
  return option && { ...option, profile: undefined, effect: undefined };
}

function chooseTaggedDate(state: GameState, active: ActiveDate, scene: NonNullable<ReturnType<typeof taggedDateScene>>, index: number): GameState {
  if (dateChoiceDisplay(state, index).show !== "open") return state;
  const date = dates.find((item) => item.id === active.dateId)!;
  const storyId = activeDateStoryId(date, active);
  const choice = active.frame.choices.find((item) => item.index === index)!;
  const option = sceneOption(scene, choice.optionId);
  if (!option) throw new Error("選択肢の効果を確認できません。");
  const revision = state.revision + 1;
  const toneBefore = deriveRelationshipTone(state);
  const own = option.knot === scene.story.knot;
  // A confession's own choices are its direct choices (counted by choiceCount, DA-1): no ticket, no reaction, only their tags.
  const direct = own && date.kind === "confession";
  if (!own || direct) {
    const next = active.replay ? state : applyChoiceEffects(state, scene.id, option, revision).state;
    const tone = deriveRelationshipTone(next);
    const step = selectStoryChoice(storyId, active.storyState, active.frame, index, next.memories, {}, {
      relationship_tone: tone, relationship_tone_before: toneBefore, relationship_tone_after: tone,
    }, next.inventory, sceneConditionReader(next));
    return applyStep({ ...next, revision }, { ...active, choiceCount: active.choiceCount + (direct ? 1 : 0),
      turnCount: active.turnCount + 1, step: active.step + 1 }, step);
  }
  const ticket = active.randomPlan[active.choiceCount];
  const profile = active.responseSnapshot?.profiles.find((item) => item.id === option.profile);
  if (!ticket || !profile || active.resolvedChoices.length !== active.choiceCount) throw new Error("恋愛リアクションの保存状態が一致しません。");
  const before = { affection: state.affection, trust: state.trust, spark: state.spark };
  const resolution = resolveRomanceChoice(profile, before, ticket);
  let next: GameState = state;
  if (!active.replay) {
    next = { ...state, affection: before.affection + resolution.deltas.affection, trust: before.trust + resolution.deltas.trust, spark: before.spark + resolution.deltas.spark };
    next = applyChoiceEffects(next, scene.id, { ...option, profile: undefined }, revision).state;
  }
  const toneAfter = deriveRelationshipTone(next);
  const step = selectStoryChoice(storyId, active.storyState, active.frame, index, next.memories, {
    romance_result: resolution.result, affection_delta: resolution.deltas.affection, trust_delta: resolution.deltas.trust, spark_delta: resolution.deltas.spark,
  }, { relationship_tone: toneAfter, relationship_tone_before: toneBefore, relationship_tone_after: toneAfter }, next.inventory, sceneConditionReader(next));
  return applyStep({ ...next, revision },
    { ...active, choiceCount: active.choiceCount + 1, turnCount: active.turnCount + 1, step: active.step + 1,
      resolvedChoices: [...active.resolvedChoices, { choiceIndex: index, optionId: option.id, before, ...resolution }] }, step);
}

export function finishDate(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeDate;
  if (state.revision !== expectedRevision || !active || !active.frame.ended)
    return state;
  const date = dates.find((item) => item.id === active.dateId)!;
  if (
    active.choiceCount !== date.choiceCount ||
    (date.kind === "confession" && !active.pendingOutcome)
  )
    return state;
  const confessionStatus =
    date.kind === "confession"
      ? active.pendingOutcome!
      : state.confessionStatus;
  // The date's main # on_done: (a place file's knot or a one-scene file's head), the first time it is finished.
  const doneScene = mainScene({ date: date.id });
  if (doneScene && !active.replay && !state.playedDateIds.includes(date.id))
    state = applyDoneEffects(state, doneScene.id, doneScene.done, state.revision + 1);
  const memories = [...state.memories];
  // A confession may follow a deferral (a later city's, or this one again when its writer made it repeatable; the
  // journeys' are played once, 2026-11-13); the first eventual acceptance still earns its one ending memory.
  // Commit this together with the ending, not while displaying the confession response.
  if (date.kind === "confession" && confessionStatus === "accepted") {
    for (const effect of effects) {
      if (
        effect.outcome === "accepted" &&
        effect.memoryId &&
        active.appliedEffectIds.some((key) => key.endsWith(`:${effect.id}`)) &&
        !memories.includes(effect.memoryId)
      )
        memories.push(effect.memoryId);
    }
  }
  // The date is one part of its occasion: the 「交際開始」 screen or the occasion's end follows now (stage 3b).
  return advanceRunningOccasion(evaluateProgression({
    ...state,
    memories,
    revision: state.revision + 1,
    activeDate: null,
    confessionStatus,
    lastRejectedDateCount: date.kind === "confession"
      ? (confessionStatus === "rejected" ? completedDateCount(state) : null)
      : state.lastRejectedDateCount,
    recoveryAfterRejection: date.kind === "confession" ? false :
      (state.confessionStatus === "rejected" && date.recovery ? true : state.recoveryAfterRejection),
    // Only a completed recovery counts as an experience; keep ordinary date IDs unchanged.
    completedRecoveryCount: date.recovery ? Math.min(3, state.completedRecoveryCount + 1) : state.completedRecoveryCount,
    endingReached: state.endingReached || confessionStatus === "accepted",
    playedDateIds: state.playedDateIds.includes(active.dateId)
      ? state.playedDateIds
      : [...state.playedDateIds, active.dateId],
  }));
}

export function validateGameState(input: unknown): GameState {
  const state = gameStateSchema.parse(input);
  validateTravelState(state);
  if (state.activeEncounter && (state.activeDate || state.activeBattle || state.activeTourism || state.activeEpilogue))
    throw new Error("道中の交流と他の進行が重複しています。");
  validateBattleState(state);
  validateOccasionState(state);
  validateEncounterState(state);
  validateTourismState(state);
  validateJourneyState(state);
  validateRewardState(state);
  validateEpilogueState(state);
  validateTourState(state);
  validateGameHistory(state);
  validateActiveDateState(state);
  validateStoryProgress(state);
  validateAlbum(state);
  return state;
}
