import { LEAVE_WHO, RESERVED_SPEAKERS } from "../src/content/tags";
import { withoutComments } from "./place-files";

// content:build's check of the people a line names (2026-11-11): a line's `# speaker:` is narrator,
// heroine, player or enemy, or the ID of a person of progression/story.json people; a line's
// `# leave:` (2026-11-13) is heroine, enemy or such a person. Read from the Ink source (statically,
// so a line in a branch no walk takes is checked too), with the knot named.
// Light module (no content loading): unit tests use it directly.

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
const PEOPLE_TAGS = [
  { tag: "speaker", pattern: /#\s*speaker\s*:\s*([^#]*)/gu, named: RESERVED_SPEAKERS as readonly string[],
    hint: "narrator, heroine, player, enemy, or a person declared in progression/story.json people" },
  { tag: "leave", pattern: /#\s*leave\s*:\s*([^#]*)/gu, named: LEAVE_WHO as readonly string[],
    hint: "heroine, enemy, or a person declared in progression/story.json people" },
];

/** Throws at the first `# speaker:` or `# leave:` that names no one declared: its knot (if any), its line and the ID. */
export function checkSpeakerPeople(source: string, people: ReadonlySet<string>): void {
  let knot: string | undefined;
  withoutComments(source).split("\n").forEach((line, index) => {
    const head = KNOT_LINE.exec(line);
    if (head) knot = head[1];
    for (const { tag, pattern, named, hint } of PEOPLE_TAGS)
      for (const match of line.matchAll(pattern)) {
        const value = match[1].trim();
        if (!value || named.includes(value) || people.has(value)) continue;
        throw new Error(`Undeclared person in # ${tag}: ${knot ? `of the knot ${knot} ` : ""}(line ${index + 1}): ${value} (${hint})`);
      }
  });
}
