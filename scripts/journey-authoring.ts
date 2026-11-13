import { z } from "zod";
import { readJourneyManifests } from "./content-sources";
import { schemaIssueLines } from "./content-validation-utils";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
/** A relative posix path: no absolute path, drive letter or backslash, and no empty, "." or ".." segment. */
export function isRelativePath(value: string): boolean {
  return !value.startsWith("/") && !/^[A-Za-z]:/u.test(value) && !value.includes("\\") &&
    value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
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
}).strict();
export type JourneyAuthoringProfile = z.infer<typeof journeyAuthoringSchema>;

/** The profile schema of one manifest: the authoring paths lie inside the journey's own authoring folder. */
function profileSchemaOf(manifest: Record<string, unknown>) {
  const journeyId = String(manifest.id);
  const folder = authoringFolder(journeyId);
  return journeyAuthoringSchema.superRefine((profile, context) => {
    if (!profile.observationFile.startsWith(folder))
      context.addIssue({ code: "custom", path: ["observationFile"], message: `Keep the authoring files of ${journeyId} below ${folder}` });
  });
}

/** The profile of one manifest, or undefined when it has none; `label` names the manifest in errors. */
export function authoringProfileOf(manifest: Record<string, unknown>, label: string): JourneyAuthoringProfile | undefined {
  if (manifest.authoring === undefined) return undefined;
  const parsed = profileSchemaOf(manifest).safeParse(manifest.authoring);
  if (!parsed.success) throw new Error(`制作ツールの設定（authoring）の形が違います: ${label}:\n${schemaIssueLines(parsed.error.issues)}`, { cause: parsed.error });
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
  if (!profile) throw new Error(`${unknownAuthoringJourney(journeyId)}制作ツールを使える旅行編: ${[...journeyAuthoringProfiles(root).keys()].join(", ") || "なし"}`);
  return profile;
}

/** The refusal of a journey ID the authoring tools do not know (journey:scaffold, journey:release, journey:scenario). */
export function unknownAuthoringJourney(journeyId: string): string {
  return `旅行編「${journeyId}」は登録されていないか、制作ツールの設定（manifest.json の authoring）がありません。`;
}
