import data from "./generated/content/encounters/catalog.json";
import tourismData from "./generated/content/tourism/catalog.json";
import { normalizeEncounterCatalog } from "./encounter-schemas";

/** Encounter catalog with author shorthands normalized. */
export const encounters = normalizeEncounterCatalog(data, tourismData.landmarks);
