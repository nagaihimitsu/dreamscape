import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dateDestinationSchema, dateDestinationsSchema } from "../src/content/date-destinations";
import {
  balanceSchema,
  battleCatalogSchema,
  battleSchema,
  citySchema,
  dateCatalogSchema,
  dateSchema,
  effectCatalogSchema,
  effectSchema,
  presentationSchema,
  progressionSchema,
  quizSchema,
  quizSampleSchema,
  trialProgressionSchema,
} from "../src/content/schemas";
import {
  landmarkSchema,
  tourismAssetSchema,
  tourismCatalogSchema,
  tourismClueSchema,
} from "../src/content/tourism-schemas";
import {
  episodeSchema,
  journeySchema,
  rewardRuleSchema,
} from "../src/content/journey-schemas";
import {
  buildContent,
  compileInk,
  validateQuizEntries,
} from "./content-pipeline";

const schemas = {
  quiz: quizSchema,
  "quiz-sample": quizSampleSchema,
  battle: battleSchema,
  "battle-catalog": battleCatalogSchema,
  date: dateSchema,
  "date-catalog": dateCatalogSchema,
  "date-destination": dateDestinationSchema,
  "date-destinations": dateDestinationsSchema,
  effect: effectSchema,
  "effect-catalog": effectCatalogSchema,
  landmark: landmarkSchema,
  clue: tourismClueSchema,
  asset: tourismAssetSchema,
  "tourism-catalog": tourismCatalogSchema,
  episode: episodeSchema,
  reward: rewardRuleSchema,
  journey: journeySchema,
  city: citySchema,
  balance: balanceSchema,
  presentation: presentationSchema,
  progression: progressionSchema,
  "trial-progression": trialProgressionSchema,
} as const;
export type ContentType = keyof typeof schemas | "ink";

/** Infer only unambiguous production locations; drafts can explicitly specify --type. */
export function inferContentType(file: string): ContentType | undefined {
  const name = file.replaceAll("\\", "/");
  if (name.endsWith(".ink")) return "ink";
  if (/\/quizzes\/.*\.sample\.json$/.test(name)) return "quiz-sample";
  if (/\/quizzes\/.*\.json$/.test(name)) return "quiz";
  if (/\/cities\/[^/]+\.json$/.test(name)) return "city";
  const suffixes: Record<string, ContentType> = {
    "/tourism/catalog.json": "tourism-catalog",
    "/battles/catalog.json": "battle-catalog",
    "/progression/journey.json": "journey",
    "/romance/date_catalog.json": "date-catalog",
    "/romance/date_destinations.json": "date-destinations",
    "/romance/effect_catalog.json": "effect-catalog",
    "/romance/balance.json": "balance",
    "/romance/presentation.json": "presentation",
    "/romance/progression.json": "progression",
    "/romance/trial_progression.json": "trial-progression",
  };
  return Object.entries(suffixes).find(([suffix]) =>
    name.endsWith(suffix),
  )?.[1];
}

export async function inspectFile(
  file: string,
  type?: string,
): Promise<ContentType> {
  const resolved = path.resolve(file);
  const selected = type ?? inferContentType(resolved);
  if (!selected || (selected !== "ink" && !Object.hasOwn(schemas, selected))) {
    throw new Error(
      `種類を判定できません: ${file}。--type を指定してください。使用可能: ink, ${Object.keys(schemas).join(", ")}`,
    );
  }
  try {
    const raw = await readFile(resolved, "utf8");
    if (selected === "ink") compileInk(raw, resolved);
    else {
      const data: unknown = JSON.parse(raw);
      const parsed = schemas[selected as keyof typeof schemas].parse(data);
      if (selected === "quiz" || selected === "quiz-sample") {
        validateQuizEntries(
          parsed as Parameters<typeof validateQuizEntries>[0],
        );
      }
    }
    return selected as ContentType;
  } catch (error) {
    throw new Error(`検証失敗: ${file}`, { cause: error });
  }
}

export async function run(args: string[]): Promise<void> {
  if (args.length === 1 && args[0] === "--all") {
    await buildContent(process.cwd(), false);
    console.log("全コンテンツの構造と参照を検証しました（ファイル出力なし）。");
    return;
  }
  let type: string | undefined;
  if (args[0] === "--type") {
    type = args[1];
    args = args.slice(2);
    if (!type) throw new Error("--type の後に種類を指定してください。");
  }
  if (args.length !== 1)
    throw new Error(
      "使い方: npm run content:inspect -- [--type 種類] ファイル名 または --all",
    );
  const selected = await inspectFile(args[0], type);
  console.log(
    `${args[0]}: ${selected} の単体検証に成功しました。参照・Inkタグ・全文脈は --all で検証してください。`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  run(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
