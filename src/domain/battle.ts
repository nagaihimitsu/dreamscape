import { z } from "zod";
import { finalizeBattleProgress, isEpisodeBlockedByStoryBattle, isEpisodeUnlocked } from "./chapter";
import {
  battles,
  episodes,
  landmarks,
  battleQuizzes,
  progression,
  tourismClues,
  type BattleDefinition,
} from "../content";
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
export const legacyBattleRecordSchema = z
  .object({
    battleId: z.string().min(1),
    attempts: z.number().int().positive(),
    firstScore: z.number().int().min(0).max(3),
    bestScore: z.number().int().min(0).max(3),
    lastScore: z.number().int().min(0).max(3),
  })
  .strict();
export const battleRecordSchema = legacyBattleRecordSchema
  .extend({
    firstScore: z.number().int().min(0).max(5),
    bestScore: z.number().int().min(0).max(5),
    lastScore: z.number().int().min(0).max(5),
  })
  .strict();
export const legacyActiveBattleSchema = z
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
/** One small proof step per special battle; quiz answers remain the only score source. */
const reasoningStateSchema = z
  .object({
    statementId: z.string().min(1),
    selectedClueIds: z.array(z.string().min(1)).max(2),
    submittedClueIds: z.array(z.string().min(1)).max(2),
    pressed: z.boolean(),
    status: z.enum(["selecting", "incorrect", "accepted"]),
  })
  .strict();
export const phase6ActiveBattleSchema = legacyActiveBattleSchema
  .extend({
    phase: z.enum(["dialogue", "reasoning", "question", "feedback", "result"]),
    reasoning: reasoningStateSchema.nullable(),
  })
  .strict();
export const activeBattleSchema = phase6ActiveBattleSchema
  .extend({
    roundIndex: z.number().int().min(0).max(4),
    answers: z.array(battleAnswerSchema).max(5),
    score: z.number().int().min(0).max(5),
  })
  .strict();
export type ActiveBattle = z.infer<typeof activeBattleSchema>;
export type BattleRecord = z.infer<typeof battleRecordSchema>;
export type BattleOutcome = "perfect" | "victory" | "defeat";
export function getBattleOutcome(score: number, total = 3): BattleOutcome {
  return score === total
    ? "perfect"
    : score >= Math.ceil(total * 0.6)
      ? "victory"
      : "defeat";
}

export function battleFingerprint(id: string): string {
  const battle = battles.find((item) => item.id === id);
  if (!battle) throw new Error("バトルが見つかりません。");
  const parts: unknown[] = [
    battle,
    battleQuizzes[battle.quizId],
    storyFingerprint(battle.storyId),
  ];
  // Preserve every existing A fingerprint; special proofs also depend on the case evidence.
  if (battle.reasoning)
    parts.push(
      battle.reasoning.caseClueIds.map((clueId) =>
        tourismClues.find((clue) => clue.id === clueId),
      ),
    );
  const content = JSON.stringify(parts);
  let hash = 2166136261;
  for (let index = 0; index < content.length; index++)
    hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
}

export function getBattleAvailability(
  state: GameState,
  battleId: string,
): Availability {
  return battleAvailability(state, battleId, false);
}

function battleAvailability(state: GameState, battleId: string, continuingTourism: boolean): Availability {
  if (!battles.some((item) => item.id === battleId))
    return { available: false, reason: "バトルが見つかりません。" };
  if (state.activeTourism)
    return { available: false, reason: "観光画面からバトルへ進んでください。" };
  if (state.activeDate || state.activeEpilogue)
    return { available: false, reason: "途中の恋愛会話を終えてから試せます。" };
  if (state.activeBattle && state.activeBattle.phase !== "result")
    return {
      available: false,
      reason: "途中のクイズバトルを再開してください。",
    };
  const episode = episodes.find((item) => item.battleId === battleId);
  if (episode && !isEpisodeUnlocked(state, episode))
    return {
      available: false,
      reason: "先の観光エピソードを終えると対決できます。",
    };
  if (episode && !continuingTourism && isEpisodeBlockedByStoryBattle(state, episode))
    return { available: false, reason: "先に、旅の途中の対決へ進みましょう。" };
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
  return startBattleInternal(state, battleId, false);
}

