import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * Where a ball the batter lets go goes (the tag's `letgo`): past the plank into the bricks behind it (the first ball's
 * story), or against the still plank and back to her feet (`plank`: the second ball's 「少し遅いボールの方が板きれに当
 * たって…彼女の足もとで止まった」). A swing after it has met the plank is no swing at it.
 */
export const CRICKET_LET_GO = ["bricks", "plank"] as const;

/**
 * Which ball she bowls (the tag's `ball`): `quick`, flat and quick, skidding on after the bounce (the first ball's 「本気で
 * 投げる」); `slower`, tossed up slower to the bounce, then skidding on all the same (the second ball's 「少し遅いボール」).
 * Both skid: the swing follows the bounce, not the first part's pace.
 */
export const CRICKET_BALLS = ["quick", "slower"] as const;

/**
 * `cricket_batting` (a skin of `cue_tap`): the Mehtab Bagh date's last ball. The player bats the ball the heroine bowls
 * with one tap: straight back (`six`), a little early over the side (`over_wall`), a little late off the edge (`edge`), a
 * miss (`bowled`), no swing (`no_swing`).
 *
 * Round 3 (rules.ts cricketPlan): her first delivery comes like any ball until it lands on a crack in the dusty pitch and
 * kicks up steeply over the bat and the bricks (a bouncer: leave it, and Sonia calls 「高い！ 今のはなし」 while she says
 * 「ごめん、もう一球！」; a swing at it skies it over the side wall: over_wall, ★1). She walks back and bowls her
 * real last ball, which changes pace where it bounces (the tag's `ball`): `quick` holds up off the pitch (a swing timed by
 * its first part is early), `slower` is tossed up and skids on (one timed by its first part is late). The meter's needle
 * follows only the real ball's travel (it waits through the bouncer, and slows or quickens at the bounce); the gold zone
 * is exactly where a swing is clean.
 *
 * The host's flow (docs/13 2.6): practice before the real ball, the host's 3・2・1, the field ends the play at the bat
 * meeting the ball or the bricks falling (its swing's time rated for ★: a clean hit ★3, near ★2, a miss or a swing at the
 * bouncer ★1, no swing none), Sonia's call as the finish word, and the heroine's reaction from the far end. The reaction
 * lines are her first breath at the ball (the story's lines follow at once, in both of its romance branches): short, and
 * never what she says next. The children watch from the near corners: the batter's side jumps with a cheer at a six, the
 * bowler's raises its arms when the bricks fall.
 *
 * Accessibility: 「振る」 is 64px at the bottom (thumb reach), Space and Enter swing; the meter's gold zone is brighter and
 * narrower than the near zone (not colour alone); the bouncer's kick off the crack is drawn (it climbs over the bat, its
 * shadow stays on the ground) with a tick, and Sonia's call is written; with less motion the bowler does not run up and a
 * hit ball does not fly (the ball and the needle still move); the outcome is read out by the host.
 */
export const cricketBatting = defineMiniGame({
  id: "cricket_batting",
  engine: "cue_tap",
  titleJa: "クリケットの打席",
  howToJa: "向こうから投げられた球を、「振る」を1回押して打つ。最初の球は割れ目で高く跳ね上がる（見送る）。本番の一球は弾んだところで速さが変わる（約6秒）",
  outcomes: [
    // The story's 「わ、見た？」 follows: her first breath here, lost for words for a moment.
    { id: "six", labelJa: "まっすぐ打ち返した", noteJa: "針が金色の所で振った", finishJa: "六点！",
      reaction: { kind: "surprise", linesJa: ["……うそ、川まで？"] } },
    // Her face only: the story's 「一瞬の静けさ」 comes before Sonia's call and her laugh.
    { id: "over_wall", labelJa: "横へ高く上がった", noteJa: "少し早く振った（高く跳ね上がる最初の球に振ったときも）", finishJa: "アウト！", finishTone: "plain",
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
    ball: z.enum(CRICKET_BALLS).default("quick")
      .describe("本番の一球（quick：速く低い球が、弾んだ後に土に食われて少し遅れて来る。書かなければこれ。slower：山なりの遅い球が、弾んだ後に滑って速く来る）。どちらも最初に高く跳ね上がる見送りの球がある"),
  }).strict(),
  examples: [{}, { ball: "slower", letgo: "plank" }],
  startJa: "構える",
  hintJa: "針が金色に来たら「振る」（高い球は見送る）",
  goalJa: "高く跳ね上がる球は見送り、本番の一球を針が金色に来た瞬間に「振る」で打ち返す",
  controls: "timing",
  durationSec: 6,
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
