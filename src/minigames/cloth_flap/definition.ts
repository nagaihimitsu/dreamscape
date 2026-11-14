import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `cloth_flap` (a skin of `cue_tap`): Agrasen ki Baoli, the pigeon's part. Hidden in a niche by the stairs, the player
 * spreads the cloth with one tap as the one coming down sets foot on the gold step in front of the niche (`perfect`: she
 * stands on it through the whole window); spread before (`early`: she sees it coming) or as she steps off it and later
 * (`late`: behind her back); no tap (`frozen`). A tap before she starts down does not count. Every outcome ends in her
 * real scream in the story.
 *
 * The host's flow (docs/13 2.6): practice before the real flap, no 3・2・1 (her steps are the count), the play ends as she
 * reacts (★ from the tap: clean ★3, a little off ★2, far off ★1, no tap none), the finish word a sound or a call, and the
 * heroine's face and line from beside the niche: her first breath at the prank (Jasmeet's scream and the story's lines
 * follow at once), never what she says next.
 *
 * Accessibility: 「広げる」 is 64px at the bottom (thumb reach), Space and Enter spread the cloth; in place of a meter, a
 * numbered mark for each of her steps lights as her foot lands (on the stairs and under the field; the gold one is larger
 * and glows, not colour alone), with a footstep sound on each (the gold one a little higher); with less motion she
 * does not bob on her steps, the cloth spreads at once without fluttering and the pigeon shows in two places instead of
 * flying across (her steps and the marks still move); the outcome is read out by the host.
 */
export const clothFlap = defineMiniGame({
  id: "cloth_flap",
  engine: "cue_tap",
  titleJa: "鳩の役",
  howToJa: "階段を下りてくる人の足が、くぼみの前の金色の段に着く瞬間に、「広げる」を1回押して布を広げる（約4秒）",
  outcomes: [
    { id: "perfect", labelJa: "目の前で広げた", noteJa: "金色の段に立っている間に押した", finishJa: "ばさっ！",
      reaction: { kind: "laugh", linesJa: ["鳩、上手すぎ！", "今の、完璧な鳩だった"] } },
    { id: "early", labelJa: "早すぎた", noteJa: "金色の段に足が着く前に押した", finishJa: "バレた！", finishTone: "plain",
      reaction: { kind: "tease", linesJa: ["ふふ、せっかちな鳩"] } },
    { id: "late", labelJa: "遅すぎた", noteJa: "金色の段から足が離れてから押した", finishJa: "後ろから！", finishTone: "plain",
      reaction: { kind: "laugh", linesJa: ["後ろから来る鳩、初めて見た"] } },
    { id: "frozen", labelJa: "広げられなかった", noteJa: "最後まで押さなかった", finishJa: "固まった！",
      reaction: { kind: "tease", linesJa: ["……鳩、固まってる？"] } },
  ],
  defaultAuto: "perfect",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "隠れる",
  hintJa: "金色の段に足が着く瞬間に「広げる」",
  goalJa: "足音を数えて、金色の段に足が着く瞬間に「広げる」で驚かせる",
  controls: "timing",
  durationSec: 4,
  practice: {},
  // Her steps are the count (the marks light one a step): no 3・2・1 before her walk.
  countdown: "own",
  finishAnchor: "top",
  music: "bright",
  timed: true,
  keysJa: "Space・Enter で広げる",
  sounds: ["footstep", "cloth_flap", "pigeon_flutter"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "stairs", kind: "backdrop", labelJa: "階段井戸の壁のくぼみの中から見た、左上から右下へ下りる石の階段と向かいの壁（手前にくぼみのアーチの縁）" },
    { id: "wall", kind: "backdrop", labelJa: "階段の向こうの、向かいの壁だけ（くぼみの並ぶ石積み。階段・人・布はゲームが上に描く。縦3:4、上が明るく下ほど暗い）" },
    { id: "walker", kind: "sprite", labelJa: "右へ向かって階段を下りる若い女性の横向きの全身（クルタ姿、背景は透明）" },
  ],
  load: () => import("./play"),
});
