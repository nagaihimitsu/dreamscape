import { z } from "zod";
import { sceneConditionReader } from "./scene-conditions";
import { hasObservation } from "../content/tourism-schemas";
import { splitStoryAddress } from "../content/story-address";
import { applyChoiceEffects, applyDoneEffects, choiceDisplay, sceneOption, type ChoiceDisplay } from "./scene-effects";
import { mainScene, sceneOfAddress } from "./reservations";
import { advanceRunningOccasion } from "./occasion-hooks";
import { evaluateProgression } from "./date-rules";
import { battleCityId, finalizeBattleProgress, isEpisodeBlockedByStoryBattle, isEpisodeUnlocked, isStoryBattleUnlocked } from "./chapter";
import {
  battles,
  episodes,
  landmarks,
  battleQuizzes,
  progression,
  stories,
  tourismClues,
  getCityStoryBackground,
  type BattleDefinition,
} from "../content";
import {
  beginStory,
  continueStory,
  frameCall,
  readStoryKnotLines,
  peekStoryLine,
  selectStoryChoice,
  storyCallAt,
  storyFingerprint,
  storyFrameSchema,
  storyVariables,
  validateStorySnapshot,
  type StoryStep,
} from "../story/runtime";
import { storyFileOf } from "../content/story-address";
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
    storyState: z.string().nullable(),
    frame: storyFrameSchema.nullable(),
    reasoning: reasoningStateSchema.nullable(),
    /**
     * How many choices Ink has taken in this run (each quiz's return, each press or evidence, each choice of the
     * conversation; its saved story is checked against it).
     */
    turns: z.number().int().nonnegative(),
    /** The conversation's choices whose tags this run applied (decision 10: once per battle, and only on its first play). */
    appliedOptionIds: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/u)),
    /** A special battle's line before its first stop point: its claim (from the helper knot) or its rebuttal (after the claim). */
    linePart: z.enum(["claim", "rebuttal"]).optional(),
    /** The line ends a part before the first stop (the lines before the claim, the claim before its rebuttal): 「次へ進む」 there. */
    sceneEnd: z.literal(true).optional(),
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
  if (!battle) throw new Error("クイズが見つかりません。");
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
  throw new Error("クイズが更新されています。以前の途中データは保管されています。");
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
    return { available: false, reason: "クイズが見つかりません。" };
  if (battleCityId(battleId) !== state.currentCityId)
    return { available: false, reason: "この街のクイズではありません。" };
  if (state.activeEncounter)
    return { available: false, reason: "途中の交流を終えてから進めます。" };
  if (state.activeTourism)
    return { available: false, reason: "観光画面からクイズへ進んでください。" };
  if (state.activeDate || state.activeEpilogue)
    return { available: false, reason: "途中の恋愛会話を終えてから試せます。" };
  if (state.activeBattle && state.activeBattle.phase !== "result")
    return {
      available: false,
      reason: "途中のクイズを再開してください。",
    };
  const episode = episodes.find((item) => item.battleId === battleId);
  if (mapChecked) return { available: true, reason: "" };
  if (!isStoryBattleUnlocked(state, battleId))
    return { available: false, reason: "先に必要な観光を終えると、クイズへ進めます。" };
  if (episode && !isEpisodeUnlocked(state, episode))
    return {
      available: false,
      reason: "先の観光エピソードを終えると、クイズへ進めます。",
    };
  if (episode && isEpisodeBlockedByStoryBattle(state, episode))
    return { available: false, reason: "先に、旅の途中のクイズへ進みましょう。" };
  return { available: true, reason: "" };
}
function playerAddress(state: GameState): string {
  const suffix = progression.stages.find(
    (item) => item.stage === state.romanceStage,
  )!.playerSuffix;
  return `${state.playerName}${suffix}`;
}

// ── The battle's flow: its Ink runs from its start (the place file's knot or the file's top) and calls
// `-> quiz(n) ->` and `-> reasoning ->` (modules.ink), which the game answers ───────────────────────────

