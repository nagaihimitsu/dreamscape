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

export function unique(values: string[], kind: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${kind}`);
}

