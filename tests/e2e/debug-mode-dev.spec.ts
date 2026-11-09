import { expect, ops, test, tier } from "./helpers";

// Debug mode (user decision 2026-11-08) on the development server. debug-mode.spec.ts runs against the
// production build only (docs/10: the prod tier, where Debug's gate and the title page's files matter);
// this keeps its development-server check: with Debug mode on, the dev server serves nothing from
// src/dev/ until 「場面の確認を開く」 opens Debug, so Debug's code reaches the game only through
// main.tsx's lazy imports there too. Real UI only (no test hook, no dev-server modules in the page,
// which would themselves be requested from src/dev/). In the debug tier, not the gate: it opens Debug.

test("with Debug mode on, the development server serves nothing from src/dev/ until 「場面の確認を開く」 opens Debug", { tag: tier.debug }, async ({ page, baseURL }) => {
  // A long flow (docs/10「不安定さと時間の決まり」): three page loads, the last one Debug's modules one by one.
  test.setTimeout(120_000);
  // The game's own scripts and stylesheets (on the dev server, an imported stylesheet is a script request).
  const requested: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === new URL(baseURL!).origin && ["script", "stylesheet"].includes(request.resourceType())) requested.push(url.pathname);
  });
  const fromDev = () => requested.filter((path) => path.startsWith("/src/dev/"));

  await ops.startJourney(page);
  await ops.turnOnDebugMode(page);
  // A device whose Debug mode is on opens the game without Debug's code.
  await page.reload();
  const settings = await ops.openSettings(page);
  const section = settings.getByTestId("debug-mode-setting");
  await expect(section.getByText("Debugモードはオンです（この端末だけ）。")).toBeVisible();
  expect(requested).toContain("/src/main.tsx");
  expect(fromDev()).toEqual([]);

  // The switch's link opens Debug, whose modules then come from src/dev/ (so the check above can see them).
  await Promise.all([
    page.waitForURL((address) => address.search === "?debug"),
    section.getByRole("link", { name: "場面の確認を開く" }).click(),
  ]);
  await expect(page.getByTestId("debug-panel")).toBeVisible({ timeout: 30_000 });
  expect(fromDev()).toContain("/src/dev/DebugMode.tsx");
});