/** The answers Ink has been told (an answer on its right-or-wrong screen is passed as the player leaves it). */
const passedAnswers = (active: ActiveBattle) => (active.phase === "feedback" ? active.answers.slice(0, -1) : active.answers);
/** The variables a battle's Ink holds: the last quiz it returned from and the score so far (4.4). */
function flowVariables(active: Pick<ActiveBattle, "answers" | "phase">) {
  const passed = passedAnswers(active as ActiveBattle);
  const correct = passed.at(-1)?.correct ?? false;
  return { quiz_correct: correct, answer_correct: correct, battle_score: passed.filter((answer) => answer.correct).length };
}
/** The helper knot of a special battle's claim (`-> <battle>_claim ->`) and, when written, its press (`<battle>_press`). */
const flowKnotName = (battle: BattleDefinition) => splitStoryAddress(battle.storyId).path ?? storyFileOf(battle.storyId).split("/").at(-1)!;
export const flowClaimKnot = (battle: BattleDefinition) => `${flowKnotName(battle)}_claim`;
export const flowPressKnot = (battle: BattleDefinition) => `${flowKnotName(battle)}_press`;
const flowHelperAddress = (battle: BattleDefinition, knot: string) => `${storyFileOf(battle.storyId)}.${knot}`;
/** The dialogue's round: the last answered question, or the reasoning's from its claim on. */
function flowDialogueRound(active: ActiveBattle, battle: BattleDefinition): number {
  const config = battle.reasoning;
  if (config && (active.reasoning || active.linePart) && active.answers.length === config.roundIndex) return config.roundIndex;
  return Math.max(0, active.answers.length - 1);
}
/** A battle's lines without the marks of its first stop's lead-in (a call, the result). */
function withoutLinePart(active: ActiveBattle): ActiveBattle {
  const { linePart: _part, sceneEnd: _end, ...rest } = active;
  return rest;
}
/** The claim knot to tell the claim's lines by: a special battle's lines before its first stop, after quiz(roundIndex). */
function claimToTrack(active: Pick<ActiveBattle, "reasoning" | "answers">, battle: BattleDefinition): string | undefined {
  const config = battle.reasoning;
  return config && !active.reasoning && active.answers.length === config.roundIndex ? flowClaimKnot(battle) : undefined;
}
/**
 * Whether a line before the first stop ends a part: the line before the claim, and the claim's last line before its
 * rebuttal. The next line (read on a copy) says it. A line before a call or the end ends its part anyway
 * (battleDialogueStop).
 */
function flowSceneEnds(state: GameState, active: ActiveBattle, battle: BattleDefinition, knot: string): boolean {
  if (active.phase !== "dialogue" || !active.frame || !active.storyState || active.frame.choices.length || active.frame.ended) return false;
  if (active.linePart === "rebuttal") return false;
  const next = peekStoryLine(battle.storyId, active.storyState, state.memories, state.inventory, sceneConditionReader(state), knot);
  return active.linePart === "claim" ? next.line && !next.inKnot : next.inKnot;
}

/** Where the flow goes after Ink moved: a line to show, a call to answer, or the battle's end. */
function settleFlow(state: GameState, active: ActiveBattle, step: StoryStep): GameState {
  const { battle } = getActiveBattleContent(active);
  if (step.effects.length) throw new Error("バトル会話に # effect: は書けません。");
  const moved: ActiveBattle = withoutLinePart({ ...active, storyState: step.storyState, frame: step.frame, hintOpen: false });
  if (step.lineRead || frameCall(step.frame) === undefined && !step.frame.ended) {
    const knot = claimToTrack(moved, battle);
    // Before the first stop: the claim's lines (from its knot), then the rebuttal's (after it).
    const part = knot === undefined ? undefined : !step.lineRead ? active.linePart : step.inKnot ? "claim" : active.linePart ? "rebuttal" : undefined;
    const line: ActiveBattle = { ...moved, phase: "dialogue", ...(part ? { linePart: part } : {}) };
    const sceneEnd = knot !== undefined && flowSceneEnds(state, line, battle, knot);
    return { ...state, activeBattle: { ...line, ...(sceneEnd ? { sceneEnd: true as const } : {}), roundIndex: flowDialogueRound(line, battle) } };
  }
  return frameCall(step.frame) ? enterFlowCall(state, moved) : finishBattle(state, moved);
}

