import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { prepareContentFixture } from "../src/content/test-fixtures";
import { BUILD_INFO_FILE } from "./content-outputs";
import { GENERATED_PUBLIC_DIRECTORY, MIRROR_DIRECTORY, SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID, journeysDirectory } from "./content-layout";
import { buildContent } from "./content-pipeline";
import { contentSourcesFromTree, listFiles, loadContentSources, selectJourneys, type ContentSources } from "./content-sources";
import { validateContent } from "./content-validation";
import { inspectJourneyReadiness, journeyReadinessInput } from "./journey-readiness";
import { readSampleJourney, withoutOptionalParts } from "./sample-journey";

// The sample journey (authoring/templates/sample_trip/) is the minimum example
// of a journey folder. Its README lists the required files with the error each
// one prevents, and the optional parts; these tests keep the README true:
// (a) the core content plus the sample alone builds and is ready to publish,
// (b) without the optional parts it still builds, and every required file is
//     necessary, (c) the README lists exactly the files of the folder.

const repository = path.resolve(".");
const folder = path.join(repository, SAMPLE_JOURNEY_DIRECTORY);
const treePrefix = `${SAMPLE_JOURNEY_DIRECTORY}/`;

const { readme } = readSampleJourney(folder);
const optionalFiles = readme.optional.flatMap((part) => part.files);
const optionalIds = readme.optional.flatMap((part) => part.ids);
const sampleFiles = listFiles(folder).filter((file) => file !== "README.md").sort();

