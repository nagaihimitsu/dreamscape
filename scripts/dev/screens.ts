/**
 * `npm run screens [-- --previous <earlier gallery folder>] [--config <Playwright config>]`
 *
 * Captures the key screens at 320 and 390 px (tests/screens/screens.spec.ts: real
 * flows from the title and the Debug example URLs of docs/10) into
 * artifacts/screens/, and writes artifacts/screens/index.html. With --previous, each
 * screen is marked new, changed or unchanged against that earlier gallery (byte-equal
 * images; a change below 0.1 % of the pixels is shown as slight). For people checking by
 * eye; never a gate.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { compareShots, galleryHtml, shotKey, type Shot } from "./screen-gallery";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "artifacts/screens");
const { values } = parseArgs({ options: { previous: { type: "string" }, config: { type: "string" } } });

function readShots(folder: string): Shot[] {
  const listed = path.join(folder, "shots.json");
  if (existsSync(listed)) return JSON.parse(readFileSync(listed, "utf8")) as Shot[];
  const shots = path.join(folder, "shots");
  if (!existsSync(shots)) return [];
  return readdirSync(shots, { recursive: true, encoding: "utf8" }).filter((name) => name.endsWith(".json")).sort()
    .map((name) => JSON.parse(readFileSync(path.join(shots, name), "utf8")) as Shot);
}

// Read the earlier gallery first: it may be this same folder.
const previousFolder = values.previous ? path.resolve(values.previous) : undefined;
if (previousFolder && !existsSync(previousFolder)) {
  console.error(`以前の一覧のフォルダ ${previousFolder} がありません。`);
  process.exit(1);
}
const previous = previousFolder ? readShots(previousFolder) : undefined;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const run = spawnSync("npx", ["playwright", "test", "-c", values.config ?? "playwright.screens.config.ts"], {
  cwd: root, stdio: "inherit", env: { ...process.env, SCREENS_OUT: out },
});
const shots = readShots(out).sort((left, right) => left.scene.localeCompare(right.scene) || left.width - right.width);

/** Share of pixels whose colour differs noticeably; undefined when the images cannot be compared. */
async function difference(current: string, earlier: string): Promise<number | undefined> {
  if (!existsSync(earlier)) return undefined;
  const [left, right] = await Promise.all([current, earlier].map((file) => sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (left.info.width !== right.info.width || left.info.height !== right.info.height) return 1;
  let differing = 0;
  for (let index = 0; index < left.data.length; index += 4)
    if ([0, 1, 2, 3].some((channel) => Math.abs(left.data[index + channel] - right.data[index + channel]) > 16)) differing++;
  return differing / (left.info.width * left.info.height);
}
const earlierHashes = new Map((previous ?? []).map((shot) => [shotKey(shot), shot]));
const differences = new Map<string, number>();
for (const shot of shots) {
  const before = earlierHashes.get(shotKey(shot));
  if (!before || before.sha256 === shot.sha256 || !previousFolder) continue;
  const share = await difference(path.join(out, shot.file), path.join(previousFolder, before.file));
  if (share !== undefined) differences.set(shotKey(shot), share);
}
writeFileSync(path.join(out, "shots.json"), `${JSON.stringify(shots, null, 2)}\n`);
writeFileSync(path.join(out, "index.html"), galleryHtml(compareShots(shots, previous, differences), {
  createdAt: new Date().toISOString(),
  previous: previousFolder ? path.relative(root, previousFolder) || previousFolder : undefined,
  checklist: "docs/10_DEVELOPMENT_CHECKS.md「場面ごとの確認」と UI_REVIEW_CHECKLIST.md",
}));
console.log(`画面一覧: ${path.relative(root, path.join(out, "index.html"))}（${shots.length}枚）`);
process.exit(run.status ?? 1);
