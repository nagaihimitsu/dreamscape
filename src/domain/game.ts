import { z } from "zod";
import { createRomanceRollPlan, resolveRomanceChoice } from "./romance-random";
import { deriveRelationshipTone } from "./romance-tone";
import { secureRomanceRoll } from "../random/romance-source";
import { activeEncounterSchema } from "./encounter-state";
import { validateEncounterState } from "./encounter";
import { responseProfileSchema } from "../content/schemas";
import { legacyPhase1Stage, legacyRomanceValues } from "./romance-migration";
import { activeEpilogueSchema, validateEpilogueState } from "./epilogue";
import {
  completeRecordedChapter,
  migrateJourneyProgress,
  validateJourneyState,
} from "./chapter";
import {
  battleRewardReceiptSchema,
  pendingApRewardSchema,
  settlePendingAp,
  validateRewardState,
} from "./rewards";
import { activeTourismSchema, validateTourismState } from "./tourism";
import {
  activeBattleSchema,
  legacyActiveBattleSchema,
  legacyBattleRecordSchema,
  phase6ActiveBattleSchema,
  battleRecordSchema,
  validateBattleState,
} from "./battle";
import {
  balance,
  city,
  encounters,
  dates,
  effects,
  responseProfiles,
  progression,
  trialMilestones,
  type DateDefinition,
} from "../content";
import {
  beginStory,
  continueStory,
  selectStoryChoice,
  storyFingerprint,
  validateStorySnapshot,
  type StoryStep,
  storyFrameSchema,
} from "../story/runtime";

const uniqueStrings = z
  .array(z.string().min(1))
  .refine((items) => new Set(items).size === items.length);
const frameSchema = storyFrameSchema;
const oldActiveSchema = z
  .object({
    dateId: z.string(),
    runId: z.string(),
    replay: z.boolean(),
    storyState: z.string().min(1),
    storyHash: z.string(),
    frame: frameSchema,
    choiceCount: z.number().int().min(0).max(2),
    step: z.number().int().positive(),
    appliedEffectIds: uniqueStrings,
  })
  .strict();
const activeDateSchema = oldActiveSchema
  .extend({
    choiceCount: z.number().int().nonnegative(),
    pendingOutcome: z.enum(["accepted", "deferred"]).nullable(),
  })
  .strict();
const nameSchema = z.string().trim().min(1).max(balance.maxNameLength);
const oldStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    playerName: nameSchema,
    heroineName: nameSchema,
    ap: z.number().int().min(0).max(balance.apCap),
    affection: z.number().int(),
    romanceStage: z.literal(1),
    completedChapters: uniqueStrings,
    claimedRewardIds: uniqueStrings,
    playedDateIds: uniqueStrings,
    memories: uniqueStrings,
    activeDate: oldActiveSchema.nullable(),
  })
  .strict();
const phase2StateSchema = oldStateSchema
  .extend({
    schemaVersion: z.literal(2),
    romanceStage: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    activeDate: activeDateSchema.nullable(),
    unlockedEventIds: uniqueStrings,
    confessionStatus: z.enum(["none", "deferred", "accepted"]),
    endingReached: z.boolean(),
  })
  .strict();
const phase3StateSchema = phase2StateSchema
  .extend({
    schemaVersion: z.literal(3),
    activeBattle: legacyActiveBattleSchema.nullable(),
    battleRecords: z.array(legacyBattleRecordSchema),
  })
  .strict();
const phase4StateSchema = phase3StateSchema
  .extend({
    schemaVersion: z.literal(4),
    activeTourism: activeTourismSchema.nullable(),
    discoveredClueIds: uniqueStrings,
    visitedLandmarkIds: uniqueStrings,
  })
  .strict();
const phase5StateSchema = phase4StateSchema
  .extend({
    schemaVersion: z.literal(5),
    completedEpisodeIds: uniqueStrings,
    completedCityIds: uniqueStrings,
    completedGuideIds: uniqueStrings,
    pendingApRewards: z.array(pendingApRewardSchema),
    battleRewardReceipt: battleRewardReceiptSchema.nullable(),
  })
  .strict();
const phase6StateSchema = phase5StateSchema
  .extend({
    schemaVersion: z.literal(6),
    activeBattle: phase6ActiveBattleSchema.nullable(),
  })
  .strict();
