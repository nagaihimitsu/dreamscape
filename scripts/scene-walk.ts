import { Story } from "inkjs";
import { requiredLeaves, type Condition, type Leaf } from "../src/content/condition-schemas";
import { parseConditionText } from "../src/content/condition-text";
import type { SceneDone, SceneOption } from "../src/content/scene-schemas";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import { bindItemReader } from "../src/story/items";
import { bindMemoryReader } from "../src/story/memory";
import { checkLinesWithoutChoice } from "./ink-validation";
import { condWalk } from "./scene-conditions";
import type { DialogueObserver } from "./dialogue-expression-validation";

// The full-branch walk of one scene (the unified event design, stage 3a, 3.3 check 6), for the
// scenes with choices and tags: a place file's knot, or a one-scene guide, arrival or epilogue.
// It starts at the scene's knot (or the file's top), sets the scene's cond("…") texts true and
// false (every combination of up to four, else each text both ways), takes every choice with both
// reaction results when a choice has a profile, and stops the build when:
// - a path stops without an end (no choice, no end) or reads 1,000 lines without a choice (A27);
// - a path meets two `then:` (the head's counts; A8);
// - a choice point can be reached in a state where no choice can be chosen (A10): a choice counts
//   when it needs nothing, or when what it needs is guaranteed (the head's `# when:`, the cond texts
//   read true on the path, minus the items given or used before on the path);
// - a choice without `# option:` has effects (readPlaceFile already stops it) or an option ID the
//   table does not know.
// The walk applies the scene's own effects as it goes: after `# give: X`, `item X held` reads false
// and `item X gifted` true; after `# set: F`, `flag F` true.
// Warning (not stopped): a choice point with only 「また今度」 and choices needing items not guaranteed there.

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
  onWarning?: (message: string) => void;
};

const sameLeaf = (left: Leaf, right: Leaf) => JSON.stringify(left) === JSON.stringify(right);

/** Walk every path of the scene; returns the number of paths. */
export function walkScene(input: SceneWalkInput): number {
  const optionById = new Map(input.options.map((option) => [option.id, option]));
  const headLeaves = input.when ? requiredLeaves(input.when) : [];
  const reserveMoney = Math.max(0, -(input.done?.money ?? 0));
  const reserveAp = Math.max(0, -(input.done?.ap ?? 0));
  const moneyFloor = Math.max(0, ...headLeaves.flatMap((leaf) => ("money" in leaf && leaf.money.atLeast !== undefined ? [leaf.money.atLeast] : [])));
  const apFloor = Math.max(0, ...headLeaves.flatMap((leaf) => ("ap" in leaf && leaf.ap.atLeast !== undefined ? [leaf.ap.atLeast] : [])));
  const parsedConds = new Map(input.conds.map((text) => [text, parseConditionText(text)]));
  const profiled = input.options.some((option) => option.profile);
  const { assignments } = condWalk(input.conds);
  let routes = 0;
  const warned = new Set<string>();
  const warn = (message: string) => { if (!warned.has(message)) { warned.add(message); input.onWarning?.(message); } };

  for (const assignment of assignments) for (const result of profiled ? ["positive", "negative"] : [undefined]) {
    type Path = { saved: string; overrides: Record<string, boolean>; trueTexts: string[]; spent: string[]; thens: number; romance: number; speaker: string };
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
    const visit = (path: Path, choiceTags: readonly string[]) => {
      const trueTexts = [...path.trueTexts];
      const story = make(path.overrides, trueTexts);
      story.state.LoadJson(path.saved);
      const metadata = parseStoryTags(choiceTags, input.context);
      let speaker = metadata.speaker ?? path.speaker;
      let explicitEmotion = metadata.emotion !== undefined;
      let lines = 0;
      while (story.canContinue) {
        checkLinesWithoutChoice(++lines);
        const text = story.Continue()?.trim() ?? "";
        const tags = parseStoryTags(story.currentTags ?? [], input.context);
        if (tags.speaker) speaker = tags.speaker;
        if (tags.emotion !== undefined) explicitEmotion = true;
        if (text) { input.observe?.(text, speaker, explicitEmotion); explicitEmotion = false; }
      }
      const choices = story.currentChoices;
      if (!choices.length) {
        if (path.thens > 1) throw new Error(`A path of ${input.label} meets ${path.thens} then: (at most one per path, the head's counted; A8)`);
        if (input.romanceChoices && path.romance !== input.romanceChoices.count)
          throw new Error(`Expected ${input.romanceChoices.count} romance choice moments in ${input.label}; a path meets ${path.romance}`);
        routes++;
        return;
      }
      const key = `${story.state.currentPathString}|${JSON.stringify(path.overrides)}|${path.thens}|${path.romance}|${choices.map((choice) => choice.text).join("/")}`;
      if (seen.has(key)) { routes++; return; }
      seen.add(key);
      const guaranteedLeaves: Leaf[] = [...headLeaves, ...trueTexts.flatMap((text) => {
        const condition = parsedConds.get(text);
        return condition ? requiredLeaves(condition) : [];
      })];
      const guaranteed = (leaf: Leaf) => guaranteedLeaves.some((other) => sameLeaf(other, leaf));
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
        // The head's # when: money/ap guarantees that much as the scene starts; once a then: is decided on the path (the head's or a
        // choice's), or by this choice, what the then: keeps back may take it (2.3): only a choice that spends nothing is sure then.
        const thenKeeps = path.thens > 0 || !!option.then;
        if ((option.money ?? 0) < 0 && -(option.money ?? 0) > (thenKeeps ? 0 : moneyFloor) - reserveMoney) return false;
        if ((option.ap ?? 0) < 0 && -(option.ap ?? 0) > (thenKeeps ? 0 : apFloor) - reserveAp) return false;
        if (option.then && "move" in option.then && option.then.by && option.then.by !== "walk") return false;
        return true;
      };
      const open = options.filter(choosable);
      if (!open.length)
        throw new Error(`No choice can be chosen at a choice point of ${input.label} (line of "${choices[0].text.trim()}"): every choice needs ` +
          `something not guaranteed there (A10); add a choice that needs nothing, or a # when: in the head that guarantees it`);
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
        visit({ saved: branch.state.ToJson(), overrides, trueTexts, spent, thens: path.thens + (option?.then ? 1 : 0),
          romance: path.romance + (romanceHere ? 1 : 0), speaker }, choice.tags ?? []);
      });
    };
    visit({ saved: first.state.ToJson(), overrides: {}, trueTexts: [], spent: [], thens: input.headThen ? 1 : 0, romance: 0, speaker: "narrator" }, []);
  }
  return routes;
}
