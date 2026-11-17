import { createServer, type AddressInfo } from "node:net";
import { preview, type PreviewServer } from "vite";

/**
 * A server of its own for the built game (`dist/`), for the tests of 「オフラインで遊ぶ」 (tests/e2e/offline.spec.ts,
 * production tier): the test stops it — real offline, whatever the browser's own offline switch does to a service
 * worker — and starts it again at the same address, reads what the browser asked it for, and makes it answer a file
 * with other bytes (a deploy, or a file that arrives broken).
 *
 * - It serves `dist/` under DIST_BASE, the sub-path GitHub Pages serves the game under: the service worker's scope and
 *   every kept file's address are below a folder, not at the site's root (the production tier's own server is at the root).
 * - `vite preview` of the build as it is (no config file, so none of the build's plugins run): it answers a part of a
 *   file (`Range`) with 206 and sends `ETag`, as GitHub Pages does, and a missing file with 404 (no page in its place).
 * - `dist/` is the one the production tier's webServer built before the tests started (playwright.prod.config.ts).
 * - Each test has its own server on a port the system gives it (or one of DREAMSCAPE_DIST_PORTS), so tests of several
 *   workers never share one.
 */
const DIST_BASE = "/dreamscape/";

/** A request the server got: the file's path under DIST_BASE (decoded; "" is the page), its query and its `Range` header. */
export type DistRequest = { path: string; search: string; range: string | null };

export type DistServer = {
  /** The game's address: index.html's folder (ends with "/"). The same before and after a stop. */
  readonly url: string;
  /** Every request since the server first started (or since the test emptied the array), in the order they came. */
  readonly requests: DistRequest[];
  /** Close the server and every open connection: from now on nothing answers at `url`. */
  stop(): Promise<void>;
  /** Serve again at the same address. */
  start(): Promise<void>;
  /** Answer `path` (under DIST_BASE, whatever its query) with these bytes instead of the built file; `restore` undoes it. */
  replace(path: string, body: string | Uint8Array, type?: string): void;
  /** Answer `path` with 404, as a site that no longer has the file; `restore` undoes it. */
  gone(path: string): void;
  restore(path: string): void;
  /**
   * Wait this long before answering each request for a file a device keeps (the page's own requests with
   * `?dreamscape-offline=<hash>`; not the list): a run stays in flight long enough to press 止める or to open a second tab.
   * 0 answers at once again; requests already waiting still wait out their time.
   */
  slow(ms: number): void;
};

/** Listen once on `port` (0: one the system gives) and close again: the port, or null when something listens there. */
function tryPort(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(null));
    probe.listen(port, "127.0.0.1", () => {
      const { port: bound } = probe.address() as AddressInfo;
      probe.close(() => resolve(bound));
    });
  });
}

/**
 * A port nothing listens on, from the system; or, on a machine that allows only some ports, from the range
 * DREAMSCAPE_DIST_PORTS names ("4320-4329"; each of Playwright's workers starts at a place of its own in it).
 */
async function freePort(): Promise<number> {
  const range = /^(\d+)-(\d+)$/u.exec(process.env.DREAMSCAPE_DIST_PORTS ?? "");
  if (!range) {
    const port = await tryPort(0);
    if (port === null) throw new Error("the system gave no free port");
    return port;
  }
  const [first, last] = [Number(range[1]), Number(range[2])];
  const size = last - first + 1;
  const start = (Number(process.env.TEST_PARALLEL_INDEX ?? 0) * 3) % size;
  for (let step = 0; step < size; step += 1) {
    const port = await tryPort(first + ((start + step) % size));
    if (port !== null) return port;
  }
  throw new Error(`DREAMSCAPE_DIST_PORTS=${process.env.DREAMSCAPE_DIST_PORTS}: every port is in use`);
}

/** The request as the tests read it (`url` is what the middleware sees: the path and query from the site's root). */
function distRequest(url: string, range: string | undefined): DistRequest {
  const parsed = new URL(url, "http://dist.invalid");
  const path = decodeURIComponent(parsed.pathname);
  return { path: path.startsWith(DIST_BASE) ? path.slice(DIST_BASE.length) : path, search: parsed.search, range: range ?? null };
}

/** Whether a request is the page's download of a file it keeps (never the list, which is asked for with `=list`). */
export const isDownload = (request: DistRequest): boolean =>
  request.search.startsWith("?dreamscape-offline=") && request.path !== "offline-files.json";

/** Start a server for `root`'s `dist/`. */
export async function startDistServer(root = process.cwd()): Promise<DistServer> {
  const port = await freePort();
  const requests: DistRequest[] = [];
  const replaced = new Map<string, { body: string | Uint8Array; type: string } | null>();
  let delay = 0;
  let running: PreviewServer | null = null;
  const server: DistServer = {
    url: `http://127.0.0.1:${port}${DIST_BASE}`,
    requests,
    async start() {
      if (running) return;
      running = await preview({
        configFile: false, root, logLevel: "silent", base: DIST_BASE, appType: "mpa", build: { outDir: "dist" },
        preview: { host: "127.0.0.1", port, strictPort: true },
        plugins: [{
          name: "dreamscape-dist-server",
          configurePreviewServer(previewServer) {
            previewServer.middlewares.use((request, response, next) => {
              const asked = distRequest(request.url ?? "", request.headers.range);
              requests.push(asked);
              const answer = () => {
                const other = replaced.get(asked.path);
                if (other === undefined) return next();
                if (other === null) {
                  response.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-cache" });
                  response.end("not found");
                  return;
                }
                response.writeHead(200, { "Content-Type": other.type, "Content-Length": Buffer.byteLength(other.body), "Cache-Control": "no-cache" });
                response.end(other.body);
              };
              if (delay > 0 && isDownload(asked)) setTimeout(answer, delay);
              else answer();
            });
          },
        }],
      });
    },
    async stop() {
      const closing = running;
      running = null;
      // (Vite's close ends the open connections too: a browser's kept-alive one would otherwise still be answered.)
      if (closing) await closing.close();
    },
    replace(path, body, type = "application/octet-stream") {
      replaced.set(path, { body, type });
    },
    gone(path) {
      replaced.set(path, null);
    },
    restore(path) {
      replaced.delete(path);
    },
    slow(ms) {
      delay = ms;
    },
  };
  await server.start();
  return server;
}