const phase7StateSchema = phase6StateSchema
  .extend({
    schemaVersion: z.literal(7),
    activeBattle: activeBattleSchema.nullable(),
    battleRecords: z.array(battleRecordSchema),
    activeEpilogue: activeEpilogueSchema.nullable(),
    viewedEpilogueCityIds: uniqueStrings,
    legacyTrialAvailable: z.boolean(),
  })
  .strict();
const phase8StateSchema = phase7StateSchema.extend({
  schemaVersion: z.literal(8),
  trust: z.number().int(),
  spark: z.number().int(),
  lastRejectedDateCount: z.number().int().nonnegative().nullable(),
  confessionStatus: z.enum(["none", "deferred", "rejected", "accepted"]),
  activeDate: activeDateSchema.extend({ pendingOutcome: z.enum(["accepted", "deferred", "rejected"]).nullable() }).nullable(),
}).strict();
const relationshipValuesSchema = z.object({
  affection: z.number().int(), trust: z.number().int(), spark: z.number().int(),
}).strict();
const romanceRollTicketSchema = z.object({
  reaction: z.number().int().min(0).max(9999),
  affection: z.number().int().min(0).max(9999),
  trust: z.number().int().min(0).max(9999),
  spark: z.number().int().min(0).max(9999),
}).strict();
const resolvedChoiceSchema = z.object({
  choiceIndex: z.number().int().min(0).max(2),
  effectId: z.string().min(1),
  before: relationshipValuesSchema,
  result: z.enum(["positive", "negative"]),
  chance: z.number().min(0).max(100),
  deltas: relationshipValuesSchema,
}).strict();
const responseSnapshotSchema = z.object({
  profiles: z.array(responseProfileSchema).min(1),
  effectProfiles: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), z.string().regex(/^[a-z][a-z0-9_]*$/)),
}).strict().refine(({ profiles, effectProfiles }) => {
  const ids = new Set(profiles.map((profile) => profile.id));
  return ids.size === profiles.length && Object.values(effectProfiles).every((id) => ids.has(id));
}, "保存された恋愛リアクション設定が不正です。");
const phase9ActiveDateSchema = activeDateSchema.extend({
  pendingOutcome: z.enum(["accepted", "deferred", "rejected"]).nullable(),
  resolutionMode: z.enum(["legacy_fixed", "random_v1"]),
  randomPlan: z.array(romanceRollTicketSchema),
  resolvedChoices: z.array(resolvedChoiceSchema),
  responseSnapshot: responseSnapshotSchema.nullable(),
}).strict();
const phase9StateSchema = phase8StateSchema.extend({
  schemaVersion: z.literal(9),
  recoveryAfterRejection: z.boolean(),
  completedRecoveryCount: z.number().int().min(0).max(3),
  activeDate: phase9ActiveDateSchema.nullable(),
}).strict();
const stableContentId = z.string().regex(/^[a-z][a-z0-9_]*$/);
export const gameStateSchema = phase9StateSchema.extend({
  schemaVersion: z.literal(10),
  travelBudget: z.number().int().nonnegative().safe(),
  inventory: z.record(stableContentId, z.enum(["held", "gifted", "used"])),
  completedEncounterIds: uniqueStrings,
  encounterRewards: z.record(stableContentId, z.object({
    roll: z.number().int().min(0).max(9999),
    chancePercent: z.number().int().min(0).max(100),
    won: z.boolean(),
  }).strict()),
  activeEncounter: activeEncounterSchema.nullable(),
}).strict();
export type GameState = z.infer<typeof gameStateSchema>;
export type ActiveDate = NonNullable<GameState["activeDate"]>;
export interface Availability {
  available: boolean;
  reason: string;
}

export function createGame(
  playerName = balance.defaultPlayerName,
  heroineName = balance.defaultHeroineName,
): GameState {
  return {
    schemaVersion: 10,
    travelBudget: encounters.initialBudget,
    inventory: {},
    completedEncounterIds: [],
    encounterRewards: {},
    activeEncounter: null,
    revision: 0,
    playerName: nameSchema.parse(playerName),
    heroineName: nameSchema.parse(heroineName),
    ap: 0,
    affection: 0,
    trust: 0,
    spark: 0,
    lastRejectedDateCount: null,
    recoveryAfterRejection: false,
    completedRecoveryCount: 0,
    romanceStage: 1,
    completedChapters: [],
    claimedRewardIds: [],
    playedDateIds: [],
    memories: [],
    activeDate: null,
    unlockedEventIds: [],
    confessionStatus: "none",
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
    legacyTrialAvailable: false,
  };
}

