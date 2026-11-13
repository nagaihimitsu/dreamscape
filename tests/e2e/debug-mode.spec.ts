import { DEBUG_MODE_KEY } from "../../src/app/debug-mode";
import { debugQueryString } from "../../src/dev/debug-query";
import { eagerFiles } from "../../scripts/dist-guard";
import { allStorage, bothStorages, expect, ops, test, tier, type Page } from "./helpers";

// User decision 2026-11-08: anyone can turn Debug mode on in ゲームの設定 (⚙設定) with the password 「adminmode」
// (not a secret: anyone may see it; it only prevents turning it on by accident). While it is on,
// the production build opens Debug's 「場面の確認」, and choices show their relationship changes.
// Production tier only (docs/10): the gate expression (`import.meta.env.DEV || readDebugMode(…)`) and the
// title page's files matter only in the production build, where Debug ships as lazily loaded files; the
// development server always offers Debug. Its development-server check (nothing from src/dev/ before
// Debug is opened) is debug-mode-dev.spec.ts in the debug tier. Real UI only: no Debug test hook, no
// dev-server modules; Debug is entered through the switch's link and a launch URL built in Node.
// Not lane 1 (docs/10): it enters Debug, which the real-flow specs never do.

/** Debug is loaded only when opened (a lazy chunk): it gets a page load's time. */
const debugTimeout = 30_000;

/** Tap the line on until the date offers its replies. */
async function readUntilReplies(page: Page) {
  const replies = page.getByTestId("date-choice");
  for (let step = 0; step < 60 && !(await replies.first().isVisible()); step++) {
    await ops.settled(page);
    await page.getByTestId("dialogue-text").click();
  }
  await expect(replies.first()).toBeEnabled();
  await ops.settled(page);
}

