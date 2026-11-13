import { z } from "zod";
import { defineMiniGame } from "../contract";

/**
 * `say_together` (a skin of `cue_tap`): saying the words at the same moment as her. She counts 「せー」「の」 on a steady
 * beat and says them on the next; the player taps 「言う」 once. On her beat (`together`), before it (`early`: the player's
 * voice alone first), after it while she says them (`late`: hers alone first), or not at all (`silent`: she says them
 * alone). Timing, not volume (2026-11-13 user decision). A tap while she takes her breath, before 「せー」, does not count.
 * First use: the Lodhi Garden date's 「一緒に言おう」.
 *
 * The host's flow (docs/13 2.6): practice before the real one, no 3・2・1 (her 「せー」「の」 is the count), the play ends on
 * the last word both voices say (together; the finish 「デーン！」 is that word), as a voice comes alone first, or after
 * her words (silent); ★ from the tap (on the beat ★3, a little off ★2, far off ★1, no tap none), and her face.
 *
 * Accessibility: 「言う」 is 64px at the bottom (thumb reach), Space and Enter say the words; the count reads without sound
 * (her bubble shows 「せー」「の」 and lights one dot a beat, the third dot is the gold one, as the meter's gold zone, and a
 * ring closes on it through the last beat) and with sound (a tick on each count, a chime when each voice starts); with
 * less motion she does not nod on the beats and the bubbles appear without popping (the dots, the closing ring, the words
 * and the needle still move); the outcome is read out by the host.
 */
export const sayTogether = defineMiniGame({
  id: "say_together",
  engine: "cue_tap",
  titleJa: "一緒に言う",
  howToJa: "彼女の「せー」「の」の次の拍に合わせて、「言う」を1回押して声をそろえる（約4秒）",
  // Her face only, no line on the result card: her first words follow at once in the story, and differ with the mood of
  // the choice before (delighted, or quiet and a little embarrassed); a line here would get ahead of one or the other.
  outcomes: [
    { id: "together", labelJa: "声がそろった", noteJa: "針が金色の所で押した（「の」の次の拍）", finishJa: "デーン！", reaction: { kind: "surprise" } },
    { id: "early", labelJa: "先に言ってしまった", noteJa: "金色の所より前に押した", finishJa: "フライング！", reaction: { kind: "surprise" } },
    { id: "late", labelJa: "出遅れた", noteJa: "金色の所より後、彼女が言い終わる前に押した", finishJa: "出遅れ！", reaction: { kind: "oops" } },
    // No call: she says them alone, and turns to look at the player.
    { id: "silent", labelJa: "言わなかった", noteJa: "最後まで押さなかった（彼女だけが言う）", finishJa: null, reaction: { kind: "oops" } },
  ],
  defaultAuto: "together",
  params: () => z.object({}).strict(),
  examples: [{}],
  startJa: "息を吸う",
  hintJa: "「せー」「の」の次の拍で「言う」",
  goalJa: "彼女の「せー」「の」の次の拍で「言う」を押して、声をそろえる",
  controls: "timing",
  durationSec: 4,
  practice: {},
  // Her 「せー」「の」 is the count.
  countdown: "own",
  music: "bright",
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
