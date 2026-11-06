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

  it("gives the manifest icons transparent rounded corners and fully opaque straight edges", async () => {
    for (const size of [192, 512]) {
      const { data, info } = await sharp(path.join(root, "public", `icon-${size}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
      const last = size - 1;
      expect([alpha(0, 0), alpha(last, 0), alpha(0, last), alpha(last, last)], `icon-${size} corners`).toEqual([0, 0, 0, 0]);
      // The rounded corner (radius 20 % of the side) ends before 21 %; beyond it the outermost pixels are opaque
      // (the 256-colour palette may store a few of them as 254).
      const straight = [...Array(size).keys()].filter((offset) => offset > size * 0.21 && offset < size * 0.79);
      for (const [name, at] of [["top", (o: number) => alpha(o, 0)], ["bottom", (o: number) => alpha(o, last)],
        ["left", (o: number) => alpha(0, o)], ["right", (o: number) => alpha(last, o)]] as const)
        expect(straight.filter((offset) => at(offset) < 254), `icon-${size} ${name} edge`).toEqual([]);
    }
  });
});
