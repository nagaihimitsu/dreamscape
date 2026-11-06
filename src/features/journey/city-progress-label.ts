export type CityProgressCounts = {
  completedStops: number;
  stops: number;
  completedSpecialBattles: number;
  specialBattles: number;
  cityCompleted: boolean;
};

/** The progress pill's text. Cities without special battles show no 対決 count. */
export function formatCityProgress(counts: CityProgressCounts): string {
  if (counts.cityCompleted) return "都市クリア";
  const tourism = `観光 ${counts.completedStops} / ${counts.stops}`;
  return counts.specialBattles ? `${tourism} · 対決 ${counts.completedSpecialBattles} / ${counts.specialBattles}` : tourism;
}
