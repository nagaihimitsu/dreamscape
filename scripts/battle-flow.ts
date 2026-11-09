import { Story } from "inkjs";
import type { BattleDefinition } from "../src/content/schemas";
import { splitStoryAddress } from "../src/content/story-address";
import type { TagContext } from "../src/content/tags";
import { readStoryFrame, type StoryFrame } from "../src/story/frame-reader";
import { withoutComments } from "./place-files";
import { compiledConditionTexts, condWalk } from "./scene-conditions";

// The battle converter (the unified event design, stage 5): from the scene form of stages 3–4 (a one-scene file whose
// top sends battle_scene to a knot per scene, or a place file's battle knot with a stitch per scene) to the one-flow
// form: the scenes in the order the game played them, joined by `-> quiz(n) ->`, the special battle's claim in the
// helper knot <battle>_claim (and its press in <battle>_press, which the clue book reads too), its rebuttal (a separate
// presentation-only story until now; decision 1) right after the claim, and the stop point in the "return" form of
// decision 35: after a press or a wrong evidence the flow goes back to `- (stop)`. Only the form changes: every line,
// tag and condition stays as written (answer_correct reads quiz_correct, the same value). The equivalence check plays
// the old and the new form as the game shows them, for every combination of right and wrong answers, presses and
// wrong evidence (and every cond assignment), and compares every frame (text, speaker, background, emotion, reactions).
// Light module (no content loading).

/** The old (scene-form) battle with its story source; a rebuttal's source when presentation/reasoning-intros.json names one. */
export type SceneFormBattle = { battle: BattleDefinition; source: string; rebuttal?: { storyId: string; source: string } };

