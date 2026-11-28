import { chromium, devices } from "playwright";
const [out, url, max] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2, reducedMotion: "reduce" });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(url); await page.waitForTimeout(3500);
const line = page.getByTestId("dialogue-text");
let shots = 0;
for (let i = 0; i < Number(max) && shots < 3; i++) {
  const tabs = await page.getByTestId("line-mention").count();
  if (tabs) { console.log("step", i, "tabs", await page.getByTestId("line-mention").allTextContents()); await page.screenshot({ path: `${out}-${i}.png` }); shots++;
    if (shots === 1) { await page.getByTestId("line-mention").first().click(); await page.waitForTimeout(800); await page.screenshot({ path: `${out}-${i}-open.png` });
      console.log("dialog", await page.locator("dialog[open]").count()); await page.keyboard.press("Escape"); await page.waitForTimeout(500); } }
  const box = await line.boundingBox().catch(() => null);
  if (!box) { await page.mouse.click(10, 300); } else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);
}
await browser.close();
