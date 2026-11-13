import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `cricket_batting` (a skin of `cue_tap`): the Mehtab Bagh date's last ball. The player bats the one ball the heroine
 * bowls with one tap, timed against a meter: straight back (`six`), a little early over the side (`over_wall`), a little
 * late off the edge (`edge`), a miss (`bowled`), no swing (`no_swing`).
 *
 * Accessibility: 「振る」 is 64px at the bottom (thumb reach), Space and Enter swing; the meter's gold zone is brighter and
 * narrower than the near zone (not colour alone); with less motion the bowler does not run up and a hit ball does not
 * fly (the ball and the needle still move); the outcome is read out by the host.
 */
export const cricketBatting = defineMiniGame({
  id: "cricket_batting",
  engine: "cue_tap",
  titleJa: "クリケットの打席",
  howToJa: "向こうから投げられた一球を、「振る」を1回押して打つ（約5秒）",
  outcomes: [
    { id: "six", labelJa: "まっすぐ打ち返した", noteJa: "針が金色の所で振った" },
    { id: "over_wall", labelJa: "横へ高く上がった", noteJa: "少し早く振った" },
    { id: "edge", labelJa: "板の端に当たった", noteJa: "少し遅く振った" },
    { id: "bowled", labelJa: "空振り", noteJa: "早すぎるか遅すぎる" },
    { id: "no_swing", labelJa: "振らなかった", noteJa: "最後まで押さなかった" },
  ],
  defaultAuto: "six",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "構える",
  hintJa: "針が金色の所に来たら「振る」",
  timed: true,
  keysJa: "Space・Enter で振る",
  sounds: ["bat_hit", "bricks_fall", "applause"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "pitch", kind: "backdrop", labelJa: "打者の目から見た空き地のピッチ（遠くに投げる人の立つ所、手前に煉瓦の三柱門）" },
    { id: "bowler", kind: "sprite", labelJa: "ボールを投げる構えのヒロインの全身（立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
