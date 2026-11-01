import { expect, test, type Page } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, openRevisits, saved, setDialogueSpeed } from "./helpers";

test.use({ reducedMotion: "reduce" });

async function startCastleGuide(page: Page, longNames = false) {
  await loadSnapshot(page, phase6.freeTime);
  if (longNames) {
    await page.getByRole("button", { name: "設定", exact: true }).click();
    await page.getByLabel("主人公の名前").fill("ABCDEFGHIJKLMNOPQRSTUVWX");
    await page.getByLabel("ヒロインの名前").fill("あいうえおかきくけこさしすせそたちつてとなにぬね");
    await page.getByRole("button", { name: "名前を保存", exact: true }).click();
  }
  await openRevisits(page);
  await page.getByTestId("revisit-tourism-castello_sforzesco").click();
  await expect.poll(async () => (await saved(page)).activeTourism?.landmarkId).toBe("castello_sforzesco");
  await expect(page.locator(".tourism-guide-scene")).toBeVisible();
  await setDialogueSpeed(page, "0");
}

async function guideGeometry(page: Page) {
  return page.locator(".tourism-guide-scene").evaluate((scene) => {
    const rect = (element: Element) => {
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width };
    };
    return {
      screen: rect(document.querySelector(".tourism-screen")!),
      heading: rect(document.querySelector(".tourism-heading")!),
      scene: rect(scene),
      background: rect(scene.querySelector(".vn-background")!),
      dialogue: rect(scene.querySelector(".vn-dialogue")!),
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
}

for (const size of [
  { width: 320, height: 640 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 844, height: 390 },
  { width: 1280, height: 720 },
]) {
  test(`castle guide width stays fixed across real lines at ${size.width}×${size.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await startCastleGuide(page);
    await page.evaluate(() => document.fonts.ready);
    const next = page.getByTestId("tourism-advance");
    const readings: Awaited<ReturnType<typeof guideGeometry>>[] = [];
    const speakers: string[] = [];
    const texts: string[] = [];
    // The actual castle script alternates narration and a short heroine line,
    // exactly the transition that made the guide shrink in the report.
    for (let step = 0; step < 4; step++) {
      await expect(next).toBeEnabled();
      const state = await saved(page);
      texts.push(state.activeTourism!.frame!.text);
      speakers.push(state.activeTourism!.frame!.speaker);
      const g = await guideGeometry(page);
      readings.push(g);
      expect(g.documentWidth).toBeLessThanOrEqual(g.viewportWidth);
      expect(Math.abs(g.screen.width - Math.min(size.width, 760))).toBeLessThanOrEqual(1);
      expect(Math.abs(g.scene.width - g.screen.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(g.background.width - g.scene.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(g.heading.width - g.screen.width)).toBeLessThanOrEqual(1);
      expect(g.scene.left).toBeGreaterThanOrEqual(-1);
      expect(g.scene.right).toBeLessThanOrEqual(size.width + 1);
      if (step === 1 || step === 2) await page.screenshot({ path: testInfo.outputPath(`castle-line-${step}.png`) });
      await next.click();
      await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
    }
    expect(texts[1]).toContain("さっきまで日なたで暑かったのに");
    expect(texts[2]).toContain("は壁を見上げ、手元の案内を開いた");
    expect(speakers).toEqual(["narrator", "heroine", "narrator", "heroine"]);
    for (const g of readings.slice(1)) {
      for (const item of ["screen", "heading", "scene", "background", "dialogue"] as const) {
        expect(Math.abs(g[item].left - readings[0][item].left)).toBeLessThanOrEqual(1);
        expect(Math.abs(g[item].width - readings[0][item].width)).toBeLessThanOrEqual(1);
      }
    }
  });
}

test("long saved names and enlarged guide text remain within the phone width and keyboard operable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await startCastleGuide(page, true);
  await page.addStyleTag({ content: ".tourism-guide .dialogue-text { font-size: 32px !important; }" });
  const initial = await guideGeometry(page);
  expect(initial.documentWidth).toBeLessThanOrEqual(320);
  expect(initial.screen.width).toBeCloseTo(320, 0);
  const next = page.getByTestId("tourism-advance");
  for (let step = 0; step < 3; step++) {
    await next.scrollIntoViewIfNeeded();
    await next.focus();
    await expect(next).toBeFocused();
    const before = await saved(page);
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
    const after = await guideGeometry(page);
    expect(after.documentWidth).toBeLessThanOrEqual(320);
    expect(after.screen.width).toBeCloseTo(320, 0);
    expect(after.scene.width).toBeCloseTo(initial.scene.width, 0);
    expect(after.dialogue.width).toBeCloseTo(initial.dialogue.width, 0);
  }
  await expect(page.getByTestId("tourism-guide")).toContainText("あいうえおかきくけこさしすせそたちつてとなにぬね");
});
