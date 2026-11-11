/**
 * Pure rules of the header's text (UI redesign §2.2 and §3.1), kept apart from
 * the component so that they are tested without a browser.
 */

/** 月〜日 for `getGameWeekday`'s 0–6. */
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;

export function weekdayLabel(weekday: number): { short: string; spoken: string } {
  const day = WEEKDAYS[weekday];
  return { short: `（${day}）`, spoken: `ゲーム内の${day}曜日` };
}

/**
 * How large the budget is set where money and AP are stacked: a long amount
 * (`₭2,000,000`, `soʻm 4,000,000`) takes a smaller size instead of pushing the
 * place name out of the narrow header. Counted in characters, as the spec's
 * steps are (9 and 12).
 */
export function moneyLength(text: string): "regular" | "long" | "longer" {
  const length = Array.from(text).length;
  return length >= 12 ? "longer" : length >= 9 ? "long" : "regular";
}
