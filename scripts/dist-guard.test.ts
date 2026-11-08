import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkThirdPartyLicenses, describeFindings, devOnlyMarkers, findDevOnlyCode, isTextAsset, type DistFile } from "./dist-guard";
import { runtimeImports } from "./test-sets";

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
      { path: "assets/index-def.js", text: 'throw Error("仮の場面の元になる都市がありません。公開中の旅行編のどれかに…")' },
      { path: "assets/tourism/sample_trip/mihon_market.png", text: null },
      { path: "assets/index-abc.js.map", text: '{"sources":["../src/dev/debug-state.ts"]}' },
    ];
    expect(findDevOnlyCode(leaked).map(({ path, where, marker }) => [path, where, marker.text])).toEqual([
      ["assets/DebugMode-x1.js", "content", "debug-panel"],
      ["assets/index-def.js", "content", "仮の場面の元になる都市がありません"],
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

/** Game source files that ship: src/ without Debug/preview (src/dev/), tests and in-memory test fixtures. */
function productionSources(): string[] {
  return readdirSync(path.join(root, "src"), { recursive: true, encoding: "utf8" })
    .map((file) => `src/${file.split(path.sep).join("/")}`)
    .filter((file) => /\.tsx?$/.test(file) && !file.startsWith("src/dev/") && !/\.test\.tsx?$/.test(file) && !file.includes("test-fixture"));
}
const devOnlyImport = /(^|\/)dev\/|test-fixture|(^|\/)tests\//;

describe("development-only code in the game's sources", () => {
  it("is reached only through main.tsx's lazy imports behind import.meta.env.DEV", () => {
    const sources = productionSources();
    expect(sources).toContain("src/main.tsx");
    expect(sources).toContain("src/app/GameApp.tsx");
    const reached = sources.flatMap((file) => runtimeImports(readFileSync(path.join(root, file), "utf8"))
      .filter((specifier) => devOnlyImport.test(specifier)).map((specifier) => `${file} → ${specifier}`));
    expect(reached).toEqual(["src/main.tsx → ./dev/CharacterPreview", "src/main.tsx → ./dev/DebugMode"]);
    // Each one is the lazy branch of a DEV check, which Vite removes from production builds;
    // the Debug launch URL (?debug&…) and the test hook live behind it in src/dev/.
    const main = readFileSync(path.join(root, "src/main.tsx"), "utf8");
    const guarded = [...main.matchAll(/= import\.meta\.env\.DEV\s*\?\s*React\.lazy\(\(\) => import\("(\.\/dev\/\w+)"\)\)\s*:\s*null;/g)].map((match) => match[1]);
    expect(guarded.sort()).toEqual(["./dev/CharacterPreview", "./dev/DebugMode"]);
    expect(main).toMatch(/const query = import\.meta\.env\.DEV \? new URLSearchParams\(window\.location\.search\) : null;/);
  });
});

describe("library licence notices of the production build", () => {
  const entry = (name: string, extra: Record<string, unknown> = {}) =>
    ({ name, version: "1.0.0", identifier: "MIT", text: `MIT License\n\nCopyright (c) ${name} authors`, ...extra });
  const dependencies = ["leaflet", "zod"];

  it("accepts a list with a licence text for every package, dependencies and their bundled packages", () => {
    expect(checkThirdPartyLicenses(JSON.stringify([entry("leaflet", { identifier: "BSD-2-Clause" }), entry("scheduler"), entry("zod")]), dependencies)).toEqual([]);
  });

  it("names a missing or unreadable file, an entry without its licence and a dependency left out", () => {
    expect(checkThirdPartyLicenses(null, dependencies)).toEqual([
      "third-party-licenses.json がありません。vite.config.ts の build.license でライブラリのライセンス一覧を書き出してください。"]);
    expect(checkThirdPartyLicenses("<!doctype html>", dependencies)).toEqual(["third-party-licenses.json を JSON として読めません。"]);
    expect(checkThirdPartyLicenses("{}", dependencies)).toEqual(["third-party-licenses.json はライブラリの一覧（JSON の配列）ではありません。"]);
    expect(checkThirdPartyLicenses(JSON.stringify([entry("leaflet", { text: "" }), entry("zod", { identifier: undefined }), {}]), dependencies)).toEqual([
      "third-party-licenses.json の leaflet 1.0.0 に text がありません。",
      "third-party-licenses.json の zod 1.0.0 に identifier がありません。",
      "third-party-licenses.json の 3 件目 に name がありません。",
      "third-party-licenses.json の 3 件目 に version がありません。",
      "third-party-licenses.json の 3 件目 に identifier がありません。",
      "third-party-licenses.json の 3 件目 に text がありません。",
    ]);
    expect(checkThirdPartyLicenses(JSON.stringify([entry("leaflet")]), dependencies)).toEqual([
      "third-party-licenses.json に zod（package.json の dependencies）のライセンスがありません。"]);
  });
});
