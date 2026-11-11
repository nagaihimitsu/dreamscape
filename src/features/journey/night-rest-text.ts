import type { NightAction } from "../../domain/day-end";

/** The line of the day's end card (NightRest): the game has rested at the hotel by itself at 21:00 (no night action open). */
export const DAY_END_REST_JA = "夜も更けたので、ホテルで休みました。";
/** The night screen's line (NightScreen): free time at 21:00 or later with night actions open. */
export const NIGHT_SCREEN_JA = "夜も更けました。";
/** The night screen's line once its 「ホテルで休む」 has slept (it fades to the morning). */
export const NIGHT_RESTED_JA = "ホテルで休みました。";
/** The night screen's rest. */
export const NIGHT_REST_BUTTON_JA = "ホテルで休む";

/** A night action's button on the night screen (the same flow as its control in free time). */
export function nightActionLabelJa(action: NightAction, about: { nextCityNameJa?: string; pendingAp: number }): string {
  switch (action) {
    case "read_epilogue": return "エピローグを読む";
    case "depart": return `${about.nextCityNameJa ?? "次の街"}へ出発`;
    case "book_tour": return "ツアーを見る";
    case "cancel_tour": return "ツアーの予約を取り消す";
    case "claim_ap": return `保管中のAPを受け取る（${about.pendingAp}AP）`;
  }
}
