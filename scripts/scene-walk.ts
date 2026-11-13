import { Story } from "inkjs";
import type { Choice } from "inkjs/engine/Choice";
import { requiredLeaves, type Condition, type Leaf } from "../src/content/condition-schemas";
import { parseConditionText } from "../src/content/condition-text";
import type { SceneDone, SceneOption } from "../src/content/scene-schemas";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import { miniGameOptionId, miniGameOutcomeIds, type MiniGameTag } from "../src/minigames/tag";
import type { MiniGameUse } from "../src/minigames/uses";
import type { SceneKind } from "../src/content/scene-schemas";
import { bindItemReader } from "../src/story/items";
import { bindMemoryReader } from "../src/story/memory";
import { checkLinesWithoutChoice } from "./ink-validation";
import { condWalk } from "./scene-conditions";
import type { DialogueObserver } from "./dialogue-expression-validation";

// The full-branch walk of one scene (the unified event design, stage 3a, 3.3 check 6), for the
// scenes with choices and tags: a place file's knot, or a one-scene guide, arrival or epilogue.
// It starts at the scene's knot (or the file's top), sets the scene's cond("…") texts true and
// false (all false, all true, each alone true: condWalk), takes every choice with both
// reaction results when a choice has a profile, and stops the build when:
// - a path stops without an end (no choice, no end) or reads 1,000 lines without a choice (A27);
// - a path meets two `then:` (the head's counts; A8);
// - a choice point can be reached in a state where no choice can be chosen (A10): a choice counts
//   when it needs nothing, or when what it needs is guaranteed (the head's `# when:` and the cond texts
//   read true on the path; minus the items given or used before on the path, and, for money and AP, the
//   payments and gains of the choices before it on the path: docs/13 4.2, one rule for every need);
// - a choice without `# option:` has effects (readPlaceFile already stops it) or an option ID the
//   table does not know.
// The walk applies the scene's own effects as it goes: after `# give: X`, `item X held` reads false
// and `item X gifted` true; after `# set: F`, `flag F` true.
// - a line's `# minigame:` (docs/13 3.4) is not followed by a choice set right after its line, its choice set is not one
//   choice per outcome of the game (by option ID; a quiz's or reasoning's call is none), an outcome may not be choosable
//   there (checkMiniGameChoices), or 「おまかせ」 never leaves it (its auto outcome comes back to the same game without
//   another choice set). Every walk reads mini-games (TagContext.miniGames true); a confession date's walk passes
//   "confession", which refuses them (docs/13 1.4). The uses found go to `onMiniGame` (generated/minigame-uses.json).
// Warnings (not stopped): a choice point with only 「また今度」 and choices needing items not guaranteed there; a
// mini-game whose 「おまかせ」 outcome is a 「また今度」 choice (おまかせ then never finishes the scene).
//
// A battle (stage 5, `battle`): the walk answers its calls as the game does (modules.ink): each
// `-> quiz(n) ->` right and wrong, each `-> reasoning ->` with every action (B: press, evidence success and failure; C:
// success and failure), and stops the build when a path calls quiz out of order or not 1..n once each (A16), meets the
// reasoning stop elsewhere than after quiz(roundIndex) (battles/catalog.json), ends without it, or when a state is reached
// from which the battle never ends (for example `-> stop` after the evidence's success too; decision 35). A path that comes
// back to a state already walked (the stop point after a press) is walked once.

export type SceneWalkInput = {
  compiled: string;
  /** The knot (or knot.stitch) the scene starts at; the file's top when undefined. */
  start?: string;
  label: string;
  context: TagContext;
  /** The variables the game sets (only those the story declares are set). */
  variables: Record<string, string | number | boolean>;
  /** The cond texts the scene reads (the walk sets each true and false). */
  conds: readonly string[];
  options: readonly SceneOption[];
  /** The scene's head `# when:` (what it guarantees). */
  when?: Condition;
  /** The head's own `then:` (counted on every path). */
  headThen?: boolean;
  /** What the scene keeps back to pay when done (an inserted scene's `# on_done: money -X`, `ap -N`). */
  done?: SceneDone;
  itemIds: readonly string[];
  memoryIds: readonly string[];
  observe?: DialogueObserver;
  /** Romance choice points: the knot whose choice points are counted (a date's own knot) and how many each path must meet (A14). */
  romanceChoices?: { knot: string; count: number };
  /** A battle (stage 5): how many quizzes it calls and, for a special battle, its reasoning. */
  battle?: { quizzes: number; reasoning?: { kind: "contradiction" | "connection"; roundIndex: number } };
  onWarning?: (message: string) => void;
  /** The scene a mini-game use belongs to (its ID and kind, the story file), and where the walk reports each use it meets. */
  scene?: { id: string; kind: SceneKind; storyId: string };
  onMiniGame?: (use: MiniGameUse) => void;
};

