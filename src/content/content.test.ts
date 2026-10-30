import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import dateData from "../../content/romance/date_catalog.json";
import { parseStoryTags } from "./tags";

let fixture: string;
const storyFile = "content/stories/milano/cafe_01.ink";
const dateFile = "content/romance/date_catalog.json";

beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-content-"));
  await cp(path.resolve("content"), path.join(fixture, "content"), {
    recursive: true,
  });
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

async function replace(file: string, from: string, to: string) {
  const target = path.join(fixture, file);
  const original = await readFile(target, "utf8");
  expect(original).toContain(from);
  await writeFile(target, original.replace(from, to));
}

async function changeDates(change: (data: typeof dateData) => void) {
  const data: typeof dateData = JSON.parse(
    await readFile(path.join(fixture, dateFile), "utf8"),
  );
  change(data);
  await writeFile(path.join(fixture, dateFile), JSON.stringify(data));
}

describe("content build acceptance", () => {
  it("compiles and traverses all nine routes with exactly two three-way choices", async () => {
    const result = await buildContent(fixture);
    expect(result.routes).toBe(9);
    const generated = JSON.parse(
      await readFile(
        path.join(fixture, "src/content/generated/stories.json"),
        "utf8",
      ),
    );
    expect(Object.keys(generated)).toEqual(["milano/cafe_01"]);
  });

  it("reflects edited Ink prose in runtime without a UI source change", async () => {
    await replace(
      storyFile,
      "運河沿いの小さなカフェ。",
      "窓辺に、二人分のコーヒー。",
    );
    const result = await buildContent(fixture, false);
    const story = new Story(result.stories["milano/cafe_01"]);
    expect(story.Continue()).toContain("窓辺に、二人分のコーヒー。");
  });

  it("rejects an unknown story reference", async () => {
    await changeDates((data) => {
      data.dates[0].storyId = "milano/missing";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown storyId",
    );
  });

  it("rejects duplicate stable date IDs", async () => {
    await changeDates((data) => {
      data.dates.push({ ...data.dates[0] });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate dateId",
    );
  });

  it("rejects undefined effects even on a non-default branch", async () => {
    await replace(
      storyFile,
      "effect: milano_cafe_second_honest",
      "effect: undefined_effect",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown effect",
    );
  });

  it("rejects unrecognized tags instead of treating them as code", async () => {
    await replace(storyFile, "# emotion: shy", "# javascript: alert(1)");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown story tag",
    );
  });

  it("rejects unknown background IDs", async () => {
    await replace(storyFile, "background: milano_cafe", "background: nowhere");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown background",
    );
  });

  it("fails on broken Ink instead of emitting a stale story", async () => {
    await replace(storyFile, "-> start", "-> missing_knot");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Ink compilation failed",
    );
  });

  it("rejects branches with fewer than three choices", async () => {
    await replace(
      storyFile,
      "* [「明日はどこへ行きたい？」]",
      "* {false} [「明日はどこへ行きたい？」]",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected three choices",
    );
  });

  it("rejects routes ending before the second choice", async () => {
    await replace(storyFile, "-> after_first", "-> END");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected two choice moments",
    );
  });

  it("rejects malformed JSON syntax", async () => {
    await writeFile(path.join(fixture, dateFile), '{"dates":');
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Cannot read JSON",
    );
  });

  it("rejects valid JSON with invalid schema", async () => {
    await changeDates((data) => {
      data.dates[0].apCost = -1;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("checks the existing future quiz sample without adding battle gameplay", async () => {
    await replace(
      "content/quizzes/last_supper_B1.sample.json",
      '"correctOptionId": "A"',
      '"correctOptionId": "D"',
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Invalid correct option",
    );
  });
});

describe("safe Ink metadata", () => {
  const context = {
    effectIds: ["chosen"],
    backgroundIds: ["cafe"],
    emotionIds: ["shy"],
  };

  it("reads allowlisted metadata for lines and selected choice tags", () => {
    expect(
      parseStoryTags(
        [
          "speaker: heroine",
          "background: cafe",
          "emotion: shy",
          "effect: chosen",
        ],
        context,
      ),
    ).toEqual({
      speaker: "heroine",
      background: "cafe",
      emotion: "shy",
      effects: ["chosen"],
    });
  });

  it("rejects conflicting speaker tags", () => {
    expect(() =>
      parseStoryTags(["speaker: heroine", "speaker: player"], context),
    ).toThrow("Duplicate speaker");
  });
});
