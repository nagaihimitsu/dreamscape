/**
 * The web fonts of the page for 「オフラインで遊ぶ」 (user decision 2026-11-17: everything is kept, the fonts too, as far
 * as the browser lets the page copy them). index.html names their stylesheet (Google Fonts); the stylesheet names the
 * font files. The page copies both into the store under their own addresses, after a journey's files and never in
 * its way: a device without them shows its own fonts while offline.
 */
import { FONT_FILE_ORIGIN, FONT_STYLESHEET_ORIGIN } from "../sw/offline-rules";

/** The address of the fonts' stylesheet the page links (index.html is the one place that names it), or null. */
export function fontStylesheetUrl(page: Pick<Document, "querySelector">): string | null {
  return page.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href^="${FONT_STYLESHEET_ORIGIN}/"]`)?.href ?? null;
}

/** The font files a stylesheet names (each once, in its order): the `url(…)` of its rules on the font files' host. */
export function fontFileUrls(cssText: string): string[] {
  const urls = new Set<string>();
  for (const match of cssText.matchAll(/url\(\s*(["']?)([^"')\s]+)\1\s*\)/gu)) {
    if (match[2].startsWith(`${FONT_FILE_ORIGIN}/`)) urls.add(match[2]);
  }
  return [...urls];
}

/** Whether a store key is one of the kept fonts (their stylesheet or a font file), which are stored under their own addresses. */
export function isFontKey(key: string): boolean {
  return key.startsWith(`${FONT_STYLESHEET_ORIGIN}/`) || key.startsWith(`${FONT_FILE_ORIGIN}/`);
}
