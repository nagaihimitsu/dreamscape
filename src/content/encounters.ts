import data from "../../content/encounters/catalog.json";
import tourismData from "../../content/tourism/catalog.json";
import { normalizeEncounterCatalog } from "./encounter-schemas";

/** Encounter catalog with author shorthands normalized. */
export const encounters = normalizeEncounterCatalog(data, tourismData.landmarks);
