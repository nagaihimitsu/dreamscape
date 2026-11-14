import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `raju_haggle` (a skin of `step_pick`): Raju's treasure map at Jaigarh's gate (2026-11-13), the staring contest his own
 * line sets up (「じっと見られると、ぼく、ちょっとずつ負けちゃう」). He calls ₹50; each 「じっと見る」 costs him patience
 * (five dots), and every second stare brings his price down: ₹40, then ₹30. The player takes the price on show with
 * 「この値段で」, or says 「やめておく」; a fifth stare and he turns away with the map, as does twelve seconds of nothing
 * (no deal either way). Time alone never lowers the price: how far to push is the player's choice and its risk, not a
 * reflex. What the player pays is the price they took: each outcome's choice carries that `# money:`. A price the player
 * cannot pay now takes the next lower one (the outcomes' fallbacks, docs/13 4.2), and the field shows it lowered; with
 * none, only 「やめておく」 is left. An attitude, not a skill: no rating and no practice (it stands for how the player
 * haggles with a boy who draws maps).
 *
 * Accessibility: 「じっと見る」 (64px, middle, the focus starts there), 「この値段で」 with the price on it (64px, right; its
 * name says the price) and 「やめておく」 (48px, left) sit at the bottom in thumb reach, Tab between them and Enter or Space
 * presses. The top band reads out the price on show and his patience (「いまの値段 ₹40　がまん 3/5」). The price list shows
 * the price on show by size, a frame and a mark (not colour alone), the passed ones struck out; his patience is filled
 * and hollow dots with his face. With less motion he does not bob or flinch, his giving up takes him off at once, and the
 * stamp does not pop. The host reads out the outcome.
 */
export const rajuHaggle = defineMiniGame({
  id: "raju_haggle",
  engine: "step_pick",
  titleJa: "地図の値段",
  howToJa: "ラージューとにらめっこ。「じっと見る」2回で地図の値段が₹50・₹40・₹30と下がるが、5回見るとラージューはへそを曲げて売ってくれない。「この値段で」で決めるか、「やめておく」（5〜12秒）",
  // An attitude, not a skill: no finish word, flash or sound, no ★, no practice. Her face (and a word where the story
  // has none of hers next) on the result card: the deals at ₹40 and ₹30 go on at once with her own delight, so the card
  // shows her face only.
  outcomes: [
    { id: "buy_map", labelJa: "言い値の₹50で買った", noteJa: "最初の値段で決めた（払えないときは ₹40 に）", fallback: "fair_map",
      finishJa: null, reaction: { kind: "cheer", linesJa: ["やった、地図！"] } },
    { id: "fair_map", labelJa: "₹40で話がまとまった", noteJa: "2回か3回見て、₹40で決めた（払えないときは ₹30 に）", fallback: "haggle_map",
      finishJa: null, reaction: { kind: "cheer" } },
    { id: "haggle_map", labelJa: "₹30まで値切った", noteJa: "4回見て、₹30で決めた（払えないときは買わない）", fallback: "decline_map",
      finishJa: null, reaction: { kind: "laugh" } },
    { id: "decline_map", labelJa: "地図は買わなかった", noteJa: "「やめておく」を押した、5回見てラージューがへそを曲げた、または12秒何もしなかった",
      finishJa: null, reaction: { kind: "oops", linesJa: ["地図、ちょっと見たかったな"] } },
  ],
  defaultAuto: "fair_map",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "値段を聞く",
  hintJa: "「じっと見る」で値段が下がる。見すぎに注意。決めたら「この値段で」",
  goalJa: "「じっと見る」で値段を下げ、ここだと思ったら「この値段で」（見すぎると売ってくれない）",
  controls: "tap",
  durationSec: 10,
  music: "scene",
  timed: true,
  keysJa: "Tab で選び、Enter・Space で押す（最初は「じっと見る」）",
  sounds: ["ui_page", "stamp", "ui_tap", "snatch"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "raju_glad", kind: "sprite", labelJa: "地図を両手で差し出して、にっと笑うラージューの全身（立ち絵の画風、背景は透明）" },
    { id: "raju_unsure", kind: "sprite", labelJa: "地図を持ったまま、口をきゅっと結んで考えるラージューの全身（立ち絵の画風、背景は透明）" },
    { id: "raju_sulky", kind: "sprite", labelJa: "地図を胸に抱えて、頬をふくらませたラージューの全身（立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
