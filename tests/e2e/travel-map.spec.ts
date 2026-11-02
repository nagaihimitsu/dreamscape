import { expect, test } from "@playwright/test";
import { startNewGame } from "./helpers";

// A small valid image keeps these UI checks independent of the public tile server.
const tile = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1sAAAAASUVORK5CYII=", "base64");

test("a phone map loads actual tile elements, zooms and pans while retaining place details", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  let requests = 0;
  await page.route("https://tile.openstreetmap.org/**", async (route) => {
    requests++;
    await route.fulfill({ status: 200, contentType: "image/png", body: tile });
  });
  await startNewGame(page);
  const canvas = page.getByTestId("travel-map-canvas");
  await expect(canvas.locator(".leaflet-tile-loaded").first()).toBeVisible();
  expect(requests).toBeGreaterThan(0);
  await expect(canvas.getByRole("link", { name: "OpenStreetMap contributors" })).toBeVisible();
  const initialSrc = await canvas.locator(".leaflet-tile-loaded").first().getAttribute("src");
  const initialZoom = Number(initialSrc?.match(/\.org\/(\d+)\//)?.[1]);
  expect(initialZoom).toBeGreaterThan(0);
  await canvas.locator(".leaflet-control-zoom-in").click();
  await expect.poll(async () => {
    const sources = await canvas.locator(".leaflet-tile-loaded").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src")));
    return sources.some((src) => Number(src?.match(/\.org\/(\d+)\//)?.[1]) > initialZoom);
  }).toBe(true);
  await canvas.locator(".leaflet-control-zoom-out").click();
  const marker = canvas.locator(".leaflet-marker-icon").first();
  const before = await marker.boundingBox();
  const box = await canvas.boundingBox();
  expect(before).not.toBeNull();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 50, box!.y + box!.height / 2 + 25, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await marker.boundingBox())?.x).not.toBeCloseTo(before!.x, 0);
  await page.locator(".travel-map-places > summary").click();
  await page.getByRole("combobox", { name: "地点", exact: true }).selectOption("p_duomo");
  await expect(page.getByTestId("travel-map")).toContainText("ドゥオモ");
  await expect(page.getByRole("button", { name: "地図を大きくする" })).toHaveCount(0);
});

test("tile failures are explained and do not block destination selection", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort("failed"));
  await startNewGame(page);
  await expect(page.getByRole("status")).toContainText("地図の一部を読み込めません");
  await page.getByTestId("travel-destination-milano_duomo_episode").getByRole("button").click();
  await expect(page.getByRole("button", { name: "バトルを始める", exact: true })).toBeVisible();
});

test("a two-finger gesture zooms the map on a touch screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: tile }));
  await startNewGame(page);
  const canvas = page.getByTestId("travel-map-canvas");
  await canvas.scrollIntoViewIfNeeded();
  const loaded = canvas.locator(".leaflet-tile-loaded");
  await expect(loaded.first()).toBeVisible();
  const initialZoom = Number((await loaded.first().getAttribute("src"))?.match(/\.org\/(\d+)\//)?.[1]);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 20, y, id: 1 }, { x: x + 20, y, id: 2 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 70, y, id: 1 }, { x: x + 70, y, id: 2 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => {
    const sources = await loaded.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src")));
    return sources.some((src) => Number(src?.match(/\.org\/(\d+)\//)?.[1]) > initialZoom);
  }).toBe(true);
  await cdp.detach();
});
