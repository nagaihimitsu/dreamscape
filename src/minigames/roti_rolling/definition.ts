import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `roti_rolling` (a skin of `shape_drag`): the Bangla Sahib date's roti, in the langar kitchen. The player rolls a ball of
 * dough with one finger; after each stroke the dough turns a quarter. 「できた」 (or the time, about 15 s) ends it, and the
 * shape decides what Harbans calls it: round (`round`), a box like a truck's bed (`truck_bed`), some country
 * (`country`), or a hole when rolled too thin or past the board (`torn`, at once).
 *
 * Accessibility: 「できた」 is 64px at the bottom (thumb reach) and takes the focus; the arrows roll through the centre
 * (Shift: the diagonal clockwise of it), Enter and Space press 「できた」. The status band shows the seconds left; the line
 * over 「できた」 says when the dough is near a tear (not the dough's paler colour alone) and is read out. With less motion
 * the dough does not swing round after a stroke (it is turned at once). The outcome is read out by the host.
 */
export const rotiRolling = defineMiniGame({
  id: "roti_rolling",
  engine: "shape_drag",
  titleJa: "ローティーを伸ばす",
  howToJa: "生地を指でなぞって麺棒で伸ばし、形を作る。伸ばすたびに生地が四分の一回る（約15秒。「できた」で終える）",
  outcomes: [
    { id: "round", labelJa: "まん丸に伸びた", noteJa: "いろいろな向きに、ほどよく伸ばした" },
    { id: "truck_bed", labelJa: "四角くなった", noteJa: "同じ向きばかりに伸ばした（四角か細長い形）" },
    { id: "country", labelJa: "地図のような形になった", noteJa: "形がいびつ（向きがばらばら、伸ばし足りない、端だけ伸ばした）" },
    { id: "torn", labelJa: "穴が開いた", noteJa: "伸ばしすぎた（うすくしすぎたか、板からはみ出すほど長い）。その場で終わる" },
  ],
  defaultAuto: "truck_bed",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "麺棒を持つ",
  hintJa: "なぞって伸ばす。伸ばすたびに生地が回る",
  timed: true,
  keysJa: "矢印で伸ばす（Shift で斜め）・Enter で「できた」",
  sounds: ["cloth_grab"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "kitchen", kind: "backdrop", labelJa: "生地を伸ばす台を上から見た、ランガルの台所の作業台（粉が散り、端に湯気や器。板の周りの余白）" },
    { id: "board", kind: "sprite", labelJa: "生地を伸ばす丸い木の板を真上から（背景は透明）" },
    { id: "pin", kind: "sprite", labelJa: "細長い木の麺棒を真上から、横向き（背景は透明）" },
    { id: "dough", kind: "backdrop", labelJa: "伸ばした生地の表面のきめ（継ぎ目のない正方形の模様。生地の形に切り抜いて使う）" },
  ],
  load: () => import("./play"),
});
