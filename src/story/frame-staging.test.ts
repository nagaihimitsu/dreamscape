import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { compileInk } from "../../scripts/ink-validation";
import { readStoryFrame, stageFrame, STACK_MAX, type StoryFrame } from "./frame-reader";
import { storyFrameSchema } from "./runtime";

const context = { effectIds: [], backgroundIds: ["street"], emotionIds: ["neutral"], photoIds: ["tower_photo"] };

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
# recall: tower_photo
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
    expect(frames.map((frame) => frame.recall)).toEqual([undefined, undefined, undefined, "tower_photo", undefined, undefined, undefined, undefined, undefined]);
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
    const shown = line({ recall: "tower_photo", phone: { side: "received" }, quiet: "line", stand: "near" });
    expect(stageFrame({ stand: "close" }, shown, false)).toEqual({ recall: "tower_photo", phone: { side: "received" }, quiet: "line", stand: "close" });
    expect(stageFrame({ letter: { kind: "card" } }, undefined, false)).toEqual({ letter: { kind: "card" } });
  });

  it("keeps at most STACK_MAX earlier messages, the newest", () => {
    const earlier = Array.from({ length: STACK_MAX }, (_, index) => ({ side: "sent" as const, speaker: "player" as const, text: `${index}` }));
    const next = stageFrame({ phone: { side: "received" } }, line({ phone: { side: "sent", earlier } }), true);
    expect(next.phone?.earlier).toHaveLength(STACK_MAX);
    expect(next.phone?.earlier?.[0].text).toBe("1");
    expect(next.phone?.earlier?.at(-1)).toEqual({ side: "sent", speaker: "heroine", text: "前の行" });
  });
});
