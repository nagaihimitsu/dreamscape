// What the authoring commands print when they stop: the message and what caused it (e.g. the line and column
// of a JSON syntax error behind 「Cannot read JSON …」), one per line, without a stack trace that would bury it.

import { schemaIssueLines, schemaIssues } from "./content-validation-utils";

/**
 * An error's message followed by the message of each of its causes. A schema error (zod's) shows its problems in short
 * lines (schemaIssueLines) instead of its raw list. A cause the message already quotes is left out, and so is a schema
 * error under a message that already lists problems so (e.g. 「Invalid content in <file>:」 with the positions in that file).
 */
export function errorText(error: unknown): string {
  const lines: string[] = [];
  for (let current: unknown = error, depth = 0; current !== undefined && depth < 10; depth++) {
    const issues = schemaIssues(current);
    const message = issues.length ? schemaIssueLines(issues) : current instanceof Error ? current.message : String(current);
    const listed = issues.length > 0 && !!lines.at(-1)?.includes("\n  - ");
    if (!listed && !lines.some((line) => line.includes(message))) lines.push(message);
    current = current instanceof Error ? current.cause : undefined;
  }
  return lines.join("\n");
}

/**
 * Whether the error or one of its causes is a mistake in the code (a TypeError, ReferenceError or RangeError) rather
 * than a problem the content checks found, so that its stack trace is worth printing.
 */
export function codeError(error: unknown): boolean {
  for (let current: unknown = error, depth = 0; current !== undefined && depth < 10; depth++) {
    if (current instanceof TypeError || current instanceof ReferenceError || current instanceof RangeError) return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}
