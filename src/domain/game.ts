import { z } from "zod";
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
  dates,
  effects,
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
export const gameStateSchema = phase6StateSchema
  .extend({
    schemaVersion: z.literal(7),
    activeBattle: activeBattleSchema.nullable(),
    battleRecords: z.array(battleRecordSchema),
    activeEpilogue: activeEpilogueSchema.nullable(),
    viewedEpilogueCityIds: uniqueStrings,
    legacyTrialAvailable: z.boolean(),
  })
  .strict();
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
    schemaVersion: 7,
    revision: 0,
    playerName: nameSchema.parse(playerName),
    heroineName: nameSchema.parse(heroineName),
    ap: 0,
    affection: 0,
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
    date.requiredPlayedDateIds.every((id) =>
      state.playedDateIds.includes(id),
    ) &&
    state.romanceStage >= date.minRomanceStage &&
    state.affection >= date.minAffection &&
    (!date.needsDeferred || state.confessionStatus === "deferred")
  );
}

/** Re-evaluate only at durable event boundaries. Unlocks remain recorded after their first appearance. */
export function evaluateProgression(state: GameState): GameState {
  let romanceStage = state.romanceStage;
  for (const stage of progression.stages) {
    if (
      state.affection >= stage.minAffection &&
      stage.requiredPlayedDateIds.every((id) =>
        state.playedDateIds.includes(id),
      )
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
      date.kind !== "normal" &&
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
    state.romanceStage === 4 &&
    state.affection >= progression.confession.minAffection &&
    progression.confession.requiredPlayedDateIds.every((id) =>
      state.playedDateIds.includes(id),
    )
  );
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
    state.activeEpilogue
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
    state.activeEpilogue
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

export function isEventVisible(state: GameState, dateId: string): boolean {
  const date = dates.find((item) => item.id === dateId);
  return Boolean(
    date &&
      (date.kind === "normal"
        ? !state.playedDateIds.includes(dateId) &&
          (date.requiredCompletedEpisodeIds ?? []).every((id) => state.completedEpisodeIds.includes(id))
        : state.unlockedEventIds.includes(dateId)),
  );
}

export function getDateAvailability(
  state: GameState,
  dateId: string,
): Availability {
  const date = dates.find((item) => item.id === dateId);
  if (!date) return { available: false, reason: "デートが見つかりません。" };
  if (state.endingReached && !date.allowAfterEnding)
    return {
      available: false,
      reason: "ふたりの物語は、交際エンディングを迎えました。",
    };
  if (
    state.activeDate ||
    state.activeBattle ||
    state.activeTourism ||
    state.activeEpilogue
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
      pendingOutcome =
        effect.outcome === "accepted" && !canConfessSuccessfully(state)
          ? "deferred"
          : effect.outcome;
    }
    if (!active.replay && !effect.outcome) {
      affection += effect.affectionDelta;
      if (effect.memoryId && !memories.includes(effect.memoryId))
        memories.push(effect.memoryId);
    }
  });
  return {
    ...state,
    affection,
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

export function startDate(state: GameState, dateId: string): GameState {
  if (!getDateAvailability(state, dateId).available) return state;
  const date = dates.find((item) => item.id === dateId)!;
  const result = beginStory(date.storyId, state.playerName, state.heroineName, {
    player_address: getPlayerAddress(state),
    romance_stage: state.romanceStage,
    memory_callback: getMemoryCallback(state),
    has_cafe_memory: progression.memoryCallbacks.some((item) =>
      state.memories.includes(item.memoryId),
    ),
    ending_reached: state.endingReached,
    confession_ready: canConfessSuccessfully(state),
  });
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
    continueStory(date.storyId, active.storyState, active.frame),
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
  return applyStep(
    { ...state, revision: state.revision + 1 },
    { ...active, choiceCount: active.choiceCount + 1, step: active.step + 1 },
    selectStoryChoice(date.storyId, active.storyState, active.frame, index),
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
    return {
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
    };
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
  const next: GameState = {
    ...old,
    schemaVersion: 7,
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
  return migrateJourneyProgress(
    version === 1 ? evaluateProgression(next) : next,
  );
}

export function validateGameState(input: unknown): GameState {
  const state = migrateGameState(input);
  validateBattleState(state);
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
      (state.endingReached && !date.allowAfterEnding) ||
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
    if (active.storyHash !== storyFingerprint(date.storyId))
      throw new Error(
        "シナリオが更新されています。以前の途中データはそのまま保管されています。",
      );
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
    validateStorySnapshot(date.storyId, active.storyState, active.frame, {
      playerName: state.playerName,
      heroineName: state.heroineName,
      choiceCount: active.choiceCount,
    });
  }
  return state;
}