/** The flow stops at a call: the quiz's screen, or the reasoning's (the player's next action answers it). */
function enterFlowCall(state: GameState, active: ActiveBattle): GameState {
  const { battle, quiz } = getActiveBattleContent(active);
  const at = storyCallAt(battle.storyId, active.storyState!);
  if (!at) throw new Error("バトルの呼び口が見つかりません。");
  const rest = { ...withoutLinePart(active), frame: null, hintOpen: false, hintUsed: false };
  if (at.call === "quiz") {
    // content:build checks that every path calls quiz 1..n once, in order (A16).
    if (at.arg !== active.answers.length + 1 || at.arg > quiz.questions.length)
      throw new Error("クイズの呼び出しの順が一致しません。");
    return { ...state, activeBattle: { ...rest, phase: "question", roundIndex: active.answers.length } };
  }
  const config = battle.reasoning;
  if (!config || active.answers.length !== config.roundIndex) throw new Error("推理の止まる所が一致しません。");
  const reasoning = active.reasoning
    ? active.reasoning.status === "accepted" ? { ...active.reasoning, submittedClueIds: [], status: "selecting" as const } : active.reasoning
    : { statementId: flowClaimKnot(battle), selectedClueIds: [], submittedClueIds: [], pressed: false, status: "selecting" as const };
  return { ...state, activeBattle: { ...rest, phase: "reasoning", roundIndex: config.roundIndex, reasoning } };
}

/** Pass the call's answer to Ink and go on from it, in a fresh frame. */
function returnFromFlowCall(state: GameState, active: ActiveBattle, variables: Record<string, string | number | boolean>): GameState {
  const { battle } = getActiveBattleContent(active);
  // Every answer so far, the one on its right-or-wrong screen included, is passed now.
  const step = selectStoryChoice(battle.storyId, active.storyState!, undefined, 0, state.memories,
    { ...flowVariables({ answers: active.answers, phase: "dialogue" }), ...variables }, {}, state.inventory, sceneConditionReader(state),
    getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), claimToTrack(active, battle));
  return settleFlow(state, { ...active, turns: active.turns + 1 }, step);
}

function startFlowBattle(state: GameState, active: ActiveBattle, battle: BattleDefinition): GameState {
  const step = beginStory(battle.storyId, state.playerName, state.heroineName,
    { ...flowVariables(active), player_address: playerAddress(state), call_arg: 0, reasoning_action: "", evidence_result: "" },
    state.memories, state.inventory, getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state),
    claimToTrack(active, battle));
  return settleFlow(state, active, step);
}

/** The scene of the battle's own tags (its choices' effects; a place file's knot or its one-scene file). */
const battleScene = (battle: BattleDefinition) => sceneOfAddress(battle.storyId);

/** How a choice of the battle's conversation shows (decision 43; stage 5). */
export function battleChoiceDisplay(state: GameState, index: number): ChoiceDisplay {
  const active = state.activeBattle;
  const choice = active?.phase === "dialogue" ? active.frame?.choices.find((item) => item.index === index && !item.call) : undefined;
  if (!active || !choice) return { show: "grey", reason: "この選択肢は使えません。" };
  const scene = battleScene(getActiveBattleContent(active).battle);
  const option = sceneOption(scene, choice.optionId);
  if (scene && choice.optionId !== undefined && !option) return { show: "hidden" };
  return choiceDisplay(state, option);
}

/**
 * Choose in the battle's conversation (stage 5): the choice's tags apply first, once per battle (decision 10): only on
 * the battle's first play (no result recorded yet) and once for each choice in the run (a stop point Ink comes back to
 * offers it again). Then Ink goes on from the choice.
 */
export function chooseBattle(state: GameState, index: number, expectedRevision: number, nextRoll?: () => number): GameState {
  const active = state.activeBattle;
  if (state.activeTourism || state.revision !== expectedRevision || active?.phase !== "dialogue" || !active.frame || !active.storyState ||
      battleChoiceDisplay(state, index).show !== "open") return state;
  const { battle } = getActiveBattleContent(active);
  const choice = active.frame.choices.find((item) => item.index === index)!;
  const scene = battleScene(battle);
  const option = sceneOption(scene, choice.optionId);
  const revision = state.revision + 1;
  const firstPlay = !state.battleRecords.some((record) => record.battleId === battle.id);
  const apply = !!option && !!scene && firstPlay && !active.appliedOptionIds.includes(option.id);
  const applied = apply ? applyChoiceEffects(state, scene!.id, option!, revision, nextRoll) : { state };
  const next = applied.state;
  const result: Record<string, string> = "profile" in applied && applied.profile ? { romance_result: applied.profile.result } : {};
  const step = selectStoryChoice(battle.storyId, active.storyState, active.frame, index, next.memories, {}, result, next.inventory, sceneConditionReader(next),
    undefined, claimToTrack(active, battle));
  const moved = settleFlow({ ...next, revision }, {
    ...active, turns: active.turns + 1, appliedOptionIds: apply ? [...active.appliedOptionIds, option!.id] : active.appliedOptionIds,
  }, step);
  return apply && (option!.rel || option!.profile) ? evaluateProgression(moved) : moved;
}

