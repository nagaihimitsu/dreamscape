import { withoutComments } from "./place-files";

// Which branch of a scene each line of an Ink source is on, read statically (2026-11-25 user decision: content:build
// should not warn about a term tagged once on each branch, so an author need not explain it). A branch is an arm of a
// multi-line conditional (`{ quiz_correct:` … `- else:` … `}`, `{` … `- cond:` … `}`) or a choice of a menu (`*`, `+`,
// up to the gather that ends it). A line inside no block or arm that a later line is not in is passed by every walk to
// that later line. Diverts, tunnels, threads and one-line conditionals are not followed: lines they choose between count
// as one path.
// Light module (no content loading): unit tests use it directly.

/** One block a line is inside: the block's opening line (from 1) and which of its arms (from 0) the line is on. */
export type BranchStep = { block: number; arm: number };

type Frame = BranchStep & { kind: "condition" | "menu"; depth: number };

/** A knot or a stitch (`=== name ===`, `= name`, `=== function name`): its lines start a fresh path. */
const SCENE_HEAD = /^=+\s*(?:function\s+)?[A-Za-z_]/u;
/** The opening of a multi-line conditional: `{ quiz_correct:`, `{ cond("…"):`, or `{` alone before `- cond:` arms. */
const CONDITION_OPENING = /^\{(?:[^{}]*:)?\s*$/u;
/** An arm of a conditional: `- else:`, `- battle_score == 3:`, `- cond("…"):` (ASCII, ending in a colon). */
const CONDITION_ARM = /^-\s*[\x20-\x7e]+:$/u;
const CHOICE = /^((?:[*+]\s*)+)/u;
/** A gather (`-`, `- -`, `- (label)`, `- text`, `- -> END`), never a divert's `->`. */
const GATHER = /^((?:-(?!>)\s*)+)/u;

const marks = (prefix: string) => prefix.replace(/\s/gu, "").length;

/** Every line's branch path (index 0 is line 1): the blocks it is inside, outermost first. */
export function branchPaths(source: string): BranchStep[][] {
  const paths: BranchStep[][] = [];
  let stack: Frame[] = [];
  const innermostCondition = () => {
    for (let at = stack.length - 1; at >= 0; at--) if (stack[at].kind === "condition") return at;
    return -1;
  };
  /** Ends the menus (inside the innermost conditional, or the scene) whose choices have `depth` marks or more. */
  const endMenus = (depth: number) => {
    const floor = innermostCondition() + 1;
    while (stack.length > floor && stack[stack.length - 1].depth >= depth) stack.pop();
  };
  for (const raw of withoutComments(source).split("\n")) {
    const line = raw.trim();
    const number = paths.length + 1;
    if (SCENE_HEAD.test(line)) stack = [];
    else if (line === "}") {
      const at = innermostCondition();
      if (at >= 0) stack = stack.slice(0, at);
    } else if (CONDITION_OPENING.test(line)) {
      stack.push({ kind: "condition", block: number, arm: line === "{" ? -1 : 0, depth: 0 });
    } else if (innermostCondition() >= 0 && CONDITION_ARM.test(line)) {
      const at = innermostCondition();
      stack = stack.slice(0, at + 1);
      stack[at] = { ...stack[at], arm: stack[at].arm + 1 };
    } else if (CHOICE.test(line)) {
      const depth = marks(CHOICE.exec(line)![1]);
      endMenus(depth + 1);
      const top = stack[stack.length - 1];
      if (top?.kind === "menu" && top.depth === depth) stack[stack.length - 1] = { ...top, arm: top.arm + 1 };
      else stack.push({ kind: "menu", block: number, arm: 0, depth });
    } else if (GATHER.test(line)) {
      endMenus(marks(GATHER.exec(line)![1]));
    }
    paths.push(stack.map(({ block, arm }) => ({ block, arm })));
  }
  return paths;
}

/**
 * Whether every walk that reaches a line on `later` has passed a line on `earlier` written above it: `earlier` is inside
 * no block or arm that `later` is not (an arm may be left out, so a line after a conditional is reached past either arm).
 */
export const alwaysBefore = (earlier: readonly BranchStep[], later: readonly BranchStep[]): boolean =>
  earlier.every((step) => later.some((step2) => step2.block === step.block && step2.arm === step.arm));
