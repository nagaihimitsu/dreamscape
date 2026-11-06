import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectIndiaReadiness, loadIndiaReadiness } from "./india-readiness";
import { indiaInputFingerprint, indiaReleaseChanges, mergeIndiaReleaseFragments, writeIndiaReleaseFiles } from "./promote-india";
import { getJourneyAuthoringProfile } from "./journey-authoring";

const milanManifest = "content/journeys/milano/manifest.json";
const indiaManifest = "content/journeys/golden_triangle/manifest.json";

function temporaryRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-india-release-test-"));
  const original: Record<string, string> = {
    [milanManifest]: JSON.stringify({ schemaVersion: 1, order: 10, id: "milano", status: "available", cities: [{ id: "milano" }] }),
    [indiaManifest]: JSON.stringify({ schemaVersion: 1, order: 20, id: "golden_triangle", status: "preparing", cities: ["delhi", "agra", "jaipur"].map((id) => ({ id })),
      authoring: getJourneyAuthoringProfile(process.cwd(), "golden_triangle") }),
    "content/progression/journey.json": JSON.stringify({ episodes: [{ id: "milan_episode" }], rewards: [] }),
    "content/battles/catalog.json": JSON.stringify({ battles: [{ id: "milan_battle" }] }),
    "content/romance/date_catalog.json": JSON.stringify({ dates: [{ id: "milan_date" }] }),
    "content/tourism/catalog.json": JSON.stringify({ assets: [{ id: "milan_photo" }], landmarks: [], clues: [] }),
    "content/romance/effect_catalog.json": JSON.stringify({ effects: [{ id: "milan_effect" }] }),
    "content/romance/presentation.json": JSON.stringify({ backgrounds: { milan: {} }, memories: { milan: { titleJa: "ミラノ" } } }),
    "content/learning/translations.json": readFileSync(path.join(process.cwd(), "src/content/generated/content/learning/translations.json"), "utf8"),
  };
  for (const id of ["delhi", "agra", "jaipur"]) {
    original[`content/cities/${id}.json`] = JSON.stringify({ id, productionStatus: "prototype" });
    original[`content/travel/${id}.json`] = JSON.stringify({ cityId: id, places: [{ id: `${id}_place`, landmarkIds: ["existing"] }], events: [{ id: `${id}_event`, contentStatus: "pending_content" }] });
  }
  for (const [file, value] of Object.entries(original)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), value);
  }
  mkdirSync(path.join(root, "public"), { recursive: true });
  return { root, original };
}

