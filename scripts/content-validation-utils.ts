export function withContext<T>(label: string, action: () => T): T {
  try {
    return action();
  } catch (error) {
    throw new Error(
      `${label}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

/** A schema problem (a zod issue): where (keys and list positions) and what. */
export type SchemaIssue = { path?: PropertyKey[]; message?: string };
/** The problems of a schema error (none for another error). */
export const schemaIssues = (error: unknown): SchemaIssue[] => {
  const issues = (error as { issues?: unknown } | undefined)?.issues;
  return Array.isArray(issues) ? issues : [];
};
/** One short line per problem: its position (e.g. `battles[0].id`) and the schema's message. */
export function schemaIssueLines(issues: readonly SchemaIssue[]): string {
  const position = (keys: readonly PropertyKey[]) =>
    keys.reduce<string>((text, key) => (typeof key === "number" ? `${text}[${key}]` : text ? `${text}.${String(key)}` : String(key)), "") || "(the whole file)";
  return issues.map((issue) => `  - ${position(issue.path ?? [])}: ${issue.message ?? "invalid"}`).join("\n");
}

/**
 * Stop at the first repeated value, naming it and, with `files` (the file of
 * each value, in the same order), the files that hold it.
 */
export function unique(values: readonly string[], kind: string, files?: readonly string[]) {
  const first = new Map<string, number>();
  values.forEach((value, index) => {
    const earlier = first.get(value);
    if (earlier === undefined) {
      first.set(value, index);
      return;
    }
    const [a, b] = files?.length === values.length ? [files[earlier], files[index]] : [];
    const where = a === undefined ? "" : a === b ? ` (twice in ${a})` : ` (${a} and ${b})`;
    throw new Error(`Duplicate ${kind}: "${value}"${where}`);
  });
}

