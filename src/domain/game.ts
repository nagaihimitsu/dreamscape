import { defaultJourneyId, getJourney, type Journey } from "../content/journeys";
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
  getDateAvailability,
} from "./date-rules";

import { validateTravelState, validateGameHistory, validateActiveDateState, validateStoryProgress } from "./game-state-validation";

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
    travel: { currentPlaceId: travelSettings.hotelPlaceId, hotelPlaceId: travelSettings.hotelPlaceId, day: 1, minute: 540, returnReserve: 0, returnDeadline: DAY_END, activeEvent: null, rentedModeIds: [], rideCounts: {}, temporaryFlags: [],
      ...(journey.startWeekday === undefined ? {} : { calendar: { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: journey.startWeekday } }) },
    travelBudget: journey.initialBudget ?? travelSettings.initialBudget,
    inventory: {},
    completedEncounterIds: [],
    seenEncounterIds: [],
    itemUses: {},
    storyProgress: { lines: {}, flags: [] },
    encounterRewards: {},
    activeEncounter: null,
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

export function startDate(state: GameState, dateId: string, nextRoll: () => number = secureRomanceRoll): GameState {
  if (!getDateAvailability(state, dateId).available) return state;
  const date = dates.find((item) => item.id === dateId)!;
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
  }, state.memories, {}, getCityStoryBackground(state.currentCityId, placeId));
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
      step: 1,
      appliedEffectIds: [],
      pendingOutcome: null,
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
    }),
  );
}

export function chooseDate(
  state: GameState,
  index: number,
  expectedRevision: number,
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
  if (active.resolutionMode === "fixed") {
    return applyStep(
      { ...state, revision: state.revision + 1 },
      { ...active, choiceCount: active.choiceCount + 1, step: active.step + 1 },
      selectStoryChoice(storyId, active.storyState, active.frame, index, state.memories, {}, {
        relationship_tone: toneBefore,
        relationship_tone_before: toneBefore,
        relationship_tone_after: toneBefore,
      }),
    );
  }
  const ticket = active.randomPlan[active.choiceCount];
  if (!ticket || active.resolvedChoices.length !== active.choiceCount)
    throw new Error("恋愛リアクションの保存状態が一致しません。");
  // Probe a separate Ink instance, so the selected effect is known before
  // setting variables and consuming the choice in the real story.
  const probe = selectStoryChoice(storyId, active.storyState, active.frame, index, state.memories, {
    romance_result: "positive", affection_delta: 0, trust_delta: 0, spark_delta: 0,
  });
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
  });
  if (step.effects.length !== 1 || step.effects[0] !== effectId)
    throw new Error("選択肢の結果と会話の効果が一致しません。");
  return applyStep(
    { ...state, revision: state.revision + 1 },
    { ...active, choiceCount: active.choiceCount + 1, step: active.step + 1,
      resolvedChoices: [...active.resolvedChoices, { choiceIndex: index, effectId, before, ...resolution }] },
    step,
  );
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
  const memories = [...state.memories];
  // A deferred attempt is replayable; the first eventual acceptance still earns its one ending memory.
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
  return evaluateProgression({
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
  });
}

export function validateGameState(input: unknown): GameState {
  const state = gameStateSchema.parse(input);
  validateTravelState(state);
  if (state.activeEncounter && (state.activeDate || state.activeBattle || state.activeTourism || state.activeEpilogue))
    throw new Error("道中の交流と他の進行が重複しています。");
  validateBattleState(state);
  validateEncounterState(state);
  validateTourismState(state);
  validateJourneyState(state);
  validateRewardState(state);
  validateEpilogueState(state);
  validateGameHistory(state);
  validateActiveDateState(state);
  validateStoryProgress(state);
  return state;
}
