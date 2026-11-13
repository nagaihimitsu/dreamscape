import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `baraat_dance` (a skin of `rhythm_tap`): the Jaipur finale's last moment, dancing in the groom's procession. The
 * band's drum counts four, then beats steadily (96 a minute) for 18 beats; the player taps 「踊る」 on each. Most
 * beats met is `in_step`; taps mostly between the beats, `stumble`; no tap at all, `stood_still`; anything else,
 * `off_beat_together` (the finale's own words: 「下手なのは、二人とも同じだから」). The outcome changes only the closing
 * lines' colour, never the ending.
 *
 * The beat is the game's own drum, not the scene's music (docs/13 2.11; quietScene lowers the music while it plays):
 * the lane's marks and the drum on the field show each beat, so it plays the same with the sound off.
 *
 * Accessibility: 「踊る」 is 64px at the bottom (thumb reach), Space and Enter tap; the lane's ring lights on a beat met
 * (brighter and thicker, not colour alone). With less motion nobody bobs and the drum does not swell (its face still
 * lights on each beat; the lane's marks still move). The outcome is read out by the host.
 */
export const baraatDance = defineMiniGame({
  id: "baraat_dance",
  engine: "rhythm_tap",
  titleJa: "花婿の行列で踊る",
  howToJa: "楽隊の太鼓が4つ数えてから、太鼓が鳴るたびに「踊る」を押す（約14秒）",
  outcomes: [
    { id: "in_step", labelJa: "拍に乗って踊れた", noteJa: "18拍のうち13拍以上に合わせた" },
    { id: "off_beat_together", labelJa: "ずれたまま、二人で踊った", noteJa: "押したが、合ったのは12拍まで" },
    { id: "stumble", labelJa: "足がもつれた", noteJa: "拍の合間に押した数が、合った数より多い" },
    { id: "stood_still", labelJa: "立ったままだった", noteJa: "一度も押さなかった" },
  ],
  defaultAuto: "off_beat_together",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "輪に入る",
  hintJa: "印が輪に重なったら「踊る」",
  timed: true,
  keysJa: "Space・Enter で踊る",
  sounds: ["drum_beat"],
  quietScene: true,
  art: [],
  artSlots: [
    { id: "street", kind: "backdrop", labelJa: "夜の旧市街、照明に浮かぶハワー・マハルの前の通りと行列（遠景）" },
    { id: "drummer", kind: "sprite", labelJa: "楽隊の太鼓を打つ人（大きな太鼓を体の前に下げた姿、背景は透明）" },
    { id: "kamla", kind: "sprite", labelJa: "桃色のサリーで腕を上げて踊るカムラの全身（立ち絵の画風、背景は透明）" },
    { id: "heroine", kind: "sprite", labelJa: "ぎこちなく腕を上げて踊るヒロインの全身（立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
