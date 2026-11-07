import { readFileSync, writeFileSync } from "node:fs";
import { debugSessionExampleUrls } from "../../../scripts/dev/screen-gallery";
import { DEBUG_HOOK_NAME } from "../../../src/dev/debug-hook";
import { bothStorages, devModules, expect, journeyCatalog, placeSave, saveKey, test, tier, type Page } from "../helpers";

// Weekly monkey (docs/10「探索テスト」; research E2E-8). Not a gate: it runs only with
// playwright.explore.config.ts (`npm run test:e2e:explore`, weekly and manual CI).
// From each start point it presses a seeded random visible, enabled control of the game
// (#main, the 待機・休む controls, or the open dialog) — never deletion, journey switching,
// links or leaving Debug — and checks after every press:
// - the shared error guard of helpers.ts (console errors, uncaught exceptions, missing files);
// - the game state (the journey's save, or Debug's read-only hook) passes validateGameState
//   with AP within 0..cap, and its revision never goes back;
// - something can be pressed within 5 s, unless the journey has ended (otherwise: stuck).
// Every 40 presses the page reloads (a normal save must come back unchanged); every 200 it
// starts again (a new journey, or another Debug scene). The Debug start points are the docs/10
// examples that open a scene with a game state (debugSessionExampleUrls; the map check has none).
// A start point that does not open fails like any check, with the seed and the trace. The romance draws come from a seeded
// crypto.getRandomValues (addInitScript, test side only). A failure prints MONKEY_SEED and the
// last presses; rerun with the same MONKEY_SEED (and -g for the start point).
const seed = Number(process.env.MONKEY_SEED ?? Math.floor(Math.random() * 1_000_000));
const seconds = Number(process.env.MONKEY_SECONDS ?? 40);
const RELOAD_EVERY = 40;
const RESTART_EVERY = 200;
const STUCK_MS = 5_000;
const TRACE = 30;
if (!Number.isSafeInteger(seed) || !(seconds > 0)) throw new Error("MONKEY_SEED must be an integer and MONKEY_SECONDS a positive number");

/** mulberry32, the same generator the walk test uses. */
function random(start: number): () => number {
  let a = start >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const playable = journeyCatalog().journeys.filter((journey) => journey.status === "available");
/** The journey a page load opens (the first available one); another journey is chosen on its title, as a player does. */
const openedFirst = playable[0].id;
/** The Debug examples of docs/10 that open a scene with a game state (not the prototype map check, which has none). */
const debugUrls = debugSessionExampleUrls(readFileSync(new URL("../../../docs/10_DEVELOPMENT_CHECKS.md", import.meta.url), "utf8"));
/** Controls the monkey never presses: they delete data, switch journeys or leave Debug (labels as shown). */
const excludedLabels = ["消去", "通常プレイに戻る", "設定へ戻る"];

type Source = { kind: "save"; journeyId: string } | { kind: "debug" };
type Check = { revision: number | null; error: string | null; ended: boolean };

/** Read the game the way a test may (the normal save or Debug's read-only hook) and check it in the page. */
function check(page: Page, source: Source): Promise<Check> {
  return page.evaluate(async ({ key, hook, modules }) => {
    const raw = key ? localStorage.getItem(key) : null;
    const state = key ? (raw === null ? null : JSON.parse(raw)) : (window as unknown as Record<string, { getState(): unknown } | undefined>)[hook]?.getState() ?? null;
    if (!state) return { revision: null, error: null, ended: false };
    const { validateGameState } = await import(/* @vite-ignore */ modules.game);
    const { balance } = await import(/* @vite-ignore */ modules.content);
    const { isJourneyComplete } = await import(/* @vite-ignore */ modules.cityTravel);
    try {
      const valid = validateGameState(state);
      const error = valid.ap < 0 || valid.ap > balance.apCap ? `AP out of range: ${valid.ap}` : null;
      return { revision: valid.revision as number, error, ended: isJourneyComplete(valid) as boolean };
    } catch (failure) {
      return { revision: null, error: `validateGameState: ${(failure as Error).message}`, ended: false };
    }
  }, { key: source.kind === "save" ? saveKey(source.journeyId) : null, hook: DEBUG_HOOK_NAME, modules: devModules });
}

/** Mark one pressable control (chosen by `roll`) with data-monkey-target and describe it; null when there is none. */
function choose(page: Page, roll: number) {
  return page.evaluate(({ roll, excludedLabels }) => {
    document.querySelectorAll("[data-monkey-target]").forEach((element) => element.removeAttribute("data-monkey-target"));
    const dialogs = [...document.querySelectorAll("dialog[open]")];
    const roots = dialogs.length ? [dialogs[dialogs.length - 1]] : [document.getElementById("main"), document.querySelector('[data-testid="travel-actions"]')];
    const label = (element: Element) => (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().replace(/\s+/gu, " ").slice(0, 60);
    const shown = (element: Element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden";
    };
    const candidates = roots.flatMap((root) => root ? [...root.querySelectorAll('button, select, summary, [role="button"], input[type="checkbox"]')] : [])
      .filter((element) => shown(element) && !(element as HTMLButtonElement).disabled && !element.closest("[inert], [aria-hidden='true']") &&
        !element.closest(".journey-selection") && !excludedLabels.some((text) => label(element).includes(text)));
    if (!candidates.length) return null;
    const index = Math.floor(roll * candidates.length);
    const element = candidates[index];
    element.setAttribute("data-monkey-target", "");
    const options = element instanceof HTMLSelectElement ? [...element.options].filter((option) => !option.disabled).map((option) => option.value) : [];
    return { tag: element.tagName.toLowerCase(), label: label(element), options, index, count: candidates.length };
  }, { roll, excludedLabels });
}

/** After a load, open the journey's saved game (a player chooses it on the title after a reload). */
async function resume(page: Page, journeyId: string) {
  if (journeyId !== openedFirst) await page.getByLabel("旅行編").selectOption(journeyId);
  await expect(page.getByTestId("travelers")).toBeVisible();
}

async function startJourney(page: Page, journeyId: string) {
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption(journeyId);
  await page.getByLabel("主人公の名前").fill("航");
  await page.getByLabel("ヒロインの名前").fill("澪");
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key) !== null, saveKey(journeyId))).toBe(true);
}

