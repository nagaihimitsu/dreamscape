import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MAP_CREDIT, OWN_ARTWORK_NOTE_JA, photoCredits } from "../content/credits";
import { CreditsList } from "./CreditsDialog";

// 「出典・権利の一覧」 over the generated content: every journey's photos (preparing ones marked),
// the map, the fonts, the note on own artwork, and the library list only where the build has one.
describe("credits list", () => {
  const photos = photoCredits();
  const render = (licences: Parameters<typeof CreditsList>[0]["licences"]) =>
    renderToStaticMarkup(createElement(CreditsList, { photos, licences }));

  it("lists every served photo under its journey, with the Commons file name as the source link", () => {
    const html = render({ status: "dev" });
    for (const journey of photos) expect(html).toContain(`<summary>${journey.headingJa}</summary>`);
    const count = photos.reduce((sum, journey) => sum + journey.count, 0);
    expect(html.match(/class="credits-place"/gu)).toHaveLength(count);
    // A Commons photo's link names its file; the sample journey's made-up source has no file name.
    expect(html.match(/>元の画像(：[^<]+)?<\/a>/gu)).toHaveLength(count);
    expect(html).toContain(">元の画像：20110724 Milan Cathedral 5260.jpg</a>");
    expect(photos.some((journey) => journey.preparing && journey.headingJa.includes("準備中"))).toBe(true);
  });

  it("shows the map and font lines and the own-artwork note, and on the dev server says where the library list appears", () => {
    const html = render({ status: "dev" });
    expect(html).toContain(MAP_CREDIT.textJa);
    expect(html).toContain("Noto Sans JP");
    expect(html).toContain(OWN_ARTWORK_NOTE_JA);
    expect(html).toContain("公開版（本番ビルド）では、ここに一覧が出ます。");
    expect(html).not.toContain('data-testid="credits-licences"');
  });

  it("lists each library with its version, licence and text once the production list is read", () => {
    const html = render({ status: "ready", licenses: [{ name: "zod", version: "4.0.0", identifier: "MIT", text: "MIT License text" }] });
    expect(html).toContain("<summary>zod 4.0.0（MIT）</summary><pre>MIT License text</pre>");
    expect(render({ status: "failed" })).toContain("ライブラリのライセンス一覧を読み込めませんでした。");
  });
});
