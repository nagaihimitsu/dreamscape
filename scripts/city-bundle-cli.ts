import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyCityBundle, compactCityBundle, exportEditableCityBundle, newCityBundle } from "./city-bundle";

const [command, ...args] = process.argv.slice(2);
const usage = "使い方: city-bundle export|new <都市ID> <編集ファイル> / check|apply <編集ファイル>";
if ((command === "export" || command === "new") && args.length === 2) {
  const [id, filename] = args;
  const target = path.resolve(filename);
  const root = process.cwd();
  for (const directory of ["content", "public"]) {
    const relative = path.relative(path.join(root, directory), target);
    if (!relative.startsWith("..") && !path.isAbsolute(relative)) throw new Error("編集ファイルは content/ と public/ の外に保存してください。");
  }
  const bundle = command === "export" ? exportEditableCityBundle(root, id) : compactCityBundle(newCityBundle(root, id));
  writeFileSync(target, `${JSON.stringify(bundle, null, 2)}\n`, { flag: "wx" });
  console.log(`${command === "export" ? "編集用ファイルを作成しました" : "未入力の新都市テンプレートを作成しました"}: ${filename}`);
} else if ((command === "check" || command === "apply") && args.length === 1) {
  const bundle = JSON.parse(readFileSync(args[0], "utf8"));
  const result = await applyCityBundle(process.cwd(), bundle, command === "apply");
  console.log(`${command === "apply" ? "検証して反映しました" : "検証しました（ファイルは変更していません）"}: ${result.changedFiles.length} ファイル`);
  for (const file of result.changedFiles) console.log(`  ${file}`);
} else throw new Error(usage);
