import { expect, test } from "@playwright/test";
import galleria from "../fixtures/galleria-stage2-pool.json" with { type: "json" };
import catalog from "../../content/encounters/catalog.json" with { type: "json" };
import compiledStories from "../../src/content/generated/stories.json" with { type: "json" };
import { Compiler } from "inkjs/compiler/Compiler";
import { expectNoOverflow, loadSnapshot, openRevisits, saved, setDialogueSpeed } from "./helpers";

test("inline Ink reactions display for both people during a newly registered encounter", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const storyId = "encounters/fixture_inline_reaction";
  const ink = `VAR player_name = ""
VAR heroine_name = ""
# background: milano_galleria
# speaker: narrator
# reaction: heroine,exasperated,sigh
# reaction: enemy,sweat
店員「これは秘密のメニューです」
# speaker: heroine
「先に教えてください」
* [Yes, please.]
    # speaker: heroine
    「では、お願いします」
    -> END
* [Not yet.]
    # speaker: heroine
    「少し考えよう」
    -> END
* [No, thank you.]
    # speaker: heroine
    「今日はやめておこう」
    -> END
`;
  const testCatalog = structuredClone(catalog);
  // The app normalizes this minimal entry just like a newly authored catalog.
  (testCatalog.encounters as unknown[]).push({ id: "fixture_inline_reaction", landmarkId: "galleria_vittorio_emanuele_ii", titleJa: "追加した交流", storyId });
  await page.route(/\/content\/encounters\/catalog\.json(?:\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: `export default ${JSON.stringify(testCatalog)};` }));
  await page.route(/\/src\/content\/generated\/stories\.json(?:\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: `export default ${JSON.stringify({ ...compiledStories, [storyId]: new Compiler(ink).Compile().ToJson() })};` }));

  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, galleria);
  await openRevisits(page);
  await page.getByTestId("revisit-place-galleria_vittorio_emanuele_ii").click();
  await page.getByText("追加した交流", { exact: true }).locator("..").locator("..").getByRole("button").click();
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  await setDialogueSpeed(page, "0");
  expect((await saved(page)).activeEncounter?.frame.text).toBe("店員「これは秘密のメニューです」");
  const heroine = page.locator(".encounter-character-heroine .vn-character");
  const heroMark = heroine.locator('.comic-effect[data-effect="sigh"]');
  const enemyMark = page.locator('.encounter-character-enemy .comic-effect[data-effect="sweat"]');
  await expect(heroine.locator('img[src$="/exasperated.png"]')).toBeVisible();
  await expect(heroMark).toBeVisible();
  await expect(enemyMark).toBeVisible();
  for (const image of [heroMark.locator("img"), enemyMark.locator("img")])
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const savedFrame = await saved(page);
  await page.reload();
  expect(await saved(page)).toEqual(savedFrame);
  await expect(heroMark).toBeVisible();
  await expect(enemyMark).toBeVisible();

  for (const size of [{ width: 360, height: 780 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    const dialogue = await page.locator(".encounter-dialogue").boundingBox();
    expect(dialogue).not.toBeNull();
    const heroImage = await heroine.locator('img[src$="/exasperated.png"]').boundingBox();
    const heroCue = await heroMark.boundingBox();
    expect(heroImage).not.toBeNull();
    expect(heroCue).not.toBeNull();
    // object-fit: contain, bottom aligned: locate the top of the actual
    // 1024x1536 sprite, which is where the heroine's head begins.
    const spriteHeight = Math.min(heroImage!.height, heroImage!.width * 1.5);
    const spriteTop = heroImage!.y + heroImage!.height - spriteHeight;
    expect(Math.abs(heroCue!.y + heroCue!.height / 2 - spriteTop)).toBeLessThan(spriteHeight * 0.22);
    for (const mark of [heroMark, enemyMark]) {
      const box = await mark.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(dialogue!.y + 1);
    }
    await page.screenshot({ path: testInfo.outputPath(`encounter-inline-${size.width}.png`), animations: "disabled" });
  }
  await page.getByRole("button", { name: "続きを読む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(savedFrame.revision);
  await expect(page.locator(".encounter-character-layer")).toHaveCount(0);
});
