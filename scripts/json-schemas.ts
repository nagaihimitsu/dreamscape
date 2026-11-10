import { z } from "zod";
import * as content from "../src/content/schemas";
import { characterCatalogSchema } from "../src/content/character-assets";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { dialogueExpressionCatalogSchema } from "../src/content/dialogue-expressions";
import { dialogueReactionCatalogSchema } from "../src/content/dialogue-reactions";
import { encounterEntryRulesSchema } from "../src/content/encounter-entry-rules";
import { encounterCatalogInputSchema } from "../src/content/encounter-schemas";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { journeySchema } from "../src/content/journey-schemas";
import { learningDetailsSchema } from "../src/content/learning-details";
import { learningCatalogSchema } from "../src/content/learning-schema";
import { ownArtworkCatalogSchema } from "../src/content/own-artwork-schema";
import { reasoningIntroCatalogSchema } from "../src/content/reasoning-intros";
import { sceneDataCatalogSchema, storyStateCatalogSchema } from "../src/content/scene-schemas";
import { tourSchema } from "../src/content/tour-schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { wordMeaningsSchema } from "../src/content/word-meanings";
import { CORE_LAYER_KINDS, catalogRule, type FieldTable, type MergedKind } from "./content-layout";
import { journeyAuthoringSchema } from "./journey-authoring";
import { transitLedgerSchema } from "./transit-ledger";

// Editor help for the JSON files authors write: JSON Schema files generated from the same zod schemas
// content:build uses (npm run schemas:build writes them to authoring/schemas/ and maps them to the files
// in .vscode/settings.json). They give completion, types and typos in the editor only; content:build
// stays the check (references, IDs, the rules a schema file cannot say).

/** The folder of the generated schema files and the editor settings that map them to the content files. */
export const SCHEMA_DIRECTORY = "authoring/schemas";
export const EDITOR_SETTINGS_FILE = ".vscode/settings.json";

/** A journey folder's manifest.json: its journey entry plus the keys of the manifest itself. */
const journeyEntrySchema = journeyCatalogSchema.shape.journeys.element;
export const journeyManifestSchema = z.object({
  schemaVersion: z.literal(1),
  /** The journeys' order on the title screen (unique integers). */
  order: z.number().int(),
  ...journeyEntrySchema.shape,
  authoring: journeyAuthoringSchema.optional(),
}).strict();
/** The key order of every manifest (the schema's): the tools and journey:new keep it, so manifests read alike. */
export const MANIFEST_KEY_ORDER: readonly string[] = Object.keys(journeyManifestSchema.shape);

/** Where a kind of file lives: below every content layer (the core `content/`, each journey folder and the sample journey). */
type Target = { file: string; titleJa: string; schema: z.ZodType; patterns: string[]; exclude?: string[];
  /** A catalog merged from layers: its merge table (a layer's file may leave out the keys it lists). */
  fragment?: FieldTable };
const layers = ["content", "content/journeys/*", "authoring/templates/*"];
const inLayers = (relative: string) => layers.map((layer) => `/${layer}/${relative}`);
const inJourneys = (relative: string) => layers.slice(1).map((layer) => `/${layer}/${relative}`);