/** Where a stopped story is: its choices' source and the tunnels they return through (a call's site, not only the call's knot). */
function stopKey(choices: readonly Choice[]): string {
  return choices.map((choice) => `${choice.sourcePath}@${(choice.threadAtGeneration?.callstack ?? [])
    .map((element) => `${element.currentPointer.path?.toString()}:${element.currentPointer.index}`).join(">")}`).join("/");
}

const sameLeaf = (left: Leaf, right: Leaf) => JSON.stringify(left) === JSON.stringify(right);

/**
 * A mini-game's choice set (`# minigame:`, 2026-11-13): one choice per outcome of the game, by option ID (the outcome, or
 * `<prefix>_<outcome>`), nothing else, and each always choosable (the game takes it whatever the player has: no `# requires:`,
 * gift, use or payment that is not guaranteed there).
 */
function checkMiniGameChoices(tag: MiniGameTag, choices: readonly { text: string; optionId?: string; choosable: boolean; later: boolean }[], label: string,
  warn: (message: string) => void): void {
  const expected = miniGameOutcomeIds(tag.id).map((outcome) => miniGameOptionId(tag, outcome));
  const written = choices.map((choice) => choice.optionId);
  const missing = expected.filter((id) => !written.includes(id));
  const extra = choices.filter((choice) => !choice.optionId || !expected.includes(choice.optionId))
    .map((choice) => choice.optionId ?? `「${choice.text}」 (no # option:)`);
  if (missing.length || extra.length)
    throw new Error(`The choice set of # minigame: ${tag.id} in ${label} needs one choice per outcome, by # option: ${expected.join(", ")}` +
      `${missing.length ? `; missing: ${missing.join(", ")}` : ""}${extra.length ? `; not an outcome: ${extra.join(", ")}` : ""}`);
  const closed = choices.filter((choice) => !choice.choosable);
  if (closed.length)
    throw new Error(`An outcome of # minigame: ${tag.id} in ${label} may not be choosable (${closed.map((choice) => choice.optionId).join(", ")}): ` +
      `the game takes it whatever the player has, so it needs nothing that is not guaranteed there (# requires:, # give:, # use:, a payment, a then: move)`);
  if (choices.some((choice) => choice.later && choice.optionId === miniGameOptionId(tag, tag.auto)))
    warn(`# minigame: ${tag.id} in ${label}: its 「おまかせ」 outcome ${tag.auto} is a 「また今度」 choice (# later), so with ⚙設定's おまかせ the scene never ` +
      "ends there; give auto another outcome if the story should go on");
}

