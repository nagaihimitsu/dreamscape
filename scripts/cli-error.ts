// What the authoring commands print when they stop: the message and what caused it (e.g. the line and column
// of a JSON syntax error behind 「Cannot read JSON …」), one per line, without a stack trace that would bury it.

/** An error's message followed by the message of each of its causes (a cause the message already quotes is left out). */
export function errorText(error: unknown): string {
  const lines: string[] = [];
  for (let current: unknown = error, depth = 0; current !== undefined && depth < 10; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    if (!lines.some((line) => line.includes(message))) lines.push(message);
    current = current instanceof Error ? current.cause : undefined;
  }
  return lines.join("\n");
}
