import { describe, expect, it } from "vitest";
import type { StoryFrame } from "../story/frame-reader";
import { aheadMedia, frameMedia, heroineEmotion, type MediaCatalog } from "./scene-media";

const frame = (fields: Partial<StoryFrame>): StoryFrame => ({ text: "…", speaker: "narrator", background: "cafe", emotion: "neutral", choices: [], ended: false, ...fields });

/** A catalog that names each file after what it is, so the tests read which file a line asks for. */
const catalog: MediaCatalog = {
  background: (id) => (id === "plain" ? undefined : `bg/${id}`),
  figure: (characterId, emotion, look) => `fig/${characterId}/${look.cityId ?? "-"}/${emotion}`,
  personFigure: (line) => (line.speaker === "person" && line.speakerPersonId === "kamla" ? "kamla_figure" : undefined),
  albumImage: (id) => `album/${id}`,
  miniGameArt: (id) => (id === "missing" ? undefined : `mg/${id}`),
  reactionMark: (mark) => `mark/${mark}`,
};
const keys = (requests: { kind: string; key: string }[]) => requests.map((request) => `${request.kind}:${request.key}`);

describe("heroineEmotion", () => {
  it("is her reaction's, else the line's when she says it or the narration shows it, else neutral", () => {
    expect(heroineEmotion({ speaker: "heroine", emotion: "smile" })).toBe("smile");
    expect(heroineEmotion({ speaker: "narrator", emotion: "shy" })).toBe("shy");
    expect(heroineEmotion({ speaker: "player", emotion: "shy" })).toBe("neutral");
    expect(heroineEmotion({ speaker: "enemy", emotion: "angry", reactions: { heroine: { expression: "worried" } } })).toBe("worried");
  });
});

describe("frameMedia", () => {
  it("names the voice first, then the scene's picture and the heroine as she looks on the line, then the sound", () => {
    const requests = frameMedia(frame({ speaker: "heroine", emotion: "smile", voiceId: "v1", seId: "door" }), { cityId: "delhi" }, catalog, "next");
    expect(keys(requests)).toEqual(["voice:v1", "image:bg/cafe", "image:fig/heroine/delhi/smile", "sound:door"]);
    expect(requests.every((request) => request.priority === "next")).toBe(true);
  });

  it("adds the person who says the line, the enemy who says or reacts, the album pictures and the mini-game's", () => {
    expect(keys(frameMedia(frame({ speaker: "person", speakerPersonId: "kamla" }), {}, catalog, "soon")))
      .toEqual(["image:bg/cafe", "image:fig/heroine/-/neutral", "image:fig/kamla_figure/-/neutral"]);
    expect(keys(frameMedia(frame({ speaker: "enemy", emotion: "angry" }), { enemyFigure: "guard" }, catalog, "soon")))
      .toContain("image:fig/guard/-/angry");
    expect(keys(frameMedia(frame({ reactions: { enemy: { expression: "smug" } } }), { enemyFigure: "guard" }, catalog, "soon")))
      .toContain("image:fig/guard/-/smug");
    // A reaction's mark comes with the line, before the big pictures.
    expect(keys(frameMedia(frame({ reactions: { heroine: { mark: "sweat" }, enemy: { mark: "anger" } } }), {}, catalog, "soon")).slice(0, 2))
      .toEqual(["image:mark/sweat", "image:mark/anger"]);
    // Without a figure for the enemy, nobody stands for them.
    expect(keys(frameMedia(frame({ speaker: "enemy" }), {}, catalog, "soon"))).toHaveLength(2);
    expect(keys(frameMedia(frame({ photo: { imageId: "a01" }, recall: "a02" }), {}, catalog, "soon")))
      .toEqual(["image:bg/cafe", "image:fig/heroine/-/neutral", "image:album/a01", "image:album/a02"]);
    expect(keys(frameMedia(frame({ minigame: { id: "cricket", auto: "win", bg: "pitch", art: { bowler: "bowl", ball: "missing" } } }), {}, catalog, "soon")))
      .toEqual(["image:bg/cafe", "image:fig/heroine/-/neutral", "image:bg/pitch", "image:mg/bowl"]);
  });

  it("names the photo a scene shows throughout in place of its lines' backgrounds, and leaves out what has no file", () => {
    expect(keys(frameMedia(frame({ background: "street" }), { photo: "photo/fort" }, catalog, "next")))
      .toEqual(["image:photo/fort", "image:fig/heroine/-/neutral"]);
    expect(keys(frameMedia(frame({ background: "plain" }), {}, catalog, "next"))).toEqual(["image:fig/heroine/-/neutral"]);
  });
});

describe("aheadMedia", () => {
  it("asks for the line on screen and the next one first, the lines after soon, the lines after each choice later", () => {
    const requests = aheadMedia(frame({ voiceId: "now" }), {
      lines: [frame({ voiceId: "l1" }), frame({ voiceId: "l2" })],
      choices: [[frame({ voiceId: "c1" }), frame({ voiceId: "c1b" })], [frame({ voiceId: "c2" })]],
    }, {}, catalog);
    const voices = requests.filter((request) => request.kind === "voice").map((request) => `${request.key}:${request.priority}`);
    expect(voices).toEqual(["now:next", "l1:next", "l2:soon", "c1:soon", "c1b:idle", "c2:soon"]);
  });
});
