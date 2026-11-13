import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ambienceCredits, MAP_CREDIT, musicCredits, OWN_ARTWORK_NOTE_JA, photoCredits, voiceCredits } from "../content/credits";
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

  it("lists the music's works under 音楽 (2026-11-12), each once with its author, licence and the scenes it is used in", () => {
    const music = musicCredits();
    expect(music.length).toBeGreaterThan(0);
    expect(new Set(music.map((credit) => credit.source.id)).size).toBe(music.length);
    const html = renderToStaticMarkup(createElement(CreditsList, { photos: [], music, licences: { status: "dev" } }));
    expect(html).toContain('<h3 id="credits-music-title">音楽</h3>');
    expect(html).toContain(`<summary>音楽の出典（${music.length}件）</summary>`);
    for (const { source, usesJa } of music) {
      expect(html).toContain(`作者：${source.author}`);
      expect(html).toContain(`使っている場面：${usesJa.join("、")}`);
    }
    expect(render({ status: "dev" })).not.toContain("credits-music");
  });

  it("lists the ambience's recordings under 環境音 (2026-11-13), each once with its author, licence and what it is used for", () => {
    const ambience = ambienceCredits();
    expect(ambience.length).toBeGreaterThan(0);
    expect(new Set(ambience.map((credit) => credit.source.id)).size).toBe(ambience.length);
    const html = renderToStaticMarkup(createElement(CreditsList, { photos: [], ambience, licences: { status: "dev" } }));
    expect(html).toContain('<h3 id="credits-ambience-title">環境音</h3>');
    expect(html).toContain(`<summary>環境音の出典（${ambience.length}件）</summary>`);
    for (const { source, usesJa } of ambience) {
      expect(html).toContain(`作者：${source.author}`);
      expect(html).toContain(`使っている音：${usesJa.join("、")}`);
    }
    expect(render({ status: "dev" })).not.toContain("credits-ambience");
  });

  it("lists the voices' source under 声 (2026-11-13), under the journey with voices, with its licence, citation and page", () => {
    const voices = voiceCredits();
    expect(voices.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(createElement(CreditsList, { photos: [], voices, licences: { status: "dev" } }));
    expect(html).toContain('<h3 id="credits-voices-title">声</h3>');
    expect(html).toContain("<p>ヒロインの声：音声合成 Irodori-TTS v4.1-Small（Aratako、MIT License）</p>");
    expect(html).toContain('<a href="https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small" target="_blank" rel="noreferrer">元の作品</a>');
    expect(html).toContain("Irodori-TTS: A Flow Matching-based Text-to-Speech Model");
    expect(render({ status: "dev" })).not.toContain("credits-voices");
  });

  it("lists each library with its version, licence and text once the production list is read", () => {
    const html = render({ status: "ready", licenses: [{ name: "zod", version: "4.0.0", identifier: "MIT", text: "MIT License text" }] });
    expect(html).toContain("<summary>zod 4.0.0（MIT）</summary><pre>MIT License text</pre>");
    expect(render({ status: "failed" })).toContain("ライブラリのライセンス一覧を読み込めませんでした。");
  });
});
