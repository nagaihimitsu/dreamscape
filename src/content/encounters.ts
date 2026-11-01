import data from "../../content/encounters/catalog.json";
import { encounterCatalogSchema } from "./encounter-schemas";

/** The same configuration is used for new journeys and migrated saves. */
export const encounters = encounterCatalogSchema.parse(data);
