import path from "node:path";
import { describe, expect, it } from "vitest";
import { journeysDirectory } from "./content-layout";
import {
  describeSampleLeftovers, journeyFolderFiles, readSampleJourney, SAMPLE_SETTINGS, sampleLeftovers, sampleMarks, SAMPLE_SOURCE_URL,
} from "./sample-journey";

// What journey:readiness counts as sample content left in a journey copied
// from the sample (journey:new): example.com sources, the sample's images and
// its texts, compared whole, without shared phrasing or the scripts' comments.

const sample = readSampleJourney();
const files = (entries: Record<string, string | Buffer>) =>
  new Map(Object.entries(entries).map(([file, data]): [string, Buffer] => [file, Buffer.isBuffer(data) ? data : Buffer.from(data)]));
const json = (value: unknown) => JSON.stringify(value);
const placeFile = sample.files.get("stories/places/smp_mihon_clock_tower.ink")!.toString("utf8");
const sampleLine = placeFile.split("\n").find((line) => line.startsWith("止まってるんだ。"))!;

describe("sample leftovers", () => {
  it("finds every kind in the sample itself, and nothing in the repository's journeys", () => {
    const kinds = new Set(sampleLeftovers(sample.files).map((leftover) => leftover.kind));
    expect([...kinds].sort()).toEqual(["image", "source", "text"]);
    expect(sampleMarks().imageHashes.size).toBe([...sample.files.keys()].filter((file) => file.startsWith("public/")).length);
    for (const id of ["milano", "golden_triangle", "uzbekistan", "luang_prabang"])
      expect(sampleLeftovers(journeyFolderFiles(path.join(journeysDirectory(path.resolve(".")), id))), id).toEqual([]);
  });

  it("counts example.com sources, sample images and whole sample texts per file", () => {
    const image = sample.files.get("public/assets/tourism/sample_trip/mihon_market.png")!;
    expect(sampleLeftovers(files({
      "quizzes/q.json": json({ sources: [{ url: SAMPLE_SOURCE_URL }, { url: "https://www.example.com/other" }, { url: "https://example.com.evil.jp/" }] }),
      "public/assets/tourism/kyoto/market.png": image,
      "public/assets/tourism/kyoto/new.png": Buffer.concat([image, Buffer.from([0])]),
      "stories/tourism/guide.ink": `// ${sampleLine}\n${sampleLine}\n  ${sampleLine}\n止まってるんだ。\n`,
      "romance/presentation.json": json({ backgrounds: { a: { nameJa: "見本の宿", captionJa: "時計塔の広場" } } }),
      "CHECKLIST.md": sampleLine,
    }))).toEqual([
      { file: "public/assets/tourism/kyoto/market.png", kind: "image", count: 1 },
      { file: "quizzes/q.json", kind: "source", count: 2 },
      // 見本 marks the sample's names; a short unmarked name (時計塔の広場) may be real.
      { file: "romance/presentation.json", kind: "text", count: 1 },
      // The rules in `//` comments may stay; whole lines only.
      { file: "stories/tourism/guide.ink", kind: "text", count: 2 },
    ]);
  });

  it("finds the sample's English quiz questions and options, but not an answer as short as a common one", () => {
    const [question] = JSON.parse(sample.files.get("quizzes/smp_mihon_main_clock_tower_quiz.json")!.toString("utf8")).questions;
    expect(question.options.map((option: { textEn: string }) => option.textEn.split(" ").length >= 3)).toEqual([true, true, true]);
    expect(sampleLeftovers(files({ "quizzes/q.json": json({ questions: [{ questionEn: question.questionEn, options: question.options }] }) })))
      .toEqual([{ file: "quizzes/q.json", kind: "text", count: 4 }]);
    // A two-word option of the sample ("Every hour.") could be any quiz's answer.
    expect(sampleMarks().texts.has("Every hour.")).toBe(false);
    expect(sampleMarks().texts.has(question.questionEn)).toBe(true);
  });

  it("finds the sample's English Ink lines and choices, compared by their English only", () => {
    // A copied English line of the sample (any language may be written since stage 1 of the unified event design).
    // The bookmark gift is a knot of the clock tower's place file (stage 3a): its three English choices.
    const gift = placeFile.slice(placeFile.indexOf("=== smp_mihon_bookmark_gift ==="), placeFile.indexOf("=== smp_mihon_clock_bell ==="));
    expect(sampleMarks().texts.has("Shall we keep it in your guidebook?")).toBe(true);
    const line = "Come back at three. Any three will do.";
    const marks = { texts: new Set([...sampleMarks().texts, line]), imageHashes: sampleMarks().imageHashes };
    expect(sampleLeftovers(files({ "stories/battles/b.ink": `# speaker: enemy\n${line} # speaker: enemy\n` }), marks))
      .toEqual([{ file: "stories/battles/b.ink", kind: "text", count: 1 }]);
    // A choice copied with only its # translation: (or # option:) changed is still the sample's choice.
    const changed = gift.split("\n").filter((row) => row.startsWith("* [")).map((row) =>
      row.replace(/# option: \w+/u, "# option: kept").replace(/# translation: [^\]]+/u, "# translation: 新しい訳"));
    expect(changed).toHaveLength(3);
    expect(sampleLeftovers(files({ "stories/encounters/kyoto_gift.ink": changed.join("\n") })))
      .toEqual([{ file: "stories/encounters/kyoto_gift.ink", kind: "text", count: 3 }]);
    // Lines of tags, knots and `cond` code only have no English to count.
    const code = ["# at: visit mihon_clock_tower", "# priority: after observe", "=== smp_mihon_clock_tower_stall ===",
      '{ cond("item smp_mihon_three_bookmark held") }', '{ romance_result == "negative":', "- else:", "-> smp_mihon_return_to_square"];
    const codeMarks = { texts: new Set([...sampleMarks().texts, ...code]), imageHashes: new Set<string>() };
    expect(sampleLeftovers(files({ "stories/encounters/kyoto.ink": code.join("\n") }), codeMarks)).toEqual([]);
  });

  it("leaves shared phrasing alone: word meanings, reward titles and the currency", () => {
    const words = sample.files.get("learning/word-meanings.json")!;
    const rewards = JSON.parse(sample.files.get("progression/journey.json")!.toString("utf8")).rewards;
    const manifest = JSON.parse(sample.files.get("manifest.json")!.toString("utf8"));
    expect(sampleLeftovers(files({
      "learning/word-meanings.json": words,
      "progression/journey.json": json({ episodes: [], rewards }),
      "manifest.json": json({ id: "kyoto_trip", nameJa: "京都の旅", currency: manifest.currency }),
    }))).toEqual([]);
  });

  it("describes the leftovers in one line per kind, with the files inside the journey folder", () => {
    expect(describeSampleLeftovers("content/journeys/kyoto_trip", [
      { file: "public/assets/tourism/kyoto_trip/tower.png", kind: "image", count: 1 },
      { file: "quizzes/q.json", kind: "source", count: 3 },
      { file: "quizzes/q.json", kind: "text", count: 32 },
      { file: "travel/kyoto.json", kind: "source", count: 6 },
    ])).toEqual([
      "見本の出典（example.com）が残っています（2ファイル・計9件）: content/journeys/kyoto_trip/ の quizzes/q.json（3）、travel/kyoto.json（6）",
      "見本の画像のままです（1ファイル）: content/journeys/kyoto_trip/ の public/assets/tourism/kyoto_trip/tower.png",
      "見本の文章が残っています（1ファイル・計32か所）: content/journeys/kyoto_trip/ の quizzes/q.json（32）",
    ]);
  });

  it("names the sample's own settings that readiness notes (country code, coordinates near 0,0, currency and budget)", () => {
    const read = (file: string) => JSON.parse(sample.files.get(file)!.toString("utf8"));
    const manifest = read("manifest.json");
    expect({ currencyCode: manifest.currency.code, initialBudget: manifest.initialBudget })
      .toEqual({ currencyCode: SAMPLE_SETTINGS.currencyCode, initialBudget: SAMPLE_SETTINGS.initialBudget });
    expect(read("cities/mihon.json").countryCode).toBe(SAMPLE_SETTINGS.countryCode);
    for (const place of read("travel/mihon.json").places as { latitude: number; longitude: number }[])
      expect(Math.max(Math.abs(place.latitude), Math.abs(place.longitude))).toBeLessThan(SAMPLE_SETTINGS.maxCoordinate);
  });
});
