import { mkdtempSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { questionSource } from "../src/content/learning-schema";
import { journeyInputFingerprint, journeyReleaseChanges, mergeJourneyReleaseFragments, writeJourneyReleaseFiles } from "./promote-journey";

// A fictional three-city journey in a temporary folder, beside one unrelated
// published journey: no journey of the repository is read, so these release
// rules stay checked whichever journeys exist.
const journeyId = "test_trip";
const cityIds = ["alpha", "beta", "gamma"];
const ownManifest = `content/journeys/${journeyId}/manifest.json`;
const otherManifest = "content/journeys/other_trip/manifest.json";
const question = { id: "tt_alpha_quiz_0", questionEn: "Where does the fictional bell ring?", correctOptionId: "A",
  options: [{ id: "A", textEn: "At the gate." }, { id: "B", textEn: "At the well." }, { id: "C", textEn: "At the bridge." }] };
const quiz = { id: "tt_alpha_quiz", questions: [question] } as unknown as NonNullable<Parameters<typeof mergeJourneyReleaseFragments>[3]>[number];

function temporaryRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-journey-release-rules-"));
  const original: Record<string, string> = {
    [otherManifest]: JSON.stringify({ schemaVersion: 1, order: 10, id: "other_trip", status: "available", cities: [{ id: "other_city" }] }),
    [ownManifest]: JSON.stringify({ schemaVersion: 1, order: 20, id: journeyId, status: "preparing", cities: cityIds.map((id) => ({ id })),
      authoring: { eventPrefix: "tt", observationFile: `authoring/journeys/${journeyId}/observations.json`, imageDirectory: `assets/tourism/${journeyId}` } }),
    "content/progression/journey.json": JSON.stringify({ episodes: [{ id: "other_episode" }], rewards: [] }),
    "content/battles/catalog.json": JSON.stringify({ battles: [{ id: "other_battle" }] }),
    "content/romance/date_catalog.json": JSON.stringify({ dates: [{ id: "other_date" }] }),
    "content/tourism/catalog.json": JSON.stringify({ assets: [{ id: "other_photo" }], landmarks: [], clues: [] }),
    "content/romance/effect_catalog.json": JSON.stringify({ effects: [{ id: "other_effect" }] }),
    "content/romance/presentation.json": JSON.stringify({ backgrounds: { other: {} }, memories: { other: { titleJa: "ほかの旅" } } }),
    "content/learning/translations.json": JSON.stringify({ schemaVersion: 1, questions: { [question.id]: {
      source: questionSource(question as Parameters<typeof questionSource>[0]),
      questionJa: "架空の鐘はどこで鳴りますか？", optionsJa: { A: "門で。", B: "井戸で。", C: "橋で。" } } } }),
  };
  for (const id of cityIds) {
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

describe("journey release rules", () => {
  it("removes only release markers and leaves the other journey and authored data intact", () => {
    const { root, original } = temporaryRoot();
    try {
      const changes = journeyReleaseChanges(original, journeyId);
      expect(changes[otherManifest]).toBeUndefined();
      expect(JSON.parse(changes[ownManifest])).toEqual({ ...JSON.parse(original[ownManifest]), status: "available" });
      for (const id of cityIds) {
        expect(JSON.parse(changes[`content/cities/${id}.json`]).productionStatus).toBe("complete");
        expect(JSON.parse(changes[`content/travel/${id}.json`]).events).toEqual([{ id: `${id}_event` }]);
      }
      const firstOnly = journeyReleaseChanges(original, journeyId, "alpha");
      expect(Object.keys(firstOnly).sort()).toEqual([ownManifest, "content/cities/alpha.json", "content/travel/alpha.json"].sort());
      expect(firstOnly["content/cities/beta.json"]).toBeUndefined();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("keeps the text of an already released manifest, city and travel file, whatever its layout", () => {
    const { root, original } = temporaryRoot();
    try {
      // The released state, written compactly (as an editor or another tool may leave it): a rerun changes no data,
      // so each file keeps its text instead of being rewritten in the canonical layout.
      const released = { ...original, ...journeyReleaseChanges(original, journeyId) };
      const compact = Object.fromEntries(Object.entries(released).map(([file, value]) => [file, JSON.stringify(JSON.parse(value))]));
      expect(compact[ownManifest]).not.toBe(released[ownManifest]);
      const again = journeyReleaseChanges(compact, journeyId);
      for (const file of [ownManifest, ...cityIds.flatMap((id) => [`content/cities/${id}.json`, `content/travel/${id}.json`])])
        expect(again[file], file).toBe(compact[file]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("restores already changed files when a later write fails", () => {
    const { root, original } = temporaryRoot();
    try {
      const changes = journeyReleaseChanges(original, journeyId);
      let calls = 0;
      expect(() => writeJourneyReleaseFiles(root, original, changes, journeyId, (from, to) => {
        if (++calls === 3) throw new Error("simulated write failure");
        renameSync(from, to);
      })).toThrow("simulated write failure");
      for (const [file, value] of Object.entries(original)) expect(readFileSync(path.join(root, file), "utf8")).toBe(value);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("merges one city's fragments without duplicates or overwriting other content", () => {
    const { root, original } = temporaryRoot();
    try {
      const fragments = { episodes: [{ id: "alpha_episode", cityId: "alpha" }], rewards: [{ id: "alpha_reward" }],
        battles: [{ id: "alpha_battle", quizId: quiz.id }], dates: [{ id: "alpha_date" }], landmarks: [{ id: "alpha_place", cityId: "alpha" }],
        clues: [{ id: "alpha_clue" }], finaleEvents: [{ id: "alpha_finale", cityId: "alpha", contentStatus: "pending_content" }],
        effects: [{ id: "alpha_effect" }], memories: { alpha_memory: { titleJa: "アルファ" } } } as unknown as Parameters<typeof mergeJourneyReleaseFragments>[2];
      const changes = mergeJourneyReleaseFragments(original, journeyReleaseChanges(original, journeyId, "alpha"), fragments, [quiz]);
      const combined = { ...original, ...changes };
      const repeated = mergeJourneyReleaseFragments(combined, journeyReleaseChanges(combined, journeyId, "alpha"), fragments, [quiz]);
      expect(repeated).toEqual(changes);
      // A second release changes no text, so it would write nothing.
      for (const [file, value] of Object.entries(repeated)) expect(value, file).toBe(combined[file]);
      // Also a released travel file in another layout (compact JSON): the fragments add nothing new to it, so it keeps its text.
      const travelFile = "content/travel/alpha.json";
      const compact = { ...combined, [travelFile]: JSON.stringify(JSON.parse(combined[travelFile])) };
      expect(compact[travelFile]).not.toBe(combined[travelFile]);
      expect(mergeJourneyReleaseFragments(compact, journeyReleaseChanges(compact, journeyId, "alpha"), fragments, [quiz])[travelFile]).toBe(compact[travelFile]);
      // A catalog whose data does not change keeps its text (here compact JSON), so it is not rewritten either.
      expect(changes["content/learning/translations.json"]).toBe(original["content/learning/translations.json"]);
      expect(JSON.parse(changes["content/progression/journey.json"]).episodes.map((item: { id: string }) => item.id)).toEqual(["other_episode", "alpha_episode"]);
      expect(JSON.parse(changes["content/tourism/catalog.json"]).assets).toEqual([{ id: "other_photo" }]);
      expect(JSON.parse(changes["content/romance/presentation.json"]).backgrounds).toEqual({ other: {} });
      expect(JSON.parse(changes["content/travel/alpha.json"]).places[0].landmarkIds).toEqual(["existing", "alpha_place"]);
      expect(changes["content/cities/beta.json"]).toBeUndefined();
      const collision = { ...fragments, episodes: [{ id: "other_episode", cityId: "alpha" }] } as typeof fragments;
      expect(() => mergeJourneyReleaseFragments(original, journeyReleaseChanges(original, journeyId, "alpha"), collision, [quiz]))
        .toThrow("Existing episode differs: other_episode");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("writes only the files whose text changes and keeps the text of unchanged ones", () => {
    const { root, original } = temporaryRoot();
    try {
      const released = journeyReleaseChanges(original, journeyId, "alpha");
      expect(writeJourneyReleaseFiles(root, original, released, journeyId).sort()).toEqual(Object.keys(released).sort());
      // Releasing the published city again: nothing to write, so nothing is moved.
      const now = Object.fromEntries(Object.keys(original).map((file) => [file, readFileSync(path.join(root, file), "utf8")]));
      let moves = 0;
      const counted: typeof renameSync = (from, to) => { moves++; renameSync(from, to); };
      expect(writeJourneyReleaseFiles(root, now, journeyReleaseChanges(now, journeyId, "alpha"), journeyId, counted)).toEqual([]);
      expect(moves).toBe(0);
      // A published file in another layout (compact JSON) keeps its text; only the next city's markers are written.
      const compact = "content/cities/alpha.json";
      const edited = { ...now, [compact]: JSON.stringify(JSON.parse(now[compact])) };
      writeFileSync(path.join(root, compact), edited[compact]);
      const next = journeyReleaseChanges(edited, journeyId, "beta");
      expect(next[compact]).toBe(edited[compact]);
      expect(writeJourneyReleaseFiles(root, edited, next, journeyId, counted).sort()).toEqual(["content/cities/beta.json", "content/travel/beta.json"]);
      expect(moves).toBe(2);
      expect(readFileSync(path.join(root, compact), "utf8")).toBe(edited[compact]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("refuses a release when a file it validated changed, also one it would not rewrite", () => {
    const { root, original } = temporaryRoot();
    try {
      writeJourneyReleaseFiles(root, original, journeyReleaseChanges(original, journeyId, "alpha"), journeyId);
      const now = Object.fromEntries(Object.keys(original).map((file) => [file, readFileSync(path.join(root, file), "utf8")]));
      const next = journeyReleaseChanges(now, journeyId, "beta");
      // The published first city is validated with the release of the second, but not rewritten.
      const published = "content/cities/alpha.json";
      expect(next[published]).toBe(now[published]);
      writeFileSync(path.join(root, published), "edited elsewhere");
      let staged = false;
      expect(() => writeJourneyReleaseFiles(root, now, next, journeyId, undefined, undefined, undefined, () => { staged = true; }))
        .toThrow(`File changed while validating: ${published}`);
      // Refused before any temporary file was written.
      expect(staged).toBe(false);
      expect(readFileSync(path.join(root, published), "utf8")).toBe("edited elsewhere");
      expect(readFileSync(path.join(root, "content/cities/beta.json"), "utf8")).toBe(now["content/cities/beta.json"]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("refuses a release when a file it would not rewrite is edited after the temporary files were written", () => {
    const { root, original } = temporaryRoot();
    try {
      writeJourneyReleaseFiles(root, original, journeyReleaseChanges(original, journeyId, "alpha"), journeyId);
      const now = Object.fromEntries(Object.keys(original).map((file) => [file, readFileSync(path.join(root, file), "utf8")]));
      const next = journeyReleaseChanges(now, journeyId, "beta");
      const published = "content/cities/alpha.json";
      expect(next[published]).toBe(now[published]);
      let moves = 0;
      expect(() => writeJourneyReleaseFiles(root, now, next, journeyId, (from, to) => { moves++; renameSync(from, to); }, undefined, undefined,
        () => writeFileSync(path.join(root, published), "edited while staging"))).toThrow(`File changed while validating: ${published}`);
      expect(moves).toBe(0);
      expect(readFileSync(path.join(root, published), "utf8")).toBe("edited while staging");
      for (const file of ["content/cities/beta.json", "content/travel/beta.json", ownManifest]) expect(readFileSync(path.join(root, file), "utf8"), file).toBe(now[file]);
      // The temporary files are removed again.
      for (const folder of ["content/cities", "content/travel", `content/journeys/${journeyId}`])
        expect(readdirSync(path.join(root, folder)).filter((name) => name.includes(".journey-release-")), folder).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("detects edits and additions while validating", () => {
    const { root, original } = temporaryRoot();
    try {
      const before = journeyInputFingerprint(root);
      writeFileSync(path.join(root, "content/journeys/new.json"), "new");
      expect(journeyInputFingerprint(root)).not.toBe(before);
      expect(() => writeJourneyReleaseFiles(root, original, journeyReleaseChanges(original, journeyId), journeyId, undefined, before))
        .toThrow("Content or assets changed while preparing release files.");
      expect(readFileSync(path.join(root, ownManifest), "utf8")).toBe(original[ownManifest]);
      const changed = "content/cities/alpha.json";
      writeFileSync(path.join(root, changed), "edited elsewhere");
      expect(() => writeJourneyReleaseFiles(root, original, journeyReleaseChanges(original, journeyId), journeyId))
        .toThrow(`File changed while validating: ${changed}`);
      expect(readFileSync(path.join(root, changed), "utf8")).toBe("edited elsewhere");
      expect(readFileSync(path.join(root, ownManifest), "utf8")).toBe(original[ownManifest]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
