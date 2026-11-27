import { z } from "zod";
import type { GameState } from "./game";
import { stableContentId } from "./stable-id";

// 旅の記録's times (2026-11-19 user decision; an optional field of save v23, the version not raised): when each episode was
// completed and each date first finished, as the header's clock said then (the city's day and the minute of the game
// clock), in the order they were. 旅の記録's 「体験」 read it until 2026-11-27 (「体験」 made the SNS); nothing shows it now,
// and it is kept in the save as it was (the save's format is not changed for it). A save written before it has none.

export const livedTimeSchema = z.object({
  id: stableContentId,
  day: z.number().int().positive().safe(),
  minute: z.number().int().min(540).max(1980),
}).strict();
export type LivedTime = z.infer<typeof livedTimeSchema>;

export const livedTimesSchema = z.array(livedTimeSchema)
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, "同じ体験の時刻が2つあります。");

/** The state with the time now added for each of `ids` that has none yet (an episode just completed, a date just finished). */
export function withLivedTimes(state: GameState, ids: readonly string[]): GameState {
  const known = new Set((state.livedTimes ?? []).map((item) => item.id));
  const added = ids.filter((id) => !known.has(id)).map((id) => ({ id, day: state.travel.day, minute: state.travel.minute }));
  return added.length ? { ...state, livedTimes: [...(state.livedTimes ?? []), ...added] } : state;
}

/** Each time is of an episode completed or a date played in this save (as the save's other references). */
export function validateLivedTimes(state: GameState): void {
  for (const item of state.livedTimes ?? []) {
    if (!state.completedEpisodeIds.includes(item.id) && !state.playedDateIds.includes(item.id))
      throw new Error("旅の記録の時刻の参照先が見つかりません。");
  }
}
