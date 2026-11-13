import { withoutComments } from "./place-files";

// The line a line tag belongs to, read statically from an Ink source (so a line in a branch no walk takes counts too):
// Ink gives a tag on a line of its own to the next line of text, and a tag after a line's text to that line. Used by
// content:build's checks of `# em:` and `# em_shake:` (line-emphasis.ts) and its index of the voiced lines
// (scene-audio.ts). The text is the line's raw text before its tags: names such as {heroine_name} are left as written.
// Light module (no content loading): unit tests use it directly.

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
/** Lines that are Ink's own (a stitch, a variable, an include, a divert, a thread, a code line, the end of a block). */
const LOGIC_LINE = /^(?:=|~|->|<-|VAR\s|CONST\s|INCLUDE\s|EXTERNAL\s|\}|\{[^}]*:$|\{$)/u;

/** A line tag of interest with the line it belongs to. */
export type TaggedLine = {
  key: string;
  value: string;
  /** The tag's own line (from 1). */
  line: number;
  knot?: string;
  /** The line of text it belongs to (from 1), or null when none follows before the knot's end. */
  textLine: number | null;
  /** That line's raw text before its tags (trimmed), or null. */
  text: string | null;
  /** The tag is written on a choice, or right before one (a choice's tags belong to the choice, not to a line). */
  choice: boolean;
};

/** Where the line's tags start: its first `#` that Ink does not read as text (`\#` is a `#` in the text). */
function tagStart(line: string): number {
  for (let index = 0; index < line.length; index++) {
    if (line[index] === "\\") index++;
    else if (line[index] === "#") return index;
  }
  return -1;
}

/** A tag part's tags (`# key: value`, `# key`), in order. */
function tagsOf(part: string): { key: string; value: string }[] {
  return part.slice(1).split("#").map((item) => item.trim()).filter(Boolean).map((item) => {
    const separator = item.indexOf(":");
    return separator < 0 ? { key: item, value: "" } : { key: item.slice(0, separator).trim(), value: item.slice(separator + 1).trim() };
  });
}

/** A line's text without Ink's marks before it (gathers, a label), or "" for a line of Ink's own. */
function lineText(content: string): string {
  // A gather's `-`, never the `-` of a divert (`-> END` stays a line of Ink's own).
  const bare = content.trim().replace(/^(?:-(?!>)\s*)+/u, "").replace(/^\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\)\s*/u, "").trim();
  if (!bare || LOGIC_LINE.test(bare)) return "";
  // A branch of a conditional (`- else:`, `- battle_score == 3:`): written in ASCII and ending in a colon.
  // … and a line of code only (`{ cond("…"): -> aside -> }`): ASCII with a divert.
  if (/^[\x20-\x7e]*$/u.test(bare) && (/:$/u.test(bare) || bare.includes("->"))) return "";
  return bare;
}

/**
 * The tags named in `keys` of an Ink source (`//` comments left out), each with the line of text it belongs to: the
 * same line when the tag follows its text, else the next line with text (blank lines, other tag lines and Ink's own lines
 * between, such as a conditional's opening, are passed over). A tag on a choice, or before a choice with no line of text
 * between, is a choice's (`choice`); one with no line of text after it in its knot has none (`text` null).
 */
export function taggedLines(source: string, keys: readonly string[]): TaggedLine[] {
  const found: TaggedLine[] = [];
  let pending: TaggedLine[] = [];
  let knot: string | undefined;
  const settle = (textLine: number | null, text: string | null, choice = false) => {
    for (const tag of pending) found.push({ ...tag, textLine, text, choice });
    pending = [];
  };
  withoutComments(source).split("\n").forEach((raw, index) => {
    const number = index + 1;
    const head = KNOT_LINE.exec(raw);
    if (head) {
      settle(null, null);
      knot = head[1];
      return;
    }
    const start = tagStart(raw);
    const content = start < 0 ? raw : raw.slice(0, start);
    const tags = start < 0 ? [] : tagsOf(raw.slice(start)).filter((tag) => keys.includes(tag.key))
      .map((tag): TaggedLine => ({ ...tag, line: number, ...(knot ? { knot } : {}), textLine: null, text: null, choice: false }));
    // A choice (`*`, `+`, with its label): its tags and the tags waiting before it are the choice's.
    if (/^\s*(?:-\s*)*[*+]/u.test(content)) {
      pending.push(...tags);
      settle(number, null, true);
      return;
    }
    const text = lineText(content);
    pending.push(...tags);
    if (text) settle(number, text);
  });
  settle(null, null);
  return found;
}
