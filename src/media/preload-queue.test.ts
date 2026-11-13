import { describe, expect, it } from "vitest";
import { allowedPriorities, createPreloadQueue, preloadOrder, recentSet, screenFirst, type PreloadRequest } from "./preload-queue";

const image = (key: string, priority: PreloadRequest["priority"]): PreloadRequest => ({ kind: "image", key, priority });
const voice = (key: string, priority: PreloadRequest["priority"]): PreloadRequest => ({ kind: "voice", key, priority });

describe("allowedPriorities", () => {
  it("loads only the next line's on a connection that saves data or is as slow as 2G", () => {
    expect(allowedPriorities({ saveData: true, effectiveType: "4g" })).toEqual(["next"]);
    expect(allowedPriorities({ effectiveType: "2g" })).toEqual(["next"]);
    expect(allowedPriorities({ effectiveType: "slow-2g" })).toEqual(["next"]);
  });
  it("leaves out what only fills idle time on 3G, and loads everything otherwise", () => {
    expect(allowedPriorities({ effectiveType: "3g" })).toEqual(["next", "soon"]);
    expect(allowedPriorities({ effectiveType: "4g", saveData: false })).toEqual(["next", "soon", "idle"]);
    // Safari and Firefox say nothing of their connection.
    expect(allowedPriorities(undefined)).toEqual(["next", "soon", "idle"]);
  });
});

describe("screenFirst", () => {
  it("lets only the next line's files start while the screen's own pictures load", () => {
    expect(screenFirst(["next", "soon", "idle"], true)).toEqual(["next"]);
    expect(screenFirst(["next", "soon", "idle"], false)).toEqual(["next", "soon", "idle"]);
    expect(screenFirst(["next", "soon"], true)).toEqual(["next"]);
  });
});

describe("preloadOrder", () => {
  it("orders by priority, keeps the order asked within one, and asks each file once at its highest priority", () => {
    const order = preloadOrder([image("a", "idle"), image("b", "soon"), voice("v", "next"), image("a", "next"), image("c", "soon")],
      ["next", "soon", "idle"], () => false);
    expect(order).toEqual([voice("v", "next"), image("a", "next"), image("b", "soon"), image("c", "soon")]);
  });
  it("leaves out the priorities not allowed and the files done already", () => {
    const order = preloadOrder([image("a", "next"), image("b", "soon"), image("c", "idle"), image("d", "next")], ["next", "soon"],
      (id) => id === "image:d");
    expect(order.map((request) => request.key)).toEqual(["a", "b"]);
  });
  it("tells a picture from a sound of the same name", () => {
    expect(preloadOrder([image("x", "next"), voice("x", "next")], ["next"], () => false)).toHaveLength(2);
  });
});

describe("recentSet", () => {
  it("forgets the oldest key beyond its size, a key added again counting as new", () => {
    const set = recentSet(2);
    set.add("a");
    set.add("b");
    set.add("a");
    set.add("c");
    expect([set.has("a"), set.has("b"), set.has("c")]).toEqual([true, false, true]);
  });
});

/** A loader whose loads the test settles by hand. */
function manualLoads() {
  const started: string[] = [];
  const pending = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
  const load = (request: PreloadRequest) => new Promise<void>((resolve, reject) => {
    started.push(request.key);
    pending.set(request.key, { resolve, reject });
  });
  const settle = async (key: string, ok = true) => {
    const loading = pending.get(key)!;
    pending.delete(key);
    if (ok) loading.resolve();
    else loading.reject(new Error("failed"));
    // Lets the queue hear of it and start the next.
    for (let tick = 0; tick < 5; tick++) await Promise.resolve();
  };
  return { started, load, settle };
}

describe("createPreloadQueue", () => {
  const allowAll = () => ["next", "soon", "idle"] as const;

  it("loads a few at a time in order, a next file taking one more place", async () => {
    const loads = manualLoads();
    const queue = createPreloadQueue({ load: loads.load, allowed: allowAll, concurrency: 2, remember: 50 });
    queue.want([image("i1", "idle"), image("i2", "idle"), image("i3", "idle")]);
    expect(loads.started).toEqual(["i1", "i2"]);
    // A next file does not wait behind two quiet ones; the waiting idle one stays waiting.
    queue.want([image("i3", "idle"), image("n1", "next")]);
    expect(loads.started).toEqual(["i1", "i2", "n1"]);
    await loads.settle("i1");
    expect(loads.started).toEqual(["i1", "i2", "n1"]);
    await loads.settle("i2");
    expect(loads.started).toEqual(["i1", "i2", "n1", "i3"]);
  });

  it("drops what is no longer wanted before it starts, and never loads a file twice", async () => {
    const loads = manualLoads();
    const queue = createPreloadQueue({ load: loads.load, allowed: allowAll, concurrency: 1, remember: 50 });
    queue.want([image("a", "next"), image("b", "soon"), image("c", "soon")]);
    expect(loads.started).toEqual(["a"]);
    // The screen moved on: b is not wanted any more; a (under way) is not asked again.
    queue.want([image("a", "next"), image("c", "soon"), image("d", "soon")]);
    await loads.settle("a");
    expect(queue.done(image("a", "next"))).toBe(true);
    queue.want([image("a", "next"), image("c", "soon"), image("d", "soon")]);
    await loads.settle("c");
    await loads.settle("d");
    expect(loads.started).toEqual(["a", "c", "d"]);
  });

  it("does not try a failed file again, and goes on with the next", async () => {
    const loads = manualLoads();
    const queue = createPreloadQueue({ load: loads.load, allowed: allowAll, concurrency: 1, remember: 50 });
    queue.want([image("bad", "next"), image("good", "next")]);
    await loads.settle("bad", false);
    expect(loads.started).toEqual(["bad", "good"]);
    queue.want([image("bad", "next")]);
    expect(loads.started).toEqual(["bad", "good"]);
  });

  it("clears what has not started (the page hidden), and loads only what the connection allows", async () => {
    const loads = manualLoads();
    let allowed: readonly ("next" | "soon" | "idle")[] = ["soon"];
    const queue = createPreloadQueue({ load: loads.load, allowed: () => allowed, concurrency: 1, remember: 50 });
    queue.want([image("s1", "soon"), image("s2", "soon"), image("i", "idle")]);
    expect(loads.started).toEqual(["s1"]);
    queue.clear();
    await loads.settle("s1");
    expect(loads.started).toEqual(["s1"]);
    allowed = ["soon", "idle"];
    queue.want([image("i", "idle")]);
    expect(loads.started).toEqual(["s1", "i"]);
  });

  it("goes on when a loader throws instead of failing", async () => {
    const started: string[] = [];
    const queue = createPreloadQueue({
      load: (request) => {
        started.push(request.key);
        if (request.key === "throws") throw new Error("no");
        return Promise.resolve();
      },
      allowed: allowAll, concurrency: 1, remember: 50,
    });
    queue.want([image("throws", "next"), image("after", "next")]);
    for (let tick = 0; tick < 10; tick++) await Promise.resolve();
    expect(started).toEqual(["throws", "after"]);
  });
});
