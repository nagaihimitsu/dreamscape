import { z } from "zod";
import { balance, city, dates, effects } from "../content";
import {
  beginStory,
  continueStory,
  selectStoryChoice,
  storyFingerprint,
  validateStorySnapshot,
  type StoryStep,
} from "../story/runtime";

const uniqueStrings = z
  .array(z.string().min(1))
  .refine((items) => new Set(items).size === items.length);
const frameSchema = z
  .object({
    text: z.string(),
    speaker: z.enum(["narrator", "heroine", "player"]),
    background: z.string(),
    emotion: z.string(),
    choices: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            text: z.string().min(1),
          })
          .strict(),
      )
      .max(3),
    ended: z.boolean(),
  })
  .strict();
const activeDateSchema = z
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
const nameSchema = z.string().trim().min(1).max(balance.maxNameLength);
export const gameStateSchema = z
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
    activeDate: activeDateSchema.nullable(),
  })
  .strict();
export type GameState = z.infer<typeof gameStateSchema>;
export type ActiveDate = NonNullable<GameState["activeDate"]>;

export function createGame(
  playerName = balance.defaultPlayerName,
  heroineName = balance.defaultHeroineName,
): GameState {
  return {
    schemaVersion: 1,
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
  };
}

export function setNames(
  state: GameState,
  playerName: string,
  heroineName: string,
): GameState {
  if (state.activeDate) return state;
  const player = nameSchema.safeParse(playerName);
  const heroine = nameSchema.safeParse(heroineName);
  if (!player.success || !heroine.success) return state;
  if (state.playerName === player.data && state.heroineName === heroine.data)
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

export function completeChapter(
  state: GameState,
  chapterId = city.id,
): GameState {
  if (
    chapterId !== city.id ||
    state.activeDate ||
    state.completedChapters.includes(chapterId)
  )
    return state;
  const rewarded = grantRewardOnce(
    state,
    city.firstClearReward.rewardSourceId,
    city.firstClearReward.ap,
  );
  return {
    ...rewarded,
    completedChapters: [...rewarded.completedChapters, chapterId],
  };
}

export function getDateAvailability(
  state: GameState,
  dateId: string,
): { available: boolean; reason: string } {
  const date = dates.find((item) => item.id === dateId);
  if (!date) return { available: false, reason: "デートが見つかりません。" };
  if (state.activeDate)
    return { available: false, reason: "途中のデートを再開してください。" };
  if (
    !date.requiredCompletedChapters.every((chapter) =>
      state.completedChapters.includes(chapter),
    )
  )
    return { available: false, reason: "ミラノ章をクリアすると選べます。" };
  if (state.romanceStage < date.minRomanceStage)
    return { available: false, reason: "まだ選べないデートです。" };
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
  const memories = [...state.memories];
  const applied = [...active.appliedEffectIds];
  result.effects.forEach((effectId, index) => {
    const key = `${active.runId}:${active.step}:${index}:${effectId}`;
    if (applied.includes(key)) return;
    const effect = effects.find((item) => item.id === effectId);
    if (!effect) throw new Error("未定義のイベントです。");
    applied.push(key);
    if (!active.replay) {
      affection += effect.affectionDelta;
      if (!memories.includes(effect.memoryId)) memories.push(effect.memoryId);
    }
  });
  return {
    ...state,
    affection,
    memories,
    activeDate: {
      ...active,
      storyState: result.storyState,
      frame: result.frame,
      appliedEffectIds: applied,
    },
  };
}

export function startDate(state: GameState, dateId: string): GameState {
  if (!getDateAvailability(state, dateId).available) return state;
  const date = dates.find((item) => item.id === dateId)!;
  // Compile/start before deducting AP: a runtime failure cannot partially charge a date.
  const result = beginStory(date.storyId, state.playerName, state.heroineName);
  const next = {
    ...state,
    revision: state.revision + 1,
    ap: state.ap - date.apCost,
  };
  return applyStep(
    next,
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
    active.frame.choices.length > 0
  )
    return state;
  const date = dates.find((item) => item.id === active.dateId)!;
  const result = continueStory(date.storyId, active.storyState, active.frame);
  return applyStep(
    { ...state, revision: state.revision + 1 },
    { ...active, step: active.step + 1 },
    result,
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
  const result = selectStoryChoice(
    date.storyId,
    active.storyState,
    active.frame,
    index,
  );
  return applyStep(
    { ...state, revision: state.revision + 1 },
    { ...active, choiceCount: active.choiceCount + 1, step: active.step + 1 },
    result,
  );
}

export function finishDate(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeDate;
  if (
    state.revision !== expectedRevision ||
    !active ||
    !active.frame.ended ||
    active.choiceCount !== 2
  )
    return state;
  return {
    ...state,
    revision: state.revision + 1,
    activeDate: null,
    playedDateIds: state.playedDateIds.includes(active.dateId)
      ? state.playedDateIds
      : [...state.playedDateIds, active.dateId],
  };
}

export function validateGameState(input: unknown): GameState {
  const state = gameStateSchema.parse(input);
  const knownMemories = new Set(effects.map((effect) => effect.memoryId));
  if (
    state.completedChapters.some((id) => id !== city.id) ||
    state.playedDateIds.some((id) => !dates.some((date) => date.id === id)) ||
    state.memories.some((id) => !knownMemories.has(id))
  )
    throw new Error("保存データの参照先が見つかりません。");
  if (
    state.completedChapters.includes(city.id) !==
    state.claimedRewardIds.includes(city.firstClearReward.rewardSourceId)
  )
    throw new Error("章の報酬記録が一致しません。");
  const active = state.activeDate;
  if (active) {
    const date = dates.find((item) => item.id === active.dateId);
    if (
      !date ||
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
    validateStorySnapshot(date.storyId, active.storyState, active.frame, {
      playerName: state.playerName,
      heroineName: state.heroineName,
      choiceCount: active.choiceCount,
    });
  }
  return state;
}
