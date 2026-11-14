import { z } from "zod";
import { defineMiniGame } from "../contract";

/** What the monkey drops (the tag's `thing`): it changes the picture only, never the timing. */
export const MONKEY_THINGS = ["bottle", "glasses"] as const;

/**
 * `monkey_catch` (a skin of `cue_tap`): Akbar's Tomb, the monkey on the gate's wall gives back what it took (the tag's
 * `thing`: the small bottle, or sunglasses), and the player catches it with one tap as it reaches the ring over the
 * hands: right then (`caught`), a little early or late so it bounces off the fingers (`fumbled`), far off or no tap so it
 * falls past (`missed`). Hands closed before the monkey starts teasing do not count.
 *
 * Round 3 (rules.ts monkeyPlan): the monkey teases first — its arm jerks down with the fist closed (a feint), its other
 * hand drops a peanut shell (small, dull brown: let it fall; the heroine laughs 「殻だった。セーフ」), it lets go of the thing
 * and snatches it back in mid-air (the catch its fall promised does not come), then opens its hand wide and lets go, a
 * second shell beside it: the shell falls straight and reaches the hands first, the thing clips the carved ledge half way
 * down (a knock, a puff of dust) and comes on a moment later. Hands closed on the second shell bounce the thing off the
 * fingers (fumbled); at the feint, on the first shell or on the snatched-back fall it falls past them (missed).
 *
 * The host's flow (docs/13 2.6): practice before the real catch, no 3・2・1 (the monkey holds it out first), the play ends
 * as the thing meets the hands or goes past them (★ from the tap: clean ★3, a little off ★2, far off ★1, no tap none), and
 * the heroine's face and line: her first breath at her bottle or sunglasses caught (the story's lines follow at once: for
 * the bottle her 「わたしの雨、無事だった！」), never what she says next, and right for either thing; her face alone when it
 * gets away (the bottle breaks, and she says nothing for a while). The catch snaps (a short high knock right as the hands
 * meet it, the pouch's settle under it) with a small shake.
 *
 * Accessibility: 「受け止める」 is 64px at the bottom (thumb reach), Space and Enter close the hands; no meter: a gold ring
 * with a dark edge marks where things meet the hands and tightens for whatever is about to arrive (the shells too: the
 * thing's look says what, never colour alone: the shell is small, dull and of another shape); the ledge's knock has its
 * puff of dust; with less motion the thing and the shells do not turn and the monkey does not lean (its fall, the snatch
 * and the ring still move); the outcome is read out by the host.
 */
export const monkeyCatch = defineMiniGame({
  id: "monkey_catch",
  engine: "cue_tap",
  titleJa: "猿の落とし物",
  howToJa: "壁の上の猿が返してくる落とし物（小瓶かサングラス）が、両手の上の輪に届く瞬間に、「受け止める」を1回押して受け止める。猿はからかって、腕だけ振る・殻を落とす・落としてすぐ取り返す。最後は殻と一緒に落とし、落とし物は壁の飾りの出っ張りに当たって少し遅れて来る（約7秒）",
  outcomes: [
    { id: "caught", labelJa: "受け止めた", noteJa: "輪に届く瞬間（針が金色の所）に押した", finishJa: "キャッチ！",
      reaction: { kind: "surprise", linesJa: ["わっ、取った！", "ナイスキャッチ！"] } },
    // Her face only when it gets away: for her bottle the story goes on to the glass breaking and 「しばらく何も言わなかった」,
    // and its next line tells the slip (指先に…跳ねて／手の先をかすめて) itself.
    { id: "fumbled", labelJa: "指先で弾いた", noteJa: "少し早いか、少し遅い（一緒に落ちた殻で手を閉じたときも）", finishJa: "つるっ！", finishTone: "plain",
      reaction: { kind: "oops" } },
    { id: "missed", labelJa: "受け止められなかった", noteJa: "早すぎるか遅すぎる（フェイント・最初の殻・取り返された時も）、または押さなかった", finishJa: "落ちた！", finishTone: "oops",
      reaction: { kind: "oops" } },
  ],
  defaultAuto: "caught",
  params: () => z.object({
    thing: z.enum(MONKEY_THINGS).default("bottle").describe("落ちてくる物の絵（bottle：小瓶。書かなければこれ。glasses：サングラス）。遊び方は変わらない"),
  }).strict(),
  examples: [{}, { thing: "glasses" }],
  startJa: "構える",
  hintJa: "落とし物が輪に届く瞬間に「受け止める」",
  goalJa: "猿のフェイントや殻につられず、落とし物が輪に届く瞬間に「受け止める」",
  controls: "timing",
  durationSec: 7,
  practice: {},
  // The monkey's teasing is the cue (the story: 「考えるより先に、両手が出ていた」): no 3・2・1 before it.
  countdown: "own",
  music: "bright",
  // The catch is at the bottom, in the hands: the result card sits high (over the wall), leaving it in view.
  resultAnchor: "top",
  timed: true,
  keysJa: "Space・Enter で受け止める",
  sounds: ["cloth_grab", "bat_hit", "item_pouch"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "wall", kind: "backdrop", labelJa: "真下から見上げた廟の門の壁の上の端と空（赤い砂岩に白い石の模様、壁の上の端は場の上から約26%）" },
    { id: "monkey", kind: "sprite", labelJa: "壁の上の端に座り、片手を前へ突き出した灰色がかった猿の全身（手の中は空、背景は透明）" },
  ],
  load: () => import("./play"),
});