describe("sample journey", () => {
  let core: ContentSources;
  /** The sources of the core layer plus the given sample files (path inside the sample folder → bytes). */
  const sourcesWith = (files: ReadonlyMap<string, Buffer | null>) => contentSourcesFromTree({
    ...core.tree,
    files: new Map([...core.tree.files].filter(([treePath]) => !treePath.startsWith(treePrefix))
      .concat([...files].map(([file, bytes]) => [`${treePrefix}${file}`, bytes]))),
  });
  let full: Map<string, Buffer | null>;
  let minimal: Map<string, Buffer | null>;

  beforeAll(() => {
    core = selectJourneys(loadContentSources(repository, { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), [SAMPLE_JOURNEY_ID]);
    // Every file of the folder except its README (notes are not content).
    full = new Map([...core.tree.files].filter(([treePath]) => treePath.startsWith(treePrefix) && treePath !== `${treePrefix}README.md`)
      .map(([treePath, bytes]) => [treePath.slice(treePrefix.length), bytes]));
    minimal = withoutOptionalParts(full, readme);
  });

  it("(c) lists every file of the folder in its README, each once, as required or optional", () => {
    expect(readme.core).toHaveLength(20);
    const listed = [...readme.core.map((item) => item.file), ...optionalFiles];
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.sort()).toEqual(sampleFiles);
    // Each Ink file starts with comments that explain the rules of its kind of script.
    for (const file of sampleFiles.filter((name) => name.endsWith(".ink")))
      expect(readFileSync(path.join(folder, file), "utf8"), file).toMatch(/^\/\/ \S/u);
  });

  it("is clearly fictional everywhere: sources at example.com and claims marked as the sample's", () => {
    const urls: string[] = [];
    const claims: string[] = [];
    const visit = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object")
        for (const [key, item] of Object.entries(value)) {
          if ((key === "url" || key === "sourceUrl") && typeof item === "string") urls.push(item);
          if (key === "claimJa" && typeof item === "string") claims.push(item);
          visit(item);
        }
    };
    for (const file of sampleFiles.filter((name) => name.endsWith(".json")))
      visit(JSON.parse(readFileSync(path.join(folder, file), "utf8")));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((url) => url !== "https://example.com/dreamscape-sample")).toEqual([]);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.filter((claim) => !claim.startsWith("見本用の架空の"))).toEqual([]);
  });

  it("(b) still builds without its optional parts, and stops without any one required file", () => {
    expect(() => validateContent(sourcesWith(full))).not.toThrow();
    expect([...minimal.keys()].sort()).toEqual(readme.core.map((item) => item.file).sort());
    expect(() => validateContent(sourcesWith(minimal))).not.toThrow();
    // Nothing of the optional parts is left in the minimal subset.
    for (const [file, bytes] of minimal)
      if (bytes) for (const id of optionalIds) expect(bytes.toString("utf8"), `${file}: ${id}`).not.toContain(`"${id}"`);
    for (const { file, error } of readme.core) {
      const files = new Map(minimal);
      files.delete(file);
      // "…" in the README stands for the part of the message that differs by machine (the absolute folder).
      const message = new RegExp(error.split("…").map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join(".*"), "u");
      expect(() => validateContent(sourcesWith(files)), file).toThrow(message);
    }
    // The minimal subset is ready to publish too.
    expect(inspectJourneyReadiness(journeyReadinessInput(sourcesWith(minimal), SAMPLE_JOURNEY_ID)).ready).toBe(true);
  });

  it("spreads its correct answers over the options, also without the optional parts (journey:new copies them)", () => {
    const correctLetters = (files: ReadonlyMap<string, Buffer | null>) => [...files]
      .filter(([file, bytes]) => file.startsWith("quizzes/") && bytes)
      .flatMap(([, bytes]) => (JSON.parse(bytes!.toString("utf8")) as { questions: { options: { id: string }[]; correctOptionId: string }[] }).questions)
      .map((question) => {
        expect(question.options.map((option) => option.id)).toEqual(["A", "B", "C"]);
        return question.correctOptionId;
      });
    for (const [label, files] of [["full", full], ["minimal", minimal]] as const) {
      const letters = correctLetters(files);
      for (const letter of ["A", "B", "C"]) {
        const count = letters.filter((item) => item === letter).length;
        expect(count, `${label}: ${letter}`).toBeGreaterThan(0);
        expect(count, `${label}: ${letter}`).toBeLessThanOrEqual(letters.length / 2);
      }
    }
  });

  describe("(a) with the core content only", () => {
    let root: string;
    beforeAll(async () => {
      root = mkdtempSync(path.join(tmpdir(), "dreamscape-sample-journey-"));
      await prepareContentFixture(root);
      rmSync(journeysDirectory(root), { recursive: true, force: true });
      // Loaded from where it lives, outside content/journeys/, like `npm run content:build -- --with-sample`.
      cpSync(folder, path.join(root, SAMPLE_JOURNEY_DIRECTORY), { recursive: true });
    });
    afterAll(() => rmSync(root, { recursive: true, force: true }));

    it("builds, records the extra folder, serves its images and is ready to publish", async () => {
      await expect(buildContent(root)).rejects.toThrow("旅行編が登録されていません");
      const result = await buildContent(root, true, { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] });
      expect(result.journeyContents.map((journey) => journey.id)).toEqual([SAMPLE_JOURNEY_ID]);
      expect(JSON.parse(readFileSync(path.join(root, BUILD_INFO_FILE), "utf8")))
        .toEqual({ extraJourneyFolders: { [SAMPLE_JOURNEY_ID]: SAMPLE_JOURNEY_DIRECTORY } });
      const catalog = journeyCatalogSchema.parse(JSON.parse(readFileSync(path.join(root, MIRROR_DIRECTORY, "journeys/catalog.json"), "utf8")));
      expect(catalog.journeys.map((journey) => [journey.id, journey.status])).toEqual([[SAMPLE_JOURNEY_ID, "available"]]);
      for (const image of sampleFiles.filter((file) => file.startsWith("public/")))
        expect(existsSync(path.join(root, GENERATED_PUBLIC_DIRECTORY, image.slice("public/".length))), image).toBe(true);
      const sources = loadContentSources(root, { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] });
      expect(inspectJourneyReadiness(journeyReadinessInput(sources, SAMPLE_JOURNEY_ID))).toMatchObject({ ready: true, issues: [] });
    });
  });

  it("is loaded only by the commands that ask for it, never by the production build", () => {
    const { scripts } = JSON.parse(readFileSync(path.join(repository, "package.json"), "utf8")) as { scripts: Record<string, string> };
    for (const name of ["pretest", "pretest:quick", "dev:sample"]) expect(scripts[name], name).toContain("--with-sample");
    for (const name of ["build", "predev", "content:build"]) expect(scripts[name], name).not.toContain("--with-sample");
    // verify tests with the sample, then makes the deployed build without it.
    expect(scripts.verify).toMatch(/--with-sample && npm run test --ignore-scripts && npm run build$/u);
    // The authoring tools read content/journeys/ only.
    expect(loadContentSources(repository).manifests.map((manifest) => manifest.id)).not.toContain(SAMPLE_JOURNEY_ID);
  });
});
