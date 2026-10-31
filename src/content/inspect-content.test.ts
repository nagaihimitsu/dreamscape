import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inferContentType, inspectFile } from "../../scripts/inspect-content";

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
      path.resolve("content/quizzes/duomo_B1.json"),
      "utf8",
    );
    const draft = path.join(directory, "draft.json");
    await writeFile(draft, input);
    expect(await inspectFile(draft, "quiz")).toBe("quiz");
    expect(await readFile(draft, "utf8")).toBe(input);
    expect(
      inferContentType(path.resolve("content/quizzes/duomo_B1.json")),
    ).toBe("quiz");
  });
  it("identifies JSON syntax, wrong correct ID and file path", async () => {
    const draft = path.join(directory, "draft.json");
    await writeFile(draft, "{");
    await expect(inspectFile(draft, "quiz")).rejects.toThrow(draft);
    const quiz = JSON.parse(
      await readFile(path.resolve("content/quizzes/duomo_B1.json"), "utf8"),
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
});
