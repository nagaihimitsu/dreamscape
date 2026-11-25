import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { compileInk } from "../../scripts/ink-validation";
import { readStoryFrame, stageFrame, STACK_MAX, type StoryFrame } from "./frame-reader";
import { storyFrameSchema } from "./runtime";

// An album image's ID is its file name (public/assets/album/3pm_tower.webp): it may start with a digit, and the saved frame keeps it.
const context = { effectIds: [], backgroundIds: ["street"], emotionIds: ["neutral"], photoIds: ["3pm_tower"] };

const script = `VAR player_name = ""
VAR heroine_name = ""
# speaker: narrator
# quiet: scene
# stand: apart
夜の部屋で、スマホが光った。
# speaker: heroine
# phone: received
起きてる？
# speaker: player
# phone: sent
起きてるよ。
# speaker: heroine
# phone: received
# recall: 3pm_tower
今日の写真、見て。
* [Nice. # translation: いいね。]
* [Again.]
-
# speaker: player
# phone: sent
きれいだね。
# speaker: narrator
# stand: close
画面を閉じると、時計塔の鐘が聞こえた。
# letter: note
一行目
# letter: note
二行目
# letter: card
カード
-> END
`;

/** Every frame of the script read as the game reads it (the first choice at each choice), each saved and loaded again. */
function readAll(): StoryFrame[] {
  const story = new Story(compileInk(script));
  const frames: StoryFrame[] = [];
  let previous: StoryFrame | undefined;
  let choiceTags: readonly string[] = [];
  for (let step = 0; step < 20; step++) {
    const { frame } = readStoryFrame(story, context, previous, choiceTags);
    frames.push(storyFrameSchema.parse(JSON.parse(JSON.stringify(frame))));
    previous = frame;
    if (frame.ended) break;
    choiceTags = [];
    if (frame.choices.length) {
      choiceTags = story.currentChoices[0].tags ?? [];
      story.ChooseChoiceIndex(0);
    }
  }
  return frames;
}

describe("the scene tags on the frames of a scene", () => {
  it("stack an unbroken run of phone lines, keep the quiet scene and the heroine's place, and show a recall on its line only", () => {
    const frames = readAll();
    expect(frames.map((frame) => frame.text)).toEqual([
      "夜の部屋で、スマホが光った。", "起きてる？", "起きてるよ。", "今日の写真、見て。", "きれいだね。", "画面を閉じると、時計塔の鐘が聞こえた。", "一行目", "二行目", "カード",
    ]);
    // # quiet: scene from the first line to the scene's end; # stand: until the next one.
    expect(frames.map((frame) => frame.quiet)).toEqual(Array(9).fill("scene"));
    expect(frames.map((frame) => frame.stand)).toEqual(["apart", "apart", "apart", "apart", "apart", "close", "close", "close", "close"]);
    expect(frames.map((frame) => frame.recall)).toEqual([undefined, undefined, undefined, "3pm_tower", undefined, undefined, undefined, undefined, undefined]);
    expect(frames[0]).not.toHaveProperty("phone");
    expect(frames[1].phone).toEqual({ side: "received" });
    expect(frames[2].phone).toEqual({ side: "sent", earlier: [{ side: "received", speaker: "heroine", text: "起きてる？" }] });
    // The choice between two phone lines does not break the run.
    expect(frames[4].phone).toEqual({ side: "sent", earlier: [
      { side: "received", speaker: "heroine", text: "起きてる？" },
      { side: "sent", speaker: "player", text: "起きてるよ。" },
      { side: "received", speaker: "heroine", text: "今日の写真、見て。" },
    ] });
    // A line without # phone: ends it.
    expect(frames[5]).not.toHaveProperty("phone");
    // Lines on the same kind of paper go on one sheet; another kind starts a new one.
    expect(frames[6].letter).toEqual({ kind: "note" });
    expect(frames[7].letter).toEqual({ kind: "note", earlier: ["一行目"] });
    expect(frames[8].letter).toEqual({ kind: "card" });
  });
});