const KNOT = /^\s*={2,}\s*(function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*=*\s*$/u;
const STITCH = /^\s*=(?!=)\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/u;
const DISPATCH = /^\s*\{\s*battle_scene\s*==\s*"([a-z0-9_]+)"\s*:\s*->\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\s*$/u;
const END_LINE = /^\s*->\s*END\s*$/u;
const isBlank = (line: string) => !line.trim();

/** A scene's lines without its last `-> END` (the scene form ends every scene there; anything else is converted by hand). */
function sceneBody(lines: readonly string[], code: readonly string[], label: string): string[] {
  let last = code.length - 1;
  while (last >= 0 && isBlank(code[last])) last--;
  if (last < 0 || !END_LINE.test(code[last])) throw new Error(`The scene ${label} does not end with -> END on its last line: convert it by hand`);
  if (code.slice(0, last).some((line) => /->\s*(END|DONE)\b/u.test(line)))
    throw new Error(`The scene ${label} ends elsewhere than its last line (-> END inside it): convert it by hand`);
  if (code.slice(0, last).some((line) => /(?:->|<-)\s*[A-Za-z_]/u.test(line.replace(/->\s*(END|DONE)\b/gu, ""))))
    throw new Error(`The scene ${label} diverts to another knot or label: convert it by hand`);
  const body = lines.slice(0, last);
  while (body.length && isBlank(body[0])) body.shift();
  while (body.length && isBlank(body.at(-1)!)) body.pop();
  // The flow's quiz returns set quiz_correct (the same value the scene form's answer_correct had).
  return body.map((line) => line.replace(/\banswer_correct\b/gu, "quiz_correct"));
}

/** The scenes of a one-scene file in the scene form: its knots by the scene names its top sends battle_scene to. */
function fileScenes(source: string, label: string): { scenes: Map<string, string[]>; preamble: string[]; head: string[] } {
  const lines = source.split("\n");
  const code = withoutComments(source).split("\n");
  const knots = new Map<string, { start: number; end: number }>();
  let current: string | undefined;
  let firstKnot = lines.length;
  code.forEach((line, index) => {
    const knot = KNOT.exec(line);
    if (!knot) return;
    if (knot[1]) throw new Error(`${label} has a function (=== function ${knot[2]} ===): convert it by hand`);
    if (current) knots.get(current)!.end = index;
    current = knot[2];
    firstKnot = Math.min(firstKnot, index);
    knots.set(current, { start: index + 1, end: lines.length });
  });
  const dispatch = new Map<string, string>();
  const preamble: string[] = [];
  const head: string[] = [];
  let seenVar = false;
  for (let index = 0; index < firstKnot; index++) {
    const line = code[index];
    const match = DISPATCH.exec(line);
    if (match) { dispatch.set(match[1], match[2]); continue; }
    if (/^\s*VAR\s/u.test(line)) {
      const name = /^\s*VAR\s+([A-Za-z_][A-Za-z0-9_]*)/u.exec(line)![1];
      if (!["player_name", "heroine_name", "player_address", "battle_scene", "answer_correct", "battle_score"].includes(name))
        throw new Error(`${label} declares VAR ${name}, which modules.ink does not: convert it by hand`);
      seenVar = true;
      continue;
    }
    if (END_LINE.test(line) || isBlank(line) && !lines[index].trim()) continue;
    if (/^\s*(INCLUDE|EXTERNAL|CONST)\s/u.test(line)) throw new Error(`${label} has ${line.trim()}: convert it by hand`);
    if (/^\s*#/u.test(line)) { if (!seenVar) throw new Error(`${label}: a tag before its VAR lines`); head.push(lines[index]); continue; }
    if (!line.trim()) { if (!seenVar) preamble.push(lines[index]); continue; }
    throw new Error(`${label} has a line at its top that is not a VAR, a tag or its battle_scene dispatch: ${line.trim()}`);
  }
  const scenes = new Map<string, string[]>();
  for (const [scene, knot] of dispatch) {
    const range = knots.get(knot);
    if (!range) throw new Error(`${label} sends battle_scene "${scene}" to the unknown knot ${knot}`);
    scenes.set(scene, sceneBody(lines.slice(range.start, range.end), code.slice(range.start, range.end), `${label} (${knot})`));
  }
  for (const knot of knots.keys()) if (![...dispatch.values()].includes(knot)) throw new Error(`${label} has the knot ${knot}, which is not a scene: convert it by hand`);
  return { scenes, preamble, head };
}

/** The battle knot of a place file in the stitch form: its head, its stitches' scenes, and where the knot is in the file. */
function placeScenes(source: string, knot: string, label: string): { scenes: Map<string, string[]>; head: string[]; start: number; end: number } {
  const lines = source.split("\n");
  const code = withoutComments(source).split("\n");
  const start = code.findIndex((line) => KNOT.exec(line)?.[2] === knot);
  if (start < 0) throw new Error(`${label} has no knot ${knot}`);
  let end = code.findIndex((line, index) => index > start && KNOT.test(line));
  if (end < 0) end = lines.length;
  // Keep the comments right above the next knot with that knot.
  while (end - 1 > start && (/^\s*\/\//u.test(lines[end - 1]) || isBlank(lines[end - 1]))) end--;
  const head: string[] = [];
  let index = start + 1;
  for (; index < end && /^\s*#/u.test(code[index]); index++) head.push(lines[index]);
  while (index < end && isBlank(code[index])) index++;
  if (!/^\s*->\s*DONE\s*$/u.test(code[index] ?? "")) throw new Error(`${label} (${knot}) is not in the stitch form (its head, then -> DONE)`);
  const scenes = new Map<string, string[]>();
  let stitch: string | undefined;
  let from = 0;
  const close = (to: number) => { if (stitch) scenes.set(stitch, sceneBody(lines.slice(from, to), code.slice(from, to), `${label} (${knot}.${stitch})`)); };
  for (index++; index < end; index++) {
    const match = STITCH.exec(code[index]);
    if (match) { close(index); stitch = match[1]; from = index + 1; continue; }
    if (!stitch && code[index].trim()) throw new Error(`${label} (${knot}) has a line between -> DONE and its first stitch: ${code[index].trim()}`);
  }
  close(end);
  return { scenes, head, start, end };
}

const indent = (lines: readonly string[]) => lines.map((line) => (line.trim() ? `    ${line}` : line));

/** The flow's lines and its helper knots (the claim and the press), from the old scenes in the order the game played them. */
function flowLines(battle: BattleDefinition, scenes: Map<string, string[]>, knotName: string, rebuttal: string[] | undefined, questions: number) {
  const names = battle.scenes!;
  const scene = (name: string) => {
    const body = scenes.get(name);
    if (!body) throw new Error(`The battle ${battle.id} names the scene ${name}, which its story does not have`);
    return body;
  };
  const reasoning = battle.reasoning;
  const flow: string[] = [];
  const helpers: string[] = [];
  const proof = () => {
    if (!reasoning) return;
    flow.push(`-> ${knotName}_claim ->`);
    helpers.push("", `=== ${knotName}_claim ===`, ...scene(reasoning.claimScene!), "->->");
    if (rebuttal?.length) flow.push(...rebuttal);
    flow.push("- (stop)", "-> reasoning ->");
    if (reasoning.kind === "contradiction") {
      flow.push(`{ reasoning_action == "press":`, `    -> ${knotName}_press ->`, "    -> stop", "}");
      helpers.push("", `=== ${knotName}_press ===`, ...scene(reasoning.pressScene!), "->->");
    }
    flow.push(`{ evidence_result == "failure":`, ...indent(scene(reasoning.failureScene!)), "    -> stop", "}");
    flow.push(...scene(reasoning.successScene!));
  };
  flow.push(...scene(names.intro));
  for (let round = 0; round < questions; round++) {
    if (reasoning?.roundIndex === round) proof();
    flow.push(`-> quiz(${round + 1}) ->`);
    flow.push(...scene(round === questions - 1 ? names.outro : names.afterRounds[round]));
  }
  flow.push("-> END");
  return { flow, helpers };
}

/** The catalog entry of the converted battle: no scenes, no reasoning scene names. */
export function flowCatalogEntry(battle: BattleDefinition): BattleDefinition {
  const { scenes: _scenes, ...rest } = battle;
  if (!rest.reasoning) return rest;
  const { claimScene: _claim, pressScene: _press, successScene: _success, failureScene: _failure, ...reasoning } = rest.reasoning as NonNullable<BattleDefinition["reasoning"]> & { pressScene?: string };
  return { ...rest, reasoning: reasoning as BattleDefinition["reasoning"] };
}

/** The rebuttal story's lines (its VAR lines and last `-> END` left out). */
function rebuttalLines(source: string, label: string): string[] {
  const lines = source.split("\n");
  const code = withoutComments(source).split("\n");
  if (code.some((line) => KNOT.test(line) || STITCH.test(line))) throw new Error(`The rebuttal ${label} has knots: convert it by hand`);
  const kept = lines.map((line, index) => (/^\s*VAR\s/u.test(code[index]) ? "" : line));
  const keptCode = code.map((line) => (/^\s*VAR\s/u.test(line) ? "" : line));
  let first = 0;
  while (first < kept.length && (!keptCode[first].trim())) first++;
  return sceneBody(kept.slice(first), keptCode.slice(first), label);
}

/**
 * Convert one battle to the one-flow form. `questions`: its quiz's question count. Returns the new story source (the whole
 * file: a one-scene file, or the place file with the battle's knot replaced) and the new catalog entry.
 */
export function convertBattle(input: SceneFormBattle, questions: number): { source: string; battle: BattleDefinition } {
  const { battle } = input;
  if (!battle.scenes) throw new Error(`The battle ${battle.id} is in the one-flow form already`);
  const { storyId, path } = splitStoryAddress(battle.storyId);
  const label = path ? `${storyId} (${path})` : storyId;
  const rebuttal = input.rebuttal ? rebuttalLines(input.rebuttal.source, input.rebuttal.storyId) : undefined;
  if (path === undefined) {
    const read = fileScenes(input.source, label);
    const { flow, helpers } = flowLines(battle, read.scenes, storyId.split("/").at(-1)!, rebuttal, questions);
    const source = [...read.preamble, "INCLUDE modules.ink", ...read.head, ...flow, ...helpers].join("\n").replace(/\n*$/u, "\n");
    return { source, battle: flowCatalogEntry(battle) };
  }
  if (path.includes(".")) throw new Error(`${battle.id}: a battle's address names its knot only`);
  const read = placeScenes(input.source, path, label);
  const { flow, helpers } = flowLines(battle, read.scenes, path, rebuttal, questions);
  const lines = input.source.split("\n");
  const knotLine = lines[withoutComments(input.source).split("\n").findIndex((line) => KNOT.exec(line)?.[2] === path)];
  const replaced = [...lines.slice(0, read.start), knotLine, ...read.head, ...flow, ...helpers, ...lines.slice(read.end)];
  return { source: replaced.join("\n"), battle: flowCatalogEntry(battle) };
}

// ── The equivalence check ────────────────────────────────────────────────────────────────────────

/** One way to play a battle: each answer right or wrong, and the reasoning's actions before its right evidence. */
export type BattlePlan = { answers: boolean[]; reasoning: ("press" | "failure")[] };
/** What a frame shows (the line and how it is shown). */
type ShownFrame = Pick<StoryFrame, "text" | "speaker" | "background" | "emotion" | "emotionExplicit" | "reactions">;

/** Every plan: all right/wrong answers, and before the right evidence up to `depth` presses (B) or wrong evidence, in every order. */
export function battlePlans(battle: Pick<BattleDefinition, "reasoning">, questions: number, depth = 3): BattlePlan[] {
  const answers: boolean[][] = [];
  for (let mask = 0; mask < 1 << questions; mask++) answers.push([...Array(questions)].map((_, index) => !!(mask & (1 << index))));
  const actions: ("press" | "failure")[] = battle.reasoning?.kind === "contradiction" ? ["press", "failure"] : ["failure"];
  let sequences: ("press" | "failure")[][] = [[]];
  if (battle.reasoning) for (let length = 1, layer: ("press" | "failure")[][] = [[]]; length <= depth; length++) {
    layer = layer.flatMap((sequence) => actions.map((action) => [...sequence, action]));
    sequences = [...sequences, ...layer];
  }
  return answers.flatMap((list) => sequences.map((reasoning) => ({ answers: list, reasoning })));
}

/** A tag context that accepts every ID (the check compares the frames; content:build checks the IDs). */
class AnyIds extends Array<string> { override includes(): boolean { return true; } }
const ANY: TagContext = { effectIds: new AnyIds(), backgroundIds: new AnyIds(), emotionIds: new AnyIds() };
const START = "__start__";
const NAMES = { player_name: "検証主人公", heroine_name: "検証ヒロイン", player_address: "検証主人公さん" };

function story(compiled: string, cond: Record<string, boolean>): Story {
  const result = new Story(compiled);
  result.onError = (message) => { throw new Error(message); };
  result.BindExternalFunction("cond", (text: unknown) => cond[String(text)] ?? false, true);
  for (const [name, value] of Object.entries(NAMES)) if (result.variablesState.GlobalVariableExistsWithName(name)) result.variablesState.$(name, value);
  return result;
}
const shown = ({ text, speaker, background, emotion, emotionExplicit, reactions }: StoryFrame): ShownFrame =>
  ({ text, speaker, background, emotion, ...(emotionExplicit ? { emotionExplicit } : {}), ...(reactions ? { reactions } : {}) });

/** Read a story to its end or its first choice, as the game shows it (a fresh frame first; the battle's start background). */
function readAll(target: Story, frames: ShownFrame[], previous?: StoryFrame): StoryFrame | undefined {
  let last = previous;
  for (let count = 0; count < 1000; count++) {
    const step = readStoryFrame(target, ANY, last, [], START);
    if (step.lineRead) { frames.push(shown(step.frame)); last = step.frame; }
    if (!target.canContinue) return last;
  }
  throw new Error("The story does not stop (1,000 lines)");
}

/** The frames the scene form showed for a plan (each scene from its start; the rebuttal after the claim, as BattleScreen showed it). */
export function sceneFormFrames(input: { battle: BattleDefinition; compiled: string; rebuttalCompiled?: string }, plan: BattlePlan, cond: Record<string, boolean> = {}): ShownFrame[] {
  const { battle } = input;
  const names = battle.scenes!;
  const knot = splitStoryAddress(battle.storyId).path;
  const frames: ShownFrame[] = [];
  let correct = false;
  let score = 0;
  const scene = (name: string) => {
    const target = story(input.compiled, cond);
    for (const [variable, value] of Object.entries({ battle_scene: name, answer_correct: correct, battle_score: score }))
      if (target.variablesState.GlobalVariableExistsWithName(variable)) target.variablesState.$(variable, value);
    if (knot) target.ChoosePathString(`${knot}.${name}`);
    readAll(target, frames);
    if (target.currentChoices.length) throw new Error(`The scene ${name} stops at a choice`);
  };
  scene(names.intro);
  const reasoning = battle.reasoning;
  plan.answers.forEach((answer, round) => {
    if (reasoning?.roundIndex === round) {
      scene(reasoning.claimScene!);
      if (input.rebuttalCompiled) readAll(story(input.rebuttalCompiled, cond), frames);
      for (const action of plan.reasoning) scene(action === "press" && reasoning.kind === "contradiction" ? reasoning.pressScene! : reasoning.failureScene!);
      scene(reasoning.successScene!);
    }
    correct = answer;
    score += Number(answer);
    scene(round === plan.answers.length - 1 ? names.outro : names.afterRounds[round]);
  });
  return frames;
}

/** The frames the one-flow form shows for a plan, answering its calls as the game does (a fresh frame after each call). */
export function flowFormFrames(input: { battle: BattleDefinition; compiled: string }, plan: BattlePlan, cond: Record<string, boolean> = {}): ShownFrame[] {
  const target = story(input.compiled, cond);
  const knot = splitStoryAddress(input.battle.storyId).path;
  if (knot) target.ChoosePathString(knot);
  const frames: ShownFrame[] = [];
  const actions = [...plan.reasoning, "success" as const];
  let quizzes = 0;
  let score = 0;
  let previous: StoryFrame | undefined;
  for (let count = 0; count < 100; count++) {
    previous = readAll(target, frames, previous);
    const choices = target.currentChoices;
    if (!choices.length) {
      if (quizzes !== plan.answers.length) throw new Error(`The flow ends after quiz(${quizzes}) of ${plan.answers.length}`);
      if (input.battle.reasoning && actions.length) throw new Error("The flow ends before its reasoning stop is answered");
      return frames;
    }
    const call = choices.length === 1 ? /(?:^|\s)call:\s*(quiz|reasoning)/u.exec((choices[0].tags ?? []).join(" "))?.[1] : undefined;
    if (!call) throw new Error("The flow stops at a choice that is not a call");
    if (call === "quiz") {
      const arg = target.variablesState.$("call_arg");
      if (arg !== quizzes + 1) throw new Error(`The flow calls quiz(${String(arg)}) where quiz(${quizzes + 1}) comes next`);
      const answer = plan.answers[quizzes++];
      if (answer === undefined) throw new Error(`The flow calls quiz(${quizzes}), past its ${plan.answers.length} questions`);
      score += Number(answer);
      for (const [name, value] of Object.entries({ quiz_correct: answer, answer_correct: answer, battle_score: score })) target.variablesState.$(name, value);
    } else {
      const action = actions.shift();
      if (!action) throw new Error("The flow comes back to its reasoning stop after the right evidence");
      target.variablesState.$("reasoning_action", action === "press" ? "press" : "evidence");
      target.variablesState.$("evidence_result", action === "press" ? "" : action);
    }
    target.ChooseChoiceIndex(0);
    previous = undefined;
  }
  throw new Error("The flow does not end (100 calls)");
}

/** Compare the two forms for every plan and cond assignment; returns the first difference (null when every frame is the same). */
export function compareBattleForms(old: { battle: BattleDefinition; compiled: string; rebuttalCompiled?: string },
  converted: { battle: BattleDefinition; compiled: string }, questions: number): { plans: number; difference: string | null } {
  const texts = [...new Set([...compiledConditionTexts(old.compiled), ...(old.rebuttalCompiled ? compiledConditionTexts(old.rebuttalCompiled) : [])])];
  const { assignments } = condWalk(texts);
  let plans = 0;
  for (const assignment of assignments) for (const plan of battlePlans(old.battle, questions)) {
    plans++;
    const before = sceneFormFrames(old, plan, assignment);
    let after: ShownFrame[];
    try { after = flowFormFrames(converted, plan, assignment); }
    catch (error) { return { plans, difference: `${describe(plan, assignment)}: ${error instanceof Error ? error.message : String(error)}` }; }
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index++) {
      const [left, right] = [JSON.stringify(before[index] ?? null), JSON.stringify(after[index] ?? null)];
      if (left !== right) return { plans, difference: `${describe(plan, assignment)}, frame ${index + 1}: before ${left}, after ${right}` };
    }
  }
  return { plans, difference: null };
}

const describe = (plan: BattlePlan, cond: Record<string, boolean>) =>
  `answers ${plan.answers.map((answer) => (answer ? "○" : "×")).join("")}${plan.reasoning.length ? `, before the right evidence ${plan.reasoning.join("+")}` : ""}` +
  `${Object.keys(cond).length ? `, cond ${JSON.stringify(cond)}` : ""}`;
