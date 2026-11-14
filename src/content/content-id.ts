import { z } from "zod";

/**
 * The one rule for content IDs (journeys, cities, places, catalog entries, the
 * IDs a save keeps): lower-case letters, digits and underscores, starting with
 * a letter. Every content schema, the save format (src/domain/stable-id.ts) and
 * the authoring tools use this schema, so the rule changes in one place.
 */
export const CONTENT_ID_PATTERN = /^[a-z][a-z0-9_]*$/u;

export const contentId = z.string().regex(CONTENT_ID_PATTERN);
