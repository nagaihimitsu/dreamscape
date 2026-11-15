import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { changeCatalogEntry, MILAN_EFFECTS_FILE, oneSceneCafeDate, oneSceneConfession, prepareContentFixture, storySourceFile } from "./test-fixtures";
import { storyFileOf } from "./story-address";
import dateData from "./generated/content/romance/date_catalog.json";

let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-response-profiles-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => { await rm(fixture, { recursive: true, force: true }); });

/** Shared romance data (core layer); entries of the other catalogs are changed by ID where their layer keeps them. */
const core = "content/romance";
const changeEffect = (id: string, change: (effect: any, catalog: any) => void) =>
  changeCatalogEntry(fixture, "romance/effect_catalog.json", "effects", id, change);
async function changeJson(relative: string, mutate: (data: any) => void) {
  const file = path.join(fixture, relative);
  const data = JSON.parse(await readFile(file, "utf8"));
  mutate(data);
  await writeFile(file, JSON.stringify(data));
}

describe("response profile cross-file validation", () => {
  it("rejects duplicate profile IDs", async () => {
    await changeJson(`${core}/response_profiles.json`, (data) => data.profiles.push(structuredClone(data.profiles[0])));
    await expect(buildContent(fixture, false)).rejects.toThrow(/Duplicate response profile ID/);
  });

  it("rejects effect references to unknown profiles", async () => {
    await changeEffect("common_date_first_attentive", (effect) => { effect.responseProfileId = "missing_profile"; });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Unknown response profile/);
  });

  it("rejects an outcome effect that attempts to use a response profile", async () => {
    // The one-scene confession's outcome effects (Milan's confession is a place file's knot without them since 2026-11-13).
    await oneSceneConfession(fixture);
    await changeJson(MILAN_EFFECTS_FILE, (data) => {
      const outcome = data.effects.find((effect: { id: string }) => effect.id === "milano_confession_accepted");
      expect(outcome.outcome).toBe("accepted");
      outcome.responseProfileId = "attentive";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/Confession outcome cannot use a response profile/);
  });

  it("rejects RANDOM in an active romance Ink script", async () => {
    // The first normal date (a knot of its place file: the file before the dot); the roll goes below its first background.
    const storyId = storyFileOf(dateData.dates.find((date) => date.kind === "normal")!.storyId);
    const file = path.join(fixture, storySourceFile(storyId));
    const source = await readFile(file, "utf8");
    expect(source).toMatch(/# background:[^\n]*\n/);
    await writeFile(file, source.replace(/(# background:[^\n]*\n)/, "$1~ temp forbidden_roll = RANDOM(1, 2)\n"));
    await expect(buildContent(fixture, false)).rejects.toThrow(/Ink randomness is forbidden.*RANDOM/);
  }, 30_000);

  // 2026-11-15: a relationship repair's kind, repetition, choices and effects are its writer's; a repair that cannot
  // repeat is a warning (as its AP is, decision 32), and only an ordinary date marked as one stops (counted twice).
  it("only warns about a recovery event that cannot repeat, whatever its choices and effects", async () => {
    await changeCatalogEntry(fixture, "romance/date_catalog.json", "dates", "milano_invitation_01", (date: any) => {
      expect(date.kind).toBe("special");
      date.recovery = true;
      date.repeatable = false;
      date.rewardOnlyOnce = false;
    });
    const { warnings } = await buildContent(fixture, false);
    expect(warnings.filter((warning) => warning.kind === "recovery-date").map((warning) => warning.message)).toEqual([
      expect.stringMatching(/^繰り返して関係を築き直せない関係修復のデートです：milano_invitation_01 は、繰り返さない/)]);
  }, 120_000);

  it("rejects a recovery event on an ordinary date: its one play would count twice", async () => {
    await changeCatalogEntry(fixture, "romance/date_catalog.json", "dates", "milano_cafe_01", (date: any) => {
      expect(date.kind ?? "normal").toBe("normal");
      date.recovery = true;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/A relationship repair \(recovery\) cannot be an ordinary date \(kind normal\): milano_cafe_01/);
  }, 120_000);

  it("rejects an unused memoryless effect even if its response profile exists", async () => {
    // A new effect next to the shared date effects.
    await changeEffect("common_date_first_attentive", (_effect, catalog) => {
      catalog.effects.push({ id: "unused_memoryless_effect", affectionDelta: 0, responseProfileId: "attentive" });
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/outside recovery: unused_memoryless_effect/);
  }, 120_000);

  it("rejects a memoryless effect used by an ordinary date", async () => {
    // An ordinary date written with # effect: (a one-scene file; Milan's dates are knots of place files and name none).
    await oneSceneCafeDate(fixture);
    await changeJson("content/journeys/milano/romance/effect_catalog.json", (data) => {
      delete data.effects.find((effect: { id: string }) => effect.id === "sound_cafe_01_2_1").memoryId;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/outside recovery: sound_cafe_01_2_1/);
  }, 120_000);
});
