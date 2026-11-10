import { getCityContent, type Tour, type TourOffer } from "../../content";
import { tourSchedule } from "../../domain/tour";

/** How the tour card writes a time of the day (9:00, 13:30). */
export const tourClock = (minute: number) => `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`;

/** How long a step takes, as the itinerary says it: minutes up to 2 hours, then hours (「約60分」「約3時間」「約2時間30分」). */
export function tourDuration(minutes: number): string {
  if (minutes < 120) return `約${minutes}分`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `約${hours}時間${minutes % 60}分` : `約${hours}時間`;
}

/**
 * The tour card's itinerary (tour stage 2a): each step from 09:00 with its time, a visit with 「入場料込み」 when its event charges
 * admission (the tour's price includes it), and where it ends: 「9:00 車でファテープル・シークリーへ（約60分）」 … 「14:00ごろ解散」.
 */
export function tourItinerary(tour: Tour): { lines: string[]; end: string } {
  const { travel } = getCityContent(tour.cityId);
  const schedule = tourSchedule(tour);
  const lines = schedule.map(({ step, start, end }) => {
    if (step.kind === "leg") return `${tourClock(start)} ${step.labelJa}（${tourDuration(end - start)}）`;
    const event = travel.events.find((item) => item.id === step.eventId);
    return `${tourClock(start)} ${step.labelJa ?? event?.titleJa ?? step.eventId}（${tourDuration(end - start)}${(event?.admissionCost ?? 0) > 0 ? "・入場料込み" : ""}）`;
  });
  return { lines, end: `${tourClock(schedule.at(-1)?.end ?? 0)}ごろ解散` };
}

/** Who sells an offer, as its badge says it: 「Web予約」, 「窓口：宿のフロント」, 「紹介：…」. */
export function tourSellerBadge(offer: Pick<TourOffer, "channel" | "sellerJa">): string {
  return offer.channel === "web" ? "Web予約" : offer.channel === "desk" ? `窓口：${offer.sellerJa}` : `紹介：${offer.sellerJa}`;
}
