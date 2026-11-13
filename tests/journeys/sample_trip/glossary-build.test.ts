// content:build's checks of 旅の図鑑 (2026-11-13 user decision), on the sample journey's fictional term (三時パン)
// changed in memory: it stops a tag naming no term, a term whose picture is not registered, a line over 60 characters
// and an ID twice; it warns about a line over 40 characters, a term no tag names and a term tagged twice in one scene.
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "../../../scripts/content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";

const TERM = "smp_term_mihon_sanji_pan";
const GUIDE = "stories/places/smp_mihon_market.ink";
const TERMS = "glossary/terms.json";
const TAG = `# term: ${TERM}\n`;

describe("content:build's checks of 旅の図鑑", () => {
  let sample: ContentSources;
  beforeAll(() => {
    sample = selectJourneys(loadContentSources(path.resolve("."), { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), [SAMPLE_JOURNEY_ID]);
  });
  /** The sample's sources with some of its files changed (path inside the sample folder → new text). */
  const sampleWith = (changes: Record<string, (text: string) => string>): ContentSources => {
    const files = new Map(sample.tree.files);
    for (const [file, change] of Object.entries(changes)) {
      const treePath = `${SAMPLE_JOURNEY_DIRECTORY}/${file}`;
      files.set(treePath, Buffer.from(change(files.get(treePath)!.toString("utf8"))));
    }
    return contentSourcesFromTree({ ...sample.tree, files });
  };
  /** The catalog's terms changed. */
  const terms = (change: (list: Record<string, unknown>[]) => unknown[]) => (text: string) => {
    const data = JSON.parse(text) as { terms: Record<string, unknown>[] };
    return JSON.stringify({ ...data, terms: change(data.terms) });
  };
  const glossaryNotes = (sources: ContentSources) => validateContent(sources).warnings.filter((warning) => warning.kind === "glossary")
    .map((warning) => warning.message);

  it("lists the sample's term with its journey and warns about nothing", () => {
    const content = validateContent(sample);
    expect(content.glossaryTerms).toEqual([expect.objectContaining({ id: TERM, imageId: "smp_img_mihon_sanji_pan", journeyId: SAMPLE_JOURNEY_ID })]);
    expect(content.warnings.filter((warning) => warning.kind === "glossary")).toEqual([]);
  });

  it("stops a tag naming no term and a malformed tag", () => {
    expect(() => validateContent(sampleWith({ [GUIDE]: (text) => text.replace(TAG, "# term: smp_term_unknown\n") })))
      .toThrow("Unknown term in # term: smp_term_unknown");
    expect(() => validateContent(sampleWith({ [GUIDE]: (text) => text.replace(TAG, "# term: Sanji\n") }))).toThrow(/Unknown term in # term: Sanji|Invalid term tag/u);
    expect(() => validateContent(sampleWith({ [GUIDE]: (text) => text.replace(TAG, `${TAG}${TAG}`) }))).toThrow(`Duplicate term tag: ${TERM}`);
  });

  it("stops a picture that is not registered, a line over 60 characters and an ID twice", () => {
    expect(() => validateContent(sampleWith({ [TERMS]: terms((list) => list.map((item) => ({ ...item, imageId: "smp_img_missing" }))) })))
      .toThrow("Unregistered term image: smp_img_missing");
    expect(() => validateContent(sampleWith({ [TERMS]: terms((list) => list.map((item) => ({ ...item, lineJa: "あ".repeat(61) }))) })))
      .toThrow(`Term line over 60 characters: ${TERM}, 61`);
    expect(() => validateContent(sampleWith({ [TERMS]: terms((list) => list.map((item) => ({ ...item, lineJa: "あ".repeat(60) }))) }))).not.toThrow();
    expect(() => validateContent(sampleWith({ [TERMS]: terms((list) => [...list, list[0]]) }))).toThrow(`Duplicate term ID: ${TERM}`);
    expect(() => validateContent(sampleWith({ [TERMS]: terms((list) => list.map((item) => ({ ...item, category: "drink" }))) })))
      .toThrow(/Invalid content in .*glossary\/terms\.json/u);
  });

  it("takes a term without its reading or other name", () => {
    expect(() => validateContent(sampleWith({ [TERMS]: terms((list) => list.map(({ readingJa: _reading, aliasJa: _alias, ...item }) => item)) })))
      .not.toThrow();
  });

  it("warns about a line over 40 characters, a term no tag names and a term tagged twice in one scene", () => {
    expect(glossaryNotes(sampleWith({ [TERMS]: terms((list) => list.map((item) => ({ ...item, lineJa: "あ".repeat(41) }))) })))
      .toEqual([expect.stringContaining(`Term line over 40 characters: ${TERM}, 41`)]);
    expect(glossaryNotes(sampleWith({ [GUIDE]: (text) => text.replace(TAG, "") })))
      .toEqual([expect.stringContaining(`Term without a # term: tag: ${TERM}`)]);
    expect(glossaryNotes(sampleWith({ [GUIDE]: (text) => text.replace("# speaker: heroine\n# emotion: happy\n", `# speaker: heroine\n# emotion: happy\n${TAG}`) })))
      .toEqual([expect.stringContaining(`Term tagged twice in one scene: ${TERM}`)]);
  });
});
