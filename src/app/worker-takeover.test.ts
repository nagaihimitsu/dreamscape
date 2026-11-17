import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { takeOver, TAKEOVER_ANSWER_MS, TAKEOVER_LAST_MS, TAKEOVER_RETRY_MS, type TakeoverEnv } from "./worker-takeover";

// A page of a newer version asks the waiting worker of its version to take over, and sees it through: while the
// takeover stays pending (a request of the page started the older worker again as Chromium ended it), it asks again
// with a throwaway worker in the scope, so that the next page load never meets an older worker Chromium ends in the
// middle of answering it (a reload that hung after a deploy, 2026-11-17).
type Fake = TakeoverEnv & { change: () => void; probes: { ended: boolean }[]; asked: number };

function fake({ answer = true as boolean | "never", waits = () => true }: { answer?: boolean | "never"; waits?: () => boolean } = {}): Fake {
  let change = () => {};
  const probes: { ended: boolean }[] = [];
  const env: Fake = {
    changed: new Promise((resolve) => { change = () => resolve(undefined); }),
    change: () => change(),
    asked: 0,
    ask: () => {
      env.asked += 1;
      return answer === "never" ? new Promise<boolean>(() => {}) : Promise.resolve(answer);
    },
    waits: async () => waits(),
    probe: () => {
      const probe = { ended: false };
      probes.push(probe);
      return () => { probe.ended = true; };
    },
    probes,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
  return env;
}
const total = (pauses: readonly number[]) => pauses.reduce((sum, ms) => sum + ms, 0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("takeOver", () => {
  it("asks once and asks nothing more when the new worker takes over at once", async () => {
    const env = fake();
    const result = takeOver(env);
    await vi.advanceTimersByTimeAsync(10);
    env.change();
    await expect(result).resolves.toBe(true);
    expect([env.asked, env.probes.length]).toEqual([1, 0]);
  });

  it("asks the browser again with a throwaway worker while the takeover stays pending, until it is done, and ends every one", async () => {
    const env = fake();
    const result = takeOver(env);
    await vi.advanceTimersByTimeAsync(TAKEOVER_RETRY_MS[0] - 1);
    expect(env.probes).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(env.probes).toEqual([{ ended: false }]);
    await vi.advanceTimersByTimeAsync(TAKEOVER_RETRY_MS[1]);
    // One at a time: the one before is ended as the next starts.
    expect(env.probes).toEqual([{ ended: true }, { ended: false }]);
    env.change();
    await expect(result).resolves.toBe(true);
    expect(env.probes).toEqual([{ ended: true }, { ended: true }]);
    expect(env.asked).toBe(1);
  });

  it("gives up after its last ask when the takeover stays pending (the browser's own timers end it later)", async () => {
    const env = fake();
    let settled: boolean | undefined;
    void takeOver(env).then((value) => { settled = value; });
    await vi.advanceTimersByTimeAsync(total(TAKEOVER_RETRY_MS) + TAKEOVER_LAST_MS - 1);
    expect(settled).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(false);
    expect(env.probes).toHaveLength(TAKEOVER_RETRY_MS.length);
    expect(env.probes.every((probe) => probe.ended)).toBe(true);
  });

  it("asks nothing more of a waiting worker of another version: it never says it takes over", async () => {
    for (const answer of [false, "never"] as const) {
      const env = fake({ answer });
      let settled: boolean | undefined;
      void takeOver(env).then((value) => { settled = value; });
      await vi.advanceTimersByTimeAsync(TAKEOVER_ANSWER_MS);
      expect(settled, String(answer)).toBe(false);
      await vi.advanceTimersByTimeAsync(total(TAKEOVER_RETRY_MS) + TAKEOVER_LAST_MS);
      expect(env.probes, String(answer)).toHaveLength(0);
    }
  });

  it("only waits for the change once the worker no longer waits (it is taking over, or a newer one replaced it)", async () => {
    const env = fake({ waits: () => false });
    let settled: boolean | undefined;
    void takeOver(env).then((value) => { settled = value; });
    await vi.advanceTimersByTimeAsync(TAKEOVER_RETRY_MS[0] + TAKEOVER_LAST_MS);
    expect(settled).toBe(false);
    expect(env.probes).toHaveLength(0);
  });

  it("counts a change that comes before the answer", async () => {
    const env = fake({ answer: "never" });
    const result = takeOver(env);
    env.change();
    await expect(result).resolves.toBe(true);
    expect(env.probes).toHaveLength(0);
  });
});
