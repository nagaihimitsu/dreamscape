// Previous publication used only to resume a known content fingerprint.
import data from "../../content/legacy/milano_3f32b60/snapshot.json";
import { battleCatalogSchema, quizSchema } from "./schemas";
import { tourismCatalogSchema } from "./tourism-schemas";
import { normalizeEncounterCatalog } from "./encounter-schemas";
import { journeySchema } from "./journey-schemas";

export const previousMilanoBattles = battleCatalogSchema.parse(data.battles).battles;
export const previousMilanoTourism = tourismCatalogSchema.parse(data.tourism);
export const previousMilanoEncounters = normalizeEncounterCatalog(data.encounters, previousMilanoTourism.landmarks).encounters;
export const previousMilanoJourney = journeySchema.parse(data.journey);
export const previousMilanoQuizzes = Object.fromEntries(Object.entries(data.quizzes).map(([id, quiz]) => [id, quizSchema.parse(quiz)]));
export const previousMilanoIntroductions: Readonly<Record<string, string>> = data.introductions;
