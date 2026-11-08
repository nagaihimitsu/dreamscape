export type CityProgressCounts = {
  completedStops: number;
  stops: number;
  completedSpecialBattles: number;
  specialBattles: number;
  cityCompleted: boolean;
};

/** One count of the progress summary; `kind` picks its icon in the header. */
export type CityProgressPart = { kind: "tourism" | "battles" | "cleared"; text: string };

/**
 * The progress summary as its parts: the tourism stops and, in a city with
 * special battles, their count; only the clear once the city is completed.
 */
export function cityProgressParts(counts: CityProgressCounts): CityProgressPart[] {
  if (counts.cityCompleted) return [{ kind: "cleared", text: "都市クリア" }];
  const tourism: CityProgressPart = { kind: "tourism", text: `観光 ${counts.completedStops} / ${counts.stops}` };
  return counts.specialBattles
    ? [tourism, { kind: "battles", text: `対決 ${counts.completedSpecialBattles} / ${counts.specialBattles}` }]
    : [tourism];
}

/** The progress pill's text. Cities without special battles show no 対決 count. */
export function formatCityProgress(counts: CityProgressCounts): string {
  return cityProgressParts(counts).map((part) => part.text).join(" · ");
}
