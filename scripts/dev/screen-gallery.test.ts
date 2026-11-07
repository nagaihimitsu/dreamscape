import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareShots, debugExampleUrls, galleryHtml, type Shot } from "./screen-gallery";

const shot = (scene: string, width: number, sha256: string): Shot => ({
  scene, titleJa: `場面${scene}`, route: { kind: "flow", descriptionJa: "タイトルから" }, width, file: `shots/${width}/${scene}.png`, sha256,
});

describe("screen gallery", () => {
  it("marks each width of a scene as new, changed or the same as in an earlier gallery", () => {
    const current = [shot("title", 320, "a"), shot("title", 390, "b"), shot("menu", 320, "c")];
    expect(compareShots(current, [shot("title", 320, "a"), shot("title", 390, "x")]).map((item) => item.change))
      .toEqual(["same", "changed", "new"]);
    expect(compareShots(current).map((item) => item.change)).toEqual([undefined, undefined, undefined]);
  });

  it("calls a change slight only when its measured share of differing pixels is below 0.1 %", () => {
    const current = [shot("a", 320, "1"), shot("b", 320, "2"), shot("c", 320, "3")];
    const previous = [shot("a", 320, "x"), shot("b", 320, "y"), shot("c", 320, "z")];
    const compared = compareShots(current, previous, new Map([["a@320", 0.0003], ["b@320", 0.02]]));
    expect(compared.map((item) => [item.change, item.difference])).toEqual([["slight", 0.0003], ["changed", 0.02], ["changed", undefined]]);
    const html = galleryHtml(compared, { createdAt: "t", previous: "p", checklist: "c" });
    expect(html).toContain("から変わった場面: 2件");
    expect(html).toContain("ごく小さな差だけの場面（線の点の位置など。念のため確認）: 1件");
    expect(html).toContain('<span class="mark slight">ごく小さな差（0.03%）</span>');
    expect(html).toContain('<span class="mark changed">変更あり（2.00%）</span>');
  });

  it("lists the changed scenes first and shows each scene's widths with their marks", () => {
    const html = galleryHtml(compareShots([shot("title", 320, "a"), shot("title", 390, "b"), shot("menu", 320, "c")],
      [shot("title", 320, "a"), shot("title", 390, "b"), shot("menu", 320, "old")]), { createdAt: "2026-11-07", previous: "old-gallery", checklist: "docs/10" });
    expect(html).toContain("から変わった場面: 1件");
    expect(html).toContain('<li><a href="#menu">場面menu</a></li>');
    expect(html).toContain('<span class="mark changed">変更あり</span>');
    expect(html.match(/<span class="mark same">変更なし<\/span>/g)).toHaveLength(2);
    expect(html.indexOf("<figcaption>320px")).toBeLessThan(html.indexOf("<figcaption>390px"));
  });

  it("says when nothing was compared or nothing changed, and escapes text", () => {
    const debug: Shot = { ...shot("x", 320, "a"), titleJa: "<b>名</b>", route: { kind: "debug", url: "?debug&city=a&scene=b" } };
    const plain = galleryHtml([debug], { createdAt: "t", checklist: "c" });
    expect(plain).toContain("以前の一覧と比べていません");
    expect(plain).toContain("&#60;b&#62;名&#60;/b&#62;");
    expect(plain).toContain("<code>?debug&#38;city=a&#38;scene=b</code>");
    expect(galleryHtml(compareShots([debug], [debug]), { createdAt: "t", previous: "p", checklist: "c" })).toContain("からの変更はありません");
  });

  it("reads the Debug example URLs of docs/10 that the normal development server opens", () => {
    const urls = debugExampleUrls(readFileSync("docs/10_DEVELOPMENT_CHECKS.md", "utf8"));
    expect(urls.length).toBeGreaterThan(5);
    for (const { titleJa, url } of urls) {
      expect(url).toMatch(/^\?debug&/);
      expect(titleJa).not.toContain("dev:sample");
    }
    expect(() => debugExampleUrls("# なし")).toThrow("docs/10 の「### URLの例」が見つかりません。");
  });
});
