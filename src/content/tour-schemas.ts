import { z } from "zod";
import { contentId as id } from "./content-id";
import { conditionSchema } from "./condition-schemas";
import { japaneseText as japanese } from "./text-language";
import { tourismSourceSchema } from "./tourism-schemas";
import { transportKinds } from "./transport-schemas";

/**
 * A tour of a city (tour design stage 2a; `tours/<tourId>.json` of a journey folder): a fixed
 * itinerary the party joins the morning after booking it. Its steps run in order from the hotel at
 * 09:00: a leg moves the party and passes time (no fare, no ride counted), an event step opens a
 * map event's visit without fare or admission (the tour's price includes them). Offers sell the
 * same tour through different channels (a website, a desk, an introduction), each at its own price.
 * The tour ID and the step and offer IDs are saved (a booked or running tour, the tours finished),
 * so they never change once the journey is public. Light module (zod only).
 */

const sources = z.array(tourismSourceSchema).min(1);

/** A drive, ride or walk of the tour: the party is moved to `toPlaceId` and `minutes` pass. */
export const tourLegSchema = z.object({
  id,
  kind: z.literal("leg"),
  /** Shown on the itinerary and under the transition art (e.g. 「車でファテープル・シークリーへ」). */
  labelJa: japanese,
  toPlaceId: id,
  minutes: z.number().int().min(1).safe(),
  /** The transition art (a built-in kind, not one of the journey's declared modes) and its caption. */
  vehicle: z.object({ kind: z.enum(["walk", ...transportKinds]), movingJa: japanese }).strict(),
  /** A leg's time is a game estimate: its sources say what it rests on. */
  estimation: z.literal("game_model"),
  sources,
}).strict();

/** A map event of the city, opened at the place the tour has brought the party to. */
export const tourEventStepSchema = z.object({
  id,
  kind: z.literal("event"),
  eventId: id,
  /** The itinerary's text; without it, the event's title. */
  labelJa: japanese.optional(),
}).strict();

export const tourStepSchema = z.discriminatedUnion("kind", [tourLegSchema, tourEventStepSchema]);

/** One way to buy the tour: on a website (anywhere), at a desk (at `placeIds`), or through an introduction. */
export const tourOfferSchema = z.object({
  id,
  channel: z.enum(["web", "desk", "introduced"]),
  /** Who sells it, as the card shows it (「宿のフロント」「ツアー予約サイト」). */
  sellerJa: japanese,
  /** Where it is offered: a desk's places (required); an introduced offer's, if any; never a website's. */
  placeIds: z.array(id).min(1).refine((ids) => new Set(ids).size === ids.length, "Duplicate offer place").optional(),
  /** The whole party's price in the journey's currency, admissions included. */
  price: z.number().int().nonnegative().safe(),
  when: conditionSchema.optional(),
  sources,
}).strict().superRefine((offer, context) => {
  if (offer.channel === "desk" && !offer.placeIds)
    context.addIssue({ code: "custom", message: "A desk offer names its places (placeIds)", path: ["placeIds"] });
  if (offer.channel === "web" && offer.placeIds)
    context.addIssue({ code: "custom", message: "A web offer is bought anywhere: leave out placeIds", path: ["placeIds"] });
});

export const tourSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  cityId: id,
  titleJa: japanese,
  /** One or two plain sentences on the card: what the tour includes. */
  summaryJa: japanese,
  /** The tour is offered only while this holds (each offer may add its own). */
  when: conditionSchema.optional(),
  steps: z.array(tourStepSchema).min(1),
  offers: z.array(tourOfferSchema).min(1),
}).strict();

/** The generated list (`src/content/generated/tours.json`): every journey's tours, in file order. */
export const tourCatalogSchema = z.array(tourSchema);

export type Tour = z.infer<typeof tourSchema>;
export type TourStep = z.infer<typeof tourStepSchema>;
export type TourLeg = z.infer<typeof tourLegSchema>;
export type TourEventStep = z.infer<typeof tourEventStepSchema>;
export type TourOffer = z.infer<typeof tourOfferSchema>;
