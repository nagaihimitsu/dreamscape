import type { TravelEvent } from "../../content/travel-schemas";

export const formatTravelTime = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export function formatEndingWindows(windows: NonNullable<TravelEvent["endWindows"]>): string {
  return windows.length === 1 && windows[0].start === 0
    ? `${formatTravelTime(windows[0].end)}まで`
    : windows.map((window) => `${formatTravelTime(window.start)}〜${formatTravelTime(window.end)}`).join("・");
}