// A long flow (docs/10「不安定さと時間の決まり」): five page loads (title, reload, 場面の確認, a launch
// URL, back to the game), Debug's lazy files and a date read to its replies.
test("Debug mode: the password in ゲームの設定 turns it on for this device, opens 場面の確認 and shows changes, and ゲームの設定 turns it off", { tag: tier.prod }, async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  // The game's own scripts and stylesheets (the web fonts' stylesheet comes from another origin).
  const requested: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === new URL(baseURL!).origin && ["script", "stylesheet"].includes(request.resourceType())) requested.push(url.pathname);
  });
  await ops.startJourney(page);
  let settings = await ops.openSettings(page);
  const before = await allStorage(page);
  const section = settings.getByTestId("debug-mode-setting");
  const start = section.getByRole("button", { name: "Debugモードをオンにする" });

  // The password form: an empty field cannot be sent; a wrong password says so and changes nothing.
  await start.click();
  const field = section.getByLabel("パスワード");
  await expect(field).toBeFocused();
  const submit = section.getByRole("button", { name: "オンにする", exact: true });
  await expect(submit).toBeDisabled();
  await field.fill("admin");
  await submit.click();
  await expect(section.getByRole("alert")).toHaveText("パスワードが違います。");
  await expect(field).toBeFocused();
  expect(await allStorage(page)).toEqual(before);
  // 「やめる」 closes the form and gives the focus back.
  await section.getByRole("button", { name: "やめる" }).click();
  await expect(start).toBeFocused();

  // The password as a phone types it (a capital first letter, a trailing space) turns it on: only its key is written.
  // While it was off, ゲームの設定 showed no Debug-only control (and loaded none: checked below).
  const voiceRate = settings.getByTestId("debug-voice-rate");
  await expect(voiceRate).toHaveCount(0);
  const requestedWhileOff = requested.length;
  await start.click();
  await field.fill("Adminmode ");
  await field.press("Enter");
  const on = section.getByText("Debugモードはオンです（この端末だけ）。");
  await expect(on).toBeFocused();
  await expect(field).toHaveCount(0);
  expect(await allStorage(page)).toEqual({ ...before, [DEBUG_MODE_KEY]: "on" });
  await ops.closeDialog(settings);

  // A preference of this device: still on after a reload; ゲームの設定 then shows Debug's 台詞の声の速さ.
  await page.reload();
  settings = await ops.openSettings(page);
  await expect(on).toBeVisible();
  await expect(voiceRate).toBeVisible();

  // Until Debug is opened, the page loads no Debug code: only the files index.html loads at once
  // (Debug's chunks are loaded later, whatever their names) and, once Debug mode is on, the parts that
  // ゲームの設定 shows under the switch, each a chunk of its own: the note of 最初の3分の計測
  // (IntroTimingNote.tsx) and 台詞の声の速さ (DebugVoiceRate.tsx and its stylesheet). None of them while it is off.
  const html = await (await page.request.get("/")).text();
  const eager = new Set(eagerFiles(html).map((file) => `/${file}`));
  const debugModeParts = [/^\/assets\/IntroTimingNote-[\w-]+\.js$/u, /^\/assets\/DebugVoiceRate-[\w-]+\.(?:js|css)$/u];
  expect(requestedWhileOff).toBeGreaterThan(0);
  for (const [index, path] of requested.entries()) {
    const debugModePart = index >= requestedWhileOff && debugModeParts.some((part) => part.test(path));
    expect(eager.has(path) || debugModePart, `${path} is loaded ${index < requestedWhileOff ? "while Debug mode is off" : "before Debug is opened"}`).toBe(true);
  }

  // 「場面の確認を開く」 opens Debug on its own page; Debug leaves the player's storage as it was.
  const kept = await bothStorages(page);
  await Promise.all([
    page.waitForURL((address) => address.search === "?debug"),
    section.getByRole("link", { name: "場面の確認を開く" }).click(),
  ]);
  await expect(page.getByTestId("debug-panel")).toBeVisible({ timeout: debugTimeout });
  await page.goto(`/${debugQueryString({ dataMode: "real", cityId: "milano", scene: "date", target: "milano_brera_date_01",
    progress: "completed", ap: 9, affection: 0, trust: 0, spark: 0, roll: "positive" })}`);
  await expect(page.getByTestId("debug-session")).toBeVisible({ timeout: debugTimeout });
  await readUntilReplies(page);
  await page.getByTestId("date-choice").first().click();
  const strip = page.getByTestId("relationship-change");
  await expect(strip).toContainText(/(親しさ|信頼|恋愛の意識) [+−]\d+（−?\d+→−?\d+）/u);
  await expect(strip).toContainText(/反応：噛み合った（噛み合う確率 \d+%）/u);
  // Debug's own ゲームの設定 has no Debug-mode switch and keeps Debug's wording (also in production).
  settings = await ops.openSettings(page);
  await expect(settings.getByTestId("debug-mode-setting")).toHaveCount(0);
  await expect(settings.getByRole("button", { name: "Debug用の一時データの消去" })).toBeVisible();
  await ops.closeDialog(settings);
  await page.getByRole("button", { name: "場面の選択へ戻る" }).click();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  await Promise.all([
    page.waitForURL((address) => address.search === ""),
    page.getByRole("link", { name: "通常プレイに戻る" }).click(),
  ]);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(await bothStorages(page)).toEqual(kept);

  // Off needs no password; the key goes, and the switch offers 「オンにする」 again with the focus on it.
  settings = await ops.openSettings(page);
  await section.getByRole("button", { name: "Debugモードをオフにする" }).click();
  await expect(section.getByText("Debugモードをオフにしました。")).toBeVisible();
  await expect(start).toBeFocused();
  await expect(voiceRate).toHaveCount(0);
  expect(await allStorage(page)).not.toHaveProperty([DEBUG_MODE_KEY]);
  await ops.closeDialog(settings);
  // With it off, the production build ignores ?debug again.
  await page.goto("/?debug");
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expect(page.getByTestId("debug-panel")).toHaveCount(0);
});
