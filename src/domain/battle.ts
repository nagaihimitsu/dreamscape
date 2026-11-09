import { z } from "zod";
import { sceneConditionReader } from "./scene-conditions";
import { hasObservation } from "../content/tourism-schemas";
import { battleCityId, finalizeBattleProgress, isEpisodeBlockedByStoryBattle, isEpisodeUnlocked, isStoryBattleUnlocked } from "./chapter";
import {
  battles,
  episodes,
  landmarks,
  battleQuizzes,
  progression,
  tourismClues,
  getCityStoryBackground,
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
import { scoreQuizAnswer } from "./quiz-answer";

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
    firstScore: z.number().int().min(0).max(5),
    bestScore: z.number().int().min(0).max(5),
    lastScore: z.number().int().min(0).max(5),
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
export const activeBattleSchema = z
  .object({
    battleId: z.string().min(1),
    runId: z.string().min(1),
    contentHash: z.string().min(1),
    phase: z.enum(["dialogue", "reasoning", "question", "feedback", "result"]),
    roundIndex: z.number().int().min(0).max(4),
    answers: z.array(battleAnswerSchema).max(5),
    score: z.number().int().min(0).max(5),
    hintOpen: z.boolean(),
    hintUsed: z.boolean(),
    dialogueScene: z.string().nullable(),
    storyState: z.string().nullable(),
    frame: storyFrameSchema.nullable(),
    reasoning: reasoningStateSchema.nullable(),
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

function hashBattle(battle: BattleDefinition, quiz: typeof battleQuizzes[string], clues: typeof tourismClues, storyId: string): string {
  const parts: unknown[] = [
    battle,
    quiz,
    storyFingerprint(storyId),
  ];
  // Preserve every existing A fingerprint; special proofs also depend on the case evidence.
  // The whole clue objects are hashed, relatedQuestionIds included (docs/07 「観察だけの手がかり」).
  if (battle.reasoning)
    parts.push(
      battle.reasoning.caseClueIds.map((clueId) =>
        clues.find((clue) => clue.id === clueId),
      ),
    );
  const content = JSON.stringify(parts);
  let hash = 2166136261;
  for (let index = 0; index < content.length; index++)
    hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
}

export function battleFingerprint(id: string): string {
  const battle = battles.find((item) => item.id === id);
  if (!battle) throw new Error("バトルが見つかりません。");
  return hashBattle(battle, battleQuizzes[battle.quizId], tourismClues, battle.storyId);
}

/** Only the current battle and its exact content can safely be resumed. */
export function getBattleContentByHash(battleId: string, contentHash: string) {
  const current = battles.find((item) => item.id === battleId);
  try {
    if (current && contentHash === battleFingerprint(battleId))
      return { battle: current, quiz: battleQuizzes[current.quizId], clues: tourismClues };
  } catch { /* Missing or changed content must not be resumed. */ }
  return null;
}

/** Resolve the exact published definition, quiz, evidence and Ink for an active run. */
export function getActiveBattleContent(active: ActiveBattle) {
  const content = getBattleContentByHash(active.battleId, active.contentHash);
  if (content) return content;
  throw new Error("バトルが更新されています。以前の途中データは保管されています。");
}

export function getBattleAvailability(
  state: GameState,
  battleId: string,
): Availability {
  return battleAvailability(state, battleId, false);
}

/**
 * `mapChecked`: the battle continues a visit whose departure from the map already checked that it
 * shows on the map (its observation, or the arrival at a place without one), so the map
 * condition is not checked again (decision 21; stage 2b).
 */
function battleAvailability(state: GameState, battleId: string, mapChecked: boolean): Availability {
  if (!battles.some((item) => item.id === battleId))
    return { available: false, reason: "バトルが見つかりません。" };
  if (battleCityId(battleId) !== state.currentCityId)
    return { available: false, reason: "この街の対決ではありません。" };
  if (state.activeEncounter)
    return { available: false, reason: "途中の交流を終えてから進めます。" };
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
  if (mapChecked) return { available: true, reason: "" };
  if (!isStoryBattleUnlocked(state, battleId))
    return { available: false, reason: "先に必要な観光を終えてから対決できます。" };
  if (episode && !isEpisodeUnlocked(state, episode))
    return {
      available: false,
      reason: "先の観光エピソードを終えると対決できます。",
    };
  if (episode && isEpisodeBlockedByStoryBattle(state, episode))
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
  const { battle } = getActiveBattleContent(active);
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
    [], {}, getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state),
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
  if (!active || !landmark || landmark.battleId !== battleId || state.activeBattle || state.activeEncounter) return state;
  const next = {
    ...state,
    activeTourism: null,
    visitedLandmarkIds: state.visitedLandmarkIds.includes(landmark.id)
      ? state.visitedLandmarkIds : [...state.visitedLandmarkIds, landmark.id],
  };
  const started = startBattleInternal(next, battleId, true);
  return started === next ? state : started;
}

/**
 * Start a battle that opens a visit or continues it (stage 2b): a landmark without a guide or
 * observation starts its battle on arrival, and one without an observation after its guide.
 * `mapChecked` as in battleAvailability.
 */
export function startVisitBattle(state: GameState, battleId: string, mapChecked: boolean): GameState {
  return startBattleInternal(state, battleId, mapChecked);
}

function startBattleInternal(state: GameState, battleId: string, mapChecked: boolean): GameState {
  if (!battleAvailability(state, battleId, mapChecked).available) return state;
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
  const battle = active ? getActiveBattleContent(active).battle : undefined;
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
        continueStory(battle.storyId, current.storyState!, current.frame!, [], {}, {}, sceneConditionReader(state)),
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
  // The clue book's rule (canToggleReasoningClue) decides whether this clue can be chosen or put back.
  if (state.revision !== expectedRevision || !canToggleReasoningClue(state, clueId)) return state;
  const active = state.activeBattle!;
  const config = getActiveBattleContent(active).battle.reasoning!;
  const reasoning = active.reasoning!;
  const selected = reasoning.selectedClueIds;
  const next = selected.includes(clueId)
    ? selected.filter((id) => id !== clueId)
    : config.kind === "contradiction"
      ? [clueId]
      : [...selected, clueId];
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: {
      ...active,
      reasoning: {
        ...reasoning,
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
  const config = active ? getActiveBattleContent(active).battle.reasoning : undefined;
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

/** How many clues a special battle's evidence takes (B: 1, C: 2), as the panel and the clue book show it. */
export function reasoningEvidenceCount(rule: NonNullable<BattleDefinition["reasoning"]>): number {
  return rule.correctClueIds.length;
}

/**
 * The clue book's 「この証拠を選ぶ」／「外す」 for one clue of the case: a chosen clue can always be
 * put back; B replaces its one choice; C takes a new clue only while fewer than two are chosen.
 */
export function canToggleReasoningClue(state: GameState, clueId: string): boolean {
  const active = state.activeBattle;
  const rule = active ? getActiveBattleContent(active).battle.reasoning : undefined;
  if (state.activeTourism || active?.phase !== "reasoning" || !active.reasoning || !rule || !rule.caseClueIds.includes(clueId)) return false;
  const selected = active.reasoning.selectedClueIds;
  return selected.includes(clueId) || selected.length < reasoningEvidenceCount(rule) || rule.kind === "contradiction";
}

/** The evidence button (ReasoningPanel): enabled once the chosen clues reach the count. */
export function canSubmitBattleEvidence(state: GameState): boolean {
  const active = state.activeBattle;
  const rule = active ? getActiveBattleContent(active).battle.reasoning : undefined;
  return !state.activeTourism && active?.phase === "reasoning" && !!active.reasoning && !!rule &&
    active.reasoning.selectedClueIds.length === reasoningEvidenceCount(rule);
}

/**
 * The landmark the clue book's 「観光に戻って調べる」 reopens during a battle (GameApp): the battle's own
 * landmark, for a battle without reasoning (special battles B and C keep the player in the case).
 */
export function getBattleObservationLandmarkId(state: GameState): string | null {
  const active = state.activeBattle;
  if (!active || state.activeTourism) return null;
  const { battle } = getActiveBattleContent(active);
  const landmarkId = battle.landmarkId;
  // A landmark without an observation (stage 2b) has none to return to.
  if (battle.reasoning || !landmarkId || !landmarks.some((landmark) => landmark.id === landmarkId && hasObservation(landmark))) return null;
  return landmarkId;
}

export function submitBattleEvidence(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeBattle;
  const config = active ? getActiveBattleContent(active).battle.reasoning : undefined;
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
  const { quiz } = getActiveBattleContent(active);
  const question = quiz.questions[active.roundIndex];
  const correct = scoreQuizAnswer(question, optionId);
  if (correct === null) return state;
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
  const { battle, quiz } = getActiveBattleContent(active);
  if (active.phase === "feedback") {
    const scene =
      active.roundIndex === quiz.questions.length - 1
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
    const step = continueStory(battle.storyId, active.storyState, active.frame, [], {}, {}, sceneConditionReader(state));
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
  const { battle, quiz } = getActiveBattleContent(active);
  if (battleCityId(battle.id) !== state.currentCityId)
    throw new Error("対決の都市と現在地が一致しません。");
  const episode = episodes.find((item) => item.battleId === battle.id);
  // A map condition (`when`) was checked on departing and may have turned false since (decision 21).
  if (episode && !episode.when && !isEpisodeUnlocked(state, episode))
    throw new Error("未解放のバトルの途中記録です。");
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