/** A chosen start: where the game state is read, a label for the trace, and how to open it. */
type Start = { source: Source; label: string; open: (page: Page) => Promise<void> };
type StartPoint = { name: string; pick: (next: () => number) => Start };
const pickFrom = <T>(items: readonly T[], next: () => number) => items[Math.floor(next() * items.length)];
const startPoints: StartPoint[] = [
  { name: "a new journey from the title", pick: (next) => {
    const journey = pickFrom(playable, next);
    return { source: { kind: "save", journeyId: journey.id }, label: `new ${journey.id}`, open: (page) => startJourney(page, journey.id) };
  } },
  { name: "a normal save placed midway through a city", pick: (next) => {
    const journey = pickFrom(playable, next);
    const city = pickFrom(journey.cities, next);
    return { source: { kind: "save", journeyId: journey.id }, label: `cityMidway(${city.id})`, open: async (page) => {
      await page.evaluate(() => localStorage.clear());
      // Lane 2 (docs/10): the real game functions build the state, the game's own saveGame stores it.
      await placeSave(page, journey.id, "cityMidway", city.id);
      await page.reload();
      await resume(page, journey.id);
    } };
  } },
  { name: "a Debug scene from the launch URLs of docs/10", pick: (next) => {
    const scene = pickFrom(debugUrls, next);
    return { source: { kind: "debug" }, label: `Debug ${scene.titleJa} (${scene.url})`, open: async (page) => {
      await page.goto(`/${scene.url}`);
      await expect(page.getByTestId("debug-session")).toBeVisible();
    } };
  } },
];

