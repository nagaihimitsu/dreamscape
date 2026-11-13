import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `nahargarh_hide_seek` (a skin of `search`): the Nahargarh Fort date's hide-and-seek. A corridor of identical arched doors
 * runs on to the side (it scrolls); she hides behind one of them (the tag's `hide`, 7 in the date: 「七つ目の扉」). The player
 * opens doors (an empty room each, until hers), presses 「名前を呼ぶ」 (her name echoes back from every door; the third call
 * ends the play), or does nothing until she peeks out from the corner. Outcomes are how the player searched: found her
 * among the first two doors opened (`door_quick`) or later (`door_by_door`), called (`call_her_name`), waited (`just_wait`).
 * No names on the doors (the palace's door names are not confirmed; the game shows none).
 *
 * Accessibility: each door is a button (「扉1」〜「扉9」, the label never tells which one hides her) in the tab order, and
 * focus scrolls the corridor to it; Enter or Space opens it; 「名前を呼ぶ」 is a 56px button at the bottom. With less motion
 * the doors open at once, the echoes do not rise and she does not slide in. The outcome is read out by the host.
 */
export const nahargarhHideSeek = defineMiniGame({
  id: "nahargarh_hide_seek",
  engine: "search",
  titleJa: "かくれんぼ",
  howToJa: "同じ形の扉が並ぶ廊下で、隠れた彼女を探す。扉を開ける・「名前を呼ぶ」・何もしないで待つ、のどれでもよい（10〜20秒）",
  outcomes: [
    { id: "call_her_name", labelJa: "名前を呼んだ", noteJa: "「名前を呼ぶ」を3回押した" },
    { id: "door_by_door", labelJa: "一つずつ開けて見つけた", noteJa: "3つ目より後に開けた扉で見つけた" },
    { id: "door_quick", labelJa: "すぐに見つけた", noteJa: "1つ目か2つ目に開けた扉で見つけた" },
    { id: "just_wait", labelJa: "廊下で待った", noteJa: "何もしないで9秒たった（扉を開けた後でも）" },
  ],
  defaultAuto: "door_by_door",
  params: () => z.object({
    hide: z.coerce.number().int().min(1).max(9).default(7).describe("彼女が隠れる扉（手前から数えて1〜9。書かなければ7）"),
  }).strict(),
  examples: [{}, { hide: "2" }],
  startJa: "探しに行く",
  hintJa: "扉を開けても、名前を呼んでも、待ってみてもいい",
  timed: true,
  keysJa: "Tab で扉を選び、Enter・Space で開ける",
  sounds: ["door_creak"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "bay", kind: "backdrop", labelJa: "廊下の壁の一区画と、その戸口1つ（横に並べるとつながる絵。扉の板は場が上に描いて開ける）" },
    { id: "room", kind: "backdrop", labelJa: "開いた扉の奥に見える、誰もいない部屋（壁の絵と、小さな窓の光）" },
    { id: "peek", kind: "sprite", labelJa: "廊下の角から、そっと顔を出すヒロイン（上半身、立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