/** The catalogs merged from layers, by file (CATALOG_RULES). A layer's file may leave out keys, so no top-level key is required. */
export const CATALOG_SCHEMAS: Record<MergedKind, { titleJa: string; schema: z.ZodType }> = {
  "battles/catalog.json": { titleJa: "対決のカタログ", schema: content.battleCatalogSchema },
  "encounters/catalog.json": { titleJa: "道中交流と品物のカタログ", schema: encounterCatalogInputSchema },
  "encounters/entry-rules.json": { titleJa: "道中交流が起きる決まり", schema: encounterEntryRulesSchema },
  "learning/details.json": { titleJa: "クイズの解説", schema: learningDetailsSchema },
  "learning/translations.json": { titleJa: "クイズの和訳", schema: learningCatalogSchema },
  "learning/word-meanings.json": { titleJa: "語彙の意味", schema: wordMeaningsSchema },
  "presentation/characters.json": { titleJa: "登場人物と衣装", schema: characterCatalogSchema },
  "presentation/dialogue-expressions.json": { titleJa: "台詞の表情", schema: dialogueExpressionCatalogSchema },
  "presentation/dialogue-reactions.json": { titleJa: "台詞の反応", schema: dialogueReactionCatalogSchema },
  "presentation/own-artwork.json": { titleJa: "Dreamscape のために作った絵", schema: ownArtworkCatalogSchema },
  "presentation/reasoning-intros.json": { titleJa: "特殊戦の導入", schema: reasoningIntroCatalogSchema },
  "progression/journey.json": { titleJa: "本筋の回・特殊戦・報酬", schema: journeySchema },
  "progression/story.json": { titleJa: "物語の状態（フラグ・人物・名前つきの条件）", schema: storyStateCatalogSchema },
  "romance/balance.json": { titleJa: "恋愛の釣り合い", schema: content.balanceSchema },
  "romance/date_catalog.json": { titleJa: "デートのカタログ", schema: content.dateCatalogSchema },
  "romance/date_destinations.json": { titleJa: "デートの行き先", schema: dateDestinationsSchema },
  "romance/effect_catalog.json": { titleJa: "デートの効果", schema: content.effectCatalogSchema },
  "romance/presentation.json": { titleJa: "背景と思い出", schema: content.presentationSchema },
  "romance/progression.json": { titleJa: "恋愛の段階", schema: content.progressionSchema },
  "romance/response_profiles.json": { titleJa: "言葉の特性", schema: content.responseProfileCatalogSchema },
  "scenes/catalog.json": { titleJa: "場面のデータ", schema: sceneDataCatalogSchema },
  "tourism/catalog.json": { titleJa: "観光地・手がかり・画像", schema: tourismCatalogSchema },
};

export const SCHEMA_TARGETS: readonly Target[] = [
  { file: "manifest", titleJa: "旅行編の登録（manifest.json）", schema: journeyManifestSchema, patterns: inJourneys("manifest.json") },
  { file: "city", titleJa: "都市（cities/<都市ID>.json）", schema: content.citySchema, patterns: inJourneys("cities/*.json") },
  { file: "travel", titleJa: "都市の地点・経路・出来事（travel/<都市ID>.json）", schema: travelCatalogSchema, patterns: inJourneys("travel/*.json"),
    exclude: [...inJourneys("travel/*-settings.json"), ...inJourneys("travel/*-transit.json")] },
  { file: "travel-settings", titleJa: "都市の旅行設定（travel/<都市ID>-settings.json）", schema: travelSettingsSchema, patterns: inJourneys("travel/*-settings.json") },
  { file: "transit-ledger", titleJa: "交通判断台帳（travel/<都市ID>-transit.json）", schema: transitLedgerSchema, patterns: inJourneys("travel/*-transit.json") },
  // A quiz may sit in a folder below quizzes/ (content-layout.ts; docs/02 `quizzes/**/*.json`).
  { file: "quiz", titleJa: "クイズ（quizzes/**/*.json）", schema: content.quizSchema, patterns: inJourneys("quizzes/**/*.json"),
    exclude: inJourneys("quizzes/**/*.example.json") },
  { file: "quiz-example", titleJa: "例のクイズ（quizzes/**/*.example.json）", schema: content.quizExampleSchema, patterns: inJourneys("quizzes/**/*.example.json") },
  { file: "tour", titleJa: "ツアー（tours/<ツアーID>.json）", schema: tourSchema, patterns: inJourneys("tours/*.json") },
  ...Object.entries(CATALOG_SCHEMAS).map(([kind, { titleJa, schema }]) => ({
    file: kind.replace(".json", "").replace("/", "-"), titleJa: `${titleJa}（${kind}）`, schema,
    patterns: CORE_LAYER_KINDS.has(kind as MergedKind) ? inLayers(kind) : inJourneys(kind), fragment: catalogFields(kind as MergedKind) })),
];

/** The merge table of a catalog kind (CATALOG_RULES): which keys, at every depth, a layer's file may leave out. */
function catalogFields(kind: MergedKind): FieldTable {
  const rule = catalogRule(kind);
  return "fields" in rule ? rule.fields : {};
}