describe("stageFrame", () => {
  const line = (staging: Partial<StoryFrame>) => ({ speaker: "heroine" as const, text: "前の行", ...staging });

  it("lights a line's own # quiet: line only, and keeps a quiet scene to its end whatever the line says", () => {
    expect(stageFrame({ quiet: "line" }, undefined, true)).toEqual({ quiet: "line" });
    expect(stageFrame({}, line({ quiet: "line" }), true)).toEqual({});
    expect(stageFrame({ quiet: "line" }, line({ quiet: "scene" }), true)).toEqual({ quiet: "scene" });
    expect(stageFrame({}, line({ quiet: "scene" }), true)).toEqual({ quiet: "scene" });
    // A scene starts without the frame before it: nothing is kept.
    expect(stageFrame({}, undefined, true)).toEqual({});
  });

  it("keeps the line on screen as it was when no new line was read (the story stopped at a choice first)", () => {
    const shown = line({ recall: "3pm_tower", phone: { side: "received" }, quiet: "line", stand: "near" });
    expect(stageFrame({ stand: "close" }, shown, false)).toEqual({ recall: "3pm_tower", phone: { side: "received" }, quiet: "line", stand: "close" });
    expect(stageFrame({ letter: { kind: "card" } }, undefined, false)).toEqual({ letter: { kind: "card" } });
  });

  it("keeps a recalled picture the line before recalled too (it stays up: no new sound), and only that one (2026-11-16)", () => {
    expect(stageFrame({ recall: "3pm_tower" }, line({ recall: "3pm_tower" }), true)).toEqual({ recall: "3pm_tower", recallKept: true });
    expect(stageFrame({ recall: "3pm_tower" }, line({ recall: "cafe_art" }), true)).toEqual({ recall: "3pm_tower" });
    expect(stageFrame({ recall: "3pm_tower" }, line({}), true)).toEqual({ recall: "3pm_tower" });
    // At a scene's start (or after a battle's call) the picture comes up anew; a line without the tag keeps nothing.
    expect(stageFrame({ recall: "3pm_tower" }, undefined, true)).toEqual({ recall: "3pm_tower" });
    expect(stageFrame({}, line({ recall: "3pm_tower" }), true)).toEqual({});
    // The line on screen stays as it was when no new line was read.
    expect(stageFrame({}, line({ recall: "3pm_tower", recallKept: true }), false)).toEqual({ recall: "3pm_tower", recallKept: true });
  });

  it("reads a picture recalled on three lines in a row as one coming up, then kept, and saves it", () => {
    const story = new Story(compileInk("# recall: 3pm_tower\n一行目\n# recall: 3pm_tower\n二行目\n三行目\n# recall: 3pm_tower\n四行目\n-> END\n"));
    const frames: StoryFrame[] = [];
    for (let previous: StoryFrame | undefined; !previous?.ended;) {
      previous = readStoryFrame(story, context, previous, []).frame;
      frames.push(storyFrameSchema.parse(JSON.parse(JSON.stringify(previous))));
    }
    expect(frames.map((frame) => [frame.text, frame.recall ?? null, frame.recallKept ?? null])).toEqual([
      ["一行目", "3pm_tower", null], ["二行目", "3pm_tower", true], ["三行目", null, null], ["四行目", "3pm_tower", null],
    ]);
  });

  it("shows a line's large photo without its item card, and the card the next line keeps then (2026-11-25)", () => {
    const story = new Story(compileInk("# item_out: memo 1\n# photo: 3pm_tower\n一行目\n# item_out: memo 1\n二行目\n"
      + "# item_show: memo\n# photo: 3pm_tower # photo_show: small\n三行目\n-> END\n"));
    const frames: StoryFrame[] = [];
    for (let previous: StoryFrame | undefined; !previous?.ended;) {
      previous = readStoryFrame(story, context, previous, []).frame;
      frames.push(storyFrameSchema.parse(JSON.parse(JSON.stringify(previous))));
    }
    expect(frames.map((frame) => [frame.text, frame.photo?.imageId ?? null, frame.itemOut?.itemId ?? frame.itemShow ?? null])).toEqual([
      ["一行目", "3pm_tower", null], ["二行目", null, "memo"], ["三行目", "3pm_tower", "memo"],
    ]);
  });

  it("keeps at most STACK_MAX earlier messages, the newest", () => {
    const earlier = Array.from({ length: STACK_MAX }, (_, index) => ({ side: "sent" as const, speaker: "player" as const, text: `${index}` }));
    const next = stageFrame({ phone: { side: "received" } }, line({ phone: { side: "sent", earlier } }), true);
    expect(next.phone?.earlier).toHaveLength(STACK_MAX);
    expect(next.phone?.earlier?.[0].text).toBe("1");
    expect(next.phone?.earlier?.at(-1)).toEqual({ side: "sent", speaker: "heroine", text: "前の行" });
  });
});

