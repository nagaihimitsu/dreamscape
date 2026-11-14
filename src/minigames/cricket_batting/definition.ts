import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * Where a ball the batter lets go goes (the tag's `letgo`): past the plank into the bricks behind it (the first ball's
 * story), or against the still plank and back to her feet (`plank`: the second ball's 「少し遅いボールの方が板きれに当
 * たって…彼女の足もとで止まった」). A swing after it has met the plank is no swing at it.
 */
export const CRICKET_LET_GO = ["bricks", "plank"] as const;

/**
 * `cricket_batting` (a skin of `cue_tap`): the Mehtab Bagh date's last ball. The player bats the one ball the heroine
 * bowls with one tap, timed against a meter: straight back (`six`), a little early over the side (`over_wall`), a little
 * late off the edge (`edge`), a miss (`bowled`), no swing (`no_swing`).
 *
 * The host's flow (docs/13 2.6): practice before the real ball, the host's 3・2・1, the field ends the play at the bat
 * meeting the ball or the bricks falling (its swing's time rated for ★: a clean hit ★3, near ★2, a miss ★1, no swing none),
 * Sonia's call as the finish word, and the heroine's reaction from the far end. The reaction lines are her first breath
 * at the ball (the story's lines follow at once, in both of its romance branches): short, and never what she says next.
 * The children watch from the near corners: the batter's side jumps with a cheer at a six, the bowler's raises its arms
 * when the bricks fall.
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
    // The story's 「わ、見た？」 follows: her first breath here, lost for words for a moment.
    { id: "six", labelJa: "まっすぐ打ち返した", noteJa: "針が金色の所で振った", finishJa: "六点！",
      reaction: { kind: "surprise", linesJa: ["……うそ、川まで？"] } },
    // Her face only: the story's 「一瞬の静けさ」 comes before Sonia's call and her laugh.
    { id: "over_wall", labelJa: "横へ高く上がった", noteJa: "少し早く振った", finishJa: "アウト！", finishTone: "plain",
      reaction: { kind: "surprise" } },
    { id: "edge", labelJa: "板の端に当たった", noteJa: "少し遅く振った", finishJa: "当たった！",
      reaction: { kind: "oops", linesJa: ["わっ、足もとまで来た"] } },
    { id: "bowled", labelJa: "空振り", noteJa: "早すぎるか遅すぎる", finishJa: "アウト！",
      reaction: { kind: "cheer", linesJa: ["やった、煉瓦！"] } },
    // No call: Sonia lets this ball go uncounted in the story. Her face only: the story's next line is hers
    // (「……今の、振らなかったでしょ」「今の、見送ったでしょ」).
    { id: "no_swing", labelJa: "振らなかった", noteJa: "最後まで押さなかった（letgo plank の球は、板きれに当たった後に振っても）", finishJa: null,
      reaction: { kind: "oops" } },
  ],
  defaultAuto: "six",
  params: () => z.object({
    letgo: z.enum(CRICKET_LET_GO).default("bricks")
      .describe("振らなかった球の行き先（bricks：脇を抜けて後ろの煉瓦を落とす。書かなければこれ。plank：止まった板きれに当たって、投げた人の足もとへ転がる。そのときは板きれに当たった後の空振りも振らなかったことになる）"),
  }).strict(),
  examples: [{}, { letgo: "plank" }],
  startJa: "構える",
  hintJa: "針が金色の所に来たら「振る」",
  goalJa: "針が金色に来た瞬間に「振る」で打ち返す",
  controls: "timing",
  durationSec: 5,
  practice: {},
  countdown: "host",
  music: "bright",
  // The children cheer in the field right after a six (Skin): the card adds no applause of its own.
  fieldCheers: true,
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
