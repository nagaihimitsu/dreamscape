import { parseArgs } from "node:util";
import { displayPath } from "./content-sources";
import { PHOTO_BOX, PHOTO_QUALITY, PORTRAIT_WEBP } from "./image-optimization";
import { optimizeImages, type PhotoStep, type PhotoWrite, type PortraitStep, type PortraitWrite } from "./optimize-images";

// npm run images:optimize [-- --journey <旅行編ID>] [--write]
// Without --write it only lists what it would do. Tourism photos first, then the portraits.
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

const servedJa = { missing: "まだない", lossy: "軽い版のWebP", lossless: "可逆のWebP", other: "WebPでない" } as const;
const portraitSkipJa = { sample: "見本の編の絵なので変えない", "png-path": "PNGのパス。characters.json と own-artwork.json のパスを .webp にしてから",
  "no-original": "元の絵がないので変えない" } as const;

function portraitLine(step: PortraitStep, written: PortraitWrite | undefined): string {
  const { portrait } = step;
  const original = displayPath(process.cwd(), portrait.original);
  const from = `  ${portrait.assetPath}（${servedJa[step.served]}${step.served === "missing" ? "" : `、${bytes(step.bytes)}`}）`;
  if (step.outcome.kind === "skip") return `${from} … ${portraitSkipJa[step.outcome.reason]}${step.outcome.reason === "no-original" ? `（${original}）` : ""}`;
  if (written) return `${from} → ${written.changed ? `${bytes(written.after)}` : "変わらない"}` +
    (written.keptOriginal ? `（今の絵を元の絵として ${original} に残しました）` : "");
  const keep = step.hasOriginal ? "" : `（今の絵を元の絵として ${original} に残してから）`;
  return `${from} → 元の絵から軽い版を作る${keep}${step.served === "lossy" ? "。変わったときだけ書き換える" : ""}`;
}

try {
  const { values } = parseArgs({ options: { journey: { type: "string" }, write: { type: "boolean", default: false } }, strict: true });
  const { steps, written, portraitSteps, portraitsWritten } = await optimizeImages(process.cwd(), { journeyId: values.journey, write: values.write });
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

  console.log(`\n立ち絵（元の絵は authoring/ の可逆のPNG。配信するのは非可逆のWebP 品質${PORTRAIT_WEBP.quality}、透明度は可逆）${values.write ? "" : "：確認だけ（書き換えるには --write）"}`);
  for (const journeyId of new Set(portraitSteps.map((step) => step.portrait.journeyId))) {
    console.log(`\n${journeyId ?? "共通"}:`);
    for (const step of portraitSteps.filter((item) => item.portrait.journeyId === journeyId))
      console.log(portraitLine(step, portraitsWritten.get(step.portrait.assetPath)));
  }
  const makes = portraitSteps.filter((step) => step.outcome.kind === "make").length;
  const left = portraitSteps.length - makes;
  const changed = [...portraitsWritten.values()].filter((item) => item.changed);
  console.log(!values.write ? `\n元の絵から作る立ち絵 ${makes} 枚（変えない ${left} 枚）`
    : `\n作った立ち絵 ${makes} 枚（書き換えた ${changed.length} 枚、変わらない ${makes - changed.length} 枚、変えない ${left} 枚）` + (changed.length
      ? `、${bytes(changed.reduce((sum, item) => sum + item.before, 0))} → ${bytes(changed.reduce((sum, item) => sum + item.after, 0))}` : ""));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