function meetsDateConditions(state: GameState, date: DateDefinition): boolean {
  return (
    date.requiredCompletedChapters.every((id) =>
      state.completedChapters.includes(id),
    ) &&
    (date.requiredCompletedCityIds ?? []).every((id) =>
      state.completedCityIds.includes(id),
    ) &&
    (date.requiredCompletedEpisodeIds ?? []).every((id) =>
      state.completedEpisodeIds.includes(id),
    ) &&
    (date.forbiddenCompletedEpisodeIds ?? []).every((id) =>
      !state.completedEpisodeIds.includes(id),
    ) &&
    date.requiredPlayedDateIds.every((id) =>
      state.playedDateIds.includes(id),
    ) &&
    state.romanceStage >= date.minRomanceStage &&
    (date.minAffection === 0 || state.affection >= date.minAffection) &&
    (!date.needsDeferred || state.confessionStatus === "deferred")
  );
}

/** Count completed ordinary dates and up to three real recovery conversations. */
export function completedDateCount(state: GameState): number {
  const ordinary = state.playedDateIds.filter((id) => dates.some((date) => date.id === id && date.kind === "normal")).length;
  return ordinary + state.completedRecoveryCount;
}

/** Re-evaluate only at durable event boundaries. Unlocks remain recorded after their first appearance. */
export function evaluateProgression(state: GameState): GameState {
  let romanceStage = state.romanceStage;
  for (const stage of progression.stages) {
    if (
      state.affection >= stage.minAffection &&
      state.trust >= stage.minTrust && state.spark >= stage.minSpark &&
      completedDateCount(state) >= stage.minCompletedDates
    ) {
      romanceStage = Math.max(
        romanceStage,
        stage.stage,
      ) as GameState["romanceStage"];
    }
  }
  const next = { ...state, romanceStage };
  const unlockedEventIds = [...state.unlockedEventIds];
  for (const date of dates) {
    if (
      date.kind !== "normal" && !date.recovery &&
      meetsDateConditions(next, date) &&
      !unlockedEventIds.includes(date.id)
    )
      unlockedEventIds.push(date.id);
  }
  if (
    romanceStage === state.romanceStage &&
    unlockedEventIds.length === state.unlockedEventIds.length
  )
    return state;
  return { ...next, unlockedEventIds };
}

export function getPlayerAddress(state: GameState): string {
  const stage = progression.stages.find(
    (item) => item.stage === state.romanceStage,
  )!;
  return `${state.playerName}${stage.playerSuffix}`;
}

export function getMemoryCallback(state: GameState): string {
  return (
    progression.memoryCallbacks.find((item) =>
      state.memories.includes(item.memoryId),
    )?.textJa ?? progression.fallbackMemoryCallbackJa
  );
}

export function canConfessSuccessfully(state: GameState): boolean {
  return (
    state.affection >= progression.confession.minAffection &&
    state.trust >= progression.confession.minTrust &&
    state.spark >= progression.confession.minSpark &&
    completedDateCount(state) >= progression.confession.minCompletedDates
  );
}

