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

/**
 * The line under the menu's セーブ・ロード while saving is automatic (2026-11-14 user decision): how long ago this tab last
 * saved the game, at `now`. Said as a time ago, never as a clock time, which would read as the game's own clock in the
 * header; 「オン」 before this tab has saved (a resumed game is its save until the first action).
 */
export function autoSaveLine(savedAt: number | null, now: number): string {
  if (savedAt === null) return "自動保存：オン";
  const minutes = Math.floor(Math.max(0, now - savedAt) / 60_000);
  if (minutes < 1) return "自動保存：たった今";
  if (minutes < 60) return `自動保存：${minutes}分前`;
  return `自動保存：${Math.floor(minutes / 60)}時間前`;
}