/** Record the result (any score) and show the result screen. */
function finishBattle(state: GameState, active: ActiveBattle): GameState {
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
  const recorded = finalizeBattleProgress({
    ...state,
    activeBattle: {
      ...withoutLinePart(active),
      phase: "result",
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
  // The battle's main # on_done: (its knot head or its file's head), once: when its first result is recorded (any score).
  const doneScene = previous ? undefined : mainScene({ battle: active.battleId });
  if (!doneScene) return recorded;
  const paid = applyDoneEffects(recorded, doneScene.id, doneScene.done, recorded.revision);
  return doneScene.done.rel ? evaluateProgression(paid) : paid;
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
    storyState: null,
    frame: null,
    reasoning: null,
    turns: 0,
    appliedOptionIds: [],
  };
  return startFlowBattle({ ...state, revision: state.revision + 1, battleRewardReceipt: null }, active, battle);
}
function sameClues(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
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
  // The flow's helper knots, read on their own with the variables as the flow had them at its stop point,
  // and with the names, memories and items as the flow reads them.
  const variables = { ...flowVariables({ answers: priorAnswers, phase: "dialogue" }), player_name: state.playerName,
    heroine_name: state.heroineName, player_address: playerAddress(state) };
  const read = (knot: string, enemyOnly: boolean) => {
    const lines: string[] = [];
    let found: { text: string; speaker: string }[] = [];
    // The clue book never stops the screen: content:build stops a helper that errors or reaches a choice.
    try { found = readStoryKnotLines(flowHelperAddress(battle, knot), variables, sceneConditionReader(state), state.memories, state.inventory); }
    catch { found = []; }
    for (const line of found)
      if ((!enemyOnly || line.speaker === "enemy") && line.text !== lines.at(-1)) lines.push(line.text);
    return lines.join("\n");
  };
  const hasPress = config.kind === "contradiction" && storyHasKnot(battle, flowPressKnot(battle));
  return {
    claimText: read(flowClaimKnot(battle), true),
    pressedText: active.reasoning?.pressed && hasPress ? read(flowPressKnot(battle), false) : null,
  };
}

/** Whether the battle's story file has a knot (a special battle's optional press helper). */
function storyHasKnot(battle: BattleDefinition, knot: string): boolean {
  const compiled = stories[storyFileOf(battle.storyId)];
  if (!compiled) return false;
  const root = (JSON.parse(compiled) as { root: unknown[] }).root;
  const named = root.at(-1);
  return !!named && typeof named === "object" && Object.hasOwn(named, knot);
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
  const battle = active ? getActiveBattleContent(active).battle : undefined;
  const config = battle?.reasoning;
  if (
    state.activeTourism ||
    state.revision !== expectedRevision ||
    active?.phase !== "reasoning" ||
    !active.reasoning ||
    config?.kind !== "contradiction"
  )
    return state;
  const pressed = { ...active, reasoning: { ...active.reasoning, pressed: true } };
  return returnFromFlowCall({ ...state, revision: state.revision + 1 }, pressed, { reasoning_action: "press", evidence_result: "" });
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
  const battle = active ? getActiveBattleContent(active).battle : undefined;
  const config = battle?.reasoning;
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
  const submitted: ActiveBattle = {
    ...active,
    reasoning: {
      ...active.reasoning,
      submittedClueIds: [...active.reasoning.selectedClueIds],
      status: accepted ? "accepted" : "incorrect",
    },
  };
  // The evidence does not change the score (decision 35).
  return returnFromFlowCall({ ...state, revision: state.revision + 1 }, submitted,
    { reasoning_action: "evidence", evidence_result: accepted ? "success" : "failure" });
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

/** What the battle's next tap does in its dialogue: the next line, the next screen (a call or the result), or nothing (choices). */
export function battleDialogueStop(active: ActiveBattle): "line" | "quiz" | "reasoning" | "end" | "choices" {
  const frame = active.frame;
  if (!frame) return "line";
  const call = frameCall(frame);
  if (call) return call;
  if (frame.choices.length) return "choices";
  return frame.ended ? "end" : "line";
}

/** What the battle screen shows around its line (BattleScreen). */
export type BattleChrome = {
  /** A line of a special battle's rebuttal (after its claim, before its first stop point). */
  rebuttal: boolean;
  /** The line waits for one of the conversation's choices (no next tap). */
  choosing: boolean;
  /** The 「次へ進む」 (or 「問題へ進む」, 「結果を見る」) button under the line: the end of a part (before a call, the result, or a part's end before the first stop). */
  advance: { label: string; testId: "battle-advance" | "reasoning-rebuttal-advance" } | null;
  /**
   * 手がかり帳 in the header, the battle's only one (user decision 2026-11-11): the header shows it at a choice
   * (hud-view.ts: the talk's choices, a question, the reasoning stop) and keeps its room otherwise. Never during a
   * rebuttal, which leads straight into the proof.
   */
  notebookTab: boolean;
};
/** The chrome of the battle screen now. */
export function battleChrome(active: ActiveBattle, battle: BattleDefinition): BattleChrome {
  const dialogue = active.phase === "dialogue";
  const stop = dialogue ? battleDialogueStop(active) : null;
  const rebuttal = dialogue && active.linePart === "rebuttal";
  const partEnd = stop === "quiz" || stop === "reasoning" || stop === "end" || !!active.sceneEnd;
  const label = stop === "end" ? "結果を見る" : battle.reasoning ? "次へ進む" : "問題へ進む";
  return {
    rebuttal,
    choosing: stop === "choices",
    advance: dialogue && partEnd ? { label, testId: rebuttal ? "reasoning-rebuttal-advance" : "battle-advance" } : null,
    notebookTab: !rebuttal,
  };
}

export function advanceBattle(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeBattle;
  if (state.activeTourism || state.revision !== expectedRevision || !active)
    return state;
  const { battle } = getActiveBattleContent(active);
  // The answer goes to Ink once, as the player leaves its right-or-wrong screen (4.6).
  if (active.phase === "feedback") return returnFromFlowCall({ ...state, revision: state.revision + 1 }, active, {});
  if (active.phase !== "dialogue" || !active.frame || !active.storyState) return state;
  const stop = battleDialogueStop(active);
  if (stop === "choices") return state;
  const next = { ...state, revision: state.revision + 1 };
  if (stop === "quiz" || stop === "reasoning") return enterFlowCall(next, active);
  if (stop === "end") return finishBattle(next, active);
  const step = continueStory(battle.storyId, active.storyState, active.frame, state.memories, {}, state.inventory, sceneConditionReader(state),
    claimToTrack(active, battle));
  return settleFlow(next, active, step);
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
  // The battle is one part of its occasion: what follows runs now (stage 3b).
  return advanceRunningOccasion({
    ...state,
    revision: state.revision + 1,
    activeBattle: null,
    battleRewardReceipt: null,
  });
}

export function validateBattleState(state: GameState): void {
  if (
    new Set(state.battleRecords.map((item) => item.battleId)).size !==
    state.battleRecords.length
  )
    throw new Error("クイズの記録が重複しています。");
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
      throw new Error("クイズの成績が一致しません。");
  }
  const active = state.activeBattle;
  if (!active) return;
  if (state.activeDate || state.activeEpilogue)
    throw new Error("恋愛会話とクイズが重複しています。");
  const { battle, quiz } = getActiveBattleContent(active);
  if (battleCityId(battle.id) !== state.currentCityId)
    throw new Error("クイズの都市と現在地が一致しません。");
  const episode = episodes.find((item) => item.battleId === battle.id);
  // A map condition (`when`) was checked on departing and may have turned false since (decision 21).
  if (episode && !episode.when && !isEpisodeUnlocked(state, episode))
    throw new Error("未解放のクイズの途中記録です。");
  if (
    active.answers.length > quiz.questions.length ||
    active.roundIndex >= quiz.questions.length ||
    active.score > quiz.questions.length
  )
    throw new Error("問題数と保存された得点が一致しません。");
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
  validateBattleRun(state, active, battle);
}

/**
 * A battle's saved run: its story stops where its phase says (a line, a quiz call with the round's number, the
 * reasoning's stop) after as many choices as it records, with the variables of the answers already passed to Ink.
 */
function validateBattleRun(state: GameState, active: ActiveBattle, battle: BattleDefinition): void {
  const fail = (message = "クイズの会話の位置が一致しません。") => { throw new Error(message); };
  if (new Set(active.appliedOptionIds).size !== active.appliedOptionIds.length ||
      active.appliedOptionIds.some((id) => !sceneOption(battleScene(battle), id)) ||
      // Each applied choice is one of the run's choices, and a replay (the result recorded before it ends) applies none.
      active.appliedOptionIds.length > active.turns ||
      (active.appliedOptionIds.length && active.phase !== "result" && state.battleRecords.some((record) => record.battleId === battle.id)))
    fail("保存された選択の記録が一致しません。");
  if (active.phase === "result") {
    if (active.storyState !== null || active.frame !== null) fail("不要な会話状態が保存されています。");
    validateProof(active, battle);
    return;
  }
  if (!active.storyState) fail();
  // Ink starts at turn -1, and once more for the knot a place file's scene starts at.
  const started = splitStoryAddress(battle.storyId).path !== undefined ? 1 : 0;
  const variables = flowVariables(active);
  const saved = storyVariables(battle.storyId, active.storyState!, [...Object.keys(variables), "call_arg"]);
  for (const [name, value] of Object.entries(variables))
    if (saved[name] !== undefined && saved[name] !== value) fail("保存された会話の条件が一致しません。");
  // The quizzes Ink has called: as many as the answers in the dialogue (one more when the line stops at the next quiz's call).
  if (active.phase === "dialogue" && saved.call_arg !== active.answers.length + (frameCall(active.frame) === "quiz" ? 1 : 0))
    fail("保存された回答と会話の位置が一致しません。");
  // The claim and rebuttal marks only before the first stop, and a scene's end where the next line says it is one.
  const knot = claimToTrack(active, battle);
  if ((active.linePart || active.sceneEnd) && (active.phase !== "dialogue" || knot === undefined)) fail();
  if (active.phase === "dialogue") {
    if (!active.frame || active.roundIndex !== flowDialogueRound(active, battle)) fail();
    if (knot !== undefined && !!active.sceneEnd !== flowSceneEnds(state, active, battle, knot)) fail();
    validateStorySnapshot(battle.storyId, active.storyState!, active.frame!, {
      playerName: state.playerName, heroineName: state.heroineName, choiceCount: active.turns,
    }, state.memories, state.inventory);
  } else {
    if (active.frame !== null) fail("不要な会話状態が保存されています。");
    const at = storyCallAt(battle.storyId, active.storyState!);
    if (!at || at.turn + 1 !== active.turns + started) fail();
    if (active.phase === "reasoning") {
      if (at!.call !== "reasoning" || !battle.reasoning || active.roundIndex !== battle.reasoning.roundIndex) fail();
    } else if (at!.call !== "quiz" || at!.arg !== active.roundIndex + 1) fail();
  }
  validateProof(active, battle);
}

/** A special battle's proof: made at its first stop, after the quizzes before it. Forged proof flags and unrelated evidence are refused. */
function validateProof(active: ActiveBattle, battle: BattleDefinition): void {
  const config = battle.reasoning;
  const proof = active.reasoning;
  const fail = () => { throw new Error("保存された推理の進行が一致しません。"); };
  if (!config) {
    if (proof || active.phase === "reasoning") fail();
    return;
  }
  if (!proof) {
    if (active.phase === "reasoning" || active.answers.length > config.roundIndex ||
        (active.answers.length === config.roundIndex && active.phase === "question")) fail();
    return;
  }
  if (proof.statementId !== flowClaimKnot(battle) || active.answers.length < config.roundIndex) fail();
  for (const ids of [proof.selectedClueIds, proof.submittedClueIds])
    if (new Set(ids).size !== ids.length || ids.length > config.correctClueIds.length || ids.some((id) => !config.caseClueIds.includes(id))) fail();
  if (config.kind === "connection" && proof.pressed) fail();
  if (proof.status === "selecting") {
    if (proof.submittedClueIds.length) fail();
  } else if (proof.submittedClueIds.length !== config.correctClueIds.length || !sameClues(proof.selectedClueIds, proof.submittedClueIds) ||
      (proof.status === "accepted") !== sameClues(proof.submittedClueIds, config.correctClueIds)) fail();
  if (active.phase === "reasoning" && (proof.status === "accepted" || active.hintUsed)) fail();
}
