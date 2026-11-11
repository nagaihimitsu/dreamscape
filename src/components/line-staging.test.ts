import { describe, expect, it } from "vitest";
import { lineSpeed, phoneBubbles, QUIET_TEXT_SLOWDOWN, showsSpeakerPlate } from "./line-staging";

// How the dialogue screens show the scene tags (2026-11-11 user decision).
describe("the line staging", () => {
  it("writes a quiet line a little slower, and leaves 一括表示 and 高速送り (no speed) as they are", () => {
    expect(lineSpeed(40, {})).toBe(40);
    expect(lineSpeed(40, null)).toBe(40);
    expect(lineSpeed(40, { quiet: "line" })).toBe(Math.round(40 * QUIET_TEXT_SLOWDOWN));
    expect(lineSpeed(40, { quiet: "scene" })).toBe(52);
    expect(lineSpeed(0, { quiet: "scene" })).toBe(0);
  });

  it("hides the speaker's plate for a phone message and a letter only", () => {
    expect(showsSpeakerPlate({})).toBe(true);
    expect(showsSpeakerPlate(undefined)).toBe(true);
    expect(showsSpeakerPlate({ phone: { side: "received" } })).toBe(false);
    expect(showsSpeakerPlate({ letter: { kind: "note" } })).toBe(false);
  });

  it("names the sender above the first received message of a run, says who wrote every other one, and keeps the order", () => {
    const names = { heroine: "ミオ", player: "ユウ" };
    const { earlier, current } = phoneBubbles({ side: "received", earlier: [
      { side: "received", speaker: "heroine", text: "起きてる？" },
      { side: "received", speaker: "heroine", text: "窓の外、見て。" },
      { side: "sent", speaker: "player", text: "起きてるよ。" },
      { side: "received", speaker: "narrator", text: "（知らない番号）" },
    ] }, "heroine", names);
    expect(earlier).toEqual([
      { key: "0", side: "received", name: "ミオ", text: "起きてる？" },
      { key: "1", side: "received", sender: "ミオ", text: "窓の外、見て。" },
      { key: "2", side: "sent", sender: "ユウ", text: "起きてるよ。" },
      // The narration has no name: none shows.
      { key: "3", side: "received", text: "（知らない番号）" },
    ]);
    // The line on screen has no text here (its DialogueText writes it); a new run of hers shows her name again.
    expect(current).toEqual({ key: "4", side: "received", name: "ミオ" });
    expect(phoneBubbles({ side: "sent" }, "player", names)).toEqual({ earlier: [], current: { key: "0", side: "sent", sender: "ユウ" } });
  });
});
