/**
 * Fails when the production build contains development-only or test-only
 * code or data (see scripts/dist-guard.ts). `npm run build` and
 * `npm run verify` run it after `vite build`.
 *
 * Usage: tsx scripts/check-dist.ts [folder]   (default: dist)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describeFindings, findDevOnlyCode, isTextAsset, type DistFile } from "./dist-guard";

const folder = process.argv[2] ?? "dist";
const root = path.resolve(folder);

if (!existsSync(path.join(root, "index.html"))) {
  console.error(`${folder}/index.html がありません。先に本番ビルド（vite build）を実行してください。`);
  process.exit(1);
}

const files: DistFile[] = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => {
    const file = path.join(entry.parentPath, entry.name);
    const relative = path.relative(root, file).split(path.sep).join("/");
    return { path: relative, text: isTextAsset(relative) ? readFileSync(file, "utf8") : null };
  });

const findings = findDevOnlyCode(files);
if (findings.length > 0) {
  console.error(describeFindings(folder, findings));
  process.exit(1);
}
console.log(`${folder} の検査: 開発・テスト専用のコードとデータは含まれていません（${files.length} ファイル）`);
