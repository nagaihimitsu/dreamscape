import type { z } from "zod";
import { inLanguage, type FieldLanguage } from "../src/content/text-language";
import type { ContentWarning } from "./content-report";

// The content:build warning `data-language` (decision 32 of the unified event design): a data
// field marked Japanese (the `…Ja` fields) without Japanese, or a quiz's English field that is
// not English. Nothing stops: the screens show the text as it is. The fields are the ones the
// schemas mark (src/content/text-language.ts), found by walking a value with its schema, so the
// list of fields lives only in the schemas. Light module.

type Schema = z.core.$ZodType;
type Found = { path: string; value: string; language: FieldLanguage };

const languageOf = (schema: Schema): FieldLanguage | undefined => {
  const meta = (schema as { meta?: () => unknown }).meta?.() as { language?: unknown } | undefined;
  return meta?.language === "ja" || meta?.language === "en" ? meta.language : undefined;
};
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const join = (path: string, key: string | number) => (typeof key === "number" ? `${path}[${key}]` : path ? `${path}.${key}` : key);

/** Every marked text field of `value` read by `schema` whose text is not in the field's language. */
export function misplacedLanguages(schema: Schema, value: unknown, path = ""): Found[] {
  const language = languageOf(schema);
  if (language) return typeof value === "string" && !inLanguage(value, language) ? [{ path, value, language }] : [];
  const def = schema._zod.def as unknown as Record<string, unknown> & { type: string };
  switch (def.type) {
    case "object": {
      if (!isObject(value)) return [];
      const shape = def.shape as Record<string, Schema>;
      return Object.entries(shape).flatMap(([key, child]) => (key in value ? misplacedLanguages(child, value[key], join(path, key)) : []));
    }
    case "array":
      return Array.isArray(value) ? value.flatMap((item, index) => misplacedLanguages(def.element as Schema, item, join(path, index))) : [];
    case "record":
      return isObject(value) ? Object.entries(value).flatMap(([key, item]) => misplacedLanguages(def.valueType as Schema, item, join(path, key))) : [];
    case "tuple":
      return Array.isArray(value) ? (def.items as Schema[]).flatMap((item, index) => misplacedLanguages(item, value[index], join(path, index))) : [];
    case "optional": case "nullable": case "default": case "prefault": case "readonly": case "nonoptional": case "catch":
      return value === undefined || value === null ? [] : misplacedLanguages(def.innerType as Schema, value, path);
    case "pipe":
      return misplacedLanguages(def.in as Schema, value, path);
    case "lazy":
      return misplacedLanguages((def.getter as () => Schema)(), value, path);
    case "intersection":
      return [...misplacedLanguages(def.left as Schema, value, path), ...misplacedLanguages(def.right as Schema, value, path)];
    case "union": {
      // The first option that accepts the value is the one it was read with.
      const option = (def.options as Schema[]).find((item) => (item as unknown as z.ZodType).safeParse(value).success);
      return option ? misplacedLanguages(option, value, path) : [];
    }
    default:
      return [];
  }
}

const start = (value: string) => (Array.from(value).length > 20 ? `${Array.from(value).slice(0, 20).join("")}…` : value);

/** The `data-language` warnings of one file (or catalog) read by `schema`. */
export function dataLanguageWarnings(schema: Schema, value: unknown, file: string | ((path: string) => string)): ContentWarning[] {
  return misplacedLanguages(schema, value).map(({ path, value: text, language }) => {
    const where = `${typeof file === "string" ? file : file(path)} の ${path}「${start(text)}」`;
    return { kind: "data-language", message: language === "ja"
      ? `日本語の欄に日本語がありません：${where}。画面はこの欄を日本語の文として出します（止めません）。`
      : `クイズの英語の欄が英文になっていません：${where}。クイズの画面と英語ノートは、この欄を英文として扱います（止めません）。` };
  });
}

/** The `data-language` warning of an encounter choice's `# translation:` without Japanese. */
export function translationLanguageWarning(storyId: string, choiceText: string, translation: string): ContentWarning | undefined {
  return inLanguage(translation, "ja") ? undefined : { kind: "data-language",
    message: `\`# translation:\` に日本語がありません：${storyId} の選択肢「${start(choiceText)}」。選択肢の訳として、そのまま出ます（止めません）。` };
}
