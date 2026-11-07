// The other-tab protection (AGENTS.md 「明示確認と別タブ競合の保護を維持する」, docs/07 acceptance 10):
// the journey opens only while this view holds the slot's exclusive Web Lock. Played against a
// fake LockManager with the browser's rules (exclusive by name; `ifAvailable` answers null while
// another holder has it; a lock is held until the callback's promise settles).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { journeyStorage } from "./journey-storage";
import {
  holdJourneyLock, journeyLockName, journeyLockNotice, LOCK_RETRIES, LOCK_RETRY_MS, needsJourneyLock,
  type JourneyLockHold, type JourneyLockStatus, type LockManagerLike,
} from "./journey-lock";

/** The Web Locks of one browser, shared by all its tabs. */
class FakeLocks implements LockManagerLike {
  readonly held = new Set<string>();
  /** Every request in order, and whether it was granted. */
  readonly requests: { name: string; granted: boolean }[] = [];
  /** Most holders of one name at the same time (the protection needs 1). */
  maxHolders = 0;
  private holders = new Map<string, number>();

  async request(name: string, _options: { ifAvailable: true }, callback: (lock: Lock | null) => unknown): Promise<unknown> {
    const granted = !this.held.has(name);
    if (granted) this.grant(name);
    this.requests.push({ name, granted });
    // Browsers answer in a later task, never inside request().
    await Promise.resolve();
    if (!granted) return callback(null);
    try {
      return await callback({ name, mode: "exclusive" } as Lock);
    } finally {
      this.held.delete(name);
      this.holders.set(name, (this.holders.get(name) ?? 1) - 1);
    }
  }

  private grant(name: string) {
    this.held.add(name);
    const holders = (this.holders.get(name) ?? 0) + 1;
    this.holders.set(name, holders);
    this.maxHolders = Math.max(this.maxHolders, holders);
  }

  /** Another tab opens the journey and keeps it open until `close()`. */
  async otherTab(name: string) {
    let close = () => {};
    void this.request(name, { ifAvailable: true }, (lock) => lock && new Promise<void>((resolve) => { close = resolve; }));
    await settle();
    return { close: async () => { close(); await settle(); } };
  }
}

/** Let pending promise callbacks run (no timer moves). */
const settle = () => vi.advanceTimersByTimeAsync(0);

let lockCount = 0;
/** A fresh lock name per test: the page-wide chain of settled requests is shared. */
const newName = () => `dreamscape:test-slot-${++lockCount}`;

