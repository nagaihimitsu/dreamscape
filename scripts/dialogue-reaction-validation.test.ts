import { describe, expect, it, vi } from "vitest";
import { dialogueReactionCatalogSchema } from "../src/content/dialogue-reactions";
import { compileInk, validateStory } from "./content-pipeline";
import { createDialogueReactionValidator } from "./dialogue-reaction-validation";

const storyId = "milano/test";
const text = "「ここにいよう」";
const entry = { storyId, text, speaker: "heroine" as const, targetCharacterId: "heroine" as const, mark: "heart" as const };
const catalog = () => dialogueReactionCatalogSchema.parse({ schemaVersion: 1, entries: [entry] });
const source = `VAR player_name = "なお"
VAR heroine_name = "りえ"
# speaker: heroine
${text}
-> END`;
const create = (input = catalog(), content = source) => createDialogueReactionValidator(input, { [storyId]: content }, [storyId], ["neutral", "smile"], ["heroine", "enemy"]);
const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral", "smile"] };

describe("dialogue reaction validation", () => {
  it("accepts a reachable matching line, including repeated validation routes", () => {
    const validator = create();
    const observe = (line: string, speaker: string) => validator.observe(storyId, line, speaker);
    for (let i = 0; i < 2; i++) validateStory(compileInk(source), context, { choiceCount: 0, effectCount: 0, kind: "normal" }, {}, [], observe);
    expect(() => validator.finish()).not.toThrow();
  });
  it("warns for a removed story but rejects unknown expressions and character targets", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => createDialogueReactionValidator(catalog(), {}, [], ["smile"], ["heroine"]).finish()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("story no longer exists"));
    warn.mockRestore();
    const bad = catalog();
    bad.entries[0].expression = "missing";
    expect(() => create(bad)).toThrow("Unknown dialogue reaction expression");
    expect(() => createDialogueReactionValidator(bad, {}, [], ["smile"], ["heroine"])).toThrow("Unknown dialogue reaction expression");
    expect(() => createDialogueReactionValidator(catalog(), { [storyId]: source }, [storyId], ["smile"], [])).toThrow("Unknown dialogue reaction target");
  });
  it("warns for edited lines but rejects interpolated or ambiguous source text", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const changed = create(catalog(), source.replace(text, "ほかの文"));
    expect(() => changed.finish()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Stale dialogue reaction"));
    warn.mockRestore();
    const bad = catalog();
    bad.entries[0].text = "「{heroine_name}」";
    expect(() => create(bad, source.replace(text, bad.entries[0].text))).toThrow("not a static Ink line");
    expect(() => create(catalog(), source.replace(text, `${text}\n${text}`))).toThrow("Ambiguous dialogue reaction line");
    const branches = source.replace(`${text}\n-> END`, `* [一]\n  ${text}\n  -> END\n* [二]\n  ${text}\n  -> END`);
    expect(() => create(catalog(), branches)).toThrow("Ambiguous dialogue reaction line");
  });
  it("warns when a line changes speaker or becomes unreachable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const validator = create();
    validator.observe(storyId, text, "enemy");
    expect(() => validator.finish()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unreachable or speaker changed"));
    warn.mockRestore();
  });
});

it("integrates date and battle annotations through the real content pipeline", async () => {
  const { mkdtemp, readFile, rm, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { prepareContentFixture } = await import("../src/content/test-fixtures");
  const { buildContent } = await import("./content-pipeline");
  const fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-reactions-"));
  try {
    await prepareContentFixture(fixture);
    await writeFile(path.join(fixture, "content/presentation/dialogue-reactions.json"), JSON.stringify({
      schemaVersion: 1,
      entries: [
        { storyId: "milano/cafe_tourism_01", speaker: "heroine", text: "「昔、大聖堂の石をこの運河で運んだんだって」", targetCharacterId: "heroine", expression: "smile" },
        { storyId: "battles/milano_castello", speaker: "enemy", text: "「まだ驚かないで。驚きの整理番号が出ていない」", targetCharacterId: "enemy", mark: "question" },
        { storyId: "battles/milano_last_supper_b_rebuttal", speaker: "heroine", text: "「待って。本当に、全部が同じ理由なんですか？」", targetCharacterId: "heroine", mark: "question" },
      ],
    }));
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
    const learningDetails = JSON.parse(await readFile(path.join(fixture, "content/learning/details.json"), "utf8"));
    await writeFile(path.join(fixture, "content/presentation/dialogue-reactions.json"), JSON.stringify({
      schemaVersion: 1,
      entries: [{ storyId: learningDetails.storyId, speaker: "heroine", text: "「Which descriptionが、この文では主語だね。」", targetCharacterId: "heroine", mark: "question" }],
    }));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unsupported dialogue reaction story");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 120_000);
