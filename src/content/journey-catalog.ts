import { z } from "zod";
import { contentId as id } from "./content-id";
import { transportModeSchema } from "./transport-schemas";

const text = z.string().trim().min(1);
/**
 * Kept as written, not trimmed: a symbol of letters ends with the one space that keeps
 * its number apart (「soʻm 」 → 「soʻm 4,000,000」, formatMoney); a sign has none (「₹」).
 */
const currencySymbol = z.string().regex(/^\S+ ?$/u);

/** A journey is a separate game; cities are ordered but may still be unbuilt. */
export const journeyCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  journeys: z.array(z.object({
    id,
    nameJa: text,
    status: z.enum(["available", "preparing"]),
    cities: z.array(z.object({ id, nameJa: text }).strict()).min(1),
    currency: z.object({ code: z.string().regex(/^[A-Z]{3}$/), symbol: currencySymbol,
      unitJa: text, unit: z.literal("whole") }).strict(),
    // An omitted value uses the starting city's existing setting. Null means
    // not yet determined and must never silently become real-world pricing.
    initialBudget: z.number().int().nonnegative().nullable().optional(),
    /** Fictional game-calendar weekday on day one; Monday is 0. */
    startWeekday: z.number().int().min(0).max(6).optional(),
    // Optional for existing journeys that already have an initial state.
    initialState: z.object({
      ap: z.number().int().nonnegative(), pendingAp: z.literal(0),
      affection: z.number().int(), trust: z.number().int(), spark: z.number().int(),
      romanceStage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      // A new journey starts with empty date/ending history. Other statuses
      // require corresponding confession records in a valid GameState.
      confessionStatus: z.literal("none"),
    }).strict().optional(),
    // Editorial game targets, not completed events or real-world prices.
    cityPlan: z.object({
      cityClearAp: z.number().int().positive(),
      lodgingCost: z.number().int().nonnegative(),
      mainTourismCount: z.number().int().nonnegative(),
      dateCount: z.number().int().nonnegative(),
    }).strict().optional(),
    /** Whether completing the epilogue advances to the next released city. */
    cityTransition: z.enum(["manual", "after_epilogue"]).optional(),
    /** Number of travellers included in the authored transport fares. */
    farePartySize: z.number().int().positive().optional(),
    // The key order is the manifests' order (scripts/json-schemas.ts MANIFEST_KEY_ORDER).
    intercityModes: z.array(z.enum(["train", "car"])),
    // In-city transport besides walking (built in): see transport-schemas.ts.
    // content:build allows at most two (a journey still waiting for its
    // switch to this system keeps its old modes, see journey-authoring.ts).
    transportModes: z.array(transportModeSchema),
    // The title screen's art for this journey: an image served from the
    // journey's own public/ folder (or the root public/) with its caption.
    // Without it the title shows the shared default background.
    titleArt: z.object({
      imagePath: z.string().regex(/^assets\/(?!.*\.\.)[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g)$/),
      captionJa: text,
      // Focal point kept in view when the art is cropped (percent; default centre).
      imagePosition: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).strict().optional(),
    }).strict().optional(),
    // The opening movie played once when a new journey starts (2026-11-13; src/features/journey/OpeningMovie.tsx): an
    // MP4 (H.264 and AAC) served from the journey's own public/ folder. Without it the journey starts at once.
    openingMovie: z.object({
      videoPath: z.string().regex(/^assets\/(?!.*\.\.)[a-zA-Z0-9_./-]+\.mp4$/),
    }).strict().optional(),
    // Where the journey's line voices (`# voice:`, its public/assets/voice/) come from (2026-11-13), for 「出典・権利の
    // 一覧」 (src/content/credits.ts voiceCredits): only on a journey with voice files (content:build checks it).
    voiceCredits: z.array(z.object({
      /** Whose voices, as the list names them (「ヒロインの声」). */
      useJa: text,
      /** The work that made them, as the list names it (「音声合成 Irodori-TTS v4.1-Small」). */
      titleJa: text,
      author: text,
      /** The licence as its page names it (「MIT License」). */
      license: text,
      checkedAt: z.iso.date(),
      /** The work's page. */
      url: z.url({ protocol: /^https$/ }),
      /** The credit or citation its author asks for, shown as written. */
      creditJa: text.optional(),
    }).strict()).min(1).optional(),
  }).strict()).min(1),
}).strict().superRefine((catalog, context) => {
  const journeyIds = new Set<string>();
  const cityIds = new Set<string>();
  for (const [index, journey] of catalog.journeys.entries()) {
    if (journeyIds.has(journey.id)) context.addIssue({ code: "custom", message: "Duplicate journey ID", path: ["journeys", index, "id"] });
    journeyIds.add(journey.id);
    if (new Set(journey.intercityModes).size !== journey.intercityModes.length)
      context.addIssue({ code: "custom", message: "Duplicate intercity mode", path: ["journeys", index, "intercityModes"] });
    const modeIds = journey.transportModes.map((mode) => mode.id);
    modeIds.forEach((modeId, modeIndex) => {
      if (modeIds.indexOf(modeId) !== modeIndex)
        context.addIssue({ code: "custom", message: "Duplicate transport mode", path: ["journeys", index, "transportModes", modeIndex, "id"] });
    });
    for (const [cityIndex, city] of journey.cities.entries()) {
      if (cityIds.has(city.id)) context.addIssue({ code: "custom", message: "City belongs to multiple journeys", path: ["journeys", index, "cities", cityIndex, "id"] });
      cityIds.add(city.id);
    }
  }
});

export type JourneyCatalog = z.infer<typeof journeyCatalogSchema>;
export type Journey = JourneyCatalog["journeys"][number];
export type TitleArt = NonNullable<Journey["titleArt"]>;
export type OpeningMovie = NonNullable<Journey["openingMovie"]>;
