import { z } from "zod";

/**
 * Text fields and the language they are meant to hold (decision 32 of the unified event design).
 * The schemas check only the form (a non-empty text without surrounding spaces) and mark the
 * field; content:build reads the marks (scripts/data-language.ts) and warns, without stopping,
 * when a Japanese field has no Japanese or a quiz's English field is not English: the screens
 * show the text as it is, so play and saves never break. Light module (zod only).
 */
export type FieldLanguage = "ja" | "en";
const text = z.string().trim().min(1);
/** A field shown as Japanese text (the `…Ja` fields). */
export const japaneseText = text.meta({ language: "ja" satisfies FieldLanguage });
/** A quiz's English field (question and options, the English notes' English). */
export const englishText = text.meta({ language: "en" satisfies FieldLanguage });

const japaneseScript = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
/** Japanese: at least one hiragana, katakana or kanji. */
export const hasJapanese = (value: string) => japaneseScript.test(value);
/** English: some Latin letter and no hiragana, katakana or kanji. */
export const isEnglish = (value: string) => /[A-Za-z]/u.test(value) && !hasJapanese(value);
/** Whether a value is in the language a field is marked with. */
export const inLanguage = (value: string, language: FieldLanguage) => (language === "ja" ? hasJapanese(value) : isEnglish(value));
