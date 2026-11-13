import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `raju_haggle` (a skin of `step_pick`): Raju's treasure map at Jaigarh's gate (2026-11-13). Raju calls his price and,
 * while the player holds out, lowers it: ₹50, ₹40, ₹30. The player takes the price on show with 「この値段で」, or says
 * 「やめておく」; holding out past his last price, he gives up selling. What the player pays is the price they took: each
 * outcome's choice carries that `# money:`. A price the player cannot pay now takes the next lower one (the outcomes'
 * fallbacks, docs/13 4.2), and the field shows it lowered; with none, only 「やめておく」 is left.
 *
 * Accessibility: 「この値段で」 is 64px at the bottom right (thumb reach) and Space and Enter press it; 「やめておく」 sits apart
 * on the left (Tab to it, then Enter); every price stays on show over a second, so it is a choice, not a reflex. The price
 * list shows the price on show by size, a frame and a mark (not colour alone), the passed ones struck out. With less motion
 * the prices change without a slide; the time bar still runs. The host reads out the outcome.
 */
export const rajuHaggle = defineMiniGame({
  id: "raju_haggle",
  engine: "step_pick",
  titleJa: "地図の値段",
  howToJa: "ラージューの言う地図の値段が、₹50・₹40・₹30と下がっていく。「この値段で」で決めるか、「やめておく」（約5秒）",
  outcomes: [
    { id: "buy_map", labelJa: "言い値の₹50で買った", noteJa: "最初の値段のうちに決めた（払えないときは ₹40 に）", fallback: "fair_map" },
    { id: "fair_map", labelJa: "₹40で話がまとまった", noteJa: "2つ目の値段で決めた（払えないときは ₹30 に）", fallback: "haggle_map" },
    { id: "haggle_map", labelJa: "₹30まで値切った", noteJa: "最後の値段まで待って決めた（払えないときは買わない）", fallback: "decline_map" },
    { id: "decline_map", labelJa: "地図は買わなかった", noteJa: "「やめておく」を押した、または最後まで決めなかった" },
  ],
  defaultAuto: "fair_map",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "値段を聞く",
  hintJa: "値段が下がっていく。決めたら「この値段で」",
  timed: true,
  keysJa: "Space・Enter で「この値段で」。Tab で「やめておく」へ",
  sounds: ["ui_page", "stamp"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "raju_glad", kind: "sprite", labelJa: "地図を両手で差し出して、にっと笑うラージューの全身（立ち絵の画風、背景は透明）" },
    { id: "raju_unsure", kind: "sprite", labelJa: "地図を持ったまま、口をきゅっと結んで考えるラージューの全身（立ち絵の画風、背景は透明）" },
    { id: "raju_sulky", kind: "sprite", labelJa: "地図を胸に抱えて、頬をふくらませたラージューの全身（立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