startPoints.forEach((start, index) => {
  test(`monkey from ${start.name}`, { tag: tier.explore }, async ({ page }, testInfo) => {
    test.setTimeout(seconds * 1000 + 120_000);
    const ownSeed = seed + index;
    const next = random(ownSeed);
    testInfo.annotations.push({ type: "MONKEY_SEED", description: String(seed) });
    // Seeded romance draws (crypto.getRandomValues, used by the game's secure roll); test side only.
    await page.addInitScript((value) => {
      let a = value >>> 0;
      const draw = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
      };
      const original = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = ((array: Parameters<typeof original>[0]) => {
        if (array instanceof Uint32Array) { for (let i = 0; i < array.length; i++) array[i] = draw(); return array; }
        return original(array);
      }) as typeof crypto.getRandomValues;
    }, ownSeed);
    const trace: string[] = [];
    const log = (line: string) => { trace.push(line); if (trace.length > TRACE) trace.shift(); };
    let step = 0;
    // The shared error guard fails the test at its end; an uncaught exception also stops the monkey at once.
    let pageError: string | null = null;
    page.on("pageerror", (error) => { pageError ??= error.message; log(`${step}: page error ${error.message}`); });
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) log(`${step}: console error ${message.text()}`);
    });
    const fail = (message: string): never => {
      throw new Error([message, `MONKEY_SEED=${seed} (start point ${index}, seed ${ownSeed}), press ${step}`, "last presses (oldest first):",
        ...trace.map((line) => `  ${line}`), `rerun: MONKEY_SEED=${seed} npm run test:e2e:explore -- -g "${start.name}"`].join("\n"));
    };
    /** Wait for the page to get somewhere; when it does not, fail with the seed and the trace like any other check. */
    const must = async (what: string, action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (error) {
        fail(`${what}: ${(error as Error).message.split("\n").filter((line) => line.trim()).slice(0, 3).join(" / ")}`);
      }
    };

    await page.goto("/");
    const before = await bothStorages(page);
    let opened: Start | undefined;
    let lastRevision = -1;
    const openStart = async (again: boolean) => {
      opened = start.pick(next);
      log(`(start${again ? " again" : ""} ${opened.label})`);
      await must(`the start point did not open (${opened.label})`, () => opened!.open(page));
      lastRevision = -1;
    };
    const deadline = Date.now() + seconds * 1000;
    let presses = 0;
    try {
      await openStart(false);
      for (; Date.now() < deadline; step++) {
        const current = opened!;
        if (presses > 0 && presses % RESTART_EVERY === 0) {
          await openStart(true);
        } else if (presses > 0 && presses % RELOAD_EVERY === 0) {
          const saved = current.source.kind === "save" ? await page.evaluate((key) => localStorage.getItem(key), saveKey(current.source.journeyId)) : null;
          await page.reload();
          log("(reload)");
          if (current.source.kind === "save") {
            const journeyId = current.source.journeyId;
            await must("the journey did not come back after a reload", () => resume(page, journeyId));
            const after = await page.evaluate((key) => localStorage.getItem(key), saveKey(journeyId));
            if (after !== saved) fail("the save changed across a reload");
          } else {
            await must("the Debug scene did not come back after a reload", () => expect(page.getByTestId("debug-session")).toBeVisible());
            lastRevision = -1;
          }
        }
        presses++;
        // Wait (up to 5 s) for something to press; none before the end of the journey = stuck.
        let target: Awaited<ReturnType<typeof choose>> = null;
        const roll = next();
        await expect.poll(async () => (target = await choose(page, roll)) !== null, { timeout: STUCK_MS }).toBe(true).catch(() => undefined);
        if (!target) {
          const state = await check(page, opened!.source);
          if (state.ended) { presses = RESTART_EVERY; continue; }
          fail("stuck: nothing to press for 5 seconds");
        }
        const chosen = target!;
        log(`${step}: ${chosen.tag} 「${chosen.label}」 (${chosen.index + 1} of ${chosen.count})`);
        const control = page.locator("[data-monkey-target]");
        try {
          if (chosen.tag === "select") await control.selectOption(pickFrom(chosen.options, next), { timeout: 2_000 });
          else await control.click({ timeout: 2_000 });
        } catch {
          log("  (the control went away before the press)");
        }
        // Wait on the game's own settling marks, not on time.
        await expect(page.locator("[data-answer-settling]")).toHaveCount(0);
        await expect(page.getByTestId("travel-transition")).toHaveCount(0);
        if (pageError) fail(`uncaught exception in the page: ${pageError}`);
        const state = await check(page, opened!.source);
        if (state.error) fail(state.error);
        if (state.revision !== null) {
          if (state.revision < lastRevision) fail(`the saved revision went back from ${lastRevision} to ${state.revision}`);
          lastRevision = state.revision;
        }
      }
    } finally {
      const file = testInfo.outputPath("monkey-trace.txt");
      writeFileSync(file, [`MONKEY_SEED=${seed} start point ${index} (${start.name}), ${presses} presses, last start: ${opened?.label ?? "none"}`, ...trace].join("\n") + "\n");
      await testInfo.attach("monkey-trace.txt", { path: file, contentType: "text/plain" });
    }
    // Debug works in memory only: the browser's storage is as it was before Debug opened.
    if (opened!.source.kind === "debug") expect(await bothStorages(page), "Debug changed the normal storage").toEqual(before);
  });
});
