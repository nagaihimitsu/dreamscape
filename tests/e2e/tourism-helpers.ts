import { expect, type Page } from "@playwright/test";
import { expectNoOverflow, saved, openRevisits } from "./helpers";

export async function openTourismFromEntry(page: Page) {
  if ((await saved(page)).activeTourism?.landmarkId !== "last_supper") {
    await openRevisits(page);
    await page.getByTestId("revisit-tourism-last_supper").click();
  }
  await expect
    .poll(async () => (await saved(page)).activeTourism?.landmarkId)
    .toBe("last_supper");
}

export async function finishTourismGuide(page: Page) {
  const observed: string[] = [];
  for (let count = 0; count < 30; count++) {
    const state = await saved(page);
    if (state.activeTourism?.phase === "exploring") return observed;
    expect(state.activeTourism?.phase).toBe("guide");
    observed.push(state.activeTourism!.frame!.text);
    await page.getByTestId("tourism-advance").click();
    await expect
      .poll(async () => (await saved(page)).revision)
      .toBeGreaterThan(state.revision);
    await expectNoOverflow(page);
  }
  throw new Error("Tourism guide did not finish in 30 lines");
}

export async function skipTourismGuide(page: Page) {
  if ((await saved(page)).activeTourism?.phase === "guide") {
    await page.getByTestId("tourism-skip").click();
  }
  await expect
    .poll(async () => (await saved(page)).activeTourism?.phase)
    .toBe("exploring");
}

export async function openCluebook(page: Page) {
  const reasoningEntry = page.getByTestId("reasoning-notebook");
  if (await reasoningEntry.isVisible()) await reasoningEntry.click();
  else await page.getByRole("button", { name: "手がかり帳", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "手がかり帳", exact: true }),
  ).toBeVisible();
  return page.getByRole("dialog", { name: "手がかり帳", exact: true });
}

/** On compact observation screens the point list is an overlay; on wider
 * screens it is already present alongside the image. */
export async function openObservationList(page: Page) {
  const notes = page.locator(".observation-notes");
  const open = page.getByRole("button", { name: "発見ポイント・資料を見る", exact: true });
  if (await open.isVisible()) {
    if (await notes.getAttribute("data-open") !== "true") await open.click();
  }
}

export async function closeObservationList(page: Page) {
  const notes = page.locator(".observation-notes");
  const close = notes.getByRole("button", { name: "観察に戻る", exact: true });
  if (await close.isVisible()) await close.click();
}

export async function selectObservationClue(page: Page, id: string) {
  await openObservationList(page);
  await page.getByTestId(`discovery-${id}`).click();
}

/** Change only the currently displayed page; the selected evidence is saved separately. */
export async function showClue(page: Page, clueId: string) {
  await page.getByTestId("clue-picker").selectOption(clueId);
  await expect(page.getByTestId(`notebook-${clueId}`)).toBeVisible();
}

/** Send browser-native touch input, exercising the Pointer Events pinch/drag path. */
export async function touchGesture(
  page: Page,
  frames: { x: number; y: number; id: number }[][],
) {
  const cdp = await page.context().newCDPSession(page);
  try {
    for (let index = 0; index < frames.length; index++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: index === 0 ? "touchStart" : "touchMove",
        touchPoints: frames[index].map((point) => ({
          ...point,
          radiusX: 5,
          radiusY: 5,
        })),
      });
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await cdp.detach();
  }
}

export async function expectImageWithinPanBounds(page: Page) {
  const viewport = await page.getByTestId("observation-viewport").boundingBox();
  const image = await page
    .getByTestId("observation-viewport")
    .locator("img")
    .boundingBox();
  expect(viewport).not.toBeNull();
  expect(image).not.toBeNull();
  for (const [position, size] of [
    ["x", "width"],
    ["y", "height"],
  ] as const) {
    if (image![size] > viewport![size]) {
      expect(image![position]).toBeLessThanOrEqual(viewport![position] + 3);
      expect(image![position] + image![size]).toBeGreaterThanOrEqual(
        viewport![position] + viewport![size] - 3,
      );
    } else {
      expect(
        Math.abs(
          image![position] +
            image![size] / 2 -
            viewport![position] -
            viewport![size] / 2,
        ),
      ).toBeLessThan(3);
    }
  }
}