/** One editing view of the journey: what it reports, newest last. */
function openView(locks: LockManagerLike | undefined, name: string) {
  const statuses: JourneyLockStatus[] = [];
  const hold = holdJourneyLock(locks, name, (status) => statuses.push(status));
  return { statuses, hold: hold as JourneyLockHold, last: () => statuses.at(-1) };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("journey lock", () => {
  it("opens the journey once this view holds the slot's lock", async () => {
    const locks = new FakeLocks();
    const name = newName();
    const view = openView(locks, name);
    expect(view.statuses).toEqual([]);
    await settle();
    expect(view.statuses).toEqual(["ready"]);
    expect(locks.held.has(name)).toBe(true);
    expect(locks.requests).toEqual([{ name, granted: true }]);
    expect(journeyLockNotice("ready")).toBeNull();
  });

  it("names one lock per journey slot", () => {
    const base = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    expect(journeyLockName(journeyStorage(base, "milano"))).toBe("dreamscape:dreamscape.journey.milano.save.v1");
    expect(journeyLockName(journeyStorage(base, "golden_triangle"))).toBe("dreamscape:dreamscape.journey.golden_triangle.save.v1");
  });

  it("shows the waiting screen with 再試行 while another tab keeps the journey open", async () => {
    const locks = new FakeLocks();
    const name = newName();
    await locks.otherTab(name);
    const view = openView(locks, name);
    // A reloading page may still be releasing: the view asks again for a second before giving up.
    await vi.advanceTimersByTimeAsync(LOCK_RETRIES * LOCK_RETRY_MS - 1);
    expect(view.statuses).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(view.statuses).toEqual(["busy"]);
    expect(locks.requests.slice(1)).toHaveLength(LOCK_RETRIES + 1);
    expect(locks.requests.slice(1).every((request) => !request.granted)).toBe(true);
    expect(journeyLockNotice("busy")).toEqual({ role: "alert", retry: true,
      message: "この旅行編は別のタブで開いています。そちらを閉じてから再試行してください。" });
    // It stops asking once busy.
    await vi.advanceTimersByTimeAsync(10 * LOCK_RETRY_MS);
    expect(locks.requests.slice(1)).toHaveLength(LOCK_RETRIES + 1);
  });

  it("opens the journey when the other tab lets go during the retries (a reload of the same journey)", async () => {
    const locks = new FakeLocks();
    const name = newName();
    const other = await locks.otherTab(name);
    const view = openView(locks, name);
    await vi.advanceTimersByTimeAsync(3 * LOCK_RETRY_MS);
    await other.close();
    await vi.advanceTimersByTimeAsync(LOCK_RETRY_MS);
    expect(view.statuses).toEqual(["ready"]);
    expect(locks.held.has(name)).toBe(true);
  });

  it("opens the journey on 再試行 after the other tab is closed", async () => {
    const locks = new FakeLocks();
    const name = newName();
    const other = await locks.otherTab(name);
    const first = openView(locks, name);
    await vi.advanceTimersByTimeAsync(LOCK_RETRIES * LOCK_RETRY_MS);
    expect(first.last()).toBe("busy");
    await other.close();
    // 再試行 rebuilds the view: the old request is cancelled and a new one asks.
    first.hold.cancel();
    const retried = openView(locks, name);
    await settle();
    expect(retried.statuses).toEqual(["ready"]);
    expect(first.statuses).toEqual(["busy"]);
  });

  it("keeps every journey closed without Web Locks, or when the browser refuses the request", async () => {
    const missing = openView(undefined, newName());
    expect(missing.statuses).toEqual(["unsupported"]);
    expect(missing.hold).toBeNull();
    const noRequest = openView({} as LockManagerLike, newName());
    expect(noRequest.statuses).toEqual(["unsupported"]);
    // e.g. a SecurityError in a sandboxed or insecure context.
    const refusing: LockManagerLike = { request: () => Promise.reject(new DOMException("denied", "SecurityError")) };
    const refused = openView(refusing, newName());
    await settle();
    expect(refused.statuses).toEqual(["unsupported"]);

    const notice = journeyLockNotice("unsupported");
    expect(notice).toEqual({ role: "alert", retry: false,
      message: "このブラウザでは別タブとの保存競合を防げないため、この旅行編を開けません。対応ブラウザをご利用ください。" });
    expect(journeyLockNotice("loading")).toEqual({ role: "status", message: "保存データを確認しています。", retry: false });
  });

  it("asks only for views that edit the slot: not Debug, not a read-only preparation page", () => {
    const initialState = {} as NonNullable<Parameters<typeof needsJourneyLock>[0]>["initialState"];
    expect(needsJourneyLock({ status: "available", initialState: undefined }, false)).toBe(true);
    expect(needsJourneyLock({ status: "preparing", initialState }, false)).toBe(true);
    expect(needsJourneyLock({ status: "preparing", initialState: undefined }, false)).toBe(false);
    expect(needsJourneyLock({ status: "available", initialState: undefined }, true)).toBe(false);
    // An unknown journey still edits a slot.
    expect(needsJourneyLock(undefined, false)).toBe(true);
  });

  it("waits for its own earlier view to let go instead of reporting another tab (no double acquisition)", async () => {
    const locks = new FakeLocks();
    const name = newName();
    const first = openView(locks, name);
    await settle();
    expect(first.last()).toBe("ready");
    // A React remount or a switch away and back: the old view releases, the new one asks at once.
    first.hold.cancel();
    const second = openView(locks, name);
    await settle();
    expect(second.statuses).toEqual(["ready"]);
    expect(locks.requests).toEqual([{ name, granted: true }, { name, granted: true }]);
    expect(locks.maxHolders).toBe(1);
  });

  it("does nothing for a view cancelled before its answer, and frees the lock at once", async () => {
    const locks = new FakeLocks();
    const name = newName();
    const view = openView(locks, name);
    view.hold.cancel();
    await settle();
    expect(view.statuses).toEqual([]);
    expect(locks.held.has(name)).toBe(false);
  });

  it("releases the lock when the view goes away, and stops retrying", async () => {
    const locks = new FakeLocks();
    const name = newName();
    const view = openView(locks, name);
    await settle();
    view.hold.cancel();
    await settle();
    expect(locks.held.has(name)).toBe(false);
    // Another tab can open the journey now.
    await locks.otherTab(name);
    expect(locks.held.has(name)).toBe(true);

    const waiting = openView(locks, name);
    await vi.advanceTimersByTimeAsync(2 * LOCK_RETRY_MS);
    const asked = locks.requests.length;
    waiting.hold.cancel();
    await vi.advanceTimersByTimeAsync(LOCK_RETRIES * LOCK_RETRY_MS);
    expect(locks.requests).toHaveLength(asked);
    expect(waiting.statuses).toEqual([]);
  });

  it("gives the lock up when the page is hidden and ignores the answers that come after", async () => {
    const locks = new FakeLocks();
    const name = newName();
    const view = openView(locks, name);
    await settle();
    view.hold.pageHidden();
    await settle();
    expect(view.statuses).toEqual(["ready", "loading"]);
    expect(locks.held.has(name)).toBe(false);

    const other = await locks.otherTab(name);
    const hidden = openView(locks, name);
    hidden.hold.pageHidden();
    await vi.advanceTimersByTimeAsync(LOCK_RETRIES * LOCK_RETRY_MS);
    // A hidden page neither retries nor reports another tab.
    expect(hidden.statuses).toEqual(["loading"]);
    await other.close();
  });
});
