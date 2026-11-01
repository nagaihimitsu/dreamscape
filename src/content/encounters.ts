import data from "../../content/encounters/catalog.json";
import tourismData from "../../content/tourism/catalog.json";
import { normalizeEncounterCatalog } from "./encounter-schemas";

/** The same configuration is used for new journeys and migrated saves. */
export const encounters = normalizeEncounterCatalog(data, tourismData.landmarks);
