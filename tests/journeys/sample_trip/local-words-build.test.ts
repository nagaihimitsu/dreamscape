// content:build's checks of the words of the country (2026-11-11 user decision), on the sample journey's word (fictional)
// changed in memory: it stops a tag that names no word, a malformed tag, the same word twice on a line, a word without
// sources or with an empty reading, an ID twice and a city that does not exist.
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "../../../scripts/content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";

const WORD = "smp_mihon_word_trisol";
const GUIDE = "stories/places/smp_mihon_clock_tower.ink";
const WORDS = "learning/local-words.json";

describe("content:build's checks of the words of the country", () => {
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
  /** The guide's tag line written as `lines`. */
  const tag = (lines: string) => (text: string) => text.replace(`# local_word: ${WORD}\n`, `${lines}\n`);
  /** The catalog's words changed. */
  const words = (change: (list: Record<string, unknown>[]) => unknown[]) => (text: string) => {
    const data = JSON.parse(text) as { words: Record<string, unknown>[] };
    return JSON.stringify({ ...data, words: change(data.words) });
  };

  it("stops a tag that names no word of the catalog, a malformed tag and the same word twice on a line", () => {
    expect(() => validateContent(sampleWith({ [GUIDE]: tag("# local_word: smp_mihon_word_unknown") }))).toThrow("Unknown local word: smp_mihon_word_unknown");
    expect(() => validateContent(sampleWith({ [GUIDE]: tag("# local_word: Trisol") }))).toThrow("Invalid local_word tag: Trisol");
    expect(() => validateContent(sampleWith({ [GUIDE]: tag("# local_word:") }))).toThrow("Invalid story tag: local_word:");
    expect(() => validateContent(sampleWith({ [GUIDE]: tag(`# local_word: ${WORD}\n# local_word: ${WORD}`) }))).toThrow(`Duplicate local_word tag: ${WORD}`);
  });

  it("stops a word without sources or with an empty reading, an ID twice and a city that does not exist; a word may have no city", () => {
    const invalid = /Invalid content in .*learning\/local-words\.json/u;
    expect(() => validateContent(sampleWith({ [WORDS]: words((list) => list.map((item) => ({ ...item, sources: [] }))) }))).toThrow(invalid);
    expect(() => validateContent(sampleWith({ [WORDS]: words((list) => list.map((item) => ({ ...item, reading: " " }))) }))).toThrow(invalid);
    expect(() => validateContent(sampleWith({ [WORDS]: words((list) => [...list, list[0]]) }))).toThrow("Duplicate local word ID");
    expect(() => validateContent(sampleWith({ [WORDS]: words((list) => list.map((item) => ({ ...item, cityId: "atlantis" }))) })))
      .toThrow(`Unknown local word city: ${WORD}/atlantis`);
    expect(() => validateContent(sampleWith({ [WORDS]: words((list) => list.map(({ cityId: _city, ...item }) => item)) }))).not.toThrow();
  });
});
