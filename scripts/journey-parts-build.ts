import { readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
// With their extensions: vite.config.ts imports this module (Vite's native config loader asks for them).
import { LAST_JOURNEY_KEY, RECENT_JOURNEYS_KEY } from "../src/app/last-journey.ts";
import { KEPT_JOURNEYS_KEY } from "../src/offline/kept-journeys.ts";

/**
 * The page script that starts loading the opening journey's part of the content (src/content/index.ts
 * loadJourneyContent) from index.html, beside the game's own files: otherwise it would start only once the game's
 * script had run. It picks the journey as the title does (src/app/last-journey.ts titleJourneyId; the unit test runs
 * both on the same storage): the one this device opened last while it can be played, else the first playable one;
 * without a network on a device that keeps journeys for 「オフラインで遊ぶ」 (the mirror src/offline/kept-journeys.ts),
 * that one when it is kept, else the kept one opened most recently, else the first kept one. `parts` names the part
 * file of each playable journey, in the catalog's order (paths as index.html writes them). A storage that cannot be
 * read counts as nothing remembered and nothing known to be kept.
 */
export function journeyPartPreloadScript(parts: Readonly<Record<string, string>>, fallback: string): string {
  const key = (name: string) => `localStorage.getItem(${JSON.stringify(name)})`;
  return `(function(){var p=${JSON.stringify(parts)},o=Object.prototype.hasOwnProperty,j=null,r=[],k=[],w=true;` +
    // A stored list: the playable journeys it names (anything else counts as none).
    `function a(v){try{v=JSON.parse(v)}catch(e){return[]}return Array.isArray(v)?v.filter(function(x){return typeof x==="string"&&o.call(p,x)}):[]}` +
    `try{j=${key(LAST_JOURNEY_KEY)};w=navigator.onLine!==false;if(!w){k=a(${key(KEPT_JOURNEYS_KEY)});r=a(${key(RECENT_JOURNEYS_KEY)})}}catch(e){k=[]}` +
    `var h=o.call(p,j)?j:${JSON.stringify(fallback)};` +
    `if(!w&&k.length&&k.indexOf(h)<0){var n=null,i,s=Object.keys(p);for(i=0;i<r.length&&!n;i++)if(k.indexOf(r[i])>=0)n=r[i];` +
    `for(i=0;i<s.length&&!n;i++)if(k.indexOf(s[i])>=0)n=s[i];h=n}` +
    `h=p[h];if(!h)return;` +
    `var l=document.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=h;document.head.appendChild(l)})();`;
}

/** The playable journeys of the generated catalog, in its order (the first is the default). */
export function playableJourneys(root: string): string[] {
  const catalog = JSON.parse(readFileSync(path.join(root, "src/content/generated/content/journeys/catalog.json"), "utf8")) as
    { journeys: { id: string; status: string }[] };
  return catalog.journeys.filter((journey) => journey.status === "available").map((journey) => journey.id);
}

/**
 * Vite plugin (the development server and the unit tests, Vite's "serve"): src/content/index.ts gets every journey's
 * part with the game (src/content/journey-part-files.all.ts in place of journey-part-files.ts), so Debug's scenes and
 * the tests' states of any journey read their content at once. A production build loads each part when its journey
 * opens.
 */
export function allJourneyPartsPlugin(): Plugin {
  return {
    name: "dreamscape-all-journey-parts",
    apply: "serve",
    enforce: "pre",
    resolveId(source, importer, options) {
      if (source !== "./journey-part-files" || !importer || !/[\\/]src[\\/]content[\\/]index\.ts$/u.test(importer)) return null;
      return this.resolve("./journey-part-files.all.ts", importer, { ...options, skipSelf: true });
    },
  };
}

/**
 * Vite plugin (production builds): index.html gets journeyPartPreloadScript with the file Vite made of each playable
 * journey's part (src/content/generated/journey-parts/<journeyId>.json), first in its head. A part not found leaves
 * the page as it was.
 */
export function journeyPartPreloadPlugin(): Plugin {
  let root = "";
  return {
    name: "dreamscape-journey-part-preload",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    transformIndexHtml: {
      order: "post",
      handler(html, context) {
        if (!context.bundle) return;
        const files = new Map<string, string>();
        for (const item of Object.values(context.bundle)) {
          if (item.type !== "chunk") continue;
          const part = /[\\/]generated[\\/]journey-parts[\\/]([a-z][a-z0-9_]*)\.json$/u.exec(item.facadeModuleId ?? "");
          if (part) files.set(part[1], `./${item.fileName}`);
        }
        const journeys = playableJourneys(root).filter((id) => files.has(id));
        if (!journeys.length) return;
        const parts = Object.fromEntries(journeys.map((id) => [id, files.get(id)!]));
        // Right after the charset, before any stylesheet: an inline script waits for the stylesheets above it.
        const charset = /<meta charset="UTF-8" \/>/u;
        if (!charset.test(html)) throw new Error('index.html has no <meta charset="UTF-8" /> to put the journey part preload after.');
        return html.replace(charset, (tag) => `${tag}\n    <script>${journeyPartPreloadScript(parts, journeys[0])}</script>`);
      },
    },
  };
}
