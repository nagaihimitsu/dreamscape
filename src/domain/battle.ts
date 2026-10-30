import { z } from "zod";
import { battles, battleQuizzes, progression } from "../content";
import {
  beginStory,
  continueStory,
  storyFingerprint,
  storyFrameSchema,
  validateStorySnapshot,
  type StoryStep,
} from "../story/runtime";
import type { GameState, Availability } from "./game";

export const battleAnswerSchema = z
  .object({
    questionId: z.string().min(1),
    optionId: z.string().min(1),
    correct: z.boolean(),
    hintUsed: z.boolean(),
  })
  .strict();
export const battleRecordSchema = z
  .object({
    battleId: z.string().min(1),
    attempts: z.number().int().positive(),
    firstScore: z.number().int().min(0).max(3),
    bestScore: z.number().int().min(0).max(3),
    lastScore: z.number().int().min(0).max(3),
  })
  .strict();
export const activeBattleSchema = z
  .object({
    battleId: z.string().min(1),
    runId: z.string().min(1),
    contentHash: z.string().min(1),
    phase: z.enum(["dialogue", "question", "feedback", "result"]),
    roundIndex: z.number().int().min(0).max(2),
    answers: z.array(battleAnswerSchema).max(3),
    score: z.number().int().min(0).max(3),
    hintOpen: z.boolean(),
    hintUsed: z.boolean(),
    dialogueScene: z.string().nullable(),
    storyState: z.string().nullable(),
    frame: storyFrameSchema.nullable(),
  })
  .strict();
export type ActiveBattle = z.infer<typeof activeBattleSchema>;
export type BattleRecord = z.infer<typeof battleRecordSchema>;
export type BattleOutcome = "perfect" | "victory" | "defeat";
export function getBattleOutcome(score: number): BattleOutcome {
  return score === 3 ? "perfect" : score === 2 ? "victory" : "defeat";
}

export function battleFingerprint(id: string): string {
  const battle = battles.find((item) => item.id === id);
  if (!battle) throw new Error("バトルが見つかりません。");
  const content = JSON.stringify([
    battle,
    battleQuizzes[battle.quizId],
    storyFingerprint(battle.storyId),
  ]);
  let hash = 2166136261;
  for (let index = 0; index < content.length; index++)
    hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
}

export function getBattleAvailability(
  state: GameState,
  battleId: string,
): Availability {
  if (!battles.some((item) => item.id === battleId))
    return { available: false, reason: "バトルが見つかりません。" };
  if (state.activeTourism)
    return { available: false, reason: "観光画面からバトルへ進んでください。" };
  if (state.activeDate)
    return { available: false, reason: "途中の恋愛会話を終えてから試せます。" };
  if (state.activeBattle && state.activeBattle.phase !== "result")
    return {
      available: false,
      reason: "途中のクイズバトルを再開してください。",
    };
  return { available: true, reason: "" };
}
function sceneVariables(active: ActiveBattle) {
  return {
    battle_scene: active.dialogueScene!,
    answer_correct: active.answers.at(-1)?.correct ?? false,
    battle_score: active.score,
  };
}
function withDialogue(
  state: GameState,
  active: ActiveBattle,
  scene: string,
): ActiveBattle {
  const battle = battles.find((item) => item.id === active.battleId)!;
  const next = {
    ...active,
    phase: "dialogue" as const,
    dialogueScene: scene,
    hintOpen: false,
  };
  const suffix = progression.stages.find(
    (item) => item.stage === state.romanceStage,
  )!.playerSuffix;
  const result = beginStory(
    battle.storyId,
    state.playerName,
    state.heroineName,
    { ...sceneVariables(next), player_address: `${state.playerName}${suffix}` },
  );
  return fromStory(next, result);
}
function fromStory(active: ActiveBattle, result: StoryStep): ActiveBattle {
  if (result.effects.length || result.frame.choices.length)
    throw new Error("バトル会話に採点や恋愛効果を含められません。");
  return { ...active, storyState: result.storyState, frame: result.frame };
}
export function startBattle(state: GameState, battleId: string): GameState {
  if (!getBattleAvailability(state, battleId).available) return state;
  const battle = battles.find((item) => item.id === battleId)!;
  const active: ActiveBattle = {
    battleId,
    runId: `${battleId}:${state.revision + 1}`,
    contentHash: battleFingerprint(battleId),
    phase: "dialogue",
    roundIndex: 0,
    answers: [],
    score: 0,
    hintOpen: false,
    hintUsed: false,
    dialogueScene: null,
    storyState: null,
    frame: null,
  };
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: withDialogue(state, active, battle.scenes.intro),
  };
}
export function answerBattle(
  state: GameState,
  optionId: string,
  expectedRevision: number,
): GameState {
  const active = state.activeBattle;
  if (
    state.activeTourism ||
    state.revision !== expectedRevision ||
    !active ||
    active.phase !== "question"
  )
    return state;
  const battle = battles.find((item) => item.id === active.battleId)!;
  const question = battleQuizzes[battle.quizId].questions[active.roundIndex];
  if (!question.options.some((option) => option.id === optionId)) return state;
  const correct = question.correctOptionId === optionId;
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: {
      ...active,
      phase: "feedback",
      answers: [
        ...active.answers,
        {
          questionId: question.id,
          optionId,
          correct,
          hintUsed: active.hintUsed,
        },
      ],
      score: active.score + (correct ? 1 : 0),
    },
  };
}
export function toggleBattleHint(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeBattle;
  if (
    state.activeTourism ||
    state.revision !== expectedRevision ||
    !active ||
    active.phase !== "question"
  )
    return state;
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: { ...active, hintOpen: !active.hintOpen, hintUsed: true },
  };
}
export function advanceBattle(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeBattle;
  if (state.activeTourism || state.revision !== expectedRevision || !active)
    return state;
  const battle = battles.find((item) => item.id === active.battleId)!;
  if (active.phase === "feedback") {
    const scene =
      active.roundIndex === 2
        ? battle.scenes.outro
        : battle.scenes.afterRounds[active.roundIndex];
    return {
      ...state,
      revision: state.revision + 1,
      activeBattle: withDialogue(state, active, scene),
    };
  }
  if (active.phase !== "dialogue" || !active.frame || !active.storyState)
    return state;
  if (!active.frame.ended) {
    const step = continueStory(battle.storyId, active.storyState, active.frame);
    return {
      ...state,
      revision: state.revision + 1,
      activeBattle: fromStory(active, step),
    };
  }
  if (active.dialogueScene === battle.scenes.outro) {
    const previous = state.battleRecords.find(
      (record) => record.battleId === active.battleId,
    );
    const record: BattleRecord = previous
      ? {
          ...previous,
          attempts: previous.attempts + 1,
          bestScore: Math.max(previous.bestScore, active.score),
          lastScore: active.score,
        }
      : {
          battleId: active.battleId,
          attempts: 1,
          firstScore: active.score,
          bestScore: active.score,
          lastScore: active.score,
        };
    return {
      ...state,
      revision: state.revision + 1,
      activeBattle: {
        ...active,
        phase: "result",
        dialogueScene: null,
        storyState: null,
        frame: null,
        hintOpen: false,
      },
      battleRecords: [
        ...state.battleRecords.filter(
          (item) => item.battleId !== record.battleId,
        ),
        record,
      ],
    };
  }
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: {
      ...active,
      phase: "question",
      roundIndex: active.answers.length,
      dialogueScene: null,
      storyState: null,
      frame: null,
      hintOpen: false,
      hintUsed: false,
    },
  };
}
export function leaveBattle(
  state: GameState,
  expectedRevision: number,
): GameState {
  if (
    state.activeTourism ||
    state.revision !== expectedRevision ||
    state.activeBattle?.phase !== "result"
  )
    return state;
  return { ...state, revision: state.revision + 1, activeBattle: null };
}

