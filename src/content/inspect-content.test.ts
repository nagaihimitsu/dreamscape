import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inferContentType, inspectFile } from "../../scripts/inspect-content";
import { quizSourceFile } from "./test-fixtures";

/** A production quiz file, wherever its journey folder keeps it. */
const duomoQuiz = quizSourceFile("sound_duomo_b1");

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "dreamscape-inspect-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("standalone content inspection", () => {
  it("accepts the same quiz in an arbitrary draft path by explicit type without modifying it", async () => {
    const input = await readFile(
      path.resolve(duomoQuiz),
      "utf8",
    );
    const draft = path.join(directory, "draft.json");
    await writeFile(draft, input);
    expect(await inspectFile(draft, "quiz")).toBe("quiz");
    expect(await readFile(draft, "utf8")).toBe(input);
    expect(
      inferContentType(path.resolve(duomoQuiz)),
    ).toBe("quiz");
  });
  it("identifies JSON syntax, wrong correct ID and file path", async () => {
    const draft = path.join(directory, "draft.json");
    await writeFile(draft, "{");
    await expect(inspectFile(draft, "quiz")).rejects.toThrow(draft);
    const quiz = JSON.parse(
      await readFile(path.resolve(duomoQuiz), "utf8"),
    );
    quiz.questions[0].options[0].id = quiz.questions[0].options[1].id;
    await writeFile(draft, JSON.stringify(quiz));
    try {
      await inspectFile(draft, "quiz");
      throw new Error("accepted duplicate");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(draft);
      expect(String((error as Error).cause)).toContain(
        "Duplicate quiz option ID",
      );
    }
  });
  it("compiles standalone Ink and rejects unknown explicit types", async () => {
    const file = path.join(directory, "story.ink");
    await writeFile(file, "こんにちは。\n-> END\n");
    expect(await inspectFile(file)).toBe("ink");
    await expect(inspectFile(file, "other")).rejects.toThrow("--type");
  });
  it("checks a catalog of a journey folder as part of the merged catalog", async () => {
    const presentation = JSON.parse(await readFile(path.resolve("src/content/generated/content/romance/presentation.json"), "utf8"));
    const write = async (relative: string, value: unknown) => {
      await mkdir(path.dirname(path.join(directory, relative)), { recursive: true });
      await writeFile(path.join(directory, relative), JSON.stringify(value));
      return path.join(directory, relative);
    };
    await write("content/romance/presentation.json", presentation);
    await write("content/journeys/test_journey/manifest.json", { schemaVersion: 1, order: 10, id: "test_journey" });
    const background = Object.values(presentation.backgrounds)[0];
    const fragment = await write("content/journeys/test_journey/romance/presentation.json",
      { schemaVersion: 1, backgrounds: { test_journey_bg: background }, memories: {} });
    // The journey's part alone lacks the core keys; together with the core layer it is complete.
    await expect(inspectFile(fragment, "presentation")).resolves.toBe("presentation");
    expect(await inspectFile(fragment)).toBe("presentation");
    await write("content/journeys/test_journey/romance/presentation.json",
      { schemaVersion: 1, backgrounds: { test_journey_bg: { ...(background as object), color: 3 } }, memories: {} });
    try {
      await inspectFile(fragment);
      throw new Error("accepted an invalid background");
    } catch (error) {
      expect((error as Error).message).toBe(`検証失敗: ${fragment}`);
      expect(String((error as Error).cause)).toContain(`Invalid content in ${fragment}`);
    }
  });
});