/** A sightseeing scene already in progress before an update must still finish. */
export function startBattleFromTourism(state: GameState, battleId: string): GameState {
  const active = state.activeTourism;
  const landmark = landmarks.find((item) => item.id === active?.landmarkId);
  if (!active || !landmark || landmark.battleId !== battleId || state.activeBattle) return state;
  const next = {
    ...state,
    activeTourism: null,
    visitedLandmarkIds: state.visitedLandmarkIds.includes(landmark.id)
      ? state.visitedLandmarkIds : [...state.visitedLandmarkIds, landmark.id],
  };
  const started = startBattleInternal(next, battleId, true);
  return started === next ? state : started;
}

function startBattleInternal(state: GameState, battleId: string, continuingTourism: boolean): GameState {
  if (!battleAvailability(state, battleId, continuingTourism).available) return state;
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
    reasoning: null,
  };
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: withDialogue(state, active, battle.scenes.intro),
    battleRewardReceipt: null,
  };
}
function sameClues(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}
function specialScene(battle: BattleDefinition, scene: string | null): boolean {
  const config = battle.reasoning;
  return (
    !!config &&
    scene !== null &&
    [
      config.claimScene,
      config.successScene,
      config.failureScene,
      config.kind === "contradiction" ? config.pressScene : null,
    ].includes(scene)
  );
}

/** Current case statement is always readable, including while the notebook is open. */
export function getReasoningContext(
  state: GameState,
): { claimText: string; pressedText: string | null } | null {
  const active = state.activeBattle;
  const battle = battles.find((item) => item.id === active?.battleId);
  const config = battle?.reasoning;
  if (!active || !battle || !config) return null;
  // A later quiz answer must not rewrite the statement that introduced this proof.
  const priorAnswers = active.answers.slice(0, config.roundIndex);
  const context = {
    ...active,
    answers: priorAnswers,
    score: priorAnswers.filter((answer) => answer.correct).length,
  };
  const readScene = (scene: string, enemyOnly = false): string => {
    let current = withDialogue(state, context, scene);
    const lines: string[] = [];
    for (let count = 0; count < 200; count++) {
      if ((!enemyOnly || current.frame!.speaker === "enemy") && current.frame!.text && current.frame!.text !== lines.at(-1))
        lines.push(current.frame!.text);
      if (current.frame!.ended) return lines.join("\n");
      current = fromStory(
        current,
        continueStory(battle.storyId, current.storyState!, current.frame!),
      );
    }
    throw new Error("推理の主張が長すぎます。");
  };
  return {
    claimText: readScene(config.claimScene, true),
    pressedText:
      active.reasoning?.pressed && config.kind === "contradiction"
        ? readScene(config.pressScene)
        : null,
  };
}

export function selectReasoningClue(
  state: GameState,
  clueId: string,
  expectedRevision: number,
): GameState {
  const active = state.activeBattle;
  const config = battles.find(
    (item) => item.id === active?.battleId,
  )?.reasoning;
  if (
    state.activeTourism ||
    state.revision !== expectedRevision ||
    active?.phase !== "reasoning" ||
    !active.reasoning ||
    !config ||
    !config.caseClueIds.includes(clueId)
  )
    return state;
  const selected = active.reasoning.selectedClueIds;
  const next = selected.includes(clueId)
    ? selected.filter((id) => id !== clueId)
    : config.kind === "contradiction"
      ? [clueId]
      : selected.length < 2
        ? [...selected, clueId]
        : selected;
  if (next === selected) return state;
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: {
      ...active,
      reasoning: {
        ...active.reasoning,
        selectedClueIds: next,
        submittedClueIds: [],
        status: "selecting",
      },
    },
  };
}

