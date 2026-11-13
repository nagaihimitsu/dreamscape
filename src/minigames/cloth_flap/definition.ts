import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `cloth_flap` (a skin of `cue_tap`): Agrasen ki Baoli, the pigeon's part. Hidden in a niche by the stairs, the player
 * spreads the cloth with one tap timed against a meter as the one coming down reaches the step in front of the niche
 * (`perfect`); spread before (`early`: she sees it coming) or after she has passed (`late`: behind her back); no tap
 * (`frozen`). Every outcome ends in her real scream in the story.
 *
 * Accessibility: 「広げる」 is 64px at the bottom (thumb reach), Space and Enter spread the cloth; the meter's gold zone is
 * brighter and narrower than the near zone (not colour alone), and she moves one step at a time with a footstep sound;
 * with less motion she does not bob on her steps, the cloth spreads at once and the pigeon does not fly across (her steps
 * and the needle still move); the outcome is read out by the host.
 */
export const clothFlap = defineMiniGame({
  id: "cloth_flap",
  engine: "cue_tap",
  titleJa: "鳩の役",
  howToJa: "階段を下りてくる人がくぼみの前の段に来た瞬間に、「広げる」を1回押して布を広げる（約5秒）",
  outcomes: [
    { id: "perfect", labelJa: "目の前で広げた", noteJa: "針が金色の所で押した" },
    { id: "early", labelJa: "早すぎた", noteJa: "金色の所より前に押した" },
    { id: "late", labelJa: "遅すぎた", noteJa: "金色の所より後に押した" },
    { id: "frozen", labelJa: "広げられなかった", noteJa: "最後まで押さなかった" },
  ],
  defaultAuto: "perfect",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "隠れる",
  hintJa: "くぼみの前の段に来た瞬間に「広げる」",
  timed: true,
  keysJa: "Space・Enter で広げる",
  sounds: ["travel_walk", "cloth_flap", "pigeon_flutter"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "stairs", kind: "backdrop", labelJa: "階段井戸の壁のくぼみの中から見た、左上から右下へ下りる石の階段と向かいの壁（手前にくぼみのアーチの縁）" },
    { id: "walker", kind: "sprite", labelJa: "右へ向かって階段を下りる若い女性の横向きの全身（クルタ姿、背景は透明）" },
  ],
  load: () => import("./play"),
});
