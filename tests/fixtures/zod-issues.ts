import { expect } from "vitest";

/**
 * Matches a ZodError whose issues are exactly these, each compared on the
 * fields given (for example `{ code: "too_small", path: ["ap"] }`). Use it as
 * `expect(() => schema.parse(value)).toThrow(zodIssues(...))`: zod's default
 * message texts change between versions, its issue codes and paths do not.
 */
export function zodIssues(...issues: Array<Record<string, unknown>>) {
  return expect.objectContaining({ name: "ZodError", issues: issues.map((issue) => expect.objectContaining(issue)) });
}
