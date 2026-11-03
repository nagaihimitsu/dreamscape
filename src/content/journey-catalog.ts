import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);

/** A journey is a separate game; cities are ordered but may still be unbuilt. */
export const journeyCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  journeys: z.array(z.object({
    id,
    nameJa: text,
    status: z.enum(["available", "preparing"]),
    cities: z.array(z.object({ id, nameJa: text }).strict()).min(1),
    currency: z.object({ code: z.string().regex(/^[A-Z]{3}$/), symbol: text,
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
    intercityModes: z.array(z.enum(["train", "car"])),
  }).strict()).min(1),
}).strict().superRefine((catalog, context) => {
  const journeyIds = new Set<string>();
  const cityIds = new Set<string>();
  for (const [index, journey] of catalog.journeys.entries()) {
    if (journeyIds.has(journey.id)) context.addIssue({ code: "custom", message: "Duplicate journey ID", path: ["journeys", index, "id"] });
    journeyIds.add(journey.id);
    if (new Set(journey.intercityModes).size !== journey.intercityModes.length)
      context.addIssue({ code: "custom", message: "Duplicate intercity mode", path: ["journeys", index, "intercityModes"] });
    for (const [cityIndex, city] of journey.cities.entries()) {
      if (cityIds.has(city.id)) context.addIssue({ code: "custom", message: "City belongs to multiple journeys", path: ["journeys", index, "cities", cityIndex, "id"] });
      cityIds.add(city.id);
    }
  }
});

export type Journey = z.infer<typeof journeyCatalogSchema>["journeys"][number];
