import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `baraat_dance` (a skin of `rhythm_tap`): the Jaipur finale's last moment, dancing in the groom's procession. The
 * band's drum counts four (taps then are not counted), then beats 8 times at 96 a minute and 8 more at 108, the last two
 * the big 「ドン・ドン」; the player taps 「踊る」 on each. Most beats met with few extra taps is `in_step`; mashing (extra
 * taps at least as many as the beats met), `stumble`; no tap at all, `stood_still`; anything else, `off_beat_together`
 * (the finale's own words: 「下手なのは、二人とも同じだから」). The outcome changes only the closing lines' colour,
 * never the ending.
 *
 * The beat is the game's own drum, not the scene's music (docs/13 2.11; quietScene lowers the music while it plays):
 * the lane's marks and the drum on the field show each beat, so it plays the same with the sound off. A beat met rings
 * the dancers' bangles over the drum; a missed one does not.
 *
 * Accessibility: 「踊る」 is 64px at the bottom (thumb reach), Space and Enter tap; the drum stands right over the lane's
 * ring (one glance holds both); the ring lights on a beat met (brighter and thicker; gold and thicker still right on the
 * beat: not colour alone) and a word says how (ぴったり, いいね). The count-in's beats pass on the lane as crosses. With
 * less motion nobody sways and the drum does not swell (its face still lights on each beat; the lane's marks still
 * move). The host reads out the outcome.
 */
export const baraatDance = defineMiniGame({
  id: "baraat_dance",
  engine: "rhythm_tap",
  titleJa: "花婿の行列で踊る",
  howToJa: "楽隊の太鼓が4つ数えてから、太鼓が鳴るたびに「踊る」を押す。途中でテンポが上がる。連打すると足がもつれる（約13秒）",
  outcomes: [
    { id: "in_step", labelJa: "拍に乗って踊れた", noteJa: "16拍のうち12拍以上に合わせ、余計な押しは4回まで" },
    { id: "off_beat_together", labelJa: "ずれたまま、二人で踊った", noteJa: "押したが、合ったのは11拍まで（か、余計な押しが5回以上）" },
    { id: "stumble", labelJa: "足がもつれた", noteJa: "余計な押し（1拍に2回目からの押し）が8回以上で、合った拍の数以上（連打）" },
    { id: "stood_still", labelJa: "立ったままだった", noteJa: "一度も押さなかった（太鼓が数える4拍の間の押しは数えない）" },
  ],
  defaultAuto: "off_beat_together",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "輪に入る",
  hintJa: "太鼓が4つ数えたら、印が輪に重なるたびに「踊る」",
  timed: true,
  keysJa: "Space・Enter で踊る",
  sounds: ["drum_beat", "bangles_clink"],
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
