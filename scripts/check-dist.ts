/**
 * Fails when the production build contains development-only or test-only
 * code or data, or lacks the licence notices of the bundled libraries (see
 * scripts/dist-guard.ts). `npm run build` and `npm run verify` run it after
 * `vite build`.
 *
 * Usage: tsx scripts/check-dist.ts [folder]   (default: dist)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  checkThirdPartyLicenses, describeFindings, findDevOnlyCode, isTextAsset, THIRD_PARTY_LICENSES_PATH, type DistFile,
} from "./dist-guard";

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
const dependencies = Object.keys(JSON.parse(readFileSync("package.json", "utf8")).dependencies ?? {});
const licenses = files.find((file) => file.path === THIRD_PARTY_LICENSES_PATH)?.text ?? null;
const licenseProblems = checkThirdPartyLicenses(licenses, dependencies);
if (licenseProblems.length > 0) {
  console.error([`本番ビルド（${folder}）のライブラリのライセンス一覧に問題があります。`, ...licenseProblems.map((problem) => `- ${problem}`)].join("\n"));
  process.exit(1);
}
console.log(`${folder} の検査: 開発・テスト専用のコードとデータは含まれていません（${files.length} ファイル）。` +
  `ライブラリのライセンス一覧（${THIRD_PARTY_LICENSES_PATH}）に dependencies の ${dependencies.length} 件があります`);
