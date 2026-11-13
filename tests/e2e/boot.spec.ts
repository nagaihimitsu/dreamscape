import { appendFileSync } from "node:fs";
import { allStorage, expect, expectNoDebugCode, journeyCatalog, ops, test, tier } from "./helpers";

// AGENTS.md 「データ・セーブ・品質」, docs/07 acceptance 1 and 12: every registered
// journey (from the generated catalog of this checkout, never a fixed list) opens
// its start screen, and opening the title writes no save. In the sample tier the list
// also has the sample journey, and in CI a journey just made by `npm run journey:new`
// (e2e.yml), which must open as a preparing journey.
test("the title screen opens every registered journey without writing a save, and a reload reopens the last playable one", { tag: [tier.gate, tier.prod, tier.sample, tier.smoke] }, async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Dreamscape/);
  const catalog = journeyCatalog();
  const selector = page.getByLabel("旅行編");
  const journeys = await selector.locator("option").evaluateAll((options) =>
    options.map((option) => ({ id: (option as HTMLOptionElement).value, name: option.textContent ?? "" })));
  expect(journeys.map((journey) => journey.id)).toEqual(catalog.journeys.map((journey) => journey.id));
  // Go through the journeys with the keyboard: each switch rebuilds the screen,
  // and the new screen's selector takes the focus back so the next key works.
  await selector.selectOption(journeys[0].id);
  await selector.focus();
  for (const [index, journey] of journeys.entries()) {
    if (index > 0) await page.keyboard.press("ArrowDown");
    await expect(selector).toHaveValue(journey.id);
    const entry = catalog.journeys.find((item) => item.id === journey.id)!;
    expect(journey.name).toBe(`${entry.nameJa}${entry.status === "preparing" ? "（準備中）" : ""}`);
    if (entry.status === "preparing") {
      // An unfinished journey cannot be played yet. With an initial state
      // (manifest initialState) it can store names for later; without one,
      // as a journey fresh from `npm run journey:new`, it is read-only.
      await expect(page.getByText("この旅行編は制作中です。", { exact: false })).toBeVisible();
      await expect(ops.startButton(page)).toHaveCount(0);
      if (entry.initialState) await expect(page.getByRole("button", { name: "旅の準備を保存する" })).toBeVisible();
      else {
        await expect(page.getByRole("status")).toHaveText("この旅行編は制作中です。公開をお待ちください。");
        await expect(page.getByRole("button")).toHaveCount(0);
      }
    } else {
      await expect(ops.startButton(page)).toBeVisible();
      // A title without a save offers the normal start (not a start that backs up a save).
      await expect(ops.startButton(page)).toHaveAccessibleName(ops.startLabel);
      // Before the trip starts, the heading names the selected journey's first city.
      await expect(page.getByTestId("journey-edition")).toHaveText(`${entry.cities[0].nameJa}の旅`);
      // The journey's own title art (a missing file fails the error guard), else the shared neutral scene.
      const art = page.getByTestId("title-art");
      await expect(art.getByTestId("scene-stamp")).toHaveText(entry.titleArt?.captionJa ?? "旅の余白 ／ 予定のない午後");
      await expect(art.locator("img")).toHaveCount(entry.titleArt ? 1 : 0);
      if (entry.titleArt) await expect(art.locator("img")).toHaveAttribute("src", new RegExp(`${entry.titleArt.imagePath}$`));
      else await expect(art.locator("[data-fallback]")).toHaveAttribute("data-fallback", "neutral");
    }
    await expect(selector).toBeFocused();
  }
  expect(Object.keys(await allStorage(page)).filter((key) => key.includes(".save."))).toEqual([]);
  // The title opens the journey last opened in this browser (src/app/last-journey.ts): the last playable
  // one gone through above, as a preparing journey is never reopened.
  await page.reload();
  await expect(selector).toHaveValue(catalog.journeys.filter((journey) => journey.status === "available").at(-1)!.id);
});

