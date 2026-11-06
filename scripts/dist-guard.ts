/**
 * Detects development-only and test-only code in a production build.
 *
 * Debug, the asset preview, in-memory test fixtures and the test-only journeys
 * must never ship. Each marker below is text that only such code contains; a
 * built file that contains one (or whose path contains one) is reported.
 * scripts/dist-guard.test.ts checks that every marker is still found in its
 * source, so renaming the source cannot silently switch the check off.
 */

export interface DevOnlyMarker {
  /** Text that only development or test code contains. */
  text: string;
  /** Repository file or folder (ending in "/") whose path or content contains `text`. */
  source: string;
}

export const devOnlyMarkers: readonly DevOnlyMarker[] = [
  // Debug (?debug) and the asset preview (?character-preview).
  { text: "debug-panel", source: "src/dev/DebugMode.tsx" },
  { text: "Debug · 通常セーブとは別", source: "src/dev/DebugMode.tsx" },
  { text: "debug-prototype-preview", source: "src/dev/PrototypePreview.tsx" },
  { text: "preview-costume", source: "src/dev/CharacterPreview.tsx" },
  { text: "人物素材の確認", source: "src/dev/CharacterPreview.tsx" },
  { text: "仮の場面の都市なら data=fixture を付けます", source: "src/dev/debug-state.ts" },
  // Debug launch URLs, the read-only test hook and the shared scene builders.
  { text: "?debug だけで設定画面を開いてください", source: "src/dev/debug-query.ts" },
  { text: "__dreamscapeDebug", source: "src/dev/debug-hook.ts" },
  { text: "到着の会話を完了できませんでした", source: "src/dev/scenario-builders.ts" },
  { text: "を結果まで進められませんでした", source: "src/dev/scenario-builders.ts" },
  { text: "制作中の都市ではありません", source: "src/dev/prototype-preview-state.ts" },
  // In-memory fixtures shared by unit tests and Debug.
  { text: "仮の場面の元になる都市データがありません", source: "src/domain/multi-city-test-fixture.ts" },
  { text: "test_golden_triangle", source: "src/domain/golden-triangle-test-fixture.ts" },
  // The journey for development and tests only (npm run dev:sample, unit tests);
  // its ID also names its image folder.
  { text: "sample_trip", source: "authoring/templates/sample_trip/manifest.json" },
  // Source paths, as written by source maps and the development JSX transform.
  // (tests/fixtures/current-game.ts has no text of its own: it calls the scene
  // builders, whose markers above would show up with it.)
  { text: "src/dev/", source: "src/dev/" },
  { text: "test-fixture", source: "src/domain/multi-city-test-fixture.ts" },
  { text: "tests/fixtures/", source: "tests/fixtures/" },
];

export interface DistFile {
  /** Path inside the build folder, with forward slashes. */
  path: string;
  /** The file's text, or null for a binary file (only its path is checked). */
  text: string | null;
}

export interface DevOnlyFinding {
  path: string;
  where: "path" | "content";
  marker: DevOnlyMarker;
}

const textExtensions = new Set([
  ".js", ".mjs", ".cjs", ".css", ".html", ".json", ".webmanifest", ".map", ".svg", ".txt", ".xml",
]);

/** Whether a built file is text whose content should be searched. */
export function isTextAsset(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") && textExtensions.has(path.slice(dot).toLowerCase());
}

/** Every marker found in the paths or text of the built files. */
export function findDevOnlyCode(
  files: Iterable<DistFile>,
  markers: readonly DevOnlyMarker[] = devOnlyMarkers,
): DevOnlyFinding[] {
  const findings: DevOnlyFinding[] = [];
  for (const file of files) {
    for (const marker of markers) {
      if (file.path.includes(marker.text)) findings.push({ path: file.path, where: "path", marker });
      else if (file.text?.includes(marker.text)) findings.push({ path: file.path, where: "content", marker });
    }
  }
  return findings;
}

/** A report of the findings for the person who ran the build. */
export function describeFindings(folder: string, findings: readonly DevOnlyFinding[]): string {
  const lines = findings.map(({ path, where, marker }) =>
    `- ${path} の${where === "path" ? "ファイル名" : "内容"}に「${marker.text}」（目印の由来: ${marker.source}）`);
  return [
    `本番ビルド（${folder}）に開発・テスト専用のコードまたはデータが含まれています。`,
    ...lines,
    "Debug・プレビュー・テスト用のモジュールを import.meta.env.DEV の分岐の外から読み込んでいないか、",
    "生成物（src/content/generated）にテスト用・見本の旅行編が入っていないかを確認してください。",
    "生成物が原因の場合は `npm run content:build` で生成し直してからビルドします。",
  ].join("\n");
}
