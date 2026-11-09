import type { Condition } from "../src/content/condition-schemas";
import { combineWhenUntil, parseConditionText } from "../src/content/condition-text";
import type { EncounterEntryRule, VisitPriority } from "../src/content/encounter-entry-rules";

// The head tags of an encounter's Ink (the unified event design, stage 1): written at the top of
// the file (after the VAR lines, before the first line of text), they place the encounter at its
// landmark's visit. content:build reads and removes them before compiling the Ink (so the story
// runs as before), and turns them into the encounter's entry rule (and `repeatable`):
//
//   # at: visit <landmark>              the landmark's visit (stage 1: one, the catalog's landmark)
//   # priority: -1 | after observe | +1 before the main part, while observing, after it
//   # when: <condition>                 every one must hold (condition-text.ts)
//   # until: <condition>                none may hold
//   # repeat: once | always             once by default
//
// Light module (no content loading): unit tests use it directly.

export const HEAD_TAGS = ["at", "priority", "when", "until", "repeat"] as const;
/** A head tag anywhere on a line (as Ink reads tags: after any `#`). */
const headTagLine = new RegExp(`(?:^|\\s)#\\s*(${HEAD_TAGS.join("|")})\\s*:`, "u");

/** What an encounter's head says. */
export type EncounterHead = {
  landmarkId: string;
  priority: VisitPriority;
  when?: Condition;
  repeat?: "once" | "always";
};

/** The lines of the head: blank lines, comments, VAR/INCLUDE/CONST/EXTERNAL lines and tag lines before the first other line. */
function headLength(lines: readonly string[]): number {
  let index = 0;
  while (index < lines.length && /^\s*(?:$|\/\/|#|(?:VAR|CONST|INCLUDE|EXTERNAL)\s)/u.test(lines[index])) index++;
  return index;
}

function parsePriority(value: string): VisitPriority {
  if (value === "after observe") return value;
  if (/^[+-]?[0-9]+$/u.test(value)) {
    const number = Number(value);
    if (number === 0) throw new Error("# priority: 0 is the main part itself; write a negative number (before it) or a positive one (after it)");
    if (!Number.isSafeInteger(number)) throw new Error(`# priority: ${value} is too large`);
    return number;
  }
  if (/^after\s/u.test(value))
    throw new Error(`# priority: ${value} is not available yet (stage 3); stage 1 takes a negative number, after observe or a positive number`);
  throw new Error(`Unknown # priority: ${value} (write -1, after observe or +1)`);
}

/**
 * Read the head tags of an encounter's Ink. Returns the source with those lines blanked (the
 * line numbers of compiler messages stay the same) and the head, undefined when the file has no
 * head tags. Throws for a head tag outside the head, a malformed value, a position or condition
 * part of a later stage, and a head without `at` and `priority`.
 */
export function readEncounterHead(source: string): { source: string; head?: EncounterHead } {
  const lines = source.split("\n");
  const end = headLength(lines);
  // `//` comments may mention the tags (they explain the file).
  const tagged = (line: string) => !/^\s*\/\//u.test(line) && headTagLine.test(line);
  const outside = lines.findIndex((line, index) => index >= end && tagged(line));
  if (outside >= 0)
    throw new Error(`Head tag outside the head (line ${outside + 1}): write # ${headTagLine.exec(lines[outside])![1]}: at the top of the file, after the VAR lines and before the first line of text`);
  const tags: { key: string; value: string }[] = [];
  const kept = lines.map((line, index) => {
    if (index >= end || !tagged(line)) return line;
    if (!line.trim().startsWith("#")) throw new Error(`Write each head tag on its own line (line ${index + 1}): ${line.trim()}`);
    const parts = line.trim().slice(1).split("#").map((part) => part.trim());
    for (const part of parts) {
      const separator = part.indexOf(":");
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (separator < 1 || !(HEAD_TAGS as readonly string[]).includes(key))
        throw new Error(`Write each head tag on its own line (line ${index + 1}): ${line.trim()}`);
      if (!value) throw new Error(`Empty head tag (line ${index + 1}): # ${key}:`);
      if (/[{}]/u.test(value)) throw new Error(`A head tag is plain text, without {…} (line ${index + 1}): # ${key}: ${value}`);
      tags.push({ key, value });
    }
    return "";
  });
  if (!tags.length) return { source };
  const values = (key: string) => tags.filter((tag) => tag.key === key).map((tag) => tag.value);
  const single = (key: string) => {
    const found = values(key);
    if (found.length > 1) throw new Error(`Write # ${key}: once`);
    return found[0];
  };
  const at = values("at");
  if (at.length !== 1) throw new Error(at.length ? "Stage 1 takes one # at: (visit <landmark>)" : "An encounter's head needs # at: visit <landmark>");
  const visit = /^visit\s+([a-z][a-z0-9_]*)$/u.exec(at[0]);
  if (!visit || visit[1] === "any")
    throw new Error(`# at: ${at[0]} is not available yet: stage 1 takes # at: visit <landmark> (other moments come at stages 3 and 4)`);
  const priority = single("priority");
  if (priority === undefined) throw new Error("An encounter's head needs # priority: (-1, after observe or +1)");
  const condition = (text: string, key: string) => {
    try { return parseConditionText(text); }
    catch (error) { throw new Error(`# ${key}: ${text}: ${error instanceof Error ? error.message : String(error)}`, { cause: error }); }
  };
  const repeat = single("repeat");
  if (repeat !== undefined && repeat !== "once" && repeat !== "always") throw new Error(`Unknown # repeat: ${repeat} (once or always)`);
  const when = combineWhenUntil(values("when").map((text) => condition(text, "when")), values("until").map((text) => condition(text, "until")));
  return {
    source: kept.join("\n"),
    head: { landmarkId: visit[1], priority: parsePriority(priority), ...(when ? { when } : {}), ...(repeat ? { repeat } : {}) },
  };
}

/** The entry rule a head stands for. */
export const headEntryRule = (encounterId: string, head: EncounterHead): EncounterEntryRule =>
  ({ encounterId, priority: head.priority, ...(head.when ? { when: head.when } : {}) });
