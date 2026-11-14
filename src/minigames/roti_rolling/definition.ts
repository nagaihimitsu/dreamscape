import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `roti_rolling` (a skin of `shape_drag`): the Bangla Sahib date's roti, in the langar kitchen. The player rolls a ball of
 * dough with one finger, 8 strokes; after each stroke the dough turns a quarter. An arrow on the dough shows each stroke's
 * way (an eighth round further each time: following it rounds the roti) and a meter how round it is now. The 8th stroke
 * or 「できた」 ends it (no time limit: it waits for the first stroke), and the shape decides what Harbans calls it: a box
 * like a truck's bed (`truck_bed`), else round (`round`, roundness 80% or more; 88% and across the dotted ring is まん丸,
 * ★3 on the card only), else some country (`country`), or a hole when rolled too thin or past the board (`torn`, at once;
 * near it the pin gets heavy and the hint warns).
 *
 * The host's flow (docs/13 2.6): practice (the roti is the date's helper scene after the choice to aim round: its
 * outcomes carry no relationship effects), no count (it waits for the first stroke), the calm mini-game track, ★ from
 * how round and big (rules.ts), a finish word per outcome (a hole's tone is a mishap's thud) and her face on the card
 * (Harbans reacts in the field). The tag's use lets the real play be rolled again (`retry yes`: Harbans's 「生地は、何度でも
 * やり直せる」 after a hole; a helper scene with no relationship effects). Her
 * reaction lines are her first breath at the end and fit both of the story's branches after it (romance_result); the
 * story's lines (Harbans's joke, then hers) follow at once and are never repeated here.
 *
 * Accessibility: 「できた」 is 64px at the bottom (thumb reach) and takes the focus (pressed before a stroke, it is turned
 * away and the hint says why); the arrows roll through the centre (Shift: the diagonal clockwise of it), Enter and Space press 「できた」. The
 * status band shows the strokes left; the meter shows the roundness as a number and a bar with a mark at 80% (not colour
 * alone); the line over 「できた」 says when the dough is near a tear (not the dough's dotted edge alone) and is read out.
 * With less motion the dough does not swing round after a stroke (it is turned at once), no flour or squash, and the idle
 * hint's finger stays at the arrow's tail. The outcome is read out by the host.
 */
export const rotiRolling = defineMiniGame({
  id: "roti_rolling",
  engine: "shape_drag",
  titleJa: "ローティーを伸ばす",
  howToJa: "生地を指でなぞって麺棒で伸ばし、形を作る（8回）。伸ばすたびに生地が四分の一回る。矢印の向きに伸ばすと丸くなる。「丸さ」80%以上で丸く伸び、点線の輪まで大きく88%以上ならまん丸（★3）",
  outcomes: [
    { id: "round", labelJa: "丸く伸びた", noteJa: "矢印のとおり、いろいろな向きに、ほどよく伸ばした（丸さ80%以上。点線の輪まで大きく88%以上なら、カードでまん丸 ★3）",
      finishJa: "丸い！", reaction: { kind: "surprise", linesJa: ["わ、丸い！"] } },
    { id: "truck_bed", labelJa: "四角くなった", noteJa: "同じ向きばかりに伸ばした（四角か細長い形。丸より先に見る）", finishJa: "四角！",
      reaction: { kind: "surprise", linesJa: ["えっ、角ができてる"] } },
    { id: "country", labelJa: "地図のような形になった", noteJa: "形がいびつ（向きがばらばら、伸ばし足りない、端だけ伸ばした）", finishJa: "……ん？",
      reaction: { kind: "laugh", linesJa: ["……どこかで見た形かも"] } },
    { id: "torn", labelJa: "穴が開いた", noteJa: "伸ばしすぎた（うすくしすぎたか、板からはみ出すほど長い）。その場で終わる", finishJa: "ぷすっ！",
      finishTone: "oops", reaction: { kind: "oops", linesJa: ["あっ、穴……！"] } },
  ],
  defaultAuto: "truck_bed",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "麺棒を持つ",
  hintJa: "矢印の向きになぞって伸ばす（8回）。「丸さ」80%以上で丸く、点線の輪まで大きく88%以上で、まん丸",
  goalJa: "矢印の向きに8回なぞって、丸く大きく伸ばす",
  controls: "drag",
  durationSec: 10,
  practice: {},
  // It waits for the first stroke: no count.
  countdown: "none",
  music: "calm",
  timed: false,
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
