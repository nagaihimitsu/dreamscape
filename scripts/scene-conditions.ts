import type { Story } from "inkjs";
import type { Condition } from "../src/content/condition-schemas";
import { parseConditionText } from "../src/content/condition-text";

// A scene's in-text conditions (the unified event design, stage 2a): `cond("…")` in a scene's
// Ink reads one condition written as text (condition-text.ts, the same words as the head tags'
// `# when:`) and gives true or false; no number reaches Ink. The game binds `cond`
// (src/story/runtime.ts) and judges each text with `meets`. content:build reads the texts
// (readSceneConditions), checks them like every other condition and walks each scene's
// story with the texts set true and false (condWalk): all false, all true and each text
// alone true (representative paths, not every combination).
// Light module (no content loading): unit tests use it directly.

/** The declaration a one-scene-per-file Ink needs to call `cond` (decision 40). */
export const COND_DECLARATION = "EXTERNAL cond(text)";
/** The stand-in function for Inky's preview (the game binds the real one). */
export const COND_FALLBACK = ["=== function cond(text) ===", "~ return false"] as const;

const declaration = /^\s*EXTERNAL\s+cond\s*\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\)\s*$/mu;
const fallback = /^\s*={2,}\s*function\s+cond\s*\(/u;

/**
 * The texts of the `cond("…")` calls of a story source (comments skipped), in the order
 * written, once each. Throws for a call that does not take one literal text, and for a
 * call without the declaration (decision 40: the error shows the three lines to add), unless the
 * file includes it (`declared`: a place file, whose modules.ink declares cond).
 */
export function readSceneConditions(source: string, declared = false): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replace(/[^\n]/gu, " ")).replace(/\/\/.*$/gmu, "");
  const texts: string[] = [];
  code.split("\n").forEach((line, index) => {
    if (declaration.test(line) || fallback.test(line)) return;
    for (const call of line.matchAll(/\bcond\s*\(/gu)) {
      const literal = /^\s*"([^"\\]*)"\s*\)/u.exec(line.slice(call.index + call[0].length));
      if (!literal) throw new Error(`cond takes one condition written as text in quotes, like cond("money >= 300") (line ${index + 1})`);
      if (!texts.includes(literal[1])) texts.push(literal[1]);
    }
  });
  // A place file's declaration is in the game's modules.ink (`declared`).
  if (texts.length && !declared && !declaration.test(code))
    throw new Error(`cond("…") needs its declaration in this file: add the line\n  ${COND_DECLARATION}\nafter the VAR lines, ` +
      `and at the end of the file, for Inky's preview, the two lines\n  ${COND_FALLBACK[0]}\n  ${COND_FALLBACK[1]}`);
  return texts;
}

/** Each text's JSON condition; throws, naming the text, for one that is not a condition. */
export function parseSceneConditions(texts: readonly string[]): Record<string, Condition> {
  return Object.fromEntries(texts.map((text) => {
    try { return [text, parseConditionText(text)]; }
    catch (error) { throw new Error(`cond("${text}"): ${error instanceof Error ? error.message : String(error)}`, { cause: error }); }
  }));
}

/** The texts the compiled story passes to `cond` (literal arguments only: readSceneConditions refused the others). */
export function compiledConditionTexts(compiled: string): string[] {
  const texts = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object" && !Array.isArray(item) && (item as Record<string, unknown>)["x()"] === "cond" &&
            value[index - 1] === "/str" && typeof value[index - 2] === "string" && value[index - 3] === "str")
          texts.add((value[index - 2] as string).replace(/^\^/u, ""));
        visit(item);
      });
    } else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(JSON.parse(compiled));
  return [...texts].sort();
}

/** The truth values one walk gives the texts. */
export type CondAssignment = Readonly<Record<string, boolean>>;

/**
 * The assignments a walk goes through (representative, not every combination): all false, all true
 * and each text alone true, so every text is true and false at least once.
 */
export function condWalk(texts: readonly string[]): { assignments: CondAssignment[] } {
  const all = (value: boolean) => Object.fromEntries(texts.map((text) => [text, value]));
  const alone = texts.length > 1 ? texts.map((text) => ({ ...all(false), [text]: true })) : [];
  return { assignments: texts.length ? [all(false), all(true), ...alone] : [{}] };
}

/** Bind `cond` to the walk's values (a text outside them stops the walk: the build did not read it). */
export function bindCondAssignment(story: Story, assignment: CondAssignment): void {
  story.BindExternalFunction("cond", (text: unknown) => {
    if (typeof text !== "string" || !Object.hasOwn(assignment, text)) throw new Error(`Unknown cond text: ${String(text)}`);
    return assignment[text];
  }, true);
}

/**
 * Run `walk` once per assignment of the compiled story's texts, with a binder for each Story
 * it creates; an error names the assignment it happened with. Returns the walks' sum.
 */
export function forEachCondAssignment(compiled: string, walk: (bind: (story: Story) => void) => number | void): number {
  const texts = compiledConditionTexts(compiled);
  const { assignments } = condWalk(texts);
  let total = 0;
  for (const assignment of assignments) {
    try {
      total += walk((story) => bindCondAssignment(story, assignment)) ?? 0;
    } catch (error) {
      if (!texts.length) throw error;
      const shown = texts.map((text) => `cond("${text}") ${assignment[text] ? "true" : "false"}`).join(", ");
      throw new Error(`${error instanceof Error ? error.message : String(error)} (with ${shown})`, { cause: error });
    }
  }
  return total;
}
