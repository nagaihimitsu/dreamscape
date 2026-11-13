import { describe, expect, it } from "vitest";
import { readJourneyManifests } from "./content-sources";
import { authoringProfileOf, isRelativePath, journeyAuthoringProfiles } from "./journey-authoring";

// The authoring profile of a manifest (`authoring`) points the tools at files
// they read and write; keep those inside the journey's own authoring folder.

const manifest = (authoring: Record<string, unknown>) => ({
  id: "kyoto", cities: [{ id: "kyoto_city", nameJa: "京都" }, { id: "nara", nameJa: "奈良" }],
  authoring: {
    eventPrefix: "ky",
    observationFile: "authoring/journeys/kyoto/drafts/observation-cards.json",
    imageDirectory: "assets/tourism/kyoto",
    ...authoring,
  },
});
const label = "content/journeys/kyoto/manifest.json";
/** The issue paths and messages of a rejected profile. */
function issues(authoring: Record<string, unknown>) {
  try {
    authoringProfileOf(manifest(authoring), label);
  } catch (error) {
    expect((error as Error).message).toContain(`制作ツールの設定（authoring）の形が違います: ${label}:\n  - `);
    return ((error as Error).cause as { issues: { path: PropertyKey[]; message: string }[] }).issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  }
  throw new Error("The profile was accepted");
}

describe("journey authoring profiles", () => {
  it("accepts paths inside the journey's authoring folder", () => {
    expect(authoringProfileOf(manifest({}), label)?.eventPrefix).toBe("ky");
    expect(authoringProfileOf({ id: "milano", cities: [] }, label)).toBeUndefined();
  });

  it("rejects absolute paths, .. segments and backslashes", () => {
    expect(isRelativePath("authoring/journeys/kyoto/a.json")).toBe(true);
    for (const value of ["/authoring/journeys/kyoto/a.json", "C:/repo/a.json", "authoring\\journeys\\kyoto\\a.json",
      "authoring/journeys/kyoto/../milano/a.json", "./authoring/journeys/kyoto/a.json", "authoring/journeys/kyoto/", "authoring//a.json"])
      expect(isRelativePath(value), value).toBe(false);
    expect(issues({ observationFile: "authoring/journeys/kyoto/../milano/drafts/observation-cards.json" }))
      .toContain("observationFile: Use a relative path with / separators, without .. or an absolute path");
    expect(issues({ observationFile: "/tmp/kyoto/observation-cards.json" }))
      .toContain("observationFile: Use a relative path with / separators, without .. or an absolute path");
  });

  it("keeps the files below authoring/journeys/<journeyId>/", () => {
    expect(issues({ observationFile: "authoring/journeys/milano/drafts/observation-cards.json" }))
      .toEqual(["observationFile: Keep the authoring files of kyoto below authoring/journeys/kyoto/"]);
    // A neighbour whose name starts with the journey ID is another folder.
    expect(issues({ observationFile: "authoring/journeys/kyoto_old/drafts/observation-cards.json" }))
      .toEqual(["observationFile: Keep the authoring files of kyoto below authoring/journeys/kyoto/"]);
    // Per-city transit ledgers are content files (travel/<city>-transit.json); the old ledger keys are refused.
    expect(issues({ transitDirectory: "authoring/journeys/kyoto/research/transit" }))
      .toEqual([': Unrecognized key: "transitDirectory"']);
    expect(issues({ transitDecisionLedger: { file: "authoring/journeys/kyoto/research/decisions.json", cities: ["nara"], pendingJa: "ツアー機能待ち", inspectCommand: "npm run kyoto:transit" } }))
      .toEqual([': Unrecognized key: "transitDecisionLedger"']);
  });

  it("keeps the image folder a served path below assets/", () => {
    expect(issues({ imageDirectory: "public/assets/tourism/kyoto" })).toEqual(["imageDirectory: The image folder is a served path below assets/"]);
    expect(issues({ imageDirectory: "assets/../tourism" }))
      .toContain("imageDirectory: Use a relative path with / separators, without .. or an absolute path");
  });

  it("accepts the repository's profiles", () => {
    // Every manifest that declares `authoring` (also a journey made by journey:new), in manifest order.
    const declared = readJourneyManifests(process.cwd()).filter((manifest) => manifest.data.authoring !== undefined).map((manifest) => manifest.id);
    expect(declared.length).toBeGreaterThan(0);
    expect([...journeyAuthoringProfiles(process.cwd()).keys()]).toEqual(declared);
  });
});