export function confessionResult(state: GameState): "accepted" | "deferred" | "rejected" {
  if (canConfessSuccessfully(state)) return "accepted";
  return state.affection >= progression.stages[2].minAffection && state.trust >= progression.stages[2].minTrust
    ? "deferred" : "rejected";
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

export function grantRewardOnce(
  state: GameState,
  rewardId: string,
  amount: number,
): GameState {
  if (
    state.activeTourism ||
    state.activeEpilogue ||
    state.activeEncounter ||
    !rewardId ||
    state.claimedRewardIds.includes(rewardId) ||
    !Number.isSafeInteger(amount) ||
    amount < 0
  )
    return state;
  return {
    ...state,
    revision: state.revision + 1,
    ap: Math.min(balance.apCap, state.ap + amount),
    claimedRewardIds: [...state.claimedRewardIds, rewardId],
  };
}

/** Compatibility entry point; real battle evidence is required. */
export function completeChapter(
  state: GameState,
  chapterId = city.id,
): GameState {
  return completeRecordedChapter(state, chapterId);
}

/** Trial AP sources are finite, separately configured, and never grant affection. */
export function getMilestoneAvailability(
  state: GameState,
  milestoneId: string,
): Availability {
  const milestone = trialMilestones.find((item) => item.id === milestoneId);
  if (!milestone || state.endingReached || !state.legacyTrialAvailable)
    return { available: false, reason: "この試遊用の進行は終了しました。" };
  if (state.claimedRewardIds.includes(milestone.rewardSourceId))
    return { available: false, reason: "受け取り済みです。" };
  if (
    state.activeDate ||
    state.activeBattle ||
    state.activeTourism ||
    state.activeEpilogue ||
    state.activeEncounter
  )
    return {
      available: false,
      reason: "今の会話・バトルを終えてから進めます。",
    };
  if (
    !state.completedChapters.includes(city.id) ||
    !milestone.requiredPlayedDateIds.every((id) =>
      state.playedDateIds.includes(id),
    )
  )
    return {
      available: false,
      reason: "今の自由時間を過ごすと、次の試遊用の進行を選べます。",
    };
  if (state.ap + milestone.ap > balance.apCap)
    return { available: false, reason: "APに空きができてから受け取れます。" };
  return { available: true, reason: "" };
}

export function claimTrialMilestone(
  state: GameState,
  milestoneId: string,
): GameState {
  if (!getMilestoneAvailability(state, milestoneId).available) return state;
  const milestone = trialMilestones.find((item) => item.id === milestoneId)!;
  return grantRewardOnce(state, milestone.rewardSourceId, milestone.ap);
}

/** A repeatable conversation prevents random setbacks from permanently blocking recovery. */
function canRecoverRelationship(state: GameState): boolean {
  if (state.endingReached || completedDateCount(state) === 0) return false;
  const needsRepair = !canConfessSuccessfully(state) ||
    (state.confessionStatus === "rejected" && !state.recoveryAfterRejection &&
      state.lastRejectedDateCount !== null && completedDateCount(state) <= state.lastRejectedDateCount);
  if (!needsRepair) return false;
  return !dates.some((date) => date.kind === "normal" && getDateAvailability(state, date.id).available);
}

export function isEventVisible(state: GameState, dateId: string): boolean {
  const date = dates.find((item) => item.id === dateId);
  return Boolean(
    date &&
      (!date.recovery || canRecoverRelationship(state)) &&
      (!state.endingReached || date.kind === "normal" || date.allowAfterEnding) &&
      (date.forbiddenCompletedEpisodeIds ?? []).every((id) => !state.completedEpisodeIds.includes(id)) &&
      (date.kind === "normal"
        ? !state.playedDateIds.includes(dateId) &&
          (date.requiredCompletedEpisodeIds ?? []).every((id) => state.completedEpisodeIds.includes(id))
        : state.unlockedEventIds.includes(dateId) || meetsDateConditions(state, date)),
  );
}

export function getDateAvailability(
  state: GameState,
  dateId: string,
): Availability {
  const date = dates.find((item) => item.id === dateId);
  if (!date) return { available: false, reason: "デートが見つかりません。" };
  if (date.recovery && !canRecoverRelationship(state))
    return { available: false, reason: "今は別のひとときを選べます。" };
  if (state.endingReached && date.kind !== "normal" && !date.allowAfterEnding)
    return {
      available: false,
      reason: "ふたりの物語は、交際エンディングを迎えました。",
    };
  if (
    state.activeDate ||
    state.activeBattle ||
    state.activeTourism ||
    state.activeEpilogue ||
    state.activeEncounter
  )
    return {
      available: false,
      reason: "途中の会話・バトルを再開してください。",
    };
  if ((date.kind === "normal" || !date.repeatable) && state.playedDateIds.includes(dateId))
    return {
      available: false,
      reason: "このひとときは、もう思い出になりました。",
    };
  if (
    !(date.requiredCompletedCityIds ?? []).every((id) =>
      state.completedCityIds.includes(id),
    )
  )
    return {
      available: false,
      reason: "都市の旅を終えると、このデートに誘えます。",
    };
  if (!(date.requiredCompletedEpisodeIds ?? []).every((id) => state.completedEpisodeIds.includes(id)))
    return { available: false, reason: "旅を進めると、この場所に誘えます。" };
  if ((date.forbiddenCompletedEpisodeIds ?? []).some((id) => state.completedEpisodeIds.includes(id)))
    return { available: false, reason: "この機会は過ぎました。" };
  if (date.kind === "confession" && state.confessionStatus === "rejected" &&
      state.lastRejectedDateCount !== null && completedDateCount(state) <= state.lastRejectedDateCount &&
      !state.recoveryAfterRejection)
    return { available: false, reason: "新しいひとときを過ごしてから、もう一度話せます。" };
  if (!meetsDateConditions(state, date))
    return { available: false, reason: "もう少し、一緒の時間を過ごしてから。" };
  if (state.ap < date.apCost)
    return { available: false, reason: "APが足りません。" };
  return { available: true, reason: "" };
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
      const stage = String(state.romanceStage) as "1" | "2" | "3" | "4";
      const fixed = effect.stageDeltas?.[stage] ?? effect;
      const resolved = active.resolutionMode === "random_v1"
        ? active.resolvedChoices[active.choiceCount - 1] : undefined;
      if (active.resolutionMode === "random_v1" && (!resolved || resolved.effectId !== effectId))
        throw new Error("選択結果と会話の効果が一致しません。");
      affection += resolved?.deltas.affection ?? fixed.affectionDelta;
      trust += resolved?.deltas.trust ?? fixed.trustDelta ?? 0;
      spark += resolved?.deltas.spark ?? fixed.sparkDelta ?? 0;
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

/** Resolve old in-progress stories by their saved fingerprint; never guess a changed story. */
export function activeDateStoryId(date: DateDefinition, active: Pick<ActiveDate, "storyHash">): string {
  const storyId = [date.storyId, ...(date.legacyStoryIds ?? [])].find((id) => {
    try { return storyFingerprint(id) === active.storyHash; }
    catch { return false; }
  });
  if (!storyId) throw new Error("シナリオが更新されています。以前の途中データはそのまま保管されています。");
  return storyId;
}

export function startDate(state: GameState, dateId: string, nextRoll: () => number = secureRomanceRoll): GameState {
  if (!getDateAvailability(state, dateId).available) return state;
  const date = dates.find((item) => item.id === dateId)!;
  const result = beginStory(date.storyId, state.playerName, state.heroineName, {
    relationship_tone: deriveRelationshipTone(state),
    relationship_tone_before: deriveRelationshipTone(state),
    relationship_tone_after: deriveRelationshipTone(state),
    player_address: getPlayerAddress(state),
    romance_stage: state.romanceStage,
    memory_callback: getMemoryCallback(state),
    // Legacy scripts use this variable; only a cafe memory may set it.
    has_cafe_memory: state.memories.some((id) => id.startsWith("milano_cafe_")),
    ending_reached: state.endingReached,
    confession_ready: canConfessSuccessfully(state),
    confession_result: confessionResult(state),
  }, state.memories);
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
      resolutionMode: date.kind === "confession" ? "legacy_fixed" : "random_v1",
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
  if (active.resolutionMode === "legacy_fixed") {
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

/** Validate the old structure before migrating; never guess when a snapshot is incompatible. */
export function migrateGameState(input: unknown): GameState {
  const version =
    typeof input === "object" && input !== null && "schemaVersion" in input
      ? input.schemaVersion
      : undefined;
  if (version === 9) {
    const parsed = phase9StateSchema.parse(input);
    return {
      ...parsed,
      schemaVersion: 10,
      travelBudget: encounters.initialBudget,
      inventory: {},
      completedEncounterIds: [],
      encounterRewards: {},
      activeEncounter: null,
    };
  }
  if (version === 8) {
    const parsed = phase8StateSchema.parse(input);
    return migrateGameState({
      ...parsed,
      schemaVersion: 9,
      recoveryAfterRejection: false,
      completedRecoveryCount: 0,
      activeDate: parsed.activeDate ? {
        ...parsed.activeDate, resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [], responseSnapshot: null,
      } : null,
    });
  }
  if (version === 7) {
    const parsed = phase7StateSchema.parse(input);
    return migrateGameState({ ...parsed, ...legacyRomanceValues(parsed, progression), schemaVersion: 8 });
  }
  if (version === 5 || version === 6) {
    const parsed =
      version === 5
        ? phase5StateSchema.parse(input)
        : phase6StateSchema.parse(input);
    if (
      parsed.completedChapters.includes(city.id) !==
      parsed.claimedRewardIds.includes(city.firstClearReward.rewardSourceId)
    )
      throw new Error("以前の章報酬の記録が一致しません。");
    if (parsed.completedCityIds.length)
      throw new Error("旧版に都市クリアの記録はありません。");
    return migrateGameState({
      ...parsed,
      schemaVersion: 7,
      activeBattle: parsed.activeBattle
        ? {
            ...parsed.activeBattle,
            reasoning:
              "reasoning" in parsed.activeBattle
                ? parsed.activeBattle.reasoning
                : null,
          }
        : null,
      activeEpilogue: null,
      viewedEpilogueCityIds: [],
      legacyTrialAvailable: true,
    });
  }
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4)
    return gameStateSchema.parse(input);
  let old: z.infer<typeof phase4StateSchema>;
  if (version === 1) {
    const parsed = oldStateSchema.parse(input);
    old = {
      ...parsed,
      schemaVersion: 4,
      activeDate: parsed.activeDate
        ? { ...parsed.activeDate, pendingOutcome: null }
        : null,
      endingReached: false,
      confessionStatus: "none",
      unlockedEventIds: [],
      activeBattle: null,
      battleRecords: [],
      activeTourism: null,
      discoveredClueIds: [],
      visitedLandmarkIds: [],
    };
  } else if (version === 2) {
    old = {
      ...phase2StateSchema.parse(input),
      schemaVersion: 4,
      activeBattle: null,
      battleRecords: [],
      activeTourism: null,
      discoveredClueIds: [],
      visitedLandmarkIds: [],
    };
  } else if (version === 3) {
    old = {
      ...phase3StateSchema.parse(input),
      schemaVersion: 4,
      activeTourism: null,
      discoveredClueIds: [],
      visitedLandmarkIds: [],
    };
  } else old = phase4StateSchema.parse(input);
  // Do not let new completion inference repair an inconsistent legacy reward record.
  if (
    old.completedChapters.includes(city.id) !==
    old.claimedRewardIds.includes(city.firstClearReward.rewardSourceId)
  )
    throw new Error("以前の章報酬の記録が一致しません。");
  if (
    old.activeDate &&
    !dates
      .find((date) => date.id === old.activeDate!.dateId)
      ?.requiredCompletedChapters.every((id) =>
        old.completedChapters.includes(id),
      )
  )
    throw new Error("以前のデートの解放条件が一致しません。");
  const legacyStage = version === 1 ? legacyPhase1Stage(old) : old.romanceStage;
  const next = {
    ...old,
    romanceStage: legacyStage,
    ...legacyRomanceValues({ ...old, romanceStage: legacyStage }, progression),
    schemaVersion: 8,
    activeEpilogue: null,
    viewedEpilogueCityIds: [],
    legacyTrialAvailable: true,
    activeBattle: old.activeBattle
      ? { ...old.activeBattle, reasoning: null }
      : null,
    completedEpisodeIds: [],
    completedCityIds: [],
    completedGuideIds: [],
    pendingApRewards: [],
    battleRewardReceipt: null,
  };
  const migrated = migrateGameState(next);
  return migrateJourneyProgress(
    version === 1 ? evaluateProgression(migrated) : migrated,
  );
}

export function validateGameState(input: unknown): GameState {
  const state = migrateGameState(input);
  if (state.activeEncounter && (state.activeDate || state.activeBattle || state.activeTourism || state.activeEpilogue))
    throw new Error("道中の交流と他の進行が重複しています。");
  validateBattleState(state);
  validateEncounterState(state);
  validateTourismState(state);
  validateJourneyState(state);
  validateRewardState(state);
  validateEpilogueState(state);
  const knownMemories = new Set(
    effects.flatMap((effect) => (effect.memoryId ? [effect.memoryId] : [])),
  );
  if (
    state.completedChapters.some((id) => id !== city.id) ||
    state.playedDateIds.some((id) => !dates.some((date) => date.id === id)) ||
    state.memories.some((id) => !knownMemories.has(id)) ||
    state.unlockedEventIds.some(
      (id) => !dates.some((date) => date.id === id && date.kind !== "normal"),
    )
  )
    throw new Error("保存データの参照先が見つかりません。");
  if (
    state.completedChapters.includes(city.id) !==
    (state.completedEpisodeIds.length > 0 ||
      state.claimedRewardIds.includes(city.firstClearReward.rewardSourceId))
  )
    throw new Error("章の報酬記録が一致しません。");
  if (state.endingReached !== (state.confessionStatus === "accepted"))
    throw new Error("エンディングの記録が一致しません。");
  if ((state.completedRecoveryCount > 0) !== state.playedDateIds.some(
    (id) => dates.some((date) => date.id === id && date.recovery),
  )) throw new Error("再交流の履歴が一致しません。");
  if (state.recoveryAfterRejection &&
      (state.confessionStatus !== "rejected" || state.completedRecoveryCount === 0))
    throw new Error("告白後の交流記録が一致しません。");
  if ((state.confessionStatus === "rejected") !== (state.lastRejectedDateCount !== null) ||
      (state.lastRejectedDateCount !== null && state.lastRejectedDateCount > completedDateCount(state)))
    throw new Error("告白後の進行記録が一致しません。");
  if (
    state.confessionStatus !== "none" &&
    !state.playedDateIds.some(
      (id) => dates.find((date) => date.id === id)?.kind === "confession",
    )
  )
    throw new Error("告白の記録が一致しません。");
  const active = state.activeDate;
  if (active) {
    const date = dates.find((item) => item.id === active.dateId);
    if (
      !date ||
      (state.endingReached && date.kind !== "normal" && !date.allowAfterEnding) ||
      !(date.requiredCompletedCityIds ?? []).every((id) =>
        state.completedCityIds.includes(id),
      ) ||
      !(date.requiredCompletedEpisodeIds ?? []).every((id) =>
        state.completedEpisodeIds.includes(id),
      ) ||
      !date.requiredCompletedChapters.every((id) =>
        state.completedChapters.includes(id),
      )
    )
      throw new Error("デートの保存状態を確認できません。");
    const storyId = activeDateStoryId(date, active);
    if (active.resolutionMode === "legacy_fixed") {
      if (active.randomPlan.length || active.resolvedChoices.length || active.responseSnapshot)
        throw new Error("旧デートの結果記録が一致しません。");
    } else {
      if (date.kind === "confession" || !active.responseSnapshot || active.randomPlan.length !== date.choiceCount ||
          active.resolvedChoices.length !== active.choiceCount)
        throw new Error("恋愛リアクションの進行記録が一致しません。");
      for (const [choiceNumber, saved] of active.resolvedChoices.entries()) {
        const previous = active.resolvedChoices[choiceNumber - 1];
        if (previous && (saved.before.affection !== previous.before.affection + previous.deltas.affection ||
            saved.before.trust !== previous.before.trust + previous.deltas.trust ||
            saved.before.spark !== previous.before.spark + previous.deltas.spark))
          throw new Error("保存された関係値の履歴が一致しません。");
        const effect = effects.find((item) => item.id === saved.effectId);
        const profileId = active.responseSnapshot.effectProfiles[saved.effectId];
        const profile = active.responseSnapshot.profiles.find((item) => item.id === profileId);
        if (!effect || effect.outcome || !profile) throw new Error("保存された選択効果が見つかりません。");
        const expected = resolveRomanceChoice(profile, saved.before, active.randomPlan[choiceNumber]);
        if (JSON.stringify(expected) !== JSON.stringify({ result: saved.result, chance: saved.chance, deltas: saved.deltas }) ||
            !active.appliedEffectIds.some((key) => key.endsWith(`:${saved.effectId}`)))
          throw new Error("保存された恋愛リアクションが一致しません。");
      }
    }
    if (
      active.replay !==
      (date.rewardOnlyOnce && state.playedDateIds.includes(date.id))
    )
      throw new Error("デートの履歴が一致しません。");
    if (
      active.choiceCount > date.choiceCount ||
      (active.pendingOutcome && date.kind !== "confession")
    )
      throw new Error("会話の進行記録が一致しません。");
    const lastResolution = active.resolvedChoices.at(-1);
    if (active.resolutionMode === "random_v1" && lastResolution && !active.replay &&
        (state.affection !== lastResolution.before.affection + lastResolution.deltas.affection ||
         state.trust !== lastResolution.before.trust + lastResolution.deltas.trust ||
         state.spark !== lastResolution.before.spark + lastResolution.deltas.spark))
      throw new Error("保存された関係値と選択結果が一致しません。");
    validateStorySnapshot(storyId, active.storyState, active.frame, {
      playerName: state.playerName,
      heroineName: state.heroineName,
      choiceCount: active.choiceCount,
      variables: active.resolutionMode === "random_v1" ? {
        romance_result: lastResolution?.result ?? "neutral",
        affection_delta: lastResolution?.deltas.affection ?? 0,
        trust_delta: lastResolution?.deltas.trust ?? 0,
        spark_delta: lastResolution?.deltas.spark ?? 0,
      } : undefined,
    }, state.memories);
  }
  return state;
}
