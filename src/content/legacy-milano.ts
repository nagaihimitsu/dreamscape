/** Immutable published content used only to finish existing in-progress saves. */
import battleData from "../../content/legacy/milano_fa0e7e0/battles/catalog.json";
import tourismData from "../../content/legacy/milano_fa0e7e0/tourism/catalog.json";
import dateData from "../../content/legacy/milano_fa0e7e0/romance/date_catalog.json";
import encounterData from "../../content/legacy/milano_fa0e7e0/encounters/catalog.json";
import journeyData from "../../content/legacy/milano_fa0e7e0/progression/journey.json";
import quizData from "../../content/legacy/milano_fa0e7e0/quizzes-compiled.json";
import storyData from "../../content/legacy/milano_fa0e7e0/stories-compiled.json";
import { battleCatalogSchema, dateCatalogSchema, quizSchema } from "./schemas";
import { tourismCatalogSchema } from "./tourism-schemas";
import { encounterCatalogSchema } from "./encounter-schemas";
import { journeySchema } from "./journey-schemas";

const prefix = "legacy_fa0e7e0/";
export const legacyStoryId = (storyId: string): string => `${prefix}${storyId}`;
/** Presentation annotations use published Ink IDs, not the archive namespace. */
export const presentationStoryId = (storyId: string): string =>
  storyId.startsWith(prefix) ? storyId.slice(prefix.length) : storyId;
export const legacyStories: Record<string, string> = Object.fromEntries(
  Object.entries(storyData).map(([id, source]) => [legacyStoryId(id), source]),
);
export const legacyBattles = battleCatalogSchema.parse(battleData).battles;
export const legacyTourism = tourismCatalogSchema.parse(tourismData);
export const legacyDates = dateCatalogSchema.parse(dateData).dates;
export const legacyEncounters = encounterCatalogSchema.parse(encounterData);
export const legacyJourney = journeySchema.parse(journeyData);
export const legacyBattleQuizzes = Object.fromEntries(
  Object.entries(quizData).map(([id, quiz]) => [id, quizSchema.parse(quiz)]),
);
