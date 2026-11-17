/**
 * The takeover of a newer version of the service worker (src/sw/service-worker.ts) by a page of that version (the
 * same entry script): the newer worker, installed during an earlier visit, waits while pages of the older one are
 * open; the page asks it to take over ("activate"; it calls skipWaiting and says "activating"), and Chromium then ends
 * the older worker as soon as that one is idle.
 *
 * Why the page sees it through (2026-11-17, a reload that hung after a deploy): when one of the page's own requests
 * (a picture, a font as the title appears) reaches the older worker in the instant Chromium ends it, Chromium starts
 * that worker again and does not end it a second time. The takeover then stays pending: about 30 s on a phone (until
 * the older worker is idle again), and while DevTools is attached to the worker (Playwright's tests, a developer's
 * console) until the next page load in the worker's scope, which ends the older worker in the middle of answering that
 * load: Chromium never answers it, and the reload hangs. So while the takeover stays pending the page asks again, at
 * a moment of its own: a throwaway worker whose script (TAKEOVER_PROBE_FILE, an empty script of the site) is a new
 * client in the scope, and its start makes Chromium end the older worker again; once that one is idle, the newer one
 * takes over. Nothing of it shows to the player.
 */

/** The empty script under the worker's scope that the throwaway worker runs (public/takeover-probe.js). */
export const TAKEOVER_PROBE_FILE = "takeover-probe.js";
/** How long the waiting worker may take to answer (it may have to start first). */
export const TAKEOVER_ANSWER_MS = 5_000;
/** The pauses before each new ask while the takeover stays pending (about 16 s in all), and the last wait after them. */
export const TAKEOVER_RETRY_MS: readonly number[] = [1_000, 1_000, 2_000, 4_000, 8_000];
export const TAKEOVER_LAST_MS = 2_000;

/** What the takeover needs of the browser (browserTakeover; the unit test gives its own). */
export type TakeoverEnv = {
  /** Resolves once another worker serves this page (controllerchange). */
  changed: Promise<unknown>;
  /** Ask the waiting worker to take over; true once it says it does (a worker of another version never says so). */
  ask: () => Promise<boolean>;
  /** Whether the worker asked still waits (not taking over yet, not replaced by a newer one). */
  waits: () => Promise<boolean>;
  /** Start a throwaway worker in the scope; the function it returns ends it. */
  probe: () => () => void;
  sleep: (ms: number) => Promise<void>;
};

/**
 * Ask the waiting worker to take over and see it through: true once another worker serves the page; false when the
 * waiting worker is not this page's version (it does not answer) or the takeover is still pending after the last ask.
 */
export async function takeOver(env: TakeoverEnv): Promise<boolean> {
  const changed = env.changed.then(() => true as const);
  const settled = (ms: number) => Promise.race([changed, env.sleep(ms).then(() => false as const)]);
  const answer = await Promise.race([changed, env.ask().then((yes) => (yes ? "yes" as const : false as const)), env.sleep(TAKEOVER_ANSWER_MS).then(() => false as const)]);
  if (answer !== "yes") return answer;
  let end = (): void => undefined;
  try {
    for (const pause of TAKEOVER_RETRY_MS) {
      if (await settled(pause)) return true;
      // It moved on (it is taking over, or a newer one replaced it): only the change is waited for.
      if (!(await env.waits())) break;
      end();
      end = env.probe();
    }
    return await settled(TAKEOVER_LAST_MS);
  } finally {
    end();
  }
}

/** The browser's side of a takeover of `waiting` by this page (`entry`: its entry script, as an address). */
export function browserTakeover(waiting: ServiceWorker, entry: string | undefined): TakeoverEnv {
  const workers = navigator.serviceWorker;
  return {
    changed: new Promise((resolve) => workers.addEventListener("controllerchange", resolve, { once: true })),
    ask: () => new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event: MessageEvent<{ type?: unknown } | null>) => { if (event.data?.type === "activating") resolve(true); };
      waiting.postMessage({ type: "activate", entry }, [channel.port2]);
    }),
    waits: async () => waiting.state === "installed" && (await workers.getRegistration().catch(() => undefined))?.waiting === waiting,
    probe: () => {
      try {
        const probe = new Worker(new URL(TAKEOVER_PROBE_FILE, new URL("./", window.location.href)));
        probe.addEventListener("error", (event) => event.preventDefault());
        return () => probe.terminate();
      } catch {
        return () => undefined;
      }
    },
    sleep: (ms) => new Promise((resolve) => window.setTimeout(resolve, ms)),
  };
}
