// The colour of the time of day laid over the free-time background (user decision 2026-11-11): pale and cool in
// the morning, none at midday, warm orange in the late afternoon and evening, deep blue at night. PhotoCardFreeTime
// lays it as one fixed layer over the city's backdrop (or its map-like pattern), under every card. The title screen's art
// takes its own, by the device's clock (titleArtTint, 2026-11-13).

/** Red, green and blue (0–255) and the opacity (0–1). */
type Rgba = readonly [red: number, green: number, blue: number, alpha: number];

const NIGHT: Rgba = [18, 30, 78, 0.42];
const MORNING: Rgba = [214, 232, 255, 0.16];
const MIDDAY: Rgba = [0, 0, 0, 0];
const EVENING: Rgba = [255, 138, 51, 0.22];

/** Minutes in a day: the clock wraps here. */
const DAY = 24 * 60;

/**
 * The tint at these minutes from midnight (increasing, from 0 to the next midnight); between two, it passes from one to
 * the next. The evening reaches halfway to the night at 18:00, when the game's night begins (getTimePeriod).
 */
const STOPS: readonly (readonly [minute: number, tint: Rgba])[] = [
  [0, NIGHT],
  [5 * 60, NIGHT],
  [7 * 60, MORNING],
  [10 * 60, MORNING],
  [11 * 60 + 30, MIDDAY],
  [14 * 60, MIDDAY],
  [16 * 60, EVENING],
  [17 * 60 + 20, EVENING],
  [18 * 60 + 40, NIGHT],
  [DAY, NIGHT],
];

/** The title screen's part of the day by the device's clock. */
export type TitlePeriod = "morning" | "day" | "evening" | "night";

/** The title art's tints: a faint warm wash in the morning, none by day, amber in the evening, deep blue at night. */
const TITLE_TINTS: Readonly<Record<TitlePeriod, string | null>> = {
  morning: "rgba(255, 196, 140, 0.14)",
  day: null,
  evening: "rgba(255, 150, 50, 0.2)",
  night: "rgba(18, 30, 78, 0.38)",
};

/**
 * The title art's colour of the time of day (user decision 2026-11-13) at the device's local `hour` (0–23; another number
 * wraps, one that is not a number counts as midday): morning 5–9, day 10–15, evening 16–18, night 19–4. Laid over the
 * picture only (under its caption), never over the title card's text, and still: it is read once as the title opens.
 */
export function titleArtTint(hour: number): { period: TitlePeriod; color: string | null } {
  const at = Number.isFinite(hour) ? ((Math.floor(hour) % 24) + 24) % 24 : 12;
  const period: TitlePeriod = at >= 5 && at < 10 ? "morning" : at >= 10 && at < 16 ? "day" : at >= 16 && at < 19 ? "evening" : "night";
  return { period, color: TITLE_TINTS[period] };
}

/**
 * The CSS colour of the time of day at the game clock's `minute` (minutes from midnight; a minute past midnight, as
 * on a late return, wraps). Between two stops it passes as one colour fading into the other over the picture
 * (interpolated premultiplied by its opacity, as the browser blends a colour transition), so a tint fading out keeps
 * its hue. Midday is fully transparent.
 */
export function timeOfDayTint(minute: number): string {
  const time = Number.isFinite(minute) ? ((minute % DAY) + DAY) % DAY : 12 * 60;
  // STOPS[0] is at 0 and the last at DAY, so the next stop is never the first and always found.
  const next = STOPS.findIndex(([at]) => at > time);
  const [fromAt, from] = STOPS[next - 1];
  const [toAt, to] = STOPS[next];
  const share = (time - fromAt) / (toAt - fromAt);
  const alpha = from[3] + (to[3] - from[3]) * share;
  if (alpha <= 0) return "rgba(0, 0, 0, 0)";
  const channel = (index: 0 | 1 | 2) =>
    Math.round((from[index] * from[3] + (to[index] * to[3] - from[index] * from[3]) * share) / alpha);
  return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${Math.round(alpha * 1000) / 1000})`;
}