describe("India completion and release", () => {
  it("lists authored candidates and does not treat missing episode/date/story data as ready", () => {
    const input = loadIndiaReadiness(process.cwd());
    const empty = { ...input, journey: { ...input.journey, episodes: [], rewards: [], storyBattles: [] },
      tourism: { ...input.tourism, landmarks: [] }, dates: [], battles: [], quizzes: [], storyExists: () => false };
    const report = inspectIndiaReadiness(empty);
    expect(report.ready).toBe(false);
    expect(report.readyForPromotion).toBe(false);
    expect(report.cities.map((city) => city.cityId)).toEqual(input.trip.cities.slice(0, 3).map((city) => city.id));
    for (const city of report.cities) {
      expect(city.issues.some((issue) => issue.code === "finale_missing")).toBe(true);
      expect(city.events.some((event) => event.category === "main" && event.issues.some((issue) => issue.code === "episode_missing"))).toBe(true);
      expect(city.events.some((event) => event.category === "date" && event.issues.some((issue) => issue.code === "date_missing"))).toBe(true);
    }
  });

  it("removes only release markers and leaves Milan and authored data intact", () => {
    const { root, original } = temporaryRoot();
    try {
      const changes = indiaReleaseChanges(original);
      expect(changes[milanManifest]).toBeUndefined();
      expect(JSON.parse(changes[indiaManifest])).toEqual({ ...JSON.parse(original[indiaManifest]), status: "available" });
      for (const id of ["delhi", "agra", "jaipur"]) {
        expect(JSON.parse(changes[`content/cities/${id}.json`]).productionStatus).toBe("complete");
        expect(JSON.parse(changes[`content/travel/${id}.json`]).events).toEqual([{ id: `${id}_event` }]);
      }
      const delhiOnly = indiaReleaseChanges(original, "delhi");
      expect(Object.keys(delhiOnly).sort()).toEqual([indiaManifest, "content/cities/delhi.json", "content/travel/delhi.json"].sort());
      expect(delhiOnly["content/cities/agra.json"]).toBeUndefined();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("restores already changed files when a later write fails", () => {
    const { root, original } = temporaryRoot();
    try {
      const changes = indiaReleaseChanges(original);
      let calls = 0;
      expect(() => writeIndiaReleaseFiles(root, original, changes, (from, to) => {
        if (++calls === 3) throw new Error("simulated write failure");
        renameSync(from, to);
      })).toThrow("simulated write failure");
      for (const [file, value] of Object.entries(original)) expect(readFileSync(path.join(root, file), "utf8")).toBe(value);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("merges one city's fragments without duplicates or overwriting other content", () => {
    const { root, original } = temporaryRoot();
    try {
      const fragments = { episodes: [{ id: "delhi_episode", cityId: "delhi" }], rewards: [{ id: "delhi_reward" }],
        battles: [{ id: "delhi_battle", quizId: "sound_duomo_b1" }], dates: [{ id: "delhi_date" }], landmarks: [{ id: "delhi_place", cityId: "delhi" }],
        clues: [{ id: "delhi_clue" }], finaleEvents: [{ id: "delhi_finale", cityId: "delhi", contentStatus: "pending_content" }],
        effects: [{ id: "delhi_effect" }], memories: { delhi_memory: { titleJa: "デリー" } } } as unknown as Parameters<typeof mergeIndiaReleaseFragments>[2];
      const quiz = loadIndiaReadiness(process.cwd()).quizzes.find((item) => item.id === "sound_duomo_b1")!;
      const changes = mergeIndiaReleaseFragments(original, indiaReleaseChanges(original, "delhi"), fragments, [quiz]);
      const combined = { ...original, ...changes };
      const repeated = mergeIndiaReleaseFragments(combined, indiaReleaseChanges(combined, "delhi"), fragments, [quiz]);
      expect(repeated).toEqual(changes);
      expect(JSON.parse(changes["content/progression/journey.json"]).episodes.map((item: { id: string }) => item.id)).toEqual(["milan_episode", "delhi_episode"]);
      expect(JSON.parse(changes["content/tourism/catalog.json"]).assets).toEqual([{ id: "milan_photo" }]);
      expect(JSON.parse(changes["content/romance/presentation.json"]).backgrounds).toEqual({ milan: {} });
      expect(JSON.parse(changes["content/travel/delhi.json"]).places[0].landmarkIds).toEqual(["existing", "delhi_place"]);
      expect(changes["content/cities/agra.json"]).toBeUndefined();
      const collision = { ...fragments, episodes: [{ id: "milan_episode", cityId: "delhi" }] } as typeof fragments;
      expect(() => mergeIndiaReleaseFragments(original, indiaReleaseChanges(original, "delhi"), collision, [quiz])).toThrow(/Existing episode differs/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("detects edits and additions while validating", () => {
    const { root, original } = temporaryRoot();
    try {
      const before = indiaInputFingerprint(root);
      writeFileSync(path.join(root, "content/journeys/new.json"), "new");
      expect(indiaInputFingerprint(root)).not.toBe(before);
      expect(() => writeIndiaReleaseFiles(root, original, indiaReleaseChanges(original), undefined, before)).toThrow(/Content or assets changed/);
      expect(readFileSync(path.join(root, indiaManifest), "utf8")).toBe(original[indiaManifest]);
      const changed = "content/cities/delhi.json";
      writeFileSync(path.join(root, changed), "edited elsewhere");
      expect(() => writeIndiaReleaseFiles(root, original, indiaReleaseChanges(original))).toThrow(/changed while validating/);
      expect(readFileSync(path.join(root, changed), "utf8")).toBe("edited elsewhere");
      expect(readFileSync(path.join(root, indiaManifest), "utf8")).toBe(original[indiaManifest]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
