import { z } from "zod";
import { readJourneyManifests } from "./content-sources";

/**
 * Editing conventions of the authoring tools, set by the optional `authoring`
 * key of a journey's `manifest.json`; city order and gameplay belong to the
 * catalogs. A journey without a profile is not supported by those tools.
 */
export const journeyAuthoringSchema = z.object({
  eventPrefix: z.string().regex(/^[a-z][a-z0-9_]*$/),
  observationFile: z.string().min(1),
  imageDirectory: z.string().min(1),
  transitDirectory: z.string().min(1).optional(),
}).strict();
export type JourneyAuthoringProfile = z.infer<typeof journeyAuthoringSchema>;

/** The profile of one manifest, or undefined when it has none; `label` names the manifest in errors. */
export function authoringProfileOf(manifest: Record<string, unknown>, label: string): JourneyAuthoringProfile | undefined {
  if (manifest.authoring === undefined) return undefined;
  const parsed = journeyAuthoringSchema.safeParse(manifest.authoring);
  if (!parsed.success) throw new Error(`Invalid authoring profile in ${label}: ${parsed.error.message}`, { cause: parsed.error });
  return parsed.data;
}

/** Profiles of every journey that has one, in manifest order. */
export function journeyAuthoringProfiles(root: string): Map<string, JourneyAuthoringProfile> {
  const profiles = new Map<string, JourneyAuthoringProfile>();
  for (const manifest of readJourneyManifests(root)) {
    const profile = authoringProfileOf(manifest.data, manifest.file);
    if (profile) profiles.set(manifest.id, profile);
  }
  return profiles;
}

export function getJourneyAuthoringProfile(root: string, journeyId: string): JourneyAuthoringProfile {
  const profile = journeyAuthoringProfiles(root).get(journeyId);
  if (!profile) throw new Error(`Unknown authoring journey: ${journeyId}`);
  return profile;
}