/**
 * A layer's catalog file holds its part of the merged catalog: no key the merge table lists is required, at the top
 * and inside every nested key (e.g. a journey's characters.json writes only `wardrobe.cities`).
 */
function withoutMergedRequired(schema: Record<string, unknown>, fields: FieldTable): Record<string, unknown> {
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "required").map(([key, value]) => [key, key !== "properties" ? value
    : Object.fromEntries(Object.entries(value as Record<string, Record<string, unknown>>).map(([name, property]) => {
      const rule = fields[name];
      return [name, rule?.mode === "nested" ? withoutMergedRequired(property, rule.fields) : property];
    }))]));
}

/** The JSON Schema of a target: zod's input form; conditions and other custom parts accept any value. */
function jsonSchemaOf(target: Target): Record<string, unknown> {
  const generated = z.toJSONSchema(target.schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  // A catalog of a layer may leave out the keys the merge table lists (the merged catalog has them all; content:build checks it).
  const { $schema, required, ...body } = target.fragment ? withoutMergedRequired(generated, target.fragment) : generated;
  return { $schema, title: `Dreamscape: ${target.titleJa}`,
    $comment: "npm run schemas:build が zod のスキーマから作ります。手で直さないでください。入力の補助だけで、検査は npm run content:build です。",
    ...body, ...(required === undefined ? {} : { required }) };
}

const text = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * The editor settings' current text as an object (its other settings stay when schemas:build writes `json.schemas`).
 * VS Code accepts comments there, but schemas:build writes the file as plain JSON: a comment stops it with this message.
 */
export function readEditorSettings(content: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(content);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    throw new Error("JSON のオブジェクトではありません");
  } catch (error) {
    throw new Error(`${EDITOR_SETTINGS_FILE} を JSON として読めません（コメントや末尾のカンマは書けません。npm run schemas:build がこのファイルを書き直すため）: ` +
      `${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Every generated file (root-relative path → text): the schema files and the editor settings' `json.schemas`. */
export function generatedSchemaFiles(currentSettings: Record<string, unknown> = {}): Map<string, string> {
  const files = new Map<string, string>();
  for (const target of SCHEMA_TARGETS) files.set(`${SCHEMA_DIRECTORY}/${target.file}.schema.json`, text(jsonSchemaOf(target)));
  const schemas = SCHEMA_TARGETS.map((target) => ({ fileMatch: [...target.patterns, ...(target.exclude ?? []).map((pattern) => `!${pattern}`)],
    url: `./${SCHEMA_DIRECTORY}/${target.file}.schema.json` }));
  files.set(EDITOR_SETTINGS_FILE, text({ ...currentSettings, "json.schemas": schemas }));
  return files;
}

/**
 * The targets whose patterns match a root-relative path, as the editor reads them: `*` within one folder,
 * and a file matches when one pattern does and none of its exclusions (patterns starting with `!`).
 */
export function matchingTargets(relative: string): Target[] {
  // `**/` is any number of folders (also none); `*` stays within one.
  const regex = (pattern: string) => new RegExp(`^${pattern.split("**/").map((part) => part.split("*")
    .map((piece) => piece.replace(/[.+?^${}()|[\]\\]/gu, "\\$&")).join("[^/]*")).join("(?:[^/]+/)*")}$`, "u");
  const file = `/${relative}`;
  return SCHEMA_TARGETS.filter((target) => target.patterns.some((pattern) => regex(pattern).test(file)) &&
    !(target.exclude ?? []).some((pattern) => regex(pattern).test(file)));
}

/** A manifest's keys that break the canonical order (MANIFEST_KEY_ORDER), or are not in it. */
export function manifestKeyOrderProblems(manifest: Record<string, unknown>): string[] {
  const positions = Object.keys(manifest).map((key) => MANIFEST_KEY_ORDER.indexOf(key));
  return Object.keys(manifest).filter((key, index) => positions[index] < 0 || (index > 0 && positions[index] < positions[index - 1]));
}