// AGENTS.md 「本番ビルドでは、設定でパスワード…を入れてDebugモードをオンにした端末だけが使い、Debugの画面は
// タイトル画面で読み込むファイルに入れない」, docs/07 acceptance 14: in a fresh browser (Debug mode off) the
// production build ignores ?debug and ?character-preview, opens the normal title, has no test hook and
// loads none of Debug's files (debug-mode.spec.ts turns Debug mode on through 設定). The title loads the
// opening journey's part of the content and no other journey's.
test("with Debug mode off, the production build ignores ?debug and ?character-preview", { tag: tier.prod }, async ({ page, baseURL }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === new URL(baseURL!).origin && ["script", "stylesheet"].includes(request.resourceType())) requested.push(url.pathname);
  });
  for (const query of ["?debug", "?character-preview", "?debug&city=milano&scene=battle"]) {
    await page.goto(`/${query}`);
    await expect(ops.startButton(page)).toBeVisible();
    await expect(ops.startButton(page)).toHaveAccessibleName(ops.startLabel);
    await expect(page.getByTestId("debug-panel")).toHaveCount(0);
    await expect(page.getByTestId("debug-session")).toHaveCount(0);
    await expect(page.getByText("場面の確認")).toHaveCount(0);
  }
  expect(await page.evaluate(() => "__dreamscapeDebug" in window)).toBe(false);
  // The files index.html loads at once (eagerFiles) and the opening journey's part: no Debug code in any (Debug's lazy
  // chunks, whatever their names, are never requested), and no other journey's part.
  expect(requested.length).toBeGreaterThan(0);
  const opening = journeyCatalog().journeys.find((journey) => journey.status === "available")!.id;
  expect(await expectNoDebugCode(page, requested)).toEqual([opening]);
  // The icons are real images here (the dev server would answer a missing file with its page).
  const icons = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((links) =>
    links.map((link) => (link as HTMLLinkElement).href));
  expect(icons.length).toBeGreaterThan(0);
  for (const href of icons) {
    const response = await page.request.get(href);
    expect(response.status(), href).toBe(200);
    expect(response.headers()["content-type"], href).toMatch(/^image\//);
  }
});

// Report only (user decision: load size is measured and reported, not a gate). Counts
// every response of the game's origin until the title screen and its images are
// shown: headers plus body as sent (`vite preview` does not compress; GitHub Pages
// gzips text files, so the published transfer is smaller for scripts and styles).
test("reports how many bytes the title screen loads", { tag: tier.prod }, async ({ page }, testInfo) => {
  const sizes: Promise<{ type: string; url: string; bytes: number }>[] = [];
  page.on("requestfinished", (request) => sizes.push(request.sizes().then((size) => ({
    type: request.resourceType(), url: new URL(request.url()).pathname, bytes: size.responseHeadersSize + size.responseBodySize,
  }))));
  await page.goto("/");
  await expect(ops.startButton(page)).toBeVisible();
  await page.waitForLoadState("load");
  await expect.poll(() => page.evaluate(() => [...document.images].every((image) => image.complete))).toBe(true);
  const files = await Promise.all(sizes);
  const byType = [...new Set(files.map((file) => file.type))].map((type) => {
    const list = files.filter((file) => file.type === type);
    return { type, files: list.length, bytes: list.reduce((sum, file) => sum + file.bytes, 0) };
  }).sort((left, right) => right.bytes - left.bytes);
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;
  const summary = [
    "### タイトル画面までの読み込み量（本番ビルド・報告のみ）", "",
    `合計 ${kib(total)}（${files.length}ファイル）`, "",
    "| 種類 | ファイル数 | 量 |", "| --- | --- | --- |",
    ...byType.map((row) => `| ${row.type} | ${row.files} | ${kib(row.bytes)} |`), "",
  ].join("\n");
  testInfo.annotations.push({ type: "タイトル画面までの読み込み量", description: `合計 ${kib(total)}（${files.length}ファイル）` });
  await testInfo.attach("title-transfer.json", { body: JSON.stringify({ total, byType, files }, null, 2), contentType: "application/json" });
  await testInfo.attach("title-transfer.md", { body: summary, contentType: "text/markdown" });
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  console.log(summary);
  expect(total).toBeGreaterThan(0);
});
