import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StoryFrame } from "../story/frame-reader";
import { LineStage } from "./LineStage";

// A letter's lines with their # translation: (2026-11-15 user decision): the English as written, its Japanese under it.
describe("a letter's sheet", () => {
  const render = (letter: StoryFrame["letter"]) => renderToStaticMarkup(createElement(LineStage,
    { frame: { speaker: "narrator", letter }, names: {}, children: createElement("p", { className: "dialogue-text" }, "The third line.") }));

  it("shows each translated line, earlier and on screen, in English with its Japanese under it, and other lines as they are", () => {
    const markup = render({ kind: "card", translationJa: "三行目。", earlier: [{ text: "The first line.", translationJa: "一行目。" }, "二行目"] });
    expect(markup).toBe('<div class="letter-sheet" role="group" aria-label="カード" data-kind="card">' +
      '<div class="letter-entry" lang="en"><p class="letter-line">The first line.</p><p class="letter-translation" lang="ja">一行目。</p></div>' +
      '<p class="letter-line">二行目</p>' +
      '<div class="letter-entry" lang="en"><p class="dialogue-text">The third line.</p><p class="letter-translation" lang="ja">三行目。</p></div>' +
      "</div>");
  });

  it("keeps a sheet without translations as before", () => {
    expect(render({ kind: "note", earlier: ["一行目"] })).toBe('<div class="letter-sheet" role="group" aria-label="メモ" data-kind="note">' +
      '<p class="letter-line">一行目</p><p class="dialogue-text">The third line.</p></div>');
  });
});