export function validateBattleState(state: GameState): void {
  if (
    new Set(state.battleRecords.map((item) => item.battleId)).size !==
    state.battleRecords.length
  )
    throw new Error("バトルの記録が重複しています。");
  for (const record of state.battleRecords) {
    if (
      !battles.some((item) => item.id === record.battleId) ||
      record.bestScore < Math.max(record.firstScore, record.lastScore) ||
      (record.attempts === 1 &&
        (record.firstScore !== record.lastScore ||
          record.firstScore !== record.bestScore)) ||
      (record.attempts === 2 &&
        record.bestScore !== Math.max(record.firstScore, record.lastScore))
    )
      throw new Error("バトルの成績が一致しません。");
  }
  const active = state.activeBattle;
  if (!active) return;
  if (state.activeDate) throw new Error("恋愛会話とバトルが重複しています。");
  const battle = battles.find((item) => item.id === active.battleId);
  if (!battle || active.contentHash !== battleFingerprint(active.battleId))
    throw new Error(
      "バトルが更新されています。以前の途中データは保管されています。",
    );
  const quiz = battleQuizzes[battle.quizId];
  active.answers.forEach((answer, index) => {
    const question = quiz.questions[index];
    if (
      answer.questionId !== question.id ||
      !question.options.some((option) => option.id === answer.optionId) ||
      answer.correct !== (question.correctOptionId === answer.optionId)
    )
      throw new Error("保存された回答が一致しません。");
  });
  if (active.score !== active.answers.filter((answer) => answer.correct).length)
    throw new Error("保存された得点が一致しません。");
  if (active.hintOpen && !active.hintUsed)
    throw new Error("ヒントの記録が一致しません。");
  if (
    (active.phase === "dialogue" || active.phase === "result") &&
    active.hintOpen
  )
    throw new Error("会話中にヒントは開けません。");
  if (
    active.answers.length &&
    active.phase !== "question" &&
    active.answers.at(-1)!.hintUsed !== active.hintUsed
  )
    throw new Error("回答時のヒント記録が一致しません。");
  if (
    active.phase === "question" &&
    active.answers.length !== active.roundIndex
  )
    throw new Error("問題の位置が一致しません。");
  if (
    (active.phase === "feedback" || active.phase === "result") &&
    active.answers.length !== active.roundIndex + 1
  )
    throw new Error("回答の位置が一致しません。");
  if (active.phase === "result") {
    const record = state.battleRecords.find(
      (item) => item.battleId === active.battleId,
    );
    if (
      active.answers.length !== 3 ||
      !record ||
      record.lastScore !== active.score
    )
      throw new Error("最終結果が一致しません。");
  }
  if (active.phase === "dialogue") {
    const expectedScene =
      active.answers.length === 0
        ? battle.scenes.intro
        : active.answers.length === 3
          ? battle.scenes.outro
          : battle.scenes.afterRounds[active.answers.length - 1];
    const expectedRound = Math.max(0, active.answers.length - 1);
    if (
      active.dialogueScene !== expectedScene ||
      active.roundIndex !== expectedRound ||
      !active.storyState ||
      !active.frame ||
      active.frame.choices.length
    )
      throw new Error("バトル会話の位置が一致しません。");
    validateStorySnapshot(battle.storyId, active.storyState, active.frame, {
      playerName: state.playerName,
      heroineName: state.heroineName,
      choiceCount: 0,
      variables: sceneVariables(active),
    });
  } else if (
    active.storyState !== null ||
    active.frame !== null ||
    active.dialogueScene !== null
  )
    throw new Error("不要な会話状態が保存されています。");
}