/** Walk every path of the scene; returns the number of paths. */
export function walkScene(walked: SceneWalkInput): number {
  // Every scene the walk reads may play a mini-game (docs/13 1.3), but a confession date (docs/13 1.4).
  const input = { ...walked, context: { ...walked.context, miniGames: walked.context.miniGames === "confession" ? "confession" as const : true } };
  const optionById = new Map(input.options.map((option) => [option.id, option]));
  const headLeaves = input.when ? requiredLeaves(input.when) : [];
  const reserveMoney = Math.max(0, -(input.done?.money ?? 0));
  const reserveAp = Math.max(0, -(input.done?.ap ?? 0));
  /** The least money (AP) the leaves guarantee: their largest `money >= N` (`ap >= N`). */
  const floorOf = (leaves: readonly Leaf[], kind: "money" | "ap") => Math.max(0, ...leaves.flatMap((leaf) =>
    kind === "money" ? ("money" in leaf && leaf.money.atLeast !== undefined ? [leaf.money.atLeast] : [])
      : ("ap" in leaf && leaf.ap.atLeast !== undefined ? [leaf.ap.atLeast] : [])));
  const parsedConds = new Map(input.conds.map((text) => [text, parseConditionText(text)]));
  const profiled = input.options.some((option) => option.profile);
  const { assignments } = condWalk(input.conds);
  let routes = 0;
  const warned = new Set<string>();
  const warn = (message: string) => { if (!warned.has(message)) { warned.add(message); input.onWarning?.(message); } };

  for (const assignment of assignments) for (const result of profiled ? ["positive", "negative"] : [undefined]) {
    type Path = { saved: string; overrides: Record<string, boolean>; trueTexts: string[]; spent: string[]; thens: number; romance: number; speaker: string;
      /** A battle's quizzes called so far, its score and whether it reached its reasoning stop. */
      quizzes: number; score: number; reasoned: boolean;
      /** What the choices before on the path paid (negative) or gave (positive): money and AP. */
      money: number; ap: number;
      /** The mini-games passed since the last other choice set, each left by its 「おまかせ」 outcome (their choice points). */
      autoChain: string[] };
    // A battle's states (its stop points, by where they stop and what the path holds) and where each goes: every one must reach the end.
    const graph = new Map<string, { next: Set<string>; where: string }>();
    const edge = (from: string, to: string) => graph.get(from)?.next.add(to);
    const make = (overrides: Record<string, boolean>, trueTexts: string[]) => {
      const story = new Story(input.compiled);
      story.onError = (message) => { throw new Error(message); };
      bindMemoryReader(story, [], input.memoryIds);
      bindItemReader(story, {}, input.itemIds);
      story.BindExternalFunction("cond", (text: unknown) => {
        if (typeof text !== "string" || !Object.hasOwn(assignment, text)) throw new Error(`Unknown cond text: ${String(text)}`);
        const value = Object.hasOwn(overrides, text) ? overrides[text] : assignment[text];
        if (value && !trueTexts.includes(text)) trueTexts.push(text);
        return value;
      }, true);
      return story;
    };
    const first = make({}, []);
    for (const [name, value] of Object.entries({ player_name: "検証主人公", heroine_name: "検証ヒロイン", player_address: "検証主人公さん", ...input.variables }))
      if (first.variablesState.GlobalVariableExistsWithName(name)) first.variablesState.$(name, value);
    if (result && first.variablesState.GlobalVariableExistsWithName("romance_result")) first.variablesState.$("romance_result", result);
    if (input.start) first.ChoosePathString(input.start);
    const seen = new Set<string>();
    const battle = input.battle;
    const visit = (path: Path, choiceTags: readonly string[], from = "") => {
      const trueTexts = [...path.trueTexts];
      const story = make(path.overrides, trueTexts);
      story.state.LoadJson(path.saved);
      const metadata = parseStoryTags(choiceTags, input.context);
      let speaker = metadata.speaker ?? path.speaker;
      let explicitEmotion = metadata.emotion !== undefined;
      let lines = 0;
      // The last line's # minigame: (a tag line without text belongs to the next line, as the frame reads it).
      let game: { tag: MiniGameTag; line: string } | undefined;
      while (story.canContinue) {
        checkLinesWithoutChoice(++lines);
        const text = story.Continue()?.trim() ?? "";
        const tags = parseStoryTags(story.currentTags ?? [], input.context);
        if (tags.speaker) speaker = tags.speaker;
        if (tags.emotion !== undefined) explicitEmotion = true;
        if (battle && tags.effects.length) throw new Error(`A battle's lines take no # effect: (${input.label}); a choice's tags say what it does`);
        if (text && game?.line) throw new Error(`# minigame: ${game.tag.id} in ${input.label} is on the line "${game.line}", but the line "${text}" comes ` +
          `after it: write # minigame: on the line right before the choice set it plays`);
        if (tags.minigame) game = { tag: tags.minigame, line: text };
        else if (text && game) game.line = text;
        if (text) { input.observe?.(text, speaker, explicitEmotion); explicitEmotion = false; }
      }
      const choices = story.currentChoices;
      if (game && !choices.length)
        throw new Error(`# minigame: ${game.tag.id} in ${input.label} is not followed by a choice set (the line "${game.line}"): the game takes one of the choices right after its line`);
      if (choices.some((choice) => parseStoryTags(choice.tags ?? [], input.context).minigame))
        throw new Error(`# minigame: is written on a choice in ${input.label}: write it on the line right before the choice set`);
      const calls = choices.map((choice) => parseStoryTags(choice.tags ?? [], input.context).call);
      const gameAt = game ? stopKey(choices) : "";
      if (game) {
        if (calls.some(Boolean))
          throw new Error(`# minigame: ${game.tag.id} in ${input.label} comes right before a quiz's or reasoning's call: a mini-game takes a choice set ` +
            "of its outcomes; put it on a line before or after the quiz (docs/13 1.3)");
        if (path.autoChain.includes(gameAt))
          throw new Error(`「おまかせ」 never leaves # minigame: ${game.tag.id} in ${input.label}: its auto outcome ${game.tag.auto} comes back to the ` +
            "same game without another choice set on the way, so a player with ⚙設定's おまかせ cannot go on; give auto an outcome that leads on (docs/13 3.4)");
        const knot = choices[0].sourcePath?.split(".")[0];
        if (input.scene) input.onMiniGame?.({ sceneId: input.scene.id, kind: input.scene.kind, storyId: input.scene.storyId, ...(knot ? { knot } : {}),
          game: game.tag.id, auto: game.tag.auto, ...(game.tag.prefix ? { prefix: game.tag.prefix } : {}), ...(game.tag.bg ? { bg: game.tag.bg } : {}),
          ...(game.tag.art ? { art: { ...game.tag.art } } : {}), ...(game.tag.params ? { params: { ...game.tag.params } } : {}), line: game.line });
      }
      if (calls.some(Boolean) && choices.length !== 1) throw new Error(`A battle's call is offered with other choices in ${input.label}: write -> quiz(n) -> and -> reasoning -> on their own`);
      if (!choices.length) {
        if (path.thens > 1) throw new Error(`A path of ${input.label} meets ${path.thens} then: (at most one per path, the head's counted; A8)`);
        if (input.romanceChoices && path.romance !== input.romanceChoices.count)
          throw new Error(`Expected ${input.romanceChoices.count} romance choice moments in ${input.label}; a path meets ${path.romance}`);
        if (battle && path.quizzes !== battle.quizzes)
          throw new Error(`A path of ${input.label} ends after ${path.quizzes ? `quiz(${path.quizzes})` : "no quiz"}: every path calls quiz 1..${battle.quizzes} once each, in order (its quiz has ${battle.quizzes} questions; A16)`);
        if (battle?.reasoning && !path.reasoned)
          throw new Error(`A path of ${input.label} ends without -> reasoning ->: a special battle stops there after quiz(${battle.reasoning.roundIndex}) on every path`);
        edge(from, "end");
        routes++;
        return;
      }
      const call = calls[0];
      if (call && !battle) throw new Error(`-> ${call === "quiz" ? "quiz(n)" : "reasoning"} -> is a battle's call (stage 5): ${input.label} is not a battle`);
      const key = battle
        ? `${stopKey(choices)}|${JSON.stringify(path.overrides)}|${path.thens}|${path.quizzes}|${path.score}|${path.reasoned}|${path.money}|${path.ap}|` +
          `${["reasoning_action", "evidence_result", "romance_result"].map((name) => String(story.variablesState.$(name))).join(",")}`
        : `${story.state.currentPathString}|${JSON.stringify(path.overrides)}|${path.thens}|${path.romance}|${path.money}|${path.ap}|${choices.map((choice) => choice.text).join("/")}`;
      if (battle) {
        edge(from, key);
        if (!graph.has(key)) graph.set(key, { next: new Set(), where: call === "quiz" ? `quiz(${path.quizzes + 1})` : call === "reasoning" ? `the reasoning stop` :
          `the choice "${choices[0].text.trim()}" after ${path.quizzes ? `quiz(${path.quizzes})` : "the start"}` });
      }
      if (seen.has(key)) { routes++; return; }
      seen.add(key);
      if (call && battle) {
        const checkpoint = story.state.ToJson();
        const answer = (variables: Record<string, string | number | boolean>, next: Partial<Path>) => {
          const branch = make(path.overrides, [...trueTexts]);
          branch.state.LoadJson(checkpoint);
          for (const [name, value] of Object.entries(variables)) branch.variablesState.$(name, value);
          branch.ChooseChoiceIndex(0);
          // The game starts a fresh frame after a call.
          visit({ ...path, ...next, saved: branch.state.ToJson(), speaker: "narrator" }, [], key);
        };
        if (call === "quiz") {
          const arg = story.variablesState.$("call_arg");
          if (arg !== path.quizzes + 1)
            throw new Error(`A path of ${input.label} calls quiz(${String(arg)}) where quiz(${path.quizzes + 1}) comes next: call quiz 1..${battle.quizzes} once each, in order (A16)`);
          if (path.quizzes + 1 > battle.quizzes)
            throw new Error(`A path of ${input.label} calls quiz(${path.quizzes + 1}), but its quiz has ${battle.quizzes} questions (A16)`);
          if (battle.reasoning && path.quizzes === battle.reasoning.roundIndex && !path.reasoned)
            throw new Error(`A path of ${input.label} calls quiz(${path.quizzes + 1}) before -> reasoning ->: battles/catalog.json puts the reasoning ` +
              `before question ${battle.reasoning.roundIndex + 1} (roundIndex ${battle.reasoning.roundIndex}), after quiz(${battle.reasoning.roundIndex})`);
          for (const correct of [false, true])
            answer({ quiz_correct: correct, answer_correct: correct, battle_score: path.score + Number(correct) },
              { quizzes: path.quizzes + 1, score: path.score + Number(correct) });
          return;
        }
        if (!battle.reasoning) throw new Error(`-> reasoning -> in ${input.label}: the battle has no reasoning in battles/catalog.json (a special battle B or C stops there)`);
        if (path.quizzes !== battle.reasoning.roundIndex)
          throw new Error(`A path of ${input.label} meets -> reasoning -> after ${path.quizzes ? `quiz(${path.quizzes})` : "no quiz"}: battles/catalog.json puts it ` +
            `after quiz(${battle.reasoning.roundIndex}) and before quiz(${battle.reasoning.roundIndex + 1}) (roundIndex ${battle.reasoning.roundIndex})`);
        const actions = [...(battle.reasoning.kind === "contradiction" ? [{ reasoning_action: "press", evidence_result: "" }] : []),
          { reasoning_action: "evidence", evidence_result: "success" }, { reasoning_action: "evidence", evidence_result: "failure" }];
        for (const variables of actions) answer(variables, { reasoned: true });
        return;
      }
      const guaranteedLeaves: Leaf[] = [...headLeaves, ...trueTexts.flatMap((text) => {
        const condition = parsedConds.get(text);
        return condition ? requiredLeaves(condition) : [];
      })];
      const guaranteed = (leaf: Leaf) => guaranteedLeaves.some((other) => sameLeaf(other, leaf));
      // What the scene's start and the path's true conds guarantee, after the path's own payments and gains.
      const moneyFloor = floorOf(guaranteedLeaves, "money") + path.money;
      const apFloor = floorOf(guaranteedLeaves, "ap") + path.ap;
      const itemGuaranteed = (item: string) => !path.spent.includes(item) && guaranteed({ item: { id: item, is: "held" } });
      const options = choices.map((choice) => {
        const id = parseStoryTags(choice.tags ?? [], input.context).optionId;
        const option = id === undefined ? undefined : optionById.get(id);
        if (id !== undefined && !option) throw new Error(`Unknown choice option ${id} in ${input.label}`);
        return option;
      });
      const choosable = (option: SceneOption | undefined) => {
        if (!option) return true;
        if (option.requires?.some((condition) => !requiredLeaves(condition).length || requiredLeaves(condition).some((leaf) => !guaranteed(leaf)))) return false;
        for (const item of [option.give?.item, option.use].filter((value): value is string => !!value)) if (!itemGuaranteed(item)) return false;
        // The head's # when: and the path's true conds guarantee money/ap (less what the path paid before); once a then: is decided
        // on the path (the head's or a choice's), or by this choice, what the then: keeps back may take it (2.3): only a choice
        // that spends nothing is sure then.
        const thenKeeps = path.thens > 0 || !!option.then;
        if ((option.money ?? 0) < 0 && -(option.money ?? 0) > (thenKeeps ? 0 : moneyFloor) - reserveMoney) return false;
        if ((option.ap ?? 0) < 0 && -(option.ap ?? 0) > (thenKeeps ? 0 : apFloor) - reserveAp) return false;
        // A then: move is never sure (2.3, 4.2): even walking it greys when no way home gets back in time from there (before 21:00, home
        // by 21:00), or when the main part there opens and its admission or payments cannot be paid.
        if (option.then && "move" in option.then) return false;
        return true;
      };
      if (game) checkMiniGameChoices(game.tag, choices.map((choice, index) => ({ text: choice.text.trim(), optionId: parseStoryTags(choice.tags ?? [], input.context).optionId,
        choosable: choosable(options[index]), later: !!options[index]?.later })), input.label, warn);
      const autoOption = game ? miniGameOptionId(game.tag, game.tag.auto) : undefined;
      const open = options.filter(choosable);
      if (!open.length)
        throw new Error(`No choice can be chosen at a choice point of ${input.label} (line of "${choices[0].text.trim()}"): every choice needs ` +
          `something not guaranteed there (A10); ${path.thens > 0 || options.some((option) => option?.then)
            ? "after a then: is decided, what it keeps back (the fare home from where it goes, the payments there) may take the money or AP a # when: in the head guarantees, so add a choice that needs nothing"
            : "add a choice that needs nothing, or a # when: in the head that guarantees it"}`);
      const needsItem = (option: SceneOption | undefined) => !!(option?.give || option?.use);
      if (options.every((option) => option?.later || needsItem(option)) && options.some(needsItem) && !open.some(needsItem))
        warn(`Only 「また今度」 and choices that need an item at a choice point of ${input.label} ("${choices[0].text.trim()}"); ` +
          `a # when: item … held in the head guarantees the item`);
      const romanceHere = input.romanceChoices && options.some((option) => option?.knot === input.romanceChoices!.knot) &&
        !options.some((option) => option && option.knot !== input.romanceChoices!.knot);
      const checkpoint = story.state.ToJson();
      choices.forEach((choice, index) => {
        const option = options[index];
        const overrides = { ...path.overrides };
        const spent = [...path.spent];
        for (const item of [option?.give?.item, option?.use].filter((value): value is string => !!value)) {
          spent.push(item);
          overrides[`item ${item} held`] = false;
          overrides[`item ${item} ${option?.give?.item === item ? "gifted" : "used"}`] = true;
        }
        for (const flag of option?.set ?? []) overrides[`flag ${flag}`] = true;
        const branch = make(overrides, [...trueTexts]);
        branch.state.LoadJson(checkpoint);
        branch.ChooseChoiceIndex(choice.index);
        visit({ ...path, saved: branch.state.ToJson(), overrides, trueTexts, spent, thens: path.thens + (option?.then ? 1 : 0),
          autoChain: game && option?.id === autoOption ? [...path.autoChain, gameAt] : [],
          money: path.money + (option?.money ?? 0), ap: path.ap + (option?.ap ?? 0),
          romance: path.romance + (romanceHere ? 1 : 0), speaker }, choice.tags ?? [], key);
      });
    };
    if (battle) graph.set("", { next: new Set(), where: "the start" });
    visit({ saved: first.state.ToJson(), overrides: {}, trueTexts: [], spent: [], thens: input.headThen ? 1 : 0, romance: 0, speaker: "narrator", autoChain: [], money: 0, ap: 0,
      quizzes: 0, score: 0, reasoned: false }, []);
    if (battle) {
      // Every state the battle reaches must still reach its end (a stop point that only comes back to itself would hold the player).
      const ends = new Set<string>(["end"]);
      for (let grown = true; grown;) {
        grown = false;
        for (const [node, { next }] of graph) if (!ends.has(node) && [...next].some((item) => ends.has(item))) { ends.add(node); grown = true; }
      }
      // The deepest such state walked (the start is one too, when every way from it is stuck).
      const stuck = [...graph].reverse().find(([node]) => !ends.has(node));
      if (stuck) throw new Error(`${input.label} never ends from ${stuck[1].where}: every way on from there comes back to it (a battle ends on every path; ` +
        `for example, after the evidence's success the flow goes on instead of -> stop; decision 35)`);
    }
  }
  return routes;
}
