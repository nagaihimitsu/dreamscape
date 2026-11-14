import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `roti_rolling` (a skin of `shape_drag` with a hand): the Bangla Sahib date's roti, in the langar kitchen (round 3:
 * 「押して、回す」 with Harbans). Harbans turns the dough a quarter on his own beat; the player rolls a ball of dough with one
 * finger in the windows between his turns (one stroke a window; two in his long pause). His beat changes: three calm
 * windows, then the twist (a long pause while he checks the tava, a quick pair, a feint — his hand comes with a pinch of
 * flour and turns nothing — and a breath), then the climax: the tava is hot, three short windows, and he lifts the roti
 * onto it (about 16 s from スタート). A stroke into his hand on the dough skids (a weak lopsided push). An arrow on the dough
 * shows the way to roll next (the way of the dough rolled least: following it rounds the roti; it turns with the dough)
 * and its shaft burns down like a fuse while the window lasts; a meter shows how round it is now. His last window or
 * 「できた」 ends it, and the shape decides what Harbans calls it: a box like a truck's bed (`truck_bed`: the same way of the
 * screen every time), else round (`round`, roundness 80% or more; 88% and across the dotted ring is まん丸, ★3 on the card
 * only), else some country (`country`), or a hole when rolled too thin or past the board (`torn`, at once; near it the
 * pin gets heavy and the hint warns). Stopping early with 「できた」 keeps a smaller roti safe; the hot windows are where the
 * ring is reached, or the dough tears.
 *
 * The host's flow (docs/13 2.6): practice (the roti is the date's helper scene after the choice to aim round: its
 * outcomes carry no relationship effects), the host's 3・2・1 (his beat starts on スタート), the calm mini-game track, ★ from
 * how round and big (rules.ts), a finish word per outcome (a hole's tone is a mishap's thud) and her face on the card
 * (Harbans speaks in the field; she reacts in the band at a skid, the ring and the hot tava). The tag's use lets the real
 * play be rolled again (`retry yes`: Harbans's 「生地は、何度でもやり直せる」 after a hole; a helper scene with no
 * relationship effects). Her reaction lines are her first breath at the end and fit both of the story's branches after it
 * (romance_result); the story's lines (Harbans's joke, then hers) follow at once and are never repeated here.
 *
 * Accessibility: 「できた」 is 64px at the bottom (thumb reach) and takes the focus (pressed before a stroke, it is turned
 * away and the hint says why); the arrows roll through the centre (Shift: the diagonal clockwise of it), Enter and Space
 * press 「できた」. The status band shows the seconds left; the meter shows the roundness as a number and a bar with a mark
 * at 80% (not colour alone); the line over 「できた」 says when the dough is near a tear (not the dough's dotted edge alone)
 * and is read out. His beat is seen, not heard: the fuse, his hand sliding in from his corner before it touches, the
 * arrow fading, his words (「粉だ」「鉄板が熱い。急げ」) and the tava's glow (the turn's sound is extra). With less motion
 * the dough does not swing round (it is turned at once), his hand shows at once at the dough's edge, the tava does not
 * pulse, no flour or squash, and the idle hint's finger stays at the arrow's tail. The outcome is read out by the host.
 */
export const rotiRolling = defineMiniGame({
  id: "roti_rolling",
  engine: "shape_drag",
  titleJa: "ローティーを伸ばす",
  howToJa: "ハルバンスが自分の拍子で生地を四分の一ずつ回す。回す合間（手が離れているあいだ）に、矢印の向きに生地をなぞって伸ばす（手が乗っている時になぞると滑る）。拍子は途中で変わり、最後は鉄板が熱くなって速くなる。「丸さ」80%以上で丸く、点線の輪まで大きく88%以上ならまん丸（★3）。「できた」でいつでも終えられる",
  outcomes: [
    { id: "round", labelJa: "丸く伸びた", noteJa: "矢印のとおり、回す合間に一回ずつ、ほどよく伸ばした（丸さ80%以上。点線の輪まで大きく88%以上なら、カードでまん丸 ★3）",
      finishJa: "丸い！", reaction: { kind: "surprise", linesJa: ["わ、丸い！"] } },
    { id: "truck_bed", labelJa: "四角くなった", noteJa: "画面の同じ向きばかりに伸ばした（回されるので四角か細長い形。丸より先に見る）", finishJa: "四角！",
      reaction: { kind: "surprise", linesJa: ["えっ、角ができてる"] } },
    { id: "country", labelJa: "地図のような形になった", noteJa: "形がいびつ（向きがばらばら、手に当たって滑った、伸ばし足りない・玉のまま、端だけ伸ばした）。カードは伸ばし足りなければ「伸ばし足りない」「まだ玉のまま」", finishJa: "……ん？",
      reaction: { kind: "laugh", linesJa: ["……どこかで見た形かも"] } },
    { id: "torn", labelJa: "穴が開いた", noteJa: "伸ばしすぎた（うすくしすぎたか、板からはみ出すほど長い）。その場で終わる", finishJa: "ぷすっ！",
      finishTone: "oops", reaction: { kind: "oops", linesJa: ["あっ、穴！"] } },
  ],
  defaultAuto: "truck_bed",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "麺棒を持つ",
  hintJa: "ハルバンスが回す合間に、矢印の向きに一回ずつ。手が乗っている時は待つ。最後は速くなる",
  goalJa: "ハルバンスが回す合間に矢印の向きになぞって、丸く大きく伸ばす（手に当てない）",
  controls: "drag",
  durationSec: 17,
  practice: {},
  // His beat starts on スタート.
  countdown: "host",
  music: "calm",
  timed: true,
  keysJa: "矢印で伸ばす（Shift で斜め）・Enter で「できた」",
  sounds: ["cloth_grab", "cloth_flap", "snatch"],
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
