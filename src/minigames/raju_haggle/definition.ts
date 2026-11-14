import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `raju_haggle` (a skin of `step_pick` with moods): Raju's treasure map at Jaigarh's gate (2026-11-13), the staring contest
 * his own line sets up (「じっと見られると、ぼく、ちょっとずつ負けちゃう」). Round 3: a contest you read. He calls ₹50 and is
 * never still: he boasts (chin up, the map held high: a 「じっと見る」 now bounces off him and costs his pride), then his eyes
 * wander (his tell: a sigh, a glance at his map, fiddling with its corner, a look at his grandpa's stall: a stare now
 * lands), over and over. Two landed stares bring his price down a step: ₹40, then ₹30. At ₹40 his boasts grow longer and
 * his wobbles shorter, and after one landed stare he pretends to walk away and peeks back over his shoulder: a stare at the
 * peek calls his bluff (₹30 at once); waited out, he comes back. At ₹30 every stare bounces. Three bounces and he stomps off
 * with the map; twelve seconds of nothing ends it too (no deal either way). Time alone never lowers the price (only stares
 * do): how far to push, and when, is the player's choice and its risk, read from him, not a reflex. The player takes the
 * price on show with 「この値段で」, or says 「やめておく」; what the player pays is the price they took: each outcome's
 * choice carries that `# money:`. A price the player cannot pay now takes the next lower one (the outcomes' fallbacks,
 * docs/13 4.2), and the field shows it lowered; with none, only 「やめておく」 is left. An attitude, not a skill: no rating
 * and no practice (it stands for how the player haggles with a boy who draws maps). His moods follow the numbers and what
 * the player did, never the seed (docs/13 2.8): the seed picks only which of his tells and boasts he shows.
 *
 * Accessibility: 「じっと見る」 (64px, middle, the focus starts there), 「この値段で」 with the price on it (64px, right; its
 * name says the price) and 「やめておく」 (48px, left) sit at the bottom in thumb reach, Tab between them and Enter or Space
 * presses. The top band shows the price on show and the landed stares it still takes (「₹40　あと1回で値下げ」), never his
 * mood (2026-11-14 playtest: that made the read a label); a screen reader hears what Raju is doing (「ラージュー：目が泳いで
 * いる」, a live line of the field), so his moods are not only seen; his bubble's face and words change with each look (not his pose alone), and his hurt
 * pride shows as a cross mark, then puffed cheeks and a red bubble edge, and in his words. The price list shows the price
 * on show by size, a frame and a mark (not colour alone), the passed ones struck out. With less motion his looks are still
 * poses (no bob, fidget, hop or flinch), his giving up takes him off at once, and the stamp does not pop. The host reads
 * out the outcome.
 */
export const rajuHaggle = defineMiniGame({
  id: "raju_haggle",
  engine: "step_pick",
  titleJa: "地図の値段",
  howToJa: "ラージューとにらめっこ。目が泳いだ時に「じっと見る」と効き、2回で地図の値段が₹50・₹40・₹30と下がる。胸を張っている時に見ると、むくれる（3回でへそを曲げて売ってくれない）。₹40では背を向けて振り返る、ふりもする。「この値段で」で決めるか、「やめておく」（5〜15秒）",
  // An attitude, not a skill: no finish word, flash or sound, no ★, no practice. Her face (and a word where the story
  // has none of hers next) on the result card: the deals at ₹40 and ₹30 go on at once with her own delight, so the card
  // shows her face only.
  outcomes: [
    { id: "buy_map", labelJa: "言い値の₹50で買った", noteJa: "最初の値段で決めた（払えないときは ₹40 に）", fallback: "fair_map",
      finishJa: null, reaction: { kind: "cheer", linesJa: ["やった、地図！"] } },
    { id: "fair_map", labelJa: "₹40で話がまとまった", noteJa: "目が泳いだ時に2回見て、₹40で決めた（払えないときは ₹30 に）", fallback: "haggle_map",
      finishJa: null, reaction: { kind: "cheer" } },
    { id: "haggle_map", labelJa: "₹30まで値切った", noteJa: "目が泳いだ時に4回見るか、背を向けて振り返った所を見抜いて、₹30で決めた（払えないときは買わない）", fallback: "decline_map",
      finishJa: null, reaction: { kind: "laugh" } },
    { id: "decline_map", labelJa: "地図は買わなかった", noteJa: "「やめておく」を押した、胸を張っている時や₹30で3回見てラージューがへそを曲げた、または12秒何もしなかった",
      finishJa: null, reaction: { kind: "oops", linesJa: ["地図、ちょっと見たかったな"] } },
  ],
  defaultAuto: "fair_map",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "値段を聞く",
  hintJa: "目が泳いだ時に「じっと見る」と値段が下がる。胸を張っている時に見ると、むくれる",
  goalJa: "顔を読んで、目が泳いだ時に「じっと見る」。決めたら「この値段で」（胸を張っている時は、むくれる）",
  controls: "tap",
  durationSec: 10,
  music: "scene",
  timed: true,
  keysJa: "Tab で選び、Enter・Space で押す（最初は「じっと見る」）",
  sounds: ["ui_page", "stamp", "ui_tap", "snatch", "footstep"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "raju_glad", kind: "sprite", labelJa: "地図を両手で差し出して、にっと笑うラージューの全身（立ち絵の画風、背景は透明）" },
    { id: "raju_unsure", kind: "sprite", labelJa: "地図を持ったまま、口をきゅっと結んで考えるラージューの全身（立ち絵の画風、背景は透明）" },
    { id: "raju_sulky", kind: "sprite", labelJa: "地図を胸に抱えて、頬をふくらませたラージューの全身（立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
