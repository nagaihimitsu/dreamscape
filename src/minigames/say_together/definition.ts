import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `say_together` (a skin of `cue_tap`): saying the words at the same moment as her. She counts 「せー」「の」 on a steady
 * beat and says them on the next; the player taps 「言う」 once. On her beat (`together`), before it (`early`: the player's
 * voice alone first), after it while she says them (`late`: hers alone first), or not at all (`silent`: she says them
 * alone). Timing, not volume (2026-11-13 user decision). First use: the Lodhi Garden date's 「一緒に言おう」.
 *
 * Accessibility: 「言う」 is 64px at the bottom (thumb reach), Space and Enter say the words; the count reads without sound
 * (her bubble shows 「せー」「の」 and lights one dot a beat, the third dot is the gold one, as the meter's gold zone) and
 * with sound (a tick on each count, a chime when each voice starts); with less motion she does not nod on the beats and
 * the bubbles appear without popping (the dots, the words and the needle still move); the outcome is read out by the host.
 */
export const sayTogether = defineMiniGame({
  id: "say_together",
  engine: "cue_tap",
  titleJa: "一緒に言う",
  howToJa: "彼女の「せー」「の」の次の拍に合わせて、「言う」を1回押して声をそろえる（約4秒）",
  outcomes: [
    { id: "together", labelJa: "声がそろった", noteJa: "針が金色の所で押した（「の」の次の拍）" },
    { id: "early", labelJa: "先に言ってしまった", noteJa: "金色の所より前に押した" },
    { id: "late", labelJa: "出遅れた", noteJa: "金色の所より後、彼女が言い終わる前に押した" },
    { id: "silent", labelJa: "言わなかった", noteJa: "最後まで押さなかった（彼女だけが言う）" },
  ],
  defaultAuto: "together",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "息を吸う",
  hintJa: "「せー」「の」の次の拍で「言う」",
  timed: true,
  keysJa: "Space・Enter で言う",
  sounds: ["ui_tap", "local_word"],
  quietScene: false,
  art: [],
  artSlots: [
    { id: "lawn", kind: "backdrop", labelJa: "二人が立つ所から見た、朝の広い芝生と、左の奥の石の墓（右半分と上の方は、人物と吹き出しが重なる）" },
    { id: "heroine", kind: "sprite", labelJa: "片手を口の横に添え、こちらを見て「せーの」の合図をするヒロインの全身（立ち絵の画風、背景は透明）" },
  ],
  load: () => import("./play"),
});
