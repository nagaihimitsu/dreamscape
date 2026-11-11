import type { Condition } from "../content/condition-schemas";
import { meets } from "./conditions";
import type { GameState } from "./game-state-schema";

/** A line written on an item (the catalog's `linesJa`): plain, or shown only while its condition holds. */
export type ItemLine = string | { textJa: string; when: Condition };

/** The lines written on an item that show now: plain lines always, a `{ textJa, when }` line while its condition holds. */
export function itemLines(state: Readonly<GameState>, lines: readonly ItemLine[] | undefined): string[] | undefined {
  const shown = lines?.flatMap((line) => (typeof line === "string" ? [line] : meets(state, line.when) ? [line.textJa] : []));
  return shown?.length ? shown : undefined;
}