export function pressBattleClaim(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeBattle;
  const config = battles.find(
    (item) => item.id === active?.battleId,
  )?.reasoning;
  if (
    state.activeTourism ||
    state.revision !== expectedRevision ||
    active?.phase !== "reasoning" ||
    !active.reasoning ||
    config?.kind !== "contradiction"
  )
    return state;
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: withDialogue(
      state,
      {
        ...active,
        reasoning: { ...active.reasoning, pressed: true },
      },
      config.pressScene,
    ),
  };
}

export function submitBattleEvidence(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeBattle;
  const config = battles.find(
    (item) => item.id === active?.battleId,
  )?.reasoning;
  if (
    state.activeTourism ||
    state.revision !== expectedRevision ||
    active?.phase !== "reasoning" ||
    !active.reasoning ||
    !config ||
    active.reasoning.selectedClueIds.length !== config.correctClueIds.length
  )
    return state;
  const accepted = sameClues(
    active.reasoning.selectedClueIds,
    config.correctClueIds,
  );
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: withDialogue(
      state,
      {
        ...active,
        reasoning: {
          ...active.reasoning,
          submittedClueIds: [...active.reasoning.selectedClueIds],
          status: accepted ? "accepted" : "incorrect",
        },
      },
      accepted ? config.successScene : config.failureScene,
    ),
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
      active.roundIndex === battleQuizzes[battle.quizId].questions.length - 1
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
  if (specialScene(battle, active.dialogueScene)) {
    return {
      ...state,
      revision: state.revision + 1,
      activeBattle: {
        ...active,
        phase:
          active.reasoning!.status === "accepted" ? "question" : "reasoning",
        dialogueScene: null,
        storyState: null,
        frame: null,
        hintOpen: false,
        hintUsed: false,
      },
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
    return finalizeBattleProgress({
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
    });
  }
  const config = battle.reasoning;
  if (
    config &&
    config.roundIndex === active.answers.length &&
    !active.reasoning
  ) {
    return {
      ...state,
      revision: state.revision + 1,
      activeBattle: withDialogue(
        state,
        {
          ...active,
          roundIndex: config.roundIndex,
          hintOpen: false,
          hintUsed: false,
          reasoning: {
            statementId: config.claimScene,
            selectedClueIds: [],
            submittedClueIds: [],
            pressed: false,
            status: "selecting",
          },
        },
        config.claimScene,
      ),
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
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: null,
    battleRewardReceipt: null,
  };
}

export function validateBattleState(state: GameState): void {
  if (
    new Set(state.battleRecords.map((item) => item.battleId)).size !==
    state.battleRecords.length
  )
    throw new Error("バトルの記録が重複しています。");
  for (const record of state.battleRecords) {
    const definition = battles.find((item) => item.id === record.battleId);
    const total = definition
      ? battleQuizzes[definition.quizId].questions.length
      : 0;
    if (
      Math.max(record.firstScore, record.bestScore, record.lastScore) > total ||
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
  if (state.activeDate || state.activeEpilogue)
    throw new Error("恋愛会話とバトルが重複しています。");
  const battle = battles.find((item) => item.id === active.battleId);
  if (!battle || active.contentHash !== battleFingerprint(active.battleId))
    throw new Error(
      "バトルが更新されています。以前の途中データは保管されています。",
    );
  const episode = episodes.find((item) => item.battleId === battle.id);
  if (episode && !isEpisodeUnlocked(state, episode))
    throw new Error("未解放のバトルの途中記録です。");
  const quiz = battleQuizzes[battle.quizId];
  if (
    active.answers.length > quiz.questions.length ||
    active.roundIndex >= quiz.questions.length ||
    active.score > quiz.questions.length
  )
    throw new Error("問題数と保存された得点が一致しません。");
  const isSpecialScene = specialScene(battle, active.dialogueScene);
  validateReasoningState(active, battle);
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
    active.phase !== "question" &&
    active.phase !== "feedback" &&
    active.hintOpen
  )
    throw new Error("会話中にヒントは開けません。");
  if (
    active.answers.length &&
    active.phase !== "question" &&
    active.phase !== "reasoning" &&
    !isSpecialScene &&
    active.answers.at(-1)!.hintUsed !== active.hintUsed
  )
    throw new Error("回答時のヒント記録が一致しません。");
  if (
    (active.phase === "question" || active.phase === "reasoning") &&
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
      active.answers.length !== quiz.questions.length ||
      !record ||
      record.lastScore !== active.score
    )
      throw new Error("最終結果が一致しません。");
  }
  if (active.phase === "dialogue") {
    const expectedScene = isSpecialScene
      ? active.dialogueScene
      : active.answers.length === 0
        ? battle.scenes.intro
        : active.answers.length === quiz.questions.length
          ? battle.scenes.outro
          : battle.scenes.afterRounds[active.answers.length - 1];
    const expectedRound = isSpecialScene
      ? battle.reasoning!.roundIndex
      : Math.max(0, active.answers.length - 1);
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

/** Do not accept forged proof flags, unrelated evidence, or a skipped proof stage. */
function validateReasoningState(
  active: ActiveBattle,
  battle: BattleDefinition,
): void {
  const config = battle.reasoning;
  const proof = active.reasoning;
  const special = specialScene(battle, active.dialogueScene);
  const fail = () => {
    throw new Error("保存された推理の進行が一致しません。");
  };
  if (!config) {
    if (proof || active.phase === "reasoning") fail();
    return;
  }
  if (!proof) {
    if (
      special ||
      active.phase === "reasoning" ||
      (active.roundIndex >= config.roundIndex && active.phase !== "dialogue") ||
      active.answers.length > config.roundIndex
    )
      fail();
    return;
  }
  if (
    proof.statementId !== config.claimScene ||
    active.roundIndex < config.roundIndex ||
    (active.answers.length === config.roundIndex &&
      active.phase === "dialogue" &&
      !special)
  )
    fail();
  for (const ids of [proof.selectedClueIds, proof.submittedClueIds]) {
    if (
      new Set(ids).size !== ids.length ||
      ids.length > config.correctClueIds.length ||
      ids.some((id) => !config.caseClueIds.includes(id))
    )
      fail();
  }
  if (config.kind === "connection" && proof.pressed) fail();
  if (proof.status === "selecting") {
    if (proof.submittedClueIds.length) fail();
  } else {
    if (
      proof.submittedClueIds.length !== config.correctClueIds.length ||
      !sameClues(proof.selectedClueIds, proof.submittedClueIds) ||
      (proof.status === "accepted") !==
        sameClues(proof.submittedClueIds, config.correctClueIds)
    )
      fail();
  }
  if (
    active.phase === "reasoning" &&
    (proof.status === "accepted" || active.roundIndex !== config.roundIndex)
  )
    fail();
  if (special) {
    if (
      active.phase !== "dialogue" ||
      active.roundIndex !== config.roundIndex ||
      active.answers.length !== config.roundIndex ||
      active.hintUsed
    )
      fail();
    if (
      active.dialogueScene === config.claimScene &&
      (proof.pressed ||
        proof.status !== "selecting" ||
        proof.selectedClueIds.length)
    )
      fail();
    if (
      config.kind === "contradiction" &&
      active.dialogueScene === config.pressScene &&
      (!proof.pressed || proof.status === "accepted")
    )
      fail();
    if (
      active.dialogueScene === config.successScene &&
      proof.status !== "accepted"
    )
      fail();
    if (
      active.dialogueScene === config.failureScene &&
      proof.status !== "incorrect"
    )
      fail();
  } else if (active.phase !== "reasoning" && proof.status !== "accepted")
    fail();
  if (active.phase === "reasoning" && active.hintUsed) fail();
}
