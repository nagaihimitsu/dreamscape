import { RESERVED_SPEAKERS } from "../src/content/tags";
import { withoutComments } from "./place-files";

// content:build's check of the people who speak (2026-11-11): a line's `# speaker:` is narrator,
// heroine, player or enemy, or the ID of a person of progression/story.json people. Read from the
// Ink source (statically, so a line in a branch no walk takes is checked too), with the knot named.
// Light module (no content loading): unit tests use it directly.

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
const SPEAKER_TAG = /#\s*speaker\s*:\s*([^#]*)/gu;

/** Throws at the first `# speaker:` that names no one declared: its knot (if any), its line and the ID. */
export function checkSpeakerPeople(source: string, people: ReadonlySet<string>): void {
  let knot: string | undefined;
  withoutComments(source).split("\n").forEach((line, index) => {
    const head = KNOT_LINE.exec(line);
    if (head) knot = head[1];
    for (const match of line.matchAll(SPEAKER_TAG)) {
      const value = match[1].trim();
      if (!value || (RESERVED_SPEAKERS as readonly string[]).includes(value) || people.has(value)) continue;
      throw new Error(`Undeclared person in # speaker: ${knot ? `of the knot ${knot} ` : ""}(line ${index + 1}): ${value} ` +
        `(narrator, heroine, player, enemy, or a person declared in progression/story.json people)`);
    }
  });
}
