import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { describeFindings, devOnlyMarkers, findDevOnlyCode, isTextAsset, type DistFile } from "./dist-guard";

// No content build needed: the markers are checked against the repository's
// sources and the detection against small in-memory "builds".
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const cleanBuild: DistFile[] = [
  { path: "index.html", text: '<script type="module" src="./assets/index-abc.js"></script>' },
  { path: "assets/index-abc.js", text: 'const s=new Map;function App(){return"旅をはじめる"}' },
  { path: "assets/index-abc.css", text: ".travel-menu{display:grid}" },
  { path: "assets/tourism/milano/duomo.jpg", text: null },
];

describe("production build guard", () => {
  it("keeps every marker in the file it comes from", () => {
    for (const { text, source } of devOnlyMarkers) {
      const file = path.join(root, source);
      expect(existsSync(file), `${source} (source of "${text}") is missing; update scripts/dist-guard.ts`).toBe(true);
      const found = source.includes(text) || (!source.endsWith("/") && readFileSync(file, "utf8").includes(text));
      expect(found, `"${text}" is no longer in ${source}; pick new text unique to that file`).toBe(true);
    }
  });

  it("finds nothing in a build without development code", () => {
    expect(findDevOnlyCode(cleanBuild)).toEqual([]);
  });

  it("finds Debug, fixtures and test journeys in the text and paths of built files", () => {
    const leaked: DistFile[] = [
      ...cleanBuild,
      { path: "assets/DebugMode-x1.js", text: 'jsx("main",{className:"debug-panel","data-testid":"debug-panel"})' },
      { path: "assets/index-def.js", text: 'throw Error("仮の場面の元になる都市データがありません: milano")' },
      { path: "assets/tourism/sample_trip/mihon_market.png", text: null },
      { path: "assets/index-abc.js.map", text: '{"sources":["../src/dev/debug-state.ts"]}' },
    ];
    expect(findDevOnlyCode(leaked).map(({ path, where, marker }) => [path, where, marker.text])).toEqual([
      ["assets/DebugMode-x1.js", "content", "debug-panel"],
      ["assets/index-def.js", "content", "仮の場面の元になる都市データがありません"],
      ["assets/tourism/sample_trip/mihon_market.png", "path", "sample_trip"],
      ["assets/index-abc.js.map", "content", "src/dev/"],
    ]);
  });

  it("reports the sample journey in generated content and in served image paths", () => {
    // What a production build would contain after `npm run content:build -- --with-sample`.
    const build = [
      { path: "assets/index-abc.js", text: '{"id":"sample_trip","status":"available"}' },
      { path: "assets/tourism/sample_trip/mihon_clock_tower.png", text: null },
    ];
    expect(findDevOnlyCode(build).map(({ path, where, marker }) => [path, where, marker.source])).toEqual([
      ["assets/index-abc.js", "content", "authoring/templates/sample_trip/manifest.json"],
      ["assets/tourism/sample_trip/mihon_clock_tower.png", "path", "authoring/templates/sample_trip/manifest.json"],
    ]);
  });

  it("checks only the path of binary files", () => {
    expect(findDevOnlyCode([{ path: "assets/items/pick.png", text: null }])).toEqual([]);
    expect(isTextAsset("assets/index-abc.js")).toBe(true);
    expect(isTextAsset("manifest.webmanifest")).toBe(true);
    expect(isTextAsset("assets/items/item.SVG")).toBe(true);
    expect(isTextAsset("assets/tourism/milano/duomo.jpg")).toBe(false);
    expect(isTextAsset("assets.js/photo")).toBe(false);
  });

  it("names the file, the text and its source in the report", () => {
    const [finding] = findDevOnlyCode([{ path: "assets/DebugMode-x1.js", text: "debug-panel" }]);
    const report = describeFindings("dist", [finding]);
    expect(report).toContain("本番ビルド（dist）");
    expect(report).toContain("- assets/DebugMode-x1.js の内容に「debug-panel」（目印の由来: src/dev/DebugMode.tsx）");
  });
});
