import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `cloth_flap` (a skin of `cue_tap`): Agrasen ki Baoli, the pigeon's part. Hidden in a niche by the stairs, the player
 * spreads the cloth with one tap as the one coming down sets foot on the gold step in front of the niche (`perfect`: she
 * stands on it through the whole window); spread before (`early`: she sees it coming) or as she steps off it and later
 * (`late`: behind her back); no tap (`frozen`). A tap before she starts down does not count. Every outcome ends in her
 * real scream in the story.
 *
 * Accessibility: 「広げる」 is 64px at the bottom (thumb reach), Space and Enter spread the cloth; in place of a meter, a
 * numbered mark for each of her steps lights as her foot lands (on the stairs and under the field; the gold one is larger
 * and glows, not colour alone), with a footstep sound on the first step and again on the gold one; with less motion she
 * does not bob on her steps, the cloth spreads at once without fluttering and the pigeon shows in two places instead of
 * flying across (her steps and the marks still move); the outcome is read out by the host.
 */
export const clothFlap = defineMiniGame({
  id: "cloth_flap",
  engine: "cue_tap",
  titleJa: "鳩の役",
  howToJa: "階段を下りてくる人の足が、くぼみの前の金色の段に着く瞬間に、「広げる」を1回押して布を広げる（約4秒）",
  outcomes: [
    { id: "perfect", labelJa: "目の前で広げた", noteJa: "金色の段に立っている間に押した" },
    { id: "early", labelJa: "早すぎた", noteJa: "金色の段に足が着く前に押した" },
    { id: "late", labelJa: "遅すぎた", noteJa: "金色の段から足が離れてから押した" },
    { id: "frozen", labelJa: "広げられなかった", noteJa: "最後まで押さなかった" },
  ],
  defaultAuto: "perfect",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "隠れる",
  hintJa: "金色の段に足が着く瞬間に「広げる」",
  timed: true,
  keysJa: "Space・Enter で広げる",
  sounds: ["travel_walk", "cloth_flap", "pigeon_flutter"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "stairs", kind: "backdrop", labelJa: "階段井戸の壁のくぼみの中から見た、左上から右下へ下りる石の階段と向かいの壁（手前にくぼみのアーチの縁）" },
    { id: "wall", kind: "backdrop", labelJa: "階段の向こうの、向かいの壁だけ（くぼみの並ぶ石積み。階段・人・布はゲームが上に描く。縦3:4、上が明るく下ほど暗い）" },
    { id: "walker", kind: "sprite", labelJa: "右へ向かって階段を下りる若い女性の横向きの全身（クルタ姿、背景は透明）" },
  ],
  load: () => import("./play"),
});
