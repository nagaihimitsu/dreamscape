import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { prepareContentFixture } from "./test-fixtures";

let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-response-profiles-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => { await rm(fixture, { recursive: true, force: true }); });

async function changeJson(relative: string, mutate: (data: any) => void) {
  const file = path.join(fixture, "content/romance", relative);
  const data = JSON.parse(await readFile(file, "utf8"));
  mutate(data);
  await writeFile(file, JSON.stringify(data));
}

describe("response profile cross-file validation", () => {
  it("rejects duplicate profile IDs", async () => {
    await changeJson("response_profiles.json", (data) => data.profiles.push(structuredClone(data.profiles[0])));
    await expect(buildContent(fixture, false)).rejects.toThrow(/Duplicate response profile ID/);
  });

  it("rejects effect references to unknown profiles", async () => {
    await changeJson("effect_catalog.json", (data) => { data.effects[0].responseProfileId = "missing_profile"; });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Unknown response profile/);
  });

  it("rejects an outcome effect that attempts to use a response profile", async () => {
    await changeJson("effect_catalog.json", (data) => {
      const outcome = data.effects.find((effect: any) => effect.outcome);
      outcome.responseProfileId = "attentive";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Confession outcome cannot use a response profile/);
  });

  it("rejects RANDOM in an active romance Ink script", async () => {
    const catalog = JSON.parse(await readFile(path.join(fixture, "content/romance/date_catalog.json"), "utf8"));
    const storyId = catalog.dates.find((date: any) => date.kind === "normal").storyId;
    const file = path.join(fixture, "content/stories", `${storyId}.ink`);
    const source = await readFile(file, "utf8");
    expect(source).toMatch(/# background:[^\n]*\n/);
    await writeFile(file, source.replace(/(# background:[^\n]*\n)/, "$1~ temp forbidden_roll = RANDOM(1, 2)\n"));
    await expect(buildContent(fixture, false)).rejects.toThrow(/Ink randomness is forbidden.*RANDOM/);
  }, 30_000);

  it("rejects a legacy location attached to a non-legacy script", async () => {
    await changeJson("date_catalog.json", (data) => {
      data.dates[0].legacyStoryDestinationIds = { "milano/not_a_legacy_script": "milano_cafe_naviglio" };
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Legacy destination must reference a legacy story/);
  });

  it("rejects an unknown legacy location", async () => {
    await changeJson("date_catalog.json", (data) => {
      const date = data.dates[0];
      date.legacyStoryDestinationIds = { [date.legacyStoryIds[0]]: "unknown_destination" };
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Unknown or mismatched legacy story destination/);
  });

  it("rejects a recovery event that consumes AP or cannot repeat", async () => {
    await changeJson("date_catalog.json", (data) => {
      const date = data.dates.find((entry: any) => entry.kind === "special");
      date.recovery = true;
      date.repeatable = false;
      date.rewardOnlyOnce = false;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Recovery event must be a free, repeatable special/);
  });

  it("rejects an unused memoryless effect even if its response profile exists", async () => {
    await changeJson("effect_catalog.json", (data) => {
      data.effects.push({ id: "unused_memoryless_effect", affectionDelta: 0, responseProfileId: "attentive" });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/outside recovery: unused_memoryless_effect/);
  }, 30_000);

  it("rejects a memoryless effect used by an ordinary date", async () => {
    await changeJson("effect_catalog.json", (data) => {
      const effect = data.effects.find((item: any) => item.id === "milano_cafe_first_joke");
      delete effect.memoryId;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/outside recovery: milano_cafe_first_joke/);
  }, 30_000);
});
