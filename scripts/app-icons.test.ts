import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

// index.html links the browser icons and the web app manifest, which
// `npm run icons:build` writes into the shared public/. The dev server answers
// a missing file with its HTML page, so a lost icon would go unnoticed in the
// browser: check the files here.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const links = [...html.matchAll(/<link\s[^>]*>/gu)].map(([tag]) => ({
  rel: /\srel="([^"]+)"/u.exec(tag)?.[1],
  href: /\shref="([^"]+)"/u.exec(tag)?.[1] ?? "",
  sizes: /\ssizes="([^"]+)"/u.exec(tag)?.[1],
}));

/** The public/ file served at `href`, relative to the page (the build uses base "./"). */
function publicFile(href: string): string {
  expect(href, "links stay relative so the game also works below a sub-path").toMatch(/^\.\/[^/]/u);
  return path.join(root, "public", href.slice(2));
}

async function expectSize(file: string, sizes: string) {
  const { width, height } = await sharp(file).metadata();
  expect(`${width}x${height}`, file).toBe(sizes);
}

describe("app icons", () => {
  it("links favicons, the Apple touch icon and the manifest to existing files of their declared size", async () => {
    expect(links.map((link) => link.rel)).toEqual(["icon", "icon", "icon", "apple-touch-icon", "manifest"]);
    for (const link of links) {
      const file = publicFile(link.href);
      expect(existsSync(file), link.href).toBe(true);
      if (link.sizes) await expectSize(file, link.sizes);
    }
    // iOS shows transparent pixels as black, so the touch icon stays opaque.
    const touchIcon = publicFile(links.find((link) => link.rel === "apple-touch-icon")!.href);
    await expectSize(touchIcon, "180x180");
    expect((await sharp(touchIcon).metadata()).hasAlpha).toBe(false);
  });

  it("lists manifest icons that exist in their declared sizes", async () => {
    const manifestLink = links.find((link) => link.rel === "manifest")!;
    const manifest = JSON.parse(readFileSync(publicFile(manifestLink.href), "utf8")) as { icons: { src: string; sizes: string }[] };
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of manifest.icons) await expectSize(publicFile(`./${icon.src}`), icon.sizes);
  });
});
