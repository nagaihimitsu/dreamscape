import { z } from "zod";
import { readJourneyManifests } from "./content-sources";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
/** A relative posix path: no absolute path, drive letter or backslash, and no empty, "." or ".." segment. */
export function isRelativePath(value: string): boolean {
  return !value.startsWith("/") && !/^[A-Za-z]:/u.test(value) && !value.includes("\\") &&
    value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
const japanese = z.string().trim().min(1).refine(
  (value) => /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value), "Expected Japanese text");
const relativePath = z.string().min(1).refine(isRelativePath, "Use a relative path with / separators, without .. or an absolute path");
/** The folder of a journey's authoring files (drafts, research, ledgers): `authoring/journeys/<journeyId>/`. */
export const authoringFolder = (journeyId: string) => `authoring/journeys/${journeyId}/`;
/**
 * Editing conventions of the authoring tools, set by the optional `authoring`
 * key of a journey's `manifest.json`; city order and gameplay belong to the
 * catalogs. A journey without a profile is not supported by those tools.
 * File and folder paths are relative to the repository; authoringProfileOf
 * also keeps them inside the journey's authoring folder.
 */
export const journeyAuthoringSchema = z.object({
  eventPrefix: id,
  observationFile: relativePath,
  /** The journey's tourism image folder below public/ (a served path, e.g. `assets/tourism/india`). */
  imageDirectory: relativePath.refine((value) => value.startsWith("assets/"), "The image folder is a served path below assets/"),
  /**
   * The old journey-wide transit decision ledger for the listed cities (see
   * journey-transit-decisions.ts). Only a journey that still waits for its
   * switch to the per-city transport system keeps it; `pendingJa` says what
   * it waits for (Golden Triangle: 「ツアー機能待ち」) and `inspectCommand` the
   * journey's own command that checks the old ledger meanwhile (Golden
   * Triangle: `npm run india:transit`); content:build, journey:transit and
   * journey:readiness report the journey as waiting instead of applying the
   * new transport checks (scripts/transport-validation.ts).
   */
  transitDecisionLedger: z.object({ file: relativePath, cities: z.array(id).min(1), pendingJa: japanese,
    inspectCommand: z.string().regex(/^npm run [a-z][a-z0-9:_-]*$/, "Use npm run <script name>") }).strict().optional(),
}).strict();
export type JourneyAuthoringProfile = z.infer<typeof journeyAuthoringSchema>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The profile schema of one manifest: the authoring paths lie inside the
 * journey's own authoring folder, and the transit ledger lists only cities of
 * the manifest.
 */
function profileSchemaOf(manifest: Record<string, unknown>) {
  const journeyId = String(manifest.id);
  const folder = authoringFolder(journeyId);
  const cityIds = (Array.isArray(manifest.cities) ? manifest.cities : []).map((city) => (isObject(city) ? city.id : undefined));
  return journeyAuthoringSchema.superRefine((profile, context) => {
    const paths: [string[], string | undefined][] = [
      [["observationFile"], profile.observationFile],
      [["transitDecisionLedger", "file"], profile.transitDecisionLedger?.file],
    ];
    for (const [path, value] of paths)
      if (value !== undefined && !value.startsWith(folder))
        context.addIssue({ code: "custom", path, message: `Keep the authoring files of ${journeyId} below ${folder}` });
    profile.transitDecisionLedger?.cities.forEach((cityId, index) => {
      if (!cityIds.includes(cityId))
        context.addIssue({ code: "custom", path: ["transitDecisionLedger", "cities", index], message: `${cityId} is not a city of this manifest` });
    });
  });
}

/** The profile of one manifest, or undefined when it has none; `label` names the manifest in errors. */
export function authoringProfileOf(manifest: Record<string, unknown>, label: string): JourneyAuthoringProfile | undefined {
  if (manifest.authoring === undefined) return undefined;
  const parsed = profileSchemaOf(manifest).safeParse(manifest.authoring);
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
