import type { Page } from "@playwright/test";

/** Test-only deterministic tickets; production continues to use Web Crypto. */
export async function installRomanceRolls(page: Page, rolls = [0, 5000, 5000, 0]) {
  await page.addInitScript((initialRolls: number[]) => {
    let tickets = [...initialRolls];
    let index = 0;
    const original = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(window, "__setTestRomanceRolls", {
      value: (next: number[]) => { tickets = [...next]; index = 0; },
      configurable: true,
    });
    Object.defineProperty(crypto, "getRandomValues", {
      configurable: true,
      value: (array: Uint32Array<ArrayBuffer>) => {
        if (array instanceof Uint32Array && array.length === 1) {
          array[0] = tickets[index++ % tickets.length];
          return array;
        }
        return original(array);
      },
    });
  }, rolls);
}

/** Change tickets for the next event in the current test page. */
export async function setRomanceRolls(page: Page, rolls: number[]) {
  await page.evaluate((next) => {
    (window as unknown as { __setTestRomanceRolls: (values: number[]) => void }).__setTestRomanceRolls(next);
  }, rolls);
}
