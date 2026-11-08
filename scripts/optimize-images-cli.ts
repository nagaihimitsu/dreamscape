import { parseArgs } from "node:util";
import { PHOTO_BOX, PHOTO_QUALITY } from "./image-optimization";
import { optimizeImages, type PhotoStep, type PhotoWrite } from "./optimize-images";

// npm run images:optimize [-- --journey <旅行編ID>] [--write]
// Without --write it only lists what it would do.
const skipJa = { placeholder: "仮の画像（isPlaceholder）なので変えない", sample: "見本の編の画像なので変えない",
  "sample-copy": "見本の画像のままなので変えない（実在の写真に置き換える）" } as const;
const formatJa = { jpeg: "JPEG", png: "PNG", webp: "WebP" } as const;
const size = (step: { width: number; height: number }) => `${step.width}×${step.height}`;
const bytes = (value: number) => `${value.toLocaleString("en-US")} B`;

function line(step: PhotoStep, written: PhotoWrite | undefined): string {
  const from = `${step.photo.asset.path}（${formatJa[step.format]} ${size(step)}、${bytes(step.bytes)}）`;
  switch (step.outcome.kind) {
    case "skip": return `  ${step.photo.asset.id}: ${from} … ${skipJa[step.outcome.reason]}`;
    case "keep": return `  ${step.photo.asset.id}: ${from} … そのまま`;
    case "convert": {
      const how = step.outcome.resize ? `${PHOTO_BOX.width}×${PHOTO_BOX.height}pxの枠に縮小して WebP` : "同じ大きさの WebP";
      return `  ${step.photo.asset.id}: ${from} → ${written ? `${written.path}（${size(written)}、${bytes(written.bytes)}）` : `${how}（${step.outcome.path}）`}`;
    }
  }
}

try {
  const { values } = parseArgs({ options: { journey: { type: "string" }, write: { type: "boolean", default: false } }, strict: true });
  const { steps, written } = await optimizeImages(process.cwd(), { journeyId: values.journey, write: values.write });
  console.log(`観光写真の形式と大きさ（WebP 品質${PHOTO_QUALITY}。観察で拡大する写真は同じ大きさ、ほかは${PHOTO_BOX.width}×${PHOTO_BOX.height}pxの枠に収める）${values.write ? "" : "：確認だけ（書き換えるには --write）"}`);
  for (const journeyId of new Set(steps.map((step) => step.photo.journeyId))) {
    console.log(`\n${journeyId ?? "共通"}:`);
    for (const step of steps.filter((item) => item.photo.journeyId === journeyId)) console.log(line(step, written.get(step.photo.asset.id)));
  }
  const converts = steps.filter((step) => step.outcome.kind === "convert");
  const before = converts.reduce((sum, step) => sum + step.bytes, 0);
  const after = [...written.values()].reduce((sum, item) => sum + item.bytes, 0);
  console.log(`\n${values.write ? "変換した" : "変換する"}写真 ${converts.length} 枚（そのまま ${steps.filter((step) => step.outcome.kind === "keep").length} 枚、変えない ${steps.filter((step) => step.outcome.kind === "skip").length} 枚）` +
    (values.write && converts.length ? `、${bytes(before)} → ${bytes(after)}` : ""));
  if (values.write && converts.length) console.log("カタログ（path・width・height・modificationJa）と観察資料（path・sha256）を書き換えました。npm run content:build で確かめてください。");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