describe("a letter's line with its # translation: (2026-11-15)", () => {
  const translated = `# speaker: narrator
# letter: card
# translation: 一行目の訳。
The first line.
# letter: card
The second line.
# letter: card
# translation: 三行目の訳。
The third line.
* [Read it. # translation: 読む。]
-
# letter: card
The next sheet.
-> END
`;

  /** Every frame, each saved and loaded again (the first choice at each choice, its tags read with the next line). */
  function framesOf(source: string): StoryFrame[] {
    const story = new Story(compileInk(source));
    const frames: StoryFrame[] = [];
    let previous: StoryFrame | undefined;
    let choiceTags: readonly string[] = [];
    for (let step = 0; step < 10 && !previous?.ended; step++) {
      const { frame } = readStoryFrame(story, context, previous, choiceTags);
      frames.push(storyFrameSchema.parse(JSON.parse(JSON.stringify(frame))));
      previous = frame;
      choiceTags = frame.choices.length ? story.currentChoices[0].tags ?? [] : [];
      if (frame.choices.length) story.ChooseChoiceIndex(0);
    }
    return frames;
  }

  it("keeps the line's English as its text and stacks each earlier line with its own Japanese, if it has one", () => {
    const frames = framesOf(translated);
    expect(frames.map((frame) => frame.text)).toEqual(["The first line.", "The second line.", "The third line.", "The next sheet."]);
    expect(frames[0].letter).toEqual({ kind: "card", translationJa: "一行目の訳。" });
    expect(frames[1].letter).toEqual({ kind: "card", earlier: [{ text: "The first line.", translationJa: "一行目の訳。" }] });
    // The third line stops at the choice: its own translation and the choice's, each where it belongs.
    expect(frames[2].letter).toEqual({ kind: "card", translationJa: "三行目の訳。",
      earlier: [{ text: "The first line.", translationJa: "一行目の訳。" }, "The second line."] });
    expect(frames[2].choices).toEqual([{ index: 0, text: "Read it.", translationJa: "読む。" }]);
    // The sheet goes on after the choice; the choice's translation (read with the next line's tags) never goes on it.
    expect(frames[3].letter).toEqual({ kind: "card", earlier: [{ text: "The first line.", translationJa: "一行目の訳。" }, "The second line.",
      { text: "The third line.", translationJa: "三行目の訳。" }] });
  });

  it("reads a translation only on a letter's line (content:build stops it elsewhere: scripts/line-translation.ts)", () => {
    const frames = framesOf("# translation: 訳。\nA line.\n-> END\n");
    expect(frames[0]).not.toHaveProperty("letter");
    expect(JSON.stringify(frames[0])).not.toContain("訳。");
  });

  it("loads a saved sheet of lines with and without translations, and refuses an earlier line's empty translation", () => {
    const frame = framesOf(translated)[2];
    expect(storyFrameSchema.parse(frame)).toEqual(frame);
    expect(storyFrameSchema.safeParse({ ...frame, letter: { kind: "card", earlier: [{ text: "A line.", translationJa: "" }] } }).success).toBe(false);
    expect(storyFrameSchema.safeParse({ ...frame, letter: { kind: "card", translationJa: "" } }).success).toBe(false);
  });
});
